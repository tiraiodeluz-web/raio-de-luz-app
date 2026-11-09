import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { Campo, Entrada, Selecao } from './ui';

// Quem recebe a notificação. O servidor (admin_contar_publico /
// admin_enviar_notificacao) resolve o público; aqui só se monta o filtro.
export type TipoPublico = 'todos' | 'sem_uso' | 'sem_compra' | 'nunca_comprou' | 'carrinho_abandonado' | 'cliente' | 'regiao' | 'novos' | 'com_desconto';

export type Publico = { tipo: TipoPublico; dias?: number; horas?: number; cliente_id?: string; uf?: string; cidade?: string };

export const ROTULOS_PUBLICO: Record<TipoPublico, string> = {
  todos: 'Todos os clientes',
  sem_uso: 'Sem abrir o app há X dias',
  sem_compra: 'Sem comprar há X dias (já compraram antes)',
  nunca_comprou: 'Aprovados que nunca fizeram pedido',
  carrinho_abandonado: 'Carrinho abandonado',
  cliente: 'Um cliente específico',
  regiao: 'Uma região (estado e/ou cidade)',
  novos: 'Clientes novos (aprovados há poucos dias)',
  com_desconto: 'Com desconto de fidelidade acumulado',
};

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export function SeletorPublico({ publico, aoMudar }: { publico: Publico; aoMudar: (p: Publico) => void }) {
  const [busca, setBusca] = useState('');
  const precisaDias = ['sem_uso', 'sem_compra', 'novos'].includes(publico.tipo);

  const clientes = useQuery({
    queryKey: ['publico-cliente', busca],
    enabled: publico.tipo === 'cliente' && busca.trim().length >= 2,
    queryFn: async () => {
      const t = busca.trim().replace(/[%,()]/g, ' ');
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, razao_social, cidade, uf')
        .eq('tipo', 'cliente')
        .or(`nome.ilike.%${t}%,razao_social.ilike.%${t}%`)
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const cidades = useQuery({
    queryKey: ['publico-cidades', publico.uf],
    enabled: publico.tipo === 'regiao',
    queryFn: async () => {
      let q = supabase.from('perfis').select('cidade, uf').eq('tipo', 'cliente').eq('cadastro_aprovado', true).not('cidade', 'is', null);
      if (publico.uf) q = q.eq('uf', publico.uf);
      const { data, error } = await q.limit(2000);
      if (error) throw error;
      return [...new Set((data ?? []).map((c) => c.cidade as string))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  });

  useEffect(() => {
    if (publico.tipo !== 'cliente') setBusca('');
  }, [publico.tipo]);

  return (
    <div className="pilha" style={{ gap: 12 }}>
      <Campo rotulo="Quem vai receber">
        <Selecao
          value={publico.tipo}
          onChange={(e) => {
            const tipo = e.target.value as TipoPublico;
            aoMudar({ tipo, dias: ['sem_uso', 'sem_compra'].includes(tipo) ? 30 : tipo === 'novos' ? 30 : undefined, horas: tipo === 'carrinho_abandonado' ? 24 : undefined });
          }}>
          {(Object.keys(ROTULOS_PUBLICO) as TipoPublico[]).map((t) => (
            <option key={t} value={t}>
              {ROTULOS_PUBLICO[t]}
            </option>
          ))}
        </Selecao>
      </Campo>

      {precisaDias ? (
        <Campo rotulo={publico.tipo === 'novos' ? 'Aprovados nos últimos' : 'Quantos dias'}>
          <Selecao value={publico.dias ?? 30} onChange={(e) => aoMudar({ ...publico, dias: Number(e.target.value) })}>
            {[7, 15, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {publico.tipo === 'novos' ? `${d} dias` : `${d} dias ou mais`}
              </option>
            ))}
          </Selecao>
        </Campo>
      ) : null}

      {publico.tipo === 'carrinho_abandonado' ? (
        <Campo rotulo="Carrinho parado há pelo menos" ajuda="Clientes com produtos no carrinho que não finalizaram o pedido.">
          <Selecao value={publico.horas ?? 24} onChange={(e) => aoMudar({ ...publico, horas: Number(e.target.value) })}>
            {[1, 3, 6, 24, 72].map((h) => (
              <option key={h} value={h}>
                {h < 24 ? `${h} hora(s)` : `${h / 24} dia(s)`}
              </option>
            ))}
          </Selecao>
        </Campo>
      ) : null}

      {publico.tipo === 'regiao' ? (
        <div className="form-grade">
          <Campo rotulo="Estado">
            <Selecao value={publico.uf ?? ''} onChange={(e) => aoMudar({ ...publico, uf: e.target.value || undefined, cidade: undefined })}>
              <option value="">Todos</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Cidade (opcional)">
            <Selecao value={publico.cidade ?? ''} onChange={(e) => aoMudar({ ...publico, cidade: e.target.value || undefined })}>
              <option value="">Todas</option>
              {cidades.data?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Selecao>
          </Campo>
        </div>
      ) : null}

      {publico.tipo === 'cliente' ? (
        <div className="pilha" style={{ gap: 6 }}>
          <Campo rotulo="Buscar cliente">
            <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou razão social" />
          </Campo>
          {clientes.data?.map((c) => (
            <label key={c.id} className="caixa" style={{ padding: '4px 0' }}>
              <input type="radio" name="publico-cliente" checked={publico.cliente_id === c.id} onChange={() => aoMudar({ ...publico, cliente_id: c.id })} />
              <span>
                {c.razao_social || c.nome} <span className="texto-3">· {[c.cidade, c.uf].filter(Boolean).join(' / ')}</span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Quantos clientes o filtro atinge (e alguns nomes), antes de enviar.
export function usePrevia(publico: Publico) {
  const pronto = publico.tipo !== 'cliente' ? (publico.tipo !== 'regiao' || !!publico.uf || !!publico.cidade) : !!publico.cliente_id;
  return useQuery({
    queryKey: ['publico-previa', publico],
    enabled: pronto,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_contar_publico', { p_publico: publico });
      if (error) throw error;
      return data as unknown as { total: number; amostra: string[] };
    },
  });
}
