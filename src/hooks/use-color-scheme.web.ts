// Ver use-color-scheme.ts: o app não tem dark mode de verdade, então fica
// sempre no tema claro (fundo branco fixo), mesmo na versão web.
export function useColorScheme(): 'light' {
  return 'light';
}
