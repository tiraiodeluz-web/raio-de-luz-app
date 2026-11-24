import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { Tabela } from '../componentes/tabela';
import { Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Entrada, Etiqueta, Vazio } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { data } from '../lib/formato';
import { useSessao } from '../lib/sessao';
import { supabase } from '../lib/supabase';

type Admin = { id: string; nome: string; razao_social: string | null; codigo: string | null; criado_em: string };

// "Minha conta" (meu nome e e-mail de login) + quem tem acesso de administrador.
export function PaginaEquipe() {
  const { session, perfil } = useSessao();
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  const admins = useQuery({
    queryKey: ['admins-painel'],
    queryFn: async () => {
      const { data: linhas, error } = await supabase.from('perfis').select('id, nome, razao_social, codigo, criado_em').eq('tipo', 'admin').order('nome');
      if (error) throw error;
      return linhas as Admin[];
    },
  });

  const [meuNome, setMeuNome] = useState<string | null>(null);
  const [novoEmail, setNovoEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);

  const nomeAtual = meuNome ?? perfil?.nome ?? '';
  const emailAtual = session?.user.email ?? '';

  async function salvarMeuNome() {
    const nome = nomeAtual.trim();
    if (!nome || !perfil) return avisar('Informe o nome.', 'erro');
    setSalvando(true);
    const { error } = await supabase.from('perfis').update({ nome }).eq('id', perfil.id);
    setSalvando(false);
    if (error) return avisar(mensagemErro(error), 'erro');
    avisar('Nome salvo. Ele aparece no painel na próxima vez que você entrar.', 'sucesso');
    setMeuNome(null);
    queryClient.invalidateQueries({ queryKey: ['admins-painel'] });
  }

  async function trocarEmail() {
    const email = novoEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return avisar('E-mail inválido.', 'erro');
    if (email === emailAtual.toLowerCase()) return avisar('Esse já é o seu e-mail de login.', 'erro');
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSalvando(false);
    if (error) return avisar(mensagemErro(error), 'erro');
    avisar('Enviamos um link de confirmação. A troca só vale depois de abrir o link (confira também o e-mail atual).', 'sucesso');
    setNovoEmail('');
  }

  async function salvarNomeOutro() {
    if (!editando) return;
    const nome = editando.nome.trim();
    if (!nome) return avisar('Informe o nome.', 'erro');
    const { error } = await supabase.from('perfis').update({ nome }).eq('id', editando.id);
    if (error) return avisar(mensagemErro(error), 'erro');
    avisar('Nome salvo', 'sucesso');
    setEditando(null);
    queryClient.invalidateQueries({ queryKey: ['admins-painel'] });
  }

  async function tirarAcesso(a: Admin) {
    if (!confirm(`Tirar o acesso de administrador de ${a.nome}? Ele passa a ver o app só como cliente e não entra mais neste painel.`)) return;
    const { error } = await supabase.from('perfis').update({ tipo: 'cliente' }).eq('id', a.id);
    if (error) return avisar(mensagemErro(error), 'erro');
    avisar(`${a.nome} agora é cliente`, 'sucesso');
    queryClient.invalidateQueries({ queryKey: ['admins-painel'] });
    queryClient.invalidateQueries({ queryKey: ['clientes-painel'] });
  }

  return (
    <>
      <CabecalhoPagina titulo="Equipe e minha conta" descricao="Troque seu nome e e-mail de login e veja quem pode usar o app e este painel como administrador." />
      <div className="pilha g">
        <Cartao titulo="Minha conta">
          <div className="pilha">
            <Campo rotulo="Meu nome">
              <Entrada value={nomeAtual} onChange={(e) => setMeuNome(e.target.value)} />
            </Campo>
            {meuNome !== null && meuNome.trim() !== (perfil?.nome ?? '') ? (
              <div>
                <Botao variante="primario" carregando={salvando} onClick={salvarMeuNome}>
                  Salvar nome
                </Botao>
              </div>
            ) : null}
            <Campo rotulo="E-mail de login (usuário)" ajuda={`Hoje: ${emailAtual}. Ao trocar, o Supabase manda um link de confirmação para o novo e-mail e para o atual. Até confirmar, você continua entrando com o e-mail antigo.`}>
              <Entrada type="email" placeholder="novo@email.com" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} autoComplete="off" />
            </Campo>
            {novoEmail.trim() ? (
              <div>
                <Botao variante="primario" carregando={salvando} onClick={trocarEmail}>
                  Trocar e-mail de login
                </Botao>
              </div>
            ) : null}
          </div>
        </Cartao>

        <Cartao titulo="Administradores" semCorpo>
          {admins.isLoading ? (
            <Carregando />
          ) : admins.error ? (
            <div className="cartao-corpo">
              <CaixaErro erro={admins.error} tentarDeNovo={() => admins.refetch()} />
            </div>
          ) : (
            <Tabela
              linhas={admins.data ?? []}
              chaveLinha={(a) => a.id}
              vazio={<Vazio icone="🛡️" titulo="Nenhum administrador" />}
              colunas={[
                {
                  chave: 'nome',
                  titulo: 'Nome',
                  ordenar: (a) => a.nome,
                  celula: (a) =>
                    editando?.id === a.id ? (
                      <div className="linha" style={{ flexWrap: 'nowrap' }}>
                        <Entrada value={editando.nome} onChange={(e) => setEditando({ id: a.id, nome: e.target.value })} autoFocus />
                        <Botao pequeno variante="primario" onClick={salvarNomeOutro}>
                          Salvar
                        </Botao>
                        <Botao pequeno onClick={() => setEditando(null)}>
                          Cancelar
                        </Botao>
                      </div>
                    ) : (
                      <div>
                        <div className="forte">
                          {a.nome} {a.id === perfil?.id ? <Etiqueta tom="info">você</Etiqueta> : null}
                        </div>
                        <div className="texto-3 pequeno">
                          {a.razao_social || ''}
                          {a.codigo ? ` · cód. ${a.codigo}` : ''}
                        </div>
                      </div>
                    ),
                },
                { chave: 'desde', titulo: 'Cadastro', ordenar: (a) => a.criado_em, celula: (a) => data(a.criado_em) },
                {
                  chave: 'acoes',
                  titulo: '',
                  classe: 'estreito',
                  celula: (a) => (
                    <div className="linha" style={{ flexWrap: 'nowrap' }}>
                      <Botao pequeno onClick={() => setEditando({ id: a.id, nome: a.nome })}>
                        Editar nome
                      </Botao>
                      {a.id !== perfil?.id ? (
                        <Botao pequeno variante="perigo" onClick={() => tirarAcesso(a)}>
                          Tirar acesso de admin
                        </Botao>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Cartao>
        <p className="texto-3 pequeno">Para dar acesso de administrador a alguém, abra o cliente em Clientes e ligue a opção "Acesso de administrador".</p>
      </div>
    </>
  );
}
