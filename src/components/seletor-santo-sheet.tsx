import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { ehSantoPersonalizado, type SantoDoProduto } from '@/lib/produtos';

type Props = {
  visivel: boolean;
  santos: SantoDoProduto[];
  carregando?: boolean;
  onFechar: () => void;
  onSelecionar: (santo: SantoDoProduto) => void;
};

// Aberta pelo "Comprar" da Home e das ofertas: escolher o santo já adiciona ao carrinho.
export function SeletorSantoSheet({ visivel, santos, carregando, onFechar, onSelecionar }: Props) {
  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar} />
      <SafeAreaView style={styles.folhaWrapper} edges={['bottom']}>
        <View style={styles.folha}>
          <View style={styles.alca} />
          <ThemedText type="title" style={styles.titulo}>
            Escolha o santo
          </ThemedText>
          <FlatList
            data={santos.filter((item) => item.fotoUrl || ehSantoPersonalizado(item))}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => (
              <Pressable style={styles.item} onPress={() => onSelecionar(item)} disabled={carregando}>
                <View style={styles.fotoContainer}>
                  {item.fotoUrl ? (
                    <Image source={{ uri: item.fotoUrl }} style={styles.foto} contentFit="cover" />
                  ) : (
                    <View style={styles.semFoto}>
                      <Ionicons name="create-outline" size={20} color={BrandColors.fundoEscuro} />
                    </View>
                  )}
                </View>
                <ThemedText>{item.nome}</ThemedText>
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  folhaWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  folha: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: Spacing.two,
    backgroundColor: '#ffffff',
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00000022',
    marginBottom: Spacing.two,
  },
  titulo: { fontSize: 18, paddingHorizontal: Spacing.three, marginBottom: Spacing.two, color: BrandColors.fundoEscuro },
  lista: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.one },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  fotoContainer: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: BrandColors.fundoEscuro },
  foto: { width: '100%', height: '100%' },
  semFoto: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1EB' },
});
