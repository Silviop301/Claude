// Motor do CRAQUE: carreira, temporada, propostas, eventos e card final.
// Sem DOM: roda no navegador e no Node (para a simulação de ritmo).
(function (root) {
  const D = root.CRAQUE_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
  const S = {};

  // ---------- aleatoriedade com semente (permite "carreira do dia" no futuro) ----------
  S.rng = function (seed) {
    let a = seed >>> 0;
    const r = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    r.poisson = l => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= r(); } while (p > L); return k - 1; };
    r.state = () => a;
    return r;
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round1 = v => Math.round(v * 10) / 10;

  // ---------- jogador ----------
  S.ovr = function (c) {
    const w = D.POS[c.pos].w;
    let o = 0;
    for (const k in w) o += c.attrs[k] * w[k];
    return Math.round(o);
  };

  S.newCareer = function (opts, seed) {
    const r = S.rng(seed || (Date.now() ^ 0x5EED));
    const base = r.int(44, 52);
    const attrs = {};
    ['fin', 'pas', 'dri', 'fis', 'men'].forEach(k => { attrs[k] = clamp(base + r.int(-6, 6), 30, 70); });
    // Atributos principais da posição começam um pouco maiores
    if (opts.pos === 'ATA') { attrs.fin += 4; attrs.dri += 2; } else { attrs.pas += 4; attrs.dri += 2; }
    return {
      v: 1, seed: r.state(),
      name: opts.name, pos: opts.pos, foot: opts.foot, country: opts.country,
      age: 16, season: 0, attrs,
      pot: Math.round(63 + 26 * Math.pow(r(), 1.5)), // potencial escondido; temporadas muito boas elevam o teto
      traits: [], club: null, clubSince: 0, firstClub: null,
      fame: 0, money: 0, wage: 0,
      mod: { min: 0, form: 0, inj: 0, goal: 0, assist: 0 },
      rel: { coach: 50, fans: 50 }, fansBy: {}, captain: false, renew: 0, wantsOut: false,
      totals: { games: 0, goals: 0, assists: 0, league: 0, cup: 0, cont: 0, ballon: 0, scorer: 0, young: 0, team: 0 },
      spells: [], seasons: [], peak: 0, retired: false, trophies: {},
    };
  };

  const rngOf = c => {
    const r = S.rng(c.seed);
    return { r, save: () => { c.seed = r.state(); } };
  };

  // ---------- características e sinergias ----------
  S.synergies = function (c) {
    return D.SYNERGIES.filter(s => c.traits.includes(s.a) && c.traits.includes(s.b));
  };

  S.fx = function (c) {
    const f = { goal: 0, assist: 0, title: 0, inj: 0, decl: 0, fame: 0, rating: 0 };
    const add = fx => { for (const k in fx) if (k in f) f[k] += fx[k]; };
    c.traits.forEach(id => {
      const t = D.TRAIT_BY_ID[id].fx;
      add(t);
      if (t.goalATA && c.pos === 'ATA') f.goal += t.goalATA;
    });
    S.synergies(c).forEach(s => add(s.fx));
    return f;
  };

  // 3 características sorteadas; se houver par de sinergia possível, uma delas tende a completar o par.
  S.traitChoices = function (c) {
    const { r, save } = rngOf(c);
    const pool = D.TRAITS.filter(t => !c.traits.includes(t.id));
    const out = [];
    const partners = D.SYNERGIES
      .filter(s => c.traits.includes(s.a) !== c.traits.includes(s.b))
      .map(s => (c.traits.includes(s.a) ? s.b : s.a));
    if (partners.length && r() < 0.6) {
      const id = r.pick(partners);
      out.push(D.TRAIT_BY_ID[id]);
    }
    while (out.length < 3 && out.length < pool.length) {
      const t = r.pick(pool);
      if (!out.includes(t)) out.push(t);
    }
    save();
    return out.map(t => ({ trait: t, completes: D.SYNERGIES.find(s => (s.a === t.id && c.traits.includes(s.b)) || (s.b === t.id && c.traits.includes(s.a))) || null }));
  };

  S.addTrait = function (c, id) {
    if (c.traits.includes(id)) return null;
    c.traits.push(id);
    const t = D.TRAIT_BY_ID[id];
    if (t.fx.attr) for (const k in t.fx.attr) c.attrs[k] = clamp(c.attrs[k] + t.fx.attr[k], 20, 99);
    const syn = D.SYNERGIES.find(s => (s.a === id && c.traits.includes(s.b)) || (s.b === id && c.traits.includes(s.a)));
    return syn || null;
  };

  // ---------- papel no elenco ----------
  S.role = function (c, club) {
    const diff = S.ovr(c) - club.strength;
    if (diff >= 5) return { id: 'abs', name: 'Titular absoluto', share: 0.92 };
    if (diff >= 1) return { id: 'tit', name: 'Titular', share: 0.78 };
    if (diff >= -3) return { id: 'rod', name: 'Rodízio', share: 0.55 };
    if (diff >= -7) return { id: 'res', name: 'Reserva', share: 0.3 };
    return { id: 'banco', name: 'Banco', share: 0.12 };
  };

  S.wage = function (c, club) {
    const lg = D.LEAGUE_BY_ID[club.league];
    const base = D.TIERS[club.tier].wage * (lg.wageMult || 1);
    const k = clamp(1 + (S.ovr(c) - club.strength) / 20 + c.fame / 400, 0.4, 3);
    return Math.round(base * k / 100) * 100;
  };

  // ---------- relação com clube: Técnico e Torcida (0-100) ----------
  const REL0 = 50;
  S.relLabel = v => (v >= 80 ? 'Idolatria' : v >= 62 ? 'Em alta' : v >= 40 ? 'Neutra' : v >= 25 ? 'Em baixa' : 'Crise');
  function bump(c, key, v) { c.rel[key] = clamp(c.rel[key] + v, 0, 100); }

  // ---------- eventos com contexto ----------
  // Cada evento só aparece quando faz sentido para a situação atual e mostra o que está em jogo
  // antes da escolha (hint). Efeitos: coach/fans (medidores), min/form/inj (esta temporada),
  // fame, wage (multiplica salário), move ('up' | 'down' | 'money'), renew, captain, swap.
  const last = c => c.seasons[c.seasons.length - 1] || null;
  const atClub = c => c.age - c.clubSince;

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
          title: 'Sem espaço no ' + cl.name,
          text: 'Você jogou pouco na última temporada.' + (dest ? ' O ' + dest.name + ' quer você emprestado como titular.' : ''),
          dest: dest && dest.id,
          options: dest ? [
            { label: 'Ir para o ' + dest.name, hint: 'Titular num clube menor · Torcida atual −10' },
            { label: 'Brigar pela vaga', hint: '50%: vira titular (Técnico +20) · 50%: segue no banco' },
          ] : [
            { label: 'Brigar pela vaga', hint: '50%: vira titular (Técnico +20) · 50%: segue no banco' },
            { label: 'Aceitar o banco', hint: 'Técnico +5 · poucos minutos de novo' },
          ],
        };
      },
      resolve: (c, ev, i, r) => {
        const fight = ev.dest ? i === 1 : i === 0;
        if (ev.dest && i === 0) { bump(c, 'fans', -10); return { ok: true, text: 'Você foi para o ' + D.CLUB_BY_ID[ev.dest].name + ' para ser titular.', fx: { move: ev.dest } }; }
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
          title: 'O ' + dest.name + ' quer você agora',
          text: 'Depois da sua grande temporada, um clube maior faz proposta antes da janela. O ' + cl.name + ' tenta te segurar.',
          dest: dest.id,
          options: [
            { label: 'Ir para o ' + dest.name, hint: 'Clube maior já · Torcida do ' + cl.name + ' te chama de traidor' },
            { label: 'Ficar e renovar', hint: 'Torcida +20 · salário +30%' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', -30); return { ok: true, text: 'Negócio fechado. A torcida antiga queimou sua camisa, mas você subiu de patamar.', fx: { move: ev.dest, fame: 4 } }; }
        bump(c, 'fans', 20);
        c.wage = Math.round(c.wage * 1.3);
        return { ok: true, text: 'Você ficou e virou símbolo de lealdade. Contrato renovado com aumento.', fx: {} };
      },
    },
    {
      id: 'funcao', icon: '🔄', weight: 3,
      when: c => atClub(c) >= 1,
      build: c => {
        const other = c.pos === 'ATA' ? 'meia armador' : 'falso 9';
        return {
          title: 'Técnico novo, função nova',
          text: 'O novo técnico do ' + D.CLUB_BY_ID[c.club].name + ' quer te usar como ' + other + ' nesta temporada.',
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
      when: c => c.age >= 28 && S.ovr(c) >= 72 && !['ara', 'usa'].includes(D.CLUB_BY_ID[c.club].league),
      build: (c, r) => {
        const dest = pickClub(r, x => ['ara', 'usa'].includes(x.league));
        const w = S.wage(c, dest) * 1.5;
        return {
          title: 'Proposta milionária do ' + dest.name,
          text: 'Oferecem R$ ' + fmtMoney(w) + ' por semana. É mais que você ganharia no resto da carreira na Europa.',
          dest: dest.id, wage: w,
          options: [
            { label: 'Aceitar a fortuna', hint: 'Salário gigante · adeus à Bola de Ouro e às grandes taças' },
            { label: 'Recusar', hint: 'Torcida +15 · segue no futebol de ponta' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Você virou estrela do ' + D.CLUB_BY_ID[ev.dest].name + ' e a conta bancária agradece.', fx: { move: ev.dest, wageSet: ev.wage } };
        bump(c, 'fans', 15);
        return { ok: true, text: 'Você recusou a fortuna. A torcida fez faixa em sua homenagem.', fx: {} };
      },
    },
    {
      id: 'renovar', icon: '✍️', weight: 3,
      when: c => c.age >= 22 && c.age <= 31 && c.rel.coach >= 55 && atClub(c) >= 2 && !c.renew,
      build: c => ({
        title: 'Renovação no ' + D.CLUB_BY_ID[c.club].name,
        text: 'O clube quer blindar você com um contrato de 5 anos.',
        options: [
          { label: 'Renovar por 5 anos', hint: 'Salário +40% · Torcida +10 · menos propostas nas próximas 2 janelas' },
          { label: 'Só com cláusula de saída', hint: 'Mercado aberto · Técnico −5' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { c.wage = Math.round(c.wage * 1.4); bump(c, 'fans', 10); c.renew = 2; return { ok: true, text: 'Contrato longo assinado. Você é parte do projeto.', fx: {} }; }
        bump(c, 'coach', -5);
        return { ok: true, text: 'Renovou com cláusula. Se aparecer algo melhor, dá para sair.', fx: {} };
      },
    },
    {
      id: 'capitao', icon: '©️', weight: 4,
      when: c => !c.captain && c.rel.fans >= 60 && c.rel.coach >= 60 && atClub(c) >= 3,
      build: c => ({
        title: 'A braçadeira é sua?',
        text: 'O técnico do ' + D.CLUB_BY_ID[c.club].name + ' quer que você seja o capitão.',
        options: [
          { label: 'Aceitar a faixa', hint: '+8% de títulos neste clube · temporada ruim derruba a Torcida' },
          { label: 'Recusar', hint: 'Sem pressão extra' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { c.captain = true; bump(c, 'fans', 5); return { ok: true, text: 'Capitão do ' + D.CLUB_BY_ID[c.club].name + '. Agora a cobrança é maior.', fx: {} }; }
        return { ok: true, text: 'Você preferiu focar só no seu jogo.', fx: {} };
      },
    },
    {
      id: 'classico', icon: '🤕', weight: 2,
      when: () => true,
      build: c => ({
        title: 'Clássico no sacrifício',
        text: 'Dor na coxa e clássico no domingo. O técnico deixa você decidir.',
        options: [
          { label: 'Jogar no sacrifício', hint: (c.traits.includes('raca') ? '75%' : '55%') + ': herói (Torcida +15) · senão, lesão longa' },
          { label: 'Poupar', hint: 'Torcida −5 · volta inteiro' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < (c.traits.includes('raca') ? 0.75 : 0.55)) { bump(c, 'fans', 15); return { ok: true, text: 'Você decidiu o clássico mancando. Herói!', fx: { fame: 8 } }; }
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
        title: 'Festa na véspera do jogo',
        text: 'Aniversário do parça, todo mundo vai estar lá.',
        options: [
          { label: 'Ir na festa', hint: 'Fama +6 · ' + (c.traits.includes('marra') ? '30%' : '55%') + ': flagrado (Técnico −20)' },
          { label: 'Ficar em casa', hint: 'Técnico +5' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < (c.traits.includes('marra') ? 0.3 : 0.55)) { bump(c, 'coach', -20); return { ok: false, text: 'Foi flagrado de madrugada. O técnico te deixou no banco.', fx: { fame: 3, min: -0.1 } }; }
          return { ok: true, text: 'Curtiu, bombou nas redes e ainda jogou bem no dia seguinte.', fx: { fame: 6 } };
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
          { label: 'Ir para a seleção', hint: 'Fama +8 · Técnico −10 pelo desfalque' },
          { label: 'Ficar no clube', hint: 'Técnico +10 · mais minutos' },
        ],
      }),
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'coach', -10); return { ok: true, text: 'Brilhou na seleção e o país inteiro conheceu seu nome.', fx: { fame: 8 } }; }
        bump(c, 'coach', 10);
        return { ok: true, text: 'O clube valorizou sua escolha.', fx: { min: 0.1 } };
      },
    },
    {
      id: 'protesto', icon: '📢', weight: 6,
      when: c => c.rel.fans < 32,
      build: c => ({
        title: 'Protesto no CT',
        text: 'A torcida do ' + D.CLUB_BY_ID[c.club].name + ' foi cobrar você no treino.',
        options: [
          { label: 'Encarar e conversar', hint: '65%: Torcida +20 · senão, Torcida −10' },
          { label: 'Pedir para sair', hint: 'Mais propostas na próxima janela · Torcida −10' },
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
  ];
  const EVENT_BY_ID = {};
  S.EVENT_DEFS.forEach(e => { EVENT_BY_ID[e.id] = e; });

  function fmtMoney(v) { return v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1e3) + ' mil'; }

  // Sorteia um evento que faça sentido agora (ou nenhum). Não repete os das 2 últimas temporadas.
  S.pickEvent = function (c) {
    const { r, save } = rngOf(c);
    const recent = c.seasons.slice(-2).map(s => s.event).filter(Boolean);
    const pool = S.EVENT_DEFS.filter(e => !recent.includes(e.id) && e.when(c));
    // Eventos de contexto (peso alto) quase sempre aparecem; os genéricos, às vezes.
    const total = pool.reduce((a, e) => a + e.weight, 0);
    if (!pool.length || r() > Math.min(0.9, 0.25 + total * 0.08)) { save(); return null; }
    let x = r() * total, def = pool[0];
    for (const e of pool) { x -= e.weight; if (x < 0) { def = e; break; } }
    const ev = Object.assign({ id: def.id, icon: def.icon }, def.build(c, r));
    save();
    return ev;
  };

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
    if (fx.fame) c.fame = Math.max(0, c.fame + fx.fame * (1 + S.fx(c).fame));
    if (fx.move) {
      const dest = D.CLUB_BY_ID[fx.move];
      S.join(c, { club: dest.id, wage: fx.wageSet || S.wage(c, dest) });
    }
    c.lastEvent = ev.id;
    return out;
  };

  // ---------- temporada ----------
  const AGE_GROWTH = age => (age <= 20 ? 0.24 : age <= 23 ? 0.17 : age <= 26 ? 0.08 : age <= 29 ? 0.02 : 0);
  const AGE_DECLINE = age => (age <= 30 ? 0 : age <= 32 ? 1.8 : age <= 34 ? 3.5 : 5);

  S.playSeason = function (c) {
    const { r, save } = rngOf(c);
    const club = D.CLUB_BY_ID[c.club];
    const lg = D.LEAGUE_BY_ID[club.league];
    const fx = S.fx(c);
    const ovr0 = S.ovr(c);
    const role = S.role(c, club);

    // Lesão: risco base + idade + eventos
    let injShare = c.mod.inj;
    const injRisk = clamp((0.14 + Math.max(0, c.age - 29) * 0.03) * (1 + fx.inj), 0.02, 0.6);
    let injName = null;
    if (r() < injRisk) {
      injShare = Math.max(injShare, r.range(0.1, 0.4));
    }
    if (injShare > 0) injName = r.pick(['lesão na coxa', 'entorse no tornozelo', 'lesão no joelho', 'problema muscular']);

    let share = clamp(role.share + c.mod.min + (c.rel.coach - REL0) / 250 + (c.age <= 17 ? -0.2 : 0), 0.05, 0.97);
    share *= 1 - injShare;
    const maxGames = 38 + (club.tier >= 3 ? 8 : 4);
    const games = Math.max(0, Math.round(maxGames * share));

    // Produção por jogo
    const o = ovr0;
    const teamF = 0.85 + (club.strength - D.TIERS[club.tier].min) * 0.02;
    const form = 1 + c.mod.form + r.gauss() * 0.08;
    let g90 = (c.pos === 'ATA' ? 0.1 + Math.max(0, o - 45) * 0.0125 : 0.04 + Math.max(0, o - 45) * 0.0055);
    let a90 = (c.pos === 'ATA' ? 0.04 + Math.max(0, o - 45) * 0.0045 : 0.06 + Math.max(0, o - 45) * 0.0075);
    g90 *= teamF * form * (1 + fx.goal) * (1 + c.mod.goal);
    a90 *= teamF * form * (1 + fx.assist) * (1 + c.mod.assist);

    let goals = 0, assists = 0;
    const highlights = [];
    let hat = 0, poker = 0;
    for (let i = 0; i < games; i++) {
      const g = r.poisson(g90 * 0.9);
      const a = r.poisson(a90 * 0.9);
      goals += g;
      assists += a;
      if (g >= 4) poker++;
      else if (g === 3) hat++;
    }
    if (poker) highlights.push('🔥 ' + (poker > 1 ? poker + ' jogos' : 'Um jogo') + ' com 4 gols ou mais!');
    if (hat) highlights.push('🎩 ' + hat + ' hat-trick' + (hat > 1 ? 's' : '') + ' na temporada');
    if (c.traits.includes('colocado') && c.traits.includes('parada') && goals > 5) highlights.push('🌟 ' + Math.max(2, Math.round(goals * 0.18)) + ' gols de falta');
    if (injName) highlights.push('🤕 ' + injName[0].toUpperCase() + injName.slice(1) + ': perdeu ' + Math.round(injShare * 100) + '% da temporada');

    // Nota média
    const perGame = games ? (goals + assists * 0.7) / games : 0;
    const rating = games ? clamp(round1(6.1 + perGame * 2.4 + (o - club.strength) * 0.03 + fx.rating + r.gauss() * 0.25), 5.0, 9.6) : 0;

    // Títulos: força do time + sua contribuição
    const contrib = games ? (rating - 6.5) * share * 2.2 : 0;
    const sEff = club.strength + contrib;
    const leagueClubs = D.CLUBS.filter(x => x.league === club.league);
    const top = Math.max(...leagueClubs.map(x => x.strength));
    const titleBonus = fx.title + (c.captain ? 0.08 : 0);
    const pLeague = clamp(0.02 + (sEff - top + 4) / 16 + titleBonus * 0.6, 0.01, 0.55);
    const pCup = clamp(pLeague * 0.5 + 0.03 + titleBonus * 0.3, 0.02, 0.4);
    const league = r() < pLeague;
    const cup = r() < pCup;
    const pCont = club.tier >= 3 ? clamp((sEff - 80) / 40 + titleBonus * 0.3, 0.01, 0.25) * (club.tier === 5 ? 1 : club.tier === 4 ? 0.4 : 0.25) : 0;
    const cont = club.tier >= 3 && r() < pCont;
    const contName = ['bra-a', 'arg'].includes(club.league) ? 'Libertadores' : club.tier >= 4 ? 'Liga dos Campeões' : null;
    const titles = [];
    if (league) titles.push({ id: 'league', name: lg.name });
    if (cup) titles.push({ id: 'cup', name: lg.cup || 'Copa nacional' });
    if (cont && contName) titles.push({ id: 'cont', name: contName });
    if (titles.length) highlights.push('🏆 Campeão: ' + titles.map(t => t.name).join(', '));

    // Prêmios
    const awards = [];
    const scorerLine = 17 + club.tier * 2 + r.range(-3, 3);
    if (goals >= scorerLine && c.pos === 'ATA') awards.push({ id: 'scorer', name: 'Artilheiro da ' + lg.name });
    if (c.pos === 'MEI' && assists >= 14 + club.tier + r.range(-2, 2)) awards.push({ id: 'scorer', name: 'Líder de assistências da ' + lg.name });
    if (c.age <= 21 && rating >= 7.2 && club.tier >= 3) awards.push({ id: 'young', name: 'Melhor jovem da ' + lg.name });
    if (rating >= 7.5 && games >= 20) awards.push({ id: 'team', name: 'Seleção da ' + lg.name });
    // Bola de Ouro: só em clubes de nível 4-5
    const bScore = goals + assists * 0.6 + titles.length * 8 + (cont ? 10 : 0) + (rating - 6) * 12;
    // Cada Bola de Ouro anterior aumenta a exigência (a concorrência cresce)
    const pBallon = club.tier >= 4 && o >= 87 ? clamp(1 / (1 + Math.exp(-(bScore - 92 - 9 * c.totals.ballon) / 7)) * (club.tier === 5 ? 0.6 : 0.2), 0, 0.6) : 0;
    const ballon = r() < pBallon;
    if (ballon) awards.push({ id: 'ballon', name: 'BOLA DE OURO' });

    // Fama
    const fame0 = c.fame;
    c.fame = Math.max(0, c.fame * 0.85 + (goals * 0.5 + assists * 0.35 + titles.length * 6 + awards.length * 6 + (ballon ? 30 : 0) + club.tier * 2) * (1 + fx.fame) * (0.8 + c.rel.fans / 250));
    const coach0 = c.rel.coach, fans0 = c.rel.fans;
    if (games) {
      bump(c, 'coach', (rating - 6.6) * 10);
      bump(c, 'fans', (rating - 6.6) * 9 + titles.length * 6 - (c.captain && rating < 6.8 ? 6 : 0));
    }
    c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans);

    // Evolução
    // Jogar muito e bem faz evoluir mais e pode até elevar o teto (potencial)
    if (games >= 22 && rating >= 7.6 && c.age <= 26) c.pot = Math.min(99, c.pot + (rating >= 8.2 ? 2 : 1));
    const growth = (c.pot - o) * AGE_GROWTH(c.age) * (0.3 + share * 1.25);
    const decline = AGE_DECLINE(c.age) * (1 + fx.decl);
    const delta = growth - decline + r.gauss() * 1.2;
    const w = D.POS[c.pos].w;
    for (const k in c.attrs) c.attrs[k] = clamp(c.attrs[k] + delta * (0.5 + w[k] * 2.2) + r.gauss() * 0.6, 20, 99);
    const ovr1 = S.ovr(c);
    c.peak = Math.max(c.peak, ovr1, o);

    // Dinheiro e totais
    c.money += c.wage * 52;
    const T = c.totals;
    T.games += games; T.goals += goals; T.assists += assists;
    if (league) T.league++;
    if (cup) T.cup++;
    if (cont) T.cont++;
    awards.forEach(a => { if (a.id in T) T[a.id]++; });
    // Sala de troféus: conta por competição
    c.trophies = c.trophies || {};
    titles.forEach(t => {
      const k = t.name;
      const type = t.id === 'cont' ? (t.name === 'Libertadores' ? 'lib' : 'ucl') : t.id;
      c.trophies[k] = c.trophies[k] || { type, n: 0 };
      c.trophies[k].n++;
    });
    if (ballon) { c.trophies['Bola de Ouro'] = c.trophies['Bola de Ouro'] || { type: 'ballon', n: 0 }; c.trophies['Bola de Ouro'].n++; }
    const sp = c.spells[c.spells.length - 1];
    sp.games += games; sp.goals += goals; sp.assists += assists; sp.titles += titles.length; sp.to = c.age;
    sp.seasons = (sp.seasons || 0) + 1;

    const res = {
      age: c.age, club: club.id, role: role.name, games, goals, assists, rating, titles, awards,
      ovr0, ovr1, fame0: Math.round(fame0), fame1: Math.round(c.fame), injury: injName ? Math.round(injShare * 100) : 0,
      coach0: Math.round(coach0), coach1: Math.round(c.rel.coach), fans0: Math.round(fans0), fans1: Math.round(c.rel.fans),
      highlights, event: c.lastEvent || null,
    };
    res.headlines = S.headlines(c, res);
    c.seasons.push(res);
    c.age++;
    c.season++;
    c.mod = { min: 0, form: 0, inj: 0, goal: 0, assist: 0 };
    c.lastEvent = null;
    save();
    return res;
  };

  S.headlines = function (c, s) {
    const club = D.CLUB_BY_ID[s.club].name;
    const nick = c.name;
    const h = [];
    if (s.awards.some(a => a.id === 'ballon')) h.push(nick + ' é o melhor do mundo!');
    if (s.titles.length >= 2) h.push('Temporada histórica: ' + club + ' leva ' + s.titles.length + ' taças');
    else if (s.titles.length) h.push(club + ' é campeão com ' + nick + ' em campo');
    if (s.goals >= 30) h.push(s.goals + ' gols: ' + nick + ' vira pesadelo das defesas');
    else if (s.assists >= 15) h.push('O garçom da liga: ' + s.assists + ' assistências de ' + nick);
    if (s.ovr1 - s.ovr0 >= 5) h.push(nick + ' não para de evoluir');
    if (s.ovr1 - s.ovr0 <= -4) h.push('Idade pesa? ' + nick + ' já não é o mesmo');
    if (s.injury >= 25) h.push('Lesão atrapalha temporada de ' + nick);
    if (s.games < 12 && !s.injury) h.push(nick + ' pede mais minutos no ' + club);
    if (s.rating && s.rating < 6.3 && s.games >= 12) h.push('Torcida do ' + club + ' pega no pé de ' + nick);
    if (!h.length) h.push('Temporada regular de ' + nick + ' no ' + club);
    return h.slice(0, 3);
  };

  // ---------- propostas ----------
  S.expectedTier = function (c) {
    const o = S.ovr(c);
    let t = o < 55 ? 1 : o < 63 ? 2 : o < 71 ? 3 : o < 79 ? 4 : 5;
    if (c.fame > 120 && t < 5) t++;
    return t;
  };

  function offerFrom(c, club, kind) {
    const role = S.role(c, club);
    return { club: club.id, kind, role: role.name, share: role.share, wage: S.wage(c, club) };
  }

  S.offers = function (c, academy) {
    const { r, save } = rngOf(c);
    const out = [];
    const used = new Set([c.club]);
    const pickClub = (filter) => {
      const pool = D.CLUBS.filter(x => !used.has(x.id) && filter(x));
      if (!pool.length) return null;
      const cl = r.pick(pool);
      used.add(cl.id);
      return cl;
    };
    if (academy) {
      const home = D.COUNTRIES.find(x => x.id === c.country).home;
      for (let i = 0; i < 3; i++) {
        const cl = pickClub(x => home.includes(x.league) && x.tier <= 2) || pickClub(x => x.tier <= 2);
        if (cl) out.push(offerFrom(c, cl, 'base'));
      }
      save();
      return out;
    }
    const t = S.expectedTier(c);
    const o = S.ovr(c);
    // 1) Clube maior (pode sobrar pouco espaço)
    const up = pickClub(x => x.tier === Math.min(5, t + (r() < 0.35 ? 1 : 0)) && x.strength >= o - 6);
    if (up) out.push(offerFrom(c, up, 'up'));
    // 2) Mesmo nível, papel de protagonista
    const mid = pickClub(x => x.tier === t && x.strength <= o + 1) || pickClub(x => x.tier === Math.max(1, t - 1));
    if (mid) out.push(offerFrom(c, mid, 'mid'));
    // 3) Especial: dinheiro, volta ao clube do coração ou aposta
    let sp = null;
    if (c.age >= 27 && r() < 0.5) sp = pickClub(x => ['ara', 'usa'].includes(x.league));
    if (!sp && c.age >= 30 && c.firstClub && !used.has(c.firstClub) && (c.fansBy[c.firstClub] || 0) >= 60 && r() < 0.6) { sp = D.CLUB_BY_ID[c.firstClub]; used.add(sp.id); }
    if (!sp) sp = pickClub(x => x.tier === Math.max(1, t - 1));
    if (sp) out.push(offerFrom(c, sp, sp.id === c.firstClub ? 'home' : ['ara', 'usa'].includes(sp.league) ? 'money' : 'mid'));
    // Pediu para sair: o empresário arruma mais uma proposta
    if (c.wantsOut) {
      c.wantsOut = false;
      const ex = pickClub(x => x.tier === t);
      if (ex) out.push(offerFrom(c, ex, 'mid'));
    }
    save();
    // Contrato longo: o clube recusa quase tudo nas próximas janelas
    if (c.renew > 0) { c.renew--; out.length = Math.min(out.length, 1); }
    // Sem propostas decentes quando o jogador está muito fraco e velho
    if (o < 50 && c.age >= 30) return [];
    return out;
  };

  S.stayOffer = function (c) {
    const club = D.CLUB_BY_ID[c.club];
    return offerFrom(c, club, 'stay');
  };

  S.join = function (c, offer) {
    const club = D.CLUB_BY_ID[offer.club];
    if (c.club !== club.id) {
      if (c.club) c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans);
      // Voltar a um clube onde foi ídolo: a torcida lembra
      c.rel = { coach: REL0, fans: c.fansBy[club.id] ? Math.max(REL0, c.fansBy[club.id] - 10) : REL0 };
      c.captain = false;
      c.renew = 0;
      c.club = club.id;
      c.clubSince = c.age;
      c.spells.push({ club: club.id, from: c.age, to: c.age, games: 0, goals: 0, assists: 0, titles: 0 });
      if (!c.firstClub) c.firstClub = club.id;
    }
    c.wage = offer.wage;
  };

  S.canRetire = c => c.age >= 33;
  S.mustRetire = c => c.age >= 38;

  // ---------- fim de carreira ----------
  S.finish = function (c) {
    c.retired = true;
    const T = c.totals;
    const titles = T.league + T.cup + T.cont;
    const score = Math.round(T.goals + T.assists * 0.7 + titles * 12 + T.cont * 10 + T.ballon * 120 + (T.scorer + T.young + T.team) * 8 + c.peak * 2);
    const byClub = {};
    c.spells = c.spells.filter(s => s.seasons);
    c.spells.forEach(s => {
      byClub[s.club] = byClub[s.club] || { seasons: 0, goals: 0 };
      byClub[s.club].seasons += s.to - s.from + 1;
      byClub[s.club].goals += s.goals;
    });
    const idol = Object.entries(byClub).sort((a, b) => b[1].seasons - a[1].seasons)[0];
    const nClubs = Object.keys(byClub).length;
    let verdict;
    if (T.ballon >= 3) verdict = 'Um dos maiores da história';
    else if (T.ballon >= 1) verdict = 'Melhor do mundo';
    else if (T.goals >= 450) verdict = 'Artilheiro histórico';
    else if (idol && idol[1].seasons >= 8 && (c.fansBy[idol[0]] || 0) >= 75) verdict = 'Ídolo eterno do ' + D.CLUB_BY_ID[idol[0]].name;
    else if (titles >= 14) verdict = 'Colecionador de taças';
    else if (c.peak < 66) verdict = 'Promessa que não vingou';
    else if (nClubs >= 11) verdict = 'Cigano da bola';
    else if (c.spells.some(s => ['ara', 'usa'].includes(D.CLUB_BY_ID[s.club].league))) verdict = 'Foi atrás do dinheiro';
    else verdict = 'Carreira sólida';
    const grade = score >= 1300 ? 'S' : score >= 950 ? 'A' : score >= 650 ? 'B' : score >= 420 ? 'C' : 'D';
    return { score, verdict, grade, titles, nClubs };
  };

  root.CRAQUE_SIM = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
