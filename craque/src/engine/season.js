// Simulação da temporada e manchetes
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { REL0, bump, clamp, moveClub, ovrOf, rngOf, round1 } = S._; // ajudantes do núcleo
  // ---------- temporada ----------
  const AGE_GROWTH = age => (age <= 20 ? 0.24 : age <= 23 ? 0.17 : age <= 26 ? 0.08 : age <= 29 ? 0.02 : 0);
  // Ajuste geral da evolução (as características dão menos atributo desde que ganharam efeitos próprios)
  const GROWTH_K = 0.9;
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
    const injRisk = clamp((0.065 + Math.max(0, c.age - 30) * 0.02) * clamp(1 - (E.fis - 60) / 90, 0.6, 1.25) * (1 - 0.25 * (c.inv.fisio || 0)) *
      (1 - 0.15 * S.tm(c, 'pro') + 0.05 * S.tm(c, 'raca')) * S.trainOf(c).inj, 0.02, 0.5); // Profissional se machuca menos; Raça, mais; treino pesado, mais
    let injName = null;
    if (r() < injRisk) {
      injShare = Math.max(injShare, r.range(0.08, 0.32));
    }
    if (injShare > 0) injName = r.pick(['lesão na coxa', 'entorse no tornozelo', 'lesão no joelho', 'problema muscular']);

    if (c.farewell) c.mod.min += 0.1; // temporada de despedida: o técnico faz questão
    // Promessa do técnico (conversa depois de uma temporada no banco) vale por uma temporada
    let share = clamp(role.share + c.mod.min + (c.promise || 0) + (c.rel.coach - REL0) / 250 + (c.age <= 17 ? -0.2 : 0), 0.05, 0.97);
    share *= 1 - injShare;
    // Jogos possíveis: rodadas da liga (ida e volta, no mínimo 20 times) mais as copas
    const lgSize = Math.max(20, D.CLUBS.filter(x => x.league === club.league).length);
    const maxGames = 2 * (lgSize - 1) + (club.tier >= 3 ? 8 : 4);
    const games = Math.max(0, Math.round(maxGames * share));

    // Produção por jogo
    const o = ovr0;
    // Visão de Jogo faz o time render mais (produção e chance de título)
    const teamBoost = 0.8 * S.tm(c, 'visao');
    const teamF = 0.85 + (club.strength + teamBoost - D.TIERS[club.tier].min) * 0.02;
    const form = 1 + c.mod.form + r.gauss() * 0.08;
    // Gols saem da finalização (e do que ajuda a chegar nela); assistências, do passe e do drible
    const gA = E.fin * 0.5 + E.rit * 0.2 + E.dri * 0.15 + E.fis * 0.15;
    const aA = E.pas * 0.55 + E.dri * 0.25 + E.rit * 0.1 + E.fin * 0.1;
    const isDef = D.DEF_POS.includes(c.pos);
    let g90, a90;
    if (c.pos === 'ATA') { g90 = 0.1 + Math.max(0, gA - 45) * 0.0113; a90 = 0.04 + Math.max(0, aA - 45) * 0.0045; }
    else if (c.pos === 'MEI') { g90 = 0.04 + Math.max(0, gA - 45) * 0.0055; a90 = 0.06 + Math.max(0, aA - 45) * 0.0075; }
    else if (c.pos === 'ZAG') { // gols de cabeça em bola parada; poucas assistências
      g90 = 0.025 + Math.max(0, E.fis * 0.4 + E.fin * 0.3 + E.def * 0.3 - 45) * 0.0014;
      a90 = 0.01 + Math.max(0, E.pas - 45) * 0.0009;
    } else { g90 = 0; a90 = 0.002; } // goleiro
    // Estilo de jogo (características): quanto pesa em gols e em assistências
    const tm = id => S.tm(c, id);
    const gMul = 1 + 0.06 * tm('artilheiro') - 0.08 * tm('garcom') + 0.04 * tm('tecnica') + 0.05 * tm('cabeceio') + 0.2 * tm('aereo');
    const aMul = 1 - 0.08 * tm('artilheiro') + 0.08 * tm('garcom') + 0.04 * tm('tecnica') + 0.3 * tm('saida');
    g90 *= 1.14 * teamF * form * (1 + c.mod.goal) * gMul;
    a90 *= 1.22 * teamF * form * (1 + c.mod.assist) * aMul;

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
    // Números que se repetem toda temporada só viram destaque quando batem o recorde pessoal
    c.best = c.best || {};
    const rec = (k, val, txt) => { if (val > (c.best[k] || 0)) { highlights.push(txt + (c.best[k] ? ', recorde pessoal' : '')); c.best[k] = val; } };
    if (c.traits.includes('colocado') && c.traits.includes('parada') && goals > 5) { const fk = Math.max(2, Math.round(goals * 0.18)); rec('fk', fk, '🌟 ' + fk + ' gols de falta'); }
    if (injName) highlights.push('🤕 ' + injName[0].toUpperCase() + injName.slice(1) + ': perdeu ' + Math.round(injShare * 100) + '% da temporada');

    // Defesa (todas as posições registram; zagueiro e goleiro são avaliados por isso):
    // jogos sem sofrer gol dependem da força defensiva do time, que o jogador defensivo puxa pela nota
    const leagueAll = D.CLUBS.filter(x => x.league === club.league);
    const lgAvg = leagueAll.reduce((a2, x) => a2 + x.strength, 0) / leagueAll.length;
    const dS = club.strength + teamBoost + (isDef ? (o - club.strength) * 0.35 : 0) + 0.7 * tm('xerife') + 1 * tm('maofirme');
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
    if (isDef && games >= 20 && cleanSheets / games >= 0.45) rec('cs', cleanSheets, '🧱 Muralha: ' + cleanSheets + ' jogos sem sofrer gol');
    if (penSaved >= 2) rec('pen', penSaved, '🧤 ' + penSaved + ' pênaltis defendidos na temporada');

    // Nota média
    const perGame = games ? (isDef
      ? (cleanSheets / games) * 0.85 + (goals * 1.2 + assists * 0.5) / games + (saves / games) * 0.35 + penSaved * 0.03 + (tackles / games) * 0.2
      : (goals + assists * 0.7) / games) : 0;
    const rating = games ? clamp(round1(6.1 + perGame * 2.4 * (isDef ? 0.75 : 1) + (o - club.strength) * 0.03 + 0.06 * tm('drible') + 0.08 * tm('libero') + 0.07 * tm('raca') + 0.06 * tm('estrela') + r.gauss() * 0.25), 5.0, 9.6) : 0;

    // Títulos: força do time + sua contribuição
    const contrib = games ? (rating - 6.5) * share * 2.2 : 0;
    // Craque num time fraco carrega o time (Neymar no Santos): só com diferença grande (10+) e a partir
    // do 2º ano no clube; emprestado não conta
    const spNow = c.spells[c.spells.length - 1], star = !c.loan && (spNow.seasons || 0) >= 1 && o - club.strength >= S.STAR_GAP;
    const carry = games && star ? (o - club.strength - 5) * 0.2 * share : 0;
    const sEff = club.strength + contrib + carry + teamBoost;
    const leagueClubs = D.CLUBS.filter(x => x.league === club.league);
    const top = Math.max(...leagueClubs.map(x => x.strength));
    // Defesa e físico pesam nos jogos grandes
    const titleBonus = (c.captain ? 0.08 : 0) + clamp((E.def + E.fis - 75) / 220, 0, 0.22);
    const pLeague = clamp(0.02 + (sEff - top + 4) / 16 + titleBonus * 0.6, 0.01, 0.55);
    // Copa nacional junta todas as divisões do país: a chance compara com os mais fortes do país, não da liga
    // (time de divisão de baixo só leva como zebra rara)
    const countryTop = S.cupTop(club);
    const pCup = clamp(0.02 + (sEff - countryTop + 4) / 20 + titleBonus * 0.3, 0.003, 0.4);
    let league = r() < pLeague;
    let cup = r() < pCup;
    // Jogo decisivo (minigame) manda no resultado
    const M = c.mod.moment || null;
    if (M && M.type === 'cup') cup = M.ok;
    if (M && M.type === 'title') league = M.ok;
    if (M && M.type === 'acesso' && !M.ok) league = false; // perdeu o acesso na última rodada: não foi campeão
    // O lance decisivo entra na estatística do tipo certo: pênalti defendido, desarme ou gol
    const mk = M && S.kickSetupType(M);
    if (M && mk === 'save') { penFaced += 1; if (M.ok) { penSaved += 1; saves += 1; } }
    else if (M && mk === 'tackle') { if (M.ok) tackles += 1; }
    else if (M && M.ok) goals += 1;
    // Continental: Libertadores (primeira divisão sul-americana) mede força contra o nível sul-americano; Champions, contra o europeu
    const libert = S.LIBERTA.includes(club.league);
    const pCont = club.tier < 3 ? 0 : libert ? clamp((sEff - 66) / 28 + titleBonus * 0.3, 0.01, 0.28)
      : clamp((sEff - 80) / 40 + titleBonus * 0.3, 0.01, 0.25) * (club.tier === 5 ? 1 : club.tier === 4 ? 0.4 : 0.25);
    let cont = club.tier >= 3 && r() < pCont;
    const contName = S.contName(club);
    if (M && M.type === 'cont' && contName) cont = M.ok; // final continental decidida no minigame
    const titles = [];
    if (league) titles.push({ id: 'league', name: lg.name });
    if (cup) titles.push({ id: 'cup', name: lg.cup || 'Copa nacional' });
    if (cont && contName) titles.push({ id: 'cont', name: contName });
    // Copa Intercontinental (todo ano, em dezembro): o campeão continental enfrenta um grande do outro continente
    let inter = null;
    if (cont && contName) {
      const fromSul = contName === 'Libertadores';
      const pool = D.CLUBS.filter(x => x.id !== club.id && !(D.LADDER[x.league] && D.LADDER[x.league].up) && S.confOf(x.league) === (fromSul ? 'eur' : 'sul'))
        .sort((a, b) => b.strength - a.strength).slice(0, 6);
      if (pool.length) {
        const vs = r.pick(pool);
        inter = { vs: vs.id, won: r() < clamp(0.5 + (sEff - vs.strength) / 24, 0.15, 0.85) };
        if (inter.won) titles.push({ id: 'inter', name: 'Copa Intercontinental' });
      }
    }
    // Tabela de 20 times: os rivais da liga mais times "de fora da lista" na faixa de baixo.
    // Cada um soma pontos em ida e volta (rodadas pelo tamanho da liga) pela força; a posição sai da comparação com todos.
    const others = leagueClubs.filter(x => x.id !== club.id).map(x => x.strength);
    const lo = Math.min(...leagueClubs.filter(x => x.id !== club.id).map(x => x.strength));
    for (let i = 0; others.length < 19; i++) others.push(lo - 1 + (i * 7) % 8);
    // Média e rodadas pelo tamanho real da liga (o Championship tem 24 times e 46 rodadas)
    const nTeams = others.length + 1, rounds = 2 * (nTeams - 1);
    const avg = (others.reduce((a2, x) => a2 + x, 0) + club.strength) / nTeams;
    const ppg = x => clamp(1.35 + (x - avg) / 14, 0.55, 2.4);
    let pts = Math.round(rounds * ppg(sEff) + r.gauss() * 4);
    const otherPts = others.map(x => Math.round(rounds * ppg(x) + r.gauss() * 4));
    let leaderPts = Math.max(...otherPts), pos;
    if (league) { pts = Math.max(pts, leaderPts + 1 + Math.floor(r() * 3)); leaderPts = pts; pos = 1; }
    else if (M && M.type === 'title') { pos = 2; leaderPts = pts + 1 + Math.floor(r() * 2); } // vice por pouco
    else {
      pos = 1 + otherPts.filter(p => p >= pts).length;
      if (pos === 1) { pos = 2; leaderPts = pts + 1 + Math.floor(r() * 3); } // não foi campeão: alguém passou na frente
    }
    // Acesso decidido no lance da última rodada
    const LD0 = D.LADDER[club.league];
    if (M && M.type === 'acesso' && LD0 && LD0.up) {
      if (M.ok && pos > LD0.promo) pos = LD0.promo;
      else if (!M.ok && pos <= LD0.promo) pos = LD0.promo + 1;
    }
    // Pontuação mostrada: a tabela de verdade é bem mais espalhada que as forças (campeão perto de 2 pontos
    // por jogo, lanterna perto de 0,8). Mantém a ordem e estica as distâncias até o tamanho de uma liga real.
    const col = otherPts.slice().sort((a, b) => b - a);
    col.splice(pos - 1, 0, pts);
    if (!league && pos > 1) col[0] = Math.max(col[0], leaderPts);
    for (let i = 1; i < col.length; i++) if (col[i] > col[i - 1]) col[i] = col[i - 1];
    const mid = col.reduce((a2, x) => a2 + x, 0) / col.length, spread = col[0] - col[col.length - 1];
    const k = Math.max(1, rounds * 1.2 / Math.max(1, spread));
    const shown = col.map(x => clamp(Math.round(mid + (x - mid) * k), Math.round(rounds * 0.4), rounds * 3));
    if (!league && pos > 1 && shown[0] <= shown[pos - 1]) shown[0] = shown[pos - 1] + 1;
    const table = { pos, pts: shown[pos - 1], gap: league ? 0 : Math.max(1, shown[0] - shown[pos - 1]), league: lg.name };
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
        acesso: M.ok ? '⬆️ ' + (M.kick === 'fk' ? 'Seu gol de falta' : 'Seu pênalti') + ' garantiu o acesso contra ' + D.o(vsName) + '!'
          : '😞 ' + (M.kick === 'fk' ? 'Falta desperdiçada' : 'Pênalti perdido') + ' na última rodada: o acesso escapou contra ' + D.o(vsName),
        cont: M.ok ? '🌍 ' + (M.kick === 'fk' ? 'Seu gol de falta' : 'Seu pênalti') + ' decidiu a final da ' + M.comp + ' contra ' + D.o(vsName) + '!'
          : '😞 ' + (M.kick === 'fk' ? 'Falta desperdiçada' : 'Pênalti perdido') + ' na final da ' + M.comp + ' contra ' + D.o(vsName),
      }[M.type];
      // Zagueiro e goleiro: o lance é defensivo (pênalti contra ou contra-ataque no fim)
      const where = { cup: 'na final da ' + M.comp, title: 'na última rodada', acesso: 'na última rodada', classico: 'no clássico', cont: 'na final da ' + M.comp }[M.type];
      const defHl = M.kick === 'save' ? (M.ok ? '🧤 Pênalti defendido ' + where + ' contra ' + D.o(vsName) + '!' : '😞 Pênalti sofrido ' + where + ' contra ' + D.o(vsName))
        : M.kick === 'tackle' ? (M.ok ? '🛡️ Desarme salvador ' + where + ' contra ' + D.o(vsName) + '!' : '😞 O atacante passou ' + where + ' contra ' + D.o(vsName))
        : null;
      highlights.unshift(defHl || hl);
    }
    if (league && rival && !(M && M.type === 'title')) highlights.push('🏆 Título garantido na última rodada contra ' + D.o(rival.name));
    if (cup && other && !(M && M.type === 'cup')) highlights.push('🏆 Final da ' + (lg.cup || 'copa') + ' contra ' + D.o(other.name) + (goals > 5 ? ': gol seu!' : ''));
    if (cont && contName && !(M && M.type === 'cont')) highlights.push('🌍 Campeão da ' + contName + '!');
    if (inter) {
      const vsName = D.CLUB_BY_ID[inter.vs].name;
      highlights.push(inter.won ? '🌐 Campeão da Copa Intercontinental contra ' + D.o(vsName) + '!' : '😞 Vice da Copa Intercontinental: derrota para ' + D.o(vsName));
    }
    // Clássico: contra o mesmo rival de novo, o destaque lembra as vezes anteriores
    // (o rival do clássico é o de verdade: Fla x Flu, Gre-Nal, Barça x Real...; não o mais forte da liga)
    const derby = S.derbyOf(club, r.pick);
    if (!league && derby && games >= 10 && (isDef ? cleanSheets >= 15 : goals + assists >= 8)) {
      c.rivalWins = c.rivalWins || {};
      const k = (c.rivalWins[derby.id] = (c.rivalWins[derby.id] || 0) + 1), ico = isDef ? '🛡️ ' : '⚔️ ';
      highlights.push(ico + (k === 1 ? (isDef ? 'Segurou o zero no clássico contra ' : 'Decidiu o clássico contra ') + D.o(derby.name)
        : k === 2 ? 'De novo! Mais um clássico ' + (isDef ? 'sem sofrer gol' : 'decidido') + ' contra ' + D.o(derby.name)
        : 'Freguês: ' + D.o(derby.name) + ' sofre com você pela ' + k + 'ª vez'));
    }
    if (!league && pos >= 14 && games >= 10 && !move) {
      c.sufoco = (c.sufoco || 0) + 1;
      highlights.push('😰 ' + ['Temporada de sufoco na parte de baixo da tabela', 'Ano de sofrimento: ' + D.o(club.name) + ' brigou contra a degola', 'Sufoco outra vez: ' + pos + 'º lugar e muito nervosismo', 'A torcida roeu as unhas até a última rodada'][(c.sufoco - 1) % 4]);
    }

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
    const bScore = prod + titles.filter(t => t.id !== 'inter').length * 8 + (cont ? 10 : 0) + (rating - 6) * 12 + (c.wcBoost || 0) + Math.min(8, c.fame / 30); // fama pesa no voto
    c.wcBoost = 0;
    // Cada Bola de Ouro anterior aumenta a exigência (a concorrência cresce)
    // Defensor raramente ganha a Bola de Ouro (como na vida real)
    const pBallon = club.tier >= 4 && o >= 86 ? clamp(1 / (1 + Math.exp(-(bScore - 98 - 9 * c.totals.ballon) / 7)) * (club.tier === 5 ? 0.6 : 0.2) * (isDef ? 0.45 : 1), 0, 0.6) : 0;
    const ballon = r() < pBallon;
    if (ballon) awards.push({ id: 'ballon', name: 'BOLA DE OURO' });

    // Fama
    const fame0 = c.fame;
    c.fame = Math.max(0, c.fame * 0.85 + 5 * S.tm(c, 'estrela') + (goals * 0.5 + assists * 0.35 + (isDef ? cleanSheets * 0.35 + saves * 0.1 + penSaved * 1.5 + tackles * 0.1 : 0) + titles.length * 6 + awards.length * 6 + (ballon ? 30 : 0) + club.tier * 2) * (0.8 + c.rel.fans / 250));
    const coach0 = c.rel.coach, fans0 = c.rel.fans;
    // Líder agrada o técnico; Estrela irrita; Raça conquista a torcida
    bump(c, 'coach', 4 * S.tm(c, 'lider') - (c.traits.includes('estrela') ? 1 : 0));
    bump(c, 'fans', 3 * S.tm(c, 'raca'));
    if (games) {
      bump(c, 'coach', (rating - 6.6) * 10);
      bump(c, 'fans', (rating - 6.6) * 9 + titles.length * 6 + (M && M.type === 'classico' && M.ok ? 8 : 0) + (move ? (move.dir === 'up' ? 8 : -10) : 0) - (c.captain && rating < 6.8 ? 6 : 0));
    }
    c.fansBy[c.club] = Math.max(c.fansBy[c.club] || 0, c.rel.fans);

    // Evolução
    // Jogar muito e bem faz evoluir mais e pode até elevar o teto (potencial)
    const potUp = S.potDelta(c, games, rating);
    if (potUp) c.pot = clamp(c.pot + potUp, 50, 99);
    // Evolução = minutos em campo + desempenho (nota) − idade ± treinos. A lesão tira minutos (e evolução).
    const room = c.pot - ovrOf(c.attrs, c.pos);
    const growOf = sh => room * AGE_GROWTH(c.age) * (0.3 + sh * 1.25) * GROWTH_K * (c.age <= 24 ? 1 + 0.45 * S.tm(c, 'academia') : 1);
    const growth = growOf(share);
    const injLoss = injShare > 0 && injShare < 1 ? growOf(share / (1 - injShare)) - growth : 0;
    // Jogar bem faz evoluir: nota 7,9 vale ~+1; nota ruim atrasa (depois dos 30 pesa metade)
    const perf = games >= 10 ? clamp((rating - 7.0) * 1.0, -0.8, 1.5) * (c.age <= 29 ? 1 : 0.5) * (rating < 7 ? 1 : clamp(room / 6, 0.25, 1)) : 0;
    const decline = AGE_DECLINE(c.age) * S.declMult(c) * S.trainOf(c).decl;
    const luck = r.gauss() * 0.8;
    const delta = growth + perf - decline + luck;
    const w = D.POS[c.pos].w;
    for (const k in c.attrs) c.attrs[k] = clamp(c.attrs[k] + delta * (0.5 + w[k] * 2.2) + r.gauss() * 0.6, 20, 99);
    if (c.age >= 29) c.attrs.rit = clamp(c.attrs.rit - 1.0 * S.tm(c, 'velocista'), 20, 99); // Velocista perde velocidade mais cedo
    const ovr1 = S.ovr(c);
    if (ovr1 >= c.peak || !c.peakAttrs) c.peakAttrs = S.eff(c);
    c.peak = Math.max(c.peak, ovr1, o);
    if (c.age + 1 >= 40 && ovr1 >= 70) c.eterno = true; // conquista "Eterno" (a idade sobe no fim da temporada)
    // Cartas especiais da temporada (a foto é com a nota já atualizada)
    const yr = S.YEAR0 + c.season;
    const cards = [];
    const main = isDef ? (c.pos === 'GOL' ? cleanSheets + ' SEM SOFRER GOL' : goals ? goals + ' GOLS · ' + cleanSheets + ' S/ GOL' : cleanSheets + ' SEM SOFRER GOL') : c.pos === 'MEI' ? assists + ' ASSIST.' : goals + ' GOLS';
    // Cartas raras: Seleção da Temporada e Herói da Final saem no máximo uma vez na carreira
    const has = t => (c.cards || []).some(k => k.type === t);
    const drop = (t, ok, txt) => { const k = ok && S.dropCard(c, t, txt); if (k) cards.push(k); };
    drop('tots', awards.some(a => a.id === 'team') && rating >= 8.6 && games >= 28 && club.tier >= 4, lg.name.toUpperCase() + ' ' + yr + ' · ' + main);
    drop('heroi', M && M.type === 'cont' && M.ok, 'FINAL DA ' + (M ? M.comp : '').toUpperCase() + ' ' + yr);
    drop('bola', !!ballon, 'MELHOR DO MUNDO · ' + yr);
    // Mais raras (uma por carreira): marcas da temporada, idade e a temporada perfeita
    const ids = titles.map(t => t.id);
    const once = drop;
    if (games >= 25) {
      // Uma por posição, mais as de idade
      once('chuteira', c.pos === 'ATA' && goals >= 36, goals + ' GOLS · ' + lg.name.toUpperCase() + ' ' + yr);
      once('garcom', c.pos === 'MEI' && assists >= 24, assists + ' ASSISTÊNCIAS · ' + yr);
      once('xerife', c.pos === 'ZAG' && tackles >= 20, tackles + ' DESARMES DECISIVOS · ' + yr);
      once('muralha', c.pos === 'GOL' && cleanSheets >= 25, cleanSheets + ' JOGOS SEM SOFRER GOL · ' + yr);
      once('joia', c.age <= 18 && rating >= 7.8, 'AOS ' + c.age + ' ANOS · NOTA ' + rating.toFixed(1).replace('.', ',') + ' · ' + yr);
      once('lenda', c.age >= 36 && rating >= 7.8, 'AOS ' + c.age + ' ANOS · NOTA ' + rating.toFixed(1).replace('.', ',') + ' · ' + yr);
    }
    once('triplice', ids.includes('league') && ids.includes('cup') && ids.includes('cont'), 'LIGA, COPA E ' + ((titles.find(t => t.id === 'cont') || {}).name || '').toUpperCase() + ' · ' + yr);
    once('perfeita', games >= 32 && rating >= 9.0, 'NOTA ' + rating.toFixed(1).replace('.', ',') + ' EM ' + games + ' JOGOS · ' + yr);
    // Por que a nota mudou (em pontos de nota geral, aproximados)
    // Cada parte em pontos de nota geral; os treinos absorvem a variação miúda para a soma bater com a nota real
    const why = S.whyOf({ c, games, rating, growth, perf, injLoss, injPct: Math.round(injShare * 100), decline, luck, room, potUp, dOvr: ovr1 - ovr0 });

    // Dinheiro e totais
    c.money += c.wage * 52;
    // Pontos de evolução: o que você fez em campo vira treino
    const pe = S.peGain({ games, rating, titles, awards });
    // Foco nos treinos: chance de ponto extra (fora do limite da temporada); lesão séria perde o bônus
    const tr = S.trainOf(c);
    if (tr.p1 || tr.p2) {
      const x = r(), extra = x < tr.p2 ? 2 : x < tr.p2 + tr.p1 ? 1 : 0;
      if (injShare >= 0.2) pe.train = { id: tr.id, n: 0, lost: true };
      else { pe.train = { id: tr.id, n: extra }; pe.n += extra; }
    }
    c.pe = (c.pe || 0) + pe.n;
    const T = c.totals;
    T.games += games; T.goals += goals; T.assists += assists;
    T.cs = (T.cs || 0) + cleanSheets; T.saves = (T.saves || 0) + saves; T.penSaved = (T.penSaved || 0) + penSaved; T.tackles = (T.tackles || 0) + tackles;
    if (league) T.league++;
    if (cup) T.cup++;
    if (cont) T.cont++;
    if (inter && inter.won) T.inter = (T.inter || 0) + 1;
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
      season: c.season, loan: c.loan ? c.loan.parent : null, promise: !!c.promise,
      age: c.age, club: club.id, role: role.name, games, goals, assists, rating, titles, awards,
      cleanSheets, saves, penSaved, tackles, pos: c.pos,
      ovr0, ovr1, fame0: Math.round(fame0), fame1: Math.round(c.fame), injury: injName ? Math.round(injShare * 100) : 0,
      coach0: Math.round(coach0), coach1: Math.round(c.rel.coach), fans0: Math.round(fans0), fans1: Math.round(c.rel.fans),
      highlights, event: c.lastEvent || null, table, why, farewell: !!c.farewell,
      attrs: S.eff(c), cards, pe, // foto da carta desta temporada (para o álbum) e cartas especiais ganhas
    };
    res.move = move;
    // O clube cresce com o craque: mais receita, patrocínio e reforços enquanto ele está lá (e perde aos poucos quando ele sai)
    res.carry = Math.round(carry);
    res.grow = S.starGrowth(c, club, o, games, rating, !c.loan && (spNow.seasons || 0) >= 2);
    res.headlines = S.headlines(c, res);
    res.column = S.column(c, res);
    if (move) moveClub(c, club, move.to);
    c.seasons.push(res);
    c.age++;
    c.season++;
    c.contract = Math.max(0, c.contract - 1);
    res.loanBack = S.endLoan(c, res);
    delete c.promise;
    c.mod = { min: 0, form: 0, inj: 0, goal: 0, assist: 0 };
    c.lastEvent = null;
    save();
    return res;
  };

  S.whyOf = function (x) {
    const { c, games, rating } = x;
    const nota = String(rating.toFixed(1)).replace('.', ',');
    const items = [];
    items.push({ k: 'min', txt: games >= 30 ? games + ' jogos: muito tempo em campo' : games >= 15 ? games + ' jogos em campo' : 'Poucos minutos (' + games + ' jogos)', raw: x.growth, keep: c.age <= 29 });
    if (games >= 10) items.push({ k: 'perf', txt: 'Desempenho: nota ' + nota + (rating >= 7.5 ? ' (ótima)' : rating >= 7 ? ' (boa)' : rating >= 6.6 ? ' (regular)' : ' (fraca)'), raw: x.perf, keep: true });
    if (x.injLoss >= 0.2) items.push({ k: 'inj', txt: 'Lesão: ' + x.injPct + '% da temporada fora', raw: -x.injLoss, keep: true });
    if (x.decline > 0) items.push({ k: 'age', txt: 'Idade (' + c.age + ' anos)' + (S.declMult(c) < 1 ? ', amenizada por Profissional' : ''), raw: -x.decline, keep: true });
    const tr = { k: 'train', raw: x.luck, keep: false };
    items.push(tr);
    // A soma bate com a variação real (o resto é ruído do treino)
    tr.raw += x.dOvr - items.reduce((a, it) => a + it.raw, 0);
    tr.txt = tr.raw > 0 ? 'Fase boa nos treinos' : 'Fase ruim nos treinos';
    // Arredonda mantendo a soma (maiores restos)
    const fl = items.map(it => Math.floor(it.raw));
    let left = x.dOvr - fl.reduce((a, b) => a + b, 0);
    items.map((it, i) => [it.raw - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } });
    const out = items.map((it, i) => ({ k: it.k, txt: it.txt, v: fl[i] })).filter((it, i) => it.v !== 0 || items[i].keep);
    // O teto não aparece como número: a tela explica o que acelera ou freia a evolução
    if (x.potUp > 0) out.push({ k: 'pot', txt: x.potUp >= 3 ? 'Temporada brilhante: seu teto subiu bastante' : 'Boa temporada: seu teto subiu', v: 0, pot: true });
    else if (x.potUp < 0) out.push({ k: 'teto', txt: 'Temporada fraca: o teto baixou um pouco', v: 0, note: true, potDown: true });
    else if (x.room <= 3 && c.age <= 28) out.push({ k: 'teto', txt: 'Perto do seu teto: a evolução desacelera. Temporadas com nota alta elevam o teto (até os 28)', v: 0, note: true });
    return out;
  };

  S.headlines = function (c, s) {
    const club = D.CLUB_BY_ID[s.club].name;
    const nick = c.name, fem = D.fem(club);
    const h = [];
    // Cada tipo de manchete tem variações; a próxima nunca repete a anterior do mesmo tipo
    s.hk = [];
    const v = (key, arr) => { const used = c.seasons.filter(x => (x.hk || []).includes(key)).length; s.hk.push(key); return arr[used % arr.length]; };
    if (s.awards.some(a => a.id === 'ballon')) h.push(v('ballon', [nick + ' é o melhor do mundo!', 'Ninguém joga mais: ' + nick + ' leva a Bola de Ouro']));
    if (s.move && s.move.dir === 'up') h.push(v('up', ['Acesso! ' + club + ' garante vaga ' + D.na(s.move.toName), 'Festa: ' + D.o(club) + ' sobe ' + D.paraA(s.move.toName), D.O(club) + ' volta a sonhar: acesso ' + D.paraA(s.move.toName)]));
    if (s.move && s.move.dir === 'down') h.push(v('down', ['Rebaixamento: ' + club + ' cai ' + D.paraA(s.move.toName), 'Dia de luto: ' + D.o(club) + ' cai ' + D.paraA(s.move.toName), 'Acabou: ' + D.o(club) + (fem ? ' é rebaixada ' : ' é rebaixado ') + D.paraA(s.move.toName)]));
    if (s.titles.length >= 2) h.push(v('titles', ['Temporada histórica: ' + club + ' leva ' + s.titles.length + ' taças', 'Máquina de títulos: ' + s.titles.length + ' taças para ' + D.o(club), 'Ano mágico ' + D.no(club) + ': ' + s.titles.length + ' títulos com ' + nick]));
    else if (s.titles.length) h.push(v('title', [club + (fem ? ' é campeã' : ' é campeão') + ' com ' + nick + ' em campo', 'Deu ' + club + '! ' + nick + ' ajuda a levantar a taça', 'Campeão! ' + nick + ' festeja com a torcida ' + D.do(club)]));
    const statH = h.length;
    if (s.goals >= 30) h.push(v('goals', [s.goals + ' gols: ' + nick + ' vira pesadelo das defesas', 'Máquina de gols: ' + nick + ' chega a ' + s.goals + ' na temporada', nick + ' de novo: ' + s.goals + ' gols e as redes pedindo socorro']));
    else if (s.assists >= 15) h.push(v('assists', ['O garçom da liga: ' + s.assists + ' assistências de ' + nick, nick + ' serve ' + s.assists + ' gols na temporada', 'Passe na medida: ' + s.assists + ' assistências de ' + nick]));
    else if (s.penSaved >= 2) h.push(v('pens', ['Pegador! ' + nick + ' defende ' + s.penSaved + ' pênaltis na temporada', 'Muralha na marca da cal: ' + nick + ' pega ' + s.penSaved + ' pênaltis', 'Batedor treme diante de ' + nick + ': ' + s.penSaved + ' pênaltis defendidos']));
    else if ((s.pos === 'GOL' || s.pos === 'ZAG') && s.cleanSheets >= 18) h.push(v('cs', [s.cleanSheets + ' jogos sem sofrer gol: ' + nick + ' fecha a defesa ' + D.do(club), 'Cadeado: ' + nick + ' passa ' + s.cleanSheets + ' jogos sem ser vazado', 'Com ' + nick + ', ' + D.o(club) + ' não toma gol: ' + s.cleanSheets + ' jogos no zero']));
    else if (s.pos === 'ZAG' && s.goals >= 5) h.push(v('zaggol', ['Zagueiro artilheiro: ' + nick + ' marca ' + s.goals + ' gols de cabeça', 'Perigo na bola parada: ' + nick + ' faz ' + s.goals + ' gols']));
    // Grande temporada individual: o jornal separa o seu desempenho da campanha do clube
    const def = s.pos === 'ZAG' || s.pos === 'GOL', tb = s.table;
    const award = s.awards.find(a => a.id === 'scorer') || s.awards.find(a => a.id === 'team');
    // Mesma régua da avaliação da temporada: nota 7,3+ é "grande temporada"; os números sozinhos só com nota boa (6,8+)
    const star = s.games >= 15 && (s.rating >= 7.3 || (s.rating >= 6.8 && (!!award || (s.pos === 'ATA' && s.goals >= 15) || (s.pos === 'MEI' && s.assists >= 10) || (def && s.cleanSheets >= 14))));
    if (star && h.length === statH && !s.awards.some(a => a.id === 'ballon')) {
      const stat = (s.pos === 'ATA' ? s.goals + ' gols' : s.pos === 'MEI' ? s.assists + ' assistências' : s.pos === 'ZAG' && s.goals >= 4 ? s.goals + ' gols e ' + s.cleanSheets + ' jogos sem sofrer gol' : s.cleanSheets + ' jogos sem sofrer gol') +
        ' e nota ' + s.rating.toFixed(1).replace('.', ',');
      const crisis = (s.move && s.move.dir === 'down') || (tb && tb.pos >= 11);
      if (crisis) h.push(v('solo', ['Brilho solitário: ' + stat + ' de ' + nick + ' num ano difícil ' + D.do(club),
        nick + ' faz a parte dele: ' + stat + ', mas ' + D.o(club) + ' termina em ' + tb.pos + 'º',
        'Um craque no meio da crise: ' + nick + ' fecha o ano com ' + stat]));
      else if (award) h.push(v('award', [award.name + ': ' + nick + ' fecha o ano com ' + stat, 'Premiado: ' + nick + ' leva ' + (award.id === 'team' ? 'vaga na ' : 'o prêmio de ') + award.name + ' com ' + stat,
        'Reconhecimento merecido para ' + nick + ': ' + award.name + ' (' + stat + ')']));
      else h.push(v('star', ['Temporada de gala: ' + nick + ' faz ' + stat, nick + ' é o destaque ' + D.do(club) + ' com ' + stat, 'Ano para guardar: ' + stat + ' de ' + nick]));
    }
    // Resposta ao banco: empréstimo e conversa com o técnico viram notícia
    const parent = s.loan && D.CLUB_BY_ID[s.loan];
    if (parent && s.games >= 15) h.push(v('loan', ['Emprestado ' + D.ao(club) + ', ' + nick + ' ganha minutos: ' + s.games + ' jogos', 'Longe ' + D.do(parent.name) + ', ' + nick + ' vira titular ' + D.no(club), 'Empréstimo deu certo: ' + nick + ' volta ' + D.ao(parent.name) + ' rodado']));
    else if (parent) h.push(v('loanbad', ['Nem emprestado: ' + nick + ' segue sem espaço ' + D.no(club), 'Empréstimo frustrado: ' + nick + ' volta ' + D.ao(parent.name) + ' sem ritmo']));
    if (s.promise && s.games >= 20) h.push(v('promise', ['A conversa resolveu: ' + nick + ' ganha espaço ' + D.no(club), 'Técnico cumpre a promessa e ' + nick + ' responde em campo', 'Do banco ao time: ' + nick + ' faz ' + s.games + ' jogos ' + D.no(club)]));
    if (s.ovr1 - s.ovr0 >= 5 && s.rating >= 6.5) h.push(v('evo', [nick + ' não para de evoluir', 'Ninguém segura: ' + nick + ' sobe de nível outra vez', 'Evolução assustadora de ' + nick]));
    // A nota geral caiu com a idade: se a temporada foi boa mesmo assim, o jornal fala da experiência, não do declínio
    if (s.ovr1 - s.ovr0 <= -4 && s.rating < 7.3) h.push(v('age', ['Idade pesa? ' + nick + ' já não é o mesmo', 'O tempo passa para ' + nick, nick + ' sente o peso dos anos']));
    else if (s.ovr1 - s.ovr0 <= -4 && h.length === statH) h.push(v('vet', ['Aos ' + s.age + ' anos, ' + nick + ' segue decisivo', 'O tempo passa, a classe fica: ' + nick + ' ainda resolve', 'Experiência em campo: ' + nick + ' compensa o físico com leitura de jogo']));
    if (s.injury >= 25) h.push(v('inj', ['Lesão atrapalha temporada de ' + nick, 'Departamento médico: ' + nick + ' perde boa parte do ano', nick + ' passa mais tempo na maca que no gramado']));
    if (s.games < 12 && !s.injury) h.push(v('bench', [nick + ' pede mais minutos ' + D.no(club), 'Banco de novo: ' + nick + ' quer jogar', nick + ' esquenta o banco ' + D.do(club)]));
    if (s.rating && s.rating < 6.3 && s.games >= 12) h.push(v('boo', ['Torcida ' + D.do(club) + ' pega no pé de ' + nick, 'Vaias para ' + nick + ' ' + D.no(club), nick + ' vive fase ruim ' + D.no(club)]));
    // Sem notícia: manchete discreta (e o jornal não sai; fica só a linha no resumo)
    // Jogou pouco, mas muito bem: não é um "ano discreto"
    if (!h.length && s.games && s.rating >= 7.3) h.push(v('curto', ['Pouco tempo, muito futebol: ' + nick + ' brilha quando entra', nick + ' pede passagem: nota ' + s.rating.toFixed(1).replace('.', ',') + ' nos minutos que teve', 'Quando joga, decide: ' + nick + ' quer mais espaço ' + D.no(club)]));
    if (!h.length) {
      s.quiet = true;
      const tb = s.table;
      h.push(v('regular', ['Temporada regular de ' + nick + ' ' + D.no(club), 'Ano discreto de ' + nick + ' ' + D.no(club), nick + ' cumpre tabela ' + D.no(club),
        'Nem brilho nem crise: ' + nick + ' segue ' + D.no(club), tb ? nick + ' termina o ano em ' + tb.pos + 'º com ' + D.o(club) : 'Ano sem sustos para ' + nick]));
    }
    // Jornal com memória: uma manchete que lembra o passado entra em 2º (ou em 1º se for a história do ano)
    const mem = S.memoryHeadline(c, s);
    if (mem) { s.quiet = false; if (mem.top) h.unshift(mem.txt); else h.splice(1, 0, mem.txt); }
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
    if (sp.seasons === 1 && !sp.back && c.spells.slice(0, -1).some(x => x.seasons && x.club === cur.id)) opts.push({ w: 8, txt: 'De volta para casa: ' + nick + ' reencontra ' + D.o(cur.name) });
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
    const def = c.pos === 'ZAG' || c.pos === 'GOL';
    const big = s.titles.find(t => t.id === 'cont');
    const trend = prev && prev.rating ? s.rating - prev.rating : 0;
    const cl = D.o(cur.name), dcl = D.do(cur.name);
    // Cada assunto tem vários textos [título, coluna]; o cronista não repete o último que escreveu sobre o mesmo assunto
    const col = (k, opts) => { const [t, x] = opts[past.filter(p => p.column && p.column.k === k).length % opts.length]; return { k, t, x }; };
    if (!s.games) return col('banco', [
      ['Cadê ' + nick + '?', 'Uma temporada inteira olhando do banco. Talento não se prova no aquecimento.'],
      ['Esquecido', 'Ninguém lembra de ' + nick + ' se ele não entra em campo. Alguém precisa resolver isso, e não é o roupeiro.']]);
    if (s.awards.some(a => a.id === 'ballon')) return col('ballon', [
      ['O mundo aos pés', 'Poucos chegam aqui. ' + nick + ' chegou e não parece satisfeito. Isso é o que separa os bons dos eternos.'],
      ['Guardem esta edição', 'Escrevo há 40 anos e vi poucos como ' + nick + '. Um dia vou contar que estava lá.'],
      ['Sem adjetivos', 'Já gastei todos os elogios com ' + nick + '. Vou ter que inventar palavras novas.']]);
    if (big) return col('final', [
      ['Noite de gala', 'Há jogadores que somem nas finais. ' + nick + ' cresce. A ' + big.name + ' tem a assinatura dele.'],
      ['Nasceu para isso', 'Final é outro jogo, e ' + nick + ' sabe jogar esse jogo. A ' + big.name + ' volta para casa com ' + cl + '.']]);
    if (c.age >= 33 && trend <= -0.3 && s.rating < 7.3) return col('fim', [
      ['A hora certa', 'O corpo avisa antes da cabeça. ' + nick + ' ainda tem lampejos, mas já não decide como antes. Saber parar também é arte.'],
      ['Até quando?', 'Ninguém apaga o que ' + nick + ' fez. Mas a pergunta que ninguém quer fazer já está no ar.'],
      ['Crepúsculo', 'Ver ' + nick + ' correr atrás da bola que antes chegava fácil dói um pouco. O talento fica; as pernas não.']]);
    if (s.rating >= 7.5 && cur.tier <= 2) return col('grande', [
      ['Grande demais', nick + ' joga num nível acima do resto ' + dcl + '. Se ninguém de fora bater na porta, é porque não estão assistindo.'],
      ['A vitrine é pequena', 'Tem jogador que nasce para palco maior. ' + nick + ' está pronto; ' + cl + ' sabe disso.']]);
    if (s.rating >= 7.5) return col(def ? 'craqueD' : 'craque', def ? [
      ['Fora da curva', 'Atacante que encara ' + nick + ' sai de campo pensando na vida. Defender também é talento.'],
      ['O jogo que ninguém vê', 'Não aparece nos melhores momentos, mas é dele o jogo que ninguém vê. Sem ' + nick + ', ' + cl + ' é outro time.'],
      ['Tranquilidade', 'Com ' + nick + ' atrás, o resto do time joga sem medo. Isso não sai em estatística.'],
      ['Chato de enfrentar', 'Pergunte aos atacantes da liga quem eles menos gostam de encontrar. A resposta é sempre ' + nick + '.']] : [
      ['Fora da curva', 'Toda vez que a bola chega em ' + nick + ', o estádio levanta. Isso não se ensina.'],
      ['Aula de futebol', nick + ' joga como quem já sabe o fim do lance. Os outros ainda estão pensando.'],
      ['Vale o ingresso', 'Paguei o estacionamento, a pipoca e o ingresso. ' + nick + ' pagou tudo de volta em noventa minutos.'],
      ['Diferente', 'O futebol anda previsível. Aí aparece ' + nick + ' e faz algo que ninguém tinha pensado.']]);
    if (s.rating >= 7.3 && s.games >= 12) return col(def ? 'bomD' : 'bom', def ? [
      ['Confiável', 'Não é todo ano que um defensor passa a temporada sem comprometer. ' + nick + ' passou. ' + cl + ' agradece.'],
      ['Sem sustos', 'Com ' + nick + ' em campo, o torcedor ' + dcl + ' dorme tranquilo. Boa temporada, sem alarde.']] : [
      ['Em alta', nick + ' fez uma grande temporada. Ainda não é o dono do campeonato, mas já é o dono do time.'],
      ['Subindo o sarrafo', 'Temporada acima da média de ' + nick + '. Agora o desafio é repetir, que é onde muitos param.'],
      ['Merecido', 'Quem acompanhou ' + nick + ' jogo a jogo sabe: o ano foi grande. Os números só confirmam.']]);
    if (c.age <= 19 && s.rating >= 6.9) return col('jovem', [
      ['Guardem esse nome', 'Com ' + c.age + ' anos, ' + nick + ' joga sem medo. Falta casca, sobra personalidade. O futuro é dele, se não se perder no caminho.'],
      ['Menino de ouro', 'Tem ' + c.age + ' anos e já joga como veterano. Só peço a ' + nick + ' uma coisa: não acredite em tudo que escrevem.']]);
    if (trend >= 0.6) return col('volta', [
      ['Volta por cima', 'Muita gente (eu incluído) duvidou de ' + nick + '. Temporada para calar os críticos. Engulo minhas palavras com prazer.'],
      ['Resposta em campo', nick + ' não deu entrevista, não reclamou. Respondeu jogando. É o melhor jeito.']]);
    if (D.MONEY.includes(cur.league) && c.age <= 30) return col('grana', [
      ['Escolhas', 'O dinheiro é bom, ninguém nega. Mas ' + nick + ' tinha futebol para brigar por coisa maior. Cada um sabe da sua conta bancária.'],
      ['Longe dos holofotes', 'A conta bancária cresce, a lembrança diminui. ' + nick + ' ainda tem tempo de voltar ao palco grande.']]);
    if (c.rel.coach < 35) return col('clima', [
      ['Clima pesado', 'Nos bastidores ' + dcl + ', a relação de ' + nick + ' com o técnico azedou. Alguém vai ter que ceder, e costuma ser o jogador.'],
      ['Guerra fria', 'Técnico e ' + nick + ' mal se olham no treino. Esse filme costuma acabar na janela de transferências.']]);
    if (s.games < 12) return col('minutos', [
      ['Pouco tempo', nick + ' precisa de minutos. Talento parado enferruja. Ou ganha espaço, ou arruma as malas.'],
      ['Cadeira cativa', 'O banco ' + dcl + ' já tem o formato de ' + nick + '. Isso não é bom para ninguém.']]);
    if (s.rating < 6.4) return col('ruim', [
      ['Cadê o futebol?', 'A torcida ' + dcl + ' já perdeu a paciência. ' + nick + ' parece jogar com o freio de mão puxado.'],
      ['Falta fome', 'Não é falta de talento, é falta de fome. ' + nick + ' precisa decidir que jogador quer ser.'],
      ['Ano para esquecer', 'Todo jogador tem um. Este foi o de ' + nick + '. O que importa é o que vem depois.']]);
    return col('morno', [
      ['Morno', 'Temporada correta de ' + nick + '. Correta demais. Craque que é craque deixa marca, e essa passou sem deixar.'],
      ['Nem lá, nem cá', nick + ' fez o básico. O problema é que o básico não entra na história.'],
      ['Nota de rodapé', 'Ninguém reclamou de ' + nick + ', ninguém elogiou. No futebol, isso é quase pior que vaia.'],
      ['Piloto automático', nick + ' joga como quem bate ponto. Cumpre o horário, não faz hora extra.'],
      ['Falta um estalo', 'O talento está lá, dá para ver. Falta ' + nick + ' decidir que quer ser lembrado.']]);
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
