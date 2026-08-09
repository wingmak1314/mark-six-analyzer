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

  // 過去 N 期開過嘅號碼 (排除池) — 主號碼 + 特別號都計
  const recentNums = useMemo(() => {
    if (!excludeLast) return new Set<number>();
    const src = history && history.length > 0 ? history : (lastNumbers ? [{ main: lastNumbers, special: 0 } as Draw] : []);
    const n = Math.min(Math.max(1, excludeWeeks), src.length);
    const s = new Set<number>();
    for (let i = 0; i < n; i++) {
      for (const m of src[i].main) s.add(m);
      if (src[i].special) s.add(src[i].special);
    }
    return s;
  }, [excludeLast, excludeWeeks, history, lastNumbers]);

  const generate = () => {
    const sets: number[][] = [];
    for (let s = 0; s < count; s++) {
      const pool: number[] = [];
      for (let n = 1; n <= 49; n++) {
        if (excludeLast && recentNums.has(n)) continue;
        pool.push(n);
      }
      if (pool.length < 6) { sets.push([]); continue; }

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
        // 單雙比例檢查
        if (oddEven !== 'any') {
          const [oddTarget] = oddEven.split(':').map(Number);
          const curOdd = picked.filter(x => x % 2 === 1).length;
          const isOdd = n % 2 === 1;
          if (isOdd && curOdd >= oddTarget) continue;
          if (!isOdd && picked.length - curOdd >= 6 - oddTarget) continue;
        }
        // 大細比例檢查 (1-24 細, 25-49 大)
        if (bigSmall !== 'any') {
          const [smallTarget] = bigSmall.split(':').map(Number);
          const curSmall = picked.filter(x => x <= 24).length;
          const isSmall = n <= 24;
          if (isSmall && curSmall >= smallTarget) continue;
          if (!isSmall && picked.length - curSmall >= 6 - smallTarget) continue;
        }
        picked.push(n);
      }
      // 條件太緊 (排除後 pool 唔夠平衡) → 自動放寬, 用剩餘號碼補滿 6 個
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
      sets.push([...picked].sort((a, b) => a - b));
    }
    setResults(sets);
  };

  return (
    <div className="gen-wrap">
      <Card title="🎲 智能隨機選號器" icon="🎲">
        <div className="gen-controls">
          <label className="gen-opt">
            <input type="checkbox" checked={excludeLast} onChange={e => setExcludeLast(e.target.checked)} />
            排除過去 <input type="number" min={1} max={50} value={excludeWeeks} disabled={!excludeLast}
              onChange={e => setExcludeWeeks(Number(e.target.value))} className="gen-num" /> 期開過嘅號碼
          </label>
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
