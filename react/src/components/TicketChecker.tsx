// 自動核對 — 輸入飛 → 對比最新一期 → 計中獎
import { useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import type { Draw } from '../lib/analyzer';

const PRIZES: { match: string; prize: string; key: string }[] = [
  { match: '6 個主號碼', prize: '頭獎（最低 $800萬，視乎彩池）', key: '頭獎' },
  { match: '5 + 特別號', prize: '二獎（~$100萬）', key: '二獎' },
  { match: '5 個主號碼', prize: '三獎（~$8萬）', key: '三獎' },
  { match: '4 + 特別號', prize: '四獎（~$3,000）', key: '四獎' },
  { match: '4 個主號碼', prize: '五獎（~$300）', key: '五獎' },
  { match: '3 + 特別號', prize: '六獎（$40）', key: '六獎' },
  { match: '3 個主號碼', prize: '七獎（$20）', key: '七獎' },
];

export function TicketChecker({ latestDraw }: { latestDraw?: Draw }) {
  const [nums, setNums] = useState<string[]>(['', '', '', '', '', '']);
  const [special, setSpecial] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const check = () => {
    if (!latestDraw) { setResult('⚠️ 未有最新開獎數據'); return; }
    const myNums = nums.map(n => Number(n.trim()));
    const mySpecial = Number(special.trim());
    if (myNums.some(n => !n || n < 1 || n > 49) || !mySpecial || mySpecial < 1 || mySpecial > 49) {
      setResult('⚠️ 請輸入有效號碼（1-49）');
      return;
    }
    if (new Set(myNums).size !== 6) {
      setResult('⚠️ 6 個主號碼唔可以重複');
      return;
    }
    const drawn = new Set(latestDraw.main);
    const hits = myNums.filter(n => drawn.has(n)).length;
    // 特別號必須對應開出嘅特別號 (你個特別號喺開出主號碼入面唔算中)
    const spHit = mySpecial === latestDraw.special;

    // 獎級 (HKJC 規則): 主號碼 + 特別號 對應
    let tier = '';
    if (hits === 6) tier = '🎉 頭獎！';
    else if (hits === 5 && spHit) tier = '🏆 二獎！';
    else if (hits === 5) tier = '🥈 三獎！';
    else if (hits === 4 && spHit) tier = '🥉 四獎！';
    else if (hits === 4) tier = '💰 五獎！';
    else if (hits === 3 && spHit) tier = '💵 六獎！';
    else if (hits === 3) tier = '💷 七獎！';
    else tier = '😢 冇中獎';

    const prize = PRIZES.find(p => tier.includes(p.key));
    setResult(`中 ${hits} 個主號碼${spHit ? ' + 特別號' : ''} → ${tier}${prize ? `（${prize.prize}）` : ''}`);
  };

  const handleNum = (i: number, v: string) => {
    const next = [...nums];
    next[i] = v.replace(/[^\d]/g, '').slice(0, 2);
    setNums(next);
  };

  return (
    <Card title="🧾 自動核對 — 你買咗嘅飛中咗未？" icon="🧾">
      <div className="check-draw">
        {latestDraw ? (
          <>最新一期：<b>{latestDraw.draw}</b>（{latestDraw.date}）開出{' '}
            {latestDraw.main.map(n => <Ball key={n} n={n} cls="red" />)}
            <span className="plus">+</span><Ball n={latestDraw.special} cls="sp" />
          </>
        ) : <span>載入中…</span>}
      </div>
      <div className="check-inputs">
        <span className="check-label">你嘅主號碼：</span>
        {nums.map((v, i) => (
          <input key={i} className="check-num" value={v} placeholder="1-49"
            onChange={e => handleNum(i, e.target.value)} inputMode="numeric" />
        ))}
      </div>
      <div className="check-inputs">
        <span className="check-label">特別號：</span>
        <input className="check-num" value={special} placeholder="1-49" inputMode="numeric"
          onChange={e => setSpecial(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} />
        <button className="gen-btn" onClick={check}>🔍 核對</button>
      </div>
      {result && <div className="check-result">{result}</div>}
      <div className="check-prizes">
        <table>
          <thead><tr><th>中獎條件</th><th>獎金</th></tr></thead>
          <tbody>
            {PRIZES.map(p => <tr key={p.match}><td>{p.match}</td><td>{p.prize}</td></tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
