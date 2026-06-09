-- ════════════════════════════════════════════════════════════════════
-- Seed — 로컬 dev 용 mock 데이터 (supabase start / db reset 시 적용)
-- ════════════════════════════════════════════════════════════════════

-- 녹음 오디오 저장 버킷 (비공개 — signed URL 로만 접근)
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- ── Mock M1 도서 (ebook) ─────────────────────────────────────────────
insert into public.content (id, type, title, cefr_level, lexile, body) values
('00000000-0000-0000-0000-000000000101', 'ebook', 'George Goes to the Zoo', 'Pre-A1', 200,
 '{"pages":[
    {"text":"George is a little monkey. He lives in a big city."},
    {"text":"Today George goes to the zoo. He is very happy."},
    {"text":"He sees a big elephant and a tall giraffe."},
    {"text":"George waves at the animals. What a fun day!"}
 ]}'::jsonb),
('00000000-0000-0000-0000-000000000102', 'ebook', 'My Red Apple', 'Pre-A1', 150,
 '{"pages":[
    {"text":"I have a red apple. It is round and sweet."},
    {"text":"I share my apple with my friend."},
    {"text":"We eat together and smile."}
 ]}'::jsonb),
('00000000-0000-0000-0000-000000000103', 'ebook', 'The Magic School Bus', 'A1', 320,
 '{"pages":[
    {"text":"The bus can fly. The bus can swim."},
    {"text":"Today we learn about the ocean."},
    {"text":"We see fish, crabs, and a big whale."},
    {"text":"What a magic trip!"}
 ]}'::jsonb)
on conflict (id) do nothing;

-- ── Mock M2 연따 클립 (shadow_clip) ──────────────────────────────────
insert into public.content (id, type, title, cefr_level, lexile, body) values
('00000000-0000-0000-0000-000000000201', 'shadow_clip', 'At the Park', 'Pre-A1', null,
 '{"segments":[
    {"start":0,"end":3,"text":"Let''s play at the park."},
    {"start":3,"end":6,"text":"I like the swing."},
    {"start":6,"end":9,"text":"Push me higher, please!"}
 ]}'::jsonb),
('00000000-0000-0000-0000-000000000202', 'shadow_clip', 'Ordering Food', 'A1', null,
 '{"segments":[
    {"start":0,"end":3,"text":"I''d like a hamburger, please."},
    {"start":3,"end":6,"text":"And a glass of water."},
    {"start":6,"end":9,"text":"Thank you very much."}
 ]}'::jsonb)
on conflict (id) do nothing;
