import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { Tabela } from '../componentes/tabela';
import { Abas, Botao, CabecalhoPagina, CaixaErro, Cartao, Carregando, Entrada, Etiqueta, Modal, Selecao, Vazio } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { dataHora } from '../lib/formato';
import { supabase } from '../lib/supabase';

// Programa de pontos: aprovar feedbacks (texto e vídeo), ver respostas do
// formulário, saldos dos clientes e trocas. As regras ficam no banco.
type Aba = 'feedbacks' | 'formularios' | 'clientes';
type Cliente = { nome: string | null; razao_social: string | null } | null;

const nomeCliente = (c: Cliente) => c?.razao_social || c?.nome || 'Cliente removido';

const PERGUNTAS: Record<string, string> = {
  nota_recomendacao: 'Nota de recomendação (0 a 10)',
  como_pedia_antes: 'Como pedia antes do app',
  frequencia_compra: 'Frequência de reposição',
  o_que_gosta: 'O que mais gosta',
  o_que_melhorar: 'O que melhorar',
  produtos_desejados: 'Produtos que gostaria de encontrar',
};

export function PaginaPontos() {
  const [aba, setAba] = useState<Aba>('feedbacks');
  const pendentes = useQuery({
    queryKey: ['pontos', 'pendentes'],
    queryFn: async () => {
      const { count, error } = await supabase.from('feedbacks').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Desconto de fidelidade"
        descricao="Pedido pago: +2% · formulário: +1% · feedback em vídeo aprovado: +1%. O desconto acumulado (máx. 4%) vale no próximo pedido do cliente e é consumido nele."
      />
      <Abas<Aba>
        abas={[
          { chave: 'feedbacks', rotulo: 'Feedbacks', contador: pendentes.data || undefined },
          { chave: 'formularios', rotulo: 'Formulários' },
          { chave: 'clientes', rotulo: 'Descontos' },
        ]}
        ativa={aba}
        aoMudar={setAba}
      />
      <div style={{ marginTop: 16 }}>
        {aba === 'feedbacks' ? <Feedbacks /> : aba === 'formularios' ? <Formularios /> : <Saldos />}
      </div>
    </>
  );
}

type FeedbackLinha = {
  id: string;
  tipo: string;
  texto: string | null;
  video_path: string | null;
  status: string;
  motivo_recusa: string | null;
  criado_em: string;
  perfis: Cliente;
};

function Feedbacks() {
  const [filtro, setFiltro] = useState<'pendente' | 'todos'>('pendente');
  const [recusando, setRecusando] = useState<FeedbackLinha | null>(null);
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  const lista = useQuery({
    queryKey: ['pontos', 'feedbacks', filtro],
    queryFn: async () => {
      let q = supabase
        .from('feedbacks')
        .select('id, tipo, texto, video_path, status, motivo_recusa, criado_em, perfis(nome, razao_social)')
        .order('criado_em', { ascending: false })
        .limit(100);
      if (filtro === 'pendente') q = q.eq('status', 'pendente');
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as FeedbackLinha[];
    },
  });

  const avaliar = useMutation({
    mutationFn: async ({ id, aprovar, motivo }: { id: string; aprovar: boolean; motivo?: string }) => {
      const { error } = await supabase.rpc('admin_avaliar_feedback', { p_id: id, p_aprovar: aprovar, p_motivo: motivo });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      avisar(v.aprovar ? 'Aprovado: pontos creditados e cliente avisado' : 'Recusado: cliente avisado', 'sucesso');
      setRecusando(null);
      queryClient.invalidateQueries({ queryKey: ['pontos'] });
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <>
      <div className="linha" style={{ gap: 8, marginBottom: 12 }}>
        <Botao pequeno variante={filtro === 'pendente' ? 'primario' : undefined} onClick={() => setFiltro('pendente')}>
          Para analisar
        </Botao>
        <Botao pequeno variante={filtro === 'todos' ? 'primario' : undefined} onClick={() => setFiltro('todos')}>
          Todos
        </Botao>
      </div>
      {lista.isLoading ? (
        <Carregando />
      ) : lista.error ? (
        <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />
      ) : !lista.data?.length ? (
        <div className="cartao">
          <Vazio icone="💬" titulo={filtro === 'pendente' ? 'Nenhum feedback esperando análise' : 'Nenhum feedback ainda'} />
        </div>
      ) : (
        <div className="pilha" style={{ gap: 12 }}>
          {lista.data.map((f) => (
            <Cartao key={f.id}>
              <div className="pilha" style={{ gap: 10 }}>
                <div className="linha entre" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <strong>
                    {f.tipo === 'video' ? '🎥 Vídeo' : '💬 Texto'} · {nomeCliente(f.perfis)}
                  </strong>
                  <div className="linha" style={{ gap: 8 }}>
                    <span className="texto-3 pequeno">{dataHora(f.criado_em)}</span>
                    {f.status === 'pendente' ? (
                      <Etiqueta tom="aviso">Para analisar</Etiqueta>
                    ) : f.status === 'aprovado' ? (
                      <Etiqueta tom="sucesso">Aprovado</Etiqueta>
                    ) : (
                      <Etiqueta tom="perigo">Recusado</Etiqueta>
                    )}
                  </div>
                </div>
                {f.tipo === 'texto' ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>“{f.texto}”</p> : <VideoFeedback caminho={f.video_path} />}
                <span className="texto-3 pequeno">✓ Cliente autorizou o uso para divulgação e marketing</span>
                {f.motivo_recusa ? <span className="texto-2 pequeno">Motivo da recusa: {f.motivo_recusa}</span> : null}
                {f.status === 'pendente' ? (
                  <div className="linha" style={{ gap: 8 }}>
                    <Botao
                      variante="primario"
                      carregando={avaliar.isPending && avaliar.variables?.id === f.id && avaliar.variables.aprovar}
                      onClick={() => avaliar.mutate({ id: f.id, aprovar: true })}>
                      Aprovar (+1% de desconto)
                    </Botao>
                    <Botao variante="perigo" onClick={() => setRecusando(f)}>
                      Recusar
                    </Botao>
                  </div>
                ) : null}
              </div>
            </Cartao>
          ))}
        </div>
      )}
      {recusando ? (
        <ModalRecusa
          aoFechar={() => setRecusando(null)}
          carregando={avaliar.isPending}
          aoConfirmar={(motivo) => avaliar.mutate({ id: recusando.id, aprovar: false, motivo })}
        />
      ) : null}
    </>
  );
}

function ModalRecusa({ aoFechar, aoConfirmar, carregando }: { aoFechar: () => void; aoConfirmar: (motivo: string) => void; carregando: boolean }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Modal
      titulo="Recusar feedback"
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="perigo" carregando={carregando} onClick={() => aoConfirmar(motivo)}>
            Recusar
          </Botao>
        </>
      }>
      <p className="texto-2">O cliente recebe uma notificação e pode enviar outro.</p>
      <Entrada value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional), ex.: vídeo sem áudio" />
    </Modal>
  );
}

// Vídeo fica em bucket privado: gera um link temporário (1 hora) para assistir.
function VideoFeedback({ caminho }: { caminho: string | null }) {
  const link = useQuery({
    queryKey: ['pontos', 'video', caminho],
    enabled: !!caminho,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('feedbacks').createSignedUrl(caminho as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!caminho) return <span className="texto-2">Vídeo não encontrado</span>;
  if (link.isLoading) return <Carregando texto="Carregando vídeo..." />;
  if (link.error || !link.data) return <CaixaErro erro={link.error} />;
  return (
    <div className="pilha" style={{ gap: 6 }}>
      <video src={link.data} controls style={{ width: '100%', maxWidth: 360, maxHeight: 480, borderRadius: 8, background: '#000' }} />
      <a href={link.data} target="_blank" rel="noreferrer" className="pequeno">
        Baixar vídeo
      </a>
    </div>
  );
}


type LinhaLink = { id: string; nome: string; empresa: string | null; contato: string; respostas: Record<string, string | number>; criado_em: string; vinculado_a: string | null };

// Respostas enviadas pela página pública /formulario.html (cliente que não usa o app).
// O admin vincula a um cliente: vira a resposta dele e ele ganha o desconto.
function RecebidasPeloLink() {
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const [vinculando, setVinculando] = useState<LinhaLink | null>(null);
  const lista = useQuery({
    queryKey: ['pontos', 'formulario-publico'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('formulario_publico').select('id, nome, empresa, contato, respostas, criado_em, vinculado_a').order('criado_em', { ascending: false });
      if (error) throw error;
      return data as unknown as LinhaLink[];
    },
  });
  const clientes = useQuery({
    queryKey: ['pontos', 'clientes-para-vincular'],
    enabled: !!vinculando,
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('id, nome, razao_social, codigo').eq('tipo', 'cliente').order('razao_social');
      if (error) throw error;
      return data;
    },
  });
  const [escolhido, setEscolhido] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!lista.data?.length) return null;

  async function vincular() {
    if (!vinculando || !escolhido) return avisar('Escolha o cliente.', 'erro');
    setSalvando(true);
    const { error } = await supabase.rpc('admin_vincular_formulario', { p_id: vinculando.id, p_usuario: escolhido });
    setSalvando(false);
    if (error) return avisar(mensagemErro(error), 'erro');
    avisar('Vinculado: o cliente ganhou +1% de desconto e foi avisado.', 'sucesso');
    setVinculando(null);
    setEscolhido('');
    queryClient.invalidateQueries({ queryKey: ['pontos'] });
  }

  return (
    <>
      <Cartao titulo={`Recebidas pelo link (${lista.data.length})`}>
        <p className="texto-2 pequeno" style={{ marginTop: 0 }}>
          Link para mandar: <strong>https://raiodeluz-painel.expo.app/formulario.html</strong>
        </p>
        <div className="pilha" style={{ gap: 14 }}>
          {lista.data.map((r) => (
            <div key={r.id} className="pilha" style={{ gap: 6, borderTop: '1px solid #E5E6EC', paddingTop: 10 }}>
              <div className="linha entre">
                <div>
                  <strong>{r.nome}</strong>
                  {r.empresa ? ` · ${r.empresa}` : ''}
                  <div className="texto-3 pequeno">
                    {r.contato} · {dataHora(r.criado_em)}
                  </div>
                </div>
                {r.vinculado_a ? (
                  <Etiqueta tom="sucesso">Vinculado</Etiqueta>
                ) : (
                  <Botao pequeno variante="primario" onClick={() => setVinculando(r)}>
                    Vincular a cliente
                  </Botao>
                )}
              </div>
              {Object.entries(PERGUNTAS).map(([chave, rotulo]) =>
                r.respostas[chave] !== undefined && r.respostas[chave] !== '' ? (
                  <div key={chave}>
                    <span className="texto-2 pequeno">{rotulo}</span>
                    <div>{String(r.respostas[chave])}</div>
                  </div>
                ) : null,
              )}
            </div>
          ))}
        </div>
      </Cartao>
      {vinculando ? (
        <Modal
          titulo="Vincular a um cliente"
          aoFechar={() => setVinculando(null)}
          rodape={
            <>
              <Botao onClick={() => setVinculando(null)}>Cancelar</Botao>
              <Botao variante="primario" carregando={salvando} onClick={vincular}>
                Vincular e dar +1%
              </Botao>
            </>
          }>
          <p className="texto-2" style={{ marginTop: 0 }}>
            Respostas de <strong>{vinculando.nome}</strong> ({vinculando.contato}). Escolha o cliente que vai receber o desconto:
          </p>
          <Selecao value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
            <option value="">Escolha...</option>
            {(clientes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.razao_social || c.nome} · {c.nome} {c.codigo ? `(${c.codigo})` : ''}
              </option>
            ))}
          </Selecao>
        </Modal>
      ) : null}
    </>
  );
}

