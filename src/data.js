// Dados estáticos do jogo: negócios, marcos, promoções e falas.
window.PS = {};

PS.C = {
  ink: '#1E1537',
  gold: '#FFC928',
  goldD: '#E09A00',
  green: '#2FD27A',
  greenD: '#159A52',
  red: '#FF4D6D',
  lav: '#B9BCD9',
  cream: '#FFF7E6',
  pink: '#FF8FB1',
};

PS.BUSINESSES = [
  { id: 'migalha',    icon: '🍞', name: 'Revenda de Migalha',     cost: 10,     pps: 0.1,   desc: 'Compra na padaria, revende na praça.' },
  { id: 'pipoca',     icon: '🍿', name: 'Banquinha de Pipoca',    cost: 100,    pps: 1,     desc: 'O que cai no chão é lucro dobrado.' },
  { id: 'brigadeiro', icon: '🍫', name: 'Brigadeiro Gourmet',     cost: 1100,   pps: 8,     desc: 'Mesmo brigadeiro, preço de gourmet.' },
  { id: 'coach',      icon: '🎤', name: 'Curso de Coach Online',  cost: 12000,  pps: 47,    desc: '"Voe alto." Módulo 1 de 47.' },
  { id: 'pru',        icon: '🪙', name: 'Criptomoeda $PRU',       cost: 130000, pps: 260,   desc: 'Lastreada em absolutamente nada.' },
  { id: 'nft',        icon: '🖼️', name: 'NFT de Pão Mofado',      cost: 1.4e6,  pps: 1400,  desc: 'Arte única. O mofo é autêntico.' },
  { id: 'uber',       icon: '🛵', name: 'Startup Uber de Pombo',  cost: 2e7,    pps: 7800,  desc: 'Queimando dinheiro de investidor.' },
  { id: 'banco',      icon: '🏦', name: 'Banco Pombal S.A.',      cost: 3.3e8,  pps: 44000, desc: 'Juros compostos, penas decompostas.' },
  { id: 'bolsa',      icon: '🚀', name: 'Bolsa Intergaláctica',   cost: 5.1e9,  pps: 260000, desc: 'O pregão agora é em Marte.' },
  { id: 'multi',      icon: '🌌', name: 'Fundo Multiversal',      cost: 7.5e10, pps: 1.6e6, desc: 'Diversificado em todas as realidades.' },
];

// [quantidade, multiplicador] — cada marco multiplica a produção daquele negócio.
PS.MILESTONES = [
  [10, 2], [25, 2], [50, 2], [100, 3], [150, 2], [200, 3], [250, 2], [300, 3],
  [400, 2], [500, 4], [600, 2], [700, 2], [800, 2], [900, 2], [1000, 5],
];

// Promoções do pombo pelo total ganho. Cada uma adiciona um acessório.
PS.STAGES = [
  { at: 0,      title: 'Pombo de Praça' },
  { at: 500,    title: 'Pombo Empreendedor', acc: 'gravata' },
  { at: 5e4,    title: 'Pombo Executivo',    acc: 'óculos escuros' },
  { at: 5e6,    title: 'Pombo Tubarão',      acc: 'corrente de ouro' },
  { at: 5e8,    title: 'Pombo Magnata',      acc: 'cartola' },
  { at: 5e10,   title: 'Pombo Bilionário',   acc: 'aura dourada' },
];

PS.TIER_NAMES = ['', 'MIL', 'MILHÕES', 'BILHÕES', 'TRILHÕES', 'QUATRILHÕES',
  'QUINTILHÕES', 'SEXTILHÕES', 'SEPTILHÕES', 'OCTILHÕES', 'NONILHÕES', 'DECILHÕES'];

PS.COACH = [
  'Pombo que acorda cedo pega a migalha.',
  'Não é gasto. É investimento.',
  'Eu não perco. Eu aprendo.',
  'Seja o pombo que você quer ver na praça.',
  'Dinheiro não traz felicidade. Traz pipoca.',
  'Quem não arrisca não come migalha.',
  'Enquanto você dorme, eu escalo.',
  'Foco. Força. Farelo.',
  'Mindset de águia, corpo de pombo.',
  'Diversifique: migalha, pipoca e fé.',
  'Trabalhe enquanto eles cochilam no fio.',
  'O céu não é o limite. É o escritório.',
  'Não sou pombo. Sou CEO de mim mesmo.',
  'Todo império começou com um farelo.',
];

PS.MILESTONE_LINES = ['É O MERCADO, BEBÊ!', 'STONKS!', 'Escalando!', 'Rumo à lua!', 'Isso é juros compostos!', 'Tá vendo, pai?'];

PS.WAKE_LINES = ['Hã?! Eu tava analisando o mercado!', 'Não tava dormindo, tava meditando.', 'Quem mexeu na minha planilha?'];

PS.NEWS = [
  ['👵', 'Sua tia investiu no seu curso'],
  ['🕵️', 'Um coach copiou sua estratégia'],
  ['📲', 'Te adicionaram no grupo "Sinais VIP 🚀"'],
  ['💸', 'Seu primo pediu "um pix rapidinho"'],
  ['🎙️', 'Você foi citado num podcast de 4 horas'],
  ['👔', 'Um pombo rival te seguiu no LinkedIn'],
  ['🖼️', 'Chamaram seu NFT de "print"'],
  ['🏦', 'Seu gerente te chamou de "cliente premium"'],
  ['📰', 'Manchete: "Pombo da praça assusta Wall Street"'],
  ['🥖', 'A padaria aumentou o preço da migalha'],
  ['🤳', 'Você viralizou dançando na calçada'],
  ['📈', 'Um analista disse "compre pombo"'],
];
