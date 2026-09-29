// Interface — eventos e jogo decisivo (minigame)
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- evento ----------
  let pendingEvent = null;
  function eventOrSeason() {
    pendingEvent = S.pickEvent(G.c);
    if (!pendingEvent) return momentOrSeason();
    G.step = 'event';
    save();
    eventScreen();
  }

  function eventScreen() {
    if (!pendingEvent) pendingEvent = S.pickEvent(G.c);
    if (!pendingEvent) return momentOrSeason();
    const ev = pendingEvent;
    render(
      '<div class="eyebrow">Durante a temporada</div>' +
      '<div class="card event-card"><span class="ic">' + ev.icon + '</span><h2>' + ev.title + '</h2><p style="margin:0">' + ev.text + '</p></div>' +
      '<div class="choices">' + ev.options.map((o, i) => '<button class="btn opt' + (i ? ' ghost' : '') + '" data-i="' + i + '">' + esc(o.label) + '<small>' + esc(o.hint) + '</small></button>').join('') + '</div>'
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const r = S.resolveEvent(G.c, ev, +b.dataset.i);
      pendingEvent = null;
      bar();
      render(
        '<div class="eyebrow">' + ev.title + '</div>' +
        '<div class="result ' + (r.ok ? 'ok' : 'ko') + '">' + r.text + '</div>' +
        '<button class="btn" id="b-next">Jogar a temporada</button>'
      );
      $('b-next').onclick = momentOrSeason;
    });
  }

  // ---------- jogo decisivo (minigame) ----------
  function momentOrSeason() {
    const m = S.pickMoment(G.c);
    if (!m) return U.season();
    G.step = 'moment';
    // Fechou o jogo no meio da cobrança? A chance decide (sem repetir o chute)
    if (m.started) { S.autoMoment(G.c); save(); return U.season(); }
    save();
    momentIntro(m);
  }

  const MOMENT_TXT = {
    cup: m => ({ tag: 'Final da ' + m.comp, title: 'Pênalti nos acréscimos!', text: 'Final contra ' + D.o(club(m.vs).name) + ', empate no placar. A bola é sua.', stakes: 'Converteu: campeão da ' + m.comp + ' · Errou: vice' }),
    title: m => ({ tag: 'Última rodada · ' + m.comp, title: 'Pênalti valendo o título!', text: 'Contra ' + D.o(club(m.vs).name) + ', quem vencer é campeão.', stakes: 'Converteu: campeão da liga · Errou: vice' }),
    cont: m => ({ tag: 'Final da ' + m.comp, title: (m.kick === 'fk' ? 'Falta na final' : 'Pênalti na final') + ' da ' + m.comp + '!',
      text: 'Decisão contra ' + D.o(club(m.vs).name) + ', ' + (m.kick === 'fk' ? 'falta na entrada da área aos 88 minutos.' : 'pênalti nos acréscimos com o placar empatado.'),
      stakes: 'Converteu: campeão da ' + m.comp + ' · Errou: vice' }),
    classico: m => ({ tag: 'Clássico', title: 'Falta perigosa no clássico!', text: 'Contra ' + D.o(club(m.vs).name) + ', na entrada da área. A barreira está armada.', stakes: 'Converteu: gol no clássico e Torcida +8' }),
  };

  function momentIntro(m) {
    const fk = S.kickType(m) === 'fk';
    const T = MOMENT_TXT[m.type](m), k = S.kickSetup(G.c, S.kickSetupType(m)), E = S.eff(G.c);
    const lv = id => (G.c.traits.includes(id) ? S.traitLevel(G.c, id) : 0);
    // O que da carta pesa no chute, sem números escondidos
    const facts = ['<span class="chip">FIN ' + E.fin + ' · mira ' + (k.period >= 1.7 ? 'lenta' : k.period >= 1.35 ? 'média' : 'rápida') + '</span>',
      '<span class="chip">Tremedeira ' + (k.wobble <= 0.03 ? 'nenhuma' : k.wobble <= 0.08 ? 'pouca' : 'muita') + '</span>'];
    if (lv('colocado')) facts.push('<span class="chip">🎯 Chute Colocado: mira mais lenta</span>');
    if (lv('frieza')) facts.push('<span class="chip">🧊 Frieza: menos tremedeira</span>');
    if (fk && lv('parada')) facts.push('<span class="chip">🧱 Bola Parada: barreira mais fácil</span>');
    render(
      '<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div>' +
      '<div class="card event-card moment-card"><div class="with-crest">' + crest(G.c.club) + '<b>×</b>' + crest(m.vs) + '</div><h2>' + T.title + '</h2><p style="margin:0">' + esc(T.text) + '</p><p class="stakes">' + esc(T.stakes) + '</p></div>' +
      '<div class="chips">' + facts.join('') + '</div>' +
      '<p class="lead small">Dois toques: o primeiro trava a direção, o segundo a altura. ' + (fk ? 'Passe por cima da barreira ou busque o ângulo.' : 'O goleiro escolhe um canto; no ângulo ele não alcança.') + '</p>' +
      '<button class="btn" id="b-kick">' + (fk ? 'Bater a falta' : 'Bater o pênalti') + '</button>' +
      '<button class="btn ghost" id="b-auto">Deixar o jogo decidir<small>Chance de ' + Math.round(k.chance * 100) + '% pela sua carta</small></button>'
    );
    $('b-kick').onclick = () => {
      m.started = true; save();
      render('<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div><div id="kick"></div>');
      sfx('whistle');
      window.CRAQUE_KICK($('kick'), { c: G.c, moment: { type: S.kickSetupType(m) }, onDone: (ok, why) => momentEnd(m, ok, T, why) });
    };
    $('b-auto').onclick = () => {
      const ok = S.autoMoment(G.c);
      save();
      momentResult(ok, T, m);
    };
  }

  function momentEnd(m, ok, T, why) {
    S.resolveMoment(G.c, ok);
    save();
    momentResult(ok, T, m, why);
  }

  function momentResult(ok, T, m, why) {
    const how = { defesa: 'O goleiro ' + D.do(club(m.vs).name) + ' defendeu.', trave: 'A bola explodiu na trave.', fora: 'A bola foi para fora.', alto: 'A bola foi por cima do gol.', barreira: 'A bola parou na barreira.' }[why] || '';
    const txt = {
      cup: ok ? 'Gol! Campeão da ' + m.comp + '!' : (how || 'Não entrou.') + ' Fica o vice da ' + m.comp + '.',
      title: ok ? 'Na rede! O título é seu!' : (how || 'Não entrou.') + ' O título escapou nos detalhes.',
      classico: ok ? 'Golaço de falta! O clássico é seu.' : (how || 'Não foi dessa vez.') + ' A torcida lamenta.',
      cont: ok ? 'É campeão da ' + m.comp + '! Seu nome entrou para a história do clube.' : (how || 'Não entrou.') + ' Fica o vice da ' + m.comp + '.',
    }[m.type];
    render(
      '<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div>' +
      '<div class="result ' + (ok ? 'ok' : 'ko') + '">' + txt + '</div>' +
      '<button class="btn" id="b-next">Jogar a temporada</button>'
    );
    $('b-next').onclick = U.season;
  }

  Object.assign(U, { eventOrSeason, eventScreen, momentOrSeason, MOMENT_TXT, momentIntro, momentEnd, momentResult });
})();
