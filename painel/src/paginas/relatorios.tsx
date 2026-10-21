import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { SeletorPeriodo } from '../componentes/seletor-periodo';
import { Tabela } from '../componentes/tabela';
import { Abas, Botao, CabecalhoPagina, Caixa, Campo, CaixaErro, Carregando, Cartao, Etiqueta, Kpi, Miniatura, Selecao, Vazio } from '../componentes/ui';
import { baixarCsv } from '../lib/csv';
import { data, diasEntre, hoje, linkWhatsApp, numero, porcentagem, reais, relativo, telefone } from '../lib/formato';
import { calcularPeriodo, type Periodo } from '../lib/periodo';
import { supabase } from '../lib/supabase';
import { useClientes, type ClienteLinha } from './clientes';

type Aba = 'vistos' | 'menos-vendidos' | 'interesse' | 'parados' | 'ticket';

type LinhaProdutoRel = {
  produto_id: string;
  sku: string;
  nome: string;
  imagem: string | null;
  categoria: string | null;
  ativo: boolean;
  preco: number;
  visualizacoes: number;
  visitantes: number;
  unidades: number;
  pedidos: number;
  faturamento: number;
  ultima_venda: string | null;
  criado_em: string;
};

function useRelatorioProdutos(periodo: Periodo, ativo: boolean) {
  return useQuery({
    queryKey: ['relatorio-produtos', periodo.inicio, periodo.fim],
    enabled: ativo,
    queryFn: async () => {
      const { data: linhas, error } = await supabase.rpc('relatorio_produtos', { p_inicio: periodo.inicio, p_fim: periodo.fim });
      if (error) throw error;
      return (linhas as unknown as LinhaProdutoRel[]).map((l) => ({
        ...l,
        visualizacoes: Number(l.visualizacoes),
        visitantes: Number(l.visitantes),
        unidades: Number(l.unidades),
        pedidos: Number(l.pedidos),
        faturamento: Number(l.faturamento),
      }));
    },
  });
}

const celulaProduto = (l: { produto_id: string; nome: string; sku: string; imagem: string | null; categoria?: string | null; ativo?: boolean }) => (
  <div className="celula-produto">
    <Miniatura url={l.imagem} />
    <div>
      <div className="nome">
        <Link to={`/produtos/${l.produto_id}`} onClick={(e) => e.stopPropagation()}>
          {l.nome}
        </Link>
      </div>
      <div className="sub">
        {l.sku}
        {l.categoria ? ` · ${l.categoria}` : ''}
        {l.ativo === false ? ' · desativado' : ''}
      </div>
    </div>
  </div>
);

export function PaginaRelatorios() {
  const [params, setParams] = useSearchParams();
  const aba = (params.get('aba') as Aba) || 'vistos';
  const [periodo, setPeriodo] = useState<Periodo>(calcularPeriodo('30d'));
  const usaPeriodo = aba === 'vistos' || aba === 'menos-vendidos' || aba === 'interesse';

  return (
    <>
      <CabecalhoPagina titulo="Relatórios" descricao="O que os clientes olham, o que vende pouco e quem parou de comprar. Tudo exporta pra planilha." />
      <Abas<Aba>
        ativa={aba}
        aoMudar={(a) => setParams({ aba: a }, { replace: true })}
        abas={[
          { chave: 'vistos', rotulo: '👀 Mais vistos' },
          { chave: 'menos-vendidos', rotulo: '📉 Menos vendidos' },
          { chave: 'interesse', rotulo: '🎯 Viu e não comprou' },
          { chave: 'parados', rotulo: '😴 Pararam de comprar' },
          { chave: 'ticket', rotulo: '💰 Ticket médio' },
        ]}
      />
      {usaPeriodo ? (
        <div className="filtros">
          <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
        </div>
      ) : null}
      {aba === 'vistos' ? <MaisVistos periodo={periodo} /> : null}
      {aba === 'menos-vendidos' ? <MenosVendidos periodo={periodo} /> : null}
      {aba === 'interesse' ? <Interesse periodo={periodo} /> : null}
      {aba === 'parados' ? <Parados /> : null}
      {aba === 'ticket' ? <Ticket /> : null}
    </>
  );
}

