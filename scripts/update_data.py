#!/usr/bin/env python3
"""
GitHub Actions 每日數據更新 — 抓 lottery.hk → merge → 更新 history_full.json
=============================================================================
- 由 GitHub Actions 自動執行 (零 token): 開獎日(二四六) 21:35 + 每日 21:50
- 自動偵測新一期 → 下載 → merge → push (唔使人工)
- 只 commit 有變化先 commit (避免無意義 commit loop)
- NTP 時間同步確保執行時間準確
"""
import json, os, re, socket, struct, sys, time, urllib.request
from datetime import datetime, timezone, timedelta

# 喺 GitHub Actions 環境: 用 repo 根目錄; 本地測試: 用 mark-six-tracker
if os.environ.get("GITHUB_WORKSPACE"):
    REPO = os.environ["GITHUB_WORKSPACE"]
    # 兼容 MSYS path (/c/Users/...) -> Windows path (C:\Users\...)
    if REPO.startswith("/c/"):
        REPO = REPO.replace("/c/", "C:/", 1)
    CACHE = os.path.join(REPO, "history_full.json")
else:
    HOME = os.path.expanduser("~")
    CACHE = os.path.join(HOME, "mark-six-tracker", "history_full.json")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

# ── NTP 時間同步 ──
def ntp_time(server="time.google.com", timeout=5):
    """向 NTP server 查詢 UTC 時間 (精確到秒)"""
    try:
        req = b'\x1b' + 47 * b'\0'
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(timeout)
        s.sendto(req, (server, 123))
        data, _ = s.recvfrom(1024)
        s.close()
        if len(data) < 40:
            return None
        # NTP 時間戳由第 40 字節開始 (seconds since 1900)
        ntp_sec = struct.unpack('!I', data[40:44])[0]
        return datetime.fromtimestamp(ntp_sec - 2208988800, tz=timezone.utc)
    except Exception:
        return None

def now_iso():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def fetch_year(year, timeout=15):
    """抓指定年份全部期數 (timeout 15秒, GitHub runner 慢就快速失敗)"""
    url = f"https://lottery.hk/liuhecai/jieguo/{year}"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        html = r.read().decode("utf-8", errors="replace")
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL)
    draws = {}
    for row in rows:
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
        if len(tds) < 3:
            continue
        draw_no = re.sub(r"<[^>]+>", "", tds[0]).strip()
        date = re.sub(r"<[^>]+>", "", tds[1]).strip()
        num_str = re.findall(r"\d+", re.sub(r"<[^>]+>", " ", tds[2]))
        if re.match(r"^\d{2}/\d{3}$", draw_no) and len(num_str) >= 7:
            main = [int(x) for x in num_str[:6]]
            sp = int(num_str[6])
            if all(1 <= n <= 49 for n in main + [sp]):
                draws[draw_no] = {"draw": draw_no, "date": date, "main": main, "special": sp}
    return draws

def main():
    # NTP 校時: 確保執行時間準確 (UTC → 香港 UTC+8)
    nt = ntp_time()
    if nt:
        hk = nt + timedelta(hours=8)
        print(f"🕐 NTP 校時: {nt.strftime('%Y-%m-%d %H:%M:%S')} UTC = 香港 {hk.strftime('%H:%M:%S')}")
    else:
        print("⚠️ NTP 校時失敗, 用系統時間")
    ts = now_iso()
    # 1. 讀現有數據
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            existing = json.loads(f.read())
    else:
        existing = []
    print(f"[{ts}] 現有: {len(existing)} 期")

    # 2. 抓今年 + 上年 (防跨年)
    today_year = datetime.now().year
    new_draws = {}
    for y in [today_year, today_year - 1]:
        try:
            ds = fetch_year(y)
            new_draws.update(ds)
            print(f"  ✓ 抓 {y}: {len(ds)} 期")
        except Exception as e:
            print(f"  ✗ {y}: {e}")
        time.sleep(1)

    if not new_draws:
        print("❌ 網站抓取失敗")
        sys.exit(1)

    # 3. Merge + 排序 (最新在前)
    def sk(dn):
        yy, nn = dn.split("/")
        return (int(yy), int(nn))
    all_draws = {d["draw"]: d for d in existing}
    all_draws.update(new_draws)
    merged = [all_draws[k] for k in sorted(all_draws, key=sk, reverse=True)]

    # 4. 有變化先寫入
    if merged == existing:
        print("✅ 已係最新, 冇新數據")
        return  # 冇變化 -> 唔 commit

    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    added = len(merged) - len(existing)
    print(f"✅ 更新: {len(existing)} → {len(merged)} 期 (+{added})")
    print(f"   最新: {merged[0]['draw']} ({merged[0]['date']})")

if __name__ == "__main__":
    main()
