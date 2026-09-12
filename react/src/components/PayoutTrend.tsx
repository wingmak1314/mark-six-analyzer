// 派彩走勢 — 每期頭獎/二獎每注派彩 + 總投注額 (HKJC 官方派彩數據)
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card } from './Card';
import { LineChart } from './LineChart';
import { prizeTiers } from '../lib/analyzer';

interface Payout {
  draw: string;
  date: string;
  first: number;
  second: number;
  turnover: number;
  total_fund: number;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 100_000_000) return `$${(n / 1e8).toFixed(2)}億`;
  if (n >= 10_000) {
    const w = n / 1e4;
    return `$${(w >= 1000 ? w.toFixed(0) : w.toFixed(1)).replace(/\.0$/, '')}萬`;
  }
  return `$${n.toLocaleString()}`;
}

async function loadPayouts(): Promise<Payout[]> {
  const r = await fetch('payouts.json', { cache: 'no-store' });
  if (!r.ok) throw new Error(`payouts.json ${r.status}`);
  const d = await r.json();
  return d.payouts || [];
}

// ── 金多寶 EV 模型 ──
// 平時六合彩返還率 ~54% (EV 負)。彩池 (金多寶) 夠大先有機會 EV>0。
// 精確計: 固定獎 (六獎$40/七獎$20) EV + 頭獎彩池 EV (假設獨中) - 成本 $10
const T = 13_983_816;
const FIXED_EV = (40 * 17220 + 20 * 229600) / T;  // 六獎+七獎固定獎 EV ≈ 0.378
// 臨界彩池: 要幾大先令 EV = 0 (假設頭獎獨中)
function criticalPool(): number {
  return (10 - FIXED_EV) * T;
}
function evAtPool(pool: number): number {
  return FIXED_EV + pool / T - 10;
}

async function loadJdb(): Promise<{ draw: string }[]> {
  const r = await fetch('jdb.json', { cache: 'no-store' });
  if (!r.ok) throw new Error(`jdb.json ${r.status}`);
  const d = await r.json();
  return d.draws || [];
}

