// 🏆 金多寶歷史 — 151 期金多寶攪珠記錄 (2005-2026, HKJC 官方數據)
// + 🎯 AI 15 字推薦: 用金多寶 151 期數據行同款預測引擎 (analyzeStatic + predictStatic)
import { useMemo, useState } from 'react';
import { Card } from './Card';
import { Ball } from './Ball';
import { WaveBall } from './WaveBall';
import { Note } from './Note';
import { useQuery } from '@tanstack/react-query';
import { analyzeStatic, predictStatic } from '../lib/analyzer';
import { waveCombo } from '../lib/colors';

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

  // AI 15 字: 金多寶 151 期行同款引擎 (冇 jitter = 每日數據更新前穩定)
  const pred = useMemo(() => {
    if (!data || data.length === 0) return null;
    const s = analyzeStatic(data);
    return { p: predictStatic(s, 0), total: data.length };
  }, [data]);

  const [showAllNums, setShowAllNums] = useState(false);
  const pickSet = useMemo(() => new Set(pred?.p.main15 || []), [pred]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const cnt = new Map<number, number>();
    const mcnt = new Map<number, number>();
    let odd = 0, small = 0;
    for (const d of data) {
      for (const n of [...d.main, d.special]) cnt.set(n, (cnt.get(n) || 0) + 1);
      for (const n of d.main) {
        mcnt.set(n, (mcnt.get(n) || 0) + 1);
        if (n % 2 === 1) odd++;
        if (n <= 24) small++;
      }
    }
    const freq = Array.from({ length: 49 }, (_, i) => ({ num: i + 1, count: cnt.get(i + 1) || 0 }));
    // 全 49 個號碼由多到少 (每期開 7 個波: 6 主號 + 1 特別號 → 期望 = 期數 × 7 / 49)
    const all = [...freq].sort((a, b) => b.count - a.count || a.num - b.num)
      .map((x, i) => ({ ...x, rank: i + 1, main: mcnt.get(x.num) || 0, sp: x.count - (mcnt.get(x.num) || 0) }));
    const totalMain = data.length * 6;
    // 區間分佈: 每 10 個號碼一段 (1-10 / 11-20 / 21-30 / 31-40 / 41-49)
    // 期望 = 期數 × 7 個波 × (該段號碼數 / 49)
    const ranges = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 49]].map(([a, b]) => {
      let m = 0, s = 0;
      for (let n = a; n <= b; n++) { m += mcnt.get(n) || 0; s += (cnt.get(n) || 0) - (mcnt.get(n) || 0); }
      return { a, b, size: b - a + 1, main: m, sp: s, total: m + s, exp: data.length * 7 * (b - a + 1) / 49 };
    });
    return { oddPct: Math.round(odd / totalMain * 100), smallPct: Math.round(small / totalMain * 100), total: data.length, all, ranges, exp: data.length * 7 / 49 };
  }, [data]);

  if (isLoading) return <div className="loading"><div className="spinner" /><div>🔄 載入金多寶數據…</div></div>;
  if (isError || !data) return <Card title="🏆 金多寶歷史" icon="🏆">❌ 數據載入失敗，請刷新再試。</Card>;

  return (
    <>
      {pred && (
        <Card title={`🎯 金多寶 AI 15 字（基於 ${pred.total} 期金多寶數據）`} icon="🎯">
          <div className="hero-balls">
            {pred.p.main15.map(n => <WaveBall key={n} n={n} />)}
          </div>
          <div className="hero-meta">
            <span>🎨 波色：{waveCombo(pred.p.main15)}</span>
            <span>💡 15 字複式 = 5,005 注 = $50,050</span>
          </div>
          <div className="hero-meta">
            <span>單雙：{pred.p.main15.filter(n => n % 2 === 1).length}單 {pred.p.main15.filter(n => n % 2 === 0).length}雙 · 大細：{pred.p.main15.filter(n => n > 24).length}大 {pred.p.main15.filter(n => n <= 24).length}細</span>
            <span>特別號建議：{pred.p.special}（{pred.p.special_reason}）</span>
          </div>
          <Note label="📖 點解揀呢 15 個？">
            用同一套 AI 引擎（頻率 + 共現 + 遺漏 + 近期趨勢 + 結構平衡），但數據源換成晒歷年 151 期金多寶攪珠 — 即係「金多寶先會開嘅號碼」統計，同平時每期六合彩唔同。⚠️ 每注中頭獎機率一樣係 1/13,983,816，統計唔會提高中獎率，只係揀號碼嘅參考角度唔同。
            <br /><br />
            ⚠️ 特別號點解揀 10：佢真係 151 期金多寶入面做得最多特別號（7 次，第二位 13／36／1／47 各 6 次）。但呢個「最旺」係隨機波動 — 蒙地卡羅模擬 151 期純隨機攪珠，出現某號 ≥7 次嘅機率係 87%（最大值中位數就係 7 次），χ²=42.7（df=48）完全通過。即係話：10 冇特別易開，只係佢咁啱排第一。
          </Note>
        </Card>
      )}

      <Card title={`🏆 金多寶歷史（${data.length} 期 · 2005-2026）`} icon="🏆">
        <Note label="📖 金多寶係咩？">
          馬會唔定期注入大筆獎金嘅攪珠，頭獎通常有幾千萬甚至過億。2002-2004 官方紀錄冇標記金多寶，所以由 2005 年復活節金多寶起計。數據嚟自 HKJC 官方 API。
        </Note>
        {stats && (
          <div className="jdbnum-table">
            <div className="jdbnum-cap">
              <span>📊 49 個號碼開出次數（{stats.total} 期金多寶）</span>
              <span>單雙：{stats.oddPct}% 單</span>
              <span>大細：{stats.smallPct}% 細</span>
              <span>期望：{stats.exp.toFixed(1)} 次／號碼</span>
            </div>
            <div className="jdbnum-head">
              <span>排名</span><span>號碼</span><span>主號</span><span>特別號</span><span>合計（開出次數）</span>
            </div>
            {(showAllNums ? stats.all : stats.all.slice(0, 15)).map(s => (
              <div className="jdbnum-row" key={s.num}>
                <span className="jdbnum-rk">{s.rank}</span>
                <span><Ball n={s.num} cls={pickSet.has(s.num) ? 'sp' : 'gray'} /></span>
                <span>{s.main}</span>
                <span>{s.sp}</span>
                <span className="jdbnum-total">
                  {s.count}
                  <span className="jdbnum-bar" style={{ width: `${Math.round(s.count / (stats.all[0]?.count || 1) * 100)}%` }} />
                </span>
              </div>
            ))}
            {stats.all.length > 15 && (
              <button className="load-more" onClick={() => setShowAllNums(v => !v)}>
                {showAllNums ? '▲ 收起（只睇頭 15）' : `▼ 顯示全部 ${stats.all.length} 個號碼`}
              </button>
            )}
            <div className="jdbnum-cap" style={{ marginTop: 18 }}>
              <span>📊 區間分佈（每 10 個號碼一段）</span>
            </div>
            <div className="jdbrange-head">
              <span>區間</span><span>主號</span><span>特別號</span><span>合計</span><span>期望</span><span>差距</span>
            </div>
            {stats.ranges.map(rg => {
              const d = rg.total - rg.exp;
              return (
                <div className="jdbrange-row" key={rg.a}>
                  <span className="jdbrange-lbl">{rg.a}-{rg.b}<em>{rg.size} 個</em></span>
                  <span>{rg.main}</span>
                  <span>{rg.sp}</span>
                  <span className="jdbnum-total">
                    {rg.total}
                    <span className="jdbnum-bar" style={{ width: `${Math.round(rg.total / (stats.ranges[0]?.total || 1) * 100)}%` }} />
                  </span>
                  <span className="jdbrange-exp">{rg.exp.toFixed(0)}</span>
                  <span className={d >= 0 ? 'jdbrange-up' : 'jdbrange-down'}>
                    {d >= 0 ? '+' : '−'}{Math.abs(d).toFixed(0)}
                  </span>
                </div>
              );
            })}
            <Note label="📖 點睇呢個表？">
              151 期金多寶每一期開 7 個波（6 主號 + 1 特別號），所以每個號碼嘅期望開出次數 = 151 × 7 ÷ 49 ≈ <b>21.6 次</b>。全 49 個號碼嘅分佈經卡方檢定（χ²=42.7，自由度 48）完全符合隨機 —「邊個開最多」只係隨機波動，唔代表下期會開。🎯 標住嘅係 AI 15 字推薦（由金多寶歷史 + 波色／單雙／大細平衡揀出），所以會有「更旺但冇入選」嘅情況，例如 10 號（28 次並列第一）因為要做特別號（7 次）先冇入。區間分佈同理：五段最大差距 ±19 個波，卡方檢定 χ²=3.88（自由度 4，p≈0.42）→ 亦係隨機波動，冇一段特別旺。
            </Note>
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
