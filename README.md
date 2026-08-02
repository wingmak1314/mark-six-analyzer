# 🎱 六合彩數據分析 WebApp

基於 614 期真實開獎數據（2022-2026）嘅六合彩分析儀表板，完全自動化、零 token 更新。

## 功能

- 📅 最新開獎顯示
- 🔥 5年最熱 / 🧊 最冷號碼
- ⭐ 特別號統計
- ⚖️ 奇偶 / 📏 大小 / 🔢 尾數分佈
- 🤝 最強共現號碼對
- 🎯 自動推薦（複式主炮 8 字 + 副炮 7 字）
- 📋 每期開獎後自動驗證上次推薦

## 快速開始

```bash
pip install -r requirements.txt
python backend/app.py
# 打開 http://localhost:8100
```

## 數據更新（零 token）

`../mark-six-tracker/marksix_auto.py` 每週二、四、六 22:00 自動：
1. 抓取最新開獎（lottery.hk）
2. 更新統計
3. 對比上次推薦 → 記錄結果
4. 產生新推薦

WebApp 讀同一份數據檔案，刷新即見最新。

## 檔案結構

```
mark-six-webapp/
├── backend/app.py        # FastAPI server (port 8100)
├── frontend/index.html   # 儀表板
├── requirements.txt
└── (讀取 ../mark-six-tracker/ 嘅數據)
```

## API

| 路徑 | 說明 |
|---|---|
| `/` | 儀表板 |
| `/api/stats` | 5年統計 |
| `/api/cooccur` | 共現對 |
| `/api/recommend` | 最新推薦 |
| `/api/check` | 驗證記錄 |
| `/api/history?n=20` | 最近開獎 |
