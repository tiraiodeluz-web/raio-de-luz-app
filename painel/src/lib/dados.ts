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

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

// Cliente "online" = último acesso ao app há menos de 5 minutos (o app
// renova isso a cada 4 minutos enquanto está aberto). Só clientes, sem admin.
export function useClientesOnline() {
  return useQuery({
    queryKey: ['clientes-online'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, razao_social')
        .eq('tipo', 'cliente')
        .gte('ultimo_acesso', new Date(Date.now() - CINCO_MINUTOS_MS).toISOString());
      if (error) throw error;
      return data;
    },
  });
}

export const estaOnline = (ultimoAcesso: string | null) => !!ultimoAcesso && Date.now() - new Date(ultimoAcesso).getTime() < CINCO_MINUTOS_MS;
