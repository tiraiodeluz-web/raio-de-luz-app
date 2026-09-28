import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';

export type Endereco = Tables<'enderecos'>;
export type DadosEndereco = Omit<TablesInsert<'enderecos'>, 'usuario_id' | 'principal'>;

// Regra 9: o endereço fica salvo e é sugerido nos próximos pedidos.
export function useEnderecoPrincipal() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['enderecos', 'principal', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enderecos')
        .select('*')
        .eq('usuario_id', session!.user.id)
        .order('principal', { ascending: false })
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Bug #7 corrigido: atualiza o endereço principal existente em vez de só
// gravar no primeiro pedido e ignorar alterações depois.
export function useSalvarEndereco() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string | null; dados: DadosEndereco }) => {
      if (!session) throw new Error('Não autenticado');
      if (id) {
        const { data, error } = await supabase.from('enderecos').update(dados).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('enderecos')
        .insert({ ...dados, usuario_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enderecos'] });
    },
  });
}
