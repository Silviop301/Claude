// Propostas, contratos e transferências
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { REL0, bump, rngOf } = S._; // ajudantes do núcleo
  // ---------- propostas ----------
  S.expectedTier = function (c) {
    const o = S.ovr(c);
    let t = o < 55 ? 1 : o < 63 ? 2 : o < 71 ? 3 : o < 79 ? 4 : 5;
    if (c.fame >= 150 && t < 5) t++; // Astro: o mercado olha um nível acima
    return t;
  };

  const YEARS = { base: 3, up: 4, mid: 3, money: 2, home: 2, stay: 3, ask: 3 };
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
    // Fama aumenta a chance de um clube ainda maior aparecer
    const up = pickClub(x => x.tier === Math.min(5, t + (r() < 0.35 + Math.min(0.4, c.fame / 500) ? 1 : 0)) && x.strength >= o - 6);
    if (up) out.push(offerFrom(c, up, 'up'));
    // 2) Mesmo nível, papel de protagonista
    // Jovem: o mercado do próprio país costuma chamar primeiro
    const homeFirst = c.age <= 21 && r() < 0.6;
    const mid = (homeFirst && pickClub(x => mine(x) && x.tier === t && x.strength <= o + 1)) ||
      pickClub(x => x.tier === t && x.strength <= o + 1) || pickClub(x => x.tier === Math.max(1, t - 1));
    if (mid) out.push(offerFrom(c, mid, 'mid'));
    // 3) Especial: dinheiro, volta ao clube do coração ou aposta
    let sp = null;
    if (c.age >= 27 && r() < 0.5) sp = pickClub(x => D.MONEY.includes(x.league));
    if (!sp && c.age >= 30 && c.firstClub && !used.has(c.firstClub) && (c.fansBy[c.firstClub] || 0) >= 60 && r() < 0.6) { sp = D.CLUB_BY_ID[c.firstClub]; used.add(sp.id); }
    if (!sp) sp = pickClub(x => x.tier === Math.max(1, t - 1));
    if (sp) out.push(offerFrom(c, sp, sp.id === c.firstClub ? 'home' : D.MONEY.includes(sp.league) ? 'money' : 'mid'));
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

  // Proposta de um clube específico (eventos): mesmo cálculo de papel, salário e anos da janela
  S.offerFor = function (c, clubId, kind, wage) {
    const o = offerFrom(c, D.CLUB_BY_ID[clubId], kind || 'up');
    if (wage) o.wage = wage;
    return o;
  };
  // Situação atual, para comparar com uma proposta
  S.currentDeal = function (c) {
    const club = D.CLUB_BY_ID[c.club], role = S.role(c, club);
    return { club: club.id, kind: 'now', role: role.name, share: role.share, wage: c.wage, years: c.contract };
  };

  // Propostas da janela ficam guardadas (reabrir a tela não sorteia de novo).
  // Uma vez por janela dá para pedir novas propostas e uma vez pedir um país/liga ao empresário.
  S.windowState = function (c, academy) {
    const key = academy ? 'base' : c.season;
    if (!c.win || c.win.key !== key) c.win = { key, offers: S.offers(c, !!academy), reroll: 0, ask: 0, askMsg: null };
    return c.win;
  };
  S.rerollOffers = function (c, academy) {
    const w = S.windowState(c, academy);
    if (w.reroll >= 1) return false;
    const before = new Set(w.offers.map(o => o.club));
    // Evita repetir os mesmos clubes: tenta algumas vezes
    let next = S.offers(c, !!academy);
    for (let i = 0; i < 4 && next.some(o => before.has(o.club)); i++) next = S.offers(c, !!academy);
    w.offers = next;
    w.reroll++;
    return true;
  };
  // Pedido ao empresário: um clube da liga escolhida que te queira. Chance pela nota (e fama) contra a força do clube.
  S.askChance = function (c, leagueId) {
    const o = S.ovr(c), fame = Math.min(4, c.fame / 50);
    const pool = D.CLUBS.filter(x => x.league === leagueId && x.id !== c.club);
    if (!pool.length) return 0;
    const best = Math.max(...pool.filter(x => x.strength <= o + 4 + fame).map(x => x.strength), -1);
    return best < 0 ? 0.05 : clampN(0.45 + (o + fame - best) / 14, 0.15, 0.95);
  };
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  S.askLeague = function (c, leagueId) {
    const w = S.windowState(c);
    if (w.ask >= 1) return null;
    w.ask++;
    const { r, save } = rngOf(c);
    const lg = D.LEAGUE_BY_ID[leagueId], o = S.ovr(c), fame = Math.min(4, c.fame / 50);
    const pool = D.CLUBS.filter(x => x.league === leagueId && x.id !== c.club && !w.offers.some(of => of.club === x.id));
    // Clubes que te querem: até um pouco acima do seu nível (a fama ajuda)
    const want = pool.filter(x => x.strength <= o + 4 + fame).sort((a, b) => b.strength - a.strength);
    const ok = want.length && r() < S.askChance(c, leagueId);
    save();
    if (!ok) {
      w.askMsg = want.length ? 'Seu empresário ligou para os clubes ' + D.da(lg.name) + ', mas ninguém fechou desta vez.' : 'Os clubes ' + D.da(lg.name) + ' acham que você ainda não tem nível para eles.';
      return { ok: false, msg: w.askMsg };
    }
    // Dois clubes (quando houver): um da metade de cima de quem te quer e outro de qualquer parte da lista,
    // para não cair sempre nos mesmos gigantes
    const topHalf = want.slice(0, Math.max(1, Math.ceil(want.length / 2)));
    const first = r.pick(topHalf);
    const rest = want.filter(x => x.id !== first.id);
    const picked = [first].concat(rest.length ? [r.pick(rest)] : []);
    save();
    const offers = picked.map(cl => offerFrom(c, cl, 'ask'));
    offers.forEach(o => w.offers.push(o));
    w.askMsg = offers.length > 1 ? D.O(picked[0].name) + ' e ' + D.o(picked[1].name) + ' aceitaram conversar: duas propostas na mesa!' : D.O(picked[0].name) + ' aceitou conversar: proposta na mesa!';
    return { ok: true, offers, offer: offers[0], msg: w.askMsg };
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

  // ---------- pouco espaço no elenco ----------
  // Depois de uma temporada com poucos jogos (e ainda com contrato), o jogador pode reagir:
  // empréstimo (jovem, clube grande), conversa com o técnico ou pedido para sair.
  S.BENCH_GAMES = 15;
  S.benchCase = function (c) {
    const last = c.seasons[c.seasons.length - 1];
    if (!last || !c.club || c.loan || S.windowOpen(c) || S.mustRetire(c)) return null;
    if (last.club !== c.club || last.games >= S.BENCH_GAMES || (last.injury || 0) >= 40) return null;
    if (c.squad && c.squad.key === c.season && c.squad.done) return null;
    if (!c.squad || c.squad.key !== c.season) c.squad = { key: c.season, loans: S.loanOffers(c), talk: null, done: false };
    return c.squad;
  };
  // Empréstimo: até os 27 anos, para um clube menor onde ele seria titular. O clube atual segue pagando o salário.
  S.loanOffers = function (c) {
    const cur = D.CLUB_BY_ID[c.club], o = S.ovr(c);
    if (c.age > 27 || cur.tier < 2) return [];
    const { r, save } = rngOf(c);
    const pool = D.CLUBS.filter(x => x.id !== cur.id && x.tier < cur.tier && x.strength <= o - 1 && x.strength >= o - 10); // titular garantido
    const out = [];
    for (let i = 0; i < 2 && pool.length; i++) {
      // Prefere clubes mais fortes dentro do que ainda dá titularidade
      pool.sort((a, b) => b.strength - a.strength + (r() - 0.5) * 6);
      const cl = pool.splice(0, 1)[0];
      const of = offerFrom(c, cl, 'loan');
      of.wage = c.wage; of.years = 1;
      out.push(of);
    }
    save();
    return out;
  };
  S.loanOut = function (c, offer) {
    const parent = c.club;
    c.fansBy[parent] = Math.max(c.fansBy[parent] || 0, c.rel.fans);
    c.loan = { parent, season: c.season, rel: Object.assign({}, c.rel), captain: c.captain, since: c.clubSince };
    const club = D.CLUB_BY_ID[offer.club];
    const ad = Math.round(12 * S.tm(c, 'adaptavel'));
    c.rel = { coach: REL0 + 5 + ad, fans: REL0 + ad };
    c.captain = false;
    c.club = club.id;
    c.clubSince = c.age;
    c.spells.push({ club: club.id, from: c.age, to: c.age, games: 0, goals: 0, assists: 0, titles: 0, loan: true });
    if (c.squad) c.squad.done = true;
  };
  // Fim do empréstimo (chamado no fim da temporada): volta ao clube dono do contrato.
  // Voltar bem avaliado melhora a relação com o técnico de lá.
  S.endLoan = function (c, res) {
    const L = c.loan;
    if (!L || L.season !== res.season) return null;
    c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans);
    const from = c.club;
    c.club = L.parent;
    c.rel = L.rel;
    c.captain = L.captain;
    c.clubSince = L.since;
    if (res.games >= 20 && res.rating >= 7) bump(c, 'coach', 10);
    c.spells.push({ club: L.parent, from: c.age, to: c.age, games: 0, goals: 0, assists: 0, titles: 0, back: true }); // volta de empréstimo (não é "voltar para casa")
    delete c.loan;
    return { from, to: L.parent };
  };
  // Conversa com o técnico: a chance cresce com a nota da temporada, a relação e a distância para o nível do time
  S.talkChance = function (c) {
    const last = c.seasons[c.seasons.length - 1] || {}, club = D.CLUB_BY_ID[c.club];
    const rating = last.games >= 5 ? last.rating : 6.6;
    const v = 0.35 + (rating - 6.6) * 0.35 + (c.rel.coach - REL0) / 150 + (S.ovr(c) - club.strength + 5) / 25;
    return clampN(v, 0.1, 0.85);
  };
  S.coachTalk = function (c) {
    const sq = S.benchCase(c);
    if (!sq || sq.talk) return sq && sq.talk;
    const { r, save } = rngOf(c);
    const ok = r() < S.talkChance(c);
    save();
    if (ok) { c.promise = 0.22; bump(c, 'coach', 3); }
    else bump(c, 'coach', -10);
    sq.talk = { ok, text: ok ? 'O técnico ouviu e prometeu mais minutos na próxima temporada. Agora é aproveitar.' : 'O técnico não gostou da cobrança. A relação esfriou e nada mudou.' };
    sq.done = true;
    return sq.talk;
  };
  S.askOut = function (c) {
    c.wantsOut = true;
    bump(c, 'fans', -5); bump(c, 'coach', -5);
    if (c.squad) c.squad.done = true;
  };
  S.stayAndFight = function (c) { if (c.squad) c.squad.done = true; };

  // Janela abre quando o contrato acaba ou quando você pediu para sair.
  S.windowOpen = c => c.contract <= 0 || c.wantsOut;
  S.canRetire = c => c.age >= 33;
  S.canAnnounce = c => c.age >= 32 && !c.farewell;
  // Fim obrigatório: aos 42 anos, ou antes (a partir dos 33) se a carta cair abaixo de 45
  S.RETIRE_AGE = 42; S.RETIRE_OVR = 45;
  S.mustRetire = c => c.age >= S.RETIRE_AGE || (c.age >= 33 && S.ovr(c) < S.RETIRE_OVR) || (c.farewell && c.seasons.length && c.seasons[c.seasons.length - 1].farewell);
  S.announce = function (c) {
    c.farewell = true;
    bump(c, 'fans', 10);
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
