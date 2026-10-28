import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useCatalogos, useCategorias } from '../lib/dados';
import { supabase } from '../lib/supabase';
import { Campo, Entrada, Selecao } from './ui';

export type TipoLinkInterno = 'nenhum' | 'catalogo' | 'categoria' | 'produto' | 'kit';

// Rota que o app abre ao tocar: "/catalogo/<id>", "/categoria/<id>", "/produto/<id>", "/kit/<id>".
export function montarRota(tipo: TipoLinkInterno, valor: string): string | null {
  return tipo === 'nenhum' || !valor ? null : `/${tipo}/${valor}`;
}

export function SeletorLink({ tipo, valor, aoMudar }: { tipo: TipoLinkInterno; valor: string; aoMudar: (tipo: TipoLinkInterno, valor: string) => void }) {
  const { data: categorias } = useCategorias();
  const { data: catalogos } = useCatalogos();
  const [busca, setBusca] = useState('');

  const kits = useQuery({
    queryKey: ['kits-opcoes'],
    enabled: tipo === 'kit',
    queryFn: async () => {
      const { data, error } = await supabase.from('kits').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const produtos = useQuery({
    queryKey: ['link-produto', busca, tipo === 'produto' ? valor : ''],
    enabled: tipo === 'produto',
    queryFn: async () => {
      let q = supabase.from('produtos').select('id, sku, nome').eq('ativo', true).order('nome').limit(20);
      if (busca.trim()) q = q.ilike('busca', `%${busca.trim().toLowerCase()}%`);
      else if (valor) q = q.eq('id', valor);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const opcoes = tipo === 'catalogo' ? catalogos : tipo === 'categoria' ? categorias : tipo === 'kit' ? kits.data : null;

  return (
    <div className="pilha" style={{ gap: 12 }}>
      <Campo rotulo="Ao tocar na notificação, abrir">
        <Selecao value={tipo} onChange={(e) => aoMudar(e.target.value as TipoLinkInterno, '')}>
          <option value="nenhum">Só o app (início)</option>
          <option value="catalogo">Um catálogo</option>
          <option value="categoria">Uma categoria</option>
          <option value="produto">Um produto</option>
          <option value="kit">Um kit</option>
        </Selecao>
      </Campo>
      {opcoes ? (
        <Campo rotulo={tipo === 'catalogo' ? 'Catálogo' : tipo === 'categoria' ? 'Categoria' : 'Kit'}>
          <Selecao value={valor} onChange={(e) => aoMudar(tipo, e.target.value)}>
            <option value="">Escolha...</option>
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      ) : null}
      {tipo === 'produto' ? (
        <div className="pilha" style={{ gap: 8 }}>
          <Campo rotulo="Buscar produto">
            <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou SKU" />
          </Campo>
          <div className="pilha" style={{ gap: 4, maxHeight: 200, overflowY: 'auto' }}>
            {produtos.data?.map((p) => (
              <label key={p.id} className="caixa" style={{ padding: '4px 0' }}>
                <input type="radio" name="produto-notificacao" checked={valor === p.id} onChange={() => aoMudar('produto', p.id)} />
                <span>
                  {p.nome} <span className="texto-3">· {p.sku}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
