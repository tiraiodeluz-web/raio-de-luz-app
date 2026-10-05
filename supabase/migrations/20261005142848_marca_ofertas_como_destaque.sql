-- A seção "Em oferta" filtra por produtos.destaque = true, não pela simples
-- presença de preco_promocional — marca os produtos em oferta como destaque
-- pra aparecerem lá.
update public.produtos set destaque = true where preco_promocional is not null;
