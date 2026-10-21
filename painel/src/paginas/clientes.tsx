import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAvisar } from '../componentes/avisos';
import { Tabela } from '../componentes/tabela';
import { Abas, Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Entrada, Modal, Vazio } from '../componentes/ui';
import { baixarCsv } from '../lib/csv';
import { mensagemErro } from '../lib/erros';
import { cnpj, data, lerNumero, linkWhatsApp, numero, reais, relativo, telefone } from '../lib/formato';
import { supabase } from '../lib/supabase';

type Aba = 'pendentes' | 'aprovados' | 'todos';

export type ClienteLinha = {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  codigo: string | null;
  aprovado: boolean;
  cadastrado_em: string;
  ultimo_acesso: string | null;
  limite_credito: number | null;
  versao_app: string;
  pedidos: number;
  total_gasto: number;
  ticket_medio: number;
  ultima_compra: string | null;
};

// Junta o cadastro (perfis) com os números de compra (relatorio_clientes).
export function useClientes() {
  return useQuery({
    queryKey: ['clientes-painel'],
    queryFn: async () => {
      const [metricas, perfis] = await Promise.all([
        supabase.rpc('relatorio_clientes'),
        supabase.from('perfis').select('id, cnpj, limite_credito, versao_app').eq('tipo', 'cliente'),
      ]);
      if (metricas.error) throw metricas.error;
      if (perfis.error) throw perfis.error;
      const extra = new Map(perfis.data.map((p) => [p.id, p]));
      return metricas.data.map(
        (m): ClienteLinha => ({
          id: m.cliente_id,
          nome: m.nome,
          razao_social: m.razao_social,
          cnpj: extra.get(m.cliente_id)?.cnpj ?? null,
          telefone: m.telefone,
          cidade: m.cidade,
          uf: m.uf,
          codigo: m.codigo,
          aprovado: m.aprovado,
          cadastrado_em: m.cadastrado_em,
          ultimo_acesso: m.ultimo_acesso,
          limite_credito: extra.get(m.cliente_id)?.limite_credito ?? null,
          versao_app: extra.get(m.cliente_id)?.versao_app ?? '2.0',
          pedidos: Number(m.pedidos),
          total_gasto: Number(m.total_gasto),
          ticket_medio: Number(m.ticket_medio),
          ultima_compra: m.ultima_compra,
        }),
      );
    },
  });
}

