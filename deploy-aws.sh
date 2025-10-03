#!/bin/bash

# SIHM Admin AWS EC2 배포 스크립트
# 사용법: ./deploy-aws.sh

set -e

echo "🚀 SIHM Admin AWS EC2 배포 시작..."

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

# AWS EC2 환경 확인
log_info "AWS EC2 환경 확인 중..."
if [ ! -f "/etc/os-release" ]; then
    log_error "이 스크립트는 Linux 환경에서만 실행할 수 있습니다."
    exit 1
fi

# Node.js 버전 확인
log_info "Node.js 버전 확인 중..."
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되지 않았습니다. Node.js 16.x 이상을 설치해주세요."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    log_error "Node.js 16.x 이상이 필요합니다. 현재 버전: $(node -v)"
    exit 1
fi

# MySQL 설치 확인
log_info "MySQL 설치 확인 중..."
if ! command -v mysql &> /dev/null; then
    log_info "MySQL 설치 중..."
    sudo apt update
    sudo apt install -y mysql-server
    
    # MySQL 보안 설정
    log_info "MySQL 보안 설정 중..."
    sudo mysql_secure_installation
else
    log_info "MySQL이 이미 설치되어 있습니다."
fi

# MySQL 서비스 시작 및 활성화
log_info "MySQL 서비스 시작 중..."
sudo systemctl start mysql
sudo systemctl enable mysql

# PM2 설치 확인
log_info "PM2 설치 확인 중..."
if ! command -v pm2 &> /dev/null; then
    log_info "PM2 설치 중..."
    npm install -g pm2
fi

# 환경 변수 파일 확인
log_info "환경 변수 파일 확인 중..."
if [ ! -f ".env.production" ]; then
    log_error ".env.production 파일이 없습니다. AWS 환경에 맞게 설정해주세요."
    exit 1
fi

# 환경 변수 로드
export $(cat .env.production | grep -v '^#' | xargs)

# 1. 의존성 설치
log_info "의존성 설치 중..."
npm ci --production

# 2. 데이터베이스 설정
log_info "데이터베이스 설정 중..."
# 데이터베이스 생성
sudo mysql -e "CREATE DATABASE IF NOT EXISTS sihm_user_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 스키마 적용
if [ -f "mysql-schema.sql" ]; then
    log_info "데이터베이스 스키마 적용 중..."
    sudo mysql sihm_user_management < mysql-schema.sql
    log_info "✅ 데이터베이스 스키마 적용 완료"
else
    log_warn "mysql-schema.sql 파일을 찾을 수 없습니다."
fi

# 3. 프로덕션 빌드
log_info "프로덕션 빌드 생성 중..."
npm run build

# 4. 웹 디렉토리 생성
log_info "웹 디렉토리 생성 중..."
sudo mkdir -p /var/www/marketing.sihm.co.kr
sudo cp -r build/* /var/www/marketing.sihm.co.kr/
sudo chown -R www-data:www-data /var/www/marketing.sihm.co.kr

# 5. PM2로 앱 중지
log_info "기존 앱 중지 중..."
pm2 stop sihm-admin || true
pm2 delete sihm-admin || true

# 6. PM2로 앱 시작
log_info "PM2로 앱 시작 중..."
pm2 start ecosystem.config.js --env production

# 7. PM2 상태 확인
log_info "PM2 상태 확인 중..."
pm2 status

# 8. PM2 자동 시작 설정
log_info "PM2 자동 시작 설정 중..."
pm2 startup
pm2 save

# 9. Nginx 설치 확인
log_info "Nginx 설치 확인 중..."
if ! command -v nginx &> /dev/null; then
    log_info "Nginx 설치 중..."
    sudo apt update
    sudo apt install -y nginx
fi

# 10. Nginx 설정 적용
log_info "Nginx 설정 적용 중..."
sudo cp nginx.conf /etc/nginx/sites-available/marketing.sihm.co.kr
sudo ln -sf /etc/nginx/sites-available/marketing.sihm.co.kr /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 11. Nginx 설정 테스트
log_info "Nginx 설정 테스트 중..."
sudo nginx -t

# 12. Nginx 재시작
log_info "Nginx 재시작 중..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# 13. 방화벽 설정
log_info "방화벽 설정 중..."
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable

# 14. 서비스 상태 확인
log_info "서비스 상태 확인 중..."
echo "MySQL 상태:"
sudo systemctl status mysql --no-pager -l

echo "PM2 상태:"
pm2 status sihm-admin

echo "Nginx 상태:"
sudo systemctl status nginx --no-pager -l

echo "포트 확인:"
netstat -tlnp | grep :3001 || echo "포트 3001이 열려있지 않습니다."
netstat -tlnp | grep :3306 || echo "포트 3306(MySQL)이 열려있지 않습니다."

# 15. 헬스 체크
log_info "헬스 체크 중..."
sleep 5
if curl -f http://localhost:3001/api/test > /dev/null 2>&1; then
    log_info "✅ 서버가 정상적으로 실행 중입니다."
else
    log_error "❌ 서버 헬스 체크 실패"
    exit 1
fi

log_info "🎉 AWS EC2 배포가 완료되었습니다!"
log_info "웹사이트: https://marketing.sihm.co.kr"
log_info "API 테스트: https://marketing.sihm.co.kr/api/test"

# SSL 설정 안내
log_warn "⚠️  SSL 인증서 설정이 필요합니다:"
log_warn "   ./setup-ssl.sh 실행하여 Let's Encrypt SSL 인증서를 설정하세요."

# PM2 모니터링 시작 (선택사항)
read -p "PM2 모니터링을 시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 monit
fi
