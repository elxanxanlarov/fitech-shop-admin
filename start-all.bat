@echo off

:: Backend
cd /d "%~dp0backend"
npm run dev >nul 2>&1 &

:: Frontend
cd /d "%~dp0frontend"
npm run dev >nul 2>&1 &
