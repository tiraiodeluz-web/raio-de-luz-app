-- Pasta privada com o PDF de cada pedido (<pedido_id>.pdf). O app gera o
-- PDF no fechamento do pedido, sobe aqui e manda um link assinado na
-- mensagem do WhatsApp (wa.me não aceita anexo). Só o dono do pedido e o
-- admin gravam/leem; o link assinado é o que o vendedor abre.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pedidos-pdf', 'pedidos-pdf', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create or replace function public.pode_acessar_pdf_pedido(p_nome_arquivo text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.eh_admin() or exists (
    select 1 from public.pedidos p
     where p.id::text || '.pdf' = p_nome_arquivo and p.cliente_id = auth.uid()
  );
$$;
revoke execute on function public.pode_acessar_pdf_pedido(text) from public, anon;
grant execute on function public.pode_acessar_pdf_pedido(text) to authenticated;

create policy pedidos_pdf_ler on storage.objects for select to authenticated
  using (bucket_id = 'pedidos-pdf' and public.pode_acessar_pdf_pedido(name));
create policy pedidos_pdf_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'pedidos-pdf' and public.pode_acessar_pdf_pedido(name));
create policy pedidos_pdf_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'pedidos-pdf' and public.pode_acessar_pdf_pedido(name))
  with check (bucket_id = 'pedidos-pdf' and public.pode_acessar_pdf_pedido(name));
