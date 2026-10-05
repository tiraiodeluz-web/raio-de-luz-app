-- Coloca 20 produtos aleatórios (entre os com preço > 20) em oferta, com
-- desconto percentual aleatório de 10% a 20% cada, pra testar a seção
-- "Em oferta".
with alvos as (
  select id
  from public.produtos
  where ativo and preco > 20
  order by random()
  limit 20
)
update public.produtos p
set preco_promocional = round((p.preco * (1 - (10 + random() * 10) / 100))::numeric, 2)
from alvos a
where p.id = a.id;
