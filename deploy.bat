@echo off
set "PROJECT_DIR=C:\inetpub\wwwroot\nested-united"
cd /d "%PROJECT_DIR%"

echo [1/7] Stopping PM2 processes...
call pm2 stop rentals 2>nul
call pm2 delete rentals 2>nul
call pm2 stop inbox-polling 2>nul
call pm2 delete inbox-polling 2>nul
call pm2 stop browser-bot 2>nul
call pm2 delete browser-bot 2>nul

echo [2/7] Installing dependencies...
call npm install --legacy-peer-deps

echo [3/7] Running npm run build...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Aborting deployment.
    pause
    exit /b 1
)

echo [4/7] Copying static files to standalone...
xcopy /E /I /Y "%PROJECT_DIR%\.next\static" "%PROJECT_DIR%\.next\standalone\.next\static"

echo [5/7] Copying public folder to standalone...
xcopy /E /I /Y "%PROJECT_DIR%\public" "%PROJECT_DIR%\.next\standalone\public"

echo [6/7] Restarting PM2 processes...
call pm2 start node --name "rentals" -- "%PROJECT_DIR%\.next\standalone\server.js"
call pm2 start pm2.inbox.config.js

echo [7/7] Starting Electron Bot via PM2...
call pm2 start "%PROJECT_DIR%\dist-electron\win-unpacked\NestedUnited.exe" --name "browser-bot"
call pm2 save

echo Deployment Complete!
pause