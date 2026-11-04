import { supabase } from '@/lib/supabase';

// Foto de cada santo dentro de um produto. Mesma regra da tela do produto:
// a foto da variação (produto_santos.foto_url) vale primeiro; sem ela, a foto
// cadastrada no próprio santo. Chave: `${produtoId}|${santoId}`.
export async function buscarFotosDosSantos(pares: { produtoId: string; santoId: string | null }[]): Promise<Map<string, string>> {
  const fotos = new Map<string, string>();
  const comSanto = pares.filter((p): p is { produtoId: string; santoId: string } => !!p.santoId);
  if (comSanto.length === 0) return fotos;

  const produtoIds = [...new Set(comSanto.map((p) => p.produtoId))];
  const { data, error } = await supabase
    .from('produto_santos')
    .select('produto_id, santo_id, foto_url, santos ( foto_url )')
    .in('produto_id', produtoIds);
  if (error) throw error;

  for (const v of data ?? []) {
    const generica = (v.santos as { foto_url: string | null } | null)?.foto_url;
    const foto = v.foto_url ?? generica;
    if (foto) fotos.set(`${v.produto_id}|${v.santo_id}`, foto);
  }
  return fotos;
}
