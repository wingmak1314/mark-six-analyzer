// 隨機性檢定（輕量版 NIST SP 800-22）— 用硬統計驗證開獎序列係咪真隨機
// 誠實結果: 正常應該全部「符合隨機」→ 證明冇 edge, 唔好神化任何預測
import { useMemo } from 'react';
import { Card } from './Card';
import { chi2PValue, runsPValue } from '../lib/quant';
import type { Draw } from '../lib/analyzer';

interface Props {
  history: Draw[];
}

function fmtP(p: number): string {
  if (Number.isNaN(p)) return '—';
  return p < 0.001 ? '<0.001' : p.toFixed(3);
}

function verdict(p: number): { text: string; cls: string } {
  if (Number.isNaN(p)) return { text: '樣本不足', cls: 'hitrate-neutral' };
  if (p > 0.05) return { text: '✅ 符合隨機', cls: 'hitrate-good' };
  if (p > 0.01) return { text: '⚠️ 邊緣', cls: 'hitrate-neutral' };
  return { text: '🔴 偏離隨機', cls: 'hitrate-miss' };
}

export function RandomnessAuditor({ history }: Props) {
  const results = useMemo(() => {
    const N = history.length;
    // 1. 主號碼頻率 χ² (每號期望 N*6/49)
    const mainCounts = Array.from({ length: 49 }, () => 0);
    const spCounts = Array.from({ length: 49 }, () => 0);
    for (const d of history) {
      for (const n of d.main) mainCounts[n - 1]++;
      spCounts[d.special - 1]++;
    }
    const expMain = N * 6 / 49;
    let chiMain = 0;
    for (const c of mainCounts) chiMain += (c - expMain) ** 2 / expMain;
    const pMain = chi2PValue(chiMain, 48);

    const expSp = N / 49;
    let chiSp = 0;
    for (const c of spCounts) chiSp += (c - expSp) ** 2 / expSp;
    const pSp = chi2PValue(chiSp, 48);

    // 2. Runs 檢定: 特別號「大細」(>24) + 「單雙」序列
    const bigSeq = history.map(d => d.special > 24);
    const oddSeq = history.map(d => d.special % 2 === 1);
    const pRunsBig = runsPValue(bigSeq);
    const pRunsOdd = runsPValue(oddSeq);

    // 3. 主號碼總和 runs (奇偶主流檢定)
    const mainOddSeq = history.map(d => d.main.filter(n => n % 2 === 1).length >= 3);
    const pRunsMainOdd = runsPValue(mainOddSeq);

    return [
      { name: '主號碼頻率 χ²（每號出現次數均勻）', p: pMain, df: 48, detail: `χ²=${chiMain.toFixed(1)}` },
      { name: '特別號頻率 χ²（每號做特別號均勻）', p: pSp, df: 48, detail: `χ²=${chiSp.toFixed(1)}` },
      { name: '特別號大細 Runs（>24 連續性）', p: pRunsBig, df: 0, detail: '段數分佈' },
      { name: '特別號單雙 Runs', p: pRunsOdd, df: 0, detail: '段數分佈' },
      { name: '主號碼奇偶主流 Runs', p: pRunsMainOdd, df: 0, detail: '段數分佈' },
    ];
  }, [history]);

  return (
    <Card title="🔬 隨機性檢定（NIST 輕量版）— 開獎序列真係隨機？" icon="🔬">
      <div className="hitrate-table">
        {results.map(r => {
          const v = verdict(r.p);
          return (
            <div className="hitrate-row" key={r.name}>
              <span className="reason-why" style={{ flex: 1 }}>{r.name}</span>
              <span className="hitrate-count">p={fmtP(r.p)}{r.df ? ` · ${r.detail}` : ''}</span>
              <span className={v.cls}>{v.text}</span>
            </div>
          );
        })}
      </div>
      <div className="gen-note">
        💡 <b>點解要檢定：</b>呢 5 項測試（頻率均勻性 + 大細/單雙連貫性）係密碼學隨機性檢定嘅輕量版。如果全部 p&gt;0.05 = <b>符合純隨機</b>，即係：機械攪珠機冇明顯物理偏差，任何「冷熱/走勢/波色」預測都冇真實 edge — 呢個係數據話你知嘅真相。
        <br />🔴 如果某項 p&lt;0.01（偏離隨機）先值得深究 — 但目前歷史數據（{history.length} 期）正常應該全部符合隨機。
      </div>
    </Card>
  );
}
