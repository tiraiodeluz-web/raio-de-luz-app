// O app foi desenhado só pro tema claro (fundo branco fixo em quase toda
// tela) — nunca teve um dark mode de verdade. Antes, isso vinha direto do
// react-native e seguia o tema do sistema do celular; só que o texto
// (ThemedText) acompanhava o escuro/claro do aparelho enquanto o fundo
// ficava sempre branco (hardcoded), então com o celular em modo escuro o
// texto virava branco sobre fundo branco — invisível. Força sempre "light"
// até o app ganhar um tema escuro de verdade.
export function useColorScheme(): 'light' {
  return 'light';
}
