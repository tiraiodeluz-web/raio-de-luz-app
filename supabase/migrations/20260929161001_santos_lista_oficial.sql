-- Substitui os santos de exemplo (inventados na migração) pela lista oficial
-- da loja, confirmada pelo Carlos em 29/09/2026. Codigo = o número usado nos
-- SKUs dos produtos personalizáveis (ex.: CH.032/04 = produto CH.032, santo 04).
delete from public.produto_santos where santo_id in (select id from public.santos);
delete from public.santos;

insert into public.santos (codigo, nome, ordem) values
  ('03', 'Anjo da Guarda', 1),
  ('04', 'N. Sra. Aparecida', 2),
  ('05', 'Espírito Santo', 3),
  ('06', 'Jesus Misericordioso', 4),
  ('11', 'N. Sra. de Fátima', 5),
  ('13', 'Padre Pio', 6),
  ('15', 'Personalizado', 7),
  ('18', 'Sagrada Família', 8),
  ('21', 'Santa Terezinha', 9),
  ('23', 'Medalha de São Bento', 10),
  ('25', 'São Cristóvão', 11),
  ('29', 'São José', 12),
  ('30', 'São Miguel', 13),
  ('33', 'N. Sra. das Graças', 14),
  ('45', 'S. C. de Jesus e Maria', 15);
