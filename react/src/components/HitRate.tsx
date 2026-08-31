// 推薦命中率統計 — 用過去 N 期實際開獎, 模擬如果跟推薦買會中幾多
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { predictStatic, analyzeStatic } from '../lib/analyzer';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
  seed?: number;  // 同 AI推薦顯示共用嘅抖動種子 → 命中率對應返而家睇緊嘅組合
  excludeWeeks?: number;  // v3.5: 排除過去N期 (同 AI推薦 tab 一致)
}

export function HitRate({ data, history, seed, excludeWeeks = 1 }: Props) {
  const [lookback, setLookback] = useState(10);  // 睇返過去幾多期

  // 而家顯示緊嘅推薦 (同 AI推薦 tab hero 一致: 同一數據 + 同一抖動種子 + 同一排除期數)
  const current = useMemo(() => predictStatic(data, 12, seed, excludeWeeks), [data, seed, excludeWeeks]);

  const result = useMemo(() => {
    if (history.length < 2) return null;
    const rows: { draw: string; main10: number[]; hits: number; hitNums: number[]; spPick: number; spHit: boolean }[] = [];

    // 第一行: 用而家睇緊嗰組直接對最新一期 (同顯示完全一致)
    const actual0 = history[0];
    const hitNums0 = current.main10.filter(n => actual0.main.includes(n));
    rows.push({ draw: actual0.draw, main10: current.main10, hits: hitNums0.length, hitNums: hitNums0, spPick: current.special, spHit: current.special === actual0.special });

    // 其餘行: walk-forward (每期用當時數據 + 同一抖動種子)
    for (let i = 2; i <= Math.min(lookback, history.length - 1); i++) {
      // 用第 i 期之前嘅數據做推薦 (walk-forward) — 完整重算, 唔偷睇未來
      const past = history.slice(i);  // 排除 i 期 (由最新開始數)
      const pastData = analyzeStatic(past);  // freq/共現/動量/gaps 全部由當時 slice 重算
      const pred = predictStatic(pastData, 12, seed, excludeWeeks);  // 同顯示一樣 jitter + 同一種子 + 同一排除期數
      const actual = history[i - 1];
      const hitNums = pred.main10.filter(n => actual.main.includes(n));
      rows.push({ draw: actual.draw, main10: pred.main10, hits: hitNums.length, hitNums, spPick: pred.special, spHit: pred.special === actual.special });
    }

    const total = rows.reduce((s, r) => s + r.hits, 0);
    const avg = rows.length ? (total / rows.length).toFixed(2) : '0';
    const spHits = rows.filter(r => r.spHit).length;
    const spRate = rows.length ? (spHits / rows.length * 100).toFixed(0) : '0';
    // 期望值: 10 個號碼中 6 個 = 10 * 6/49 ≈ 1.22; 特別號 = 1/49 ≈ 2%
    const expected = (10 * 6 / 49).toFixed(2);
    return { rows, total, avg, expected, spHits, spRate };
  }, [data, history, lookback, seed, excludeWeeks, current]);

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
        <span>⭐ 特別號命中 <b>{result.spHits}/{result.rows.length}</b>（{result.spRate}%，隨機期望 2%）</span>
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
        💡 <b>點樣計：</b>第一行 = 你而家睇緊嗰組（AI 推薦）直接對最新一期；其餘行 = 模擬「喺過去每一期之前用當時數據做推薦，再對返實際開獎」。紅色 = 中咗，灰色 = 冇中。
        <br />⚠️ 六合彩每期獨立，命中率同隨機期望（10×6/49 ≈ 1.22 個）差唔多係正常 — 呢個統計係幫你了解「推薦組合嘅實際表現」，唔代表未來會中。
      </div>
    </Card>
  );
}
