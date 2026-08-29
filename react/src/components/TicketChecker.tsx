// 自動核對 — 輸入飛 → 對比最新一期 → 計中獎
// 附全獎項精確機率 (三變量超幾何: P(K=k,S=s) = C(6,k)C(1,s)C(42,6-k-s)/C(49,6))
import { useState } from 'react';
import { Ball } from './Ball';
import { Card } from './Card';
import { prizeTiers, totalWinProb } from '../lib/analyzer';
import type { Draw } from '../lib/analyzer';

const PRIZE_AMOUNTS: Record<string, string> = {
  '頭獎': '最低 $800萬，視乎彩池',
  '二獎': '約 $100萬',
  '三獎': '約 $8萬',
  '四獎': '約 $3,000',
  '五獎': '約 $300',
  '六獎': '$40',
  '七獎': '$20',
};

function fmtOdds(odds: number): string {
  return odds >= 1_000_000 ? `1/${Math.round(odds / 1_000_000)}M` : `1/${Math.round(odds).toLocaleString()}`;
}

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
    if (myNums.includes(mySpecial)) {
      setResult('⚠️ 特別號唔可以同主號碼重複');
      return;
    }
    const drawn = new Set(latestDraw.main);
    const hits = myNums.filter(n => drawn.has(n)).length;
    // 特別號必須對應開出嘅特別號 (你個特別號喺開出主號碼入面唔算中)
    const spHit = mySpecial === latestDraw.special;

    // 獎級 (HKJC 規則): 主號碼 + 特別號 對應
    const tierKey = hits === 6 ? '頭獎'
      : hits === 5 && spHit ? '二獎'
      : hits === 5 ? '三獎'
      : hits === 4 && spHit ? '四獎'
      : hits === 4 ? '五獎'
      : hits === 3 && spHit ? '六獎'
      : hits === 3 ? '七獎'
      : '';
    const tierEmoji: Record<string, string> = { '頭獎': '🎉', '二獎': '🏆', '三獎': '🥈', '四獎': '🥉', '五獎': '💰', '六獎': '💵', '七獎': '💷' };
    const tier = tierKey ? `${tierEmoji[tierKey]} ${tierKey}！` : '😢 冇中獎';

    const amount = tierKey ? PRIZE_AMOUNTS[tierKey] : '';
    setResult(`中 ${hits} 個主號碼${spHit ? ' + 特別號' : ''} → ${tier}${amount ? `（${amount}）` : ''}`);
  };

  const handleNum = (i: number, v: string) => {
    const next = [...nums];
    next[i] = v.replace(/[^\d]/g, '').slice(0, 2);
    setNums(next);
  };

  const tiers = prizeTiers();

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
          <thead><tr><th>中獎條件</th><th>獎金</th><th>單注機率</th></tr></thead>
          <tbody>
            {tiers.map(t => (
              <tr key={t.name}>
                <td>{t.name} — {t.main} 個主號碼{t.specialNeeded ? ' + 特別號' : ''}</td>
                <td>{PRIZE_AMOUNTS[t.name]}</td>
                <td>{fmtOdds(t.odds)}（{(t.prob * 100).toFixed(6)}%）</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="check-note">
          📊 單式一注總中獎機率（七獎或以上）：<b className="hitrate-good">{(totalWinProb() * 100).toFixed(4)}%</b>（約每 {(1 / totalWinProb()).toFixed(1)} 注中一注）· 頭獎固定 1/13,983,816
        </div>
      </div>
    </Card>
  );
}
