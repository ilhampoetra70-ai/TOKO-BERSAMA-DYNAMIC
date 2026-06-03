@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "API_DIR=%ROOT%local-api"
set "FE_DIR=%ROOT%pos-react-canvas"
set "DESKTOP_DIR=%ROOT%apps\pos-desktop"
set "TEMP_DIR=%DESKTOP_DIR%\.temp"
set "ELECTRON_USER_DATA_DIR=%ROOT%.runtime\electron-profile"
set "API_HOST=127.0.0.1"
set "API_PORT=8731"
set "API_URL=http://%API_HOST%:%API_PORT%"

if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"
if not exist "%ELECTRON_USER_DATA_DIR%" mkdir "%ELECTRON_USER_DATA_DIR%"

echo [1/4] Build local-api...
pushd "%API_DIR%" || goto :fail
call npm run build
if errorlevel 1 goto :fail_api

echo [2/4] Migrasi database local-api...
call npm run migrate:dist
if errorlevel 1 goto :fail_api
popd

echo Bersihkan backend lama di port %API_PORT%...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%API_PORT% " ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

if exist "%FE_DIR%\dist\index.html" (
  echo [3/4] Frontend build ditemukan, lewati build.
) else (
  echo [3/4] Build frontend Electron...
  pushd "%FE_DIR%" || goto :fail
  set "VITE_POS_API_BASE_URL=%API_URL%"
  call npm run build
  if errorlevel 1 goto :fail_fe
  popd
)

echo [4/4] Start Electron desktop...
pushd "%DESKTOP_DIR%" || goto :fail
set "TOKOBERSAMA_API_HOST=%API_HOST%"
set "TOKOBERSAMA_API_PORT=%API_PORT%"
set "TOKOBERSAMA_API_BASE_URL=%API_URL%"
set "TOKOBERSAMA_MANAGE_BACKEND=0"
set "TOKOBERSAMA_ELECTRON_PROFILE=%ELECTRON_USER_DATA_DIR%"
start "TOKOBERSAMA API" cmd /c "cd /d ""%API_DIR%"" && node dist/server.js > ""%ROOT%logs\electron-backend.log"" 2>&1"
"%ROOT%node_modules\electron\dist\electron.exe" --user-data-dir="%ELECTRON_USER_DATA_DIR%" --disk-cache-dir="%ELECTRON_USER_DATA_DIR%\cache" --disable-gpu --no-sandbox --disable-features=NetworkServiceSandbox . > "%ROOT%logs\electron-ui.log" 2>&1
popd

echo.
echo Electron desktop sedang dijalankan.
echo Backend: %API_URL%
exit /b 0

:fail_fe
popd
goto :fail

:fail_api
popd
goto :fail

:fail
echo.
echo Gagal menjalankan Electron desktop.
pause
exit /b 1
