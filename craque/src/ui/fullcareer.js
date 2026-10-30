// Interface — Carreira Jogo a Jogo (c.mode 'completa'; motor em engine/fullcareer.js). O centro é a prancheta do
// técnico: o próximo jogo, a escalação com você, o que falta fazer antes do jogo e os atalhos (treino, tabela, jogos,
// ficha, loja, palpites do Zé). Cada jogo passa ao vivo (relógio de 0' a 90', placares e tabela mudando) e termina
// na capa do jornal. Finais e o clássico abrem o lance decisivo antes do jogo. No fim do calendário, o resumo de sempre.
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, sfx, $, esc, crest, year, save, render, bar } = U;

  const nameOf = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].name : '?');
  const rate = r => r.toFixed(1).replace('.', ',');
  const num2 = x => String(Math.round(x * 100) / 100).replace('.', ',');
  const num1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  const clock = t => (t > 90 ? '90+' + (t - 90) : t) + "'";
  const PACE = [330, 110]; // milissegundos por minuto de jogo: normal (~30 s) e rápido (~10 s)
  let fast = false;
  // Em tela larga a tabela fica ao lado do jogo ao vivo
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 1000px) and (min-height: 560px)').matches;

  // ---------- prancheta (tela central) ----------
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
    // Semana automática: fecha sozinha e a prancheta mostra o que foi feito
    if (c.fc.wkDue && c.fcAuto) { S.fcWeek(c); save(); }
    const nx = S.fcNext(c), fc = c.fc;
    const lg = standings('lg'), posOf = id => lg.findIndex(x => x.id === id) + 1, me = posOf(c.club);
    const vsPos = nx.vs && nx.e.k === 'lg' ? posOf(nx.vs) : 0;
    const tag = nx.vs ? (nx.home ? 'em casa' : 'fora') + (vsPos ? ' · ' + vsPos + 'º contra ' + me + 'º' : '') : '';
    render('<div class="prc" id="fc">' +
      '<div class="prc-cols"><div class="prc-board"><div class="prc-felt">' +
        '<p class="prc-hand">' + (nx.vs ? esc(nx.compName) + ' · ' + esc(nx.stage) + '<br><span>x ' + esc(nameOf(nx.vs)) + ', ' + tag + '</span>' : 'Seu time folga nesta rodada') + '</p>' +
        pitch(c, nx) +
        '<div class="prc-chips">' + chips(c) + '</div>' +
      '</div></div>' +
      '<div class="prc-right">' + todo(c, nx) +
        '<div class="prc-ics">' + [['tbl', '📊', 'Tabela'], ['cal', '📋', 'Jogos'], ['me', '📈', 'Ficha'], ['shop', '🏷️', 'Loja'], ['bet', '🎰', 'Palpites']].map(([k, e, n]) =>
          '<button class="prc-ic' + (k === 'bet' ? ' ze' : '') + '" data-go="' + k + '">' + U.emo(e, 'md') + '<span>' + n + '</span></button>').join('') + '</div>' +
        '<button class="prc-tk" id="fc-play"><span class="prc-tk-m"><b>' + (nx.moment ? 'Jogar a decisão' : nx.vs ? 'Jogar' : 'Seguir') + '</b><small>' +
          (nx.vs ? esc(nameOf(nx.home ? c.club : nx.vs)) + ' × ' + esc(nameOf(nx.home ? nx.vs : c.club)) : esc(nx.compName)) + '</small></span><span class="prc-tk-s"><small>jogo</small><b>' + (fc.i + 1) + '</b></span></button>' +
        '<div class="prc-sim"><button class="link-btn" id="fc-5">Simular 5 jogos</button><button class="link-btn" id="fc-end">Simular até o fim</button></div>' +
      '</div></div></div>');
    document.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { sfx('tap'); go(b.dataset.go); }; });
    $('fc-play').onclick = () => { if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); } start(S.fcNext(G.c)); };
    $('fc-5').onclick = () => quick(5);
    $('fc-end').onclick = () => quick(999);
  }
  // Campinho da prancheta: o elenco em 4-3-3 com nome e nota. Na sua posição, a briga pela vaga: você contra o
  // concorrente (nota perto da força do clube, a mesma conta do papel no elenco) e a chance de começar
  const SLOT = { GOL: 0, ZAG: 2, MEI: 6, ATA: 9 };
  const SPOTS = [[50, 91], [12, 70], [37, 76], [63, 76], [88, 70], [20, 47], [50, 53], [80, 47], [16, 18], [50, 11], [84, 18]];
  const LINE = ['GOL', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];
  let squadK = '', squadV = null;
  // Elenco do clube na temporada: sempre o mesmo para o mesmo clube e ano (só aparência; o motor não usa)
  function squad(c) {
    const fc = c.fc, club = D.CLUB_BY_ID[fc.club], k = fc.club + ':' + fc.season + ':' + (c.tseed || 0);
    if (k === squadK) return squadV;
    const r = S.rng((Math.imul(Number(c.tseed) || 1, 40503) ^ (fc.season * 7919) ^ (club.strength * 131)) >>> 0);
    const ct = D.countryOf(club), used = new Set([c.name]);
    const name = () => { let n = ''; for (let i = 0; i < 8 && (!n || used.has(n)); i++) n = D.randomName(r() < 0.85 ? ct : 'Brasil', r); used.add(n); return n; };
    const st = club.strength, nota = d => Math.max(35, Math.min(94, Math.round(st + d)));
    const xi = LINE.map(() => ({ n: name(), v: nota(r.range(-4, 3)) }));
    const bench = [0, 1, 2].map(() => ({ n: name(), v: nota(r.range(-9, -3)) }));
    const rival = { n: name(), v: nota(0) }; // o dono da sua posição: nota = força do clube
    return (squadK = k, squadV = { xi, bench, rival });
  }
  const short = n => { const w = n.split(' '); return w.length > 1 && w[w.length - 1].length > 2 ? w[w.length - 1] : n; };
  function pitch(c, nx) {
    const sq = squad(c), mine = SLOT[c.pos], o = S.ovr(c);
    const on = nx.vs && nx.on && !nx.injury, tbd = nx.vs && nx.on === null && !nx.injury, iIn = on || tbd; // tbd: a escalação sai depois da semana
    const pl = (cls, txt, nm, sty) => '<i class="' + cls + '"' + (sty || '') + '>' + txt + (nm ? '<em>' + esc(short(nm)) + '</em>' : '') + '</i>';
    const at = ([x, y]) => ' style="left:' + x + '%;top:' + y + '%"';
    const dots = SPOTS.map((p, k) => k !== mine ? pl('', sq.xi[k].v, sq.xi[k].n, at(p))
      : iIn ? pl('me' + (tbd ? ' tbd' : ''), c.number || o, 'Você', at(p)) : pl('cv', sq.rival.v, sq.rival.n, at(p))).join('');
    const bench = [iIn ? pl('cv', sq.rival.v, sq.rival.n) : nx.injury ? pl('out', '+', 'DM') : pl('me', c.number || o, 'Você')].concat(sq.bench.map(b => pl('', b.v, b.n))).join('');
    const why = !nx.vs ? 'folga' : nx.injury ? (/suspensão/.test(nx.injury) ? 'suspenso' : 'lesionado') + (nx.injLeft > 1 ? ', fora por ' + nx.injLeft + ' jogos' : ', volta no próximo') : nx.on ? 'titular' : nx.on === null ? 'escalação depois da semana' : nx.why === 'cansaço' ? 'poupado: energia baixa' : nx.why === 'banco' ? 'no banco' : 'poupado';
    // A briga pela vaga: nota sua × nota do concorrente e a chance de começar (o que mexe nela vem junto)
    const p = Math.round(S.fcStartP(c) * 100), en = c.fc.en === undefined ? 100 : c.fc.en;
    const tip = en < S.FC_EN_OUT ? 'Energia abaixo de ' + S.FC_EN_OUT + ': o técnico pode te poupar.' : o < sq.rival.v ? 'Sobe com a sua nota geral e com o técnico do seu lado.' : c.rel.coach < 50 ? 'Sobe com o técnico do seu lado.' : 'A vaga é sua: mantenha a energia.';
    const duel = nx.vs && !nx.injury ? '<div class="prc-duel"><span>Briga pela vaga</span><b>Você ' + o + '</b><s>×</s><b>' + esc(short(sq.rival.n)) + ' ' + sq.rival.v + '</b><strong>' + p + '%</strong><small>' + (nx.on === null ? 'chance de começar' : 'chance de começar o jogo seguinte') + '</small><p>' + esc(tip) + '</p></div>' : '';
    return '<div class="prc-pitch-w"><div class="prc-pitch" aria-hidden="true"><s class="mid"></s><s class="ctr"></s><s class="box t"></s><s class="box b"></s>' + dots + '</div>' +
      '<div class="prc-bench"><small>Banco</small>' + bench + '</div></div>' +
      '<p class="prc-hand prc-st ' + (on ? 'ok' : nx.on === null && !nx.injury ? '' : 'no') + '">' + (c.number ? c.number + ': ' : '') + esc(why) + '</p>' + duel;
  }
  function chips(c) {
    const fc = c.fc, en = Math.round(fc.en === undefined ? 100 : fc.en);
    return '<span class="' + (en < S.FC_EN_OUT ? 'bad' : en < S.FC_EN_LOW ? 'warn' : '') + '">Energia ' + en + '</span><span>Forma: ' + formTxt(fc.fo || 0).toLowerCase() + '</span>' +
      '<span>Técnico ' + Math.round(c.rel.coach) + '</span><span>Torcida ' + Math.round(c.rel.fans) + '</span>';
  }
  // O bilhete "Antes do jogo": o que falta fazer, cada item leva para a tela dele
  function todo(c, nx) {
    const fc = c.fc, items = [];
    const it = (go, txt, tag, cls, done) => items.push('<button class="prc-td' + (done ? ' done' : '') + '"' + (go ? ' data-go="' + go + '"' : ' disabled') + '><i aria-hidden="true">' + (done ? U.ICON.check : '') + '</i><span>' + esc(txt) + '</span>' + (tag ? '<em class="' + (cls || '') + '">' + esc(tag) + '</em>' : '') + '</button>');
    if (fc.wkDue) it('wk', fc.injOut > 0 && !S.fcSuspended(c) ? 'Fisioterapia e treino da semana' : 'Escolher o treino da semana', '0/2', 'red');
    else if (fc.wkSum && fc.wkSum.at === fc.i) it('wk', 'Semana: ' + fc.wkSum.acts.map(id => (S.FC_WEEK.find(a => a.id === id) || { name: id }).name.toLowerCase()).join(' + '), '', '', true);
    if ((c.pe || 0) >= 1 && S.canInvestAny(c)) it('evo', 'Gastar ' + c.pe + (c.pe === 1 ? ' ponto' : ' pontos') + ' na ficha', '+' + c.pe, 'gold');
    if ((fc.en === undefined ? 100 : fc.en) < S.FC_EN_LOW && fc.wkDue) it('wk', 'Descansar: energia ' + Math.round(fc.en), '', 'red');
    if (fc.bet) it('bet', 'Palpite com o Zé: ' + (fc.bet.pick === 1 ? 'empate' : nameOf(fc.bet.pick === 0 ? fc.bet.h : fc.bet.a)), '', '', true);
    if (!items.length) it(null, 'Tudo pronto. Bom jogo!', '', '', true);
    return '<div class="prc-note"><b class="prc-hand">Antes do jogo:</b>' + items.join('') + '</div>';
  }
  // Atalhos da prancheta: cada um abre uma tela com volta para a prancheta
  const TITLE = { wk: 'Treino da semana', tbl: 'Tabela', cal: 'Jogos e torneios', me: 'Ficha', shop: 'Loja', bet: 'Palpites do Zé' };
  function go(k) {
    if (k === 'evo') return evolve();
    const c = G.c, body = {
      wk: '<div class="fc-wk" id="fc-wk"></div><div class="fs-acts" id="fc-acts"></div>',
      tbl: '<div class="fc-tabs" id="fc-tabs"></div><div class="fs-tbl" id="fc-tbl"></div>',
      cal: '<div class="fc-comps" id="fc-comps"></div><div class="fc-cal" id="fc-cal"></div>',
      me: '<div class="fs-me" id="fc-me"></div><div class="fc-pe" id="fc-pe"></div>',
      shop: '<div class="fc-shop" id="fc-shop"></div>',
      bet: '<div class="fc-shop" id="fc-bet"></div>',
    }[k];
    render('<div class="fc-scr" id="fc-scr"><button class="back-link" id="fc-back">‹ Prancheta</button><h2>' + TITLE[k] + '</h2>' + body + '</div>');
    $('fc-back').onclick = () => { unpick(); hub(); };
    if (k === 'wk') { weekBox(); weekActs(); }
    else if (k === 'tbl') { tblKey = null; table(); tabs(); }
    else if (k === 'cal') { compsBox(standings('lg').findIndex(x => x.i === 0) + 1); calBox(); }
    else if (k === 'me') { meBox(); peBox(); }
    else if (k === 'shop') shopBox();
    else if (k === 'bet') betRender();
    if (c && $('fc-scr')) window.scrollTo(0, 0);
  }
  // Botão da tela de treino: fecha a semana e volta (semana já fechada: só volta)
  function weekActs() {
    const el = $('fc-acts');
    if (!el) return;
    el.innerHTML = '<button class="btn" id="fc-wkgo">' + (G.c.fc.wkDue ? 'Confirmar a semana' : 'Voltar à prancheta') + '</button>';
    $('fc-wkgo').onclick = () => { if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); sfx('tap'); save(); bar(); } unpick(); hub(); };
  }

  // ---------- jogo ao vivo ----------
  // Tela própria: o jogo, a rodada e a tabela (do lado em tela larga)
  function matchView() {
    const c = G.c;
    render(
      '<div class="fs fc live" id="fc">' +
        '<div class="fs-main">' +
          '<div class="eyebrow">Temporada ' + (year()) + ' · ' + esc(nameOf(c.club)) + '</div><h2 id="fc-h"></h2>' +
          '<div class="fs-match" id="fc-match"></div>' +
          '<div class="fc-wk" id="fc-wk"></div>' +
          '<div class="fs-acts" id="fc-acts"></div>' +
          '<div class="fs-round" id="fc-round"></div>' +
        '</div>' +
        '<div class="fs-side"><div class="fc-tabs" id="fc-tabs"></div><div class="fs-tbl" id="fc-tbl"></div></div>' +
      '</div>'
    );
    tblKey = null;
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
      const who = x.week ? 'A escalação sai depois da sua semana' : x.injury ? (/suspensão/.test(x.injury) ? 'Suspenso (aposta): ' : 'Lesionado (' + esc(x.injury) + '): ') + (x.injLeft > 1 ? 'fora por mais ' + x.injLeft + ' jogos' : 'volta no próximo jogo') : x.on ? 'Você começa jogando' : x.why === 'banco' ? 'Você fica no banco' : x.why === 'cansaço' ? 'Energia baixa: o técnico vai poupar você' : 'O técnico vai poupar você neste jogo';
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
    const can = whole >= 1 && S.canInvestAny(c), yr = S.fcPeYear(c), full = yr >= S.PE_CAP - 0.001;
    // O que a pessoa precisa saber: quanto tem para gastar, quanto ganhou no ano e o limite do ano
    $('fc-pe').innerHTML = '<div class="fc-pe-row"><span>Evolução</span><div class="fc-pe-bar"><i style="width:' + Math.round(fc.peFrac * 100) + '%"></i></div><b>' + num1(whole + fc.peFrac) + '</b>' +
      (can ? '<button class="btn ghost fc-evo" id="fc-evo">Evoluir</button>' : '') + '</div>' +
      '<p>' + (full ? 'Limite do ano atingido: ' + S.PE_CAP + ' de ' + S.PE_CAP + ' pontos. A barra volta a encher na próxima temporada.'
        : 'No ano: ' + num1(yr) + ' de ' + S.PE_CAP + ' pontos (limite). Todo jogo enche a barra, e nota alta enche mais.') +
      (whole >= 1 ? ' Para gastar: ' + whole + (whole === 1 ? ' ponto.' : ' pontos.') : ' Com 1 ponto inteiro, dá para evoluir.') + '</p>';
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

  // ---------- a semana entre os jogos ----------
  // Energia e forma sempre à vista; com a semana aberta, as seis ações (duas por semana) e a energia que fica para o jogo
  let pick = null, touched = false; // touched: a pessoa mexeu (só aí a escolha vira o plano da semana automática)
  const myPick = () => (touched && pick ? pick.slice() : undefined);
  const unpick = () => { pick = null; touched = false; };
  const sgn = (x, f) => (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x));
  function formTxt(fo) { return fo >= 0.8 ? 'Em alta' : fo >= 0.25 ? 'Boa' : fo > -0.25 ? 'Normal' : fo > -0.8 ? 'Em baixa' : 'Má fase'; }
  function wkFx(c, a) {
    const fc = c.fc;
    if (a.id === 'tec') return S.fcWeekOk(c, 'tec', []) ? '+' + num2(0.05) + ' de evolução' : 'Limite de treino do ano';
    if (a.id === 'fis') return 'Cansa menos nos próximos 4 jogos';
    if (a.id === 'rest') return 'Recupera energia';
    if (a.id === 'physio') return 'R$ ' + U.money(S.fcPhysioCost(c)) + (fc.injOut > 0 ? ' · 1 jogo a menos de lesão' : ' · recupera energia');
    if (a.id === 'spons') return '+R$ ' + U.money(S.fcSponsPay(c)) + ' e fama';
    return 'Fama, com risco de polêmica';
  }
  function weekBox(only) { // only: só energia e forma (tela de resultado: a semana vem depois)
    const c = G.c, fc = c.fc, el = $('fc-wk');
    if (!el) return;
    if (fc.en === undefined) { el.innerHTML = ''; return; }
    const lvl = e => (e < S.FC_EN_OUT ? 'out' : e < S.FC_EN_LOW ? 'low' : 'ok');
    const meter = e => '<div class="fc-en ' + lvl(e) + '"><i style="width:' + e + '%"></i></div>';
    const status = '<div class="fc-st"><span>Energia</span>' + meter(fc.en) + '<b class="' + lvl(fc.en) + '">' + Math.round(fc.en) + '</b><span>Forma</span><b class="fo ' + (fc.fo >= 0.25 ? 'up' : fc.fo <= -0.25 ? 'down' : '') + '">' + formTxt(fc.fo || 0) + '</b></div>';
    const auto = '<label class="fc-auto"><input type="checkbox" id="fc-auto"' + (c.fcAuto ? ' checked' : '') + '><span>Semana automática</span></label>';
    if (only) { el.className = 'fc-wk'; el.innerHTML = status; return; }
    if (!fc.wkDue) {
      // Semana fechada: o que ela fez
      const w = fc.wkSum && fc.wkSum.at === fc.i ? fc.wkSum : null, nm = id => S.FC_WEEK.find(a => a.id === id).name;
      const what = w ? '<p class="fc-wk-sum">' + (c.fcAuto ? 'Semana automática: ' : 'Semana: ') + w.acts.map(nm).join(' + ') + ' · energia ' + Math.round(w.en0) + ' → ' + Math.round(w.en1) +
        (w.pe ? ' · +' + num2(w.pe) + ' de evolução' : '') + (w.money > 0 ? ' · +R$ ' + U.money(w.money) : '') + (w.inj ? ' · lesão: 1 jogo a menos' : '') +
        (w.polem ? '. A entrevista virou polêmica e o técnico não gostou.' : '') +
        (w.dropped && w.dropped.length ? '. Sem dinheiro para pagar: ' + w.dropped.map(k => S.FC_SHOP.staff.find(x => x.id === k).name).join(', ') + ' saiu.' : '') + '</p>' : '';
      el.className = 'fc-wk';
      el.innerHTML = status + what + (w ? auto : '');
      bindAuto();
      return;
    }
    if (!pick) pick = S.fcWeekAuto(c);
    pick = pick.map((id, k) => (S.fcWeekOk(c, id, pick.slice(0, k)) ? id : 'rest'));
    const n = id => pick.filter(x => x === id).length;
    const tired = S.fcWeekEnergy(c, pick);
    el.className = 'fc-wk open';
    el.innerHTML = status +
      '<div class="fc-wk-h"><b>Duas ações até o próximo jogo</b>' + auto + '</div>' +
      '<div class="fc-wk-g">' + S.FC_WEEK.map(a => {
        const ok = n(a.id) > 0 || S.fcWeekOk(c, a.id, [pick[1]]); // tocar troca a ação mais antiga
        return '<button class="fc-wa' + (n(a.id) ? ' on' : '') + '" data-id="' + a.id + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + (n(a.id) ? 'true' : 'false') + '">' +
          '<b>' + esc(a.name) + (n(a.id) === 2 ? ' <em>×2</em>' : '') + '</b><small>' + esc(wkFx(c, a)) + '</small><i class="' + (a.en > 0 ? 'up' : 'down') + '">' + sgn(a.en, String) + ' energia</i></button>';
      }).join('') + '</div>' +
      '<p class="fc-wk-p">Energia no próximo jogo: <b class="' + lvl(tired) + '">' + Math.round(tired) + '</b>' +
        (tired < S.FC_EN_OUT ? ' · abaixo de ' + S.FC_EN_OUT + ', o técnico pode poupar você e a lesão fica mais provável' : tired < S.FC_EN_LOW ? ' · abaixo de ' + S.FC_EN_LOW + ', você rende menos' : '') + '</p>';
    // Toque: a ação entra no lugar da mais antiga (tocar duas vezes na mesma vale as duas ações)
    el.querySelectorAll('.fc-wa').forEach(b => { b.onclick = () => { sfx('tap'); pick = [pick[1], b.dataset.id]; touched = true; weekBox(); }; });
    bindAuto();
  }
  function bindAuto() {
    const a = $('fc-auto');
    if (a) a.onchange = () => { G.c.fcAuto = a.checked; if (a.checked && G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); bar(); } save(); weekBox(); weekActs(); };
  }

  // ---------- loja: o dinheiro da carreira vira vantagem nesta carreira ----------
  let gearAttr = null;
  // Aposta: um jogo da próxima rodada (sem o seu time), com o aviso de que atleta apostar é proibido
  let betPick = null, betStake = 0;
  function betBox(c, R) {
    const fc = c.fc, b = fc.bet;
    const head = '<div class="fc-ss"><p class="fc-ze">"Palpite certo, sigilo total." Atleta apostando em futebol é proibido: a cada aposta, há risco de descobrirem. Aí são 4 jogos de suspensão, com técnico e torcida contra.</p>';
    if (b) return head + '<p class="fc-bet-on">Aposta feita: ' + R(b.stake) + ' em ' + (b.pick === 1 ? 'empate' : esc(nameOf(b.pick === 0 ? b.h : b.a))) + ' (' + esc(nameOf(b.h)) + ' × ' + esc(nameOf(b.a)) + '), paga ' + R(Math.round(b.stake * b.odd)) + '. Sai na próxima rodada da liga.</p></div>';
    const g = S.fcBetGame(c);
    if (!g) return head + '<p class="fc-own">Sem rodada da liga pela frente.</p></div>';
    const st = S.fcBetStakes(c);
    if (!st.includes(betStake)) betStake = st[0];
    const lab = ['Vitória ' + nameOf(g.h), 'Empate', 'Vitória ' + nameOf(g.a)];
    return head + '<div class="fc-bet-g">' + crest(g.h, 'xs') + '<span>' + esc(nameOf(g.h)) + ' × ' + esc(nameOf(g.a)) + '</span>' + crest(g.a, 'xs') + '</div>' +
      '<div class="fc-bet-o">' + g.odds.map((o, k) => '<button data-b="' + k + '"' + (betPick === k ? ' class="on"' : '') + '><small>' + esc(lab[k]) + '</small><b>' + o.toFixed(2).replace('.', ',') + '</b></button>').join('') + '</div>' +
      '<div class="seg fc-bet-s">' + st.map(v => '<button data-s="' + v + '"' + (v === betStake ? ' class="on"' : '') + (c.money >= v ? '' : ' disabled') + '>' + R(v) + '</button>').join('') + '</div>' +
      '<button class="btn ghost fc-bet-go" id="fc-bet-go"' + (betPick === null || (c.money || 0) < betStake ? ' disabled' : '') + '>' + (betPick === null ? 'Escolha um resultado' : 'Apostar ' + R(betStake) + ' · paga ' + R(Math.round(betStake * g.odds[betPick]))) + '</button></div>';
  }
  function bindBet() {
    document.querySelectorAll('.fc-bet-o button').forEach(b => { b.onclick = () => { sfx('tap'); betPick = +b.dataset.b; betRender(); }; });
    document.querySelectorAll('.fc-bet-s button').forEach(b => { b.onclick = () => { sfx('tap'); betStake = +b.dataset.s; betRender(); }; });
    const ok = $('fc-bet-go');
    if (ok) ok.onclick = () => { if (S.fcBet(G.c, betPick, betStake)) { sfx('coin'); betPick = null; save(); bar(); betRender(); } };
  }
  function betRender() {
    const el = $('fc-bet');
    if (!el) return;
    el.innerHTML = '<div class="fc-cash"><span>Seu dinheiro</span><b>R$ ' + U.money(G.c.money || 0) + '</b></div>' + betBox(G.c, v => 'R$ ' + U.money(v));
    bindBet();
  }
  function shopBox() {
    const c = G.c, el = $('fc-shop');
    if (!el) return;
    const R = v => 'R$ ' + U.money(v), cash = c.money || 0, attrs = S.fcGearAttrs(c);
    if (!attrs.includes(gearAttr)) gearAttr = attrs[0];
    const g = c.gear && c.gear.until >= c.season ? c.gear : null, gNow = g ? S.FC_SHOP.gear.find(x => x.id === g.id) : null;
    const left = g ? (g.until > c.season ? 'até a próxima temporada' : 'até o fim da temporada') : '';
    const btn = (kind, id, label, ok, on) => '<button class="fc-buy' + (on ? ' on' : '') + '" data-k="' + kind + '" data-id="' + id + '"' + (ok ? '' : ' disabled') + '>' + label + '</button>';
    const row = (name, fx, right) => '<div class="fc-si"><span><b>' + esc(name) + '</b><small>' + esc(fx) + '</small></span>' + right + '</div>';
    const week = S.fcStaffWeek(c);
    el.innerHTML =
      '<div class="fc-cash"><span>Seu dinheiro</span><b>' + R(cash) + '</b><small>Salário de ' + R(c.wage || 0) + ' por semana' + (week ? ' · equipe: −' + R(week) + ' por semana' : '') + '</small></div>' +
      '<div class="fc-ss"><h3>' + (c.pos === 'GOL' ? 'Luvas' : 'Chuteira') + '</h3>' +
        (g ? '<p class="fc-own">Você usa: ' + esc(S.fcGearName(c, gNow)) + ' · +' + g.b + ' em ' + esc(D.label(c.pos, g.attr)) + ', ' + left + '</p>' : '<p class="fc-own">Sem equipamento especial.</p>') +
        '<div class="seg fc-attr">' + attrs.map(k => '<button data-a="' + k + '"' + (k === gearAttr ? ' class="on"' : '') + '>' + esc(D.label(c.pos, k)) + '</button>').join('') + '</div>' +
        S.FC_SHOP.gear.map(x => { const p = S.fcGearPrice(c, x.id);
          return row(S.fcGearName(c, x), '+' + x.b + ' em ' + D.label(c.pos, gearAttr) + (x.en ? ', cansa ' + x.en + ' a menos por jogo' : '') + ' · ' + (x.seasons > 1 ? x.seasons + ' temporadas' : '1 temporada'), btn('gear', x.id, R(p), cash >= p)); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Equipe pessoal</h3><p class="fc-own">Paga por semana. Se o dinheiro acabar, o contrato cai.</p>' +
        S.FC_SHOP.staff.map(x => { const on = !!(c.staff && c.staff[x.id]), p = S.fcStaffCost(c, x.id);
          return row(x.name, x.fx + ' · ' + R(p) + ' por semana', btn('staff', x.id, on ? 'Dispensar' : 'Contratar', on || cash >= p * 4, on)); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Patrimônio</h3>' +
        S.FC_SHOP.life.map(x => { const own = !!(c.life && c.life[x.id]), p = S.fcLifePrice(c, x.id);
          return row(x.name, x.fx + ' (+' + x.fame + ' de fama)', own ? '<em class="fc-own-tag">Comprado</em>' : btn('life', x.id, R(p), cash >= p)); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Carro</h3>' +
        S.FC_SHOP.cars.map((x, k) => { const at = S.fcCarAt(c), p = S.fcCarPrice(c, x.id);
          return row(x.name, x.fx + ' (+' + x.fame + ' de fama)', k === at ? '<em class="fc-own-tag">Seu carro</em>' : k < at ? '<em class="fc-own-tag old">Abaixo do seu</em>' : btn('car', x.id, R(p), cash >= p)); }).join('') +
      '</div>' +
      '<p class="fc-shop-note">Tudo daqui vale só nesta carreira. Os itens da coleção continuam só visuais.</p>';
    el.querySelectorAll('.fc-attr button').forEach(b => { b.onclick = () => { sfx('tap'); gearAttr = b.dataset.a; shopBox(); }; });
    el.querySelectorAll('.fc-buy').forEach(b => { b.onclick = () => {
      if (S.fcBuy(c, b.dataset.k, b.dataset.id, gearAttr)) { sfx(b.dataset.k === 'staff' && !(c.staff && c.staff[b.dataset.id]) ? 'tap' : 'coin'); save(); bar(); shopBox(); weekBox(); }
    }; });
  }

  // Simula sem o ao vivo; para antes de jogo com lance decisivo (esse você joga) e nas datas de evento
  function quick(n) {
    const c = G.c;
    let k = 0, nx;
    while (k < n) {
      if (c.fc.wkDue) { S.fcWeek(c, k === 0 ? myPick() : undefined); unpick(); } // a semana: a marcada na tela, depois a automática
      nx = S.fcNext(c);
      if (!nx || (k > 0 && (nx.moment || S.fcEventDue(c)))) break;
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
  function afterMoment() { live(); }

  // ---------- jogo ao vivo ----------
  function live() {
    const c = G.c;
    const nx = S.fcNext(c);
    if (!nx) return finishSeason();
    // Tabela antes do jogo (o ao vivo soma os placares parciais por cima dela)
    const en0 = c.fc.en;
    const out = S.fcPlay(c);
    save();
    matchView();
    const x = Object.assign({}, nx, { res: out.my, en0 });
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
    weekBox(true);
    // Outros jogos da rodada (liga e grupo); na copa e no mata-mata, os outros confrontos da fase
    $('fc-round').innerHTML = out.others.length ? '<div class="fs-rlbl">' + (lg ? 'Outros jogos da rodada' : grp ? 'O outro jogo do grupo' : 'Outros confrontos da fase') + '</div>' +
      out.others.map((g, k) => '<div class="fs-rr" data-k="' + k + '"><span>' + esc(nameOf(g.h)) + '</span>' + crest(g.h, 'xs') + '<b>0 × 0</b>' + crest(g.a, 'xs') + '<span>' + esc(nameOf(g.a)) + '</span></div>').join('') : '';
    $('fc-acts').innerHTML = '<div class="fs-skip"><button class="btn ghost' + (fast ? ' on' : '') + '" id="fc-fast">' + (fast ? 'Velocidade normal' : 'Mais rápido') + '</button><button class="btn ghost" id="fc-skip">Fim do jogo</button></div>';
    $('fc-fast').onclick = () => { fast = !fast; $('fc-fast').textContent = fast ? 'Velocidade normal' : 'Mais rápido'; $('fc-fast').classList.toggle('on', fast); };
    $('fc-skip').onclick = () => { t = end; frame(); done(); };
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

  // Resultado: a capa do jornal do dia seguinte, com a manchete sobre você, o boletim e os outros jogos
  const goalsOf = g => g.ev.reduce((o, e) => { o[e.s === 'h' ? 0 : 1]++; return o; }, [0, 0]);
  function headline(c, x, m, out) {
    const sn = esc(c.name.trim().split(/\s+/).pop()), me = esc(nameOf(c.club)), vs = esc(nameOf(x.vs));
    if (!x.vs) return [me + ' folga e vê os rivais', 'Sem jogo nesta rodada.'];
    const won = out === 'win', lost = out === 'loss', def = c.pos === 'GOL' || c.pos === 'ZAG';
    const nota = m.on ? ' Nota ' + rate(m.rating) + '.' : '';
    if (!m.on) return [(won ? me + ' vence ' + vs + ' sem ' + sn : lost ? 'Sem ' + sn + ', ' + me + ' perde para ' + vs : me + ' e ' + vs + ' empatam, com ' + sn + ' fora'), x.injury ? 'Lesionado, ele viu o jogo de fora.' : 'Ele não entrou em campo.'];
    if (m.goals >= 2) return [sn + ' marca ' + (m.goals === 2 ? 'dois' : m.goals) + (won ? ' e decide' : lost ? ', mas não evita a derrota' : ' e garante o empate'), 'Contra ' + vs + ', pela ' + esc(x.compName) + '.' + nota];
    if (m.goals === 1) return [(won ? 'Gol de ' + sn + ' e vitória sobre ' + vs : lost ? sn + ' marca, mas ' + me + ' perde' : 'Gol de ' + sn + ' segura o empate'), (m.assists ? 'Ainda deu uma assistência.' : 'Partida contra ' + vs + '.') + nota];
    if (m.assists) return [(won ? 'Passe de ' + sn + ' abre caminho para a vitória' : 'Passe de ' + sn + ' não basta para ' + me), 'Contra ' + vs + '.' + nota];
    if (def && won && m.ga === 0) return [sn + ' fecha a porta e ' + me + ' vence', 'Sem sofrer gol contra ' + vs + '.' + nota];
    if (m.rating >= 7.5) return [(won ? sn + ' brilha na vitória sobre ' + vs : sn + ' é o melhor em campo, mas não basta'), 'Atuação de destaque.' + nota];
    if (m.rating < 6) return [(lost ? 'Noite ruim: ' + me + ' perde e ' + sn + ' some' : sn + ' passa em branco contra ' + vs), 'Partida para esquecer.' + nota];
    return [(won ? me + ' vence ' + vs : lost ? me + ' perde para ' + vs : me + ' e ' + vs + ' empatam'), sn + ' jogou os 90 minutos.' + nota];
  }
  function result(x, out) {
    bar(); // gols, assistências e taças do topo já contam este jogo
    const c = G.c, fc = c.fc, m = out.my || {};
    const res = !x.vs ? 'none' : x.knock ? (m.won ? 'win' : 'loss') : m.gf > m.ga ? 'win' : m.gf < m.ga ? 'loss' : 'draw';
    const [h1, h2] = headline(c, x, m, res);
    const [gh, ga] = x.home ? [m.gf, m.ga] : [m.ga, m.gf];
    const lgPos = standings('lg').findIndex(r => r.i === 0) + 1;
    const ev = (m.ev || []).map(e => '<li><b>' + clock(e.m) + '</b> ' + (e.me ? esc(c.name) : e.as ? 'gol, passe de ' + esc(c.name) : esc(nameOf(e.s === 'h' ? (x.home ? c.club : x.vs) : (x.home ? x.vs : c.club)))) + '</li>').join('');
    const row = (k, v, cls) => '<div><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    const en1 = Math.round(fc.en === undefined ? 100 : fc.en), en0 = Math.round(x.en0 === undefined ? en1 : x.en0);
    const others = out.others.slice(0, 6).map(g => { const [a, b] = goalsOf(g); return '<span>' + esc(nameOf(g.h)) + ' ' + a + ' × ' + b + ' ' + esc(nameOf(g.a)) + '</span>'; }).join('');
    const ze = out.bet ? '<p class="jn-ze">' + esc(nameOf(out.bet.h)) + ' ' + out.bet.gh + ' × ' + out.bet.ga + ' ' + esc(nameOf(out.bet.a)) + '. ' +
      (out.bet.win ? 'Seu palpite pagou R$ ' + U.money(out.bet.pay) + '.' : 'Não foi dessa vez: R$ ' + U.money(out.bet.stake) + ' a menos.') +
      (out.bet.caught ? ' E a federação descobriu: 4 jogos de suspensão.' : '') + ' <i>— Zé</i></p>' : '';
    const done = G.c.fc.done;
    render('<div class="jn-w"><article class="jn">' +
      '<header><h1>Diário da Rodada</h1><p><span>nº ' + (fc.i) + '</span><span>' + esc(x.compName) + ' · ' + year() + '</span><span>R$ 3,00</span></p></header>' +
      '<h2>' + h1 + '</h2><p class="jn-sub">' + h2 + '</p>' +
      '<div class="jn-g">' + (x.vs ? '<div class="jn-sc"><div class="jn-bd"><span>' + esc(nameOf(x.home ? c.club : x.vs)) + '</span><b>' + gh + ' × ' + ga + '</b><span>' + esc(nameOf(x.home ? x.vs : c.club)) + '</span></div>' +
          (m.pens ? '<small>decidido nos pênaltis</small>' : '') + (ev ? '<ul>' + ev + '</ul>' : '<small>Sem gols.</small>') + '</div>' : '<div class="jn-sc"><small>Folga.</small></div>') +
        '<div class="jn-bt"><b>Boletim do atleta</b>' +
          (m.on ? row('Nota', rate(m.rating)) + (c.pos === 'GOL' || c.pos === 'ZAG' ? row('Sem sofrer gol', m.ga === 0 ? 'sim' : 'não') : row('Gols', m.goals || 0)) + row('Assistências', m.assists || 0) : row('Em campo', 'não')) +
          row('Energia', en0 + ' → ' + en1, en1 < en0 ? 'down' : 'up') + row('Forma', formTxt(fc.fo || 0).toLowerCase()) +
          (out.pe ? row('Evolução', '+' + num1(out.pe), 'up') : '') + '</div></div>' +
      (others ? '<div class="jn-o"><b>Os outros jogos</b><div>' + others + '</div></div>' : '') +
      '<div class="jn-f"><p>' + esc(nameOf(c.club)) + ' está em ' + lgPos + 'º na ' + esc(fc.lg.name) + ', com ' + fc.lg.tab[0].p + (fc.lg.tab[0].p === 1 ? ' ponto.' : ' pontos.') + '</p>' + ze + '</div>' +
      '</article><button class="btn" id="fc-next">' + (done ? 'Ver resumo da temporada' : 'Voltar à prancheta') + '</button></div>');
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
    render('<button class="back-link" id="fc-back">‹ Prancheta</button><div class="eyebrow">Evoluir</div><h2>Gaste seus pontos</h2>' +
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
