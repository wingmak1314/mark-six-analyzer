// 臨時驗證: 撳「🏆 金多寶」nav 掣 → 應該見到金多寶歷史表
// mock fetch: jdb.json 請求回真實 jdb.json, 其他回 history_full.json
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const jdb = JSON.parse(readFileSync(join(process.cwd(), '..', 'jdb.json'), 'utf8'));

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const payload = url.includes('jdb.json') ? jdb : history;
    return { ok: true, json: async () => payload };
  }) as unknown as typeof fetch;
});

describe('金多寶 tab', () => {
  it('撳 nav 掣切到金多寶頁, 見到 151 期記錄 + 2005 最舊期', async () => {
    render(<App />);
    const btn = await screen.findByText('🏆 金多寶', {}, { timeout: 10000 });
    fireEvent.click(btn);
    const heading = await screen.findByText(/金多寶歷史（151 期/, {}, { timeout: 10000 });
    expect(heading).toBeTruthy();
    expect(screen.getByText('05/032')).toBeTruthy();
    expect(screen.getAllByText('復活節金多寶').length).toBeGreaterThan(0);
    // AI 15 字卡片
    const aiCard = await screen.findByText(/金多寶 AI 15 字（基於 151 期/, {}, { timeout: 10000 });
    expect(aiCard).toBeTruthy();
    const balls = document.querySelectorAll('.hero-balls .wave-ball');
    expect(balls.length).toBe(15);
    const nums = [...balls].map(b => Number(b.textContent)).filter(n => !Number.isNaN(n));
    expect(nums.length).toBe(15);
    expect(new Set(nums).size).toBe(15);           // 冇重複
    expect(nums.every(n => n >= 1 && n <= 49)).toBe(true);
    const odd = nums.filter(n => n % 2 === 1).length;
    const small = nums.filter(n => n <= 24).length;
    expect(odd).toBeGreaterThanOrEqual(3); expect(odd).toBeLessThanOrEqual(12);
    expect(small).toBeGreaterThanOrEqual(3); expect(small).toBeLessThanOrEqual(12);
  }, 30000);

  it('49 號碼開出次數表: 預設頭 15 行, 撳「顯示全部」→ 49 行, 合計總數 = 1057', async () => {
    render(<App />);
    const btn = await screen.findByText('🏆 金多寶', {}, { timeout: 10000 });
    fireEvent.click(btn);
    expect(await screen.findByText('合計（開出次數）', {}, { timeout: 10000 })).toBeTruthy();

    let rows = document.querySelectorAll('.jdbnum-row');
    expect(rows.length).toBe(15);                      // 預設只顯示頭 15

    const more = await screen.findByText(/顯示全部 49 個號碼/, {}, { timeout: 10000 });
    fireEvent.click(more);
    rows = document.querySelectorAll('.jdbnum-row');
    expect(rows.length).toBe(49);                      // 撳完見到全部

    const num = (r: Element) => Number((r.querySelector('.jdbnum-total')?.textContent || '').match(/^\d+/)?.[0] || 0);
    const totals = [...rows].map(num);
    expect(totals[0]).toBe(28);                        // 最旺 = 28 次
    expect(totals[48]).toBe(12);                       // 最靜 = 12 次
    expect(totals.reduce((a, b) => a + b, 0)).toBe(151 * 7);   // 151 期 × 7 個波
    expect([...totals].sort((a, b) => b - a)).toEqual(totals); // 由多到少排序
    // 特別號 10 號: 主號 21 + 特別號 7 = 28
    const row10 = [...rows].find(r => r.querySelector('.ball')?.textContent === '10');
    expect(row10?.textContent).toContain('21');
    expect(row10?.textContent).toContain('7');
  }, 30000);
});
