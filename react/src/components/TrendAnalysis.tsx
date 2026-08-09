// 多維度分析 — 單雙 / 大細 / 尾數 / 區間走勢
import { useState } from 'react';
import { BarChart } from './BarChart';
import { Card } from './Card';
import type { DashboardData } from '../lib/analyzer';

type Dim = 'odd' | 'size' | 'tail' | 'zone';

export function TrendAnalysis({ data }: { data: DashboardData }) {
  const [dim, setDim] = useState<Dim>('odd');

  const dims: { id: Dim; label: string; data: [string, number][] }[] = [
    { id: 'odd', label: '單雙比例', data: data.odd_even },
    { id: 'size', label: '大細分佈', data: data.size },
    { id: 'tail', label: '同尾數', data: data.tail },
    { id: 'zone', label: '區間走勢', data: data.zones },
  ];

  const active = dims.find(d => d.id === dim)!;

  return (
    <div className="trend-wrap">
      <div className="dim-tabs">
        {dims.map(d => (
          <button
            key={d.id}
            className={dim === d.id ? 'dim-btn active' : 'dim-btn'}
            onClick={() => setDim(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <Card title={`📊 ${active.label}`} icon="📊">
        <BarChart data={active.data} color="#6a5fc1" />
      </Card>
      <div className="trend-note">
        💡 提示：單雙/大細主流係 3:3（~34%），尾數 2、7、8 最熱，尾數 0 最冷，41-49 區間偏冷。
      </div>
    </div>
  );
}