export function PaginaClientes() {
  const [params, setParams] = useSearchParams();
  const aba = (params.get('aba') as Aba) || 'aprovados';
  const [busca, setBusca] = useState('');
  const [aprovando, setAprovando] = useState<ClienteLinha | null>(null);
  const consulta = useClientes();
  const navegar = useNavigate();

  const todos = consulta.data ?? [];
  const pendentes = todos.filter((c) => !c.aprovado);
  const aprovados = todos.filter((c) => c.aprovado);
  const termo = busca
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const linhas = useMemo(() => {
    const base = aba === 'pendentes' ? pendentes : aba === 'aprovados' ? aprovados : todos;
    if (!termo) return base;
    return base.filter((c) =>
      [c.nome, c.razao_social, c.cnpj, c.telefone, c.cidade, c.codigo]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .includes(termo),
    );
  }, [aba, pendentes, aprovados, todos, termo]);

  function exportar() {
    baixarCsv(
      'clientes-raio-de-luz',
      [
        { titulo: 'Código', valor: (c) => c.codigo },
        { titulo: 'Razão social', valor: (c) => c.razao_social },
        { titulo: 'Nome', valor: (c) => c.nome },
        { titulo: 'CNPJ', valor: (c) => cnpj(c.cnpj) },
        { titulo: 'WhatsApp', valor: (c) => telefone(c.telefone) },
        { titulo: 'Cidade', valor: (c) => c.cidade },
        { titulo: 'UF', valor: (c) => c.uf },
        { titulo: 'Aprovado', valor: (c) => c.aprovado },
        { titulo: 'Cadastro', valor: (c) => data(c.cadastrado_em) },
        { titulo: 'Último acesso', valor: (c) => data(c.ultimo_acesso) },
        { titulo: 'Pedidos', valor: (c) => c.pedidos },
        { titulo: 'Total comprado', valor: (c) => c.total_gasto },
        { titulo: 'Ticket médio', valor: (c) => c.ticket_medio },
        { titulo: 'Última compra', valor: (c) => data(c.ultima_compra) },
        { titulo: 'Limite de crédito', valor: (c) => c.limite_credito },
      ],
      linhas,
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Aprove cadastros novos, veja quanto cada loja compra e fale com ela pelo WhatsApp."
        acoes={<Botao onClick={exportar}>⬇ Exportar CSV</Botao>}
      />
      <Abas<Aba>
        ativa={aba}
        aoMudar={(a) => setParams({ aba: a }, { replace: true })}
        abas={[
          { chave: 'pendentes', rotulo: 'Esperando aprovação', contador: pendentes.length },
          { chave: 'aprovados', rotulo: 'Aprovados', contador: aprovados.length },
          { chave: 'todos', rotulo: 'Todos', contador: todos.length },
        ]}
      />
      <div className="filtros">
        <label className="campo busca">
          <span>Buscar</span>
          <Entrada placeholder="Razão social, nome, CNPJ, telefone, cidade ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      </div>
      <Cartao semCorpo>
        {consulta.isLoading ? (
          <Carregando />
        ) : consulta.error ? (
          <div className="cartao-corpo">
            <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />
          </div>
        ) : (
          <Tabela
            linhas={linhas}
            chaveLinha={(c) => c.id}
            aoClicar={(c) => navegar(`/clientes/${c.id}`)}
            ordemInicial={aba === 'pendentes' ? { chave: 'cadastro', desc: true } : { chave: 'total', desc: true }}
            vazio={<Vazio icone="👥" titulo={aba === 'pendentes' ? 'Nenhum cadastro esperando aprovação' : 'Nenhum cliente encontrado'} />}
            colunas={[
              {
                chave: 'cliente',
                titulo: 'Cliente',
                ordenar: (c) => c.razao_social || c.nome,
                celula: (c) => (
                  <div>
                    <div className="forte truncar">{c.razao_social || c.nome}</div>
                    <div className="texto-3 pequeno">
                      {c.razao_social ? c.nome : ''}
                      {c.codigo ? ` · cód. ${c.codigo}` : ''}
                    </div>
                  </div>
                ),
              },
              { chave: 'cnpj', titulo: 'CNPJ', celula: (c) => <span className="sem-quebra">{cnpj(c.cnpj)}</span> },
              { chave: 'cidade', titulo: 'Cidade', ordenar: (c) => c.cidade, celula: (c) => [c.cidade, c.uf].filter(Boolean).join('/') || '—' },
              { chave: 'cadastro', titulo: 'Cadastro', ordenar: (c) => c.cadastrado_em, celula: (c) => data(c.cadastrado_em) },
              { chave: 'acesso', titulo: 'Último acesso', ordenar: (c) => c.ultimo_acesso, celula: (c) => <span className="sem-quebra">{relativo(c.ultimo_acesso)}</span> },
              { chave: 'pedidos', titulo: 'Pedidos', classe: 'num', ordenar: (c) => c.pedidos, celula: (c) => numero(c.pedidos) },
              { chave: 'total', titulo: 'Total comprado', classe: 'num', ordenar: (c) => c.total_gasto, celula: (c) => reais(c.total_gasto) },
              {
                chave: 'acoes',
                titulo: '',
                classe: 'estreito',
                celula: (c) => {
                  const wa = linkWhatsApp(c.telefone);
                  return (
                    <div className="linha" style={{ flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      {!c.aprovado ? (
                        <Botao pequeno variante="dourado" onClick={() => setAprovando(c)}>
                          Aprovar
                        </Botao>
                      ) : null}
                      {wa ? (
                        <a className="botao whatsapp pequeno" href={wa} target="_blank" rel="noreferrer" title="Abrir WhatsApp">
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </Cartao>
      {aprovando ? <ModalAprovar cliente={aprovando} aoFechar={() => setAprovando(null)} /> : null}
    </>
  );
}

export function ModalAprovar({ cliente, aoFechar }: { cliente: Pick<ClienteLinha, 'id' | 'nome' | 'razao_social' | 'cnpj' | 'cidade' | 'uf'>; aoFechar: () => void }) {
  const [limite, setLimite] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const avisar = useAvisar();

  async function aprovar() {
    const valor = limite.trim() ? lerNumero(limite) : null;
    if (limite.trim() && (valor === null || valor < 0)) return setErro('Limite inválido.');
    setSalvando(true);
    const { error } = await supabase.from('perfis').update({ cadastro_aprovado: true, limite_credito: valor }).eq('id', cliente.id);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    queryClient.invalidateQueries({ queryKey: ['clientes-painel'] });
    queryClient.invalidateQueries({ queryKey: ['cliente-painel', cliente.id] });
    queryClient.invalidateQueries({ queryKey: ['contadores-menu'] });
    avisar('Cadastro aprovado: o cliente já pode comprar', 'sucesso');
    aoFechar();
  }

  return (
    <Modal
      titulo="Aprovar cadastro"
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" onClick={aprovar} carregando={salvando}>
            Aprovar
          </Botao>
        </>
      }>
      <div className="pilha" style={{ gap: 4 }}>
        <strong>{cliente.razao_social || cliente.nome}</strong>
        <span className="texto-2">
          CNPJ {cnpj(cliente.cnpj)} · {[cliente.cidade, cliente.uf].filter(Boolean).join('/')}
        </span>
      </div>
      <Campo rotulo="Limite de crédito (opcional)" ajuda="Deixe vazio pra não limitar.">
        <Entrada prefixo="R$" value={limite} onChange={(e) => setLimite(e.target.value)} inputMode="decimal" />
      </Campo>
      {erro ? <div className="caixa-erro">{erro}</div> : null}
    </Modal>
  );
}
