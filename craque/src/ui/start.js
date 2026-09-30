// Interface — tela inicial e criação do jogador
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- início ----------
  function home() {
    G.c = null; G.step = null; bar();
    const saved = load(SAVE);
    const hall = load(HALL) || [];
    render(
      '<div class="hero"><div class="ball3d" id="ball3d" aria-hidden="true"></div><div class="eyebrow">Carreira de futebol</div><h1>CLIMBIX</h1></div>' +
      '<p class="lead">Crie um garoto de 16 anos, escolha propostas, monte o estilo dele e descubra se ele vira lenda.</p>' +
      // Carreira em andamento: a carta do jogador no lugar de um botão de texto
      (saved && saved.c ? (() => { const sc = saved.c, o = S.ovr(sc), t = tierCls(o), cl = club(sc.club);
        return '<button class="cont-card" id="b-cont"><span class="scard metal ' + t + '"><span class="sc-tier">' + TIER_NAME[t] + '</span><b>' + o + '</b><span class="sc-pos">' + sc.pos + '</span></span>' +
          '<span class="cc-info"><small>Continuar carreira</small><b>' + esc(sc.name) + '</b><span>' + (cl ? crest(cl.id, 'xs') + esc(cl.name) + ' · ' : '') + sc.age + ' anos</span></span><span class="cc-go">' + U.ICON['chevron-right'] + '</span></button>'; })() : '') +
      '<button class="btn' + (saved && saved.c ? ' ghost' : '') + '" id="b-new">Nova carreira</button>' +
      U.dailyCard() +
      // Atalhos em grade 2×2: mesmo tamanho, ícone, nome e um número
      '<div class="home-grid">' +
      '<button class="hg" id="b-rank"><i>' + U.ICON.trophy + '</i><b>Ranking</b><small>hoje · geral</small></button>' +
      '<button class="hg" id="b-col"><i>' + U.ICON.cards + '</i><b>Coleção</b><small>' + U.collectionCount() + (U.collectionCount() === 1 ? ' carreira' : ' carreiras') + '</small></button>' +
      '<button class="hg" id="b-ach"><i>' + U.ICON.medal + '</i><b>Conquistas</b><small>' + U.achCount() + ' de ' + S.ACHIEVEMENTS.length + '</small></button>' +
      U.cloudLine() + '</div>' +
      '<button class="link-btn home-snd" id="b-sound"></button>' +
      (hall.length ? '<div class="eyebrow" style="margin-top:8px">Hall da Fama</div><div class="hall">' +
        hall.map(h => '<div><b>' + h.grade + '</b><span>' + esc(h.name) + ' · ' + esc(h.verdict) + '<br><small>' + (h.pos === 'GOL' ? h.cs + ' sem sofrer gol · ' + h.penSaved + ' pên. def. · ' : h.pos === 'ZAG' ? h.goals + ' gols · ' + h.cs + ' sem sofrer gol · ' : h.goals + ' gols · ' + h.assists + ' assist. · ') + h.titles + ' taças' + (h.ballon ? ' · ' + h.ballon + ' Bola' + (h.ballon > 1 ? 's' : '') + ' de Ouro' : '') + '</small></span><span class="muted">' + h.score + '</span></div>').join('') + '</div>' : '')
    );
    if ($('b-cont')) $('b-cont').onclick = () => {
      G.c = saved.c;
      // saves de antes dos investimentos
      G.c.inv = G.c.inv || {}; G.c.buys = G.c.buys || 0; G.c.spent = G.c.spent || 0;
      G.c.leagueOf = G.c.leagueOf || {}; G.c.clubBoost = G.c.clubBoost || {};
      S.applyLeagues(G.c); // quem subiu e quem caiu nesta carreira
      resume(saved.step);
    };
    $('b-new').onclick = create;
    $('b-ach').onclick = U.achievements;
    $('b-rank').onclick = () => U.ranking();
    $('b-col').onclick = U.collection;
    $('b-cloud').onclick = () => U.cloud('login');
    $('b-daily').onclick = () => { if (!saved || !saved.c) return U.dailyStart(); U.ask('Começar a carreira do dia?', 'A carreira em andamento será substituída.', 'Começar', U.dailyStart); };
    const snd = $('b-sound');
    if (snd) { snd.innerHTML = U.ICON.gear + ' Configurações'; snd.onclick = U.settings; }
    // A bola 3D espera o módulo 3D terminar de carregar (na primeira visita ele chega depois da tela)
    const mountBall = n => { const el = $('ball3d'); if (!el || !U.cfg.fx3d) return; if (window.CRAQUE_BALL) window.CRAQUE_BALL.mount(el); else if (n > 0) setTimeout(() => mountBall(n - 1), 250); };
    mountBall(24);
  }

  function resume(st) {
    G.step = st;
    bar();
    if (!G.c.club) return U.academy();
    if (st === 'wc') return U.wcIntro(); // Copa antes de tudo (pode ser a última dança)
    if (st === 'cwc') return U.cwcIntro();
    if (S.mustRetire(G.c)) return U.finale();
    if (st === 'offers') return S.windowOpen(G.c) ? U.windowOffers() : U.preseason();
    if (st === 'squad') return U.squad();
    if (st === 'event') return U.eventScreen();
    if (st === 'invest') return U.invest();
    if (st === 'moment') return U.momentOrSeason();
    return U.preseason();
  }

  // ---------- criação ----------
  function create() {
    const i = Math.floor(Math.random() * D.NICKNAMES.length);
    const st = { pos: 'ATA', foot: 'D', country: 'Brasil', look: { skin: Math.floor(Math.random() * 5), hair: 'curto', hc: 0, beard: 'nenhuma' } };
    const BEARD_NAME = { nenhuma: 'Sem barba', rala: 'Rala', bigode: 'Bigode', cavanhaque: 'Cavanhaque', cheia: 'Cheia' };
    const HAIR_NAME = { curto: 'Curto', raspado: 'Raspado', black: 'Black', moicano: 'Moicano', longo: 'Longo', careca: 'Careca' };
    // Tudo numa tela: a carta no centro (foto, nome, número e bandeira) e as escolhas embaixo
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">Nova carreira · quem é o garoto?</div>' +
      '<div class="cc"><div class="cc-top"><input class="cc-num" id="f-num" type="number" inputmode="numeric" min="1" max="99" value="9" aria-label="Número da camisa">' +
      '<span class="cc-pos" id="cc-pos">ATA</span><span class="cc-flag" id="cc-flag"></span></div>' +
      '<button type="button" class="cc-photo" id="look-pv" aria-label="Mudar o visual"></button>' +
      '<input class="cc-name" id="f-name" maxlength="18" value="' + D.NICKNAMES[i] + '" aria-label="Nome na camisa"></div>' +
      '<p class="cc-hint">Toque no nome ou no número para editar · no jogador para mudar o visual</p>' +
      '<div class="look-panel" id="look-panel" hidden>' +
      '<div class="look-row" id="f-skin">' + U.SKIN.map((c, j) => '<button data-v="' + j + '" style="background:' + c + '" aria-label="Pele ' + (j + 1) + '"></button>').join('') + '</div>' +
      '<div class="look-row txt" id="f-hair">' + U.HAIRS.map(h => '<button data-v="' + h + '">' + HAIR_NAME[h] + '</button>').join('') + '</div>' +
      '<div class="look-row txt" id="f-beard">' + U.BEARDS.map(h => '<button data-v="' + h + '">' + BEARD_NAME[h] + '</button>').join('') + '</div>' +
      '<div class="look-row" id="f-hc">' + U.HAIR_COLORS.map((c, j) => '<button data-v="' + j + '" style="background:' + c + '" aria-label="Cor do cabelo ' + (j + 1) + '"></button>').join('') + '</div></div>' +
      '<div class="seg pos4" id="f-pos"><button data-v="ATA" class="on">Atacante</button><button data-v="MEI">Meia</button><button data-v="ZAG">Zagueiro</button><button data-v="GOL">Goleiro</button></div>' +
      '<div class="seg" id="f-foot"><button data-v="D" class="on">Destro</button><button data-v="E">Canhoto</button></div>' +
      '<div class="seg flags one-line" id="f-country">' + D.COUNTRIES.map((k, j) => '<button data-v="' + k.id + '"' + (j ? '' : ' class="on"') + ' aria-label="' + k.id + '">' + k.flag + '</button>').join('') + '</div>' +
      '<button class="btn" id="b-go">Começar carreira</button>'
    );
    $('look-pv').onclick = () => { const lp = $('look-panel'); lp.hidden = !lp.hidden; };
    // Prévia da foto do jornal com a camisa da seleção escolhida
    const lookPv = () => {
      $('cc-pos').textContent = st.pos;
      $('cc-flag').textContent = (D.COUNTRIES.find(k => k.id === st.country) || {}).flag || '';
      $('look-pv').innerHTML = U.photo('normal', U.nationKit(st.country), { name: $('f-name').value || 'x', pos: st.pos, number: +$('f-num').value || 9, look: st.look });
      [['f-skin', 'skin'], ['f-hair', 'hair'], ['f-beard', 'beard'], ['f-hc', 'hc']].forEach(([id, k]) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', String(st.look[k]) === b.dataset.v)));
      $('f-hc').classList.toggle('off', st.look.hair === 'careca' && st.look.beard === 'nenhuma');
    };
    [['f-skin', 'skin', Number], ['f-hair', 'hair', String], ['f-beard', 'beard', String], ['f-hc', 'hc', Number]].forEach(([id, k, cast]) =>
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => { st.look[k] = cast(b.dataset.v); lookPv(); }));
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) => {
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
        // Número padrão acompanha a posição até a pessoa escolher um
        if (key === 'pos' && !numTouched) $('f-num').value = D.POS_NUM[b.dataset.v];
        lookPv();
      });
    });
    let numTouched = false;
    lookPv();
    $('b-back-home').onclick = home;
    $('f-num').oninput = () => { numTouched = true; lookPv(); };
    $('f-name').oninput = lookPv;
    $('b-go').onclick = () => {
      const name = $('f-name').value.trim() || D.NICKNAMES[i];
      const number = Math.max(1, Math.min(99, parseInt($('f-num').value, 10) || D.POS_NUM[st.pos]));
      G.c = S.newCareer({ name, pos: st.pos, foot: st.foot, country: st.country, number });
      G.c.look = st.look;
      U.academy();
    };
  }

  Object.assign(U, { home, resume, create });
})();
