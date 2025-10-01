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
    password: process.env.DB_PASSWORD || '8123',
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
    : ['http://localhost:3000', 'http://localhost:3002'];
  
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
          await conn.execute(`
            INSERT INTO company_history (
              user_id_string, company_name, user_name, company_type, status_type,
              start_date, end_date, pricing_plan, mobile_phone, email, manager_position, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
            user.manager_position || null
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

// 자동 만료 처리 스케줄링 (자정에만 실행)
const scheduleExpiredUserProcessing = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    checkAndUpdateExpiredApprovals();
    
    setInterval(() => {
      checkAndUpdateExpiredApprovals();
    }, 24 * 60 * 60 * 1000); // 24시간마다 반복
  }, timeUntilMidnight);
  
  console.log(`⏰ 자동 만료 처리 스케줄링 완료 - 다음 실행: ${tomorrow.toISOString()}`);
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
