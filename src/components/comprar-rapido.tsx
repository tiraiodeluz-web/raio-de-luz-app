import { router } from 'expo-router';
import { useEffect } from 'react';

import { SeletorSantoSheet } from '@/components/seletor-santo-sheet';
import { useAuth } from '@/lib/auth-context';
import { useAdicionarAoCarrinho } from '@/lib/carrinho';
import { useProdutoDetalhe, type ProdutoResumo } from '@/lib/produtos';
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

  useEffect(() => {
    if (session && semPersonalizacao) {
      adicionar.mutate({ produtoId: produto.id }, { onSuccess: () => mostrarToast('Adicionado ao carrinho!') });
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
        adicionar.mutate(
          { produtoId: produto.id, santoId: santo.id },
          { onSuccess: () => mostrarToast('Adicionado ao carrinho!') },
        );
        onFechar();
      }}
    />
  );
}
