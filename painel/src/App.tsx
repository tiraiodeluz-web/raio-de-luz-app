import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { Estrutura } from './componentes/estrutura';
import { Carregando } from './componentes/ui';
import { useSessao } from './lib/sessao';
import { PaginaBanners } from './paginas/banners';
import { PaginaCatalogos, PaginaCategorias, PaginaSantos } from './paginas/cadastros';
import { PaginaCliente } from './paginas/cliente';
import { PaginaClientes } from './paginas/clientes';
import { PaginaCupons } from './paginas/cupons';
import { PaginaCustoIa } from './paginas/custo-ia';
import { PaginaErros } from './paginas/erros';
import { PaginaKits } from './paginas/kits';
import { PaginaInicio } from './paginas/inicio';
import { PaginaLogin } from './paginas/login';
import { PaginaNotificacoes } from './paginas/notificacoes';
import { PaginaPedido } from './paginas/pedido';
import { PaginaPedidos } from './paginas/pedidos';
import { PaginaProduto } from './paginas/produto';
import { PaginaProdutos } from './paginas/produtos';
import { PaginaRelatorios } from './paginas/relatorios';

// A importação traz o leitor de .xlsx (pesado): só carrega quando abrir a tela.
const PaginaImportar = lazy(() => import('./paginas/importar').then((m) => ({ default: m.PaginaImportar })));

export function App() {
  const { session, perfil, carregando } = useSessao();

  if (carregando) return <Carregando texto="Abrindo o painel..." />;
  if (!session || perfil?.tipo !== 'admin') return <PaginaLogin />;

  return (
    <Routes>
      <Route element={<Estrutura />}>
        <Route index element={<PaginaInicio />} />
        <Route path="pedidos" element={<PaginaPedidos />} />
        <Route path="pedidos/:id" element={<PaginaPedido />} />
        <Route path="clientes" element={<PaginaClientes />} />
        <Route path="clientes/:id" element={<PaginaCliente />} />
        <Route path="cupons" element={<PaginaCupons />} />
        <Route path="produtos" element={<PaginaProdutos />} />
        <Route path="produtos/:id" element={<PaginaProduto />} />
        <Route
          path="importar"
          element={
            <Suspense fallback={<Carregando />}>
              <PaginaImportar />
            </Suspense>
          }
        />
        <Route path="categorias" element={<PaginaCategorias />} />
        <Route path="catalogos" element={<PaginaCatalogos />} />
        <Route path="santos" element={<PaginaSantos />} />
        <Route path="notificacoes" element={<PaginaNotificacoes />} />
        <Route path="kits" element={<PaginaKits />} />
        <Route path="banners" element={<PaginaBanners />} />
        <Route path="relatorios" element={<PaginaRelatorios />} />
        <Route path="custo-ia" element={<PaginaCustoIa />} />
        <Route path="erros" element={<PaginaErros />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
