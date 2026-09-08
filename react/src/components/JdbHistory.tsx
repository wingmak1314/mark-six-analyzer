// 🏆 金多寶歷史 — 151 期金多寶攪珠記錄 (2005-2026, HKJC 官方數據)
// 載入 jdb.json (靜態檔, 每次數據 cron 一併維護), 加入少量統計: 號碼頻率/冷熱/波色
import { useMemo } from 'react';
import { Card } from './Card';
import { Ball } from './Ball';
import { Note } from './Note';
import { useQuery } from '@tanstack/react-query';

type JdbDraw = { draw: string; date: string; main: number[]; special: number; code: string; name: string };

// 金多寶代碼 → 中文名 (官網同款名稱, 冇 name 就用代碼)
const CODE_NAMES: Record<string, string> = {
  CNY: '新春金多寶', EAS: '復活節金多寶', DBF: '端午金多寶', MAF: '中秋金多寶',
  XMS: '聖誕金多寶', SBD: '新年金多寶', SMR: '暑期金多寶', ANN: '週年金多寶',
  TUS: '幸運二金多寶', STU: '幸運二金多寶', SUS: '周日非常金多寶', SAS: '開鑼金多寶',
  THS: '幸運二金多寶', STE: '夏日金多寶', MOS: '多寶攪珠', OAN: '特別金多寶', SMN: '夏日金多寶',
};

export function JdbHistory() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jdb'],
    queryFn: async (): Promise<JdbDraw[]> => {
      const r = await fetch('jdb.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`jdb.json ${r.status}`);
      const j = await r.json();
      return j.draws || [];
    },
    staleTime: 3600_000,
  });

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const cnt = new Map<number, number>();
    let odd = 0, small = 0;
    for (const d of data) {
      for (const n of [...d.main, d.special]) cnt.set(n, (cnt.get(n) || 0) + 1);
      for (const n of d.main) {
        if (n % 2 === 1) odd++;
        if (n <= 24) small++;
      }
    }
    const freq = Array.from({ length: 49 }, (_, i) => ({ num: i + 1, count: cnt.get(i + 1) || 0 }));
    const hot = [...freq].sort((a, b) => b.count - a.count || a.num - b.num).slice(0, 6);
    const cold = [...freq].filter(x => x.count < (hot[5]?.count || 0)).sort((a, b) => a.count - b.count || a.num - b.num).slice(0, 6);
    const totalMain = data.length * 6;
    return { hot, cold, oddPct: Math.round(odd / totalMain * 100), smallPct: Math.round(small / totalMain * 100), total: data.length };
  }, [data]);

  if (isLoading) return <div className="loading"><div className="spinner" /><div>🔄 載入金多寶數據…</div></div>;
  if (isError || !data) return <Card title="🏆 金多寶歷史" icon="🏆">❌ 數據載入失敗，請刷新再試。</Card>;

  return (
    <>
      <Card title={`🏆 金多寶歷史（${data.length} 期 · 2005-2026）`} icon="🏆">
        <Note label="📖 金多寶係咩？">
          馬會唔定期注入大筆獎金嘅攪珠，頭獎通常有幾千萬甚至過億。2002-2004 官方紀錄冇標記金多寶，所以由 2005 年復活節金多寶起計。數據嚟自 HKJC 官方 API。
        </Note>
        {stats && (
          <div className="jdb-stats">
            <span>🔥 旺號：{stats.hot.map(h => <Ball key={h.num} n={h.num} cls="red" />)}</span>
            <span>❄️ 靜號：{stats.cold.map(c => <Ball key={c.num} n={c.num} cls="sp" />)}</span>
            <span>單雙：{stats.oddPct}% 單 · 大細：{stats.smallPct}% 細</span>
          </div>
        )}
        <div className="jdb-table">
          <div className="jdb-head">
            <span>期數</span><span>日期</span><span>名稱</span><span>號碼</span>
          </div>
          {data.map(d => (
            <div className="jdb-row" key={d.draw}>
              <span className="hist-draw">{d.draw}</span>
              <span className="hist-date">{d.date}</span>
              <span className="jdb-name">{d.name || CODE_NAMES[d.code] || d.code}</span>
              <span className="hist-balls">
                {d.main.map(n => <Ball key={n} n={n} cls="red" />)}
                <span className="plus">+</span>
                <Ball n={d.special} cls="sp" />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
