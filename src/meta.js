// Metas: login diário, missões diárias/semanal, conquistas e a aba Diário.
(function () {
  const fmt = PS.fmt, $ = id => document.getElementById(id);
  const MT = PS.meta = {};

  const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  MT.today = () => dayKey(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
  const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); };
  const basePps = () => PS.pps() / PS.market.tempMult();

  // ---------- login diário ----------
  MT.LOGIN = [
    { icon: '🪙', txt: '10 PomboCoin', give: () => PS.addCoins(10) },
    { icon: '📦', txt: 'Caixa do Camelô', give: () => PS.loot.buy('camelo', true) },
    { icon: '🪙', txt: '25 PomboCoin', give: () => PS.addCoins(25) },
    { icon: '🎫', txt: '1 Cupom Dourado', give: () => PS.addCupons(1) },
    { icon: '🪙', txt: '50 PomboCoin', give: () => PS.addCoins(50) },
    { icon: '💼', txt: 'Maleta Executiva', give: () => PS.loot.buy('maleta', true) },
    { icon: '🔒', txt: 'Cofre Suíço + 100 🪙', give: () => { PS.addCoins(100); PS.loot.buy('cofre', true); } },
  ];

  function loginModal() {
    const L = PS.S.login, day = L.streak;
    const row = MT.LOGIN.map((r, i) =>
      '<div class="lg-day' + (i + 1 < day ? ' past' : i + 1 === day ? ' today' : '') + '"><span class="lg-n">Dia ' + (i + 1) + '</span><span class="lg-ico">' + r.icon + '</span></div>').join('');
    PS.ui.modal({
      title: day === 1 ? 'Bem-vindo à praça!' : 'Dia ' + day + ' seguido!',
      dismissable: false,
      html: '<p>Volte todo dia para prêmios maiores. Faltar um dia recomeça do Dia 1.</p><div class="lg-row">' + row + '</div>' +
        '<p class="lg-prize">Hoje: <b>' + MT.LOGIN[day - 1].icon + ' ' + MT.LOGIN[day - 1].txt + '</b></p>',
      actions: [{
        label: 'Coletar', kind: 'primary', onClick: () => {
          PS.S.login.pending = false;
          PS.ui.close();
          PS.audio.coins();
          PS.fx.confetti(40);
          MT.LOGIN[day - 1].give();
          if (day === 7) PS.meta.track('streak7', 1);
          PS.ui.refresh();
        },
      }],
    });
  }

  // ---------- missões ----------
  const pick = PS.pick;
  const TEMPLATES = [
    { type: 'tap',   txt: n => 'Toque no pombo ' + n + ' vezes', target: () => pick([150, 250, 400]), coins: 15 },
    { type: 'crit',  txt: n => 'Solte ' + n + ' críticos STONKS', target: () => pick([8, 12, 20]), coins: 20 },
    { type: 'buy',   txt: n => 'Compre ' + n + ' negócios', target: () => pick([25, 50, 80]), coins: 15 },
    { type: 'earn',  txt: n => 'Ganhe ' + fmt(n) + ' de grana', target: () => Math.max(2000, Math.round(basePps() * 1800)), coins: 20 },
    { type: 'combo', txt: n => 'Faça um combo de ' + n, target: () => pick([30, 50, 80]), coins: 20 },
    { type: 'box',   txt: n => 'Abra ' + n + ' caixas', target: () => pick([2, 3, 5]), coins: 20 },
    { type: 'event', txt: n => 'Aproveite ' + n + ' eventos (dica, crash ou encomenda)', target: () => pick([2, 3]), coins: 25 },
    { type: 'shark', txt: n => 'Ative o Modo Tubarão ' + n + (n > 1 ? ' vezes' : ' vez'), target: () => pick([1, 2, 3]), coins: 20 },
  ];
  const TPL = {};
  TEMPLATES.forEach(t => { TPL[t.type] = t; });
  MT.WEEKLY_TARGET = 12;

  function genMissions() {
    const pool = TEMPLATES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    return pool.map(t => ({ type: t.type, target: t.target(), prog: 0, claimed: false }));
  }

  // Registra progresso para missões e conquistas.
  MT.track = function (type, n) {
    const S = PS.S;
    if (!S.daily) return;
    S.daily.missions.forEach(m => {
      if (m.type !== type || m.claimed) return;
      const was = m.prog >= m.target;
      m.prog = type === 'combo' ? Math.max(m.prog, n) : m.prog + n;
      if (!was && m.prog >= m.target) {
        PS.ui.toast('✅', 'Missão cumprida! Resgate na aba Diário', 'gold');
        PS.audio.unlock();
      }
    });
    if (type === 'streak7') S.stats.streak7 = (S.stats.streak7 || 0) + 1;
  };

  MT.claimMission = function (i) {
    const S = PS.S, m = S.daily.missions[i];
    if (!m || m.claimed || m.prog < m.target) return;
    m.claimed = true;
    const c = TPL[m.type].coins;
    PS.addCoins(c);
    S.weekly.done++;
    PS.audio.coins();
    PS.fx.confetti(25);
    PS.ui.toast('🪙', '+' + c + ' PomboCoin', 'gold');
    MT.renderDaily();
    PS.ui.refresh();
  };

  MT.claimBonus = function () {
    const S = PS.S;
    if (S.daily.bonusClaimed || !S.daily.missions.every(m => m.claimed)) return;
    S.daily.bonusClaimed = true;
    PS.ui.toast('🎁', 'Todas as missões! Maleta Executiva grátis', 'gold');
    PS.loot.buy('maleta', true);
    MT.renderDaily();
  };

  MT.claimWeekly = function () {
    const S = PS.S;
    if (S.weekly.claimed || S.weekly.done < MT.WEEKLY_TARGET) return;
    S.weekly.claimed = true;
    PS.addCoins(100);
    PS.ui.toast('🏅', 'Missão semanal! +100 🪙 e um Cofre Suíço', 'gold');
    PS.loot.buy('cofre', true);
    MT.renderDaily();
  };

  // ---------- conquistas ----------
  const S_ = () => PS.S;
  const invCount = () => Object.keys(S_().inv).length;
  const hasRarity = r => Object.keys(S_().inv).some(id => PS.ITEM_BY_ID[id].r >= r);
  MT.ACH = [
    { id: 'farelo',    icon: '🍞', name: 'Primeiro Farelo',      desc: 'Ganhe 100 de grana',         prog: () => S_().allTime, target: 100, coins: 5 },
    { id: 'mi',        icon: '💰', name: 'Milionário da Praça',  desc: 'Ganhe 1M no total',          prog: () => S_().allTime, target: 1e6, coins: 20 },
    { id: 'bi',        icon: '🏦', name: 'Bilionário de Pena',   desc: 'Ganhe 1B no total',          prog: () => S_().allTime, target: 1e9, coins: 50 },
    { id: 'tri',       icon: '🌍', name: 'Dono do Mundo',        desc: 'Ganhe 1T no total',          prog: () => S_().allTime, target: 1e12, coins: 100 },
    { id: 'dedo',      icon: '👆', name: 'Dedo Nervoso',         desc: '1.000 toques',               prog: () => S_().taps, target: 1000, coins: 10 },
    { id: 'dedo2',     icon: '🔥', name: 'Tendinite Premium',    desc: '10.000 toques',              prog: () => S_().taps, target: 10000, coins: 40 },
    { id: 'combo',     icon: '⚡', name: 'Combo Insano',         desc: 'Combo de 100',               prog: () => S_().bestCombo, target: 100, coins: 25 },
    { id: 'crits',     icon: '📈', name: 'STONKS em Série',      desc: '100 críticos',               prog: () => S_().crits, target: 100, coins: 20 },
    { id: 'emp',       icon: '🏪', name: 'Empresário',           desc: '100 negócios comprados',     prog: () => S_().owned.reduce((a, b) => a + b, 0), target: 100, coins: 15 },
    { id: 'emp2',      icon: '🏢', name: 'Conglomerado',         desc: '500 negócios comprados',     prog: () => S_().owned.reduce((a, b) => a + b, 0), target: 500, coins: 40 },
    { id: 'divers',    icon: '🧺', name: 'Diversificado',        desc: 'Tenha os 10 tipos de negócio', prog: () => S_().owned.filter(x => x > 0).length, target: 10, coins: 50 },
    { id: 'col15',     icon: '🗂️', name: 'Colecionador',         desc: '15 itens na coleção',        prog: invCount, target: 15, coins: 30 },
    { id: 'colall',    icon: '🏛️', name: 'Museu do Pombo',       desc: 'Todos os 30 itens',          prog: invCount, target: 30, coins: 200 },
    { id: 'lend',      icon: '✨', name: 'Sortudo',              desc: 'Consiga um item Lendário',   prog: () => (hasRarity(4) ? 1 : 0), target: 1, coins: 30 },
    { id: 'stonks',    icon: '🌈', name: 'STONKS Supremo',       desc: 'Consiga um item STONKS',     prog: () => (hasRarity(5) ? 1 : 0), target: 1, coins: 100 },
    { id: 'boxes',     icon: '📦', name: 'Viciado em Caixas',    desc: 'Abra 50 caixas',             prog: () => S_().boxesOpened, target: 50, coins: 30 },
    { id: 'shark',     icon: '🦈', name: 'Tubarão de Verdade',   desc: '10 Modos Tubarão',           prog: () => S_().stats.sharks, target: 10, coins: 20 },
    { id: 'holds',     icon: '💎', name: 'Mãos de Diamante',     desc: 'Segure 5 crashes',           prog: () => S_().stats.holds, target: 5, coins: 25 },
    { id: 'golpe',     icon: '🤡', name: 'Caí no Golpe',         desc: 'Caia num golpe do Zap',      prog: () => S_().stats.golpes, target: 1, coins: 5 },
    { id: 'moon',      icon: '🚀', name: 'Houston',              desc: 'Vá TO THE MOON',             prog: () => S_().stats.moons, target: 1, coins: 20 },
    { id: 'streak',    icon: '📅', name: 'Frequentador da Praça', desc: '7 dias seguidos',           prog: () => S_().stats.streak7 || 0, target: 1, coins: 50 },
    { id: 'pyr1',      icon: '🔺', name: 'Dessa Vez É Diferente', desc: 'Desmorone sua primeira pirâmide', prog: () => S_().pyramids, target: 1, coins: 50 },
    { id: 'pyr5',      icon: '🏜️', name: 'Esquema Profissional', desc: 'Desmorone 5 pirâmides',        prog: () => S_().pyramids, target: 5, coins: 100 },
    { id: 'spin',      icon: '🎡', name: 'Girador Profissional', desc: 'Gire a roda 20 vezes',       prog: () => S_().stats.spins || 0, target: 20, coins: 20 },
  ];

  function checkAch() {
    const S = PS.S;
    MT.ACH.forEach(a => {
      if (S.ach[a.id] || a.prog() < a.target) return;
      S.ach[a.id] = true;
      PS.addCoins(a.coins);
      PS.ui.toast('🏆', 'Conquista: ' + a.name + ' · +' + a.coins + ' 🪙', 'gold');
      PS.audio.milestone();
      PS.fx.confetti(30);
    });
  }

  // ---------- rotina (1x por segundo) ----------
  MT.startDay = function (silent) {
    const S = PS.S, t = MT.today();
    if (S.daily.day !== t) {
      const first = !S.daily.day;
      S.daily = { day: t, missions: genMissions(), bonusClaimed: false, spins: 0 };
      if (!first && !silent) PS.ui.toast('🌅', 'Novo dia! Giro grátis na Roda e missões novas', 'gold');
    }
    if (S.weekly.week !== weekKey()) S.weekly = { week: weekKey(), done: 0, claimed: false };
    if (S.login.last !== t) {
      S.login.streak = S.login.last === yesterday() ? (S.login.streak % 7) + 1 : 1;
      S.login.last = t;
      S.login.pending = true;
    }
    if (S.login.pending && !MT.loginShown) {
      MT.loginShown = true;
      setTimeout(loginModal, 900);
    }
  };

  MT.tick = function () {
    const S = PS.S;
    if (S.daily.day !== MT.today()) {
      MT.loginShown = false;
      MT.startDay();
    }
    checkAch();
  };

  MT.claimable = function () {
    const S = PS.S;
    return S.daily.spins === 0 ||
      S.daily.missions.some(m => !m.claimed && m.prog >= m.target) ||
      (!S.daily.bonusClaimed && S.daily.missions.every(m => m.claimed)) ||
      (!S.weekly.claimed && S.weekly.done >= MT.WEEKLY_TARGET);
  };

  // ---------- aba Diário ----------
  MT.key = function () {
    const S = PS.S;
    return S.daily.spins + '|' + S.daily.missions.map(m => (m.claimed ? 'c' : Math.floor(Math.min(1, m.prog / m.target) * 40))).join(',') +
      '|' + S.daily.bonusClaimed + '|' + S.weekly.done + S.weekly.claimed + '|' + Object.keys(S.ach).length + '|' + S.coins;
  };

  MT.renderDaily = function () {
    const S = PS.S, el = $('daily');
    const W = PS.wheel;
    const free = S.daily.spins === 0;
    let html = '<div class="wheel-cta' + (free ? ' free' : '') + '"><span class="wc-ico">🎡</span><div class="wc-info"><b>Roda da Fortuna Pombal</b><span>' +
      (free ? 'Giro grátis disponível!' : 'Próximo giro: 🪙 ' + W.cost()) + '</span></div>' +
      '<button type="button" class="buy" id="open-wheel"><span class="q">' + (free ? 'Grátis' : 'Girar') + '</span><span class="c">GIRAR</span></button></div>';

    html += '<div class="sec-title">Missões de hoje <small>renovam à meia-noite</small></div>';
    S.daily.missions.forEach((m, i) => {
      const t = TPL[m.type], done = m.prog >= m.target;
      const pct = Math.min(100, m.prog / m.target * 100);
      html += '<div class="mission' + (m.claimed ? ' claimed' : done ? ' done' : '') + '"><div class="ms-info"><div class="ms-txt">' + t.txt(m.target) + '</div>' +
        '<div class="ms-bar"><div class="meter"><i style="width:' + pct.toFixed(1) + '%"></i></div><span>' + (m.type === 'earn' ? fmt(Math.min(m.prog, m.target)) : Math.min(m.prog, m.target)) + '/' + (m.type === 'earn' ? fmt(m.target) : m.target) + '</span></div></div>' +
        '<button type="button" class="claim" data-claim="' + i + '" id="claim-' + i + '"' + (done && !m.claimed ? '' : ' disabled') + '>' + (m.claimed ? '✓' : '🪙 ' + t.coins) + '</button></div>';
    });
    const allDone = S.daily.missions.every(m => m.claimed);
    html += '<div class="mission bonus' + (S.daily.bonusClaimed ? ' claimed' : allDone ? ' done' : '') + '"><div class="ms-info"><div class="ms-txt">Complete as 3 missões: 💼 Maleta Executiva grátis</div></div>' +
      '<button type="button" class="claim" id="claim-bonus"' + (allDone && !S.daily.bonusClaimed ? '' : ' disabled') + '>' + (S.daily.bonusClaimed ? '✓' : '🎁') + '</button></div>';

    const wk = S.weekly;
    html += '<div class="sec-title">Missão da semana</div><div class="mission' + (wk.claimed ? ' claimed' : wk.done >= MT.WEEKLY_TARGET ? ' done' : '') + '"><div class="ms-info"><div class="ms-txt">Resgate ' + MT.WEEKLY_TARGET + ' missões diárias: 🔒 Cofre Suíço + 100 🪙</div>' +
      '<div class="ms-bar"><div class="meter"><i style="width:' + Math.min(100, wk.done / MT.WEEKLY_TARGET * 100).toFixed(1) + '%"></i></div><span>' + Math.min(wk.done, MT.WEEKLY_TARGET) + '/' + MT.WEEKLY_TARGET + '</span></div></div>' +
      '<button type="button" class="claim" id="claim-week"' + (wk.done >= MT.WEEKLY_TARGET && !wk.claimed ? '' : ' disabled') + '>' + (wk.claimed ? '✓' : '🏅') + '</button></div>';

    const got = Object.keys(S.ach).length;
    html += '<div class="sec-title">Conquistas <small>' + got + '/' + MT.ACH.length + '</small></div><div class="ach-list">';
    MT.ACH.slice().sort((a, b) => (S.ach[a.id] ? 1 : 0) - (S.ach[b.id] ? 1 : 0)).forEach(a => {
      const ok = !!S.ach[a.id];
      const pct = Math.min(100, a.prog() / a.target * 100);
      html += '<div class="ach' + (ok ? ' ok' : '') + '"><span class="ach-ico">' + a.icon + '</span><div class="ach-info"><b>' + a.name + '</b><span>' + a.desc + ' · 🪙 ' + a.coins + '</span>' +
        (ok ? '' : '<div class="meter"><i style="width:' + pct.toFixed(1) + '%"></i></div>') + '</div>' + (ok ? '<span class="ach-check">✓</span>' : '') + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => MT.claimMission(+b.dataset.claim)));
    $('claim-bonus').addEventListener('click', MT.claimBonus);
    $('claim-week').addEventListener('click', MT.claimWeekly);
    $('open-wheel').addEventListener('click', () => PS.wheel.open());
    MT._key = MT.key();
  };
})();
