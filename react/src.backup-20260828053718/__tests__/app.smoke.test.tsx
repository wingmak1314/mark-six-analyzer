// Smoke test — 用 jsdom 渲染真 App, 確認每個 tab 唔會白畫面 / crash
// 數據: mock fetch 回傳 repo root 嘅 history_full.json (真實 3418 期)
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';

// vitest cwd = react/ → ../../history_full.json = repo root
const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));

beforeAll(() => {
  // 全部 fetch 都 mock 成 history_full.json (app 淨係用 static mode)
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => history,
  })) as unknown as typeof fetch;
});

const bodyText = () => document.body.textContent || '';

describe('六合彩 App smoke', () => {
  it('dashboard 渲染 + 數據載入', async () => {
    render(<App />);
    await screen.findByText(/第 \d+\/\d+ 期/, {}, { timeout: 8000 });
    expect(screen.getByText(/共 \d+ 期數據/)).toBeTruthy();
  }, 20000);

  it('🧪 預測實驗室 tab: 4 個新組件全部渲染', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🧪 預測實驗室'));
    await screen.findByText(/⭐ 特別號預測/, {}, { timeout: 8000 });
    expect(screen.getByText(/🧬 隔期關聯分析/)).toBeTruthy();
    expect(screen.getByText(/🧮 組合形狀檢查器/)).toBeTruthy();
    expect(screen.getByText(/💰 注碼分配器/)).toBeTruthy();
  }, 20000);

  it('特別號預測: 顯示建議 + walk-forward 實測', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🧪 預測實驗室'));
    await screen.findByText(/特別號建議/, {}, { timeout: 8000 });
    // 特別號 ball 有 sp class, 值 1-49
    const spBall = document.querySelector('.dantuo-chips .ball.sp');
    expect(spBall).toBeTruthy();
    expect(Number(spBall!.textContent)).toBeGreaterThanOrEqual(1);
    expect(Number(spBall!.textContent)).toBeLessThanOrEqual(49);
    // 實測表有期號
    expect(bodyText()).toMatch(/實測：過去/);
  }, 20000);

  it('注碼分配器: 預算切換出 plan + 機率合理', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🧪 預測實驗室'));
    await screen.findByText(/🎲 單式分散/, {}, { timeout: 8000 });
    expect(bodyText()).toMatch(/中 5\+ 個/);
    // 切換預算 $1000 → 出現複式9 plan
    fireEvent.click(screen.getAllByText('$1,000')[0]);
    await screen.findByText(/複式9 \+ 複式7/, {}, { timeout: 8000 });
    // 唔可以有 NaN / Infinity 顯示
    expect(bodyText()).not.toContain('NaN');
    expect(bodyText()).not.toContain('Infinity');
  }, 20000);

  it('AI 推薦 tab: 特別號建議顯示', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🎯 AI 推薦'));
    await screen.findByText(/特別號建議/, {}, { timeout: 8000 });
    expect(screen.getAllByText(/命中率/).length).toBeGreaterThan(0);
  }, 20000);

  it('統計預測 tab: 結構平衡 (2-4 奇/2-4 細)', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('📐 統計預測'));
    await screen.findByText(/統計學預測/, {}, { timeout: 8000 });
    const m = bodyText().match(/(\d)奇(\d)偶 · (\d)細(\d)大/);
    expect(m).toBeTruthy();
    if (m) {
      const odd = Number(m[1]), small = Number(m[3]);
      expect(odd).toBeGreaterThanOrEqual(2);
      expect(odd).toBeLessThanOrEqual(4);
      expect(small).toBeGreaterThanOrEqual(2);
      expect(small).toBeLessThanOrEqual(4);
    }
  }, 20000);

  it('tab 精簡: 11 個 tab, 冇重複 (AI 對比已刪, 計算+膽拖合併)', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    const tabs = [...document.querySelectorAll('.nav-btn')].map(b => b.textContent || '');
    expect(tabs.length).toBe(11);
    // 重複嘅已移除
    expect(bodyText()).not.toContain('AI 對比');
    expect(bodyText()).not.toContain('🧮 計算器');
    expect(bodyText()).not.toContain('🎱 膽拖');
    // 合併後嘅 tab 存在
    expect(bodyText()).toContain('🧮 投注計算');
    // 走勢 tab 有 TrendChart + TrendAnalysis
    fireEvent.click(screen.getByText('📈 走勢'));
    await screen.findByText(/號碼走勢圖/, {}, { timeout: 8000 });
    expect(bodyText()).toContain('單雙比例');
  }, 20000);

  it('投注計算 tab: 複式 ↔ 膽拖切換', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getByText('🧮 投注計算'));
    await screen.findByText(/複式注數計算器/, {}, { timeout: 8000 });
    fireEvent.click(screen.getByText('🎱 膽拖計算'));
    await screen.findByText(/膽拖計算器/, {}, { timeout: 8000 });
    expect(bodyText()).toContain('AI 自動揀');
  }, 20000);
});
