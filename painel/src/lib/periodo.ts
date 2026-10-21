import { hoje, somarDias } from './formato';

export type ChavePeriodo = 'hoje' | '7d' | '30d' | '90d' | 'mes' | 'mes-passado' | 'ano' | 'personalizado';
export type Periodo = { chave: ChavePeriodo; inicio: string; fim: string };

export const ROTULOS_PERIODO: Record<ChavePeriodo, string> = {
  hoje: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  mes: 'Este mês',
  'mes-passado': 'Mês passado',
  ano: 'Este ano',
  personalizado: 'Personalizado',
};

export function calcularPeriodo(chave: Exclude<ChavePeriodo, 'personalizado'>): Periodo {
  const h = hoje();
  const [ano, mes] = h.split('-').map(Number);
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
  switch (chave) {
    case 'hoje':
      return { chave, inicio: h, fim: h };
    case '7d':
      return { chave, inicio: somarDias(h, -6), fim: h };
    case '30d':
      return { chave, inicio: somarDias(h, -29), fim: h };
    case '90d':
      return { chave, inicio: somarDias(h, -89), fim: h };
    case 'mes':
      return { chave, inicio: inicioMes, fim: h };
    case 'mes-passado': {
      const fim = somarDias(inicioMes, -1);
      return { chave, inicio: `${fim.slice(0, 7)}-01`, fim };
    }
    case 'ano':
      return { chave, inicio: `${ano}-01-01`, fim: h };
  }
}
