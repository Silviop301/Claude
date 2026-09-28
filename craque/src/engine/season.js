// Simulação da temporada e manchetes
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { REL0, bump, clamp, moveClub, ovrOf, rngOf, round1 } = S._; // ajudantes do núcleo
  // ---------- temporada ----------
  const AGE_GROWTH = age => (age <= 20 ? 0.24 : age <= 23 ? 0.17 : age <= 26 ? 0.08 : age <= 29 ? 0.02 : 0);
  const AGE_DECLINE = age => (age <= 30 ? 0 : age <= 32 ? 1.8 : age <= 34 ? 3.5 : 5);

  S.playSeason = function (c) {
    const { r, save } = rngOf(c);
    const club = D.CLUB_BY_ID[c.club];
    const lg = D.LEAGUE_BY_ID[club.league];
    const E = S.eff(c);
    const ovr0 = S.ovr(c);
    const role = S.role(c, club);

    // Lesão: risco base + idade + eventos
    let injShare = c.mod.inj;
    // Físico alto protege de lesões
    // ~6% por temporada no auge físico; sobe com a idade (a partir dos 30) e com FÍS baixo
    const injRisk = clamp((0.065 + Math.max(0, c.age - 30) * 0.02) * clamp(1 - (E.fis - 60) / 90, 0.6, 1.25) * (1 - 0.25 * (c.inv.fisio || 0)), 0.02, 0.4);
    let injName = null;
    if (r() < injRisk) {
      injShare = Math.max(injShare, r.range(0.08, 0.32));
    }
    if (injShare > 0) injName = r.pick(['lesão na coxa', 'entorse no tornozelo', 'lesão no joelho', 'problema muscular']);

    if (c.farewell) c.mod.min += 0.1; // temporada de despedida: o técnico faz questão
    let share = clamp(role.share + c.mod.min + (c.rel.coach - REL0) / 250 + (c.age <= 17 ? -0.2 : 0), 0.05, 0.97);
    share *= 1 - injShare;
    const maxGames = 38 + (club.tier >= 3 ? 8 : 4);
    const games = Math.max(0, Math.round(maxGames * share));

    // Produção por jogo
    const o = ovr0;
    const teamF = 0.85 + (club.strength - D.TIERS[club.tier].min) * 0.02;
    const form = 1 + c.mod.form + r.gauss() * 0.08;
    // Gols saem da finalização (e do que ajuda a chegar nela); assistências, do passe e do drible
    const gA = E.fin * 0.5 + E.rit * 0.2 + E.dri * 0.15 + E.fis * 0.15;
    const aA = E.pas * 0.55 + E.dri * 0.25 + E.rit * 0.1 + E.fin * 0.1;
    let g90 = (c.pos === 'ATA' ? 0.1 + Math.max(0, gA - 45) * 0.0125 : 0.04 + Math.max(0, gA - 45) * 0.0055);
    let a90 = (c.pos === 'ATA' ? 0.04 + Math.max(0, aA - 45) * 0.0045 : 0.06 + Math.max(0, aA - 45) * 0.0075);
    g90 *= 1.14 * teamF * form * (1 + c.mod.goal);
    a90 *= 1.22 * teamF * form * (1 + c.mod.assist);

    let goals = 0, assists = 0;
    const highlights = [];
    let hat = 0, poker = 0;
    for (let i = 0; i < games; i++) {
      const g = r.poisson(g90 * 0.9);
      const a = r.poisson(a90 * 0.9);
      goals += g;
      assists += a;
      if (g >= 4) poker++;
      else if (g === 3) hat++;
    }
    if (poker) highlights.push('🔥 ' + (poker > 1 ? poker + ' jogos' : 'Um jogo') + ' com 4 gols ou mais!');
    if (hat) highlights.push('🎩 ' + hat + ' hat-trick' + (hat > 1 ? 's' : '') + ' na temporada');
    if (c.traits.includes('colocado') && c.traits.includes('parada') && goals > 5) highlights.push('🌟 ' + Math.max(2, Math.round(goals * 0.18)) + ' gols de falta');
    if (injName) highlights.push('🤕 ' + injName[0].toUpperCase() + injName.slice(1) + ': perdeu ' + Math.round(injShare * 100) + '% da temporada');

    // Nota média
    const perGame = games ? (goals + assists * 0.7) / games : 0;
    const rating = games ? clamp(round1(6.1 + perGame * 2.4 + (o - club.strength) * 0.03 + r.gauss() * 0.25), 5.0, 9.6) : 0;

    // Títulos: força do time + sua contribuição
    const contrib = games ? (rating - 6.5) * share * 2.2 : 0;
    const sEff = club.strength + contrib;
    const leagueClubs = D.CLUBS.filter(x => x.league === club.league);
    const top = Math.max(...leagueClubs.map(x => x.strength));
    // Defesa e físico pesam nos jogos grandes
    const titleBonus = (c.captain ? 0.08 : 0) + clamp((E.def + E.fis - 75) / 220, 0, 0.22);
    const pLeague = clamp(0.02 + (sEff - top + 4) / 16 + titleBonus * 0.6, 0.01, 0.55);
    const pCup = clamp(pLeague * 0.5 + 0.03 + titleBonus * 0.3, 0.02, 0.4);
    let league = r() < pLeague;
    let cup = r() < pCup;
    // Jogo decisivo (minigame) manda no resultado
    const M = c.mod.moment || null;
    if (M && M.type === 'cup') cup = M.ok;
    if (M && M.type === 'title') league = M.ok;
    if (M && M.ok) goals += 1;
    const pCont = club.tier >= 3 ? clamp((sEff - 80) / 40 + titleBonus * 0.3, 0.01, 0.25) * (club.tier === 5 ? 1 : club.tier === 4 ? 0.4 : 0.25) : 0;
    const cont = club.tier >= 3 && r() < pCont;
    const contName = ['bra-a', 'arg'].includes(club.league) ? 'Libertadores' : club.tier >= 4 ? 'Liga dos Campeões' : null;
    const titles = [];
    if (league) titles.push({ id: 'league', name: lg.name });
    if (cup) titles.push({ id: 'cup', name: lg.cup || 'Copa nacional' });
    if (cont && contName) titles.push({ id: 'cont', name: contName });
    // Tabela de 20 times: os rivais da liga mais times "de fora da lista" na faixa de baixo.
    // Cada um soma pontos em 38 rodadas pela força; a posição sai da comparação com todos.
    const others = leagueClubs.filter(x => x.id !== club.id).map(x => x.strength);
    const lo = Math.min(...leagueClubs.filter(x => x.id !== club.id).map(x => x.strength));
    for (let i = 0; others.length < 19; i++) others.push(lo - 1 + (i * 7) % 8);
    const avg = (others.reduce((a2, x) => a2 + x, 0) + club.strength) / 20;
    const ppg = x => clamp(1.35 + (x - avg) / 12, 0.5, 2.55);
    let pts = Math.round(38 * ppg(sEff) + r.gauss() * 4);
    const otherPts = others.map(x => Math.round(38 * ppg(x) + r.gauss() * 4));
    let leaderPts = Math.max(...otherPts), pos;
    if (league) { pts = Math.max(pts, leaderPts + 1 + Math.floor(r() * 3)); leaderPts = pts; pos = 1; }
    else if (M && M.type === 'title') { pos = 2; leaderPts = pts + 1 + Math.floor(r() * 2); } // vice por pouco
    else {
      pos = 1 + otherPts.filter(p => p >= pts).length;
      if (pos === 1) { pos = 2; leaderPts = pts + 1 + Math.floor(r() * 3); } // não foi campeão: alguém passou na frente
    }
    const table = { pos, pts, gap: league ? 0 : Math.max(1, leaderPts - pts), league: lg.name };
    // Acesso / rebaixamento pela posição final
    const LD = D.LADDER[club.league];
    let move = null;
    if (LD && LD.up && pos <= LD.promo) move = { dir: 'up', to: LD.up };
    else if (LD && LD.down && pos > 20 - LD.releg) move = { dir: 'down', to: LD.down };
    if (move) move.toName = D.LEAGUE_BY_ID[move.to].name;
    // Jogos marcantes (rivais da própria liga)
    const rivals = leagueClubs.filter(x => x.id !== club.id);
    const rival = rivals.length ? rivals.slice().sort((x, y) => y.strength - x.strength)[0] : null;
    const other = rivals.length ? r.pick(rivals) : null;
    if (M) {
      const vsName = D.CLUB_BY_ID[M.vs].name;
      const hl = {
        cup: M.ok ? '⚽ Seu pênalti decidiu a final da ' + M.comp + ' contra ' + D.o(vsName) : '😞 Pênalti perdido na final da ' + M.comp + ' contra ' + D.o(vsName),
        title: M.ok ? '⚽ Pênalti convertido na última rodada: título contra ' + D.o(vsName) : '😞 Pênalti perdido na última rodada contra ' + D.o(vsName) + ': vice',
        classico: M.ok ? '🎯 Gol de falta no clássico contra ' + D.o(vsName) : '🧱 Falta desperdiçada no clássico contra ' + D.o(vsName),
      }[M.type];
      highlights.unshift(hl);
    }
    if (league && rival && !(M && M.type === 'title')) highlights.push('🏆 Título garantido na última rodada contra ' + D.o(rival.name));
    if (cup && other && !(M && M.type === 'cup')) highlights.push('🏆 Final da ' + (lg.cup || 'copa') + ' contra ' + D.o(other.name) + (goals > 5 ? ': gol seu!' : ''));
    if (cont && contName) highlights.push('🌍 Campeão da ' + contName + '!');
    if (!league && rival && games >= 10 && goals + assists >= 8) highlights.push('⚔️ Decidiu o clássico contra ' + D.o(rival.name));
    if (!league && pos >= 14 && games >= 10 && !move) highlights.push('😰 Temporada de sufoco na parte de baixo da tabela');

    // Prêmios
    const awards = [];
    const scorerLine = 17 + club.tier * 2 + r.range(-3, 3);
    if (goals >= scorerLine && c.pos === 'ATA') awards.push({ id: 'scorer', name: 'Artilheiro ' + D.da(lg.name) });
    if (c.pos === 'MEI' && assists >= 14 + club.tier + r.range(-2, 2)) awards.push({ id: 'scorer', name: 'Líder de assistências ' + D.da(lg.name) });
    if (c.age <= 21 && rating >= 7.2 && club.tier >= 3) awards.push({ id: 'young', name: 'Melhor jovem ' + D.da(lg.name) });
    if (rating >= 7.5 && games >= 20) awards.push({ id: 'team', name: 'Seleção ' + D.da(lg.name) });
    // Bola de Ouro: só em clubes de nível 4-5
    const bScore = goals + assists * 0.6 + titles.length * 8 + (cont ? 10 : 0) + (rating - 6) * 12 + (c.wcBoost || 0);
    c.wcBoost = 0;
    // Cada Bola de Ouro anterior aumenta a exigência (a concorrência cresce)
    const pBallon = club.tier >= 4 && o >= 87 ? clamp(1 / (1 + Math.exp(-(bScore - 92 - 9 * c.totals.ballon) / 7)) * (club.tier === 5 ? 0.6 : 0.2), 0, 0.6) : 0;
    const ballon = r() < pBallon;
    if (ballon) awards.push({ id: 'ballon', name: 'BOLA DE OURO' });

    // Fama
    const fame0 = c.fame;
    c.fame = Math.max(0, c.fame * 0.85 + (goals * 0.5 + assists * 0.35 + titles.length * 6 + awards.length * 6 + (ballon ? 30 : 0) + club.tier * 2) * (0.8 + c.rel.fans / 250));
    const coach0 = c.rel.coach, fans0 = c.rel.fans;
    if (games) {
      bump(c, 'coach', (rating - 6.6) * 10);
      bump(c, 'fans', (rating - 6.6) * 9 + titles.length * 6 + (M && M.type === 'classico' && M.ok ? 8 : 0) + (move ? (move.dir === 'up' ? 8 : -10) : 0) - (c.captain && rating < 6.8 ? 6 : 0));
    }
    c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans);

    // Evolução
    // Jogar muito e bem faz evoluir mais e pode até elevar o teto (potencial)
    const potUp = games >= 22 && rating >= 7.6 && c.age <= 26 ? (rating >= 8.2 ? 2 : 1) : 0;
    if (potUp) c.pot = Math.min(99, c.pot + potUp);
    const growth = (c.pot - ovrOf(c.attrs, c.pos)) * AGE_GROWTH(c.age) * (0.3 + share * 1.25);
    const decline = AGE_DECLINE(c.age) * S.declMult(c);
    const luck = r.gauss() * 1.2;
    const delta = growth - decline + luck;
    const w = D.POS[c.pos].w;
    for (const k in c.attrs) c.attrs[k] = clamp(c.attrs[k] + delta * (0.5 + w[k] * 2.2) + r.gauss() * 0.6, 20, 99);
    const ovr1 = S.ovr(c);
    if (ovr1 >= c.peak || !c.peakAttrs) c.peakAttrs = S.eff(c);
    c.peak = Math.max(c.peak, ovr1, o);
    // Por que a nota mudou (em pontos de nota geral, aproximados)
    const why = [];
    if (growth >= 0.5) why.push({ txt: games >= 30 ? games + ' jogos: muito tempo em campo' : games >= 15 ? games + ' jogos: evolução com minutos' : 'Poucos minutos: evoluiu pouco', v: Math.round(growth) });
    else if (c.age <= 26 && games < 15) why.push({ txt: 'Poucos minutos: evolução travada', v: Math.round(growth) });
    if (decline > 0) why.push({ txt: 'Idade (' + c.age + ' anos)' + (S.declMult(c) < 1 ? ', amenizada por Profissional' : ''), v: -Math.round(decline) });
    if (Math.abs(luck) >= 1) why.push({ txt: luck > 0 ? 'Fase boa nos treinos' : 'Fase ruim nos treinos', v: Math.round(luck) });
    if (potUp) why.push({ txt: 'Temporada brilhante elevou seu teto', v: 0, pot: true });

    // Dinheiro e totais
    c.money += c.wage * 52;
    const T = c.totals;
    T.games += games; T.goals += goals; T.assists += assists;
    if (league) T.league++;
    if (cup) T.cup++;
    if (cont) T.cont++;
    awards.forEach(a => { if (a.id in T) T[a.id]++; });
    // Sala de troféus: conta por competição
    c.trophies = c.trophies || {};
    titles.forEach(t => {
      const k = t.name;
      const type = t.id === 'cont' ? (t.name === 'Libertadores' ? 'lib' : 'ucl') : t.id;
      c.trophies[k] = c.trophies[k] || { type, n: 0 };
      c.trophies[k].n++;
    });
    if (ballon) { c.trophies['Bola de Ouro'] = c.trophies['Bola de Ouro'] || { type: 'ballon', n: 0 }; c.trophies['Bola de Ouro'].n++; }
    const sp = c.spells[c.spells.length - 1];
    sp.games += games; sp.goals += goals; sp.assists += assists; sp.titles += titles.length; sp.to = c.age;
    sp.seasons = (sp.seasons || 0) + 1;

    const res = {
      age: c.age, club: club.id, role: role.name, games, goals, assists, rating, titles, awards,
      ovr0, ovr1, fame0: Math.round(fame0), fame1: Math.round(c.fame), injury: injName ? Math.round(injShare * 100) : 0,
      coach0: Math.round(coach0), coach1: Math.round(c.rel.coach), fans0: Math.round(fans0), fans1: Math.round(c.rel.fans),
      highlights, event: c.lastEvent || null, table, why, farewell: !!c.farewell,
    };
    res.move = move;
    res.headlines = S.headlines(c, res);
    if (move) moveClub(c, club, move.to);
    c.seasons.push(res);
    c.age++;
    c.season++;
    c.contract = Math.max(0, c.contract - 1);
    c.mod = { min: 0, form: 0, inj: 0, goal: 0, assist: 0 };
    c.lastEvent = null;
    save();
    return res;
  };

  S.headlines = function (c, s) {
    const club = D.CLUB_BY_ID[s.club].name;
    const nick = c.name;
    const h = [];
    if (s.awards.some(a => a.id === 'ballon')) h.push(nick + ' é o melhor do mundo!');
    if (s.move && s.move.dir === 'up') h.push('Acesso! ' + club + ' garante vaga ' + D.na(s.move.toName));
    if (s.move && s.move.dir === 'down') h.push('Rebaixamento: ' + club + ' cai ' + D.paraA(s.move.toName));
    if (s.titles.length >= 2) h.push('Temporada histórica: ' + club + ' leva ' + s.titles.length + ' taças');
    else if (s.titles.length) h.push(club + (D.fem(club) ? ' é campeã' : ' é campeão') + ' com ' + nick + ' em campo');
    if (s.goals >= 30) h.push(s.goals + ' gols: ' + nick + ' vira pesadelo das defesas');
    else if (s.assists >= 15) h.push('O garçom da liga: ' + s.assists + ' assistências de ' + nick);
    if (s.ovr1 - s.ovr0 >= 5) h.push(nick + ' não para de evoluir');
    if (s.ovr1 - s.ovr0 <= -4) h.push('Idade pesa? ' + nick + ' já não é o mesmo');
    if (s.injury >= 25) h.push('Lesão atrapalha temporada de ' + nick);
    if (s.games < 12 && !s.injury) h.push(nick + ' pede mais minutos ' + D.no(club));
    if (s.rating && s.rating < 6.3 && s.games >= 12) h.push('Torcida ' + D.do(club) + ' pega no pé de ' + nick);
    if (!h.length) h.push('Temporada regular de ' + nick + ' ' + D.no(club));
    return h.slice(0, 3);
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
