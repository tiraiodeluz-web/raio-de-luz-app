// Mensagem legível de qualquer erro (Supabase, rede ou JavaScript).
export function mensagemErro(erro: unknown): string {
  if (!erro) return 'Erro desconhecido';
  const texto =
    typeof erro === 'string'
      ? erro
      : typeof erro === 'object' && 'message' in erro && typeof (erro as { message: unknown }).message === 'string'
        ? (erro as { message: string }).message
        : String(erro);
  if (/Failed to fetch|NetworkError/i.test(texto)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  if (/duplicate key.*sku/i.test(texto)) return 'Já existe um produto com esse SKU.';
  if (/duplicate key/i.test(texto)) return 'Já existe um registro com esses dados.';
  if (/violates foreign key/i.test(texto)) return 'Não dá pra apagar: o registro está sendo usado em outro lugar (pedidos, carrinhos...). Desative em vez de apagar.';
  if (/row-level security|Acesso restrito/i.test(texto)) return 'Sem permissão. Entre com uma conta de administrador.';
  if (/Invalid login credentials/i.test(texto)) return 'E-mail ou senha incorretos.';
  return texto;
}
