import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { CampoImagem } from '../componentes/campo-imagem';
import { Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Entrada, Etiqueta, Interruptor, Modal, Selecao, Vazio } from '../componentes/ui';
import { useCatalogos, useCategorias } from '../lib/dados';
import { mensagemErro } from '../lib/erros';
import { apenasDigitos } from '../lib/formato';
import { urlImagem } from '../lib/imagens';
import { supabase } from '../lib/supabase';
import type { Tables } from '@/types/database';

type Banner = Tables<'banners'>;
type TipoLink = 'nenhum' | 'catalogo' | 'categoria' | 'produto' | 'whatsapp' | 'site';

// O app abre "/catalogo/<id>", "/categoria/<id>", "/produto/<id>" dentro dele
// e links http(s) no navegador/WhatsApp (src/components/banner-carrossel.tsx).
function lerLink(link: string | null): { tipo: TipoLink; valor: string } {
  if (!link) return { tipo: 'nenhum', valor: '' };
  const interno = link.match(/^\/(catalogo|categoria|produto)\/(.+)$/);
  if (interno) return { tipo: interno[1] as TipoLink, valor: interno[2] };
  const wa = link.match(/^https:\/\/wa\.me\/(\d+)/);
  if (wa) return { tipo: 'whatsapp', valor: wa[1] };
  return { tipo: 'site', valor: link };
}

function montarLink(tipo: TipoLink, valor: string): string | null {
  const v = valor.trim();
  if (tipo === 'nenhum' || !v) return null;
  if (tipo === 'whatsapp') {
    const d = apenasDigitos(v);
    return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
  }
  if (tipo === 'site') return /^https?:\/\//.test(v) ? v : `https://${v}`;
  return `/${tipo}/${v}`;
}

