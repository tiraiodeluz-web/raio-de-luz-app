import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { CampoImagem } from '../componentes/campo-imagem';
import { AreaTexto, Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Entrada, Etiqueta, Interruptor, Miniatura, Modal, Selecao, Vazio } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { reais } from '../lib/formato';
import { urlImagem } from '../lib/imagens';
import { supabase } from '../lib/supabase';
import { precoExibido } from '@/lib/formatacao';

type ProdutoKit = { id: string; sku: string; nome: string; preco: number; preco_promocional: number | null; imagem_principal: string | null; embalagem: number; personalizavel: boolean };
type Santo = { id: string; nome: string; codigo: string };
type ItemForm = { chave: string; produto: ProdutoKit; santos: Santo[]; santoId: string | null; quantidade: number };
type KitLinha = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ativo: boolean;
  kit_itens: { id: string; quantidade: number; ordem: number; santo_id: string | null; produtos: ProdutoKit | null }[];
};

function textoConteudoKit(itens: { quantidade: number; nome: string; santoNome: string | null }[]) {
  return ['Esse kit contém:', ...itens.map((i) => `${i.quantidade} ${i.nome}${i.santoNome ? ` (${i.santoNome})` : ''}`)].join('\n');
}

const COLUNAS_PRODUTO = 'id, sku, nome, preco, preco_promocional, imagem_principal, embalagem, personalizavel';

