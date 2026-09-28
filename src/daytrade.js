// Minigame Day Trade Turbo: 30s, toque para comprar e toque de novo para vender.
// Trades seguidos no lucro aumentam a alavancagem (até 5x). Fichas recarregam com o tempo.
(function () {
  const C = PS.C, fmt = PS.fmt, $ = id => document.getElementById(id);
  const DT = PS.daytrade = { on: false };
  const DUR = 30, MAX_TICKETS = 3, REGEN = 20 * 60 * 1000, EXTRA_COST = 5;
  const S = () => PS.S;

  // ---------- fichas ----------
  DT.tick = function () {
    const d = S().dt, now = Date.now();
    if (d.tickets >= MAX_TICKETS) { d.nextAt = 0; return; }
    if (!d.nextAt) d.nextAt = now + REGEN;
    while (d.tickets < MAX_TICKETS && now >= d.nextAt) {
      d.tickets++;
      d.nextAt = d.tickets < MAX_TICKETS ? d.nextAt + REGEN : 0;
    }
  };

  DT.label = function () {
    const d = S().dt;
    if (d.tickets > 0) return d.tickets + '/' + MAX_TICKETS;
    const s = Math.max(0, Math.ceil((d.nextAt - Date.now()) / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  // ---------- partida ----------
  const cv = $('dt-cv'), ctx = cv.getContext('2d');
  let W = 300, H = 200, DPR = 1;
  let g = null;

  function resize() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(10, r.width);
    H = Math.max(10, r.height);
    cv.width = W * DPR;
    cv.height = H * DPR;
  }

  function gauss() {
    return Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
  }

  // Abre a tela. opts.offline = ganho offline a dobrar (vem da tela de boas-vindas).
  DT.open = function (opts) {
    opts = opts || {};
    PS.audio.init();
    DT.tick();
    const d = S().dt;
    if (!opts.offline) {
      if (d.tickets > 0) d.tickets--;
      else if (S().coins >= EXTRA_COST) S().coins -= EXTRA_COST;
      else { PS.audio.error(); PS.ui.toast('🎟️', 'Sem fichas. Recarrega em ' + DT.label() + ' ou use 🪙 ' + EXTRA_COST); return; }
    }
    DT.tick();
    g = {
      t: DUR, price: 100, trend: 0, trendT: 0, hist: [], bal: 100, pos: null, combo: 0,
      trades: 0, wins: 0, best: 0, offline: opts.offline || 0, started: false, flash: 0,
    };
    for (let i = 0; i < 160; i++) { step(1 / 30); g.hist.push(g.price); }
    $('daytrade').hidden = false;
    $('dt-result').hidden = true;
    $('dt-hint').textContent = 'Toque para COMPRAR';
    resize();
    DT.on = true;
    draw();
  };

  function step(dt) {
    g.trendT -= dt;
    if (g.trendT <= 0) {
      g.trend = PS.rand(-1, 1) * PS.rand(4, 14);
      g.trendT = PS.rand(0.6, 2.2);
    }
    let dp = g.trend * dt + gauss() * 2.4 * Math.sqrt(dt);
    if (Math.random() < dt * 0.25) dp += PS.rand(-1, 1) * 6; // pico repentino
    g.price = Math.max(20, g.price + dp + (100 - g.price) * 0.02 * dt);
  }

  DT.tap = function () {
    if (!DT.on || g.t <= 0) return;
    g.started = true;
    const A = PS.audio;
    if (!g.pos) {
      g.pos = { entry: g.price, lev: 1 + Math.min(g.combo, 4) };
      A.tone(700, 0.07, { type: 'square', vol: 0.1 });
      A.tone(1050, 0.1, { type: 'triangle', vol: 0.12, at: 0.05 });
      $('dt-hint').textContent = 'Toque para VENDER';
      return;
    }
    const ret = (g.price / g.pos.entry - 1) * g.pos.lev;
    g.bal = Math.max(1, g.bal * (1 + ret));
    g.trades++;
    const pct = Math.round(ret * 100);
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width * 0.78, y = r.top + r.height * 0.3;
    if (ret >= 0) {
      g.wins++;
      g.combo++;
      g.best = Math.max(g.best, pct);
      PS.fx.text(x, y, '+' + pct + '%', { size: 30 + Math.min(pct, 40) * 0.5, color: C.green });
      PS.fx.burst(x, y, 6 + Math.min(pct, 30), { speed: 420 });
      A.buy();
      if (pct >= 20) { PS.fx.shake(8); A.crit(); }
    } else {
      g.combo = 0;
      PS.fx.text(x, y, pct + '%', { size: 30, color: C.red });
      A.error();
      g.flash = 1;
    }
    g.pos = null;
    $('dt-hint').textContent = 'Toque para COMPRAR';
  };

  function finish() {
    if (g.pos) { // fecha posição aberta no fim
      const ret = (g.price / g.pos.entry - 1) * g.pos.lev;
      g.bal = Math.max(1, g.bal * (1 + ret));
      g.pos = null;
    }
    DT.on = false;
    const s = S(), bal = g.bal;
    const base = Math.max(PS.tapBase() * 40, PS.pps() / PS.market.tempMult() * 120);
    const gain = base * (bal / 100);
    PS.earn(gain);
    let coins = Math.max(0, Math.floor((bal - 100) / 20));
    const cupom = bal >= 200 ? 1 : 0;
    if (coins) PS.addCoins(coins);
    if (cupom) s.cupons++;
    let extra = '';
    if (g.offline) {
      if (bal >= 100) { PS.earn(g.offline); extra = '<p class="dt-dbl ok">Coleta offline DOBRADA: +' + fmt(g.offline) + '</p>'; }
      else extra = '<p class="dt-dbl">Precisava terminar no lucro para dobrar a coleta offline.</p>';
    }
    s.dt.plays++;
    const record = bal > s.dt.best;
    s.dt.best = Math.max(s.dt.best, bal);
    PS.meta.track('daytrade', 1);

    $('dt-result').innerHTML =
      '<h3>' + (bal >= 200 ? 'LOBO DA PRAÇA!' : bal >= 100 ? 'Fechou no verde!' : 'NOT STONKS') + '</h3>' +
      '<div class="dt-big ' + (bal >= 100 ? 'up' : 'down') + '">' + (bal >= 100 ? '+' : '') + Math.round(bal - 100) + '%</div>' +
      '<p>' + g.trades + ' trades · ' + g.wins + ' no lucro · ' + (g.trades - g.wins) + ' no prejuízo' + (g.best > 0 ? ' · melhor trade +' + g.best + '%' : '') + (record && bal > 100 ? ' · <b>recorde!</b>' : '') + '</p>' +
      '<p class="dt-prize">💸 +' + fmt(gain) + (coins ? ' · 🪙 +' + coins : '') + (cupom ? ' · 🎫 +1' : '') + '</p>' + extra +
      '<div class="dt-actions"><button type="button" class="btn primary" id="dt-again">' + againLabel() + '</button>' +
      '<button type="button" class="btn" id="dt-close">Sair</button></div>';
    $('dt-result').hidden = false;
    $('dt-again').addEventListener('click', () => DT.open());
    $('dt-close').addEventListener('click', DT.close);
    if (bal >= 100) { PS.fx.confetti(bal >= 200 ? 120 : 50); PS.audio.coins(); }
    else PS.audio.scam();
    PS.pombo.say(bal >= 200 ? 'Eu nasci pro day trade.' : bal >= 100 ? 'Lucro é lucro.' : 'O gráfico estava errado.', 3);
  }

  function againLabel() {
    const d = S().dt;
    return d.tickets > 0 ? 'Jogar de novo · 🎟️ ' + d.tickets : 'Jogar de novo · 🪙 ' + EXTRA_COST;
  }

  DT.close = function () {
    DT.on = false;
    $('daytrade').hidden = true;
    PS.ui.refresh();
  };

  DT.update = function (dt) {
    if (!DT.on) return;
    if (g.started) g.t -= dt;
    step(dt);
    g.hist.push(g.price);
    if (g.hist.length > 160) g.hist.shift();
    g.flash = Math.max(0, g.flash - dt * 3);
    if (g.t <= 0) { g.t = 0; finish(); }
    draw();
  };

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#16102B';
    ctx.fillRect(0, 0, W, H);
    if (g.flash > 0) { ctx.fillStyle = 'rgba(255,77,109,' + (g.flash * 0.35).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    // grade
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const h = g.hist;
    let lo = Math.min(...h), hi = Math.max(...h);
    if (g.pos) { lo = Math.min(lo, g.pos.entry); hi = Math.max(hi, g.pos.entry); }
    const pad = (hi - lo) * 0.15 + 2;
    lo -= pad; hi += pad;
    const X = i => (i / (h.length - 1)) * (W * 0.82);
    const Y = v => H - ((v - lo) / (hi - lo)) * H;
    const up = !g.pos || g.price >= g.pos.entry;
    // linha de entrada
    if (g.pos) {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, Y(g.pos.entry)); ctx.lineTo(W, Y(g.pos.entry)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = up ? 'rgba(47,210,122,0.12)' : 'rgba(255,77,109,0.14)';
      const y0 = Y(g.pos.entry), y1 = Y(g.price);
      ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
    }
    ctx.beginPath();
    h.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = g.pos ? (up ? C.green : C.red) : '#9EB6FF';
    ctx.stroke();
    const ex = X(h.length - 1), ey = Y(g.price);
    ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    // HUD do minigame
    $('dt-time').textContent = Math.ceil(g.t) + 's';
    $('dt-time-bar').style.width = (g.t / DUR * 100) + '%';
    $('dt-bal').textContent = (g.bal >= 100 ? '+' : '') + Math.round(g.bal - 100) + '%';
    $('dt-bal').className = g.bal >= 100 ? 'up' : 'down';
    const lev = 1 + Math.min(g.combo, 4);
    $('dt-lev').textContent = 'Alav. ' + (g.pos ? g.pos.lev : lev) + 'x · tempo';
    const pnl = g.pos ? (g.price / g.pos.entry - 1) * g.pos.lev * 100 : null;
    const pe = $('dt-pnl');
    pe.textContent = pnl === null ? '—' : (pnl >= 0 ? '+' : '') + pnl.toFixed(1).replace('.', ',') + '%';
    pe.className = pnl === null ? '' : pnl >= 0 ? 'up' : 'down';
  }

  $('dt-cv').addEventListener('pointerdown', e => { e.preventDefault(); DT.tap(); });
  $('dt-tapzone').addEventListener('pointerdown', e => { e.preventDefault(); DT.tap(); });
  // Sair antes de começar devolve a ficha; durante a partida o botão não faz nada.
  $('dt-exit').addEventListener('click', () => {
    if (g && g.t > 0 && g.started) return;
    if (g && !g.started && !g.offline && g.t > 0) S().dt.tickets = Math.min(MAX_TICKETS, S().dt.tickets + 1);
    DT.close();
  });
  window.addEventListener('resize', () => { if (DT.on) resize(); });
})();
