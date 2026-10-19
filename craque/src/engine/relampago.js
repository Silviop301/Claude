// Carreira Relâmpago: modo rápido de pênaltis. Cada casa da carreira (Base, Auge, Último clube, G/A, Títulos) tem 5 bolas,
// cobradas da esquerda para a direita. Nas casas de clube cada bola esconde um clube e vale a primeira que entrar
// (nenhuma entrou: fica o mais fraco). Em G/A e Títulos cada gol das 5 cobranças soma. Tudo sai de uma semente:
// quem recebe o link de desafio tem os mesmos clubes escondidos nas mesmas bolas.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  // Força do clube (47 a 87) → 0 a 1
  const fOf = cl => Math.max(0, Math.min(1, (cl.strength - 48) / (87 - 48)));
  const r1 = v => Math.round(v * 10) / 10;
  // Peso de cada casa: o Auge e os Títulos decidem mais
  const W = { base: 15, auge: 30, ultimo: 10 };
  // G/A: 120 de base e +140 por gol (4 pontos cada); Títulos: cada gol soma o próximo degrau (25 pontos nos 5)
  const GA0 = 120, GA_GOAL = 140, GA_PTS = 4;
  const TIT_PTS = [3, 4, 4, 6, 8];
  S.RL_SLOTS = [
    { key: 'base', name: 'Base' }, { key: 'auge', name: 'Auge' }, { key: 'ultimo', name: 'Último clube' },
    { key: 'ga', name: 'G/A' }, { key: 'tit', name: 'Títulos' },
  ];
  S.RL_GRADES = [['S', 80], ['A', 66], ['B', 54], ['C', 42], ['D', 0]]; // máximo 120
  // Cobrança (kick.js): a mira acelera a cada casa; goleiro esperto acerta o lado 55% das vezes (no jogo normal, 38%)
  S.RL_PERIOD = [1.7, 1.55, 1.4, 1.3, 1.2];
  S.RL_KEEPER = 0.55;
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
    memo = { seed, dr: { base, auge, ultimo, perm } };
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

  // Degraus dos títulos com os nomes do clube do auge: cada gol soma o próximo
  function titleSteps(cl) {
    const lg = D.LEAGUE_BY_ID[cl.league], liga = lg.name, copa = lg.cup;
    const cont = S.contName(cl) || 'Copa do Mundo';
    return [[copa, 1], [liga, 1], [liga, 2], [cont, 1], ['Bola de Ouro', 1]];
  }
  const sumItems = steps => { const m = new Map(); steps.forEach(([n, q]) => m.set(n, (m.get(n) || 0) + q)); return [...m]; };
  const itemsName = items => items.map(([n, q]) => q + ' ' + n).join(' + ') || 'Nenhum título';

  // Casa i já jogada com estas cobranças (1 = gol, 0 = errou). Clube: a primeira bola que entrou (ou o mais fraco).
  // done: a casa acabou (casa de clube termina no primeiro gol; as outras, nas 5 bolas).
  S.rlRound = function (seed, i, prev, kicks) {
    const key = S.RL_SLOTS[i].key, goals = kicks.filter(k => k === 1).length;
    if (key === 'ga') {
      const ga = GA0 + goals * GA_GOAL;
      return { cone: { ga, name: ga + ' G/A', pts: goals * GA_PTS }, goals, done: kicks.length >= 5 };
    }
    if (key === 'tit') {
      const auge = prev[1] ? D.CLUB_BY_ID[prev[1].id] : clubDraw(seed).auge[0];
      const items = sumItems(titleSteps(auge).slice(0, goals));
      return { cone: { items, name: itemsName(items), pts: TIT_PTS.slice(0, goals).reduce((a, b) => a + b, 0), top: goals >= 4 }, goals, done: kicks.length >= 5 };
    }
    const clubs = slotClubs(seed, i, prev), perm = clubDraw(seed).perm[i];
    const at = kicks.indexOf(1);
    const cone = at >= 0 ? clubs[perm[at]] : clubs[4];
    return { cone, goals, done: at >= 0 || kicks.length >= 5, ball: at, hidden: j => clubs[perm[j]] };
  };

  // Carreira a partir da semente e das cobranças de cada casa (rounds: listas de 1/0)
  S.rlCareer = function (seed, rounds) {
    const slots = [], prev = [];
    for (let i = 0; i < rounds.length && i < 5; i++) {
      const r = S.rlRound(seed, i, prev, rounds[i]);
      if (!r.done) break;
      prev.push(r.cone);
      slots.push({ key: S.RL_SLOTS[i].key, name: S.RL_SLOTS[i].name, cone: r.cone, goals: r.goals, kicks: rounds[i].length,
        goal: r.goals > 0, pts: r.cone.pts, best: r.cone.rank === 0 || r.goals === 5 });
    }
    return slots;
  };

  S.rlScore = function (seed, rounds) {
    const slots = S.rlCareer(seed, rounds);
    const combos = [];
    const get = k => (slots.find(s => s.key === k) || {}).cone;
    const ult = get('ultimo'), auge = get('auge'), tit = get('tit');
    if (ult && ult.home) combos.push({ name: 'Ídolo da casa', desc: 'Voltou pro clube que te revelou', pts: 0 }); // os 8 já estão no clube
    if (auge && tit && tit.top && D.CLUB_BY_ID[auge.id].strength >= 78) combos.push({ name: 'Dinastia', desc: 'Ganhou tudo num gigante', pts: 6 });
    if (slots.length === 5 && slots[3].goals === 5 && slots[4].goals === 5) combos.push({ name: 'Matador', desc: '10 de 10 em G/A e Títulos', pts: 6 });
    const total = Math.round(slots.reduce((a, s) => a + s.pts, 0) + combos.reduce((a, c) => a + c.pts, 0));
    const grade = S.RL_GRADES.find(g => total >= g[1])[0];
    return { slots, combos, total, grade };
  };
  S.rlNewSeed = () => (Math.random() * 4294967295) >>> 0;
})(typeof window !== 'undefined' ? window : globalThis);
