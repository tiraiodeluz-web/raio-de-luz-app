import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, diferenciais, etapas, faq, fontes, LINK_ASSINATURA, NOTA_PAGAMENTO, planos, solucoes, type Plano } from './tokens';
import { Botao, Container, Reveal, TituloSecao, useLayout, web, type EstadoPressable } from './ui';

type Icone = keyof typeof Feather.glyphMap;

function Secao({ id, onLayout, children, alt }: { id: string; onLayout: (id: string, y: number) => void; children: React.ReactNode; alt?: boolean }) {
  const { celular } = useLayout();
  return (
    <View
      onLayout={(e) => onLayout(id, e.nativeEvent.layout.y)}
      style={{ paddingVertical: celular ? 64 : 104, backgroundColor: alt ? cores.fundoAlt : cores.fundo }}
    >
      <Container>{children}</Container>
    </View>
  );
}

function CartaoIcone({ icone, titulo, texto, atraso }: { icone: Icone; titulo: string; texto: string; atraso: number }) {
  const [hover, setHover] = useState(false);
  return (
    <Reveal atraso={atraso} style={{ flexGrow: 1, flexBasis: 300, minWidth: 260 }}>
      <Pressable
        accessible={false}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={[
          styles.cartao,
          hover && { borderColor: 'rgba(56,168,255,0.55)', backgroundColor: cores.superficieAlta, transform: [{ translateY: -4 }] },
          web({ transition: 'all 220ms ease', cursor: 'default' }),
        ]}
      >
        <View style={[styles.icone, hover && { backgroundColor: cores.azul }]}>
          <Feather name={icone} size={22} color={hover ? cores.branco : cores.azulClaro} />
        </View>
        <Text style={styles.cartaoTitulo}>{titulo}</Text>
        <Text style={styles.cartaoTexto}>{texto}</Text>
      </Pressable>
    </Reveal>
  );
}

export function Solucoes({ onLayout }: { onLayout: (id: string, y: number) => void }) {
  return (
    <Secao id="solucoes" onLayout={onLayout} alt>
      <TituloSecao
        etiqueta="Soluções"
        titulo="Tecnologia para manter sua operação em movimento"
        subtitulo="Do desenvolvimento à infraestrutura: serviços organizados para apoiar os sistemas da sua empresa, dentro do escopo contratado."
      />
      <View style={styles.grade}>
        {solucoes.map((s, i) => (
          <CartaoIcone key={s.titulo} icone={s.icone} titulo={s.titulo} texto={s.texto} atraso={(i % 3) * 90} />
        ))}
      </View>
    </Secao>
  );
}

