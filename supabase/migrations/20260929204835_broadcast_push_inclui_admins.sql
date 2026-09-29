-- O broadcast manual (Admin > Enviar notificação, destinatario_id null) só
-- mandava pra clientes aprovados, deixando os próprios admins de fora mesmo
-- com o dispositivo registrado. Passa a incluir também quem é admin.
create or replace function public.tokens_clientes_aprovados()
returns table (token text)
language sql stable security definer set search_path = public as $$
  select d.token from public.dispositivos_push d
    join public.perfis p on p.id = d.usuario_id
   where d.ativo
     and ((p.tipo = 'cliente' and p.cadastro_aprovado) or p.tipo = 'admin');
$$;
