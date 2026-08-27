// 注碼分配器 — 輸入預算, 比較唔同買法嘅真實中獎機率 (誠實數學, 唔呃人)
// 核心事實: 中獎機率只同「注數 × 分散程度」有關, 買法影響嘅係派彩結構
import { useMemo, useState } from 'react';
import { Card } from './Card';
import { systemProb, systemProbFushi, singleTicketProb, TOTAL_COMBOS } from '../lib/analyzer';

interface Plan {
  id: string;
  name: string;
  desc: string;
  cost: number;
  tickets: number;
  p5: number;  // 中 5+ 個主號碼 (系統層面, 約)
  p3: number;  // 中 3+ 個主號碼 (系統層面, 約)
  tag?: string;
}

const PRESETS = [200, 300, 500, 1000];

// 中5+ 單注機率 (5主=三獎, 6主=頭獎)
const P5_SINGLE = singleTicketProb(5);
const P3_SINGLE = singleTicketProb(3);

function fmtOdds(p: number): string {
  if (p <= 0) return '—';
  const o = 1 / p;
  if (o >= 1000000) return `1/${(o / 1000000).toFixed(1)}M`;
  if (o >= 10000) return `1/${Math.round(o / 1000)}K`;
  return `1/${Math.round(o).toLocaleString()}`;
}

