const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

// 한국 시간대 설정
process.env.TZ = 'Asia/Seoul';

// 환경 감지 (개발/프로덕션)
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DB_NAME === 'sihm_local';

// 설정값 상수화
const config = {
  server: {
    port: process.env.PORT || 3003
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Tech8123!',
    database: process.env.DB_NAME || (isDevelopment ? 'sihm_local' : 'sihm_user_management'),
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+09:00',
    // acquireTimeout과 timeout은 MySQL2 Connection에서 지원하지 않음
    // Connection Pool 레벨에서만 사용 가능
  }
};

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS 설정
app.use((req, res, next) => {
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.CORS_ORIGIN || 'https://your-domain.com']
    : ['http://localhost:3003'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 정적 파일 서빙 (React 빌드 파일)
app.use(express.static('build'));

// Create connection pool
const pool = mysql.createPool(config.database);

// 유틸리티 함수들 설정
const { setPool } = require('./utils/helpers');
setPool(pool);

// 라우터들 설정
const { router: usersRouter, setPool: setUsersPool } = require('./routes/users');
const { router: revenueRouter, setPool: setRevenuePool } = require('./routes/revenue');
const { router: historyRouter, setPool: setHistoryPool } = require('./routes/history');

// 각 라우터에 데이터베이스 풀 설정
setUsersPool(pool);
setRevenuePool(pool);
setHistoryPool(pool);

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// API 테스트 엔드포인트
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// 수동 만료 처리 API
app.post('/api/process-expired-approvals', async (req, res) => {
  try {
    const updatedCount = await checkAndUpdateExpiredApprovals();
    res.json({
      success: true,
      message: `만료 처리 완료: ${updatedCount}명 처리됨`,
      processedCount: updatedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 수동 만료 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: '만료 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 알림 조회 API
app.get('/api/notifications', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [notifications] = await connection.execute(`
      SELECT id, type, title, message, is_read, created_at, read_at, expires_at
      FROM notifications 
      WHERE expires_at > NOW()
      ORDER BY created_at DESC
    `);
    
    connection.release();
    
    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('❌ 알림 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 알림 읽음 처리 API
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(`
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = ? AND expires_at > NOW()
    `, [id]);
    
    connection.release();
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: '알림을 읽음 처리했습니다.'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다.'
      });
    }
  } catch (error) {
    console.error('❌ 알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 읽음 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 알림 삭제 API
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(`
      DELETE FROM notifications 
      WHERE id = ?
    `, [id]);
    
    connection.release();
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: '알림을 삭제했습니다.'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다.'
      });
    }
  } catch (error) {
    console.error('❌ 알림 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 삭제 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 수동 알림 생성 API (테스트용)
app.post('/api/create-notifications', async (req, res) => {
  try {
    await createNotifications();
    res.json({
      success: true,
      message: '알림 생성이 완료되었습니다.',
      timestamp: new Date().toISOString(),
      koreaTime: new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"})
    });
  } catch (error) {
    console.error('❌ 수동 알림 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 세금계산서 알림 설정 조회 API
app.get('/api/tax-invoice-settings', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [settings] = await connection.execute(`
      SELECT id, company_name, day_of_month, is_active, created_at, updated_at
      FROM tax_invoice_notification_settings
      WHERE is_active = 1
      ORDER BY company_name, day_of_month
    `);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ 세금계산서 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '세금계산서 설정 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 세금계산서 알림 설정 저장 API
app.post('/api/tax-invoice-settings', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: '설정 데이터가 올바르지 않습니다.'
      });
    }
    
    // 기존 설정 비활성화
    await connection.execute(`
      UPDATE tax_invoice_notification_settings 
      SET is_active = 0 
      WHERE is_active = 1
    `);
    
    // 새 설정 추가
    for (const setting of settings) {
      if (setting.companyName && setting.day) {
        await connection.execute(`
          INSERT INTO tax_invoice_notification_settings (company_name, day_of_month, is_active)
          VALUES (?, ?, 1)
          ON DUPLICATE KEY UPDATE is_active = 1, updated_at = CURRENT_TIMESTAMP
        `, [setting.companyName, parseInt(setting.day)]);
      }
    }
    
    res.json({
      success: true,
      message: '세금계산서 알림 설정이 저장되었습니다.'
    });
  } catch (error) {
    console.error('❌ 세금계산서 설정 저장 실패:', error);
    res.status(500).json({
      success: false,
      message: '세금계산서 설정 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 시간대 테스트 API
app.get('/api/timezone-test', (req, res) => {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  
  res.json({
    success: true,
    utc: now.toISOString(),
    korea: koreaTime.toISOString(),
    koreaString: koreaTime.toLocaleString("ko-KR", {timeZone: "Asia/Seoul"}),
    todayString: require('./utils/helpers').DateUtils.getTodayString()
  });
});

// favicon 요청 처리
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content 응답
});

// manifest.json 요청 처리
app.get('/manifest.json', (req, res) => {
  res.json({
    "short_name": "SIHM",
    "name": "SIHM 사용자 관리 시스템",
    "icons": [
      {
        "src": "favicon.ico",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/x-icon"
      }
    ],
    "start_url": ".",
    "display": "standalone",
    "theme_color": "#000000",
    "background_color": "#ffffff"
  });
});

// 라우터 등록
app.use('/', usersRouter);
app.use('/', revenueRouter);
app.use('/', historyRouter);

// 중복 실행 방지를 위한 상태
let isProcessingExpiredApprovals = false;
let lastProcessTime = 0;

// 에러 로깅 함수
async function logError(connection, errorInfo) {
  try {
    await connection.execute(`
      INSERT INTO error_logs (
        error_type, error_message, user_id, company_name, 
        processing_date, error_details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      errorInfo.type,
      errorInfo.message,
      errorInfo.userId || null,
      errorInfo.companyName || null,
      errorInfo.processingDate || null,
      JSON.stringify(errorInfo.details || {})
    ]);
    console.log(`📝 에러 로그 기록 완료: ${errorInfo.type}`);
  } catch (logError) {
    console.error('❌ 에러 로그 기록 실패:', logError.message);
  }
}

// 알림 발송 함수 (한국시간 09:00에 실행)
async function scheduleErrorNotification(errorInfo) {
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const currentHour = koreaTime.getUTCHours();
    
    let notificationTime = new Date(koreaTime);
    if (currentHour >= 9) {
      notificationTime.setUTCDate(notificationTime.getUTCDate() + 1);
    }
    notificationTime.setUTCHours(9, 0, 0, 0);
    
    const utcNotificationTime = new Date(notificationTime.getTime() - (9 * 60 * 60 * 1000));
    const delayMs = utcNotificationTime.getTime() - now.getTime();
    
    console.log(`⏰ 에러 알림 스케줄링: ${koreaTime.toISOString()} (${delayMs}ms 후)`);
    
    setTimeout(async () => {
      await sendErrorNotification(errorInfo);
    }, delayMs);
    
  } catch (error) {
    console.error('❌ 알림 스케줄링 실패:', error.message);
  }
}

// 실제 알림 발송 함수
async function sendErrorNotification(errorInfo) {
  try {
    console.log('🚨 만료 처리 실패 알림 발송');
    console.log('='.repeat(50));
    console.log(`📅 처리 날짜: ${errorInfo.processingDate}`);
    console.log(`❌ 에러 타입: ${errorInfo.type}`);
    console.log(`📝 에러 메시지: ${errorInfo.message}`);
    console.log(`👤 영향받은 사용자: ${errorInfo.affectedUsers?.length || 0}명`);
    
    if (errorInfo.affectedUsers && errorInfo.affectedUsers.length > 0) {
      console.log('📋 실패한 사용자 목록:');
      errorInfo.affectedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.company_name} (${user.user_id})`);
      });
    }
    
    console.log('='.repeat(50));
    console.log('🔧 수동 처리 방법:');
    console.log('   1. 사용자 관리 페이지에서 해당 사용자 선택');
    console.log('   2. 승인 관리 모달에서 개별 처리');
    console.log('   3. 또는 사용자 상세 모달에서 직접 수정');
    console.log('='.repeat(50));
    
    // 실제 알림 발송 로직은 필요시 구현
    
  } catch (error) {
    console.error('❌ 알림 발송 실패:', error.message);
  }
}

// Helper function to check and update expired approvals
async function checkAndUpdateExpiredApprovals(connection = null) {
  const now = Date.now();
  if (isProcessingExpiredApprovals || (now - lastProcessTime) < 10000) {
    console.log('⏭️ 자동 만료 체크가 이미 진행 중이거나 최근에 실행되었습니다.');
    return 0;
  }
  
  isProcessingExpiredApprovals = true;
  lastProcessTime = now;
  
  const conn = connection || await pool.getConnection();
  let totalUpdatedCount = 0;
  let processingErrors = []; // 에러 정보를 수집할 배열
  
  try {
    const today = new Date();
    const todayString = require('./utils/helpers').DateUtils.getTodayString();
    
    console.log('🔍 자동 만료 체크 시작 (한국 시간):', { today, todayString });
    
    
    
    const [updateResult] = await conn.execute(`
      UPDATE users 
      SET end_date = DATE_ADD(end_date, INTERVAL 9 HOUR)
      WHERE end_date IS NOT NULL 
      AND end_date < '2025-01-01'  -- 2025년 이전 데이터만 수정
    `);
    
    if (updateResult.affectedRows > 0) {
      console.log(`🔄 UTC 종료일을 한국 시간으로 수정: ${updateResult.affectedRows}개`);
    }
    
    const [noEmailResult] = await conn.execute(`
      UPDATE users 
      SET email = CONCAT('user_', user_id, '@example.com')
      WHERE email = 'no-email@example.com'
    `);
    
    if (noEmailResult.affectedRows > 0) {
      console.log(`📧 no-email@example.com 처리: ${noEmailResult.affectedRows}개`);
    }
    
    const [expiredUsers] = await conn.execute(`
      SELECT 
        id, user_id, company_name, user_name, company_type, pricing_plan,
        start_date, end_date, mobile_phone, email, department, manager_position
      FROM users 
      WHERE approval_status = '승인 완료' 
      AND company_type IN ('컨설팅 업체', '일반 업체')
      AND end_date IS NOT NULL 
      AND DATE(end_date) < ?
    `, [todayString]);
    
    if (expiredUsers.length > 0) {
      for (const user of expiredUsers) {
        try {
          // 활성화 일수 계산
          let activeDays = 0;
          if (user.start_date && user.end_date) {
            const startDate = new Date(user.start_date);
            const endDate = new Date(user.end_date);
            const timeDiff = endDate.getTime() - startDate.getTime();
            activeDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // 시작일과 종료일 포함
          }
          
          await conn.execute(`
            INSERT INTO company_history (
              user_id_string, company_name, user_name, company_type, status_type,
              start_date, end_date, pricing_plan, mobile_phone, email, manager_position, active_days, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            user.user_id,
            user.company_name,
            user.user_name,
            user.company_type,
            '승인 완료',
            user.start_date,
            user.end_date,
            user.pricing_plan,
            user.mobile_phone,
            user.email,
            user.manager_position || null,
            activeDays
          ]);
          console.log(`📝 ${user.user_id} (${user.company_name}) - 기간 경과로 승인 완료 이력 기록`);
        } catch (historyError) {
          console.error(`❌ ${user.user_id} 이력 기록 실패:`, historyError.message);
          processingErrors.push({
            type: 'HISTORY_INSERT_FAILED',
            message: historyError.message,
            userId: user.user_id,
            companyName: user.company_name,
            processingDate: todayString,
            details: { user: user, error: historyError.message, stack: historyError.stack }
          });
        }
      }
      
      try {
        const [updateResult] = await conn.execute(`
          UPDATE users 
          SET approval_status = '승인 예정', 
              is_active = false, 
              company_type = '무료 사용자',
              pricing_plan = '무료',
              start_date = NULL,
              end_date = NULL,
              updated_at = NOW()
          WHERE approval_status = '승인 완료' 
          AND company_type IN ('컨설팅 업체', '일반 업체')
          AND end_date IS NOT NULL 
          AND DATE(end_date) < ?
        `, [todayString]);
        console.log(`✅ ${updateResult.affectedRows}개의 만료된 사용자를 무료 사용자로 변경했습니다:`);
        totalUpdatedCount += updateResult.affectedRows;
      } catch (updateError) {
        console.error('❌ 사용자 상태 변경 실패:', updateError.message);
        processingErrors.push({
          type: 'STATUS_UPDATE_FAILED',
          message: updateError.message,
          processingDate: todayString,
          details: { error: updateError.message, stack: updateError.stack, affectedUsers: expiredUsers }
        });
      }
    } else {
      console.log('📝 만료된 승인 완료 상태가 없습니다.');
    }
    
    console.log(`🔢 총 변경된 사용자 수: ${totalUpdatedCount}`);
    
    if (processingErrors.length > 0) {
      console.log(`⚠️ 처리 중 ${processingErrors.length}개의 에러 발생`);
      
      for (const errorInfo of processingErrors) {
        await logError(conn, errorInfo);
      }
      
      await scheduleErrorNotification({
        type: 'EXPIRED_PROCESSING_PARTIAL_FAILURE',
        message: `만료 처리 중 ${processingErrors.length}개의 에러 발생`,
        processingDate: todayString,
        affectedUsers: expiredUsers,
        errors: processingErrors
      });
    }
    
    return totalUpdatedCount;
    
  } catch (err) {
    console.error('❌ 만료 처리 전체 실패:', err);
    const errorInfo = {
      type: 'EXPIRED_PROCESSING_TOTAL_FAILURE',
      message: err.message,
      processingDate: require('./utils/helpers').DateUtils.getTodayString(),
      details: { error: err.message, stack: err.stack, timestamp: new Date().toISOString() }
    };
    await logError(conn, errorInfo);
    await scheduleErrorNotification(errorInfo);
    return 0;
  } finally {
    isProcessingExpiredApprovals = false;
    if (!connection) {
      conn.release();
    }
  }
}

// 알림 생성 함수 (한국 시간 기준)
async function createNotifications() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔔 알림 생성 시작...');
    
    // 한국 시간 기준으로 현재 날짜 계산
    const koreaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const todayString = koreaTime.getFullYear() + '-' + 
      String(koreaTime.getMonth() + 1).padStart(2, '0') + '-' + 
      String(koreaTime.getDate()).padStart(2, '0');
    
    // 14일 후 날짜 계산 (한국 시간 기준)
    const twoWeeksLater = new Date(koreaTime);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const twoWeeksLaterString = twoWeeksLater.getFullYear() + '-' + 
      String(twoWeeksLater.getMonth() + 1).padStart(2, '0') + '-' + 
      String(twoWeeksLater.getDate()).padStart(2, '0');
    
    console.log(`🇰🇷 한국 시간 기준 오늘: ${todayString}`);
    console.log(`🇰🇷 한국 시간 기준 14일 후: ${twoWeeksLaterString}`);
    
    // 오늘 날짜 (일) 추출
    const todayDay = koreaTime.getDate();
    console.log(`📅 오늘 날짜: ${todayDay}일`);
    
    // 세금계산서 발행 알림 생성 (오늘 날짜에 해당하는 설정이 있는 경우)
    const [taxInvoiceSettings] = await connection.execute(`
      SELECT company_name, day_of_month
      FROM tax_invoice_notification_settings
      WHERE is_active = 1 AND day_of_month = ?
    `, [todayDay]);
    
    for (const setting of taxInvoiceSettings) {
      try {
        // 해당 회사명과 일치하는 사용자 찾기
        const [users] = await connection.execute(`
          SELECT id, company_name, user_id
          FROM users 
          WHERE approval_status = '승인 완료'
          AND company_name = ?
          AND company_type IN ('컨설팅 업체', '일반 업체')
        `, [setting.company_name]);
        
        for (const user of users) {
          // 이미 오늘 세금계산서 알림이 생성되었는지 확인
          const [existingNotification] = await connection.execute(`
            SELECT id FROM notifications 
            WHERE user_id = ? 
            AND type = 'tax_invoice' 
            AND DATE(created_at) = CURDATE()
          `, [user.id]);
          
          if (existingNotification.length === 0) {
            await connection.execute(`
              INSERT INTO notifications (user_id, type, title, message, created_at, expires_at)
              VALUES (?, 'tax_invoice', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
            `, [
              user.id,
              '세금계산서 발행 알림',
              `${setting.company_name}의 세금계산서 발행일입니다. (매월 ${setting.day_of_month}일)`
            ]);
            notificationCount++;
            console.log(`📢 세금계산서 발행 알림 생성: ${setting.company_name} (ID: ${user.id})`);
          }
        }
      } catch (error) {
        console.error(`❌ 세금계산서 알림 생성 실패: ${setting.company_name}`, error.message);
      }
    }
    
    // 오늘 종료일인 사용자들 (한국 시간 기준)
    const [todayEndUsers] = await connection.execute(`
      SELECT id, company_name, user_id, end_date
      FROM users 
      WHERE approval_status = '승인 완료'
      AND company_type IN ('컨설팅 업체', '일반 업체')
      AND end_date IS NOT NULL
      AND DATE(CONVERT_TZ(end_date, '+00:00', '+09:00')) = ?
    `, [todayString]);
    
    // 14일 후 종료일인 사용자들 (한국 시간 기준)
    const [twoWeekEndUsers] = await connection.execute(`
      SELECT id, company_name, user_id, end_date
      FROM users 
      WHERE approval_status = '승인 완료'
      AND company_type IN ('컨설팅 업체', '일반 업체')
      AND end_date IS NOT NULL
      AND DATE(CONVERT_TZ(end_date, '+00:00', '+09:00')) = ?
    `, [twoWeeksLaterString]);
    
    let notificationCount = 0;
    
    // 오늘 종료일 알림 생성
    for (const user of todayEndUsers) {
      try {
        await connection.execute(`
          INSERT INTO notifications (user_id, type, title, message, created_at, expires_at)
          VALUES (?, 'end_date_today', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
        `, [
          user.id,
          '서비스 종료일 알림',
          `${user.company_name}의 서비스가 오늘(${todayString}) 종료됩니다.`
        ]);
        notificationCount++;
        console.log(`📢 오늘 종료일 알림 생성: ${user.company_name} (ID: ${user.id})`);
      } catch (error) {
        console.error(`❌ 오늘 종료일 알림 생성 실패: ${user.company_name}`, error.message);
      }
    }
    
    // 14일 후 종료일 알림 생성
    for (const user of twoWeekEndUsers) {
      try {
        await connection.execute(`
          INSERT INTO notifications (user_id, type, title, message, created_at, expires_at)
          VALUES (?, 'end_date_14days', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
        `, [
          user.id,
          '서비스 종료일 14일전 알림',
          `${user.company_name}의 서비스가 14일 후(${twoWeeksLaterString}) 종료됩니다.`
        ]);
        notificationCount++;
        console.log(`📢 14일 후 종료일 알림 생성: ${user.company_name} (ID: ${user.id})`);
      } catch (error) {
        console.error(`❌ 14일 후 종료일 알림 생성 실패: ${user.company_name}`, error.message);
      }
    }
    
    console.log(`✅ 알림 생성 완료: ${notificationCount}개 생성`);
    
    // 만료된 알림 삭제 (7일 이상 된 알림)
    const [deleteResult] = await connection.execute(`
      DELETE FROM notifications 
      WHERE expires_at < NOW()
    `);
    
    if (deleteResult.affectedRows > 0) {
      console.log(`🗑️ 만료된 알림 삭제: ${deleteResult.affectedRows}개`);
    }
    
  } catch (error) {
    console.error('❌ 알림 생성 실패:', error.message);
  } finally {
    connection.release();
  }
}

// 자동 만료 처리 스케줄링 (한국 시간 자정에만 실행)
const scheduleExpiredUserProcessing = () => {
  const now = new Date();
  
  // 한국 시간 기준으로 다음 자정 계산
  const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const tomorrowKorea = new Date(koreaTime);
  tomorrowKorea.setDate(tomorrowKorea.getDate() + 1);
  tomorrowKorea.setHours(0, 0, 0, 0);
  
  // 한국 시간 자정을 UTC로 변환
  const utcMidnight = new Date(tomorrowKorea.toLocaleString("en-US", {timeZone: "UTC"}));
  const timeUntilMidnight = utcMidnight.getTime() - now.getTime();
  
  console.log(`🇰🇷 한국 시간 기준 다음 자정: ${tomorrowKorea.toISOString()}`);
  console.log(`🌍 UTC 기준 실행 시간: ${utcMidnight.toISOString()}`);
  console.log(`⏰ 대기 시간: ${Math.round(timeUntilMidnight / 1000 / 60)}분`);
  
  setTimeout(() => {
    console.log('🚀 한국 시간 자정 도달 - 만료 처리 및 알림 생성 시작');
    checkAndUpdateExpiredApprovals();
    createNotifications();
    
    setInterval(() => {
      console.log('🔄 24시간 주기 실행 - 만료 처리 및 알림 생성');
      checkAndUpdateExpiredApprovals();
      createNotifications();
    }, 24 * 60 * 60 * 1000); // 24시간마다 반복
  }, timeUntilMidnight);
  
  console.log(`⏰ 자동 만료 처리 및 알림 생성 스케줄링 완료 - 다음 실행: ${tomorrowKorea.toISOString()}`);
};

// 누락된 만료 처리 복구 함수
const recoverMissedProcessing = async () => {
  try {
    console.log('🔍 누락된 만료 처리 복구 시작...');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = require('./utils/helpers').DateUtils.getTodayString();
    
    console.log(`📅 어제 날짜 확인: ${yesterdayString}`);
    
    // 어제 처리되지 않은 만료 사용자 확인 및 처리
    const recoveredCount = await checkAndUpdateExpiredApprovals();
    
    if (recoveredCount > 0) {
      console.log(`✅ 누락된 만료 처리 복구 완료: ${recoveredCount}명 처리`);
    } else {
      console.log('📝 복구할 만료된 사용자가 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 누락 복구 실패:', error.message);
  }
};

// SPA 라우팅을 위한 fallback 설정 (모든 경로를 index.html로 리다이렉트)
app.use((req, res, next) => {
  // API 경로는 제외
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // 정적 파일이 아닌 경우 index.html로 리다이렉트
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 서버 초기화 및 시작
const startServer = async () => {
  try {
    
    app.listen(config.server.port, () => {
      console.log(`🚀 Server running on port ${config.server.port}`);
      console.log(`📊 MySQL Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  console.log(`🔧 Environment: ${isDevelopment ? 'DEVELOPMENT (sihm_local)' : 'PRODUCTION (sihm_user_management)'}`);
      
      // 서버 시작 시 누락된 처리 복구
      recoverMissedProcessing();
      
      // 정상 스케줄링 시작
      scheduleExpiredUserProcessing();
    });
    
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error.message);
    console.error('❌ 오류 상세:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