function CartaoPlano({ plano }: { plano: Plano }) {
  const { desktop } = useLayout();
  const [hover, setHover] = useState(false);
  const d = plano.destaque;
  return (
    <Pressable
      accessible={false}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={[
        styles.plano,
        d && styles.planoDestaque,
        hover && { borderColor: cores.azulClaro },
        d && desktop && { marginTop: -16, marginBottom: -16, paddingVertical: 40 },
        web({ transition: 'all 220ms ease', cursor: 'default' }),
      ]}
    >
      {d ? (
        <View style={styles.faixa}>
          <Text style={styles.faixaTexto}>Plano de entrada</Text>
        </View>
      ) : null}
      <Text style={styles.planoNome}>{plano.nome}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
        <Text style={styles.moeda}>R$ </Text>
        <Text style={styles.preco}>{plano.preco}</Text>
        <Text style={styles.mes}>/mês</Text>
      </View>
      <Text style={styles.planoDesc}>{plano.descricao}</Text>
      <View style={styles.divisor} />
      {plano.intro ? <Text style={styles.intro}>{plano.intro}</Text> : <Text style={styles.intro}>Inclui:</Text>}
      <View style={{ gap: 12, flex: 1 }}>
        {plano.itens.map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={styles.check}>
              <Feather name="check" size={12} color={cores.ciano} />
            </View>
            <Text style={styles.item}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Botao rotulo={plano.botao} href={LINK_ASSINATURA} variante={d ? 'primario' : 'secundario'} grande largo />
        <Text style={styles.nota}>{NOTA_PAGAMENTO}</Text>
        {plano.observacao ? <Text style={[styles.nota, { color: cores.textoSuave }]}>{plano.observacao}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Planos({ onLayout }: { onLayout: (id: string, y: number) => void }) {
  const { desktop } = useLayout();
  return (
    <Secao id="planos" onLayout={onLayout}>
      <TituloSecao
        etiqueta="Planos e preços"
        titulo="Planos transparentes. Tecnologia sem complicação."
        subtitulo="Escolha o nível de acompanhamento tecnológico adequado às necessidades da sua empresa."
      />
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 24, alignItems: 'stretch' }}>
        {planos.map((p) => (
          <View key={p.id} style={{ flex: desktop ? 1 : undefined }}>
            <CartaoPlano plano={p} />
          </View>
        ))}
      </View>
      <View style={styles.avisos}>
        <Text style={styles.aviso}>
          Todos os valores são mensais. Os planos Profissional e Empresarial são propostas comerciais: detalhes e escopo
          são confirmados antes da contratação.
        </Text>
        <Text style={styles.aviso}>
          Serviços adicionais, desenvolvimento de novos módulos e grandes alterações podem depender de orçamento específico.
        </Text>
      </View>
    </Secao>
  );
}

export function PorQue({ onLayout }: { onLayout: (id: string, y: number) => void }) {
  return (
    <Secao id="por-que" onLayout={onLayout} alt>
      <TituloSecao etiqueta="Diferenciais" titulo="Por que escolher a Clyvo?" subtitulo="Princípios que guiam a forma como cuidamos da tecnologia do seu negócio." />
      <View style={styles.grade}>
        {diferenciais.map((d, i) => (
          <CartaoIcone key={d.titulo} icone={d.icone} titulo={d.titulo} texto={d.texto} atraso={(i % 3) * 90} />
        ))}
      </View>
    </Secao>
  );
}

export function ComoFunciona({ onLayout }: { onLayout: (id: string, y: number) => void }) {
  const { desktop } = useLayout();
  return (
    <Secao id="como-funciona" onLayout={onLayout}>
      <TituloSecao etiqueta="Processo" titulo="Como funciona" subtitulo="Um caminho simples, em quatro etapas, do primeiro contato à evolução contínua." />
      <View style={{ flexDirection: desktop ? 'row' : 'column' }}>
        {etapas.map((e, i) => {
          const ultima = i === etapas.length - 1;
          return (
            <Reveal key={e.titulo} atraso={i * 110} style={{ flex: desktop ? 1 : undefined }}>
              <View style={{ flexDirection: desktop ? 'column' : 'row', gap: desktop ? 20 : 18 }}>
                <View style={{ flexDirection: desktop ? 'row' : 'column', alignItems: 'center' }}>
                  <View style={styles.numero}>
                    <Text style={styles.numeroTexto}>{i + 1}</Text>
                  </View>
                  {!ultima ? <View style={desktop ? styles.linhaH : styles.linhaV} /> : null}
                </View>
                <View style={{ flex: desktop ? undefined : 1, paddingRight: desktop ? 24 : 0, paddingBottom: desktop ? 0 : 32 }}>
                  <Text style={styles.etapaTitulo}>{e.titulo}</Text>
                  <Text style={styles.cartaoTexto}>{e.texto}</Text>
                </View>
              </View>
            </Reveal>
          );
        })}
      </View>
    </Secao>
  );
}

export function Sobre({ onLayout }: { onLayout: (id: string, y: number) => void }) {
  const { celular } = useLayout();
  return (
    <Secao id="sobre" onLayout={onLayout} alt>
      <Reveal>
        <View style={styles.sobre}>
          <View style={styles.etiquetaSobre}>
            <Text style={styles.etiquetaSobreTexto}>SOBRE A CLYVO</Text>
          </View>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={[styles.sobreTitulo, { fontSize: celular ? 28 : 42, lineHeight: celular ? 36 : 52 }]}
          >
            Tecnologia que trabalha a favor do seu negócio.
          </Text>
          <Text style={[styles.sobreTexto, { fontSize: celular ? 16 : 19, lineHeight: celular ? 27 : 31 }]}>
            A Clyvo Tecnologia atua com foco no desenvolvimento, na manutenção e na gestão de soluções tecnológicas para
            empresas. Nosso objetivo é simplificar a operação dos sistemas, cuidar da infraestrutura e apoiar a evolução
            digital dos negócios com uma abordagem prática, organizada e transparente.
          </Text>
        </View>
      </Reveal>
    </Secao>
  );
}

function ItemFaq({ pergunta, resposta, aberto, alternar, indice }: { pergunta: string; resposta: string; aberto: boolean; alternar: () => void; indice: number }) {
  return (
    <View style={[styles.faqItem, aberto && { borderColor: 'rgba(56,168,255,0.45)' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        aria-controls={`faq-resposta-${indice}`}
        onPress={alternar}
        style={({ hovered, focused }: EstadoPressable) => [
          styles.faqPergunta,
          hovered && { backgroundColor: 'rgba(255,255,255,0.03)' },
          focused && { borderColor: cores.ciano },
          web({ cursor: 'pointer', transition: 'background-color 180ms ease' }),
        ]}
      >
        <Text style={styles.faqTexto}>{pergunta}</Text>
        <Feather name={aberto ? 'minus' : 'plus'} size={20} color={cores.azulClaro} />
      </Pressable>
      {aberto ? (
        <View nativeID={`faq-resposta-${indice}`} style={{ paddingHorizontal: 22, paddingBottom: 22 }}>
          <Text style={styles.faqResposta}>{resposta}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function Faq({ onLayout }: { onLayout: (id: string, y: number) => void }) {
  const [aberto, setAberto] = useState<number | null>(0);
  return (
    <Secao id="faq" onLayout={onLayout}>
      <TituloSecao etiqueta="FAQ" titulo="Perguntas frequentes" subtitulo="Respostas diretas sobre planos, pagamento e escopo." />
      <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center', gap: 12 }}>
        {faq.map((f, i) => (
          <ItemFaq key={f.pergunta} indice={i} pergunta={f.pergunta} resposta={f.resposta} aberto={aberto === i} alternar={() => setAberto(aberto === i ? null : i)} />
        ))}
      </View>
    </Secao>
  );
}

export function Cta() {
  const { celular } = useLayout();
  return (
    <View style={{ paddingBottom: celular ? 64 : 104, backgroundColor: cores.fundo }}>
      <Container>
        <View style={[styles.cta, { padding: celular ? 28 : 56 }]}>
          <Text style={[styles.sobreTitulo, { fontSize: celular ? 26 : 36, lineHeight: celular ? 34 : 44, textAlign: 'center' }]}>
            Pronto para ter seus sistemas sob acompanhamento?
          </Text>
          <Text style={[styles.sobreTexto, { textAlign: 'center', fontSize: 17, marginTop: 12 }]}>
            Contrate o plano Essencial por R$ 497,00/mês.
          </Text>
          <View style={{ marginTop: 28, alignItems: 'center', gap: 10 }}>
            <Botao rotulo="Contratar agora" href={LINK_ASSINATURA} grande />
            <Text style={styles.nota}>{NOTA_PAGAMENTO}</Text>
          </View>
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  cartao: {
    flex: 1,
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,123,255,0.14)',
    marginBottom: 20,
    ...web({ transition: 'background-color 220ms ease' }),
  },
  cartaoTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 19, fontWeight: '600', marginBottom: 10 },
  cartaoTexto: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 15, lineHeight: 24 },

  plano: {
    flex: 1,
    padding: 32,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  planoDestaque: {
    borderColor: cores.azul,
    borderWidth: 2,
    backgroundColor: cores.superficieAlta,
    ...web({ boxShadow: '0 20px 70px rgba(47,123,255,0.28)' }),
  },
  faixa: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: cores.azul,
  },
  faixaTexto: { color: cores.branco, fontFamily: fontes.corpo, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  planoNome: { color: cores.azulClaro, fontFamily: fontes.titulo, fontSize: 18, fontWeight: '700' },
  moeda: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 20, marginBottom: 8 },
  preco: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 48, fontWeight: '800', letterSpacing: -1.5, lineHeight: 54 },
  mes: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 16, marginBottom: 8, marginLeft: 4 },
  planoDesc: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 15, lineHeight: 24, marginTop: 14 },
  divisor: { height: 1, backgroundColor: cores.borda, marginVertical: 24 },
  intro: { color: cores.texto, fontFamily: fontes.corpo, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
  },
  item: { flex: 1, color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 14.5, lineHeight: 22 },
  nota: { color: cores.textoFraco, fontFamily: fontes.corpo, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  avisos: { marginTop: 44, gap: 8, alignItems: 'center' },
  aviso: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 760 },

  numero: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cores.azulClaro,
    backgroundColor: 'rgba(47,123,255,0.15)',
  },
  numeroTexto: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18, fontWeight: '700' },
  linhaH: { flex: 1, height: 2, marginHorizontal: 12, backgroundColor: 'rgba(56,168,255,0.3)' },
  linhaV: { flex: 1, width: 2, minHeight: 40, marginTop: 8, backgroundColor: 'rgba(56,168,255,0.3)' },
  etapaTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 18, fontWeight: '600', marginBottom: 8, marginTop: 4 },

  sobre: { alignItems: 'center', maxWidth: 860, alignSelf: 'center' },
  etiquetaSobre: { marginBottom: 20 },
  etiquetaSobreTexto: { color: cores.azulClaro, fontFamily: fontes.corpo, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  sobreTitulo: { color: cores.texto, fontFamily: fontes.titulo, fontWeight: '700', letterSpacing: -1, textAlign: 'center' },
  sobreTexto: { color: cores.textoSuave, fontFamily: fontes.corpo, textAlign: 'center', marginTop: 24 },

  faqItem: { borderRadius: 14, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie, overflow: 'hidden' },
  faqPergunta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 22,
    minHeight: 44,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 14,
  },
  faqTexto: { flex: 1, color: cores.texto, fontFamily: fontes.corpo, fontSize: 16.5, fontWeight: '600', lineHeight: 24 },
  faqResposta: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 15.5, lineHeight: 26 },

  cta: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: cores.bordaForte,
    alignItems: 'center',
    backgroundColor: cores.superficie,
    ...web({
      backgroundImage: 'radial-gradient(ellipse 70% 120% at 50% 0%, rgba(47,123,255,0.28), transparent 70%)',
    }),
  },
});
