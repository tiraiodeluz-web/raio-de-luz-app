import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/lib/toast-context';
import { useDefinirVersaoApp, type VersaoApp } from '@/lib/versao-app';

const OPCOES: { valor: VersaoApp; titulo: string }[] = [
  { valor: 'classica', titulo: 'Clássica' },
  { valor: '2.0', titulo: '2.0' },
];

// Troca a versão do app de uma conta (só admin consegue gravar). A troca
// vale na hora: quem está com o app aberto vê ao recarregar o perfil.
export function SeletorVersaoApp({ usuarioId, versao }: { usuarioId: string; versao: string | null | undefined }) {
  const definir = useDefinirVersaoApp();
  const { mostrarToast } = useToast();
  const atual: VersaoApp = versao === 'classica' ? 'classica' : '2.0';

  function escolher(valor: VersaoApp) {
    if (valor === atual || definir.isPending) return;
    definir.mutate(
      { usuarioId, versao: valor },
      {
        onSuccess: () => mostrarToast(valor === 'classica' ? 'Versão Clássica ativada.' : 'Versão 2.0 ativada.'),
        onError: (erro) => mostrarToast((erro as { message?: string } | null)?.message ?? 'Não foi possível trocar a versão.'),
      },
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.textos}>
        <ThemedText type="smallBold">Versão do app</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Clássica esconde assistente, kits, compartilhar, pedir de novo e recomendados.
        </ThemedText>
      </View>
      <View style={styles.segmentado}>
        {OPCOES.map((opcao) => {
          const ativo = opcao.valor === atual;
          return (
            <Pressable
              key={opcao.valor}
              onPress={() => escolher(opcao.valor)}
              style={[styles.opcao, ativo && styles.opcaoAtiva]}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}>
              <ThemedText type="smallBold" style={ativo ? styles.textoAtivo : styles.texto}>
                {opcao.titulo}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, padding: Spacing.three, borderRadius: 12, borderWidth: 1, borderColor: '#E5E6EC' },
  textos: { gap: Spacing.half },
  segmentado: { flexDirection: 'row', borderRadius: Radii.pilula, backgroundColor: '#F1F2F6', padding: 4 },
  opcao: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radii.pilula },
  opcaoAtiva: { backgroundColor: BrandColors.fundoEscuro },
  texto: { color: BrandColors.fundoEscuro },
  textoAtivo: { color: '#ffffff' },
});
