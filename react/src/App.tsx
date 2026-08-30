import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard, usePrediction, useHistory } from './hooks/useMarksix';
import { predictStatic, countConsec } from './lib/analyzer';
import type { Draw } from './lib/analyzer';
import { waveColor, waveLabel, waveCombo } from './lib/colors';
import { WaveBall } from './components/WaveBall';
import { Ball } from './components/Ball';
import { Card } from './components/Card';
import { BarChart } from './components/BarChart';
import { Hero } from './components/Hero';
import { HistoryTable } from './components/HistoryTable';
import { Heatmap } from './components/Heatmap';
import { SmartGenerator } from './components/SmartGenerator';
import { TicketChecker } from './components/TicketChecker';
import { TrendAnalysis } from './components/TrendAnalysis';
import { StatsPredict } from './components/StatsPredict';
import { Countdown } from './components/Countdown';
import { HitRate } from './components/HitRate';
import { PayoutTrend } from './components/PayoutTrend';
import { TrendChart } from './components/TrendChart';
import { BetCalc } from './components/BetCalc';
import { DanTuoCompare } from './components/DanTuoCompare';
import { PredictLab } from './components/PredictLab';
import { ColorAnalysis } from './components/ColorAnalysis';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

type Tab = 'dashboard' | 'tongji' | 'colors' | 'history' | 'predict' | 'statspredict' | 'predictlab' | 'trend' | 'payout' | 'generator' | 'betcalc' | 'dantuocmp' | 'checker';

// ── 統計總覽 (跟 lottery.hk tongji 頁面) ──
function StatsTable({ title, icon, headers, rows, renderRow }: {
  title: string; icon: string; headers: string[];
  rows: unknown[]; renderRow: (r: any) => React.ReactNode;
}) {
  return (
    <Card title={title} icon={icon}>
      <div className="tongji-table">
        <div className="tongji-head" data-cols={headers.length}>{headers.map(h => <span key={h}>{h}</span>)}</div>
        {rows.map((r, i) => <div className="tongji-row" data-cols={headers.length} key={i}>{renderRow(r)}</div>)}
      </div>
    </Card>
  );
}

function ComboBalls({ nums }: { nums: string }) {
  const parts = nums.split(',').map(Number);
  return <span className="hist-balls">{parts.map(n => <Ball key={n} n={n} cls="red" />)}</span>;
}

function TongjiView({ data }: { data: NonNullable<ReturnType<typeof useDashboard>['data']> }) {
  const daysMap = new Map((data.days_ago || []).map(x => [x.num, x.days]));
  const seenMap = new Map((data.last_seen || []).map(x => [x.num, x.date]));
  const allFreq = [...data.freq_top, ...data.freq_bottom].filter((x, i, a) => a.findIndex(y => y.num === x.num) === i);

  // 最長時間未攪出 (按 days 排序)
  const overdue = [...(data.days_ago || [])].sort((a, b) => b.days - a.days).slice(0, 10);
  // 最不常見 (由 freq_bottom, 按 count 升序)
  const rare = [...data.freq_bottom].sort((a, b) => a.count - b.count).slice(0, 10);

  return (
    <div className="grid tongji-grid">
      <StatsTable title="🔥 主號碼頻率" icon="🔥" headers={['號碼', '頻率', '天前', '最後攪珠']}
        rows={allFreq.slice(0, 10)}
        renderRow={r => (<>
          <span className="tongji-num"><Ball n={r.num} cls="red" /></span>
          <span className="tongji-count">{r.count}</span>
          <span className="tongji-extra">{daysMap.get(r.num) ?? '—'}</span>
          <span className="tongji-date">{seenMap.get(r.num) || '—'}</span>
        </>)} />

      <StatsTable title="⭐ 特別號碼頻率" icon="⭐" headers={['號碼', '頻率', '天前', '最後攪珠']}
        rows={data.special_top.slice(0, 10)}
        renderRow={r => (<>
          <span className="tongji-num"><Ball n={r.num} cls="sp" /></span>
          <span className="tongji-count">{r.count}</span>
          <span className="tongji-extra">{daysMap.get(r.num) ?? '—'}</span>
          <span className="tongji-date">{seenMap.get(r.num) || '—'}</span>
        </>)} />

      <StatsTable title="⏳ 最長時間未攪出" icon="⏳" headers={['號碼', '天前', '最後攪珠']}
        rows={overdue}
        renderRow={r => (<>
          <span className="tongji-num"><Ball n={r.num} cls="blue" /></span>
          <span className="tongji-count">{r.days >= 9999 ? '從未出過' : `${r.days}日前`}</span>
          <span className="tongji-date">{seenMap.get(r.num) || '—'}</span>
        </>)} />

      <StatsTable title="🧊 最不常見的號碼" icon="🧊" headers={['號碼', '頻率']}
        rows={rare}
        renderRow={r => (<>
          <span className="tongji-num"><Ball n={r.num} cls="blue" /></span>
          <span className="tongji-count">{r.count}</span>
        </>)} />

      <StatsTable title="🤝 最常見的兩個號碼" icon="🤝" headers={['號碼', '頻率']}
        rows={data.combo2 || []}
        renderRow={r => (<>
          <span className="tongji-num"><ComboBalls nums={r.nums} /></span>
          <span className="tongji-count">{r.count}</span>
        </>)} />

      <StatsTable title="🔗 最多的二連號" icon="🔗" headers={['號碼', '頻率']}
        rows={data.consec2 || []}
        renderRow={r => (<>
          <span className="tongji-num"><ComboBalls nums={r.nums} /></span>
          <span className="tongji-count">{r.count}</span>
        </>)} />

      <StatsTable title="🎯 最常見的三個號碼" icon="🎯" headers={['號碼', '頻率']}
        rows={data.combo3 || []}
        renderRow={r => (<>
          <span className="tongji-num"><ComboBalls nums={r.nums} /></span>
          <span className="tongji-count">{r.count}</span>
        </>)} />

      <StatsTable title="📶 最常見的三連號" icon="📶" headers={['號碼', '頻率']}
        rows={data.consec3 || []}
        renderRow={r => (<>
          <span className="tongji-num"><ComboBalls nums={r.nums} /></span>
          <span className="tongji-count">{r.count}</span>
        </>)} />
    </div>
  );
}

