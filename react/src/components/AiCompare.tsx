// 多期 AI 預測對比 — 睇 AI 核心推薦 (冇隨機抖動) 過去幾期實際中幾多
// walk-forward: 每期只用「當時之前」嘅數據重建推薦, 唔偷睇未來
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { predictStatic, analyzeStatic } from '../lib/analyzer';
import type { Draw } from '../lib/analyzer';

interface Props {
  history: Draw[];
}

export function AiCompare({ history }: Props) {
  const [lookback, setLookback] = useState(10);
  const [count, setCount] = useState<10 | 15>(10);

  const result = useMemo(() => {
    if (history.length < 2) return null;
    const rows: { draw: string; date: string; actual: Draw; picks: number[]; hitNums: number[] }[] = [];
    for (let i = 1; i <= Math.min(lookback, history.length - 1); i++) {
      const past = history.slice(i);                      // 當時之前嘅數據
      const pred = predictStatic(analyzeStatic(past), 0); // 純 AI 核心, 冇隨機抖動
      const actual = history[i - 1];                       // 實際開獎
      const picks = count === 15 ? pred.main15 : pred.main10;
      const hitNums = picks.filter(n => actual.main.includes(n));
      rows.push({ draw: actual.draw, date: actual.date, actual, picks, hitNums });
    }
    const total = rows.reduce((s, r) => s + r.hitNums.length, 0);
    const avg = total / rows.length;
    const expected = count * 6 / 49;
    // 命中分佈 (中幾多個主號碼)
    const dist: Record<number, number> = {};
    for (const r of rows) dist[r.hitNums.length] = (dist[r.hitNums.length] || 0) + 1;
    return { rows, avg, expected, dist };
  }, [history, lookback, count]);

  if (!result) return null;

  const distKeys = Object.keys(result.dist).map(Number).sort((a, b) => a - b);

  return (
    <div className="gen-wrap">
      <Card title="🔮 多期 AI 預測對比（過去會中幾多？）" icon="🔮">
        <div className="stats-actions">
          <span className="check-label">回顧期數：</span>
          {[5, 10, 20, 50].map(n => (
            <button key={n} className={lookback === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setLookback(n)}>{n}期</button>
          ))}
          <span className="check-label" style={{ marginLeft: 12 }}>字數：</span>
          <button className={count === 10 ? 'dim-btn active' : 'dim-btn'} onClick={() => setCount(10)}>10 字</button>
          <button className={count === 15 ? 'dim-btn active' : 'dim-btn'} onClick={() => setCount(15)}>15 字</button>
        </div>

        <div className="hitrate-summary">
          <span>📊 平均每期中 <b>{result.avg.toFixed(2)}</b> 個主號碼</span>
          <span>🎲 隨機期望 <b>{result.expected.toFixed(2)}</b> 個（{count}×6/49）</span>
          <span className={result.avg > result.expected ? 'hitrate-good' : 'hitrate-neutral'}>
            {result.avg > result.expected ? '📈 比隨機好（小樣本, 唔代表有 edge）' : '📉 同隨機差唔多（正常）'}
          </span>
        </div>

        <div className="aivs-dist">
          {distKeys.map(k => (
            <span key={k} className="aivs-dist-item">
              中<b>{k}</b>個 × {result.dist[k]} 期
            </span>
          ))}
        </div>
      </Card>

      <Card title="📋 逐期對比（實際開獎 vs AI 推薦）" icon="📋">
        <div className="aivs-table">
          {result.rows.map(r => (
            <div className="aivs-row" key={r.draw}>
              <div className="aivs-head">
                <span className="hist-draw">{r.draw}</span>
                <span className="hist-date">{r.date}</span>
                <span className="hitrate-count">中 {r.hitNums.length} 個</span>
              </div>
              <div className="aivs-line">
                <span className="aivs-label">實際</span>
                <span className="hist-balls">
                  {[...r.actual.main].sort((a, b) => a - b).map(n => <Ball key={n} n={n} cls="red" />)}
                  <span className="plus">+</span><Ball n={r.actual.special} cls="sp" />
                </span>
              </div>
              <div className="aivs-line">
                <span className="aivs-label">AI 推</span>
                <span className="hist-balls">
                  {r.picks.map(n => <Ball key={n} n={n} cls={r.hitNums.includes(n) ? 'red' : 'gray'} />)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="gen-note">
          💡 <b>點樣計：</b>模擬「喺每一期之前用當時嘅全部歷史數據行 AI 引擎」,再對返實際開獎。<span className="hitrate-good">紅色 = AI 中咗</span>,灰色 = 冇中。呢度用 <b>純 AI 核心（冇隨機抖動）</b>,所以每次睇都一樣 — 同「AI 推薦」tab 加咗隨機抖動（次次唔同）係兩回事。
          <br />⚠️ 六合彩每期獨立,平均命中同隨機期望（{count}×6/49 ≈ {result.expected.toFixed(2)}）差唔多係正常,唔代表未來會中。
        </div>
      </Card>
    </div>
  );
}