// "Personalizado" (código 15) pede texto do cliente, então não dá pra fixar no kit.
async function santosDoProduto(p: ProdutoKit): Promise<Santo[]> {
  if (!p.personalizavel) return [];
  const { data, error } = await supabase.from('produto_santos').select('santos(id, nome, codigo)').eq('produto_id', p.id);
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.santos as unknown as Santo | null)
    .filter((s): s is Santo => !!s && s.codigo !== '15')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function PaginaKits() {
  const [editando, setEditando] = useState<KitLinha | 'novo' | null>(null);
  const lista = useQuery({
    queryKey: ['kits-painel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kits')
        .select(`id, nome, descricao, imagem_url, ativo, kit_itens(id, quantidade, ordem, santo_id, produtos(${COLUNAS_PRODUTO}))`)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as unknown as KitLinha[];
    },
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Kits"
        descricao="Combos de produtos (ex.: vela + capela + terço). O cliente vê a foto do kit e, com um toque, todos os itens vão pro carrinho, cada um no seu preço."
        acoes={
          <Botao variante="primario" onClick={() => setEditando('novo')}>
            + Novo kit
          </Botao>
        }
      />
      {lista.isLoading ? (
        <Carregando />
      ) : lista.error ? (
        <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />
      ) : !lista.data?.length ? (
        <div className="cartao">
          <Vazio icone="🎁" titulo="Nenhum kit">
            Crie o primeiro kit pra aparecer na home do app.
          </Vazio>
        </div>
      ) : (
        <div className="lista-banners">
          {lista.data.map((k) => {
            const total = k.kit_itens.reduce((s, i) => s + (i.produtos ? precoExibido(i.produtos.preco, i.produtos.preco_promocional) * i.quantidade : 0), 0);
            return (
              <div key={k.id} className="cartao" style={{ overflow: 'hidden', opacity: k.ativo ? 1 : 0.6 }}>
                {k.imagem_url ? <img className="banner-previa" src={urlImagem(k.imagem_url, 'grande')} alt="" style={{ borderRadius: 0, border: 0, aspectRatio: '1 / 1', objectFit: 'cover' }} /> : null}
                <div className="cartao-corpo pilha" style={{ gap: 8 }}>
                  <div className="linha entre">
                    <strong>{k.nome}</strong>
                    {k.ativo ? <Etiqueta tom="sucesso">No ar</Etiqueta> : <Etiqueta>Oculto</Etiqueta>}
                  </div>
                  <span className="texto-2 pequeno">
                    {k.kit_itens.length} produto(s) · {reais(total)}
                  </span>
                  <div className="linha" style={{ justifyContent: 'flex-end' }}>
                    <Botao pequeno onClick={() => setEditando(k)}>
                      Editar
                    </Botao>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editando ? <ModalKit kit={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)} /> : null}
    </>
  );
}

function ModalKit({ kit, aoFechar }: { kit: KitLinha | null; aoFechar: () => void }) {
  const [nome, setNome] = useState(kit?.nome ?? '');
  const [descricao, setDescricao] = useState(kit?.descricao ?? '');
  const [foto, setFoto] = useState<string | null>(kit?.imagem_url ?? null);
  const [ativo, setAtivo] = useState(kit?.ativo ?? true);
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(!!kit);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);
  const queryClient = useQueryClient();
  const avisar = useAvisar();

  // Carrega os itens do kit existente (com os santos possíveis de cada um).
  useEffect(() => {
    if (!kit) return;
    const ordenados = [...kit.kit_itens].filter((i) => i.produtos).sort((a, b) => a.ordem - b.ordem);
    Promise.all(
      ordenados.map(async (i) => ({
        chave: i.id,
        produto: i.produtos as ProdutoKit,
        santos: await santosDoProduto(i.produtos as ProdutoKit),
        santoId: i.santo_id,
        quantidade: i.quantidade,
      })),
    )
      .then(setItens)
      .catch((e) => setErro(mensagemErro(e)))
      .finally(() => setCarregandoItens(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultados = useQuery({
    queryKey: ['kit-busca', busca],
    enabled: busca.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(COLUNAS_PRODUTO)
        .eq('ativo', true)
        .ilike('busca', `%${busca.trim().toLowerCase()}%`)
        .order('nome')
        .limit(15);
      if (error) throw error;
      return data as ProdutoKit[];
    },
  });

  async function adicionar(p: ProdutoKit) {
    try {
      const santos = await santosDoProduto(p);
      setItens((atual) => [...atual, { chave: `${p.id}-${Date.now()}`, produto: p, santos, santoId: santos.length === 1 ? santos[0].id : null, quantidade: p.embalagem }]);
      setBusca('');
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  }

  const mudar = (chave: string, m: Partial<ItemForm>) => setItens((a) => a.map((i) => (i.chave === chave ? { ...i, ...m } : i)));
  const mover = (indice: number, dir: -1 | 1) =>
    setItens((a) => {
      const novo = [...a];
      const alvo = indice + dir;
      if (alvo < 0 || alvo >= novo.length) return a;
      [novo[indice], novo[alvo]] = [novo[alvo], novo[indice]];
      return novo;
    });

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_salvar_kit', {
        p_id: kit?.id ?? null,
        p_nome: nome.trim(),
        p_descricao: descricao,
        p_imagem_url: foto,
        p_ativo: ativo,
        p_itens: itens.map((i) => ({ produto_id: i.produto.id, santo_id: i.santoId, quantidade: i.quantidade })),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits-painel'] });
      avisar('Kit salvo', 'sucesso');
      aoFechar();
    },
    onError: (e) => setErro(mensagemErro(e)),
  });

  function confirmar() {
    setErro(null);
    setTentou(true);
    if (!nome.trim()) return setErro('Informe o nome do kit.');
    if (!foto) return setErro('Envie a foto do kit.');
    if (!itens.length) return setErro('Adicione pelo menos um produto.');
    if (itens.some((i) => i.santos.length > 0 && !i.santoId)) return setErro('Escolha o santo dos produtos marcados.');
    salvar.mutate();
  }

  async function apagar() {
    if (!kit || !confirm('Apagar este kit? Os produtos continuam no catálogo.')) return;
    const { error } = await supabase.from('kits').delete().eq('id', kit.id);
    if (error) return setErro(mensagemErro(error));
    queryClient.invalidateQueries({ queryKey: ['kits-painel'] });
    aoFechar();
  }

  const total = itens.reduce((s, i) => s + precoExibido(i.produto.preco, i.produto.preco_promocional) * i.quantidade, 0);

  return (
    <Modal
      largo
      titulo={kit ? 'Editar kit' : 'Novo kit'}
      aoFechar={aoFechar}
      rodape={
        <>
          {kit ? (
            <Botao variante="perigo" onClick={apagar} style={{ marginRight: 'auto' }}>
              Apagar
            </Botao>
          ) : null}
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" onClick={confirmar} carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }>
      <Campo rotulo="Foto do kit (quadrada, 1000 × 1000 px)">
        <CampoImagem valor={foto} aoMudar={setFoto} pasta="kits" proporcao="1 / 1" largura={200} ladoMax={1200} />
      </Campo>
      <Campo rotulo="Nome do kit">
        <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Kit Oração" />
      </Campo>
      <Interruptor marcado={ativo} aoMudar={setAtivo} rotulo="Visível para clientes" />

      <strong>Produtos do kit</strong>
      {carregandoItens ? <Carregando /> : null}
      {itens.map((item, i) => {
        const faltaSanto = tentou && item.santos.length > 0 && !item.santoId;
        return (
          <div key={item.chave} className="linha" style={{ gap: 12, alignItems: 'center', padding: 8, border: `1px solid ${faltaSanto ? '#D64545' : 'var(--borda, #E5E6EC)'}`, borderRadius: 8, flexWrap: 'wrap' }}>
            <Miniatura url={item.produto.imagem_principal} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <strong>{item.produto.nome}</strong>
              <div className="texto-2 pequeno">
                {item.produto.sku} · {reais(precoExibido(item.produto.preco, item.produto.preco_promocional))} cada
              </div>
            </div>
            {item.santos.length > 0 ? (
              <Selecao value={item.santoId ?? ''} onChange={(e) => mudar(item.chave, { santoId: e.target.value || null })} style={{ maxWidth: 180 }}>
                <option value="">Escolha o santo...</option>
                {item.santos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Selecao>
            ) : null}
            <Entrada
              type="number"
              min={item.produto.embalagem}
              step={item.produto.embalagem}
              value={item.quantidade}
              onChange={(e) => mudar(item.chave, { quantidade: Math.max(1, Math.round(Number(e.target.value) || item.produto.embalagem)) })}
              style={{ width: 90 }}
              title={`Quantidade (embalagem de ${item.produto.embalagem})`}
            />
            <Botao pequeno variante="fantasma" disabled={i === 0} onClick={() => mover(i, -1)}>
              ↑
            </Botao>
            <Botao pequeno variante="fantasma" disabled={i === itens.length - 1} onClick={() => mover(i, 1)}>
              ↓
            </Botao>
            <Botao pequeno variante="perigo" onClick={() => setItens((a) => a.filter((x) => x.chave !== item.chave))}>
              Remover
            </Botao>
          </div>
        );
      })}

      <Campo rotulo="Adicionar produto" ajuda={itens.length ? `Total do kit: ${reais(total)}` : undefined}>
        <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome ou código (mín. 2 letras)" />
      </Campo>
      {busca.trim().length >= 2 ? (
        <div className="pilha" style={{ gap: 4, maxHeight: 240, overflowY: 'auto' }}>
          {resultados.isFetching ? <span className="texto-2 pequeno">Buscando...</span> : null}
          {resultados.data?.map((p) => (
            <button key={p.id} type="button" className="linha" style={{ gap: 10, padding: 6, textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => adicionar(p)}>
              <Miniatura url={p.imagem_principal} />
              <span>
                {p.nome} <span className="texto-3">· {p.sku} · {reais(precoExibido(p.preco, p.preco_promocional))}</span>
              </span>
            </button>
          ))}
          {resultados.data && !resultados.data.length && !resultados.isFetching ? <span className="texto-2 pequeno">Nenhum produto encontrado</span> : null}
        </div>
      ) : null}

      <Campo rotulo="Descrição (aparece para o cliente)">
        <AreaTexto rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={'Esse kit contém:\n1 vela\n1 terço'} />
      </Campo>
      {itens.length ? (
        <Botao
          pequeno
          onClick={() => setDescricao(textoConteudoKit(itens.map((i) => ({ quantidade: i.quantidade, nome: i.produto.nome, santoNome: i.santos.find((s) => s.id === i.santoId)?.nome ?? null }))))}>
          Preencher com os produtos do kit
        </Botao>
      ) : null}
      {erro ? <div className="caixa-erro">{erro}</div> : null}
    </Modal>
  );
}
