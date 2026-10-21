import { useMemo, useState, type ReactNode } from 'react';

import { Vazio } from './ui';

export type Coluna<T> = {
  chave: string;
  titulo: ReactNode;
  celula: (linha: T) => ReactNode;
  ordenar?: (linha: T) => string | number | null | undefined;
  classe?: string;
};

// Tabela com ordenação por coluna (clique no título) feita no navegador.
export function Tabela<T>({
  linhas,
  colunas,
  chaveLinha,
  aoClicar,
  ordemInicial,
  vazio,
  limite,
}: {
  linhas: T[];
  colunas: Coluna<T>[];
  chaveLinha: (l: T) => string;
  aoClicar?: (l: T) => void;
  ordemInicial?: { chave: string; desc?: boolean };
  vazio?: ReactNode;
  limite?: number;
}) {
  const [ordem, setOrdem] = useState(ordemInicial);
  const ordenadas = useMemo(() => {
    const coluna = colunas.find((c) => c.chave === ordem?.chave);
    if (!coluna?.ordenar) return linhas;
    const f = coluna.ordenar;
    return [...linhas].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
      return ordem?.desc ? -r : r;
    });
  }, [linhas, colunas, ordem]);
  const visiveis = limite ? ordenadas.slice(0, limite) : ordenadas;

  if (linhas.length === 0) return <>{vazio ?? <Vazio titulo="Nada por aqui" />}</>;

  return (
    <div className="tabela-caixa">
      <table className="tabela">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th
                key={c.chave}
                className={[c.classe, c.ordenar && 'ordenavel'].filter(Boolean).join(' ')}
                onClick={c.ordenar ? () => setOrdem((o) => ({ chave: c.chave, desc: o?.chave === c.chave ? !o.desc : true })) : undefined}>
                {c.titulo}
                {ordem?.chave === c.chave ? (ordem.desc ? ' ↓' : ' ↑') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((l) => (
            <tr key={chaveLinha(l)} className={aoClicar ? 'clicavel' : undefined} onClick={aoClicar ? () => aoClicar(l) : undefined}>
              {colunas.map((c) => (
                <td key={c.chave} className={c.classe}>
                  {c.celula(l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {limite && ordenadas.length > limite ? (
        <div className="paginacao">Mostrando {limite} de {ordenadas.length}. Exporte para ver todos.</div>
      ) : null}
    </div>
  );
}
