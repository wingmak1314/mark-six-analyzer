// 投注計算 — 複式注數 + 膽拖計算器 合併做一個 tab (唔再分開兩個 tab)
import { useState } from 'react';
import { ComboCalc } from './ComboCalc';
import { DanTuoCalc } from './DanTuoCalc';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function BetCalc({ data, history }: Props) {
  const [mode, setMode] = useState<'fushi' | 'dantuo'>('fushi');
  return (
    <div className="gen-wrap">
      <div className="dim-tabs betcalc-tabs">
        <button className={mode === 'fushi' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('fushi')}>🧮 複式注數</button>
        <button className={mode === 'dantuo' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('dantuo')}>🎱 膽拖計算</button>
      </div>
      {mode === 'fushi' ? <ComboCalc /> : <DanTuoCalc data={data} history={history} />}
    </div>
  );
}
