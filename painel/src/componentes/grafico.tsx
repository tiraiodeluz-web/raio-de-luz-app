import type { ReactNode } from 'react';

export type PontoGrafico = { rotulo: string; valor: number; dica: ReactNode };

// Colunas simples (uma por dia); passa o mouse pra ver o valor exato.
export function GraficoBarras({ dados, altura = 180 }: { dados: PontoGrafico[]; altura?: number }) {
  const maximo = Math.max(...dados.map((d) => d.valor), 0);
  const passo = Math.max(1, Math.ceil(dados.length / 8));
  return (
    <div>
      <div className="grafico" style={{ height: altura }}>
        {dados.map((d) => (
          <div key={d.rotulo} className={`coluna ${d.valor === 0 ? 'vazia' : ''}`}>
            <div className="grafico-dica">
              <strong>{d.rotulo}</strong> · {d.dica}
            </div>
            <div className="barra" style={{ height: maximo > 0 ? `${(d.valor / maximo) * 100}%` : '2px' }} />
          </div>
        ))}
      </div>
      <div className="grafico-eixo">
        {dados
          .filter((_, i) => i % passo === 0 || i === dados.length - 1)
          .map((d) => (
            <span key={d.rotulo}>{d.rotulo}</span>
          ))}
      </div>
    </div>
  );
}

export function ListaBarras({ itens }: { itens: { chave: string; rotulo: ReactNode; valor: number; texto: ReactNode }[] }) {
  const maximo = Math.max(...itens.map((i) => i.valor), 0);
  return (
    <div className="lista-barras">
      {itens.map((i) => (
        <div key={i.chave} className="barra-horizontal">
          <span className="truncar" style={{ maxWidth: '100%' }}>
            {i.rotulo}
          </span>
          <span className="forte sem-quebra">{i.texto}</span>
          <div className="trilho">
            <div style={{ width: maximo > 0 ? `${(i.valor / maximo) * 100}%` : 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
