// Interface — Modo Treinador (plano, fase 7): criação, propostas de clube, central do clube, time (formação, estilo,
// titulares) e o jogo como resultado; fim da temporada com fama e experiência. O motor é engine/coach.js (S.co*).
// Save próprio (SAVE_CO), separado das carreiras de jogador; G.c fica vazio (a barra do jogador não aparece).
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, sfx, $, esc, money, club, league, crest, load, store, render, bar, G, YEAR0 } = U;
  const SAVE_CO = U.SAVE_CO = 'climbix-treinador-v1';
  let co = null;
  // Duas vagas: co.slot 1 grava em SAVE_CO + '-2'
  const save = step => { if (co) co.step = step || co.step; store(U.slotKey(SAVE_CO, co && co.slot), co ? { co, at: Date.now() } : { co: null, at: Date.now() }); };
  const yr = () => YEAR0 + co.season;
  const last = n => String(n || '').split(' ').filter(Boolean).pop() || '';
  const posTxt = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meia', ATA: 'Atacante' };
  const ordTxt = n => n + 'º';
  const enCls = e => (e >= 75 ? 'ok' : e >= 55 ? 'mid' : 'low');

  // ---------- ingresso da tela inicial ----------
  U.coSaved = slot => { const sv = load(U.slotKey(SAVE_CO, slot)); return sv && sv.co && sv.co.mode === 'treinador' ? sv : null; };
  U.coResume = sv => { sfx('tap'); resume(sv); };
  U.coCreate = slot => create(slot);
  function resume(sv) {
    co = sv.co;
    G.c = null; bar();
    S.applyLeagues(co);
    if (!co.club) return offers(co.offers || S.coOffers(co));
    if (co.step === 'end' && co.last) return seasonEnd(co.last);
    if (!co.ss) S.coStart(co);
    if (co.live !== undefined && co.ss && co.live === co.ss.i) return auxFinish();
    delete co.live;
    hub();
  }

  // ---------- criação ----------
  function create(slot) {
    slot = slot ? 1 : 0;
    const st = { name: D.randomName('Brasil'), country: 'Brasil', start: 'baixo', auto: true };
    const cty = () => D.COUNTRIES.find(k => k.id === st.country) || D.COUNTRIES[0];
    const START = [['baixo', 'Subir de baixo', 'Um clube pequeno de divisão de baixo. A fama vem com o tempo.'],
      ['livre', 'Qualquer clube', 'Você já tem algum nome: chegam propostas de clubes médios.']];
    render('<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">Modo Treinador</div><h2 class="cr-title">Quem é o técnico?</h2>' +
      '<div class="co-plate"><span class="co-plate-f" id="co-flag"></span><input class="co-name" id="co-name" maxlength="22" value="' + esc(st.name) + '" aria-label="Nome do técnico">' +
        '<button type="button" class="co-dice" id="co-dice" aria-label="Sortear nome">' + U.emo('🎲', 'sm') + '</button></div>' +
      '<div class="cr-lbl">País · <b id="co-cty"></b></div><div class="cr-flags" id="co-country">' + D.COUNTRIES.map(k => '<button data-v="' + k.id + '"' + (k.id === st.country ? ' class="on"' : '') + ' aria-label="' + k.id + '">' + U.flag(k.flag, 'sm') + '</button>').join('') + '</div>' +
      '<div class="cr-lbl">Como começa</div><div class="co-starts" id="co-start">' + START.map(([k, t, s]) => '<button data-v="' + k + '"' + (k === st.start ? ' class="on"' : '') + '><b>' + t + '</b><small>' + s + '</small></button>').join('') + '</div>' +
      '<div class="inv-bar fade"><button class="btn" id="b-co-go">Ver propostas</button></div>');
    const paint = () => { $('co-flag').innerHTML = U.flag(cty().flag); $('co-cty').textContent = cty().id; };
    $('co-country').querySelectorAll('button').forEach(b => b.onclick = () => {
      $('co-country').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      st.country = b.dataset.v; if (st.auto) { st.name = D.randomName(st.country, null, st.name); $('co-name').value = st.name; }
      paint(); sfx('tap');
    });
    $('co-start').querySelectorAll('button').forEach(b => b.onclick = () => { $('co-start').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); st.start = b.dataset.v; sfx('tap'); });
    $('co-name').oninput = () => { st.name = $('co-name').value; st.auto = false; };
    $('co-dice').onclick = e => { e.preventDefault(); st.auto = true; st.name = D.randomName(st.country, null, $('co-name').value.trim()); $('co-name').value = st.name; sfx('tap'); };
    $('b-back-home').onclick = U.home;
    $('b-co-go').onclick = () => {
      sfx('tap');
      co = S.coNew({ name: ($('co-name').value.trim() || st.name).slice(0, 22), country: st.country, start: st.start });
      co.autoXI = true;
      if (slot) co.slot = 1;
      offers(S.coOffers(co));
    };
    paint();
  }

  // ---------- propostas ----------
  // list: ids de clube. stay: o clube atual entra como "Ficar" (fim de temporada, sem demissão)
  function offers(list, stay) {
    co.offers = list; if (!stay) save('offers');
    G.c = null; bar();
    const first = !co.hist.length && !co.club;
    const card = id => {
      const cl = club(id), lg = league(id), g = S.coGoalFor(co, id), sq = S.coGenSquad(id, co.season), avg = Math.round(sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11).reduce((a, p) => a + p.ovr, 0) / 11);
      const hard = g.k === 'naocair' || g.k === 'digna', top = ['titulo', 'subir', 'g4'].includes(g.k);
      return '<div class="of-card co-of" style="--of-c:' + (U.bandColor ? U.bandColor(id) : '#1F6B3E') + '">' +
        '<div class="of-band">' + crest(id, 'of-crest') + '<div class="of-id"><b class="of-name">' + esc(cl.name) + '</b><span class="of-lg">' + U.flag(lg.flag) + ' ' + esc(lg.name) + '</span></div></div>' +
        '<div class="of-body"><div class="co-goal ' + (top ? 'top' : hard ? 'hard' : '') + '"><small>A diretoria pede</small><b>' + S.CO_GOAL_TXT[g.k] + '</b></div>' +
        '<div class="of-tiles"><div><b>' + avg + '</b><small>titulares</small></div><div><b>' + ordTxt(g.exp) + '</b><small>na aposta</small></div><div><b>' + sq.length + '</b><small>no elenco</small></div></div>' +
        '<button class="btn' + (stay ? ' ghost' : '') + '" data-sign="' + id + '">Assinar</button></div></div>';
    };
    render('<div class="eyebrow">' + (first ? 'Primeiro emprego' : 'Temporada ' + yr()) + '</div><h2>' + (co.sacked || !co.club ? 'Quem chama você' : 'Outros clubes querem você') + '</h2>' +
      '<p class="lead">' + (first ? 'Escolha onde começa. A meta da diretoria vem junto com o clube.' : !co.club ? 'Depois da saída, estes clubes ligaram.' : 'Pode trocar de clube ou ficar onde está.') + '</p>' +
      '<div class="co-ofs">' + list.map(card).join('') + '</div>' +
      (stay ? '<button class="btn" id="b-co-stay">Ficar no ' + esc(club(co.club).name) + '</button>' : ''));
    document.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
      sfx('tap'); S.coSign(co, b.dataset.sign); co.autoXI = true; co.offers = null; S.coStart(co); save('hub'); welcome();
    });
    if ($('b-co-stay')) $('b-co-stay').onclick = () => { sfx('tap'); co.offers = null; S.coStart(co); save('hub'); hub(); };
  }
  // Chegada: o presidente diz a meta
  function welcome() {
    const cl = club(co.club), g = co.board.goal;
    render('<div class="co-msg"><div class="eyebrow">' + esc(cl.name) + ' · ' + yr() + '</div>' + crest(cl.id, 'co-big') +
      '<h2>Bem-vindo, professor.</h2><p class="lead">O presidente aperta sua mão: "Aqui a meta é uma só: <b>' + S.CO_GOAL_TXT[g.k].toLowerCase() + '</b>. ' +
      (g.k === 'titulo' ? 'Segundo lugar aqui é derrota."' : g.k === 'naocair' || g.k === 'digna' ? 'Ninguém espera milagre, mas vexame não."' : 'Confio no seu trabalho."') + '</p>' +
      '<button class="btn" id="b-co-in">Conhecer o elenco</button></div>', { center: true });
    $('b-co-in').onclick = () => { sfx('tap'); team(); };
  }

  // ---------- central do clube ----------
  const MOOD = {
    feliz: ['"Assim dá gosto de vir ao estádio."', '"A torcida está do seu lado. Eu também."', '"Continue assim, professor."'],
    tranquilo: ['"Estamos no caminho. Sem euforia."', '"Confio, mas quero ver mais."', '"O conselho está calmo. Por enquanto."'],
    preocupado: ['"O conselho começou a perguntar de você."', '"Precisamos de resultado, professor."', '"A paciência aqui não é infinita."'],
    'no limite': ['"Não dá mais para esperar."', '"Os conselheiros querem sua cabeça."', '"Eu seguro até onde der."'],
  };
  const moodLine = () => { const k = S.coMood(co), a = MOOD[k]; return '<div class="co-pres ' + k.replace(' ', '-') + '"><small>Presidente</small><span>' + a[(co.ss ? co.ss.i : 0) % a.length] + '</span></div>'; };
  function table(full) {
    const t = S.coTable(co), me = t.findIndex(x => x.me), n = t.length, ss = co.ss;
    let a = 0, b = n;
    if (!full) { a = Math.max(0, Math.min(me - 2, n - 5)); b = a + 5; }
    return '<div class="rc-tbl co-tbl">' + t.slice(a, b).map((x, k) => { const pos = a + k + 1;
      return '<div class="rt-r' + (x.me ? ' me' : '') + (ss.promo && pos === ss.promo ? ' cut' : '') + (ss.releg && pos === n - ss.releg ? ' cut' : '') + '"><i>' + pos + '</i>' + crest(x.id, 'xs') +
        '<span>' + esc(club(x.id).name) + '</span><em>' + x.j + 'j</em><b>' + x.p + '</b></div>'; }).join('') + '</div>';
  }
  function form5() {
    const l = co.ss.log.slice(-5);
    return l.length ? '<div class="co-form">' + l.map(x => '<i class="' + x.res + '" title="' + x.gf + 'x' + x.ga + '">' + x.res.toUpperCase() + '</i>').join('') + '</div>' : '';
  }
  function hub() {
    G.c = null; bar();
    save('hub');
    const nx = S.coNext(co), cl = club(co.club), ss = co.ss, B = co.board, pos = S.coPos(co);
    if (!nx) return finishSeason();
    const vs = !nx.bye && club(nx.vs);
    const ult = B.ult ? '<div class="co-ult"><b>Ultimato</b><span>Vença ' + B.ult.need + ' dos próximos ' + B.ult.of + ': ' + B.ult.got + ' de ' + B.ult.need + ' vitórias, ' + (B.ult.of - B.ult.n) + ' jogos para isso.</span></div>' : '';
    render(U.modeHead({ mode: 'co', nav: 'home', id: 'b-co-out', label: 'Voltar ao início do jogo', title: crest(cl.id, 'xs') + esc(cl.name), sub: esc(ss.name) + ' ' + yr() + ' · ' + esc(co.name) + ' · fama ' + co.fame }) +
      ult +
      '<div class="co-next">' + (nx.bye ? '<div class="eyebrow">Rodada ' + nx.round + ' de ' + nx.of + '</div><h2>Sem jogo nesta rodada</h2><p class="lead">O time descansa. Os outros jogam.</p>' :
        '<div class="eyebrow">Rodada ' + nx.round + ' de ' + nx.of + ' · ' + (nx.home ? 'em casa' : 'fora') + '</div>' +
        '<div class="co-vs"><span>' + crest(cl.id, 'co-vc') + '<b>' + esc(cl.short || cl.name) + '</b><small>' + ordTxt(pos) + '</small></span><em>x</em>' +
          '<span>' + crest(vs.id, 'co-vc') + '<b>' + esc(vs.short || vs.name) + '</b><small>' + ordTxt(S.coTable(co).findIndex(x => x.id === vs.id) + 1) + '</small></span></div>') +
        '<div class="co-meta"><small>Meta</small><b>' + S.CO_GOAL_TXT[B.goal.k] + '</b><span>' + (B.goal.k === 'titulo' ? 'você está em ' + ordTxt(pos) : 'até o ' + ordTxt(B.goal.pos) + ' · hoje ' + ordTxt(pos)) + '</span></div>' +
        (nx.bye ? '' : scout(S.coPreview(co).them)) + moodLine() +
        '<button class="btn" id="b-co-play">' + (nx.bye ? 'Ver a rodada' : 'Escalar e jogar') + '</button></div>' +
      '<div class="co-side"><div class="co-box"><div class="eyebrow">Tabela ' + form5() + '</div>' + table(false) + '<button class="btn ghost sm" id="b-co-tab">Tabela inteira</button></div>' +
      '<div class="co-acts"><button class="btn ghost" id="b-co-team">Time e elenco</button></div></div>');
    U.modeHeadBind();
    $('b-co-play').onclick = () => { sfx('tap'); if (nx.bye) { S.coSkipRound(co); save(); return hub(); } team(true); };
    $('b-co-team').onclick = () => { sfx('tap'); team(false); };
    $('b-co-tab').onclick = () => { sfx('tap'); render(U.modeHead({ mode: 'co', nav: 'back', id: 'b-co-back', label: 'Voltar ao clube', title: 'Tabela', sub: esc(ss.name) + ' ' + yr() }) + '<div class="co-box">' + table(true) + '</div>'); U.modeHeadBind(); $('b-co-back').onclick = hub; };
    $('b-co-out').onclick = () => { sfx('tap'); save(); co = null; U.home(); };
  }

  // ---------- time: formação, estilo e titulares ----------
  // O campo visto de cima: goleiro embaixo; cada linha da formação numa altura (no 4-2-3-1 o meio vira 2 + 3)
  function spots(form) {
    const sl = S.CO_FORMS[form].slots, am = sl.some(x => x.ln === 'am');
    const Y = { g: 90, d: 70, m: am ? 55 : 46, am: 34, a: 17 }, out = [];
    ['g', 'd', 'm', 'am', 'a'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln); ix.forEach((i, k) => { out[i] = [Math.round((k + 1) * 100 / (ix.length + 1)), Y[ln]]; }); });
    return out;
  }
  // Confronto em palavras (sem números, decisão do Silvio): meio, lados, área e o encaixe do estilo
  function mview(pv, fm, st) {
    if (!pv) return '';
    fm = fm || co.form; st = st || co.style;
    const u = pv.us, o = pv.op;
    // Contagem de gente por vaga (a força entra no cálculo, mas o que se mostra é quantos)
    const cnt = f => { const sl = S.CO_FORMS[f].slots; return { cm: sl.filter(x => (x.ln === 'm' || x.ln === 'am') && !x.w).length,
      wide: sl.filter(x => x.w && x.ln !== 'd').length, wdef: sl.filter(x => x.w && (x.ln === 'd' || x.pos === 'LAT')).length,
      cf: sl.filter(x => x.ln === 'a' && !x.w).length, cb: sl.filter(x => x.ln === 'd' && !x.w).length }; };
    const a = cnt(fm), b = cnt(pv.them.form), oc = S.CO_STY[pv.them.style].ctrl;
    const word = (d, t) => (d > t ? ['up', 'vantagem sua'] : d < -t ? ['down', 'vantagem deles'] : ['eq', 'parelho']);
    const row = (lbl, d, t, why) => { const [c, w] = word(d, t); return '<div class="co-mr ' + c + '"><small>' + lbl + '</small><b><i aria-hidden="true">' + (c === 'up' ? '▲' : c === 'down' ? '▼' : '=') + '</i>' + w + '</b><span>' + why + '</span></div>'; };
    const sty = (1.0 * u.press + 1.6 * u.counter) - (1.0 * o.press + 1.6 * o.counter);
    const r = pv.xg[0] / pv.xg[1];
    return '<div class="co-mu"><div class="co-mu-h"><small>Confronto</small><b class="' + (r > 1.25 ? 'up' : r < 0.8 ? 'down' : 'eq') + '">' + (r > 1.5 ? 'Você é o favorito' : r > 1.15 ? 'Leve vantagem sua' : r < 0.67 ? 'Eles são favoritos' : r < 0.87 ? 'Leve vantagem deles' : 'Jogo parelho') + '</b></div>' +
      row('Meio', pv.poss - 0.5, 0.04, a.cm + ' contra ' + b.cm + ' no meio' + (oc < 0.9 ? ', eles abrem mão da bola' : oc > 1.2 ? ', eles gostam da bola' : '')) +
      row('Lados', u.flank * u.wsh - o.flank * o.wsh, 0.06, a.wide + (a.wide === 1 ? ' aberto' : ' abertos') + ' contra ' + b.wdef + ' laterais') +
      row('Área', u.central - o.central, 0.08, a.cf + (a.cf === 1 ? ' atacante' : ' atacantes') + ' contra ' + b.cb + ' zagueiros') +
      row('Estilo', sty, 0.06, S.CO_STY[st].name + ' contra ' + S.CO_STY[pv.them.style].name) + '</div>';
  }
  const scout = them => '<p class="co-scout">' + U.emo('🔭', 'xs') + ' Olheiro: o ' + esc(club(them.club).short || club(them.club).name) + ' deve vir no <b>' + them.form + '</b>, ' + S.CO_STY[them.style].name.toLowerCase() + '.</p>';
  const avail = p => p && !p.out && !p.sus;
  // Ícones dos estilos (traço, cor do texto) e o desenho pequeno de cada formação, para os popups de tática
  const STY_IC = {
    equilibrado: '<path d="M12 4v16M5 8h14M5 8l-3 6h6zM19 8l-3 6h6z"/>',
    posse: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
    pressao: '<path d="M6 14l6-6 6 6M6 20l6-6 6 6"/>',
    contra: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    retranca: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    lados: '<path d="M9 12H3M6 9l-3 3 3 3M15 12h6M18 9l3 3-3 3M12 5v14"/>',
  };
  const styIco = k => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (STY_IC[k] || STY_IC.equilibrado) + '</svg>';
  const FORM_TIP = { '4-4-2': 'Equilibrada, dois na frente', '4-3-3': 'Ataca pelos lados', '4-2-3-1': 'Meio cheio, um centroavante', '4-5-1': 'Segura o meio', '3-5-2': 'Alas sobem, três atrás', '3-4-3': 'Muito ataque, pouca proteção', '5-3-2': 'Fecha atrás, sai no contra' };
  const formMini = f => '<svg class="co-fmini" viewBox="0 0 60 80" aria-hidden="true"><rect x="3" y="3" width="54" height="74" rx="4"/><line x1="3" y1="40" x2="57" y2="40"/>' +
    spots(f).map(([x, y]) => '<circle cx="' + (3 + x * 0.54).toFixed(1) + '" cy="' + (3 + y * 0.74).toFixed(1) + '" r="3.6"/>').join('') + '</svg>';
  const CHEV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const XICO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  // Popup no meio da tela, com o fundo escurecido: fecha no X, tocando fora ou com Esc
  function pop(html, label, onBind) {
    closePop();
    const w = document.createElement('div');
    w.className = 'co-pop'; w.id = 'co-pop';
    w.innerHTML = '<div class="co-pop-c" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    document.body.appendChild(w);
    w.onclick = e => { if (e.target === w) { sfx('tap'); closePop(); } };
    const x = w.querySelector('[data-pop-x]'); if (x) x.onclick = () => { sfx('tap'); closePop(); };
    pop.esc = e => { if (e.key === 'Escape') closePop(); };
    document.addEventListener('keydown', pop.esc);
    onBind && onBind(w);
    const f = w.querySelector('button:not([disabled])'); if (f) f.focus({ preventScroll: true });
  }
  function closePop() { const w = document.getElementById('co-pop'); if (w) w.remove(); if (pop.esc) document.removeEventListener('keydown', pop.esc); pop.esc = null; }
  function team(toPlay) {
    G.c = null; bar();
    const by = {}; co.squad.forEach(p => { by[p.id] = p; });
    // Titulares que não podem jogar (lesão, suspensão) saem antes de abrir: o auxiliar põe outro
    if (co.xi.some(id => !avail(by[id])) || co.xi.length < 11) { const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; }
    let swap = null; // índice do titular que vai trocar de lugar com outro titular
    const nx = S.coNext(co), vs = nx && !nx.bye && club(nx.vs), cl = club(co.club);
    const vsStrip = () => {
      if (!vs) return '';
      const t = S.coTable(co), pos = id => t.findIndex(x => x.id === id) + 1;
      return '<div class="co-tvs">' + crest(cl.id, 'co-tvc') + '<span><b>' + esc(cl.short || cl.name) + '</b><small>' + ordTxt(pos(cl.id)) + ' · ' + (nx.home ? 'em casa' : 'fora') + '</small></span>' +
        '<em>x</em><span class="r"><b>' + esc(vs.short || vs.name) + '</b><small>' + ordTxt(pos(vs.id)) + '</small></span>' + crest(vs.id, 'co-tvc') + '</div>';
    };
    const scoutBub = them => '<div class="co-bub"><i class="co-bub-a" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/></svg></i>' +
      '<p>O ' + esc(club(them.club).short || club(them.club).name) + ' deve vir no <b>' + them.form + '</b>, ' + S.CO_STY[them.style].name.toLowerCase() + '.<small>Olheiro</small></p></div>';
    const draw = () => {
      const slots = S.coSlots(co.form), sp = spots(co.form);
      const pv = S.coPreview(co);
      const shirt = (id, i) => { const p = by[id]; if (!p) return '';
        const off = p.pos !== slots[i];
        return '<button class="co-sh' + (swap === i ? ' sel' : '') + (off ? ' off' : '') + '" data-xi="' + i + '" style="left:' + sp[i][0] + '%;top:' + sp[i][1] + '%" aria-label="' + esc(p.n) + ', ' + slots[i] + ', ' + p.ovr + '">' +
          '<i>' + p.ovr + '</i><b>' + esc(last(p.n)) + '</b><small>' + slots[i] + (off ? ' · ' + p.pos : '') + '</small><em class="' + enCls(p.en) + '" style="width:' + Math.round(p.en) + '%"></em></button>'; };
      $('co-team').innerHTML =
        vsStrip() + (pv ? scoutBub(pv.them) : '') +
        '<div class="co-tac-h">Sua tática</div>' +
        '<div class="co-tac"><button class="co-pick" id="b-co-form"><small>Formação</small><b>' + co.form + '</b>' + CHEV + '</button>' +
          '<button class="co-pick" id="b-co-sty"><small>Estilo</small><b>' + esc(S.CO_STY[co.style].name) + '</b>' + CHEV + '</button></div>' +
        '<p class="co-stip">' + S.CO_STY[co.style].tip + '.</p>' +
        '<div class="co-pitch" aria-label="Titulares no campo"><i class="co-pl-l"></i>' + co.xi.map(shirt).join('') + '</div>' +
        '<p class="co-tip">' + (swap !== null ? 'Toque no titular que vai trocar de lugar com ' + esc(last(by[co.xi[swap]].n)) + '.' : 'Toque num jogador para ver quem pode entrar no lugar dele.') + '</p>' +
        // Espaço do Caderno do técnico: o que você já descobriu do confronto (o resto fica como "?")
        '<div id="co-caderno">' + (U.coCaderno && pv ? U.coCaderno(co, pv) : '') + '</div>';
      bind();
    };
    // Quem pode entrar no lugar de um titular: mesma posição primeiro (a melhor opção marcada), depois fora de posição
    const subPop = i => {
      const slot = S.coSlots(co.form)[i], cur = by[co.xi[i]];
      const rest = co.squad.filter(p => !co.xi.includes(p.id));
      const score = p => p.ovr * (0.6 + 0.4 * p.en / 100);
      const same = rest.filter(p => p.pos === slot).sort((a, b) => avail(b) - avail(a) || score(b) - score(a));
      const other = rest.filter(p => p.pos !== slot && (p.pos === 'GOL') === (slot === 'GOL')).sort((a, b) => avail(b) - avail(a) || b.ovr - a.ovr);
      const best = same.find(avail);
      const note = p => p.out ? 'lesionado, ' + D.plural(p.out, 'jogo', 'jogos') : p.sus ? 'suspenso' :
        [p.age + ' anos', p === best ? 'melhor opção' : '', p.en < 55 ? 'cansado' : '', p.mo < 45 ? 'chateado' : p.mo > 75 ? 'motivado' : ''].filter(Boolean).join(' · ');
      const row = p => '<button class="co-pl' + (p === best ? ' best' : '') + (avail(p) ? '' : ' dis') + '" data-sub="' + p.id + '"' + (avail(p) ? '' : ' disabled') + '>' +
        '<span class="co-pos">' + p.pos + '</span><span class="co-pn"><b>' + esc(p.n) + '</b><small>' + note(p) + '</small></span>' +
        '<span class="co-en ' + enCls(p.en) + '"><em style="width:' + Math.round(p.en) + '%"></em></span><b class="co-ov">' + p.ovr + '</b></button>';
      pop('<div class="co-pop-h"><b class="co-pop-ov">' + cur.ovr + '</b><span><b>' + esc(cur.n) + '</b><small>' + slot + ' · ' + cur.age + ' anos · energia ' + Math.round(cur.en) + '%</small></span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
        '<div class="co-pop-b">' + (same.length ? '<div class="co-pop-l">Quem pode entrar no lugar dele</div>' + same.map(row).join('') : '<div class="co-pop-l">Ninguém da posição no elenco</div>') +
        (other.length ? '<div class="co-pop-l">Fora de posição</div>' + other.map(row).join('') : '') + '</div>' +
        '<button class="btn ghost co-pop-sw" id="b-co-swap">Trocar de lugar com outro titular</button>', 'Trocar ' + cur.n, w => {
        w.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sfx('tap'); co.xi[i] = b.dataset.sub; co.autoXI = false; closePop(); draw(); });
        $('b-co-swap').onclick = () => { sfx('tap'); swap = i; closePop(); draw(); };
      });
    };
    const formPop = () => pop('<div class="co-pop-h"><span><b>Formação</b>' + (nx && !nx.bye && S.coPreview(co) ? '<small>O ' + esc(vs.short || vs.name) + ' deve vir no ' + S.coPreview(co).them.form + '</small>' : '') + '</span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
      '<div class="co-pop-b co-fgrid">' + Object.keys(S.CO_FORMS).map(f => '<button class="co-fc' + (f === co.form ? ' on' : '') + '" data-f="' + f + '">' + formMini(f) + '<span><b>' + f + '</b><small>' + (FORM_TIP[f] || '') + '</small></span></button>').join('') + '</div>', 'Escolher formação', w => {
      w.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
        sfx('tap'); const f = b.dataset.f;
        if (co.autoXI) co.xi = S.coAutoXI(co.squad, f).xi;
        else { const on = co.squad.filter(p => co.xi.includes(p.id)); co.xi = S.coAutoXI(on, f).xi.filter(Boolean); if (co.xi.length < 11) co.xi = S.coAutoXI(co.squad, f).xi; }
        co.form = f; swap = null; closePop(); draw();
      });
    });
    const styPop = () => pop('<div class="co-pop-h"><span><b>Estilo de jogo</b>' + (nx && !nx.bye && S.coPreview(co) ? '<small>O ' + esc(vs.short || vs.name) + ' joga ' + S.CO_STY[S.coPreview(co).them.style].name.toLowerCase() + '</small>' : '') + '</span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
      '<div class="co-pop-b">' + S.CO_STYLES.map(k => '<button class="co-stc' + (k === co.style ? ' on' : '') + '" data-s="' + k + '"><i>' + styIco(k) + '</i><span><b>' + esc(S.CO_STY[k].name) + '</b><small>' + STY_SHORT[k] + '</small></span></button>').join('') + '</div>', 'Escolher estilo', w => {
      w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sfx('tap'); co.style = b.dataset.s; closePop(); draw(); });
    });
    const bind = () => {
      $('b-co-form').onclick = () => { sfx('tap'); formPop(); };
      $('b-co-sty').onclick = () => { sfx('tap'); styPop(); };
      document.querySelectorAll('[data-xi]').forEach(b => b.onclick = () => {
        const i = +b.dataset.xi; sfx('tap');
        if (swap === null) return subPop(i);
        if (swap !== i) { const t = co.xi[i]; co.xi[i] = co.xi[swap]; co.xi[swap] = t; co.autoXI = false; }
        swap = null; draw();
      });
    };
    render(U.modeHead({ mode: 'co', nav: 'back', id: 'b-co-back', label: 'Voltar ao clube', title: 'Seu time', sub: vs ? 'Próximo jogo · x ' + esc(vs.short || vs.name) : 'Time e elenco' }) +
      '<div id="co-team"></div>' +
      '<div class="inv-bar fade co-bar"><button class="btn ghost" id="b-co-aux">Sugestão do auxiliar</button>' + (toPlay && vs ? '<button class="btn" id="b-co-go">Jogar</button>' : '<button class="btn" id="b-co-ok">Pronto</button>') + '</div>');
    U.modeHeadBind();
    $('b-co-back').onclick = () => { sfx('tap'); closePop(); keepBench(); save(); hub(); };
    $('b-co-aux').onclick = () => { sfx('tap'); const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.autoXI = true; swap = null; draw(); };
    if ($('b-co-ok')) $('b-co-ok').onclick = () => { sfx('tap'); closePop(); keepBench(); save(); hub(); };
    if ($('b-co-go')) $('b-co-go').onclick = () => { sfx('tap'); closePop(); keepBench(); play(); };
    draw();
  }
  // Banco: os 9 melhores que podem jogar e não são titulares
  const keepBench = () => { co.bench = co.squad.filter(p => avail(p) && !co.xi.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id); };

  // ---------- jogo (nesta parte, direto o resultado) ----------
  function play() {
    const m = S.coMatchStart(co);
    if (!m) return hub();
    // Marca o jogo começado: se a pessoa sai no meio, o auxiliar termina (recarregar não desfaz o resultado)
    co.live = co.ss.i; save('live');
    live(m);
  }
  // Jogo largado no meio (fechou o app): o auxiliar comanda do começo ao fim
  function auxFinish() {
    const m = S.coMatchStart(co);
    delete co.live;
    if (!m) { save('hub'); return hub(); }
    S.coMatchRest(co, m);
    const log = S.coMatchEnd(co, m);
    save('hub');
    result(m, log, true);
  }

  // ---------- partida ao vivo ----------
  // O motor anda um minuto por vez (S.coMatchStep com `until`), no ritmo escolhido: 1× leva uns 2 minutos, 3× uns 40
  // segundos e ⏩ vai direto ao fim. Para sozinho no gol, vermelho, lesão e intervalo; "Parar e mexer" para quando
  // a pessoa quiser. Na parada sobe um cartão com o lance, a leitura do auxiliar, Trocar (arrastando no campinho) e Tática.
  const SPEED = { 1: ['1×', 1333], 3: ['3×', 444], fim: ['', 0] };
  const OLD_SPEED = { normal: '1', rapido: '3', resumo: 'fim' };
  const STY_SHORT = { equilibrado: 'Sem ponto fraco grande', posse: 'Toca até achar o espaço', pressao: 'Rouba lá na frente, cansa', contra: 'Espera e sai rápido', retranca: 'Fecha tudo, pouco ataque', lados: 'Cruza e abre a defesa' };
  const nm = id => { const c = club(id); return c.short || c.name; };
  const LANE = { e: 'pela esquerda', d: 'pela direita', c: 'pelo meio' };
  const ICO = {
    pause: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    ff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l7 7-7 7M13 5l7 7-7 7"/></svg>',
    aux: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 12h3l3-7 4 14 3-7h3"/></svg>',
    sub: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v14M3 14l4 4 4-4M17 20V6M13 10l4-4 4 4"/></svg>',
    tac: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a4 4 0 0 1 0 8h-2a4 4 0 0 0 0 8"/></svg>',
    ball: c => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/></svg>',
  };
  const crestB = (id, cls) => crest(id, cls || 'co-vc');
  // A faixa de quem manda no jogo: acima da linha é você, abaixo é o rival (média de 5 minutos)
  // Exposta como U.lvMom(m, marca) para o Jogo a Jogo: m precisa só de { mom: [0..100 por minuto], ev: [{ m, t, s }] }
  function momSvg(m, mark) {
    // Cada minuto: o peso do confronto (quem cria mais) somado aos lances dos últimos minutos (chute, gol), suavizado
    const v = m.mom || [], kick = new Array(v.length + 1).fill(0);
    m.ev.forEach(e => { if ((e.t === 'chance' || e.t === 'gol') && e.m <= v.length) kick[e.m - 1] += (e.s === 'us' ? 1 : -1) * (e.t === 'gol' ? 14 : 8); });
    const raw = v.map((x, i) => (x - 50) * 0.8 + [0, 1, 2, 3].reduce((s, k) => s + (i - k >= 0 ? kick[i - k] * (1 - k * 0.22) : 0), 0));
    const pts = raw.map((x, i) => { const w = raw.slice(Math.max(0, i - 2), i + 3); const a = w.reduce((s, y) => s + y, 0) / w.length; return [i + 0.5, 20 - Math.max(-18, Math.min(18, a * 1.4))]; });
    const area = pts.length ? 'M0 20 ' + pts.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' 20 Z' : '';
    const id = 'mc' + (++momSvg.n);
    return '<svg class="lv-mom" viewBox="0 0 90 40" preserveAspectRatio="none" role="img" aria-label="Quem manda no jogo minuto a minuto">' +
      '<defs><clipPath id="' + id + 'u"><rect x="0" y="0" width="90" height="20"/></clipPath><clipPath id="' + id + 'd"><rect x="0" y="20" width="90" height="20"/></clipPath></defs>' +
      '<line x1="0" y1="20" x2="90" y2="20" class="ln"/><line x1="45" y1="1" x2="45" y2="39" class="ln dash"/>' +
      (area ? '<path d="' + area + '" class="up" clip-path="url(#' + id + 'u)"/><path d="' + area + '" class="dn" clip-path="url(#' + id + 'd)"/>' : '') +
      (mark ? '<line x1="' + mark + '" y1="0" x2="' + mark + '" y2="40" class="mk"/>' : '') + '</svg>';
  }
  momSvg.n = 0;
  U.lvMom = momSvg;
  function feedLine(m, e) {
    const who = e.s === 'us' ? nm(co.club) : nm(m.vs);
    const t = e.t === 'gol' ? '<b>GOL do ' + esc(who) + '!</b> ' + esc(e.p || '') + (e.l ? ' ' + LANE[e.l] : '') :
      e.t === 'chance' ? (e.k === 'defesa' ? esc(e.p) + ' chuta ' + (e.l ? LANE[e.l] + ' ' : '') + 'e o goleiro defende' : e.k === 'fora' ? esc(e.p) + ' finaliza para fora' : e.k === 'trave' ? esc(e.p) + ' acerta a trave!' : 'Chute de ' + esc(e.p) + ' travado pela zaga') :
      e.t === 'vermelho' ? '<span class="co-red"></span> ' + esc(e.p) + ' é expulso (' + esc(who) + ')' :
      e.t === 'lesao' ? esc(e.p) + ' sente e pede para sair (' + esc(who) + ')' :
      e.t === 'tatica' ? (e.s === 'us' ? 'Você muda para ' + esc(e.p) : 'O ' + esc(who) + ' muda para <b>' + esc(e.p).toLowerCase() + '</b>') :
      e.t === 'troca' ? 'Sai ' + esc(e.p) + ', entra <b>' + esc(e.q) + '</b>' :
      e.t === 'intervalo' ? 'Fim do primeiro tempo' : '';
    return '<li class="' + e.s + ' ' + e.t + '"><i>' + e.m + '\'</i><span>' + t + '</span></li>';
  }
  // Posição no campinho (deitado: você ataca para a direita). As linhas sobem quando o time manda no jogo
  function lvDots(s, mine, mom, min) {
    const sp = spots(s.form), shift = (mom - 50) * 0.18 * (mine ? 1 : -1);
    return s.xi.map((id, i) => { if (!id || !sp[i]) return '';
      const [x, y] = sp[i], j = Math.sin(min * 1.7 + i * 2.3) * 1.6;
      const L = mine ? 4 + (100 - y) * 0.46 + (i ? shift : 0) + j : 96 - (100 - y) * 0.46 + (i ? shift : 0) - j;
      const T = mine ? x : 100 - x;
      return '<i class="' + (mine ? 'us' : 'th') + (i ? '' : ' gk') + '" style="left:' + L.toFixed(1) + '%;top:' + (T + Math.cos(min + i) * 1.5).toFixed(1) + '%"></i>'; }).join('');
  }
  function lvBall(m, mom) {
    const e = m.ev.filter(x => (x.t === 'chance' || x.t === 'gol') && x.m >= m.min - 1).pop();
    if (e) { const us = e.s === 'us', top = e.l === 'c' ? 50 : (e.l === 'e') === us ? 22 : 78; return [us ? 88 : 12, top]; }
    return [50 + (mom - 50) * 0.7 + Math.sin(m.min * 0.9) * 12, 50 + Math.sin(m.min * 1.3) * 26];
  }
  function live(m) {
    G.c = null; bar();
    co.speed = OLD_SPEED[co.speed] || co.speed || '1';
    if (!SPEED[co.speed] || co.speed === 'fim') co.speed = '1';
    const cl = club(co.club), vs = club(m.vs), H = m.home ? cl : vs, A = m.home ? vs : cl;
    let timer = null, seen = new Set(), read = null, open = false, firstMove = null;
    render('<div class="lv">' +
      '<div class="lv-board"><div class="lv-sc"><span>' + crestB(H.id) + '<b>' + esc(H.short || H.name) + '</b></span>' +
        '<div class="lv-mid"><em id="lv-score">0 <i>x</i> 0</em><small id="lv-clock"><i></i>0\'</small></div><span>' + crestB(A.id) + '<b>' + esc(A.short || A.name) + '</b></span></div>' +
        '<div class="lv-momh"><small>Quem manda no jogo</small><small id="lv-momw"></small></div><div id="lv-mom"></div></div>' +
      '<div class="lv-pitch" id="lv-pitch"><div class="lv-f"><i class="c"></i><i class="b l"></i><i class="b r"></i></div><div id="lv-zone"></div><div id="lv-dots"></div><span class="lv-ball" id="lv-ball"></span>' +
        '<div class="lv-forms"><span><i class="us"></i><b id="lv-fu"></b></span><span><i class="th"></i><b id="lv-ft"></b></span></div></div>' +
      '<div class="lv-stats"><div><small>Chutes</small><b id="lv-sh">0 · 0</b></div><div><small>No gol</small><b id="lv-ot">0 · 0</b></div><div><small>Posse</small><b id="lv-ps">50%</b></div></div>' +
      '<div class="lv-aux" id="lv-aux"></div>' +
      '<ul class="lv-feed" id="lv-feed"><li><i>0\'</i><span>Bola rolando. ' + esc(nm(co.club)) + ' no ' + m.us.form + ', ' + esc(S.CO_STY[m.us.style].name.toLowerCase()) + '; ' + esc(nm(m.vs)) + ' no ' + m.them.form + '.</span></li></ul>' +
      '<div class="lv-bar"><div class="lv-speed" id="lv-speed">' + ['1', '3'].map(k => '<button data-sp="' + k + '"' + (k === co.speed ? ' class="on"' : '') + '>' + SPEED[k][0] + '</button>').join('') +
        '<button data-sp="fim" aria-label="Pular para o fim">' + ICO.ff + '</button></div><button class="btn" id="b-lv-stop">' + ICO.pause + 'Parar e mexer</button></div>' +
      '<div class="lv-sheet" id="lv-sheet"></div></div>');
    const ourGoals = () => (m.home ? m.gh : m.ga), theirGoals = () => (m.home ? m.ga : m.gh);
    const mom = () => { const v = m.mom || []; const w = v.slice(-6); return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 50; };
    const auxBox = r => '<span class="lv-ai">' + ICO.aux + '</span><div><small>Auxiliar, no banco</small><span>"' + esc(r.txt) + '"</span>' +
      (r.tags.length ? '<p class="lv-tags">' + r.tags.map(t => '<em>' + esc(t) + '</em>').join('') + '</p>' : '') + '</div>';
    const paint = () => {
      $('lv-score').innerHTML = m.gh + ' <i>x</i> ' + m.ga;
      $('lv-clock').innerHTML = '<i></i>' + m.min + '\'';
      const ps = S.coPoss(m), pu = m.home ? ps : 1 - ps, sh = m.sh || { us: 0, them: 0 }, ot = m.ot || { us: 0, them: 0 };
      const hs = m.home ? [sh.us, sh.them] : [sh.them, sh.us], ho = m.home ? [ot.us, ot.them] : [ot.them, ot.us];
      $('lv-sh').textContent = hs[0] + ' · ' + hs[1]; $('lv-ot').textContent = ho[0] + ' · ' + ho[1];
      $('lv-ps').innerHTML = Math.round((m.home ? pu : 1 - pu) * 100) + '<small>%</small>';
      $('lv-mom').innerHTML = momSvg(m);
      const mo = mom(); $('lv-momw').textContent = m.min < 5 ? 'começo de jogo' : mo > 56 ? nm(co.club) + ' por cima' : mo < 44 ? nm(m.vs) + ' por cima' : 'jogo parelho';
      $('lv-dots').innerHTML = lvDots(m.us, true, mo, m.min) + lvDots(m.them, false, 100 - mo, m.min);
      const b = lvBall(m, mo); $('lv-ball').style.left = b[0] + '%'; $('lv-ball').style.top = b[1] + '%';
      $('lv-fu').textContent = m.us.form; $('lv-ft').textContent = m.them.form;
      if (!read || m.min % 10 === 0 || m.stop) read = S.coRead(co, m);
      $('lv-aux').innerHTML = auxBox(read);
      // A faixa de onde eles chegam: a direita da tela é o seu ataque; a sua direita fica embaixo
      $('lv-zone').innerHTML = read.side ? '<i class="' + (read.side === 'direita' ? 'bot' : 'top') + '"></i><b class="' + (read.side === 'direita' ? 'bot' : 'top') + '">Atacam pela sua ' + read.side + '</b>' : '';
      const fresh = m.ev.filter(e => !seen.has(e));
      if (fresh.length) { fresh.forEach(e => seen.add(e)); $('lv-feed').insertAdjacentHTML('afterbegin', fresh.reverse().map(e => feedLine(m, e)).join('')); if (fresh.some(e => e.t === 'gol')) sfx('tap'); }
    };
    const finish = () => { clearTimeout(timer); const log = S.coMatchEnd(co, m); delete co.live; save('hub'); result(m, log, false, firstMove); };
    const end = () => {
      clearTimeout(timer); paint(); open = true;
      $('lv-sheet').innerHTML = '<div class="lv-sh"><i class="lv-grab"></i><div class="lv-st-h"><small>90\' · Fim de jogo</small><b>' + m.gh + ' x ' + m.ga + '</b></div>' +
        '<h2>' + (ourGoals() > theirGoals() ? 'Vitória' : ourGoals() < theirGoals() ? 'Derrota' : 'Empate') + '</h2><button class="btn" id="b-lv-end">Ver o resultado</button></div>';
      $('lv-sheet').classList.add('on');
      $('b-lv-end').onclick = () => { sfx('tap'); finish(); };
    };
    const tick = () => {
      if (open) return;
      if (m.done) return end();
      const st = S.coMatchStep(co, m, m.min + 1);
      paint();
      if (st && st.t !== 'fim' && !(co.speed === '3' && st.t === 'gol')) return sheet(st);
      if (m.done) return end();
      timer = setTimeout(tick, SPEED[co.speed][1]);
    };
    const toEnd = () => { clearTimeout(timer); while (!m.done) { S.coMatchStep(co, m); S.coAutoStop(co, m); } read = null; end(); };
    // O cartão da parada
    const sheet = st => {
      clearTimeout(timer); open = true; read = S.coRead(co, m);
      const s = m.us, us = st.s === 'us';
      const T = { gol: 'Gol do ' + (us ? nm(co.club) : nm(m.vs)), intervalo: 'Intervalo', vermelho: 'Expulso', lesao: 'Lesão', pausa: 'Jogo parado' }[st.t] || 'Parada';
      const tag = { gol: us ? 'Gol' : 'Gol sofrido', intervalo: 'Intervalo', vermelho: 'Cartão vermelho', lesao: 'Lesão', pausa: 'Você parou' }[st.t] || 'Parada';
      const sh = m.sh || { us: 0, them: 0 };
      const txt = st.t === 'gol' ? esc(st.p || '') + ' marca' + (st.l ? ' ' + LANE[st.l] : '') + '.' :
        st.t === 'intervalo' ? 'Primeiro tempo: ' + D.plural(sh.us, 'chute', 'chutes') + ' seus contra ' + sh.them + ' deles.' :
        st.t === 'vermelho' ? esc(st.p || '') + ' foi expulso. Com um a menos, fechar o time costuma segurar o resultado.' :
        st.t === 'lesao' ? esc(st.p || '') + ' não aguenta. Troque agora ou o time joga com ele mancando.' : 'O jogo espera você.';
      $('lv-sheet').innerHTML = '<div class="lv-sh"><i class="lv-grab"></i><div class="lv-st-h"><small class="' + (st.t === 'gol' && !us || st.t === 'vermelho' || st.t === 'lesao' ? 'bad' : '') + '">' + m.min + '\' · ' + tag + '</small><b>' + m.gh + ' x ' + m.ga + '</b></div>' +
        '<h2>' + esc(T) + '</h2><p>' + txt + '</p><div class="lv-aux in">' + auxBox(read).replace('Auxiliar, no banco', 'O auxiliar leu assim') + '</div>' +
        '<div class="lv-acts"><button class="lv-big" id="b-lv-sub"' + (s.subs ? '' : ' disabled') + '>' + ICO.sub + '<b>Trocar</b><small>' + (s.subs ? D.plural(s.subs, 'troca', 'trocas') : 'sem trocas') + '</small></button>' +
        '<button class="lv-big" id="b-lv-tac">' + ICO.tac + '<b>Tática</b><small>' + s.form + ' · ' + esc(S.CO_STY[s.style].name) + '</small></button></div>' +
        '<button class="btn" id="b-lv-go">Seguir o jogo</button></div>';
      $('lv-sheet').classList.add('on');
      $('b-lv-go').onclick = () => { sfx('tap'); $('lv-sheet').classList.remove('on'); open = false; if (co.speed === 'fim') return toEnd(); timer = setTimeout(tick, 400); };
      $('b-lv-sub').onclick = () => { sfx('tap'); subs(st); };
      $('b-lv-tac').onclick = () => { sfx('tap'); tactic(st); };
    };
    const back = st => { $('lv-full').remove(); paint(); sheet(st); };
    const full = html => { const d = document.createElement('div'); d.className = 'lv-full'; d.id = 'lv-full'; d.innerHTML = html; document.querySelector('.lv').appendChild(d); d.scrollTop = 0; return d; };
    // Trocas no campinho: arraste o reserva até o titular (troca) ou um titular até outro (trocam de posição).
    // Tocar num e depois no outro faz o mesmo.
    const subs = st => {
      const s = m.us, by = {}; s.squad.forEach(p => { by[p.id] = p; });
      let sel = null;
      const d = full('');
      const draw = () => {
        const sp = spots(s.form), slots = S.coSlots(s.form);
        const tok = (id, i) => { const sl = sp[i]; if (!sl) return '';
          if (!id) return '<span class="lv-tk gone" style="left:' + sl[0] + '%;top:' + sl[1] + '%"><i></i><b>expulso</b></span>';
          const p = by[id], low = p.en < 55, hurt = !!p.out;
          return '<button class="lv-tk' + (low || hurt ? ' low' : '') + (sel && sel.xi === i ? ' sel' : '') + '" data-dxi="' + i + '" style="left:' + sl[0] + '%;top:' + sl[1] + '%">' +
            (hurt ? '<em>machucado</em>' : low ? '<em>' + Math.round(p.en) + '% · cansado</em>' : '') + '<i' + (i ? '' : ' class="gk"') + '>' + p.ovr + '</i><b>' + esc(last(p.n)) + '</b><small>' + slots[i] + '</small></button>'; };
        const bench = s.bench.map(id => by[id]).filter(Boolean);
        d.innerHTML = '<div class="lv-fh"><div><small>' + m.min + '\' · ' + m.gh + ' x ' + m.ga + ' · Parada</small><h2>Mexer no time</h2></div>' +
          '<span class="lv-pips" aria-label="' + D.plural(s.subs, 'troca restante', 'trocas restantes') + '">' + [0, 1, 2, 3, 4].map(i => '<i class="' + (i < s.subs ? 'on' : '') + '"></i>').join('') + '</span></div>' +
          '<p class="lv-hint">' + (sel ? 'Agora toque ou solte no jogador que vai trocar com ele.' : 'Arraste um reserva até um titular para trocar. Arraste um titular até outro para trocar os dois de posição.') + '</p>' +
          '<div class="lv-vp" id="lv-vp"><div class="lv-vf"><i class="c"></i><i class="b t"></i><i class="b u"></i></div>' + s.xi.map(tok).join('') + '</div>' +
          '<div class="lv-bh"><small>Banco</small><small>' + (s.subs ? 'arraste para o campo' : 'sem trocas') + '</small></div>' +
          '<div class="lv-bench">' + (bench.length ? bench.map(p => '<button class="lv-bc' + (sel && sel.b === p.id ? ' sel' : '') + '" data-dbn="' + p.id + '"' + (s.subs ? '' : ' disabled') + '><small>' + p.pos + ' · ' + p.ovr + '</small><b>' + esc(p.n) + '</b><i><em class="' + enCls(p.en) + '" style="width:' + Math.round(p.en) + '%"></em></i></button>').join('') : '<p class="co-tip">Ninguém no banco.</p>') + '</div>' +
          '<div class="lv-fb"><button class="btn" id="b-lv-back">Pronto</button></div>';
        $('b-lv-back').onclick = () => { sfx('tap'); back(st); };
        bindDrag();
      };
      // Faz a troca entre a origem e o destino (titular ou reserva)
      const act = (a, b) => {
        if (!a || !b) return;
        if (a.xi !== undefined && b.xi !== undefined) { if (a.xi === b.xi) return; const t = s.xi[a.xi]; s.xi[a.xi] = s.xi[b.xi]; s.xi[b.xi] = t; sfx('tap'); return; }
        const x = a.xi !== undefined ? a : b, n = a.b ? a : b;
        if (x.xi === undefined || !n.b) return;
        const out = s.xi[x.xi];
        if (out && S.coSub(co, m, out, n.b)) { m.ev.push({ m: m.min, t: 'troca', s: 'us', p: last(by[out].n), q: last(by[n.b].n) }); if (firstMove === null) firstMove = m.min; sfx('tap'); }
      };
      const srcOf = el => (el.dataset.dxi !== undefined ? { xi: +el.dataset.dxi } : el.dataset.dbn ? { b: el.dataset.dbn } : null);
      const bindDrag = () => {
        d.querySelectorAll('[data-dxi],[data-dbn]').forEach(el => {
          if (el.disabled) return;
          el.onpointerdown = ev => {
            ev.preventDefault();
            const src = srcOf(el), x0 = ev.clientX, y0 = ev.clientY; let ghost = null;
            const mv = e2 => {
              if (!ghost && Math.hypot(e2.clientX - x0, e2.clientY - y0) > 8) { ghost = el.cloneNode(true); ghost.classList.add('lv-ghost'); ghost.removeAttribute('style'); document.body.appendChild(ghost); el.classList.add('drag'); }
              if (ghost) { const z = U.zk ? U.zk() : 1; ghost.style.left = e2.clientX / z + 'px'; ghost.style.top = e2.clientY / z + 'px';
                d.querySelectorAll('.over').forEach(o => o.classList.remove('over')); ghost.style.display = 'none'; const t = document.elementFromPoint(e2.clientX, e2.clientY); ghost.style.display = '';
                const tg = t && t.closest('[data-dxi],[data-dbn]'); if (tg && tg !== el) tg.classList.add('over'); }
            };
            const up = e2 => {
              window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
              if (ghost) { ghost.remove(); const t = document.elementFromPoint(e2.clientX, e2.clientY), tg = t && t.closest('[data-dxi],[data-dbn]'); sel = null; if (tg && tg !== el) act(src, srcOf(tg)); draw(); return; }
              // Toque: escolhe; o segundo toque troca
              if (sel) { const a = sel; sel = null; if (a.xi === src.xi && a.b === src.b) return draw(); act(a, src); return draw(); }
              sel = src; sfx('tap'); draw();
            };
            window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
          };
        });
      };
      draw();
    };
    // Tática no meio do jogo: a formação em mini campos, o estilo e como fica contra o plano de agora deles
    const tactic = st => {
      const s = m.us, f0 = s.form, s0 = s.style;
      const d = full('');
      const mini = f => '<span class="lv-mp">' + spots(f).map(p => '<i style="left:' + p[0] + '%;top:' + p[1] + '%"></i>').join('') + '</span>';
      const draw = () => {
        const H2 = m.home ? m.us : m.them, A2 = m.home ? m.them : m.us, mu = S.coMatchup(H2, A2);
        const pv = { us: m.home ? mu.h : mu.a, op: m.home ? mu.a : mu.h, them: m.them, xg: m.home ? [mu.lh, mu.la] : [mu.la, mu.lh], poss: m.home ? mu.h.poss : mu.a.poss };
        const th = m.them, tc = club(th.club || m.vs);
        d.innerHTML = '<div class="lv-fh"><div><small>' + m.min + '\' · ' + m.gh + ' x ' + m.ga + ' · Parada</small><h2>Mudar a tática</h2></div></div>' +
          '<div class="lv-opp">' + crestB(tc.id, 'co-vc') + '<div><small>Eles agora</small><b>' + th.form + ' · ' + esc(S.CO_STY[th.style].name) + '</b></div></div>' +
          '<div class="lv-bh"><small>Formação</small></div><div class="lv-fms">' + Object.keys(S.CO_FORMS).map(f => '<button data-lf="' + f + '"' + (f === s.form ? ' class="on"' : '') + '>' + mini(f) + '<b>' + f + '</b></button>').join('') + '</div>' +
          '<div class="lv-bh"><small>Estilo</small></div><div class="lv-sts">' + S.CO_STYLES.map(k => '<button data-ls="' + k + '"' + (k === s.style ? ' class="on"' : '') + '><b>' + esc(S.CO_STY[k].name) + '</b><span>' + STY_SHORT[k] + '</span></button>').join('') + '</div>' +
          '<div class="lv-bh"><small>Como fica contra eles</small></div>' + mview(pv, s.form, s.style) +
          '<div class="lv-fb"><button class="btn" id="b-lv-back">Pronto</button></div>';
        d.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { sfx('tap'); S.coMatchTactic(co, m, b.dataset.lf); draw(); });
        d.querySelectorAll('[data-ls]').forEach(b => b.onclick = () => { sfx('tap'); S.coMatchTactic(co, m, null, b.dataset.ls); draw(); });
        $('b-lv-back').onclick = () => {
          sfx('tap');
          if (s.form !== f0 || s.style !== s0) { m.ev.push({ m: m.min, t: 'tatica', s: 'us', p: s.form + ', ' + S.CO_STY[s.style].name.toLowerCase() }); if (firstMove === null) firstMove = m.min; }
          back(st);
        };
      };
      draw();
    };
    $('lv-speed').querySelectorAll('button').forEach(b => b.onclick = () => {
      sfx('tap'); const k = b.dataset.sp;
      if (k === 'fim') { co.speed = 'fim'; if (!open) toEnd(); return; }
      co.speed = k; $('lv-speed').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (!open) { clearTimeout(timer); timer = setTimeout(tick, SPEED[k][1]); }
    });
    $('b-lv-stop').onclick = () => { if (open || m.done) return; sfx('tap'); sheet({ t: 'pausa' }); };
    paint();
    timer = setTimeout(tick, 600);
  }
  function result(m, log, aux, move) {
    const cl = club(co.club), vs = club(m.vs), H = m.home ? cl : vs, A = m.home ? vs : cl;
    const tl = m.ev.filter(e => ['gol', 'vermelho', 'tatica', 'troca'].includes(e.t) || (e.t === 'lesao' && e.s === 'us')).map(e => {
      const mine = e.s === 'us', ic = e.t === 'gol' ? ICO.ball(mine ? '#FBF8EF' : '#9DB5A6') : e.t === 'vermelho' ? '<span class="co-red"></span>' : e.t === 'lesao' ? U.emo('🩹', 'xs') : ICO.sub;
      const tx = e.t === 'tatica' ? (mine ? 'Você muda para ' + esc(e.p) : 'Mudaram para ' + esc(e.p)) : e.t === 'troca' ? 'Sai ' + esc(e.p) + ', entra ' + esc(e.q) : esc(e.p || '');
      return '<li class="' + e.s + ' ' + e.t + (mine && (e.t === 'troca' || e.t === 'tatica') ? ' you' : '') + '"><i>' + e.m + '\'</i>' + ic + '<span>' + tx + (e.t === 'troca' || (e.t === 'tatica' && mine) ? '' : ' · <small>' + esc(mine ? cl.short || cl.name : vs.short || vs.name) + '</small>') + '</span></li>'; }).join('');
    const word = log.res === 'v' ? 'Vitória' : log.res === 'e' ? 'Empate' : 'Derrota', B = co.board;
    const ultTxt = co.sacked ? '' : B.ult && B.ult.n === 0 ? '<div class="co-ult"><b>Ultimato</b><span>O presidente chamou você: "Vença ' + B.ult.need + ' dos próximos ' + B.ult.of + ' ou está fora."</span></div>' :
      B.ult ? '<div class="co-ult"><b>Ultimato</b><span>' + B.ult.got + ' de ' + B.ult.need + ' vitórias, ' + (B.ult.of - B.ult.n) + ' jogos para isso.</span></div>' :
      B.passed && log.res === 'v' && B.conf === 45 ? '<div class="co-ok"><b>Ultimato cumprido</b><span>"Você ganhou tempo, professor."</span></div>' : '';
    const sh = m.sh || { us: 0, them: 0 }, ot = m.ot || { us: 0, them: 0 }, pu = S.coPoss(m), ph = Math.round((m.home ? pu : 1 - pu) * 100);
    const hv = (a, b) => (m.home ? [a, b] : [b, a]);
    const cmp = (lbl, a, b, sa, sb) => '<div class="lv-cmp"><b>' + (sa || a) + '</b><div><small>' + lbl + '</small><p><i style="flex:' + (a || 0.01) + '"></i><i style="flex:' + (b || 0.01) + '"></i></p></div><b>' + (sb || b) + '</b></div>';
    const [s1, s2] = hv(sh.us, sh.them), [o1, o2] = hv(ot.us, ot.them);
    render('<div class="co-res lv-res"><div class="lv-board"><div class="lv-eb">Rodada ' + log.r + ' · ' + word + (aux ? ' · com o auxiliar' : '') + '</div>' +
      '<div class="lv-sc"><span>' + crestB(H.id) + '<b>' + esc(H.short || H.name) + '</b></span><div class="lv-mid"><em>' + m.gh + ' <i>x</i> ' + m.ga + '</em></div><span>' + crestB(A.id) + '<b>' + esc(A.short || A.name) + '</b></span></div>' +
      (m.mom && m.mom.length ? momSvg(m, move !== null && move !== undefined ? move : null) + (move !== null && move !== undefined ? '<small class="lv-mkt">Sua mudança aos ' + move + '\'</small>' : '') : '') + '</div>' +
      (m.sh ? '<div class="lv-cmps">' + cmp('Chutes', s1, s2) + cmp('No gol', o1, o2) + cmp('Posse', ph, 100 - ph, ph + '%', (100 - ph) + '%') + '</div>' : '') +
      (tl ? '<ul class="lv-tl">' + tl + '</ul>' : '<p class="lead co-nil">Jogo truncado, sem gols.</p>') +
      ultTxt + (co.sacked ? '' : moodLine()) +
      '<button class="btn" id="b-co-next">' + (co.sacked ? 'Falar com o presidente' : 'Continuar') + '</button></div>');
    $('b-co-next').onclick = () => { sfx('tap'); if (co.sacked) return sacked(); if (co.ss.done) return finishSeason(); hub(); };
  }
  function sacked() {
    const cl = club(co.club);
    render('<div class="co-msg">' + crest(cl.id, 'co-big') + '<div class="eyebrow">' + esc(cl.name) + '</div><h2>Você foi demitido.</h2>' +
      '<p class="lead">"Não deu, professor. Obrigado pelo trabalho." A temporada segue sem você; no fim dela, o telefone toca de novo.</p>' +
      '<button class="btn" id="b-co-end">Ver como terminou a liga</button></div>', { center: true });
    $('b-co-end').onclick = () => { sfx('tap'); finishSeason(); };
  }

  // ---------- fim da temporada: posição, meta, fama, experiência ----------
  function finishSeason() { const out = S.coSeasonEnd(co); save('end'); seasonEnd(out); }
  function seasonEnd(out) {
    G.c = null; bar();
    const cl = club(out.club), df = out.fame[1] - out.fame[0];
    const head = out.sacked ? 'Demitido no meio do caminho' : out.won ? 'Campeão!' : out.up ? 'Subiu de divisão!' : out.down ? 'Rebaixado' : out.met ? 'Meta cumprida' : 'Meta não cumprida';
    const skills = () => '<div class="co-sk">' + Object.keys(S.CO_SKILLS).map(k => '<div class="co-skr"><span><b>' + S.CO_SKILLS[k] + '</b><small>' + SK_TXT[k] + '</small></span>' +
      '<i>' + co.xp[k] + '</i><button class="btn sm" data-sk="' + k + '"' + (co.xp.pts > 0 && co.xp[k] < S.CO.skillMax ? '' : ' disabled') + ' aria-label="Mais um ponto em ' + S.CO_SKILLS[k] + '">+1</button></div>').join('') + '</div>';
    const draw = () => {
      render('<div class="eyebrow">' + esc(out.league) + ' · ' + (YEAR0 + out.season) + '</div><h2>' + head + '</h2>' +
        '<div class="co-end"><div class="co-big-n">' + crest(cl.id, 'co-vc') + '<b>' + ordTxt(out.pos) + '</b><small>de ' + out.n + '</small></div>' +
          '<div class="co-meta"><small>Meta</small><b>' + S.CO_GOAL_TXT[out.goal.k] + '</b><span class="' + (out.met ? 'up' : 'down') + '">' + (out.met ? 'cumprida' : out.sacked ? 'demitido' : 'não cumprida') + '</span></div></div>' +
        '<div class="co-box co-fame"><div class="eyebrow">Fama</div><div class="co-fbar"><em style="width:' + out.fame[1] + '%"></em></div><p><b>' + out.fame[1] + '</b> <span class="' + (df >= 0 ? 'up' : 'down') + '">' + (df >= 0 ? '+' : '') + df + '</span> · ' + FAME_TXT(out.fame[1]) + '</p></div>' +
        '<div class="co-box"><div class="eyebrow">Experiência · ' + (out.xp ? '+' + out.xp + ' ' + (out.xp > 1 ? 'pontos' : 'ponto') : 'nenhum ponto') + (co.xp.pts ? ' · ' + co.xp.pts + ' para usar' : '') + '</div>' + skills() + '</div>' +
        (out.kids && out.kids.length ? '<p class="co-note">' + U.emo('🌱', 'xs') + ' Subiram da base: ' + out.kids.map(esc).join(', ') + '.</p>' : '') +
        (out.left && out.left.length ? '<p class="co-note">Saíram: ' + out.left.slice(0, 5).map(x => esc(x.n) + ' (' + x.why + ')').join(', ') + '.</p>' : '') +
        '<div class="inv-bar fade co-bar">' + (out.offers ? '<button class="btn" id="b-co-of">Ver propostas</button>' :
          '<button class="btn ghost" id="b-co-mk">Ouvir outros clubes</button><button class="btn" id="b-co-ns">Temporada ' + (YEAR0 + co.season) + '</button>') + '</div>');
      document.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { if (S.coSkill(co, b.dataset.sk)) { sfx('tap'); save(); draw(); } });
      if ($('b-co-of')) $('b-co-of').onclick = () => { sfx('tap'); co.step = 'offers'; offers(out.offers); };
      if ($('b-co-ns')) $('b-co-ns').onclick = () => { sfx('tap'); S.coStart(co); save('hub'); hub(); };
      if ($('b-co-mk')) $('b-co-mk').onclick = () => { sfx('tap'); const l = S.coOffers(co, 3); save(); offers(l, true); };
    };
    draw();
  }
  const SK_TXT = { leitura: 'o time rende um pouco mais em todo jogo', motiv: 'derrota e banco abalam menos o elenco', negoc: 'vale no mercado (chega numa próxima parte)' };
  const FAME_TXT = f => (f >= 80 ? 'técnico de seleção' : f >= 60 ? 'disputado pelos grandes' : f >= 40 ? 'nome conhecido' : f >= 20 ? 'começando a aparecer' : 'ninguém conhece ainda');

  Object.assign(U, { coCreate: create, coHub: () => co && hub() });
})();
