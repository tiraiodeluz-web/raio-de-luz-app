import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAvisar } from '../componentes/avisos';
import { SeletorPeriodo } from '../componentes/seletor-periodo';
import { Abas, Botao, CabecalhoPagina, CaixaErro, Carregando, Entrada, Etiqueta, Paginacao, Vazio } from '../componentes/ui';
import { buscarTodos } from '../lib/buscar-todos';
import { baixarCsv } from '../lib/csv';
import { mensagemErro } from '../lib/erros';
import { cnpj, dataHora, reais, telefone } from '../lib/formato';
import { calcularPeriodo, type Periodo } from '../lib/periodo';
import { COR_STATUS, ORDEM_STATUS, ROTULO_STATUS, type StatusPedido } from '../lib/status';
import { supabase } from '../lib/supabase';

const POR_PAGINA = 50;

type Snapshot = { nome?: string; razao_social?: string; cnpj?: string; telefone?: string; codigo?: string } | null;
type Endereco = { cidade?: string; estado?: string } | null;

type LinhaPedido = {
  id: string;
  numero: number;
  status: StatusPedido;
  total: number;
  desconto: number;
  cupom_codigo: string | null;
  criado_em: string;
  cliente_snapshot: Snapshot;
  endereco_entrega: Endereco;
  pedido_itens: { count: number }[];
};

