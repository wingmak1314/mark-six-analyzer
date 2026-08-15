// 下次開獎倒數 — 顯示幾時截飛
import { useEffect, useState } from 'react';

// 六合彩開獎日: 星期二、四、六 21:30 (香港時間, UTC+8)
const DAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const DRAW_DAYS = [2, 4, 6];  // 二、四、六

// 由 now (ms timestamp) 計下次開獎 (統一邏輯, 唔再重複計兩次)
function nextDrawInfo(nowMs: number) {
  const hk = new Date(nowMs + 8 * 3600 * 1000);  // 香港時間 (UTC+8)
  const today = hk.getUTCDay();
  const nowMin = hk.getUTCHours() * 60 + hk.getUTCMinutes();

  // 今日係開獎日但已過 21:30 (截飛) → 跳去下一日
  let offset = DRAW_DAYS.includes(today) && nowMin >= 21 * 60 + 30 ? 1 : 0;
  while (!DRAW_DAYS.includes((today + offset) % 7)) offset++;

  const target = new Date(hk);
  target.setUTCDate(target.getUTCDate() + offset);
  target.setUTCHours(21, 30, 0, 0);

  return {
    day: DAYS[(today + offset) % 7],
    date: `${target.getUTCDate()}/${target.getUTCMonth() + 1}/${target.getUTCFullYear()}`,
    isToday: offset === 0,
    diff: target.getTime() - hk.getTime(),
  };
}

export function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const nxt = nextDrawInfo(now);
  const diff = Math.max(0, nxt.diff);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="countdown">
      <span className="cd-label">⏰ 下次開獎（{nxt.day} {nxt.date}）</span>
      <span className="cd-time">
        {d > 0 ? `${d}日 ` : ''}{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
      {nxt.isToday && <span className="cd-today">今日 21:30 開獎</span>}
    </div>
  );
}
