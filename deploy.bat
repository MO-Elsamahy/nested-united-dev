@echo off
set "PROJECT_DIR=C:\inetpub\wwwroot\nested-united"
cd /d "%PROJECT_DIR%"

echo [1/7] Stopping PM2 processes...
call pm2 stop rentals inbox-polling

echo [2/7] Pulling latest updates from Git...
call git pull

echo [3/7] Installing dependencies...
call npm install --legacy-peer-deps

echo [4/7] Running npm run build...
call npm run build

echo [5/7] Copying static files to standalone...
xcopy /E /I /Y "%PROJECT_DIR%\.next\static" "%PROJECT_DIR%\.next\standalone\.next\static"

echo [6/7] Copying public folder to standalone...
xcopy /E /I /Y "%PROJECT_DIR%\public" "%PROJECT_DIR%\.next\standalone\public"

echo [7/7] Restarting PM2 processes...
call pm2 restart rentals
call pm2 start pm2.inbox.config.js || call pm2 restart inbox-polling

echo Deployment Complete!
pause
