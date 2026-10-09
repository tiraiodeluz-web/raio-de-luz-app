import { StyleSheet, Text, View } from 'react-native';

import { LinkNav } from './cabecalho';
import { Logo } from './logo';
import { cores, fontes, secoes } from './tokens';
import { Container, useLayout } from './ui';

export function Rodape({ irPara }: { irPara: (id: string) => void }) {
  const { celular } = useLayout();
  return (
    <View style={styles.rodape}>
      <Container>
        <View style={{ flexDirection: celular ? 'column' : 'row', justifyContent: 'space-between', gap: 32 }}>
          <View style={{ maxWidth: 420, gap: 16 }}>
            <Logo tamanho={40} />
            <Text style={styles.texto}>
              Desenvolvimento, manutenção e gestão de sistemas, bancos de dados e infraestrutura tecnológica para empresas.
            </Text>
          </View>
          <View>
            <Text style={styles.titulo}>Navegação</Text>
            <View style={{ marginLeft: -14 }}>
              {secoes.map((s) => (
                <LinkNav key={s.id} rotulo={s.rotulo} onPress={() => irPara(s.id)} />
              ))}
            </View>
          </View>
        </View>
        <View style={styles.base}>
          <Text style={styles.copy}>© {new Date().getFullYear()} Clyvo Tecnologia. Todos os direitos reservados.</Text>
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  rodape: { paddingTop: 64, paddingBottom: 32, backgroundColor: cores.fundoAlt, borderTopWidth: 1, borderTopColor: cores.borda },
  texto: { color: cores.textoSuave, fontFamily: fontes.corpo, fontSize: 14.5, lineHeight: 24 },
  titulo: { color: cores.texto, fontFamily: fontes.titulo, fontSize: 14, fontWeight: '600', marginBottom: 10 },
  base: { marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: cores.borda },
  copy: { color: cores.textoFraco, fontFamily: fontes.corpo, fontSize: 13 },
});
