@echo off
cd /d "%~dp0"
title Mark Six data update (jdb / history / payout)

echo ============================================
echo   Mark Six data update - one click, zero token
echo ============================================
echo.
echo [1/4] Pulling latest data from HKJC API ...
python scripts\update_data.py
if errorlevel 1 goto failed

echo.
echo [2/4] Checking for new data ...
git add jdb.json history_full.json payouts.json >nul 2>&1
git diff --cached --quiet
if %errorlevel%==0 goto nodata

echo [3/4] New data found - saving ...
git commit -q -m "data: local update (jdb/history/payout)"

echo [4/4] Pushing to GitHub (site updates in a few minutes) ...
git pull --rebase --autostash -q
git push -q
if errorlevel 1 goto pushfail

echo.
echo [OK] Done! New draw shows on the site in a few minutes.
goto done

:failed
echo.
echo [!] Update failed (usually a network problem). Just run this again.
echo.
pause
exit /b 1

:pushfail
echo.
echo [!] Push failed (usually an expired GitHub token).
echo     Tell Hermes: "push failed".
echo.
pause
exit /b 1

:nodata
echo [OK] Already up to date - nothing new.

:done
echo.
echo NOTE: Normally you do not need to do anything -
echo       GitHub auto-updates every hour.
echo       Use this script only to see a new draw right away.
echo.
pause
