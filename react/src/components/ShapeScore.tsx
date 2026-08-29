// 組合形狀檢查器 — 你揀嘅 6 個號碼, 同歷史形態有幾似?
// 唔係預測邊個號碼會中, 而係睇組合「形狀」同歷史開獎分佈對唔對得上
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { countConsec } from '../lib/analyzer';
import type { Draw } from '../lib/analyzer';

interface Props {
  history: Draw[];
}

export function ShapeScore({ history }: Props) {
  const [selected, setSelected] = useState<number[]>([7, 12, 18, 21, 28, 30]);

  const toggle = (n: number) => {
    setSelected(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : (prev.length >= 6 ? prev : [...prev, n].sort((a, b) => a - b))
    );
  };

  // 歷史分佈
  const dists = useMemo(() => {
    const odd: Record<number, number> = {};
    const small: Record<number, number> = {};
    const sumB: Record<string, number> = {};
    const consec: Record<number, number> = {};
    const zones: Record<number, number> = {};
    const tails: Record<number, number> = {};
    const N = history.length;
    for (const d of history) {
      const s = [...d.main].sort((a, b) => a - b);
      const o = s.filter(n => n % 2 === 1).length;
      odd[o] = (odd[o] || 0) + 1;
      const sm = s.filter(n => n <= 24).length;
      small[sm] = (small[sm] || 0) + 1;
      const sum = s.reduce((a, b) => a + b, 0);
      const b = `${Math.floor(sum / 20) * 20}-${Math.floor(sum / 20) * 20 + 19}`;
      sumB[b] = (sumB[b] || 0) + 1;
      const c = countConsec(s);
      consec[c] = (consec[c] || 0) + 1;
      const zs = new Set(s.map(n => n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : n <= 40 ? 4 : 5));
      zones[zs.size] = (zones[zs.size] || 0) + 1;
      const ts = new Set(s.map(n => n % 10));
      tails[ts.size] = (tails[ts.size] || 0) + 1;
    }
    const pct = (o: Record<number, number>, k: number) => N ? ((o[k] || 0) / N * 100).toFixed(0) : '0';
    const pick = (o: Record<string, number>): string => {
      let best = '', bc = -1;
      for (const [k, v] of Object.entries(o)) if (v > bc) { bc = v; best = k; }
      return best;
    };
    const bestSum = pick(sumB);
    return {
      N,
      odd: { dist: odd, pct: (k: number) => pct(odd, k) },
      small: { dist: small, pct: (k: number) => pct(small, k) },
      sum: { dist: sumB, best: bestSum },
      consec: { dist: consec, pct: (k: number) => pct(consec, k) },
      zones: { dist: zones, pct: (k: number) => pct(zones, k) },
      tails: { dist: tails, pct: (k: number) => pct(tails, k) },
    };
  }, [history]);

  const score = useMemo(() => {
    if (selected.length !== 6) return null;
    const s = [...selected].sort((a, b) => a - b);
    const odd = s.filter(n => n % 2 === 1).length;
    const small = s.filter(n => n <= 24).length;
    const sum = s.reduce((a, b) => a + b, 0);
    const c = countConsec(s);
    const zs = new Set(s.map(n => n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : n <= 40 ? 4 : 5)).size;
    const ts = new Set(s.map(n => n % 10)).size;
    const sumBucket = `${Math.floor(sum / 20) * 20}-${Math.floor(sum / 20) * 20 + 19}`;
    const bucketPct = (o: Record<number, number>, k: number) => dists.N ? ((o[k] || 0) / dists.N * 100) : 0;
    const sumPct = dists.N ? ((dists.sum.dist[sumBucket] || 0) / dists.N * 100) : 0;
    const parts = [
      { label: `奇偶 ${odd}奇${6 - odd}偶`, pct: bucketPct(dists.odd.dist, odd), best: '3奇3偶' },
      { label: `大細 ${small}細${6 - small}大`, pct: bucketPct(dists.small.dist, small), best: '3細3大' },
      { label: `總和 ${sum}`, pct: sumPct, best: `總和 ${dists.sum.best}` },
      { label: `連號 ${c} 對`, pct: bucketPct(dists.consec.dist, c), best: c >= 1 ? '有連號' : '冇連號' },
      { label: `覆蓋 ${zs} 個區間`, pct: bucketPct(dists.zones.dist, zs), best: '5 個區間' },
      { label: `尾數 ${ts} 種`, pct: bucketPct(dists.tails.dist, ts), best: '6 種' },
    ];
    const avg = parts.reduce((a, p) => a + p.pct, 0) / parts.length;
    return { parts, avg, odd, small, sum, consec: c };
  }, [selected, dists]);

  const bar = (pct: number) => ({ width: `${Math.min(100, Math.max(3, pct)).toFixed(0)}%` });

  return (
    <Card title="🧮 組合形狀檢查器（你嘅組合有幾典型？）" icon="🧮">
      <div className="comboselect">
        <span className="check-label">揀 6 個號碼（預設 AI 推薦組合）：</span>
        <div className="combo-grid">
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`combo-cell ${selected.includes(n) ? 'combo-on' : ''}`}
              onClick={() => toggle(n)}
              disabled={selected.length >= 6 && !selected.includes(n)}
            >
              <Ball n={n} cls={selected.includes(n) ? 'red' : 'gray'} />
            </button>
          ))}
        </div>
      </div>

      {score && (
        <>
          <div className="dantuo-selected">
            <span className="check-label">你嘅組合：</span>
            <span className="dantuo-chips">{selected.map(n => <Ball key={n} n={n} cls="red" />)}</span>
          </div>

          <div className="shape-score">
            <span className="shape-score-num">{(score.avg).toFixed(0)}%</span>
            <span className="shape-score-label">同歷史開獎形態嘅相似度（6 項結構平均）</span>
          </div>

          <div className="shape-list">
            {score.parts.map(p => (
              <div className="shape-row" key={p.label}>
                <span className="shape-label">{p.label}</span>
                <div className="bc-bar"><div className="bc-fill" style={{ ...bar(p.pct), background: '#0071e3' }} /></div>
                <span className="shape-pct">{p.pct.toFixed(0)}% 期數（主流：{p.best}）</span>
              </div>
            ))}
          </div>

          <div className="gen-note">
            💡 <b>下期結構預測（最可能嘅形狀）：</b>奇偶 3:3（{dists.odd.pct(3)}%）· 大細 3:3（{dists.small.pct(3)}%）· 總和 {dists.sum.best}（約 {dists.N ? ((dists.sum.dist[dists.sum.best] || 0) / dists.N * 100).toFixed(0) : '—'}%）· 連號 ≥1 對（{(dists.N ? (dists.consec.dist[1] || 0) + (dists.consec.dist[2] || 0) + (dists.consec.dist[3] || 0) : 0) / dists.N * 100}%+）· 覆蓋 5 個區間（{dists.zones.pct(5)}%）。
            <br />⚠️ 組合「典型」唔代表會中 — 六合彩每期獨立，任何形狀嘅中獎機會都一樣。呢個工具係幫你避開極端結構（例如 6 個全細/全奇，歷史幾乎冇開過），令組合形狀同歷史一致。
          </div>
        </>
      )}
    </Card>
  );
}
