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
    // Rede com profundidade: fundo (menor e mais alto), laterais e teto
    const BX = 0.9, BT = 80, BB = 178; // trave de trás: ±0.9 da largura, topo e base
    const net = ['<path d="M' + px(-1) + ' ' + py(1) + ' L' + px(-BX) + ' ' + BT + ' V' + BB + ' L' + px(-1) + ' ' + GY + 'Z M' + px(1) + ' ' + py(1) + ' L' + px(BX) + ' ' + BT + ' V' + BB + ' L' + px(1) + ' ' + GY + 'Z M' + px(-1) + ' ' + py(1) + ' H' + px(1) + ' L' + px(BX) + ' ' + BT + ' H' + px(-BX) + 'Z" fill="rgba(0,0,0,.18)" stroke="none"/>',
      '<rect x="' + px(-BX) + '" y="' + BT + '" width="' + (px(BX) - px(-BX)) + '" height="' + (BB - BT) + '" fill="rgba(0,0,0,.22)" stroke="none"/>'];
    for (let i = 1; i < 16; i++) { const x = px(-BX) + i * (px(BX) - px(-BX)) / 16; net.push('<line x1="' + x + '" y1="' + BT + '" x2="' + x + '" y2="' + BB + '"/>'); }
    for (let j = 1; j < 7; j++) { const y = BT + j * (BB - BT) / 7; net.push('<line x1="' + px(-BX) + '" y1="' + y + '" x2="' + px(BX) + '" y2="' + y + '"/>'); }
    for (let j = 1; j < 7; j++) {
      const f = j / 7, yF = py(1) + f * (GY - py(1)), yB = BT + f * (BB - BT);
      net.push('<line x1="' + px(-1) + '" y1="' + yF + '" x2="' + px(-BX) + '" y2="' + yB + '"/><line x1="' + px(1) + '" y1="' + yF + '" x2="' + px(BX) + '" y2="' + yB + '"/>');
    }
    for (let i = 1; i < 12; i++) { const f = i / 12; net.push('<line x1="' + (px(-1) + f * 2 * GW) + '" y1="' + py(1) + '" x2="' + (px(-BX) + f * 2 * BX * GW) + '" y2="' + BT + '"/>'); }
    // Arquibancada em 3 lances: cabeças e ombros, cores de torcida
    const crowd = [];
    [[5, 2.2, 6.5], [21, 2.8, 7.5], [38, 3.4, 9]].forEach(([y0, r, dx], row) => {
      for (let x = (row % 2) * dx / 2; x < 364; x += dx) {
        const k = Math.round(x * 7 + row * 13), hue = [0, 210, 45, 130, 280, 0, 25][k % 7], lig = 28 + (k % 5) * 7;
        const yy = y0 + ((k * 3) % 5) - 2;
        crowd.push('<g><ellipse cx="' + x + '" cy="' + (yy + r * 2.1) + '" rx="' + (r * 1.5) + '" ry="' + r + '" fill="hsl(' + hue + ',45%,' + lig + '%)"/><circle cx="' + x + '" cy="' + yy + '" r="' + r + '" fill="hsl(25,' + (30 + k % 3 * 10) + '%,' + (35 + k % 4 * 10) + '%)"/></g>');
      }
    });
    const flashes = [];
    for (let i = 0; i < 16; i++) flashes.push('<circle cx="' + ((i * 97) % 350 + 5) + '" cy="' + (5 + (i * 23) % 42) + '" r="2.2"/>');
    // Gramado com faixas em perspectiva (mais finas lá no fundo)
    const stripes = [];
    for (let k = 0; k < 12; k++) {
      const y1 = 62 + 258 * Math.pow(k / 12, 1.5), y2 = 62 + 258 * Math.pow((k + 1) / 12, 1.5);
      if (k % 2) stripes.push('<rect y="' + y1 + '" width="360" height="' + (y2 - y1) + '" fill="rgba(255,255,255,.045)"/>');
    }
    // Barreira: jogadores cobrindo o lado da barreira até a altura dela no plano do gol
    let wall = '';
    if (setup.fk) {
      const l = Math.min(setup.wallL * side, setup.wallR * side), r = Math.max(setup.wallL * side, setup.wallR * side);
      // Jogadores encorpados, ombro a ombro (um pouco sobrepostos), braços cruzados na frente.
      // A cabeça marca a altura da barreira no plano do gol.
      const n = 4, w = (px(r) - px(l)) / n, top = py(setup.wall), feet = 238;
      for (let i = 0; i < n; i++) {
        const cx = px(l) + w * (i + 0.5), bw = w * 1.22, hr = Math.min(10.5, w * 0.4);
        const sh = top + hr * 2 - 1, waist = feet - 40;
        wall += '<g class="k-wallman">' +
          // tronco: ombros largos afinando até a cintura
          '<path d="M' + (cx - bw / 2) + ' ' + (sh + 8) + ' Q' + (cx - bw / 2) + ' ' + sh + ' ' + (cx - bw / 2 + 8) + ' ' + sh + ' H' + (cx + bw / 2 - 8) + ' Q' + (cx + bw / 2) + ' ' + sh + ' ' + (cx + bw / 2) + ' ' + (sh + 8) +
          ' L' + (cx + bw * 0.42) + ' ' + waist + ' H' + (cx - bw * 0.42) + ' Z"/>' +
          // braços cruzados na frente
          '<rect class="k-arms" x="' + (cx - bw * 0.44) + '" y="' + (sh + (waist - sh) * 0.42) + '" width="' + (bw * 0.88) + '" height="' + Math.max(8, (waist - sh) * 0.16) + '" rx="5"/>' +
          '<rect class="k-shorts" x="' + (cx - bw * 0.43) + '" y="' + (waist - 2) + '" width="' + (bw * 0.86) + '" height="18" rx="4"/>' +
          '<rect class="k-socks" x="' + (cx - bw * 0.36) + '" y="' + (waist + 15) + '" width="' + (bw * 0.3) + '" height="' + (feet - waist - 15) + '" rx="3"/>' +
          '<rect class="k-socks" x="' + (cx + bw * 0.06) + '" y="' + (waist + 15) + '" width="' + (bw * 0.3) + '" height="' + (feet - waist - 15) + '" rx="3"/>' +
          '<circle class="k-head" cx="' + cx + '" cy="' + (top + hr) + '" r="' + hr + '"/>' +
          '<path class="k-hair" d="M' + (cx - hr) + ' ' + (top + hr - 1) + ' a' + hr + ' ' + hr + ' 0 0 1 ' + (hr * 2) + ' 0 q-' + hr + ' -' + (hr * 0.5) + ' -' + (hr * 2) + ' 0z"/></g>';
      }
    }
    const L = 'stroke="#EEF5F0" stroke-width="2" fill="none" opacity=".75"';
    return '<svg class="kick-svg" viewBox="0 0 360 320" aria-label="Cobrança">' +
      '<defs><linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070F0B"/><stop offset="1" stop-color="#11271C"/></linearGradient>' +
      '<linearGradient id="k-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#164D2C"/><stop offset=".45" stop-color="#1F6B3E"/><stop offset="1" stop-color="#2B8A51"/></linearGradient>' +
      '<radialGradient id="k-flood"><stop offset="0" stop-color="#FFFBE0" stop-opacity=".55"/><stop offset="1" stop-color="#FFFBE0" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="k-post" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#E4EAEE"/><stop offset="1" stop-color="#AEB8C0"/></linearGradient>' +
      '<radialGradient id="k-vig" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>' +
      '<radialGradient id="k-bul"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      // estádio
      '<rect width="360" height="64" fill="url(#k-sky)"/>' +
      '<rect y="16" width="360" height="2" fill="rgba(255,255,255,.06)"/><rect y="33" width="360" height="2" fill="rgba(255,255,255,.06)"/>' +
      '<g id="k-crowd" class="k-crowd">' + crowd.join('') + '</g>' +
      '<g id="k-flash" class="k-flash" fill="#fff">' + flashes.join('') + '</g>' +
      '<circle cx="10" cy="0" r="95" fill="url(#k-flood)"/><circle cx="350" cy="0" r="95" fill="url(#k-flood)"/>' +
      // placa de LED rolando atrás do gol
      '<rect y="50" width="360" height="12" fill="#0A0A0A"/><rect y="50" width="360" height="1" fill="rgba(255,255,255,.15)"/>' +
      '<g class="k-led"><text y="59" font-size="8.5" font-weight="800" letter-spacing="2" fill="#F2C230">' + ' CRAQUE ⚽ SEU NOME NA HISTÓRIA ⚽ CRAQUE ⚽ SEU NOME NA HISTÓRIA ⚽ CRAQUE ⚽ SEU NOME NA HISTÓRIA ⚽'.repeat(2) + '</text>' +
      '<animateTransform attributeName="transform" type="translate" from="0 0" to="-300 0" dur="9s" repeatCount="indefinite"/></g>' +
      // gramado, marcações em perspectiva
      '<rect y="62" width="360" height="258" fill="url(#k-grass)"/>' + stripes.join('') +
      '<line x1="0" y1="' + GY + '" x2="360" y2="' + GY + '" ' + L + '/>' +
      '<path d="M' + px(-1.5) + ' ' + GY + ' L' + px(-1.68) + ' 218 H' + px(1.68) + ' L' + px(1.5) + ' ' + GY + '" ' + L + '/>' +
      '<line x1="0" y1="268" x2="360" y2="268" ' + L + '/>' +
      '<path d="M112 320 Q180 296 248 320" ' + L + '/>' +
      '<ellipse cx="180" cy="297" rx="4" ry="1.6" fill="#EEF5F0" opacity=".8"/>' +
      // gol: rede com profundidade e traves com volume
      '<g class="k-net" id="k-net" stroke="#E9F2EC" stroke-width=".9" stroke-opacity=".38">' + net.join('') + '</g>' +
      '<path d="M' + px(-1) + ' ' + (GY + 1) + ' l6 2 h' + (px(1) - px(-1)) + ' l-6 -2" fill="rgba(0,0,0,.25)"/>' +
      '<rect x="' + (px(-1) - 3) + '" y="' + (py(1) - 3) + '" width="6" height="' + (GY - py(1) + 3) + '" fill="url(#k-post)"/>' +
      '<rect x="' + (px(1) - 3) + '" y="' + (py(1) - 3) + '" width="6" height="' + (GY - py(1) + 3) + '" fill="url(#k-post)"/>' +
      '<rect x="' + (px(-1) - 3) + '" y="' + (py(1) - 3) + '" width="' + (px(1) - px(-1) + 6) + '" height="6" fill="#F4F7F9"/>' +
      '<rect x="' + (px(-1) - 3) + '" y="' + (py(1) + 1) + '" width="' + (px(1) - px(-1) + 6) + '" height="2" fill="rgba(0,0,0,.18)"/>' +
      '<ellipse id="k-kshadow" cx="' + GX + '" cy="' + (GY + 3) + '" rx="18" ry="3.5" fill="rgba(0,0,0,.3)"/>' +
      '<g id="k-keeper" class="k-keeper">' +
      '<rect class="kp-sock" x="-12" y="-16" width="9" height="16" rx="3"/><rect class="kp-sock" x="3" y="-16" width="9" height="16" rx="3"/>' +
      '<rect class="kp-shorts" x="-14" y="-30" width="28" height="16" rx="5"/>' +
      // Braços abertos (esperando) e esticados acima da cabeça (no mergulho)
      '<g class="kp-rest"><rect class="kp-arm" x="-35" y="-63" width="22" height="9" rx="4.5"/><rect class="kp-arm" x="13" y="-63" width="22" height="9" rx="4.5"/>' +
      '<circle class="kp-glove" cx="-37" cy="-58.5" r="6.5"/><circle class="kp-glove" cx="37" cy="-58.5" r="6.5"/></g>' +
      '<g class="kp-up"><rect class="kp-arm" x="-15" y="-112" width="9" height="50" rx="4.5" transform="rotate(-8 -10 -64)"/><rect class="kp-arm" x="6" y="-112" width="9" height="50" rx="4.5" transform="rotate(8 10 -64)"/>' +
      '<circle class="kp-glove" cx="-17" cy="-114" r="7"/><circle class="kp-glove" cx="17" cy="-114" r="7"/></g>' +
      '<rect class="kp-shirt" x="-16" y="-68" width="32" height="40" rx="9"/>' +
      '<text class="kp-num" x="0" y="-41" text-anchor="middle">1</text>' +
      '<circle cx="0" cy="-78" r="10" fill="#E8B58C"/><path class="kp-hair" d="M-10 -80 a10 10 0 0 1 20 0 q-10 -4 -20 0z"/></g>' +
      wall +
      '<g id="k-bulge" opacity="0"><ellipse rx="30" ry="22" fill="url(#k-bul)"/><ellipse rx="22" ry="16" fill="none" stroke="#E9F2EC" stroke-opacity=".5" stroke-width="1.2"/><ellipse rx="12" ry="9" fill="none" stroke="#E9F2EC" stroke-opacity=".6" stroke-width="1.2"/></g>' +
      '<ellipse id="k-shadow" cx="180" cy="302" rx="15" ry="4" fill="rgba(0,0,0,.28)"/>' +
      '<g id="k-trail">' + [0.22, 0.15, 0.09, 0.05].map(o => '<circle r="9" fill="#fff" opacity="0" data-o="' + o + '"/>').join('') + '</g>' +
      '<rect width="360" height="320" fill="url(#k-vig)" pointer-events="none"/>' +
      '<g id="k-aim" class="k-aim" opacity="0"><line id="k-vline" x1="0" y1="' + (py(1.3) - 4) + '" x2="0" y2="' + GY + '"/><line id="k-hline" x1="' + px(-1.3) + '" y1="0" x2="' + px(1.3) + '" y2="0" opacity="0"/>' +
      '<circle id="k-dot" r="9"/></g>' +
      '<g id="k-ball"><circle r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><path d="M0 -4 l4 3 -1.5 5 h-5 l-1.5 -5z" fill="#222"/></g>' +
      '</svg>';
  }

  function setBall(g, x, y, r) { g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (r / 11) + ')'); }
  function setKeeper(g, dx, dy, rot) {
    g.setAttribute('transform', 'translate(' + (GX + dx) + ' ' + (GY + dy) + ') rotate(' + rot + ')');
    // Sombra no gramado: segue o goleiro e diminui quando ele está no ar
    const sh = g.ownerSVGElement && g.ownerSVGElement.querySelector('#k-kshadow');
    if (sh) {
      const air = Math.min(0.6, Math.max(0, -dy) / 90);
      sh.setAttribute('cx', GX + dx + Math.sin(rot * Math.PI / 180) * 30);
      sh.setAttribute('rx', 18 + Math.abs(Math.sin(rot * Math.PI / 180)) * 22 * (1 - air));
      sh.setAttribute('opacity', 1 - air);
    }
  }

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
    setKeeper(keeper, setup.fk ? px(0.4 * side) - GX : 0, 0, 0);
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

    const sfx = n => { if (root.CRAQUE_SFX) root.CRAQUE_SFX.play(n); };
    function shoot(dx, y) {
      sfx('kick');
      help.innerHTML = '&nbsp;';
      aim.setAttribute('opacity', '0');
      const x = dx * side; // no referencial da regra (barreira sempre "à esquerda")
      // Goleiro do pênalti lê o batedor: acerta o lado 45% das vezes, erra 35%, fica no meio 20%
      const kr = Math.random(), bs = Math.sign(x) || (Math.random() < 0.5 ? -1 : 1);
      const kSide = setup.fk ? 0 : kr < 0.45 ? bs : kr < 0.8 ? -bs : 0;
      if (setup.fk || kSide) keeper.classList.add('diving'); // estica os braços no pulo
      const res = S().kickResult(setup, x, y, kSide);
      // Para onde a bola vai no desenho
      let tx = px(dx), ty = py(Math.min(y, 1.35)), tr = 6;
      if (res.why === 'barreira') { ty = py(setup.wall) + 18; tr = 8; }
      // O desenho do goleiro segue o resultado. Com os braços esticados, a luva fica a ~114 px dos pés,
      // na direção do mergulho: na defesa a luva chega na bola; no gol ela para antes.
      const saved = res.why === 'defesa';
      const bxT = px(dx), byT = py(Math.min(y, 1.1));
      const gloveTo = (gx, gy, dir) => {
        const R = Math.max(35, Math.min(88, 88 - Math.max(0, Math.min(1, y)) * 45)); // bola alta: pulo mais em pé
        const ox = dir * 114 * Math.sin(R * Math.PI / 180), oy = -114 * Math.cos(R * Math.PI / 180);
        return { dx: gx - ox - GX, dy: Math.min(0, gy - oy - GY), rot: dir * R };
      };
      let K;
      if (setup.fk) {
        const k0x = px(0.4 * side), dir = Math.sign(bxT - k0x) || side;
        // Gol: a luva fica ~34 px antes da bola (e nunca além da posição inicial para o outro lado)
        K = saved ? gloveTo(bxT, byT, dir) : gloveTo(bxT - dir * 34, byT + 10, dir);
        if (!saved && Math.abs(K.dx - (k0x - GX)) > GW * 0.75) K.dx = k0x - GX + dir * GW * 0.75;
      } else if (kSide) {
        if (saved) K = gloveTo(bxT, byT, kSide);
        else if (Math.sign(dx) === kSide) K = gloveTo(bxT - kSide * 30, byT + 12, kSide); // ângulo: quase
        else K = gloveTo(px(kSide * 0.6), py(Math.min(y, 0.9)), kSide); // pulou para o outro lado
      } else {
        K = { dx: 0, dy: -Math.min(y, 0.8) * 50, rot: 0 };
      }
      const kDx = K.dx, kDy = K.dy, kRot = K.rot;
      const k0 = setup.fk ? px(0.4 * side) - GX : 0;
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
      sfx(res.ok ? 'goal' : 'miss');
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
        svg.querySelector('#k-flash').classList.add('on');
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
