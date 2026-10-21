import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type TipoAviso = 'normal' | 'sucesso' | 'erro';
type Aviso = { id: number; texto: string; tipo: TipoAviso };

const Contexto = createContext<(texto: string, tipo?: TipoAviso) => void>(() => {});

// Mensagens rápidas no canto da tela ("Produto salvo", "Erro ao salvar"...).
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const avisar = useCallback((texto: string, tipo: TipoAviso = 'normal') => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'erro' ? 7000 : 3500);
  }, []);
  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso ${a.tipo}`}>
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export const useAvisar = () => useContext(Contexto);
