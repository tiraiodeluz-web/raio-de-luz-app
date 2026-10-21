import { LOGO_PDF_BASE64 } from '@/constants/logo-pdf';
import { formatarReais } from '@/lib/formatacao';
import { mascararTelefone } from '@/lib/mascaras';

// HTML do PDF do pedido no mesmo layout do modelo enviado
// (Pedido-16-Raio-de-Luz.pdf): faixa azul com logo, cliente/WhatsApp/catálogo,
// tabela Referência | Quantidade | Nome | Santo | Preço unitário e o total.
// Separado do pedido-pdf.ts (sem módulos nativos) pra dar pra conferir o
// visual fora do celular.

type ItemPdf = {
  sku: string;
  produto_nome: string;
  santo_nome: string | null;
  quantidade: number;
  preco_unitario: number;
  personalizacao: string | null;
  santos: { codigo: string | null } | null;
  produtos: { catalogos: { nome: string } | null } | null;
};

export type PedidoPdf = {
  id: string;
  numero: number;
  criado_em: string;
  subtotal: number;
  desconto: number;
  total: number;
  cupom_codigo: string | null;
  cliente_snapshot: { nome?: string | null; razao_social?: string | null; telefone?: string | null } | null;
  pedido_itens: ItemPdf[];
};

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function escapar(texto: string | number | null | undefined): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// No modelo: referência "ADE.01/4" (código do santo sem o zero) e santo
// "04 N. Sra. Aparecida"; item sem código de santo fica só com o nome.
function referencia(item: ItemPdf): string {
  const codigo = item.santos?.codigo;
  if (!codigo) return item.sku;
  const semZero = /^\d+$/.test(codigo) ? String(Number(codigo)) : codigo;
  return `${item.sku}/${semZero}`;
}

function textoSanto(item: ItemPdf): string {
  if (!item.santo_nome) return '';
  const codigo = item.santos?.codigo;
  return codigo ? `${codigo} ${item.santo_nome}` : item.santo_nome;
}

export function montarHtmlPedido(pedido: PedidoPdf): string {
  const cliente = pedido.cliente_snapshot ?? {};
  const nomeCliente = cliente.razao_social || cliente.nome || '—';
  const telefone = cliente.telefone ? mascararTelefone(cliente.telefone) : '—';
  const catalogos = [...new Set(pedido.pedido_itens.map((i) => i.produtos?.catalogos?.nome).filter((n): n is string => !!n))];
  const unidades = pedido.pedido_itens.reduce((soma, i) => soma + i.quantidade, 0);

  const linhas = pedido.pedido_itens
    .map(
      (item, indice) => `
      <tr class="${indice % 2 === 0 ? 'par' : ''}">
        <td>${escapar(referencia(item))}</td>
        <td class="centro">${escapar(item.quantidade)}</td>
        <td>${escapar(item.produto_nome)}${
          item.personalizacao ? `<div class="personalizacao">Personalização: ${escapar(item.personalizacao)}</div>` : ''
        }</td>
        <td>${escapar(textoSanto(item))}</td>
        <td class="direita">${escapar(formatarReais(Number(item.preco_unitario)))}</td>
      </tr>`,
    )
    .join('');

  const desconto = Number(pedido.desconto) > 0;

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #222; font-size: 11px; }
  .topo { background: #22295B; color: #fff; padding: 22px 36px; display: flex; align-items: center; gap: 16px; }
  .topo img { width: 62px; height: 62px; border-radius: 4px; }
  .marca { flex: 1; }
  .marca h1 { margin: 0; font-size: 19px; }
  .marca p { margin: 4px 0 0; font-style: italic; font-size: 11px; }
  .numero { text-align: right; }
  .numero h2 { margin: 0; font-size: 19px; }
  .numero p { margin: 4px 0 0; font-size: 11px; }
  .conteudo { padding: 22px 36px 60px; }
  .dados { display: flex; margin-bottom: 14px; }
  .dados div { flex: 1; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #22295B; color: #fff; text-align: left; padding: 7px 8px; font-size: 10.5px; }
  td { padding: 7px 8px; vertical-align: top; }
  tr.par td { background: #F2F3F7; }
  .centro { text-align: center; }
  .direita { text-align: right; }
  .personalizacao { color: #8A6D1B; font-size: 10px; margin-top: 2px; }
  .resumo { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; }
  .totais { text-align: right; line-height: 1.6; }
  .total { color: #22295B; font-size: 15px; font-weight: bold; }
  .rodape { position: fixed; bottom: 18px; left: 36px; right: 36px; color: #888; font-size: 9px; }
</style></head>
<body>
  <div class="topo">
    <img src="data:image/jpeg;base64,${LOGO_PDF_BASE64}" />
    <div class="marca"><h1>Raio de Luz Religiosos</h1><p>Inspiração e fé em cada detalhe!</p></div>
    <div class="numero"><h2>PEDIDO #${escapar(pedido.numero)}</h2><p>${escapar(FORMATADOR_DATA.format(new Date(pedido.criado_em)))}</p></div>
  </div>
  <div class="conteudo">
    <div class="dados">
      <div><b>Cliente:</b> ${escapar(nomeCliente)}<br /><b>Catálogo:</b> ${escapar(catalogos.join(', ') || '—')}</div>
      <div><b>WhatsApp:</b> ${escapar(telefone)}</div>
    </div>
    <table>
      <thead><tr><th>Referência</th><th class="centro">Quantidade</th><th>Nome</th><th>Santo</th><th class="direita">Preço unitário</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="resumo">
      <div>${pedido.pedido_itens.length} ${pedido.pedido_itens.length === 1 ? 'item' : 'itens'} · ${unidades} unidades</div>
      <div class="totais">
        ${
          desconto
            ? `Subtotal: ${escapar(formatarReais(Number(pedido.subtotal)))}<br />Desconto${
                pedido.cupom_codigo ? ` (${escapar(pedido.cupom_codigo)})` : ''
              }: − ${escapar(formatarReais(Number(pedido.desconto)))}<br />`
            : ''
        }
        <span class="total">Total: ${escapar(formatarReais(Number(pedido.total)))}</span>
      </div>
    </div>
  </div>
  <div class="rodape">Pedido #${escapar(pedido.numero)} · Raio de Luz Religiosos</div>
</body></html>`;
}
