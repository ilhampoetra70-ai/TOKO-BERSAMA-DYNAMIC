@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "API_DIR=%ROOT%local-api"
set "FE_DIR=%ROOT%pos-react-canvas"
set "API_HOST=127.0.0.1"
set "API_PORT=8731"
set "API_URL=http://%API_HOST%:%API_PORT%"
set "FE_HOST=127.0.0.1"
set "FE_PORT=4173"
set "LOG_DIR=%ROOT%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [1/5] Build local-api...
pushd "%API_DIR%" || goto :fail
call npm run build
if errorlevel 1 goto :fail_api

echo [2/5] Migrasi database local-api...
call npm run migrate:dist
if errorlevel 1 goto :fail_api

echo [3/5] Start local-api...
start "" /b cmd /c "cd /d ""%API_DIR%"" && set ""TOKOBERSAMA_API_HOST=%API_HOST%"" && set ""TOKOBERSAMA_API_PORT=%API_PORT%"" && npm run start > ""%LOG_DIR%\local-api.log"" 2>&1"
popd

timeout /t 2 /nobreak >nul

echo [4/5] Build frontend desktop...
pushd "%ROOT%" || goto :fail
set "VITE_POS_API_BASE_URL=%API_URL%"
call npm run build:desktop
if errorlevel 1 goto :fail_root

echo [5/5] Start frontend preview...
start "" /b cmd /c "cd /d ""%FE_DIR%"" && set ""VITE_POS_API_BASE_URL=%API_URL%"" && npm run preview -- --host %FE_HOST% --port %FE_PORT% > ""%LOG_DIR%\frontend.log"" 2>&1"
timeout /t 2 /nobreak >nul
start "" "http://%FE_HOST%:%FE_PORT%"

echo.
echo Aplikasi siap dijalankan.
echo Backend:  %API_URL%
echo Preview:  http://%FE_HOST%:%FE_PORT%
echo Log backend:  %LOG_DIR%\local-api.log
echo Log frontend: %LOG_DIR%\frontend.log
echo.
echo Untuk edit cepat, pakai START_TOKOBERSAMA_DEV.bat.
exit /b 0

:fail_root
popd
goto :fail

:fail_api
popd
goto :fail

:fail
echo.
echo Gagal menjalankan Tokobersama.
pause
exit /b 1
