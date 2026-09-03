// 統計預測命中率表格 — 驗證每行號碼冇重複 + 命中數正確
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

describe('統計預測命中率表格完整性', () => {
  it('walk-forward 每行號碼 15 個唔重複 + 命中數 = 實際中幾多', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getAllByText('📐 統計預測')[0]);
    await screen.findByText(/統計學預測/, {}, { timeout: 8000 });

    // 等 walk-forward 50 期算完
    await new Promise(r => setTimeout(r, 3000));

    // 撳 50 期
    const btn50 = [...document.querySelectorAll('.dim-btn')].find(b => b.textContent?.includes('50期'));
    fireEvent.click(btn50!);
    await new Promise(r => setTimeout(r, 1000));

    // 攞所有命中率行
    const rows = [...document.querySelectorAll('.hitrate-row')];
    console.log('命中率行數:', rows.length);
    expect(rows.length).toBeGreaterThan(5);

    let dupCount = 0;
    let mismatchCount = 0;
    for (const row of rows) {
      // 只攞「預測」嗰層 (hitrate-line:first-child) 嘅波 — 而家每行有預測+開出兩層
      const predLine = row.querySelector('.hitrate-line');
      const balls = [...predLine!.querySelectorAll('.ball')].map(b => Number(b.textContent)).filter(n => !isNaN(n) && n > 0);
      // 每行 15 個唔重複
      if (new Set(balls).size !== balls.length || balls.length !== 15) {
        dupCount++;
        console.log('❌ 重複/缺號行:', balls.join(','));
      }
      // 中咗幾多 = 預測層紅色波數 (hitrate-hit)
      const red = [...predLine!.querySelectorAll('.ball.red')].length;
      const countText = row.textContent?.match(/中(\d+)個/);
      const shown = countText ? Number(countText[1]) : -1;
      if (red !== shown) {
        mismatchCount++;
        console.log(`❌ 命中數唔啱: 紅色=${red} 但顯示中${shown}個 | 號碼=${balls.join(',')}`);
      }
    }
    expect(dupCount).toBe(0);
    expect(mismatchCount).toBe(0);
    console.log(`✅ 檢查完成: 重複行=${dupCount}, 命中數不符=${mismatchCount}`);
  }, 30000);
});
