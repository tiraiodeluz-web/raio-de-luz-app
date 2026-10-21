import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const FORMATADOR = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

type ErroApp = {
  id: string;
  criado_em: string;
  mensagem: string;
  stack: string | null;
  tela: string | null;
  origem: string;
  fatal: boolean;
  plataforma: string | null;
  versao_app: string | null;
  perfis: { nome: string; razao_social: string | null } | null;
};

function useErrosApp() {
  return useQuery({
    queryKey: ['admin', 'erros-app'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erros_app')
        .select('id, criado_em, mensagem, stack, tela, origem, fatal, plataforma, versao_app, perfis ( nome, razao_social )')
        .order('criado_em', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as ErroApp[];
    },
  });
}

function useApagarErros() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('erros_app').delete().not('id', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'erros-app'] }),
  });
}

export default function ErrosAppScreen() {
  const { data: erros, isLoading, refetch, isRefetching } = useErrosApp();
  const apagar = useApagarErros();
  const [aberto, setAberto] = useState<string | null>(null);

  function confirmarApagar() {
    Alert.alert('Apagar todos os erros?', 'Use depois de corrigir os problemas, pra começar a contagem do zero.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => apagar.mutate() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Erros do app" />
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={erros ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={<EstadoVazio icone="checkmark-circle-outline" titulo="Nenhum erro registrado" />}
          ListFooterComponent={
            erros && erros.length > 0 ? (
              <Button titulo="Apagar todos" variante="secundario" icone="trash-outline" onPress={confirmarApagar} carregando={apagar.isPending} />
            ) : null
          }
          renderItem={({ item }) => {
            const expandido = aberto === item.id;
            return (
              <Pressable style={[styles.card, item.fatal && styles.cardFatal]} onPress={() => setAberto(expandido ? null : item.id)}>
                <ThemedText type="smallBold" numberOfLines={expandido ? undefined : 2}>
                  {item.mensagem}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {FORMATADOR.format(new Date(item.criado_em))} · {item.tela ?? 'tela desconhecida'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.perfis?.razao_social || item.perfis?.nome || 'Sem login'} · {item.plataforma ?? '?'} · v{item.versao_app ?? '?'}
                  {item.fatal ? ' · travou a tela' : ''}
                </ThemedText>
                {expandido && item.stack ? (
                  <View style={styles.stack}>
                    <ThemedText type="small" style={styles.stackTexto}>
                      {item.stack}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  card: { gap: Spacing.half, padding: Spacing.three, borderRadius: 10, borderWidth: 1, borderColor: '#E5E6EC' },
  cardFatal: { borderColor: '#D64545' },
  stack: { marginTop: Spacing.one, padding: Spacing.two, borderRadius: 8, backgroundColor: '#F1F2F6' },
  stackTexto: { fontFamily: 'monospace', fontSize: 11 },
});
