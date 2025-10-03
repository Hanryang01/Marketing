const express = require('express');
const { Middleware, RevenueHelpers, handleError } = require('../utils/helpers');

const router = express.Router();

// 데이터베이스 연결 풀을 외부에서 주입받도록 설정
let pool;

const setPool = (databasePool) => {
  pool = databasePool;
};

// Get revenue data
router.get('/api/revenue', async (req, res) => {
  const { type, groupBy, year, month } = req.query;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    let result;
    if (type === 'monthly-active-companies') {
      result = await RevenueHelpers.getMonthlyActiveCompanies(connection, year, month);
    } else if (type === 'monthly-active-companies-by-type') {
      result = await RevenueHelpers.getMonthlyActiveCompaniesByType(connection, year, month);
    } else if (type === 'monthly-revenue-by-type') {
      result = await RevenueHelpers.getMonthlyRevenueByType(connection, year, month);
    } else if (type === 'monthly-new-users') {
      result = await RevenueHelpers.getMonthlyNewUsers(connection, year, month);
    } else {
      const [rows] = await connection.execute(`
        SELECT 
          id, company_name, business_license, issue_date, payment_date,
          payment_method, company_type, item, supply_amount, vat,
          total_amount, created_at, updated_at
        FROM revenue
        ORDER BY id DESC
      `);
      result = rows;
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch revenue data');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 현재 활성화 업체 수 조회 API
router.get('/api/dashboard/active-companies', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const today = new Date().toISOString().split('T')[0];
    
    const [currentRows] = await connection.execute(`
      SELECT COUNT(*) as active_count
      FROM users 
      WHERE approval_status = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR DATE(start_date) <= ?)
        AND (end_date IS NULL OR DATE(end_date) >= ?)
    `, [today, today]);
    
    const [historyRows] = await connection.execute(`
      SELECT COUNT(DISTINCT user_id_string) as history_count
      FROM company_history 
      WHERE status_type = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR DATE(start_date) <= ?)
        AND (end_date IS NULL OR DATE(end_date) >= ?)
    `, [today, today]);
    
    const [consultingRows] = await connection.execute(`
      SELECT COUNT(*) as consulting_count
      FROM users 
      WHERE approval_status = '승인 완료'
        AND company_type = '컨설팅 업체'
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR DATE(start_date) <= ?)
        AND (end_date IS NULL OR DATE(end_date) >= ?)
    `, [today, today]);
    
    const [generalRows] = await connection.execute(`
      SELECT COUNT(*) as general_count
      FROM users 
      WHERE approval_status = '승인 완료'
        AND company_type = '일반 업체'
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR DATE(start_date) <= ?)
        AND (end_date IS NULL OR DATE(end_date) >= ?)
    `, [today, today]);
    
    const [freeRows] = await connection.execute(`
      SELECT COUNT(*) as free_count
      FROM users 
      WHERE approval_status = '승인 완료'
        AND company_type = '무료 사용자'
    `);
    
    const [pendingRows] = await connection.execute(`
      SELECT COUNT(*) as pending_count
      FROM users 
      WHERE approval_status = '승인 예정'
    `);
    
    const [totalRows] = await connection.execute(`
      SELECT COUNT(*) as total_count
      FROM users
    `);
    
    res.json({
      success: true,
      data: {
        currentActive: currentRows[0].active_count,
        historyActive: historyRows[0].history_count,
        totalActive: currentRows[0].active_count + historyRows[0].history_count,
        consultingActive: consultingRows[0].consulting_count,
        generalActive: generalRows[0].general_count,
        freeActive: freeRows[0].free_count,
        pendingCount: pendingRows[0].pending_count,
        totalCount: totalRows[0].total_count
      }
    });
  } catch (error) {
    console.error('활성화 업체 수 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '활성화 업체 수 조회 중 오류가 발생했습니다.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Create revenue
router.post('/api/revenue', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const {
      company_name, business_license, issue_date, payment_date,
      payment_method, company_type, item, supply_amount, vat, total_amount
    } = req.body;

    const [result] = await connection.execute(`
      INSERT INTO revenue (
        company_name, business_license, issue_date, payment_date,
        payment_method, company_type, item, supply_amount, vat, total_amount,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      company_name, business_license, issue_date, payment_date,
      payment_method, company_type, item, supply_amount, vat, total_amount
    ]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: '매출 데이터가 성공적으로 생성되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to create revenue');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update revenue
router.put('/api/revenue/:id', async (req, res) => {
  let connection;
  try {
    const revenueId = req.params.id;
    connection = await pool.getConnection();
    
    const {
      company_name, business_license, issue_date, payment_date,
      payment_method, company_type, item, supply_amount, vat, total_amount
    } = req.body;

    const [result] = await connection.execute(`
      UPDATE revenue SET
        company_name = ?, business_license = ?, issue_date = ?, payment_date = ?,
        payment_method = ?, company_type = ?, item = ?, supply_amount = ?, vat = ?, total_amount = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      company_name, business_license, issue_date, payment_date,
      payment_method, company_type, item, supply_amount, vat, total_amount, revenueId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Revenue not found'
      });
    }

    res.json({
      success: true,
      message: '매출 데이터가 성공적으로 업데이트되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to update revenue');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Delete revenue
router.delete('/api/revenue/:id', async (req, res) => {
  let connection;
  try {
    const revenueId = req.params.id;
    connection = await pool.getConnection();
    
    const [result] = await connection.execute('DELETE FROM revenue WHERE id = ?', [revenueId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Revenue not found'
      });
    }
    
    res.json({
      success: true,
      message: '매출 데이터가 성공적으로 삭제되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to delete revenue');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = { router, setPool };
