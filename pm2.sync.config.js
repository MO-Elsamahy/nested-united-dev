module.exports = {
  apps: [{
    name: 'amsf-sync',  // New Enterprise Sync Engine with WebSocket Priority
    script: 'node_modules/ts-node/dist/bin.js',
    args: '--project scripts/tsconfig.json --transpile-only scripts/inbox-sync-service.ts',
    cwd: 'C:\\inetpub\\wwwroot\\nested-united',
    restart_delay: 5000,
    max_restarts: 100,
    autorestart: true,
    watch: false,
    env: {
      TZ: 'Asia/Riyadh',
      NODE_ENV: 'production',
    },
  }]
};
