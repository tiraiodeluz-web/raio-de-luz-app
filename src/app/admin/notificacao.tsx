import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useEnviarNotificacao } from '@/lib/admin';
import { enviarImagemParaStorage } from '@/lib/upload-imagem';

export default function EnviarNotificacaoScreen() {
  const [titulo, setTitulo] = useState('');
  const [legenda, setLegenda] = useState('');
  const [corpo, setCorpo] = useState('');
  const [imagem, setImagem] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const enviar = useEnviarNotificacao();

  async function escolherImagem() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para anexar uma imagem.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!resultado.canceled) setImagem(resultado.assets[0]);
  }

  async function enviarNotificacao() {
    setErro(null);
    if (!titulo.trim() || !corpo.trim()) {
      setErro('Preencha ao menos o título e o corpo.');
      return;
    }
    try {
      let imagemUrl: string | null = null;
      if (imagem) {
        setEnviandoImagem(true);
        imagemUrl = await enviarImagemParaStorage(imagem.uri, imagem.mimeType, 'notificacoes');
        setEnviandoImagem(false);
      }
      await enviar.mutateAsync({ titulo: titulo.trim(), legenda: legenda.trim(), corpo: corpo.trim(), imagemUrl });
      setTitulo('');
      setLegenda('');
      setCorpo('');
      setImagem(null);
      Alert.alert('Enviado', 'A notificação foi enviada para todos os clientes.');
    } catch (e) {
      setEnviandoImagem(false);
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar agora.');
    }
  }

  const carregando = enviar.isPending || enviandoImagem;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Enviar notificação" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TextField rotulo="Título" value={titulo} onChangeText={setTitulo} placeholder="Título" icone="text-outline" />
          <TextField rotulo="Subtítulo" value={legenda} onChangeText={setLegenda} placeholder="Opcional" icone="text-outline" />
          <TextField rotulo="Corpo" value={corpo} onChangeText={setCorpo} placeholder="Mensagem" multiline numberOfLines={4} style={styles.corpo} />

          <ThemedText type="smallBold">Imagem (opcional)</ThemedText>
          {imagem ? (
            <Pressable onPress={escolherImagem} style={styles.previewContainer}>
              <Image source={{ uri: imagem.uri }} style={styles.preview} contentFit="cover" />
              <Pressable onPress={() => setImagem(null)} hitSlop={8} style={styles.removerImagem}>
                <Ionicons name="close-circle" size={24} color="#ffffff" />
              </Pressable>
            </Pressable>
          ) : (
            <Pressable onPress={escolherImagem} style={styles.escolherImagem}>
              <Ionicons name="image-outline" size={22} color={BrandColors.fundoEscuro} />
              <ThemedText type="smallBold" style={styles.escolherImagemTexto}>
                Escolher da galeria
              </ThemedText>
            </Pressable>
          )}

          {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
          <Button titulo="Enviar para todos" icone="megaphone" onPress={enviarNotificacao} carregando={carregando} />
          {enviandoImagem ? <ActivityIndicator style={styles.carregandoImagem} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  corpo: { minHeight: 100, textAlignVertical: 'top' },
  erro: { color: '#D64545' },
  escolherImagem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C6C8D2',
  },
  escolherImagemTexto: { color: BrandColors.fundoEscuro },
  previewContainer: { borderRadius: 10, overflow: 'hidden', aspectRatio: 16 / 9 },
  preview: { width: '100%', height: '100%' },
  removerImagem: { position: 'absolute', top: Spacing.one, right: Spacing.one },
  carregandoImagem: { marginTop: -Spacing.two },
});
