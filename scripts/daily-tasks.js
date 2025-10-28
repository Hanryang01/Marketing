#!/usr/bin/env node

/**
 * 일일 작업 통합 스크립트
 * 매일 자정에 실행되어 만료 처리와 알림 생성을 수행합니다.
 */

const path = require('path');
const fs = require('fs');

// 환경 설정 (디렉토리 변경 전에 먼저 로드)
require('dotenv').config();

// 프로젝트 루트 디렉토리로 이동
process.chdir(path.join(__dirname, '..'));

// 한국 시간대 설정 (명시적 설정)
process.env.TZ = 'Asia/Seoul';

// 시간대 검증
const now = new Date();
const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
const utcTime = new Date(now.toISOString());

console.log('=== 시간대 검증 ===');
console.log('UTC 시간:', utcTime.toISOString());
console.log('한국 시간:', koreaTime.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}));
console.log('시간대 차이:', (koreaTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60), '시간');
console.log('');

// 모듈 import
const NotificationService = require('../services/notificationService');
const { logger } = require('../utils/logger');
const DateUtils = require('../utils/dateUtils');
const mysql = require('mysql2/promise');

// 데이터베이스 연결 풀 생성 (에러 처리 포함)
let pool;
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Tech8123!',
    database: process.env.DB_NAME || 'sihm_user_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+09:00'
  });
  console.log('✅ 데이터베이스 연결 풀 생성 완료');
} catch (error) {
  console.error('❌ 데이터베이스 연결 풀 생성 실패:', error.message);
  process.exit(1);
}

// NotificationService에 pool 설정 (에러 처리 포함)
try {
  NotificationService.setPool(pool);
  console.log('✅ NotificationService pool 설정 완료');
} catch (error) {
  console.error('❌ NotificationService pool 설정 실패:', error.message);
  process.exit(1);
}

// 중복 실행 방지를 위한 상태
let isProcessingExpiredApprovals = false;
let lastProcessTime = 0;

// 만료 처리 함수 (server.js에서 복사)
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
    const todayString = DateUtils.getTodayString();
    
    logger.info('자동 만료 체크 시작 (한국 시간):', { today, todayString });
    
    // UTC 종료일을 한국 시간으로 수정 (2025년 이전 데이터만)
    const [updateResult] = await conn.execute(`
      UPDATE users 
      SET end_date = DATE_ADD(end_date, INTERVAL 9 HOUR)
      WHERE end_date IS NOT NULL 
      AND end_date < '2025-01-01'  -- 2025년 이전 데이터만 수정
    `);
    
    if (updateResult.affectedRows > 0) {
      console.log(`🔄 UTC 종료일을 한국 시간으로 수정: ${updateResult.affectedRows}개`);
    }
    
    // no-email@example.com 처리
    const [noEmailResult] = await conn.execute(`
      UPDATE users 
      SET email = CONCAT('user_', user_id, '@example.com')
      WHERE email = 'no-email@example.com'
    `);
    
    if (noEmailResult.affectedRows > 0) {
      console.log(`📧 no-email@example.com 처리: ${noEmailResult.affectedRows}개`);
    }
    
    // 만료된 사용자 조회
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
      // 1단계: company_history에 이력 기록
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
          logger.info(`${user.user_id} (${user.company_name}) - 기간 경과로 승인 완료 이력 기록`);
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
      
      // 2단계: users 테이블 상태 변경
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
      logger.info('만료된 승인 완료 상태가 없습니다.');
    }
    
    console.log(`🔢 총 변경된 사용자 수: ${totalUpdatedCount}`);
    
    if (processingErrors.length > 0) {
      console.log(`⚠️ 처리 중 ${processingErrors.length}개의 에러 발생`);
      // 에러 로깅은 간단히 콘솔에만 출력
      for (const errorInfo of processingErrors) {
        console.error(`에러: ${errorInfo.type} - ${errorInfo.message}`);
      }
    }
    
    return totalUpdatedCount;
    
  } catch (err) {
    console.error('❌ 만료 처리 전체 실패:', err);
    return 0;
  } finally {
    isProcessingExpiredApprovals = false;
    if (!connection) {
      conn.release();
    }
  }
}

/**
 * 메인 실행 함수
 */
async function runDailyTasks() {
  const todayString = DateUtils.getTodayString();
  const logFile = path.join(__dirname, '../logs/daily-tasks.log');
  
  try {
    logger.info('=== 일일 작업 시작 ===');
    logger.info(`실행 시간: ${new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}`);
    logger.info(`대상 날짜: ${todayString}`);
    
    // 현재 시간 로깅 (참고용)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    logger.info(`현재 한국 시간: ${koreaTime.toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}`);
    
    // 로그 파일에 실행 기록
    const logEntry = `[${new Date().toISOString()}] 일일 작업 시작: ${todayString}\n`;
    fs.appendFileSync(logFile, logEntry);
    
    let expiredCount = 0;
    let notificationCount = 0;
    
    // 1단계: 만료 처리 실행
    logger.info('1단계: 만료 처리 시작');
    try {
      expiredCount = await checkAndUpdateExpiredApprovals();
      logger.info(`만료 처리 완료: ${expiredCount}명 처리됨`);
    } catch (expireError) {
      logger.error('만료 처리 실패:', expireError);
      console.error('❌ 만료 처리 실패:', expireError.message);
    }
    
    // 2단계: 알림 생성 실행
    logger.info('2단계: 알림 생성 시작');
    try {
      const result = await NotificationService.createNotifications();
      if (result.success) {
        notificationCount = result.count;
        logger.success(`알림 생성 완료: ${notificationCount}개 생성됨`);
      } else {
        logger.error(`알림 생성 실패: ${result.message}`);
        console.error('❌ 알림 생성 실패:', result.message);
      }
    } catch (notificationError) {
      logger.error('알림 생성 실패:', notificationError);
      console.error('❌ 알림 생성 실패:', notificationError.message);
    }
    
    // 성공 로그 기록
    const successLog = `[${new Date().toISOString()}] 성공: 만료 ${expiredCount}명, 알림 ${notificationCount}개\n`;
    fs.appendFileSync(logFile, successLog);
    
    logger.success(`일일 작업 완료: 만료 ${expiredCount}명, 알림 ${notificationCount}개`);
    
  } catch (error) {
    logger.error('일일 작업 중 오류:', error);
    console.error('❌ 일일 작업 실패:', error.message);
    
    // 에러 로그 기록
    const errorLog = `[${new Date().toISOString()}] 오류: ${error.message}\n`;
    fs.appendFileSync(logFile, errorLog);
    
    process.exit(1); // 에러 발생 시 스크립트 종료
  } finally {
    // 데이터베이스 연결 정리
    if (pool) {
      await pool.end();
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  runDailyTasks()
    .then(() => {
      logger.info('일일 작업 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('치명적 오류:', error);
      process.exit(1);
    });
}

module.exports = { runDailyTasks, checkAndUpdateExpiredApprovals };
