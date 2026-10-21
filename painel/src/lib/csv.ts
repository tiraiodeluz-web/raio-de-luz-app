export type ColunaCsv<T> = { titulo: string; valor: (linha: T) => string | number | boolean | null | undefined };

// CSV no padrão do Excel brasileiro: ";" separa colunas, vírgula decimal e
// BOM no início pra acentuação abrir certo.
export function baixarCsv<T>(nomeArquivo: string, colunas: ColunaCsv<T>[], linhas: T[]) {
  const celula = (v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined) return '';
    const t = typeof v === 'number' ? String(v).replace('.', ',') : typeof v === 'boolean' ? (v ? 'sim' : 'não') : v;
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texto = [colunas.map((c) => celula(c.titulo)).join(';'), ...linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'))].join('\r\n');
  const blob = new Blob(['﻿', texto], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
