module.exports = {
  apps: [
    {
      name: 'pnptv-webapp',
      cwd: '/root/bot 1/src/webapp',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        NEXT_PUBLIC_BOT_URL: 'https://pnptv.app',
        NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot',
        NEXT_PUBLIC_WEBAPP_URL: 'https://pnptv.app/app',
        NEXT_PUBLIC_API_URL: 'https://pnptv.app',
      },
      error_file: '/root/.pm2/logs/pnptv-webapp-error.log',
      out_file: '/root/.pm2/logs/pnptv-webapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
