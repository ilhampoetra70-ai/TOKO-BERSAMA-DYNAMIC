@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "API_DIR=%ROOT%local-api"
set "FE_DIR=%ROOT%pos-react-canvas"
set "API_HOST=127.0.0.1"
set "API_PORT=8731"
set "API_URL=http://%API_HOST%:%API_PORT%"
set "FE_HOST=127.0.0.1"
set "FE_PORT=5173"
set "FE_URL=http://%FE_HOST%:%FE_PORT%"
set "LOG_DIR=%ROOT%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [1/3] Start local-api dev...
start "" /b cmd /c "cd /d ""%API_DIR%"" && npm run dev > ""%LOG_DIR%\local-api-dev.log"" 2>&1"

timeout /t 2 /nobreak >nul

echo [2/3] Start frontend dev...
start "" /b cmd /c "cd /d ""%FE_DIR%"" && set ""VITE_POS_API_BASE_URL=%API_URL%"" && npm run dev -- --host %FE_HOST% --port %FE_PORT% > ""%LOG_DIR%\frontend-dev.log"" 2>&1"

timeout /t 3 /nobreak >nul

echo [3/3] Open browser...
start "" "%FE_URL%"

echo.
echo Dev siap.
echo Backend:  %API_URL%
echo Frontend: %FE_URL%
echo Log backend:  %LOG_DIR%\local-api-dev.log
echo Log frontend: %LOG_DIR%\frontend-dev.log
echo.
echo Biarkan proses ini jalan. UI akan reload sendiri saat file berubah.
exit /b 0
