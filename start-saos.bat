@echo off
setlocal
title SAOS - ServiceNow Review Workspace
echo ===================================================
echo       SAOS - Starting ServiceNow Workspace
echo ===================================================
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js (v20+) from https://nodejs.org/ and run this again.
    pause
    exit /b 1
)

echo Checking dependencies...
call npx -y pnpm install

if not exist ".next\BUILD_ID" (
    echo Building SAOS for first-time use...
    call npx -y pnpm run build
)

echo Starting SAOS on http://127.0.0.1:3000...
start http://127.0.0.1:3000
call npx -y pnpm run start
pause
