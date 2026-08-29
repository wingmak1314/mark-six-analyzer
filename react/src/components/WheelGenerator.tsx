// 縮水輪（覆蓋設計）— 貪婪 Set Cover: 揀 v 個號碼, 買 k 碼注, 保證「中 m 保 t」
// 誠實警告: 縮水 = 注數大減 + 保證最低獎級, 但唔提高中獎機率 (中獎注數變少)
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { coveringWheel } from '../lib/quant';

type Guarantee = { t: number; m: number; label: string };

const GUARANTEES: Guarantee[] = [
  { t: 3, m: 4, label: '中4保3（最常用）' },
  { t: 2, m: 3, label: '中3保2（最慳注數）' },
  { t: 4, m: 5, label: '中5保4（覆蓋較強）' },
];

export function WheelGenerator() {
  const [selected, setSelected] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [guarantee, setGuarantee] = useState<Guarantee>(GUARANTEES[0]);

  const toggle = (n: number) => {
    setSelected(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : (prev.length >= 13 ? prev : [...prev, n].sort((a, b) => a - b))
    );
  };

  const result = useMemo(() => {
    if (selected.length < 6) return null;
    return coveringWheel(selected, 6, guarantee.t, guarantee.m);
  }, [selected, guarantee]);

  const savings = result && !result.tooBig && result.fullCount > 0
    ? Math.round((1 - result.tickets.length / result.fullCount) * 100)
    : 0;

  return (
    <Card title="🌀 縮水輪（覆蓋設計）— 保證最低獎級，注數大減" icon="🌀">
      <div className="dantuo-intro">
        <b>原理：</b>揀 N 個號碼，原本複式要 C(N,6) 注；縮水輪用「覆蓋設計」算出最細注數集合，保證「如果中獎號碼入面有你揀嘅 m 個，就至少有一注中 t 個」。適合想慳注數、但接受「中 3/4 個先回本」嘅打法。
      </div>

      <div className="dantuo-section">
        <span className="check-label">揀號碼（6-13 個，預設 1-10）：</span>
        <div className="combo-grid">
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`combo-cell ${selected.includes(n) ? 'combo-on' : ''}`}
              onClick={() => toggle(n)}
              disabled={selected.length >= 13 && !selected.includes(n)}
            >
              <Ball n={n} cls={selected.includes(n) ? 'red' : 'gray'} />
            </button>
          ))}
        </div>
        <div className="check-note">已揀 {selected.length} 個號碼（最多 13 個）</div>
      </div>

      <div className="stats-actions">
        <span className="check-label">保證級別：</span>
        {GUARANTEES.map(g => (
          <button key={g.label} className={guarantee === g ? 'dim-btn active' : 'dim-btn'} onClick={() => setGuarantee(g)}>{g.label}</button>
        ))}
      </div>

      {result && !result.tooBig && (
        <div className="combo-result">
          <div className="combo-row"><span>📝 原複式 {selected.length} 個字</span><b>{result.fullCount.toLocaleString()} 注（${(result.fullCount * 10).toLocaleString()}）</b></div>
          <div className="combo-row"><span>🌀 縮水後（{result.guarantee}）</span><b>{result.tickets.length.toLocaleString()} 注（${(result.tickets.length * 10).toLocaleString()}）</b></div>
          <div className="combo-row"><span>💡 慳咗</span><b className="hitrate-good">{savings}%（省 ${((result.fullCount - result.tickets.length) * 10).toLocaleString()}）</b></div>
        </div>
      )}
      {result?.tooBig && (
        <div className="check-note">⚠️ 揀太多號碼（&gt;13 個）計算量太大，請減少。</div>
      )}

      {result && !result.tooBig && result.tickets.length > 0 && (
        <div className="wheel-tickets">
          <div className="hitrate-controls"><span className="check-label">生成 {result.tickets.length} 注（可縮水）:</span></div>
          <div className="hitrate-table" style={{ maxHeight: 300 }}>
            {result.tickets.map((t, i) => (
              <div className="hitrate-row" key={i}>
                <span className="hist-draw">注{i + 1}</span>
                <span className="hist-balls">{t.map(n => <Ball key={n} n={n} cls="red" />)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gen-note">
        ⚠️ <b>誠實警告：</b>縮水輪<b>唔會提高中獎機率</b> — 中獎注數由 C(N,6) 減到縮水注數，頭獎機會按比例跌。佢嘅價值係「保證最低獎級」：例如中4保3，即係你揀嘅 10 個號碼入面中咗 4 個，就保證至少一注中 3 個（七獎 $20 回本）。想衝大獎嘅話，複式先係最直接。
        <br />📐 呢個係「貪婪啟發式」解，唔保證最優覆蓋（組合數學 NP-Hard），但實際覆蓋率極高。參考：10 碼「中4保3」經典縮水約 30 注，同複式 210 注比慳 85%。
      </div>
    </Card>
  );
}
