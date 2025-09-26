const express = require('express');
const { handleError, DateUtils } = require('../utils/helpers');

const router = express.Router();

// 데이터베이스 연결 풀을 외부에서 주입받도록 설정
let pool;

const setPool = (databasePool) => {
  pool = databasePool;
};

// 공통 에러 처리 함수는 utils/helpers에서 import

// company_history 테이블에 department 컬럼 추가
router.post('/api/add-department-column', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // department 컬럼이 이미 존재하는지 확인
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM company_history LIKE 'department'
    `);
    
    if (columns.length === 0) {
      // department 컬럼 추가
      await connection.execute(`
        ALTER TABLE company_history ADD COLUMN department VARCHAR(100) AFTER position
      `);
      
      // ID 69의 데이터 수정: position을 부장으로, department를 전략개발팀으로
      await connection.execute(`
        UPDATE company_history 
        SET position = '부장', department = '전략개발팀' 
        WHERE id = 69
      `);
      
      // ID 136의 데이터 수정: position을 3으로, department를 2로
      await connection.execute(`
        UPDATE company_history 
        SET position = '3', department = '2' 
        WHERE id = 136
      `);
      
      res.json({
        success: true,
        message: 'department 컬럼이 추가되고 ID 69 데이터가 수정되었습니다.'
      });
    } else {
      res.json({
        success: true,
        message: 'department 컬럼이 이미 존재합니다.'
      });
    }
  } catch (err) {
    console.error('department 컬럼 추가 에러:', err);
    handleError(res, err, 'Failed to add department column');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ID 136 데이터 수정 API
router.post('/api/fix-id136-data', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // ID 136의 데이터 수정: position을 3으로, department를 2로
    await connection.execute(`
      UPDATE company_history 
      SET position = '3', department = '2' 
      WHERE id = 136
    `);
    
    res.json({
      success: true,
      message: 'ID 136 데이터가 수정되었습니다. Position: 3, Department: 2'
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

// Get company history
router.get('/api/company-history', async (req, res) => {
  let connection;
  try {
    const { userId, limit = 100, offset = 0 } = req.query;
    connection = await pool.getConnection();
    
    let query = `
      SELECT 
        id, user_id_string, company_name, user_name, company_type, status_type as approval_status,
        start_date, end_date, pricing_plan, position, department, mobile_phone, email, created_at
      FROM company_history
    `;
    let values = [];
    
    if (userId) {
      query += ' WHERE user_id_string = ?';
      values.push(userId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    values.push(limitNum, offsetNum);
    
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
    
    // 간단한 쿼리로 테스트
    const [rows] = await connection.execute(`
      SELECT 
        id, user_id_string, company_name, user_name, company_type, status_type as approval_status,
        start_date, end_date, pricing_plan, position, department, mobile_phone, email, created_at
      FROM company_history
      ORDER BY created_at DESC
      LIMIT 10
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
        id, user_id_string, company_name, user_name, company_type, status_type as approval_status,
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

    const [result] = await connection.execute(`
      INSERT INTO company_history (
        user_id_string, company_name, company_type, status_type,
        start_date, end_date, pricing_plan, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      user_id_string, company_name, company_type, approval_status,
      start_date, end_date, pricing_plan
    ]);

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

module.exports = { router, setPool };