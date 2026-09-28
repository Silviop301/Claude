// Loot boxes: sorteio com pity, recompensas e a animação de abertura.
(function () {
  const R = PS.RARITIES, fx = PS.fx, fmt = PS.fmt;
  const $ = id => document.getElementById(id);
  const L = PS.loot = { busy: false };

  L.cost = function (box) {
    if (box.cur === 'grana') {
      const base = PS.pps() / PS.market.tempMult();
      return Math.max(250, Math.round(base * 150)) * (1 - PS.B.cameloDisc / 100);
    }
    return box.cost;
  };

  L.balance = function (cur) {
    const S = PS.S;
    return cur === 'grana' ? S.money : cur === 'coins' ? S.coins : S.cupons;
  };

  L.canAfford = function (box) {
    return L.balance(box.cur) + 1e-9 >= L.cost(box);
  };

  L.odds = function (minR) {
    const tot = R.reduce((a, r, i) => a + (i >= minR ? r.weight : 0), 0);
    return R.map((r, i) => (i >= minR ? r.weight / tot : 0));
  };

  function rollRarity(minR) {
    const S = PS.S;
    let r;
    if (S.pity >= PS.PITY - 1) {
      r = Math.random() < 0.9 ? 4 : 5;
    } else {
      const odds = L.odds(minR);
      let x = Math.random();
      r = minR;
      for (let i = 0; i < odds.length; i++) {
        x -= odds[i];
        if (x < 0) { r = i; break; }
      }
    }
    S.pity = r >= 4 ? 0 : S.pity + 1;
    return r;
  }

  function rollItem(r) {
    const pool = PS.ITEMS.filter(it => it.r === r);
    return PS.pick(pool);
  }

  // Aplica o item ao inventário e diz o que aconteceu.
  function grant(it) {
    const S = PS.S, lvl = S.inv[it.id] || 0;
    if (!lvl) {
      S.inv[it.id] = 1;
      S.newItems.push(it.id);
      return { status: 'new', text: 'NOVO!' };
    }
    if (lvl < PS.MAX_LEVEL) {
      S.inv[it.id] = lvl + 1;
      const far = 2 * (it.r + 1);
      S.farelo += far;
      return { status: 'up', text: 'Nível ' + (lvl + 1) + ' ↑ · +' + far + ' 🍞' };
    }
    const far = 5 * (it.r + 1) * (it.r + 1);
    S.farelo += far;
    return { status: 'farelo', text: '+' + far + ' 🍞 Farelo' };
  }

  L.roll = function (box) {
    const out = [];
    for (let i = 0; i < box.n; i++) out.push(rollRarity(box.minR));
    if (box.n > 1 && Math.max(...out) < 3) {
      out[out.length - 1] = rollRarity(3);
    }
    return out.map(r => {
      const it = rollItem(r);
      return { it, r, res: grant(it) };
    });
  };

  // Compra e abre. free=true para caixas ganhas em eventos.
  L.buy = function (boxId, free) {
    if (L.busy) return;
    const box = PS.BOX_BY_ID[boxId], S = PS.S;
    if (!free) {
      if (!L.canAfford(box)) {
        PS.audio.error();
        return;
      }
      const c = L.cost(box);
      if (box.cur === 'grana') S.money -= c;
      else if (box.cur === 'coins') S.coins -= c;
      else S.cupons -= c;
    }
    S.boxesOpened += box.n;
    PS.meta.track('box', box.n);
    const drops = L.roll(box);
    PS.recalcBonuses();
    PS.recalc();
    PS.save();
    open(box, drops);
  };

  // Abre uma caixa com raridade garantida (jackpot da roda).
  L.openForced = function (r) {
    if (L.busy) return;
    const it = rollItem(r);
    const drops = [{ it, r, res: grant(it) }];
    PS.S.pity = 0;
    PS.recalcBonuses();
    PS.recalc();
    PS.save();
    open(PS.BOX_BY_ID.cofre, drops);
  };

  // ---------- animação ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let tapResolve = null, taps = 0;

  function boxEl(box) {
    const el = $('op-box');
    el.className = 'op-box b-' + box.id;
    el.querySelector('.lbl').textContent = box.name;
  }

  function setRays(color, dark) {
    const o = $('opener');
    o.style.setProperty('--ray', color);
    o.classList.toggle('dark', !!dark);
  }

  function rarityColor(r) {
    return r === 5 ? 'conic-gradient(from 0deg, #FF4D6D, #FFC928, #2FD27A, #3D8BFF, #A64DFF, #FF4D6D)' : R[r].color;
  }

  function card(d, small) {
    const c = document.createElement('div');
    c.className = 'op-card r-' + R[d.r].id + (small ? ' small' : '');
    c.innerHTML =
      '<div class="oc-rar"></div><div class="oc-ico"></div><div class="oc-name"></div>' +
      (small ? '' : '<div class="oc-fx"></div>') + '<div class="oc-status"></div>';
    c.querySelector('.oc-rar').textContent = R[d.r].name;
    c.querySelector('.oc-ico').textContent = d.it.icon;
    c.querySelector('.oc-name').textContent = d.it.name;
    if (!small) c.querySelector('.oc-fx').textContent = PS.itemEffectText(d.it, PS.S.inv[d.it.id] || 1);
    const st = c.querySelector('.oc-status');
    st.textContent = d.res.text;
    st.classList.add(d.res.status);
    return c;
  }

  function revealSound(r) {
    const A = PS.audio;
    if (r <= 1) A.unlock();
    else if (r === 2) A.crit();
    else if (r === 3) A.milestone();
    else if (r === 4) A.promote();
    else { A.superCrit(); setTimeout(() => A.promote(), 500); }
  }

  function burstFor(r) {
    const b = $('op-box').getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    fx.burst(x, y, 10 + r * 8, { speed: 400 + r * 80 });
    if (r >= 2) fx.confetti(20 + r * 25);
    if (r >= 3) fx.shake(4 + r * 3);
    fx.flash(r === 5 ? '#FFD1F0' : R[r].color, 0.25 + r * 0.1);
  }

  async function open(box, drops) {
    L.busy = true;
    const o = $('opener');
    const best = Math.max(...drops.map(d => d.r));
    boxEl(box);
    $('op-cards').innerHTML = '';
    $('op-actions').innerHTML = '';
    $('op-box').hidden = false;
    $('op-hint').hidden = false;
    $('op-hint').textContent = 'Toque na caixa para abrir!';
    setRays('rgba(255,255,255,0.5)', false);
    o.classList.remove('reveal');
    o.hidden = false;
    PS.audio.init();

    // 1) O jogador toca 3 vezes (ou espera) para abrir
    taps = 0;
    await Promise.race([new Promise(r => { tapResolve = r; }), wait(4500)]);
    tapResolve = null;
    $('op-hint').hidden = true;

    // 2) Tremedeira + brilho que revela a raridade
    const bx = $('op-box');
    bx.classList.add('shake2');
    if (best >= 4) {
      setRays('rgba(255,255,255,0.35)', true);
      PS.audio.alarm();
      await wait(1100);
      setRays(rarityColor(best), true);
      await wait(700);
    } else if (best === 3 && Math.random() < 0.6) {
      // Quase lendário: pisca dourado e vira roxo
      setRays(R[4].color, false);
      await wait(450);
      setRays(R[3].color, false);
      await wait(450);
    } else {
      setRays(R[best].color, false);
      await wait(700);
    }
    bx.classList.remove('shake2');

    // 3) Explosão e cartas
    burstFor(best);
    bx.hidden = true;
    o.classList.add('reveal');
    const cards = $('op-cards');
    if (drops.length === 1) {
      revealSound(best);
      const c = card(drops[0], false);
      c.classList.add('pop');
      cards.appendChild(c);
    } else {
      const sorted = drops.slice().sort((a, b) => a.r - b.r);
      const els = sorted.map(d => {
        const c = card(d, true);
        c.classList.add('back');
        cards.appendChild(c);
        return c;
      });
      for (let i = 0; i < els.length; i++) {
        if (i === els.length - 1) {
          setRays(rarityColor(sorted[i].r), sorted[i].r >= 4);
          await wait(650);
        }
        els[i].classList.remove('back');
        els[i].classList.add('pop');
        if (i === els.length - 1) { revealSound(sorted[i].r); burstFor(sorted[i].r); }
        else PS.audio.tone(500 + sorted[i].r * 180 + i * 30, 0.07, { type: 'triangle', vol: 0.12 });
        await wait(i === els.length - 1 ? 0 : 230);
      }
    }
    if (best >= 4) PS.pombo.say(best === 5 ? 'STONKS SUPREMO!!!' : 'LENDÁRIO! Chama a imprensa!', 3);

    // 4) Ações
    const acts = $('op-actions');
    const again = document.createElement('button');
    again.type = 'button';
    again.id = 'op-again';
    again.className = 'btn primary';
    const cost = L.cost(box);
    again.textContent = 'Abrir outra · ' + PS.CUR[box.cur].icon + ' ' + fmt(cost);
    again.disabled = !L.canAfford(box);
    again.addEventListener('click', () => { close(); L.buy(box.id); });
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.id = 'op-ok';
    ok.className = 'btn';
    ok.textContent = 'Beleza';
    ok.addEventListener('click', close);
    acts.append(again, ok);
    L.busy = false;
    ok.focus();
  }

  function close() {
    $('opener').hidden = true;
    PS.ui.refresh();
    PS.ui.renderBoxes();
    PS.ui.renderItems();
  }

  L.tapBox = function () {
    if (!tapResolve) return;
    taps++;
    const bx = $('op-box');
    bx.classList.remove('knock');
    void bx.offsetWidth;
    bx.classList.add('knock');
    bx.style.setProperty('--k', String(taps));
    PS.audio.tone(300 + taps * 120, 0.08, { type: 'square', vol: 0.1 });
    const r = bx.getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + r.height * 0.3, 4 + taps * 3, { speed: 300, shape: 'confetti' });
    if (taps >= 3) tapResolve();
  };

  // ---------- moedas premium ----------
  PS.addCoins = function (n, x, y) {
    PS.S.coins += n;
    if (x !== undefined) fx.text(x, y, '+' + n + ' 🪙', { size: 24, color: PS.C.gold, vy: -80, life: 1.3 });
  };
  PS.addCupons = function (n) {
    PS.S.cupons += n;
    PS.ui.toast('🎫', '+' + n + ' Cupom Dourado! Abre um Cofre Suíço', 'gold');
  };
})();
