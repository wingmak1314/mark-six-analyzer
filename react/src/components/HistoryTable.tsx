import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { countConsec } from '../lib/analyzer';
import type { Draw } from '../lib/analyzer';

export function HistoryTable({ draws }: { draws: Draw[] }) {
  // 篩選器 state
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [drawNo, setDrawNo] = useState('');
  const [dateQ, setDateQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  // 年份/月份清單
  const years = useMemo(() => {
    const s = new Set<string>();
    for (const d of draws) s.add('20' + d.draw.split('/')[0]);
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [draws]);

  const months = useMemo(() => ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], []);

  // 篩選邏輯
  const filtered = useMemo(() => {
    let list = draws;
    if (year !== 'all') list = list.filter(d => '20' + d.draw.split('/')[0] === year);
    if (month !== 'all') {
      const mm = d => d.date.split('/')[1];
      list = list.filter(d => mm(d) === month);
    }
    if (drawNo.trim()) {
      const q = drawNo.trim().toLowerCase();
      list = list.filter(d => {
        const [, no] = d.draw.split('/');
        return d.draw.toLowerCase().includes(q) || no.toLowerCase().includes(q) || no.replace(/^0+/, '').includes(q);
      });
    }
    if (dateQ.trim()) {
      const q = dateQ.trim();
      list = list.filter(d => d.date.includes(q) || d.date.replace(/^0/, '').includes(q) || d.date.split('/')[1].includes(q));
    }
    return list;
  }, [draws, year, month, drawNo, dateQ]);

  const visible = showAll ? filtered : filtered.slice(0, 100);
  const total = draws.length;

  return (
    <>
      {/* 篩選器 */}
      <div className="filter-bar">
        <select value={year} onChange={e => setYear(e.target.value)}>
          <option value="all">全部年份</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)}>
          <option value="all">全部月份</option>
          {months.map(m => <option key={m} value={m}>{Number(m)}月</option>)}
        </select>
        <input
          type="text"
          placeholder="期號搜尋 (例如: 083 / 5 / 26/083)"
          value={drawNo}
          onChange={e => setDrawNo(e.target.value)}
        />
        <input
          type="text"
          placeholder="日期搜尋 (例如: 08/08 / 8/8)"
          value={dateQ}
          onChange={e => setDateQ(e.target.value)}
          className="date-search"
        />
        <span className="filter-count">
          {year !== 'all' || month !== 'all' || drawNo || dateQ ? `搵到 ${filtered.length} 期` : `共 ${total} 期`}
        </span>
      </div>

      {/* 結果表 */}
      <div className="history-table">
        {visible.map(d => {
          const sorted = [...d.main].sort((a, b) => a - b);
          const cons = countConsec(sorted);
          return (
            <div className="hist-row" key={d.draw}>
              <span className="hist-draw">{d.draw}</span>
              <span className="hist-date">{d.date}</span>
              <span className="hist-balls">
                {d.main.map(n => <Ball key={n} n={n} cls="red" />)}
                <span className="plus">+</span>
                <Ball n={d.special} cls="sp" />
              </span>
              {cons > 0 && <span className="hist-tag">連號×{cons}</span>}
            </div>
          );
        })}
        {visible.length === 0 && <div className="no-result">冇搵到符合嘅期數</div>}
      </div>

      {/* 載入更多 */}
      {!showAll && filtered.length > 100 && (
        <button className="load-more" onClick={() => setShowAll(true)}>
          顯示全部 {filtered.length} 期
        </button>
      )}
    </>
  );
}
