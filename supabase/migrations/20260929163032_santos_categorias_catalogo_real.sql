-- Substitui os santos parciais pela lista completa (30 santos) extraida da
-- planilha oficial de catalogo (29/09/2026). O codigo bate com o sufixo dos
-- SKUs personalizaveis (ex.: CH.032/24 = produto CH.032, santo 24 Sao Bento).
delete from public.produto_santos where santo_id in (select id from public.santos);
delete from public.santos;
insert into public.santos (codigo, nome, ordem) values
  ('03', 'Anjo da Guarda', 1),
  ('04', 'N. Sra. Aparecida', 2),
  ('05', 'Espírito Santo', 3),
  ('06', 'Jesus Misericordioso', 4),
  ('11', 'N. Sra. de Fátima', 5),
  ('12', 'N. Sra de Lourdes', 6),
  ('13', 'Padre Pio', 7),
  ('15', 'Personalizado', 8),
  ('16', 'S. C. de Jesus', 9),
  ('17', 'S. C. de Maria', 10),
  ('18', 'Sagrada Família', 11),
  ('20', 'Santa Rita', 12),
  ('21', 'Santa Terezinha', 13),
  ('22', 'Santo Antônio', 14),
  ('23', 'Medalha de São Bento', 15),
  ('24', 'São Bento', 16),
  ('25', 'São Cristóvão', 17),
  ('26', 'São Francisco', 18),
  ('27', 'São Gabriel', 19),
  ('29', 'São José', 20),
  ('30', 'São Miguel', 21),
  ('31', 'São Rafael', 22),
  ('33', 'N. Sra. das Graças', 23),
  ('35', 'N. SRa. de Guadalupe', 24),
  ('42', 'Anjo da Guarda Azul', 25),
  ('43', 'Anjo da Guarda Rosa', 26),
  ('45', 'S. C. de Jesus e Maria', 27),
  ('49', 'N. Sra. da Conceição', 28),
  ('52', 'São Judas Tadeu', 29),
  ('62', 'N. Sra. Salette', 30);

-- Categorias reais (substituem as 3 de exemplo da migracao inicial).
delete from public.produtos where categoria_id in (select id from public.categorias);
delete from public.categorias;
insert into public.categorias (nome, ordem) values
  ('Terços e Dezenas', 1),
  ('Chaveiros', 2),
  ('Medalhas', 3),
  ('Pulseiras e Adornos', 4),
  ('Crucifixos', 5),
  ('Bíblias', 6);

-- Remove os produtos de demonstracao (a migracao inicial nao tinha o catalogo real ainda).
delete from public.produto_santos;
delete from public.produtos;
