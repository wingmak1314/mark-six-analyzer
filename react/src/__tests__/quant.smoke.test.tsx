import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const payouts = {
  source: 'hkjc',
  updated: '2026-08-29T14:00:00Z',
  count: 79,
  payouts: [
    { draw: '26/095', date: '29/08/2026', first: 8000000, second: 0, turnover: 18000000, total_fund: 25000000 },
    { draw: '26/094', date: '27/08/2026', first: 18000000, second: 500000, turnover: 22000000, total_fund: 30000000 },
    { draw: '26/093', date: '25/08/2026', first: 8000000, second: 0, turnover: 16000000, total_fund: 20000000 },
  ],
};
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes('payouts.json') ? payouts : history;
    return { ok: true, json: async () => data } as Response;
  }) as unknown as typeof fetch;
});
const bodyText = () => document.body.textContent || '';

describe('全 tab 渲染 smoke (quant 版)', () => {
  const openTab = async (t: string) => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getAllByText(t)[0]);
    await new Promise(r => setTimeout(r, 300));
    return bodyText();
  };

  it('投注計算: 縮水輪 tab 渲染冇 NaN', async () => {
    await openTab('🧮 投注計算');
    fireEvent.click(screen.getAllByText('🌀 縮水輪')[0]);
    await new Promise(r => setTimeout(r, 400));
    const b = bodyText();
    expect(b).toContain('縮水輪');
    expect(b).toContain('覆蓋設計');
    expect(b).not.toContain('NaN');
    expect(b).not.toContain('Infinity');
  }, 20000);

  it('預測實驗室: 隨機性檢定 + 分享風險渲染', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getAllByText('🧪 預測實驗室')[0]);
    await screen.findByText(/開獎序列真係隨機/, {}, { timeout: 8000 });
    expect(bodyText()).toContain('隨機性檢定');
    expect(bodyText()).toContain('分享風險');
    expect(bodyText()).toContain('符合隨機');
    expect(bodyText()).not.toContain('NaN');
  }, 20000);

  it('派彩走勢: 金多寶 EV 渲染', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getAllByText('💰 派彩走勢')[0]);
    await screen.findByText(/彩池幾大先值得買/, {}, { timeout: 8000 });
    expect(bodyText()).toContain('臨界彩池');
    expect(bodyText()).not.toContain('NaN');
    expect(bodyText()).not.toContain('Infinity');
  }, 20000);

  it('核對: 獎級機率表渲染', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getAllByText('🧾 核對')[0]);
    await screen.findByText(/自動核對/, {}, { timeout: 8000 });
    expect(bodyText()).toContain('單注機率');
    expect(bodyText()).toContain('總中獎機率');
    expect(bodyText()).not.toContain('NaN');
  }, 20000);
});
