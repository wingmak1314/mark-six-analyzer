// 投注計算 — 複式 / 縮水輪 兩個投注結構工具
// ⚠️ 舊「🎱 膽拖計算」(DanTuoCalc) 已刪 — 由新 tab「🎯 膽拖比較」完全覆蓋 (3/4/5膽並排分析)
import { useState } from 'react';
import { ComboCalc } from './ComboCalc';
import { WheelGenerator } from './WheelGenerator';

export function BetCalc() {
  const [mode, setMode] = useState<'fushi' | 'wheel'>('fushi');
  return (
    <div className="gen-wrap">
      <div className="dim-tabs betcalc-tabs">
        <button className={mode === 'fushi' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('fushi')}>🧮 複式注數</button>
        <button className={mode === 'wheel' ? 'dim-btn active' : 'dim-btn'} onClick={() => setMode('wheel')}>🌀 縮水輪</button>
      </div>
      {mode === 'fushi' && <ComboCalc />}
      {mode === 'wheel' && <WheelGenerator />}
    </div>
  );
}
