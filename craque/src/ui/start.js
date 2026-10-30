// Interface — tela inicial e criação do jogador
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- início ----------
  // Bilheteria: cada modo é um ingresso de estádio (papel com moldura impressa, picote e canhoto com o código do setor).
  // Os cortes em semicírculo na linha do picote são máscara no CSS (.tk-in), o fundo da tela aparece pelo corte
  const MODES = {
    rapida: { ic: '⏱️', name: 'Carreira Rápida', sub: 'Uma temporada por tela', k: 'Duração', v: '9 min', sec: 'A·01', cont: 'b-cont', neu: 'b-new' },
    completa: { ic: '🏟️', name: 'Jogo a Jogo', full: 'Carreira Jogo a Jogo', sub: 'Cada rodada, treino e contrato', k: 'Save de', v: 'dias', sec: 'B·02', cont: 'b-cont-fc', neu: 'b-new-fc' },
    relampago: { ic: '⚡', name: 'Relâmpago', sub: '5 casas, sozinho ou X1', k: 'Duração', v: '1 min', sec: 'C·03', neu: 'b-relampago' },
  };
  const tk = (cls, id, body, stub, extra) => (id ? '<button class="tk ' + cls + '" id="' + id + '">' : '<div class="tk ' + cls + '" aria-disabled="true">') +
    '<span class="tk-in"><span class="tk-paper"><span class="tk-frame">' + body + '</span></span><span class="tk-stub">' + stub + '</span></span>' + (extra || '') + (id ? '</button>' : '</div>');
  function modeTicket(mode) {
    const M = MODES[mode];
    return tk('tk-' + mode, M.neu, U.emo(M.ic, 'lg') + '<span class="tk-t"><b>' + M.name + '</b><small>' + M.sub + '</small></span><span class="tk-k">' + M.k + '<b>' + M.v + '</b></span>',
      '<b>Entrar</b><small>' + M.sec + '</small>');
  }
  // O jogo em andamento: ingresso grande com o canhoto "Continuar"
  function contTicket(mode, sc) {
    const M = MODES[mode], cl = club(sc.club), fc = sc.fc;
    let line = '<span>Temporada <b>' + (YEAR0 + sc.season) + '</b></span><span>Geral <b>' + S.ovr(sc) + '</b></span>', no = String(YEAR0 + sc.season);
    // Jogo a jogo no meio da liga: rodada e o próximo adversário (só leitura do calendário; S.fcNext mexe no save)
    const e = fc && !fc.done && fc.cal && fc.cal[fc.i];
    if (e && e.k === 'lg' && fc.lg) {
      const R = fc.lg.rounds.length, m = fc.lg.rounds[e.ri].find(([a, b]) => a === 0 || b === 0);
      const vs = m && club(fc.lg.ids[m[0] === 0 ? m[1] : m[0]]);
      line = '<span>Rodada <b>' + (e.ri + 1) + '</b> de ' + R + '</span>' + (vs ? '<span>Próximo <b>x ' + esc(vs.short || vs.name) + '</b> (' + (m[0] === 0 ? 'casa' : 'fora') + ')</span>' : '');
      no = String(e.ri + 1).padStart(4, '0') + '-' + R;
    }
    return tk('tk-cont', M.cont, '<span class="tk-who">' + (cl ? crest(cl.id, 'lg') : '') + '<span><small>' + (M.full || M.name) + '</small><b>' + esc(sc.name) + '</b>' +
      '<span>' + (cl ? esc(cl.name) + ' · ' : '') + sc.age + ' anos · ' + sc.pos + '</span></span></span><span class="tk-line">' + line + '</span>',
      '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z" fill="currentColor"/></svg><b>Continuar</b><i class="tk-bars" aria-hidden="true"></i><small>Nº ' + no + '</small>');
  }
  // Barra de baixo das quatro telas principais (Jogar, Carreiras, Ranking, Perfil)
  const TABS = [['home', 'Jogar', '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/>'],
    ['mine', 'Carreiras', '<rect x="4" y="5" width="11" height="15" rx="1.5"/><path d="M9 3h9.5A1.5 1.5 0 0120 4.5V17"/>'],
    ['ranking', 'Ranking', '<path d="M3 20h18M5 20v-6h4v6M10 20V9h4v11M15 20v-8h4v8"/>'],
    ['profile', 'Perfil', '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-4 4-5.6 7.5-5.6s6.3 1.6 7.5 5.6"/>']];
  U.tabs = cur => {
    const dot = U.ITEMS && U.ITEMS.streak().cells.some(c => c.claim); // prêmio da sequência para pegar: fica no Perfil
    return '<nav class="tabs" aria-label="Seções">' + TABS.map(([k, l, ic]) => '<button data-tab="' + k + '"' + (k === cur ? ' class="on" aria-current="page"' : '') + '>' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ic + '</svg>' + l +
      (k === 'profile' && dot ? '<em class="tabs-dot" aria-label="prêmio para pegar"></em>' : '') + '</button>').join('') + '</nav>';
  };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.tabs [data-tab]');
    if (!b || b.classList.contains('on')) return;
    sfx('tap'); U.backTo = null; U[b.dataset.tab]();
  });
  function home() {
    G.c = null; G.step = null; bar();
    const saved = load(SAVE), savedFc = load(U.SAVE_FC);
    const saves = [['rapida', saved], ['completa', savedFc]].filter(([, sv]) => sv && sv.c).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    const L = U.PROFILE.level((U.ITEMS.get().prof || {}).xp), st = U.ITEMS.streak(), packs = U.ITEMS.get().packs.length;
    const also = ([mode, sv]) => '<button class="hm-line" id="' + MODES[mode].cont + '">' + U.emo(MODES[mode].ic, 'xs') + '<span>Também jogando: <b>' + esc(sv.c.name) + '</b>' +
      (club(sv.c.club) ? ', ' + esc(club(sv.c.club).name) : '') + ', ' + sv.c.age + ' anos</span><em>' + (mode === 'rapida' ? 'Rápida' : 'Jogo a Jogo') + ' ›</em></button>';
    render(
      '<div class="hm">' +
      '<div class="hm-top"><h1 class="hm-logo">CLIMBIX</h1>' +
        (st.n ? '<span class="hm-streak" title="Dias seguidos">' + U.emo('🔥', 'sm') + st.n + '</span>' : '') +
        '<button class="hm-lv" id="b-prof" aria-label="Perfil, nível ' + L.lv + '"><b>' + L.lv + '</b><i><em style="width:' + Math.round(L.cur / L.next * 100) + '%"></em></i></button>' +
        '<button class="hm-cfg" id="b-sound" aria-label="Configurações">' + U.GEAR_SVG + '</button></div>' +
      U.challengeHome() + U.relampagoHome(true) +
      (saves.length ? '<section class="hm-sec"><h2>Seu jogo</h2>' + contTicket(saves[0][0], saves[0][1].c) + (saves[1] ? also(saves[1]) : '') + '</section>' : '') +
      (packs ? '<button class="hm-line" id="b-hb-packs">' + U.emo('📦', 'xs') + '<span><b>' + packs + (packs === 1 ? ' pacotinho' : ' pacotinhos') + '</b> para abrir</span><em>Abrir ›</em></button>' : '') +
      '<section class="hm-sec"><h2>Escolha o jogo</h2><div class="hm-tks">' + modeTicket('rapida') + modeTicket('completa') + modeTicket('relampago') +
        tk('tk-soon', null, U.emo('📋', 'lg') + '<span class="tk-t"><b>Modo Treinador</b><small>Escale e comande o time</small></span>', '', '<span class="tk-stamp">EM BREVE</span>') +
      '</div></section>' + U.deskHint() + '</div>' + U.tabs('home')
    );
    const cont = sv => {
      G.c = sv.c;
      // saves de antes dos investimentos
      G.c.inv = G.c.inv || {}; G.c.buys = G.c.buys || 0;
      if (G.c.pe === undefined) G.c.pe = S.PE_START; // saves de antes dos pontos de evolução
      G.c.leagueOf = G.c.leagueOf || {}; G.c.clubBoost = G.c.clubBoost || {};
      S.applyLeagues(G.c); // quem subiu e quem caiu nesta carreira
      resume(sv.step);
    };
    if ($('b-cont')) $('b-cont').onclick = () => cont(saved);
    if ($('b-cont-fc')) $('b-cont-fc').onclick = () => cont(savedFc);
    U.backTo = null;
    // Com carreira em andamento no mesmo jogo, confirma antes: o novo jogador toma o lugar dela ao assinar
    const newIn = (sv, mode) => () => (sv && sv.c ? U.ask('Começar outra carreira?', 'A carreira de ' + sv.c.name + ' (' + sv.c.age + ' anos) será apagada quando o novo jogador assinar com um clube.', 'Nova carreira', () => create(null, mode)) : create(null, mode));
    $('b-new').onclick = newIn(saved, 'rapida');
    $('b-new-fc').onclick = newIn(savedFc, 'completa');
    U.packHomeBind();
    $('b-prof').onclick = () => { sfx('tap'); U.profile(); };
    U.challengeHomeBind();
    U.relampagoHomeBind();
    $('b-sound').onclick = U.settings;
    if (U.whatsNew) U.whatsNew();
  }

  // Minhas carreiras: tudo o que ficou das carreiras encerradas (as telas daqui voltam para cá)
  function mine() {
    G.c = null; G.step = null; bar();
    U.backTo = mine;
    const hall = load(HALL) || [];
    // Linha do Hall da Fama: nota (mesma etiqueta do ranking), jogador e números, pontuação à direita
    const stats = h => (h.pos === 'GOL' ? h.cs + ' sem sofrer gol · ' + h.penSaved + ' pên. def. · ' : h.pos === 'ZAG' ? h.cs + ' sem sofrer gol · ' + D.plural(h.goals, 'gol', 'gols') + ' · ' : D.plural(h.goals, 'gol', 'gols') + ' · ' + h.assists + ' assist. · ') +
      D.plural(h.titles, 'taça', 'taças') + (h.ballon ? ' · ' + h.ballon + ' Bola' + (h.ballon > 1 ? 's' : '') + ' de Ouro' : '');
    render('<h2 class="tab-h">Minhas carreiras</h2>' +
      '<div class="mc-side">' + U.lastHome() + U.salaHome() +
      '<div class="home-grid">' +
      '<button class="hg" id="b-col"><i>' + U.ICON.cards + '</i><b>Coleção</b><small>' + U.collectionCards() + (U.collectionCards() === 1 ? ' carta' : ' cartas') + '</small></button>' +
      '<button class="hg" id="b-ach"><i>' + U.ICON.medal + '</i><b>Conquistas</b><small>' + U.achCount() + ' de ' + S.ACHIEVEMENTS.length + '</small></button>' +
      '</div></div>' +
      '<section class="mc-hall"><div class="eyebrow">Hall da Fama</div>' +
      (hall.length ? '<div class="mc-list">' +
        hall.map((h, i) => '<div class="mc-row' + (i ? '' : ' best') + '"><span class="rk-g g' + esc(h.grade) + '">' + esc(h.grade) + '</span><span class="mc-who"><b>' + esc(h.name) + ' · ' + esc(h.verdict) + '</b>' +
          '<small>' + stats(h) + '</small></span><span class="mc-pts">' + Number(h.score).toLocaleString('pt-BR') + '<small>pts</small></span></div>').join('') + '</div>'
        : '<p class="mc-empty">' + U.ICON.trophy + '<span>Termine uma carreira para ela aparecer aqui.</span></p>') + '</section>' + U.tabs('mine'));
    U.lastHomeBind();
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
    if (st === 'fc') return U.fcHub(); // Carreira Completa: no meio da temporada jogo a jogo
    // Fechou o jogo durante a temporada (o save já aponta para a pré-temporada, sem as opções dela):
    // a decisão do pouco espaço no elenco vem antes, como no caminho normal (afterSeason)
    return !G.c.preCh && S.benchCase(G.c) ? U.squad() : U.preseason();
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
  const newSt = () => ({ pos: 'ATA', foot: 'D', country: 'Brasil', num: defNum('ATA'), numTouched: false, name: D.randomName('Brasil'), nameAuto: true,
    tab: 'corpo', origin: 'base', challenge: null, look: lastLook() || rollLook(Object.assign({}, I.FREE, { v: 2 })) });

  // Origem e desafio (engine/origins.js): liberados por conquistas
  const achName = id => (S.ACHIEVEMENTS.find(a => a.id === id) || {}).name || id;
  const optChips = (list, cur, kind, st) => '<div class="cr-chips">' + list.map(o => {
    const lock = !U.achHas(o.need), off = kind === 'challenge' && !S.challengeFits(o, st.country, st.origin);
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
    // O aviso fica no fim da página: rola até ele para não ficar atrás do botão preso embaixo
    const note = (it, why) => { const el = $('cr-onote'); if (!el) return; el.innerHTML = '<div class="cr-lock">' + U.emo('🔒', 'sm') + '<span><b>' + esc(it.name) + '</b> · ' + why + '</span></div>';
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    screen.querySelectorAll('[data-origin]').forEach(b => b.onclick = () => {
      const it = S.ORIGIN_BY_ID[b.dataset.origin];
      if (!U.achHas(it.need)) return note(it, 'libere com a conquista "' + achName(it.need) + '"');
      st.origin = it.id; sfx('tap'); redraw();
    });
    screen.querySelectorAll('[data-challenge]').forEach(b => b.onclick = () => {
      const it = S.CHALLENGE_BY_ID[b.dataset.challenge];
      if (it && !U.achHas(it.need)) return note(it, 'libere com a conquista "' + achName(it.need) + '"');
      if (it && !S.challengeFits(it, st.country, st.origin)) return note(it, S.EUROPE.includes(st.country) ? 'só para quem nasceu fora da Europa' : 'não combina com Vendido cedo (a base é na Europa)');
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

  function create(prev, mode) {
    const st = prev && prev.look ? prev : newSt();
    // O jogo vem de quem chamou (tela inicial); "jogar de novo" no fim repete o da carreira que acabou
    if (mode) st.mode = mode; else if (!st.mode) st.mode = G.c && G.c.mode === 'completa' ? 'completa' : 'rapida';
    const cty = () => D.COUNTRIES.find(k => k.id === st.country) || D.COUNTRIES[0];
    // Aos 16 anos: a barba escolhida só aparece quando ele crescer (avatar.beardAtAge)
    const who = () => ({ name: st.name, pos: st.pos, number: st.num, look: st.look, age: 16 });
    // Número: um botão com seta, para parecer tocável sem precisar de dica
    const numBtn = () => '<small>Nº</small><b>' + st.num + '</b><i class="cc-caret" aria-hidden="true"></i>';
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">' + (st.mode === 'completa' ? 'Carreira jogo a jogo' : 'Carreira rápida') + '</div><h2 class="cr-title">Quem é o garoto?</h2>' +
      // cc-side: só agrupa carta e botões (no computador vira a coluna da esquerda; no celular não muda nada)
      '<div class="cc-side"><div class="cc"><div class="cc-top"><button class="cc-num" id="f-num" aria-label="Número da camisa: ' + st.num + '. Trocar">' + numBtn() + '</button>' +
      '<span class="cc-flag" id="cc-flag"></span></div>' +
      '<div class="cc-photo" id="cc-photo"></div>' +
      '<label class="cc-name-w"><input class="cc-name" id="f-name" maxlength="18" value="' + esc(st.name) + '" aria-label="Nome na camisa">' + U.ICON.pencil +
        '<button type="button" class="cc-name-dice" id="b-name" aria-label="Sortear nome">' + U.emo('🎲', 'sm') + '</button></label></div>' +
      '<div class="cc-acts"><button class="cr-dice" id="b-dice1">' + U.emo('🎲', 'sm') + ' Outro visual</button><button class="cr-dice" id="b-look">' + U.emo('✏️', 'sm') + ' Personalizar</button></div></div>' +
      '<div class="cr-lbl">Posição</div><div class="seg pos4" id="f-pos">' + [['ATA', 'Atacante'], ['MEI', 'Meia'], ['ZAG', 'Zagueiro'], ['GOL', 'Goleiro']].map(([v, l]) => '<button data-v="' + v + '"' + (st.pos === v ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<div class="cr-lbl">Pé bom</div><div class="seg" id="f-foot"><button data-v="D"' + (st.foot === 'D' ? ' class="on"' : '') + '>Destro</button><button data-v="E"' + (st.foot === 'E' ? ' class="on"' : '') + '>Canhoto</button></div>' +
      '<div class="cr-lbl">País · <b id="cr-cty"></b></div><div class="cr-flags" id="f-country">' + D.COUNTRIES.map(k => '<button data-v="' + k.id + '"' + (k.id === st.country ? ' class="on"' : '') + ' aria-label="' + k.id + '">' + U.flag(k.flag, 'sm') + '</button>').join('') + '</div>' +
      '<div id="cr-origin"></div><div id="cr-onote"></div>' +
      '<div class="inv-bar fade"><button class="btn" id="b-start">Começar carreira</button></div>'
    );
    const drawOrigin = () => {
      if (st.challenge && !S.challengeFits(S.CHALLENGE_BY_ID[st.challenge], st.country, st.origin)) st.challenge = null;
      $('cr-origin').innerHTML = originRows(st); $('cr-onote').innerHTML = ''; bindOrigin(st, drawOrigin);
    };
    const paint = () => {
      $('cc-flag').innerHTML = U.flag(cty().flag);
      $('cr-cty').textContent = cty().id;
      const nb = $('f-num'); nb.innerHTML = numBtn();
      $('cc-photo').innerHTML = U.photo('normal', U.nationKit(st.country), who(), { num: String(st.num), lawn: true, vb: '-24 0 168 200' });
    };
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) =>
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
        // Número padrão acompanha a posição até a pessoa escolher um (sempre entre os liberados)
        if (key === 'pos' && !st.numTouched) st.num = defNum(b.dataset.v);
        if (key === 'country') { drawOrigin(); if (st.nameAuto) setName(D.randomName(st.country, null, st.name)); }
        paint();
      }));
    $('f-num').onclick = () => numSheet(st, paint);
    // Nome comprido diminui a letra para caber inteiro na plaquinha (celular estreito cortava "WESLEYZINH")
    const fitName = () => { const el = $('f-name'); if (!el) return; let fs = 26; el.style.fontSize = fs + 'px';
      while (fs > 12 && el.scrollWidth > el.clientWidth) el.style.fontSize = --fs + 'px'; };
    // Nome sorteado acompanha o país até a pessoa digitar um; o dado sorteia outro do país escolhido
    const setName = n => { st.name = n; $('f-name').value = n; fitName(); };
    $('f-name').oninput = () => { st.name = $('f-name').value; st.nameAuto = false; fitName(); };
    $('b-name').onclick = e => { e.preventDefault(); st.nameAuto = true; setName(D.randomName(st.country, null, $('f-name').value.trim())); sfx('tap'); };
    $('b-back-home').onclick = home;
    $('b-look').onclick = () => { st.name = $('f-name').value.trim() || st.name; looks(st); };
    $('b-dice1').onclick = () => { rollLook(st.look); sfx('tap'); paint(); };
    $('b-start').onclick = () => { st.name = $('f-name').value.trim() || st.name; start(st); };
    paint(); drawOrigin(); fitName(); if (document.fonts) document.fonts.ready.then(fitName);
  }

  function start(st) {
    G.c = S.newCareer({ name: st.name.trim() || 'Craque', pos: st.pos, foot: st.foot, country: st.country, number: st.num });
    if (st.mode === 'completa') G.c.mode = 'completa';
    S.setOrigin(G.c, U.achHas((S.ORIGIN_BY_ID[st.origin] || {}).need) ? st.origin : 'base', st.challenge);
    // Só entra o que está liberado (a prévia fica de fora)
    G.c.look = onlyLook(I.clean(st.look));
    // Revanche: quem venceu a última rivalidade volta nesta carreira (não num desafio por link aberto: as duas carreiras se comparam)
    const dz = load('climbix-desafio'), back = load('climbix-rival-v1');
    G.c.rivalKeep = !(dz && !dz.done);
    G.c.rivalBack = G.c.rivalKeep && back && back.name ? { name: String(back.name), country: String(back.country), me: +back.me || 0, him: +back.him || 0 } : null;
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
      const chipB = (key, v, l, on, it, th) => '<button data-k="' + key + '" data-v="' + v + '" class="' + (on ? 'on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + (isPv(key, v) ? ' pv' : '') + (th ? ' th' : '') + '">' + (th || '') + (it ? U.emo('🔒', 'xs') + ' ' : '') + l + '</button>';
      // Corte e barba com miniatura do rosto: o nome sozinho não mostra como fica
      const face = (key, v) => U.photo('normal', kit, { pos: st.pos, look: Object.assign({}, lk, { extra: [], [key]: v }) }, { flat: true, vb: key === 'beard' ? '39 16 42 42' : '33 -3 54 54' });
      const chip = (key, all, th) => { const list = free(key, all); return list.length < 2 ? '' : '<div class="cr-chips' + (th ? ' faces' : '') + '">' + list.map(([v, l]) => { const it = lockOf(key, v); return chipB(key, v, l, !it && String(lk[key]) === v, it, th && face(key, v)); }).join('') + '</div>'; };
      const row = (label, value, body) => !body ? '' : '<div class="cr-row"><div class="cr-lbl">' + label + (value ? ' <b>' + esc(value) + '</b>' : '') + '</div>' + body + '</div>';
      let rows = '';
      if (st.tab === 'corpo') rows = row('Pele', '', sw('skin', A.SKIN.map((_, i) => i), i => A.SKIN[i], A.SKIN.map((_, i) => 'Tom ' + (i + 1)))) +
        row('Barba', 'cresce a partir dos 18', chip('beard', A.BEARDS.map(b => [b, BEARD_NAME[b]]), true));
      if (st.tab === 'cabelo') rows = row('Corte', '', chip('hair', A.HAIRS.map(h => [h, HAIR_NAME[h]]), true)) +
        row('Cor do cabelo e da barba', '', sw('hc', A.HAIR_COLORS.map((_, i) => i), i => A.HAIR_COLORS[i], HC_NAME));
      if (st.tab === 'equip') rows = row('Chuteira', GEAR_NAME[lk.boot], sw('boot', BOOTS, gearBg)) +
        row('Sola', GEAR_NAME[lk.sole], sw('sole', BASIC.concat(['prata', 'ouro', 'cromo', 'holo']), gearBg));
      $('cr-rows').innerHTML = rows;
      const zoom = st.tab !== 'equip';
      $('cr-big').classList.toggle('zoom', zoom);
      $('cr-big').innerHTML = (prev && note ? '<span class="cr-prev">Prévia · ' + esc(note.name) + '</span>' : '') + U.photo('normal', kit, who(), Object.assign({ crop: true, flat: true, num: String(st.num) }, zoom ? { vb: '28 -6 64 74' } : {}));
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
