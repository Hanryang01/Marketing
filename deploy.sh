#!/bin/bash

# SIHM Marketing 배포 스크립트

echo "🚀 SIHM Marketing 배포 시작..."

# 1. Git에서 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git pull origin main

# 2. 의존성 설치
echo "📦 의존성 설치..."
npm install

# 3. React 앱 빌드 (프로덕션 환경)
echo "🔨 React 앱 빌드..."
NODE_ENV=production npm run build

# 4. Systemd로 서버 재시작
echo "🔄 서버 재시작..."
sudo systemctl restart sihm-marketing

# 5. Nginx 설정 리로드
echo "🌐 Nginx 설정 리로드..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ 배포 완료!"
echo "🌍 사이트: https://marketing.sihm.co.kr"
echo "📊 서버 상태: sudo systemctl status sihm-marketing"
echo "📝 로그 확인: sudo journalctl -u sihm-marketing -f"
