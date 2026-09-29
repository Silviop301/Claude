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
    const isDef = D.DEF_POS.includes(c.pos);
    let g90, a90;
    if (c.pos === 'ATA') { g90 = 0.1 + Math.max(0, gA - 45) * 0.0125; a90 = 0.04 + Math.max(0, aA - 45) * 0.0045; }
    else if (c.pos === 'MEI') { g90 = 0.04 + Math.max(0, gA - 45) * 0.0055; a90 = 0.06 + Math.max(0, aA - 45) * 0.0075; }
    else if (c.pos === 'ZAG') { // gols de cabeça em bola parada; poucas assistências
      g90 = 0.025 + Math.max(0, E.fis * 0.4 + E.fin * 0.3 + E.def * 0.3 - 45) * 0.0014;
      a90 = 0.01 + Math.max(0, E.pas - 45) * 0.0009;
    } else { g90 = 0; a90 = 0.002; } // goleiro
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

    // Defesa (todas as posições registram; zagueiro e goleiro são avaliados por isso):
    // jogos sem sofrer gol dependem da força defensiva do time, que o jogador defensivo puxa pela nota
    const leagueAll = D.CLUBS.filter(x => x.league === club.league);
    const lgAvg = leagueAll.reduce((a2, x) => a2 + x.strength, 0) / leagueAll.length;
    const dS = club.strength + (isDef ? (o - club.strength) * 0.35 : 0);
    const pCS = Math.exp(-1.45 * Math.exp((lgAvg - dS) / 12));
    let cleanSheets = 0, saves = 0, penFaced = 0, penSaved = 0, tackles = 0;
    for (let i = 0; i < games; i++) if (r() < pCS) cleanSheets++;
    if (c.pos === 'GOL') {
      saves = r.poisson(games * clamp(0.3 + (E.fin + E.fis - 110) / 180, 0.15, 0.8));
      penFaced = r.poisson(games * 0.11);
      const pPen = clamp(0.16 + (E.fin + E.def - 120) / 320 + (c.traits.includes('pegador') ? 0.05 * S.traitLevel(c, 'pegador') : 0), 0.08, 0.45);
      for (let i = 0; i < penFaced; i++) if (r() < pPen) penSaved++;
    }
    if (c.pos === 'ZAG') tackles = r.poisson(games * clamp(0.12 + (E.def - 60) / 150, 0.05, 0.45));
    if (isDef && games >= 20 && cleanSheets / games >= 0.45) highlights.push('🧱 Muralha: ' + cleanSheets + ' jogos sem sofrer gol');
    if (penSaved >= 2) highlights.push('🧤 ' + penSaved + ' pênaltis defendidos na temporada');

    // Nota média
    const perGame = games ? (isDef
      ? (cleanSheets / games) * 0.85 + (goals * 1.2 + assists * 0.5) / games + (saves / games) * 0.35 + penSaved * 0.03 + (tackles / games) * 0.2
      : (goals + assists * 0.7) / games) : 0;
    const rating = games ? clamp(round1(6.1 + perGame * 2.4 * (isDef ? 0.75 : 1) + (o - club.strength) * 0.03 + r.gauss() * 0.25), 5.0, 9.6) : 0;

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
    // Continental: Libertadores (Brasil/Argentina) mede força contra o nível sul-americano; Champions, contra o europeu
    const libert = ['bra-a', 'arg'].includes(club.league);
    const pCont = club.tier < 3 ? 0 : libert ? clamp((sEff - 66) / 28 + titleBonus * 0.3, 0.01, 0.28)
      : clamp((sEff - 80) / 40 + titleBonus * 0.3, 0.01, 0.25) * (club.tier === 5 ? 1 : club.tier === 4 ? 0.4 : 0.25);
    let cont = club.tier >= 3 && r() < pCont;
    const contName = S.contName(club);
    if (M && M.type === 'cont' && contName) cont = M.ok; // final continental decidida no minigame
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
        cont: M.ok ? '🌍 ' + (M.kick === 'fk' ? 'Seu gol de falta' : 'Seu pênalti') + ' decidiu a final da ' + M.comp + ' contra ' + D.o(vsName) + '!'
          : '😞 ' + (M.kick === 'fk' ? 'Falta desperdiçada' : 'Pênalti perdido') + ' na final da ' + M.comp + ' contra ' + D.o(vsName),
      }[M.type];
      // Zagueiro e goleiro: o lance é defensivo (pênalti contra ou contra-ataque no fim)
      const where = { cup: 'na final da ' + M.comp, title: 'na última rodada', classico: 'no clássico', cont: 'na final da ' + M.comp }[M.type];
      const defHl = M.kick === 'save' ? (M.ok ? '🧤 Pênalti defendido ' + where + ' contra ' + D.o(vsName) + '!' : '😞 Pênalti sofrido ' + where + ' contra ' + D.o(vsName))
        : M.kick === 'tackle' ? (M.ok ? '🛡️ Desarme salvador ' + where + ' contra ' + D.o(vsName) + '!' : '😞 O atacante passou ' + where + ' contra ' + D.o(vsName))
        : null;
      highlights.unshift(defHl || hl);
    }
    if (league && rival && !(M && M.type === 'title')) highlights.push('🏆 Título garantido na última rodada contra ' + D.o(rival.name));
    if (cup && other && !(M && M.type === 'cup')) highlights.push('🏆 Final da ' + (lg.cup || 'copa') + ' contra ' + D.o(other.name) + (goals > 5 ? ': gol seu!' : ''));
    if (cont && contName && !(M && M.type === 'cont')) highlights.push('🌍 Campeão da ' + contName + '!');
    if (!league && rival && games >= 10 && (isDef ? cleanSheets >= 15 : goals + assists >= 8)) highlights.push((isDef ? '🛡️ Segurou o zero no clássico contra ' : '⚔️ Decidiu o clássico contra ') + D.o(rival.name));
    if (!league && pos >= 14 && games >= 10 && !move) highlights.push('😰 Temporada de sufoco na parte de baixo da tabela');

    // Prêmios
    const awards = [];
    const scorerLine = 17 + club.tier * 2 + r.range(-3, 3);
    if (goals >= scorerLine && c.pos === 'ATA') awards.push({ id: 'scorer', name: 'Artilheiro ' + D.da(lg.name) });
    if (c.pos === 'MEI' && assists >= 14 + club.tier + r.range(-2, 2)) awards.push({ id: 'scorer', name: 'Líder de assistências ' + D.da(lg.name) });
    if (c.pos === 'ZAG' && games >= 25 && rating >= 7.1 + r.range(-0.15, 0.15)) awards.push({ id: 'scorer', name: 'Melhor zagueiro ' + D.da(lg.name) });
    if (c.pos === 'GOL' && games >= 25 && cleanSheets >= 15 + r.range(-2, 2)) awards.push({ id: 'scorer', name: 'Luva de Ouro ' + D.da(lg.name) });
    if (c.age <= 21 && rating >= 7.2 && club.tier >= 3) awards.push({ id: 'young', name: 'Melhor jovem ' + D.da(lg.name) });
    if (rating >= 7.5 && games >= 20) awards.push({ id: 'team', name: 'Seleção ' + D.da(lg.name) });
    // Bola de Ouro: só em clubes de nível 4-5
    // Defensores entram pela muralha (jogos sem sofrer gol, defesas, pênaltis defendidos)
    const prod = isDef ? goals * 2 + assists * 0.6 + cleanSheets * 0.9 + saves * 0.2 + penSaved * 2 + tackles * 0.1 : goals + assists * 0.6;
    const bScore = prod + titles.length * 8 + (cont ? 10 : 0) + (rating - 6) * 12 + (c.wcBoost || 0);
    c.wcBoost = 0;
    // Cada Bola de Ouro anterior aumenta a exigência (a concorrência cresce)
    // Defensor raramente ganha a Bola de Ouro (como na vida real)
    const pBallon = club.tier >= 4 && o >= 87 ? clamp(1 / (1 + Math.exp(-(bScore - 92 - 9 * c.totals.ballon) / 7)) * (club.tier === 5 ? 0.6 : 0.2) * (isDef ? 0.45 : 1), 0, 0.6) : 0;
    const ballon = r() < pBallon;
    if (ballon) awards.push({ id: 'ballon', name: 'BOLA DE OURO' });

    // Fama
    const fame0 = c.fame;
    c.fame = Math.max(0, c.fame * 0.85 + (goals * 0.5 + assists * 0.35 + (isDef ? cleanSheets * 0.35 + saves * 0.1 + penSaved * 1.5 + tackles * 0.1 : 0) + titles.length * 6 + awards.length * 6 + (ballon ? 30 : 0) + club.tier * 2) * (0.8 + c.rel.fans / 250));
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
    // Cartas especiais da temporada (a foto é com a nota já atualizada)
    const yr = S.YEAR0 + c.season;
    const cards = [];
    const main = isDef ? (c.pos === 'GOL' ? cleanSheets + ' SEM SOFRER GOL' : goals ? goals + ' GOLS · ' + cleanSheets + ' S/ GOL' : cleanSheets + ' SEM SOFRER GOL') : c.pos === 'MEI' ? assists + ' ASSIST.' : goals + ' GOLS';
    // Seleção da Temporada: só as temporadas de gala (nota alta, muitos jogos, liga forte)
    if (awards.some(a => a.id === 'team') && rating >= 8.1 && games >= 25 && club.tier >= 3 && (c.cards || []).filter(k => k.type === 'tots').length < 6) cards.push(S.addCard(c, 'tots', lg.name.toUpperCase() + ' ' + yr + ' · ' + main));
    if (M && M.type === 'cont' && M.ok) cards.push(S.addCard(c, 'heroi', 'FINAL DA ' + M.comp.toUpperCase() + ' ' + yr));
    if (ballon) cards.push(S.addCard(c, 'bola', 'MELHOR DO MUNDO · ' + yr));
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
    T.cs = (T.cs || 0) + cleanSheets; T.saves = (T.saves || 0) + saves; T.penSaved = (T.penSaved || 0) + penSaved; T.tackles = (T.tackles || 0) + tackles;
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
    sp.cs = (sp.cs || 0) + cleanSheets;
    sp.seasons = (sp.seasons || 0) + 1;

    const res = {
      age: c.age, club: club.id, role: role.name, games, goals, assists, rating, titles, awards,
      cleanSheets, saves, penSaved, tackles, pos: c.pos,
      ovr0, ovr1, fame0: Math.round(fame0), fame1: Math.round(c.fame), injury: injName ? Math.round(injShare * 100) : 0,
      coach0: Math.round(coach0), coach1: Math.round(c.rel.coach), fans0: Math.round(fans0), fans1: Math.round(c.rel.fans),
      highlights, event: c.lastEvent || null, table, why, farewell: !!c.farewell,
      attrs: S.eff(c), cards, // foto da carta desta temporada (para o álbum) e cartas especiais ganhas
    };
    res.move = move;
    res.headlines = S.headlines(c, res);
    res.column = S.column(c, res);
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
    else if (s.penSaved >= 2) h.push('Pegador! ' + nick + ' defende ' + s.penSaved + ' pênaltis na temporada');
    else if (s.cleanSheets >= 18) h.push(s.cleanSheets + ' jogos sem sofrer gol: ' + nick + ' fecha a defesa ' + D.do(club));
    else if (s.pos === 'ZAG' && s.goals >= 5) h.push('Zagueiro artilheiro: ' + nick + ' marca ' + s.goals + ' gols de cabeça');
    if (s.ovr1 - s.ovr0 >= 5) h.push(nick + ' não para de evoluir');
    if (s.ovr1 - s.ovr0 <= -4) h.push('Idade pesa? ' + nick + ' já não é o mesmo');
    if (s.injury >= 25) h.push('Lesão atrapalha temporada de ' + nick);
    if (s.games < 12 && !s.injury) h.push(nick + ' pede mais minutos ' + D.no(club));
    if (s.rating && s.rating < 6.3 && s.games >= 12) h.push('Torcida ' + D.do(club) + ' pega no pé de ' + nick);
    if (!h.length) h.push('Temporada regular de ' + nick + ' ' + D.no(club));
    // Jornal com memória: uma manchete que lembra o passado entra em 2º (ou em 1º se for a história do ano)
    const mem = S.memoryHeadline(c, s);
    if (mem) { if (mem.top) h.unshift(mem.txt); else h.splice(1, 0, mem.txt); }
    return h.slice(0, 3);
  };

  // Manchetes que olham para trás (c.seasons ainda não tem a temporada atual; c.spells já conta ela)
  S.memoryHeadline = function (c, s) {
    const nick = c.name, cur = D.CLUB_BY_ID[s.club], past = c.seasons;
    const sp = c.spells[c.spells.length - 1];
    const first = c.firstClub && D.CLUB_BY_ID[c.firstClub];
    const cont = s.titles.find(t => t.id === 'cont');
    const ballons = past.filter(x => x.awards.some(a => a.id === 'ballon')).length + (s.awards.some(a => a.id === 'ballon') ? 1 : 0);
    const lastTitle = [...past].reverse().findIndex(x => x.titles.length);
    const opts = [];
    // Grandes histórias
    if (cont && first && first.id !== cur.id && first.tier <= 2) opts.push({ w: 9, top: true, txt: 'Revelado ' + D.pelo(first.name) + ', ' + nick + ' conquista a ' + cont.name });
    if (ballons >= 2 && s.awards.some(a => a.id === 'ballon')) opts.push({ w: 9, top: true, txt: nick + ' é o melhor do mundo pela ' + ballons + 'ª vez' });
    if (sp.seasons === 1 && c.spells.slice(0, -1).some(x => x.seasons && x.club === cur.id)) opts.push({ w: 8, txt: 'De volta para casa: ' + nick + ' reencontra ' + D.o(cur.name) });
    if (s.titles.length && past.length && !past.some(x => x.titles.length))opts.push({ w: 7, txt: 'Enfim campeão: a primeira taça da carreira de ' + nick });
    else if (s.titles.length && lastTitle >= 3) opts.push({ w: 7, txt: 'Fim do jejum: ' + nick + ' volta a erguer uma taça depois de ' + (lastTitle + 1) + ' anos' });
    if (sp.seasons === 10) opts.push({ w: 7, txt: 'Uma década ' + D.no(cur.name) + ': ' + nick + ' vira símbolo do clube' });
    // Recordes pessoais
    const def = c.pos === 'ZAG' || c.pos === 'GOL';
    const key = c.pos === 'GOL' ? 'cleanSheets' : c.pos === 'MEI' ? 'assists' : 'goals';
    const best = Math.max(0, ...past.map(x => x[key] || 0));
    const word = { cleanSheets: 'jogos sem sofrer gol', assists: 'assistências', goals: 'gols' }[key];
    if (past.length >= 3 && s[key] > best && s[key] >= (def ? 15 : 12)) opts.push({ w: 5, txt: 'Recorde pessoal: ' + s[key] + ' ' + word + ', a melhor marca da carreira de ' + nick });
    // Viradas de fase
    const prev = past[past.length - 1];
    if (prev && prev.rating && prev.rating < 6.4 && prev.games >= 12 && s.rating >= 7.2) opts.push({ w: 6, txt: 'Da vaia ao aplauso: ' + nick + ' dá a volta por cima' });
    if (prev && prev.move && prev.move.dir === 'down' && s.move && s.move.dir === 'up') opts.push({ w: 6, txt: 'Caiu e subiu: ' + nick + ' devolve ' + D.o(cur.name) + ' à elite' });
    if (past.length === 0 && s.games >= 10) opts.push({ w: 4, txt: 'Aos ' + s.age + ' anos, ' + nick + ' estreia no profissional ' + D.do(cur.name) });
    if (sp.seasons === 1 && first && first.id !== cur.id && cur.tier >= first.tier + 3) opts.push({ w: 4, txt: 'D' + D.do(first.name).slice(1) + ' para ' + D.o(cur.name) + ': o salto de ' + nick });
    if (!opts.length) return null;
    return opts.sort((a, b) => b.w - a.w)[0];
  };

  // Coluna do cronista (sempre o mesmo colunista, opinião conforme a fase)
  S.COLUMNIST = 'Tião Barbosa';
  S.column = function (c, s) {
    const nick = c.name, cur = D.CLUB_BY_ID[s.club], past = c.seasons, prev = past[past.length - 1];
    const pick = arr => arr[(past.length + nick.length) % arr.length];
    const def = c.pos === 'ZAG' || c.pos === 'GOL';
    const big = s.titles.find(t => t.id === 'cont');
    const trend = prev && prev.rating ? s.rating - prev.rating : 0;
    if (!s.games) return { t: 'Cadê ' + nick + '?', x: 'Uma temporada inteira olhando do banco. Talento não se prova no aquecimento.' };
    if (s.awards.some(a => a.id === 'ballon')) return { t: 'O mundo aos pés', x: pick(['Poucos chegam aqui. ' + nick + ' chegou e não parece satisfeito. Isso é o que separa os bons dos eternos.', 'Escrevo há 40 anos e vi poucos como ' + nick + '. Guardem esta edição.']) };
    if (big) return { t: 'Noite de gala', x: 'Há jogadores que somem nas finais. ' + nick + ' cresce. A ' + big.name + ' tem a assinatura dele.' };
    if (c.age >= 33 && trend <= -0.3) return { t: 'A hora certa', x: pick(['O corpo avisa antes da cabeça. ' + nick + ' ainda tem lampejos, mas já não decide como antes. Saber parar também é arte.', 'Ninguém apaga o que ' + nick + ' fez. Mas a pergunta que ninguém quer fazer já está no ar: até quando?']) };
    if (s.rating >= 7.5 && cur.tier <= 2) return { t: 'Grande demais', x: nick + ' joga num nível acima do resto ' + D.do(cur.name) + '. Se ninguém de fora bater na porta, é porque não estão assistindo.' };
    if (s.rating >= 7.5) return { t: pick(['Fora da curva', 'Aula de futebol']), x: def ? pick(['Atacante que encara ' + nick + ' sai de campo pensando na vida. Defender também é talento.', 'Não aparece nos melhores momentos, mas é dele o jogo que ninguém vê. Sem ' + nick + ', ' + D.o(cur.name) + ' é outro time.']) : pick(['Toda vez que a bola chega em ' + nick + ', o estádio levanta. Isso não se ensina.', nick + ' joga como quem já sabe o fim do lance. Os outros ainda estão pensando.']) };
    if (c.age <= 19 && s.rating >= 6.9) return { t: 'Guardem esse nome', x: 'Com ' + c.age + ' anos, ' + nick + ' joga sem medo. Falta casca, sobra personalidade. O futuro é dele, se não se perder no caminho.' };
    if (trend >= 0.6) return { t: 'Volta por cima', x: 'Muita gente (eu incluído) duvidou de ' + nick + '. Temporada para calar os críticos. Engulo minhas palavras com prazer.' };
    if (['ara', 'usa'].includes(cur.league) && c.age <= 30) return { t: 'Escolhas', x: 'O dinheiro é bom, ninguém nega. Mas ' + nick + ' tinha futebol para brigar por coisa maior. Cada um sabe da sua conta bancária.' };
    if (c.rel.coach < 35) return { t: 'Clima pesado', x: 'Nos bastidores ' + D.do(cur.name) + ', a relação de ' + nick + ' com o técnico azedou. Alguém vai ter que ceder, e costuma ser o jogador.' };
    if (s.games < 12) return { t: 'Pouco tempo', x: nick + ' precisa de minutos. Talento parado enferruja. Ou ganha espaço, ou arruma as malas.' };
    if (s.rating < 6.4) return { t: 'Cadê o futebol?', x: pick(['A torcida ' + D.do(cur.name) + ' já perdeu a paciência. ' + nick + ' parece jogar com o freio de mão puxado.', 'Não é falta de talento, é falta de fome. ' + nick + ' precisa decidir que jogador quer ser.']) };
    return { t: pick(['Nota de rodapé', 'Nem lá, nem cá', 'Morno']), x: pick(['Temporada correta de ' + nick + '. Correta demais. Craque que é craque deixa marca, e essa passou sem deixar.', nick + ' fez o básico. O problema é que o básico não entra na história.']) };
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
