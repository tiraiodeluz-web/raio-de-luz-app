// Links de contato mostrados em "Sobre o aplicativo", confirmados pelo
// Carlos em 29/09/2026 a partir da tela oficial do Bubble.
export const LINKS_INSTITUCIONAIS: {
  site: string | null;
  instagram: string | null;
  whatsapp: string;
  email: string | null;
} = {
  site: null,
  instagram: null,
  // Mesmo número usado no WhatsApp de pedidos (lib/whatsapp.ts) — confirma
  // com o Carlos se é este mesmo ou outro, os visíveis no print estavam
  // cortados ("rádiodeluzreligiosos.co...", "@raiodeluzartigosreligio...",
  // "contato@raiodeluzreligi...").
  whatsapp: 'https://wa.me/5543996081065',
  email: null,
};

// Rodapé "Desenvolvido por" da tela Sobre, visível por completo no print.
export const DESENVOLVIDO_POR = {
  nome: '@CA_APPS',
  instagram: 'https://instagram.com/ca_apps',
};