type RespostaLinha = { id: string; respostas: Record<string, string | number>; criado_em: string; perfis: Cliente };

function Formularios() {
  const lista = useQuery({
    queryKey: ['pontos', 'formularios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formulario_respostas')
        .select('id, respostas, criado_em, perfis(nome, razao_social)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as unknown as RespostaLinha[];
    },
  });
  if (lista.isLoading) return <Carregando />;
  if (lista.error) return <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />;
  if (!lista.data?.length)
    return (
      <div className="pilha" style={{ gap: 12 }}>
        <RecebidasPeloLink />
        <div className="cartao">
          <Vazio icone="📋" titulo="Ninguém respondeu ainda dentro do app" />
        </div>
      </div>
    );
  const notas = lista.data.map((r) => Number(r.respostas.nota_recomendacao)).filter((n) => !Number.isNaN(n));
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  return (
    <div className="pilha" style={{ gap: 12 }}>
      <RecebidasPeloLink />
      <Cartao>
        <strong>{lista.data.length} respostas</strong>
        {media !== null ? <span className="texto-2"> · nota média de recomendação: {media.toFixed(1)}</span> : null}
      </Cartao>
      {lista.data.map((r) => (
        <Cartao key={r.id} titulo={`${nomeCliente(r.perfis)} · ${dataHora(r.criado_em)}`}>
          <div className="pilha" style={{ gap: 6 }}>
            {Object.entries(PERGUNTAS).map(([chave, rotulo]) =>
              r.respostas[chave] !== undefined && r.respostas[chave] !== '' ? (
                <div key={chave}>
                  <span className="texto-2 pequeno">{rotulo}</span>
                  <div>{String(r.respostas[chave])}</div>
                </div>
              ) : null,
            )}
          </div>
        </Cartao>
      ))}
    </div>
  );
}

