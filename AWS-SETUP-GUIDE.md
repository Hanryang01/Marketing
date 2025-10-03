# AWS EC2 배포 설정 가이드

## 🔧 AWS EC2 인스턴스 설정

### 1. EC2 인스턴스 생성
- **AMI**: Ubuntu 20.04 LTS 또는 22.04 LTS
- **인스턴스 타입**: t3.medium 이상 (2GB RAM 이상 권장)
- **스토리지**: 20GB 이상
- **보안 그룹**: 아래 포트 설정 참조

### 2. 보안 그룹 설정
다음 포트들을 열어야 합니다:

| 포트 | 프로토콜 | 소스 | 설명 |
|------|----------|------|------|
| 22 | TCP | 0.0.0.0/0 | SSH 접속 |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 3001 | TCP | 127.0.0.1 | Node.js 앱 (내부용) |

### 3. MySQL 데이터베이스 설정

EC2에 MySQL을 직접 설치하여 사용합니다:

```bash
# MySQL 설치 (배포 스크립트에서 자동 설치됨)
sudo apt update
sudo apt install mysql-server

# 보안 설정 (배포 스크립트에서 자동 실행됨)
sudo mysql_secure_installation

# 데이터베이스 생성 (배포 스크립트에서 자동 생성됨)
sudo mysql -u root -p
CREATE DATABASE sihm_user_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 🚀 배포 단계

### 1. EC2 인스턴스 접속
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. 필수 소프트웨어 설치
```bash
# Node.js 18.x 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git 설치
sudo apt install git

# PM2 전역 설치
sudo npm install -g pm2
```

### 3. 프로젝트 클론 및 설정
```bash
# 프로젝트 클론
git clone https://github.com/Hanryang2/Marketing.git
cd Marketing

# 환경 변수 설정
cp .env.production .env
# .env 파일을 AWS 환경에 맞게 수정
```

### 4. 환경 변수 수정
`.env.production` 파일을 다음과 같이 수정:

```env
# EC2 내부 MySQL 사용
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=sihm_user_management
```

**중요**: `your_mysql_password_here`를 실제 MySQL root 비밀번호로 변경하세요.

### 5. 데이터베이스 설정
배포 스크립트가 자동으로 처리하지만, 수동으로 설정하려면:

```bash
# 스키마 적용 (배포 스크립트에서 자동 실행됨)
mysql -u root -p sihm_user_management < mysql-schema.sql
```

### 6. 배포 실행
```bash
# 실행 권한 부여
chmod +x deploy-aws.sh

# 배포 실행 (MySQL 설치부터 모든 설정까지 자동 처리)
./deploy-aws.sh
```

**배포 스크립트가 자동으로 처리하는 작업들:**
- MySQL 설치 및 보안 설정
- 데이터베이스 생성 및 스키마 적용
- Node.js 애플리케이션 빌드 및 배포
- PM2 설정 및 자동 시작
- Nginx 설정 및 웹 서버 구성
- 방화벽 설정

### 7. SSL 인증서 설정
```bash
# Let's Encrypt 설치
sudo apt install certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d marketing.sihm.co.kr

# 자동 갱신 설정
sudo crontab -e
# 다음 라인 추가: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 문제 해결

### 1. 포트 충돌
```bash
# 포트 사용 확인
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :80
```

### 2. PM2 로그 확인
```bash
pm2 logs sihm-admin
pm2 monit
```

### 3. Nginx 로그 확인
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 4. 데이터베이스 연결 확인
```bash
# 로컬 MySQL 연결 테스트
mysql -u root -p

# 데이터베이스 및 테이블 확인
mysql -u root -p -e "USE sihm_user_management; SHOW TABLES;"
```

## 📊 모니터링

### 1. 시스템 리소스 모니터링
```bash
# CPU, 메모리 사용량
htop

# 디스크 사용량
df -h

# 네트워크 상태
netstat -tlnp
```

### 2. 애플리케이션 모니터링
```bash
# PM2 상태
pm2 status

# PM2 모니터링
pm2 monit

# 로그 실시간 확인
pm2 logs sihm-admin --lines 100
```

## 🔒 보안 체크리스트

- [ ] SSH 키 기반 인증 설정
- [ ] 방화벽 설정 (UFW)
- [ ] MySQL root 비밀번호 강화
- [ ] MySQL 보안 설정 완료
- [ ] SSL 인증서 설정
- [ ] 정기적인 보안 업데이트
- [ ] 로그 모니터링 설정
- [ ] MySQL 외부 접근 차단 (localhost만 허용)

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. EC2 보안 그룹 설정
2. MySQL 서비스 상태 (`sudo systemctl status mysql`)
3. 데이터베이스 연결 상태
4. PM2 및 Nginx 로그
5. 방화벽 설정
6. 환경 변수 설정 (`.env.production` 파일)
