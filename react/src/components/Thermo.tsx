// 🌡️ 今期溫度計 — 49 個波由熱到冷排, 顏色深淺 = 近 50 期出現頻率
// 普通用戶唔使睇表格: 一眼掃晒邊啲號碼旺/靜
import { useMemo } from 'react';
import { Card } from './Card';
import type { DashboardData } from '../lib/analyzer';

export function Thermo({ data }: { data: DashboardData }) {
  const heat = useMemo(() => {
    const rec = new Map((data.recent_freq || []).map(x => [x.num, x.count]));
    const win = Math.min(50, data.total_draws);
    // 49 個波: 熱度 = 近 50 期次數, 冇數據當 0
    const rows = Array.from({ length: 49 }, (_, i) => {
      const num = i + 1;
      const count = rec.get(num) || 0;
      return { num, count };
    });
    // 由熱到冷排
    rows.sort((a, b) => b.count - a.count || a.num - b.num);
    const max = rows[0]?.count || 1;
    return { rows, max, win };
  }, [data]);

  // 熱度 → 顏色: 熱(橙紅) → 溫(金) → 冷(藍)
  const heatColor = (ratio: number) => {
    if (ratio >= 0.66) return '#ff4d3d';   // 熱
    if (ratio >= 0.33) return '#ff9f0a';   // 溫
    return '#3b82f6';                       // 冷
  };

  // 每個波渲染: 波底色 = 波色(紅藍綠淡色), 溫度色條喺下面
  const renderBall = (r: { num: number; count: number }) => {
    const ratio = r.count / heat.max;
    const c = heatColor(ratio);
    return (
      <span className="thermo-ball" key={r.num} title={`${r.num} — 近${heat.win}期出 ${r.count} 次`}>
        <span className="thermo-num">{r.num}</span>
        <span className="thermo-bar"><span className="thermo-fill" style={{ height: `${Math.max(12, ratio * 100)}%`, background: c }} /></span>
      </span>
    );
  };

  return (
    <Card title="🌡️ 今期溫度計（近 50 期）" icon="🌡️">
      <div className="thermo-legend">
        <span><i className="thermo-dot" style={{ background: '#ff4d3d' }} /> 熱（近期出得多）</span>
        <span><i className="thermo-dot" style={{ background: '#ff9f0a' }} /> 溫</span>
        <span><i className="thermo-dot" style={{ background: '#3b82f6' }} /> 冷（近期少出）</span>
        <span className="thermo-hint">波由左至右 = 由熱到冷</span>
      </div>
      <div className="thermo-strip">
        {heat.rows.map(r => renderBall(r))}
      </div>
    </Card>
  );
}
