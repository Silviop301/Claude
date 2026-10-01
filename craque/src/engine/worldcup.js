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
  S.wcCut = (nation, c) => (nation.str >= 86 ? 81 : nation.str >= 82 ? 78 : 75) - (c ? Math.round(2.5 * S.tm(c, 'patriota')) + S.fameCut(c.fame) : 0); // Patriota: a seleção confia mais
  S.wcCall = function (c) {
    const nation = D.NATION_BY_NAME[c.country];
    const cut = S.wcCut(nation, c), o = S.ovr(c);
    // Quem se despediu da seleção não volta a ser convocado
    const retired = !!c.natRetired;
    const called = !retired && c.age >= 18 && c.age <= 37 && o >= cut;
    return { nation, cut, called, retired, starter: o >= cut + 5 };
  };

  function wcMatch(c, run, opp, r) {
    const o = S.ovr(c), cwc = run.kind === 'cwc';
    let T, k;
    if (cwc) {
      // Mundial de Clubes: a força é a do clube, puxada pela sua nota
      const cl = D.CLUB_BY_ID[run.club];
      T = cl.strength + (o - cl.strength) * 0.3 * run.share;
      k = 18;
    } else {
      // O craque puxa a seleção: cada ponto de nota acima de 82 vale 0,3 de força (titular)
      T = D.NATION_BY_NAME[run.nation].str + (o - 82) * 0.3 * run.share + 2.2 * S.tm(c, 'patriota');
      k = 22; // Copa é equilibrada: diferença de força pesa menos que nos clubes
    }
    const lu = 0.72 * Math.exp((T - opp.str) / k), lt = 1.3 * Math.exp((opp.str - T) / k);
    const gf = r.poisson(lu), ga = r.poisson(lt);
    // Participação nos gols da seleção
    const q = clamp((o - 60) / 25, 0.3, 1.4);
    const pg = run.share * ({ ATA: 0.4, MEI: 0.2, ZAG: 0.08, GOL: 0 }[c.pos]) * q;
    const pa = run.share * ({ ATA: 0.18, MEI: 0.34, ZAG: 0.05, GOL: 0 }[c.pos]) * q;
    // Cada gol com minuto e participação sua: o lance decisivo pode cair no meio do jogo
    const ours = [], theirs = [];
    let g = 0, a = 0;
    for (let i = 0; i < gf; i++) { const x = r(), who = x < pg ? 'g' : x < pg + pa ? 'a' : ''; if (who === 'g') g++; if (who === 'a') a++; ours.push({ min: r.int(1, 90), who }); }
    for (let i = 0; i < ga; i++) theirs.push(r.int(1, 90));
    const game = { opp: opp.name, flag: opp.flag, gf, ga, g, a, ours, theirs };
    // Linha do tempo (a tela mostra gol a gol): s = 'u' (nós) ou 't' (eles); w = 'g' seu gol, 'a' sua assistência
    game.ev = ours.map(x => ({ m: x.min, s: 'u', w: x.who || undefined })).concat(theirs.map(m => ({ m, s: 't' }))).sort((x, y) => x.m - y.m);
    if (opp.crest) game.crest = opp.crest;
    return game;
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
    if (run.kind === 'cwc') opp = cwcOpp(c, run, r);
    else if (run.stage < 3) opp = D.NATION_BY_NAME[run.group[run.stage]];
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
      // Lance decisivo com o jogo aberto (pênalti ou falta a favor; defensores: pênalti ou contra-ataque contra).
      // O placar para no minuto do lance; o resto do jogo acontece depois dele.
      const type = S.posKick(c.pos) || (r() < 0.55 ? 'pen' : 'fk');
      const minute = pickMinute(game, !!S.defKick(c.pos), r);
      splitAt(game, minute);
      game.live = true;
      game.moment = { type, minute };
      run.live = true;
    } else wcClose(c, game, r);
    delete game.ours; delete game.theirs;
    save();
    return game;
  };

  // Minuto do lance: jogo ainda em aberto (atacando: empatado ou perdendo por um; defendendo: empatado ou ganhando por um).
  // Às vezes no fim (vale a classificação), às vezes no meio (o resto do jogo ainda pode mudar tudo).
  function pickMinute(game, def, r) {
    let best = null, bestCost = 99;
    for (let i = 0; i < 14; i++) {
      const m = r() < 0.45 ? r.int(78, 89) : r.int(12, 77);
      const us = game.ours.filter(x => x.min < m).length, them = game.theirs.filter(x => x < m).length;
      const d = def ? us - them : them - us; // 0 ou 1 = lance que decide
      const cost = d === 0 || d === 1 ? 0 : Math.abs(d - 0.5);
      if (cost < bestCost) { best = m; bestCost = cost; }
      if (!cost) break;
    }
    return best;
  }
  // Separa o jogo no minuto do lance: placar até ali e o que vem depois (game.rest)
  function splitAt(game, m) {
    const before = game.ours.filter(x => x.min < m), after = game.ours.filter(x => x.min >= m);
    const cnt = (list, w) => list.filter(x => x.who === w).length;
    game.gf = before.length; game.ga = game.theirs.filter(x => x < m).length;
    game.at = [game.gf, game.ga]; // placar na hora do lance
    game.g = cnt(before, 'g'); game.a = cnt(before, 'a');
    game.evRest = game.ev.filter(e => e.m >= m);
    game.ev = game.ev.filter(e => e.m < m);
    game.rest = { gf: after.length, ga: game.theirs.filter(x => x >= m).length, g: cnt(after, 'g'), a: cnt(after, 'a') };
  }

  // Fecha o placar: nota do jogo, pontos do grupo ou mata-mata
  function wcClose(c, game, r) {
    const run = c.wcRun;
    run.g += game.g; run.a += game.a; run.gp = (run.gp || 0) + 1;
    const res = game.gf > game.ga ? 0.35 : game.gf < game.ga ? -0.25 : 0;
    // Defensores: não sofrer gol vale muito na nota
    const def = S.defKick(c.pos) ? (game.ga === 0 ? 0.9 : game.ga === 1 ? 0.15 : -0.3) : 0;
    game.cs = game.ga === 0;
    game.rating = round1(clamp(6.2 + game.g * 0.9 + game.a * 0.5 + res + def + (game.momentOk ? 0.4 : game.momentOk === false ? -0.3 : 0) + r.gauss() * 0.3, 5, 10));
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
    const defensive = ['save', 'tackle'].includes(game.moment.type);
    if (defensive) { if (!ok) game.ga++; } // defendeu/desarmou: placar segue; falhou: gol deles
    else if (ok && game.moment.type === 'pass') { game.gf++; game.a++; } // bola enfiada: gol do time, assistência sua
    else if (ok) { game.gf++; game.g++; }
    // O resto do jogo depois do lance
    // Linha do tempo: o lance (se virou gol) e o resto do jogo; a tela retoma o relógio do minuto do lance
    if (game.ev) {
      const km = game.moment.minute;
      if (defensive ? !ok : ok) game.ev.push(defensive ? { m: km, s: 't', k: 1 } : { m: km, s: 'u', w: game.moment.type === 'pass' ? 'a' : 'g', k: 1 });
      game.ev = game.ev.concat(game.evRest || []);
      delete game.evRest;
      game.resumeAt = km;
    }
    if (game.rest) { game.gf += game.rest.gf; game.ga += game.rest.ga; game.g += game.rest.g; game.a += game.rest.a; game.after = game.rest.gf || game.rest.ga ? true : undefined; delete game.rest; }
    wcClose(c, game, r);
    save();
  };
  S.wcMomentType = c => (c.wcRun && c.wcRun.live ? c.wcRun.games[c.wcRun.games.length - 1].moment.type : null);
  S.wcMomentAuto = function (c) {
    const { r, save } = rngOf(c);
    const ok = r() < S.kickSetup(c, S.kickSetupType({ kick: S.wcMomentType(c) })).chance;
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
    S.countKick(c, S.wcPensType(c), ok);
    wcAdvance(c, !!ok);
  };
  // Disputa de pênaltis: o goleiro defende a última cobrança; os outros batem a última
  S.wcPensType = c => (c.pos === 'GOL' ? 'save' : 'pen');
  S.wcPensAuto = function (c) {
    const { r, save } = rngOf(c);
    const ok = r() < S.kickSetup(c, c.pos === 'GOL' ? 'save' : 'cup').chance;
    save();
    S.wcPens(c, ok);
    return ok;
  };

  // Regra dos totais: todo jogo oficial conta (liga, copas, continental, Copa do Mundo e Mundial de Clubes).
  // O Mundial entra também na passagem pelo clube; a seleção fica separada em natGames/natGoals/natAssists.
  function addTotals(c, run, national) {
    const T = c.totals, gp = run.gp || 0;
    T.games = (T.games || 0) + gp; T.goals = (T.goals || 0) + run.g; T.assists = (T.assists || 0) + run.a;
    if (national) { T.natGames = (T.natGames || 0) + gp; T.natGoals = (T.natGoals || 0) + run.g; T.natAssists = (T.natAssists || 0) + run.a; return; }
    const sp = c.spells[c.spells.length - 1];
    if (sp && sp.club === run.club) { sp.games += gp; sp.goals += run.g; sp.assists += run.a; }
  }

  function wcEnd(c, reached) {
    const run = c.wcRun;
    run.out = !run.champion;
    run.reached = reached;
    if (run.kind === 'cwc') return cwcEnd(c, run, reached);
    c.totals.wcApps = (c.totals.wcApps || 0) + 1;
    c.totals.wcGoals = (c.totals.wcGoals || 0) + run.g;
    addTotals(c, run, true);
    c.fame += run.g * 2 + (run.champion ? 60 : run.stage >= 5 ? 15 : 0);
    if (run.champion) {
      c.totals.wc = (c.totals.wc || 0) + 1;
      c.trophies['Copa do Mundo'] = c.trophies['Copa do Mundo'] || { type: 'wc', n: 0 };
      c.trophies['Copa do Mundo'].n++;
      c.wcBoost = 22; // pesa na Bola de Ouro da próxima temporada
      run.card = S.dropCard(c, 'copa', 'CAMPEÃO DO MUNDO · ' + run.year);
    }
    c.wcHist = c.wcHist || [];
    c.wcHist.push({ year: run.year, nation: run.nation, reached, g: run.g, a: run.a, champion: run.champion });
  }
  S.wcDone = c => !c.wcRun || c.wcRun.out || c.wcRun.champion;

  // ---------- Mundial de Clubes (a cada 4 anos, depois da temporada: 2029, 2033...) ----------
  // 32 clubes, fase de grupos e mata-mata, jogo a jogo como a Copa (usa o mesmo c.wcRun, com kind 'cwc').
  S.isCwcYear = c => c.season > 0 && (S.YEAR0 + c.season) % 4 === 1;
  // Vagas por continente (os clubes africanos e da Oceania não estão nas ligas do jogo: entram como convidados)
  const CWC_QUOTA = { eur: 12, sul: 6, conc: 5, asia: 4 };
  const CWC_EXTRA = [
    { id: 'cwc-0', name: 'Al Ahly', flag: '🇪🇬', str: 75 }, { id: 'cwc-1', name: 'Mamelodi Sundowns', flag: '🇿🇦', str: 73 },
    { id: 'cwc-2', name: 'Espérance', flag: '🇹🇳', str: 71 }, { id: 'cwc-3', name: 'Wydad', flag: '🇲🇦', str: 70 },
    { id: 'cwc-4', name: 'Auckland City', flag: '🇳🇿', str: 58 },
  ];
  S.CWC_EXTRA = CWC_EXTRA;
  const topDiv = x => !(D.LADDER[x.league] && D.LADDER[x.league].up);
  // Time do Mundial pelo id: clube do jogo (com escudo) ou convidado
  S.cwcTeam = function (id) {
    const cl = D.CLUB_BY_ID[id];
    if (cl) return { id, name: cl.name, flag: D.LEAGUE_BY_ID[cl.league].flag, crest: id, str: cl.strength, conf: S.confOf(cl.league) };
    const x = CWC_EXTRA.find(e => e.id === id);
    return Object.assign({ crest: id, conf: 'out' }, x);
  };
  // Seed do ano: a lista muda de um Mundial para outro, mas é a mesma durante o torneio
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return ((h >>> 0) % 1000) / 1000; };
  // Os 32 do ano: os mais fortes de cada continente (máx. 2 por liga, com um sorteio de forma),
  // mais os campeões continentais dos últimos 4 anos com você
  S.cwcField = function (c, yr) {
    const out = [];
    const recent = S.cwcChampClub(c);
    for (const conf in CWC_QUOTA) {
      const per = {}, list = [];
      if (recent && S.confOf(D.CLUB_BY_ID[recent].league) === conf) { list.push(recent); per[D.CLUB_BY_ID[recent].league] = 1; }
      D.CLUBS.filter(x => topDiv(x) && S.confOf(x.league) === conf && x.id !== recent)
        .map(x => [x, x.strength + hash(yr + x.id) * 8]).sort((a, b) => b[1] - a[1])
        .forEach(([x]) => {
          if (list.length >= CWC_QUOTA[conf] || (per[x.league] || 0) >= 2) return;
          per[x.league] = (per[x.league] || 0) + 1;
          list.push(x.id);
        });
      out.push(...list);
    }
    return out.concat(CWC_EXTRA.map(e => e.id));
  };
  // Clube com que você ganhou a Libertadores ou a Champions nos últimos 4 anos (vaga garantida)
  S.cwcChampClub = function (c) {
    const s = c.seasons.slice(-4).reverse().find(x => x.titles.some(t => t.id === 'cont') && x.club === c.club);
    return s ? s.club : null;
  };
  S.cwcCall = function (c) {
    const yr = S.YEAR0 + c.season, cl = D.CLUB_BY_ID[c.club];
    const called = !!cl && S.cwcField(c, yr).includes(c.club);
    const share = cl ? S.role(c, cl).share : 0;
    return { club: cl, called, champ: S.cwcChampClub(c) === c.club, starter: share >= 0.6, share };
  };
  S.cwcStart = function (c) {
    const { r, save } = rngOf(c);
    const call = S.cwcCall(c), yr = S.YEAR0 + c.season;
    const field = S.cwcField(c, yr).filter(id => id !== c.club).map(S.cwcTeam);
    const mine = S.confOf(call.club.league), used = [];
    const pick = f => { const left = field.filter(x => !used.includes(x.id)), p = left.filter(f); const x = r.pick(p.length ? p : left); used.push(x.id); return x.id; };
    // Grupo com um de cada pote, sempre de outro continente: um grande, um médio e um azarão
    const group = [pick(x => x.conf !== mine && x.str >= 80), pick(x => x.conf !== mine && x.str >= 70 && x.str < 80), pick(x => x.conf !== mine && x.str < 72)];
    c.wcRun = { kind: 'cwc', year: yr, club: c.club, starter: call.starter, share: clamp(call.share, 0.35, 0.95),
      field: field.map(x => x.id), group, used, games: [], stage: 0, pts: 0, out: false, champion: false, pending: null, g: 0, a: 0,
      groupMoment: r.int(0, 2) };
    save();
    return c.wcRun;
  };
  // Adversário do jogo: grupo sorteado; no mata-mata, cada vez mais fortes
  function cwcOpp(c, run, r) {
    if (run.stage < 3) return S.cwcTeam(run.group[run.stage]);
    const want = 74 + (run.stage - 3) * 3;
    const left = run.field.filter(id => !run.used.includes(id)).map(S.cwcTeam);
    const p = left.filter(x => x.str >= want);
    const opp = r.pick(p.length ? p : left.sort((a, b) => b.str - a.str).slice(0, 3));
    run.used.push(opp.id);
    return opp;
  }
  function cwcEnd(c, run, reached) {
    const T = c.totals;
    T.cwcApps = (T.cwcApps || 0) + 1;
    T.cwcGoals = (T.cwcGoals || 0) + run.g;
    addTotals(c, run, false);
    c.fame += run.g * 1.5 + (run.champion ? 40 : run.stage >= 5 ? 10 : 0);
    if (run.champion) {
      T.cwc = (T.cwc || 0) + 1;
      c.trophies['Mundial de Clubes'] = c.trophies['Mundial de Clubes'] || { type: 'cwc', n: 0 };
      c.trophies['Mundial de Clubes'].n++;
      c.wcBoost = 8; // pesa na Bola de Ouro da próxima temporada
      const sp = c.spells[c.spells.length - 1];
      if (sp && sp.club === run.club) sp.titles++;
      run.card = S.dropCard(c, 'mundial', 'MUNDIAL DE CLUBES ' + run.year);
    }
    c.cwcHist = c.cwcHist || [];
    c.cwcHist.push({ year: run.year, club: run.club, reached, g: run.g, a: run.a, champion: run.champion });
  }


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
