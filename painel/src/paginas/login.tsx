import { useState, type FormEvent } from 'react';

import { Botao, Campo, Entrada } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { useSessao } from '../lib/sessao';
import { supabase } from '../lib/supabase';

export function PaginaLogin() {
  const { session, perfil, sair } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setErro(mensagemErro(error));
  }

  // Logado, mas não é admin (cliente tentando entrar no painel).
  if (session && perfil && perfil.tipo !== 'admin') {
    return (
      <div className="login">
        <div className="login-cartao">
          <img src="./logo.png" alt="" />
          <h1>Acesso restrito</h1>
          <p>O painel é só para administradores da Raio de Luz. Use o app para fazer pedidos.</p>
          <Botao variante="primario" onClick={sair}>
            Entrar com outra conta
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login-cartao" onSubmit={entrar}>
        <img src="./logo.png" alt="" />
        <h1>Painel Raio de Luz</h1>
        <p>Entre com o mesmo e-mail e senha de administrador do app.</p>
        <Campo rotulo="E-mail">
          <Entrada type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        {erro ? <div className="caixa-erro">{erro}</div> : null}
        <Botao type="submit" variante="primario" carregando={entrando}>
          Entrar
        </Botao>
      </form>
    </div>
  );
}
