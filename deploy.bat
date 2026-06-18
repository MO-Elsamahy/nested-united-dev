@echo off
set "PROJECT_DIR=C:\inetpub\wwwroot\nested-united"
cd /d "%PROJECT_DIR%"

echo [1/5] Stopping PM2 process 'rentals'...
call pm2 stop rentals

echo [2/5] Running npm run build...
call npm run build

echo [3/5] Copying static files to standalone...
xcopy /E /I /Y "%PROJECT_DIR%\.next\static" "%PROJECT_DIR%\.next\standalone\.next\static"

echo [4/5] Copying public folder to standalone...
xcopy /E /I /Y "%PROJECT_DIR%\public" "%PROJECT_DIR%\.next\standalone\public"

echo [5/6] Restarting PM2 process 'rentals'...
call pm2 restart rentals

echo [6/6] Restarting PM2 process 'inbox-polling'...
call pm2 start pm2.inbox.config.js || call pm2 restart inbox-polling

echo Deployment Complete!
pause
