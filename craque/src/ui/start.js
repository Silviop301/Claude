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
      (saved && saved.c ? '<button class="btn" id="b-cont">Continuar carreira de ' + esc(saved.c.name) + '</button>' : '') +
      '<button class="btn' + (saved && saved.c ? ' ghost' : '') + '" id="b-new">Nova carreira</button>' +
      U.dailyCard() +
      '<button class="btn ghost" id="b-ach">🏅 Conquistas <b>' + U.achCount() + '/' + S.ACHIEVEMENTS.length + '</b></button>' +
      '<button class="btn ghost small-btn" id="b-sound"></button>' +
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
    $('b-daily').onclick = () => { if (!saved || !saved.c || confirm('Começar a carreira do dia? A carreira em andamento será substituída.')) U.dailyStart(); };
    const snd = $('b-sound');
    const sndTxt = () => { snd.textContent = window.CRAQUE_SFX && window.CRAQUE_SFX.on ? '🔊 Som ligado' : '🔇 Som desligado'; };
    if (snd) { sndTxt(); snd.onclick = () => { if (window.CRAQUE_SFX) window.CRAQUE_SFX.toggle(); sndTxt(); }; }
    if (window.CRAQUE_BALL) window.CRAQUE_BALL.mount($('ball3d'));
  }

  function resume(st) {
    G.step = st;
    bar();
    if (!G.c.club) return U.academy();
    if (st === 'wc') return U.wcIntro(); // Copa antes de tudo (pode ser a última dança)
    if (S.mustRetire(G.c)) return U.finale();
    if (st === 'offers') return S.windowOpen(G.c) ? U.windowOffers() : U.preseason();
    if (st === 'event') return U.eventScreen();
    if (st === 'invest') return U.invest();
    if (st === 'moment') return U.momentOrSeason();
    return U.preseason();
  }

  // ---------- criação ----------
  function create() {
    const i = Math.floor(Math.random() * D.NICKNAMES.length);
    const st = { pos: 'ATA', foot: 'D', country: 'Brasil', look: { skin: Math.floor(Math.random() * 5), hair: 'curto', hc: 0 } };
    const HAIR_NAME = { curto: 'Curto', raspado: 'Raspado', black: 'Black', moicano: 'Moicano', longo: 'Longo', careca: 'Careca' };
    render(
      '<div class="eyebrow">Nova carreira</div><h2>Quem é o garoto?</h2>' +
      '<div class="field"><label for="f-name">Nome na camisa</label><input id="f-name" maxlength="18" value="' + D.NICKNAMES[i] + '"></div>' +
      '<div class="field"><label>Posição</label><div class="seg pos4" id="f-pos"><button data-v="ATA" class="on">Atacante</button><button data-v="MEI">Meia</button><button data-v="ZAG">Zagueiro</button><button data-v="GOL">Goleiro</button></div></div>' +
      '<div class="field"><label for="f-num">Número da camisa</label><div class="num-pick"><input id="f-num" type="number" inputmode="numeric" min="1" max="99" value="9">' +
      [7, 9, 10, 11, 99].map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>Pé bom</label><div class="seg" id="f-foot"><button data-v="D" class="on">Destro</button><button data-v="E">Canhoto</button></div></div>' +
      '<div class="field"><label>País</label><div class="seg flags" id="f-country">' + D.COUNTRIES.map((k, j) => '<button data-v="' + k.id + '"' + (j ? '' : ' class="on"') + ' aria-label="' + k.id + '">' + k.flag + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>Visual <small>(aparece nas fotos do jornal)</small></label><div class="look"><div class="look-pv" id="look-pv"></div><div class="look-opts">' +
      '<div class="look-row" id="f-skin">' + U.SKIN.map((c, j) => '<button data-v="' + j + '" style="background:' + c + '" aria-label="Pele ' + (j + 1) + '"></button>').join('') + '</div>' +
      '<div class="look-row txt" id="f-hair">' + U.HAIRS.map(h => '<button data-v="' + h + '">' + HAIR_NAME[h] + '</button>').join('') + '</div>' +
      '<div class="look-row" id="f-hc">' + U.HAIR_COLORS.map((c, j) => '<button data-v="' + j + '" style="background:' + c + '" aria-label="Cor do cabelo ' + (j + 1) + '"></button>').join('') + '</div>' +
      '</div></div></div>' +
      '<button class="btn" id="b-go">Começar carreira</button>'
    );
    // Prévia da foto do jornal com a camisa da seleção escolhida
    const lookPv = () => {
      $('look-pv').innerHTML = U.photo('normal', U.nationKit(st.country), { name: $('f-name').value || 'x', pos: st.pos, number: +$('f-num').value || 9, look: st.look });
      [['f-skin', 'skin'], ['f-hair', 'hair'], ['f-hc', 'hc']].forEach(([id, k]) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', String(st.look[k]) === b.dataset.v)));
      $('f-hc').classList.toggle('off', st.look.hair === 'careca');
    };
    [['f-skin', 'skin', Number], ['f-hair', 'hair', String], ['f-hc', 'hc', Number]].forEach(([id, k, cast]) =>
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
    $('f-num').oninput = () => { numTouched = true; };
    screen.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { $('f-num').value = b.dataset.n; numTouched = true; });
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
