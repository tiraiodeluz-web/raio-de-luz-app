import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { rotuloEventoPush, useAlterarEventoPush, useEventosPush } from '@/lib/admin';

// Regra: cada evento de push pode ser desligado por configuração.
export default function EventosPushScreen() {
  const { data: eventos, isLoading } = useEventosPush();
  const alterar = useAlterarEventoPush();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Eventos de push" />
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <View style={styles.lista}>
          {(eventos ?? []).map((evento) => (
            <ThemedView key={evento.chave} type="backgroundElement" style={styles.item}>
              <View style={styles.itemTexto}>
                <ThemedText type="smallBold">{rotuloEventoPush(evento.chave)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {evento.titulo}
                </ThemedText>
              </View>
              <Switch
                value={evento.ativo}
                onValueChange={(ativo) => alterar.mutate({ chave: evento.chave, ativo })}
                trackColor={{ true: BrandColors.dourado }}
              />
            </ThemedView>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 10, padding: Spacing.three },
  itemTexto: { flex: 1, gap: Spacing.half },
});
