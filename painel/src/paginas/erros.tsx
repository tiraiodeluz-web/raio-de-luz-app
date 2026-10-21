import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { Botao, CabecalhoPagina, CaixaErro, Carregando, Cartao, Etiqueta, Vazio } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { dataHora } from '../lib/formato';
import { supabase } from '../lib/supabase';

type ErroApp = {
  id: string;
  criado_em: string;
  mensagem: string;
  stack: string | null;
  tela: string | null;
  origem: string;
  fatal: boolean;
  plataforma: string | null;
  versao_app: string | null;
  perfis: { nome: string; razao_social: string | null } | null;
};

// Mesma lista do Admin → Erros do app, com mais espaço pra ler o detalhe.
export function PaginaErros() {
  const [aberto, setAberto] = useState<string | null>(null);
  const avisar = useAvisar();
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ['erros-app'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erros_app')
        .select('id, criado_em, mensagem, stack, tela, origem, fatal, plataforma, versao_app, perfis ( nome, razao_social )')
        .order('criado_em', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as ErroApp[];
    },
  });
  const apagar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('erros_app').delete().not('id', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erros-app'] });
      avisar('Lista zerada', 'sucesso');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Erros do app"
        descricao="Problemas que aconteceram nos celulares dos clientes. Em vermelho, os que travaram a tela."
        acoes={
          consulta.data?.length ? (
            <Botao variante="perigo" carregando={apagar.isPending} onClick={() => confirm('Apagar todos os erros? Use depois de corrigir os problemas.') && apagar.mutate()}>
              Apagar todos
            </Botao>
          ) : null
        }
      />
      {consulta.isLoading ? (
        <Carregando />
      ) : consulta.error ? (
        <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />
      ) : !consulta.data?.length ? (
        <Cartao>
          <Vazio icone="✅" titulo="Nenhum erro registrado" />
        </Cartao>
      ) : (
        <div className="pilha">
          {consulta.data.map((e) => (
            <div key={e.id} className="cartao" style={{ borderColor: e.fatal ? '#efb4b4' : undefined, cursor: 'pointer' }} onClick={() => setAberto(aberto === e.id ? null : e.id)}>
              <div className="cartao-corpo pilha" style={{ gap: 6 }}>
                <div className="linha entre">
                  <strong className={aberto === e.id ? '' : 'truncar'} style={{ maxWidth: '75%' }}>
                    {e.mensagem}
                  </strong>
                  {e.fatal ? <Etiqueta tom="perigo">travou a tela</Etiqueta> : <Etiqueta>{e.origem}</Etiqueta>}
                </div>
                <span className="texto-2 pequeno">
                  {dataHora(e.criado_em)} · {e.tela ?? 'tela desconhecida'} · {e.perfis?.razao_social || e.perfis?.nome || 'sem login'} · {e.plataforma ?? '?'} · v{e.versao_app ?? '?'}
                </span>
                {aberto === e.id && e.stack ? <pre className="mono">{e.stack}</pre> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
