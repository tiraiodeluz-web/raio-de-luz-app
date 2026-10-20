-- Cria (p_id null) ou atualiza um kit e substitui a lista de itens numa
-- transação só, pra nunca ficar kit salvo pela metade. p_itens é um array
-- [{produto_id, santo_id, quantidade}] na ordem em que aparecem pro cliente.
create or replace function public.admin_salvar_kit(
  p_id uuid,
  p_nome text,
  p_descricao text,
  p_imagem_url text,
  p_ativo boolean,
  p_itens jsonb
)
returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores' using errcode = '42501';
  end if;
  if nullif(trim(p_nome), '') is null then
    raise exception 'Informe o nome do kit' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um produto ao kit' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.kits (nome, descricao, imagem_url, ativo)
    values (trim(p_nome), nullif(trim(p_descricao), ''), p_imagem_url, p_ativo)
    returning id into v_id;
  else
    update public.kits
       set nome = trim(p_nome), descricao = nullif(trim(p_descricao), ''),
           imagem_url = p_imagem_url, ativo = p_ativo, atualizado_em = now()
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Kit não encontrado' using errcode = 'P0001';
    end if;
    delete from public.kit_itens where kit_id = v_id;
  end if;

  insert into public.kit_itens (kit_id, produto_id, santo_id, quantidade, ordem)
  select v_id, (i->>'produto_id')::uuid, nullif(i->>'santo_id', '')::uuid,
         (i->>'quantidade')::int, (n - 1)::int
    from jsonb_array_elements(p_itens) with ordinality as t(i, n);

  return v_id;
end $$;

revoke execute on function public.admin_salvar_kit(uuid, text, text, text, boolean, jsonb) from public, anon;
revoke execute on function public.adicionar_kit_ao_carrinho(uuid) from public, anon;
grant execute on function public.admin_salvar_kit(uuid, text, text, text, boolean, jsonb) to authenticated;
grant execute on function public.adicionar_kit_ao_carrinho(uuid) to authenticated;
