// Interface — Copa do Mundo
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- Copa do Mundo ----------
  // "do Brasil", "da Argentina", "de Portugal"
  // "o Brasil", "a Argentina", "Portugal"
  const theCountry = n => (n === 'Portugal' ? '' : ['Brasil', 'Uruguai'].includes(n) ? 'o ' : 'a ') + n;
  const ofCountry = n => ({ Brasil: 'do', Uruguai: 'do', Portugal: 'de' }[n] || 'da') + ' ' + n;
  // Copa do Mundo ou Mundial de Clubes (mesma tela, mesmo motor)
  const isCwc = run => !!run && run.kind === 'cwc';
  const tName = run => (isCwc(run) ? 'Mundial de Clubes' : 'Copa do Mundo');
  // Nosso lado no placar: bandeira da seleção ou escudo do clube
  const usMark = run => (isCwc(run) ? crest(run.club, 'xs') : D.NATION_BY_NAME[G.c.country].flag);
  const themMark = g => (g.crest ? crest(g.crest, 'xs') : g.flag);
  const usName = run => (isCwc(run) ? esc(club(run.club).name) : esc(G.c.country));

  function cwcIntro() {
    G.step = 'cwc';
    if (isCwc(G.c.wcRun) && G.c.wcRun.year === year()) { save(); return wcPlay(); }
    const call = S.cwcCall(G.c), cl = call.club;
    save();
    render(
      '<div class="eyebrow">Mundial de Clubes ' + year() + '</div>' +
      '<div class="wc-hero">' + crest(cl.id, 'xl') + '<h2>' + D.O(esc(cl.name)) + ' vai ao Mundial de Clubes!</h2>' +
      '<p class="lead">' + (call.champ ? 'Vaga de campeão continental. ' : 'Vaga pelo ranking de clubes. ') + '32 clubes de todos os continentes brigam pelo título. ' +
      (call.starter ? 'Você é peça-chave do time.' : 'Você começa no banco, mas pode decidir.') + '</p></div>' +
      '<div class="card wc-rules"><p>Fase de grupos com 3 jogos, depois mata-mata até a final.</p><p>Empate no mata-mata vai para os <b>pênaltis</b>, e você bate o último.</p></div>' +
      '<button class="btn" id="b-wc">Começar o Mundial</button>'
    );
    $('b-wc').onclick = () => { S.cwcStart(G.c); save(); wcPlay(); };
  }

  function wcIntro() {
    G.step = 'wc';
    if (G.c.wcRun && !isCwc(G.c.wcRun) && G.c.wcRun.year === year()) { save(); return wcPlay(); }
    const call = S.wcCall(G.c);
    save();
    render(
      '<div class="eyebrow">Copa do Mundo ' + year() + '</div>' +
      '<div class="wc-hero"><span class="wc-bigflag">' + call.nation.flag + '</span><h2>Convocado pela seleção ' + ofCountry(G.c.country) + '!</h2>' +
      '<p class="lead">' + (call.starter ? 'Você chega como titular. O país inteiro está de olho.' : 'Você vai como reserva: entra no segundo tempo e pode decidir.') + '</p></div>' +
      '<div class="card wc-rules"><p>Fase de grupos com 3 jogos, depois mata-mata até a final.</p><p>Empate no mata-mata vai para os <b>pênaltis</b>, e você bate o último.</p></div>' +
      '<button class="btn" id="b-wc">Começar a Copa</button>'
    );
    $('b-wc').onclick = () => { S.wcStart(G.c); save(); wcPlay(); };
  }

  function wcRow(g) {
    const run = G.c.wcRun;
    const res = g.gf > g.ga ? 'w' : g.gf < g.ga ? 'l' : 'd';
    const pen = g.pens ? (g.pensWon === undefined ? '<span class="tag gold">Pênaltis!</span>' : g.pensWon ? '<span class="tag green">Venceu nos pênaltis</span>' : '<span class="tag red">Perdeu nos pênaltis</span>') : '';
    const me = (g.g ? '⚽'.repeat(Math.min(g.g, 4)) + (g.g > 4 ? '+' : '') + ' ' : '') + (g.a ? '👟'.repeat(Math.min(g.a, 3)) : '');
    return '<div class="wc-game ' + (g.pens && g.pensWon !== undefined ? (g.pensWon ? 'w' : 'l') : res) + '"><span class="st">' + esc(g.stage) + '</span>' +
      '<div class="line"><span class="us">' + usMark(run) + '</span><b>' + g.gf + ' × ' + g.ga + '</b><span class="them">' + themMark(g) + ' ' + esc(g.opp) + '</span></div>' +
      (me ? '<span class="me">' + me + '</span>' : '') + pen +
      (g.moment ? '<span class="mom ' + (g.momentOk ? 'ok' : 'ko') + '">' + g.moment.minute + "' " + ({
        pen: g.momentOk ? 'pênalti convertido' : 'pênalti desperdiçado', fk: g.momentOk ? 'falta convertida' : 'falta desperdiçada',
        save: g.momentOk ? 'pênalti defendido' : 'pênalti sofrido', tackle: g.momentOk ? 'desarme salvador' : 'atacante passou',
      }[g.moment.type]) + '</span>' : '') +
      (S.defKick(G.c.pos) && g.cs && !g.live ? '<span class="mom ok">🧤 sem sofrer gol</span>' : '') +
      (g.rating ? '<span class="rt' + (g.motm ? ' motm' : '') + '">' + (g.motm ? '⭐ Craque do jogo · ' : 'Nota ') + g.rating.toFixed(1).replace('.', ',') + '</span>' : '') +
      (g.groupEnd ? '<div class="grp ' + (g.groupEnd.pass ? 'ok' : 'ko') + '">' + (g.groupEnd.pass ? 'Classificado com ' + g.groupEnd.pts + ' pontos' : 'Eliminado na fase de grupos (' + g.groupEnd.pts + ' pts)') + '</div>' : '') + '</div>';
  }

  function wcPlay() {
    const run = G.c.wcRun;
    G.step = isCwc(run) ? 'cwc' : 'wc';
    render('<div class="eyebrow">' + tName(run) + ' ' + run.year + ' · ' + usMark(run) + ' ' + usName(run) + '</div>' +
      '<div class="wc-list" id="wc-list">' + run.games.filter(g => !g.live).map(wcRow).join('') + '</div><div id="wc-after"></div><p class="skip-hint" id="wc-hint">Toque para acelerar</p>');
    let fast = false, timer = null;
    setTimeout(() => { screen.onclick = () => { fast = true; }; }, 60);
    const list = $('wc-list');
    const next = () => {
      if (!list.isConnected) return;
      // Lance decisivo ou pênaltis pendentes (inclusive ao voltar para o jogo)
      if (run.live) return wcLive();
      if (run.pending) return wcPens();
      const g = S.wcNext(G.c);
      save();
      if (!g) return wcFinal();
      if (g.live) return wcLive();
      const div = document.createElement('div');
      div.innerHTML = wcRow(g);
      const el = div.firstChild;
      el.classList.add('enter');
      list.appendChild(el);
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      sfx(g.gf > g.ga ? 'goal' : g.gf < g.ga ? 'miss' : 'whistle');
      timer = setTimeout(next, fast ? 250 : g.pens ? 1100 : 1300);
    };
    timer = setTimeout(next, 500);
  }

  // Lance decisivo nos minutos finais: pênalti ou falta a favor, no minigame
  function wcLive() {
    screen.onclick = null;
    const run = G.c.wcRun, g = run.games[run.games.length - 1], m = g.moment;
    // Fechou o jogo no meio da cobrança: a chance decide
    if (run.momentStarted) { S.wcMomentAuto(G.c); save(); return wcPlay(); }
    const type = S.kickSetupType({ kick: m.type }), def = type === 'save' || type === 'tackle';
    const k = S.kickSetup(G.c, type), d = g.gf - g.ga, ko = run.stage >= 3;
    const gain = d === 0 ? (ko ? 'classifica' : 'vitória') : d === -1 ? (ko ? 'leva para os pênaltis' : 'empata') : d >= 1 ? 'amplia' : 'diminui';
    // Defensor: o que acontece se falhar (gol deles)
    const lose = d >= 2 ? 'diminuem' : d === 1 ? (ko ? 'empatam e vai para os pênaltis' : 'empatam') : d === 0 ? (ko ? 'eliminado' : 'derrota') : 'aumentam';
    const cwc = isCwc(run), who = cwc ? D.o(esc(club(run.club).name)) : theCountry(G.c.country);
    const h = $('wc-hint'); if (h) h.remove();
    $('wc-after').innerHTML = '<div class="card event-card wc-live"><span class="st">' + esc(g.stage) + ' · ' + m.minute + "'</span>" +
      '<div class="line"><span>' + usMark(run) + '</span><b>' + g.gf + ' × ' + g.ga + '</b><span>' + themMark(g) + ' ' + esc(g.opp) + '</span></div>' +
      '<h2>' + ({ pen: 'Pênalti para ' + who + '!', fk: 'Falta perigosa na entrada da área!', save: 'Pênalti contra ' + who + '!', tackle: 'Contra-ataque perigoso!' }[m.type]) + '</h2>' +
      '<p class="stakes">' + (def ? (type === 'save' ? 'Defendeu: segura o placar · Sofreu: ' : 'Desarmou: segura o placar · Passou: ') + lose : 'Converteu: ' + gain) + '</p></div>' +
      '<div class="chips">' + U.miniFacts(type).join('') + '</div>' +
      '<button class="btn" id="b-kick">' + U.MINI_BTN[type] + '</button><button class="btn ghost" id="b-auto">Deixar o jogo decidir<small>Chance de ' + Math.round(k.chance * 100) + '% pela sua carta</small></button>';
    $('wc-after').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    sfx('whistle');
    $('b-kick').onclick = () => {
      run.momentStarted = true; save();
      render('<div class="eyebrow">' + tName(run) + ' ' + run.year + ' · ' + esc(g.stage) + ' · ' + m.minute + "'</div><div id=\"kick\"></div>");
      U.playMini($('kick'), type, ok => { S.wcMoment(G.c, ok); save(); wcPlay(); });
    };
    $('b-auto').onclick = () => { S.wcMomentAuto(G.c); save(); wcPlay(); };
  }

  function wcPens() {
    screen.onclick = null;
    const run = G.c.wcRun, g = run.games[run.games.length - 1];
    // Fechou o jogo no meio da cobrança: a chance decide
    if (run.pensStarted) { S.wcPensAuto(G.c); run.pensStarted = false; save(); return wcPlay(); }
    // Goleiro defende a última cobrança; os outros batem a última
    const gk = S.wcPensType(G.c) === 'save', type = gk ? 'save' : 'cup';
    const k = S.kickSetup(G.c, type);
    $('wc-after').innerHTML = '<div class="card event-card wc-pens"><h2>Pênaltis!</h2><p style="margin:0">' + esc(g.stage) + ' contra ' + themMark(g) + ' ' + esc(g.opp) + ' terminou ' + g.gf + ' × ' + g.ga + '. A disputa está empatada e ' + (gk ? 'o último batedor deles vem para a bola.' : 'você bate o último.') + '</p>' +
      '<p class="stakes">' + (gk ? 'Defendeu: ' : 'Converteu: ') + (run.stage === 6 ? (isCwc(run) ? 'campeão mundial' : 'campeão do mundo') : isCwc(run) ? 'o time avança' : 'a seleção avança') + ' · ' + (gk ? 'Sofreu' : 'Errou') + ': eliminado</p></div>' +
      '<div class="chips">' + U.miniFacts(type).join('') + '</div>' +
      '<button class="btn" id="b-kick">' + U.MINI_BTN[type] + '</button><button class="btn ghost" id="b-auto">Deixar o jogo decidir<small>Chance de ' + Math.round(k.chance * 100) + '% pela sua carta</small></button>';
    $('wc-after').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('b-kick').onclick = () => {
      run.pensStarted = true; save();
      render('<div class="eyebrow">' + tName(run) + ' ' + run.year + ' · Pênaltis</div><div id="kick"></div>');
      U.playMini($('kick'), type, ok => { run.pensStarted = false; S.wcPens(G.c, ok); save(); wcPlay(); });
    };
    $('b-auto').onclick = () => { S.wcPensAuto(G.c); save(); wcPlay(); };
  }

  function wcFinal() {
    screen.onclick = null;
    const run = G.c.wcRun, cwc = isCwc(run);
    if (cwc) G.c.cwcYearDone = run.year; else G.c.wcYearDone = run.year;
    save();
    bar();
    const h = $('wc-hint'); if (h) h.remove();
    $('wc-after').innerHTML = (run.champion
      ? '<div class="wc-champ">' + (cwc ? trophy('cwc', 96, 'Mundial de Clubes') + '<b>CAMPEÃO MUNDIAL!</b>' : trophy('wc', 96) + '<b>CAMPEÃO DO MUNDO!</b>') + '<span>' + usMark(run) + ' ' + usName(run) + ' · ' + run.year + '</span></div>'
      : '<div class="wc-out">' + (run.reached === 'Final' ? (cwc ? 'Vice-campeão mundial' : 'Vice-campeão do mundo') : 'Eliminado: ' + run.reached.toLowerCase()) + '</div>') +
      '<p class="wc-stats">' + (cwc ? 'No Mundial: ' : 'Na Copa: ') + run.games.length + ' jogos · ' + (S.defKick(G.c.pos)
        ? run.games.filter(x => x.cs).length + ' sem sofrer gol' + (run.g ? ' · ' + run.g + (run.g === 1 ? ' gol' : ' gols') : '')
        : run.g + (run.g === 1 ? ' gol' : ' gols') + ' · ' + run.a + (run.a === 1 ? ' assistência' : ' assistências')) + '</p>' +
      '<button class="btn" id="b-next">' + (S.mustRetire(G.c) ? 'Ver sua carreira' : 'Seguir a carreira') + '</button>';
    if (run.champion) { sfx('fanfare'); const btn = $('b-next'); setTimeout(() => { if (btn.isConnected) (cwc ? U.clubWorldPaper(G.c, run) : U.worldCupPaper(G.c, run, () => run.card && U.walkout(G.c, null, run.card))); }, 1400); }
    $('wc-after').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('b-next').onclick = U.afterSeason;
  }

  Object.assign(U, { theCountry, ofCountry, cwcIntro, wcIntro, wcRow, wcPlay, wcLive, wcPens, wcFinal });
})();
