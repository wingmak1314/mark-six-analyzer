// 下次開獎倒數 — 顯示幾時截飛
import { useEffect, useState } from 'react';

// 六合彩開獎日: 星期二、四、六 21:30 (香港時間, UTC+8)
function nextDrawTime(): { day: string; date: string; isToday: boolean } {
  const now = new Date();
  // 轉香港時間
  const hk = new Date(now.getTime() + 8 * 3600 * 1000);
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const today = hk.getUTCDay();
  // 開獎日: 2 (二), 4 (四), 6 (六)
  const drawDays = [2, 4, 6];
  let offset = 0;
  // 如果今日係開獎日但已經過咗 21:30 (截飛), 跳去下一日
  // 用分鐘數比較, 避免 22:00-22:29 窗口錯判 (hours>=21 && minutes>=30 會漏)
  const nowMin = hk.getUTCHours() * 60 + hk.getUTCMinutes();
  if (drawDays.includes(today) && nowMin >= 21 * 60 + 30) offset = 1;
  while (!drawDays.includes((today + offset) % 7)) offset++;
  const target = new Date(hk);
  target.setUTCDate(target.getUTCDate() + offset);
  target.setUTCHours(21, 30, 0, 0);
  const dateStr = `${target.getUTCDate()}/${target.getUTCMonth() + 1}/${target.getUTCFullYear()}`;
  return {
    day: days[(today + offset) % 7],
    date: dateStr,
    isToday: offset === 0,
  };
}

export function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const nxt = nextDrawTime();
  // 目標時間 (UTC) - 而家 (now 係 timestamp number, 直接用)
  const hkNow = new Date(now + 8 * 3600 * 1000);
  const target = new Date(hkNow);
  let offset = 0;
  while (![2, 4, 6].includes((hkNow.getUTCDay() + offset) % 7)) offset++;
  target.setUTCDate(target.getUTCDate() + offset);
  target.setUTCHours(21, 30, 0, 0);
  // 如果目標時間已經過咗 (今日開獎完咗), 跳去下一個開獎日
  let diff = target.getTime() - hkNow.getTime();
  if (diff <= 0) {
    // 由今日開始搵下一個開獎日 (offset 由 1 開始)
    offset = 1;
    while (![2, 4, 6].includes((hkNow.getUTCDay() + offset) % 7)) offset++;
    target.setUTCDate(target.getUTCDate() + offset - 1);
    target.setUTCHours(21, 30, 0, 0);
    diff = target.getTime() - hkNow.getTime();
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="countdown">
      <span className="cd-label">⏰ 下次開獎（{nxt.day} {nxt.date}）</span>
      <span className="cd-time">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
      {nxt.isToday && <span className="cd-today">今日 21:30 開獎</span>}
    </div>
  );
}
