-- Troca os banners placeholder (picsum.photos) pelos banners oficiais
-- enviados pelo Carlos, hospedados no CDN do Bubble.
update public.banners set foto_url = 'https://127759570673ebd313bc6eaa4bede7b1.cdn.bubble.io/f1784202997514x737107177261112200/Banner%201%20%281%29.png' where id = 'b22a08c7-a269-476d-9bd7-437e08313947';
update public.banners set foto_url = 'https://127759570673ebd313bc6eaa4bede7b1.cdn.bubble.io/f1784203044745x192168230907766370/Banner%202.png' where id = '647b63d7-931c-43cf-8f88-b41d13597899';