export function BudgetPlanner() {
  const [budget, setBudget] = useState(500);
  const [custom, setCustom] = useState('');

  // 單式分散: N 注唔同組合 (假設組合唔重疊, 機率 ≈ N × 單注)
  const plans = useMemo((): Plan[] => {
    const n = Math.max(1, Math.floor(budget / 10));
    const out: Plan[] = [];
    out.push({
      id: 'qp', name: '🎲 單式分散（Quick Pick）', desc: `${n} 注唔同組合`,
      cost: n * 10, tickets: n,
      p5: Math.min(1, 1 - Math.pow(1 - P5_SINGLE, n)),
      p3: Math.min(1, 1 - Math.pow(1 - P3_SINGLE, n)),
      tag: '中5+機率最高',
    });
    // 複式8 + 複式7 + QP 餘額
    if (budget >= 350) {
      const qpN = Math.floor((budget - 350) / 10);
      const t = 28 + 7 + Math.max(0, qpN);
      out.push({
        id: 'f8', name: '🧮 複式8 + 複式7 + QP', desc: `28注 + 7注 + ${Math.max(0, qpN)}注`,
        cost: 350 + Math.max(0, qpN) * 10, tickets: t,
        p5: Math.min(1, 1 - (1 - systemProbFushi(8, 5)) * (1 - systemProbFushi(7, 5)) * Math.pow(1 - P5_SINGLE, Math.max(0, qpN))),
        p3: Math.min(1, 1 - (1 - systemProbFushi(8, 3)) * (1 - systemProbFushi(7, 3)) * Math.pow(1 - P3_SINGLE, Math.max(0, qpN))),
        tag: '中3/4 派彩乘法強',
      });
    }
    // 5+all + 複式7 + QP 餘額
    if (budget >= 510) {
      const qpN = Math.floor((budget - 510) / 10);
      const t = 44 + 7 + Math.max(0, qpN);
      out.push({
        id: 'all5', name: '🎱 5膽拖全部（44注）+ 複式7', desc: `44注 + 7注 + ${Math.max(0, qpN)}注 QP`,
        cost: 510 + Math.max(0, qpN) * 10, tickets: t,
        p5: Math.min(1, 1 - (1 - systemProb(5, 44, 5)) * (1 - systemProbFushi(7, 5)) * Math.pow(1 - P5_SINGLE, Math.max(0, qpN))),
        p3: Math.min(1, 1 - (1 - systemProb(5, 44, 3)) * (1 - systemProbFushi(7, 3)) * Math.pow(1 - P3_SINGLE, Math.max(0, qpN))),
        tag: '平價全覆蓋（49 個號碼都包）',
      });
    }
    // 複式9 + 複式7 + QP 餘額
    if (budget >= 910) {
      const qpN = Math.floor((budget - 910) / 10);
      const t = 84 + 7 + Math.max(0, qpN);
      out.push({
        id: 'f9', name: '🧮 複式9 + 複式7 + QP', desc: `84注 + 7注 + ${Math.max(0, qpN)}注`,
        cost: 910 + Math.max(0, qpN) * 10, tickets: t,
        p5: Math.min(1, 1 - (1 - systemProbFushi(9, 5)) * (1 - systemProbFushi(7, 5)) * Math.pow(1 - P5_SINGLE, Math.max(0, qpN))),
        p3: Math.min(1, 1 - (1 - systemProbFushi(9, 3)) * (1 - systemProbFushi(7, 3)) * Math.pow(1 - P3_SINGLE, Math.max(0, qpN))),
        tag: '大預算派彩乘法最強',
      });
    }
    // 獨立工具選項 (唔超過預算就列出)
    const singles: Plan[] = [
      { id: 'f7', name: '🧮 複式7', desc: 'C(7,6)=7 注', cost: 70, tickets: 7, p5: systemProbFushi(7, 5), p3: systemProbFushi(7, 3) },
      { id: 'f8s', name: '🧮 複式8', desc: 'C(8,6)=28 注', cost: 280, tickets: 28, p5: systemProbFushi(8, 5), p3: systemProbFushi(8, 3) },
      { id: 'all5s', name: '🎱 5膽拖全部', desc: '5 膽 + 44 拖 = 44 注', cost: 440, tickets: 44, p5: systemProb(5, 44, 5), p3: systemProb(5, 44, 3) },
      { id: 'd28', name: '🎱 2膽拖8尾', desc: 'C(8,4)=70 注', cost: 700, tickets: 70, p5: systemProb(2, 8, 5), p3: systemProb(2, 8, 3) },
      { id: 'f9s', name: '🧮 複式9', desc: 'C(9,6)=84 注', cost: 840, tickets: 84, p5: systemProbFushi(9, 5), p3: systemProbFushi(9, 3) },
    ];
    for (const s of singles) if (s.cost <= budget) out.push(s);

    return out.sort((a, b) => b.p5 - a.p5);
  }, [budget]);

  const best = plans[0];

  const setBudgetFrom = (v: number) => { setBudget(v); setCustom(''); };
  const applyCustom = () => {
    const v = Number(custom);
    if (v >= 20 && v <= 10000) setBudget(Math.round(v / 10) * 10);
  };

  return (
    <Card title="💰 注碼分配器（同一預算，邊種買法中獎機會最高？）" icon="💰">
      <div className="stats-actions">
        <span className="check-label">預算：</span>
        {PRESETS.map(p => (
          <button key={p} className={budget === p ? 'dim-btn active' : 'dim-btn'} onClick={() => setBudgetFrom(p)}>${p.toLocaleString()}</button>
        ))}
        <input
          className="gen-num" style={{ width: 90 }} placeholder="自訂"
          value={custom} inputMode="numeric"
          onChange={e => setCustom(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={applyCustom} onKeyDown={e => { if (e.key === 'Enter') applyCustom(); }}
        />
      </div>

      <div className="planner-grid">
        {plans.map(p => (
          <div key={p.id} className={`planner-card ${best && p.id === best.id ? 'planner-best' : ''}`}>
            <div className="planner-head">
              <span className="planner-name">{p.name}</span>
              {best && p.id === best.id && <span className="planner-crown">🏆 中5+ 最高</span>}
              {p.tag && best && p.id !== best.id && <span className="planner-tag">{p.tag}</span>}
            </div>
            <div className="planner-row"><span>💰 成本</span><b>${p.cost.toLocaleString()}</b></div>
            <div className="planner-row"><span>🎫 注數</span><b>{p.tickets.toLocaleString()} 注</b></div>
            <div className="planner-row"><span>🥈 中 5+ 個（三獎或以上）</span><b>{fmtOdds(p.p5)}</b></div>
            <div className="planner-row"><span>💵 中 3+ 個（七獎或以上）</span><b>{(p.p3 * 100).toFixed(1)}%</b></div>
            <div className="planner-row"><span>🎯 頭獎</span><b>1/{(TOTAL_COMBOS / Math.max(1, p.tickets)).toLocaleString()}</b></div>
          </div>
        ))}
      </div>

      <div className="gen-note">
        💡 <b>點樣揀：</b>
        <br />• <b>想要最高「中 5 個」機會</b> → 單式分散（唔同組合越多越好，唔好重複）。
        <br />• <b>想中 3/4 個嗰陣派彩乘大</b> → 複式8/9（4 個主號碼入面 = 多注同時中，例如 8 字複式中 4 個 = 22 注中獎）。
        <br />• <b>想平價覆蓋晒 49 個號碼</b> → 5膽拖全部（$440 = 44 注，每個號碼都喺某注入面）。
        <br />⚠️ <b>誠實警告：</b>任何買法嘅頭獎機率都係 注數/13,983,816，買法唔會改變數學。每期獨立，長期買一定輸（歷史實測 ROI -83%）。儲錢等大金多寶先落注，永遠好過逢期買。
      </div>
    </Card>
  );
}
