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
      pot: Math.round(62 + 34 * Math.pow(r(), 1.7)), // potencial escondido: maioria mediana, poucos gênios
      traits: [], club: null, clubSince: 0, firstClub: null,
      fame: 0, money: 0, wage: 0,
      mod: { min: 0, form: 0, inj: 0 },
      totals: { games: 0, goals: 0, assists: 0, league: 0, cup: 0, cont: 0, ballon: 0, scorer: 0, young: 0, team: 0 },
      spells: [], seasons: [], peak: 0, retired: false,
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

  // ---------- eventos ----------
  S.pickEvent = function (c) {
    const { r, save } = rngOf(c);
    const pool = D.EVENTS.filter(e => !e.maxAge || c.age <= e.maxAge);
    const recent = c.seasons.slice(-2).map(s => s.event).filter(Boolean);
    const fresh = pool.filter(e => !recent.includes(e.id));
    const ev = r.pick(fresh.length ? fresh : pool);
    save();
    return ev;
  };

  S.resolveEvent = function (c, ev, idx) {
    const { r, save } = rngOf(c);
    const opt = ev.options[idx];
    let p = opt.odds;
    if (opt.bonus) for (const k in opt.bonus) if (c.traits.includes(k)) p += opt.bonus[k];
    const ok = r() < p;
    save();
    const out = ok ? opt.ok : (opt.ko || opt.ok);
    const fx = out.fx || {};
    if (fx.min) c.mod.min += fx.min;
    if (fx.form) c.mod.form += fx.form;
    if (fx.inj) c.mod.inj = Math.max(c.mod.inj, fx.inj);
    if (fx.fame) c.fame = Math.max(0, c.fame + fx.fame * (1 + S.fx(c).fame));
    if (fx.money) c.money += fx.money * Math.max(c.wage, 1000);
    if (fx.attr) for (const k in fx.attr) c.attrs[k] = clamp(c.attrs[k] + fx.attr[k], 20, 99);
    c.lastEvent = ev.id;
    return { ok, text: out.text, fx };
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

    let share = clamp(role.share + c.mod.min + (c.age <= 17 ? -0.2 : 0), 0.05, 0.97);
    share *= 1 - injShare;
    const maxGames = 38 + (club.tier >= 3 ? 8 : 4);
    const games = Math.max(0, Math.round(maxGames * share));

    // Produção por jogo
    const o = ovr0;
    const teamF = 0.85 + (club.strength - D.TIERS[club.tier].min) * 0.02;
    const form = 1 + c.mod.form + r.gauss() * 0.08;
    let g90 = (c.pos === 'ATA' ? 0.1 + Math.max(0, o - 45) * 0.0125 : 0.04 + Math.max(0, o - 45) * 0.0055);
    let a90 = (c.pos === 'ATA' ? 0.04 + Math.max(0, o - 45) * 0.0045 : 0.06 + Math.max(0, o - 45) * 0.0075);
    g90 *= teamF * form * (1 + fx.goal);
    a90 *= teamF * form * (1 + fx.assist);

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
    const titleBonus = fx.title;
    const pLeague = clamp(0.02 + (sEff - top + 4) / 16 + titleBonus * 0.6, 0.01, 0.55);
    const pCup = clamp(pLeague * 0.5 + 0.03 + titleBonus * 0.3, 0.02, 0.4);
    const league = r() < pLeague;
    const cup = r() < pCup;
    const pCont = club.tier >= 3 ? clamp((sEff - 80) / 40 + titleBonus * 0.3, 0.01, 0.25) * (club.tier === 5 ? 1 : club.tier === 4 ? 0.4 : 0.25) : 0;
    const cont = club.tier >= 3 && r() < pCont;
    const contName = ['bra-a', 'arg'].includes(club.league) ? 'Libertadores' : club.tier >= 4 ? 'Liga dos Campeões' : null;
    const titles = [];
    if (league) titles.push({ id: 'league', name: lg.name });
    if (cup) titles.push({ id: 'cup', name: 'Copa de ' + lg.country });
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
    const pBallon = club.tier >= 4 && o >= 87 ? clamp(1 / (1 + Math.exp(-(bScore - 88) / 7)) * (club.tier === 5 ? 0.6 : 0.2), 0, 0.6) : 0;
    const ballon = r() < pBallon;
    if (ballon) awards.push({ id: 'ballon', name: 'BOLA DE OURO' });

    // Fama
    const fame0 = c.fame;
    c.fame = Math.max(0, c.fame * 0.85 + (goals * 0.5 + assists * 0.35 + titles.length * 6 + awards.length * 6 + (ballon ? 30 : 0) + club.tier * 2) * (1 + fx.fame));

    // Evolução
    const growth = (c.pot - o) * AGE_GROWTH(c.age) * (0.55 + share * 0.9);
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
    const sp = c.spells[c.spells.length - 1];
    sp.games += games; sp.goals += goals; sp.assists += assists; sp.titles += titles.length; sp.to = c.age;

    const res = {
      age: c.age, club: club.id, role: role.name, games, goals, assists, rating, titles, awards,
      ovr0, ovr1, fame0: Math.round(fame0), fame1: Math.round(c.fame), injury: injName ? Math.round(injShare * 100) : 0,
      highlights, event: c.lastEvent || null,
    };
    res.headlines = S.headlines(c, res);
    c.seasons.push(res);
    c.age++;
    c.season++;
    c.mod = { min: 0, form: 0, inj: 0 };
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
    if (!sp && c.age >= 31 && c.firstClub && !used.has(c.firstClub) && r() < 0.5) { sp = D.CLUB_BY_ID[c.firstClub]; used.add(sp.id); }
    if (!sp) sp = pickClub(x => x.tier === Math.max(1, t - 1));
    if (sp) out.push(offerFrom(c, sp, sp.id === c.firstClub ? 'home' : ['ara', 'usa'].includes(sp.league) ? 'money' : 'mid'));
    save();
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
    else if (idol && idol[1].seasons >= 10) verdict = 'Ídolo eterno do ' + D.CLUB_BY_ID[idol[0]].name;
    else if (titles >= 14) verdict = 'Colecionador de taças';
    else if (c.peak < 66) verdict = 'Promessa que não vingou';
    else if (nClubs >= 10) verdict = 'Cigano da bola';
    else if (c.spells.some(s => ['ara', 'usa'].includes(D.CLUB_BY_ID[s.club].league))) verdict = 'Foi atrás do dinheiro';
    else verdict = 'Carreira sólida';
    const grade = score >= 1300 ? 'S' : score >= 950 ? 'A' : score >= 650 ? 'B' : score >= 420 ? 'C' : 'D';
    return { score, verdict, grade, titles, nClubs };
  };

  root.CRAQUE_SIM = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
