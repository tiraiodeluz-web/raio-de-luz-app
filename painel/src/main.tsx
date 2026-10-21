import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';

import { App } from './App';
import { AvisosProvider } from './componentes/avisos';
import { SessaoProvider } from './lib/sessao';
import './estilos.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessaoProvider>
        <AvisosProvider>
          {/* Rotas com "#" (ex.: /#/produtos) funcionam em qualquer hospedagem estática. */}
          <HashRouter>
            <App />
          </HashRouter>
        </AvisosProvider>
      </SessaoProvider>
    </QueryClientProvider>
  </StrictMode>,
);
