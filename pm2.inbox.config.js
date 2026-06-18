module.exports = {
  apps: [{
    name: 'inbox-polling',
    script: 'node_modules/ts-node/dist/bin.js',
    args: 'scripts/inbox-polling-service.ts',
    cwd: 'C:\\inetpub\\wwwroot\\nested-united',
    restart_delay: 5000,
    max_restarts: 100,
    autorestart: true,
    env: { TZ: 'Asia/Riyadh' },
  }]
};
