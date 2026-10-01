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
  // O atacante corre por trás da zaga, da esquerda para a direita. Toque quando ele estiver na brecha (faixa verde)
  // entre dois zagueiros: a bola passa e ele finaliza. Cedo ou tarde, a zaga corta. PAS alarga a brecha e
  // deixa a corrida mais lenta.
  root.CRAQUE_PASS = function (el, opts) {
    const P = root.CRAQUE_KICK_PARTS, c = opts.c, setup = S().kickSetup(c, 'pass');
    el.innerHTML = '<div class="kick-stage">' + P.scene({ fk: false }, 1) + '<div class="kick-banner"></div></div>' +
      '<p class="kick-help" id="k-help">Toque quando o atacante passar pela <b>brecha</b></p>';
    const svg = el.querySelector('svg'), stage = el.querySelector('.kick-stage'), help = el.querySelector('#k-help');
    const ball = svg.querySelector('#k-ball');
    svg.querySelector('#k-aim').remove();
    svg.querySelector('#k-keeper').style.display = 'none';
    const spr = P.keeperSprite(svg); spr.stand(P.GX); spr.idle();
    const NS = 'http://www.w3.org/2000/svg';
    // Perspectiva da cena: horizonte em y 62 e o gol (2,44 m) com 120 px de altura na linha do gol (y 190).
    // Um jogador de 1,85 m tem 91 px na linha do gol e cresce conforme chega perto da câmera.
    const hOf = feet => 91 * (feet - 62) / (P.GY - 62);
    // Linha da zaga na entrada da área (y 222) e corrida do atacante entre ela e o gol (y 204), de X0 a X1
    const LINE = 222, RUN = 204, X0 = 30, X1 = 330;
    const gw = setup.win * (X1 - X0), gc = 120 + Math.random() * 120, g0 = gc - gw / 2, g1 = gc + gw / 2;
    const C = root.CRAQUE_CHARS, kits = C.kits(c, c.moment && c.moment.vs), fs = C.faces(3);
    // Faixa verde da brecha no gramado (do pé da zaga até a corrida do atacante)
    const zone = document.createElementNS(NS, 'rect');
    zone.setAttribute('x', g0); zone.setAttribute('y', RUN - 6); zone.setAttribute('width', gw); zone.setAttribute('height', LINE - RUN + 10);
    zone.setAttribute('rx', 6); zone.setAttribute('class', 'tk-zone');
    svg.insertBefore(zone, ball);
    // Zagueiros: dois fechando a brecha e um mais aberto
    const hD = hOf(LINE), hM = hOf(RUN), half = hD * 0.24; // metade da largura do corpo
    // O atacante corre atrás da linha (mais longe da câmera): desenhado antes dos zagueiros
    const mate = C.put('jogador-lado', Object.assign({ anim: 'corrida', num: '9' }, C.faces(1)[0], kits.mine), svg, ball);
    mate.place(X0, RUN, hM);
    const defs = [g0 - half, g1 + half, gc < 180 ? g1 + half * 5 : g0 - half * 5].map((x, i) => {
      const m = C.put('jogador-2d', Object.assign({ kit: 'barreira', anim: 'parado', num: ['3', '4', '2'][i] }, fs[i], kits.opp), svg, ball);
      m.place(x, LINE, hD);
      return { x, m };
    });
    // Zagueiros respirando, cada um no seu tempo
    (function idle(now) {
      if (!svg.isConnected) return;
      defs.forEach((d, i) => d.m.pose((now / 2400 + i * 0.31) % 1, 'parado'));
      requestAnimationFrame(idle);
    })(performance.now());
    const b3 = P.ball3d(stage, ball);
    b3.place(P.BALL.x, P.BALL.y, P.BALL.r);
    const dur = setup.period * 1100, t0 = performance.now();
    let hit = null, armed = false, done = false;
    setTimeout(() => { armed = true; }, 250);
    const posAt = t => X0 + (X1 - X0) * Math.min(1, t / dur);
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!armed || done) return;
      hit = posAt(performance.now() - t0);
      finish(hit >= g0 && hit <= g1, hit < g0 ? 'cedo' : 'tarde');
    });
    (function run(now) {
      if (done) return;
      const t = now - t0;
      mate.place(posAt(t), RUN, hM);
      mate.pose((t / 620) % 1, 'corrida');
      if (t >= dur) return finish(false, 'impedido');
      requestAnimationFrame(run);
    })(t0);

    function finish(ok, why) {
      done = true;
      sfx('kick');
      const mx = hit !== null ? hit : X1;
      // Passe: a bola rola até o atacante (ou até o zagueiro que corta)
      const near = defs.slice().sort((a, b) => Math.abs(a.x - mx) - Math.abs(b.x - mx))[0];
      const tx = ok ? mx : why === 'impedido' ? X1 : near.x, ty = ok ? RUN : LINE - 4;
      const s0 = performance.now();
      (function roll(now) {
        const u = Math.min(1, (now - s0) / 420), e = P.ease(u);
        b3.place(P.BALL.x + (tx - P.BALL.x) * e, P.BALL.y + (ty - P.BALL.y) * e, P.BALL.r + (7.5 - P.BALL.r) * e, 0.3);
        if (u < 1) return requestAnimationFrame(roll);
        if (!ok) { mate.pose(0, 'marcacao'); return end(false, why); }
        // Finalização do atacante: canto oposto ao goleiro
        const f0 = performance.now();
        (function fin(n3) { if (!svg.isConnected) return; const q = Math.min(1, (n3 - f0) / 480); mate.pose(q, 'finalizacao'); if (q < 1) requestAnimationFrame(fin); })(f0);
        const side = mx < P.GX ? 1 : -1, gx = P.px(side * 0.72), gy = P.py(0.3);
        spr.dive(P.px(-side * 0.5), P.py(0.4), -side, 380, 60);
        const s1 = performance.now();
        (function shot(n2) {
          const q = Math.min(1, (n2 - s1) / 380), f = P.ease(q);
          b3.place(tx + (gx - tx) * f, ty + (gy - ty) * f - Math.sin(q * Math.PI) * 10, 7.5 + (6.5 - 7.5) * f, 0.35);
          if (q < 1) return requestAnimationFrame(shot);
          svg.querySelector('#k-net').classList.add('shake');
          svg.querySelector('#k-crowd').classList.add('cheer');
          end(true);
        })(s1);
      })(s0);
    }
    function end(ok, why) {
      sfx(ok ? 'goal' : 'miss');
      banner(el, ok ? 'GOOOL!' : why === 'impedido' ? 'IMPEDIDO!' : 'CORTADO!', ok);
      help.innerHTML = ok ? 'Bola enfiada na medida: <b>assistência sua</b>' : why === 'cedo' ? 'Passou cedo: a zaga cortou.' : why === 'tarde' ? 'Passou tarde: a zaga fechou.' : 'Demorou e ele ficou impedido.';
      setTimeout(() => { b3.dispose(); opts.onDone(ok, ok ? 'passe' : why); }, 1500);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
