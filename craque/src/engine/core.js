// Motor do CRAQUE — núcleo: sorteio com semente, jogador, características, investimentos,
// papel no elenco, relação com clube e divisões. Sem DOM: roda no navegador e no Node.
// As outras partes (engine/*.js) acrescentam funções ao mesmo objeto S.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
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

  // Ajudantes usados pelas outras partes do motor
  S._ = { clamp, round1, rngOf, lvOf, bump, REL0, moveClub, ovrOf };

  root.CRAQUE_SIM = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
