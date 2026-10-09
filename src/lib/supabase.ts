import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { Database } from '@/types/database';

// EXPO_PUBLIC_* ficam embutidas no bundle do app: são a URL do projeto e a
// chave publicável (anon), feitas para rodar no cliente. O acesso aos dados
// é controlado pelas políticas de RLS de cada tabela, não pelo sigilo desta chave.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY precisam estar definidas (veja .env.example).',
  );
}

// Na exportação estática da web (renderização no Node) não existe `window`,
// e o AsyncStorage da web depende dele — sem sessão persistida nesse caso.
const temJanela = typeof window !== 'undefined';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: temJanela ? AsyncStorage : undefined,
    autoRefreshToken: temJanela,
    persistSession: temJanela,
    detectSessionInUrl: false,
  },
});
