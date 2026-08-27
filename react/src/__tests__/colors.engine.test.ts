// AI 推薦波色平衡測試 — 用真實 3418 期數據
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeStatic, predictStatic, statsPick } from '../lib/analyzer';
import { waveColor, WAVE_COLORS } from '../lib/colors';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const dash = analyzeStatic(history);

function colorCounts(nums: number[]): Record<string, number> {
  const c = { red: 0, blue: 0, green: 0 };
  for (const n of nums) c[waveColor(n)]++;
  return c;
}

describe('AI 推薦波色平衡', () => {
  it('main10 冇任何色 > 6（唔會過度集中）', () => {
    const p = predictStatic(dash, 0);
    const c = colorCounts(p.main10);
    for (const color of ['red', 'blue', 'green']) {
      expect(c[color]).toBeLessThanOrEqual(6);
    }
  });

  it('main15 冇任何色 > 7', () => {
    const p = predictStatic(dash, 0);
    const c = colorCounts(p.main15);
    for (const color of ['red', 'blue', 'green']) {
      expect(c[color]).toBeLessThanOrEqual(7);
    }
  });

  it('7 字主打（前 6 個主號）波色分散 — 唔可以 4+ 個同色', () => {
    const p = predictStatic(dash, 0);
    const top6 = p.main10.slice(0, 6);
    const c = colorCounts(top6);
    for (const color of ['red', 'blue', 'green']) {
      expect(c[color]).toBeLessThanOrEqual(3);
    }
    // 至少有 2 種色
    const present = ['red', 'blue', 'green'].filter(color => c[color] > 0).length;
    expect(present).toBeGreaterThanOrEqual(2);
  });

  it('抖動版都保持波色分散', () => {
    for (let seed = 0; seed < 10; seed++) {
      const p = predictStatic(dash, 12, seed);
      const c = colorCounts(p.main10);
      for (const color of ['red', 'blue', 'green']) {
        expect(c[color]).toBeLessThanOrEqual(6);
      }
    }
  });

  it('統計預測 (statsPick) 都波色分散', () => {
    const st = statsPick(dash, { top: 8 });
    const c = colorCounts(st.nums);
    for (const color of ['red', 'blue', 'green']) {
      expect(c[color]).toBeLessThanOrEqual(4);
    }
    const present = ['red', 'blue', 'green'].filter(color => c[color] > 0).length;
    expect(present).toBeGreaterThanOrEqual(2);
  });

  it('官方 mapping 冇被改壞（紅17/藍16/綠16）', () => {
    expect(WAVE_COLORS.red.numbers.length).toBe(17);
    expect(WAVE_COLORS.blue.numbers.length).toBe(16);
    expect(WAVE_COLORS.green.numbers.length).toBe(16);
  });
});
