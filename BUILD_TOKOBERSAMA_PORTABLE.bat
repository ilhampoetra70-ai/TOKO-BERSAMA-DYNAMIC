@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"

echo [1/4] Build frontend + backend...
pushd "%ROOT%" || goto :fail
call npm run build:electron
if errorlevel 1 goto :fail_root

echo [2/4] Smoke test final...
call npm run smoke:final
if errorlevel 1 goto :fail_root

echo [3/4] Paket portable...
call npm run package:portable
if errorlevel 1 goto :fail_root

echo [4/4] Smoke test portable...
call npm run smoke:portable
if errorlevel 1 goto :fail_root

echo.
echo Portable build siap.
echo Folder: %ROOT%release\TOKOBERSAMA-POS-Portable
echo ZIP:    %ROOT%release\TOKOBERSAMA-POS-Portable.zip
exit /b 0

:fail_root
popd
goto :fail

:fail
echo.
echo Gagal membangun portable build.
pause
exit /b 1
