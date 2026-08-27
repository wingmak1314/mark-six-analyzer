// 波色分析 — 官方 mapping 完整性 + 統計正確性 + 頁面渲染
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';
import { WAVE_COLORS, WAVE_ORDER, isValidWaveMap, waveColor, wavePattern, countWaveColors } from '../lib/colors';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));

beforeAll(() => {
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => history,
  })) as unknown as typeof fetch;
});

const bodyText = () => document.body.textContent || '';

describe('波色 mapping (官方 HKJC 49 球)', () => {
  it('49 個號碼完整覆蓋、唔重複、全部 1-49', () => {
    expect(isValidWaveMap()).toBe(true);
    expect(WAVE_COLORS.red.numbers.length).toBe(17);
    expect(WAVE_COLORS.blue.numbers.length).toBe(16);
    expect(WAVE_COLORS.green.numbers.length).toBe(16);
  });

  it('官方關鍵號碼顏色正確', () => {
    expect(waveColor(1)).toBe('red');
    expect(waveColor(2)).toBe('red');
    expect(waveColor(7)).toBe('red');
    expect(waveColor(8)).toBe('red');
    expect(waveColor(12)).toBe('red');
    expect(waveColor(3)).toBe('blue');
    expect(waveColor(4)).toBe('blue');
    expect(waveColor(9)).toBe('blue');
    expect(waveColor(48)).toBe('blue');
    expect(waveColor(5)).toBe('green');
    expect(waveColor(6)).toBe('green');
    expect(waveColor(11)).toBe('green');
    expect(waveColor(49)).toBe('green');
    // 13 號 = 紅波 (特別號之王)
    expect(waveColor(13)).toBe('red');
    // 30 號 = 紅波 (史上最熱門)
    expect(waveColor(30)).toBe('red');
  });

  it('每一種顏色嘅號碼都喺 1-49 且互斥', () => {
    const all = WAVE_ORDER.flatMap(c => WAVE_COLORS[c].numbers);
    expect(all.length).toBe(49);
    expect(new Set(all).size).toBe(49);
    for (const n of all) expect(n).toBeGreaterThanOrEqual(1);
    for (const n of all) expect(n).toBeLessThanOrEqual(49);
  });

  it('波色統計計數正確', () => {
    const counts = countWaveColors([1, 3, 5, 49, 30, 48]);
    expect(counts.red).toBe(2);   // 1, 30
    expect(counts.blue).toBe(2);  // 3, 48
    expect(counts.green).toBe(2); // 5, 49
    expect(wavePattern(counts)).toBe('藍2 紅2 綠2');
  });
});

describe('波色分析 tab', () => {
  it('頁面渲染 + 官方標題 + 統計數字', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎨 波色分析'));
    await screen.findByText(/紅・藍・綠波色分析/, {}, { timeout: 8000 });
    // 3 個顏色統計卡
    expect(screen.getByText('紅波')).toBeTruthy();
    expect(screen.getByText('藍波')).toBeTruthy();
    expect(screen.getByText('綠波')).toBeTruthy();
    // 特別號分佈
    expect(screen.getByText(/特別號波色分佈/)).toBeTruthy();
    // 逐期表
    expect(screen.getByText(/全部逐期波色分析/)).toBeTruthy();
    // 冇 NaN
    expect(bodyText()).not.toContain('NaN');
  }, 20000);

  it('逐期表顯示真實期號 + 每期比例', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎨 波色分析'));
    await screen.findByText(/紅・藍・綠波色分析/, {}, { timeout: 8000 });
    // 最新一期 26/089 出現
    expect(bodyText()).toContain('26/089');
    // 最少一期嘅「紅 n · 藍 n · 綠 n」比例
    expect(bodyText()).toMatch(/紅 \d+ · 藍 \d+ · 綠 \d+/);
  }, 20000);

  it('波色球渲染 (wave-ball class + 特別號黃邊)', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎨 波色分析'));
    await screen.findByText(/紅・藍・綠波色分析/, {}, { timeout: 8000 });
    const balls = document.querySelectorAll('.wave-ball');
    expect(balls.length).toBeGreaterThan(100);
    const specials = document.querySelectorAll('.wave-special');
    expect(specials.length).toBeGreaterThan(10);
  }, 20000);
});
