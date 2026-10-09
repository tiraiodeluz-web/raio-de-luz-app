import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Logo } from './logo';
import { cores, fontes, LINK_ASSINATURA, secoes } from './tokens';
import { Botao, Container, useLayout, web, type EstadoPressable } from './ui';

export function LinkNav({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ hovered, focused }: EstadoPressable) => [
        styles.link,
        hovered && { backgroundColor: 'rgba(255,255,255,0.06)' },
        focused && { borderColor: cores.ciano },
        web({ cursor: 'pointer', transition: 'all 160ms ease' }),
      ]}
    >
      {({ hovered }: EstadoPressable) => (
        <Text style={[styles.linkTexto, hovered && { color: cores.branco }]}>{rotulo}</Text>
      )}
    </Pressable>
  );
}

export function Cabecalho({ irPara, rolou }: { irPara: (id: string) => void; rolou: boolean }) {
  const { ate_tablet } = useLayout();
  const [aberto, setAberto] = useState(false);

  const navegar = (id: string) => {
    setAberto(false);
    irPara(id);
  };

  return (
    <View style={[styles.barra, (rolou || aberto) && styles.barraSolida]}>
      <Container style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <Pressable accessibilityRole="link" accessibilityLabel="Clyvo Tecnologia — ir para o início" onPress={() => navegar('inicio')} style={web({ cursor: 'pointer' })}>
          <Logo />
        </Pressable>

        {ate_tablet ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={aberto ? 'Fechar menu' : 'Abrir menu'}
            accessibilityState={{ expanded: aberto }}
            onPress={() => setAberto((v) => !v)}
            style={({ focused }: EstadoPressable) => [styles.hamburguer, focused && { borderColor: cores.ciano }, web({ cursor: 'pointer' })]}
          >
            <Feather name={aberto ? 'x' : 'menu'} size={24} color={cores.texto} />
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {secoes.map((s) => (
              <LinkNav key={s.id} rotulo={s.rotulo} onPress={() => navegar(s.id)} />
            ))}
            <View style={{ marginLeft: 14 }}>
              <Botao rotulo="Contratar agora" href={LINK_ASSINATURA} />
            </View>
          </View>
        )}
      </Container>

      {ate_tablet && aberto ? (
        <Container style={{ paddingBottom: 20 }}>
          <View style={styles.menuMovel}>
            {secoes.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="link"
                onPress={() => navegar(s.id)}
                style={({ pressed }) => [styles.itemMovel, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
              >
                <Text style={styles.itemMovelTexto}>{s.rotulo}</Text>
              </Pressable>
            ))}
            <View style={{ marginTop: 10 }}>
              <Botao rotulo="Contratar agora" href={LINK_ASSINATURA} grande largo />
            </View>
          </View>
        </Container>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    ...web({ transition: 'background-color 250ms ease, border-color 250ms ease' }),
  },
  barraSolida: {
    backgroundColor: 'rgba(7,10,18,0.82)',
    borderBottomColor: cores.borda,
    ...web({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }),
  },
  link: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  linkTexto: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 14.5, fontWeight: '500' },
  hamburguer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  menuMovel: { gap: 2, paddingTop: 4 },
  itemMovel: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, minHeight: 48, justifyContent: 'center' },
  itemMovelTexto: { color: cores.texto, fontFamily: fontes.corpo, fontSize: 17, fontWeight: '500' },
});
