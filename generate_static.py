#!/usr/bin/env python3
"""
Generate static data.json for GitHub Pages — 零 backend
========================================================
讀 mark-six-tracker 嘅數據, pre-compute 所有統計, 輸出 site/data.json
前端直接 fetch data.json, 唔使 API server。

用法: python3 generate_static.py
"""
import json, os, math
from collections import Counter
from itertools import combinations

BASE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
CACHE = os.path.join(HOME, "mark-six-tracker", "history_full.json")
PREDS = os.path.join(HOME, "mark-six-tracker", "predictions_auto.json")
OUT = os.path.join(BASE, "site", "data.json")

def load_draws():
    with open(CACHE, encoding="utf-8") as f:
        raw = f.read()
    return json.loads(raw)

def main():
    draws = load_draws()
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

    preds = {"recommendations": [], "results": []}
    if os.path.exists(PREDS):
        with open(PREDS, encoding="utf-8") as f:
            preds = json.load(f)

    data = {
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
        "cooccur": [{"pair": f"{a},{b}", "count": c} for (a, b), c in co.most_common(15)],
        "recommendations": preds.get("recommendations", [])[-3:],
        "results": preds.get("results", [])[-10:],
        "generated": __import__("datetime").datetime.now().isoformat(),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"✅ data.json generated: {os.path.getsize(OUT):,} bytes, {N} draws")

if __name__ == "__main__":
    main()
