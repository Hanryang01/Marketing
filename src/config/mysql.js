const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '8123',
  database: process.env.MYSQL_DATABASE || 'sihm_user_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
