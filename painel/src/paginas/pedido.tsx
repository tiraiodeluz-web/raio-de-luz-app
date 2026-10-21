import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { montarHtmlPedido, type PedidoPdf } from '@/lib/pedido-pdf-html';

import { useAvisar } from '../componentes/avisos';
import { Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Entrada, Etiqueta, Miniatura, Selecao } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { cnpj, dataHora, linkWhatsApp, numero, reais, telefone } from '../lib/formato';
import { COR_STATUS, ORDEM_STATUS, ROTULO_STATUS, type StatusPedido } from '../lib/status';
import { supabase } from '../lib/supabase';

type Snapshot = { nome?: string; razao_social?: string; cnpj?: string; telefone?: string; codigo?: string } | null;
type Endereco = { cep?: string; rua?: string; numero?: string; complemento?: string | null; bairro?: string; cidade?: string; estado?: string } | null;

type Item = PedidoPdf['pedido_itens'][number] & { id: string; imagem_url: string | null; subtotal: number; produto_id: string | null };

type Pedido = Omit<PedidoPdf, 'cliente_snapshot' | 'pedido_itens'> & {
  status: StatusPedido;
  cliente_id: string | null;
  observacoes: string | null;
  codigo_rastreio: string | null;
  status_alterado_em: string;
  cliente_snapshot: Snapshot;
  endereco_entrega: Endereco;
  pedido_itens: Item[];
};

const PROXIMO: Partial<Record<StatusPedido, StatusPedido>> = {
  aguardando_pagamento: 'pago',
  pago: 'em_separacao',
  em_separacao: 'em_producao',
  em_producao: 'enviado',
  enviado: 'entregue',
};

