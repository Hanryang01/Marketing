const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('fontkit');
require('dotenv').config();

// ─── 인증 토큰 저장소 (tokenStore 모듈) ───
const { generateToken, saveToken, deleteToken, verifyToken, TOKEN_TTL_MS } = require('./utils/tokenStore');

// 인증 불필요 경로 목록
const AUTH_BYPASS_PATHS = [
  '/api/auth/login',
  '/api/test',
  '/api/test-font',
  '/api/timezone-test',
  '/health',
];

// API 인증 미들웨어
const requireAuth = (req, res, next) => {
  // 인증 제외 경로
  if (AUTH_BYPASS_PATHS.includes(req.path)) return next();
  // API 경로가 아니면 통과 (정적 파일, SPA fallback)
  if (!req.path.startsWith('/api/')) return next();

  console.log(`[AUTH DEBUG] ${req.method} ${req.path}`);
  console.log(`[AUTH DEBUG] Headers:`, JSON.stringify(req.headers));

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH DEBUG] No valid auth header found. Blocking.`);
    return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
  }

  const token = authHeader.slice(7);
  const tokenData = verifyToken(token);

  if (!tokenData) {
    console.log(`[AUTH DEBUG] Invalid or expired token. Blocking.`);
    return res.status(401).json({ success: false, error: '유효하지 않거나 만료된 토큰입니다. 다시 로그인해 주세요.' });
  }

  console.log(`[AUTH DEBUG] Token valid for user ${tokenData.user.username}`);
  req.user = tokenData.user;
  next();
};

// 알림 관련 모듈들
const notificationRoutes = require('./routes/notifications');
const NotificationService = require('./services/notificationService');

// 세금계산서 관련 모듈들
const taxInvoiceRoutes = require('./routes/taxInvoice');
const TaxInvoiceService = require('./services/taxInvoiceService');

// 지출 관련 모듈들
const { router: expenseRouter, setPool: setExpensesPool } = require('./routes/expenses');


// 한국 시간대 설정
process.env.TZ = 'Asia/Seoul';

// 환경 감지 (개발/프로덕션)
const isDevelopment = process.env.NODE_ENV === 'development';

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
    database: process.env.DB_NAME || 'sihm_local',
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

// 유틸리티 함수들은 utils/logger.js, utils/helpers.js로 이동됨
const { logger } = require('./utils/logger');
const { withDatabase, handleApiError } = require('./utils/helpers');
const DateUtils = require('./utils/dateUtils');

// Middleware
app.use(express.json({
  limit: '10mb',
  strict: false,
  type: 'application/json',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      console.error('JSON 파싱 전 검증 실패:', e.message);
      console.error('버퍼 내용:', buf.toString());
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JSON 파싱 오류 처리 미들웨어
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON 파싱 오류:', error.message);
    console.error('요청 본문:', req.body);
    return res.status(400).json({
      error: '잘못된 JSON 형식입니다.',
      details: error.message
    });
  }
  next();
});

// CORS 설정 - 모든 라우트보다 먼저 등록
app.use((req, res, next) => {
  // 개발 환경에서는 모든 origin 허용
  if (process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // 프로덕션 환경에서는 특정 origin만 허용
    const allowedOrigins = [process.env.CORS_ORIGIN || 'http://marketing.sihm.co.kr'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
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

// ─── API 인증 미들웨어 등록 (모든 라우터보다 먼저) ───
app.use(requireAuth);

// 알림 라우트 연결
app.use('/api/notifications', notificationRoutes);

// 세금계산서 라우트 연결
app.use('/api/tax-invoice-settings', taxInvoiceRoutes);

// 지출 라우트 연결
app.use('/api/expenses', expenseRouter);

// PDF 생성 API - 텍스트 덮어쓰기 방식
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { companyName, date, priceInfo, selectedPlan, companyType, usagePeriod } = req.body;


    // PDF 템플릿 로드
    const templatePath = path.join(__dirname, 'public', '견적서 템플릿.pdf');
    const templateBytes = fs.readFileSync(templatePath);

    // PDF 문서 로드
    const pdfDoc = await PDFDocument.load(templateBytes);

    // fontkit 등록 (한글 폰트 지원)
    try {
      pdfDoc.registerFontkit(fontkit);
    } catch (fontkitError) {
      console.error('fontkit 등록 실패:', fontkitError);
      throw new Error('fontkit 등록에 실패했습니다');
    }

    // 한글 폰트 로드
    const fontPath = path.join(__dirname, 'public', 'fonts', 'NotoSansKR-Regular.ttf');
    let koreanFont;

    try {
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        koreanFont = await pdfDoc.embedFont(fontBytes);
      } else {
        throw new Error(`한글 폰트 파일을 찾을 수 없습니다: ${fontPath}`);
      }
    } catch (fontError) {
      console.error('한글 폰트 로드 실패:', fontError);
      // 폴백: 기본 폰트 사용
      koreanFont = await pdfDoc.embedFont('Helvetica-Bold');
    }

    // 페이지 정보 가져오기
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();


    // 텍스트 덮어쓰기 좌표 정의
    const textPositions = {
      companyName: { x: 70, y: 580, size: 18 },
      quoteDate: { x: 402, y: 630, size: 13 },
      selectedPlan: { x: 138, y: 403, size: 13 },
      usagePeriod: { x: 138, y: 156, size: 13 },
      finalPrice1: { x: 138, y: 201, size: 13 },
      finalPrice2: { x: 308, y: 455, size: 18 }
    };

    // 한국 시간으로 오늘 날짜 생성
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const todayString = koreaTime.toISOString().split('T')[0];

    const textData = {
      companyName: companyName || '고객',
      quoteDate: todayString,
      companyType: companyType || '',
      selectedPlan: selectedPlan || '',
      usagePeriod: usagePeriod || '',
      finalPrice1: priceInfo?.finalPrice || 0,
      finalPrice2: priceInfo?.finalPrice || 0
    };


    Object.keys(textPositions).forEach(key => {
      const position = textPositions[key];
      const text = textData[key] || '';


      let displayText;

      if (key === 'companyName') {
        displayText = textData.companyName || '고객';
      } else if (key === 'quoteDate') {
        displayText = todayString;
      } else if (key === 'companyType') {
        displayText = textData.companyType === 'consulting' ? '컨설팅' : '일반';
      } else if (key === 'selectedPlan') {
        const plan = textData.selectedPlan;
        const planName = plan?.name || '기본';
        const typeText = textData.companyType === 'consulting' ? '컨설팅' : '일반';
        displayText = `SIHM ${planName} (${typeText})`;
      } else if (key === 'usagePeriod') {
        const period = textData.usagePeriod || 1;
        displayText = `가입승인일로부터 ${period}개월`;
      } else if (key === 'finalPrice1') {
        const finalPrice = priceInfo?.finalAmount || 0;
        displayText = `${finalPrice.toLocaleString()}원 (부가세포함)`;
      } else if (key === 'finalPrice2') {
        const finalPrice = priceInfo?.finalAmount || 0;
        displayText = `${finalPrice.toLocaleString()}원`;
      } else {
        displayText = text || '';
      }


      page.drawText(displayText, {
        x: position.x,
        y: position.y,
        size: position.size,
        font: koreanFont
      });

    });


    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quote_${date || 'temp'}.pdf"`);
    res.send(pdfBytes);


  } catch (error) {
    console.error('PDF 생성 중 오류:', error);
    res.status(500).json({
      error: 'PDF 생성 실패',
      message: error.message
    });
  }
});

