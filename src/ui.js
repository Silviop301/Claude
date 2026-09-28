// Interface em DOM: HUD, lista de negócios, combo, notificações e janelas.
(function () {
  const B = PS.BUSINESSES, $ = id => document.getElementById(id);
  const ui = PS.ui = { rows: [] };
  let dispMoney = 0, lastBump = 0, comboT = 0;

  // Só escreve no DOM quando o valor muda.
  function set(el, key, val) {
    if (el['_' + key] !== val) {
      el['_' + key] = val;
      if (key === 'width') el.style.width = val;
      else el[key] = val;
    }
  }

  ui.init = function () {
    dispMoney = PS.S.money;
    const list = $('biz');
    list.innerHTML = '';
    ui.rows = [];
    B.forEach((b, i) => {
      const el = document.createElement('div');
      el.className = 'biz';
      el.hidden = true;
      el.innerHTML =
        '<span class="best" hidden>MELHOR COMPRA</span>' +
        '<div class="ico"><span class="emo"></span><span class="count" hidden>0</span></div>' +
        '<div class="info"><div class="name"></div><div class="sub"></div>' +
        '<div class="mile"><div class="bar"><i></i></div><span class="mtxt"></span></div></div>' +
        '<button class="buy" type="button" id="buy-' + b.id + '"><span class="q"></span><span class="c"></span></button>';
      const r = {
        el,
        best: el.querySelector('.best'),
        emo: el.querySelector('.emo'),
        count: el.querySelector('.count'),
        name: el.querySelector('.name'),
        sub: el.querySelector('.sub'),
        mile: el.querySelector('.mile'),
        fill: el.querySelector('.bar i'),
        mtxt: el.querySelector('.mtxt'),
        btn: el.querySelector('.buy'),
        q: el.querySelector('.q'),
        c: el.querySelector('.c'),
      };
      r.emo.textContent = b.icon;
      r.btn.addEventListener('click', () => PS.onBuy(i, r.btn));
      list.appendChild(el);
      ui.rows.push(r);
    });

    if (!ui.bound) bind();
    ui.syncMode();
    ui.syncSound();
    ui.setTab(PS.S.tab, true);
    ui.renderBoxes();
    ui.renderItems();
    ui.refresh();
  };

  // Eventos registrados uma única vez (o reset chama ui.init de novo).
  function bind() {
    ui.bound = true;
    document.querySelectorAll('.seg button').forEach(bt => {
      bt.addEventListener('click', () => {
        const v = bt.dataset.m;
        PS.S.buyMode = v === 'max' ? 'max' : +v;
        PS.audio.init();
        PS.audio.click();
        ui.syncMode();
        ui.refresh();
      });
    });
    document.querySelectorAll('.tab').forEach(bt => {
      bt.addEventListener('click', () => {
        PS.audio.init();
        PS.audio.click();
        ui.setTab(bt.dataset.tab);
      });
    });
    $('btn-sound').addEventListener('click', () => {
      PS.S.sound = !PS.S.sound;
      PS.audio.on = PS.S.sound;
      PS.audio.init();
      ui.syncSound();
      PS.audio.click();
    });
    $('btn-menu').addEventListener('click', ui.statsModal);
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal' && ui.modalDismissable) ui.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden && ui.modalDismissable) ui.close(); });
  }

  ui.setTab = function (tab, silent) {
    PS.S.tab = tab;
    ['biz', 'boxes', 'items'].forEach(t => {
      $(t).hidden = t !== tab;
      const b = $('tab-' + t);
      b.classList.toggle('on', t === tab);
      b.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });
    document.querySelector('.seg').hidden = tab !== 'biz';
    if (tab === 'boxes') ui.renderBoxes();
    if (tab === 'items') {
      PS.S.newItems = [];
      ui.renderItems();
    }
    if (!silent) ui.refresh();
  };

  // ---------- Caixas ----------
  function wallet() {
    const S = PS.S;
    return '<div class="wallet-row">' +
      '<span class="chip">🪙 <b>' + PS.fmt(S.coins) + '</b> PomboCoin</span>' +
      '<span class="chip">🎫 <b>' + S.cupons + '</b> Cupom</span>' +
      '<span class="chip">🍞 <b>' + PS.fmt(S.farelo) + '</b> Farelo</span></div>';
  }

  ui.renderBoxes = function () {
    const el = $('boxes'), S = PS.S;
    const left = PS.PITY - S.pity;
    let html = wallet() +
      '<div class="pity"><div class="pity-top"><b>Lendário garantido</b><span>em ' + left + ' ' + (left === 1 ? 'item' : 'itens') + '</span></div>' +
      '<div class="meter gold"><i style="width:' + (S.pity / PS.PITY * 100).toFixed(1) + '%"></i></div></div>';
    PS.BOXES.forEach(b => {
      const odds = PS.loot.odds(b.minR);
      const oddsTxt = PS.RARITIES.map((r, i) => odds[i] > 0 ? '<span class="od r-' + r.id + '">' + r.name + ' ' + (odds[i] * 100).toFixed(odds[i] < 0.01 ? 1 : 0).replace('.', ',') + '%</span>' : '').join('');
      const cost = PS.loot.cost(b), can = PS.loot.canAfford(b);
      html += '<div class="boxcard' + (can ? ' can' : '') + '">' +
        '<div class="mini-box b-' + b.id + '"><span class="lid"></span><span class="body"></span></div>' +
        '<div class="bc-info"><div class="name">' + b.name + '</div><div class="sub">' + b.desc + '</div><div class="odds">' + oddsTxt + '</div></div>' +
        '<button class="buy" type="button" id="box-' + b.id + '" data-box="' + b.id + '"><span class="q">Abrir</span><span class="c">' + PS.CUR[b.cur].icon + ' ' + PS.fmt(cost) + '</span></button></div>';
    });
    html += '<p class="hint">Ganhe 🪙 PomboCoin em marcos, promoções, eventos e críticos. 🎫 Cupons vêm de promoções, TO THE MOON e da sorte.</p>';
    el.innerHTML = html;
    el.querySelectorAll('[data-box]').forEach(bt => bt.addEventListener('click', () => PS.loot.buy(bt.dataset.box)));
    ui._boxKey = boxKey();
  };

  function boxKey() {
    const S = PS.S;
    return PS.BOXES.map(b => (PS.loot.canAfford(b) ? 1 : 0) + ':' + PS.fmt(PS.loot.cost(b))).join('|') + S.coins + ':' + S.cupons + ':' + S.pity;
  }

  // ---------- Itens ----------
  const SLOT_NAMES = { head: 'Cabeça', eyes: 'Olhos', neck: 'Pescoço' };

  function slotHtml(id, label, key) {
    const it = id && PS.ITEM_BY_ID[id];
    return '<button type="button" class="slot' + (it ? ' r-' + PS.RARITIES[it.r].id : '') + '" data-slot="' + key + '" id="slot-' + key + '">' +
      '<span class="s-ico">' + (it ? it.icon : '＋') + '</span><span class="s-lbl">' + (it ? 'Nv ' + PS.S.inv[id] : label) + '</span></button>';
  }

  ui.renderItems = function () {
    const el = $('items'), S = PS.S, B = PS.B;
    const eq = S.equip;
    const bon = [];
    if (B.prod) bon.push('+' + Math.round(B.prod) + '% produção');
    if (B.tap) bon.push('+' + Math.round(B.tap) + '% toque');
    if (B.crit) bon.push('+' + (Math.round(B.crit * 10) / 10).toString().replace('.', ',') + '% crítico');
    if (B.offline) bon.push('+' + Math.round(B.offline) + ' min offline');
    if (B.event) bon.push('eventos +' + Math.round(B.event) + '%');
    if (B.shark) bon.push('+' + Math.round(B.shark) + 's Tubarão');
    if (B.floor) bon.push('mercado ≥ x0,8');
    const total = PS.ITEMS.length, have = B.collection;
    let html = '<div class="sec-title">Ativos equipados <small>(bônus)</small></div><div class="slots">';
    for (let i = 0; i < PS.ATIVO_SLOTS; i++) html += slotHtml(eq.ativos[i], 'Vazio', 'a' + i);
    html += '</div><div class="sec-title">Visual do pombo</div><div class="slots">';
    ['head', 'eyes', 'neck'].forEach(sl => { html += slotHtml(eq[sl], SLOT_NAMES[sl], sl); });
    html += '</div><div class="bonus-line">' + (bon.length ? bon.join(' · ') : 'Equipe itens para ganhar bônus.') + '</div>' +
      '<div class="sec-title">Coleção <small>' + have + '/' + total + ' · +' + have + '% produção</small></div>' +
      '<div class="meter coll"><i style="width:' + (have / total * 100).toFixed(1) + '%"></i></div><div class="grid">';
    PS.ITEMS.forEach(it => {
      const lvl = S.inv[it.id];
      const on = [...eq.ativos, eq.head, eq.eyes, eq.neck].includes(it.id);
      html += '<button type="button" class="cell r-' + PS.RARITIES[it.r].id + (lvl ? '' : ' none') + (on ? ' on' : '') + '" data-item="' + it.id + '" id="it-' + it.id + '"' + (lvl ? '' : ' disabled') + ' aria-label="' + (lvl ? it.name : 'Item não descoberto') + '">' +
        '<span class="c-ico">' + it.icon + '</span>' + (lvl ? '<span class="c-lvl">' + lvl + '</span>' : '') + '</button>';
    });
    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-item]').forEach(bt => bt.addEventListener('click', () => ui.itemModal(bt.dataset.item)));
    el.querySelectorAll('[data-slot]').forEach(bt => bt.addEventListener('click', () => {
      const k = bt.dataset.slot;
      const id = k[0] === 'a' && k.length === 2 ? eq.ativos[+k[1]] : eq[k];
      if (id) ui.itemModal(id);
      else ui.toast('🎁', 'Abra caixas para conseguir itens!');
    }));
  };

  ui.itemModal = function (id) {
    const it = PS.ITEM_BY_ID[id], S = PS.S, eq = S.equip, lvl = S.inv[id];
    const rar = PS.RARITIES[it.r];
    const isOn = it.kind === 'ativo' ? eq.ativos.includes(id) : eq[it.slot] === id;
    let label;
    if (isOn) label = 'Desequipar';
    else if (it.kind === 'ativo' && eq.ativos.length >= PS.ATIVO_SLOTS) label = 'Equipar (tira ' + PS.ITEM_BY_ID[eq.ativos[0]].name + ')';
    else if (it.kind === 'visual' && eq[it.slot]) label = 'Equipar (troca ' + PS.ITEM_BY_ID[eq[it.slot]].name + ')';
    else label = 'Equipar';
    ui.modal({
      title: it.name,
      html: '<div class="item-hero r-' + rar.id + '"><span class="ih-ico">' + it.icon + '</span></div>' +
        '<p class="ih-meta"><span class="rar-tag r-' + rar.id + '">' + rar.name + '</span> ' +
        (it.kind === 'ativo' ? 'Ativo' : 'Visual · ' + SLOT_NAMES[it.slot]) + ' · Nível ' + lvl + '/' + PS.MAX_LEVEL + '</p>' +
        '<p><b>' + PS.itemEffectText(it, lvl) + '</b></p><p class="m-note">' + it.flavor + '</p>' +
        (lvl < PS.MAX_LEVEL ? '<p class="m-note">Itens repetidos sobem o nível (+25% de efeito por nível).</p>' : '<p class="m-note">Nível máximo! Repetidos viram Farelo.</p>'),
      actions: [
        { label: 'Fechar', onClick: ui.close },
        {
          label, kind: 'primary', onClick: () => {
            if (it.kind === 'ativo') {
              if (isOn) eq.ativos = eq.ativos.filter(x => x !== id);
              else {
                eq.ativos.push(id);
                if (eq.ativos.length > PS.ATIVO_SLOTS) eq.ativos.shift();
              }
            } else {
              eq[it.slot] = isOn ? null : id;
            }
            PS.recalcBonuses();
            PS.recalc();
            PS.audio.buy();
            if (!isOn) PS.pombo.say(it.kind === 'visual' ? 'Tô um gato. Um pombo gato.' : 'Equipado. O mercado que lute.', 2.4);
            ui.close();
            ui.renderItems();
            ui.refresh();
          },
        },
      ],
    });
  };

  ui.syncMode = function () {
    document.querySelectorAll('.seg button').forEach(bt => {
      const on = String(PS.S.buyMode) === bt.dataset.m;
      bt.classList.toggle('on', on);
      bt.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  ui.syncSound = function () {
    const b = $('btn-sound');
    b.textContent = PS.S.sound ? '🔊' : '🔇';
    b.setAttribute('aria-label', PS.S.sound ? 'Desligar som' : 'Ligar som');
  };

  // Atualização da lista e do HUD (10x por segundo).
  ui.refresh = function () {
    const S = PS.S, pps = PS.cachedPps, best = PS.bestBuy(), fmt = PS.fmt;
    B.forEach((b, i) => {
      const r = ui.rows[i];
      const rev = i < S.revealed, teaser = i === S.revealed;
      set(r.el, 'hidden', !(rev || teaser));
      if (!rev && !teaser) return;
      if (teaser) {
        r.el.classList.add('locked');
        set(r.name, 'textContent', '???');
        set(r.sub, 'textContent', 'Ganhe ' + fmt(b.cost * 0.3) + ' no total para revelar');
        set(r.q, 'textContent', 'BLOQUEADO');
        set(r.c, 'textContent', fmt(b.cost));
        set(r.count, 'hidden', true);
        set(r.mile, 'hidden', true);
        set(r.best, 'hidden', true);
        set(r.btn, 'disabled', true);
        r.el.classList.remove('can', 'ready');
        return;
      }
      if (r.el.classList.contains('locked')) {
        r.el.classList.remove('locked');
        r.el.classList.add('fresh');
        set(r.btn, 'disabled', false);
        set(r.mile, 'hidden', false);
      }
      const o = S.owned[i];
      const n = PS.buyAmount(i);
      const cost = PS.costOf(i, n);
      const can = S.money + 1e-9 >= cost;
      const m = PS.nextMile(o);
      set(r.name, 'textContent', b.name);
      set(r.count, 'hidden', o === 0);
      set(r.count, 'textContent', String(o));
      const share = pps > 0 ? Math.round(PS.bizPps(i) / pps * 100) : 0;
      set(r.sub, 'textContent', o > 0 ? fmt(PS.bizPps(i), true) + '/s · ' + share + '% do total' : b.desc);
      set(r.fill, 'width', Math.min(100, (o - m.prev) / (m.at - m.prev) * 100).toFixed(1) + '%');
      set(r.mtxt, 'textContent', o + '/' + m.at + ' → produção x' + m.x);
      const ready = can && o + n >= m.at;
      set(r.q, 'textContent', ready ? 'MARCO! x' + n : 'Comprar x' + n);
      set(r.c, 'textContent', fmt(cost));
      r.el.classList.toggle('can', can);
      r.el.classList.toggle('ready', ready);
      set(r.best, 'hidden', best !== i || S.revealed < 2);
    });

    set($('pps'), 'textContent', fmt(pps, true));
    ui.refreshMarket();

    // Bolinhas de aviso nas abas
    const canBox = PS.BOXES.some(b => PS.loot.canAfford(b));
    set($('tab-boxes').querySelector('.dot'), 'hidden', !canBox || S.tab === 'boxes');
    set($('tab-items').querySelector('.dot'), 'hidden', !S.newItems.length || S.tab === 'items');
    if (S.tab === 'boxes' && ui._boxKey !== boxKey()) ui.renderBoxes();
    const st = PS.STAGES[S.stage], nx = PS.STAGES[S.stage + 1];
    set($('rank-title'), 'textContent', st.title);
    if (nx) {
      set($('rank-fill'), 'width', Math.min(100, (S.lifetime - st.at) / (nx.at - st.at) * 100).toFixed(1) + '%');
      set($('rank-next'), 'textContent', 'Promoção em ' + fmt(Math.max(0, nx.at - S.lifetime)) + ' · ganha ' + nx.acc);
    } else {
      set($('rank-fill'), 'width', '100%');
      set($('rank-next'), 'textContent', 'Topo da cadeia alimentar');
    }
  };

  // Mercado, bônus, Modo Tubarão e posição "Comprar na baixa".
  ui.refreshMarket = function () {
    const M = PS.market, S = PS.S;
    const up = M.trend() >= 0;
    const tk = $('ticker');
    tk.classList.toggle('up', up);
    tk.classList.toggle('down', !up);
    tk.classList.toggle('moon', M.hasBoost('moon'));
    set($('tk-arrow'), 'textContent', up ? '▲' : '▼');
    set($('tk-mult'), 'textContent', 'x' + M.v.toFixed(1).replace('.', ','));

    const chips = M.boosts.map(b => [b.id, b.icon + ' ' + b.label + (b.x > 1 ? ' x' + b.x : '') + ' · ' + Math.ceil(b.t) + 's']);
    if (M.sharkOn > 0) chips.push(['shark', '🦈 Tubarão x5 · ' + Math.ceil(M.sharkOn) + 's']);
    const key = chips.map(c => c.join(':')).join('|');
    const box = $('boosts');
    if (box._key !== key) {
      box._key = key;
      box.innerHTML = '';
      chips.forEach(([id, txt]) => {
        const d = document.createElement('div');
        d.className = 'boost ' + id;
        d.textContent = txt;
        box.appendChild(d);
      });
    }

    const sh = $('shark');
    sh.classList.toggle('full', M.sharkOn > 0);
    set($('shark-fill'), 'width', (M.shark * 100).toFixed(1) + '%');
    set($('shark-label'), 'textContent', M.sharkOn > 0 ? '🦈 x5 PRODUÇÃO!' : '🦈 Modo Tubarão');

    set($('dip'), 'hidden', !M.canBuyDip());
    const pe = $('position');
    if (S.pos) {
      const ret = M.v / S.pos.p0 - 1;
      set(pe, 'hidden', false);
      set(pe, 'textContent', '📊 Posição ' + (ret >= 0 ? '+' : '') + Math.round(ret * 100) + '% · vende em +80% ou ' + Math.ceil(90 - S.pos.t) + 's');
      pe.classList.toggle('gain', ret >= 0);
      pe.classList.toggle('loss', ret < 0);
    } else {
      set(pe, 'hidden', true);
    }
  };

  // Contador estilo odômetro (todo quadro).
  ui.frame = function (dt) {
    const target = PS.S.money;
    dispMoney += (target - dispMoney) * (1 - Math.exp(-dt * 10));
    if (Math.abs(target - dispMoney) < Math.max(0.5, target * 0.0005)) dispMoney = target;
    set($('money'), 'textContent', PS.fmt(dispMoney));
    if (comboT > 0) {
      comboT -= dt;
      if (comboT <= 0) $('combo').hidden = true;
    }
  };

  ui.counterPos = function () {
    const r = $('money').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  ui.bumpCounter = function () {
    const now = performance.now();
    PS.audio.blip();
    if (now - lastBump < 90) return;
    lastBump = now;
    const el = $('money');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  };

  ui.bigBump = function () {
    const el = $('money');
    el.classList.remove('big');
    void el.offsetWidth;
    el.classList.add('big');
  };

  ui.combo = function (n) {
    const el = $('combo');
    if (n < 5) return;
    el.hidden = false;
    el.textContent = n + ' COMBO · x' + (1 + Math.min(n, 100) / 100).toFixed(2).replace('.', ',');
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    el.classList.toggle('hot', n >= 30);
    el.classList.toggle('max', n >= 100);
    comboT = 0.7;
  };

  ui.tapped = function () {
    const h = $('tap-hint');
    if (!h.hidden && PS.S.taps >= 3) h.hidden = true;
  };

  ui.flashRow = function (i, cls) {
    const el = ui.rows[i].el;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  ui.toast = function (icon, text, kind) {
    const box = $('toasts');
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    const i = document.createElement('span');
    i.className = 'ti';
    i.textContent = icon;
    const s = document.createElement('span');
    s.textContent = text;
    t.append(i, s);
    box.prepend(t);
    const max = window.innerWidth < 900 ? 2 : 4;
    while (box.children.length > max) box.lastChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }, 3000);
  };

  // Janela genérica. html só recebe texto gerado pelo próprio jogo.
  ui.modal = function (o) {
    $('m-title').textContent = o.title;
    $('m-body').innerHTML = o.html;
    const acts = $('m-actions');
    acts.innerHTML = '';
    o.actions.forEach((a, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'm-act-' + k;
      b.className = 'btn ' + (a.kind || '');
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick(b));
      acts.appendChild(b);
    });
    ui.modalDismissable = o.dismissable !== false;
    $('modal').hidden = false;
    const first = acts.querySelector('.primary') || acts.firstChild;
    if (first) first.focus();
  };

  ui.close = function () {
    $('modal').hidden = true;
  };

  ui.offlineModal = function (r) {
    const fmt = PS.fmt;
    ui.modal({
      title: 'Bem-vindo de volta, chefe!',
      dismissable: false,
      html:
        '<p>Você ficou fora por <b>' + PS.fmtTime(r.sec) + '</b>. Enquanto isso, seus negócios renderam:</p>' +
        '<div class="m-big">+' + fmt(r.gain) + '</div>' +
        (r.capped ? '<p class="m-note">Os negócios rendem até ' + PS.fmtTime(r.cap) + ' sem você. Itens aumentam esse limite.</p>' : ''),
      actions: [{
        label: 'Coletar',
        kind: 'primary',
        onClick: () => {
          ui.close();
          PS.collectOffline(r.gain);
        },
      }],
    });
  };

  ui.statsModal = function () {
    const S = PS.S, fmt = PS.fmt;
    const rows = [
      ['Cargo', PS.STAGES[S.stage].title],
      ['Grana agora', fmt(S.money)],
      ['Total ganho', fmt(S.allTime)],
      ['Produção', fmt(PS.cachedPps, true) + '/s'],
      ['Toques', S.taps.toLocaleString('pt-BR')],
      ['Críticos', S.crits.toLocaleString('pt-BR')],
      ['Maior combo', String(S.bestCombo)],
      ['Negócios comprados', S.owned.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')],
      ['Tempo de jogo', PS.fmtTime(S.playTime)],
      ['Dicas quentes pegas', String(S.stats.dicas)],
      ['Golpes sofridos', String(S.stats.golpes)],
      ['Crashes segurados', String(S.stats.holds)],
      ['Modos Tubarão', String(S.stats.sharks)],
      ['Viagens à lua', String(S.stats.moons)],
      ['Lucro comprando na baixa', fmt(S.stats.dipProfit)],
      ['Caixas abertas', String(S.boxesOpened)],
      ['Itens na coleção', Object.keys(S.inv).length + '/' + PS.ITEMS.length],
    ];
    ui.modal({
      title: 'Relatório do Investidor',
      html: '<dl class="stats">' + rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>',
      actions: [
        {
          label: 'Apagar progresso',
          kind: 'danger',
          onClick: b => {
            if (!b.dataset.armed) {
              b.dataset.armed = '1';
              b.textContent = 'Tem certeza? Toque de novo';
              return;
            }
            PS.reset();
          },
        },
        { label: 'Fechar', kind: 'primary', onClick: ui.close },
      ],
    });
  };
})();
