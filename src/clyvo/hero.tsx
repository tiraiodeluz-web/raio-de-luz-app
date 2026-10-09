import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { cores, fontes } from './tokens';
import { Botao, Container, useLayout, web } from './ui';

function Pulso({ cor = cores.verde }: { cor?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: cor,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cor }} />
    </View>
  );
}

function Barras() {
  const alturas = [38, 52, 44, 66, 58, 74, 62, 84, 70, 92, 80, 96];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 }}>
      {alturas.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: h,
            borderRadius: 4,
            backgroundColor: i > 8 ? cores.azulClaro : 'rgba(47,123,255,0.45)',
          }}
        />
      ))}
    </View>
  );
}

function No({ icone, rotulo }: { icone: keyof typeof Feather.glyphMap; rotulo: string }) {
  return (
    <View style={styles.no}>
      <View style={styles.noIcone}>
        <Feather name={icone} size={18} color={cores.azulClaro} />
      </View>
      <Text style={styles.noRotulo}>{rotulo}</Text>
    </View>
  );
}

function PainelMonitoramento() {
  const servicos = ['Aplicação', 'Banco de dados', 'Infraestrutura', 'Integrações'];
  return (
    <View style={styles.painelWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.brilho} />
      <View style={styles.painel}>
        <View style={styles.painelTopo}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <View key={c} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c, opacity: 0.8 }} />
            ))}
          </View>
          <Text style={styles.painelTitulo}>monitoramento · visão ilustrativa</Text>
        </View>

        <View style={styles.fluxo}>
          <No icone="monitor" rotulo="Aplicação" />
          <View style={styles.conector} />
          <No icone="database" rotulo="Dados" />
          <View style={styles.conector} />
          <No icone="cloud" rotulo="Nuvem" />
        </View>

        <View style={{ gap: 8 }}>
          {servicos.map((s) => (
            <View key={s} style={styles.servico}>
              <Pulso />
              <Text style={styles.servicoNome}>{s}</Text>
              <View style={styles.servicoBarra}>
                <View style={styles.servicoBarraFill} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.grafico}>
          <Text style={styles.graficoRotulo}>Acompanhamento contínuo</Text>
          <Barras />
        </View>
      </View>
    </View>
  );
}

export function Hero({ irPara }: { irPara: (id: string) => void }) {
  const { desktop, celular } = useLayout();
  return (
    <View style={styles.secao}>
      <View style={styles.grade} pointerEvents="none" />
      <Container style={{ flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: desktop ? 56 : 44 }}>
        <View style={{ flex: desktop ? 1.05 : undefined, width: desktop ? undefined : '100%' }}>
          <View style={styles.selo}>
            <Pulso cor={cores.ciano} />
            <Text style={styles.seloTexto}>Software, dados e infraestrutura para empresas</Text>
          </View>
          <Text
            accessibilityRole="header"
            aria-level={1}
            style={[styles.h1, { fontSize: celular ? 38 : desktop ? 60 : 52, lineHeight: celular ? 46 : desktop ? 68 : 60 }]}
          >
            Seu sistema funcionando.{'\n'}
            <Text style={{ color: cores.azulClaro }}>Sua empresa evoluindo.</Text>
          </Text>
          <Text style={[styles.sub, { fontSize: celular ? 16 : 19, lineHeight: celular ? 26 : 30 }]}>
            A Clyvo Tecnologia cuida da manutenção, infraestrutura, banco de dados e evolução dos seus sistemas para que
            sua empresa possa focar no que realmente importa: crescer.
          </Text>
          <View style={{ flexDirection: celular ? 'column' : 'row', gap: 14, marginTop: 34 }}>
            <Botao rotulo="Conhecer nossos planos" grande largo={celular} onPress={() => irPara('planos')} />
            <Botao rotulo="Conhecer nossas soluções" variante="secundario" grande largo={celular} onPress={() => irPara('solucoes')} />
          </View>
        </View>
        <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', alignItems: 'center' }}>
          <PainelMonitoramento />
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    paddingTop: 150,
    paddingBottom: 96,
    overflow: 'hidden',
    backgroundColor: cores.fundo,
    ...web({
      backgroundImage:
        'radial-gradient(ellipse 60% 50% at 80% 20%, rgba(47,123,255,0.20), transparent 70%), radial-gradient(ellipse 40% 40% at 10% 90%, rgba(34,211,238,0.08), transparent 70%)',
    }),
  },
  grade: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.5,
    ...web({
      backgroundImage:
        'linear-gradient(rgba(148,170,220,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,170,220,0.06) 1px, transparent 1px)',
      backgroundSize: '56px 56px',
      maskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)',
      WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)',
    }),
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: 'rgba(14,20,36,0.7)',
    marginBottom: 26,
    maxWidth: '100%',
  },
  seloTexto: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  h1: { color: cores.texto, fontFamily: fontes.titulo, fontWeight: '800', letterSpacing: -1.6 },
  sub: { color: cores.textoSuave, fontFamily: fontes.corpo, marginTop: 24, maxWidth: 580 },

  painelWrap: { width: '100%', maxWidth: 520 },
  brilho: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderRadius: 40,
    backgroundColor: 'rgba(47,123,255,0.22)',
    ...web({ filter: 'blur(60px)' }),
  },
  painel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.bordaForte,
    backgroundColor: 'rgba(14,20,36,0.92)',
    padding: 20,
    gap: 22,
    ...web({ backdropFilter: 'blur(12px)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }),
  },
  painelTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  painelTitulo: { color: cores.textoFraco, fontFamily: fontes.corpo, fontSize: 12 },
  fluxo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  conector: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    marginBottom: 22,
    backgroundColor: 'rgba(56,168,255,0.35)',
  },
  no: { alignItems: 'center', gap: 8 },
  noIcone: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,123,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,168,255,0.35)',
  },
  noRotulo: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 12 },
  servico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: cores.superficieAlta,
  },
  servicoNome: { color: cores.texto, fontFamily: fontes.corpo, fontSize: 14, flex: 1 },
  servicoBarra: { width: 64, height: 5, borderRadius: 3, backgroundColor: 'rgba(148,170,220,0.15)' },
  servicoBarraFill: { width: '70%', height: 5, borderRadius: 3, backgroundColor: cores.azul },
  grafico: { gap: 12, padding: 14, borderRadius: 12, backgroundColor: cores.superficieAlta },
  graficoRotulo: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 12 },
});
