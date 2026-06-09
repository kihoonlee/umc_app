-- 엄마 응원하기(Cheer) — 엄마 App → 아이 홈으로 전달되는 응원 (MVP §2.2 / Could 항목).
-- 아이는 보호자 세션으로 사용하므로 can_access_child 로 읽기·seen 갱신 가능.

create table public.cheer (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  parent_id   uuid not null references public.users(id),
  emoji       text not null default '❤️',
  message     text,
  seen        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index cheer_child_unseen_idx on public.cheer(child_id, seen);

alter table public.cheer enable row level security;

create policy cheer_select on public.cheer
  for select using (can_access_child(child_id));
create policy cheer_insert on public.cheer
  for insert with check (parent_id = auth.uid() and can_access_child(child_id));
create policy cheer_update_seen on public.cheer
  for update using (can_access_child(child_id));

-- 코치가 담당 회원에게 메시지 작성/발송 (코치 콘솔)
create policy coach_message_insert on public.coach_message
  for insert to authenticated
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.coach_id = auth.uid()
    )
  );
