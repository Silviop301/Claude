// Carreira Relâmpago: modo rápido de pênaltis. Cada casa da carreira (Base, Auge, Último clube, G/A, Títulos) tem 5 bolas,
// e o jogador escolhe qual bola cobrar a cada vez. Nas casas de clube cada bola esconde um clube e vale a primeira que
// entrar (nenhuma entrou: fica o mais fraco). Em G/A e Títulos cada bola esconde um prêmio sorteado (gols e assistências, ou um
// título) e você leva o de cada bola que entrar. Tudo sai de uma semente: quem recebe o link de desafio tem os mesmos
// prêmios escondidos nas mesmas bolas.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  // Força do clube (47 a 87) → 0 a 1
  const fOf = cl => Math.max(0, Math.min(1, (cl.strength - 48) / (87 - 48)));
  const r1 = v => Math.round(v * 10) / 10;
  // Peso de cada casa: o Auge e os Títulos decidem mais
  const W = { base: 15, auge: 30, ultimo: 10 };
  // G/A: cada bola tem 15 a 130 gols e 5 a 80 assistências (1 ponto a cada 50). Títulos: pontos por título de cada tipo
  const GA_DIV = 50;
  // Os prêmios que a história mais lembra pesam mais: Copa do Mundo 10, Bola de Ouro 8 (cada); e as duas juntas dão o combo Lenda
  const TIT_KINDS = [['copa', 1, 3, 1], ['liga', 1, 3, 2], ['cont', 1, 2, 3], ['wc', 1, 1, 10], ['bola', 1, 2, 8]]; // tipo, mín, máx, pontos cada
  S.RL_W = Object.assign({ ga: GA_DIV, home: 8 }, W, { tit: TIT_KINDS.map(t => [t[0], t[3]]) }); // para a tela explicar a nota
  S.RL_SLOTS = [
    { key: 'base', name: 'Base' }, { key: 'auge', name: 'Auge' }, { key: 'ultimo', name: 'Último clube' },
    { key: 'ga', name: 'G/A' }, { key: 'tit', name: 'Títulos' },
  ];
  S.RL_GRADES = [['S', 95], ['A', 78], ['B', 64], ['C', 49], ['D', 0]];
  // Cobrança (kick.js): a mira acelera a cada casa; o goleiro é o mesmo do modo carreira (acerta o lado 38% das vezes)
  S.RL_PERIOD = [1.7, 1.55, 1.4, 1.3, 1.2];
  S.RL_KEEPER = 0.38;
  S.rlKickSetup = i => ({ fk: false, period: S.RL_PERIOD[i], wobble: 0.06, reach: 0.3, fkReach: 0, wall: 0, wallL: -0.8, wallR: -0.1 });

  // Clubes das três casas de clube, sorteados uma vez pela semente (sem repetir clube)
  let memo = null;
  function clubDraw(seed) {
    if (memo && memo.seed === seed) return memo.dr;
    const r = S.rng(seed >>> 0), used = new Set();
    const byTier = t => D.CLUBS.filter(c => c.tier === t && !used.has(c.id));
    const take = list => { const pool = list.filter(c => !used.has(c.id)); const c = pool[Math.floor(r() * pool.length)]; used.add(c.id); return c; };
    const base = [5, 4, 3, 2, 1].map(t => take(byTier(t)));
    const auge = [5, 5, 4, 3, 2].map(t => take(byTier(t)));
    // Fim de carreira: um grande ainda, uma aposentadoria de luxo (Arábia ou EUA) e dois modestos; o quinto é voltar pra base
    const ultimo = [take(byTier(4)), take(D.CLUBS.filter(c => c.league === 'ara' || c.league === 'usa')), take(byTier(2)), take(byTier(1))];
    // Clube escondido em cada bola (colocado do clube, 0 = melhor), embaralhado em cada casa
    const perm = [0, 1, 2].map(() => { const a = [0, 1, 2, 3, 4]; for (let k = 4; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; });
    // Prêmios escondidos nas bolas de G/A e de Títulos
    const n = (a, b) => a + Math.floor(r() * (b - a + 1));
    const ga = [0, 1, 2, 3, 4].map(() => ({ gols: 5 * n(3, 26), ast: 5 * n(1, 16) }));
    const tit = TIT_KINDS.map(([k, a, b, pts]) => ({ k, q: n(a, b), pts }));
    for (let k = 4; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [tit[k], tit[j]] = [tit[j], tit[k]]; }
    memo = { seed, dr: { base, auge, ultimo, perm, ga, tit } };
    return memo.dr;
  }

  // Os 5 clubes de uma casa de clube, do melhor para o pior. prev: prêmios das casas anteriores.
  function slotClubs(seed, i, prev) {
    const dr = clubDraw(seed), key = S.RL_SLOTS[i].key;
    let cones;
    const clubCone = (cl, w, extra) => ({ id: cl.id, name: cl.name, pts: r1(w * fOf(cl) + (extra || 0)) });
    if (key === 'base') cones = dr.base.map(cl => clubCone(cl, W.base));
    else if (key === 'auge') cones = dr.auge.map(cl => clubCone(cl, W.auge));
    else if (key === 'ultimo') {
      const home = prev[0];
      cones = dr.ultimo.map(cl => clubCone(cl, W.ultimo));
      // Voltar pra casa: o clube da base com o bônus de ídolo
      if (home) cones.push(Object.assign(clubCone(D.CLUB_BY_ID[home.id], W.ultimo, 8), { home: true }));
      else cones.push(clubCone(dr.base[2], W.ultimo));
    }
    return cones.map((c, k) => Object.assign(c, { k })).sort((a, b) => b.pts - a.pts || a.k - b.k).map((c, rank) => Object.assign(c, { rank }));
  }

  // Nome de cada tipo de título com a liga do clube do auge
  function titleName(k, cl) {
    const lg = D.LEAGUE_BY_ID[cl.league];
    return k === 'copa' ? lg.cup : k === 'liga' ? lg.name : k === 'wc' ? 'Copa do Mundo' : k === 'bola' ? 'Bola de Ouro'
      : S.contName(cl) || (S.LIBERTA.includes(cl.league) ? 'Sul-Americana' : 'Liga Europa');
  }
  const itemsName = items => items.map(([n, q]) => q + ' ' + n).join(' + ') || 'Nenhum título';
  const r1pts = v => Math.round(v * 10) / 10;
  const gaPrize = b => ({ gols: b.gols, ast: b.ast, ga: b.gols + b.ast, name: b.gols + ' gols + ' + b.ast + ' assistências', pts: r1pts((b.gols + b.ast) / GA_DIV) });
  const titPrize = (b, cl) => { const n = titleName(b.k, cl); return { items: [[n, b.q]], name: b.q + ' ' + n, pts: b.q * b.pts, kind: b.k }; };

  // Casa i já jogada com estas cobranças, na ordem em que saíram: [bola (0 a 4), 1 = gol / 0 = errou].
  // Clube: a primeira bola que entrou (ou o mais fraco).
  // G/A e Títulos: soma o prêmio de cada bola que entrou. done: a casa acabou (clube termina no primeiro gol; as outras, nas 5 bolas).
  // hidden(j): o prêmio que a bola j escondia.
  S.rlRound = function (seed, i, prev, kicks) {
    const key = S.RL_SLOTS[i].key, goals = kicks.filter(k => k[1]).length, dr = clubDraw(seed);
    if (key === 'ga' || key === 'tit') {
      const auge = prev[1] ? D.CLUB_BY_ID[prev[1].id] : dr.auge[0];
      const balls = key === 'ga' ? dr.ga.map(gaPrize) : dr.tit.map(b => titPrize(b, auge));
      const got = kicks.filter(k => k[1]).map(k => balls[k[0]]), pts = r1pts(got.reduce((a, b) => a + b.pts, 0));
      let cone;
      if (key === 'ga') {
        const gols = got.reduce((a, b) => a + b.gols, 0), ast = got.reduce((a, b) => a + b.ast, 0);
        cone = { gols, ast, ga: gols + ast, name: gols + ' gols + ' + ast + ' assistências', pts };
      } else {
        const items = got.map(b => b.items[0]);
        cone = { items, name: itemsName(items), pts, top: got.some(b => b.kind === 'cont') && got.some(b => b.kind === 'bola'), legend: got.some(b => b.kind === 'wc') && got.some(b => b.kind === 'bola') };
      }
      return { cone, goals, done: kicks.length >= 5, hidden: j => balls[j] };
    }
    const clubs = slotClubs(seed, i, prev), perm = dr.perm[i];
    const at = kicks.find(k => k[1]);
    const cone = at ? clubs[perm[at[0]]] : clubs[4];
    return { cone, goals, done: !!at || kicks.length >= 5, ball: at ? at[0] : -1, hidden: j => clubs[perm[j]] };
  };

  // Carreira a partir da semente e das cobranças de cada casa (rounds: listas de [bola, gol])
  S.rlCareer = function (seed, rounds) {
    const slots = [], prev = [];
    for (let i = 0; i < rounds.length && i < 5; i++) {
      const r = S.rlRound(seed, i, prev, rounds[i]);
      if (!r.done) break;
      prev.push(r.cone);
      const club = i < 3;
      slots.push({ key: S.RL_SLOTS[i].key, name: S.RL_SLOTS[i].name, cone: r.cone, goals: r.goals, kicks: rounds[i].length,
        goal: club ? r.ball >= 0 : r.goals > 0, ball: club ? r.ball : -1, pts: r.cone.pts, best: club ? r.cone.rank === 0 : r.goals === 5 });
    }
    return slots;
  };

  S.rlScore = function (seed, rounds) {
    const slots = S.rlCareer(seed, rounds);
    const combos = [];
    const get = k => (slots.find(s => s.key === k) || {}).cone;
    const ult = get('ultimo'), auge = get('auge'), tit = get('tit');
    if (ult && ult.home) combos.push({ name: 'Ídolo da casa', desc: 'Voltou pro clube que te revelou', pts: 0 }); // os 8 já estão no clube
    if (auge && tit && tit.top && D.CLUB_BY_ID[auge.id].strength >= 78) combos.push({ name: 'Dinastia', desc: 'Continental e Bola de Ouro num gigante', pts: 6 });
    if (tit && tit.legend) combos.push({ name: 'Lenda', desc: 'Copa do Mundo e Bola de Ouro', pts: 6 });
    if (slots.length === 5 && slots[3].goals === 5 && slots[4].goals === 5) combos.push({ name: 'Matador', desc: '10 de 10 em G/A e Títulos', pts: 6 });
    const total = Math.round(slots.reduce((a, s) => a + s.pts, 0) + combos.reduce((a, c) => a + c.pts, 0));
    const grade = S.RL_GRADES.find(g => total >= g[1])[0];
    return { slots, combos, total, grade };
  };
  // As 5 bolas da casa i com o prêmio que cada uma escondia e o que aconteceu com ela: got (o prêmio é seu), miss (chutou e
  // errou), left (nem chutou: a casa já tinha acabado) e fall (clube: nenhuma entrou e sobrou o desta bola, o mais fraco)
  S.rlBalls = function (seed, rounds, i) {
    const prev = S.rlCareer(seed, rounds).slice(0, i).map(s => s.cone), kicks = rounds[i];
    const r = S.rlRound(seed, i, prev, kicks), club = i < 3;
    return [0, 1, 2, 3, 4].map(j => {
      const k = kicks.find(x => x[0] === j), prize = r.hidden(j);
      let st = !k ? 'left' : club ? (j === r.ball ? 'got' : 'miss') : k[1] ? 'got' : 'miss';
      if (club && r.ball < 0 && prize === r.cone) st = 'fall';
      return { prize, st };
    });
  };
  // O que escapou: em cada casa, o melhor prêmio escondido que o jogador não levou (clube melhor que o seu, ou a bola
  // de G/A ou de título que ele errou), do que mais valia para o que menos valia
  S.rlMissed = function (seed, rounds) {
    const out = [], prev = [];
    for (let i = 0; i < rounds.length && i < 5; i++) {
      const r = S.rlRound(seed, i, prev, rounds[i]);
      if (!r.done) break;
      const name = S.RL_SLOTS[i].name;
      if (i < 3) {
        const top = slotClubs(seed, i, prev)[0], j = clubDraw(seed).perm[i].indexOf(0);
        if (r.cone.rank !== 0) out.push({ slot: name, prize: top, ball: j + 1, pts: r1(top.pts - r.cone.pts) });
      } else {
        const miss = rounds[i].filter(k => !k[1]).map(k => Object.assign({ ball: k[0] + 1 }, r.hidden(k[0]))).sort((a, b) => b.pts - a.pts)[0];
        if (miss) out.push({ slot: name, prize: miss, ball: miss.ball, pts: miss.pts });
      }
      prev.push(r.cone);
    }
    return out.sort((a, b) => b.pts - a.pts);
  };
  // Pontos que faltaram para a nota seguinte (null na nota S)
  S.rlNext = function (total) {
    const k = S.RL_GRADES.findIndex(g => total >= g[1]);
    return k > 0 ? { grade: S.RL_GRADES[k - 1][0], need: S.RL_GRADES[k - 1][1] - total } : null;
  };
  S.rlNewSeed = () => (Math.random() * 4294967295) >>> 0;
})(typeof window !== 'undefined' ? window : globalThis);
