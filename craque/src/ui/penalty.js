// Interface — Pênalti da sorte (pranchas "Pacotinhos", seção 8): 1 chute por dia.
// Cada canto do gol esconde um prêmio. O prêmio de cada canto e se o goleiro pega são sorteados ANTES do toque
// (e guardados no aparelho, para não dar para sortear de novo fechando a tela): a animação só mostra o que já foi decidido.
(function () {
  const U = window.CRAQUE_UI;
  const { $, esc, sfx, render, bar, G } = U;
  const I = U.ITEMS;
  const K = () => window.CRAQUE_KICK_PARTS;

  // Chances de cada canto (somam 100) e do goleiro pegar
  const PRIZES = [['comum', 'Item comum', 40], ['fichas', 'Fichas', 30], ['raro', 'Item raro', 18], ['pacote', 'Pacotinho', 8], ['epico', 'Item épico', 4]];
  const SAVE_CHANCE = 0.25, FICHAS = 5, CONSOLO = 2;
  const COLOR = { comum: '#C98A5A', fichas: '#EDE6D2', raro: '#C9D1D8', pacote: '#22A45D', epico: '#F2C230' };
  // Cantos no desenho do gol (x de -1 a 1, y de 0 a 1)
  const CORNERS = [[-0.72, 0.74], [0.72, 0.74], [-0.72, 0.26], [0.72, 0.26]];

  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ready = () => I.get().pen !== today();
  function rollPrize() {
    let r = Math.random() * 100;
    for (const p of PRIZES) { if (r < p[2]) return p[0]; r -= p[2]; }
    return 'comum';
  }
  // Sorteio do dia: feito uma vez, antes de qualquer toque
  function draw() {
    const inv = I.get();
    if (!inv.penDraw || inv.penDraw.day !== today()) { inv.penDraw = { day: today(), prizes: CORNERS.map(rollPrize), saved: Math.random() < SAVE_CHANCE }; I.put(); }
    return inv.penDraw;
  }
  const label = k => PRIZES.find(p => p[0] === k)[1];
  const legend = () => '<div class="pen-leg">' + PRIZES.map(([k, l, c]) => '<span><i style="background:' + COLOR[k] + '"></i>' + l + '<b>' + c + '%</b></span>').join('') + '</div>' +
    '<p class="pen-note">O goleiro pega 1 a cada 4 chutes. Se pegar, você leva ' + CONSOLO + ' fichas.</p>';

  function penalty() {
    G.c = null; G.step = null; bar();
    if (!ready()) return tomorrow();
    const d = draw();
    const Kp = K();
    render('<button class="back-link" id="b-back-home">‹ Início</button><div class="eyebrow">Pênalti da sorte · 1 chute por dia</div><h2>Escolha um canto</h2>' +
      '<div class="pen-stage" id="pen-stage">' + Kp.scene({ fk: false }, 1) +
      CORNERS.map(([x, y], i) => '<button class="pen-c" data-i="' + i + '" style="left:' + (Kp.px(x) / 3.6) + '%;top:' + (Kp.py(y) / 3.2) + '%" aria-label="Chutar neste canto"><span class="pen-q">?</span></button>').join('') +
      '<div class="pen-banner" id="pen-banner"></div></div>' +
      '<div class="pen-box">' + legend() + '</div>' +
      '<div id="pen-after"><button class="btn" id="pen-hint" disabled>Toque num canto para chutar</button></div>');
    $('b-back-home').onclick = U.home;
    const svg = document.querySelector('#pen-stage svg'), ball = svg.querySelector('#k-ball'), shadow = svg.querySelector('#k-shadow');
    svg.querySelector('#k-aim').setAttribute('opacity', '0');
    const spr = Kp.keeperSprite(svg);
    spr.stand(Kp.GX); spr.idle();
    Kp.setBall(ball, Kp.BALL.x, Kp.BALL.y, Kp.BALL.r);
    let done = false;
    document.querySelectorAll('.pen-c').forEach(b => b.onclick = () => {
      if (done) return;
      done = true;
      const i = +b.dataset.i, [cx, cy] = CORNERS[i], inv = I.get();
      inv.pen = today(); I.put(); // o chute do dia foi usado
      b.classList.add('aim');
      shoot(i, cx, cy, d.saved);
    });

    function shoot(i, cx, cy, saved) {
      sfx('kick');
      const tx = Kp.px(cx), ty = Kp.py(cy);
      // Goleiro: se pega, vai no canto certo; se não, pula para o outro lado
      const kx = saved ? tx : Kp.px(-cx * 0.8), ky = saved ? ty : Kp.py(0.5);
      spr.dive(kx, ky, (saved ? cx : -cx) < 0 ? -1 : 1, 420, 60);
      const t0 = performance.now(), ms = 520, x0 = Kp.BALL.x, y0 = Kp.BALL.y;
      const step = now => {
        if (!svg.isConnected) return;
        const u = Math.min(1, (now - t0) / ms), e = Kp.ease(u);
        const x = x0 + (tx - x0) * e, y = y0 + (ty - y0) * e - Math.sin(u * Math.PI) * 30;
        Kp.setBall(ball, x, y, Kp.BALL.r - 3.5 * e);
        if (shadow) { shadow.setAttribute('cx', x); shadow.setAttribute('opacity', 1 - e * .7); }
        if (u < 1) requestAnimationFrame(step); else land();
      };
      requestAnimationFrame(step);
      function land() {
        const ban = $('pen-banner');
        if (saved) { sfx('miss'); ban.textContent = 'DEFENDEU!'; ban.className = 'pen-banner on bad'; Kp.setBall(ball, tx + (cx < 0 ? 40 : -40), ty + 60, 7); }
        else { sfx('goal'); U.vibe([30, 40, 30]); ban.textContent = 'GOL!'; ban.className = 'pen-banner on'; }
        // Os outros três cantos se viram: não era tudo igual
        setTimeout(() => {
          document.querySelectorAll('.pen-c').forEach((c, k) => {
            const p = d.prizes[k];
            c.classList.add('open'); c.style.setProperty('--pc', COLOR[p]);
            c.innerHTML = '<span class="pen-p">' + label(p) + '</span>';
            if (k === i) c.classList.add(saved ? 'miss' : 'won');
          });
          sfx('coin');
          prize(i, saved);
        }, 700);
      }
    }
    function prize(i, saved) {
      const p = d.prizes[i];
      let res, html;
      if (saved) { res = I.grant('fichas', null, CONSOLO); html = resultBox('O goleiro pegou', '<div class="pen-fichas">' + U.emo('🎟️', 'lg') + '<b>+' + CONSOLO + ' fichas</b></div>', 'Fichas compram itens em Meus itens.'); }
      else if (p === 'fichas') { res = I.grant('fichas', null, FICHAS); html = resultBox('Gol! Saíram fichas', '<div class="pen-fichas">' + U.emo('🎟️', 'lg') + '<b>+' + FICHAS + ' fichas</b></div>', 'Fichas compram itens em Meus itens.'); }
      else if (p === 'pacote') { res = I.grant('pacote'); html = resultBox('Gol! Saiu um pacotinho', '<div class="pen-pack">' + '<div class="pk-pack mini"><div class="pk-env"><span class="pk-k"></span><b class="pk-logo">CLIMBIX</b><span class="pk-band"></span></div></div></div>', 'Abra agora ou depois, pela tela inicial.'); }
      else {
        res = I.grant('item', p);
        const it = res.it;
        html = resultBox('Gol! Saiu um item ' + I.RAR_NAME[it.rk].toLowerCase(),
          '<div class="pk-tile ' + U.rarCls(it.rk) + ' pen-tile"><div class="pk-in"><img src="' + U.itemImg(it) + '" alt=""></div>' + (res.dup ? '' : '<span class="pk-new sm">NOVO</span>') + '</div>' +
          '<b class="pen-name">' + esc(it.name) + '</b>' + U.raritySelo(it.rk),
          res.dup ? 'Você já tinha. Virou ' + res.fichas + (res.fichas > 1 ? ' fichas.' : ' ficha.') : esc(it.desc));
      }
      const after = $('pen-after');
      after.innerHTML = html +
        (!saved && p === 'pacote' ? '<button class="btn" id="pen-open">Abrir agora</button>' : !saved && res.it && !res.dup ? '<button class="btn" id="pen-wear">Ver no meu jogador</button>' : '') +
        '<button class="btn ghost" id="pen-home">Voltar para o início</button>';
      after.querySelector('.pen-res').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      $('pen-home').onclick = U.home;
      if ($('pen-open')) $('pen-open').onclick = () => U.openPacks(U.home);
      if ($('pen-wear')) $('pen-wear').onclick = () => U.createWith([res.it]);
    }
  }
  const resultBox = (t, art, sub) => '<div class="pen-res"><span class="pen-rt">' + t + '</span>' + art + '<span class="pen-sub">' + sub + '</span></div>';

  // Já chutou hoje: contagem até meia-noite e a outra forma de ganhar pacote no mesmo dia
  function tomorrow() {
    render('<button class="back-link" id="b-back-home">‹ Início</button><div class="eyebrow">Pênalti da sorte</div><h2>Você já chutou hoje</h2>' +
      '<div class="pen-wait"><span>Próximo chute em</span><b id="pen-clock">--:--:--</b><small>Libera à meia-noite</small></div>' +
      '<div class="pen-box pen-mean"><b>Enquanto isso</b><span>A Carreira do dia vale 1 pacotinho.</span><button class="btn ghost" id="pen-daily">Jogar a carreira do dia</button></div>');
    $('b-back-home').onclick = U.home;
    $('pen-daily').onclick = () => { const sv = U.load(U.SAVE); if (!sv || !sv.c) return U.dailyStart(); U.ask('Começar a carreira do dia?', 'A carreira em andamento será substituída.', 'Começar', U.dailyStart); };
    const tick = () => {
      const el = $('pen-clock');
      if (!el) return clearInterval(t);
      const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), s = Math.max(0, Math.floor((mid - now) / 1000));
      el.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':');
      if (!s) { clearInterval(t); penalty(); }
    };
    const t = setInterval(tick, 1000); tick();
  }

  Object.assign(U, { penalty, penaltyReady: ready });
})();
