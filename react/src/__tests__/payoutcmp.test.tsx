// 金多寶期 vs 普通期 對比卡（真數據: payouts.json ∩ jdb.json）
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { PayoutTrend } from '../components/PayoutTrend';

const payouts = {
  payouts: [
    { draw: '26/100', date: '01/01/2026', first: 60_000_000, second: 1_000_000, turnover: 200_000_000, total_fund: 150_000_000 },  // 金多寶
    { draw: '26/101', date: '03/01/2026', first: 60_000_000, second: 1_000_000, turnover: 200_000_000, total_fund: 150_000_000 },  // 金多寶
    { draw: '26/102', date: '05/01/2026', first: 15_000_000, second: 500_000, turnover: 50_000_000, total_fund: 20_000_000 },
    { draw: '26/103', date: '07/01/2026', first: 15_000_000, second: 500_000, turnover: 50_000_000, total_fund: 20_000_000 },
  ],
};
const jdb = { draws: [{ draw: '26/100' }, { draw: '26/101' }] };

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const payload = url.includes('jdb.json') ? jdb : payouts;
    return { ok: true, json: async () => payload };
  }) as unknown as typeof fetch;
});

function wrap(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('金多寶期 vs 普通期', () => {
  it('分開金多寶期同普通期, 計出投注額倍數同「分賬比率」', async () => {
    wrap(<PayoutTrend />);
    const title = await screen.findByText(/金多寶期 vs 普通期（真數據對比）/, {}, { timeout: 10000 });
    expect(title).toBeTruthy();
    // 標題註明樣本數
    expect(screen.getByText('金多寶期（2）')).toBeTruthy();
    expect(screen.getByText('普通期（2）')).toBeTruthy();
    // 平均總投注額: 2億 vs 5000萬 = 4.0×
    expect(screen.getAllByText('$2.00億').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$5000萬').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4.0×').length).toBeGreaterThanOrEqual(2);
    // 分賬比率: 0.30 vs 0.30 → 1.00×
    expect(screen.getByText('頭獎每注 ÷ 投注額')).toBeTruthy();
    expect(screen.getByText('1.00×')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });
});
