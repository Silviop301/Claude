// MBA do Pombo: pesquisas com timer real (continuam com o jogo fechado) e automação.
(function () {
  const fmt = PS.fmt, $ = id => document.getElementById(id);
  const R = (id, icon, name, desc, cost, cur, min, fx, req) => ({ id, icon, name, desc, cost, cur, min, fx, req });

  PS.RESEARCH = [
    R('estagiario', '🧑‍💼', 'Estagiário',              'Compra sozinho a melhor opção de negócio a cada 3s.', 5e3,  'grana', 3,   { autobuy: 1 }),
    R('offline1',   '🛌', 'Soneca Lucrativa I',        '+2h de ganho offline.',                           2e4,  'grana', 10,  { offline: 120 }),
    R('dedo1',      '👆', 'Dedo de Ouro',              '+50% no valor do toque.',                         2.5e4, 'grana', 8,  { tap: 50 }),
    R('assessor',   '🕴️', 'Assessor de Eventos',       'Pega Dicas Quentes e Encomendas sozinho.',        1e5,  'grana', 15,  { autocollect: 1 }, 'estagiario'),
    R('network',    '🤝', 'Networking',                'Eventos 20% mais frequentes.',                    2e5,  'grana', 20,  { event: 20 }),
    R('sorte',      '🍀', 'Sorte de Principiante',     '+2% de chance de crítico.',                       5e5,  'grana', 30,  { crit: 2 }, 'dedo1'),
    R('camelo',     '🛒', 'Faro de Camelô',            'Caixa do Camelô 50% mais barata.',                1e6,  'grana', 30,  { cameloDisc: 50 }),
    R('slot1',      '🎒', 'Bolso Extra',               '+1 espaço de Ativo equipado.',                    100,  'coins', 30,  { slots: 1 }),
    R('padaria',    '🥐', 'Padaria de Farelo',         'Produz 1 🍞 Farelo a cada 5 min, até offline.',   150,  'coins', 45,  { farelo: 1 }),
    R('tubarao',    '🦈', 'Tubarão Alfa',              '+10s de Modo Tubarão.',                           2e6,  'grana', 45,  { shark: 10 }),
    R('offline2',   '🛏️', 'Soneca Lucrativa II',       '+4h de ganho offline.',                           5e6,  'grana', 60,  { offline: 240 }, 'offline1'),
    R('negociador', '🤑', 'Negociador',                'Negócios 10% mais baratos.',                      1e7,  'grana', 60,  { costCut: 10 }),
    R('paralela',   '🧠', 'Pesquisa Paralela',         'Pesquise 2 coisas ao mesmo tempo.',               300,  'coins', 60,  { rslots: 1 }),
    R('dedo2',      '✋', 'Mão de Midas',              '+100% no valor do toque.',                        2.5e7, 'grana', 60, { tap: 100 }, 'dedo1'),
    R('pity',       '🎯', 'Pity Turbinado',            'Lendário garantido a cada 45 itens (era 60).',    250,  'coins', 120, { pityCut: 15 }),
    R('slot2',      '🧳', 'Mala Executiva',            '+1 espaço de Ativo equipado.',                    400,  'coins', 120, { slots: 1 }, 'slot1'),
    R('offline3',   '🏝️', 'Soneca Lucrativa III',      '+8h de ganho offline.',                           5e9,  'grana', 240, { offline: 480 }, 'offline2'),
    R('lobista',    '🏛️', 'Lobista',                   'Negócios mais 10% mais baratos.',                 1e10, 'grana', 180, { costCut: 10 }, 'negociador'),
  ];
  const BY_ID = {};
  PS.RESEARCH.forEach(r => { BY_ID[r.id] = r; });

  const MBA = PS.mba = {};
  const S = () => PS.S;
  const slots = () => 1 + (PS.B ? PS.B.rslots : 0);
  const bal = cur => (cur === 'grana' ? S().money : S().coins);

  MBA.state = function (r) {
    const rs = S().research;
    if (rs.done[r.id]) return 'done';
    if (rs.active.some(a => a.id === r.id)) return 'active';
    if (r.req && !rs.done[r.req]) return 'locked';
    return 'open';
  };

  MBA.canStart = r => MBA.state(r) === 'open' && S().research.active.length < slots() && bal(r.cur) >= r.cost;

  MBA.start = function (id) {
    const r = BY_ID[id];
    if (!MBA.canStart(r)) { PS.audio.error(); return; }
    if (r.cur === 'grana') S().money -= r.cost;
    else S().coins -= r.cost;
    S().research.active.push({ id, end: Date.now() + r.min * 60000 });
    PS.audio.buy();
    PS.pombo.say(PS.pick(['Estudando pra ficar mais rico.', 'Matriculado no MBA!', 'Conhecimento é investimento.']), 2.6);
    MBA.render();
    PS.ui.refresh();
  };

  MBA.speedCost = a => Math.max(1, Math.ceil((a.end - Date.now()) / 120000));

  MBA.speed = function (id) {
    const a = S().research.active.find(x => x.id === id);
    if (!a) return;
    const c = MBA.speedCost(a);
    if (S().coins < c) { PS.audio.error(); return; }
    S().coins -= c;
    a.end = Date.now();
    MBA.tick();
  };

  function finish(r) {
    S().research.done[r.id] = true;
    PS.recalcBonuses();
    PS.recalc();
    PS.fx.banner('FORMADO!', r.name, PS.C.gold);
    PS.fx.confetti(60);
    PS.audio.milestone();
    PS.pombo.celebrate(1.6);
    PS.pombo.say('Me formei em ' + r.name + '. Pode me chamar de doutor.', 3);
    PS.ui.toast('🎓', 'Pesquisa concluída: ' + r.name, 'gold');
  }

  // Chamado 1x por segundo.
  MBA.tick = function () {
    const rs = S().research, now = Date.now();
    const ready = rs.active.filter(a => a.end <= now);
    if (ready.length) {
      rs.active = rs.active.filter(a => a.end > now);
      ready.forEach(a => { if (BY_ID[a.id]) finish(BY_ID[a.id]); });
      if (S().tab === 'mba') MBA.render();
    }
    // Padaria de Farelo: 1 a cada 5 min, conta o tempo fora também (até 24h)
    if (PS.B.farelo) {
      if (!S().fareloAt) S().fareloAt = now;
      const n = Math.min(288, Math.floor((now - S().fareloAt) / 300000));
      if (n > 0) {
        S().farelo += n;
        S().fareloAt += n * 300000;
        if (n > 1) PS.ui.toast('🥐', 'A padaria produziu ' + n + ' 🍞 Farelo');
      }
    }
  };

  // Estagiário: compra a melhor opção a cada 3s.
  let autoT = 0;
  MBA.update = function (dt) {
    if (!PS.B.autobuy || !S().auto.buy) return;
    autoT += dt;
    if (autoT < 3) return;
    autoT = 0;
    const i = PS.bestBuy();
    if (i < 0 || S().money < PS.costOf(i, 1)) return;
    const mode = S().buyMode;
    S().buyMode = 1;
    const res = PS.buy(i);
    S().buyMode = mode;
    if (!res) return;
    PS.meta.track('buy', 1);
    const row = PS.ui.rows[i];
    if (row && !row.el.hidden && S().tab === 'biz') {
      PS.ui.flashRow(i, 'bought');
      const r = row.btn.getBoundingClientRect();
      PS.fx.text(r.left + r.width / 2, r.top - 6, '🧑‍💼 +1', { size: 18, color: '#C9FFD9', life: 0.9 });
    }
    res.crossed.forEach(m => PS.celebrate(i, m));
  };

  MBA.claimable = function () {
    return S().research.active.length < slots() && PS.RESEARCH.some(r => MBA.canStart(r));
  };

  MBA.key = function () {
    const rs = S().research;
    return Object.keys(rs.done).length + '|' + rs.active.map(a => a.id + Math.ceil((a.end - Date.now()) / 1000)).join(',') +
      '|' + PS.RESEARCH.map(r => (MBA.canStart(r) ? 1 : 0)).join('') + '|' + S().auto.buy + S().auto.collect + '|' + S().coins;
  };

  const clock = sec => {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + 'h ' + String(m).padStart(2, '0') + 'min' : m + ':' + String(s).padStart(2, '0');
  };
  const dur = min => (min >= 60 ? (min / 60) + 'h' : min + ' min');
  const costTxt = r => (r.cur === 'grana' ? '💸 ' : '🪙 ') + fmt(r.cost);

  MBA.render = function () {
    const el = $('mba'), rs = S().research;
    const done = Object.keys(rs.done).length;
    let html = '<div class="mba-head"><span class="mba-cap">🎓</span><div><b>MBA do Pombo</b><span>' + done + '/' + PS.RESEARCH.length +
      ' cursos · ' + rs.active.length + '/' + slots() + ' em andamento. Os cursos continuam com o jogo fechado.</span></div></div>';

    if (PS.B.autobuy || PS.B.autocollect) {
      html += '<div class="auto-row">';
      if (PS.B.autobuy) html += '<button type="button" class="toggle' + (S().auto.buy ? ' on' : '') + '" id="auto-buy">🧑‍💼 Estagiário: ' + (S().auto.buy ? 'LIGADO' : 'DESLIGADO') + '</button>';
      if (PS.B.autocollect) html += '<button type="button" class="toggle' + (S().auto.collect ? ' on' : '') + '" id="auto-collect">🕴️ Assessor: ' + (S().auto.collect ? 'LIGADO' : 'DESLIGADO') + '</button>';
      html += '</div>';
    }

    const order = { active: 0, open: 1, locked: 2, done: 3 };
    PS.RESEARCH.slice().sort((a, b) => order[MBA.state(a)] - order[MBA.state(b)]).forEach(r => {
      const st = MBA.state(r);
      let right = '', bar = '';
      if (st === 'active') {
        const a = rs.active.find(x => x.id === r.id);
        const left = (a.end - Date.now()) / 1000, total = r.min * 60;
        bar = '<div class="ms-bar"><div class="meter"><i style="width:' + Math.min(100, (1 - left / total) * 100).toFixed(1) + '%"></i></div><span>' + clock(left) + '</span></div>';
        right = '<button type="button" class="claim speed" data-speed="' + r.id + '" id="speed-' + r.id + '"' + (S().coins >= MBA.speedCost(a) ? '' : ' disabled') + '>⏩ 🪙' + MBA.speedCost(a) + '</button>';
      } else if (st === 'open') {
        right = '<button type="button" class="buy" data-res="' + r.id + '" id="res-' + r.id + '"' + (MBA.canStart(r) ? '' : ' disabled') + '><span class="q">' + dur(r.min) + '</span><span class="c">' + costTxt(r) + '</span></button>';
      } else if (st === 'locked') {
        right = '<span class="res-lock">🔒</span>';
      } else {
        right = '<span class="ach-check">✓</span>';
      }
      const sub = st === 'locked' ? 'Requer: ' + BY_ID[r.req].name : r.desc;
      html += '<div class="research ' + st + (st === 'open' && MBA.canStart(r) ? ' can' : '') + '"><span class="rs-ico">' + r.icon + '</span>' +
        '<div class="rs-info"><b>' + r.name + '</b><span>' + sub + '</span>' + bar + '</div>' + right + '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => MBA.start(b.dataset.res)));
    el.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => MBA.speed(b.dataset.speed)));
    const ab = $('auto-buy'), ac = $('auto-collect');
    if (ab) ab.addEventListener('click', () => { S().auto.buy = !S().auto.buy; PS.audio.click(); MBA.render(); });
    if (ac) ac.addEventListener('click', () => { S().auto.collect = !S().auto.collect; PS.audio.click(); MBA.render(); });
    MBA._key = MBA.key();
  };
})();
