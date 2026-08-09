// 六合彩分析引擎 — 雙 mode 共用 (backend API 或 static 前端)
export interface Draw {
  draw: string;
  date: string;
  main: number[];
  special: number;
}

export interface DashboardData {
  total_draws: number;
  first_draw: string;
  last_draw: string;
  last_date: string;
  last_numbers: number[];
  last_special: number;
  freq_top: { num: number; count: number }[];
  freq_bottom: { num: number; count: number }[];
  special_top: { num: number; count: number }[];
  odd_even: [string, number][];
  size: [string, number][];
  tail: [string, number][];
  zones: [string, number][];
  consec_pct: number;
  repeat_avg: number;
  cooccur: { pair: string; count: number }[];
  gaps: { num: number; gap: number }[];
  freq_all?: { num: number; count: number }[];
  days_ago?: { num: number; days: number }[];
  last_seen?: { num: number; date: string }[];
  combo2?: { nums: string; count: number }[];
  combo3?: { nums: string; count: number }[];
  consec2?: { nums: string; count: number }[];
  consec3?: { nums: string; count: number }[];
  recent_freq?: { num: number; count: number }[];
}

export interface PredictResult {
  main10: number[];
  main15: number[];
  reasons: { num: number; why: string }[];
  target_draw: string;
  based_on: string;
}

// ── Static 分析引擎 (GitHub Pages 冇 backend 用) ──
// 近 N 期主號碼頻率 (動量信號: 熱門號碼近期狀態)
export function recentFreq(draws: Draw[], window = 50): { num: number; count: number }[] {
  const f: Record<number, number> = {};
  for (const d of draws.slice(0, window)) {
    for (const n of d.main) f[n] = (f[n] || 0) + 1;
  }
  return Object.entries(f).map(([num, count]) => ({ num: Number(num), count }));
}

