@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"

echo [1/2] Build frontend + backend unpacked...
pushd "%ROOT%" || goto :fail
call npm run build:electron
if errorlevel 1 goto :fail_root

echo [2/2] Smoke test final...
call npm run smoke:final
if errorlevel 1 goto :fail_root

echo.
echo Unpacked build siap.
echo Frontend: %ROOT%pos-react-canvas\dist
echo Backend:  %ROOT%local-api\dist
exit /b 0

:fail_root
popd
goto :fail

:fail
echo.
echo Gagal membangun unpacked build.
pause
exit /b 1
