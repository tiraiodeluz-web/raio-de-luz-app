import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { mascararCnpj, mascararTelefone } from '@/lib/mascaras';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function ContaScreen() {
  const { session, perfil, modoAcesso, escolherModo, sair } = useAuth();
  const [excluindo, setExcluindo] = useState(false);
  const theme = useTheme();

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.titulo}>
          Conta
        </ThemedText>
        <EstadoVazio icone="log-in-outline" titulo="Faça login para ver sua conta" />
        <View style={styles.botaoEntrar}>
          <Button titulo="Entrar" onPress={() => router.push('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir conta',
      'Isso apaga seu cadastro, carrinho e endereços permanentemente. Pedidos já feitos ficam guardados sem o seu nome. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir conta', style: 'destructive', onPress: excluirConta },
      ],
    );
  }

  async function excluirConta() {
    setExcluindo(true);
    const { error } = await supabase.rpc('excluir_minha_conta');
    setExcluindo(false);
    if (error) {
      Alert.alert('Não foi possível excluir', error.message);
      return;
    }
    await sair();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.titulo}>
          Conta
        </ThemedText>

        <View style={styles.perfil}>
          <ThemedView type="backgroundElement" style={styles.fotoContainer}>
            {perfil?.foto_url ? (
              <Image source={{ uri: perfil.foto_url }} style={styles.foto} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={32} color={theme.textSecondary} />
            )}
          </ThemedView>
          <View style={styles.perfilTexto}>
            <ThemedText type="smallBold">{perfil?.nome || session.user.email}</ThemedText>
            {perfil?.telefone ? <ThemedText themeColor="textSecondary">{mascararTelefone(perfil.telefone)}</ThemedText> : null}
            {perfil?.cnpj ? <ThemedText themeColor="textSecondary">{mascararCnpj(perfil.cnpj)}</ThemedText> : null}
          </View>
        </View>

        <View style={styles.menu}>
          <ItemMenu icone="shield-checkmark-outline" titulo="Política de privacidade" onPress={() => router.push('/politica-privacidade')} />
          <ItemMenu icone="information-circle-outline" titulo="Sobre o aplicativo" onPress={() => router.push('/sobre')} />
          {perfil?.tipo === 'admin' ? (
            <ItemMenu
              icone="briefcase-outline"
              titulo="Ver como admin"
              onPress={() => {
                escolherModo('admin');
                router.push('/admin');
              }}
            />
          ) : null}
          <ItemMenu icone="log-out-outline" titulo="Sair" onPress={sair} />
        </View>

        <Pressable onPress={confirmarExclusao} disabled={excluindo} style={styles.excluirConta}>
          <ThemedText type="small" style={styles.excluirTexto}>
            {excluindo ? 'Excluindo...' : 'Excluir minha conta'}
          </ThemedText>
        </Pressable>

        {perfil?.tipo === 'admin' && modoAcesso === 'admin' ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.modoAtual}>
            Modo atual: administrador
          </ThemedText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ItemMenu({
  icone,
  titulo,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.itemMenu}>
      <Ionicons name={icone} size={22} color={theme.text} />
      <ThemedText style={styles.itemMenuTexto}>{titulo}</ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.four },
  titulo: { fontSize: 22, lineHeight: 28 },
  botaoEntrar: { paddingHorizontal: Spacing.one },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fotoContainer: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  foto: { width: '100%', height: '100%' },
  perfilTexto: { gap: Spacing.half },
  menu: { gap: Spacing.half },
  itemMenu: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  itemMenuTexto: { flex: 1 },
  excluirConta: { alignItems: 'center', paddingVertical: Spacing.two },
  excluirTexto: { color: '#D64545' },
  modoAtual: { textAlign: 'center' },
});
