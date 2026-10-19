// Carreira Relâmpago: modo rápido de 5 chutes. Cada chute acerta um cone e o prêmio dele entra numa casa da carreira
// (Base, Auge, Último clube, G/A, Títulos). Tudo sai de uma semente: quem recebe o link de desafio joga os mesmos cones.
// Os prêmios ficam escondidos e embaralhados nos cones (a tela só mostra o que pode sair): é sorte, como no vídeo que
// inspirou o modo. Chute pra fora = fica com o pior prêmio e a casa não pontua.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  // Força do clube (47 a 87) → 0 a 1
  const fOf = cl => Math.max(0, Math.min(1, (cl.strength - 48) / (87 - 48)));
  const r1 = v => Math.round(v * 10) / 10;
  // Peso de cada casa: o Auge e os Títulos decidem mais
  const W = { base: 15, auge: 30, ultimo: 10 };
  const GA = [140, 280, 420, 580, 780]; // gols + assistências, do pior ao melhor
  const GA_PTS = [4, 8, 12, 16, 20];
  const TIT_PTS = [5, 10, 15, 20, 25];
  S.RL_SLOTS = [
    { key: 'base', name: 'Base' }, { key: 'auge', name: 'Auge' }, { key: 'ultimo', name: 'Último clube' },
    { key: 'ga', name: 'G/A' }, { key: 'tit', name: 'Títulos' },
  ];
  S.RL_GRADES = [['S', 85], ['A', 72], ['B', 60], ['C', 45], ['D', 0]]; // máximo 124; chutando ao acaso: S 5%, A 15%, B 25%, D 25%
  // Velocidade da mira por casa (segundos de uma ponta à outra e de volta): cada chute fica mais difícil
  S.RL_PERIOD = [2.1, 1.9, 1.75, 1.6, 1.45];
  S.RL_WOBBLE = 0.14; // desvio da bola (em larguras de cone): perto do meio quase nunca muda nada

  // Clubes das três casas de clube, sorteados uma vez pela semente (sem repetir clube)
  function clubDraw(seed) {
    const r = S.rng(seed >>> 0), used = new Set();
    const byTier = t => D.CLUBS.filter(c => c.tier === t && !used.has(c.id));
    const take = list => { const pool = list.filter(c => !used.has(c.id)); const c = pool[Math.floor(r() * pool.length)]; used.add(c.id); return c; };
    const base = [5, 4, 3, 2, 1].map(t => take(byTier(t)));
    const auge = [5, 5, 4, 3, 2].map(t => take(byTier(t)));
    // Fim de carreira: um grande ainda, uma aposentadoria de luxo (Arábia ou EUA) e dois modestos; o quinto é voltar pra base
    const ultimo = [take(byTier(4)), take(D.CLUBS.filter(c => c.league === 'ara' || c.league === 'usa')), take(byTier(2)), take(byTier(1))];
    // Ordem escondida dos prêmios em cada casa (posição na fila de cones de cada colocado)
    const perm = S.RL_SLOTS.map(() => { const a = [0, 1, 2, 3, 4]; for (let k = 4; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; });
    return { base, auge, ultimo, perm };
  }

  // Cones de uma casa na ordem da tela (esquerda → direita). picks: posições já chutadas nas casas anteriores.
  function slotCones(seed, i, prev) {
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
    } else if (key === 'ga') cones = GA.map((v, k) => ({ ga: v, name: v + ' G/A', pts: GA_PTS[k] }));
    else cones = titleCones(prev[1] ? D.CLUB_BY_ID[prev[1].id] : dr.auge[0]);
    // Ordena do melhor para o pior e espalha nas posições pela ordem sorteada
    const ranked = cones.map((c, k) => Object.assign(c, { k })).sort((a, b) => b.pts - a.pts || a.k - b.k);
    const out = new Array(5);
    ranked.forEach((c, rank) => { const pos = dr.perm[i][rank]; out[pos] = Object.assign(c, { rank }); });
    return out;
  }

  // Pacotes de títulos com os nomes do clube do auge (a pontuação não depende do clube)
  function titleCones(cl) {
    const lg = D.LEAGUE_BY_ID[cl.league], liga = lg.name, copa = lg.cup;
    const cont = S.contName(cl) || 'Copa do Mundo';
    const list = [
      { name: '1 ' + copa, items: [[copa, 1]] },
      { name: '2 ' + liga, items: [[liga, 2]] },
      { name: '4 ' + liga + ' + 2 ' + copa, items: [[liga, 4], [copa, 2]] },
      { name: cont + ' + 3 ' + liga, items: [[cont, 1], [liga, 3]] },
      { name: '2 ' + cont + ' + Bola de Ouro', items: [[cont, 2], ['Bola de Ouro', 1]] },
    ];
    return list.map((t, k) => Object.assign(t, { pts: TIT_PTS[k], top: k >= 3 }));
  }

  // Onde a bola cai (em larguras de cone, 0 a 4 são os cones) → posição do cone acertado, ou null (pra fora).
  // Passou da fila de cones (a mira vai um pouco além das pontas), a bola sai.
  S.rlHit = x => (x < -0.3 || x > 4.3 ? null : Math.max(0, Math.min(4, Math.round(x))));

  // Carreira inteira a partir da semente e das posições chutadas (5 = pra fora → fica com o pior cone)
  S.rlCareer = function (seed, picks) {
    const slots = [], prev = [];
    for (let i = 0; i < picks.length && i < 5; i++) {
      const cones = slotCones(seed, i, prev), p = picks[i];
      const out = !(p >= 0 && p <= 4);
      const cone = out ? cones.find(c => c.rank === 4) : cones[p];
      prev.push(cone);
      // Pra fora: fica com o pior cone e a casa não pontua
      slots.push({ key: S.RL_SLOTS[i].key, name: S.RL_SLOTS[i].name, cone, out, pts: out ? 0 : cone.pts, best: !out && cone.rank === 0 });
    }
    return slots;
  };
  S.rlCones = (seed, picks) => slotCones(seed, picks.length, S.rlCareer(seed, picks).map(s => s.cone));

  S.rlScore = function (seed, picks) {
    const slots = S.rlCareer(seed, picks);
    const combos = [];
    const get = k => (slots.find(s => s.key === k) || {}).cone;
    const ult = get('ultimo'), auge = get('auge'), tit = get('tit');
    if (ult && ult.home && !slots[2].out) combos.push({ name: 'Ídolo da casa', desc: 'Voltou pro clube que te revelou', pts: 0 }); // os 8 já estão no cone
    if (auge && tit && tit.top && !slots[4].out && D.CLUB_BY_ID[auge.id].strength >= 78) combos.push({ name: 'Dinastia', desc: 'Ganhou tudo num gigante', pts: 6 });
    if (slots.length === 5 && slots.every(s => s.best)) combos.push({ name: 'Carreira perfeita', desc: 'Os 5 melhores prêmios', pts: 10 });
    const total = Math.round(slots.reduce((a, s) => a + s.pts, 0) + combos.reduce((a, c) => a + c.pts, 0));
    const grade = S.RL_GRADES.find(g => total >= g[1])[0];
    return { slots, combos, total, grade };
  };
  S.rlNewSeed = () => (Math.random() * 4294967295) >>> 0;
})(typeof window !== 'undefined' ? window : globalThis);
