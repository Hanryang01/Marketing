module.exports = {
  apps: [{
    name: 'sihm-admin',
    script: 'server-mysql.js',
    instances: 2, // CPU 코어 수에 맞게 조정
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'localhost',
      DB_PORT: 3306,
      DB_USER: 'root',
      DB_PASSWORD: '8123',
      DB_NAME: 'sihm_user_management',
      DB_CONNECTION_LIMIT: 20,
      CORS_ORIGIN: 'https://manage.sihm.co.kr'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

