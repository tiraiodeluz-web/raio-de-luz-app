// Edge Function: abrir
//
// Link https clicável que abre uma tela do app. WhatsApp (e a maioria dos
// apps) só transforma em link azul/clicável endereços http(s) — um link
// com esquema customizado (raiodeluz://...) nunca fica clicável lá.
//
// Importante: Edge Functions do Supabase não servem HTML — toda resposta
// GET com Content-Type text/html é reescrita pra text/plain pela própria
// plataforma (ver docs "Routing" > "HTML content is not supported"). Por
// isso essa função NÃO devolve uma página; ela devolve um redirecionamento
// HTTP (302) direto pro esquema do app, que o navegador do celular segue
// sozinho — sem precisar de HTML nem JavaScript no meio do caminho.
//
// Uso: https://<projeto>.supabase.co/functions/v1/abrir/produto/<id>
//      https://<projeto>.supabase.co/functions/v1/abrir/carrinho-compartilhado/<id>

const ESQUEMA = "raiodeluz://";

Deno.serve((req) => {
  const url = new URL(req.url);
  // Tudo depois de "/abrir/" é a rota do app (ex.: "produto/<id>").
  const rota = url.pathname.replace(/^\/(functions\/v1\/)?abrir\/?/, "");

  if (!rota) {
    return new Response("Rota não informada.", { status: 400 });
  }

  const linkApp = ESQUEMA + rota;

  return new Response(null, {
    status: 302,
    headers: { Location: linkApp },
  });
});
