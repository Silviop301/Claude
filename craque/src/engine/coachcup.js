// Modo Treinador, copa nacional (fase 1 do plano das copas, Silvio 2026-11-12: "conseguimos fazer as outras competições").
// Mapa e plano: https://claude.ai/artifact/KKd2pScekLSktMdW6btRM8
// A copa do país do seu clube (nome em D.LEAGUES[].cup): os 32 clubes mais fortes do país (S.cupField, como no Rumo ao Topo;
// país pequeno: chave de 16 ou 8), você sempre dentro, chave inteira sorteada no começo da temporada, jogo único, empate vai
// direto para os pênaltis, final em campo neutro. Cada fase é um jogo no meio da semana, depois de uma rodada da liga
// (`S.CO_CUP.at`, fração da temporada). Nada da liga muda: a copa não conta como rodada (janela, treino, tabela, folha).
// ss.cup = { name, ids (clubes da chave), n, at (rodada da liga antes da qual cada fase acontece: joga com ss.i >= at[k]),
//            k (fase de agora), br (por fase, os confrontos: [i, j] índices em ids), res (por fase, { gh, ga, h (índice do
//            mandante), pa, pb (pênaltis), w (índice de quem passou) } alinhado com br), out (fase em que você caiu),
//            champ (id do campeão), w (semana da folha normal de um clube médio da elite: régua do prêmio), log (seus jogos) }
// Nada aqui gasta o sorteio da carreira: cada jogo do computador e cada disputa de pênaltis sai de um sorteio preso à
// temporada, à fase e ao confronto (o save no meio termina igual).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const L = () => S._.fcLib;
  const C = S.CO_CUP = {
    at: [0.12, 0.3, 0.5, 0.7, 0.88],       // quando cada fase acontece (as de 32 clubes; chave menor usa as últimas)
    names: ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final', '16 avos de final'],
    short: ['Final', 'Semi', 'Quartas', 'Oitavas', '16 avos'],
    prize: [1.5, 2.25, 3.75, 6, 9],            // passar de cada fase (da primeira à final), em semanas da folha normal de um clube médio da elite
    gateK: [1, 1.05, 1.15, 1.3, 1.5],      // a procura sobe a cada fase (bilheteria do jogo em casa)
    neutralGate: 0.5,                      // final em campo neutro: metade de uma bilheteria comum
    lamT: 70,                              // jogos do computador: o mesmo peso da força da tabela (roundRest)
    penP: 0.76, penK: 40, penMax: 0.14,    // pênaltis: acerto base e quanto finalização contra o goleiro mexe
    coins: { champ: 30, final: 10 },
    fame: { champ: 6, final: 2, semi: 1 },
    conf: { champ: 8, final: 4, semi: 2, zebra: -5 }
  };
  const cupOf = co => (co && co.ss && co.ss.cup) || null;
  const rngK = (co, tag) => S.rng(hash((co.seed || 0) + '|' + co.season + '|copa|' + tag));
  const str = (co, id) => D.CLUB_BY_ID[id].strength + (S.coClubDrift ? S.coClubDrift(co, id) : 0);
  const depthOf = (co, id) => S.coLgDepth((co.leagueOf || {})[id] || D.CLUB_BY_ID[id].league);
  const nPh = cup => Math.round(Math.log2(cup.n));
  S.coCupPhase = (cup, k) => C.names[nPh(cup) - 1 - k];
  S.coCupPhaseShort = (cup, k) => C.short[nPh(cup) - 1 - k];
  S.coCupIsFinal = (cup, k) => k === nPh(cup) - 1;

  // ---------- começo ----------
  S.coCupStart = function (co) {
    const ss = co.ss; if (!ss || ss.cup !== undefined) return ss && ss.cup;
    const club = D.CLUB_BY_ID[co.club], lg = D.LEAGUE_BY_ID[club.league] || {};
    const all = S.cupField(club), fn = Math.min(32, 2 ** Math.floor(Math.log2(Math.max(2, all.length))));
    if (fn < 8) { ss.cup = null; return null; }
    const ids = all.slice(0, fn); if (!ids.includes(club.id)) ids[fn - 1] = club.id;
    const r = rngK(co, 'chave');
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const R = ss.rounds.length, ph = Math.round(Math.log2(fn)), at = [];
    C.at.slice(5 - ph).forEach(f => { let x = clamp(Math.round(R * f), 1, R - 2); if (at.length && x <= at[at.length - 1]) x = at[at.length - 1] + 1; at.push(Math.min(x, R - 1)); });
    const br0 = []; for (let i = 0; i < fn; i += 2) br0.push([i, i + 1]);
    // Régua do prêmio: a folha semanal normal do 6º clube mais forte do país (um clube médio-alto da elite)
    const ref = all[Math.min(5, all.length - 1)];
    let w = 0; try { w = S.coGenSquad(ref, co.season, { rf: co.rf, lv: co.lv, season: co.season }).reduce((a, p) => a + p.wage, 0); } catch (e) { w = 0; }
    ss.cup = { name: lg.cup || 'Copa nacional', ids, n: fn, at, k: 0, br: [br0], res: [[]], out: null, champ: null, w: Math.round(w), log: [] };
    return ss.cup;
  };
  const mineIx = (co, cup) => cup.ids.indexOf(co.club);
  const pairOf = (co, cup, k) => (cup.br[k] || []).findIndex(([a, b]) => a === mineIx(co, cup) || b === mineIx(co, cup));
  const alive = (co, cup) => cup && cup.out === null && !cup.champ && mineIx(co, cup) >= 0 && !co.sacked && co.club === co.ss.club;
  const due = (co, cup) => cup && cup.k < cup.at.length && co.ss.i >= cup.at[cup.k];
  // Mando: a divisão menor joga em casa; mesma divisão, sorteio preso ao confronto. Final: neutro (o primeiro da chave fica à esquerda)
  function hostOf(co, cup, k, a, b) {
    if (S.coCupIsFinal(cup, k)) return a;
    const da = depthOf(co, cup.ids[a]), db = depthOf(co, cup.ids[b]);
    if (da !== db) return da > db ? a : b;
    return hash(co.seed + '|' + co.season + '|mando|' + k + '|' + a + '|' + b) & 1 ? a : b;
  }
  // Pênaltis entre dois clubes do computador: meio a meio, um pouco pela força
  const pensAI = (r, sa, sb) => r() < clamp(0.5 + (sa - sb) / 80, 0.3, 0.7);
  function simPair(co, cup, k, j) {
    const [a, b] = cup.br[k][j], h = hostOf(co, cup, k, a, b), x = h === a ? b : a, r = rngK(co, 'jogo|' + k + '|' + j);
    const sh = str(co, cup.ids[h]), sx = str(co, cup.ids[x]);
    const g = L().simple(r, cup.ids[h], cup.ids[x], sh, sx, C.lamT);
    const o = { gh: g.gh, ga: g.ga, h };
    if (g.gh === g.ga) { const hw = pensAI(r, sh, sx); const big = 3 + Math.floor(r() * 3), small = Math.max(0, big - 1 - Math.floor(r() * 2)); o.ph = hw ? big : small; o.px = hw ? small : big; o.w = hw ? h : x; }
    else o.w = g.gh > g.ga ? h : x;
    cup.res[k][j] = o;
  }
  // Fecha a fase: todos os jogos decididos viram a fase seguinte (ou o campeão)
  function advance(co, cup) {
    const k = cup.k, res = cup.res[k];
    if (res.filter(Boolean).length < cup.br[k].length) return false;
    const win = res.map(o => o.w);
    if (win.length === 1) cup.champ = cup.ids[win[0]];
    else { const nx = []; for (let i = 0; i < win.length; i += 2) nx.push([win[i], win[i + 1]]); cup.br.push(nx); cup.res.push([]); }
    cup.k++;
    return true;
  }
  // Joga o que já passou do dia: as fases devidas sem o seu jogo (ou com ele, se você saiu, foi demitido, ou `all`)
  function tick(co, all) {
    const cup = cupOf(co); if (!cup) return;
    while (cup.k < cup.at.length && (all || due(co, cup))) {
      const k = cup.k, mj = pairOf(co, cup, k), wait = !all && alive(co, cup) && mj >= 0 && !cup.res[k][mj];
      cup.br[k].forEach((_, j) => { if (!cup.res[k][j] && j !== (wait ? mj : -1)) simPair(co, cup, k, j); });
      if (wait) return;
      advance(co, cup);
    }
  }
  S.coCupTick = tick;

  // ---------- o seu jogo ----------
  // O próximo jogo é da copa quando a fase já é devida e o seu confronto não foi jogado
  S.coCupNext = function (co) {
    const cup = cupOf(co); if (!cup || !due(co, cup) || !alive(co, cup)) return null;
    const k = cup.k, j = pairOf(co, cup, k); if (j < 0 || cup.res[k][j]) return null;
    const [a, b] = cup.br[k][j], me = mineIx(co, cup), h = hostOf(co, cup, k, a, b), fin = S.coCupIsFinal(cup, k);
    return { round: co.ss.i + 0.5, of: co.ss.rounds.length, vs: cup.ids[a === me ? b : a], home: h === me, ult: co.board ? co.board.ult : null,
      neutral: fin, cup: { k, name: cup.name, ph: S.coCupPhase(cup, k), sh: S.coCupPhaseShort(cup, k), fin } };
  };
  const next0 = S.coNext;
  S.coNext = function (co) { return S.coCupNext(co) || next0(co); };

  // Pênaltis do seu jogo: batedores pela finalização entre quem terminou em campo (o goleiro bate por último), cada um bate
  // uma vez até todos baterem; o goleiro de cada lado pesa pelo atributo Pênalti. Guardado em m.pens (a tela mostra uma a uma).
  // seq = [{ s: 'us'|'them', n, num, ok }], us/them = gols, first = quem começou
  S.coCupPens = function (co, m) {
    if (m.pens) return m.pens;
    const r = rngK(co, 'pens|' + (m.cup ? m.cup.k : 0) + '|' + m.vs), dev = p => (S.coAtDev ? S.coAtDev(p) : [0, 0, 0, 0, 0, 0]);
    const side = s => {
      const on = s.xi.map(id => s.squad.find(p => p.id === id)).filter(p => p && !p.red && !(s.off || []).includes(p.id));
      const gk = on.find(p => p.pos === 'GOL') || on[0];
      const tk = on.filter(p => p !== gk).sort((a, b) => S.coTakeVal(b, 'pen') - S.coTakeVal(a, 'pen')).concat(gk ? [gk] : []);
      return { gk, tk };
    };
    const U = side(m.us), T = side(m.them), first = r() < 0.5 ? 'us' : 'them';
    const kick = (tk, gk) => { const d = (tk && tk.pos !== 'GOL' ? dev(tk)[0] : -15) - (gk && gk.pos === 'GOL' ? dev(gk)[5] : 0); return r() < C.penP * (1 + clamp(d / C.penK, -C.penMax, C.penMax)); };
    const sc = { us: 0, them: 0 }, n = { us: 0, them: 0 }, seq = [];
    const order = first === 'us' ? ['us', 'them'] : ['them', 'us'];
    const decided = () => { if (n.us >= 5 && n.them >= 5) return n.us === n.them && sc.us !== sc.them; const lu = 5 - Math.min(5, n.us), lt = 5 - Math.min(5, n.them); return sc.us + lu < sc.them || sc.them + lt < sc.us; };
    for (let i = 0; i < 60 && !decided(); i++) {
      const s = order[i % 2], X = s === 'us' ? U : T, O = s === 'us' ? T : U, tk = X.tk[n[s] % Math.max(1, X.tk.length)];
      const ok = kick(tk, O.gk); n[s]++; if (ok) sc[s]++;
      seq.push({ s, n: tk ? tk.n : '?', num: tk ? tk.num : 0, ok });
    }
    m.pens = { us: sc.us, them: sc.them, seq, first };
    return m.pens;
  };

  // Fim do seu jogo da copa: sem tabela nem rodada; cansaço, moral, lesão e cartões andam como em qualquer jogo
  function cupEnd(co, m) {
    const ss = co.ss, cup = cupOf(co), k = m.cup.k, j = pairOf(co, cup, k), me = mineIx(co, cup), [a, b] = cup.br[k][j], vi = a === me ? b : a;
    const gf = m.home ? m.gh : m.ga, ga = m.home ? m.ga : m.gh;
    const pens = gf === ga ? S.coCupPens(co, m) : null, win = pens ? pens.us > pens.them : gf > ga;
    const res = gf > ga ? 'v' : gf < ga ? 'd' : 'e', A = S._coAfter;
    const ycOut = A.afterGame(co, m, pens ? (win ? 'v' : 'd') : res);
    const h = m.neutral ? (a === me ? me : vi) : m.home ? me : vi;
    cup.res[k][j] = { gh: m.home || (m.neutral && h === me) ? gf : ga, ga: m.home || (m.neutral && h === me) ? ga : gf, h, w: win ? me : vi };
    if (pens) { const o = cup.res[k][j]; o.ph = h === me ? pens.us : pens.them; o.px = h === me ? pens.them : pens.us; }
    const log = { cup: 1, k, ph: S.coCupPhase(cup, k), name: cup.name, r: m.round, vs: m.vs, home: m.home, neutral: m.neutral, gf, ga, res, win, ycOut,
      pens: pens ? [pens.us, pens.them] : null, ev: m.ev.filter(e => e.t === 'gol' && e.s === 'us').map(e => e.p) };
    A.rateAfter(co, m, log, gf, ga);
    // Dinheiro: bilheteria do jogo em casa (a procura sobe por fase; final neutra: metade de uma comum) e o prêmio de passar
    const fin = S.coFin ? S.coFin(co) : null;
    if (fin) {
      const g0 = S.coGate ? S.coGate(co, m.vs) : 0, g = Math.round((m.neutral ? g0 * C.neutralGate : m.home ? g0 * (C.gateK[5 - nPh(cup) + k] || 1) : 0) / 1000) * 1000;
      if (g > 0) { fin.caixa += g; fin.ss.bil = (fin.ss.bil || 0) + g; log.gate = g; }
      if (win) { const v = S.coCupPrize(co, k); fin.caixa += v; fin.ss.prem = (fin.ss.prem || 0) + v; log.prize = v; }
    }
    // Diretoria: cair para um time de divisão menor pesa; ir longe sobe
    if (co.board) {
      const B = co.board, zebra = !win && depthOf(co, m.vs) > depthOf(co, co.club);
      const d = zebra ? C.conf.zebra : win && S.coCupIsFinal(cup, k) ? C.conf.champ : win && k === nPh(cup) - 2 ? C.conf.final : win && k === nPh(cup) - 3 ? C.conf.semi : 0;
      if (d) B.conf = clamp(B.conf + d, 0, 100);
      if (zebra) log.zebra = 1;
    }
    cup.log.push(log);
    if (!win) cup.out = k;
    // Os outros jogos da fase e a fase seguinte
    cup.br[k].forEach((_, jj) => { if (!cup.res[k][jj]) simPair(co, cup, k, jj); });
    advance(co, cup);
    if (cup.champ === co.club) { co.titles.push({ s: co.season, name: cup.name, club: co.club, k: 'cup' }); log.champ = 1; }
    A.xiAfter(co);
    if (S.coWorldSync) S.coWorldSync(co);
    return log;
  }
  // Prêmio de passar da fase k (da primeira à final)
  S.coCupPrize = (co, k) => { const cup = cupOf(co); if (!cup) return 0; return Math.round((cup.w || 0) * (C.prize[5 - nPh(cup) + k] || 1) / 10000) * 10000; };

  // O seu caminho até a taça (Semana da copa, pedido do Silvio 12/11): da fase de agora à final, quem pode vir em cada uma
  // (o vencedor já definido ou os dois do confronto que falta). [{ k, sh, ids, now }]
  S.coCupPath = function (co) {
    const cup = cupOf(co); if (!cup || !alive(co, cup)) return null;
    const k = cup.k, j = pairOf(co, cup, k); if (j < 0) return null;
    const out = [{ k, sh: S.coCupPhaseShort(cup, k), ids: cup.br[k][j].map(i => cup.ids[i]), now: 1 }];
    for (let d = 1; k + d < nPh(cup); d++) {
      const sz = 2 ** (d - 1), blk = Math.floor(j / sz) ^ 1, ids = [];
      for (let q = blk * sz; q < blk * sz + sz; q++) { const o = cup.res[k][q], pr = cup.br[k][q]; if (!pr) continue; if (o) ids.push(cup.ids[o.w]); else pr.forEach(i => ids.push(cup.ids[i])); }
      out.push({ k: k + d, sh: S.coCupPhaseShort(cup, k + d), ids });
    }
    return out;
  };
  // Prêmio de quem levanta a taça (soma do que falta a partir da fase k)
  S.coCupPrizeLeft = (co, k) => { const cup = cupOf(co); if (!cup) return 0; let t = 0; for (let q = k; q < nPh(cup); q++) t += S.coCupPrize(co, q); return t; };
  // "O título pode sair hoje" é da liga: não aparece antes do jogo da copa
  const tc0 = S.coTitleChance;
  S.coTitleChance = co => (S.coCupNext(co) ? null : tc0(co));

  // ---------- ganchos ----------
  const start0 = S.coStart;
  S.coStart = function (co) { const r = start0.apply(this, arguments); S.coCupStart(co); return r; };
  const mstart0 = S.coMatchStart;
  S.coMatchStart = function (co) {
    const m = mstart0.apply(this, arguments);
    // Final neutra: ninguém empurra nem cansa menos pelo gramado de casa
    if (m && m.neutral && m.push) { m.us.bonus -= m.push; m.push = 0; delete m.us.enK; }
    return m;
  };
  const end0 = S.coMatchEnd;
  S.coMatchEnd = function (co, m) {
    if (m && m.cup) return cupEnd(co, m);
    const log = end0.apply(this, arguments); tick(co); return log;
  };
  const skip0 = S.coSkipRound;
  S.coSkipRound = function (co) { skip0.apply(this, arguments); tick(co); };
  const send0 = S.coSeasonEnd;
  S.coSeasonEnd = function (co) {
    const ss = co.ss;
    while (ss && !ss.done) S.coSkipRound(co);
    const cup = cupOf(co), club = co.club, sacked = co.sacked;
    if (cup) tick(co, true);
    // Melhor fase: campeão, vice, ou a fase em que caiu
    let sum = null;
    if (cup && cup.ids.includes(club)) {
      const me = cup.ids.indexOf(club); let best = 0;
      while (best < cup.res.length && (cup.res[best] || []).some(o => o && o.w === me)) best++;
      sum = { name: cup.name, champ: cup.champ, won: cup.champ === club, best, n: cup.n, ph: cup.champ === club ? 'campeão' : best === nPh(cup) - 1 ? 'vice' : 'caiu ' + (best === 0 ? 'na estreia' : (best === nPh(cup) - 2 ? 'na ' : 'nas ') + S.coCupPhase(cup, best).toLowerCase()) };
    }
    const out = send0.apply(this, arguments);
    if (sum && out && out.club === club) {
      out.cup = sum;
      const top = nPh({ n: sum.n }), f = sum.won ? C.fame.champ : sum.best === top - 1 ? C.fame.final : sum.best === top - 2 ? C.fame.semi : 0;
      if (f && !sacked) { co.fame = clamp(co.fame + f, 0, 100); if (out.fame) out.fame[1] = co.fame; }
      if (sum.won && !sacked) { co.xp.pts += 1; out.xp = (out.xp || 0) + 1; }
      if (!sacked && out.coins) { if (sum.won) out.coins.push({ k: 'copa', t: sum.name, n: C.coins.champ }); else if (sum.best === top - 1) out.coins.push({ k: 'copa', t: 'Final da copa', n: C.coins.final }); }
      const hh = co.hist[co.hist.length - 1]; if (hh && hh.s === out.season) hh.cup = sum.ph;
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
