# UMC 엄마표 영어 (umc-app)

> "엄마가 선생님이 되지 않아도, AI가 함께 만드는 우리 집 영어 환경"
> 만 5~13세 아이용 학습 모듈(아이 App)과 학부모용 코칭 도구(엄마 App)를 통합한 풀스택 영어 학습 서비스.

## MVP 범위

- **아이 App**: M1 Reading Quest(다독·소리내어읽기) + M2 Shadow & Speak(연따·미코 대화) + Word Bank lite
- **엄마 App**: 학습 대시보드 + 주간 리포트 + 코치 메시지 + 응원하기(Cheer)
- **코치 콘솔**: 담당 회원 관리 + 코칭 메시지 + 리포트 검수
- **공통**: 발음·유창성 평가(Mock-first), 진단·레벨 매칭, Standard 구독 결제

## 아키텍처 (개인 프로젝트 — Supabase + Cloudflare)

| 레이어 | 스택 |
|---|---|
| 아이/엄마 클라이언트 | Expo (RN + RN Web) — iOS/Android/Web(PWA) |
| 코치 콘솔 | Next.js (App Router) |
| 커스텀 서버 로직 | Cloudflare Workers + Hono (`apps/api`) — daily-plan, read-aloud(mock), LLM 프록시 |
| DB / Auth / Storage / Realtime | **Supabase** (Postgres + Auth(Google) + Storage + Realtime) |
| 배포 | Cloudflare Pages(프런트) + Workers(API) |
| LLM | Anthropic Claude (미코 대화 · 코치 초안) |
| 발음·유창성 | Mock-first → 추후 SpeechAce/Azure |

기본 CRUD·인증·스토리지·실시간은 Supabase + RLS로 클라이언트 직결, 서버 비밀로직만 `apps/api`(Hono).

## 모노레포 구조

```
apps/
  mobile/         Expo (아이 App + 엄마 App)
  coach-console/  Next.js (코치 콘솔)
  api/            Hono on Cloudflare Workers
packages/
  db/             Supabase 클라이언트 + 생성 타입
  types/          공유 TS 타입 (클라이언트 ↔ API 계약)
  ui/             공통 디자인 토큰 + 컴포넌트
  config/         공유 tsconfig
supabase/         로컬 스택 config + 마이그레이션 + seed
```

## 시작하기

```bash
# 0. pnpm (없으면): curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm install

# 1. 로컬 Supabase (Docker 필요)
pnpm supabase:start         # Postgres/Auth/Storage/Realtime 기동 → URL·키 출력
cp .env.example .env.local  # 출력된 anon/service_role 키로 채움

# 2. 개발 서버
pnpm dev                    # 전체 turbo dev
# 또는 개별:  pnpm --filter @umc/api dev  /  --filter @umc/mobile dev  /  --filter @umc/coach-console dev

# 3. 검증
pnpm lint && pnpm typecheck && pnpm build
```

## 빌드 순서 (Walking Skeleton)

Phase 0 스캐폴드 → Phase 1 인증+자녀프로필 → **Phase 2 M1 수직 슬라이스(데모 가능한 첫 루프)** →
Phase 3 M2+미코 LLM → Phase 4 엄마/코치/결제 → Phase 5 지표·베타.

상세 기획: `UMC_엄마표영어_MVP기획초안_20260609.md` · `UMC_엄마표영어_상세개발_기획서.md`
