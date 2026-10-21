-- Importação da planilha de produtos pelo painel web, em lotes.
-- Cada item: { sku, nome, preco, embalagem, imagem, categoria_id?, catalogo_id?, santos: [{codigo, foto}] }
--   - SKU novo  -> cria o produto na categoria/catálogo do item (colunas da
--     planilha) ou, se faltar, nos escolhidos para o lote.
--   - SKU antigo -> atualiza nome, preço, embalagem e foto; categoria e
--     catálogo só mudam se o item trouxer (preço promocional, descrição e
--     "ativo" ficam como estão).
--   - santos: liga o santo ao produto (com a foto da linha da planilha) e
--     marca o produto como "escolhe santo". Santos que já estavam ligados e
--     não vieram na planilha continuam ligados.
create or replace function public.importar_produtos_lote(
  p_itens jsonb,
  p_categoria_id uuid default null,
  p_catalogo_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_id uuid;
  v_tem_santos boolean;
  v_criados integer := 0;
  v_atualizados integer := 0;
  v_santos integer := 0;
  v_n integer;
  v_cat uuid;
  v_catalogo uuid;
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 500 then
    raise exception 'Lote inválido (máximo 500 produtos por vez)' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    if coalesce(trim(v_item->>'sku'), '') = '' or coalesce(trim(v_item->>'nome'), '') = '' then
      continue;
    end if;
    v_tem_santos := jsonb_array_length(coalesce(v_item->'santos', '[]'::jsonb)) > 0;
    v_cat := nullif(v_item->>'categoria_id', '')::uuid;
    v_catalogo := nullif(v_item->>'catalogo_id', '')::uuid;

    select id into v_id from public.produtos where sku = trim(v_item->>'sku');
    if v_id is null then
      insert into public.produtos (sku, nome, preco, embalagem, imagem_principal, categoria_id, catalogo_id, personalizavel)
      values (trim(v_item->>'sku'), trim(v_item->>'nome'), (v_item->>'preco')::numeric,
              greatest(coalesce((v_item->>'embalagem')::integer, 1), 1),
              nullif(v_item->>'imagem', ''),
              coalesce(v_cat, p_categoria_id), coalesce(v_catalogo, p_catalogo_id), v_tem_santos)
      returning id into v_id;
      v_criados := v_criados + 1;
    else
      update public.produtos
         set nome = trim(v_item->>'nome'),
             preco = (v_item->>'preco')::numeric,
             embalagem = greatest(coalesce((v_item->>'embalagem')::integer, 1), 1),
             imagem_principal = coalesce(nullif(v_item->>'imagem', ''), imagem_principal),
             categoria_id = coalesce(v_cat, categoria_id),
             catalogo_id = coalesce(v_catalogo, catalogo_id),
             personalizavel = personalizavel or v_tem_santos,
             atualizado_em = now()
       where id = v_id;
      v_atualizados := v_atualizados + 1;
    end if;

    if v_tem_santos then
      insert into public.produto_santos (produto_id, santo_id, foto_url)
      select v_id, s.id, nullif(x->>'foto', '')
        from jsonb_array_elements(v_item->'santos') x
        join public.santos s on s.codigo = lpad(x->>'codigo', 2, '0')
      on conflict (produto_id, santo_id)
      do update set foto_url = coalesce(excluded.foto_url, public.produto_santos.foto_url);
      get diagnostics v_n = row_count;
      v_santos := v_santos + v_n;
    end if;
  end loop;

  return jsonb_build_object('criados', v_criados, 'atualizados', v_atualizados, 'santos', v_santos);
end $$;

revoke execute on function public.importar_produtos_lote(jsonb, uuid, uuid) from public, anon;
grant execute on function public.importar_produtos_lote(jsonb, uuid, uuid) to authenticated;
