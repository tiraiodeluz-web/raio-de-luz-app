import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { useAvisar } from '../componentes/avisos';
import { CampoImagem } from '../componentes/campo-imagem';
import { AreaTexto, Botao, CabecalhoPagina, Caixa, Campo, CaixaErro, Carregando, Cartao, Entrada, Etiqueta, Interruptor, Selecao } from '../componentes/ui';
import { useCatalogos, useCategorias, useSantos } from '../lib/dados';
import { mensagemErro } from '../lib/erros';
import { dataHora, lerNumero, numero, reais } from '../lib/formato';
import { enviarImagem, urlImagem } from '../lib/imagens';
import { supabase } from '../lib/supabase';

type Formulario = {
  sku: string;
  nome: string;
  referencia: string;
  descricao: string;
  preco: string;
  preco_promocional: string;
  embalagem: string;
  categoria_id: string;
  catalogo_id: string;
  ativo: boolean;
  destaque: boolean;
  personalizavel: boolean;
  imagem_principal: string | null;
  santos: Record<string, string | null>; // santo_id -> foto daquele santo
};

const VAZIO: Formulario = {
  sku: '',
  nome: '',
  referencia: '',
  descricao: '',
  preco: '',
  preco_promocional: '',
  embalagem: '1',
  categoria_id: '',
  catalogo_id: '',
  ativo: true,
  destaque: false,
  personalizavel: false,
  imagem_principal: null,
  santos: {},
};

const textoPreco = (v: number | null | undefined) => (v === null || v === undefined || Number(v) === 0 ? '' : String(v).replace('.', ','));

