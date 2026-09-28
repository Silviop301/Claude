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

  // ---------- divisões: cada carreira guarda quem subiu e quem caiu (c.leagueOf) ----------
  D.CLUBS.forEach(cl => { if (!cl.league0) { cl.league0 = cl.league; cl.strength0 = cl.strength; } });
  S.applyLeagues = function (c) {
    const m = (c && c.leagueOf) || {}, f = (c && c.clubBoost) || {};
    D.CLUBS.forEach(cl => { cl.league = m[cl.id] || cl.league0; cl.strength = cl.strength0 + (f[cl.id] || 0); });
  };
  function moveClub(c, club, to) {
    const from = club.league;
    const pool = D.CLUBS.filter(x => x.league === to);
    // Mantém o tamanho das ligas: o mais fraco de cima desce (ou o mais forte de baixo sobe)
    const up = D.LADDER[from] && D.LADDER[from].up === to;
    const partner = pool.slice().sort((a, b) => up ? a.strength - b.strength : b.strength - a.strength)[0];
    c.leagueOf = c.leagueOf || {};
    c.clubBoost = c.clubBoost || {};
    // Quem sobe investe (+4 de força); quem cai perde elenco (−3)
    c.clubBoost[club.id] = clamp((c.clubBoost[club.id] || 0) + (up ? 4 : -3), -6, 8);
    c.leagueOf[club.id] = to;
    if (partner) c.leagueOf[partner.id] = from;
    S.applyLeagues(c);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round1 = v => Math.round(v * 10) / 10;

  // ---------- jogador ----------
  // c.attrs guarda a base (treino e idade); as características somam por cima.
  // A carta mostra sempre a soma (S.eff).
  const ovrOf = (attrs, pos) => {
    const w = D.POS[pos].w;
    let o = 0;
    for (const k in w) o += attrs[k] * w[k];
    return Math.round(o);
  };
  S.ovrOf = ovrOf;

  // Pontos que um conjunto de características (com níveis) soma em cada atributo
  S.bonusOf = function (traits, lv) {
    const b = {};
    D.ATTRS.forEach(k => { b[k] = 0; });
    traits.forEach(id => {
      const t = D.TRAIT_BY_ID[id], m = D.TRAIT_LV[lv[id] || 1];
      for (const k in t.attr) b[k] += Math.round(t.attr[k] * m);
    });
    D.SYNERGIES.forEach(s => {
      if (traits.includes(s.a) && traits.includes(s.b)) for (const k in s.attr) b[k] += s.attr[k];
    });
    return b;
  };

  const effOf = (c, traits, lv, inv) => {
    const b = S.bonusOf(traits, lv), out = {};
    inv = inv || c.inv || {};
    D.INVEST.forEach(t => { if (t.attr && inv[t.id]) for (const k in t.attr) b[k] += t.attr[k] * inv[t.id]; });
    D.ATTRS.forEach(k => { out[k] = clamp(Math.round(c.attrs[k]) + b[k], 20, 99); });
    return out;
  };
  S.eff = c => effOf(c, c.traits, c.traitLv || {});
  S.ovr = c => ovrOf(S.eff(c), c.pos);

  // Como a carta fica depois de uma escolha: { add, remove, up } (ids de características)
  S.preview = function (c, ch) {
    let traits = c.traits.slice();
    const lv = Object.assign({}, c.traitLv);
    if (ch.remove) { traits = traits.filter(x => x !== ch.remove); delete lv[ch.remove]; }
    if (ch.add) { traits.push(ch.add); lv[ch.add] = 1; }
    if (ch.up) lv[ch.up] = (lv[ch.up] || 1) + 1;
    const inv = Object.assign({}, c.inv);
    if (ch.buy) inv[ch.buy] = (inv[ch.buy] || 0) + 1;
    const attrs = effOf(c, traits, lv, inv);
    return { attrs, ovr: ovrOf(attrs, c.pos) };
  };

  S.newCareer = function (opts, seed) {
    S.applyLeagues(null); // carreira nova: divisões originais
    const r = S.rng(seed || (Date.now() ^ 0x5EED));
    const base = r.int(44, 52);
    const attrs = {};
    D.ATTRS.forEach(k => { attrs[k] = clamp(base + r.int(-6, 6), 30, 70); });
    // Atributos principais da posição começam maiores; defesa começa baixa (mais ainda no atacante)
    if (opts.pos === 'ATA') { attrs.fin += 4; attrs.rit += 3; attrs.dri += 2; attrs.def -= 16; }
    else { attrs.pas += 4; attrs.dri += 2; attrs.def -= 8; }
    attrs.def = clamp(attrs.def, 20, 70);
    return {
      v: 2, seed: r.state(),
      name: opts.name, pos: opts.pos, foot: opts.foot, country: opts.country, number: opts.number || (opts.pos === 'ATA' ? 9 : 10),
      age: 16, season: 0, attrs,
      pot: Math.round(55 + 25 * Math.pow(r(), 1.5)), // potencial escondido; temporadas muito boas elevam o teto
      traits: [], club: null, clubSince: 0, firstClub: null,
      fame: 0, money: 0, wage: 0,
      mod: { min: 0, form: 0, inj: 0, goal: 0, assist: 0 },
      rel: { coach: 50, fans: 50 }, fansBy: {}, captain: false, renew: 0, wantsOut: false,
      totals: { games: 0, goals: 0, assists: 0, league: 0, cup: 0, cont: 0, ballon: 0, scorer: 0, young: 0, team: 0 },
      spells: [], seasons: [], peak: 0, retired: false, trophies: {},
      traitLv: {}, contract: 0, farewell: false, peakAttrs: null,
      inv: {}, spent: 0, buys: 0, leagueOf: {}, clubBoost: {},
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

  S.MAX_SLOTS = 5;
  S.MAX_LV = 3;
  const lvOf = (c, id) => (c.traitLv && c.traitLv[id]) || 1;

  // Único efeito fora dos atributos: Profissional envelhece mais devagar
  S.declMult = c => (c.traits.includes('pro') ? 1 - 0.25 * lvOf(c, 'pro') : 1);

  const completesSyn = (c, id, without) => D.SYNERGIES.find(s => {
    const has = x => c.traits.includes(x) && x !== without;
    return (s.a === id && has(s.b)) || (s.b === id && has(s.a));
  }) || null;

  // Escolhas da pré-temporada. Com espaço livre: características novas (e às vezes evoluir uma).
  // Com os 5 espaços cheios: evoluir uma que já tem ou trocar por uma nova.
  S.traitChoices = function (c) {
    const { r, save } = rngOf(c);
    const out = [];
    const full = c.traits.length >= S.MAX_SLOTS;
    const upPool = c.traits.filter(id => lvOf(c, id) < S.MAX_LV);
    const newPool = D.TRAITS.filter(t => !c.traits.includes(t.id));
    const pushUp = () => {
      const left = upPool.filter(id => !out.some(o => o.trait.id === id));
      if (!left.length) return false;
      const id = r.pick(left);
      out.push({ type: 'up', trait: D.TRAIT_BY_ID[id], lv: lvOf(c, id) + 1, completes: null });
      return true;
    };
    const pushNew = () => {
      const left = newPool.filter(t => !out.some(o => o.trait.id === t.id));
      if (!left.length) return false;
      // Tende a oferecer o par de uma sinergia que você já começou
      const partners = left.filter(t => completesSyn(c, t.id));
      const t = partners.length && r() < 0.6 ? r.pick(partners) : r.pick(left);
      out.push({ type: full ? 'swap' : 'new', trait: t, lv: 1, completes: completesSyn(c, t.id) });
      return true;
    };
    if (!full) {
      const ups = c.traits.length >= 2 && r() < 0.5 ? 1 : 0;
      for (let i = 0; i < ups; i++) pushUp();
      while (out.length < 3 && pushNew()) { /* completa com novas */ }
    } else {
      pushUp(); pushUp();
      while (out.length < 3 && pushNew()) { /* uma troca possível */ }
      while (out.length < 3 && pushUp()) { /* sem novas: só evoluções */ }
    }
    save();
    return out;
  };

  // Adiciona característica nova (substituindo outra se os espaços estiverem cheios).
  S.addTrait = function (c, id, replaceId) {
    if (c.traits.includes(id)) return null;
    if (replaceId) {
      c.traits = c.traits.filter(x => x !== replaceId);
      delete c.traitLv[replaceId];
    }
    if (c.traits.length >= S.MAX_SLOTS) return null;
    c.traits.push(id);
    c.traitLv[id] = 1;
    return S.synergies(c).find(s => s.a === id || s.b === id) || null;
  };

  S.upgradeTrait = function (c, id) {
    if (!c.traits.includes(id) || lvOf(c, id) >= S.MAX_LV) return false;
    c.traitLv[id] = lvOf(c, id) + 1;
    return true;
  };
  S.traitLevel = lvOf;

  // ---------- investimentos ----------
  S.INVEST_BASE = 40000;
  S.INVEST_GROWTH = 2.0;
  S.investPrice = c => Math.round(S.INVEST_BASE * Math.pow(S.INVEST_GROWTH, c.buys || 0) / 1000) * 1000;
  S.investMax = id => D.INVEST_BY_ID[id].max || D.INVEST_MAX;
  S.canInvest = (c, id) => (c.inv[id] || 0) < S.investMax(id) && c.money >= S.investPrice(c);
  // Quantas compras um valor paga, a partir do preço atual (para comparar salários)
  S.buysWith = function (c, amount) {
    let n = 0, b = c.buys || 0, left = amount;
    while (n < 12) {
      const p = Math.round(S.INVEST_BASE * Math.pow(S.INVEST_GROWTH, b) / 1000) * 1000;
      if (left < p) break;
      left -= p; b++; n++;
    }
    return n;
  };
  S.invest = function (c, id) {
    if (!S.canInvest(c, id)) return false;
    const p = S.investPrice(c);
    c.money -= p; c.spent += p; c.buys++;
    c.inv[id] = (c.inv[id] || 0) + 1;
    if (!c.firstBuyAge) c.firstBuyAge = c.age;
    return true;
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
      when: c => c.age >= 28 && S.ovr(c) >= 72 && !['ara', 'usa'].includes(D.CLUB_BY_ID[c.club].league),
      build: (c, r) => {
        const dest = pickClub(r, x => ['ara', 'usa'].includes(x.league));
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
      when: c => !c.captain && c.rel.fans >= 60 && c.rel.coach >= 60 && atClub(c) >= 3,
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
          { label: 'Ir na festa', hint: 'Fama +6 · ' + '55%' + ': flagrado (Técnico −20)' },
          { label: 'Ficar em casa', hint: 'Técnico +5' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) {
          if (r() < 0.55) { bump(c, 'coach', -20); return { ok: false, text: 'Foi flagrado de madrugada. O técnico te deixou no banco.', fx: { fame: 3, min: -0.1 } }; }
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
      when: c => atClub(c) >= 1,
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
        const k = c.pos === 'ATA' ? 'fin' : 'pas';
        return {
          title: 'Um veterano quer te ensinar',
          text: 'O jogador mais experiente do elenco se ofereceu para treinar com você depois dos treinos.',
          attr: k,
          options: [
            { label: 'Aceitar os treinos extras', hint: '+2 ' + D.ATTR_LABEL[k] + ' para sempre · Técnico +5' },
            { label: 'Aproveitar a folga', hint: 'Forma +5% · Fama +3' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'coach', 5); return { ok: true, text: 'Meses de treino fino. Dá para ver a diferença no seu jogo.', fx: { attr: { [ev.attr]: 2 } } }; }
        return { ok: true, text: 'Você chegou descansado para a temporada.', fx: { form: 0.05, fame: 3 } };
      },
    },
    {
      id: 'patrocinio', icon: '👟', weight: 3, max: 3,
      when: c => c.fame >= 40 && c.wage > 0,
      build: c => {
        const value = Math.round(c.wage * 52 * 0.6 / 1000) * 1000;
        return {
          title: 'Proposta de patrocínio',
          text: 'Uma marca esportiva quer você como garoto-propaganda.',
          value,
          options: [
            { label: 'Assinar o contrato', hint: '+R$ ' + fmtMoney(value) + ' · agenda cheia: forma −5%' },
            { label: 'Recusar e focar no futebol', hint: 'Forma +5% · Técnico +5' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Seu rosto está em todos os outdoors da cidade.', fx: { money: ev.value, fame: 4, form: -0.05 } };
        bump(c, 'coach', 5);
        return { ok: true, text: 'O técnico elogiou o foco em entrevista.', fx: { form: 0.05 } };
      },
    },
    {
      id: 'redes', icon: '📱', weight: 3, max: 2,
      when: c => c.age <= 27 && c.fame >= 20,
      build: () => ({
        title: 'Polêmica nas redes',
        text: 'Um vídeo seu provocando a torcida rival viralizou.',
        options: [
          { label: 'Pedir desculpas', hint: 'Torcida +5 · Fama −2' },
          { label: 'Dobrar a aposta', hint: 'Fama +8 · Torcida −8 · 30%: Técnico −10' },
        ],
      }),
      resolve: (c, ev, i, r) => {
        if (i === 0) { bump(c, 'fans', 5); return { ok: true, text: 'O pedido de desculpas pegou bem.', fx: { fame: -2 } }; }
        bump(c, 'fans', -8);
        if (r() < 0.3) { bump(c, 'coach', -10); return { ok: false, text: 'Viralizou de novo, e o técnico te chamou para uma conversa.', fx: { fame: 8 } }; }
        return { ok: true, text: 'Virou meme. Todo mundo está falando de você.', fx: { fame: 8 } };
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
      when: c => !!c.club && c.age <= 31,
      build: () => ({
        title: 'Treino de faltas',
        text: 'O preparador propõe uma semana inteira batendo faltas depois do treino.',
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
          title: 'Projeto na sua cidade',
          text: 'Uma escolinha de futebol da sua cidade natal pede ajuda para não fechar.',
          value,
          options: [
            { label: 'Doar R$ ' + fmtMoney(value), hint: 'Torcida +10 · Fama +6' },
            { label: 'Agora não', hint: 'Nada muda' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) { bump(c, 'fans', 10); return { ok: true, text: 'A escolinha agora leva o seu nome.', fx: { money: -ev.value, fame: 6 } }; }
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
            { label: 'Não comemorar se marcar', hint: 'A torcida antiga te aplaude · Fama +4' },
            { label: 'Comemorar na cara deles', hint: 'Torcida atual +10 · a antiga vira contra você' },
          ],
        };
      },
      resolve: (c, ev, i) => {
        if (i === 0) return { ok: true, text: 'Você marcou e ergueu as mãos. O estádio inteiro aplaudiu.', fx: { fame: 4 } };
        bump(c, 'fans', 10);
        c.fansBy[ev.prev] = Math.max(0, (c.fansBy[ev.prev] || 0) - 40);
        return { ok: true, text: 'A comemoração virou capa de jornal. Os antigos fãs não perdoaram.', fx: { fame: 3 } };
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
    if (fx.move) {
      const dest = D.CLUB_BY_ID[fx.move];
      S.join(c, { club: dest.id, wage: fx.wageSet || S.wage(c, dest) });
    }
    c.lastEvent = ev.id;
    c.evCount = c.evCount || {};
    c.evCount[ev.id] = (c.evCount[ev.id] || 0) + 1;
    return out;
  };

  // ---------- jogo decisivo (minigame de pênalti / falta) ----------
  // Em algumas temporadas, um lance decide algo grande. O resultado vale de verdade:
  //  cup      pênalti na final da copa     → converteu: campeão da copa · errou: vice
  //  title    pênalti na última rodada     → converteu: campeão da liga · errou: vice
  //  classico falta no clássico            → converteu: gol e torcida +8
  S.pickMoment = function (c) {
    if (c.momentAge === c.age) return c.moment || null; // já sorteado nesta temporada
    const { r, save } = rngOf(c);
    c.momentAge = c.age;
    c.moment = null;
    const club = D.CLUB_BY_ID[c.club], lg = D.LEAGUE_BY_ID[club.league];
    const rivals = D.CLUBS.filter(x => x.league === club.league && x.id !== club.id).sort((a, b) => b.strength - a.strength);
    const playing = S.role(c, club).share >= 0.3 || c.farewell;
    if (playing && rivals.length && r() < 0.45) {
      const rank = 1 + rivals.filter(x => x.strength > club.strength).length;
      // Final e briga pelo título só para quem está entre os mais fortes da liga
      const pool = [['classico', c.pos === 'MEI' ? 4 : 3]];
      if (rank <= 5) pool.push(['cup', 1]);
      if (rank <= 2) pool.push(['title', 1.5]);
      let x = r() * pool.reduce((a, p) => a + p[1], 0), type = pool[0][0];
      for (const [t, w] of pool) { x -= w; if (x < 0) { type = t; break; } }
      const vs = type === 'cup' ? r.pick(rivals.slice(0, 8)) : rivals[0];
      c.moment = { type, vs: vs.id, comp: type === 'cup' ? (lg.cup || 'Copa nacional') : lg.name };
    }
    save();
    return c.moment;
  };

  // Parâmetros do minigame, todos vindos da carta
  S.kickSetup = function (c, type) {
    const E = S.eff(c);
    const fk = type === 'classico';
    const lv = id => (c.traits.includes(id) ? lvOf(c, id) : 0);
    // Mira: um vaivém completo leva de 1,0 s (FIN baixa) a ~2,1 s (FIN alta); Chute Colocado deixa mais lenta
    // Na falta a mira corre mais (colocar a bola é mais difícil); Bola Parada devolve parte do tempo
    const period = clamp((1.0 + (E.fin - 45) * 0.022 + lv('colocado') * 0.12) * (fk ? 0.78 : 1) + (fk ? lv('parada') * 0.12 : 0), 0.85, 2.3);
    // Tremedeira da mira: pressão do lance menos a frieza
    const pressure = type === 'classico' ? 0.6 : 1;
    const calm = clamp((E.fin - 45) / 110, 0, 0.45) + lv('frieza') * 0.18;
    const wobble = round1(clamp(pressure * (0.16 - calm * 0.2), 0, 0.16) * 100) / 100;
    // Alcance do goleiro diminui com a força do chute (FIN e FÍS).
    // Pênalti: raio em volta do ponto do mergulho (±0,55); o canto fica fora do alcance.
    // Falta: a bola demora mais, o goleiro chega mais longe.
    const power = (E.fin + E.fis * 0.5 - 75) / 300;
    const reach = clamp(0.3 - power * 0.5, 0.22, 0.3);
    const fkReach = clamp(0.6 - power, 0.4, 0.6) * 1.35;
    // Falta: altura da barreira (Bola Parada ensina a passar por cima dela)
    const wall = fk ? clamp(0.58 - lv('parada') * 0.05 - (E.pas - 50) / 400, 0.42, 0.58) : 0;
    // Chance ao deixar o jogo decidir (sem jogar)
    const chance = fk ? clamp(0.3 + (E.fin - 60) / 110 + lv('frieza') * 0.04 + lv('parada') * 0.07, 0.15, 0.7)
      : clamp(0.62 + (E.fin - 60) / 150 + lv('frieza') * 0.04 + lv('colocado') * 0.03, 0.4, 0.88);
    // Na falta, a barreira cobre o lado esquerdo do gol (a tela espelha quando for o direito)
    return { fk, period, wobble, reach, fkReach, wall, wallL: -0.8, wallR: -0.1, chance: Math.round(chance * 100) / 100 };
  };

  // Resultado de um chute travado em (x, y), com x de -1 a 1 entre as traves e y de 0 (chão) a 1 (travessão).
  // keeper: -1, 0 ou 1 (lado do mergulho; na falta o goleiro fica do lado sem barreira).
  S.kickResult = function (setup, x, y, keeper) {
    const ax = Math.abs(x);
    if (ax >= 0.97 && ax <= 1.03 && y <= 1.03) return { ok: false, why: 'trave' };
    if (y >= 0.97 && y <= 1.03 && ax <= 1) return { ok: false, why: 'trave' };
    if (ax > 1) return { ok: false, why: 'fora' };
    if (y > 1) return { ok: false, why: 'alto' };
    if (setup.fk && x <= setup.wallR && x >= setup.wallL && y < setup.wall) return { ok: false, why: 'barreira' };
    const high = y > 0.7 ? 0.72 : 1; // perto do ângulo ele alcança menos
    if (setup.fk) {
      // Falta: goleiro perto do meio, do lado sem barreira
      if (Math.abs(x - 0.4) < (setup.fkReach || setup.reach * 1.35) * high) return { ok: false, why: 'defesa' };
      return { ok: true, why: 'gol' };
    }
    // Pênalti: mergulha para um lado (±0,55) ou fica no meio (só pega bola no meio e não muito alta)
    if (keeper === 0) return Math.abs(x) < 0.3 && y < 0.7 ? { ok: false, why: 'defesa' } : { ok: true, why: 'gol' };
    if (Math.abs(x - keeper * 0.55) < setup.reach * high) return { ok: false, why: 'defesa' };
    return { ok: true, why: 'gol' };
  };

  S.resolveMoment = function (c, ok) {
    if (!c.moment) return;
    c.mod.moment = Object.assign({}, c.moment, { ok: !!ok });
    c.moment = null;
  };
  // Sem jogar: sorteia com a chance mostrada
  S.autoMoment = function (c) {
    const { r, save } = rngOf(c);
    const ok = r() < S.kickSetup(c, c.moment.type).chance;
    save();
    S.resolveMoment(c, ok);
    return ok;
  };

  // ---------- Copa do Mundo (a cada 4 anos, depois da temporada) ----------
  const WC_STAGES = ['Grupo · 1º jogo', 'Grupo · 2º jogo', 'Grupo · 3º jogo', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  S.WC_STAGES = WC_STAGES;
  S.YEAR0 = 2026;
  // A temporada que acabou de terminar leva o ano para YEAR0 + c.season; Copa em 2030, 2034, 2038...
  S.isWcYear = c => c.season > 0 && (S.YEAR0 + c.season) % 4 === 2;
  // Nota mínima para a convocação: seleções fortes exigem mais
  S.wcCut = nation => (nation.str >= 86 ? 79 : nation.str >= 82 ? 76 : 73);
  S.wcCall = function (c) {
    const nation = D.NATION_BY_NAME[c.country];
    const cut = S.wcCut(nation), o = S.ovr(c);
    const called = c.age >= 18 && c.age <= 37 && o >= cut;
    return { nation, cut, called, starter: o >= cut + 5 };
  };

  function wcMatch(c, run, opp, r) {
    const nation = D.NATION_BY_NAME[run.nation], o = S.ovr(c);
    // O craque puxa a seleção: cada ponto de nota acima de 76 vale 0,3 de força (titular)
    const T = nation.str + (o - 76) * 0.3 * run.share;
    // Copa é equilibrada: diferença de força pesa menos que nos clubes
    const lu = 0.72 * Math.exp((T - opp.str) / 22), lt = 1.3 * Math.exp((opp.str - T) / 22);
    const gf = r.poisson(lu), ga = r.poisson(lt);
    // Participação nos gols da seleção
    const q = clamp((o - 60) / 25, 0.3, 1.4);
    const pg = run.share * (c.pos === 'ATA' ? 0.4 : 0.2) * q;
    const pa = run.share * (c.pos === 'ATA' ? 0.18 : 0.34) * q;
    let g = 0, a = 0;
    for (let i = 0; i < gf; i++) { const x = r(); if (x < pg) g++; else if (x < pg + pa) a++; }
    return { opp: opp.name, flag: opp.flag, gf, ga, g, a };
  }

  S.wcStart = function (c) {
    const { r, save } = rngOf(c);
    const call = S.wcCall(c);
    const pool = D.NATIONS.filter(n => n.name !== c.country);
    const pickFrom = f => { const p = pool.filter(n => f(n) && !used.includes(n.name)); const n = r.pick(p.length ? p : pool); used.push(n.name); return n.name; };
    const used = [];
    // Grupo: um forte, um médio, um mais fraco
    const group = [pickFrom(n => n.str >= 83), pickFrom(n => n.str >= 76 && n.str < 83), pickFrom(n => n.str < 76)];
    c.wcRun = { year: S.YEAR0 + c.season, nation: c.country, cut: call.cut, starter: call.starter, share: call.starter ? 0.92 : 0.45,
      group, used, games: [], stage: 0, pts: 0, out: false, champion: false, pending: null, g: 0, a: 0,
      groupMoment: r.int(0, 2) }; // um jogo do grupo tem lance decisivo; no mata-mata, todos
    save();
    return c.wcRun;
  };

  // Próximo jogo. Retorna o jogo; se for mata-mata empatado, game.pens = true e espera S.wcPens.
  // Próximo jogo. Três saídas possíveis:
  //  game.live  → lance decisivo no fim do jogo: espera S.wcMoment (minigame) antes de fechar o placar
  //  game.pens  → mata-mata empatado: espera S.wcPens (você bate o último pênalti)
  //  senão       → jogo encerrado
  S.wcNext = function (c) {
    const run = c.wcRun;
    if (!run || run.out || run.champion || run.pending || run.live) return null;
    const { r, save } = rngOf(c);
    let opp;
    if (run.stage < 3) opp = D.NATION_BY_NAME[run.group[run.stage]];
    else {
      // Mata-mata: adversários cada vez mais fortes
      const want = 82 + (run.stage - 3) * 2;
      const pool = D.NATIONS.filter(n => n.name !== c.country && !run.used.includes(n.name) && n.str >= want);
      opp = r.pick(pool.length ? pool : D.NATIONS.filter(n => n.name !== c.country));
      run.used.push(opp.name);
    }
    const game = wcMatch(c, run, opp, r);
    game.stage = WC_STAGES[run.stage];
    run.games.push(game);
    const groupMoment = run.groupMoment === undefined ? 2 : run.groupMoment;
    if (run.stage >= 3 || run.stage === groupMoment) {
      // Lance decisivo nos minutos finais: pênalti ou falta a favor
      game.live = true;
      game.moment = { type: r() < 0.55 ? 'pen' : 'fk', minute: 72 + r.int(0, 18) };
      run.live = true;
    } else wcClose(c, game, r);
    save();
    return game;
  };

  // Fecha o placar: nota do jogo, pontos do grupo ou mata-mata
  function wcClose(c, game, r) {
    const run = c.wcRun;
    run.g += game.g; run.a += game.a;
    const res = game.gf > game.ga ? 0.35 : game.gf < game.ga ? -0.25 : 0;
    game.rating = round1(clamp(6.2 + game.g * 0.9 + game.a * 0.5 + res + (game.momentOk ? 0.4 : game.momentOk === false ? -0.3 : 0) + r.gauss() * 0.3, 5, 10));
    game.motm = game.rating >= 8;
    if (run.stage < 3) {
      run.pts += game.gf > game.ga ? 3 : game.gf === game.ga ? 1 : 0;
      if (run.stage === 2) {
        // Passa com 5+ pontos; com 4 quase sempre; com 3 às vezes (saldo)
        const pass = run.pts >= 5 || (run.pts === 4 && r() < 0.8) || (run.pts === 3 && r() < 0.35);
        game.groupEnd = { pts: run.pts, pass };
        if (!pass) wcEnd(c, 'Fase de grupos');
      }
      run.stage++;
    } else if (game.gf === game.ga) {
      game.pens = true;
      run.pending = true; // decide nos pênaltis: você bate o último
    } else wcAdvance(c, game.gf > game.ga);
  }

  // Resultado do lance decisivo (minigame ou chance)
  S.wcMoment = function (c, ok) {
    const run = c.wcRun;
    if (!run || !run.live) return;
    const { r, save } = rngOf(c);
    const game = run.games[run.games.length - 1];
    run.live = false; run.momentStarted = false;
    game.live = false;
    game.momentOk = !!ok;
    if (ok) { game.gf++; game.g++; }
    wcClose(c, game, r);
    save();
  };
  S.wcMomentType = c => (c.wcRun && c.wcRun.live ? c.wcRun.games[c.wcRun.games.length - 1].moment.type : null);
  S.wcMomentAuto = function (c) {
    const { r, save } = rngOf(c);
    const ok = r() < S.kickSetup(c, S.wcMomentType(c) === 'fk' ? 'classico' : 'cup').chance;
    save();
    S.wcMoment(c, ok);
    return ok;
  };

  function wcAdvance(c, won) {
    const run = c.wcRun;
    if (!won) return wcEnd(c, WC_STAGES[run.stage]);
    if (run.stage === 6) { run.champion = true; return wcEnd(c, 'Campeão'); }
    run.stage++;
  }

  S.wcPens = function (c, ok) {
    const run = c.wcRun;
    if (!run || !run.pending) return;
    run.pending = false;
    run.games[run.games.length - 1].pensWon = !!ok;
    wcAdvance(c, !!ok);
  };
  S.wcPensAuto = function (c) {
    const { r, save } = rngOf(c);
    const ok = r() < S.kickSetup(c, 'cup').chance;
    save();
    S.wcPens(c, ok);
    return ok;
  };

  function wcEnd(c, reached) {
    const run = c.wcRun;
    run.out = !run.champion;
    run.reached = reached;
    c.totals.wcApps = (c.totals.wcApps || 0) + 1;
    c.totals.wcGoals = (c.totals.wcGoals || 0) + run.g;
    c.fame += run.g * 2 + (run.champion ? 60 : run.stage >= 5 ? 15 : 0);
    if (run.champion) {
      c.totals.wc = (c.totals.wc || 0) + 1;
      c.trophies['Copa do Mundo'] = c.trophies['Copa do Mundo'] || { type: 'wc', n: 0 };
      c.trophies['Copa do Mundo'].n++;
      c.wcBoost = 22; // pesa na Bola de Ouro da próxima temporada
    }
    c.wcHist = c.wcHist || [];
    c.wcHist.push({ year: run.year, nation: run.nation, reached, g: run.g, a: run.a, champion: run.champion });
  }
  S.wcDone = c => !c.wcRun || c.wcRun.out || c.wcRun.champion;

  // ---------- temporada ----------
  const AGE_GROWTH = age => (age <= 20 ? 0.24 : age <= 23 ? 0.17 : age <= 26 ? 0.08 : age <= 29 ? 0.02 : 0);
  const AGE_DECLINE = age => (age <= 30 ? 0 : age <= 32 ? 1.8 : age <= 34 ? 3.5 : 5);

  S.playSeason = function (c) {
    const { r, save } = rngOf(c);
    const club = D.CLUB_BY_ID[c.club];
    const lg = D.LEAGUE_BY_ID[club.league];
    const E = S.eff(c);
    const ovr0 = S.ovr(c);
    const role = S.role(c, club);

    // Lesão: risco base + idade + eventos
    let injShare = c.mod.inj;
    // Físico alto protege de lesões
    // ~6% por temporada no auge físico; sobe com a idade (a partir dos 30) e com FÍS baixo
    const injRisk = clamp((0.065 + Math.max(0, c.age - 30) * 0.02) * clamp(1 - (E.fis - 60) / 90, 0.6, 1.25) * (1 - 0.25 * (c.inv.fisio || 0)), 0.02, 0.4);
    let injName = null;
    if (r() < injRisk) {
      injShare = Math.max(injShare, r.range(0.08, 0.32));
    }
    if (injShare > 0) injName = r.pick(['lesão na coxa', 'entorse no tornozelo', 'lesão no joelho', 'problema muscular']);

    if (c.farewell) c.mod.min += 0.1; // temporada de despedida: o técnico faz questão
    let share = clamp(role.share + c.mod.min + (c.rel.coach - REL0) / 250 + (c.age <= 17 ? -0.2 : 0), 0.05, 0.97);
    share *= 1 - injShare;
    const maxGames = 38 + (club.tier >= 3 ? 8 : 4);
    const games = Math.max(0, Math.round(maxGames * share));

    // Produção por jogo
    const o = ovr0;
    const teamF = 0.85 + (club.strength - D.TIERS[club.tier].min) * 0.02;
    const form = 1 + c.mod.form + r.gauss() * 0.08;
    // Gols saem da finalização (e do que ajuda a chegar nela); assistências, do passe e do drible
    const gA = E.fin * 0.5 + E.rit * 0.2 + E.dri * 0.15 + E.fis * 0.15;
    const aA = E.pas * 0.55 + E.dri * 0.25 + E.rit * 0.1 + E.fin * 0.1;
    let g90 = (c.pos === 'ATA' ? 0.1 + Math.max(0, gA - 45) * 0.0125 : 0.04 + Math.max(0, gA - 45) * 0.0055);
    let a90 = (c.pos === 'ATA' ? 0.04 + Math.max(0, aA - 45) * 0.0045 : 0.06 + Math.max(0, aA - 45) * 0.0075);
    g90 *= 1.14 * teamF * form * (1 + c.mod.goal);
    a90 *= 1.22 * teamF * form * (1 + c.mod.assist);

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
    const rating = games ? clamp(round1(6.1 + perGame * 2.4 + (o - club.strength) * 0.03 + r.gauss() * 0.25), 5.0, 9.6) : 0;

    // Títulos: força do time + sua contribuição
    const contrib = games ? (rating - 6.5) * share * 2.2 : 0;
    const sEff = club.strength + contrib;
    const leagueClubs = D.CLUBS.filter(x => x.league === club.league);
    const top = Math.max(...leagueClubs.map(x => x.strength));
    // Defesa e físico pesam nos jogos grandes
    const titleBonus = (c.captain ? 0.08 : 0) + clamp((E.def + E.fis - 75) / 220, 0, 0.22);
    const pLeague = clamp(0.02 + (sEff - top + 4) / 16 + titleBonus * 0.6, 0.01, 0.55);
    const pCup = clamp(pLeague * 0.5 + 0.03 + titleBonus * 0.3, 0.02, 0.4);
    let league = r() < pLeague;
    let cup = r() < pCup;
    // Jogo decisivo (minigame) manda no resultado
    const M = c.mod.moment || null;
    if (M && M.type === 'cup') cup = M.ok;
    if (M && M.type === 'title') league = M.ok;
    if (M && M.ok) goals += 1;
    const pCont = club.tier >= 3 ? clamp((sEff - 80) / 40 + titleBonus * 0.3, 0.01, 0.25) * (club.tier === 5 ? 1 : club.tier === 4 ? 0.4 : 0.25) : 0;
    const cont = club.tier >= 3 && r() < pCont;
    const contName = ['bra-a', 'arg'].includes(club.league) ? 'Libertadores' : club.tier >= 4 ? 'Liga dos Campeões' : null;
    const titles = [];
    if (league) titles.push({ id: 'league', name: lg.name });
    if (cup) titles.push({ id: 'cup', name: lg.cup || 'Copa nacional' });
    if (cont && contName) titles.push({ id: 'cont', name: contName });
    // Tabela de 20 times: os rivais da liga mais times "de fora da lista" na faixa de baixo.
    // Cada um soma pontos em 38 rodadas pela força; a posição sai da comparação com todos.
    const others = leagueClubs.filter(x => x.id !== club.id).map(x => x.strength);
    const lo = Math.min(...leagueClubs.filter(x => x.id !== club.id).map(x => x.strength));
    for (let i = 0; others.length < 19; i++) others.push(lo - 1 + (i * 7) % 8);
    const avg = (others.reduce((a2, x) => a2 + x, 0) + club.strength) / 20;
    const ppg = x => clamp(1.35 + (x - avg) / 12, 0.5, 2.55);
    let pts = Math.round(38 * ppg(sEff) + r.gauss() * 4);
    const otherPts = others.map(x => Math.round(38 * ppg(x) + r.gauss() * 4));
    let leaderPts = Math.max(...otherPts), pos;
    if (league) { pts = Math.max(pts, leaderPts + 1 + Math.floor(r() * 3)); leaderPts = pts; pos = 1; }
    else if (M && M.type === 'title') { pos = 2; leaderPts = pts + 1 + Math.floor(r() * 2); } // vice por pouco
    else {
      pos = 1 + otherPts.filter(p => p >= pts).length;
      if (pos === 1) { pos = 2; leaderPts = pts + 1 + Math.floor(r() * 3); } // não foi campeão: alguém passou na frente
    }
    const table = { pos, pts, gap: league ? 0 : Math.max(1, leaderPts - pts), league: lg.name };
    // Acesso / rebaixamento pela posição final
    const LD = D.LADDER[club.league];
    let move = null;
    if (LD && LD.up && pos <= LD.promo) move = { dir: 'up', to: LD.up };
    else if (LD && LD.down && pos > 20 - LD.releg) move = { dir: 'down', to: LD.down };
    if (move) move.toName = D.LEAGUE_BY_ID[move.to].name;
    // Jogos marcantes (rivais da própria liga)
    const rivals = leagueClubs.filter(x => x.id !== club.id);
    const rival = rivals.length ? rivals.slice().sort((x, y) => y.strength - x.strength)[0] : null;
    const other = rivals.length ? r.pick(rivals) : null;
    if (M) {
      const vsName = D.CLUB_BY_ID[M.vs].name;
      const hl = {
        cup: M.ok ? '⚽ Seu pênalti decidiu a final da ' + M.comp + ' contra ' + D.o(vsName) : '😞 Pênalti perdido na final da ' + M.comp + ' contra ' + D.o(vsName),
        title: M.ok ? '⚽ Pênalti convertido na última rodada: título contra ' + D.o(vsName) : '😞 Pênalti perdido na última rodada contra ' + D.o(vsName) + ': vice',
        classico: M.ok ? '🎯 Gol de falta no clássico contra ' + D.o(vsName) : '🧱 Falta desperdiçada no clássico contra ' + D.o(vsName),
      }[M.type];
      highlights.unshift(hl);
    }
    if (league && rival && !(M && M.type === 'title')) highlights.push('🏆 Título garantido na última rodada contra ' + D.o(rival.name));
    if (cup && other && !(M && M.type === 'cup')) highlights.push('🏆 Final da ' + (lg.cup || 'copa') + ' contra ' + D.o(other.name) + (goals > 5 ? ': gol seu!' : ''));
    if (cont && contName) highlights.push('🌍 Campeão da ' + contName + '!');
    if (!league && rival && games >= 10 && goals + assists >= 8) highlights.push('⚔️ Decidiu o clássico contra ' + D.o(rival.name));
    if (!league && pos >= 14 && games >= 10 && !move) highlights.push('😰 Temporada de sufoco na parte de baixo da tabela');

    // Prêmios
    const awards = [];
    const scorerLine = 17 + club.tier * 2 + r.range(-3, 3);
    if (goals >= scorerLine && c.pos === 'ATA') awards.push({ id: 'scorer', name: 'Artilheiro ' + D.da(lg.name) });
    if (c.pos === 'MEI' && assists >= 14 + club.tier + r.range(-2, 2)) awards.push({ id: 'scorer', name: 'Líder de assistências ' + D.da(lg.name) });
    if (c.age <= 21 && rating >= 7.2 && club.tier >= 3) awards.push({ id: 'young', name: 'Melhor jovem ' + D.da(lg.name) });
    if (rating >= 7.5 && games >= 20) awards.push({ id: 'team', name: 'Seleção ' + D.da(lg.name) });
    // Bola de Ouro: só em clubes de nível 4-5
    const bScore = goals + assists * 0.6 + titles.length * 8 + (cont ? 10 : 0) + (rating - 6) * 12 + (c.wcBoost || 0);
    c.wcBoost = 0;
    // Cada Bola de Ouro anterior aumenta a exigência (a concorrência cresce)
    const pBallon = club.tier >= 4 && o >= 87 ? clamp(1 / (1 + Math.exp(-(bScore - 92 - 9 * c.totals.ballon) / 7)) * (club.tier === 5 ? 0.6 : 0.2), 0, 0.6) : 0;
    const ballon = r() < pBallon;
    if (ballon) awards.push({ id: 'ballon', name: 'BOLA DE OURO' });

    // Fama
    const fame0 = c.fame;
    c.fame = Math.max(0, c.fame * 0.85 + (goals * 0.5 + assists * 0.35 + titles.length * 6 + awards.length * 6 + (ballon ? 30 : 0) + club.tier * 2) * (0.8 + c.rel.fans / 250));
    const coach0 = c.rel.coach, fans0 = c.rel.fans;
    if (games) {
      bump(c, 'coach', (rating - 6.6) * 10);
      bump(c, 'fans', (rating - 6.6) * 9 + titles.length * 6 + (M && M.type === 'classico' && M.ok ? 8 : 0) + (move ? (move.dir === 'up' ? 8 : -10) : 0) - (c.captain && rating < 6.8 ? 6 : 0));
    }
    c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans);

    // Evolução
    // Jogar muito e bem faz evoluir mais e pode até elevar o teto (potencial)
    const potUp = games >= 22 && rating >= 7.6 && c.age <= 26 ? (rating >= 8.2 ? 2 : 1) : 0;
    if (potUp) c.pot = Math.min(99, c.pot + potUp);
    const growth = (c.pot - ovrOf(c.attrs, c.pos)) * AGE_GROWTH(c.age) * (0.3 + share * 1.25);
    const decline = AGE_DECLINE(c.age) * S.declMult(c);
    const luck = r.gauss() * 1.2;
    const delta = growth - decline + luck;
    const w = D.POS[c.pos].w;
    for (const k in c.attrs) c.attrs[k] = clamp(c.attrs[k] + delta * (0.5 + w[k] * 2.2) + r.gauss() * 0.6, 20, 99);
    const ovr1 = S.ovr(c);
    if (ovr1 >= c.peak || !c.peakAttrs) c.peakAttrs = S.eff(c);
    c.peak = Math.max(c.peak, ovr1, o);
    // Por que a nota mudou (em pontos de nota geral, aproximados)
    const why = [];
    if (growth >= 0.5) why.push({ txt: games >= 30 ? games + ' jogos: muito tempo em campo' : games >= 15 ? games + ' jogos: evolução com minutos' : 'Poucos minutos: evoluiu pouco', v: Math.round(growth) });
    else if (c.age <= 26 && games < 15) why.push({ txt: 'Poucos minutos: evolução travada', v: Math.round(growth) });
    if (decline > 0) why.push({ txt: 'Idade (' + c.age + ' anos)' + (S.declMult(c) < 1 ? ', amenizada por Profissional' : ''), v: -Math.round(decline) });
    if (Math.abs(luck) >= 1) why.push({ txt: luck > 0 ? 'Fase boa nos treinos' : 'Fase ruim nos treinos', v: Math.round(luck) });
    if (potUp) why.push({ txt: 'Temporada brilhante elevou seu teto', v: 0, pot: true });

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
      highlights, event: c.lastEvent || null, table, why, farewell: !!c.farewell,
    };
    res.move = move;
    res.headlines = S.headlines(c, res);
    if (move) moveClub(c, club, move.to);
    c.seasons.push(res);
    c.age++;
    c.season++;
    c.contract = Math.max(0, c.contract - 1);
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
    if (s.move && s.move.dir === 'up') h.push('Acesso! ' + club + ' garante vaga ' + D.na(s.move.toName));
    if (s.move && s.move.dir === 'down') h.push('Rebaixamento: ' + club + ' cai ' + D.paraA(s.move.toName));
    if (s.titles.length >= 2) h.push('Temporada histórica: ' + club + ' leva ' + s.titles.length + ' taças');
    else if (s.titles.length) h.push(club + (D.fem(club) ? ' é campeã' : ' é campeão') + ' com ' + nick + ' em campo');
    if (s.goals >= 30) h.push(s.goals + ' gols: ' + nick + ' vira pesadelo das defesas');
    else if (s.assists >= 15) h.push('O garçom da liga: ' + s.assists + ' assistências de ' + nick);
    if (s.ovr1 - s.ovr0 >= 5) h.push(nick + ' não para de evoluir');
    if (s.ovr1 - s.ovr0 <= -4) h.push('Idade pesa? ' + nick + ' já não é o mesmo');
    if (s.injury >= 25) h.push('Lesão atrapalha temporada de ' + nick);
    if (s.games < 12 && !s.injury) h.push(nick + ' pede mais minutos ' + D.no(club));
    if (s.rating && s.rating < 6.3 && s.games >= 12) h.push('Torcida ' + D.do(club) + ' pega no pé de ' + nick);
    if (!h.length) h.push('Temporada regular de ' + nick + ' ' + D.no(club));
    return h.slice(0, 3);
  };

  // ---------- propostas ----------
  S.expectedTier = function (c) {
    const o = S.ovr(c);
    let t = o < 55 ? 1 : o < 63 ? 2 : o < 71 ? 3 : o < 79 ? 4 : 5;
    if (c.fame > 120 && t < 5) t++;
    return t;
  };

  const YEARS = { base: 3, up: 4, mid: 3, money: 2, home: 2, stay: 3 };
  function offerFrom(c, club, kind) {
    const role = S.role(c, club);
    let years = YEARS[kind] || 3;
    if (c.age >= 32) years = Math.min(years, 2);
    if (c.age >= 35) years = 1;
    let wage = S.wage(c, club);
    if (kind === 'money') wage = Math.max(wage, Math.round(c.wage * 2 / 1000) * 1000); // proposta de dinheiro paga ao menos o dobro
    return { club: club.id, kind, role: role.name, share: role.share, wage, years };
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
    const mine = x => D.countryOf(x) === c.country;
    if (academy) {
      // A base é sempre no país escolhido, nas divisões mais baixas dele
      const minT = Math.min(...D.CLUBS.filter(mine).map(x => x.tier));
      for (let i = 0; i < 3; i++) {
        const cl = pickClub(x => mine(x) && x.tier === minT) || pickClub(x => mine(x) && x.tier <= minT + 1) || pickClub(mine);
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
    // Jovem: o mercado do próprio país costuma chamar primeiro
    const homeFirst = c.age <= 21 && r() < 0.6;
    const mid = (homeFirst && pickClub(x => mine(x) && x.tier === t && x.strength <= o + 1)) ||
      pickClub(x => x.tier === t && x.strength <= o + 1) || pickClub(x => x.tier === Math.max(1, t - 1));
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
    c.contract = offer.years || 2;
  };

  // Janela abre quando o contrato acaba ou quando você pediu para sair.
  S.windowOpen = c => c.contract <= 0 || c.wantsOut;
  S.canRetire = c => c.age >= 33;
  S.canAnnounce = c => c.age >= 32 && !c.farewell;
  S.mustRetire = c => c.age >= 38 || (c.farewell && c.seasons.length && c.seasons[c.seasons.length - 1].farewell);
  S.announce = function (c) {
    c.farewell = true;
    bump(c, 'fans', 10);
  };

  // ---------- fim de carreira ----------
  S.finish = function (c) {
    c.retired = true;
    const T = c.totals;
    const titles = T.league + T.cup + T.cont;
    // Despedida: parar em alta rende pontos extras
    const lastS = c.seasons[c.seasons.length - 1];
    const bonus = [];
    if (lastS && lastS.farewell) {
      if (lastS.rating >= 7) bonus.push({ txt: 'Parou no auge (nota ' + lastS.rating.toFixed(1).replace('.', ',') + ' na despedida)', v: 80 });
      if (lastS.titles.length) bonus.push({ txt: 'Título na temporada de despedida', v: 60 });
      if ((c.fansBy[lastS.club] || 0) >= 70) bonus.push({ txt: 'Estádio lotado na despedida ' + D.no(D.CLUB_BY_ID[lastS.club].name), v: 40 });
    }
    const score = Math.round(T.goals + T.assists * 0.7 + titles * 12 + T.cont * 10 + T.ballon * 120 + (T.scorer + T.young + T.team) * 8 + c.peak * 2 + (T.wc || 0) * 150 + (T.wcGoals || 0) * 3 + bonus.reduce((a, b) => a + b.v, 0));
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
    else if (T.wc >= 1) verdict = T.wc > 1 ? 'Multicampeão do mundo' : 'Campeão do mundo';
    else if (T.ballon >= 1) verdict = 'Melhor do mundo';
    else if (T.goals >= 450) verdict = 'Artilheiro histórico';
    else if (idol && idol[1].seasons >= 8 && (c.fansBy[idol[0]] || 0) >= 75) verdict = 'Ídolo eterno ' + D.do(D.CLUB_BY_ID[idol[0]].name);
    else if (titles >= 14) verdict = 'Colecionador de taças';
    else if (c.peak < 66) verdict = 'Promessa que não vingou';
    else if (nClubs >= 11) verdict = 'Cigano da bola';
    else if (c.spells.filter(s => ['ara', 'usa'].includes(D.CLUB_BY_ID[s.club].league)).reduce((n, s) => n + s.seasons, 0) >= 3) verdict = 'Foi atrás do dinheiro';
    else if (c.spells.filter(s => D.CLUB_BY_ID[s.club].tier >= 4).reduce((n, s) => n + s.seasons, 0) >= 6) verdict = 'Estrela na Europa';
    else if ((c.trophies['Brasileirão'] || { n: 0 }).n >= 2) verdict = 'Rei do Brasileirão';
    else verdict = 'Carreira sólida';
    const grade = score >= 1300 ? 'S' : score >= 950 ? 'A' : score >= 650 ? 'B' : score >= 420 ? 'C' : 'D';
    const mainClub = idol ? idol[0] : c.club;
    return { score, verdict, grade, titles, nClubs, bonus, mainClub };
  };

  root.CRAQUE_SIM = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
