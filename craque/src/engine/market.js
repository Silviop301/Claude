// Propostas, contratos e transferências
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { REL0, bump, rngOf } = S._; // ajudantes do núcleo
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
      // Adaptável chega com Técnico e Torcida mais simpáticos
      const ad = Math.round(12 * S.tm(c, 'adaptavel'));
      c.rel = { coach: REL0 + ad, fans: (c.fansBy[club.id] ? Math.max(REL0, c.fansBy[club.id] - 10) : REL0) + ad };
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


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
