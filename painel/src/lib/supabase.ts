import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// Mesma URL e chave publicável do app (feitas pra rodar no cliente). Quem
// protege os dados são as regras de RLS do banco: só admin lê/edita o que
// o painel mostra.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://zjkhlvomxhtafajbzbjb.supabase.co';
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4pSB9ulVgeDKtA5TYb4qmw_xMRcCf4R';

export const supabase = createClient<Database>(url, chave, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'raio-de-luz-painel' },
});