type MovLinha = { usuario_id: string; pontos: number; perfis: Cliente };
type SaldoLinha = { id: string; cliente: string; saldo: number; ganhos: number };

function Saldos() {
  const lista = useQuery({
    queryKey: ['pontos', 'saldos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pontos_movimentos').select('usuario_id, pontos, perfis(nome, razao_social)').limit(10000);
      if (error) throw error;
      const mapa = new Map<string, SaldoLinha>();
      for (const m of data as unknown as MovLinha[]) {
        const s = mapa.get(m.usuario_id) ?? { id: m.usuario_id, cliente: nomeCliente(m.perfis), saldo: 0, ganhos: 0 };
        s.saldo += m.pontos;
        if (m.pontos > 0) s.ganhos += m.pontos;
        mapa.set(m.usuario_id, s);
      }
      return [...mapa.values()];
    },
  });
  if (lista.isLoading) return <Carregando />;
  if (lista.error) return <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />;
  return (
    <Tabela<SaldoLinha>
      linhas={lista.data ?? []}
      chaveLinha={(l) => l.id}
      ordemInicial={{ chave: 'saldo', desc: true }}
      vazio={<Vazio icone="🏆" titulo="Nenhum cliente com desconto ainda" />}
      colunas={[
        { chave: 'cliente', titulo: 'Cliente', celula: (l) => l.cliente, ordenar: (l) => l.cliente },
        { chave: 'saldo', titulo: 'Desconto acumulado', celula: (l) => <strong>{Math.min(Math.max(l.saldo, 0), 7)}%</strong>, ordenar: (l) => l.saldo, classe: 'direita' },
        { chave: 'ganhos', titulo: 'Total já ganho', celula: (l) => `${l.ganhos}%`, ordenar: (l) => l.ganhos, classe: 'direita' },
      ]}
    />
  );
}
