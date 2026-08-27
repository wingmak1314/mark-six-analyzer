#!/usr/bin/env python3
"""六合彩數據 watchdog — 開獎後檢查 GitHub Pages 有冇自動更新
- 每日 00:30 本地時間 (開獎日 21:30 攪珠後 ~3 小時, 等 GitHub Actions 3 個 runs 全部跑完)
- 檢查「最近一個已過攪珠時間嘅開獎日」嘅期數有冇喺站上出現
- 正常: 零輸出 (silent); 異常: 輸出警報
- 農曆新年停攪窗口唔報警
"""
import json
import sys
import urllib.request
from datetime import datetime, timedelta

URL = "https://wingmak1314.github.io/mark-six-analyzer/history_full.json"

# 農曆新年六合彩休市窗口 (年份, 停攪期間) — 呢啲日子唔會開獎, 唔好誤報
CNY_WINDOWS = [
    (datetime(2026, 2, 14).date(), datetime(2026, 2, 24).date()),
    (datetime(2027, 2, 3).date(), datetime(2027, 2, 13).date()),
    (datetime(2028, 1, 22).date(), datetime(2028, 2, 1).date()),
]

def hk_now():
    return datetime.utcnow() + timedelta(hours=8)

def is_draw_day(d):
    return d.weekday() in (1, 3, 5)  # 二四六

def prev_draw_day(d):
    while not is_draw_day(d):
        d -= timedelta(days=1)
    return d

def elapsed_draw_days(d1, d2):
    """d1 之後到 d2 為止有幾多個開獎日 (d1 唔計, d2 計)"""
    n = 0
    day = d1 + timedelta(days=1)
    while day <= d2:
        if is_draw_day(day):
            n += 1
        day += timedelta(days=1)
    return n

def in_cny(d):
    return any(a <= d <= b for a, b in CNY_WINDOWS)

def main():
    now = hk_now()
    today = now.date()
    # 目標 = 最近一個已經完咗攪珠嘅開獎日 (00:30 跑, 今日 21:30 未到, 一定係上一個)
    target = prev_draw_day(today - timedelta(days=1))
    if in_cny(target):
        return  # 休市, silent
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            draws = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"⚠️ 六合彩數據監察: 抓唔到 history_full.json ({e})")
        return
    if not draws:
        print("⚠️ 六合彩數據監察: history_full.json 係空檔案")
        return
    latest = draws[0]
    latest_date = datetime.strptime(latest["date"], "%d/%m/%Y").date()
    # 如果最新一期就係目標開獎日 (或更新) → 正常
    if latest_date >= target:
        return  # silent
    # 期號檢查: 預期 = 最新期號 + 期間開獎日數
    elapsed = elapsed_draw_days(latest_date, target)
    expected_no = int(latest["draw"].split("/")[1]) + elapsed
    expected = f"{target.year - 2000:02d}/{expected_no:03d}"
    if latest["draw"] == expected:
        return  # 期號啱 (日期顯示舊可能係 lottery.hk 未改) — silent
    print(
        f"⚠️ 六合彩數據未更新! 站上最新: {latest['draw']} ({latest['date']}), "
        f"預期 {expected} ({target:%d/%m/%Y})。"
        f"睇下 GitHub Actions: https://github.com/wingmak1314/mark-six-analyzer/actions"
    )

if __name__ == "__main__":
    main()
