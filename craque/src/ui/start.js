// Interface — tela inicial e criação do jogador
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- início ----------
  function home() {
    G.c = null; G.step = null; bar();
    const saved = load(SAVE);
    const hall = load(HALL) || [];
    // Título de abertura (já desenhado pelo index.html antes dos scripts): a tela inicial reaproveita o mesmo
    // elemento em vez de criar outro, para a primeira tela não "piscar" nem contar de novo como carregamento
    const splash = document.querySelector('#screen > .hero.splash');
    render(
      '<div class="hero"><div class="ball3d" id="ball3d" aria-hidden="true"></div><div class="eyebrow">Carreira de futebol</div><h1>CLIMBIX</h1></div>' +
      '<p class="lead">Crie um garoto de 16 anos, escolha propostas, monte o estilo dele e descubra se ele vira lenda.</p>' +
      // Carreira em andamento: a carta do jogador no lugar de um botão de texto
      (saved && saved.c ? (() => { const sc = saved.c, o = S.ovr(sc), t = tierCls(o), cl = club(sc.club);
        return '<button class="cont-card" id="b-cont"><span class="scard metal ' + t + '"><span class="sc-tier">' + TIER_NAME[t] + '</span><b>' + o + '</b><span class="sc-pos">' + sc.pos + '</span></span>' +
          '<span class="cc-info"><small>Continuar carreira</small><b>' + esc(sc.name) + '</b><span>' + (cl ? crest(cl.id, 'xs') + esc(cl.name) + ' · ' : '') + sc.age + ' anos</span></span><span class="cc-go">' + U.ICON['chevron-right'] + '</span></button>'; })() : '') +
      '<button class="btn' + (saved && saved.c ? ' ghost' : '') + '" id="b-new">Nova carreira</button>' +
      U.dailyCard() +
      U.salaHome() +
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
      G.c.inv = G.c.inv || {}; G.c.buys = G.c.buys || 0;
      if (G.c.pe === undefined) G.c.pe = S.PE_START; // saves de antes dos pontos de evolução
      G.c.leagueOf = G.c.leagueOf || {}; G.c.clubBoost = G.c.clubBoost || {};
      S.applyLeagues(G.c); // quem subiu e quem caiu nesta carreira
      resume(saved.step);
    };
    $('b-new').onclick = create;
    $('b-ach').onclick = U.achievements;
    $('b-rank').onclick = () => U.ranking();
    $('b-col').onclick = U.collection;
    $('b-sala').onclick = () => U.trophyRoom('col');
    $('b-cloud').onclick = () => U.cloud('login');
    $('b-daily').onclick = () => { if (!saved || !saved.c) return U.dailyStart(); U.ask('Começar a carreira do dia?', 'A carreira em andamento será substituída.', 'Começar', U.dailyStart); };
    const snd = $('b-sound');
    if (snd) { snd.innerHTML = U.emo('⚙️', 'xs') + ' Configurações'; snd.onclick = U.settings; }
    // A bola 3D espera o módulo 3D terminar de carregar (na primeira visita ele chega depois da tela)
    const hero = splash && screen.querySelector('.hero');
    if (hero) { splash.classList.remove('splash'); splash.querySelector('.ball3d').id = 'ball3d'; hero.replaceWith(splash); }
    const mountBall = () => { const el = $('ball3d'); if (el && U.cfg.fx3d && window.CRAQUE_BALL) window.CRAQUE_BALL.mount(el); };
    if (window.CRAQUE_BALL) mountBall(); else addEventListener('craque-ball-ready', mountBall, { once: true });
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
  // ---------- nova carreira: passo 1 (quem é) e passo 2 (como ele é) ----------
  // Prancha "Criação do personagem": o passo 2 mostra o jogador grande e, ao lado, como ele sai no jornal.
  const A = window.ClimbixAvatar;
  const BASIC = ['preto', 'branco', 'vermelho', 'azul', 'neon', 'rosa', 'laranja', 'amarelo'];
  const GEAR_NAME = { preto: 'Preta', branco: 'Branca', vermelho: 'Vermelha', azul: 'Azul', neon: 'Verde neon', rosa: 'Rosa', laranja: 'Laranja', amarelo: 'Amarela', ouro: 'Ouro', holo: 'Holográfica', lima: 'Lima' };
  const HAIR_NAME = { curto: 'Curto', raspado: 'Raspado', topete: 'Topete', black: 'Black', trancas: 'Tranças', dreads: 'Dreads', moicano: 'Moicano', longo: 'Longo', careca: 'Careca' };
  const BEARD_NAME = { nenhuma: 'Sem barba', rala: 'Rala', bigode: 'Bigode', cavanhaque: 'Cavanhaque', cheia: 'Cheia' };
  const TAT = [['nenhuma', 'Nenhuma'], ['pequena', 'Pequena'], ['fechado', 'Fechada']];
  // Chuteira e sola de ouro / holográfica: liberadas por conquistas em qualquer carreira (só visual)
  function lockedGear() {
    const col = load('climbix-colecao-v1') || [], ach = load('craque-ach-v1') || {};
    const sp = new Set(col.flatMap(e => (e.specials || []).map(d => d && d.special)));
    const out = {};
    if (!sp.has('chuteira')) out.ouro = 'Ganhe a Chuteira de Ouro numa carreira para liberar.';
    if (!ach.ouro && !sp.has('bola')) out.holo = 'Ganhe a Bola de Ouro numa carreira para liberar.';
    return out;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function create(prev) {
    const st = prev && prev.look ? prev : { pos: 'ATA', foot: 'D', country: 'Brasil', num: 9, numTouched: false, name: D.NICKNAMES[Math.floor(Math.random() * D.NICKNAMES.length)],
      tab: 'corpo', look: Object.assign({}, A.DEF, { v: 2, skin: Math.floor(Math.random() * A.SKIN.length) }) };
    const cty = () => D.COUNTRIES.find(k => k.id === st.country) || D.COUNTRIES[0];
    const who = () => ({ name: st.name, pos: st.pos, number: st.num, look: st.look });
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">Nova carreira · 1 de 2</div><h2 class="cr-title">Quem é o garoto?</h2>' +
      '<div class="cc"><div class="cc-top"><input class="cc-num" id="f-num" type="number" inputmode="numeric" min="1" max="99" value="' + st.num + '" aria-label="Número da camisa">' +
      '<span class="cc-pos" id="cc-pos"></span><span class="cc-flag" id="cc-flag"></span></div>' +
      '<div class="cc-photo" id="cc-photo"></div>' +
      '<input class="cc-name" id="f-name" maxlength="18" value="' + esc(st.name) + '" aria-label="Nome na camisa"></div>' +
      '<p class="cc-hint">Toque no número ou no nome para editar</p>' +
      '<div class="cr-lbl">Posição</div><div class="seg pos4" id="f-pos">' + [['ATA', 'Atacante'], ['MEI', 'Meia'], ['ZAG', 'Zagueiro'], ['GOL', 'Goleiro']].map(([v, l]) => '<button data-v="' + v + '"' + (st.pos === v ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<div class="cr-lbl">Pé bom</div><div class="seg" id="f-foot"><button data-v="D"' + (st.foot === 'D' ? ' class="on"' : '') + '>Destro</button><button data-v="E"' + (st.foot === 'E' ? ' class="on"' : '') + '>Canhoto</button></div>' +
      '<div class="cr-lbl">País · <b id="cr-cty"></b></div><div class="cr-flags" id="f-country">' + D.COUNTRIES.map(k => '<button data-v="' + k.id + '"' + (k.id === st.country ? ' class="on"' : '') + ' aria-label="' + k.id + '">' + U.flag(k.flag, 'sm') + '</button>').join('') + '</div>' +
      '<div class="inv-bar"><button class="btn" id="b-next1">Próximo: o visual</button></div>'
    );
    const paint = () => {
      $('cc-pos').textContent = st.pos;
      $('cc-flag').innerHTML = U.flag(cty().flag);
      $('cr-cty').textContent = cty().id;
      $('cc-photo').innerHTML = U.photo('normal', U.nationKit(st.country), who(), { num: String(st.num) });
    };
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) =>
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
        // Número padrão acompanha a posição até a pessoa escolher um
        if (key === 'pos' && !st.numTouched) { st.num = D.POS_NUM[b.dataset.v]; $('f-num').value = st.num; }
        paint();
      }));
    $('f-num').oninput = () => { st.numTouched = true; st.num = Math.max(1, Math.min(99, parseInt($('f-num').value, 10) || D.POS_NUM[st.pos])); paint(); };
    $('f-name').oninput = () => { st.name = $('f-name').value; };
    $('b-back-home').onclick = home;
    $('b-next1').onclick = () => { st.name = $('f-name').value.trim() || st.name; looks(st); };
    paint();
  }

  function looks(st) {
    const lk = st.look, kit = U.nationKit(st.country);
    const who = () => ({ name: st.name, pos: st.pos, number: st.num, look: lk });
    let msg = '';
    const draw = () => {
      const lock = lockedGear();
      const sw = (key, list, bgOf, names) => '<div class="cr-sw">' + list.map((v, i) => {
        const locked = !!lock[v], on = !locked && String(lk[key]) === String(v);
        return '<button data-k="' + key + '" data-v="' + v + '"' + (locked ? ' data-lock="1"' : '') + ' class="' + (on ? 'on' : '') + (locked ? ' lock' : '') + '" aria-label="' + esc(names ? names[i] : GEAR_NAME[v]) + '">' +
          '<i style="background:' + bgOf(v) + '"></i>' + (locked ? U.emo('🔒', 'xs') : '') + '</button>';
      }).join('') + '</div>';
      const gearBg = v => A.SWATCH[v] || A.GEAR[v];
      const chip = (key, list) => '<div class="cr-chips">' + list.map(([v, l]) => '<button data-k="' + key + '" data-v="' + v + '"' + (String(lk[key]) === v ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>';
      const row = (label, value, body, key) => '<div class="cr-row"><div class="cr-lbl">' + label + (value ? ' <b>' + esc(value) + '</b>' : '') + '</div>' + body +
        (msg && key && msg.startsWith(key + ':') ? '<p class="cr-lock">' + U.emo('🔒', 'xs') + ' ' + esc(msg.slice(key.length + 1)) + '</p>' : '') + '</div>';
      const tv = k => lk['tat' + k] || 'nenhuma';
      const note = k => (tv(k) === 'nenhuma' ? '' : k[0] === 'B' && lk.sleeve === 'comprida' ? 'coberta pela manga comprida' : k[0] === 'P' && tv(k) === 'fechado' && lk.sock === 'alto' ? 'aparece mais com meião arriado' : '');
      let rows = '';
      if (st.tab === 'corpo') rows = row('Pele', '', sw('skin', A.SKIN.map((_, i) => i), i => A.SKIN[i], A.SKIN.map((_, i) => 'Tom ' + (i + 1)))) +
        row('Barba', '', chip('beard', A.BEARDS.map(b => [b, BEARD_NAME[b]]))) +
        [['BD', 'braço direito'], ['BE', 'braço esquerdo'], ['PD', 'perna direita'], ['PE', 'perna esquerda']].map(([k, l]) => row('Tatuagem · ' + l, note(k), chip('tat' + k, TAT))).join('');
      if (st.tab === 'cabelo') rows = row('Corte', '', chip('hair', A.HAIRS.map(h => [h, HAIR_NAME[h]]))) +
        row('Cor do cabelo e da barba', '', sw('hc', A.HAIR_COLORS.map((_, i) => i), i => A.HAIR_COLORS[i], ['Preto', 'Castanho', 'Loiro', 'Ruivo', 'Grisalho'])) +
        row('Faixa', '', chip('band', [['nenhuma', 'Nenhuma'], ['faixa', 'Faixa'], ['tiara', 'Tiara']])) +
        (lk.band !== 'nenhuma' ? row('Cor da faixa', GEAR_NAME[lk.bandC], sw('bandC', BASIC, gearBg)) : '');
      if (st.tab === 'equip') rows = row('Chuteira', GEAR_NAME[lk.boot], sw('boot', BASIC.concat(['ouro', 'holo']), gearBg), 'boot') +
        row('Sola', GEAR_NAME[lk.sole], sw('sole', BASIC.concat(['ouro', 'holo']), gearBg), 'sole') +
        row('Meião', '', chip('sock', [['alto', 'Alto'], ['arriado', 'Arriado']])) +
        row('Manga', '', chip('sleeve', [['curta', 'Curta'], ['comprida', 'Comprida']])) +
        row('Munhequeira', '', chip('wrist', [['nenhuma', 'Nenhuma'], ['uma', 'Uma'], ['duas', 'Duas']])) +
        (lk.wrist !== 'nenhuma' ? row('Cor da munhequeira', GEAR_NAME[lk.wristC], sw('wristC', BASIC, gearBg)) : '') +
        (st.pos === 'GOL' ? row('Luva', GEAR_NAME[lk.glove], sw('glove', ['lima'].concat(BASIC), gearBg)) : '');
      $('cr-rows').innerHTML = rows;
      $('cr-big').innerHTML = U.photo('normal', kit, who(), { crop: true, flat: true, num: String(st.num) });
      $('cr-paper').innerHTML = U.photo('normal', kit, who(), { num: String(st.num) });
      $('cr-joy').innerHTML = U.photo('celebra', kit, who(), { num: String(st.num) });
      screen.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === st.tab));
      $('cr-rows').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k, v = b.dataset.v;
        if (b.dataset.lock) { msg = k + ':' + lockedGear()[v]; return draw(); }
        msg = '';
        lk[k] = ['skin', 'hc'].includes(k) ? +v : v;
        draw();
      });
    };
    render(
      '<div class="cr-top"><button class="back-link" id="b-back1">‹ Voltar</button><button class="cr-dice" id="b-dice">' + U.emo('🎲', 'sm') + ' Sortear</button></div>' +
      '<div class="eyebrow">Nova carreira · 2 de 2</div><h2 class="cr-title">Como ele é?</h2>' +
      '<div class="cr-stage"><div class="cr-big" id="cr-big"></div><div class="cr-side"><div class="cr-lbl">No jornal</div><div class="cr-clip" id="cr-paper"></div>' +
      '<div class="cr-lbl">Comemorando</div><div class="cr-clip" id="cr-joy"></div></div></div>' +
      '<div class="cr-tabs">' + [['corpo', 'Corpo'], ['cabelo', 'Cabelo'], ['equip', 'Equipamento']].map(([k, l]) => '<button data-tab="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<div class="cr-rows" id="cr-rows"></div>' +
      '<div class="inv-bar"><button class="btn" id="b-go">Começar carreira</button></div>'
    );
    screen.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; msg = ''; draw(); });
    $('b-back1').onclick = () => create(st);
    // Sortear: um visual inteiro de uma vez (só com as peças liberadas)
    $('b-dice').onclick = () => {
      const lock = lockedGear(), gear = BASIC.filter(x => !lock[x]);
      const t = () => pick(['nenhuma', 'nenhuma', 'pequena', 'fechado']), tl = () => pick(['nenhuma', 'nenhuma', 'nenhuma', 'pequena', 'fechado']);
      Object.assign(lk, { skin: Math.floor(Math.random() * A.SKIN.length), hair: pick(A.HAIRS), hc: pick([0, 0, 1, 1, 2, 3, 4]), beard: pick(A.BEARDS),
        band: pick(['nenhuma', 'nenhuma', 'faixa', 'tiara']), bandC: pick(gear), tatBD: t(), tatBE: t(), tatPD: tl(), tatPE: tl(),
        boot: pick(gear), sole: pick(gear), sock: pick(['alto', 'arriado']), sleeve: pick(['curta', 'curta', 'comprida']), wrist: pick(['nenhuma', 'uma', 'duas']), wristC: pick(gear) });
      msg = ''; sfx('tap'); draw();
    };
    $('b-go').onclick = () => {
      G.c = S.newCareer({ name: st.name.trim() || 'Craque', pos: st.pos, foot: st.foot, country: st.country, number: st.num });
      G.c.look = Object.assign({ v: 2 }, lk);
      U.academy();
    };
    draw();
  }

  Object.assign(U, { home, resume, create });
})();