function consultar(status: string, busca: string, periodo: Periodo | null, contar: boolean) {
  let q = supabase
    .from('pedidos')
    .select('id, numero, status, total, desconto, cupom_codigo, criado_em, cliente_snapshot, endereco_entrega, pedido_itens ( count )', contar ? { count: 'exact' } : undefined)
    .order('criado_em', { ascending: false });
  if (status !== 'todos') q = q.eq('status', status as StatusPedido);
  if (periodo) q = q.gte('criado_em', `${periodo.inicio}T00:00:00-03:00`).lte('criado_em', `${periodo.fim}T23:59:59.999-03:00`);
  const termo = busca.trim().replace(/^#/, '');
  if (/^\d+$/.test(termo)) q = q.eq('numero', Number(termo));
  else if (termo) {
    const t = termo.replace(/[%_,()]/g, '');
    q = q.or(`cliente_snapshot->>razao_social.ilike.%${t}%,cliente_snapshot->>nome.ilike.%${t}%,cliente_snapshot->>codigo.ilike.%${t}%`);
  }
  return q;
}

export function PaginaPedidos() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'todos';
  const pagina = Number(params.get('pagina') ?? 0);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [exportando, setExportando] = useState(false);
  const navegar = useNavigate();
  const avisar = useAvisar();

  const consulta = useQuery({
    queryKey: ['pedidos-painel', status, buscaAplicada, periodo, pagina],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await consultar(status, buscaAplicada, periodo, true).range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (error) throw error;
      return { linhas: data as unknown as LinhaPedido[], total: count ?? 0 };
    },
  });

  function mudarStatus(s: string) {
    const novo = new URLSearchParams(params);
    if (s === 'todos') novo.delete('status');
    else novo.set('status', s);
    novo.delete('pagina');
    setParams(novo, { replace: true });
  }

  async function exportar() {
    setExportando(true);
    try {
      const todos = (await buscarTodos((de, ate) => consultar(status, buscaAplicada, periodo, false).range(de, ate))) as unknown as LinhaPedido[];
      baixarCsv(
        'pedidos-raio-de-luz',
        [
          { titulo: 'Número', valor: (p) => p.numero },
          { titulo: 'Data', valor: (p) => dataHora(p.criado_em) },
          { titulo: 'Situação', valor: (p) => ROTULO_STATUS[p.status] },
          { titulo: 'Cliente', valor: (p) => p.cliente_snapshot?.razao_social || p.cliente_snapshot?.nome },
          { titulo: 'CNPJ', valor: (p) => cnpj(p.cliente_snapshot?.cnpj) },
          { titulo: 'Telefone', valor: (p) => telefone(p.cliente_snapshot?.telefone) },
          { titulo: 'Cidade', valor: (p) => [p.endereco_entrega?.cidade, p.endereco_entrega?.estado].filter(Boolean).join('/') },
          { titulo: 'Itens', valor: (p) => p.pedido_itens[0]?.count ?? 0 },
          { titulo: 'Cupom', valor: (p) => p.cupom_codigo },
          { titulo: 'Desconto', valor: (p) => Number(p.desconto) },
          { titulo: 'Total', valor: (p) => Number(p.total) },
        ],
        todos,
      );
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setExportando(false);
    }
  }

  const linhas = consulta.data?.linhas ?? [];

  return (
    <>
      <CabecalhoPagina
        titulo="Pedidos"
        descricao="Todos os pedidos feitos pelo app. Clique num pedido pra mudar a situação, imprimir ou falar com o cliente."
        acoes={
          <Botao onClick={exportar} carregando={exportando}>
            ⬇ Exportar CSV
          </Botao>
        }
      />
      <Abas<string>
        ativa={status}
        aoMudar={mudarStatus}
        abas={[{ chave: 'todos', rotulo: 'Todos' }, ...ORDEM_STATUS.map((s) => ({ chave: s, rotulo: ROTULO_STATUS[s] }))]}
      />
      <div className="filtros">
        <form
          className="campo busca"
          onSubmit={(e) => {
            e.preventDefault();
            setBuscaAplicada(busca);
          }}>
          <span>Buscar</span>
          <Entrada placeholder="Número do pedido, razão social ou código do cliente — Enter" value={busca} onChange={(e) => setBusca(e.target.value)} onBlur={() => setBuscaAplicada(busca)} />
        </form>
        {periodo ? (
          <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
        ) : (
          <Botao onClick={() => setPeriodo(calcularPeriodo('30d'))}>Filtrar por data</Botao>
        )}
        {periodo ? (
          <Botao variante="fantasma" onClick={() => setPeriodo(null)}>
            Qualquer data
          </Botao>
        ) : null}
      </div>
      <section className="cartao">
        {consulta.isLoading ? (
          <Carregando />
        ) : consulta.error ? (
          <div className="cartao-corpo">
            <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />
          </div>
        ) : linhas.length === 0 ? (
          <Vazio icone="🧾" titulo="Nenhum pedido encontrado" />
        ) : (
          <>
            <div className="tabela-caixa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Cidade</th>
                    <th className="num">Itens</th>
                    <th>Situação</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((p) => (
                    <tr key={p.id} className="clicavel" onClick={() => navegar(`/pedidos/${p.id}`)}>
                      <td>
                        <div className="forte">#{p.numero}</div>
                        <div className="texto-3 pequeno">{dataHora(p.criado_em)}</div>
                      </td>
                      <td>
                        <div className="truncar">{p.cliente_snapshot?.razao_social || p.cliente_snapshot?.nome || '—'}</div>
                        <div className="texto-3 pequeno">{p.cliente_snapshot?.codigo ? `Cód. ${p.cliente_snapshot.codigo}` : telefone(p.cliente_snapshot?.telefone)}</div>
                      </td>
                      <td>{[p.endereco_entrega?.cidade, p.endereco_entrega?.estado].filter(Boolean).join('/') || '—'}</td>
                      <td className="num">{p.pedido_itens[0]?.count ?? 0}</td>
                      <td>
                        <Etiqueta cor={COR_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</Etiqueta>
                      </td>
                      <td className="num">
                        <div className="forte">{reais(p.total)}</div>
                        {p.cupom_codigo ? <div className="texto-3 pequeno">cupom {p.cupom_codigo}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagina}
              porPagina={POR_PAGINA}
              total={consulta.data?.total ?? 0}
              aoMudar={(p) => {
                const novo = new URLSearchParams(params);
                novo.set('pagina', String(p));
                setParams(novo);
              }}
            />
          </>
        )}
      </section>
    </>
  );
}
