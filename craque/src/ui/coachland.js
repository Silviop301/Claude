// Interface — Modo Treinador deitado (modo estádio): as telas do Treinador num palco fixo de 844×390, escalado para
// caber na tela, como no canvas aprovado pelo Silvio (2026-11-06). Com o celular em pé, pede para girar (ou joga em
// pé nesta sessão, nas telas de sempre de ui/coach.js).
// Usa o estado e os ajudantes de ui/coach.js por U._co; as telas que ainda não têm versão deitada caem no render()
// de sempre, que tira o palco (U.ldOff em ui/core.js).
(function () {
  const U = window.CRAQUE_UI;
  const { S, sfx, esc, club, crest } = U;
  const W = 844, H = 390;
  const on = () => true; // o Treinador é sempre deitado
  const C = () => U._co; // ajudantes e estado do Treinador (ui/coach.js)

  // ---------- palco ----------
  function host() {
    let el = document.getElementById('ld');
    if (!el) {
      el = document.createElement('div'); el.id = 'ld';
      el.innerHTML = '<div class="ld-st" id="ld-st"></div><div class="ld-turn" id="ld-turn"></div>';
      document.body.appendChild(el);
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', () => setTimeout(fit, 200));
      if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }
    }
    return el;
  }
  function fit() {
    const el = document.getElementById('ld'); if (!el) return;
    // iPhone: girar o celular (ou a página por baixo rolada) deixa a página deslocada; o palco fixo aparece num lugar e o
    // toque cai em outro (acima). Com o palco aberto a página fica sempre no topo
    if (document.body.classList.contains('ld-on') && (window.scrollY || window.scrollX || document.documentElement.scrollTop)) { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }
    const vw = el.clientWidth || window.innerWidth, vh = el.clientHeight || window.innerHeight, port = vh > vw * 1.05; // medidas do #ld (já sem o topo borrado do iPhone e com o zoom do monitor)
    el.classList.toggle('port', port);
    const k = Math.min(vw / W, vh / H);
    el.style.setProperty('--ldk', k.toFixed(4));
  }
  // Mostra uma tela no palco. html = conteúdo do palco; bind(st) liga os botões
  function show(html, bind, turn) {
    const el = host();
    document.body.classList.add('ld-on');
    const st = document.getElementById('ld-st');
    st.innerHTML = html;
    // O Treinador é só deitado (Silvio 2026-11-06 tirou o "Jogar em pé"): em pé, só o aviso para girar
    document.getElementById('ld-turn').innerHTML = '<div class="ld-turn-c"><i aria-hidden="true">' + PHONE + '</i><b>Gire o celular</b><small>' + (turn || 'O Treinador é jogado com o celular deitado.') + '</small></div>';
    lockLand();
    fit();
    st.querySelectorAll('[data-rail]').forEach(b => b.onclick = () => { sfx('tap'); go(b.dataset.rail); });
    bind && bind(st);
  }
  function off() { document.body.classList.remove('ld-on'); closePop(); try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
  // Android (app instalado ou tela cheia) deixa travar a tela deitada; o iPhone não deixa (fica o aviso para girar)
  function lockLand() { try { const so = screen.orientation; if (so && so.lock) so.lock('landscape').catch(() => {}); } catch (e) {} }
  const PHONE = '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M20 9a8 8 0 0 1 0 6M4 9a8 8 0 0 0 0 6"/></svg>';

  // ---------- peças comuns ----------
  // Caderno escondido (Silvio, 2026-11-09: a matriz não escala com mais formações; volta com outro formato). O motor
  // continua anotando em co.cad; CAD = true traz de volta a tela, o botão da semana e os blocos do resultado e da tática
  const CAD = false;
  const RAIL = [['inicio', 'Início'], ['semana', 'Semana'], ['time', 'Time']].concat(CAD ? [['caderno', 'Caderno']] : []).concat([ ['tabela', 'Tabela'], ['mercado', 'Mercado'], ['clube', 'Clube'], ['celular', 'Celular', 1]]);
  const rail = act => '<nav class="ld-rail" aria-label="Menu do técnico">' + RAIL.map(([k, t, soon]) => soon
    ? '<span class="ld-ri soon">' + t + '<small>em breve</small></span>'
    : '<button class="ld-ri' + (k === act ? ' on' : '') + '" data-rail="' + k + '"' + (k === act ? ' aria-current="page"' : '') + '>' + t + '</button>').join('') + '</nav>';
  const head = (t, s, right) => '<div class="ld-h"><span><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</span>' + (right || '') + '</div>';
  const pill = t => '<span class="ld-pill">' + t + '</span>';
  const lbl = t => '<small class="ld-lbl">' + t + '</small>';
  const gold = (id, t, s) => '<button class="ld-gold" id="' + id + '"><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</button>';
  const XI_ICO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const last = n => String(n || '').split(' ').filter(Boolean).pop() || '';
  const ord = n => n + 'º';
  const enRing = e => (e >= 75 ? 'ok' : e >= 55 ? 'mid' : 'low');
  // Artes do Treinador (assets/co, 2026-11-09, geradas no ChatGPT): logos dos patrocinadores, rostos, banco
  const CO_ART = 'assets/co/';
  const slug = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const PAT_OLD = { 'Atacadão Prime': 'Armazém Prime', 'TeleNorte': 'Conecta Norte' }; // nomes de saves antigos
  const patName = n => PAT_OLD[n] || n;
  const PAT_OK = new Set([].concat.apply([], Object.values(S.CO_SPONS || {})).map(slug));
  // dark: versão com as cores escuras clareadas, para o fundo carvão (sem placa creme: Silvio 2026-11-09)
  const patImg = (n, cls, dark) => { n = patName(n); return PAT_OK.has(slug(n)) ? '<img class="' + cls + '" src="' + CO_ART + 'pat-' + slug(n) + (dark ? '-esc' : '') + '.webp" alt="' + esc(n) + '">' : ''; };
  const hashS = t => { let h = 7; t = String(t || ''); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; };
  // Rostos: 1-2 ambicioso, 3-4 pão-duro, 5-6 paciente (os nomes sorteados são de homem: 2 e 4 ficam para depois),
  // 7-8 auxiliar, 9 olheiro, 10 preparador, 11 médica, 12 empresário
  const FACE_PRES = { amb: [1], pao: [3], pac: [5, 6] };
  const face = (n, cls, alt) => '<img class="' + cls + '" src="' + CO_ART + 'rosto-' + String(n).padStart(2, '0') + '.webp" alt="' + esc(alt || '') + '">';
  const presFace = (P, cls) => { const l = FACE_PRES[P.k] || [5]; return face(l[hashS(P.n) % l.length], cls, P.n); };
  const auxFace = (co, cls) => face(7 + hashS((co.name || '') + '|' + co.club) % 2, cls, 'Auxiliar');

  // Campinho deitado: o seu gol à esquerda. Posições (x, y em %) a partir das linhas da formação.
  // full: o time ocupa o campo inteiro (Time); senão meio campo cada, encaixado com o rival espelhado (Semana).
  // Linha de 4 ou mais: os de fora (laterais, alas, meias abertos) ficam mais à frente, como no canvas.
  function spotsL(form, mirror, full) {
    const sl = S.CO_FORMS[form].slots, am = sl.some(x => x.ln === 'am');
    const X = full === 'sem' ? { g: 5, d: 16, m: am ? 27 : 31, am: 37, a: 45 } : full ? { g: 7, d: 21, m: am ? 42 : 48, am: 62, a: 80 } : { g: 6, d: 21, m: am ? 39 : 43, am: 53, a: 65 };
    const out = [];
    ['g', 'd', 'm', 'am', 'a'].forEach(ln => {
      const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln), n = ix.length;
      ix.forEach((i, k) => {
        const y = n === 1 ? 42 : 7 + (k + 0.5) / n * 72; // embaixo fica o banco (Time) ou a contagem por setor (Semana)
        let x = X[ln];
        const outer = k === 0 || k === n - 1;
        const sem = full === 'sem', F = sem ? 0 : full;
        if (n >= 4 && outer && (F || ln === 'd')) x += F ? 10 : sem ? 4 : 5;
        else if (ln === 'a' && n === 3 && outer) x -= F ? 7 : 3;
        else if (sem && n >= 4 && ln !== 'd') x += k % 2 ? -3 : 3; // linha cheia no meio: em zigue-zague para os nomes não encostarem
        else if (n === 5 && k === 2 && ln === 'm') x -= F ? 5 : 2;
        out[i] = [mirror ? 100 - x : x, Math.round(y)];
      });
    });
    return out;
  }
  // Vagas da escalação: x da formação, y usando o campo todo (o banco fica fora), linhas de 5 em zigue-zague
  const spotsT = f => { const sp = spotsL(f, false, true), sl = S.CO_FORMS[f].slots;
    return sp.map(([x], i) => { const ln = sl[i].ln, ix = sl.map((q, j) => j).filter(j => sl[j].ln === ln), n = ix.length, k = ix.indexOf(i);
      if (n === 1) return [x, 45];
      const step = Math.min(24, 72 / (n - 1));
      let nx5 = x;
      if (n === 5) { const base = k === 0 || k === 4 ? x - 10 : k === 2 && ln === 'm' ? x + 5 : x; nx5 = ln === 'd' ? base + (k === 0 || k === 4 ? 18 : k === 2 ? -3 : 9) : base + (k === 0 || k === 4 ? 12 : k === 2 ? 2 : -8); }
      return [nx5, Math.round(45 + (k - (n - 1) / 2) * step)]; }); };
  // Círculo só com o número (tamanho fixo); nome e posição embaixo, fora do círculo
  // Banco em ordem de posição (Silvio 2026-11-09), não de geral: quem não pode jogar vai para o fim
  const PO = { GOL: 0, ZAG: 1, LAT: 2, MEI: 3, ATA: 4 };
  const benchSort = c => (a, b) => c.avail(b) - c.avail(a) || (PO[a.pos] ?? 9) - (PO[b.pos] ?? 9) || b.ovr - a.ovr;
  // Arrastar do banco para o campo: o reserva sobe, uma cópia segue o dedo e o titular embaixo acende; soltar em cima
  // dele faz a troca. Puxar de lado continua rolando o banco. onDrop(idDoReserva, vaga)
  function benchDrag(root, onDrop) {
    if (!root) return;
    root.querySelectorAll('.tm-bp:not(.dis)').forEach(b => {
      let x0 = 0, y0 = 0, pid = null, gh = null, over = null, dragged = false;
      const at = (cx, cy) => { const r = root.getBoundingClientRect(), k = r.width / root.offsetWidth || 1; return [(cx - r.left) / k, (cy - r.top) / k]; };
      const hit = (cx, cy) => { const el = document.elementFromPoint(cx, cy), d = el && el.closest('[data-xi]'); return d && root.contains(d) ? d : null; };
      const end = () => { if (gh) gh.remove(); gh = null; if (over) over.classList.remove('drop'); over = null; pid = null; root.classList.remove('tm-drag'); b.classList.remove('lift'); };
      b.addEventListener('pointerdown', e => { if (e.button > 0) return; x0 = e.clientX; y0 = e.clientY; pid = e.pointerId; dragged = false; try { b.setPointerCapture(pid); } catch (er) {} });
      b.addEventListener('pointermove', e => {
        if (e.pointerId !== pid) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!gh) {
          if (dy > -12 || Math.abs(dy) < Math.abs(dx) * 0.6) { if (Math.abs(dx) > 20 && dy > -12) pid = null; return; }
          gh = document.createElement('div'); gh.className = 'tm-bp tm-ghost'; gh.innerHTML = b.innerHTML; root.appendChild(gh);
          root.classList.add('tm-drag'); b.classList.add('lift'); dragged = true;
        }
        const [px, py] = at(e.clientX, e.clientY); gh.style.left = px + 'px'; gh.style.top = py + 'px';
        const d = hit(e.clientX, e.clientY); if (d !== over) { if (over) over.classList.remove('drop'); over = d; if (d) d.classList.add('drop'); }
        e.preventDefault();
      });
      b.addEventListener('pointerup', e => { if (e.pointerId !== pid) return; const d = gh && over, id = b.dataset.bp; end(); if (d) onDrop(id, +d.dataset.xi); });
      b.addEventListener('pointercancel', end);
      // Depois de arrastar, o toque não vale como clique no reserva
      b.addEventListener('click', e => { if (dragged) { dragged = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    });
  }
  function dot(p, slot, x, y, o) {
    o = o || {};
    const fitC = !slot || p.pos === slot ? 'ok' : (S.coFit(p.pos, slot) >= 0.88 ? 'sabe' : 'fora');
    const yc = (o.yc !== undefined ? o.yc : C().pend(p)) ? '<i class="ld-yc" title="' + (o.yc !== undefined ? 'Amarelado' : 'Pendurado') + '"></i>' : '';
    return '<button class="ld-dot ' + enRing(p.en) + (o.sel ? ' sel' : '') + (fitC === 'fora' ? ' fora' : '') + '"' + (o.attr || '') + ' style="left:' + x + '%;top:' + y + '%;--en:' + Math.round(p.en) + '"' +
      ' aria-label="' + esc(p.n) + ', ' + (slot || p.pos) + ', ' + p.ovr + ', energia ' + Math.round(p.en) + '%">' +
      '<i class="ld-dc">' + (o.num ? (p.num || p.ovr) : p.ovr) + yc + '</i><span class="ld-dn"><b>' + esc(last(p.n)) + '</b><em class="' + fitC + '">' + (o.tag || slot || p.pos) + '</em></span></button>';
  }
  function rivalDot(x, y, nm, tag) {
    return '<span class="ld-dot riv" style="left:' + x + '%;top:' + y + '%"><i class="ld-dc">?</i><span class="ld-dn"><b>' + esc(nm) + '</b>' + (tag ? '<em class="riv">' + tag + '</em>' : '') + '</span></span>';
  }
  const PITCH = '<i class="ld-pl ln-c"></i><i class="ld-pl ln-m"></i><i class="ld-pl ln-cc"></i><i class="ld-pl ln-al"></i><i class="ld-pl ln-ar"></i>';

  // Linhas do caderno sem número: seta e palavra; "certeza" quando viu 2 vezes, "pode errar" quando viu 1
  function cadHtml(l) {
    const c = C();
    return l.map(x => { const w = x.c && c.CAD_W[x.c.v];
      return '<span class="ld-cl"><em>' + esc(c.cadName(x.k, x.a)) + ' × ' + esc(c.cadName(x.k, x.b)) + '</em><b class="' + (x.c ? (x.c.pen ? 'pen ' + x.c.v : 'lap ' + x.c.v) : 'nv') + '">' +
        (x.c ? w[0] + ' ' + w[1] + '<small>' + (x.c.pen ? 'certeza' : 'pode errar') + '</small>' : '? nunca viu') + '</b></span>'; }).join('');
  }

  // ---------- popups (dentro do palco, para escalar junto) ----------
  // lock: popup do jogo parado (sem fechar tocando fora nem no Esc; sai pelos botões)
  function pop(html, label, onBind, cls, lock) {
    closePop();
    const st = document.getElementById('ld-st'); if (!st) return;
    const w = document.createElement('div'); w.className = 'ld-pop'; w.id = 'ld-pop';
    w.innerHTML = '<div class="ld-pop-c ' + (cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    st.appendChild(w);
    const t0 = Date.now(); // o toque que abriu não pode cair num botão do popup (iPhone)
    w.addEventListener('click', e => { if (Date.now() - t0 < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
    if (!lock) {
      w.onclick = e => { if (e.target === w) { sfx('tap'); closePop(); } };
      w.querySelectorAll('[data-pop-x]').forEach(x => x.onclick = () => { sfx('tap'); closePop(); });
      pop.esc = e => { if (e.key === 'Escape') closePop(); };
      document.addEventListener('keydown', pop.esc);
    }
    onBind && onBind(w);
  }
  function closePop() { const w = document.getElementById('ld-pop'); if (w) w.remove(); if (pop.esc) document.removeEventListener('keydown', pop.esc); pop.esc = null; }
  const BACK_ICO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  // back: no lugar do X, uma seta que volta ao popup anterior (jogo parado)
  const popHead = (t, s, back) => '<div class="ld-ph">' + (back ? '<button class="ld-x" data-pop-back aria-label="Voltar">' + BACK_ICO + '</button>' : '') + '<span><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</span>' + (back ? '' : '<button class="ld-x" data-pop-x aria-label="Fechar">' + XI_ICO + '</button>') + '</div>';

  // ---------- navegação pelo trilho ----------
  function go(k) {
    const c = C();
    if (k === 'inicio') { c.save(); c.exit(); return; }
    if (k === 'semana') return semana();
    if (k === 'time') return time(false);
    if (k === 'caderno') return CAD ? caderno() : semana();
    if (k === 'tabela') return tabela();
    if (k === 'clube') return clube();
    if (k === 'mercado') return mercado();
  }

  // ---------- Semana enxuta (Silvio 2026-11-08, opção A): sem trilho nem faixa do topo; uma linha com posição,
  // forma, meta e diretoria; o próximo jogo com os dois escudos grandes; treino e olheiro embaixo; à direita os botões
  // que eram do trilho e o dourado Jogar (abre a escalação). O caixa fica no Clube e os próximos jogos na Tabela.
  function semana() {
    const c = C(), co = c.co;
    const nx = S.coNext(co);
    if (!nx) { off(); return c.finishSeason(); }
    if (S.coFinPend && S.coFinPend(co)) return co.fin.pend.ac ? reuniao() : patrocinio();
    c.save('hub');
    if (!inboxPop(co, semana)) finNews(co);
    const t = S.coTable(co), me = t.find(x => x.me), pos = S.coPos(co), B = co.board, conf = Math.round(B.conf);
    const f5 = f => { const a = (f || '').split('').slice(-5); while (a.length < 5) a.unshift('n'); return '<span class="ld-f5 sm-f5">' + a.map(x => '<i class="' + x + '"></i>').join('') + '</span>'; };
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const meta = B.goal.k === 'titulo' ? 'SER CAMPEÃO' : 'ATÉ O ' + ord(B.goal.pos);
    const top = '<div class="sm-h"><button class="tcr-back" id="sm-back" aria-label="Início">' + BK + '</button>' +
      '<b>' + ord(pos) + '</b><small>' + me.p + ' pts</small>' + f5(me.f) +
      '<em class="sm-tag' + (pos > (B.goal.k === 'titulo' ? 1 : B.goal.pos) ? ' hi' : '') + '" title="' + esc(S.CO_GOAL_TXT[B.goal.k]) + '">META · ' + meta + '</em><span class="ld-gr"></span>' +
      (B.ult ? '<em class="sm-tag ult">ULTIMATO · VENÇA ' + B.ult.need + ' DE ' + B.ult.of + '</em>' : '') +
      (U.COINS ? U.COINS.pill('cp-sm', 'sm-coins') : '') + '<span class="sm-dir">Diretoria <em class="ld-bar"><u style="width:' + conf + '%" class="' + (conf >= 55 ? 'ok' : conf >= 35 ? 'mid' : 'low') + '"></u></em></span></div>';
    const side = (id, nm, sub) => '<div class="sm-tm">' + crest(id, 'sm-cr') + '<b>' + esc(nm) + '</b><small>' + sub + '</small></div>';
    let card, wk = '';
    if (!nx.bye) {
      const pv = S.coPreview(co), them = pv.them, cl = club(co.club), vc = club(them.club), rv = t.find(x => x.id === them.club), rpos = t.indexOf(rv) + 1;
      card = '<small class="sm-rd">RODADA ' + nx.round + ' · ' + (nx.home ? 'EM CASA' : 'FORA') + '</small><div class="sm-vs">' +
        side(co.club, cl.short || cl.name, co.form + ' · ' + esc(S.CO_STY[co.style].name)) + '<i class="sm-x">x</i>' +
        side(them.club, vc.short || vc.name, them.form + ' · ' + esc(S.CO_STY[them.style].name)) + '</div>' +
        (rv ? '<small class="sm-rv">' + ord(rpos) + ' · ' + rv.p + ' pts' + f5(rv.f) + '</small>' : '');
      const tr = co.train && co.train.i === co.ss.i ? S.CO_TRAIN[co.train.k] : null, sc = co.scout && co.scout.i === co.ss.i;
      wk = '<div class="sm-wk"><button class="sm-w' + (tr ? ' ok' : '') + '" id="ld-tr"><small>TREINO</small><b>' + (tr ? '✓ ' + esc(tr.name) : 'Escolher') + '</b>' + (tr ? '' : '<i class="tm-dot">1</i>') + '</button>' +
        '<button class="sm-w' + (sc ? ' ok' : '') + '" id="ld-ol"><small>OLHEIRO</small><b>' + (sc ? '✓ Relatório lido' : 'Ver o ' + esc(vc.short || vc.name)) + '</b></button></div>';
    } else card = '<div class="sm-bye"><b>Sem jogo nesta rodada</b><small>O time descansa. Os outros jogam.</small></div>';
    const nav = [['time', 'Time'], ['tabela', 'Tabela']].concat(CAD ? [['caderno', 'Caderno']] : []).concat([['mercado', 'Mercado'], ['clube', 'Clube']]).map(([k, n]) => '<button class="sm-nv" data-rail="' + k + '">' + n + '</button>').join('');
    show('<div class="sm' + (nx.bye ? ' bye' : '') + '">' + top + '<div class="sm-card">' + card + '</div>' + wk +
      '<nav class="sm-side" aria-label="Menu do técnico">' + nav + '<button class="tm-go" id="ld-play">' + (nx.bye ? 'Ver a rodada' : 'Jogar') + '</button></nav></div>', st => {
      if (st.querySelector('#sm-coins')) st.querySelector('#sm-coins').onclick = () => { sfx('tap'); loja(0, semana); };
      st.querySelector('#ld-play').onclick = () => { sfx('tap'); if (nx.bye) { S.coSkipRound(co); c.save(); return semana(); } time(true); };
      st.querySelector('#sm-back').onclick = () => { sfx('tap'); go('inicio'); };
      if (st.querySelector('#ld-tr')) st.querySelector('#ld-tr').onclick = () => { sfx('tap'); treino(); };
      if (st.querySelector('#ld-ol')) st.querySelector('#ld-ol').onclick = () => { sfx('tap'); olheiro(); };
    });
  }

  // ---------- Time: escalação, popups de troca e de formação/estilo ----------
  function time(toPlay) {
    const c = C(), co = c.co, by = {}; co.squad.forEach(p => { by[p.id] = p; });
    if (co.xi.some(id => !c.avail(by[id])) || co.xi.length < 11) co.xi = S.coAutoXI(co.squad, co.form).xi;
    let swap = null, selB = null; // titular escolhido (troca de lugar ou sai) e reserva escolhido (entra)
    // Reserva entra na vaga i (arrastando do banco ou tocando nos dois)
    const put = (id, i) => { co.xi[i] = id; co.autoXI = false; swap = null; selB = null; sfx('tap'); draw(); };
    const nx = S.coNext(co), vs = nx && !nx.bye && club(nx.vs), cl = club(co.club);
    // Escalação enxuta (Silvio 2026-11-08): sem trilho, legenda nem cartão do auxiliar; campo grande e banco embaixo;
    // Formação e Estilo com ◀ ▶ (os jogadores correm para as vagas novas); o auxiliar é um botão com aviso
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    const FORMS = Object.keys(S.CO_FORMS);
    // Os mesmos titulares redistribuídos na formação nova (o auxiliar põe cada um na vaga em que rende mais)
    const xiFor = f => {
      if (co.autoXI) return S.coAutoXI(co.squad.filter(c.avail), f).xi;
      const onp = co.squad.filter(p => co.xi.includes(p.id)), a = S.coAutoXI(onp, f).xi;
      return a.filter(Boolean).length === 11 ? a : S.coAutoXI(co.squad.filter(c.avail), f).xi;
    };
    const fitOf = (p, s) => (p.pos === s ? 'ok' : S.coFit(p.pos, s) >= 0.88 ? 'sabe' : 'fora');
    let anim = 0;
    const draw = () => {
      clearTimeout(anim);
      const sl = S.coSlots(co.form), sp = spotsT(co.form);
      const bench = co.squad.filter(p => !co.xi.includes(p.id)).sort(benchSort(c));
      const off11 = co.xi.map((id, i) => [by[id], sl[i]]).filter(([p, s]) => p && p.pos !== s && fitOf(p, s) === 'fora');
      const tired = co.xi.map(id => by[id]).filter(p => p && p.en < 70).sort((a, b) => a.en - b.en)[0];
      // O auxiliar fala de uma coisa: quem está fora de posição, senão quem está cansado
      let aux = '', auxFix = null;
      if (off11.length) {
        const [p, s] = off11[0], sub = bench.filter(q => c.avail(q) && q.pos === s).sort((a, b) => b.ovr - a.ovr)[0];
        aux = 'O ' + esc(last(p.n)) + ' é ' + c.posTxt[p.pos].toLowerCase() + '. ' + (sub ? 'Ponho o ' + esc(last(sub.n)) + ' de ' + s + '?' : 'Ninguém da posição no banco.');
        if (sub) auxFix = () => { co.xi[co.xi.indexOf(p.id)] = sub.id; co.autoXI = false; };
      } else if (tired) {
        const i = co.xi.indexOf(tired.id), s = sl[i], sub = bench.filter(q => c.avail(q) && q.pos === s && q.en > tired.en + 15).sort((a, b) => b.ovr - a.ovr)[0];
        aux = 'O ' + esc(last(tired.n)) + ' está com ' + Math.round(tired.en) + '% de energia.' + (sub ? ' Começa com o ' + esc(last(sub.n)) + '?' : ' Não tem ninguém melhor para a vaga.');
        if (sub) auxFix = () => { co.xi[i] = sub.id; co.autoXI = false; };
      } else aux = 'Time inteiro e cada um na sua posição. Pode ir.';
      const dots = co.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { sel: swap === i, attr: ' data-xi="' + i + '" data-pid="' + id + '"', tag: S.coSlotLbl(co.form, i) }) : '').join('');
      const bstrip = bench.map(p => '<button class="tm-bp' + (c.avail(p) ? '' : ' dis') + (selB === p.id ? ' on' : '') + (swap !== null && c.avail(p) ? ' can' : '') + '" data-bp="' + p.id + '"' + (c.avail(p) ? '' : ' disabled') + '><b class="tm-ring ' + enRing(p.en) + '" style="--en:' + Math.round(p.en) + '">' + p.ovr + '</b><span><i>' + esc(last(p.n)) + '</i><small>' + p.pos + '</small></span></button>').join('');
      const pick = (k, l, v) => '<div class="tm-pk"><button class="tm-ar" data-tmk="' + k + '" data-d="-1" aria-label="' + l + ' anterior">' + BK + '</button><span><small>' + l + '</small><b id="tm-' + k + '">' + v + '</b></span><button class="tm-ar" data-tmk="' + k + '" data-d="1" aria-label="Próximo ' + l.toLowerCase() + '">' + FW + '</button></div>';
      const title = swap !== null ? '<span class="tm-hint">Arraste do banco, ou toque em quem entra ou em outro titular</span>' : selB ? '<span class="tm-hint">Toque em quem sai</span>'
        : vs ? '<b>x ' + esc(vs.short || vs.name) + '</b><small>' + (nx.home ? 'em casa' : 'fora') + ' · rodada ' + nx.round + '</small>' : '<b>' + esc(cl.short || cl.name) + '</b><small>escalação</small>';
      const play = toPlay && vs;
      show('<div class="tm"><div class="tm-h"><button class="tcr-back" id="tm-back" aria-label="Voltar">' + BK + '</button>' + title + '</div>' +
        '<div class="ld-pitch tm-pitch">' + PITCH + dots + '</div>' +
        '<div class="tm-bench"><small>BANCO</small>' + bstrip + '</div>' +
        '<div class="tm-side">' + pick('form', 'Formação', co.form) + pick('sty', 'Estilo', esc(S.CO_STY[co.style].name)) +
        '<span class="tm-2"><button class="tm-b" id="ld-fun">Funções</button><button class="tm-b" id="ld-bat">Batedores</button></span>' +
        '<button class="tm-b" id="tm-aux">Auxiliar' + (auxFix ? '<i class="tm-dot">1</i>' : '') + '</button>' +
        '<button class="tm-go" id="' + (play ? 'ld-go' : 'ld-ok') + '">' + (play ? 'Jogar' : 'Pronto') + '</button></div></div>', st => {
        st.querySelectorAll('[data-xi]').forEach(b => b.onclick = () => {
          const i = +b.dataset.xi; sfx('tap');
          if (selB) return put(selB, i);
          if (swap === null || swap === i) { swap = swap === i ? null : i; return draw(); }
          const t = co.xi[i]; co.xi[i] = co.xi[swap]; co.xi[swap] = t; co.autoXI = false;
          swap = null; draw();
        });
        st.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => { const id = b.dataset.bp; sfx('tap');
          if (swap !== null) return put(id, swap);
          selB = selB === id ? null : id; draw(); });
        benchDrag(st.querySelector('.tm'), put);
        st.querySelectorAll('[data-tmk]').forEach(b => b.onclick = () => {
          sfx('tap'); const d = +b.dataset.d;
          if (b.dataset.tmk === 'sty') { const L = S.CO_STYLES; co.style = L[(L.indexOf(co.style) + d + L.length) % L.length]; st.querySelector('#tm-sty').textContent = S.CO_STY[co.style].name; return; }
          // Formação: os mesmos bonecos correm para as vagas novas e a tela se refaz depois
          const nf = FORMS[(FORMS.indexOf(co.form) + d + FORMS.length) % FORMS.length], xi = xiFor(nf), sl2 = S.coSlots(nf), sp2 = spotsT(nf);
          co.form = nf; co.xi = xi; swap = null; selB = null; st.querySelector('#tm-form').textContent = nf;
          xi.forEach((id, i) => { const el = st.querySelector('[data-pid="' + id + '"]'), p = by[id]; if (!el || !p) return;
            el.style.left = sp2[i][0] + '%'; el.style.top = sp2[i][1] + '%'; el.dataset.xi = i;
            const em = el.querySelector('.ld-dn em'); if (em) { em.className = fitOf(p, sl2[i]); em.textContent = S.coSlotLbl(nf, i); }
            el.classList.toggle('fora', fitOf(p, sl2[i]) === 'fora'); });
          st.querySelectorAll('[data-pid]').forEach(el => { if (!xi.includes(el.dataset.pid)) el.classList.add('tm-out'); });
          clearTimeout(anim); anim = setTimeout(draw, 430);
        });
        st.querySelector('#ld-fun').onclick = () => { sfx('tap'); closePop(); c.keepBench(); c.save(); funcoes(null, () => time(toPlay)); };
        st.querySelector('#ld-bat').onclick = () => { sfx('tap'); closePop(); c.keepBench(); c.save(); batedores(null, () => time(toPlay)); };
        st.querySelector('#tm-aux').onclick = () => { sfx('tap');
          pop('<div class="acd-help"><span class="aux-h">' + auxFace(co, 'aux-fc') + '<b>Auxiliar</b></span><p>“' + aux + '”</p>' + (auxFix ? '<span class="hl-ab"><button class="hl-btn dark" id="ld-aux-y">Trocar</button><button class="hl-btn line" data-pop-x>Manter</button></span>' : '') +
            '<button class="tm-all" id="ld-auto">Usar a escalação dele inteira</button>' + (auxFix ? '' : '<button class="hl-btn line" data-pop-x>Fechar</button>') + '</div>', 'Auxiliar', w => {
            if (w.querySelector('#ld-aux-y')) w.querySelector('#ld-aux-y').onclick = () => { sfx('tap'); auxFix(); closePop(); draw(); };
            w.querySelector('#ld-auto').onclick = () => { sfx('tap'); const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.autoXI = true; swap = null; selB = null; closePop(); draw(); };
          }, 'hl-pop acd-pop tm-pop'); };
        const done = () => { clearTimeout(anim); closePop(); c.keepBench(); c.save(); };
        st.querySelector('#tm-back').onclick = () => { sfx('tap'); done(); semana(); };
        if (st.querySelector('#ld-ok')) st.querySelector('#ld-ok').onclick = () => { sfx('tap'); done(); semana(); };
        if (st.querySelector('#ld-go')) st.querySelector('#ld-go').onclick = () => { sfx('tap'); done(); prelecao(); };
      });
    };
    draw();
  }

  // Formação e estilo, uma tela só (Silvio 2026-11-06, opção B: letra grande, só o essencial): formações em botões no
  // topo (as de 4 atrás e "+3" para as outras), campinho grande com as vagas (laranja = fora da posição), forte/fraco numa
  // linha; à direita os 6 estilos em botões e o Usar. Caderno contra o adversário e posições ficam a um toque (detalhes).
  // o = { form, style, squad, xi, auto, them, live (texto do jogo), onOk(form, style, xi), back }
  let fav = {}; try { fav = JSON.parse(localStorage.getItem('climbix-co-fav') || '{}'); } catch (e) {}
  const STY_CHIP = { equilibrado: 'Equilibrado', posse: 'Posse', pressao: 'Pressão', contra: 'Contra', retranca: 'Retranca', lados: 'Lados' };
  function tacPicker(o, tab, pf, ps, det) {
    const c = C(), by = {}; o.squad.forEach(p => { by[p.id] = p; });
    pf = pf || o.form; ps = ps || o.style;
    const forms = Object.keys(S.CO_FORMS), four = forms.filter(f => f[0] === '4'), more = forms.filter(f => f[0] !== '4');
    if (tab !== 'main' && tab !== 'mais') tab = four.includes(pf) ? 'main' : 'mais';
    const shown = tab === 'main' ? four : more;
    // Os mesmos titulares redistribuídos (o auxiliar põe cada um na vaga em que rende mais)
    const xiNow = o.auto ? S.coAutoXI(o.squad.filter(c.avail), pf).xi : (() => { const onp = o.squad.filter(p => o.xi.includes(p.id)); const a = S.coAutoXI(onp, pf).xi.filter(Boolean); return a.length === onp.length ? S.coAutoXI(onp, pf).xi : S.coAutoXI(o.squad.filter(c.avail), pf).xi; })();
    const sl = S.coSlots(pf), sp = spotsL(pf, false, true);
    const nOff = xiNow.filter((id, i) => by[id] && by[id].pos !== sl[i]).length;
    const prev = xiNow.map((id, i) => { const p = by[id]; if (!p) return ''; const f = p.pos === sl[i] ? 'ok' : S.coFit(p.pos, sl[i]) >= 0.88 ? 'sabe' : 'fora';
      return '<span class="ld-pd ' + f + '" style="left:' + sp[i][0] + '%;top:' + sp[i][1] + '%">' + sl[i] + '</span>'; }).join('');
    const cad = CAD && o.them ? cadHtml(c.cadLines(pf, ps, o.them, 2)) : '';
    const them = o.them ? 'O ' + esc(club(o.them.club).short || club(o.them.club).name) + ' deve vir no ' + o.them.form + ', ' + esc(S.CO_STY[o.them.style].name.toLowerCase()) + '.' : '';
    const sub = o.live || them;
    const stip = S.CO_STY[ps].tip.split(';');
    const chip = (f, on, attr, t) => '<button class="ldx-chip' + (on ? ' on' : '') + '" ' + attr + '>' + t + '</button>';
    const posTxt = nOff ? U.D.plural(nOff, 'jogador fora da posição', 'jogadores fora da posição') : 'todo mundo na posição dele';
    const details = '<div class="ldx-det"' + (det ? '' : ' hidden') + '>' +
      '<div class="ldx-dh"><b>' + pf + ' com ' + esc(S.CO_STY[ps].name) + '</b><button class="ldx-chip" data-det="0">Voltar</button></div>' +
      '<div class="ldx-dg"><div class="ldx-dc"><small class="ldx-l up">ESTILO FORTE</small><p>' + esc(stip[0]) + '</p>' + (stip[1] ? '<small class="ldx-l dn">ESTILO FRACO</small><p>' + esc(stip[1].trim()) + '</p>' : '') +
      '<small class="ldx-l ' + (nOff ? 'or' : 'up') + '">POSIÇÕES</small><p>' + posTxt + '</p></div>' +
      (CAD ? '<div class="ldx-dc ldx-pp"><small class="ldx-l gd">DO SEU CADERNO</small>' + (them ? '<p>' + them + '</p>' : '') + (cad ? '<div class="ld-cadl">' + cad + '</div>' : '<p>Sem adversário para comparar.</p>') + '</div>' : '') + '</div></div>';
    pop(popHead('Formação e estilo', sub, !!o.back) +
      '<div class="ldx-b"><div class="ldx-l1">' +
        '<div class="ldx-chips">' + shown.map(f => chip(f, f === pf, 'data-f="' + f + '"', f)).join('') + chip('', false, 'data-ft="' + (tab === 'main' ? 'mais' : 'main') + '"', tab === 'main' ? '+' + more.length : '‹ 4 atrás') + '</div>' +
        '<div class="ld-mini ldx-pitch">' + PITCH + prev + '<button class="ld-favb' + (fav[pf] ? ' on' : '') + '" data-fav="' + pf + '">' + (fav[pf] ? '★ Favorita' : '☆ Favoritar') + '</button></div>' +
        '<p class="ldx-ft"><b>' + pf + '</b> ' + esc(c.FORM_TIP[pf] || '') + (nOff ? ' · <b class="or">' + posTxt + '</b>' : '') + '</p></div>' +
      '<div class="ldx-r"><small class="ldx-l">ESTILO</small><div class="ldx-sg">' + S.CO_STYLES.map(k => chip(k, k === ps, 'data-s="' + k + '"', STY_CHIP[k] || esc(S.CO_STY[k].name))).join('') + '</div>' +
        '<p class="ldx-st"><b class="up">FORTE</b> ' + esc(stip[0].trim()) + (stip[1] ? '<br><b class="dn">FRACO</b> ' + esc(stip[1].trim()) : '') + '</p><button class="ldx-a" data-det="1">' + (CAD ? 'Ver no caderno e posições' : 'Ver posições') + ' ›</button>' +
        '<span class="ld-gr"></span><button class="ld-gold" id="ld-tac-ok"><b>Usar ' + pf + '</b><small>com ' + esc(S.CO_STY[ps].name) + '</small></button></div>' + details + '</div>',
      'Formação e estilo', w => {
        w.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { sfx('tap'); tacPicker(o, b.dataset.ft, pf, ps); });
        w.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { sfx('tap'); tacPicker(o, tab, b.dataset.f, ps); });
        w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sfx('tap'); tacPicker(o, tab, pf, b.dataset.s); });
        w.querySelectorAll('[data-det]').forEach(b => b.onclick = () => { sfx('tap'); w.querySelector('.ldx-det').hidden = b.dataset.det !== '1'; });
        w.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { sfx('tap'); const f = b.dataset.fav; if (fav[f]) delete fav[f]; else fav[f] = 1; try { localStorage.setItem('climbix-co-fav', JSON.stringify(fav)); } catch (e) {} tacPicker(o, tab, pf, ps); });
        w.querySelector('#ld-tac-ok').onclick = () => { sfx('tap'); o.onOk(pf, ps, xiNow); };
        if (o.back) w.querySelector('[data-pop-back]').onclick = () => { sfx('tap'); o.back(); };
      }, 'ld-tacp', !!o.back);
  }

  // ---------- Partida ao vivo deitada (MainB): campinho grande com placar, grito e narração por cima; à direita o grito do
  // técnico, o auxiliar, a velocidade e "Parar e mexer". O motor e o relógio são os de ui/coach.js (live), que passa ctx.
  function liveHtml(o) {
    // Campo limpo (Silvio, 2026-11-07): em cima do campinho só o placar; o último lance, quem manda, o grito e os números ficam
    // no painel da direita; o recado do auxiliar só aparece no "Parar e mexer"
    const { H, A, crestB } = o;
    return '<div class="lv ldl"><div class="ldl-p">' + o.pitchHtml +
      '<div class="ldl-sb">' + crestB(H.id, 'ldl-cr') + '<em id="lv-score">0 <i>x</i> 0</em>' + crestB(A.id, 'ldl-cr') + '<small class="ldl-clk" id="lv-clock"><i></i>0\'</small>' +
        '<i class="lv-crd" id="lv-cd-h"></i><i class="lv-crd" id="lv-cd-a"></i></div></div>' +
      '<div class="ldl-side"><ul class="lv-feed ldl-ev" id="lv-feed">' + o.feed0 + '</ul>' +
        '<div class="ldl-qm"><small>QUEM MANDA</small><i><u id="ldl-momb"></u></i></div>' +
        '<div class="ldl-g4" id="ldl-g4">' + Object.keys(S.CO_SHOUT).map(k => '<button data-gr="' + k + '"><b>' + S.CO_SHOUT[k].name + '</b><small>' + S.CO_SHOUT[k].sub + '</small></button>').join('') + '</div>' +
        '<button class="ldl-num" id="ldl-num">Números</button><span class="ld-gr"></span>' + o.speedHtml +
        '<button class="ld-gold ldl-stop" id="b-lv-stop">' + o.pause + '<b>Parar e mexer</b></button></div>' +
      '<div hidden><b id="lv-sh"></b><b id="lv-ot"></b><b id="lv-ps"></b><div id="lv-cst"></div><b id="lv-momw"></b><span id="lv-mom"></span><div id="lv-aux"></div></div>' +
      '<div class="lv-sheet ldl-sheet" id="lv-sheet"></div></div>';
  }
  function livePaint(x) {
    const m = x.m, sh = m.us.shout, $ = id => document.getElementById(id);
    const g = $('ldl-g4'); if (!g) return;
    g.querySelectorAll('[data-gr]').forEach(b => { const on = !!sh && sh.k === b.dataset.gr; b.classList.toggle('on', on); b.disabled = !!sh && !on;
      b.querySelector('small').textContent = on ? 'até os ' + sh.until + '\'' : S.CO_SHOUT[b.dataset.gr].sub; });
    const st = x.stats();
    $('ldl-num').innerHTML = 'Números · <b>' + st.sh.us + ' x ' + st.sh.them + '</b> chutes';
    if (!g._b) {
      g._b = 1;
      g.querySelectorAll('[data-gr]').forEach(b => b.onclick = () => { if (m.done || m.us.shout) return; sfx('tap'); x.shout(b.dataset.gr); });
      $('ldl-num').onclick = () => { sfx('tap'); numPop(x); };
    }
  }
  // Números do jogo (não para o jogo)
  function numPop(x) {
    const s = x.stats(), m = x.m, c = C(), us = esc(c.nm(c.co.club)), th = esc(c.nm(m.vs));
    const row = (k, a, b, inv) => { const t = a + b || 1; return '<div class="ldl-nr"><b>' + a + '</b><span><small>' + k + '</small><i><u class="' + (inv ? (a <= b ? 'up' : 'dn') : (a >= b ? 'up' : 'dn')) + '" style="width:' + Math.round(a / t * 100) + '%"></u></i></span><b>' + b + '</b></div>'; };
    const ps = Math.round(s.poss * 100);
    pop(popHead('Números do jogo', us + ' (esquerda) x ' + th + ' · ' + S.coClock(m)) + '<div class="ld-pb col ldl-nums">' +
      row('Chutes', s.sh.us, s.sh.them) + row('No gol', s.ot.us, s.ot.them) + row('Posse (%)', ps, 100 - ps) + row('Faltas', s.fo.us, s.fo.them, 1) + row('Impedimentos', s.of.us, s.of.them, 1) +
      row('Amarelos', s.yc.us, s.yc.them, 1) + (s.rc.us + s.rc.them ? row('Vermelhos', s.rc.us, s.rc.them, 1) : '') + '</div>', 'Números do jogo', null, 'w560');
  }
  const byOf = sq => { const o = {}; sq.forEach(p => { o[p.id] = p; }); return o; };
  const enC = e => (e >= 70 ? 'ok' : e >= 50 ? 'mid' : 'low');
  // O que ele fez neste jogo (pelo relato do motor)
  function didOf(m, p) {
    const mine = m.ev.filter(e => e.s === 'us' && e.p === p.n);
    const am = mine.find(e => e.t === 'amarelo');
    return { sh: mine.filter(e => e.t === 'chance' || e.t === 'gol').length, gl: mine.filter(e => e.t === 'gol').length, fo: mine.filter(e => e.t === 'falta' || e.t === 'amarelo').length, am: am ? S.coEvMin(am) : '' };
  }
  // Tocar num jogador seu no campinho: o jogo pausa, mostra como ele está e quem pode entrar (TrJogadorB)
  function livePlayer(x, id, back) {
    if (!back && !x.pause()) return;
    const m = x.m, s = m.us, by = byOf(s.squad), p = by[id], i = s.xi.indexOf(id);
    if (!p || i < 0) { if (back) back(); else x.resume(); return; }
    const slot = S.coSlots(s.form)[i], c = C();
    const bench = s.bench.map(b => by[b]).filter(Boolean).filter(q => (q.pos === 'GOL') === (slot === 'GOL'));
    const score = q => q.ovr * S.coFit(q.pos, slot) * (0.6 + 0.4 * q.en / 100);
    const list = bench.slice().sort((a, b) => c.avail(b) - c.avail(a) || score(b) - score(a));
    let pick = s.subs ? list.find(c.avail) : null;
    const d = didOf(m, p), yc = s.bk && s.bk[id], tired = p.en < 55;
    const aux = yc && tired ? 'Amarelado e cansado. Mais uma falta dessas e ele sai.' : yc ? 'Já tem amarelo. Chegando forte, pode deixar o time com 10.' : tired ? 'Está no limite. Daqui a pouco não acompanha mais.' : p.out ? 'Sentiu. Joga mancando se ficar.' : d.gl ? 'Está decidindo. Eu deixava.' : 'Está bem no jogo. Ninguém do banco rende mais na vaga agora.';
    const fitTag = q => (q.pos === slot ? ['ok', 'mesma posição'] : S.coFit(q.pos, slot) >= 0.88 ? ['sabe', 'conhece a vaga'] : ['fora', 'fora de posição: rende menos']);
    const draw = () => {
      const row = q => { const [fc, ft] = fitTag(q), ok = s.subs && c.avail(q);
        return '<button class="ldl-cand' + (q === pick ? ' on' : '') + (ok ? '' : ' dis') + '" data-c="' + q.id + '"' + (ok ? '' : ' disabled') + '><i>' + (q.num || '') + '</i><span><b>' + esc(q.n) + ' <small>' + q.pos + ' · ' + q.ovr + ' · energia ' + Math.round(q.en) + '%</small></b>' +
          '<em class="' + fc + '">' + (q === list.find(c.avail) && s.subs ? 'Sugestão do auxiliar · ' : '') + ft + '</em></span></button>'; };
      pop('<div class="ldl-ptop"><b>' + (back ? 'Mexer no time' : 'Jogo pausado') + ' · ' + S.coClock(m) + '</b></div>' +
        '<div class="ld-pb"><div class="ldl-pl">' +
          '<div class="ldl-ph"><i class="' + enC(p.en) + '">' + (p.num || '') + '</i><span><b>' + esc(p.n) + '</b><small>' + c.posTxt[p.pos] + (p.pos !== slot ? ' de ' + slot : '') + ' · geral ' + p.ovr + ' · ' + p.age + ' anos</small></span></div>' +
          '<div class="ldl-en"><span><small>Energia <b class="' + enC(p.en) + '">' + Math.round(p.en) + '%</b></small><small>' + (tired ? 'cansado' : p.en < 70 ? 'começa a cansar' : 'inteiro') + '</small></span><i><u class="' + enC(p.en) + '" style="width:' + Math.round(p.en) + '%"></u></i></div>' +
          '<div class="ld-st4">' + [['chutes', d.sh], ['gols', d.gl], ['faltas', d.fo], [yc ? 'amarelo' : 'cartão', d.am || '—']].map(([k, v], j) => '<span class="ld-st1' + (j === 3 && yc ? ' y' : '') + '"><small>' + k + '</small><b>' + v + '</b></span>').join('') + '</div>' +
          '<div class="ldl-aq">' + lbl('AUXILIAR') + '"' + aux + '"</div><span class="ld-gr"></span>' +
          '<button class="ld-b line" id="ldl-keep">' + (back ? 'Voltar sem trocar' : 'Deixar em campo e voltar ao jogo') + '</button></div>' +
        '<div class="ldl-pr"><div class="ldl-prh">' + lbl('QUEM ENTRA NO LUGAR DELE') + '<small>' + (s.subs ? U.D.plural(s.subs, 'troca sobrando', 'trocas sobrando') : 'sem trocas') + '</small></div>' +
          '<div class="ldl-cl">' + (list.length ? list.map(row).join('') : '<p class="ld-none">Ninguém no banco para essa vaga.</p>') + '</div><span class="ld-gr"></span>' +
          (pick ? '<button class="ld-gold" id="ldl-sub"><b>Levantar a placa: sai ' + (p.num || '') + ', entra ' + (pick.num || '') + '</b><small>' + esc(c.last(p.n)) + ' sai, ' + esc(c.last(pick.n)) + ' entra agora</small></button>' : '') + '</div></div>',
        'Jogador ' + p.n, w => {
          w.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sfx('tap'); pick = by[b.dataset.c]; draw(); });
          w.querySelector('#ldl-keep').onclick = () => { sfx('tap'); closePop(); if (back) back(); else x.resume(); };
          if (w.querySelector('#ldl-sub')) w.querySelector('#ldl-sub').onclick = () => { sfx('tap'); x.sub(id, pick.id); closePop(); if (back) back(); else x.resume(); };
        }, 'w750 ldl-pp', true);
    };
    draw();
  }
  // Quem sai: o time num campinho para tocar (do popup da parada)
  function liveWho(x, back) {
    const m = x.m, s = m.us, by = byOf(s.squad), sl = S.coSlots(s.form), sp = spotsL(s.form, false, true);
    pop(popHead('Quem sai?', 'Toque no jogador. O número em volta mostra a energia.', true) +
      '<div class="ld-pitch ldl-who">' + PITCH + s.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { attr: ' data-w="' + id + '"', num: true }) : '').join('') + '</div>',
      'Quem sai', w => {
        w.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { sfx('tap'); livePlayer(x, b.dataset.w, back); });
        w.querySelector('[data-pop-back]').onclick = () => { sfx('tap'); back(); };
      }, 'w750', true);
  }
  // A parada (intervalo, vermelho, lesão, "Parar e mexer"; o gol não para desde 2026-11-09): o campo da escalação
  // (Silvio 2026-11-09), com o anel de energia e o amarelo de cada um. Troca: toque num titular e num do banco (ou o
  // contrário); dois titulares trocam de lugar. Formação e estilo com ◀ ▶; o auxiliar num botão (etiquetas e a troca que
  // ele sugere); no intervalo, a conversa em cima. Nada de cartão do lance, frase longa ou "o que aconteceu".
  function liveStop(x, st) {
    const m = x.m, s = m.us, c = C(), co = c.co, half = st.t === 'intervalo', us = st.s === 'us';
    const f0 = s.form, y0 = s.style, FORMS = Object.keys(S.CO_FORMS), inn = new Set();
    let talk = null, sel = -1, selB = null;
    const T = { gol: 'Gol do ' + (us ? c.nm(co.club) : c.nm(m.vs)), intervalo: 'Intervalo', vermelho: 'Expulso', lesao: 'Lesão', pausa: 'Jogo parado' }[st.t] || 'Parada';
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    // A troca que o auxiliar sugere: machucado, cansado ou amarelado, com o melhor do banco para a vaga
    const sugg = () => {
      if (!s.subs) return null;
      const by = byOf(s.squad), sl = S.coSlots(s.form);
      const cand = s.xi.map((id, i) => [by[id], i]).filter(([p]) => p && (p.out || p.en < 58 || (s.bk && s.bk[p.id]))).sort((a, b) => (b[0].out ? 1 : 0) - (a[0].out ? 1 : 0) || a[0].en - b[0].en);
      for (const [p, i] of cand) {
        const slot = sl[i], q = s.bench.map(b => by[b]).filter(q => q && c.avail(q) && (q.pos === 'GOL') === (slot === 'GOL')).sort((a, b) => b.ovr * S.coFit(b.pos, slot) - a.ovr * S.coFit(a.pos, slot))[0];
        if (q) return { o: p, i: q };
      }
      return null;
    };
    const doSub = (outId, inId) => { if (x.sub(outId, inId)) { inn.add(inId); sfx('tap'); } sel = -1; selB = null; draw(); };
    const auxPop = () => {
      const r = x.read, g = sugg(), tc = t => /↓/.test(t) ? 'dn' : /↑/.test(t) ? 'up' : 'y';
      const host = document.querySelector('#ld-pop .ldl-full'); if (!host) return;
      const ov = document.createElement('div'); ov.className = 'ldl-ov';
      ov.innerHTML = '<div class="acd-help ldl-aux" role="dialog" aria-label="Auxiliar"><b>Auxiliar</b>' +
        (r.tags.length ? '<span class="ldl-chips">' + r.tags.map(t => '<em class="' + tc(t) + '">' + esc(t) + '</em>').join('') + '</span>' : '<p>“' + esc(r.txt) + '”</p>') +
        (st.t === 'vermelho' ? '<div class="ldl-red">' + x.redOpts(st) + '</div>' : '') +
        '<span class="hl-ab">' + (g ? '<button class="hl-btn dark" id="ldl-aux-y">' + (g.o.num || '') + ' ' + esc(c.last(g.o.n)) + ' → ' + (g.i.num || '') + ' ' + esc(c.last(g.i.n)) + '</button>' : '') +
        '<button class="hl-btn line" id="ldl-aux-n">' + (g ? 'Manter' : 'Voltar') + '</button></span></div>';
      host.appendChild(ov);
      { const w = ov;
        w.querySelectorAll('[data-ro]').forEach(b => b.onclick = () => { sfx('tap'); x.redPick(b.dataset.ro); draw(); });
        if (w.querySelector('#ldl-aux-y')) w.querySelector('#ldl-aux-y').onclick = () => doSub(g.o.id, g.i.id);
        w.querySelector('#ldl-aux-n').onclick = () => { sfx('tap'); draw(); };
        w.onclick = e => { if (e.target === w) { sfx('tap'); draw(); } };
      }
    };
    const draw = () => {
      const by = byOf(s.squad), sl = S.coSlots(s.form), g = sugg(), nT = x.read.tags.length;
      // longe da borda: o anel, o amarelo e o contorno da sugestão não podem ser cortados pelo campo
      const sp = spotsT(s.form).map(([px, py]) => [px, Math.round(10 + (py - 9) * 1.042)]);
      const dots = s.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { sel: sel === i, yc: !!(s.bk && s.bk[id]),
        attr: ' data-xi="' + i + '"' + (inn.has(id) ? ' data-in="1"' : '') + (g && g.o.id === id && sel < 0 && !selB ? ' data-sug="1"' : ''), tag: inn.has(id) ? 'ENTRA' : S.coSlotLbl(s.form, i) }) : '').join('');
      const bench = s.bench.map(b => by[b]).filter(Boolean).sort(benchSort(c));
      const bstrip = bench.map(p => { const ok = s.subs && c.avail(p);
        return '<button class="tm-bp' + (ok ? '' : ' dis') + (selB === p.id ? ' on' : '') + (g && g.i.id === p.id && sel < 0 && !selB ? ' sug' : '') + (sel >= 0 && ok ? ' can' : '') + '" data-bp="' + p.id + '"' + (ok ? '' : ' disabled') + '><b class="tm-ring ' + enRing(p.en) + '" style="--en:' + Math.round(p.en) + '">' + p.ovr + '</b><span><i>' + (p.num ? p.num + ' ' : '') + esc(c.last(p.n)) + '</i><small>' + p.pos + '</small></span></button>'; }).join('');
      const pick = (k, l, v) => '<div class="tm-pk"><button class="tm-ar" data-tmk="' + k + '" data-d="-1" aria-label="' + l + ' anterior">' + BK + '</button><span><small>' + l + '</small><b>' + v + '</b></span><button class="tm-ar" data-tmk="' + k + '" data-d="1" aria-label="Próximo ' + l.toLowerCase() + '">' + FW + '</button></div>';
      const hint = sel >= 0 ? 'Toque em quem entra ou em outro titular' : selB ? 'Toque em quem sai' : '';
      const sc = esc(c.nm(m.home ? co.club : m.vs)).slice(0, 3).toUpperCase() + ' <u>' + m.gh + ' x ' + m.ga + '</u> ' + esc(c.nm(m.home ? m.vs : co.club)).slice(0, 3).toUpperCase();
      pop('<div class="tm ldl-tm"><div class="tm-h"><b>' + esc(T) + '</b><span class="ldl-sc">' + sc + '</span><small>' + S.coClock(m) + '</small>' + (hint ? '<span class="tm-hint">' + hint + '</span>' : '') + '</div>' +
        '<div class="ld-pitch tm-pitch">' + PITCH + dots + '</div>' +
        '<div class="tm-bench"><small>BANCO<em>' + (s.subs ? U.D.plural(s.subs, 'troca', 'trocas') : 'sem trocas') + '</em></small>' + bstrip + '</div>' +
        '<div class="tm-side">' + (half ? '<div class="ldl-talk2">' + Object.keys(S.CO_TALK).map(k => '<button data-tk="' + k + '"' + (talk === k ? ' class="on"' : '') + '>' + esc(S.CO_TALK[k].name) + '</button>').join('') + '</div>' : '') +
          pick('form', 'Formação', s.form) + pick('sty', 'Estilo', esc(S.CO_STY[s.style].name)) +
          '<button class="tm-b" id="ldl-aux">Auxiliar' + (nT || st.t === 'vermelho' ? '<i class="tm-dot">' + (st.t === 'vermelho' ? '!' : nT) + '</i>' : '') + '</button>' +
          '<button class="tm-go" id="ldl-go">' + (half ? 'Começar o 2º tempo' : 'Seguir o jogo') + '</button></div></div>',
        T, w => {
          w.querySelectorAll('[data-xi]').forEach(b => b.onclick = () => {
            const i = +b.dataset.xi, id = s.xi[i]; sfx('tap');
            if (selB) return doSub(id, selB);
            if (sel < 0 || sel === i) { sel = sel === i ? -1 : i; return draw(); }
            x.swap(sel, i); sel = -1; draw();
          });
          w.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => {
            const id = b.dataset.bp; sfx('tap');
            if (sel >= 0) return doSub(s.xi[sel], id);
            selB = selB === id ? null : id; draw();
          });
          if (s.subs) benchDrag(w.querySelector('.ldl-tm'), (id, i) => doSub(s.xi[i], id));
          w.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { sfx('tap'); talk = talk === b.dataset.tk ? null : b.dataset.tk; draw(); });
          w.querySelectorAll('[data-tmk]').forEach(b => b.onclick = () => {
            sfx('tap'); const d = +b.dataset.d;
            if (b.dataset.tmk === 'sty') { const L = S.CO_STYLES; S.coMatchTactic(co, m, null, L[(L.indexOf(s.style) + d + L.length) % L.length]); }
            else S.coMatchTactic(co, m, FORMS[(FORMS.indexOf(s.form) + d + FORMS.length) % FORMS.length]);
            sel = -1; selB = null; x.paint(); draw();
          });
          w.querySelector('#ldl-aux').onclick = () => { sfx('tap'); auxPop(); };
          w.querySelector('#ldl-go').onclick = () => {
            sfx('tap');
            x.tacLog(f0, y0);
            if (half && talk) x.talk(talk);
            closePop(); x.resume();
          };
        }, 'ldl-full', true);
    };
    draw();
    if (st.t === 'vermelho') auxPop();
  }

  // ---------- Fim de jogo deitado (TrFim): placar e números em abas, notas do seu time, o que mudou ----------
  // Números que o motor não conta lance a lance saem do que ele conta (sem sorteio): grandes chances, escanteios,
  // defesas, passes certos e desarmes
  function matchNums(m) {
    const o = k => m[k] || { us: 0, them: 0 }, sh = o('sh'), ot = o('ot'), p = S.coPoss(m);
    const gf = m.home ? m.gh : m.ga, ga = m.home ? m.ga : m.gh;
    const side = sd => {
      const ch = m.ev.filter(e => e.s === sd && (e.t === 'chance' || e.t === 'gol'));
      const big = ch.filter(e => e.t === 'gol' || e.k === 'trave' || (e.k === 'defesa' && e.m % 2 === 0)).length;
      const ck = ch.filter(e => (e.k === 'defesa' || e.k === 'bloqueio' || e.k === 'fora') && e.l !== 'c' && e.m % 3 !== 1).length + Math.round(ch.length * 0.2);
      return { big, ck: m.ck ? m.ck[sd] || 0 : ck }; // m.ck: escanteios contados pelo motor (jogo salvo antes deles: a conta antiga)
    };
    const U2 = side('us'), T2 = side('them'), st = s => S.CO_STY[s.style] || S.CO_STY.equilibrado;
    const pass = (pp, s) => Math.round(Math.max(55, Math.min(92, 70 + (pp - 0.5) * 45 + (st(s).ctrl - 1) * 12)));
    const tk = (pp, s) => Math.round(8 + (1 - pp) * 16 + st(s).press * 6);
    return [
      ['Posse', Math.round(p * 100), Math.round((1 - p) * 100), '%'], ['Chutes', sh.us, sh.them], ['No gol', ot.us, ot.them], ['Grandes chances', U2.big, T2.big],
      ['Escanteios', U2.ck, T2.ck], ['Faltas', o('fo').us, o('fo').them, '', 1], ['Impedimentos', o('of').us, o('of').them, '', 1],
      ['Defesas do goleiro', Math.max(0, ot.them - ga), Math.max(0, ot.us - gf)], ['Passes certos', pass(p, m.us), pass(1 - p, m.them), '%'], ['Desarmes', tk(p, m.us), tk(1 - p, m.them)],
      ['Cartões', (o('yc').us || 0) + (o('rc').us || 0) * 2, (o('yc').them || 0) + (o('rc').them || 0) * 2, '', 1, [o('yc').us, o('rc').us, o('yc').them, o('rc').them]],
    ];
  }
  function result(m, log, aux, move) {
    const c = C(), co = c.co, cl = club(co.club), vs = club(m.vs), pre = c.pre || {};
    const word = log.res === 'v' ? 'VITÓRIA' : log.res === 'e' ? 'EMPATE' : 'DERROTA';
    const goals = m.ev.filter(e => e.t === 'gol').map(e => e.m + '\' ' + esc(last(e.p || '')) + (e.s === 'us' ? '' : ' (' + esc(c.nm(m.vs)) + ')'));
    let tab = 'num';
    const by = {}; co.squad.forEach(p => { by[p.id] = p; });
    const rt = (log.rt || []);
    const nota = x => '<div class="ldr-n"><b class="' + (x.r >= 7 ? 'up' : x.r < 5.8 ? 'dn' : '') + '">' + x.r.toFixed(1).replace('.', ',') + '</b><span><em>' + esc(by[x.id] ? by[x.id].n : '') + '</em><small>' + esc(x.w) + '</small></span></div>';
    const pos = S.coPos(co), B = co.board, dc = pre.conf !== undefined ? B.conf - pre.conf : 0;
    const chg = [['Tabela', pre.pos ? ord(pre.pos) + (pre.pos !== pos ? ' → ' + ord(pos) : ' (igual)') + ' · ' + (S.coTable(co).find(x => x.me) || {}).p + ' pts' : ord(pos)],
      ['Diretoria', co.sacked ? 'demitido' : dc > 1 ? 'confiança subiu' : dc < -1 ? 'confiança caiu' : 'confiança igual', dc > 1 ? 'up' : dc < -1 ? 'dn' : ''],
      co.fin && pre.caixa !== null && pre.caixa !== undefined ? ['Caixa', (co.fin.caixa - pre.caixa >= 0 ? '+ ' : '− ') + c.brl(Math.abs(co.fin.caixa - pre.caixa)), co.fin.caixa - pre.caixa >= 0 ? 'up' : 'dn'] : null,
      B.ult ? ['Ultimato', B.ult.got + ' de ' + B.ult.need + ' vitórias · ' + (B.ult.of - B.ult.n) + ' jogos', 'dn'] : (log.ycOut || []).length ? ['Suspenso', log.ycOut.map(last).join(', '), 'dn'] : null].filter(Boolean);
    const cadN = CAD && log.cad && log.cad.notes ? log.cad.notes : [];
    const cadTxt = n => { const [a, b] = n.ab.split('|'), nmK = x => (n.k === 'sty' ? S.CO_STY[x].name : x);
      return '<p><b>' + (n.pen ? 'Certeza (viu 2 vezes):' : 'Pode errar (viu 1 vez):') + '</b> ' + esc(nmK(a)) + ' contra ' + esc(nmK(b)) + ' ' + (n.v === 'up' ? 'deu certo.' : n.v === 'down' ? 'sofreu.' : 'ficou parelho.') + '</p>'; };
    const best = rt[0], bp = best && by[best.id];
    const KEEP = ['Posse', 'Chutes', 'No gol', 'Grandes chances', 'Escanteios', 'Cartões'];
    const draw = () => {
      const nums = matchNums(m).filter(r => KEEP.indexOf(r[0]) >= 0);
      const cd = n => '<i class="y"></i>'.repeat(Math.min(3, n[0] || 0)) + '<i class="r"></i>'.repeat(n[1] || 0);
      const bar = ([k, a, b, suf, inv, cards]) => { const t = (a + b) || 1, good = inv ? a <= b : a >= b;
        return '<div class="rs-r"><b>' + (cards ? cd(cards.slice(0, 2)) + ' ' : '') + a + (suf || '') + '</b><span><small>' + k + '</small><i><u class="' + (good ? 'up' : 'dn') + '" style="width:' + Math.round(a / t * 100) + '%"></u><u class="th"></u></i></span><b>' + b + (suf || '') + (cards ? ' ' + cd(cards.slice(2)) : '') + '</b></div>'; };
      const pane = tab === 'num' ? '<div class="rs-nums">' + nums.map(bar).join('') + '</div>' :
        tab === 'mom' ? '<div class="ldr-mom">' + U.lvMom(m, move !== null && move !== undefined ? move : null) + '</div><div class="rs-momf"><small>0\'</small><small>' + (move !== null && move !== undefined ? 'sua mudança aos ' + move + '\'' : 'acima é você') + '</small><small>90\'</small></div>' +
          '<ul class="ldl-last ldr-key">' + m.ev.filter(e => e.t === 'gol' || e.t === 'vermelho' || (e.s === 'us' && (e.t === 'tatica' || e.t === 'troca'))).slice(0, 6).map(e => c.feedLine(m, e)).join('') + '</ul>' :
        '<ul class="ldl-last ldr-all">' + m.ev.filter(e => e.t !== 'grito-fim').map(e => c.feedLine(m, e)).join('') + '</ul>';
      const rows = chg.filter(r => r[0] !== 'Caixa').map(([k, v, cc]) => [k, k === 'Tabela' ? (pre.pos && pre.pos !== pos ? ord(pre.pos) + ' → ' + ord(pos) : ord(pos)) : k === 'Diretoria' ? (co.sacked ? 'demitido' : cc === 'up' ? 'subiu' : cc === 'dn' ? 'caiu' : 'igual') : v, cc]);
      if (cadN.length) rows.push(['Caderno', '+' + cadN.length + (cadN.length > 1 ? ' notas' : ' nota'), 'up', 1]);
      show('<div class="rs">' +
        '<div class="rs-sc">' + crest((m.home ? cl : vs).id, 'rs-cr') + '<em>' + m.gh + ' <i>x</i> ' + m.ga + '</em>' + crest((m.home ? vs : cl).id, 'rs-cr') +
          '<span class="rs-w"><b class="' + log.res + '">' + word + (aux ? ' · COM O AUXILIAR' : '') + '</b><small>' + (goals.length ? goals.join(' · ') : 'sem gols') + '</small></span></div>' +
        '<div class="rs-tabs">' + [['num', 'Números'], ['mom', 'Quem mandou'], ['lan', 'Lances']].map(([k, t]) => '<button data-rt="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        '<div class="rs-pane ' + tab + '">' + pane + '</div>' +
        '<div class="rs-side">' +
          (best ? '<div class="rs-best"><small>MELHOR DO SEU TIME</small><span><b class="' + (best.r >= 7 ? 'up' : best.r < 5.8 ? 'dn' : '') + '">' + best.r.toFixed(1).replace('.', ',') + '</b><span><em>' + esc(bp ? bp.n : '') + '</em><small>' + esc(best.w) + '</small></span></span></div>' : '') +
          '<div class="rs-ch">' + rows.map(([k, v, cc, cad]) => (cad ? '<button id="rs-cad">' : '<span>') + k + '<b class="' + (cc || '') + '">' + esc(v) + '</b>' + (cad ? '</button>' : '</span>')).join('') + '</div>' +
          '<span class="rs-gap"></span>' +
          (rt.length ? '<button class="tm-b" id="ldr-all">Notas do time</button>' : '') +
          '<button class="tm-go" id="ldr-go">' + (co.sacked ? 'Falar com o presidente' : co.ss.done ? 'Fim da temporada' : 'Continuar') + '</button>' +
        '</div></div>', st => {
        st.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { sfx('tap'); tab = b.dataset.rt; draw(); });
        if (st.querySelector('#ldr-all')) st.querySelector('#ldr-all').onclick = () => { sfx('tap'); pop(popHead('Notas do jogo', 'Rodada ' + log.r + ' · ' + m.gh + ' x ' + m.ga) + '<div class="ld-pb col"><div class="ld-scroll ldr-alln">' + rt.map(nota).join('') + '</div></div>', 'Notas do jogo', null, 'w560'); };
        if (st.querySelector('#rs-cad')) st.querySelector('#rs-cad').onclick = () => { sfx('tap'); pop(popHead('Anotado no caderno', vs ? c.nm(m.vs) : '') + '<div class="ld-pb col rs-cadp">' + cadN.map(cadTxt).join('') + '</div>', 'Anotado no caderno', null, 'w560'); };
        st.querySelector('#ldr-go').onclick = () => { sfx('tap'); if (co.sacked) { off(); return c.sacked(); } if (co.ss.done) { off(); return c.finishSeason(); } segunda(log); };
      });
    };
    draw();
  }

  // ---------- Segunda-feira (38): quem fica fora, a moral, o próximo jogo e quem quer conversar ----------
  // Sem a tela da segunda-feira (Silvio, 2026-11-09): o Continuar do resultado vai direto para a semana. Quem quer
  // conversar (o mais chateado, uma vez a cada 4 rodadas) abre por cima da semana; fora, cansados e pendurados já
  // aparecem na escalação
  function segunda(log) {
    const c = C(), co = c.co, nx = S.coNext(co);
    if (!nx) { off(); return c.finishSeason(); }
    c.save('hub');
    const talker = co.squad.filter(p => (p.mo === undefined ? 60 : p.mo) < 42 && !(p.talked !== undefined && co.ss.i - p.talked < 4)).sort((a, b) => a.mo - b.mo)[0];
    semana();
    if (talker) talkPop(talker, log);
  }
  function talkPop(p, log) {
    const c = C(), co = c.co;
    pop(popHead(esc(p.n) + ' quer conversar', '"' + (p.bn >= 2 ? 'Professor, estou treinando bem e não entro. O que eu preciso fazer?' : 'Professor, não estou feliz aqui. Queria entender o meu papel.') + '"') +
      '<div class="ld-pb col">' + Object.keys(S.CO_TALK1).map(k => '<button class="ld-cand" data-t1="' + k + '"><span><b>' + S.CO_TALK1[k].name + '</b><small>' + S.CO_TALK1[k].tip + '</small></span></button>').join('') + '</div>',
      'Conversa', w => { w.querySelectorAll('[data-t1]').forEach(b => b.onclick = () => { sfx('tap'); S.coTalk1(co, p.id, b.dataset.t1); c.save(); closePop(); }); }, 'w560');
  }

  // ---------- Caderno do técnico deitado (40): a grade inteira, a casa tocada aberta ao lado, o próximo rival ----------
  const SH6 = { equilibrado: 'Equil.', posse: 'Posse', pressao: 'Pressão', contra: 'Contra', retranca: 'Retranca', lados: 'Lados' };
  function caderno(tab, selK) {
    const c = C(), co = c.co, cad = S.coCad(co), cnt = S.coCadSeen(co), F = Object.keys(S.CO_FORMS);
    tab = tab || 'sty';
    const nx = S.coNext(co), pv = nx && !nx.bye ? S.coPreview(co) : null, them = pv && pv.them;
    if (!selK && them) selK = tab === 'frm' ? 'frm:' + co.form + '|' + them.form : 'sty:' + co.style + '|' + them.style;
    const grid = (k, list, hd) => '<div class="ldc-g" style="grid-template-columns:62px repeat(' + list.length + ',minmax(0,1fr))"><span></span>' + list.map(b => '<span class="ldc-h">' + hd(b) + '</span>').join('') +
      list.map(a => '<span class="ldc-rl">' + hd(a) + '</span>' + list.map(b => { const x = cad[k][a + '|' + b], key = k + ':' + a + '|' + b;
        if (a === b && k === 'sty') return '<span class="ldc-c mirror"></span>';
        return '<button class="ldc-c' + (x ? ' ' + (x.pen ? 'pen' : 'lap') + ' ' + x.v : '') + (key === selK ? ' sel' : '') + '" data-ck="' + key + '" aria-label="' + esc(c.cadName(k, a) + ' contra ' + c.cadName(k, b)) + '">' + (x ? (x.v === 'up' ? '▲' : x.v === 'down' ? '▼' : '=') : '?') + '</button>'; }).join('')).join('') + '</div>';
    // A casa aberta
    let det = '';
    if (selK && tab !== 'riv') {
      const [k, ab] = selK.split(':'), [a, b] = ab.split('|'), x = cad[k][ab];
      const ttl = esc(c.cadName(k, a)).toUpperCase() + ' x ' + esc(c.cadName(k, b)).toUpperCase();
      det = '<div class="ldc-det">' + lbl(ttl) + (x ? '<b class="' + x.v + '">' + (x.v === 'up' ? '▲ Vantagem sua' : x.v === 'down' ? '▼ Você sofre' : '= Parelho') + '</b>' +
          '<p>' + esc(c.cadQuote(k, ab, x.v)) + '</p><small>' + (x.pen ? 'Certeza (viu 2 vezes)' : 'Pode errar (viu 1 vez)') + ' · visto em: ' + x.from.map(f => esc(c.nm(f.vs)) + ' (rodada ' + f.r + (f.s !== co.season ? ', ' + (U.YEAR0 + f.s) : '') + ')').join(' e ') + '</small>'
        : '<b class="nv">? Nunca viu</b><p>Você ainda não jogou com ' + esc(c.cadName(k, a).toLowerCase()) + ' contra ' + esc(c.cadName(k, b).toLowerCase()) + '. Só em campo se descobre.</p>') + '</div>';
    }
    let body;
    if (tab === 'riv') {
      const ids = Object.keys(cad.riv).sort((x, y) => (cad.riv[y].s - cad.riv[x].s) || (cad.riv[y].r - cad.riv[x].r));
      body = '<div class="ldc-riv">' + (ids.length ? ids.map(id => { const x = cad.riv[id], cl = club(id);
        return '<div class="ldc-rv">' + crest(id, 'ld-cr') + '<span><b>' + esc(cl.short || cl.name) + '</b><small>' + (x.n === 1 ? 'rodada ' + x.r : x.n + ' jogos · o último na rodada ' + x.r) + (x.s !== co.season ? ' de ' + (U.YEAR0 + x.s) : '') + '</small></span><em>' + x.form + ' · ' + esc(S.CO_STY[x.style].name) + '</em></div>'; }).join('')
        : '<p class="ld-none">Ainda vazio. Depois de cada jogo, o rival entra aqui com o jeito que jogou.</p>') + '</div>';
    } else body = grid(tab, tab === 'sty' ? S.CO_STYLES : F, x => (tab === 'sty' ? SH6[x] : x)) +
      '<div class="ldc-leg"><span><i class="pen">▲</i>certeza (viu 2 vezes)</span><span><i class="lap">▲</i>pode errar (viu 1 vez)</span><span><i>?</i>nunca viu</span></div>';
    let nxt = '';
    if (them) { const x = S.coCadGet(co, 'sty', co.style, them.style), tc = club(them.club);
      nxt = '<div class="ldc-nx">' + lbl('PRÓXIMO RIVAL') + '<div>' + crest(tc.id, 'ld-cr') + '<span><b>' + esc(tc.short || tc.name) + '</b> deve vir no ' + them.form + ', ' + esc(S.CO_STY[them.style].name.toLowerCase()) + '. ' +
        (x ? 'Com ' + esc(S.CO_STY[co.style].name.toLowerCase()) + ' você ' + (x.v === 'up' ? 'leva vantagem' : x.v === 'down' ? 'sofre' : 'fica no parelho') + (x.pen ? '.' : ' (pode errar).') : 'Contra isso, com o seu estilo, você nunca jogou.') + '</span></div></div>'; }
    show(rail('caderno') + '<div class="ld-col">' + head('Caderno do técnico', tab === 'riv' ? 'Como cada rival jogou contra você.' : 'O que você já viu. Linha = o seu, coluna = o deles.',
        '<div class="ld-seg ldc-tabs">' + [['sty', 'Estilos'], ['frm', 'Formações'], ['riv', 'Rivais']].map(([k, t]) => '<button data-ct="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>') +
      '<div class="ld-row"><div class="ldc-l">' + body + '</div><div class="ldc-r">' + det + nxt +
        '<small class="ldc-cnt">Descobertas: ' + (cnt.sty + cnt.frm) + ' de ' + (30 + F.length * F.length) + ' · leitura de jogo ' + co.xp.leitura + ' (' + U.D.plural(S.coCadPer(co), 'anotação', 'anotações') + ' por jogo)</small><span class="ld-gr"></span>' +
        (them ? gold('ldc-go', 'Usar no próximo jogo', 'abre a escalação com isso em mente') : '') + '</div></div></div>', st => {
      st.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { sfx('tap'); caderno(b.dataset.ct); });
      st.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { sfx('tap'); caderno(tab, b.dataset.ck); });
      if (st.querySelector('#ldc-go')) st.querySelector('#ldc-go').onclick = () => { sfx('tap'); time(false); };
    });
  }

  // ---------- Tabela deitada (19): classificação, gols e forma, artilharia do time e rodadas; a sua corrida ao lado ----------
  function tabela(tab, rd) {
    const c = C(), co = c.co, ss = co.ss, t = S.coTable(co), n = t.length, R = ss.rounds.length, B = co.board, me = t.find(x => x.me), pos = t.indexOf(me) + 1;
    tab = tab || 'cls'; rd = rd == null ? Math.max(0, ss.i - 1) : Math.max(0, Math.min(R - 1, rd));
    const zone = p => (ss.promo && p <= ss.promo) || (!ss.promo && p === 1) ? 'up' : ss.releg && p > n - ss.releg ? 'dn' : '';
    const dots = f => { const a = (f || '').split(''); while (a.length < 5) a.unshift('n'); return '<span class="ld-f5">' + a.map(x => '<i class="' + x + '"></i>').join('') + '</span>'; };
    let body;
    // Tabela enxuta (2026-11-09, quadro 16): menos colunas, letra maior, sem trilho
    if (tab === 'cls' || tab === 'gol') {
      body = '<div class="tb2-h"><i></i><i></i><span>CLUBE</span>' + (tab === 'cls' ? '<em>J</em><em>SG</em><b>PTS</b>' : '<em>GP</em><em>GC</em><b>SG</b>') + '<span>FORMA</span></div><div class="tb2-b">' +
        t.map((x, k) => { const sg = x.gp - x.gc, cl = club(x.id), sgT = (sg > 0 ? '+' : '') + sg;
          return '<div class="tb2-r ' + zone(k + 1) + (x.me ? ' me' : '') + '"><i>' + (k + 1) + '</i>' + crest(x.id, 'tb2-cr') + '<span>' + esc(cl.short || cl.name) + '</span>' +
            (tab === 'cls' ? '<em>' + x.j + '</em><em>' + sgT + '</em><b>' + x.p + '</b>' : '<em>' + x.gp + '</em><em>' + x.gc + '</em><b>' + sgT + '</b>') + dots(x.f) + '</div>'; }).join('') + '</div>';
    } else if (tab === 'art') {
      const g = {}; (ss.log || []).forEach(l => (l.ev || []).forEach(nm => { g[nm] = (g[nm] || 0) + 1; }));
      const list = Object.keys(g).sort((a, b) => g[b] - g[a]);
      body = '<div class="tb2-h art"><i></i><span>ARTILHARIA DO SEU TIME</span><b>GOLS</b></div><div class="tb2-b">' + (list.length ? list.map((nm, k) => { const p = co.squad.find(q => q.n === nm);
        return '<div class="tb2-r art"><i>' + (k + 1) + '</i><span>' + esc(nm) + ' <small>' + (p ? p.pos : 'saiu') + '</small></span><b>' + g[nm] + '</b></div>'; }).join('') : '<p class="tb2-none">Ninguém marcou ainda.</p>') + '</div>';
    } else {
      const res = (ss.res || [])[rd], played = rd < ss.i, mi = ss.ids.indexOf(co.club);
      const list = (played && res ? res.slice() : ss.rounds[rd].map(([h, a]) => [h, a])).sort((a, b) => (b[0] === mi || b[1] === mi) - (a[0] === mi || a[1] === mi));
      const nmI = i => esc(club(ss.ids[i]).short || club(ss.ids[i]).name);
      body = '<div class="tb2-nav"><button id="ldt-prev"' + (rd ? '' : ' disabled') + ' aria-label="Rodada anterior">◀</button><b>Rodada ' + (rd + 1) + ' de ' + R + (played ? '' : ' · a jogar') + '</b><button id="ldt-next"' + (rd < R - 1 ? '' : ' disabled') + ' aria-label="Próxima rodada">▶</button></div><div class="tb2-b">' +
        list.map(([h, a, gh, ga]) => '<div class="tb2-gm' + (h === mi || a === mi ? ' me' : '') + '"><span class="h">' + nmI(h) + crest(ss.ids[h], 'tb2-cr') + '</span><b>' + (gh != null ? gh + ' × ' + ga : '×') + '</b><span>' + crest(ss.ids[a], 'tb2-cr') + nmI(a) + '</span></div>').join('') + '</div>';
    }
    // A sua corrida: a meta da diretoria em pontos
    const gp = B.goal.pos, tgt = t[gp - 1], nxt = t[gp];
    const race = me.j === 0 ? 'começa agora' : B.goal.k === 'titulo' ? (pos === 1 ? (t[1] ? (me.p - t[1].p) + ' pontos à frente' : 'na frente') : (t[0].p - me.p) + ' pontos do líder')
      : pos <= gp ? (nxt ? (me.p - nxt.p === 0 ? 'empatado com o ' + (gp + 1) + 'º' : (me.p - nxt.p) + ' pontos à frente do ' + (gp + 1) + 'º') : 'dentro da meta') : (tgt.p - me.p) + ' pontos do ' + gp + 'º';
    const fut = []; const mi2 = ss.ids.indexOf(co.club);
    for (let i = ss.i; i < Math.min(R, ss.i + 3); i++) { const g = ss.rounds[i].find(([h, a]) => h === mi2 || a === mi2); if (!g) { fut.push('<span class="tb2-nx"><i class="bye">–</i><b>folga</b></span>'); continue; } const hm = g[0] === mi2, id = ss.ids[hm ? g[1] : g[0]]; fut.push('<span class="tb2-nx">' + crest(id, 'tb2-nxc') + '<b>' + esc(club(id).short || club(id).name) + '</b><small>' + (hm ? 'casa' : 'fora') + '</small></span>'); }
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const meta = B.goal.k === 'titulo' ? 'META · título' : 'META · até o ' + gp + 'º';
    show('<div class="tb2"><div class="tm-h"><button class="tcr-back" id="tb2-back" aria-label="Voltar">' + BK + '</button><b>' + esc(ss.name) + '</b><small>' + (ss.done ? 'encerrada' : 'rodada ' + Math.min(ss.i + 1, R) + ' de ' + R) + '</small></div>' +
      '<div class="tb2-tabs">' + [['cls', 'Classificação'], ['gol', 'Gols'], ['art', 'Artilharia'], ['rod', 'Rodadas']].map(([k, tt]) => '<button data-tb="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + tt + '</button>').join('') + '</div>' +
      '<div class="tb2-t ' + tab + '">' + body + '</div>' +
      '<div class="tb2-side"><div class="tb2-race"><small>SUA CORRIDA</small><b>' + pos + 'º · ' + race + '</b><em class="' + (pos <= gp ? '' : 'hi') + '">' + meta + '</em></div>' +
        (fut.length ? '<div class="tb2-fut"><small>PRÓXIMOS</small><div>' + fut.join('') + '</div></div>' : '') + '</div></div>', st => {
      st.querySelectorAll('[data-tb]').forEach(b => b.onclick = () => { sfx('tap'); tabela(b.dataset.tb, rd); });
      if (st.querySelector('#ldt-prev')) { st.querySelector('#ldt-prev').onclick = () => { sfx('tap'); tabela('rod', rd - 1); }; st.querySelector('#ldt-next').onclick = () => { sfx('tap'); tabela('rod', rd + 1); }; }
      st.querySelector('#tb2-back').onclick = () => { sfx('tap'); semana(); };
      const me2 = st.querySelector('.tb2-r.me, .tb2-gm.me'), bx = st.querySelector('.tb2-b');
      if (me2 && bx) bx.scrollTop = Math.max(0, me2.offsetTop - bx.offsetTop - bx.clientHeight / 2 + me2.offsetHeight / 2);
    });
  }

  // ---------- Clube deitado (enxuto desde 2026-11-09, quadro 17): 4 blocos com um número e a diretoria ----------
  function clube() {
    const c = C(), co = c.co, cl = club(co.club), f = S.coFin(co), B = co.board, pos = S.coPos(co), conf = Math.round(B.conf);
    const exp = co.squad.filter(p => p.ct <= 1).length, pres = S.coPres ? S.coPres(co) : null;
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const tile = (id, k, t, v, sub, cc) => '<button class="kb2-t"' + (id ? ' id="' + id + '"' : '') + ' data-k="' + k + '"><b>' + t + '</b><span><em class="' + (cc || '') + '">' + v + '</em><small>' + sub + '</small></span></button>';
    const meta = (B.goal.k === 'titulo' ? 'META · título' : 'META · até o ' + B.goal.pos + 'º') + ' · hoje ' + pos + 'º';
    show('<div class="kb2"><div class="tm-h"><button class="tcr-back" id="kb2-back" aria-label="Voltar">' + BK + '</button>' + crest(cl.id, 'kb2-cr') + '<b>' + esc(cl.name) + '</b><small>' + esc(co.ss ? co.ss.name : '') + ' · fama ' + co.fame + '</small></div>' +
      '<div class="kb2-g">' + tile('ldk-go', 'fin', 'Finanças', c.brl(f.caixa), 'no caixa', f.caixa < 0 ? 'dn' : '') +
        tile('', 'ele', 'Elenco', exp ? exp : co.squad.length, exp ? (exp > 1 ? 'contratos acabam' : 'contrato acaba') + ' no fim do ano' : 'jogadores', exp ? 'dn' : '') +
        tile('', 'tro', 'Troféus', co.titles.length, co.titles.length === 1 ? 'título' : 'títulos') +
        tile('', 'hall', 'Hall do técnico', (co.season + 1) + 'ª', 'temporada de carreira') + '</div>' +
      '<div class="kb2-side"><div class="kb2-dir"><small>DIRETORIA</small><b>' + (conf >= 70 ? 'confiança alta' : conf >= 45 ? 'confiança boa' : conf >= 30 ? 'confiança baixa' : 'no limite') + '</b>' +
          '<i><u class="' + (conf >= 55 ? 'ok' : conf >= 35 ? 'mid' : 'low') + '" style="width:' + conf + '%"></u></i><em class="' + (pos <= B.goal.pos ? '' : 'hi') + '">' + meta + '</em></div>' +
        (pres ? '<div class="kb2-pr fc">' + presFace(pres, 'kb2-fc') + '<div><small>PRESIDENTE</small><b>' + esc(pres.n) + '</b><span>' + esc(pres.nome || '') + '</span></div></div>' : '') +
        '<span class="rs-gap"></span><p class="kb2-soon">Estádio e base chegam depois</p></div></div>', st => {
      st.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.k; if (k === 'fin') financas(); else if (k === 'ele') elenco(); else if (k === 'tro') trofeus(); else if (k === 'hall') hall(); });
      st.querySelector('#kb2-back').onclick = () => { sfx('tap'); semana(); };
    });
  }
  // ---------- Mercado, lote 1 (2026-11-09, quadros 23, 23b e 24): só olhar; propostas no lote 2 ----------
  // Procurar só com filtros (Silvio: "pra não ficar uma lista extensa à toa", como no WSC): 6 escolhas com ◀ ▶ e o nome;
  // o total muda a cada toque e Buscar só libera com até S.CO_MKT.max jogadores. O resultado mostra 4 por página.
  const MK_BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const MK_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4L6 12l11 8z"/></svg>', MK_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z"/></svg>';
  const mkWin = () => { const w = S.coMktWin(C().co);
    return w.k ? '<span class="mk-win' + (w.open ? '' : ' off') + '">' + (w.open ? 'JANELA · DIA ' + w.day + ' DE ' + w.max : 'JANELA · SEM DIAS') + '</span>' : '<span class="mk-win off">' + (w.next ? 'JANELA · RODADA ' + w.next : 'JANELA FECHADA') + '</span>'; };
  const mkHead = (id, t, s, noWin) => '<div class="tm-h"><button class="tcr-back" id="' + id + '" aria-label="Voltar">' + MK_BK + '</button><b>' + t + '</b><small>' + s + '</small>' + (noWin ? '' : mkWin()) + '<button class="ol2-q" id="mk-q" aria-label="Como funciona">?</button></div>';
  const mkHelp = (t, p) => pop('<div class="acd-help"><b>Como funciona</b><p>' + p + '</p><button class="hl-btn dark" data-pop-x>Entendi</button></div>', 'Como funciona', null, 'hl-pop acd-pop tm-pop');
  const mkClub = p => (p.club ? esc(club(p.club).short || club(p.club).name) : 'sem clube');
  function mercado() {
    const c = C(), co = c.co, m = S.coMkt(co), F = S.coMktFilters(co);
    m.f = F.map((x, i) => Math.min(m.f[i] || 0, x.o.length - 1));
    const n = S.coMktSearch(co).length, ok = n > 0 && n <= S.CO_MKT.max;
    const tabs = [['Procurar', 1], ['Indicados'], ['Elenco'], ['Notícias']].map(([t, on]) => '<button' + (on ? ' class="on"' : ' disabled title="em breve"') + '>' + t + '</button>').join('');
    const cell = (x, i) => { const v = m.f[i] || 0, t = x.o[v].t;
      return '<div class="mk-f' + (v ? ' on' : '') + '"><small>' + x.t + '</small><span><button class="mk-ar" data-mf="' + i + '" data-d="-1" aria-label="' + x.t.toLowerCase() + ' anterior">' + MK_L + '</button><b class="' + (t.length > 16 ? 'mk-sm' : '') + '">' + esc(t) + '</b><button class="mk-ar" data-mf="' + i + '" data-d="1" aria-label="' + x.t.toLowerCase() + ' seguinte">' + MK_R + '</button></span></div>'; };
    const goTxt = n => (n > 0 && n <= S.CO_MKT.max ? 'Buscar' : n ? 'Filtre mais' : 'Ninguém: solte um filtro');
    show('<div class="mk">' + mkHead('mk-back', 'Mercado', esc(club(co.club).short || club(co.club).name)) +
      '<div class="mk-tabs">' + tabs + '</div><div class="mk-fs">' + F.map(cell).join('') + '</div>' +
      '<div class="mk-side"><label class="mk-k mk-nm"><small>NOME</small><input id="mk-nm" type="text" autocomplete="off" placeholder="Toque para digitar" value="' + esc(m.nm || '') + '"></label>' +
        '<div class="mk-k"><b id="mk-n" class="' + (ok ? 'ok' : '') + '">' + U.D.plural(n, 'jogador', 'jogadores') + '</b><span>o olheiro conhece a sua liga</span></div>' +
        '<span class="rs-gap"></span><button class="tm-go' + (ok ? '' : ' off') + '" id="mk-go">' + goTxt(n) + '</button></div></div>', st => {
      st.querySelector('#mk-back').onclick = () => { sfx('tap'); semana(); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Escolha os filtros até sobrarem ' + S.CO_MKT.max + ' jogadores ou menos. Nível é contra o seu titular da posição e só vale para quem o olheiro já viu. A janela abre antes da 1ª rodada (10 dias) e antes da rodada do meio (6 dias): proposta e contrato gastam 1 dia. O relatório do olheiro sai do caixa. Jogador sem clube você contrata a qualquer hora.'); };
      st.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => { sfx('tap'); const i = +b.dataset.mf, L = F[i].o.length; m.f[i] = ((m.f[i] || 0) + (+b.dataset.d) + L) % L; c.save(); mercado(); });
      const inp = st.querySelector('#mk-nm');
      inp.oninput = () => { m.nm = inp.value; const k = S.coMktSearch(co).length, good = k > 0 && k <= S.CO_MKT.max, nb = st.querySelector('#mk-n'), gb = st.querySelector('#mk-go');
        nb.textContent = U.D.plural(k, 'jogador', 'jogadores'); nb.className = good ? 'ok' : ''; gb.textContent = goTxt(k); gb.classList.toggle('off', !good); };
      inp.onkeydown = e => { if (e.key === 'Enter') { inp.blur(); st.querySelector('#mk-go').click(); } };
      st.querySelector('#mk-go').onclick = () => { const k = S.coMktSearch(co).length; if (!(k > 0 && k <= S.CO_MKT.max)) return; sfx('tap'); c.save(); mercadoRes(0, 0); };
    });
  }
  // Resultado (23b): os filtros usados em cima e Mudar; 4 jogadores por página; à direita verba, folha e as páginas
  function mercadoRes(pg, sel) {
    const c = C(), co = c.co, m = S.coMkt(co), F = S.coMktFilters(co), f = S.coFin(co), folha = S.coFolha(co), pct = Math.min(100, Math.round(100 * folha / Math.max(1, f.teto)));
    const list = S.coMktSort(co, S.coMktSearch(co)), pages = Math.max(1, Math.ceil(list.length / 4));
    pg = Math.max(0, Math.min(pages - 1, pg || 0)); const R = list.slice(pg * 4, pg * 4 + 4); sel = Math.min(sel || 0, R.length - 1);
    const chips = F.map((x, i) => (m.f[i] ? '<span class="mk-chip">' + esc(x.o[m.f[i]].t.replace(' · verba', '')) + '</span>' : '')).join('') + (m.nm && m.nm.trim().length >= 3 ? '<span class="mk-chip">"' + esc(m.nm.trim()) + '"</span>' : '');
    const row = (p, i) => { const b = S.coMktBand(co, p), w = S.coMktWord(b), pr = S.coMktPrice(p);
      return '<button class="mk-r' + (i === sel ? ' on' : '') + '" data-mr="' + i + '"><i>' + p.pos + '</i><span><b>' + esc(p.n) + '</b><small' + (b ? '' : ' class="nr"') + '>' + p.age + ' anos · ' + mkClub(p) + (b ? '' : ' · sem relatório') + '</small></span>' +
        '<em class="' + (w || 'nr') + '">' + (w || '?') + '</em><strong>' + (p.club ? c.brl(pr) : 'grátis') + '</strong></button>'; };
    show('<div class="mk mkr">' + mkHead('mkr-back', 'Resultado', U.D.plural(list.length, 'jogador', 'jogadores')) +
      '<div class="mk-chips">' + chips + '<span class="rs-gap"></span><button class="mk-mud" id="mkr-mud">Mudar</button></div>' +
      '<div class="mk-list">' + (R.length ? R.map(row).join('') : '<p class="fn2-none">Ninguém com esses filtros.</p>') + '</div>' +
      '<div class="mk-side"><div class="mk-k"><small>VERBA</small><b class="up">' + c.brl(f.verba) + '</b><span class="mk-fl"><span>Folha</span><span>' + pct + '% do teto</span></span><i class="mk-bar"><u class="' + (pct > 95 ? 'low' : pct > 85 ? 'mid' : 'ok') + '" style="width:' + pct + '%"></u></i></div>' +
        '<div class="mk-pg"><button class="mk-ar big" id="mkr-prev" aria-label="Página anterior"' + (pg ? '' : ' disabled') + '>' + MK_L + '</button><b>' + (pg + 1) + ' de ' + pages + '</b><button class="mk-ar big" id="mkr-next" aria-label="Próxima página"' + (pg < pages - 1 ? '' : ' disabled') + '>' + MK_R + '</button></div>' +
        '<span class="rs-gap"></span><button class="tm-go' + (R.length ? '' : ' off') + '" id="mkr-go">Ver ficha</button></div></div>', st => {
      st.querySelector('#mkr-back').onclick = () => { sfx('tap'); mercado(); };
      st.querySelector('#mkr-mud').onclick = () => { sfx('tap'); mercado(); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Melhor, igual ou pior é contra o seu titular da posição. Quem o olheiro ainda não viu aparece sem relatório; peça um na ficha. Os com relatório vêm primeiro.'); };
      st.querySelectorAll('[data-mr]').forEach(b => b.onclick = () => { const i = +b.dataset.mr; sfx('tap'); if (i === sel) return ficha(R[i].id, () => mercadoRes(pg, i)); mercadoRes(pg, i); });
      st.querySelector('#mkr-prev').onclick = () => { sfx('tap'); mercadoRes(pg - 1, 0); };
      st.querySelector('#mkr-next').onclick = () => { sfx('tap'); mercadoRes(pg + 1, 0); };
      st.querySelector('#mkr-go').onclick = () => { if (!R.length) return; sfx('tap'); ficha(R[sel].id, () => mercadoRes(pg, sel)); };
    });
  }
  // Ficha (24): a força numa faixa borrada contra o seu titular (sem número), que estreita a cada relatório;
  // potencial em palavras e o jeito de jogar; à direita preço, salário e contrato, relatório, observar e a proposta
  function ficha(id, back) {
    const c = C(), co = c.co, p = S.coMktFind(co, id); if (!p) return mercado();
    const b = S.coMktBand(co, p), n = b ? b.n : 0, st0 = b ? b.st : S.coMktStarter(co, p.pos), sp = S.CO_MKT.span, obs = !!S.coMkt(co).obs[p.id];
    const X = v => Math.max(0, Math.min(100, 50 + 50 * v / sp));
    const CERT = ['', 'pouca certeza', 'certeza média', 'certeza alta'];
    const word = b ? S.coMktWord(b) : '';
    const band = b ? '<span class="mk-band" style="left:' + X(b.lo) + '%;width:' + Math.max(4, X(b.hi) - X(b.lo)) + '%"></span>' : '';
    const pot = b ? S.coMktPot(p) : null, tr = b ? S.coMktTraits(p) : null;
    const yr = p.club ? 'até ' + (U.YEAR0 + co.season + p.ct) : 'livre';
    const repC = S.coMktRepCost(co, p), repNo = n < S.CO_MKT.reps && (S.coFin(co).caixa || 0) < repC, repOff = n >= S.CO_MKT.reps || repNo;
    show('<div class="mk mkf">' + mkHead('mkf-back', esc(p.n), S.CO_POS_NM[p.pos] + ' · ' + p.age + ' anos · ' + mkClub(p)) +
      '<div class="mk-k mkf-cmp"><span class="mkf-t"><small>CONTRA O SEU ' + (S.CO_POS_NM[p.pos] || '').toUpperCase() + ' TITULAR</small>' + (b ? '<b class="' + word + '">' + word + '<small>' + CERT[n] + '</small></b>' : '<b class="nr">sem relatório</b>') + '</span>' +
        '<span class="mkf-sc"><i></i>' + band + '<em></em><strong>' + esc(st0 ? last(st0.n) : 'titular') + '</strong></span><span class="mkf-w"><span>pior</span><span>igual</span><span>melhor</span></span></div>' +
      '<div class="mkf-g"><div class="mk-k"><small>POTENCIAL</small><b>' + (pot ? pot[0] : 'Peça um relatório') + '</b>' + (pot ? '<span class="mkf-dd">' + [1, 2, 3, 4].map(k => '<i class="' + (k <= pot[1] ? 'on' : '') + '"></i>').join('') + '</span>' : '<span class="mkf-nr">o olheiro ainda não viu</span>') + '</div>' +
        '<div class="mk-k"><small>JEITO DE JOGAR</small>' + (tr ? '<span class="mkf-tr">' + tr.good.map(t => '<span>' + t + '</span>').join('') + '</span><span class="mkf-nr">' + (n >= 3 ? 'Ponto fraco: ' + tr.bad : 'mais relatório mostra o ponto fraco') + '</span>' : '<b>?</b><span class="mkf-nr">o olheiro ainda não viu</span>') + '</div></div>' +
      '<div class="mk-side"><div class="mk-k mkf-li"><div><span>Preço</span><b>' + (p.club ? c.brl(S.coMktPrice(p)) : 'grátis') + '</b></div><div><span>Salário</span><b>' + c.brl(p.wage) + '/sem</b></div><div><span>Contrato</span><b>' + yr + '</b></div></div>' +
        '<div class="mkf-act"><button class="mkf-rep' + (repOff ? ' done' : '') + '" id="mkf-rep"' + (repOff ? ' disabled' : '') + '>' + (n >= S.CO_MKT.reps ? 'Relatório completo' : (n ? 'Mais um relatório' : 'Pedir relatório') + '<small>' + (repNo ? 'sem caixa · ' : '') + c.brl(repC) + '</small>') + '</button>' +
          '<button class="mkf-star' + (obs ? ' on' : '') + '" id="mkf-star" aria-label="Observar" aria-pressed="' + obs + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg></button></div>' +
        '<span class="rs-gap"></span>' + fichaGo(co, p) + '</div></div>', st => {
      st.querySelector('#mkf-back').onclick = () => { sfx('tap'); (back || mercado)(); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'A faixa é onde o olheiro acha que ele está, comparado ao seu titular. Cada relatório deixa a faixa mais estreita e custa mais que o anterior, pago do caixa. Jogador do exterior custa o dobro.'); };
      if (!repOff) st.querySelector('#mkf-rep').onclick = () => { if (!S.coMktReport(co, p)) return; sfx('tap'); c.save(); ficha(id, back); };
      st.querySelector('#mkf-star').onclick = () => { sfx('tap'); S.coMktObs(co, p); c.save(); ficha(id, back); };
      const go = st.querySelector('#mkf-go.go');
      if (go) go.onclick = () => { sfx('tap'); const me = () => ficha(id, back); if (!p.club || S.coMktNeg(co, p).st === 'ok') contrato(id, me); else proposta(id, me); };
    });
  }
  // O dourado da ficha: proposta (com a janela), contrato (sem clube ou depois do clube aceitar), ou apagado dizendo por quê
  function fichaGo(co, p) {
    const n = S.coMkt(co).neg[p.id], w = S.coMktWin(co), off = t => '<button class="tm-go off" id="mkf-go" disabled>' + t + '</button>';
    if (n && n.st === 'no') return off('Não negocia mais');
    if (!p.club || (n && n.st === 'ok')) return (p.club && !w.open) ? off('Janela fechada') : '<button class="tm-go go" id="mkf-go">' + (p.club ? 'Ir ao contrato' : 'Fazer contrato') + '</button>';
    if (!w.open) return off(w.k ? 'Sem dias na janela' : w.next ? 'Janela na rodada ' + w.next : 'Janela fechada');
    return '<button class="tm-go go" id="mkf-go">Fazer proposta</button>';
  }
  // ---------- Mercado, lote 2 (2026-11-09, quadros 25 e 26): proposta ao clube e contrato com o empresário ----------
  // Proposta (25): valor grande com ◀ ▶ e os atalhos baixa/justa/alta, pagamento à vista/2x/3x, jogador na troca;
  // à direita o presidente (humor numa palavra, paciência em 3 bolinhas; depois de enviar, a resposta no lugar do humor),
  // quanto sai da verba agora e quanto sobra. Empréstimo fica para a fase 5.
  const mkDots = (n, max) => '<span class="mkp-dots">' + Array.from({ length: max }, (_, i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</span>';
  function proposta(id, back, o) {
    const c = C(), co = c.co, p = S.coMktFind(co, id); if (!p) return mercado();
    const f = S.coFin(co), cuts = S.coMktCuts(p), neg = S.coMktNeg(co, p), w = S.coMktWin(co), M = S.CO_MKT;
    o = o || { v: neg.cv || cuts[1], pay: 0, tr: null };
    const TL = S.coMktTradeList(co), ti = o.tr ? TL.findIndex(q => q.id === o.tr) : -1, tq = ti >= 0 ? TL[ti] : null;
    const step = o.v >= 2e6 ? 100000 : o.v >= 500000 ? 50000 : 10000;
    const now = S.coMktNow(co, o), after = f.verba - now;
    const pres = S.CO_MKT_PRES[S.coMktPres(co, p)], a = neg.ans;
    const ans = a ? (a.k === 'ok' ? ['Aceitou', 'up'] : a.k === 'counter' ? ['Pede ' + c.brl(a.v), 'mid'] : a.k === 'no' ? ['Encerrou a conversa', 'dn'] : ['Recusou', 'dn']) : [pres.t, pres.c];
    const cl = club(p.club), cn = esc(cl.short || cl.name);
    const done = neg.st === 'ok' || neg.st === 'no';
    const gold = neg.st === 'ok' ? '<button class="tm-go" id="mkp-go">Ir ao contrato</button>' : neg.st === 'no' ? '<button class="tm-go off" id="mkp-go" disabled>Não negocia mais</button>' :
      !w.open ? '<button class="tm-go off" id="mkp-go" disabled>Janela fechada</button>' : after < 0 ? '<button class="tm-go off" id="mkp-go" disabled>Sem verba</button>' : '<button class="tm-go" id="mkp-go">Enviar · 1 dia</button>';
    const seg = (on, t, attr) => '<button class="' + (on ? 'on' : '') + '" ' + attr + '>' + t + '</button>';
    show('<div class="mk mkp">' + mkHead('mkp-back', 'Proposta', esc(p.n) + ' · ' + S.CO_POS_NM[p.pos] + ' · ' + cn) +
      '<div class="mk-tabs mkp-tabs"><button class="on">Compra</button><button disabled title="em breve">Empréstimo · em breve</button></div>' +
      '<div class="mkp-l"><div class="mk-k mkp-v"><small>VALOR DA PROPOSTA</small><span class="mkp-row"><button class="mk-ar big" data-pv="-1" aria-label="Menos"' + (done ? ' disabled' : '') + '>' + MK_L + '</button><b>' + c.brl(o.v) + '</b><button class="mk-ar big" data-pv="1" aria-label="Mais"' + (done ? ' disabled' : '') + '>' + MK_R + '</button></span>' +
        '<span class="mkp-cuts">' + ['Baixa', 'Justa', 'Alta'].map((t, i) => seg(o.v === cuts[i], t + ' · ' + c.brl(cuts[i]), 'data-pc="' + i + '"' + (done ? ' disabled' : ''))).join('') + '</span></div>' +
        '<div class="mkp-g"><div class="mk-k"><small>PAGAMENTO</small><span class="mkp-seg">' + ['À vista', '2x', '3x'].map((t, i) => seg(o.pay === i, t, 'data-pp="' + i + '"' + (done ? ' disabled' : ''))).join('') + '</span></div>' +
          '<div class="mk-k"><small>JOGADOR NA TROCA</small><span class="mkp-tr"><button class="mk-ar" data-pt="-1" aria-label="Anterior"' + (done || !TL.length ? ' disabled' : '') + '>' + MK_L + '</button><b class="' + (tq ? '' : 'off') + '">' + (tq ? esc(last(tq.n)) + ' · ' + tq.pos : TL.length ? 'Ninguém' : 'Sem reservas') + '</b><button class="mk-ar" data-pt="1" aria-label="Próximo"' + (done || !TL.length ? ' disabled' : '') + '>' + MK_R + '</button></span></div></div></div>' +
      '<div class="mk-side"><div class="mk-k mkp-pr"><small>PRESIDENTE</small><b class="' + ans[1] + '">' + ans[0] + '</b><span class="mkp-pat">Paciência' + mkDots(neg.pat, M.pat) + '</span></div>' +
        '<div class="mk-k mkf-li"><div><span>' + (o.pay ? 'Agora · ' + (o.pay + 1) + 'x' : 'Paga agora') + '</span><b>' + c.brl(now) + '</b></div><div><span>Verba depois</span><b class="' + (after < 0 ? 'dn' : 'up') + '">' + (after < 0 ? '− ' + c.brl(-after) : c.brl(after)) + '</b></div></div>' +
        '<span class="rs-gap"></span>' + gold + '</div></div>', st => {
      const re = x => proposta(id, back, Object.assign({}, o, x));
      st.querySelector('#mkp-back').onclick = () => { sfx('tap'); back(); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Cada proposta gasta 1 dia. Abaixo do que ele quer, o presidente contrapõe (perto) ou recusa (longe), e cada resposta que não é sim gasta uma bolinha de paciência. Sem paciência, ele não negocia mais nesta temporada. Parcelado pesa menos na verba agora, mas ele aceita um pouco menos. O jogador na troca abate do valor.'); };
      st.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { sfx('tap'); re({ v: Math.max(10000, o.v + step * (+b.dataset.pv)) }); });
      st.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { sfx('tap'); re({ v: cuts[+b.dataset.pc] }); });
      st.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { sfx('tap'); re({ pay: +b.dataset.pp }); });
      st.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { sfx('tap'); const L = TL.length + 1, k = ((ti + 1) + (+b.dataset.pt) + L) % L; re({ tr: k ? TL[k - 1].id : null }); });
      const go = st.querySelector('#mkp-go:not(.off)');
      if (go) go.onclick = () => { sfx('tap');
        if (neg.st === 'ok') return contrato(id, () => proposta(id, back));
        const r = S.coMktOffer(co, p, o); c.save(); sfx(r.k === 'ok' ? 'win' : 'tap');
        const o2 = r.k === 'counter' ? Object.assign({}, o, { v: r.v }) : o;
        proposta(id, back, o2); resposta(id, back, o, r); };
    });
  }
  // Resposta do clube (30): janelinha depois de Enviar. Rosto, a resposta numa palavra, paciência, uma frase,
  // 2 linhas de número e 2 botões; na contraproposta, aceitar fecha direto (gasta 1 dia)
  function resposta(id, back, o, r) {
    const c = C(), co = c.co, p = S.coMktFind(co, id); if (!p) return;
    const f = S.coFin(co), neg = S.coMktNeg(co, p), cl = club(p.club), cn = esc(cl.short || cl.name), nm = esc(last(p.n));
    const day = S.coMktWin(co), dtx = day.k ? ' · DIA ' + Math.min(S.coMkt(co).used, day.max) : '';
    let w, cls, line, r1, v1, r2, v2, b1, b2, a1, a2;
    if (r.k === 'ok') { const now = S.coMktNow(co, neg.deal);
      w = 'Aceitou'; cls = 'up'; line = 'Fechado com o ' + cn + ' por ' + c.brl(neg.deal.v) + (neg.deal.pay ? ' em ' + (neg.deal.pay + 1) + 'x' : ' à vista') + '. Agora é acertar o contrato com o empresário.';
      r1 = 'Paga agora'; v1 = c.brl(now); r2 = 'Verba depois'; v2 = f.verba - now; b1 = 'Ir ao contrato'; b2 = 'Depois';
      a1 = () => contrato(id, () => proposta(id, back)); a2 = null;
    } else if (r.k === 'counter') { const o2 = Object.assign({}, o, { v: r.v }), now = S.coMktNow(co, o2);
      w = 'Pede ' + c.brl(r.v); cls = 'mid'; line = 'Ele achou ' + c.brl(o.v) + ' pouco, mas topa conversar. Aceitar fecha agora e gasta mais 1 dia.';
      r1 = 'Se aceitar, paga'; v1 = c.brl(now); r2 = 'Verba depois'; v2 = f.verba - now; b1 = 'Aceitar ' + c.brl(r.v); b2 = 'Nova proposta';
      a1 = () => { const r2x = S.coMktOffer(co, p, o2); c.save(); sfx(r2x.k === 'ok' ? 'win' : 'tap'); proposta(id, back, o2); resposta(id, back, o2, r2x); }; a2 = null;
      if (v2 < 0) { line = 'Ele pede ' + c.brl(r.v) + ', mas isso passa da sua verba. Parcele ou ponha alguém na troca.'; b1 = 'Nova proposta'; b2 = 'Desistir'; a1 = null; a2 = () => back(); }
    } else if (r.k === 'recusa') {
      w = 'Recusou'; cls = 'dn'; line = c.brl(o.v) + ' ficou longe do que ele quer.' + (neg.pat === 1 ? ' Mais uma recusa e ele encerra a conversa.' : ' Tente chegar mais perto.');
      r1 = 'Você ofereceu'; v1 = c.brl(o.v); r2 = 'Verba agora'; v2 = f.verba; b1 = 'Nova proposta'; b2 = 'Desistir'; a1 = null; a2 = () => back();
    } else if (r.k === 'no') {
      w = 'Encerrou a conversa'; cls = 'dn'; line = 'Sem paciência, o ' + cn + ' não negocia o ' + nm + ' com você até a próxima temporada.';
      r1 = 'Última proposta'; v1 = c.brl(o.v); r2 = 'Verba agora'; v2 = f.verba; b1 = 'Voltar ao mercado'; b2 = 'Fechar'; a1 = () => mercado(); a2 = null;
    } else {
      w = r.k === 'verba' ? 'Sem verba' : 'Janela fechada'; cls = 'dn'; line = r.k === 'verba' ? 'O que sai agora passa da sua verba. Parcele ou ponha alguém na troca.' : 'Acabaram os dias da janela. A próxima abre antes da rodada do meio.';
      r1 = 'Proposta'; v1 = c.brl(o.v); r2 = 'Verba agora'; v2 = f.verba; b1 = 'Entendi'; b2 = 'Mercado'; a1 = null; a2 = () => mercado();
    }
    const ini = esc((cl.short || cl.name).replace(/[^A-Za-zÀ-ú ]/g, '').split(' ').filter(Boolean).map((x, i, A) => A.length > 1 ? x[0] : x.slice(0, 2)).join('').slice(0, 2).toUpperCase() || 'P');
    pop('<div class="mkx"><div class="mkx-h"><i class="mkx-fc">' + ini + '</i><span><small>PRESIDENTE' + dtx + '</small><b class="' + cls + '">' + w + '</b></span>' + mkDots(neg.pat, S.CO_MKT.pat) + '</div>' +
      '<p>' + line + '</p><div class="mkx-li"><div><span>' + r1 + '</span><b>' + v1 + '</b></div><div><span>' + r2 + '</span><b class="' + (v2 < 0 ? 'dn' : 'up') + '">' + (v2 < 0 ? '− ' + c.brl(-v2) : c.brl(v2)) + '</b></div></div>' +
      '<span class="rs-gap"></span><span class="mkx-b"><button class="hl-btn gold" id="mkx-1">' + b1 + '</button><button class="hl-btn dark" id="mkx-2">' + b2 + '</button></span></div>', 'Resposta do clube', x => {
      x.querySelector('#mkx-1').onclick = () => { sfx('tap'); closePop(); a1 && a1(); };
      x.querySelector('#mkx-2').onclick = () => { sfx('tap'); closePop(); a2 && a2(); };
    }, 'hl-pop mkx-pop', true);
  }
  // Contrato (26): salário e anos com ◀ ▶, papel prometido; à direita o empresário (humor a cada toque, 4 tracinhos,
  // paciência) e a folha contra o teto. Serve para depois do clube aceitar e para quem está sem clube (renovação: fase 3).
  function contrato(id, back, t) {
    const c = C(), co = c.co, own = co.squad.find(x => x.id === id), p = own || S.coMktFind(co, id); if (!p) return mercado();
    const neg = own ? S.coMktRenNeg(co, p) : S.coMktNeg(co, p), T = S.coMktTerms(co, p), w = own ? { open: false } : S.coMktWin(co), M = S.CO_MKT, R = S.CO_MKT_ROLE;
    t = t || { w: T.ask(1) - T.step, y: T.want, role: 1 };
    const md = S.coMktMood(co, p, t), fo = S.coMktFolha(co, p, t), over = fo.pct > 100;
    const cls = ['', 'dn', 'dn', 'mid', 'up'][md.lvl];
    const yr = U.YEAR0 + co.season + t.y, need = p.club || w.open;
    const gold = own ? (neg.st === 'no' ? '<button class="tm-go off" id="mkc-go" disabled>Não renova mais</button>' : neg.st === 'signed' ? '<button class="tm-go off" id="mkc-go" disabled>Renovado</button>' :
      over && t.w > p.wage ? '<button class="tm-go off" id="mkc-go" disabled>Acima do teto</button>' : '<button class="tm-go" id="mkc-go">Oferecer</button>') : neg.st === 'no' ? '<button class="tm-go off" id="mkc-go" disabled>Não negocia mais</button>' : (p.club && !w.open) ? '<button class="tm-go off" id="mkc-go" disabled>Janela fechada</button>' :
      over ? '<button class="tm-go off" id="mkc-go" disabled>Acima do teto</button>' : co.squad.length >= M.maxSquad ? '<button class="tm-go off" id="mkc-go" disabled>Elenco cheio</button>' :
      '<button class="tm-go" id="mkc-go">' + (w.open ? 'Oferecer · 1 dia' : 'Oferecer') + '</button>';
    const sub = own ? esc(p.n) + ' · hoje ' + c.mi(p.wage) + '/sem' : esc(p.n) + (p.club ? ' · o ' + esc(club(p.club).short || club(p.club).name) + ' aceitou' : ' · sem clube');
    const box = (lbl, v, k, hint) => '<div class="mk-k mkc-b"><small>' + lbl + '</small><span class="mkp-row"><button class="mk-ar big" data-' + k + '="-1" aria-label="Menos">' + MK_L + '</button><b>' + v + '</b><button class="mk-ar big" data-' + k + '="1" aria-label="Mais">' + MK_R + '</button></span><span class="mkc-h">' + hint + '</span></div>';
    show('<div class="mk mkc">' + mkHead('mkc-back', own ? 'Renovação' : 'Contrato', sub, own) +
      '<div class="mkc-l"><div class="mkc-g">' + box('SALÁRIO POR SEMANA', (t.w < 10000 && t.w % 1000 ? 'R$ ' + (t.w / 1000).toFixed(1).replace('.', ',') + ' mil' : c.brl(t.w)), 'cw', t.w >= md.ask ? 'o que ele pede' : 'abaixo do que ele pede') +
        box('DURAÇÃO', t.y + (t.y > 1 ? ' anos' : ' ano'), 'cy', 'até ' + yr + (t.y === T.want ? ' · ele prefere' : '')) + '</div>' +
        '<div class="mk-k mkc-r"><small>PAPEL PROMETIDO</small><span class="mkp-seg big">' + R.map((r, i) => '<button class="' + (t.role === i ? 'on' : '') + '" data-cr="' + i + '">' + r.t + '</button>').join('') + '</span><span class="mkc-d">' + R[t.role].d + '</span></div></div>' +
      '<div class="mk-side"><div class="mk-k mkp-pr"><small>EMPRESÁRIO</small><b class="' + cls + '">' + (neg.st === 'no' ? 'Desistiu' : md.t) + '</b><span class="mkf-dd mkc-dd">' + [1, 2, 3, 4].map(k => '<i class="' + (k <= md.lvl ? cls || 'up' : '') + '"></i>').join('') + '</span><span class="mkp-pat">Paciência' + mkDots(neg.apat, M.pat) + '</span></div>' +
        '<div class="mk-k mkc-f"><small>FOLHA DEPOIS</small><b class="' + (over ? 'dn' : '') + '">' + fo.pct + '% do teto</b><i class="mk-bar"><u class="' + (over ? 'low' : fo.pct >= 95 ? 'mid' : 'ok') + '" style="width:' + Math.min(100, fo.pct) + '%"></u></i></div>' +
        '<span class="rs-gap"></span>' + gold + '</div></div>', st => {
      const re = x => contrato(id, back, Object.assign({}, t, x));
      st.querySelector('#mkc-back').onclick = () => { sfx('tap'); back(); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'O empresário pesa salário, anos e papel, e o humor dele muda a cada toque: só com "Deve aceitar" ele assina. Cada recusa gasta uma bolinha de paciência. Prometer titular baixa o salário que ele pede, mas a promessa vai ser cobrada. A folha não passa do teto.'); };
      st.querySelectorAll('[data-cw]').forEach(b => b.onclick = () => { sfx('tap'); re({ w: Math.max(1000, t.w + T.step * (+b.dataset.cw)) }); });
      st.querySelectorAll('[data-cy]').forEach(b => b.onclick = () => { sfx('tap'); re({ y: Math.max(1, Math.min(5, t.y + (+b.dataset.cy))) }); });
      st.querySelectorAll('[data-cr]').forEach(b => b.onclick = () => { sfx('tap'); re({ role: +b.dataset.cr }); });
      const go = st.querySelector('#mkc-go:not(.off)');
      if (go && own) go.onclick = () => { sfx('tap'); const r = S.coMktRenew(co, p, t); c.save();
        if (r.k === 'signed') { sfx('win'); back(); return pop('<div class="mkx"><div class="mkx-h"><i class="mkx-fc">' + p.ovr + '</i><span><small>' + esc(p.n).toUpperCase() + '</small><b class="up">Renovado</b></span></div>' +
          '<p>' + esc(last(p.n)) + ' assinou como ' + R[t.role].t.toLowerCase() + '.</p><div class="mkx-li"><div><span>Salário</span><b>' + c.brl(p.wage) + '/sem</b></div><div><span>Contrato</span><b>até ' + (U.YEAR0 + co.season + p.ct) + '</b></div></div>' +
          '<span class="rs-gap"></span><span class="mkx-b"><button class="hl-btn gold" id="mkx-1">Fechar</button></span></div>', 'Renovado', x => { x.querySelector('#mkx-1').onclick = () => { sfx('tap'); closePop(); }; }, 'hl-pop mkx-pop', true); }
        re({}); };
      else if (go) go.onclick = () => { sfx('tap'); const r = S.coMktContract(co, p, t); c.save();
        if (r.k === 'signed') { sfx('win'); return fechado(r.p, R[t.role].t, neg.deal, p.club); }
        re({}); };
    });
  }
  // Fechado (31): CONTRATADO com o escudo do seu clube e de onde ele veio; nome grande, posição, papel e idade;
  // transferência, salário e contrato; Ver no time ou Mercado
  function fechado(np, papel, d, from) {
    const c = C(), co = c.co, me = club(co.club), fc = from && club(from);
    mercado();
    const fee = from && d ? c.brl(d.v) + (d.pay ? ' · ' + (d.pay + 1) + 'x' : '') : 'sem custo';
    pop('<div class="mkd"><div class="mkd-l"><small>CONTRATADO</small>' + crest(me.id, 'mkd-cr') + '<b>' + esc(me.short || me.name) + '</b><span>' + (fc ? 'chega do ' + esc(fc.short || fc.name) : 'estava sem clube') + '</span></div>' +
      '<div class="mkd-r"><b>' + esc(np.n) + '</b><span class="mkd-ch"><i>' + S.CO_POS_NM[np.pos] + '</i><i class="g">' + (papel === 'Titular' ? 'Titular prometido' : papel) + '</i><i class="l">' + np.age + ' anos</i></span>' +
        '<div class="mkx-li"><div><span>Transferência</span><b>' + fee + '</b></div><div><span>Salário</span><b>' + c.brl(np.wage) + '/sem</b></div><div><span>Contrato</span><b>até ' + (U.YEAR0 + co.season + np.ct) + '</b></div></div>' +
        '<span class="rs-gap"></span><span class="mkx-b"><button class="hl-btn gold" id="mkd-time">Ver no time</button><button class="hl-btn dark" id="mkd-mk">Mercado</button></span></div></div>', 'Contratado', w => {
      w.querySelector('#mkd-time').onclick = () => { sfx('tap'); closePop(); time(); };
      w.querySelector('#mkd-mk').onclick = () => { sfx('tap'); closePop(); mercado(); };
    }, 'hl-pop mkd-pop', true);
  }
  // ---------- vender (lote 4, quadros 32, 32b e 33) ----------
  const WISH = [['Tanto faz', ''], ['Ele quer ir', 'g'], ['Quer ficar', 'b']];
  const brlS = (c, v) => c.brl(v);
  // Proposta recebida (32): janelinha por cima da Semana ou do Elenco. r = resposta de uma rodada (counter, no, ok)
  function recebida(o, back, r) {
    const c = C(), co = c.co, f = S.coFin(co), bc = club(o.club), bn = esc(bc.short || bc.name);
    const p = (r && r.sale && r.sale.p) || co.squad.find(x => x.id === o.id); if (!p) return;
    const wi = WISH[o.wish || 0], w = S.coMktWin(co), dtx = w.k ? ' · DIA ' + w.day : '';
    const now = v => Math.ceil(v / ((o.pay || 0) + 1) / 1000) * 1000;
    let eb, ti, line, rows, btns;
    const payT = (pay, fut) => (pay ? (pay + 1) + 'x' : 'à vista') + (fut ? ' · ' + S.CO_MKT.futPct[fut] + '% futura' : '');
    if (r && r.k === 'ok') { const sl = r.sale;
      eb = 'VENDIDO · ' + bn.toUpperCase(); ti = 'Vendido por ' + brlS(c, sl.v); line = esc(last(p.n)) + ' vai para o ' + bn + '. ' + (sl.pay ? 'O resto entra a cada 4 rodadas.' : 'O dinheiro já está no caixa.') + ' Metade virou verba para contratar.';
      rows = [['Recebe agora', brlS(c, sl.now)], ['Caixa agora', brlS(c, f.caixa), 'up'], ['Verba agora', brlS(c, f.verba), 'up']];
      btns = [['Ver o elenco', 'gold', () => elenco()], ['Fechar', 'line', () => back()]];
    } else if (r && r.k === 'no') {
      eb = bn.toUpperCase() + dtx; ti = 'Desistiram'; line = 'A paciência acabou: o ' + bn + ' foi atrás de outro. ' + esc(last(p.n)) + ' fica.';
      rows = [['Você pediu', brlS(c, o.hist.filter(h => h[0] === 'voce').slice(-1)[0][1])], ['Última deles', brlS(c, o.v)], ['Caixa agora', brlS(c, f.caixa)]];
      btns = [['Voltar', 'dark', () => back()]];
    } else {
      const cnt = r && r.k === 'counter';
      eb = (cnt ? bn.toUpperCase() + ' · RESPOSTA' : 'PROPOSTA DO ' + bn.toUpperCase()) + dtx;
      ti = cnt ? 'Subiram para ' + brlS(c, o.v) : 'Querem o ' + esc(last(p.n));
      line = cnt ? 'Ainda dá para negociar: ' + U.D.plural(o.pat, 'contraproposta', 'contrapropostas') + ' antes de eles desistirem.' :
        o.wish === 1 ? 'Ele quer ir. Recusar baixa a moral dele por umas semanas.' : o.wish === 2 ? 'Ele quer ficar, e o elenco gosta dele.' : 'Dá para negociar: cada contraproposta gasta paciência deles.';
      rows = [['Oferta', brlS(c, o.v) + ' · ' + payT(o.pay, o.fut)], ['Caixa depois', brlS(c, f.caixa + now(o.v)), 'up'], ['Folha depois', '− ' + c.mi(p.wage) + '/sem', 'up']];
      btns = [['Aceitar', 'gold', () => { const x = S.coMktSellAccept(co, o); c.save(); sfx('win'); back(); recebida(o, back, x); }],
        ['Negociar', 'dark', () => negociar(o.id, back)],
        ['Recusar', 'line', () => { S.coMktSellReject(co, o); c.save(); back(); }]];
    }
    pop('<div class="mkr2"><div class="mkr2-p"><b class="mkr2-o">' + p.ovr + '</b><b>' + (p.num ? p.num + ' ' : '') + esc(last(p.n)) + '</b><span>' + S.CO_POS_NM[p.pos] + ' · ' + p.age + ' anos</span>' +
        ((co.xi || []).includes(p.id) ? '<span>titular</span>' : '<span>reserva</span>') + '<em class="' + wi[1] + '">' + wi[0] + '</em></div>' +
      '<div class="mkr2-r"><div class="mkr2-h">' + crest(o.club, 'mkr2-cr') + '<span><small>' + eb + '</small><b>' + ti + '</b></span></div><p>' + line + '</p>' +
        '<div class="mkx-li">' + rows.map(x => '<div><span>' + x[0] + '</span><b' + (x[2] ? ' class="' + x[2] + '"' : '') + '>' + x[1] + '</b></div>').join('') + '</div>' +
        '<span class="rs-gap"></span><span class="mkr2-b n' + btns.length + '">' + btns.map((b, i) => '<button class="hl-btn ' + b[1] + '" data-rb="' + i + '">' + b[0] + '</button>').join('') + '</span></div></div>', 'Proposta recebida', x => {
      x.querySelectorAll('[data-rb]').forEach(b => b.onclick = () => { sfx('tap'); closePop(); btns[+b.dataset.rb][2](); });
    }, 'hl-pop mkr2-pop', true);
  }
  // Negociar a venda (32b): a conversa em rodadas, o pedido com ◀ ▶ e 3 atalhos, pagamento e % de venda futura;
  // o diretor deles reage a cada toque e tem 3 de paciência
  function negociar(id, back, t) {
    const c = C(), co = c.co, f = S.coFin(co), M = S.CO_MKT, o = (S.coMkt(co).inc || []).find(x => x.id === id && x.st === 'open'), p = co.squad.find(x => x.id === id);
    if (!o || !p) return back();
    const bc = club(o.club), bn = esc(bc.short || bc.name), mid = Math.round(o.v0 * 1.25 / 10000) * 10000, hi = Math.round(o.v0 * 1.6 / 10000) * 10000;
    const cuts = [o.v, Math.max(o.v + 10000, mid), Math.max(o.v + 20000, hi)];
    t = t || { v: cuts[1], pay: o.pay || 0, fut: 0 };
    const step = t.v >= 2e6 ? 100000 : t.v >= 500000 ? 50000 : 10000;
    const md = S.coMktSellMood(co, o, t), cls = ['', 'dn', 'dn', 'mid', 'up'][md.lvl], acc = t.v <= o.v;
    const now = Math.ceil(t.v / (t.pay + 1) / 1000) * 1000;
    const hist = o.hist.slice(-4).map(h => '<i class="' + (h[0] === 'voce' ? 'me' : '') + '">' + (h[0] === 'voce' ? 'Você ' : 'Eles ') + c.mi(h[1]) + '</i>').join('<em>›</em>');
    const seg = (on, tx, attr) => '<button class="' + (on ? 'on' : '') + '" ' + attr + '>' + tx + '</button>';
    show('<div class="mk mkp mkn">' + mkHead('mkn-back', 'Negociar', esc(p.n) + ' · ' + S.CO_POS_NM[p.pos] + ' · para o ' + bn) +
      '<div class="mk-k mkn-h"><small>CONVERSA</small>' + hist + '</div>' +
      '<div class="mkp-l"><div class="mk-k mkp-v"><small>VOCÊ PEDE</small><span class="mkp-row"><button class="mk-ar big" data-nv="-1" aria-label="Menos">' + MK_L + '</button><b>' + c.brl(t.v) + '</b><button class="mk-ar big" data-nv="1" aria-label="Mais">' + MK_R + '</button></span>' +
        '<span class="mkp-cuts">' + ['O deles', 'Meio', 'Alto'].map((x, i) => seg(t.v === cuts[i], x + ' · ' + c.mi(cuts[i]), 'data-nc="' + i + '"')).join('') + '</span></div>' +
        '<div class="mkp-g"><div class="mk-k"><small>PAGAMENTO</small><span class="mkp-seg">' + ['À vista', '2x', '3x'].map((x, i) => seg(t.pay === i, x, 'data-np="' + i + '"')).join('') + '</span></div>' +
          '<div class="mk-k"><small>% DE UMA VENDA FUTURA</small><span class="mkp-seg">' + M.futPct.map((x, i) => seg(t.fut === i, x + '%', 'data-nf="' + i + '"')).join('') + '</span></div></div></div>' +
      '<div class="mk-side"><div class="mk-k mkp-pr"><small>DIRETOR DO ' + bn.toUpperCase() + '</small><b class="' + cls + '">' + md.t + '</b><span class="mkf-dd mkc-dd">' + [1, 2, 3, 4].map(k => '<i class="' + (k <= md.lvl ? cls || 'up' : '') + '"></i>').join('') + '</span><span class="mkp-pat">Paciência' + mkDots(o.pat, M.sellPat) + '</span></div>' +
        '<div class="mk-k mkf-li"><div><span>' + (t.pay ? 'Agora · ' + (t.pay + 1) + 'x' : 'Recebe agora') + '</span><b class="up">' + c.brl(now) + '</b></div><div><span>Verba ganha</span><b class="up">' + c.brl(Math.round(now * M.sellVerba)) + '</b></div></div>' +
        '<span class="rs-gap"></span><button class="tm-go" id="mkn-go">' + (acc ? 'Aceitar o deles' : 'Contrapropor') + '</button></div></div>', st => {
      const re = x => negociar(id, back, Object.assign({}, t, x));
      st.querySelector('#mkn-back').onclick = () => { sfx('tap'); back(); recebida(o, back); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Peça um valor e mande a contraproposta. O diretor deles tem um teto escondido: abaixo dele, aceita; acima, sobe um pouco ou, sem paciência, desiste. Pedir à vista ou uma % alta de uma venda futura deixa mais difícil. A venda entra no caixa e metade vira verba para contratar.'); };
      st.querySelectorAll('[data-nv]').forEach(b => b.onclick = () => { sfx('tap'); re({ v: Math.max(o.v, t.v + step * (+b.dataset.nv)) }); });
      st.querySelectorAll('[data-nc]').forEach(b => b.onclick = () => { sfx('tap'); re({ v: cuts[+b.dataset.nc] }); });
      st.querySelectorAll('[data-np]').forEach(b => b.onclick = () => { sfx('tap'); re({ pay: +b.dataset.np }); });
      st.querySelectorAll('[data-nf]').forEach(b => b.onclick = () => { sfx('tap'); re({ fut: +b.dataset.nf }); });
      st.querySelector('#mkn-go').onclick = () => { sfx('tap');
        const r = acc ? S.coMktSellAccept(co, o) : S.coMktSellTry(co, o, t.v, t.pay, t.fut); c.save();
        if (r.k === 'ok') sfx('win');
        if (r.k === 'counter') { negociar(id, back, Object.assign({}, t)); return recebida(o, () => negociar(id, back, t), r); }
        back(); recebida(o, back, r); };
    });
  }
  // Propostas novas na volta para a semana: uma janelinha por vez
  function inboxPop(co, back) {
    const o = S.coMktInbox(co).find(x => !x.seen); if (!o) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; o.seen = 1; C().save(); recebida(o, back); }, 80); return true;
  }
  // Finanças deitada: abas num array (a thread de mercado e finanças vai acrescentar "Decidir")
  const FIN_TABS = [
    { k: 'dec', t: 'Decidir', html: (c, co, f) => finDecidir(c, co, f) },
    { k: 'tmp', t: 'Temporada', html: (c, co, f) => { const x = f.ss, ss = co.ss, homes = ss ? ss.log.filter(l => l.home).length : 0, big = Math.max(x.bil, x.tv, x.pat, x.sal, x.comp, x.prem, x.vend, 1);
      const row = (t, v, neg) => '<div class="ldf-li"><span>' + t + '</span><i><u class="' + (neg ? 'dn' : 'up') + '" style="width:' + Math.round(100 * Math.min(1, v / big)) + '%"></u></i><b class="' + (neg ? 'dn' : 'up') + '">' + (v ? (neg ? '− ' : '+ ') + c.mi(v) : '0') + '</b></div>';
      const saldo = x.bil + x.tv + x.pat + x.prem + x.vend - x.sal - x.comp;
      return row('Bilheteria · ' + U.D.plural(homes, 'jogo', 'jogos') + ' em casa', x.bil) + row('Cota de TV', x.tv) + row('Patrocínio', x.pat) + (x.prem ? row('Prêmios', x.prem) : '') + (x.vend ? row('Vendas', x.vend) : '') +
        row('Salários', x.sal, 1) + row('Contratações', x.comp, 1) + '<div class="ldf-li tot"><span>Saldo até agora</span><b class="' + (saldo >= 0 ? 'up' : 'dn') + '">' + c.sgn(saldo) + '</b></div>'; } },
    { k: 'seg', t: 'A seguir', html: (c, co) => S.coFinNext(co).map(n => '<div class="ldf-li"><span>' + esc(n.txt) + '</span><b>' + (n.aprox ? '~ ' : '') + c.mi(n.v) + '</b></div>').join('') || '<p class="ld-none">A temporada acabou.</p>' },
    { k: 'sal', t: 'Salários', html: (c, co) => co.squad.slice().sort((a, b) => b.wage - a.wage).slice(0, 7).map(p => '<div class="ldf-li"><span><b>' + esc(p.n) + '</b> · ' + p.pos + ' · ' + p.age + ' anos</span><b>' + c.mi(p.wage) + '<small> até ' + (U.YEAR0 + co.season + p.ct) + '</small></b></div>').join('') },
  ];
  // Finanças enxuta (2026-11-09, quadro 20): 3 números grandes, abas Temporada/A seguir/Salários, à direita a situação
  // do caixa, o acordo, o patrocínio e o dourado Banco. A aba Decidir saiu (acordo e patrocínio ficam à direita)
  const FIN_STEP = [['tranquilo', 'o caixa aguenta'], ['aviso', 'menos de 4 semanas de folha'], ['no vermelho', 'proibido contratar com taxa'], ['venda forçada', 'o presidente vende o mais caro'], ['ultimato', 'a confiança cai o dobro']];
  function financas(tab) {
    const c = C(), co = c.co, f = S.coFin(co), folha = S.coFolha(co), wk = S.coFinSemanas(co), pct = Math.min(100, Math.round(100 * folha / Math.max(1, f.teto)));
    const step = S.coFinStep(co), P = S.coPres(co), pt = f.pat;
    tab = ['tmp', 'seg', 'sal'].indexOf(tab) >= 0 ? tab : 'tmp';
    const li = (t, v, cls) => '<div class="fn2-li"><span>' + t + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    let rows = '';
    if (tab === 'tmp') { const x = f.ss, homes = co.ss ? co.ss.log.filter(l => l.home).length : 0, sg = v => (v ? '+ ' + c.mi(v) : '0'), sn = v => (v ? '− ' + c.mi(v) : '0');
      const saldo = x.bil + x.tv + x.pat + x.prem + x.vend - x.sal - x.comp;
      rows = li('Bilheteria · ' + U.D.plural(homes, 'jogo', 'jogos') + ' em casa', sg(x.bil), 'up') + li('TV e patrocínio', sg(x.tv + x.pat), 'up') + (x.prem ? li('Prêmios', sg(x.prem), 'up') : '') + (x.vend ? li('Vendas', sg(x.vend), 'up') : '') +
        li('Salários', sn(x.sal), 'dn') + (x.comp ? li('Contratações', sn(x.comp), 'dn') : '') + li('<b>Saldo</b>', c.sgn(saldo), saldo >= 0 ? 'up' : 'dn'); }
    else if (tab === 'seg') rows = S.coFinNext(co).map(n => li(esc(n.txt), (n.aprox ? '~ ' : '') + c.mi(n.v))).join('') || '<p class="fn2-none">A temporada acabou.</p>';
    else rows = co.squad.slice().sort((a, b) => b.wage - a.wage).slice(0, 8).map(p => li(esc(p.n) + ' <small>' + p.pos + '</small>', c.mi(p.wage) + ' <small>até ' + (U.YEAR0 + co.season + p.ct) + '</small>')).join('');
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    show('<div class="fn2"><div class="tm-h"><button class="tcr-back" id="ldf-back" aria-label="Voltar">' + BK + '</button><b>Finanças</b><small>' + esc(club(co.club).short || club(co.club).name) + ' · ' + (U.YEAR0 + co.season) + '</small></div>' +
      '<div class="fn2-k"><div><small>CAIXA</small><b class="' + (f.caixa < 0 ? 'dn' : '') + '">' + c.brl(f.caixa) + '</b><span>' + (f.caixa < 0 ? 'no vermelho' : U.D.plural(wk, 'semana', 'semanas') + ' de folha') + '</span></div>' +
        '<div><small>VERBA</small><b class="up">' + c.brl(f.verba) + '</b><span>para contratar</span></div>' +
        '<div><small>FOLHA</small><b>' + c.brl(folha) + '</b><i><u class="' + (pct > 95 ? 'low' : pct > 85 ? 'mid' : 'ok') + '" style="width:' + pct + '%"></u></i><span>teto ' + c.brl(f.teto) + '</span></div></div>' +
      '<div class="fn2-tabs">' + [['tmp', 'Temporada'], ['seg', 'A seguir'], ['sal', 'Salários']].map(([k, t]) => '<button data-ft="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
      '<div class="fn2-p">' + rows + '</div>' +
      '<div class="fn2-side"><div class="fn2-st"><small>SITUAÇÃO DO CAIXA</small><b class="s' + step + '">' + FIN_STEP[step][0] + '</b><span class="fn2-dd">' + [1, 2, 3, 4].map(i => '<i class="' + (i <= step ? 'on' : '') + '"></i>').join('') + '</span><em>' + FIN_STEP[step][1] + '</em></div>' +
        '<div class="fn2-ac"><button data-fd="pres"><span>Acordo</span><b>' + (AC_NM[f.ac] || 'Normal').toLowerCase() + '</b></button><div><span>' + (pt && patImg(pt.name, 'fn2-lg', 1) || 'Patrocínio') + '</span><b>' + (pt ? c.brl(pt.fix) : 'a escolher') + '</b></div></div>' +
        '<span class="rs-gap"></span><div class="fn2-bt">' + (U.COINS ? '<button class="tm-b fn2-apo" data-fd="apo" id="fn2-apo">' + U.COINS.svg + 'Aporte</button>' : '') + '<button class="tm-go" data-fd="banco" id="fn2-bank">Banco</button></div></div></div>', st => {
      st.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { sfx('tap'); financas(b.dataset.ft); });
      st.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.fd; if (k === 'banco') banco(); else if (k === 'pres') presInfo(); else if (k === 'apo') loja(1, () => financas(tab)); });
      st.querySelector('#ldf-back').onclick = () => { sfx('tap'); clube(); };
    });
  }
  // ---------- Finanças 2.0: reunião com a diretoria, patrocínio, banco e a aba Decidir ----------
  const AC_NM = { seguro: 'Seguro', normal: 'Normal', ousado: 'Ousado' };
  const RED_TXT = r => r >= 1.4 ? 'muito' : r >= 1 ? 'médio' : 'pouco';
  const goalLine = (k, pos) => k === 'titulo' ? 'ser campeão' : 'terminar até o ' + ord(pos);
  function finDecidir(c, co, f) {
    const P = S.coPres(co), B = co.board, pt = f.pat, step = S.coFinStep(co), max = S.coLoanMax(co);
    const STEP = ['Tranquilo: o caixa aguenta', 'Aviso: menos de 4 semanas de folha no caixa', 'No vermelho: proibido contratar com taxa', 'O presidente vai vender o mais caro', 'Ultimato: a diretoria perde a paciência rápido'];
    const r = (k, t, sub, right, cls) => '<button class="ldn-r' + (cls ? ' ' + cls : '') + '"' + (k ? ' data-fd="' + k + '"' : ' disabled') + '><span><b>' + t + '</b><small>' + sub + '</small></span>' + (right || '') + (k ? CHEV : '') + '</button>';
    const news = (f.news || []).filter(x => x.s === co.season).slice(0, 2);
    return news.map(x => '<div class="ldn-news">' + esc(x.t) + '<small>rodada ' + x.r + '</small></div>').join('') +
      r('pres', 'Acordo ' + (AC_NM[f.ac] || 'Normal').toLowerCase() + ' com ' + esc(P.n), 'meta: ' + goalLine(B.goal.k, B.goal.pos) + ' · presidente ' + P.nome, '') +
      r('', pt ? 'Patrocínio ' + esc(patName(pt.name)) : 'Patrocínio', pt ? c.brl(pt.fix) + ' no ano' + (pt.bonus ? ' + ' + c.brl(pt.bonus) + ' se cumprir a meta' : '') + (pt.until > co.season ? ' · até ' + (U.YEAR0 + pt.until) : '') : 'a escolher antes do primeiro jogo', '') +
      r('banco', 'Banco', f.loan ? 'faltam ' + U.D.plural(f.loan.n, 'parcela', 'parcelas') + ' de ' + c.brl(f.loan.parc) + ' · deve ' + c.brl(f.loan.rem) : 'sem empréstimo · pode pegar até ' + c.brl(max), '') +
      r('banco', 'Situação do caixa', STEP[step], '<span class="ldn-steps">' + [1, 2, 3, 4].map(i => '<i class="' + (i < step ? 'd' : i === step ? 'c' : '') + '"></i>').join('') + '</span>', step >= 2 ? 'bad' : '');
  }
  function presInfo() {
    const co = C().co, P = S.coPres(co);
    pop(popHead(esc(P.n), 'Presidente · ' + P.nome) + '<div class="ld-pb col">' + presFace(P, 'pi-fc') + '<p class="ldn-p">' + esc(P.txt) + '</p><p class="ldn-p">O caixa no vermelho pesa <b>' + RED_TXT(P.red) + '</b> na confiança dele. A cada 3 temporadas tem eleição e ele pode sair.</p></div>', 'Presidente', null, 'w560');
  }
  // Reunião de pré-temporada: 3 acordos de verba × meta. welcome: primeira conversa no clube novo
  // Reunião e patrocínio enxutos (2026-11-08, Silvio: sem trilho nem coluna, mas "um pouquinho mais de informação pra
  // análise"): o presidente numa frase, 3 cartões com nome, valor grande e 3 linhas de números; as regras no botão ?
  const acdRow = (k, v) => '<span class="acd-r"><small>' + k + '</small><b>' + v + '</b></span>';
  const acdHelp = (t, lines) => pop('<div class="acd-help"><b>' + t + '</b>' + lines.map(l => '<p>' + l + '</p>').join('') + '<button class="hl-btn line" data-pop-x>Entendi</button></div>', t, null, 'hl-pop acd-pop');
  const acdShow = (top, cards, cta, bind) => show('<div class="acd"><div class="acd-top">' + top + '<button class="acd-q" id="acd-q" aria-label="Como funciona">?</button></div>' +
    '<div class="acd-g">' + cards + '</div><button class="acd-go" id="ldn-go">' + cta + '</button></div>', bind);
  function reuniao(sel, welcome) {
    const c = C(), co = c.co, f = S.coFin(co), P = S.coPres(co), ops = S.coFinAcordos(co);
    sel = sel || 'normal'; const o = ops.find(x => x.k === sel) || ops[0];
    const hi = { amb: 'Quero esse time brigando lá em cima. Se você topar, eu abro o cofre.', pao: 'Dinheiro não cai do céu. Me diga o que você entrega e eu digo quanto libero.', pac: 'Sem pressa e sem loucura. Me diga o que dá para fazer e a gente acerta.' }[P.k];
    const FAMA = { seguro: 'vale menos', normal: 'normal', ousado: 'vale mais' };
    const card = x => '<button class="acd-c' + (x.k === sel ? ' on' : '') + '" data-ac="' + x.k + '" aria-pressed="' + (x.k === sel) + '">' + (x.k === 'ousado' ? '<i class="acd-tag or">ARRISCADA</i>' : '') +
      '<b>' + AC_NM[x.k] + '</b><em>' + c.brl(x.verba) + '</em><small class="acd-u">para contratar</small>' +
      acdRow('Meta', x.gk === 'titulo' ? 'campeão' : 'até ' + ord(x.pos)) + acdRow('Teto da folha', c.brl(x.teto)) + acdRow('Fama na meta', FAMA[x.k]) + '</button>';
    acdShow(presFace(P, 'acd-av') + '<div class="acd-say"><small>' + esc(P.n) + ' · presidente ' + P.nome + '</small><p>' + (welcome ? 'Bem-vindo, professor. ' : '') + hi + '</p></div>',
      ops.map(card).join(''), 'Fechar o acordo', st => {
        st.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => { sfx('tap'); reuniao(b.dataset.ac, welcome); });
        st.querySelector('#acd-q').onclick = () => { sfx('tap'); acdHelp('Como funciona', ['Quanto mais verba para contratar, mais alta a meta e o teto da folha.', 'Bater a meta no azul aumenta a verba e o teto do ano seguinte.',
          'Seguro: a diretoria começa desconfiada. Ousado: cumprir dá mais fama, falhar tira fama.', 'Este presidente é ' + P.nome + ': ' + esc(P.txt.charAt(0).toLowerCase() + P.txt.slice(1)) + ' Caixa no vermelho pesa ' + RED_TXT(P.red) + ' para ele.']); };
        st.querySelector('#ldn-go').onclick = () => { sfx('tap'); S.coFinAcordo(co, o.k); c.save('hub'); if (f.pend && f.pend.pat) patrocinio(null, welcome); else { f.pend = null; c.save('hub'); welcome ? time(false) : semana(); } };
      });
  }
  function patrocinio(sel, welcome) {
    const c = C(), co = c.co, f = S.coFin(co), ops = S.coFinPatOps(co), n = co.ss ? co.ss.rounds.length : 38;
    sel = sel || 'fix'; const o = ops.find(x => x.k === sel) || ops[0];
    const card = x => '<button class="acd-c' + (x.k === sel ? ' on' : '') + '" data-pt="' + x.k + '" aria-pressed="' + (x.k === sel) + '">' +
      (x.k === 'mix' ? '<i class="acd-tag or">ARRISCADA</i>' : x.k !== 'fix' ? '<i class="acd-tag bl">TRAVADO</i>' : '') +
      (patImg(x.name, 'acd-lg') || '<b>' + esc(x.name) + '</b>') + '<em>' + c.brl(x.fix) + '</em><small class="acd-u">' + (x.yrs > 1 ? 'por ano' : 'no ano') + '</small>' +
      acdRow('Por rodada', c.brl(Math.round(x.fix / n))) + acdRow('Bônus na meta', x.bonus ? '+ ' + c.brl(x.bonus) : 'não tem') + acdRow('Duração', x.yrs > 1 ? x.yrs + ' temporadas' : '1 temporada') + '</button>';
    acdShow('<div class="acd-say solo"><small>Patrocínio da camisa · ' + (U.YEAR0 + co.season) + '</small><p>Três marcas querem a sua camisa. Escolha uma.</p></div>',
      ops.map(card).join(''), 'Assinar com ' + esc(o.name.split(' ')[0]), st => {
        st.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { sfx('tap'); patrocinio(b.dataset.pt, welcome); });
        st.querySelector('#acd-q').onclick = () => { sfx('tap'); acdHelp('Como funciona', ['O dinheiro entra no caixa toda rodada.', 'Com bônus: o fixo é menor, mas no fim do ano entra o bônus se você cumprir a meta da diretoria.',
          'Travado: o valor não muda pelos anos do contrato, suba ou caia o clube.', 'Sua fama traz propostas melhores. Hoje: fama ' + co.fame + '.']); };
        st.querySelector('#ldn-go').onclick = () => { sfx('tap'); S.coFinPatrocinio(co, o.k); f.pend = null; c.save('hub'); welcome ? time(false) : semana(); };
      });
  }
  // Banco enxuto (2026-11-09, quadro 21): o valor grande com ◀ ▶, juros, parcela e total; os degraus do vermelho no ?
  function banco(amt) {
    const c = C(), co = c.co, f = S.coFin(co), step = S.coFinStep(co), max = S.coLoanMax(co), L = f.loan;
    const ST = ['A diretoria avisa (caixa abaixo de 4 semanas de folha)', 'No vermelho: proibido contratar com taxa', 'Com 6 rodadas no vermelho, o presidente vende o mais caro', 'Com 8, ultimato: a confiança cai o dobro'];
    const steps = max ? [0.25, 0.5, 0.75, 1].map(k => Math.round(max * k / 10000) * 10000).filter((v, i, a) => v > 0 && a.indexOf(v) === i) : [];
    amt = steps.indexOf(amt) >= 0 ? amt : (steps[1] || steps[0] || 0);
    const i = steps.indexOf(amt), parc = amt ? S.coLoanParc(amt) : 0;
    const li = (t, v, cls) => '<div class="fn2-li"><span>' + t + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const left = L ? '<div class="bk2-top"><span><small>VOCÊ DEVE</small><b>' + c.brl(L.rem) + '</b></span></div><div class="bk2-li">' + li('Parcela', c.brl(L.parc)) + li('Parcelas que faltam', L.n) + li('Quitar antes', 'sem multa') + '</div>'
      : steps.length ? '<div class="bk2-top"><button class="pl2-ar" data-ai="-1" aria-label="Menos"' + (i > 0 ? '' : ' disabled') + '>◀</button><span><small>EMPRÉSTIMO</small><b>' + c.brl(amt) + '</b></span><button class="pl2-ar" data-ai="1" aria-label="Mais"' + (i < steps.length - 1 ? '' : ' disabled') + '>▶</button></div>' +
        '<div class="bk2-li">' + li('Juros', '2% ao mês') + li('12 parcelas de', c.brl(parc)) + li('Total a pagar', c.brl(parc * 12), 'dn') + '</div>'
      : '<p class="fn2-none">O banco não empresta agora.</p>';
    const side = L ? '<div class="fn2-st"><small>CAIXA</small><b class="' + (f.caixa < 0 ? 's3' : '') + '">' + c.brl(f.caixa) + '</b><em>' + (f.caixa >= L.rem ? 'dá para quitar hoje' : 'parcela a cada 4 rodadas') + '</em></div><span class="rs-gap"></span>' +
        (f.caixa >= L.rem ? '<button class="tm-b" id="ldn-back">Agora não</button><button class="tm-go" id="ldn-pay">Quitar ' + c.brl(L.rem) + '</button>' : '<button class="tm-go" id="ldn-back">Voltar</button>')
      : '<div class="fn2-st"><small>VOCÊ DEVE</small><b>nada</b><em>' + (max ? 'pode pegar até ' + c.brl(max) : 'sem crédito agora') + '</em></div><span class="rs-gap"></span><button class="tm-b" id="ldn-back">Agora não</button>' +
        (amt ? '<button class="tm-go" id="ldn-take">Pegar ' + c.brl(amt) + '</button>' : '');
    show('<div class="bk2"><div class="tm-h"><button class="tcr-back" id="ldn-bk" aria-label="Voltar">' + BK + '</button><img class="bk2-lg" src="' + CO_ART + 'banco-esc.webp" alt="Banco Alicerce"><small>caixa ' + c.brl(f.caixa) + (f.neg ? ' · ' + U.D.plural(f.neg, 'rodada', 'rodadas') + ' no vermelho' : '') + '</small><button class="ol2-q" id="bk2-q" aria-label="Como funciona">?</button></div>' +
      '<div class="bk2-box">' + left + '</div><div class="fn2-side">' + side + '</div></div>', st => {
      st.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => { sfx('tap'); banco(steps[Math.max(0, Math.min(steps.length - 1, i + +b.dataset.ai))]); });
      const tk = st.querySelector('#ldn-take'); if (tk) tk.onclick = () => { if (S.coLoanTake(co, amt)) { sfx('tap'); c.save('hub'); banco(); } };
      const py = st.querySelector('#ldn-pay'); if (py) py.onclick = () => { if (S.coLoanPay(co)) { sfx('tap'); c.save('hub'); banco(); } };
      st.querySelectorAll('#ldn-bk, #ldn-back').forEach(b => b.onclick = () => { sfx('tap'); financas(); });
      st.querySelector('#bk2-q').onclick = () => { sfx('tap'); pop('<div class="acd-help"><b>Se o caixa ficar no vermelho</b><ol class="bk2-ol">' + ST.map((t, k) => '<li' + (k + 1 === step ? ' class="on"' : '') + '>' + t + (k + 1 === step ? ' · <b>agora</b>' : '') + '</li>').join('') + '</ol><p>Parcela a cada 4 rodadas. Quitar antes não tem multa. Também dá para vender alguém quando o mercado chegar.</p><button class="hl-btn line" data-pop-x>Entendi</button></div>', 'Como funciona', null, 'hl-pop acd-pop tm-pop'); };
    });
  }
  // Aviso do que aconteceu no caixa (venda forçada, eleição) na volta para a semana
  function finNews(co) {
    const f = co.fin; if (!f || !f.news || !f.news.length) return;
    const x = f.news[0]; if (x.seen) return;
    x.seen = true;
    setTimeout(() => pop(popHead('Aviso da diretoria', 'Rodada ' + x.r) + '<div class="ld-pb col"><p class="ldn-p">' + esc(x.t) + '</p><button class="ld-gold sm" id="ldn-ok"><b>Entendi</b></button></div>', 'Aviso da diretoria', w => { w.querySelector('#ldn-ok').onclick = () => { sfx('tap'); closePop(); }; }, 'w560'), 60);
  }

  // Elenco e contratos: o elenco inteiro numa tabela (os seus números aparecem: é o seu time)
  // Elenco enxuto (Silvio 2026-11-09, quadro 27): sem trilho; abas por setor; linha com número, nome, posição, idade,
  // geral e contrato (laranja no último ano), a tabela rola por dentro; o cartão à direita com energia, potencial, moral,
  // salário e o contrato com Renovar (a renovação chega com o mercado: `#lde-ren` com data-id fica apagado até lá)
  function elenco(tab, sel) {
    const c = C(), co = c.co, T = [['Goleiros', ['GOL']], ['Defesa', ['ZAG', 'LAT']], ['Meio', ['MEI']], ['Ataque', ['ATA']]];
    tab = tab || 0; if (S.coNums) S.coNums(co.squad); // os mesmos números do campinho
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const L = co.squad.filter(p => T[tab][1].includes(p.pos)).sort((a, b) => b.ovr - a.ovr);
    const q = L.find(p => p.id === sel) || L[0];
    const folha = co.squad.reduce((a, p) => a + (p.wage || 0), 0);
    const ctT = n => n <= 0 ? 'acaba agora' : n === 1 ? 'fim do ano' : U.D.plural(n, 'ano', 'anos');
    const tag = p => p.out ? ['dn', 'lesionado'] : p.sus ? ['dn', 'suspenso'] : c.pend(p) ? ['y', 'pendurado'] : S.coMktListed(co, p) ? ['g', 'à venda'] : null;
    const rows = L.map(p => { const t = tag(p);
      return '<button class="lde2-r' + (q && p.id === q.id ? ' on' : '') + (c.avail(p) ? '' : ' out') + '" data-id="' + p.id + '"><i>' + (p.num || '') + '</i><span><b>' + esc(p.n) + '</b><small>' + p.pos + '</small>' + (t ? '<em class="' + t[0] + '">' + t[1] + '</em>' : '') + '</span>' +
        '<span class="a">' + p.age + '</span><span class="o">' + p.ovr + '</span><span class="ct' + (p.ct <= 1 ? ' dn' : '') + '">' + ctT(p.ct) + '</span></button>'; }).join('');
    let card = '';
    if (q) {
      const mo = q.mo === undefined ? 60 : q.mo, moT = mo >= 70 ? 'alta' : mo >= 45 ? 'boa' : 'baixa';
      const st = (k, v, bad) => '<span><small>' + k + '</small><b' + (bad ? ' class="dn"' : '') + '>' + v + '</b></span>';
      const renOk = S.coMktRenOk(co, q), listed = S.coMktListed(co, q), canS = S.coMktCanSell(co, q), ofq = S.coMktOfferFor(co, q), win = S.coMktWin(co);
      const hint = ofq ? 'O ' + esc(club(ofq.club).short || club(ofq.club).name) + ' fez proposta' : listed ? (win.open ? 'À venda: as propostas chegam na janela' : 'À venda: propostas na próxima janela') : !canS ? 'Elenco curto nessa posição para vender' : q.ct <= 1 ? 'Último ano: renove ou ele pode sair' : '';
      card = '<div class="lde2-c"><div class="lde2-ch"><b class="tm-ring ' + enRing(q.en) + '" style="--en:' + Math.round(q.en) + '">' + q.ovr + '</b><span><b>' + (q.num ? q.num + ' ' : '') + esc(c.last(q.n)) + '</b><small>' + c.posTxt[q.pos] + ' · ' + q.age + ' anos</small></span></div>' +
        '<div class="lde2-st">' + st('ENERGIA', Math.round(q.en) + '%', q.en < 55) + st('POTENCIAL', q.pot) + st('MORAL', moT, moT === 'baixa') + st('SALÁRIO', c.mi(q.wage) + '/sem') + '</div>' +
        '<div class="lde2-ct"><span><small>CONTRATO</small><b' + (q.ct <= 1 ? ' class="dn"' : '') + '>' + ctT(q.ct) + '</b></span></div>' +
        '<div class="lde2-act"><button class="lde2-ren" id="lde-ren" data-id="' + q.id + '"' + (renOk ? '' : ' disabled') + '>Renovar' + (renOk ? '' : '<small>no fim do contrato</small>') + '</button>' +
          (ofq ? '<button class="lde2-sell of" id="lde-of">Ver proposta</button>' : '<button class="lde2-sell' + (listed ? ' on' : '') + '" id="lde-sell"' + (canS || listed ? '' : ' disabled') + '>' + (listed ? 'Tirar da venda' : 'Pôr à venda') + '</button>') + '</div>' +
        '<small class="lde2-hint">' + hint + '</small></div>';
    }
    show('<div class="lde2"><div class="tm-h"><button class="tcr-back" id="lde-back" aria-label="Voltar">' + BK + '</button><b>Elenco</b><small>' + U.D.plural(co.squad.length, 'jogador', 'jogadores') + ' · folha ' + c.mi(folha) + '/sem</small></div>' +
      '<div class="lde2-tabs">' + T.map(([l, ps], i) => '<button data-et="' + i + '"' + (i === tab ? ' class="on"' : '') + '>' + l + ' <small>' + co.squad.filter(p => ps.includes(p.pos)).length + '</small></button>').join('') + '</div>' +
      '<div class="lde2-l"><div class="lde2-h"><i></i><span>JOGADOR</span><span class="a">IDADE</span><span class="o">GERAL</span><span class="ct">CONTRATO</span></div>' + rows + '</div>' + card + '</div>', st => {
      st.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { sfx('tap'); elenco(+b.dataset.et); });
      st.querySelectorAll('.lde2-r').forEach(b => b.onclick = () => { sfx('tap'); const y = st.querySelector('.lde2-l').scrollTop; elenco(tab, b.dataset.id); const l = document.querySelector('.lde2-l'); if (l) l.scrollTop = y; });
      st.querySelector('#lde-back').onclick = () => { sfx('tap'); clube(); };
      const me = () => elenco(tab, q && q.id);
      const rn = st.querySelector('#lde-ren:not([disabled])'); if (rn) rn.onclick = () => { sfx('tap'); contrato(q.id, me); };
      const sl = st.querySelector('#lde-sell:not([disabled])'); if (sl) sl.onclick = () => { sfx('tap'); const of = S.coMktList(co, q, !S.coMktListed(co, q)); c.save(); me(); if (of) { of.seen = 1; c.save(); recebida(of, me); } };
      const ov = st.querySelector('#lde-of'); if (ov) ov.onclick = () => { sfx('tap'); recebida(S.coMktOfferFor(co, q), me); };
    });
  }
  function trofeus() {
    const c = C(), co = c.co;
    pop(popHead('Sala de troféus', co.titles.length ? 'O que você ganhou como técnico.' : 'Ainda vazia. O primeiro título entra aqui.') + '<div class="ld-pb col"><div class="ld-scroll">' +
      (co.titles.length ? co.titles.map(t => '<div class="ld-cand">' + crest(t.club, 'ld-cr') + '<span><b>' + esc(t.name) + '</b><small>' + (U.YEAR0 + t.s) + ' · ' + esc(club(t.club).name) + '</small></span></div>').join('') : '<p class="ld-none">Nenhum título por enquanto.</p>') + '</div></div>', 'Sala de troféus', null, 'w560');
  }
  function hall() {
    const c = C(), co = c.co;
    pop(popHead('Hall do técnico', esc(co.name) + ' · fama ' + co.fame + ' (' + c.FAME_TXT(co.fame) + ')') + '<div class="ld-pb col"><div class="ld-scroll">' +
      (co.hist.length ? co.hist.slice().reverse().map(h => '<div class="ld-cand">' + crest(h.club, 'ld-cr') + '<span><b>' + (U.YEAR0 + h.s) + ' · ' + esc(club(h.club).short || club(h.club).name) + ' · ' + h.pos + 'º</b><small>' + esc(h.league) + (h.won ? ' · campeão' : h.up ? ' · subiu' : h.down ? ' · caiu' : '') + (h.sacked ? ' · demitido' : h.met ? ' · meta cumprida' : ' · meta não cumprida') + '</small></span></div>').join('') : '<p class="ld-none">A primeira temporada ainda está em andamento.</p>') + '</div></div>', 'Hall do técnico', null, 'w560');
  }

  // ---------- Fim da temporada deitado (41): o lugar, a meta, os números do ano, os destaques e o que vem ----------
  function temporada(out) {
    const c = C(), co = c.co, cl = club(out.club), log = out.log || [], df = out.fame[1] - out.fame[0];
    const head = out.sacked ? 'Demitido' : out.won ? 'Campeão!' : out.up ? ord(out.pos) + ' lugar' : ord(out.pos) + ' lugar';
    const tag = out.sacked ? 'SAIU NO MEIO DO CAMINHO' : out.won ? 'TÍTULO DA ' + esc(out.league).toUpperCase() : out.up ? 'ACESSO' : out.down ? 'REBAIXADO' : out.met ? 'META CUMPRIDA' : 'META NÃO CUMPRIDA';
    const n = log.length, v = log.filter(l => l.res === 'v').length, e = log.filter(l => l.res === 'e').length, d = n - v - e;
    const gp = log.reduce((a, l) => a + l.gf, 0), gc = log.reduce((a, l) => a + l.ga, 0);
    const rec = L => { const vv = L.filter(l => l.res === 'v').length, ee = L.filter(l => l.res === 'e').length; return vv + 'V ' + ee + 'E ' + (L.length - vv - ee) + 'D'; };
    const big = log.slice().sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)[0];
    // Destaques: artilheiro, melhor nota média (5 jogos ou mais) e revelação (até 21 anos)
    const g = {}, rs = {}; log.forEach(l => { (l.ev || []).forEach(x => { g[x] = (g[x] || 0) + 1; }); (l.rt || []).forEach(x => { (rs[x.id] = rs[x.id] || []).push(x.r); }); });
    const by = {}; co.squad.forEach(p => { by[p.id] = p; });
    const art = Object.keys(g).sort((a, b) => g[b] - g[a])[0];
    const avgs = Object.keys(rs).filter(id => rs[id].length >= 5 && by[id]).map(id => [by[id], rs[id].reduce((a, b) => a + b, 0) / rs[id].length]).sort((a, b) => b[1] - a[1]);
    const rev = avgs.find(([p]) => p.age <= 21);
    const dest = [art ? ['ARTILHEIRO', co.squad.find(p => p.n === art) || { n: art }, U.D.plural(g[art], 'gol', 'gols')] : null, avgs[0] ? ['MELHOR DO ANO', avgs[0][0], 'nota média ' + avgs[0][1].toFixed(1).replace('.', ',')] : null,
      rev && rev[0] !== (avgs[0] || [])[0] ? ['REVELAÇÃO', rev[0], rev[0].age + ' anos · nota ' + rev[1].toFixed(1).replace('.', ',')] : null].filter(Boolean);
    const nums = [['Pontos em ' + n + ' jogos', v * 3 + e], ['Campanha', v + 'V ' + e + 'E ' + d + 'D'], ['Gols', gp + ' a ' + gc], ['Em casa', rec(log.filter(l => l.home))], ['Fora', rec(log.filter(l => !l.home))], ['Maior vitória', big && big.gf > big.ga ? big.gf + ' x ' + big.ga + ' ' + esc((club(big.vs).short || club(big.vs).name).slice(0, 3).toUpperCase()) : '—']];
    const exp = co.squad.filter(p => p.ct <= 0).length;
    const coinTxt = (out.coins || []).map(x => x.t.toLowerCase()).join(' · ');
    const next = [out.coinsTot ? ['+' + out.coinsTot + ' moedas', coinTxt, 'coin'] : null, out.offers ? [out.sacked ? 'Clubes ligaram' : U.D.plural(out.offers.length, 'clube quer você', 'clubes querem você'), out.offers.slice(0, 2).map(id => esc(club(id).short || club(id).name)).join(' e ') + ' mandaram proposta'] : null,
      !out.sacked ? [out.met ? 'Diretoria satisfeita' : 'Diretoria cobra', out.met ? 'o trabalho continua' : 'a próxima temporada começa sob pressão'] : null,
      out.kids && out.kids.length ? ['Base', 'subiram ' + out.kids.map(esc).join(', ')] : null,
      out.left && out.left.length ? ['Saíram', out.left.slice(0, 3).map(x => esc(x.n) + ' (' + x.why + ')').join(', ')] : null].filter(Boolean);
    const fin = out.fin;
    const draw = () => {
      const sk = Object.keys(S.CO_SKILLS).map(k => '<div class="ldy-sk"><span><b>' + S.CO_SKILLS[k] + ' ' + co.xp[k] + '</b><small>' + c.SK_TXT[k] + '</small></span><button class="ld-b dark" data-sk="' + k + '"' + (co.xp.pts > 0 && co.xp[k] < S.CO.skillMax ? '' : ' disabled') + ' aria-label="Mais um ponto em ' + S.CO_SKILLS[k] + '">+1</button></div>').join('');
      show('<div class="ldy">' +
        '<div class="ldy-l">' + lbl('FIM DA TEMPORADA ' + (out.season + 1) + ' · ' + esc(out.league).toUpperCase()) + '<div class="ldy-h">' + crest(cl.id, 'ldy-cr') + '<span><b>' + head + '</b><small class="' + (out.met || out.won || out.up ? 'up' : 'dn') + '">' + tag + '</small></span></div>' +
          '<div class="ldy-meta">' + lbl('META DA DIRETORIA') + '<div><span>' + esc(S.CO_GOAL_TXT[out.goal.k]) + '</span><b class="' + (out.met ? 'up' : 'dn') + '">' + (out.met ? '✓ cumpriu' : out.sacked ? 'demitido' : '✗ não cumpriu') + '</b></div>' +
            (fin && fin.saldo !== undefined ? '<div><span>Fechar no azul</span><b class="' + (fin.saldo >= 0 ? 'up' : 'dn') + '">' + (fin.saldo >= 0 ? '✓ ' : '✗ ') + c.sgn(fin.saldo) + '</b></div>' : '') + '</div>' +
          lbl('VOCÊ COMO TÉCNICO') + '<div class="ldy-me"><span>Fama</span><b>' + out.fame[0] + ' → ' + out.fame[1] + ' <i class="' + (df >= 0 ? 'up' : 'dn') + '">' + (df >= 0 ? '▲' : '▼') + '</i></b></div>' +
          '<div class="ldy-me"><small>' + c.FAME_TXT(out.fame[1]) + ' · experiência ' + (out.xp ? '+' + out.xp : '0') + (co.xp.pts ? ' · ' + U.D.plural(co.xp.pts, 'ponto', 'pontos') + ' para usar' : '') + '</small></div>' + sk + '</div>' +
        '<div class="ldy-m">' + lbl('A TEMPORADA EM NÚMEROS') + '<div class="ldy-n">' + nums.map(([k, x]) => '<span><small>' + k + '</small><b>' + x + '</b></span>').join('') + '</div>' +
          (dest.length ? lbl('DESTAQUES') + dest.map(([k, p, t]) => '<div class="ldy-d"><i>' + (p.num || p.ovr || '') + '</i><span><small>' + k + '</small><b>' + esc(p.n) + '</b></span><em>' + t + '</em></div>').join('') : '') + '</div>' +
        '<div class="ldy-r">' + lbl('O QUE VEM AGORA') + next.map(([k, t, cl]) => '<div class="ldr-ch' + (cl ? ' ' + cl : '') + '"><b>' + k + '</b><small>' + t + '</small></div>').join('') + '<span class="ld-gr"></span>' +
          (out.offers ? gold('ldy-of', 'Ver as propostas', out.sacked ? '' : 'ou ficar no ' + esc(club(co.club).short || club(co.club).name)) :
            '<button class="ld-b line ldy-mk" id="ldy-mk">Ouvir outros clubes</button>' + gold('ldy-ns', 'Temporada ' + (U.YEAR0 + co.season), 'continuar no ' + esc(club(co.club).short || club(co.club).name))) + '</div></div>', st => {
        st.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { if (S.coSkill(co, b.dataset.sk)) { sfx('tap'); c.save(); draw(); } });
        if (st.querySelector('#ldy-of')) st.querySelector('#ldy-of').onclick = () => { sfx('tap'); co.step = 'offers'; c.offers(out.offers); };
        if (st.querySelector('#ldy-ns')) st.querySelector('#ldy-ns').onclick = () => { sfx('tap'); S.coStart(co); c.save('hub'); semana(); };
        if (st.querySelector('#ldy-mk')) st.querySelector('#ldy-mk').onclick = () => { sfx('tap'); const l = S.coOffers(co, 3); c.save(); c.offers(l, true); };
      });
    };
    draw();
  }
  // ---------- Propostas deitado (42): o seu clube e quem chama, lado a lado; a escolhida em dourado ----------
  function propostas(list, stay) {
    const c = C(), co = c.co;
    const ids = (stay && co.club ? [co.club] : []).concat(list.filter(id => id !== co.club)).slice(0, 3);
    let pick = ids.find(id => id !== co.club) || ids[0];
    const info = id => {
      const lg = U.league(id), g = S.coGoalFor(co, id), sq = S.coGenSquad(id, co.season), top = sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11), avg = top.reduce((a, p) => a + p.ovr, 0) / 11;
      const lgIds = D_CLUBS(lg), lgAvg = lgIds.length ? lgIds.reduce((a, x) => a + x.strength, 0) / lgIds.length : 60, rel = club(id).strength - lgAvg;
      const young = sq.filter(p => p.age <= 23).length >= 9;
      const folha = sq.reduce((a, p) => a + p.wage, 0);
      return { lg, g, el: (rel > 4 ? 'forte' : rel < -4 ? 'fraco' : 'médio') + (young ? ', jovem' : ''), folha, n: sq.length, exp: g.exp };
    };
    // Enxuta (2026-11-08, Silvio aprovou "Propostas" no canvas): escudo grande, nome, liga e a meta numa etiqueta (laranja
    // quando é alta); o resto (elenco, aposta, folha, frase, faixa de baixo) saiu: a meta e a demissão vêm no Bem-vindo
    const draw = () => {
      const card = id => { const x = info(id), mine = id === co.club, cl = club(id), hi = ['titulo', 'subir', 'g4'].includes(x.g.k);
        return '<button class="pzo-c' + (id === pick ? ' on' : '') + '" data-o="' + id + '"' + (id === pick ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + (mine ? '<em>Seu clube</em>' : '') + crest(id, 'pzo-cr') +
          '<b>' + esc(cl.short || cl.name) + '</b><small>' + esc(x.lg.name) + '</small><span class="pzo-m' + (hi ? ' hi' : '') + '">' + esc(S.CO_GOAL_TXT[x.g.k]) + '</span></button>';
      };
      const pc = club(pick);
      show('<div class="pzo"><h2>' + (co.club ? 'Propostas' : 'Escolha seu clube') + '</h2><div class="pzo-g" style="grid-template-columns:repeat(' + ids.length + ',minmax(0,1fr))">' + ids.map(card).join('') + '</div>' +
        '<button class="pzo-go" id="ldo-go">' + (pick === co.club ? 'Ficar no ' : 'Assinar com o ') + esc(pc.short || pc.name) + '</button>' +
        (U.COINS ? '<button class="pzo-mo" id="ldo-mo">' + U.COINS.svg + '<b>Escolher com moedas</b></button>' : '') + '</div>', st => {
        st.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { sfx('tap'); pick = b.dataset.o; draw(); });
        if (st.querySelector('#ldo-mo')) st.querySelector('#ldo-mo').onclick = () => { sfx('tap'); escolher(() => propostas(list, stay)); };
        st.querySelector('#ldo-go').onclick = () => {
          sfx('tap');
          if (pick === co.club && stay) { co.offers = null; S.coStart(co); c.save('hub'); return semana(); }
          S.coSign(co, pick); co.autoXI = true; co.offers = null; S.coStart(co); c.save('hub'); welcome();
        };
      });
    };
    draw();
  }
  const D_CLUBS = lg => (window.CRAQUE_DATA.CLUBS || []).filter(x => x.league === lg.id);
  // ---------- Loja (quadro 40, Silvio aprovou 2026-11-09): abas Moedas e Dinheiro do clube ----------
  // Moedas: 4 pacotes fixos, sem sorteio (a cobrança pelo Mercado Pago chega na fase 5; até lá o botão fica "em breve").
  // Dinheiro do clube: aporte do investidor em semanas da folha (S.coAporte), 20 moedas cada, só com uma carreira aberta.
  const PACKS = [{ k: 'p1', n: 120, nm: 'Punhado', pr: 'R$ 4,90', h: 1 }, { k: 'p2', n: 350, nm: 'Saco', pr: 'R$ 12,90', h: 2 },
    { k: 'p3', n: 800, nm: 'Baú', pr: 'R$ 24,90', h: 3, tag: '+20%' }, { k: 'p4', n: 2000, nm: 'Cofre', pr: 'R$ 49,90', h: 4, tag: '+50%' }];
  const COIN_PILE = h => { const cols = h >= 4 ? [22, 37, 52] : h >= 3 ? [26, 48] : [37]; let g = '';
    cols.forEach((x, ci) => { const n = Math.min(6, h + 1 + (ci === 1 ? 1 : 0)); for (let i = 0; i < n; i++) { const y = 60 - i * 7;
      g += '<ellipse cx="' + x + '" cy="' + (y + 3) + '" rx="15" ry="6" fill="#b48a12"/><ellipse cx="' + x + '" cy="' + y + '" rx="15" ry="6" fill="#F2C230"/><ellipse cx="' + x + '" cy="' + y + '" rx="10" ry="3.5" fill="none" stroke="#b48a12" stroke-width="1.5"/>'; } });
    return '<svg viewBox="0 0 74 74" aria-hidden="true">' + g + '</svg>'; };
  function loja(tab, back) {
    const c = C(), co = c && c.co && c.co.club ? c.co : null;
    let pk = 1, wk = 1;
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    const draw = () => {
      const saldo = U.COINS.get();
      const tabs = '<span class="lj-tabs">' + ['Moedas', 'Dinheiro do clube'].map((t, i) => '<button data-lj="' + i + '"' + (i === tab ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + t + '</button>').join('') + '</span>';
      let main, side;
      if (tab === 0) {
        main = '<div class="lj-pk">' + PACKS.map((p, i) => '<button class="lj-p' + (i === pk ? ' on' : '') + '" data-pk="' + i + '">' + (p.tag ? '<em>' + p.tag + '</em>' : '') + COIN_PILE(p.h) +
          '<span><b>' + p.n.toLocaleString('pt-BR') + '</b><small>' + p.nm + '</small></span><i>' + p.pr + '</i></button>').join('') + '</div>';
        side = '<div class="lj-box"><small class="ld-lbl">GANHE JOGANDO</small>' + [['Título da Série A', 60], ['Acesso', 15], ['Meta cumprida', 5], ['Metas da semana', 10]].map(([t, n]) => '<div class="lj-li"><span>' + t + '</span><b>+' + n + '</b></div>').join('') + '</div>' +
          '<small class="lj-ty">Sua compra ajuda a manter e melhorar o Climbix.</small><button class="tm-go off" id="lj-buy" disabled>Compra em breve</button>';
      } else if (!co) {
        main = '<div class="lj-ap lj-none"><b>Abra uma carreira do Treinador</b><small>O aporte entra na verba do clube que você treina.</small></div>';
        side = '<span class="rs-gap"></span>';
      } else {
        const left = S.coAporteLeft(co), used = S.coAporteUsed(co), f = S.coFin(co), red = f.caixa < 0;
        wk = Math.max(1, Math.min(wk, Math.max(1, left)));
        const cost = wk * S.CO_APORTE.coin, v = S.coAporteValue(co, wk), ok = left > 0 && saldo >= cost;
        main = '<div class="lj-ap"><div class="lj-ah">' + crest(co.club, 'lj-cr') + '<span><b>Aporte do investidor</b><small>' + esc(club(co.club).short || club(co.club).name) + ' · vai para a verba</small></span></div>' +
          '<div class="lj-v"><button id="lj-m" aria-label="Menos"' + (wk <= 1 ? ' disabled' : '') + '>' + BK + '</button><span><b>+ ' + c.brl(v) + '</b><small>' + U.D.plural(wk, 'semana', 'semanas') + ' da folha</small></span><button id="lj-p" aria-label="Mais"' + (wk >= left ? ' disabled' : '') + '>' + FW + '</button></div>' +
          '<div class="lj-two"><span><small>Verba</small><b>' + c.brl(f.verba) + ' → ' + c.brl(f.verba + (left ? v : 0)) + '</b></span><span><small>Nesta temporada</small><b>' + (used + (left ? wk : 0)) + ' de ' + S.CO_APORTE.max + ' semanas</b></span></div></div>';
        side = '<div class="lj-box lj-cost"><small class="ld-lbl">CUSTA</small><span>' + U.COINS.svg + '<b>' + cost + '</b></span><small>' + (saldo >= cost ? 'sobram ' + (saldo - cost) + ' moedas' : 'faltam ' + (cost - saldo) + ' moedas') + '</small></div>' +
          '<button class="tm-go' + (ok ? '' : ' off') + '" id="lj-ap"' + (ok ? '' : ' disabled') + '>' + (red ? 'Caixa no vermelho' : !left ? 'Limite da temporada' : 'Fazer aporte') + '</button>';
      }
      show('<div class="lj"><div class="tm-h"><button class="tcr-back" id="lj-back" aria-label="Voltar">' + BK + '</button><b>Loja</b></div>' + tabs + U.COINS.pill('lj-pill') +
        '<div class="lj-main">' + main + '</div><div class="lj-side">' + side + '</div></div>', st => {
        st.querySelector('#lj-back').onclick = () => { sfx('tap'); back ? back() : U.home(); };
        st.querySelectorAll('[data-lj]').forEach(b => b.onclick = () => { sfx('tap'); tab = +b.dataset.lj; draw(); });
        st.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { sfx('tap'); pk = +b.dataset.pk; draw(); });
        if (st.querySelector('#lj-m')) st.querySelector('#lj-m').onclick = () => { sfx('tap'); wk--; draw(); };
        if (st.querySelector('#lj-p')) st.querySelector('#lj-p').onclick = () => { sfx('tap'); wk++; draw(); };
        if (st.querySelector('#lj-ap')) st.querySelector('#lj-ap').onclick = () => {
          const cost = wk * S.CO_APORTE.coin;
          if (!U.COINS.spend(cost, 'Aporte: ' + (club(co.club).short || club(co.club).name))) return;
          const v = S.coAporte(co, wk); if (!v) { U.COINS.add({ n: cost, t: 'Aporte devolvido' }); return; }
          sfx('coin'); c.save(); wk = 1; draw();
          pop('<div class="acd-help"><b>Aporte feito</b><p>+ ' + c.brl(v) + ' na verba do ' + esc(club(co.club).short || club(co.club).name) + '.</p><button class="hl-btn dark" data-pop-x>Fechar</button></div>', 'Aporte feito', null, 'hl-pop acd-pop tm-pop');
        };
      });
    };
    draw();
  }
  // ---------- Escolher clube com moedas (quadro 41, Silvio aprovou 2026-11-09) ----------
  // Liga com ◀ ▶ (começa na liga do seu país), escudos com o preço em 2 linhas que deslizam para o lado,
  // do lado o escolhido: meta, elenco em palavras, verba de chegada e quanto sobra. Assinar gasta as moedas.
  function escolher(back) {
    const c = C(), co = c.co, D = window.CRAQUE_DATA;
    const lgs = D.LEAGUES.filter(l => S.coBuyList(co, l.id).length);
    const home = co.club ? club(co.club).league : (lgs.find(l => l.country === co.country && !(D.LADDER[l.id] || {}).up) || lgs[0]).id;
    let li = Math.max(0, lgs.findIndex(l => l.id === home)), pick = null;
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    const draw = () => {
      const lg = lgs[li], ids = S.coBuyList(co, lg.id); if (!ids.includes(pick)) pick = ids[0];
      const saldo = U.COINS.get(), mine = U.COINS.owns(pick), price = mine ? 0 : S.coClubPrice(pick), g = S.coGoalFor(co, pick), cl = club(pick);
      const logged = !!(U.cloudStatus && U.cloudStatus());
      const avg = ids.concat(co.club && club(co.club).league === lg.id ? [co.club] : []).reduce((a, id) => a + club(id).strength, 0) / Math.max(1, ids.length);
      const rel = cl.strength - avg, el = rel > 6 ? 'muito forte' : rel > 2 ? 'forte' : rel < -4 ? 'fraco' : 'médio';
      const verba = S.coFinBase({ club: pick, season: co.season }) * S.CO_FIN.verba0, hi = ['titulo', 'subir', 'g4'].includes(g.k), ok = saldo >= price;
      const cell = id => '<button class="ec-c' + (id === pick ? ' on' : '') + '" data-ec="' + id + '" aria-pressed="' + (id === pick) + '">' + crest(id, 'ec-cr') + '<b>' + esc(club(id).short || club(id).name) + '</b>' + (U.COINS.owns(id) ? '<span class="ec-own">Seu time</span>' : '<span>' + U.COINS.svg + S.coClubPrice(id) + '</span>') + '</button>';
      show('<div class="ec"><div class="tm-h"><button class="tcr-back" id="ec-back" aria-label="Voltar">' + BK + '</button><b>Escolher clube</b></div>' +
        '<div class="ec-lg"><button id="ec-lp" aria-label="Liga anterior">' + BK + '</button><b>' + esc(lg.country) + ' · ' + esc(lg.name) + '</b><button id="ec-ln" aria-label="Próxima liga">' + FW + '</button></div>' + U.COINS.pill('ec-pill') +
        '<div class="ec-g">' + ids.map(cell).join('') + '</div>' +
        '<div class="ec-side"><div class="ec-sel"><div class="ec-sh">' + crest(pick, 'ec-scr') + '<b>' + esc(cl.short || cl.name) + '</b></div>' +
          '<em class="ec-m' + (hi ? ' hi' : '') + '">META · ' + esc(S.CO_GOAL_TXT[g.k]) + '</em>' +
          '<div class="ec-li"><span>Elenco</span><b>' + el + '</b></div><div class="ec-li"><span>Verba</span><b>' + c.brl(verba) + '</b></div>' +
          '<div class="ec-li"><span>' + (mine ? 'Comprado' : 'Moedas depois') + '</span><b>' + (mine ? 'no seu perfil' : ok ? saldo - price : '—') + '</b></div></div>' +
          '<button class="tm-go' + (!ok ? ' off' : !mine && !logged ? ' ec-in' : '') + '" id="ec-go">' + (mine ? 'Assinar · seu time' : !ok ? 'Faltam ' + (price - saldo) + ' moedas' : !logged ? 'Entrar para comprar' : 'Comprar · ' + price + ' moedas') + '</button></div></div>', st => {
        st.querySelector('#ec-back').onclick = () => { sfx('tap'); back(); };
        st.querySelector('#ec-lp').onclick = () => { sfx('tap'); li = (li - 1 + lgs.length) % lgs.length; pick = null; draw(); };
        st.querySelector('#ec-ln').onclick = () => { sfx('tap'); li = (li + 1) % lgs.length; pick = null; draw(); };
        st.querySelectorAll('[data-ec]').forEach(b => b.onclick = () => { sfx('tap'); const sc = st.querySelector('.ec-g').scrollLeft; pick = b.dataset.ec; draw(); const g2 = document.querySelector('.ec-g'); if (g2) g2.scrollLeft = sc; });
        st.querySelector('#ec-go').onclick = () => {
          if (!ok) { sfx('tap'); return loja(0, draw); }
          // Comprar exige conta (Silvio 2026-11-09): o time fica no perfil e vai junto para outro aparelho
          if (!mine && !logged) { sfx('tap'); c.save(); off(); return U.cloud ? U.cloud() : U.home(); }
          if (!mine) { if (!U.COINS.spend(price, 'Clube: ' + (cl.short || cl.name))) return; U.COINS.own(pick); }
          sfx('tap'); S.coBuyClub(co, pick, price); co.autoXI = true; co.offers = null; S.coStart(co); c.save('hub'); welcome();
        };
      });
    };
    draw();
  }
  // Chegada ao clube: o presidente diz a meta (um popup em cima da semana)
  function welcome() {
    const c = C(), co = c.co, cl = club(co.club), g = co.board.goal;
    if (S.coFinPend && S.coFinPend(co)) return co.fin.pend.ac ? reuniao(null, true) : patrocinio(null, true);
    semana();
    pop('<div class="ldw">' + crest(cl.id, 'ldw-cr') + '<div>' + lbl(esc(cl.name).toUpperCase() + ' · ' + (U.YEAR0 + co.season)) + '<b>Bem-vindo, professor.</b><p>O presidente aperta sua mão: "Aqui a meta é uma só: <b>' + esc(S.CO_GOAL_TXT[g.k].toLowerCase()) + '</b>. ' +
      (g.k === 'titulo' ? 'Segundo lugar aqui é derrota."' : g.k === 'naocair' || g.k === 'digna' ? 'Ninguém espera milagre, mas vexame não."' : 'Confio no seu trabalho."') + '</p><button class="ld-gold sm" id="ldw-go"><b>Conhecer o elenco</b></button></div></div>', 'Bem-vindo', w => {
      w.querySelector('#ldw-go').onclick = () => { sfx('tap'); closePop(); time(false); };
    }, 'w560 ldl-pp');
  }

  // ---------- Funções (33c): como cada vaga joga. A função fica na vaga; quem entrar ali joga igual ----------
  function bindSub(st, back) { st.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sfx('tap'); if (b.dataset.sub === 'fun') funcoes(null, back); else batedores(null, back); }); }
  // Funções enxuta (Silvio 2026-11-09, quadro 28): sem frase no título, sem faixa no campo e sem "Como pesa". Cada boneco
  // com o nome e a função (verde = mais à frente, azul = mais atrás, setinha no círculo); o cartão creme mostra as 3
  // funções da vaga escolhida e a frase só da escolhida; embaixo Defesa/Meio/Ataque com ▼ — ▲
  const BKS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const segFB = act => '<div class="fb2-seg">' + [['fun', 'Funções'], ['bat', 'Batedores']].map(([k, t]) => '<button data-sub="' + k + '"' + (k === act ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>';
  function funcoes(sel, back) {
    const c = C(), co = c.co, by = {}; co.squad.forEach(p => { by[p.id] = p; }); S.coNums(co.squad);
    const R = S.coRoles(co, co.form), sl = S.coSlots(co.form), sp = spotsT(co.form);
    sel = sel == null ? 0 : sel;
    const rk = i => S.coRoleKey(co.form, i), rn = i => S.CO_ROLES[rk(i)][R[i] + 1][0];
    const AR = { '-1': '▼', 1: '▲' };
    const dots = co.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { sel: i === sel, yc: false, num: true, tag: rn(i), attr: ' data-fi="' + i + '" data-rv="' + R[i] + '"' }).replace('</i><span class="ld-dn">', (R[i] ? '<u class="fu2-ar">' + AR[R[i]] + '</u>' : '') + '</i><span class="ld-dn">') : '').join('');
    const p = by[co.xi[sel]], lb = S.coSlotLbl(co.form, sel), opts = S.CO_ROLES[rk(sel)];
    const lnOf = i => { const l = S.CO_FORMS[co.form].slots[i].ln; return l === 'am' ? 'm' : l; };
    const grp = [['d', 'DEFESA'], ['m', 'MEIO'], ['a', 'ATAQUE']].map(([k, t]) => { const ix = sl.map((x, i) => i).filter(i => lnOf(i) === k), all = ix.length && ix.every(i => R[i] === R[ix[0]]) ? R[ix[0]] : null;
      return '<span><small>' + t + '</small>' + [[-1, '▼', 'mais atrás'], [0, '—', 'normal'], [1, '▲', 'mais à frente']].map(([v, ic, al]) => '<button data-gl="' + k + ':' + v + '"' + (all === v ? ' class="on"' : '') + ' aria-label="' + t.toLowerCase() + ' ' + al + '">' + ic + '</button>').join('') + '</span>'; }).join('');
    show('<div class="fb2"><div class="tm-h"><button class="tcr-back" id="ldm-back" aria-label="Voltar">' + BKS + '</button><b>Funções</b><small>' + co.form + '</small>' + segFB('fun') + '</div>' +
      '<div class="ld-pitch fu2-pitch">' + PITCH + dots + '</div>' +
      '<div class="fu2-grp">' + grp + '</div>' +
      '<div class="fb2-c"><div class="fb2-who"><i>' + (p ? p.num || p.ovr : '') + '</i><span><b>' + (p ? esc(last(p.n)) : '') + '</b><small>' + lb + ' · ' + rn(sel).toLowerCase() + '</small></span></div>' +
        opts.map((o, j) => '<button class="fu2-op' + (R[sel] === j - 1 ? ' on' : '') + '" data-r="' + (j - 1) + '"><b>' + o[0] + '</b>' + (j === 1 ? '' : '<em>' + (j ? '▲ frente' : '▼ atrás') + '</em>') + '</button>').join('') +
        '<p class="fb2-sub">' + opts[R[sel] + 1][1] + '</p></div>' +
      '<button class="tm-go fb2-go" id="ldm-ok">Pronto</button></div>', st => {
      bindSub(st, back);
      st.querySelector('#ldm-back').onclick = st.querySelector('#ldm-ok').onclick = () => { sfx('tap'); c.save(); (back || time)(); };
      st.querySelectorAll('[data-fi]').forEach(b => b.onclick = () => { sfx('tap'); funcoes(+b.dataset.fi, back); });
      st.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { sfx('tap'); R[sel] = +b.dataset.r; c.save(); funcoes(sel, back); });
      st.querySelectorAll('[data-gl]').forEach(b => b.onclick = () => { sfx('tap'); const [ln, v] = b.dataset.gl.split(':'); sl.forEach((x, i) => { if (lnOf(i) === ln) R[i] = +v; }); c.save(); funcoes(sel, back); });
    });
  }
  // ---------- Batedores (39): pênalti, faltas, escanteios e capitão; o 1º que estiver em campo bate ----------
  const TK_SCORE = { pen: p => p.ovr + (p.pos === 'ATA' ? 6 : p.pos === 'MEI' ? 4 : 0), fl: p => p.ovr + (p.pos === 'MEI' ? 6 : p.pos === 'ATA' ? 3 : 0), fc: p => p.ovr + (p.pos === 'MEI' ? 5 : p.pos === 'LAT' ? 4 : 0),
    ckE: p => p.ovr + (p.pos === 'MEI' ? 5 : p.pos === 'LAT' ? 4 : 0), ckD: p => p.ovr + (p.pos === 'MEI' ? 5 : p.pos === 'LAT' ? 4 : 0), cap: p => p.ovr * 0.5 + p.age * 1.2 + (p.mo || 60) * 0.1 };
  function takersOf(co) {
    co.takers = co.takers || {};
    Object.keys(S.CO_TAKE).forEach(k => { const L = (co.takers[k] || []).filter(id => co.squad.some(p => p.id === id));
      if (L.length < 3) co.squad.filter(p => p.pos !== 'GOL' && !L.includes(p.id) && c0avail(p)).sort((a, b) => TK_SCORE[k](b) - TK_SCORE[k](a)).slice(0, 3 - L.length).forEach(p => L.push(p.id));
      co.takers[k] = L.slice(0, 3); });
    return co.takers;
  }
  const c0avail = p => p && !p.out && !p.sus;
  // Batedores enxuta (quadro 29): seis quadros com o 1º grande e "2º · 3º" numa linha; o cartão creme mostra os 5
  // melhores para a bola escolhida com 1º/2º/3º. Sem frase no título e sem o rodapé
  function batedores(k, back) {
    const c = C(), co = c.co, T = takersOf(co), by = {}; co.squad.forEach(p => { by[p.id] = p; }); S.coNums(co.squad);
    k = k || 'pen';
    const SH = { ckE: 'Escanteio esq.', ckD: 'Escanteio dir.' };
    const card = kk => { const L = T[kk].map(id => by[id]).filter(Boolean), f = L[0];
      return '<button class="bt2-t' + (kk === k ? ' on' : '') + '" data-bk="' + kk + '"><small>' + (SH[kk] || S.CO_TAKE[kk]).toUpperCase() + '</small>' +
        (f ? '<span><i>' + (f.num || f.ovr) + '</i><b>' + esc(last(f.n)) + '</b></span>' : '<span></span>') +
        '<em>' + L.slice(1).map((p, j) => (j + 2) + 'º ' + esc(last(p.n))).join(' · ') + '</em></button>'; };
    const cand = co.squad.filter(p => p.pos !== 'GOL' || k === 'cap').sort((a, b) => TK_SCORE[k](b) - TK_SCORE[k](a)).slice(0, 5);
    const best = cand[0];
    show('<div class="fb2"><div class="tm-h"><button class="tcr-back" id="ldm-back" aria-label="Voltar">' + BKS + '</button><b>Batedores</b>' + segFB('bat') + '</div>' +
      '<div class="bt2-g">' + Object.keys(S.CO_TAKE).map(card).join('') + '</div>' +
      '<div class="fb2-c bt2-c"><b class="bt2-h">' + S.CO_TAKE[k] + '</b>' + cand.map(p => { const pos = T[k].indexOf(p.id);
        return '<div class="bt2-r"><i>' + (p.num || p.ovr) + '</i><span><b>' + esc(last(p.n)) + '</b><small' + (p === best ? ' class="best">MELHOR' : '>' + p.pos + ' · ' + p.ovr + (co.xi.includes(p.id) ? '' : ' · banco')) + '</small></span>' +
          [0, 1, 2].map(j => '<button data-to="' + p.id + ':' + j + '"' + (pos === j ? ' class="on"' : '') + '>' + (j + 1) + 'º</button>').join('') + '</div>'; }).join('') + '</div>' +
      '<button class="tm-go fb2-go" id="ldm-ok">Pronto</button></div>', st => {
      bindSub(st, back);
      st.querySelector('#ldm-back').onclick = st.querySelector('#ldm-ok').onclick = () => { sfx('tap'); c.save(); (back || time)(); };
      st.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { sfx('tap'); batedores(b.dataset.bk, back); });
      st.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { sfx('tap'); const [id, j] = b.dataset.to.split(':'), L = T[k].filter(x => x !== id); L.splice(+j, 0, id); T[k] = L.slice(0, 3); c.save(); batedores(k, back); });
    });
  }
  // ---------- Treino da semana (35): um foco em 16, em 4 abas; vale para o próximo jogo ----------
  // Treino enxuto (Silvio 2026-11-09): sem trilho; 4 abas e 4 treinos grandes (nome e energia); à direita o escolhido
  // com uma frase do que muda; o comentário do auxiliar sobre o rival vira um botão com aviso; dourado Treinar
  function treino(tab) {
    const c = C(), co = c.co, T = S.CO_TRAIN, tabs = ['Ataque', 'Defesa', 'Bola parada', 'Físico'];
    const done = co.train && co.train.i === co.ss.i ? co.train.k : null;
    let pick = done || null;
    tab = tab || (done ? T[done].tab : 'Ataque');
    const nx = S.coNext(co), vs = nx && !nx.bye ? club(nx.vs) : null;
    const pv = vs ? S.coPreview(co) : null;
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const vn = vs ? esc(vs.short || vs.name) : '';
    // O auxiliar comenta o rival e sugere um treino
    const AUX = { posse: ['O ' + vn + ' fica com a bola. Sair no contra vale ouro.', 'contra'], pressao: ['O ' + vn + ' aperta lá na frente. Troca de passes ajuda.', 'toque'], contra: ['O ' + vn + ' espera e sai rápido. Linha de zaga ajuda.', 'linha'],
      retranca: ['O ' + vn + ' vai fechar a área. Escanteio pode decidir.', 'esc'], lados: ['O ' + vn + ' cruza muito. Defender escanteio ajuda.', 'defesc'], equilibrado: ['O ' + vn + ' não tem ponto fraco grande. Treine o que é seu.', null] };
    const aux = pv ? AUX[pv.them.style] || AUX.equilibrado : ['Sem jogo nesta rodada: bom para recuperar.', 'recup'];
    const enTxt = t => (t.en > 0 ? 'energia −' + t.en : 'energia +' + (-t.en));
    const draw = () => {
      const ks = Object.keys(T).filter(k => T[k].tab === tab), sel = pick && T[pick];
      const go = done ? '<button class="tm-go" id="ldtr-back">Voltar</button>' : '<button class="tm-go' + (sel ? '' : ' off') + '" id="ldtr-go">' + (sel ? 'Treinar' : 'Escolha um') + '</button>';
      show('<div class="tr2"><div class="tm-h"><button class="tcr-back" id="tr2-back" aria-label="Voltar">' + BK + '</button><b>Treino</b><small>' + (vs ? 'para o jogo contra o ' + vn : 'sem jogo nesta rodada') + '</small></div>' +
        '<div class="tr2-tabs">' + tabs.map(t => '<button data-tt="' + t + '"' + (t === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        '<div class="tr2-g">' + ks.map(k => '<button class="tr2-c' + (k === pick ? ' on' : '') + (done && k !== done ? ' dis' : '') + '" data-tk="' + k + '"' + (done && k !== done ? ' disabled' : '') + '><b>' + (done === k ? '✓ ' : '') + T[k].name + '</b><em class="' + (T[k].en > 0 ? 'dn' : 'up') + '">' + enTxt(T[k]) + '</em></button>').join('') + '</div>' +
        '<div class="tr2-side"><div class="tr2-d">' + (sel ? '<b>' + sel.name + '</b><p>' + trTip(pick) + '</p>' : '<p class="tr2-none">Toque num treino</p>') + '</div>' +
          '<button class="tm-b" id="tr2-aux">Auxiliar' + (aux[1] && !done ? '<i class="tm-dot">1</i>' : '') + '</button>' + go + '</div></div>', st => {
        st.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { sfx('tap'); tab = b.dataset.tt; draw(); });
        st.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { sfx('tap'); pick = b.dataset.tk; draw(); });
        st.querySelector('#tr2-back').onclick = () => { sfx('tap'); semana(); };
        st.querySelector('#tr2-aux').onclick = () => { sfx('tap');
          pop('<div class="acd-help"><span class="aux-h">' + auxFace(co, 'aux-fc') + '<b>Auxiliar</b></span><p>“' + aux[0] + '”</p><span class="hl-ab">' + (aux[1] && !done ? '<button class="hl-btn dark" id="tr2-see">Ver esse treino</button>' : '') + '<button class="hl-btn line" data-pop-x>Fechar</button></span></div>', 'Auxiliar', w => {
            if (w.querySelector('#tr2-see')) w.querySelector('#tr2-see').onclick = () => { sfx('tap'); closePop(); pick = aux[1]; tab = T[pick].tab; draw(); };
          }, 'hl-pop acd-pop tm-pop'); };
        if (st.querySelector('#ldtr-go')) st.querySelector('#ldtr-go').onclick = () => { if (!pick) return; sfx('tap'); S.coTrain(co, pick); c.save(); semana(); };
        if (st.querySelector('#ldtr-back')) st.querySelector('#ldtr-back').onclick = () => { sfx('tap'); semana(); };
      });
    };
    draw();
  }
  const trTip = k => ({ final: 'O time chuta mais certo no próximo jogo.', lados: 'A bola vai mais para as pontas e os cruzamentos.', contra: 'Roubou, saiu rápido: mais perigo no contra-ataque.', toque: 'O time segura mais a bola.', pressao: 'Rouba mais lá na frente, mas cansa.', linha: 'A zaga sobe junto: o rival chega menos.', bloco: 'Atrás fica fechado; na frente, um pouco menos.', duelos: 'Ganha mais divididas: o rival chega menos.',
    esc: 'Mais gols de escanteio, com os batedores da sua lista.', falta: 'Mais gols de falta, com o seu batedor.', defesc: 'Sofre menos na bola parada deles.', pen: 'Bate e defende pênalti um pouco melhor.', recup: 'Quem jogou recupera energia. Nada muda no jogo.', resist: 'O time cansa menos durante o jogo.', veloc: 'Arranca e recompõe mais rápido.', folga: 'Dia livre: energia e moral sobem.' })[k] || '';
  // ---------- Relatório do olheiro (36): o que o rival faz, com o risco de errar ----------
  // Olheiro enxuto (Silvio 2026-11-09): o campo deles com os números em cima de quem importa; à direita as 3 descobertas
  // numa frase (tocar acende o jogador); o "viu um jogo só" vai para o ?; dourado Guardar
  function olheiro() {
    const c = C(), co = c.co, nx = S.coNext(co); if (!nx || nx.bye) return semana();
    const pv = S.coPreview(co), them = pv.them, tby = {}; them.squad.forEach(p => { tby[p.id] = p; });
    // Vagas deles no campo todo: x da formação, y espalhado (linha de 5 em zigue-zague para os nomes não encostarem)
    const tsl0 = S.CO_FORMS[them.form].slots, tsp = spotsL(them.form, true, true).map(([x], i) => { const ln = tsl0[i].ln, ix = tsl0.map((q, j) => j).filter(j => tsl0[j].ln === ln), n = ix.length, k = ix.indexOf(i);
      if (n === 1) return [x, 45]; return [n === 5 ? x + (k % 2 ? -5 : 0) : x, Math.round(47 + (k - (n - 1) / 2) * Math.min(21, 68 / (n - 1)))]; });
    const tc = club(them.club);
    const F = scoutOf(co, them);
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const mark = (i, n) => '<b class="ol2-mk" style="left:' + tsp[i][0] + '%;top:' + tsp[i][1] + '%">' + n + '</b>';
    show('<div class="ol2"><div class="tm-h"><button class="tcr-back" id="ol2-back" aria-label="Voltar">' + BK + '</button><b>Olheiro</b><small>' + esc(tc.short || tc.name) + ' · ' + them.form + ' · ' + esc(S.CO_STY[them.style].name) + '</small>' +
      '<button class="ol2-q" id="ol2-q" aria-label="Como funciona">?</button></div>' +
      '<div class="ld-pitch ol2-pitch">' + PITCH + them.xi.map((id, i) => tby[id] ? rivalDot(tsp[i][0], tsp[i][1], last(tby[id].n)).replace('class="ld-dot riv"', 'class="ld-dot riv" data-ri="' + i + '"') : '').join('') +
        F.map((f, n) => f.i !== undefined ? mark(f.i, n + 1) : '').join('') + '</div>' +
      '<div class="ol2-side">' + F.map((f, n) => '<button class="ol2-f' + (n ? '' : ' on') + '" data-of="' + n + '"><i>' + (n + 1) + '</i><b>' + f.t + '</b></button>').join('') +
        '<button class="tm-go" id="ldo-ok">Guardar</button></div></div>', st => {
      const lit = n => { st.querySelectorAll('[data-of]').forEach(b => b.classList.toggle('on', +b.dataset.of === n)); st.querySelectorAll('[data-ri]').forEach(d => d.classList.toggle('hi', F[n].i !== undefined && +d.dataset.ri === F[n].i)); };
      lit(0);
      st.querySelectorAll('[data-of]').forEach(b => b.onclick = () => { sfx('tap'); lit(+b.dataset.of); });
      st.querySelector('#ol2-back').onclick = () => { sfx('tap'); semana(); };
      st.querySelector('#ol2-q').onclick = () => { sfx('tap'); pop('<div class="acd-help"><b>Como funciona</b><p>O olheiro viu um jogo só: uma das três pode não se repetir. O que se confirmar em campo vale para o jogo.</p><button class="hl-btn dark" data-pop-x>Entendi</button></div>', 'Como funciona', null, 'hl-pop acd-pop tm-pop'); };
      st.querySelector('#ldo-ok').onclick = () => { sfx('tap'); co.scout = { i: co.ss.i }; c.save(); semana(); };
    });
  }
  // Três descobertas sobre o rival; uma pode ser falsa (sorteio fixo pelo jogo)
  function scoutOf(co, them) {
    const tby = {}; them.squad.forEach(p => { tby[p.id] = p; });
    const sl = S.CO_FORMS[them.form].slots, xi = them.xi, h = n => { let x = 2166136261; const st = them.club + ':' + co.season + ':' + co.ss.i + ':' + n; for (let i = 0; i < st.length; i++) x = Math.imul(x ^ st.charCodeAt(i), 16777619); return (x >>> 0) / 4294967296; };
    const wide = xi.map((id, i) => [tby[id], i]).filter(([p, i]) => p && sl[i].w && sl[i].ln !== 'd').sort((a, b) => b[0].ovr - a[0].ovr)[0];
    const zag = xi.map((id, i) => [tby[id], i]).filter(([p, i]) => p && sl[i].pos === 'ZAG').sort((a, b) => a[0].ovr - b[0].ovr)[0];
    const st9 = xi.map((id, i) => [tby[id], i]).filter(([p, i]) => p && sl[i].pos === 'ATA' && !sl[i].w && (!wide || wide[1] !== i)).sort((a, b) => b[0].ovr - a[0].ovr)[0];
    const out = [];
    if (wide) out.push({ i: wide[1], t: 'Atacam pelo lado do ' + esc(last(wide[0].n)), d: 'Quase tudo passa pelo ' + esc(last(wide[0].n)) + ', o melhor deles aberto. Feche esse lado.' });
    if (zag) out.push({ i: zag[1], t: 'O zagueiro ' + esc(last(zag[0].n)) + ' é o ponto fraco', d: 'Bola nas costas dele vira chance. Atacante rápido em cima dele.' });
    out.push(h(3) < 0.5 ? { t: 'Marcam mal no escanteio', d: 'Deixam o primeiro pau livre. Combina com o treino de bola parada.' } : st9 ? { i: st9[1], t: 'Tudo passa pelo ' + esc(last(st9[0].n)), d: 'O centroavante deles decide. Volante fixo em cima dele.' } : { t: 'Cansam no fim', d: 'Do minuto 70 em diante, eles caem. Guarde as trocas.' });
    return out.slice(0, 3);
  }
  // ---------- Preleção (37): a última conversa, vale os primeiros 15 minutos ----------
  function prelecao() {
    const c = C(), co = c.co, by = {}; co.squad.forEach(p => { by[p.id] = p; });
    const xi = co.xi.map(id => by[id]).filter(Boolean);
    const mo = Math.round(xi.reduce((a, p) => a + (p.mo === undefined ? 60 : p.mo), 0) / Math.max(1, xi.length));
    const nerv = xi.filter(p => (p.mo === undefined ? 60 : p.mo) < 45).sort((a, b) => a.mo - b.mo)[0];
    const capId = (co.takers && co.takers.cap && co.takers.cap.find(id => co.xi.includes(id))) || xi.slice().sort((a, b) => b.age - a.age)[0].id, cap = by[capId];
    // Preleção enxuta (2026-11-09, quadro 15): o tom numa régua de calmo a forte, ◀ ▶ como a formação
    const P = S.CO_PRE, K = ['calma', 'voces', 'cima'], WHO = { calma: 'TOM CALMO', voces: 'TOM DO GRUPO', cima: 'TOM FORTE' };
    let pick = 'voces';
    const draw = () => {
      const i = K.indexOf(pick), pr = P[pick], [up, dn] = pr.tip.split(' · ');
      const fx = [['up', up.replace(', ajuda os nervosos', '')]];
      if (nerv && pick === 'voces') fx.push(['up', 'o ' + last(nerv.n) + ' se acalma']);
      fx.push(['dn', dn]);
      if (nerv && pick === 'cima') fx.push(['dn', 'não ajuda o ' + last(nerv.n)]);
      const cap1 = t => t.charAt(0).toLowerCase() + t.slice(1);
      show('<div class="pl2"><div class="tm-h"><b>Vestiário</b><small>escolha o tom dos primeiros 15 minutos</small></div>' +
        '<div class="pl2-box"><div class="pl2-top"><button class="pl2-ar" data-pa="-1" aria-label="Mais calmo"' + (i ? '' : ' disabled') + '>◀</button>' +
          '<span><small>' + WHO[pick] + '</small><b>' + pr.name + '</b></span><button class="pl2-ar" data-pa="1" aria-label="Mais forte"' + (i < 2 ? '' : ' disabled') + '>▶</button></div>' +
          '<div class="pl2-rg"><i></i>' + K.map((k, j) => '<button data-pk="' + k + '" aria-label="' + P[k].name + '" class="' + (k === pick ? 'on' : '') + '" style="left:' + j * 50 + '%"></button>').join('') + '</div>' +
          '<div class="pl2-lb"><span>calmo</span><span>pelo grupo</span><span>forte</span></div>' +
          '<div class="pl2-fx">' + fx.map(([cc, t]) => '<em class="' + cc + '">' + (cc === 'up' ? '+ ' : '− ') + esc(cap1(t)) + '</em>').join('') + '</div></div>' +
        '<div class="pl2-side"><div class="pl2-cl"><small>CLIMA DO GRUPO</small><b class="' + (mo >= 70 ? 'up' : mo >= 50 ? '' : 'dn') + '">' + (mo >= 70 ? 'confiante' : mo >= 50 ? 'tranquilo' : 'abalado') + '</b>' +
          (nerv ? '<span><i></i>' + esc(last(nerv.n)) + ' está nervoso</span>' : cap ? '<span class="ok"><i></i>' + esc(last(cap.n)) + ' puxa o grupo</span>' : '') + '</div>' +
          '<span class="rs-gap"></span><button class="tm-b" id="ldp-skip">Não falar nada</button><button class="tm-go" id="ldp-go">Entrar em campo</button></div></div>', st => {
        st.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { sfx('tap'); pick = b.dataset.pk; draw(); });
        st.querySelectorAll('[data-pa]').forEach(b => b.onclick = () => { sfx('tap'); pick = K[Math.max(0, Math.min(2, i + +b.dataset.pa))]; draw(); });
        st.querySelector('#ldp-go').onclick = () => { sfx('tap'); c.play(pick); };
        st.querySelector('#ldp-skip').onclick = () => { sfx('tap'); c.play(null); };
      });
    };
    draw();
  }

  U.LD = { on, show, off, loja, escolher, semana, time, rail, head, pill, lbl, gold, pop, closePop, popHead, dot, spotsL, PITCH, cadHtml, tacPicker, liveHtml, livePaint, liveStop, livePlayer, result, segunda, caderno, tabela, clube, financas, elenco, FIN_TABS, reuniao, patrocinio, banco, temporada, propostas, welcome, funcoes, batedores, treino, olheiro, prelecao, mercado, mercadoRes, ficha, proposta, contrato };
  U.ldOff = () => { if (document.body.classList.contains('ld-on')) off(); };
})();
