const mysql = require('mysql2/promise');

// 날짜 유틸리티 함수들 (단순화)
const DateUtils = {
  // 날짜를 YYYY-MM-DD 형식으로 변환 (시간 정보 제거)
  formatDate: (date) => {
    if (!date) return null;
    try {
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date; // 이미 YYYY-MM-DD 형식
      }
      
      // Date 객체인 경우 YYYY-MM-DD 형식으로 변환
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // 문자열인 경우 Date 객체로 변환 후 처리
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  },

  // 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (한국 시간 기준)
  getTodayString: () => {
    const now = new Date();
    // 한국 시간대에서 현재 날짜를 정확히 가져오기
    const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

};

// 공통 미들웨어 함수들
const Middleware = {
  withDatabase: async (callback) => {
    const connection = await pool.getConnection();
    try {
      return await callback(connection);
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  },
  
  handleApi: async (req, res, handler) => {
    try {
      const result = await Middleware.withDatabase(handler);
      res.json(Response.success(result));
    } catch (error) {
      handleError(res, error, 'API 처리 오류');
    }
  }
};

// 매출 관련 헬퍼 함수들
const RevenueHelpers = {
  getMonthlyActiveCompanies: async (connection, year, month) => {
    const targetYear = year || new Date().getFullYear();
    
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      // 해당 월의 마지막 날 (YYYY-MM-DD 형식) - UTC 변환 문제 해결
      const monthEnd = new Date(targetYear, month, 0);
      const year = monthEnd.getFullYear();
      const monthNum = String(monthEnd.getMonth() + 1).padStart(2, '0');
      const day = String(monthEnd.getDate()).padStart(2, '0');
      const monthEndString = `${year}-${monthNum}-${day}`;
      
      // 현재 활성화된 업체 (시작일 <= 당월말일자 <= 종료일, 무료 요금제 제외)
      const [currentActive] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE approval_status = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      `, [monthEndString, monthEndString]);
      
      // 히스토리에서 활성화된 업체 (시작일 <= 당월말일자 <= 종료일, 무료 요금제 제외)
      const [historyActive] = await connection.execute(`
        SELECT COUNT(DISTINCT user_id_string) as count FROM company_history 
        WHERE status_type = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      `, [monthEndString, monthEndString]);
      
      // 중복 제거를 위한 총 활성화 업체 수 계산
      const [totalActive] = await connection.execute(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id FROM users 
          WHERE approval_status = '승인 완료'
          AND company_type IN ('컨설팅 업체', '일반 업체')
          AND pricing_plan != '무료'
          AND (start_date IS NULL OR start_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
          UNION
          SELECT user_id_string as user_id FROM company_history 
          WHERE status_type = '승인 완료'
          AND company_type IN ('컨설팅 업체', '일반 업체')
          AND pricing_plan != '무료'
          AND (start_date IS NULL OR start_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
        ) as combined
      `, [monthEndString, monthEndString, monthEndString, monthEndString]);
      
      
      monthlyData.push({
        month: month,
        currentActive: currentActive[0].count,
        historyActive: historyActive[0].count,
        totalActive: totalActive[0].count
      });
    }
    
    return {
      year: targetYear,
      monthlyData: monthlyData
    };
  },

  getMonthlyActiveCompaniesByType: async (connection, year, month) => {
    const targetYear = year || new Date().getFullYear();
    
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      // 해당 월의 마지막 날 (YYYY-MM-DD 형식) - UTC 변환 문제 해결
      const monthEnd = new Date(targetYear, month, 0);
      const year = monthEnd.getFullYear();
      const monthNum = String(monthEnd.getMonth() + 1).padStart(2, '0');
      const day = String(monthEnd.getDate()).padStart(2, '0');
      const monthEndString = `${year}-${monthNum}-${day}`;
      
      // 컨설팅 업체 - 현재 활성화된 업체 (시작일 <= 당월말일자 <= 종료일, 무료 요금제 제외)
      const [consultingCurrent] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE approval_status = '승인 완료'
        AND company_type = '컨설팅 업체'
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      `, [monthEndString, monthEndString]);
      
      // 컨설팅 업체 - 히스토리에서 활성화된 업체 (시작일 <= 당월말일자 <= 종료일, 무료 요금제 제외)
      const [consultingHistory] = await connection.execute(`
        SELECT COUNT(DISTINCT user_id_string) as count FROM company_history 
        WHERE status_type = '승인 완료'
        AND company_type = '컨설팅 업체'
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      `, [monthEndString, monthEndString]);
      
      // 일반 업체 - 현재 활성화된 업체 (시작일 <= 당월말일자 <= 종료일, 무료 요금제 제외)
      const [generalCurrent] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE approval_status = '승인 완료'
        AND company_type = '일반 업체'
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      `, [monthEndString, monthEndString]);
      
      // 일반 업체 - 히스토리에서 활성화된 업체 (시작일 <= 당월말일자 <= 종료일, 무료 요금제 제외)
      const [generalHistory] = await connection.execute(`
        SELECT COUNT(DISTINCT user_id_string) as count FROM company_history 
        WHERE status_type = '승인 완료'
        AND company_type = '일반 업체'
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      `, [monthEndString, monthEndString]);
      
      // 컨설팅 업체 - 중복 제거를 위한 총 활성화 업체 수 계산
      const [consultingTotal] = await connection.execute(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id FROM users 
          WHERE approval_status = '승인 완료'
          AND company_type = '컨설팅 업체'
          AND pricing_plan != '무료'
          AND (start_date IS NULL OR start_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
          UNION
          SELECT user_id_string as user_id FROM company_history 
          WHERE status_type = '승인 완료'
          AND company_type = '컨설팅 업체'
          AND pricing_plan != '무료'
          AND (start_date IS NULL OR start_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
        ) as consulting_combined
      `, [monthEndString, monthEndString, monthEndString, monthEndString]);
      
      // 일반 업체 - 중복 제거를 위한 총 활성화 업체 수 계산
      const [generalTotal] = await connection.execute(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id FROM users 
          WHERE approval_status = '승인 완료'
          AND company_type = '일반 업체'
          AND pricing_plan != '무료'
          AND (start_date IS NULL OR start_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
          UNION
          SELECT user_id_string as user_id FROM company_history 
          WHERE status_type = '승인 완료'
          AND company_type = '일반 업체'
          AND pricing_plan != '무료'
          AND (start_date IS NULL OR start_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
        ) as general_combined
      `, [monthEndString, monthEndString, monthEndString, monthEndString]);
      
      const consultingActive = consultingTotal[0].count;
      const generalActive = generalTotal[0].count;
      const totalActive = consultingActive + generalActive;
      
      monthlyData.push({
        month: month,
        consultingActive: consultingActive,
        generalActive: generalActive,
        totalActive: totalActive
      });
    }
    
    return {
      year: targetYear,
      monthlyData: monthlyData
    };
  },

  getMonthlyRevenueByType: async (connection, year, month) => {
    const targetYear = year || new Date().getFullYear();
    
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStart = `${targetYear}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = new Date(targetYear, month, 0);
      const monthEndString = monthEnd.toISOString().split('T')[0];
      
      const [consultingRevenue] = await connection.execute(`
        SELECT COALESCE(SUM(supply_amount), 0) as total FROM revenue 
        WHERE company_type = '컨설팅 업체'
        AND DATE(payment_date) >= ? AND DATE(payment_date) <= ?
      `, [monthStart, monthEndString]);
      
      const [generalRevenue] = await connection.execute(`
        SELECT COALESCE(SUM(supply_amount), 0) as total FROM revenue 
        WHERE company_type = '일반 업체'
        AND DATE(payment_date) >= ? AND DATE(payment_date) <= ?
      `, [monthStart, monthEndString]);
      
      const [otherRevenue] = await connection.execute(`
        SELECT COALESCE(SUM(supply_amount), 0) as total FROM revenue 
        WHERE company_type NOT IN ('컨설팅 업체', '일반 업체')
        AND DATE(payment_date) >= ? AND DATE(payment_date) <= ?
      `, [monthStart, monthEndString]);
      
      monthlyData.push({
        month: month,
        consulting: consultingRevenue[0].total,
        general: generalRevenue[0].total,
        other: otherRevenue[0].total,
        total: consultingRevenue[0].total + generalRevenue[0].total + otherRevenue[0].total
      });
    }
    
    return {
      year: targetYear,
      monthlyData: monthlyData
    };
  }
};

// SQL 쿼리 빌더 함수들
const QueryBuilder = {
  selectUsers: (fields = ['*'], conditions = {}) => {
    const fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
    let query = `SELECT ${fieldList} FROM users`;
    const values = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        values.push(conditions[key]);
        return `${key} = ?`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    return { query, values };
  },
  
  checkUserIdExists: (user_id, excludeId = null) => {
    if (excludeId) {
      return {
        query: 'SELECT id FROM users WHERE user_id = ? AND id != ?',
        values: [user_id, excludeId]
      };
    } else {
      return {
        query: 'SELECT id FROM users WHERE user_id = ?',
        values: [user_id]
      };
    }
  },
  
  selectUsersByEndDate: (endDate, isToday = true) => {
    return {
      query: `
        SELECT id, company_name, user_id, end_date
        FROM users 
        WHERE approval_status = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND pricing_plan != '무료'
        AND end_date IS NOT NULL
        ${isToday ? 'AND DATE(end_date) = ?' : 'AND DATE(end_date) = ?'}
      `,
      values: [endDate]
    };
  }
};

// 공통 에러 처리 함수
const handleError = (res, error, message) => {
  console.error('에러 발생:', message, error.message);
  res.status(500).json({
    success: false,
    error: message,
    details: error.message
  });
};

// 공통 응답 포맷
const Response = {
  success: (data, message) => ({ success: true, data, message }),
  error: (message) => ({ success: false, error: message })
};

// 데이터베이스 연결 풀 (외부에서 설정)
let pool;

const setPool = (databasePool) => {
  pool = databasePool;
};

module.exports = {
  DateUtils,
  Middleware,
  RevenueHelpers,
  QueryBuilder,
  handleError,
  Response,
  setPool
};
