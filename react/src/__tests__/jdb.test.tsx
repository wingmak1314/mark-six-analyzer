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
});
