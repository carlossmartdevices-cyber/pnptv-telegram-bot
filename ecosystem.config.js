/**
 * PM2 Ecosystem Configuration
 *
 * This file configures PM2 process manager for production deployment
 * on VPS servers (srv1071867.hstgr.cloud)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 *
 * Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'pnptv-bot',

      // Entry point (webhook.js for production deployment)
      script: './src/bot/webhook.js',

      // Instances (use 'max' for all CPU cores, or a number)
      instances: 1,

      // Cluster mode (use 'cluster' for multiple instances, 'fork' for single)
      exec_mode: 'fork',

      // Watch for file changes and restart (set to false in production)
      watch: false,

      // Max memory restart threshold (restart if exceeds)
      max_memory_restart: '500M',

      // Node.js arguments - increase heap size for better performance
      // Use interpreter_args for PM2 (node_args is deprecated)
      interpreter_args: '--max-old-space-size=512',

      // Environment variables (production)
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Load environment file
      env_file: '.env.production',

      // Environment variables (development)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        SENTRY_ENABLE_IN_DEV: false,
      },

      // Logging configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Restart delay
      restart_delay: 4000,

      // Time before forcing a shutdown
      kill_timeout: 5000,

      // Wait for ready signal before considering the app online
      wait_ready: false,
      listen_timeout: 10000,

      // Advanced settings
      interpreter: 'node',
      interpreter_args: '',

      // Source maps support
      source_map_support: true,

      // Ignore watch (if watch is enabled)
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log',
        'sessions.json',
      ],

      // Instance variables
      instance_var: 'INSTANCE_ID',

      // Cron restart (optional - restart at specific time)
      // cron_restart: '0 4 * * *', // Restart at 4 AM daily

      // Post-deployment hooks
      post_update: [
        'npm install --production',
        'echo "Deployment complete"',
      ],
    },
  ],

  /**
   * Deployment configuration (optional)
   *
   * Usage:
   *   pm2 deploy ecosystem.config.js production setup
   *   pm2 deploy ecosystem.config.js production update
   */
  deploy: {
    production: {
      // SSH user
      user: 'root',

      // SSH host (can use IP or hostname)
      host: 'srv1071867.hstgr.cloud',  // Hostinger VPS

      // SSH port
      port: '22',

      // SSH options
      ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],

      // Git repository
      repo: 'https://github.com/your-username/your-repo.git',

      // Branch to deploy
      ref: 'origin/main',

      // Path on server
      path: '/var/www/telegram-bot',

      // Pre-setup commands
      'pre-setup': [
        'sudo apt-get update',
        'sudo apt-get install -y git',
      ],

      // Post-setup commands
      'post-setup': [
        'npm install --production',
        'pm2 save',
        'pm2 startup systemd',
      ],

      // Pre-deploy commands (run on server before deployment)
      'pre-deploy-local': [
        'echo "Starting deployment to production..."',
        'git status',
      ],

      // Post-deploy commands (run on server after deployment)
      'post-deploy': [
        'npm install --production',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save',
      ],

      // Environment variables
      env: {
        NODE_ENV: 'production',
      },
    },

    // Staging environment (optional)
    staging: {
      user: 'root',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/your-repo.git',
      path: '/var/www/pnptv-bot-staging',
      'post-deploy': [
        'npm install',
        'pm2 reload ecosystem.config.js --env staging',
      ],
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
