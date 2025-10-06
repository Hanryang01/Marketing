# SIHM 사용자 관리 시스템

Smart Industrial Hygiene Management User Management System

## 📋 프로젝트 개요

SIHM 사용자 관리 시스템은 산업위생관리 서비스를 이용하는 사용자들을 체계적으로 관리하는 웹 애플리케이션입니다.

## 🚀 시작하기

### 필수 요구사항

- Node.js 16.x 이상
- MySQL 8.0 이상
- npm 또는 yarn

### 설치 및 실행

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3001

   # MySQL Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=8123
   DB_NAME=sihm_user_management
   DB_CONNECTION_LIMIT=20

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

3. **MySQL 데이터베이스 설정**
   ```bash
   # MySQL 설치 및 데이터베이스 생성
   mysql -u root -p
   CREATE DATABASE sihm_user_management;
   
   # 스키마 적용
   mysql -u root -p sihm_user_management < mysql-schema.sql
   ```

4. **애플리케이션 실행**
   ```bash
   # 개발 모드 (서버 + 프론트엔드 동시 실행)
   npm run dev
   
   # 또는 개별 실행
   npm run server:mysql  # 백엔드 서버만
   npm start            # 프론트엔드만
   ```

5. **브라우저에서 확인**
   ```
   http://localhost:3000
   ```

## 🏗️ 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── Login.js        # 로그인 페이지
│   ├── Login.css       # 로그인 페이지 스타일
│   ├── DashboardPage.js # 대시보드 (사용자 관리)
│   ├── UserManagement.js # 사용자 관리
│   ├── SalesManagement.js # 매출 관리
│   └── ...            # 기타 컴포넌트들
├── config/
│   └── mysql.js       # MySQL 데이터베이스 연결
├── App.js             # 메인 애플리케이션
└── index.js           # 진입점

server-mysql.js        # Express 서버 (MySQL)
mysql-schema.sql       # MySQL 데이터베이스 스키마
```

## ✨ 주요 기능

### 🔐 로그인 시스템
- ID 기반 로그인 (현재는 확인 버튼만으로 로그인 가능)
- SIHM 브랜드 로고 및 Marketing 페이지 표시
- 반응형 디자인

### 👥 사용자 관리
- 전체 사용자 조회
- 업체별 분류 (컨설팅업체, 일반사업장, 무료사용자)
- 상세 검색 및 필터링
- 사용량 모니터링 (MSDS, AI 영상분석, AI 보고서)

### 📊 데이터베이스
- MySQL 기반
- 사용자 정보, 사용량 제한, 로그 등 관리
- 승인 이력 관리
- 매출 데이터 관리

## 🎨 UI/UX 특징

- **모던한 디자인**: 그라디언트와 그림자 효과
- **반응형 레이아웃**: 모바일 및 데스크톱 최적화
- **직관적인 네비게이션**: 사이드바 메뉴 구조
- **시각적 피드백**: 호버 효과 및 애니메이션

## 🔧 기술 스택

### Frontend
- React 18.x
- CSS3 (Grid, Flexbox, Animations)
- React Router (라우팅)

### Backend
- Node.js
- Express.js
- MySQL (데이터베이스)
- mysql2 (MySQL 클라이언트)

### 개발 도구
- npm
- ESLint
- React Scripts

## 📱 반응형 지원

- **데스크톱**: 1200px 이상
- **태블릿**: 768px - 1199px
- **모바일**: 767px 이하

## 🚀 배포

### 프로덕션 빌드
```bash
npm run build
```

### PM2를 사용한 배포
```bash
# PM2 설치 (전역)
npm install -g pm2

# 프로덕션 환경으로 시작
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status

# 로그 확인
pm2 logs sihm-marketing

# 모니터링
pm2 monit
```

### 자동 배포 스크립트

#### Linux/Mac
```bash
# 실행 권한 부여
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

#### Windows
```cmd
# 배포 실행
deploy-windows.bat

# 앱 시작
start-windows.bat
```

### SSL 인증서 설정
```bash
# 실행 권한 부여
chmod +x setup-ssl.sh

# SSL 설정
./setup-ssl.sh
```

### 환경별 설정
- 개발: `NODE_ENV=development`
- 프로덕션: `NODE_ENV=production`

### 배포 URL
- 프로덕션: https://marketing.sihm.co.kr
- API: https://marketing.sihm.co.kr/api/test

## 📚 추가 문서

- [데이터베이스 스키마](mysql-schema.sql)
- [서버 설정](ecosystem.config.js)

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

**SIHM** - Smart Industrial Hygiene Management

