// 膽拖比較 tab — 3/4/5 膽三方案並排 + 機率正確
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
const bodyText = () => document.body.textContent || '';

describe('膽拖比較 tab', () => {
  it('渲染 3/4/5 膽三個方案 + 注數成本', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎯 膽拖比較'));
    await screen.findByText(/自由 3\/4\/5 膽/, {}, { timeout: 8000 });
    // 三個方案卡
    expect(bodyText()).toContain('3 膽拖');
    expect(bodyText()).toContain('4 膽拖');
    expect(bodyText()).toContain('5 膽拖');
    // 冇 NaN
    expect(bodyText()).not.toContain('NaN');
    expect(bodyText()).not.toContain('Infinity');
  }, 20000);

  it('4膽拖13尾 = 78注 $780 (數學驗證)', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎯 膽拖比較'));
    await screen.findByText(/自由 3\/4\/5 膽/, {}, { timeout: 8000 });
    // 4膽 card 顯示 78 注
    expect(bodyText()).toContain('$780');
  }, 20000);

  it('切換拖尾數量 (13→20) 更新方案', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎯 膽拖比較'));
    await screen.findByText(/自由 3\/4\/5 膽/, {}, { timeout: 8000 });
    fireEvent.click(screen.getByText('20 尾'));
    await new Promise(r => setTimeout(r, 300));
    // 4膽拖20尾 = C(20,2)=190注 = $1,900
    expect(bodyText()).toContain('$1,900');
  }, 20000);
});
