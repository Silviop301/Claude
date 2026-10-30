// Interface — Carreira Completa integrada: a temporada jogo a jogo (engine/fullcareer.js). Uma tela central com o
// próximo jogo, seus números, os pontos de evolução (que dá para gastar entre os jogos), as competições, o calendário
// e a tabela; cada jogo passa ao vivo (relógio de 0' a 90', placares e tabela mudando). Finais e o clássico abrem o
// lance decisivo antes do jogo. No fim do calendário, o resumo da temporada de sempre.
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, sfx, $, esc, crest, year, save, render, bar } = U;

  const nameOf = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].name : '?');
  const rate = r => r.toFixed(1).replace('.', ',');
  const num1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  const clock = t => (t > 90 ? '90+' + (t - 90) : t) + "'";
  const PACE = [330, 110]; // milissegundos por minuto de jogo: normal (~30 s) e rápido (~10 s)
  let fast = false;
  // Abaixo do jogo, uma aba por vez: tabela, jogos (calendário), competições e seus números; ao vivo, a rodada.
  // Em tela larga a tabela fica sempre do lado e as abas cuidam do resto.
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 1000px) and (min-height: 560px)').matches;
  const PANES = [['round', 'Rodada'], ['tbl', 'Tabela'], ['cal', 'Jogos'], ['comp', 'Torneios'], ['me', 'Você']];
  let pane = 'tbl';

  // ---------- tela central ----------
  function hub() {
    const c = G.c;
    if (!c.fc || c.fc.season !== c.season) S.fcStart(c);
    G.step = 'fc'; save(); bar();
    if (c.fc.done || !S.fcNext(c)) return finishSeason();
    // Data de evento: entre um jogo e outro, a vida fora de campo (ui/match.js; a escolha volta para cá)
    if (S.fcEventDue(c)) {
      const ev = S.fcPickEvent(c);
      if (ev) { c.pendEv = ev; G.step = 'event'; save(); return U.eventScreen(); }
      save();
    }
    render(
      '<div class="fs fc" id="fc">' +
        '<div class="fs-main">' +
          '<div class="eyebrow">Temporada ' + (year()) + ' · ' + esc(nameOf(c.club)) + '</div><h2 id="fc-h"></h2>' +
          '<div class="fs-match" id="fc-match"></div>' +
          '<div class="fs-acts" id="fc-acts"></div>' +
          '<div class="fc-pe" id="fc-pe"></div>' +
          '<div class="seg fc-nav" id="fc-nav" role="tablist"></div>' +
          '<div class="fc-pane" data-p="cal"><div class="fc-cal" id="fc-cal"></div></div>' +
          '<div class="fc-pane" data-p="comp"><div class="fc-comps" id="fc-comps"></div></div>' +
          '<div class="fc-pane" data-p="me"><div class="fs-me" id="fc-me"></div></div>' +
          '<div class="fc-pane" data-p="round"><div class="fs-round" id="fc-round"></div></div>' +
        '</div>' +
        '<div class="fs-side fc-pane" data-p="tbl"><div class="fc-tabs" id="fc-tabs"></div><div class="fs-tbl" id="fc-tbl"></div></div>' +
      '</div>'
    );
    tblKey = null;
    paint();
  }
  // Abas: Rodada só existe com outros jogos na tela; em tela larga, Tabela sai (ela já está do lado)
  function nav(want) {
    const el = $('fc-nav'), box = $('fc');
    if (!el) return;
    const hasRound = !!($('fc-round') && $('fc-round').innerHTML);
    const list = PANES.filter(([k]) => (k !== 'round' || hasRound) && (k !== 'tbl' || !wide()));
    if (want) pane = want;
    if (!list.some(([k]) => k === pane)) pane = list[0][0];
    box.dataset.tab = pane;
    el.innerHTML = list.map(([k, n]) => '<button role="tab" data-p="' + k + '"' + (k === pane ? ' class="on" aria-selected="true"' : '') + '>' + n + '</button>').join('');
    el.querySelectorAll('button').forEach(b => { b.onclick = () => { sfx('tap'); nav(b.dataset.p); if (pane === 'tbl') { tblKey = null; table(); } }; });
  }

  // Classificação: liga (com zonas) ou o grupo do continental. tab: a tabela do motor; live: placares parciais a somar
  let tblKey = null, rowEl = null, tblView = 'lg';
  function standings(view, live) {
    const fc = G.c.fc, L = view === 'lg' ? fc.lg : { ids: fc.cont.group, tab: fc.cont.gtab };
    const tab = L.tab.map(x => Object.assign({}, x));
    if (live) live.forEach(([a, b, gh, ga]) => {
      const A = tab[a], B = tab[b];
      A.j++; B.j++; A.gp += gh; A.gc += ga; B.gp += ga; B.gc += gh;
      if (gh > ga) { A.p += 3; A.v++; B.d++; } else if (gh < ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
    });
    return S.fcOrder(tab).map(i => Object.assign({ i, id: L.ids[i] }, tab[i]));
  }
  function table(live) {
    const fc = G.c.fc, view = tblView === 'cont' && fc.cont && fc.cont.gtab ? 'cont' : 'lg', box = $('fc-tbl');
    if (!box) return 0;
    const rows = standings(view, live && live[view]), n = rows.length;
    const zone = view === 'cont' ? pos => (pos <= 2 ? ' z-up' : '') : pos => (fc.lg.promo && pos <= fc.lg.promo ? ' z-up' : fc.lg.releg && pos > n - fc.lg.releg ? ' z-down' : !fc.lg.promo && pos === 1 ? ' z-top' : '');
    // Montada uma vez por tabela; depois as linhas só trocam de lugar e de números (os escudos não piscam)
    const fresh = tblKey !== view;
    if (fresh) {
      tblKey = view; rowEl = {};
      box.innerHTML = '<div class="fs-th"><i>#</i><span>Time</span><b>P</b><em>J</em><em>V</em><em>SG</em></div><div class="fs-rows"></div>' +
        '<p class="fs-legend">' + (view === 'cont' ? '<span class="z-up">Mata-mata</span>' : (fc.lg.promo ? '<span class="z-up">Acesso</span>' : '<span class="z-top">Título</span>') + (fc.lg.releg ? '<span class="z-down">Rebaixamento</span>' : '')) + '</p>';
      rows.forEach(x => { const d = document.createElement('div'); d.innerHTML = '<i></i>' + crest(x.id, 'xs') + '<span>' + esc(nameOf(x.id)) + '</span><b></b><em></em><em></em><em></em>'; rowEl[x.i] = d; });
    }
    const list = box.querySelector('.fs-rows');
    rows.forEach((x, j) => {
      const d = rowEl[x.i], ch = d.children, sg = x.gp - x.gc;
      d.className = 'fs-tr' + zone(j + 1) + (x.i === 0 ? ' me' : '');
      ch[0].textContent = j + 1; ch[3].textContent = x.p; ch[4].textContent = x.j; ch[5].textContent = x.v; ch[6].textContent = (sg > 0 ? '+' : '') + sg;
      if (list.children[j] !== d) list.insertBefore(d, list.children[j] || null);
    });
    // Só ao montar: a sua linha no meio do quadro (depois, quem rola é você). Medida pela tela, dividida pelo zoom
    const mine = box.querySelector('.me');
    if (fresh && mine && box.scrollHeight > box.clientHeight) {
      const zk = U.zk ? U.zk() : 1, a = mine.getBoundingClientRect(), b = box.getBoundingClientRect();
      box.scrollTop += (a.top - b.top) / zk - box.clientHeight / 2 + a.height / zk / 2;
    }
    return rows.findIndex(x => x.i === 0) + 1;
  }
  function tabs() {
    const fc = G.c.fc, el = $('fc-tabs');
    if (!fc.cont || !fc.cont.gtab || fc.cont.md.length === 0) { el.innerHTML = '<div class="fc-tl">' + esc(fc.lg.name) + '</div>'; return; }
    el.innerHTML = '<div class="seg fc-seg"><button data-v="lg"' + (tblView === 'lg' ? ' class="on"' : '') + '>' + esc(fc.lg.name) + '</button><button data-v="cont"' + (tblView === 'cont' ? ' class="on"' : '') + '>Grupo · ' + esc(fc.cont.name) + '</button></div>';
    el.querySelectorAll('button').forEach(b => { b.onclick = () => { tblView = b.dataset.v; tabs(); table(); }; });
  }

  // Cartão do jogo: o próximo (antes), ao vivo ou o resultado
  function card(state, x, t) {
    const fc = G.c.fc, my = G.c.club;
    if (!x.vs) return '<div class="fs-bye">' + (state === 'live' ? 'Rodada ao vivo · <span id="fc-lt">' + clock(t) + '</span>. ' : '') + 'Seu time folga nesta rodada.</div>';
    const h = x.home ? my : x.vs, a = x.home ? x.vs : my;
    const side = id => '<div class="fs-tm' + (id === my ? ' me' : '') + '">' + crest(id, 'md') + '<span>' + esc(nameOf(id)) + '</span></div>';
    const tag = esc(x.compName) + ' · ' + esc(x.stage);
    if (state === 'next') {
      const who = x.injury ? 'Lesionado (' + esc(x.injury) + '): fora deste jogo' : x.on ? 'Você começa jogando' : x.why === 'banco' ? 'Você fica no banco' : 'O técnico vai poupar você neste jogo';
      return '<div class="fs-card next' + (x.moment ? ' dec' : '') + '"><div class="fs-lbl">' + tag + '</div><div class="fs-sc">' + side(h) + '<b><i>×</i></b>' + side(a) + '</div>' +
        '<p class="fs-line">' + (x.home ? 'Em casa' : 'Fora de casa') + ' · ' + who + '</p>' + (x.moment ? '<p class="fc-dec">' + U.emo('🎯', 'xs') + ' Jogo com lance decisivo seu</p>' : '') + '</div>';
    }
    const live = state === 'live', m = x.res;
    const [gh, ga] = live ? x.score(t) : x.home ? [m.gf, m.ga] : [m.ga, m.gf];
    const mf = x.home ? gh : ga, mg = x.home ? ga : gh, out = m.won && x.knock ? 'win' : mf > mg ? 'win' : mf < mg ? 'loss' : x.knock && !live ? (m.won ? 'win' : 'loss') : 'draw';
    const lbl = live ? '<span class="fs-dot" aria-hidden="true"></span><span id="fc-lt">' + tag + ' · ' + clock(t) + '</span>'
      : tag + ' · ' + (out === 'win' ? 'Vitória' : out === 'loss' ? 'Derrota' : 'Empate') + (m.pens ? ' nos pênaltis' : '');
    const evs = side2 => m.ev.filter(e => e.s === side2 && e.m <= (live ? t : 99)).map(play1).join('');
    const line = !m.on ? (x.injury ? 'Lesionado: fora deste jogo' : 'Você não entrou em campo')
      : live ? 'Você está em campo'
      : [m.goals ? m.goals + (m.goals === 1 ? ' gol' : ' gols') : '', m.assists ? m.assists + (m.assists === 1 ? ' assistência' : ' assistências') : '', 'nota ' + rate(m.rating)].filter(Boolean).join(' · ');
    return '<div class="fs-card ' + (live ? 'live' : out) + '"><div class="fs-lbl">' + lbl + '</div>' +
      '<div class="fs-sc">' + side(h) + '<b><span id="fc-sh">' + gh + '</span><i>×</i><span id="fc-sa">' + ga + '</span></b>' + side(a) + '</div>' +
      '<div class="fs-ev2"><ul class="fs-ev" id="fc-evh">' + evs('h') + '</ul><ul class="fs-ev a" id="fc-eva">' + evs('a') + '</ul></div>' +
      '<p class="fs-line">' + line + '</p></div>';
  }
  function play1(e) {
    const who = esc(G.c.name);
    return '<li class="' + (e.me || e.as ? 'me' : '') + '"><i>' + clock(e.m) + '</i><span>' + (e.me ? 'Gol de ' + who : e.as ? 'Gol, assistência de ' + who : 'Gol') + '</span></li>';
  }

  // Pontos de evolução: a fração do ano enche a barra; com 1 ponto inteiro, dá para evoluir agora
  function peBox() {
    const c = G.c, fc = c.fc, whole = c.pe || 0;
    const can = whole >= 1 && S.canInvestAny(c);
    $('fc-pe').innerHTML = '<div class="fc-pe-row"><span>Evolução</span><div class="fc-pe-bar"><i style="width:' + Math.round(fc.peFrac * 100) + '%"></i></div><b>' + num1(whole + fc.peFrac) + '</b>' +
      (can ? '<button class="btn ghost fc-evo" id="fc-evo">Evoluir</button>' : '') + '</div>' +
      (can ? '' : '<p>Todo jogo enche a barra, e nota alta enche mais. Com 1 ponto inteiro, dá para evoluir.</p>');
    if ($('fc-evo')) $('fc-evo').onclick = evolve;
  }
  function meBox() {
    const A = G.c.fc.acc, gk = G.c.pos === 'GOL' || G.c.pos === 'ZAG';
    $('fc-me').innerHTML = '<div><b>' + A.games + '</b><span>Jogos</span></div>' + (gk ? '<div><b>' + A.cs + '</b><span>Sem sofrer gol</span></div>' : '<div><b>' + A.goals + '</b><span>Gols</span></div>') +
      '<div><b>' + A.assists + '</b><span>Assist.</span></div><div><b>' + (A.games ? rate(A.rsum / A.games) : '–') + '</b><span>Nota</span></div>';
  }
  // Situação em cada competição
  function compsBox(pos) {
    const fc = G.c.fc, cup = fc.cup, ct = fc.cont;
    const st = (o, list, lostAt, cur) => (o === 'won' ? 'Campeão!' : o === 'lost' ? 'Eliminado: ' + list[lostAt].toLowerCase() : o === 'group' ? 'Eliminado na fase de grupos' : cur);
    const nextSt = (k, list) => { const e = fc.cal.slice(fc.i).find(x => x.k === k); return e ? list[e.st] : '—'; };
    const items = [[fc.lg.name, pos ? pos + 'º lugar · ' + fc.lg.tab[0].p + ' pts' : 'Começa já'],
      [cup.name, st(cup.out, S.FC_CUP_ST, cup.lostAt, 'Próxima: ' + nextSt('cup', S.FC_CUP_ST).toLowerCase())]];
    if (ct) items.push([ct.name, st(ct.out, S.FC_CONT_ST, ct.lostAt, 'Próxima: ' + nextSt('cont', S.FC_CONT_ST).toLowerCase())]);
    $('fc-comps').innerHTML = items.map(([n, s]) => '<div class="fc-comp' + (/Campeão/.test(s) ? ' won' : /Eliminado/.test(s) ? ' out' : '') + '"><span>' + esc(n) + '</span><b>' + esc(s) + '</b></div>').join('');
  }
  // Calendário: os últimos resultados e os próximos jogos
  function calBox() {
    const fc = G.c.fc, past = fc.log.slice(-3), next = S.fcPreview(G.c, 5).slice(1);
    const tag = k => '<em class="fc-k ' + k + '">' + (k === 'lg' ? 'Liga' : k === 'cup' ? 'Copa' : 'Cont.') + '</em>';
    $('fc-cal').innerHTML = '<div class="fs-rlbl">Calendário</div>' +
      past.map(l => '<div class="fc-ci done">' + tag(l.comp) + crest(l.vs, 'xs') + '<span>' + (l.home ? '' : '@ ') + esc(nameOf(l.vs)) + '</span><b class="' + (l.won || l.gf > l.ga ? 'up' : l.gf < l.ga ? 'down' : '') + '">' + l.gf + '–' + l.ga + (l.pens ? ' (p)' : '') + '</b></div>').join('') +
      next.map(p => '<div class="fc-ci">' + tag(p.k) + (p.vs ? crest(p.vs, 'xs') + '<span>' + (p.home ? '' : '@ ') + esc(nameOf(p.vs)) + '</span>' : '<i></i><span>' + esc(p.bye ? 'Folga' : 'Adversário no sorteio') + '</span>') + '<b>' + esc(p.stage.replace(/^Grupo · /, 'G ')) + '</b></div>').join('');
  }

  function paint() {
    const c = G.c, nx = S.fcNext(c);
    if (!nx) return finishSeason();
    const pos = table(); tabs();
    $('fc-h').textContent = 'Próximo jogo';
    $('fc-match').innerHTML = card('next', nx);
    peBox(); meBox(); compsBox(pos); calBox();
    $('fc-round').innerHTML = '';
    nav();
    $('fc-acts').innerHTML = '<button class="btn" id="fc-play">' + (nx.moment ? 'Jogar a decisão' : 'Jogar') + '</button>' +
      '<div class="fs-skip"><button class="btn ghost" id="fc-5">Simular 5 jogos</button><button class="btn ghost" id="fc-end">Simular até o fim</button></div>';
    $('fc-play').onclick = () => start(nx);
    $('fc-5').onclick = () => quick(5);
    $('fc-end').onclick = () => quick(999);
  }

  // Simula sem o ao vivo; para antes de jogo com lance decisivo (esse você joga) e nas datas de evento
  function quick(n) {
    const c = G.c;
    let k = 0, nx;
    while (k < n && (nx = S.fcNext(c)) && !(k > 0 && (nx.moment || S.fcEventDue(c)))) {
      if (nx.moment) { S.fcAutoMoment(c, nx.moment); }
      const out = S.fcPlay(c); k++;
      if (out && out.title) { save(); return celebrate(out, paintOrEnd); }
    }
    sfx('whistle'); save();
    paintOrEnd();
  }
  const paintOrEnd = () => (G.c.fc.done ? finishSeason() : hub());

  // Joga o próximo: com lance decisivo, o minigame vem primeiro (o resultado decide o jogo); depois o jogo ao vivo
  function start(nx) {
    if (nx.moment) {
      const m = nx.moment;
      if (m.started || U.cfg.moments === 'auto') { S.fcAutoMoment(G.c, m); save(); return live(); }
      save();
      return U.momentIntro(m);
    }
    live();
  }
  // Depois do lance (ui/match.js chama): o jogo ao vivo, já com o resultado que o lance decidiu
  function afterMoment() { if ($('fc-match')) live(); else { hub(); live(); } }

  // ---------- jogo ao vivo ----------
  function live() {
    const c = G.c;
    if (!$('fc-match')) hub();
    const nx = S.fcNext(c);
    if (!nx) return finishSeason();
    // Tabela antes do jogo (o ao vivo soma os placares parciais por cima dela)
    const out = S.fcPlay(c);
    save();
    const x = Object.assign({}, nx, { res: out.my });
    const lg = nx.e.k === 'lg', grp = nx.e.k === 'cont' && nx.e.st < 6;
    const idx = (ids, id) => ids.indexOf(id);
    // Jogos que mexem na tabela durante o ao vivo: [índice mandante, índice visitante, jogo]
    const games = [];
    if (lg) {
      if (out.mine) games.push([idx(c.fc.lg.ids, out.mine.h), idx(c.fc.lg.ids, out.mine.a), out.mine]);
      out.others.forEach(g => games.push([idx(c.fc.lg.ids, g.h), idx(c.fc.lg.ids, g.a), g]));
    } else if (grp) {
      const G4 = c.fc.cont.group, my = out.my;
      games.push([idx(G4, my.home ? c.club : my.vs), idx(G4, my.home ? my.vs : c.club), { ev: my.ev }]);
      out.others.forEach(g => games.push([idx(G4, g.h), idx(G4, g.a), g]));
    }
    const part = (g, t) => { let h = 0, a = 0; g.ev.forEach(e => { if (e.m <= t) { if (e.s === 'h') h++; else a++; } }); return [h, a]; };
    // O motor já somou o jogo na tabela: o ao vivo mostra a de antes mais os placares parciais
    const undo = lg ? 'lg' : grp ? 'cont' : null, view = undo === 'cont' ? 'cont' : 'lg';
    if (undo) games.forEach(([a, b, g]) => sub(undo === 'lg' ? c.fc.lg.tab : c.fc.cont.gtab, a, b, part(g, 99)));
    if (grp) tblView = 'cont'; else if (lg) tblView = 'lg';
    tblKey = null; tabs();
    x.score = t => (out.my ? part({ ev: out.my.ev }, t) : [0, 0]);
    const end = Math.max(90, ...[out.my].concat(out.others).filter(Boolean).map(g => (g.ev.length ? g.ev[g.ev.length - 1].m : 0)));
    let t = 0, half = false, timer = 0;
    $('fc-h').textContent = nx.compName + ' · ao vivo';
    $('fc-match').innerHTML = card('live', x, 0);
    // Outros jogos da rodada (liga e grupo); na copa e no mata-mata, os outros confrontos da fase
    $('fc-round').innerHTML = out.others.length ? '<div class="fs-rlbl">' + (lg ? 'Outros jogos da rodada' : grp ? 'O outro jogo do grupo' : 'Outros confrontos da fase') + '</div>' +
      out.others.map((g, k) => '<div class="fs-rr" data-k="' + k + '"><span>' + esc(nameOf(g.h)) + '</span>' + crest(g.h, 'xs') + '<b>0 × 0</b>' + crest(g.a, 'xs') + '<span>' + esc(nameOf(g.a)) + '</span></div>').join('') : '';
    $('fc-acts').innerHTML = '<div class="fs-skip"><button class="btn ghost' + (fast ? ' on' : '') + '" id="fc-fast">' + (fast ? 'Velocidade normal' : 'Mais rápido') + '</button><button class="btn ghost" id="fc-skip">Fim do jogo</button></div>';
    $('fc-fast').onclick = () => { fast = !fast; $('fc-fast').textContent = fast ? 'Velocidade normal' : 'Mais rápido'; $('fc-fast').classList.toggle('on', fast); };
    $('fc-skip').onclick = () => { t = end; frame(); done(); };
    if ($('fc-evo')) $('fc-evo').remove(); // evoluir só entre os jogos
    // Ao vivo: a rodada primeiro (a tabela mexendo fica na aba ao lado; em tela larga, do lado)
    nav(out.others.length ? 'round' : null);
    $('fc-match').scrollIntoView({ block: 'nearest' });
    sfx('whistle');
    const liveTab = () => ({ [view]: games.map(([a, b, g]) => [a, b].concat(part(g, t))) });
    function frame() {
      const lt = $('fc-lt'); if (lt) lt.textContent = (half ? 'Intervalo' : t >= end ? 'Fim de jogo' : esc(nx.compName) + ' · ' + clock(t));
      if (out.my && $('fc-sh')) {
        const [h, a] = x.score(t); $('fc-sh').textContent = h; $('fc-sa').textContent = a;
        out.my.ev.filter(e => e.m === t).forEach(e => { $(e.s === 'h' ? 'fc-evh' : 'fc-eva').insertAdjacentHTML('beforeend', play1(e)); if ((e.s === 'h') === nx.home) sfx('cheer'); });
      }
      let goal = false;
      document.querySelectorAll('#fc-round .fs-rr').forEach(el => {
        const g = out.others[+el.dataset.k], [h, a] = part(g, t);
        el.querySelector('b').textContent = h + ' × ' + a;
        el.classList.toggle('hot', g.ev.some(e => e.m <= t && e.m > t - 5));
        if (g.ev.some(e => e.m === t)) goal = true;
      });
      if (undo && (goal || t <= 1 || (out.my && out.my.ev.some(e => e.m === t)))) table(liveTab());
    }
    function tick() {
      if (!$('fc-match')) return; // saiu da tela: o jogo já está salvo
      if (t === 45 && !half) { half = true; sfx('whistle'); frame(); timer = setTimeout(tick, fast ? 600 : 1800); return; }
      half = false; t++;
      frame();
      if (t >= end) return done();
      timer = setTimeout(tick, PACE[fast ? 1 : 0]);
    }
    let finished = false;
    function done() {
      if (finished) return; finished = true;
      clearTimeout(timer);
      // A tabela volta a ter o jogo somado
      if (undo) games.forEach(([a, b, g]) => add(undo === 'lg' ? c.fc.lg.tab : c.fc.cont.gtab, a, b, part(g, 99)));
      sfx('whistle');
      result(x, out);
    }
    timer = setTimeout(tick, 400);
  }
  const sub = (tab, a, b, [gh, ga]) => {
    const A = tab[a], B = tab[b];
    A.j--; B.j--; A.gp -= gh; A.gc -= ga; B.gp -= ga; B.gc -= gh;
    if (gh > ga) { A.p -= 3; A.v--; B.d--; } else if (gh < ga) { B.p -= 3; B.v--; A.d--; } else { A.p--; B.p--; A.e--; B.e--; }
  };
  const add = (tab, a, b, [gh, ga]) => {
    const A = tab[a], B = tab[b];
    A.j++; B.j++; A.gp += gh; A.gc += ga; B.gp += ga; B.gc += gh;
    if (gh > ga) { A.p += 3; A.v++; B.d++; } else if (gh < ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
  };

  // Resultado: o cartão do jogo, os pontos ganhos e "Próximo jogo"
  function result(x, out) {
    tblKey = null; const pos = table(); tabs(); nav();
    $('fc-h').textContent = x.compName + ' · fim de jogo';
    $('fc-match').innerHTML = x.vs ? card('done', x) : card('done', x);
    peBox(); meBox(); compsBox(pos); calBox();
    const gain = out.pe ? '<p class="fc-gain">+' + num1(out.pe) + ' de evolução</p>' : '';
    $('fc-acts').innerHTML = gain + '<button class="btn" id="fc-next">' + (G.c.fc.done ? 'Ver resumo da temporada' : 'Próximo jogo') + '</button>';
    $('fc-next').onclick = () => (out.title ? celebrate(out, paintOrEnd) : paintOrEnd());
  }
  // Taça ganha: tela curta de festa
  function celebrate(out, next) {
    sfx('fanfare');
    render('<div class="fc-cup"><div class="eyebrow">Campeão</div>' + U.trophy(U.titleType(out.title), 120, out.title.name) + '<h2>' + esc(out.title.name) + '</h2>' +
      '<p>' + esc(nameOf(G.c.club)) + ' levanta a taça.' + (out.my && out.my.on ? ' Você estava em campo.' : '') + '</p><button class="btn" id="fc-go">Seguir</button></div>', { center: true });
    $('fc-go').onclick = next;
  }

  // ---------- evoluir no meio da temporada ----------
  function evolve() {
    const c = G.c, E = S.eff(c);
    const rows = D.INVEST.filter(t => (c.inv[t.id] || 0) < S.investMax(t.id) && !S.investCapped(c, t.id));
    render('<button class="back-link" id="fc-back">‹ Voltar à temporada</button><div class="eyebrow">Evoluir</div><h2>Gaste seus pontos</h2>' +
      '<p class="fc-sub">Você tem <b>' + (c.pe || 0) + '</b> ' + ((c.pe || 0) === 1 ? 'ponto' : 'pontos') + '. O que você compra agora já vale no próximo jogo.</p>' +
      '<div class="fc-inv">' + rows.map(t => { const p = S.investPrice(c, t.id), ok = S.canInvest(c, t.id), at = t.attr ? Object.keys(t.attr)[0] : null;
        return '<button class="fc-iv' + (ok ? '' : ' off') + '" data-id="' + t.id + '"' + (ok ? '' : ' disabled') + '><span><b>' + esc(t.name) + '</b><small>' + (at ? esc(D.ATTR_LABEL[at]) + ' ' + Math.round(E[at]) + ' → ' + Math.round(E[at] + t.attr[at]) : 'Menos lesão') + '</small></span><em>' + p + (p === 1 ? ' ponto' : ' pontos') + '</em></button>'; }).join('') + '</div>');
    $('fc-back').onclick = hub;
    document.querySelectorAll('.fc-iv:not(.off)').forEach(b => { b.onclick = () => { if (S.invest(c, b.dataset.id)) { sfx('levelup'); save(); bar(); evolve(); } }; });
  }

  // ---------- fim do calendário ----------
  function finishSeason() {
    if (!G.c.fc.done) S.fcFinish(G.c);
    save();
    U.season();
  }

  Object.assign(U, { fcHub: hub, fcAfterMoment: afterMoment });
})();
