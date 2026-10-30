-- Texto da notificação enviada quando o admin aprova o cadastro do cliente.
update public.eventos_push
   set titulo = 'Parabéns, seu cadastro foi aprovado! 🎉',
       corpo = 'Olá, {nome}! Toque aqui e confira nossos milhares de produtos.'
 where chave = 'cadastro_aprovado';
