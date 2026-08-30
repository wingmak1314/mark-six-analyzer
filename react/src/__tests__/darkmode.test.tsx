// 黑夜模式 + 選號器去重測試
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));

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

describe('選號器去重', () => {
  it('排除過去10期 (池得6個) → 自動放寬 + 10組全部唔重複', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎲 選號器'));
    await screen.findByText(/智能隨機選號器/, {}, { timeout: 8000 });
    // 設 10 組 (複現用戶「生成10組但全部一樣」場景) — 第 3 個 select = 生成組數
    const selects = document.querySelectorAll('.gen-opt select');
    fireEvent.change(selects[2], { target: { value: '10' } });
    // 確認排除10期
    const numInput = document.querySelector('.gen-num') as HTMLInputElement;
    expect(numInput.value).toBe('10');
    // 生成
    fireEvent.click(screen.getByText('🎯 生成號碼'));
    await new Promise(r => setTimeout(r, 600));
    // 所有生成嘅組合應該唯一 (冇重複行)
    const rows = [...document.querySelectorAll('.gen-set')];
    expect(rows.length).toBe(10);  // 真係有10組
    const sets = rows.map(r => {
      const balls = r.querySelectorAll('.ball');
      return [...balls].map(b => b.textContent).sort().join(',');
    });
    const unique = new Set(sets);
    expect(unique.size).toBe(10);  // 10組全部唔重複
    // 有自動放寬提示 (池太細自動減排除期數)
    expect(document.body.textContent || '').toContain('自動放寬');
  }, 20000);

  it('唔排除 (池49個) → 10組全部唔重複', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎲 選號器'));
    await screen.findByText(/智能隨機選號器/, {}, { timeout: 8000 });
    // 關掉排除
    fireEvent.click(screen.getByRole('checkbox'));
    const selects = document.querySelectorAll('.gen-opt select');
    fireEvent.change(selects[2], { target: { value: '10' } });
    fireEvent.click(screen.getByText('🎯 生成號碼'));
    await new Promise(r => setTimeout(r, 600));
    const rows = [...document.querySelectorAll('.gen-set')];
    const sets = rows.map(r => {
      const balls = r.querySelectorAll('.ball');
      return [...balls].map(b => b.textContent).sort().join(',');
    });
    expect(new Set(sets).size).toBe(sets.length);  // 冇重複
    expect(sets.length).toBe(10);
  }, 20000);
});
