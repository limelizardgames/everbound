-- Character portrait uploads (Supabase Storage). Skipped where storage is absent.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('portraits', 'portraits', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;

    execute $p$create policy "portraits are public" on storage.objects for select using (bucket_id = 'portraits')$p$;
    -- Files are stored under <user id>/..., and only that user may write there.
    execute $p$create policy "players upload own portraits" on storage.objects for insert to authenticated
      with check (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "players replace own portraits" on storage.objects for update to authenticated
      using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "players delete own portraits" on storage.objects for delete to authenticated
      using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
