import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { useAvisar } from '../componentes/avisos';
import { Botao, CabecalhoPagina, Caixa, Campo, CaixaErro, Carregando, Entrada, Etiqueta, Interruptor, Miniatura, Modal, Paginacao, Selecao, Vazio } from '../componentes/ui';
import { buscarTodos } from '../lib/buscar-todos';
import { baixarCsv } from '../lib/csv';
import { useCatalogos, useCategorias } from '../lib/dados';
import { mensagemErro } from '../lib/erros';
import { numero, reais } from '../lib/formato';
import { supabase } from '../lib/supabase';
import type { TablesUpdate } from '@/types/database';

const POR_PAGINA = 50;

type Filtros = {
  busca: string;
  categoria: string;
  catalogo: string;
  status: 'todos' | 'ativos' | 'inativos';
  extra: '' | 'sem-foto' | 'promocao' | 'destaque' | 'sem-categoria' | 'escolhe-santo';
  ordem: 'nome' | 'sku' | 'preco' | 'vendas' | 'recentes';
};

const COLUNAS = 'id, sku, nome, preco, preco_promocional, embalagem, vendas, ativo, destaque, personalizavel, imagem_principal, estoque, categorias ( nome ), catalogos ( nome )';

export type LinhaProduto = {
  id: string;
  sku: string;
  nome: string;
  preco: number;
  preco_promocional: number | null;
  embalagem: number;
  vendas: number;
  ativo: boolean;
  destaque: boolean;
  personalizavel: boolean;
  imagem_principal: string | null;
  estoque: number | null;
  categorias: { nome: string } | null;
  catalogos: { nome: string } | null;
};

function lerFiltros(params: URLSearchParams): Filtros {
  return {
    busca: params.get('busca') ?? '',
    categoria: params.get('categoria') ?? '',
    catalogo: params.get('catalogo') ?? '',
    status: (params.get('status') as Filtros['status']) || 'todos',
    extra: (params.get('extra') as Filtros['extra']) || '',
    ordem: (params.get('ordem') as Filtros['ordem']) || 'nome',
  };
}

// Mesma consulta pra tela (uma página) e pra exportação (tudo).
function consultar(f: Filtros, contar: boolean) {
  let q = supabase.from('produtos').select(COLUNAS, contar ? { count: 'exact' } : undefined);
  for (const palavra of f.busca.toLowerCase().split(/\s+/).filter(Boolean)) {
    q = q.ilike('busca', `%${palavra.replace(/[%_,()]/g, '')}%`);
  }
  if (f.categoria === 'sem') q = q.is('categoria_id', null);
  else if (f.categoria) q = q.eq('categoria_id', f.categoria);
  if (f.catalogo === 'sem') q = q.is('catalogo_id', null);
  else if (f.catalogo) q = q.eq('catalogo_id', f.catalogo);
  if (f.status === 'ativos') q = q.eq('ativo', true);
  if (f.status === 'inativos') q = q.eq('ativo', false);
  if (f.extra === 'sem-foto') q = q.is('imagem_principal', null);
  if (f.extra === 'promocao') q = q.gt('preco_promocional', 0);
  if (f.extra === 'destaque') q = q.eq('destaque', true);
  if (f.extra === 'sem-categoria') q = q.is('categoria_id', null);
  if (f.extra === 'escolhe-santo') q = q.eq('personalizavel', true);
  switch (f.ordem) {
    case 'sku':
      return q.order('sku');
    case 'preco':
      return q.order('preco_efetivo', { ascending: false }).order('nome');
    case 'vendas':
      return q.order('vendas', { ascending: false }).order('nome');
    case 'recentes':
      return q.order('criado_em', { ascending: false });
    default:
      return q.order('nome').order('sku');
  }
}

