// Formatação de preço e desconto (regra 16: sempre "R$ 2,62", nunca "R$2.62").

export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Regra 6: usa o promocional quando preenchido (>0), senão o preço cheio.
export function precoExibido(preco: number, precoPromocional: number | null): number {
  return precoPromocional && precoPromocional > 0 ? precoPromocional : preco;
}

// Regra do selo de desconto (bug #6 corrigido): (preço − promocional) ÷ preço,
// 0 quando não há desconto de verdade (esconde o selo).
export function percentualDesconto(preco: number, precoPromocional: number | null): number {
  if (!precoPromocional || precoPromocional <= 0 || precoPromocional >= preco || preco <= 0) return 0;
  return Math.round(((preco - precoPromocional) / preco) * 100);
}
