@echo off
setlocal
title Laundry Kilat - Web Server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js tidak ditemukan.
  echo Anda tetap bisa membuka file index.html langsung di browser.
  echo.
  pause
  exit /b 1
)

echo.
echo   ============================================
echo     Laundry Kilat - Website
echo     http://localhost:8090
echo   ============================================
echo.
echo   Browser akan terbuka otomatis.
echo   Tutup jendela ini untuk menghentikan server.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:8090'"
node serve.js

pause
