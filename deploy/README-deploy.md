# Phase 4 — Self-hosting on macOS (Mac Studio)

아래는 macOS에서 `apps/web`(Next.js)와 `apps/server`(Express)를 Nginx+PM2로 배포하고 Ollama를 자동시작하도록 설정하는 단계별 안내입니다.

1. 전제 조건

- Homebrew 설치
- Node.js 18+ 설치
- Git에 코드가 로컬에 존재

2. Nginx 설치 및 설정

```bash
# Homebrew로 nginx 설치
brew install nginx

# 배포용 설정 파일 복사 (파일 위치 예시)
sudo cp deploy/nginx/marketting.conf /usr/local/etc/nginx/servers/marketting.conf

# 설정 테스트
nginx -t

# nginx 재시작
brew services restart nginx
```

3. SSL 인증서 발급 (Certbot 또는 acme.sh)

Certbot 설치 (예)

```bash
brew install certbot
sudo certbot certonly --nginx -d example.com -d www.example.com
```

발급 후 `deploy/nginx/marketting.conf`의 `ssl_certificate` 경로를 확인하세요.

4. PM2로 앱 관리

```bash
# PM2 전역 설치
npm install -g pm2

# 프로젝트 루트로 이동 후 ecosystem 시작
cd /path/to/MarkettingBot
pm2 start deploy/pm2/ecosystem.config.js

# 부팅 시 pm2가 프로세스를 복원하도록 설정
pm2 startup
pm2 save
```

웹(Next.js)은 production 빌드가 필요합니다:

```bash
cd apps/web
npm install
npm run build

cd ../server
npm install
npm run build
```

PM2의 `ecosystem.config.js`는 `apps/web`에서 `npm start`(Next의 production start)와 `apps/server`에서 `npm start`를 실행하도록 설정되어 있습니다.

5. Ollama 자동시작

배포 폴더 `deploy/launchd/ollama.plist`를 적절히 수정(ollama 경로 확인)한 뒤 로드:

```bash
# 시스템 전역 launchd에 복사
sudo cp deploy/launchd/ollama.plist /Library/LaunchDaemons/com.markettingbot.ollama.plist
sudo chown root:wheel /Library/LaunchDaemons/com.markettingbot.ollama.plist
sudo launchctl load /Library/LaunchDaemons/com.markettingbot.ollama.plist

# 상태 확인
sudo launchctl list | grep markettingbot
```

6. 도메인 및 환경 변수

- `PUBLIC_API_KEY` (서버) : 외부에서 오는 요청 검증용
- `NEXT_PUBLIC_API_BASE` (웹) : https://your-domain
- `NEXT_PUBLIC_PUBLIC_API_KEY` (웹) : 클라이언트에 제공되는 공개키
- `CORS_ORIGIN` (서버) : 필요 시 도메인 제한

7. 점검

- 브라우저에서 https://example.com 접속 후 페이지가 열리는지 확인
- `pm2 status`로 프로세스 상태 확인
- Nginx 로그(`/usr/local/var/log/nginx/`) 및 Ollama 로그(`/tmp/ollama-*.log`) 확인

문제가 발생하면 로그와 함께 알려주세요. 원하시면 제가 다음을 바로 생성해 드립니다:

- (A) `docker-compose.yml` + `Dockerfile` (서버 + 웹 + nginx)
- (B) Vercel + Render 배포 가이드 양식 (환경 변수 템플릿 포함)
