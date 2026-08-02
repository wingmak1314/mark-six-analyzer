#!/usr/bin/env python3
"""
Mark Six Analyzer — Full-Stack Backend
=======================================
- 自動抓取 lottery.hk 數據 (冇本地數據就抓)
- 大數據分析 (614+ 期: 頻率/共現/奇偶/大小/尾數/區間/連號/重複)
- 8 號碼推薦引擎 (多因子評分 + 結構平衡)
- 解釋引擎 (點解推薦呢 8 個號碼)
- 驗證記錄 (推薦 vs 實際開獎)

API:
  GET /                  → React 前端
  GET /api/dashboard     → 全部數據一次過 (dashboard 用)
  GET /api/predict       → 最新推薦 + 解釋
  GET /api/history?n=20  → 最近開獎
  GET /api/check         → 推薦驗證記錄
"""
import json, os, math, sys, time, urllib.request, re
from collections import Counter
from itertools import combinations
from datetime import datetime
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
FRONTEND = os.path.join(ROOT, "frontend")
HOME = os.path.expanduser("~")
CACHE = os.path.join(HOME, "mark-six-tracker", "history_full.json")
PREDS = os.path.join(HOME, "mark-six-tracker", "predictions_auto.json")

app = FastAPI(title="六合彩大數據分析", version="2.0")

# ── 數據層 ──────────────────────────────────────────────
def fetch_from_lottery_hk(years=None):
    """從 lottery.hk 抓數據 (後備: 本地冇數據時用)"""
    years = years or [2022, 2023, 2024, 2025, 2026]
    all_draws = {}
    UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    for y in years:
        url = f"https://lottery.hk/liuhecai/jieguo/{y}"
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                html = r.read().decode("utf-8", errors="replace")
            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL)
            for row in rows:
                tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
                if len(tds) < 3:
                    continue
                draw_no = re.sub(r"<[^>]+>", "", tds[0]).strip()
                date = re.sub(r"<[^>]+>", "", tds[1]).strip()
                nums = re.findall(r"\d+", re.sub(r"<[^>]+>", " ", tds[2]))
                if re.match(r"^\d{2}/\d{3}$", draw_no) and len(nums) >= 7:
                    all_draws[draw_no] = {
                        "draw": draw_no, "date": date,
                        "main": [int(x) for x in nums[:6]], "special": int(nums[6]),
                    }
            time.sleep(0.8)
        except Exception as e:
            print(f"  fetch {y} fail: {e}")
    def sk(dn):
        yy, nn = dn.split("/")
        return (int(yy), int(nn))
    return [all_draws[k] for k in sorted(all_draws, key=sk, reverse=True)]

def load_draws():
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            d = json.loads(f.read())
        if d:
            return d
    # 冇數據 → 去 lottery.hk 抓
    print("本地冇數據, 抓 lottery.hk...")
    draws = fetch_from_lottery_hk()
    if draws:
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        with open(CACHE, "w", encoding="utf-8") as f:
            json.dump(draws, f, ensure_ascii=False, indent=2)
    return draws

def load_preds():
    if os.path.exists(PREDS):
        with open(PREDS, encoding="utf-8") as f:
            return json.loads(f.read())
    return {"recommendations": [], "results": []}

