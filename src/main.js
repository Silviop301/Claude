// Loop principal, entrada do jogador e momentos de celebração.
(function () {
  const B = PS.BUSINESSES, fx = PS.fx, fmt = PS.fmt;
  const T = { refresh: 0, flow: 0, save: 5, phrase: 10, news: 45 };
  PS.combo = 0;
  PS.lastTapAt = 0;
  PS.idle = 0;

  function vibrate(p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ok */ }
  }

  function coinsToCounter(x, y, n) {
    const [tx, ty] = PS.ui.counterPos();
    for (let k = 0; k < n; k++) fx.homing(x, y, tx, ty, PS.ui.bumpCounter, k * 0.05);
  }
  PS.coinsToCounter = coinsToCounter;

  const NERVOUS = ['Calma, é só uma correção…', 'HODL! Não vendo nem a pau.', 'Tá tudo sob controle. Acho.', 'Isso é temporário. Né?'];

  PS.onShark = function () {
    PS.meta.track('shark', 1);
    fx.banner('MODO TUBARÃO!', 'produção x5 por 30s', '#40C8FF');
    fx.flash('#9EEBFF', 0.6);
    fx.shake(10);
    fx.confetti(50);
    PS.audio.shark();
    PS.pombo.celebrate(1.6);
    PS.pombo.say('Agora eu como os peixes grandes.', 2.8);
    vibrate([20, 30, 20]);
  };

  PS.onSell = function (profit, ret, reason) {
    const p = PS.pombo.screenPos();
    const pct = Math.round((ret - 1) * 100);
    if (profit >= 0) {
      fx.banner(reason === 'top' ? 'VENDEU NO TOPO!' : 'POSIÇÃO FECHADA', '+' + fmt(profit) + ' (+' + pct + '%)', PS.C.green);
      fx.confetti(reason === 'top' ? 60 : 25);
      coinsToCounter(p.x, p.y, 10);
      PS.audio.coins();
      PS.pombo.setMood('stonks', 1.6);
      PS.pombo.say('Comprei na baixa, vendi na alta. Gênio.', 2.8);
    } else {
      fx.banner('POSIÇÃO FECHADA', fmt(profit) + ' (' + pct + '%)', PS.C.red);
      PS.audio.scam();
      PS.pombo.setMood('notstonks', 2);
      PS.pombo.say('O mercado não me entende.', 2.6);
    }
  };

  PS.onMarketZone = function (zone) {
    if (zone === 'high') {
      PS.ui.toast('📈', 'Mercado em alta! Produção multiplicada');
      PS.pombo.setMood('stonks', 1.4);
      PS.audio.unlock();
    } else if (zone === 'low') {
      PS.ui.toast('📉', 'Mercado caindo! Hora de comprar na baixa?');
      if (PS.pombo.mood !== 'sleep') PS.pombo.say(PS.pick(NERVOUS), 2.8);
    }
  };

  PS.tap = function (x, y) {
    PS.audio.init();
    const S = PS.S, now = performance.now();
    PS.combo = now - PS.lastTapAt < 450 ? PS.combo + 1 : 1;
    PS.lastTapAt = now;
    if (PS.combo > S.bestCombo) S.bestCombo = PS.combo;
    const comboMult = 1 + Math.min(PS.combo, 100) / 100;
    const r = Math.random();
    const critChance = 0.05 + (PS.B ? PS.B.crit : 0) / 100;
    const crit = r < 0.005 ? 2 : r < critChance ? 1 : 0;
    const v = PS.tapBase() * comboMult * (crit === 2 ? 100 : crit === 1 ? 10 : 1);
    PS.earn(v);
    S.taps++;
    if (crit) S.crits++;
    PS.meta.track('tap', 1);
    if (crit) PS.meta.track('crit', 1);
    PS.meta.track('combo', PS.combo);

    PS.idle = 0;
    const P = PS.pombo;
    if (P.mood === 'sleep') P.wake();

    if (crit === 0) {
      fx.text(x + PS.rand(-12, 12), y - 24, '+' + fmt(v, true), { size: 24 + Math.min(PS.combo, 40) * 0.35 });
      fx.burst(x, y, 4, { speed: 320 });
      PS.audio.tap(PS.combo);
      P.hit(false);
      coinsToCounter(x, y, 1);
    } else if (crit === 1) {
      fx.text(x, y - 34, '+' + fmt(v, true), { size: 40, color: PS.C.gold, life: 1.3 });
      fx.banner('STONKS!', 'CRÍTICO x10', PS.C.green);
      fx.burst(x, y, 16, { speed: 540 });
      fx.shake(8);
      PS.audio.crit();
      P.hit(true);
      P.setMood('stonks', 1.2);
      vibrate(20);
      coinsToCounter(x, y, 5);
    } else {
      fx.text(x, y - 40, '+' + fmt(v, true), { size: 52, color: PS.C.gold, life: 1.6 });
      fx.banner('MEGA STONKS!!', 'CRÍTICO x100', PS.C.gold);
      fx.burst(x, y, 34, { speed: 700 });
      fx.confetti(70);
      fx.flash('#FFE27A', 0.6);
      fx.shake(16);
      PS.audio.superCrit();
      P.hit(true);
      P.setMood('stonks', 2);
      P.say('EU SOU O MERCADO!', 2.5);
      PS.addCoins(2, x, y + 30);
      vibrate([30, 40, 30]);
      coinsToCounter(x, y, 12);
    }
    PS.market.sharkTap();
    PS.events.onTap();
    if (Math.random() < 0.002) {
      PS.addCupons(1);
      PS.pombo.say('Achei um cupom no chão da praça!', 2.6);
    }
    PS.ui.combo(PS.combo);
    PS.ui.tapped();
  };

  PS.onBuy = function (i, btn) {
    PS.audio.init();
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const res = PS.buy(i);
    if (!res) {
      PS.audio.error();
      PS.ui.flashRow(i, 'no');
      return;
    }
    PS.idle = 0;
    PS.meta.track('buy', res.n);
    if (PS.pombo.mood === 'sleep') PS.pombo.wake();
    PS.audio.buy();
    fx.burst(cx, cy, 8 + Math.min(res.n, 12), { shape: 'bill', speed: 380 });
    fx.text(cx - 30, cy - 26, '+' + fmt(res.gain, true) + '/s', { size: 22, color: PS.C.green });
    PS.ui.flashRow(i, 'bought');
    PS.pombo.hop();
    if (res.before === 0) {
      PS.ui.toast('🎉', 'Abriu o negócio: ' + B[i].name + ' · +5 🪙');
      PS.addCoins(5, cx, cy - 50);
      PS.pombo.say(i === 0 ? 'Meu primeiro negócio! Mãe, tô na bolsa!' : 'Novo negócio, novo eu.', 2.8);
    }
    res.crossed.forEach((m, k) => setTimeout(() => celebrateMilestone(i, m), 250 + k * 800));
    PS.ui.refresh();
    checkProgress();
  };

  PS.celebrate = (i, m) => celebrateMilestone(i, m);
  function celebrateMilestone(i, m) {
    fx.banner('x' + m.x + '!', B[i].name + ': ' + m.at + ' unidades', PS.C.gold);
    fx.flash('#FFF3B0', 0.55);
    fx.confetti(45);
    fx.shake(6);
    PS.audio.milestone();
    PS.pombo.celebrate(1.6);
    PS.pombo.say(PS.pick(PS.MILESTONE_LINES), 2.4);
    PS.ui.toast('⭐', 'Marco! ' + B[i].name + ' agora produz x' + m.x + ' · +5 🪙', 'gold');
    PS.addCoins(5);
    vibrate(25);
  }

  function checkProgress() {
    const S = PS.S;
    PS.checkReveal().forEach(i => {
      PS.audio.unlock();
      PS.ui.toast('🔓', 'Novo negócio à vista: ' + B[i].name);
    });

    if (PS.checkStage()) {
      const st = PS.STAGES[S.stage];
      setTimeout(() => {
        fx.banner('PROMOVIDO!', st.title, PS.C.gold);
        fx.flash('#FFE27A', 0.7);
        fx.confetti(130);
        fx.shake(12);
        PS.audio.promote();
        PS.pombo.celebrate(2.4);
        PS.pombo.say('Agora é ' + st.title + ', meu bem.', 3.2);
        PS.ui.toast('👔', 'Promoção! Você ganhou ' + st.acc + ' · +30 🪙', 'gold');
        PS.addCoins(30);
        PS.addCupons(1);
        vibrate([40, 60, 40]);
      }, 300);
    }

    const tier = PS.tierOf(S.money);
    if (tier > S.maxTier) {
      S.maxTier = tier;
      if (tier >= 2) {
        PS.ui.toast('💰', 'Você chegou na casa dos ' + (PS.TIER_NAMES[tier] || 'ZILHÕES') + '!', 'gold');
        PS.ui.bigBump();
        PS.audio.coins();
      }
    }
  }

  PS.collectOffline = function (gain) {
    PS.earn(gain);
    const p = PS.pombo.screenPos();
    coinsToCounter(p.x, p.y, 24);
    fx.burst(p.x, p.y, 30, { speed: 600 });
    fx.banner('+' + fmt(gain), 'rendimento enquanto você dormia', PS.C.green);
    fx.confetti(60);
    PS.audio.init();
    PS.audio.coins();
    PS.pombo.celebrate(1.8);
    PS.pombo.say('Dinheiro trabalhando por mim. Clássico.', 3);
    checkProgress();
  };

  PS.reset = function () {
    PS.wipe();
    PS.S = PS.newState();
    PS.S.sound = PS.audio.on;
    PS.recalcBonuses();
    PS.market.init();
    PS.recalc();
    PS.ui.close();
    PS.meta.loginShown = false;
    PS.meta.startDay(true);
    PS.ui.init();
    document.getElementById('tap-hint').hidden = false;
    PS.pombo.say('Recomeçando do farelo.', 3);
  };

  function handleAway(sec) {
    const r = PS.offlineGain(sec);
    if (r.gain <= 0) return;
    if (sec >= 60) PS.ui.offlineModal(r);
    else PS.earn(r.gain);
  }

  function frame() {
    const S = PS.S, now = Date.now();
    let dt = (now - S.lastTick) / 1000;
    S.lastTick = now;
    if (dt > 10) {
      handleAway(dt);
      dt = 0;
    }
    dt = Math.max(0, Math.min(dt, 10));
    const vdt = Math.min(dt, 0.1); // passo visual

    PS.market.update(dt);
    PS.events.update(dt);
    PS.mba.update(dt);
    PS.recalc();
    if (PS.cachedPps > 0) PS.earn(PS.cachedPps * dt);
    S.playTime += dt;
    PS.idle += dt;

    // Fluxo passivo: número subindo do pombo e moedas voando pro contador.
    T.flow += dt;
    if (T.flow >= 1 && PS.cachedPps > 0) {
      T.flow = 0;
      const p = PS.pombo.screenPos();
      fx.text(p.x + PS.rand(-30, 30), p.y - 20, '+' + fmt(PS.cachedPps, true), { size: 18, color: '#C9FFD9', vy: -70, life: 1.1 });
      coinsToCounter(p.x, p.y, Math.min(4, 1 + Math.floor(Math.log10(PS.cachedPps + 1) / 2)));
    }

    T.refresh -= dt;
    if (T.refresh <= 0) {
      T.refresh = 0.1;
      PS.ui.refresh();
      checkProgress();
    }

    T.phrase -= dt;
    if (T.phrase <= 0) {
      T.phrase = PS.rand(18, 32);
      if (PS.pombo.mood !== 'sleep' && S.taps > 0) PS.pombo.say(PS.pick(PS.pombo.nervous ? NERVOUS : PS.COACH), 3.8);
    }

    T.news -= dt;
    if (T.news <= 0) {
      T.news = PS.rand(50, 100);
      if (S.lifetime > 100) {
        const [ic, txt] = PS.pick(PS.NEWS);
        PS.ui.toast(ic, txt);
      }
    }

    T.meta = (T.meta || 0) - dt;
    if (T.meta <= 0) {
      T.meta = 1;
      PS.meta.tick();
      PS.mba.tick();
      if (PS.loot.busy === false && document.getElementById('opener').hidden) PS.checkSets();
    }

    T.save -= dt;
    if (T.save <= 0) {
      T.save = 5;
      PS.save();
    }

    PS.pombo.update(vdt);
    PS.pombo.draw();
    PS.market.draw(vdt);
    fx.update(vdt);
    PS.ui.frame(vdt);

    const app = document.getElementById('app');
    if (fx.shakeAmt > 0.2) {
      const a = fx.shakeAmt;
      app.style.transform = 'translate(' + PS.rand(-a, a).toFixed(1) + 'px,' + PS.rand(-a, a).toFixed(1) + 'px)';
    } else if (app.style.transform) {
      app.style.transform = '';
    }

    requestAnimationFrame(frame);
  }

  function bindInput() {
    const stage = document.getElementById('stage-wrap');
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      PS.tap(e.clientX, e.clientY);
    });
    document.getElementById('dica').addEventListener('click', e => {
      const r = e.currentTarget.getBoundingClientRect();
      PS.events.clickDica(r.left + r.width / 2, r.top + r.height / 2);
    });
    document.getElementById('encomenda').addEventListener('click', () => PS.events.clickEncomenda());
    document.getElementById('op-box').addEventListener('click', () => PS.loot.tapBox());
    document.getElementById('dip').addEventListener('click', e => {
      PS.audio.init();
      const r = e.currentTarget.getBoundingClientRect();
      const pos = PS.market.buyDip();
      if (!pos) return;
      PS.audio.buy();
      fx.burst(r.left + r.width / 2, r.top, 12, { shape: 'bill', speed: 380 });
      fx.text(r.left + r.width / 2, r.top - 20, '-' + fmt(pos.amt), { size: 26, color: PS.C.red });
      PS.pombo.say('Comprei na baixa. Agora é esperar.', 2.6);
      PS.ui.refresh();
    });
    const setW = () => stage.style.setProperty('--stage-w', stage.clientWidth + 'px');
    window.addEventListener('resize', setW);
    setW();
    stage.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        const p = PS.pombo.screenPos();
        PS.tap(p.x + PS.rand(-40, 40), p.y + PS.rand(-20, 30));
      }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) PS.save(); });
    window.addEventListener('pagehide', PS.save);
  }

  function start(data) {
    PS.S = PS.normalize((data && data.state) || PS.load() || PS.newState());
    PS.audio.on = PS.S.sound;
    PS.recalcBonuses();
    PS.market.init();
    PS.recalc();
    PS.ui.init();
    if (PS.S.taps >= 3) document.getElementById('tap-hint').hidden = true;
    bindInput();

    const away = (Date.now() - PS.S.lastTick) / 1000;
    PS.S.lastTick = Date.now();
    if (away > 30) handleAway(away);
    else if (PS.S.taps === 0) setTimeout(() => PS.pombo.say('Bora ficar rico? Toca em mim!', 4), 600);
    PS.meta.loginShown = false;
    PS.meta.startDay(true);

    try {
      if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
        window.claude.hot.snapshot(() => ({ state: PS.S }));
      }
    } catch (e) { /* ok */ }

    requestAnimationFrame(frame);
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start);
  else start(hot && hot.data ? hot.data : {});
})();
