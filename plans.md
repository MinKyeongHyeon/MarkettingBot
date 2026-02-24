```markdown
🚀 프로젝트 계획: AI 마케팅 문구 생성기 (AI Copy Generator)

1. 개요
   입력받은 URL의 본문을 스크래핑한 뒤, 맥 스튜디오 로컬에서 실행 중인 **Ollama(LLM)**를 활용해 인스타그램, 블로그, X(트위터)용 마케팅 문구를 자동으로 생성하는 웹 서비스입니다.

2. 기술 스택
   Architecture: Monorepo (Turborepo 기반)

Frontend: Next.js (App Router), Tailwind CSS, Lucide React (아이콘)

Backend: Node.js (Express), TypeScript

Scraping: Cheerio, Axios

AI Engine: Ollama (EEVE-Korean 또는 Llama 3)

Process Manager: PM2 (맥 스튜디오 24시간 구동용)

3. 상세 구현 단계 (Roadmap)
   Phase 1: 모노레포 및 환경 설정
   [ ] Turborepo를 활용한 프로젝트 구조 생성 (apps/web, apps/api, packages/shared-types)

[ ] TypeScript 공통 설정 및 패키지 의존성 관리 (pnpm 또는 npm)

[ ] 환경 변수(.env) 설정 (Ollama 호스트 주소, 포트 등)

Phase 2: 백엔드 API 서비스 (apps/api)
[ ] Scraping 서비스: URL을 받아 HTML 본문에서 핵심 텍스트만 추출하는 로직 구현 (Cheerio 사용)

[ ] Ollama 연동:

로컬 Ollama API(http://localhost:11434/api/generate) 호출 로직 작성

스크래핑된 텍스트를 분석하여 키워드를 뽑고, 3가지 플랫폼 문구를 JSON으로 출력하도록 프롬프트 엔지니어링

[ ] API 엔드포인트: POST /api/generate 구현 (Request: url / Response: { instagram, blog, x_twitter })

Phase 3: 프론트엔드 UI (apps/web)
[ ] 입력 UI: URL 입력창과 '문구 생성' 버튼 구현 (Loading 상태 처리 포함)

[ ] 결과 UI: 생성된 문구를 복사하기 쉬운 카드 형태의 컴포넌트로 구현

[ ] API 연동: 백엔드 서버(Port 4000)와 통신 로직 작성

### Phase 4: 맥 스튜디오 실전 배포 (Self-Hosting)

- [ ] **Nginx 설정**:
  - 외부 80/443 포트 요청을 Next.js(3000) 포트로 전달하는 Reverse Proxy 설정.
  - Certbot을 활용한 SSL(HTTPS) 인증서 적용.
- [ ] **PM2 관리**:
  - `apps/web`과 `apps/api`를 각각 독립적인 프로세스로 상시 구동.
  - 서버 리소스(CPU/RAM) 모니터링 대시보드 확인.
- [ ] **Ollama 백그라운드 구동**:
  - 맥 부팅 시 Ollama 서빙 프로세스가 자동으로 시작되도록 설정.

4. 프롬프트 가이드 (Ollama Prompt)
   AI가 작성할 핵심 프롬프트의 지시사항입니다:

"너는 전문 카피라이터야. 제공된 텍스트를 분석해서 다음 3가지를 생성해."

"1. 인스타그램: 해시태그 포함, 감성적인 말투."

"2. 블로그: 상세한 설명과 정보 위주의 논리적인 말투."

"3. X (트위터): 짧고 강렬하며 공유를 유도하는 말투."

"반드시 순수한 JSON 형식으로만 답변해."
```

## Phase 5: Production Deployment & Monitoring

- 목표: 안정적인 프로덕션 서비스 운영을 위한 배포 파이프라인, 모니터링, 로그 및 롤백 절차 수립.

- 주요 작업
  - 프로덕션 빌드 자동화
    - `apps/web`: `npm run build` 후 `next start`로 실행
    - `apps/server`: `npm run build` 후 `node dist/src/index.js`로 실행
  - 서비스 매니저
    - PM2로 프로세스 관리 및 부팅 시 자동 복구 설정
    - `pm2 save` 및 `pm2 startup` 적용(launchd 명령 실행)
  - 리버스 프록시 및 TLS
    - Nginx로 도메인 바인딩, `/` → Next.js(3000), `/api` → Express(3001)
    - Certbot(또는 acme.sh)으로 SSL 발급 및 자동 갱신 설정
  - 배포 안전장치
    - Blue/Green 또는 간단한 롤백 절차 문서화
    - 배포 전(빌드 후) smoke test 및 헬스체크 자동화
  - 로그·모니터링·알림
    - PM2, Nginx, Ollama 로그 경로 표준화
    - 간단한 모니터링: `pm2 monit`, `top`, `netdata`(선택)
    - 오류 알림: 이메일 또는 Slack 연동(간단 Webhook)
  - 보안·백업
    - `PUBLIC_API_KEY` 관리 정책(변경/회수 방법 문서화)
    - 정기 백업(설정 파일, 모델 체크포인트(해당 시)) 절차

