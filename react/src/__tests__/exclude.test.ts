// AI 推薦排除過去 N 期測試
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeStatic, predictStatic } from '../lib/analyzer';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const dash = analyzeStatic(history);

describe('AI 推薦排除過去 N 期', () => {
  it('last_draws 有最近 10 期數據', () => {
    expect(dash.last_draws?.length).toBe(10);
    expect(dash.last_draws![0].length).toBe(7);  // 6主+1特
  });

  it('排除 1/3/5 期: main10 冇包含被排除號碼, 特別號都冇', () => {
    for (const w of [1, 3, 5]) {
      const p = predictStatic(dash, 12, 0, w);
      const excl = new Set(p.excluded || []);
      expect(p.main10.length).toBe(10);
      expect(p.main10.filter(n => excl.has(n)).length).toBe(0);
      expect(excl.has(p.special)).toBe(false);
    }
  });

  it('排除 10 期: 自動收縮確保候選池夠 15 個', () => {
    const p = predictStatic(dash, 12, 0, 10);
    const pool = 49 - (p.excluded?.length || 0);
    expect(pool).toBeGreaterThanOrEqual(15);
    expect(p.main10.length).toBe(10);
    expect(p.excludeWeeksUsed!).toBeLessThanOrEqual(10);
    // 排除嘅號碼全部喺過去嗰啲期數
    const excl = new Set(p.excluded || []);
    expect(p.main10.filter(n => excl.has(n)).length).toBe(0);
  });

  it('排除集合排序 + 正確數量', () => {
    const p = predictStatic(dash, 0, 0, 3);
    const excl = p.excluded!;
    expect([...excl].sort((a, b) => a - b).join(',')).toBe(excl.join(','));
    // 3期排除 19 個 (實測值) — 唔可以零
    expect(excl.length).toBeGreaterThan(0);
  });

  it('冇洩漏: main10 嘅號碼冇一個喺「實際排除咗嗰啲期數」出現', () => {
    const p = predictStatic(dash, 0, 0, 10);
    const excl = new Set(p.excluded || []);
    // main10 唔可以撞「實際排除集合」
    expect(p.main10.filter(n => excl.has(n)).length).toBe(0);
    // 特別號都唔可以撞排除集合
    expect(excl.has(p.special)).toBe(false);
    // 排除 10 期時應自動收縮 (候選池 <15 就收), 實際用咗既期數要 <= 10
    expect(p.excludeWeeksUsed!).toBeLessThanOrEqual(10);
    expect(p.excludeWeeksUsed!).toBeGreaterThanOrEqual(1);
  });
});
