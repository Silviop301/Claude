// Interface — pacotinhos: abrir (pranchas "Pacotinhos", tela 2) e troca de fichas (tela 4),
// aviso no fim da carreira e bloco da tela inicial (tela 1). O sorteio fica em ui/items.js.
(function () {
  const U = window.CRAQUE_UI;
  const { $, esc, sfx, render, bar, G } = U;
  const I = U.ITEMS, A = window.ClimbixAvatar;

  // ---------- desenho dos itens ----------
  // Cada item aparece no próprio boneco, recortado no ponto do corpo onde fica
  const VIEW = { head: '38 2 44 46', headT: '33 -1 54 56', cel: '6 0 108 108', face: '35 5 50 56', torso: '38 40 44 40', num: '40 52 40 40', feet: '36 170 48 28', legs: '36 142 48 54',
    armR: '62 48 32 32', wristL: '20 84 30 30', handR: '70 88 30 30', armL: '22 50 34 58', armRL: '64 50 34 58', legL: '30 112 46 52', legR: '44 112 46 52' };
  const LIMB_VIEW = { BD: 'armL', BE: 'armRL', PD: 'legL', PE: 'legR' }; // braço direito do jogador fica à esquerda na tela
  const VIEW_OF = { comemoracao: 'cel', cores: 'feet', cabelo: 'head', tatuagem: 'armL', numeros: 'num', num: 'num',
    arriado: 'legs', munhequeira: 'wristL', faixa: 'head', bonfim: 'wristL', listrado: 'legs', caneleira: 'legs', tiara: 'head',
    afro: 'headT', 'barba-lenhador': 'face', 'barba-trancada': 'face', samurai: 'headT', moicanoloiro: 'headT', trancalonga: 'headT', mullet: 'headT',
    manga: 'armL', cordao: 'torso', brinco: 'head', camuflada: 'feet', raio: 'feet', bicolor: 'feet', listrada: 'feet', pontilhada: 'feet', galaxia: 'feet', camoneon: 'feet', onca: 'feet', brasil: 'feet', cristal: 'feet',
    velcro: 'handR', dedos: 'handR', luvafogo: 'handR', luvaouro: 'handR', tigre: 'handR', capitao: 'armR', chamas: 'feet' };
  const KIT = ['#F7D117', '#1B8A3A'];
  const BASE = { skin: 5, hair: 'curto', hc: 0, beard: 'nenhuma', boot: 'preto', sole: 'branco', sock: 'alto', sleeve: 'curta', wrist: 'nenhuma', band: 'nenhuma', glove: 'lima' };
  const cache = {};
  function itemImg(it, num) {
    const k = it.id + ':' + (num || '');
    if (cache[k]) return cache[k];
    const look = Object.assign({ v: 2 }, BASE, it.look || {});
    if (it.cat === 'cores' && !it.look.sole) look.sole = look.boot;
    if (it.id === 'platinado') look.hair = 'black';
    if (it.look && it.look.beard || it.id === 'sobrancelha') look.skin = 2; // barba escura aparece melhor na pele clara
    if (it.id === 'faixa' || it.id === 'tiara') look.bandC = 'branco';
    const n = it.cat === 'num' ? String(it.n) : String(num || 9);
    let svg = A.photo(it.cat === 'comemoracao' ? 'celebra' : 'normal', KIT, { name: 'Diegao', pos: it.gk ? 'GOL' : 'ATA', number: n, look }, { crop: true, flat: true, num: n });
    svg = svg.replace(/viewBox="[^"]+"/, 'viewBox="' + VIEW[(it.limb && LIMB_VIEW[it.limb]) || VIEW_OF[it.id] || VIEW_OF[it.cat] || 'head'] + '"');
    return (cache[k] = A.url(svg));
  }
  // Arte do item: o pedaço do boneco onde ele fica; assinatura, o nome escrito na fonte (fonte de página não entra em <img> SVG)
  function itemArt(it) {
    const F = it.cat === 'assinatura' && (window.CRAQUE_SIGN || {})[it.look.sign];
    if (it.cat === 'acabamento') return '<img class="fin-art" src="assets/cartas/ac-' + it.look.finish + '.jpg" alt="">';
    if (F) return '<span class="sig-art" style="font-family:' + esc(F.family) + ', cursive' + (F.gold ? ';color:#F2C230' : '') + '">' + esc((G.c && G.c.name) || 'Climbix') + '</span>';
    return '<img src="' + itemImg(it) + '" alt="">';
  }
  const rarCls = rk => 'rk-' + rk;
  const selo = rk => '<span class="pk-selo ' + rarCls(rk) + '">' + I.RAR_NAME[rk] + '</span>';
  const ficha = (n, cls) => '<span class="pk-fichas' + (cls ? ' ' + cls : '') + '">' + U.emo('🎟️', 'sm') + '<b>' + n + '</b></span>';
  // Envelope de figurinha (bordas serrilhadas, lacre canelado, faixa em ouro escovado)
  const packHTML = cls => '<div class="pk-pack' + (cls ? ' ' + cls : '') + '"><div class="pk-env"><i class="pk-seal"></i><i class="pk-seal b"></i>' +
    '<span class="pk-k">PACOTINHO</span><b class="pk-logo">CLIMBIX</b><span class="pk-band">1 PEÇA</span><span class="pk-s">Série 1</span></div></div>';
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const LUZ = { comum: ['rgba(227,150,90,.6)', '#FFC896'], raro: ['rgba(220,235,255,.55)', '#F4F8FF'], epico: ['rgba(255,214,90,.75)', '#FFE68A'], lendario: ['rgba(170,120,255,.85)', '#E3C8FF'] };
  const HOLO = ['#8FE3FF', '#C79BFF', '#FF9BD5', '#FFE38F'], GOLD = ['#FFE68A', '#FFF6D0', '#F2C230'];
  const chances = () => '<div class="pk-odds">' + I.RAR.map(k => '<span><i class="' + rarCls(k) + '"></i>' + I.RAR_NAME[k] + '<b>' + I.CHANCE[k] + '%</b></span>').join('') + '</div>';
  function pityBox(p, txt) {
    const left = I.PITY - p;
    return '<div class="pk-pity"><div><span>Lendário garantido em até ' + I.PITY + '</span><b>faltam ' + left + '</b></div>' +
      '<div class="pk-bars">' + Array.from({ length: I.PITY }, (_, i) => '<i' + (i < p ? ' class="on"' : '') + '></i>').join('') + '</div>' + (txt ? '<span>' + txt + '</span>' : '') + '</div>';
  }

  // ---------- abrir o pacotinho ----------
  let fast = false; // quem pulou uma vez abre os próximos já no modo rápido (nesta sessão)
  function openPacks(onDone) {
    const inv = I.get();
    if (!inv.packs.length) return onDone && onDone();
    const total = inv.packs.length;
    let idxPack = 0;
    const w = document.createElement('div');
    w.className = 'pk-wrap';
    w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Abrir pacotinho');
    document.body.appendChild(w);
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clear = () => { timers.forEach(clearTimeout); timers.length = 0; w.getAnimations && w.getAnimations({ subtree: true }).forEach(a => a.cancel()); };
    const close = () => { clear(); w.classList.add('out'); setTimeout(() => { w.remove(); onDone && onDone(); }, 220); };
    let res = null, phase = 'idle', idx = 0, busy = false, shownFichas = inv.fichas;

    function frame() {
      w.innerHTML = '<div class="pk-dim"></div><div class="pk-rays"></div>' +
        '<div class="pk-top"><span class="pk-ctr">' + ficha(shownFichas) + '</span>' +
        (phase !== 'resumo' ? '<button class="pk-skip" id="pk-skip">Toque para pular</button>' : '') + '</div>' +
        '<div class="pk-stage" id="pk-stage"></div><div class="pk-parts">' + Array.from({ length: 12 }, () => '<i></i>').join('') + '</div>';
      const sk = $('pk-skip');
      if (sk) sk.onclick = e => { e.stopPropagation(); fast = true; toResumo(); };
    }
    function idle() {
      phase = 'idle'; frame();
      const left = I.get().packs.length;
      $('pk-stage').innerHTML = '<div class="pk-eyebrow">Pacotinho ' + (idxPack + 1) + ' de ' + total + '</div>' +
        '<div class="pk-holder">' + '<div class="pk-halo"></div>' + packHTML() + '<div class="pk-leak"></div></div>' +
        '<div class="pk-idle"><b>Toque para abrir</b><div class="pk-box">' + chances() + pityBox(I.get().pity) + '</div></div>';
      w.querySelector('.pk-pack').animate && !reduced() && w.querySelector('.pk-holder').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 2400, iterations: Infinity, easing: 'ease-in-out' });
      w.onclick = () => { if (phase === 'idle' && left) start(); };
    }
    function start() {
      res = I.open();
      if (!res) return close();
      shownFichas = I.get().fichas - res.got.reduce((s, g) => s + g.fichas, 0);
      idxPack++;
      if (fast) return toResumo();
      charge();
    }
    function charge() {
      phase = 'charge'; busy = true;
      const top = res.top, lend = top === 'lendario', red = reduced();
      const holder = w.querySelector('.pk-holder'), halo = w.querySelector('.pk-halo'), leak = w.querySelector('.pk-leak');
      halo.style.background = 'radial-gradient(closest-side, ' + LUZ[top][0] + ', rgba(0,0,0,0))';
      leak.style.background = LUZ[top][1];
      w.querySelector('.pk-idle').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      holder.getAnimations().forEach(a => a.cancel());
      sfx('paper');
      if (red) {
        halo.style.opacity = 1; leak.style.opacity = 1;
        if (lend) w.classList.add('dark');
        return later(tear, 900);
      }
      const dur = lend ? 1700 : 900, amp = top === 'comum' ? .6 : top === 'raro' ? .8 : 1.1;
      const kf = lend ? [0, -1, 1, -1.5, 1.5, -2, 2, 0, 0, 0, -2.5, 2.5, -3, 3, 0, 0, 0, -3.5, 3.5, -4, 4, 0] : [0, -1, 1, -1.5, 1.5, -2, 2, -2.5, 2.5, -3, 3, 0];
      holder.animate(kf.map((a, i) => ({ transform: 'translateY(' + (-12 * i / (kf.length - 1)).toFixed(1) + 'px) rotate(' + (a * amp).toFixed(2) + 'deg)' })), { duration: dur, easing: 'linear', fill: 'forwards' });
      halo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
      leak.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * .6, easing: 'ease-in', fill: 'forwards' });
      if (lend) { w.classList.add('dark', 'rays'); }
      U.vibe(lend ? [20, 60, 20, 60, 40] : 20);
      later(tear, dur);
    }
    function burst(x, y, dist, colors) {
      if (reduced()) return;
      const box = w.querySelector('.pk-parts');
      box.style.left = x + 'px'; box.style.top = y + 'px';
      [...box.children].forEach((p, i, all) => {
        const a = i / all.length * Math.PI * 2, r = dist * (i % 2 ? .75 : 1), cx = Math.cos(a) * r, cy = Math.sin(a) * r, c = colors[i % colors.length];
        p.style.background = c; p.style.boxShadow = '0 0 10px ' + c;
        p.animate([{ transform: 'translate(0,0) rotate(45deg) scale(.4)', opacity: 0 }, { transform: 'translate(' + cx * .35 + 'px,' + cy * .35 + 'px) rotate(45deg) scale(1.2)', opacity: 1, offset: .25 },
          { transform: 'translate(' + cx + 'px,' + (cy + 36) + 'px) rotate(45deg) scale(.7)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
      });
    }
    function tear() {
      phase = 'tear';
      const top = res.top, holder = w.querySelector('.pk-holder');
      const r = holder.getBoundingClientRect(), wr = w.getBoundingClientRect(), cx = r.left - wr.left + r.width / 2, cy = r.top - wr.top + 12;
      if (reduced()) { holder.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }); return later(() => toItem(), 240); }
      w.querySelector('.pk-seal').animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(90px,-120px) rotate(24deg)', opacity: 0 }], { duration: 350, easing: 'ease-out', fill: 'forwards' });
      const fl = document.createElement('div');
      fl.className = 'pk-flash'; fl.style.left = cx + 'px'; fl.style.top = cy + 'px';
      fl.style.background = 'radial-gradient(closest-side, #FFF8DC, ' + LUZ[top][1] + ' 40%, rgba(0,0,0,0))';
      w.appendChild(fl);
      fl.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 450, easing: 'ease-out', fill: 'forwards' });
      holder.animate([{ transform: 'translateY(-12px)', opacity: 1 }, { transform: 'translateY(40px)', opacity: 0 }], { duration: 400, delay: 150, easing: 'ease-in', fill: 'forwards' });
      if (top === 'epico' || top === 'lendario') burst(cx, cy, 120, top === 'lendario' ? HOLO : GOLD);
      sfx('kick');
      later(() => toItem(), 560);
    }
    function toItem() {
      w.classList.remove('dark', 'rays');
      idx = 0; phase = 'item'; showItem();
    }
    function showItem() {
      const g = res.got[idx], it = g.it, lend = it.rk === 'lendario', red = reduced();
      busy = true;
      frame();
      if (lend) w.classList.add('dark', 'rays'); else w.classList.remove('dark', 'rays');
      $('pk-stage').innerHTML = '<div class="pk-card ' + rarCls(it.rk) + '" id="pk-card"><div class="pk-in">' + itemArt(it) + '<i class="pk-sheen"></i></div>' +
        (g.dup ? '' : '<span class="pk-new">NOVO</span>') + '</div>' +
        '<div class="pk-info">' + (lend ? '<b class="pk-lend">LENDÁRIO</b>' : '') + '<span class="pk-rep" hidden>REPETIDO</span>' +
        '<b class="pk-name">' + esc(it.name) + '</b>' + selo(it.rk) + '<span class="pk-desc" id="pk-desc">' + (g.dup ? 'Você já tinha este.' : it.cat === 'num' ? 'Já está liberado para a camisa.' : it.cat === 'assinatura' ? 'Para assinar a carta no fim da carreira.' : it.cat === 'acabamento' ? 'Para a carta final, no fim da carreira.' : esc(it.desc)) + '</span></div>' +
        '<div class="pk-foot"><div class="pk-dots">' + res.got.map((_, i) => '<i' + (i <= idx ? ' class="on"' : '') + '></i>').join('') + '</div>' +
        '<span>' + (idx < res.got.length - 1 ? 'Toque para o próximo' : 'Toque para ver o resumo') + '</span></div>';
      const card = $('pk-card');
      const d = red ? 200 : lend ? 1000 : 650;
      later(() => {
        if (red) card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'both' });
        else card.animate([{ transform: 'perspective(900px) translateY(120px) scale(.6) rotateY(180deg)', opacity: 0 }, { transform: 'perspective(900px) translateY(0) scale(1) rotateY(0deg)', opacity: 1 }], { duration: d, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'both' });
        const st = card.querySelector('.pk-new');
        if (st) st.animate([{ transform: 'rotate(10deg) scale(1.6)', opacity: 0 }, { transform: 'rotate(10deg) scale(1)', opacity: 1 }], { duration: red ? 1 : 200, delay: red ? 200 : d + 150, easing: 'ease-out', fill: 'both' });
        sfx(lend ? 'fanfare' : it.rk === 'epico' ? 'levelup' : 'coin');
        if (lend && !red) {
          card.querySelector('.pk-sheen').animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], { duration: 900, delay: d - 250, easing: 'ease-in-out', fill: 'both' });
          later(() => { const r = card.getBoundingClientRect(), wr = w.getBoundingClientRect(); burst(r.left - wr.left + r.width / 2, r.top - wr.top + r.height / 2, 170, HOLO); }, d - 350);
          U.vibe(60);
        }
        if (g.dup) later(() => convert(g), d + 700); else later(() => { busy = false; }, d);
      }, lend && !red ? 300 : 0);
      card.style.opacity = '0';
      later(() => { card.style.opacity = ''; }, lend && !red ? 300 : 0);
    }
    // Repetido: o item encolhe, perde a cor e vira fichas que voam até o contador
    function convert(g) {
      const card = $('pk-card'), ctr = w.querySelector('.pk-ctr');
      w.querySelector('.pk-rep').hidden = false;
      $('pk-desc').textContent = 'Você já tinha. Virou ' + g.fichas + (g.fichas > 1 ? ' fichas.' : ' ficha.');
      const bump = n => { shownFichas += n; ctr.innerHTML = ficha(shownFichas); ctr.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' }); sfx('tick'); };
      if (reduced()) { bump(g.fichas); busy = false; return; }
      card.animate([{ transform: 'scale(1)', opacity: 1, filter: 'saturate(1)' }, { transform: 'scale(.3)', opacity: 0, filter: 'saturate(0)' }], { duration: 600, delay: 150, easing: 'ease-in', fill: 'forwards' });
      const wr = w.getBoundingClientRect(), cr = card.getBoundingClientRect(), kr = ctr.getBoundingClientRect();
      const sx = cr.left - wr.left + cr.width / 2 - 17, sy = cr.top - wr.top + cr.height / 2 - 17, ex = kr.left - wr.left + 6, ey = kr.top - wr.top + 4;
      const k = Math.min(g.fichas, 3);
      ctr.firstChild.classList.add('lit');
      for (let i = 0; i < k; i++) {
        const t = document.createElement('img');
        t.src = 'assets/tw/1f39f.svg'; t.className = 'pk-tk'; t.alt = '';
        w.appendChild(t);
        const mx = (sx + ex) / 2 - 70 + i * 20, my = Math.min(sy, ey) + 60 - i * 10;
        const a = t.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.5)', opacity: 0 }, { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1)', opacity: 1, offset: .15 },
          { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.1) rotate(-20deg)', opacity: 1, offset: .55 }, { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.65)', opacity: 1 }],
          { duration: 700, delay: 350 + i * 80, easing: 'ease-in', fill: 'forwards' });
        a.onfinish = () => { t.remove(); bump(i === k - 1 ? g.fichas - (k - 1) : 1); };
      }
      later(() => { busy = false; const f = ctr.firstChild; if (f) f.classList.remove('lit'); }, 350 + k * 80 + 900);
    }
    function toResumo() {
      clear();
      if (!res) { res = I.open(); if (!res) return close(); idxPack++; }
      phase = 'resumo'; busy = false; shownFichas = I.get().fichas;
      frame(); w.classList.remove('dark', 'rays');
      const left = I.get().packs.length, lend = res.got.some(g => g.it.rk === 'lendario');
      $('pk-stage').innerHTML = '<div class="pk-res"><div class="pk-eyebrow">Pacotinho ' + idxPack + ' de ' + total + '</div><b class="pk-h">Pacotinho aberto</b>' +
        '<div class="pk-grid">' + res.got.map(g => '<div class="pk-t' + (g.dup ? ' dup' : '') + '"><div class="pk-tile ' + rarCls(g.it.rk) + '"><div class="pk-in">' + itemArt(g.it) + '</div>' +
          (g.dup ? '' : '<span class="pk-new sm">NOVO</span>') + '</div><b>' + esc(g.it.name) + '</b>' + (g.dup ? '<span class="pk-plus">+' + g.fichas + (g.fichas > 1 ? ' fichas' : ' ficha') + '</span>' : '') + '</div>').join('') + '</div>' +
        pityBox(res.pity, lend ? 'Saiu um lendário, então o contador recomeça.' : 'Mais um pacote conta para a garantia.') +
        '<div class="pk-acts">' +
        (left ? '<button class="btn" id="pk-next">Abrir o próximo (' + left + ')</button>' : '') +
        '<button class="link-btn" id="pk-close">Fechar</button></div></div>';
      if (!reduced()) w.querySelectorAll('.pk-res > *').forEach((el, i) => el.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: i * 60, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'both' }));
      w.onclick = null;
      $('pk-close').onclick = close;
      if ($('pk-next')) $('pk-next').onclick = () => { res = null; idle(); };
    }
    w.addEventListener('click', () => {
      if (phase !== 'item' || busy) return;
      if (idx < res.got.length - 1) { idx++; showItem(); } else toResumo();
    });
    idle();
  }

  // Trocar fichas por um item (folha de baixo)
  function tradeSheet(id, onDone) {
    const it = I.itemOf(id), inv = I.get(), cost = I.COST[it.rk], ok = inv.fichas >= cost;
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = '<div class="tr-sheet" role="dialog" aria-modal="true"><i class="tr-grab"></i><div class="tr-head"><b>Trocar fichas</b>' + ficha(inv.fichas) + '</div>' +
      '<div class="tr-item"><span class="pk-tile ' + rarCls(it.rk) + '"><span class="pk-in">' + itemArt(it) + '</span><span class="tr-prev">PRÉVIA</span></span>' +
      '<div><b>' + esc(it.name) + '</b>' + selo(it.rk) + '<span>Ainda travado. Também sai em pacotinhos.</span></div></div>' +
      '<div class="tr-math"><div><span>Custa</span><b>' + U.emo('🎟️', 'xs') + ' ' + cost + '</b></div><div><span>Você tem</span><b>' + inv.fichas + '</b></div>' +
      '<div class="tr-after"><span>Depois da troca</span><b>' + (ok ? inv.fichas - cost : '–') + '</b></div></div>' +
      '<button class="btn' + (ok ? '' : ' tr-short') + '" id="tr-go"' + (ok ? '' : ' disabled') + '>' + (ok ? 'Trocar ' + cost + ' fichas' : 'Faltam ' + (cost - inv.fichas) + ' fichas') + '</button>' +
      '<button class="link-btn" id="tr-no">Cancelar</button>' +
      '<p class="tr-costs">' + I.RAR.map(k => I.RAR_NAME[k] + ' ' + I.COST[k]).join(' · ') + '</p></div>';
    document.body.appendChild(w);
    const close = () => w.remove();
    w.onclick = e => { if (e.target === w) close(); };
    w.querySelector('#tr-no').onclick = close;
    w.querySelector('#tr-go').onclick = () => { if (I.trade(id)) { sfx('levelup'); close(); onDone && onDone(id); } };
  }

  // ---------- avisos ----------
  // Fim de carreira (tela 2a): logo abaixo da carta, com um chip por motivo
  function finaleBox(why) {
    const n = why.reduce((s, x) => s + x.n, 0);
    if (!n) return '';
    return '<div class="pk-won"><div class="pk-won-art">' + packHTML('mini') + (n > 1 ? packHTML('mini back') : '') + '</div><div class="pk-won-txt"><b>Você ganhou ' + n + (n > 1 ? ' pacotinhos' : ' pacotinho') + '</b>' +
      '<div class="pk-chips">' + why.map(x => '<span>' + esc(x.t) + ' <em>+' + x.n + '</em></span>').join('') + '</div></div>' +
      '<button class="btn" id="b-packs">Abrir agora</button><small>Ou depois, pela tela inicial</small></div>';
  }
  // Bloco da tela inicial (tela 2b): pacotinhos para abrir
  function homeBlock() {
    const inv = I.get(), n = inv.packs.length;
    if (!n) return '';
    const row = (id, art, b, sub, btn, badge) => '<button class="hb-row" id="' + id + '"><span class="hb-art">' + art + (badge ? '<em class="hb-badge">' + badge + '</em>' : '') + '</span>' +
      '<span class="hb-t"><b>' + b + '</b><small>' + sub + '</small></span>' + btn + '</button>';
    return '<div class="hb">' +
      (n ? row('b-hb-packs', packHTML('mini'), 'Pacotinhos', n + ' para abrir', '<span class="hb-go gold">Abrir</span>', n) : '') +
      '</div>';
  }
  function bindHome() {
    if ($('b-hb-packs')) $('b-hb-packs').onclick = () => openPacks(U.home);
  }

  Object.assign(U, { openPacks, tradeSheet, itemImg, itemArt, packFinale: finaleBox, packHome: homeBlock, packHomeBind: bindHome, rarCls, raritySelo: selo });
})();
