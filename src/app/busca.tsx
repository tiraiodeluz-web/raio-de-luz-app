import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { GradeProdutos } from '@/components/grade-produtos';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useProdutos } from '@/lib/produtos';

// Busca por nome, resultados agrupados por SKU (cada linha de `produtos` já
// é um SKU), 20 por vez.
export default function BuscaScreen() {
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');

  // Debounce simples: só busca 400ms depois de parar de digitar.
  useEffect(() => {
    const id = setTimeout(() => setTermo(texto), 400);
    return () => clearTimeout(id);
  }, [texto]);

  const query = useProdutos({ tipo: 'busca', termo });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Buscar" />
      <View style={styles.campo}>
        <TextField
          rotulo="O que você procura?"
          value={texto}
          onChangeText={setTexto}
          autoFocus
          placeholder="Nome do produto"
        />
      </View>
      <GradeProdutos
        query={query}
        mostrarContagem={termo.trim().length > 0}
        mensagemVazio={termo.trim().length > 0 ? 'Nenhum produto encontrado' : 'Digite para buscar'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  campo: { marginHorizontal: Spacing.three, marginBottom: Spacing.two },
});
