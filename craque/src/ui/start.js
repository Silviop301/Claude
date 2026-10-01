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
      U.packHome() +
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
    $('b-new').onclick = () => create();
    U.packHomeBind();
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
  const A = window.ClimbixAvatar, I = U.ITEMS;
  const BASIC = ['preto', 'branco', 'vermelho', 'azul', 'neon', 'rosa', 'laranja', 'amarelo', 'roxo', 'vinho', 'cinza', 'musgo', 'celeste', 'bege'];
  const GEAR_NAME = { preto: 'Preta', branco: 'Branca', vermelho: 'Vermelha', azul: 'Azul', neon: 'Verde neon', rosa: 'Rosa', laranja: 'Laranja', amarelo: 'Amarela', ouro: 'Ouro', holo: 'Holográfica', lima: 'Lima', roxo: 'Roxa', vinho: 'Vinho', cinza: 'Cinza', musgo: 'Verde-musgo', celeste: 'Azul-bebê', bege: 'Bege', prata: 'Prata', cromo: 'Cromada',
    camuflada: 'Camuflada', raio: 'De raio', chamas: 'Em chamas', tigre: 'Tigrada' };
  const HAIR_NAME = { curto: 'Curto', raspado: 'Raspado', topete: 'Topete', black: 'Black', trancas: 'Tranças', dreads: 'Dreads', moicano: 'Moicano', longo: 'Longo', careca: 'Careca',
    social: 'Social', franja: 'Franja', militar: 'Militar', cacheado: 'Cacheado', undercut: 'Undercut', degrade: 'Degradê', samurai: 'Samurai', afro: 'Black power',
    mullet: 'Mullet', riscado: 'Com desenho', trancalonga: 'Tranças longas', moicanoloiro: 'Moicano loiro' };
  const BEARD_NAME = { nenhuma: 'Sem barba', rala: 'Rala', bigode: 'Bigode', cavanhaque: 'Cavanhaque', cheia: 'Cheia', porfazer: 'Por fazer', costeleta: 'Costeleta', lenhador: 'Lenhador', bigodao: 'Bigodão', navalha: 'Com desenho', trancada: 'Trançada' };
  const HC_NAME = ['Preto', 'Castanho', 'Loiro', 'Ruivo', 'Grisalho', 'Platinado', 'Azul', 'Rosa', 'Verde'];
  const EXTRA_NAME = { bonfim: 'Fita do Bonfim', listrado: 'Listrado', caneleira: 'Caneleira', coque: 'Coque', risco: 'Risquinho', cordao: 'Cordão', brinco: 'Brinco', capitao: 'Faixa de capitão', mecha: 'Mecha', bandana: 'Bandana', rabo: 'Rabo de cavalo', sobrancelha: 'Sobrancelha riscada', glitter: 'Glitter', clube: 'Cores do clube' };
  const TAT = [['nenhuma', 'Nenhuma'], ['pequena', 'Pequena'], ['fechado', 'Fechada']];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // Itens travados (pacotinhos, ui/items.js): o que falta liberar para usar um valor do visual
  const lockOf = (k, v) => { const id = I.need(k, v); return id && !I.has(id) ? I.itemOf(id) : null; };
  // Número padrão da posição, se liberado; senão o liberado mais perto
  const defNum = pos => I.nearestNum(D.POS_NUM[pos] || 10);
  const newSt = () => ({ pos: 'ATA', foot: 'D', country: 'Brasil', num: defNum('ATA'), numTouched: false, name: D.NICKNAMES[Math.floor(Math.random() * D.NICKNAMES.length)],
    tab: 'corpo', look: Object.assign({}, A.DEF, I.FREE, { v: 2, extra: [], skin: Math.floor(Math.random() * A.SKIN.length) }) }); // começa só com o que é livre
  const numRk = n => I.itemOf('n' + n).rk;

  // Número da camisa: grade com os 99 (liberados em creme, travados vazados na cor da raridade)
  function numSheet(st, onDone) {
    let sel = st.num, msg = '';
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    document.body.appendChild(w);
    const close = () => w.remove();
    const cell = n => { const on = I.has('n' + n); return '<button class="nb-c ' + U.rarCls(numRk(n)) + (on ? ' on' : '') + (sel === n ? ' sel' : '') + '" data-n="' + n + '" aria-label="Número ' + n + (on ? '' : ', travado') + '">' + n + '</button>'; };
    const sec = (t, list) => '<div class="nb-sec">' + t + '</div><div class="nb-grid">' + list.map(cell).join('') + '</div>';
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const fx = [['', 'Normal'], ['contorno', 'Vazado'], ['neon', 'Neon'], ['ouro', 'Dourado'], ['holo', 'Holográfico'], ['fogo', 'Em chamas']];
    function draw() {
      const own = I.ownedNums().length;
      w.innerHTML = '<div class="tr-sheet nb-sheet" role="dialog" aria-modal="true"><i class="tr-grab"></i><div class="tr-head"><b>Número da camisa</b><span class="nb-count">' + own + ' de 99</span></div>' +
        // Estilo do número primeiro; depois os números por raridade
        '<div class="nb-scroll"><div class="nb-sec first">Estilo do número</div><div class="cr-chips">' + fx.map(([v, l]) => { const it = v && !I.has('num-' + v) ? I.itemOf('num-' + v) : null;
          return '<button data-fx="' + v + '" class="' + ((st.look.numFx || '') === v ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + '">' + (it ? U.emo('🔒', 'xs') + ' ' : '') + l + '</button>'; }).join('') + '</div>' +
        '<div class="nb-leg"><span><i class="on"></i>Liberado</span>' + ['comum', 'raro', 'epico'].map(k => '<span><i class="' + U.rarCls(k) + '"></i>' + I.RAR_NAME[k] + '</span>').join('') + '</div>' +
        sec('Comuns', range(1, 99).filter(n => numRk(n) === 'comum')) + sec('Raros · 20, 30, 40… 90', range(1, 99).filter(n => numRk(n) === 'raro')) +
        sec('Épicos · 1 a 11, 77 e 99', range(1, 99).filter(n => numRk(n) === 'epico')) + '</div>' +
        (msg ? '<div class="lk-note in-sheet">' + msg + '</div>' : '') +
        '<button class="btn" id="nb-use">Usar o ' + sel + '</button></div>';
      w.querySelectorAll('.nb-c').forEach(b => b.onclick = () => {
        const n = +b.dataset.n, it = I.itemOf('n' + n);
        if (I.has(it.id)) { sel = n; msg = ''; return draw(); }
        msg = lockMsg(it, () => draw());
        draw();
        bindNote(w, it, () => { sel = n; msg = ''; draw(); }, () => { close(); U.openPacks(() => create(st)); });
      });
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
      '<small>Sai em pacotinhos.' + (packs ? ' Você tem ' + packs + ' para abrir.' : '') + (it.cat === 'num' ? '' : ' A prévia não entra na carreira.') + '</small>' +
      '<div class="lk-acts">' + (packs ? '<button class="lk-open">Abrir pacotinhos</button>' : '') + '<button class="lk-trade">Trocar ' + I.COST[it.rk] + ' ' + U.emo('🎟️', 'xs') + '</button></div></div>';
  }
  function bindNote(root, it, onTraded, onOpen) {
    const t = root.querySelector('.lk-trade'), o = root.querySelector('.lk-open');
    if (t) t.onclick = e => { e.stopPropagation(); U.tradeSheet(it.id, onTraded); };
    if (o) o.onclick = e => { e.stopPropagation(); onOpen(); };
  }

  function create(prev) {
    const st = prev && prev.look ? prev : newSt();
    if (!I.has('n' + st.num)) st.num = defNum(st.pos);
    const cty = () => D.COUNTRIES.find(k => k.id === st.country) || D.COUNTRIES[0];
    const who = () => ({ name: st.name, pos: st.pos, number: st.num, look: st.look });
    const numBtn = () => '<b>' + st.num + '</b><span><em>' + I.RAR_NAME[numRk(st.num)] + '</em>trocar</span>';
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">Nova carreira · 1 de 2</div><h2 class="cr-title">Quem é o garoto?</h2>' +
      '<div class="cc"><div class="cc-top"><button class="cc-num ' + U.rarCls(numRk(st.num)) + '" id="f-num" aria-label="Número da camisa: ' + st.num + '. Trocar">' + numBtn() + '</button>' +
      '<span class="cc-pos" id="cc-pos"></span><span class="cc-flag" id="cc-flag"></span></div>' +
      '<div class="cc-photo" id="cc-photo"></div>' +
      '<input class="cc-name" id="f-name" maxlength="18" value="' + esc(st.name) + '" aria-label="Nome na camisa"></div>' +
      '<p class="cc-hint">Toque no número para ver os liberados e no nome para editar</p>' +
      '<div class="cr-lbl">Posição</div><div class="seg pos4" id="f-pos">' + [['ATA', 'Atacante'], ['MEI', 'Meia'], ['ZAG', 'Zagueiro'], ['GOL', 'Goleiro']].map(([v, l]) => '<button data-v="' + v + '"' + (st.pos === v ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<div class="cr-lbl">Pé bom</div><div class="seg" id="f-foot"><button data-v="D"' + (st.foot === 'D' ? ' class="on"' : '') + '>Destro</button><button data-v="E"' + (st.foot === 'E' ? ' class="on"' : '') + '>Canhoto</button></div>' +
      '<div class="cr-lbl">País · <b id="cr-cty"></b></div><div class="cr-flags" id="f-country">' + D.COUNTRIES.map(k => '<button data-v="' + k.id + '"' + (k.id === st.country ? ' class="on"' : '') + ' aria-label="' + k.id + '">' + U.flag(k.flag, 'sm') + '</button>').join('') + '</div>' +
      '<div class="inv-bar"><button class="btn" id="b-next1">Próximo: o visual</button></div>'
    );
    const paint = () => {
      $('cc-pos').textContent = st.pos;
      $('cc-flag').innerHTML = U.flag(cty().flag);
      $('cr-cty').textContent = cty().id;
      const nb = $('f-num'); nb.innerHTML = numBtn(); nb.className = 'cc-num ' + U.rarCls(numRk(st.num));
      $('cc-photo').innerHTML = U.photo('normal', U.nationKit(st.country), who(), { num: String(st.num) });
    };
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) =>
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
        // Número padrão acompanha a posição até a pessoa escolher um (sempre entre os liberados)
        if (key === 'pos' && !st.numTouched) st.num = defNum(b.dataset.v);
        paint();
      }));
    $('f-num').onclick = () => numSheet(st, paint);
    $('f-name').oninput = () => { st.name = $('f-name').value; };
    $('b-back-home').onclick = home;
    $('b-next1').onclick = () => { st.name = $('f-name').value.trim() || st.name; looks(st); };
    paint();
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
      const sw = (key, list, bgOf, names) => '<div class="cr-sw">' + list.map((v, i) => {
        const it = lockOf(key, v), on = !it && String(lk[key]) === String(v);
        return '<button data-k="' + key + '" data-v="' + v + '" class="' + (on ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + (isPv(key, v) ? ' pv' : '') + '" aria-label="' + esc(names ? names[i] : GEAR_NAME[v]) + (it ? ', travado' : '') + '">' +
          '<i style="background:' + bgOf(v) + '"></i>' + (it ? U.emo('🔒', 'xs') : '') + '</button>';
      }).join('') + '</div>';
      const gearBg = v => A.SWATCH[v] || A.GEAR[v];
      const chipB = (key, v, l, on, it) => '<button data-k="' + key + '" data-v="' + v + '" class="' + (on ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + (isPv(key, v) ? ' pv' : '') + '">' + (it ? U.emo('🔒', 'xs') + ' ' : '') + l + '</button>';
      const chip = (key, list) => '<div class="cr-chips">' + list.map(([v, l]) => { const it = lockOf(key, v); return chipB(key, v, l, !it && String(lk[key]) === v, it); }).join('') + '</div>';
      // Liga/desliga acessórios (c.look.extra)
      const tog = list => '<div class="cr-chips">' + list.map(id => { const it = lockOf('extra', id); return chipB('extra', id, EXTRA_NAME[id], !it && lk.extra.includes(id), it); }).join('') + '</div>';
      const row = (label, value, body) => '<div class="cr-row"><div class="cr-lbl">' + label + (value ? ' <b>' + esc(value) + '</b>' : '') + '</div>' + body + '</div>';
      const tv = k => lk['tat' + k] || 'nenhuma';
      const tnote = k => (tv(k) === 'nenhuma' ? '' : k[0] === 'B' && lk.sleeve === 'comprida' ? 'coberta pela manga comprida' : k[0] === 'P' && tv(k) === 'fechado' && lk.sock === 'alto' ? 'aparece mais com meião arriado' : '');
      let rows = '';
      if (st.tab === 'corpo') rows = row('Pele', '', sw('skin', A.SKIN.map((_, i) => i), i => A.SKIN[i], A.SKIN.map((_, i) => 'Tom ' + (i + 1)))) +
        row('Barba', '', chip('beard', A.BEARDS.map(b => [b, BEARD_NAME[b]]))) +
        [['BD', 'braço direito'], ['BE', 'braço esquerdo'], ['PD', 'perna direita'], ['PE', 'perna esquerda']].map(([k, l]) => row('Tatuagem · ' + l, tnote(k), chip('tat' + k, TAT))).join('');
      if (st.tab === 'cabelo') rows = row('Corte', '', chip('hair', A.HAIRS.map(h => [h, HAIR_NAME[h]]))) +
        row('Detalhes', '', tog(['coque', 'risco', 'mecha', 'rabo', 'sobrancelha', 'glitter', 'clube'])) +
        row('Cor do cabelo e da barba', '', sw('hc', A.HAIR_COLORS.map((_, i) => i), i => A.HAIR_COLORS[i], HC_NAME)) +
        row('Na cabeça', '', chip('band', [['nenhuma', 'Nada'], ['faixa', 'Faixa'], ['tiara', 'Tiara']]) + tog(['bandana'])) +
        (lk.band !== 'nenhuma' ? row('Cor da faixa', GEAR_NAME[lk.bandC], sw('bandC', BASIC, gearBg)) : '');
      if (st.tab === 'equip') rows = row('Chuteira', GEAR_NAME[lk.boot], sw('boot', BASIC.concat(['prata', 'ouro', 'cromo', 'holo', 'camuflada', 'raio', 'chamas']), gearBg)) +
        row('Sola', GEAR_NAME[lk.sole], sw('sole', BASIC.concat(['prata', 'ouro', 'cromo', 'holo']), gearBg)) +
        row('Meião', '', chip('sock', [['alto', 'Alto'], ['arriado', 'Arriado']]) + tog(['listrado', 'caneleira'])) +
        row('Manga', '', chip('sleeve', [['curta', 'Curta'], ['comprida', 'Comprida']])) +
        row('Munhequeira', '', chip('wrist', [['nenhuma', 'Nenhuma'], ['uma', 'Uma'], ['duas', 'Duas']])) +
        (lk.wrist !== 'nenhuma' ? row('Cor da munhequeira', GEAR_NAME[lk.wristC], sw('wristC', BASIC, gearBg)) : '') +
        row('Acessórios', '', tog(['bonfim', 'cordao', 'brinco', 'capitao'])) +
        (st.pos === 'GOL' ? row('Luva', GEAR_NAME[lk.glove], sw('glove', ['lima'].concat(BASIC, ['tigre']), gearBg)) : '');
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
      '<div class="eyebrow">Nova carreira · 2 de 2</div><h2 class="cr-title">Como ele é?</h2>' +
      '<div class="cr-stage"><div class="cr-big" id="cr-big"></div><div class="cr-side"><div class="cr-lbl">No jornal</div><div class="cr-clip" id="cr-paper"></div>' +
      '<div class="cr-lbl">Comemorando</div><div class="cr-clip" id="cr-joy"></div></div></div>' +
      '<div class="cr-tabs">' + [['corpo', 'Corpo'], ['cabelo', 'Cabelo'], ['equip', 'Equipamento']].map(([k, l]) => '<button data-tab="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<div class="cr-rows" id="cr-rows"></div>' +
      '<div class="inv-bar"><div id="cr-note"></div><button class="btn" id="b-go">Começar carreira</button></div>'
    );
    screen.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; prev = note = null; clearTimeout(noteT); draw(); });
    $('b-back1').onclick = () => { clearTimeout(noteT); create(st); };
    // Sortear: um visual inteiro de uma vez (só com as peças liberadas)
    $('b-dice').onclick = () => {
      const ok = k => v => !lockOf(k, v);
      const p = (k, list) => pick(list.filter(ok(k)));
      Object.assign(lk, { skin: Math.floor(Math.random() * A.SKIN.length), hair: p('hair', A.HAIRS), hc: p('hc', [0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8]), beard: p('beard', A.BEARDS),
        band: p('band', ['nenhuma', 'nenhuma', 'faixa', 'tiara']), bandC: p('bandC', BASIC), tatBD: p('tatBD', ['nenhuma', 'nenhuma', 'pequena', 'fechado']), tatBE: p('tatBE', ['nenhuma', 'nenhuma', 'pequena', 'fechado']),
        tatPD: p('tatPD', ['nenhuma', 'nenhuma', 'nenhuma', 'pequena', 'fechado']), tatPE: p('tatPE', ['nenhuma', 'nenhuma', 'nenhuma', 'pequena', 'fechado']),
        boot: p('boot', BASIC.concat(['prata', 'ouro', 'cromo', 'holo', 'camuflada', 'raio', 'chamas'])), sole: p('sole', BASIC), sock: p('sock', ['alto', 'arriado']), sleeve: p('sleeve', ['curta', 'curta', 'comprida']),
        wrist: p('wrist', ['nenhuma', 'uma', 'duas']), wristC: p('wristC', BASIC),
        extra: Object.keys(EXTRA_NAME).filter(id => !lockOf('extra', id) && Math.random() < 0.3) });
      prev = note = null; sfx('tap'); draw();
    };
    $('b-go').onclick = () => {
      clearTimeout(noteT);
      if (!I.has('n' + st.num)) st.num = defNum(st.pos);
      G.c = S.newCareer({ name: st.name.trim() || 'Craque', pos: st.pos, foot: st.foot, country: st.country, number: st.num });
      // Só entra o que está liberado (a prévia fica de fora)
      G.c.look = Object.assign({ v: 2 }, I.clean(lk));
      U.academy();
    };
    draw();
  }

  // "Ver no meu jogador" (depois de abrir um pacotinho): nova carreira já vestindo o que saiu
  function createWith(items) {
    const st = newSt();
    (items || []).forEach(it => {
      if (it.cat === 'num') { st.num = it.n; st.numTouched = true; return; }
      if (it.gk) st.pos = 'GOL';
      // Só o que está liberado (ex.: a chuteira de raio vem com sola amarela só se a cor amarela já estiver liberada)
      Object.entries(it.look || {}).forEach(([k, v]) => { if (k === 'extra') st.look.extra = (st.look.extra || []).concat(v); else if (!lockOf(k, v)) st.look[k] = v; });
    });
    const vis = (items || []).filter(it => it.cat !== 'num' && it.cat !== 'assinatura' && it.cat !== 'acabamento'); // assinatura e acabamento se escolhem no fim da carreira
    if (!vis.length) return create(st);
    st.tab = vis.some(it => it.cat === 'cabelo') ? 'cabelo' : vis.some(it => it.cat === 'tatuagem') && vis.length === 1 ? 'corpo' : 'equip';
    looks(st);
  }

  Object.assign(U, { home, resume, create, createWith });
})();
