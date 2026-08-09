// 複式注數計算器 — 揀 N 個號碼, 即時計注數同成本
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

const PRICE = 10;  // 每注 $10

export function ComboCalc() {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (n: number) => {
    setSelected(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };

  const result = useMemo(() => {
    const k = selected.length;
    const tickets = comb(k, 6);
    const cost = tickets * PRICE;
    // 中獎機率: 揀中 6 個
    const jackpot = tickets / 13983816;
    return { k, tickets, cost, jackpot };
  }, [selected]);

  return (
    <Card title="🧮 複式注數計算器" icon="🧮">
      <div className="comboselect">
        <span className="check-label">揀號碼（最少 6 個，最多 16 個）：</span>
        <div className="combo-grid">
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`combo-cell ${selected.includes(n) ? 'combo-on' : ''}`}
              onClick={() => toggle(n)}
              disabled={selected.length >= 16 && !selected.includes(n)}
            >
              <Ball n={n} cls={selected.includes(n) ? 'red' : 'gray'} />
            </button>
          ))}
        </div>
      </div>
      {result.k >= 6 && (
        <div className="combo-result">
          <div className="combo-row"><span>📝 複式 {result.k} 個字</span><b>{result.tickets.toLocaleString()} 注</b></div>
          <div className="combo-row"><span>💰 成本</span><b>${result.cost.toLocaleString()}</b></div>
          <div className="combo-row"><span>🎯 頭獎機率</span><b>1 / {Math.round(1 / result.jackpot).toLocaleString()}</b></div>
          <div className="combo-row"><span>⚖️ 中 3+ 個字機率</span><b>{(100 * (comb(result.k, 3) * comb(49 - result.k, 3) + comb(result.k, 4) * comb(49 - result.k, 2) + comb(result.k, 5) * (49 - result.k) + comb(result.k, 6)) / comb(49, 6)).toFixed(2)}%</b></div>
        </div>
      )}
      {result.k < 6 && <div className="check-note">仲要揀多 {6 - result.k} 個號碼先計到（最少 6 個先係一注）</div>}
      <div className="gen-note">
        💡 複式 = 買晒所有包含你揀嘅號碼嘅組合。例如 8 個字 = C(8,6) = 28 注 = $280。
      </div>
    </Card>
  );
}
