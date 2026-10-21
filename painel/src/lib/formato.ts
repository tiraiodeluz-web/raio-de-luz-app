import { formatarReais } from '@/lib/formatacao';

export const reais = (valor: number | null | undefined) => formatarReais(Number(valor ?? 0));

export const numero = (valor: number | null | undefined, casas = 0) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const dolar = (valor: number) =>
  `US$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: valor < 1 ? 4 : 2 })}`;

export const porcentagem = (valor: number, casas = 1) =>
  `${(valor * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

const FUSO = 'America/Sao_Paulo';
const DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
});

// "2026-10-21" (só data, sem fuso) vira 21/10/2026 sem cair no dia anterior.
export function data(valor: string | null | undefined): string {
  if (!valor) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-');
    return `${d}/${m}/${a}`;
  }
  return DATA.format(new Date(valor));
}

export const dataHora = (valor: string | null | undefined) => (valor ? DATA_HORA.format(new Date(valor)) : '—');

export function diaCurto(isoData: string): string {
  const [, m, d] = isoData.split('-');
  return `${d}/${m}`;
}

export function relativo(valor: string | null | undefined): string {
  if (!valor) return 'nunca';
  const minutos = Math.round((Date.now() - new Date(valor).getTime()) / 60000);
  if (minutos < 2) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 45) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const meses = Math.round(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

// Data de hoje (AAAA-MM-DD) no fuso da loja.
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
}

export function somarDias(isoData: string, dias: number): string {
  const d = new Date(`${isoData}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((new Date(`${fim}T12:00:00Z`).getTime() - new Date(`${inicio}T12:00:00Z`).getTime()) / 86400000) + 1;
}

export function apenasDigitos(valor: string | null | undefined) {
  return (valor ?? '').replace(/\D/g, '');
}

export function telefone(valor: string | null | undefined): string {
  const d = apenasDigitos(valor);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor || '—';
}

export function cnpj(valor: string | null | undefined): string {
  const d = apenasDigitos(valor);
  if (d.length !== 14) return valor || '—';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Link wa.me já com o 55 do Brasil quando o número veio sem DDI.
export function linkWhatsApp(numero: string | null | undefined, mensagem?: string): string | null {
  let d = apenasDigitos(numero);
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

// "2,62", "2.62", "1.234,56" ou número -> 2.62
export function lerNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  let t = valor.trim().replace(/^R\$\s*/i, '');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
