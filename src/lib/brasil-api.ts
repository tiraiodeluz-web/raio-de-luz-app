// Consultas de CNPJ e CEP direto na BrasilAPI (API pública, sem chave) —
// substitui o plugin do Bubble. Chamadas feitas do próprio app.
import { apenasDigitos } from '@/lib/mascaras';

export type CnpjInfo = {
  razaoSocial: string;
  cep: string;
  cidade: string;
  uf: string;
};

export type CepInfo = {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export class BrasilApiError extends Error {}

export async function buscarCnpj(cnpj: string): Promise<CnpjInfo> {
  const digitos = apenasDigitos(cnpj);
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`);
  if (resposta.status === 404) {
    throw new BrasilApiError('CNPJ não encontrado');
  }
  if (!resposta.ok) {
    throw new BrasilApiError('Não foi possível consultar o CNPJ agora');
  }
  const dados = await resposta.json();
  return {
    razaoSocial: dados.razao_social ?? '',
    cep: apenasDigitos(dados.cep ?? ''),
    cidade: dados.municipio ?? '',
    uf: dados.uf ?? '',
  };
}

export async function buscarCep(cep: string): Promise<CepInfo> {
  const digitos = apenasDigitos(cep);
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
  if (resposta.status === 404) {
    throw new BrasilApiError('CEP não encontrado');
  }
  if (!resposta.ok) {
    throw new BrasilApiError('Não foi possível consultar o CEP agora');
  }
  const dados = await resposta.json();
  return {
    cep: apenasDigitos(dados.cep ?? ''),
    rua: dados.street ?? '',
    bairro: dados.neighborhood ?? '',
    cidade: dados.city ?? '',
    uf: dados.state ?? '',
  };
}
