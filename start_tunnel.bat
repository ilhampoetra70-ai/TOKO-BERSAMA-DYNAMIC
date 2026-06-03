@echo off
TITLE pos Tunnel
cd /d "%~dp0"
echo Starting Tunnel pos...
D:\Ilham\TOKOBERSAMA\cloudflared.exe --config config.yml tunnel run pos
pause