function AvisoVisualizacoes() {
  return (
    <p className="texto-3 pequeno" style={{ marginTop: 10 }}>
      As visualizações começaram a ser registradas em 21/10/2026, e só contam nos celulares com a atualização do app. Visitas de administradores não entram.
    </p>
  );
}

function MaisVistos({ periodo }: { periodo: Periodo }) {
  const consulta = useRelatorioProdutos(periodo, true);
  const linhas = useMemo(() => (consulta.data ?? []).filter((l) => l.visualizacoes > 0), [consulta.data]);
  const totalVistas = linhas.reduce((s, l) => s + l.visualizacoes, 0);

  if (consulta.isLoading) return <Carregando />;
  if (consulta.error) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  return (
    <>
      <div className="grade grade-kpi" style={{ marginBottom: 16 }}>
        <Kpi destaque rotulo="Produtos abertos" valor={numero(totalVistas)} detalhe="aberturas da tela de produto" />
        <Kpi rotulo="Produtos diferentes" valor={numero(linhas.length)} />
        <Kpi rotulo="Vistos e vendidos" valor={numero(linhas.filter((l) => l.unidades > 0).length)} detalhe="dos que foram abertos" />
      </div>
      <Cartao
        semCorpo
        titulo="Ranking de visualizações"
        acoes={
          <Botao
            pequeno
            onClick={() =>
              baixarCsv(
                'produtos-mais-vistos',
                [
                  { titulo: 'SKU', valor: (l) => l.sku },
                  { titulo: 'Produto', valor: (l) => l.nome },
                  { titulo: 'Visualizações', valor: (l) => l.visualizacoes },
                  { titulo: 'Clientes diferentes', valor: (l) => l.visitantes },
                  { titulo: 'Pedidos', valor: (l) => l.pedidos },
                  { titulo: 'Unidades vendidas', valor: (l) => l.unidades },
                  { titulo: 'Faturamento', valor: (l) => l.faturamento },
                ],
                [...linhas].sort((a, b) => b.visualizacoes - a.visualizacoes),
              )
            }>
            ⬇ CSV
          </Botao>
        }>
        <Tabela
          linhas={linhas}
          chaveLinha={(l) => l.produto_id}
          ordemInicial={{ chave: 'vistas', desc: true }}
          limite={200}
          vazio={<Vazio icone="👀" titulo="Nenhuma visualização no período" />}
          colunas={[
            { chave: 'produto', titulo: 'Produto', celula: celulaProduto, ordenar: (l) => l.nome },
            { chave: 'vistas', titulo: 'Visualizações', classe: 'num', celula: (l) => numero(l.visualizacoes), ordenar: (l) => l.visualizacoes },
            { chave: 'visitantes', titulo: 'Clientes', classe: 'num', celula: (l) => numero(l.visitantes), ordenar: (l) => l.visitantes },
            { chave: 'pedidos', titulo: 'Pedidos', classe: 'num', celula: (l) => numero(l.pedidos), ordenar: (l) => l.pedidos },
            {
              chave: 'conversao',
              titulo: 'Conversão',
              classe: 'num',
              celula: (l) => (l.visitantes ? porcentagem(Math.min(1, l.pedidos / l.visitantes), 0) : '—'),
              ordenar: (l) => (l.visitantes ? l.pedidos / l.visitantes : -1),
            },
            { chave: 'unidades', titulo: 'Unidades', classe: 'num', celula: (l) => numero(l.unidades), ordenar: (l) => l.unidades },
          ]}
        />
      </Cartao>
      <AvisoVisualizacoes />
    </>
  );
}

