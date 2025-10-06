@echo off
REM SIHM Marketing Windows 시작 스크립트

echo 🚀 SIHM Marketing 시작...

REM 프로젝트 디렉토리로 이동
cd /d "C:\Users\hchoi\Admin Project\Marketing"

REM PM2로 앱 시작
echo 📱 PM2로 앱 시작...
pm2 start ecosystem.config.js --env production

REM 상태 확인
echo 📊 PM2 상태 확인...
pm2 status

echo ✅ 시작 완료!
echo 🌍 사이트: https://marketing.sihm.co.kr
echo 📝 로그 확인: pm2 logs sihm-marketing

pause
