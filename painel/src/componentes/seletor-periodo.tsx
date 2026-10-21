import { calcularPeriodo, ROTULOS_PERIODO, type ChavePeriodo, type Periodo } from '../lib/periodo';
import { Campo, Entrada, Selecao } from './ui';

export function SeletorPeriodo({ periodo, aoMudar, opcoes }: { periodo: Periodo; aoMudar: (p: Periodo) => void; opcoes?: ChavePeriodo[] }) {
  const lista = opcoes ?? (Object.keys(ROTULOS_PERIODO) as ChavePeriodo[]);
  return (
    <>
      <Campo rotulo="Período">
        <Selecao
          value={periodo.chave}
          onChange={(e) => {
            const chave = e.target.value as ChavePeriodo;
            aoMudar(chave === 'personalizado' ? { ...periodo, chave } : calcularPeriodo(chave));
          }}>
          {lista.map((c) => (
            <option key={c} value={c}>
              {ROTULOS_PERIODO[c]}
            </option>
          ))}
        </Selecao>
      </Campo>
      {periodo.chave === 'personalizado' ? (
        <>
          <Campo rotulo="De">
            <Entrada type="date" value={periodo.inicio} max={periodo.fim} onChange={(e) => e.target.value && aoMudar({ ...periodo, inicio: e.target.value })} />
          </Campo>
          <Campo rotulo="Até">
            <Entrada type="date" value={periodo.fim} min={periodo.inicio} onChange={(e) => e.target.value && aoMudar({ ...periodo, fim: e.target.value })} />
          </Campo>
        </>
      ) : null}
    </>
  );
}
