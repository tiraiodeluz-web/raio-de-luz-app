import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useAvisar } from '../componentes/avisos';
import { Tabela } from '../componentes/tabela';
import { Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Entrada, Etiqueta, Kpi, Miniatura, Selecao, Vazio } from '../componentes/ui';
import { estaOnline } from '../lib/dados';
import { mensagemErro } from '../lib/erros';
import { cnpj, data, dataHora, hoje, lerNumero, linkWhatsApp, numero, reais, relativo, somarDias, telefone } from '../lib/formato';
import { COR_STATUS, ROTULO_STATUS, type StatusPedido } from '../lib/status';
import { supabase } from '../lib/supabase';
import { ModalAprovar } from './clientes';
import type { TablesUpdate } from '@/types/database';

export function PaginaCliente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const [aprovando, setAprovando] = useState(false);

  const consulta = useQuery({
    queryKey: ['cliente-painel', id],
    queryFn: async () => {
      const desde = somarDias(hoje(), -60);
      const [perfil, pedidos, enderecos, carrinho, vistos, ia] = await Promise.all([
        supabase.from('perfis').select('*').eq('id', id as string).single(),
        supabase.from('pedidos').select('id, numero, status, total, criado_em, pedido_itens ( count )').eq('cliente_id', id as string).order('criado_em', { ascending: false }),
        supabase.from('enderecos').select('*').eq('usuario_id', id as string).order('principal', { ascending: false }),
        supabase
          .from('carrinho_itens')
          .select('id, quantidade, atualizado_em, santos ( nome ), produtos ( id, nome, sku, imagem_principal, preco, preco_promocional )')
          .eq('usuario_id', id as string),
        supabase.from('produto_visualizacoes').select('vezes, dia, produtos ( id, nome, sku, imagem_principal )').eq('usuario_id', id as string).gte('dia', desde),
        supabase.from('assistente_uso').select('mensagens').eq('usuario_id', id as string),
      ]);
      if (perfil.error) throw perfil.error;
      for (const r of [pedidos, enderecos, carrinho, vistos, ia]) if (r.error) throw r.error;

      // Soma as visualizações por produto (a tabela guarda uma linha por dia).
      const porProduto = new Map<string, { produto: { id: string; nome: string; sku: string; imagem_principal: string | null }; vezes: number; ultimo: string }>();
      for (const v of (vistos.data ?? []) as unknown as { vezes: number; dia: string; produtos: { id: string; nome: string; sku: string; imagem_principal: string | null } | null }[]) {
        if (!v.produtos) continue;
        const atual = porProduto.get(v.produtos.id) ?? { produto: v.produtos, vezes: 0, ultimo: v.dia };
        atual.vezes += v.vezes;
        if (v.dia > atual.ultimo) atual.ultimo = v.dia;
        porProduto.set(v.produtos.id, atual);
      }

      return {
        perfil: perfil.data,
        pedidos: (pedidos.data ?? []) as unknown as { id: string; numero: number; status: StatusPedido; total: number; criado_em: string; pedido_itens: { count: number }[] }[],
        enderecos: enderecos.data ?? [],
        carrinho: (carrinho.data ?? []) as unknown as {
          id: string;
          quantidade: number;
          atualizado_em: string;
          santos: { nome: string } | null;
          produtos: { id: string; nome: string; sku: string; imagem_principal: string | null; preco: number; preco_promocional: number | null } | null;
        }[],
        vistos: [...porProduto.values()].sort((a, b) => b.vezes - a.vezes),
        mensagensIa: (ia.data ?? []).reduce((s, r) => s + r.mensagens, 0),
      };
    },
  });

  const [limite, setLimite] = useState('');
  const [versao, setVersao] = useState('2.0');
  useEffect(() => {
    if (!consulta.data) return;
    setLimite(consulta.data.perfil.limite_credito ? String(consulta.data.perfil.limite_credito).replace('.', ',') : '');
    setVersao(consulta.data.perfil.versao_app);
  }, [consulta.data]);

  async function salvar(campos: TablesUpdate<'perfis'>, texto: string) {
    const { error } = await supabase.from('perfis').update(campos).eq('id', id as string);
    if (error) {
      avisar(mensagemErro(error), 'erro');
      return;
    }
    avisar(texto, 'sucesso');
    queryClient.invalidateQueries({ queryKey: ['cliente-painel', id] });
    queryClient.invalidateQueries({ queryKey: ['clientes-painel'] });
    queryClient.invalidateQueries({ queryKey: ['contadores-menu'] });
  }

  if (consulta.isLoading) return <Carregando />;
  if (consulta.error || !consulta.data) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  const { perfil, pedidos, enderecos, carrinho, vistos, mensagensIa } = consulta.data;
  const validos = pedidos.filter((p) => p.status !== 'cancelado');
  const total = validos.reduce((s, p) => s + Number(p.total), 0);
  const valorCarrinho = carrinho.reduce((s, i) => s + i.quantidade * Number(i.produtos?.preco_promocional || i.produtos?.preco || 0), 0);
  const wa = linkWhatsApp(perfil.telefone);
  const limiteMudou = (lerNumero(limite) ?? null) !== (perfil.limite_credito === null ? null : Number(perfil.limite_credito));

  return (
    <>
      <CabecalhoPagina
        voltar={{ para: '/clientes', rotulo: 'Clientes' }}
        titulo={perfil.razao_social || perfil.nome}
        descricao={
          <>
            {perfil.razao_social ? `${perfil.nome} · ` : ''}CNPJ {cnpj(perfil.cnpj)}
            {perfil.codigo ? ` · código ${perfil.codigo}` : ''}
          </>
        }
        acoes={
          <>
            {!perfil.cadastro_aprovado ? (
              <Botao variante="dourado" onClick={() => setAprovando(true)}>
                Aprovar cadastro
              </Botao>
            ) : null}
            {wa ? (
              <a className="botao whatsapp" href={wa} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            ) : null}
          </>
        }
      />

      <div className="pilha g">
        <div className="grade grade-kpi">
          <Kpi destaque rotulo="Total comprado" valor={reais(total)} detalhe={`${validos.length} pedido(s)`} />
          <Kpi rotulo="Ticket médio" valor={reais(validos.length ? total / validos.length : 0)} />
          <Kpi rotulo="Última compra" valor={validos[0] ? relativo(validos[0].criado_em) : 'nunca'} detalhe={validos[0] ? data(validos[0].criado_em) : undefined} />
          <Kpi rotulo="Carrinho agora" valor={reais(valorCarrinho)} detalhe={`${carrinho.length} item(ns)`} />
          <Kpi rotulo="Último acesso ao app" valor={estaOnline(perfil.ultimo_acesso) ? 'Online agora' : relativo(perfil.ultimo_acesso)} detalhe={`${numero(mensagensIa)} mensagens ao assistente`} />
        </div>

        <div className="grade grade-lateral">
          <div className="pilha g">
            <Cartao titulo="Pedidos" semCorpo>
              <Tabela
                linhas={pedidos}
                chaveLinha={(p) => p.id}
                aoClicar={(p) => navegar(`/pedidos/${p.id}`)}
                vazio={<Vazio icone="🧾" titulo="Ainda não comprou" />}
                colunas={[
                  { chave: 'numero', titulo: 'Pedido', celula: (p) => <span className="forte">#{p.numero}</span>, ordenar: (p) => p.numero },
                  { chave: 'data', titulo: 'Data', celula: (p) => dataHora(p.criado_em), ordenar: (p) => p.criado_em },
                  { chave: 'itens', titulo: 'Itens', classe: 'num', celula: (p) => p.pedido_itens[0]?.count ?? 0 },
                  { chave: 'status', titulo: 'Situação', celula: (p) => <Etiqueta cor={COR_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</Etiqueta> },
                  { chave: 'total', titulo: 'Total', classe: 'num', celula: (p) => reais(p.total), ordenar: (p) => Number(p.total) },
                ]}
              />
            </Cartao>

            <Cartao titulo="No carrinho agora" semCorpo>
              <Tabela
                linhas={carrinho}
                chaveLinha={(i) => i.id}
                vazio={<Vazio icone="🛒" titulo="Carrinho vazio" />}
                colunas={[
                  {
                    chave: 'produto',
                    titulo: 'Produto',
                    celula: (i) => (
                      <div className="celula-produto">
                        <Miniatura url={i.produtos?.imagem_principal} />
                        <div>
                          <div className="nome">{i.produtos ? <Link to={`/produtos/${i.produtos.id}`}>{i.produtos.nome}</Link> : '—'}</div>
                          <div className="sub">
                            {i.produtos?.sku}
                            {i.santos ? ` · ${i.santos.nome}` : ''}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  { chave: 'qtd', titulo: 'Qtd.', classe: 'num', celula: (i) => i.quantidade },
                  { chave: 'quando', titulo: 'Adicionado', celula: (i) => relativo(i.atualizado_em) },
                ]}
              />
            </Cartao>

            <Cartao titulo="Produtos que mais abriu (últimos 60 dias)" semCorpo>
              <Tabela
                linhas={vistos}
                chaveLinha={(v) => v.produto.id}
                limite={15}
                vazio={<Vazio icone="👀" titulo="Sem visualizações registradas">O registro começa a valer na próxima atualização do app.</Vazio>}
                colunas={[
                  {
                    chave: 'produto',
                    titulo: 'Produto',
                    celula: (v) => (
                      <div className="celula-produto">
                        <Miniatura url={v.produto.imagem_principal} />
                        <div>
                          <div className="nome">
                            <Link to={`/produtos/${v.produto.id}`}>{v.produto.nome}</Link>
                          </div>
                          <div className="sub">{v.produto.sku}</div>
                        </div>
                      </div>
                    ),
                  },
                  { chave: 'vezes', titulo: 'Vezes', classe: 'num', celula: (v) => v.vezes },
                  { chave: 'ultimo', titulo: 'Última vez', celula: (v) => data(v.ultimo) },
                ]}
              />
            </Cartao>
          </div>

          <div className="pilha g">
            <Cartao titulo="Cadastro">
              <div className="pilha" style={{ gap: 6 }}>
                <div className="linha entre">
                  <span className="texto-2">Situação</span>
                  {perfil.cadastro_aprovado ? <Etiqueta tom="sucesso">Aprovado</Etiqueta> : <Etiqueta tom="aviso">Esperando aprovação</Etiqueta>}
                </div>
                <div className="linha entre">
                  <span className="texto-2">WhatsApp</span>
                  <span>{telefone(perfil.telefone)}</span>
                </div>
                <div className="linha entre">
                  <span className="texto-2">Cidade</span>
                  <span>{[perfil.cidade, perfil.uf].filter(Boolean).join('/') || '—'}</span>
                </div>
                <div className="linha entre">
                  <span className="texto-2">Cadastrado em</span>
                  <span>{data(perfil.criado_em)}</span>
                </div>
                {perfil.aprovado_em ? (
                  <div className="linha entre">
                    <span className="texto-2">Aprovado em</span>
                    <span>{data(perfil.aprovado_em)}</span>
                  </div>
                ) : null}
              </div>
            </Cartao>

            <Cartao titulo="Configurações">
              <div className="pilha">
                <Campo rotulo="Limite de crédito" ajuda="Vazio = sem limite.">
                  <Entrada prefixo="R$" value={limite} onChange={(e) => setLimite(e.target.value)} inputMode="decimal" />
                </Campo>
                {limiteMudou ? (
                  <Botao
                    variante="primario"
                    onClick={() => {
                      const v = limite.trim() ? lerNumero(limite) : null;
                      if (limite.trim() && (v === null || v < 0)) return avisar('Limite inválido', 'erro');
                      salvar({ limite_credito: v }, 'Limite salvo');
                    }}>
                    Salvar limite
                  </Botao>
                ) : null}
                <Campo rotulo="Versão do app" ajuda="A Clássica esconde o assistente, kits, compartilhar carrinho, repetir pedido e recomendados.">
                  <Selecao
                    value={versao}
                    onChange={(e) => {
                      setVersao(e.target.value);
                      salvar({ versao_app: e.target.value }, 'Versão alterada');
                    }}>
                    <option value="2.0">2.0 (completa)</option>
                    <option value="classica">Clássica</option>
                  </Selecao>
                </Campo>
                {perfil.cadastro_aprovado ? (
                  <Botao
                    variante="perigo"
                    pequeno
                    onClick={() => confirm('Bloquear este cliente? Ele continua vendo o app mas não consegue fazer pedidos.') && salvar({ cadastro_aprovado: false }, 'Cliente bloqueado')}>
                    Bloquear compras
                  </Botao>
                ) : null}
              </div>
            </Cartao>

            <Cartao titulo="Endereços">
              {enderecos.length === 0 ? (
                <span className="texto-3">Nenhum endereço cadastrado</span>
              ) : (
                <div className="pilha">
                  {enderecos.map((e) => (
                    <div key={e.id} className="pequeno">
                      {e.principal ? <Etiqueta tom="info">Principal</Etiqueta> : null}
                      <div>
                        {e.rua}, {e.numero}
                        {e.complemento ? ` · ${e.complemento}` : ''}
                      </div>
                      <div className="texto-2">
                        {e.bairro} · {e.cidade}/{e.estado} · CEP {e.cep}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Cartao>
          </div>
        </div>
      </div>
      {aprovando ? <ModalAprovar cliente={{ ...perfil }} aoFechar={() => setAprovando(false)} /> : null}
    </>
  );
}
