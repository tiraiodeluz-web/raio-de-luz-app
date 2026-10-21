import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { Database } from '@/types/database';

// EXPO_PUBLIC_* ficam embutidas no bundle do app: são a URL do projeto e a
// chave publicável (anon), feitas para rodar no cliente. O acesso aos dados
// é controlado pelas políticas de RLS de cada tabela, não pelo sigilo desta chave.
// Os valores padrão garantem que uma atualização OTA (EAS Update) publicada
// sem as variáveis nunca derrube o app.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zjkhlvomxhtafajbzbjb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4pSB9ulVgeDKtA5TYb4qmw_xMRcCf4R';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
