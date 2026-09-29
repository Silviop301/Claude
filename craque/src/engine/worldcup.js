// Copa do Mundo (a cada 4 anos)
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp, rngOf, round1 } = S._; // ajudantes do núcleo
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
    S.countKick(c, game.moment.type, ok);
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
    S.countKick(c, 'pen', ok);
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


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
