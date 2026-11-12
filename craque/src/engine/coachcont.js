// Modo Treinador, copa continental (fase 2 do plano das copas, 2026-11-12; mapa: https://claude.ai/artifact/KKd2pScekLSktMdW6btRM8).
// Libertadores (América do Sul), Liga dos Campeões (Europa) e as Champions da Ásia, da Concacaf e da África.
// Quem entra: os primeiros da primeira divisão de cada país pela cota `S.CO_CONT.q` (Brasil 7, Argentina 6, Espanha,
// Inglaterra, Itália e Alemanha 4...), pela tabela da temporada passada; sem temporada passada no clube (carreira nova,
// clube novo), pela força dentro da liga. Os outros clubes entram pela força. 32 clubes (16 ou 8 onde há poucos):
// grupos de 4 com turno e returno (6 jogos), os 2 primeiros vão ao mata-mata em jogo único (o 1º do grupo em casa), final
// em campo neutro, empate no mata-mata vai para os pênaltis (S.coCupPens).
// Calendário (Silvio 12/11: "temos que alternar as competições"): cada jogo é numa quarta, nunca na mesma semana de um jogo
// da copa nacional (`at` desvia das rodadas de ss.cup.at). Nada da liga muda: não conta como rodada.
// ss.cont = { name, cf, tr (taça: lib/ucl), ids, n, g (grupos), grp ([[índices em ids] x4] por grupo), gr ([jogo 0-5][grupo]
//             = [r0, r1] alinhado com MD), at (rodada da liga antes de cada jogo), k (jogo de agora: 0-5 grupos, depois
//             mata-mata), br/res (mata-mata, como na copa nacional, k - 6), out ('g' caiu no grupo, ou o jogo do mata-mata),
//             champ, w (régua do prêmio), log }
// Nada gasta o sorteio da carreira: todo jogo do computador sai de um sorteio preso à temporada e ao jogo.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const L = () => S._.fcLib;
  const C = S.CO_CONT = {
    q: { sul: { 'bra-a': 7, arg: 6, uru: 3, col: 3, chi: 3, par: 3, ecu: 3, per: 2, bol: 2, ven: 2 },
         eur: { esp: 4, ing: 4, ita: 4, ale: 4, fra: 3, por: 3, ned: 2, tur: 2, bel: 2 },
         asia: { ara: 5, jpn: 4, kor: 4, qat: 3, aus: 3 }, conc: { mex: 8, usa: 8 }, caf: { mar: 4, egi: 4 } },
    q0: 1,                                    // país sem cota escrita
    names: { sul: 'Libertadores', eur: 'Liga dos Campeões', asia: 'Champions da Ásia', conc: 'Champions da Concacaf', caf: 'Champions da África' },
    sn: { sul: 'Libertadores', eur: 'Champions', asia: 'Champions', conc: 'Champions', caf: 'Champions' },
    // A segunda copa (fase 3, 12/11): quem fica logo abaixo da cota da primeira (q2 a mais na tabela). Sem segunda na Concacaf.
    q2: { sul: { 'bra-a': 6, arg: 6, q0: 3 }, eur: { esp: 3, ing: 3, ita: 3, ale: 3, fra: 2, por: 2, ned: 2, tur: 2, bel: 2, q0: 1 },
          asia: { ara: 3, jpn: 3, kor: 3, q0: 2 }, caf: { mar: 3, egi: 3, q0: 2 } },
    names2: { sul: 'Copa Sul-Americana', eur: 'Liga Europa', asia: 'Champions da Ásia 2', caf: 'Copa das Confederações' },
    sn2: { sul: 'Sul-Americana', eur: 'Liga Europa', asia: 'Ásia 2', caf: 'Confederações' },
    tr2: { sul: 'sula', eur: 'uel' },
    t2: { prize: 0.5, coins: { champ: 30, final: 10 }, fame: { champ: 6, final: 2, semi: 1 }, conf: 0.6 },
    // quando cada jogo acontece (fração da temporada): 6 do grupo e até 4 do mata-mata (o mata-mata menor usa os últimos)
    at: [0.08, 0.15, 0.23, 0.31, 0.38, 0.45, 0.58, 0.68, 0.79, 0.93],
    ko: ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final'],
    koS: ['Final', 'Semi', 'Quartas', 'Oitavas'],
    // prêmio em semanas da folha normal de um clube médio-alto do país (a mesma régua da copa nacional)
    prize: { v: 1.2, e: 0.4, grp: 4, ko: [5, 7, 10, 15] },   // ko: passar das oitavas, quartas, semi, final (do fim para trás pela chave)
    gateK: 1.4, gateKo: [1.5, 1.7, 1.9],      // a procura no jogo em casa: grupo e cada fase do mata-mata
    neutralGate: 0.6,
    lamT: 70,
    coins: { champ: 50, final: 15 },
    fame: { champ: 10, final: 4, semi: 2 },
    conf: { champ: 10, final: 5, semi: 3, grp: 2, out: -3 }
  };
  // Os 6 jogos do grupo (posições 0-3 no grupo; o primeiro de cada par manda): turno e returno
  const MD = C.md = [[[0, 1], [2, 3]], [[2, 0], [3, 1]], [[0, 3], [1, 2]], [[1, 0], [3, 2]], [[0, 2], [1, 3]], [[3, 0], [2, 1]]];
  const GL = 'ABCDEFGH';
  const ctOf = co => (co && co.ss && co.ss.cont) || null;
  const rngK = (co, tag) => S.rng(hash((co.seed || 0) + '|' + co.season + '|cont|' + tag));
  const str = (co, id) => D.CLUB_BY_ID[id].strength + (S.coClubDrift ? S.coClubDrift(co, id) : 0);
  const lgOf = (co, id) => (co.leagueOf || {})[id] || D.CLUB_BY_ID[id].league;
  const top = lg => S.coLgDepth(lg) === 0 && !/-\d$/.test(lg);
  const koN = ct => Math.round(Math.log2(ct.n / 2));      // fases do mata-mata
  S.coContPhase = (ct, k) => k < 6 ? 'Grupo ' + GL[S.coContGrpOf(ct)] + ' · ' + (k + 1) + 'ª rodada' : C.ko[koN(ct) - 1 - (k - 6)];
  S.coContPhaseShort = (ct, k) => k < 6 ? 'Grupo' : C.koS[koN(ct) - 1 - (k - 6)];
  S.coContIsFinal = (ct, k) => k === 6 + koN(ct) - 1;
  S.coContGrpOf = (ct, ix) => { const i = ix === undefined ? ct.me : ix; return ct.grp.findIndex(g => g.includes(i)); };
  S.coContName = cf => C.names[cf] || null;

  // Os clubes de cada liga da confederação do mais forte ao mais fraco (pelo mapa de ligas desta carreira)
  function byLeague(co, cf) {
    const out = {};
    D.CLUBS.forEach(c => { const lg = lgOf(co, c.id); if (top(lg) && S.confOf(lg) === cf) (out[lg] = out[lg] || []).push(c.id); });
    Object.keys(out).forEach(lg => out[lg].sort((a, b) => str(co, b) - str(co, a)));
    return out;
  }
  const quota = (cf, lg) => (C.q[cf] && C.q[cf][lg]) || C.q0;
  const quota2 = (cf, lg) => { const t = C.q2[cf]; return t ? (t[lg] || t.q0 || 0) : 0; };
  // O seu clube se classificou? Pela posição da temporada passada no mesmo clube e na mesma liga; senão pela força na liga.
  // Devolve 1 (a copa principal), 2 (a segunda: Sul-Americana, Liga Europa...) ou 0
  S.coContQualifies = function (co) {
    const club = D.CLUB_BY_ID[co.club]; if (!club) return 0;
    const lg = lgOf(co, club.id); if (!top(lg)) return 0;
    const cf = S.confOf(lg), q = quota(cf, lg), q2 = quota2(cf, lg), h = (co.hist || []).filter(x => x.s === co.season - 1 && x.club === co.club && !x.sacked).pop();
    const lgName = (D.LEAGUE_BY_ID[lg] || {}).name;
    const tierOf = pos => pos <= q ? 1 : pos <= q + q2 ? 2 : 0;
    const bl = byLeague(co, cf), t = h && h.league ? (h.league === lgName ? tierOf(h.pos) : 0) : tierOf((bl[lg] || []).indexOf(club.id) + 1 || 999);
    // A segunda copa só existe com 8 clubes ou mais na confederação
    if (t === 2 && Object.keys(bl).reduce((n, l) => n + Math.max(0, Math.min(bl[l].length - quota(cf, l), quota2(cf, l))), 0) < 8) return 0;
    return t;
  };

  // ---------- começo ----------
  S.coContStart = function (co) {
    const ss = co.ss; if (!ss || ss.cont !== undefined) return ss && ss.cont;
    ss.cont = null;
    const tier = co.club ? S.coContQualifies(co) : 0; if (!tier) return null;
    const lg0 = lgOf(co, co.club), cf = S.confOf(lg0), bl = byLeague(co, cf);
    let pool = [];
    Object.keys(bl).forEach(lg => { const a = tier === 1 ? 0 : quota(cf, lg), ids = bl[lg].slice(a, a + (tier === 1 ? quota(cf, lg) : quota2(cf, lg))); if (lg === lg0 && !ids.includes(co.club)) { if (ids.length) ids[ids.length - 1] = co.club; else ids.push(co.club); } pool = pool.concat(ids); });
    pool.sort((a, b) => str(co, b) - str(co, a));
    const n = pool.length >= 32 ? 32 : pool.length >= 16 ? 16 : pool.length >= 8 ? 8 : 0;
    if (!n) return null;
    let ids = pool.slice(0, n);
    if (!ids.includes(co.club)) ids[n - 1] = co.club;
    ids.sort((a, b) => str(co, b) - str(co, a));
    // Sorteio dos grupos: 4 potes pela força, e clubes do mesmo país separados quando dá
    const G = n / 4, r = rngK(co, 'grupos'), grp = Array.from({ length: G }, () => []);
    for (let p = 0; p < 4; p++) {
      const pot = ids.slice(p * G, p * G + G).map((_, i) => p * G + i);
      for (let i = pot.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pot[i], pot[j]] = [pot[j], pot[i]]; }
      const free = grp.map((_, g) => g);
      pot.forEach(ix => {
        const lg = lgOf(co, ids[ix]);
        let fi = free.findIndex(g => !grp[g].some(o => lgOf(co, ids[o]) === lg));
        if (fi < 0) fi = 0;
        grp[free[fi]].push(ix); free.splice(fi, 1);
      });
    }
    // Calendário: nunca na semana da copa nacional
    const R = ss.rounds.length, busy = new Set(ss.cup ? ss.cup.at.concat((ss.cup.at1 || []).filter(x => x != null)) : []), at = [];
    const fr = C.at.slice(0, 6).concat(C.at.slice(10 - Math.round(Math.log2(n / 2))));
    fr.forEach(f => {
      let x = Math.max(clamp(Math.round(R * f), 1, R - 1), at.length ? at[at.length - 1] + (at.length >= 6 ? 2 : 1) : 1);
      while (x <= R - 1 && busy.has(x)) x++;
      if (x > R - 1) x = Math.min(R - 1, at.length ? at[at.length - 1] + 1 : 1);
      at.push(x);
    });
    // Mata-mata em ida e volta, menos a final (como na Libertadores e na Liga dos Campeões): a ida na semana livre antes da volta
    at.forEach(x => busy.add(x));
    const at1 = at.map((_, k) => { if (k < 6 || k === at.length - 1) return null; const x = S._coLegs.legDay(at, k, busy); if (x != null) busy.add(x); return x; });
    let w = ss.cup && ss.cup.w;
    if (!w) { const all = S.cupField(D.CLUB_BY_ID[co.club]), ref = all[Math.min(5, all.length - 1)]; try { w = S.coGenSquad(ref, co.season, { rf: co.rf, lv: co.lv, season: co.season }).reduce((a, p) => a + p.wage, 0); } catch (e) { w = 0; } }
    const me = ids.indexOf(co.club);
    const t2 = tier === 2;
    ss.cont = { name: t2 ? C.names2[cf] : C.names[cf], sn: t2 ? C.sn2[cf] : C.sn[cf], tier, cf, tr: t2 ? (C.tr2[cf] || 'cup') : cf === 'sul' ? 'lib' : 'ucl', ids, n, g: G, grp, me,
      gr: MD.map(() => grp.map(() => [null, null])), at, at1, l1: at.map(() => []), k: 0, br: [], res: [], out: null, champ: null, w: Math.round((w || 0) * (t2 ? C.t2.prize : 1)), log: [] };
    return ss.cont;
  };
  const alive = (co, ct) => ct && ct.out === null && !ct.champ && !co.sacked && co.club === co.ss.club;
  const LG = S._coLegs, legOf = (ct, k) => LG.legOf(ct, k), l1Of = (ct, k) => LG.l1Of(ct, k), leg1Open = (ct, k) => k >= 6 && LG.leg1Open({ at1: ct.at1, l1: ct.l1, br: { [k]: ct.br[k - 6] } }, k);
  const due = (co, ct) => ct && ct.k < ct.at.length && co.ss.i >= (leg1Open(ct, ct.k) ? ct.at1[ct.k] : ct.at[ct.k]);
  const T2 = (ct, a, b) => (ct.tier === 2 ? b : a);
  // O seu jogo do grupo na rodada k: [g, f] (grupo e qual dos dois jogos)
  function myFx(ct, k) {
    const g = S.coContGrpOf(ct), p = ct.grp[g].indexOf(ct.me), f = MD[k].findIndex(pr => pr.includes(p));
    return [g, f];
  }
  const fxIds = (ct, k, g, f) => MD[k][f].map(p => ct.grp[g][p]);
  function simG(co, ct, k, g, f) {
    const [h, x] = fxIds(ct, k, g, f), r = rngK(co, 'g|' + k + '|' + g + '|' + f);
    const o = L().simple(r, ct.ids[h], ct.ids[x], str(co, ct.ids[h]), str(co, ct.ids[x]), C.lamT);
    ct.gr[k][g][f] = { gh: o.gh, ga: o.ga };
  }
  // Tabela do grupo: pontos, saldo, gols, e o sorteio preso ao clube no empate
  S.coContTable = function (co, g, ct) {
    ct = ct || ctOf(co); if (!ct) return [];
    const rows = ct.grp[g].map(ix => ({ ix, id: ct.ids[ix], j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, pts: 0 }));
    const row = ix => rows.find(r => r.ix === ix);
    MD.forEach((md, k) => md.forEach((pr, f) => {
      const o = ct.gr[k][g][f]; if (!o) return;
      const a = row(ct.grp[g][pr[0]]), b = row(ct.grp[g][pr[1]]);
      a.j++; b.j++; a.gf += o.gh; a.ga += o.ga; b.gf += o.ga; b.ga += o.gh;
      if (o.gh > o.ga) { a.v++; a.pts += 3; b.d++; } else if (o.gh < o.ga) { b.v++; b.pts += 3; a.d++; } else { a.e++; b.e++; a.pts++; b.pts++; }
    }));
    const tb = id => hash(co.seed + '|' + co.season + '|tb|' + id);
    return rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || tb(a.id) - tb(b.id));
  };
  // Os grupos fecharam: 1º de um grupo contra o 2º do vizinho
  function koBuild(co, ct) {
    const T = ct.grp.map((_, g) => S.coContTable(co, g, ct)), W = T.map(t => t[0].ix), Rn = T.map(t => t[1].ix), br = [];
    for (let i = 0; i < ct.g / 2; i++) br.push([W[2 * i], Rn[2 * i + 1]]);
    for (let i = 0; i < ct.g / 2; i++) br.push([W[2 * i + 1], Rn[2 * i]]);
    ct.br = [br]; ct.res = [[]];
    if (!br.some(p => p.includes(ct.me))) ct.out = 'g';
  }
  const kPair = (ct, q) => (ct.br[q] || []).findIndex(p => p.includes(ct.me));
  // Ida do mata-mata: na casa do 2º do grupo (o 1º manda a volta)
  function simK1(co, ct, q, j) {
    const [x, h] = ct.br[q][j], r = rngK(co, 'k1|' + q + '|' + j);
    const g = L().simple(r, ct.ids[h], ct.ids[x], str(co, ct.ids[h]), str(co, ct.ids[x]), C.lamT);
    if (!ct.l1) ct.l1 = ct.at.map(() => []);
    ct.l1[q + 6][j] = { gh: g.gh, ga: g.ga, h };
  }
  function simK(co, ct, q, j) {
    const [h, x] = ct.br[q][j], r = rngK(co, 'k|' + q + '|' + j), sh = str(co, ct.ids[h]), sx = str(co, ct.ids[x]);
    const g = L().simple(r, ct.ids[h], ct.ids[x], sh, sx, C.lamT), o = { gh: g.gh, ga: g.ga, h };
    if (legOf(ct, q + 6)) { if (!l1Of(ct, q + 6)[j]) simK1(co, ct, q, j); ct.res[q][j] = LG.legTie(ct.l1[q + 6][j], h, x, g, () => { const hw = r() < clamp(0.5 + (sh - sx) / 80, 0.3, 0.7), big = 3 + Math.floor(r() * 3), small = Math.max(0, big - 1 - Math.floor(r() * 2)); return hw ? [big, small] : [small, big]; }); return; }
    if (g.gh === g.ga) { const hw = r() < clamp(0.5 + (sh - sx) / 80, 0.3, 0.7), big = 3 + Math.floor(r() * 3), small = Math.max(0, big - 1 - Math.floor(r() * 2)); o.ph = hw ? big : small; o.px = hw ? small : big; o.w = hw ? h : x; }
    else o.w = g.gh > g.ga ? h : x;
    ct.res[q][j] = o;
  }
  function advance(co, ct) {
    const k = ct.k;
    if (k < 6) {
      if (ct.gr[k].some(g => g.some(o => !o))) return false;
      ct.k++;
      if (ct.k === 6) koBuild(co, ct);
      return true;
    }
    const q = k - 6, res = ct.res[q];
    if (res.filter(Boolean).length < ct.br[q].length) return false;
    const win = res.map(o => o.w);
    if (win.length === 1) ct.champ = ct.ids[win[0]];
    else { const nx = []; for (let i = 0; i < win.length; i += 2) nx.push([win[i], win[i + 1]]); ct.br.push(nx); ct.res.push([]); }
    ct.k++;
    return true;
  }
  function tick(co, all) {
    const ct = ctOf(co); if (!ct) return;
    while (ct.k < ct.at.length && (all || due(co, ct))) {
      const k = ct.k, live = !all && alive(co, ct);
      if (k < 6) {
        const [mg, mf] = myFx(ct, k), wait = live && !ct.gr[k][mg][mf];
        // Esperando o seu jogo: metade dos grupos joga na véspera (como terça e quarta); o seu grupo é na mesma noite
        ct.gr[k].forEach((gg, g) => gg.forEach((o, f) => { if (!o && !(wait && g === mg && f === mf) && (!wait || (g & 1) !== (mg & 1))) simG(co, ct, k, g, f); }));
        if (wait) return;
      } else {
        const q = k - 6, mj = kPair(ct, q), half = j => (j < ct.br[q].length / 2) !== (mj < ct.br[q].length / 2);
        if (leg1Open(ct, k)) {
          const w1 = live && mj >= 0 && !l1Of(ct, k)[mj];
          ct.br[q].forEach((_, j) => { if (!l1Of(ct, k)[j] && !(w1 && j === mj) && (!w1 || half(j))) simK1(co, ct, q, j); });
          if (w1) return;
          continue;
        }
        const wait = live && mj >= 0 && !ct.res[q][mj];
        ct.br[q].forEach((_, j) => { if (!ct.res[q][j] && !(wait && j === mj) && (!wait || (j < ct.br[q].length / 2) !== (mj < ct.br[q].length / 2))) simK(co, ct, q, j); });
        if (wait) return;
      }
      advance(co, ct);
    }
  }
  S.coContTick = tick;

  // ---------- o seu jogo ----------
  S.coContNext = function (co) {
    const ct = ctOf(co); if (!ct || !due(co, ct) || !alive(co, ct)) return null;
    const k = ct.k; let vs, home, fin = false, grp = null, leg = 0, agg = null;
    if (k < 6) {
      const [g, f] = myFx(ct, k); if (ct.gr[k][g][f]) return null;
      const [h, x] = fxIds(ct, k, g, f); vs = ct.ids[h === ct.me ? x : h]; home = h === ct.me; grp = GL[g];
    } else {
      const q = k - 6, j = kPair(ct, q); if (j < 0 || ct.res[q][j]) return null;
      const ida = leg1Open(ct, k); if (ida && l1Of(ct, k)[j]) return null;
      const [a, b] = ct.br[q][j]; vs = ct.ids[a === ct.me ? b : a]; fin = S.coContIsFinal(ct, k); home = ida ? b === ct.me : a === ct.me;
      if (legOf(ct, k)) { leg = ida ? 1 : 2; const l1 = l1Of(ct, k)[j]; if (!ida && l1) agg = l1.h === ct.me ? [l1.gh, l1.ga] : [l1.ga, l1.gh]; }
    }
    const c = { cont: 1, k, name: ct.name, ph: S.coContPhase(ct, k), sh: S.coContPhaseShort(ct, k), fin, grp };
    if (leg) { c.leg = leg; if (agg) c.agg = agg; }
    return { round: co.ss.i + 0.5, of: co.ss.rounds.length, vs, home, ult: co.board ? co.board.ult : null, neutral: fin && !leg, at: leg === 1 ? ct.at1[k] : ct.at[k], cup: c };
  };
  const next0 = S.coNext;
  S.coNext = function (co) {
    const c = S.coContNext(co); if (!c) return next0(co);
    const u = S.coCupNext(co), cup = co.ss.cup;
    return u && cup && u.at < c.at ? u : c;
  };

  function contEnd(co, m) {
    const ct = ctOf(co), k = m.cup.k, A = S._coAfter, gf = m.home ? m.gh : m.ga, ga = m.home ? m.ga : m.gh;
    const res = gf > ga ? 'v' : gf < ga ? 'd' : 'e', ko = k >= 6, leg = m.cup.leg || 0, agg = m.cup.agg;
    if (leg === 1) {   // ida do mata-mata: só guarda o placar
      const q = k - 6, j = kPair(ct, q), ycOut = A.afterGame(co, m, res);
      if (!ct.l1) ct.l1 = ct.at.map(() => []);
      ct.l1[k][j] = { gh: m.home ? gf : ga, ga: m.home ? ga : gf, h: m.home ? ct.me : ct.br[q][j].find(i => i !== ct.me) };
      const log = { cup: 1, cont: 1, leg: 1, tr: ct.tr, k, ph: S.coContPhase(ct, k), name: ct.name, r: m.round, vs: m.vs, home: m.home, gf, ga, res, ycOut, ev: m.ev.filter(e => e.t === 'gol' && e.s === 'us').map(e => e.p) };
      A.rateAfter(co, m, log, gf, ga);
      const fin = S.coFin ? S.coFin(co) : null;
      if (fin && m.home) { const g = Math.round((S.coGate ? S.coGate(co, m.vs) : 0) * (C.gateKo[k - 6 - (koN(ct) - 3)] || C.gateKo[0]) / 1000) * 1000; if (g > 0) { fin.caixa += g; fin.ss.bil = (fin.ss.bil || 0) + g; log.gate = g; } }
      ct.log.push(log);
      ct.br[q].forEach((_, jj) => { if (!l1Of(ct, k)[jj]) simK1(co, ct, q, jj); });
      A.xiAfter(co);
      if (S.coWorldSync) S.coWorldSync(co);
      return log;
    }
    const tf = gf + (agg ? agg[0] : 0), ta = ga + (agg ? agg[1] : 0);
    const pens = ko && tf === ta ? S.coCupPens(co, m) : null, win = pens ? pens.us > pens.them : tf > ta;
    const ycOut = A.afterGame(co, m, pens ? (win ? 'v' : 'd') : res);
    const log = { cup: 1, cont: 1, tr: ct.tr, k, ph: S.coContPhase(ct, k), name: ct.name, r: m.round, vs: m.vs, home: m.home, neutral: m.neutral, gf, ga, res, win, ycOut,
      pens: pens ? [pens.us, pens.them] : null, ev: m.ev.filter(e => e.t === 'gol' && e.s === 'us').map(e => e.p) };
    if (!ko) {
      const [g, f] = myFx(ct, k); log.grp = GL[g];
      ct.gr[k][g][f] = m.home ? { gh: gf, ga } : { gh: ga, ga: gf };
    } else {
      const q = k - 6, j = kPair(ct, q), [a] = ct.br[q][j], h = a, me = ct.me, vi = ct.br[q][j].find(i => i !== me);
      const o = { gh: h === me ? tf : ta, ga: h === me ? ta : tf, h, w: win ? me : vi };
      if (agg) { o.l1 = l1Of(ct, k)[j]; o.l2 = { gh: m.home ? gf : ga, ga: m.home ? ga : gf }; log.leg = 2; log.agg = [tf, ta]; }
      if (pens) { o.ph = h === me ? pens.us : pens.them; o.px = h === me ? pens.them : pens.us; }
      ct.res[q][j] = o;
    }
    A.rateAfter(co, m, log, gf, ga);
    const fin = S.coFin ? S.coFin(co) : null;
    if (fin) {
      const g0 = S.coGate ? S.coGate(co, m.vs) : 0, gk = ko ? (C.gateKo[k - 6 - (koN(ct) - 3)] || C.gateKo[0]) : C.gateK;
      const g = Math.round((m.neutral ? g0 * C.neutralGate : m.home ? g0 * gk : 0) / 1000) * 1000;
      if (g > 0) { fin.caixa += g; fin.ss.bil = (fin.ss.bil || 0) + g; log.gate = g; }
      const v = ko ? (win ? S.coContPrize(co, k) : 0) : res === 'v' ? S.coContPrize(co, 'v') : res === 'e' ? S.coContPrize(co, 'e') : 0;
      if (v) { fin.caixa += v; fin.ss.prem = (fin.ss.prem || 0) + v; log.prize = v; }
    }
    ct.log.push(log);
    // Os outros jogos dessa quarta, e o que vem depois
    if (!ko) ct.gr[k].forEach((gg, g) => gg.forEach((o, f) => { if (!o) simG(co, ct, k, g, f); }));
    else ct.br[k - 6].forEach((_, j) => { if (!ct.res[k - 6][j]) simK(co, ct, k - 6, j); });
    if (ko && !win) ct.out = k;
    advance(co, ct);
    if (k === 5) {
      const T = S.coContTable(co, S.coContGrpOf(ct)), pos = T.findIndex(r => r.ix === ct.me) + 1;
      log.gpos = pos; log.pass = ct.out === null;
      if (fin && log.pass) { const v = S.coContPrize(co, 'grp'); fin.caixa += v; fin.ss.prem = (fin.ss.prem || 0) + v; log.prize = (log.prize || 0) + v; }
    }
    if (co.board) {
      const B = co.board, d = k === 5 ? (log.pass ? C.conf.grp : C.conf.out) : !ko || !win ? 0 : S.coContIsFinal(ct, k) ? C.conf.champ : k === 6 + koN(ct) - 2 ? C.conf.final : k === 6 + koN(ct) - 3 ? C.conf.semi : 0;
      if (d) B.conf = clamp(B.conf + Math.round(d * T2(ct, 1, C.t2.conf)), 0, 100);
    }
    if (ct.champ === co.club) { co.titles.push({ s: co.season, name: ct.name, club: co.club, k: 'cont', tr: ct.tr }); log.champ = 1; }
    A.xiAfter(co);
    if (S.coWorldSync) S.coWorldSync(co);
    return log;
  }
  // Prêmio: 'v' vitória e 'e' empate no grupo, 'grp' passar do grupo, ou k = passar daquele jogo do mata-mata
  S.coContPrize = function (co, k) {
    const ct = ctOf(co); if (!ct) return 0;
    const P = C.prize, x = k === 'v' ? P.v : k === 'e' ? P.e : k === 'grp' ? P.grp : P.ko[4 - koN(ct) + (k - 6)] || 1;
    return Math.round((ct.w || 0) * x / 10000) * 10000;
  };
  // Prêmio de levantar a taça a partir de agora (mata-mata que falta)
  S.coContPrizeLeft = co => { const ct = ctOf(co); if (!ct) return 0; let t = 0; for (let k = Math.max(6, ct.k); k < 6 + koN(ct); k++) t += S.coContPrize(co, k); return t + (ct.k < 6 ? S.coContPrize(co, 'grp') : 0); };
  // Caminho até a taça (Semana): o grupo com a posição de agora e cada fase do mata-mata com quem pode vir
  S.coContPath = function (co) {
    const ct = ctOf(co); if (!ct || !alive(co, ct)) return null;
    const out = [];
    if (ct.k < 6) {
      const g = S.coContGrpOf(ct), T = S.coContTable(co, g);
      out.push({ grp: GL[g], ids: T.map(r => r.id), pos: T.findIndex(r => r.ix === ct.me) + 1, now: 1 });
      const nb = g ^ 1;
      for (let q = 0; q < koN(ct); q++) out.push({ k: 6 + q, sh: C.koS[koN(ct) - 1 - q], ids: [], vs: q === 0 ? '1º ou 2º do ' + GL[nb] : null });
      return out;
    }
    const q0 = ct.k - 6, j = kPair(ct, q0); if (j < 0) return null;
    out.push({ k: ct.k, sh: S.coContPhaseShort(ct, ct.k), ids: ct.br[q0][j].map(i => ct.ids[i]), now: 1 });
    for (let d = 1; q0 + d < koN(ct); d++) {
      const sz = 2 ** (d - 1), blk = Math.floor(j / sz) ^ 1, ids = [];
      for (let q = blk * sz; q < blk * sz + sz; q++) { const o = ct.res[q0][q], pr = ct.br[q0][q]; if (!pr) continue; if (o) ids.push(ct.ids[o.w]); else pr.forEach(i => ids.push(ct.ids[i])); }
      out.push({ k: ct.k + d, sh: C.koS[koN(ct) - 1 - q0 - d], ids });
    }
    return out;
  };
  // A chave do mata-mata no formato da copa nacional (para a mesma tela da chave): { ids, n, br, res, k, name }
  S.coContKo = function (co) {
    const ct = ctOf(co); if (!ct || ct.k < 6) return null;
    return { name: ct.name, ids: ct.ids, n: ct.n / 2, br: ct.br, res: ct.res, k: ct.k - 6, champ: ct.champ, l1: (ct.l1 || []).slice(6), at1: (ct.at1 || []).slice(6), out: typeof ct.out === 'number' ? ct.out - 6 : ct.out === 'g' ? 'g' : null, cont: 1 };
  };
  const tc0 = S.coTitleChance;
  S.coTitleChance = co => (S.coContNext(co) ? null : tc0(co));

  // ---------- ganchos ----------
  const start0 = S.coStart;
  S.coStart = function (co) { const r = start0.apply(this, arguments); S.coContStart(co); return r; };
  const end0 = S.coMatchEnd;
  S.coMatchEnd = function (co, m) {
    if (m && m.cup && m.cup.cont) return contEnd(co, m);
    const log = end0.apply(this, arguments); tick(co); return log;
  };
  const skip0 = S.coSkipRound;
  S.coSkipRound = function (co) { skip0.apply(this, arguments); tick(co); };
  const send0 = S.coSeasonEnd;
  S.coSeasonEnd = function (co) {
    const ss = co.ss;
    while (ss && !ss.done) S.coSkipRound(co);
    const ct = ctOf(co), club = co.club, sacked = co.sacked;
    if (ct) tick(co, true);
    let sum = null;
    if (ct && ct.ids[ct.me] === club) {
      const kn = koN(ct), me = ct.me;
      let best = 0; while (best < ct.res.length && (ct.res[best] || []).some(o => o && o.w === me)) best++;
      const inKo = (ct.br[0] || []).some(p => p.includes(me));
      const ph = ct.champ === club ? 'campeão' : !inKo ? 'caiu nos grupos' : best === kn - 1 ? 'vice' : 'caiu ' + (best === kn - 2 ? 'na ' : 'nas ') + C.ko[kn - 1 - best].toLowerCase();
      sum = { name: ct.name, champ: ct.champ, won: ct.champ === club, ko: inKo, best: inKo ? best : -1, kn, ph, tr: ct.tr, tier: ct.tier || 1 };
    }
    const out = send0.apply(this, arguments);
    if (sum && out && out.club === club) {
      out.cont = sum;
      const FM = sum.tier === 2 ? C.t2.fame : C.fame, CN = sum.tier === 2 ? C.t2.coins : C.coins;
      const f = sum.won ? FM.champ : sum.best === sum.kn - 1 ? FM.final : sum.best === sum.kn - 2 ? FM.semi : 0;
      if (f && !sacked) { co.fame = clamp(co.fame + f, 0, 100); if (out.fame) out.fame[1] = co.fame; }
      if (sum.won && !sacked) { co.xp.pts += 1; out.xp = (out.xp || 0) + 1; }
      if (!sacked && out.coins) { if (sum.won) out.coins.push({ k: 'cont', t: sum.name, n: CN.champ }); else if (sum.best === sum.kn - 1) out.coins.push({ k: 'cont', t: 'Final da ' + sum.name, n: CN.final }); }
      const hh = co.hist[co.hist.length - 1]; if (hh && hh.s === out.season) hh.cont = sum.ph;
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
