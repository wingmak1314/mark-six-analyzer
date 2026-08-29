// Quant 模組測試 — 獎級精確機率 / 覆蓋縮水 / 隨機性檢定
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prizeTiers, totalWinProb, TOTAL_COMBOS } from '../lib/analyzer';
import { coveringWheel, chi2PValue, runsPValue, shareProfile } from '../lib/quant';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));

describe('獎級精確機率 (三變量超幾何)', () => {
  it('七獎組合數同手算一致', () => {
    const tiers = prizeTiers();
    expect(tiers.find(t => t.name === '頭獎')!.combos).toBe(1);
    expect(tiers.find(t => t.name === '二獎')!.combos).toBe(6);
    expect(tiers.find(t => t.name === '三獎')!.combos).toBe(252);
    expect(tiers.find(t => t.name === '四獎')!.combos).toBe(630);
    expect(tiers.find(t => t.name === '五獎')!.combos).toBe(12915);
    expect(tiers.find(t => t.name === '六獎')!.combos).toBe(17220);
    expect(tiers.find(t => t.name === '七獎')!.combos).toBe(229600);
  });

  it('總中獎機率 = 260624 / 13983816 ≈ 1.8637%', () => {
    const tiers = prizeTiers();
    const total = tiers.reduce((s, t) => s + t.combos, 0);
    expect(total).toBe(260624);
    expect(total / TOTAL_COMBOS).toBeCloseTo(0.018637, 5);
    expect(totalWinProb()).toBeCloseTo(0.018637, 5);
  });

  it('七獎機率 = 1/60.91', () => {
    const seven = prizeTiers().find(t => t.name === '七獎')!;
    expect(seven.odds).toBeCloseTo(60.9096, 2);
  });

  it('全部獎級組合數加埋唔超過總組合數', () => {
    const sum = prizeTiers().reduce((s, t) => s + t.combos, 0);
    expect(sum).toBeLessThan(TOTAL_COMBOS);
  });
});

describe('覆蓋縮水輪 (貪婪 Set Cover)', () => {
  it('10 碼 中4保3 縮水後 < 原複式 210 注', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i + 1);
    const r = coveringWheel(pool, 6, 3, 4);
    expect(r.fullCount).toBe(210);
    expect(r.tickets.length).toBeLessThan(210);
    expect(r.tickets.length).toBeGreaterThan(0);
  });

  it('所有縮水注都係 6 個唔重複號碼', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i + 1);
    const r = coveringWheel(pool, 6, 3, 4);
    for (const t of r.tickets) {
      expect(t.length).toBe(6);
      expect(new Set(t).size).toBe(6);
      for (const n of t) expect(pool).toContain(n);
    }
  });

  it('覆蓋驗證: 每個 4 號子集都至少被一注覆蓋 ≥3 個', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i + 1);
    const r = coveringWheel(pool, 6, 3, 4);
    // 窮舉所有 C(10,4)=210 個中獎子集
    const subsets: number[][] = [];
    const rec = (start: number, cur: number[]) => {
      if (cur.length === 4) { subsets.push([...cur]); return; }
      for (let i = start; i < pool.length; i++) { cur.push(pool[i]); rec(i + 1, cur); cur.pop(); }
    };
    rec(0, []);
    for (const sub of subsets) {
      const covered = r.tickets.some(t => {
        let inter = 0;
        for (const n of sub) if (t.includes(n)) inter++;
        return inter >= 3;
      });
      expect(covered).toBe(true);
    }
  });
});

describe('隨機性檢定', () => {
  it('真實數據 χ² 主號碼 p > 0.01 (符合隨機)', () => {
    const mainCounts = Array.from({ length: 49 }, () => 0);
    for (const d of history) for (const n of d.main) mainCounts[n - 1]++;
    const exp = history.length * 6 / 49;
    let chi = 0;
    for (const c of mainCounts) chi += (c - exp) ** 2 / exp;
    const p = chi2PValue(chi, 48);
    expect(p).toBeGreaterThan(0.01);
    expect(p).toBeLessThan(0.99);  // 唔會過度完美
  });

  it('runsPValue 對規律序列應返極細 p', () => {
    // 全同值 → 段數 1 → 極細 p
    const seq = Array.from({ length: 100 }, () => true);
    const p = runsPValue(seq);
    expect(p).toBeLessThan(0.01);
  });

  it('runsPValue 對真隨機序列 p > 0.01', () => {
    // 用真實數據: 特別號大細序列
    const seq = history.slice(0, 200).map(d => d.special > 24);
    const p = runsPValue(seq);
    expect(p).toBeGreaterThan(0.01);
  });
});

describe('分享風險 heuristic', () => {
  it('全生日號 (≤31) → 高分享風險 (低分)', () => {
    const prof = shareProfile([1, 2, 3, 4, 5, 6]);
    expect(prof.score).toBeLessThan(40);
  });
  it('全冷門號 (33-49) → 低分享風險 (高分)', () => {
    const prof = shareProfile([33, 34, 35, 36, 37, 38]);
    expect(prof.score).toBeGreaterThan(65);
  });
});
