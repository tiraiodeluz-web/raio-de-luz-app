-- Funções de leitura do painel web (só admin). Datas no fuso de São Paulo;
-- pedidos cancelados ficam fora de faturamento/vendas; visualizações de
-- admins não contam.

create or replace function public.painel_resumo(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;

  with ped as (
    select p.*, (p.criado_em at time zone 'America/Sao_Paulo')::date as dia
      from public.pedidos p
     where (p.criado_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
  ), validos as (
    select * from ped where status <> 'cancelado'
  )
  select jsonb_build_object(
    'pedidos', (select count(*) from validos),
    'cancelados', (select count(*) from ped where status = 'cancelado'),
    'faturamento', (select coalesce(sum(total), 0) from validos),
    'ticket_medio', (select coalesce(round(avg(total), 2), 0) from validos),
    'clientes_compraram', (select count(distinct cliente_id) from validos),
    'unidades', (select coalesce(sum(i.quantidade), 0) from public.pedido_itens i join validos v on v.id = i.pedido_id),
    'novos_cadastros', (select count(*) from public.perfis
                         where tipo = 'cliente'
                           and (criado_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim),
    'cadastros_pendentes', (select count(*) from public.perfis where tipo = 'cliente' and not cadastro_aprovado),
    'clientes_aprovados', (select count(*) from public.perfis where tipo = 'cliente' and cadastro_aprovado),
    'visualizacoes', (select coalesce(sum(vz.vezes), 0)
                        from public.produto_visualizacoes vz
                        left join public.perfis pf on pf.id = vz.usuario_id
                       where vz.dia between p_inicio and p_fim
                         and (pf.tipo is null or pf.tipo <> 'admin')),
    'ia_mensagens', (select coalesce(sum(mensagens), 0) from public.assistente_uso where dia between p_inicio and p_fim),
    'ia_tokens_entrada', (select coalesce(sum(tokens_entrada), 0) from public.assistente_uso where dia between p_inicio and p_fim),
    'ia_tokens_saida', (select coalesce(sum(tokens_saida), 0) from public.assistente_uso where dia between p_inicio and p_fim),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'pedidos', coalesce(x.n, 0), 'total', coalesce(x.t, 0)) order by d), '[]'::jsonb)
                  from generate_series(p_inicio, p_fim, interval '1 day') d
                  left join (select dia, count(*) n, sum(total) t from validos group by dia) x on x.dia = d::date),
    'por_status', (select coalesce(jsonb_object_agg(status::text, n), '{}'::jsonb)
                     from (select status, count(*) n from ped group by status) s),
    'top_produtos', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                       select i.produto_id, i.produto_nome as nome, i.sku, sum(i.quantidade) as unidades, sum(i.subtotal) as total
                         from public.pedido_itens i join validos v on v.id = i.pedido_id
                        group by 1, 2, 3 order by 4 desc limit 5) t),
    'ultimos_pedidos', (select coalesce(jsonb_agg(u), '[]'::jsonb) from (
                          select id, numero, status, total, criado_em,
                                 cliente_snapshot->>'razao_social' as razao_social, cliente_snapshot->>'nome' as nome
                            from public.pedidos order by criado_em desc limit 8) u)
  ) into v;
  return v;
end $$;

