// Decisões que mudam a carreira: os eventos mais frequentes no formato de engine/stakes.js.
// Mesmas situações e textos de antes; agora cada escolha tem o que ganhar e o que perder de verdade,
// e a chance de dar certo depende do momento do jogador (nível, características, idade, técnico, torcida).
// A ordem das opções é a mesma de antes (as consequências de events3.js dependem dela).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const P = S.chance, X = S.ctx;
  const club = c => D.CLUB_BY_ID[c.club];
  const atClub = c => c.age - c.clubSince;
  const money = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1e3) + ' mil');
  // Texto que muda quando o evento se repete na carreira: [título, texto]
  const alt = (c, id, opts) => { const o = opts[((c.evCount || {})[id] || 0) % opts.length]; return { title: o[0], text: o[1] }; };
  const safe = (label, fx, txt, extra) => Object.assign({ label, safe: { fx, txt } }, extra || {});
  const risk = (label, p, win, lose) => ({ label, p, win, lose });
  const out = (tag, fx, txt) => ({ tag, fx, txt });
  // Teto (potencial) só aparece para quem ainda está se formando: depois disso não muda a evolução
  const T = (c, n, age) => (c.age <= (age || 24) ? n : 0);

  // ---------- saúde e sacrifício ----------
  S.stake('classico', {
    build: c => alt(c, 'classico', [
      ['Clássico no sacrifício', 'Dor na coxa e clássico no domingo. O técnico deixa você decidir.'],
      ['O tornozelo de novo', 'Tornozelo inchado na semana do clássico. O médico torce o nariz; o técnico olha para você.'],
      ['Infiltração?', 'Clássico decisivo e o joelho reclamando. O médico oferece uma infiltração para você jogar.']]),
    options: c => [
      risk('Jogar no sacrifício', P(0.45, X.t(c, 'raca', 0.15), X.t(c, 'pro', 0.1), X.young(c, 0.05), X.vet(c, -0.15), X.edge(c, 0.03)),
        out('herói', { main: 3, pot: T(c, 1, 21), fans: 12 }, 'Você decidiu o clássico mancando. Herói! A confiança foi lá em cima e o seu jogo subiu de nível.'),
        out('lesão longa', { inj: 0.3, main: -3, pot: T(c, -1, 21) }, 'A lesão piorou. Meses fora, e você voltou sem a mesma explosão.')),
      safe('Poupar', { fans: -6 }, 'A torcida reclamou, mas você voltou inteiro.'),
    ],
  });
  S.stake('fisgada', {
    build: c => alt(c, 'fisgada', [
      ['Fisgada na coxa', 'Sentiu a coxa no aquecimento. Jogo importante hoje.'],
      ['Panturrilha travada', 'A panturrilha travou no treino da véspera. O técnico conta com você.']]),
    options: c => [
      risk('Jogar mesmo assim', P(0.5, X.t(c, 'pro', 0.15), X.t(c, 'raca', 0.05), X.young(c, 0.1), X.edge(c, 0.03)),
        out('decide o jogo', { main: 2, pot: T(c, 1, 21), coach: 10 }, 'Aguentou firme e ainda foi o melhor em campo. O técnico não esquece.'),
        out('estiramento', { inj: 0.25, main: -2, pot: T(c, -1, 21) }, 'A fisgada virou estiramento. Semanas de departamento médico, e a perna demorou a voltar a ser a mesma.')),
      safe('Avisar o médico', { min: -0.05 }, 'Duas semanas de tratamento e voltou 100%.'),
    ],
  });
  S.stake('virose', {
    build: () => ({ title: 'Virose no elenco', text: 'Metade do time pegou uma virose na semana de jogo decisivo. Você acordou com febre.' }),
    options: c => [
      risk('Jogar mesmo assim', P(0.5, X.t(c, 'raca', 0.15), X.t(c, 'pro', 0.1), X.young(c, 0.1), X.vet(c, -0.15)),
        out('herói com febre', { coach: 15, fans: 8, main: 1 }, 'Jogou no limite e ainda decidiu. O vestiário inteiro te aplaudiu, e você ganhou outra casca.'),
        out('recaída', { form: -0.1, main: -1 }, 'A febre voltou, você perdeu peso e levou semanas para recuperar a força.')),
      safe('Ficar de repouso', { min: -0.04 }, 'Três dias de cama e voltou inteiro.'),
    ],
  });
  S.stake('pubalgia', {
    build: () => ({ title: 'Pubalgia', text: 'Uma dor na virilha que não passa. O médico dá duas opções.' }),
    options: c => [
      safe('Operar agora', { inj: 0.15, attr: { fis: 2 } }, 'Cirurgia bem-sucedida. Você voltou mais forte.'),
      risk('Tratar e ir jogando', P(0.55, X.t(c, 'pro', 0.2), X.young(c, 0.15), X.vet(c, -0.2)),
        out('a dor passa', { main: 1 }, 'Fisioterapia diária e a dor foi embora sem cirurgia, sem perder o ritmo.'),
        out('piora', { inj: 0.35, attr: { fis: -3 }, main: -1, pot: T(c, -1, 21) }, 'A dor piorou, a cirurgia veio do mesmo jeito e a recuperação foi lenta.')),
    ],
  });
  S.stake('pretemporada', {
    build: c => alt(c, 'pretemporada', [
      ['Excursão de pré-temporada', 'O clube marcou seis amistosos no exterior em duas semanas.'],
      ['Turnê pela Ásia', 'Amistosos caça-níquel na Ásia: calor, fuso e estádios lotados.']]),
    options: c => [
      risk('Jogar todos os amistosos', P(0.6, X.t(c, 'pro', 0.15), X.young(c, 0.15), X.vet(c, -0.25)),
        out('chega voando', { main: 2, pot: T(c, 1, 21), fame: 8, coach: 6 }, 'Camisas esgotadas por onde passou, e você chegou à estreia voando.'),
        out('o corpo sente', { fame: 8, inj: 0.15, main: -2 }, 'Fuso, calor e gramado duro. O corpo cobrou a conta logo no começo.')),
      safe('Pedir para ser poupado', { form: 0.03, coach: -6 }, 'Você chegou inteiro para a estreia. O técnico torceu o nariz.'),
    ],
  });
  S.stake('beneficente', {
    build: () => ({ title: 'Jogo beneficente', text: 'Um amigo organiza um jogo beneficente nas férias, com ex-craques e artistas.' }),
    options: c => [
      risk('Jogar', P(0.8, X.vet(c, -0.15)),
        out('', { fans: 6, fame: 8, form: 0.03 }, 'Golaço de letra, muito dinheiro arrecadado e você voltou animado.'),
        out('pancada boba', { fame: 6, inj: 0.15, main: -1 }, 'Um cantor entrou de carrinho. Tornozelo torcido e meses para voltar ao normal.')),
      safe('Só doar camisas', { fame: 2 }, 'As camisas autografadas foram leiloadas.'),
    ],
  });
  S.stake('insonia', {
    build: () => ({ title: 'Noites mal dormidas', text: 'Jogos à noite, viagens e a cabeça a mil. Você não consegue dormir direito.' }),
    options: c => [
      safe('Especialista em sono (R$ 40 mil)', { money: -40000, form: 0.05 }, 'Rotina nova, quarto escuro e oito horas por noite.'),
      risk('Remédio para dormir', P(0.6, X.t(c, 'pro', 0.1)),
        out('dorme como pedra', { form: 0.08 }, 'Primeira noite inteira em meses. Você acordou outro jogador.'),
        out('acorda grogue', { form: -0.08, coach: -8 }, 'O remédio te deixou lento nos treinos. O técnico percebeu.')),
      risk('Deixar para lá', 0.6,
        out('o sono volta', {}, 'Aos poucos o sono voltou sozinho.'),
        out('cansaço', { form: -0.1, main: -1 }, 'O cansaço apareceu em campo, jogo após jogo, e o corpo não recuperou.')),
    ],
  });

  // ---------- corpo e evolução ----------
  S.stake('dieta', {
    build: () => ({ title: 'Nutricionista linha-dura', text: 'O clube contratou uma nutricionista que cortou tudo: açúcar, fritura, refrigerante.' }),
    options: c => [
      risk('Seguir à risca', P(0.5, X.t(c, 'pro', 0.25), X.young(c, 0.1), X.t(c, 'estrela', -0.15)),
        out('corpo novo', { attr: { fis: 3, rit: 2 }, pot: T(c, 1, 21) }, 'Três quilos a menos, mais explosão e um fôlego que você não conhecia.'),
        out('sem energia', { form: -0.08, attr: { fis: -3 } }, 'Cortou demais, perdeu massa muscular e ficou sem energia nos jogos.')),
      safe('Seguir mais ou menos', { form: 0.03 }, 'Um pouco de cada. O corpo não reclamou.'),
    ],
  });
  S.stake('mentor', {
    build: c => {
      const k = { ATA: 'fin', MEI: 'pas', ZAG: 'def', GOL: 'fin' }[c.pos]; // atributo principal da posição
      return { title: 'Um veterano quer te ensinar', text: 'O jogador mais experiente do elenco se ofereceu para treinar com você depois dos treinos.', attr: k };
    },
    options: c => [
      risk('Aceitar os treinos extras', P(0.65, X.t(c, 'pro', 0.15), X.t(c, 'estrela', -0.15)),
        out('aprende tudo', { main: 2, pot: 1, coach: 6 }, 'Meses de treino fino. Dá para ver a diferença no seu jogo, e você ainda tem muito para crescer.'),
        out('carga demais', { inj: 0.15, coach: 4 }, 'A carga dobrada cobrou um músculo antes de você aprender o que ele ensinava.')),
      safe('Aproveitar a folga', { form: 0.06, fame: 6 }, 'Você chegou descansado para a temporada.'),
    ],
  });

  // ---------- vestiário e técnico ----------
  S.stake('vestiario', {
    build: () => ({ title: 'Briga no vestiário', text: 'Dois veteranos saíram no braço depois da derrota. Todo mundo olhou para você.' }),
    options: c => [
      risk('Separar e falar com o grupo', P(0.5, X.t(c, 'lider', 0.2), X.coach(c, 0.1), c.age >= 27 ? 0.1 : 0, X.young(c, -0.1)),
        out('vira líder', { coach: 15, fans: 6, form: 0.06 }, 'Você segurou o grupo. O time embalou depois disso.'),
        out('sobra para você', { form: -0.08, coach: -12, fans: -4 }, 'Levou um empurrão e ainda ficou mal com os dois.')),
      safe('Ficar de fora', { form: -0.02 }, 'A comissão técnica resolveu, mas o clima seguiu pesado.'),
    ],
  });
  S.stake('capitao', {
    build: c => ({ title: 'A braçadeira é sua?', text: 'O técnico ' + D.do(club(c).name) + ' quer que você seja o capitão.' }),
    options: c => [
      risk('Aceitar a faixa', P(0.45, X.t(c, 'lider', 0.3), c.age >= 26 ? 0.1 : 0, X.coach(c, 0.1), X.young(c, -0.15)),
        out('líder nato', { captain: true, coach: 12, fans: 6, form: 0.08 }, 'Capitão ' + D.do(club(c).name) + '. A faixa te fez crescer em campo.'),
        out('a faixa pesa', { captain: true, form: -0.08, fans: -8, coach: -6 }, 'Capitão ' + D.do(club(c).name) + ', mas a cobrança pesou nos primeiros meses.')),
      safe('Recusar', {}, 'Você preferiu focar só no seu jogo.', { note: 'Sem pressão extra' }),
    ],
  });
  S.stake('concentracao', {
    build: () => ({ title: 'Concentração de três dias', text: 'O técnico novo quer o elenco concentrado três dias antes de cada jogo.' }),
    options: c => [
      safe('Aceitar', { coach: 8, form: 0.02 }, 'Hotel, videogame e foco total.'),
      risk('Reclamar com o grupo', P(0.4, X.t(c, 'lider', 0.25), X.coach(c, 0.1)),
        out('ele cede', { form: 0.08, fans: 4 }, 'O técnico ouviu o grupo e liberou. Elenco leve e feliz.'),
        out('ele descobre', { coach: -15, min: -0.1, pot: T(c, -1, 22) }, 'Ele descobriu quem puxou a reclamação. Banco por semanas.')),
    ],
  });
  S.stake('estrela', {
    build: c => ({ title: 'Contrataram uma estrela', text: D.O(club(c).name) + ' anunciou um craque famoso para a sua posição.' }),
    options: c => [
      risk('Disputar a vaga', P(0.45, X.edge(c, 0.04), X.t(c, 'raca', 0.1)),
        out('fica com a vaga', { min: 0.1, main: 2, pot: T(c, 1, 21), fame: 6 }, 'O craque famoso virou seu reserva. Que temporada.'),
        out('vai para o banco', { min: -0.25, main: -1, pot: T(c, -1, 23) }, 'O técnico escolheu o recém-chegado. Banco a temporada inteira, e o ritmo foi embora.')),
      safe('Aceitar o rodízio', { coach: 8, min: -0.1 }, 'Maturidade: o técnico reveza e confia em você.'),
      safe('Pedir para sair', { wantsOut: true }, 'Seu empresário já abriu conversas.'),
    ],
  });
  S.stake('gringo', {
    build: () => ({ title: 'Técnico estrangeiro', text: 'O novo técnico é estrangeiro, ainda não fala a língua do grupo e não confia em ninguém.' }),
    options: c => [
      safe('Fazer aulas do idioma dele', { money: -30000, coach: 15 }, 'Em três meses você já era o intérprete do elenco.'),
      risk('Se virar com o tradutor', P(0.6, X.coach(c, 0.1)),
        out('', {}, 'O tradutor deu conta do recado.'),
        out('ruído', { coach: -12, min: -0.08 }, 'Um mal-entendido tático virou bronca na frente de todos e vaga no banco.')),
    ],
  });
  S.stake('torcida_tecnico', {
    build: () => ({ title: 'Fora, técnico!', text: 'Depois de três derrotas, a torcida grita contra o técnico. Os microfones procuram você.' }),
    options: c => [
      risk('Defender o técnico', P(0.6, X.t(c, 'lider', 0.15), X.fans(c, 0.1)),
        out('ele fica', { coach: 15, fans: -4, min: 0.05 }, 'O técnico ficou, o time reagiu e ele nunca esqueceu o seu apoio.'),
        out('ele cai', { fans: -8 }, 'Ele caiu na semana seguinte, e a torcida não esqueceu de que lado você ficou.')),
      safe('Dizer que o grupo precisa melhorar', { fans: 3 }, 'Resposta de líder, sem apontar dedo.'),
    ],
  });
  S.stake('presidente', {
    build: c => ({ title: 'Promessa do presidente', text: 'O presidente ' + D.do(club(c).name) + ' promete reforços de peso se você renovar agora.' }),
    options: c => [
      risk('Renovar e confiar', P(0.5, club(c).tier >= 4 ? 0.1 : 0, club(c).tier <= 2 ? -0.1 : 0),
        out('reforços chegam', { contract: 2, wage: 1.2, boost: 3 }, 'Ele cumpriu: três reforços chegaram. O time ficou bem mais forte.'),
        out('promessa vazia', { contract: 2, wage: 1.2, form: -0.05 }, 'Os reforços nunca vieram, e você ficou preso a um time igual.')),
      safe('Esperar para ver', {}, 'Você preferiu esperar os reforços antes de assinar.'),
    ],
  });

  // ---------- em campo ----------
  S.stake('provocacao', {
    build: () => ({ title: 'Provocação em campo', text: 'O zagueiro rival passou o jogo inteiro te provocando e pisando no seu pé.' }),
    options: c => [
      risk('Revidar', P(0.5, X.t(c, 'frieza', 0.2), X.t(c, 'raca', 0.05)),
        out('ele para', { fans: 8, form: 0.06 }, 'Você mediu forças e ele parou de provocar.'),
        out('vermelho direto', { min: -0.12, coach: -12 }, 'Vermelho direto. Três jogos fora e bronca no vestiário.')),
      risk('Responder com a bola', P(0.45, X.edge(c, 0.03), X.t(c, 'frieza', 0.1)),
        out('golaço', { form: 0.1, fame: 8 }, 'Drible no provocador e gol. Resposta perfeita.'),
        out('some no jogo', { form: -0.05 }, 'Ele ganhou a briga: você sumiu do jogo.')),
    ],
  });
  S.stake('var', {
    build: c => alt(c, 'var', [
      ['Gol anulado pelo VAR', 'Seu gol no jogo grande foi anulado por um impedimento de ombro.'],
      ['Pênalti não marcado', 'Você foi derrubado na área e o VAR mandou seguir. Derrota no fim.']]),
    options: c => [
      risk('Reclamar na entrevista', P(0.5, X.fans(c, 0.1), X.t(c, 'lider', 0.1)),
        out('a torcida compra a briga', { fame: 8, fans: 10, form: 0.03 }, 'A entrevista viralizou e a torcida ficou do seu lado.'),
        out('suspensão', { fame: 8, min: -0.1 }, 'A fala rendeu três jogos de suspensão.')),
      safe('Ficar quieto', { coach: 6 }, 'Maturidade. O técnico elogiou a postura.'),
    ],
  });
  S.stake('bicho', {
    build: () => ({ title: 'Bicho dobrado', text: 'O presidente promete bicho dobrado se o time vencer o clássico do fim de semana.' }),
    options: c => [
      risk('Jogar pilhado', P(0.5, X.edge(c, 0.025), X.t(c, 'frieza', 0.1), X.t(c, 'raca', 0.05)),
        out('vitória', { money: c.wage * 4, fans: 8, form: 0.05 }, 'Vitória, festa no vestiário e bicho na conta.'),
        out('derrota nervosa', { form: -0.06, fans: -5 }, 'O nervosismo atrapalhou. Derrota no clássico e cobrança na saída.')),
      safe('Jogar como sempre', { form: 0.02 }, 'Jogo sério, sem ansiedade.'),
    ],
  });
  S.stake('critica', {
    build: c => alt(c, 'critica', [
      ['Crítica pesada', 'Um comentarista famoso disse na TV que você é "o jogador mais superestimado do país".'],
      ['Coluna ácida', 'Um colunista escreveu que você "some nos jogos grandes".']]),
    options: c => [
      risk('Responder na entrevista', P(0.5, X.fans(c, 0.15), X.t(c, 'lider', 0.1)),
        out('resposta afiada', { fame: 6, fans: 8, form: 0.03 }, 'A resposta foi afiada e a torcida adorou.'),
        out('soou arrogante', { fame: 6, fans: -8, form: -0.03 }, 'A resposta soou arrogante e virou meme contra você.')),
      risk('Responder em campo', P(0.5, X.edge(c, 0.025), X.t(c, 'frieza', 0.1)),
        out('dois gols', { form: 0.1, fame: 6 }, 'Dois gols no jogo seguinte e um silêncio no estúdio.'),
        out('a crítica pesa', { form: -0.07 }, 'Você quis provar demais e a crítica entrou na cabeça.')),
    ],
  });
  S.stake('drone', {
    build: () => ({ title: 'Drone no treino fechado', text: 'Um drone da imprensa filmou o treino fechado e revelou a escalação do clássico.' }),
    options: c => [
      risk('Derrubar o drone com uma bolada', P(0.6, X.edge(c, 0.02)),
        out('bolada certeira', { fame: 10, fans: 6 }, 'Bolada certeira e o vídeo mais compartilhado da semana.'),
        out('erra e paga', { money: -10000, coach: -6 }, 'A bola passou longe, acertou o carro do diretor e o técnico não achou graça.')),
      safe('Chamar a segurança', { coach: 4 }, 'A segurança resolveu. O técnico agradeceu a calma.'),
    ],
  });
  S.stake('comemoracao', {
    build: () => ({ title: 'Comemoração nova', text: 'Os amigos insistem: você precisa de uma comemoração própria.' }),
    options: c => [
      risk('Criar a sua marca', P(0.7, X.t(c, 'estrela', 0.1)),
        out('vira febre', { fame: 12, fans: 6 }, 'As crianças já imitam a comemoração nas escolinhas.'),
        out('vista como provocação', { fame: 10, coach: -8 }, 'O rival achou provocação e o jogo esquentou. O técnico não gostou.')),
      safe('Comemorar com o grupo', { coach: 6 }, 'Abraço coletivo em todo gol.'),
    ],
  });

  // ---------- fama, festa e redes ----------
  S.stake('festa', {
    build: c => alt(c, 'festa', [
      ['Festa na véspera do jogo', 'Aniversário do parça, todo mundo vai estar lá.'],
      ['Convite para a balada', 'Um cantor famoso chamou você para o camarote. O jogo é amanhã às 16h.'],
      ['Churrasco que vira festa', 'O churrasco da família virou festão. Já passa da meia-noite e tem jogo amanhã.']]),
    options: c => [
      risk('Ir na festa', P(0.5, X.t(c, 'estrela', 0.1), X.t(c, 'pro', -0.1)),
        out('ninguém viu', { fame: 12, form: 0.04 }, 'Curtiu, bombou nas redes e ainda jogou bem no dia seguinte.'),
        out('flagrado', { fame: 6, coach: -15, min: -0.12, pot: T(c, -1, 22) }, 'Foi flagrado de madrugada. O técnico te deixou no banco' + (c.age <= 22 ? ' e o clube passou a duvidar de você.' : '.'))),
      safe('Ficar em casa', { coach: 6, form: 0.03 }, 'Descansou. O técnico notou a maturidade.'),
    ],
  });
  S.stake('redes', {
    build: c => alt(c, 'redes', [
      ['Polêmica nas redes', 'Um vídeo seu provocando a torcida rival viralizou.'],
      ['Print vazado', 'Uma conversa sua reclamando do técnico vazou e está em todo lugar.']]),
    options: c => [
      safe('Pedir desculpas', { fans: 5, fame: -4 }, 'O pedido de desculpas pegou bem.'),
      risk('Dobrar a aposta', P(0.6, X.t(c, 'estrela', 0.1), X.coach(c, 0.1)),
        out('virou meme', { fame: 16, fans: -4 }, 'Virou meme. Todo mundo está falando de você.'),
        out('o técnico não gostou', { fame: 12, coach: -12, min: -0.06 }, 'Viralizou de novo, e o técnico te tirou do time no jogo seguinte.')),
    ],
  });
  S.stake('podcast', {
    build: c => alt(c, 'podcast', [
      ['Convite para podcast', 'O podcast mais ouvido do país quer três horas de conversa com você.'],
      ['Entrevista longa', 'Um canal famoso quer uma entrevista sem cortes, falando de tudo.']]),
    options: c => [
      risk('Falar tudo, sem filtro', P(0.6, X.fans(c, 0.1), X.t(c, 'lider', 0.1)),
        out('público do seu lado', { fame: 12, fans: 6 }, 'Milhões de visualizações e o público do seu lado.'),
        out('polêmica', { fame: 10, fans: -8, coach: -6 }, 'Um trecho fora de contexto rodou a internet e chegou ao vestiário.')),
      safe('Papo leve', { fame: 4, fans: 3 }, 'Histórias de infância e risadas. Todo mundo gostou.'),
    ],
  });
  S.stake('apelido', {
    build: () => ({ title: 'O apelido pegou', text: 'O elenco te deu um apelido ridículo e a torcida adotou. Já tem faixa no estádio.' }),
    options: c => [
      safe('Abraçar o apelido', { fame: 8, fans: 6 }, 'Virou grito de guerra. Até a camisa oficial ganhou o apelido.'),
      risk('Proibir o apelido', 0.5,
        out('o apelido morre', { coach: -3 }, 'O apelido morreu em um mês.'),
        out('viraliza mais', { coach: -3, fame: 4, fans: -5 }, 'Proibir só piorou. Agora todo mundo usa.')),
    ],
  });
  S.stake('arbitro_foto', {
    build: () => ({ title: 'Foto com o árbitro', text: 'Vazou uma foto sua jantando com o árbitro do próximo clássico.' }),
    options: c => [
      risk('Explicar: amigo de infância', P(0.6, X.fans(c, 0.1)),
        out('assunto encerrado', { fans: 4 }, 'A história do bairro comoveu. Assunto encerrado.'),
        out('teoria da conspiração', { fame: -4, form: -0.05 }, 'Toda decisão dele no clássico virou teoria da conspiração, e você jogou pressionado.')),
      safe('Pedir a troca do árbitro', { coach: 4, fame: 2 }, 'A federação trocou o árbitro. Postura elogiada.'),
    ],
  });
  S.stake('ofensas', {
    build: () => ({ title: 'Ofensas da arquibancada', text: 'Parte da torcida adversária passa o jogo te ofendendo de forma criminosa.' }),
    options: () => [
      safe('Parar o jogo e denunciar', { fame: 10, fans: 8, form: 0.03 }, 'O jogo parou, os agressores foram identificados e o país inteiro ficou do seu lado.'),
      { label: 'Seguir jogando', safe: { fx: { form: -0.04 }, txt: 'Você seguiu, mas aquilo ficou na cabeça por semanas.', ok: false } },
    ],
  });

  // ---------- dinheiro ----------
  S.stake('patrocinio', {
    build: c => Object.assign(alt(c, 'patrocinio', [
      ['Proposta de patrocínio', 'Uma marca esportiva quer você como garoto-propaganda.'],
      ['Campanha na TV', 'Uma marca de refrigerante quer você no comercial do intervalo da novela.'],
      ['Chuteira com seu nome', 'Uma fabricante quer lançar uma linha de chuteiras com o seu nome.']]), { value: Math.round(c.wage * 52 * 0.6 / 1000) * 1000 }),
    options: (c, ev) => [
      risk('Assinar o contrato', P(0.55, X.t(c, 'pro', 0.15), X.t(c, 'estrela', 0.1), X.young(c, -0.1)),
        out('rosto da marca', { money: ev.value, fame: 10, attr: { fis: 2 } }, 'Seu rosto está em todos os outdoors, e a marca ainda pagou um preparador particular.'),
        out('agenda pesada', { money: ev.value, fame: 6, form: -0.08 }, 'Gravações, eventos e viagens. A agenda cheia cobrou o preço em campo.')),
      safe('Recusar e focar no futebol', { form: 0.05, coach: 5 }, 'O técnico elogiou o foco em entrevista.'),
    ],
  });
  S.stake('apostas', {
    build: c => ({ title: 'Casa de apostas', text: 'Uma casa de apostas quer você como garoto-propaganda.', value: Math.round(c.wage * 26 / 1000) * 1000 }),
    options: (c, ev) => [
      risk('Aceitar (R$ ' + money(ev.value) + ')', 0.7,
        out('', { money: ev.value }, 'Comercial no ar e dinheiro na conta.'),
        out('polêmica', { money: ev.value, fans: -10, fame: -6, coach: -5 }, 'A campanha pegou mal e virou debate na TV. Até o técnico foi perguntado.')),
      safe('Recusar', { fans: 4, coach: 3 }, 'Você recusou e explicou o porquê. Muita gente aplaudiu.'),
    ],
  });
  S.stake('emprestimo', {
    build: c => ({ title: 'Um amigo pede dinheiro', text: 'Um amigo de infância pede um empréstimo para salvar o negócio da família.', value: Math.round(c.money * 0.1 / 1000) * 1000 }),
    options: (c, ev) => [
      risk('Emprestar R$ ' + money(ev.value), 0.5,
        out('ele devolve', { fame: 2, form: 0.04 }, 'Um ano depois ele devolveu tudo, com um abraço. Cabeça leve.'),
        out('o dinheiro não volta', { money: -ev.value, form: -0.04 }, 'O negócio fechou e o dinheiro foi junto. A decepção pesou.')),
      safe('Negar', {}, 'Conversa difícil, mas a amizade continuou.'),
    ],
  });
  S.stake('negocio', {
    build: c => Object.assign(alt(c, 'negocio', [
      ['Sociedade num negócio', 'Um amigo de infância quer você de sócio numa rede de academias.'],
      ['Investimento arriscado', 'Um assessor promete dobrar seu dinheiro num empreendimento imobiliário.']]), { value: Math.round(c.money * 0.3 / 1000) * 1000 }),
    options: (c, ev) => [
      risk('Investir R$ ' + money(ev.value), 0.5,
        out('dobra', { money: ev.value, form: 0.03 }, 'Deu certo: o investimento dobrou e você jogou tranquilo.'),
        out('perde tudo', { money: -ev.value, form: -0.06 }, 'O negócio quebrou, o dinheiro sumiu e a cabeça foi junto por um tempo.')),
      safe('Deixar o dinheiro quieto', {}, 'Dinheiro guardado é dinheiro tranquilo.'),
    ],
  });
  S.stake('receita', {
    build: () => ({ title: 'O leão bateu na porta', text: 'A Receita questiona os seus contratos de imagem dos últimos anos.' }),
    options: c => [
      safe('Fazer um acordo', { money: -Math.round(c.money * 0.12) }, 'Acordo fechado. Dor de cabeça resolvida.'),
      risk('Brigar na justiça', 0.5,
        out('ganha a causa', {}, 'Os advogados provaram que estava tudo certo.'),
        out('perde a causa', { money: -Math.round(c.money * 0.25), fame: -6, form: -0.05 }, 'Meses de audiência, multa pesada e a notícia em todo lugar.')),
    ],
  });
  S.stake('caridade', {
    build: c => Object.assign(alt(c, 'caridade', [
      ['Projeto na sua cidade', 'Uma escolinha de futebol da sua cidade natal pede ajuda para não fechar.'],
      ['Campo do bairro', 'O campinho onde você começou vai virar estacionamento. A comunidade pede ajuda.']]), { value: Math.max(100000, Math.round(c.money * 0.1 / 1000) * 1000) }),
    options: (c, ev) => [
      safe('Doar R$ ' + money(ev.value), { money: -ev.value, fans: 10, fame: 12, form: 0.03 }, 'A escolinha agora leva o seu nome.'),
      safe('Agora não', {}, 'Fica para a próxima.'),
    ],
  });

  // ---------- vida e família ----------
  S.stake('cachorro', {
    build: () => ({ title: 'Um vira-lata no CT', text: 'Um cachorro de rua apareceu no CT e não sai do seu lado no treino.' }),
    options: () => [
      risk('Adotar', 0.65,
        out('vira mascote', { form: 0.05, fame: 6, fans: 4 }, 'Ele virou mascote do time e estrela das suas redes.'),
        out('destrói a casa', { form: -0.03, fame: 4 }, 'Ele comeu duas chuteiras e o sofá. Noites sem dormir.')),
      safe('Levar para um abrigo', {}, 'Foi adotado por uma família em uma semana.'),
    ],
  });
  S.stake('cueca', {
    build: () => ({ title: 'A cueca da sorte', text: 'Doze jogos invicto com a mesma cueca. Ela rasgou no treino.' }),
    options: c => [
      risk('Costurar e seguir', 0.6,
        out('a sorte segue', { form: 0.05, fame: 4 }, 'Costurada e abençoada. A invencibilidade seguiu.'),
        out('piada no vestiário', { fame: 4, coach: -6 }, 'A costura aguentou, mas o vestiário descobriu. Virou piada até no treino.')),
      risk('Jogar sem ela', P(0.55, X.t(c, 'frieza', 0.15)),
        out('se liberta', { form: 0.06 }, 'Descobriu que a sorte era você mesmo.'),
        out('a cabeça pesa', { form: -0.06 }, 'Passou o jogo inteiro pensando na cueca.')),
    ],
  });
  S.stake('benzedeira', {
    build: () => ({ title: 'A benzedeira da sua avó', text: 'Sua avó mandou uma benzedeira para o CT antes da decisão. Ela já está na portaria.' }),
    options: c => [
      risk('Deixar benzer o elenco', P(0.7, X.coach(c, 0.1)),
        out('até o técnico pede', { form: 0.04, fans: 6 }, 'Até o técnico pediu um galhinho de arruda.'),
        out('o técnico acha circo', { fans: 5, coach: -8 }, 'Elenco benzido, técnico bufando na beira do campo.')),
      risk('Dispensar com carinho', 0.7,
        out('', { coach: 3 }, 'A benzedeira entendeu e benzeu o portão.'),
        out('a avó fica magoada', { coach: 3, form: -0.04 }, 'Sua avó ficou uma semana sem te ligar.')),
    ],
  });
  S.stake('presente_torcedor', {
    build: () => ({ title: 'O relógio do sócio', text: 'Um torcedor de 80 anos te deu o relógio que ganhou por 50 anos como sócio do clube.' }),
    options: () => [
      safe('Aceitar e visitar ele', { fans: 12, fame: 6, form: 0.02 }, 'Você passou uma tarde ouvindo histórias do clube. O relógio está no seu pulso.'),
      safe('Devolver com carinho', { fans: 4 }, '"Esse relógio é seu, meu amigo." Ele chorou de alegria.'),
    ],
  });
  S.stake('padrinho', {
    build: () => ({ title: 'O garoto da base', text: 'Um menino de 17 anos subiu ao profissional e diz que você é o ídolo dele.' }),
    options: () => [
      safe('Apadrinhar o garoto', { coach: 8, fans: 6, form: -0.02 }, 'O garoto marcou na estreia e correu para te abraçar.'),
      safe('Focar no seu jogo', { form: 0.05 }, 'Cabeça no próprio desempenho.'),
    ],
  });
  S.stake('centenario', {
    build: c => ({ title: 'Aniversário do clube', text: D.O(club(c).name) + ' comemora aniversário e vai lançar uma camisa comemorativa com o seu rosto na campanha.' }),
    options: () => [
      safe('Estrelar a campanha', { fame: 10, fans: 6, money: 50000 }, 'A camisa esgotou em um dia.'),
      safe('Deixar para os ídolos antigos', { fans: 4, coach: 4 }, 'Humildade que a velha guarda respeitou.'),
    ],
  });
  S.stake('mae_entrevista', {
    build: () => ({ title: 'Sua mãe deu entrevista', text: 'Sua mãe contou na TV que você dormia com a bola e chorava quando perdia no videogame.' }),
    options: () => [
      safe('Rir junto e postar', { fame: 8, fans: 6 }, 'O vídeo da sua mãe passou de dez milhões de visualizações.'),
      safe('Pedir para ela parar', { form: 0.02, fame: -2 }, 'Ela entendeu, mas contou mais três histórias para as vizinhas.'),
    ],
  });
  S.stake('irmao', {
    build: () => ({ title: 'Seu irmão também joga', text: 'Seu irmão mais novo sonha em ser jogador e pede uma ajuda.' }),
    options: c => [
      risk('Pedir um teste no seu clube', P(0.4, X.coach(c, 0.15)),
        out('aprovado', { fans: 5, fame: 4, form: 0.05 }, 'Aprovado na base! A imprensa adorou a história dos irmãos.'),
        out('reprovado', { coach: -8, form: -0.03 }, 'Não passou no teste, e o clima com o técnico ficou estranho.')),
      safe('Pagar uma escolinha boa', { money: -50000, form: 0.02 }, 'Ele está evoluindo na escolinha. Você ficou tranquilo.'),
    ],
  });

  // ========== segunda leva ==========
  const last = c => c.seasons[c.seasons.length - 1] || null;
  const abroad = c => !!c.club && D.countryOf(club(c)) !== c.country;
  const pickClub = (r, f) => { const pool = D.CLUBS.filter(f); return pool.length ? r.pick(pool) : null; };

  // ---------- espaço no time ----------
  S.stake('banco', {
    build: (c, r) => {
      const cl = club(c);
      const dest = pickClub(r, x => x.tier === Math.max(1, cl.tier - 1) && x.strength <= S.ovr(c));
      return { title: 'Sem espaço ' + D.no(cl.name), text: 'Você jogou pouco na última temporada.' + (dest ? ' ' + D.O(dest.name) + ' quer você emprestado como titular.' : ''), dest: dest && dest.id };
    },
    options: (c, ev) => {
      const fight = risk('Brigar pela vaga', P(0.45, X.edge(c, 0.035), X.t(c, 'raca', 0.15), X.t(c, 'pro', 0.1)),
        out('vira titular', { min: 0.25, main: 1, coach: 15 }, 'Treinou como nunca e ganhou a posição.'),
        out('segue no banco', { min: -0.1, coach: -5, pot: T(c, -1, 23) }, 'O técnico não mudou de ideia. Mais uma temporada no banco.'));
      return ev.dest ? [
        { label: 'Ir para ' + D.o(D.CLUB_BY_ID[ev.dest].name), note: 'Titular num clube menor', safe: { fx: { move: true, fans: -10 }, txt: 'Você foi para ' + D.o(D.CLUB_BY_ID[ev.dest].name) + ' para ser titular.' } },
        fight,
      ] : [fight, safe('Aceitar o banco', { coach: 5, min: -0.05 }, 'O técnico gostou da postura, mas os minutos continuam escassos.')];
    },
  });
  S.stake('tecnico', {
    build: c => ({ title: 'Técnico novo, esquema novo', text: D.O(club(c).name) + ' trocou de técnico. Ele quer você jogando aberto pela ponta.' }),
    options: c => [
      safe('Topar jogar pela ponta', { attr: { dri: 1 }, assist: 0.2, goal: -0.1, coach: 10 }, 'Você virou peça-chave do novo esquema.'),
      risk('Exigir sua posição', P(0.5, X.edge(c, 0.035), X.t(c, 'lider', 0.1)),
        out('ele cede', { goal: 0.1, main: 1 }, 'O técnico entendeu e montou o time em volta de você.'),
        out('banco', { coach: -15, min: -0.15 }, 'Ele não gostou nada. Você começa a temporada no banco.')),
    ],
  });
  S.stake('funcao', {
    build: c => ({ title: 'Técnico novo, função nova', text: 'O novo técnico ' + D.do(club(c).name) + ' quer te usar como ' + (c.pos === 'ATA' ? 'meia armador' : 'falso 9') + ' nesta temporada.' }),
    options: c => [
      safe('Aceitar a função', c.pos === 'ATA' ? { attr: { pas: 2 }, goal: -0.2, assist: 0.4, coach: 12 } : { attr: { fin: 2 }, goal: 0.4, assist: -0.2, coach: 12 }, 'Você se adaptou à função e aprendeu um jogo novo.'),
      risk('Recusar', P(0.45, X.edge(c, 0.035)),
        out('ele recua', { coach: -5 }, 'O técnico recuou e te deixou na sua posição.'),
        out('perde espaço', { coach: -20, min: -0.12 }, 'O técnico não gostou. Vai ter que provar em campo, vindo do banco.')),
    ],
  });
  S.stake('reserva_luxo', {
    build: () => ({ title: 'Reserva de luxo', text: 'O técnico quer poupar você e usar a sua experiência vindo do banco.' }),
    options: c => [
      safe('Aceitar o papel', { coach: 10, min: -0.1 }, 'Entrando no segundo tempo, você decidiu jogos grandes.'),
      risk('Exigir ser titular', P(0.45, X.t(c, 'raca', 0.1), X.edge(c, 0.03)),
        out('ganha a vaga', { min: 0.15, main: 1 }, 'Você mostrou no treino que ainda tem lenha para queimar.'),
        out('o técnico se irrita', { coach: -15, min: -0.15 }, 'O técnico não gostou da cobrança pública e te esqueceu no banco.')),
    ],
  });
  S.stake('cobrador', {
    build: () => ({ title: 'Quem bate o pênalti?', text: 'O camisa 10 do time e você querem ser o cobrador oficial.' }),
    options: c => [
      risk('Brigar pela cobrança', P(0.55, X.t(c, 'frieza', 0.15), X.edge(c, 0.02)),
        out('vira o cobrador', { goal: 0.15, fame: 6 }, 'O técnico decidiu: a bola é sua na marca da cal.'),
        out('racha no vestiário', { coach: -12, form: -0.05 }, 'A discussão vazou para a imprensa. Clima pesado.')),
      safe('Deixar com ele', { coach: 5, fans: 3 }, 'Gesto de grupo. O elenco notou.'),
    ],
  });
  S.stake('camisa10', {
    build: c => ({ title: 'A camisa 10', text: 'O camisa 10 ' + D.do(club(c).name) + ' foi embora. A diretoria oferece o número para você.' }),
    options: c => [
      risk('Vestir a 10', P(0.6, X.t(c, 'frieza', 0.15), X.edge(c, 0.02)),
        out('cai como uma luva', { fame: 10, form: 0.06, main: 1 }, 'A 10 caiu como uma luva. Camisa mais vendida da loja.'),
        out('o peso da camisa', { fame: 10, form: -0.08 }, 'A 10 pesou nos primeiros jogos.')),
      safe('Manter o seu número', { coach: 4 }, '"Meu número me trouxe até aqui."'),
    ],
  });

  // ---------- corpo e treino ----------
  S.stake('joelho', {
    build: () => ({ title: 'Dor no joelho', text: 'O joelho reclamou na pré-temporada. O departamento médico sugere cautela.' }),
    options: c => [
      risk('Jogar assim mesmo', P(0.65, X.t(c, 'pro', 0.15), X.t(c, 'raca', 0.05), c.age >= 33 ? -0.2 : 0),
        out('aguenta firme', { main: 1 }, 'Aguentou firme e não perdeu o ritmo. Ninguém percebeu nada.'),
        out('o joelho cede', { inj: 0.35, main: -2 }, 'O joelho não aguentou. Meses de recuperação e você voltou mais lento.')),
      safe('Tratar com calma', { min: -0.1 }, 'Voltou inteiro depois de algumas semanas.'),
    ],
  });
  S.stake('faltas', {
    build: c => alt(c, 'faltas', [
      ['Treino de faltas', 'O preparador propõe uma semana inteira batendo faltas depois do treino.'],
      ['Aula com o ídolo', 'Um ex-craque famoso por bater faltas se oferece para treinar com você depois do treino.']]),
    options: c => [
      risk('Topar', P(0.6, X.t(c, 'pro', 0.15), X.vet(c, -0.15), X.young(c, 0.1)),
        out('a bola obedece', { attr: { fin: 3 } }, 'Centenas de cobranças depois, a bola começou a obedecer.'),
        out('sobrecarga', { inj: 0.15, attr: { fin: -1 } }, 'A coxa estourou de tanta repetição e você voltou travado.')),
      safe('Descansar', { form: 0.05 }, 'Corpo descansado para a temporada.'),
    ],
  });
  S.stake('jejum', {
    build: c => alt(c, 'jejum', [
      ['Jejum de gols', 'Oito jogos sem marcar. A imprensa já conta os minutos.'],
      ['A bola não entra', 'Trave, goleiro, VAR... a fase não ajuda. Faz um mês que você não marca.']]),
    options: c => [
      risk('Ficar depois do treino finalizando', P(0.7, X.t(c, 'pro', 0.15)),
        out('a bola volta a obedecer', { attr: { fin: 3 } }, 'Trezentas finalizações depois, a bola voltou a obedecer.'),
        out('ansiedade', { attr: { fin: 1 }, form: -0.05 }, 'Você treinou muito, mas a ansiedade seguiu em campo.')),
      safe('Conversar com a psicóloga do clube', { form: 0.1 }, 'A cabeça leve fez a diferença. Os gols voltaram.'),
      risk('Ignorar e seguir', P(0.4, X.t(c, 'frieza', 0.15)),
        out('desencanta', { goal: 0.15, form: 0.05 }, 'Gol de canela no fim do jogo. Desencantou!'),
        out('a seca continua', { form: -0.08 }, 'A seca continuou por mais algumas semanas.')),
    ],
  });
  S.stake('recuperacao', {
    build: () => ({ title: 'Recuperação de ponta', text: 'Um centro de recuperação usado por craques europeus oferece um programa para prolongar a carreira.' }),
    options: () => [
      safe('Investir R$ 200 mil', { money: -200000, attr: { fis: 3 }, form: 0.03 }, 'Câmara hiperbárica, crioterapia e um corpo de 25 anos.'),
      safe('Seguir no método do clube', {}, 'O departamento médico do clube dá conta.'),
    ],
  });
  S.stake('teste_fisico', {
    build: () => ({ title: 'Último no teste físico', text: 'Você ficou em último no teste de corrida da pré-temporada. A imprensa soube.' }),
    options: c => [
      safe('Personal escondido', { money: -30000, attr: { fis: 2, rit: 1 }, form: -0.02 }, 'Treino às 5h da manhã por dois meses. No teste seguinte, meio de tabela.'),
      risk('Dizer que o jogo é na cabeça', P(0.6, X.edge(c, 0.03)),
        out('a frase vira camiseta', { fame: 4 }, '"Corro pouco porque penso rápido." A frase virou camiseta.'),
        out('o técnico não acha graça', { coach: -10, min: -0.1 }, 'O técnico leu a entrevista, não achou graça e te deixou no banco.')),
    ],
  });
  S.stake('curso_tecnico', {
    build: () => ({ title: 'Curso de treinador', text: 'A federação abriu turma do curso de técnico. As aulas são às segundas, dia de folga.' }),
    options: () => [
      safe('Fazer o curso', { coach: 10, attr: { pas: 2 }, form: -0.04 }, 'Você começou a enxergar o jogo como o treinador. Ele percebeu.'),
      safe('Pensar nisso depois', { form: 0.04 }, 'Segunda-feira é para descansar.'),
    ],
  });

  // ---------- por posição ----------
  S.stake('volante', {
    build: () => ({ title: 'Zagueiro de volante?', text: 'O técnico quer te testar como volante para sair jogando.' }),
    options: c => [
      risk('Topar o desafio', P(0.65, X.t(c, 'pro', 0.1), X.edge(c, 0.02)),
        out('passe novo', { attr: { pas: 3 }, assist: 0.3 }, 'Você descobriu um passe longo que ninguém conhecia.'),
        out('perdido em campo', { attr: { pas: 1 }, form: -0.06 }, 'Aprendeu alguma coisa, mas sofreu muito na função nova.')),
      safe('Ficar na zaga', { coach: -4 }, 'O técnico aceitou, mas não gostou.'),
    ],
  });
  S.stake('lateral', {
    build: () => ({ title: 'Improvisado na lateral', text: 'Os dois laterais se machucaram. O técnico pede para você quebrar o galho.' }),
    options: c => [
      risk('Topar a lateral', P(0.65, X.coach(c, 0.1)),
        out('quebra o galho', { coach: 12, assist: 0.2, attr: { rit: 2 } }, 'Você subiu ao ataque e ainda deu um passe para gol.'),
        out('sofre no um contra um', { coach: 4, form: -0.06 }, 'Os pontas adversários fizeram a festa pelo seu lado.')),
      safe('Recusar', { coach: -6 }, 'O técnico improvisou um volante.'),
    ],
  });
  S.stake('parceiro_zaga', {
    build: () => ({ title: 'O parceiro de zaga', text: 'Seu novo parceiro de zaga, de 20 anos, anda errando muito.' }),
    options: c => [
      safe('Cobrir os erros dele', { coach: 6, form: -0.03 }, 'Você correu por dois e o garoto ganhou confiança.'),
      risk('Cobrar em público', P(0.5, X.t(c, 'lider', 0.2), X.coach(c, 0.1)),
        out('ele cresce', { form: 0.06, coach: 4 }, 'O puxão de orelha funcionou. A dupla virou a melhor da liga.'),
        out('racha', { coach: -10, form: -0.05 }, 'O garoto se fechou e o vestiário tomou partido.')),
    ],
  });
  S.stake('reserva_gol', {
    build: () => ({ title: 'O reserva está chegando', text: 'O goleiro reserva, de 19 anos, está voando nos treinos. A imprensa pede a vez dele.' }),
    options: c => [
      risk('Treinar dobrado', P(0.65, X.t(c, 'pro', 0.15), X.vet(c, -0.1)),
        out('fecha o gol', { attr: { fin: 3 } }, 'Você fechou o gol. A vaga continuou sua.'),
        out('sobrecarga', { inj: 0.12, attr: { fin: 1 } }, 'Treinou tanto que o ombro reclamou. O garoto jogou algumas.')),
      risk('Ajudar o garoto', P(0.7, X.edge(c, 0.03)),
        out('liderança', { coach: 8, fans: 4 }, 'Liderança de verdade. O vestiário te respeita ainda mais.'),
        out('perde a vaga', { coach: 8, min: -0.2 }, 'O garoto aproveitou a chance e jogou meia temporada.')),
    ],
  });
  S.stake('goleiro_area', {
    build: () => ({ title: 'Último minuto, escanteio', text: 'Perdendo por 1 a 0, acréscimos. O banco grita para você subir para a área.' }),
    options: () => [
      risk('Subir para cabecear', 0.3,
        out('gol de goleiro', { fame: 20, fans: 10, form: 0.04 }, 'GOL DO GOLEIRO! O estádio veio abaixo.'),
        out('contra-ataque', { coach: -6 }, 'A bola sobrou, contra-ataque e gol deles no gol vazio.')),
      safe('Ficar no gol', {}, 'Você segurou a posição. Derrota mínima.'),
    ],
  });

  // ---------- base e formação ----------
  S.stake('sub20', {
    build: () => ({ title: 'Convocado para a seleção sub-20', text: 'O torneio coincide com jogos importantes do clube.' }),
    options: c => [
      risk('Ir para a seleção', P(0.45, X.edge(c, 0.04), X.t(c, 'patriota', 0.15)),
        out('brilha', { fame: 16, main: 1, pot: T(c, 1, 21) }, 'Brilhou na seleção e o país inteiro conheceu seu nome.'),
        out('reserva na seleção', { fame: 4, coach: -10, min: -0.1, pot: T(c, -1, 21) }, 'Ficou no banco da seleção e ainda perdeu espaço no clube, no momento de crescer.')),
      safe('Ficar no clube', { coach: 10, min: 0.1 }, 'O clube valorizou sua escolha.'),
    ],
  });
  S.stake('olheiro', {
    build: c => alt(c, 'olheiro', [
      ['Olheiro na arquibancada', 'Um olheiro de um grande europeu veio assistir ao seu jogo.'],
      ['Relatório na mesa', 'Seu nome apareceu no relatório de um clube inglês. Eles mandam alguém no próximo jogo.']]),
    options: c => [
      risk('Jogar para aparecer', P(0.45, X.edge(c, 0.04), X.t(c, 'estrela', 0.1)),
        out('o olheiro anota', { fame: 12, goal: 0.1, pot: T(c, 1, 22) }, 'Dribles, gol e o olheiro anotando sem parar.'),
        out('individualista', { fame: 6, coach: -12, min: -0.08, pot: T(c, -1, 22) }, 'Você prendeu a bola demais, o técnico reclamou e te tirou do time por um tempo.')),
      safe('Jogar para o time', { coach: 6, assist: 0.1 }, 'O olheiro elogiou sua leitura de jogo no relatório.'),
    ],
  });
  S.stake('saudade', {
    build: c => ({ title: 'Saudade de casa', text: 'Primeiro ano em ' + D.countryOf(club(c)) + '. Frio, comida diferente e a família longe.' }),
    options: c => [
      safe('Trazer a família', { money: -120000, form: 0.06 }, 'Com a família por perto, o futebol voltou a fluir.'),
      risk('Aguentar sozinho', P(0.5, X.t(c, 'adaptavel', 0.25), X.t(c, 'pro', 0.05)),
        out('amadurece', { coach: 8, main: 1, pot: T(c, 1, 21) }, 'Foi duro, mas você amadureceu anos em meses.'),
        out('as noites pesam', { form: -0.1, pot: T(c, -1, 21) }, 'As noites sozinho pesaram dentro de campo.')),
    ],
  });
  S.stake('olimpiada', {
    build: () => ({ title: 'Convocado para as Olimpíadas', text: 'O clube não quer liberar, mas é a chance de uma medalha.' }),
    options: c => [
      risk('Ir às Olimpíadas', P(0.4, X.edge(c, 0.04), X.t(c, 'patriota', 0.1)),
        out('ouro', { fame: 25, main: 1, pot: T(c, 1, 22), coach: -8 }, 'MEDALHA DE OURO! Você voltou com o ouro no peito e outra confiança.'),
        out('sem medalha', { fame: 8, coach: -10, min: -0.08, pot: T(c, -1, 22) }, 'Sem medalha, e na volta o seu lugar no time era de outro.')),
      safe('Ficar no clube', { coach: 8, min: 0.05 }, 'O clube agradeceu com mais minutos.'),
    ],
  });
  S.stake('alojamento', {
    build: () => ({ title: 'O colega de quarto', text: 'Seu colega no alojamento ronca e joga videogame até as 3h. O treino é às 7h.' }),
    options: () => [
      safe('Pedir quarto individual', { form: 0.04, coach: -3 }, 'Quarto só seu. Dormiu como nunca.'),
      risk('Aguentar o colega', 0.5,
        out('viram amigos', { coach: 4, form: 0.04 }, 'Vocês viraram inseparáveis. O técnico gostou da dupla.'),
        out('noites mal dormidas', { form: -0.06 }, 'Meses de olheiras. O ronco venceu.')),
    ],
  });
  S.stake('vlog_base', {
    build: () => ({ title: 'Vlog do alojamento', text: 'Um amigo youtuber quer gravar a rotina da base: alojamento, rango e treino.' }),
    options: () => [
      risk('Gravar a série', 0.65,
        out('bomba', { fame: 8 }, 'A série bombou. Todo garoto da base quer ser você.'),
        out('o clube proíbe', { fame: 8, coach: -8 }, 'O episódio do rango viralizou e a diretoria mandou parar.')),
      safe('Recusar', { coach: 3 }, 'Câmera só no dia de jogo. O técnico aprovou.'),
    ],
  });

  // ---------- clube ----------
  S.stake('protesto', {
    build: c => ({ title: 'Protesto no CT', text: 'A torcida ' + D.do(club(c).name) + ' foi cobrar você no treino.' }),
    options: c => [
      risk('Encarar e conversar', P(0.6, X.t(c, 'lider', 0.15), X.t(c, 'raca', 0.05)),
        out('vira o jogo', { fans: 20, form: 0.05 }, 'A conversa virou o jogo. A torcida voltou a cantar seu nome.'),
        out('azeda', { fans: -10, form: -0.08 }, 'A conversa azedou e virou vídeo nas redes.')),
      safe('Pedir para sair', { fans: -10, wantsOut: true }, 'Seu empresário já está ligando para outros clubes.'),
    ],
  });
  S.stake('rebaixamento', {
    build: c => ({ title: 'Luta contra a queda', text: D.O(club(c).name) + ' brigou contra o rebaixamento no ano passado e começa mal de novo.' }),
    options: c => [
      risk('Ficar e lutar', P(0.5, X.edge(c, 0.03), X.t(c, 'lider', 0.1), X.t(c, 'raca', 0.05)),
        out('salva o time', { fans: 15, coach: 8, main: 1 }, '"Não abandono o barco." Você carregou o time e virou ídolo.'),
        out('afunda junto', { fans: 6, form: -0.08 }, 'Você lutou, mas o time não reagiu. Temporada de sofrimento.')),
      safe('Pedir para sair', { wantsOut: true, fans: -10 }, 'Seu empresário já busca outro clube.'),
    ],
  });
  S.stake('acesso_briga', {
    build: c => ({ title: 'Sonho do acesso', text: D.O(club(c).name) + ' ficou perto de subir e aposta tudo nesta temporada. A reta final vai ser pesada.' }),
    options: c => [
      risk('Jogar todas no sacrifício', P(0.6, X.t(c, 'pro', 0.1), X.edge(c, 0.02), X.vet(c, -0.1)),
        out('puxa o time', { fans: 10, form: 0.06, main: 1 }, 'Você jogou tudo e puxou o time na reta final.'),
        out('o corpo cobra', { inj: 0.15, main: -1 }, 'O corpo cobrou a conta.')),
      safe('Seguir o rodízio da comissão', { coach: 4 }, 'Descanso na hora certa. Você chegou inteiro na reta final.'),
    ],
  });
  S.stake('saf', {
    build: c => ({ title: 'O clube foi vendido', text: 'Um investidor estrangeiro comprou ' + D.o(club(c).name) + ' e promete revolucionar o futebol.' }),
    options: c => [
      risk('Apoiar o projeto', P(0.6, club(c).tier >= 3 ? 0.1 : 0),
        out('o dinheiro chega', { boost: 3, fans: -4 }, 'O dinheiro chegou e o elenco ganhou reforços.'),
        out('promessa vazia', { fans: -6 }, 'O dinheiro ficou na promessa, e a torcida não esqueceu de que lado você ficou.')),
      safe('Criticar em público', { fans: 8, coach: -6 }, 'A torcida gostou. A nova diretoria, nem tanto.'),
    ],
  });
  S.stake('atraso', {
    build: c => ({ title: 'Salários atrasados', text: 'Três meses sem salário ' + D.no(club(c).name) + '. O elenco fala em greve.' }),
    options: c => [
      risk('Aderir à greve', 0.6,
        out('tudo pago', { money: c.wage * 12, fans: -8 }, 'A pressão funcionou: tudo pago em uma semana.'),
        out('clima péssimo', { fans: -8, form: -0.08 }, 'A diretoria endureceu e o clima ficou péssimo.')),
      safe('Jogar calado', { coach: 8, fans: 5 }, 'Profissionalismo que a torcida não esquece.'),
      safe('Pedir para sair', { fans: -6, wantsOut: true }, 'Seu empresário já procura outro clube.'),
    ],
  });
  S.stake('estadio', {
    build: c => ({ title: 'Estádio novo', text: D.O(club(c).name) + ' inaugura o estádio novo. Pênalti para o time no primeiro tempo.' }),
    options: c => [
      risk('Pegar a bola', P(0.7, X.t(c, 'frieza', 0.15)),
        out('gol histórico', { fame: 10, fans: 8, form: 0.04 }, 'Seu nome está na placa do primeiro gol do estádio.'),
        out('na trave', { fans: -5, form: -0.04 }, 'Na trave. A festa ficou para o segundo tempo, e a vaia para você.')),
      safe('Deixar para o cobrador', { coach: 3 }, 'O cobrador marcou e correu para te abraçar.'),
    ],
  });
  S.stake('artilharia', {
    build: () => ({ title: 'Um gol da artilharia', text: 'Falta um gol para a artilharia e a final da copa é em três dias. O técnico quer te poupar.' }),
    options: c => [
      risk('Pedir para jogar', P(0.55, X.t(c, 'artilheiro', 0.15)),
        out('artilheiro', { fame: 12, form: 0.04 }, 'Gol aos 89 minutos. Artilheiro e ainda inteiro para a final.'),
        out('chega arrastado', { form: -0.07 }, 'Não saiu o gol e você chegou arrastado na final.')),
      safe('Aceitar o descanso', { coach: 8, form: 0.03 }, 'Descansado para a final. A artilharia ficou para o ano que vem.'),
    ],
  });

  // ---------- seleção ----------
  S.stake('amistosos', {
    build: () => ({ title: 'Convocado para amistosos', text: 'A seleção chamou para dois amistosos no meio da temporada do clube.' }),
    options: c => [
      risk('Ir para a seleção', P(0.8, X.vet(c, -0.1)),
        out('gol com a seleção', { fame: 14, coach: -6, form: 0.04 }, 'Gol com a camisa da seleção. O país inteiro viu.'),
        out('volta machucado', { fame: 14, coach: -6, inj: 0.15 }, 'Voltou da seleção com um problema muscular.')),
      safe('Pedir dispensa', { coach: 8, fans: -4 }, 'O clube agradeceu. Parte da imprensa, não.'),
    ],
  });
  S.stake('adaptacao', {
    build: c => ({ title: 'Adaptação em ' + D.countryOf(club(c)), text: 'Idioma, clima e um futebol diferente. O começo está difícil.' }),
    options: c => [
      safe('Contratar professor e chef', { money: -80000, form: 0.06 }, 'Em dois meses você já pedia café no idioma local.'),
      risk('Aprender na marra', P(0.6, X.t(c, 'adaptavel', 0.25)),
        out('adaptado', { coach: 8, form: 0.04 }, 'Adaptação rápida. O técnico ficou impressionado.'),
        out('meio ano perdido', { form: -0.1, min: -0.06 }, 'Levou meio ano para se sentir em casa.')),
    ],
  });

  // ========== terceira leva: treinos de posição (o ganho agora fica de verdade) e mais escolhas ==========
  S.stake('treino_gol', {
    build: () => ({ title: 'Preparador de goleiros novo', text: 'O preparador chegou com um método europeu: reação, saída do gol e jogo com os pés.' }),
    options: () => [
      safe('Foco em reflexo', { attr: { fin: 2 } }, 'Você começou a pegar bolas que antes entravam.'),
      safe('Foco em jogo com os pés', { attr: { pas: 2 }, coach: 4 }, 'Agora o time sai jogando a partir de você.'),
    ],
  });
  S.stake('aereo', {
    build: () => ({ title: 'Treino de bola aérea', text: 'O auxiliar monta um treino de cabeceio todo dia depois do treino.' }),
    options: c => [
      risk('Topar', P(0.75, X.t(c, 'pro', 0.1), X.vet(c, -0.1)),
        out('tempo de bola', { attr: { fis: 2 }, goal: 0.08 }, 'Tempo de bola afiado. Os cruzamentos viraram chance.'),
        out('pescoço travado', { attr: { fis: 1 }, inj: 0.08 }, 'Aprendeu o tempo de bola, mas o pescoço travou por semanas.')),
      safe('Poupar o pescoço', { form: 0.04 }, 'Descansado para a temporada.'),
    ],
  });
  S.stake('centroavante', {
    build: () => ({ title: 'Referência ou móvel?', text: 'O técnico pergunta como você prefere jogar nesta temporada.' }),
    options: () => [
      safe('Centroavante de área', { goal: 0.12, assist: -0.1, attr: { fin: 1 } }, 'Dentro da área, pouco toque e muita bola na rede.'),
      safe('Atacante móvel', { assist: 0.15, attr: { dri: 2 } }, 'Saindo da área, você abriu espaço para todo mundo.'),
    ],
  });
  S.stake('analista_gol', {
    build: () => ({ title: 'Vídeos dos batedores', text: 'O analista montou um arquivo com os pênaltis de todos os batedores da liga.' }),
    options: () => [
      safe('Estudar tudo', { attr: { def: 2 }, coach: 3 }, 'Agora você sabe o canto preferido de cada um.'),
      safe('Confiar no instinto', { form: 0.04 }, 'Goleiro bom é goleiro leve.'),
    ],
  });
  S.stake('frango', {
    build: c => alt(c, 'frango', [
      ['Frango na TV', 'A bola passou por baixo do seu corpo num chute fraco. O lance virou meme.'],
      ['Saída errada', 'Você saiu do gol, furou a bola e o atacante tocou para o gol vazio. O vídeo não para de rodar.']]),
    options: c => [
      risk('Rir de si mesmo nas redes', P(0.6, X.fans(c, 0.15)),
        out('a internet te abraça', { fame: 8, fans: 5 }, 'Você postou o meme primeiro. A internet te abraçou.'),
        out('a confiança balança', { fame: 6, form: -0.06 }, 'Riu por fora, mas o lance não saiu da cabeça.')),
      safe('Treinar em silêncio', { attr: { dri: 2 }, coach: 4, form: -0.02 }, 'Horas de treino extra. Nunca mais aconteceu.'),
    ],
  });
  S.stake('gol_contra', {
    build: () => ({ title: 'Gol contra bizarro', text: 'Você fez um gol contra de calcanhar no clássico. O vídeo tem vinte milhões de visualizações.' }),
    options: c => [
      risk('Pedir desculpas na coletiva', P(0.65, X.fans(c, 0.15)),
        out('a torcida ri junto', { fans: 5, fame: 4 }, '"Foi o gol mais bonito que eu já fiz. Pena que foi contra." A torcida riu junto.'),
        out('vira piada', { fans: -5, form: -0.05 }, 'A piada pegou e cada bola na sua área virou tensão.')),
      safe('Treinar e calar', { attr: { def: 2 }, coach: 4, form: -0.02 }, 'Semanas de treino de posicionamento. Nunca mais.'),
    ],
  });
  S.stake('maestro', {
    build: () => ({ title: 'Primeiro volante?', text: 'O técnico quer você mais recuado, organizando o jogo na frente da zaga.' }),
    options: c => [
      safe('Aceitar a função', { attr: { def: 2 }, assist: -0.15, coach: 8 }, 'Você virou o cérebro do time. Menos assistências, mais controle.'),
      risk('Ficar na armação', P(0.55, X.edge(c, 0.03)),
        out('o técnico cede', { assist: 0.08, coach: -4 }, 'O técnico cedeu. A bola segue passando por você perto da área.'),
        out('perde espaço', { coach: -12, min: -0.1 }, 'O técnico escalou outro na armação e você foi para o banco.')),
    ],
  });
  S.stake('oculos', {
    build: () => ({ title: 'Lentes de contato', text: 'No exame do clube, o oftalmologista descobriu que você enxerga mal de longe. Há anos.' }),
    options: () => [
      safe('Usar lentes de contato', { money: -5000, attr: { pas: 1 }, form: 0.04 }, 'Você descobriu que o placar tem números. O jogo ficou mais fácil.'),
      risk('Ignorar', 0.6,
        out('sempre jogou assim', {}, 'Sempre jogou assim, segue jogando assim.'),
        out('faltou enxergar', { form: -0.06, attr: { pas: -1 } }, 'Dois passes para o bandeirinha. Faltou enxergar.')),
    ],
  });
  S.stake('estudos', {
    build: () => ({ title: 'Terminar os estudos?', text: 'A escola quer que você conclua o ensino médio à noite. O treino começa às 7h.' }),
    options: c => [
      risk('Estudar à noite', P(0.6, X.t(c, 'pro', 0.15)),
        out('diploma e cabeça', { coach: 6, fame: 4, attr: { pas: 1 } }, 'Diploma na mão, leitura de jogo melhor e o respeito de todo o elenco.'),
        out('cansaço', { form: -0.06, coach: 3 }, 'Dormindo quatro horas por noite, o rendimento caiu.')),
      safe('Só futebol', { form: 0.05 }, 'Foco total no gramado. O corpo agradeceu.'),
    ],
  });
  S.stake('xerife', {
    build: () => ({ title: 'Pendurado antes do clássico', text: 'Você leva cartão todo jogo. Mais um e fica suspenso justo no clássico.' }),
    options: c => [
      risk('Seguir no estilo', P(0.5, X.t(c, 'frieza', 0.2)),
        out('xerife sem cartão', { fans: 8, form: 0.04 }, 'Xerife da área, sem cartão. O rival nem passou perto.'),
        out('suspenso no clássico', { fans: 4, min: -0.06, coach: -6 }, 'Amarelo bobo aos 30 minutos. Clássico visto da arquibancada.')),
      safe('Controlar as entradas', { coach: 6, form: -0.02 }, 'Zaga mais calma e técnico tranquilo.'),
    ],
  });
  S.stake('penalti_goleiro', {
    build: () => ({ title: 'O goleiro vai bater?', text: 'Disputa de pênaltis na copa. Os cinco batedores já foram. O técnico olha para você.' }),
    options: c => [
      risk('Bater o pênalti', P(0.4, X.t(c, 'frieza', 0.15)),
        out('herói', { fame: 15, fans: 8, form: 0.04 }, 'GOL DO GOLEIRO NA DECISÃO! Classificado e eterno.'),
        out('nas nuvens', { fans: -5, form: -0.04 }, 'Chutou nas nuvens. O goleiro adversário riu.')),
      safe('Deixar com o zagueiro', { coach: 3 }, 'O zagueiro converteu. Você defendeu o próximo.'),
    ],
  });
  S.stake('namoro', {
    build: () => ({ title: 'Namoro famoso', text: 'Você está namorando uma cantora famosa e os paparazzi não largam o seu pé.' }),
    options: c => [
      risk('Assumir publicamente', P(0.6, X.t(c, 'frieza', 0.1), X.t(c, 'estrela', 0.1)),
        out('casal do ano', { fame: 14, form: 0.03 }, 'O casal do ano. E você seguiu jogando bem.'),
        out('exposição demais', { fame: 14, form: -0.07 }, 'Capa de revista toda semana. Difícil pensar em bola.')),
      safe('Manter discreto', { form: 0.03 }, 'Vida privada é privada. Cabeça leve.'),
    ],
  });

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