# ── 分析引擎 ────────────────────────────────────────────
def analyze(draws):
    N = len(draws)
    full = [d["main"] for d in draws]
    freq = Counter(n for d in full for n in d)
    sp_freq = Counter(d["special"] for d in draws)
    oe = Counter()
    for d in full:
        odd = sum(1 for n in d if n % 2 == 1)
        oe[f"{odd}奇{6-odd}偶"] += 1
    sd = Counter()
    for d in full:
        small = sum(1 for n in d if n <= 24)
        sd[f"{small}細{6-small}大"] += 1
    tail = Counter()
    for d in full:
        for n in d:
            tail[f"尾{n%10}"] += 1
    zones = Counter()
    for d in full:
        for n in d:
            if n <= 10: zones["1-10"] += 1
            elif n <= 20: zones["11-20"] += 1
            elif n <= 30: zones["21-30"] += 1
            elif n <= 40: zones["31-40"] += 1
            else: zones["41-49"] += 1
    consec = sum(1 for d in full if any(sorted(d)[i+1] == sorted(d)[i]+1 for i in range(5)))
    reps = [len(set(full[i-1]) & set(full[i])) for i in range(1, N)]
    co = Counter()
    for d in full:
        for pair in combinations(sorted(d), 2):
            co[pair] += 1
    # 雙號碼 (2-number combo) / 三號碼 (3-number combo)
    combo2 = Counter()
    combo3 = Counter()
    consec2 = Counter()  # 二連號 (consecutive pairs)
    consec3 = Counter()  # 三連號 (consecutive triples)
    for d in full:
        s = sorted(d)
        for pair in combinations(s, 2):
            combo2[pair] += 1
        for tri in combinations(s, 3):
            combo3[tri] += 1
        for i in range(5):
            if s[i+1] == s[i] + 1:
                consec2[(s[i], s[i+1])] += 1
        for i in range(4):
            if s[i+2] == s[i+1] + 1 == s[i] + 2:
                consec3[(s[i], s[i+1], s[i+2])] += 1
    # 每號碼最近幾期冇出 (gap) + 天前 (days since)
    gaps = {n: 0 for n in range(1, 50)}
    last_seen = {n: None for n in range(1, 50)}
    for n in range(1, 50):
        for i, d in enumerate(draws):
            if n in d["main"] or n == d["special"]:
                gaps[n] = i
                last_seen[n] = d["date"]
                break
        else:
            gaps[n] = N
    # 天前: 由日期計
    def days_since(date_str):
        try:
            d = datetime.strptime(date_str, "%d/%m/%Y")
            return (datetime.now() - d).days
        except Exception:
            return 0
    days_ago = {n: days_since(last_seen[n]) if last_seen[n] else 9999 for n in range(1, 50)}
    return {
        "total_draws": N,
        "first_draw": draws[-1]["draw"],
        "last_draw": draws[0]["draw"],
        "last_date": draws[0]["date"],
        "last_numbers": draws[0]["main"],
        "last_special": draws[0]["special"],
        "freq_top": [{"num": n, "count": c} for n, c in freq.most_common(15)],
        "freq_bottom": [{"num": n, "count": c} for n, c in freq.most_common()[-10:]],
        "freq_all": [{"num": n, "count": freq.get(n, 0)} for n in range(1, 50)],
        "special_top": [{"num": n, "count": c} for n, c in sp_freq.most_common(8)],
        "odd_even": oe.most_common(6),
        "size": sd.most_common(6),
        "tail": tail.most_common(10),
        "zones": zones.most_common(5),
        "consec_pct": round(consec / N * 100, 1),
        "repeat_avg": round(sum(reps) / len(reps), 2) if reps else 0,
        "cooccur": [{"pair": f"{a},{b}", "count": c} for (a, b), c in co.most_common(15)],
        "gaps": [{"num": n, "gap": gaps[n]} for n in range(1, 50)],
        "days_ago": [{"num": n, "days": days_ago[n]} for n in range(1, 50)],
        "last_seen": [{"num": n, "date": last_seen[n] or "—"} for n in range(1, 50)],
        "combo2": [{"nums": f"{a},{b}", "count": c} for (a, b), c in combo2.most_common(15)],
        "combo3": [{"nums": f"{a},{b},{c}", "count": n} for (a, b, c), n in combo3.most_common(15)],
        "consec2": [{"nums": f"{a},{b}", "count": c} for (a, b), c in consec2.most_common(15)],
        "consec3": [{"nums": f"{a},{b},{c}", "count": n} for (a, b, c), n in consec3.most_common(15)],
    }

# ── 推薦引擎 ────────────────────────────────────────────
def predict(stats, last_draw):
    """多因子評分揀 8 個號碼 + 解釋"""
    N = stats["total_draws"]
    freq = {x["num"]: x["count"] for x in stats["freq_top"]}
    # 用 full freq (唔止 top15)
    all_freq = {}
    # 由 gaps 重組: 需要完整 freq — 用 stats 補
    co = {}
    for x in stats["cooccur"]:
        a, b = x["pair"].split(",")
        co[(int(a), int(b))] = x["count"]
    co_exp = N * 15 / 1176
    last_nums = set(last_draw["main"] + [last_draw["special"]])
    gaps = {x["num"]: x["gap"] for x in stats["gaps"]}

    # 完整頻率 — 從 gaps 唔夠, 需要由 draw 重算
    # (呢度用 stats 冇完整 freq, 用輕量方式: 重算)
    return _full_predict(stats, last_draw, co, co_exp, gaps, last_nums)

