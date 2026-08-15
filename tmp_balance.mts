import { analyzeStatic, predictStatic } from './react/src/lib/analyzer.ts';
import * as fs from 'fs';

const draws = JSON.parse(fs.readFileSync('history_full.json', 'utf8'));
const data = analyzeStatic(draws);

function profile(nums: number[]) {
  const odd = nums.filter(n => n % 2 === 1).length;
  const small = nums.filter(n => n <= 24).length;
  return { odd, small };
}

let bad10 = 0, bad15 = 0;
const odd10 = {}, odd15 = {};
for (let s = 0; s < 200; s++) {
  const p = predictStatic(data, 12, s);
  const a = profile(p.main10);
  const b = profile(p.main15);
  odd10[a.odd] = (odd10[a.odd] || 0) + 1;
  odd15[b.odd] = (odd15[b.odd] || 0) + 1;
  // 10字目標 3-7 奇, 15字目標 5-10 奇 (代碼內嘅平衡範圍)
  if (a.odd < 3 || a.odd > 7) bad10++;
  if (b.odd < 5 || b.odd > 10) bad15++;
}
console.log('main10 奇數分佈 (200 seeds):', odd10);
console.log('main15 奇數分佈 (200 seeds):', odd15);
console.log(`main10 超出3-7奇: ${bad10}/200`, `| main15 超出5-10奇: ${bad15}/200`);

// 大細分佈
const small10 = {}, small15 = {};
let badSmall10 = 0, badSmall15 = 0;
for (let s = 0; s < 200; s++) {
  const p = predictStatic(data, 12, s);
  const a = profile(p.main10), b = profile(p.main15);
  small10[a.small] = (small10[a.small] || 0) + 1;
  small15[b.small] = (small15[b.small] || 0) + 1;
  if (a.small < 3 || a.small > 7) badSmall10++;
  if (b.small < 5 || b.small > 10) badSmall15++;
}
console.log('main10 細數分佈:', small10, '| main15 細數分佈:', small15);
console.log(`main10 超出3-7細: ${badSmall10}/200`, `| main15 超出5-10細: ${badSmall15}/200`);

// 連號 (46% 歷史含連號 — 唔應該避開)
let consec10 = 0, consec15 = 0;
for (let s = 0; s < 200; s++) {
  const p = predictStatic(data, 12, s);
  const c10 = [...p.main10].sort((a,b)=>a-b);
  const c15 = [...p.main15].sort((a,b)=>a-b);
  const has = (arr) => arr.some((n,i)=>i<arr.length-1 && arr[i+1]===arr[i]+1);
  if (has(c10)) consec10++;
  if (has(c15)) consec15++;
}
console.log(`main10 含連號: ${consec10}/200`, `| main15 含連號: ${consec15}/200`);
