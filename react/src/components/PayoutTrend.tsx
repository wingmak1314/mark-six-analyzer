// 派彩走勢 — 每期頭獎/二獎每注派彩 + 總投注額 (HKJC 官方派彩數據)
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card } from './Card';
import { LineChart } from './LineChart';

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

  if (isLoading) return <div className="loading"><div className="spinner" /><div>🔄 載入派彩數據…</div></div>;
  if (isError || !data) return <div className="loading">⚠️ 派彩數據載入失敗</div>;
  if (!data.length) return <div className="loading">⚠️ 未有派彩數據（每日開獎後自動更新）</div>;

  const latest = [...data].sort((a, b) => b.draw.localeCompare(a.draw))[0];  // 最新一期
  const recent = [...data].sort((a, b) => b.draw.localeCompare(a.draw)).slice(0, 15);  // 最近 15 期表格

  const firstSeries = list.map(p => ({ label: p.draw, value: p.first ?? 0 }));
  const secondSeries = list.map(p => ({ label: p.draw, value: p.second ?? 0 }));
  const turnoverSeries = list.map(p => ({ label: p.draw, value: p.turnover ?? 0 }));

  return (
    <div className="gen-wrap">
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
