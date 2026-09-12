// 隨機性檢定 — 真實歷史數據: 共現 χ² + 攪珠日效應 χ² 應該「符合隨機」
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RandomnessAuditor } from '../components/RandomnessAuditor';
import type { Draw } from '../lib/analyzer';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));

describe('隨機性檢定（真數據）', () => {
  it('render 7 項檢定, 共現對同攪珠日效應都符合隨機', () => {
    render(<RandomnessAuditor history={history} />);
    // 7 行結果
    const rows = document.querySelectorAll('.hitrate-row');
    expect(rows.length).toBe(7);
    // 新加嘅兩行存在
    expect(screen.getByText(/號碼共現 χ²（1,176 對同期出現/)).toBeTruthy();
    expect(screen.getByText(/攪珠日效應 χ²（49 號 × 星期幾）/)).toBeTruthy();
    // 最強共現對應該係細號碼 (真數據: 30-34, 67 次)
    const pairRow = [...rows].find(r => r.textContent?.includes('號碼共現 χ²'));
    expect(pairRow?.textContent).toMatch(/最強對 \d+-\d+ 只 \d+ 次/);
    // 全部唔應該偏離隨機
    const bad = [...rows].filter(r => r.textContent?.includes('偏離隨機'));
    expect(bad.length).toBe(0);
    // 唔應該有 NaN / undefined 顯示
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('合成隨機數據亦應該通過（唔會假陽性爆錶）', () => {
    // 固定種子 PRNG → 確定性
    let s = 12345;
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    const synth = Array.from({ length: 600 }, (_, i) => {
      const pool = Array.from({ length: 49 }, (_, k) => k + 1);
      const main: number[] = [];
      for (let k = 0; k < 6; k++) main.push(...pool.splice(Math.floor(rnd() * pool.length), 1));
      return { draw: `99/${String(i + 1).padStart(3, '0')}`, date: '01/01/2020', main: main.sort((a, b) => a - b), special: Math.floor(rnd() * 49) + 1 };
    });
    render(<RandomnessAuditor history={synth as unknown as Draw[]} />);
    const rows = document.querySelectorAll('.hitrate-row');
    expect(rows.length).toBe(7);
    expect([...rows].filter(r => r.textContent?.includes('偏離隨機')).length).toBeLessThanOrEqual(1);
  });
});
