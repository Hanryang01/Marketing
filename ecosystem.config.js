module.exports = {
  apps: [{
    name: 'sihm-marketing',
    script: 'server.js',
    cwd: '/home/ubuntu/Marketing',
    instances: process.env.PM2_INSTANCES || 1, // AWS EC2 인스턴스 CPU 코어 수에 맞게 조정
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3003,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: process.env.DB_PORT || 3306,
      DB_USER: process.env.DB_USER || 'root',
      DB_PASSWORD: process.env.DB_PASSWORD || 'Tech8123!',
      DB_NAME: process.env.DB_NAME || 'sihm_user_management',
      DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT || 20,
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://marketing.sihm.co.kr'
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

