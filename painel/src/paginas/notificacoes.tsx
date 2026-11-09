import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { CampoImagem } from '../componentes/campo-imagem';
import { montarRota, SeletorLink, type TipoLinkInterno } from '../componentes/seletor-link';
import { ROTULOS_PUBLICO, SeletorPublico, usePrevia, type Publico } from '../componentes/seletor-publico';
import { AreaTexto, Botao, CabecalhoPagina, Campo, CaixaErro, Cartao, Carregando, Entrada, Vazio } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { dataHora } from '../lib/formato';
import { urlImagem } from '../lib/imagens';
import { supabase } from '../lib/supabase';

export function PaginaNotificacoes() {
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [legenda, setLegenda] = useState('');
  const [corpo, setCorpo] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [tipoLink, setTipoLink] = useState<TipoLinkInterno>('nenhum');
  const [valorLink, setValorLink] = useState('');
  const [publico, setPublico] = useState<Publico>({ tipo: 'todos' });
  const previa = usePrevia(publico);
  const [erro, setErro] = useState<string | null>(null);

  const historico = useQuery({
    queryKey: ['notificacoes-enviadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('id, titulo, corpo, imagem_url, rota_destino, criado_em')
        .is('destinatario_id', null)
        .is('evento', null)
        .order('criado_em', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_enviar_notificacao', {
        p_titulo: titulo,
        p_corpo: corpo,
        p_legenda: legenda,
        p_imagem_url: imagem ?? '',
        p_rota: montarRota(tipoLink, valorLink) ?? '',
        p_publico: publico,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      setTitulo('');
      setLegenda('');
      setCorpo('');
      setImagem(null);
      setTipoLink('nenhum');
      setValorLink('');
      queryClient.invalidateQueries({ queryKey: ['notificacoes-enviadas'] });
      avisar(`Notificação enviada para ${n} cliente(s)`, 'sucesso');
    },
    onError: (e) => setErro(mensagemErro(e)),
  });

  function confirmar() {
    setErro(null);
    if (!titulo.trim() || !corpo.trim()) return setErro('Preencha ao menos o título e a mensagem.');
    if (tipoLink !== 'nenhum' && !valorLink) return setErro('Escolha pra onde a notificação leva, ou deixe em "Só o app".');
    if (publico.tipo === 'cliente' && !publico.cliente_id) return setErro('Escolha o cliente.');
    if (publico.tipo === 'regiao' && !publico.uf && !publico.cidade) return setErro('Escolha o estado ou a cidade.');
    const total = previa.data?.total;
    if (total === 0) return setErro('Nenhum cliente nesse público. Mude o filtro.');
    if (!confirm(`Enviar essa notificação agora para ${total ?? 'os'} cliente(s) (${ROTULOS_PUBLICO[publico.tipo]})? Não dá pra desfazer.`)) return;
    enviar.mutate();
  }

  return (
    <>
      <CabecalhoPagina titulo="Enviar notificação" descricao="Aviso que chega no celular dos clientes escolhidos e fica salvo no sininho do app." />
      <div className="grade grade-2" style={{ alignItems: 'start' }}>
        <Cartao titulo="Nova notificação">
          <div className="pilha" style={{ gap: 12 }}>
            <Campo rotulo="Título">
              <Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Novidades de Natal chegaram!" maxLength={80} />
            </Campo>
            <Campo rotulo="Subtítulo (opcional)">
              <Entrada value={legenda} onChange={(e) => setLegenda(e.target.value)} />
            </Campo>
            <Campo rotulo="Mensagem">
              <AreaTexto rows={4} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Texto que aparece embaixo do título" />
            </Campo>
            <Campo rotulo="Imagem (opcional, 16:9)">
              <CampoImagem valor={imagem} aoMudar={setImagem} pasta="notificacoes" proporcao="16 / 9" largura={320} ladoMax={1200} />
            </Campo>
            <SeletorPublico publico={publico} aoMudar={setPublico} />
            <div className="caixa-aviso">
              {previa.isFetching ? (
                'Contando clientes...'
              ) : previa.data ? (
                <>
                  <strong>{previa.data.total} cliente(s)</strong> vão receber
                  {previa.data.amostra.length ? <span className="texto-2"> · ex.: {previa.data.amostra.join(', ')}</span> : null}
                </>
              ) : (
                'Complete o filtro para ver quantos clientes recebem.'
              )}
            </div>
            <SeletorLink tipo={tipoLink} valor={valorLink} aoMudar={(t, v) => { setTipoLink(t); setValorLink(v); }} />
            {erro ? <div className="caixa-erro">{erro}</div> : null}
            <div className="linha">
              <Botao variante="primario" onClick={confirmar} carregando={enviar.isPending}>
                Enviar notificação
              </Botao>
            </div>
          </div>
        </Cartao>
        <Cartao titulo="Enviadas recentemente" semCorpo>
          {historico.isLoading ? (
            <Carregando />
          ) : historico.error ? (
            <CaixaErro erro={historico.error} tentarDeNovo={() => historico.refetch()} />
          ) : !historico.data?.length ? (
            <Vazio icone="🔔" titulo="Nada enviado ainda" />
          ) : (
            <div className="pilha" style={{ gap: 0 }}>
              {historico.data.map((n) => (
                <div key={n.id} className="linha" style={{ gap: 12, padding: 14, borderBottom: '1px solid var(--borda, #E5E6EC)', alignItems: 'flex-start' }}>
                  {n.imagem_url ? <img src={urlImagem(n.imagem_url, 'miniatura')} alt="" style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 6 }} /> : null}
                  <div style={{ flex: 1 }}>
                    <strong>{n.titulo}</strong>
                    <div className="texto-2 pequeno">{n.corpo}</div>
                    <div className="texto-3 pequeno">
                      {dataHora(n.criado_em)}
                      {n.rota_destino ? ' · 🔗 com link' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Cartao>
      </div>
    </>
  );
}
