import { lerNumero } from './formato';

// Lê a planilha de produtos no formato usado hoje ("base de dados catálogo"):
//   ID | NAME | PRICE | PACKAGE SIZE | (código do santo) | GROUPING KEY |
//   DESCRIPTION | Apenas descrição | SIZE | COLOR | URL_PRODUCT | | Image 1...
// Cada linha é uma variação; o produto do app é o GROUPING KEY. Linhas com
// código de santo viram os santos do produto (com a foto daquela linha).

export type SantoPlanilha = { codigo: string; foto: string | null };

export type ProdutoPlanilha = {
  sku: string;
  nome: string;
  preco: number | null;
  embalagem: number;
  imagem: string | null;
  santos: SantoPlanilha[];
  outrasVariacoes: string[];
  linhas: number[];
  avisos: string[];
};

export type ResultadoLeitura = { produtos: ProdutoPlanilha[]; linhasLidas: number; linhasIgnoradas: number };

const normalizar = (t: unknown) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

const texto = (v: unknown) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

// "CH.009-8." -> "CH.009-8" (a planilha às vezes tem ponto sobrando no fim)
const limparCodigo = (v: unknown) => texto(v).replace(/\.+$/, '');

function moda<T>(valores: T[]): T | undefined {
  const contagem = new Map<T, number>();
  let melhor: T | undefined;
  let max = 0;
  for (const v of valores) {
    const n = (contagem.get(v) ?? 0) + 1;
    contagem.set(v, n);
    if (n > max) {
      max = n;
      melhor = v;
    }
  }
  return melhor;
}

export function lerPlanilhaProdutos(linhas: unknown[][]): ResultadoLeitura {
  const iCabecalho = linhas.slice(0, 15).findIndex((l) => {
    const nomes = l.map(normalizar);
    return nomes.includes('id') && nomes.includes('price') && nomes.includes('grouping key');
  });
  if (iCabecalho < 0) {
    throw new Error('Não achei o cabeçalho da planilha. A primeira aba precisa ter as colunas ID, NAME, PRICE, PACKAGE SIZE, GROUPING KEY e Image 1.');
  }
  const cab = linhas[iCabecalho].map(normalizar);
  const col = (nome: string) => cab.indexOf(nome);
  const c = {
    id: col('id'),
    nome: col('name'),
    preco: col('price'),
    embalagem: col('package size'),
    grupo: col('grouping key'),
    apenasDescricao: col('apenas descricao'),
    tamanho: col('size'),
    cor: col('color'),
    imagem: col('image 1'),
  };
  // A coluna do código do santo não tem título: fica entre PACKAGE SIZE e GROUPING KEY.
  let santo = -1;
  for (let i = c.embalagem + 1; i < c.grupo; i++) if (!cab[i]) santo = i;
  if (santo < 0 && c.embalagem >= 0) santo = c.embalagem + 1;

  const porSku = new Map<string, { p: ProdutoPlanilha; precos: number[]; embalagens: number[]; imagemDoProprio: string | null }>();
  let lidas = 0;
  let ignoradas = 0;

  linhas.slice(iCabecalho + 1).forEach((l, i) => {
    const numeroLinha = iCabecalho + i + 2;
    const id = limparCodigo(l[c.id]);
    const preco = lerNumero(l[c.preco]);
    // Linha de instrução ("Inserir código do produto") ou vazia.
    if (!id || (preco === null && !texto(l[c.preco]))) {
      if (id) ignoradas++;
      return;
    }
    if (preco === null && /inserir|pre[cç]o/i.test(texto(l[c.preco]))) {
      ignoradas++;
      return;
    }
    lidas++;
    const sku = limparCodigo(l[c.grupo]) || id;
    const nome = texto(c.apenasDescricao >= 0 ? l[c.apenasDescricao] : '') || texto(l[c.nome]);
    const imagem = c.imagem >= 0 ? texto(l[c.imagem]) || null : null;
    const embBruta = l[c.embalagem];
    const embalagem = typeof embBruta === 'number' ? Math.max(1, Math.round(embBruta)) : Math.max(1, Math.round(lerNumero(embBruta) ?? 1));
    const codigoSanto = santo >= 0 ? lerNumero(l[santo]) : null;

    let item = porSku.get(sku);
    if (!item) {
      item = {
        p: { sku, nome, preco: null, embalagem, imagem: null, santos: [], outrasVariacoes: [], linhas: [], avisos: [] },
        precos: [],
        embalagens: [],
        imagemDoProprio: null,
      };
      porSku.set(sku, item);
    }
    const { p } = item;
    p.linhas.push(numeroLinha);
    if (preco !== null) item.precos.push(preco);
    else p.avisos.push(`Linha ${numeroLinha}: preço "${texto(l[c.preco])}" não é um número.`);
    item.embalagens.push(embalagem);
    if (!p.nome && nome) p.nome = nome;
    if (id === sku && imagem) item.imagemDoProprio = imagem;
    if (!p.imagem && imagem) p.imagem = imagem;

    if (codigoSanto !== null && Number.isInteger(codigoSanto)) {
      const codigo = String(codigoSanto).padStart(2, '0');
      const existente = p.santos.find((s) => s.codigo === codigo);
      if (!existente) p.santos.push({ codigo, foto: imagem });
      else if (!existente.foto && imagem) existente.foto = imagem;
    } else if (id !== sku) {
      const variacao = texto(l[c.cor]) || texto(l[c.tamanho]) || texto(l[c.nome]) || id;
      p.outrasVariacoes.push(variacao);
    }
  });

  const produtos = [...porSku.values()].map(({ p, precos, embalagens, imagemDoProprio }) => {
    p.preco = moda(precos) ?? null;
    const distintos = [...new Set(precos)];
    if (distintos.length > 1) {
      p.avisos.push(`Variações com preços diferentes (${distintos.map((v) => v.toFixed(2).replace('.', ',')).join(' / ')}); usado ${p.preco?.toFixed(2).replace('.', ',')}.`);
    }
    p.embalagem = moda(embalagens) ?? 1;
    if (imagemDoProprio) p.imagem = imagemDoProprio;
    if (!p.nome) p.avisos.push('Sem nome.');
    if (p.preco === null) p.avisos.push('Sem preço válido: não vai ser importado.');
    if (p.outrasVariacoes.length) {
      p.avisos.push(`${p.outrasVariacoes.length} variação(ões) de cor/tamanho (${p.outrasVariacoes.slice(0, 3).join(', ')}${p.outrasVariacoes.length > 3 ? '…' : ''}) entram como um produto só.`);
    }
    return p;
  });

  return { produtos, linhasLidas: lidas, linhasIgnoradas: ignoradas };
}

// Sigla do SKU ("CH.032-1" -> "CH"), usada pra sugerir a categoria de produtos novos.
export const siglaSku = (sku: string) => sku.split(/[.\-/\s_]/)[0].toUpperCase();