export function PaginaPedido() {
  const { id } = useParams();
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  const consulta = useQuery({
    queryKey: ['pedido-painel', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(
          `id, numero, criado_em, status, status_alterado_em, subtotal, desconto, total, cupom_codigo, observacoes, codigo_rastreio,
           cliente_id, cliente_snapshot, endereco_entrega,
           pedido_itens ( id, produto_id, sku, produto_nome, santo_nome, quantidade, preco_unitario, subtotal, personalizacao, imagem_url,
             santos ( codigo ), produtos ( catalogos ( nome ) ) )`,
        )
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data as unknown as Pedido;
    },
  });

  const [status, setStatus] = useState<StatusPedido>('aguardando_pagamento');
  const [rastreio, setRastreio] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!consulta.data) return;
    setStatus(consulta.data.status);
    setRastreio(consulta.data.codigo_rastreio ?? '');
  }, [consulta.data]);

  async function salvar(campos: { status?: StatusPedido; codigo_rastreio?: string | null }, texto: string) {
    if (campos.status === 'cancelado' && !confirm('Cancelar este pedido? O cliente é avisado e ele sai do faturamento.')) return;
    setSalvando(true);
    const { error } = await supabase.from('pedidos').update(campos).eq('id', id as string);
    setSalvando(false);
    if (error) {
      avisar(mensagemErro(error), 'erro');
      return;
    }
    avisar(texto, 'sucesso');
    queryClient.invalidateQueries({ queryKey: ['pedido-painel', id] });
    queryClient.invalidateQueries({ queryKey: ['pedidos-painel'] });
    queryClient.invalidateQueries({ queryKey: ['contadores-menu'] });
  }

  // Mesmo layout do PDF que vai pro WhatsApp; o navegador oferece "Salvar como PDF".
  function imprimir() {
    if (!consulta.data) return;
    const janela = window.open('', '_blank');
    if (!janela) {
      avisar('O navegador bloqueou a janela. Permita pop-ups para este site.', 'erro');
      return;
    }
    janela.document.write(montarHtmlPedido(consulta.data as unknown as PedidoPdf));
    janela.document.title = `Pedido ${consulta.data.numero} - Raio de Luz`;
    janela.document.close();
    janela.onload = () => janela.print();
    setTimeout(() => janela.print(), 600);
  }

  if (consulta.isLoading) return <Carregando />;
  if (consulta.error || !consulta.data) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  const p = consulta.data;
  const cliente = p.cliente_snapshot;
  const e = p.endereco_entrega;
  const whatsapp = linkWhatsApp(cliente?.telefone, `Olá! Aqui é da Raio de Luz, sobre o seu pedido #${p.numero}.`);
  const proximo = PROXIMO[p.status];
  const unidades = p.pedido_itens.reduce((s, i) => s + i.quantidade, 0);

  return (
    <>
      <CabecalhoPagina
        voltar={{ para: '/pedidos', rotulo: 'Pedidos' }}
        titulo={
          <span className="linha">
            Pedido #{p.numero} <Etiqueta cor={COR_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</Etiqueta>
          </span>
        }
        descricao={`Feito em ${dataHora(p.criado_em)} · situação atualizada ${dataHora(p.status_alterado_em)}`}
        acoes={
          <>
            {whatsapp ? (
              <a className="botao whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
                WhatsApp do cliente
              </a>
            ) : null}
            <Botao onClick={imprimir}>🖨️ Imprimir / PDF</Botao>
          </>
        }
      />

      <div className="grade grade-lateral">
        <div className="pilha g">
          <Cartao titulo={`Itens (${p.pedido_itens.length} · ${numero(unidades)} unidades)`} semCorpo>
            <div className="tabela-caixa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="num">Qtd.</th>
                    <th className="num">Unitário</th>
                    <th className="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {p.pedido_itens.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="celula-produto">
                          <Miniatura url={i.imagem_url} />
                          <div>
                            <div className="nome">{i.produto_id ? <Link to={`/produtos/${i.produto_id}`}>{i.produto_nome}</Link> : i.produto_nome}</div>
                            <div className="sub">
                              {i.sku}
                              {i.santo_nome ? ` · ${i.santos?.codigo ?? ''} ${i.santo_nome}` : ''}
                            </div>
                            {i.personalizacao ? <div className="pequeno" style={{ color: 'var(--aviso)' }}>Personalização: {i.personalizacao}</div> : null}
                          </div>
                        </div>
                      </td>
                      <td className="num">{i.quantidade}</td>
                      <td className="num">{reais(i.preco_unitario)}</td>
                      <td className="num forte">{reais(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cartao-corpo pilha" style={{ gap: 6, borderTop: '1px solid var(--borda)', maxWidth: 340, marginLeft: 'auto' }}>
              <div className="linha entre">
                <span className="texto-2">Subtotal</span>
                <span>{reais(p.subtotal)}</span>
              </div>
              {Number(p.desconto) > 0 ? (
                <div className="linha entre">
                  <span className="texto-2">Desconto {p.cupom_codigo ? `(cupom ${p.cupom_codigo})` : ''}</span>
                  <span style={{ color: 'var(--sucesso)' }}>− {reais(p.desconto)}</span>
                </div>
              ) : null}
              <div className="linha entre" style={{ fontSize: 17 }}>
                <strong>Total</strong>
                <strong>{reais(p.total)}</strong>
              </div>
            </div>
          </Cartao>
          {p.observacoes ? (
            <Cartao titulo="Observações do cliente">
              <p style={{ whiteSpace: 'pre-wrap' }}>{p.observacoes}</p>
            </Cartao>
          ) : null}
        </div>

        <div className="pilha g">
          <Cartao titulo="Situação">
            <div className="pilha">
              {proximo ? (
                <Botao variante="dourado" carregando={salvando} onClick={() => salvar({ status: proximo }, `Pedido marcado como ${ROTULO_STATUS[proximo]}`)}>
                  Avançar para “{ROTULO_STATUS[proximo]}”
                </Botao>
              ) : null}
              <Campo rotulo="Ou escolha a situação">
                <Selecao value={status} onChange={(ev) => setStatus(ev.target.value as StatusPedido)}>
                  {ORDEM_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_STATUS[s]}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              {status !== p.status ? (
                <Botao variante={status === 'cancelado' ? 'perigo' : 'primario'} carregando={salvando} onClick={() => salvar({ status }, 'Situação atualizada')}>
                  Salvar situação
                </Botao>
              ) : null}
              <p className="texto-3 pequeno">O cliente recebe notificação no celular quando a situação muda (se as notificações dele estiverem ligadas).</p>
              <div className="separador" />
              <Campo rotulo="Código de rastreio">
                <Entrada value={rastreio} onChange={(ev) => setRastreio(ev.target.value)} placeholder="Ex.: AA123456789BR" />
              </Campo>
              {rastreio !== (p.codigo_rastreio ?? '') ? (
                <Botao carregando={salvando} onClick={() => salvar({ codigo_rastreio: rastreio.trim() || null }, 'Rastreio salvo')}>
                  Salvar rastreio
                </Botao>
              ) : null}
            </div>
          </Cartao>

          <Cartao titulo="Cliente" acoes={p.cliente_id ? <Link to={`/clientes/${p.cliente_id}`}>Ver cadastro →</Link> : null}>
            <div className="pilha" style={{ gap: 6 }}>
              <strong>{cliente?.razao_social || cliente?.nome || '—'}</strong>
              {cliente?.razao_social && cliente.nome ? <span className="texto-2">{cliente.nome}</span> : null}
              <span className="texto-2">CNPJ {cnpj(cliente?.cnpj)}</span>
              <span className="texto-2">WhatsApp {telefone(cliente?.telefone)}</span>
              {cliente?.codigo ? <span className="texto-2">Código {cliente.codigo}</span> : null}
            </div>
          </Cartao>

          <Cartao titulo="Entrega">
            {e ? (
              <div className="pilha" style={{ gap: 4 }}>
                <span>
                  {e.rua}, {e.numero}
                  {e.complemento ? ` · ${e.complemento}` : ''}
                </span>
                <span>{e.bairro}</span>
                <span>
                  {e.cidade}/{e.estado} · CEP {e.cep}
                </span>
              </div>
            ) : (
              <span className="texto-3">Sem endereço</span>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
