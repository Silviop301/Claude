// Roda da Fortuna Pombal: 1 giro grátis por dia, giros extras com PomboCoin.
(function () {
  const C = PS.C, TAU = Math.PI * 2, fmt = PS.fmt;
  const $ = id => document.getElementById(id);
  const WH = PS.wheel = { rot: 0, spinning: false };

  const PRIZES = [
    { id: 'grana',   icon: '💸', label: 'Grana',    w: 22,  color: '#7BE495' },
    { id: 'c10',     icon: '🪙', label: '10',       w: 20,  color: '#FFE08A' },
    { id: 'camelo',  icon: '📦', label: 'Camelô',   w: 14,  color: '#E8B27A' },
    { id: 'boost',   icon: '⚡', label: 'x2', w: 15,  color: '#9EEBFF' },
    { id: 'jackpot', icon: '👑', label: 'JACKPOT',  w: 1.5, color: '#FFC928' },
    { id: 'c25',     icon: '🪙', label: '25',       w: 10,  color: '#FFE08A' },
    { id: 'maleta',  icon: '💼', label: 'Maleta',   w: 8,   color: '#C9B8FF' },
    { id: 'cupom',   icon: '🎫', label: 'Cupom',    w: 6,   color: '#FFB3C7' },
  ];
  const N = PRIZES.length, SEG = TAU / N, JACK = 4;
  const TOTAL_W = PRIZES.reduce((a, p) => a + p.w, 0);

  WH.cost = function () {
    const n = PS.S.daily.spins;
    return n === 0 ? 0 : Math.min(160, 10 * Math.pow(2, n - 1));
  };

  const cv = $('wheel-cv');
  const ctx = cv.getContext('2d');
  let SIZE = 300, DPR = 1;

  function resize() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    SIZE = Math.max(10, r.width);
    cv.width = SIZE * DPR;
    cv.height = SIZE * DPR;
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    const c = SIZE / 2, R = c - 6;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(WH.rot);
    PRIZES.forEach((p, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, i * SEG, (i + 1) * SEG);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.save();
      ctx.rotate((i + 0.5) * SEG);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(R * 0.2) + 'px sans-serif';
      ctx.fillText(p.icon, R * 0.68, 0);
      ctx.rotate(Math.PI / 2);
      ctx.font = Math.round(R * 0.1) + "px 'Lilita One', sans-serif";
      ctx.fillStyle = C.ink;
      ctx.fillText(p.label, 0, -R * 0.42);
      ctx.restore();
    });
    // pinos na borda
    for (let i = 0; i < N; i++) {
      const a = i * SEG;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2), 5, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, TAU);
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, R * 0.16, 0, TAU);
    ctx.fillStyle = C.red;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = Math.round(R * 0.14) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐦', c, c + 1);
  }

  // Índice do prêmio sob o ponteiro (no topo).
  function underPointer(rot) {
    let a = (-Math.PI / 2 - rot) % TAU;
    if (a < 0) a += TAU;
    return Math.floor(a / SEG) % N;
  }

  function pickPrize() {
    let x = Math.random() * TOTAL_W;
    for (let i = 0; i < N; i++) {
      x -= PRIZES[i].w;
      if (x < 0) return i;
    }
    return 0;
  }

  function renderInfo(msg) {
    const cost = WH.cost();
    const odds = PRIZES.map(p => p.icon + ' ' + p.label + ' ' + (p.w / TOTAL_W * 100).toFixed(p.w < 2 ? 1 : 0).replace('.', ',') + '%').join(' · ');
    $('wh-odds').textContent = odds;
    $('wh-result').innerHTML = msg || '';
    const spin = $('wh-spin');
    spin.textContent = cost === 0 ? 'GIRAR GRÁTIS!' : 'GIRAR · 🪙 ' + cost;
    spin.disabled = WH.spinning || PS.S.coins < cost;
    $('wh-close').disabled = WH.spinning;
    $('wh-coins').textContent = '🪙 ' + fmt(PS.S.coins);
  }

  WH.open = function () {
    PS.audio.init();
    $('wheel').hidden = false;
    resize();
    draw();
    renderInfo(PS.S.daily.spins === 0 ? '<b>Giro grátis de hoje!</b>' : '');
  };

  WH.close = function () {
    if (WH.spinning) return;
    $('wheel').hidden = true;
    PS.meta.renderDaily();
    PS.ui.refresh();
  };

  WH.spin = function () {
    if (WH.spinning) return;
    const S = PS.S, cost = WH.cost();
    if (S.coins < cost) { PS.audio.error(); return; }
    S.coins -= cost;
    S.daily.spins++;
    S.stats.spins = (S.stats.spins || 0) + 1;
    WH.spinning = true;
    renderInfo('');

    const k = pickPrize();
    // Onde parar dentro da fatia; nas vizinhas do jackpot, às vezes para colado nele.
    let f = PS.rand(0.2, 0.8);
    if (k === JACK + 1 && Math.random() < 0.6) f = PS.rand(0.04, 0.1);
    if (k === JACK - 1 && Math.random() < 0.6) f = PS.rand(0.9, 0.96);
    const base = -Math.PI / 2 - (k + f) * SEG;
    let target = base;
    while (target < WH.rot + TAU * 5) target += TAU;
    const start = WH.rot, dur = 5200, t0 = performance.now();
    let last = underPointer(start);
    const ptr = $('wh-pointer');

    function step(now) {
      const u = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - u, 4);
      WH.rot = start + (target - start) * e;
      const idx = underPointer(WH.rot);
      if (idx !== last) {
        last = idx;
        PS.audio.tone(1400 + (idx === JACK ? 500 : 0), 0.025, { type: 'square', vol: 0.06 });
        ptr.classList.remove('flap');
        void ptr.offsetWidth;
        ptr.classList.add('flap');
      }
      draw();
      if (u < 1) requestAnimationFrame(step);
      else finish(k, f);
    }
    requestAnimationFrame(step);
  };

  function finish(k, f) {
    WH.spinning = false;
    const p = PRIZES[k], S = PS.S;
    const near = (k === JACK + 1 && f < 0.12) || (k === JACK - 1 && f > 0.88);
    let msg = '', box = null;
    if (p.id === 'grana') {
      const g = Math.max(500, Math.round(PS.pps() / PS.market.tempMult() * 900));
      PS.earn(g);
      msg = '💸 +' + fmt(g) + ' de grana';
    } else if (p.id === 'c10' || p.id === 'c25') {
      const n = p.id === 'c10' ? 10 : 25;
      PS.addCoins(n);
      msg = '🪙 +' + n + ' PomboCoin';
    } else if (p.id === 'cupom') {
      S.cupons++;
      msg = '🎫 +1 Cupom Dourado';
    } else if (p.id === 'boost') {
      S.rodaUntil = Math.max(Date.now(), S.rodaUntil || 0) + 10 * 60 * 1000;
      msg = '⚡ Produção x2 por 10 minutos!';
    } else if (p.id === 'camelo' || p.id === 'maleta') {
      box = p.id;
      msg = (p.id === 'camelo' ? '📦 Caixa do Camelô' : '💼 Maleta Executiva') + ' grátis!';
    } else if (p.id === 'jackpot') {
      msg = '👑 JACKPOT! Item Lendário garantido!';
    }
    if (near) msg += '<br><small>Passou raspando no JACKPOT…</small>';
    renderInfo('<b>' + msg + '</b>');

    const r = cv.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + 10;
    if (p.id === 'jackpot') {
      PS.fx.banner('JACKPOT!', 'item Lendário garantido', C.gold);
      PS.fx.confetti(150);
      PS.fx.flash('#FFE27A', 0.8);
      PS.audio.promote();
    } else {
      PS.fx.burst(x, y, 20, { speed: 500 });
      PS.fx.confetti(near ? 20 : 40);
      PS.audio.coins();
      if (near) PS.pombo.say('QUASE! Mais um giro…', 2.6);
    }
    if (box || p.id === 'jackpot') {
      setTimeout(() => {
        $('wheel').hidden = true;
        if (p.id === 'jackpot') PS.loot.openForced(4);
        else PS.loot.buy(box, true);
      }, 1300);
    }
  }

  $('wh-spin').addEventListener('click', WH.spin);
  $('wh-close').addEventListener('click', WH.close);
  window.addEventListener('resize', () => { if (!$('wheel').hidden) { resize(); draw(); } });

  // Bônus x2 da roda entra no multiplicador temporário do mercado.
  WH.boostLeft = () => Math.max(0, ((PS.S.rodaUntil || 0) - Date.now()) / 1000);
})();
