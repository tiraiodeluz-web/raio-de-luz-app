// Máscaras e limpeza de campos usados no cadastro e no checkout.

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function mascararCnpj(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function cnpjValido(valor: string): boolean {
  return apenasDigitos(valor).length === 14;
}

export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}
