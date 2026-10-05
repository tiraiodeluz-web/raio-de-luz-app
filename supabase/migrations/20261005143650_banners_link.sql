-- Link do banner: rota interna (ex.: /catalogo/<id>) ou URL externa
-- (ex.: https://...). Em branco = banner não clicável.
alter table public.banners add column link text;
