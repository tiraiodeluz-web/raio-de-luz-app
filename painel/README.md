# Painel administrativo (web)

Site do admin da Raio de Luz: produtos, importação da planilha, banners,
cupons, pedidos, clientes, relatórios e custo da IA. Usa o mesmo banco
(Supabase) e o mesmo login de administrador do app.

- Endereço: https://raiodeluz-painel.expo.app
- Publicação: automática quando algo em `painel/` chega no branch `main`
  (workflow `.eas/workflows/publicar-painel.yml`), ou manual em
  expo.dev → Workflows → "Publicar painel web" → Run.

## Rodar no computador

```bash
cd painel
npm install
npm run dev      # abre em http://localhost:5174
npm run build    # confere tipos e gera a pasta dist/
```

## Organização

- `src/paginas/` — uma tela por arquivo (rotas em `src/App.tsx`).
- `src/componentes/` — botões, campos, tabela, gráfico, envio de foto.
- `src/lib/` — conexão com o banco, formatação, leitura da planilha.
- Tipos do banco, HTML do PDF do pedido e formatação de preço vêm de
  `../src` (o mesmo código do app), pelo atalho `@/`.

As regras de quem pode ver/editar estão no banco (RLS e funções que checam
`eh_admin()`); o painel só mostra a tela de login para quem não é admin.
