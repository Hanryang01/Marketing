#!/bin/bash

# SIHM Admin 배포 스크립트
# 사용법: ./deploy.sh

set -e

echo "🚀 SIHM Admin 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수 정의
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 의존성 설치
log_info "의존성 설치 중..."
npm ci --production

# 2. 프로덕션 빌드
log_info "프로덕션 빌드 생성 중..."
npm run build

# 3. PM2로 앱 중지
log_info "기존 앱 중지 중..."
pm2 stop sihm-admin || true
pm2 delete sihm-admin || true

# 4. PM2로 앱 시작
log_info "PM2로 앱 시작 중..."
pm2 start ecosystem.config.js --env production

# 5. PM2 상태 확인
log_info "PM2 상태 확인 중..."
pm2 status

# 6. Nginx 설정 테스트
log_info "Nginx 설정 테스트 중..."
sudo nginx -t

# 7. Nginx 재시작
log_info "Nginx 재시작 중..."
sudo systemctl reload nginx

# 8. 서비스 상태 확인
log_info "서비스 상태 확인 중..."
echo "PM2 상태:"
pm2 status sihm-admin

echo "Nginx 상태:"
sudo systemctl status nginx --no-pager -l

echo "포트 확인:"
netstat -tlnp | grep :3001 || echo "포트 3001이 열려있지 않습니다."

# 9. 헬스 체크
log_info "헬스 체크 중..."
sleep 5
if curl -f http://localhost:3001/api/test > /dev/null 2>&1; then
    log_info "✅ 서버가 정상적으로 실행 중입니다."
else
    log_error "❌ 서버 헬스 체크 실패"
    exit 1
fi

log_info "🎉 배포가 완료되었습니다!"
log_info "웹사이트: https://manage.sihm.co.kr"
log_info "API 테스트: https://manage.sihm.co.kr/api/test"

# PM2 모니터링 시작 (선택사항)
read -p "PM2 모니터링을 시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 monit
fi
