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
  const RAIL = [['inicio', 'Início'], ['semana', 'Semana'], ['time', 'Time'], ['caderno', 'Caderno'], ['tabela', 'Tabela'], ['mercado', 'Mercado', 1], ['clube', 'Clube'], ['celular', 'Celular', 1]];
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
  // Círculo só com o número (tamanho fixo); nome e posição embaixo, fora do círculo
  function dot(p, slot, x, y, o) {
    o = o || {};
    const fitC = !slot || p.pos === slot ? 'ok' : (S.coFit(p.pos, slot) >= 0.88 ? 'sabe' : 'fora');
    const yc = C().pend(p) ? '<i class="ld-yc" title="Pendurado"></i>' : '';
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
    if (k === 'caderno') return caderno();
    if (k === 'tabela') return tabela();
    if (k === 'clube') return clube();
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
    finNews(co);
    const t = S.coTable(co), me = t.find(x => x.me), pos = S.coPos(co), B = co.board, conf = Math.round(B.conf);
    const f5 = f => { const a = (f || '').split('').slice(-5); while (a.length < 5) a.unshift('n'); return '<span class="ld-f5 sm-f5">' + a.map(x => '<i class="' + x + '"></i>').join('') + '</span>'; };
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const meta = B.goal.k === 'titulo' ? 'SER CAMPEÃO' : 'ATÉ O ' + ord(B.goal.pos);
    const top = '<div class="sm-h"><button class="tcr-back" id="sm-back" aria-label="Início">' + BK + '</button>' +
      '<b>' + ord(pos) + '</b><small>' + me.p + ' pts</small>' + f5(me.f) +
      '<em class="sm-tag' + (pos > (B.goal.k === 'titulo' ? 1 : B.goal.pos) ? ' hi' : '') + '" title="' + esc(S.CO_GOAL_TXT[B.goal.k]) + '">META · ' + meta + '</em><span class="ld-gr"></span>' +
      (B.ult ? '<em class="sm-tag ult">ULTIMATO · VENÇA ' + B.ult.need + ' DE ' + B.ult.of + '</em>' : '') +
      '<span class="sm-dir">Diretoria <em class="ld-bar"><u style="width:' + conf + '%" class="' + (conf >= 55 ? 'ok' : conf >= 35 ? 'mid' : 'low') + '"></u></em></span></div>';
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
    const nav = [['time', 'Time'], ['tabela', 'Tabela'], ['caderno', 'Caderno'], ['clube', 'Clube']].map(([k, n]) => '<button class="sm-nv" data-rail="' + k + '">' + n + '</button>').join('');
    show('<div class="sm' + (nx.bye ? ' bye' : '') + '">' + top + '<div class="sm-card">' + card + '</div>' + wk +
      '<nav class="sm-side" aria-label="Menu do técnico">' + nav + '<button class="tm-go" id="ld-play">' + (nx.bye ? 'Ver a rodada' : 'Jogar') + '</button></nav></div>', st => {
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
    let swap = null;
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
    // Vagas da escalação: x da formação, y usando o campo todo (o banco fica fora), linhas de 5 em zigue-zague
    const spotsT = f => { const sp = spotsL(f, false, true), sl = S.CO_FORMS[f].slots;
      return sp.map(([x], i) => { const ln = sl[i].ln, ix = sl.map((q, j) => j).filter(j => sl[j].ln === ln), n = ix.length, k = ix.indexOf(i);
        if (n === 1) return [x, 45];
        const step = Math.min(24, 72 / (n - 1));
        let nx5 = x;
        if (n === 5) { const base = k === 0 || k === 4 ? x - 10 : k === 2 && ln === 'm' ? x + 5 : x; nx5 = ln === 'd' ? base + (k === 0 || k === 4 ? 18 : k === 2 ? -3 : 9) : base + (k === 0 || k === 4 ? 12 : k === 2 ? 2 : -8); }
        return [nx5, Math.round(45 + (k - (n - 1) / 2) * step)]; }); };
    const fitOf = (p, s) => (p.pos === s ? 'ok' : S.coFit(p.pos, s) >= 0.88 ? 'sabe' : 'fora');
    let anim = 0;
    const draw = () => {
      clearTimeout(anim);
      const sl = S.coSlots(co.form), sp = spotsT(co.form);
      const bench = co.squad.filter(p => !co.xi.includes(p.id)).sort((a, b) => c.avail(b) - c.avail(a) || b.ovr - a.ovr);
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
      const bstrip = bench.map(p => '<button class="tm-bp' + (c.avail(p) ? '' : ' dis') + '" data-bp="' + p.id + '"' + (c.avail(p) ? '' : ' disabled') + '><b class="tm-ring ' + enRing(p.en) + '" style="--en:' + Math.round(p.en) + '">' + p.ovr + '</b><span><i>' + esc(last(p.n)) + '</i><small>' + p.pos + '</small></span></button>').join('');
      const pick = (k, l, v) => '<div class="tm-pk"><button class="tm-ar" data-tmk="' + k + '" data-d="-1" aria-label="' + l + ' anterior">' + BK + '</button><span><small>' + l + '</small><b id="tm-' + k + '">' + v + '</b></span><button class="tm-ar" data-tmk="' + k + '" data-d="1" aria-label="Próximo ' + l.toLowerCase() + '">' + FW + '</button></div>';
      const title = swap !== null ? '<span class="tm-hint">Toque no titular que troca de lugar com o ' + esc(last(by[co.xi[swap]].n)) + '</span>'
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
          if (swap === null) return subPop(i);
          if (swap !== i) { const t = co.xi[i]; co.xi[i] = co.xi[swap]; co.xi[swap] = t; co.autoXI = false; }
          swap = null; draw();
        });
        st.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => { sfx('tap'); benchPop(b.dataset.bp); });
        st.querySelectorAll('[data-tmk]').forEach(b => b.onclick = () => {
          sfx('tap'); const d = +b.dataset.d;
          if (b.dataset.tmk === 'sty') { const L = S.CO_STYLES; co.style = L[(L.indexOf(co.style) + d + L.length) % L.length]; st.querySelector('#tm-sty').textContent = S.CO_STY[co.style].name; return; }
          // Formação: os mesmos bonecos correm para as vagas novas e a tela se refaz depois
          const nf = FORMS[(FORMS.indexOf(co.form) + d + FORMS.length) % FORMS.length], xi = xiFor(nf), sl2 = S.coSlots(nf), sp2 = spotsT(nf);
          co.form = nf; co.xi = xi; swap = null; st.querySelector('#tm-form').textContent = nf;
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
          pop('<div class="acd-help"><b>Auxiliar</b><p>“' + aux + '”</p>' + (auxFix ? '<span class="hl-ab"><button class="hl-btn dark" id="ld-aux-y">Trocar</button><button class="hl-btn line" data-pop-x>Manter</button></span>' : '') +
            '<button class="tm-all" id="ld-auto">Usar a escalação dele inteira</button>' + (auxFix ? '' : '<button class="hl-btn line" data-pop-x>Fechar</button>') + '</div>', 'Auxiliar', w => {
            if (w.querySelector('#ld-aux-y')) w.querySelector('#ld-aux-y').onclick = () => { sfx('tap'); auxFix(); closePop(); draw(); };
            w.querySelector('#ld-auto').onclick = () => { sfx('tap'); const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.autoXI = true; swap = null; closePop(); draw(); };
          }, 'hl-pop acd-pop tm-pop'); };
        const done = () => { clearTimeout(anim); closePop(); c.keepBench(); c.save(); };
        st.querySelector('#tm-back').onclick = () => { sfx('tap'); done(); semana(); };
        if (st.querySelector('#ld-ok')) st.querySelector('#ld-ok').onclick = () => { sfx('tap'); done(); semana(); };
        if (st.querySelector('#ld-go')) st.querySelector('#ld-go').onclick = () => { sfx('tap'); done(); prelecao(); };
      });
    };
    // Status do jogador (números do próprio time) e quem pode entrar: mesma posição primeiro, a sugestão em dourado
    const stat = (k, v) => '<span class="ld-st1"><small>' + k + '</small><b>' + v + '</b></span>';
    const subPop = i => {
      const slot = S.coSlots(co.form)[i], cur = by[co.xi[i]];
      const rest = co.squad.filter(p => !co.xi.includes(p.id) && (p.pos === 'GOL') === (slot === 'GOL'));
      const rend = p => Math.round(p.ovr * S.coFit(p.pos, slot));
      const score = p => rend(p) * (0.6 + 0.4 * p.en / 100);
      const list = rest.sort((a, b) => c.avail(b) - c.avail(a) || score(b) - score(a)).slice(0, 5);
      const best = list.find(p => c.avail(p) && p.pos === slot) || list.find(c.avail);
      const fitTag = p => p.pos === slot ? ['ok', 'POSIÇÃO DELE'] : S.coFit(p.pos, slot) >= 0.88 ? ['sabe', 'CONHECE'] : ['fora', 'FORA DE POSIÇÃO'];
      const note = p => p.out ? 'lesionado, ' + U.D.plural(p.out, 'jogo', 'jogos') : p.sus ? c.susTxt(p) : [p.pos, p.age + ' anos', c.pend(p) ? 'pendurado' : '', p.mo < 45 ? 'chateado' : p.mo > 75 ? 'motivado' : ''].filter(Boolean).join(' · ');
      const row = p => { const [fc, ft] = fitTag(p);
        return '<button class="ld-cand' + (p === best ? ' best' : '') + (c.avail(p) ? '' : ' dis') + '" data-sub="' + p.id + '"' + (c.avail(p) ? '' : ' disabled') + '><i>' + p.ovr + '</i>' +
          '<span><b>' + esc(p.n) + (p === best ? ' <u>SUGESTÃO</u>' : '') + '</b><small>' + note(p) + '</small></span><span class="r"><em class="' + fc + '">' + ft + '</em><small>rende ' + rend(p) + ' · ' + Math.round(p.en) + '%</small></span></button>'; };
      const curFit = cur.pos === slot ? '' : '<em class="' + (S.coFit(cur.pos, slot) >= 0.88 ? 'sabe' : 'fora') + '">' + (S.coFit(cur.pos, slot) >= 0.88 ? 'CONHECE A ' : 'FORA DE POSIÇÃO NA ') + slot + '</em>';
      const lastN = (cur.notes || []).slice(-5);
      pop(popHead(slot + ': ' + esc(cur.n), 'Toque num nome para ele entrar. O jogo ainda não começou: troque à vontade.') +
        '<div class="ld-pb"><div class="ld-pl-l"><div class="ld-who"><div class="ld-who-h"><i>' + cur.ovr + '</i><span><b>' + esc(cur.n) + '</b><small>' + cur.age + ' anos · ' + c.posTxt[cur.pos].toLowerCase() + '</small></span>' +
          '<span class="ld-rend"><small>aqui rende</small><b class="' + (cur.pos === slot ? '' : 'warn') + '">' + rend(cur) + '</b></span></div>' + curFit +
          '<div class="ld-st4">' + stat('energia', Math.round(cur.en) + '%') + stat('moral', cur.mo >= 70 ? 'alta' : cur.mo >= 45 ? 'boa' : 'baixa') + stat('potencial', cur.pot) + stat('cartões', cur.yc || 0) + '</div>' +
          (lastN.length ? '<div class="ld-l5"><small>Últimos jogos</small>' + lastN.map(n => '<b>' + String(n).replace('.', ',') + '</b>').join('') + '</div>' : '') +
          '<small class="ld-wage">Contrato: ' + U.D.plural(cur.ct, 'ano', 'anos') + ' · salário ' + c.brl(cur.wage) + '/sem</small></div>' +
          '<button class="ld-b line" id="ld-swap">Trocar de lugar com outro titular</button></div>' +
        '<div class="ld-pl-r">' + lbl('QUEM PODE ENTRAR') + (list.length ? list.map(row).join('') : '<p class="ld-none">Ninguém no banco para essa vaga.</p>') +
          '<div class="ld-pf"><button class="ld-link" id="ld-all">Ver o elenco todo (' + rest.length + ')</button><span class="ld-gr"></span>' + (best ? '<button class="ld-gold sm" id="ld-put">Colocar o ' + esc(last(best.n)) + '</button>' : '') + '</div></div></div>',
        'Trocar ' + cur.n, w => {
          w.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sfx('tap'); co.xi[i] = b.dataset.sub; co.autoXI = false; closePop(); draw(); });
          w.querySelector('#ld-swap').onclick = () => { sfx('tap'); swap = i; closePop(); draw(); };
          if (w.querySelector('#ld-put')) w.querySelector('#ld-put').onclick = () => { sfx('tap'); co.xi[i] = best.id; co.autoXI = false; closePop(); draw(); };
          w.querySelector('#ld-all').onclick = () => { sfx('tap'); const all = rest.sort((a, b) => score(b) - score(a)); w.querySelector('.ld-pl-r').innerHTML = lbl('ELENCO TODO') + '<div class="ld-scroll">' + all.map(row).join('') + '</div>';
            w.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sfx('tap'); co.xi[i] = b.dataset.sub; co.autoXI = false; closePop(); draw(); }); };
        }, 'w750');
    };
    // Tocar num reserva: para qual vaga ele entra (a dele primeiro)
    const benchPop = id => {
      const p = by[id], sl = S.coSlots(co.form);
      const opts = co.xi.map((x, i) => [i, sl[i], by[x]]).filter(([, s]) => (s === 'GOL') === (p.pos === 'GOL')).sort((a, b) => S.coFit(p.pos, b[1]) - S.coFit(p.pos, a[1]) || (a[2].ovr * S.coFit(a[2].pos, a[1])) - (b[2].ovr * S.coFit(b[2].pos, b[1])));
      pop(popHead(esc(p.n) + ' · ' + p.pos, 'No lugar de quem ele entra?') + '<div class="ld-pb col">' + opts.slice(0, 6).map(([i, s, q]) => '<button class="ld-cand" data-in="' + i + '"><i>' + q.ovr + '</i><span><b>Sai ' + esc(q.n) + '</b><small>' + s + ' · energia ' + Math.round(q.en) + '%</small></span><span class="r"><em class="' + (p.pos === s ? 'ok' : S.coFit(p.pos, s) >= 0.88 ? 'sabe' : 'fora') + '">' + (p.pos === s ? 'POSIÇÃO DELE' : S.coFit(p.pos, s) >= 0.88 ? 'CONHECE' : 'FORA') + '</em><small>rende ' + Math.round(p.ovr * S.coFit(p.pos, s)) + '</small></span></button>').join('') + '</div>',
        'Colocar ' + p.n, w => { w.querySelectorAll('[data-in]').forEach(b => b.onclick = () => { sfx('tap'); co.xi[+b.dataset.in] = id; co.autoXI = false; closePop(); draw(); }); }, 'w560');
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
    const cad = o.them ? cadHtml(c.cadLines(pf, ps, o.them, 2)) : '';
    const them = o.them ? 'O ' + esc(club(o.them.club).short || club(o.them.club).name) + ' deve vir no ' + o.them.form + ', ' + esc(S.CO_STY[o.them.style].name.toLowerCase()) + '.' : '';
    const sub = o.live || them;
    const stip = S.CO_STY[ps].tip.split(';');
    const chip = (f, on, attr, t) => '<button class="ldx-chip' + (on ? ' on' : '') + '" ' + attr + '>' + t + '</button>';
    const posTxt = nOff ? U.D.plural(nOff, 'jogador fora da posição', 'jogadores fora da posição') : 'todo mundo na posição dele';
    const details = '<div class="ldx-det"' + (det ? '' : ' hidden') + '>' +
      '<div class="ldx-dh"><b>' + pf + ' com ' + esc(S.CO_STY[ps].name) + '</b><button class="ldx-chip" data-det="0">Voltar</button></div>' +
      '<div class="ldx-dg"><div class="ldx-dc"><small class="ldx-l up">ESTILO FORTE</small><p>' + esc(stip[0]) + '</p>' + (stip[1] ? '<small class="ldx-l dn">ESTILO FRACO</small><p>' + esc(stip[1].trim()) + '</p>' : '') +
      '<small class="ldx-l ' + (nOff ? 'or' : 'up') + '">POSIÇÕES</small><p>' + posTxt + '</p></div>' +
      '<div class="ldx-dc ldx-pp"><small class="ldx-l gd">DO SEU CADERNO</small>' + (them ? '<p>' + them + '</p>' : '') + (cad ? '<div class="ld-cadl">' + cad + '</div>' : '<p>Sem adversário para comparar.</p>') + '</div></div></div>';
    pop(popHead('Formação e estilo', sub, !!o.back) +
      '<div class="ldx-b"><div class="ldx-l1">' +
        '<div class="ldx-chips">' + shown.map(f => chip(f, f === pf, 'data-f="' + f + '"', f)).join('') + chip('', false, 'data-ft="' + (tab === 'main' ? 'mais' : 'main') + '"', tab === 'main' ? '+' + more.length : '‹ 4 atrás') + '</div>' +
        '<div class="ld-mini ldx-pitch">' + PITCH + prev + '<button class="ld-favb' + (fav[pf] ? ' on' : '') + '" data-fav="' + pf + '">' + (fav[pf] ? '★ Favorita' : '☆ Favoritar') + '</button></div>' +
        '<p class="ldx-ft"><b>' + pf + '</b> ' + esc(c.FORM_TIP[pf] || '') + (nOff ? ' · <b class="or">' + posTxt + '</b>' : '') + '</p></div>' +
      '<div class="ldx-r"><small class="ldx-l">ESTILO</small><div class="ldx-sg">' + S.CO_STYLES.map(k => chip(k, k === ps, 'data-s="' + k + '"', STY_CHIP[k] || esc(S.CO_STY[k].name))).join('') + '</div>' +
        '<p class="ldx-st"><b class="up">FORTE</b> ' + esc(stip[0].trim()) + (stip[1] ? '<br><b class="dn">FRACO</b> ' + esc(stip[1].trim()) : '') + '</p><button class="ldx-a" data-det="1">Ver no caderno e posições ›</button>' +
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
  // A parada (gol, intervalo, vermelho, lesão, "Parar e mexer"): TrParadaB, em três colunas
  function liveStop(x, st) {
    const m = x.m, s = m.us, c = C(), co = c.co, by = byOf(s.squad), half = st.t === 'intervalo', us = st.s === 'us';
    const sel = new Set(); let talk = null, tacDone = false;
    // Sugestões de troca: cansado, amarelado ou machucado, com o melhor do banco na mesma vaga
    const sugg = () => {
      const out = [], used = new Set();
      s.xi.map((id, i) => [by[id], i]).filter(([p]) => p && (p.out || p.en < 58 || (s.bk && s.bk[p.id]))).sort((a, b) => (b[0].out ? 1 : 0) - (a[0].out ? 1 : 0) || a[0].en - b[0].en).forEach(([p, i]) => {
        if (out.length >= 2 || !s.subs) return;
        const slot = S.coSlots(s.form)[i];
        const inn = s.bench.map(b => by[b]).filter(q => q && c.avail(q) && !used.has(q.id) && (q.pos === 'GOL') === (slot === 'GOL')).sort((a, b) => b.ovr * S.coFit(b.pos, slot) - a.ovr * S.coFit(a.pos, slot))[0];
        if (!inn) return; used.add(inn.id);
        out.push({ o: p, i: inn, why: p.out ? 'machucado' : s.bk && s.bk[p.id] && p.en < 58 ? Math.round(p.en) + '% de energia e amarelado' : s.bk && s.bk[p.id] ? 'tem amarelo' : Math.round(p.en) + '% de energia' });
      });
      return out;
    };
    const draw = () => {
      const r = x.read, sg = sugg(), sh = m.sh || { us: 0, them: 0 };
      const T = { gol: 'Gol do ' + (us ? c.nm(co.club) : c.nm(m.vs)), intervalo: 'Intervalo', vermelho: 'Expulso', lesao: 'Lesão', pausa: 'Jogo parado' }[st.t] || 'Parada';
      const txt = st.t === 'gol' ? esc(st.p || '') + ' marca' + (st.l ? ' ' + c.LANE[st.l] : '') + '.' :
        half ? (m.gh + m.ga ? '' : 'Ninguém marcou. ') + (S.coPoss(m) > 0.53 ? 'Você manda no jogo.' : S.coPoss(m) < 0.47 ? 'Eles mandam no jogo.' : 'Jogo parelho.') :
        st.t === 'vermelho' ? esc(st.p || '') + (st.how === '2am' ? ' leva o segundo amarelo.' : ' leva vermelho direto.') + ' Você joga com 10 até o fim.' :
        st.t === 'lesao' ? esc(st.p || '') + ' não aguenta. Troque ou ele joga mancando.' : 'O jogo espera você.';
      const ps = Math.round(S.coPoss(m) * 100), en = Math.round(s.xi.reduce((a, id) => a + (by[id] ? by[id].en : 0), 0) / Math.max(1, s.xi.filter(Boolean).length));
      const left = (half ? lbl('O 1º TEMPO') + '<div class="ldl-mom">' + U.lvMom(m) + '</div>' +
          '<div class="ldl-3"><span><b>' + sh.us + ' x ' + sh.them + '</b><small>chutes</small></span><span><b>' + ps + '%</b><small>posse</small></span><span class="' + (en < 60 ? 'warn' : '') + '"><b>' + en + '%</b><small>energia</small></span></div>'
        : '<div class="ldl-ev ' + (st.t === 'gol' && !us || st.t === 'vermelho' || st.t === 'lesao' ? 'bad' : st.t === 'gol' ? 'good' : '') + '"><small>' + S.coClock(m) + ' · ' + esc(T.toUpperCase()) + '</small><b>' + (st.t === 'vermelho' ? '<span class="co-red"></span> ' : '') + esc(st.t === 'vermelho' ? (st.p || '') + ' foi expulso' : T) + '</b><span>' + txt + '</span></div>') +
        (st.t === 'vermelho' ? '<div class="ldl-red">' + x.redOpts(st) + '</div>' : '<div class="ldl-aq">' + lbl('O AUXILIAR LEU ASSIM') + '"' + esc(r.txt) + '"' + (r.tags.length ? '<span class="ldl-tags">' + r.tags.map(t => '<em>' + esc(t) + '</em>').join('') + '</span>' : '') + '</div>');
      const selB = (id, l, v) => '<button class="ldl-sel" id="' + id + '"><small>' + l + '</small><b>' + v + '</b>' + CHEV + '</button>';
      const cad = cadHtml(c.cadLines(s.form, s.style, m.them, 1));
      const mid = lbl('MEXER NO TIME') + selB('ldl-f', 'Formação', s.form) + selB('ldl-s', 'Estilo', esc(S.CO_STY[s.style].name)) +
        '<div class="ldl-trh">' + lbl('TROCAS') + '<small>' + (s.subs ? s.subs + ' sobrando' : 'sem trocas') + '</small></div>' +
        (sg.length ? sg.map((g, k) => '<button class="ldl-sg' + (sel.has(k) ? ' on' : '') + '" data-sg="' + k + '"><span><b>' + (g.o.num || '') + ' ' + esc(c.last(g.o.n)) + ' → ' + (g.i.num || '') + ' ' + esc(c.last(g.i.n)) + '</b><small>' + g.why + '</small></span><i aria-hidden="true">' + (sel.has(k) ? '✓' : '') + '</i></button>').join('') : '<p class="ld-none">Ninguém cansado ou com amarelo. Toque abaixo para trocar mesmo assim.</p>') +
        (s.subs ? '<button class="ld-link" id="ldl-other">Outra troca (banco com ' + s.bench.length + ')</button>' : '') +
        '<span class="ld-gr"></span>' + (cad ? '<div class="ld-cadl ldl-cad">' + lbl('DO SEU CADERNO') + cad + '</div>' : '');
      const mo = Math.round(s.xi.reduce((a, id) => a + (by[id] ? (by[id].mo === undefined ? 60 : by[id].mo) : 0), 0) / Math.max(1, s.xi.filter(Boolean).length));
      const tst = S.coTalkState(m);
      const CAP = { win: '"Eles cansam no fim, professor. Dá pra matar o jogo."', draw: '"Falta pouco pra virar esse jogo. A gente sente."', lose: '"A gente está devendo. Dá pra buscar."' };
      const capP = by[co.cap] || s.xi.map(id => by[id]).filter(Boolean).sort((a, b) => b.age - a.age)[0];
      const right = half ? lbl('VESTIÁRIO · VALE ATÉ 60\'') + '<div class="ld-seg ldl-talk">' + Object.keys(S.CO_TALK).map(k => '<button data-tk="' + k + '"' + (talk === k ? ' class="on"' : '') + '>' + S.CO_TALK[k].name + '</button>').join('') + '</div>' +
          '<p class="ldl-tt">' + (talk ? esc(S.CO_TALK[talk].name) + ': ' + esc(S.CO_TALK[talk].tip[tst]) : 'Escolha o tom da conversa. Ou não fale nada.') + '</p>' +
          '<div class="ldl-clima"><span><small>Clima do grupo</small><b>' + (mo >= 70 ? 'confiante' : mo >= 50 ? 'tranquilo' : 'abalado') + '</b></span>' + (capP ? '<p><b>' + esc(c.last(capP.n)) + ', o capitão:</b> ' + CAP[tst] + '</p>' : '') + '</div>'
        : lbl('O QUE ACONTECEU') + '<ul class="ldl-last">' + m.ev.filter(e => e.t !== 'grito-fim').slice(-5).reverse().map(e => x.feedLine(e)).join('') + '</ul>';
      pop('<div class="ldl-sth"><b>' + esc(T) + '</b><span class="ldl-sc">' + esc(c.nm(m.home ? co.club : m.vs)).slice(0, 3).toUpperCase() + ' ' + m.gh + ' x ' + m.ga + ' ' + esc(c.nm(m.home ? m.vs : co.club)).slice(0, 3).toUpperCase() + '</span><small>' + m.min + '\'</small></div>' +
        '<div class="ldl-3c"><div>' + left + '</div><div>' + mid + '</div><div>' + right + '<span class="ld-gr"></span><button class="ld-gold" id="ldl-go"><b>' + (half ? '▸ Começar o 2º tempo' : '▸ Seguir o jogo') + '</b></button></div></div>',
        T, w => {
          w.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => { sfx('tap'); const k = +b.dataset.sg; if (sel.has(k)) sel.delete(k); else sel.add(k); draw(); });
          w.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { sfx('tap'); talk = talk === b.dataset.tk ? null : b.dataset.tk; draw(); });
          w.querySelectorAll('[data-ro]').forEach(b => b.onclick = () => { sfx('tap'); x.redPick(b.dataset.ro); draw(); });
          const tac = () => tacPicker({ form: s.form, style: s.style, squad: s.squad.filter(p => s.xi.includes(p.id)), xi: s.xi.filter(Boolean), auto: false, them: m.them,
            live: 'Eles agora: ' + m.them.form + ', ' + esc(S.CO_STY[m.them.style].name.toLowerCase()) + '. Os mesmos jogadores mudam de vaga.', back: draw,
            onOk: (f, y) => { x.tac(f, y); tacDone = true; draw(); } });
          w.querySelector('#ldl-f').onclick = () => { sfx('tap'); tac(); };
          w.querySelector('#ldl-s').onclick = () => { sfx('tap'); tac(); };
          if (w.querySelector('#ldl-other')) w.querySelector('#ldl-other').onclick = () => { sfx('tap'); liveWho(x, draw); };
          w.querySelector('#ldl-go').onclick = () => {
            sfx('tap');
            sugg().forEach((g, k) => { if (sel.has(k)) x.sub(g.o.id, g.i.id); });
            if (half && talk) x.talk(talk);
            closePop(); x.resume();
          };
        }, 'w820 ldl-stp', true);
    };
    draw();
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
      return { big, ck };
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
    // As notas mostradas: as duas melhores, a pior e mais uma
    const top = rt.length > 4 ? rt.slice(0, 3).concat([rt[rt.length - 1]]) : rt;
    const pos = S.coPos(co), B = co.board, dc = pre.conf !== undefined ? B.conf - pre.conf : 0;
    const chg = [['Tabela', pre.pos ? ord(pre.pos) + (pre.pos !== pos ? ' → ' + ord(pos) : ' (igual)') + ' · ' + (S.coTable(co).find(x => x.me) || {}).p + ' pts' : ord(pos)],
      ['Diretoria', co.sacked ? 'demitido' : dc > 1 ? 'confiança subiu' : dc < -1 ? 'confiança caiu' : 'confiança igual', dc > 1 ? 'up' : dc < -1 ? 'dn' : ''],
      co.fin && pre.caixa !== null && pre.caixa !== undefined ? ['Caixa', (co.fin.caixa - pre.caixa >= 0 ? '+ ' : '− ') + c.brl(Math.abs(co.fin.caixa - pre.caixa)), co.fin.caixa - pre.caixa >= 0 ? 'up' : 'dn'] : null,
      B.ult ? ['Ultimato', B.ult.got + ' de ' + B.ult.need + ' vitórias · ' + (B.ult.of - B.ult.n) + ' jogos', 'dn'] : (log.ycOut || []).length ? ['Suspenso', log.ycOut.map(last).join(', '), 'dn'] : null].filter(Boolean);
    const cadN = log.cad && log.cad.notes ? log.cad.notes : [];
    const cadTxt = n => { const [a, b] = n.ab.split('|'), nmK = x => (n.k === 'sty' ? S.CO_STY[x].name : x);
      return '<p><b>' + (n.pen ? 'Certeza (viu 2 vezes):' : 'Pode errar (viu 1 vez):') + '</b> ' + esc(nmK(a)) + ' contra ' + esc(nmK(b)) + ' ' + (n.v === 'up' ? 'deu certo.' : n.v === 'down' ? 'sofreu.' : 'ficou parelho.') + '</p>'; };
    const draw = () => {
      const nums = matchNums(m);
      const bar = ([k, a, b, suf, inv, cards]) => { const t = (a + b) || 1, good = inv ? a <= b : a >= b;
        return '<div class="ldr-r"><b>' + a + (suf || '') + (cards ? ' ' + '<i class="y"></i>'.repeat(Math.min(3, cards[0] || 0)) + '<i class="r"></i>'.repeat(cards[1] || 0) : '') + '</b><span><small>' + k + '</small><i><u class="' + (good ? 'up' : 'dn') + '" style="width:' + Math.round(a / t * 100) + '%"></u><u class="th" style="width:' + Math.round(b / t * 100) + '%"></u></i></span><b>' + b + (suf || '') + (cards ? ' ' + '<i class="y"></i>'.repeat(Math.min(3, cards[2] || 0)) + '<i class="r"></i>'.repeat(cards[3] || 0) : '') + '</b></div>'; };
      const pane = tab === 'num' ? '<div class="ldr-nums">' + nums.map(bar).join('') + '</div>' :
        tab === 'mom' ? '<div class="ldr-mom">' + U.lvMom(m, move !== null && move !== undefined ? move : null) + '</div><div class="ldr-momf"><small>0\'</small><small>' + (move !== null && move !== undefined ? 'sua mudança aos ' + move + '\'' : 'quem mandou: acima é você') + '</small><small>90\'</small></div>' +
          '<ul class="ldl-last ldr-key">' + m.ev.filter(e => e.t === 'gol' || e.t === 'vermelho' || (e.s === 'us' && (e.t === 'tatica' || e.t === 'troca' || e.t === 'grito' || e.t === 'conversa'))).slice(0, 9).map(e => c.feedLine(m, e)).join('') + '</ul>' :
        '<ul class="ldl-last ldr-all">' + m.ev.filter(e => e.t !== 'grito-fim').map(e => c.feedLine(m, e)).join('') + '</ul>';
      show('<div class="ldr">' +
        '<div class="ldr-l"><div class="ldr-sc">' + crest((m.home ? cl : vs).id, 'ldr-cr') + '<em>' + m.gh + ' <i>x</i> ' + m.ga + '</em>' + crest((m.home ? vs : cl).id, 'ldr-cr') +
          '<span class="ldr-w"><b class="' + log.res + '">' + word + (aux ? ' · COM O AUXILIAR' : '') + '</b><small>' + (goals.length ? goals.join(' · ') : 'sem gols') + '</small></span></div>' +
          '<div class="ld-seg ldr-tabs">' + [['num', 'Números'], ['mom', 'Quem mandou'], ['lan', 'Lances']].map(([k, t]) => '<button data-rt="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
          '<div class="ldr-pane">' + pane + '</div></div>' +
        '<div class="ldr-m">' + lbl('NOTAS DO SEU TIME') + top.map(nota).join('') + (rt.length > top.length ? '<button class="ld-link" id="ldr-all">Ver as ' + rt.length + ' notas</button>' : '') + '<span class="ld-gr"></span>' +
          (cadN.length ? '<div class="ldr-cad">' + lbl('ANOTADO NO CADERNO') + cadN.map(cadTxt).join('') + '</div>' : '') + '</div>' +
        '<div class="ldr-r3">' + lbl('O QUE MUDOU') + chg.map(([k, v, cc]) => '<div class="ldr-ch"><small>' + k + '</small><b class="' + (cc || '') + '">' + esc(v) + '</b></div>').join('') + '<span class="ld-gr"></span>' +
          gold('ldr-go', co.sacked ? 'Falar com o presidente' : co.ss.done ? 'Fim da temporada' : 'Continuar', co.sacked ? '' : co.ss.done ? 'ver como terminou' : 'vai para a segunda-feira') + '</div></div>', st => {
        st.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { sfx('tap'); tab = b.dataset.rt; draw(); });
        if (st.querySelector('#ldr-all')) st.querySelector('#ldr-all').onclick = () => { sfx('tap'); pop(popHead('Notas do jogo', 'Rodada ' + log.r + ' · ' + m.gh + ' x ' + m.ga) + '<div class="ld-pb col"><div class="ld-scroll ldr-alln">' + rt.map(nota).join('') + '</div></div>', 'Notas do jogo', null, 'w560'); };
        st.querySelector('#ldr-go').onclick = () => { sfx('tap'); if (co.sacked) { off(); return c.sacked(); } if (co.ss.done) { off(); return c.finishSeason(); } segunda(log); };
      });
    };
    draw();
  }

  // ---------- Segunda-feira (38): quem fica fora, a moral, o próximo jogo e quem quer conversar ----------
  function segunda(log) {
    const c = C(), co = c.co, nx = S.coNext(co);
    if (!nx) { off(); return c.finishSeason(); }
    c.save('hub');
    const by = {}; co.squad.forEach(p => { by[p.id] = p; });
    const cl = club(co.club), avg = S.coTeamAvg(co), t = S.coTable(co).find(x => x.me);
    const out = co.squad.filter(p => p.out || p.sus).slice(0, 3);
    const rt = (log && log.rt) || [];
    const mood = [];
    const up = rt.find(x => x.r >= 7.5), dn = rt.slice().reverse().find(x => x.r < 5.6);
    if (up && by[up.id]) mood.push([by[up.id], 'up', '↑ SUBIU', up.w]);
    if (dn && by[dn.id]) mood.push([by[dn.id], 'dn', '↓ CAIU', 'nota ' + dn.r.toFixed(1).replace('.', ',') + ', ' + dn.w]);
    const want = co.squad.filter(p => c.avail(p) && (p.bn || 0) >= 3 && p.ovr >= avg - 3 && p.pos !== 'GOL').sort((a, b) => b.bn - a.bn)[0];
    if (want) mood.push([want, 'wa', 'QUER JOGAR', U.D.plural(want.bn, 'jogo', 'jogos') + ' no banco']);
    const broke = co.squad.find(p => p.broke); if (broke) { mood.push([broke, 'dn', 'PROMESSA', 'você prometeu chance e não deu']); delete broke.broke; }
    // Quem quer conversar: o mais chateado (moral baixa), uma vez a cada 4 rodadas
    const talker = co.squad.filter(p => (p.mo === undefined ? 60 : p.mo) < 42 && !(p.talked !== undefined && co.ss.i - p.talked < 4)).sort((a, b) => a.mo - b.mo)[0];
    const pend = co.squad.filter(p => c.pend(p) && c.avail(p)).slice(0, 3), tired = co.squad.filter(p => c.avail(p) && p.en < 70).sort((a, b) => a.en - b.en).slice(0, 3);
    const row = (p, cls, tag, sub) => '<div class="ldg-p"><i>' + (p.num || p.ovr) + '</i><span><b>' + esc(p.n) + '</b><small>' + esc(sub) + '</small></span><em class="' + cls + '">' + tag + '</em></div>';
    const vs = !nx.bye && club(nx.vs);
    const tip = tired.length >= 3 ? 'Tem gente cansada. O auxiliar sugere poupar o ' + esc(last(tired[0].n)) + '.' : out.length ? 'Sem o ' + esc(last(out[0].n)) + ', vale olhar o banco.' : 'Time inteiro para a próxima.';
    show(rail('semana') + '<div class="ld-col">' + head('Segunda-feira', log ? 'Depois do ' + log.gf + ' x ' + log.ga + (log.home ? ' em casa' : ' fora') + ' contra o ' + esc(c.nm(log.vs)) : esc(cl.name), pill(ord(S.coPos(co)) + ' · ' + t.p + ' PTS')) +
      '<div class="ld-row ldg">' +
      '<div class="ldg-c">' + '<div class="ldg-b">' + lbl('FORA DO PRÓXIMO JOGO') + (out.length ? out.map(p => row(p, p.sus ? 'sus' : 'les', p.sus ? 'SUSPENSO' : 'LESIONADO', p.sus ? c.susTxt(p) : 'lesionado · ' + U.D.plural(p.out, 'jogo', 'jogos'))).join('') : '<p class="ld-none">Ninguém. Time inteiro à disposição.</p>') + '</div>' +
        '<div class="ldg-b">' + lbl('MORAL') + (mood.length ? mood.slice(0, 3).map(([p, cc, tg, sb]) => row(p, cc, tg, sb)).join('') : '<p class="ld-none">Grupo tranquilo, ninguém subiu nem caiu muito.</p>') + '</div></div>' +
      '<div class="ldg-c ldg-b">' + lbl('PARA A SEMANA') +
        (pend.length ? '<small class="ldg-s">Pendurados: um amarelo e ficam fora</small>' + pend.map(p => row(p, 'sus', 'PENDURADO', c.posTxt[p.pos].toLowerCase())).join('') : '') +
        (tired.length ? '<small class="ldg-s">Cansados</small>' + tired.map(p => row(p, 'wa', Math.round(p.en) + '%', c.posTxt[p.pos].toLowerCase())).join('') : '') +
        (!pend.length && !tired.length ? '<p class="ld-none">Ninguém pendurado nem cansado.</p>' : '') + '</div>' +
      '<div class="ldg-c ldg-r">' + '<div class="ldg-nx">' + lbl('PRÓXIMO JOGO') + (vs ? '<div class="ldg-nh">' + crest(vs.id, 'ld-cr') + '<b>' + esc(vs.short || vs.name) + ', ' + (nx.home ? 'em casa' : 'fora') + '</b></div><small>Rodada ' + nx.round + ' de ' + nx.of + '</small>' : '<b>Sem jogo nesta rodada</b>') + '<p>' + tip + '</p></div>' +
        (talker ? '<button class="ldg-talk" id="ldg-talk"><i>' + (talker.num || talker.ovr) + '</i><span><b>' + esc(last(talker.n)) + ' quer conversar</b><small>' + (talker.bn >= 2 ? 'cansou de ficar no banco' : 'anda chateado') + '</small></span>' + CHEV + '</button>' : '') +
        '<span class="ld-gr"></span>' + gold('ldg-go', 'Começar a semana') + '</div></div></div>', st => {
      st.querySelector('#ldg-go').onclick = () => { sfx('tap'); semana(); };
      if (talker) st.querySelector('#ldg-talk').onclick = () => { sfx('tap'); talkPop(talker, log); };
    });
  }
  function talkPop(p, log) {
    const c = C(), co = c.co;
    pop(popHead(esc(p.n) + ' quer conversar', '"' + (p.bn >= 2 ? 'Professor, estou treinando bem e não entro. O que eu preciso fazer?' : 'Professor, não estou feliz aqui. Queria entender o meu papel.') + '"') +
      '<div class="ld-pb col">' + Object.keys(S.CO_TALK1).map(k => '<button class="ld-cand" data-t1="' + k + '"><span><b>' + S.CO_TALK1[k].name + '</b><small>' + S.CO_TALK1[k].tip + '</small></span></button>').join('') + '</div>',
      'Conversa', w => { w.querySelectorAll('[data-t1]').forEach(b => b.onclick = () => { sfx('tap'); S.coTalk1(co, p.id, b.dataset.t1); c.save(); closePop(); segunda(log); }); }, 'w560');
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
    if (tab === 'cls' || tab === 'gol') {
      body = '<div class="ldt-t ' + tab + '"><div class="ldt-h"><i></i><span>CLUBE</span>' + (tab === 'cls' ? '<em>J</em><em>V</em><em>E</em><em>D</em><em>SG</em><b>PTS</b><em class="f">FORMA</em>' : '<em>GP</em><em>GC</em><em>SG</em><em class="f">FORMA</em>') + '</div><div class="ldt-b">' +
        t.map((x, k) => { const sg = x.gp - x.gc, cl = club(x.id);
          return '<div class="ldt-r ' + zone(k + 1) + (x.me ? ' me' : '') + '"><i>' + (k + 1) + '</i><span>' + crest(x.id, 'ldt-cr') + esc(cl.short || cl.name) + '</span>' +
            (tab === 'cls' ? '<em>' + x.j + '</em><em>' + x.v + '</em><em>' + x.e + '</em><em>' + x.d + '</em><em>' + (sg > 0 ? '+' : '') + sg + '</em><b>' + x.p + '</b>' : '<em>' + x.gp + '</em><em>' + x.gc + '</em><em>' + (sg > 0 ? '+' : '') + sg + '</em>') + '<em class="f">' + dots(x.f) + '</em></div>'; }).join('') + '</div></div>';
    } else if (tab === 'art') {
      const g = {}; (ss.log || []).forEach(l => (l.ev || []).forEach(nm => { g[nm] = (g[nm] || 0) + 1; }));
      const list = Object.keys(g).sort((a, b) => g[b] - g[a]);
      body = '<div class="ldt-t"><div class="ldt-h"><i></i><span>ARTILHARIA DO SEU TIME</span><b>GOLS</b></div><div class="ldt-b">' + (list.length ? list.map((nm, k) => { const p = co.squad.find(q => q.n === nm);
        return '<div class="ldt-r"><i>' + (k + 1) + '</i><span>' + esc(nm) + (p ? ' <small>' + p.pos + '</small>' : ' <small>saiu</small>') + '</span><b>' + g[nm] + '</b></div>'; }).join('') : '<p class="ld-none">Ninguém marcou ainda.</p>') + '</div></div>';
    } else {
      const res = (ss.res || [])[rd], played = rd < ss.i, mi = ss.ids.indexOf(co.club);
      const list = (played && res ? res.slice() : ss.rounds[rd].map(([h, a]) => [h, a])).sort((a, b) => (b[0] === mi || b[1] === mi) - (a[0] === mi || a[1] === mi));
      const nmI = i => esc(club(ss.ids[i]).short || club(ss.ids[i]).name);
      body = '<div class="ldt-t"><div class="ldt-nav"><button id="ldt-prev"' + (rd ? '' : ' disabled') + ' aria-label="Rodada anterior">‹</button><b>Rodada ' + (rd + 1) + ' de ' + R + (played ? '' : ' · a jogar') + '</b><button id="ldt-next"' + (rd < R - 1 ? '' : ' disabled') + ' aria-label="Próxima rodada">›</button></div><div class="ldt-b ldt-games">' +
        list.map(([h, a, gh, ga]) => '<div class="ldt-gm' + (h === mi || a === mi ? ' me' : '') + '"><span class="h">' + nmI(h) + crest(ss.ids[h], 'ldt-cr') + '</span><b>' + (gh != null ? gh + ' × ' + ga : '×') + '</b><span>' + crest(ss.ids[a], 'ldt-cr') + nmI(a) + '</span></div>').join('') + '</div></div>';
    }
    // A sua corrida: a meta da diretoria em pontos
    const gp = B.goal.pos, tgt = t[gp - 1], nxt = t[gp];
    const race = me.j === 0 ? 'a temporada começa agora' : B.goal.k === 'titulo' ? (pos === 1 ? (t[1] ? (me.p - t[1].p) + ' pontos à frente do 2º' : 'na frente') : (t[0].p - me.p) + ' pontos do líder')
      : pos <= gp ? (nxt ? (me.p - nxt.p === 0 ? 'empatado com o ' + (gp + 1) + 'º' : (me.p - nxt.p) + ' pontos à frente do ' + (gp + 1) + 'º') : 'dentro da meta') : (tgt.p - me.p) + ' pontos do ' + gp + 'º';
    const fut = []; const mi2 = ss.ids.indexOf(co.club);
    for (let i = ss.i; i < Math.min(R, ss.i + 3); i++) { const g = ss.rounds[i].find(([h, a]) => h === mi2 || a === mi2); if (!g) { fut.push('<div class="ldt-nx"><b>folga</b></div>'); continue; } const hm = g[0] === mi2, id = ss.ids[hm ? g[1] : g[0]]; fut.push('<div class="ldt-nx">' + crest(id, 'ldt-cr') + '<b>' + esc(club(id).short || club(id).name) + '</b><small>' + (hm ? 'casa' : 'fora') + '</small></div>'); }
    show(rail('tabela') + '<div class="ld-col">' + head(esc(ss.name), (ss.done ? 'Encerrada' : 'Rodada ' + Math.min(ss.i + 1, R) + ' de ' + R) + (ss.promo ? ' · sobem ' + ss.promo : '') + (ss.releg ? ', caem ' + ss.releg : ''),
        '<div class="ld-seg ldc-tabs">' + [['cls', 'Classificação'], ['gol', 'Gols e forma'], ['art', 'Artilharia'], ['rod', 'Rodadas']].map(([k, tt]) => '<button data-tb="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + tt + '</button>').join('') + '</div>') +
      '<div class="ld-row"><div class="ldt-l">' + body + '</div><div class="ldt-side"><div class="ldt-race">' + lbl('SUA CORRIDA') + '<b>' + race + '</b><small>Meta da diretoria: ' + esc(S.CO_GOAL_TXT[B.goal.k]) + (B.goal.k === 'titulo' ? '' : ' (até o ' + gp + 'º)') + '. Você está em ' + pos + 'º.</small></div>' +
        (fut.length ? '<div class="ldt-fut">' + lbl('PRÓXIMOS ' + fut.length) + fut.join('') + '</div>' : '') + '<span class="ld-gr"></span>' + gold('ldt-go', 'Voltar para a semana') + '</div></div></div>', st => {
      st.querySelectorAll('[data-tb]').forEach(b => b.onclick = () => { sfx('tap'); tabela(b.dataset.tb, rd); });
      if (st.querySelector('#ldt-prev')) { st.querySelector('#ldt-prev').onclick = () => { sfx('tap'); tabela('rod', rd - 1); }; st.querySelector('#ldt-next').onclick = () => { sfx('tap'); tabela('rod', rd + 1); }; }
      st.querySelector('#ldt-go').onclick = () => { sfx('tap'); semana(); };
      const me2 = st.querySelector('.ldt-r.me'); if (me2) me2.scrollIntoView({ block: 'center' });
    });
  }

  // ---------- Clube deitado (20): a central do clube em blocos; o que ainda não existe fica "em breve" ----------
  function clube() {
    const c = C(), co = c.co, cl = club(co.club), f = S.coFin(co), B = co.board, pos = S.coPos(co), conf = Math.round(B.conf);
    const exp = co.squad.filter(p => p.ct <= 1).length, folha = S.coFolha(co);
    const tile = (id, t, sub, soon) => soon ? '<div class="ldk-t soon"><b>' + t + '</b><small>EM BREVE · ' + sub + '</small></div>' : '<button class="ldk-t" data-k="' + id + '"><b>' + t + '</b><small>' + sub + '</small></button>';
    const pr = c.finPres(f);
    show(rail('clube') + '<div class="ld-col">' +
      '<div class="ldk-h">' + crest(cl.id, 'ldk-cr') + '<span><b>' + esc(cl.name) + '</b><small>' + esc(co.ss ? co.ss.name : '') + ' · ' + esc(co.name) + ' · fama ' + co.fame + ' · ' + (co.season + 1) + 'ª temporada</small></span></div>' +
      '<div class="ld-row"><div class="ldk-g">' +
        tile('fin', 'Finanças', 'Caixa ' + c.brl(f.caixa) + ' · verba ' + c.brl(f.verba)) + tile('ele', 'Elenco e contratos', exp ? U.D.plural(exp, 'contrato acaba', 'contratos acabam') + ' no fim do ano' : co.squad.length + ' jogadores') + tile('', 'Mercado', 'comprar, vender, emprestar', 1) +
        tile('', 'Estádio e ingresso', 'preço por jogo, obras', 1) + tile('', 'Base', 'garotos que sobem em janeiro', 1) + tile('', 'Equipe técnica', 'olheiro, preparador, médico', 1) +
        tile('', 'Imprensa', 'coletiva antes e depois', 1) + tile('tro', 'Sala de troféus', co.titles.length ? U.D.plural(co.titles.length, 'título', 'títulos') : 'nenhum título ainda') + tile('hall', 'Hall do técnico', U.D.plural(co.hist.length, 'temporada', 'temporadas') + ' de carreira') + '</div>' +
      '<div class="ldk-side"><div class="ldk-dir">' + lbl('DIRETORIA') + '<b>' + (conf >= 70 ? 'Confiança alta' : conf >= 45 ? 'Confiança boa' : conf >= 30 ? 'Confiança baixa' : 'No limite') + '</b><em class="ld-bar"><u class="' + (conf >= 55 ? 'ok' : conf >= 35 ? 'mid' : 'low') + '" style="width:' + conf + '%"></u></em>' +
          '<small>Meta: ' + esc(S.CO_GOAL_TXT[B.goal.k]) + (B.goal.k === 'titulo' ? '' : ' (até o ' + B.goal.pos + 'º)') + '. Hoje: ' + pos + 'º.</small><i>' + pr[0] + ' · ' + (S.coPres ? esc(S.coPres(co).n) + ', presidente ' + S.coPres(co).nome : 'presidente') + '</i></div>' +
        '<div class="ldk-cx">' + lbl('CAIXA') + '<b class="' + (f.caixa < 0 ? 'dn' : '') + '">' + c.brl(f.caixa) + '</b><small>folha ' + c.brl(folha) + ' por semana</small></div><span class="ld-gr"></span>' +
        gold('ldk-go', 'Ver as finanças') + '</div></div></div>', st => {
      st.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.k; if (k === 'fin') financas(); else if (k === 'ele') elenco(); else if (k === 'tro') trofeus(); else if (k === 'hall') hall(); });
      st.querySelector('#ldk-go').onclick = () => { sfx('tap'); financas(); };
    });
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
  function financas(tab) {
    const c = C(), co = c.co, f = S.coFin(co), folha = S.coFolha(co), wk = S.coFinSemanas(co), pct = Math.min(100, Math.round(100 * folha / Math.max(1, f.teto)));
    tab = tab || FIN_TABS[0].k; const T = FIN_TABS.find(x => x.k === tab) || FIN_TABS[0];
    show(rail('clube') + '<div class="ld-col">' + head('Finanças', esc(club(co.club).short || club(co.club).name) + ' · ' + (U.YEAR0 + co.season), '<div class="ld-seg ldc-tabs">' + FIN_TABS.map(x => '<button data-ft="' + x.k + '"' + (x.k === tab ? ' class="on"' : '') + '>' + x.t + '</button>').join('') + '</div>') +
      '<div class="ld-row"><div class="ldf-l">' + T.html(c, co, f) + '</div><div class="ldf-side">' +
        '<div class="ldk-cx paper">' + lbl('CAIXA DO CLUBE') + '<b class="' + (f.caixa < 0 ? 'dn' : '') + '">' + c.brl(f.caixa) + '</b><small>' + (f.caixa < 0 ? 'No vermelho: a cada rodada assim, a diretoria perde a paciência.' : 'Paga ' + U.D.plural(wk, 'semana', 'semanas') + ' de salário mesmo sem entrar nada.') + '</small></div>' +
        '<div class="ldk-cx">' + lbl('VERBA PARA CONTRATAR') + '<b class="up">' + c.brl(f.verba) + '</b><small>o mercado chega numa próxima parte</small></div>' +
        '<div class="ldk-cx">' + lbl('FOLHA POR SEMANA') + '<b>' + c.brl(folha) + ' <small>de ' + c.brl(f.teto) + '</small></b><em class="ld-bar"><u class="' + (pct > 95 ? 'low' : pct > 85 ? 'mid' : 'ok') + '" style="width:' + pct + '%"></u></em></div>' +
        '<span class="ld-gr"></span><button class="ld-b line" id="ldf-back">Voltar ao clube</button></div></div></div>', st => {
      st.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { sfx('tap'); financas(b.dataset.ft); });
      st.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.fd; if (k === 'banco') banco(); else if (k === 'pres') presInfo(); });
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
      r('', pt ? 'Patrocínio ' + esc(pt.name) : 'Patrocínio', pt ? c.brl(pt.fix) + ' no ano' + (pt.bonus ? ' + ' + c.brl(pt.bonus) + ' se cumprir a meta' : '') + (pt.until > co.season ? ' · até ' + (U.YEAR0 + pt.until) : '') : 'a escolher antes do primeiro jogo', '') +
      r('banco', 'Banco', f.loan ? 'faltam ' + U.D.plural(f.loan.n, 'parcela', 'parcelas') + ' de ' + c.brl(f.loan.parc) + ' · deve ' + c.brl(f.loan.rem) : 'sem empréstimo · pode pegar até ' + c.brl(max), '') +
      r('banco', 'Situação do caixa', STEP[step], '<span class="ldn-steps">' + [1, 2, 3, 4].map(i => '<i class="' + (i < step ? 'd' : i === step ? 'c' : '') + '"></i>').join('') + '</span>', step >= 2 ? 'bad' : '');
  }
  function presInfo() {
    const co = C().co, P = S.coPres(co);
    pop(popHead(esc(P.n), 'Presidente · ' + P.nome) + '<div class="ld-pb col"><p class="ldn-p">' + esc(P.txt) + '</p><p class="ldn-p">O caixa no vermelho pesa <b>' + RED_TXT(P.red) + '</b> na confiança dele. A cada 3 temporadas tem eleição e ele pode sair.</p></div>', 'Presidente', null, 'w560');
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
    const ini = esc(P.n.split(' ').map(w => w[0]).slice(0, 2).join(''));
    acdShow('<span class="acd-av">' + ini + '</span><div class="acd-say"><small>' + esc(P.n) + ' · presidente ' + P.nome + '</small><p>' + (welcome ? 'Bem-vindo, professor. ' : '') + hi + '</p></div>',
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
      '<b>' + esc(x.name) + '</b><em>' + c.brl(x.fix) + '</em><small class="acd-u">' + (x.yrs > 1 ? 'por ano' : 'no ano') + '</small>' +
      acdRow('Por rodada', c.brl(Math.round(x.fix / n))) + acdRow('Bônus na meta', x.bonus ? '+ ' + c.brl(x.bonus) : 'não tem') + acdRow('Duração', x.yrs > 1 ? x.yrs + ' temporadas' : '1 temporada') + '</button>';
    acdShow('<div class="acd-say solo"><small>Patrocínio da camisa · ' + (U.YEAR0 + co.season) + '</small><p>Três marcas querem a sua camisa. Escolha uma.</p></div>',
      ops.map(card).join(''), 'Assinar com ' + esc(o.name.split(' ')[0]), st => {
        st.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { sfx('tap'); patrocinio(b.dataset.pt, welcome); });
        st.querySelector('#acd-q').onclick = () => { sfx('tap'); acdHelp('Como funciona', ['O dinheiro entra no caixa toda rodada.', 'Com bônus: o fixo é menor, mas no fim do ano entra o bônus se você cumprir a meta da diretoria.',
          'Travado: o valor não muda pelos anos do contrato, suba ou caia o clube.', 'Sua fama traz propostas melhores. Hoje: fama ' + co.fame + '.']); };
        st.querySelector('#ldn-go').onclick = () => { sfx('tap'); S.coFinPatrocinio(co, o.k); f.pend = null; c.save('hub'); welcome ? time(false) : semana(); };
      });
  }
  // Banco: a escada do vermelho e o empréstimo
  function banco(amt) {
    const c = C(), co = c.co, f = S.coFin(co), step = S.coFinStep(co), max = S.coLoanMax(co);
    const ST = [['Aviso da diretoria', 'caixa abaixo de 4 semanas de folha'], ['Proibido contratar com taxa', 'caixa no vermelho: só jogador sem contrato'], ['O presidente vende o mais caro', 'com 6 rodadas seguidas no vermelho'], ['Ultimato', 'com 8 rodadas no vermelho, a confiança cai o dobro']];
    const lad = ST.map(([t, s], i) => '<div class="ldn-st' + (i + 1 < step ? ' d' : i + 1 === step ? ' c' : '') + '"><i>' + (i + 1) + '</i><b>' + t + '</b><small>' + (i + 1 === step ? 'agora · ' : '') + s + '</small></div>').join('');
    const steps = max ? [0.25, 0.5, 0.75, 1].map(k => Math.round(max * k / 10000) * 10000).filter((v, i, a) => v > 0 && a.indexOf(v) === i) : [];
    amt = amt || steps[1] || steps[0];
    const parc = amt ? S.coLoanParc(amt) : 0, L = f.loan;
    const right = L ? '<div class="ldk-cx paper">' + lbl('EMPRÉSTIMO EM ANDAMENTO') + '<b>' + c.brl(L.rem) + '</b><small>falta pagar do principal</small><div class="ldn-kv"><span>Parcela por mês</span><b>' + c.brl(L.parc) + '</b></div><div class="ldn-kv"><span>Parcelas que faltam</span><b>' + L.n + '</b></div><small>Quitar antes não tem multa.</small></div>' +
        '<span class="ld-gr"></span>' + (f.caixa >= L.rem ? gold('ldn-pay', 'Quitar agora', c.brl(L.rem) + ' do caixa') : '<button class="ld-b line" id="ldn-back">Voltar às finanças</button>') :
      '<div class="ldk-cx paper">' + lbl('EMPRÉSTIMO NO BANCO') + '<div class="ldn-chips">' + steps.map(v => '<button data-am="' + v + '"' + (v === amt ? ' class="on"' : '') + '>' + c.brl(v) + '</button>').join('') + '</div>' +
        '<div class="ldn-kv"><span>Juros</span><b>2% ao mês</b></div><div class="ldn-kv"><span>12 parcelas de</span><b>' + c.brl(parc) + '</b></div><div class="ldn-kv"><span>Total a pagar</span><b>' + c.brl(parc * 12) + '</b></div><small>Parcela a cada 4 rodadas. Quitar antes não tem multa.</small></div>' +
        '<span class="ld-gr"></span>' + gold('ldn-take', 'Pegar ' + c.brl(amt), f.caixa < 0 && f.caixa + amt >= 0 ? 'sai do vermelho hoje' : c.brl(parc) + ' por mês');
    show(rail('clube') + '<div class="ld-col">' + head('Banco', 'Caixa ' + c.brl(f.caixa) + (f.neg ? ' · ' + U.D.plural(f.neg, 'rodada', 'rodadas') + ' no vermelho' : ''), '<button class="ld-b line ldk-bk" id="ldn-bk">Voltar</button>') +
      '<div class="ld-row"><div class="ldn-l">' + lbl('O QUE ACONTECE NO VERMELHO') + '<div class="ldn-lad">' + lad + '</div><small class="ldn-note">Também dá para vender alguém quando o mercado chegar.</small></div>' +
      '<div class="ldn-side">' + right + '</div></div></div>', st => {
      st.querySelectorAll('[data-am]').forEach(b => b.onclick = () => { sfx('tap'); banco(+b.dataset.am); });
      const tk = st.querySelector('#ldn-take'); if (tk) tk.onclick = () => { if (S.coLoanTake(co, amt)) { sfx('tap'); c.save('hub'); banco(); } };
      const py = st.querySelector('#ldn-pay'); if (py) py.onclick = () => { if (S.coLoanPay(co)) { sfx('tap'); c.save('hub'); banco(); } };
      st.querySelectorAll('#ldn-bk, #ldn-back').forEach(b => b.onclick = () => { sfx('tap'); financas('dec'); });
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
  function elenco(sort) {
    const c = C(), co = c.co; sort = sort || 'pos';
    const PO = { GOL: 0, ZAG: 1, LAT: 2, MEI: 3, ATA: 4 };
    const L = co.squad.slice().sort(sort === 'pos' ? (a, b) => PO[a.pos] - PO[b.pos] || b.ovr - a.ovr : sort === 'ct' ? (a, b) => a.ct - b.ct || b.ovr - a.ovr : (a, b) => b[sort] - a[sort]);
    const H = [['pos', 'POS'], ['n', 'JOGADOR'], ['age', 'IDADE'], ['ovr', 'GERAL'], ['pot', 'POT.'], ['en', 'ENERGIA'], ['mo', 'MORAL'], ['wage', 'SALÁRIO'], ['ct', 'CONTRATO']];
    show(rail('clube') + '<div class="ld-col">' + head('Elenco e contratos', U.D.plural(co.squad.length, 'jogador', 'jogadores') + ' · toque no título da coluna para ordenar', '<button class="ld-b line ldk-bk" id="lde-back">Voltar ao clube</button>') +
      '<div class="lde"><div class="lde-h">' + H.map(([k, t]) => '<button data-s="' + k + '"' + (k === sort ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div><div class="lde-b">' +
      L.map(p => '<div class="lde-r' + (c.avail(p) ? '' : ' out') + '"><em>' + p.pos + '</em><b>' + esc(p.n) + (p.out ? ' <small>lesionado</small>' : p.sus ? ' <small>suspenso</small>' : c.pend(p) ? ' <small>pendurado</small>' : '') + '</b><span>' + p.age + '</span><span class="o">' + p.ovr + '</span><span>' + p.pot + '</span>' +
        '<span class="' + (p.en < 55 ? 'dn' : p.en < 75 ? 'md' : '') + '">' + Math.round(p.en) + '%</span><span>' + ((p.mo === undefined ? 60 : p.mo) >= 70 ? 'alta' : (p.mo === undefined ? 60 : p.mo) >= 45 ? 'boa' : 'baixa') + '</span><span>' + c.mi(p.wage) + '</span><span class="' + (p.ct <= 1 ? 'dn' : '') + '">' + (p.ct <= 1 ? 'acaba no fim do ano' : U.D.plural(p.ct, 'ano', 'anos')) + '</span></div>').join('') + '</div></div></div>', st => {
      st.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sfx('tap'); elenco(b.dataset.s); });
      st.querySelector('#lde-back').onclick = () => { sfx('tap'); clube(); };
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
    const next = [out.offers ? [out.sacked ? 'Clubes ligaram' : U.D.plural(out.offers.length, 'clube quer você', 'clubes querem você'), out.offers.slice(0, 2).map(id => esc(club(id).short || club(id).name)).join(' e ') + ' mandaram proposta'] : null,
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
        '<div class="ldy-r">' + lbl('O QUE VEM AGORA') + next.map(([k, t]) => '<div class="ldr-ch"><b>' + k + '</b><small>' + t + '</small></div>').join('') + '<span class="ld-gr"></span>' +
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
        '<button class="pzo-go" id="ldo-go">' + (pick === co.club ? 'Ficar no ' : 'Assinar com o ') + esc(pc.short || pc.name) + '</button></div>', st => {
        st.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { sfx('tap'); pick = b.dataset.o; draw(); });
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
  function subTabs(act, back) {
    return '<div class="ld-seg ldc-tabs">' + [['fun', 'Funções'], ['bat', 'Batedores']].map(([k, t]) => '<button data-sub="' + k + '"' + (k === act ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>';
  }
  function bindSub(st, back) { st.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sfx('tap'); if (b.dataset.sub === 'fun') funcoes(null, back); else batedores(null, back); }); }
  const backBtn = '<button class="ld-x ldm-back" id="ldm-back" aria-label="Voltar">' + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>';
  function funcoes(sel, back) {
    const c = C(), co = c.co, by = {}; co.squad.forEach(p => { by[p.id] = p; });
    const R = S.coRoles(co, co.form), sl = S.coSlots(co.form), sp = spotsL(co.form, false, true);
    sel = sel == null ? Math.max(0, R.findIndex(Boolean)) : sel;
    const rk = i => S.coRoleKey(co.form, i), rn = i => S.CO_ROLES[rk(i)][R[i] + 1][0];
    const dots = co.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { sel: i === sel, attr: ' data-fi="' + i + '"', tag: rn(i), num: true }) : '').join('');
    const p = by[co.xi[sel]], lb = S.coSlotLbl(co.form, sel), opts = S.CO_ROLES[rk(sel)];
    // O que combina e o que deixa buraco: lateral e ponta do mesmo lado, volante e zaga
    const same = (a, b) => S.coSlotLbl(co.form, a).slice(-1) === S.coSlotLbl(co.form, b).slice(-1);
    const iLat = sl.map((x, i) => i).filter(i => /^L[ED]$/.test(S.coSlotLbl(co.form, i)) && same(i, sel) && i !== sel)[0];
    const iVol = sl.map((x, i) => i).filter(i => S.coSlotLbl(co.form, i) === 'VOL');
    let note = '';
    if (R[sel] > 0 && /^(PE|PD|ME|MD)$/.test(lb) && iLat !== undefined && R[iLat] > 0) note = 'O ' + esc(last(by[co.xi[iLat]] ? by[co.xi[iLat]].n : '')) + ' também apoia por esse lado: sobra gente lá na frente e as costas ficam livres.';
    else if (R[sel] > 0 && /^L[ED]$/.test(lb) && iVol.every(i => R[i] >= 0)) note = 'Com o lateral subindo, um volante fixo ajuda a cobrir as costas dele.';
    else if (R[sel] < 0 && /^(ATA)$/.test(lb)) note = 'Pivô segura a bola para os meias chegarem: combina com meia que chega na área.';
    else if (R.filter(x => x > 0).length >= 5) note = 'Muita gente à frente: o time cria mais e cansa mais. Atrás fica aberto.';
    else if (R.filter(x => x < 0).length >= 5) note = 'Muita gente atrás: difícil de furar, mas chega pouco.';
    show('<div class="ld-col">' + '<div class="ld-h">' + backBtn + '<span><b>Funções</b><small>Como cada vaga joga no ' + co.form + '. Toque numa posição no campo.</small></span>' + subTabs('fun') + '</div>' +
      '<div class="ld-row"><div class="ld-pitch">' + PITCH + '<span class="ld-leg"><span>A função fica na vaga: quem entrar ali joga igual</span></span>' + dots +
        '<div class="ldm-grp">' + [['d', 'Defesa'], ['m', 'Meio'], ['a', 'Ataque']].map(([k, t]) => '<span>' + t + '<button data-gl="' + k + ':-1">atrás</button><button data-gl="' + k + ':0">normal</button><button data-gl="' + k + ':1">à frente</button></span>').join('') + '</div></div>' +
        '<div class="ldm-side">' + '<div class="ldm-who"><i>' + (p ? p.num || p.ovr : '') + '</i><span><b>' + lb + (p ? ' · ' + esc(last(p.n)) : '') + '</b><small>' + (p ? c.posTxt[p.pos] + ' · geral ' + p.ovr : '') + '</small></span></div>' +
          lbl('FUNÇÃO') + '<div class="ldm-op">' + opts.map((o, j) => '<button data-r="' + (j - 1) + '"' + (R[sel] === j - 1 ? ' class="on"' : '') + '><b>' + o[0] + '</b><small>' + o[1] + '</small><em>' + (j === 0 ? 'mais atrás' : j === 2 ? 'mais à frente · cansa mais' : 'normal') + '</em></button>').join('') + '</div>' +
          (note ? '<p class="ldm-note"><b>COM O RESTO</b> ' + note + '</p>' : '<p class="ldm-note"><b>COMO PESA</b> Mais à frente ajuda o ataque e tira da defesa. Mais atrás, o contrário.</p>') +
          '<span class="ld-gr"></span>' + gold('ldm-ok', 'Pronto') + '</div></div></div>', st => {
      bindSub(st, back);
      st.querySelector('#ldm-back').onclick = st.querySelector('#ldm-ok').onclick = () => { sfx('tap'); c.save(); (back || time)(); };
      st.querySelectorAll('[data-fi]').forEach(b => b.onclick = () => { sfx('tap'); funcoes(+b.dataset.fi, back); });
      st.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { sfx('tap'); R[sel] = +b.dataset.r; c.save(); funcoes(sel, back); });
      st.querySelectorAll('[data-gl]').forEach(b => b.onclick = () => { sfx('tap'); const [ln, v] = b.dataset.gl.split(':'); S.CO_FORMS[co.form].slots.forEach((x, i) => { if ((x.ln === 'am' ? 'm' : x.ln) === ln) R[i] = +v; }); c.save(); funcoes(sel, back); });
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
  function batedores(k, back) {
    const c = C(), co = c.co, T = takersOf(co), by = {}; co.squad.forEach(p => { by[p.id] = p; });
    k = k || 'pen';
    const card = kk => { const L = T[kk].map(id => by[id]).filter(Boolean), f = L[0];
      return '<button class="ldb-c' + (kk === k ? ' on' : '') + '" data-bk="' + kk + '">' + lbl(S.CO_TAKE[kk].toUpperCase()) + (f ? '<span class="ldb-f"><i>' + (f.num || f.ovr) + '</i><span><b>' + esc(last(f.n)) + '</b><small>' + f.pos + ' · geral ' + f.ovr + (co.xi.includes(f.id) ? '' : ' · banco') + '</small></span></span>' : '') +
        L.slice(1).map((p, j) => '<small class="ldb-o">' + (j + 2) + 'º ' + esc(last(p.n)) + '</small>').join('') + '</button>'; };
    const cand = co.squad.filter(p => p.pos !== 'GOL' || k === 'cap').sort((a, b) => TK_SCORE[k](b) - TK_SCORE[k](a)).slice(0, 5);
    const best = cand[0];
    show('<div class="ld-col">' + '<div class="ld-h">' + backBtn + '<span><b>Batedores</b><small>Quem bate cada bola parada. Se o 1º não estiver em campo, bate o 2º.</small></span>' + subTabs('bat') + '</div>' +
      '<div class="ld-row"><div class="ldb-g">' + Object.keys(S.CO_TAKE).map(card).join('') + '</div>' +
      '<div class="ldm-side">' + lbl(S.CO_TAKE[k].toUpperCase() + ' · ESCOLHA A ORDEM') + '<div class="ldb-l">' + cand.map(p => { const pos = T[k].indexOf(p.id);
        return '<div class="ldb-r"><i>' + (p.num || p.ovr) + '</i><span><b>' + esc(last(p.n)) + (p === best ? ' <u>MELHOR</u>' : '') + '</b><small>' + p.pos + ' · geral ' + p.ovr + (co.xi.includes(p.id) ? '' : ' · banco') + '</small></span>' +
          [0, 1, 2].map(j => '<button data-to="' + p.id + ':' + j + '"' + (pos === j ? ' class="on"' : '') + '>' + (j + 1) + 'º</button>').join('') + '</div>'; }).join('') + '</div>' +
        '<p class="ldm-note">' + (k === 'cap' ? 'Fala pelo grupo e segura a moral quando o jogo aperta.' : '1 em cada 4 gols sai de bola parada. O treino da semana ajuda.') + '</p><span class="ld-gr"></span>' + gold('ldm-ok', 'Pronto') + '</div></div></div>', st => {
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
          pop('<div class="acd-help"><b>Auxiliar</b><p>“' + aux[0] + '”</p><span class="hl-ab">' + (aux[1] && !done ? '<button class="hl-btn dark" id="tr2-see">Ver esse treino</button>' : '') + '<button class="hl-btn line" data-pop-x>Fechar</button></span></div>', 'Auxiliar', w => {
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
      st.querySelector('#ol2-q').onclick = () => { sfx('tap'); pop('<div class="acd-help"><b>Como funciona</b><p>O olheiro viu um jogo só: uma das três pode não se repetir. O que se confirmar em campo vai para o caderno.</p><button class="hl-btn dark" data-pop-x>Entendi</button></div>', 'Como funciona', null, 'hl-pop acd-pop tm-pop'); };
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
    const tags = xi.slice().sort((a, b) => (a.mo || 60) - (b.mo || 60)).filter((p, i, a) => i < 2 || i >= a.length - 2).map(p => [p, (p.mo || 60) < 45 ? ['dn', 'nervoso'] : (p.bn || 0) >= 2 ? ['wa', 'quer jogar'] : p.id === capId ? ['up', 'líder'] : (p.mo || 60) >= 70 ? ['up', 'confiante'] : ['', 'tranquilo']]);
    let pick = null;
    const P = S.CO_PRE;
    const draw = () => {
      show('<div class="ld-col">' + head('Última conversa no vestiário', 'Oito minutos para entrar. O que você fala vale para os primeiros 15 minutos.') +
        '<div class="ld-row"><div class="ldp-g">' + Object.keys(P).map(k => '<button class="ldp-c' + (k === pick ? ' on' : '') + '" data-pk="' + k + '"><b>' + P[k].name + '</b><i>' + P[k].q + '</i><span class="ld-gr"></span>' +
          (k === 'voces' && nerv ? '<small>Ajuda: ' + esc(last(nerv.n)) + ', que está nervoso</small>' : k === 'cima' && nerv ? '<small>Não ajuda: ' + esc(last(nerv.n)) + ', que está nervoso</small>' : '') + '<span class="ldp-fx">' + lbl('NOS PRIMEIROS 15 MINUTOS') + P[k].tip.split(' · ').map((t, j) => '<em class="' + (j ? 'dn' : 'up') + '">' + (j ? '− ' : '+ ') + t + '</em>').join('') + '</span></button>').join('') + '</div>' +
        '<div class="ldm-side"><div class="ldp-cl">' + lbl('CLIMA DO GRUPO') + '<b class="' + (mo >= 70 ? 'up' : mo >= 50 ? '' : 'dn') + '">' + (mo >= 70 ? 'confiante' : mo >= 50 ? 'tranquilo' : 'abalado') + '</b>' +
          tags.map(([p, [cc, t]]) => '<div><i>' + (p.num || p.ovr) + '</i><span>' + esc(last(p.n)) + '</span><em class="' + cc + '">' + t + '</em></div>').join('') + '</div>' +
          (cap ? '<div class="ldm-note paper"><b>Capitão ' + esc(last(cap.n)) + ':</b> "' + (mo >= 60 ? 'Bora, professor. A gente sabe o que fazer.' : 'O grupo está tenso. Uma palavra sua ajuda.') + '"</div>' : '') +
          '<span class="ld-gr"></span><button class="ld-link" id="ldp-skip">Não falar nada</button>' + gold('ldp-go', 'Entrar em campo', 'e o jogo começa') + '</div></div></div>', st => {
        st.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { sfx('tap'); pick = pick === b.dataset.pk ? null : b.dataset.pk; draw(); });
        st.querySelector('#ldp-go').onclick = () => { sfx('tap'); c.play(pick); };
        st.querySelector('#ldp-skip').onclick = () => { sfx('tap'); c.play(null); };
      });
    };
    draw();
  }

  U.LD = { on, show, off, semana, time, rail, head, pill, lbl, gold, pop, closePop, popHead, dot, spotsL, PITCH, cadHtml, tacPicker, liveHtml, livePaint, liveStop, livePlayer, result, segunda, caderno, tabela, clube, financas, elenco, FIN_TABS, reuniao, patrocinio, banco, temporada, propostas, welcome, funcoes, batedores, treino, olheiro, prelecao };
  U.ldOff = () => { if (document.body.classList.contains('ld-on')) off(); };
})();
