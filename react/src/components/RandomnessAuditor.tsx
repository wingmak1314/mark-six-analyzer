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

    // 4. 共現對 χ² — 1,176 對號碼同期出現次數 (即「號碼親和力」/ GNN 圖嵌入嘅前提)
    const pc = new Int32Array(50 * 50);
    for (const d of history) {
      const m = [...d.main].sort((a, b) => a - b);
      for (let i = 0; i < m.length; i++)
        for (let j = i + 1; j < m.length; j++) pc[m[i] * 50 + m[j]]++;
    }
    const expPair = N * (178365 / 13983816);   // C(47,4)/C(49,6) — 任一對同期出現機率
    let chiPair = 0; let maxPair = 0; let maxPairKey = '';
    for (let a = 1; a <= 49; a++) {
      for (let b = a + 1; b <= 49; b++) {
        const c = pc[a * 50 + b];
        chiPair += (c - expPair) ** 2 / expPair;
        if (c > maxPair) { maxPair = c; maxPairKey = `${a}-${b}`; }
      }
    }
    const pPairTest = chi2PValue(chiPair, 1175);   // C(49,2)-1

    // 5. 攪珠日效應 χ² — 49 個號碼 × 7 個星期幾 (即「攪珠日輪換」/ 時間編碼嘅前提)
    const dayCount = Array.from({ length: 49 }, () => [0, 0, 0, 0, 0, 0, 0]);
    const dayDraws = [0, 0, 0, 0, 0, 0, 0];
    for (const d of history) {
      const [dd, mm, yy] = d.date.split('/').map(Number);
      const w = new Date(yy, mm - 1, dd).getDay();
      dayDraws[w]++;
      for (const n of d.main) dayCount[n - 1][w]++;
    }
    let chiDay = 0;
    for (let n = 0; n < 49; n++) {
      const row = dayCount[n].reduce((s, v) => s + v, 0);
      for (let w = 0; w < 7; w++) {
        const e = row * dayDraws[w] / N;
        if (e > 0) chiDay += (dayCount[n][w] - e) ** 2 / e;
      }
    }
    const pDayTest = chi2PValue(chiDay, 288);   // (49-1)×(7-1)

    return [
      { name: '主號碼頻率 χ²（每號出現次數均勻）', p: pMain, df: 48, detail: `χ²=${chiMain.toFixed(1)}` },
      { name: '特別號頻率 χ²（每號做特別號均勻）', p: pSp, df: 48, detail: `χ²=${chiSp.toFixed(1)}` },
      { name: '特別號大細 Runs（>24 連續性）', p: pRunsBig, df: 0, detail: '段數分佈' },
      { name: '特別號單雙 Runs', p: pRunsOdd, df: 0, detail: '段數分佈' },
      { name: '主號碼奇偶主流 Runs', p: pRunsMainOdd, df: 0, detail: '段數分佈' },
      { name: '號碼共現 χ²（1,176 對同期出現 — 「親和力」）', p: pPairTest, df: 1175, detail: `χ²=${chiPair.toFixed(0)} · 最強對 ${maxPairKey} 只 ${maxPair} 次` },
      { name: '攪珠日效應 χ²（49 號 × 星期幾）', p: pDayTest, df: 288, detail: `χ²=${chiDay.toFixed(1)}` },
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
        💡 <b>點解要檢定：</b>呢 7 項測試（頻率均勻性 + 大細/單雙連貫性 + 號碼共現 + 攪珠日）係密碼學隨機性檢定嘅輕量版。如果全部 p&gt;0.05 = <b>符合純隨機</b>，即係：機械攪珠機冇明顯物理偏差，任何「冷熱/走勢/波色」預測都冇真實 edge — 呢個係數據話你知嘅真相。
        <br />🧬 <b>共現 χ² 嘅意義：</b>如果 49 個號碼之間真係有「隱藏關聯圖」（某兩個號碼特別夾），共現 χ² 會爆錶。通過 = 冇關聯圖，即係話任何 Graph Neural Network / Node2Vec 嵌入學到嘅「號碼幾何距離」<b>只會係噪音</b>；同樣道理，攪珠日效應通過 = 「星期幾輪換」亦係假象。
        <br />🔴 如果某項 p&lt;0.01（偏離隨機）先值得深究 — 但目前歷史數據（{history.length} 期）正常應該全部符合隨機。
      </div>
    </Card>
  );
}
