// Quant 級輔助工具 — 覆蓋設計縮水 + 隨機性檢定
// 誠實立場: 呢啲係「派彩結構優化 / 隨機性驗證」工具, 唔提高中獎機率
import { comb } from './analyzer';

// ── 覆蓋設計 C(v,k,t,m) — 貪婪 Set Cover 縮水輪 ──
// 問題: 揀 v 個號碼, 買 k 碼注, 保證「任何 m 個中獎號碼都至少有一注中 ≥t 個」
// 貪婪解法 (啟發式, 唔係最優; v≥14 NP-Hard)
export interface WheelResult {
  tickets: number[][];
  fullCount: number;      // 原複式注數
  guarantee: string;      // e.g. "中4保3"
  tooBig?: boolean;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

export function coveringWheel(pool: number[], k = 6, t = 3, m = 4): WheelResult {
  const fullCount = comb(pool.length, k);
  const targets = combinations(pool, m);
  const candidates = combinations(pool, k);
  // 防爆: candidates × targets > 約 4M 就唔計 (v=13 上限)
  if (targets.length * candidates.length > 4_000_000) {
    return { tickets: [], fullCount, guarantee: `${m}保${t}`, tooBig: true };
  }
  const coverage: boolean[][] = candidates.map(c => {
    const cs = new Set(c);
    return targets.map(s => {
      let inter = 0;
      for (const x of s) if (cs.has(x)) inter++;
      return inter >= t;
    });
  });
  const uncovered = new Set<number>(targets.map((_, i) => i));
  const chosen: number[][] = [];
  let guard = 0;
  while (uncovered.size > 0 && guard++ < 5000) {
    let best = -1, bestScore = -1;
    for (let i = 0; i < coverage.length; i++) {
      let cnt = 0;
      for (const u of uncovered) if (coverage[i][u]) cnt++;
      if (cnt > bestScore) { bestScore = cnt; best = i; }
    }
    if (best < 0 || bestScore === 0) break;
    chosen.push([...candidates[best]].sort((a, b) => a - b));
    for (const u of uncovered) if (coverage[best][u]) uncovered.delete(u);
  }
  return { tickets: chosen, fullCount, guarantee: `${m}保${t}` };
}

// ── 隨機性檢定 (輕量版 NIST) ──
// Normal CDF (Abramowitz-Stegun 近似)
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  if (x > 0) p = 1 - p;
  return p;
}

// χ² 上尾 p 值 (Wilson-Hilferty 近似)
export function chi2PValue(chi2: number, df: number): number {
  if (df < 1) return 0;
  const z = (Math.cbrt(chi2 / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normCdf(z);
}

// Runs 檢定 (兩尾 p 值): 一條布林序列有幾多「段」— 段數太少/太多都偏離隨機
export function runsPValue(seq: boolean[]): number {
  const n = seq.length;
  if (n < 20) return NaN;
  let n1 = 0;
  for (const b of seq) if (b) n1++;
  const n2 = n - n1;
  if (n1 === 0 || n2 === 0) return 0;
  let runs = 1;
  for (let i = 1; i < n; i++) if (seq[i] !== seq[i - 1]) runs++;
  const mean = 1 + (2 * n1 * n2) / n;
  const variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  if (variance <= 0) return NaN;
  const z = (runs - mean) / Math.sqrt(variance);
  return 2 * (1 - normCdf(Math.abs(z)));
}

// ── 人群迴避 / 分享風險 heuristic ──
// 冇投注分佈數據, 用已知認知偏差做 proxy:
// 生日效應 (1-31 多人買) · 尾0 (少人買) · 大號碼 33-49 (少人買)
export interface ShareProfile {
  score: number;        // 0-100, 越高 = 越冷門 (越少人分獎)
  label: string;        // 低/中/高分享風險
  birthdayCount: number; // ≤31 號碼數量 (生日效應, 越少越好)
  tailZero: number;      // 尾0 數量 (少人買, 越多越好)
  bigCount: number;      // 33-49 數量 (少人買, 越多越好)
}
export function shareProfile(nums: number[]): ShareProfile {
  const birthday = nums.filter(n => n <= 31).length;
  const tailZero = nums.filter(n => n % 10 === 0).length;
  const big = nums.filter(n => n >= 33).length;
  // 分: 生日越少越高分, 尾0/大號碼越多越高分 (0-90 區間)
  const score = Math.round((6 - birthday) * 10 + tailZero * 6 + big * 5);
  const clamped = Math.max(0, Math.min(100, score));
  return {
    score: clamped,
    label: clamped >= 60 ? '低分享風險（獨中機會較高）' : clamped >= 30 ? '中等分享風險' : '高分享風險（多人分獎）',
    birthdayCount: birthday,
    tailZero,
    bigCount: big,
  };
}
