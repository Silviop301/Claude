// Interface — tela inicial e criação do jogador
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- início ----------
  function home() {
    G.c = null; G.step = null; bar();
    const saved = load(SAVE);
    const played = !!(saved && saved.c) || U.collectionCount() > 0 || (load(HALL) || []).length > 0;
    // Título de abertura (já desenhado pelo index.html antes dos scripts): a tela inicial reaproveita o mesmo
    // elemento em vez de criar outro, para a primeira tela não "piscar" nem contar de novo como carregamento
    const splash = document.querySelector('#screen > .hero.splash');
    render(
      '<div class="hero"><div class="ball3d" id="ball3d" aria-hidden="true"></div><div class="eyebrow">Carreira de futebol</div><h1>CLIMBIX</h1></div>' +
      '<p class="lead">Uma carreira inteira em uns 9 minutos: crie um garoto de 16 anos, escolha os clubes, decida e cobre os lances. No fim, a carta dele diz se virou lenda.</p>' +
      U.challengeHome() +
      // Carreira em andamento: a carta do jogador no lugar de um botão de texto
      (saved && saved.c ? (() => { const sc = saved.c, o = S.ovr(sc), t = tierCls(o), cl = club(sc.club);
        return '<button class="cont-card" id="b-cont"><span class="scard metal ' + t + '"><span class="sc-tier">' + TIER_NAME[t] + '</span><b>' + o + '</b><span class="sc-pos">' + sc.pos + '</span></span>' +
          '<span class="cc-info"><small>Continuar carreira</small><b>' + esc(sc.name) + '</b><span>' + (cl ? crest(cl.id, 'xs') + esc(cl.name) + ' · ' : '') + sc.age + ' anos</span></span><span class="cc-go">' + U.ICON['chevron-right'] + '</span></button>'; })() : '') +
      '<button class="btn' + (saved && saved.c ? ' ghost' : '') + '" id="b-new">Nova carreira</button>' +
      U.rankHome() +
      // Primeira visita: sequência de dias e pedido de opinião só depois de existir uma carreira (fichas e pacotinhos ainda não querem dizer nada)
      (played ? U.streakHome() : '') +
      U.packHome() +
      // Coleção, Sala de Troféus, Conquistas e Hall da Fama ficam numa tela só
      '<button class="hg mine-btn" id="b-mine"><i>' + U.ICON.cards + '</i><b>Minhas carreiras</b><small>' + U.collectionCount() + (U.collectionCount() === 1 ? ' carreira' : ' carreiras') +
        (U.salaNew() ? ' · <em>+' + U.salaNew() + (U.salaNew() === 1 ? ' taça nova' : ' taças novas') + '</em>' : '') + '</small></button>' +
      (played ? U.feedbackHome() : '') +
      '<div class="home-foot"><button class="link-btn home-snd" id="b-sound"></button><button class="link-btn home-snd" id="b-cloud"></button></div>' + U.deskHint()
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
    U.backTo = null;
    $('b-new').onclick = () => create();
    U.packHomeBind();
    U.streakBind(U.home); // pegou um pacotinho da sequência: a tela redesenha com o bloco de pacotinhos
    $('b-mine').onclick = mine;
    U.challengeHomeBind();
    if ($('b-opiniao')) $('b-opiniao').onclick = () => U.feedback('inicio', {}, home);
    $('b-rank').onclick = () => U.ranking();
    $('b-cloud').innerHTML = U.emo('☁️', 'xs') + ' ' + esc(U.cloudName());
    $('b-cloud').onclick = () => U.cloud('login');
    const snd = $('b-sound');
    if (snd) { snd.innerHTML = U.emo('⚙️', 'xs') + ' Configurações'; snd.onclick = U.settings; }
    // A bola 3D espera o módulo 3D terminar de carregar (na primeira visita ele chega depois da tela)
    const hero = splash && screen.querySelector('.hero');
    if (hero) { splash.classList.remove('splash'); splash.querySelector('.ball3d').id = 'ball3d'; hero.replaceWith(splash); }
    const mountBall = () => { const el = $('ball3d'); if (el && U.cfg.fx3d && window.CRAQUE_BALL) window.CRAQUE_BALL.mount(el); };
    if (window.CRAQUE_BALL) mountBall(); else addEventListener('craque-ball-ready', mountBall, { once: true });
    if (U.whatsNew) U.whatsNew();
  }

  // Minhas carreiras: tudo o que ficou das carreiras encerradas (as telas daqui voltam para cá)
  function mine() {
    G.c = null; G.step = null; bar();
    U.backTo = mine;
    const hall = load(HALL) || [];
    render('<button class="back-link" id="b-back-home">‹ Início</button><div class="eyebrow">Suas carreiras</div><h2>Minhas carreiras</h2>' +
      U.salaHome() +
      '<div class="home-grid">' +
      '<button class="hg" id="b-col"><i>' + U.ICON.cards + '</i><b>Coleção</b><small>' + U.collectionCount() + (U.collectionCount() === 1 ? ' carta' : ' cartas') + '</small></button>' +
      '<button class="hg" id="b-ach"><i>' + U.ICON.medal + '</i><b>Conquistas</b><small>' + U.achCount() + ' de ' + S.ACHIEVEMENTS.length + '</small></button>' +
      '</div>' +
      (hall.length ? '<div class="eyebrow" style="margin-top:8px">Hall da Fama</div><div class="hall">' +
        hall.map(h => '<div><b>' + h.grade + '</b><span>' + esc(h.name) + ' · ' + esc(h.verdict) + '<br><small>' + (h.pos === 'GOL' ? h.cs + ' sem sofrer gol · ' + h.penSaved + ' pên. def. · ' : h.pos === 'ZAG' ? D.plural(h.goals, 'gol', 'gols') + ' · ' + h.cs + ' sem sofrer gol · ' : D.plural(h.goals, 'gol', 'gols') + ' · ' + h.assists + ' assist. · ') + D.plural(h.titles, 'taça', 'taças') + (h.ballon ? ' · ' + h.ballon + ' Bola' + (h.ballon > 1 ? 's' : '') + ' de Ouro' : '') + '</small></span><span class="muted">' + h.score + '</span></div>').join('') + '</div>'
        : '<p class="muted small">Termine uma carreira para ela aparecer aqui.</p>'));
    $('b-back-home').onclick = home;
    $('b-col').onclick = U.collection;
    $('b-ach').onclick = U.achievements;
    $('b-sala').onclick = () => U.trophyRoom('col');
  }
  // Voltar das telas de "Minhas carreiras" (Coleção, Conquistas, Sala): volta para lá; senão, para o início
  U.goBack = () => (U.backTo || home)();

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
  const A = window.ClimbixAvatar, I = U.ITEMS;
  const BASIC = ['preto', 'branco', 'vermelho', 'azul', 'neon', 'rosa', 'laranja', 'amarelo', 'roxo', 'vinho', 'cinza', 'musgo', 'celeste', 'bege'];
  const GEAR_NAME = { preto: 'Preta', branco: 'Branca', vermelho: 'Vermelha', azul: 'Azul', neon: 'Verde neon', rosa: 'Rosa', laranja: 'Laranja', amarelo: 'Amarela', ouro: 'Ouro', holo: 'Holográfica', lima: 'Lima', roxo: 'Roxa', vinho: 'Vinho', cinza: 'Cinza', musgo: 'Verde-musgo', celeste: 'Azul-bebê', bege: 'Bege', prata: 'Prata', cromo: 'Cromada',
    camuflada: 'Camuflada', raio: 'De raio', chamas: 'Em chamas', tigre: 'Tigrada',
    bicolor: 'Bicolor', listrada: 'Listrada', pontilhada: 'Pontilhada', galaxia: 'Galáxia', camoneon: 'Camuflada neon', onca: 'Onça', brasil: 'Brasil', cristal: 'Cristal',
    velcro: 'Com velcro', dedos: 'Dedos coloridos', luvafogo: 'De fogo', luvaouro: 'Dourada' };
  const HAIR_NAME = { curto: 'Curto', raspado: 'Raspado', topete: 'Topete', black: 'Black', trancas: 'Tranças', dreads: 'Dreads', moicano: 'Moicano', longo: 'Longo', careca: 'Careca',
    social: 'Social', franja: 'Franja', militar: 'Militar', cacheado: 'Cacheado', undercut: 'Undercut', degrade: 'Degradê', samurai: 'Samurai', afro: 'Black power',
    mullet: 'Mullet', riscado: 'Com desenho', trancalonga: 'Tranças longas', moicanoloiro: 'Moicano loiro' };
  const BEARD_NAME = { nenhuma: 'Sem barba', rala: 'Rala', bigode: 'Bigode', cavanhaque: 'Cavanhaque', cheia: 'Cheia', porfazer: 'Por fazer', costeleta: 'Costeleta', lenhador: 'Lenhador', bigodao: 'Bigodão', trancada: 'Trançada' };
  const HC_NAME = ['Preto', 'Castanho', 'Loiro', 'Ruivo', 'Grisalho', 'Platinado', 'Azul', 'Rosa', 'Verde'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // Itens travados (pacotinhos, ui/items.js): o que falta liberar para usar um valor do visual
  const lockOf = (k, v) => { const id = I.need(k, v); return id && !I.has(id) ? I.itemOf(id) : null; };
  // Número padrão da posição, se liberado; senão o liberado mais perto
  const defNum = pos => D.POS_NUM[pos] || 10;
  // O visual do jogador é só pele, cabelo (corte e cor), barba e chuteira (cor e sola); o resto do desenho fica no padrão
  const LOOK_KEYS = ['skin', 'hair', 'hc', 'beard', 'boot', 'sole'];
  const onlyLook = l => { const o = { v: 2 }; LOOK_KEYS.forEach(k => { if (l && l[k] !== undefined) o[k] = l[k]; }); return o; };
  // Visual sorteado só com as peças liberadas (o dado da criação e a primeira carreira)
  const BOOTS = BASIC.concat(['prata', 'ouro', 'cromo', 'holo', 'bicolor', 'listrada', 'pontilhada', 'galaxia', 'camuflada', 'camoneon', 'onca', 'brasil', 'raio', 'chamas', 'cristal']);
  function rollLook(lk) {
    const p = (k, list) => pick(list.filter(v => !lockOf(k, v)));
    return Object.assign(lk, { skin: Math.floor(Math.random() * A.SKIN.length), hair: p('hair', A.HAIRS), hc: p('hc', [0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8]), beard: p('beard', A.BEARDS),
      boot: p('boot', BOOTS), sole: p('sole', BASIC) });
  }
  // O jogador volta com o visual da última carreira (sem o que não estiver mais liberado)
  const LAST = 'climbix-ultimo-visual';
  const lastLook = () => { const l = U.load(LAST); return l && typeof l === 'object' ? I.clean(Object.assign({}, I.FREE, onlyLook(l))) : null; };
  const newSt = () => ({ pos: 'ATA', foot: 'D', country: 'Brasil', num: defNum('ATA'), numTouched: false, name: D.NICKNAMES[Math.floor(Math.random() * D.NICKNAMES.length)],
    tab: 'corpo', origin: 'base', challenge: null, look: lastLook() || rollLook(Object.assign({}, I.FREE, { v: 2 })) });

  // Origem e desafio (engine/origins.js): liberados por conquistas
  const achName = id => (S.ACHIEVEMENTS.find(a => a.id === id) || {}).name || id;
  const optChips = (list, cur, kind, st) => '<div class="cr-chips">' + list.map(o => {
    const lock = !U.achHas(o.need), off = kind === 'challenge' && !S.challengeFits(o, st.country);
    return '<button data-' + kind + '="' + o.id + '" class="' + (cur === o.id ? 'on' : '') + (lock || off ? ' lock' : '') + '">' + (lock ? U.emo('🔒', 'xs') + ' ' : U.emo(o.icon, 'xs') + ' ') + esc(o.name) + '</button>';
  }).join('') + '</div>';
  function originRows(st) {
    const o = S.ORIGIN_BY_ID[st.origin], ch = S.CHALLENGE_BY_ID[st.challenge];
    return '<div class="cr-lbl">Origem · <b>' + esc(o.name) + '</b></div>' + optChips(S.ORIGINS, st.origin, 'origin', st) +
      '<p class="cr-desc">' + esc(o.desc) + '</p>' +
      '<div class="cr-lbl">Desafio · <b>' + (ch ? esc(ch.name) : 'nenhum') + '</b></div>' +
      optChips([{ id: '', icon: '➖', name: 'Nenhum' }].concat(S.CHALLENGES), st.challenge || '', 'challenge', st) +
      '<p class="cr-desc">' + (ch ? esc(ch.desc) : 'Sem regra extra. Um desafio cumprido soma pontos na nota final.') + '</p>';
  }
  function bindOrigin(st, redraw) {
    const note = (it, why) => { const el = $('cr-onote'); if (el) el.innerHTML = '<div class="cr-lock">' + U.emo('🔒', 'sm') + '<span><b>' + esc(it.name) + '</b> · ' + why + '</span></div>'; };
    screen.querySelectorAll('[data-origin]').forEach(b => b.onclick = () => {
      const it = S.ORIGIN_BY_ID[b.dataset.origin];
      if (!U.achHas(it.need)) return note(it, 'libere com a conquista "' + achName(it.need) + '"');
      st.origin = it.id; sfx('tap'); redraw();
    });
    screen.querySelectorAll('[data-challenge]').forEach(b => b.onclick = () => {
      const it = S.CHALLENGE_BY_ID[b.dataset.challenge];
      if (it && !U.achHas(it.need)) return note(it, 'libere com a conquista "' + achName(it.need) + '"');
      if (it && !S.challengeFits(it, st.country)) return note(it, 'só para quem nasceu fora da Europa');
      st.challenge = it ? it.id : null; sfx('tap'); redraw();
    });
  }
  // Lembrete na base e na janela: origem e desafio em andamento
  U.originNote = c => {
    const ch = S.CHALLENGE_BY_ID[c.challenge];
    if (!ch) return '';
    return '<p class="muted small ch-note">' + U.emo(ch.icon, 'xs') + ' Desafio ' + esc(ch.name) + (c.chFail ? ': quebrado' : ': valendo +' + ch.v + ' pts no fim') + '</p>';
  };

  // Número da camisa: os 99 livres; o estilo do número (dourado, neon...) sai nos pacotinhos
  function numSheet(st, onDone) {
    let sel = st.num, msg = '';
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    document.body.appendChild(w);
    const close = () => w.remove();
    const fx = [['', 'Normal'], ['contorno', 'Vazado'], ['neon', 'Neon'], ['ouro', 'Dourado'], ['holo', 'Holográfico'], ['fogo', 'Em chamas']];
    function draw() {
      w.innerHTML = '<div class="tr-sheet nb-sheet" role="dialog" aria-modal="true"><i class="tr-grab"></i><div class="tr-head"><b>Número da camisa</b></div>' +
        '<div class="nb-scroll"><div class="nb-sec first">Estilo do número</div><div class="cr-chips">' + fx.map(([v, l]) => { const it = v && !I.has('num-' + v) ? I.itemOf('num-' + v) : null;
          return '<button data-fx="' + v + '" class="' + ((st.look.numFx || '') === v ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + '">' + (it ? U.emo('🔒', 'xs') + ' ' : '') + l + '</button>'; }).join('') + '</div>' +
        '<div class="nb-sec">Número</div><div class="nb-grid">' + Array.from({ length: 99 }, (_, i) => i + 1).map(n => '<button class="nb-c on' + (sel === n ? ' sel' : '') + '" data-n="' + n + '" aria-label="Número ' + n + '">' + n + '</button>').join('') + '</div></div>' +
        (msg ? '<div class="lk-note in-sheet">' + msg + '</div>' : '') +
        '<button class="btn" id="nb-use">Usar o ' + sel + '</button></div>';
      w.querySelectorAll('.nb-c').forEach(b => b.onclick = () => { sel = +b.dataset.n; msg = ''; draw(); });
      w.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => {
        const v = b.dataset.fx, it = v && !I.has('num-' + v) ? I.itemOf('num-' + v) : null;
        if (!it) { st.look.numFx = v || undefined; msg = ''; return draw(); }
        msg = lockMsg(it); draw();
        bindNote(w, it, () => { st.look.numFx = v; msg = ''; draw(); }, () => { close(); U.openPacks(() => create(st)); });
      });
      w.querySelector('#nb-use').onclick = () => { st.num = sel; st.numTouched = true; close(); onDone(); };
    }
    w.onclick = e => { if (e.target === w) close(); };
    draw();
  }
  // Aviso de item travado: de onde sai e os atalhos (abrir pacotinhos, trocar fichas)
  function lockMsg(it) {
    const packs = I.get().packs.length;
    return '<span class="lk-ico">' + U.emo('🔒', 'sm') + '</span><div><b>' + esc(it.name) + ' · ' + I.RAR_NAME[it.rk] + '</b>' +
      '<small>Sai em pacotinhos.' + (packs ? ' Você tem ' + packs + ' para abrir.' : '') + '' + '</small>' +
      '<div class="lk-acts">' + (packs ? '<button class="lk-open">Abrir pacotinhos</button>' : '') + '<button class="lk-trade">Trocar ' + I.COST[it.rk] + ' ' + U.emo('🎟️', 'xs') + '</button></div></div>';
  }
  function bindNote(root, it, onTraded, onOpen) {
    const t = root.querySelector('.lk-trade'), o = root.querySelector('.lk-open');
    if (t) t.onclick = e => { e.stopPropagation(); U.tradeSheet(it.id, onTraded); };
    if (o) o.onclick = e => { e.stopPropagation(); onOpen(); };
  }

  function create(prev) {
    const st = prev && prev.look ? prev : newSt();
    const cty = () => D.COUNTRIES.find(k => k.id === st.country) || D.COUNTRIES[0];
    // Aos 16 anos: a barba escolhida só aparece quando ele crescer (avatar.beardAtAge)
    const who = () => ({ name: st.name, pos: st.pos, number: st.num, look: st.look, age: 16 });
    // Número: um botão com seta, para parecer tocável sem precisar de dica
    const numBtn = () => '<small>Nº</small><b>' + st.num + '</b><i class="cc-caret" aria-hidden="true"></i>';
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">Nova carreira</div><h2 class="cr-title">Quem é o garoto?</h2>' +
      // cc-side: só agrupa carta e botões (no computador vira a coluna da esquerda; no celular não muda nada)
      '<div class="cc-side"><div class="cc"><div class="cc-top"><button class="cc-num" id="f-num" aria-label="Número da camisa: ' + st.num + '. Trocar">' + numBtn() + '</button>' +
      '<span class="cc-flag" id="cc-flag"></span></div>' +
      '<div class="cc-photo" id="cc-photo"></div>' +
      '<label class="cc-name-w"><input class="cc-name" id="f-name" maxlength="18" value="' + esc(st.name) + '" aria-label="Nome na camisa">' + U.ICON.pencil + '</label></div>' +
      '<div class="cc-acts"><button class="cr-dice" id="b-dice1">' + U.emo('🎲', 'sm') + ' Outro visual</button><button class="cr-dice" id="b-look">' + U.emo('✏️', 'sm') + ' Personalizar</button></div></div>' +
      '<div class="cr-lbl">Posição</div><div class="seg pos4" id="f-pos">' + [['ATA', 'Atacante'], ['MEI', 'Meia'], ['ZAG', 'Zagueiro'], ['GOL', 'Goleiro']].map(([v, l]) => '<button data-v="' + v + '"' + (st.pos === v ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<div class="cr-lbl">Pé bom</div><div class="seg" id="f-foot"><button data-v="D"' + (st.foot === 'D' ? ' class="on"' : '') + '>Destro</button><button data-v="E"' + (st.foot === 'E' ? ' class="on"' : '') + '>Canhoto</button></div>' +
      '<div class="cr-lbl">País · <b id="cr-cty"></b></div><div class="cr-flags" id="f-country">' + D.COUNTRIES.map(k => '<button data-v="' + k.id + '"' + (k.id === st.country ? ' class="on"' : '') + ' aria-label="' + k.id + '">' + U.flag(k.flag, 'sm') + '</button>').join('') + '</div>' +
      '<div id="cr-origin"></div><div id="cr-onote"></div>' +
      '<div class="inv-bar fade"><button class="btn" id="b-start">Começar carreira</button></div>'
    );
    const drawOrigin = () => {
      if (st.challenge && !S.challengeFits(S.CHALLENGE_BY_ID[st.challenge], st.country)) st.challenge = null;
      $('cr-origin').innerHTML = originRows(st); $('cr-onote').innerHTML = ''; bindOrigin(st, drawOrigin);
    };
    const paint = () => {
      $('cc-flag').innerHTML = U.flag(cty().flag);
      $('cr-cty').textContent = cty().id;
      const nb = $('f-num'); nb.innerHTML = numBtn();
      $('cc-photo').innerHTML = U.photo('normal', U.nationKit(st.country), who(), { num: String(st.num), lawn: true });
    };
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) =>
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
        // Número padrão acompanha a posição até a pessoa escolher um (sempre entre os liberados)
        if (key === 'pos' && !st.numTouched) st.num = defNum(b.dataset.v);
        if (key === 'country') drawOrigin();
        paint();
      }));
    $('f-num').onclick = () => numSheet(st, paint);
    $('f-name').oninput = () => { st.name = $('f-name').value; };
    $('b-back-home').onclick = home;
    $('b-look').onclick = () => { st.name = $('f-name').value.trim() || st.name; looks(st); };
    $('b-dice1').onclick = () => { rollLook(st.look); sfx('tap'); paint(); };
    $('b-start').onclick = () => { st.name = $('f-name').value.trim() || st.name; start(st); };
    paint(); drawOrigin();
  }

  function start(st) {
    G.c = S.newCareer({ name: st.name.trim() || 'Craque', pos: st.pos, foot: st.foot, country: st.country, number: st.num });
    S.setOrigin(G.c, U.achHas((S.ORIGIN_BY_ID[st.origin] || {}).need) ? st.origin : 'base', st.challenge);
    // Só entra o que está liberado (a prévia fica de fora)
    G.c.look = onlyLook(I.clean(st.look));
    U.store(LAST, G.c.look);
    U.academy();
  }

  function looks(st) {
    const lk = st.look, kit = U.nationKit(st.country);
    lk.extra = lk.extra || [];
    // Prévia: tocar numa peça travada veste o boneco com ela, sem entrar na carreira
    let prev = null, note = null, noteT = 0;
    const view = () => {
      const v = Object.assign({}, lk, { extra: lk.extra.slice() });
      if (prev) { if (prev.k === 'extra') v.extra.push(prev.v); else v[prev.k] = prev.v; }
      return v;
    };
    const who = () => ({ name: st.name, pos: st.pos, number: st.num, look: view() });
    const isPv = (k, v) => prev && prev.k === k && String(prev.v) === String(v);
    const draw = () => {
      // O visual é todo livre (o filtro só esconde o que ainda pedisse item)
      // Os travados aparecem com cadeado (tocar mostra a prévia e de onde saem); só os livres entram no sorteio
      const free = (key, list) => list;
      const sw = (key, all, bgOf, allNames) => { const list = free(key, all), names = allNames && list.map(v => allNames[all.indexOf(v)]); return list.length < 2 ? '' : '<div class="cr-sw">' + list.map((v, i) => {
        const it = lockOf(key, v), on = !it && String(lk[key]) === String(v);
        return '<button data-k="' + key + '" data-v="' + v + '" class="' + (on ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + (isPv(key, v) ? ' pv' : '') + '" aria-label="' + esc(names ? names[i] : GEAR_NAME[v]) + (it ? ', travado' : '') + '">' +
          '<i style="background:' + bgOf(v) + '"></i>' + (it ? U.emo('🔒', 'xs') : '') + '</button>';
      }).join('') + '</div>'; };
      const gearBg = v => A.SWATCH[v] || A.GEAR[v];
      const chipB = (key, v, l, on, it) => '<button data-k="' + key + '" data-v="' + v + '" class="' + (on ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + (isPv(key, v) ? ' pv' : '') + '">' + (it ? U.emo('🔒', 'xs') + ' ' : '') + l + '</button>';
      const chip = (key, all) => { const list = free(key, all); return list.length < 2 ? '' : '<div class="cr-chips">' + list.map(([v, l]) => { const it = lockOf(key, v); return chipB(key, v, l, !it && String(lk[key]) === v, it); }).join('') + '</div>'; };
      const row = (label, value, body) => !body ? '' : '<div class="cr-row"><div class="cr-lbl">' + label + (value ? ' <b>' + esc(value) + '</b>' : '') + '</div>' + body + '</div>';
      let rows = '';
      if (st.tab === 'corpo') rows = row('Pele', '', sw('skin', A.SKIN.map((_, i) => i), i => A.SKIN[i], A.SKIN.map((_, i) => 'Tom ' + (i + 1)))) +
        row('Barba', 'cresce a partir dos 18', chip('beard', A.BEARDS.map(b => [b, BEARD_NAME[b]])));
      if (st.tab === 'cabelo') rows = row('Corte', '', chip('hair', A.HAIRS.map(h => [h, HAIR_NAME[h]]))) +
        row('Cor do cabelo e da barba', '', sw('hc', A.HAIR_COLORS.map((_, i) => i), i => A.HAIR_COLORS[i], HC_NAME));
      if (st.tab === 'equip') rows = row('Chuteira', GEAR_NAME[lk.boot], sw('boot', BOOTS, gearBg)) +
        row('Sola', GEAR_NAME[lk.sole], sw('sole', BASIC.concat(['prata', 'ouro', 'cromo', 'holo']), gearBg));
      $('cr-rows').innerHTML = rows;
      $('cr-big').innerHTML = (prev && note ? '<span class="cr-prev">Prévia · ' + esc(note.name) + '</span>' : '') + U.photo('normal', kit, who(), { crop: true, flat: true, num: String(st.num) });
      $('cr-paper').innerHTML = U.photo('normal', kit, who(), { num: String(st.num) });
      $('cr-joy').innerHTML = U.photo('celebra', kit, who(), { num: String(st.num) });
      $('cr-note').innerHTML = note ? '<div class="lk-note ' + U.rarCls(note.rk) + '">' + lockMsg(note) + '</div>' : '';
      if (note) bindNote($('cr-note'), note, () => { if (prev.k === 'extra') lk.extra.push(prev.v); else lk[prev.k] = prev.v; prev = note = null; draw(); },
        () => U.openPacks(() => looks(st)));
      screen.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === st.tab));
      $('cr-rows').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k, v = ['skin', 'hc'].includes(k) ? +b.dataset.v : b.dataset.v, it = lockOf(k, v);
        clearTimeout(noteT);
        if (it) {
          prev = { k, v }; note = it;
          // O aviso some sozinho; a prévia sai junto
          noteT = setTimeout(() => { prev = note = null; if ($('cr-rows')) draw(); }, 6000);
          return draw();
        }
        prev = note = null;
        if (k === 'extra') lk.extra = lk.extra.includes(v) ? lk.extra.filter(x => x !== v) : lk.extra.concat(v);
        else lk[k] = v;
        draw();
      });
    };
    render(
      '<div class="cr-top"><button class="back-link" id="b-back1">‹ Voltar</button><button class="cr-dice" id="b-dice">' + U.emo('🎲', 'sm') + ' Sortear</button></div>' +
      '<div class="eyebrow">Personalizar visual</div><h2 class="cr-title">Como ele é?</h2>' +
      '<div class="cr-stage"><div class="cr-big" id="cr-big"></div><div class="cr-side"><div class="cr-lbl">No jornal</div><div class="cr-clip" id="cr-paper"></div>' +
      '<div class="cr-lbl">Comemorando</div><div class="cr-clip" id="cr-joy"></div></div></div>' +
      '<div class="cr-tabs">' + [['corpo', 'Corpo'], ['cabelo', 'Cabelo'], ['equip', 'Chuteira']].map(([k, l]) => '<button data-tab="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<div class="cr-rows" id="cr-rows"></div>' +
      '<div class="inv-bar fade"><div id="cr-note"></div><button class="btn" id="b-go">Começar carreira</button></div>'
    );
    screen.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; prev = note = null; clearTimeout(noteT); draw(); });
    $('b-back1').onclick = () => { clearTimeout(noteT); create(st); };
    // Sortear: um visual inteiro de uma vez (só com as peças liberadas)
    // Sortear: um visual inteiro de uma vez (só com as peças liberadas)
    $('b-dice').onclick = () => { rollLook(lk); prev = note = null; sfx('tap'); draw(); };
    $('b-go').onclick = () => { clearTimeout(noteT); start(st); };
    draw();
  }

  Object.assign(U, { home, mine, resume, create });
})();
