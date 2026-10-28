-- Número que vai no ícone do app junto de cada push: quantas notificações
-- não lidas a pessoa dona do aparelho tem (já contando a que está sendo enviada).
-- Só a Edge Function (service_role) chama.
create or replace function public.badge_por_token(p_tokens text[])
returns table (token text, qtd integer)
language sql stable security definer set search_path = public as $$
  select d.token,
         (select count(*)::integer
            from public.notificacoes n
           where n.criado_em > p.notificacoes_lidas_em
             and (n.destinatario_id = p.id or (n.destinatario_id is null and n.evento is null)))
    from public.dispositivos_push d
    join public.perfis p on p.id = d.usuario_id
   where d.token = any (p_tokens);
$$;
revoke execute on function public.badge_por_token(text[]) from public, anon, authenticated;
grant execute on function public.badge_por_token(text[]) to service_role;
