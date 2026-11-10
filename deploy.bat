@echo off
rem Fuel Ledger: double-click to deploy. Needs Node.js 18 or newer.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it with:   winget install OpenJS.NodeJS.LTS
  echo Then close this window and run deploy.bat again.
  pause
  exit /b 1
)
node deploy.mjs %*
echo.
pause