export function PaginaProdutos() {
  const [params, setParams] = useSearchParams();
  const filtros = lerFiltros(params);
  const pagina = Number(params.get('pagina') ?? 0);
  const [buscaDigitada, setBuscaDigitada] = useState(filtros.busca);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [acaoAberta, setAcaoAberta] = useState<null | 'categoria' | 'catalogo' | 'preco'>(null);
  const [exportando, setExportando] = useState(false);
  const navegar = useNavigate();
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const { data: categorias } = useCategorias();
  const { data: catalogos } = useCatalogos();

  function mudarFiltro(mudancas: Partial<Filtros>) {
    const novo = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) novo.set(k, String(v));
      else novo.delete(k);
    }
    novo.delete('pagina');
    setParams(novo, { replace: true });
  }

  const consulta = useQuery({
    queryKey: ['produtos', filtros, pagina],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await consultar(filtros, true).range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (error) throw error;
      return { linhas: data as unknown as LinhaProduto[], total: count ?? 0 };
    },
  });

  const atualizar = useMutation({
    mutationFn: async ({ ids, campos }: { ids: string[]; campos: TablesUpdate<'produtos'> }) => {
      const { error } = await supabase.from('produtos').update(campos).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produtos'] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  const linhas = consulta.data?.linhas ?? [];
  const idsPagina = linhas.map((l) => l.id);
  const todosDaPagina = idsPagina.length > 0 && idsPagina.every((id) => selecionados.has(id));
  const algunsDaPagina = idsPagina.some((id) => selecionados.has(id));

  function alternar(id: string, marcar: boolean) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (marcar) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  async function emMassa(campos: TablesUpdate<'produtos'>, texto: string) {
    await atualizar.mutateAsync({ ids: [...selecionados], campos });
    avisar(`${selecionados.size} produto(s): ${texto}`, 'sucesso');
  }

  async function exportar() {
    setExportando(true);
    try {
      const todos = (await buscarTodos((de, ate) => consultar(filtros, false).range(de, ate))) as unknown as LinhaProduto[];
      baixarCsv(
        'produtos-raio-de-luz',
        [
          { titulo: 'SKU', valor: (p) => p.sku },
          { titulo: 'Nome', valor: (p) => p.nome },
          { titulo: 'Categoria', valor: (p) => p.categorias?.nome },
          { titulo: 'Catálogo', valor: (p) => p.catalogos?.nome },
          { titulo: 'Preço', valor: (p) => Number(p.preco) },
          { titulo: 'Preço promocional', valor: (p) => (p.preco_promocional ? Number(p.preco_promocional) : null) },
          { titulo: 'Embalagem', valor: (p) => p.embalagem },
          { titulo: 'Estoque', valor: (p) => p.estoque },
          { titulo: 'Vendas', valor: (p) => p.vendas },
          { titulo: 'Ativo', valor: (p) => p.ativo },
          { titulo: 'Destaque', valor: (p) => p.destaque },
          { titulo: 'Escolhe santo', valor: (p) => p.personalizavel },
          { titulo: 'Foto', valor: (p) => p.imagem_principal },
        ],
        todos,
      );
      avisar(`${todos.length} produtos exportados`, 'sucesso');
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Produtos"
        descricao="Cadastre, edite preços e fotos, ative ou desative produtos do app."
        acoes={
          <>
            <Botao onClick={exportar} carregando={exportando}>
              ⬇ Exportar CSV
            </Botao>
            <Link to="/importar" className="botao secundario">
              📥 Importar planilha
            </Link>
            <Botao variante="primario" onClick={() => navegar('/produtos/novo')}>
              + Novo produto
            </Botao>
          </>
        }
      />

      <div className="filtros">
        <form
          className="campo busca"
          onSubmit={(e) => {
            e.preventDefault();
            mudarFiltro({ busca: buscaDigitada.trim() });
          }}>
          <span>Buscar</span>
          <Entrada
            placeholder="Nome, SKU ou referência — Enter pra buscar"
            value={buscaDigitada}
            onChange={(e) => setBuscaDigitada(e.target.value)}
            onBlur={() => buscaDigitada.trim() !== filtros.busca && mudarFiltro({ busca: buscaDigitada.trim() })}
          />
        </form>
        <Campo rotulo="Categoria">
          <Selecao value={filtros.categoria} onChange={(e) => mudarFiltro({ categoria: e.target.value })}>
            <option value="">Todas</option>
            <option value="sem">Sem categoria</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Catálogo">
          <Selecao value={filtros.catalogo} onChange={(e) => mudarFiltro({ catalogo: e.target.value })}>
            <option value="">Todos</option>
            <option value="sem">Sem catálogo</option>
            {catalogos?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Situação">
          <Selecao value={filtros.status} onChange={(e) => mudarFiltro({ status: e.target.value as Filtros['status'] })}>
            <option value="todos">Todos</option>
            <option value="ativos">Ativos (aparecem no app)</option>
            <option value="inativos">Desativados</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Mostrar só">
          <Selecao value={filtros.extra} onChange={(e) => mudarFiltro({ extra: e.target.value as Filtros['extra'] })}>
            <option value="">—</option>
            <option value="sem-foto">Sem foto</option>
            <option value="promocao">Em promoção</option>
            <option value="destaque">Em destaque</option>
            <option value="escolhe-santo">Cliente escolhe santo</option>
            <option value="sem-categoria">Sem categoria</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Ordenar por">
          <Selecao value={filtros.ordem} onChange={(e) => mudarFiltro({ ordem: e.target.value as Filtros['ordem'] })}>
            <option value="nome">Nome</option>
            <option value="sku">SKU</option>
            <option value="preco">Maior preço</option>
            <option value="vendas">Mais vendidos</option>
            <option value="recentes">Cadastrados por último</option>
          </Selecao>
        </Campo>
      </div>

      {selecionados.size > 0 ? (
        <div className="barra-selecao">
          <strong>{selecionados.size} selecionado(s)</strong>
          <span style={{ flex: 1 }} />
          <Botao pequeno onClick={() => emMassa({ ativo: true }, 'ativados')}>Ativar</Botao>
          <Botao pequeno onClick={() => emMassa({ ativo: false }, 'desativados')}>Desativar</Botao>
          <Botao pequeno onClick={() => emMassa({ destaque: true }, 'em destaque')}>★ Destacar</Botao>
          <Botao pequeno onClick={() => emMassa({ destaque: false }, 'sem destaque')}>Tirar destaque</Botao>
          <Botao pequeno onClick={() => setAcaoAberta('categoria')}>Mudar categoria</Botao>
          <Botao pequeno onClick={() => setAcaoAberta('catalogo')}>Mudar catálogo</Botao>
          <Botao pequeno onClick={() => setAcaoAberta('preco')}>Reajustar preço</Botao>
          <Botao pequeno onClick={() => emMassa({ preco_promocional: null }, 'promoção removida')}>Tirar promoção</Botao>
          <Botao pequeno variante="fantasma" onClick={() => setSelecionados(new Set())} style={{ color: '#fff' }}>
            Limpar
          </Botao>
        </div>
      ) : null}

      <section className="cartao">
        {consulta.isLoading ? (
          <Carregando />
        ) : consulta.error ? (
          <div className="cartao-corpo">
            <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />
          </div>
        ) : linhas.length === 0 ? (
          <Vazio icone="🔎" titulo="Nenhum produto encontrado">
            Mude os filtros ou cadastre um produto novo.
          </Vazio>
        ) : (
          <>
            <div className="tabela-caixa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th className="estreito">
                      <Caixa
                        marcado={todosDaPagina}
                        indeterminado={algunsDaPagina}
                        aoMudar={(v) => setSelecionados((s) => {
                          const n = new Set(s);
                          idsPagina.forEach((id) => (v ? n.add(id) : n.delete(id)));
                          return n;
                        })}
                      />
                    </th>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th className="num">Preço</th>
                    <th className="num">Embalagem</th>
                    <th className="num">Vendas</th>
                    <th className="centro">Destaque</th>
                    <th className="centro">No app</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((p) => (
                    <tr key={p.id} className={`clicavel ${selecionados.has(p.id) ? 'selecionada' : ''}`} onClick={() => navegar(`/produtos/${p.id}`)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Caixa marcado={selecionados.has(p.id)} aoMudar={(v) => alternar(p.id, v)} />
                      </td>
                      <td>
                        <div className="celula-produto">
                          <Miniatura url={p.imagem_principal} />
                          <div>
                            <div className="nome">{p.nome}</div>
                            <div className="sub">
                              {p.sku}
                              {p.personalizavel ? ' · escolhe santo' : ''}
                              {p.catalogos ? ` · ${p.catalogos.nome}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{p.categorias?.nome ?? <span className="fraco">—</span>}</td>
                      <td className="num">
                        {p.preco_promocional && p.preco_promocional > 0 ? (
                          <>
                            <div className="diff-antigo pequeno">{reais(p.preco)}</div>
                            <div className="forte" style={{ color: 'var(--sucesso)' }}>
                              {reais(p.preco_promocional)}
                            </div>
                          </>
                        ) : (
                          reais(p.preco)
                        )}
                      </td>
                      <td className="num">{p.embalagem} un.</td>
                      <td className="num">{numero(p.vendas)}</td>
                      <td className="centro" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="botao fantasma"
                          title={p.destaque ? 'Tirar do destaque' : 'Colocar em destaque'}
                          style={{ fontSize: 18, color: p.destaque ? 'var(--dourado)' : 'var(--borda-forte)' }}
                          onClick={() => atualizar.mutate({ ids: [p.id], campos: { destaque: !p.destaque } })}>
                          ★
                        </button>
                      </td>
                      <td className="centro">
                        <Interruptor marcado={p.ativo} aoMudar={(v) => atualizar.mutate({ ids: [p.id], campos: { ativo: v } })} />
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
                window.scrollTo({ top: 0 });
              }}
            />
          </>
        )}
      </section>

      {acaoAberta === 'categoria' || acaoAberta === 'catalogo' ? (
        <ModalEscolha
          titulo={acaoAberta === 'categoria' ? 'Mudar categoria' : 'Mudar catálogo'}
          quantidade={selecionados.size}
          opcoes={(acaoAberta === 'categoria' ? categorias : catalogos)?.map((c) => ({ id: c.id, nome: c.nome })) ?? []}
          permiteNenhum={acaoAberta === 'catalogo'}
          aoFechar={() => setAcaoAberta(null)}
          aoConfirmar={async (id) => {
            await emMassa(acaoAberta === 'categoria' ? { categoria_id: id } : { catalogo_id: id }, acaoAberta === 'categoria' ? 'categoria alterada' : 'catálogo alterado');
            setAcaoAberta(null);
          }}
        />
      ) : null}
      {acaoAberta === 'preco' ? (
        <ModalReajuste
          ids={[...selecionados]}
          aoFechar={() => setAcaoAberta(null)}
          aoConcluir={(n) => {
            setAcaoAberta(null);
            queryClient.invalidateQueries({ queryKey: ['produtos'] });
            avisar(`Preço reajustado em ${n} produto(s)`, 'sucesso');
          }}
        />
      ) : null}
    </>
  );
}

function ModalEscolha({
  titulo,
  quantidade,
  opcoes,
  permiteNenhum,
  aoFechar,
  aoConfirmar,
}: {
  titulo: string;
  quantidade: number;
  opcoes: { id: string; nome: string }[];
  permiteNenhum?: boolean;
  aoFechar: () => void;
  aoConfirmar: (id: string | null) => Promise<void>;
}) {
  const [escolha, setEscolha] = useState('');
  const [salvando, setSalvando] = useState(false);
  return (
    <Modal
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            carregando={salvando}
            disabled={!escolha}
            onClick={async () => {
              setSalvando(true);
              await aoConfirmar(escolha === 'nenhum' ? null : escolha).finally(() => setSalvando(false));
            }}>
            Aplicar em {quantidade}
          </Botao>
        </>
      }>
      <Campo rotulo="Nova opção">
        <Selecao value={escolha} onChange={(e) => setEscolha(e.target.value)}>
          <option value="">Escolha...</option>
          {permiteNenhum ? <option value="nenhum">Nenhum (tirar do catálogo)</option> : null}
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </Selecao>
      </Campo>
    </Modal>
  );
}

function ModalReajuste({ ids, aoFechar, aoConcluir }: { ids: string[]; aoFechar: () => void; aoConcluir: (n: number) => void }) {
  const [percentual, setPercentual] = useState('10');
  const [tambemPromo, setTambemPromo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fator = 1 + (Number(percentual.replace(',', '.')) || 0) / 100;
  const exemplo = useMemo(() => Math.round(10 * fator * 100) / 100, [fator]);

  async function aplicar() {
    setSalvando(true);
    setErro(null);
    try {
      const atuais: { id: string; preco: number; preco_promocional: number | null }[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from('produtos').select('id, preco, preco_promocional').in('id', ids.slice(i, i + 200));
        if (error) throw error;
        atuais.push(...data);
      }
      const arred = (v: number) => Math.round(v * fator * 100) / 100;
      for (let i = 0; i < atuais.length; i += 20) {
        const lote = atuais.slice(i, i + 20);
        const resultados = await Promise.all(
          lote.map((p) =>
            supabase
              .from('produtos')
              .update({
                preco: arred(Number(p.preco)),
                ...(tambemPromo && p.preco_promocional ? { preco_promocional: arred(Number(p.preco_promocional)) } : {}),
              })
              .eq('id', p.id),
          ),
        );
        const falha = resultados.find((r) => r.error);
        if (falha?.error) throw falha.error;
      }
      aoConcluir(atuais.length);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={`Reajustar preço de ${ids.length} produto(s)`}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" carregando={salvando} disabled={fator === 1 || fator <= 0} onClick={aplicar}>
            Aplicar reajuste
          </Botao>
        </>
      }>
      <Campo rotulo="Percentual" ajuda="Use número negativo pra baixar (ex.: -5). Arredonda pra centavos.">
        <Entrada value={percentual} onChange={(e) => setPercentual(e.target.value)} inputMode="decimal" />
      </Campo>
      <Caixa marcado={tambemPromo} aoMudar={setTambemPromo} rotulo="Reajustar também o preço promocional (quando tiver)" />
      <div className="caixa-info">
        Exemplo: um produto de {reais(10)} passa a custar <strong>{reais(exemplo)}</strong>.
      </div>
      {erro ? <div className="caixa-erro">{erro}</div> : null}
      <Etiqueta tom="aviso">O novo preço vale na hora para todos os clientes.</Etiqueta>
    </Modal>
  );
}
