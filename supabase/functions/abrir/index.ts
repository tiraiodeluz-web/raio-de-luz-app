// Edge Function: abrir
//
// Link https clicável que abre uma tela do app. WhatsApp (e a maioria dos
// apps) só transforma em link azul/clicável endereços http(s) — um link
// com esquema customizado (raiodeluz://...) nunca fica clicável lá. Essa
// função serve uma página https real que, ao ser aberta, redireciona na
// hora pro esquema do app (raiodeluz://<rota>), com um botão manual pra
// quem o navegador não redirecionar automaticamente.
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

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Raio de Luz Religiosos</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #010534; color: #fff;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }
  a.botao { margin-top: 24px; background: #C9A227; color: #010534; text-decoration: none;
            padding: 14px 28px; border-radius: 999px; font-weight: 700; }
  p { opacity: 0.85; max-width: 320px; }
</style>
</head>
<body>
  <p>Abrindo no app Raio de Luz Religiosos…</p>
  <a class="botao" href="${linkApp}">Toque aqui se não abrir automaticamente</a>
  <script>
    location.replace(${JSON.stringify(linkApp)});
  </script>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
});
