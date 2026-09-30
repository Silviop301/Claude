// Mais eventos durante a temporada: base, campo, vestiário, vida fora do campo.
// Mesmo formato de engine/events.js (when → build → resolve); entram no mesmo sorteio.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { bump } = S._;
  const last = c => c.seasons[c.seasons.length - 1] || null;
  const atClub = c => c.age - c.clubSince;
  const club = c => D.CLUB_BY_ID[c.club];
  const abroad = c => !!c.club && D.countryOf(club(c)) !== c.country;
  const has = (c, t) => c.traits.includes(t);
  const money = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1e3) + ' mil');
  const pct = p => Math.round(p * 100) + '%';
  // Texto que muda quando o evento se repete na carreira: [título, texto]
  const alt = (c, id, opts) => { const o = opts[((c.evCount || {})[id] || 0) % opts.length]; return { title: o[0], text: o[1] }; };
  const opt = (label, hint) => ({ label, hint });
  // Reforço/perda de elenco no clube atual (mesma escala do acesso/rebaixamento)
  const boost = (c, n) => {
    c.clubBoost = c.clubBoost || {};
    c.clubBoost[c.club] = Math.max(-6, Math.min(8, (c.clubBoost[c.club] || 0) + n));
    if (S.applyLeagues) S.applyLeagues(c);
  };

  const MORE = [
    // ---------- começo de carreira ----------
    {
      id: 'estudos', icon: '📚', ico: 'book-open', tone: 'blue', weight: 3, max: 1,
      when: c => c.age <= 18 && !!c.club,
      build: () => ({
        title: 'Terminar os estudos?', text: 'A escola quer que você conclua o ensino médio à noite. O treino começa às 7h.',
        options: [opt('Estudar à noite', 'Técnico +5 · forma −4% (cansaço) · Fama +4 (exemplo)'), opt('Só futebol', 'Forma +5%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 5), { ok: true, text: 'Diploma na mão e o respeito de todo o elenco.', fx: { form: -0.04, fame: 4 } })
        : { ok: true, text: 'Foco total no gramado. O corpo agradeceu.', fx: { form: 0.05 } }),
    },
    {
      id: 'carro', icon: '🏎️', ico: 'car', tone: 'blue', weight: 3, max: 1,
      when: c => c.age <= 22 && c.money >= 60000,
      build: c => {
        const v = Math.round(Math.min(c.money * 0.4, 900000) / 1000) * 1000;
        return {
          title: 'O primeiro carrão', text: 'O primeiro salário bom caiu e a concessionária já ligou.', value: v,
          options: [opt('Comprar o carrão (R$ ' + money(v) + ')', 'Fama +10 · a torcida acha exagero: Torcida −4'), opt('Dar uma casa para a família', 'R$ ' + money(Math.round(v * 0.8 / 1000) * 1000) + ' · Torcida +8 · forma +4%')],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', -4); return { ok: true, text: 'O carro virou notícia. Nem todo mundo gostou.', fx: { money: -ev.value, fame: 10 } }; }
        bump(c, 'fans', 8);
        return { ok: true, text: 'Sua mãe chorou na entrega das chaves. Você jogou leve a temporada inteira.', fx: { money: -Math.round(ev.value * 0.8), form: 0.04 } };
      },
    },
    {
      id: 'saudade', icon: '🏠', ico: 'house', tone: 'blue', weight: 4, max: 1,
      when: c => c.age <= 22 && abroad(c) && atClub(c) <= 1,
      build: c => ({
        title: 'Saudade de casa', text: 'Primeiro ano em ' + D.countryOf(club(c)) + '. Frio, comida diferente e a família longe.',
        options: [opt('Trazer a família', 'R$ 120 mil · forma +6%'), opt('Aguentar sozinho', '50%: amadurece (Técnico +8) · 50%: forma −8%')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Com a família por perto, o futebol voltou a fluir.', fx: { money: -120000, form: 0.06 } };
        if (r() < 0.5) { bump(c, 'coach', 8); return { ok: true, text: 'Foi duro, mas você amadureceu anos em meses.', fx: {} }; }
        return { ok: false, text: 'As noites sozinho pesaram dentro de campo.', fx: { form: -0.08 } };
      },
    },
    {
      id: 'olheiro', icon: '🔭', ico: 'binoculars', tone: 'green', weight: 4, max: 2,
      when: c => c.age <= 22 && club(c).tier <= 3 && S.ovr(c) >= 64,
      build: c => ({
        ...alt(c, 'olheiro', [
          ['Olheiro na arquibancada', 'Um olheiro de um grande europeu veio assistir ao seu jogo.'],
          ['Relatório na mesa', 'Seu nome apareceu no relatório de um clube inglês. Eles mandam alguém no próximo jogo.']]),
        options: [opt('Jogar para aparecer', 'Fama +12 · gols +10% · 30%: individualista, Técnico −10'), opt('Jogar para o time', 'Técnico +6 · assistências +10%')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.3) { bump(c, 'coach', -10); return { ok: false, text: 'Você prendeu a bola demais e o técnico reclamou no intervalo.', fx: { fame: 12, goalMul: 0.1 } }; }
          return { ok: true, text: 'Dribles, gol e o olheiro anotando sem parar.', fx: { fame: 12, goalMul: 0.1 } };
        }
        bump(c, 'coach', 6);
        return { ok: true, text: 'O olheiro elogiou sua leitura de jogo no relatório.', fx: { assistMul: 0.1 } };
      },
    },
    {
      id: 'empresario', icon: '🕴️', ico: 'briefcase', tone: 'blue', weight: 3, max: 1,
      when: c => c.age <= 23 && c.fame >= 15,
      build: () => ({
        title: 'Empresário famoso', text: 'O empresário mais poderoso do país quer cuidar da sua carreira.',
        options: [opt('Assinar com ele', 'Salário +15% · Fama +8 · 35%: ele força uma transferência'), opt('Ficar com quem te trouxe', 'Torcida +4 · Técnico +4')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          c.wage = Math.round(c.wage * 1.15);
          if (r() < 0.35) { c.wantsOut = true; return { ok: true, text: 'Em um mês, ele já estava negociando você com outros clubes.', fx: { fame: 8 } }; }
          return { ok: true, text: 'Contrato revisado e seu nome circulando nos grandes.', fx: { fame: 8 } };
        }
        bump(c, 'fans', 4); bump(c, 'coach', 4);
        return { ok: true, text: 'Lealdade: quem esteve com você no começo continua com você.', fx: {} };
      },
    },
    {
      id: 'dieta', icon: '🥗', ico: 'salad', tone: 'green', weight: 3, max: 1,
      when: c => c.age <= 26 && !!c.club,
      build: c => ({
        title: 'Nutricionista linha-dura', text: 'O clube contratou uma nutricionista que cortou tudo: açúcar, fritura, refrigerante.',
        options: [opt('Seguir à risca', '+2 ' + D.label(c.pos, 'fis') + ' para sempre · Fama −2 (sem churrasco nas redes)'), opt('Seguir mais ou menos', 'Forma +3%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Três quilos a menos e um fôlego que você não conhecia.', fx: { attr: { fis: 2 }, fame: -2 } }
        : { ok: true, text: 'Um pouco de cada. O corpo não reclamou.', fx: { form: 0.03 } }),
    },
    {
      id: 'fisgada', icon: '⚡', ico: 'zap', tone: 'red', weight: 3, max: 3,
      when: c => c.age <= 27,
      build: c => ({
        ...alt(c, 'fisgada', [
          ['Fisgada na coxa', 'Sentiu a coxa no aquecimento. Jogo importante hoje.'],
          ['Panturrilha travada', 'A panturrilha travou no treino da véspera. O técnico conta com você.']]),
        options: [opt('Jogar mesmo assim', '65%: tudo bem, Técnico +6 · 35%: lesão (perde 20% da temporada)'), opt('Avisar o médico', 'Perde 2 semanas (−5% de minutos)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.65 + (has(c, 'pro') ? 0.1 : 0)) { bump(c, 'coach', 6); return { ok: true, text: 'Aguentou e ainda jogou bem.', fx: {} }; }
          return { ok: false, text: 'A fisgada virou estiramento.', fx: { inj: 0.2 } };
        }
        return { ok: true, text: 'Duas semanas de tratamento e voltou 100%.', fx: { min: -0.05 } };
      },
    },

    // ---------- em campo ----------
    {
      id: 'jejum', icon: '🥶', ico: 'circle-slash', tone: 'red', weight: 4, max: 2,
      when: c => c.pos === 'ATA' && !!last(c) && last(c).goals < 10 && last(c).games >= 15,
      build: c => ({
        ...alt(c, 'jejum', [
          ['Jejum de gols', 'Oito jogos sem marcar. A imprensa já conta os minutos.'],
          ['A bola não entra', 'Trave, goleiro, VAR... a fase não ajuda. Faz um mês que você não marca.']]),
        options: [opt('Ficar depois do treino finalizando', '+2 FIN para sempre · forma −3%'), opt('Conversar com a psicóloga do clube', 'Forma +8%'), opt('Ignorar e seguir', '40%: desencanta (gols +15%) · 60%: nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Trezentas finalizações depois, a bola voltou a obedecer.', fx: { attr: { fin: 2 }, form: -0.03 } };
        if (i === 1) return { ok: true, text: 'A cabeça leve fez a diferença. Os gols voltaram.', fx: { form: 0.08 } };
        if (r() < 0.4) return { ok: true, text: 'Gol de canela no fim do jogo. Desencantou!', fx: { goalMul: 0.15 } };
        return { ok: false, text: 'A seca continuou por mais algumas semanas.', fx: {} };
      },
    },
    {
      id: 'cobrador', icon: '⚽', ico: 'circle-dot', tone: 'blue', weight: 3, max: 2,
      when: c => ['ATA', 'MEI'].includes(c.pos) && atClub(c) >= 1,
      build: () => ({
        title: 'Quem bate o pênalti?', text: 'O camisa 10 do time e você querem ser o cobrador oficial.',
        options: [opt('Brigar pela cobrança', '60%: vira o cobrador (gols +12%) · 40%: racha no vestiário (Técnico −10)'), opt('Deixar com ele', 'Técnico +5 · Torcida +3')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.6 + (has(c, 'frieza') ? 0.15 : 0)) return { ok: true, text: 'O técnico decidiu: a bola é sua na marca da cal.', fx: { goalMul: 0.12 } };
          bump(c, 'coach', -10);
          return { ok: false, text: 'A discussão vazou para a imprensa. Clima pesado.', fx: { form: -0.03 } };
        }
        bump(c, 'coach', 5); bump(c, 'fans', 3);
        return { ok: true, text: 'Gesto de grupo. O elenco notou.', fx: {} };
      },
    },
    {
      id: 'var', icon: '📺', ico: 'tv', tone: 'red', weight: 3, max: 2,
      when: c => c.pos !== 'GOL' && c.fame >= 10,
      build: c => ({
        ...alt(c, 'var', [
          ['Gol anulado pelo VAR', 'Seu gol no jogo grande foi anulado por um impedimento de ombro.'],
          ['Pênalti não marcado', 'Você foi derrubado na área e o VAR mandou seguir. Derrota no fim.']]),
        options: [opt('Reclamar na entrevista', 'Fama +8 · Torcida +5 · 50%: suspensão (−6% de minutos)'), opt('Ficar quieto', 'Técnico +5')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', 5);
          if (r() < 0.5) return { ok: false, text: 'A fala rendeu dois jogos de suspensão.', fx: { fame: 8, min: -0.06 } };
          return { ok: true, text: 'A entrevista viralizou e a torcida ficou do seu lado.', fx: { fame: 8 } };
        }
        bump(c, 'coach', 5);
        return { ok: true, text: 'Maturidade. O técnico elogiou a postura.', fx: {} };
      },
    },
    {
      id: 'provocacao', icon: '😤', ico: 'angry', tone: 'red', weight: 3, max: 2,
      when: c => c.pos !== 'GOL',
      build: () => ({
        title: 'Provocação em campo', text: 'O zagueiro rival passou o jogo inteiro te provocando e pisando no seu pé.',
        options: [opt('Revidar', 'Torcida +8 · 50%: expulsão (−6% de minutos)'), opt('Responder com a bola', 'Forma +4% · ' + (pct(0.35)) + ': golaço, Fama +8')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', 8);
          if (r() < 0.5 - (has(c, 'frieza') ? 0.2 : 0)) return { ok: false, text: 'Vermelho direto. Três jogos fora.', fx: { min: -0.06 } };
          return { ok: true, text: 'Você mediu forças e ele parou de provocar.', fx: {} };
        }
        if (r() < 0.35) return { ok: true, text: 'Drible no provocador e gol. Resposta perfeita.', fx: { form: 0.04, fame: 8 } };
        return { ok: true, text: 'Cabeça fria o jogo todo.', fx: { form: 0.04 } };
      },
    },
    {
      id: 'volante', icon: '🔁', ico: 'repeat', tone: 'blue', weight: 3, max: 1,
      when: c => c.pos === 'ZAG' && atClub(c) >= 1,
      build: () => ({
        title: 'Zagueiro de volante?', text: 'O técnico quer te testar como volante para sair jogando.',
        options: [opt('Topar o desafio', '+2 PAS para sempre · assistências +30% · jogos sem sofrer gol −10%'), opt('Ficar na zaga', 'Técnico −4 · sem mudança')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Você descobriu um passe longo que ninguém conhecia.', fx: { attr: { pas: 2 }, assistMul: 0.3, form: -0.02 } }
        : (bump(c, 'coach', -4), { ok: true, text: 'O técnico aceitou, mas não gostou.', fx: {} })),
    },
    {
      id: 'reserva_gol', icon: '🧤', ico: 'user-plus', tone: 'red', weight: 4, max: 2,
      when: c => c.pos === 'GOL' && atClub(c) >= 1,
      build: () => ({
        title: 'O reserva está chegando', text: 'O goleiro reserva, de 19 anos, está voando nos treinos. A imprensa pede a vez dele.',
        options: [opt('Treinar dobrado', '+2 REF para sempre · forma −3%'), opt('Ajudar o garoto', 'Técnico +8 · Torcida +4 · 25%: perde a vaga por um tempo (−10% de minutos)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Você fechou o gol. A vaga continuou sua.', fx: { attr: { fin: 2 }, form: -0.03 } };
        bump(c, 'coach', 8); bump(c, 'fans', 4);
        if (r() < 0.25) return { ok: false, text: 'O garoto aproveitou a chance e jogou algumas partidas.', fx: { min: -0.1 } };
        return { ok: true, text: 'Liderança de verdade. O vestiário te respeita ainda mais.', fx: {} };
      },
    },
    {
      id: 'goleiro_area', icon: '🙌', ico: 'flag-triangle-right', tone: 'blue', weight: 2, max: 2,
      when: c => c.pos === 'GOL',
      build: () => ({
        title: 'Último minuto, escanteio', text: 'Perdendo por 1 a 0, acréscimos. O banco grita para você subir para a área.',
        options: [opt('Subir para cabecear', '25%: gol de goleiro, Fama +20 · senão, 30% de contra-ataque (Técnico −5)'), opt('Ficar no gol', 'Nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.25) { bump(c, 'fans', 10); return { ok: true, text: 'GOL DO GOLEIRO! O estádio veio abaixo.', fx: { fame: 20 } }; }
          if (r() < 0.3) { bump(c, 'coach', -5); return { ok: false, text: 'A bola sobrou, contra-ataque e gol deles no gol vazio.', fx: {} }; }
          return { ok: true, text: 'Subiu, disputou e voltou correndo. Faltou pouco.', fx: { fame: 3 } };
        }
        return { ok: true, text: 'Você segurou a posição. Derrota mínima.', fx: {} };
      },
    },
    {
      id: 'treino_gol', icon: '🥅', ico: 'goal', tone: 'green', weight: 3, max: 1,
      when: c => c.pos === 'GOL' && c.age <= 30,
      build: () => ({
        title: 'Preparador de goleiros novo', text: 'O preparador chegou com um método europeu: reação, saída do gol e jogo com os pés.',
        options: [opt('Foco em reflexo', '+2 REF para sempre'), opt('Foco em jogo com os pés', '+2 REP para sempre · Técnico +4')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Você começou a pegar bolas que antes entravam.', fx: { attr: { fin: 2 } } }
        : (bump(c, 'coach', 4), { ok: true, text: 'Agora o time sai jogando a partir de você.', fx: { attr: { pas: 2 } } })),
    },
    {
      id: 'aereo', icon: '🦒', ico: 'chevrons-up', tone: 'green', weight: 3, max: 1,
      when: c => ['ZAG', 'ATA'].includes(c.pos) && c.age <= 29,
      build: () => ({
        title: 'Treino de bola aérea', text: 'O auxiliar monta um treino de cabeceio todo dia depois do treino.',
        options: [opt('Topar', '+2 FÍS para sempre · gols +8%'), opt('Poupar o pescoço', 'Forma +4%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Tempo de bola afiado. Os cruzamentos viraram chance.', fx: { attr: { fis: 2 }, goalMul: 0.08 } }
        : { ok: true, text: 'Descansado para a temporada.', fx: { form: 0.04 } }),
    },

    // ---------- clube e vestiário ----------
    {
      id: 'atraso', icon: '💸', ico: 'wallet', tone: 'red', weight: 4, max: 2,
      when: c => club(c).tier <= 2 && atClub(c) >= 1,
      build: c => ({
        title: 'Salários atrasados', text: 'Três meses sem salário ' + D.no(club(c).name) + '. O elenco fala em greve.',
        options: [opt('Aderir à greve', 'Torcida −8 · 60%: salários pagos (R$ ' + money(c.wage * 12) + ')'), opt('Jogar calado', 'Técnico +8 · Torcida +5'), opt('Pedir para sair', 'Abre a janela no fim da temporada · Torcida −6')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', -8);
          if (r() < 0.6) return { ok: true, text: 'A pressão funcionou: tudo pago em uma semana.', fx: { money: c.wage * 12 } };
          return { ok: false, text: 'A diretoria endureceu e o clima ficou péssimo.', fx: { form: -0.05 } };
        }
        if (i === 1) { bump(c, 'coach', 8); bump(c, 'fans', 5); return { ok: true, text: 'Profissionalismo que a torcida não esquece.', fx: {} }; }
        bump(c, 'fans', -6); c.wantsOut = true;
        return { ok: true, text: 'Seu empresário já procura outro clube.', fx: {} };
      },
    },
    {
      id: 'presidente', icon: '🏛️', ico: 'landmark', tone: 'blue', weight: 3, max: 2,
      when: c => atClub(c) >= 1 && c.contract <= 2 && c.age <= 31,
      build: c => ({
        title: 'Promessa do presidente', text: 'O presidente ' + D.do(club(c).name) + ' promete reforços de peso se você renovar agora.',
        options: [opt('Renovar e confiar', 'Contrato +2 anos · salário +20% · 50%: reforços chegam (títulos mais fáceis)'), opt('Esperar para ver', 'Nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          c.contract += 2; c.wage = Math.round(c.wage * 1.2);
          if (r() < 0.5) { boost(c, 2); return { ok: true, text: 'Ele cumpriu: três reforços chegaram. O time ficou mais forte.', fx: {} }; }
          return { ok: false, text: 'Os reforços nunca vieram. Pelo menos o salário subiu.', fx: {} };
        }
        return { ok: true, text: 'Você preferiu esperar os reforços antes de assinar.', fx: {} };
      },
    },
    {
      id: 'vestiario', icon: '🥊', ico: 'swords', tone: 'red', weight: 3, max: 2,
      when: c => atClub(c) >= 1 && c.age >= 21,
      build: () => ({
        title: 'Briga no vestiário', text: 'Dois veteranos saíram no braço depois da derrota. Todo mundo olhou para você.',
        options: [opt('Separar e falar com o grupo', '65%: Técnico +10 · 35%: sobra para você (forma −4%)'), opt('Ficar de fora', 'Nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.65 + (has(c, 'lider') ? 0.2 : 0)) { bump(c, 'coach', 10); return { ok: true, text: 'Você segurou o grupo. O time embalou depois disso.', fx: { form: 0.03 } }; }
          return { ok: false, text: 'Levou um empurrão e ainda ficou mal com os dois.', fx: { form: -0.04 } };
        }
        return { ok: true, text: 'A comissão técnica resolveu. Você seguiu no seu canto.', fx: {} };
      },
    },
    {
      id: 'rival', icon: '😈', ico: 'shield-alert', tone: 'blue', weight: 3, max: 1,
      when: c => atClub(c) >= 2 && c.rel.fans >= 55 && S.ovr(c) >= 62,
      build: (c, r) => {
        const cl = club(c);
        const rv = S.derbyOf(cl);
        if (!rv) return null;
        return {
          title: D.O(rv.name) + ' quer você', text: 'O maior rival fez uma proposta alta. A torcida ' + D.do(cl.name) + ' não acredita.',
          dest: rv.id,
          options: [opt('Ir para o rival', 'Salário maior · a torcida atual vai te odiar para sempre'), opt('Recusar em público', 'Torcida +18 · Fama +6')],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { c.fansBy[c.club] = 0; bump(c, 'fans', -40); return { ok: true, text: 'Você vestiu a camisa do rival. A antiga torcida queimou faixas.', fx: { move: ev.dest, fame: 12 } }; }
        bump(c, 'fans', 18);
        return { ok: true, text: '"Aqui é minha casa." A frase virou bandeira na arquibancada.', fx: { fame: 6 } };
      },
    },
    {
      id: 'gringo', icon: '🗣️', ico: 'languages', tone: 'blue', weight: 3, max: 1,
      when: c => atClub(c) >= 1,
      build: () => ({
        title: 'Técnico estrangeiro', text: 'O novo técnico só fala inglês e ainda não confia em ninguém.',
        options: [opt('Fazer aulas de inglês', 'R$ 30 mil · Técnico +12'), opt('Se virar com o tradutor', '40%: ruído na comunicação (Técnico −6)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', 12); return { ok: true, text: 'Em três meses você já era o intérprete do elenco.', fx: { money: -30000 } }; }
        if (r() < 0.4) { bump(c, 'coach', -6); return { ok: false, text: 'Um mal-entendido tático virou bronca na frente de todos.', fx: {} }; }
        return { ok: true, text: 'O tradutor deu conta do recado.', fx: {} };
      },
    },
    {
      id: 'estrela', icon: '🌠', ico: 'star', tone: 'red', weight: 3, max: 2,
      when: c => club(c).tier >= 3 && atClub(c) >= 1 && c.age >= 20,
      build: c => ({
        title: 'Contrataram uma estrela', text: D.O(club(c).name) + ' anunciou um craque famoso para a sua posição.',
        options: [opt('Disputar a vaga', '55%: mantém a titularidade (+5% de minutos) · 45%: vai para o banco (−15%)'), opt('Aceitar o rodízio', 'Técnico +8 · −8% de minutos'), opt('Pedir para sair', 'Abre a janela no fim da temporada')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.55 + (has(c, 'raca') ? 0.1 : 0)) return { ok: true, text: 'O craque famoso virou seu reserva. Que temporada.', fx: { min: 0.05, fame: 6 } };
          return { ok: false, text: 'O técnico escolheu o recém-chegado.', fx: { min: -0.15 } };
        }
        if (i === 1) { bump(c, 'coach', 8); return { ok: true, text: 'Maturidade: o técnico reveza e confia em você.', fx: { min: -0.08 } }; }
        c.wantsOut = true;
        return { ok: true, text: 'Seu empresário já abriu conversas.', fx: {} };
      },
    },
    {
      id: 'demitido', icon: '🚪', ico: 'door-open', tone: 'red', weight: 3, max: 2,
      when: c => atClub(c) >= 1 && c.rel.coach >= 60,
      build: () => ({
        title: 'O técnico caiu', text: 'O treinador que te bancou foi demitido depois de três derrotas.',
        options: [opt('Defender ele na imprensa', 'Fama +6 · Torcida +4 · o novo técnico começa desconfiado (Técnico −12)'), opt('Ficar em silêncio', 'Nada muda')],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'coach', -12); bump(c, 'fans', 4); return { ok: true, text: 'Lealdade rara no futebol. O novo técnico anotou.', fx: { fame: 6 } }; }
        return { ok: true, text: 'Página virada. Vida que segue.', fx: {} };
      },
    },
    {
      id: 'organizada', icon: '🥁', ico: 'drum', tone: 'red', weight: 2, max: 2,
      when: c => c.rel.fans >= 60,
      build: c => ({
        title: 'Convite da organizada', text: 'A torcida organizada ' + D.do(club(c).name) + ' quer você na festa de aniversário dela.',
        options: [opt('Ir à festa', 'Torcida +12 · 20%: confusão na saída (Fama −6, Técnico −6)'), opt('Mandar um vídeo', 'Torcida +4')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', 12);
          if (r() < 0.2) { bump(c, 'coach', -6); return { ok: false, text: 'Teve briga na porta e a foto rodou os jornais.', fx: { fame: -6 } }; }
          return { ok: true, text: 'Você cantou com a bateria. Virou um deles.', fx: {} };
        }
        bump(c, 'fans', 4);
        return { ok: true, text: 'O vídeo foi exibido no telão da festa.', fx: {} };
      },
    },
    {
      id: 'homenagem', icon: '🏅', ico: 'award', tone: 'green', weight: 4, max: 2,
      when: c => atClub(c) >= 5 && c.rel.fans >= 65,
      build: c => ({
        title: 'Homenagem no estádio', text: D.O(club(c).name) + ' vai te homenagear antes do jogo pelos ' + atClub(c) + ' anos de clube.',
        options: [opt('Discurso emocionado', 'Torcida +10 · Fama +8'), opt('Agradecer rápido e jogar', 'Forma +4% · Torcida +4')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 10), { ok: true, text: 'Você chorou, o estádio chorou junto.', fx: { fame: 8 } })
        : (bump(c, 'fans', 4), { ok: true, text: 'Placa na mão, chuteira no pé. E ainda fez o gol.', fx: { form: 0.04 } })),
    },
    {
      id: 'padrinho', icon: '🤝', ico: 'handshake', tone: 'green', weight: 3, max: 1,
      when: c => c.age >= 30 && !!c.club,
      build: () => ({
        title: 'O garoto da base', text: 'Um menino de 17 anos subiu ao profissional e diz que você é o ídolo dele.',
        options: [opt('Apadrinhar o garoto', 'Técnico +8 · Torcida +6 · forma −2%'), opt('Focar no seu jogo', 'Forma +5%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 8), bump(c, 'fans', 6), { ok: true, text: 'O garoto marcou na estreia e correu para te abraçar.', fx: { form: -0.02 } })
        : { ok: true, text: 'Cabeça no próprio desempenho.', fx: { form: 0.05 } }),
    },
    {
      id: 'centenario', icon: '🎂', ico: 'cake', tone: 'green', weight: 2, max: 1,
      when: c => atClub(c) >= 1,
      build: c => ({
        title: 'Centenário do clube', text: D.O(club(c).name) + ' faz 100 anos e vai lançar uma camisa comemorativa com o seu rosto na campanha.',
        options: [opt('Estrelar a campanha', 'Fama +10 · Torcida +6 · R$ 50 mil'), opt('Deixar para os ídolos antigos', 'Torcida +4 · Técnico +3')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 6), { ok: true, text: 'A camisa esgotou em um dia.', fx: { fame: 10, money: 50000 } })
        : (bump(c, 'fans', 4), bump(c, 'coach', 3), { ok: true, text: 'Humildade que a velha guarda respeitou.', fx: {} })),
    },

    // ---------- fora de campo ----------
    {
      id: 'casamento', icon: '💍', ico: 'gem', tone: 'green', weight: 3, max: 1,
      when: c => c.age >= 23 && c.age <= 32,
      build: () => ({
        title: 'Casamento marcado', text: 'O casamento cai bem na pré-temporada.',
        options: [opt('Festão com 800 convidados', 'Fama +10 · R$ 300 mil · forma −5%'), opt('Cerimônia íntima', 'Forma +4%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'A festa foi capa de revista. O preparo físico, nem tanto.', fx: { fame: 10, money: -300000, form: -0.05 } }
        : { ok: true, text: 'Só a família e os amigos. Você voltou leve e feliz.', fx: { form: 0.04 } }),
    },
    {
      id: 'filho', icon: '👶', ico: 'baby', tone: 'green', weight: 3, max: 1,
      when: c => c.age >= 24 && c.age <= 35,
      build: () => ({
        title: 'Seu filho vai nascer', text: 'O parto está previsto para o dia do jogo decisivo.',
        options: [opt('Estar no parto', 'Técnico −5 · Torcida +8 · Fama +6'), opt('Jogar e dedicar o gol', 'Gols +5% · Fama +8 · 30%: perde o nascimento (forma −5%)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', -5); bump(c, 'fans', 8); return { ok: true, text: 'Você viu seu filho nascer. O resto é detalhe.', fx: { fame: 6 } }; }
        if (r() < 0.3) return { ok: false, text: 'O parto foi antes do intervalo. Você só soube no vestiário.', fx: { goalMul: 0.05, fame: 8, form: -0.05 } };
        return { ok: true, text: 'Gol e a comemoração de embalar o bebê. Foto do ano.', fx: { goalMul: 0.05, fame: 8 } };
      },
    },
    {
      id: 'documentario', icon: '🎬', ico: 'clapperboard', tone: 'blue', weight: 3, max: 1,
      when: c => c.fame >= 90,
      build: c => {
        const v = Math.round(c.wage * 52 * 0.5 / 1000) * 1000;
        return {
          title: 'Documentário na plataforma', text: 'Uma plataforma de streaming quer filmar a sua temporada inteira.', value: v,
          options: [opt('Aceitar as câmeras', 'R$ ' + money(v) + ' · Fama +15 · 35%: bastidores expostos (Técnico −10)'), opt('Recusar', 'Forma +3%')],
        };
      },
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.35) { bump(c, 'coach', -10); return { ok: false, text: 'O episódio 3 mostrou uma discussão com o técnico. Climão.', fx: { money: ev.value, fame: 15 } }; }
          return { ok: true, text: 'A série virou a mais vista do mês.', fx: { money: ev.value, fame: 15 } };
        }
        return { ok: true, text: 'Privacidade preservada.', fx: { form: 0.03 } };
      },
    },
    {
      id: 'podcast', icon: '🎙️', ico: 'mic', tone: 'blue', weight: 3, max: 2,
      when: c => c.fame >= 40,
      build: c => ({
        ...alt(c, 'podcast', [
          ['Convite para podcast', 'O podcast mais ouvido do país quer três horas de conversa com você.'],
          ['Entrevista longa', 'Um canal famoso quer uma entrevista sem cortes, falando de tudo.']]),
        options: [opt('Falar tudo, sem filtro', 'Fama +12 · 40%: polêmica (Torcida −8)'), opt('Papo leve', 'Fama +4 · Torcida +3')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.4) { bump(c, 'fans', -8); return { ok: false, text: 'Um trecho fora de contexto rodou a internet.', fx: { fame: 12 } }; }
          return { ok: true, text: 'Milhões de visualizações e o público do seu lado.', fx: { fame: 12 } };
        }
        bump(c, 'fans', 3);
        return { ok: true, text: 'Histórias de infância e risadas. Todo mundo gostou.', fx: { fame: 4 } };
      },
    },
    {
      id: 'negocio', icon: '📈', ico: 'briefcase-business', tone: 'blue', weight: 2, max: 2,
      when: c => c.money >= 500000,
      build: c => {
        const v = Math.round(c.money * 0.3 / 1000) * 1000;
        return {
          ...alt(c, 'negocio', [
            ['Sociedade num negócio', 'Um amigo de infância quer você de sócio numa rede de academias.'],
            ['Investimento arriscado', 'Um assessor promete dobrar seu dinheiro num empreendimento imobiliário.']]),
          value: v,
          options: [opt('Investir R$ ' + money(v), '50%: dobra · 50%: perde tudo'), opt('Deixar o dinheiro quieto', 'Nada muda')],
        };
      },
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.5) return { ok: true, text: 'Deu certo: o investimento dobrou.', fx: { money: ev.value } };
          return { ok: false, text: 'O negócio quebrou e o dinheiro sumiu.', fx: { money: -ev.value } };
        }
        return { ok: true, text: 'Dinheiro guardado é dinheiro tranquilo.', fx: {} };
      },
    },
    {
      id: 'reality', icon: '📺', ico: 'video', tone: 'red', weight: 2, max: 1,
      when: c => c.fame >= 60 && c.age <= 29,
      build: () => ({
        title: 'Reality nas férias', text: 'Um reality show quer você nas férias. Cachê alto e muita exposição.',
        options: [opt('Participar', 'Fama +20 · R$ 200 mil · Técnico −8 (férias sem descanso)'), opt('Recusar', 'Forma +4%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', -8), { ok: true, text: 'Você foi o favorito do público, e voltou cansado.', fx: { fame: 20, money: 200000, form: -0.04 } })
        : { ok: true, text: 'Férias de verdade.', fx: { form: 0.04 } }),
    },
    {
      id: 'beneficente', icon: '🤲', ico: 'hand-heart', tone: 'green', weight: 2, max: 2,
      when: c => c.fame >= 30,
      build: () => ({
        title: 'Jogo beneficente', text: 'Um amigo organiza um jogo beneficente nas férias, com ex-craques e artistas.',
        options: [opt('Jogar', 'Torcida +6 · Fama +6 · 15%: pancada boba (perde 8% da temporada)'), opt('Só doar camisas', 'Fama +2')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', 6);
          if (r() < 0.15) return { ok: false, text: 'Um cantor entrou de carrinho. Tornozelo torcido.', fx: { fame: 6, inj: 0.08 } };
          return { ok: true, text: 'Golaço de letra e muito dinheiro arrecadado.', fx: { fame: 6 } };
        }
        return { ok: true, text: 'As camisas autografadas foram leiloadas.', fx: { fame: 2 } };
      },
    },
    {
      id: 'amistosos', icon: '🎌', ico: 'flag', tone: 'green', weight: 3, max: 3,
      when: c => S.ovr(c) >= 74 && c.age >= 20 && c.age <= 33,
      build: c => ({
        title: 'Convocado para amistosos', text: 'A seleção chamou para dois amistosos no meio da temporada do clube.',
        options: [opt('Ir para a seleção', 'Fama +14 · Técnico −6 · 15%: volta machucado'), opt('Pedir dispensa', 'Técnico +8 · Torcida −4')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'coach', -6);
          if (r() < 0.15) return { ok: false, text: 'Voltou da seleção com um problema muscular.', fx: { fame: 14, inj: 0.12 } };
          return { ok: true, text: 'Gol com a camisa da seleção. O país inteiro viu.', fx: { fame: 14 } };
        }
        bump(c, 'coach', 8); bump(c, 'fans', -4);
        return { ok: true, text: 'O clube agradeceu. Parte da imprensa, não.', fx: {} };
      },
    },
    {
      id: 'adaptacao', icon: '🌍', ico: 'globe', tone: 'blue', weight: 4, max: 2,
      when: c => c.age >= 23 && abroad(c) && atClub(c) === 0,
      build: c => ({
        title: 'Adaptação em ' + D.countryOf(club(c)), text: 'Idioma, clima e um futebol diferente. O começo está difícil.',
        options: [opt('Contratar professor e chef', 'R$ 80 mil · forma +6%'), opt('Aprender na marra', '40%: forma −8% · 60%: adaptado (Técnico +6)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Em dois meses você já pedia café no idioma local.', fx: { money: -80000, form: 0.06 } };
        if (r() < 0.4 - (has(c, 'adaptavel') ? 0.25 : 0)) return { ok: false, text: 'Levou meio ano para se sentir em casa.', fx: { form: -0.08 } };
        bump(c, 'coach', 6);
        return { ok: true, text: 'Adaptação rápida. O técnico ficou impressionado.', fx: {} };
      },
    },
    {
      id: 'manipulacao', icon: '🚨', ico: 'siren', tone: 'red', weight: 2, max: 1,
      when: c => club(c).tier <= 2 && c.age >= 19,
      build: () => ({
        title: 'Proposta suspeita', text: 'Um desconhecido oferece dinheiro para você tomar um cartão amarelo num jogo específico.',
        options: [opt('Denunciar à polícia', 'Fama +14 · Torcida +10 · 20%: ameaças (forma −5%)'), opt('Recusar e bloquear o número', 'Nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', 10);
          if (r() < 0.2) return { ok: true, text: 'A quadrilha foi presa. Você recebeu ameaças por um tempo, mas virou exemplo.', fx: { fame: 14, form: -0.05 } };
          return { ok: true, text: 'Sua denúncia desmontou um esquema de apostas. Virou exemplo no país.', fx: { fame: 14 } };
        }
        return { ok: true, text: 'Número bloqueado. Assunto encerrado.', fx: {} };
      },
    },
    {
      id: 'lesionou', icon: '🩹', ico: 'triangle-alert', tone: 'red', weight: 2, max: 1,
      when: c => ['ZAG', 'MEI'].includes(c.pos),
      build: () => ({
        title: 'Lance infeliz', text: 'Numa dividida, você lesionou feio um adversário. Foi sem querer, mas a imagem é forte.',
        options: [opt('Visitar ele no hospital', 'Fama +8 · Torcida +4'), opt('Nota nas redes', 'Fama +2 · 30%: críticas (Torcida −5)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'fans', 4); return { ok: true, text: 'A foto da visita emocionou os dois clubes.', fx: { fame: 8 } }; }
        if (r() < 0.3) { bump(c, 'fans', -5); return { ok: false, text: 'Acharam a nota fria demais.', fx: { fame: 2 } }; }
        return { ok: true, text: 'O adversário respondeu agradecendo.', fx: { fame: 2 } };
      },
    },

    // ---------- fim de carreira ----------
    {
      id: 'selecao_adeus', icon: '👋', ico: 'log-out', tone: 'blue', weight: 3, max: 1,
      when: c => c.age >= 32 && S.ovr(c) >= 70,
      build: () => ({
        title: 'Adeus à seleção?', text: 'Aos poucos a seleção renova o grupo. Um jornalista pergunta se você pensa em se despedir da camisa amarela.',
        options: [opt('Anunciar a despedida da seleção', 'Forma +6% · Técnico +6 (mais descanso no clube)'), opt('Seguir à disposição', 'Fama +6 · 20%: volta machucado de uma convocação')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', 6); return { ok: true, text: 'Carta aberta, vídeo emocionado e mais energia para o clube.', fx: { form: 0.06 } }; }
        if (r() < 0.2) return { ok: false, text: 'Na última convocação, a coxa não aguentou.', fx: { fame: 6, inj: 0.08 } };
        return { ok: true, text: 'Ainda convocado, ainda respeitado.', fx: { fame: 6 } };
      },
    },
    {
      id: 'corte_salario', icon: '✂️', ico: 'scissors', tone: 'red', weight: 3, max: 1,
      when: c => c.age >= 33 && !!c.club && c.wage > 0,
      build: () => ({
        title: 'Contrato de veterano', text: 'A diretoria quer você mais um ano, mas com salário menor.',
        options: [opt('Aceitar ganhar menos', 'Salário −25% · contrato +1 ano · Torcida +8 · Técnico +6'), opt('Manter o salário', '40%: o clube passa a te oferecer por aí')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { c.wage = Math.round(c.wage * 0.75); c.contract += 1; bump(c, 'fans', 8); bump(c, 'coach', 6); return { ok: true, text: 'Assinou sem discutir. "Aqui eu jogo por amor."', fx: {} }; }
        if (r() < 0.4) { c.wantsOut = true; return { ok: false, text: 'O clube não gostou e colocou seu nome no mercado.', fx: {} }; }
        return { ok: true, text: 'A diretoria cedeu. Salário mantido.', fx: {} };
      },
    },
    {
      id: 'curso_tecnico', icon: '📋', ico: 'clipboard-check', tone: 'blue', weight: 3, max: 1,
      when: c => c.age >= 31 && !!c.club,
      build: () => ({
        title: 'Curso de treinador', text: 'A federação abriu turma do curso de técnico. As aulas são às segundas, dia de folga.',
        options: [opt('Fazer o curso', 'Técnico +10 · forma −3%'), opt('Pensar nisso depois', 'Forma +4%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 10), { ok: true, text: 'Você começou a enxergar o jogo como o treinador. Ele percebeu.', fx: { form: -0.03 } })
        : { ok: true, text: 'Segunda-feira é para descansar.', fx: { form: 0.04 } }),
    },
    {
      id: 'recuperacao', icon: '🫧', ico: 'activity', tone: 'green', weight: 3, max: 1,
      when: c => c.age >= 30 && c.money >= 300000,
      build: c => ({
        title: 'Recuperação de ponta', text: 'Um centro de recuperação usado por craques europeus oferece um programa para prolongar a carreira.',
        options: [opt('Investir R$ 200 mil', '+2 ' + D.label(c.pos, 'fis') + ' para sempre · forma +3%'), opt('Seguir no método do clube', 'Nada muda')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Câmara hiperbárica, crioterapia e um corpo de 25 anos.', fx: { money: -200000, attr: { fis: 2 }, form: 0.03 } }
        : { ok: true, text: 'O departamento médico do clube dá conta.', fx: {} }),
    },
    {
      id: 'reserva_luxo', icon: '🛋️', ico: 'sofa', tone: 'blue', weight: 4, max: 2,
      when: c => c.age >= 32 && !!last(c) && last(c).club === c.club && last(c).games < 24,
      build: () => ({
        title: 'Reserva de luxo', text: 'O técnico quer poupar você e usar a sua experiência vindo do banco.',
        options: [opt('Aceitar o papel', 'Técnico +10 · −8% de minutos'), opt('Exigir ser titular', '45%: ganha a vaga (+10% de minutos) · 55%: Técnico −12')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', 10); return { ok: true, text: 'Entrando no segundo tempo, você decidiu jogos grandes.', fx: { min: -0.08 } }; }
        if (r() < 0.45 + (has(c, 'raca') ? 0.1 : 0)) return { ok: true, text: 'Você mostrou no treino que ainda tem lenha para queimar.', fx: { min: 0.1 } };
        bump(c, 'coach', -12);
        return { ok: false, text: 'O técnico não gostou da cobrança pública.', fx: {} };
      },
    },

    // ---------- por posição ----------
    {
      id: 'lateral', icon: '↔️', ico: 'move-horizontal', tone: 'blue', weight: 3, max: 1,
      when: c => c.pos === 'ZAG' && c.age <= 29,
      build: () => ({
        title: 'Improvisado na lateral', text: 'Os dois laterais se machucaram. O técnico pede para você quebrar o galho.',
        options: [opt('Topar a lateral', 'Técnico +10 · assistências +20% · +1 RIT'), opt('Recusar', 'Técnico −5')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 10), { ok: true, text: 'Você subiu ao ataque e ainda deu um passe para gol.', fx: { assistMul: 0.2, attr: { rit: 1 } } })
        : (bump(c, 'coach', -5), { ok: true, text: 'O técnico improvisou um volante.', fx: {} })),
    },
    {
      id: 'parceiro_zaga', icon: '🧱', ico: 'shield', tone: 'blue', weight: 3, max: 1,
      when: c => c.pos === 'ZAG' && atClub(c) >= 1,
      build: () => ({
        title: 'O parceiro de zaga', text: 'Seu novo parceiro de zaga, de 20 anos, anda errando muito.',
        options: [opt('Cobrir os erros dele', 'Técnico +6 · forma −3%'), opt('Cobrar em público', '50%: ele cresce (forma +4%) · 50%: racha (Técnico −8)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', 6); return { ok: true, text: 'Você correu por dois e o garoto ganhou confiança.', fx: { form: -0.03 } }; }
        if (r() < 0.5 + (has(c, 'lider') ? 0.2 : 0)) return { ok: true, text: 'O puxão de orelha funcionou. A dupla virou a melhor da liga.', fx: { form: 0.04 } };
        bump(c, 'coach', -8);
        return { ok: false, text: 'O garoto se fechou e o vestiário tomou partido.', fx: {} };
      },
    },
    {
      id: 'camisa10', icon: '🔟', ico: 'shirt', tone: 'green', weight: 3, max: 1,
      when: c => ['MEI', 'ATA'].includes(c.pos) && atClub(c) >= 1 && c.number !== 10,
      build: c => ({
        title: 'A camisa 10', text: 'O camisa 10 ' + D.do(club(c).name) + ' foi embora. A diretoria oferece o número para você.',
        options: [opt('Vestir a 10', 'Fama +10 · 40%: o peso da camisa (forma −5%)'), opt('Manter o seu número', 'Técnico +4')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.4 - (has(c, 'frieza') ? 0.15 : 0)) return { ok: false, text: 'A 10 pesou nos primeiros jogos.', fx: { fame: 10, form: -0.05 } };
          return { ok: true, text: 'A 10 caiu como uma luva. Camisa mais vendida da loja.', fx: { fame: 10 } };
        }
        bump(c, 'coach', 4);
        return { ok: true, text: '"Meu número me trouxe até aqui."', fx: {} };
      },
    },
    {
      id: 'centroavante', icon: '🎯', ico: 'crosshair', tone: 'blue', weight: 3, max: 1,
      when: c => c.pos === 'ATA' && atClub(c) >= 1,
      build: () => ({
        title: 'Referência ou móvel?', text: 'O técnico pergunta como você prefere jogar nesta temporada.',
        options: [opt('Centroavante de área', 'Gols +12% · assistências −10%'), opt('Atacante móvel', 'Assistências +15% · +1 DRI')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Dentro da área, pouco toque e muita bola na rede.', fx: { goalMul: 0.12, assistMul: -0.1 } }
        : { ok: true, text: 'Saindo da área, você abriu espaço para todo mundo.', fx: { assistMul: 0.15, attr: { dri: 1 } } }),
    },
    {
      id: 'analista_gol', icon: '🎞️', ico: 'film', tone: 'green', weight: 3, max: 1,
      when: c => c.pos === 'GOL' && !!c.club,
      build: () => ({
        title: 'Vídeos dos batedores', text: 'O analista montou um arquivo com os pênaltis de todos os batedores da liga.',
        options: [opt('Estudar tudo', '+2 POS para sempre · Técnico +3'), opt('Confiar no instinto', 'Forma +4%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 3), { ok: true, text: 'Agora você sabe o canto preferido de cada um.', fx: { attr: { def: 2 } } })
        : { ok: true, text: 'Goleiro bom é goleiro leve.', fx: { form: 0.04 } }),
    },
    {
      id: 'frango', icon: '🐔', ico: 'bird', tone: 'red', weight: 3, max: 2,
      when: c => c.pos === 'GOL' && !!c.club,
      build: c => ({
        ...alt(c, 'frango', [
          ['Frango na TV', 'A bola passou por baixo do seu corpo num chute fraco. O lance virou meme.'],
          ['Saída errada', 'Você saiu do gol, furou a bola e o atacante tocou para o gol vazio. O vídeo não para de rodar.']]),
        options: [opt('Rir de si mesmo nas redes', 'Fama +8 · Torcida +4'), opt('Treinar em silêncio', '+1 MAN para sempre · Técnico +4 · forma −2%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 4), { ok: true, text: 'Você postou o meme primeiro. A internet te abraçou.', fx: { fame: 8 } })
        : (bump(c, 'coach', 4), { ok: true, text: 'Horas de treino extra. Nunca mais aconteceu.', fx: { attr: { dri: 1 }, form: -0.02 } })),
    },

    // ---------- dinheiro e contrato ----------
    {
      id: 'venda_forcada', icon: '🏦', ico: 'badge-dollar-sign', tone: 'red', weight: 3, max: 1,
      when: c => club(c).tier <= 3 && S.ovr(c) >= 66 && c.age <= 28 && atClub(c) >= 1,
      build: (c, r) => {
        const cl = club(c);
        const pool = D.CLUBS.filter(x => x.tier === cl.tier + 1 && x.id !== cl.id);
        if (!pool.length) return null;
        const dest = r.pick(pool);
        return {
          title: 'Clube precisa vender', text: D.O(cl.name) + ' está afundado em dívidas e aceitou a proposta ' + D.do(dest.name) + ' por você.',
          dest: dest.id,
          options: [opt('Ir para ' + D.o(dest.name), 'Clube maior · a torcida entende'), opt('Bater o pé e ficar', 'Torcida +10 · Técnico −6')],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'A sua venda salvou as contas do clube. Saída com aplausos.', fx: { move: ev.dest, fame: 6 } };
        bump(c, 'fans', 10); bump(c, 'coach', -6);
        return { ok: true, text: 'Você ficou. A diretoria teve que vender outro.', fx: {} };
      },
    },
    {
      id: 'bicho', icon: '💰', ico: 'coins', tone: 'green', weight: 2, max: 2,
      when: c => !!c.club && c.wage > 0,
      build: c => ({
        title: 'Bicho dobrado', text: 'O presidente promete bicho dobrado se o time vencer o clássico do fim de semana.',
        options: [opt('Jogar pilhado', '55%: vitória, R$ ' + money(c.wage * 4) + ' e Torcida +6 · 45%: derrota (forma −3%)'), opt('Jogar como sempre', 'Forma +2%')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.55) { bump(c, 'fans', 6); return { ok: true, text: 'Vitória, festa no vestiário e bicho na conta.', fx: { money: c.wage * 4 } }; }
          return { ok: false, text: 'O nervosismo atrapalhou. Derrota no clássico.', fx: { form: -0.03 } };
        }
        return { ok: true, text: 'Jogo sério, sem ansiedade.', fx: { form: 0.02 } };
      },
    },
    {
      id: 'pre_contrato', icon: '📝', ico: 'file-signature', tone: 'blue', weight: 4, max: 1,
      when: c => c.contract <= 1 && atClub(c) >= 1 && S.ovr(c) >= 64 && c.age <= 31,
      build: c => {
        const v = Math.round(Math.max(c.wage, 5000) * 15 / 1000) * 1000;
        return {
          title: 'Pré-contrato na mesa', text: 'Seu contrato está no fim. Outro clube oferece luvas para você assinar um pré-contrato.', value: v,
          options: [opt('Assinar o pré-contrato', 'R$ ' + money(v) + ' de luvas · abre a janela · Torcida −12'), opt('Renovar com o seu clube', 'Contrato +2 anos · salário +10% · Torcida +8')],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { c.wantsOut = true; bump(c, 'fans', -12); return { ok: true, text: 'Luvas no bolso e despedida marcada. A torcida não gostou.', fx: { money: ev.value } }; }
        c.contract += 2; c.wage = Math.round(c.wage * 1.1); bump(c, 'fans', 8);
        return { ok: true, text: 'Renovou e mandou um recado: "Não saio daqui."', fx: {} };
      },
    },
    {
      id: 'receita', icon: '🦁', ico: 'receipt', tone: 'red', weight: 2, max: 1,
      when: c => c.money >= 1000000,
      build: c => ({
        title: 'O leão bateu na porta', text: 'A Receita questiona os seus contratos de imagem dos últimos anos.',
        options: [opt('Fazer um acordo', 'R$ ' + money(Math.round(c.money * 0.12)) + ' (12% do patrimônio)'), opt('Brigar na justiça', '50%: ganha a causa · 50%: multa de 25% e Fama −6')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Acordo fechado. Dor de cabeça resolvida.', fx: { money: -Math.round(c.money * 0.12) } };
        if (r() < 0.5) return { ok: true, text: 'Os advogados provaram que estava tudo certo.', fx: {} };
        return { ok: false, text: 'Perdeu a causa e a notícia saiu em todo lugar.', fx: { money: -Math.round(c.money * 0.25), fame: -6 } };
      },
    },
    {
      id: 'apostas', icon: '🎰', ico: 'dice-5', tone: 'red', weight: 2, max: 1,
      when: c => c.fame >= 50 && c.wage > 0,
      build: c => {
        const v = Math.round(c.wage * 26 / 1000) * 1000;
        return {
          title: 'Casa de apostas', text: 'Uma casa de apostas quer você como garoto-propaganda.', value: v,
          options: [opt('Aceitar (R$ ' + money(v) + ')', '30%: polêmica (Torcida −8 · Fama −6)'), opt('Recusar', 'Torcida +4 · Técnico +2')],
        };
      },
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.3) { bump(c, 'fans', -8); return { ok: false, text: 'A campanha pegou mal e virou debate na TV.', fx: { money: ev.value, fame: -6 } }; }
          return { ok: true, text: 'Comercial no ar e dinheiro na conta.', fx: { money: ev.value } };
        }
        bump(c, 'fans', 4); bump(c, 'coach', 2);
        return { ok: true, text: 'Você recusou e explicou o porquê. Muita gente aplaudiu.', fx: {} };
      },
    },
    {
      id: 'emprestimo', icon: '💵', ico: 'hand-coins', tone: 'blue', weight: 2, max: 1,
      when: c => c.money >= 200000,
      build: c => {
        const v = Math.round(c.money * 0.1 / 1000) * 1000;
        return {
          title: 'Um amigo pede dinheiro', text: 'Um amigo de infância pede um empréstimo para salvar o negócio da família.', value: v,
          options: [opt('Emprestar R$ ' + money(v), '50%: ele devolve (Fama +2) · 50%: o dinheiro não volta'), opt('Negar', 'Nada muda')],
        };
      },
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.5) return { ok: true, text: 'Um ano depois ele devolveu tudo, com um abraço.', fx: { fame: 2 } };
          return { ok: false, text: 'O negócio fechou e o dinheiro foi junto.', fx: { money: -ev.value } };
        }
        return { ok: true, text: 'Conversa difícil, mas a amizade continuou.', fx: {} };
      },
    },

    // ---------- mídia e torcida ----------
    {
      id: 'capa_game', icon: '🎮', ico: 'gamepad-2', tone: 'green', weight: 3, max: 1,
      when: c => S.ovr(c) >= 82 && c.wage > 0,
      build: c => ({
        title: 'Capa do videogame', text: 'O jogo de futebol mais vendido do mundo quer você na capa da nova edição.',
        options: [opt('Estampar a capa', 'Fama +18 · R$ ' + money(c.wage * 10) + ' · forma −3% (a "maldição da capa")'), opt('Recusar', 'Forma +3%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Seu rosto em milhões de consoles.', fx: { fame: 18, money: c.wage * 10, form: -0.03 } }
        : { ok: true, text: 'Nada de maldição por aqui.', fx: { form: 0.03 } }),
    },
    {
      id: 'comemoracao', icon: '🕺', ico: 'hand-metal', tone: 'blue', weight: 3, max: 1,
      when: c => c.pos !== 'GOL' && c.fame >= 15,
      build: () => ({
        title: 'Comemoração nova', text: 'Os amigos insistem: você precisa de uma comemoração própria.',
        options: [opt('Criar a sua marca', 'Fama +10 · 25%: vista como provocação (Técnico −4)'), opt('Comemorar com o grupo', 'Técnico +5')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.25) { bump(c, 'coach', -4); return { ok: false, text: 'O rival achou provocação e o jogo esquentou.', fx: { fame: 10 } }; }
          return { ok: true, text: 'As crianças já imitam a comemoração nas escolinhas.', fx: { fame: 10 } };
        }
        bump(c, 'coach', 5);
        return { ok: true, text: 'Abraço coletivo em todo gol.', fx: {} };
      },
    },
    {
      id: 'invasao', icon: '🧒', ico: 'person-standing', tone: 'red', weight: 2, max: 1,
      when: c => c.fame >= 40,
      build: () => ({
        title: 'Invasão de campo', text: 'Um menino invade o gramado no meio do jogo e corre para te abraçar.',
        options: [opt('Parar e abraçar o menino', 'Torcida +10 · Fama +10'), opt('Pedir para os seguranças', 'Técnico +3')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 10), { ok: true, text: 'O abraço virou a foto do ano.', fx: { fame: 10 } })
        : (bump(c, 'coach', 3), { ok: true, text: 'Você acenou e o jogo seguiu.', fx: {} })),
    },
    {
      id: 'critica', icon: '🗞️', ico: 'newspaper', tone: 'red', weight: 3, max: 2,
      when: c => c.fame >= 30,
      build: c => ({
        ...alt(c, 'critica', [
          ['Crítica pesada', 'Um comentarista famoso disse na TV que você é "o jogador mais superestimado do país".'],
          ['Coluna ácida', 'Um colunista escreveu que você "some nos jogos grandes".']]),
        options: [opt('Responder na entrevista', 'Fama +6 · 50%: Torcida +5 · 50%: Torcida −5'), opt('Responder em campo', 'Forma +5%')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.5) { bump(c, 'fans', 5); return { ok: true, text: 'A resposta foi afiada e a torcida adorou.', fx: { fame: 6 } }; }
          bump(c, 'fans', -5);
          return { ok: false, text: 'A resposta soou arrogante.', fx: { fame: 6 } };
        }
        return { ok: true, text: 'Dois gols no jogo seguinte e um silêncio no estúdio.', fx: { form: 0.05 } };
      },
    },
    {
      id: 'musica', icon: '🎵', ico: 'music', tone: 'green', weight: 2, max: 1,
      when: c => c.fame >= 35,
      build: () => ({
        title: 'Música com seu nome', text: 'Um cantor famoso lançou uma música com o seu nome e quer você no clipe.',
        options: [opt('Gravar o clipe', 'Fama +12 · Técnico −4'), opt('Só compartilhar', 'Fama +4 · Torcida +4')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', -4), { ok: true, text: 'O clipe passou de 50 milhões de visualizações.', fx: { fame: 12 } })
        : (bump(c, 'fans', 4), { ok: true, text: 'A arquibancada já canta o refrão.', fx: { fame: 4 } })),
    },
    {
      id: 'ofensas', icon: '🛑', ico: 'octagon-alert', tone: 'red', weight: 2, max: 1,
      when: c => !!c.club && c.fame >= 20,
      build: () => ({
        title: 'Ofensas da arquibancada', text: 'Parte da torcida adversária passa o jogo te ofendendo de forma criminosa.',
        options: [opt('Parar o jogo e denunciar', 'Fama +10 · Torcida +8'), opt('Seguir jogando', 'Forma −4%')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'fans', 8), { ok: true, text: 'O jogo parou, os agressores foram identificados e o país inteiro ficou do seu lado.', fx: { fame: 10 } })
        : { ok: false, text: 'Você seguiu, mas aquilo ficou na cabeça por semanas.', fx: { form: -0.04 } }),
    },
    {
      id: 'torcida_tecnico', icon: '📣', ico: 'thumbs-down', tone: 'red', weight: 3, max: 1,
      when: c => atClub(c) >= 1 && c.rel.coach >= 50,
      build: () => ({
        title: 'Fora, técnico!', text: 'Depois de três derrotas, a torcida grita contra o técnico. Os microfones procuram você.',
        options: [opt('Defender o técnico', 'Técnico +10 · Torcida −6'), opt('Dizer que o grupo precisa melhorar', 'Torcida +3')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? (bump(c, 'coach', 10), bump(c, 'fans', -6), { ok: true, text: 'O técnico ficou e nunca esqueceu o seu apoio.', fx: {} })
        : (bump(c, 'fans', 3), { ok: true, text: 'Resposta de líder, sem apontar dedo.', fx: {} })),
    },

    // ---------- saúde ----------
    {
      id: 'virose', icon: '🤒', ico: 'thermometer', tone: 'red', weight: 2, max: 2,
      when: c => !!c.club,
      build: () => ({
        title: 'Virose no elenco', text: 'Metade do time pegou uma virose na semana de jogo decisivo. Você acordou com febre.',
        options: [opt('Jogar mesmo assim', '50%: Técnico +4 · 50%: forma −6%'), opt('Ficar de repouso', '−4% de minutos')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.5) { bump(c, 'coach', 4); return { ok: true, text: 'Jogou no limite e ainda ajudou na vitória.', fx: {} }; }
          return { ok: false, text: 'A febre voltou e você demorou a se recuperar.', fx: { form: -0.06 } };
        }
        return { ok: true, text: 'Três dias de cama e voltou inteiro.', fx: { min: -0.04 } };
      },
    },
    {
      id: 'insonia', icon: '🌙', ico: 'moon', tone: 'red', weight: 2, max: 1,
      when: c => !!c.club,
      build: () => ({
        title: 'Noites mal dormidas', text: 'Jogos à noite, viagens e a cabeça a mil. Você não consegue dormir direito.',
        options: [opt('Especialista em sono (R$ 40 mil)', 'Forma +5%'), opt('Deixar para lá', '35%: forma −6%')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Rotina nova, quarto escuro e oito horas por noite.', fx: { money: -40000, form: 0.05 } };
        if (r() < 0.35) return { ok: false, text: 'O cansaço apareceu em campo.', fx: { form: -0.06 } };
        return { ok: true, text: 'Aos poucos o sono voltou sozinho.', fx: {} };
      },
    },
    {
      id: 'pubalgia', icon: '🩻', ico: 'stethoscope', tone: 'red', weight: 3, max: 1,
      when: c => c.age >= 24 && !!c.club,
      build: c => ({
        title: 'Pubalgia', text: 'Uma dor na virilha que não passa. O médico dá duas opções.',
        options: [opt('Operar agora', 'Perde 15% da temporada · volta sem dor (+1 ' + D.label(c.pos, 'fis') + ')'), opt('Tratar e ir jogando', '−5% de minutos · 35%: piora (perde 25% da temporada)')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) return { ok: true, text: 'Cirurgia bem-sucedida. Você voltou mais forte.', fx: { inj: 0.15, attr: { fis: 1 } } };
        if (r() < 0.35 - (has(c, 'pro') ? 0.1 : 0)) return { ok: false, text: 'A dor piorou e a cirurgia veio do mesmo jeito.', fx: { inj: 0.25 } };
        return { ok: true, text: 'Fisioterapia diária e a dor foi embora.', fx: { min: -0.05 } };
      },
    },

    // ---------- família e vida ----------
    {
      id: 'pai_empresario', icon: '👨‍👦', ico: 'users-round', tone: 'blue', weight: 3, max: 1,
      when: c => c.age <= 24 && !!c.club,
      build: () => ({
        title: 'Seu pai quer ser seu empresário', text: 'Seu pai largou o emprego e quer cuidar dos seus contratos.',
        options: [opt('Deixar ele cuidar', 'Forma +4% · Torcida +3 · 40%: negocia mal (salário −10%)'), opt('Manter um profissional', 'Nada muda')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'fans', 3);
          if (r() < 0.4) { c.wage = Math.round(c.wage * 0.9); return { ok: false, text: 'Ele aceitou a primeira proposta do clube. Salário menor, mas família unida.', fx: { form: 0.04 } }; }
          return { ok: true, text: 'Seu pai surpreendeu na mesa de negociação.', fx: { form: 0.04 } };
        }
        return { ok: true, text: 'Ele entendeu. Segue sendo seu maior torcedor.', fx: {} };
      },
    },
    {
      id: 'irmao', icon: '🧑‍🤝‍🧑', ico: 'users', tone: 'blue', weight: 2, max: 1,
      when: c => c.age >= 20 && !!c.club,
      build: () => ({
        title: 'Seu irmão também joga', text: 'Seu irmão mais novo sonha em ser jogador e pede uma ajuda.',
        options: [opt('Pedir um teste no seu clube', 'Técnico −4 · 40%: ele é aprovado (Fama +4 · Torcida +4)'), opt('Pagar uma escolinha boa', 'R$ 50 mil · forma +2%')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          bump(c, 'coach', -4);
          if (r() < 0.4) { bump(c, 'fans', 4); return { ok: true, text: 'Aprovado na base! A imprensa adorou a história dos irmãos.', fx: { fame: 4 } }; }
          return { ok: false, text: 'Não passou no teste, e o clima com o técnico ficou estranho.', fx: {} };
        }
        return { ok: true, text: 'Ele está evoluindo na escolinha. Você ficou tranquilo.', fx: { money: -50000, form: 0.02 } };
      },
    },
    {
      id: 'cachorro', icon: '🐶', ico: 'dog', tone: 'green', weight: 2, max: 1,
      when: c => !!c.club,
      build: () => ({
        title: 'Um vira-lata no CT', text: 'Um cachorro de rua apareceu no CT e não sai do seu lado no treino.',
        options: [opt('Adotar', 'Forma +3% · Fama +4'), opt('Levar para um abrigo', 'Nada muda')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Ele virou mascote do time e estrela das suas redes.', fx: { form: 0.03, fame: 4 } }
        : { ok: true, text: 'Foi adotado por uma família em uma semana.', fx: {} }),
    },

    // ---------- clube ----------
    {
      id: 'concentracao', icon: '🏨', ico: 'hotel', tone: 'blue', weight: 2, max: 1,
      when: c => atClub(c) >= 1,
      build: () => ({
        title: 'Concentração de três dias', text: 'O técnico novo quer o elenco concentrado três dias antes de cada jogo.',
        options: [opt('Aceitar', 'Técnico +6 · forma +2%'), opt('Reclamar com o grupo', '50%: ele cede (forma +4%) · 50%: Técnico −10')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', 6); return { ok: true, text: 'Hotel, videogame e foco total.', fx: { form: 0.02 } }; }
        if (r() < 0.5) return { ok: true, text: 'O técnico ouviu o grupo e liberou.', fx: { form: 0.04 } };
        bump(c, 'coach', -10);
        return { ok: false, text: 'Ele descobriu quem puxou a reclamação.', fx: {} };
      },
    },
    {
      id: 'pretemporada', icon: '✈️', ico: 'plane', tone: 'blue', weight: 3, max: 2,
      when: c => club(c).tier >= 3,
      build: c => ({
        ...alt(c, 'pretemporada', [
          ['Excursão de pré-temporada', 'O clube marcou seis amistosos nos Estados Unidos em duas semanas.'],
          ['Turnê pela Ásia', 'Amistosos caça-níquel na Ásia: calor, fuso e estádios lotados.']]),
        options: [opt('Jogar todos os amistosos', 'Fama +8 · forma −4%'), opt('Pedir para ser poupado', 'Forma +3% · Técnico −3')],
      }),
      resolve: (c, ev, i) => (i === 0
        ? { ok: true, text: 'Camisas esgotadas por onde passou. O corpo sentiu.', fx: { fame: 8, form: -0.04 } }
        : (bump(c, 'coach', -3), { ok: true, text: 'Você chegou inteiro para a estreia.', fx: { form: 0.03 } })),
    },
    {
      id: 'faixa', icon: '🎗️', ico: 'ribbon', tone: 'blue', weight: 5, max: 1,
      when: c => c.captain && !!last(c) && last(c).rating < 7.0,
      build: () => ({
        title: 'A faixa em jogo', text: 'Temporada ruim. Parte do elenco acha que a braçadeira pesa em você.',
        options: [opt('Entregar a faixa', 'Deixa de ser capitão · forma +5% · Técnico +4'), opt('Manter a faixa', '50%: Torcida +6, forma +3% · 50%: Torcida −8')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { c.captain = false; bump(c, 'coach', 4); return { ok: true, text: 'Sem o peso da faixa, você voltou a jogar solto.', fx: { form: 0.05 } }; }
        if (r() < 0.5 + (has(c, 'lider') ? 0.2 : 0)) { bump(c, 'fans', 6); return { ok: true, text: 'Você chamou a responsabilidade e o time reagiu.', fx: { form: 0.03 } }; }
        bump(c, 'fans', -8);
        return { ok: false, text: 'A cobrança aumentou a cada tropeço.', fx: {} };
      },
    },
    {
      id: 'rebaixamento', icon: '⬇️', ico: 'trending-down', tone: 'red', weight: 5, max: 2,
      when: c => { const l = last(c), cl = club(c), LD = cl && D.LADDER[cl.league]; return !!l && l.club === c.club && !!l.table && !!LD && !!LD.down && l.table.pos >= 14; },
      build: c => ({
        title: 'Luta contra a queda', text: D.O(club(c).name) + ' brigou contra o rebaixamento no ano passado e começa mal de novo.',
        options: [opt('Ficar e lutar', 'Torcida +12 · Técnico +6'), opt('Pedir para sair', 'Abre a janela no fim da temporada · Torcida −10')],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', 12); bump(c, 'coach', 6); return { ok: true, text: '"Não abandono o barco." A torcida estendeu uma faixa com o seu nome.', fx: {} }; }
        c.wantsOut = true; bump(c, 'fans', -10);
        return { ok: true, text: 'Seu empresário já busca outro clube.', fx: {} };
      },
    },
    {
      id: 'acesso_briga', icon: '⬆️', ico: 'trending-up', tone: 'blue', weight: 4, max: 2,
      when: c => { const l = last(c), cl = club(c), LD = cl && D.LADDER[cl.league]; return !!l && l.club === c.club && !!l.table && !!LD && !!LD.up && l.table.pos <= 8; },
      build: c => ({
        title: 'Sonho do acesso', text: D.O(club(c).name) + ' ficou perto de subir e aposta tudo nesta temporada. A reta final vai ser pesada.',
        options: [opt('Jogar todas no sacrifício', '60%: Torcida +10, forma +4% · 40%: lesão (perde 10% da temporada)'), opt('Seguir o rodízio da comissão', 'Técnico +4')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.6 + (has(c, 'pro') ? 0.1 : 0)) { bump(c, 'fans', 10); return { ok: true, text: 'Você jogou tudo e puxou o time na reta final.', fx: { form: 0.04 } }; }
          return { ok: false, text: 'O corpo cobrou a conta.', fx: { inj: 0.1 } };
        }
        bump(c, 'coach', 4);
        return { ok: true, text: 'Descanso na hora certa. Você chegou inteiro na reta final.', fx: {} };
      },
    },
    {
      id: 'saf', icon: '🏢', ico: 'building-2', tone: 'blue', weight: 2, max: 1,
      when: c => atClub(c) >= 1 && club(c).tier <= 4,
      build: c => ({
        title: 'O clube foi vendido', text: 'Um investidor estrangeiro comprou ' + D.o(club(c).name) + ' e promete revolucionar o futebol.',
        options: [opt('Apoiar o projeto', 'O clube fica mais forte · Torcida −4'), opt('Criticar em público', 'Torcida +8 · Técnico −6')],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { boost(c, 2); bump(c, 'fans', -4); return { ok: true, text: 'O dinheiro chegou e o elenco ganhou reforços.', fx: {} }; }
        bump(c, 'fans', 8); bump(c, 'coach', -6);
        return { ok: true, text: 'A torcida gostou. A nova diretoria, nem tanto.', fx: {} };
      },
    },
    {
      id: 'estadio', icon: '🏟️', tone: 'green', weight: 2, max: 1,
      when: c => atClub(c) >= 1 && c.pos !== 'GOL',
      build: c => ({
        title: 'Estádio novo', text: D.O(club(c).name) + ' inaugura o estádio novo. Pênalti para o time no primeiro tempo.',
        options: [opt('Pegar a bola', '70%: primeiro gol da história do estádio (Fama +10 · Torcida +8) · 30%: Torcida −4'), opt('Deixar para o cobrador', 'Técnico +3')],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.7 + (has(c, 'frieza') ? 0.1 : 0)) { bump(c, 'fans', 8); return { ok: true, text: 'Seu nome está na placa do primeiro gol do estádio.', fx: { fame: 10 } }; }
          bump(c, 'fans', -4);
          return { ok: false, text: 'Na trave. A festa ficou para o segundo tempo.', fx: {} };
        }
        bump(c, 'coach', 3);
        return { ok: true, text: 'O cobrador marcou e correu para te abraçar.', fx: {} };
      },
    },
    {
      id: 'olimpiada', icon: '🥇', ico: 'medal', tone: 'green', weight: 4, max: 1,
      when: c => c.age <= 23 && c.age >= 19 && S.ovr(c) >= 64,
      build: () => ({
        title: 'Convocado para as Olimpíadas', text: 'O clube não quer liberar, mas é a chance de uma medalha.',
        options: [opt('Ir às Olimpíadas', 'Técnico −8 · 35%: ouro (Fama +25) · senão Fama +10'), opt('Ficar no clube', 'Técnico +8 · +5% de minutos')],
      }),
      resolve: (c, ev, i, r) => {
        bump(c, 'coach', i === 0 ? -8 : 8);
        if (i === 1) return { ok: true, text: 'O clube agradeceu com mais minutos.', fx: { min: 0.05 } };
        if (r() < 0.35) return { ok: true, text: 'MEDALHA DE OURO! Você voltou com o ouro no peito.', fx: { fame: 25 } };
        return { ok: true, text: 'Sem medalha, mas o mundo conheceu seu futebol.', fx: { fame: 10 } };
      },
    },
  ];
  // Eventos que dependem de dados (ex.: rival) podem não montar: o sorteio pula os que devolvem null
  S.EVENT_DEFS.push(...MORE);

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
