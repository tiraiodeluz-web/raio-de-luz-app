create or replace function public.repetir_pedido(p_pedido_id uuid)
returns table(itens_adicionados integer, itens_indisponiveis integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dono uuid;
  v_add int := 0;
  r record;
begin
  select cliente_id into v_dono from public.pedidos where id = p_pedido_id;
  if v_dono is null or v_dono <> auth.uid() then
    raise exception 'Pedido não encontrado' using errcode = 'P0001';
  end if;

  for r in
    select pi.produto_id, pi.santo_id, pi.quantidade, pi.personalizacao
    from public.pedido_itens pi
    join public.produtos p on p.id = pi.produto_id and p.ativo
    where pi.pedido_id = p_pedido_id
      and (
        pi.santo_id is null
        or exists (
          select 1 from public.produto_santos ps
          where ps.produto_id = pi.produto_id and ps.santo_id = pi.santo_id
        )
      )
  loop
    update public.carrinho_itens
       set quantidade = quantidade + r.quantidade
     where usuario_id = auth.uid() and produto_id = r.produto_id
       and santo_id is not distinct from r.santo_id
       and personalizacao is not distinct from r.personalizacao;
    if not found then
      insert into public.carrinho_itens (usuario_id, produto_id, santo_id, quantidade, personalizacao)
      values (auth.uid(), r.produto_id, r.santo_id, r.quantidade, r.personalizacao);
    end if;
    v_add := v_add + 1;
  end loop;

  return query
  select v_add,
    (select count(*)::int from public.pedido_itens where pedido_id = p_pedido_id) - v_add;
end;
$function$;
