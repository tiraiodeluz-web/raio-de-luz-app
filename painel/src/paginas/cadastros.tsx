import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { useAvisar } from '../componentes/avisos';
import { CampoImagem } from '../componentes/campo-imagem';
import { Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Entrada, Interruptor, Miniatura, Modal, Vazio } from '../componentes/ui';
import { buscarTodos } from '../lib/buscar-todos';
import { mensagemErro } from '../lib/erros';
import { numero } from '../lib/formato';
import type { PastaImagem } from '../lib/imagens';
import { supabase } from '../lib/supabase';

type TabelaCadastro = 'categorias' | 'catalogos' | 'santos';

type Config = {
  tabela: TabelaCadastro;
  titulo: string;
  singular: string;
  descricao: string;
  campoFoto: 'foto_url' | 'imagem_url';
  pasta: PastaImagem;
  temCodigo?: boolean;
  filtroProdutos?: 'categoria' | 'catalogo'; // filtro da tela de produtos
};

type Linha = { id: string; nome: string; codigo: string | null; foto: string | null; ordem: number; ativo: boolean };

// As três tabelas têm o mesmo jeito (nome, foto, ordem, ativo); só o nome
// da coluna da foto muda. O cliente tipado não aceita nome de tabela
// variável, por isso o "as".
const tabela = (t: TabelaCadastro) => supabase.from(t as 'categorias');

function useCadastro(c: Config) {
  return useQuery({
    queryKey: [c.tabela],
    queryFn: async () => {
      const { data, error } = await tabela(c.tabela).select('*').order('ordem').order('nome');
      if (error) throw error;
      return (data as unknown as Record<string, unknown>[]).map(
        (r): Linha => ({
          id: r.id as string,
          nome: r.nome as string,
          codigo: (r.codigo as string | null) ?? null,
          foto: (r[c.campoFoto] as string | null) ?? null,
          ordem: r.ordem as number,
          ativo: r.ativo as boolean,
        }),
      );
    },
  });
}

// Quantos produtos usam cada item (pra mostrar na lista e avisar antes de apagar).
function useContagemProdutos(c: Config) {
  return useQuery({
    queryKey: [c.tabela, 'contagem'],
    queryFn: async () => {
      const contagem = new Map<string, number>();
      if (c.tabela === 'santos') {
        const linhas = await buscarTodos<{ santo_id: string }>((de, ate) => supabase.from('produto_santos').select('santo_id').order('produto_id').order('santo_id').range(de, ate));
        linhas.forEach((l) => contagem.set(l.santo_id, (contagem.get(l.santo_id) ?? 0) + 1));
      } else {
        const coluna = c.tabela === 'categorias' ? 'categoria_id' : 'catalogo_id';
        const linhas = await buscarTodos<{ categoria_id: string | null; catalogo_id: string | null }>((de, ate) =>
          supabase.from('produtos').select('categoria_id, catalogo_id').order('id').range(de, ate),
        );
        linhas.forEach((l) => {
          const id = l[coluna];
          if (id) contagem.set(id, (contagem.get(id) ?? 0) + 1);
        });
      }
      return contagem;
    },
  });
}

