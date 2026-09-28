// Efeitos em tela cheia: moedas, notas, confete, números voadores, faixas, tremor e flash.
(function () {
  const C = PS.C, TAU = Math.PI * 2;
  const cv = document.getElementById('fx');
  const ctx = cv.getContext('2d');
  const flashEl = document.getElementById('flash');
  const FONT = "'Lilita One', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif";
  let W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * DPR;
    cv.height = H * DPR;
  }
  window.addEventListener('resize', resize);
  resize();

  let reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ok */ }

  const parts = [], texts = [];
  const fx = PS.fx = { shakeAmt: 0, reduce };
  const CONFETTI = [C.gold, C.green, C.red, '#5B8CFF', C.pink, '#A26BE8'];

  fx.spawn = function (p) {
    if (parts.length > 450) parts.shift();
    parts.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, g: 1100, t: 0, life: 1, size: 9,
      rot: Math.random() * TAU, vr: 0, shape: 'coin', color: C.gold,
    }, p));
  };

  fx.burst = function (x, y, n, o = {}) {
    if (reduce) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 2.4);
      const s = (o.speed || 380) * (0.5 + Math.random() * 0.7);
      fx.spawn({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.7 + Math.random() * 0.6,
        size: (o.size || 9) * (0.7 + Math.random() * 0.6),
        shape: o.shape || (Math.random() < 0.75 ? 'coin' : 'bill'),
        vr: (Math.random() - 0.5) * 14,
      });
    }
  };

  fx.confetti = function (n) {
    if (reduce) n = Math.ceil(n / 4);
    for (let i = 0; i < n; i++) {
      fx.spawn({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 120,
        vy: 80 + Math.random() * 200,
        g: 260,
        life: 2.2 + Math.random() * 1.2,
        size: 5 + Math.random() * 5,
        shape: 'confetti',
        color: PS.pick(CONFETTI),
        vr: (Math.random() - 0.5) * 16,
      });
    }
  };

  // Moeda que voa em arco até um alvo (o contador) e chama onArrive ao chegar.
  fx.homing = function (x, y, tx, ty, onArrive, delay) {
    fx.spawn({
      homing: true, sx: x, sy: y, tx, ty,
      cx: x + (tx - x) * 0.3 + PS.rand(-120, 120),
      cy: Math.min(y, ty) - PS.rand(60, 160),
      t: -(delay || 0), dur: PS.rand(0.5, 0.75),
      life: 99, size: 8, shape: 'coin', onArrive, x: -99, y: -99,
    });
  };

  // Foguete cruzando a tela (TO THE MOON)
  fx.rocket = function () {
    fx.spawn({ x: -40, y: H * 0.85, vx: W * 0.55, vy: -H * 0.5, g: 0, life: 2.4, size: 54, shape: 'emoji', str: '🚀', rot: 0 });
  };

  fx.text = function (x, y, str, o = {}) {
    if (texts.length > 70) texts.shift();
    texts.push({
      x, y, str, t: 0,
      size: o.size || 26,
      color: o.color || '#fff',
      life: o.life || 1,
      vy: o.vy === undefined ? -110 : o.vy,
      pop: o.pop || 1.25,
    });
  };

  fx.banner = function (str, sub, color) {
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].banner) texts.splice(i, 1);
    texts.push({
      banner: true, x: W / 2, y: H * 0.38, str, sub, t: 0,
      size: Math.min(W * 0.14, 86), color: color || C.gold, life: 1.7, vy: 0, pop: 1.5,
    });
  };

  fx.shake = function (a) {
    if (!reduce) fx.shakeAmt = Math.max(fx.shakeAmt, a);
  };

  fx.flash = function (color, strength) {
    flashEl.style.transition = 'none';
    flashEl.style.background = color;
    flashEl.style.opacity = String(strength);
    void flashEl.offsetWidth;
    flashEl.style.transition = 'opacity .5s ease-out';
    flashEl.style.opacity = '0';
  };

  function drawCoin(p) {
    const sx = Math.abs(Math.cos(p.rot)) * 0.8 + 0.2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(sx, 1);
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, TAU);
    ctx.fillStyle = C.gold;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.55, 0, TAU);
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.goldD;
    ctx.stroke();
    ctx.restore();
  }

  function drawBill(p) {
    const w = p.size * 2.4, h = p.size * 1.3;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, Math.abs(Math.cos(p.rot * 0.7)) * 0.7 + 0.3);
    ctx.fillStyle = '#7BE495';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.28, 0, TAU);
    ctx.fillStyle = C.greenD;
    ctx.fill();
    ctx.restore();
  }

  function drawConfetti(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, Math.cos(p.rot * 1.3));
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }

  function outlinedText(str, x, y, size, color) {
    ctx.font = size + 'px ' + FONT;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.2);
    ctx.strokeStyle = C.ink;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  const easeOutBack = u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2);

  fx.update = function (dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.homing) {
        if (p.t < 0) continue;
        const u = Math.min(1, p.t / p.dur);
        const e = u * u;
        const a = 1 - e;
        p.x = a * a * p.sx + 2 * a * e * p.cx + e * e * p.tx;
        p.y = a * a * p.sy + 2 * a * e * p.cy + e * e * p.ty;
        p.rot += dt * 10;
        if (u >= 1) {
          parts.splice(i, 1);
          if (p.onArrive) p.onArrive();
          continue;
        }
      } else {
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      const fade = p.homing ? 1 : Math.min(1, (p.life - p.t) / 0.3);
      ctx.globalAlpha = fade;
      if (p.shape === 'coin') drawCoin(p);
      else if (p.shape === 'bill') drawBill(p);
      else if (p.shape === 'emoji') {
        ctx.font = p.size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.str, p.x, p.y);
        if (Math.random() < 0.8) fx.spawn({ x: p.x - 20, y: p.y + 18, vx: -120 + Math.random() * 60, vy: 60 + Math.random() * 80, g: 0, life: 0.5, size: 6, shape: 'confetti', color: PS.pick([C.gold, C.red, '#FF9F1C']) });
      }
      else drawConfetti(p);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.t += dt;
      if (t.t >= t.life) { texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.pow(0.35, dt);
      const inDur = t.banner ? 0.35 : 0.18;
      const u = Math.min(1, t.t / inDur);
      const scale = t.t < inDur ? 0.3 + (t.pop - 0.3) * easeOutBack(u) / 1 : 1 + (t.pop - 1) * Math.max(0, 1 - (t.t - inDur) / 0.15);
      const alpha = Math.min(1, (t.life - t.t) / 0.3);
      ctx.globalAlpha = alpha;
      if (t.banner) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(Math.sin(t.t * 9) * 0.03 - 0.04);
        // Encolhe a faixa para caber na largura da tela
        if (!t.fit) {
          ctx.font = t.size + 'px ' + FONT;
          const w1 = ctx.measureText(t.str).width;
          ctx.font = Math.max(18, t.size * 0.3) + 'px ' + FONT;
          const w2 = t.sub ? ctx.measureText(t.sub).width : 0;
          t.fit = Math.min(1, (W * 0.9) / Math.max(w1, 1), (W * 0.94) / Math.max(w2, 1));
        }
        const sz = t.size * t.fit;
        outlinedText(t.str, 0, 0, sz * Math.min(scale, 1.6), t.color);
        if (t.sub) outlinedText(t.sub, 0, sz * 0.72 + 6, Math.max(14, t.size * 0.3 * t.fit), '#fff');
        ctx.restore();
      } else {
        outlinedText(t.str, t.x, t.y, t.size * scale, t.color);
      }
    }
    ctx.globalAlpha = 1;

    fx.shakeAmt = Math.max(0, fx.shakeAmt - dt * 40);
  };
})();
