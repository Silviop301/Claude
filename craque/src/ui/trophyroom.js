// Interface — Sala de Troféus: estante de nichos com as 70 taças do jogo.
// Coleção: soma todas as carreiras do aparelho (e da conta); só visual, não dá vantagem na carreira.
// Esta carreira: as taças da carreira atual (ou da que acabou de terminar).
// Cada conquista fica guardada com ano, clube, jogador e carreira; a primeira vez de cada taça é "NOVA" até ser tocada.
(function () {
  const U = window.CRAQUE_UI;
  const { D, G, $, esc, load, store, sfx, club, crest, YEAR0 } = U;
  const KEY = 'climbix-sala-v1';
  // Foto da taça real; sem foto (algumas segundas divisões), a taça desenhada em prata
  const drawn = {};
  const img = n => (window.CRAQUE_TROPHY_IMGS || {})[n] || drawn[n] || (drawn[n] = 'data:image/svg+xml,' + encodeURIComponent(
    window.CRAQUE_TROPHY('league2', 192).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')));
  const HONRA = ['Copa do Mundo', 'Bola de Ouro', 'Mundial de Clubes', 'Copa Intercontinental', 'Liga dos Campeões', 'Libertadores'];
  const BIG5 = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
  const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');

  // ---------- catálogo: Galeria de honra + ligas e copas por país ----------
  let CAT = null;
  function catalog() {
    if (CAT) return CAT;
    const by = new Map();
    // Força média de cada liga (para ordenar das divisões de baixo para a elite)
    const str = id => { const cs = D.CLUBS.filter(x => (x.league0 || x.league) === id); return cs.reduce((a, x) => a + (x.strength0 || x.strength), 0) / Math.max(1, cs.length); };
    D.LEAGUES.forEach(l => {
      if (!by.has(l.country)) by.set(l.country, { name: l.country, flag: l.flag, ligas: [], copas: [] });
      const p = by.get(l.country);
      p.ligas.push({ name: l.name, s: str(l.id) });
      if (!p.copas.includes(l.cup)) p.copas.push(l.cup);
    });
    // Supercopa nacional entra nas copas do país; as outras taças continentais ficam num grupo próprio
    const SN = (window.CRAQUE_SIM || {}).SUPER_NAME || {};
    by.forEach(p => { if (SN[p.name] && !p.copas.includes(SN[p.name])) p.copas.push(SN[p.name]); });
    by.set('Continentais', { name: 'Continentais', flag: '🌍', ligas: [], copas: ['Copa Sul-Americana', 'Liga Europa', 'Liga Conferência', 'Champions da Ásia', 'Champions da Concacaf', 'Champions da África'] });
    const countries = [...by.values()].map(p => ({ name: p.name, flag: p.flag, ligas: p.ligas.sort((a, b) => a.s - b.s).map(x => x.name), copas: p.copas }));
    const info = {};
    HONRA.forEach(n => { info[n] = { kind: 'honra' }; });
    countries.forEach(p => { p.ligas.forEach(n => { info[n] = { kind: 'liga', country: p }; }); p.copas.forEach(n => { info[n] = { kind: 'copa', country: p }; }); });
    const nL = countries.reduce((a, p) => a + p.ligas.length, 0), nC = countries.reduce((a, p) => a + p.copas.length, 0);
    CAT = { countries, info, nL, nC, total: HONRA.length + nL + nC };
    return CAT;
  }

  // ---------- coleção guardada ----------
  // { e: [{ k: taça, y: ano, cl: clube, w: jogador, cid: carreira }], nova: [taças novas ainda não tocadas] }
  const data = () => { const d = load(KEY) || {}; return { e: d.e || [], nova: d.nova || [] }; };
  const keyOf = x => x.k + '|' + x.y + '|' + x.cid;
  // Todas as taças de uma carreira, a partir das temporadas, da Copa do Mundo e do Mundial de Clubes
  function entriesOf(c) {
    if (!c.uid) c.uid = hex(10);
    const out = [], add = (k, y, cl) => { if (catalog().info[k]) out.push({ k, y, cl, w: c.name, cid: c.uid }); };
    (c.seasons || []).forEach((s, i) => {
      (s.titles || []).forEach(t => add(t.name, YEAR0 + i, s.club));
      if ((s.awards || []).some(a => a.id === 'ballon')) add('Bola de Ouro', YEAR0 + i, s.club);
    });
    (c.wcHist || []).forEach(h => { if (h.champion) add('Copa do Mundo', h.year, null); });
    (c.cwcHist || []).forEach(h => { if (h.champion) add('Mundial de Clubes', h.year, h.club); });
    return out;
  }
  // Junta as taças da carreira na coleção; devolve as que acabaram de entrar (first: primeira vez na coleção)
  function record(c) {
    if (!c) return [];
    const d = data(), have = new Set(d.e.map(keyOf)), owned = new Set(d.e.map(x => x.k));
    const added = [];
    entriesOf(c).forEach(x => {
      if (have.has(keyOf(x))) return;
      have.add(keyOf(x));
      const first = !owned.has(x.k);
      owned.add(x.k);
      d.e.push(x);
      if (first && !d.nova.includes(x.k)) d.nova.push(x.k);
      added.push(Object.assign({ first }, x));
    });
    if (added.length) store(KEY, d);
    return added;
  }
  const counts = (list) => { const n = {}; list.forEach(x => { n[x.k] = (n[x.k] || 0) + 1; }); return n; };
  function seen(k) { const d = data(); if (d.nova.includes(k)) { d.nova = d.nova.filter(x => x !== k); store(KEY, d); } }
  // Junta aparelho + nuvem (usado pela conta)
  function merge(a, b) {
    a = a || {}; b = b || {};
    const ks = new Set(), e = [];
    (a.e || []).concat(b.e || []).forEach(x => { if (x && !ks.has(keyOf(x))) { ks.add(keyOf(x)); e.push(x); } });
    const nova = [...new Set((a.nova || []).concat(b.nova || []))];
    return e.length ? { e, nova } : null;
  }

  // ---------- nicho (peça visual da prancha) ----------
  // n: quantas vezes (0 = falta); opts: { nova, legend, plaque (default true), cls }
  function niche(k, n, opts) {
    opts = opts || {};
    const legend = opts.legend !== undefined ? opts.legend : HONRA.includes(k);
    const gold = n > 0 && (n >= 5 || legend);
    // Dentro de outro botão (miniaturas da tela inicial) ou só para ver (detalhe, animação): não é botão
    const tag = opts.cls ? 'span' : 'button';
    return '<' + tag + ' class="ni' + (n ? ' lit' : ' miss') + (gold ? ' gold' : '') + (n >= 2 ? ' multi' : '') + (legend ? ' leg' : '') + (opts.nova && n ? ' nova' : '') + (opts.cls ? ' ' + opts.cls : '') + '" data-k="' + esc(k) + '" aria-label="' + esc(k) + (n ? ', ' + n + '×' : ', falta') + '">' +
      '<span class="ni-box"><span class="ni-clip"><i class="ni-leg"></i><i class="ni-light"></i><i class="ni-bulb"></i></span><i class="ni-floor"></i>' +
      '<img class="ni-img" src="' + img(k) + '" alt="" loading="lazy" decoding="async" draggable="false">' +
      '<i class="ni-ring"></i><b class="ni-new">NOVA</b><b class="ni-cnt">×' + n + '</b></span>' +
      '<span class="ni-shelf"></span>' + (opts.plaque === false ? '' : '<span class="ni-plq">' + esc(k) + '</span>') + '</' + tag + '>';
  }

  // ---------- tela ----------
  let st = { view: 'col', tab: 'paises' }, wrap = null;
  // Carreira mostrada em "Esta carreira": a atual, a que acabou de terminar ou a salva em andamento
  let careerShown = null;
  const careerOf = () => careerShown || G.c || ((load(U.SAVE) || {}).c) || null;

  function open(view, c) {
    careerShown = c || null;
    st.view = view || 'col';
    const d = data();
    // Abre na aba da taça nova mais recente (ou em Ligas)
    if (st.view === 'col') { const k = d.nova[d.nova.length - 1]; const inf = k && catalog().info[k]; st.tab = inf ? (inf.kind === 'honra' ? 'honra' : 'paises') : st.tab; }
    if (wrap) wrap.remove();
    wrap = document.createElement('div');
    wrap.className = 'sala';
    document.body.appendChild(wrap);
    document.body.classList.add('sala-on');
    paint();
  }
  function close() {
    if (!wrap) return;
    wrap.remove(); wrap = null; careerShown = null;
    document.body.classList.remove('sala-on');
    if (!G.c && document.getElementById('b-sala')) U.goBack(); // atualiza o contador (Minhas carreiras)
  }

  function paint() {
    const cat = catalog(), d = data(), n = counts(d.e), got = k => n[k] || 0;
    const total = Object.keys(n).filter(k => cat.info[k]).length;
    const prog = list => list.filter(got).length;
    const ligas = cat.countries.flatMap(p => p.ligas), copas = cat.countries.flatMap(p => p.copas);
    const c = careerOf();
    let head, body;
    if (st.view === 'col') {
      const pct = Math.round(total / cat.total * 100);
      // Coleções curtas: metas para o próximo passo
      const mine = c && D.COUNTRIES.find(x => x.id === c.country);
      const near = cat.countries.map(p => ({ p, a: prog(p.ligas.concat(p.copas)), b: p.ligas.length + p.copas.length })).filter(x => x.a > 0 && x.a < x.b).sort((x, y) => y.a / y.b - x.a / x.b)[0];
      const home = cat.countries.find(p => p.name === (near ? near.p.name : mine ? mine.name : 'Brasil')) || cat.countries[0];
      const metas = [['Galeria de honra', prog(HONRA), HONRA.length], ['5 grandes ligas', prog(BIG5), BIG5.length], [home.name, prog(home.ligas.concat(home.copas)), home.ligas.length + home.copas.length]]
        .sort((x, y) => (x[1] === x[2]) - (y[1] === y[2]));
      head = '<div class="sl-count"><b>' + total + '</b><span>/ ' + cat.total + ' taças</span></div><div class="sl-bar"><i style="width:' + Math.max(total ? 2 : 0, pct) + '%"></i></div>' +
        seg() +
        '<div class="sl-metas">' + metas.map(([t, a, b]) => '<div class="sl-meta' + (a === b ? ' done' : '') + '"><span><b>' + esc(t) + '</b><i>' + a + '/' + b + '</i></span><em><s style="width:' + Math.round(a / b * 100) + '%"></s></em></div>').join('') + '</div>' +
        '<div class="sl-tabs">' + [['honra', 'Galeria de honra', prog(HONRA), HONRA.length], ['paises', 'Ligas e copas', prog(ligas) + prog(copas), cat.nL + cat.nC]]
          .map(([id, l, a, b]) => '<button data-tab="' + id + '"' + (st.tab === id ? ' class="on"' : '') + '>' + l + '<span>' + a + '/' + b + '</span></button>').join('') + '</div>';
      const hint = total <= 3 ? '<p class="sl-hint">Cada carreira enche um pouco a estante. As silhuetas são as taças que ainda faltam: toque numa para ver como ganhar.</p>' : '';
      if (st.tab === 'honra') body = hint + '<div class="sl-honra">' + HONRA.map(k => niche(k, got(k), { nova: d.nova.includes(k), legend: true })).join('') + '</div>';
      else {
        // Países com alguma taça primeiro (mais completos antes); depois os outros, na ordem do jogo
        const rows = cat.countries.map((p, i) => ({ p, i, a: prog(p.ligas.concat(p.copas)), all: p.ligas.length + p.copas.length }))
          .sort((x, y) => (y.a > 0) - (x.a > 0) || (y.a > 0 ? y.a / y.all - x.a / x.all : 0) || x.i - y.i);
        body = hint + rows.map(({ p, a, all }) => '<section class="sl-shelf"><header>' + U.flag(p.flag, 'sm') + '<b>' + esc(p.name) + '</b>' + (a === all ? '<em class="sl-full">COMPLETO</em>' : '') + '<span>' + a + '/' + all + '</span></header>' +
          '<div class="sl-row">' + p.ligas.concat(p.copas).map(k => niche(k, got(k), { nova: d.nova.includes(k) })).join('') + '</div></section>').join('');
      }
    } else {
      // Esta carreira: só o que ela ganhou, agrupado (honra, depois cada país)
      const mineE = c ? entriesOf(c) : [];
      const mc = counts(mineE);
      const firsts = c ? new Set(d.e.filter(x => x.cid === c.uid).map(x => x.k).filter(k => d.e.find(x => x.k === k).cid === c.uid)) : new Set();
      const groups = [];
      const honra = HONRA.filter(k => mc[k]);
      if (honra.length) groups.push({ t: 'Galeria de honra', flag: '', items: honra, legend: true });
      cat.countries.forEach(p => { const ks = p.ligas.concat(p.copas).filter(k => mc[k]); if (ks.length) groups.push({ t: p.name, flag: p.flag, items: ks }); });
      const where = ks => {
        const es = mineE.filter(x => ks.includes(x.k)), cls = [...new Set(es.map(x => x.cl).filter(Boolean))].map(id => club(id) ? club(id).name : '').filter(Boolean);
        const ys = es.map(x => x.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
        return esc(cls.slice(0, 2).join(', ')) + (cls.length ? ' · ' : '') + (y0 === y1 ? y0 : y0 + '–' + String(y1).slice(2));
      };
      const nT = mineE.length, nP = groups.filter(g => g.flag).length, nN = firsts.size;
      head = c ? '<div class="sl-who">' + esc(c.name) + ' · ' + YEAR0 + '–' + (YEAR0 + (c.seasons || []).length) + '</div>' +
          '<div class="sl-count car"><b>' + nT + '</b><span>' + (nT === 1 ? 'título' : 'títulos') + ' · ' + nP + (nP === 1 ? ' país' : ' países') + (nN ? ' · <em>' + nN + (nN === 1 ? ' nova' : ' novas') + ' na coleção</em>' : '') + '</span></div>' + seg()
        : seg();
      body = !c ? '<p class="sl-hint">Comece uma carreira para encher a estante.</p>'
        : !groups.length ? '<p class="sl-hint">Nenhuma taça nesta carreira ainda. Os títulos aparecem aqui assim que você ganha.</p>'
        : groups.map(g => '<section class="sl-shelf"><header>' + (g.flag ? U.flag(g.flag, 'sm') : '') + '<b>' + esc(g.t) + '</b><span class="where">' + where(g.items) + '</span></header>' +
          '<div class="sl-row">' + g.items.map(k => niche(k, mc[k], { nova: firsts.has(k) && d.nova.includes(k), legend: !!g.legend })).join('') + '</div></section>').join('');
    }
    wrap.innerHTML = '<div class="sl-top"><i class="sl-deco"></i><div class="sl-title"><button class="sl-back" id="sl-back" aria-label="Voltar">' + U.ICON.x + '</button><h2>Sala de Troféus</h2></div>' + head + '</div>' +
      '<div class="sl-case">' + body + '</div>';
    wrap.scrollTop = 0;
    $('sl-back').onclick = close;
    wrap.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { st.view = b.dataset.view; paint(); });
    wrap.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; paint(); });
    wrap.querySelectorAll('.sl-case .ni').forEach(b => { b.onclick = () => detail(b.dataset.k); b.oncontextmenu = e => e.preventDefault(); });
  }
  const seg = () => '<div class="sl-seg">' + [['col', 'Coleção'], ['car', 'Esta carreira']].map(([id, l]) => '<button data-view="' + id + '"' + (st.view === id ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>';

  // Como conquistar cada taça que falta
  function howTo(k) {
    const inf = catalog().info[k] || {};
    return {
      'Copa do Mundo': 'Seja convocado e campeão do mundo com a sua seleção (a cada 4 anos).',
      'Bola de Ouro': 'Seja eleito o melhor jogador do mundo numa temporada.',
      'Mundial de Clubes': 'Jogue num clube classificado e ganhe o Mundial de Clubes (a cada 4 anos).',
      'Copa Intercontinental': 'Ganhe a Libertadores ou a Liga dos Campeões e vença a final contra o campeão do outro continente.',
      'Liga dos Campeões': 'Seja campeão europeu com um clube grande da Europa.',
      'Libertadores': 'Seja campeão da Libertadores com um clube sul-americano.',
    }[k] || (inf.kind === 'liga' ? 'Seja campeão ' + D.da(k) + '.' : 'Ganhe a ' + k + '.');
  }

  function detail(k) {
    seen(k);
    const d = data(), es = d.e.filter(x => x.k === k).sort((a, b) => a.y - b.y), n = es.length, inf = catalog().info[k] || {};
    const careers = new Set(es.map(x => x.cid)).size;
    const where = inf.kind === 'honra' ? 'Galeria de honra' : esc(inf.country.name) + ' · ' + (inf.kind === 'liga' ? 'Liga' : 'Copa');
    const sh = document.createElement('div');
    sh.className = 'sl-sheet-wrap';
    sh.innerHTML = '<div class="sl-sheet"><i class="sl-grab"></i><button class="sp-x sl-sh-x" id="sl-x" aria-label="Fechar">' + U.ICON.x + '</button><div class="sl-sh-top">' + niche(k, n, { cls: 'big' }) +
      '<div><div class="sl-where">' + (inf.country ? U.flag(inf.country.flag, 'xs') + ' ' : '') + where + '</div><h3>' + esc(k) + '</h3>' +
      (n ? '<div class="sl-times"><b>' + n + '×</b><span>' + (careers === 1 ? 'em 1 carreira' : 'em ' + careers + ' carreiras') + '</span></div>' : '<p class="sl-miss">Ainda não está na coleção.</p>') + '</div></div>' +
      (n ? '<div class="sl-hist">' + es.slice().reverse().map(x => '<div><b>' + x.y + '</b>' + (x.cl && club(x.cl) ? crest(x.cl, 'xs') + '<span>' + esc(club(x.cl).name) + '</span>' : '<span>Seleção</span>') + '<em>' + esc(x.w || '') + '</em></div>').join('') + '</div>'
        : '<div class="sl-how"><small>Como conquistar</small><b>' + esc(howTo(k)) + '</b></div>') +
      '<div class="sl-sh-foot"><button class="btn" id="sl-close">Fechar</button></div></div>';
    wrap.appendChild(sh);
    const shut = () => { sh.remove(); paint(); };
    sh.onclick = e => { if (e.target === sh) shut(); };
    sh.querySelector('#sl-close').onclick = shut;
    sh.querySelector('#sl-x').onclick = shut;
  }

  // ---------- entrada na tela inicial ----------
  function homeCard() {
    const cat = catalog(), d = data(), n = counts(d.e), total = Object.keys(n).filter(k => cat.info[k]).length;
    // As duas últimas taças ganhas e a próxima lendária que falta
    const last = [...new Set(d.e.slice().reverse().map(x => x.k))].slice(0, 2).reverse();
    const next = HONRA.find(k => !n[k]);
    const minis = last.map(k => niche(k, 1, { plaque: false, legend: HONRA.includes(k), cls: 'mini' })).concat(next ? [niche(next, 0, { plaque: false, legend: true, cls: 'mini' })] : []);
    while (minis.length < 3) minis.unshift(niche(HONRA[minis.length], 0, { plaque: false, legend: true, cls: 'mini' }));
    const nova = d.nova.length;
    return '<button class="sl-home' + (nova ? ' has-new' : '') + '" id="b-sala"><span class="sl-minis">' + minis.join('') + '</span>' +
      '<span class="sl-h-txt"><b>Sala de Troféus</b><small><em>' + total + '</em> / ' + cat.total + ' taças</small></span>' +
      (nova ? '<span class="sl-h-new">+' + nova + (nova === 1 ? ' NOVA' : ' NOVAS') + '</span>' : '<span class="sl-h-go">' + U.ICON['chevron-right'] + '</span>') + '</button>';
  }

  // ---------- a taça entrando na estante ----------
  // Primeira vez na coleção: versão completa (2,4 s); repetida: 0,9 s. Várias taças entram em fila.
  // Toque leva ao último quadro; com "Resumo da temporada: Rápido" mostra só o último quadro.
  function play(c, done) {
    done = done || (() => {});
    let list;
    try { list = record(c); } catch (e) { list = []; }
    if (!list.length) return done();
    // Lendárias primeiro, depois as novas, depois as repetidas
    list.sort((a, b) => HONRA.includes(b.k) - HONRA.includes(a.k) || b.first - a.first);
    const fast = !!(U.cfg && U.cfg.fast);
    const ov = document.createElement('div');
    ov.className = 'sl-anim';
    document.body.appendChild(ov);
    let i = 0, timer = 0, finishNow = null, ending = false;
    const next = () => {
      clearTimeout(timer);
      // Fim da fila: só uma vez (um toque duplo nos 220 ms da saída chamava done() duas vezes, e a segunda
      // continuação rodava sem carreira no fim de carreira)
      if (i >= list.length) { if (ending) return; ending = true; ov.onclick = null; ov.classList.add('out'); return setTimeout(() => { ov.remove(); done(); }, 220); }
      const x = list[i++];
      finishNow = (x.first ? first : repeat)(ov, x, fast);
      timer = setTimeout(next, (fast ? 900 : x.first ? 3400 : 1700));
    };
    ov.onclick = () => {
      // 1º toque: vai ao último quadro; 2º toque: próxima taça
      if (finishNow) { const f = finishNow; finishNow = null; f(); clearTimeout(timer); timer = setTimeout(next, 1100); }
      else next();
    };
    next();
  }
  const ease = { back: 'cubic-bezier(.34,1.56,.64,1)', in: 'cubic-bezier(.5,0,.75,0)', out: 'ease-out' };
  function stage(ov, html, label) {
    ov.innerHTML = '<div class="sl-an-in">' + html + label + '<small>Toque para continuar</small></div>';
    return ov.querySelector('.ni');
  }
  function first(ov, x, fast) {
    const cat = catalog(), d = data(), total = Object.keys(counts(d.e)).filter(k => cat.info[k]).length;
    const inf = cat.info[x.k] || {};
    // País completo com esta taça?
    const full = inf.country && inf.country.ligas.concat(inf.country.copas).every(k => d.e.some(e => e.k === k));
    const ni = stage(ov, niche(x.k, 1, { nova: true, cls: 'anim' }),
      '<div class="sl-an-lbl"><span>NOVA NA COLEÇÃO</span><b><em class="sl-an-n">' + (total - 1) + '</em> / ' + cat.total + '</b>' + (full ? '<i class="sl-full">' + esc(inf.country.name) + ' COMPLETO</i>' : '') + '</div>');
    const im = ni.querySelector('.ni-img'), lbl = ov.querySelector('.sl-an-lbl'), num = ov.querySelector('.sl-an-n');
    const anims = [];
    const A = (el, kf, o) => { if (el && el.animate) anims.push(el.animate(kf, Object.assign({ fill: 'both' }, o))); };
    const end = () => {
      anims.forEach(a => { try { a.finish(); } catch (e) { /* já acabou */ } });
      ni.classList.remove('dark'); ni.classList.add('done');
      num.textContent = total; lbl.classList.add('on');
    };
    if (fast) { end(); sfx('fanfare'); return null; }
    ni.classList.add('dark');
    // 0,0 s: só a silhueta da taça, apagada; some quando a taça de verdade começa a subir
    const sil = im.cloneNode();
    sil.className = 'ni-img ni-sil';
    im.parentNode.insertBefore(sil, im);
    A(sil, [{ opacity: .85 }, { opacity: 0 }], { duration: 300, delay: 200 });
    // 0,2–0,9 s: sobe por baixo, maior e com halo; 0,9–1,4 s: desce para o nicho e toca o chão
    A(im, [{ transform: 'translateY(90px) scale(.8)', opacity: 0, offset: 0 }, { transform: 'translateY(-50px) scale(1.15)', opacity: 1, offset: .58 },
      { transform: 'translateY(4px) scale(1)', offset: .9 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 1 }], { duration: 1200, delay: 200, easing: 'ease-in-out' });
    A(ni.querySelector('.ni-light'), [{ opacity: 0 }, { opacity: 1, offset: .4 }, { opacity: .85 }], { duration: 300, delay: 1250, easing: ease.out });
    A(ni.querySelector('.ni-bulb'), [{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: 1250 });
    // A placa vira latão com um brilho que atravessa; a etiqueta NOVA entra com um pop
    A(ni.querySelector('.ni-plq'), [{ filter: 'brightness(.35) saturate(0)' }, { filter: 'brightness(1) saturate(1)' }], { duration: 300, delay: 1400 });
    A(ni.querySelector('.ni-new'), [{ transform: 'scale(0)' }, { transform: 'scale(1.1)', offset: .6 }, { transform: 'scale(1)' }], { duration: 300, delay: 1600, easing: ease.out });
    A(ni.querySelector('.ni-ring'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 1500 });
    // 1,8–2,4 s: o nicho encolhe um pouco e o contador sobe
    A(ni, [{ transform: 'scale(1)' }, { transform: 'scale(.86)' }], { duration: 500, delay: 1850, easing: ease.out });
    A(lbl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 350, delay: 1900, easing: ease.out });
    // Partículas douradas caindo do topo do nicho
    const box = ni.querySelector('.ni-box');
    for (let p = 0; p < 12; p++) {
      const s = document.createElement('i');
      s.className = 'sl-spark';
      s.style.left = (10 + (p * 37) % 80) + '%';
      box.appendChild(s);
      A(s, [{ transform: 'translate(0,-10px)', opacity: 0 }, { transform: 'translate(0,-6px)', opacity: 1, offset: .08 }, { transform: 'translate(' + ((p % 2 ? 1 : -1) * (6 + p * 2)) + 'px,' + (60 + (p * 13) % 70) + 'px)', opacity: 0 }], { duration: 800, delay: 1300 + (p % 4) * 40, easing: 'cubic-bezier(.3,0,.9,.6)' });
      s.style.opacity = 0;
    }
    const tFlash = setTimeout(() => { sfx('fanfare'); U.vibe([20, 30, 20]); }, 1300);
    const tNum = setTimeout(() => { num.textContent = total; lbl.classList.add('on'); }, 2100);
    const tOk = setTimeout(() => { ni.classList.remove('dark'); ni.classList.add('done'); }, 1300);
    return () => { clearTimeout(tFlash); clearTimeout(tNum); clearTimeout(tOk); end(); };
  }
  function repeat(ov, x, fast) {
    const n = counts(data().e)[x.k] || 1;
    const ni = stage(ov, niche(x.k, Math.max(1, n - 1), { cls: 'anim done' }), '<div class="sl-an-lbl on"><span>MAIS UMA</span><b>' + esc(x.k) + '</b></div>');
    const cnt = ni.querySelector('.ni-cnt');
    const set = () => { cnt.textContent = '×' + n; ni.classList.toggle('gold', n >= 5 || HONRA.includes(x.k)); if (n >= 2) ni.classList.add('multi'); };
    if (fast || n < 2) { set(); sfx('tick'); return null; }
    const anims = [];
    const A = (el, kf, o) => { if (el && el.animate) anims.push(el.animate(kf, Object.assign({ fill: 'both' }, o))); };
    A(ni.querySelector('.ni-img'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], { duration: 400, easing: ease.out });
    A(ni.querySelector('.ni-light'), [{ opacity: 1 }, { opacity: .4 }, { opacity: 1 }], { duration: 400 });
    A(cnt, [{ transform: 'rotateX(0)' }, { transform: 'rotateX(90deg)', offset: .5 }, { transform: 'rotateX(0)' }], { duration: 500, delay: 400 });
    const t = setTimeout(() => { set(); sfx('tick'); }, 650);
    return () => { clearTimeout(t); anims.forEach(a => { try { a.finish(); } catch (e) { /* ok */ } }); set(); };
  }

  Object.assign(U, { salaNew: () => data().nova.length, trophyRoom: open, salaPlay: play, salaRecord: record, salaHome: homeCard, salaMerge: merge, SALA_KEY: KEY });
})();
