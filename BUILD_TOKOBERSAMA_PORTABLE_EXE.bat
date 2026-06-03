@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"

echo [1/5] Build frontend + backend...
pushd "%ROOT%" || goto :fail
call npm run build:electron
if errorlevel 1 goto :fail_root

echo [2/5] Smoke test final...
call npm run smoke:final
if errorlevel 1 goto :fail_root

echo [3/5] Prepare portable backend dependencies...
call npm run prepare:local-api-portable
if errorlevel 1 goto :fail_root

echo [4/5] Build portable single exe...
call npm run package:portable-exe:raw
if errorlevel 1 goto :fail_root

echo [5/5] Smoke test portable single exe...
call npm run smoke:portable
if errorlevel 1 goto :fail_root

echo.
echo Portable single exe siap.
echo Output: %ROOT%release\portable-exe\TOKOBERSAMA-POS-Portable.exe
exit /b 0

:fail_root
popd
goto :fail

:fail
echo.
echo Gagal membangun portable single exe.
pause
exit /b 1
