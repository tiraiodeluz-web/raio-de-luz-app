import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { DESCONTO_POR_ACAO, useEnviarFeedbackVideo } from '@/lib/pontos';
import { useToast } from '@/lib/toast-context';

// O bucket aceita até 50 MB (limite do plano do Supabase); 45 dá folga.
const TAMANHO_MAX = 45 * 1024 * 1024;

export default function FeedbackScreen() {
  const enviar = useEnviarFeedbackVideo();
  const { mostrarToast } = useToast();
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [autorizo, setAutorizo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolherVideo() {
    setErro(null);
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    if (asset.fileSize && asset.fileSize > TAMANHO_MAX) {
      setVideo(null);
      setErro('Vídeo muito grande (máximo 45 MB). Grave um vídeo mais curto, de até 1 minuto.');
      return;
    }
    setVideo(asset);
  }

  function confirmar() {
    setErro(null);
    if (!video) return setErro('Escolha o vídeo.');
    if (!autorizo) return setErro('Para enviar, marque a autorização de uso.');
    enviar.mutate(
      { uri: video.uri, mimeType: video.mimeType },
      {
        onSuccess: () => {
          mostrarToast('Recebemos seu vídeo! O desconto entra depois da aprovação.');
          router.back();
        },
        onError: (e: unknown) => setErro(e instanceof Error ? e.message : 'Não foi possível enviar agora. Verifique sua internet.'),
      },
    );
  }

  const duracao = video?.duration ? Math.round(video.duration / 1000) : null;
  const tamanho = video?.fileSize ? (video.fileSize / 1024 / 1024).toFixed(1) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Feedback em vídeo" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText themeColor="textSecondary">
          Grave um vídeo curto (até 1 minuto) contando como é comprar com a Raio de Luz e pelo app. Você ganha +{DESCONTO_POR_ACAO.feedback_video}% de
          desconto no próximo pedido depois que nossa equipe aprovar.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Dica: grave pela câmera do celular, na vertical e em um lugar silencioso. Depois escolha o vídeo aqui.
        </ThemedText>
        <Pressable onPress={escolherVideo} style={[styles.escolherVideo, video && styles.videoEscolhido]}>
          <Ionicons name={video ? 'checkmark-circle' : 'videocam-outline'} size={26} color={BrandColors.fundoEscuro} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{video ? 'Vídeo escolhido' : 'Escolher vídeo da galeria'}</ThemedText>
            {video ? (
              <ThemedText type="small" themeColor="textSecondary">
                {[duracao ? `${duracao} s` : null, tamanho ? `${tamanho} MB` : null].filter(Boolean).join(' · ')} · toque para trocar
              </ThemedText>
            ) : null}
          </View>
        </Pressable>

        <Pressable onPress={() => setAutorizo((v) => !v)} style={styles.autorizacao}>
          <Ionicons name={autorizo ? 'checkbox' : 'square-outline'} size={24} color={BrandColors.fundoEscuro} />
          <ThemedText type="small" style={styles.flex}>
            Autorizo a Raio de Luz Artigos Religiosos a usar este vídeo, com o meu nome e o da minha loja, em materiais de divulgação e marketing (redes
            sociais, site, catálogos e anúncios), sem custo.
          </ThemedText>
        </Pressable>

        {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
        <Button titulo={enviar.isPending ? 'Enviando vídeo...' : 'Enviar vídeo'} icone="send" onPress={confirmar} carregando={enviar.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  escolherVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C6C8D2',
  },
  videoEscolhido: { borderStyle: 'solid', borderColor: BrandColors.dourado, backgroundColor: '#FBF4DF' },
  autorizacao: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  erro: { color: '#D64545' },
});
