-- Santo "Personalizado" (codigo 15) exige o texto de personalização que o
-- cliente digitou; outros santos (ou produto sem personalização) não
-- guardam esse texto. Itens personalizados nunca mesclam quantidade entre
-- si (cada texto é único), só mescla produto+santo+personalização idênticos.
create or replace function public.adicionar_ao_carrinho(
  p_produto_id uuid,
  p_quantidade integer default null,
  p_santo_id uuid default null,
  p_personalizacao text default null
)
returns public.carrinho_itens
language plpgsql
set search_path to 'public'
as $$
declare
  v_emb integer;
  v_pers boolean;
  v_santo_codigo text;
  v_personalizacao text;
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

  if p_santo_id is not null then
    select codigo into v_santo_codigo from public.santos where id = p_santo_id;
  end if;

  v_personalizacao := nullif(trim(p_personalizacao), '');
  if v_santo_codigo = '15' and v_personalizacao is null then
    raise exception 'Informe como você quer a personalização' using errcode = 'P0001';
  end if;
  if v_santo_codigo <> '15' then
    v_personalizacao := null;
  end if;

  update public.carrinho_itens
     set quantidade = quantidade + coalesce(p_quantidade, v_emb)
   where usuario_id = auth.uid() and produto_id = p_produto_id
     and santo_id is not distinct from p_santo_id
     and personalizacao is not distinct from v_personalizacao
  returning * into v_item;

  if not found then
    insert into public.carrinho_itens (usuario_id, produto_id, santo_id, quantidade, personalizacao)
    values (auth.uid(), p_produto_id, p_santo_id, coalesce(p_quantidade, v_emb), v_personalizacao)
    returning * into v_item;
  end if;
  return v_item;
end $$;
