// 臨時驗證: 撳「🏆 金多寶」nav 掣 → 應該見到金多寶歷史表
// mock fetch: jdb.json 請求回真實 jdb.json, 其他回 history_full.json
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const jdb = JSON.parse(readFileSync(join(process.cwd(), '..', 'jdb.json'), 'utf8'));
const jdbDraws: any[] = jdb.draws ?? jdb;
const N = jdbDraws.length;   // 期數會隨新金多寶增加, 所以預期值一律由 N 推導, 唔會因為新開一期就紅

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
    expect(totals[0]).toBe(Math.max(...totals));               // 第一行 = 最旺
    expect(totals[48]).toBe(Math.min(...totals));              // 最後一行 = 最靜
    expect(totals.reduce((a, b) => a + b, 0)).toBe(N * 7);     // 期數 × 7 個波
    expect([...totals].sort((a, b) => b - a)).toEqual(totals); // 由多到少排序
    // 每行 主號 + 特別號 = 合計, 而且 49 行特別號加起 = 期數
    const cell = (r: Element, i: number) => Number(r.children[i].textContent?.match(/^\d+/)?.[0] || 0);
    const mains = [...rows].map(r => cell(r, 2));
    const sps = [...rows].map(r => cell(r, 3));
    expect(mains.reduce((a, b) => a + b, 0)).toBe(N * 6);
    expect(sps.reduce((a, b) => a + b, 0)).toBe(N);
    rows.forEach((r, i) => expect(mains[i] + sps[i]).toBe(totals[i]));

    // 區間表: 5 段 (1-10 / 11-20 / 21-30 / 31-40 / 41-49)
    const rgs = document.querySelectorAll('.jdbrange-row');
    expect(rgs.length).toBe(5);
    ['1-10', '11-20', '21-30', '31-40', '41-49'].forEach(t => expect(screen.getByText(t)).toBeTruthy());
    const m = (r: Element, i: number) => Number(r.children[i].textContent?.match(/^\d+/)?.[0] || 0);
    const rMain = [...rgs].map(r => m(r, 1));
    const rSp = [...rgs].map(r => m(r, 2));
    const rTot = [...rgs].map(r => m(r, 3));
    expect(rMain.reduce((a, b) => a + b, 0)).toBe(N * 6);   // 逐段主號加起 = 期數 × 6
    expect(rSp.reduce((a, b) => a + b, 0)).toBe(N);         // 逐段特別號加起 = 期數
    expect(rTot).toEqual(rMain.map((v, i) => v + rSp[i]));  // 合計 = 主號 + 特別號
    // 期望 = 期數 × 7 × 段內號碼數 ÷ 49
    expect([...rgs].map(r => m(r, 4))).toEqual([10, 10, 10, 10, 9].map(sz => Math.round(N * 7 * sz / 49)));
    // 區間合計 = 49 號碼表合計 (同一個總數)
    expect(rTot.reduce((a, b) => a + b, 0)).toBe(totals.reduce((a, b) => a + b, 0));
  }, 30000);
});
