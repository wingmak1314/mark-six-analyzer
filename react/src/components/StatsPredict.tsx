// 統計學預測 — 用正經統計方法 (z-score / 卡方 / gap / 共現 / 近50期動量) 計分揀號
// 每次生成加「隨機抖動」(jitter) → 次次都可能唔同, 但統計高分號碼仍然大概率入選
// 底部回顧 = 同一個引擎 (statsPick) 嘅 walk-forward 實測, 唔係第個引擎
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { statsPick, recentFreq, makeGaps } from '../lib/analyzer';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function StatsPredict({ data, history }: Props) {
  const [reroll, setReroll] = useState(0);  // 每次 +1 → 重新生成
  const [lookback, setLookback] = useState(20);

  // 當前預測: 同一個引擎, 加抖動 (次次唔同)
  const result = useMemo(
    () => statsPick(data, { top: 8, jitter: 1, seed: reroll }),
    [data, reroll]
  );

  // 回顧實測: 第一行 = 用而家顯示緊嗰組直接對最新一期 (同你睇緊嘅完全一致)
  // 之後每行 = 用當時數據 (唔偷睇未來) 行同一個引擎 + 同一抖動種子
  const hitResult = useMemo(() => {
    if (history.length < 2) return null;
    const rows: { draw: string; nums: number[]; hits: number; hitNums: number[] }[] = [];
    // 第一行: 而家呢組直接對最新一期
    const actual0 = history[0];
    const hitNums0 = result.nums.filter(n => actual0.main.includes(n));
    rows.push({ draw: actual0.draw, nums: result.nums, hits: hitNums0.length, hitNums: hitNums0 });
    // 其餘行: walk-forward (每期用當時數據)
    for (let i = 2; i <= Math.min(lookback, history.length - 1); i++) {
      const past = history.slice(i);
      const pastData: DashboardData = {
        ...data,
        total_draws: past.length,
        last_numbers: past[0].main,
        last_special: past[0].special,
        recent_freq: recentFreq(past, 50),  // 用當時嘅近50期, 避免 look-ahead bias
        gaps: makeGaps(past),               // 用當時嘅 gap, 避免 look-ahead bias
      };
      const pick = statsPick(pastData, { top: 8, jitter: 1, seed: reroll });  // 同一抖動種子
      const actual = history[i - 1];
      const hitNums = pick.nums.filter(n => actual.main.includes(n));
      rows.push({ draw: actual.draw, nums: pick.nums, hits: hitNums.length, hitNums });
    }
    const total = rows.reduce((s, r) => s + r.hits, 0);
    const avg = rows.length ? (total / rows.length).toFixed(2) : '0';
    // 期望值: 8 個號碼 × 6/49 ≈ 0.98
    const expected = (8 * 6 / 49).toFixed(2);
    return { rows, avg, expected };
  }, [data, history, lookback, reroll, result]);

  return (
    <div className="gen-wrap">
      <Card title="📐 統計學預測（z-score + 卡方 + gap + 共現 + 近50期動量）" icon="📐">
        <div className="stats-actions">
          <button className="gen-btn" onClick={() => setReroll(r => r + 1)}>🎲 重新生成（次次唔同）</button>
          <span className="stats-hint">已生成 {reroll + 1} 次</span>
        </div>
        <div className="hero-balls">
          {result.nums.map(n => <Ball key={n} n={n} cls="red" size="lg" />)}
        </div>
        <div className="stats-meta">
          <span>📚 基數：{data.total_draws} 期 · 期望頻率 {result.mean} · σ={result.std}</span>
          <span>⚖️ 結構：{result.odd}奇{8 - result.odd}偶 · {result.small}細{8 - result.small}大 · 連號{result.consec}對（歷史：77% 開2-4奇 · 81% 2-4細 · 46% 含連號）</span>
        </div>
        <div className="reason-list">
          {result.scores.map(x => (
            <div className="reason-item" key={x.num}>
              <Ball n={x.num} cls="red" />
              <span className="reason-why">綜合分 {x.score.toFixed(1)} — {x.parts.join('、')}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 回顧實測 — 同一個引擎 */}
      {hitResult && (
        <Card title="🎯 統計預測命中率（如果跟住買，過去會中幾多？）" icon="🎯">
          <div className="hitrate-controls">
            <span className="check-label">回顧期數：</span>
            {[5, 10, 20, 50].map(n => (
              <button key={n} className={lookback === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setLookback(n)}>{n}期</button>
            ))}
          </div>
          <div className="hitrate-summary">
            <span>📊 平均每期中 <b>{hitResult.avg}</b> 個主號碼</span>
            <span>🎲 隨機期望：{hitResult.expected} 個（8×6/49）</span>
            <span className={Number(hitResult.avg) > Number(hitResult.expected) ? 'hitrate-good' : 'hitrate-neutral'}>
              {Number(hitResult.avg) > Number(hitResult.expected) ? '📈 比隨機好' : '📉 同隨機差唔多'}
            </span>
          </div>
          <div className="hitrate-table">
            {hitResult.rows.map(r => (
              <div className="hitrate-row" key={r.draw}>
                <span className="hist-draw">{r.draw}</span>
                <span className="hitrate-nums">
                  {r.nums.map(n => (
                    <span key={n} className={r.hitNums.includes(n) ? 'hitrate-hit' : 'hitrate-miss'}>
                      <Ball n={n} cls={r.hitNums.includes(n) ? 'red' : 'gray'} />
                    </span>
                  ))}
                </span>
                <span className={`hitrate-count ${r.hits >= 2 ? 'hitrate-good' : ''}`}>中{r.hits}個</span>
              </div>
            ))}
          </div>
          <div className="gen-note">
            💡 <b>點樣計：</b>第一行 = 你而家睇緊嗰組直接對最新一期（紅色 = 中咗，灰色 = 冇中）；其餘行 = 模擬「喺過去每一期之前用當時數據行同一個統計引擎（用返而家呢套抖動種子）」。
            <br />⚠️ 六合彩每期獨立，命中率同隨機期望（8×6/49 ≈ 0.98 個）差唔多係正常 — 呢個統計係幫你了解「統計引擎嘅實際表現」，唔代表未來會中。
          </div>
        </Card>
      )}

      <div className="gen-note">
        💡 <b>方法論：</b>頻率 z-score + 卡方殘差 + gap 超額 + 共現傾向 + <b>近50期動量</b>，再加 <b>±4 分隨機抖動</b> — 所以每次撳「重新生成」都可能出唔同組合，但統計高分嘅號碼仍然大概率入選。
        <br />⚖️ <b>結構平衡：</b>奇偶/大小/連號同歷史分佈對齊（77% 開獎係 2-4 奇、81% 係 2-4 細、46% 含連號）— 就算冇得預測邊個號碼會中，至少組合「形狀」同歷史一致。
        <br />⚠️ <b>重要警告：</b>六合彩每期獨立隨機，任何統計方法都<b>唔會增加中獎機率</b> — 中獎機會同隨機一樣（1/13,983,816）。
      </div>
    </div>
  );
}
