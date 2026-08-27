import { Ball } from './Ball';

export function Hero({ data }: { data: { last_draw: string; last_date: string; last_numbers: number[]; last_special: number; total_draws: number; consec_pct: number; repeat_avg: number } }) {
  return (
    <section className="hero">
      <div className="hero-draw">第 {data.last_draw} 期</div>
      <div className="hero-date">{data.last_date}</div>
      <div className="hero-balls">
        {data.last_numbers.map(n => <Ball key={n} n={n} cls="red" size="lg" />)}
        <span className="plus">+</span>
        <Ball n={data.last_special} cls="sp" size="lg" />
      </div>
      <div className="hero-meta">
        <span>📚 共 {data.total_draws} 期數據</span>
        <span>🔗 連號比率 {data.consec_pct}%</span>
        <span>🔁 上期重複 {data.repeat_avg} 個</span>
      </div>
    </section>
  );
}
