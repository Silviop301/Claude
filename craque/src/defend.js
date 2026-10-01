// Minigames defensivos.
//  CRAQUE_SAVE  (goleiro): o batedor corre; pouco antes do chute o corpo dele "entrega" o lado (seta).
//                Toque na metade esquerda, no meio ou na direita para pular. REF deixa o sinal mais tempo
//                na tela; ELA alcança bolas mais perto do canto. Nada escondido: o sinal nunca mente.
//  CRAQUE_TACKLE (zagueiro): o atacante vem conduzindo rumo ao nosso gol; toque quando ele pisar na faixa
//                verde para dar o carrinho. DEF alarga a faixa; RIT deixa o lance mais lento.
(function (root) {
  const S = () => root.CRAQUE_SIM;
  const sfx = n => { if (root.CRAQUE_SFX) root.CRAQUE_SFX.play(n); };
  const ease = t => 1 - Math.pow(1 - t, 3);

  function banner(el, txt, ok) {
    const b = el.querySelector('.kick-banner');
    b.textContent = txt;
    b.className = 'kick-banner show ' + (ok ? 'ok' : 'ko');
  }

  // ---------- goleiro ----------
  root.CRAQUE_SAVE = function (el, opts) {
    const P = root.CRAQUE_KICK_PARTS, c = opts.c;
    const setup = S().kickSetup(c, 'save');
    el.innerHTML = '<div class="kick-stage">' + P.scene({ fk: false }, 1) + '<div class="kick-banner"></div></div>' +
      '<p class="kick-help" id="k-help">Leia o batedor e toque no lado para <b>pular</b></p>';
    const svg = el.querySelector('svg'), stage = el.querySelector('.kick-stage'), help = el.querySelector('#k-help');
    const ball = svg.querySelector('#k-ball'), keeper = svg.querySelector('#k-keeper');
    svg.querySelector('#k-aim').remove();
    let goal = null, gone = false;
    P.goal3d(svg).then(g => { if (!g) return; if (gone) return g.dispose(); goal = g; });
    const spr = P.keeperSprite(svg); // você no gol, em sprite
    spr.stand(P.GX); spr.idle();
    keeper.classList.add('mine'); // o goleiro agora é você
    const b3 = P.ball3d(stage, ball);
    b3.place(P.BALL.x, P.BALL.y, P.BALL.r);
    P.setKeeper(keeper, 0, 0, 0);
    // Batedor (de costas, em primeiro plano) e a seta do "corpo entregando o lado"
    const NS = 'http://www.w3.org/2000/svg';
    const kicker = document.createElementNS(NS, 'g');
    kicker.setAttribute('class', 'k-kicker');
    kicker.innerHTML = '<g class="kk-tell" opacity="0"><path d="M0 -58 l-12 10 h7 v10 h10 v-10 h7z" fill="#FFE27A" stroke="#2E2100" stroke-width="1.5"/></g>';
    svg.appendChild(kicker);
    // Batedor de costas (personagem do designer) com o uniforme do adversário
    const C = root.CRAQUE_CHARS, KH = 104;
    const bat = C.put('jogador-2d', Object.assign({ kit: 'atacante', view: 'costas', anim: 'chute', num: ['9', '10', '7', '11'][Math.floor(Math.random() * 4)] },
      C.faces(1)[0], C.kits(c, c.moment && c.moment.vs).opp), kicker, kicker.firstChild);
    bat.place(0, 0, KH); bat.pose(0, 'chute');
    const tell = kicker.querySelector('.kk-tell');
    const k0 = { x: 104, y: 318 }, k1 = { x: 160, y: 302 };
    kicker.setAttribute('transform', 'translate(' + k0.x + ' ' + k0.y + ')');

    // O chute: lado (-1, 0, 1) e ponto do gol; às vezes o batedor erra
    const rs = Math.random();
    const side = rs < 0.42 ? -1 : rs < 0.84 ? 1 : 0;
    const miss = Math.random() < 0.07;
    const x = miss ? side * (1.05 + Math.random() * 0.15) || 1.1 : side === 0 ? (Math.random() - 0.5) * 0.4 : side * (0.35 + Math.random() * 0.62);
    const y = 0.1 + Math.random() * 0.8;
    const runMs = 1300 + Math.random() * 500, tellAt = runMs - setup.tellMs;
    // Seta aponta para o lado do chute (↑ = meio)
    tell.setAttribute('transform', 'translate(0 ' + (30 - KH) + ') rotate(' + (side * 90) + ' 0 -48)');

    let dive = null, t0 = performance.now(), done = false, armed = false;
    setTimeout(() => { armed = true; }, 250);
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!armed || dive !== null || done) return;
      const r = stage.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;
      dive = fx < 0.38 ? -1 : fx > 0.62 ? 1 : 0;
      help.innerHTML = dive === 0 ? 'Ficou no meio!' : 'Pulou para a ' + (dive < 0 ? 'esquerda' : 'direita') + '!';
    });

    (function run(now) {
      const t = now - t0;
      const u = Math.min(1, t / runMs);
      kicker.setAttribute('transform', 'translate(' + (k0.x + (k1.x - k0.x) * u) + ' ' + (k0.y + (k1.y - k0.y) * u) + ')');
      tell.setAttribute('opacity', t >= tellAt ? 1 : 0);
      bat.pose(0.04 + 0.3 * u, 'chute');
      if (t < runMs + 170) return requestAnimationFrame(run); // pequena folga de reação depois do chute
      shoot();
    })(t0);

    function shoot() {
      done = true;
      sfx('kick');
      tell.setAttribute('opacity', 0);
      const kt0 = performance.now();
      (function swing(now) {
        if (!svg.isConnected) return;
        const q = Math.min(1, (now - kt0) / 520);
        bat.pose(0.34 + 0.5 * q, 'chute');
        if (q < 1) requestAnimationFrame(swing);
      })(kt0);
      const d = dive === null ? 0 : dive;
      const saved = miss || (d === side && (side === 0 || Math.abs(x) <= setup.diveReach));
      const why = miss ? 'fora' : saved ? 'defesa' : 'gol';
      const tx = P.px(Math.max(-1.25, Math.min(1.25, x))), ty = P.py(Math.min(y, 1.1));
      // Mergulho: na defesa a luva vai até a bola; senão, pula para o lado escolhido
      const R = 72 - Math.min(1, y) * 30, dir = d || 1;
      const kDx = d === 0 ? 0 : saved ? tx - P.GX - dir * 114 * Math.sin(R * Math.PI / 180) : d * P.GW * 0.55;
      const kDy = d === 0 ? -Math.min(y, 0.7) * 45 : Math.min(0, (saved ? ty : P.py(0.5)) - P.GY + 114 * Math.cos(R * Math.PI / 180));
      if (d !== 0) keeper.classList.add('diving');
      const T = 520, s0 = performance.now();
      // Goleiro 3D: na defesa a luva vai até a bola; senão, pula para o lado escolhido
      spr.dive(saved ? tx : P.px(d * 0.55), saved ? ty : P.py(0.5), d, T * 0.8, 0);
      (function fly(now) {
        const k = Math.min(1, (now - s0) / T), e = ease(k);
        b3.place(P.BALL.x + (tx - P.BALL.x) * e, P.BALL.y + (ty - P.BALL.y) * e - Math.sin(k * Math.PI) * 16, P.BALL.r + (8.5 - P.BALL.r) * e, 0.3 * (1 - e) + 0.05);
        const ke = ease(Math.min(1, k * 1.25));
        P.setKeeper(keeper, kDx * ke, kDy * ke, (d === 0 ? 0 : d * (saved ? R : 72)) * ke);
        if (k < 1) return requestAnimationFrame(fly);
        if (saved && !miss) { // rebote para fora
          const r0 = performance.now(), bx = tx, by = ty;
          (function out(n2) { const q = Math.min(1, (n2 - r0) / 380); b3.place(bx + (bx < P.GX ? -1 : 1) * 60 * q, by + 45 * q, 8.5 + 2 * q, 0.15); if (q < 1) requestAnimationFrame(out); })(r0);
        }
        if (!saved) { svg.querySelector('#k-net').classList.add('shake'); if (goal && !miss) goal.bulge(tx, ty); }
        if (!saved && !miss) { // gol deles: o batedor comemora
          const c0 = performance.now();
          (function party(n3) { if (!svg.isConnected) return; bat.pose(((n3 - c0) / 1100) % 1, 'comemoracao'); requestAnimationFrame(party); })(c0);
        }
        sfx(saved ? 'goal' : 'miss');
        if (saved) svg.querySelector('#k-crowd').classList.add('cheer');
        banner(el, miss ? 'PRA FORA!' : saved ? 'DEFENDEU!' : 'GOL DELES', saved);
        setTimeout(() => { gone = true; b3.dispose(); if (goal) goal.dispose(); opts.onDone(saved, why); }, 1400);
      })(s0);
    }
  };

  // ---------- zagueiro ----------
  // Cena do pênalti com o nosso gol: o atacante vem conduzindo na diagonal, de perto da câmera até a área.
  // Você (visual da criação) espera à direita e dá o carrinho no toque. Faixa verde: onde ele precisa estar no toque.
  root.CRAQUE_TACKLE = function (el, opts) {
    const P = root.CRAQUE_KICK_PARTS, C = root.CRAQUE_CHARS, c = opts.c, setup = S().kickSetup(c, 'tackle');
    el.innerHTML = '<div class="kick-stage">' + P.scene({ fk: false }, 1) + '<div class="kick-banner"></div></div>' +
      '<p class="kick-help">Toque quando o atacante pisar na <b>faixa verde</b></p>';
    const svg = el.querySelector('svg'), stage = el.querySelector('.kick-stage'), ball = svg.querySelector('#k-ball');
    svg.querySelector('#k-aim').remove();
    svg.querySelector('#k-keeper').style.display = 'none';
    svg.querySelector('#k-shadow').style.display = 'none';
    const spr = P.keeperSprite(svg); spr.stand(P.GX); spr.idle();
    const NS = 'http://www.w3.org/2000/svg';
    // Perspectiva: altura de um jogador conforme a linha dos pés (horizonte em y 62)
    const H = y => 91 * (y - 62) / (P.GY - 62);
    const at = u => ({ x: 30 + 165 * u, y: 316 - 100 * u });
    // Tempo da corrida inteira (u de 0 a 1); a janela de toque tem a mesma duração de antes (DEF e RIT)
    const T = setup.period * 2.2, SL = 0.36, SHOOT = 0.86;
    const B0 = 0.36 + Math.random() * 0.22, B1 = Math.min(0.8, B0 + setup.win / 2.2);
    // Faixa verde no gramado, sob os pés do atacante entre B0 e B1
    const z0 = at(B0), z1 = at(B1), w0 = H(z0.y) * 0.28, w1 = H(z1.y) * 0.28;
    z0.y += 7; z1.y -= 5; // faixa com um pouco de profundidade, para ler bem no gramado
    const zone = document.createElementNS(NS, 'polygon');
    zone.setAttribute('points', [[z0.x - w0, z0.y], [z0.x + w0, z0.y], [z1.x + w1, z1.y], [z1.x - w1, z1.y]].map(p => p.join(',')).join(' '));
    zone.setAttribute('class', 'tk-zone');
    svg.insertBefore(zone, ball);
    const layer = document.createElementNS(NS, 'g');
    svg.insertBefore(layer, ball);
    const kits = C.kits(c, c.moment && c.moment.vs), me = C.look(c);
    const atk = C.put('jogador-lado', Object.assign({ anim: 'corrida' }, C.faces(1)[0], kits.opp), layer);
    const def = C.put('jogador-lado', Object.assign({ anim: 'marcacao', espelhar: true }, me, kits.mine, me.boots ? { boots: me.boots } : {}), layer);
    const b3 = P.ball3d(stage, ball);
    const g = { u: 0, cut: 0, mode: 'run', def: { x: 258, y: 252 }, slide: null, aAnim: 'corrida', aT0: 0, ball: null };
    let armed = false, t = 0, last = performance.now(), result = null;
    setTimeout(() => { armed = true; }, 250);
    const setAtk = (anim, now) => { g.aAnim = anim; g.aT0 = now; };
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!armed || g.slide || g.mode !== 'run') return;
      const tgt = at(Math.min(1, g.u + SL / T));
      const kind = g.u < B0 ? 'cedo' : g.u > B1 ? 'tarde' : 'certo';
      g.slide = { t0: t, from: Object.assign({}, g.def), to: { x: tgt.x + 0.42 * H(tgt.y), y: tgt.y + 2 }, kind };
    });
    function end(ok, why) {
      if (result) return;
      result = { ok, why };
      sfx(ok ? 'goal' : 'miss');
      banner(el, ok ? 'DESARME!' : why === 'cedo' ? 'CHEGOU CEDO!' : why === 'tarde' ? 'CHEGOU TARDE!' : 'GOL DELES', ok);
      setTimeout(() => { b3.dispose(); opts.onDone(ok, ok ? 'desarme' : why); }, 1500);
    }
    // A bola sai do pé (desarme ou chute) e vai até um ponto
    const kickBall = (from, to, r1, ms, arc) => { g.ball = { from, to, r1, ms, arc, t0: performance.now() }; };
    (function step(now) {
      if (!svg.isConnected) return b3.dispose();
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (g.mode === 'run') g.u += dt / T;
      else if (g.mode === 'cut') g.u += dt / T * 0.35;
      else if (g.mode === 'fall') g.u += dt / T * 0.8 * Math.max(0, 1 - (t - g.fallT) / 0.5);
      // Carrinho
      if (g.slide) {
        const s = g.slide, k = Math.min(1, (t - s.t0) / SL), e = 1 - (1 - k) * (1 - k);
        g.def = { x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e };
        if (k >= 1 && !s.done) {
          s.done = true;
          if (s.kind === 'certo') {
            g.mode = 'fall'; g.fallT = t; setAtk('queda', now);
            const a = at(g.u), h = H(a.y);
            kickBall([a.x + 0.17 * h, a.y - 0.06 * h, 0.06 * h], [a.x + 0.17 * h + 90, Math.min(318, a.y + 40), 0.06 * h + 3], 0, 600, 14);
            end(true);
          } else if (s.kind === 'cedo') { g.mode = 'cut'; g.cutT = t; setAtk('corte', now); }
        }
      }
      // Corte: ele puxa a bola para trás e segue
      if (g.cutT != null) {
        const k = Math.min(1, (t - g.cutT) / 0.45); g.cut = -38 * k * k * (3 - 2 * k);
        if (k >= 1 && g.mode === 'cut') { g.mode = 'run'; setAtk('corrida', now); }
      }
      // Sem desarme: ele chega na área e bate no canto
      if (g.mode === 'run' && g.u >= SHOOT) {
        g.mode = 'shoot'; setAtk('finalizacao', now);
        const a = at(g.u), h = H(a.y), side = Math.random() < 0.5 ? -1 : 1;
        const gx = P.px(side * (0.55 + Math.random() * 0.3)), gy = P.py(0.15 + Math.random() * 0.6);
        setTimeout(() => {
          sfx('kick');
          spr.dive(P.px(-side * 0.5), P.py(0.45), -side, 380, 40);
          kickBall([a.x + g.cut + 0.17 * h, a.y - 0.06 * h, 0.06 * h], [gx, gy, 6.5], 0, 460, 12);
          setTimeout(() => { svg.querySelector('#k-net').classList.add('shake'); end(false, !g.slide ? 'passou' : g.slide.kind); }, 470);
        }, 180);
      }
      // Desenho: atacante, zagueiro (quem está mais perto da câmera fica na frente) e a bola
      const a = at(g.u), ah = H(a.y), ax = a.x + g.cut, ay = a.y + g.cut * 0.15;
      atk.place(ax, ay, ah);
      const A = { corrida: 620, corte: 420, finalizacao: 480, queda: 800 }[g.aAnim], ta = (now - g.aT0) / A;
      atk.pose(g.aAnim === 'corrida' ? ta % 1 : Math.min(1, ta), g.aAnim);
      def.place(g.def.x, g.def.y, H(g.def.y));
      if (g.slide) def.pose(Math.min(1, (t - g.slide.t0) / 0.76), 'carrinho');
      else def.pose((now / 1100) % 1, 'marcacao');
      if ((g.def.y > ay) !== (layer.lastChild === def.node)) layer.appendChild(g.def.y > ay ? def.node : atk.node);
      if (g.ball) {
        const B = g.ball, q = Math.min(1, (now - B.t0) / B.ms), f = P.ease(q);
        b3.place(B.from[0] + (B.to[0] - B.from[0]) * f, B.from[1] + (B.to[1] - B.from[1]) * f - Math.sin(q * Math.PI) * B.arc, B.from[2] + (B.to[2] - B.from[2]) * f, 0.3);
      } else if (g.mode !== 'shoot') {
        const run = g.mode === 'run' ? Math.sin(now / 98) * 0.03 * ah : 0;
        b3.place(ax + 0.17 * ah + run, ay - 0.06 * ah, 0.06 * ah, 0.15);
      }
      requestAnimationFrame(step);
    })(last);
  };

  // ---------- meia: passe decisivo (bola enfiada) ----------
  // Câmera atrás de você, na intermediária (36 m do gol). A zaga forma uma linha a 21 m do gol e o último zagueiro
  // fica mais atrás, dando condição. O seu atacante corre na diagonal entre os dois; toque quando ele estiver na
  // faixa verde: a bola passa pela brecha, ele vira para o gol e bate. Cedo ou tarde, a zaga corta; se demorar,
  // ele passa do último zagueiro e fica impedido. PAS alarga a brecha e deixa a corrida mais lenta.
  root.CRAQUE_PASS = function (el, opts) {
    const P = root.CRAQUE_KICK_PARTS, C = root.CRAQUE_CHARS, c = opts.c, setup = S().kickSetup(c, 'pass');
    // Projeção: ponto do gramado a g metros do gol (para a câmera) e x metros do centro
    // Câmera alta (4,5 m), como numa transmissão; o desenho do gol foi feito para uma câmera a 2,6 m
    const Z = 0.45, CAM = 36, K = 128 * Z * CAM, CH = 4.5, ZY = Z * 2.6 / CH, GL = 62 + 128 * Z;
    const sy = g => 62 + K / (CAM - g), sx = (x, g) => 180 + x * (P.GW / 3.66) * Z * CAM / (CAM - g);
    const hOf = g => 1.85 * (K / CH) / (CAM - g); // altura de um jogador na tela
    const rOf = g => 0.11 * (K / CH) / (CAM - g) + 0.6; // raio da bola
    const W = (x, y) => [180 + (x - 180) * Z, GL + (y - P.GY) * ZY]; // coordenadas do gol (k-world) na tela
    el.innerHTML = '<div class="kick-stage">' + P.scene({ fk: false }, 1, [Z, ZY]) + '<div class="kick-banner"></div></div>' +
      '<p class="kick-help" id="k-help">Toque quando o atacante passar pela <b>faixa verde</b></p>';
    const svg = el.querySelector('svg'), stage = el.querySelector('.kick-stage'), help = el.querySelector('#k-help');
    const ball = svg.querySelector('#k-ball'), world = svg.querySelector('#k-world');
    svg.querySelector('#k-aim').remove();
    svg.querySelector('#k-shadow').style.display = 'none';
    const spr = P.keeperSprite(svg); spr.stand(P.GX); spr.idle();
    const NS = 'http://www.w3.org/2000/svg';
    // Marcações do gramado nesta câmera: linha de fundo, pequena área, grande área, marca do pênalti e meia-lua
    const pt = (x, g) => sx(x, g).toFixed(1) + ' ' + sy(g).toFixed(1);
    const arc = [];
    for (let a = -53; a <= 53; a += 6) { const r = a * Math.PI / 180; arc.push(pt(9.15 * Math.sin(r), 11 + 9.15 * Math.cos(r))); }
    const marks = document.createElementNS(NS, 'g');
    marks.setAttribute('stroke', '#EEF5F0'); marks.setAttribute('stroke-width', '2'); marks.setAttribute('fill', 'none'); marks.setAttribute('opacity', '.75');
    marks.innerHTML = '<path d="M0 ' + sy(0) + ' H360"/>' +
      '<path d="M' + pt(-9.16, 0) + ' L' + pt(-9.16, 5.5) + ' L' + pt(9.16, 5.5) + ' L' + pt(9.16, 0) + '"/>' +
      '<path d="M' + pt(-20.16, 0) + ' L' + pt(-20.16, 16.5) + ' L' + pt(20.16, 16.5) + ' L' + pt(20.16, 0) + '"/>' +
      '<path d="M' + arc.join(' L') + '"/>' +
      '<ellipse cx="180" cy="' + sy(11) + '" rx="2.6" ry="1" fill="#EEF5F0" stroke="none"/>';
    svg.insertBefore(marks, world);
    // Corrida do atacante: de x0 a x1 (metros), de 20,5 m a 15,5 m do gol. O último zagueiro está a 16,3 m.
    const side = Math.random() < 0.5 ? 1 : -1, AX0 = -4.6 * side, AX1 = 4.6 * side, AG0 = 20.5, AG1 = 15.5, DEEP = 16.3, LINE = 21;
    const atU = u => ({ x: AX0 + (AX1 - AX0) * u, g: AG0 + (AG1 - AG0) * u });
    const offU = (AG0 - DEEP) / (AG0 - AG1); // a partir daqui, impedido
    // Janela (em u) e o ponto da brecha na linha: onde a reta da bola até o atacante cruza a linha da zaga
    const uw = Math.min(0.3, setup.win * offU), u0 = 0.18 + Math.random() * (offU - 0.12 - uw - 0.18), u1 = u0 + uw;
    const BG = 27; // você está a 27 m do gol, no centro
    const cross = u => { const a = atU(u), t = (BG - LINE) / (BG - a.g); return a.x * t; };
    const xc = cross((u0 + u1) / 2), half = Math.abs(cross(u1) - cross(u0)) / 2 + 0.45;
    // Faixa verde sob a corrida do atacante (entre u0 e u1)
    const z0 = atU(u0), z1 = atU(u1), zone = document.createElementNS(NS, 'polygon');
    zone.setAttribute('points', [pt(z0.x, z0.g + 0.5), pt(z1.x, z1.g + 0.5), pt(z1.x, z1.g - 0.5), pt(z0.x, z0.g - 0.5)].join(' ').replace(/(\S+) (\S+)/g, '$1,$2'));
    zone.setAttribute('class', 'tk-zone');
    svg.insertBefore(zone, ball);
    const kits = C.kits(c, c.moment && c.moment.vs), fs = C.faces(4);
    const layer = document.createElementNS(NS, 'g');
    svg.insertBefore(layer, ball);
    const man = (attrs, x, g) => { const m = C.put('jogador-2d', Object.assign({ kit: 'barreira', anim: 'parado' }, attrs), layer); m.place(sx(x, g), sy(g), hOf(g)); return m; };
    // Último zagueiro (mais longe, dá condição), depois o atacante, depois a linha (mais perto da câmera)
    const third = xc + (xc > 0 ? -1 : 1) * (half + 2.6), lineX = [xc - half, xc + half, third];
    // O último zagueiro fica num ponto livre (sem ficar escondido atrás da linha)
    let deepX = 0;
    for (let i = 0; i < 30; i++) {
      deepX = (Math.random() * 2 - 1) * 3;
      if (lineX.every(x => Math.abs(sx(x, LINE) - sx(deepX, DEEP)) > 26)) break;
    }
    const deep = man(Object.assign({ num: '4' }, fs[0], kits.opp), deepX, DEEP);
    const mate = C.put('jogador-lado', Object.assign({ anim: 'corrida' }, C.faces(1)[0], kits.mine, side < 0 ? { espelhar: true } : {}), layer);
    const defs = lineX.map((x, i) => ({ x, m: man(Object.assign({ num: ['3', '2', '6'][i] }, fs[i + 1], kits.opp), x, LINE) }));
    const all = [deep].concat(defs.map(d => d.m));
    (function idle(now) {
      if (!svg.isConnected) return;
      all.forEach((m, i) => m.pose((now / 2400 + i * 0.31) % 1, 'parado'));
      requestAnimationFrame(idle);
    })(performance.now());
    const b3 = P.ball3d(stage, ball);
    const ballAt = (x, g) => b3.place(sx(x, g), sy(g) - rOf(g), rOf(g), 0.3);
    ballAt(0, BG);
    // Você, de costas, atrás da bola
    const me = C.look(c);
    const you = C.put('jogador-2d', Object.assign({ kit: 'atacante', view: 'costas', anim: 'chute', num: String(c.number || 8), nome: (c.name || '').split(' ').pop().toUpperCase().slice(0, 10) },
      me, kits.mine, me.boots ? { boots: me.boots } : {}), svg, ball);
    you.place(sx(-0.35, BG + 0.5), sy(BG + 0.5), hOf(BG + 0.5)); you.pose(0, 'chute');
    const dur = setup.period * 1100 / offU, t0 = performance.now();
    let hit = null, armed = false, done = false;
    setTimeout(() => { armed = true; }, 250);
    const uAt = t => Math.min(1, t / dur);
    const placeMate = u => { const a = atU(u); mate.place(sx(a.x, a.g), sy(a.g), hOf(a.g)); };
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!armed || done) return;
      hit = uAt(performance.now() - t0);
      finish(hit >= u0 && hit <= u1, hit < u0 ? 'cedo' : 'tarde');
    });
    (function run(now) {
      if (done) return;
      const t = now - t0, u = uAt(t);
      placeMate(u); mate.pose((t / 620) % 1, 'corrida');
      if (u >= offU) return finish(false, 'impedido');
      requestAnimationFrame(run);
    })(t0);

    function finish(ok, why) {
      done = true;
      if (why === 'impedido') { mate.pose(0, 'marcacao'); return end(false, why); }
      sfx('kick');
      const p0 = performance.now();
      (function pass(now) { if (!svg.isConnected) return; const q = Math.min(1, (now - p0) / 380); you.pose(0.4 + 0.42 * q, 'chute'); if (q < 1) requestAnimationFrame(pass); })(p0);
      // Passe rasteiro: até onde o atacante vai estar (na certa) ou até o zagueiro que corta
      const T = 520, ua = Math.min(1, hit + T / dur), a = atU(ua);
      const near = defs.slice().sort((p, q) => Math.abs(p.x - cross(hit)) - Math.abs(q.x - cross(hit)))[0];
      const tx = ok ? a.x + 0.35 * side : near.x, tg = ok ? a.g : LINE + 0.4;
      const s0 = performance.now();
      (function roll(now) {
        const q = Math.min(1, (now - s0) / T), e = 1 - (1 - q) * (1 - q);
        ballAt(tx * e, BG + (tg - BG) * e);
        const um = hit + Math.min(1, (now - s0) / dur) * (ok ? 1 : 0.6);
        placeMate(Math.min(ua, um)); mate.pose(((now - t0) / 620) % 1, 'corrida');
        if (q < 1) return requestAnimationFrame(roll);
        if (!ok) { mate.pose(0, 'marcacao'); return end(false, why); }
        shoot(a);
      })(s0);
    }
    // Ele recebe, vira de frente para o gol (de costas para a câmera) e bate no canto oposto ao goleiro
    function shoot(a) {
      mate.node.remove();
      const back = C.put('jogador-2d', Object.assign({ kit: 'atacante', view: 'costas', anim: 'chute', num: c.number === 9 ? '11' : '9' }, C.faces(1)[0], kits.mine), layer, layer.firstChild.nextSibling);
      back.place(sx(a.x - 0.25, a.g), sy(a.g), hOf(a.g));
      const gs = a.x > 0 ? -1 : 1, goalX = P.px(gs * (0.5 + Math.random() * 0.3)), goalY = P.py(0.2 + Math.random() * 0.5);
      const s1 = performance.now();
      let kicked = false;
      (function swing(now) {
        if (!svg.isConnected) return;
        const q = Math.min(1, (now - s1) / 620);
        back.pose(0.2 + 0.64 * q, 'chute');
        if (!kicked && q >= 0.3) { kicked = true; sfx('kick'); spr.dive(P.px(-gs * 0.5), P.py(0.45), -gs, 380, 40); fly(a, goalX, goalY); }
        if (q < 1) requestAnimationFrame(swing);
      })(s1);
    }
    function fly(a, gx, gy) {
      const s2 = performance.now(), [ex, ey] = W(gx, gy);
      const bx = sx(a.x, a.g), br = rOf(a.g), by = sy(a.g) - br;
      (function go(now) {
        const q = Math.min(1, (now - s2) / 420), f = P.ease(q);
        b3.place(bx + (ex - bx) * f, by + (ey - by) * f - Math.sin(q * Math.PI) * 8, br + (2.6 - br) * f, 0.35);
        if (q < 1) return requestAnimationFrame(go);
        svg.querySelector('#k-net').classList.add('shake');
        svg.querySelector('#k-crowd').classList.add('cheer');
        end(true);
      })(s2);
    }
    function end(ok, why) {
      sfx(ok ? 'goal' : 'miss');
      banner(el, ok ? 'GOOOL!' : why === 'impedido' ? 'IMPEDIDO!' : 'CORTADO!', ok);
      help.innerHTML = ok ? 'Bola enfiada na medida: <b>assistência sua</b>' : why === 'cedo' ? 'Passou cedo: a zaga cortou.' : why === 'tarde' ? 'Passou tarde: a zaga fechou.' : 'Demorou e ele passou do último zagueiro: impedido.';
      setTimeout(() => { b3.dispose(); opts.onDone(ok, ok ? 'passe' : why); }, 1500);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
