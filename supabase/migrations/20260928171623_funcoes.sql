create or replace function public.tg_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.perfis (id, nome, cnpj, razao_social, telefone, cep, cidade, uf)
  values (
    new.id,
    coalesce(m->>'nome', ''),
    nullif(regexp_replace(coalesce(m->>'cnpj', ''), '\D', '', 'g'), ''),
    m->>'razao_social',
    nullif(regexp_replace(coalesce(m->>'telefone', ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(m->>'cep', ''), '\D', '', 'g'), ''),
    m->>'cidade',
    m->>'uf'
  );
  return new;
end $$;
create trigger auth_novo_usuario after insert on auth.users
  for each row execute function public.tg_novo_usuario();

create or replace function public.cnpj_disponivel(p_cnpj text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.perfis where cnpj = regexp_replace(p_cnpj, '\D', '', 'g')
  );
$$;
grant execute on function public.cnpj_disponivel(text) to anon, authenticated;

create or replace function public.tg_carrinho_valida()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p public.produtos%rowtype;
begin
  select * into p from public.produtos where id = new.produto_id;
  if not found or not p.ativo then
    raise exception 'Produto indisponível' using errcode = 'P0001';
  end if;
  if new.quantidade % p.embalagem <> 0 then
    raise exception 'A quantidade deve ser múltiplo de % (embalagem)', p.embalagem using errcode = 'P0001';
  end if;
  if not p.personalizavel then
    new.santo_id := null;
  elsif new.santo_id is not null
        and exists (select 1 from public.produto_santos where produto_id = p.id)
        and not exists (select 1 from public.produto_santos
                        where produto_id = p.id and santo_id = new.santo_id) then
    raise exception 'Santo não disponível para este produto' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger carrinho_valida before insert or update on public.carrinho_itens
  for each row execute function public.tg_carrinho_valida();

create or replace function public.tg_carrinho_marca_atividade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.quantidade > old.quantidade then
    perform set_config('app.interno', '1', true);
    update public.perfis
       set ultimo_produto_carrinho = now(),
           carrinho_msg_60min_em   = null,
           carrinho_msg_1dia_em    = null
     where id = new.usuario_id;
    perform set_config('app.interno', '', true);
  end if;
  return new;
end $$;
create trigger carrinho_marca_atividade after insert or update on public.carrinho_itens
  for each row execute function public.tg_carrinho_marca_atividade();

create or replace function public.adicionar_ao_carrinho(
  p_produto_id uuid, p_quantidade integer default null, p_santo_id uuid default null
) returns public.carrinho_itens
language plpgsql security invoker set search_path = public as $$
declare
  v_emb integer;
  v_pers boolean;
  v_item public.carrinho_itens;
begin
  if not public.pode_comprar() then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;
  select embalagem, personalizavel into v_emb, v_pers from public.produtos where id = p_produto_id;
  if v_emb is null then
    raise exception 'Produto indisponível' using errcode = 'P0001';
  end if;
  if not v_pers then p_santo_id := null; end if;

  update public.carrinho_itens
     set quantidade = quantidade + coalesce(p_quantidade, v_emb)
   where usuario_id = auth.uid() and produto_id = p_produto_id
     and santo_id is not distinct from p_santo_id
  returning * into v_item;

  if not found then
    insert into public.carrinho_itens (usuario_id, produto_id, santo_id, quantidade)
    values (auth.uid(), p_produto_id, p_santo_id, coalesce(p_quantidade, v_emb))
    returning * into v_item;
  end if;
  return v_item;
end $$;
grant execute on function public.adicionar_ao_carrinho(uuid, integer, uuid) to authenticated;

create or replace function public.validar_cupom(p_codigo text)
returns table (codigo text, valor numeric)
language sql stable security definer set search_path = public as $$
  select c.codigo, c.valor from public.cupons c
   where upper(c.codigo) = upper(trim(p_codigo)) and c.ativo
     and public.pode_comprar()
   limit 1;
$$;
grant execute on function public.validar_cupom(text) to authenticated;

create or replace function public.criar_pedido(
  p_endereco_id uuid,
  p_observacoes text default null,
  p_cupom       text default null
) returns table (pedido_id uuid, numero bigint, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_perfil    public.perfis%rowtype;
  v_end       public.enderecos%rowtype;
  v_subtotal  numeric(12,2);
  v_desconto  numeric(12,2) := 0;
  v_cupom     text;
  v_pedido    public.pedidos%rowtype;
  v_qtd_itens integer;
begin
  select * into v_perfil from public.perfis where id = v_uid;
  if not found or not (v_perfil.cadastro_aprovado or v_perfil.tipo = 'admin') then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;

  select * into v_end from public.enderecos where id = p_endereco_id and usuario_id = v_uid;
  if not found then
    raise exception 'Informe o endereço de entrega' using errcode = 'P0001';
  end if;

  perform 1 from public.carrinho_itens where usuario_id = v_uid for update;

  select count(*), coalesce(sum(ci.quantidade * p.preco_efetivo), 0)
    into v_qtd_itens, v_subtotal
    from public.carrinho_itens ci
    join public.produtos p on p.id = ci.produto_id and p.ativo
   where ci.usuario_id = v_uid;

  if v_qtd_itens = 0 then
    raise exception 'Seu carrinho está vazio' using errcode = 'P0001';
  end if;

  if nullif(trim(p_cupom), '') is not null then
    select c.codigo, least(c.valor, v_subtotal) into v_cupom, v_desconto
      from public.cupons c
     where upper(c.codigo) = upper(trim(p_cupom)) and c.ativo;
    if v_cupom is null then
      raise exception 'Cupom inválido' using errcode = 'P0001';
    end if;
  end if;

  insert into public.pedidos (cliente_id, subtotal, desconto, total, cupom_codigo, observacoes,
                              endereco_entrega, cliente_snapshot)
  values (
    v_uid, v_subtotal, v_desconto, v_subtotal - v_desconto, v_cupom, nullif(trim(p_observacoes), ''),
    jsonb_build_object('cep', v_end.cep, 'rua', v_end.rua, 'numero', v_end.numero,
                       'complemento', v_end.complemento, 'bairro', v_end.bairro,
                       'cidade', v_end.cidade, 'estado', v_end.estado),
    jsonb_build_object('nome', v_perfil.nome, 'razao_social', v_perfil.razao_social,
                       'cnpj', v_perfil.cnpj, 'telefone', v_perfil.telefone,
                       'codigo', v_perfil.codigo)
  )
  returning * into v_pedido;

  insert into public.pedido_itens (pedido_id, produto_id, santo_id, sku, produto_nome, santo_nome,
                                   imagem_url, quantidade, preco_unitario, subtotal)
  select v_pedido.id, p.id, s.id, p.sku, p.nome, s.nome,
         coalesce(ps.foto_url, s.foto_url, p.imagem_principal),
         ci.quantidade, p.preco_efetivo, ci.quantidade * p.preco_efetivo
    from public.carrinho_itens ci
    join public.produtos p on p.id = ci.produto_id and p.ativo
    left join public.santos s on s.id = ci.santo_id
    left join public.produto_santos ps on ps.produto_id = p.id and ps.santo_id = s.id
   where ci.usuario_id = v_uid
   order by ci.criado_em;

  update public.produtos p
     set vendas = p.vendas + x.qtd
    from (select produto_id, sum(quantidade) qtd from public.carrinho_itens
           where usuario_id = v_uid group by produto_id) x
   where p.id = x.produto_id;

  delete from public.carrinho_itens where usuario_id = v_uid;

  perform set_config('app.interno', '1', true);
  update public.perfis set carrinho_msg_60min_em = null, carrinho_msg_1dia_em = null,
                           ultimo_produto_carrinho = null
   where id = v_uid;
  perform set_config('app.interno', '', true);

  return query select v_pedido.id, v_pedido.numero, v_pedido.total;
end $$;
revoke execute on function public.criar_pedido(uuid, text, text) from public, anon;
grant execute on function public.criar_pedido(uuid, text, text) to authenticated;

create or replace function public.tg_pedido_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.status_alterado_em := now();
    if new.status = 'cancelado' and old.status <> 'cancelado' then
      update public.produtos p set vendas = greatest(p.vendas - i.quantidade, 0)
        from public.pedido_itens i where i.pedido_id = new.id and i.produto_id = p.id;
    elsif old.status = 'cancelado' and new.status <> 'cancelado' then
      update public.produtos p set vendas = p.vendas + i.quantidade
        from public.pedido_itens i where i.pedido_id = new.id and i.produto_id = p.id;
    end if;
  end if;
  return new;
end $$;
create trigger pedido_status before update of status on public.pedidos
  for each row execute function public.tg_pedido_status();

create or replace function public.tg_pedido_imutavel()
returns trigger language plpgsql set search_path = public as $$
begin
  if ((new.subtotal, new.desconto, new.total, new.cupom_codigo, new.criado_em, new.numero)
       is distinct from
      (old.subtotal, old.desconto, old.total, old.cupom_codigo, old.criado_em, old.numero)
      or (new.cliente_id is distinct from old.cliente_id and new.cliente_id is not null))
     and current_setting('app.interno', true) is distinct from '1' then
    raise exception 'Somente status, rastreio e observações podem ser alterados' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger pedido_imutavel before update on public.pedidos
  for each row execute function public.tg_pedido_imutavel();

create or replace function public.tg_endereco_principal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.enderecos where usuario_id = new.usuario_id and id <> new.id) then
    new.principal := true;
  end if;
  if new.principal then
    update public.enderecos set principal = false
     where usuario_id = new.usuario_id and id <> new.id and principal;
  end if;
  return new;
end $$;
create trigger endereco_principal before insert or update of principal on public.enderecos
  for each row execute function public.tg_endereco_principal();

create or replace function public.metricas_admin()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  hoje timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  r jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'pedidos_total',        count(*),
    'pedidos_hoje',         count(*) filter (where criado_em >= hoje),
    'faturamento_total',    coalesce(sum(total) filter (where status <> 'cancelado'), 0),
    'faturamento_hoje',     coalesce(sum(total) filter (where status <> 'cancelado' and criado_em >= hoje), 0),
    'aguardando',           count(*) filter (where status = 'aguardando_pagamento'),
    'em_separacao',         count(*) filter (where status = 'em_separacao'),
    'enviados',             count(*) filter (where status = 'enviado'),
    'cancelados',           count(*) filter (where status = 'cancelado'),
    'carrinhos_abandonados', (select count(distinct usuario_id) from public.carrinho_itens),
    'cadastros_pendentes',  (select count(*) from public.perfis where not cadastro_aprovado and tipo = 'cliente')
  ) into r from public.pedidos;
  return r;
