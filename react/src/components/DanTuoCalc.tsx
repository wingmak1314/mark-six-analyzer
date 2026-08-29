// 膽拖計算器 — 揀膽 + 拖, 即時計注數/成本/中獎機率 + AI 自動揀 + 命中率
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { predictStatic, comb, systemProb } from '../lib/analyzer';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function DanTuoCalc({ data, history }: Props) {
  const [bankers, setBankers] = useState<number[]>([]);  // 膽
  const [trotters, setTrotters] = useState<number[]>([]); // 拖
  const [lookback, setLookback] = useState(10);
  const [reroll, setReroll] = useState(0);  // 每次 +1 → AI 重新揀 (次次唔同)
  const [mode, setMode] = useState<'3+12' | '3+15' | '5+all'>('3+12');  // 3膽拖12尾 / 3膽拖15尾 / 5膽拖全部

  const toggle = (list: number[], setList: (v: number[]) => void, n: number, max: number) => {
    setList(list.includes(n) ? list.filter(x => x !== n) : (list.length >= max ? list : [...list, n].sort((a, b) => a - b)));
  };

  // 🤖 AI 自動揀: 統計引擎 top3/top5 做膽
  // 3+12: main15 前3做膽, 其餘12做拖
  // 3+15: main15 前3做膽 + 12拖, 再補3個最高頻號碼做拖 (共15拖)
  // 5+all: top5 做膽, 其餘 44 個全部做拖 (覆蓋晒)
  const aiPick = (jitter = 0) => {
    const pred = predictStatic(data, jitter);
    const main15 = pred.main15;
    // reasons 依 AI 優先次序 — 頭幾個就係最高分做膽 (唔係號碼細到大)
    const top = pred.reasons.slice(0, 5).map(r => r.num);
    let bankers3: number[], trotters: number[];
    if (mode === '5+all') {
      // 5 膽 + 全部 44 拖
      bankers3 = top.slice(0, 5);
      const all = Array.from({ length: 49 }, (_, i) => i + 1);
      trotters = all.filter(n => !bankers3.includes(n));
    } else {
      bankers3 = top.slice(0, 3);
      trotters = main15.filter(n => !bankers3.includes(n));
      if (mode === '3+15') {
        // 由 freq_all 補 3 個最高頻、未揀過嘅號碼
        const picked = new Set([...bankers3, ...trotters]);
        const extra = (data.freq_all || [])
          .filter(x => !picked.has(x.num))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(x => x.num);
        trotters = [...trotters, ...extra].sort((a, b) => a - b);
      }
    }
    setBankers(bankers3);
    setTrotters(trotters);
  };

  const result = useMemo(() => {
    const r = bankers.length;
    const n = trotters.length;
    const need = 6;
    const slots = need - r;  // 每注拖位數量
    if (r + n < 6 || r === 0) return null;
    const tickets = comb(n, slots);
    const cost = tickets * 10;

    // 系統真實機率: P(至少一注中 target 個主號碼) — 共用 analyzer 嘅 systemProb
    // 若膽全中 (X = r): 系統中 target 個嘅條件機率
    const probAll = (target: number) => {
      const z = target - r;
      if (z < 0 || z > slots) return 0;
      let p = 0;
      for (let y = 0; y <= Math.min(slots, n); y++) {
        const pY = comb(n, y) * comb(49 - r - n, slots - y) / comb(49 - r, slots);
        if (pY === 0) continue;
        if (z >= Math.max(0, slots - (n - y)) && z <= Math.min(slots, y)) p += pY;
      }
      return p;
    };

    return {
      r, n, tickets, cost,
      p3: systemProb(r, n, 3), p4: systemProb(r, n, 4), p5: systemProb(r, n, 5), p6: systemProb(r, n, 6),
      // 若果膽全中 → 中 5 個嘅條件機率 (系統層面, 至少一注)
      opt5: probAll(5),
    };
  }, [bankers, trotters]);

  // 命中率: 過去 N 期, 用「當前揀緊嘅膽+拖」對比實際開獎 (同步, 唔重新 AI 揀)
  const hitRate = useMemo(() => {
    if (history.length < 2 || bankers.length === 0 || trotters.length === 0) return null;
    const slots = 6 - bankers.length;  // 每注拖位數量
    // 一注最多中 = 膽中 + min(拖位, 拖中) — 中 5+ 需要 >= 5 (任何膽數都啱)
    const canHit5 = (b: number, t: number) => b + Math.min(slots, t) >= 5;
    const rows: { draw: string; bHits: number; tHits: number; total: number }[] = [];
    for (let i = 1; i <= Math.min(lookback, history.length - 1); i++) {
      const actual = history[i - 1];
      const drawn = new Set(actual.main);
      const bHits = bankers.filter(n => drawn.has(n)).length;
      const tHits = trotters.filter(n => drawn.has(n)).length;
      rows.push({ draw: actual.draw, bHits, tHits, total: bHits + tHits });
    }
    const avgB = rows.length ? (rows.reduce((s, r) => s + r.bHits, 0) / rows.length).toFixed(2) : '0';
    const avgT = rows.length ? (rows.reduce((s, r) => s + r.tHits, 0) / rows.length).toFixed(2) : '0';
    const hit5 = rows.filter(r => canHit5(r.bHits, r.tHits)).length;
    return { rows, avgB, avgT, hit5, canHit5 };
  }, [history, lookback, bankers, trotters]);

  const fmt = (p: number) => p > 0 ? `1/${Math.round(1 / p).toLocaleString()}` : '—';

  return (
    <Card title="🧮 膽拖計算器" icon="🧮">
      <div className="dantuo-intro">
        揀 <b>膽</b>（固定號碼，每注必有）+ <b>拖</b>（輪流配搭）。膽 + 拖 ≥ 6 個先計到。
      </div>

      <div className="stats-actions">
        <div className="dim-tabs">
          <button className={mode === '3+12' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('3+12')}>3 膽 + 12 拖</button>
          <button className={mode === '3+15' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('3+15')}>3 膽 + 15 拖</button>
          <button className={mode === '5+all' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('5+all')}>5 膽 + 全部</button>
        </div>
        <button className="gen-btn" onClick={() => aiPick(0)}>🤖 AI 自動揀</button>
        <button className="gen-btn" onClick={() => { aiPick(12); setReroll(r => r + 1); }}>🎲 重新生成（次次唔同）</button>
        <span className="stats-hint">已生成 {reroll + 1} 次</span>
      </div>

      <div className="dantuo-section">
        <span className="check-label">🎯 膽（最多 5 個，最少 1 個）：</span>
        <div className="combo-grid">
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`combo-cell ${bankers.includes(n) ? 'combo-on' : ''}`}
              onClick={() => toggle(bankers, setBankers, n, 5)}
              disabled={bankers.length >= 5 && !bankers.includes(n)}
            >
              <Ball n={n} cls={bankers.includes(n) ? 'sp' : 'gray'} />
            </button>
          ))}
        </div>
      </div>

      <div className="dantuo-section">
        <span className="check-label">🔗 拖（最多 20 個）：</span>
        <div className="combo-grid">
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`combo-cell ${trotters.includes(n) ? 'combo-on' : ''}`}
              onClick={() => toggle(trotters, setTrotters, n, 20)}
              disabled={(trotters.length >= 20 || bankers.includes(n)) && !trotters.includes(n)}
            >
              <Ball n={n} cls={trotters.includes(n) ? 'blue' : 'gray'} />
            </button>
          ))}
        </div>
      </div>

      <div className="dantuo-selected">
        <span className="check-label">已揀：</span>
        {bankers.length === 0 && trotters.length === 0 && <span className="check-note">未揀任何號碼（撳「AI 自動揀」快速開始）</span>}
        {bankers.length > 0 && <span className="dantuo-chips">膽: {bankers.map(n => <Ball key={n} n={n} cls="sp" />)}</span>}
        {trotters.length > 0 && <span className="dantuo-chips">拖: {trotters.map(n => <Ball key={n} n={n} cls="blue" />)}</span>}
      </div>

      {result ? (
        <div className="combo-result">
          <div className="combo-row"><span>📝 {result.r} 膽拖 {result.n} 尾</span><b>{result.tickets.toLocaleString()} 注</b></div>
          <div className="combo-row"><span>💰 成本</span><b>${result.cost.toLocaleString()}</b></div>
          <div className="combo-row"><span>🎯 中 6 個（頭獎）</span><b>{fmt(result.p6)}</b></div>
          <div className="combo-row"><span>🥈 中 5 個</span><b>{fmt(result.p5)}</b></div>
          <div className="combo-row"><span>🥉 中 4 個</span><b>{fmt(result.p4)}</b></div>
          <div className="combo-row"><span>💵 中 3 個</span><b>{fmt(result.p3)}</b></div>
          <div className="combo-row dantuo-opt"><span>✨ 若膽全中，中 5 個</span><b>{fmt(result.opt5)}</b></div>
          <div className="check-note">ℹ️ 機率 = 成個系統（{result.tickets.toLocaleString()} 注）至少一注中，唔係每注。</div>
        </div>
      ) : (
        <div className="check-note">
          {bankers.length === 0 ? '⚠️ 最少要揀 1 個膽' : `仲要揀多 ${6 - bankers.length - trotters.length} 個拖先計到`}
        </div>
      )}

      {/* 命中率 */}
      {hitRate && (
        <div className="hitrate-block">
          <div className="hitrate-controls">
            <span className="check-label">📊 AI 膽拖命中率（回顧）：</span>
            {[5, 10, 20, 50].map(n => (
              <button key={n} className={lookback === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setLookback(n)}>{n}期</button>
            ))}
          </div>
          <div className="hitrate-summary">
            <span>🎯 膽平均中 <b>{hitRate.avgB}</b> 個</span>
            <span>🔗 拖平均中 <b>{hitRate.avgT}</b> 個</span>
            <span>🥈 有機會中5個嘅期數：<b>{hitRate.hit5}/{hitRate.rows.length}</b></span>
          </div>
          <div className="hitrate-table">
            {hitRate.rows.map(r => (
              <div className="hitrate-row" key={r.draw}>
                <span className="hist-draw">{r.draw}</span>
                <span className="hitrate-count">膽中 {r.bHits} · 拖中 {r.tHits} · 共 {r.total}</span>
                <span className={hitRate.canHit5(r.bHits, r.tHits) ? 'hitrate-good' : 'hitrate-neutral'}>
                  {hitRate.canHit5(r.bHits, r.tHits) ? '🎯 有望中5' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gen-note">
        💡 <b>膽拖原理：</b>每注包含所有膽 + 輪流配搭拖。好處係「膽中晒 → 多注同時中獎（派彩爆發）」。
        <br />⚠️ <b>注意：</b>膽拖對「中5個」嘅總機率唔會高過同注數嘅單式分散（因為全部注共用膽，膽唔中就好難中高獎）。適合「對某幾個號碼好有信心」先值得用。
      </div>
    </Card>
  );
}
