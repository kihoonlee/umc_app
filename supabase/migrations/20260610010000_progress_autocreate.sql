-- 자녀 프로필 생성 시 progress(별·Streak) 행 자동 생성.
-- 클라이언트가 별도 insert 없이 홈에서 바로 progress 를 읽을 수 있게 한다.

create or replace function public.handle_new_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.progress (child_id)
  values (new.id)
  on conflict (child_id) do nothing;
  return new;
end;
$$;

create trigger on_child_created
  after insert on public.children
  for each row execute function public.handle_new_child();
