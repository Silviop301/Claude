// Jogo decisivo: minigame de pênalti e falta
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp, lvOf, rngOf, round1 } = S._; // ajudantes do núcleo
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

  // Conta as cobranças do minigame (para conquistas): pen/fk, convertidas
  S.countKick = function (c, type, ok) {
    const k = c.kicks = c.kicks || { n: 0, ok: 0, fkOk: 0 };
    k.n++;
    if (ok) { k.ok++; if (type === 'fk') k.fkOk++; }
  };
  S.resolveMoment = function (c, ok) {
    if (!c.moment) return;
    c.mod.moment = Object.assign({}, c.moment, { ok: !!ok });
    S.countKick(c, c.moment.type === 'classico' ? 'fk' : 'pen', ok);
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


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
