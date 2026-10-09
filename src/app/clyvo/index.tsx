import Head from 'expo-router/head';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Cabecalho } from '@/clyvo/cabecalho';
import { Hero } from '@/clyvo/hero';
import { SIMBOLO_DATA_URI } from '@/clyvo/logo';
import { Rodape } from '@/clyvo/rodape';
import { ComoFunciona, Cta, Faq, Planos, PorQue, Sobre, Solucoes } from '@/clyvo/secoes-conteudo';
import { cores } from '@/clyvo/tokens';

const TITULO = 'Clyvo Tecnologia — Manutenção e gestão de sistemas, bancos de dados e infraestrutura';
const DESCRICAO =
  'A Clyvo Tecnologia cuida da manutenção, infraestrutura, banco de dados e evolução dos sistemas da sua empresa. Planos mensais a partir de R$ 497,00.';
const ALTURA_CABECALHO = 72;

export default function ClyvoSite() {
  const scroll = useRef<ScrollView>(null);
  const posicoes = useRef<Record<string, number>>({});
  const [rolou, setRolou] = useState(false);

  const registrar = useCallback((id: string, y: number) => {
    posicoes.current[id] = y;
  }, []);

  const irPara = useCallback((id: string) => {
    const y = id === 'inicio' ? 0 : (posicoes.current[id] ?? 0) - ALTURA_CABECALHO + 1;
    scroll.current?.scrollTo({ y: Math.max(y, 0), animated: true });
  }, []);

  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => setRolou(e.nativeEvent.contentOffset.y > 8);

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <Head>
        <title>{TITULO}</title>
        <meta name="description" content={DESCRICAO} />
        <meta name="theme-color" content="#070A12" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:title" content={TITULO} />
        <meta property="og:description" content={DESCRICAO} />
        <meta name="twitter:card" content="summary" />
        <link rel="icon" type="image/svg+xml" href={SIMBOLO_DATA_URI} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
        />
      </Head>

      <Cabecalho irPara={irPara} rolou={rolou} />
      <ScrollView ref={scroll} onScroll={aoRolar} scrollEventThrottle={32} showsVerticalScrollIndicator={false}>
        <Hero irPara={irPara} />
        <Solucoes onLayout={registrar} />
        <Planos onLayout={registrar} />
        <PorQue onLayout={registrar} />
        <ComoFunciona onLayout={registrar} />
        <Sobre onLayout={registrar} />
        <Faq onLayout={registrar} />
        <Cta />
        <Rodape irPara={irPara} />
      </ScrollView>
    </View>
  );
}