function MenosVendidos({ periodo }: { periodo: Periodo }) {
  const consulta = useRelatorioProdutos(periodo, true);
  const [ignorarNovos, setIgnorarNovos] = useState(true);
  const [soAtivos, setSoAtivos] = useState(true);
  const linhas = useMemo(
    () =>
      (consulta.data ?? []).filter((l) => (!soAtivos || l.ativo) && (!ignorarNovos || diasEntre(l.criado_em.slice(0, 10), hoje()) > 30)),
    [consulta.data, soAtivos, ignorarNovos],
  );
  const semVenda = linhas.filter((l) => l.unidades === 0).length;

  if (consulta.isLoading) return <Carregando />;
  if (consulta.error) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  return (
    <>
      <div className="grade grade-kpi" style={{ marginBottom: 16 }}>
        <Kpi destaque rotulo="Sem nenhuma venda no período" valor={numero(semVenda)} detalhe={`de ${numero(linhas.length)} produtos`} />
        <Kpi rotulo="Nunca venderam" valor={numero(linhas.filter((l) => !l.ultima_venda).length)} detalhe="desde que entraram no app" />
      </div>
      <div className="linha" style={{ marginBottom: 12, gap: 20 }}>
        <Caixa marcado={soAtivos} aoMudar={setSoAtivos} rotulo="Só produtos ativos" />
        <Caixa marcado={ignorarNovos} aoMudar={setIgnorarNovos} rotulo="Ignorar cadastrados há menos de 30 dias" />
      </div>
      <Cartao
        semCorpo
        titulo="Do que menos vendeu para o que mais vendeu"
        acoes={
          <Botao
            pequeno
            onClick={() =>
              baixarCsv(
                'produtos-menos-vendidos',
                [
                  { titulo: 'SKU', valor: (l) => l.sku },
                  { titulo: 'Produto', valor: (l) => l.nome },
                  { titulo: 'Categoria', valor: (l) => l.categoria },
                  { titulo: 'Preço', valor: (l) => Number(l.preco) },
                  { titulo: 'Unidades no período', valor: (l) => l.unidades },
                  { titulo: 'Visualizações', valor: (l) => l.visualizacoes },
                  { titulo: 'Última venda', valor: (l) => data(l.ultima_venda) },
                ],
                [...linhas].sort((a, b) => a.unidades - b.unidades || b.visualizacoes - a.visualizacoes),
              )
            }>
            ⬇ CSV
          </Botao>
        }>
        <Tabela
          linhas={linhas}
          chaveLinha={(l) => l.produto_id}
          ordemInicial={{ chave: 'unidades', desc: false }}
          limite={200}
          colunas={[
            { chave: 'produto', titulo: 'Produto', celula: celulaProduto, ordenar: (l) => l.nome },
            { chave: 'preco', titulo: 'Preço', classe: 'num', celula: (l) => reais(l.preco), ordenar: (l) => Number(l.preco) },
            { chave: 'unidades', titulo: 'Unidades', classe: 'num', celula: (l) => numero(l.unidades), ordenar: (l) => l.unidades * 1e6 - l.visualizacoes },
            { chave: 'vistas', titulo: 'Visualizações', classe: 'num', celula: (l) => numero(l.visualizacoes), ordenar: (l) => l.visualizacoes },
            {
              chave: 'ultima',
              titulo: 'Última venda',
              celula: (l) => (l.ultima_venda ? relativo(l.ultima_venda) : <Etiqueta tom="aviso">nunca</Etiqueta>),
              ordenar: (l) => l.ultima_venda ?? '',
            },
          ]}
        />
      </Cartao>
      <p className="texto-3 pequeno" style={{ marginTop: 10 }}>
        Dica: produto muito visto e pouco vendido costuma ter preço, foto ou embalagem mínima afastando o cliente.
      </p>
    </>
  );
}

type LinhaInteresse = {
  cliente_id: string;
  cliente: string;
  telefone: string | null;
  produto_id: string;
  sku: string;
  produto: string;
  imagem: string | null;
  vezes: number;
  ultima_vez: string;
};

