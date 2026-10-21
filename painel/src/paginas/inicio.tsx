import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { GraficoBarras, ListaBarras } from '../componentes/grafico';
import { SeletorPeriodo } from '../componentes/seletor-periodo';
import { CabecalhoPagina, CaixaErro, Carregando, Cartao, Etiqueta, Kpi, Vazio } from '../componentes/ui';
import { custoIaDolar, useCotacaoDolar } from '../lib/custo-ia';
import { dataHora, diaCurto, numero, reais } from '../lib/formato';
import { calcularPeriodo, type Periodo } from '../lib/periodo';
import { COR_STATUS, ORDEM_STATUS, ROTULO_STATUS, type StatusPedido } from '../lib/status';
import { supabase } from '../lib/supabase';

type Resumo = {
  pedidos: number;
  cancelados: number;
  faturamento: number;
  ticket_medio: number;
  clientes_compraram: number;
  unidades: number;
  novos_cadastros: number;
  cadastros_pendentes: number;
  clientes_aprovados: number;
  visualizacoes: number;
  ia_mensagens: number;
  ia_tokens_entrada: number;
  ia_tokens_saida: number;
  por_dia: { dia: string; pedidos: number; total: number }[];
  por_status: Partial<Record<StatusPedido, number>>;
  top_produtos: { produto_id: string | null; nome: string; sku: string; unidades: number; total: number }[];
  ultimos_pedidos: { id: string; numero: number; status: StatusPedido; total: number; criado_em: string; razao_social: string | null; nome: string | null }[];
};

export function PaginaInicio() {
  const [periodo, setPeriodo] = useState<Periodo>(calcularPeriodo('30d'));
  const [cotacao] = useCotacaoDolar();
  const navegar = useNavigate();

  const resumo = useQuery({
    queryKey: ['painel-resumo', periodo.inicio, periodo.fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('painel_resumo', { p_inicio: periodo.inicio, p_fim: periodo.fim });
      if (error) throw error;
      return data as unknown as Resumo;
    },
  });

  const r = resumo.data;
  const custoIa = r ? custoIaDolar(r.ia_tokens_entrada, r.ia_tokens_saida) : 0;

  return (
    <>
      <CabecalhoPagina
        titulo="Início"
        descricao="Resumo das vendas, clientes e uso do app no período."
        acoes={
          <div className="filtros" style={{ margin: 0 }}>
            <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
          </div>
        }
      />
      {resumo.isLoading ? (
        <Carregando />
      ) : resumo.error ? (
        <CaixaErro erro={resumo.error} tentarDeNovo={() => resumo.refetch()} />
      ) : r ? (
        <div className="pilha g">
          <div className="grade grade-kpi">
            <Kpi destaque rotulo="Faturamento" valor={reais(r.faturamento)} detalhe={`${numero(r.unidades)} unidades vendidas`} />
            <Kpi rotulo="Pedidos" valor={numero(r.pedidos)} detalhe={r.cancelados ? `${r.cancelados} cancelado(s) fora da conta` : 'sem cancelados'} para="/pedidos" />
            <Kpi rotulo="Ticket médio" valor={reais(r.ticket_medio)} detalhe="valor médio por pedido" />
            <Kpi rotulo="Clientes que compraram" valor={numero(r.clientes_compraram)} detalhe={`de ${numero(r.clientes_aprovados)} aprovados`} para="/relatorios?aba=parados" />
            <Kpi
              rotulo="Cadastros esperando"
              valor={numero(r.cadastros_pendentes)}
              detalhe={`${numero(r.novos_cadastros)} novo(s) no período`}
              para="/clientes?aba=pendentes"
            />
            <Kpi rotulo="Produtos vistos" valor={numero(r.visualizacoes)} detalhe="aberturas de produto no app" para="/relatorios" />
            <Kpi rotulo="Assistente IA" valor={reais(custoIa * cotacao)} detalhe={`${numero(r.ia_mensagens)} mensagens`} para="/custo-ia" />
          </div>

          <div className="grade grade-lateral">
            <Cartao titulo="Faturamento por dia">
              {r.pedidos === 0 ? (
                <Vazio icone="📉" titulo="Nenhum pedido no período" />
              ) : (
                <GraficoBarras
                  dados={r.por_dia.map((d) => ({
                    rotulo: diaCurto(d.dia),
                    valor: Number(d.total),
                    dica: `${reais(d.total)} · ${d.pedidos} pedido(s)`,
                  }))}
                />
              )}
            </Cartao>
            <Cartao titulo="Pedidos por situação">
              {Object.keys(r.por_status).length === 0 ? (
                <Vazio icone="🧾" titulo="Sem pedidos" />
              ) : (
                <div className="pilha">
                  {ORDEM_STATUS.filter((s) => r.por_status[s]).map((s) => (
                    <Link key={s} to={`/pedidos?status=${s}`} className="linha entre" style={{ color: 'inherit' }}>
                      <Etiqueta cor={COR_STATUS[s]}>{ROTULO_STATUS[s]}</Etiqueta>
                      <strong>{r.por_status[s]}</strong>
                    </Link>
                  ))}
                </div>
              )}
            </Cartao>
          </div>

          <div className="grade grade-2">
            <Cartao titulo="Mais vendidos no período" acoes={<Link to="/relatorios">Ver relatório →</Link>}>
              {r.top_produtos.length === 0 ? (
                <Vazio icone="📦" titulo="Nenhuma venda no período" />
              ) : (
                <ListaBarras
                  itens={r.top_produtos.map((p) => ({
                    chave: p.sku,
                    rotulo: (
                      <>
                        {p.nome} <span className="texto-3">· {p.sku}</span>
                      </>
                    ),
                    valor: Number(p.unidades),
                    texto: `${numero(p.unidades)} un. · ${reais(p.total)}`,
                  }))}
                />
              )}
            </Cartao>
            <Cartao titulo="Últimos pedidos" acoes={<Link to="/pedidos">Todos →</Link>} semCorpo>
              {r.ultimos_pedidos.length === 0 ? (
                <Vazio icone="🧾" titulo="Nenhum pedido ainda" />
              ) : (
                <div className="tabela-caixa">
                  <table className="tabela">
                    <tbody>
                      {r.ultimos_pedidos.map((p) => (
                        <tr key={p.id} className="clicavel" onClick={() => navegar(`/pedidos/${p.id}`)}>
                          <td className="forte">#{p.numero}</td>
                          <td>
                            <div className="truncar" style={{ maxWidth: 200 }}>
                              {p.razao_social || p.nome || '—'}
                            </div>
                            <div className="texto-3 pequeno">{dataHora(p.criado_em)}</div>
                          </td>
                          <td>
                            <Etiqueta cor={COR_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</Etiqueta>
                          </td>
                          <td className="num forte">{reais(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Cartao>
          </div>
        </div>
      ) : null}
    </>
  );
}