create or replace function public.relatorio_produtos(p_inicio date, p_fim date)
returns table (
  produto_id uuid, sku text, nome text, imagem text, categoria text, ativo boolean, preco numeric,
  visualizacoes bigint, visitantes bigint, unidades bigint, pedidos bigint, faturamento numeric,
  ultima_venda timestamptz, criado_em timestamptz
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;
  return query
  with vis as (
    select vz.produto_id,
           sum(vz.vezes) as vezes,
           count(distinct vz.usuario_id) filter (where vz.usuario_id <> '00000000-0000-0000-0000-000000000000') as visitantes
      from public.produto_visualizacoes vz
      left join public.perfis pf on pf.id = vz.usuario_id
     where vz.dia between p_inicio and p_fim
       and (pf.tipo is null or pf.tipo <> 'admin')
     group by 1
  ), ven as (
    select i.produto_id, sum(i.quantidade) as un, count(distinct i.pedido_id) as ped, sum(i.subtotal) as fat
      from public.pedido_itens i
      join public.pedidos pe on pe.id = i.pedido_id
     where pe.status <> 'cancelado'
       and (pe.criado_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
     group by 1
  ), ult as (
    select i.produto_id, max(pe.criado_em) as u
      from public.pedido_itens i
      join public.pedidos pe on pe.id = i.pedido_id
     where pe.status <> 'cancelado'
     group by 1
  )
  select p.id, p.sku, p.nome, p.imagem_principal, c.nome, p.ativo, p.preco_efetivo,
         coalesce(vis.vezes, 0)::bigint, coalesce(vis.visitantes, 0)::bigint,
         coalesce(ven.un, 0)::bigint, coalesce(ven.ped, 0)::bigint, coalesce(ven.fat, 0),
         ult.u, p.criado_em
    from public.produtos p
    left join public.categorias c on c.id = p.categoria_id
    left join vis on vis.produto_id = p.id
    left join ven on ven.produto_id = p.id
    left join ult on ult.produto_id = p.id;
end $$;

create or replace function public.relatorio_clientes()
returns table (
  cliente_id uuid, nome text, razao_social text, telefone text, cidade text, uf text, codigo text,
  aprovado boolean, cadastrado_em timestamptz, ultimo_acesso timestamptz,
  pedidos bigint, total_gasto numeric, ticket_medio numeric,
  primeira_compra timestamptz, ultima_compra timestamptz, dias_sem_comprar integer, intervalo_medio_dias numeric
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;
  return query
  select pf.id, pf.nome, pf.razao_social, pf.telefone, pf.cidade, pf.uf, pf.codigo,
         pf.cadastro_aprovado, pf.criado_em, pf.ultimo_acesso,
         count(pe.id), coalesce(sum(pe.total), 0), coalesce(round(avg(pe.total), 2), 0),
         min(pe.criado_em), max(pe.criado_em),
         ((now() at time zone 'America/Sao_Paulo')::date - (max(pe.criado_em) at time zone 'America/Sao_Paulo')::date)::integer,
         case when count(pe.id) > 1
              then round((extract(epoch from max(pe.criado_em) - min(pe.criado_em)) / 86400 / (count(pe.id) - 1))::numeric, 1)
         end
    from public.perfis pf
    left join public.pedidos pe on pe.cliente_id = pf.id and pe.status <> 'cancelado'
   where pf.tipo = 'cliente'
   group by pf.id;
end $$;

-- "Viu e não comprou": cliente abriu o produto N vezes no período e não
-- comprou ele desde o início do período. Lista boa pra ligar/mandar WhatsApp.
create or replace function public.relatorio_interesse(p_inicio date, p_fim date, p_min_vezes integer default 2)
returns table (
  cliente_id uuid, cliente text, telefone text, produto_id uuid, sku text, produto text, imagem text,
  vezes bigint, ultima_vez date
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;
  return query
  select pf.id, coalesce(nullif(pf.razao_social, ''), pf.nome), pf.telefone,
         p.id, p.sku, p.nome, p.imagem_principal,
         sum(vz.vezes)::bigint, max(vz.dia)
    from public.produto_visualizacoes vz
    join public.perfis pf on pf.id = vz.usuario_id and pf.tipo = 'cliente'
    join public.produtos p on p.id = vz.produto_id
   where vz.dia between p_inicio and p_fim
     and not exists (
       select 1 from public.pedido_itens i
         join public.pedidos pe on pe.id = i.pedido_id
        where pe.cliente_id = pf.id and i.produto_id = p.id and pe.status <> 'cancelado'
          and (pe.criado_em at time zone 'America/Sao_Paulo')::date >= p_inicio)
   group by pf.id, p.id
  having sum(vz.vezes) >= p_min_vezes
   order by sum(vz.vezes) desc, max(vz.dia) desc
   limit 300;
end $$;

create or replace function public.relatorio_custo_ia(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'por_usuario', (select coalesce(jsonb_agg(x order by x.tokens_entrada desc), '[]'::jsonb) from (
        select u.usuario_id, coalesce(nullif(pf.razao_social, ''), pf.nome) as nome, pf.tipo,
               sum(u.mensagens) as mensagens, sum(u.tokens_entrada) as tokens_entrada, sum(u.tokens_saida) as tokens_saida,
               count(*) as dias_de_uso, max(u.dia) as ultimo_uso
          from public.assistente_uso u
          left join public.perfis pf on pf.id = u.usuario_id
         where u.dia between p_inicio and p_fim
         group by u.usuario_id, pf.razao_social, pf.nome, pf.tipo) x),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'mensagens', coalesce(y.m, 0),
                                                               'tokens_entrada', coalesce(y.e, 0), 'tokens_saida', coalesce(y.s, 0)) order by d), '[]'::jsonb)
                  from generate_series(p_inicio, p_fim, interval '1 day') d
                  left join (select dia, sum(mensagens) m, sum(tokens_entrada) e, sum(tokens_saida) s
                               from public.assistente_uso where dia between p_inicio and p_fim group by dia) y on y.dia = d::date)
  ) into v;
  return v;
end $$;

revoke execute on function public.painel_resumo(date, date) from public, anon;
revoke execute on function public.relatorio_produtos(date, date) from public, anon;
revoke execute on function public.relatorio_clientes() from public, anon;
revoke execute on function public.relatorio_interesse(date, date, integer) from public, anon;
revoke execute on function public.relatorio_custo_ia(date, date) from public, anon;
grant execute on function public.painel_resumo(date, date) to authenticated;
grant execute on function public.relatorio_produtos(date, date) to authenticated;
grant execute on function public.relatorio_clientes() to authenticated;
grant execute on function public.relatorio_interesse(date, date, integer) to authenticated;
grant execute on function public.relatorio_custo_ia(date, date) to authenticated;
