// AI 推薦 7字主打 vs reasons 頭6個一致性
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import App from '../App';
import { analyzeStatic, predictStatic } from '../lib/analyzer';

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

describe('AI 推薦 7字主打一致性', () => {
  it('hero 顯示嘅 6 主號 = reasons 頭6個 (同一集合)', async () => {
    render(<App />);
    fireEvent.click(await screen.findByText('📊 儀表板', {}, { timeout: 8000 }));
    fireEvent.click(screen.getAllByText('🎯 AI 推薦')[0]);
    await screen.findByText(/AI 大數據推薦/, {}, { timeout: 8000 });

    // hero 7字主打波
    const heroBalls = [...document.querySelectorAll('.predict-hero .wave-ball:not(.wave-special)')]
      .map(b => Number(b.textContent)).sort((a, b) => a - b);
    // reasons 頭6個
    const first6Reasons = [...document.querySelectorAll('.reason-item')].slice(0, 6)
      .map(r => Number(r.querySelector('.wave-ball')!.textContent)).sort((a, b) => a - b);

    console.log('hero 7字主打:', heroBalls.join(','));
    console.log('reasons 頭6個:', first6Reasons.join(','));
    expect(heroBalls.length).toBe(6);
    expect(JSON.stringify(heroBalls)).toBe(JSON.stringify(first6Reasons));
  }, 20000);
});
