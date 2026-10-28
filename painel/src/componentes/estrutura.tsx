import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { useContadoresMenu } from '../lib/dados';
import { useSessao } from '../lib/sessao';

type Item = { para: string; rotulo: string; icone: string; contador?: number };

export function Estrutura() {
  const { perfil, session, sair } = useSessao();
  const { data: contadores } = useContadoresMenu();
  const [aberta, setAberta] = useState(false);
  const local = useLocation();

  useEffect(() => setAberta(false), [local.pathname]);

  const grupos: { titulo: string; itens: Item[] }[] = [
    { titulo: 'Visão geral', itens: [{ para: '/', rotulo: 'Início', icone: '🏠' }] },
    {
      titulo: 'Vendas',
      itens: [
        { para: '/pedidos', rotulo: 'Pedidos', icone: '🧾', contador: contadores?.pedidosNovos },
        { para: '/clientes', rotulo: 'Clientes', icone: '👥', contador: contadores?.clientesPendentes },
        { para: '/cupons', rotulo: 'Cupons', icone: '🏷️' },
      ],
    },
    {
      titulo: 'Catálogo',
      itens: [
        { para: '/produtos', rotulo: 'Produtos', icone: '📦' },
        { para: '/importar', rotulo: 'Importar planilha', icone: '📥' },
        { para: '/categorias', rotulo: 'Categorias', icone: '🗂️' },
        { para: '/catalogos', rotulo: 'Catálogos', icone: '📚' },
        { para: '/santos', rotulo: 'Santos', icone: '✝️' },
        { para: '/kits', rotulo: 'Kits', icone: '🎁' },
        { para: '/banners', rotulo: 'Banners da home', icone: '🖼️' },
      ],
    },
    {
      titulo: 'Análises',
      itens: [
        { para: '/relatorios', rotulo: 'Relatórios', icone: '📊' },
        { para: '/custo-ia', rotulo: 'Custo da IA', icone: '🤖' },
        { para: '/erros', rotulo: 'Erros do app', icone: '🐞' },
      ],
    },
  ];

  return (
    <div className="estrutura">
      {aberta ? <div className="fundo-lateral" onClick={() => setAberta(false)} /> : null}
      <aside className={`lateral ${aberta ? 'aberta' : ''}`}>
        <div className="lateral-marca">
          <img src="./logo.png" alt="" />
          <div>
            <strong>Raio de Luz</strong>
            <span>Painel administrativo</span>
          </div>
        </div>
        <nav>
          {grupos.map((g) => (
            <div key={g.titulo} className="lateral-grupo">
              <div className="lateral-grupo-titulo">{g.titulo}</div>
              {g.itens.map((i) => (
                <NavLink key={i.para} to={i.para} end={i.para === '/'} className={({ isActive }) => `lateral-link ${isActive ? 'ativo' : ''}`}>
                  <span className="icone">{i.icone}</span>
                  {i.rotulo}
                  {i.contador ? <span className="contador">{i.contador}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="lateral-rodape">
          <div className="usuario">{perfil?.razao_social || perfil?.nome || 'Admin'}</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.user.email}</div>
          <button onClick={sair}>Sair</button>
        </div>
      </aside>
      <div className="principal">
        <div className="barra-topo">
          <button onClick={() => setAberta(true)} aria-label="Abrir menu">
            ☰
          </button>
          <strong>Raio de Luz · Painel</strong>
        </div>
        <main className="conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
