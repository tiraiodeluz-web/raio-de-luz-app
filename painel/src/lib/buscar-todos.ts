// O Supabase devolve no máximo 1000 linhas por consulta; aqui busca em
// páginas até acabar (usado na importação e nas exportações).
export async function buscarTodos<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  tamanho = 1000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await pagina(de, de + tamanho - 1);
    if (error) throw error;
    todas.push(...(data ?? []));
    if (!data || data.length < tamanho) return todas;
  }
}
