-- 개발자(admin) 전권 — role='admin' 사용자는 RLS 전 구간 통과.
-- 개발/QA 용도. 실사용자 오픈 전 dev 계정 비활성화 필수 (README/기록 참조).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- child 접근 게이트(대부분의 child-scoped SELECT 정책이 이 함수 사용)에 admin 통과 추가
create or replace function public.can_access_child(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.children c
    where c.id = p_child
      and (c.parent_id = auth.uid() or c.coach_id = auth.uid())
  );
$$;

-- children: admin 전체 CRUD
create policy children_admin_all on public.children
  for all using (is_admin()) with check (is_admin());

-- users: admin 전체 조회
create policy users_admin_select on public.users
  for select using (is_admin());

-- content: admin 등록/수정 (콘텐츠 관리)
create policy content_admin_all on public.content
  for all using (is_admin()) with check (is_admin());

-- subscription: admin 전체 조회
create policy subscription_admin_select on public.subscription
  for select using (is_admin());

-- coach_message: admin 도 발송 가능 (담당 코치가 아니어도)
drop policy if exists coach_message_insert on public.coach_message;
create policy coach_message_insert on public.coach_message
  for insert to authenticated
  with check (
    coach_id = auth.uid()
    and (
      is_admin()
      or exists (
        select 1 from public.children c
        where c.id = child_id and c.coach_id = auth.uid()
      )
    )
  );
