// 統計學預測 — 用正經統計方法 (z-score / 卡方 / gap / 共現 / 近50期動量) 計分揀號
// 每次生成加「隨機抖動」(jitter) → 次次都可能唔同, 但統計高分號碼仍然大概率入選
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { HitRate } from './HitRate';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function StatsPredict({ data, history }: Props) {
  const [reroll, setReroll] = useState(0);  // 每次 +1 → 重新生成

  const result = useMemo(() => {
    const N = data.total_draws;
    const freqAll = data.freq_all || data.freq_top;
    const freqMap = new Map(freqAll.map(x => [x.num, x.count]));
    const gapMap = new Map(data.gaps.map(g => [g.num, g.gap]));
    const daysMap = new Map((data.days_ago || []).map(d => [d.num, d.days]));
    const recentMap = new Map((data.recent_freq || []).map(x => [x.num, x.count]));
    const recentWin = Math.min(50, N);
    const recentAvg = recentWin * 6 / 49;
    const coExp = N * 15 / 1176;

    // 統計基礎
    const mean = 6 * N / 49;
    const variance = N * (6 / 49) * (43 / 49) * (43 / 48);
    const std = Math.sqrt(variance);

    const lastNums = new Set(data.last_numbers.concat([data.last_special]));
    const scores: { num: number; score: number; parts: string[] }[] = [];

    // 隨機抖動: 以 reroll 做 seed, 每個號碼加 ±(0~4) 分
    let seed = reroll * 7919 + 13;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const jitter = (_n: number) => (rand() - 0.5) * 8;  // ±4 分

    for (let n = 1; n <= 49; n++) {
      if (lastNums.has(n)) continue;
      const count = freqMap.get(n) || 0;
      const gap = gapMap.get(n) ?? N;
      const days = daysMap.get(n) ?? 0;
      const rec = recentMap.get(n) || 0;
      const parts: string[] = [];
      let score = 0;

      // 1. 頻率 z-score
      const z = (count - mean) / std;
      score += z * 1.2;
      parts.push(`頻率z=${z.toFixed(2)}`);

      // 2. Gap 分析
      const expGap = 49 / 7;
      const gapRatio = gap / expGap;
      score += Math.min(gapRatio, 3) * 0.8;
      if (gapRatio > 1.5) parts.push(`已${gap}期未出(超額${gapRatio.toFixed(1)}x)`);

      // 3. 天數
      score += Math.min(days / 60, 1) * 0.5;

      // 4. 共現
      let bestCo = 0, bestPartner = 0;
      for (const o of data.cooccur) {
        const [a, b] = o.pair.split(',').map(Number);
        if ((a === n || b === n) && o.count > bestCo) {
          bestCo = o.count;
          bestPartner = a === n ? b : a;
        }
      }
      score += (bestCo - coExp) * 2;
      if (bestCo >= 15) parts.push(`同${bestPartner}共現${bestCo}次`);

      // 5. 卡方殘差
      const chiResid = (count - mean) * (count - mean) / mean;
      score += Math.sqrt(chiResid) * 0.3;

      // 6. 近50期動量 (歷史形態信號)
      score += (rec - recentAvg) * 0.8;
      if (rec >= 10) parts.push(`近50期出${rec}次`);

      // 7. 隨機抖動
      const j = jitter(n);
      score += j;
      if (Math.abs(j) > 3) parts.push(`隨機+${j.toFixed(1)}`);

      scores.push({ num: n, score, parts });
    }

    // 排序 + 揀 top 8
    scores.sort((a, b) => b.score - a.score);
    let top8 = scores.slice(0, 8).sort((a, b) => a.num - b.num);

    // 連號修正: 歷史 45.8% 開獎含連號 — 若 top8 完全冇連號, 換入一個相鄰號碼
    const consecPairs = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      let c = 0;
      for (let i = 0; i < s.length - 1; i++) if (s[i + 1] === s[i] + 1) c++;
      return c;
    };
    if (consecPairs(top8.map(x => x.num)) === 0 && top8.length >= 8) {
      const inPool = new Set(top8.map(x => x.num));
      // 由 scores 搵一個同 top8 成員相鄰、分數最高嘅替補
      const adj = scores.filter(x => !inPool.has(x.num) && top8.some(t => Math.abs(t.num - x.num) === 1));
      if (adj.length) {
        adj.sort((a, b) => b.score - a.score);
        // 換走分數最低嗰個
        const worst = [...top8].sort((a, b) => a.score - b.score)[0];
        top8 = top8.filter(x => x.num !== worst.num);
        top8.push(adj[0]);
        top8.sort((a, b) => a.num - b.num);
      }
    }

    // 結構檢查
    const odd = top8.filter(x => x.num % 2 === 1).length;
    const small = top8.filter(x => x.num <= 24).length;
    const consec = consecPairs(top8.map(x => x.num));

    return { top8, odd, small, consec, mean: mean.toFixed(1), std: std.toFixed(1) };
  }, [data, reroll]);

  return (
    <div className="gen-wrap">
      <Card title="📐 統計學預測（z-score + 卡方 + gap + 隨機）" icon="📐">
        <div className="stats-actions">
          <button className="gen-btn" onClick={() => setReroll(r => r + 1)}>🎲 重新生成（次次唔同）</button>
          <span className="stats-hint">已生成 {reroll + 1} 次</span>
        </div>
        <div className="hero-balls">
          {result.top8.map(x => <Ball key={x.num} n={x.num} cls="red" size="lg" />)}
        </div>
        <div className="stats-meta">
          <span>📚 基數：{data.total_draws} 期 · 期望頻率 {result.mean} · σ={result.std}</span>
          <span>⚖️ 結構：{result.odd}奇{8 - result.odd}偶 · {result.small}細{8 - result.small}大 · 連號{result.consec}對（歷史：77% 開2-4奇 · 81% 2-4細 · 46% 含連號）</span>
        </div>
        <div className="reason-list">
          {result.top8.map(x => (
            <div className="reason-item" key={x.num}>
              <Ball n={x.num} cls="red" />
              <span className="reason-why">綜合分 {x.score.toFixed(1)} — {x.parts.join('、')}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="gen-note">
        💡 <b>方法論：</b>頻率 z-score + 卡方殘差 + gap 超額 + 共現傾向 + <b>近50期動量</b>，再加 <b>±4 分隨機抖動</b> — 所以每次撳「重新生成」都可能出唔同組合，但統計高分嘅號碼仍然大概率入選。
        <br />⚖️ <b>結構平衡：</b>奇偶/大小/連號同歷史分佈對齊（77% 開獎係 2-4 奇、81% 係 2-4 細、46% 含連號）— 就算冇得預測邊個號碼會中，至少組合「形狀」同歷史一致。
        <br />⚠️ <b>重要警告：</b>六合彩每期獨立隨機，任何統計方法都<b>唔會增加中獎機率</b> — 中獎機會同隨機一樣（1/13,983,816）。下面嘅命中率實測會話你知真實表現。
      </div>
      <HitRate data={data} history={history} />
    </div>
  );
}
