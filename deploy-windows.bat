@echo off
REM SIHM Marketing Windows 배포 스크립트

echo 🚀 SIHM Marketing 배포 시작...

REM 1. Git에서 최신 코드 가져오기
echo 📥 최신 코드 가져오기...
git pull origin main

REM 2. 의존성 설치
echo 📦 의존성 설치...
npm install

REM 3. React 앱 빌드 (프로덕션 환경)
echo 🔨 React 앱 빌드...
set NODE_ENV=production
npm run build

REM 4. PM2로 서버 재시작
echo 🔄 서버 재시작...
pm2 restart sihm-marketing

REM 5. 상태 확인
echo 📊 PM2 상태 확인...
pm2 status

echo ✅ 배포 완료!
echo 🌍 사이트: https://marketing.sihm.co.kr
echo 📝 로그 확인: pm2 logs sihm-marketing

pause