end $$;
grant execute on function public.metricas_admin() to authenticated;

create or replace function public.carrinhos_abandonados()
returns table (
  usuario_id uuid, codigo text, nome text, razao_social text, telefone text,
  ultimo_acesso timestamptz, ultimo_produto_carrinho timestamptz,
  itens bigint, valor numeric, whatsapp_enviado boolean
) language sql stable security definer set search_path = public as $$
  select pf.id, pf.codigo, pf.nome, pf.razao_social, pf.telefone,
         pf.ultimo_acesso, pf.ultimo_produto_carrinho,
         count(ci.id), sum(ci.quantidade * p.preco_efetivo),
         (pf.carrinho_msg_60min_em is not null)
    from public.carrinho_itens ci
    join public.perfis pf on pf.id = ci.usuario_id
    join public.produtos p on p.id = ci.produto_id
   where public.eh_admin()
   group by pf.id
   order by pf.ultimo_produto_carrinho desc nulls last;
$$;
grant execute on function public.carrinhos_abandonados() to authenticated;

create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

create index produtos_catalogo_categoria_idx on public.produtos (catalogo_id, categoria_id) where ativo;

create or replace function public.categorias_do_catalogo(p_catalogo_id uuid)
returns table (id uuid, nome text, qtd bigint)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nome, count(*)
    from public.produtos p join public.categorias c on c.id = p.categoria_id and c.ativo
   where p.ativo and p.catalogo_id = p_catalogo_id
   group by c.id, c.nome, c.ordem
   order by c.ordem, c.nome;
$$;
grant execute on function public.categorias_do_catalogo(uuid) to authenticated;

create or replace function public.catalogos_da_categoria(p_categoria_id uuid)
returns table (id uuid, nome text, qtd bigint)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nome, count(*)
    from public.produtos p join public.catalogos c on c.id = p.catalogo_id and c.ativo
   where p.ativo and p.categoria_id = p_categoria_id
   group by c.id, c.nome, c.ordem
   order by c.ordem, c.nome;
$$;
grant execute on function public.catalogos_da_categoria(uuid) to authenticated;
