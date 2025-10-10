const { logger } = require('./logger');

// pool을 전역으로 사용
let pool;

// DateUtils 추가
const DateUtils = {
  getTodayString: () => {
    const now = new Date();
    // 한국 시간대로 변환 (UTC+9)
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return koreaTime.toISOString().split('T')[0];
  },
  
  formatDate: (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
};

// pool 설정 함수
const setPool = (databasePool) => {
  pool = databasePool;
};

// 데이터베이스 연결 헬퍼
const withDatabase = async (callback) => {
    const connection = await pool.getConnection();
    try {
      return await callback(connection);
    } finally {
      connection.release();
  }
};

// API 에러 처리 헬퍼
const handleApiError = (res, error, message) => {
  logger.error(message, error);
  res.status(500).json({
    success: false,
    error: message,
    details: error.message
  });
};

// handleError는 handleApiError의 별칭
const handleError = handleApiError;

// QueryBuilder 추가
const QueryBuilder = {
  checkUserIdExists: (userId, excludeId = null) => {
    if (excludeId) {
      return {
        query: 'SELECT id FROM users WHERE user_id = ? AND id != ?',
        values: [userId, excludeId]
      };
    } else {
      return {
        query: 'SELECT id FROM users WHERE user_id = ?',
        values: [userId]
      };
    }
  }
};

// RevenueHelpers 추가
const RevenueHelpers = {
  
  
  getMonthlyRevenueByType: async (connection, year, month) => {
    // year와 month가 undefined인 경우 현재 년월 사용
    const currentDate = new Date();
    const currentYear = (year && !isNaN(year)) ? parseInt(year) : currentDate.getFullYear();
    const currentMonth = (month && !isNaN(month)) ? parseInt(month) : (currentDate.getMonth() + 1);
    
    console.log(`getMonthlyRevenueByType called with year: ${year}, month: ${month}, resolved to: ${currentYear}, ${currentMonth}`);
    
    const [rows] = await connection.execute(`
      SELECT company_type, SUM(supply_amount) as total FROM revenue 
      WHERE YEAR(issue_date) = ? AND MONTH(issue_date) = ?
      GROUP BY company_type
    `, [currentYear, currentMonth]);
    return rows;
  }
};

module.exports = {
  withDatabase,
  handleApiError,
  handleError,
  DateUtils,
  QueryBuilder,
  RevenueHelpers,
  setPool
};