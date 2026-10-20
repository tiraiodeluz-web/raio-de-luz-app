import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type VersaoApp = 'classica' | '2.0';

// "Clássica" esconde os recursos novos (assistente de IA, kits, compartilhar
// carrinho/produto, pedir de novo e recomendados) pra mostrar o antes/depois.
// Sem login ou perfil ainda carregando, vale a 2.0 (padrão do banco).
export function useRecursos20(): boolean {
  const { perfil } = useAuth();
  return perfil?.versao_app !== 'classica';
}

// Só admin consegue gravar (trigger tg_perfis_protege_campos no banco).
export function useDefinirVersaoApp() {
  const queryClient = useQueryClient();
  const { session, atualizarPerfil } = useAuth();

  return useMutation({
    mutationFn: async ({ usuarioId, versao }: { usuarioId: string; versao: VersaoApp }) => {
      const { error } = await supabase.from('perfis').update({ versao_app: versao }).eq('id', usuarioId);
      if (error) throw error;
    },
    onSuccess: async (_resultado, { usuarioId }) => {
      if (usuarioId === session?.user.id) await atualizarPerfil();
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}
