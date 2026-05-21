const express = require('express');
const { DateUtils, QueryBuilder, handleApiError } = require('../utils/helpers');
const { generateToken, saveToken } = require('../utils/tokenStore');

// handleError는 handleApiError의 별칭
const handleError = handleApiError;

const router = express.Router();

// 데이터베이스 연결 풀을 외부에서 주입받도록 설정
let pool;

const setPool = (databasePool) => {
  pool = databasePool;
};

// 이력 기록 헬퍼 함수
async function insertApprovalHistory(connection, dbUserId, userIdString) {
  const [userData] = await connection.execute(`
    SELECT user_name, company_name, company_type, pricing_plan, 
           mobile_phone, email, manager_position, start_date, end_date
    FROM users WHERE id = ?
  `, [dbUserId]);

  if (userData.length === 0) return;

  const user = userData[0];

  // 활성화 일수 계산
  let activeDays = 0;
  if (user.start_date && user.end_date) {
    const startDate = new Date(user.start_date);
    const endDate = new Date(user.end_date);
    const timeDiff = endDate.getTime() - startDate.getTime();
    activeDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // 시작일과 종료일 포함
  }

  await connection.execute(`
    INSERT INTO company_history (
      user_id_string, company_name, user_name, company_type, status_type,
      start_date, end_date, pricing_plan, mobile_phone, email, manager_position, active_days, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [
    userIdString || null,
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
  ]);
}

// 로그인 API (독립적인 인증 시스템)
router.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, email, password } = req.body;
    const inputId = userId || email; // 기존 호환성을 위해 둘 다 허용

    let isValid = false;
    let user = null;

    // 환경 변수에서 관리자 계정 정보 확인
    if (inputId === process.env.ADMIN1_ID && password === process.env.ADMIN1_PW) {
      isValid = true;
      user = { id: 1, username: process.env.ADMIN1_ID, role: 'admin' };
    } else if (inputId === process.env.ADMIN2_ID && password === process.env.ADMIN2_PW) {
      isValid = true;
      user = { id: 2, username: process.env.ADMIN2_ID, role: 'admin' };
    }

    if (isValid) {
      const sessionToken = generateToken();
      saveToken(sessionToken, user);

      res.json({
        success: true,
        user,
        sessionToken
      });
    } else {
      res.status(401).json({
        success: false,
        error: '잘못된 ID 또는 비밀번호입니다.'
      });
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

// Get all users
router.get('/api/users', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // 데이터베이스 연결 정보 확인
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('현재 연결된 데이터베이스:', dbInfo[0].current_db);

    const [rows] = await connection.execute(`
      SELECT 
        u.id, u.company_name, u.user_id, u.email, u.user_name, u.department,
        u.mobile_phone, u.phone_number, u.fax_number, u.address, u.business_license,
        u.notes, u.account_info, u.company_type, u.approval_status, u.is_active, u.pricing_plan, u.subscription_type,
        DATE_FORMAT(u.start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(u.end_date, '%Y-%m-%d') as end_date,
        DATE_FORMAT(u.registration_date, '%Y-%m-%d') as registration_date,
        u.created_at, u.updated_at,
        u.manager_position,
        u.accountant_name, u.accountant_position, u.accountant_mobile, u.accountant_email,
        u.representative, u.industry, u.msds_limit, u.ai_image_limit, u.ai_report_limit
      FROM users u
      ORDER BY u.id DESC
    `);

    console.log('조회된 사용자 수:', rows.length);
    console.log('첫 번째 사용자 ID:', rows[0]?.id);

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    handleError(res, err, '사용자 데이터 조회 오류');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 종료일 체크 API
router.get('/api/users/end-date-check', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const todayString = DateUtils.getTodayString();

    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const twoWeeksLaterString = twoWeeksLater.getFullYear() + '-' +
      String(twoWeeksLater.getMonth() + 1).padStart(2, '0') + '-' +
      String(twoWeeksLater.getDate()).padStart(2, '0');


    // 오늘 종료일인 사용자들 (한국 시간 기준)
    const [todayEndUsers] = await connection.execute(`
      SELECT id, company_name, user_id, end_date
      FROM users 
      WHERE approval_status = '승인 완료'
      AND company_type IN ('컨설팅 업체', '일반 업체')
      AND end_date IS NOT NULL
      AND DATE_FORMAT(CONVERT_TZ(end_date, '+00:00', '+09:00'), '%Y-%m-%d') = ?
    `, [todayString]);

    // 14일 후 종료일인 사용자들 (한국 시간 기준)
    const [twoWeekEndUsers] = await connection.execute(`
      SELECT id, company_name, user_id, end_date
      FROM users 
      WHERE approval_status = '승인 완료'
      AND company_type IN ('컨설팅 업체', '일반 업체')
      AND end_date IS NOT NULL
      AND DATE_FORMAT(CONVERT_TZ(end_date, '+00:00', '+09:00'), '%Y-%m-%d') = ?
    `, [twoWeeksLaterString]);


    res.json({
      success: true,
      data: {
        todayEndUsers,
        twoWeekEndUsers
      }
    });
  } catch (error) {
    console.error('종료일 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: '종료일 체크 중 오류가 발생했습니다.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get specific user by ID
router.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.execute(`
      SELECT 
        u.id, u.company_name, u.user_id, u.email, u.user_name, u.department,
        u.mobile_phone, u.phone_number, u.fax_number, u.address, u.business_license,
        u.notes, u.account_info, u.company_type, u.approval_status, u.is_active, u.pricing_plan, u.subscription_type,
        DATE_FORMAT(u.start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(u.end_date, '%Y-%m-%d') as end_date,
        DATE_FORMAT(u.registration_date, '%Y-%m-%d') as registration_date,
        u.created_at, u.updated_at,
        u.manager_position,
        u.accountant_name, u.accountant_position, u.accountant_mobile, u.accountant_email,
        u.representative, u.industry, u.msds_limit, u.ai_image_limit, u.ai_report_limit
      FROM users u
      WHERE u.id = ?
    `, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Create new user
router.post('/api/users', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const {
      company_name, user_id, email, password_hash, company_type,
      user_name, department, mobile_phone, business_license,
      phone_number, fax_number, address, notes, account_info, msds_limit,
      ai_image_limit, ai_report_limit, is_active, approval_status,
      pricing_plan, subscription_type, start_date, end_date, manager_position, representative, industry,
      accountant_name, accountant_position, accountant_mobile, accountant_email
    } = req.body;

    const finalCompanyType = company_type || '무료 사용자';

    // 탈퇴 사용자 일관성 검증
    if (finalCompanyType === '탈퇴 사용자' && approval_status !== '탈퇴') {
      return res.status(400).json({
        success: false,
        error: '탈퇴 사용자는 승인 상태가 "탈퇴"여야 합니다.'
      });
    }

    if (approval_status === '탈퇴' && finalCompanyType !== '탈퇴 사용자') {
      return res.status(400).json({
        success: false,
        error: '승인 상태가 "탈퇴"인 사용자는 업체 형태가 "탈퇴 사용자"여야 합니다.'
      });
    }

    const validCompanyTypes = ['무료 사용자', '컨설팅 업체', '일반 업체', '탈퇴 사용자', '기타'];

    if (!validCompanyTypes.includes(finalCompanyType)) {
      return res.status(400).json({
        success: false,
        error: `유효하지 않은 회사 유형입니다. 허용되는 값: ${validCompanyTypes.join(', ')}`
      });
    }

    const validPricingPlans = ['무료', '스탠다드', '프리미엄'];
    const finalPricingPlan = pricing_plan || '무료';
    if (!validPricingPlans.includes(finalPricingPlan)) {
      return res.status(400).json({
        success: false,
        error: `유효하지 않은 요금제입니다. 허용되는 값: ${validPricingPlans.join(', ')}`
      });
    }

    if (!user_id || !user_id.trim()) {
      return res.status(400).json({
        success: false,
        error: '사용자 ID는 필수 항목입니다.'
      });
    }

    const { query: checkQuery, values: checkValues } = QueryBuilder.checkUserIdExists(user_id.trim());
    const [existingUser] = await connection.execute(checkQuery, checkValues);

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 사용자 ID입니다.'
      });
    }

    if (finalCompanyType !== '무료 사용자' && finalCompanyType !== '탈퇴 사용자') {
      if (!start_date || !end_date ||
        (typeof start_date === 'string' && start_date.trim() === '') ||
        (typeof end_date === 'string' && end_date.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: '일반 업체와 컨설팅 업체는 시작일과 종료일을 입력해야 합니다.'
        });
      }
    }

    // 날짜를 YYYY-MM-DD 형식으로 그대로 저장 (시간 정보 제거)
    const startDateValue = (start_date && typeof start_date === 'string' && start_date.trim() && finalCompanyType !== '무료 사용자' && finalCompanyType !== '탈퇴 사용자') ? start_date.trim() : null;
    const endDateValue = (end_date && typeof end_date === 'string' && end_date.trim() && finalCompanyType !== '무료 사용자' && finalCompanyType !== '탈퇴 사용자') ? end_date.trim() : null;

    const finalSubscriptionType = subscription_type || null;

    const [result] = await connection.execute(`
      INSERT INTO users (
        company_name, user_id, email, password_hash, company_type,
        user_name, department, mobile_phone, business_license,
        phone_number, fax_number, address, notes, account_info, msds_limit,
        ai_image_limit, ai_report_limit, is_active, approval_status,
        pricing_plan, subscription_type, start_date, end_date, manager_position, representative, industry,
        accountant_name, accountant_position, accountant_mobile, accountant_email,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      company_name || null, user_id || null, email || null, password_hash || null, finalCompanyType,
      user_name || null, department || null, mobile_phone || null, business_license || null,
      phone_number || null, fax_number || null, address || null, notes || null, account_info || null,
      msds_limit || null, ai_image_limit || null, ai_report_limit || null, is_active || false, approval_status || '승인 예정',
      finalPricingPlan, finalSubscriptionType, startDateValue, endDateValue, manager_position || null, representative || null, industry || null,
      accountant_name || null, accountant_position || null, accountant_mobile || null, accountant_email || null,
      new Date(), new Date()
    ]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId, userId: user_id },
      message: '사용자가 성공적으로 생성되었습니다.'
    });
  } catch (err) {
    handleError(res, err, '사용자 생성 중 오류가 발생했습니다.');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update user
router.put('/api/users/:id', async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    connection = await pool.getConnection();

    const {
      company_name, user_id, email, password_hash, company_type,
      user_name, department, mobile_phone, business_license,
      phone_number, fax_number, address, notes, account_info, msds_limit,
      ai_image_limit, ai_report_limit, is_active, approval_status,
      pricing_plan, subscription_type, start_date, end_date, manager_position, representative, industry,
      accountant_name, accountant_position, accountant_mobile, accountant_email
    } = req.body;

    if (!user_id || !user_id.trim()) {
      return res.status(400).json({
        success: false,
        error: '사용자 ID는 필수 항목입니다.'
      });
    }

    const { query: checkQuery, values: checkValues } = QueryBuilder.checkUserIdExists(user_id.trim(), userId);
    const [existingUser] = await connection.execute(checkQuery, checkValues);

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 사용자 ID입니다.'
      });
    }

    // 탈퇴 사용자 일관성 검증
    if (company_type === '탈퇴 사용자' && approval_status !== '탈퇴') {
      return res.status(400).json({
        success: false,
        error: '탈퇴 사용자는 승인 상태가 "탈퇴"여야 합니다.'
      });
    }

    if (approval_status === '탈퇴' && company_type !== '탈퇴 사용자') {
      return res.status(400).json({
        success: false,
        error: '승인 상태가 "탈퇴"인 사용자는 업체 형태가 "탈퇴 사용자"여야 합니다.'
      });
    }

    if (company_type !== '무료 사용자' && company_type !== '탈퇴 사용자') {
      const isValidStartDate = start_date && (
        (typeof start_date === 'number' && start_date.toString().length === 8) ||
        (typeof start_date === 'string' && start_date.trim() && /^\d{4}-\d{2}-\d{2}$/.test(start_date.trim()))
      );

      const isValidEndDate = end_date && (
        (typeof end_date === 'number' && end_date.toString().length === 8) ||
        (typeof end_date === 'string' && end_date.trim() && /^\d{4}-\d{2}-\d{2}$/.test(end_date.trim()))
      );

      if (!isValidStartDate || !isValidEndDate) {
        return res.status(400).json({
          success: false,
          error: '일반 업체와 컨설팅 업체는 시작일과 종료일을 입력해야 합니다.'
        });
      }
    }

    // 날짜를 YYYY-MM-DD 형식으로 그대로 저장 (시간 정보 제거)
    let startDateValue = null;
    let endDateValue = null;

    if (company_type !== '무료 사용자' && company_type !== '탈퇴 사용자') {
      if (start_date) {
        if (typeof start_date === 'number' && start_date.toString().length === 8) {
          const dateStr = start_date.toString();
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          startDateValue = `${year}-${month}-${day}`;
        } else if (typeof start_date === 'string' && start_date.trim()) {
          startDateValue = start_date.trim();
        }
      }

      if (end_date) {
        if (typeof end_date === 'number' && end_date.toString().length === 8) {
          const dateStr = end_date.toString();
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          endDateValue = `${year}-${month}-${day}`;
        } else if (typeof end_date === 'string' && end_date.trim()) {
          endDateValue = end_date.trim();
        }
      }
    }

    // 현재 사용자의 manager_position 값을 보존하기 위해 조회
    const [currentUserData] = await connection.execute(`
      SELECT manager_position FROM users WHERE id = ?
    `, [userId]);

    const preservedManagerPosition = currentUserData.length > 0 ? currentUserData[0].manager_position : null;

    let finalSubscriptionType = subscription_type || null;
    if (company_type === '무료 사용자' || company_type === '탈퇴 사용자') {
      finalSubscriptionType = null;
    }

    const [result] = await connection.execute(`
      UPDATE users SET
        company_name = ?, user_id = ?, email = ?, password_hash = ?, company_type = ?,
        user_name = ?, department = ?, mobile_phone = ?, business_license = ?,
        phone_number = ?, fax_number = ?, address = ?, notes = ?, account_info = ?, msds_limit = ?,
        ai_image_limit = ?, ai_report_limit = ?, is_active = ?, approval_status = ?,
        pricing_plan = ?, subscription_type = ?, start_date = ?, end_date = ?, manager_position = ?, representative = ?, industry = ?,
        accountant_name = ?, accountant_position = ?, accountant_mobile = ?, accountant_email = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      company_name || null, user_id || null, email || null, password_hash || null, company_type || null,
      user_name || null, department || null, mobile_phone || null, business_license || null,
      phone_number || null, fax_number || null, address || null, notes || null, account_info || null,
      msds_limit || null, ai_image_limit || null, ai_report_limit || null, is_active || false, approval_status || null,
      pricing_plan || null, finalSubscriptionType, startDateValue || null, endDateValue || null,
      manager_position || preservedManagerPosition, representative || null, industry || null,
      accountant_name || null, accountant_position || null, accountant_mobile || null, accountant_email || null, userId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let statusChanged = false;
    let newStatus = approval_status;

    // 종료일이 지난 경우 이력 생성 및 무료 사용자 전환 로직
    if (end_date && company_type !== '탈퇴 사용자' && company_type !== '무료 사용자') {
      const todayString = DateUtils.getTodayString();

      const endDateString = end_date;

      const endDateObj = new Date(endDateString);
      const todayObj = new Date(todayString);

      if (endDateObj < todayObj) {

        // 승인 완료 시점의 원본 데이터를 히스토리에 기록
        try {
          await insertApprovalHistory(connection, userId, user_id);
          console.log(`📝 ${user_id} - 승인 완료 이력 기록 완료`);
        } catch (historyError) {
          console.error(`이력 기록 실패:`, historyError.message);
        }

        // 그 후에 사용자 상태를 무료 사용자로 전환
        await connection.execute(`
          UPDATE users 
          SET approval_status = '승인 예정', 
              is_active = false, 
              company_type = '무료 사용자',
              pricing_plan = '무료',
              start_date = NULL,
              end_date = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId]);

        statusChanged = true;
        newStatus = '승인 예정';
      }
    }

    // 승인 완료 상태로 변경 시 이력 생성 (종료일이 지난 경우만)
    if (approval_status === '승인 완료' && !statusChanged && endDateValue &&
      company_type !== '탈퇴 사용자' && company_type !== '무료 사용자') {

      // 종료일이 지났는지 확인
      const todayString = DateUtils.getTodayString();
      const endDateObj = new Date(endDateValue);
      const todayObj = new Date(todayString);

      // 종료일이 지난 경우에만 이력 생성
      if (endDateObj < todayObj) {
        try {
          await insertApprovalHistory(connection, userId, user_id);
          console.log(`📝 ${user_id} - 승인 완료 이력 기록 완료 (종료일 지남)`);
        } catch (historyError) {
          console.error(`승인 완료 이력 기록 실패:`, historyError.message);
        }
      } else {
        console.log(`📝 ${user_id} - 승인 완료 상태로 변경되었지만 종료일이 아직 지나지 않아 이력 기록하지 않음`);
      }
    }

    res.json({
      success: true,
      data: {
        id: userId,
        statusChanged: statusChanged,
        newStatus: newStatus
      },
      message: statusChanged ?
        `사용자 정보가 업데이트되었습니다. 종료일이 지나 승인 예정으로 변경되었습니다.` :
        '사용자 정보가 성공적으로 업데이트되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to update user');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Delete user
router.delete('/api/users/:id', async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    connection = await pool.getConnection();

    const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: '사용자가 성공적으로 삭제되었습니다.'
    });
  } catch (err) {
    handleError(res, err, 'Failed to delete user');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = { router, setPool };
