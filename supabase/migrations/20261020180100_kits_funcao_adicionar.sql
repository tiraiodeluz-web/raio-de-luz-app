-- Adiciona todos os itens de um kit ao carrinho de quem chamou, reaproveitando
-- adicionar_ao_carrinho (soma quantidade se o item já estiver no carrinho).
-- Item que falhar por regra de negócio (produto inativo, embalagem mudou
-- depois do kit montado etc.) é pulado e contado como indisponível, em vez
-- de cancelar o kit inteiro.
create or replace function public.adicionar_kit_ao_carrinho(p_kit_id uuid)
returns table(itens_adicionados integer, itens_indisponiveis integer)
language plpgsql
set search_path to 'public'
as $$
declare
  v_add int := 0;
  v_total int := 0;
  r record;
begin
  if not public.pode_comprar() then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;

  select count(*) into v_total from public.kit_itens where kit_id = p_kit_id;
  if v_total = 0 then
    raise exception 'Kit indisponível' using errcode = 'P0001';
  end if;

  for r in
    select ki.produto_id, ki.santo_id, ki.quantidade
      from public.kit_itens ki
      join public.produtos p on p.id = ki.produto_id and p.ativo
     where ki.kit_id = p_kit_id
     order by ki.ordem
  loop
    begin
      -- Os 4 parâmetros nomeados forçam a versão nova da função (a antiga,
      -- sem personalização, continua no banco porque DROP trava no canal).
      perform public.adicionar_ao_carrinho(
        p_produto_id => r.produto_id,
        p_quantidade => r.quantidade,
        p_santo_id => r.santo_id,
        p_personalizacao => null::text
      );
      v_add := v_add + 1;
    exception when sqlstate 'P0001' then
      null;
    end;
  end loop;

  return query select v_add, v_total - v_add;
end $$;
