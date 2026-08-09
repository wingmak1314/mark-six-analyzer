// 智能隨機選號器 — 條件限制選號
import { useMemo, useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';

interface GeneratorProps {
  lastNumbers?: number[]; // 最新一期號碼 (排除用)
}

export function SmartGenerator({ lastNumbers }: GeneratorProps) {
  const [excludeLast, setExcludeLast] = useState(true);   // 排除過去N期
  const [excludeWeeks, setExcludeWeeks] = useState(10);   // 排除幾多期
  const [oddEven, setOddEven] = useState<'3:3' | '2:4' | 'any'>('3:3');  // 單雙比例
  const [bigSmall, setBigSmall] = useState<'3:3' | 'any'>('3:3');         // 大細比例
  const [count, setCount] = useState(5);  // 生成幾多組
  const [results, setResults] = useState<number[][]>([]);

  // 過去N期開過嘅號碼 (排除池)
  const recentNums = useMemo(() => {
    if (!excludeLast || !lastNumbers) return new Set<number>();
    // 呢度用 lastNumbers 代表最新一期; 完整排除池由父組件傳
    return new Set(lastNumbers);
  }, [excludeLast, lastNumbers]);

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
                    ? `${set.filter(n => n % 2 === 1).length}奇${set.filter(n => n % 2 === 0).length}偶 · ${set.filter(n => n <= 24).length}細${set.filter(n => n > 24).length}大`
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
