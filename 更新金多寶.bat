@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 六合彩數據更新（金多寶 / 開獎記錄 / 派彩）

echo ============================================
echo   六合彩數據更新 — 一撳搞定，零 token
echo ============================================
echo.
echo [1/4] 由 HKJC 官方 API 拉最新數據…
python scripts\update_data.py
if errorlevel 1 (
  echo.
  echo ⚠️  更新出錯（可能係網絡問題）。再跑一次就得。
  echo.
  pause
  exit /b 1
)

echo.
echo [2/4] 檢查有冇新數據…
git add jdb.json history_full.json payouts.json >nul 2>&1
git diff --cached --quiet
if %errorlevel%==0 goto nodata

echo [3/4] 有新數據，commit…
git commit -q -m "data: 本機更新 (金多寶/開獎記錄/派彩)"

echo [4/4] 同步上 GitHub（網站幾分鐘後自動更新）…
git pull --rebase --autostash -q
git push -q
if errorlevel 1 (
  echo.
  echo ⚠️  Push 失敗（多數係 GitHub token 過期）— 同 Hermes 講「push 失敗」就得。
  echo.
  pause
  exit /b 1
)
echo.
echo ✅ 搞定！網站 https://wingmak1314.github.io/mark-six-analyzer/ 幾分鐘後見到新期數。
goto done

:nodata
echo ✅ 已經係最新，冇新數據（金多寶表同 AI 15 字唔使變）。

:done
echo.
echo 註：正常情況你唔使做嘢 — GitHub 每個鐘會自動更新一次。
echo     呢個 script 係想「即刻」見到新期數（例如開完金多寶當晚）先用。
echo.
pause
