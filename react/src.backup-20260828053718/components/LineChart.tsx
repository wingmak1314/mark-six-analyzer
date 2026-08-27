// SVG 折線圖 (時間序列) — 輕量, 冇外部依賴
// data 需按時間順序 (左=舊 → 右=新)
export function LineChart({ data, color, height = 180, fmt }: {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
  fmt?: (n: number) => string;
}) {
  const n = data.length;
  if (n < 2) return <div className="lc-empty">數據不足（至少 2 期先有走勢）</div>;

  const W = 720, H = 200, PAD = 12;
  const vals = data.map(d => d.value);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const px = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const py = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ');

  return (
    <div className="linechart">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={px(i)} cy={py(d.value)} r="2.6" fill={color}>
            <title>{`${d.label}: ${fmt ? fmt(d.value) : d.value.toLocaleString()}`}</title>
          </circle>
        ))}
      </svg>
      <div className="lc-axis">
        <span>{data[0].label}</span>
        <span className="lc-max">{fmt ? fmt(max) : max.toLocaleString()} ↑</span>
        <span>{data[n - 1].label}</span>
      </div>
    </div>
  );
}
