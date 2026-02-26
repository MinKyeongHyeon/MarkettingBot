# MarkettingBot — 배포 가이드

이 프로젝트는 로컬 또는 클라우드에 앱을 배포하고, 로컬 Ollama(또는 터널을 통한 원격 Ollama)를 사용해 마케팅 문구를 생성합니다. 아래는 간결한 배포 시나리오와 설정 방법입니다.

중요: 환경 변수 템플릿은 루트의 `env.example` 파일을 참고하세요.

1) 로컬에서만 사용 (개발)

- Ollama를 로컬에서 실행하세요 (기본 포트 11434).
- 루트에서 의존성 설치: `pnpm install`.
- 개발 실행: `pnpm run dev` (또는 개별적으로 `apps/server`와 `apps/web`에서 실행).

2) 앱은 클라우드에 배포, Ollama는 로컬(터널)

- 클라우드에 앱(예: Vercel)만 배포하고 로컬 Ollama를 사용하려면, 로컬의 Ollama(11434)를 터널(ngrok, cloudflared 등)로 노출하고, 배포 환경변수 `OLLAMA_BASE`에 터널 URL을 지정하세요.

예: ngrok

```bash
ngrok http 11434
# 터널이 발급한 https://xxxx.ngrok.app 를 OLLAMA_BASE에 설정
```

환경변수 (필수/권장)

- `OLLAMA_BASE` — 터널 URL 또는 `http://localhost:11434` (배포 환경에 맞게 설정)
- `OLLAMA_MODEL` — 예: `exaone3.5`
- `VERCEL_API_KEY` — (옵션) Vercel Edge 라우트에 대한 간단한 클라이언트 인증 키
- `OLLAMA_INTERNAL_TOKEN` — Vercel → 로컬 프록시 인증(선택)

주의사항

- 무료 터널은 URL이 바뀔 수 있으므로 운영에 적합하지 않습니다. 장기 운영 시 Cloudflare Tunnel이나 자체 호스팅을 고려하세요.
- 터널을 공개하면 해당 URL을 아는 사용자가 Ollama에 접근할 수 있으니 토큰/접근 제한을 적용하세요.

3) 셀프 호스팅(앱 + Ollama 같은 서버)

- Ollama와 앱을 동일 호스트에서 운영하면 `OLLAMA_BASE`는 `http://localhost:11434`로 두면 됩니다.
- 빌드 및 실행 예

```bash
# 서버 빌드
cd apps/server
pnpm install --ignore-workspace
pnpm run build
pnpm start

# 웹 빌드
cd ../web
pnpm install --ignore-workspace
pnpm run build
pnpm start
```

권장 보안/운영

- Vercel 등에서 Edge 라우트를 사용할 경우 `VERCEL_API_KEY`와 `OLLAMA_INTERNAL_TOKEN` 조합으로 인증을 구성하세요.
- `CORS_ORIGIN`을 설정해 허용할 도메인을 제한하세요.

문제가 발생하면

- 로컬: `apps/server` 콘솔 로그 확인
- 웹: 브라우저 콘솔 및 네트워크 탭 확인

추가 요청이 있으면 Vercel 템플릿(.vercelignore/환경변수 명세) 또는 `cloudflared` 예시 스크립트를 추가해 드리겠습니다.
