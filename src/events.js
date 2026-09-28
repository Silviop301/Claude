// Eventos aleatórios: Dica Quente do Zap, Bull Run, Crash e TO THE MOON.
(function () {
  const M = PS.market, fx = PS.fx, fmt = PS.fmt;
  const $ = id => document.getElementById(id);
  const E = PS.events = { next: 35, dica: null, crash: null };

  const TIPS = [
    '"compra $PRU AGORA, confia"',
    '"meu primo trabalha no banco…"',
    '"vai subir 1000%, fonte: vozes"',
    '"sinal VIP: BRIGADEIRO 🚀"',
    '"o pombo da praça ao lado vendeu tudo"',
    '"áudio de 7 minutos, escuta aí"',
  ];

  const WEIGHTS = [['dica', 40], ['bull', 20], ['crash', 20], ['encomenda', 16], ['moon', 4]];

  function pickEvent() {
    const total = WEIGHTS.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of WEIGHTS) {
      r -= w;
      if (r < 0) return k;
    }
    return 'dica';
  }

  E.update = function (dt) {
    if (!$('modal').hidden) return;
    if (E.dica) {
      E.dica.t -= dt;
      if (E.dica.t <= 0) endDica();
    }
    if (E.enc) {
      E.enc.t -= dt;
      if (E.enc.t <= 0) endEncomenda();
    }
    if (E.crash) {
      E.crash.t -= dt;
      $('crash-fill').style.width = Math.min(100, E.crash.taps / E.crash.need * 100) + '%';
      $('crash-txt').textContent = 'Toque rápido! ' + Math.ceil(Math.max(0, E.crash.t)) + 's';
      if (E.crash.t <= 0) endCrash(false);
    }
    if (PS.S.lifetime < 200) return;
    E.next -= dt;
    if (E.next <= 0) {
      E.next = PS.rand(45, 95) / (1 + (PS.B ? PS.B.event : 0) / 100);
      E.fire(pickEvent());
    }
  };

  E.fire = function (kind) {
    if (kind === 'dica') startDica();
    else if (kind === 'bull') startBull();
    else if (kind === 'crash') startCrash();
    else if (kind === 'moon') startMoon();
    else if (kind === 'encomenda') startEncomenda();
  };

  E.onTap = function () {
    if (E.crash) {
      E.crash.taps++;
      if (E.crash.taps >= E.crash.need) endCrash(true);
    }
  };

  // ---------- Dica Quente do Zap ----------
  function startDica() {
    if (E.dica) return;
    const el = $('dica');
    el.querySelector('.dica-txt').textContent = PS.pick(TIPS);
    el.hidden = false;
    el.classList.remove('fly');
    void el.offsetWidth;
    el.classList.add('fly');
    E.dica = { t: 9 };
    PS.audio.notif();
  }

  function endDica() {
    $('dica').hidden = true;
    E.dica = null;
  }

  E.clickDica = function (x, y) {
    if (!E.dica) return;
    endDica();
    PS.audio.init();
    const S = PS.S;
    if (Math.random() < 0.17 && S.money > 50) {
      const loss = Math.min(S.money * 0.1, Math.max(PS.cachedPps * 300, 50));
      S.money = Math.max(0, S.money - loss);
      S.stats.golpes++;
      fx.text(x, y, '-' + fmt(loss), { size: 36, color: PS.C.red, life: 1.4 });
      fx.banner('ERA GOLPE!', 'NOT STONKS', PS.C.red);
      fx.shake(10);
      PS.audio.scam();
      PS.pombo.setMood('notstonks', 2.2);
      PS.pombo.say(PS.pick(['Mas o áudio parecia tão confiável…', 'Nunca mais confio no Zap.', 'Meu primo me paga.']), 3);
      PS.ui.toast('🚨', 'Golpe do Zap! Você perdeu ' + fmt(loss));
    } else {
      const gain = Math.max(PS.cachedPps * 600, PS.tapBase() * 40);
      PS.earn(gain);
      S.stats.dicas++;
      PS.meta.track('event', 1);
      fx.text(x, y, '+' + fmt(gain), { size: 40, color: PS.C.gold, life: 1.5 });
      fx.banner('DICA QUENTE!', '+' + fmt(gain) + ' (10 min de lucro)', PS.C.green);
      fx.burst(x, y, 24, { speed: 560 });
      PS.coinsToCounter(x, y, 10);
      PS.audio.coins();
      PS.pombo.setMood('stonks', 1.8);
      PS.pombo.say('Informação privilegiada, meu bem.', 2.6);
      PS.addCoins(3, x, y + 40);
    }
  };

  // ---------- Bull Run ----------
  function startBull() {
    M.force(3.0, 45, 0.9);
    M.addBoost('bull', '🐂', 'Bull Run', 1, 45);
    fx.banner('BULL RUN!', 'mercado disparando por 45s', PS.C.green);
    fx.flash('#B8FFD2', 0.5);
    fx.confetti(40);
    PS.audio.bull();
    PS.pombo.celebrate(1.6);
    PS.pombo.say('O touro chegou! Segura!', 2.6);
    PS.ui.toast('🐂', 'Bull Run! O mercado vai subir por 45s', 'gold');
  }

  // ---------- Crash ----------
  function startCrash() {
    if (E.crash || M.hasBoost('bull')) return startDica();
    M.force(0.42, 12, 3);
    E.crash = { t: 10, taps: 0, need: 35 };
    $('crash').hidden = false;
    fx.banner('CRASH!', 'toque rápido para segurar o mercado', PS.C.red);
    fx.shake(12);
    fx.flash('#FF9AAE', 0.45);
    PS.audio.alarm();
    PS.pombo.say('SEGURA! SEGURA!', 2.5);
  }

  function endCrash(ok) {
    E.crash = null;
    $('crash').hidden = true;
    if (ok) {
      M.force(2.6, 18, 2);
      const gain = Math.max(PS.cachedPps * 120, PS.tapBase() * 20);
      PS.earn(gain);
      PS.S.stats.holds++;
      PS.meta.track('event', 1);
      PS.addCoins(8);
      if (Math.random() < 0.2) PS.addCupons(1);
      fx.banner('SEGUROU!', 'o mercado voltou e você lucrou +' + fmt(gain), PS.C.gold);
      fx.confetti(70);
      fx.flash('#FFF3B0', 0.5);
      PS.audio.milestone();
      PS.pombo.celebrate(1.8);
      PS.pombo.say('Mãos de diamante!', 2.6);
      const p = PS.pombo.screenPos();
      PS.coinsToCounter(p.x, p.y, 12);
    } else {
      M.target = null;
      PS.ui.toast('🐻', 'O mercado derreteu… mas sempre volta.');
      PS.pombo.say('É só uma correção. Normal.', 2.6);
    }
  }

  // ---------- TO THE MOON ----------
  function startMoon() {
    M.addBoost('moon', '🚀', 'TO THE MOON', 77, 7);
    M.force(3.2, 7, 4);
    fx.banner('TO THE MOON!', 'produção x77 por 7s', PS.C.gold);
    fx.flash('#FFE27A', 0.8);
    fx.confetti(140);
    fx.shake(18);
    fx.rocket();
    PS.audio.moon();
    PS.pombo.celebrate(2.5);
    PS.pombo.say('HOUSTON, TEMOS LUCRO!', 3);
    PS.S.stats.moons++;
    PS.addCoins(15);
    PS.addCupons(1);
  }

  // ---------- Encomenda Suspeita (caixa grátis) ----------
  function startEncomenda() {
    if (E.enc) return startDica();
    const el = $('encomenda');
    el.hidden = false;
    el.classList.remove('fly');
    void el.offsetWidth;
    el.classList.add('fly');
    E.enc = { t: 8 };
    PS.audio.notif();
  }

  function endEncomenda() {
    $('encomenda').hidden = true;
    E.enc = null;
  }

  E.clickEncomenda = function () {
    if (!E.enc) return;
    endEncomenda();
    PS.meta.track('event', 1);
    const r = Math.random();
    const box = r < 0.03 ? 'cofre' : r < 0.2 ? 'maleta' : 'camelo';
    PS.ui.toast('📦', 'Encomenda Suspeita! Caixa grátis: ' + PS.BOX_BY_ID[box].name, 'gold');
    PS.loot.buy(box, true);
  };
})();
