// Identidade visual e conteúdo da Clyvo Tecnologia.

export const cores = {
  fundo: '#070A12',
  fundoAlt: '#0A0F1C',
  superficie: '#0E1424',
  superficieAlta: '#131B30',
  borda: 'rgba(148,170,220,0.14)',
  bordaForte: 'rgba(148,170,220,0.28)',
  texto: '#F1F5FF',
  textoSuave: '#A3AFCB',
  textoFraco: '#7C89A8',
  azul: '#2F7BFF',
  azulClaro: '#38A8FF',
  ciano: '#22D3EE',
  branco: '#FFFFFF',
  verde: '#34D399',
} as const;

export const fontes = {
  titulo: "Sora, Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  corpo: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// Único meio de pagamento online do site — URL exatamente como fornecida.
export const LINK_ASSINATURA = 'https://mpago.la/2XxjPPt';
export const NOTA_PAGAMENTO = 'Pagamento por assinatura recorrente via Mercado Pago.';

export const secoes = [
  { id: 'inicio', rotulo: 'Início' },
  { id: 'solucoes', rotulo: 'Soluções' },
  { id: 'planos', rotulo: 'Planos e preços' },
  { id: 'sobre', rotulo: 'Sobre a Clyvo' },
  { id: 'faq', rotulo: 'FAQ' },
] as const;

export type SecaoId = (typeof secoes)[number]['id'] | 'por-que' | 'como-funciona';

export const solucoes = [
  {
    icone: 'code',
    titulo: 'Desenvolvimento de sistemas',
    texto:
      'Criação e evolução de sistemas personalizados para otimizar processos e atender às necessidades operacionais das empresas.',
  },
  {
    icone: 'tool',
    titulo: 'Manutenção e suporte técnico',
    texto:
      'Correções, resolução de problemas, manutenção preventiva e suporte para manter os sistemas funcionando adequadamente.',
  },
  {
    icone: 'database',
    titulo: 'Banco de dados',
    texto:
      'Gestão e manutenção da estrutura de dados, organização, integridade e acompanhamento do funcionamento do banco de dados.',
  },
  {
    icone: 'server',
    titulo: 'Infraestrutura tecnológica',
    texto:
      'Administração e manutenção dos serviços necessários para manter aplicações e sistemas disponíveis.',
  },
  {
    icone: 'refresh-cw',
    titulo: 'Atualizações e melhorias',
    texto:
      'Implementação de melhorias, ajustes funcionais e evolução contínua conforme as necessidades do negócio e o escopo contratado.',
  },
  {
    icone: 'zap',
    titulo: 'Automação de processos',
    texto:
      'Integração entre ferramentas, automatização de tarefas repetitivas e otimização de fluxos de trabalho empresariais.',
  },
] as const;

export interface Plano {
  id: string;
  nome: string;
  preco: string;
  descricao: string;
  intro?: string;
  itens: string[];
  botao: string;
  destaque?: boolean;
  observacao?: string;
}

export const planos: Plano[] = [
  {
    id: 'essencial',
    nome: 'Essencial',
    preco: '497,00',
    descricao:
      'Acompanhamento tecnológico contínuo para empresas que precisam manter seus sistemas e infraestrutura.',
    itens: [
      'Manutenção do sistema contratado',
      'Gestão e manutenção do banco de dados',
      'Infraestrutura tecnológica necessária ao sistema contratado',
      'Correções de erros e ajustes técnicos',
      'Atualizações e melhorias dentro do escopo acordado',
      'Suporte técnico relacionado ao sistema',
      'Acompanhamento do funcionamento da estrutura',
      'Gestão básica dos serviços e integrações utilizados pelo sistema',
    ],
    botao: 'Contratar plano',
    destaque: true,
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: '797,00',
    descricao:
      'Acompanhamento ampliado para empresas que precisam evoluir seus processos e sistemas continuamente.',
    intro: 'Inclui os itens do Essencial, além de:',
    itens: [
      'Prioridade no atendimento, conforme condições contratadas',
      'Maior disponibilidade para melhorias e ajustes',
      'Acompanhamento ampliado de integrações e automações',
      'Planejamento periódico de melhorias',
      'Apoio técnico para otimização de processos',
    ],
    botao: 'Escolher Profissional',
    observacao: 'Detalhes e escopo confirmados antes da contratação.',
  },
  {
    id: 'empresarial',
    nome: 'Empresarial',
    preco: '1.197,00',
    descricao:
      'Gestão tecnológica ampliada para operações que necessitam de acompanhamento mais próximo.',
    intro: 'Inclui os itens do Profissional, além de:',
    itens: [
      'Planejamento técnico personalizado',
      'Acompanhamento ampliado da infraestrutura',
      'Consultoria para evolução de sistemas',
      'Apoio na priorização de melhorias',
      'Escopo de atendimento e acompanhamento definido conforme as necessidades da empresa',
    ],
    botao: 'Falar sobre o Empresarial',
    observacao: 'O escopo deverá ser alinhado antes da contratação.',
  },
];

export const diferenciais = [
  { icone: 'repeat', titulo: 'Continuidade', texto: 'Acompanhamento da estrutura tecnológica ao longo do tempo.' },
  { icone: 'layers', titulo: 'Organização', texto: 'Manutenção e gestão dos serviços utilizados pelo sistema.' },
  { icone: 'trending-up', titulo: 'Evolução', texto: 'Melhorias contínuas conforme as necessidades e o escopo acordado.' },
  { icone: 'eye', titulo: 'Transparência', texto: 'Planos mensais e serviços apresentados de forma clara.' },
  { icone: 'message-circle', titulo: 'Proximidade', texto: 'Comunicação direta e acompanhamento das necessidades do negócio.' },
  { icone: 'briefcase', titulo: 'Foco empresarial', texto: 'Tecnologia pensada para apoiar os processos da empresa.' },
] as const;

export const etapas = [
  { titulo: 'Entendemos sua operação', texto: 'Identificamos as necessidades tecnológicas e o sistema que precisa de acompanhamento.' },
  { titulo: 'Definimos o escopo', texto: 'Alinhamos serviços, responsabilidades e condições de atendimento.' },
  { titulo: 'Iniciamos o acompanhamento', texto: 'Organizamos a manutenção do sistema, do banco de dados e da infraestrutura contratada.' },
  { titulo: 'Mantemos a evolução', texto: 'Realizamos o acompanhamento, as correções e as melhorias previstas no plano.' },
] as const;

export const faq = [
  {
    pergunta: 'O valor é cobrado mensalmente?',
    resposta:
      'Sim. Os planos apresentados possuem valores mensais. A assinatura do plano Essencial é realizada por meio do Mercado Pago, conforme as condições exibidas na contratação.',
  },
  {
    pergunta: 'O que está incluído no plano de R$ 497?',
    resposta:
      'O plano Essencial contempla manutenção do sistema contratado, banco de dados, infraestrutura necessária, correções, atualizações e suporte técnico relacionado ao sistema, respeitando o escopo acordado.',
  },
  {
    pergunta: 'Posso contratar desenvolvimento de novas funcionalidades?',
    resposta:
      'Sim. Novas funcionalidades, módulos e alterações que ultrapassem o escopo contratado podem ser avaliados e orçados separadamente.',
  },
  {
    pergunta: 'O banco de dados está incluído?',
    resposta:
      'Sim. O plano Essencial inclui gestão e manutenção do banco de dados relacionado ao sistema contratado. O escopo e os recursos de infraestrutura aplicáveis serão alinhados na contratação.',
  },
  {
    pergunta: 'Como funciona o pagamento?',
    resposta:
      'A contratação online é realizada por meio do Mercado Pago, utilizando o link de assinatura recorrente disponibilizado pela Clyvo.',
  },
  {
    pergunta: 'Posso cancelar a assinatura?',
    resposta:
      'Consulte as condições de cancelamento e cobrança aplicáveis no momento da contratação, exibidas pelo Mercado Pago.',
  },
  {
    pergunta: 'A Clyvo garante que o sistema nunca ficará fora do ar?',
    resposta:
      'Não é possível garantir disponibilidade absoluta. A Clyvo trabalha para manter a estrutura contratada em funcionamento e realizar o acompanhamento e a manutenção previstos no escopo do serviço.',
  },
];
