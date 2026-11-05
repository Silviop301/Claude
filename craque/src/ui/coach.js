// Interface — Modo Treinador (plano, fase 7): criação, propostas de clube, central do clube, time (formação, estilo,
// titulares) e o jogo como resultado; fim da temporada com fama e experiência. O motor é engine/coach.js (S.co*).
// Save próprio (SAVE_CO), separado das carreiras de jogador; G.c fica vazio (a barra do jogador não aparece).
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, sfx, $, esc, money, club, league, crest, load, store, render, bar, G, YEAR0 } = U;
  const SAVE_CO = U.SAVE_CO = 'climbix-treinador-v1';
  let co = null;
  const save = step => { if (co) co.step = step || co.step; store(SAVE_CO, co ? { co, at: Date.now() } : { co: null, at: Date.now() }); };
  const yr = () => YEAR0 + co.season;
  const last = n => String(n || '').split(' ').filter(Boolean).pop() || '';
  const posTxt = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meia', ATA: 'Atacante' };
  const ordTxt = n => n + 'º';
  const enCls = e => (e >= 75 ? 'ok' : e >= 55 ? 'mid' : 'low');

  // ---------- ingresso da tela inicial ----------
  U.coSaved = () => { const sv = load(SAVE_CO); return sv && sv.co && sv.co.mode === 'treinador' ? sv : null; };
  U.coContTicket = (sv, tk) => {
    const c = sv.co, cl = c.club && club(c.club), ss = c.ss;
    const line = ss && !ss.done ? '<span>Rodada <b>' + Math.min(ss.i + 1, ss.rounds.length) + '</b> de ' + ss.rounds.length + '</span><span>Fama <b>' + c.fame + '</b></span>'
      : '<span>Temporada <b>' + (YEAR0 + c.season) + '</b></span><span>Fama <b>' + c.fame + '</b></span>';
    return tk('tk-cont', 'b-cont-co', '<span class="tk-who">' + (cl ? crest(cl.id, 'lg') : U.emo('📋', 'lg')) + '<span><small>Modo Treinador</small><b>' + esc(c.name) + '</b>' +
      '<span>' + (cl ? esc(cl.name) : 'Sem clube') + ' · técnico</span></span></span><span class="tk-line">' + line + '</span>',
      '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z" fill="currentColor"/></svg><b>Continuar</b><i class="tk-bars" aria-hidden="true"></i><small>Nº ' + String(YEAR0 + c.season) + '</small>');
  };
  U.coAlso = sv => '<button class="hm-line" id="b-cont-co">' + U.emo('📋', 'xs') + '<span>Também jogando: <b>' + esc(sv.co.name) + '</b>' +
    (sv.co.club && club(sv.co.club) ? ', técnico do ' + esc(club(sv.co.club).name) : '') + '</span><em>Treinador ›</em></button>';
  U.coHomeBind = () => {
    const sv = U.coSaved();
    if ($('b-cont-co')) $('b-cont-co').onclick = () => { sfx('tap'); resume(sv); };
    if ($('b-new-co')) $('b-new-co').onclick = () => (sv ? U.ask('Começar outra carreira de técnico?', 'A carreira de ' + sv.co.name + ' será apagada quando o novo técnico assinar com um clube.', 'Novo técnico', create) : create());
  };
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
  function create() {
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
    render('<div class="co-head">' + crest(cl.id, 'co-hc') + '<div><small>' + esc(ss.name) + ' · ' + yr() + '</small><b>' + esc(cl.name) + '</b><span>' + esc(co.name) + ' · fama ' + co.fame + '</span></div></div>' +
      ult +
      '<div class="co-next">' + (nx.bye ? '<div class="eyebrow">Rodada ' + nx.round + ' de ' + nx.of + '</div><h2>Sem jogo nesta rodada</h2><p class="lead">O time descansa. Os outros jogam.</p>' :
        '<div class="eyebrow">Rodada ' + nx.round + ' de ' + nx.of + ' · ' + (nx.home ? 'em casa' : 'fora') + '</div>' +
        '<div class="co-vs"><span>' + crest(cl.id, 'co-vc') + '<b>' + esc(cl.short || cl.name) + '</b><small>' + ordTxt(pos) + '</small></span><em>x</em>' +
          '<span>' + crest(vs.id, 'co-vc') + '<b>' + esc(vs.short || vs.name) + '</b><small>' + ordTxt(S.coTable(co).findIndex(x => x.id === vs.id) + 1) + '</small></span></div>') +
        '<div class="co-meta"><small>Meta</small><b>' + S.CO_GOAL_TXT[B.goal.k] + '</b><span>' + (B.goal.k === 'titulo' ? 'você está em ' + ordTxt(pos) : 'até o ' + ordTxt(B.goal.pos) + ' · hoje ' + ordTxt(pos)) + '</span></div>' +
        (nx.bye ? '' : scout(S.coPreview(co).them)) + moodLine() +
        '<button class="btn" id="b-co-play">' + (nx.bye ? 'Ver a rodada' : 'Escalar e jogar') + '</button></div>' +
      '<div class="co-side"><div class="co-box"><div class="eyebrow">Tabela ' + form5() + '</div>' + table(false) + '<button class="btn ghost sm" id="b-co-tab">Tabela inteira</button></div>' +
      '<div class="co-acts"><button class="btn ghost" id="b-co-team">Time e elenco</button><button class="btn ghost" id="b-co-out">Sair para o início</button></div></div>');
    $('b-co-play').onclick = () => { sfx('tap'); if (nx.bye) { S.coSkipRound(co); save(); return hub(); } team(true); };
    $('b-co-team').onclick = () => { sfx('tap'); team(false); };
    $('b-co-tab').onclick = () => { sfx('tap'); render('<button class="back-link" id="b-co-back">‹ Voltar</button><div class="eyebrow">' + esc(ss.name) + ' · ' + yr() + '</div><h2>Tabela</h2><div class="co-box">' + table(true) + '</div>'); $('b-co-back').onclick = hub; };
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
  function mview(pv) {
    if (!pv) return '';
    const u = pv.us, o = pv.op;
    // Contagem de gente por vaga (a força entra no cálculo, mas o que se mostra é quantos)
    const cnt = f => { const sl = S.CO_FORMS[f].slots; return { cm: sl.filter(x => (x.ln === 'm' || x.ln === 'am') && !x.w).length,
      wide: sl.filter(x => x.w && x.ln !== 'd').length, wdef: sl.filter(x => x.w && (x.ln === 'd' || x.pos === 'LAT')).length,
      cf: sl.filter(x => x.ln === 'a' && !x.w).length, cb: sl.filter(x => x.ln === 'd' && !x.w).length }; };
    const a = cnt(co.form), b = cnt(pv.them.form), oc = S.CO_STY[pv.them.style].ctrl;
    const word = (d, t) => (d > t ? ['up', 'vantagem sua'] : d < -t ? ['down', 'vantagem deles'] : ['eq', 'parelho']);
    const row = (lbl, d, t, why) => { const [c, w] = word(d, t); return '<div class="co-mr ' + c + '"><small>' + lbl + '</small><b><i aria-hidden="true">' + (c === 'up' ? '▲' : c === 'down' ? '▼' : '=') + '</i>' + w + '</b><span>' + why + '</span></div>'; };
    const sty = (1.0 * u.press + 1.6 * u.counter) - (1.0 * o.press + 1.6 * o.counter);
    const r = pv.xg[0] / pv.xg[1];
    return '<div class="co-mu"><div class="co-mu-h"><small>Confronto</small><b class="' + (r > 1.25 ? 'up' : r < 0.8 ? 'down' : 'eq') + '">' + (r > 1.5 ? 'Você é o favorito' : r > 1.15 ? 'Leve vantagem sua' : r < 0.67 ? 'Eles são favoritos' : r < 0.87 ? 'Leve vantagem deles' : 'Jogo parelho') + '</b></div>' +
      row('Meio', pv.poss - 0.5, 0.04, a.cm + ' contra ' + b.cm + ' no meio' + (oc < 0.9 ? ', eles abrem mão da bola' : oc > 1.2 ? ', eles gostam da bola' : '')) +
      row('Lados', u.flank * u.wsh - o.flank * o.wsh, 0.06, a.wide + (a.wide === 1 ? ' aberto' : ' abertos') + ' contra ' + b.wdef + ' laterais') +
      row('Área', u.central - o.central, 0.08, a.cf + (a.cf === 1 ? ' atacante' : ' atacantes') + ' contra ' + b.cb + ' zagueiros') +
      row('Estilo', sty, 0.06, S.CO_STY[co.style].name + ' contra ' + S.CO_STY[pv.them.style].name) + '</div>';
  }
  const scout = them => '<p class="co-scout">' + U.emo('🔭', 'xs') + ' Olheiro: o ' + esc(club(them.club).short || club(them.club).name) + ' deve vir no <b>' + them.form + '</b>, ' + S.CO_STY[them.style].name.toLowerCase() + '.</p>';
  const avail = p => p && !p.out && !p.sus;
  function team(toPlay) {
    G.c = null; bar();
    const by = {}; co.squad.forEach(p => { by[p.id] = p; });
    // Titulares que não podem jogar (lesão, suspensão) saem antes de abrir: o auxiliar põe outro
    if (co.xi.some(id => !avail(by[id])) || co.xi.length < 11) { const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; }
    let sel = null;
    const nx = S.coNext(co), vs = nx && !nx.bye && club(nx.vs);
    const draw = () => {
      const slots = S.coSlots(co.form), sp = spots(co.form);
      const bench = co.squad.filter(p => !co.xi.includes(p.id)).sort((a, b) => ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].indexOf(a.pos) - ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].indexOf(b.pos) || b.ovr - a.ovr);
      const pv = S.coPreview(co);
      const shirt = (id, i) => { const p = by[id]; if (!p) return '';
        const off = p.pos !== slots[i];
        return '<button class="co-sh' + (sel && sel.i === i ? ' sel' : '') + (off ? ' off' : '') + '" data-xi="' + i + '" style="left:' + sp[i][0] + '%;top:' + sp[i][1] + '%">' +
          '<i>' + p.ovr + '</i><b>' + esc(last(p.n)) + '</b><small>' + slots[i] + (off ? ' · ' + p.pos : '') + '</small><em class="' + enCls(p.en) + '" style="width:' + Math.round(p.en) + '%"></em></button>'; };
      const row = p => '<button class="co-pl' + (sel && sel.id === p.id ? ' sel' : '') + (avail(p) ? '' : ' dis') + '" data-b="' + p.id + '"' + (avail(p) ? '' : ' disabled') + '>' +
        '<span class="co-pos">' + p.pos + '</span><span class="co-pn"><b>' + esc(p.n) + '</b><small>' + p.age + ' anos' + (p.out ? ' · lesionado, ' + D.plural(p.out, 'jogo', 'jogos') : p.sus ? ' · suspenso' : p.mo < 45 ? ' · chateado' : p.mo > 75 ? ' · motivado' : '') + '</small></span>' +
        '<span class="co-en ' + enCls(p.en) + '"><em style="width:' + Math.round(p.en) + '%"></em></span><b class="co-ov">' + p.ovr + '</b></button>';
      $('co-team').innerHTML =
        '<div class="co-forms">' + Object.keys(S.CO_FORMS).map(f => '<button data-f="' + f + '"' + (f === co.form ? ' class="on"' : '') + '>' + f + '</button>').join('') + '</div>' +
        '<div class="co-styles">' + S.CO_STYLES.map(k => '<button data-s="' + k + '"' + (k === co.style ? ' class="on"' : '') + '>' + S.CO_STY[k].name + '</button>').join('') + '</div>' +
        '<p class="co-stip">' + S.CO_STY[co.style].tip + '.</p>' +
        (pv ? scout(pv.them) + mview(pv) : '') +
        '<div class="co-pitch" aria-label="Titulares no campo"><i class="co-pl-l"></i>' + co.xi.map(shirt).join('') + '</div>' +
        '<p class="co-tip">' + (sel ? 'Agora toque em outro titular para trocar de lugar ou num reserva para entrar.' : 'Toque num titular e depois em outro jogador para trocar.') + '</p>' +
        '<div class="co-box"><div class="eyebrow">Elenco · ' + co.squad.length + ' jogadores</div><div class="co-bench">' + bench.map(row).join('') + '</div></div>';
      bind();
    };
    const bind = () => {
      document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
        sfx('tap'); const f = b.dataset.f;
        if (co.autoXI) co.xi = S.coAutoXI(co.squad, f).xi;
        else { const on = co.squad.filter(p => co.xi.includes(p.id)); co.xi = S.coAutoXI(on, f).xi.filter(Boolean); if (co.xi.length < 11) co.xi = S.coAutoXI(co.squad, f).xi; }
        co.form = f; sel = null; draw();
      });
      document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sfx('tap'); co.style = b.dataset.s; draw(); });
      document.querySelectorAll('[data-xi]').forEach(b => b.onclick = () => {
        const i = +b.dataset.xi; sfx('tap');
        if (!sel) sel = { i };
        else if (sel.i === i) sel = null;
        else if (sel.i !== undefined) { const t = co.xi[i]; co.xi[i] = co.xi[sel.i]; co.xi[sel.i] = t; co.autoXI = false; sel = null; }
        else { co.xi[i] = sel.id; co.autoXI = false; sel = null; }
        draw();
      });
      document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
        const id = b.dataset.b; sfx('tap');
        if (sel && sel.i !== undefined) { co.xi[sel.i] = id; co.autoXI = false; sel = null; }
        else sel = sel && sel.id === id ? null : { id };
        draw();
      });
    };
    render('<button class="back-link" id="b-co-back">‹ Clube</button><div class="eyebrow">' + (vs ? 'Próximo jogo · x ' + esc(vs.short || vs.name) : 'Time e elenco') + '</div>' +
      '<h2>Seu time</h2><div id="co-team"></div>' +
      '<div class="inv-bar fade co-bar"><button class="btn ghost" id="b-co-aux">Sugestão do auxiliar</button>' + (toPlay && vs ? '<button class="btn" id="b-co-go">Jogar</button>' : '<button class="btn" id="b-co-ok">Pronto</button>') + '</div>');
    $('b-co-back').onclick = () => { sfx('tap'); keepBench(); save(); hub(); };
    $('b-co-aux').onclick = () => { sfx('tap'); const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.autoXI = true; sel = null; draw(); };
    if ($('b-co-ok')) $('b-co-ok').onclick = () => { sfx('tap'); keepBench(); save(); hub(); };
    if ($('b-co-go')) $('b-co-go').onclick = () => { sfx('tap'); keepBench(); play(); };
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
  // O motor anda até a próxima parada (S.coMatchStep); a tela conta os minutos até lá na velocidade escolhida e
  // mostra os lances; na parada (gol, vermelho, lesão, intervalo) dá para trocar e mudar a tática
  const SPEED = { normal: ['Normal', 330], rapido: ['Rápido', 110], resumo: ['Resumo', 0] };
  const nm = id => { const c = club(id); return c.short || c.name; };
  function feedLine(m, e) {
    const who = e.s === 'us' ? nm(co.club) : nm(m.vs);
    const t = e.t === 'gol' ? U.emo('⚽', 'xs') + ' <b>GOL do ' + esc(who) + '!</b> ' + esc(e.p || '') :
      e.t === 'chance' ? (e.k === 'defesa' ? esc(e.p) + ' chuta e o goleiro defende' : e.k === 'fora' ? esc(e.p) + ' finaliza para fora' : e.k === 'trave' ? esc(e.p) + ' acerta a trave!' : 'Chute de ' + esc(e.p) + ' travado pela zaga') :
      e.t === 'vermelho' ? '<span class="co-red"></span> ' + esc(e.p) + ' é expulso (' + esc(who) + ')' :
      e.t === 'lesao' ? U.emo('🩹', 'xs') + ' ' + esc(e.p) + ' sente e pede para sair (' + esc(who) + ')' :
      e.t === 'tatica' ? U.emo('📋', 'xs') + ' O ' + esc(who) + ' muda para ' + esc(e.p).toLowerCase() :
      e.t === 'troca' ? U.emo('🔁', 'xs') + ' Sai ' + esc(e.p) + ', entra ' + esc(e.q) :
      e.t === 'intervalo' ? 'Fim do primeiro tempo' : '';
    return '<li class="' + e.s + ' ' + e.t + '"><i>' + e.m + '\'</i><span>' + t + '</span></li>';
  }
  function live(m) {
    G.c = null; bar();
    co.speed = co.speed || 'normal';
    const cl = club(co.club), vs = club(m.vs), H = m.home ? cl : vs, A = m.home ? vs : cl;
    let shown = 0, timer = null; const seen = new Set();
    render('<div class="lv"><div class="lv-board"><span>' + crest(H.id, 'co-vc') + '<b>' + esc(H.short || H.name) + '</b></span>' +
      '<div class="lv-mid"><em id="lv-score">0 <i>x</i> 0</em><small id="lv-clock">0\'</small></div><span>' + crest(A.id, 'co-vc') + '<b>' + esc(A.short || A.name) + '</b></span>' +
      '<div class="lv-poss"><small>Posse</small><i><em id="lv-poss" style="width:50%"></em></i></div></div>' +
      '<div class="seg lv-speed" id="lv-speed">' + Object.keys(SPEED).map(k => '<button data-sp="' + k + '"' + (k === co.speed ? ' class="on"' : '') + '>' + SPEED[k][0] + '</button>').join('') + '</div>' +
      '<div id="lv-stop"></div><ul class="lv-feed" id="lv-feed"></ul></div>');
    const paint = () => {
      const gh = m.ev.filter(e => e.t === 'gol' && e.m <= shown && (e.s === 'us') === m.home).length, ga = m.ev.filter(e => e.t === 'gol' && e.m <= shown && (e.s === 'us') !== m.home).length;
      $('lv-score').innerHTML = gh + ' <i>x</i> ' + ga;
      $('lv-clock').textContent = shown + '\'';
      const ps = S.coPoss(m), pu = m.home ? ps : 1 - ps; $('lv-poss').style.width = Math.round(pu * 100) + '%';
      const fresh = m.ev.filter(e => e.m <= shown && !seen.has(e));
      if (fresh.length) { fresh.forEach(e => seen.add(e)); $('lv-feed').insertAdjacentHTML('afterbegin', fresh.reverse().map(e => feedLine(m, e)).join('')); if (fresh.some(e => e.t === 'gol')) sfx('tap'); }
    };
    const finish = () => { clearTimeout(timer); const log = S.coMatchEnd(co, m); delete co.live; save('hub'); result(m, log); };
    // Avança: o motor vai até a próxima parada; a tela anda minuto a minuto até ela
    const go = () => {
      $('lv-stop').innerHTML = '';
      if (co.speed === 'resumo') { while (!m.done) { S.coMatchStep(co, m); S.coAutoStop(co, m); } shown = 90; paint(); return end(); }
      if (shown >= m.min) { if (m.done) return end(); S.coMatchStep(co, m); }
      tick();
    };
    const tick = () => {
      const ms = SPEED[co.speed][1];
      if (co.speed === 'resumo') return go();
      if (shown < m.min) { shown++; paint(); timer = setTimeout(tick, ms); return; }
      const st = m.stop;
      if (!st || st.t === 'fim' || m.done) return end();
      // No rápido, só as paradas que pedem você (lesão, vermelho seu, intervalo); gol segue
      if (co.speed === 'rapido' && st.t === 'gol') { S.coMatchStep(co, m); return tick(); }
      stopPanel(st);
    };
    const end = () => {
      paint();
      $('lv-stop').innerHTML = '<div class="lv-st"><b>Fim de jogo</b><button class="btn" id="b-lv-end">Ver o resultado</button></div>';
      $('b-lv-end').onclick = () => { sfx('tap'); finish(); };
    };
    const stopPanel = st => {
      const s = m.us, by = {}; s.squad.forEach(p => { by[p.id] = p; });
      const T = { gol: (st.s === 'us' ? 'Gol do ' + nm(co.club) : 'Gol do ' + nm(m.vs)) + (st.p ? ': ' + st.p : ''), intervalo: 'Intervalo', vermelho: 'Expulso: ' + (st.p || ''), lesao: 'Lesão: ' + (st.p || '') }[st.t] || 'Parada';
      const tips = [];
      if (st.t === 'lesao') tips.push('Ele não aguenta: troque agora ou o time joga com ele mancando.');
      if (st.t === 'vermelho') tips.push('Com um a menos, fechar o time costuma segurar o resultado.');
      const tired = s.xi.filter(id => id && by[id] && by[id].en < 60).map(id => last(by[id].n));
      if (tired.length) tips.push('Cansados: ' + tired.slice(0, 3).join(', ') + '.');
      $('lv-stop').innerHTML = '<div class="lv-st"><small>' + m.min + '\'</small><b>' + esc(T) + '</b>' + (tips.length ? '<p>' + tips.map(esc).join(' ') + '</p>' : '') +
        '<div class="lv-acts"><button class="btn ghost" id="b-lv-sub">Trocar · ' + s.subs + '</button><button class="btn ghost" id="b-lv-tac">Tática</button><button class="btn" id="b-lv-go">Seguir</button></div><div id="lv-panel"></div></div>';
      $('b-lv-go').onclick = () => { sfx('tap'); go(); };
      $('b-lv-sub').onclick = () => { sfx('tap'); subs(st); };
      $('b-lv-tac').onclick = () => { sfx('tap'); tactic(st); };
    };
    const subs = st => {
      const s = m.us, by = {}; s.squad.forEach(p => { by[p.id] = p; });
      const slots = S.coSlots(s.form);
      let out = st.t === 'lesao' && st.id && s.xi.includes(st.id) ? st.id : null;
      const draw = () => {
        if (!s.subs) { $('lv-panel').innerHTML = '<p class="co-tip">Sem trocas.</p>'; return; }
        const row = (p, attr, sl, on) => '<button class="co-pl' + (on ? ' sel' : '') + '" ' + attr + '><span class="co-pos">' + (sl || p.pos) + '</span><span class="co-pn"><b>' + esc(p.n) + '</b><small>' + (p.out ? 'machucado' : p.en < 60 ? 'cansado' : p.pos) + '</small></span><span class="co-en ' + enCls(p.en) + '"><em style="width:' + Math.round(p.en) + '%"></em></span><b class="co-ov">' + p.ovr + '</b></button>';
        $('lv-panel').innerHTML = '<div class="co-box"><div class="eyebrow">' + (out ? 'Quem entra no lugar de ' + esc(last(by[out].n)) + '?' : 'Quem sai?') + ' · ' + s.subs + (s.subs === 1 ? ' troca' : ' trocas') + '</div><div class="co-bench">' +
          (out ? s.bench.map(id => by[id]).filter(Boolean).map(p => row(p, 'data-in="' + p.id + '"')).join('') :
            s.xi.map((id, i) => (id && by[id] ? row(by[id], 'data-out="' + id + '"', slots[i]) : '')).join('')) + '</div></div>';
        document.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { sfx('tap'); out = b.dataset.out; draw(); });
        document.querySelectorAll('[data-in]').forEach(b => b.onclick = () => {
          sfx('tap'); const inn = b.dataset.in;
          if (S.coSub(co, m, out, inn)) { m.ev.push({ m: m.min, t: 'troca', s: 'us', p: last(by[out].n), q: last(by[inn].n) }); paint(); }
          out = null; $('b-lv-sub').textContent = 'Trocar · ' + s.subs; draw();
        });
      };
      draw();
    };
    const tactic = () => {
      const s = m.us;
      const draw = () => {
        $('lv-panel').innerHTML = '<div class="co-box"><div class="co-forms">' + Object.keys(S.CO_FORMS).map(f => '<button data-lf="' + f + '"' + (f === s.form ? ' class="on"' : '') + '>' + f + '</button>').join('') + '</div>' +
          '<div class="co-styles">' + S.CO_STYLES.map(k => '<button data-ls="' + k + '"' + (k === s.style ? ' class="on"' : '') + '>' + S.CO_STY[k].name + '</button>').join('') + '</div><p class="co-stip">' + S.CO_STY[s.style].tip + '.</p></div>';
        document.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { sfx('tap'); S.coMatchTactic(co, m, b.dataset.lf); draw(); });
        document.querySelectorAll('[data-ls]').forEach(b => b.onclick = () => { sfx('tap'); S.coMatchTactic(co, m, null, b.dataset.ls); draw(); });
      };
      draw();
    };
    $('lv-speed').querySelectorAll('button').forEach(b => b.onclick = () => {
      sfx('tap'); co.speed = b.dataset.sp; $('lv-speed').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (co.speed === 'resumo' && !$('b-lv-end')) { clearTimeout(timer); go(); }
    });
    paint(); go();
  }
  // Chutes e posse do jogo, do lado de quem joga em casa
  function statLine(m) {
    const pu = S.coPoss(m), ph = Math.round((m.home ? pu : 1 - pu) * 100), sh = m.home ? m.sh.us : m.sh.them, sa = m.home ? m.sh.them : m.sh.us;
    return '<div class="co-stat"><span><b>' + sh + '</b>Chutes<b>' + sa + '</b></span><span><b>' + ph + '%</b>Posse<b>' + (100 - ph) + '%</b></span></div>';
  }
  function result(m, log, aux) {
    const cl = club(co.club), vs = club(m.vs), H = m.home ? cl : vs, A = m.home ? vs : cl;
    const ev = m.ev.filter(e => ['gol', 'vermelho', 'tatica', 'troca'].includes(e.t) || (e.t === 'lesao' && e.s === 'us')).map(e => '<li class="' + e.s + ' ' + e.t + '"><i>' + e.m + '\'</i>' + (e.t === 'gol' ? U.emo('⚽', 'xs') : e.t === 'vermelho' ? '<span class="co-red"></span>' : e.t === 'tatica' ? U.emo('📋', 'xs') : e.t === 'troca' ? U.emo('🔁', 'xs') : U.emo('🩹', 'xs')) +
      '<span>' + (e.t === 'tatica' ? 'Mudaram para ' + esc(e.p) : e.t === 'troca' ? 'Sai ' + esc(e.p) + ', entra ' + esc(e.q) : esc(e.p || '')) + '</span><small>' + esc((e.s === 'us' ? cl : vs).short || (e.s === 'us' ? cl : vs).name) + '</small></li>').join('');
    const word = log.res === 'v' ? 'Vitória' : log.res === 'e' ? 'Empate' : 'Derrota', B = co.board;
    const ultTxt = co.sacked ? '' : B.ult && B.ult.n === 0 ? '<div class="co-ult"><b>Ultimato</b><span>O presidente chamou você: "Vença ' + B.ult.need + ' dos próximos ' + B.ult.of + ' ou está fora."</span></div>' :
      B.ult ? '<div class="co-ult"><b>Ultimato</b><span>' + B.ult.got + ' de ' + B.ult.need + ' vitórias, ' + (B.ult.of - B.ult.n) + ' jogos para isso.</span></div>' :
      B.passed && log.res === 'v' && B.conf === 45 ? '<div class="co-ok"><b>Ultimato cumprido</b><span>"Você ganhou tempo, professor."</span></div>' : '';
    render('<div class="co-res"><div class="eyebrow">Rodada ' + log.r + ' · ' + word + '</div>' +
      '<div class="co-score"><span>' + crest(H.id, 'co-vc') + '<b>' + esc(H.short || H.name) + '</b></span><em>' + m.gh + ' <i>x</i> ' + m.ga + '</em><span>' + crest(A.id, 'co-vc') + '<b>' + esc(A.short || A.name) + '</b></span></div>' +
      (m.sh ? statLine(m) : '') +
      (ev ? '<ul class="co-ev">' + ev + '</ul>' : '<p class="lead co-nil">Jogo truncado, sem gols.</p>') +
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
