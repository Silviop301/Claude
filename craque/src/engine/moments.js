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
  // Taça continental que o clube disputa (ou null)
  // Libertadores: primeira divisão dos países sul-americanos do jogo; Champions: clubes grandes da Europa
  S.LIBERTA = ['bra-a', 'arg', 'uru', 'col', 'chi', 'par', 'ecu'];
  // Continente do clube (para o Mundial e a Intercontinental): sul, conc (México/EUA), asia, eur
  S.confOf = lg => (['bra', 'arg', 'uru', 'col', 'chi', 'par', 'ecu'].includes(lg.split('-')[0]) ? 'sul' : ['mex', 'usa'].includes(lg) ? 'conc' : ['ara', 'qat', 'jpn', 'kor'].includes(lg) ? 'asia' : 'eur');
  S.contName = club => (S.LIBERTA.includes(club.league) ? 'Libertadores' : club.tier >= 4 ? 'Liga dos Campeões' : null);
  // Tipo de cobrança do lance: pênalti ou falta ('classico' é sempre falta; 'cont' sorteia)
  // Zagueiro e goleiro têm lances defensivos: 'tackle' (desarme) e 'save' (defender pênalti)
  S.kickType = m => m.kick || (m.type === 'classico' ? 'fk' : 'pen');
  S.kickSetupType = m => ({ fk: 'classico', save: 'save', tackle: 'tackle' }[S.kickType(m)] || 'cup');
  S.defKick = pos => (pos === 'GOL' ? 'save' : pos === 'ZAG' ? 'tackle' : null);

  const leagueSize = club => D.CLUBS.filter(x => x.league === club.league).length;
  // Placar, minuto e o que está em jogo, sorteados junto com o lance
  function momentContext(c, m, club, rank, n, r) {
    const def = !!S.defKick(c.pos), kick = S.kickType(m), LD = D.LADDER[club.league] || {};
    const final = m.type !== 'classico';
    const g = r.int(0, 2);
    // Atacando: empate (ou atrás por um no clássico); defendendo: vencendo por um (ou empatado no clássico)
    m.score = def ? (final || r() < 0.5 ? [g + 1, g] : [g, g]) : (final || r() < 0.6 ? [g, g] : [g, g + 1]);
    m.minute = kick === 'pen' || kick === 'save' ? '90+' + r.int(1, 5) : String(82 + r.int(0, 7));
    const us = D.o(club.name), them = D.o(D.CLUB_BY_ID[m.vs].name);
    const up = LD.up ? ' ' + D.paraA(D.LEAGUE_BY_ID[LD.up].name) : '';
    m.ctx = def ? {
      cup: 'Final ' + D.da(m.comp) + ', jogo único: segure o placar e a taça é sua.',
      title: 'Última rodada: ' + us + ' e ' + them + ' chegam empatados em pontos. Segurando a vitória, o título é seu.',
      cont: 'Final ' + D.da(m.comp) + ': segure o placar e o título continental é seu.',
      acesso: 'Última rodada: segurando a vitória, o acesso' + up + ' é seu.',
    }[m.type] : {
      cup: 'Final ' + D.da(m.comp) + ', jogo único: quem vencer leva a taça.',
      title: 'Última rodada: ' + us + ' e ' + them + ' chegam empatados em pontos. Quem vencer é campeão.',
      cont: 'Final ' + D.da(m.comp) + ': quem vencer é campeão continental.',
      acesso: 'Última rodada: uma vitória garante o acesso' + up + '.',
    }[m.type];
    if (!m.ctx) m.ctx = {
      classico: rank <= 2 ? 'A vitória mantém ' + us + ' na briga pelo título.'
        : LD.up && rank <= (LD.promo || 4) + 2 ? 'A vitória deixa ' + us + ' mais perto do acesso.'
        : LD.down && rank >= n - (LD.releg || 4) ? 'A vitória afasta o fantasma do rebaixamento.'
        : 'Vale três pontos e a gozação por um ano inteiro.',
    }[m.type];
    // Atrás no placar, o gol vale o empate; defendendo, o placar é que está em jogo
    if (m.type === 'classico' && !def && m.score[0] < m.score[1]) m.ctx = 'Atrás no placar: um gol agora arranca o empate no clássico.';
    if (m.type === 'classico' && def) m.ctx = m.score[0] > m.score[1] ? 'Vencendo o clássico: segure e os três pontos são seus.' : 'Clássico empatado: se ele marcar, a derrota vem no fim.';
  }

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
      // Última rodada valendo o acesso (divisões de baixo, times perto do G-4)
      const LD = D.LADDER[club.league];
      if (LD && LD.up && rank <= (LD.promo || 4) + 2) pool.push(['acesso', 1.3]);
      // Final continental: topo do Brasil/Argentina (Libertadores) ou clube grande europeu (Champions)
      const contName = S.contName(club);
      if (contName && (contName === 'Libertadores' ? rank <= 4 : club.strength >= 78)) pool.push(['cont', 1.2]);
      let x = r() * pool.reduce((a, p) => a + p[1], 0), type = pool[0][0];
      for (const [t, w] of pool) { x -= w; if (x < 0) { type = t; break; } }
      let vs = type === 'cup' ? r.pick(rivals.slice(0, 8)) : type === 'acesso' ? r.pick(rivals.slice(0, 6)) : type === 'classico' ? S.derbyOf(club, r.pick) || rivals[0] : rivals[0];
      if (type === 'cont') {
        // Adversário da final: um grande de outra liga do mesmo continente
        const libert = S.contName(club) === 'Libertadores';
        const pool2 = D.CLUBS.filter(x => x.id !== club.id && (libert ? S.LIBERTA.includes(x.league) : x.tier >= 4 && !S.LIBERTA.includes(x.league) && !['ara', 'usa', 'mex', 'jpn', 'kor', 'qat'].includes(x.league) && x.league !== club.league))
          .sort((a, b) => b.strength - a.strength).slice(0, 8);
        if (pool2.length) vs = r.pick(pool2);
      }
      c.moment = { type, vs: vs.id, comp: type === 'cup' ? (lg.cup || 'Copa nacional') : type === 'cont' ? S.contName(club) : lg.name };
      if (type === 'cont' || type === 'acesso') c.moment.kick = r() < 0.55 ? 'pen' : 'fk';
      if (S.defKick(c.pos)) c.moment.kick = S.defKick(c.pos); // defensores: lance contra, no fim do jogo
      momentContext(c, c.moment, club, rank, leagueSize(club), r);
    }
    save();
    return c.moment;
  };

  // Parâmetros do minigame, todos vindos da carta
  S.kickSetup = function (c, type) {
    const E = S.eff(c);
    const fk = type === 'classico';
    const lv = id => (c.traits.includes(id) ? lvOf(c, id) : 0);
    if (type === 'save') {
      // Goleiro: o corpo do batedor "entrega" o lado por tellMs antes do chute (REF e Pegador aumentam);
      // o pulo alcança até diveReach (ELA); cantos além disso entram mesmo no lado certo
      const tellMs = Math.round(clamp(150 + (E.fin - 50) * 6 + lv('pegador') * 45 + lv('reflexo') * 35, 130, 520));
      const diveReach = round1(clamp(0.72 + (E.fis - 55) / 100 + lv('elastico') * 0.04, 0.65, 1.05) * 100) / 100;
      const chance = clamp(0.28 + (E.fin + E.def - 120) / 260 + lv('pegador') * 0.05 + lv('frieza') * 0.09, 0.15, 0.7);
      return { mode: 'save', tellMs, diveReach, chance: Math.round(chance * 100) / 100 };
    }
    if (type === 'tackle') {
      // Zagueiro: tocar quando o atacante passa pela zona certa. DEF alarga a zona; RIT deixa o lance mais lento
      const win = round1(clamp(0.1 + (E.def - 50) / 260 + lv('carrinho') * 0.015, 0.08, 0.26) * 100) / 100;
      const period = round1(clamp(0.95 + (E.rit - 50) * 0.01 + lv('antecipa') * 0.08, 0.8, 1.6) * 10) / 10;
      const chance = clamp(0.35 + (E.def - 60) / 80 + lv('carrinho') * 0.04 + lv('frieza') * 0.08, 0.2, 0.88);
      return { mode: 'tackle', win, period, chance: Math.round(chance * 100) / 100 };
    }
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
    const chance = fk ? clamp(0.3 + (E.fin - 60) / 110 + lv('frieza') * 0.1 + lv('parada') * 0.07, 0.15, 0.78)
      : clamp(0.62 + (E.fin - 60) / 150 + lv('frieza') * 0.1 + lv('colocado') * 0.03, 0.4, 0.92);
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
    if (ok) { k.ok++; if (type === 'fk') k.fkOk++; if (type === 'save') k.saveOk = (k.saveOk || 0) + 1; if (type === 'tackle') k.tackleOk = (k.tackleOk || 0) + 1; }
  };
  S.resolveMoment = function (c, ok) {
    if (!c.moment) return;
    c.mod.moment = Object.assign({}, c.moment, { ok: !!ok });
    S.countKick(c, S.kickType(c.moment), ok);
    c.moment = null;
  };
  // Sem jogar: sorteia com a chance mostrada
  S.autoMoment = function (c) {
    const { r, save } = rngOf(c);
    const ok = r() < S.kickSetup(c, S.kickSetupType(c.moment)).chance;
    save();
    S.resolveMoment(c, ok);
    return ok;
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
