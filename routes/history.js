const express = require('express');
const { handleError, DateUtils } = require('../utils/helpers');

const router = express.Router();

// 데이터베이스 연결 풀을 외부에서 주입받도록 설정
let pool;

const setPool = (databasePool) => {
  pool = databasePool;
};

// 공통 에러 처리 함수는 utils/helpers에서 import

// department 컬럼 삭제 API는 더 이상 필요하지 않음 (이미 삭제됨)

// ID 136 데이터 수정 API
router.post('/api/fix-id136-data', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // ID 136의 데이터 수정: manager_position을 3으로
    await connection.execute(`
      UPDATE company_history 
      SET manager_position = '3' 
      WHERE id = 136
    `);
    
    res.json({
      success: true,
      message: 'ID 136 데이터가 수정되었습니다. Manager Position: 3'
    });
  } catch (err) {
    console.error('ID 136 데이터 수정 에러:', err);
    handleError(res, err, 'Failed to fix ID 136 data');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 테스트 API - company_history 테이블 확인
router.get('/api/test-company-history', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 테이블 존재 확인
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'company_history'
    `);
    
    if (tables.length === 0) {
      return res.json({
        success: false,
        error: 'company_history 테이블이 존재하지 않습니다.'
      });
    }
    
    // 테이블 구조 확인
    const [columns] = await connection.execute(`
      DESCRIBE company_history
    `);
    
    // 데이터 개수 확인
    const [count] = await connection.execute(`
      SELECT COUNT(*) as count FROM company_history
    `);
    
    // 실제 데이터 확인 (최신 순으로 5개)
    const [data] = await connection.execute(`
      SELECT * FROM company_history ORDER BY created_at DESC LIMIT 5
    `);
    
    res.json({
      success: true,
      data: {
        tableExists: true,
        columns: columns,
        recordCount: count[0].count,
        sampleData: data
      }
    });
  } catch (err) {
    console.error('테스트 API 에러:', err);
    handleError(res, err, 'Failed to test company_history table');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Delete user history
router.delete('/api/history/user/:id', async (req, res) => {
  let connection;
  try {
    const historyId = req.params.id;
    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM company_history WHERE id = ?',
      [historyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'History record not found'
      });
    }
    
    res.json({
      success: true,
      message: '승인 이력이 성공적으로 삭제되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to delete user history');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get error logs
router.get('/api/error-logs', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [rows] = await connection.execute(`
      SELECT 
        id, error_type, error_message, user_id, company_name,
        processing_date, error_details, created_at
      FROM error_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    handleError(res, err, 'Failed to fetch error logs');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Delete error log
router.delete('/api/error-logs/:id', async (req, res) => {
  let connection;
  try {
    const errorId = req.params.id;
    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM error_logs WHERE id = ?',
      [errorId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Error log not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Error log deleted successfully'
    });
  } catch (err) {
    handleError(res, err, 'Failed to delete error log');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get company history (alias for /api/history)
router.get('/api/history', async (req, res) => {
  let connection;
  try {
    const { userId, limit = 100, offset = 0 } = req.query;
    connection = await pool.getConnection();
    
    let query = `
      SELECT 
        id, user_id_string, company_name, user_name, company_type, status_type,
        start_date, end_date, pricing_plan, manager_position, mobile_phone, email, active_days, created_at
      FROM company_history
    `;
    let values = [];
    
    if (userId) {
      query += ' WHERE user_id_string = ?';
      values.push(userId);
    }
    
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await connection.execute(query, values);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    handleError(res, err, 'Failed to fetch company history');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get company history
router.get('/api/company-history', async (req, res) => {
  let connection;
  try {
    const { userId, limit = 100, offset = 0 } = req.query;
    connection = await pool.getConnection();
    
    let query = `
      SELECT 
        id, user_id_string, company_name, user_name, company_type, status_type,
        start_date, end_date, pricing_plan, manager_position, mobile_phone, email, active_days, created_at
      FROM company_history
    `;
    let values = [];
    
    if (userId) {
      query += ' WHERE user_id_string = ?';
      values.push(userId);
    }
    
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await connection.execute(query, values);
    
    // DATE_FORMAT으로 이미 YYYY-MM-DD 문자열로 반환되므로 그대로 사용
    const koreaRows = rows;
    
    res.json({
      success: true,
      data: koreaRows
    });
  } catch (err) {
    handleError(res, err, 'Failed to fetch company history');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get company history list
router.get('/api/company-history-list', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const { limit = 100, offset = 0 } = req.query;
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    
    // company_history 테이블에서 모든 승인 이력 조회
    const [rows] = await connection.execute(`
      SELECT 
        id, user_id_string, company_name, user_name, company_type, status_type,
        start_date, end_date, pricing_plan, manager_position, mobile_phone, email, active_days, created_at
      FROM company_history
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `);
    
    // DATE_FORMAT으로 이미 YYYY-MM-DD 문자열로 반환되므로 그대로 사용
    const koreaRows = rows;
    
    res.json({
      success: true,
      data: {
        history: koreaRows
      }
    });
  } catch (err) {
    console.error('company-history-list API 에러:', err);
    handleError(res, err, 'Failed to fetch company history list');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get user approval history
router.get('/api/user-approval-history/:userId', async (req, res) => {
  let connection;
  try {
    const userId = req.params.userId;
    connection = await pool.getConnection();
    
    const [rows] = await connection.execute(`
      SELECT 
        id, user_id_string, company_name, user_name, company_type, status_type,
        start_date, end_date, pricing_plan, created_at
      FROM company_history
      WHERE user_id_string = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    const koreaRows = rows.map(history => ({
      ...history,
      // Date 객체를 YYYY-MM-DD 문자열로 변환
      start_date: history.start_date ? 
        (history.start_date instanceof Date ? 
          `${history.start_date.getFullYear()}-${String(history.start_date.getMonth() + 1).padStart(2, '0')}-${String(history.start_date.getDate()).padStart(2, '0')}` : 
          history.start_date.toString().split('T')[0]) : null,
      end_date: history.end_date ? 
        (history.end_date instanceof Date ? 
          `${history.end_date.getFullYear()}-${String(history.end_date.getMonth() + 1).padStart(2, '0')}-${String(history.end_date.getDate()).padStart(2, '0')}` : 
          history.end_date.toString().split('T')[0]) : null,
      created_at: history.created_at ? 
        (history.created_at instanceof Date ? 
          `${history.created_at.getFullYear()}-${String(history.created_at.getMonth() + 1).padStart(2, '0')}-${String(history.created_at.getDate()).padStart(2, '0')}` : 
          history.created_at.toString().split('T')[0]) : null
    }));
    
    res.json({
      success: true,
      data: koreaRows
    });
  } catch (err) {
    handleError(res, err, 'Failed to fetch user approval history');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Record approval history
router.post('/api/record-approval-history', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const {
      user_id_string, company_name, company_type, approval_status,
      start_date, end_date, pricing_plan
    } = req.body;

    // 필수 파라미터 검증
    if (!user_id_string) {
      return res.status(400).json({
        success: false,
        error: 'user_id_string is required'
      });
    }

    // 승인 완료 상태가 아니면 히스토리 기록 거부
    if (approval_status !== '승인 완료') {
      return res.status(400).json({
        success: false,
        error: '승인 완료 상태가 아닌 사용자는 히스토리를 기록할 수 없습니다.'
      });
    }

    // 시작일과 종료일이 없으면 히스토리 기록 거부
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: '시작일과 종료일이 모두 있어야 히스토리를 기록할 수 있습니다.'
      });
    }

    // 업체 형태가 무료 사용자 또는 탈퇴 사용자이면 히스토리 기록 거부
    if (company_type === '무료 사용자' || company_type === '탈퇴 사용자') {
      return res.status(400).json({
        success: false,
        error: '무료 사용자와 탈퇴 사용자는 히스토리를 기록할 수 없습니다.'
      });
    }

    // 종료일이 지났는지 확인
    const today = new Date();
    const todayString = DateUtils.getTodayString();
    const endDateObj = new Date(end_date);
    const todayObj = new Date(todayString);
    
    if (endDateObj >= todayObj) {
      return res.status(400).json({
        success: false,
        error: '종료일이 지나지 않은 사용자는 히스토리를 기록할 수 없습니다.'
      });
    }

    // 사용자의 현재 상태 확인
    const [currentUser] = await connection.execute(`
      SELECT user_name, company_name, company_type, pricing_plan, 
             mobile_phone, email, manager_position, start_date, end_date, approval_status
      FROM users WHERE user_id = ?
    `, [user_id_string]);

    if (currentUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = currentUser[0];

    // 현재 사용자가 승인 완료 상태가 아니면 히스토리 기록 거부
    if (user.approval_status !== '승인 완료') {
      return res.status(400).json({
        success: false,
        error: '현재 사용자가 승인 완료 상태가 아닙니다.'
      });
    }

    // 활성화 일수 계산
    let activeDays = 0;
    if (user.start_date && user.end_date) {
      const startDate = new Date(user.start_date);
      const endDate = new Date(user.end_date);
      const timeDiff = endDate.getTime() - startDate.getTime();
      activeDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // 시작일과 종료일 포함
    }

    // 현재 사용자의 실제 데이터를 사용하여 히스토리 기록
    const safeParams = [
      user_id_string || null,
      user.company_name || null,
      user.user_name || null,
      user.company_type || null,
      '승인 완료',
      user.start_date || null,
      user.end_date || null,
      user.pricing_plan || null,
      user.mobile_phone || null,
      user.email || null,
      user.manager_position || null,
      activeDays
    ];

    console.log('📝 승인 이력 기록 시도 (사용자 현재 상태 기준):', {
      user_id_string: safeParams[0],
      company_name: safeParams[1],
      user_name: safeParams[2],
      company_type: safeParams[3],
      status_type: safeParams[4],
      start_date: safeParams[5],
      end_date: safeParams[6],
      pricing_plan: safeParams[7],
      mobile_phone: safeParams[8],
      email: safeParams[9],
      manager_position: safeParams[10],
      active_days: safeParams[11],
      safeParamsLength: safeParams.length,
      todayString: todayString,
      endDateCheck: `${end_date} < ${todayString} = ${endDateObj < todayObj}`
    });

    const [result] = await connection.execute(`
      INSERT INTO company_history (
        user_id_string, company_name, user_name, company_type, status_type,
        start_date, end_date, pricing_plan, mobile_phone, email, manager_position, active_days, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [...safeParams]);

    console.log(`📝 ${user_id_string} - 승인 완료 이력 기록 완료 (종료일 지남: ${end_date} < ${todayString})`);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: '승인 이력이 성공적으로 기록되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to record approval history');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 기존 히스토리 데이터의 active_days 업데이트
router.post('/api/update-history-active-days', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 모든 히스토리 데이터 조회 (active_days가 null이거나 0인 경우)
    const [histories] = await connection.execute(`
      SELECT id, start_date, end_date FROM company_history 
      WHERE (active_days IS NULL OR active_days = 0) AND start_date IS NOT NULL AND end_date IS NOT NULL
    `);
    
    let updatedCount = 0;
    
    for (const history of histories) {
      // 활성화 일수 계산
      const startDate = new Date(history.start_date);
      const endDate = new Date(history.end_date);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const activeDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // 시작일과 종료일 포함
      
      // active_days 업데이트
      await connection.execute(`
        UPDATE company_history 
        SET active_days = ? 
        WHERE id = ?
      `, [activeDays, history.id]);
      
      updatedCount++;
    }
    
    res.json({
      success: true,
      message: `${updatedCount}건의 히스토리 데이터가 업데이트되었습니다.`,
      updatedCount
    });
  } catch (err) {
    handleError(res, err, 'Failed to update history active days');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = { router, setPool };