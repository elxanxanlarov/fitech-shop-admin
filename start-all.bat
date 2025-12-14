@echo off

:: Backend terminal
cd /d "%~dp0backend"
start /min "backend" cmd /k "npm run dev"

:: Frontend terminal
cd /d "%~dp0frontend"
start /min "frontend" cmd /k "npm run dev"

timeout /t 5 /nobreak