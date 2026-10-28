import { supabase } from './supabase';

export { urlImagem } from '@/lib/imagem';

export type PastaImagem = 'produtos' | 'santos-produto' | 'banners' | 'categorias' | 'catalogos' | 'santos' | 'kits' | 'notificacoes';

// Reduz a foto (lado maior até `ladoMax`) e converte pra WebP antes de
// subir: uma foto de celular de 4 MB vira ~150 KB, e o app carrega rápido.
export async function comprimirImagem(arquivo: File, ladoMax = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Navegador sem suporte a imagem');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.85));
  if (!blob) throw new Error('Não foi possível converter a imagem');
  return blob;
}

// Sobe pro bucket público "catalogo" (só admin escreve) e devolve a URL.
export async function enviarImagem(arquivo: File, pasta: PastaImagem, ladoMax = 1600): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
  const blob = await comprimirImagem(arquivo, ladoMax);
  const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage
    .from('catalogo')
    .upload(caminho, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return supabase.storage.from('catalogo').getPublicUrl(caminho).data.publicUrl;
}