export function PaginaProduto() {
  const { id } = useParams();
  const novo = id === 'novo';
  const local = useLocation();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const { data: categorias } = useCategorias();
  const { data: catalogos } = useCatalogos();
  const { data: santos } = useSantos();
  const copia = (local.state as { copia?: Formulario } | null)?.copia;

  const consulta = useQuery({
    queryKey: ['produto', id],
    enabled: !novo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*, produto_santos ( santo_id, foto_url )')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Formulario>(copia ?? VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const p = consulta.data;
    if (!p) return;
    setForm({
      sku: p.sku,
      nome: p.nome,
      referencia: p.referencia ?? '',
      descricao: p.descricao ?? '',
      preco: textoPreco(p.preco),
      preco_promocional: textoPreco(p.preco_promocional),
      embalagem: String(p.embalagem),
      categoria_id: p.categoria_id ?? '',
      catalogo_id: p.catalogo_id ?? '',
      ativo: p.ativo,
      destaque: p.destaque,
      personalizavel: p.personalizavel,
      imagem_principal: p.imagem_principal,
      santos: Object.fromEntries(p.produto_santos.map((s) => [s.santo_id, s.foto_url])),
    });
  }, [consulta.data]);

  const mudar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setForm((f) => ({ ...f, [campo]: valor }));

  const preco = lerNumero(form.preco);
  const promo = lerNumero(form.preco_promocional);
  const embalagem = Number(form.embalagem);
  const santosMarcados = Object.keys(form.santos).length;

  function validar() {
    const e: typeof erros = {};
    if (!form.sku.trim()) e.sku = 'Informe o SKU (código do produto).';
    if (!form.nome.trim()) e.nome = 'Informe o nome.';
    if (preco === null || preco < 0) e.preco = 'Preço inválido.';
    if (form.preco_promocional.trim() && (promo === null || promo < 0)) e.preco_promocional = 'Preço promocional inválido.';
    else if (promo && preco !== null && promo >= preco) e.preco_promocional = 'Tem que ser menor que o preço normal.';
    if (!Number.isInteger(embalagem) || embalagem < 1) e.embalagem = 'Mínimo 1 unidade.';
    if (form.personalizavel && santosMarcados === 0) e.santos = 'Marque pelo menos um santo, ou desligue "Cliente escolhe o santo".';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar() {
    if (!validar()) {
      avisar('Confira os campos destacados', 'erro');
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        sku: form.sku.trim(),
        nome: form.nome.trim(),
        referencia: form.referencia.trim() || null,
        descricao: form.descricao.trim() || null,
        preco: preco as number,
        preco_promocional: promo && promo > 0 ? promo : null,
        embalagem,
        categoria_id: form.categoria_id || null,
        catalogo_id: form.catalogo_id || null,
        ativo: form.ativo,
        destaque: form.destaque,
        personalizavel: form.personalizavel,
        imagem_principal: form.imagem_principal,
      };
      let produtoId = id as string;
      if (novo) {
        const { data, error } = await supabase.from('produtos').insert(dados).select('id').single();
        if (error) throw error;
        produtoId = data.id;
      } else {
        const { error } = await supabase.from('produtos').update(dados).eq('id', produtoId);
        if (error) throw error;
      }

      // Santos: apaga os desmarcados e grava/atualiza os marcados (com foto).
      const marcados = Object.entries(form.santos);
      const anteriores = novo ? [] : (consulta.data?.produto_santos ?? []).map((s) => s.santo_id);
      const removidos = anteriores.filter((s) => !(s in form.santos));
      if (removidos.length) {
        const { error } = await supabase.from('produto_santos').delete().eq('produto_id', produtoId).in('santo_id', removidos);
        if (error) throw error;
      }
      if (marcados.length) {
        const { error } = await supabase
          .from('produto_santos')
          .upsert(marcados.map(([santo_id, foto_url]) => ({ produto_id: produtoId, santo_id, foto_url })), { onConflict: 'produto_id,santo_id' });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['produtos'] });
      await queryClient.invalidateQueries({ queryKey: ['produto', produtoId] });
      avisar(novo ? 'Produto cadastrado' : 'Alterações salvas', 'sucesso');
      if (novo) navegar(`/produtos/${produtoId}`, { replace: true });
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir "${form.nome}" de vez? Pedidos antigos continuam com o nome e preço, mas o produto some do app e dos carrinhos.\n\nSe for só tirar do app, use "Aparece no app" desligado.`)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id as string);
    if (error) {
      avisar(mensagemErro(error), 'erro');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['produtos'] });
    avisar('Produto excluído', 'sucesso');
    navegar('/produtos');
  }

  if (!novo && consulta.isLoading) return <Carregando />;
  if (!novo && consulta.error) return <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />;

  return (
    <>
      <CabecalhoPagina
        voltar={{ para: '/produtos', rotulo: 'Produtos' }}
        titulo={novo ? 'Novo produto' : form.nome || 'Produto'}
        descricao={novo ? 'Preencha os dados e salve. Ele já aparece no app se estiver ativo.' : `SKU ${consulta.data?.sku}`}
        acoes={
          <>
            {!novo ? (
              <Botao onClick={() => navegar('/produtos/novo', { state: { copia: { ...form, sku: `${form.sku}-COPIA`, nome: `${form.nome} (cópia)` } } })}>
                Duplicar
              </Botao>
            ) : null}
            <Botao variante="primario" onClick={salvar} carregando={salvando}>
              {novo ? 'Cadastrar produto' : 'Salvar alterações'}
            </Botao>
          </>
        }
      />

      <div className="grade grade-lateral">
        <div className="pilha g">
          <Cartao titulo="Dados do produto">
            <div className="form-grade">
              <Campo rotulo="SKU (código)" erro={erros.sku} ajuda="Mesmo código da planilha (GROUPING KEY).">
                <Entrada value={form.sku} onChange={(e) => mudar('sku', e.target.value)} />
              </Campo>
              <Campo rotulo="Referência" ajuda="Opcional. Também entra na busca do app.">
                <Entrada value={form.referencia} onChange={(e) => mudar('referencia', e.target.value)} />
              </Campo>
              <Campo rotulo="Nome" erro={erros.nome} className="largo">
                <Entrada value={form.nome} onChange={(e) => mudar('nome', e.target.value)} />
              </Campo>
              <Campo rotulo="Descrição" ajuda="Aparece na tela do produto, embaixo do preço." className="largo">
                <AreaTexto value={form.descricao} onChange={(e) => mudar('descricao', e.target.value)} />
              </Campo>
            </div>
          </Cartao>

          <Cartao titulo="Foto principal">
            <div className="linha" style={{ alignItems: 'flex-start', gap: 20 }}>
              <CampoImagem valor={form.imagem_principal} aoMudar={(url) => mudar('imagem_principal', url)} pasta="produtos" largura={220} />
              <p className="texto-2 pequeno" style={{ maxWidth: 320 }}>
                A foto enviada é reduzida e convertida pra WebP automaticamente (fica leve no app). Também dá pra colar o link do Google Fotos, como na planilha.
              </p>
            </div>
          </Cartao>

          <Cartao
            titulo={
              <div style={{ flex: 1 }}>
                <h2>Santos (variações)</h2>
                <p className="texto-2 pequeno">Com “Cliente escolhe o santo” ligado, o app pede pra escolher um destes ao comprar.</p>
              </div>
            }
            acoes={
              <div className="linha">
                <Botao pequeno variante="fantasma" onClick={() => mudar('santos', Object.fromEntries((santos ?? []).map((s) => [s.id, form.santos[s.id] ?? null])))}>
                  Marcar todos
                </Botao>
                <Botao pequeno variante="fantasma" onClick={() => mudar('santos', {})}>
                  Desmarcar
                </Botao>
              </div>
            }>
            <div className="pilha">
              <Interruptor marcado={form.personalizavel} aoMudar={(v) => mudar('personalizavel', v)} rotulo={<strong>Cliente escolhe o santo</strong>} />
              {erros.santos ? <div className="caixa-erro">{erros.santos}</div> : null}
              <div className="grade-santos">
                {(santos ?? []).map((s) => (
                  <ItemSanto
                    key={s.id}
                    nome={`${s.codigo ?? ''} ${s.nome}`.trim()}
                    marcado={s.id in form.santos}
                    foto={form.santos[s.id] ?? null}
                    aoMarcar={(v) =>
                      mudar(
                        'santos',
                        v ? { ...form.santos, [s.id]: form.santos[s.id] ?? null } : Object.fromEntries(Object.entries(form.santos).filter(([k]) => k !== s.id)),
                      )
                    }
                    aoMudarFoto={(url) => mudar('santos', { ...form.santos, [s.id]: url })}
                  />
                ))}
              </div>
            </div>
          </Cartao>
        </div>

        <div className="pilha g">
          <Cartao titulo="Preço e venda">
            <div className="pilha">
              <Campo rotulo="Preço unitário" erro={erros.preco}>
                <Entrada prefixo="R$" inputMode="decimal" value={form.preco} onChange={(e) => mudar('preco', e.target.value)} placeholder="0,00" />
              </Campo>
              <Campo rotulo="Preço promocional" erro={erros.preco_promocional} ajuda="Deixe vazio se não estiver em promoção.">
                <Entrada prefixo="R$" inputMode="decimal" value={form.preco_promocional} onChange={(e) => mudar('preco_promocional', e.target.value)} placeholder="—" />
              </Campo>
              <Campo rotulo="Embalagem (quantidade mínima)" erro={erros.embalagem} ajuda="O cliente compra em múltiplos deste número.">
                <Entrada type="number" min={1} value={form.embalagem} onChange={(e) => mudar('embalagem', e.target.value)} />
              </Campo>
            </div>
          </Cartao>

          <Cartao titulo="Organização">
            <div className="pilha">
              <Campo rotulo="Categoria">
                <Selecao value={form.categoria_id} onChange={(e) => mudar('categoria_id', e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categorias?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Catálogo">
                <Selecao value={form.catalogo_id} onChange={(e) => mudar('catalogo_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {catalogos?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <div className="separador" />
              <Interruptor marcado={form.ativo} aoMudar={(v) => mudar('ativo', v)} rotulo="Aparece no app" />
              <Interruptor marcado={form.destaque} aoMudar={(v) => mudar('destaque', v)} rotulo="Em destaque (ofertas da home)" />
            </div>
          </Cartao>

          <Cartao titulo="Como fica no app">
            <PreviaCard foto={form.imagem_principal} nome={form.nome} preco={preco} promo={promo} embalagem={embalagem} ativo={form.ativo} />
          </Cartao>

          {!novo && consulta.data ? (
            <Cartao titulo="Informações">
              <div className="pilha pequeno">
                <div className="linha entre">
                  <span className="texto-2">Unidades vendidas</span>
                  <strong>{numero(consulta.data.vendas)}</strong>
                </div>
                <div className="linha entre">
                  <span className="texto-2">Cadastrado em</span>
                  <span>{dataHora(consulta.data.criado_em)}</span>
                </div>
                <div className="linha entre">
                  <span className="texto-2">Última alteração</span>
                  <span>{dataHora(consulta.data.atualizado_em)}</span>
                </div>
                <div className="separador" />
                <Botao variante="perigo" pequeno onClick={excluir}>
                  Excluir produto
                </Botao>
              </div>
            </Cartao>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ItemSanto({ nome, marcado, foto, aoMarcar, aoMudarFoto }: { nome: string; marcado: boolean; foto: string | null; aoMarcar: (v: boolean) => void; aoMudarFoto: (url: string | null) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const avisar = useAvisar();
  return (
    <div className={`santo-item ${marcado ? 'marcado' : ''}`}>
      <Caixa marcado={marcado} aoMudar={aoMarcar} />
      {foto ? <img className="miniatura" src={urlImagem(foto, 'miniatura')} alt="" /> : <div className="miniatura miniatura-vazia">✝</div>}
      <div className="info">
        <strong title={nome}>{nome}</strong>
        {marcado ? (
          <div className="linha" style={{ gap: 2 }}>
            <button className="botao fantasma pequeno" style={{ padding: '1px 4px' }} onClick={() => entrada.current?.click()} disabled={enviando}>
              {enviando ? 'Enviando...' : foto ? 'Trocar foto' : 'Pôr foto'}
            </button>
            {foto ? (
              <button className="botao fantasma pequeno" style={{ padding: '1px 4px' }} onClick={() => aoMudarFoto(null)}>
                Tirar
              </button>
            ) : null}
          </div>
        ) : (
          <span className="texto-3 pequeno">não vende</span>
        )}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const arquivo = e.target.files?.[0];
          if (!arquivo) return;
          setEnviando(true);
          try {
            aoMudarFoto(await enviarImagem(arquivo, 'santos-produto', 1200));
          } catch (erro) {
            avisar(mensagemErro(erro), 'erro');
          } finally {
            setEnviando(false);
          }
        }}
      />
    </div>
  );
}

function PreviaCard({ foto, nome, preco, promo, embalagem, ativo }: { foto: string | null; nome: string; preco: number | null; promo: number | null; embalagem: number; ativo: boolean }) {
  const desconto = useMemo(() => (preco && promo && promo < preco ? Math.round(((preco - promo) / preco) * 100) : 0), [preco, promo]);
  return (
    <div className="pilha" style={{ maxWidth: 200, margin: '0 auto', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        {foto ? (
          <img src={urlImagem(foto, 'card')} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, border: '1px solid var(--borda)' }} />
        ) : (
          <div className="miniatura-vazia" style={{ width: '100%', aspectRatio: '1', borderRadius: 12, background: 'var(--superficie-2)', fontSize: 40 }}>
            📦
          </div>
        )}
        {desconto ? (
          <span style={{ position: 'absolute', left: 8, top: 8 }}>
            <Etiqueta tom="perigo">-{desconto}%</Etiqueta>
          </span>
        ) : null}
      </div>
      <strong style={{ fontSize: 13 }}>{nome || 'Nome do produto'}</strong>
      <div>
        {desconto ? <span className="diff-antigo pequeno">{reais(preco)} </span> : null}
        <strong style={{ color: 'var(--azul-escuro)', fontSize: 15 }}>{reais(desconto ? promo : preco)}</strong>
      </div>
      <span className="texto-3 pequeno">Embalagem com {embalagem || 1} un.</span>
      {!ativo ? <Etiqueta tom="aviso">Desativado — não aparece no app</Etiqueta> : null}
    </div>
  );
}