export function analyzeStatic(draws: Draw[]): DashboardData {
  const N = draws.length;
  const full = draws.map(d => d.main);
  const freq: Record<number, number> = {};
  const spFreq: Record<number, number> = {};
  for (const d of draws) {
    for (const n of d.main) freq[n] = (freq[n] || 0) + 1;
    spFreq[d.special] = (spFreq[d.special] || 0) + 1;
  }
  const oe: Record<string, number> = {};
  const sd: Record<string, number> = {};
  const tail: Record<string, number> = {};
  const zones: Record<string, number> = {};
  for (const d of full) {
    const odd = d.filter(n => n % 2 === 1).length;
    oe[`${odd}奇${6 - odd}偶`] = (oe[`${odd}奇${6 - odd}偶`] || 0) + 1;
    const small = d.filter(n => n <= 24).length;
    sd[`${small}細${6 - small}大`] = (sd[`${small}細${6 - small}大`] || 0) + 1;
    for (const n of d) {
      tail[`尾${n % 10}`] = (tail[`尾${n % 10}`] || 0) + 1;
      const z = n <= 10 ? '1-10' : n <= 20 ? '11-20' : n <= 30 ? '21-30' : n <= 40 ? '31-40' : '41-49';
      zones[z] = (zones[z] || 0) + 1;
    }
  }
  let consec = 0;
  for (const d of full) {
    const s = [...d].sort((a, b) => a - b);
    if (s.some((n, i) => i < 5 && s[i + 1] === n + 1)) consec++;
  }
  const co: Record<string, number> = {};
  for (const d of full) {
    const s = [...d].sort((a, b) => a - b);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 6; j++) {
      co[`${s[i]},${s[j]}`] = (co[`${s[i]},${s[j]}`] || 0) + 1;
    }
  }
  const sorted = (o: Record<string, number>): [string, number][] =>
    Object.entries(o).sort((a, b) => b[1] - a[1]);
  const gaps: Record<number, number> = {};
  const lastSeen: Record<number, string> = {};
  for (let n = 1; n <= 49; n++) {
    gaps[n] = 0;
    for (let i = 0; i < N; i++) {
      if (draws[i].main.includes(n) || draws[i].special === n) { gaps[n] = i; lastSeen[n] = draws[i].date; break; }
    }
    if (!gaps[n]) gaps[n] = N;
  }
  // 天前 (days since last seen) — 由日期計
  const daysAgo: Record<number, number> = {};
  const now = new Date();
  for (let n = 1; n <= 49; n++) {
    if (lastSeen[n]) {
      const [dd, mm, yyyy] = lastSeen[n].split('/').map(Number);
      const d = new Date(yyyy, mm - 1, dd);
      daysAgo[n] = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
    } else {
      daysAgo[n] = 9999;
    }
  }
  // 組合統計 (雙號/三號/二連/三連)
  const combo2: Record<string, number> = {};
  const combo3: Record<string, number> = {};
  const consec2: Record<string, number> = {};
  const consec3: Record<string, number> = {};
  for (const d of full) {
    const s = [...d].sort((a, b) => a - b);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 6; j++) {
      combo2[`${s[i]},${s[j]}`] = (combo2[`${s[i]},${s[j]}`] || 0) + 1;
    }
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 6; k++) {
      combo3[`${s[i]},${s[j]},${s[k]}`] = (combo3[`${s[i]},${s[j]},${s[k]}`] || 0) + 1;
    }
    for (let i = 0; i < 5; i++) {
      if (s[i + 1] === s[i] + 1) consec2[`${s[i]},${s[i + 1]}`] = (consec2[`${s[i]},${s[i + 1]}`] || 0) + 1;
    }
    for (let i = 0; i < 4; i++) {
      if (s[i + 2] === s[i + 1] + 1 && s[i + 1] === s[i] + 1) {
        consec3[`${s[i]},${s[i + 1]},${s[i + 2]}`] = (consec3[`${s[i]},${s[i + 1]},${s[i + 2]}`] || 0) + 1;
      }
    }
  }
  const toList = (o: Record<string, number>, n: number) =>
    sorted(o).slice(0, n).map(([nums, count]) => ({ nums, count }));
  return {
    total_draws: N,
    first_draw: draws[N - 1].draw,
    last_draw: draws[0].draw,
    last_date: draws[0].date,
    last_numbers: draws[0].main,
    last_special: draws[0].special,
    freq_top: sorted(freq).slice(0, 15).map(([num, count]) => ({ num: Number(num), count })),
    freq_bottom: sorted(freq).slice(-10).map(([num, count]) => ({ num: Number(num), count })),
    freq_all: Object.entries(freq).map(([num, count]) => ({ num: Number(num), count })).sort((a, b) => a.num - b.num),
    special_top: sorted(spFreq).slice(0, 8).map(([num, count]) => ({ num: Number(num), count })),
    odd_even: sorted(oe).slice(0, 6),
    size: sorted(sd).slice(0, 6),
    tail: sorted(tail).slice(0, 10),
    zones: sorted(zones).slice(0, 5),
    consec_pct: Math.round(consec / N * 100),
    repeat_avg: 0,
    cooccur: sorted(co).slice(0, 15).map(([pair, count]) => ({ pair, count })),
    gaps: Object.entries(gaps).map(([num, gap]) => ({ num: Number(num), gap })),
    combo2: toList(combo2, 15),
    combo3: toList(combo3, 15),
    consec2: toList(consec2, 15),
    consec3: toList(consec3, 15),
    days_ago: Object.entries(daysAgo).map(([num, days]) => ({ num: Number(num), days })),
    last_seen: Object.entries(lastSeen).map(([num, date]) => ({ num: Number(num), date })),
    recent_freq: recentFreq(draws, 50),
  };
}

