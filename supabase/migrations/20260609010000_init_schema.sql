-- ════════════════════════════════════════════════════════════════════
-- UMC 엄마표 영어 — 초기 스키마 (MVP)
-- 두 기획서 reconcile: MVP기획초안 §5.4 를 canonical 범위로,
-- 상세개발기획서 §10 명명/관계를 반영. PK uuid, timestamptz.
-- ════════════════════════════════════════════════════════════════════

-- ── 계정 · 사용자 (Supabase Auth 연동) ────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  role        text not null default 'parent' check (role in ('parent','coach','admin')),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.users(id) on delete cascade,
  coach_id    uuid references public.users(id),
  name        text not null,
  birth_date  date not null,
  cefr_level  text,                          -- 진단 결과 (Pre-A1 ~ B1)
  lexile      int,                           -- 진단 결과
  mico_state  jsonb not null default '{}',   -- 미코 표정·꾸미기 상태
  created_at  timestamptz not null default now()
);
create index children_parent_id_idx on public.children(parent_id);
create index children_coach_id_idx  on public.children(coach_id);

-- ── 콘텐츠 ───────────────────────────────────────────────────────────
create table public.content (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('ebook','shadow_clip')),  -- movie_book 2차
  title       text not null,
  cefr_level  text,
  lexile      int,
  body        jsonb,                         -- 본문/스크립트/구간 타임스탬프
  created_at  timestamptz not null default now()
);

-- ── 학습 ─────────────────────────────────────────────────────────────
create table public.daily_plan (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children(id) on delete cascade,
  plan_date       date not null,
  book_id         uuid references public.content(id),
  shadow_clip_id  uuid references public.content(id),
  word_card_ids   jsonb not null default '[]',
  status          text not null default 'pending'
                    check (status in ('pending','in_progress','done')),
  created_at      timestamptz not null default now(),
  unique (child_id, plan_date)
);

create table public.learning_session (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  plan_id     uuid references public.daily_plan(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index learning_session_child_idx on public.learning_session(child_id);

create table public.activity (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references public.learning_session(id) on delete cascade,
  child_id             uuid not null references public.children(id),
  content_id           uuid references public.content(id),
  type                 text not null check (type in ('m1_read','m2_shadow','m2_dialog','word_review')),
  pronunciation_score  numeric(5,2),   -- 0~100 (SpeechAce/Azure GoP)
  wcpm                 int,            -- M1 유창성
  fluency_score        numeric(5,2),   -- M2 억양/유창성
  detail               jsonb,          -- 단어별 음소 피드백 (mock 포함)
  created_at           timestamptz not null default now()
);
create index activity_child_idx   on public.activity(child_id);
create index activity_session_idx on public.activity(session_id);

-- ── 단어 (SRS lite) ──────────────────────────────────────────────────
create table public.word_card (
  id                 uuid primary key default gen_random_uuid(),
  child_id           uuid not null references public.children(id) on delete cascade,
  word               text not null,
  source_content_id  uuid references public.content(id),
  due_date           date not null,
  interval_days      int not null default 1,
  ease               numeric(4,2) not null default 2.5,   -- SM-2 계열
  status             text not null default 'learning'
                       check (status in ('learning','review','graduated')),
  created_at         timestamptz not null default now()
);
create index word_card_due_idx on public.word_card(child_id, due_date);

-- ── 보상 · 진척 ──────────────────────────────────────────────────────
create table public.progress (
  child_id     uuid primary key references public.children(id) on delete cascade,
  total_stars  int not null default 0,
  streak_days  int not null default 0,    -- 성과 지표① (지속)
  last_active  date,
  stickers     jsonb not null default '[]'
);

-- ── 코치 · 리포트 ────────────────────────────────────────────────────
create table public.coach_message (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.users(id),
  child_id      uuid not null references public.children(id) on delete cascade,
  ai_draft      text,
  body          text not null,
  status        text not null default 'sent' check (status in ('draft','sent')),
  parent_cheer  boolean not null default false,   -- 엄마 응원(Cheer) 응답
  sent_at       timestamptz
);
create index coach_message_child_idx on public.coach_message(child_id);

create table public.weekly_report (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children(id) on delete cascade,
  week_start      date not null,
  metrics         jsonb not null default '{}',  -- 학습량·점수 추이
  ai_summary      text,
  coach_reviewed  boolean not null default false,
  sent_at         timestamptz,
  opened_at       timestamptz,                  -- 성과 지표③ 리포트 확인율
  unique (child_id, week_start)
);

-- ── 구독 ─────────────────────────────────────────────────────────────
create table public.subscription (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  plan                text not null default 'standard',
  status              text not null check (status in ('trialing','active','canceled','past_due')),
  trial_end           timestamptz,          -- 성과 지표② 체험→전환
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);
create index subscription_user_idx on public.subscription(user_id);

-- ════════════════════════════════════════════════════════════════════
-- Auth 연동 — 신규 가입 시 public.users(parent) 자동 생성
-- ════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, name)
  values (
    new.id,
    coalesce(new.email, ''),
    'parent',
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,'user'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════
-- RLS — 보호자 소유 + 코치 읽기. (service_role 은 RLS 우회 = api/admin)
-- ════════════════════════════════════════════════════════════════════

-- 헬퍼: 현재 사용자가 해당 child 에 접근 가능한가 (부모 또는 담당 코치)
create or replace function public.can_access_child(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.children c
    where c.id = p_child
      and (c.parent_id = auth.uid() or c.coach_id = auth.uid())
  );
$$;

alter table public.users           enable row level security;
alter table public.children        enable row level security;
alter table public.content         enable row level security;
alter table public.daily_plan      enable row level security;
alter table public.learning_session enable row level security;
alter table public.activity        enable row level security;
alter table public.word_card       enable row level security;
alter table public.progress        enable row level security;
alter table public.coach_message   enable row level security;
alter table public.weekly_report   enable row level security;
alter table public.subscription    enable row level security;

-- users: 본인 행 조회/수정
create policy users_self_select on public.users
  for select using (id = auth.uid());
create policy users_self_update on public.users
  for update using (id = auth.uid());

-- content: 인증 사용자 모두 읽기 (콘텐츠 카탈로그)
create policy content_read on public.content
  for select using (auth.role() = 'authenticated');

-- children: 부모 CRUD, 코치 읽기
create policy children_parent_all on public.children
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy children_coach_read on public.children
  for select using (coach_id = auth.uid());

-- child-scoped: 접근 가능한 child 의 데이터
create policy daily_plan_access on public.daily_plan
  for select using (can_access_child(child_id));
create policy learning_session_access on public.learning_session
  for select using (can_access_child(child_id));
create policy activity_access on public.activity
  for select using (can_access_child(child_id));
create policy word_card_access on public.word_card
  for select using (can_access_child(child_id));
create policy progress_access on public.progress
  for select using (can_access_child(child_id));
create policy weekly_report_access on public.weekly_report
  for select using (can_access_child(child_id));

-- coach_message: 접근 가능한 child + 코치 본인 작성분
create policy coach_message_access on public.coach_message
  for select using (can_access_child(child_id) or coach_id = auth.uid());

-- subscription: 본인 것
create policy subscription_self on public.subscription
  for select using (user_id = auth.uid());
