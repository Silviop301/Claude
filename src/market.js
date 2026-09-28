// Mercado ao vivo (multiplicador de produção), bônus temporários, Modo Tubarão e "Comprar na baixa".
(function () {
  const C = PS.C;
  const HIST = 60;
  const STEP = 0.5; // o mercado anda em passos; o valor exibido desliza entre eles
  const MIN = 0.4, MAX = 3.2;
  const clamp = v => Math.max(MIN, Math.min(MAX, v));
  const M = PS.market = {
    v: 1.2, raw: 1.2, mu: 1.2, regimeT: 20, hist: [], sampleT: 0,
    up: true, dipOpen: false, lo: 0.8, hi: 1.6,
    target: null, targetT: 0, targetK: 1,
    boosts: [], shark: 0, sharkOn: 0, SHARK_DUR: 30,
    zone: 'mid', zoneCd: 0,
  };

  function gauss() {
    return Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
  }

  M.init = function () {
    const S = PS.S;
    M.v = M.raw = clamp(+(S.market && S.market.v) || 1.2);
    S.market = { v: M.v };
    M.hist = [];
    for (let i = 0; i < HIST; i++) M.hist.push(M.v);
    M.lo = M.v - 0.4;
    M.hi = M.v + 0.4;
    M.up = true;
    M.dipOpen = M.v < 0.8;
    M.boosts = [];
    M.shark = 0;
    M.sharkOn = 0;
    M.target = null;
    M.zone = M.v >= 2 ? 'high' : M.v < 0.8 ? 'low' : 'mid';
  };

  // Força o mercado em direção a um valor por um tempo (Bull Run, Crash…).
  M.force = function (target, dur, k) {
    M.target = target;
    M.targetT = dur;
    M.targetK = k || 1.5;
  };

  M.tempMult = function () {
    let m = M.v;
    for (const b of M.boosts) m *= b.x;
    if (M.sharkOn > 0) m *= 5;
    return m;
  };

  M.addBoost = function (id, icon, label, x, dur) {
    M.boosts = M.boosts.filter(b => b.id !== id);
    M.boosts.push({ id, icon, label, x, t: dur, dur });
  };

  M.hasBoost = id => M.boosts.some(b => b.id === id);

  M.trend = function () {
    return M.up ? 1 : -1;
  };

  M.sharkTap = function () {
    if (M.sharkOn > 0) return;
    M.shark = Math.min(1, M.shark + 0.025);
    if (M.shark >= 1) {
      M.sharkOn = M.SHARK_DUR;
      PS.S.stats.sharks++;
      PS.onShark();
    }
  };

  M.canBuyDip = function () {
    return !PS.S.pos && M.dipOpen && PS.S.money >= 10;
  };

  M.buyDip = function () {
    if (!M.canBuyDip()) return null;
    const amt = PS.S.money * 0.25;
    PS.S.money -= amt;
    PS.S.pos = { amt, p0: M.v, t: 0 };
    return PS.S.pos;
  };

  function sellPos(reason) {
    const S = PS.S, pos = S.pos;
    S.pos = null;
    const ret = M.v / pos.p0;
    const payout = pos.amt * ret;
    const profit = payout - pos.amt;
    S.money += pos.amt;
    if (profit > 0) PS.earn(profit);
    else S.money = Math.max(0, S.money + profit);
    S.stats.dipProfit += profit;
    PS.onSell(profit, ret, reason);
  }

  M.update = function (dt) {
    const S = PS.S;

    M.regimeT -= dt;
    if (M.regimeT <= 0) {
      M.mu = PS.pick([0.7, 0.95, 1.2, 1.2, 1.4, 1.6, 2.0]);
      M.regimeT = PS.rand(14, 32);
    }

    // Um passo de mercado a cada STEP segundos
    M.sampleT += dt;
    while (M.sampleT >= STEP) {
      M.sampleT -= STEP;
      if (M.target !== null) {
        M.raw += (M.target - M.raw) * Math.min(1, STEP * M.targetK) + 0.04 * gauss();
        M.targetT -= STEP;
        if (M.targetT <= 0) M.target = null;
      } else {
        M.raw += 0.35 * (M.mu - M.raw) * STEP + 0.2 * gauss();
        if (Math.random() < 0.01) M.raw += (Math.random() - 0.5) * 0.8;
      }
      M.raw = clamp(M.raw);
      M.hist.push(M.v);
      if (M.hist.length > HIST) M.hist.shift();

      // Tendência com histerese (compara com ~3s atrás), para a cor não ficar trocando
      const d = M.v - M.hist[Math.max(0, M.hist.length - 7)];
      if (d > 0.04) M.up = true;
      else if (d < -0.04) M.up = false;
    }

    // Valor exibido desliza suavemente até o passo atual
    M.v = clamp(M.v + (M.raw - M.v) * (1 - Math.exp(-dt * 3)));
    S.market.v = M.v;

    if (M.v < 0.8) M.dipOpen = true;
    else if (M.v > 0.9) M.dipOpen = false;

    for (let i = M.boosts.length - 1; i >= 0; i--) {
      M.boosts[i].t -= dt;
      if (M.boosts[i].t <= 0) M.boosts.splice(i, 1);
    }

    if (M.sharkOn > 0) {
      M.sharkOn -= dt;
      M.shark = Math.max(0, M.sharkOn / M.SHARK_DUR);
      if (M.sharkOn <= 0) {
        M.sharkOn = 0;
        M.shark = 0;
        PS.ui.toast('🦈', 'O Modo Tubarão acabou. Toque para encher de novo!');
      }
    } else {
      M.shark = Math.max(0, M.shark - dt * 0.035);
    }

    if (S.pos) {
      S.pos.t += dt;
      const ret = M.v / S.pos.p0;
      if (ret >= 1.8) sellPos('top');
      else if (S.pos.t >= 90) sellPos('time');
    }

    // Mudanças de zona do mercado (com histerese e intervalo mínimo)
    M.zoneCd = Math.max(0, M.zoneCd - dt);
    let zone = M.zone;
    if (M.v >= 2.0) zone = 'high';
    else if (M.v < 0.8) zone = 'low';
    else if (M.v > 0.95 && M.v < 1.8) zone = 'mid';
    if (zone !== M.zone) {
      const prev = M.zone;
      M.zone = zone;
      if (M.zoneCd <= 0 && zone !== 'mid') {
        M.zoneCd = 20;
        PS.onMarketZone(zone, prev);
      }
    }
  };

  // ---------- gráfico ----------
  const cv = document.getElementById('chart');
  const ctx = cv.getContext('2d');
  let W = 100, H = 40, DPR = 1;
  function resize() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    cv.width = W * DPR;
    cv.height = H * DPR;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  resize();

  M.draw = function (dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const h = M.hist.concat([M.v]);

    // Escala vertical muda devagar, sem pular
    let lo = Math.min(...h), hi = Math.max(...h);
    if (hi - lo < 0.5) { const mid = (hi + lo) / 2; lo = mid - 0.25; hi = mid + 0.25; }
    const k = 1 - Math.exp(-dt * 1.5);
    M.lo += (lo - 0.05 - M.lo) * k;
    M.hi += (hi + 0.05 - M.hi) * k;
    M.lo = Math.min(M.lo, lo);
    M.hi = Math.max(M.hi, hi);

    const pad = 5;
    const n = M.hist.length;
    const stepW = (W - 10) / (n - 1);
    const frac = M.sampleT / STEP;
    // Pontos do histórico deslizam para a esquerda; o último é o valor ao vivo
    const X = i => (i < n ? i - frac : n - 1) * stepW;
    const Y = v => pad + (1 - (v - M.lo) / (M.hi - M.lo)) * (H - pad * 2);
    const col = M.hasBoost('moon') ? C.gold : M.up ? C.green : C.red;

    if (M.lo < 1 && M.hi > 1) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(30,21,55,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, Y(1));
      ctx.lineTo(W, Y(1));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const line = () => {
      ctx.beginPath();
      h.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    };
    line();
    ctx.lineTo(X(h.length - 1), H);
    ctx.lineTo(X(0), H);
    ctx.closePath();
    ctx.fillStyle = M.up ? 'rgba(47,210,122,0.22)' : 'rgba(255,77,109,0.2)';
    ctx.fill();

    line();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    line();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = col;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(X(h.length - 1), Y(M.v), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  };
})();
