// 智能隨機選號器 — 條件限制選號
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import type { Draw } from '../lib/analyzer';

interface GeneratorProps {
  lastNumbers?: number[]; // 最新一期號碼 (排除用)
  history?: Draw[];       // 完整歷史 (排除過去 N 期用)
}

export function SmartGenerator({ lastNumbers, history }: GeneratorProps) {
  const [excludeLast, setExcludeLast] = useState(true);   // 排除過去N期
  const [excludeWeeks, setExcludeWeeks] = useState(10);   // 排除幾多期
  const [oddEven, setOddEven] = useState<'3:3' | '2:4' | 'any'>('3:3');  // 單雙比例
  const [bigSmall, setBigSmall] = useState<'3:3' | 'any'>('3:3');         // 大細比例
  const [count, setCount] = useState(5);  // 生成幾多組
  const [results, setResults] = useState<number[][]>([]);

  // 自動放寬: 排除太多令到池太細 (唔夠生成唔重複組合) → 自動減排除期數
  // 用戶要求「唔可以全部一樣」— 就算排除 10 期得 6 個號碼, 都應該自動調整到有變化
  const effectiveConfig = useMemo(() => {
    if (!excludeLast) return { weeks: excludeWeeks, autoReduced: false, poolSize: 49 };
    let weeks = excludeWeeks;
    let poolSize = 0;
    while (weeks >= 1) {
      const s = new Set<number>();
      const src = history && history.length > 0 ? history : [];
      const n = Math.min(weeks, src.length);
      for (let i = 0; i < n; i++) {
        for (const m of src[i].main) s.add(m);
        if (src[i].special) s.add(src[i].special);
      }
      poolSize = 49 - s.size;
      // 需要至少 10 個號碼先有 C(10,6)=210 種組合, 足夠生成多組唔重複
      if (poolSize >= 10) break;
      weeks--;
    }
    return { weeks, autoReduced: weeks < excludeWeeks, poolSize };
  }, [excludeLast, excludeWeeks, history]);

  const generate = () => {
    const sets: number[][] = [];
    const seen = new Set<string>();
    // 用自動調整後嘅排除期數
    const effWeeks = effectiveConfig.weeks;
    const src = history && history.length > 0 ? history : (lastNumbers ? [{ main: lastNumbers, special: 0 } as Draw] : []);
    const excludeSet = new Set<number>();
    if (excludeLast) {
      const n = Math.min(effWeeks, src.length);
      for (let i = 0; i < n; i++) {
        for (const m of src[i].main) excludeSet.add(m);
        if (src[i].special) excludeSet.add(src[i].special);
      }
    }
    const basePool: number[] = [];
    for (let n = 1; n <= 49; n++) if (!excludeLast || !excludeSet.has(n)) basePool.push(n);
    for (let s = 0; s < count * 20; s++) {  // 20 倍嘗試, 用盡先停
      const pool = [...basePool];
      if (pool.length < 6) break;
      // 洗牌
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      // 揀 6 個, 套用單雙/大細比例
      const picked: number[] = [];
      let tries = 0;
      while (picked.length < 6 && tries < 2000) {
        tries++;
        const idx = Math.floor(Math.random() * pool.length);
        const n = pool[idx];
        if (picked.includes(n)) continue;
        if (oddEven !== 'any') {
          const [oddTarget] = oddEven.split(':').map(Number);
          const curOdd = picked.filter(x => x % 2 === 1).length;
          const isOdd = n % 2 === 1;
          if (isOdd && curOdd >= oddTarget) continue;
          if (!isOdd && picked.length - curOdd >= 6 - oddTarget) continue;
        }
        if (bigSmall !== 'any') {
          const [smallTarget] = bigSmall.split(':').map(Number);
          const curSmall = picked.filter(x => x <= 24).length;
          const isSmall = n <= 24;
          if (isSmall && curSmall >= smallTarget) continue;
          if (!isSmall && picked.length - curSmall >= 6 - smallTarget) continue;
        }
        picked.push(n);
      }
      if (picked.length < 6) {
        const rest = pool.filter(n => !picked.includes(n));
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        for (const n of rest) {
          if (picked.length >= 6) break;
          picked.push(n);
        }
      }
      if (picked.length !== 6) continue;
      const sorted = [...picked].sort((a, b) => a - b);
      const key = sorted.join(',');
      if (seen.has(key)) continue;  // 跳過重複組合
      seen.add(key);
      sets.push(sorted);
      if (sets.length >= count) break;
    }
    setResults(sets);
  };

  const maxCombos = useMemo(() => {
    const poolSize = effectiveConfig.poolSize;
    if (poolSize < 6) return 0;
    // 近似上限: C(pool, 6), 但受限於單雙/大細比例
    let c = 1;
    for (let i = 0; i < 6; i++) c = c * (poolSize - i) / (i + 1);
    return Math.round(c);
  }, [effectiveConfig]);

  const resultsShown = results.length;

  return (
    <div className="gen-wrap">
      <Card title="🎲 智能隨機選號器" icon="🎲">
        <div className="gen-controls">
          <label className="gen-opt">
            <input type="checkbox" checked={excludeLast} onChange={e => setExcludeLast(e.target.checked)} />
            排除過去 <input type="number" min={1} max={50} value={excludeWeeks} disabled={!excludeLast}
              onChange={e => setExcludeWeeks(Number(e.target.value))} className="gen-num" /> 期開過嘅號碼
          </label>
          {excludeLast && effectiveConfig.autoReduced && (
            <div className="gen-note" style={{ borderColor: 'rgba(255,149,0,.4)', color: 'var(--text-2)', margin: 0 }}>
              ⚠️ 排除 {excludeWeeks} 期得返 {effectiveConfig.poolSize} 個號碼（唔夠變化）— 已自動放寬到排除 <b>{effectiveConfig.weeks}</b> 期，先夠生成唔重複組合
            </div>
          )}
          <label className="gen-opt">
            單雙比例
            <select value={oddEven} onChange={e => setOddEven(e.target.value as any)}>
              <option value="3:3">3:3（最主流）</option>
              <option value="2:4">2:4</option>
              <option value="any">不限</option>
            </select>
          </label>
          <label className="gen-opt">
            大細比例
            <select value={bigSmall} onChange={e => setBigSmall(e.target.value as any)}>
              <option value="3:3">3:3（最主流）</option>
              <option value="any">不限</option>
            </select>
          </label>
          <label className="gen-opt">
            生成組數
            <select value={count} onChange={e => setCount(Number(e.target.value))}>
              <option value={1}>1 組</option>
              <option value={3}>3 組</option>
              <option value={5}>5 組</option>
              <option value={10}>10 組</option>
            </select>
          </label>
          <button className="gen-btn" onClick={generate}>🎯 生成號碼</button>
        </div>

        {results.length > 0 && (
          <div className="gen-results">
            {resultsShown < count && (
              <div className="gen-note" style={{ borderColor: 'rgba(255,149,0,.4)', color: 'var(--text-2)' }}>
                ⚠️ 排除後得 {maxCombos} 種唔重複組合，只生成到 {resultsShown} 組（要更多就減少排除期數）
              </div>
            )}
            {results.map((set, i) => (
              <div className="gen-set" key={i}>
                <span className="gen-set-label">第 {i + 1} 組</span>
                <span className="hist-balls">
                  {set.map(n => <Ball key={n} n={n} cls="red" />)}
                </span>
                <span className="gen-set-meta">
                  {set.length === 6
                    ? (() => {
                        const odd = set.filter(n => n % 2 === 1).length;
                        const small = set.filter(n => n <= 24).length;
                        const oddOk = oddEven === 'any' || odd === Number(oddEven.split(':')[0]);
                        const smallOk = bigSmall === 'any' || small === Number(bigSmall.split(':')[0]);
                        return `${odd}奇${6 - odd}偶 · ${small}細${6 - small}大${(!oddOk || !smallOk) ? '（條件太緊，已自動放寬）' : ''}`;
                      })()
                    : '⚠️ 條件太緊，無法湊夠 6 個'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="gen-note">💡 溫馨提示：號碼係隨機，中獎機會同其他組合一樣 — 呢個工具係幫你揀「結構合理」嘅組合（避開極端單雙/大細），唔會增加中獎機率。</div>
    </div>
  );
}
