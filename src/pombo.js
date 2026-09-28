// O Pombo Investidor: cenário da praça, desenho, animações e reações.
(function () {
  const C = PS.C, TAU = Math.PI * 2;
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  }
  const cv = document.getElementById('stage');
  const ctx = cv.getContext('2d');
  const bubble = document.getElementById('bubble');
  let W = 300, H = 300, DPR = 1;

  function resize() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    cv.width = W * DPR;
    cv.height = H * DPR;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  window.addEventListener('resize', resize);
  resize();

  const P = PS.pombo = {
    x: 0, tx: 0, dir: 1, walking: false, walkT: 0, nextWalk: 4,
    sy: 1, vs: 0, jump: 0, jv: 0,
    blinkT: 0, nextBlink: 2.5,
    mood: 'idle', moodT: 0,
    wing: 0, rays: 0, gold: 0, t: 0,
    zs: [], zT: 0, bubbleT: 0,
    scale: 1, px: 0, gy: 0,
  };

  P.setMood = function (m, dur) {
    P.mood = m;
    P.moodT = dur || 1;
    if (m === 'stonks' || m === 'celebrate') P.gold = 1;
  };

  P.hit = function (crit) {
    P.sy = crit ? 0.72 : 0.86;
    P.vs = 0;
    if (crit && P.jump === 0) P.jv = 520;
  };

  P.hop = function () {
    if (P.jump === 0) P.jv = 360;
  };

  P.celebrate = function (dur) {
    P.setMood('celebrate', dur || 1.6);
    P.jv = 620;
  };

  P.wake = function () {
    P.mood = 'idle';
    P.zs.length = 0;
    P.nextWalk = 2;
    PS.audio.coo();
    P.say(PS.pick(PS.WAKE_LINES), 2.6);
  };

  P.say = function (text, dur) {
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    P.bubbleT = dur || 3.5;
  };

  // Posição do pombo na tela (para efeitos em tela cheia).
  P.screenPos = function () {
    const r = cv.getBoundingClientRect();
    return { x: r.left + P.px, y: r.top + P.gy - P.jump - 90 * P.scale };
  };

  P.update = function (dt) {
    P.t += dt;

    // Mola de squash & stretch
    const a = -300 * (P.sy - 1) - 13 * P.vs;
    P.vs += a * dt;
    P.sy += P.vs * dt;

    // Pulo
    if (P.jump > 0 || P.jv > 0) {
      P.jv -= 2000 * dt;
      P.jump += P.jv * dt;
      if (P.jump <= 0) {
        P.jump = 0;
        P.jv = 0;
        P.sy = 0.84;
        P.vs = 0;
      }
    }

    if (P.mood !== 'idle' && P.mood !== 'sleep') {
      P.moodT -= dt;
      if (P.moodT <= 0) P.mood = 'idle';
    }
    if (P.mood === 'idle' && PS.idle > 30) {
      P.mood = 'sleep';
      P.say('zzz… sonhando com dividendos', 3);
    }

    // Piscar
    P.nextBlink -= dt;
    if (P.nextBlink <= 0) {
      P.blinkT = 0.12;
      P.nextBlink = 2 + Math.random() * 3.5;
    }
    P.blinkT = Math.max(0, P.blinkT - dt);

    // Asa
    const wingTarget = P.mood === 'celebrate' ? 1.0 + Math.sin(P.t * 22) * 0.35 : P.mood === 'stonks' ? 0.5 : 0;
    P.wing += (wingTarget - P.wing) * Math.min(1, dt * 14);

    // Passeio pela praça
    const lim = W * 0.28;
    P.nervous = P.mood !== 'sleep' && (P.nervous ? PS.market.v < 0.88 : PS.market.v < 0.78);
    if (P.mood === 'idle') {
      P.nextWalk -= dt;
      if (P.nextWalk <= 0) {
        P.tx = PS.rand(-lim, lim);
        P.nextWalk = P.nervous ? 0.8 + Math.random() : 3 + Math.random() * 5;
      }
    }
    P.tx = Math.max(-lim, Math.min(lim, P.tx));
    const d = P.tx - P.x;
    if (Math.abs(d) > 2 && P.mood !== 'sleep') {
      P.x += Math.sign(d) * Math.min(Math.abs(d), (P.nervous ? 170 : 75) * dt);
      P.dir = Math.sign(d);
      P.walkT += dt;
      P.walking = true;
    } else {
      P.walking = false;
    }
    P.x = Math.max(-lim, Math.min(lim, P.x));

    // Zzz
    if (P.mood === 'sleep') {
      P.zT -= dt;
      if (P.zT <= 0) {
        P.zs.push({ t: 0, off: Math.random() * 10 });
        P.zT = 0.9;
      }
    }
    for (let i = P.zs.length - 1; i >= 0; i--) {
      P.zs[i].t += dt;
      if (P.zs[i].t > 2.4) P.zs.splice(i, 1);
    }

    P.rays += dt * (0.12 + P.gold * 0.8 + (PS.market.sharkOn > 0 ? 0.6 : 0));
    P.gold = Math.max(0, P.gold - dt * 0.6);

    if (P.bubbleT > 0) {
      P.bubbleT -= dt;
      if (P.bubbleT <= 0) bubble.hidden = true;
    }
  };

  // ---------- desenho ----------

  function ell(x, y, rx, ry, rot, fill, lw) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C.ink; ctx.stroke(); }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5E86FF');
    g.addColorStop(1, '#A9C6FF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Raios de sol girando (ficam dourados em momentos de glória)
    const cx = W / 2, cy = H * 0.62, R = Math.hypot(W, H);
    const n = 18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(P.rays);
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      if (P.gold > 0) {
        ctx.fillStyle = 'rgba(255,201,40,' + (0.45 * P.gold).toFixed(3) + ')';
        ctx.fill();
      }
      if (PS.market.sharkOn > 0) {
        ctx.fillStyle = 'rgba(64,224,255,0.28)';
        ctx.fill();
      }
    }
    ctx.restore();

    // Tom do mercado: verde na alta, vermelho na queda
    const v = PS.market.v;
    const tint = v >= 1.6 ? 'rgba(47,210,122,' + Math.min(0.3, (v - 1.6) * 0.25).toFixed(3) + ')'
      : v < 0.9 ? 'rgba(255,77,109,' + Math.min(0.32, (0.9 - v) * 0.7).toFixed(3) + ')' : null;
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
    }

    // Chão da praça: calçadão com ondas pretas e brancas
    const gy = P.gy;
    ctx.fillStyle = '#F4EBDD';
    ctx.fillRect(0, gy - 6, W, H - gy + 6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gy - 6, W, H - gy + 6);
    ctx.clip();
    ctx.strokeStyle = 'rgba(30,21,55,0.85)';
    ctx.lineWidth = 7;
    const amp = 7, wl = 46;
    for (let row = 0; row < 6; row++) {
      const y = gy + 12 + row * 22;
      ctx.beginPath();
      for (let x = -wl; x <= W + wl; x += 4) {
        const yy = y + Math.sin((x / wl) * TAU + row * Math.PI) * amp;
        if (x === -wl) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, gy - 7, W, 3.5);
  }

  function drawEye(hx, hy) {
    const ex = hx + 9, ey = hy - 5;
    const st = PS.S.stage;
    if (st >= 2 && !PS.S.equip.eyes) {
      // Óculos escuros (substituem o olho, exceto dormindo)
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(ex - 10, ey - 2);
      ctx.lineTo(hx - 24, ey + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(ex - 13, ey - 9, 28, 17, 6);
      ctx.fillStyle = C.ink;
      ctx.fill();
      if (P.mood === 'stonks') {
        dollar(ex + 1, ey, 15, C.gold);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ex - 6, ey - 4);
        ctx.lineTo(ex, ey - 4);
        ctx.stroke();
      }
      return;
    }
    if (P.mood === 'sleep' || P.blinkT > 0) {
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex, ey - 2, 7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      return;
    }
    if (P.mood === 'notstonks') {
      ell(ex, ey, 10, 10, 0, '#fff', 3);
      ell(ex + 1, ey + 3, 3, 3, 0, C.ink, 0);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(ex - 10, ey - 8);
      ctx.lineTo(ex + 8, ey - 13);
      ctx.stroke();
      return;
    }
    if (P.mood === 'celebrate') {
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex, ey + 4, 7, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      return;
    }
    ell(ex, ey, 10, 10, 0, '#fff', 3);
    if (P.mood === 'stonks') {
      dollar(ex, ey + 1, 15, C.greenD);
      return;
    }
    ell(ex + 1.5, ey, 6.5, 6.5, 0, '#FF9A3C', 0);
    ell(ex + 2, ey, 3.3, 3.3, 0, C.ink, 0);
    ell(ex + 3.5, ey - 2, 1.4, 1.4, 0, '#fff', 0);
  }

  // ---------- itens visuais ----------
  function path(pts, fill, lw) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C.ink; ctx.stroke(); }
  }

  function drawEyesItem(id, hx, hy) {
    const ex = hx + 9, ey = hy - 5;
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    if (id === 'nerd') {
      ctx.beginPath(); ctx.moveTo(ex - 12, ey - 1); ctx.lineTo(hx - 24, ey + 1); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 13, 0, TAU); ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(ex - 18, ey - 3, 6, 6);
    } else if (id === 'esportivo') {
      const g = ctx.createLinearGradient(ex - 14, ey - 8, ex + 14, ey + 8);
      g.addColorStop(0, '#FF9F1C'); g.addColorStop(1, '#A64DFF');
      path([[hx - 22, ey - 4], [ex + 15, ey - 10], [ex + 14, ey + 6], [ex - 6, ey + 9], [hx - 12, ey + 4]], g, 4);
    } else if (id === 'monoculo') {
      ctx.beginPath(); ctx.arc(ex, ey, 12, 0, TAU);
      ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = C.gold; ctx.stroke();
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(ex - 4, ey + 12); ctx.quadraticCurveTo(ex - 14, ey + 30, hx - 6, hy + 30);
      ctx.lineWidth = 2.5; ctx.strokeStyle = C.gold; ctx.stroke();
      ctx.setLineDash([]);
    } else if (id === 'laser') {
      const w = 7 + Math.sin(P.t * 30) * 2;
      const g = ctx.createLinearGradient(ex, 0, ex + 420, 0);
      g.addColorStop(0, 'rgba(255,40,60,0.95)'); g.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 420, ey - 30); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = w * 0.35;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 300, ey - 21); ctx.stroke();
      const rg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 18);
      rg.addColorStop(0, '#fff'); rg.addColorStop(0.4, '#FF2840'); rg.addColorStop(1, 'rgba(255,40,64,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ex, ey, 18, 0, TAU); ctx.fill();
    }
  }

  function drawHeadItem(id, hx, hy) {
    const tx = hx - 2, ty = hy - 20;
    if (id === 'bone') {
      ctx.beginPath(); ctx.arc(hx, hy - 8, 27, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath(); ctx.fillStyle = C.red; ctx.fill(); ctx.lineWidth = 4.5; ctx.strokeStyle = C.ink; ctx.stroke();
      path([[hx + 14, hy - 12], [hx + 50, hy - 14], [hx + 50, hy - 7], [hx + 14, hy - 6]], '#C81E45', 4);
      ell(hx, hy - 36, 4, 3, 0, '#C81E45', 2.5);
    } else if (id === 'palha') {
      ell(tx, ty, 42, 8, 0, '#F2C46D', 4);
      ctx.beginPath(); ctx.roundRect(tx - 19, ty - 24, 38, 24, 8);
      ctx.fillStyle = '#F2C46D'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = C.red; ctx.fillRect(tx - 19, ty - 8, 38, 6);
    } else if (id === 'headset') {
      ctx.beginPath(); ctx.arc(hx - 2, hy - 2, 32, Math.PI * 1.05, Math.PI * 1.9);
      ctx.lineWidth = 9; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = '#5E6190'; ctx.stroke();
      ell(hx - 20, hy + 2, 9, 12, 0, C.ink, 0);
      ctx.beginPath(); ctx.moveTo(hx - 16, hy + 10); ctx.quadraticCurveTo(hx, hy + 26, hx + 24, hy + 18);
      ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
      ell(hx + 25, hy + 18, 4.5, 4.5, 0, '#5E6190', 2.5);
    } else if (id === 'cowboy') {
      ctx.beginPath(); ctx.moveTo(tx - 46, ty - 10); ctx.quadraticCurveTo(tx, ty + 14, tx + 46, ty - 10);
      ctx.quadraticCurveTo(tx, ty + 2, tx - 46, ty - 10);
      ctx.fillStyle = '#B5763A'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
      path([[tx - 20, ty], [tx - 16, ty - 30], [tx, ty - 24], [tx + 16, ty - 30], [tx + 20, ty]], '#C98A4B', 4);
      ctx.fillStyle = '#6B3F17'; ctx.fillRect(tx - 19, ty - 8, 38, 5);
    } else if (id === 'coroa') {
      path([[tx - 20, ty], [tx - 22, ty - 26], [tx - 10, ty - 14], [tx, ty - 32], [tx + 10, ty - 14], [tx + 22, ty - 26], [tx + 20, ty]], C.gold, 4);
      ell(tx, ty - 7, 4, 4, 0, C.red, 2);
      ell(tx - 12, ty - 6, 3, 3, 0, '#3D8BFF', 2);
      ell(tx + 12, ty - 6, 3, 3, 0, C.green, 2);
    } else if (id === 'aureola') {
      const yy = hy - 48 + Math.sin(P.t * 3) * 3;
      ctx.save();
      ctx.shadowColor = '#9FF3FF'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(hx - 2, yy, 27, 7, 0, 0, TAU);
      ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = '#BFF8FF'; ctx.stroke();
      ctx.restore();
      path([[hx + 22, yy - 10], [hx + 27, yy - 4], [hx + 22, yy + 3], [hx + 17, yy - 4]], '#fff', 2);
    }
  }

  function drawNeckItem(id) {
    if (id === 'cachecol') {
      ctx.save();
      ctx.translate(26, -86); ctx.rotate(0.25);
      ctx.beginPath(); ctx.roundRect(-24, -8, 48, 16, 8);
      ctx.fillStyle = C.red; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = '#fff'; [-12, 4].forEach(x => ctx.fillRect(x, -6, 5, 12));
      ctx.restore();
      path([[30, -80], [42, -80], [44, -52], [32, -52]], C.red, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(33, -70, 10, 4);
    } else if (id === 'borboleta') {
      path([[32, -80], [16, -90], [16, -68]], '#A64DFF', 3.5);
      path([[32, -80], [48, -90], [48, -68]], '#A64DFF', 3.5);
      ell(32, -80, 5, 6, 0, '#7B2FD6', 3);
    } else if (id === 'diamante') {
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const x = (1 - u) * (1 - u) * 6 + 2 * (1 - u) * u * 26 + u * u * 48;
        const y = (1 - u) * (1 - u) * -90 + 2 * (1 - u) * u * -50 + u * u * -88;
        path([[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], '#9FF3FF', 1.8);
      }
      path([[27, -72], [37, -62], [27, -46], [17, -62]], '#9FF3FF', 3);
      ctx.fillStyle = '#fff'; ctx.fillRect(23, -65, 4, 4);
    }
  }

  function dollar(x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(P.dir, 1);
    ctx.font = size + "px 'Lilita One', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText('$', 0, 1);
    ctx.restore();
  }

  function drawPombo() {
    const s = P.scale, st = PS.S.stage;
    const walkPhase = P.walking ? P.walkT * 13 : 0;
    const bob = P.walking ? Math.sin(walkPhase) * 6 : (P.mood === 'sleep' ? -6 : Math.sin(P.t * 2) * 1.2);
    const breathe = P.mood === 'sleep' ? Math.sin(P.t * 2.5) * 0.025 : 0;

    // Sombra (fica no chão durante o pulo)
    ctx.save();
    ctx.translate(P.px, P.gy);
    ctx.scale(s, s);
    const shrink = 1 - Math.min(P.jump / 500, 0.5);
    ell(0, 2, 56 * shrink, 9 * shrink, 0, 'rgba(30,21,55,0.22)', 0);
    ctx.restore();

    ctx.save();
    ctx.translate(P.px, P.gy - P.jump);
    const sy = P.sy + breathe;
    ctx.scale(s * P.dir * (2 - sy), s * sy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Aura dourada (Bilionário)
    if (st >= 5) {
      const g = ctx.createRadialGradient(0, -70, 10, 0, -70, 130);
      g.addColorStop(0, 'rgba(255,215,64,0.75)');
      g.addColorStop(1, 'rgba(255,215,64,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -70, 130 + Math.sin(P.t * 4) * 6, 0, TAU);
      ctx.fill();
    }

    // Pés
    [-16, 14].forEach((fx, k) => {
      const lift = P.walking ? Math.max(0, Math.sin(walkPhase + k * Math.PI)) * 7 : 0;
      ctx.lineWidth = 10;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(fx, -16);
      ctx.lineTo(fx, -2 - lift);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.pink;
      ctx.stroke();
      ell(fx + 5, -2 - lift, 11, 4.5, 0, C.pink, 3);
    });

    // Cauda
    ctx.beginPath();
    ctx.moveTo(-40, -40);
    ctx.lineTo(-76, -26);
    ctx.lineTo(-84, -38);
    ctx.lineTo(-78, -52);
    ctx.lineTo(-46, -62);
    ctx.closePath();
    ctx.fillStyle = '#8E91BA';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-72, -30);
    ctx.lineTo(-74, -50);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#4E5184';
    ctx.stroke();

    // Pescoço (atrás do corpo)
    const hx = 32 + (P.walking ? bob : 0), hy = -110 + (P.walking ? -Math.abs(bob) * 0.3 : bob);
    const ng = ctx.createLinearGradient(10, -105, 45, -60);
    ng.addColorStop(0, '#4FD6A2');
    ng.addColorStop(1, '#A26BE8');
    ell(24 + (hx - 32) * 0.4, -82, 25, 26, 0, ng, 5);

    // Corpo
    ell(0, -48, 55, 40, 0, C.lav, 5);
    ell(16, -36, 30, 19, 0, '#D3D5EC', 0);
    // Frente do pescoço (esconde a emenda)
    ell(26 + (hx - 32) * 0.4, -78, 19, 17, 0, ng, 0);

    // Gravata
    if (st >= 1) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(22, -86); ctx.lineTo(31, -79); ctx.lineTo(22, -74); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(42, -86); ctx.lineTo(33, -79); ctx.lineTo(42, -74); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.moveTo(29, -76); ctx.lineTo(35, -76); ctx.lineTo(41, -50); ctx.lineTo(32, -40); ctx.lineTo(23, -50);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(27, -83, 10, 8, 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(27, -64); ctx.lineTo(37, -60);
      ctx.moveTo(26, -54); ctx.lineTo(38, -50);
      ctx.stroke();
    }

    // Corrente de ouro (ou item de pescoço)
    if (PS.S.equip.neck) {
      drawNeckItem(PS.S.equip.neck);
    } else if (st >= 3) {
      ctx.fillStyle = C.gold;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const x = (1 - u) * (1 - u) * 6 + 2 * (1 - u) * u * 26 + u * u * 48;
        const y = (1 - u) * (1 - u) * -90 + 2 * (1 - u) * u * -50 + u * u * -88;
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ell(27, -62, 10, 10, 0, C.gold, 3);
      ctx.save();
      ctx.translate(27, -61);
      ctx.scale(P.dir, 1);
      ctx.font = "15px 'Lilita One', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.goldD;
      ctx.fillText('$', 0, 1);
      ctx.restore();
    }

    // Asa
    ctx.save();
    ctx.translate(6, -64);
    ctx.rotate(-P.wing);
    ell(-24, 8, 36, 21, 0.12, '#9DA0C8', 5);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#4E5184';
    ctx.beginPath();
    ctx.moveTo(-36, -2); ctx.quadraticCurveTo(-40, 10, -34, 20);
    ctx.moveTo(-22, -2); ctx.quadraticCurveTo(-26, 10, -20, 22);
    ctx.stroke();
    ctx.restore();

    // Cabeça
    ell(hx, hy, 28, 27, 0, C.lav, 5);
    ell(hx + 2, hy + 11, 6, 4, 0, 'rgba(255,143,177,0.55)', 0);
    drawEye(hx, hy);
    const eqv = PS.S.equip;

    // Bico
    const bx = hx + 23, by = hy + 2;
    ctx.beginPath();
    ctx.moveTo(bx - 3, by - 6);
    ctx.quadraticCurveTo(bx + 14, by - 4, bx + 21, by + 3);
    ctx.lineTo(bx - 3, by + 5);
    ctx.closePath();
    ctx.fillStyle = '#3A3150';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ell(bx + 1, by - 6, 6.5, 3.8, 0, '#F3F0FF', 2.5);

    // Barbatana do Modo Tubarão
    if (PS.market.sharkOn > 0) {
      ctx.save();
      ctx.translate(hx - 8, hy - 22);
      ctx.beginPath();
      ctx.moveTo(-14, 4);
      ctx.quadraticCurveTo(-10, -30, 14, -44);
      ctx.quadraticCurveTo(8, -18, 16, 4);
      ctx.closePath();
      ctx.fillStyle = '#6F8FB8';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.restore();
    }

    // Suor de nervoso
    if (P.nervous || P.mood === 'notstonks') {
      const k = (P.t * 1.6) % 1;
      [[-22, -8], [-14, -26]].forEach(([dx, dy], j) => {
        const u = (k + j * 0.5) % 1;
        ctx.globalAlpha = 1 - u;
        ctx.beginPath();
        const x = hx + dx - u * 6, y = hy + dy + u * 14;
        ctx.moveTo(x, y - 7);
        ctx.quadraticCurveTo(x + 6, y + 2, x, y + 4);
        ctx.quadraticCurveTo(x - 6, y + 2, x, y - 7);
        ctx.fillStyle = '#7FD3FF';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    if (eqv.eyes) drawEyesItem(eqv.eyes, hx, hy);
    if (eqv.head) drawHeadItem(eqv.head, hx, hy);

    // Cartola
    if (st >= 4 && !eqv.head) {
      ctx.save();
      ctx.translate(hx - 2, hy - 23);
      ctx.rotate(-0.14);
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.roundRect(-17, -40, 34, 40, 3);
      ctx.fill();
      ctx.fillStyle = st >= 5 ? C.gold : C.red;
      ctx.fillRect(-17, -12, 34, 8);
      ell(0, 0, 28, 6.5, 0, C.ink, 0);
      ctx.restore();
    }

    // Seta NOT STONKS
    if (P.mood === 'notstonks') {
      ctx.save();
      ctx.translate(hx + 30, hy - 45);
      ctx.scale(P.dir, 1);
      const pts = [[-26, -14], [-10, 0], [0, -8], [22, 16]];
      const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
      ctx.lineWidth = 11; ctx.strokeStyle = C.ink; path(); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = C.red; path(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, 22); ctx.lineTo(12, 20); ctx.lineTo(26, 6);
      ctx.closePath();
      ctx.fillStyle = C.red; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.restore();
    }

    // Seta STONKS acima da cabeça
    if (P.mood === 'stonks') {
      ctx.save();
      ctx.translate(hx + 30, hy - 45 - Math.sin(P.t * 10) * 4);
      ctx.scale(P.dir, 1);
      ctx.lineWidth = 11;
      ctx.strokeStyle = C.ink;
      const pts = [[-26, 16], [-10, 2], [0, 10], [22, -14]];
      const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
      path(); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.green;
      path(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, -20); ctx.lineTo(12, -18); ctx.lineTo(26, -4);
      ctx.closePath();
      ctx.fillStyle = C.green;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Zzz (desenhados sem espelhamento)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    P.zs.forEach(z => {
      const u = z.t / 2.4;
      const x = P.px + (40 + u * 40 + Math.sin(z.t * 3 + z.off) * 8) * s * P.dir;
      const y = P.gy - (150 + u * 70) * s;
      const size = (16 + u * 16) * s * 1.2;
      ctx.globalAlpha = 1 - u;
      ctx.font = size + "px 'Lilita One', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.strokeText('z', x, y);
      ctx.fillStyle = '#fff';
      ctx.fillText('z', x, y);
    });
    ctx.globalAlpha = 1;
  }

  P.draw = function () {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    P.scale = Math.max(0.45, Math.min((H - 70) * 0.62 / 175, W / 280, 1.7));
    P.gy = H - Math.max(34, H * 0.13);
    P.px = W / 2 + P.x;
    drawBackground();
    drawPombo();

    if (!bubble.hidden) {
      const tall = PS.S.stage >= 4 || PS.S.equip.head;
      const topY = P.gy - P.jump - (tall ? 205 : 160) * P.scale;
      const bx = Math.max(90, Math.min(W - 90, P.px + P.dir * 20 * P.scale));
      bubble.style.left = bx + 'px';
      bubble.style.top = Math.max(118, topY) + 'px';
    }
  };
})();
