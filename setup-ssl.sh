#!/bin/bash

# SSL 인증서 설정 스크립트 (Let's Encrypt)
# 사용법: ./setup-ssl.sh

set -e

echo "🔒 SSL 인증서 설정 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 도메인 설정
DOMAIN="manage.sihm.co.kr"
EMAIL="admin@sihm.co.kr"  # Let's Encrypt 알림용 이메일

# 1. Certbot 설치 확인
log_info "Certbot 설치 확인 중..."
if ! command -v certbot &> /dev/null; then
    log_info "Certbot 설치 중..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    log_info "Certbot이 이미 설치되어 있습니다."
fi

# 2. Nginx가 실행 중인지 확인
log_info "Nginx 상태 확인 중..."
if ! sudo systemctl is-active --quiet nginx; then
    log_error "Nginx가 실행 중이지 않습니다. 먼저 Nginx를 시작해주세요."
    exit 1
fi

# 3. 도메인이 서버를 가리키는지 확인
log_info "도메인 DNS 확인 중..."
if ! nslookup $DOMAIN | grep -q "Address:"; then
    log_warn "도메인 $DOMAIN이 이 서버를 가리키지 않을 수 있습니다."
    log_warn "DNS 설정을 확인해주세요."
    read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 4. HTTP용 임시 Nginx 설정
log_info "임시 HTTP 설정 생성 중..."
sudo tee /etc/nginx/sites-available/$DOMAIN-temp > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        return 200 'SSL 설정을 위한 임시 페이지';
        add_header Content-Type text/plain;
    }
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}
EOF

# 5. 임시 설정 활성화
log_info "임시 설정 활성화 중..."
sudo ln -sf /etc/nginx/sites-available/$DOMAIN-temp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. SSL 인증서 발급
log_info "SSL 인증서 발급 중..."
sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# 7. 실제 Nginx 설정 적용
log_info "실제 Nginx 설정 적용 중..."
sudo cp nginx.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/$DOMAIN-temp

# 8. Nginx 설정 테스트 및 재시작
log_info "Nginx 설정 테스트 중..."
sudo nginx -t
sudo systemctl reload nginx

# 9. SSL 인증서 자동 갱신 설정
log_info "SSL 인증서 자동 갱신 설정 중..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 10. SSL 테스트
log_info "SSL 설정 테스트 중..."
sleep 5
if curl -f https://$DOMAIN > /dev/null 2>&1; then
    log_info "✅ SSL이 정상적으로 설정되었습니다!"
    log_info "웹사이트: https://$DOMAIN"
else
    log_error "❌ SSL 설정에 문제가 있을 수 있습니다."
    log_error "수동으로 확인해주세요: https://$DOMAIN"
fi

log_info "🎉 SSL 설정이 완료되었습니다!"
log_info "인증서 위치: /etc/letsencrypt/live/$DOMAIN/"
log_info "자동 갱신: 매일 12시에 확인"
