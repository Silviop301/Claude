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
  const usMark = run => (isCwc(run) ? crest(run.club, 'xs') : U.flag(D.NATION_BY_NAME[G.c.country].flag));
  const themMark = g => (g.crest ? crest(g.crest, 'xs') : U.flag(g.flag));
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
      '<button class="btn" id="b-wc">' + (U.cfg.cups === 'sim' ? 'Simular o Mundial' : 'Começar o Mundial') + '</button>'
    );
    $('b-wc').onclick = () => { simAll = U.cfg.cups === 'sim'; S.cwcStart(G.c); save(); wcPlay(); };
  }

  function wcIntro() {
    G.step = 'wc';
    if (G.c.wcRun && !isCwc(G.c.wcRun) && G.c.wcRun.year === year()) { save(); return wcPlay(); }
    const call = S.wcCall(G.c);
    save();
    render(
      '<div class="eyebrow">Copa do Mundo ' + year() + '</div>' +
      '<div class="wc-hero"><span class="wc-bigflag">' + U.flag(call.nation.flag) + '</span><h2>Convocado pela seleção ' + ofCountry(G.c.country) + '!</h2>' +
      '<p class="lead">' + (call.starter ? 'Você chega como titular. O país inteiro está de olho.' : 'Você vai como reserva: entra no segundo tempo e pode decidir.') + '</p></div>' +
      '<div class="card wc-rules"><p>Fase de grupos com 3 jogos, depois mata-mata até a final.</p><p>Empate no mata-mata vai para os <b>pênaltis</b>, e você bate o último.</p></div>' +
      '<button class="btn" id="b-wc">' + (U.cfg.cups === 'sim' ? 'Simular a Copa' : 'Começar a Copa') + '</button>'
    );
    $('b-wc').onclick = () => { simAll = U.cfg.cups === 'sim'; S.wcStart(G.c); save(); wcPlay(); };
  }

  function wcRow(g) {
    const run = G.c.wcRun;
    const res = g.gf > g.ga ? 'w' : g.gf < g.ga ? 'l' : 'd';
    const pen = g.pens ? (g.pensWon === undefined ? '<span class="tag gold">Pênaltis!</span>' : g.pensWon ? '<span class="tag green">Venceu nos pênaltis</span>' : '<span class="tag red">Perdeu nos pênaltis</span>') : '';
    const me = (g.g ? U.emo('⚽', 'xs').repeat(Math.min(g.g, 4)) + (g.g > 4 ? '+' : '') + ' ' : '') + (g.a ? U.emo('👟', 'xs').repeat(Math.min(g.a, 3)) : '');
    return '<div class="wc-game ' + (g.pens && g.pensWon !== undefined ? (g.pensWon ? 'w' : 'l') : res) + '"><span class="st">' + esc(g.stage) + '</span>' +
      '<div class="line"><span class="us">' + usMark(run) + '</span><b>' + g.gf + ' × ' + g.ga + '</b><span class="them">' + themMark(g) + ' ' + esc(g.opp) + '</span></div>' +
      (me ? '<span class="me">' + me + '</span>' : '') + pen +
      (g.moment ? '<span class="mom ' + (g.momentOk ? 'ok' : 'ko') + '">' + g.moment.minute + "' " + ({
        pen: g.momentOk ? 'pênalti convertido' : 'pênalti desperdiçado', fk: g.momentOk ? 'falta convertida' : 'falta desperdiçada',
        save: g.momentOk ? 'pênalti defendido' : 'pênalti sofrido', tackle: g.momentOk ? 'desarme salvador' : 'atacante passou',
        pass: g.momentOk ? 'passe para gol' : 'passe cortado',
      }[g.moment.type]) + (g.at ? ' no ' + g.at[0] + ' × ' + g.at[1] : '') + '</span>' : '') +
      (S.defKick(G.c.pos) && g.cs && !g.live ? '<span class="mom ok">' + U.emo('🧤', 'xs') + ' sem sofrer gol</span>' : '') +
      (g.rating ? '<span class="rt' + (g.motm ? ' motm' : '') + '">' + (g.motm ? U.emo('⭐', 'xs') + ' Craque do jogo · ' : 'Nota ') + g.rating.toFixed(1).replace('.', ',') + '</span>' : '') +
      (g.ev && g.ev.length && !g.live ? '<div class="gls">' + g.ev.map(e => goalLine(e, g)).join('') + '</div>' : '') +
      (g.groupEnd ? '<div class="grp ' + (g.groupEnd.pass ? 'ok' : 'ko') + '">' + (g.groupEnd.pass ? 'Classificado com ' + D.plural(g.groupEnd.pts, 'ponto', 'pontos') : 'Eliminado na fase de grupos (' + g.groupEnd.pts + ' pts)') + '</div>' : '') + '</div>';
  }

  // Jogo ao vivo: relógio correndo e o placar mudando gol a gol
  function goalLine(e, g) {
    const run = G.c.wcRun;
    const txt = e.s === 't' ? esc(g.opp) + ' marca' + (e.k ? ' no lance decisivo' : '')
      : e.w === 'g' ? '<b>Gol seu!</b>' + (e.k ? ' No lance decisivo' : '') : e.w === 'a' ? usName(run) + ' marca, <b>assistência sua</b>' : usName(run) + ' marca';
    return '<div class="gl ' + e.s + '"><i>' + e.m + "'</i>" + (e.s === 'u' ? U.emo('⚽', 'xs') : U.emo('🥅', 'xs')) + ' ' + txt + '</div>';
  }
  function liveRow(g) {
    const el = document.createElement('div');
    el.className = 'wc-game playing enter';
    el.innerHTML = '<span class="st">' + esc(g.stage) + ' <i class="clk">0\'</i></span>' +
      '<div class="line"><span class="us">' + usMark(G.c.wcRun) + '</span><b class="sc">0 × 0</b><span class="them">' + themMark(g) + ' ' + esc(g.opp) + '</span></div><div class="gls"></div>';
    return el;
  }
  // Simular: "Pular jogo" termina a partida atual na hora; "Simular até o fim" joga o resto sozinho
  // (lances e pênaltis pela chance da carta)
  let simAll = false;
  // Corre o relógio de "from" até "to"; cada gol aparece no seu minuto (com uma pausa para comemorar)
  // spd(): 0 normal, 1 acelerado (toque na tela), 2 instantâneo (pular/simular)
  function runClock(el, g, from, to, spd, done) {
    const ev = g.ev || [], sc = el.querySelector('.sc'), clk = el.querySelector('.clk'), gls = el.querySelector('.gls');
    let u = 0, t = 0, m = from;
    ev.filter(e => e.m < from).forEach(e => { if (e.s === 'u') u++; else t++; gls.insertAdjacentHTML('beforeend', goalLine(e, g)); });
    sc.textContent = u + ' × ' + t;
    const tick = () => {
      if (!el.isConnected) return;
      const now = ev.filter(e => e.m === m);
      clk.textContent = m + "'";
      const sp = spd();
      let pause = sp === 2 ? 0 : sp ? 3 : 24;
      now.forEach(e => {
        if (e.s === 'u') u++; else t++;
        sc.textContent = u + ' × ' + t;
        gls.insertAdjacentHTML('beforeend', goalLine(e, g));
        el.classList.remove('goal-u', 'goal-t'); void el.offsetWidth; el.classList.add('goal-' + e.s);
        if (sp < 2) sfx(e.s === 'u' ? 'goal' : 'miss');
        pause = sp === 2 ? 0 : sp ? 80 : 750;
      });
      if (m >= to) return done();
      m++;
      if (pause === 0) return tick(); // instantâneo: termina o jogo de uma vez
      timer = setTimeout(tick, pause);
    };
    let timer = null;
    // "Pular jogo" no meio de uma pausa (comemoração de gol): segue na hora
    el._now = () => { clearTimeout(timer); tick(); };
    tick();
  }

  function wcPlay() {
    const run = G.c.wcRun;
    G.step = isCwc(run) ? 'cwc' : 'wc';
    const last = run.games[run.games.length - 1];
    const resume = last && last.resumeAt !== undefined && !last.live ? last : null; // jogo que continua depois do lance
    render('<div class="eyebrow">' + tName(run) + ' ' + run.year + ' · ' + usMark(run) + ' ' + usName(run) + '</div>' +
      '<div class="wc-list" id="wc-list">' + run.games.filter(g => !g.live && g !== resume).map(wcRow).join('') + '</div><div id="wc-after"></div>' +
      '<div class="wc-sim" id="wc-sim"><button class="tool" id="b-simg">' + U.emo('⏩', 'xs') + ' Pular jogo</button><button class="tool" id="b-sima">' + U.emo('⏭️', 'xs') + ' Simular até o fim</button></div>' +
      '<p class="skip-hint" id="wc-hint">Toque para acelerar</p>');
    let fast = false, skip = false;
    const isFast = () => fast || skip || simAll;
    const spd = () => (skip || simAll ? 2 : fast ? 1 : 0);
    setTimeout(() => { screen.onclick = () => { fast = true; }; }, 60);
    if (simAll) $('wc-sim').classList.add('on');
    $('b-simg').onclick = e => {
      e.stopPropagation(); skip = true;
      const pl = document.querySelector('.wc-game.playing:not(.paused)');
      if (pl && pl._now) pl._now();
    };
    $('b-sima').onclick = e => {
      e.stopPropagation();
      U.ask('Simular até o fim?', 'Os jogos restantes passam direto. Seus lances decisivos e pênaltis serão decididos pela chance da sua carta.', 'Simular', () => {
        simAll = true;
        $('wc-sim').classList.add('on');
        // Parado num lance ou nos pênaltis: decide agora e segue
        if (run.live) { S.wcMomentAuto(G.c); save(); return wcPlay(); }
        if (run.pending) { S.wcPensAuto(G.c); save(); return wcPlay(); }
      });
    };
    const list = $('wc-list');
    // Troca a linha ao vivo pela linha final (nota, lance, craque do jogo)
    const finish = (el, g) => {
      const div = document.createElement('div');
      div.innerHTML = wcRow(g);
      el.replaceWith(div.firstChild);
      sfx(g.gf > g.ga ? 'goal' : g.gf < g.ga ? 'miss' : 'whistle');
    };
    const next = () => {
      if (!list.isConnected) return;
      skip = false; // "Pular jogo" vale só para a partida em andamento
      // Lance decisivo ou pênaltis pendentes (inclusive ao voltar para o jogo)
      if (run.live) return simAll || U.cfg.moments === 'auto' ? (S.wcMomentAuto(G.c), save(), wcPlay()) : wcLive();
      if (run.pending) return simAll || U.cfg.moments === 'auto' ? (S.wcPensAuto(G.c), save(), wcPlay()) : wcPens();
      const g = S.wcNext(G.c);
      save();
      if (!g) return wcFinal();
      if (!g.ev) { // jogo salvo antes da minutagem
        if (g.live) return wcLive();
        const div = document.createElement('div'); div.innerHTML = wcRow(g); list.appendChild(div.firstChild);
        return setTimeout(next, simAll ? 40 : fast ? 250 : 1300);
      }
      const el = liveRow(g);
      list.appendChild(el);
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Jogo com lance: o relógio para no minuto do lance
      if (g.live) return runClock(el, g, 0, g.moment.minute, spd, () => {
        el.classList.add('paused');
        if (simAll || U.cfg.moments === 'auto') { S.wcMomentAuto(G.c); save(); return wcPlay(); }
        setTimeout(wcLive, isFast() ? 100 : 500);
      });
      runClock(el, g, 0, 90, spd, () => { finish(el, g); setTimeout(next, simAll ? 40 : isFast() ? 200 : 900); });
    };
    if (resume) {
      // Depois do lance: o relógio volta a correr do minuto do lance até o apito final
      const el = liveRow(resume);
      list.appendChild(el);
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return runClock(el, resume, resume.resumeAt, 90, spd, () => {
        delete resume.resumeAt; save();
        finish(el, resume);
        setTimeout(next, simAll ? 40 : isFast() ? 200 : 1000);
      });
    }
    setTimeout(next, simAll ? 40 : 500);
  }

  // Lance decisivo nos minutos finais: pênalti ou falta a favor, no minigame
  function wcLive() {
    screen.onclick = null;
    const run = G.c.wcRun, g = run.games[run.games.length - 1], m = g.moment;
    // Fechou o jogo no meio da cobrança: a chance decide
    if (run.momentStarted) { S.wcMomentAuto(G.c); save(); return wcPlay(); }
    const type = S.kickSetupType({ kick: m.type }), def = type === 'save' || type === 'tackle';
    const k = S.kickSetup(G.c, type), d = g.gf - g.ga, ko = run.stage >= 3;
    // No fim do jogo o lance decide; antes disso ele muda o placar e o resto do jogo ainda acontece
    const late = m.minute >= 78, left = 90 - m.minute;
    const gain = d === 0 ? (late ? (ko ? 'classifica' : 'vitória') : 'sai na frente') : d === -1 ? (late ? (ko ? 'leva para os pênaltis' : 'empata') : 'empata') : d >= 1 ? 'amplia' : 'diminui';
    // Defensor: o que acontece se falhar (gol deles)
    const lose = d >= 2 ? 'diminuem' : d === 1 ? (late && ko ? 'empatam e levam para os pênaltis' : 'empatam') : d === 0 ? (late ? (ko ? 'eliminado' : 'derrota') : 'saem na frente') : 'aumentam';
    const cwc = isCwc(run), who = cwc ? D.o(esc(club(run.club).name)) : theCountry(G.c.country);
    const h = $('wc-hint'); if (h) h.remove();
    // O que está em jogo nesta fase
    const NEXT = { 3: 'vai às quartas', 4: 'vai à semifinal', 5: 'vai à final', 6: cwc ? 'é campeão mundial' : 'é campeão do mundo' };
    const ctx = (late ? 'Reta final! ' : 'Ainda faltam ' + left + ' minutos. ') + (ko ? 'Mata-mata: quem vencer ' + NEXT[run.stage] + '.' : run.stage === 2 ? 'Último jogo do grupo: ' + run.pts + (run.pts === 1 ? ' ponto' : ' pontos') + ' até aqui.' : 'Fase de grupos: ' + run.pts + (run.pts === 1 ? ' ponto' : ' pontos') + ' em ' + run.stage + (run.stage === 1 ? ' jogo.' : ' jogos.'));
    $('wc-after').innerHTML = '<div class="card event-card wc-live"><span class="st">' + esc(g.stage) + ' · ' + m.minute + "'</span>" +
      '<div class="line"><span>' + usMark(run) + '</span><b>' + g.gf + ' × ' + g.ga + '</b><span>' + themMark(g) + ' ' + esc(g.opp) + '</span></div>' +
      '<p class="mom-ctx">' + esc(ctx) + '</p>' +
      '<h2>' + ({ pen: 'Pênalti para ' + who + '!', fk: 'Falta perigosa na entrada da área!', save: 'Pênalti contra ' + who + '!', tackle: 'Contra-ataque perigoso!', pass: 'A bola é sua: enfie para o atacante!' }[m.type]) + '</h2>' +
      '<p class="stakes">' + (def ? (type === 'save' ? 'Defendeu: segura o placar · Sofreu: ' : 'Desarmou: segura o placar · Passou: ') + lose : 'Converteu: ' + gain) + '</p></div>' +
      '<div class="chips">' + U.miniFacts(type).join('') + '</div>' +
      '<button class="btn" id="b-kick">' + U.MINI_BTN[type] + '</button><button class="btn ghost" id="b-auto">Deixar o jogo decidir<small>Chance de ' + Math.round(k.chance * 100) + '% pela sua carta</small></button>';
    $('wc-after').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    sfx('whistle');
    $('b-kick').onclick = () => {
      run.momentStarted = true; save();
      render('<div class="eyebrow">' + tName(run) + ' ' + run.year + ' · ' + esc(g.stage) + ' · ' + m.minute + "'</div><div id=\"kick\"></div>");
      U.playMini($('kick'), type, ok => { if (!$('kick')) return; S.wcMoment(G.c, ok); save(); wcPlay(); }); // saiu da tela: ao retomar, a chance decide
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
      U.playMini($('kick'), type, ok => { if (!$('kick')) return; run.pensStarted = false; S.wcPens(G.c, ok); save(); wcPlay(); });
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
    const sim = $('wc-sim'); if (sim) sim.remove();
    simAll = false;
    $('wc-after').innerHTML = (run.champion
      ? '<div class="wc-champ">' + (cwc ? trophy('cwc', 96, 'Mundial de Clubes') + '<b>CAMPEÃO MUNDIAL!</b>' : trophy('wc', 96) + '<b>CAMPEÃO DO MUNDO!</b>') + '<span>' + usMark(run) + ' ' + usName(run) + ' · ' + run.year + '</span></div>'
      : '<div class="wc-out">' + (run.reached === 'Final' ? (cwc ? 'Vice-campeão mundial' : 'Vice-campeão do mundo') : 'Eliminado: ' + run.reached.toLowerCase()) + '</div>') +
      '<p class="wc-stats">' + (cwc ? 'No Mundial: ' : 'Na Copa: ') + run.games.length + ' jogos · ' + (S.defKick(G.c.pos)
        ? run.games.filter(x => x.cs).length + ' sem sofrer gol' + (run.g ? ' · ' + run.g + (run.g === 1 ? ' gol' : ' gols') : '')
        : run.g + (run.g === 1 ? ' gol' : ' gols') + ' · ' + run.a + (run.a === 1 ? ' assistência' : ' assistências')) + '</p>' +
      '<button class="btn" id="b-next">' + (S.mustRetire(G.c) ? 'Ver sua carreira' : 'Seguir a carreira') + '</button>';
    if (run.champion) {
      const btn = $('b-next');
      U.celebrate([{ art: cwc ? trophy('cwc', 150, 'Mundial de Clubes') : trophy('wc', 150), top: cwc ? 'Campeão mundial!' : 'Campeão do mundo!', name: (cwc ? 'Mundial de Clubes ' : 'Copa do Mundo ') + run.year }],
        () => { if (btn.isConnected) (cwc ? U.clubWorldPaper : U.worldCupPaper)(G.c, run, () => run.card && U.walkout(G.c, null, run.card)); });
    }
    $('wc-after').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('b-next').onclick = () => U.salaPlay(G.c, U.afterSeason);
  }

  Object.assign(U, { theCountry, ofCountry, cwcIntro, wcIntro, wcRow, wcPlay, wcLive, wcPens, wcFinal });
})();
