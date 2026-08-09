// 推薦命中率統計 — 用過去 N 期實際開獎, 模擬如果跟推薦買會中幾多
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { predictStatic, recentFreq } from '../lib/analyzer';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function HitRate({ data, history }: Props) {
  const [lookback, setLookback] = useState(10);  // 睇返過去幾多期

  const result = useMemo(() => {
    if (history.length < 2) return null;
    const rows: { draw: string; main10: number[]; hits: number; hitNums: number[] }[] = [];

    for (let i = 1; i <= Math.min(lookback, history.length - 1); i++) {
      // 用第 i 期之前嘅數據做推薦 (walk-forward)
      const past = history.slice(i);  // 排除 i 期 (由最新開始數)
      const pastData: DashboardData = {
        ...data, total_draws: past.length,
        last_numbers: past[0].main, last_special: past[0].special,
        recent_freq: recentFreq(past, 50),  // 用當時嘅近50期, 避免 look-ahead bias
      };
      const pred = predictStatic(pastData, 0);  // 冇 jitter, 純統計
      const actual = history[i - 1];
      const hitNums = pred.main10.filter(n => actual.main.includes(n));
      rows.push({ draw: actual.draw, main10: pred.main10, hits: hitNums.length, hitNums });
    }

    const total = rows.reduce((s, r) => s + r.hits, 0);
    const avg = rows.length ? (total / rows.length).toFixed(2) : '0';
    // 期望值: 10 個號碼中 6 個 = 10 * 6/49 ≈ 1.22
    const expected = (10 * 6 / 49).toFixed(2);
    return { rows, total, avg, expected };
  }, [data, history, lookback]);

  if (!result) return null;

  return (
    <Card title="🎯 推薦命中率（如果跟推薦買，過去會中幾多？）" icon="🎯">
      <div className="hitrate-controls">
        <span className="check-label">回顧期數：</span>
        {[5, 10, 20, 50].map(n => (
          <button key={n} className={lookback === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setLookback(n)}>{n}期</button>
        ))}
      </div>
      <div className="hitrate-summary">
        <span>📊 平均每期中 <b>{result.avg}</b> 個主號碼</span>
        <span>🎲 隨機期望：{result.expected} 個</span>
        <span className={Number(result.avg) > Number(result.expected) ? 'hitrate-good' : 'hitrate-neutral'}>
          {Number(result.avg) > Number(result.expected) ? '📈 比隨機好' : '📉 同隨機差唔多'}
        </span>
      </div>
      <div className="hitrate-table">
        {result.rows.map(r => (
          <div className="hitrate-row" key={r.draw}>
            <span className="hist-draw">{r.draw}</span>
            <span className="hitrate-nums">
              {r.main10.map(n => (
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
        💡 <b>點樣計：</b>模擬「喺過去每一期之前用當時數據做推薦，再對返實際開獎」。紅色 = 中咗，灰色 = 冇中。
        <br />⚠️ 六合彩每期獨立，命中率同隨機期望（10×6/49 ≈ 1.22 個）差唔多係正常 — 呢個統計係幫你了解「推薦組合嘅實際表現」，唔代表未來會中。
      </div>
    </Card>
  );
}
