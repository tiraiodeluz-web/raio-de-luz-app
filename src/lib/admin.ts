import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export type StatusFiltro = Enums<'status_pedido'> | 'todos';

export function useMetricasAdmin() {
  return useQuery({
    queryKey: ['admin', 'metricas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('metricas_admin');
      if (error) throw error;
      return data as {
        pedidos_total: number;
        pedidos_hoje: number;
        faturamento_total: number;
        faturamento_hoje: number;
        aguardando: number;
        em_separacao: number;
        enviados: number;
        cancelados: number;
        carrinhos_abandonados: number;
        cadastros_pendentes: number;
      };
    },
  });
}

export function usePedidosAdmin(filtro: { busca: string; status: StatusFiltro }) {
  return useQuery({
    queryKey: ['admin', 'pedidos', filtro],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select('id,numero,status,total,criado_em,cliente_snapshot')
        .order('criado_em', { ascending: false })
        .limit(100);
      if (filtro.status !== 'todos') query = query.eq('status', filtro.status);
      if (filtro.busca.trim()) query = query.eq('numero', Number(filtro.busca.trim()) || -1);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePedidoAdminDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'pedidos', 'detalhe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: pedido, error } = await supabase.from('pedidos').select('*').eq('id', id as string).single();
      if (error) throw error;
      const { data: itens, error: erroItens } = await supabase
        .from('pedido_itens')
        .select('*')
        .eq('pedido_id', pedido.id)
        .order('id', { ascending: true });
      if (erroItens) throw erroItens;
      return { pedido, itens: itens ?? [] };
    },
  });
}

const PROXIMO_STATUS: Record<Enums<'status_pedido'>, Enums<'status_pedido'> | null> = {
  aguardando_pagamento: 'pago',
  pago: 'em_separacao',
  em_separacao: 'em_producao',
  em_producao: 'enviado',
  enviado: 'entregue',
  entregue: null,
  cancelado: null,
};

export function proximoStatus(atual: Enums<'status_pedido'>) {
  return PROXIMO_STATUS[atual];
}

export function useAlterarStatusPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Enums<'status_pedido'> }) => {
      const { error } = await supabase.from('pedidos').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export type ClienteAdmin = {
  id: string;
  nome: string;
  razao_social: string | null;
  codigo: string | null;
  telefone: string | null;
  cadastro_aprovado: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
};

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

export function clienteOnline(ultimoAcesso: string | null) {
  if (!ultimoAcesso) return false;
  return Date.now() - new Date(ultimoAcesso).getTime() < CINCO_MINUTOS_MS;
}

// Regra 12: cliente é "online" se o último acesso foi há menos de 5 minutos.
export function useClientesAdmin(aba: 'aprovados' | 'aprovar', busca: string) {
  return useQuery({
    queryKey: ['admin', 'clientes', aba, busca],
    queryFn: async () => {
      let query = supabase
        .from('perfis')
        .select('id,nome,razao_social,codigo,telefone,cadastro_aprovado,ultimo_acesso,criado_em')
        .eq('tipo', 'cliente')
        .eq('cadastro_aprovado', aba === 'aprovados')
        .order(aba === 'aprovados' ? 'ultimo_acesso' : 'criado_em', { ascending: false });
      if (busca.trim()) query = query.ilike('codigo', `%${busca.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as ClienteAdmin[];
    },
  });
}

export function useTotaisClientes() {
  return useQuery({
    queryKey: ['admin', 'clientes', 'totais'],
    queryFn: async () => {
      const [{ count: total }, { data: online }] = await Promise.all([
        supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('tipo', 'cliente'),
        supabase
          .from('perfis')
          .select('id')
          .eq('tipo', 'cliente')
          .gte('ultimo_acesso', new Date(Date.now() - CINCO_MINUTOS_MS).toISOString()),
      ]);
      return { total: total ?? 0, online: online?.length ?? 0 };
    },
  });
}

export function useAprovarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clienteId: string) => {
      const { error } = await supabase.from('perfis').update({ cadastro_aprovado: true }).eq('id', clienteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clientes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
    },
  });
}

export function usePedidosDoCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'cliente', clienteId, 'pedidos'],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id,numero,status,total,criado_em')
        .eq('cliente_id', clienteId as string)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCarrinhosAbandonados() {
  return useQuery({
    queryKey: ['admin', 'carrinhos-abandonados'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('carrinhos_abandonados');
      if (error) throw error;
      return data;
    },
  });
}

export type ItemCarrinhoAdmin = {
  id: string;
  quantidade: number;
  produto: { id: string; nome: string; preco: number; preco_promocional: number | null; imagem_principal: string | null };
  santo: { id: string; nome: string } | null;
};

export function useCarrinhoDoCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'cliente', clienteId, 'carrinho'],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrinho_itens')
        .select(`id, quantidade, produtos ( id, nome, preco, preco_promocional, imagem_principal ), santos ( id, nome )`)
        .eq('usuario_id', clienteId as string)
        .order('criado_em', { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .map((linha) => {
          const produto = linha.produtos as ItemCarrinhoAdmin['produto'] | null;
          if (!produto) return null;
          return { id: linha.id, quantidade: linha.quantidade, produto, santo: linha.santos as ItemCarrinhoAdmin['santo'] };
        })
        .filter((item): item is ItemCarrinhoAdmin => item !== null);
    },
  });
}

export function useEnviarNotificacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      titulo,
      legenda,
      corpo,
      imagemUrl,
    }: {
      titulo: string;
      legenda: string;
      corpo: string;
      imagemUrl?: string | null;
    }) => {
      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase.from('notificacoes').insert({
        titulo,
        legenda: legenda || null,
        corpo,
        imagem_url: imagemUrl || null,
        destinatario_id: null,
        criado_por: sessao.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
}

const ROTULO_EVENTO_PUSH: Record<string, string> = {
  pedido_novo: 'Novo pedido recebido (admins)',
  pedido_status: 'Status do pedido alterado (cliente)',
  cadastro_novo: 'Novo cadastro aguardando aprovação (admins)',
  cadastro_aprovado: 'Cadastro aprovado (cliente)',
};

export function rotuloEventoPush(chave: string) {
  return ROTULO_EVENTO_PUSH[chave] ?? chave;
}

export function useEventosPush() {
  return useQuery({
    queryKey: ['admin', 'eventos-push'],
    queryFn: async () => {
      const { data, error } = await supabase.from('eventos_push').select('*').order('chave');
      if (error) throw error;
      return data;
    },
  });
}

export function useAlterarEventoPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chave, ativo }: { chave: string; ativo: boolean }) => {
      const { error } = await supabase.from('eventos_push').update({ ativo }).eq('chave', chave);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'eventos-push'] }),
  });
}
