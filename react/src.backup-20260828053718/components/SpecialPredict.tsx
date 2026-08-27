// 特別號預測 — 用特別號專用統計 (次數 + 漏出期數) 揀特別號, 附 walk-forward 實測
// 特別號係獨立攪珠 (49 個號碼揀 1 個), 唔可以用主號碼頻率計
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { pickSpecial, analyzeStatic } from '../lib/analyzer';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function SpecialPredict({ data, history }: Props) {
  const [reroll, setReroll] = useState(0);
  const [lookback, setLookback] = useState(20);

  // 當前預測 (抖動 → 次次唔同)
  const current = useMemo(() => pickSpecial(data, 4, reroll), [data, reroll]);

  // Walk-forward: 每期只用當時數據揀特別號, 對返實際特別號
  const hit = useMemo(() => {
    if (history.length < 2) return null;
    const rows: { draw: string; pick: number; actual: number; hit: boolean }[] = [];
    for (let i = 1; i <= Math.min(lookback, history.length - 1); i++) {
      const past = history.slice(i);
      const pastData = analyzeStatic(past);  // 特別號統計都由當時 slice 重算 (唔偷睇未來)
      const p = pickSpecial(pastData, 4, reroll);
      const actual = history[i - 1];
      rows.push({ draw: actual.draw, pick: p.special, actual: actual.special, hit: p.special === actual.special });
    }
    const hits = rows.filter(r => r.hit).length;
    const rate = rows.length ? (hits / rows.length * 100).toFixed(1) : '0';
    // 隨機期望: 1/49 ≈ 2.04%
    return { rows, hits, rate, expected: (100 / 49).toFixed(1) };
  }, [history, lookback, reroll]);

  return (
    <Card title="⭐ 特別號預測（獨立引擎：特別號專用統計）" icon="⭐">
      <div className="stats-actions">
        <button className="gen-btn" onClick={() => setReroll(r => r + 1)}>🎲 重新生成（次次唔同）</button>
        <span className="stats-hint">已生成 {reroll + 1} 次</span>
      </div>

      <div className="dantuo-selected" style={{ marginBottom: 8 }}>
        <span className="check-label">🎯 特別號建議：</span>
        <span className="dantuo-chips"><Ball n={current.special} cls="sp" size="lg" /></span>
        <span className="check-note">（{current.reason}）</span>
      </div>

      <div className="hitrate-summary">
        <span>📊 實測：過去 {hit ? hit.rows.length : lookback} 期中中 <b>{hit?.hits ?? 0}</b> 次特別號（{hit?.rate ?? '—'}%）</span>
        <span>🎲 隨機期望：{hit?.expected ?? '—'}%（1/49）</span>
        <span className={hit && Number(hit.rate) > Number(hit.expected) ? 'hitrate-good' : 'hitrate-neutral'}>
          {hit && Number(hit.rate) > Number(hit.expected) ? '📈 比隨機好（小樣本）' : '📉 同隨機差唔多（正常）'}
        </span>
      </div>

      <div className="hitrate-controls">
        <span className="check-label">回顧期數：</span>
        {[5, 10, 20, 50].map(n => (
          <button key={n} className={lookback === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setLookback(n)}>{n}期</button>
        ))}
      </div>

      {hit && (
        <div className="hitrate-table">
          {hit.rows.map(r => (
            <div className="hitrate-row" key={r.draw}>
              <span className="hist-draw">{r.draw}</span>
              <span className="hitrate-nums">
                <span className={r.hit ? 'hitrate-hit' : 'hitrate-miss'}>
                  <Ball n={r.pick} cls={r.hit ? 'sp' : 'gray'} />
                </span>
                <span className="plus">→</span>
                <span className="hitrate-nums">
                  <Ball n={r.actual} cls="sp" />
                </span>
              </span>
              <span className={r.hit ? 'hitrate-good' : 'hitrate-neutral'}>{r.hit ? '🎯 中' : '冇中'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="gen-note">
        💡 <b>特別號同主號碼係獨立攪珠：</b>49 個號碼揀 1 個。呢個引擎用「做特別號嘅次數 + 幾耐冇做特別號」計分 — 歷史上 13 號做特別號最多（特別號之王）。
        <br />⚠️ 每期獨立，實測命中率同隨機（1/49 ≈ 2.04%）差唔多係正常 — 統計只係幫你了解形態，唔代表未來會中。
      </div>
    </Card>
  );
}
