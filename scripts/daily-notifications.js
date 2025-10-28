#!/usr/bin/env node

/**
 * Cron Job 일일 알림 생성 스크립트
 * 매일 오전 9시에 실행되어 알림을 생성합니다.
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

/**
 * 메인 실행 함수
 */
async function runDailyNotifications() {
  const todayString = DateUtils.getTodayString();
  const logFile = path.join(__dirname, '../logs/cron-notifications.log');
  
  try {
    logger.info('=== Cron Job: 일일 알림 생성 시작 ===');
    logger.info(`실행 시간: ${new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}`);
    logger.info(`대상 날짜: ${todayString}`);
    
    // 현재 시간 로깅 (참고용)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    logger.info(`현재 한국 시간: ${koreaTime.toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}`);
    
    // 로그 파일에 실행 기록
    const logEntry = `[${new Date().toISOString()}] Cron Job 시작: ${todayString}\n`;
    fs.appendFileSync(logFile, logEntry);
    
    // 알림 생성 실행 (DB 기반 중복 방지 로직 포함)
    const result = await NotificationService.createNotifications();
    
    if (result.success) {
      logger.success(`Cron Job: 알림 생성 완료 - ${result.count}개`);
      
      // 성공 로그 기록
      const successLog = `[${new Date().toISOString()}] 성공: ${result.count}개 생성\n`;
      fs.appendFileSync(logFile, successLog);
      
    } else {
      logger.error(`Cron Job: 알림 생성 실패 - ${result.message}`);
      
      // 실패 로그 기록
      const errorLog = `[${new Date().toISOString()}] 실패: ${result.message}\n`;
      fs.appendFileSync(logFile, errorLog);
    }
    
  } catch (error) {
    logger.error('Cron Job: 알림 생성 중 오류:', error);
    
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
  runDailyNotifications()
    .then(() => {
      logger.info('Cron Job: 일일 알림 생성 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Cron Job: 치명적 오류:', error);
      process.exit(1);
    });
}

module.exports = { runDailyNotifications };
