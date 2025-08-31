module.exports = {
  apps: [
    {
      name: 'investment-workflow-backend',
      script: './backend/dist/index.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // 日志配置
      log_file: './backend/logs/combined.log',
      out_file: './backend/logs/out.log',
      error_file: './backend/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 重启配置
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // 监控配置
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // 其他配置
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/ZHONGZHENGXIN/investment-workflow-manager.git',
      path: '/var/www/investment-workflow',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};