insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/jpeg','image/png','image/webp']),
       ('perfis',   'perfis',   true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy catalogo_admin_escreve on storage.objects for all to authenticated
  using (bucket_id = 'catalogo' and (select public.eh_admin()))
  with check (bucket_id = 'catalogo' and (select public.eh_admin()));

create policy perfis_proprio_escreve on storage.objects for all to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'perfis' and (storage.foldername(name))[1] = (select auth.uid())::text);
