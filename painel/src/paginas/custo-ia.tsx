import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { GraficoBarras } from '../componentes/grafico';
import { SeletorPeriodo } from '../componentes/seletor-periodo';
import { Tabela } from '../componentes/tabela';
import { CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Entrada, Etiqueta, Kpi, Vazio } from '../componentes/ui';
import { custoIaDolar, PRECO_HAIKU, useCotacaoDolar } from '../lib/custo-ia';
import { data, diaCurto, diasEntre, dolar, hoje, lerNumero, numero, porcentagem, reais } from '../lib/formato';
import { calcularPeriodo, type Periodo } from '../lib/periodo';
import { supabase } from '../lib/supabase';

type UsoUsuario = {
  usuario_id: string;
  nome: string | null;
  tipo: 'admin' | 'cliente' | null;
  mensagens: number;
  tokens_entrada: number;
  tokens_saida: number;
  dias_de_uso: number;
  ultimo_uso: string;
};
type UsoDia = { dia: string; mensagens: number; tokens_entrada: number; tokens_saida: number };

export function PaginaCustoIa() {
  const [periodo, setPeriodo] = useState<Periodo>(calcularPeriodo('mes'));
  const [cotacao, setCotacao] = useCotacaoDolar();
  const [cotacaoTexto, setCotacaoTexto] = useState(String(cotacao).replace('.', ','));
  const navegar = useNavigate();

  const consulta = useQuery({
    queryKey: ['custo-ia', periodo.inicio, periodo.fim],
    queryFn: async () => {
      const { data: r, error } = await supabase.rpc('relatorio_custo_ia', { p_inicio: periodo.inicio, p_fim: periodo.fim });
      if (error) throw error;
      return r as unknown as { por_usuario: UsoUsuario[]; por_dia: UsoDia[] };
    },
  });

  const usuarios = (consulta.data?.por_usuario ?? []).map((u) => ({ ...u, custo: custoIaDolar(u.tokens_entrada, u.tokens_saida) }));
  const totalDolar = usuarios.reduce((s, u) => s + u.custo, 0);
  const mensagens = usuarios.reduce((s, u) => s + Number(u.mensagens), 0);
  const fimContado = periodo.fim > hoje() ? hoje() : periodo.fim;
  const diasPassados = Math.max(1, diasEntre(periodo.inicio, fimContado));
  const projecao30 = (totalDolar / diasPassados) * 30;

  return (
    <>
      <CabecalhoPagina
        titulo="Custo do assistente de IA"
        descricao="Quanto o assistente de compras gastou e quem mais usa. Limite atual: 60 mensagens por cliente por dia."
        acoes={
          <div className="filtros" style={{ margin: 0 }}>
            <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
            <Campo rotulo="Dólar (R$)">
              <Entrada
                style={{ width: 90 }}
                value={cotacaoTexto}
                onChange={(e) => setCotacaoTexto(e.target.value)}
                onBlur={() => {
                  const v = lerNumero(cotacaoTexto);
                  if (v && v > 0) setCotacao(v);
                  else setCotacaoTexto(String(cotacao).replace('.', ','));
                }}
              />
            </Campo>
          </div>
        }
      />
      {consulta.isLoading ? (
        <Carregando />
      ) : consulta.error ? (
        <CaixaErro erro={consulta.error} tentarDeNovo={() => consulta.refetch()} />
      ) : (
        <div className="pilha g">
          <div className="grade grade-kpi">
            <Kpi destaque rotulo="Gasto no período" valor={reais(totalDolar * cotacao)} detalhe={dolar(totalDolar)} />
            <Kpi rotulo="Mensagens" valor={numero(mensagens)} detalhe={`${numero(usuarios.length)} pessoa(s) usaram`} />
            <Kpi rotulo="Custo por mensagem" valor={reais(mensagens ? (totalDolar / mensagens) * cotacao : 0)} detalhe={mensagens ? dolar(totalDolar / mensagens) : undefined} />
            <Kpi rotulo="Projeção para 30 dias" valor={reais(projecao30 * cotacao)} detalhe={`no ritmo de ${diasPassados} dia(s)`} />
          </div>

          <Cartao titulo="Mensagens por dia">
            {mensagens === 0 ? (
              <Vazio icone="🤖" titulo="Ninguém usou o assistente no período" />
            ) : (
              <GraficoBarras
                dados={(consulta.data?.por_dia ?? []).map((d) => ({
                  rotulo: diaCurto(d.dia),
                  valor: Number(d.mensagens),
                  dica: `${numero(d.mensagens)} msg · ${reais(custoIaDolar(d.tokens_entrada, d.tokens_saida) * cotacao)}`,
                }))}
              />
            )}
          </Cartao>

          <Cartao titulo="Quem mais usa" semCorpo>
            <Tabela
              linhas={usuarios}
              chaveLinha={(u) => u.usuario_id}
              aoClicar={(u) => u.tipo === 'cliente' && navegar(`/clientes/${u.usuario_id}`)}
              ordemInicial={{ chave: 'custo', desc: true }}
              vazio={<Vazio icone="🤖" titulo="Sem uso no período" />}
              colunas={[
                {
                  chave: 'nome',
                  titulo: 'Quem',
                  ordenar: (u) => u.nome,
                  celula: (u) => (
                    <span className="linha">
                      <span className="forte">{u.nome || 'Conta apagada'}</span>
                      {u.tipo === 'admin' ? <Etiqueta tom="info">admin</Etiqueta> : null}
                    </span>
                  ),
                },
                { chave: 'msgs', titulo: 'Mensagens', classe: 'num', ordenar: (u) => Number(u.mensagens), celula: (u) => numero(u.mensagens) },
                { chave: 'dias', titulo: 'Dias de uso', classe: 'num', ordenar: (u) => Number(u.dias_de_uso), celula: (u) => numero(u.dias_de_uso) },
                { chave: 'ultimo', titulo: 'Último uso', ordenar: (u) => u.ultimo_uso, celula: (u) => data(u.ultimo_uso) },
                {
                  chave: 'tokens',
                  titulo: 'Tokens (entrada / saída)',
                  classe: 'num',
                  ordenar: (u) => Number(u.tokens_entrada),
                  celula: (u) => `${numero(u.tokens_entrada)} / ${numero(u.tokens_saida)}`,
                },
                { chave: 'custo', titulo: 'Custo', classe: 'num', ordenar: (u) => u.custo, celula: (u) => <strong>{reais(u.custo * cotacao)}</strong> },
                { chave: 'parte', titulo: '% do total', classe: 'num', ordenar: (u) => u.custo, celula: (u) => (totalDolar ? porcentagem(u.custo / totalDolar) : '—') },
              ]}
            />
          </Cartao>
          <p className="texto-3 pequeno">
            Cálculo: modelo Claude Haiku 5.5 a US$ {String(PRECO_HAIKU.entrada).replace('.', ',')} por milhão de tokens de entrada e US$ {String(PRECO_HAIKU.saida).replace('.', ',')} por milhão de saída. É um teto: parte da entrada vem do cache, que custa menos, então a fatura da Anthropic tende a ser um pouco menor. A cotação do dólar fica salva só neste navegador.
          </p>
        </div>
      )}
    </>
  );
}
