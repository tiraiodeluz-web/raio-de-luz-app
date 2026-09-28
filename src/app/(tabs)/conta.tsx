import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { mascararCnpj, mascararTelefone } from '@/lib/mascaras';
import { supabase } from '@/lib/supabase';

export default function ContaScreen() {
  const { session, perfil, escolherModo, sair } = useAuth();
  const [excluindo, setExcluindo] = useState(false);

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.titulo}>
          Minha Conta
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
          Minha Conta
        </ThemedText>

        <View style={styles.perfilCard}>
          <View style={styles.fotoContainer}>
            {perfil?.foto_url ? (
              <Image source={{ uri: perfil.foto_url }} style={styles.foto} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={28} color="#ffffff88" />
            )}
          </View>
          <View style={styles.perfilTexto}>
            <ThemedText style={styles.perfilNome}>{perfil?.nome || session.user.email}</ThemedText>
            <ThemedText style={styles.perfilDado}>Telefone: {perfil?.telefone ? mascararTelefone(perfil.telefone) : '—'}</ThemedText>
            <ThemedText style={styles.perfilDado}>Cnpj: {perfil?.cnpj ? mascararCnpj(perfil.cnpj) : '—'}</ThemedText>
          </View>
        </View>

        <View style={styles.menu}>
          <Button
            titulo="Política de privacidade"
            variante="secundario"
            icone="lock-closed-outline"
            onPress={() => router.push('/politica-privacidade')}
          />
          <Button
            titulo="Sobre o aplicativo"
            variante="secundario"
            icone="information-circle"
            onPress={() => router.push('/sobre')}
          />
          <Button
            titulo="Sair da Conta"
            variante="secundario"
            icone="power"
            corIcone="#D64545"
            onPress={sair}
          />
        </View>

        {perfil?.tipo === 'admin' ? (
          <Button
            titulo="VER COMO ADMIN"
            onPress={() => {
              escolherModo('admin');
              router.push('/admin');
            }}
          />
        ) : null}

        <Pressable onPress={confirmarExclusao} disabled={excluindo} style={styles.excluirConta}>
          <ThemedText type="small" style={styles.excluirTexto}>
            {excluindo ? 'Excluindo...' : 'Excluir minha conta'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  titulo: { fontSize: 22, lineHeight: 28, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  botaoEntrar: { paddingHorizontal: Spacing.four },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: BrandColors.fundoEscuro,
    padding: Spacing.three,
  },
  fotoContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff55',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foto: { width: '100%', height: '100%' },
  perfilTexto: { gap: Spacing.half, flex: 1 },
  perfilNome: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  perfilDado: { color: '#ffffffcc' },
  menu: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  excluirConta: { alignItems: 'center', paddingVertical: Spacing.two },
  excluirTexto: { color: '#D64545' },
});