// 정적 파일 서빙 (React 빌드 파일)
app.use(express.static('build'));

// Create connection pool
const pool = mysql.createPool(config.database);

// NotificationService에 pool 설정
NotificationService.setPool(pool);

// TaxInvoiceService에 pool 설정
TaxInvoiceService.setPool(pool);

// 라우터들 설정
const { router: usersRouter, setPool: setUsersPool } = require('./routes/users');
const { router: revenueRouter, setPool: setRevenuePool } = require('./routes/revenue');
const { router: historyRouter, setPool: setHistoryPool } = require('./routes/history');

// 각 라우터에 데이터베이스 풀 설정
setUsersPool(pool);
setRevenuePool(pool);
setHistoryPool(pool);
setExpensesPool(pool);

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

// 폰트 파일 테스트 엔드포인트
app.get('/api/test-font', async (req, res) => {
  try {
    const fontPath = path.join(__dirname, 'public', 'fonts', 'NotoSansKR-Regular.ttf');

    // 파일 존재 확인
    const fileExists = fs.existsSync(fontPath);
    const fileStats = fileExists ? fs.statSync(fontPath) : null;

    res.json({
      success: true,
      fontPath: fontPath,
      fileExists: fileExists,
      fileSize: fileStats ? fileStats.size : 0,
      lastModified: fileStats ? fileStats.mtime : null,
      message: fileExists ? '폰트 파일이 정상적으로 존재합니다' : '폰트 파일을 찾을 수 없습니다'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
    handleApiError(res, error, '수동 만료 처리 실패');
  }
});

// 알림 API들은 routes/notifications.js로 이동됨

// 수동 알림 생성 API (방법 2 - 간단한 배치 처리)
app.get('/api/admin/check-notifications', async (req, res) => {
  try {
    const result = await NotificationService.createNotifications();
    res.json({
      success: result.success,
      message: result.message,
      count: result.count || 0,
      timestamp: new Date().toISOString(),
      koreaTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    });
  } catch (error) {
    handleApiError(res, error, '알림 생성 실패');
  }
});

// 기존 API 호환성을 위한 엔드포인트 (deprecated)
app.post('/api/create-notifications', async (req, res) => {
  try {
    const result = await NotificationService.createNotifications();
    res.json({
      success: result.success,
      message: result.message,
      count: result.count || 0,
      timestamp: new Date().toISOString(),
      koreaTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    });
  } catch (error) {
    handleApiError(res, error, '수동 알림 생성 실패');
  }
});

// 세금계산서 API들은 routes/taxInvoice.js로 이동됨


// 시간대 테스트 API
app.get('/api/timezone-test', (req, res) => {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));

  res.json({
    success: true,
    utc: now.toISOString(),
    korea: koreaTime.toISOString(),
    koreaString: koreaTime.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    todayString: DateUtils.getTodayString()
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

// SPA fallback 라우팅 - 모든 React Router 경로를 index.html로 리다이렉트
app.use((req, res, next) => {
  // API 경로가 아닌 경우에만 SPA fallback 적용
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/health') &&
    !req.path.startsWith('/favicon.ico') && !req.path.startsWith('/manifest.json')) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    next();
  }
});

// 알림 관련 변수들은 services/notificationService.js로 이동됨

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
    logger.info(`에러 로그 기록 완료: ${errorInfo.type}`);
  } catch (logError) {
    console.error('❌ 에러 로그 기록 실패:', logError.message);
  }
}


