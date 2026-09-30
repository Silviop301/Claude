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
    // Proposta de transferência: compara com a situação de hoje antes de decidir
    const offer = S.eventOffer(G.c, ev);
    render(
      '<div class="eyebrow">Durante a temporada</div>' +
      '<div class="card event-card"><span class="ic">' + ev.icon + '</span><h2>' + ev.title + '</h2><p style="margin:0">' + ev.text + '</p></div>' +
      (offer ? U.dealCompare(S.currentDeal(G.c), offer) : '') +
      '<div class="choices">' + ev.options.map((o, i) => '<button class="btn opt' + (i ? ' ghost' : '') + '" data-i="' + i + '">' + esc(o.label) + '<small>' + esc(o.hint) + '</small></button>').join('') + '</div>'
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      // Trocar de clube pede confirmação (dois toques)
      if (offer && b.dataset.i === '0' && !U.arm(b, '<b>Toque de novo para assinar</b>')) return;
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
    acesso: m => ({ tag: 'Última rodada · ' + m.comp, title: (m.kick === 'fk' ? 'Falta' : 'Pênalti') + ' valendo o acesso!',
      text: 'Contra ' + D.o(club(m.vs).name) + (m.kick === 'fk' ? ', falta na entrada da área.' : ', pênalti a seu favor.'), stakes: 'Converteu: acesso garantido · Errou: fica para o ano que vem' }),
    classico: m => ({ tag: 'Clássico', title: 'Falta perigosa no clássico!', text: 'Contra ' + D.o(club(m.vs).name) + ', na entrada da área. A barreira está armada.', stakes: 'Converteu: gol no clássico e Torcida +8' }),
  };

  // Lances defensivos (zagueiro/goleiro): o mesmo momento, visto do outro lado
  const DEF_TXT = (m, mode) => {
    const vs = D.o(club(m.vs).name), save = mode === 'save';
    const what = save ? 'Pênalti contra' : 'Contra-ataque';
    const goal = { cup: 'campeão da ' + m.comp, title: 'campeão da liga', acesso: 'acesso garantido', cont: 'campeão da ' + m.comp, classico: 'o clássico é seu, Torcida +8' }[m.type];
    return {
      tag: { cup: 'Final da ' + m.comp, title: 'Última rodada · ' + m.comp, acesso: 'Última rodada · ' + m.comp, cont: 'Final da ' + m.comp, classico: 'Clássico' }[m.type],
      title: save ? 'Pênalti contra nos acréscimos!' : 'Contra-ataque no último minuto!',
      text: (save ? 'O camisa 9 ' + D.do(club(m.vs).name) + ' vai bater.' : 'O atacante ' + D.do(club(m.vs).name) + ' arrancou sozinho.') + ' Tudo depende de você contra ' + vs + '.',
      stakes: (save ? 'Defendeu: ' : 'Desarmou: ') + goal + ' · ' + (m.type === 'classico' ? 'Falhou: gol deles' : m.type === 'acesso' ? 'Falhou: o acesso escapa' : 'Falhou: vice'),
      what,
    };
  };
  // Abre o minigame certo para o tipo do lance (chute, goleiro ou zagueiro)
  function playMini(el, setupType, onDone) {
    if (setupType === 'save') return window.CRAQUE_SAVE(el, { c: G.c, onDone });
    if (setupType === 'tackle') return window.CRAQUE_TACKLE(el, { c: G.c, onDone });
    return window.CRAQUE_KICK(el, { c: G.c, moment: { type: setupType }, onDone });
  }
  // O que da carta pesa no lance, sem números escondidos
  function miniFacts(setupType) {
    const k = S.kickSetup(G.c, setupType), E = S.eff(G.c), L = kk => D.label(G.c.pos, kk);
    const lv = id => (G.c.traits.includes(id) ? S.traitLevel(G.c, id) : 0);
    if (setupType === 'save') return ['<span class="chip">' + L('fin') + ' ' + E.fin + ' · sinal do batedor ' + (k.tellMs >= 340 ? 'longo' : k.tellMs >= 220 ? 'médio' : 'curto') + '</span>',
      '<span class="chip">' + L('fis') + ' ' + E.fis + ' · alcance ' + (k.diveReach >= 0.8 ? 'grande' : k.diveReach >= 0.66 ? 'médio' : 'curto') + '</span>'].concat(lv('pegador') ? ['<span class="chip">🥅 Pegador de pênalti: sinal mais longo</span>'] : []);
    if (setupType === 'tackle') return ['<span class="chip">DEF ' + E.def + ' · faixa ' + (k.win >= 0.18 ? 'larga' : k.win >= 0.12 ? 'média' : 'estreita') + '</span>',
      '<span class="chip">RIT ' + E.rit + ' · lance ' + (k.period >= 1.3 ? 'lento' : k.period >= 1.05 ? 'médio' : 'rápido') + '</span>'].concat(lv('carrinho') ? ['<span class="chip">🦵 Carrinho: faixa maior</span>'] : []);
    const f = ['<span class="chip">FIN ' + E.fin + ' · mira ' + (k.period >= 1.7 ? 'lenta' : k.period >= 1.35 ? 'média' : 'rápida') + '</span>',
      '<span class="chip">Tremedeira ' + (k.wobble <= 0.03 ? 'nenhuma' : k.wobble <= 0.08 ? 'pouca' : 'muita') + '</span>'];
    if (lv('colocado')) f.push('<span class="chip">🎯 Chute Colocado: mira mais lenta</span>');
    if (lv('frieza')) f.push('<span class="chip">🧊 Frieza: menos tremedeira</span>');
    if (setupType === 'classico' && lv('parada')) f.push('<span class="chip">🧱 Bola Parada: barreira mais fácil</span>');
    return f;
  }
  const MINI_HOW = {
    cup: 'Dois toques: o primeiro trava a direção, o segundo a altura. O goleiro escolhe um canto; no ângulo ele não alcança.',
    classico: 'Dois toques: o primeiro trava a direção, o segundo a altura. Passe por cima da barreira ou busque o ângulo.',
    save: 'O batedor corre; pouco antes do chute aparece uma seta mostrando o lado. Toque na esquerda, no meio ou na direita para pular.',
    tackle: 'O atacante arranca em direção ao gol. Toque quando ele passar pela faixa verde para dar o carrinho.',
  };
  const MINI_BTN = { cup: 'Bater o pênalti', classico: 'Bater a falta', save: 'Defender o pênalti', tackle: 'Dar o bote' };

  function momentIntro(m) {
    const st = S.kickSetupType(m), def = st === 'save' || st === 'tackle';
    const T = def ? DEF_TXT(m, st) : MOMENT_TXT[m.type](m), k = S.kickSetup(G.c, st);
    render(
      '<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div>' +
      '<div class="card event-card moment-card">' + (m.score
        // Placar e minuto: o mesmo chute vale outra coisa no 1 × 1 aos 89'
        ? '<div class="mom-board">' + crest(G.c.club) + '<b>' + m.score[0] + ' × ' + m.score[1] + '</b>' + crest(m.vs) + '<span class="mom-min">' + m.minute + "'</span></div>" +
          '<p class="mom-ctx">' + esc(m.ctx || '') + '</p>'
        : '<div class="with-crest">' + crest(G.c.club) + '<b>×</b>' + crest(m.vs) + '</div>') +
      '<h2>' + T.title + '</h2><p style="margin:0">' + esc(T.text) + '</p><p class="stakes">' + esc(T.stakes) + '</p></div>' +
      '<div class="chips">' + miniFacts(st).join('') + '</div>' +
      '<p class="lead small">' + MINI_HOW[st] + '</p>' +
      '<button class="btn" id="b-kick">' + MINI_BTN[st] + '</button>' +
      '<button class="btn ghost" id="b-auto">Deixar o jogo decidir<small>Chance de ' + Math.round(k.chance * 100) + '% pela sua carta</small></button>'
    );
    $('b-kick').onclick = () => {
      m.started = true; save();
      render('<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div><div id="kick"></div>');
      sfx('whistle');
      playMini($('kick'), st, (ok, why) => momentEnd(m, ok, T, why));
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
      acesso: ok ? 'Gol! O acesso é seu!' : (how || 'Não entrou.') + ' O acesso escapou na última rodada.',
      cont: ok ? 'É campeão da ' + m.comp + '! Seu nome entrou para a história do clube.' : (how || 'Não entrou.') + ' Fica o vice da ' + m.comp + '.',
    }[m.type];
    // Lances defensivos: texto próprio
    const st = S.kickSetupType(m);
    const defTxt = st === 'save' ? (ok ? (why === 'fora' ? 'O batedor mandou para fora! ' : 'Que defesa! ') : 'Não deu: a bola entrou. ')
      : st === 'tackle' ? (ok ? 'Carrinho perfeito, bola roubada! ' : why === 'cedo' ? 'Você chegou cedo e ele passou. ' : 'Chegou tarde: ele passou e marcou. ') : null;
    const defEnd = { cup: ok ? 'Campeão da ' + m.comp + '!' : 'Fica o vice da ' + m.comp + '.', title: ok ? 'O título é seu!' : 'O título escapou.',
      classico: ok ? 'O clássico é seu.' : 'A torcida lamenta.', acesso: ok ? 'O acesso é seu!' : 'O acesso escapou.', cont: ok ? 'Campeão da ' + m.comp + '!' : 'Fica o vice da ' + m.comp + '.' }[m.type];
    const final = defTxt !== null ? defTxt + defEnd : txt;
    // Placar depois do lance e um título grande (gol, defesa, bote ou a lamentação)
    const def = st === 'save' || st === 'tackle';
    const sc = m.score ? [m.score[0] + (!def && ok ? 1 : 0), m.score[1] + (def && !ok ? 1 : 0)] : null;
    const big = def ? (ok ? (st === 'save' ? 'DEFENDEU!' : 'ROUBOU!') : 'Gol deles…') : ok ? 'GOOOL!' : 'Não entrou…';
    render(
      '<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div>' +
      '<div class="card mom-res ' + (ok ? 'ok' : 'ko') + '">' +
      (sc ? '<div class="mom-board">' + crest(G.c.club) + '<b>' + sc[0] + ' × ' + sc[1] + '</b>' + crest(m.vs) + '<span class="mom-min">' + (m.minute || 90) + "'</span></div>" : '') +
      '<div class="mr-big">' + big + '</div><p class="mr-txt">' + final + '</p></div>' +
      '<button class="btn" id="b-next">Jogar a temporada</button>'
    );
    $('b-next').onclick = U.season;
    // Final continental: edição extra do jornal
    const btn = $('b-next');
    if (m.type === 'cont') setTimeout(() => { if (btn.isConnected) U.finalPaper(G.c, m, ok); }, 900);
  }

  Object.assign(U, { eventOrSeason, eventScreen, momentOrSeason, MOMENT_TXT, momentIntro, momentEnd, momentResult, playMini, miniFacts, MINI_BTN });
})();
