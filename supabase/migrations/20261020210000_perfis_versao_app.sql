-- "Versão do app" por conta, pra apresentar o antes/depois: 'classica'
-- esconde assistente de IA, kits, compartilhar carrinho/produto, pedir de
-- novo e recomendados; '2.0' mostra tudo. Só admin troca (inclusive a
-- própria). Aproveita pra proteger também limite_credito, que o próprio
-- cliente conseguia alterar pela API.
alter table public.perfis add column versao_app text not null default '2.0'
  check (versao_app in ('classica', '2.0'));

create or replace function public.tg_perfis_protege_campos()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.eh_admin() or auth.uid() is null or current_setting('app.interno', true) = '1' then
    if new.cadastro_aprovado and not old.cadastro_aprovado then
      new.aprovado_em := now();
    end if;
    return new;
  end if;
  if new.tipo is distinct from old.tipo
     or new.cadastro_aprovado is distinct from old.cadastro_aprovado
     or new.aprovado_em is distinct from old.aprovado_em
     or new.codigo is distinct from old.codigo
     or new.cnpj is distinct from old.cnpj
     or new.carrinho_msg_60min_em is distinct from old.carrinho_msg_60min_em
     or new.carrinho_msg_1dia_em is distinct from old.carrinho_msg_1dia_em
     or new.ultimo_produto_carrinho is distinct from old.ultimo_produto_carrinho
     or new.bubble_id is distinct from old.bubble_id
     or new.limite_credito is distinct from old.limite_credito
     or new.versao_app is distinct from old.versao_app then
    raise exception 'Sem permissão para alterar estes campos' using errcode = '42501';
  end if;
  return new;
end $function$;