export function PaginaBanners() {
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Banner | 'novo' | null>(null);
  const { data: categorias } = useCategorias();
  const { data: catalogos } = useCatalogos();

  const lista = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').order('ordem').order('criado_em');
      if (error) throw error;
      return data;
    },
  });

  const salvarCampos = useMutation({
    mutationFn: async ({ id, campos }: { id: string; campos: Partial<Banner> }) => {
      const { error } = await supabase.from('banners').update(campos).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  async function mover(indice: number, direcao: -1 | 1) {
    const itens = [...(lista.data ?? [])];
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= itens.length) return;
    [itens[indice], itens[alvo]] = [itens[alvo], itens[indice]];
    await Promise.all(itens.map((b, i) => (b.ordem !== i + 1 ? supabase.from('banners').update({ ordem: i + 1 }).eq('id', b.id) : null)));
    queryClient.invalidateQueries({ queryKey: ['banners'] });
  }

  const descricaoLink = (link: string | null) => {
    const { tipo, valor } = lerLink(link);
    if (tipo === 'nenhum') return 'Sem link';
    if (tipo === 'catalogo') return `Catálogo: ${catalogos?.find((c) => c.id === valor)?.nome ?? 'removido'}`;
    if (tipo === 'categoria') return `Categoria: ${categorias?.find((c) => c.id === valor)?.nome ?? 'removida'}`;
    if (tipo === 'produto') return 'Abre um produto';
    if (tipo === 'whatsapp') return `WhatsApp ${valor}`;
    return valor;
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Banners da home"
        descricao="O carrossel do topo da tela inicial do app. Tamanho ideal: 1200 × 600 px (proporção 2:1)."
        acoes={
          <Botao variante="primario" onClick={() => setEditando('novo')}>
            + Novo banner
          </Botao>
        }
      />
      {lista.isLoading ? (
        <Carregando />
      ) : lista.error ? (
        <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />
      ) : !lista.data?.length ? (
        <div className="cartao">
          <Vazio icone="🖼️" titulo="Nenhum banner">
            Crie o primeiro pra aparecer no topo da home do app.
          </Vazio>
        </div>
      ) : (
        <div className="lista-banners">
          {lista.data.map((b, i) => (
            <div key={b.id} className="cartao" style={{ overflow: 'hidden', opacity: b.ativo ? 1 : 0.6 }}>
              <img className="banner-previa" src={urlImagem(b.foto_url, 'grande')} alt="" style={{ borderRadius: 0, border: 0 }} />
              <div className="cartao-corpo pilha" style={{ gap: 8 }}>
                <div className="linha entre">
                  <strong>
                    {i + 1}. {b.titulo || 'Sem título'}
                  </strong>
                  {b.ativo ? <Etiqueta tom="sucesso">No ar</Etiqueta> : <Etiqueta>Pausado</Etiqueta>}
                </div>
                <span className="texto-2 pequeno truncar" style={{ maxWidth: '100%' }}>
                  🔗 {descricaoLink(b.link)}
                </span>
                <div className="linha entre">
                  <Interruptor marcado={b.ativo} aoMudar={(v) => salvarCampos.mutate({ id: b.id, campos: { ativo: v } })} rotulo="Ativo" />
                  <div className="linha" style={{ gap: 4 }}>
                    <Botao pequeno variante="fantasma" disabled={i === 0} onClick={() => mover(i, -1)} title="Mais pra frente">
                      ←
                    </Botao>
                    <Botao pequeno variante="fantasma" disabled={i === lista.data.length - 1} onClick={() => mover(i, 1)} title="Mais pra trás">
                      →
                    </Botao>
                    <Botao pequeno onClick={() => setEditando(b)}>
                      Editar
                    </Botao>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editando ? (
        <ModalBanner
          banner={editando === 'novo' ? null : editando}
          proximaOrdem={(lista.data?.reduce((m, b) => Math.max(m, b.ordem), 0) ?? 0) + 1}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}

function ModalBanner({ banner, proximaOrdem, aoFechar }: { banner: Banner | null; proximaOrdem: number; aoFechar: () => void }) {
  const inicial = lerLink(banner?.link ?? null);
  const [titulo, setTitulo] = useState(banner?.titulo ?? '');
  const [foto, setFoto] = useState<string | null>(banner?.foto_url ?? null);
  const [ativo, setAtivo] = useState(banner?.ativo ?? true);
  const [tipo, setTipo] = useState<TipoLink>(inicial.tipo);
  const [valor, setValor] = useState(inicial.valor);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { data: categorias } = useCategorias();
  const { data: catalogos } = useCatalogos();
  const queryClient = useQueryClient();
  const avisar = useAvisar();

  const produtos = useQuery({
    queryKey: ['banner-produto', buscaProduto, tipo === 'produto' ? valor : ''],
    enabled: tipo === 'produto',
    queryFn: async () => {
      let q = supabase.from('produtos').select('id, sku, nome').eq('ativo', true).order('nome').limit(20);
      if (buscaProduto.trim()) q = q.ilike('busca', `%${buscaProduto.trim().toLowerCase()}%`);
      else if (valor) q = q.eq('id', valor);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function salvar() {
    if (!foto) {
      setErro('Envie a imagem do banner.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados = { titulo: titulo.trim() || null, foto_url: foto, ativo, link: montarLink(tipo, valor) };
    const { error } = banner
      ? await supabase.from('banners').update(dados).eq('id', banner.id)
      : await supabase.from('banners').insert({ ...dados, ordem: proximaOrdem });
    setSalvando(false);
    if (error) {
      setErro(mensagemErro(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['banners'] });
    avisar('Banner salvo', 'sucesso');
    aoFechar();
  }

  async function apagar() {
    if (!banner || !confirm('Apagar este banner?')) return;
    const { error } = await supabase.from('banners').delete().eq('id', banner.id);
    if (error) {
      setErro(mensagemErro(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['banners'] });
    aoFechar();
  }

  return (
    <Modal
      largo
      titulo={banner ? 'Editar banner' : 'Novo banner'}
      aoFechar={aoFechar}
      rodape={
        <>
          {banner ? (
            <Botao variante="perigo" onClick={apagar} style={{ marginRight: 'auto' }}>
              Apagar
            </Botao>
          ) : null}
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" onClick={salvar} carregando={salvando}>
            Salvar
          </Botao>
        </>
      }>
      <Campo rotulo="Imagem (1200 × 600 px)">
        <CampoImagem valor={foto} aoMudar={setFoto} pasta="banners" proporcao="2 / 1" largura="100%" ladoMax={1600} />
      </Campo>
      <div className="form-grade">
        <Campo rotulo="Título (só pra organizar)">
          <Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Promoção Dia das Mães" />
        </Campo>
        <Campo rotulo="Ao tocar no banner, abrir">
          <Selecao
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoLink);
              setValor('');
            }}>
            <option value="nenhum">Nada</option>
            <option value="catalogo">Um catálogo</option>
            <option value="categoria">Uma categoria</option>
            <option value="produto">Um produto</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="site">Um site</option>
          </Selecao>
        </Campo>
        {tipo === 'catalogo' || tipo === 'categoria' ? (
          <Campo rotulo={tipo === 'catalogo' ? 'Catálogo' : 'Categoria'}>
            <Selecao value={valor} onChange={(e) => setValor(e.target.value)}>
              <option value="">Escolha...</option>
              {(tipo === 'catalogo' ? catalogos : categorias)?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
        ) : null}
        {tipo === 'whatsapp' ? (
          <Campo rotulo="Número com DDD">
            <Entrada value={valor} onChange={(e) => setValor(e.target.value)} placeholder="43 99608-1065" />
          </Campo>
        ) : null}
        {tipo === 'site' ? (
          <Campo rotulo="Endereço">
            <Entrada value={valor} onChange={(e) => setValor(e.target.value)} placeholder="https://..." />
          </Campo>
        ) : null}
      </div>
      {tipo === 'produto' ? (
        <div className="pilha" style={{ gap: 8 }}>
          <Campo rotulo="Buscar produto">
            <Entrada value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} placeholder="Nome ou SKU" />
          </Campo>
          <div className="pilha" style={{ gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {produtos.data?.map((p) => (
              <label key={p.id} className="caixa" style={{ padding: '4px 0' }}>
                <input type="radio" name="produto-banner" checked={valor === p.id} onChange={() => setValor(p.id)} />
                <span>
                  {p.nome} <span className="texto-3">· {p.sku}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <Interruptor marcado={ativo} aoMudar={setAtivo} rotulo="Mostrar no app" />
      {erro ? <div className="caixa-erro">{erro}</div> : null}
    </Modal>
  );
}
