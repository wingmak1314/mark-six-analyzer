// 49格號碼熱力圖 — 顏色深度 = 出現頻率 (min-max 標準化先有視覺對比)
export function Heatmap({ data }: { data: { num: number; count: number }[] }) {
  const freqMap = new Map(data.map(d => [d.num, d.count]));
  const counts = data.map(d => d.count);
  // min/max 用真實數據範圍 (唔可以 fallback 0/1, 否則 min-max 失效)
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const range = max - min || 1;  // 防止全部一樣 (range=0)

  const cells = [];
  for (let row = 0; row < 7; row++) {
    const rowCells = [];
    for (let col = 0; col < 7; col++) {
      const num = row * 7 + col + 1;
      const count = freqMap.get(num) || 0;
      // min-max 標準化: 最冷 = 0, 最熱 = 1 (唔係 count/max)
      const ratio = (count - min) / range;
      // 熱度色: 冷(藍) → 暖(黃) → 熱(紅)
      let r, g, b;
      if (ratio < 0.5) {
        // 藍 → 黃
        const t = ratio * 2;
        r = Math.round(40 + 210 * t);
        g = Math.round(90 + 150 * t);
        b = Math.round(210 - 170 * t);
      } else {
        // 黃 → 紅
        const t = (ratio - 0.5) * 2;
        r = Math.round(250);
        g = Math.round(240 - 190 * t);
        b = Math.round(40 - 30 * t);
      }
      const bg = `rgb(${r}, ${g}, ${b})`;
      rowCells.push(
        <div className="heat-cell" key={num} style={{ background: bg }} title={`號碼 ${num}: ${count} 次`}>
          <span className="heat-num">{num}</span>
          <span className="heat-count">{count}</span>
        </div>
      );
    }
    cells.push(<div className="heat-row" key={row}>{rowCells}</div>);
  }
  return (
    <div className="heatmap">
      {cells}
      <div className="heat-legend">
        <span>🧊 冷 ({min}次)</span>
        <div className="heat-gradient" />
        <span>🔥 熱 ({max}次)</span>
      </div>
    </div>
  );
}
