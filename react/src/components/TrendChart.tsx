// 號碼走勢圖 — 揀一個號碼, 睇佢最近 N 期出現情況
import { useMemo, useState } from 'react';
import { Card } from './Card';
import type { Draw } from '../lib/analyzer';

interface Props {
  history: Draw[];
}

export function TrendChart({ history }: Props) {
  const [num, setNum] = useState(30);       // 揀邊個號碼
  const [periods, setPeriods] = useState(30); // 睇幾多期

  const data = useMemo(() => {
    const recent = history.slice(0, periods).reverse();  // 由舊到新
    return recent.map(d => ({
      draw: d.draw,
      hit: d.main.includes(num) || d.special === num,
    }));
  }, [history, num, periods]);

  const hits = data.filter(d => d.hit).length;

  return (
    <Card title="📈 號碼走勢圖" icon="📈">
      <div className="trend-controls">
        <span className="check-label">號碼：</span>
        <select className="gen-opt select" value={num} onChange={e => setNum(Number(e.target.value))}>
          {Array.from({ length: 49 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="check-label">期數：</span>
        {[10, 30, 50, 100].map(n => (
          <button key={n} className={periods === n ? 'dim-btn active' : 'dim-btn'} onClick={() => setPeriods(n)}>{n}期</button>
        ))}
      </div>
      <div className="trend-summary">
        號碼 <b>{num}</b> 最近 {periods} 期出現 <b className="hitrate-good">{hits}</b> 次
      </div>
      <div className="trend-chart">
        {data.map((d, _i) => (
          <div key={d.draw} className="trend-col" title={`${d.draw}: ${d.hit ? '中' : '冇中'}`}>
            <div className={`trend-dot ${d.hit ? 'trend-hit' : 'trend-miss'}`} />
            <span className="trend-draw">{d.draw.split('/')[1].replace(/^0/, '')}</span>
          </div>
        ))}
      </div>
      <div className="gen-note">
        💡 紅色點 = 該期開出號碼 {num}，灰色 = 冇開。可以睇到號碼嘅出沒節奏。
        <br />⚠️ 純觀察用 — 走勢圖唔會增加中獎機率（每期獨立隨機）。
      </div>
    </Card>
  );
}
