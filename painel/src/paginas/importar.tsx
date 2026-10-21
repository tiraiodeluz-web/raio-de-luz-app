import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { readSheet } from 'read-excel-file/browser';

import { useAvisar } from '../componentes/avisos';
import { Abas, Botao, CabecalhoPagina, Caixa, Campo, Cartao, Etiqueta, Kpi, Miniatura, Selecao, Vazio } from '../componentes/ui';
import { buscarTodos } from '../lib/buscar-todos';
import { useCatalogos, useCategorias } from '../lib/dados';
import { mensagemErro } from '../lib/erros';
import { numero, reais } from '../lib/formato';
import { lerPlanilhaProdutos, siglaSku, type ProdutoPlanilha } from '../lib/planilha';
import { supabase } from '../lib/supabase';

type ProdutoBanco = {
  id: string;
  sku: string;
  nome: string;
  preco: number;
  embalagem: number;
  imagem_principal: string | null;
  ativo: boolean;
  categoria_id: string | null;
};

type Mudanca = { campo: string; antes: string; depois: string };

type Analisado = ProdutoPlanilha & {
  situacao: 'novo' | 'alterado' | 'igual' | 'invalido';
  existente?: ProdutoBanco;
  mudancas: Mudanca[];
  santosDesconhecidos: string[];
  categoriaSugerida: string | null;
};

type Analise = {
  arquivo: string;
  linhasLidas: number;
  linhasIgnoradas: number;
  itens: Analisado[];
  ausentes: ProdutoBanco[];
};

type Aba = 'novo' | 'alterado' | 'igual' | 'avisos' | 'ausentes';

const LOTE = 150;

