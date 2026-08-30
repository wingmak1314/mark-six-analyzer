// 膽拖比較 — 用 AI 核心號碼, 自由比較 3膽/4膽/5膽 三種方案
// 每種方案顯示: 注數 / 成本 / P(中3/4/5) / 頭獎 — 揀性價比最高
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { predictStatic, comb, systemProb } from '../lib/analyzer';
import type { DashboardData } from '../lib/analyzer';

interface Props {
  data: DashboardData;
}

const TROTTER_OPTIONS = [8, 10, 12, 13, 15, 20];
const BANKER_CHOICES = [3, 4, 5] as const;

function fmtOdds(p: number): string {
  if (p <= 0) return '—';
  const o = 1 / p;
  if (o >= 1_000_000) return `1/${(o / 1_000_000).toFixed(1)}M`;
  if (o >= 10_000) return `1/${Math.round(o / 1000)}K`;
  return `1/${Math.round(o).toLocaleString()}`;
}

export function DanTuoCompare({ data }: Props) {
  const [trotterN, setTrotterN] = useState(13);
  const [reroll, setReroll] = useState(0);

  // AI 核心號碼 (reasons 次序 = AI 優先次序, 由高到低) + 補夠 25 個 (由 freq_all 最高頻補入)
  // ⚠️ predictStatic reasons 得 15 個, 但 4膽拖13尾要 17 個, 4膽拖20尾要 24 個 → 一定要補
  const core = useMemo(() => {
    const p = predictStatic(data, 12, reroll);
    const reasonNums = p.reasons.map(r => r.num);
    const picked = new Set(reasonNums);
    const extra = (data.freq_all || [])
      .filter(x => !picked.has(x.num))
      .sort((a, b) => b.count - a.count)
      .map(x => x.num);
    return [...reasonNums, ...extra].slice(0, 25);
  }, [data, reroll]);

  // 三個方案: 頭3/4/5 做膽, 其後 N 個做拖
  const schemes = useMemo(() => {
    return BANKER_CHOICES.map(bCount => {
      const bankers = core.slice(0, bCount);
      const trotters = core.slice(bCount, bCount + trotterN);
      const r = bankers.length;
      const n = trotters.length;
      const slots = 6 - r;
      const tickets = comb(n, slots);
      const cost = tickets * 10;
      return {
        bCount,
        bankers,
        trotters,
        tickets,
        cost,
        p3: systemProb(r, n, 3),
        p4: systemProb(r, n, 4),
        p5: systemProb(r, n, 5),
        p6: systemProb(r, n, 6),
      };
    });
  }, [core, trotterN]);

  // 性價比: P(中5) per dollar
  const best = useMemo(() => {
    let idx = 0, bestVal = -1;
    schemes.forEach((s, i) => {
      const val = s.p5 / (s.cost || 1);
      if (val > bestVal) { bestVal = val; idx = i; }
    });
    return idx;
  }, [schemes]);

  if (!core.length) return null;

  return (
    <Card title="🎯 膽拖比較（AI 核心 · 自由 3/4/5 膽）" icon="🎯">
      <div className="dantuo-intro">
        <b>點用：</b>AI 按分數排好 49 個號碼嘅優先次序。揀「拖幾多個尾」，下面並排比較 <b>3 膽 / 4 膽 / 5 膽</b> 三種方案 — 睇邊個性價比（中5機率 ÷ 成本）最高。頭 3/4/5 個 = 最強 AI 信心號碼做膽。
      </div>

      <div className="stats-actions">
        <span className="check-label">拖幾多個尾：</span>
        {TROTTER_OPTIONS.map(n => (
          <button key={n} className={trotterN === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setTrotterN(n)}>{n} 尾</button>
        ))}
        <button className="gen-btn" style={{ marginLeft: 'auto' }} onClick={() => setReroll(r => r + 1)}>🎲 重新生成</button>
      </div>

      <div className="dtcmp-grid">
        {schemes.map((s, i) => (
          <div key={s.bCount} className={`dtcmp-card ${i === best ? 'dtcmp-best' : ''}`}>
            <div className="dtcmp-head">
              <span className="dtcmp-title">{s.bCount} 膽拖 {s.trotters.length} 尾</span>
              {i === best && <span className="planner-crown">🏆 性價比最高</span>}
            </div>
            <div className="dtcmp-section">
              <span className="check-label">🎯 膽：</span>
              <span className="dantuo-chips">{s.bankers.map(n => <Ball key={n} n={n} cls="sp" />)}</span>
            </div>
            <div className="dtcmp-section">
              <span className="check-label">🔗 拖：</span>
              <span className="dantuo-chips">{s.trotters.map(n => <Ball key={n} n={n} cls="blue" />)}</span>
            </div>
            <div className="combo-result">
              <div className="combo-row"><span>📝 注數</span><b>{s.tickets.toLocaleString()} 注</b></div>
              <div className="combo-row"><span>💰 成本</span><b>${s.cost.toLocaleString()}</b></div>
              <div className="combo-row"><span>🎯 中 6（頭獎）</span><b>{fmtOdds(s.p6)}</b></div>
              <div className="combo-row"><span>🥈 中 5+</span><b>{fmtOdds(s.p5)}</b></div>
              <div className="combo-row"><span>🥉 中 4+</span><b>{fmtOdds(s.p4)}</b></div>
              <div className="combo-row"><span>💵 中 3+</span><b>{(s.p3 * 100).toFixed(1)}%</b></div>
            </div>
          </div>
        ))}
      </div>

      <div className="gen-note">
        💡 <b>點揀：</b>
        <br />• <b>3 膽</b>：拖最多（覆蓋最廣），但 3 個膽要全中先衝高獎 — 適合有信心但想拖多啲。
        <br />• <b>4 膽</b>：平衡之選，膽中 3 個仍有機會中 4+ — 最常用。
        <br />• <b>5 膽</b>：拖最少（最慳注數），但 5 個膽中晒先有大獎 — 適合好有信心嗰 5 個。
        <br />⚠️ <b>誠實警告：</b>膽拖唔會提高中獎機率，同注數嘅單式分散中5機會更高。膽拖嘅價值係「膽中 → 多注同時中（派彩集中）」。上面「性價比」係計 中5機率/成本，唔代表實際回報。
      </div>
    </Card>
  );
}
