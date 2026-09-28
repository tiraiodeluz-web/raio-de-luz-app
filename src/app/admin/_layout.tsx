import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';

// Trava de segurança: mesmo que alguém navegue direto para /admin/..., só
// quem é admin (perfis.tipo = 'admin') consegue ficar aqui — a RLS de cada
// tabela já bloqueia os dados, isto é só para não mostrar a tela vazia.
export default function AdminLayout() {
  const { perfil, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && perfil?.tipo !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [carregando, perfil, router]);

  if (carregando || perfil?.tipo !== 'admin') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
