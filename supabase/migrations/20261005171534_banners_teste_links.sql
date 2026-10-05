update public.banners set link = '/catalogo/7f6c84cf-1d4d-4426-aad5-80d99a9849f8' where id = 'b22a08c7-a269-476d-9bd7-437e08313947';

update public.banners set link = '/categoria/f869dbd1-bd8a-4cc7-ac77-123e5008ff75' where id = '647b63d7-931c-43cf-8f88-b41d13597899';

insert into public.banners (foto_url, link, ordem, ativo)
select foto_url, 'https://wa.me/5543996081065', 3, true
from public.banners where id = 'b22a08c7-a269-476d-9bd7-437e08313947';
