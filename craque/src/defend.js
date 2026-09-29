// Minigames defensivos.
//  CRAQUE_SAVE  (goleiro): o batedor corre; pouco antes do chute o corpo dele "entrega" o lado (seta).
//                Toque na metade esquerda, no meio ou na direita para pular. REF deixa o sinal mais tempo
//                na tela; ELA alcança bolas mais perto do canto. Nada escondido: o sinal nunca mente.
//  CRAQUE_TACKLE (zagueiro): o atacante arranca em direção ao gol; toque quando ele passar pela faixa
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
    keeper.classList.add('mine'); // o goleiro agora é você
    P.setBall(ball, P.BALL.x, P.BALL.y, P.BALL.r);
    P.setKeeper(keeper, 0, 0, 0);
    // Batedor (de costas, em primeiro plano) e a seta do "corpo entregando o lado"
    const NS = 'http://www.w3.org/2000/svg';
    const kicker = document.createElementNS(NS, 'g');
    kicker.setAttribute('class', 'k-kicker');
    kicker.innerHTML = '<ellipse cx="0" cy="34" rx="16" ry="4" fill="rgba(0,0,0,.3)"/>' +
      '<rect x="-9" y="10" width="7" height="24" rx="3" class="kk-leg"/><rect x="2" y="10" width="7" height="24" rx="3" class="kk-leg"/>' +
      '<rect x="-13" y="-22" width="26" height="34" rx="8" class="kk-shirt"/><circle cx="0" cy="-30" r="9" fill="#6B4226"/>' +
      '<g class="kk-tell" opacity="0"><path d="M0 -58 l-12 10 h7 v10 h10 v-10 h7z" fill="#FFE27A" stroke="#2E2100" stroke-width="1.5"/></g>';
    svg.appendChild(kicker);
    const tell = kicker.querySelector('.kk-tell');
    const k0 = { x: 110, y: 318 }, k1 = { x: 162, y: 300 };
    kicker.setAttribute('transform', 'translate(' + k0.x + ' ' + k0.y + ')');

    // O chute: lado (-1, 0, 1) e ponto do gol; às vezes o batedor erra
    const rs = Math.random();
    const side = rs < 0.42 ? -1 : rs < 0.84 ? 1 : 0;
    const miss = Math.random() < 0.07;
    const x = miss ? side * (1.05 + Math.random() * 0.15) || 1.1 : side === 0 ? (Math.random() - 0.5) * 0.4 : side * (0.35 + Math.random() * 0.62);
    const y = 0.1 + Math.random() * 0.8;
    const runMs = 1300 + Math.random() * 500, tellAt = runMs - setup.tellMs;
    // Seta aponta para o lado do chute (↑ = meio)
    tell.setAttribute('transform', 'rotate(' + (side * 90) + ' 0 -48)');

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
      if (t < runMs + 170) return requestAnimationFrame(run); // pequena folga de reação depois do chute
      shoot();
    })(t0);

    function shoot() {
      done = true;
      sfx('kick');
      tell.setAttribute('opacity', 0);
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
      (function fly(now) {
        const k = Math.min(1, (now - s0) / T), e = ease(k);
        P.setBall(ball, P.BALL.x + (tx - P.BALL.x) * e, P.BALL.y + (ty - P.BALL.y) * e - Math.sin(k * Math.PI) * 16, P.BALL.r + (8.5 - P.BALL.r) * e);
        const ke = ease(Math.min(1, k * 1.25));
        P.setKeeper(keeper, kDx * ke, kDy * ke, (d === 0 ? 0 : d * (saved ? R : 72)) * ke);
        if (k < 1) return requestAnimationFrame(fly);
        if (saved && !miss) { // rebote para fora
          const r0 = performance.now(), bx = tx, by = ty;
          (function out(n2) { const q = Math.min(1, (n2 - r0) / 380); P.setBall(ball, bx + (bx < P.GX ? -1 : 1) * 60 * q, by + 45 * q, 8.5 + 2 * q); if (q < 1) requestAnimationFrame(out); })(r0);
        }
        if (!saved) svg.querySelector('#k-net').classList.add('shake');
        sfx(saved ? 'goal' : 'miss');
        if (saved) svg.querySelector('#k-crowd').classList.add('cheer');
        banner(el, miss ? 'PRA FORA!' : saved ? 'DEFENDEU!' : 'GOL DELES', saved);
        setTimeout(() => opts.onDone(saved, why), 1400);
      })(s0);
    }
  };

  // ---------- zagueiro ----------
  root.CRAQUE_TACKLE = function (el, opts) {
    const c = opts.c, setup = S().kickSetup(c, 'tackle');
    const zone0 = 0.52 + Math.random() * 0.25, zone1 = Math.min(0.95, zone0 + setup.win);
    const X0 = 30, X1 = 330, LANE = 118; // caminho do atacante (x) e altura da faixa
    const zx0 = X0 + (X1 - X0) * zone0, zx1 = X0 + (X1 - X0) * zone1;
    const stripes = [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<rect x="' + i * 45 + '" y="0" width="22" height="220" fill="rgba(255,255,255,.045)"/>').join('');
    el.innerHTML = '<div class="kick-stage tackle-stage"><svg class="kick-svg" viewBox="0 0 360 220" aria-label="Desarme">' +
      '<rect width="360" height="220" fill="#1F6B3E"/>' + stripes +
      '<rect x="300" y="40" width="60" height="140" fill="none" stroke="#EEF5F0" stroke-width="2" opacity=".7"/>' +
      '<rect x="340" y="80" width="20" height="60" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="3"/>' +
      '<rect x="' + zx0 + '" y="' + (LANE - 34) + '" width="' + (zx1 - zx0) + '" height="68" rx="8" class="tk-zone"/>' +
      '<g id="tk-def" class="tk-def" transform="translate(' + ((zx0 + zx1) / 2) + ' ' + (LANE - 44) + ')"><circle r="13"/><text y="5" text-anchor="middle">' + (c.number || 4) + '</text></g>' +
      '<g id="tk-att" class="tk-att" transform="translate(' + X0 + ' ' + LANE + ')"><circle r="13"/><text y="5" text-anchor="middle">9</text><circle class="tk-ball" cx="18" cy="8" r="6"/></g>' +
      '</svg><div class="kick-banner"></div></div>' +
      '<p class="kick-help">Toque quando o atacante passar pela <b>faixa verde</b></p>';
    const att = el.querySelector('#tk-att'), def = el.querySelector('#tk-def'), stage = el.querySelector('.kick-stage');
    const dur = setup.period * 1000, t0 = performance.now();
    let hit = null, armed = false, done = false;
    setTimeout(() => { armed = true; }, 250);
    const posAt = t => X0 + (X1 - X0) * Math.min(1, t / dur);
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!armed || hit !== null || done) return;
      hit = posAt(performance.now() - t0);
      finish(hit >= zx0 && hit <= zx1, hit < zx0 ? 'cedo' : 'tarde');
    });
    (function run(now) {
      if (done) return;
      const t = now - t0;
      att.setAttribute('transform', 'translate(' + posAt(t) + ' ' + (LANE + Math.sin(t / 90) * 2) + ')');
      if (t >= dur) return finish(false, 'passou');
      requestAnimationFrame(run);
    })(t0);

    function finish(ok, why) {
      done = true;
      const ax = hit !== null ? hit : X1;
      // Carrinho: o zagueiro desliza até o atacante; na certa, a bola sai
      const s0 = performance.now();
      (function slide(now) {
        const k = Math.min(1, (now - s0) / 260), e = ease(k);
        def.setAttribute('transform', 'translate(' + (((zx0 + zx1) / 2) + (ax - (zx0 + zx1) / 2) * e) + ' ' + (LANE - 44 + 36 * e) + ') rotate(' + (-50 * e) + ')');
        if (k < 1) return requestAnimationFrame(slide);
        if (ok) { const b = att.querySelector('.tk-ball'); b.setAttribute('cx', 40); b.setAttribute('cy', -40); }
        else att.setAttribute('transform', 'translate(' + (X1 + 10) + ' ' + LANE + ')');
      })(s0);
      sfx(ok ? 'goal' : 'miss');
      banner(el, ok ? 'DESARME!' : why === 'cedo' ? 'CHEGOU CEDO!' : why === 'tarde' ? 'CHEGOU TARDE!' : 'PASSOU!', ok);
      setTimeout(() => opts.onDone(ok, ok ? 'desarme' : why), 1400);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