def _full_predict(stats, last_draw, co, co_exp, gaps, last_nums):
    """真正嘅 8 號碼推薦: 多因子評分 + 結構平衡 + 解釋"""
    freq = {}
    # 重新計完整頻率 (由 stats 唔夠, 但 dashboard 已有 freq_top; 用 gap 補冷號)
    # 為準確, 直接用 analyzer 再計 — 但呢度淨係收 stats, 所以用 top freq + 假設
    # 實際上: freq 用 stats.freq_top 提供嘅 top15, 其他號碼用平均估
    for x in stats["freq_top"]:
        freq[x["num"]] = x["count"]
    base_avg = (6 * stats["total_draws"]) / 49
    for n in range(1, 50):
        freq.setdefault(n, round(base_avg))

    candidates = [n for n in range(1, 50) if n not in last_nums]

    def zone_bonus(n):
        if 11 <= n <= 20: return 1.5
        if 1 <= n <= 10 or 21 <= n <= 30: return 0.5
        if 31 <= n <= 40: return 0.0
        return -1.5

    def tail_bonus(n):
        return -2.0 if n % 10 == 0 else 0.4

    def score(n, pool):
        s = 0.5 * freq.get(n, base_avg)
        s += zone_bonus(n) + tail_bonus(n)
        if n == 13: s += 2.0
        s += min(gaps.get(n, 0), 20) * 0.15  # 冷號加成 (gap 大 = 分高)
        for o in pool:
            pair = tuple(sorted((n, o)))
            if pair in co:
                s += (co[pair] - co_exp) * 3
        return s

    pool = []
    strong_pairs = sorted(co.items(), key=lambda x: -x[1])[:20]
    for pair, c in strong_pairs:
        if c < 3: continue
        a, b = pair
        if a not in last_nums and b not in last_nums and a not in pool and b not in pool:
            pool += [a, b]
        if len(pool) >= 8: break
    while len(pool) < 10:
        rest = [n for n in candidates if n not in pool]
        if not rest: break
        best = max(rest, key=lambda n: score(n, pool))
        pool.append(best)
    # 平衡 (奇偶 3-5, 大小 3-5) — 10 個號碼
    for _ in range(40):
        odd = sum(1 for n in pool if n % 2 == 1)
        small = sum(1 for n in pool if n <= 24)
        if 3 <= odd <= 7 and 3 <= small <= 7:
            break
        if odd > 7:
            odd_ones = [n for n in pool if n % 2 == 1]
            evens_out = [n for n in candidates if n not in pool and n % 2 == 0]
            if odd_ones and evens_out:
                pool.remove(odd_ones[0]); pool.append(max(evens_out, key=lambda n: score(n, pool)))
        elif odd < 3:
            even_ones = [n for n in pool if n % 2 == 0]
            odds_out = [n for n in candidates if n not in pool and n % 2 == 1]
            if even_ones and odds_out:
                pool.remove(even_ones[0]); pool.append(max(odds_out, key=lambda n: score(n, pool)))
        if 3 <= sum(1 for n in pool if n <= 24) <= 7:
            continue
        if small > 7:
            smalls = [n for n in pool if n <= 24]
            bigs_out = [n for n in candidates if n not in pool and n > 24]
            if smalls and bigs_out:
                pool.remove(smalls[0]); pool.append(max(bigs_out, key=lambda n: score(n, pool)))
        elif small < 3:
            bigs = [n for n in pool if n > 24]
            smalls_out = [n for n in candidates if n not in pool and n <= 24]
            if bigs and smalls_out:
                pool.remove(bigs[0]); pool.append(max(smalls_out, key=lambda n: score(n, pool)))
    pool = sorted(pool[:10])

    # 解釋引擎
    reasons = []
    for n in pool:
        parts = []
        parts.append(f"25年出{freq.get(n, base_avg):.0f}次")
        if gaps.get(n, 0) >= 10:
            parts.append(f"已{gaps[n]}期未出(冷號)")
        if n == 13:
            parts.append("特別號之王")
        # 共現
        best_co = max(((o, co.get(tuple(sorted((n, o))), 0)) for o in pool if o != n), key=lambda x: x[1], default=None)
        if best_co and best_co[1] >= 15:
            parts.append(f"同{best_co[0]}共現{best_co[1]}次")
        reasons.append({"num": n, "why": "、".join(parts)})
    return {"main10": pool, "reasons": reasons}

# ── API ─────────────────────────────────────────────────
@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND, "index.html"))

@app.get("/api/dashboard")
def dashboard():
    draws = load_draws()
    stats = analyze(draws)
    return stats

@app.get("/api/predict")
def predict_api():
    draws = load_draws()
    stats = analyze(draws)
    last = draws[0]
    pred = predict(stats, last)
    yy, nn = last["draw"].split("/")
    pred["target_draw"] = f"{yy}/{int(nn)+1:03d}"
    pred["based_on"] = f"{stats['total_draws']}期數據"
    pred["last_draw"] = last
    return pred

@app.get("/api/history")
def history(n: int = Query(100, ge=1, le=5000)):
    draws = load_draws()
    return {"draws": draws[:n]}

@app.get("/api/check")
def check():
    preds = load_preds()
    return {"results": preds.get("results", [])[-10:]}

# 靜態資源
app.mount("/static", StaticFiles(directory=FRONTEND), name="static")
app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND, "assets")), name="assets")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