// ── 推薦引擎 (static mode, 同 backend 邏輯一致) ──
// jitter: 隨機抖動幅度 (0 = 每次都一樣, >0 = 次次可能唔同)
export function predictStatic(s: DashboardData, jitter = 0): PredictResult {
  const N = s.total_draws;
  const freq: Record<number, number> = Object.fromEntries(s.freq_top.map(x => [x.num, x.count]));
  const baseAvg = 6 * N / 49;
  const co: Record<string, number> = Object.fromEntries(s.cooccur.map(x => [x.pair, x.count]));
  const coExp = N * 15 / 1176;
  const gapMap: Record<number, number> = Object.fromEntries(s.gaps.map(g => [g.num, g.gap]));
  const recentMap: Record<number, number> = Object.fromEntries((s.recent_freq || []).map(x => [x.num, x.count]));
  const recentWin = Math.min(50, N);
  const recentAvg = recentWin * 6 / 49;  // 近50期每號期望出幾多次
  const lastNums = new Set(s.last_numbers.concat([s.last_special]));
  const candidates: number[] = [];
  // jitter seed: 每 call 一次都唔同 (用時間 seed)
  let seed = Math.floor(Math.random() * 0x7fffffff);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const jit = (_n: number) => (rand() - 0.5) * 2 * jitter;
  for (let n = 1; n <= 49; n++) if (!lastNums.has(n)) candidates.push(n);
  const zoneB = (n: number) => n >= 11 && n <= 20 ? 1.5 : (n <= 10 || (n >= 21 && n <= 30)) ? 0.5 : n <= 40 ? 0 : -1.5;
  const tailB = (n: number) => n % 10 === 0 ? -2 : 0.4;
  const score = (n: number, pool: number[]) => {
    let s2 = 0.5 * (freq[n] || baseAvg) + zoneB(n) + tailB(n) + (n === 13 ? 2 : 0) + Math.min(gapMap[n] || 0, 20) * 0.15;
    for (const o of pool) {
      const pair = n < o ? `${n},${o}` : `${o},${n}`;
      if (co[pair]) s2 += (co[pair] - coExp) * 3;
    }
    // 近50期動量: 近期出得多嘅號碼加分 (歷史形態信號)
    s2 += ((recentMap[n] || 0) - recentAvg) * 0.8;
    // 連號傾向: 同 pool 內號碼相鄰 → 加分 (歷史 45.8% 開獎含連號, 唔應該避開)
    if (pool.some(o => Math.abs(o - n) === 1)) s2 += 1.2;
    if (jitter > 0) s2 += jit(n);  // 隨機抖動
    return s2;
  };
  const pool: number[] = [];
  // 種子對都加 jitter: 每次可能揀唔同嘅共現對 (次次唔同嘅關鍵)
  const strongPairs = s.cooccur
    .filter(x => x.count >= 3)
    .map(x => ({ ...x, j: jitter > 0 ? jit(0) : 0 }))
    .sort((a, b) => (b.count + b.j) - (a.count + a.j))
    .slice(0, 25);
  for (const x of strongPairs) {
    const [a, b] = x.pair.split(',').map(Number);
    if (!lastNums.has(a) && !lastNums.has(b) && !pool.includes(a) && !pool.includes(b)) pool.push(a, b);
    if (pool.length >= 8) break;
  }
  while (pool.length < 10) {
    const rest = candidates.filter(n => !pool.includes(n));
    if (!rest.length) break;
    let best = rest[0], bs = -Infinity;
    for (const n of rest) { const sc = score(n, pool); if (sc > bs) { bs = sc; best = n; } }
    pool.push(best);
  }
  for (let i = 0; i < 40; i++) {
    const odd = pool.filter(n => n % 2 === 1).length;
    const small = pool.filter(n => n <= 24).length;
    if (odd >= 3 && odd <= 7 && small >= 3 && small <= 7) break;
    if (odd > 7) {
      const oo = pool.filter(n => n % 2 === 1), eo = candidates.filter(n => !pool.includes(n) && n % 2 === 0);
      if (oo.length && eo.length) {
        pool.splice(pool.indexOf(oo[0]), 1);
        let b = eo[0], bsc = -Infinity;
        for (const n of eo) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    } else if (odd < 3) {
      const ee = pool.filter(n => n % 2 === 0), oo = candidates.filter(n => !pool.includes(n) && n % 2 === 1);
      if (ee.length && oo.length) {
        pool.splice(pool.indexOf(ee[0]), 1);
        let b = oo[0], bsc = -Infinity;
        for (const n of oo) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    }
    const sm = pool.filter(n => n <= 24).length;
    if (sm > 7) {
      const sms = pool.filter(n => n <= 24), bg = candidates.filter(n => !pool.includes(n) && n > 24);
      if (sms.length && bg.length) {
        pool.splice(pool.indexOf(sms[0]), 1);
        let b = bg[0], bsc = -Infinity;
        for (const n of bg) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    } else if (sm < 3) {
      const bg = pool.filter(n => n > 24), sms = candidates.filter(n => !pool.includes(n) && n <= 24);
      if (bg.length && sms.length) {
        pool.splice(pool.indexOf(bg[0]), 1);
        let b = sms[0], bsc = -Infinity;
        for (const n of sms) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    }
  }
  // 平衡完之後, pool 有 10 個 — 再補多 5 個做 15 字版
  while (pool.length < 15) {
    const rest = candidates.filter(n => !pool.includes(n));
    if (!rest.length) break;
    let best = rest[0], bs = -Infinity;
    for (const n of rest) { const sc = score(n, pool); if (sc > bs) { bs = sc; best = n; } }
    pool.push(best);
  }
  // 15 字平衡 (奇偶 5-10, 大小 5-10)
  for (let i = 0; i < 40; i++) {
    const odd = pool.filter(n => n % 2 === 1).length;
    const small = pool.filter(n => n <= 24).length;
    if (odd >= 5 && odd <= 10 && small >= 5 && small <= 10) break;
    if (odd > 10) {
      const oo = pool.filter(n => n % 2 === 1), eo = candidates.filter(n => !pool.includes(n) && n % 2 === 0);
      if (oo.length && eo.length) {
        pool.splice(pool.indexOf(oo[0]), 1);
        let b = eo[0], bsc = -Infinity;
        for (const n of eo) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    } else if (odd < 5) {
      const ee = pool.filter(n => n % 2 === 0), oo = candidates.filter(n => !pool.includes(n) && n % 2 === 1);
      if (ee.length && oo.length) {
        pool.splice(pool.indexOf(ee[0]), 1);
        let b = oo[0], bsc = -Infinity;
        for (const n of oo) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    }
    const sm = pool.filter(n => n <= 24).length;
    if (sm > 10) {
      const sms = pool.filter(n => n <= 24), bg = candidates.filter(n => !pool.includes(n) && n > 24);
      if (sms.length && bg.length) {
        pool.splice(pool.indexOf(sms[0]), 1);
        let b = bg[0], bsc = -Infinity;
        for (const n of bg) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    } else if (sm < 5) {
      const bg = pool.filter(n => n > 24), sms = candidates.filter(n => !pool.includes(n) && n <= 24);
      if (bg.length && sms.length) {
        pool.splice(pool.indexOf(bg[0]), 1);
        let b = sms[0], bsc = -Infinity;
        for (const n of sms) { const sc = score(n, pool); if (sc > bsc) { bsc = sc; b = n; } }
        pool.push(b);
      }
    }
  }
  const main10 = pool.slice(0, 10).sort((a, b) => a - b);
  const main15 = pool.slice(0, 15).sort((a, b) => a - b);
  const reasons = main15.map(n => {
    const parts = [`25年出${Math.round(freq[n] || baseAvg)}次`];
    const rc = recentMap[n] || 0;
    if (rc >= 10) parts.push(`近50期出${rc}次(火熱)`);
    if ((gapMap[n] || 0) >= 10) parts.push(`已${gapMap[n]}期未出`);
    if (n === 13) parts.push('特別號之王');
    let bestPair = 0, bestC = 0;
    for (const o of main15) {
      if (o === n) continue;
      const pair = n < o ? `${n},${o}` : `${o},${n}`;
      if (co[pair] > bestC) { bestC = co[pair]; bestPair = o; }
    }
    if (bestPair && bestC >= 15) parts.push(`同${bestPair}共現${bestC}次`);
    return { num: n, why: parts.join('、') };
  });
  const [yy, nn] = s.last_draw.split('/');
  return { main10, main15, reasons, target_draw: `${yy}/${String(Number(nn) + 1).padStart(3, '0')}`, based_on: `${N}期數據` };
}
