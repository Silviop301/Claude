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
    ui.syncMode();

    $('btn-sound').addEventListener('click', () => {
      PS.S.sound = !PS.S.sound;
      PS.audio.on = PS.S.sound;
      PS.audio.init();
      ui.syncSound();
      PS.audio.click();
    });
    ui.syncSound();
    $('btn-menu').addEventListener('click', ui.statsModal);
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal' && ui.modalDismissable) ui.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden && ui.modalDismissable) ui.close(); });

    ui.refresh();
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
        (r.capped ? '<p class="m-note">Os negócios rendem até ' + PS.fmtTime(PS.OFFLINE_CAP) + ' sem você.</p>' : ''),
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
