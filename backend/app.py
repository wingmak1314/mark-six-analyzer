#!/usr/bin/env python3
"""
Mark Six Analyzer WebApp — FastAPI backend
==========================================
提供 API:
  GET /                → 前端儀表板
  GET /api/stats       → 5年統計 (頻率/奇偶/大小/連號/尾數/區間)
  GET /api/cooccur     → 最強共現對
  GET /api/recommend   → 最新推薦 (program + 心水)
  GET /api/history?n=20→ 最近N期開獎
  GET /api/check       → 上次推薦 vs 最新開獎對比

用法: python3 app.py  (port 8100)
"""
import json, os, math
from collections import Counter
from itertools import combinations
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
FRONTEND = os.path.join(ROOT, "frontend")
HOME = os.path.expanduser("~")
CACHE = os.path.join(HOME, "mark-six-tracker", "history_full.json")
PREDS = os.path.join(HOME, "mark-six-tracker", "predictions_auto.json")

app = FastAPI(title="六合彩分析", version="1.0")

def load_draws():
    with open(CACHE, encoding="utf-8") as f:
        return json.load(f)

def load_preds():
    if os.path.exists(PREDS):
        with open(PREDS, encoding="utf-8") as f:
            return json.load(f)
    return {"recommendations": [], "results": []}

def compute_stats(draws):
    N = len(draws)
    full = [d["main"] for d in draws]
    freq = Counter(n for d in full for n in d)
    sp_freq = Counter(d["special"] for d in draws)

    # 奇偶
    oe = Counter()
    for d in full:
        odd = sum(1 for n in d if n % 2 == 1)
        oe[f"{odd}奇{6-odd}偶"] += 1
    # 大小
    sd = Counter()
    for d in full:
        small = sum(1 for n in d if n <= 24)
        sd[f"{small}細{6-small}大"] += 1
    # 尾數
    tail = Counter()
    for d in full:
        for n in d:
            tail[f"尾{n%10}"] += 1
    # 區間
    zones = Counter()
    for d in full:
        for n in d:
            if n <= 10: zones["1-10"] += 1
            elif n <= 20: zones["11-20"] += 1
            elif n <= 30: zones["21-30"] += 1
            elif n <= 40: zones["31-40"] += 1
            else: zones["41-49"] += 1
    # 連號
    consec = sum(1 for d in full if any(sorted(d)[i+1] == sorted(d)[i]+1 for i in range(5)))
    # 重複
    reps = [len(set(full[i-1]) & set(full[i])) for i in range(1, N)]

    return {
        "total_draws": N,
        "first_draw": draws[-1]["draw"],
        "last_draw": draws[0]["draw"],
        "last_date": draws[0]["date"],
        "last_numbers": draws[0]["main"],
        "last_special": draws[0]["special"],
        "freq_top": [{"num": n, "count": c} for n, c in freq.most_common(15)],
        "freq_bottom": [{"num": n, "count": c} for n, c in freq.most_common()[-10:]],
        "special_top": [{"num": n, "count": c} for n, c in sp_freq.most_common(8)],
        "odd_even": oe.most_common(6),
        "size": sd.most_common(6),
        "tail": tail.most_common(10),
        "zones": zones.most_common(5),
        "consec_pct": round(consec / N * 100, 1),
        "repeat_avg": round(sum(reps) / len(reps), 2) if reps else 0,
    }

def compute_cooccur(draws):
    co = Counter()
    for d in draws:
        for pair in combinations(sorted(d["main"]), 2):
            co[pair] += 1
    return [{"pair": f"{a},{b}", "count": c} for (a, b), c in co.most_common(15)]

@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND, "index.html"))

@app.get("/api/stats")
def stats():
    draws = load_draws()
    return compute_stats(draws)

@app.get("/api/cooccur")
def cooccur():
    draws = load_draws()
    return {"pairs": compute_cooccur(draws)}

@app.get("/api/recommend")
def recommend():
    preds = load_preds()
    recs = preds.get("recommendations", [])
    latest = recs[-1] if recs else None
    return {"latest": latest, "all": recs[-5:] if recs else []}

@app.get("/api/check")
def check():
    preds = load_preds()
    results = preds.get("results", [])
    return {"results": results[-10:] if results else []}

@app.get("/api/history")
def history(n: int = Query(20, ge=1, le=100)):
    draws = load_draws()
    return {"draws": draws[:n]}

# 靜態資源
app.mount("/static", StaticFiles(directory=FRONTEND), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
