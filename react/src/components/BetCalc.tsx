// 投注計算 — 複式 / 膽拖 / 縮水輪 三個投注結構工具
import { useState } from 'react';
import { ComboCalc } from './ComboCalc';
import { DanTuoCalc } from './DanTuoCalc';
import { WheelGenerator } from './WheelGenerator';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function BetCalc({ data, history }: Props) {
  const [mode, setMode] = useState<'fushi' | 'dantuo' | 'wheel'>('fushi');
  return (
    <div className="gen-wrap">
      <div className="dim-tabs betcalc-tabs">
        <button className={mode === 'fushi' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('fushi')}>🧮 複式注數</button>
        <button className={mode === 'dantuo' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('dantuo')}>🎱 膽拖計算</button>
        <button className={mode === 'wheel' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('wheel')}>🌀 縮水輪</button>
      </div>
      {mode === 'fushi' && <ComboCalc />}
      {mode === 'dantuo' && <DanTuoCalc data={data} history={history} />}
      {mode === 'wheel' && <WheelGenerator />}
    </div>
  );
}
