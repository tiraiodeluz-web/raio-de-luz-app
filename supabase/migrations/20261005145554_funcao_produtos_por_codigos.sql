-- Resolve uma lista de códigos digitados/colados (ex.: "CH.032") pros
-- produtos correspondentes, sem diferenciar maiúscula/minúscula. Devolve uma
-- linha por termo buscado (id nulo = não achou), pra tela de "Adicionar por
-- código" reportar certinho o que entrou e o que não.
create or replace function public.produtos_por_codigos(p_skus text[])
returns table (
  termo_buscado text,
  id uuid,
  sku text,
  nome text,
  personalizavel boolean,
  embalagem int,
  ativo boolean
)
language sql
stable
as $$
  select busca.termo, p.id, p.sku, p.nome, p.personalizavel, p.embalagem, p.ativo
  from unnest(p_skus) as busca(termo)
  left join public.produtos p on lower(p.sku) = lower(busca.termo) and p.ativo;
$$;
