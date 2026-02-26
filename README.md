# MarkettingBot

간단: URL 메타 정보를 크롤링해 로컬 Ollama로 마케팅 문구를 생성하는 Turborepo(Next.js + Express) 프로젝트입니다.

주요 폴더
- `apps/web` — Next.js (app router, TypeScript)
- `apps/server` — Express API (TypeScript)

요구사항
- Node.js 18 이상
- pnpm 권장 (루트에 `pnpm-workspace.yaml` 포함)

빠른 시작 (로컬)
1. 루트에서 의존성 설치

```bash
pnpm install
```

2. 개발 서버 (터보레포 사용 시)

```bash
pnpm run dev
```

개별 앱 실행

- 웹(Next.js)

```bash
cd apps/web
pnpm install --ignore-workspace
pnpm run dev
```

- 서버(Express)

```bash
cd apps/server
pnpm install --ignore-workspace
PUBLIC_API_KEY=your_key CORS_ORIGIN=http://localhost:3000 pnpm run dev
```

환경 변수 — 핵심 목록 (자세한 예시는 `env.example`)

- `PUBLIC_API_KEY` — 서버가 검증하는 공개 API 키 (서버에만 설정)
- `NEXT_PUBLIC_PUBLIC_API_KEY` — 클라이언트에 노출되는 동일한 공개 키 (웹에 설정)
- `NEXT_PUBLIC_API_BASE` — 클라이언트에서 호출할 백엔드 URL (예: `http://localhost:3001`)
- `OLLAMA_BASE` — Ollama API 주소 (로컬: `http://localhost:11434` 또는 터널 URL)
- `OLLAMA_MODEL` — 사용할 모델 이름 (예: `exaone3.5`)
- `CORS_ORIGIN` — 서버에서 허용할 출처(콤마 구분)
- `VERCEL_API_KEY`, `OLLAMA_TUNNEL_URL`, `OLLAMA_INTERNAL_TOKEN` — Vercel + 터널 구성 시 사용

빌드 및 프로덕션

- 빌드

```bash
pnpm build
```

- 서버만 빌드/시작

```bash
cd apps/server
pnpm install --ignore-workspace
pnpm run build
pnpm start
```

- 웹(Next.js) 빌드/시작

```bash
cd apps/web
pnpm install --ignore-workspace
pnpm run build
pnpm start
```

배포 요약
- 로컬 Ollama를 사용하려면 Ollama(포트 11434)를 실행해야 합니다. 클라우드에 앱을 배포하고 로컬 Ollama를 사용하려면 `OLLAMA_BASE`에 터널 URL(ngrok, cloudflared 등)을 설정하세요. 더 자세한 흐름은 `DEPLOY.md` 참조.

문제 해결 팁
- Node 버전이 18 이상인지 확인하세요: `node -v`
- CORS 문제: `CORS_ORIGIN`을 정확히 설정하세요.
- API 키가 인증 실패할 경우 `PUBLIC_API_KEY`(서버)와 `NEXT_PUBLIC_PUBLIC_API_KEY`(클라이언트)가 일치하는지 확인하세요.

더 필요하시면 `DEPLOY.md`를 통합해 Vercel 설정 템플릿과 예시 스크립트를 추가해 드리겠습니다.