function Interesse({ periodo }: { periodo: Periodo }) {
  const [minimo, setMinimo] = useState(2);
  const navegar = useNavigate();
  const consulta = useQuery({
    queryKey: ['relatorio-interesse', periodo.inicio, periodo.fim, minimo],
    queryFn: async () => {
      const { data: linhas, error } = await supabase.rpc('relatorio_interesse', { p_inicio: periodo.inicio, p_fim: periodo.fim, p_min_vezes: minimo });
      if (error) throw error;
      return linhas as unknown as LinhaInteresse[];
    },
  });

  return (
    <>
      <div className="filtros">
        <Campo rotulo="Abriu o produto pelo menos">
          <Selecao value={minimo} onChange={(e) => setMinimo(Number(e.target.value))}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'vez' : 'vezes'}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <Cartao
        semCorpo
        titulo={
          <div style={{ flex: 1 }}>
            <h2>Clientes interessados que ainda não compraram</h2>
            <p className="texto-2 pequeno">Bom pra mandar um WhatsApp oferecendo o produto.</p>
          </div>
        }
        acoes={
          <Botao
            pequeno
            onClick={() =>
              baixarCsv(
                'viu-e-nao-comprou',
                [
                  { titulo: 'Cliente', valor: (l) => l.cliente },
                  { titulo: 'WhatsApp', valor: (l) => telefone(l.telefone) },
                  { titulo: 'SKU', valor: (l) => l.sku },
                  { titulo: 'Produto', valor: (l) => l.produto },
                  { titulo: 'Vezes', valor: (l) => Number(l.vezes) },
                  { titulo: 'Última vez', valor: (l) => data(l.ultima_vez) },
                ],
                consulta.data ?? [],
              )
            }>
            ⬇ CSV
          </Botao>
        }>
        {consulta.isLoading ? (
          <Carregando />
        ) : consulta.error ? (
          <div className="cartao-corpo">
            <CaixaErro erro={consulta.error} />
          </div>
        ) : (
          <Tabela
            linhas={consulta.data ?? []}
            chaveLinha={(l) => `${l.cliente_id}-${l.produto_id}`}
            ordemInicial={{ chave: 'vezes', desc: true }}
            vazio={<Vazio icone="🎯" titulo="Ninguém nessa situação no período" />}
            colunas={[
              {
                chave: 'cliente',
                titulo: 'Cliente',
                ordenar: (l) => l.cliente,
                celula: (l) => (
                  <a href={`#/clientes/${l.cliente_id}`} onClick={(e) => { e.preventDefault(); navegar(`/clientes/${l.cliente_id}`); }} className="forte">
                    {l.cliente}
                  </a>
                ),
              },
              { chave: 'produto', titulo: 'Produto', celula: (l) => celulaProduto({ produto_id: l.produto_id, nome: l.produto, sku: l.sku, imagem: l.imagem }), ordenar: (l) => l.produto },
              { chave: 'vezes', titulo: 'Vezes', classe: 'num', celula: (l) => numero(l.vezes), ordenar: (l) => Number(l.vezes) },
              { chave: 'ultima', titulo: 'Última vez', celula: (l) => data(l.ultima_vez), ordenar: (l) => l.ultima_vez },
              {
                chave: 'wa',
                titulo: '',
                classe: 'estreito',
                celula: (l) => {
                  const wa = linkWhatsApp(l.telefone, `Olá! Aqui é da Raio de Luz. Vi que você se interessou pelo ${l.produto} (${l.sku}). Posso te ajudar com o pedido?`);
                  return wa ? (
                    <a className="botao whatsapp pequeno" href={wa} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null;
                },
              },
            ]}
          />
        )}
      </Cartao>
      <AvisoVisualizacoes />
    </>
  );
}

const diasSemComprar = (c: ClienteLinha) => (c.ultima_compra ? diasEntre(c.ultima_compra.slice(0, 10), hoje()) - 1 : null);