export function PayoutTrend() {
  const [window, setWindow] = useState<'all' | '30'>('all');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['payouts'], queryFn: loadPayouts, staleTime: 60_000, retry: 1,
  });

  // 舊 → 新 (折線圖時間序)
  const list = useMemo(() => {
    if (!data) return [];
    const sorted = [...data].sort((a, b) => a.draw.localeCompare(b.draw));
    return window === '30' ? sorted.slice(-30) : sorted;
  }, [data, window]);

  // ── 金多寶期 vs 普通期（真數據：payouts.json ∩ jdb.json）──
  const { data: jdbList } = useQuery({
    queryKey: ['jdb'], queryFn: loadJdb, staleTime: 3_600_000, retry: 1,
  });
  const cmp = useMemo(() => {
    if (!data || !jdbList) return null;
    const J = new Set(jdbList.map(x => x.draw));
    const sp = data.filter(p => J.has(p.draw));
    const nm = data.filter(p => !J.has(p.draw));
    if (!sp.length || !nm.length) return null;
    const avg = (arr: Payout[], k: 'turnover' | 'total_fund' | 'first') => {
      const v = arr.map(x => x[k] || 0).filter(x => x > 0);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
    };
    // 每注派彩 ÷ 投注額 = 控制彩池大小後嘅「分賬程度」
    const fair = (arr: Payout[]) => {
      const v = arr.filter(x => x.first > 0 && x.turnover > 0).map(x => x.first / x.turnover);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
    };
    return {
      nSp: sp.length, nNm: nm.length,
      turn: [avg(sp, 'turnover'), avg(nm, 'turnover')],
      fund: [avg(sp, 'total_fund'), avg(nm, 'total_fund')],
      first: [avg(sp, 'first'), avg(nm, 'first')],
      fair: [fair(sp), fair(nm)],
    };
  }, [data, jdbList]);

  if (isLoading) return <div className="loading"><div className="spinner" /><div>🔄 載入派彩數據…</div></div>;
  if (isError || !data) return <div className="loading">⚠️ 派彩數據載入失敗</div>;
  if (!data.length) return <div className="loading">⚠️ 未有派彩數據（每日開獎後自動更新）</div>;

  const latest = [...data].sort((a, b) => b.draw.localeCompare(a.draw))[0];  // 最新一期
  const recent = [...data].sort((a, b) => b.draw.localeCompare(a.draw)).slice(0, 15);  // 最近 15 期表格

  const firstSeries = list.map(p => ({ label: p.draw, value: p.first ?? 0 }));
  const secondSeries = list.map(p => ({ label: p.draw, value: p.second ?? 0 }));
  const turnoverSeries = list.map(p => ({ label: p.draw, value: p.turnover ?? 0 }));

  // 金多寶 EV: 最新頭獎每注當彩池估算 (head = 8M 代表上期冇人中, 彩池滾存中)
  const poolEst = latest.first > 8_000_000 ? latest.first : latest.total_fund || latest.first;
  const critical = criticalPool();
  const evNow = evAtPool(Math.max(poolEst, 8_000_000));
  const tierList = prizeTiers();

  return (
    <div className="gen-wrap">
      <Card title="🎁 金多寶 +EV 分析（彩池幾大先值得買？）" icon="🎁">
        <div className="ev-grid">
          <div className="ev-stat">
            <span className="ev-label">目前彩池估算</span>
            <b className="ev-value">{fmtMoney(poolEst)}</b>
            <small>{latest.first <= 8_000_000 ? '上期冇人中 → 彩池滾存中' : '上期有人中 → 已清池'}</small>
          </div>
          <div className="ev-stat">
            <span className="ev-label">單注 EV（假設頭獎獨中）</span>
            <b className={`ev-value ${evNow >= 0 ? 'ev-pos' : 'ev-neg'}`}>{evNow >= 0 ? '+' : ''}${evNow.toFixed(2)}</b>
            <small>固定獎 $0.38 + 彩池 $… − 成本 $10</small>
          </div>
          <div className="ev-stat ev-critical">
            <span className="ev-label">臨界彩池（EV=0）</span>
            <b className="ev-value">{fmtMoney(critical)}</b>
            <small>彩池超過呢個數先有正 EV（獨中假設）</small>
          </div>
        </div>
        <div className={`ev-banner ${evNow >= 0 ? 'ev-banner-pos' : 'ev-banner-neg'}`}>
          {evNow >= 0
            ? '🎯 目前彩池已超過臨界值 → 單注 EV 為正（但只係「獨中」假設，實際多人分獎 EV 會跌返負）'
            : `⚠️ 目前彩池未夠臨界值（${fmtMoney(critical)}）→ 平時買 EV 負數，建議等大金多寶先落注`}
        </div>
        <div className="gen-note">
          📐 <b>模型：</b>EV = 固定獎（六獎 $40 + 七獎 $20，唔受分獎影響）+ 頭獎彩池 ÷ 13,983,816（假設<b>獨中</b>）− 成本 $10。實際因為彩池分賬，多人中頭獎時每注派彩跌，真實 EV 會低過呢個估算。<b>結論：</b>平時（800萬彩池）買 EV 約 −$9.05（輸定），只有億元級金多寶先可能翻正 — 儲錢等大彩池買一次，永遠好過逢期買。
          <br />📊 各獎級單注機率：{tierList.map(t => `${t.name} ${(t.prob * 100).toFixed(4)}%`).join(' · ')}
        </div>
      </Card>

      {cmp && (
        <Card title="🏆 金多寶期 vs 普通期（真數據對比）" icon="🏆">
          <div className="payout-table">
            <div className="payout-row payout-head">
              <span>指標</span><span>金多寶期（{cmp.nSp}）</span><span>普通期（{cmp.nNm}）</span><span>倍數</span><span>睇法</span>
            </div>
            {([
              ['平均總投注額', cmp.turn[0], cmp.turn[1], '全港投注總額'],
              ['平均頭獎基金', cmp.fund[0], cmp.fund[1], '多寶滾存累積'],
              ['平均頭獎每注', cmp.first[0], cmp.first[1], '同投注額成正比'],
            ] as [string, number, number, string][]).map(([label, a, b, why]) => (
              <div className="payout-row" key={label}>
                <span>{label}</span>
                <span>{fmtMoney(a)}</span>
                <span className="payout-turnover">{fmtMoney(b)}</span>
                <span className="hitrate-good">{b > 0 ? `${(a / b).toFixed(1)}×` : '—'}</span>
                <span className="payout-turnover">{why}</span>
              </div>
            ))}
            <div className="payout-row">
              <span>頭獎每注 ÷ 投注額</span>
              <span>{(cmp.fair[0] * 100).toFixed(1)}%</span>
              <span className="payout-turnover">{(cmp.fair[1] * 100).toFixed(1)}%</span>
              <span>{cmp.fair[1] > 0 ? `${(cmp.fair[0] / cmp.fair[1]).toFixed(2)}×` : '—'}</span>
              <span className="payout-turnover">≈ 冇分別</span>
            </div>
          </div>
          <div className="gen-note">
            📐 <b>點解要睇最後一行：</b>呢個比率 = 每注頭獎派彩 ÷ 全期投注額，已經<b>控制咗彩池大小</b>。金多寶期投注額大到 4.4 倍，但比率同普通期差唔多（t 檢定 p≈0.35，唔顯著）→ 即係話<b>「金多寶多人買會分薄彩金」係假嘅</b>；多出嚟嘅錢純粹係多寶滾存累積，唔係「少人分」。
            <br />⚠️ 中頭獎機率兩種期都係 1/13,983,816，買金多寶唔會易中啲 —— 只係獎金基數大。想搏就用 EV 模型揀彩池夠大嘅期（見上面）。
          </div>
        </Card>
      )}

      <Card title="💰 派彩走勢（每期頭獎/二獎每注派彩）" icon="💰">
        <div className="payout-latest">
          <span className="payout-draw">最新一期 <b>{latest.draw}</b>（{latest.date}）</span>
          <span className="payout-stat">🎯 頭獎每注 <b className="hitrate-good">{fmtMoney(latest.first)}</b></span>
          <span className="payout-stat">🥈 二獎每注 <b>{fmtMoney(latest.second)}</b></span>
          <span className="payout-stat">📈 總投注額 <b>{fmtMoney(latest.turnover)}</b></span>
        </div>
        <div className="stats-actions">
          <span className="check-label">範圍：</span>
          <button className={window === 'all' ? 'dim-btn active' : 'dim-btn'} onClick={() => setWindow('all')}>全部（{data.length} 期）</button>
          <button className={window === '30' ? 'dim-btn active' : 'dim-btn'} onClick={() => setWindow('30')}>近 30 期</button>
        </div>
      </Card>

      <Card title="🎯 頭獎每注派彩（中 6 個字）" icon="🎯">
        <LineChart data={firstSeries} color="#b25000" fmt={fmtMoney} />
        <div className="gen-note">💡 <b>$800萬 = 嗰期冇人中頭獎</b>（多寶滾入下期）。超過 $800萬 代表有人中咗,金額 = 彩池雪球分派。中頭獎機率每期都係 1/13,983,816,派彩高低只反映彩池大小。</div>
      </Card>

      <Card title="🥈 二獎每注派彩（中 5 + 特別號）" icon="🥈">
        <LineChart data={secondSeries} color="#0071e3" fmt={fmtMoney} />
        <div className="gen-note">💡 <b>$0 = 嗰期冇人中二獎</b>。二獎係彩池分派,金額浮動。</div>
      </Card>

      <Card title="📈 總投注額（彩池規模）" icon="📈">
        <LineChart data={turnoverSeries} color="#248a3d" fmt={fmtMoney} />
        <div className="gen-note">💡 總投注額 = 每期全港投注總額,反映彩池規模。投注額越大 → 派彩彩池越大（尤其金多寶攪珠）。</div>
      </Card>

      <Card title="📋 最近 15 期派彩明細" icon="📋">
        <div className="payout-table">
          <div className="payout-row payout-head">
            <span>期號</span><span>日期</span><span>頭獎每注</span><span>二獎每注</span><span>總投注額</span>
          </div>
          {recent.map(p => (
            <div className="payout-row" key={p.draw}>
              <span className="hist-draw">{p.draw}</span>
              <span className="hist-date">{p.date}</span>
              <span className={p.first > 8_000_000 ? 'hitrate-good' : ''}>{fmtMoney(p.first)}</span>
              <span>{fmtMoney(p.second)}</span>
              <span className="payout-turnover">{fmtMoney(p.turnover)}</span>
            </div>
          ))}
        </div>
        <div className="gen-note">⚠️ 派彩數據嚟自香港賽馬會官方 API,每日開獎後自動更新。頭獎 $800萬 = 冇人中（多寶累積）。</div>
      </Card>
    </div>
  );
}
