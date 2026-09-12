// 黑夜模式 + 選號器去重測試
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';
import { SmartGenerator } from '../components/SmartGenerator';

const realHistory = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
let history = realHistory;

// 合成歷史 (唔用真實 history_full, 免得每次數據更新就 flaky):
// 最新 10 期夾埋覆蓋 1..44 → 排除 10 期後池只剩 5 個 → 必然觸發自動放寬
const seq: number[] = [];
for (let i = 0; i < 60; i++) seq.push(1 + (i % 44));
const synthHistory = Array.from({ length: 12 }, (_, i) => ({
  draw: `26/${String(98 - i).padStart(3, '0')}`,
  date: '01/01/2026',
  main: seq.slice((i % 10) * 6, (i % 10) * 6 + 6).sort((a, b) => a - b),
  special: 0,
}));

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes('payouts.json')
      ? { source: 'hkjc', updated: 'x', count: 1, payouts: [{ draw: '26/095', date: '29/08/2026', first: 8000000, second: 0, turnover: 18000000, total_fund: 25000000 }] }
      : history;
    return { ok: true, json: async () => data } as Response;
  }) as unknown as typeof fetch;
});

describe('黑夜模式', () => {
  it('預設跟系統/light, 切換掣加 data-theme', async () => {
    localStorage.clear();
    render(<App />);
    await screen.findByText(/第 \d+\/\d+ 期/, {}, { timeout: 8000 });
    // 有切換掣
    const toggle = document.querySelector('.theme-toggle');
    expect(toggle).toBeTruthy();
    // 切換 → dark
    fireEvent.click(toggle!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('ms-theme')).toBe('dark');
    // 再切 → light
    fireEvent.click(toggle!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('ms-theme')).toBe('light');
  }, 20000);

  it('載入時讀 localStorage 偏好', async () => {
    localStorage.setItem('ms-theme', 'dark');
    render(<App />);
    await screen.findByText(/第 \d+\/\d+ 期/, {}, { timeout: 8000 });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    localStorage.clear();
  }, 20000);
});

afterEach(() => cleanup());

describe('選號器去重 (SmartGenerator 直接 render, 唔靠 module cache)', () => {
  const renderGen = (hist: unknown) => {
    render(<SmartGenerator lastNumbers={[1, 4, 9, 20, 33, 45]} history={hist as never} />);
  };

  it('排除過去10期 (池只剩 5 個) → 自動放寬 + 10組全部唔重複', async () => {
    renderGen(synthHistory);
    const numInput = document.querySelector('.gen-num') as HTMLInputElement;
    expect(numInput.value).toBe('10');
    const selects = document.querySelectorAll('.gen-opt select');
    fireEvent.change(selects[2], { target: { value: '10' } });   // 生成 10 組
    fireEvent.click(screen.getByText('🎯 生成號碼'));
    await new Promise(r => setTimeout(r, 600));
    // 有自動放寬提示 (池太細自動減排除期數)
    expect(document.body.textContent || '').toContain('自動放寬');
    const rows = [...document.querySelectorAll('.gen-set')];
    expect(rows.length).toBe(10);
    const sets = rows.map(r => [...r.querySelectorAll('.ball')].map(b => b.textContent).sort().join(','));
    expect(new Set(sets).size).toBe(10);   // 10 組全部唔重複
  }, 20000);

  it('唔排除 (池49個) → 10組全部唔重複', async () => {
    renderGen(realHistory);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);   // 關掉排除
    const selects = document.querySelectorAll('.gen-opt select');
    fireEvent.change(selects[2], { target: { value: '10' } });
    fireEvent.click(screen.getByText('🎯 生成號碼'));
    await new Promise(r => setTimeout(r, 600));
    const rows = [...document.querySelectorAll('.gen-set')];
    const sets = rows.map(r => [...r.querySelectorAll('.ball')].map(b => b.textContent).sort().join(','));
    expect(new Set(sets).size).toBe(sets.length);
    expect(sets.length).toBe(10);
  }, 20000);
});
