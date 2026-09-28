create or replace function public.push_segredo_confere(p_segredo text)
returns boolean language sql stable security definer set search_path = public, privado as $$
  select p_segredo is not null and p_segredo = privado.cfg('push_segredo');
$$;
revoke execute on function public.push_segredo_confere(text) from public, anon, authenticated;
grant execute on function public.push_segredo_confere(text) to service_role;

insert into privado.config (chave, valor) values
  ('edge_functions_url', 'https://zjkhlvomxhtafajbzbjb.supabase.co/functions/v1'),
  ('push_segredo', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (chave) do nothing;
