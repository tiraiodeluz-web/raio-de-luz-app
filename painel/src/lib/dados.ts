import { useQuery } from '@tanstack/react-query';

import { supabase } from './supabase';

// Listas pequenas usadas em vários formulários (filtros, selects).
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('ordem').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useCatalogos() {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalogos').select('*').order('ordem').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useSantos() {
  return useQuery({
    queryKey: ['santos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('santos').select('*').order('ordem').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

// Números do menu lateral: cadastros esperando aprovação e pedidos novos.
export function useContadoresMenu() {
  return useQuery({
    queryKey: ['contadores-menu'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [clientes, pedidos] = await Promise.all([
        supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('tipo', 'cliente').eq('cadastro_aprovado', false),
        supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'aguardando_pagamento'),
      ]);
      return { clientesPendentes: clientes.count ?? 0, pedidosNovos: pedidos.count ?? 0 };
    },
  });
}
