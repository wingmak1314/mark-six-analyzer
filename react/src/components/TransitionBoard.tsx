// 隔期關聯分析 — 今期出完 X, 下期最常跟住出邊啲號碼? + 上期重複分佈
// 統計事實: 六合彩每期獨立, 呢啲都係「形態觀察」, 唔係預測能力
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import type { Draw } from '../lib/analyzer';

interface Props {
  history: Draw[];
}

export function TransitionBoard({ history }: Props) {
  const [num, setNum] = useState(30);

  // 轉號統計: 今期出 n → 下期出 m 嘅次數 (draws[0]=最新, 下期 = index 細啲嗰邊)
  // 只計「有下期」嘅期 (i >= 1), 唔偷睇未來
  const trans = useMemo(() => {
    if (history.length < 3) return null;
    const N = history.length;
    const fromCount: Record<number, number> = {};   // n 出現幾多期 (有下期嘅)
    const pairs: Record<number, Record<number, number>> = {};
    for (let i = 1; i < N; i++) {
      const cur = history[i].main;      // 今期
      const nxt = history[i - 1].main;  // 下期 (真正跟住開嗰期)
      for (const n of cur) {
        fromCount[n] = (fromCount[n] || 0) + 1;
        if (!pairs[n]) pairs[n] = {};
        for (const m of nxt) pairs[n][m] = (pairs[n][m] || 0) + 1;
      }
    }
    return { fromCount, pairs };
  }, [history]);

  // 重複分佈: 每期有幾多個主號碼同上期重複 (0-6)
  const repeatDist = useMemo(() => {
    const dist: Record<number, number> = {};
    let sum = 0, n = 0;
    for (let i = 0; i < history.length - 1; i++) {
      const cur = new Set(history[i].main);
      const r = history[i + 1].main.filter(m => cur.has(m)).length;
      dist[r] = (dist[r] || 0) + 1;
      sum += r; n++;
    }
    return { dist, avg: n ? (sum / n).toFixed(2) : '0', total: n };
  }, [history]);

  const companions = useMemo(() => {
    if (!trans || !trans.fromCount[num]) return [];
    const base = trans.fromCount[num];
    const pairs = trans.pairs[num] || {};
    const exp = base * 6 / 49;  // 每期下期 6 個號碼, 每個機率 6/49
    return Object.entries(pairs)
      .map(([m, c]) => ({ m: Number(m), c, exp, ratio: c / (exp || 1) }))
      .sort((a, b) => b.c - a.c)
      .slice(0, 6);
  }, [trans, num]);

  const repeatKeys = Object.keys(repeatDist.dist).map(Number).sort((a, b) => a - b);
  const maxRepeat = repeatKeys.reduce((a, b) => (repeatDist.dist[b] > repeatDist.dist[a] ? b : a), 0);
  const maxRepeatPct = repeatDist.total ? (repeatDist.dist[maxRepeat] / repeatDist.total * 100).toFixed(0) : '0';

  return (
    <Card title="🧬 隔期關聯分析（今期出完，下期跟住出邊啲？）" icon="🧬">
      <div className="trend-controls">
        <span className="check-label">號碼：</span>
        <select className="gen-opt select" value={num} onChange={e => setNum(Number(e.target.value))}>
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {companions.length > 0 && (
        <div className="hitrate-table" style={{ margin: '8px 0' }}>
          <div className="hitrate-row">
            <span className="hist-draw">號碼 {num} 出現後，下期最常跟住出嘅號碼</span>
            <span className="hitrate-nums">{companions.map(c => <Ball key={c.m} n={c.m} cls="red" />)}</span>
          </div>
          {companions.map(c => (
            <div className="hitrate-row" key={c.m}>
              <span className="hist-draw"><Ball n={c.m} cls="red" /></span>
              <span className="hitrate-count">跟住出 <b>{c.c}</b> 次</span>
              <span className="hitrate-neutral">期望 {c.exp.toFixed(1)} 次 · 實際/期望 <b>{c.ratio.toFixed(2)}x</b></span>
            </div>
          ))}
        </div>
      )}

      <div className="gen-note">
        💡 <b>點樣計：</b>數晒歷史上「號碼 {num} 出現嘅每一期」，睇下期開出邊 6 個號碼，計每對出現幾多次。「期望」= 純隨機下應有嘅次數（出現期數 × 6/49）。實際/期望 ≈ 1 就係隨機。
        <br />⚠️ 六合彩每期獨立 — 就算某對「跟住出」多過期望，都唔代表下期會跟住出（小樣本噪音）。呢個只係形態觀察。
      </div>

      <div className="dantuo-section">
        <span className="check-label">🔁 上期重複分佈（每期同上期共用幾多個號碼）：</span>
        <div className="trend-chart" style={{ marginTop: 8 }}>
          {repeatKeys.map(r => {
            const cnt = repeatDist.dist[r] || 0;
            const pct = repeatDist.total ? cnt / repeatDist.total * 100 : 0;
            return (
              <div key={r} className="repeat-col" title={`重複${r}個: ${cnt}期 (${pct.toFixed(1)}%)`}>
                <div className="repeat-bar-wrap">
                  <div className="repeat-bar" style={{ height: `${Math.max(4, pct * 2.2)}px` }} />
                </div>
                <span className="repeat-label">{r}個</span>
                <span className="repeat-count">{cnt}</span>
              </div>
            );
          })}
        </div>
        <div className="hitrate-summary" style={{ marginTop: 6 }}>
          <span>📊 平均重複 <b>{repeatDist.avg}</b> 個（隨機期望 0.73）</span>
          <span>🎯 下期最可能：<b>重複 {maxRepeat} 個</b>（{maxRepeatPct}% 期數）</span>
        </div>
        <div className="gen-note">
          💡 歷史顯示 ~47% 期數同上期 <b>零重複</b> — 呢個係「避開上次號碼」策略嘅數據基礎。但重複幾多個唔影響下期任何號碼嘅出現機會。
        </div>
      </div>
    </Card>
  );
}
