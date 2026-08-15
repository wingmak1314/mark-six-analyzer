# 🎱 六合彩大數據分析 WebApp

基於 **3,417 期真實開獎數據（2002–2026）** 嘅六合彩分析儀表板 — 純 GitHub Pages 托管,零 backend、零 token、每日自動更新。

**Live site:** https://wingmak1314.github.io/mark-six-analyzer/

## 功能

- 📊 儀表板: 最新開獎、最熱/最冷號碼、共現對、號碼熱力圖、區間分佈
- 📈 統計總覽: 主號碼/特別號頻率、最長未出、組合統計、單雙/大細/尾數/區間走勢
- 📅 開獎記錄: 年份/月份/期號/日期搜尋,25 年全部期數
- 📈 走勢: 逐號碼最近 N 期出沒節奏
- 🎲 選號器: 排除過去 N 期、單雙/大細比例限制
- 📐 統計預測: z-score + 卡方 + gap + 共現 + 近50期動量,附 walk-forward 命中率實測
- 🎯 AI 推薦: 10/15 字複式 + AI 膽拖方案,附命中率回顧
- 🔮 AI 對比: 多期 walk-forward 回測,逐期「實際開獎 vs AI 推薦」命中對比
- 💰 派彩走勢: 每期頭獎/二獎每注派彩 + 總投注額折線圖 + 明細表 (HKJC 官方派彩)
- 🧮 計算器: 複式注數/成本/機率、膽拖系統機率
- 🧾 核對: 輸入飛 → 對比最新一期 → 自動計獎級
- ⏰ 下次開獎倒數 (二四六 21:30 香港時間)
- 📱 PWA: 可安裝、離線可用

## 架構 (GitHub-only)

```
react/src/            # React + TypeScript + Vite 源碼
  ├── lib/analyzer.ts # 分析引擎 (static mode, 前端直接計算)
  └── components/     # UI 元件
scripts/update_data.py# 數據抓取 (GitHub Actions 執行)
scripts/backfill_payouts.py # 派彩 backfill (禮貌增量, 可選)
history_full.json     # 全部開獎數據 (3417 期)
payouts.json          # 每期派彩數據 (頭獎/二獎每注 + 總投注額)
assets/ index.html sw.js ...  # CI build 產物 (自動生成, 唔好手改)
```

- **前端**: GitHub Actions (`build-frontend.yml`) 收到 `react/**` push 後自動 `npm run build` → 產物複製到 repo root → GitHub Pages 上線,全程 `GITHUB_TOKEN`,唔使 PAT。
- **數據**: GitHub Actions (`update-data.yml`) 每日自動更新 — 開獎日(二四六)21:35 即時 + 每日 21:50/23:30 保險重試,抓 lottery.hk,超時自動 fallback HKJC 官方 GraphQL;同日自動增量 append 最新派彩到 `payouts.json`。
- **分析**: 全部喺瀏覽器做 (`analyzeStatic`),冇任何 API server,數據唔會離開用戶裝置。

## 本地開發

```bash
cd react
npm install
npm run dev        # http://localhost:5173
npm run build      # 產出 dist/
npm run lint       # oxlint
```

改完 `react/**` → commit + push → CI 自動 build + deploy (約 2 分鐘)。

## 誠實聲明

六合彩每期獨立隨機,任何統計方法都唔會增加中獎機率(每注 1/13,983,816)。呢個 app 嘅統計係幫你了解歷史形態同組合結構,唔係預測工具。博彩有風險,切勿沉迷賭博。