function Parados() {
  const consulta = useClientes();
  const [dias, setDias] = useState(45);
  const navegar = useNavigate();
  const linhas = useMemo(
    () => (consulta.data ?? []).filter((c) => c.aprovado && c.pedidos > 0 && (diasSemComprar(c) ?? 0) >= dias),
    [consulta.data, dias],
  );
  const valorEmRisco = linhas.reduce((s, c) => s + c.ticket_medio, 0);

  if (consulta.isLoading) return <Carregando />;
  if (consulta.error) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  return (
    <>
      <div className="filtros">
        <Campo rotulo="Sem comprar há pelo menos">
          <Selecao value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            {[15, 30, 45, 60, 90, 180, 365].map((n) => (
              <option key={n} value={n}>
                {n} dias
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <div className="grade grade-kpi" style={{ marginBottom: 16 }}>
        <Kpi destaque rotulo="Clientes parados" valor={numero(linhas.length)} detalhe={`já compraram e estão há ${dias}+ dias sem pedido`} />
        <Kpi rotulo="Um pedido de cada" valor={reais(valorEmRisco)} detalhe="soma dos tickets médios deles" />
      </div>
      <Cartao
        semCorpo
        titulo="Quem comprava e sumiu (os que mais compravam primeiro)"
        acoes={
          <Botao
            pequeno
            onClick={() =>
              baixarCsv(
                'clientes-parados',
                [
                  { titulo: 'Cliente', valor: (c) => c.razao_social || c.nome },
                  { titulo: 'WhatsApp', valor: (c) => telefone(c.telefone) },
                  { titulo: 'Cidade', valor: (c) => [c.cidade, c.uf].filter(Boolean).join('/') },
                  { titulo: 'Última compra', valor: (c) => data(c.ultima_compra) },
                  { titulo: 'Dias sem comprar', valor: (c) => diasSemComprar(c) },
                  { titulo: 'Pedidos', valor: (c) => c.pedidos },
                  { titulo: 'Total comprado', valor: (c) => c.total_gasto },
                  { titulo: 'Ticket médio', valor: (c) => c.ticket_medio },
                ],
                [...linhas].sort((a, b) => b.total_gasto - a.total_gasto),
              )
            }>
            ⬇ CSV
          </Botao>
        }>
        <Tabela
          linhas={linhas}
          chaveLinha={(c) => c.id}
          aoClicar={(c) => navegar(`/clientes/${c.id}`)}
          ordemInicial={{ chave: 'total', desc: true }}
          vazio={<Vazio icone="🎉" titulo="Nenhum cliente parado nesse prazo" />}
          colunas={[
            {
              chave: 'cliente',
              titulo: 'Cliente',
              ordenar: (c) => c.razao_social || c.nome,
              celula: (c) => (
                <div>
                  <div className="forte truncar">{c.razao_social || c.nome}</div>
                  <div className="texto-3 pequeno">{[c.cidade, c.uf].filter(Boolean).join('/')}</div>
                </div>
              ),
            },
            { chave: 'ultima', titulo: 'Última compra', ordenar: (c) => c.ultima_compra, celula: (c) => data(c.ultima_compra) },
            { chave: 'dias', titulo: 'Dias parado', classe: 'num', ordenar: (c) => diasSemComprar(c), celula: (c) => <strong>{diasSemComprar(c)}</strong> },
            { chave: 'pedidos', titulo: 'Pedidos', classe: 'num', ordenar: (c) => c.pedidos, celula: (c) => numero(c.pedidos) },
            { chave: 'total', titulo: 'Total comprado', classe: 'num', ordenar: (c) => c.total_gasto, celula: (c) => reais(c.total_gasto) },
            { chave: 'ticket', titulo: 'Ticket médio', classe: 'num', ordenar: (c) => c.ticket_medio, celula: (c) => reais(c.ticket_medio) },
            {
              chave: 'wa',
              titulo: '',
              classe: 'estreito',
              celula: (c) => {
                const wa = linkWhatsApp(c.telefone, `Olá! Aqui é da Raio de Luz. Faz um tempinho que não te vemos por aqui: temos novidades no app! Posso te ajudar com um pedido?`);
                return wa ? (
                  <a className="botao whatsapp pequeno" href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    WhatsApp
                  </a>
                ) : null;
              },
            },
          ]}
        />
      </Cartao>
    </>
  );
}

function Ticket() {
  const consulta = useClientes();
  const navegar = useNavigate();
  const compradores = useMemo(() => (consulta.data ?? []).filter((c) => c.pedidos > 0), [consulta.data]);
  const nuncaCompraram = useMemo(() => (consulta.data ?? []).filter((c) => c.aprovado && c.pedidos === 0), [consulta.data]);
  const pedidos = compradores.reduce((s, c) => s + c.pedidos, 0);
  const total = compradores.reduce((s, c) => s + c.total_gasto, 0);
  const tickets = compradores.map((c) => c.ticket_medio).sort((a, b) => a - b);
  const mediana = tickets.length ? (tickets[Math.floor((tickets.length - 1) / 2)] + tickets[Math.ceil((tickets.length - 1) / 2)]) / 2 : 0;

  if (consulta.isLoading) return <Carregando />;
  if (consulta.error) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  return (
    <div className="pilha g">
      <div className="grade grade-kpi">
        <Kpi destaque rotulo="Ticket médio geral" valor={reais(pedidos ? total / pedidos : 0)} detalhe={`${numero(pedidos)} pedidos de ${numero(compradores.length)} clientes`} />
        <Kpi rotulo="Ticket do cliente típico" valor={reais(mediana)} detalhe="mediana (metade compra mais, metade menos)" />
        <Kpi rotulo="Maior ticket médio" valor={reais(tickets.at(-1) ?? 0)} />
        <Kpi rotulo="Aprovados que nunca compraram" valor={numero(nuncaCompraram.length)} />
      </div>
      <Cartao
        semCorpo
        titulo="Ticket médio por cliente"
        acoes={
          <Botao
            pequeno
            onClick={() =>
              baixarCsv(
                'ticket-medio-por-cliente',
                [
                  { titulo: 'Cliente', valor: (c) => c.razao_social || c.nome },
                  { titulo: 'Cidade', valor: (c) => [c.cidade, c.uf].filter(Boolean).join('/') },
                  { titulo: 'Pedidos', valor: (c) => c.pedidos },
                  { titulo: 'Total comprado', valor: (c) => c.total_gasto },
                  { titulo: 'Ticket médio', valor: (c) => c.ticket_medio },
                  { titulo: 'Última compra', valor: (c) => data(c.ultima_compra) },
                ],
                [...compradores].sort((a, b) => b.ticket_medio - a.ticket_medio),
              )
            }>
            ⬇ CSV
          </Botao>
        }>
        <Tabela
          linhas={compradores}
          chaveLinha={(c) => c.id}
          aoClicar={(c) => navegar(`/clientes/${c.id}`)}
          ordemInicial={{ chave: 'ticket', desc: true }}
          vazio={<Vazio icone="💰" titulo="Ainda não há pedidos" />}
          colunas={[
            { chave: 'cliente', titulo: 'Cliente', ordenar: (c) => c.razao_social || c.nome, celula: (c) => <span className="forte">{c.razao_social || c.nome}</span> },
            { chave: 'cidade', titulo: 'Cidade', celula: (c) => [c.cidade, c.uf].filter(Boolean).join('/') || '—' },
            { chave: 'pedidos', titulo: 'Pedidos', classe: 'num', ordenar: (c) => c.pedidos, celula: (c) => numero(c.pedidos) },
            { chave: 'total', titulo: 'Total comprado', classe: 'num', ordenar: (c) => c.total_gasto, celula: (c) => reais(c.total_gasto) },
            { chave: 'ticket', titulo: 'Ticket médio', classe: 'num', ordenar: (c) => c.ticket_medio, celula: (c) => <strong>{reais(c.ticket_medio)}</strong> },
            { chave: 'ultima', titulo: 'Última compra', ordenar: (c) => c.ultima_compra, celula: (c) => relativo(c.ultima_compra) },
          ]}
        />
      </Cartao>
      {nuncaCompraram.length ? (
        <Cartao semCorpo titulo="Aprovados que ainda não fizeram o primeiro pedido">
          <Tabela
            linhas={nuncaCompraram}
            chaveLinha={(c) => c.id}
            aoClicar={(c) => navegar(`/clientes/${c.id}`)}
            ordemInicial={{ chave: 'cadastro', desc: true }}
            colunas={[
              { chave: 'cliente', titulo: 'Cliente', ordenar: (c) => c.razao_social || c.nome, celula: (c) => <span className="forte">{c.razao_social || c.nome}</span> },
              { chave: 'cadastro', titulo: 'Cadastro', ordenar: (c) => c.cadastrado_em, celula: (c) => data(c.cadastrado_em) },
              { chave: 'acesso', titulo: 'Último acesso', ordenar: (c) => c.ultimo_acesso, celula: (c) => relativo(c.ultimo_acesso) },
              {
                chave: 'wa',
                titulo: '',
                classe: 'estreito',
                celula: (c) => {
                  const wa = linkWhatsApp(c.telefone, 'Olá! Aqui é da Raio de Luz. Seu cadastro no app já está aprovado: quer ajuda pra fazer o primeiro pedido?');
                  return wa ? (
                    <a className="botao whatsapp pequeno" href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      WhatsApp
                    </a>
                  ) : null;
                },
              },
            ]}
          />
        </Cartao>
      ) : null}
    </div>
  );
}
