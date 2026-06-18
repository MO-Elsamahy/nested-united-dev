module.exports = {
  apps: [{
    name: 'inbox-polling',
    script: 'scripts/inbox-polling-service.ts',
    interpreter: 'node_modules/.bin/ts-node',
    cwd: 'C:\\inetpub\\wwwroot\\nested-united',
    restart_delay: 5000,
    max_restarts: 100,
    autorestart: true,
    env: { TZ: 'Asia/Riyadh' },
  }]
};
