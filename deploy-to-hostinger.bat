@echo off
REM =====================================================
REM PNPtv Bot - Quick Deploy to Hostinger
REM =====================================================

echo =========================================
echo PNPtv Bot - Hostinger Deployment
echo =========================================
echo.

REM Configuration
set SERVER=srv1071867.hstgr.cloud
set USER=root
set REMOTE_DIR=/var/www/telegram-bot

echo Server: %SERVER%
echo User: %USER%
echo Remote Directory: %REMOTE_DIR%
echo.

echo =========================================
echo Step 1: Building for Production
echo =========================================
call npm run build 2>nul
if errorlevel 1 echo Warning: Build failed or no build script found
echo.

echo =========================================
echo Step 2: Syncing Files to Server
echo =========================================
echo This will upload files excluding:
echo  - node_modules
echo  - .git
echo  - logs
echo  - .env (use .env.production manually)
echo.

REM Use rsync if available, otherwise use scp
where rsync >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using rsync...
    rsync -avz --progress ^
        --exclude "node_modules" ^
        --exclude ".git" ^
        --exclude "logs" ^
        --exclude ".env" ^
        --exclude "*.log" ^
        --exclude "sessions.json" ^
        ./ %USER%@%SERVER%:%REMOTE_DIR%/
) else (
    echo rsync not found. Please install Git Bash or use WinSCP/FileZilla
    echo Or run this from Git Bash terminal
    pause
    exit /b 1
)

echo.
echo =========================================
echo Step 3: Installing Dependencies on Server
echo =========================================
ssh %USER%@%SERVER% "cd %REMOTE_DIR% && npm install --production"

echo.
echo =========================================
echo Step 4: Restarting Bot
echo =========================================
ssh %USER%@%SERVER% "cd %REMOTE_DIR% && pm2 restart pnptv-bot || pm2 start ecosystem.config.js --env production"
ssh %USER%@%SERVER% "pm2 save"

echo.
echo =========================================
echo Step 5: Checking Status
echo =========================================
ssh %USER%@%SERVER% "pm2 status"

echo.
echo =========================================
echo Deployment Complete!
echo =========================================
echo.
echo Your bot is now running at:
echo  - Website: https://pnptv.app
echo  - Bot: https://t.me/PNPtvBot
echo.
echo Useful commands:
echo  - View logs: ssh %USER%@%SERVER% "pm2 logs pnptv-bot"
echo  - Restart: ssh %USER%@%SERVER% "pm2 restart pnptv-bot"
echo  - Stop: ssh %USER%@%SERVER% "pm2 stop pnptv-bot"
echo.
pause
