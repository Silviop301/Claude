// Consequências que voltam: algumas escolhas deixam um gancho na carreira (c.hooks) e, temporadas depois,
// viram um evento novo que lembra o que aconteceu. O gancho tem prioridade sobre o sorteio da temporada.
// Gancho: { id, due (temporada em que pode voltar), at (temporada da escolha), d (dados) }.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { bump } = S._;
  const club = c => D.CLUB_BY_ID[c.club];
  const opt = (label, hint) => ({ label, hint });
  const ago = (c, h) => { const n = Math.max(1, c.seasons.length - h.at); return n === 1 ? 'Na temporada passada' : 'Há ' + n + ' temporadas'; };

  // Deixa um gancho: volta entre min e max temporadas depois
  S.hookAdd = function (c, id, min, max, r, d) {
    c.hooks = c.hooks || [];
    if (c.hooks.some(h => h.id === id)) return;
    c.hooks.push({ id, at: c.seasons.length, due: c.seasons.length + min + Math.floor(r() * (max - min + 1)), d: d || {} });
  };

  // Continuações (só aparecem pelo gancho, nunca no sorteio comum)
  const BACK = [
    {
      id: 'v_festa', from: 'festa', icon: '📸', tone: 'red',
      when: c => c.age <= 34,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você foi na festa na véspera do jogo.',
        title: 'As fotos da festa vazaram', text: 'Um site publicou fotos daquela noite. Os programas de TV estão repetindo a imagem o dia inteiro.',
        options: [opt('Rir e assumir', 'Fama +8 · Técnico −6'), opt('Pedir desculpas à torcida', 'Torcida +5 · Fama −3')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', -6), { ok: true, text: '"Quem nunca?" A resposta virou meme e o técnico fechou a cara.', fx: { fame: 8 } })
        : (bump(c, 'fans', 5), { ok: true, text: 'O pedido de desculpas acalmou a arquibancada.', fx: { fame: -3 } })),
    },
    {
      id: 'v_mentor', from: 'mentor', icon: '🧓', tone: 'green',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', um veterano treinou com você depois dos treinos.',
        title: 'A despedida do seu mentor', text: 'O veterano que te ensinou vai pendurar as chuteiras e quer você no jogo de despedida. É no meio da semana, longe daqui.',
        options: [opt('Ir ao jogo de despedida', 'Torcida +6 · Fama +6 · forma −3%'), opt('Mandar um vídeo', 'Forma +3%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 6), { ok: true, text: 'Vocês trocaram de camisa no fim. Ele chorou; você também.', fx: { fame: 6, form: -0.03 } })
        : { ok: true, text: 'O vídeo passou no telão do estádio. Ele mandou um áudio agradecendo.', fx: { form: 0.03 } }),
    },
    {
      id: 'v_afilhado', from: 'padrinho', icon: '🌟', tone: 'green',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você apadrinhou um garoto da base.',
        title: 'O afilhado virou revelação', text: 'O garoto que você apadrinhou ganhou o prêmio de revelação do ano e citou o seu nome no discurso.',
        options: [opt('Subir no palco com ele', 'Fama +10 · Torcida +4'), opt('Aplaudir da plateia', 'Técnico +6')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 4), { ok: true, text: 'A foto dos dois com o troféu rodou o país.', fx: { fame: 10 } })
        : (bump(c, 'coach', 6), { ok: true, text: 'Discreto, como ele aprendeu com você. O técnico reparou.', fx: {} })),
    },
    {
      id: 'v_escolinha', from: 'caridade', icon: '💚', tone: 'green',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você salvou a escolinha da sua cidade.',
        title: 'Um menino da escolinha estreou', text: 'Um garoto da escolinha que você ajudou estreou como profissional e marcou. Na comemoração, mostrou uma camisa com o seu nome.',
        options: [opt('Ir conhecer o garoto', 'Torcida +8 · Fama +10'), opt('Mandar uma camisa autografada', 'Fama +5')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 8), { ok: true, text: 'O encontro passou no jornal da noite. A escolinha ganhou novos patrocinadores.', fx: { fame: 10 } })
        : { ok: true, text: 'A camisa está pendurada na parede da escolinha.', fx: { fame: 5 } }),
    },
    {
      id: 'v_escolinha_fechou', from: 'caridade', icon: '🏚️', tone: 'red',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', a escolinha da sua cidade pediu ajuda e você não pôde.',
        title: 'A escolinha fechou', text: 'A escolinha da sua cidade fechou as portas, e uma reportagem lembrou que você tinha sido procurado.',
        options: [opt('Reabrir com o seu dinheiro', 'R$ 300 mil · Torcida +8 · Fama +8'), opt('Não comentar', 'Torcida −6')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 8), { ok: true, text: 'A escolinha reabriu, maior, com o seu nome no portão.', fx: { money: -300000, fame: 8 } })
        : (bump(c, 'fans', -6), { ok: false, text: 'O silêncio pegou mal na sua cidade.', fx: {} })),
    },
    {
      id: 'v_empresario', from: 'empresario', icon: '🕴️', tone: 'red',
      when: c => !!c.club,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você assinou com o empresário mais poderoso do país.',
        title: 'O empresário cobra o favor', text: 'Ele fechou um negócio com outro clube e quer você lá no fim da temporada. "Eu te fiz grande", lembra ele.',
        options: [opt('Fazer o que ele pede', 'Salário +20% · Torcida −10 · você sai na janela'), opt('Romper com ele', 'Técnico +8 · Fama −6')],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { c.wage = Math.round(c.wage * 1.2); bump(c, 'fans', -10); c.wantsOut = true; return { ok: true, text: 'Negócio encaminhado. A torcida já sabe que você vai embora.', fx: {} }; }
        bump(c, 'coach', 8);
        return { ok: true, text: 'Ele saiu batendo a porta e falando mal de você nos bastidores. O clube gostou.', fx: { fame: -6 } };
      },
    },
    {
      id: 'v_redes', from: 'redes', icon: '😤', tone: 'red',
      when: c => c.pos !== 'GOL',
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você dobrou a aposta numa polêmica nas redes.',
        title: 'A provocação voltou', text: 'O jogador que você provocou nas redes está no time adversário e passou a semana falando de você.',
        options: [opt('Estender a mão antes do jogo', 'Torcida +4 · Fama +4'), opt('Provocar de novo', '55%: você decide (Fama +12 · Torcida +8) · 45%: expulso (Técnico −10)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'fans', 4); return { ok: true, text: 'O aperto de mão viralizou mais que a briga.', fx: { fame: 4 } }; }
        if (r() < 0.55) { bump(c, 'fans', 8); return { ok: true, text: 'Gol e comemoração na frente dele. O estádio veio abaixo.', fx: { fame: 12 } }; }
        bump(c, 'coach', -10);
        return { ok: false, text: 'Cartão vermelho no primeiro tempo. O técnico não te olhou na saída.', fx: { min: -0.06 } };
      },
    },
    {
      id: 'v_promessa', from: 'assedio', icon: '🤝', tone: 'blue',
      when: (c, h) => c.club === h.d.club,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você recusou um clube maior e renovou com ' + D.o(club(c).name) + '.',
        title: 'A promessa de ficar', text: 'Outro gigante bateu na porta. A torcida ' + D.do(club(c).name) + ' estendeu a faixa da sua renovação no último jogo.',
        options: [opt('Cumprir a promessa', 'Torcida +15 · vira ídolo'), opt('Pedir para sair', 'Fama +6 · Torcida −25 · você sai na janela')],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', 15); return { ok: true, text: '"Palavra é palavra." A torcida cantou o seu nome o jogo inteiro.', fx: {} }; }
        bump(c, 'fans', -25); c.wantsOut = true;
        return { ok: false, text: 'A faixa da renovação foi queimada na arquibancada.', fx: { fame: 6 } };
      },
    },
    {
      id: 'v_traidor', from: 'assedio', icon: '🔥', tone: 'red',
      when: (c, h) => !!h.d.prev && c.club !== h.d.prev,
      build: (c, r, h) => {
        const prev = D.CLUB_BY_ID[h.d.prev];
        return {
          memory: ago(c, h) + ', você deixou ' + D.o(prev.name) + ' antes da janela.',
          title: 'De volta à antiga casa', text: 'Jogo contra ' + D.o(prev.name) + '. A torcida preparou faixas te chamando de traidor.',
          prev: prev.id,
          options: [opt('Jogar calado', 'Fama +4 · a antiga torcida esfria'), opt('Comemorar na frente deles', 'Torcida atual +10 · a antiga nunca mais perdoa')],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { c.fansBy[ev.prev] = Math.min(100, (c.fansBy[ev.prev] || 0) + 10); return { ok: true, text: 'Nenhuma provocação. No fim, até alguns antigos aplaudiram.', fx: { fame: 4 } }; }
        bump(c, 'fans', 10); c.fansBy[ev.prev] = 0;
        return { ok: true, text: 'A comemoração virou capa. Do outro lado, faixas pegando fogo.', fx: { fame: 6 } };
      },
    },
    {
      id: 'v_rival', from: 'rival', icon: '😈', tone: 'red',
      when: (c, h) => !!h.d.prev && c.club !== h.d.prev,
      build: (c, r, h) => {
        const prev = D.CLUB_BY_ID[h.d.prev];
        return {
          memory: ago(c, h) + ', você trocou ' + D.o(prev.name) + ' pelo maior rival.',
          title: 'O primeiro clássico do outro lado', text: 'Clássico contra ' + D.o(prev.name) + '. Cada toque seu na bola vai ser vaiado.',
          prev: prev.id,
          options: [opt('Fazer o jogo da vida', '60%: decide o clássico (Torcida +12 · Fama +10) · 40%: some no jogo (Torcida −6)'), opt('Pedir para não jogar', 'Técnico −10')],
        };
      },
      resolve: (c, ev, i, r) => {
        if (i === 1) { bump(c, 'coach', -10); return { ok: false, text: 'O técnico não aceitou o pedido e a imprensa soube.', fx: { min: -0.04 } }; }
        if (r() < 0.6) { bump(c, 'fans', 12); return { ok: true, text: 'Gol no ex-clube e silêncio na casa deles. A sua nova torcida te abraçou de vez.', fx: { fame: 10 } }; }
        bump(c, 'fans', -6);
        return { ok: false, text: 'A pressão pesou. Você sumiu em campo e as duas torcidas reclamaram.', fx: {} };
      },
    },
    {
      id: 'v_presidente', from: 'presidente', icon: '🏛️', tone: 'blue',
      when: (c, h) => c.club === h.d.club,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', o presidente prometeu reforços e eles não vieram.',
        title: 'O presidente promete de novo', text: 'Na festa de fim de ano, o presidente ' + D.do(club(c).name) + ' anunciou "o maior reforço da história". Os jornalistas querem saber o que você acha.',
        options: [opt('Cobrar em público', 'Torcida +10 · Técnico −8 · 50%: os reforços chegam'), opt('Desconversar', 'Nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 1) return { ok: true, text: '"Vamos ver." A frase não comprometeu ninguém.', fx: {} };
        bump(c, 'fans', 10); bump(c, 'coach', -8);
        if (r() < 0.5) {
          c.clubBoost = c.clubBoost || {};
          c.clubBoost[c.club] = Math.min(8, (c.clubBoost[c.club] || 0) + 2);
          if (S.applyLeagues) S.applyLeagues(c);
          return { ok: true, text: 'A cobrança funcionou: dois reforços chegaram na semana seguinte.', fx: {} };
        }
        return { ok: false, text: 'O presidente ficou irritado e os reforços, de novo, não vieram.', fx: {} };
      },
    },
    {
      id: 'v_amigo', from: 'emprestimo', icon: '💵', tone: 'green',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você emprestou dinheiro a um amigo e ele não conseguiu pagar.',
        title: 'O amigo voltou', text: 'O amigo de infância reabriu o negócio, deu certo e apareceu com o dinheiro de volta, com juros.', value: h.d.value || 100000,
        options: [opt('Aceitar o dinheiro', 'Recebe de volta com juros'), opt('Pedir que ele invista na cidade', 'Fama +8 · Torcida +4')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Um abraço demorado e um cheque maior do que o empréstimo.', fx: { money: Math.round(ev.value * 1.5) } }
        : (bump(c, 'fans', 4), { ok: true, text: 'O dinheiro virou uma quadra nova no bairro onde vocês cresceram.', fx: { fame: 8 } })),
    },
    {
      id: 'v_apostas', from: 'apostas', icon: '🚨', tone: 'red',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você fez propaganda de uma casa de apostas.',
        title: 'A casa de apostas na mira', text: 'A casa de apostas que você divulgou está sendo investigada. O seu comercial voltou a passar no noticiário.',
        options: [opt('Dar entrevista e se explicar', 'Torcida +4 · Fama −4'), opt('Ficar calado', '50%: o assunto morre · 50%: Torcida −10 · Fama −8')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'fans', 4); return { ok: true, text: 'Você explicou que não sabia de nada. A maioria acreditou.', fx: { fame: -4 } }; }
        if (r() < 0.5) return { ok: true, text: 'Uma semana depois, ninguém lembrava mais.', fx: {} };
        bump(c, 'fans', -10);
        return { ok: false, text: 'O silêncio virou manchete: "Ídolo some enquanto o caso cresce".', fx: { fame: -8 } };
      },
    },
    {
      id: 'v_lesao', from: 'classico', icon: '🩹', tone: 'red',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você jogou um clássico no sacrifício e se machucou.',
        title: 'A lesão antiga voltou', text: 'A mesma região daquela lesão voltou a doer. O médico quer operar de vez.',
        options: [opt('Operar agora', 'Perde parte da temporada (−15% de minutos) · sem risco depois'), opt('Seguir com tratamento', '40%: lesão longa · senão, nada')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'A cirurgia foi um sucesso. Volta mais forte na reta final.', fx: { min: -0.15 } };
        if (r() < 0.4) return { ok: false, text: 'Não aguentou. Meses fora de novo.', fx: { inj: 0.3 } };
        return { ok: true, text: 'O tratamento segurou. Dor controlada.', fx: {} };
      },
    },
    {
      id: 'v_selecao', from: 'sub20', icon: '🟡', tone: 'green',
      when: c => !c.natRetired && !!c.club,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você largou o clube para jogar o sub-20.',
        title: 'A seleção principal lembrou de você', text: 'O técnico da seleção acompanhou o seu sub-20 e quer você nos amistosos de setembro, no meio do campeonato.',
        options: [opt('Ir para os amistosos', 'Fama +10 · Técnico −6'), opt('Pedir para ficar no clube', 'Técnico +6')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', -6), { ok: true, text: 'Estreia com a camisa principal. A família inteira chorou na arquibancada.', fx: { fame: 10 } })
        : (bump(c, 'coach', 6), { ok: true, text: 'O clube agradeceu. A seleção disse que a porta segue aberta.', fx: {} })),
    },
    {
      id: 'v_marca', from: 'patrocinio', icon: '👟', tone: 'blue',
      when: () => true,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você fechou um contrato de patrocínio.',
        title: 'A marca quer renovar', text: 'O patrocínio deu tão certo que a marca quer renovar pelo dobro, com exclusividade e uma agenda cheia de gravações.', value: Math.round((h.d.value || 200000) * 1.5),
        options: [opt('Renovar pelo dobro', 'Dinheiro · forma −4%'), opt('Encerrar a parceria', 'Forma +3% · Técnico +4')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Contrato renovado. O seu rosto agora está até no aeroporto.', fx: { money: ev.value, form: -0.04, fame: 4 } }
        : (bump(c, 'coach', 4), { ok: true, text: 'Mais tempo para treinar. O técnico gostou da decisão.', fx: { form: 0.03 } })),
    },
    {
      id: 'v_vestiario', from: 'vestiario', icon: '🗣️', tone: 'green',
      when: (c, h) => c.club === h.d.club,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você separou a briga no vestiário.',
        title: 'O grupo quer a sua voz', text: 'Os dois veteranos que brigaram vieram juntos te pedir para falar pelo elenco nas conversas com a diretoria.',
        options: [opt('Assumir a liderança', 'Técnico +8 · Torcida +4 · forma −2%'), opt('Deixar para os mais velhos', 'Nada muda')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 8), bump(c, 'fans', 4), { ok: true, text: 'Você levou as demandas do grupo e voltou com tudo resolvido.', fx: { form: -0.02 } })
        : { ok: true, text: 'Você preferiu seguir focado só no campo.', fx: {} }),
    },
    {
      id: 'v_mosaico', from: 'protesto', icon: '🎨', tone: 'green',
      when: (c, h) => c.club === h.d.club,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você encarou o protesto da torcida no CT.',
        title: 'Um mosaico com o seu rosto', text: 'A mesma torcida que foi te cobrar no CT montou um mosaico gigante com o seu rosto no último jogo.',
        options: [opt('Ir agradecer na arquibancada', 'Torcida +8 · Técnico −3 (atrasou o aquecimento)'), opt('Agradecer nas redes', 'Fama +6')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 8), bump(c, 'coach', -3), { ok: true, text: 'Você subiu no alambrado e cantou junto. Ninguém esquece uma cena dessas.', fx: {} })
        : { ok: true, text: 'O post com a foto do mosaico foi o mais curtido do ano.', fx: { fame: 6 } }),
    },
    {
      id: 'v_capitao', from: 'capitao', icon: '👑', tone: 'blue',
      when: (c, h) => c.club === h.d.club && !c.captain,
      build: (c, r, h) => ({
        memory: ago(c, h) + ', você recusou a braçadeira de capitão.',
        title: 'A braçadeira de novo', text: 'O capitão se machucou e vai ficar meses fora. O técnico te chamou na sala: "Agora não dá para recusar, né?"',
        options: [opt('Aceitar agora', 'Capitão · Torcida +5'), opt('Recusar de novo', 'Técnico −6')],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { c.captain = true; bump(c, 'fans', 5); return { ok: true, text: 'Desta vez você aceitou. A faixa ficou no seu braço.', fx: {} }; }
        bump(c, 'coach', -6);
        return { ok: false, text: 'O técnico ficou sem entender e passou a faixa para outro.', fx: {} };
      },
    },
  ].map(e => Object.assign({ weight: 0, hook: true }, e));

  // Escolhas que deixam gancho: [evento, opção, deu certo?, id do gancho, mín, máx, dados]
  const SEEDS = [
    ['festa', 0, null, 'v_festa', 2, 3],
    ['mentor', 0, null, 'v_mentor', 4, 6],
    ['padrinho', 0, null, 'v_afilhado', 2, 3],
    ['caridade', 0, null, 'v_escolinha', 3, 5],
    ['caridade', 1, null, 'v_escolinha_fechou', 2, 4],
    ['empresario', 0, null, 'v_empresario', 2, 3],
    ['redes', 1, null, 'v_redes', 1, 2],
    ['assedio', 1, null, 'v_promessa', 2, 3, c => ({ club: c.club })],
    ['assedio', 0, null, 'v_traidor', 1, 2, (c, ev, before) => ({ prev: before })],
    ['rival', 0, null, 'v_rival', 1, 2, (c, ev, before) => ({ prev: before })],
    ['presidente', 0, false, 'v_presidente', 1, 2, c => ({ club: c.club })],
    ['emprestimo', 0, false, 'v_amigo', 3, 5, (c, ev) => ({ value: ev.value })],
    ['apostas', 0, null, 'v_apostas', 2, 4],
    ['classico', 0, false, 'v_lesao', 2, 4],
    ['sub20', 0, null, 'v_selecao', 3, 4],
    ['patrocinio', 0, null, 'v_marca', 2, 3, (c, ev) => ({ value: ev.value })],
    ['vestiario', 0, true, 'v_vestiario', 1, 2, c => ({ club: c.club })],
    ['protesto', 0, true, 'v_mosaico', 2, 3, c => ({ club: c.club })],
    ['capitao', 1, null, 'v_capitao', 2, 3, c => ({ club: c.club })],
  ];
  S.HOOK_SEEDS = SEEDS;

  // Depois de resolver um evento: deixa o gancho se a escolha pedir (before = clube antes da escolha)
  S.hookSeed = function (c, ev, idx, out, r, before) {
    SEEDS.forEach(([id, i, ok, hook, min, max, data]) => {
      if (id !== ev.id || i !== idx || (ok !== null && !!out.ok !== ok)) return;
      S.hookAdd(c, hook, min, max, r, data ? data(c, ev, before) : {});
    });
  };

  // Gancho vencido e possível agora; os que passaram 3 temporadas do prazo sem caber somem
  S.hookDue = function (c) {
    const n = c.seasons.length;
    c.hooks = (c.hooks || []).filter(h => n <= h.due + 3);
    return c.hooks.find(h => h.due <= n && BY[h.id] && BY[h.id].when(c, h)) || null;
  };
  S.hookDone = function (c, id) { c.hooks = (c.hooks || []).filter(h => h.id !== id); };

  const BY = {};
  BACK.forEach(e => { BY[e.id] = e; });
  // Os eventos que deixam continuação saem um pouco mais (é o que dá história à carreira)
  const seedIds = new Set(SEEDS.map(x => x[0]));
  S.EVENT_DEFS.forEach(e => { if (seedIds.has(e.id) && !e.hook) e.weight += 2; });
  S.HOOK_DEFS = BY;
  S.EVENT_DEFS.push(...BACK);

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
