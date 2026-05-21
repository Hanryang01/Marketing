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
    if (type === 'monthly-revenue-by-type') {
      const data = await RevenueHelpers.getMonthlyRevenueByType(connection, year, month);
      result = { monthlyData: data };
    } else {
      const [rows] = await connection.execute(`
        SELECT 
          id, company_name, business_license, issue_date, payment_date,
          payment_method, company_type, item, supply_amount, vat,
          total_amount, created_at, updated_at
        FROM revenue
        ORDER BY issue_date DESC, id DESC
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

// 대시보드 통계 조회 API
router.get('/api/dashboard/stats', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 사용자 통계를 단일 쿼리로 통합
    const [userStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN approval_status = '승인 예정' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN approval_status = '승인 완료' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN company_type = '컨설팅 업체' AND approval_status = '승인 완료' THEN 1 ELSE 0 END) as consulting_count,
        SUM(CASE WHEN company_type = '일반 업체' AND approval_status = '승인 완료' THEN 1 ELSE 0 END) as general_count,
        SUM(CASE WHEN company_type = '탈퇴 사용자' THEN 1 ELSE 0 END) as withdrawn_count
      FROM users
    `);
    
    // 매출 통계를 단일 쿼리로 통합
    const [revenueStats] = await connection.execute(`
      SELECT 
        COALESCE(SUM(supply_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN company_type = '컨설팅 업체' THEN supply_amount ELSE 0 END), 0) as consulting_revenue,
        COALESCE(SUM(CASE WHEN company_type = '일반 업체' THEN supply_amount ELSE 0 END), 0) as general_revenue,
        COALESCE(SUM(CASE WHEN company_type = '기타' THEN supply_amount ELSE 0 END), 0) as other_revenue
      FROM revenue
    `);
    
    const u = userStats[0];
    const r = revenueStats[0];
    
    res.json({
      success: true,
      data: {
        totalUsers: u.total_count,
        pendingUsers: u.pending_count,
        approvedUsers: u.approved_count,
        totalFreeUsers: u.pending_count,
        consultingUsers: u.consulting_count,
        generalUsers: u.general_count,
        withdrawnUsers: u.withdrawn_count,
        totalRevenue: r.total_revenue,
        consultingRevenue: r.consulting_revenue,
        generalRevenue: r.general_revenue,
        otherRevenue: r.other_revenue
      }
    });
  } catch (error) {
    console.error('대시보드 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '대시보드 통계 조회 중 오류가 발생했습니다.'
    });
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
    
    // 활성 사용자 통계를 단일 쿼리로 통합
    const [activeStats] = await connection.execute(`
      SELECT 
        COUNT(CASE 
          WHEN approval_status = '승인 완료' AND company_type IN ('컨설팅 업체', '일반 업체')
            AND pricing_plan != '무료'
            AND (start_date IS NULL OR DATE(start_date) <= ?)
            AND (end_date IS NULL OR DATE(end_date) >= ?)
          THEN 1 END) as active_count,
        COUNT(CASE 
          WHEN approval_status = '승인 완료' AND company_type = '컨설팅 업체'
            AND pricing_plan != '무료'
            AND (start_date IS NULL OR DATE(start_date) <= ?)
            AND (end_date IS NULL OR DATE(end_date) >= ?)
          THEN 1 END) as consulting_count,
        COUNT(CASE 
          WHEN approval_status = '승인 완료' AND company_type = '일반 업체'
            AND pricing_plan != '무료'
            AND (start_date IS NULL OR DATE(start_date) <= ?)
            AND (end_date IS NULL OR DATE(end_date) >= ?)
          THEN 1 END) as general_count,
        COUNT(CASE WHEN approval_status = '승인 완료' AND company_type = '무료 사용자' THEN 1 END) as free_count,
        COUNT(CASE WHEN approval_status = '승인 예정' THEN 1 END) as pending_count,
        COUNT(*) as total_count
      FROM users
    `, [today, today, today, today, today, today]);
    
    // 이력 활성 업체 수
    const [historyRows] = await connection.execute(`
      SELECT COUNT(DISTINCT user_id_string) as history_count
      FROM company_history 
      WHERE status_type = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND pricing_plan != '무료'
        AND (start_date IS NULL OR DATE(start_date) <= ?)
        AND (end_date IS NULL OR DATE(end_date) >= ?)
    `, [today, today]);
    
    const a = activeStats[0];
    
    res.json({
      success: true,
      data: {
        currentActive: a.active_count,
        historyActive: historyRows[0].history_count,
        totalActive: a.active_count + historyRows[0].history_count,
        consultingActive: a.consulting_count,
        generalActive: a.general_count,
        freeActive: a.free_count,
        pendingCount: a.pending_count,
        totalCount: a.total_count
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

    const finalIssueDate = issue_date && issue_date.trim() !== '' ? issue_date : null;
    const finalPaymentDate = payment_date && payment_date.trim() !== '' ? payment_date : null;

    const [result] = await connection.execute(`
      INSERT INTO revenue (
        company_name, business_license, issue_date, payment_date,
        payment_method, company_type, item, supply_amount, vat, total_amount,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      company_name, business_license, finalIssueDate, finalPaymentDate,
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

    const finalIssueDate = issue_date && issue_date.trim() !== '' ? issue_date : null;
    const finalPaymentDate = payment_date && payment_date.trim() !== '' ? payment_date : null;

    const [result] = await connection.execute(`
      UPDATE revenue SET
        company_name = ?, business_license = ?, issue_date = ?, payment_date = ?,
        payment_method = ?, company_type = ?, item = ?, supply_amount = ?, vat = ?, total_amount = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      company_name, business_license, finalIssueDate, finalPaymentDate,
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
