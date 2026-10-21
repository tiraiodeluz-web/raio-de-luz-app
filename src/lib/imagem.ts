// As fotos de produto e de santo vêm do Google Fotos
// (lh3.googleusercontent.com), que entrega a imagem no tamanho e formato
// pedidos na própria URL ("...=w1080-h1080-..."). O cadastro guarda ~1080px
// em PNG (~100 KB); aqui a URL pede só o tamanho que a tela usa, em WebP
// ("-rw"): card ~12 KB, miniatura ~6 KB (medido em 21/10/2026).
// Outros endereços (Supabase Storage, Bubble) passam sem mudança.
export type TamanhoImagem = 'miniatura' | 'card' | 'grande';

const LADO: Record<TamanhoImagem, number> = {
  miniatura: 240, // thumbs de 44–80px em listas, carrinho, pedido
  card: 480, // cards de produto (~160px de largura em tela 3x)
  grande: 1080, // foto principal do produto
};

const GOOGLE_FOTOS = /^https:\/\/lh\d\.googleusercontent\.com\//;

export function urlImagem(url: string | null | undefined, tamanho: TamanhoImagem): string | undefined {
  if (!url) return undefined;
  if (!GOOGLE_FOTOS.test(url)) return url;
  const [base, query] = url.split('?');
  const inicioParametros = base.indexOf('=');
  const id = inicioParametros >= 0 ? base.slice(0, inicioParametros) : base;
  const lado = LADO[tamanho];
  return `${id}=w${lado}-h${lado}-rw${query ? `?${query}` : ''}`;
}
