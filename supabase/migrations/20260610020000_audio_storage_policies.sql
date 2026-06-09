-- audio 버킷(비공개) storage 정책 — 인증 사용자가 자기 uid 폴더에만 업로드/읽기.
-- 경로 규약: audio/{auth.uid()}/{childId}/{timestamp}.m4a

create policy "audio_upload_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_read_own_folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_update_own_folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