// 중복 실행 방지를 위한 상태 (모듈 스코프)
let isProcessingExpiredApprovals = false;
let lastProcessTime = 0;

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
    const todayString = DateUtils.getTodayString();

    logger.info('자동 만료 체크 시작 (한국 시간):', { today, todayString });




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

      for (const errorInfo of processingErrors) {
        await logError(conn, errorInfo);
      }
    }

    return totalUpdatedCount;

  } catch (err) {
    console.error('❌ 만료 처리 전체 실패:', err);
    const errorInfo = {
      type: 'EXPIRED_PROCESSING_TOTAL_FAILURE',
      message: err.message,
      processingDate: DateUtils.getTodayString(),
      details: { error: err.message, stack: err.stack, timestamp: new Date().toISOString() }
    };
    await logError(conn, errorInfo);
    // 간단한 에러 로그 출력
    console.error('❌ 만료 처리 전체 실패:', err.message);
    return 0;
  } finally {
    isProcessingExpiredApprovals = false;
    if (!connection) {
      conn.release();
    }
  }
}




// 서버 초기화 및 시작
const startServer = async () => {
  try {

    app.listen(config.server.port, () => {
      console.log(`🚀 Server running on port ${config.server.port}`);
      console.log(`📊 MySQL Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
      console.log(`🔧 Environment: DEVELOPMENT (sihm_local)`);

      // 서버 시작 시 누락된 처리 복구 - cron job으로 대체됨
      // recoverMissedProcessing();

      console.log('✅ 서버가 준비되었습니다.');
      console.log('⏰ 알림 시스템: Cron Job으로 관리됩니다.');
    });

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error.message);
    console.error('❌ 오류 상세:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
