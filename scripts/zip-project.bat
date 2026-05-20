@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM  ZIP project root EXCLUDING: node_modules, .git,
REM  package-lock.json, .env*, dist, build, *.log, etc.
REM  Output zip goes to the PARENT folder of the project,
REM  so it never includes itself.
REM ============================================================

REM Resolve project root (parent of this scripts folder)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.." >nul
set "ROOT=%CD%"
popd >nul

for %%I in ("%ROOT%") do set "PROJECT_NAME=%%~nxI"

REM Locale-safe timestamp YYYYMMDD_HHMMSS via PowerShell
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set "TIMESTAMP=%%T"

set "OUT_DIR=%ROOT%\.."
set "OUT_FILE=%OUT_DIR%\%PROJECT_NAME%_%TIMESTAMP%.zip"
set "TEMP_DIR=%TEMP%\%PROJECT_NAME%_zip_%TIMESTAMP%"

echo ============================================================
echo  Project root : %ROOT%
echo  Output zip   : %OUT_FILE%
echo ============================================================
echo.

echo [1/3] Copying files (excluding node_modules, .git, uploads, package-lock.json, .env*, dist, build, *.log)...
robocopy "%ROOT%" "%TEMP_DIR%" /E /NFL /NDL /NJH /NJS /NP ^
  /XD "node_modules" ".git" "uploads" "dist" "build" ".next" "out" ".cache" "coverage" ^
  /XF "package-lock.json" ".env" ".env.*" "*.log" "npm-debug.log*" "yarn-debug.log*" "yarn-error.log*" >nul

if errorlevel 8 (
    echo ERROR: robocopy failed.
    if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

echo.
echo [2/3] Creating ZIP archive...
if exist "%OUT_FILE%" del /f /q "%OUT_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { Compress-Archive -Path (Join-Path '%TEMP_DIR%' '*') -DestinationPath '%OUT_FILE%' -Force -ErrorAction Stop } catch { Write-Host $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo ERROR: Compress-Archive failed.
    if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning up temporary files...
rmdir /s /q "%TEMP_DIR%"

echo.
echo ============================================================
echo  DONE! ZIP created:
echo  %OUT_FILE%
echo ============================================================
echo.
pause
endlocal
