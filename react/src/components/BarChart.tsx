export function BarChart({ data, color }: { data: [string, number][]; color?: string }) {
  const max = data[0]?.[1] || 1;
  return (
    <div className="barchart">
      {data.map(([k, v]) => (
        <div className="bc-row" key={k}>
          <span className="bc-label">{k}</span>
          <div className="bc-bar"><div className="bc-fill" style={{ width: `${(v / max * 100).toFixed(0)}%`, background: color || '#0071e3' }} /></div>
          <span className="bc-val">{v}</span>
        </div>
      ))}
    </div>
  );
}
