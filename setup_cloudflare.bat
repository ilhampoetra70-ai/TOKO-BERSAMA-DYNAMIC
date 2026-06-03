@echo off
SETLOCAL EnableDelayedExpansion
TITLE Cloudflare Tunnel Auto-Setup
SET CF_EXE=%~dp0cloudflared.exe

echo ===================================================
echo       CLOUDFLARE TUNNEL AUTO-SETUP WIZARD
echo ===================================================
echo Pastikan Anda sudah login di browser ke dashboard
echo Cloudflare (dash.cloudflare.com).
echo.

if not exist "%CF_EXE%" (
    echo [ERROR] cloudflared.exe tidak ditemukan di folder ini!
    pause
    exit /b
)

:STEP1
echo [LANGKAH 1] Login ke Cloudflare Account
echo Jendela browser akan terbuka. Pilih domain/situs Anda.
echo.
%CF_EXE% tunnel login
if %errorlevel% neq 0 (
    echo [!] Login gagal atau dibatalkan.
    pause
    goto STEP1
)

:STEP2
echo.
echo [LANGKAH 2] Membuat Tunnel Baru
set /p TUNNEL_NAME="Masukkan nama tunnel (contoh: pos-toko): "
if "%TUNNEL_NAME%"=="" goto STEP2

echo Membuat tunnel %TUNNEL_NAME%...
for /f "tokens=4" %%i in ('%CF_EXE% tunnel create %TUNNEL_NAME% ^| findstr /C:"Created tunnel"') do set TUNNEL_ID=%%i
if "%TUNNEL_ID%"=="" (
    echo [!] Gagal membuat tunnel. Mungkin nama sudah dipakai?
    pause
    goto STEP2
)
echo [OK] Tunnel ID: %TUNNEL_ID%

:STEP3
echo.
echo [LANGKAH 3] Menentukan Domain (Hostname)
echo Contoh: pos.tokosaya.com
set /p DOMAIN_POS="Masukkan Domain untuk POS: "
set /p DOMAIN_ADMIN="Masukkan Domain untuk Admin (PWA): "

if "%DOMAIN_POS%"=="" goto STEP3

:STEP4
echo.
echo [LANGKAH 4] Membuat File Konfigurasi (config.yml)
(
echo tunnel: %TUNNEL_ID%
echo credentials-file: %USERPROFILE%\.cloudflared\%TUNNEL_ID%.json
echo.
echo ingress:
echo   - hostname: %DOMAIN_POS%
echo     service: http://localhost:3001
echo   - hostname: %DOMAIN_ADMIN%
echo     service: http://localhost:3001
echo   - service: http_status:404
) > config.yml
echo [OK] File config.yml berhasil dibuat.

:STEP5
echo.
echo [LANGKAH 5] Mendaftarkan DNS ke Cloudflare
echo Sedang memproses routing...
%CF_EXE% tunnel route dns %TUNNEL_NAME% %DOMAIN_POS%
%CF_EXE% tunnel route dns %TUNNEL_NAME% %DOMAIN_ADMIN%
echo [OK] DNS Routing berhasil didaftarkan.

:DONE
echo.
echo ===================================================
echo SETUP SELESAI!
echo ===================================================
echo.
echo Anda sekarang bisa menjalankan tunnel dengan:
echo %CF_EXE% tunnel run %TUNNEL_NAME%
echo.
echo Atau gunakan file "start_tunnel.bat" yang diperbarui.
echo.
set /p UPDATE_START="Simpan konfigurasi ke start_tunnel.bat? (y/n): "
if /i "%UPDATE_START%"=="y" (
    (
    echo @echo off
    echo TITLE %TUNNEL_NAME% Tunnel
    echo cd /d "%%~dp0"
    echo echo Starting Tunnel %TUNNEL_NAME%...
    echo %CF_EXE% --config config.yml tunnel run %TUNNEL_NAME%
    echo pause
    ) > start_tunnel.bat
    echo [OK] start_tunnel.bat telah diperbarui.
)

echo.
echo ===================================================
echo   PANDUAN PENYELESAIAN MASALAH (TROUBLESHOOTING)
echo ===================================================
echo.
echo 1. Gagal Login (Browser tidak terbuka):
echo    - Jalankan script ini sebagai Administrator.
echo    - Pastikan antivirus tidak memblokir cloudflared.exe.
echo.
echo 2. Tunnel Create Gagal:
echo    - Cek koneksi internet Anda.
echo    - Pastikan nama tunnel unik (belum pernah dipakai sebelumnya).
echo.
echo 3. DNS Route Gagal:
echo    - Pastikan domain yang Anda masukkan sudah aktif di Cloudflare.
echo    - Pastikan Cloudflare Nameservers sudah diarahkan dengan benar.
echo.
echo 4. Error "Credentials file not found":
echo    - Cek folder C:\Users\%USERNAME%\.cloudflared\
echo    - Pastikan file .json ada di sana. Jika tidak, ulangi [LANGKAH 1].
echo.
echo 5. Port 3001 Connection Refused:
echo    - Pastikan aplikasi POS sudah dibuka sebelum menjalankan tunnel.
echo.
echo ===================================================

pause
