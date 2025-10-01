const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Database configuration (server.js와 동일한 설정 사용)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '8123',
  database: process.env.DB_NAME || 'sihm_user_management',
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+09:00',
  // acquireTimeout과 timeout은 MySQL2 Connection에서 지원하지 않음
  // Connection Pool 레벨에서만 사용 가능
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ MySQL Database connection failed:', err.message);
    return false;
  }
};

// Create database if not exists
const createDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log(`✅ Database '${dbConfig.database}' created or already exists`);
    await connection.end();
    return true;
  } catch (err) {
    console.error('❌ Database creation failed:', err.message);
    return false;
  }
};

module.exports = {
  pool,
  dbConfig,
  testConnection,
  createDatabase
};
