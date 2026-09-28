// Minigame do jogo decisivo: pênalti ou falta em dois toques (direção, depois altura).
// Coordenadas do gol: x de -1 a 1 entre as traves, y de 0 (chão) a 1 (travessão).
// Tudo o que ajuda ou atrapalha vem da carta e aparece na tela (velocidade e tremedeira da mira).
(function (root) {
  const S = () => root.CRAQUE_SIM;
  const GX = 180, GW = 140, GY = 190, GH = 120; // centro e tamanho do gol no desenho
  const px = x => GX + x * GW;
  const py = y => GY - y * GH;
  const BALL = { x: 180, y: 292, r: 11 };
  const ease = t => 1 - Math.pow(1 - t, 3);
  // Onda triangular de -1 a 1: velocidade constante, mais justa que seno
  const tri = u => 1 - 4 * Math.abs(((u % 1) + 1) % 1 - 0.5);

  function scene(setup, side) {
    const net = [];
    for (let i = 1; i < 14; i++) net.push('<line x1="' + (px(-1) + i * 20) + '" y1="' + py(1) + '" x2="' + (px(-1) + i * 20) + '" y2="' + GY + '"/>');
    for (let j = 1; j < 6; j++) net.push('<line x1="' + px(-1) + '" y1="' + (py(1) + j * 20) + '" x2="' + px(1) + '" y2="' + (py(1) + j * 20) + '"/>');
    const crowd = [];
    for (let i = 0; i < 70; i++) crowd.push('<circle cx="' + ((i * 53) % 360) + '" cy="' + (10 + ((i * 29) % 44)) + '" r="' + (3 + (i % 3)) + '" fill="hsl(' + ((i * 47) % 360) + ',35%,' + (30 + (i % 4) * 8) + '%)"/>');
    // Barreira: jogadores cobrindo o lado da barreira até a altura dela no plano do gol
    let wall = '';
    if (setup.fk) {
      const l = Math.min(setup.wallL * side, setup.wallR * side), r = Math.max(setup.wallL * side, setup.wallR * side);
      const n = 4, w = (px(r) - px(l)) / n, top = py(setup.wall), feet = 250;
      for (let i = 0; i < n; i++) {
        const cx = px(l) + w * (i + 0.5), bw = w * 0.96, hr = Math.min(9, w * 0.32);
        // Ombro a ombro: camisa, calção, meião; a cabeça marca a altura da barreira
        wall += '<g class="k-wallman">' +
          '<rect x="' + (cx - bw / 2) + '" y="' + (top + hr * 2 - 2) + '" width="' + bw + '" height="' + (feet - 40 - top - hr * 2 + 2) + '" rx="' + (bw * 0.3) + '"/>' +
          '<rect class="k-shorts" x="' + (cx - bw / 2 + 1) + '" y="' + (feet - 42) + '" width="' + (bw - 2) + '" height="16" rx="3"/>' +
          '<rect class="k-socks" x="' + (cx - bw * 0.36) + '" y="' + (feet - 26) + '" width="' + (bw * 0.28) + '" height="26" rx="3"/>' +
          '<rect class="k-socks" x="' + (cx + bw * 0.08) + '" y="' + (feet - 26) + '" width="' + (bw * 0.28) + '" height="26" rx="3"/>' +
          '<circle class="k-head" cx="' + cx + '" cy="' + (top + hr) + '" r="' + hr + '"/></g>';
      }
    }
    return '<svg class="kick-svg" viewBox="0 0 360 320" aria-label="Cobrança">' +
      '<defs><linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B2016"/><stop offset="1" stop-color="#153A28"/></linearGradient>' +
      '<radialGradient id="k-bul"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="360" height="70" fill="url(#k-sky)"/><g id="k-crowd" class="k-crowd">' + crowd.join('') + '</g>' +
      '<rect y="62" width="360" height="258" fill="#1F6B3E"/>' +
      [0, 1, 2, 3, 4].map(i => '<rect y="' + (190 + i * 26) + '" width="360" height="13" fill="#23764A"/>').join('') +
      '<line x1="0" y1="' + GY + '" x2="360" y2="' + GY + '" stroke="#E9F2EC" stroke-width="2" opacity=".7"/>' +
      '<g class="k-net" id="k-net" stroke="#E9F2EC" stroke-width="1" opacity=".35">' + net.join('') + '</g>' +
      '<path d="M' + px(-1) + ' ' + GY + ' V' + py(1) + ' H' + px(1) + ' V' + GY + '" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>' +
      '<g id="k-keeper" class="k-keeper">' +
      '<rect class="kp-sock" x="-12" y="-16" width="9" height="16" rx="3"/><rect class="kp-sock" x="3" y="-16" width="9" height="16" rx="3"/>' +
      '<rect class="kp-shorts" x="-14" y="-30" width="28" height="16" rx="5"/>' +
      '<rect class="kp-arm" x="-35" y="-63" width="22" height="9" rx="4.5"/><rect class="kp-arm" x="13" y="-63" width="22" height="9" rx="4.5"/>' +
      '<circle class="kp-glove" cx="-37" cy="-58.5" r="6.5"/><circle class="kp-glove" cx="37" cy="-58.5" r="6.5"/>' +
      '<rect class="kp-shirt" x="-16" y="-68" width="32" height="40" rx="9"/>' +
      '<text class="kp-num" x="0" y="-41" text-anchor="middle">1</text>' +
      '<circle cx="0" cy="-78" r="10" fill="#E8B58C"/><path class="kp-hair" d="M-10 -80 a10 10 0 0 1 20 0 q-10 -4 -20 0z"/></g>' +
      wall +
      '<g id="k-bulge" opacity="0"><ellipse rx="30" ry="22" fill="url(#k-bul)"/><ellipse rx="22" ry="16" fill="none" stroke="#E9F2EC" stroke-opacity=".5" stroke-width="1.2"/><ellipse rx="12" ry="9" fill="none" stroke="#E9F2EC" stroke-opacity=".6" stroke-width="1.2"/></g>' +
      '<ellipse id="k-shadow" cx="180" cy="302" rx="15" ry="4" fill="rgba(0,0,0,.28)"/>' +
      '<g id="k-trail">' + [0.22, 0.15, 0.09, 0.05].map(o => '<circle r="9" fill="#fff" opacity="0" data-o="' + o + '"/>').join('') + '</g>' +
      '<g id="k-aim" class="k-aim" opacity="0"><line id="k-vline" x1="0" y1="' + (py(1.3) - 4) + '" x2="0" y2="' + GY + '"/><line id="k-hline" x1="' + px(-1.3) + '" y1="0" x2="' + px(1.3) + '" y2="0" opacity="0"/>' +
      '<circle id="k-dot" r="9"/></g>' +
      '<g id="k-ball"><circle r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><path d="M0 -4 l4 3 -1.5 5 h-5 l-1.5 -5z" fill="#222"/></g>' +
      '</svg>';
  }

  function setBall(g, x, y, r) { g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (r / 11) + ')'); }
  function setKeeper(g, dx, dy, rot) { g.setAttribute('transform', 'translate(' + (GX + dx) + ' ' + (GY + dy) + ') rotate(' + rot + ')'); }

  // opts: { c, moment, onDone(ok) }
  root.CRAQUE_KICK = function (el, opts) {
    const c = opts.c, m = opts.moment;
    const setup = S().kickSetup(c, m.type);
    const side = setup.fk ? (Math.random() < 0.5 ? 1 : -1) : 1; // lado da barreira
    el.innerHTML = '<div class="kick-stage">' + scene(setup, side) +
      '<div class="kick-banner" id="k-banner"></div></div><p class="kick-help" id="k-help">Toque na tela para travar a <b>direção</b></p>';
    const svg = el.querySelector('svg'), ball = svg.querySelector('#k-ball'), keeper = svg.querySelector('#k-keeper');
    const aim = svg.querySelector('#k-aim'), vline = svg.querySelector('#k-vline'), hline = svg.querySelector('#k-hline'), dot = svg.querySelector('#k-dot');
    const shadow = svg.querySelector('#k-shadow'), trail = Array.from(svg.querySelectorAll('#k-trail circle'));
    const stage = el.querySelector('.kick-stage');
    // Bola 3D por cima do desenho (se o 3D não carregar, fica a bola desenhada)
    let fly3d = null, gone = false;
    if (root.CRAQUE_BALL && root.CRAQUE_BALL.flyer) {
      root.CRAQUE_BALL.flyer(stage, 360, 320).then(f => {
        if (!f) return;
        if (gone) return f.dispose();
        fly3d = f;
        ball.style.opacity = '0';
        f.set(BALL.x, BALL.y, BALL.r, 0);
      });
    }
    function place(x, y, r, spin) {
      setBall(ball, x, y, r);
      if (fly3d) fly3d.set(x, y, r, spin || 0);
    }
    const finish = (ok, why) => { gone = true; if (fly3d) fly3d.dispose(); opts.onDone(ok, why); };
    place(BALL.x, BALL.y, BALL.r);
    setKeeper(keeper, setup.fk ? px(0.5 * side) - GX : 0, 0, 0);
    aim.setAttribute('opacity', '1');

    let phase = 'x', lockX = 0, t0 = performance.now(), raf = 0, cur = { x: 0, y: 0.5 };
    // Tremedeira: duas senoides somadas, visível na mira (nada escondido)
    const wob = t => setup.wobble * (Math.sin(t * 0.017) + Math.sin(t * 0.029 + 1)) / 2;
    function loop(now) {
      const t = now - t0;
      if (phase === 'x') {
        cur.x = 1.25 * tri(t / (setup.period * 1000) + 0.25) + wob(now);
        vline.setAttribute('x1', px(cur.x)); vline.setAttribute('x2', px(cur.x));
        dot.setAttribute('cx', px(cur.x)); dot.setAttribute('cy', py(0.5));
      } else if (phase === 'y') {
        // Altura: de 0 a 1,3 (acima de 1 vai por cima)
        cur.y = 0.65 + 0.65 * tri(t / (setup.period * 900) - 0.25) + wob(now + 500);
        cur.y = Math.max(0, cur.y);
        hline.setAttribute('y1', py(cur.y)); hline.setAttribute('y2', py(cur.y));
        dot.setAttribute('cx', px(lockX)); dot.setAttribute('cy', py(cur.y));
      }
      if (phase === 'x' || phase === 'y') raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const help = el.querySelector('#k-help');
    let armed = false;
    setTimeout(() => { armed = true; }, 250); // o toque que abriu a tela não conta
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!armed) return;
      if (phase === 'x') {
        lockX = cur.x; phase = 'y'; t0 = performance.now();
        vline.setAttribute('opacity', '.35');
        hline.setAttribute('opacity', '1');
        help.innerHTML = 'Agora toque para travar a <b>altura</b>';
      } else if (phase === 'y') {
        phase = 'shot';
        cancelAnimationFrame(raf);
        shoot(lockX, cur.y);
      }
    });

    function shoot(dx, y) {
      help.innerHTML = '&nbsp;';
      aim.setAttribute('opacity', '0');
      const x = dx * side; // no referencial da regra (barreira sempre "à esquerda")
      // Goleiro do pênalti escolhe um canto antes de ver o chute
      const kr = Math.random();
      const kSide = setup.fk ? 0 : kr < 0.4 ? -1 : kr < 0.8 ? 1 : 0;
      const res = S().kickResult(setup, x, y, kSide);
      // Para onde a bola vai no desenho
      let tx = px(dx), ty = py(Math.min(y, 1.35)), tr = 6;
      if (res.why === 'barreira') { ty = py(setup.wall) + 18; tr = 8; }
      // O desenho do goleiro segue o resultado: na defesa as luvas chegam na bola; no gol ele não alcança
      let kDx, kRot, kDy;
      const saved = res.why === 'defesa', by0 = Math.min(y, 0.9);
      if (setup.fk) {
        const k0x = 0.5 * side, d = dx - k0x;
        const move = saved ? d * 0.8 : Math.sign(d) * Math.max(0, Math.abs(d) - 0.55);
        kDx = (k0x + move) * GW;
        kRot = Math.max(-75, Math.min(75, move * 110));
        kDy = -Math.max(0, y - 0.35) * 55;
      } else if (saved && kSide) {
        kDx = (dx - kSide * 0.2) * GW; kRot = kSide * 72; kDy = -18 - by0 * 34;
      } else if (res.ok && kSide && Math.sign(dx) === kSide) {
        kDx = kSide * GW * 0.35; kRot = kSide * 60; kDy = -12 - by0 * 20;
      } else {
        kDx = kSide * GW * 0.55; kRot = kSide * 72; kDy = kSide ? -18 - by0 * 30 : -Math.min(y, 0.8) * 60;
      }
      const k0 = setup.fk ? px(0.5 * side) - GX : 0;
      const T = setup.fk ? 760 : 620, start = performance.now();
      // Trajetória em curva (Bézier): no pênalti, um arco leve; na falta, a bola abre e volta por cima da barreira
      const dir = Math.sign(tx - BALL.x) || side;
      const cx = setup.fk ? BALL.x + (tx - BALL.x) * 0.15 - dir * 55 : (BALL.x + tx) / 2;
      const cy = setup.fk ? Math.min(BALL.y, ty) - 95 : (BALL.y + ty) / 2 - 22;
      const hist = [];
      (function fly(now) {
        const u = Math.min(1, (now - start) / T), e = ease(u), q = 1 - e;
        const bx = q * q * BALL.x + 2 * q * e * cx + e * e * tx;
        const by = q * q * BALL.y + 2 * q * e * cy + e * e * ty;
        const br = BALL.r + (tr - BALL.r) * e;
        place(bx, by, br, 0.45 * (1 - e) + 0.05);
        // Rastro: posições de alguns quadros atrás
        hist.unshift([bx, by, br]);
        trail.forEach((t, i) => {
          const h = hist[(i + 1) * 3];
          if (!h) return;
          t.setAttribute('cx', h[0]); t.setAttribute('cy', h[1]); t.setAttribute('r', h[2] * 0.75);
          t.setAttribute('opacity', u < 1 ? t.dataset.o : 0);
        });
        // Sombra no gramado: vai do pé até a linha do gol e some com a altura
        const gy = BALL.y + 10 + (GY + 2 - BALL.y - 10) * e, hgt = Math.max(0, gy - by);
        shadow.setAttribute('cx', bx); shadow.setAttribute('cy', gy);
        shadow.setAttribute('rx', br * 1.3 * (1 - Math.min(0.5, hgt / 300))); shadow.setAttribute('ry', br * 0.35);
        shadow.setAttribute('opacity', Math.max(0.15, 1 - hgt / 160));
        const ku = Math.min(1, Math.max(0, (now - start - 90) / (T * 0.75)));
        const ke = ease(ku);
        setKeeper(keeper, k0 + (kDx - k0) * ke, kDy * ke, kRot * ke);
        if (u < 1) return requestAnimationFrame(fly);
        trail.forEach(t => t.setAttribute('opacity', 0));
        after(res, bx, by);
      })(start);
    }

    function after(res, bx, by) {
      const banner = el.querySelector('#k-banner');
      const txt = { gol: 'GOOOL!', defesa: 'DEFENDEU!', trave: 'NA TRAVE!', fora: 'PRA FORA!', alto: 'POR CIMA!', barreira: 'NA BARREIRA!' }[res.why];
      if (res.ok) {
        svg.querySelector('#k-net').classList.add('shake');
        // Rede estufa no ponto onde a bola entrou; a bola afunda um pouco nela
        const bul = svg.querySelector('#k-bulge');
        bul.classList.add('pop');
        const s0 = performance.now();
        (function sink(now) {
          const u = Math.min(1, (now - s0) / 260);
          place(bx, by - Math.sin(u * Math.PI) * 3, 6 - 1.5 * ease(u), 0.02);
          bul.setAttribute('transform', 'translate(' + bx + ' ' + by + ') scale(' + (0.4 + 0.8 * ease(u) - 0.2 * u * u) + ')');
          if (u < 1) requestAnimationFrame(sink);
        })(s0);
        svg.querySelector('#k-crowd').classList.add('cheer');
        if (navigator.vibrate) navigator.vibrate([40, 40, 80]);
      } else {
        // Rebote: a bola sai para longe do gol
        const start = performance.now(), dx = bx < GX ? -1 : 1;
        (function out(now) {
          const u = Math.min(1, (now - start) / 450), e = ease(u);
          place(bx + dx * 60 * e, by + (res.why === 'barreira' ? 50 : res.why === 'alto' ? -30 : 40) * e, (res.why === 'barreira' ? 8 : 6) + 2 * e, 0.2 * (1 - e));
          if (u < 1) requestAnimationFrame(out);
        })(start);
      }
      banner.textContent = txt;
      banner.className = 'kick-banner show ' + (res.ok ? 'ok' : 'ko');
      setTimeout(() => finish(res.ok, res.why), res.ok ? 1700 : 1400);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
