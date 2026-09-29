// Eventos durante a temporada (escolhas com contexto)
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { bump, clamp, rngOf } = S._; // ajudantes do núcleo
  // ---------- eventos com contexto ----------
  // Cada evento só aparece quando faz sentido para a situação atual e mostra o que está em jogo
  // antes da escolha (hint). Efeitos: coach/fans (medidores), min/form/inj (esta temporada),
  // fame, wage (multiplica salário), move ('up' | 'down' | 'money'), renew, captain, swap.
  const last = c => c.seasons[c.seasons.length - 1] || null;
  const atClub = c => c.age - c.clubSince;

  // Evento que já aconteceu nesta carreira volta com outro texto de abertura: [título, texto]
  const alt = (c, id, opts) => opts[((c.evCount || {})[id] || 0) % opts.length];

  function pickClub(r, filter) {
    const pool = D.CLUBS.filter(filter);
    return pool.length ? r.pick(pool) : null;
  }

  S.EVENT_DEFS = [
    {
      id: 'banco', icon: '🪑', weight: 4,
      when: c => { const l = last(c); return l && l.club === c.club && l.games < 16; },
      build: (c, r) => {
        const cl = D.CLUB_BY_ID[c.club];
        const dest = pickClub(r, x => x.tier === Math.max(1, cl.tier - 1) && x.strength <= S.ovr(c));
        return {
          title: 'Sem espaço ' + D.no(cl.name),
          text: 'Você jogou pouco na última temporada.' + (dest ? ' ' + D.O(dest.name) + ' quer você emprestado como titular.' : ''),
          dest: dest && dest.id,
          options: dest ? [
            { label: 'Ir para ' + D.o(dest.name), hint: 'Titular num clube menor · Torcida atual −10' },
            { label: 'Brigar pela vaga', hint: '50%: vira titular (Técnico +20) · 50%: segue no banco' },
          ] : [
            { label: 'Brigar pela vaga', hint: '50%: vira titular (Técnico +20) · 50%: segue no banco' },
            { label: 'Aceitar o banco', hint: 'Técnico +5 · poucos minutos de novo' },
          ],
        };
      },
      resolve: (c, ev, i, r) => {
        const fight = ev.dest ? i === 1 : i === 0;
        if (ev.dest && i === 0) { bump(c, 'fans', -10); return { ok: true, text: 'Você foi para ' + D.o(D.CLUB_BY_ID[ev.dest].name) + ' para ser titular.', fx: { move: ev.dest } }; }
        if (fight) {
          const p = 0.5 + (c.traits.includes('raca') ? 0.15 : 0) + (c.traits.includes('pro') ? 0.1 : 0);
          if (r() < p) { bump(c, 'coach', 20); return { ok: true, text: 'Treinou como nunca e ganhou a posição.', fx: { min: 0.25 } }; }
          bump(c, 'coach', -5);
          return { ok: false, text: 'O técnico não mudou de ideia. Mais uma temporada no banco.', fx: {} };
        }
        bump(c, 'coach', 5);
        return { ok: true, text: 'O técnico gostou da postura, mas os minutos continuam escassos.', fx: {} };
      },
    },
    {
      id: 'assedio', icon: '📞', weight: 5,
      when: c => { const l = last(c); return l && l.rating >= 7.3 && D.CLUB_BY_ID[c.club].tier < 5; },
      build: (c, r) => {
        const cl = D.CLUB_BY_ID[c.club];
        const dest = pickClub(r, x => x.tier === cl.tier + 1) || pickClub(r, x => x.tier > cl.tier);
        return {
          title: D.O(dest.name) + ' quer você agora',
          text: 'Depois da sua grande temporada, um clube maior faz proposta antes da janela. ' + D.O(cl.name) + ' tenta te segurar.',
          dest: dest.id,
          options: [
            { label: 'Ir para ' + D.o(dest.name), hint: 'Clube maior já · Torcida ' + D.do(cl.name) + ' te chama de traidor' },
            { label: 'Ficar e renovar', hint: 'Torcida +20 · salário +30%' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', -30); return { ok: true, text: 'Negócio fechado. A torcida antiga queimou sua camisa, mas você subiu de patamar.', fx: { move: ev.dest, fame: 8 } }; }
        bump(c, 'fans', 20);
        c.wage = Math.round(c.wage * 1.3);
        return { ok: true, text: 'Você ficou e virou símbolo de lealdade. Contrato renovado com aumento.', fx: {} };
      },
    },
    {
      id: 'funcao', icon: '🔄', weight: 3,
      when: c => atClub(c) >= 1 && ['ATA', 'MEI'].includes(c.pos),
      build: c => {
        const other = c.pos === 'ATA' ? 'meia armador' : 'falso 9';
        return {
          title: 'Técnico novo, função nova',
          text: 'O novo técnico ' + D.do(D.CLUB_BY_ID[c.club].name) + ' quer te usar como ' + other + ' nesta temporada.',
          options: [
            { label: 'Aceitar a função', hint: 'Técnico +15 · ' + (c.pos === 'ATA' ? '−20% gols, +40% assistências' : '+40% gols, −20% assistências') },
            { label: 'Recusar', hint: 'Técnico −20 · pode perder espaço' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) {
          bump(c, 'coach', 15);
          return { ok: true, text: 'Você se adaptou à função e o técnico confia em você.', fx: c.pos === 'ATA' ? { goalMul: -0.2, assistMul: 0.4 } : { goalMul: 0.4, assistMul: -0.2 } };
        }
        bump(c, 'coach', -20);
        return { ok: false, text: 'O técnico não gostou. Vai ter que provar em campo.', fx: { min: -0.1 } };
      },
    },
    {
      id: 'arabia', icon: '🛢️', weight: 3,
      when: c => c.age >= 28 && S.ovr(c) >= 72 && !D.MONEY.includes(D.CLUB_BY_ID[c.club].league),
      build: (c, r) => {
        const dest = pickClub(r, x => D.MONEY.includes(x.league));
        // Milionária de verdade: sempre bem acima do que você já ganha
        const w = Math.round(Math.max(S.wage(c, dest) * 1.5, c.wage * 2.5) / 1000) * 1000;
        return {
          title: 'Proposta milionária ' + D.do(dest.name),
          text: 'Oferecem R$ ' + fmtMoney(w) + ' por semana, ' + (c.wage ? String(Math.round(w / c.wage * 10) / 10).replace('.', ',') + 'x o que você ganha hoje (R$ ' + fmtMoney(c.wage) + ')' : 'uma fortuna') + '.',
          dest: dest.id, wage: w,
          options: [
            { label: 'Aceitar a fortuna', hint: 'Salário gigante · adeus à Bola de Ouro e às grandes taças' },
            { label: 'Recusar', hint: 'Torcida +15 · segue no futebol de ponta' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Você virou estrela ' + D.do(D.CLUB_BY_ID[ev.dest].name) + ' e a conta bancária agradece.', fx: { move: ev.dest, wageSet: ev.wage } };
        bump(c, 'fans', 15);
        return { ok: true, text: 'Você recusou a fortuna. A torcida fez faixa em sua homenagem.', fx: {} };
      },
    },
    {
      id: 'renovar', icon: '✍️', weight: 3,
      when: c => c.age >= 22 && c.age <= 31 && c.rel.coach >= 55 && atClub(c) >= 2 && c.contract <= 2,
      build: c => ({
        title: 'Renovação ' + D.no(D.CLUB_BY_ID[c.club].name),
        text: 'O clube quer blindar você com um contrato de 5 anos.',
        options: [
          { label: 'Renovar por mais 3 anos', hint: 'Salário +40% · Torcida +10 · contrato mais longo' },
          { label: 'Só com cláusula de saída', hint: 'Mercado aberto · Técnico −5' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { c.wage = Math.round(c.wage * 1.4); bump(c, 'fans', 10); c.contract += 3; return { ok: true, text: 'Contrato longo assinado. Você é parte do projeto.', fx: {} }; }
        bump(c, 'coach', -5);
        return { ok: true, text: 'Renovou com cláusula. Se aparecer algo melhor, dá para sair.', fx: {} };
      },
    },
    {
      id: 'capitao', icon: '©️', weight: 4,
      when: c => !c.captain && c.rel.fans >= 60 && c.rel.coach >= 60 && atClub(c) >= (c.traits.includes('lider') ? 1 : 3), // Líder vira capitão mais cedo
      build: c => ({
        title: 'A braçadeira é sua?',
        text: 'O técnico ' + D.do(D.CLUB_BY_ID[c.club].name) + ' quer que você seja o capitão.',
        options: [
          { label: 'Aceitar a faixa', hint: '+8% de títulos neste clube · temporada ruim derruba a Torcida' },
          { label: 'Recusar', hint: 'Sem pressão extra' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { c.captain = true; bump(c, 'fans', 5); return { ok: true, text: 'Capitão ' + D.do(D.CLUB_BY_ID[c.club].name) + '. Agora a cobrança é maior.', fx: {} }; }
        return { ok: true, text: 'Você preferiu focar só no seu jogo.', fx: {} };
      },
    },
    {
      id: 'classico', icon: '🤕', weight: 2,
      when: () => true,
      build: c => ({
        ...(([title, text]) => ({ title, text }))(alt(c, 'classico', [
          ['Clássico no sacrifício', 'Dor na coxa e clássico no domingo. O técnico deixa você decidir.'],
          ['O tornozelo de novo', 'Tornozelo inchado na semana do clássico. O médico torce o nariz; o técnico olha para você.'],
          ['Infiltração?', 'Clássico decisivo e o joelho reclamando. O médico oferece uma infiltração para você jogar.']])),
        options: [
          { label: 'Jogar no sacrifício', hint: (c.traits.includes('raca') ? '75%' : '55%') + ': herói (Torcida +15) · senão, lesão longa' },
          { label: 'Poupar', hint: 'Torcida −5 · volta inteiro' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < (c.traits.includes('raca') ? 0.75 : 0.55)) { bump(c, 'fans', 15); return { ok: true, text: 'Você decidiu o clássico mancando. Herói!', fx: { fame: 16 } }; }
          return { ok: false, text: 'A lesão piorou. Meses fora.', fx: { inj: 0.35 } };
        }
        bump(c, 'fans', -5);
        return { ok: true, text: 'A torcida reclamou, mas você voltou inteiro.', fx: {} };
      },
    },
    {
      id: 'festa', icon: '🎉', weight: 2,
      when: c => c.age <= 30,
      build: c => ({
        ...(([title, text]) => ({ title, text }))(alt(c, 'festa', [
          ['Festa na véspera do jogo', 'Aniversário do parça, todo mundo vai estar lá.'],
          ['Convite para a balada', 'Um cantor famoso chamou você para o camarote. O jogo é amanhã às 16h.'],
          ['Churrasco que vira festa', 'O churrasco da família virou festão. Já passa da meia-noite e tem jogo amanhã.']])),
        options: [
          { label: 'Ir na festa', hint: 'Fama +12 (propostas e salário) · ' + '55%' + ': flagrado (Técnico −20)' },
          { label: 'Ficar em casa', hint: 'Técnico +5' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.55) { bump(c, 'coach', -20); return { ok: false, text: 'Foi flagrado de madrugada. O técnico te deixou no banco.', fx: { fame: 6, min: -0.1 } }; }
          return { ok: true, text: 'Curtiu, bombou nas redes e ainda jogou bem no dia seguinte.', fx: { fame: 12 } };
        }
        bump(c, 'coach', 5);
        return { ok: true, text: 'Descansou. O técnico notou a maturidade.', fx: {} };
      },
    },
    {
      id: 'sub20', icon: '🟡', weight: 4,
      when: c => c.age <= 20 && S.ovr(c) >= 55,
      build: () => ({
        title: 'Convocado para a seleção sub-20',
        text: 'O torneio coincide com jogos importantes do clube.',
        options: [
          { label: 'Ir para a seleção', hint: 'Fama +16 · Técnico −10 pelo desfalque' },
          { label: 'Ficar no clube', hint: 'Técnico +10 · mais minutos' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'coach', -10); return { ok: true, text: 'Brilhou na seleção e o país inteiro conheceu seu nome.', fx: { fame: 16 } }; }
        bump(c, 'coach', 10);
        return { ok: true, text: 'O clube valorizou sua escolha.', fx: { min: 0.1 } };
      },
    },
    {
      id: 'protesto', icon: '📢', weight: 6,
      when: c => c.rel.fans < 32,
      build: c => ({
        title: 'Protesto no CT',
        text: 'A torcida ' + D.do(D.CLUB_BY_ID[c.club].name) + ' foi cobrar você no treino.',
        options: [
          { label: 'Encarar e conversar', hint: '65%: Torcida +20 · senão, Torcida −10' },
          { label: 'Pedir para sair', hint: 'Abre a janela de transferências no fim da temporada · Torcida −10' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.65 + (c.traits.includes('lider') ? 0.15 : 0)) { bump(c, 'fans', 20); return { ok: true, text: 'A conversa virou o jogo. A torcida voltou a cantar seu nome.', fx: {} }; }
          bump(c, 'fans', -10);
          return { ok: false, text: 'A conversa azedou e virou vídeo nas redes.', fx: { form: -0.05 } };
        }
        bump(c, 'fans', -10);
        c.wantsOut = true;
        return { ok: true, text: 'Seu empresário já está ligando para outros clubes.', fx: {} };
      },
    },
    {
      id: 'tecnico', icon: '🧑‍🏫', weight: 3, max: 3,
      when: c => atClub(c) >= 1 && ['ATA', 'MEI'].includes(c.pos),
      build: c => ({
        title: 'Técnico novo, esquema novo',
        text: D.O(D.CLUB_BY_ID[c.club].name) + ' trocou de técnico. Ele quer você jogando aberto pela ponta.',
        options: [
          { label: 'Topar jogar pela ponta', hint: 'Assistências +20% · gols −10% · Técnico +10' },
          { label: 'Exigir sua posição', hint: '60%: ele cede (gols +10%) · 40%: vai para o banco (Técnico −15)' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'coach', 10); return { ok: true, text: 'Você virou peça-chave do novo esquema.', fx: { assistMul: 0.2, goalMul: -0.1 } }; }
        if (r() < 0.6) return { ok: true, text: 'O técnico entendeu e montou o time em volta de você.', fx: { goalMul: 0.1 } };
        bump(c, 'coach', -15);
        return { ok: false, text: 'Ele não gostou nada. Você começa a temporada no banco.', fx: { min: -0.15 } };
      },
    },
    {
      id: 'mentor', icon: '🧓', weight: 4, max: 1,
      when: c => c.age <= 20 && !!c.club,
      build: c => {
        const k = { ATA: 'fin', MEI: 'pas', ZAG: 'def', GOL: 'fin' }[c.pos]; // atributo principal da posição
        return {
          title: 'Um veterano quer te ensinar',
          text: 'O jogador mais experiente do elenco se ofereceu para treinar com você depois dos treinos.',
          attr: k,
          options: [
            { label: 'Aceitar os treinos extras', hint: '+2 ' + D.label(c.pos, k) + ' para sempre · Técnico +5' },
            { label: 'Aproveitar a folga', hint: 'Forma +5% · Fama +6' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'coach', 5); return { ok: true, text: 'Meses de treino fino. Dá para ver a diferença no seu jogo.', fx: { attr: { [ev.attr]: 2 } } }; }
        return { ok: true, text: 'Você chegou descansado para a temporada.', fx: { form: 0.05, fame: 6 } };
      },
    },
    {
      id: 'patrocinio', icon: '👟', weight: 3, max: 3,
      when: c => c.fame >= 40 && c.wage > 0,
      build: c => {
        const value = Math.round(c.wage * 52 * 0.6 / 1000) * 1000;
        return {
          ...(([title, text]) => ({ title, text }))(alt(c, 'patrocinio', [
            ['Proposta de patrocínio', 'Uma marca esportiva quer você como garoto-propaganda.'],
            ['Campanha na TV', 'Uma marca de refrigerante quer você no comercial do intervalo da novela.'],
            ['Chuteira com seu nome', 'Uma fabricante quer lançar uma linha de chuteiras com o seu nome.']])),
          value,
          options: [
            { label: 'Assinar o contrato', hint: '+R$ ' + fmtMoney(value) + ' · agenda cheia: forma −5%' },
            { label: 'Recusar e focar no futebol', hint: 'Forma +5% · Técnico +5' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Seu rosto está em todos os outdoors da cidade.', fx: { money: ev.value, fame: 8, form: -0.05 } };
        bump(c, 'coach', 5);
        return { ok: true, text: 'O técnico elogiou o foco em entrevista.', fx: { form: 0.05 } };
      },
    },
    {
      id: 'redes', icon: '📱', weight: 3, max: 2,
      when: c => c.age <= 27 && c.fame >= 20,
      build: c => ({
        ...(([title, text]) => ({ title, text }))(alt(c, 'redes', [
          ['Polêmica nas redes', 'Um vídeo seu provocando a torcida rival viralizou.'],
          ['Print vazado', 'Uma conversa sua reclamando do técnico vazou e está em todo lugar.']])),
        options: [
          { label: 'Pedir desculpas', hint: 'Torcida +5 · Fama −4' },
          { label: 'Dobrar a aposta', hint: 'Fama +16 · Torcida −8 · 30%: Técnico −10' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'fans', 5); return { ok: true, text: 'O pedido de desculpas pegou bem.', fx: { fame: -4 } }; }
        bump(c, 'fans', -8);
        if (r() < 0.3) { bump(c, 'coach', -10); return { ok: false, text: 'Viralizou de novo, e o técnico te chamou para uma conversa.', fx: { fame: 16 } }; }
        return { ok: true, text: 'Virou meme. Todo mundo está falando de você.', fx: { fame: 16 } };
      },
    },
    {
      id: 'joelho', icon: '🦵', weight: 3, max: 3,
      when: c => c.age >= 28,
      build: () => ({
        title: 'Dor no joelho',
        text: 'O joelho reclamou na pré-temporada. O departamento médico sugere cautela.',
        options: [
          { label: 'Jogar assim mesmo', hint: 'Minutos normais · 40%: lesão (perde 30% da temporada)' },
          { label: 'Tratar com calma', hint: 'Perde o começo (−10% de minutos) · sem risco' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < (c.traits.includes('pro') ? 0.25 : 0.4)) return { ok: false, text: 'O joelho não aguentou. Meses de recuperação.', fx: { inj: 0.3 } };
          return { ok: true, text: 'Aguentou firme. Ninguém percebeu nada.', fx: {} };
        }
        return { ok: true, text: 'Voltou inteiro depois de algumas semanas.', fx: { min: -0.1 } };
      },
    },
    {
      id: 'faltas', icon: '🎯', weight: 3, max: 2,
      when: c => !!c.club && c.age <= 31 && c.pos !== 'GOL',
      build: c => ({
        ...(([title, text]) => ({ title, text }))(alt(c, 'faltas', [
          ['Treino de faltas', 'O preparador propõe uma semana inteira batendo faltas depois do treino.'],
          ['Aula com o ídolo', 'Um ex-craque famoso por bater faltas se oferece para treinar com você depois do treino.']])),
        options: [
          { label: 'Topar', hint: '+2 FIN para sempre · cansaço: forma −3%' },
          { label: 'Descansar', hint: 'Forma +5%' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Centenas de cobranças depois, a bola começou a obedecer.', fx: { attr: { fin: 2 }, form: -0.03 } };
        return { ok: true, text: 'Corpo descansado para a temporada.', fx: { form: 0.05 } };
      },
    },
    {
      id: 'caridade', icon: '💚', weight: 2, max: 2,
      when: c => c.fame >= 30 && c.money >= 200000,
      build: c => {
        const value = Math.max(100000, Math.round(c.money * 0.1 / 1000) * 1000);
        return {
          ...(([title, text]) => ({ title, text }))(alt(c, 'caridade', [
            ['Projeto na sua cidade', 'Uma escolinha de futebol da sua cidade natal pede ajuda para não fechar.'],
            ['Campo do bairro', 'O campinho onde você começou vai virar estacionamento. A comunidade pede ajuda.']])),
          value,
          options: [
            { label: 'Doar R$ ' + fmtMoney(value), hint: 'Torcida +10 · Fama +12' },
            { label: 'Agora não', hint: 'Nada muda' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', 10); return { ok: true, text: 'A escolinha agora leva o seu nome.', fx: { money: -ev.value, fame: 12 } }; }
        return { ok: true, text: 'Fica para a próxima.', fx: {} };
      },
    },
    {
      id: 'reencontro', icon: '🔙', weight: 5, max: 3,
      when: c => {
        const prev = c.spells.length >= 2 ? c.spells[c.spells.length - 2] : null;
        return !!prev && atClub(c) <= 1 && (c.fansBy[prev.club] || 0) >= 65 && D.CLUB_BY_ID[prev.club].league === D.CLUB_BY_ID[c.club].league;
      },
      build: c => {
        const prev = D.CLUB_BY_ID[c.spells[c.spells.length - 2].club];
        return {
          title: 'Reencontro com ' + D.o(prev.name),
          text: 'Primeiro jogo contra seu ex-clube, onde a torcida te idolatrava.',
          prev: prev.id,
          options: [
            { label: 'Não comemorar se marcar', hint: 'A torcida antiga te aplaude · Fama +8' },
            { label: 'Comemorar na cara deles', hint: 'Torcida atual +10 · a antiga vira contra você' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Você marcou e ergueu as mãos. O estádio inteiro aplaudiu.', fx: { fame: 8 } };
        bump(c, 'fans', 10);
        c.fansBy[ev.prev] = Math.max(0, (c.fansBy[ev.prev] || 0) - 40);
        return { ok: true, text: 'A comemoração virou capa de jornal. Os antigos fãs não perdoaram.', fx: { fame: 6 } };
      },
    },
  ];
  const EVENT_BY_ID = {};
  S.EVENT_DEFS.forEach(e => { EVENT_BY_ID[e.id] = e; });

  function fmtMoney(v) { return v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1e3) + ' mil'; }

  // Sorteia um evento que faça sentido agora (ou nenhum). Não repete os das 2 últimas temporadas.
  S.pickEvent = function (c) {
    const { r, save } = rngOf(c);
    const recent = c.seasons.slice(-2).map(s => s.event).filter(Boolean);
    // Alguns eventos têm limite por carreira (max)
    const seen = c.evCount || {};
    const pool = S.EVENT_DEFS.filter(e => !recent.includes(e.id) && (seen[e.id] || 0) < (e.max || 99) && e.when(c));
    // Eventos de contexto (peso alto) quase sempre aparecem; os genéricos, às vezes.
    const total = pool.reduce((a, e) => a + e.weight, 0);
    if (!pool.length || r() > Math.min(0.78, 0.2 + total * 0.05)) { save(); return null; }
    let x = r() * total, def = pool[0];
    for (const e of pool) { x -= e.weight; if (x < 0) { def = e; break; } }
    const ev = Object.assign({ id: def.id, icon: def.icon }, def.build(c, r));
    save();
    return ev;
  };

  // Proposta que vem num evento (a mesma que a tela mostra antes de aceitar)
  const EV_KIND = { banco: 'mid', assedio: 'up', arabia: 'money' };
  S.eventOffer = (c, ev) => (ev.dest ? S.offerFor(c, ev.dest, EV_KIND[ev.id] || 'up', ev.wage) : null);

  S.resolveEvent = function (c, ev, idx) {
    const { r, save } = rngOf(c);
    const out = EVENT_BY_ID[ev.id].resolve(c, ev, idx, r);
    save();
    const fx = out.fx || {};
    if (fx.min) c.mod.min += fx.min;
    if (fx.form) c.mod.form += fx.form;
    if (fx.inj) c.mod.inj = Math.max(c.mod.inj, fx.inj);
    if (fx.goalMul) c.mod.goal += fx.goalMul;
    if (fx.assistMul) c.mod.assist += fx.assistMul;
    if (fx.fame) c.fame = Math.max(0, c.fame + fx.fame);
    if (fx.money) c.money = Math.max(0, c.money + fx.money);
    if (fx.attr) for (const k in fx.attr) c.attrs[k] = clamp(c.attrs[k] + fx.attr[k], 20, 99);
    if (fx.move) S.join(c, S.eventOffer(c, ev));
    c.lastEvent = ev.id;
    c.evCount = c.evCount || {};
    c.evCount[ev.id] = (c.evCount[ev.id] || 0) + 1;
    return out;
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
