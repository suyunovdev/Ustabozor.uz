@echo off
echo ===================================================
echo IshTop Platformasi - Telegram Mini App Mode (V3)
echo ===================================================

echo [1/5] Eskirgan jarayonlarni tozalash...
call npx kill-port 3000 5000 
taskkill /F /IM node.exe >nul 2>&1

echo.
echo [2/5] Backend server ishga tushirilmoqda...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo [3/5] Frontend server ishga tushirilmoqda...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo [4/5] Serverlar yuklanishini kutish (15 soniya)...
echo Iltimos, sabr qiling...
timeout /t 15 >nul

echo.
echo [5/5] Tunnel yaratilmoqda...
echo.
echo ===================================================
echo DIQQAT: Agar yana 503 xatosi chiqsa, demak Localhost ishlamayapti.
echo Iltimos, bu oyna yopilmang!
echo ===================================================
echo.

call npx localtunnel --port 3000 --local-host 127.0.0.1

pause
