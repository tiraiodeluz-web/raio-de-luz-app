import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Tabela } from '../componentes/tabela';
import { CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Etiqueta, Kpi, Selecao, Vazio } from '../componentes/ui';
import { baixarCsv } from '../lib/csv';
import { estaOnline } from '../lib/dados';
import { linkWhatsApp, numero, reais, relativo, telefone } from '../lib/formato';
import { supabase } from '../lib/supabase';

type Linha = {
  usuario_id: string;
  codigo: string | null;
  nome: string;
  razao_social: string | null;
  telefone: string | null;
  ultimo_acesso: string | null;
  ultimo_produto_carrinho: string | null;
  itens: number;
  valor: number;
  whatsapp_enviado: boolean;
};

// Quanto tempo o carrinho precisa estar parado pra aparecer na lista.
const FILTROS = [
  { valor: '0', rotulo: 'Todos os carrinhos', horas: 0 },
  { valor: '1', rotulo: 'Parados há mais de 1 hora', horas: 1 },
  { valor: '24', rotulo: 'Parados há mais de 1 dia', horas: 24 },
  { valor: '72', rotulo: 'Parados há mais de 3 dias', horas: 72 },
  { valor: '168', rotulo: 'Parados há mais de 7 dias', horas: 168 },
];

export function PaginaCarrinhos() {
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState('0');

  const consulta = useQuery({
    queryKey: ['carrinhos-abandonados-painel'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('carrinhos_abandonados');
      if (error) throw error;
      return (data ?? []).map(
        (c): Linha => ({
          usuario_id: c.usuario_id,
          codigo: c.codigo,
          nome: c.nome,
          razao_social: c.razao_social,
          telefone: c.telefone,
          ultimo_acesso: c.ultimo_acesso,
          ultimo_produto_carrinho: c.ultimo_produto_carrinho,
          itens: Number(c.itens),
          valor: Number(c.valor ?? 0),
          whatsapp_enviado: c.whatsapp_enviado,
        }),
      );
    },
  });

  const todas = consulta.data ?? [];
  const horas = FILTROS.find((f) => f.valor === filtro)?.horas ?? 0;
  const linhas = useMemo(() => {
    if (!horas) return todas;
    const corte = Date.now() - horas * 3_600_000;
    return todas.filter((c) => c.ultimo_produto_carrinho && new Date(c.ultimo_produto_carrinho).getTime() < corte);
  }, [todas, horas]);
  const valorTotal = linhas.reduce((s, c) => s + c.valor, 0);

  function mensagem(c: Linha) {
    const primeiro = c.nome.split(' ')[0];
    return `Oi, ${primeiro}! Aqui é da Raio de Luz Religiosos. Vi que você deixou ${c.itens} item(ns) no carrinho do app (${reais(c.valor)}). Posso te ajudar a finalizar o pedido?`;
  }

  function exportar() {
    baixarCsv(
      'carrinhos-abandonados',
      [
        { titulo: 'Código', valor: (c) => c.codigo },
        { titulo: 'Razão social', valor: (c) => c.razao_social },
        { titulo: 'Nome', valor: (c) => c.nome },
        { titulo: 'WhatsApp', valor: (c) => telefone(c.telefone) },
        { titulo: 'Itens', valor: (c) => c.itens },
        { titulo: 'Valor', valor: (c) => c.valor },
        { titulo: 'Último item adicionado', valor: (c) => c.ultimo_produto_carrinho },
        { titulo: 'Último acesso', valor: (c) => c.ultimo_acesso },
      ],
      linhas,
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Carrinhos abandonados"
        descricao="Clientes que colocaram produtos no carrinho e ainda não fecharam o pedido. Chame pelo WhatsApp com a mensagem já pronta."
        acoes={
          <button className="botao secundario" onClick={exportar} disabled={linhas.length === 0}>
            ⬇ Exportar CSV
          </button>
        }
      />
      <div className="grade grade-kpi" style={{ marginBottom: 16 }}>
        <Kpi destaque rotulo="Carrinhos na lista" valor={numero(linhas.length)} detalhe={filtro === '0' ? 'todos' : FILTROS.find((f) => f.valor === filtro)?.rotulo} />
        <Kpi rotulo="Valor parado" valor={reais(valorTotal)} detalhe="somando todos os carrinhos da lista" />
      </div>
      <div className="filtros">
        <Campo rotulo="Mostrar">
          <Selecao value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTROS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
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
            chaveLinha={(c) => c.usuario_id}
            aoClicar={(c) => navegar(`/clientes/${c.usuario_id}`)}
            ordemInicial={{ chave: 'valor', desc: true }}
            vazio={<Vazio icone="🛒" titulo="Nenhum carrinho abandonado" />}
            colunas={[
              {
                chave: 'cliente',
                titulo: 'Cliente',
                ordenar: (c) => c.razao_social || c.nome,
                celula: (c) => (
                  <div>
                    <div className="forte truncar">
                      {estaOnline(c.ultimo_acesso) ? <span className="ponto-online" title="Online agora" /> : null}
                      {c.razao_social || c.nome}
                    </div>
                    <div className="texto-3 pequeno">
                      {c.razao_social ? c.nome : ''}
                      {c.codigo ? ` · cód. ${c.codigo}` : ''}
                    </div>
                  </div>
                ),
              },
              { chave: 'itens', titulo: 'Itens', classe: 'num', ordenar: (c) => c.itens, celula: (c) => numero(c.itens) },
              { chave: 'valor', titulo: 'Valor', classe: 'num', ordenar: (c) => c.valor, celula: (c) => reais(c.valor) },
              {
                chave: 'parado',
                titulo: 'Último item',
                ordenar: (c) => c.ultimo_produto_carrinho,
                celula: (c) => <span className="sem-quebra">{relativo(c.ultimo_produto_carrinho)}</span>,
              },
              {
                chave: 'acesso',
                titulo: 'Último acesso',
                ordenar: (c) => c.ultimo_acesso,
                celula: (c) => <span className="sem-quebra">{estaOnline(c.ultimo_acesso) ? <strong style={{ color: 'var(--sucesso)' }}>online agora</strong> : relativo(c.ultimo_acesso)}</span>,
              },
              {
                chave: 'aviso',
                titulo: 'Lembrete do app',
                celula: (c) => (c.whatsapp_enviado ? <Etiqueta tom="info">Enviado</Etiqueta> : <span className="texto-3">—</span>),
              },
              {
                chave: 'acoes',
                titulo: '',
                classe: 'estreito',
                celula: (c) => {
                  const wa = linkWhatsApp(c.telefone, mensagem(c));
                  return wa ? (
                    <a className="botao whatsapp pequeno" href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      WhatsApp
                    </a>
                  ) : (
                    <span className="texto-3 pequeno">sem telefone</span>
                  );
                },
              },
            ]}
          />
        )}
      </Cartao>
    </>
  );
}