export function PaginaImportar() {
  const entrada = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [aba, setAba] = useState<Aba>('novo');
  const [criarNovos, setCriarNovos] = useState(true);
  const [atualizar, setAtualizar] = useState(true);
  const [atualizarFotos, setAtualizarFotos] = useState(true);
  const [desativarAusentes, setDesativarAusentes] = useState(false);
  const [usarSugestao, setUsarSugestao] = useState(true);
  const [categoriaPadrao, setCategoriaPadrao] = useState('');
  const [catalogo, setCatalogo] = useState('');
  const [progresso, setProgresso] = useState<number | null>(null);
  const [resultado, setResultado] = useState<{ criados: number; atualizados: number; santos: number; desativados: number } | null>(null);
  const { data: categorias } = useCategorias();
  const { data: catalogos } = useCatalogos();
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  const nomeCategoria = useMemo(() => new Map((categorias ?? []).map((c) => [c.id, c.nome])), [categorias]);

  async function ler(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setAnalise(null);
    setResultado(null);
    setLendo(true);
    try {
      if (!/\.xlsx$/i.test(arquivo.name)) throw new Error('Envie a planilha em .xlsx (no Excel: Arquivo → Salvar como → Pasta de Trabalho do Excel).');
      const linhas = (await readSheet(arquivo)) as unknown[][];
      const leitura = lerPlanilhaProdutos(linhas);
      if (leitura.produtos.length === 0) throw new Error('Nenhum produto encontrado na planilha.');

      const [banco, vinculos, santos] = await Promise.all([
        buscarTodos<ProdutoBanco>((de, ate) =>
          supabase.from('produtos').select('id, sku, nome, preco, embalagem, imagem_principal, ativo, categoria_id').order('sku').range(de, ate),
        ),
        buscarTodos<{ produto_id: string; foto_url: string | null; santos: { codigo: string | null } | null }>((de, ate) =>
          supabase.from('produto_santos').select('produto_id, foto_url, santos ( codigo )').order('produto_id').order('santo_id').range(de, ate),
        ),
        supabase.from('santos').select('codigo'),
      ]);
      if (santos.error) throw santos.error;
      const codigosValidos = new Set(santos.data.map((s) => s.codigo));
      const porSku = new Map(banco.map((p) => [p.sku, p]));
      const santosDoProduto = new Map<string, Map<string, string | null>>();
      for (const v of vinculos) {
        if (!v.santos?.codigo) continue;
        const m = santosDoProduto.get(v.produto_id) ?? new Map();
        m.set(v.santos.codigo, v.foto_url);
        santosDoProduto.set(v.produto_id, m);
      }

      // Categoria mais comum entre os produtos já cadastrados com a mesma sigla.
      const categoriasPorSigla = new Map<string, Map<string, number>>();
      for (const p of banco) {
        if (!p.categoria_id) continue;
        const m = categoriasPorSigla.get(siglaSku(p.sku)) ?? new Map<string, number>();
        m.set(p.categoria_id, (m.get(p.categoria_id) ?? 0) + 1);
        categoriasPorSigla.set(siglaSku(p.sku), m);
      }
      const sugerir = (sku: string) => {
        const m = categoriasPorSigla.get(siglaSku(sku));
        return m ? [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
      };

      const skusPlanilha = new Set(leitura.produtos.map((p) => p.sku));
      const itens: Analisado[] = leitura.produtos.map((p) => {
        const santosDesconhecidos = p.santos.filter((s) => !codigosValidos.has(s.codigo)).map((s) => s.codigo);
        const base = { ...p, santos: p.santos.filter((s) => codigosValidos.has(s.codigo)), santosDesconhecidos, mudancas: [] as Mudanca[] };
        if (!p.nome || p.preco === null) return { ...base, situacao: 'invalido', categoriaSugerida: null };
        const existente = porSku.get(p.sku);
        if (!existente) return { ...base, situacao: 'novo', categoriaSugerida: sugerir(p.sku) };

        const mudancas: Mudanca[] = [];
        if (existente.nome.trim() !== p.nome) mudancas.push({ campo: 'Nome', antes: existente.nome, depois: p.nome });
        if (Math.abs(Number(existente.preco) - p.preco) > 0.004) mudancas.push({ campo: 'Preço', antes: reais(existente.preco), depois: reais(p.preco) });
        if (existente.embalagem !== p.embalagem) mudancas.push({ campo: 'Embalagem', antes: `${existente.embalagem} un.`, depois: `${p.embalagem} un.` });
        if (p.imagem && p.imagem !== existente.imagem_principal) mudancas.push({ campo: 'Foto', antes: existente.imagem_principal ? 'outra foto' : 'sem foto', depois: 'foto da planilha' });
        const atuais = santosDoProduto.get(existente.id) ?? new Map<string, string | null>();
        const novosSantos = base.santos.filter((s) => !atuais.has(s.codigo));
        const fotosSanto = base.santos.filter((s) => atuais.has(s.codigo) && s.foto && s.foto !== atuais.get(s.codigo));
        if (novosSantos.length) mudancas.push({ campo: 'Santos', antes: `${atuais.size}`, depois: `+${novosSantos.map((s) => s.codigo).join(', ')}` });
        if (fotosSanto.length) mudancas.push({ campo: 'Fotos de santo', antes: '', depois: `${fotosSanto.length} atualizada(s)` });
        return { ...base, situacao: mudancas.length ? 'alterado' : 'igual', existente, mudancas, categoriaSugerida: null };
      });

      setAnalise({
        arquivo: arquivo.name,
        linhasLidas: leitura.linhasLidas,
        linhasIgnoradas: leitura.linhasIgnoradas,
        itens,
        ausentes: banco.filter((p) => p.ativo && !skusPlanilha.has(p.sku)),
      });
      setAba(itens.some((i) => i.situacao === 'novo') ? 'novo' : 'alterado');
      if (!categoriaPadrao) setCategoriaPadrao(categorias?.find((c) => c.nome === 'Outros')?.id ?? categorias?.[0]?.id ?? '');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setLendo(false);
    }
  }

  const grupos = useMemo(() => {
    const itens = analise?.itens ?? [];
    return {
      novo: itens.filter((i) => i.situacao === 'novo'),
      alterado: itens.filter((i) => i.situacao === 'alterado'),
      igual: itens.filter((i) => i.situacao === 'igual'),
      avisos: itens.filter((i) => i.situacao === 'invalido' || i.avisos.length > 0 || i.santosDesconhecidos.length > 0),
    };
  }, [analise]);

  const aEnviar = (criarNovos ? grupos.novo.length : 0) + (atualizar ? grupos.alterado.length : 0);
  const aDesativar = desativarAusentes ? (analise?.ausentes.length ?? 0) : 0;

  async function importar() {
    if (!analise) return;
    if (criarNovos && grupos.novo.length && !categoriaPadrao) {
      avisar('Escolha a categoria padrão dos produtos novos', 'erro');
      return;
    }
    const resumo = [
      criarNovos && grupos.novo.length ? `criar ${grupos.novo.length} produto(s)` : '',
      atualizar && grupos.alterado.length ? `atualizar ${grupos.alterado.length}` : '',
      aDesativar ? `desativar ${aDesativar} que não estão na planilha` : '',
    ].filter(Boolean);
    if (!resumo.length || !confirm(`Confirma: ${resumo.join(', ')}?\n\nAs mudanças aparecem no app na hora.`)) return;

    const itens = [...(criarNovos ? grupos.novo : []), ...(atualizar ? grupos.alterado : [])].map((p) => ({
      sku: p.sku,
      nome: p.nome,
      preco: p.preco,
      embalagem: p.embalagem,
      imagem: p.situacao === 'alterado' && !atualizarFotos ? '' : (p.imagem ?? ''),
      categoria_id: p.situacao === 'novo' && usarSugestao ? p.categoriaSugerida : null,
      santos: p.santos.map((s) => ({ codigo: s.codigo, foto: p.situacao === 'alterado' && !atualizarFotos ? null : s.foto })),
    }));
    const total = { criados: 0, atualizados: 0, santos: 0, desativados: 0 };
    const passos = Math.ceil(itens.length / LOTE) + Math.ceil(aDesativar / 200);
    let feitos = 0;
    setProgresso(0);
    try {
      for (let i = 0; i < itens.length; i += LOTE) {
        const { data, error } = await supabase.rpc('importar_produtos_lote', {
          p_itens: itens.slice(i, i + LOTE),
          p_categoria_id: categoriaPadrao || undefined,
          p_catalogo_id: catalogo || undefined,
        });
        if (error) throw error;
        const r = data as { criados: number; atualizados: number; santos: number };
        total.criados += r.criados;
        total.atualizados += r.atualizados;
        total.santos += r.santos;
        setProgresso(++feitos / passos);
      }
      if (aDesativar) {
        const ids = analise.ausentes.map((p) => p.id);
        for (let i = 0; i < ids.length; i += 200) {
          const { error } = await supabase.from('produtos').update({ ativo: false }).in('id', ids.slice(i, i + 200));
          if (error) throw error;
          total.desativados += ids.slice(i, i + 200).length;
          setProgresso(++feitos / passos);
        }
      }
      setResultado(total);
      setAnalise(null);
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      avisar('Importação concluída', 'sucesso');
    } catch (e) {
      avisar(`Parou no meio: ${mensagemErro(e)}. O que já foi enviado ficou salvo; pode importar de novo que ele continua.`, 'erro');
      setResultado(total);
    } finally {
      setProgresso(null);
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Importar planilha de produtos"
        descricao="Use a mesma planilha de hoje (ID, NAME, PRICE, PACKAGE SIZE, GROUPING KEY, Image 1...). Antes de gravar, o painel mostra tudo o que vai mudar."
      />

      {resultado ? (
        <div className="caixa-sucesso" style={{ marginBottom: 16 }}>
          ✅ {numero(resultado.criados)} produto(s) criados, {numero(resultado.atualizados)} atualizados, {numero(resultado.santos)} santos vinculados
          {resultado.desativados ? `, ${numero(resultado.desativados)} desativados` : ''}. <Link to="/produtos">Ver produtos →</Link>
        </div>
      ) : null}

      {!analise ? (
        <div
          className={`zona-arquivo ${sobre ? 'sobre' : ''}`}
          onClick={() => entrada.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSobre(false);
            ler(e.dataTransfer.files[0]);
          }}>
          <div className="icone">{lendo ? <span className="girando" style={{ display: 'inline-block', width: 28, height: 28 }} /> : '📄'}</div>
          <h2 style={{ marginTop: 8 }}>{lendo ? 'Lendo a planilha e comparando com o app...' : 'Arraste a planilha .xlsx aqui ou clique pra escolher'}</h2>
          <p className="texto-2" style={{ marginTop: 6 }}>
            Nada é gravado agora: primeiro você confere o que é novo, o que muda e o que fica igual.
          </p>
          <input ref={entrada} type="file" accept=".xlsx" hidden onChange={(e) => ler(e.target.files?.[0])} />
        </div>
      ) : null}
      {erro ? (
        <div className="caixa-erro" style={{ marginTop: 12 }}>
          {erro}
        </div>
      ) : null}

      {analise ? (
        <div className="pilha g">
          <div className="grade grade-kpi">
            <Kpi rotulo="Produtos na planilha" valor={numero(analise.itens.length)} detalhe={`${numero(analise.linhasLidas)} linhas (variações)`} destaque />
            <Kpi rotulo="Novos" valor={numero(grupos.novo.length)} detalhe="não existem no app" />
            <Kpi rotulo="Com mudança" valor={numero(grupos.alterado.length)} detalhe="preço, nome, foto ou santos" />
            <Kpi rotulo="Iguais" valor={numero(grupos.igual.length)} detalhe="nada a fazer" />
            <Kpi rotulo="No app, fora da planilha" valor={numero(analise.ausentes.length)} detalhe="ativos hoje" />
          </div>

          <Cartao titulo={`O que fazer com "${analise.arquivo}"`}>
            <div className="grade grade-2">
              <div className="pilha">
                <Caixa marcado={criarNovos} aoMudar={setCriarNovos} rotulo={<strong>Cadastrar os {numero(grupos.novo.length)} produtos novos</strong>} />
                {criarNovos && grupos.novo.length ? (
                  <div className="pilha" style={{ paddingLeft: 24 }}>
                    <Caixa
                      marcado={usarSugestao}
                      aoMudar={setUsarSugestao}
                      rotulo="Sugerir a categoria pela sigla do SKU (ex.: CH → mesma categoria dos outros CH)"
                    />
                    <div className="form-grade">
                      <Campo rotulo={usarSugestao ? 'Categoria quando não houver sugestão' : 'Categoria dos novos'}>
                        <Selecao value={categoriaPadrao} onChange={(e) => setCategoriaPadrao(e.target.value)}>
                          <option value="">Escolha...</option>
                          {categorias?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </Selecao>
                      </Campo>
                      <Campo rotulo="Catálogo dos novos (opcional)">
                        <Selecao value={catalogo} onChange={(e) => setCatalogo(e.target.value)}>
                          <option value="">Nenhum</option>
                          {catalogos?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </Selecao>
                      </Campo>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="pilha">
                <Caixa marcado={atualizar} aoMudar={setAtualizar} rotulo={<strong>Atualizar os {numero(grupos.alterado.length)} produtos que mudaram</strong>} />
                {atualizar ? (
                  <div style={{ paddingLeft: 24 }}>
                    <Caixa marcado={atualizarFotos} aoMudar={setAtualizarFotos} rotulo="Trocar as fotos pelas da planilha (desmarque se já arrumou fotos pelo painel)" />
                  </div>
                ) : null}
                <Caixa
                  marcado={desativarAusentes}
                  aoMudar={setDesativarAusentes}
                  rotulo={<strong>Desativar os {numero(analise.ausentes.length)} produtos que não estão na planilha</strong>}
                />
                <p className="texto-3 pequeno" style={{ paddingLeft: 24 }}>
                  Eles saem do app mas continuam cadastrados (dá pra reativar). Preço promocional, descrição, categoria e destaque dos produtos existentes não são alterados.
                </p>
              </div>
            </div>
            <div className="separador" style={{ margin: '16px 0' }} />
            {progresso !== null ? (
              <div className="pilha">
                <div className="progresso">
                  <div style={{ width: `${Math.round(progresso * 100)}%` }} />
                </div>
                <span className="texto-2">Gravando... {Math.round(progresso * 100)}% (não feche esta aba)</span>
              </div>
            ) : (
              <div className="linha">
                <Botao variante="primario" onClick={importar} disabled={aEnviar + aDesativar === 0}>
                  Importar agora ({numero(aEnviar + aDesativar)})
                </Botao>
                <Botao onClick={() => setAnalise(null)}>Escolher outra planilha</Botao>
              </div>
            )}
          </Cartao>

          <section className="cartao">
            <div style={{ padding: '4px 16px 0' }}>
              <Abas<Aba>
                ativa={aba}
                aoMudar={setAba}
                abas={[
                  { chave: 'novo', rotulo: 'Novos', contador: grupos.novo.length },
                  { chave: 'alterado', rotulo: 'Com mudança', contador: grupos.alterado.length },
                  { chave: 'igual', rotulo: 'Iguais', contador: grupos.igual.length },
                  { chave: 'avisos', rotulo: 'Avisos', contador: grupos.avisos.length },
                  { chave: 'ausentes', rotulo: 'Fora da planilha', contador: analise.ausentes.length },
                ]}
              />
            </div>
            {aba === 'ausentes' ? (
              <ListaAusentes itens={analise.ausentes} />
            ) : (
              <ListaAnalise itens={grupos[aba]} aba={aba} nomeCategoria={nomeCategoria} categoriaPadrao={nomeCategoria.get(categoriaPadrao)} usarSugestao={usarSugestao} />
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

const LIMITE_LISTA = 300;

function ListaAnalise({
  itens,
  aba,
  nomeCategoria,
  categoriaPadrao,
  usarSugestao,
}: {
  itens: Analisado[];
  aba: Exclude<Aba, 'ausentes'>;
  nomeCategoria: Map<string, string>;
  categoriaPadrao?: string;
  usarSugestao: boolean;
}) {
  if (!itens.length) return <Vazio icone="✅" titulo="Nada nesta lista" />;
  return (
    <div className="tabela-caixa">
      <table className="tabela">
        <thead>
          <tr>
            <th>Produto</th>
            <th className="num">Preço</th>
            <th className="num">Emb.</th>
            <th>Santos</th>
            <th>{aba === 'novo' ? 'Categoria' : aba === 'avisos' ? 'Avisos' : 'O que muda'}</th>
          </tr>
        </thead>
        <tbody>
          {itens.slice(0, LIMITE_LISTA).map((p) => (
            <tr key={p.sku}>
              <td>
                <div className="celula-produto">
                  <Miniatura url={p.imagem} />
                  <div>
                    <div className="nome">{p.nome || <em className="texto-3">sem nome</em>}</div>
                    <div className="sub">
                      {p.sku} · linha{p.linhas.length > 1 ? 's' : ''} {p.linhas[0]}
                      {p.linhas.length > 1 ? `–${p.linhas[p.linhas.length - 1]}` : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td className="num">{p.preco !== null ? reais(p.preco) : '—'}</td>
              <td className="num">{p.embalagem}</td>
              <td className="pequeno">{p.santos.length ? `${p.santos.length}: ${p.santos.map((s) => s.codigo).join(', ')}` : <span className="fraco">—</span>}</td>
              <td className="pequeno">
                {aba === 'novo' ? (
                  usarSugestao && p.categoriaSugerida ? (
                    <Etiqueta tom="info">{nomeCategoria.get(p.categoriaSugerida)} (sugerida)</Etiqueta>
                  ) : (
                    <span>{categoriaPadrao ?? '—'}</span>
                  )
                ) : aba === 'avisos' ? (
                  <div className="pilha" style={{ gap: 2 }}>
                    {p.avisos.map((a) => (
                      <span key={a}>⚠️ {a}</span>
                    ))}
                    {p.santosDesconhecidos.length ? <span>⚠️ Código(s) de santo que não existem no app: {p.santosDesconhecidos.join(', ')}</span> : null}
                  </div>
                ) : p.mudancas.length ? (
                  <div className="pilha" style={{ gap: 2 }}>
                    {p.mudancas.map((m) => (
                      <span key={m.campo}>
                        <strong>{m.campo}:</strong> {m.antes ? <span className="diff-antigo">{m.antes}</span> : null} → <span className="diff-novo">{m.depois}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="fraco">igual ao app</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {itens.length > LIMITE_LISTA ? <div className="paginacao">Mostrando {LIMITE_LISTA} de {numero(itens.length)}.</div> : null}
    </div>
  );
}

function ListaAusentes({ itens }: { itens: ProdutoBanco[] }) {
  if (!itens.length) return <Vazio icone="✅" titulo="Todos os produtos ativos do app estão na planilha" />;
  return (
    <div className="tabela-caixa">
      <table className="tabela">
        <thead>
          <tr>
            <th>Produto</th>
            <th className="num">Preço</th>
          </tr>
        </thead>
        <tbody>
          {itens.slice(0, LIMITE_LISTA).map((p) => (
            <tr key={p.id}>
              <td>
                <div className="celula-produto">
                  <Miniatura url={p.imagem_principal} />
                  <div>
                    <div className="nome">{p.nome}</div>
                    <div className="sub">{p.sku}</div>
                  </div>
                </div>
              </td>
              <td className="num">{reais(p.preco)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
