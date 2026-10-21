import { useState } from 'react';

// Preço do Claude Haiku 5.5 (modelo do assistente) por milhão de tokens, em
// dólar. Os tokens de entrada gravados incluem os lidos do cache (que custam
// menos), então o valor calculado é um teto: o real fica um pouco abaixo.
export const PRECO_HAIKU = { entrada: 0.1, saida: 0.5 };

export const custoIaDolar = (tokensEntrada: number, tokensSaida: number) =>
  (Number(tokensEntrada) * PRECO_HAIKU.entrada + Number(tokensSaida) * PRECO_HAIKU.saida) / 1_000_000;

const CHAVE = 'painel-cotacao-dolar';

// Cotação editável no painel (guardada só neste navegador).
export function useCotacaoDolar(): [number, (v: number) => void] {
  const [valor, setValor] = useState(() => {
    try {
      const salvo = Number(localStorage.getItem(CHAVE));
      return salvo > 0 ? salvo : 5.5;
    } catch {
      return 5.5;
    }
  });
  return [
    valor,
    (v: number) => {
      setValor(v);
      try {
        localStorage.setItem(CHAVE, String(v));
      } catch {
        // sem armazenamento: vale só nesta visita
      }
    },
  ];
}
