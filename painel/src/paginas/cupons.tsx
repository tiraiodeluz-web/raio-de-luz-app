import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAvisar } from '../componentes/avisos';
import { Tabela } from '../componentes/tabela';
import { Botao, CabecalhoPagina, Campo, CaixaErro, Carregando, Cartao, Entrada, Interruptor, Modal, Vazio } from '../componentes/ui';
import { mensagemErro } from '../lib/erros';
import { data, lerNumero, numero, reais } from '../lib/formato';
import { supabase } from '../lib/supabase';
import type { Tables } from '@/types/database';

type Cupom = Tables<'cupons'> & { usos: number; descontoTotal: number; ultimoUso: string | null };

// Cupom de valor fixo em reais, descontado do pedido no checkout (limitado
// ao subtotal). Regra em public.criar_pedido.
export function PaginaCupons() {
  const [editando, setEditando] = useState<Cupom | 'novo' | null>(null);
  const avisar = useAvisar();
  const queryClient = useQueryClient();

  const lista = useQuery({
    queryKey: ['cupons'],
    queryFn: async () => {
      const [cupons, pedidos] = await Promise.all([
        supabase.from('cupons').select('*').order('criado_em', { ascending: false }),
        supabase.from('pedidos').select('cupom_codigo, desconto, criado_em').not('cupom_codigo', 'is', null).neq('status', 'cancelado'),
      ]);
      if (cupons.error) throw cupons.error;
      if (pedidos.error) throw pedidos.error;
      return cupons.data.map((c): Cupom => {
        const usos = pedidos.data.filter((p) => p.cupom_codigo?.toUpperCase() === c.codigo.toUpperCase());
        return {
          ...c,
          usos: usos.length,
          descontoTotal: usos.reduce((s, p) => s + Number(p.desconto), 0),
          ultimoUso: usos.map((p) => p.criado_em).sort().at(-1) ?? null,
        };
      });
    },
  });

  const alternar = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('cupons').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cupons'] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Cupons de desconto"
        descricao="O cliente digita o código no fechamento do pedido e ganha o valor em reais de desconto."
        acoes={
          <Botao variante="primario" onClick={() => setEditando('novo')}>
            + Novo cupom
          </Botao>
        }
      />
      <Cartao semCorpo>
        {lista.isLoading ? (
          <Carregando />
        ) : lista.error ? (
          <div className="cartao-corpo">
            <CaixaErro erro={lista.error} tentarDeNovo={() => lista.refetch()} />
          </div>
        ) : (
          <Tabela
            linhas={lista.data ?? []}
            chaveLinha={(c) => c.id}
            aoClicar={(c) => setEditando(c)}
            vazio={<Vazio icone="🏷️" titulo="Nenhum cupom ainda">Crie um código como BEMVINDO10 pra dar R$ 10 de desconto.</Vazio>}
            colunas={[
              { chave: 'codigo', titulo: 'Código', celula: (c) => <span className="mono forte" style={{ fontSize: 14 }}>{c.codigo}</span>, ordenar: (c) => c.codigo },
              { chave: 'valor', titulo: 'Desconto', classe: 'num', celula: (c) => reais(c.valor), ordenar: (c) => Number(c.valor) },
              { chave: 'usos', titulo: 'Usado em', classe: 'num', celula: (c) => `${numero(c.usos)} pedido(s)`, ordenar: (c) => c.usos },
              { chave: 'total', titulo: 'Desconto dado', classe: 'num', celula: (c) => reais(c.descontoTotal), ordenar: (c) => c.descontoTotal },
              { chave: 'ultimo', titulo: 'Último uso', celula: (c) => data(c.ultimoUso), ordenar: (c) => c.ultimoUso },
              { chave: 'criado', titulo: 'Criado em', celula: (c) => data(c.criado_em), ordenar: (c) => c.criado_em },
              {
                chave: 'ativo',
                titulo: 'Vale',
                classe: 'centro',
                celula: (c) => <Interruptor marcado={c.ativo} aoMudar={(v) => alternar.mutate({ id: c.id, ativo: v })} />,
              },
            ]}
          />
        )}
      </Cartao>
      {editando ? <ModalCupom cupom={editando === 'novo' ? null : editando} existentes={lista.data ?? []} aoFechar={() => setEditando(null)} /> : null}
    </>
  );
}

function ModalCupom({ cupom, existentes, aoFechar }: { cupom: Cupom | null; existentes: Cupom[]; aoFechar: () => void }) {
  const [codigo, setCodigo] = useState(cupom?.codigo ?? '');
  const [valor, setValor] = useState(cupom ? String(cupom.valor).replace('.', ',') : '');
  const [ativo, setAtivo] = useState(cupom?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();
  const avisar = useAvisar();

  async function salvar() {
    const cod = codigo.trim().toUpperCase();
    const v = lerNumero(valor);
    if (!/^[A-Z0-9_-]{3,30}$/.test(cod)) return setErro('Código com 3 a 30 letras/números, sem espaço (ex.: BEMVINDO10).');
    if (existentes.some((c) => c.id !== cupom?.id && c.codigo.toUpperCase() === cod)) return setErro('Já existe um cupom com esse código.');
    if (v === null || v <= 0) return setErro('Informe um valor maior que zero.');
    setSalvando(true);
    setErro(null);
    const dados = { codigo: cod, valor: v, ativo };
    const { error } = cupom ? await supabase.from('cupons').update(dados).eq('id', cupom.id) : await supabase.from('cupons').insert(dados);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    queryClient.invalidateQueries({ queryKey: ['cupons'] });
    avisar('Cupom salvo', 'sucesso');
    aoFechar();
  }

  async function apagar() {
    if (!cupom) return;
    if (cupom.usos > 0) return setErro('Esse cupom já foi usado: desative em vez de apagar, pra manter o histórico.');
    if (!confirm(`Apagar o cupom ${cupom.codigo}?`)) return;
    const { error } = await supabase.from('cupons').delete().eq('id', cupom.id);
    if (error) return setErro(mensagemErro(error));
    queryClient.invalidateQueries({ queryKey: ['cupons'] });
    aoFechar();
  }

  return (
    <Modal
      titulo={cupom ? `Cupom ${cupom.codigo}` : 'Novo cupom'}
      aoFechar={aoFechar}
      rodape={
        <>
          {cupom ? (
            <Botao variante="perigo" onClick={apagar} style={{ marginRight: 'auto' }}>
              Apagar
            </Botao>
          ) : null}
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" onClick={salvar} carregando={salvando}>
            Salvar
          </Botao>
        </>
      }>
      <div className="form-grade">
        <Campo rotulo="Código" ajuda="O cliente digita assim (maiúsculas ou minúsculas tanto faz).">
          <Entrada value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))} autoFocus />
        </Campo>
        <Campo rotulo="Desconto em reais" ajuda="Nunca passa do valor do pedido.">
          <Entrada prefixo="R$" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
        </Campo>
      </div>
      <Interruptor marcado={ativo} aoMudar={setAtivo} rotulo="Cupom valendo" />
      {erro ? <div className="caixa-erro">{erro}</div> : null}
    </Modal>
  );
}
