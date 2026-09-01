// 全站渲染 DOUBLE CHECK — 逐個 tab 開, 檢查 crash/NaN/空白/未捕獲錯誤
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const payouts = {
  source: 'hkjc', updated: 'x', count: 5,
  payouts: [
    { draw: '26/095', date: '29/08/2026', first: 4149710, second: 500000, turnover: 20000000, total_fund: 28000000 },
    { draw: '26/094', date: '27/08/2026', first: 8000000, second: 0, turnover: 18000000, total_fund: 25000000 },
    { draw: '26/093', date: '25/08/2026', first: 18000000, second: 300000, turnover: 22000000, total_fund: 30000000 },
    { draw: '26/092', date: '22/08/2026', first: 8000000, second: 0, turnover: 15000000, total_fund: 20000000 },
    { draw: '26/091', date: '20/08/2026', first: 13000000, second: 200000, turnover: 19000000, total_fund: 26000000 },
  ],
};
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes('payouts.json') ? payouts : history;
    return { ok: true, json: async () => data } as Response;
  }) as unknown as typeof fetch;
  // 捕獲 unhandled error
  globalThis.__jsErrors = [] as string[];
  window.addEventListener('error', (e) => (globalThis.__jsErrors as string[]).push(String(e.message)));
});
afterEach(() => cleanup());

const bodyText = () => document.body.textContent || '';
const jsErrors = () => (globalThis.__jsErrors as string[]) || [];
const assertClean = () => {
  expect(jsErrors()).toEqual([]);  // 冇 JS error
  expect(bodyText()).not.toContain('NaN');
  expect(bodyText()).not.toContain('Infinity');
  expect(bodyText()).not.toContain('undefined');
  expect(bodyText().length).toBeGreaterThan(50);  // 唔空白
};

async function openTab(name: string, expectTitle: RegExp) {
  render(<App />);
  fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
  fireEvent.click(screen.getAllByText(name)[0]);
  await screen.findByText(expectTitle, {}, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 300));
  return bodyText();
}

describe('全站渲染檢查', () => {
  it('儀表板', async () => {
    render(<App />);
    await screen.findByText(/第 \d+\/\d+ 期/, {}, { timeout: 8000 });
    await new Promise(r => setTimeout(r, 300));
    assertClean();
  }, 20000);

  it('統計總覽', async () => {
    await openTab('📋 統計總覽', /主號碼頻率/);
    assertClean();
  }, 20000);

  it('波色分析', async () => {
    await openTab('🎨 波色分析', /紅・藍・綠波色分析/);
    assertClean();
    expect(bodyText()).toContain('紅波');
    expect(bodyText()).toContain('藍波');
    expect(bodyText()).toContain('綠波');
  }, 20000);

  it('開獎記錄', async () => {
    await openTab('📅 開獎記錄', /最近開獎記錄/);
    assertClean();
  }, 20000);

  it('AI 推薦 + 排除功能', async () => {
    await openTab('🎯 AI 推薦', /AI 大數據推薦/);
    assertClean();
    // 有排除控制
    expect(bodyText()).toContain('排除過去');
    // 7字主打有6個波
    expect(document.querySelectorAll('.predict-hero .wave-ball:not(.wave-special)').length).toBe(6);
  }, 20000);

  it('統計預測 (2行命中率表)', async () => {
    await openTab('📐 統計預測', /統計學預測/);
    await new Promise(r => setTimeout(r, 2500));  // 等 walk-forward
    assertClean();
    expect(bodyText()).toContain('開出');
    expect(bodyText()).toContain('預測');
  }, 25000);

  it('預測實驗室', async () => {
    await openTab('🧪 預測實驗室', /開獎序列真係隨機/);
    assertClean();
    expect(bodyText()).toContain('分享風險');
  }, 20000);

  it('走勢', async () => {
    await openTab('📈 走勢', /號碼走勢圖/);
    assertClean();
  }, 20000);

  it('派彩走勢 (金多寶 EV)', async () => {
    await openTab('💰 派彩走勢', /彩池幾大先值得買/);
    assertClean();
    expect(bodyText()).toContain('臨界彩池');
  }, 20000);

  it('選號器 (10組唔重複)', async () => {
    await openTab('🎲 選號器', /智能隨機選號器/);
    fireEvent.click(screen.getByText('🎯 生成號碼'));
    await new Promise(r => setTimeout(r, 400));
    const rows = [...document.querySelectorAll('.gen-set')];
    const sets = rows.map(r => [...r.querySelectorAll('.ball')].map(b => b.textContent).sort().join(','));
    assertClean();
    if (sets.length > 1) {
      expect(new Set(sets).size).toBe(sets.length);  // 唔重複
    }
  }, 20000);

  it('投注計算 (複式/縮水輪)', async () => {
    await openTab('🧮 投注計算', /複式注數計算器/);
    fireEvent.click(screen.getByText('🌀 縮水輪'));
    await screen.findByText(/注數大減/, {}, { timeout: 8000 });
    assertClean();
  }, 20000);

  it('膽拖比較 (3/4/5膽)', async () => {
    await openTab('🎯 膽拖比較', /自由 3\/4\/5 膽/);
    assertClean();
    expect(bodyText()).toContain('3 膽拖');
    expect(bodyText()).toContain('4 膽拖');
    expect(bodyText()).toContain('5 膽拖');
  }, 20000);

  it('核對 (獎級機率)', async () => {
    await openTab('🧾 核對', /自動核對/);
    assertClean();
    expect(bodyText()).toContain('單注機率');
    expect(bodyText()).toContain('總中獎機率');
  }, 20000);

  it('黑夜模式切換', async () => {
    render(<App />);
    await screen.findByText(/第 \d+\/\d+ 期/, {}, { timeout: 8000 });
    const toggle = document.querySelector('.theme-toggle');
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    assertClean();
    localStorage.clear();
  }, 20000);
});
