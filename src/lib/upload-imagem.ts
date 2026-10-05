import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

// Sobe uma imagem local (uri do expo-image-picker) pro bucket "catalogo"
// (já é público e só admin escreve nele — ver supabase/migrations/..._storage.sql)
// e devolve a URL pública. Usado hoje só pela notificação com imagem.
export async function enviarImagemParaStorage(uri: string, mimeType: string | undefined, pasta: string): Promise<string> {
  const extensao = mimeType?.split('/')[1] ?? 'jpg';
  const caminho = `${pasta}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extensao}`;

  const bytes = await new File(uri).bytes();
  const { error } = await supabase.storage.from('catalogo').upload(caminho, bytes, {
    contentType: mimeType ?? 'image/jpeg',
  });
  if (error) throw error;

  const { data } = supabase.storage.from('catalogo').getPublicUrl(caminho);
  return data.publicUrl;
}
