// Links de contato mostrados em "Sobre o aplicativo". O levantamento da
// migração não trouxe as URLs reais do site/Instagram nem um e-mail de
// contato — fica null até alguém preencher (a tela esconde o que for null
// em vez de mostrar um link inventado).
export const LINKS_INSTITUCIONAIS: {
  site: string | null;
  instagram: string | null;
  whatsapp: string;
  email: string | null;
} = {
  site: null,
  instagram: null,
  whatsapp: 'https://wa.me/5543999636907',
  email: null,
};