function PaginaCadastro({ config }: { config: Config }) {
  const lista = useCadastro(config);
  const contagem = useContagemProdutos(config);
  const [editando, setEditando] = useState<Linha | 'novo' | null>(null);
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  const salvarCampos = useMutation({
    mutationFn: async ({ id, campos }: { id: string; campos: Record<string, unknown> }) => {
      const { error } = await tabela(config.tabela).update(campos as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [config.tabela] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  // Sobe/desce trocando de lugar com o vizinho e renumerando 1..n.
  async function mover(indice: number, direcao: -1 | 1) {
    const itens = [...(lista.data ?? [])];
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= itens.length) return;
    [itens[indice], itens[alvo]] = [itens[alvo], itens[indice]];
    const mudancas = itens.map((l, i) => ({ id: l.id, ordem: i + 1 })).filter((m, i) => itens[i].ordem !== m.ordem);
    try {
      await Promise.all(mudancas.map((m) => tabela(config.tabela).update({ ordem: m.ordem }).eq('id', m.id).then(({ error }) => { if (error) throw error; })));
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
    queryClient.invalidateQueries({ queryKey: [config.tabela] });
  }

  return (
    <>
      <CabecalhoPagina
        titulo={config.titulo}
        descricao={config.descricao}
        acoes={
          <Botao variante="primario" onClick={() => setEditando('novo')}>
            + {config.singular}
          </Botao>
        }
      />
      <section className="cartao">
        {lista.isLoading ? (
          <Carregando />
        ) : lista.error ? (
          <div className="cartao-corpo">
            <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />
          </div>
        ) : !lista.data?.length ? (
          <Vazio titulo={`Nenhum(a) ${config.singular.toLowerCase()} cadastrado(a)`} />
        ) : (
          <div className="tabela-caixa">
            <table className="tabela">
              <thead>
                <tr>
                  <th className="estreito">Ordem</th>
                  <th>{config.singular}</th>
                  <th className="num">Produtos</th>
                  <th className="centro">No app</th>
                  <th className="estreito" />
                </tr>
              </thead>
              <tbody>
                {lista.data.map((l, i) => (
                  <tr key={l.id}>
                    <td className="sem-quebra">
                      <Botao pequeno variante="fantasma" disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">
                        ↑
                      </Botao>
                      <Botao pequeno variante="fantasma" disabled={i === lista.data.length - 1} onClick={() => mover(i, 1)} title="Descer">
                        ↓
                      </Botao>
                    </td>
                    <td>
                      <div className="celula-produto">
                        <Miniatura url={l.foto} />
                        <div>
                          <div className="nome">{l.nome}</div>
                          {config.temCodigo ? <div className="sub">Código {l.codigo ?? '—'}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td className="num">
                      {config.filtroProdutos ? (
                        <Link to={`/produtos?${config.filtroProdutos}=${l.id}`}>{numero(contagem.data?.get(l.id) ?? 0)}</Link>
                      ) : (
                        numero(contagem.data?.get(l.id) ?? 0)
                      )}
                    </td>
                    <td className="centro">
                      <Interruptor marcado={l.ativo} aoMudar={(v) => salvarCampos.mutate({ id: l.id, campos: { ativo: v } })} />
                    </td>
                    <td>
                      <Botao pequeno onClick={() => setEditando(l)}>
                        Editar
                      </Botao>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {config.tabela === 'santos' ? (
        <p className="texto-3 pequeno" style={{ marginTop: 10 }}>
          A foto de cada santo dentro de um produto fica no cadastro do produto. Esta foto aqui é a geral do santo. O código (ex.: 03) é o mesmo da coluna sem título da planilha.
        </p>
      ) : (
        <p className="texto-3 pequeno" style={{ marginTop: 10 }}>
          Clique no número de produtos pra ver a lista. Desativar esconde do app sem apagar.
        </p>
      )}
      {editando ? (
        <ModalCadastro
          config={config}
          item={editando === 'novo' ? null : editando}
          proximaOrdem={(lista.data?.reduce((m, l) => Math.max(m, l.ordem), 0) ?? 0) + 1}
          usados={editando === 'novo' ? 0 : (contagem.data?.get(editando.id) ?? 0)}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}

function ModalCadastro({ config, item, proximaOrdem, usados, aoFechar }: { config: Config; item: Linha | null; proximaOrdem: number; usados: number; aoFechar: () => void }) {
  const [nome, setNome] = useState(item?.nome ?? '');
  const [codigo, setCodigo] = useState(item?.codigo ?? '');
  const [foto, setFoto] = useState<string | null>(item?.foto ?? null);
  const [ativo, setAtivo] = useState(item?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: Record<string, unknown> = { nome: nome.trim(), ativo, [config.campoFoto]: foto };
    if (config.temCodigo) dados.codigo = codigo.trim() ? codigo.trim().padStart(2, '0') : null;
    const { error } = item
      ? await tabela(config.tabela).update(dados as never).eq('id', item.id)
      : await tabela(config.tabela).insert({ ...dados, ordem: proximaOrdem } as never);
    setSalvando(false);
    if (error) {
      setErro(mensagemErro(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: [config.tabela] });
    avisar(item ? 'Salvo' : `${config.singular} criado(a)`, 'sucesso');
    aoFechar();
  }

  async function apagar() {
    if (!item) return;
    const aviso =
      config.tabela === 'santos'
        ? `${usados} produto(s) vendem este santo e vão deixar de oferecê-lo.`
        : `${usados} produto(s) estão aqui e vão ficar sem ${config.singular.toLowerCase()}.`;
    if (!confirm(`Apagar "${item.nome}"? ${usados ? aviso : ''}\n\nSe for só esconder do app, desligue "No app".`)) return;
    const { error } = await tabela(config.tabela).delete().eq('id', item.id);
    if (error) {
      setErro(mensagemErro(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: [config.tabela] });
    avisar('Apagado', 'sucesso');
    aoFechar();
  }

  return (
    <Modal
      titulo={item ? `Editar ${config.singular.toLowerCase()}` : `Novo(a) ${config.singular.toLowerCase()}`}
      aoFechar={aoFechar}
      rodape={
        <>
          {item ? (
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
      <div className="form-grade">
        <Campo rotulo="Nome" className={config.temCodigo ? undefined : 'largo'}>
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Campo>
        {config.temCodigo ? (
          <Campo rotulo="Código" ajuda="Dois dígitos, como na planilha (ex.: 03).">
            <Entrada value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </Campo>
        ) : null}
      </div>
      <Campo
        rotulo="Foto"
        ajuda={config.tabela === 'catalogos' ? 'Capa do catálogo: 1600 × 900 px (proporção 16:9). O app mostra a imagem inteira nessa proporção e corta o que passar.' : undefined}>
        {config.tabela === 'catalogos' ? (
          <CampoImagem valor={foto} aoMudar={setFoto} pasta={config.pasta} proporcao="16 / 9" largura={320} ladoMax={1600} />
        ) : (
          <CampoImagem valor={foto} aoMudar={setFoto} pasta={config.pasta} ladoMax={1000} />
        )}
      </Campo>
      <Interruptor marcado={ativo} aoMudar={setAtivo} rotulo="Aparece no app" />
      {erro ? <div className="caixa-erro">{erro}</div> : null}
    </Modal>
  );
}

export function PaginaCategorias() {
  return (
    <PaginaCadastro
      config={{
        tabela: 'categorias',
        titulo: 'Categorias',
        singular: 'Categoria',
        descricao: 'As categorias da home e do menu do app, na ordem em que aparecem.',
        campoFoto: 'foto_url',
        pasta: 'categorias',
        filtroProdutos: 'categoria',
      }}
    />
  );
}

export function PaginaCatalogos() {
  return (
    <PaginaCadastro
      config={{
        tabela: 'catalogos',
        titulo: 'Catálogos',
        singular: 'Catálogo',
        descricao: 'Coleções sazonais (Dia das Mães, Quaresma...). Um produto pode estar num catálogo e numa categoria ao mesmo tempo.',
        campoFoto: 'imagem_url',
        pasta: 'catalogos',
        filtroProdutos: 'catalogo',
      }}
    />
  );
}

export function PaginaSantos() {
  return (
    <PaginaCadastro
      config={{
        tabela: 'santos',
        titulo: 'Santos',
        singular: 'Santo',
        descricao: 'Lista oficial de santos que o cliente escolhe nos produtos personalizáveis.',
        campoFoto: 'foto_url',
        pasta: 'santos',
        temCodigo: true,
      }}
    />
  );
}
