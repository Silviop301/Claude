// Interface — Modo Treinador deitado (modo estádio): as telas do Treinador num palco fixo de 844×390, escalado para
// caber na tela, como no canvas aprovado pelo Silvio (2026-11-06). Com o celular em pé, pede para girar (ou joga em
// pé nesta sessão, nas telas de sempre de ui/coach.js).
// Usa o estado e os ajudantes de ui/coach.js por U._co; as telas que ainda não têm versão deitada caem no render()
// de sempre, que tira o palco (U.ldOff em ui/core.js).
(function () {
  const U = window.CRAQUE_UI;
  const { S, sfx, esc, club, crest } = U;
  const W = 844, H = 390, DESK_K = 1.7; // DESK_K: maior escala do palco no computador (1435×663 px na tela)
  const on = () => true; // o Treinador é sempre deitado
  // Som de cada botão do palco (Silvio, 11/11: "muito agudo, a maioria vai ser mais grave"): voltar, fechar e cancelar = back
  // (mais grave), a ação principal (dourado, confirmar) = ok (o único mais agudo), o resto = tap
  const SND_BACK = '[id$="-back"], [id$="-bk"], [id$="-no"], [id$="-x"], #ldl-aux-n, #ca-n, .tcr-back, .ld-x, .hl-x-btn, [data-pop-x], [data-pop-back]';
  const SND_OK = '[id$="-go"], [id$="-y"], [id$="-ok"], .hl-btn.gold';
  const uiSnd = b => b.matches(SND_BACK) ? 'back' : b.matches(SND_OK) ? 'ok' : 'tap';
  const C = () => U._co; // ajudantes e estado do Treinador (ui/coach.js)

  // ---------- palco ----------
  let swapAt = -1e9, swapKey = ''; const DUP = 400;
  function host() {
    let el = document.getElementById('ld');
    if (!el) {
      el = document.createElement('div'); el.id = 'ld';
      el.innerHTML = '<div class="ld-st" id="ld-st"></div><div class="ld-turn" id="ld-turn"></div>';
      document.body.appendChild(el);
      // Todo botão do palco faz o clique (Silvio, 2026-11-11: "tá indo sem som nos botões"). Quem já chama sfx('tap') não
      // dobra: o sound.js ignora o mesmo som repetido em 40 ms. Respeita o Som dos Ajustes (CRAQUE_SFX.play)
      // Toque duplo (2026-11-11): a tela trocava no 1º toque e o 2º caía no botão que aparecesse no mesmo lugar da tela nova
      // (criar a carreira assinava com o 1º clube, Jogar pulava a escalação e a preleção). Toque de gente até DUP ms depois
      // de a tela mudar não conta; redesenho da mesma tela (setas, abas) não trava. Vem antes do som para não tocar à toa
      el.addEventListener('click', e => { if (e.isTrusted && performance.now() - swapAt < DUP) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
      el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b && !b.disabled) sfx(uiSnd(b)); }, true);
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
    rot();
    const vw = el.clientWidth || window.innerWidth, vh = el.clientHeight || window.innerHeight, port = vh > vw * 1.05; // medidas do #ld (já sem o topo borrado do iPhone e com o zoom do monitor)
    el.classList.toggle('port', port);
    // Área segura (entalhe e ilha do iPhone deitado): vem do padding do #ld. As telas não apertam (816×366 de conteúdo, como nos
    // desenhos): a escala diminui até o conteúdo caber entre os dois lados, e o palco cresce com a sobra para cobrir a tela inteira
    const cs = getComputedStyle(el), sx = Math.max(parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingRight) || 0), sy = parseFloat(cs.paddingTop) || 0;
    let k = Math.max(.05, Math.min(vw / W, vh / H, (vw - 2 * sx) / (W - 28), (vh - 2 * sy) / (H - 24)));
    // Monitor grande com mouse (Silvio, 2026-11-11, 32" 2K: "tá muito grande"): o palco crescia até 3× e cada botão ficava enorme.
    // No computador o palco para em DESK_K× o desenho de 844×390 (contando o zoom do html.desk), centrado; a sobra vira fundo
    if (document.documentElement.classList.contains('desk')) k = Math.min(k, DESK_K / ((U.zk && U.zk()) || 1));
    const ex = Math.ceil(Math.max(0, vw / k - W) / 2) + 1, ey = Math.ceil(Math.max(0, vh / k - H) / 2) + 1; // sobra de cada lado em px do palco, com 1 a mais para a borda não deixar fio
    el.style.setProperty('--ldw', (W + 2 * ex) + 'px'); el.style.setProperty('--ldh', (H + 2 * ey) + 'px');
    el.style.setProperty('--ldpx', (14 + ex) + 'px'); el.style.setProperty('--ldpy', (12 + ey) + 'px');
    el.style.setProperty('--ldk', k.toFixed(4));
  }
  // Tela girada (Silvio, 2026-11-11): com a rotação travada em pé (iPhone não deixa o site travar deitado), o botão do aviso
  // "Gire o celular" desenha o jogo girado 90° (html.rot, style.css): ele vira o celular de lado e joga. Fica lembrado
  // (U.rotPref, desliga nos Ajustes); com o celular realmente deitado nada gira. Toques: U.pt / U.box (ui/core.js)
  function rot() {
    const R = document.documentElement, ww = window.innerWidth, wh = window.innerHeight;
    const on = document.body.classList.contains('ld-on') && wh > ww * 1.05 && U.rotPref();
    R.classList.toggle('rot', on);
    if (on) { R.style.setProperty('--rw', wh + 'px'); R.style.setProperty('--rh', ww + 'px'); R.style.setProperty('--rx', ww + 'px'); }
  }
  function rotGo() {
    U.rotPref(true); sfx('tap');
    // Android: tela cheia + travar deitado (com a trava, a tela de fato deita e o giro por CSS nem entra)
    try { const d = document.documentElement, fs = d.requestFullscreen || d.webkitRequestFullscreen; if (fs && !document.fullscreenElement) { const p = fs.call(d); if (p && p.then) p.then(lockLand, () => {}); } } catch (e) {}
    fit();
  }
  // Mostra uma tela no palco. html = conteúdo do palco; bind(st) liga os botões
  function show(html, bind, turn) {
    const el = host();
    document.body.classList.add('ld-on');
    const st = document.getElementById('ld-st');
    st.innerHTML = html;
    const sk = st.firstElementChild ? st.firstElementChild.className : ''; if (sk !== swapKey) { swapKey = sk; swapAt = performance.now(); }
    // O Treinador é só deitado (Silvio 2026-11-06 tirou o "Jogar em pé"): em pé, só o aviso para girar
    document.getElementById('ld-turn').innerHTML = '<div class="ld-turn-c"><i aria-hidden="true">' + PHONE + '</i><b>Gire o celular</b><small>' + (turn || 'O Treinador é jogado com o celular deitado.') + '</small>' +
      '<button class="btn" id="ld-rotb">Girar a tela</button><small class="ld-rot-s">Para celular com a rotação travada</small></div>';
    document.getElementById('ld-rotb').onclick = rotGo;
    lockLand();
    fit();
    st.querySelectorAll('[data-rail]').forEach(b => b.onclick = () => { sfx('tap'); go(b.dataset.rail); });
    bind && bind(st);
  }
  // Teclado do celular deitado cobre a metade de baixo da tela: com um campo em foco, a tela (root) sobe até o campo ficar
  // no alto do palco e desce quando o foco sai. Só em tela de toque (Conta e Sua opinião)
  function lift(root) {
    if (!root || !window.matchMedia || !matchMedia('(pointer: coarse)').matches) return;
    const isField = t => !!(t && t.matches && t.matches('input:not([hidden]), textarea'));
    root.addEventListener('focusin', e => {
      if (!isField(e.target)) return;
      const st = document.getElementById('ld-st'), k = U.box(st).width / st.offsetWidth || 1;
      root.style.transition = 'none'; root.style.transform = '';
      const dy = Math.round((U.box(e.target).top - U.box(root).top) / k) - 4;
      root.style.transition = 'transform .15s'; root.style.transform = dy > 0 ? 'translateY(' + -dy + 'px)' : '';
    });
    root.addEventListener('focusout', () => setTimeout(() => { if (!root.contains(document.activeElement) || !isField(document.activeElement)) root.style.transform = ''; }, 60));
  }
  function off() { document.body.classList.remove('ld-on'); document.documentElement.classList.remove('rot'); closePop(); try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
  // Android (app instalado ou tela cheia) deixa travar a tela deitada; o iPhone não deixa (fica o aviso para girar)
  function lockLand() { try { const so = screen.orientation; if (so && so.lock) so.lock('landscape').catch(() => {}); } catch (e) {} }
  const PHONE = '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M20 9a8 8 0 0 1 0 6M4 9a8 8 0 0 0 0 6"/></svg>';

  // ---------- peças comuns ----------
  // Caderno escondido (Silvio, 2026-11-09: a matriz não escala com mais formações; volta com outro formato). O motor
  // continua anotando em co.cad; CAD = true traz de volta a tela, o botão da semana e os blocos do resultado e da tática
  const CAD = false;
  const plMil = (n, um, muitos) => U.D.plural(n, um, muitos).replace(/^(\d+)(\d{3}) /, '$1.$2 '); // "24.961 jogadores"
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
  // ?v=2: os rostos foram recortados de novo em 11/11 e o celular guardava o desenho antigo (sobrava creme embaixo do busto); trocou a arte, sobe o número
  const face = (n, cls, alt) => '<img class="' + cls + '" src="' + CO_ART + 'rosto-' + String(n).padStart(2, '0') + '.webp?v=2" alt="' + esc(alt || '') + '">';
  const presFace = (P, cls) => { const l = FACE_PRES[P.k] || [5]; return face(l[hashS(P.n) % l.length], cls, P.n); };
  const auxFace = (co, cls) => face(S.coAux(co).fc, cls, 'Auxiliar'); // co.aux: ela acompanha o técnico (coachfin.js)
  // rosto 08 é a auxiliar (mulher): o texto concorda com o rosto (Silvio 2026-11-11)
  const auxEla = co => !!S.coAux(co).ela;

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
  // Setor de cada posição (Silvio 2026-11-10: ver no campo e no banco quem é zaga, meio e ataque): a etiqueta da vaga e
  // a do reserva levam a cor do setor (`data-ln`: g goleiro, d defesa, m meio, a ataque), com a legenda no topo
  const LN = { GOL: 'g', ZAG: 'd', LAT: 'd', MEI: 'm', ATA: 'a' }, lnOf = pos => LN[pos] || 'm';
  const LN_LEG = '<span class="tm-leg"><i data-ln="d">Defesa</i><i data-ln="m">Meio</i><i data-ln="a">Ataque</i></span>';
  // Quem joga bem numa vaga: da posição, ou que sabe jogar ali (goleiro só no gol)
  const fitsSlot = (p, slot) => p.pos === slot || ((p.pos === 'GOL') === (slot === 'GOL') && S.coFit(p.pos, slot) >= 0.88);
  // Reserva no banco: anel de energia com o geral, nome e a posição na cor do setor; o primeiro de cada setor abre espaço
  const benchChip = (p, prev, cls, ok, num, ov) => '<button class="tm-bp' + cls + (prev && lnOf(prev.pos) !== lnOf(p.pos) ? ' g0' : '') + '" data-bp="' + p.id + '"' + (ok ? '' : ' disabled') + '><b class="tm-ring ' + enRing(p.en) + '" style="--en:' + Math.round(p.en) + '">' + (ov != null ? ov : p.ovr) + '</b><span><i>' + (num && p.num ? p.num + ' ' : '') + esc(last(p.n)) + '</i><small data-ln="' + lnOf(p.pos) + '">' + p.pos + '</small></span></button>';
  // Com um titular escolhido o banco rola até o primeiro reserva que joga na vaga (o banco não cabe inteiro na tela)
  const benchShow = root => { const bn = root.querySelector('.tm-bench'), f = bn && bn.querySelector('.tm-bp.can, .tm-bp.lo'), lb = bn && bn.querySelector('small');
    if (f) bn.scrollLeft = Math.max(0, f.offsetLeft - (lb ? lb.offsetWidth : 0) - 8); };
  // Lista das trocas do auxiliar (Silvio 2026-11-10: "tocar uma vez só e trocar todos"): uma linha por troca, todas
  // marcadas; tocar numa linha tira ou põe de volta, e um botão só faz as marcadas. L = [{ o, i, why, slot }]
  // Titular escolhido (Silvio 2026-11-10): ao lado dele, os reservas da mesma posição, do maior geral para o menor; o
  // banco segue embaixo para quem é de fora da posição, com o geral que ele teria na vaga (ovrAt, perde um pouco)
  const ovrAt = (p, slot) => p.pos === slot || (p.pos === 'GOL') !== (slot === 'GOL') ? p.ovr : Math.round(p.ovr * S.coFit(p.pos, slot));
  const nearList = (slot, bench, ok, x, y) => { const L = bench.filter(p => ok(p) && p.pos === slot).sort((a, b) => b.ovr - a.ovr || b.en - a.en).slice(0, 4);
    return '<div class="tm-near" style="' + (x < 55 ? 'left:calc(' + x : 'right:calc(' + (100 - x)) + '% + 40px);top:' + y + '%">' +
      (L.length ? L.map(p => '<button class="tm-bp tm-cd" data-bp="' + p.id + '"><b class="tm-ring ' + enRing(p.en) + '" style="--en:' + Math.round(p.en) + '">' + p.ovr + '</b><span><i>' + esc(last(p.n)) + '</i><small data-ln="' + lnOf(p.pos) + '">' + p.pos + '</small></span></button>').join('')
        : '<p class="tm-cl0">Ninguém da posição. Use o banco.</p>') + '</div>'; };
  // Dentro do campo: a lista não pode sair por cima nem por baixo
  const nearFix = root => { const n = root.querySelector('.tm-near'), f = n && n.parentNode; if (!n) return;
    const H = f.clientHeight, h = n.offsetHeight, c = n.offsetTop; n.style.top = Math.max(4, Math.min(H - h - 4, c - h / 2)) + 'px'; n.style.visibility = 'visible'; };
  const auxRows = L => '<div class="ax-l">' + L.map((g, k) => '<button class="ax-r on" data-ax="' + k + '" aria-pressed="true"><em data-ln="' + lnOf(g.slot) + '">' + g.tag + '</em><span><b>' + esc(last(g.o.n)) + '</b><small>' + g.why + '</small></span><u>›</u><span><b>' + esc(last(g.i.n)) + '</b><small>' + g.i.ovr + '</small></span><i class="ax-ck"></i></button>').join('') + '</div>';
  const auxLbl = n => (n === 0 ? 'Nenhuma troca' : n === 1 ? 'Fazer a troca' : 'Fazer as ' + n + ' trocas');
  // Liga as linhas ao botão: devolve quais estão marcadas
  const auxBind = (w, btn) => { const on = () => [...w.querySelectorAll('.ax-r')].filter(b => b.classList.contains('on')).map(b => +b.dataset.ax);
    w.querySelectorAll('.ax-r').forEach(b => b.onclick = () => { sfx('tap'); b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); const n = on().length; btn.textContent = auxLbl(n); btn.disabled = !n; });
    return on; };
  // Arrastar do banco (ou da lista da direita) para o campo: o reserva sobe, uma cópia segue o dedo e o titular embaixo
  // fica vermelho com a etiqueta SAI; soltar em cima
  // dele faz a troca. Puxar de lado continua rolando o banco. onDrop(idDoReserva, vaga)
  function benchDrag(root, onDrop, fits) {
    if (!root) return;
    root.querySelectorAll('.tm-bp:not(.dis)').forEach(b => {
      let x0 = 0, y0 = 0, pid = null, gh = null, over = null, dragged = false, bn = null, sl0 = 0;
      const at = (cx, cy) => { const r = U.box(root), k = r.width / root.offsetWidth || 1; [cx, cy] = U.pt(cx, cy); return [(cx - r.left) / k, (cy - r.top) / k]; };
      const hit = (cx, cy) => { const el = document.elementFromPoint(cx, cy), d = el && el.closest('[data-xi]'); return d && root.contains(d) ? d : null; };
      const free = b.classList.contains('tm-cd');
      const end = () => { if (gh) gh.remove(); gh = null; if (over) over.classList.remove('drop'); over = null; pid = null; root.classList.remove('tm-drag'); b.classList.remove('lift');
        root.querySelectorAll('[data-dfit],[data-dfar]').forEach(d => { d.removeAttribute('data-dfit'); d.removeAttribute('data-dfar'); }); };
      b.addEventListener('pointerdown', e => { if (e.button > 0) return; [x0, y0] = U.pt(e.clientX, e.clientY); pid = e.pointerId; dragged = false; bn = null; try { b.setPointerCapture(pid); } catch (er) {} });
      b.addEventListener('pointermove', e => {
        if (e.pointerId !== pid) return;
        const [ex, ey] = U.pt(e.clientX, e.clientY), dx = ex - x0, dy = ey - y0; // tela girada: o "para cima" do palco
        if (!gh) {
          // tela girada: o navegador entende o "pan-x" do banco na tela, não no palco; lá o banco não deixa o navegador rolar e rola aqui
          if (bn) { bn.scrollLeft = sl0 - dx; e.preventDefault(); return; }
          if (free ? Math.hypot(dx, dy) < 12 : dy > -12 || Math.abs(dy) < Math.abs(dx) * 0.6) { if (!free && Math.abs(dx) > 20 && dy > -12) { bn = U.rotOn() && b.closest('.tm-bench'); if (bn) sl0 = bn.scrollLeft + dx; else pid = null; } return; }
          gh = document.createElement('div'); gh.className = 'tm-bp tm-ghost'; gh.innerHTML = b.innerHTML; root.appendChild(gh);
          root.classList.add('tm-drag'); b.classList.add('lift'); dragged = true;
          // as vagas em que ele joga acendem; quem estiver embaixo do dedo vira "SAI"
          if (fits) root.querySelectorAll('[data-xi]').forEach(d => d.setAttribute(fits(b.dataset.bp, +d.dataset.xi) ? 'data-dfit' : 'data-dfar', '1'));
        }
        const [px, py] = at(e.clientX, e.clientY); gh.style.left = px + 'px'; gh.style.top = py + 'px';
        const d = hit(e.clientX, e.clientY); if (d !== over) { if (over) over.classList.remove('drop'); over = d; if (d) d.classList.add('drop');
          // o dedo tampa o titular: o nome de quem sai vai junto com a cópia, em cima dela
          const nm = d && d.querySelector('.ld-dn b'); if (nm) gh.dataset.out = nm.textContent; else delete gh.dataset.out; }
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
    return '<button class="ld-dot ' + enRing(p.en) + (o.sel ? ' sel' : '') + (fitC === 'fora' ? ' fora' : '') + '"' + (o.attr || '') + ' data-ln="' + lnOf(slot || p.pos) + '" style="left:' + x + '%;top:' + y + '%;--en:' + Math.round(p.en) + '"' +
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
    const tut = tutStep(co);
    const popped = !tut && (inboxPop(co, semana) || lostPop(co) || auxPop(co) || dmPop(co) || obraPop(co) || nomePop(co) || ligaPop(co) || showPop(co));
    if (!tut && !popped && !ctWarn(co)) finNews(co);
    if (!tut) setTimeout(() => { winToast(co); if (!popped) upToast(co); }, 0);
    // Propostas pelos seus que ainda não abriram: aviso no botão Mercado (a janelinha sozinha é uma por semana)
    const inN = tut ? 0 : S.coMktInbox(co).filter(o => !o.seen).length - (popped ? 1 : 0);
    const nwN = tut || !S.coWorldNew ? 0 : (S.coWorldSync(co), S.coWorldNew(co));
    const t = S.coTable(co), me = t.find(x => x.me), pos = S.coPos(co), B = co.board, conf = Math.round(B.conf);
    const f5 = f => { const a = (f || '').split('').slice(-5); while (a.length < 5) a.unshift('n'); return '<span class="ld-f5 sm-f5">' + a.map(x => '<i class="' + x + '"></i>').join('') + '</span>'; };
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const meta = B.goal.k === 'titulo' ? 'SER CAMPEÃO' : 'ATÉ O ' + ord(B.goal.pos);
    const top = '<div class="sm-h' + (B.ult ? ' ult' : '') + '"><button class="tcr-back" id="sm-back" aria-label="Início">' + BK + '</button>' +
      '<b>' + ord(pos) + '</b><small>' + me.p + ' pts</small>' + f5(me.f) +
      '<em class="sm-tag' + (pos > (B.goal.k === 'titulo' ? 1 : B.goal.pos) ? ' hi' : '') + '" title="' + esc(S.CO_GOAL_TXT[B.goal.k]) + '">META · ' + meta + '</em><span class="ld-gr sm-mu">' + (U.discHtml ? U.discHtml('sm') : '') + '</span>' + // disco da música no meio do topo (2026-11-11)
      (B.ult ? '<em class="sm-tag ult">ULTIMATO · VENÇA ' + B.ult.need + ' DE ' + B.ult.of + '</em>' : '') +
      // caixa no topo (Silvio 2026-11-10, como no mercado); com ultimato a etiqueta já diz como a diretoria está e a barra sai para caber
      cxPill() + (U.COINS ? U.COINS.pill('cp-sm', 'sm-coins') : '') + (B.ult ? '' : '<span class="sm-dir">Diretoria <em class="ld-bar"><u style="width:' + conf + '%" class="' + (conf >= 55 ? 'ok' : conf >= 35 ? 'mid' : 'low') + '"></u></em></span>') + '</div>';
    const side = (id, nm, sub) => '<div class="sm-tm">' + crest(id, 'sm-cr') + '<b>' + esc(nm) + '</b><small>' + sub + '</small></div>';
    let card, wk = '';
    if (!nx.bye) {
      const pv = S.coPreview(co), them = pv.them, cl = club(co.club), vc = club(them.club), rv = t.find(x => x.id === them.club), rpos = t.indexOf(rv) + 1;
      card = '<small class="sm-rd">TEMPORADA ' + (U.YEAR0 + co.season) + ' · RODADA ' + nx.round + ' · ' + (nx.home ? 'EM CASA' : 'FORA') + '</small><div class="sm-vs">' +
        // mandante à esquerda (Silvio, 10/11: "em jogo fora de casa eu quero meu escudo na direita"), como no placar do jogo
        (nx.home ? side(co.club, cl.short || cl.name, co.form + ' · ' + esc(S.CO_STY[co.style].name)) + '<i class="sm-x">x</i>' + side(them.club, vc.short || vc.name, them.form + ' · ' + esc(S.CO_STY[them.style].name))
          : side(them.club, vc.short || vc.name, them.form + ' · ' + esc(S.CO_STY[them.style].name)) + '<i class="sm-x">x</i>' + side(co.club, cl.short || cl.name, co.form + ' · ' + esc(S.CO_STY[co.style].name))) + '</div>' +
        (rv ? '<small class="sm-rv">' + ord(rpos) + ' · ' + rv.p + ' pts' + f5(rv.f) + '</small>' : '');
      const tr = co.train && co.train.i === co.ss.i ? S.CO_TRAIN[co.train.k] : null, sc = co.scout && co.scout.i === co.ss.i;
      wk = '<div class="sm-wk"><button class="sm-w' + (tr ? ' ok' : '') + '" id="ld-tr"><small>TREINO</small><b>' + (tr ? '✓ ' + esc(tr.name) : 'Escolher') + '</b>' + (tr ? '' : '<i class="tm-dot">1</i>') + '</button>' +
        '<button class="sm-w' + (sc ? ' ok' : '') + '" id="ld-ol"><small>OLHEIRO</small><b>' + (sc ? '✓ Relatório lido' : 'Ver o ' + esc(vc.short || vc.name)) + '</b></button></div>';
    } else card = '<div class="sm-bye"><b>Sem jogo nesta rodada</b><small>Temporada ' + (U.YEAR0 + co.season) + ' · o time descansa, os outros jogam.</small></div>';
    const tip0 = !nx.bye && co.scout && co.scout.i === co.ss.i ? S.coTip(co, true) : null, tipNew = tip0 && !tip0.seen && !S.coTipUsed(co, tip0);
    const nav = [['time', 'Time'], ['tabela', 'Tabela']].concat(CAD ? [['caderno', 'Caderno']] : []).concat([['mercado', 'Mercado'], ['clube', 'Clube']]).map(([k, n]) => '<button class="sm-nv" data-rail="' + k + '">' + n + (k === 'mercado' && inN + nwN ? '<i class="tm-dot">' + (inN + nwN) + '</i>' : k === 'time' && tipNew ? '<i class="tm-dot">1</i>' : '') + '</button>').join('');
    show('<div class="sm' + (nx.bye ? ' bye' : '') + '">' + top + '<div class="sm-card">' + card + '</div>' + wk +
      '<nav class="sm-side" aria-label="Menu do técnico">' + nav + '<button class="tm-go" id="ld-play">' + (nx.bye ? 'Ver a rodada' : 'Jogar') + '</button></nav></div>', st => {
      if (U.discBind) U.discBind(st);
      cxBind(st, semana);
      if (st.querySelector('#sm-coins')) st.querySelector('#sm-coins').onclick = () => { sfx('tap'); loja(0, semana); };
      st.querySelector('#ld-play').onclick = () => { sfx('tap'); if (nx.bye) { S.coSkipRound(co); c.save(); return semana(); } time(true); };
      st.querySelector('#sm-back').onclick = () => { sfx('tap'); go('inicio'); };
      if (st.querySelector('#ld-tr')) st.querySelector('#ld-tr').onclick = () => { sfx('tap'); treino(); };
      if (st.querySelector('#ld-ol')) st.querySelector('#ld-ol').onclick = () => { sfx('tap'); olheiro(); };
      // Silvio 11/11: "não tá legal tentar abrir o mercado e ter que ver todas as propostas antes": o Mercado abre direto e as
      // propostas esperam na aba Propostas (o número fica na aba); só com notícia nova segue abrindo nelas
      if (!inN && nwN) st.querySelector('[data-rail="mercado"]').onclick = () => { sfx('tap'); noticias(); };
      if (tut) tutShow(co, st);
    });
  }

  // ---------- Tutorial da primeira carreira (Silvio 2026-11-09, opção B): a Semana escurece, o auxiliar fala uma frase e
  // só o botão certo fica aceso, piscando. Semana 1: Time, Treino, Olheiro, Jogar; semana 2: Tabela, Clube; semana 3:
  // Mercado. co.tut = { n } é o passo (criado em ui/coach.js só na primeira carreira); some no Pular, no último passo
  // ou com as dicas desligadas. Passo = [semana (co.ss.i), alvo, fala]
  const TUT = [
    [0, '[data-rail="time"]', 'Professor, antes de tudo conheça o elenco. Toque em Time.'],
    [0, '#ld-tr', 'Agora escolha o treino da semana.'],
    [0, '#ld-ol', 'Vale espiar o adversário antes do jogo.'],
    [0, '#ld-play', 'Tudo pronto. Agora é jogar.'],
    [1, '[data-rail="tabela"]', 'A Tabela mostra a corrida pela meta.'],
    [1, '[data-rail="clube"]', 'No Clube ficam o caixa, o elenco e os troféus.'],
    [2, '[data-rail="mercado"]', 'A janela fecha nesta semana. No Mercado você contrata e vende.'],
  ];
  // O passo desta semana (ou null). Semana que já passou é pulada
  function tutStep(co) {
    const t = co.tut; if (!t || !co.ss) return null;
    if ((U.load('climbix-dicas-v1') || {}).off) return null;
    while (t.n < TUT.length && TUT[t.n][0] < co.ss.i) t.n++;
    if (t.n >= TUT.length) { co.tut = null; return null; }
    return TUT[t.n][0] === co.ss.i ? TUT[t.n] : null;
  }
  function tutShow(co, st) {
    const c = C(), s = tutStep(co); if (!s) return;
    const tg = st.querySelector(s[1]);
    // Sem o alvo (rodada sem jogo) ou já feito (treino escolhido, relatório lido): próximo passo
    if (!tg || tg.classList.contains('ok')) { co.tut.n++; return tutShow(co, st); }
    const wk = TUT.filter(x => x[0] === s[0]), R = U.box(st), k = R.width / st.offsetWidth || 1, r = U.box(tg);
    const x = (r.left - R.left) / k, y = (r.top - R.top) / k, w = r.width / k, h = r.height / k;
    const el = document.createElement('div'); el.className = 'tu'; el.id = 'ld-tu';
    el.innerHTML = '<button class="tu-hole" style="left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;border-radius:' + getComputedStyle(tg).borderRadius + '" aria-label="' + esc(tg.textContent.trim()) + '"></button>' +
      '<div class="tu-bub" role="dialog" aria-label="Auxiliar">' + auxFace(co, 'tu-fc') + '<div><p>“' + s[2] + '”</p><span>' + (wk.length > 1 ? '<small>' + (wk.indexOf(s) + 1) + ' de ' + wk.length + '</small>' : '') + '<button class="tu-skip" id="tu-skip">Pular</button></span></div></div>';
    st.appendChild(el);
    // O balão fica ao lado do alvo: à esquerda dos botões da coluna da direita, em cima dos de baixo
    const b = el.querySelector('.tu-bub'), bw = b.offsetWidth, bh = b.offsetHeight, cl = (v, a, z) => Math.max(a, Math.min(z, v));
    // (o palco cresce com a sobra da tela: o balão fica dentro do conteúdo, longe do entalhe)
    const ox = (st.offsetWidth - W) / 2, oy = (st.offsetHeight - H) / 2, side = x - ox > W * 0.6;
    b.style.left = cl(side ? x - bw - 24 : x, ox + 8, ox + W - bw - 8) + 'px';
    b.style.top = cl(side ? y + h / 2 - bh / 2 : y - bh - 22, oy + 8, oy + H - bh - 8) + 'px';
    el.querySelector('.tu-hole').onclick = () => { co.tut.n++; if (co.tut.n >= TUT.length) co.tut = null; c.save(); el.remove(); tg.click(); };
    el.querySelector('#tu-skip').onclick = () => { sfx('tap'); co.tut = null; c.save(); semana(); };
  }

  // ---------- Time: escalação, popups de troca e de formação/estilo ----------
  function time(toPlay) {
    const c = C(), co = c.co, by = {}; co.squad.forEach(p => { by[p.id] = p; });
    if (co.xi.some(id => !c.avail(by[id])) || co.xi.length < 11) co.xi = S.coAutoXI(co.squad, co.form).xi;
    const bestXI = () => S.coAutoXI(co.squad.filter(c.avail), co.form, true).xi;
    const restXI = () => S.coAutoXI(co.squad.filter(c.avail), co.form, 'rest').xi; // os mais descansados de cada posição (poupar em jogo menor)
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
      // a linha de cima desce um pouco: o anel de quem está escolhido não pode ser cortado pelo campo (Silvio 2026-11-11)
      const sl = S.coSlots(co.form), sp = spotsT(co.form).map(([px, py]) => [px, Math.round(13 + (py - 9) * 68 / 72)]);
      const bench = co.squad.filter(p => !co.xi.includes(p.id)).sort(benchSort(c));
      // O auxiliar junta todas as trocas que faria (até 3): primeiro quem está fora de posição, depois os mais cansados,
      // cada um com o melhor do banco para a vaga (ninguém entra duas vezes)
      const fixes = [], took = new Set(), probs = [];
      co.xi.forEach((id, i) => { const p = by[id]; if (p && p.pos !== sl[i] && fitOf(p, sl[i]) === 'fora') probs.push({ p, i, off: 1 }); });
      co.xi.map((id, i) => [by[id], i]).filter(([p, i]) => p && p.en < 70 && !probs.some(q => q.i === i)).sort((x, y) => x[0].en - y[0].en).forEach(([p, i]) => probs.push({ p, i }));
      probs.forEach(({ p, i, off }) => { if (fixes.length >= 3) return;
        const sub = bench.filter(q => c.avail(q) && !took.has(q.id) && q.pos === sl[i] && (off || q.en > p.en + 15)).sort((x, y) => S.coSlotVal(y, co.form, i) - S.coSlotVal(x, co.form, i))[0];
        if (sub) { took.add(sub.id); fixes.push({ o: p, i: sub, at: i, slot: sl[i], tag: S.coSlotLbl(co.form, i), why: off ? 'improvisado' : Math.round(p.en) + '%' }); } });
      const p0 = probs[0];
      const aux = fixes.length ? '' : !p0 ? 'Time inteiro e cada um na sua posição. Pode ir.'
        : p0.off ? 'O ' + esc(last(p0.p.n)) + ' é ' + c.posTxt[p0.p.pos].toLowerCase() + '. Ninguém da posição no banco.'
        : 'O ' + esc(last(p0.p.n)) + ' está com ' + Math.round(p0.p.en) + '% de energia. Não tem ninguém melhor para a vaga.';
      const nFix = fixes.length, fixLbl = nFix === 1 ? 'Uma troca' : nFix + ' trocas';
      // Com um titular escolhido acende no banco quem joga na vaga; com um reserva escolhido, as vagas em que ele joga
      const selP = selB ? by[selB] : null;
      const dots = co.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { sel: swap === i, attr: ' data-xi="' + i + '" data-pid="' + id + '"' + (selP ? (fitsSlot(selP, sl[i]) ? ' data-fit="1"' : ' data-far="1"') : ''), tag: S.coSlotLbl(co.form, i) }) : '').join('');
      const bstrip = bench.map((p, k) => benchChip(p, bench[k - 1], (c.avail(p) ? '' : ' dis') + (selB === p.id ? ' on' : '') + (swap !== null && c.avail(p) ? (p.pos === sl[swap] ? ' can' : (p.pos === 'GOL') === (sl[swap] === 'GOL') ? ' lo' : ' far') : ''), c.avail(p), false, swap !== null ? ovrAt(p, sl[swap]) : null)).join('');
      const pick = (k, l, v) => '<div class="tm-pk"><button class="tm-ar" data-tmk="' + k + '" data-d="-1" aria-label="' + l + ' anterior">' + BK + '</button><span><small>' + l + '</small><b id="tm-' + k + '">' + v + '</b></span><button class="tm-ar" data-tmk="' + k + '" data-d="1" aria-label="Próximo ' + l.toLowerCase() + '">' + FW + '</button></div>';
      const title = swap !== null ? '<span class="tm-hint">Toque ou arraste quem entra, ou toque em outro titular</span>' : selB ? '<span class="tm-hint">Toque em quem sai</span>'
        : (vs ? '<b>x ' + esc(vs.short || vs.name) + '</b><small>' + (nx.home ? 'em casa' : 'fora') + ' · rodada ' + nx.round + '</small>' : '<b>' + esc(cl.short || cl.name) + '</b><small>escalação</small>') + LN_LEG;
      const play = toPlay && vs;
      // Dica do auxiliar no topo (Silvio 2026-11-09, opção A): uma por jogo, de estilo ou de formação, com o rosto dele; o
      // toque explica e aplica. O aviso de quem está cansado ou fora de posição entra na mesma janelinha (ponto laranja)
      // A sugestão de formação só sai depois do relatório do olheiro (Silvio 2026-11-10); antes, a pílula manda ler o olheiro
      const scR = vs && co.scout && co.scout.i === co.ss.i, tip = scR ? S.coTip(co, true) : null, used = S.coTipUsed(co, tip), tipNm = tip && S.coTipName(tip), plan = tip && tip.kind === 'plan', PL = 'PLANO ' + (auxEla(co) ? 'DA AUXILIAR' : 'DO AUXILIAR');
      const pill = swap !== null || selB ? '' : '<button class="tm-tip' + ((used || !tip) && !nFix ? ' ok' : '') + '" id="tm-aux"><span class="tm-tip-fw">' + auxFace(co, 'tm-tip-f') + '<em>' + S.coAuxLv(co).k + '</em></span>' +
        '<span><small>' + (tip && !(used && nFix) ? (plan ? PL : 'DICA DO AUXILIAR') : 'AUXILIAR') + '</small><b>' + (tip && !(used && nFix) ? (used ? (plan ? '✓ No plano ' + (auxEla(co) ? 'dela' : 'dele') : '✓ ' + esc(tipNm)) : esc(S.coTipLbl(tip))) : nFix ? fixLbl : vs && !scR ? 'Leia o olheiro' : 'Tudo certo') + '</b></span>' +
        (nFix ? '<i class="tm-tip-d n">' + nFix + '</i>' : tip && !used && !tip.seen ? '<i class="tm-tip-d"></i>' : '') + '</button>';
      show('<div class="tm"><div class="tm-h"><button class="tcr-back" id="tm-back" aria-label="Voltar">' + BK + '</button>' + title + pill + '</div>' +
        '<div class="ld-pitch tm-pitch">' + PITCH + dots + (swap !== null ? nearList(sl[swap], bench, c.avail, sp[swap][0], sp[swap][1]) : '') +
        '<button class="tm-best' + (bestXI().join() === co.xi.join() ? ' on' : '') + '" id="tm-best" aria-label="Escalar os melhores pelo geral"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/></svg>Melhores</button>' +
        '<button class="tm-best tm-rest' + (restXI().join() === co.xi.join() ? ' on' : '') + '" id="tm-rest" aria-label="Escalar os mais descansados de cada posição"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h15v8H3zM18 10.5h3v3h-3z"/></svg>Descansados</button></div>' +
        '<div class="tm-bench"><small>BANCO</small>' + bstrip + '</div>' +
        '<div class="tm-side">' + pick('form', 'Formação', co.form) + pick('sty', 'Estilo', esc(S.CO_STY[co.style].name)) +
        '<span class="tm-two"><button class="tm-b" id="ld-fun">Funções</button><button class="tm-b" id="ld-bat">Batedores</button></span><button class="tm-b" id="ld-ele">Elenco</button>' +
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
        // Melhores (Silvio 11/11): o maior geral de cada posição na formação de hoje; machucado e suspenso ficam fora
        st.querySelector('#tm-best').onclick = () => { const xi = bestXI(); if (xi.join() === co.xi.join()) { sfx('tap'); return; }
          sfx('ok'); co.xi = xi; co.autoXI = false; swap = null; selB = null; draw(); };
        st.querySelector('#tm-rest').onclick = () => { const xi = restXI(); if (xi.join() === co.xi.join()) { sfx('tap'); return; }
          sfx('ok'); co.xi = xi; co.autoXI = false; swap = null; selB = null; draw(); };
        benchDrag(st.querySelector('.tm'), put, (id, i) => !!by[id] && fitsSlot(by[id], sl[i])); benchShow(st); nearFix(st);
        // tocar fora (campo vazio, cabeçalho, coluna) fecha a escolha
        st.querySelector('.tm').addEventListener('click', e => { if ((swap !== null || selB) && !e.target.closest('[data-xi],[data-bp],.tm-near,button')) { swap = null; selB = null; draw(); } });
        st.querySelectorAll('[data-tmk]').forEach(b => b.onclick = () => {
          sfx('tap'); const d = +b.dataset.d;
          if (b.dataset.tmk === 'sty') { const L = S.CO_STYLES; co.style = L[(L.indexOf(co.style) + d + L.length) % L.length]; st.querySelector('#tm-sty').textContent = S.CO_STY[co.style].name; if (tip && (tip.kind === 'sty' || plan) && used !== S.coTipUsed(co, tip)) draw(); return; }
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
        st.querySelector('#ld-ele').onclick = () => { sfx('tap'); closePop(); c.keepBench(); c.save(); elenco(0, undefined, () => time(toPlay)); };
        if (st.querySelector('#tm-aux')) st.querySelector('#tm-aux').onclick = () => { sfx('tap');
          if (tip && !tip.seen) { tip.seen = 1; const d = st.querySelector('.tm-tip-d'); if (d && !nFix) d.remove(); }
          // A dica do jogo em cima (curta quando há trocas), a lista das trocas com um botão só, e a escalação inteira
          // Sem o relatório do olheiro, a pílula diz "Leia o olheiro" e a fala explica e leva até ele
          const toOl = vs && !scR && !nFix;
          const say = tip ? (used ? 'Do jeito que está eu não mexeria, professor.' : S.coTipTxt(tip)) : toOl ? 'Leia o relatório do olheiro que eu te digo o melhor plano para esse jogo, professor.' : aux, nw = t => t.replace(/\d(-\d)+/g, f => '<span class="tm-nw">' + f + '</span>');
          const ALL = '<button class="tm-all" id="ld-auto">Usar a escalação ' + (auxEla(co) ? 'dela' : 'dele') + ' inteira</button>';
          const tipHtml = !tip || (used && nFix) ? '' : nFix
            ? '<span class="tm-fix top"><small>' + nw(say) + '</small><button class="hl-btn line" id="ld-tip-y">' + (plan ? 'Usar o plano' : 'Usar ' + esc(tipNm)) + '</button></span>'
            : '<p>“' + nw(say) + '”</p>' + (used ? '' : '<span class="hl-ab"><button class="hl-btn dark" id="ld-tip-y">' + (plan ? 'Usar o plano' : 'Usar ' + esc(tipNm)) + '</button><button class="hl-btn line" data-pop-x>Manter</button></span>');
          pop('<div class="acd-help"><span class="aux-h">' + auxFace(co, 'aux-fc') + '<b>Auxiliar</b>' + (nFix ? ALL : '') + '</span>' +
            (tipHtml || (nFix ? '' : '<p>“' + say + '”</p>')) +
            (nFix ? auxRows(fixes) + '<span class="hl-ab"><button class="hl-btn dark" id="ld-aux-y">' + auxLbl(nFix) + '</button><button class="hl-btn line" data-pop-x>Manter</button></span>' : '') +
            (nFix ? '' : ALL) + ((tip && !used) || nFix ? '' : toOl ? '<span class="hl-ab"><button class="hl-btn dark" id="ld-see-ol">Ver o olheiro</button><button class="hl-btn line" data-pop-x>Fechar</button></span>' : '<button class="hl-btn line" data-pop-x>Fechar</button>') + '</div>', 'Auxiliar', w => {
            if (w.querySelector('#ld-see-ol')) w.querySelector('#ld-see-ol').onclick = () => { sfx('tap'); closePop(); c.keepBench(); c.save(); olheiro(); };
            if (w.querySelector('#ld-tip-y')) w.querySelector('#ld-tip-y').onclick = () => { sfx('tap'); closePop();
              if (plan) { co.style = tip.s; if (co.form !== tip.f) { co.xi = xiFor(tip.f); co.form = tip.f; } swap = null; selB = null; } else if (tip.kind === 'sty') co.style = tip.v; else { co.xi = xiFor(tip.v); co.form = tip.v; swap = null; selB = null; }
              draw(); };
            const y = w.querySelector('#ld-aux-y');
            if (y) { const on = auxBind(w, y); y.onclick = () => { sfx('tap'); on().forEach(k => { const g = fixes[k]; co.xi[g.at] = g.i.id; }); co.autoXI = false; closePop(); draw(); }; }
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
    // A cor de cada time no campinho, do lado do escudo (Silvio, 10/11: "preto e branco contra preto e branco, não sei qual é qual")
    // faixa vertical com as duas cores, como no placar da TV (Silvio, 11/11: a camisinha era muita coisa)
    // sigla de 3 letras como no placar da TV: a parte em maiúsculas do nome (CRB, ABC) ou a primeira palavra que conta
    const tla = (c, alt) => { const n = String(c.short || c.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''), w = n.split(/[\s\-.]+/).filter(Boolean),
      sf = /-([A-Z]{2})$/.exec(n), up = w.find(x => /^[A-Z]{3,4}$/.test(x) && !/^(FC|EC|SC|CR|SE|AC|CF|CD|SV|FK|AFC)$/.test(x)), st = /^(fc|ec|sc|cr|se|ac|cf|cd|sv|fk|afc|clube|club|esporte|sport|sociedade|de|do|da|del|la|le|the|real)$/i;
      if (sf && w.length > 1) return esc((w[0][0] + sf[1]).toUpperCase());
      if (alt && w.length > 1) { const l = w[w.length - 1].replace(/[^A-Za-z]/g, ''); return esc((w[0][0] + l.slice(0, 2)).toUpperCase()); }
      if (alt && w[0]) { const l = w[0].replace(/[^A-Za-z]/g, ''); return esc((l.slice(0, 2) + l.slice(-1)).toUpperCase()); }
      return esc(((up || w.find(x => !st.test(x) && x.length > 2) || w[0] || '').replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase()); };
    const kit = k => { if (!k) return ''; const c2 = (k.pat && k.pat[1]) || k[1] || k[0], bg = 'linear-gradient(180deg,' + k[0] + ' 50%,' + c2 + ' 50%)';
      return '<b class="ldl-kit"><i style="background:' + bg + '"></i></b>'; };
    const kH = o.kits ? (o.m.home ? o.kits.mine : o.kits.opp) : null, kA = o.kits ? (o.m.home ? o.kits.opp : o.kits.mine) : null;
    return '<div class="lv ldl"><div class="ldl-p">' + o.pitchHtml +
      '<div class="ldl-sb">' + kit(kH) + crestB(H.id, 'ldl-cr') + '<b class="ldl-tla">' + tla(H, tla(H) === tla(A)) + '</b><em id="lv-score">0 <i>x</i> 0</em><b class="ldl-tla">' + tla(A, tla(H) === tla(A)) + '</b>' + crestB(A.id, 'ldl-cr') + kit(kA) + '<small class="ldl-clk" id="lv-clock"><i></i>0\'</small>' +
        '<i class="lv-crd" id="lv-cd-h"></i><i class="lv-crd" id="lv-cd-a"></i></div></div>' +
      '<div class="ldl-side"><ul class="lv-feed ldl-ev" id="lv-feed">' + o.feed0 + '</ul>' +
        '<div class="ldl-qm"><small>QUEM MANDA</small><span>' + crestB(H.id, 'ldl-c16') + '<i' + (o.m.home ? '' : ' class="r"') + '><u id="ldl-momb"></u></i>' + crestB(A.id, 'ldl-c16') + '</span></div>' +
        '<div class="ldl-g4" id="ldl-g4">' + Object.keys(S.CO_SHOUT).map(k => '<button data-gr="' + k + '"><b>' + S.CO_SHOUT[k].name + '</b><small>' + S.CO_SHOUT[k].sub + '</small></button>').join('') + '</div>' +
        '<button class="ldl-num" id="ldl-num" aria-label="Números do jogo">Números</button><span class="ld-gr"></span>' + o.speedHtml +
        '<button class="ld-gold ldl-stop" id="b-lv-stop">' + o.pause + '<b>Parar e mexer</b></button></div>' +
      '<div hidden><b id="lv-sh"></b><b id="lv-ot"></b><b id="lv-ps"></b><div id="lv-cst"></div><b id="lv-momw"></b><span id="lv-mom"></span><div id="lv-aux"></div></div>' +
      '<div class="lv-sheet ldl-sheet" id="lv-sheet"></div></div>';
  }
  // Recado do auxiliar em cima do campinho do ao vivo por 4,5 s (rosto + frase curta; verde = deu certo, laranja = mexa)
  function planToast(k, sm, txt) {
    const p = document.querySelector('.ldl-p'); if (!p) return;
    const old = p.querySelector('.pl-ty'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'pl-ty ' + k; t.innerHTML = auxFace(C().co, 'pl-ty-f') + '<span><small>' + esc(sm) + '</small><b>' + esc(txt) + '</b></span>';
    p.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 4500);
  }
  function livePaint(x) {
    const m = x.m, sh = m.us.shout, $ = id => document.getElementById(id);
    const g = $('ldl-g4'); if (!g) return;
    // O auxiliar avisa no "Parar e mexer" quantos titulares estão no limite (abaixo de 58%, os que ele sugere trocar)
    { const by = byOf(m.us.squad), n = S.coSubLeft(m) > 0 && m.us.bench.length ? m.us.xi.filter((id, i) => i && by[id] && by[id].en < 58).length : 0, b = $('b-lv-stop');
      if (b && b._n !== n) { b._n = n; let d = b.querySelector('.tm-dot'); if (!n) { if (d) d.remove(); } else { if (!d) { d = document.createElement('i'); d.className = 'tm-dot'; b.appendChild(d); } d.textContent = n; } b.classList.toggle('aux', n > 0); } }
    // Plano do auxiliar (2026-11-11): aos 10' ele conta no campinho se o plano que você seguiu está funcionando
    if (m.plan && !m.plan.said && m.min >= 10 && !m.done) { m.plan.said = 1; const pn = S.coPlanNow(m);
      if (pn === 'ok') planToast('ok', 'O PLANO ESTÁ FUNCIONANDO', S.CO_PLAN_WHY[m.plan.why] || 'O time encaixou no jogo'); }
    // O que as licenças acrescentam (S.CO_AUX): B avisa perto do intervalo se o plano não encaixa; A avisa quando o rival muda
    // o plano; PRO diz quem vai cansar antes de cair (abaixo de 66%, uma vez por jogador)
    { const L = S.coAuxLv(C().co), tk = m.them.form + '|' + m.them.style;
      if (m.aux0 === undefined) m.aux0 = tk;
      if (L.ht && m.plan && !m.plan.htSaid && m.min >= 38 && m.min < 45 && !m.done) { m.plan.htSaid = 1; if (S.coPlanNow(m) === 'no') planToast('no', 'O PLANO NÃO ENCAIXOU', 'Mexa no intervalo, professor'); }
      if (L.riv && m.aux0 !== tk && !m.done) { m.aux0 = tk; planToast('no', 'ELES MUDARAM O PLANO', 'Agora vêm de ' + m.them.form + ' · ' + S.CO_STY[m.them.style].name + '. Pare e mexa'); }
      if (L.en && !m.done && S.coSubLeft(m) > 0) { const by = byOf(m.us.squad); m.enSaid = m.enSaid || {};
        const p = m.us.xi.map(id => by[id]).find(p => p && p.pos !== 'GOL' && p.en < 66 && p.en >= 58 && !m.enSaid[p.id]);
        if (p) { m.enSaid[p.id] = 1; planToast('no', 'VAI CANSAR LOGO', p.n.split(' ').pop() + ' está no limite. Troque na próxima parada'); } } }
    g.querySelectorAll('[data-gr]').forEach(b => { const on = !!sh && sh.k === b.dataset.gr; b.classList.toggle('on', on); b.disabled = !!sh && !on;
      b.querySelector('small').textContent = on ? 'até os ' + sh.until + '\'' : S.CO_SHOUT[b.dataset.gr].sub; });
    const st = x.stats();
    // Na ordem do placar (mandante à esquerda), com o escudo de cada lado: fora de casa o seu número é o da direita
    const sh2 = hv(m, st.sh.us, st.sh.them), ids = hv(m, C().co.club, m.vs);
    $('ldl-num').innerHTML = '<span>Chutes</span>' + crest(ids[0], 'ldl-c16') + '<b>' + sh2[0] + ' x ' + sh2[1] + '</b>' + crest(ids[1], 'ldl-c16') + '<i>›</i>';
    // Números aberto: acompanha o jogo (antes ficava parado no minuto em que abriu)
    const nb = $('ldl-nums'); if (nb) { nb.innerHTML = numBody(x); const sm = nb.parentNode.querySelector('.ld-ph small'); if (sm) sm.textContent = S.coClock(m); }
    if (!g._b) {
      g._b = 1;
      g.querySelectorAll('[data-gr]').forEach(b => b.onclick = () => { if (m.done || m.us.shout) return; sfx('tap'); x.shout(b.dataset.gr); });
      $('ldl-num').onclick = () => { sfx('tap'); numPop(x); };
    }
  }
  // Números na ordem do placar: mandante à esquerda, visitante à direita (o motor guarda us/them)
  const hv = (m, a, b) => (m.home ? [a, b] : [b, a]);
  // Escudo e nome em cima de cada coluna (o seu em destaque)
  const numHead = m => { const c = C(), me = '<span class="me">' + crest(c.co.club, 'ldl-c16') + '<b>' + esc(c.nm(c.co.club)) + '</b></span>', th = '<span>' + crest(m.vs, 'ldl-c16') + '<b>' + esc(c.nm(m.vs)) + '</b></span>';
    return '<div class="ldl-nh">' + hv(m, me, th).join('') + '</div>'; };
  // Números do jogo (não para o jogo; livePaint redesenha enquanto estiver aberto)
  function numBody(x) {
    const s = x.stats(), m = x.m;
    // a parte colorida da barra é sempre a sua (verde = melhor para você), do lado em que o seu escudo está
    const row = (k, a, b, inv) => { const t = a + b || 1, v = hv(m, a, b), me = '<u class="' + ((inv ? a <= b : a >= b) ? 'up' : 'dn') + '" style="width:' + Math.round(a / t * 100) + '%"></u>';
      return '<div class="ldl-nr"><b>' + v[0] + '</b><span><small>' + k + '</small><i>' + hv(m, me, '<u class="th"></u>').join('') + '</i></span><b>' + v[1] + '</b></div>'; };
    const ps = Math.round(s.poss * 100);
    return numHead(m) + row('Chutes', s.sh.us, s.sh.them) + row('No gol', s.ot.us, s.ot.them) + row('Posse (%)', ps, 100 - ps) + row('Faltas', s.fo.us, s.fo.them, 1) + row('Impedimentos', s.of.us, s.of.them, 1) +
      row('Amarelos', s.yc.us, s.yc.them, 1) + (s.rc.us + s.rc.them ? row('Vermelhos', s.rc.us, s.rc.them, 1) : '');
  }
  function numPop(x) {
    pop(popHead('Números do jogo', S.coClock(x.m)) + '<div class="ld-pb col ldl-nums" id="ldl-nums">' + numBody(x) + '</div>', 'Números do jogo', null, 'w560');
  }
  const byOf = sq => { const o = {}; sq.forEach(p => { o[p.id] = p; }); return o; };
  const enC = e => (e >= 70 ? 'ok' : e >= 50 ? 'mid' : 'low');
  // Tocar num jogador seu no campinho abre esta mesma parada com ele já escolhido (st.pick): quem entra aparece ao lado dele
  // A parada (intervalo, vermelho, lesão, "Parar e mexer"; o gol não para desde 2026-11-09): o campo da escalação
  // (Silvio 2026-11-09), com o anel de energia e o amarelo de cada um. Troca: toque num titular e num do banco (ou o
  // contrário); dois titulares trocam de lugar. Formação e estilo com ◀ ▶; o auxiliar num botão (etiquetas e a troca que
  // ele sugere); no intervalo, a conversa em cima. Nada de cartão do lance, frase longa ou "o que aconteceu".
  function liveStop(x, st) {
    const m = x.m, s = m.us, c = C(), co = c.co, half = st.t === 'intervalo', us = st.s === 'us';
    const f0 = s.form, y0 = s.style, FORMS = Object.keys(S.CO_FORMS), inn = new Set();
    let talk = null, sel = st.pick ? s.xi.indexOf(st.pick) : -1, selB = null;
    const T = { gol: 'Gol do ' + (us ? c.nm(co.club) : c.nm(m.vs)), intervalo: 'Intervalo', vermelho: 'Expulso', lesao: 'Lesão', pausa: 'Jogo parado' }[st.t] || 'Parada';
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    // As trocas que o auxiliar sugere (até 3 e até onde há troca): machucado, cansado ou amarelado, cada um com o melhor
    // do banco para a vaga; ninguém entra duas vezes
    // a parada de agora: várias trocas nela gastam uma parada só; o intervalo não gasta (regra do futebol, Silvio 11/11)
    const wk = half ? 'ht' : 'p' + m.min + (m.st || 0) + st.t, L = () => S.coSubLeft(m, wk);
    // Quantas trocas e paradas sobram, em bolinhas (Silvio 11/11: "um indicativo pra saber quantas trocas ainda tenho")
    const subBar = () => {
      const pips = (n, on) => Array.from({ length: n }, (_, i) => '<u' + (i < on ? ' class="on"' : '') + '></u>').join('');
      const W = s.win == null ? null : s.win + (s.wk === wk ? 1 : 0), Wn = S.CO.win || 3;
      return '<div class="ldl-tro"><span><small>TROCAS</small><i>' + pips(S.CO.subs || 5, s.subs) + '</i><b>' + s.subs + '</b></span>' +
        (W == null ? '' : '<span><small>PARADAS</small><i>' + pips(Wn, s.win) + '</i><b>' + s.win + '</b></span>') +
        '<em>' + (half ? 'Intervalo não gasta parada' : s.wk === wk ? 'Esta parada já contou' : W ? 'Trocar agora gasta 1 parada' : s.subs ? 'Sem paradas: só troca por lesão' : 'Lesão não conta') + '</em></div>';
    };
    const suggs = () => {
      const by = byOf(s.squad), sl = S.coSlots(s.form), out = [], took = new Set();
      let paid = 0; // a troca de quem se machucou não gasta uma das 5
      if (!L() && !s.xi.some(id => by[id] && by[id].out > 0)) return [];
      const cand = s.xi.map((id, i) => [by[id], i]).filter(([p]) => p && (p.out || p.en < 58 || (s.bk && s.bk[p.id]))).sort((a, b) => (b[0].out ? 1 : 0) - (a[0].out ? 1 : 0) || a[0].en - b[0].en);
      for (const [p, i] of cand) {
        if (out.length >= 3) break;
        if (!p.out && paid >= L()) continue;
        const slot = sl[i], q = s.bench.map(b => by[b]).filter(q => q && c.avail(q) && !took.has(q.id) && (q.pos === 'GOL') === (slot === 'GOL')).sort((a, b) => S.coSlotVal(b, s.form, i) - S.coSlotVal(a, s.form, i))[0];
        if (q) { took.add(q.id); if (!p.out) paid++; out.push({ o: p, i: q, slot, tag: S.coSlotLbl(s.form, i), why: p.out ? 'machucado' : p.en < 58 ? Math.round(p.en) + '%' : 'amarelo' }); }
      }
      return out;
    };
    const doSub = (outId, inId) => { if (x.sub(outId, inId, wk)) { inn.add(inId); sfx('tap'); } sel = -1; selB = null; draw(); };
    const auxPop = () => {
      const r = x.read, G = suggs(), tc = t => /↓/.test(t) ? 'dn' : /↑/.test(t) ? 'up' : 'y';
      const host = document.querySelector('#ld-pop .ldl-full'); if (!host) return;
      const ov = document.createElement('div'); ov.className = 'ldl-ov';
      ov.innerHTML = '<div class="acd-help ldl-aux" role="dialog" aria-label="Auxiliar"><b>Auxiliar</b>' +
        (r.tags.length ? '<span class="ldl-chips">' + r.tags.map(t => '<em class="' + tc(t) + '">' + esc(t) + '</em>').join('') + '</span>' : G.length ? '' : '<p>“' + esc(r.txt) + '”</p>') +
        (st.t === 'vermelho' ? '<div class="ldl-red">' + x.redOpts(st) + '</div>' : '') + (G.length ? auxRows(G) : '') +
        '<span class="hl-ab">' + (G.length ? '<button class="hl-btn dark" id="ldl-aux-y">' + auxLbl(G.length) + '</button>' : '') +
        '<button class="hl-btn line" id="ldl-aux-n">' + (G.length ? 'Manter' : 'Voltar') + '</button></span></div>';
      host.appendChild(ov);
      { const w = ov, y = w.querySelector('#ldl-aux-y');
        w.querySelectorAll('[data-ro]').forEach(b => b.onclick = () => { sfx('tap'); x.redPick(b.dataset.ro); draw(); });
        if (y) { const on = auxBind(w, y); y.onclick = () => { let did = 0; on().forEach(k => { const g = G[k]; if (x.sub(g.o.id, g.i.id, wk)) { inn.add(g.i.id); did++; } }); if (did) sfx('tap'); sel = -1; selB = null; draw(); }; }
        w.querySelector('#ldl-aux-n').onclick = () => { sfx('tap'); draw(); };
        w.onclick = e => { if (e.target === w) { sfx('tap'); draw(); } };
      }
    };
    const draw = () => {
      const by = byOf(s.squad), sl = S.coSlots(s.form), G = suggs(), nT = x.read.tags.length, idle = sel < 0 && !selB;
      const gOut = new Set(G.map(g => g.o.id)), gIn = new Set(G.map(g => g.i.id)), selP = selB ? by[selB] : null;
      // sem trocas, ainda dá para tirar quem se machucou (não gasta uma das 5)
      const hurt = id => !!(by[id] && by[id].out > 0), anySub = L() > 0 || s.xi.some(hurt), selSub = sel >= 0 && (L() > 0 || hurt(s.xi[sel]));
      // longe da borda: o anel, o amarelo e o contorno da sugestão não podem ser cortados pelo campo
      const sp = spotsT(s.form).map(([px, py]) => [px, Math.round(10 + (py - 9) * 1.042)]);
      const dots = s.xi.map((id, i) => by[id] ? dot(by[id], sl[i], sp[i][0], sp[i][1], { sel: sel === i, yc: !!(s.bk && s.bk[id]),
        attr: ' data-xi="' + i + '"' + (inn.has(id) ? ' data-in="1"' : '') + (idle && gOut.has(id) ? ' data-sug="1"' : '') + (selP ? (fitsSlot(selP, sl[i]) ? ' data-fit="1"' : ' data-far="1"') : ''), tag: inn.has(id) ? 'ENTRA' : S.coSlotLbl(s.form, i) }) : '').join('');
      const bench = s.bench.map(b => by[b]).filter(Boolean).sort(benchSort(c));
      const bstrip = bench.map((p, k) => { const ok = !!(anySub && c.avail(p));
        return benchChip(p, bench[k - 1], (ok ? '' : ' dis') + (selB === p.id ? ' on' : '') + (idle && gIn.has(p.id) ? ' sug' : '') + (sel >= 0 && ok ? (p.pos === sl[sel] ? ' can' : (p.pos === 'GOL') === (sl[sel] === 'GOL') ? ' lo' : ' far') : ''), ok, true, sel >= 0 && ok ? ovrAt(p, sl[sel]) : null); }).join('');
      const pick = (k, l, v) => '<div class="tm-pk"><button class="tm-ar" data-tmk="' + k + '" data-d="-1" aria-label="' + l + ' anterior">' + BK + '</button><span><small>' + l + '</small><b>' + v + '</b></span><button class="tm-ar" data-tmk="' + k + '" data-d="1" aria-label="Próximo ' + l.toLowerCase() + '">' + FW + '</button></div>';
      const hint = sel >= 0 ? (selSub ? 'Toque ou arraste quem entra, ou toque em outro titular' : 'Toque em outro titular')  : selB ? 'Toque em quem sai' : '';
      const sc = esc(c.nm(m.home ? co.club : m.vs)).slice(0, 3).toUpperCase() + ' <u>' + m.gh + ' x ' + m.ga + '</u> ' + esc(c.nm(m.home ? m.vs : co.club)).slice(0, 3).toUpperCase();
      pop('<div class="tm ldl-tm' + (half ? ' ht' : '') + '"><div class="tm-h"><b>' + esc(T) + '</b><span class="ldl-sc">' + sc + '</span><small>' + S.coClock(m) + '</small>' + (hint ? '<span class="tm-hint">' + hint + '</span>' : LN_LEG) + '</div>' +
        '<div class="ld-pitch tm-pitch">' + PITCH + dots + (selSub ? nearList(sl[sel], bench, c.avail, sp[sel][0], sp[sel][1]) : '') + '</div>' +
        '<div class="tm-bench"><small>BANCO<em>' + (L() ? U.D.plural(L(), 'troca', 'trocas') : anySub ? 'só a da lesão' : s.subs ? 'sem paradas' : 'sem trocas') + '</em></small>' + bstrip + '</div>' +
        '<div class="tm-side">' + (half ? '<div class="ldl-talk2">' + Object.keys(S.CO_TALK).map(k => '<button data-tk="' + k + '"' + (talk === k ? ' class="on"' : '') + '>' + esc(S.CO_TALK[k].name) + '</button>').join('') + '</div>' : '') +
          pick('form', 'Formação', s.form) + pick('sty', 'Estilo', esc(S.CO_STY[s.style].name)) +
          subBar() + '<button class="tm-b" id="ldl-aux">Auxiliar' + (nT || G.length || st.t === 'vermelho' ? '<i class="tm-dot">' + (st.t === 'vermelho' ? '!' : G.length || '') + '</i>' : '') + '</button>' +
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
          if (anySub) benchDrag(w.querySelector('.ldl-tm'), (id, i) => doSub(s.xi[i], id), (id, i) => !!by[id] && fitsSlot(by[id], sl[i]));
          benchShow(w); nearFix(w);
          w.querySelector('.ldl-tm').addEventListener('click', e => { if ((sel >= 0 || selB) && !e.target.closest('[data-xi],[data-bp],.tm-near,button')) { sel = -1; selB = null; draw(); } });
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
    // Lances e Quem mandou com sinais claros (Silvio 2026-11-10): um ícone por lance (bola no gol, cartão, troca, lesão,
    // bandeira, chute apagado), o escudo de quem fez e a faixa verde/vermelha no gol; no gráfico, bola e cartão no minuto
    const sumLine = (m, e) => { const h = c.feedLine(m, e).replace(/<span class="co-(yc|red)"><\/span> /g, ''), ic = EV_ICO(e);
      const cr = (e.s === 'us' || e.s === 'them') && e.t !== 'grito' && e.t !== 'conversa' && !(e.s === 'us' && (e.t === 'tatica' || e.t === 'troca')) ? crest(e.s === 'us' ? co.club : m.vs, 'rsi-cr') : '<u class="rsi-cr"></u>';
      return h.replace('</i><span>', '</i><em class="rsi">' + ic + '</em>' + cr + '<span>'); };
    // Quem mandou: só 4 linhas cabem embaixo do gráfico sem cortar (Silvio, 2026-11-11): gols e vermelhos primeiro, depois as suas mudanças; tudo está em Lances
    const keyEv = m => { const g = m.ev.filter(e => e.t === 'gol' || e.t === 'vermelho'), x = m.ev.filter(e => e.s === 'us' && (e.t === 'tatica' || e.t === 'troca'));
      const pick = g.slice(0, 4).concat(x.slice(0, Math.max(0, 4 - g.length))); return m.ev.filter(e => pick.indexOf(e) >= 0); };
    const momMarks = m => { const VW = Math.max(90, (m.mom || []).length);
      return '<div class="rs-mkw">' + m.ev.filter(e => e.t === 'gol' || e.t === 'vermelho').map(e => '<span class="rs-mk ' + (e.s === 'us' ? 'us' : 'th') + '" style="left:' + ((Math.min(e.m, VW) - 0.5) / VW * 100).toFixed(1) + '%">' + EV_ICO(e) + '</span>').join('') + '</div>'; };
    const draw = () => {
      const nums = matchNums(m).filter(r => KEEP.indexOf(r[0]) >= 0);
      const cd = n => '<i class="y"></i>'.repeat(Math.min(3, n[0] || 0)) + '<i class="r"></i>'.repeat(n[1] || 0);
      // Na ordem do placar de cima (mandante à esquerda); a parte colorida da barra é a sua
      const bar = ([k, a, b, suf, inv, cards]) => { const t = (a + b) || 1, good = inv ? a <= b : a >= b, v = hv(m, a, b), cs = cards ? hv(m, cd(cards.slice(0, 2)), cd(cards.slice(2))) : ['', ''];
        return '<div class="rs-r"><b>' + (cards ? cs[0] + ' ' : '') + v[0] + (suf || '') + '</b><span><small>' + k + '</small><i>' + hv(m, '<u class="' + (good ? 'up' : 'dn') + '" style="width:' + Math.round(a / t * 100) + '%"></u>', '<u class="th"></u>').join('') + '</i></span><b>' + v[1] + (suf || '') + (cards ? ' ' + cs[1] : '') + '</b></div>'; };
      const pane = tab === 'num' ? '<div class="rs-nums">' + numHead(m) + nums.map(bar).join('') + '</div>' :
        tab === 'mom' ? '<div class="ldr-mom">' + U.lvMom(m, move !== null && move !== undefined ? move : null) + momMarks(m) + '</div><div class="rs-momf"><small>0\'</small><small>' + (move !== null && move !== undefined ? 'sua mudança aos ' + move + '\'' : 'acima é você') + '</small><small>90\'</small></div>' +
          '<ul class="ldl-last ldr-key">' + keyEv(m).map(e => sumLine(m, e)).join('') + '</ul>' :
        '<ul class="ldl-last ldr-all">' + m.ev.filter(e => e.t !== 'grito-fim').map(e => sumLine(m, e)).join('') + '</ul>';
      const rows = chg.filter(r => r[0] !== 'Caixa').map(([k, v, cc]) => [k, k === 'Tabela' ? (pre.pos && pre.pos !== pos ? ord(pre.pos) + ' → ' + ord(pos) : ord(pos)) : k === 'Diretoria' ? (co.sacked ? 'demitido' : cc === 'up' ? 'subiu' : cc === 'dn' ? 'caiu' : 'igual') : v, cc]);
      if (cadN.length) rows.push(['Caderno', '+' + cadN.length + (cadN.length > 1 ? ' notas' : ' nota'), 'up', 1]);
      if (log.closed) rows.push(['Público', 'portões fechados', '']);
    else if (log.pub) rows.push(['Público', milK(log.pub) + (log.pub >= log.cap * S.CO_EST.full ? ' · lotou' : ''), log.pub >= log.cap * S.CO_EST.full ? 'gd' : '']);   // estádio: só nos jogos em casa
      { const rd = S.coFin(co) && S.coFin(co).rd; // dinheiro da rodada (Silvio 11/11): toque abre Finanças na aba Rodada
        if (rd && rd.s === co.season && rd.r === log.r) { const a = rd.inn.reduce((t, x) => t + x[1], 0), b = rd.out.reduce((t, x) => t + x[1], 0);
          rows.push(['Rodada', '+' + c.mi(a) + ' / −' + c.mi(b), a >= b ? 'up' : 'dn', 'rs-fin']); } }
      // Plano do auxiliar (2026-11-11): a primeira linha diz se seguir o plano deu certo; com 5 linhas o Público sai
      if (log.plan) { rows.unshift(['Plano ' + (auxEla(co) ? 'dela' : 'dele'), log.plan === 'ok' ? 'funcionou ✓' : log.plan === 'no' ? 'não encaixou' : 'não seguiu', log.plan === 'ok' ? 'up' : log.plan === 'no' ? 'dn' : '']);
        if (rows.length > 4) { const i = rows.findIndex(r => r[0] === 'Público'); if (i >= 0) rows.splice(i, 1); } }
      show('<div class="rs">' +
        '<div class="rs-sc">' + crest((m.home ? cl : vs).id, 'rs-cr') + '<em>' + m.gh + ' <i>x</i> ' + m.ga + '</em>' + crest((m.home ? vs : cl).id, 'rs-cr') +
          '<span class="rs-w"><b class="' + log.res + '">' + word + (aux ? ' · COM O AUXILIAR' : '') + '</b><small>' + (goals.length ? goals.join(' · ') : 'sem gols') + '</small></span></div>' +
        '<div class="rs-tabs">' + [['num', 'Números'], ['mom', 'Quem mandou'], ['lan', 'Lances']].map(([k, t]) => '<button data-rt="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        '<div class="rs-pane ' + tab + '">' + pane + '</div>' +
        '<div class="rs-side' + (rows.length > 3 ? ' n4' : '') + '">' +
          (best ? '<div class="rs-best"><small>MELHOR DO SEU TIME</small><span><b class="' + (best.r >= 7 ? 'up' : best.r < 5.8 ? 'dn' : '') + '">' + best.r.toFixed(1).replace('.', ',') + '</b><span><em>' + esc(bp ? bp.n : '') + '</em><small>' + esc(best.w) + '</small></span></span></div>' : '') +
          '<div class="rs-ch">' + rows.map(([k, v, cc, cad]) => (cad ? '<button id="' + (cad === 1 ? 'rs-cad' : cad) + '">' : '<span>') + k + '<b class="' + (cc || '') + '">' + esc(v) + '</b>' + (cad ? '</button>' : '</span>')).join('') + '</div>' +
          '<span class="rs-gap"></span>' +
          (rt.length ? '<button class="tm-b" id="ldr-all">Notas do time</button>' : '') +
          '<button class="tm-go" id="ldr-go">' + (co.sacked ? 'Falar com o presidente' : co.ss.done ? 'Fim da temporada' : 'Continuar') + '</button>' +
        '</div></div>', st => {
        st.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { sfx('tap'); tab = b.dataset.rt; draw(); });
        if (st.querySelector('#ldr-all')) st.querySelector('#ldr-all').onclick = () => { sfx('tap'); pop(popHead('Notas do jogo', 'Rodada ' + log.r + ' · ' + m.gh + ' x ' + m.ga) + '<div class="ld-pb col"><div class="ld-scroll ldr-alln">' + rt.map(nota).join('') + '</div></div>', 'Notas do jogo', null, 'w560'); };
        if (st.querySelector('#rs-fin')) st.querySelector('#rs-fin').onclick = () => { sfx('tap'); FIN_BACK = () => result(m, log, aux, move); financas('rod'); };
        if (st.querySelector('#rs-cad')) st.querySelector('#rs-cad').onclick = () => { sfx('tap'); pop(popHead('Anotado no caderno', vs ? c.nm(m.vs) : '') + '<div class="ld-pb col rs-cadp">' + cadN.map(cadTxt).join('') + '</div>', 'Anotado no caderno', null, 'w560'); };
        st.querySelector('#ldr-go').onclick = () => { sfx('tap'); if (co.sacked) { // demitido: janelinha por cima do resultado (a tela antiga era em pé, com a coluna estreita e o fundo de outra cor)
          const cl = club(co.club);
          return pop('<div class="acd-help"><span class="aux-h">' + crest(cl.id, 'sack-cr') + '<b>Você foi demitido.</b></span><p>' + U.coSackWhy(co) + ' A temporada segue sem você; no fim dela, o telefone toca de novo.</p>' +
            '<button class="hl-btn dark" id="ld-sack">Ver como terminou a liga</button></div>', 'Demitido', w => { w.querySelector('#ld-sack').onclick = () => { sfx('tap'); closePop(); off(); c.finishSeason(); }; }, 'hl-pop acd-pop', true); } if (co.ss.done) { off(); return c.finishSeason(); } segunda(log); };
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
    const talker = S.coTalkWho(co);
    semana();
    if (talker && !tutStep(co)) talkPop(talker, log); // com o tutorial da Semana na tela, a conversa fica para depois
  }
  // A conversa (Silvio 2026-11-10, opção A; desenho em /mnt/project-files/climbix/conversa-jogador/): a ficha do jogador
  // (o disco da escalação com geral, posição e energia), o motivo numa etiqueta, a moral em 5 tracinhos, a fala num balão
  // creme e as 3 respostas lado a lado com o que cada uma custa. Tocou: ele responde no mesmo balão, a moral anda e a
  // janelinha fecha sozinha (ou no toque). Fechar no X não responde: ele volta a pedir na semana seguinte
  const cvjMo = (p, was, d) => { const mt = S.coMoTxt(p);
    return '<span class="cvj-mo' + (mt.low ? '' : ' ok') + '"><small>MORAL' + (d ? '<u class="' + (d > 0 ? 'up">▲' : 'dn">▼') + '</u>' : '') + '</small><span><span class="cvj-pip">' + [1, 2, 3, 4, 5].map(i => '<i class="' + (i <= mt.n ? 'on' : '') + (was && i > was && i <= mt.n ? ' new' : '') + '"></i>').join('') + '</span><b>' + mt.t + '</b></span></span>'; };
  function talkPop(p, log) {
    const c = C(), co = c.co, why = S.coTalkWhy(co, p);
    const fx = t => t.fx.map(f => '<em' + (f[0] ? ' class="' + f[0] + '"' : '') + '>' + (f[1] ? '<i>' + f[1] + '</i>' : '') + f[2] + '</em>').join('');
    const body = (say, pick, was, d) => '<div class="cvj-h"><span class="cvj-d ' + enRing(p.en) + '" style="--en:' + Math.round(p.en) + '"><b>' + p.ovr + '</b><em>' + p.pos + '</em></span>' +
      '<span class="cvj-n"><b>' + esc(p.n) + '</b><small>' + c.posTxt[p.pos] + ' · ' + p.age + ' anos' + (why.tag ? '<em>' + why.tag + '</em>' : '') + '</small></span>' + cvjMo(p, was, d) +
      (pick ? '' : '<button class="ld-x" data-pop-x aria-label="Fechar">' + XI_ICO + '</button>') + '</div>' +
      '<div class="cvj-say"><p>“' + esc(say) + '”</p></div>' +
      '<div class="cvj-ops">' + Object.keys(S.CO_TALK1).map(k => { const t = S.CO_TALK1[k];
        return '<button class="cvj-op' + (pick ? (k === pick ? ' on' : ' off') : '') + '" data-t1="' + k + '"' + (pick ? ' disabled' : '') + '><b>' + t.name + '</b><span>' + fx(t) + '</span></button>'; }).join('') + '</div>';
    pop(body(why.say), 'Conversa com ' + p.n, w => {
      w.querySelectorAll('[data-t1]').forEach(b => b.onclick = () => {
        const k = b.dataset.t1, was = S.coMoTxt(p).n, cc = w.querySelector('.ld-pop-c');
        sfx('tap'); S.coTalk1(co, p.id, k); c.save();
        cc.classList.add('done'); cc.innerHTML = body(S.CO_TALK1[k].re, k, was, S.CO_TALK1[k].mo);
        const end = () => { if (w.isConnected) closePop(); };
        setTimeout(() => { if (w.isConnected) w.onclick = () => { sfx('tap'); end(); }; }, 350); // o toque da resposta não fecha
        setTimeout(end, 2400);
      });
    }, 'cvj-pop');
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
      body = '<div class="tb2-h' + (tab === 'cls' ? ' cls' : '') + '"><i></i><i></i><span>CLUBE</span>' + (tab === 'cls' ? '<em>J</em><em>V</em><em>E</em><em>D</em><em>SG</em><b>PTS</b>' : '<em>GP</em><em>GC</em><b>SG</b>') + '<span>FORMA</span></div><div class="tb2-b">' +
        t.map((x, k) => { const sg = x.gp - x.gc, cl = club(x.id), sgT = (sg > 0 ? '+' : '') + sg;
          return '<div class="tb2-r ' + zone(k + 1) + (x.me ? ' me' : '') + (tab === 'cls' ? ' cls' : '') + '"><i>' + (k + 1) + '</i>' + crest(x.id, 'tb2-cr') + '<span>' + esc(cl.short || cl.name) + '</span>' +
            (tab === 'cls' ? '<em>' + x.j + '</em><em>' + (x.v || 0) + '</em><em>' + (x.e || 0) + '</em><em>' + (x.d || 0) + '</em><em>' + sgT + '</em><b>' + x.p + '</b>' : '<em>' + x.gp + '</em><em>' + x.gc + '</em><b>' + sgT + '</b>') + dots(x.f) + '</div>'; }).join('') + '</div>';
    } else if (tab === 'art') {
      // Artilharia do campeonato com o escudo de cada um; os seus em destaque e, se nenhum está entre os 6, o seu melhor no fim
      const all = S.coLeagueScorers(co), TOP = 6, list = all.slice(0, TOP).map((x, k) => [x, k]), mineAt = all.findIndex(x => x.me);
      if (mineAt >= TOP) list[TOP - 1] = [all[mineAt], mineAt];
      body = '<div class="tb2-h art"><i></i><span>ARTILHARIA</span><b>GOLS</b></div><div class="tb2-b">' + (list.length ? list.map(([x, k]) => '<div class="tb2-r art' + (x.me ? ' me' : '') + '"><i>' + (k + 1) + '</i>' + crest(x.club, 'tb2-cr') + '<span>' + esc(x.n) + ' <small>' + (x.pos || 'saiu') + ' · ' + esc(club(x.club).short || club(x.club).name) + '</small></span><b>' + x.g + '</b></div>').join('') : '<p class="tb2-none">Ninguém marcou ainda.</p>') + '</div>';
    } else {
      const res = (ss.res || [])[rd], played = rd < ss.i, mi = ss.ids.indexOf(co.club);
      const list = (played && res ? res.slice() : ss.rounds[rd].map(([h, a]) => [h, a])).sort((a, b) => (b[0] === mi || b[1] === mi) - (a[0] === mi || a[1] === mi));
      const nmI = i => esc(club(ss.ids[i]).short || club(ss.ids[i]).name);
      body = '<div class="tb2-nav"><button id="ldt-prev"' + (rd ? '' : ' disabled') + ' aria-label="Rodada anterior">' + MK_L + '</button><b>Rodada ' + (rd + 1) + ' de ' + R + (played ? '' : ' · a jogar') + '</b><button id="ldt-next"' + (rd < R - 1 ? '' : ' disabled') + ' aria-label="Próxima rodada">' + MK_R + '</button></div><div class="tb2-b">' +
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
    const est = S.coEst && U.EST ? S.coEst(co) : null, aux = S.coAux(co), auxLv = S.coAuxLv(co), dm = S.coDm(co);
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const tile = (id, k, t, v, sub, cc) => '<button class="kb2-t"' + (id ? ' id="' + id + '"' : '') + ' data-k="' + k + '"><b>' + t + '</b><span><em class="' + (cc || '') + '">' + v + '</em><small>' + sub + '</small></span></button>';
    const meta = (B.goal.k === 'titulo' ? 'META · título' : 'META · até o ' + B.goal.pos + 'º') + ' · hoje ' + pos + 'º';
    show('<div class="kb2"><div class="tm-h"><button class="tcr-back" id="kb2-back" aria-label="Voltar">' + BK + '</button>' + crest(cl.id, 'kb2-cr') + '<b>' + esc(cl.name) + '</b><small>' + esc(co.ss ? co.ss.name : '') + ' · fama ' + co.fame + '</small></div>' +
      '<div class="kb2-g' + (est ? ' g3' : '') + '">' + tile('ldk-go', 'fin', 'Finanças', c.brl(f.caixa), 'no caixa', f.caixa < 0 ? 'dn' : '') +
        tile('', 'ele', 'Elenco', exp ? exp : co.squad.length, exp ? (exp > 1 ? 'contratos acabam' : 'contrato acaba') + ' no fim do ano' : 'jogadores', exp ? 'dn' : '') +
        tile('', 'tro', 'Troféus', co.titles.length, co.titles.length === 1 ? 'título' : 'títulos') +
        tile('', 'hall', est ? 'Hall' : 'Hall do técnico', (co.season + 1) + 'ª', 'temporada de carreira') +
        (est ? '<button class="kb2-t kb2-es" id="kb2-est" data-k="est"><b>Estádio</b>' + estThumb(co, est) + '<span><em>' + milK(S.coEstCap(est)) + '</em><small>lugares</small>' +
          '<em class="hm ' + estCls(est) + '">torcida ' + S.coEstHum(est) + '</em></span></button>' : '') + '</div>' +
      '<div class="kb2-side k3"><div class="kb2-dir">' + (pres ? presFace(pres, 'kb2-pf') : '') + '<small>DIRETORIA</small><b>' + (conf >= 70 ? 'confiança alta' : conf >= 45 ? 'confiança boa' : conf >= 30 ? 'confiança baixa' : 'no limite') + '</b>' +
          '<i><u class="' + (conf >= 55 ? 'ok' : conf >= 35 ? 'mid' : 'low') + '" style="width:' + conf + '%"></u></i><em class="' + (pos <= B.goal.pos ? '' : 'hi') + '">' + meta + '</em></div>' +

        // A auxiliar logo abaixo do presidente, no mesmo cartão (Silvio 2026-11-11: "melhor encaixada embaixo do presidente")
        '<button class="kb2-pr fc kb2-ax" id="kb2-aux">' + auxFace(co, 'kb2-fc') + '<div><small>AUXILIAR · ' + esc(auxLv.n.toUpperCase()) + '</small><b>' + esc(aux.n) + '</b>' +
          '<span class="go">' + (aux.crs ? 'em curso · ' + U.D.plural(aux.crs.left, 'rodada', 'rodadas') : aux.lv >= S.CO_AUX.lv.length - 1 ? 'licença máxima' : 'subir de licença ›') + '</span></div></button>' +
        // Departamento médico embaixo da auxiliar (2026-11-11); o presidente foi para o canto da diretoria
        '<button class="kb2-pr fc kb2-ax" id="kb2-dm">' + face(S.coDmDoc(co).fc, 'kb2-fc', 'Departamento médico') + '<div><small>DEP. MÉDICO · ' + esc(S.CO_DM.lv[dm.lv].n.toUpperCase()) + '</small><b>' + esc(S.coDmDoc(co).n) + '</b>' +
          '<span class="go">' + (dm.obra ? 'em obra · ' + U.D.plural(dm.obra.left, 'rodada', 'rodadas') : S.coDmLeft(co) && S.coDmWho(co).length ? 'tratar ' + (S.coDmLeft(co) > 1 ? S.coDmLeft(co) + ' jogadores' : '1 jogador') + ' ›' : dm.lv >= S.CO_DM.lv.length - 1 ? 'nível máximo' : 'melhorar ›') + '</span></div></button>' +
        (est ? '' : '<span class="rs-gap"></span><p class="kb2-soon">Estádio e base chegam depois</p>') + '</div></div>', st => {
      st.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.k; if (k === 'fin') { FIN_BACK = null; financas(); } else if (k === 'ele') elenco(); else if (k === 'tro') trofeus(); else if (k === 'hall') hall(); else if (k === 'est') estadio(); });
      st.querySelector('#kb2-aux').onclick = () => { sfx('tap'); auxiliar(); };
      st.querySelector('#kb2-dm').onclick = () => { sfx('tap'); depMedico(); };
      st.querySelector('#kb2-back').onclick = () => { sfx('tap'); semana(); };
    });
  }

  // Curso pronto: a janelinha na volta para a semana, uma vez (S.coAuxDone)
  function auxPop(co) {
    const L = S.coAuxDone(co); if (!L) return false; const a = S.coAux(co);
    pop('<div class="acd-help"><span class="aux-h">' + auxFace(co, 'aux-fc') + '<b>' + esc(a.n) + '</b></span><p>Terminei o curso: agora tenho a <b>' + L.n + '</b>. ' + L.t + ', professor.</p>' +
      '<span class="hl-ab"><button class="hl-btn dark" id="axp-go">Ver</button><button class="hl-btn line" data-pop-x>Fechar</button></span></div>', 'Auxiliar', w => {
      w.querySelector('#axp-go').onclick = () => { sfx('tap'); closePop(); auxiliar(); }; }, 'hl-pop acd-pop tm-pop');
    C().save(); return true;
  }
  // ---------- Auxiliar (2026-11-11, desenho aprovado): rosto e licença, a escada das 5 licenças e o curso da próxima ----------
  function auxiliar() {
    const c = C(), co = c.co, a = S.coAux(co), L = S.CO_AUX.lv, P = S.coAuxPlan(co), ela = !!a.ela;
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const seg = a.seg.length ? 'Seguiu o plano ' + (ela ? 'dela' : 'dele') + ': ' + U.D.plural(a.seg.filter(Boolean).length, 'vitória', 'vitórias') + ' em ' + a.seg.length : 'Siga o plano ' + (ela ? 'dela' : 'dele') + ' no Time';
    const lv = (l, i) => { const st = i <= a.lv ? 'done' : (a.crs ? a.crs.to === i : i === a.lv + 1) ? 'next' : 'lock';
      return '<div class="axv-lv ' + st + '"><i>' + (st === 'done' ? '✓' : l.k) + '</i><b>' + l.n + '</b><span>' + l.t + '</span></div>'; };
    const row = (k, v, cls) => '<div><span>' + k + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</b></div>';
    const acc = x => (x >= 0.95 ? '19 em 20' : x >= 0.92 ? '23 em 25' : x >= 0.9 ? '9 em 10' : '4 em 5');
    const card = P.max ? '<small>' + L[a.lv].n.toUpperCase() + '</small><p>' + (ela ? 'Ela' : 'Ele') + ' já tem a licença máxima.</p>'
      : a.crs ? '<small>EM CURSO · ' + L[a.crs.to].n.toUpperCase() + '</small>' + row('Falta', U.D.plural(a.crs.left, 'rodada', 'rodadas')) + '<p>' + (ela ? 'Ela segue' : 'Ele segue') + ' ajudando durante o curso.</p>'
      : '<small>CURSO · ' + L[P.to].n.toUpperCase() + '</small>' + row('Acerta o plano', acc(L[P.to].acc), L[P.to].acc > L[a.lv].acc ? 'up' : '') + row('Duração', U.D.plural(P.rounds, 'rodada', 'rodadas')) +
        row('Custo', c.brl(P.fee), P.why === 'caixa' ? 'dn' : '') + row('Salário ' + (ela ? 'dela' : 'dele'), '+' + c.brl(P.dw) + '/sem') + '<p>' + (P.why === 'caixa' ? 'O caixa não aguenta o curso agora.' : (ela ? 'Ela segue' : 'Ele segue') + ' ajudando durante o curso.') + '</p>';
    const can = !P.max && !P.why;
    show('<div class="axv"><div class="tm-h"><button class="tcr-back" id="axv-back" aria-label="Voltar">' + BK + '</button><b>Auxiliar</b><small>sua comissão técnica</small><span class="es-top">' + cxPill() + '</span></div>' +
      '<div class="axv-l"><div class="axv-me">' + auxFace(co, 'axv-fc') + '<b>' + esc(a.n) + '</b><em>' + L[a.lv].n + '</em><p>' + seg + '</p></div>' +
        '<div class="axv-lad">' + L.map(lv).join('') + '</div></div>' +
      '<div class="axv-r"><div class="axv-card">' + card + '</div>' +
        '<button class="tm-go' + (can ? '' : ' off') + '" id="axv-go">' + (P.max ? 'Licença máxima' : a.crs ? 'Em curso' : P.why === 'caixa' ? 'Caixa curto' : 'Pagar o curso') + '</button></div></div>', st => {
      st.querySelector('#axv-back').onclick = () => { sfx('tap'); clube(); };
      cxBind(st, auxiliar);
      st.querySelector('#axv-go').onclick = () => {
        if (!can) { if (P.why === 'caixa') mkHelp('', 'Depois de pagar, o caixa precisa seguir com 2 semanas de salários.'); return; }
        const r = S.coAuxBuy(co); if (!r.ok) return;
        c.save(); sfx('win'); auxiliar();
      };
    });
  }

  // Obra do DM pronta: a janelinha na volta para a semana, uma vez (S.coDmDone)
  function dmPop(co) {
    const L = S.coDmDone ? S.coDmDone(co) : null; if (!L) return false; const d = S.coDmDoc(co);
    pop('<div class="acd-help"><span class="aux-h">' + face(d.fc, 'aux-fc', d.n) + '<b>' + esc(d.n) + '</b></span><p>A obra terminou: o departamento agora é <b>' + L.n + '</b>. ' + L.t + '.</p>' +
      '<span class="hl-ab"><button class="hl-btn dark" id="dmp-go">Ver</button><button class="hl-btn line" data-pop-x>Fechar</button></span></div>', 'Departamento médico', w => {
      w.querySelector('#dmp-go').onclick = () => { sfx('tap'); closePop(); depMedico(); }; }, 'hl-pop acd-pop tm-pop');
    C().save(); return true;
  }
  // ---------- Departamento médico (2026-11-11, desenho aprovado): a médica, os 5 níveis, a obra do próximo e os tratamentos ----------
  function depMedico() {
    const c = C(), co = c.co, d = S.coDm(co), L = S.CO_DM.lv, P = S.coDmPlan(co), doc = S.coDmDoc(co), BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const nT = S.CO_DM.treat[d.lv], left = S.coDmLeft(co), who = nT ? S.coDmWho(co) : [];
    const lv = (l, i) => { const st = i <= d.lv ? 'done' : (d.obra ? d.obra.to === i : i === d.lv + 1) ? 'next' : 'lock';
      return '<div class="axv-lv ' + st + '"><i>' + (st === 'done' ? '✓' : i + 1) + '</i><b>' + l.n + '</b><span>' + l.t + '</span></div>'; };
    const row = (k, v, cls) => '<div><span>' + k + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</b></div>';
    const hurt = co.squad.filter(p => p.out > 0).sort((a, b) => a.out - b.out);
    const tSt = p => (p.out > 0 ? 'fora ' + p.out : Math.round(p.en) + '%');
    const me = nT
      ? '<small>TRATAR · ' + (left ? (left > 1 ? left + ' hoje' : '1 hoje') : 'feito') + '</small>' + (who.length ? who.map(p => '<button class="dmt' + (left ? '' : ' off') + '" data-dmt="' + p.id + '"><b>' + esc(p.n) + '</b><span class="' + (p.out > 0 ? 'dn' : '') + '">' + tSt(p) + '</span></button>').join('') : '<p>Todos inteiros</p>')
      : '<p>' + (hurt.length ? U.D.plural(hurt.length, 'machucado', 'machucados') + ' · ' + (hurt.length === 1 ? 'volta em ' : 'voltam em ') + hurt.slice(0, 2).map(p => p.out).join(' e ') + (hurt[0].out === 1 && hurt.length === 1 ? ' rodada' : ' rod.') : 'Ninguém machucado') + '</p>';
    const card = P.max ? '<small>' + L[d.lv].n.toUpperCase() + '</small><p>O departamento já está no nível máximo.</p>'
      : d.obra ? '<small>EM OBRA · ' + L[d.obra.to].n.toUpperCase() + '</small>' + row('Falta', U.D.plural(d.obra.left, 'rodada', 'rodadas')) + '<p>O departamento segue atendendo durante a obra.</p>'
      : '<small>OBRA · ' + L[P.to].n.toUpperCase() + '</small>' + row('Lesões', '−' + P.inj + '%', 'up') + row('Treino cansa', '−' + P.tr + '%', 'up') +
        (P.cut > S.CO_DM.cut[d.lv] ? row('Volta antes', U.D.plural(P.cut, 'rodada', 'rodadas'), 'up') : '') + (P.treat > nT ? row('Tratamentos', P.treat + ' por rodada', 'up') : '') +
        row('Custo', c.brl(P.fee), P.why === 'caixa' ? 'dn' : '') + row('Equipe', '+' + c.brl(P.dw) + '/sem') + row('Pronto em', U.D.plural(P.rounds, 'rodada', 'rodadas')) +
        (P.why === 'caixa' ? '<p>O caixa não aguenta a obra agora.</p>' : '');
    const can = !P.max && !P.why;
    show('<div class="axv dmv"><div class="tm-h"><button class="tcr-back" id="dmv-back" aria-label="Voltar">' + BK + '</button><b>Departamento médico</b><small>cuida de quem cansa e machuca</small><span class="es-top">' + cxPill() + '</span></div>' +
      '<div class="axv-l"><div class="axv-me' + (nT ? ' tr' : '') + '">' + face(doc.fc, 'axv-fc', doc.n) + '<b>' + esc(doc.n) + '</b><em>' + L[d.lv].n + '</em>' + me + '</div>' +
        '<div class="axv-lad">' + L.map(lv).join('') + '</div></div>' +
      '<div class="axv-r"><div class="axv-card">' + card + '</div>' +
        '<button class="tm-go' + (can ? '' : ' off') + '" id="dmv-go">' + (P.max ? 'Nível máximo' : d.obra ? 'Em obra' : P.why === 'caixa' ? 'Caixa curto' : 'Fazer a obra') + '</button></div></div>', st => {
      st.querySelector('#dmv-back').onclick = () => { sfx('tap'); clube(); };
      cxBind(st, depMedico);
      st.querySelectorAll('[data-dmt]').forEach(b => b.onclick = () => {
        const w = S.coDmTreat(co, b.dataset.dmt); if (!w) return;
        c.save(); sfx('win'); depMedico();
      });
      st.querySelector('#dmv-go').onclick = () => {
        if (!can) { if (P.why === 'caixa') mkHelp('', 'Depois de pagar, o caixa precisa seguir com 2 semanas de salários.'); return; }
        const r = S.coDmBuy(co); if (!r.ok) return;
        c.save(); sfx('win'); depMedico();
      };
    });
  }

  // ---------- Estádio (fase 1: só ver; ingresso, obras e melhorias entram nas próximas fases) ----------
  const milK = v => (v / 1000).toFixed(v % 1000 ? 1 : 0).replace('.', ',') + ' mil';
  const estCls = e => { const i = S.coEstHumIdx(e.hum); return i >= 3 ? 'up' : i <= 1 ? 'dn' : ''; };
  const estSeed = id => { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 99991; return h + 1; };
  // Cores da torcida: as da camisa; cor escura demais some na arquibancada e vira cinza
  function estCols(cl) {
    const k = U.LP && U.LP.kitFor ? U.LP.kitFor(cl.name, cl.id) : null; if (!k) return null;
    const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; };
    const ok = h => (lum(h) < 0.2 ? '#8E949C' : h), a = ok(k[0]), b = ok(k[1] === k[0] ? k[2] : k[1]);
    return [a, b, a === b ? '#F3F1EA' : ok(k[2])];
  }
  const EST_OCC0 = { n: 0, s: 0, a: 0, so: 0 };
  function estFit(lv, w, h, max) { const d = U.EST.depth; return Math.max(0.2, Math.min(max, w / (288 + d[lv.n] + d[lv.s]), h / (165 + d[lv.a] + d[lv.so]))); }
  function estThumb(co, e) {
    const d = U.EST.depth, k = estFit(e.lv, 150, 116, 0.44);
    return U.EST.svg({ w: 158, h: 124, k, dx: (d[e.lv.n] - d[e.lv.s]) * k / 2, dy: (d[e.lv.a] - d[e.lv.so]) * k / 2, lv: e.lv, occ: e.occ || EST_OCC0, cols: estCols(club(co.club)), seed: estSeed(co.club), gram: e.up ? e.up.g : 1, luz: !!(e.up && e.up.l), cam: !!(e.up && e.up.c), obra: e.obra ? e.obra.k : null }).svg;
  }
  // Ingresso (fase 2): 5 preços em palavras para o próximo jogo em casa, com a renda, o público e o que a torcida acha
  function ingresso(pick) {
    const c = C(), co = c.co, E = S.CO_EST, P = S.coEstPrices(co); if (!P) return estadio();
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const L = P.list, sel = pick == null ? P.now : pick, cur = L[P.now], x = L[sel], mx = Math.max.apply(null, L.map(o => o.gate)), d = x.gate - cur.gate;
    const vs = P.vs ? club(P.vs) : null;
    show('<div class="es"><div class="tm-h"><button class="tcr-back" id="es-back" aria-label="Voltar">' + BK + '</button><b>Ingresso</b><small>' + (P.closed ? 'próximo jogo de portões fechados: vale para o seguinte' : vs ? 'próximo jogo em casa: ' + esc(vs.short || vs.name) : 'renda de um jogo em casa') + '</small>' +
        '<span class="es-top"><button class="es-q" id="es-q" aria-label="Como funciona">?</button></span></div>' +
      '<div class="es-ig">' + L.map(o => '<button class="es-ic' + (o.i === sel ? ' on' : '') + '" data-pr="' + o.i + '">' + (o.i === P.now ? '<u>HOJE</u>' : '') + '<em>' + c.brl(o.gate) + '</em><i style="height:' + Math.max(10, Math.round(o.gate / mx * 118)) + 'px"></i><b>' + o.name + '</b><small' + (o.full ? ' class="f"' : '') + '>' + (o.full ? 'lota' : milK(o.pub)) + '</small></button>').join('') + '</div>' +
      '<div class="es-side">' +
        '<div class="es-k"><small>PÚBLICO</small><div class="es-ch"><b>' + milK(x.pub) + '<u>de ' + milK(x.cap) + '</u></b></div><span class="es-fill"><u style="width:' + Math.round(x.pub / x.cap * 100) + '%"></u></span></div>' +
        '<div class="es-k"><small>RENDA DO JOGO</small><b>' + c.brl(x.gate) + '</b><em class="' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + (sel === P.now ? 'é o preço de hoje' : d ? c.brl(Math.abs(d)) + (d > 0 ? ' a mais que hoje' : ' a menos que hoje') : 'igual a hoje') + '</em></div>' +
        '<div class="es-k"><small>TORCIDA</small><b class="' + (x.hum > 0 ? 'up' : x.hum < 0 ? 'dn' : '') + '">' + x.txt + '</b><em>a cada jogo em casa</em></div>' +
        '<button class="tm-go' + (sel === P.now ? ' off' : '') + '" id="es-go">' + (sel === P.now ? 'Preço de hoje' : 'Cobrar ' + x.name.toLowerCase()) + '</button>' +
      '</div></div>', st => {
      st.querySelector('#es-back').onclick = () => { sfx('tap'); estadio(); };
      st.querySelector('#es-q').onclick = () => { sfx('tap'); mkHelp('', 'O preço vale para todos os jogos em casa até você mudar. Mais caro rende mais por pessoa e afasta gente: compensa quando o jogo lota. Mais barato enche a casa e agrada a torcida, que empurra o time.'); };
      st.querySelectorAll('[data-pr]').forEach(b => b.onclick = () => { sfx('tap'); ingresso(+b.dataset.pr); });
      st.querySelector('#es-go').onclick = () => { if (sel === P.now) return; sfx('win'); S.coEstPrice(co, sel); c.save(); ingresso(); };
    });
  }
  // Estádio (fases 1 a 3): o desenho com os 4 setores, a torcida, a casa cheia (ou a obra andando), o Ingresso e o
  // dourado Ampliar (com obra: Acelerar com moedas)
  function estDraw(pn, e, cl, o) {   // o = { obra, prev, wPad, hPad, dxExtra }
    const W = pn.clientWidth, H = pn.clientHeight, d = U.EST.depth; if (!W || !H) return null;
    const up = o.obra || o.prev, lv = e.lv, lf = up ? Object.assign({}, lv, { [up]: Math.min(5, lv[up] + 1) }) : lv;   // o setor em obra ou na prévia já ocupa o tamanho novo
    const k = estFit(lf, W - o.wPad, H - o.hPad, 1), roof = x => (lf[x] >= 4 ? 3.5 * k : 0);
    const R = U.EST.svg({ w: W, h: H, k, dx: (d[lf.n] - d[lf.s]) * k / 2 + (o.dx || 0), dy: (d[lf.a] - d[lf.so]) * k / 2, lv, occ: e.occ || EST_OCC0, cols: estCols(cl), gram: e.up ? Math.max(0, e.up.g - (e.gt > 0 ? 1 : 0)) : 1, luz: !!(e.up && e.up.l), telao: !!(e.up && e.up.l >= 2), cam: !!(e.up && e.up.c), seed: estSeed(cl.id), obra: o.obra, prev: o.prev });
    R.dep = x => d[lf[x]] * k + roof(x); R.W = W; R.H = H;
    return R;
  }
  function estadio() {
    const c = C(), co = c.co, cl = club(co.club), e = S.coEst(co), E = S.CO_EST, ob = e.obra, cap = ob ? S.coEstOpen(e) : S.coEstCap(e), hi = S.coEstHumIdx(e.hum), cls = estCls(e);
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const h = e.h || [], full = h.filter(g => g.pub >= g.cap * E.full).length, why = S.coEstWhy(co);
    const allMax = E.keys.every(k => e.lv[k] >= 5), rush = ob ? S.coEstRushLeft(co) : 0, RC = E.obra.rushCoins;
    const pips = n => '<span class="es-pp">' + [1, 2, 3, 4, 5].map(i => '<i' + (i <= n ? ' class="on"' : '') + '></i>').join('') + '</span>';
    const lb = (k, cc, pos) => '<div class="es-lb ' + cc + '" style="' + pos + '">' + (ob && ob.k === k ? '<small class="ob">EM OBRA</small>' + pips(e.lv[k]) + '<b>fechado</b>' : '<small>' + E.names[k].toUpperCase() + '</small>' + pips(e.lv[k]) + '<b>' + milK(S.coEstSeats(k, e.lv[k])) + '</b>') + '</div>';
    show('<div class="es"><div class="tm-h"><button class="tcr-back" id="es-back" aria-label="Voltar">' + BK + '</button>' + crest(cl.id, 'kb2-cr') + '<b>' + esc(S.coEstNameNow(co) || 'Estádio') + '</b><small>' + esc(cl.name) + ' · ' + milK(cap) + (ob ? ' lugares abertos' : ' lugares') + '</small>' +
        '<span class="es-top"><button class="es-q" id="es-q" aria-label="Como funciona">?</button></span></div>' +
      '<div class="es-pn" id="es-pn"></div>' +
      '<div class="es-side">' +
        '<div class="es-k t"><small>TORCIDA</small><b class="' + cls + '">' + S.coEstHum(e) + '</b><span class="es-dd ' + cls + '">' + [0, 1, 2, 3, 4].map(i => '<i' + (i <= hi ? ' class="on"' : '') + '></i>').join('') + '</span>' + (why ? '<em>' + esc(why) + '</em>' : '') + '</div>' +
        (ob ? '<div class="es-k"><small>OBRA · ' + E.names[ob.k].toUpperCase() + '</small><div class="es-ch"><b>' + ob.left + '<u>' + (ob.left > 1 ? 'rodadas' : 'rodada') + '</u></b><span class="es-dd ob">' + Array.from({ length: ob.tot }, (_, i) => '<i' + (i < ob.tot - ob.left ? ' class="on"' : '') + '></i>').join('') + '</span></div></div>'
          : '<div class="es-k"><small>CASA CHEIA</small>' + (h.length ? '<div class="es-ch"><b>' + full + '<u>de ' + h.length + (h.length > 1 ? ' jogos' : ' jogo') + '</u></b><span class="es-bars">' + h.map(g => '<i class="' + (g.pub >= g.cap * E.full ? 'f' : '') + '" style="height:' + Math.max(8, Math.round(g.pub / g.cap * 100)) + '%"></i>').join('') + '</span></div>' : '<em>nenhum jogo em casa ainda</em>') + '</div>') +
        '<div class="es-two"><button class="tm-b" id="es-ing">Ingresso</button><button class="tm-b" id="es-mel">Melhorias' + (e.mel || (S.coEstLiga && S.coEstLiga(co)) ? '<i class="es-dot"></i>' : '') + '</button></div>' +
        (ob ? '<button class="tm-b es-rush' + (rush ? '' : ' off') + '" id="es-rush">' + (rush ? (U.COINS ? U.COINS.svg : '') + 'Acelerar · ' + RC : 'Obra no ritmo máximo') + '</button>'
          : '<button class="tm-go' + (allMax ? ' off' : '') + '" id="es-amp">' + (allMax ? 'Estádio completo' : 'Ampliar') + '</button>') +
      '</div></div>', st => {
      st.querySelector('#es-ing').onclick = () => { sfx('tap'); ingresso(); };
      st.querySelector('#es-mel').onclick = () => { sfx('tap'); melhorias(); };
      st.querySelector('#es-back').onclick = () => { sfx('tap'); clube(); };
      st.querySelector('#es-q').onclick = () => { sfx('tap'); mkHelp('', 'Os pontinhos são o público do último jogo em casa. Torcida empolgada enche o estádio e empurra o time em casa; revoltada, pesa contra. Ampliar fecha o setor durante a obra e ele reabre maior: vale a pena quando a casa vive cheia. Melhorias não fecham nada e rendem todo ano. Quem aprova é a diretoria.'); };
      const amp = st.querySelector('#es-amp'); if (amp) amp.onclick = () => { if (allMax) return; sfx('tap'); ampliar(); };
      const rb = st.querySelector('#es-rush'); if (rb) rb.onclick = () => { if (!rush) return; sfx('tap'); obraRush(); };
      const pn = st.querySelector('#es-pn'), R = estDraw(pn, e, cl, { obra: ob ? ob.k : null, wPad: 216, hPad: 84 });
      if (!R) return;
      const { px, py, pw, ph, gap, dep, W } = R;
      pn.innerHTML = R.svg +
        lb('a', '', 'left:' + (px + pw / 2) + 'px;top:' + (py - gap - dep('a') - 30) + 'px;transform:translateX(-50%)') +
        lb('so', '', 'left:' + (px + pw / 2) + 'px;top:' + (py + ph + gap + dep('so') + 10) + 'px;transform:translateX(-50%)') +
        lb('n', 'v l', 'right:' + (W - (px - gap - dep('n')) + 12) + 'px;top:' + (py + ph / 2) + 'px;transform:translateY(-50%)') +
        lb('s', 'v r', 'left:' + (px + pw + gap + dep('s') + 12 + (e.up && e.up.l >= 2 ? 9 * R.k : 0)) + 'px;top:' + (py + ph / 2) + 'px;transform:translateY(-50%)');
    });
  }
  // Janelinhas da obra (a mesma da resposta do clube no mercado): a diretoria aprova ou recusa, e a obra fica pronta
  function obraBox(o) {
    pop('<div class="mkx"><div class="mkx-h"><i class="mkx-fc im' + (o.cr ? ' cr' : '') + '">' + o.img + '</i><span><small>' + o.sm + '</small><b class="' + o.cls + '">' + o.w + '</b></span></div>' +
      '<p>' + o.line + '</p><div class="mkx-li">' + o.rows.map(r => '<div><span>' + r[0] + '</span><b class="' + (r[2] || '') + '">' + r[1] + '</b></div>').join('') + '</div>' +
      '<span class="rs-gap"></span><span class="mkx-b"><button class="hl-btn gold" id="ob-a">' + o.b1 + '</button>' + (o.b2 ? '<button class="hl-btn dark" id="ob-b">' + o.b2 + '</button>' : '') + '</span></div>', o.w, w => {
      w.querySelector('#ob-a').onclick = () => { sfx('tap'); closePop(); if (o.on1) o.on1(); };
      if (o.b2) w.querySelector('#ob-b').onclick = () => { sfx('tap'); closePop(); if (o.on2) o.on2(); };
    }, 'hl-pop mkx-pop', true);
  }
  function obraPronta(co, d, seeBtn) {
    const c = C(), E = S.CO_EST, e = S.coEst(co), cap = S.coEstCap(e), add = S.coEstSeats(d.k, d.to) - S.coEstSeats(d.k, d.from), nm = E.names[d.k];
    const pz = U.COINS && S.coEstPrizes ? S.coEstPrizes(co).filter(x => U.COINS.add([x]) > 0) : [], won = pz.reduce((a, x) => a + x.n, 0);
    obraBox({ img: crest(co.club, 'es-cr'), cr: 1, sm: 'ESTÁDIO · ' + nm.toUpperCase(), cls: 'up', w: 'Obra pronta', line: 'O ' + nm + ' reabre no próximo jogo em casa.',
      rows: [[nm, milK(S.coEstSeats(d.k, d.from)) + ' → ' + milK(S.coEstSeats(d.k, d.to)), 'up'], ['Estádio', milK(cap - add) + ' → ' + milK(cap), 'up']].concat(won ? [[esc(pz[pz.length - 1].t), '+' + U.D.plural(won, 'moeda', 'moedas'), 'up']] : []),
      b1: seeBtn ? 'Ver o estádio' : 'Fechar', on1: seeBtn ? estadio : null, b2: seeBtn ? 'Fechar' : '' });
  }
  // Na volta para a semana: a obra que acabou aparece uma vez
  function obraPop(co) {
    if (!S.coEstDone || !S.coEstDone(co) || document.getElementById('ld-pop')) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; const d = S.coEstDone(co, true); if (!d) return; C().save(); sfx('win'); obraPronta(co, d, true); }, 80);
    return true;
  }
  // Confirmação de gasto de moedas (Silvio, 2026-11-11: "pra não ocorrer toque acidental", também no clube e em
  // qualquer coisa futura com moedas): todo gasto passa por aqui antes do U.COINS.spend. what = o que compra, gain = o que ganha.
  function coinAsk(n, what, gain, go) {
    const saldo = U.COINS.get();
    pop('<div class="acd-help"><b>' + esc(what) + '</b><p class="ca-n">' + U.COINS.svg + '<b>' + n + '</b> moedas' + (gain ? ' · ' + esc(gain) : '') + '</p><p>Você fica com ' + U.D.plural(Math.max(0, saldo - n), 'moeda', 'moedas') + '.</p>' +
      '<button class="hl-btn gold" id="ca-y">Confirmar</button><button class="hl-btn line" data-pop-x>Cancelar</button></div>', what, w => {
      w.querySelector('#ca-y').onclick = () => { closePop(); go(); };
    }, 'hl-pop acd-pop tm-pop ca-pop');
  }
  U.coinAsk = coinAsk;
  // Acelerar com moedas: 2 rodadas a menos, até 2 vezes por obra (a própria janelinha já é a confirmação do gasto)
  function obraRush() {
    const c = C(), co = c.co, E = S.CO_EST, e = S.coEst(co), ob = e.obra; if (!ob || !U.COINS) return;
    const RC = E.obra.rushCoins, saldo = U.COINS.get(), ok = saldo >= RC, n = Math.min(E.obra.rush, ob.left);
    pop('<div class="acd-help"><b>Acelerar a obra</b><p>' + (n >= ob.left ? 'A obra do ' + E.names[ob.k] + ' fica pronta agora.' : U.D.plural(n, 'rodada', 'rodadas') + ' a menos na obra do ' + E.names[ob.k] + '.') + ' Você tem ' + U.D.plural(saldo, 'moeda', 'moedas') + '.</p>' +
      '<button class="hl-btn gold" id="ob-y">' + (ok ? 'Acelerar · ' + RC + ' moedas' : 'Faltam ' + (RC - saldo) + ' moedas') + '</button><button class="hl-btn line" data-pop-x>Agora não</button></div>', 'Acelerar a obra', w => {
      w.querySelector('#ob-y').onclick = () => {
        if (!ok) { sfx('tap'); closePop(); return loja(0, estadio); }
        if (!U.COINS.spend(RC, 'Obra: ' + E.names[ob.k])) return;
        if (!S.coEstRush(co)) { U.COINS.add({ n: RC, t: 'Obra devolvida' }); return; }
        sfx('win'); const d = S.coEstDone(co, true); c.save(); closePop(); estadio(); if (d) obraPronta(co, d, false);
      };
    }, 'hl-pop acd-pop tm-pop');
  }
  // Melhorias (fase 4): 4 blocos (gramado, refletores, bares e loja, camarotes) com 3 níveis; à direita o que o próximo
  // nível dá, o prazo, o custo, as parcelas e o pedido à diretoria. Uma por vez, e pode andar junto com uma obra de setor
  function melhorias(k, x) {
    const c = C(), co = c.co, e = S.coEst(co), E = S.CO_EST, M = E.mel, cl = club(co.club);
    const plans = {}; M.keys.forEach(q => (plans[q] = S.coEstMelPlan(co, q)));
    if (!k || !plans[k]) k = (e.mel && e.mel.k) || M.keys.find(q => !plans[q].max && !plans[q].lock && !plans[q].need) || 'g';
    const P = plans[k]; x = Math.min(x || 1, P.payMax || 3);
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const pc = v => '+' + Math.round(v * 100) + '%', base = (S.coFin(co).rec || 0) * S.CO_FIN.bil / Math.max(1, co.ss.rounds.length / 2);
    const camV = n => c.brl(Math.max(1000, Math.round(n * M.cam * base / 1000) * 1000));
    // a palavra grande e a linha de cada bloco, pelo nível de hoje
    const now = q => { const n = e.up[q];
      if (q === 'g') return [M.word.g[n], n ? 'o time cansa menos em casa' : 'campo pesado para o seu time'];
      if (q === 'l') return [M.word.l[n], n ? 'cota de TV ' + pc(M.tv * n) : 'jogo à noite não passa na TV'];
      if (q === 'b') return [n ? pc(M.bar * n) : 'sem', n ? 'de renda por torcedor' : 'torcedor não tem onde gastar'];
      return plans.c.lock ? ['fechado', 'pede a Social coberta'] : [n ? camV(n) : 'sem', n ? 'por jogo, com qualquer público' : 'renda fixa por jogo em casa']; };
    const block = q => { const w = now(q), lock = q === 'c' && plans.c.lock;
      return '<button class="es-m' + (q === k ? ' on' : '') + (lock ? ' lock' : '') + '" data-mk="' + q + '"><span><b>' + M.names[q] + '</b>' + (lock ? '' : '<span class="es-pp">' + Array.from({ length: M.max }, (_, i) => '<i' + (i < e.up[q] ? ' class="on"' : '') + '></i>').join('') + '</span>') + '</span><em>' + w[0] + '</em><small>' + (e.mel && e.mel.k === q ? 'em reforma · ' + U.D.plural(e.mel.left, 'rodada', 'rodadas') : w[1]) + '</small></button>'; };
    const row = (a, b, cls) => '<div><span>' + a + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + b + '</b></div>';
    const doing = e.mel && e.mel.k === k, can = !P.max && !P.lock && !P.need && !e.mel;
    const liga = S.coEstLiga ? S.coEstLiga(co) : null;
    const fx = k === 'g' ? row('Cansaço em casa', '−' + Math.round(M.gram * 100) + '%', 'up') : k === 'l' ? (liga ? row('Multa da liga', 'acaba', 'up') : row('Cota de TV', pc(M.tv), 'up')) : k === 'b' ? row('Renda por torcedor', pc(M.bar), 'up') : row('Por jogo em casa', '+' + camV(1), 'up');
    const card = doing ? '<small>EM REFORMA · ' + P.name.toUpperCase() + '</small><div class="es-mn"><b>' + e.mel.left + '</b><em>' + (e.mel.left > 1 ? 'rodadas para ficar pronto' : 'rodada para ficar pronto') + '</em></div>'
      : P.max ? '<small>' + P.name.toUpperCase() + ' · NÍVEL ' + M.max + ' DE ' + M.max + '</small><div class="es-mn"><em>No nível máximo.</em></div>'
      : P.lock ? '<small>' + P.name.toUpperCase() + '</small><div class="es-mn"><em>Camarotes pedem a Social coberta (nível 4). Amplie a Social primeiro.</em></div>'
      : P.need ? '<small>' + P.name.toUpperCase() + ' · NÍVEL ' + P.to + ' DE ' + M.max + '</small><div class="es-mn"><em>O nível ' + P.to + ' pede um estádio de ' + milK(P.need) + ' lugares. O seu tem ' + milK(S.coEstCap(e)) + ': amplie primeiro.</em></div>'
      : '<small>' + P.name.toUpperCase() + ' · NÍVEL ' + P.to + ' DE ' + M.max + '</small><div class="es-ml">' + fx + (P.perSeason ? row('Por temporada', '+' + c.brl(P.perSeason), 'up') : '') + row('Prazo', U.D.plural(P.rounds, 'rodada', 'rodadas')) + row('Custo', c.brl(P.cost)) + '</div>';
    show('<div class="es es3"><div class="tm-h"><button class="tcr-back" id="es-back" aria-label="Voltar">' + BK + '</button><b>Melhorias</b><small>' + esc(S.coEstNameNow(co) || cl.name) + '</small><span class="es-top">' + cxPill() + '</span></div>' +
      '<div class="es-mg">' + M.keys.map(block).join('') + '</div>' +
      '<div class="es-side"><div class="es-k es-mc">' + card + '</div>' +
        '<div class="es-seg">' + [1, 2, 3].map(i => '<button data-x="' + i + '" class="' + (i === x ? 'on' : '') + (i > (P.payMax || 3) || !can ? ' no' : '') + '">' + (i === 1 ? 'À vista' : i + 'x') + '</button>').join('') + '</div>' +
        '<button class="tm-go' + (can ? '' : ' off') + '" id="es-go">' + (doing ? 'Em reforma' : e.mel ? 'Uma por vez' : P.max ? 'Nível máximo' : P.lock ? 'Fechado' : P.need ? 'Estádio pequeno' : 'Pedir à diretoria') + '</button>' +
      '</div></div>', st => {
      st.querySelector('#es-back').onclick = () => { sfx('tap'); estadio(); };
      cxBind(st, () => melhorias(k, x));
      st.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { sfx('tap'); melhorias(b.dataset.mk, x); });
      st.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { if (!can) return; sfx('tap'); const i = +b.dataset.x;
        if (i > P.payMax) return mkHelp('', 'Este presidente só paga à vista.');
        melhorias(k, i); });
      st.querySelector('#es-go').onclick = () => {
        if (!can) return;
        const pres = S.coPres(co), img = presFace(pres, 'es-pf'), sm = 'PRESIDENTE · ' + esc(pres.n).toUpperCase(), r = S.coEstMelAsk(co, k, x);
        if (r.ok) {
          c.save(); sfx('win'); melhorias(k);
          return obraBox({ img, sm, cls: 'up', w: 'Aprovou a melhoria', line: P.name + ' no nível ' + P.to + ' em ' + U.D.plural(r.rounds, 'rodada', 'rodadas') + '. Nada fecha durante a reforma.' + (P.amb ? ' Ele bancou uma parte.' : ''),
            rows: [['Sai do caixa agora', c.brl(r.first)]].concat(!r.parts ? [['Fica no caixa', c.brl(S.coFin(co).caixa)]] : [[r.parts > 1 ? 'Mais ' + r.parts + ' parcelas, a 1ª na rodada ' + r.nextR : 'Mais 1 parcela na rodada ' + r.nextR, c.brl(r.part)]]), b1: 'Fechar' });
        }
        sfx('tap');
        const line = r.why === 'vermelho' ? 'Com o caixa no vermelho ele não começa reforma nenhuma.' : r.why === 'ultimato' ? 'Com o seu cargo em risco, a diretoria não começa reforma.'
          : r.why === 'folga' ? (x > 1 ? 'Com a entrada e as parcelas pela frente sobraria pouca folga no caixa.' : 'Depois da reforma sobraria menos de ' + E.obra.folga + ' semanas de salário no caixa.') + ' Ele libera com ' + c.brl(Math.ceil(r.need / 10000) * 10000) + '.' : 'A diretoria não liberou a reforma agora.';
        obraBox({ img, sm, cls: 'dn', w: 'Recusou a melhoria', line, rows: [['Custo', c.brl(P.cost)], ['Caixa agora', c.brl(S.coFin(co).caixa), r.why === 'ultimato' ? '' : 'dn']], b1: 'Entendi', b2: 'Finanças', on2: () => { FIN_BACK = () => melhorias(k, x); financas(); } });
      };
    });
  }
  // Nome do estádio (fase 4): a proposta do patrocinador aparece na volta para a semana e pede resposta
  function nomePop(co) {
    if (!S.coEstNome || document.getElementById('ld-pop')) return false;
    const o = S.coEstNome(co); if (!o) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; const c = C(), E = S.CO_EST, was = S.coEstName(co.club);
      const ans = yes => { S.coEstNomeAnswer(co, yes); c.save(); if (yes) sfx('win'); semana(); };
      obraBox({ img: crest(co.club, 'es-cr'), cr: 1, sm: 'PATROCINADOR · ' + esc(o.sp).toUpperCase(), cls: 'mid', w: 'Quer o nome do estádio',
        line: 'Por ' + o.anos + ' temporadas ' + (was ? 'o ' + esc(was) : 'o estádio') + ' passa a se chamar ' + esc(o.n) + '. A torcida não gosta.',
        rows: [['Por temporada', '+' + c.brl(o.v), 'up'], ['Torcida', 'cai um nível', 'dn']], b1: 'Aceitar', on1: () => ans(true), b2: 'Recusar', on2: () => ans(false) }); }, 80);
    return true;
  }
  // Acontecimentos (fase 5), na volta para a semana. A liga exige refletores de quem subiu: avisa uma vez
  function ligaPop(co) {
    if (!S.coEstLiga || document.getElementById('ld-pop')) return false;
    const o = S.coEstLiga(co); if (!o || o.seen || o.mel) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; const c = C(), P = S.coEstMelPlan(co, 'l');
      S.coEstLigaSeen(co); c.save();
      obraBox({ img: crest(co.club, 'es-cr'), cr: 1, sm: 'LIGA · ESTÁDIO', cls: 'dn', w: 'A liga exige refletores',
        line: 'Nesta divisão tem jogo à noite. Sem refletores, o clube paga multa a cada jogo em casa' + (o.on ? '.' : ' da rodada ' + o.from + ' em diante.'),
        rows: [['Multa por jogo em casa', '−' + c.brl(o.fine), 'dn'], ['Refletores', c.brl(P.cost)]], b1: 'Ver melhorias', on1: () => melhorias('l'), b2: 'Depois' }); }, 80);
    return true;
  }
  // Show no estádio: o dinheiro entra na hora e o gramado sofre nos próximos jogos em casa
  function showPop(co) {
    if (!S.coEstShow || document.getElementById('ld-pop')) return false;
    const o = S.coEstShow(co); if (!o) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; const c = C();
      const ans = yes => { S.coEstShowAnswer(co, yes); c.save(); if (yes) sfx('win'); semana(); };
      obraBox({ img: crest(co.club, 'es-cr'), cr: 1, sm: 'ESTÁDIO · PROPOSTA', cls: 'mid', w: 'Querem fazer um show',
        line: 'Uma produtora quer o estádio nesta semana, com o time jogando fora. O gramado sofre e o time sente em casa.',
        rows: [['Aluguel', '+' + c.brl(o.v), 'up'], ['Gramado', 'ruim por ' + o.games + ' jogos', 'dn']], b1: 'Aceitar', on1: () => ans(true), b2: 'Recusar', on2: () => ans(false) }); }, 80);
    return true;
  }
  // Ampliar (fase 3): um setor por vez. O desenho mostra a prévia, a régua os 5 níveis; à direita o jeito de fazer, as
  // parcelas e o pedido à diretoria, que aprova ou recusa na hora
  function ampliar(k, mode, x) {
    const c = C(), co = c.co, cl = club(co.club), e = S.coEst(co), E = S.CO_EST;
    if (e.obra) return estadio();
    const open = E.keys.filter(q => e.lv[q] < 5); if (!open.length) return estadio();
    if (!k || open.indexOf(k) < 0) k = open.map(q => S.coEstPlan(co, q)).sort((a, b) => a.modes[1].cost - b.modes[1].cost)[0].k;   // começa pelo setor mais barato
    const P = S.coEstPlan(co, k); mode = mode || 'nor'; x = Math.min(x || 1, P.payMax);
    const M = P.modes.find(o => o.id === mode), cols = estCols(cl);
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    const cell = i => '<div class="' + (i === P.from ? 'now' : i === P.to ? 'nx' : '') + '">' + U.EST.slice(i, 86, 30, 0.9, cols, estSeed(cl.id) + i) + '<small>' + E.lvl[i] + '</small><b>' + milK(S.coEstSeats(k, i)) + '</b></div>';
    const op = o => '<button class="es-op' + (o.id === mode ? ' on' : '') + '" data-md="' + o.id + '"><b>' + o.name + '</b><em>' + c.brl(o.cost) + '</em><small' + (o.risk ? ' class="rk"' : '') + '>' + U.D.plural(o.rounds, 'rodada', 'rodadas') + (o.risk ? ' · pode atrasar' : '') + '</small></button>';
    show('<div class="es es2"><div class="tm-h"><button class="tcr-back" id="es-back" aria-label="Voltar">' + BK + '</button><b>Ampliar</b>' +
        '<span class="es-sel">' + (open.length > 1 ? '<button class="tm-ar" data-sk="-1" aria-label="Setor anterior">' + BK + '</button>' : '') + '<small>' + E.names[k] + ' · nível ' + P.from + ' de 5</small>' + (open.length > 1 ? '<button class="tm-ar" data-sk="1" aria-label="Próximo setor">' + FW + '</button>' : '') + '</span>' +
        '<span class="es-top">' + cxPill() + '</span></div>' +
      '<div class="es-pn" id="es-pn"></div>' +
      '<div class="es-rg">' + [1, 2, 3, 4, 5].map(cell).join('') + '</div>' +
      '<div class="es-side">' + P.modes.map(op).join('') +
        '<div class="es-seg">' + [1, 2, 3].map(i => '<button data-x="' + i + '" class="' + (i === x ? 'on' : '') + (i > P.payMax ? ' no' : '') + '">' + (i === 1 ? 'À vista' : i + 'x') + '</button>').join('') + '</div>' +
        '<button class="tm-go" id="es-go">Pedir à diretoria</button>' +
      '</div></div>', st => {
      st.querySelector('#es-back').onclick = () => { sfx('tap'); estadio(); };
      cxBind(st, () => ampliar(k, mode, x));
      st.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { sfx('tap'); ampliar(open[(open.indexOf(k) + +b.dataset.sk + open.length) % open.length], mode, x); });
      st.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { sfx('tap'); ampliar(k, b.dataset.md, x); });
      st.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { sfx('tap'); const i = +b.dataset.x;
        if (i > P.payMax) return mkHelp('', 'Este presidente só faz obra à vista.');
        ampliar(k, mode, i); });
      st.querySelector('#es-go').onclick = () => {
        const pres = S.coPres(co), img = presFace(pres, 'es-pf'), sm = 'PRESIDENTE · ' + esc(pres.n).toUpperCase(), nm = E.names[k], r = S.coEstAsk(co, k, mode, x);
        if (r.ok) {
          c.save(); sfx('win'); estadio();
          return obraBox({ img, sm, cls: 'up', w: 'Aprovou a obra', line: 'O ' + nm + ' fecha por ' + U.D.plural(r.rounds, 'rodada', 'rodadas') + ' e reabre com ' + milK(S.coEstSeats(k, P.to)) + ' lugares.' + (P.amb ? ' Ele bancou uma parte.' : ''),
            rows: [['Sai do caixa agora', c.brl(r.first)]].concat(!r.parts ? [['Fica no caixa', c.brl(S.coFin(co).caixa)]] : [[r.parts > 1 ? 'Mais ' + r.parts + ' parcelas, a 1ª na rodada ' + r.nextR : 'Mais 1 parcela na rodada ' + r.nextR, c.brl(r.part)]]), b1: 'Ver o estádio' });
        }
        sfx('tap');
        const line = r.why === 'vermelho' ? 'Com o caixa no vermelho ele não começa obra nenhuma.' : r.why === 'ultimato' ? 'Com o seu cargo em risco, a diretoria não começa obra.'
          : r.why === 'folga' ? (x > 1 ? 'Com a entrada e as parcelas pela frente sobraria pouca folga no caixa.' : 'Depois da obra sobraria menos de ' + E.obra.folga + ' semanas de salário no caixa.') + ' Ele libera com ' + c.brl(Math.ceil(r.need / 10000) * 10000) + '.' : 'A diretoria não liberou a obra agora.';
        obraBox({ img, sm, cls: 'dn', w: 'Recusou a obra', line, rows: [['Custo da obra', c.brl(M.cost)], ['Caixa agora', c.brl(S.coFin(co).caixa), r.why === 'ultimato' ? '' : 'dn']], b1: 'Entendi', b2: 'Finanças', on2: () => { FIN_BACK = () => ampliar(k, mode, x); financas(); } });
      };
      const pn = st.querySelector('#es-pn'), R = estDraw(pn, e, cl, { prev: k, wPad: 190, hPad: 34, dx: 62 });
      if (!R) return;
      pn.innerHTML = R.svg + '<div class="es-co" style="width:' + Math.max(96, Math.round(R.px - R.gap - R.dep('n') - 14)) + 'px"><b>+' + milK(P.add) + '</b><small>lugares</small><b class="s">+' + c.brl(P.perGame) + '</b><small>por jogo cheio</small></div>';
    });
  }
  // ---------- Mercado, lote 1 (2026-11-09, quadros 23, 23b e 24): só olhar; propostas no lote 2 ----------
  // Procurar só com filtros (Silvio: "pra não ficar uma lista extensa à toa", como no WSC): 6 escolhas com ◀ ▶ e o nome;
  // o total muda a cada toque e Buscar só libera com até S.CO_MKT.max jogadores. O resultado mostra 4 por página.
  const MK_BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  // Ícone de cada lance no resumo do jogo (desenhado: emoji muda de cara em cada celular)
  const EV_ICO = e => e.t === 'gol' ? '<img class="rsi-b" src="assets/ic/26bd.webp" alt="">' :
    e.t === 'amarelo' ? '<i class="rsi-k y"></i>' : e.t === 'vermelho' ? (e.how === '2am' ? '<i class="rsi-k y two"></i>' : '') + '<i class="rsi-k r"></i>' :
    e.t === 'troca' ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20V6M3 10l4-4 4 4" stroke="#4ADE80"/><path d="M17 4v14M13 14l4 4 4-4" stroke="#F87171"/></svg>' :
    e.t === 'lesao' ? '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#F3F1EA"/><path d="M10 6.5h4v3.5h3.5v4H14v3.5h-4V14H6.5v-4H10z" fill="#E5484D"/></svg>' :
    e.t === 'impedimento' ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round"><path d="M6 21V3" stroke="#F3F1EA"/><path d="M6 4h12l-3 4 3 4H6z" fill="#F2C230" stroke="#F2C230" stroke-linejoin="round"/></svg>' :
    e.t === 'chance' ? '<svg viewBox="0 0 24 24" class="rsi-c"><circle cx="12" cy="12" r="8.5" fill="none" stroke="#9fb0a6" stroke-width="2"/>' + (e.k === 'trave' ? '<path d="M5 19L19 5" stroke="#F2C230" stroke-width="2.4"/>' : '') + '</svg>' :
    e.t === 'tatica' || e.t === 'grito' || e.t === 'conversa' ? '<svg viewBox="0 0 24 24" fill="none" stroke="#F2C230" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 9l3 3M11 9l-3 3M14 15.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0"/></svg>' :
    e.t === 'acrescimo' ? '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="#141517" stroke="#4ADE80" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" stroke="#4ADE80" stroke-width="2.2" stroke-linecap="round"/></svg>' :
    e.t === 'intervalo' ? '<svg viewBox="0 0 24 24" fill="none" stroke="#9fb0a6" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' : '';
  const MK_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4L6 12l11 8z"/></svg>', MK_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z"/></svg>';
  // Chip da janela: quantas rodadas ela ainda fica aberta (laranja na última). Sem dias desde 11/11: quem manda é a rodada
  const mkWin = () => { const co = C().co, w = S.coMktWin(co), wi = S.coMktWinInfo(co), rd = wi ? wi.rd : 0;
    return w.k ? '<span class="mk-win' + (w.open ? (rd === 1 ? ' ult' : '') : ' off') + '">' + 'JANELA · ' + (rd === 1 ? 'ÚLTIMA RODADA' : rd + ' RODADAS') + '</span>' : '<span class="mk-win off">' + (w.next ? 'JANELA · RODADA ' + w.next : 'JANELA FECHADA') + '</span>'; };
  // Topo do mercado (Silvio 2026-11-10: "o caixa na parte superior e ver em outras telas também", para saber se dá para pagar
  // o olheiro): nome em cima e apoio embaixo; à direita, no fluxo, o caixa do clube, as moedas, a janela e a ajuda.
  // `coins` = id do botão das moedas (abre a loja; quem chama liga com mkCoins); sem ele a pílula é só informação.
  // Desenho do dinheiro no lugar da palavra CAIXA (Silvio, 2026-11-11): as notas do conjunto de ícones do jogo (assets/ic).
  // Em Finanças o mesmo desenho fica ao lado da palavra, para o jogador ligar um ao outro
  const CX_IC = '<img class="mk-cxi" src="assets/co/mo-dinheiro.webp" alt="Caixa" draggable="false">';
  const cxPill = () => { const c = C(), cx = S.coFin(c.co).caixa || 0; return '<span class="mk-cx' + (cx < 0 ? ' neg' : '') + '" title="Caixa do clube">' + CX_IC + '<b>' + c.brl(cx) + '</b></span>'; };
  // Tocar no caixa abre Finanças e o Voltar devolve à tela de antes (Silvio, 11/11: "clicar no caixa deve abrir finanças")
  const cxBind = (st, me) => { const b = st.querySelector('.mk-cx'); if (!b || !me) return; b.classList.add('go'); b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Caixa do clube: abrir Finanças'); b.onclick = () => { sfx('tap'); FIN_BACK = me; financas(); }; };
  const mkCx = coins => cxPill() + (U.COINS ? U.COINS.pill('cp-sm', coins ? 'mk-coins' : '') : '');
  const mkHead = (id, t, s, noWin, coins) => '<div class="tm-h"><button class="tcr-back" id="' + id + '" aria-label="Voltar">' + MK_BK + '</button><span class="mk-tt"><b>' + t + '</b><small>' + s + '</small></span>' +
    '<span class="mk-top">' + mkCx(coins) + (noWin ? '' : mkWin()) + '<button class="ol2-q" id="mk-q" aria-label="Como funciona">?</button></span></div>';
  const mkCoins = (st, me) => { cxBind(st, me); const b = st.querySelector('#mk-coins'); if (b) b.onclick = () => { sfx('tap'); loja(0, me); }; };
  const mkHelp = (t, p) => pop('<div class="acd-help"><b>Como funciona</b><p>' + p + '</p><button class="hl-btn dark" data-pop-x>Entendi</button></div>', 'Como funciona', null, 'hl-pop acd-pop tm-pop');
  const mkClub = p => (p.club ? esc(club(p.club).short || club(p.club).name) : 'sem clube');
  // As 3 abas do Mercado: Procurar, Elenco (abre o seu elenco e o Voltar devolve ao Mercado) e Notícias. "Indicados" saiu na 1.0
  // (aba apagada com "em breve"). O aviso laranja conta as notícias novas da sua liga e do seu clube
  // Propostas (11/11): as propostas pelos seus esperam na 4ª aba, com o número das que estão abertas
  const mkTabs = (co, on) => { const n = on === 2 || !S.coWorldNew ? 0 : S.coWorldNew(co), k = on === 3 ? 0 : S.coMktInbox(co).length;
    return [['Procurar', 'mk-tpr'], ['Elenco', 'mk-tel'], ['Notícias', 'mk-tnw'], ['Propostas', 'mk-tof']].map(([t, id], i) => '<button id="' + id + '"' + (i === on ? ' class="on"' : '') + '>' + t + (i === 2 && n ? '<i class="tm-dot">' + n + '</i>' : i === 3 && k ? '<i class="tm-dot">' + k + '</i>' : '') + '</button>').join(''); };
  const mkTabEl = st => { const b = st.querySelector('#mk-tel'); if (b) b.onclick = () => { sfx('tap'); elenco(undefined, undefined, () => mercado()); };
    const o = st.querySelector('#mk-tof:not(.on)'); if (o) o.onclick = () => { sfx('tap'); recebidas(); }; };
  function mercado() {
    const c = C(), co = c.co, m = S.coMkt(co), F = S.coMktFilters(co);
    if (S.coWorldSync) S.coWorldSync(co);
    m.f = F.map((x, i) => Math.min(m.f[i] || 0, x.o.length - 1));
    const n = S.coMktSearch(co).length, ok = n > 0 && n <= S.CO_MKT.max;
    const tabs = mkTabs(co, 0), dirty = m.f.some(v => v) || !!(m.nm || '').trim(); // Limpar (Silvio 11/11: "limpar os filtros mais rápido")
    const cell = (x, i) => { const v = m.f[i] || 0, t = x.o[v].t;
      return '<div class="mk-f' + (v ? ' on' : '') + '">' + (v ? '<button class="mk-fx" data-mx="' + i + '" aria-label="limpar ' + x.t.toLowerCase() + '">' + x.t + '<i>×</i></button>' : '<small>' + x.t + '</small>') + '<span><button class="mk-ar" data-mf="' + i + '" data-d="-1" aria-label="' + x.t.toLowerCase() + ' anterior">' + MK_L + '</button><b class="' + (t.length > 12 ? 'mk-sm' : '') + '">' + esc(t) + '</b><button class="mk-ar" data-mf="' + i + '" data-d="1" aria-label="' + x.t.toLowerCase() + ' seguinte">' + MK_R + '</button></span></div>'; };
    const goTxt = n => (n > 0 && n <= S.CO_MKT.max ? 'Buscar' : n ? 'Filtre mais' : 'Ninguém: solte um filtro');
    show('<div class="mk">' + mkHead('mk-back', 'Mercado', esc(club(co.club).short || club(co.club).name), false, true) +
      '<div class="mk-tabs t4">' + tabs + '</div><div class="mk-fs">' + F.map(cell).join('') + '</div>' +
      '<div class="mk-side"><label class="mk-k mk-nm"><small>NOME</small><input id="mk-nm" type="text" autocomplete="off" placeholder="Toque para digitar" value="' + esc(m.nm || '') + '"></label>' +
        '<div class="mk-k"><b id="mk-n" class="' + (ok ? 'ok' : '') + '">' + plMil(n, 'jogador', 'jogadores') + '</b>' + (dirty ? '<button class="mk-clr" id="mk-clr">Limpar filtros</button>' : '<span>o olheiro já viu todos uma vez</span>') + '</div>' +
        '<span class="rs-gap"></span><button class="tm-go' + (ok ? '' : ' off') + '" id="mk-go">' + goTxt(n) + '</button></div></div>', st => {
      st.querySelector('#mk-back').onclick = () => { sfx('tap'); semana(); };
      mkCoins(st, mercado);
      st.querySelector('#mk-tnw').onclick = () => { sfx('tap'); noticias(); }; mkTabEl(st);
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Escolha os filtros até sobrarem ' + S.CO_MKT.max + ' jogadores ou menos. Nível é contra o seu titular da posição, pelo que o olheiro viu: com mais relatórios ele erra menos. A janela abre nas 3 primeiras rodadas e em 2 rodadas no meio do campeonato; com ela aberta você negocia à vontade. O relatório do olheiro sai do caixa. Jogador sem clube você contrata a qualquer hora.'); };
      st.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => { sfx('tap'); const i = +b.dataset.mf, L = F[i].o.length; m.f[i] = ((m.f[i] || 0) + (+b.dataset.d) + L) % L; c.save(); mercado(); });
      st.querySelectorAll('[data-mx]').forEach(b => b.onclick = () => { sfx('tap'); m.f[+b.dataset.mx] = 0; c.save(); mercado(); });
      const clr = st.querySelector('#mk-clr'); if (clr) clr.onclick = () => { sfx('tap'); m.f = F.map(() => 0); m.nm = ''; c.save(); mercado(); };
      const inp = st.querySelector('#mk-nm');
      inp.oninput = () => { m.nm = inp.value; const k = S.coMktSearch(co).length, good = k > 0 && k <= S.CO_MKT.max, nb = st.querySelector('#mk-n'), gb = st.querySelector('#mk-go');
        nb.textContent = plMil(k, 'jogador', 'jogadores'); nb.className = good ? 'ok' : ''; gb.textContent = goTxt(k); gb.classList.toggle('off', !good); };
      inp.onkeydown = e => { if (e.key === 'Enter') { inp.blur(); st.querySelector('#mk-go').click(); } };
      st.querySelector('#mk-go').onclick = () => { const k = S.coMktSearch(co).length; if (!(k > 0 && k <= S.CO_MKT.max)) return; sfx('tap'); c.save(); mercadoRes(0, 0); };
    });
  }
  // Resultado (23b): os filtros usados em cima e Mudar; 4 jogadores por página; à direita verba, folha, a ordem
  // (◀ ▶ como o Mostrar das notícias; S.CO_MKT.ords, fica em `m.ord`) e as páginas
  function mercadoRes(pg, sel) {
    const c = C(), co = c.co, m = S.coMkt(co), F = S.coMktFilters(co), f = S.coFin(co), folha = S.coFolha(co), pct = Math.min(100, Math.round(100 * folha / Math.max(1, f.teto)));
    const ords = S.CO_MKT.ords, ord = Math.min(m.ord || 0, ords.length - 1);
    const list = S.coMktSort(co, S.coMktSearch(co)), pages = Math.max(1, Math.ceil(list.length / 4));
    pg = Math.max(0, Math.min(pages - 1, pg || 0)); const R = list.slice(pg * 4, pg * 4 + 4); sel = Math.min(sel || 0, R.length - 1);
    const chips = F.map((x, i) => (m.f[i] ? '<span class="mk-chip">' + esc(x.o[m.f[i]].t.replace(' · verba', '')) + '</span>' : '')).join('') + (m.nm && m.nm.trim().length >= 3 ? '<span class="mk-chip">"' + esc(m.nm.trim()) + '"</span>' : '');
    const row = (p, i) => { const b = S.coMktBand(co, p), w = S.coMktWord(b), pr = S.coMktPrice(p);
      return '<button class="mk-r' + (i === sel ? ' on' : '') + '" data-mr="' + i + '"><i>' + p.pos + '</i><span><b>' + esc(p.n) + obsTag(co, p) + '</b><small' + (b ? '' : ' class="nr"') + '>' + p.age + ' anos · ' + mkClub(p) + (b ? '' : ' · sem relatório') + '</small></span>' +
        '<em class="' + (w || 'nr') + '">' + (w || '?') + '</em><strong>' + (p.club ? c.brl(pr) : 'grátis') + '</strong></button>'; };
    show('<div class="mk mkr">' + mkHead('mkr-back', 'Resultado', U.D.plural(list.length, 'jogador', 'jogadores'), false, true) +
      '<div class="mk-chips">' + chips + '<span class="rs-gap"></span><button class="mk-mud" id="mkr-mud">Mudar</button></div>' +
      '<div class="mk-list">' + (R.length ? R.map(row).join('') : '<p class="fn2-none">Ninguém com esses filtros.</p>') + '</div>' +
      '<div class="mk-side"><div class="mk-k"><small>VERBA</small><b class="up">' + c.brl(f.verba) + '</b><span class="mk-fl"><span>Folha</span><span>' + pct + '% do teto</span></span><i class="mk-bar"><u class="' + (pct > 95 ? 'low' : pct > 85 ? 'mid' : 'ok') + '" style="width:' + pct + '%"></u></i></div>' +
        '<div class="mk-k mk-ord"><button class="mk-ar" data-mo="-1" aria-label="ordem anterior">' + MK_L + '</button><span><small>ORDEM</small><b>' + ords[ord] + '</b></span><button class="mk-ar" data-mo="1" aria-label="ordem seguinte">' + MK_R + '</button></div>' +
        '<div class="mk-pg"><button class="mk-ar big" id="mkr-prev" aria-label="Página anterior"' + (pg ? '' : ' disabled') + '>' + MK_L + '</button><b>' + (pg + 1) + ' de ' + pages + '</b><button class="mk-ar big" id="mkr-next" aria-label="Próxima página"' + (pg < pages - 1 ? '' : ' disabled') + '>' + MK_R + '</button></div>' +
        '<span class="rs-gap"></span><button class="tm-go' + (R.length ? '' : ' off') + '" id="mkr-go">Ver ficha</button></div></div>', st => {
      st.querySelector('#mkr-back').onclick = () => { sfx('tap'); mercado(); };
      mkCoins(st, () => mercadoRes(pg, sel));
      st.querySelector('#mkr-mud').onclick = () => { sfx('tap'); mercado(); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Melhor, igual ou pior é contra o seu titular da posição. Quem o olheiro ainda não viu aparece sem relatório; peça um na ficha. Em Ordem você escolhe quem vem primeiro: em Nível, os com relatório, do melhor para o pior.'); };
      st.querySelectorAll('[data-mr]').forEach(b => b.onclick = () => { const i = +b.dataset.mr; sfx('tap'); if (i === sel) return ficha(R[i].id, () => mercadoRes(pg, i)); mercadoRes(pg, i); });
      st.querySelectorAll('[data-mo]').forEach(b => b.onclick = () => { sfx('tap'); m.ord = (ord + (+b.dataset.mo) + ords.length) % ords.length; c.save(); mercadoRes(0, 0); });
      st.querySelector('#mkr-prev').onclick = () => { sfx('tap'); mercadoRes(pg - 1, 0); };
      st.querySelector('#mkr-next').onclick = () => { sfx('tap'); mercadoRes(pg + 1, 0); };
      st.querySelector('#mkr-go').onclick = () => { if (!R.length) return; sfx('tap'); ficha(R[sel].id, () => mercadoRes(pg, sel)); };
    });
  }
  // Notícias (aba do Mercado, desenho A aprovado em 2026-11-10): os negócios do mercado vivo (engine/coachworld.js), uma
  // linha por notícia (posição, nome, escudo › escudo, etiqueta e valor), 4 por página; à direita o filtro Mostrar, as
  // páginas e Ver ficha. A nota dourada marca o que é do seu clube e o ▲ verde quem chegou para ser titular
  const NW_FLT = ['Tudo', 'Sua liga', 'Seu clube', 'Observados'], NW_TAG = { f: 'FECHADO', l: 'LIVRE', b: 'BOATO' };
  let nwFlt = 1, nwSeen = 0;
  function noticias(pg, sel, flt) {
    const c = C(), co = c.co;
    if (S.coWorldSync) S.coWorldSync(co);
    if (pg === undefined) { nwSeen = (co.wm && co.wm.seen) || 0; S.coWorldSeen(co); c.save(); } // entrou agora: o que era novo segue marcado até sair
    if (flt !== undefined) nwFlt = flt;
    const all = S.coWorldNews(co, 0), list = S.coWorldNews(co, nwFlt), pages = Math.max(1, Math.ceil(list.length / 4));
    pg = Math.max(0, Math.min(pages - 1, pg || 0)); const R = list.slice(pg * 4, pg * 4 + 4); sel = Math.max(0, Math.min(sel || 0, R.length - 1));
    const nNew = list.filter(x => x.i > nwSeen).length, win = S.coMktWin(co);
    const nm = id => '<span class="nw-c">' + esc((club(id).short || club(id).name).replace(/^Red Bull /, '')) + '</span>';
    const row = (x, i) => {
      const way = x.k === 'l' ? '<span class="nw-c">sem clube · ' + x.age + ' anos</span>' : (x.from ? crest(x.from, 'nw-cr') + nm(x.from) : '<span class="nw-c">sem clube</span>') + '<s>›</s>' + crest(x.to, 'nw-cr') + nm(x.to) + (x.up ? '<em title="chegou para ser titular">▲</em>' : '');
      const note = x.me === 1 ? 'seu clube' : x.me === 2 ? 'ex seu clube' : S.coWorldObs(co, x) ? 'observado' : '';
      return '<button class="mk-r' + (i === sel ? ' on' : '') + '" data-nr="' + i + '"><i>' + x.pos + '</i><span><b><span class="nw-n">' + esc(x.n) + '</span>' + (note ? '<u>' + note + '</u>' : '') + '</b><small>' + way + '</small></span>' +
        '<div class="nw-tc"><strong>' + (x.k === 'b' ? '?' : x.tr ? 'troca' : x.v ? c.brl(x.v) : 'grátis') + '</strong><em class="nw-tag ' + x.k + '">' + NW_TAG[x.k] + '</em></div></button>'; };
    const none = all.length ? (nwFlt === 2 ? 'Seu clube ainda não fez negócio.' : nwFlt === 3 ? 'Nada sobre quem você observa.' : 'Nada aqui. Veja em Tudo.') : win.k ? 'Nenhum negócio fechado ainda.' : win.next ? 'Sem notícias. A janela abre na rodada ' + win.next + '.' : 'Sem notícias nesta temporada.';
    const cur = R[sel], p = cur && cur.id ? S.coMktFind(co, cur.id) : null, goT = !cur ? 'Ver ficha' : p ? 'Ver ficha' : cur.to === co.club || (cur.k === 'b' && cur.from === co.club) ? 'No seu elenco' : 'Sem ficha';
    show('<div class="mk nw">' + mkHead('nw-back', 'Mercado', esc(club(co.club).short || club(co.club).name), false, true) +
      '<div class="mk-tabs t4">' + mkTabs(co, 2) + '</div>' +
      '<div class="mk-list">' + (R.length ? R.map(row).join('') : '<p class="fn2-none">' + none + '</p>') + '</div>' +
      '<div class="mk-side"><div class="mk-k nw-flt"><small>MOSTRAR</small><span><button class="mk-ar" data-nf="-1" aria-label="filtro anterior">' + MK_L + '</button><b>' + NW_FLT[nwFlt] + '</b><button class="mk-ar" data-nf="1" aria-label="filtro seguinte">' + MK_R + '</button></span>' +
        '<em>' + U.D.plural(list.length, 'notícia', 'notícias') + (nNew ? ' · <i>' + U.D.plural(nNew, 'nova', 'novas') + '</i>' : '') + '</em></div>' +
        '<div class="mk-pg"><button class="mk-ar big" id="nw-prev" aria-label="Página anterior"' + (pg ? '' : ' disabled') + '>' + MK_L + '</button><b>' + (pg + 1) + ' de ' + pages + '</b><button class="mk-ar big" id="nw-next" aria-label="Próxima página"' + (pg < pages - 1 ? '' : ' disabled') + '>' + MK_R + '</button></div>' +
        '<span class="rs-gap"></span><button class="tm-go' + (p ? '' : ' off') + '" id="nw-go">' + goT + '</button></div></div>', st => {
      const open = i => { const x = R[i]; if (!x || !x.id || !S.coMktFind(co, x.id)) return; ficha(x.id, () => noticias(pg, i)); };
      st.querySelector('#nw-back').onclick = () => { sfx('tap'); semana(); };
      mkCoins(st, () => noticias(pg, sel));
      st.querySelector('#mk-tpr').onclick = () => { sfx('tap'); mercado(); }; mkTabEl(st);
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Os negócios dos clubes com a janela aberta. BOATO: 2 em cada 3 fecham na semana seguinte. LIVRE: ficou sem clube e sai de graça. ▲ verde: chegou para ser titular. Ver ficha mostra o jogador no clube novo.'); };
      st.querySelectorAll('[data-nr]').forEach(b => b.onclick = () => { const i = +b.dataset.nr; sfx('tap'); if (i === sel) return open(i); noticias(pg, i); });
      st.querySelectorAll('[data-nf]').forEach(b => b.onclick = () => { sfx('tap'); noticias(0, 0, (nwFlt + (+b.dataset.nf) + NW_FLT.length) % NW_FLT.length); });
      st.querySelector('#nw-prev').onclick = () => { sfx('tap'); noticias(pg - 1, 0); };
      st.querySelector('#nw-next').onclick = () => { sfx('tap'); noticias(pg + 1, 0); };
      st.querySelector('#nw-go').onclick = () => { if (!p) return; sfx('tap'); open(sel); };
    });
  }
  // Propostas recebidas (11/11, Silvio: "não tá legal tentar abrir o mercado e ter que ver todas as propostas antes"): a 4ª aba
  // do Mercado, no desenho das Notícias. 4 por página, a maior oferta primeiro; tocar na escolhida (ou no dourado) abre a
  // janelinha da proposta e o Voltar dela devolve a lista. Entrar na aba marca todas como vistas (o aviso da Semana some)
  function recebidas(pg, sel) {
    const c = C(), co = c.co, win = S.coMktWin(co);
    const list = S.coMktInbox(co).slice().sort((a, b) => b.v - a.v), pages = Math.max(1, Math.ceil(list.length / 4));
    if (list.some(o => !o.seen)) { list.forEach(o => { o.seen = 1; }); c.save(); }
    pg = Math.max(0, Math.min(pages - 1, pg || 0)); const R = list.slice(pg * 4, pg * 4 + 4); sel = Math.max(0, Math.min(sel || 0, R.length - 1));
    const row = (o, i) => { const p = co.squad.find(x => x.id === o.id), bc = club(o.club);
      const note = o.ask ? 'à venda' : o.wish === 1 ? 'quer ir' : o.wish === 2 ? 'quer ficar' : '';
      return '<button class="mk-r' + (i === sel ? ' on' : '') + '" data-or="' + i + '"><i>' + p.pos + '</i><span><b><span class="nw-n">' + esc(p.n) + '</span>' + (note ? '<u>' + note + '</u>' : '') + '</b>' +
        '<small>' + crest(o.club, 'nw-cr') + '<span class="nw-c">' + esc((bc.short || bc.name).replace(/^Red Bull /, '')) + '</span><s>·</s><span class="nw-c">' + ((co.xi || []).includes(p.id) ? 'titular' : 'reserva') + ' · geral ' + p.ovr + '</span></small></span>' +
        '<div class="nw-tc"><strong>' + brlS(c, o.v) + '</strong><em class="nw-tag f">' + (o.pay ? (o.pay + 1) + 'X' : 'À VISTA') + '</em></div></button>'; };
    const none = win.open ? 'Nenhuma proposta agora. Quem você põe à venda no Elenco recebe mais.' : win.next ? 'Nenhuma proposta. Elas chegam com a janela, na rodada ' + win.next + '.' : 'Nenhuma proposta. A janela já fechou.';
    const me = () => recebidas(pg, sel);
    show('<div class="mk nw of">' + mkHead('of-back', 'Mercado', esc(club(co.club).short || club(co.club).name), false, true) +
      '<div class="mk-tabs t4">' + mkTabs(co, 3) + '</div>' +
      '<div class="mk-list">' + (R.length ? R.map(row).join('') : '<p class="fn2-none">' + none + '</p>') + '</div>' +
      '<div class="mk-side"><div class="mk-k nw-flt"><small>PELOS SEUS</small><span><b>' + U.D.plural(list.length, 'proposta', 'propostas') + '</b></span>' +
        '<em>' + (list.length ? 'Valem enquanto a janela estiver aberta.' : 'Nada para decidir.') + '</em></div>' +
        '<div class="mk-pg"><button class="mk-ar big" id="of-prev" aria-label="Página anterior"' + (pg ? '' : ' disabled') + '>' + MK_L + '</button><b>' + (pg + 1) + ' de ' + pages + '</b><button class="mk-ar big" id="of-next" aria-label="Próxima página"' + (pg < pages - 1 ? '' : ' disabled') + '>' + MK_R + '</button></div>' +
        '<span class="rs-gap"></span><button class="tm-go' + (R.length ? '' : ' off') + '" id="of-go">Ver proposta</button></div></div>', st => {
      const open = i => { const o = R[i]; if (!o) return; recebida(o, () => recebidas(pg, i)); };
      st.querySelector('#of-back').onclick = () => { sfx('tap'); semana(); };
      mkCoins(st, me);
      st.querySelector('#mk-tpr').onclick = () => { sfx('tap'); mercado(); }; st.querySelector('#mk-tnw').onclick = () => { sfx('tap'); noticias(); }; mkTabEl(st);
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Clubes que querem comprar um dos seus. Só chegam com a janela aberta e somem quando ela fecha. Quem está à venda no Elenco recebe mais propostas. Dá para aceitar, negociar ou recusar.'); };
      st.querySelectorAll('[data-or]').forEach(b => b.onclick = () => { const i = +b.dataset.or; sfx('tap'); if (i === sel) return open(i); recebidas(pg, i); });
      st.querySelector('#of-prev').onclick = () => { sfx('tap'); recebidas(pg - 1, 0); };
      st.querySelector('#of-next').onclick = () => { sfx('tap'); recebidas(pg + 1, 0); };
      st.querySelector('#of-go').onclick = () => { if (!R.length) return; sfx('tap'); open(sel); };
    });
  }
  // Ficha (24): a força numa faixa borrada contra o seu titular (sem número), que estreita a cada relatório;
  // potencial em palavras e o jeito de jogar; à direita preço, salário e contrato, relatório, observar e a proposta
  // Ficha: o botão "Ver atributos" troca o lado esquerdo (resumo ⇄ os 6 atributos). Atributo pelo olheiro (S.coMktAttrs):
  // sem relatório "?", com 1 e 2 uma faixa que estreita, com 3 o número certo e o mais alto em dourado.
  let fichaAt = 0;
  function fichaAttrs(co, p, n) {
    const A = S.coMktAttrs(co, p), ks = S.coAtKeys(p), X = v => Math.max(0, Math.min(100, (v - 25) / 74 * 100));
    const top = A && n >= 3 ? A.map(x => x.v).indexOf(Math.max.apply(null, A.map(x => x.v))) : -1;
    const row = (k, i) => { const x = A && A[i], nm = '<span>' + S.CO_AT.names[k] + '</span>';
      if (!x) return '<div class="mka-r">' + nm + '<span class="mka-sc q"><i></i></span><em class="q">?</em></div>';
      if (x.v !== null) return '<div class="mka-r' + (i === top ? ' top' : '') + '">' + nm + '<span class="mka-sc"><i></i><u class="x" style="width:' + X(x.v) + '%"></u></span><em>' + x.v + '</em></div>';
      return '<div class="mka-r">' + nm + '<span class="mka-sc"><i></i><u style="left:' + X(x.lo) + '%;width:' + (X(x.hi) - X(x.lo)) + '%"></u></span><em class="rg">' + x.lo + ' a ' + x.hi + '</em></div>'; };
    return '<div class="mk-k mka"><span class="mkf-t"><small>ATRIBUTOS</small><em>' + (S.coMktOld(co, p) ? n + ' de 3 · desatualizado' : ['sem relatório', '1 de 3 relatórios · pouca certeza', '2 de 3 relatórios · certeza média', 'relatório completo · geral <b>' + p.ovr + '</b>'][Math.min(3, n)]) + '</em></span><div class="mka-l">' + ks.map(row).join('') + '</div></div>';
  }
  // Marca de quem você observa ou pagou relatório (Silvio 11/11: "os que já gastei dinheiro pra observar têm um indicativo?"):
  // olho e os 3 tracinhos do relatório; laranja quando o relatório é da temporada passada (desatualizado)
  function obsTag(co, p) {
    const m = S.coMkt(co), n = (m.rep[p.id] || 0), old = S.coMktOld(co, p);
    if (!m.obs[p.id] && n < 2) return '';
    return '<u class="mk-ob' + (old ? ' old' : '') + '" title="' + (old ? 'relatório desatualizado' : 'observado') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>' +
      [1, 2, 3].map(k => '<i' + (k <= Math.max(1, n) ? ' class="on"' : '') + '></i>').join('') + '</u>';
  }
  function ficha(id, back) {
    const c = C(), co = c.co, p = S.coMktFind(co, id); if (!p) return mercado();
    const b = S.coMktBand(co, p), n = b ? b.n : 0, st0 = b ? b.st : S.coMktStarter(co, p.pos), sp = S.CO_MKT.span, obs = !!S.coMkt(co).obs[p.id];
    const X = v => Math.max(0, Math.min(100, 50 + 50 * v / sp));
    const CERT = ['', 'pouca certeza', 'certeza média', 'certeza alta'];
    const word = b ? S.coMktWord(b) : '';
    const band = b ? '<span class="mk-band" style="left:' + X(b.lo) + '%;width:' + Math.max(4, X(b.hi) - X(b.lo)) + '%"></span>' : '';
    const pot = b ? S.coMktPot(p) : null, tr = b ? S.coMktTraits(p) : null;
    const yr = p.club ? 'até ' + (U.YEAR0 + co.season + p.ct) : 'livre';
    const rums = p.club && S.coWorldRumors ? S.coWorldRumors(co, p.id).slice(0, 3) : []; // boato: outros clubes atrás dele
    const rumNm = id => esc((club(id).short || club(id).name).replace(/^Red Bull /, ''));
    const rumRow = rums.length ? '<div class="mkf-rm"><span>' + (rums.length > 1 ? 'Também querem' : 'Também quer') + '</span><b>' + rums.map(x => crest(x.to, 'nw-cr')).join('') + (rums.length === 1 ? '<i>' + rumNm(rums[0].to) + '</i>' : '') + '</b></div>' : '';
    const repC = S.coMktRepCost(co, p), repNo = n < S.CO_MKT.reps && (S.coFin(co).caixa || 0) < repC, repOff = n >= S.CO_MKT.reps || repNo;
    show('<div class="mk mkf' + (rumRow ? ' rm' : '') + '">' + mkHead('mkf-back', esc(p.n), S.CO_POS_NM[p.pos] + ' · ' + p.age + ' anos · ' + mkClub(p), false, true) +
      (fichaAt ? fichaAttrs(co, p, n) : '<div class="mk-k mkf-cmp"><span class="mkf-t"><small>CONTRA O SEU ' + (S.CO_POS_NM[p.pos] || '').toUpperCase() + ' TITULAR</small>' + (b ? (n >= S.CO_MKT.reps ? '<span class="mkf-ovw"><i class="mkf-ov"><small>GERAL</small>' + p.ovr + '</i>' : '') + '<b class="' + word + '">' + word + '<small' + (S.coMktOld(co, p) ? ' class="old">desatualizado' : '>' + CERT[n]) + '</small></b>' + (n >= S.CO_MKT.reps ? '</span>' : '') : '<b class="nr">sem relatório</b>') + '</span>' +
        '<span class="mkf-sc"><i></i>' + band + '<em></em><strong>' + esc(st0 ? last(st0.n) : 'titular') + '</strong></span><span class="mkf-w"><span>pior</span><span>igual</span><span>melhor</span></span></div>' +
      '<div class="mkf-g"><div class="mk-k"><small>POTENCIAL</small><b>' + (pot ? pot[0] : 'Peça um relatório') + '</b>' + (pot ? '<span class="mkf-dd">' + [1, 2, 3, 4].map(k => '<i class="' + (k <= pot[1] ? 'on' : '') + '"></i>').join('') + '</span>' : '<span class="mkf-nr">o olheiro ainda não viu</span>') + '</div>' +
        '<div class="mk-k"><small>JEITO DE JOGAR</small>' + (tr ? '<span class="mkf-tr">' + tr.good.map(t => '<span>' + t + '</span>').join('') + '</span><span class="mkf-nr">' + (n >= 3 ? 'Ponto fraco: ' + tr.bad : n === 2 ? 'Ponto fraco: falta 1 relatório' : 'Ponto fraco: faltam 2 relatórios') + '</span>' : '<b>?</b><span class="mkf-nr">o olheiro ainda não viu</span>') + '</div></div>') +
      '<div class="mk-side"><div class="mk-k mkf-li"><div><span>Preço</span><b>' + (p.club ? c.brl(S.coMktPrice(p)) : 'grátis') + '</b></div><div><span>Salário</span><b>' + c.brl(p.wage) + '/sem</b></div><div><span>Contrato</span><b>' + yr + '</b></div>' + rumRow + '</div>' +
        '<div class="mkf-act"><button class="mkf-rep' + (repOff ? ' done' : '') + '" id="mkf-rep"' + (repOff ? ' disabled' : '') + '>' + (n >= S.CO_MKT.reps ? 'Relatório completo' : (n ? 'Mais um relatório' : 'Pedir relatório') + '<small>' + (repNo ? 'sem caixa · ' : '') + c.brl(repC) + '</small>') + '</button>' +
          '<button class="mkf-star' + (obs ? ' on' : '') + '" id="mkf-star" aria-label="Observar" aria-pressed="' + obs + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg></button></div>' +
        '<button class="mkf-tg" id="mkf-tg" aria-pressed="' + !!fichaAt + '">' + (fichaAt ? 'Ver resumo' : 'Ver atributos') + '</button>' +
        '<span class="rs-gap"></span>' + fichaGo(co, p) + '</div></div>', st => {
      st.querySelector('#mkf-back').onclick = () => { sfx('tap'); (back || mercado)(); };
      mkCoins(st, () => ficha(id, back));
      st.querySelector('#mkf-tg').onclick = () => { sfx('tap'); fichaAt = fichaAt ? 0 : 1; ficha(id, back); };
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'A faixa é onde o olheiro acha que ele está, comparado ao seu titular. Cada relatório deixa a faixa mais estreita e custa mais que o anterior, pago do caixa. Jogador do exterior custa o dobro. Em Ver atributos é igual: faixa no 1º e no 2º relatório, o número certo no 3º.'); };
      if (!repOff) st.querySelector('#mkf-rep').onclick = () => { if (!S.coMktReport(co, p)) return; sfx('tap'); c.save(); ficha(id, back); };
      st.querySelector('#mkf-star').onclick = () => { sfx('tap'); S.coMktObs(co, p); c.save(); ficha(id, back); };
      const go = st.querySelector('#mkf-go.go');
      if (go) go.onclick = () => { sfx('tap'); const me = () => ficha(id, back); if (S.coMktFull(co, p)) return cheio(id, me); if (!p.club || S.coMktNeg(co, p).st === 'ok') contrato(id, me); else proposta(id, me); };
    });
  }
  // Elenco cheio (Silvio 2026-11-10, limite de 28): a janelinha abre no dourado da ficha, antes da proposta.
  // Com clube e sem acordo ainda, "Propor troca" abre a proposta já com um reserva na troca (sai um, entra um);
  // sem clube, ou com o acordo fechado sem troca, só resta abrir vaga no Elenco.
  function cheio(id, back) {
    const c = C(), co = c.co, p = S.coMktFind(co, id); if (!p) return;
    const TL = S.coMktTradeList(co), tr = p.club && S.coMktNeg(co, p).st !== 'ok' && TL.length, n = co.squad.length, max = S.CO_MKT.maxSquad;
    pop('<div class="mkx"><div class="mkx-h"><i class="mkx-fc">' + n + '</i><span><small>' + n + ' DE ' + max + ' JOGADORES</small><b class="dn">Elenco cheio</b></span></div>' +
      '<p>Para trazer o ' + esc(last(p.n)) + ', alguém tem que sair.</p>' +
      '<span class="mkx-b">' + (tr ? '<button class="hl-btn gold" id="ech-tr">Propor troca</button><button class="hl-btn line" id="ech-el">Ver elenco</button>' : '<button class="hl-btn gold" id="ech-el">Ver elenco</button>') + '</span></div>', 'Elenco cheio', w => {
      const t = w.querySelector('#ech-tr');
      if (t) t.onclick = () => { sfx('tap'); closePop(); const neg = S.coMktNeg(co, p); proposta(id, back, { v: neg.cv || S.coMktCuts(p)[1], pay: 0, tr: TL[0].id }); };
      w.querySelector('#ech-el').onclick = () => { sfx('tap'); closePop(); elenco(); };
    }, 'hl-pop mkx-pop ech-pop');
  }
  // O dourado da ficha: proposta (com a janela), contrato (sem clube ou depois do clube aceitar), ou apagado dizendo por quê
  function fichaGo(co, p) {
    const n = S.coMkt(co).neg[p.id], w = S.coMktWin(co), off = t => '<button class="tm-go off" id="mkf-go" disabled>' + t + '</button>';
    if (n && n.st === 'no') return off('Não negocia mais');
    if (!p.club || (n && n.st === 'ok')) return (p.club && !w.open) ? off('Janela fechada') : '<button class="tm-go go" id="mkf-go">' + (p.club ? 'Ir ao contrato' : 'Fazer contrato') + '</button>';
    if (!w.open) return off(w.next ? 'Janela na rodada ' + w.next : 'Janela fechada');
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
    const now = S.coMktNow(co, o), after = f.verba - now, over = S.coMktTradeOver(co, o);
    const pres = S.CO_MKT_PRES[S.coMktPres(co, p)], a = neg.ans;
    const ans = a ? (a.k === 'ok' ? ['Aceitou', 'up'] : a.k === 'counter' ? ['Pede ' + c.brl(a.v), 'mid'] : a.k === 'no' ? ['Encerrou a conversa', 'dn'] : ['Recusou', 'dn']) : [pres.t, pres.c];
    const cl = club(p.club), cn = esc(cl.short || cl.name);
    const done = neg.st === 'ok' || neg.st === 'no';
    const gold = neg.st === 'ok' ? '<button class="tm-go" id="mkp-go">Ir ao contrato</button>' : neg.st === 'no' ? '<button class="tm-go off" id="mkp-go" disabled>Não negocia mais</button>' :
      !w.open ? '<button class="tm-go off" id="mkp-go" disabled>Janela fechada</button>' : after < 0 ? '<button class="tm-go off" id="mkp-go" disabled>Sem verba</button>' :
      !tq && co.squad.length >= M.maxSquad ? '<button class="tm-go off" id="mkp-go" disabled>Elenco cheio</button>' : '<button class="tm-go" id="mkp-go">Enviar proposta</button>';
    const seg = (on, t, attr) => '<button class="' + (on ? 'on' : '') + '" ' + attr + '>' + t + '</button>';
    show('<div class="mk mkp nt">' + mkHead('mkp-back', 'Proposta', esc(p.n) + ' · ' + S.CO_POS_NM[p.pos] + ' · ' + cn) + // sem abas: só existe compra na 1.0 (empréstimo "em breve" saiu)
      '<div class="mkp-l"><div class="mk-k mkp-v"><small>VALOR DA PROPOSTA</small><span class="mkp-row"><button class="mk-ar big" data-pv="-1" aria-label="Menos"' + (done ? ' disabled' : '') + '>' + MK_L + '</button><b>' + c.brl(o.v) + '</b><button class="mk-ar big" data-pv="1" aria-label="Mais"' + (done ? ' disabled' : '') + '>' + MK_R + '</button></span>' +
        '<span class="mkp-cuts">' + ['Baixa', 'Justa', 'Alta'].map((t, i) => seg(o.v === cuts[i], t + ' · ' + c.brl(cuts[i]), 'data-pc="' + i + '"' + (done ? ' disabled' : ''))).join('') + '</span></div>' +
        '<div class="mkp-g"><div class="mk-k"><small>PAGAMENTO</small><span class="mkp-seg">' + ['À vista', '2x', '3x'].map((t, i) => seg(o.pay === i, t, 'data-pp="' + i + '"' + (done ? ' disabled' : ''))).join('') + '</span></div>' +
          '<div class="mk-k"><small>JOGADOR NA TROCA</small><span class="mkp-tr"><button class="mk-ar" data-pt="-1" aria-label="Anterior"' + (done || !TL.length ? ' disabled' : '') + '>' + MK_L + '</button><b class="' + (tq ? '' : 'off') + '">' + (tq ? esc(last(tq.n)) + ' · ' + tq.pos + '<small><u>' + tq.ovr + '</u> · ' + tq.age + ' anos · ' + c.brl(S.coValue(tq)) + '</small>' : TL.length ? 'Ninguém' : 'Sem reservas') + '</b><button class="mk-ar" data-pt="1" aria-label="Próximo"' + (done || !TL.length ? ' disabled' : '') + '>' + MK_R + '</button></span></div></div></div>' +
      '<div class="mk-side"><div class="mk-k mkp-pr"><small>PRESIDENTE</small><b class="' + ans[1] + '">' + ans[0] + '</b><span class="mkp-pat">Paciência' + mkDots(neg.pat, M.pat) + '</span></div>' +
        '<div class="mk-k mkf-li' + (over && !done ? ' o3' : '') + '"><div><span>' + (o.pay ? 'Agora · ' + (o.pay + 1) + 'x' : 'Paga agora') + '</span><b>' + c.brl(now) + '</b></div><div><span>Verba depois</span><b class="' + (after < 0 ? 'dn' : 'up') + '">' + (after < 0 ? '− ' + c.brl(-after) : c.brl(after)) + '</b></div>' +
          (over && !done ? '<div class="mkp-ov"><span>Perde na troca</span><b class="dn">' + c.brl(over) + '</b></div>' : '') + '</div>' +
        '<span class="rs-gap"></span>' + gold + '</div></div>', st => {
      const re = x => proposta(id, back, Object.assign({}, o, x));
      st.querySelector('#mkp-back').onclick = () => { sfx('tap'); back(); };
      cxBind(st, () => proposta(id, back, o));
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'Com a janela aberta você propõe quantas vezes quiser. Abaixo do que ele quer, o presidente contrapõe (perto) ou recusa (longe), e cada resposta que não é sim gasta uma bolinha de paciência. Sem paciência, ele não negocia mais nesta temporada. Parcelado pesa menos na verba agora, mas ele aceita um pouco menos. O jogador na troca abate do valor; se ele vale mais que a proposta, não tem troco.'); };
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
  // 2 linhas de número e 2 botões; na contraproposta, aceitar fecha direto
  function resposta(id, back, o, r) {
    const c = C(), co = c.co, p = S.coMktFind(co, id); if (!p) return;
    const f = S.coFin(co), neg = S.coMktNeg(co, p), cl = club(p.club), cn = esc(cl.short || cl.name), nm = esc(last(p.n));
    const dtx = '';
    let w, cls, line, r1, v1, r2, v2, b1, b2, a1, a2;
    if (r.k === 'ok') { const now = S.coMktNow(co, neg.deal);
      w = 'Aceitou'; cls = 'up'; line = 'Fechado com o ' + cn + ' por ' + c.brl(neg.deal.v) + (neg.deal.pay ? ' em ' + (neg.deal.pay + 1) + 'x' : ' à vista') + '. Agora é acertar o contrato com o empresário.';
      r1 = 'Paga agora'; v1 = c.brl(now); r2 = 'Verba depois'; v2 = f.verba - now; b1 = 'Ir ao contrato'; b2 = 'Depois';
      a1 = () => contrato(id, () => proposta(id, back)); a2 = null;
    } else if (r.k === 'counter') { const o2 = Object.assign({}, o, { v: r.v }), now = S.coMktNow(co, o2);
      w = 'Pede ' + c.brl(r.v); cls = 'mid'; line = 'Ele achou ' + c.brl(o.v) + ' pouco, mas topa conversar. Aceitar fecha agora.';
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
      w = r.k === 'verba' ? 'Sem verba' : 'Janela fechada'; cls = 'dn'; line = r.k === 'verba' ? 'O que sai agora passa da sua verba. Parcele ou ponha alguém na troca.' : 'A janela fechou. Sem clube dá para contratar a qualquer hora.';
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
    const yr = U.YEAR0 + co.season + t.y + (own ? 1 : 0), need = p.club || w.open; // renovação: os anos contam depois desta temporada
    const gold = own ? (neg.st === 'no' ? '<button class="tm-go off" id="mkc-go" disabled>Não renova mais</button>' : neg.st === 'signed' ? '<button class="tm-go off" id="mkc-go" disabled>Renovado</button>' :
      over && t.w > p.wage ? '<button class="tm-go off" id="mkc-go" disabled>Acima do teto</button>' : '<button class="tm-go" id="mkc-go">Oferecer</button>') : neg.st === 'no' ? '<button class="tm-go off" id="mkc-go" disabled>Não negocia mais</button>' : (p.club && !w.open) ? '<button class="tm-go off" id="mkc-go" disabled>Janela fechada</button>' :
      over ? '<button class="tm-go off" id="mkc-go" disabled>Acima do teto</button>' : S.coMktFull(co, p) ? '<button class="tm-go off" id="mkc-go" disabled>Elenco cheio</button>' :
      '<button class="tm-go" id="mkc-go">' + 'Oferecer' + '</button>';
    const sub = own ? esc(p.n) + ' · hoje ' + c.mi(p.wage) + '/sem' : esc(p.n) + (p.club ? ' · o ' + esc(club(p.club).short || club(p.club).name) + ' aceitou' : ' · sem clube');
    const box = (lbl, v, k, hint) => '<div class="mk-k mkc-b"><small>' + lbl + '</small><span class="mkp-row"><button class="mk-ar big" data-' + k + '="-1" aria-label="Menos">' + MK_L + '</button><b>' + v + '</b><button class="mk-ar big" data-' + k + '="1" aria-label="Mais">' + MK_R + '</button></span><span class="mkc-h">' + hint + '</span></div>';
    show('<div class="mk mkc">' + mkHead('mkc-back', own ? 'Renovação' : 'Contrato', sub, own) +
      '<div class="mkc-l"><div class="mkc-g">' + box('SALÁRIO POR SEMANA', (t.w < 10000 && t.w % 1000 ? 'R$ ' + (t.w / 1000).toFixed(1).replace('.', ',') + ' mil' : c.brl(t.w)), 'cw', t.w >= md.ask ? 'o que ele pede' : 'abaixo do que ele pede') +
        box('DURAÇÃO', (own ? '+' : '') + t.y + (t.y > 1 ? ' anos' : ' ano'), 'cy', 'até ' + yr + (t.y === T.want ? ' · ele prefere' : '')) + '</div>' +
        '<div class="mk-k mkc-r"><small>PAPEL PROMETIDO</small><span class="mkp-seg big">' + R.map((r, i) => '<button class="' + (t.role === i ? 'on' : '') + '" data-cr="' + i + '">' + r.t + '</button>').join('') + '</span><span class="mkc-d">' + R[t.role].d + '</span></div></div>' +
      '<div class="mk-side"><div class="mk-k mkp-pr"><small>EMPRESÁRIO</small><b class="' + cls + '">' + (neg.st === 'no' ? 'Desistiu' : md.t + (md.lvl === 3 ? '<small class="mkc-ch">1 chance em 3</small>' : '')) + '</b><span class="mkf-dd mkc-dd">' + [1, 2, 3, 4].map(k => '<i class="' + (k <= md.lvl ? cls || 'up' : '') + '"></i>').join('') + '</span><span class="mkp-pat">Tentativas <em class="mkc-tn' + (neg.apat === 1 && neg.st === 'open' ? ' dn' : '') + '">' + (neg.st === 'no' ? 0 : neg.apat) + ' de ' + M.pat + '</em>' + mkDots(neg.st === 'no' ? 0 : neg.apat, M.pat) + '</span></div>' +
        '<div class="mk-k mkc-f"><small>FOLHA DEPOIS</small><b class="' + (over ? 'dn' : '') + '">' + fo.pct + '% do teto</b><i class="mk-bar"><u class="' + (over ? 'low' : fo.pct >= 95 ? 'mid' : 'ok') + '" style="width:' + Math.min(100, fo.pct) + '%"></u></i></div>' +
        '<span class="rs-gap"></span>' + gold + '</div></div>', st => {
      const re = x => contrato(id, back, Object.assign({}, t, x));
      st.querySelector('#mkc-back').onclick = () => { sfx('tap'); back(); };
      cxBind(st, () => contrato(id, back, t));
      st.querySelector('#mk-q').onclick = () => { sfx('tap'); mkHelp('', 'O empresário pesa salário, anos e papel, e o humor dele muda a cada toque: com "Deve aceitar" ele assina, e com "Quase lá" pode assinar (1 chance em 3). Cada recusa gasta uma das 3 tentativas e ele diz na hora o que aceita. Prometer titular baixa o salário que ele pede, mas a promessa vai ser cobrada. A folha não passa do teto.' + (own ? ' Sem renovar, ele sai do clube no fim do contrato, mesmo sendo titular.' : '')); };
      st.querySelectorAll('[data-cw]').forEach(b => b.onclick = () => { sfx('tap'); re({ w: Math.max(1000, t.w + T.step * (+b.dataset.cw)) }); });
      st.querySelectorAll('[data-cy]').forEach(b => b.onclick = () => { sfx('tap'); re({ y: Math.max(1, Math.min(5, t.y + (+b.dataset.cy))) }); });
      st.querySelectorAll('[data-cr]').forEach(b => b.onclick = () => { sfx('tap'); re({ role: +b.dataset.cr }); });
      const go = st.querySelector('#mkc-go:not(.off)');
      if (go && own) go.onclick = () => { sfx('tap'); const r = S.coMktRenew(co, p, t); c.save();
        if (r.k === 'signed') { sfx('win'); back(); return pop('<div class="mkx"><div class="mkx-h"><i class="mkx-fc">' + p.ovr + '</i><span><small>' + esc(p.n).toUpperCase() + '</small><b class="up">Renovado</b></span></div>' +
          '<p>' + esc(last(p.n)) + ' assinou ' + ['como titular', 'para o rodízio', 'como aposta'][t.role] + '.</p><div class="mkx-li"><div><span>Salário</span><b>' + c.brl(p.wage) + '/sem</b></div><div><span>Contrato</span><b>até ' + (U.YEAR0 + co.season + p.ct) + '</b></div></div>' +
          '<span class="rs-gap"></span><span class="mkx-b"><button class="hl-btn gold" id="mkx-1">Fechar</button></span></div>', 'Renovado', x => { x.querySelector('#mkx-1').onclick = () => { sfx('tap'); closePop(); }; }, 'hl-pop mkx-pop', true); }
        re({}); if (r.k === 'recusa' || r.k === 'no') recusou(id, back, t, r, true); };
      else if (go) go.onclick = () => { sfx('tap'); const r = S.coMktContract(co, p, t); c.save();
        if (r.k === 'signed') { sfx('win'); return fechado(r.p, R[t.role].t, neg.deal, p.club); }
        re({}); if (r.k === 'recusa' || r.k === 'no') recusou(id, back, t, r, false); };
    });
  }
  // Recusou (Silvio 2026-11-11: "não quero ... ter as 3 tentativas sem um retorno dele e somente ver uma bolinha saindo"):
  // ele responde na hora no balão da conversa (.cvj), diz o que aceita e mostra as tentativas que sobram. O dourado fecha
  // pelo que ele pede (assina na hora; renovação nunca gasta dia, contrato gasta 1 só quando assina); Ajustar volta à tela.
  function recusou(id, back, t, r, own) {
    const c = C(), co = c.co, p = own ? co.squad.find(x => x.id === id) : S.coMktFind(co, id); if (!p) return;
    const neg = own ? S.coMktRenNeg(co, p) : S.coMktNeg(co, p), M = S.CO_MKT, R = S.CO_MKT_ROLE, wa = S.coMktWants(co, p, t);
    const yt = n => n + (n > 1 ? ' anos' : ' ano'), wt = v => (v < 10000 && v % 1000 ? 'R$ ' + (v / 1000).toFixed(1).replace('.', ',') + ' mil' : c.brl(v));
    const nt = Object.assign({}, t, { w: wa.w, y: wa.y }), fo = S.coMktFolha(co, p, nt), over = fo.pct > 100 && (!own || nt.w > p.wage);
    const end = r.k === 'no', left = end ? 0 : neg.apat, en = Math.round(p.en == null ? 100 : p.en);
    let say;
    if (end) say = own ? 'Não deu, professor. Vou cumprir o contrato e, no fim dele, eu saio.' : 'Não dá mais. Vamos ouvir outros clubes.';
    else { const pre = wa.lvl >= 3 ? 'Tá perto.' : wa.lvl === 2 ? 'Assim não dá.' : 'Nem perto, professor.';
      say = wa.wOk ? pre + ' O salário tá bom, mas quero ' + yt(wa.y) + '.' : pre + ' Por ' + wt(wa.w) + ' por semana' + (wa.yOk ? '' : ' e ' + yt(wa.y)) + ' eu assino.';
      if (left === 1) say += ' Última chance.'; }
    const pips = '<span class="cvj-mo' + (left >= 2 ? ' ok' : '') + '"><small>TENTATIVAS</small><span><span class="cvj-pip">' + Array.from({ length: M.pat }, (_, i) => '<i class="' + (i < left ? 'on' : '') + '"></i>').join('') + '</span><b>' + left + ' de ' + M.pat + '</b></span></span>';
    const li = end ? '<div class="rcs-li"><span>' + (own ? 'Contrato até' : 'Situação') + '</span><b>' + (own ? (U.YEAR0 + co.season + p.ct) + ' · depois sai' : 'Não negocia mais') + '</b></div>'
      : '<div class="rcs-li"><span>Ele aceita</span><b>' + wt(wa.w) + '/sem · ' + (own ? '+' : '') + yt(wa.y) + ' · ' + R[wa.role].t + '</b></div>';
    const b1 = end ? '<button class="hl-btn gold" id="rcs-1">' + (own ? 'Ver elenco' : 'Mercado') + '</button>'
      : over ? '<button class="hl-btn gold off" id="rcs-1" disabled>Passa do teto</button>' : '<button class="hl-btn gold" id="rcs-1">Fechar por ' + wt(wa.w) + '</button>';
    pop('<div class="cvj-h"><span class="cvj-d ' + enRing(en) + '" style="--en:' + en + '"><b>' + p.ovr + '</b><em>' + p.pos + '</em></span>' +
      '<span class="cvj-n"><b>' + esc(p.n) + '</b><small>' + (own ? 'Renovação' : 'Empresário') + '<em>' + (end ? 'Desistiu' : 'Recusou') + '</em></small></span>' + pips + '</div>' +
      '<div class="cvj-say"><p>“' + esc(say) + '”</p></div>' + li +
      '<span class="mkx-b rcs-b">' + b1 + '<button class="hl-btn dark" id="rcs-2">' + (end ? 'Fechar' : 'Ajustar') + '</button></span>', 'Resposta de ' + p.n, x => {
      const b = x.querySelector('#rcs-1:not(.off)');
      if (b) b.onclick = () => { sfx('tap'); closePop();
        if (end) return own ? elenco() : mercado();
        contrato(id, back, nt); const go = document.querySelector('#mkc-go:not(.off)'); if (go) go.click(); };
      x.querySelector('#rcs-2').onclick = () => { sfx('tap'); closePop(); };
    }, 'cvj-pop cvj-av rcs-pop', true);
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
    const wi = WISH[o.wish || 0], w = S.coMktWin(co), dtx = '';
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
        ((co.xi || []).includes(p.id) ? '<span>titular</span>' : '<span>reserva</span>') + '<em class="' + wi[1] + '">' + wi[0] + '</em>' +
        (r && r.k === 'ok' ? '' : '<button class="mkr2-el" id="mkr2-el">Ver elenco</button>') + '</div>' +
      '<div class="mkr2-r"><div class="mkr2-h">' + crest(o.club, 'mkr2-cr') + '<span><small>' + eb + '</small><b>' + ti + '</b></span></div><p>' + line + '</p>' +
        '<div class="mkx-li">' + rows.map(x => '<div><span>' + x[0] + '</span><b' + (x[2] ? ' class="' + x[2] + '"' : '') + '>' + x[1] + '</b></div>').join('') + '</div>' +
        '<span class="rs-gap"></span><span class="mkr2-b n' + btns.length + '">' + btns.map((b, i) => '<button class="hl-btn ' + b[1] + '" data-rb="' + i + '">' + b[0] + '</button>').join('') + '</span></div></div>', 'Proposta recebida', x => {
      x.querySelectorAll('[data-rb]').forEach(b => b.onclick = () => { sfx('tap'); closePop(); btns[+b.dataset.rb][2](); });
      // Ver o elenco antes de decidir (Silvio 2026-11-10: "pra analisar se vale a pena ou se vou ficar desfalcado"): abre no
      // setor dele, com ele marcado; o Voltar traz a proposta de volta
      const el = x.querySelector('#mkr2-el'); if (el) el.onclick = () => { sfx('tap'); closePop(); elenco(CT_TAB[p.pos] || 0, p.id, () => { back(); recebida(o, back, r); }); };
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
      cxBind(st, () => negociar(id, back, t));
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
  // Propostas novas na volta para a semana: uma janelinha sozinha por semana (Silvio 2026-11-09: nunca duas seguidas);
  // as outras ficam no aviso do botão Mercado
  function inboxPop(co, back) {
    const m = S.coMkt(co), wk = co.season + '|' + co.ss.i, o = S.coMktInbox(co).find(x => !x.seen); if (!o || m.popK === wk) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; o.seen = 1; m.popK = wk; C().save(); recebida(o, back); }, 80); return true;
  }
  // Quem você observava fechou com outro clube (mercado vivo, fase 3): uma janelinha na volta para a semana, nunca junto
  // com a de proposta recebida (fica para a semana seguinte). Procurar outro abre o Mercado já na posição dele
  // Aviso de quem subiu de geral no treino da semana (fase 4 dos atributos; Silvio 2026-11-10: "se um jogador evoluir de
  // overall eu quero uma notificaçãozinha"). O cartão creme do "Meta cumprida", dentro do palco: sai uma vez (`co.train.seen`),
  // some sozinho e o Ver abre o Elenco no jogador. Com janelinha aberta espera a próxima vez que a Semana abrir.
  // Aviso da janela de transferências na Semana (abriu, última rodada, fechou): o cartão do upToast, uma vez cada
  // Vida do aviso do topo (.up-ty): o tempo só conta sem janelinha por cima. Com uma aberta ele fica escondido (CSS) e volta
  // depois: em 11/11 o aviso da janela saía em cima do título da proposta recebida. O número serve no clearTimeout
  const toastLife = (box, ms) => { const iv = setInterval(() => { if (!box.isConnected) return clearInterval(iv); if (document.getElementById('ld-pop')) return; ms -= 250; if (ms <= 0) { clearInterval(iv); box.remove(); } }, 250); return iv; };
  function winToast(co) {
    const wi = S.coMktWinInfo(co), st = document.querySelector('#ld .ld-st');
    if (!wi || wi.seen || !st || !st.querySelector('.sm')) return;
    // com outra janelinha aberta (proposta recebida, aviso da diretoria) espera ela fechar, enquanto estiver na Semana
    if (document.querySelector('#ld-pop') || st.querySelector('.up-ty')) { clearTimeout(winToast.t); winToast.t = setTimeout(() => winToast(co), 700); return; }
    const c = C(); S.coMktWinSeen(co, wi.key); c.save('hub');
    const T = { open: ['Janela de transferências aberta', 'Fica aberta por ' + wi.rd + ' rodadas'], last: ['Última rodada da janela', 'Depois do próximo jogo ela fecha'],
      closed: ['A janela fechou', wi.k === 'pre' ? 'Reabre antes da rodada do meio' : 'Reabre na próxima temporada · sem clube a qualquer hora'] }[wi.st];
    const box = document.createElement('div'); box.className = 'up-ty wn-ty' + (wi.st === 'last' ? ' ult' : ''); box.setAttribute('role', 'status');
    box.innerHTML = '<i><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="13" r="8"/>' + (wi.st === 'closed' ? '<path d="M8.5 9.5l7 7M15.5 9.5l-7 7"/>' : '<path d="M12 9v4l3 2M9.5 3h5"/>') + '</svg></i><span><b>' + T[0] + '</b><small>' + T[1] + '</small></span>' + (wi.st === 'closed' ? '' : '<button class="up-b">Mercado</button>');
    st.appendChild(box); sfx(wi.st === 'last' ? 'whistle' : 'tap');
    const t = toastLife(box, 8000);
    box.onclick = () => { clearTimeout(t); box.remove(); };
    const b = box.querySelector('.up-b'); if (b) b.onclick = e => { e.stopPropagation(); clearTimeout(t); box.remove(); sfx('tap'); mercado(); };
  }
  function upToast(co) {
    const tr = co.train, st = document.querySelector('#ld .ld-st');
    if (st && st.querySelector('.up-ty')) return;
    if (!tr || !co.ss || tr.i !== co.ss.i || !tr.up || !tr.up.length || tr.seen || !st || !st.querySelector('.sm') || document.querySelector('#ld-pop')) return;
    const c = C(), L = tr.up.map(id => co.squad.find(p => p.id === id)).filter(Boolean); if (!L.length) return;
    tr.seen = 1; c.save('hub');
    const q = L[0], dv = (tr.dv || []).find(x => x[0] === q.id), ks = S.coAtKeys(q), at = S.coAttrs(q);
    const box = document.createElement('div'); box.className = 'up-ty'; box.setAttribute('role', 'status');
    box.innerHTML = '<i>▲</i>' + (L.length === 1 ? '<b class="o">' + q.ovr + '</b><span><b>' + esc(c.last(q.n)) + ' subiu de geral</b>' + (dv ? '<small>' + S.CO_AT.names[ks[dv[1]]] + ' ' + (at[dv[1]] - 1) + ' → ' + at[dv[1]] + '</small>' : '') + '</span>'
      : '<span><b>' + L.length + ' jogadores subiram de geral</b><small>' + L.slice(0, 2).map(p => esc(c.last(p.n)) + ' ' + p.ovr).join(' · ') + (L.length > 2 ? ' e mais ' + (L.length - 2) : '') + '</small></span>') + '<button class="up-b">Ver</button>';
    st.appendChild(box); sfx('levelup');
    const t = toastLife(box, 7000);
    box.onclick = () => { clearTimeout(t); box.remove(); };
    box.querySelector('.up-b').onclick = e => { e.stopPropagation(); clearTimeout(t); box.remove(); sfx('tap'); elenco.ct = 0; elenco(q.pos === 'GOL' ? 0 : q.pos === 'MEI' ? 2 : q.pos === 'ATA' ? 3 : 1, q.id); };
  }
  function lostPop(co) {
    if (!S.coWorldLost || !co.wm || !co.wm.lost || document.getElementById('ld-pop')) return false;
    const x = S.coWorldLost(co), c = C(); c.save();
    setTimeout(() => { if (document.getElementById('ld-pop')) return;
      pop('<div class="mkx"><div class="mkx-h">' + crest(x.to, 'mkx-cr') + '<span><small>VOCÊ OBSERVAVA</small><b class="dn">Fechou com outro</b></span></div>' +
        '<p><b>' + esc(x.n) + '</b> assinou com o ' + esc(club(x.to).short || club(x.to).name) + ' por ' + c.brl(x.v) + '.</p>' +
        '<span class="mkx-b"><button class="hl-btn gold" id="lst-go">Procurar outro</button><button class="hl-btn line" data-pop-x>Fechar</button></span></div>', 'Fechou com outro', w => {
        w.querySelector('#lst-go').onclick = () => { sfx('tap'); closePop(); const m = S.coMkt(co), F = S.coMktFilters(co), i = F.findIndex(f => f.k === 'pos'), j = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].indexOf(x.pos) + 1;
          m.f = F.map(() => 0); if (i >= 0 && j > 0) m.f[i] = j; m.nm = ''; c.save(); mercado(); };
      }, 'hl-pop mkx-pop ech-pop'); }, 80);
    return true;
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
  // Aba Rodada e o ritmo do caixa (Silvio 2026-11-11: "a cada jogo quanto entrou e quanto saiu; não está claro se vou continuar
  // no positivo ou se o saldo vai zerar em semanas"): `fin.rd` e `S.coFinRitmo` em coachfin.js. O cartão Caixa diz quantas
  // rodadas o caixa aguenta no ritmo atual (verde sobra ou chega ao fim da temporada, laranja mais de 4, vermelho 4 ou menos)
  let FIN_BACK = null;
  const RD_NM = { bil: 'Ingressos', bar: 'Bares e lojas', tv: 'Cota de TV', pat: 'Patrocínio', prem: 'Prêmios', vend: 'Vendas', apo: 'Aporte do investidor', out: 'Outros', sal: 'Salários', comp: 'Contratações e parcelas', jur: 'Juros do banco', obra: 'Obras do estádio' };
  // Ritmo com seta (11/11, Silvio: "não está clara a trajetória, se está diminuindo ou crescendo"): a rodada comum daqui para a frente
  const ritmoTxt = (c, R) => !R ? '' : R.net >= 0 ? '▲ + ' + c.mi(R.net) + ' por rodada' : '▼ − ' + c.mi(-R.net) + ' por rodada';
  // Cartão da trajetória: quanto o caixa mudou na temporada, a linha rodada a rodada (tracejado = até o fim do ano no ritmo
  // de hoje) e onde ele chega. A palavra do degrau (aviso, no vermelho...) fica no canto quando não está tranquilo
  function finTrend(c, co, step) {
    const T = S.coFinTrend(co), f = S.coFin(co); if (!T) return '';
    const P = T.pts, all = P.concat(T.end === null ? [] : [T.end]), mn = Math.min(...all), mx = Math.max(...all), lo = mn < 0 ? mn : mn - (mx - mn) * 0.15, hi = mx > lo ? mx : lo + 1, W = 200, H = 40;
    const X = r => Math.round(Math.min(1, r / Math.max(1, T.n)) * (W - 6) * 10) / 10 + 3, Y = v => Math.round((H - 5 - (v - lo) / (hi - lo || 1) * (H - 10)) * 10) / 10;
    const xy = P.map((v, k) => X(T.r0 + k) + ',' + Y(v)), lastX = X(T.r0 + P.length - 1), lastY = Y(P[P.length - 1]);
    const up = T.d === null ? (T.R ? T.R.net >= 0 : true) : T.d >= 0, col = f.caixa < 0 ? '#F08A5D' : up ? '#7ED39A' : '#F5B544';
    const svg = '<svg class="fn2-sp" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      (mn < 0 ? '<line x1="0" x2="' + W + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="rgba(243,241,234,.28)" stroke-width="1" vector-effect="non-scaling-stroke"/>' : '') +
      (T.end !== null ? '<line x1="' + lastX + '" y1="' + lastY + '" x2="' + X(T.n) + '" y2="' + Y(T.end) + '" stroke="rgba(243,241,234,.45)" stroke-width="2" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>' : '') +
      (P.length > 1 ? '<polyline points="' + xy.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' : '') + '</svg>';
    const big = T.d === null ? '<b>começa agora</b>' : '<b class="' + (T.d >= 0 ? 'up' : 'dn') + '">' + (T.d >= 0 ? '▲ + ' : '▼ − ') + c.brl(Math.abs(T.d)) + '</b>';
    const R = T.R, em = step >= 2 ? '<em class="dn">' + FIN_STEP[step][1] + '</em>' : R && R.net < 0 && R.left !== null && R.left < R.rest ? '<em class="dn">nesse ritmo zera ' + (R.left < 1 ? 'na próxima rodada' : 'em ' + U.D.plural(R.left, 'rodada', 'rodadas')) + '</em>' :
      T.end === null ? '<em>temporada encerrada</em>' : '<em>fim do ano ~ <b class="' + (T.end < 0 ? 'dn' : T.end >= f.caixa ? 'up' : '') + '">' + c.brl(T.end) + '</b></em>';
    return '<div class="fn2-st fn2-tr"><small>' + (T.r0 ? 'DESDE A RODADA ' + (T.r0 + 1) : 'CAIXA NO ANO') + (step ? '<u class="s' + step + '">' + FIN_STEP[step][0] + '</u>' : '') + '</small>' + big + '<span class="fn2-spw">' + svg + '<i style="left:' + (lastX / W * 100) + '%;top:' + (lastY / H * 100) + '%;background:' + col + '"></i></span>' + em + '</div>';
  }
  function financas(tab) {
    const c = C(), co = c.co, f = S.coFin(co), folha = S.coFolha(co), pct = Math.min(100, Math.round(100 * folha / Math.max(1, f.teto)));
    const step = S.coFinStep(co), P = S.coPres(co), pt = f.pat, rd = f.rd && f.rd.s === co.season ? f.rd : null, R = S.coFinRitmo(co);
    tab = ['rod', 'tmp', 'seg', 'sal'].indexOf(tab) >= 0 ? tab : rd ? 'rod' : 'tmp';
    const li = (t, v, cls) => '<div class="fn2-li"><span>' + t + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    let rows = '';
    if (tab === 'rod') { if (!rd) rows = '<p class="fn2-none">Nenhuma rodada jogada nesta temporada.</p>';
      else { const a = rd.inn.reduce((t, x) => t + x[1], 0), b = rd.out.reduce((t, x) => t + x[1], 0);
        const top4 = L => { const o = L.filter(x => x[0] === 'out').reduce((t, x) => t + x[1], 0), R = L.filter(x => x[0] !== 'out').sort((x, y) => y[1] - x[1]);
          const k = R.length + (o ? 1 : 0) > 4 ? 3 : R.length, v = o + R.slice(k).reduce((t, x) => t + x[1], 0); return R.slice(0, k).concat(v ? [['out', v]] : []); }; // cabe sem rolar: até 4 linhas por coluna
        const col = (t, L, sg, cls) => '<div class="fn2-rc"><small>' + t + '</small>' + (L.length ? L.map(([k, v]) => '<span>' + (RD_NM[k] || k) + '<b class="' + cls + '">' + sg + c.mi(v) + '</b></span>').join('') : '<span class="nd">nada</span>') + '</div>';
        rows = '<div class="fn2-rd">' + col('ENTROU', top4(rd.inn), '+ ', 'up') + col('SAIU', top4(rd.out), '− ', 'dn') + '</div>' +
          (rd.h === 0 || rd.h === -1 ? '<p class="fn2-fora">' + (rd.h ? 'Sem jogo nesta rodada' : 'Jogo fora de casa') + ': sem bilheteria, bares e camarotes</p>' : '') +
          '<div class="fn2-li fn2-rs"><span><b>Saldo da rodada ' + rd.r + '</b>' + (R ? '<small> · rodada comum ' + c.sgn(R.net) + '</small>' : '') + '</span><b class="' + (a >= b ? 'up' : 'dn') + '">' + c.sgn(a - b) + '</b></div>'; } }
    else if (tab === 'tmp') { const x = f.ss, homes = co.ss ? co.ss.log.filter(l => l.home).length : 0, sg = v => (v ? '+ ' + c.mi(v) : '0'), sn = v => (v ? '− ' + c.mi(v) : '0');
      const saldo = x.bil + x.tv + x.pat + x.prem + x.vend - x.sal - x.comp;
      rows = li('Bilheteria · ' + U.D.plural(homes, 'jogo', 'jogos') + ' em casa', sg(x.bil), 'up') + li('TV e patrocínio', sg(x.tv + x.pat), 'up') + (x.prem ? li('Prêmios', sg(x.prem), 'up') : '') + (x.vend ? li('Vendas', sg(x.vend), 'up') : '') +
        (f.futLog || []).filter(y => y.s === co.season).map(y => '<div class="fn2-li fn2-cl"><span>Cláusula · ' + esc(y.n) + ' · ' + esc(club(y.club).short || club(y.club).name) + '<small> ' + y.pct + '% da revenda</small></span><b class="up">+ ' + c.mi(y.v) + '</b></div>').join('') +
        li('Salários', sn(x.sal), 'dn') + (x.comp ? li('Contratações', sn(x.comp), 'dn') : '') + li('<b>Saldo</b>', c.sgn(saldo), saldo >= 0 ? 'up' : 'dn'); }
    // Cláusulas de venda futura que ainda valem, em cima (Silvio 2026-11-11: "já existe algum retorno da cláusula de venda?"):
    // quem, o clube, o último ano em que a revenda paga e o % (`co.fin.fut`, `futPay` em coachmkt.js)
    else if (tab === 'seg') rows = ((f.fut || []).map(x => '<div class="fn2-li fn2-cl"><span>Cláusula · ' + esc(x.n) + ' · ' + esc(club(x.club).short || club(x.club).name) + '<small> até ' + (U.YEAR0 + x.s + S.CO_MKT.futS) + '</small></span><b>' + x.pct + '% da revenda</b></div>').join('') +
      S.coFinNext(co).map(n => li(esc(n.txt), (n.aprox ? '~ ' : '') + c.mi(n.v))).join('')) || '<p class="fn2-none">A temporada acabou.</p>';
    else rows = co.squad.slice().sort((a, b) => b.wage - a.wage).slice(0, 8).map(p => li(esc(p.n) + ' <small>' + p.pos + '</small>', c.mi(p.wage) + ' <small>até ' + (U.YEAR0 + co.season + p.ct) + '</small>')).join('');
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    show('<div class="fn2"><div class="tm-h"><button class="tcr-back" id="ldf-back" aria-label="Voltar">' + BK + '</button><b>Finanças</b><small>' + esc(club(co.club).short || club(co.club).name) + ' · ' + (U.YEAR0 + co.season) + '</small></div>' +
      '<div class="fn2-k"><div><small class="cx-l">' + CX_IC + 'CAIXA</small><b class="' + (f.caixa < 0 ? 'dn' : '') + '">' + c.brl(f.caixa) + '</b><span class="fn2-rt ' + (f.caixa < 0 ? 'red' : !R ? '' : R.net >= 0 ? 'up' : R.st === 'red' ? 'red' : 'warn') + '" title="rodada comum daqui para a frente">' + (f.caixa < 0 ? 'no vermelho' : ritmoTxt(c, R)) + '</span></div>' +
        '<div><small>VERBA</small><b class="up">' + c.brl(f.verba) + '</b><span>para contratar</span></div>' +
        '<div><small>FOLHA</small><b>' + c.brl(folha) + '</b><i><u class="' + (pct > 95 ? 'low' : pct > 85 ? 'mid' : 'ok') + '" style="width:' + pct + '%"></u></i><span>teto ' + c.brl(f.teto) + '</span></div></div>' +
      '<div class="fn2-tabs">' + [['rod', 'Rodada'], ['tmp', 'Temporada'], ['seg', 'A seguir'], ['sal', 'Salários']].map(([k, t]) => '<button data-ft="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
      '<div class="fn2-p">' + rows + '</div>' +
      '<div class="fn2-side">' + finTrend(c, co, step) +
        '<div class="fn2-ac"><button data-fd="pres"><span>Acordo</span><b>' + (AC_NM[f.ac] || 'Normal').toLowerCase() + '</b></button><div><span>' + (pt && patImg(pt.name, 'fn2-lg', 1) || 'Patrocínio') + '</span><b>' + (pt ? c.brl(pt.fix) : 'a escolher') + '</b></div></div>' +
        '<span class="rs-gap"></span><div class="fn2-bt">' + (U.COINS ? '<button class="tm-b fn2-apo" data-fd="apo" id="fn2-apo">' + U.COINS.svg + 'Aporte</button>' : '') + '<button class="tm-go" data-fd="banco" id="fn2-bank">Banco</button></div></div></div>', st => {
      st.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { sfx('tap'); financas(b.dataset.ft); });
      st.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.fd; if (k === 'banco') banco(); else if (k === 'pres') presInfo(); else if (k === 'apo') loja(1, () => financas(tab)); });
      st.querySelector('#ldf-back').onclick = () => { sfx('tap'); const bk = FIN_BACK; FIN_BACK = null; (bk || clube)(); };
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
    pop(popHead(esc(P.n), 'Presidente · ' + P.nome) + '<div class="ld-pb pi-pb">' + presFace(P, 'pi-fc') + '<div><p class="ldn-p">' + esc(P.txt) + '</p><p class="ldn-p">O caixa no vermelho pesa <b>' + RED_TXT(P.red) + '</b> na confiança dele. A cada 3 temporadas tem eleição e ele pode sair.</p></div></div>', 'Presidente', null, 'w560');
  }
  // Reunião de pré-temporada: 3 acordos de verba × meta. welcome: primeira conversa no clube novo (depois dela a carreira
  // cai na Semana, não mais na escalação: Silvio 2026-11-09)
  // Reunião e patrocínio enxutos (2026-11-08, Silvio: sem trilho nem coluna, mas "um pouquinho mais de informação pra
  // análise"): o presidente numa frase, 3 cartões com nome, valor grande e 3 linhas de números; as regras no botão ?
  const acdRow = (k, v) => '<span class="acd-r"><small>' + k + '</small><b>' + v + '</b></span>';
  const acdHelp = (t, lines) => pop('<div class="acd-help"><b>' + t + '</b>' + lines.map(l => '<p>' + l + '</p>').join('') + '<button class="hl-btn line" data-pop-x>Entendi</button></div>', t, null, 'hl-pop acd-pop');
  const acdShow = (top, cards, cta, bind, pt) => show('<div class="acd' + (pt ? ' acd-pt' : '') + '"><div class="acd-top">' + top + '<button class="acd-q" id="acd-q" aria-label="Como funciona">?</button></div>' +
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
        st.querySelector('#ldn-go').onclick = () => { sfx('tap'); S.coFinAcordo(co, o.k); c.save('hub'); if (f.pend && f.pend.pat) patrocinio(null, welcome); else { f.pend = null; c.save('hub'); semana(); } };
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
        st.querySelector('#ldn-go').onclick = () => { sfx('tap'); S.coFinPatrocinio(co, o.k); f.pend = null; c.save('hub'); semana(); };
      }, true);
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
      : steps.length ? '<div class="bk2-top"><button class="pl2-ar" data-ai="-1" aria-label="Menos"' + (i > 0 ? '' : ' disabled') + '>' + MK_L + '</button><span><small>EMPRÉSTIMO</small><b>' + c.brl(amt) + '</b></span><button class="pl2-ar" data-ai="1" aria-label="Mais"' + (i < steps.length - 1 ? '' : ' disabled') + '>' + MK_R + '</button></div>' +
        '<div class="bk2-li">' + li('Juros', '2% ao mês') + li('12 parcelas de', c.brl(parc)) + li('Total a pagar', c.brl(parc * 12), 'dn') + '</div>'
      : '<p class="fn2-none">O banco não empresta agora.</p>';
    const side = L ? '<div class="fn2-st"><small class="cx-l">' + CX_IC + 'CAIXA</small><b class="' + (f.caixa < 0 ? 's3' : '') + '">' + c.brl(f.caixa) + '</b><em>' + (f.caixa >= L.rem ? 'dá para quitar hoje' : 'parcela a cada 4 rodadas') + '</em></div><span class="rs-gap"></span>' +
        (f.caixa >= L.rem ? '<button class="tm-b" id="ldn-back">Agora não</button><button class="tm-go" id="ldn-pay">Quitar ' + c.brl(L.rem) + '</button>' : '<button class="tm-go" id="ldn-back">Voltar</button>')
      : '<div class="fn2-st"><small>VOCÊ DEVE</small><b>nada</b><em>' + (max ? 'pode pegar até ' + c.brl(max) : 'sem crédito agora') + '</em></div><span class="rs-gap"></span><button class="tm-b" id="ldn-back">Agora não</button>' +
        (amt ? '<button class="tm-go" id="ldn-take">Pegar ' + c.brl(amt) + '</button>' : '');
    show('<div class="bk2"><div class="tm-h"><button class="tcr-back" id="ldn-bk" aria-label="Voltar">' + BK + '</button><img class="bk2-lg" src="' + CO_ART + 'banco-esc.webp" alt="Banco Alicerce"><small>caixa ' + c.brl(f.caixa) + (f.neg ? ' · ' + U.D.plural(f.neg, 'rodada', 'rodadas') + ' no vermelho' : '') + '</small><button class="ol2-q" id="bk2-q" aria-label="Como funciona">?</button></div>' +
      '<div class="bk2-box">' + left + '</div><div class="fn2-side">' + side + '</div></div>', st => {
      st.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => { sfx('tap'); banco(steps[Math.max(0, Math.min(steps.length - 1, i + +b.dataset.ai))]); });
      const tk = st.querySelector('#ldn-take'); if (tk) tk.onclick = () => { if (S.coLoanTake(co, amt)) { sfx('tap'); c.save('hub'); banco(); } };
      const py = st.querySelector('#ldn-pay'); if (py) py.onclick = () => { if (S.coLoanPay(co)) { sfx('tap'); c.save('hub'); banco(); } };
      st.querySelectorAll('#ldn-bk, #ldn-back').forEach(b => b.onclick = () => { sfx('tap'); financas(); });
      st.querySelector('#bk2-q').onclick = () => { sfx('tap'); pop('<div class="acd-help"><b>Se o caixa ficar no vermelho</b><ol class="bk2-ol">' + ST.map((t, k) => '<li' + (k + 1 === step ? ' class="on"' : '') + '>' + t + (k + 1 === step ? ' · <b>agora</b>' : '') + '</li>').join('') + '</ol><p>Parcela a cada 4 rodadas. Quitar antes não tem multa. Também dá para vender alguém no Mercado.</p><button class="hl-btn line" data-pop-x>Entendi</button></div>', 'Como funciona', null, 'hl-pop acd-pop tm-pop'); };
    });
  }
  // Aviso do que aconteceu no caixa (venda forçada, eleição) na volta para a semana
  function finNews(co) {
    const f = co.fin; if (!f || !f.news || !f.news.length) return;
    const x = f.news[0]; if (x.seen) return;
    // Mesmo desenho da conversa (2026-11-10): o rosto do presidente, o aviso no balão creme e o Entendi
    const P = S.coPres(co);
    setTimeout(() => { if (document.getElementById('ld-pop')) return; x.seen = true; C().save(); pop('<div class="cvj-h">' + presFace(P, 'cvj-fc') + '<span class="cvj-n"><b>Aviso da diretoria</b><small>' + esc(P.n) + ' · presidente ' + P.nome + '</small></span></div>' +
      '<div class="cvj-say"><p>' + esc(x.t) + '</p></div><button class="ld-gold cvj-ok" id="ldn-ok"><b>Entendi</b></button>', 'Aviso da diretoria', w => { w.querySelector('#ldn-ok').onclick = () => { sfx('tap'); closePop(); }; }, 'cvj-pop cvj-av'); }, 60);
  }

  // Contratos no fim (Silvio 2026-11-09, opção B): faltando 5 rodadas, uma janelinha por temporada com os titulares no
  // último ano (sem renovar, saem). Até 3 linhas, do mais forte ao mais fraco; quem vai aposentar de qualquer jeito
  // (36 anos ou mais) e quem já renovou não entram. Ver elenco abre o Elenco no primeiro da lista.
  const CT_TAB = { GOL: 0, ZAG: 1, LAT: 1, MEI: 2, ATA: 3 };
  function ctWarn(co) {
    if (!co.ss || co.ss.rounds.length - co.ss.i > 5 || co.ctw === co.season) return false;
    const L = co.squad.filter(p => (co.xi || []).includes(p.id) && p.ct <= 1 && p.age < 36).sort((a, b) => b.ovr - a.ovr);
    if (!L.length) return false;
    setTimeout(() => { if (document.getElementById('ld-pop')) return; co.ctw = co.season; C().save(); if (S.coNums) S.coNums(co.squad);
      const left = co.ss.rounds.length - co.ss.i, more = L.length > 3 ? L.length - 2 : 0, R = more ? L.slice(0, 2) : L;
      pop('<div class="mkx"><div class="mkx-h"><i class="mkx-fc">' + L.length + '</i><span><small>' + (left === 1 ? 'ÚLTIMA RODADA' : 'FALTAM ' + left + ' RODADAS') + '</small><b class="dn">' + (L.length > 1 ? 'Contratos no fim' : 'Contrato no fim') + '</b></span></div>' +
        '<p>' + (L.length > 1 ? 'Sem renovar, eles saem no fim do ano.' : 'Sem renovar, ele sai no fim do ano.') + '</p>' +
        '<div class="mkx-li">' + R.map(p => '<div><span>' + (p.num ? p.num + ' ' : '') + esc(p.n) + ' · ' + p.pos + '</span><b>' + p.ovr + '</b></div>').join('') + (more ? '<div><span>e mais ' + more + ' titulares</span></div>' : '') + '</div>' +
        '<span class="rs-gap"></span><span class="mkx-b"><button class="hl-btn gold" id="ctw-go">Ver elenco</button><button class="hl-btn line" id="ctw-no">Depois</button></span></div>', 'Contratos no fim', w => {
        w.querySelector('#ctw-go').onclick = () => { sfx('tap'); closePop(); elenco(CT_TAB[L[0].pos] || 0, L[0].id); };
        w.querySelector('#ctw-no').onclick = () => { sfx('tap'); closePop(); };
      }, 'hl-pop mkx-pop', true); }, 80);
    return true;
  }

  // Elenco e contratos: o elenco inteiro numa tabela (os seus números aparecem: é o seu time)
  // Elenco enxuto (Silvio 2026-11-09, quadro 27): sem trilho; abas por setor; linha com número, nome, posição, idade,
  // geral e contrato (laranja no último ano), a tabela rola por dentro; o cartão à direita com energia, potencial, moral,
  // salário e o contrato com Renovar (a renovação chega com o mercado: `#lde-ren` com data-id fica apagado até lá)
  elenco.ct = 0; // aba da ficha: 0 Atributos, 1 Situação (fica na que o técnico deixou enquanto olha o elenco)
  // Ordem do elenco (Silvio 2026-11-10: "ordenar por over, valor, etc"): ◀ ▶ no topo, à direita; fica em `co.eo`. Cada ordem
  // tem [nome, chave (menor primeiro), coluna que acende, e, se o dado não tem coluna, o título e o texto que entram no
  // lugar do contrato]; o desempate é sempre o geral
  const EL_ORD = [
    ['Geral', p => -p.ovr, 'o'],
    ['Potencial', p => -(p.pot || p.ovr), 'ct', 'POTENCIAL', p => p.pot || p.ovr],
    ['Valor', p => -S.coValue(p), 'ct', 'VALOR', (p, c) => c.brl(S.coValue(p))],
    ['Salário', p => -(p.wage || 0), 'ct', 'SALÁRIO', (p, c) => c.mi(p.wage || 0)],
    ['Idade', p => p.age, 'a'],
    ['Contrato', p => p.ct, 'ct']
  ];
  // back: de onde veio (proposta recebida, Time); sem nada, volta ao Clube. As chamadas de dentro (aba, linha, ordem) mantêm
  let EL_BACK = null;
  function elenco(tab, sel, back) {
    if (back) EL_BACK = back; else if (tab === undefined && sel === undefined) EL_BACK = null;
    const c = C(), co = c.co, T = [['Goleiros', ['GOL']], ['Defesa', ['ZAG', 'LAT']], ['Meio', ['MEI']], ['Ataque', ['ATA']]];
    tab = tab || 0; if (S.coNums) S.coNums(co.squad); // os mesmos números do campinho
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const eo = Math.min(co.eo || 0, EL_ORD.length - 1), O = EL_ORD[eo], MKL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4L6 12l11 8z"/></svg>', MKR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z"/></svg>';
    const L = co.squad.filter(p => T[tab][1].includes(p.pos)).sort((a, b) => O[1](a) - O[1](b) || b.ovr - a.ovr);
    const q = L.find(p => p.id === sel) || L[0];
    const folha = co.squad.reduce((a, p) => a + (p.wage || 0), 0);
    const ctT = n => n <= 0 ? 'acaba agora' : n === 1 ? 'fim do ano' : U.D.plural(n, 'ano', 'anos');
    const tag = p => p.out ? ['dn', 'lesionado'] : p.sus ? ['dn', 'suspenso'] : c.pend(p) ? ['y', 'pendurado'] : S.coMktListed(co, p) ? ['g', 'à venda'] : p.prom ? ['y', 'promessa'] : null; // promessa = a chance prometida na conversa ainda vale
    const rows = L.map(p => { const t = tag(p);
      return '<button class="lde2-r' + (q && p.id === q.id ? ' on' : '') + (c.avail(p) ? '' : ' out') + '" data-id="' + p.id + '"><i>' + (p.num || '') + '</i><span><b>' + esc(p.n) + '</b><small>' + p.pos + '</small>' + (t ? '<em class="' + t[0] + '">' + t[1] + '</em>' : '') + '</span>' +
        '<span class="a">' + p.age + '</span><span class="o">' + p.ovr + '</span>' + (O[4] ? '<span class="ct x">' + O[4](p, c) + '</span>' : '<span class="ct' + (p.ct <= 1 ? ' dn' : '') + '">' + ctT(p.ct) + '</span>') + '</button>'; }).join('');
    let card = '';
    if (q) {
      const mo = q.mo === undefined ? 60 : q.mo, moT = mo >= 70 ? 'alta' : mo >= 45 ? 'boa' : 'baixa';
      const st = (k, v, bad) => '<span><small>' + k + '</small><b' + (bad ? ' class="dn"' : '') + '>' + v + '</b></span>';
      const renOk = S.coMktRenOk(co, q), listed = S.coMktListed(co, q), canS = S.coMktCanSell(co, q), ofq = S.coMktOfferFor(co, q), win = S.coMktWin(co);
      const hint = ofq ? 'O ' + esc(club(ofq.club).short || club(ofq.club).name) + ' fez proposta' : listed ? (win.open ? 'À venda: as propostas chegam na janela' : 'À venda: propostas na próxima janela') : q.ct <= 1 ? 'Último ano: se não renovar, ele sai' : !canS ? 'Elenco curto nessa posição para vender' : '';
      // A ficha tem duas abas (Silvio 2026-11-10, opção A): Atributos (as 6 barras de S.coAttrs: o mais alto em dourado, o
      // mais baixo em laranja) e Situação (energia, potencial, moral, salário, contrato, renovar e vender, como era a ficha)
      const at = S.coAttrs(q), ks = S.coAtKeys(q), hi = at.indexOf(Math.max.apply(null, at)), mn = Math.min.apply(null, at), lo = mn <= q.ovr - 8 ? at.indexOf(mn) : -1; // laranja só para ponto fraco de verdade (8 abaixo do geral)
      const seg = '<div class="lde2-seg">' + ['Atributos', 'Situação'].map((t, i) => '<button data-ec="' + i + '"' + (i === elenco.ct ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + t + '</button>').join('') + '</div>';
      const grw = co.train && co.ss && co.train.i === co.ss.i && co.train.dv ? co.train.dv.filter(x => x[0] === q.id).map(x => x[1]) : []; // subiu no treino desta semana: verde
      const bars = '<div class="lde2-at">' + at.map((v, i) => '<div class="lde2-ar' + (grw.includes(i) ? ' gr' : i === hi ? ' top' : i === lo ? ' low' : '') + '"><span>' + S.CO_AT.names[ks[i]] + '</span><i><u style="width:' + v + '%"></u></i><b>' + v + '</b></div>').join('') + '</div>';
      card = '<div class="lde2-c' + (elenco.ct ? ' sit' + (hint ? ' hn' : '') : '') + '"><div class="lde2-ch"><b class="tm-ring ' + enRing(q.en) + '" style="--en:' + Math.round(q.en) + '">' + q.ovr + '</b><span><b>' + (q.num ? q.num + ' ' : '') + esc(c.last(q.n)) + '</b><small>' + c.posTxt[q.pos] + ' · ' + q.age + ' anos</small></span></div>' + seg +
        (elenco.ct ? '<div class="lde2-st">' + st('ENERGIA', Math.round(q.en) + '%', q.en < 55) + st('POTENCIAL', q.pot) + st('MORAL', moT, moT === 'baixa') + st('SALÁRIO', c.mi(q.wage) + '/sem') + '</div>' +
        '<div class="lde2-ct"><span><small>CONTRATO</small><b' + (q.ct <= 1 ? ' class="dn"' : '') + '>' + ctT(q.ct) + '</b></span></div>' +
        '<div class="lde2-act"><button class="lde2-ren" id="lde-ren" data-id="' + q.id + '"' + (renOk ? '' : ' disabled') + '>Renovar' + (renOk ? '' : '<small>no fim do contrato</small>') + '</button>' +
          (ofq ? '<button class="lde2-sell of" id="lde-of">Ver proposta</button>' : '<button class="lde2-sell' + (listed ? ' on' : '') + '" id="lde-sell"' + (canS || listed ? '' : ' disabled') + '>' + (listed ? 'Tirar da venda' : 'Pôr à venda') + '</button>') + '</div>' +
        (hint ? '<small class="lde2-hint">' + hint + '</small>' : '') : bars) + '</div>';
    }
    show('<div class="lde2"><div class="tm-h"><button class="tcr-back" id="lde-back" aria-label="Voltar">' + BK + '</button><b>Elenco</b><small><span class="lde2-n' + (co.squad.length >= S.CO_MKT.maxSquad ? ' full' : '') + '">' + co.squad.length + '/' + S.CO_MKT.maxSquad + '</span> jogadores · folha ' + c.mi(folha) + '/sem</small>' +
      '<span class="lde2-ord"><button class="mk-ar" data-eo="-1" aria-label="ordem anterior">' + MKL + '</button><span><small>ORDEM</small><b>' + O[0] + '</b></span><button class="mk-ar" data-eo="1" aria-label="ordem seguinte">' + MKR + '</button></span></div>' +
      '<div class="lde2-tabs">' + T.map(([l, ps], i) => '<button data-et="' + i + '"' + (i === tab ? ' class="on"' : '') + '>' + l + ' <small>' + co.squad.filter(p => ps.includes(p.pos)).length + '</small></button>').join('') + '</div>' +
      '<div class="lde2-l"><div class="lde2-h"><i></i><span>JOGADOR</span><span class="a' + (O[2] === 'a' ? ' on' : '') + '">IDADE</span><span class="o' + (O[2] === 'o' ? ' on' : '') + '">GERAL</span><span class="ct' + (O[2] === 'ct' ? ' on' : '') + '">' + (O[3] || 'CONTRATO') + '</span></div>' + rows + '</div>' + card + '</div>', st => {
      st.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { sfx('tap'); elenco(+b.dataset.et); });
      st.querySelectorAll('.lde2-r').forEach(b => b.onclick = () => { sfx('tap'); const y = st.querySelector('.lde2-l').scrollTop; elenco(tab, b.dataset.id); const l = document.querySelector('.lde2-l'); if (l) l.scrollTop = y; });
      st.querySelector('#lde-back').onclick = () => { sfx('tap'); const b = EL_BACK; EL_BACK = null; if (b) b(); else clube(); };
      st.querySelectorAll('[data-eo]').forEach(b => b.onclick = () => { sfx('tap'); co.eo = (eo + (+b.dataset.eo) + EL_ORD.length) % EL_ORD.length; c.save(); elenco(tab); }); // volta ao primeiro da ordem nova (o escolhido podia sumir da vista)
      const me = () => elenco(tab, q && q.id);
      st.querySelectorAll('[data-ec]').forEach(b => b.onclick = () => { sfx('tap'); elenco.ct = +b.dataset.ec; const y = st.querySelector('.lde2-l').scrollTop; me(); const l = document.querySelector('.lde2-l'); if (l) l.scrollTop = y; });
      const rn = st.querySelector('#lde-ren:not([disabled])'); if (rn) rn.onclick = () => { sfx('tap'); contrato(q.id, me); };
      const sl = st.querySelector('#lde-sell:not([disabled])'); if (sl) sl.onclick = () => { sfx('tap'); const of = S.coMktList(co, q, !S.coMktListed(co, q)); c.save(); me(); if (of) { of.seen = 1; c.save(); recebida(of, me); } };
      const ov = st.querySelector('#lde-of'); if (ov) ov.onclick = () => { sfx('tap'); recebida(S.coMktOfferFor(co, q), me); };
    });
  }
  // Troféus e Hall (2026-11-11): telas cheias no padrão do Estádio (painel à esquerda, números à direita), no lugar das janelinhas
  const TF_BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const taca = (name, h) => window.CRAQUE_TROPHY ? window.CRAQUE_TROPHY('league', h, name) : '';
  function trofeus(pg) {
    const c = C(), co = c.co, cl = club(co.club), ss = co.ss, T = co.titles.slice().reverse(), n = T.length, PER = 4;
    const pages = Math.max(1, Math.ceil(n / PER)); pg = Math.max(0, Math.min(pages - 1, pg || 0));
    const ups = co.hist.filter(h => h.up).length, pos = ss ? S.coPos(co) : 0, left = ss ? ss.rounds.length - ss.i : 0;
    const clubs = T.reduce((a, t) => (a.indexOf(t.club) < 0 ? a.concat(t.club) : a), []).length;
    const shelf = n ? '<div class="tf2-sh">' + T.slice(pg * PER, pg * PER + PER).map(t => '<div class="tf2-c">' + taca(t.name, 104) + '<b>' + esc(t.name) + '</b><small>' + crest(t.club, 'tf2-cr') + '<span>' + (U.YEAR0 + t.s) + ' · ' + esc(club(t.club).short || club(t.club).name) + '</span></small></div>').join('') + '</div>' +
        (pages > 1 ? '<div class="mk-pg tf2-pg"><button class="mk-ar" data-pg="-1"' + (pg ? '' : ' disabled') + ' aria-label="Mais novos">' + MK_L + '</button><b>' + (pg + 1) + ' de ' + pages + '</b><button class="mk-ar" data-pg="1"' + (pg < pages - 1 ? '' : ' disabled') + ' aria-label="Mais antigos">' + MK_R + '</button></div>' : '')
      : '<div class="tf2-no">' + (ss ? taca(ss.name, 118) : '') + '<b>A primeira taça entra aqui</b>' + (ss ? '<small>' + esc(ss.name) + '</small>' : '') + '</div>';
    show('<div class="es tf2"><div class="tm-h"><button class="tcr-back" id="tf2-back" aria-label="Voltar">' + TF_BK + '</button>' + crest(cl.id, 'kb2-cr') + '<b>Troféus</b><small>' + esc(co.name) + '</small></div>' +
      '<div class="es-pn tf2-pn">' + shelf + '</div>' +
      '<div class="es-side">' +
        '<div class="es-k"><small>TÍTULOS</small><b' + (n ? ' class="gd"' : '') + '>' + n + '</b><em>' + (n ? 'o último em ' + (U.YEAR0 + T[0].s) + (clubs > 1 ? ' · ' + clubs + ' clubes' : '') : 'nenhum por enquanto') + '</em></div>' +
        '<div class="es-k"><small>ACESSOS</small><b>' + ups + '</b><em>' + (ups ? (ups > 1 ? 'subidas de divisão' : 'subida de divisão') : 'nenhum por enquanto') + '</em></div>' +
        (ss ? '<div class="es-k"><small>NA DISPUTA</small><b class="tf2-lg">' + esc(ss.name) + '</b><em' + (pos === 1 ? ' class="up"' : '') + '>hoje ' + pos + 'º' + (left > 0 ? (left > 1 ? ' · faltam ' + left + ' rodadas' : ' · falta 1 rodada') : '') + '</em></div>' : '') +
      '</div></div>', st => {
      st.querySelector('#tf2-back').onclick = () => { sfx('tap'); clube(); };
      st.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { sfx('tap'); trofeus(pg + (+b.dataset.pg)); });
    });
  }
  function hall() {
    const c = C(), co = c.co, cl = club(co.club), ss = co.ss, H = co.hist.slice().reverse(), f = Math.max(0, Math.min(100, Math.round(co.fame)));
    const nx = [20, 40, 60, 80].find(v => v > f), now = ss && !co.hist.some(h => h.s === co.season);
    const tag = h => h.sacked ? '<em class="dn">demitido</em>' : h.won ? '<em class="gd">campeão</em>' : h.up ? '<em class="up">subiu</em>' : h.down ? '<em class="dn">caiu</em>' : h.met ? '<em class="up">meta cumprida</em>' : '<em>meta não cumprida</em>';
    const row = (s, id, lg, pos, t, cc) => '<div class="hl2-r' + (cc || '') + '"><i>' + (U.YEAR0 + s) + '</i><span>' + crest(id, 'hl2-cr') + '<b>' + esc(club(id).short || club(id).name) + '</b><small>' + esc(lg) + '</small></span><u>' + pos + 'º</u>' + t + '</div>';
    const met = H.filter(h => h.met).length, cls = H.reduce((a, h) => (a.indexOf(h.club) < 0 ? a.concat(h.club) : a), now ? [co.club] : []).length;
    const best = H.filter(h => h.won)[0] || H.slice().sort((a, b) => a.pos - b.pos || b.s - a.s)[0];
    const leg = (S.coEstLegado ? S.coEstLegado(co) : [])[0];
    show('<div class="es hl2"><div class="tm-h"><button class="tcr-back" id="hl2-back" aria-label="Voltar">' + TF_BK + '</button>' + crest(cl.id, 'kb2-cr') + '<b>Hall do técnico</b><small>' + esc(co.name) + '</small></div>' +
      '<div class="hl2-m"><div class="hl2-fm"><span><small>FAMA</small><b>' + c.FAME_TXT(f) + '</b></span><span class="hl2-fb"><i><u style="width:' + f + '%"></u></i><small>' + (nx ? esc(c.FAME_TXT(nx)) + ' aos ' + nx : 'no topo da carreira') + '</small></span><em>' + f + '</em></div>' +
        '<div class="hl2-l"><div class="hl2-h"><span>ANO</span><span>CLUBE</span><span>POS</span><span>COMO FOI</span></div>' +
          (now ? row(co.season, co.club, ss.name, S.coPos(co), '<em class="nw">em andamento</em>', ' nw') : '') +
          H.map(h => row(h.s, h.club, h.league, h.pos, tag(h))).join('') + '</div></div>' +
      '<div class="es-side">' +
        '<div class="es-k"><small>TEMPORADAS</small><b>' + (co.season + 1) + '</b><em>' + U.D.plural(cls, 'clube', 'clubes') + '</em></div>' +
        '<div class="es-k"><small>METAS CUMPRIDAS</small>' + (H.length ? '<b>' + met + '<u> de ' + H.length + '</u></b>' : '<b>0</b>') + '<em>' + (H.length ? (H.filter(h => h.sacked).length ? U.D.plural(H.filter(h => h.sacked).length, 'demissão', 'demissões') : 'nenhuma demissão') : 'a primeira sai no fim do ano') + '</em></div>' +
        (leg ? '<div class="es-k"><small>ESTÁDIO · ' + esc((club(leg.club).short || club(leg.club).name).toUpperCase()) + '</small><b class="hl2-st">' + milK(leg.cap0).replace(' mil', '') + ' › ' + milK(leg.cap) + '</b><em>' + U.D.plural(leg.nob, 'obra sua', 'obras suas') + (leg.best ? ' · recorde ' + milK(leg.best) : '') + '</em></div>'
          : '<div class="es-k"><small>MELHOR CAMPANHA</small>' + (best ? '<b' + (best.won ? ' class="gd"' : '') + '>' + (best.won ? 'campeão' : best.pos + 'º lugar') + '</b><em>' + (U.YEAR0 + best.s) + ' · ' + esc(best.league) + '</em>' : '<b>' + S.coPos(co) + 'º lugar</b><em>hoje · ' + esc(ss ? ss.name : '') + '</em>') + '</div>') +
      '</div></div>', st => {
      st.querySelector('#hl2-back').onclick = () => { sfx('tap'); clube(); };
    });
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
    const dest = [art ? ['ARTILHEIRO', co.squad.find(p => p.n === art) || (out.left || []).find(x => x.n === art) || { n: art }, U.D.plural(g[art], 'gol', 'gols')] : null, avgs[0] ? ['MELHOR DO ANO', avgs[0][0], 'nota média ' + avgs[0][1].toFixed(1).replace('.', ',')] : null,
      rev && rev[0] !== (avgs[0] || [])[0] ? ['REVELAÇÃO', rev[0], rev[0].age + ' anos · nota ' + rev[1].toFixed(1).replace('.', ',')] : null].filter(Boolean);
    const nums = [['Pontos em ' + n + ' jogos', v * 3 + e], ['Campanha', v + 'V ' + e + 'E ' + d + 'D'], ['Gols', gp + ' a ' + gc], ['Maior vitória', big && big.gf > big.ga ? big.gf + ' x ' + big.ga + ' ' + esc((club(big.vs).short || club(big.vs).name).slice(0, 3).toUpperCase()) : '—'], ['Em casa', rec(log.filter(l => l.home))], ['Fora', rec(log.filter(l => !l.home))]];
    const exp = co.squad.filter(p => p.ct <= 0).length;
    const coinTxt = (out.coins || []).map(x => x.t.toLowerCase()).join(', ');
    const next = [out.coinsTot ? ['+' + out.coinsTot + ' moedas', coinTxt, 'coin'] : null, out.offers ? [out.sacked ? (out.offers.length > 1 ? 'Clubes ligaram' : 'Um clube ligou') : U.D.plural(out.offers.length, 'clube quer você', 'clubes querem você'), out.offers.slice(0, 2).map(id => esc(club(id).short || club(id).name)).join(' e ') + (out.offers.length > 1 ? ' mandaram proposta' : ' mandou proposta')] : null,
      !out.sacked ? [out.met ? 'Diretoria satisfeita' : 'Diretoria cobra', out.met ? 'o trabalho continua' : 'a próxima temporada começa sob pressão', out.met ? '' : 'warn'] : null].filter(Boolean);
    const fin = out.fin;
    // Tela nova (2026-11-11, o Silvio aprovou o desenho https://claude.ai/artifact/5nPoZd4FRH5oUY9z1cRVg8): à esquerda o cartão
    // creme só com o resultado (posição, meta, caixa, fama); no meio 4 abas (Números, Destaques, Elenco, Técnico, com o
    // pontinho dourado quando há ponto de habilidade para usar); à direita o que vem agora e um botão dourado só.
    // Nada abaixo de 13 px. Os ids dos botões (#ldy-of, #ldy-ns, #ldy-mk, [data-sk]) são os de antes
    const OK_SVG = y => '<svg role="img" aria-label="' + (y ? 'Cumpriu' : 'Não cumpriu') + '" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="13" fill="' + (y ? '#1F6B45' : '#A32A25') + '"/><path d="' + (y ? 'M7.5 13.5l3.6 3.6 7.4-8' : 'M8.5 8.5l9 9M17.5 8.5l-9 9') + '" fill="none" stroke="#F6F3EA" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const TRI = up => '<svg role="img" aria-label="' + (up ? 'subiu para' : 'caiu para') + '" width="14" height="13" viewBox="0 0 14 13"><path d="' + (up ? 'M7 1l6 11H1z' : 'M7 12L1 1h12z') + '" fill="' + (up ? '#1F6B45' : '#A32A25') + '"/></svg>';
    const cap = t => t.charAt(0).toUpperCase() + t.slice(1), pct = v => Math.max(0, Math.min(100, v));
    const good = !out.sacked && (out.met || out.won || out.up);
    let tab = 0;
    const draw = () => {
      const pts = co.xp.pts || 0;
      const sk = Object.keys(S.CO_SKILLS).map(k => '<div class="fdt-sk"><span><b>' + S.CO_SKILLS[k] + ' <i>nível ' + co.xp[k] + '</i></b><small>' + cap(c.SK_TXT[k]) + '.</small></span><button class="fdt-p1" data-sk="' + k + '"' + (pts > 0 && co.xp[k] < S.CO.skillMax ? '' : ' disabled') + ' aria-label="Mais um ponto em ' + S.CO_SKILLS[k] + '">+1</button></div>').join('');
      const kids = out.kids || [], left = out.left || [];
      const body = tab === 0 ? '<div class="fdt-n">' + nums.map(([k, x]) => '<span><small>' + k + '</small><b>' + x + '</b></span>').join('') + '</div>'
        : tab === 1 ? '<div class="fdt-d">' + (dest.length ? dest.map(([k, p, t]) => '<div><i>' + (p.num || p.ovr || '') + '</i><span><small>' + k + '</small><b>' + esc(p.n) + '</b></span><em>' + t + '</em></div>').join('') : '<p>Sem destaques nesta temporada.</p>') + '</div>'
        : tab === 2 ? '<div class="fdt-e"><small>SUBIRAM DA BASE</small><p>' + (kids.length ? kids.map(esc).join(', ') : 'Ninguém neste ano.') + '</p><small>SAÍRAM</small>' +
          (left.length ? left.slice(0, 4).map(x => '<div><b>' + esc(x.n) + '</b><em>' + x.why + '</em></div>').join('') + (left.length > 4 ? '<p>e mais ' + (left.length - 4) + '</p>' : '') : '<p>Ninguém saiu.</p>') + '</div>'
        : '<div class="fdt-t"><div class="fdt-th">' + (pts ? '<b>' + (pts > 1 ? pts + ' PONTOS' : '1 PONTO') + ' PARA USAR</b>' : '<span>Sem ponto para usar</span>') + '<em>experiência ' + (out.xp ? '+' + out.xp : '0') + '</em></div>' + sk + '</div>';
      show('<div class="fdt">' +
        '<div class="fdt-l"><small class="fdt-eb">TEMPORADA ' + (U.YEAR0 + out.season) + ' · ' + esc(out.league).toUpperCase() + '</small>' +
          '<div class="fdt-h">' + crest(cl.id, 'fdt-cr') + '<span><b>' + head + '</b><small class="' + (good ? 'up' : 'dn') + '">' + tag + '</small></span></div><hr>' +
          '<div class="fdt-row"><span><small>META DA DIRETORIA</small><b>' + esc(S.CO_GOAL_TXT[out.goal.k]) + '</b></span>' + OK_SVG(out.met) + '</div>' +
          (fin && fin.saldo !== undefined ? '<div class="fdt-row"><span><small>CAIXA DO ANO</small><b>' + (fin.saldo >= 0 ? 'Fechou no azul' : 'Fechou no vermelho') + '</b></span><em class="' + (fin.saldo >= 0 ? 'up' : 'dn') + '">' + (fin.saldo > 0 ? '+' : '') + c.brl(fin.saldo).replace('− ', '−') + '</em></div>' : '') +
          '<span class="ld-gr"></span><div class="fdt-fm"><div><small>FAMA</small><i>' + out.fame[0] + '</i>' + (df ? TRI(df > 0) : '') + '<b>' + out.fame[1] + '</b></div>' +
            '<span class="fdt-bar"><i class="' + (df >= 0 ? 'up' : 'dn') + '" style="width:' + pct(Math.max(out.fame[0], out.fame[1])) + '%"></i><i style="width:' + pct(Math.min(out.fame[0], out.fame[1])) + '%"></i></span><em>' + cap(c.FAME_TXT(out.fame[1])) + '</em></div></div>' +
        '<div class="fdt-m"><div class="fdt-tabs" role="tablist">' + ['Números', 'Destaques', 'Elenco', 'Técnico'].map((t, i) => '<button class="fdt-tb' + (i === tab ? ' on' : '') + '" data-ft="' + i + '" role="tab" aria-selected="' + (i === tab) + '">' + t + (i === 3 && pts && tab !== 3 ? '<i aria-hidden="true"></i>' : '') + '</button>').join('') + '</div>' +
          '<div class="fdt-p">' + body + '</div></div>' +
        '<div class="fdt-r' + (next.length > 2 ? ' n3' : '') + '"><small class="fdt-lb">O QUE VEM AGORA</small>' + next.map(([k, t, cls]) => '<div class="fdt-ch' + (cls ? ' ' + cls : '') + '">' + (cls === 'coin' && U.COINS ? U.COINS.svg : '') + '<span><b>' + k + '</b><small>' + t + '</small></span></div>').join('') + '<span class="ld-gr"></span>' +
          (out.offers ? '<button class="fdt-go" id="ldy-of"><b>Ver as propostas</b>' + (out.sacked ? '' : '<small>ou ficar no ' + esc(club(co.club).short || club(co.club).name) + '</small>') + '</button>' :
            '<button class="fdt-mk" id="ldy-mk">Ouvir outros clubes</button><button class="fdt-go" id="ldy-ns"><b>Temporada ' + (U.YEAR0 + co.season) + '</b><small>continuar no ' + esc(club(co.club).short || club(co.club).name) + '</small></button>') +
          '<button class="fdt-fim" id="ldy-fim">Encerrar carreira</button></div></div>', st => {
        st.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { sfx('tap'); tab = +b.dataset.ft; draw(); });
        st.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { if (S.coSkill(co, b.dataset.sk)) { sfx('tap'); c.save(); draw(); } });
        if (st.querySelector('#ldy-of')) st.querySelector('#ldy-of').onclick = () => { sfx('tap'); co.step = 'offers'; c.offers(out.offers); };
        if (st.querySelector('#ldy-ns')) st.querySelector('#ldy-ns').onclick = () => { sfx('tap'); delete co.mkl; S.coStart(co); c.save('hub'); semana(); };
        st.querySelector('#ldy-fim').onclick = () => { sfx('tap'); fimCarreira(); };
        if (st.querySelector('#ldy-mk')) st.querySelector('#ldy-mk').onclick = () => { sfx('tap'); const l = co.mkl && co.mkl.s === co.season ? co.mkl.l : S.coOffers(co, 3); c.save(); c.offers(l, true); };
      });
    };
    draw();
  }
  // Encerrar carreira (2026-11-11, Silvio: "quero a opção de encerrar carreira, e não só assinar com outro"): no fim de toda
  // temporada, demitido ou não. A janelinha é o resumo da carreira; confirmou, a vaga fica livre e volta para a home.
  // Os números do técnico (temporadas, vitórias, títulos) já ficaram no Perfil (prof.co) no fim de cada temporada
  function fimCarreira() {
    const c = C(), co = c.co, H = co.hist || [];
    const clubs = H.reduce((a, h) => (a.indexOf(h.club) < 0 ? a.concat(h.club) : a), []).length;
    const k = [[H.length, 'temporada', 'temporadas'], [H.filter(h => h.won).length, 'título', 'títulos'], [H.filter(h => h.up).length, 'acesso', 'acessos'], [clubs, 'clube', 'clubes']];
    pop('<div class="acd-help fim-c"><b>Encerrar a carreira de ' + esc(co.name) + '?</b>' +
      '<div class="fim-n">' + k.map(([n, a, b]) => '<span><b>' + n + '</b><small>' + (n === 1 ? a : b) + '</small></span>').join('') + '</div>' +
      '<p>Os números ficam no seu Perfil e a vaga fica livre para um técnico novo. Não dá para desfazer.</p>' +
      '<div class="fim-b"><button class="hl-btn line" data-pop-x>Voltar</button><button class="hl-btn red" id="fim-y">Encerrar carreira</button></div></div>', 'Encerrar carreira', w => {
      w.querySelector('#fim-y').onclick = () => { closePop(); c.retire(); };
    }, 'hl-pop acd-pop fim-pop');
  }
  // ---------- Propostas deitado (42): o seu clube e quem chama, lado a lado; a escolhida em dourado ----------
  function propostas(list, stay) {
    const c = C(), co = c.co;
    const ids = (stay && co.club ? [co.club] : []).concat(list.filter(id => id !== co.club)).slice(0, 3);
    let pick = ids.find(id => id !== co.club) || ids[0];
    const info = id => {
      const lg = U.league(id), g = S.coGoalFor(co, id), sq = S.coGenSquad(id, co.season, { rf: co.rf, lv: co.lv, season: co.season }), top = sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11), avg = top.reduce((a, p) => a + p.ovr, 0) / 11;
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
      show('<div class="pzo"><button class="tcr-back" id="ldo-back" aria-label="Voltar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><h2>' + (co.club ? 'Propostas' : 'Escolha seu clube') + '</h2><div class="pzo-g" style="grid-template-columns:repeat(' + ids.length + ',minmax(0,1fr))">' + ids.map(card).join('') + '</div>' +
        '<button class="pzo-go" id="ldo-go">' + (pick === co.club ? 'Ficar no ' : 'Assinar com o ') + esc(pc.short || pc.name) + '</button>' +
        (U.COINS ? '<button class="pzo-mo" id="ldo-mo">' + U.COINS.svg + '<b>Escolher com moedas</b></button>' : '') + '</div>', st => {
        st.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { sfx('tap'); pick = b.dataset.o; draw(); });
        if (st.querySelector('#ldo-mo')) st.querySelector('#ldo-mo').onclick = () => { sfx('tap'); escolher(() => propostas(list, stay)); };
        st.querySelector('#ldo-back').onclick = () => { sfx('tap'); c.offersBack(list, stay); };
        st.querySelector('#ldo-go').onclick = () => {
          sfx('tap');
          delete co.mkl;
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
  // Dinheiro do clube: aporte do investidor em semanas da folha (S.coAporte), 12 moedas cada (piso R$ 500 mil, o teto sobe junto), só com uma carreira aberta.
  const PACKS = [{ k: 'p1', n: 120, nm: 'Punhado', pr: 'R$ 4,90', h: 1 }, { k: 'p2', n: 350, nm: 'Saco', pr: 'R$ 12,90', h: 2, tag: '+10%' },
    { k: 'p3', n: 800, nm: 'Baú', pr: 'R$ 24,90', h: 3, tag: '+30%' }, { k: 'p4', n: 2000, nm: 'Cofre', pr: 'R$ 49,90', h: 4, tag: '+60%' }]; // etiqueta = moedas por real a mais que o Punhado, arredondado para baixo (10,8%, 30,8%, 63,7%)
  // Arte dos pacotes (ChatGPT, 2026-11-11): Punhado, Saco, Baú, Cofre
  const COIN_PILE = h => '<img class="lj-pi" src="' + CO_ART + 'mo-' + ['punhado', 'saco', 'bau', 'cofre'][h - 1] + '.webp" alt="">';
  let ljN = 0;
  function loja(tab, back) {
    const c = C(), co = c && c.co && c.co.club ? c.co : null;
    let pk = 1, wk = 1, payOn = false, busy = false, hp = 0;
    // Voltou do pagamento sem recarregar (app instalado, botão Voltar): o botão destrava e o saldo novo aparece
    const me = ++ljN, wake = () => { if (me !== ljN || !document.querySelector('.lj')) return; busy = false; draw(); };
    const fresh = () => { if (me !== ljN) return window.removeEventListener('climbix-pay', fresh); wake(); };
    window.addEventListener('climbix-pay', fresh);
    const logged = !!(U.cloudStatus && U.cloudStatus());
    if (U.payStatus) U.payStatus().then(r => { if (r && r.on && !payOn) { payOn = true; if (tab === 0 && document.querySelector('.lj')) draw(); } });
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', FW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    const draw = () => {
      const saldo = U.COINS.get();
      const tabs = '<span class="lj-tabs">' + ['Moedas', 'Dinheiro do clube', 'Histórico'].map((t, i) => '<button data-lj="' + i + '"' + (i === tab ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + t + '</button>').join('') + '</span>';
      let main, side;
      if (tab === 0) {
        main = '<div class="lj-pk">' + PACKS.map((p, i) => '<button class="lj-p' + (i === pk ? ' on' : '') + '" data-pk="' + i + '">' + (p.tag ? '<em>' + p.tag + '</em>' : '') + COIN_PILE(p.h) +
          '<span><b>' + p.n.toLocaleString('pt-BR') + '</b><small>' + p.nm + '</small></span><i>' + p.pr + '</i></button>').join('') + '</div>';
        side = '<div class="lj-box"><small class="ld-lbl">GANHE JOGANDO</small>' + [['Título da Série A', 60], ['Acesso', 15], ['Meta cumprida', 5], ['Metas da semana', 10]].map(([t, n]) => '<div class="lj-li"><span>' + t + '</span><b>+' + n + '</b></div>').join('') + '</div>' +
          '<small class="lj-ty">Sua compra ajuda a manter o Climbix. <a href="termos.html#reembolso" id="lj-trm">Termos e reembolso</a></small>' +
          (!payOn ? '<button class="tm-go off" id="lj-buy" disabled>Compra em breve</button>' : !logged ? '<button class="tm-go ec-in" id="lj-buy">Entrar para comprar</button>' :
            '<button class="tm-go" id="lj-buy">' + (busy ? 'Abrindo…' : 'Comprar · ' + PACKS[pk].pr) + '</button>');
      } else if (tab === 2) {
        // Histórico (2026-11-11): cada entrada e saída de moedas, 5 por página, mais nova primeiro
        const rp = Object.values(U.COINS.rp ? U.COINS.rp() : {}), rpLeft = rp.slice(), rpSum = rp.reduce((a, n) => a + n, 0);
        // compra devolvida que já estava no saldo antigo (coinRepair em items.js): a linha da devolução some e a compra entra no fim
        const log = U.COINS.log().filter(x => { const i = /^Compra na loja \((devolvida|recuperada)\)/.test(x.t || '') ? rpLeft.indexOf(x.n) : -1; if (i < 0) return true; rpLeft.splice(i, 1); return false; })
          .map(x => /\(devolvida\)/.test(x.t || '') ? Object.assign({}, x, { t: 'Compra na loja (recuperada)' }) : x);
        if (rpSum) log.push({ n: rpSum, t: 'Compra na loja', at: 0 });
        // o que não está nas linhas (antes do histórico existir, ou linhas antigas cortadas) vira uma linha no fim: a soma sempre dá o saldo
        const gap = saldo - log.reduce((a, x) => a + x.n, 0);
        if (gap) log.push({ n: gap, t: gap > 0 ? 'Saldo de antes do histórico' : 'Gastos de antes do histórico', at: 0 });
        const N = 5, pages = Math.max(1, Math.ceil(log.length / N)); hp = Math.min(hp, pages - 1);
        const dt = at => { if (!at) return 'antes'; const d = new Date(at || 0); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); };
        const rows = log.slice(hp * N, hp * N + N).map(x => '<div class="lj-h"><i>' + dt(x.at) + '</i><span>' + esc(x.t || 'Moedas') + '</span><b class="' + (x.n < 0 ? 'dn' : 'up') + '">' + (x.n > 0 ? '+' : '−') + Math.abs(x.n) + '</b></div>').join('');
        main = '<div class="lj-ap lj-hist">' + (rows || '<div class="lj-none"><b>Nada ainda</b><small>Moedas ganhas, compradas e gastas aparecem aqui.</small></div>') +
          (pages > 1 ? '<div class="lj-hp"><button id="lj-hm" aria-label="Mais novas"' + (hp ? '' : ' disabled') + '>' + BK + '</button><small>' + (hp + 1) + ' de ' + pages + '</small><button id="lj-hn" aria-label="Mais antigas"' + (hp < pages - 1 ? '' : ' disabled') + '>' + FW + '</button></div>' : '') + '</div>';
        const sum = f => log.filter(f).reduce((a, x) => a + x.n, 0), buy = sum(x => x.n > 0 && /^Compra na loja/.test(x.t || ''));
        side = '<div class="lj-box"><small class="ld-lbl">NO TOTAL</small>' + [['Ganhou jogando', U.COINS.got() - buy], ['Comprou', buy], ['Gastou', U.COINS.got() - saldo], ['Saldo', saldo]].map(([t, n]) => '<div class="lj-li"><span>' + t + '</span><b>' + Math.max(0, n) + '</b></div>').join('') + '</div>';
      } else if (!co) {
        main = '<div class="lj-ap lj-none"><b>Abra uma carreira do Treinador</b><small>O aporte entra na verba do clube que você treina.</small></div>';
        side = '<span class="rs-gap"></span>';
      } else {
        const left = S.coAporteLeft(co), used = S.coAporteUsed(co);
        wk = Math.max(1, Math.min(wk, Math.max(1, left)));
        // P = antes e depois (sem aporte sobrando, nada muda). No vermelho o aporte cobre o caixa primeiro: a tela mostra o caixa também
        const P = S.coAportePrev(co, left ? wk : 0), red = P.red, cost = wk * S.CO_APORTE.coin, v = S.coAporteValue(co, wk), ok = left > 0 && saldo >= cost;
        const cell = (t, a, cls) => '<span><small>' + t + '</small><b>' + c.brl(a[0]) + ' → ' + (cls && a[1] !== a[0] ? '<i class="' + cls + '">' + c.brl(a[1]) + '</i>' : c.brl(a[1])) + '</b></span>';
        main = '<div class="lj-ap"><div class="lj-ah">' + crest(co.club, 'lj-cr') + '<span><b>Aporte do investidor</b><small>' + esc(club(co.club).short || club(co.club).name) + ' · ' + (red ? 'cobre o caixa primeiro' : 'vai para a verba') + '</small></span><img class="lj-ai" src="' + CO_ART + 'mo-aporte.webp" alt=""></div>' +
          '<div class="lj-v"><button id="lj-m" aria-label="Menos"' + (wk <= 1 ? ' disabled' : '') + '>' + BK + '</button><span><b>+ ' + c.brl(v) + '</b><small>' + U.D.plural(wk, 'aporte', 'aportes') + ' · ' + (used + (left ? wk : 0)) + ' de ' + S.CO_APORTE.max + ' na temporada</small></span><button id="lj-p" aria-label="Mais"' + (wk >= left ? ' disabled' : '') + '>' + FW + '</button></div>' +
          '<div class="lj-two' + (red ? ' t3' : '') + '">' + (red ? cell('Caixa', P.caixa, P.caixa[1] >= 0 ? 'up' : 'dn') : '') + cell('Verba', P.verba) + cell(red ? 'Teto por semana' : 'Teto de salários por semana', P.teto) + '</div></div>';
        side = '<div class="lj-box lj-cost"><small class="ld-lbl">CUSTA</small><span>' + U.COINS.svg + '<b>' + cost + '</b></span><small>' + (saldo >= cost ? 'sobram ' + (saldo - cost) + ' moedas' : 'faltam ' + (cost - saldo) + ' moedas') + '</small></div>' +
          '<button class="tm-go' + (ok ? '' : ' off') + '" id="lj-ap"' + (ok ? '' : ' disabled') + '>' + (!left ? 'Limite da temporada' : 'Fazer aporte') + '</button>';
      }
      show('<div class="lj"><div class="tm-h"><button class="tcr-back" id="lj-back" aria-label="Voltar">' + BK + '</button><b>Loja</b></div>' + tabs + U.COINS.pill('lj-pill') +
        '<div class="lj-main">' + main + '</div><div class="lj-side">' + side + '</div></div>', st => {
        st.querySelector('#lj-back').onclick = () => { sfx('tap'); back ? back() : U.home(); };
        st.querySelectorAll('[data-lj]').forEach(b => b.onclick = () => { sfx('tap'); tab = +b.dataset.lj; draw(); });
        st.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { sfx('tap'); pk = +b.dataset.pk; draw(); });
        const trm = st.querySelector('#lj-trm');
        if (trm && U.termosLand) trm.onclick = e => { e.preventDefault(); sfx('tap'); U.termosLand('Reembolso'); };
        const buy = st.querySelector('#lj-buy');
        if (buy && payOn) buy.onclick = () => {
          sfx('tap');
          if (!logged) { if (c && c.co) c.save(); off(); return U.cloud ? U.cloud() : U.home(); }
          if (busy) return; busy = true; draw();
          if (c && c.co) c.save();
          const un = () => { if (document.visibilityState !== 'visible') return; document.removeEventListener('visibilitychange', un); window.removeEventListener('pageshow', un); wake(); };
          document.addEventListener('visibilitychange', un); window.addEventListener('pageshow', un);
          U.payCreate(PACKS[pk].k).then(r => { location.href = r.url; }, e => { busy = false; draw();
            pop('<div class="acd-help"><b>Não deu para abrir o pagamento</b><p>' + (e && e.error === 'auth' ? 'Entre de novo na sua conta e tente outra vez.' : 'Tente de novo daqui a pouco.') + '</p><button class="hl-btn dark" data-pop-x>Fechar</button></div>', 'Erro', null, 'hl-pop acd-pop tm-pop'); });
        };
        if (st.querySelector('#lj-hm')) st.querySelector('#lj-hm').onclick = () => { sfx('tap'); hp--; draw(); };
        if (st.querySelector('#lj-hn')) st.querySelector('#lj-hn').onclick = () => { sfx('tap'); hp++; draw(); };
        if (st.querySelector('#lj-m')) st.querySelector('#lj-m').onclick = () => { sfx('tap'); wk--; draw(); };
        if (st.querySelector('#lj-p')) st.querySelector('#lj-p').onclick = () => { sfx('tap'); wk++; draw(); };
        if (st.querySelector('#lj-ap')) st.querySelector('#lj-ap').onclick = () => {
          const cost = wk * S.CO_APORTE.coin; sfx('tap');
          const P = S.coAportePrev(co, wk), vb = P.verba[1] - P.verba[0], tt = '+ ' + c.brl(P.teto[1] - P.teto[0]) + ' no teto';
          coinAsk(cost, 'Fazer aporte', P.red ? '+ ' + c.brl(P.v) + ' no caixa' + (vb ? ', + ' + c.brl(vb) + ' na verba' : '') + ' e ' + tt : '+ ' + c.brl(P.v) + ' na verba e ' + tt, () => {
          if (!U.COINS.spend(cost, 'Aporte: ' + (club(co.club).short || club(co.club).name))) return;
          const v = S.coAporte(co, wk); if (!v) { U.COINS.add({ n: cost, t: 'Aporte devolvido' }); return; }
          sfx('coin'); c.save(); wk = 1; draw();
          pop('<div class="acd-help"><b>Aporte feito</b><p>+ ' + c.brl(v) + (P.red ? ' no caixa do ' : ' na verba do ') + esc(club(co.club).short || club(co.club).name) + (P.red ? (P.caixa[1] >= 0 ? '. O caixa saiu do vermelho.' : '. O caixa ainda está no vermelho.') : '.') + '</p><button class="hl-btn dark" data-pop-x>Fechar</button></div>', 'Aporte feito', null, 'hl-pop acd-pop tm-pop');
          });
        };
      });
    };
    draw();
  }
  // ---------- Escolher clube com moedas (quadro 41, Silvio aprovou 2026-11-09) ----------
  // Liga com ◀ ▶ (começa na liga do seu país; o seletor fica DENTRO do título, país em cima e liga embaixo, e ocupa só o que sobra
  // até a coluna do saldo: solto por cima, com largura fixa, ele cobria as moedas no iPhone, que perde 47 px de cada lado), escudos com o preço em 2 linhas que deslizam para o lado,
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
      show('<div class="ec"><div class="tm-h"><button class="tcr-back" id="ec-back" aria-label="Voltar">' + BK + '</button><b>Escolher clube</b>' +
        '<div class="ec-lg"><button id="ec-lp" aria-label="Liga anterior">' + BK + '</button><span><small>' + esc(lg.country) + '</small><b>' + esc(lg.name) + '</b></span><button id="ec-ln" aria-label="Próxima liga">' + FW + '</button></div></div>' + U.COINS.pill('ec-pill') +
        '<div class="ec-g">' + ids.map(cell).join('') + '</div>' +
        '<div class="ec-side"><div class="ec-sel"><div class="ec-sh">' + crest(pick, 'ec-scr') + '<b>' + esc(cl.short || cl.name) + '</b></div>' +
          '<em class="ec-m' + (hi ? ' hi' : '') + '">META · ' + esc(S.CO_GOAL_TXT[g.k]) + '</em>' +
          '<div class="ec-li"><span>Elenco</span><b>' + el + '</b></div><div class="ec-li"><span>Verba</span><b>' + c.brl(verba) + '</b></div>' +
          '<div class="ec-li"><span>' + (mine ? 'Comprado' : 'Moedas depois') + '</span><b>' + (mine ? 'no seu perfil' : ok ? saldo - price : '—') + '</b></div></div>' +
          '<button class="tm-go' + (!ok ? ' off' : !mine && !logged ? ' ec-in' : '') + '" id="ec-go">' + (mine ? 'Assinar · seu time' : !ok ? 'Faltam ' + (price - saldo) + ' moedas' : !logged ? 'Entrar para comprar' : 'Comprar · ' + price + ' moedas') + '</button></div></div>', st => {
        st.querySelector('#ec-back').onclick = () => { sfx('tap'); back(); };
        // nome de liga comprido em celular com área segura larga: a letra encolhe até caber (o corte com … é só o último recurso)
        { const nb = st.querySelector('.ec-lg b'); for (let fs = 18; fs >= 15 && nb.scrollWidth > nb.clientWidth; fs--) nb.style.fontSize = fs + 'px'; }
        st.querySelector('#ec-lp').onclick = () => { sfx('tap'); li = (li - 1 + lgs.length) % lgs.length; pick = null; draw(); };
        st.querySelector('#ec-ln').onclick = () => { sfx('tap'); li = (li + 1) % lgs.length; pick = null; draw(); };
        st.querySelectorAll('[data-ec]').forEach(b => b.onclick = () => { sfx('tap'); const sc = st.querySelector('.ec-g').scrollLeft; pick = b.dataset.ec; draw(); const g2 = document.querySelector('.ec-g'); if (g2) g2.scrollLeft = sc; });
        st.querySelector('#ec-go').onclick = () => {
          if (!ok) { sfx('tap'); return loja(0, draw); }
          // Comprar exige conta (Silvio 2026-11-09): o time fica no perfil e vai junto para outro aparelho
          if (!mine && !logged) { sfx('tap'); c.save(); off(); return U.cloud ? U.cloud() : U.home(); }
          const sign = () => { sfx('tap'); S.coBuyClub(co, pick, price); co.autoXI = true; co.offers = null; S.coStart(co); c.save('hub'); welcome(); };
          if (mine) return sign();
          sfx('tap');
          coinAsk(price, 'Comprar o ' + (cl.short || cl.name), 'fica no seu perfil', () => { if (!U.COINS.spend(price, 'Clube: ' + (cl.short || cl.name))) return; U.COINS.own(pick); sign(); });
        };
      });
    };
    draw();
  }
  // Chegada ao clube: o presidente diz a meta (um popup em cima da semana)
  function welcome() {
    const c = C(), co = c.co, cl = club(co.club), g = co.board.goal;
    // Primeira carreira, primeira temporada: o auxiliar fecha o acordo normal e o patrocínio fixo (Silvio 2026-11-09:
    // nada de proposta antes de conhecer o elenco); a reunião aparece a partir da 2ª temporada
    if (S.coFinPend && S.coFinPend(co)) { if (co.first && co.season === 0) { S.coFinAuto(co); c.save('hub'); } else return co.fin.pend.ac ? reuniao(null, true) : patrocinio(null, true); }
    semana();
    if (document.getElementById('ld-tu')) return; // com o tutorial, quem recebe é o auxiliar
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
  // O auxiliar sugere pelo atributo da cobrança (S.coTakeVal: pênalti e falta de longe = finalização, falta para cruzar
  // e escanteio = passe); capitão pela idade, geral e moral. Na linha do jogador sai o atributo ("FIN 62"); quem está no
  // banco fica com a bolinha do número apagada (`.bn`), porque "· banco" não cabia na linha; o melhor tem o atributo em dourado
  const tkAt = k => p => S.coTakeVal(p, k);
  const TK_SCORE = { pen: tkAt('pen'), fl: tkAt('fl'), fc: tkAt('fc'), ckE: tkAt('ckE'), ckD: tkAt('ckD'), cap: p => p.ovr * 0.5 + p.age * 1.2 + (p.mo || 60) * 0.1 };
  const tkTxt = (p, k) => { if (k === 'cap' || p.pos === 'GOL') return p.ovr; const a = S.coAttrs(p); return k === 'pen' || k === 'fl' ? 'FIN ' + a[0] : 'PAS ' + a[1]; };
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
        return '<div class="bt2-r"><i' + (co.xi.includes(p.id) ? '' : ' class="bn" title="No banco"') + '>' + (p.num || p.ovr) + '</i><span><b>' + esc(last(p.n)) + '</b><small' + (p === best ? ' class="best">' + (k === 'cap' ? 'MELHOR' : tkTxt(p, k)) : '>' + (k === 'cap' ? p.pos + ' · ' : '') + tkTxt(p, k)) + '</small></span>' +
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
    // Time cansado (S.coTrainTip): o auxiliar pede Recuperação antes do treino do rival
    const tir = S.coTrainTip(co);
    const aux = tir ? [tir.n > 1 ? tir.n + ' titulares chegam cansados (' + tir.who + '). Hoje vale mais recuperar do que treinar.' : 'O time está pesado do último jogo. Hoje vale mais recuperar do que treinar.', 'recup']
      : pv ? AUX[pv.them.style] || AUX.equilibrado : ['Sem jogo nesta rodada: bom para recuperar.', 'recup'];
    const enTxt = t => (t.en > 0 ? 'energia −' + t.en : 'energia +' + (-t.en));
    // Fase 4: o atributo que o treino desenvolve (S.CO_TRAIN[k].dv; goleiro dvG) e de quem (as posições do treino)
    const AK = S.CO_AT.keys, POSN = { ATA: 'atacantes', MEI: 'meias', LAT: 'laterais', ZAG: 'zagueiros' }, grow = S.CO_GROW && S.CO_GROW.rate > 0;
    const dvTag = t => (grow && t.dv !== undefined ? '<em class="at">▲ ' + S.CO_AT.short[AK.L[t.dv]] + '</em>' : '');
    const dvBox = t => { if (!grow || t.dv === undefined) return '';
      const ps = t.who.filter(x => POSN[x]).map(x => POSN[x]).join(' e '), g = t.who.includes('GOL') && t.dvG !== undefined ? S.CO_AT.names[AK.G[t.dvG]] : '';
      return '<div class="tr2-dv"><small>DESENVOLVE</small><b>▲ ' + S.CO_AT.names[AK.L[t.dv]] + '</b><span>de ' + ps + '</span>' + (g ? '<span class="g">Goleiros: ▲ ' + g + '</span>' : '') + '</div>'; };
    const draw = () => {
      const ks = Object.keys(T).filter(k => T[k].tab === tab), sel = pick && T[pick];
      const go = done ? '<button class="tm-go" id="ldtr-back">Voltar</button>' : '<button class="tm-go' + (sel ? '' : ' off') + '" id="ldtr-go">' + (sel ? 'Treinar' : 'Escolha um') + '</button>';
      show('<div class="tr2"><div class="tm-h"><button class="tcr-back" id="tr2-back" aria-label="Voltar">' + BK + '</button><b>Treino</b><small>' + (vs ? 'para o jogo contra o ' + vn : 'sem jogo nesta rodada') + '</small></div>' +
        '<div class="tr2-tabs">' + tabs.map(t => '<button data-tt="' + t + '"' + (t === tab ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        '<div class="tr2-g">' + ks.map(k => '<button class="tr2-c' + (k === pick ? ' on' : '') + (done && k !== done ? ' dis' : '') + '" data-tk="' + k + '"' + (done && k !== done ? ' disabled' : '') + '><b>' + (done === k ? '✓ ' : '') + T[k].name + '</b><span class="tr2-tg"><em class="' + (T[k].en > 0 ? 'dn' : 'up') + '">' + enTxt(T[k]) + '</em>' + dvTag(T[k]) + '</span></button>').join('') + '</div>' +
        '<div class="tr2-side"><div class="tr2-d">' + (sel ? '<b>' + sel.name + '</b><p>' + trTip(pick) + '</p>' + dvBox(sel) : '<p class="tr2-none">Toque num treino</p>') + '</div>' +
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
      // Guardar: o auxiliar lê o relatório e sugere a formação; a sugestão fica no Time, com o aviso no botão
      st.querySelector('#ldo-ok').onclick = () => { sfx('tap'); co.scout = { i: co.ss.i }; const tp = S.coTip(co, true); c.save(); semana();
        if (!tp || co.tut) return; // no tutorial a janelinha tampava o passo "Agora é jogar" (a dica fica no Time, com o aviso no botão)
        const u = S.coTipUsed(co, tp), say = u ? 'Li o relatório. Contra o ' + tp.them + ' deles, eu manteria o ' + S.coTipName(tp) + ', professor.' : 'Li o relatório. ' + S.coTipTxt(tp);
        pop('<div class="acd-help"><span class="aux-h">' + auxFace(co, 'aux-fc') + '<b>Auxiliar</b></span><p>“' + say.replace(/\d(-\d)+/g, f => '<span class="tm-nw">' + f + '</span>') + '”</p>' +
          '<span class="hl-ab"><button class="hl-btn dark" id="ol2-tm">Ver no Time</button><button class="hl-btn line" data-pop-x>Depois</button></span></div>', 'Auxiliar', w => {
          w.querySelector('#ol2-tm').onclick = () => { sfx('tap'); closePop(); time(); };
        }, 'hl-pop acd-pop tm-pop'); };
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
        '<div class="pl2-box"><div class="pl2-top"><button class="pl2-ar" data-pa="-1" aria-label="Mais calmo"' + (i ? '' : ' disabled') + '>' + MK_L + '</button>' +
          '<span><small>' + WHO[pick] + '</small><b>' + pr.name + '</b></span><button class="pl2-ar" data-pa="1" aria-label="Mais forte"' + (i < 2 ? '' : ' disabled') + '>' + MK_R + '</button></div>' +
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

  U.LD = { on, show, off, fit, lift, busy: () => performance.now() - swapAt < DUP, /* a tela acabou de trocar e ainda não aceita toque (ferramentas esperam) */ estadio, ingresso, ampliar, melhorias, loja, escolher, semana, time, rail, head, pill, lbl, gold, pop, closePop, popHead, dot, spotsL, PITCH, cadHtml, tacPicker, liveHtml, livePaint, liveStop, result, segunda, caderno, tabela, clube, depMedico, financas, elenco, FIN_TABS, reuniao, patrocinio, banco, temporada, propostas, welcome, funcoes, batedores, treino, olheiro, prelecao, mercado, mercadoRes, noticias, recebidas, ficha, proposta, contrato, recebida };
  U.ldOff = () => { if (document.body.classList.contains('ld-on')) off(); };
})();