function DashboardView({ data, history, onGoPredict }: { data: ReturnType<typeof useDashboard>['data']; history: Draw[]; onGoPredict: () => void }) {
  if (!data) return null;
  // 7 字主打 (穩定核心, 冇 jitter — 每日數據更新先會變)
  // ⚠️ main6 用 reasons top6 (AI 優先次序), 唔係 main10.slice(0,6) — 兩者排序唔同
  const top7 = useMemo(() => {
    const p = predictStatic(data, 0);
    const main6 = p.reasons.slice(0, 6).map(r => r.num).sort((a, b) => a - b);
    return { main6, special: p.special, target: p.target_draw, reasons: p.reasons.slice(0, 6) };
  }, [data]);
  return (
    <>
      <Hero data={data} />
      <div className="grid">
        <Card title={`🎯 AI 7 字主打（目標 ${top7.target}）`} icon="🎯">
          <div className="hero-balls dashboard-7balls">
            {top7.main6.map(n => <WaveBall key={n} n={n} />)}
            <span className="plus">+</span>
            <WaveBall n={top7.special} special />
          </div>
          <div className="hero-meta">
            <span>🎨 波色：{waveCombo(top7.main6)} · 特別號 {waveLabel(waveColor(top7.special))}波</span>
          </div>
          <div className="reason-list dashboard-7reasons">
            {top7.reasons.map(r => (
              <div className="reason-item" key={r.num}>
                <WaveBall n={r.num} />
                <span className="reason-why"><b className="reason-wave">{waveLabel(waveColor(r.num))}</b> · {r.why}</span>
              </div>
            ))}
          </div>
          <button className="gen-btn" onClick={onGoPredict}>🎯 去 AI 推薦睇 7 字主打 + 命中率 →</button>
        </Card>
        <Card title="📅 最近 10 期" icon="📅">
          <div className="recent-list">
            {history.slice(0, 10).map(d => (
              <div className="recent-row" key={d.draw}>
                <span className="hist-draw">{d.draw}</span>
                <span className="hist-date">{d.date}</span>
                <span className="hist-balls">
                  {d.main.map(n => <Ball key={n} n={n} cls="red" />)}
                  <span className="plus">+</span>
                  <Ball n={d.special} cls="sp" />
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="🔥 最熱號碼" icon="🔥">
          <div className="balls">{data.freq_top.slice(0, 8).map(x => <Ball key={x.num} n={x.num} cls="red" />)}</div>
          <BarChart data={data.freq_top.slice(0, 8).map(x => [String(x.num), x.count])} color="#d70015" />
        </Card>
        <Card title="🧊 最冷號碼" icon="🧊">
          <div className="balls">{data.freq_bottom.slice(0, 8).map(x => <Ball key={x.num} n={x.num} cls="blue" />)}</div>
          <BarChart data={data.freq_bottom.slice(0, 8).map(x => [String(x.num), x.count])} color="#0040dd" />
        </Card>
        <Card title="⭐ 特別號最旺" icon="⭐">
          <div className="balls">
            {data.special_top.slice(0, 6).map(x => (
              <span key={x.num} className="sp-item"><Ball n={x.num} cls="sp" /><small>{x.count}</small></span>
            ))}
          </div>
        </Card>
        <Card title="🤝 最強共現對" icon="🤝">
          <div className="co-list">
            {data.cooccur.slice(0, 8).map(x => {
              const [a, b] = x.pair.split(',').map(Number);
              return <div key={x.pair} className="co-item"><Ball n={a} cls="red" /><Ball n={b} cls="red" /><span>{x.count}次</span></div>;
            })}
          </div>
        </Card>
        <Card title="🗺️ 號碼熱力圖（全部 {data.total_draws} 期）" icon="🗺️">
          <Heatmap data={data.freq_all || data.freq_top} />
        </Card>
        <Card title="📊 區間分佈" icon="📊">
          <BarChart data={data.zones} color="#b25000" />
        </Card>
      </div>
    </>
  );
}

function PredictView({ data, dash, reroll, onReroll }: { data: ReturnType<typeof usePrediction>['data']; dash: ReturnType<typeof useDashboard>['data']; reroll: number; onReroll: () => void }) {
  const [count, setCount] = useState<10 | 15>(10);  // 10 個字 / 15 個字
  // 每次 reroll 用前端引擎 + 隨機抖動重新生成 (API mode 都用 jitter 版)
  // seed=reroll → 抖動可重現, 命中率 walk-forward 用返同一個 seed 對應顯示
  const gen = useMemo(() => {
    if (!dash) return data;
    // 用 static 引擎 + jitter 生成「次次唔同」版本
    return predictStatic(dash, 12, reroll);
  }, [dash, data, reroll]);
  const shown = gen || data;
  // Hooks 必須喺 early return 之前 (Rules of Hooks)
  const nums = (shown && count === 15 ? shown.main15 : shown?.main10) || [];
  const tickets = count === 15 ? 5005 : 210;   // C(15,6)=5005, C(10,6)=210
  const cost = tickets * 10;

  // AI 膽拖: 前 3 個做膽, 其餘做拖 (reasons 依 AI 優先次序, 頭 3 個 = 最高分)
  const [dtBankers, dtTrotters] = useMemo(() => {
    const main = [...nums].sort((a, b) => a - b);
    const top3 = (shown?.reasons?.length ? shown.reasons.slice(0, 3).map(r => r.num) : main.slice(0, 3));
    const bankers = main.filter(n => top3.includes(n));
    const trotters = main.filter(n => !top3.includes(n));
    return [bankers, trotters];
  }, [nums, shown]);
  const dtTickets = useMemo(() => {
    const r = dtBankers.length, n = dtTrotters.length;
    if (r === 0 || r + n < 6) return 0;
    let t = 1;
    for (let i = 0; i < 6 - r; i++) t = t * (n - i) / (i + 1);
    return Math.round(t);
  }, [dtBankers, dtTrotters]);
  if (!shown) return null;
  // 7字主打 = AI 優先次序頭6個 (reasons top6) — 同下面「點解揀」列表頭6個一致
  // ⚠️ 唔可以用 main10.slice(0,6): main10 排序過, 同 AI 優先次序唔同, 會同 reasons 對唔上
  const main6 = useMemo(() => {
    if (!shown) return [];
    const top = shown.reasons.slice(0, 6).map(r => r.num);
    return top.sort((a, b) => a - b);
  }, [shown]);
  return (
    <>
      <section className="hero predict-hero">
        <div className="hero-draw">🎯 AI 大數據推薦</div>
        <div className="hero-date">目標: {shown.target_draw} · 基於 {shown.based_on} · 🎨 波色平衡（歷史 ~紅35/藍33/綠33%）</div>
        <div className="hero-balls">
          {main6.map(n => <WaveBall key={n} n={n} size="lg" />)}
          <span className="plus">+</span>
          <WaveBall n={shown.special} size="lg" special />
        </div>
        <div className="hero-meta">
          <span>🎯 7 字主打：6 主號 + 1 特別號</span>
          <span>🎨 波色：{waveCombo(main6)} · 特別號 {waveLabel(waveColor(shown.special))}波</span>
          <span>⭐ 特別號建議：{shown.special_reason}</span>
        </div>
        <div className="hero-meta">
          <span>💡 進階：{count} 個字複式 = {tickets.toLocaleString()}注 = ${cost.toLocaleString()}</span>
          <span>🎯 每注中頭獎機率固定 1/13,983,816（每期獨立，冇方法提高）</span>
        </div>
        <div className="hero-meta">
          {(() => {
            const sorted = [...main6].sort((a, b) => a - b);
            const odd = main6.filter(n => n % 2 === 1).length;
            const small = main6.filter(n => n <= 24).length;
            const cons = countConsec(sorted);
            return <span>⚖️ 結構：{odd}奇{6 - odd}偶 · {small}細{6 - small}大 · 連號{cons}對（歷史：77% 開2-4奇 · 81% 2-4細 · 46% 含連號）</span>;
          })()}
        </div>
      </section>
      <div className="stats-actions" style={{ margin: '-8px auto 8px', justifyContent: 'center' }}>
        <button className="gen-btn" onClick={() => onReroll()}>🎲 重新生成（次次唔同）</button>
        <span className="stats-hint">已生成 {reroll + 1} 次</span>
        <div className="dim-tabs" style={{ marginLeft: 8 }}>
          <button className={count === 10 ? 'dim-btn active' : 'dim-btn'} onClick={() => setCount(10)}>10 個字 ($2,100)</button>
          <button className={count === 15 ? 'dim-btn active' : 'dim-btn'} onClick={() => setCount(15)}>15 個字 ($50,050)</button>
        </div>
      </div>
      <div className="gen-note" style={{ margin: '0 auto 10px', maxWidth: 720, textAlign: 'center' }}>
        🎯 上面係 <b>7 字主打</b>（6 主號 + 1 特別號，$10 一注）— 波色已平衡。下面嘅 reasons 頭 6 個就係主打嘅主號碼；想買大啲就揀 10 / 15 個字複式。
      </div>

      {/* AI 膽拖方案 */}
      {dtBankers.length > 0 && dtTickets > 0 && (
        <Card title="🎱 AI 膽拖方案（AI 優先次序頭 3 個做膽）" icon="🎱">
          <div className="dantuo-selected">
            <span className="check-label">🎯 膽（{dtBankers.length} 個）：</span>
            <span className="dantuo-chips">{dtBankers.map(n => <Ball key={n} n={n} cls="sp" />)}</span>
          </div>
          <div className="dantuo-selected">
            <span className="check-label">🔗 拖（{dtTrotters.length} 個）：</span>
            <span className="dantuo-chips">{dtTrotters.map(n => <Ball key={n} n={n} cls="blue" />)}</span>
          </div>
          <div className="combo-result">
            <div className="combo-row"><span>📝 {dtBankers.length} 膽拖 {dtTrotters.length} 尾</span><b>{dtTickets.toLocaleString()} 注</b></div>
            <div className="combo-row"><span>💰 成本</span><b>${(dtTickets * 10).toLocaleString()}</b></div>
            <div className="combo-row"><span>💡 慳咗</span><b>${(cost - dtTickets * 10).toLocaleString()}（vs 複式）</b></div>
          </div>
          <div className="gen-note">
            💡 膽拖慳好多錢：{count} 個字複式要 ${cost.toLocaleString()}，但 {dtBankers.length} 膽拖 {dtTrotters.length} 尾只需 ${(dtTickets * 10).toLocaleString()}。代價係「膽要中」先有高獎 — 適合有信心 AI 揀嘅 top 3。
          </div>
        </Card>
      )}

      <Card title={`🧠 點解揀呢 ${count} 個號碼（大數據分析）`} icon="🧠">
        <div className="reason-list">
          {shown.reasons.slice(0, count).map(r => (
            <div className="reason-item" key={r.num}>
              <WaveBall n={r.num} />
              <span className="reason-why"><b className="reason-wave">{waveLabel(waveColor(r.num))}</b> · {r.why}</span>
            </div>
          ))}
        </div>
        {count > 6 && <div className="gen-note">💡 頭 6 個 = 7 字主打主號碼；其餘係 10/15 字進階組合嘅號碼。</div>}
      </Card>
    </>
  );
}

function MainApp() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [predictReroll, setPredictReroll] = useState(0);  // AI推薦 reroll seed (命中率共用, 保持一致)
  const [dark, setDark] = useState<boolean>(() => {
    // 初始: 跟 localStorage, 冇就跟系統偏好
    const saved = localStorage.getItem('ms-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const dashboard = useDashboard();
  const prediction = usePrediction();
  const history = useHistory();

  // 黑夜模式切換 → 掛 data-theme attribute + 存偏好
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ms-theme', dark ? 'dark' : 'light');
  }, [dark]);

  if (dashboard.isLoading) return (
    <div className="loading">
      <div className="spinner" />
      <div>🔄 載入大數據…</div>
    </div>
  );
  if (dashboard.isError) return <div className="loading">❌ 數據載入失敗</div>;
  const data = dashboard.data!;
  const latestDraw = history.data?.[0];

  const nav = (id: Tab, label: string) => (
    <button className={tab === id ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab(id)}>{label}</button>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">🎱 <span>六合彩大數據分析</span></div>
        <nav className="nav">
          {nav('dashboard', '📊 儀表板')}
          {nav('tongji', '📋 統計總覽')}
          {nav('colors', '🎨 波色分析')}
          {nav('history', '📅 開獎記錄')}
          {nav('predict', '🎯 AI 推薦')}
          {nav('statspredict', '📐 統計預測')}
          {nav('predictlab', '🧪 預測實驗室')}
          {nav('trend', '📈 走勢')}
          {nav('payout', '💰 派彩走勢')}
          {nav('generator', '🎲 選號器')}
          {nav('betcalc', '🧮 投注計算')}
          {nav('dantuocmp', '🎯 膽拖比較')}
          {nav('checker', '🧾 核對')}
        </nav>
        <button className="theme-toggle" onClick={() => setDark(d => !d)} aria-label="切換深色模式" title={dark ? '轉日間模式' : '轉黑夜模式'}>
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      <Countdown />

      {tab === 'dashboard' && <DashboardView data={data} history={history.data || []} onGoPredict={() => setTab('predict')} />}

      {tab === 'tongji' && <TongjiView data={data} />}

      {tab === 'colors' && <ColorAnalysis history={history.data || []} />}

      {tab === 'history' && (
        <Card title="📅 最近開獎記錄" icon="📅">
          <HistoryTable draws={history.data || []} />
        </Card>
      )}

      {tab === 'generator' && (
        <SmartGenerator lastNumbers={data.last_numbers} history={history.data || []} />
      )}

      {tab === 'statspredict' && (
        <StatsPredict data={data} history={history.data || []} />
      )}

      {tab === 'checker' && (
        <TicketChecker latestDraw={latestDraw} />
      )}

      {tab === 'trend' && (
        <div className="grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <TrendChart history={history.data || []} />
            <div style={{ marginTop: 16 }}>
              <TrendAnalysis data={data} />
            </div>
          </div>
        </div>
      )}

      {tab === 'payout' && <PayoutTrend />}

      {tab === 'predictlab' && <PredictLab data={data} history={history.data || []} />}

      {tab === 'betcalc' && (
        <BetCalc />
      )}

      {tab === 'dantuocmp' && (
        <div className="gen-wrap">
          <DanTuoCompare data={data} />
        </div>
      )}

      {tab === 'predict' && (
        <>
          <PredictView data={prediction.data} dash={data} reroll={predictReroll} onReroll={() => setPredictReroll(r => r + 1)} />
          <HitRate data={data} history={history.data || []} seed={predictReroll} />
        </>
      )}

      <footer>
        <p>數據來源 lottery.hk · GitHub Actions 每日自動更新（開獎日 21:35 即時）· 數據截至 {data.last_draw}（{data.last_date}）</p>
        <p className="disclaimer">⚠️ 免責聲明：本網站嘅數據分析僅供參考，絕不保證中獎。博彩有風險，切勿沉迷賭博。未滿18歲人士不得參與博彩。如有需要，請致電平和基金熱線 1834 633。</p>
      </footer>
    </div>
  );
}

export default function App() {
  // Register PWA service worker (production only)
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}
