// 🌡️ 今期溫度計 — 7×7 波色格（似攪珠機）, 格底色深淺 = 近 50 期出現頻率
// 一屏搞掂: 冇 bar、冇排序, 號碼照 1-49 順序, 滑鼠掂住睇次數
import { useMemo } from 'react';
import { Card } from './Card';
import type { DashboardData } from '../lib/analyzer';

export function Thermo({ data }: { data: DashboardData }) {
  const heat = useMemo(() => {
    const rec = new Map((data.recent_freq || []).map(x => [x.num, x.count]));
    const win = Math.min(50, data.total_draws);
    const rows = Array.from({ length: 49 }, (_, i) => {
      const num = i + 1;
      return { num, count: rec.get(num) || 0 };
    });
    const counts = rows.map(r => r.count);
    const max = Math.max(...counts, 1);
    const min = Math.min(...counts);
    return { rows, max, min, win };
  }, [data]);

  // 熱度 0-1 → 顏色: 冷(藍) → 溫(金) → 熱(紅), 用 rgba 直接做底色深淺
  const heatBg = (count: number) => {
    const t = heat.max === heat.min ? 0.5 : (count - heat.min) / (heat.max - heat.min);
    if (t >= 0.66) return `rgba(255, 77, 61, ${0.25 + t * 0.45})`;   // 熱
    if (t >= 0.33) return `rgba(255, 159, 10, ${0.18 + t * 0.35})`;  // 溫
    return `rgba(59, 130, 246, ${0.12 + t * 0.2})`;                  // 冷
  };

  return (
    <Card title="🌡️ 今期溫度計（近 50 期）" icon="🌡️">
      <div className="thermo-legend">
        <span><i className="thermo-dot" style={{ background: '#ff4d3d' }} /> 熱（近期出得多）</span>
        <span><i className="thermo-dot" style={{ background: '#ff9f0a' }} /> 溫</span>
        <span><i className="thermo-dot" style={{ background: '#3b82f6' }} /> 冷（近期少出）</span>
        <span className="thermo-hint">格底色越深 = 越熱，滑鼠掂住睇次數</span>
      </div>
      <div className="thermo-grid">
        {heat.rows.map(r => (
          <span
            className="thermo-cell"
            key={r.num}
            style={{ background: heatBg(r.count) }}
            title={`${r.num} — 近${heat.win}期出 ${r.count} 次`}
          >
            {r.num}
          </span>
        ))}
      </div>
    </Card>
  );
}
