// Economia: custos, produção, marcos, promoções e ganhos offline.
(function () {
  const B = PS.BUSINESSES;
  const GROWTH = 1.15;
  const OFFLINE_CAP = 2 * 3600;

  PS.newState = function () {
    const now = Date.now();
    return {
      v: 1,
      money: 0,
      lifetime: 0,
      allTime: 0,
      owned: B.map(() => 0),
      revealed: 1,
      stage: 0,
      maxTier: 0,
      taps: 0,
      crits: 0,
      bestCombo: 0,
      playTime: 0,
      sound: true,
      buyMode: 1,
      market: { v: 1.2 },
      pos: null,
      stats: { dicas: 0, golpes: 0, sharks: 0, holds: 0, moons: 0, dipProfit: 0 },
      coins: 0,
      cupons: 0,
      farelo: 0,
      pity: 0,
      boxesOpened: 0,
      inv: {},
      equip: { ativos: [], head: null, eyes: null, neck: null },
      newItems: [],
      tab: 'biz',
      daily: { day: '', missions: [], bonusClaimed: false, spins: 0 },
      weekly: { week: '', done: 0, claimed: false },
      login: { last: '', streak: 0, pending: false },
      ach: {},
      rodaUntil: 0,
      research: { done: {}, active: [] },
      auto: { buy: true, collect: true },
      fareloAt: 0,
      setsDone: {},
      lvTotal: 0,
      lvSpent: 0,
      talents: {},
      pyramids: 0,
      bestPyramid: 0,
      pyrHinted: false,
      created: now,
      lastTick: now,
    };
  };

  // Garante que saves antigos tenham todos os campos atuais.
  PS.normalize = function (s) {
    const base = PS.newState();
    const out = Object.assign(base, s || {});
    const owned = Array.isArray(out.owned) ? out.owned : [];
    out.owned = B.map((_, i) => Math.max(0, Math.floor(+owned[i] || 0)));
    ['money', 'lifetime', 'allTime'].forEach(k => { if (!isFinite(out[k]) || out[k] < 0) out[k] = 0; });
    if (![1, 10, 100, 'max'].includes(out.buyMode)) out.buyMode = 1;
    out.stats = Object.assign(base.stats, s && s.stats);
    if (out.pos && !(out.pos.amt > 0 && out.pos.p0 > 0)) out.pos = null;
    ['coins', 'cupons', 'farelo', 'pity', 'boxesOpened'].forEach(k => { if (!isFinite(out[k]) || out[k] < 0) out[k] = 0; });
    const inv = {};
    for (const id in out.inv || {}) if (PS.ITEM_BY_ID[id]) inv[id] = Math.min(PS.MAX_LEVEL, Math.max(1, Math.floor(+out.inv[id] || 1)));
    out.inv = inv;
    const eq = Object.assign({ ativos: [], head: null, eyes: null, neck: null }, out.equip);
    eq.ativos = (Array.isArray(eq.ativos) ? eq.ativos : []).filter(id => inv[id] && PS.ITEM_BY_ID[id].kind === 'ativo').slice(0, PS.MAX_ATIVO_SLOTS);
    ['head', 'eyes', 'neck'].forEach(sl => { if (!(eq[sl] && inv[eq[sl]] && PS.ITEM_BY_ID[eq[sl]].slot === sl)) eq[sl] = null; });
    out.equip = eq;
    out.newItems = (Array.isArray(out.newItems) ? out.newItems : []).filter(id => inv[id]);
    if (!['biz', 'boxes', 'items', 'mba', 'pyramid', 'daily'].includes(out.tab)) out.tab = 'biz';
    if (!out.setsDone || typeof out.setsDone !== 'object') out.setsDone = {};
    ['lvTotal', 'lvSpent', 'pyramids', 'bestPyramid'].forEach(k => { if (!isFinite(out[k]) || out[k] < 0) out[k] = 0; });
    if (!out.talents || typeof out.talents !== 'object') out.talents = {};
    out.daily = Object.assign(base.daily, s && s.daily);
    if (!Array.isArray(out.daily.missions)) out.daily.missions = [];
    out.weekly = Object.assign(base.weekly, s && s.weekly);
    out.login = Object.assign(base.login, s && s.login);
    if (!out.ach || typeof out.ach !== 'object') out.ach = {};
    if (!isFinite(out.rodaUntil)) out.rodaUntil = 0;
    const rs = out.research && typeof out.research === 'object' ? out.research : {};
    out.research = {
      done: rs.done && typeof rs.done === 'object' ? rs.done : {},
      active: (Array.isArray(rs.active) ? rs.active : []).filter(a => a && typeof a.id === 'string' && isFinite(a.end)),
    };
    out.auto = Object.assign(base.auto, s && s.auto);
    if (!isFinite(out.fareloAt)) out.fareloAt = 0;
    return out;
  };

  // Itens equipados e coleção (permanente) × mercado e eventos (temporário).
  PS.globalMult = function () {
    return PS.permMult() * (PS.market ? PS.market.tempMult() : 1);
  };

  PS.mileMult = function (c) {
    let m = 1;
    for (const [at, x] of PS.MILESTONES) {
      if (c >= at) m *= x;
      else break;
    }
    if (c > 1000) m *= Math.pow(2, Math.floor((c - 1000) / 100));
    return m;
  };

  PS.nextMile = function (c) {
    let prev = 0;
    for (const [at, x] of PS.MILESTONES) {
      if (c < at) return { at, x, prev };
      prev = at;
    }
    const at = Math.floor(c / 100) * 100 + 100;
    return { at, x: 2, prev: at - 100 };
  };

  PS.bizPps = function (i, c) {
    if (c === undefined) c = PS.S.owned[i];
    return c * B[i].pps * PS.mileMult(c) * PS.globalMult();
  };

  PS.pps = function () {
    let s = 0;
    for (let i = 0; i < B.length; i++) s += PS.bizPps(i);
    return s;
  };

  PS.cachedPps = 0;
  PS.recalc = function () {
    PS.cachedPps = PS.pps();
  };

  PS.tapBase = function () {
    return (1 + PS.cachedPps * 0.08) * (1 + (PS.B ? PS.B.tap : 0) / 100);
  };

  // Desconto do Negociador/Lobista (MBA)
  const costMult = () => 1 - (PS.B ? PS.B.costCut : 0) / 100;

  PS.costOf = function (i, n) {
    const base = B[i].cost * costMult() * Math.pow(GROWTH, PS.S.owned[i]);
    return base * (Math.pow(GROWTH, n) - 1) / (GROWTH - 1);
  };

  PS.maxBuy = function (i) {
    const base = B[i].cost * costMult() * Math.pow(GROWTH, PS.S.owned[i]);
    const n = Math.floor(Math.log(PS.S.money * (GROWTH - 1) / base + 1) / Math.log(GROWTH));
    return Math.max(0, n);
  };

  PS.buyAmount = function (i) {
    return PS.S.buyMode === 'max' ? Math.max(1, PS.maxBuy(i)) : PS.S.buyMode;
  };

  PS.earn = function (v) {
    PS.S.money += v;
    PS.S.lifetime += v;
    PS.S.allTime += v;
    if (PS.meta) PS.meta.track('earn', v);
  };

  // Compra; devolve null se não houver grana.
  PS.buy = function (i) {
    const S = PS.S;
    const n = PS.buyAmount(i);
    const cost = PS.costOf(i, n);
    if (S.money + 1e-9 < cost) return null;
    const before = S.owned[i];
    const ppsBefore = PS.bizPps(i);
    S.money = Math.max(0, S.money - cost);
    S.owned[i] += n;
    const after = S.owned[i];
    const crossed = [];
    let c = before;
    for (;;) {
      const m = PS.nextMile(c);
      if (m.at > after) break;
      crossed.push(m);
      c = m.at;
    }
    PS.recalc();
    return { n, cost, before, after, crossed, gain: PS.bizPps(i) - ppsBefore };
  };

  // Negócio com melhor retorno (menor custo por grana/s ganha).
  PS.bestBuy = function () {
    let best = -1, bestRatio = Infinity;
    for (let i = 0; i < PS.S.revealed && i < B.length; i++) {
      const o = PS.S.owned[i];
      const gain = PS.bizPps(i, o + 1) - PS.bizPps(i, o);
      const ratio = PS.costOf(i, 1) / gain;
      if (ratio < bestRatio) { bestRatio = ratio; best = i; }
    }
    return best;
  };

  // Revela o próximo negócio quando o anterior já foi comprado e o jogador já ganhou uma parte do custo.
  PS.checkReveal = function () {
    const S = PS.S, out = [];
    while (S.revealed < B.length && S.owned[S.revealed - 1] > 0 && S.lifetime >= B[S.revealed].cost * 0.3) {
      out.push(S.revealed);
      S.revealed++;
    }
    return out;
  };

  PS.checkStage = function () {
    const S = PS.S;
    let up = false;
    while (S.stage + 1 < PS.STAGES.length && S.lifetime >= PS.STAGES[S.stage + 1].at) {
      S.stage++;
      up = true;
    }
    return up;
  };

  PS.offlineGain = function (sec) {
    const cap = PS.offlineCap();
    const eff = Math.min(sec, cap);
    // Offline não conta mercado nem bônus temporários: só a produção base.
    const base = PS.pps() / PS.market.tempMult();
    return { sec, eff, cap, capped: sec > cap, gain: base * eff };
  };
  PS.offlineCap = () => OFFLINE_CAP + (PS.B ? PS.B.offline : 0) * 60;
})();
