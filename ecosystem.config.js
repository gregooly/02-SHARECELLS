module.exports = {
  apps: [
    {
      name: 'sharecells',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/sharecells',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Memory management - restart if exceeds 500MB
      max_memory_restart: '500M',
      
      // Auto restart settings
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen timeout
      listen_timeout: 8000,
    }
  ]
};
