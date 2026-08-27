// 香港六合彩官方波色 mapping
// 紅 17 個；藍、綠各 16 個。來源：香港賽馬會六合彩 50 週年冷知識頁面。
export type WaveColor = 'red' | 'blue' | 'green';

export const WAVE_COLORS: Record<WaveColor, { label: string; css: string; numbers: number[] }> = {
  red: {
    label: '紅波',
    css: '#e63946',
    numbers: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  },
  blue: {
    label: '藍波',
    css: '#3b82f6',
    numbers: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  },
  green: {
    label: '綠波',
    css: '#22c55e',
    numbers: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49],
  },
};

export const WAVE_ORDER: WaveColor[] = ['blue', 'red', 'green'];

const NUMBER_COLOR = new Map<number, WaveColor>();
for (const color of Object.keys(WAVE_COLORS) as WaveColor[]) {
  for (const number of WAVE_COLORS[color].numbers) NUMBER_COLOR.set(number, color);
}

export function waveColor(number: number): WaveColor {
  return NUMBER_COLOR.get(number) || 'red';
}

export function waveLabel(color: WaveColor): string {
  return WAVE_COLORS[color].label;
}

export function wavePattern(counts: Record<WaveColor, number>): string {
  return WAVE_ORDER.map(color => `${waveLabel(color).replace('波', '')}${counts[color]}`).join(' ');
}

export function emptyWaveCounts(): Record<WaveColor, number> {
  return { red: 0, blue: 0, green: 0 };
}

export function countWaveColors(numbers: number[]): Record<WaveColor, number> {
  const counts = emptyWaveCounts();
  for (const number of numbers) counts[waveColor(number)] += 1;
  return counts;
}

export function numberColorMap(): { color: WaveColor; label: string; numbers: number[] }[] {
  return WAVE_ORDER.map(color => ({ color, label: waveLabel(color), numbers: WAVE_COLORS[color].numbers }));
}

// 保證 mapping 完整且不重覆；測試和開發期 sanity check 共用。
export function isValidWaveMap(): boolean {
  const all = WAVE_ORDER.flatMap(color => WAVE_COLORS[color].numbers);
  return all.length === 49 && new Set(all).size === 49 && all.every(n => n >= 1 && n <= 49);
}
