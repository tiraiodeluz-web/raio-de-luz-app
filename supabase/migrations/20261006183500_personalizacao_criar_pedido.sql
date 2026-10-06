-- criar_pedido ficou grande demais pra aplicar como uma função só (o canal
-- de migração trava em instruções CREATE FUNCTION muito longas) — por isso
-- a cópia dos itens do carrinho, a atualização de vendas, a limpeza do
-- carrinho e o reset dos avisos de carrinho abandonado viraram funções
-- auxiliares menores, chamadas em sequência pela criar_pedido.

create or replace function public.pedido_copiar_itens(p_pedido_id uuid, p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  insert into public.pedido_itens (pedido_id, produto_id, santo_id, sku, produto_nome, santo_nome,
                                   imagem_url, quantidade, preco_unitario, subtotal, personalizacao)
  select p_pedido_id, p.id, s.id, p.sku, p.nome, s.nome,
         coalesce(ps.foto_url, s.foto_url, p.imagem_principal),
         ci.quantidade, p.preco_efetivo, ci.quantidade * p.preco_efetivo, ci.personalizacao
    from public.carrinho_itens ci
    join public.produtos p on p.id = ci.produto_id and p.ativo
    left join public.santos s on s.id = ci.santo_id
    left join public.produto_santos ps on ps.produto_id = p.id and ps.santo_id = s.id
   where ci.usuario_id = p_uid
   order by ci.criado_em;
end $f$;

create or replace function public.pedido_atualizar_vendas(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  update public.produtos p
     set vendas = p.vendas + x.qtd
    from (select produto_id, sum(quantidade) qtd from public.carrinho_itens
           where usuario_id = p_uid group by produto_id) x
   where p.id = x.produto_id;
end $f$;

create or replace function public.pedido_limpar_carrinho(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  delete from public.carrinho_itens where usuario_id = p_uid;
end $f$;

create or replace function public.pedido_resetar_avisos_carrinho(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  perform set_config('app.interno', '1', true);
  update public.perfis set carrinho_msg_60min_em = null, carrinho_msg_1dia_em = null,
                           ultimo_produto_carrinho = null
   where id = p_uid;
  perform set_config('app.interno', '', true);
end $f$;

create or replace function public.criar_pedido(p_endereco_id uuid, p_observacoes text default null, p_cupom text default null)
returns table(pedido_id uuid, numero bigint, total numeric)
language plpgsql
security definer
set search_path to 'public'
as $f$
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

  perform public.pedido_copiar_itens(v_pedido.id, v_uid);
  perform public.pedido_atualizar_vendas(v_uid);
  perform public.pedido_limpar_carrinho(v_uid);
  perform public.pedido_resetar_avisos_carrinho(v_uid);

  return query select v_pedido.id, v_pedido.numero, v_pedido.total;
end $f$;
