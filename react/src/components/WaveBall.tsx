// 波色球 — 官方紅/藍/綠 49 球, 特別號黃邊
// 共用 component: AI 推薦 7 字主打 / Dashboard / 波色分析 tab 都用呢個
import { waveColor, WAVE_COLORS } from '../lib/colors';

export function WaveBall({ n, size = '', special = false }: { n: number; size?: string; special?: boolean }) {
  const color = waveColor(n);
  const info = WAVE_COLORS[color];
  return (
    <span
      className={`wave-ball wave-${color} ${size}${special ? ' wave-special' : ''}`}
      title={`${n}號 · ${info.label}${special ? ' · 特別號' : ''}`}
    >
      {n}
    </span>
  );
}
