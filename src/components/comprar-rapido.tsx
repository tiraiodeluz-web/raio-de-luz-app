import { router } from 'expo-router';
import { useEffect } from 'react';

import { SeletorSantoSheet } from '@/components/seletor-santo-sheet';
import { useAuth } from '@/lib/auth-context';
import { useAdicionarAoCarrinho } from '@/lib/carrinho';
import { ehSantoPersonalizado, useProdutoDetalhe, type ProdutoResumo } from '@/lib/produtos';
import { useToast } from '@/lib/toast-context';

type Props = {
  produto: ProdutoResumo;
  onFechar: () => void;
};

// Compra rápida pelo botão "Comprar" da Home e das ofertas (sem abrir o
// detalhe do produto). Regra 14: sem personalização adiciona direto; com
// santo, abre o seletor. Regra 17 (bug corrigido): sem login vai para o Login.
export function ComprarRapido({ produto, onFechar }: Props) {
  const { session } = useAuth();
  const { data } = useProdutoDetalhe(produto.id);
  const adicionar = useAdicionarAoCarrinho();
  const { mostrarToast } = useToast();
  const semPersonalizacao = !!data && (!data.produto.personalizavel || data.santos.length === 0);

  useEffect(() => {
    if (!session) {
      onFechar();
      router.push('/(auth)/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const snapshotProduto = {
    nome: produto.nome,
    sku: produto.sku,
    preco: produto.preco,
    preco_promocional: produto.preco_promocional,
    imagem_principal: produto.imagem_principal,
    embalagem: produto.embalagem,
  };

  function aoAdicionar(resultado: { offline: boolean }) {
    mostrarToast(resultado.offline ? 'Sem internet: vai ser enviado ao carrinho quando a conexão voltar.' : 'Adicionado ao carrinho!');
  }

  function aoFalhar(erro: unknown) {
    mostrarToast(erro instanceof Error ? erro.message : 'Não foi possível adicionar ao carrinho.');
  }

  useEffect(() => {
    if (session && semPersonalizacao) {
      adicionar.mutate(
        { produtoId: produto.id, produtoSnapshot: snapshotProduto },
        { onSuccess: aoAdicionar, onError: aoFalhar },
      );
      onFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, semPersonalizacao]);

  if (!session || !data || semPersonalizacao) return null;

  return (
    <SeletorSantoSheet
      visivel
      santos={data.santos}
      carregando={adicionar.isPending}
      onFechar={onFechar}
      onSelecionar={(santo) => {
        onFechar();
        // Personalização precisa de um campo de texto que a compra rápida
        // não tem espaço pra mostrar — manda pra tela do produto, que já
        // cuida disso.
        if (ehSantoPersonalizado(santo)) {
          router.push(`/produto/${produto.id}`);
          return;
        }
        adicionar.mutate(
          {
            produtoId: produto.id,
            santoId: santo.id,
            santoNome: santo.nome,
            fotoUrl: santo.fotoUrl,
            produtoSnapshot: snapshotProduto,
          },
          { onSuccess: aoAdicionar, onError: aoFalhar },
        );
      }}
    />
  );
}
