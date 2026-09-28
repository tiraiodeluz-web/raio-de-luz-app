import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import type { Href } from 'expo-router';

type Props = {
  visivel: boolean;
  onFechar: () => void;
};

const ITENS: { titulo: string; icone: keyof typeof Ionicons.glyphMap; href: Href }[] = [
  { titulo: 'Métricas', icone: 'stats-chart-outline', href: '/admin' },
  { titulo: 'Pedidos', icone: 'receipt-outline', href: '/admin/pedidos' },
  { titulo: 'Clientes', icone: 'people-outline', href: '/admin/clientes' },
  { titulo: 'Carrinhos abandonados', icone: 'cart-outline', href: '/admin/carrinhos-abandonados' },
  { titulo: 'Enviar notificação', icone: 'megaphone-outline', href: '/admin/notificacao' },
  { titulo: 'Eventos de push', icone: 'notifications-outline', href: '/admin/eventos-push' },
];

// Menu lateral (sheet) do admin — Métricas, Pedidos, Clientes, Carrinhos
// abandonados, Enviar notificação, Ver como usuário e Sair.
export function AdminMenu({ visivel, onFechar }: Props) {
  const { sair } = useAuth();
  const pathname = usePathname();

  function irPara(href: Href) {
    onFechar();
    router.push(href);
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar} />
      <SafeAreaView style={styles.painel}>
        <View style={styles.conteudo}>
          <ThemedText type="title" style={styles.titulo}>
            Administração
          </ThemedText>
          {ITENS.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Pressable key={item.titulo} style={[styles.item, ativo && styles.itemAtivo]} onPress={() => irPara(item.href)}>
                <Ionicons name={item.icone} size={20} color={ativo ? '#ffffff' : BrandColors.fundoEscuro} />
                <ThemedText style={ativo ? styles.itemTextoAtivo : styles.itemTexto}>{item.titulo}</ThemedText>
              </Pressable>
            );
          })}

          <View style={styles.separador} />

          <Pressable
            style={styles.item}
            onPress={() => {
              onFechar();
              router.replace('/(tabs)');
            }}>
            <Ionicons name="person-outline" size={20} color={BrandColors.fundoEscuro} />
            <ThemedText style={styles.itemTexto}>Ver como usuário</ThemedText>
          </Pressable>
          <Pressable
            style={styles.item}
            onPress={() => {
              onFechar();
              sair();
            }}>
            <Ionicons name="log-out-outline" size={20} color="#D64545" />
            <ThemedText style={[styles.itemTexto, styles.sairTexto]}>Sair</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  painel: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%', backgroundColor: '#ffffff' },
  conteudo: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.half },
  titulo: { fontSize: 20, marginBottom: Spacing.two, color: BrandColors.fundoEscuro },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, borderRadius: Radii.pilula },
  itemAtivo: { backgroundColor: BrandColors.fundoEscuro },
  itemTexto: { flex: 1, color: BrandColors.fundoEscuro },
  itemTextoAtivo: { flex: 1, color: '#ffffff', fontWeight: '700' },
  sairTexto: { color: '#D64545' },
  separador: { height: 1, backgroundColor: '#00000014', marginVertical: Spacing.two },
});
