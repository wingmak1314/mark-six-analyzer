// 大眾圖案偵測 (popularPatterns) + ShareRisk/ShapeScore 新功能 jsdom 驗證
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { popularPatterns } from '../lib/quant';
import { analyzeStatic } from '../lib/analyzer';
import { ShareRisk } from '../components/ShareRisk';
import { ShapeScore } from '../components/ShapeScore';

const history = JSON.parse(readFileSync(join(process.cwd(), '..', 'history_full.json'), 'utf8'));
const payouts = JSON.parse(readFileSync(join(process.cwd(), '..', 'payouts.json'), 'utf8'));

describe('popularPatterns 圖案偵測', () => {
  it('等差序列: 3,9,15,21 公差 6', () => {
    const p = popularPatterns([3, 9, 15, 21, 30, 44]);
    expect(p.arith).toEqual([3, 9, 15, 21]);
    expect(p.arithDiff).toBe(6);
    expect(p.crowded).toBe(true);
  });

  it('對稱: 3 配 47 (相加 50)', () => {
    const p = popularPatterns([3, 47, 12, 38, 20, 41]);
    expect(p.mirror).toEqual([3, 12]);   // 3↔47, 12↔38
  });

  it('連號串: 1-2-3 = 3 個', () => {
    expect(popularPatterns([1, 2, 3, 20, 40, 49]).longestRun).toBe(3);
    expect(popularPatterns([1, 5, 9, 20, 40, 49]).longestRun).toBe(1);
  });

  it('生日號 ≥5 個 → 標記為大眾組合', () => {
    const p = popularPatterns([1, 5, 9, 20, 28, 31]);
    expect(p.birthdayCount).toBe(6);
    expect(p.crowded).toBe(true);
  });

  it('冷門組合 (兩個大號碼 + 冇圖案) 唔算大眾', () => {
    const p = popularPatterns([7, 17, 23, 35, 41, 46]);
    expect(p.arith).toBeNull();
    expect(p.mirror).toEqual([]);
    expect(p.crowded).toBe(false);
  });
});

beforeAll(() => {
  globalThis.fetch = (async () => ({ ok: true, json: async () => history }) as Response) as unknown as typeof fetch;
});
afterEach(() => cleanup());

describe('ShareRisk 新圖案警示', () => {
  it('render 到「大眾圖案」同實測證據', () => {
    render(<ShareRisk data={analyzeStatic(history)} />);
    expect(screen.getAllByText(/大眾圖案/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/實測證據/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/r = −0.14/).length).toBeGreaterThan(0);
  });
});

describe('ShapeScore 和值常態區間帶', () => {
  it('render 到 σ 區間文字', () => {
    render(<ShapeScore history={history} />);
    expect(screen.getAllByText(/和值常態分佈/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/±1σ/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/±2σ/).length).toBeGreaterThan(0);
  });
});
