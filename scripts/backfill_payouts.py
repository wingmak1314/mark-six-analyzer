#!/usr/bin/env python3
"""
增量 backfill: 抓 lottery.hk 單期結果頁嘅派彩數據 → 補齊 payouts.json
=============================================================================
- 增量: 只抓 payouts.json 未有嘅 draw (可以分多次跑, 每次補一截)
- 禮貌: 單 thread + 0.5s delay + 403 自動 backoff retry (唔會谷爆/被 ban)
- 每次抓完即時寫入 (中途中斷唔會冇咗已抓嘅數據)

用法:
  python scripts/backfill_payouts.py 250        # 補齊最近 250 期 (預設)
  python scripts/backfill_payouts.py all        # 補齊全部
"""
import json, os, re, sys, time, html, urllib.request, urllib.error

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(BASE, "history_full.json")
OUT = os.path.join(BASE, "payouts.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def strip_tags(t):
    t = re.sub(r'<script.*?</script>', '', t, flags=re.S)
    t = re.sub(r'<style.*?</style>', '', t, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = html.unescape(t)
    return re.sub(r'\s+', ' ', t)

def money(s):
    return int(s.replace(',', ''))

def to_iso(d):
    dd, mm, yy = d.split('/')
    return f"{yy}-{mm}-{dd}"

def parse_payout(text):
    r = {}
    m = re.search(r'總投注額\s*\$([\d,]+)', text)
    r['turnover'] = money(m.group(1)) if m else None
    m = re.search(r'總獎金基金\s*\$([\d,]+)', text)
    r['total_fund'] = money(m.group(1)) if m else None
    m = re.search(r'頭\s*獎\s*選中6個\s*\$([\d,]+)', text)
    r['first'] = money(m.group(1)) if m else None
    m = re.search(r'二\s*獎\s*選中5個\s*\+?\s*特別號碼?\s*\$([\d,]+)', text)
    r['second'] = money(m.group(1)) if m else None
    return r

def fetch_one(d):
    url = f"https://lottery.hk/liuhecai/jieguo/{to_iso(d['date'])}"
    backoff = [3, 10, 30]
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            html = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
            p = parse_payout(strip_tags(html))
            if p['first'] is None:
                return None  # 有頁但冇派彩表 → 唔再 retry
            p['draw'] = d['draw']
            p['date'] = d['date']
            return p
        except urllib.error.HTTPError as e:
            if e.code == 403 and attempt < 2:
                time.sleep(backoff[attempt])  # 被限流 → 等耐啲再試
                continue
            return None
        except Exception:
            if attempt < 2:
                time.sleep(backoff[attempt])
                continue
            return None
    return None

def load_existing():
    if os.path.exists(OUT):
        try:
            return json.load(open(OUT, encoding='utf-8')).get('payouts', [])
        except Exception:
            return []
    return []

def main():
    draws = json.load(open(HIST, encoding='utf-8'))
    existing = {p['draw'] for p in load_existing()}
    missing = [d for d in draws if d['draw'] not in existing]
    limit = None
    if len(sys.argv) > 1 and sys.argv[1] != 'all':
        limit = int(sys.argv[1])
    targets = missing if limit is None else missing[:limit]
    print(f"已有 {len(existing)} 期, 需補 {len(targets)} 期")

    payouts = load_existing()
    t0 = time.time()
    got = 0
    for i, d in enumerate(targets):
        p = fetch_one(d)
        if p:
            payouts.append(p)
            got += 1
        if (i + 1) % 10 == 0:
            payouts.sort(key=lambda x: x['date'], reverse=True)
            json.dump({"source": "lottery.hk", "updated": time.strftime("%Y-%m-%d"),
                       "count": len(payouts), "payouts": payouts},
                      open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
            print(f"  …{i+1}/{len(targets)} (中 {got}, {time.time()-t0:.0f}s)")
        time.sleep(0.5)

    payouts.sort(key=lambda x: x['date'], reverse=True)
    json.dump({"source": "lottery.hk", "updated": time.strftime("%Y-%m-%d"),
               "count": len(payouts), "payouts": payouts},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f"✅ 完成: +{got} 期, 共 {len(payouts)} 期 ({(time.time()-t0):.0f}s)")

if __name__ == '__main__':
    main()