- 배포 파이프라인(권장 단순 흐름)
  1. GitHub에 푸시 → 수동/스크립트로 서버에 pull
  2. 서버에서 `git pull` → `npm ci` → `npm run build`(웹/서버)
  3. PM2로 새 버전 시작(또는 기존 프로세스 재시작)
  4. 헬스체크(예: `/health`, 주요 API 엔드포인트) 성공 시 트래픽 전환 유지
  5. 문제 발견 시 이전 커밋으로 롤백 및 재배포

- 체크리스트(배포 전)
  - [ ] `PUBLIC_API_KEY` 발급 및 서버 환경에 설정
  - [ ] `NEXT_PUBLIC_API_BASE`를 프로덕션 도메인으로 설정
  - [ ] Ollama가 프로덕션에서 안정적으로 실행되는지 확인
  - [ ] Certbot으로 SSL 발급 및 Nginx에 경로 반영
  - [ ] `pm2 startup` 명령을 사용하여 부팅시 복구 설정

위 단계로 Phase 5를 진행하면 로컬 Mac Studio에서 실제 프로덕션 트래픽을 안정적으로 서빙할 수 있습니다.

## Phase 6: Production Hardening & Operations (Next Steps)

목표: 현재 배포 상태에서 남은 운영·신뢰성 문제를 해결하고, 자동화·모니터링·복구 절차를 갖춥니다.

우선순위 작업 (내일/Phase 6)
- DNS 및 인증서 안정화
  - [ ] `www` 하위도메인 DNS 레코드 추가 확인 및 전파 검증
  - [ ] Port-forward(공유기) 설정 확인: 외부 80/443 → Mac 내부 IP
  - [ ] Certbot으로 SSL 발급 재시도 (웹루트 또는 nginx 플러그인)
- 서비스 자동복구 및 시작시 등록
  - [ ] `pm2 startup` 출력 명령 실행해서 launchd 등록
  - [ ] `pm2 save`로 현재 프로세스 스냅샷 저장
- SSL 갱신·보안 자동화
  - [ ] Certbot 자동 갱신 스케줄(예: `brew services` 또는 cron) 확인 및 테스트
  - [ ] nginx SSL 블록(443) 템플릿 생성 및 repo에 추가
- 모니터링·로깅
  - [ ] 간단한 모니터링(포트/프로세스/메모리) 구성 및 알림 채널 정하기
  - [ ] 로그 보존 정책 및 로그 경로 문서화
- 검증 및 롤백 준비
  - [ ] Smoke tests 작성(헬스, 주요 API, 웹 루트) 및 자동화 스크립트 준비
  - [ ] 배포 롤백 절차 문서화
- 백업·복구 계획
  - [ ] 구성 파일 및 중요 키(환경 변수) 백업 절차 수립

완료 기준
- 도메인에 HTTPS로 접속 가능하고, `/` 및 `/api/health`가 외부에서 정상 응답
- `pm2`로 프로세스가 재부팅 후 자동으로 시작되고, 인증서가 자동 갱신되도록 설정
- 기본적인 모니터링과 로그 알림이 동작

---

### 오늘 작업 요약 (자동 기록)
- Turborepo 기반 프로젝트 구조 및 Next/Express 앱 구성 확인
- `apps/server` 빌드 진입점 경로 문제 수정 및 PM2에서 백엔드 정상 가동
- `apps/web` 프로덕션 빌드 및 PM2에서 정상 서빙 확인
- nginx 설치, 리버스 프록시 구성 및 서비스 시작으로 로컬(127.0.0.1)에서 HTTP 200 확인
- 도메인(`mac-studio-server.tplinkdns.com`) DNS 확인 및 A 레코드(218.156.151.28) 확인
- Certbot으로 인증서 발급 시도했으나 외부에서 포트 80 접근이 타임아웃하여 실패(포워딩/방화벽 점검 필요)

---

다음 단계로는 Phase 6의 우선순위 항목(특히 DNS `www` 레코드·포트포워딩·Certbot 재시도)을 마무리하면 됩니다.

