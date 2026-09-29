// Interface — temporada: contadores, revelação, jornal e resumo
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- temporada ----------
  // Os dois números da temporada que mais importam para a posição
  function seasonStats(res) {
    if (res.pos === 'GOL') return [[res.cleanSheets || 0, 'Sem sofrer'], [res.saves || 0, 'Defesas']];
    if (res.pos === 'ZAG') return [[res.goals, 'Gols'], [res.cleanSheets || 0, 'Sem sofrer']];
    return [[res.goals, 'Gols'], [res.assists, 'Assist.']];
  }

  function season() {
    const res = S.playSeason(G.c);
    sfx('whistle');
    // Em ano de Copa com convocação, fechar o jogo no resumo não pula a Copa
    G.step = S.isWcYear(G.c) && G.c.wcYearDone !== year() && S.wcCall(G.c).called ? 'wc' : S.windowOpen(G.c) ? 'offers' : 'preseason';
    save();
    const cl = club(res.club);
    const [c1, c2] = seasonStats(res);
    render(
      '<div class="season-head"><div><div class="eyebrow">Temporada ' + (year() - 1) + ' · ' + res.age + ' anos</div><h2 class="with-crest">' + crest(cl.id, 'lg') + esc(cl.name) + '</h2></div><span class="tag">' + (res.farewell ? 'Despedida' : res.role) + '</span></div>' +
      '<div class="counters"><div class="counter"><b id="k-j">0</b><span>Jogos</span></div><div class="counter"><b id="k-g">0</b><span>' + c1[1] + '</span></div>' +
      '<div class="counter"><b id="k-a">0</b><span>' + c2[1] + '</span></div><div class="counter rate"><b id="k-n">–</b><span>Nota</span></div></div>' +
      '<div class="feed" id="feed"></div><div id="after"></div><p class="skip-hint" id="skip-hint">Toque para pular</p>'
    );
    const dur = 2200, t0 = performance.now();
    let skip = false;
    // Liga o "pular" só depois: o toque que abriu esta tela ainda está se propagando
    setTimeout(() => { screen.onclick = () => { skip = true; }; }, 50);
    (function tick(now) {
      const u = skip ? 1 : Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 2);
      $('k-j').textContent = Math.round(res.games * e);
      $('k-g').textContent = Math.round(c1[0] * e);
      $('k-a').textContent = Math.round(c2[0] * e);
      if (u < 1) return requestAnimationFrame(tick);
      $('k-n').textContent = res.games ? res.rating.toFixed(1).replace('.', ',') : '–';
      $('k-n').parentNode.classList.add('pop');
      summary(res, skip);
    })(t0);
  }

  // Jornal da temporada (a capa em si fica em ui/paper.js)
  function lede(res, cl) {
    const tb = res.table;
    const pos = tb.pos === 1 ? 'terminou campeão ' + D.da(tb.league) : 'terminou em ' + tb.pos + 'º lugar ' + D.na(tb.league);
    const perf = !res.games ? G.c.name + ' quase não entrou em campo, e ' + D.o(cl.name) + ' ' + pos + '.'
      : res.rating >= 7.5 ? G.c.name + ' foi o nome ' + D.do(cl.name) + ', que ' + pos + '.'
      : res.rating >= 6.8 ? 'Com atuações seguras de ' + G.c.name + ', ' + D.o(cl.name) + ' ' + pos + '.'
      : 'Em temporada irregular de ' + G.c.name + ', ' + D.o(cl.name) + ' ' + pos + '.';
    return perf + (res.titles.length ? ' A torcida comemorou ' + res.titles.map(t => t.name).join(' e ') + '.' : '');
  }
  function showPaper(res, onClose) {
    const cl = club(res.club), [main, ...rest] = res.headlines, nick = G.c.name;
    // Foto da capa conforme a temporada: taça, maca (lesão), comemoração ou pose normal
    const won = res.titles.length || res.awards.some(a => a.id === 'ballon');
    const pose = won ? 'taca' : res.injury >= 25 ? 'maca' : res.games && res.rating >= 7.3 ? 'celebra' : res.games && res.rating < 6.3 ? 'triste' : 'normal';
    const caption = { taca: nick + ' ergue a taça', maca: nick + ' deixa o campo de maca', celebra: nick + ' comemora com a torcida', triste: nick + ' cabisbaixo após mais um tropeço' }[pose] || nick + ' com a camisa ' + D.do(cl.name);
    U.paper({ c: G.c, year: year() - 1, head: main, pose, kit: U.kitOf(cl.id), caption,
      stats: res.games + ' jogos · ' + seasonStats(res).map(([v, l]) => v + ' ' + l.toLowerCase()).join(' · ') + (res.games ? ' · nota ' + res.rating.toFixed(1).replace('.', ',') : ''),
      lede: lede(res, cl), subs: rest, column: res.column },
      // Depois do jornal: revelação da carta nova (subiu de faixa) e das cartas especiais da temporada
      () => U.walkouts(G.c, (U.tierUp(res.ovr0, res.ovr1) ? [null] : []).concat(res.cards || []), onClose));
  }

  // Mostra os blocos do resumo um de cada vez (troféus com mais destaque). Tocar mostra tudo.
  function reveal(skipNow, res) {
    const items = Array.from(screen.querySelectorAll('.rv'));
    let i = 0, timer = null, paper = false;
    const done = () => { screen.onclick = null; const h = $('skip-hint'); if (h) h.remove(); };
    // O jornal aparece uma vez por temporada, mesmo se a pessoa pular o resto
    const all = () => {
      clearTimeout(timer); items.forEach(el => el.classList.add('in')); done();
      if (!paper) { paper = true; showPaper(res); }
    };
    if (skipNow) return all();
    screen.onclick = all;
    (function next() {
      if (i >= items.length) return done();
      if (!items[0].isConnected) return; // já saiu desta tela
      const el = items[i++];
      el.classList.add('in');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (el.classList.contains('title-won') || el.classList.contains('ballon')) sfx('fanfare');
      else if (el.classList.contains('move-line') && el.classList.contains('up')) sfx('levelup');
      else if (el.classList.contains('wc-call')) sfx('levelup');
      if (el.classList.contains('news') && !paper) {
        paper = true;
        screen.onclick = null;
        return setTimeout(() => { if (el.isConnected) showPaper(res, () => { screen.onclick = all; timer = setTimeout(next, 200); }); }, 300);
      }
      timer = setTimeout(next, el.classList.contains('title-won') ? 900 : el.classList.contains('award') ? 700 : el.classList.contains('hl') ? 450 : 220);
    })();
  }

  function summary(res, skipNow) {
    const feed = $('feed');
    res.highlights.forEach(h => { const d = document.createElement('div'); d.className = 'rv hl'; d.textContent = h; feed.appendChild(d); });
    const dOvr = res.ovr1 - res.ovr0;
    const fin = S.mustRetire(G.c);
    const tb = res.table;
    const tableTxt = !res.games ? '' : tb.pos === 1 ? '🥇 Campeão ' + D.da(tb.league) + ' com ' + tb.pts + ' pontos'
      : tb.pos + 'º lugar ' + D.na(tb.league) + ' · ' + tb.pts + ' pts, a ' + tb.gap + ' do líder';
    const moveTxt = !res.move ? '' : res.move.dir === 'up' ? '⬆️ Acesso ' + D.paraA(res.move.toName) + '!' : '⬇️ Rebaixado ' + D.paraA(res.move.toName);
    const why = res.why.length ? '<ul class="why">' + res.why.map(w => '<li><span>' + esc(w.txt) + '</span><b class="' + (w.pot ? 'pot' : w.v >= 0 ? 'up' : 'down') + '">' + (w.pot ? 'teto ↑' : (w.v >= 0 ? '+' : '') + w.v) + '</b></li>').join('') + '</ul>' : '';
    const open = S.windowOpen(G.c);
    const contractTxt = G.c.contract > 0 ? 'Contrato: mais ' + G.c.contract + (G.c.contract > 1 ? ' temporadas' : ' temporada') + ' ' + D.no(esc(club(G.c.club).name)) : 'Seu contrato acabou: hora de decidir o futuro';
    // Copa do Mundo: convocação logo depois da temporada, em ano de Copa
    const wcNow = S.isWcYear(G.c) && G.c.wcYearDone !== year();
    const call = wcNow ? S.wcCall(G.c) : null;
    let wcBlock = '';
    if (call && call.called) wcBlock = '<div class="wc-call rv"><span class="wc-flag">' + call.nation.flag + '</span><div><b>Convocado para a Copa do Mundo ' + year() + '!</b><span>' + (call.starter ? 'Titular da seleção' : 'Vai como reserva (nota perto do corte de ' + call.cut + ')') + '</span></div></div>';
    else if (call && G.c.age >= 18) { wcBlock = '<p class="wc-miss rv">🌍 Fora da Copa de ' + year() + ': a seleção pedia nota ' + call.cut + ', você tem ' + S.ovr(G.c) + '.</p>'; G.c.wcYearDone = year(); save(); }
    const goWc = call && call.called;
    let actions;
    if (fin) actions = '<p class="lead">' + (res.farewell ? 'Fim da temporada de despedida. Hora de pendurar as chuteiras.' : 'Aos ' + G.c.age + ' anos, o corpo pediu para parar.') + '</p><button class="btn" id="b-next">' + (goWc ? 'Última dança: Copa do Mundo ' + year() + ' 🌍' : 'Ver sua carreira') + '</button>';
    else {
      actions = '<p class="contract">' + contractTxt + '</p><button class="btn" id="b-next">' + (goWc ? 'Jogar a Copa do Mundo ' + year() + ' 🌍' : open ? 'Janela de transferências' : 'Próxima temporada') + '</button>';
      if (S.canAnnounce(G.c)) actions += '<button class="btn ghost" id="b-farewell">Anunciar a última temporada<small>Torcida +10 e mais minutos · parar em alta rende pontos extras</small></button>';
      if (S.canRetire(G.c)) actions += '<button class="btn ghost" id="b-stop">Parar agora</button>';
    }
    $('after').innerHTML =
      (tableTxt ? '<p class="table-line rv">' + tableTxt + '</p>' : '') +
      (moveTxt ? '<div class="move-line rv ' + res.move.dir + '">' + moveTxt + '</div>' : '') +
      (res.titles.length ? '<div class="titles">' + res.titles.map(t => '<div class="title-won rv">' + trophy(titleType(t), 54) + '<span>Campeão<br><b>' + esc(t.name) + '</b></span></div>').join('') + '</div>' : '') +
      '<div class="awards">' + res.awards.map(a => '<div class="award rv' + (a.id === 'ballon' ? ' ballon' : '') + '">' + (a.id === 'ballon' ? trophy('ballon', 44) + ' ' : '🥇 ') + a.name + '</div>').join('') + '</div>' +
      '<div class="news rv"><div class="np">📰 Nos jornais</div>' + res.headlines.map(h => '<p>' + esc(h) + '</p>').join('') + '</div>' +
      '<div class="card why-card rv"><p class="delta-in ' + (dOvr >= 0 ? 'up' : 'down') + '">Nota geral ' + res.ovr0 + ' → ' + res.ovr1 + ' (' + (dOvr >= 0 ? '+' : '') + dOvr + ')</p>' + why + '</div>' +
      '<p class="rel-delta rv">👔 Técnico ' + res.coach0 + ' → ' + res.coach1 + ' · 📣 Torcida ' + res.fans0 + ' → ' + res.fans1 + ' (' + S.relLabel(res.fans1) + ')</p>' +
      wcBlock + '<div class="rv">' + actions + '</div>';
    bar();
    reveal(skipNow, res);
    $('b-next').onclick = goWc ? U.wcIntro : afterSeason;
    if ($('b-farewell')) $('b-farewell').onclick = () => { S.announce(G.c); save(); bar(); goWc ? U.wcIntro() : U.preseason(); };
    if ($('b-stop')) $('b-stop').onclick = U.finale;
  }

  // Para onde ir depois da temporada (e da Copa, se houver)
  function afterSeason() {
    if (S.mustRetire(G.c)) return U.finale();
    return S.windowOpen(G.c) ? U.windowOffers() : U.preseason();
  }

  Object.assign(U, { season, lede, showPaper, reveal, summary, afterSeason });
})();
