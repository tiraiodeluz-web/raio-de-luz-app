import { useQuery } from '@tanstack/react-query';

import { CaixaErro, Carregando, Cartao, Vazio } from '../componentes/ui';
import { dataHora } from '../lib/formato';
import { supabase } from '../lib/supabase';

type Mensagem = {
  id: string;
  papel: string;
  texto: string;
  foto_base64: string | null;
  produtos: { id: string; sku: string; nome: string }[] | null;
  acoes: string[] | null;
  criado_em: string;
};

// Conversa do cliente com a RDL AI. O app só guarda 24 horas úteis (segunda a
// sexta); depois disso o servidor apaga tudo, inclusive as fotos.
export function ConversasIa({ usuarioId }: { usuarioId: string }) {
  const consulta = useQuery({
    queryKey: ['conversas-ia', usuarioId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistente_mensagens')
        .select('id, papel, texto, foto_base64, produtos, acoes, criado_em')
        .eq('usuario_id', usuarioId)
        .order('criado_em', { ascending: true })
        .limit(300);
      if (error) throw error;
      return data as unknown as Mensagem[];
    },
  });

  return (
    <Cartao titulo="Conversas com a RDL AI (últimas 24 horas úteis)">
      {consulta.isLoading ? (
        <Carregando />
      ) : consulta.error ? (
        <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />
      ) : (consulta.data ?? []).length === 0 ? (
        <Vazio icone="🤖" titulo="Nenhuma conversa guardada">
          As mensagens ficam aqui por 24 horas úteis depois de enviadas e então são apagadas.
        </Vazio>
      ) : (
        <div className="pilha" style={{ gap: 10, maxHeight: 480, overflowY: 'auto' }}>
          {(consulta.data ?? []).map((m) => {
            const cliente = m.papel === 'cliente';
            return (
              <div key={m.id} style={{ alignSelf: cliente ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div
                  style={{
                    background: cliente ? '#010534' : '#F0F1F5',
                    color: cliente ? '#ffffff' : 'inherit',
                    borderRadius: 14,
                    padding: '8px 12px',
                    whiteSpace: 'pre-wrap',
                  }}>
                  {m.foto_base64 ? (
                    <a href={`data:image/jpeg;base64,${m.foto_base64}`} target="_blank" rel="noreferrer">
                      <img src={`data:image/jpeg;base64,${m.foto_base64}`} alt="Foto enviada pelo cliente" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, display: 'block', marginBottom: m.texto ? 6 : 0 }} />
                    </a>
                  ) : null}
                  {m.texto}
                </div>
                {m.produtos && m.produtos.length > 0 ? (
                  <div className="texto-3 pequeno" style={{ marginTop: 4 }}>
                    Produtos mostrados: {m.produtos.map((p) => `${p.nome} (${p.sku})`).join(' · ')}
                  </div>
                ) : null}
                {m.acoes && m.acoes.length > 0 ? (
                  <div className="pequeno" style={{ marginTop: 4, color: 'var(--sucesso)' }}>
                    {m.acoes.map((a, i) => (
                      <div key={i}>✔ {a}</div>
                    ))}
                  </div>
                ) : null}
                <div className="texto-3 pequeno" style={{ marginTop: 2, textAlign: cliente ? 'right' : 'left' }}>
                  {cliente ? 'Cliente' : 'RDL AI'} · {dataHora(m.criado_em)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Cartao>
  );
}
