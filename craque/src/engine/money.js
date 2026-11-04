// Jogo a Jogo, fase 3: dinheiro com risco. O dinheiro vai para três lugares (render em campo, status e risco) e cada
// um tem um lado ruim. Aqui: a manutenção do status (carro e casa custam por semana, num valor fixado na compra: quando
// o salário cai, ela pesa mais), a dívida (o que falta vira dívida com juros, que o salário paga primeiro) e as entradas
// novas (bônus por meta e título no fim do ano, luvas ao assinar contrato). Só no Jogo a Jogo (c.mode 'completa').
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;

  const on = c => c.mode === 'completa' && !!c.fc;
  const weekPay = c => Math.max(1, Math.round((c.wage || 0) * 52 / Math.max(1, (c.fc && c.fc.cal ? c.fc.cal.length : 46))));
  const R = v => 'R$ ' + (Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(Math.abs(v) / 1000) + ' mil');
  const k1000 = v => Math.round(v / 1000) * 1000;
  S.fcWeekPay = weekPay;

  // ---------- manutenção do status ----------
  // Fração do preço pago, por semana: seguro, garagem, funcionários, condomínio. Um superesportivo comprado no auge custa quase
  // um salário por semana quando o contrato seguinte for menor
  const MT = { car: 0.007, house: 0.0045 };
  S.FC_MT = MT;
  // Save antigo (carro ou casa sem manutenção guardada): conta pelo preço de hoje
  S.fcMoneySync = function (c) {
    const L = c.life;
    if (!L || !c.fc) return;
    L.mt = L.mt || {}; L.paid = L.paid || {};
    if (L.car && L.mt.car === undefined) { L.paid.car = S.fcCarPrice(c, L.car); L.mt.car = k1000(L.paid.car * MT.car); }
    if (L.house && L.mt.house === undefined) { L.paid.house = S.fcLifePrice(c, 'house'); L.mt.house = k1000(L.paid.house * MT.house); }
  };
  S.fcUpkeep = c => { const m = c.life && c.life.mt; return m ? Object.keys(m).reduce((a, k) => a + (m[k] || 0), 0) : 0; };
  S.fcUpkeepOf = (c, kind, id) => k1000((kind === 'car' ? S.fcCarPrice(c, id) : S.fcLifePrice(c, id)) * (kind === 'car' ? MT.car : MT[id]));
  const buy = S.fcBuy;
  S.fcBuy = function (c, kind, id, attr) {
    if ((kind === 'car' || kind === 'life') && (c.debt || 0) > 0) return false; // devendo, a loja não vende patrimônio
    const p = kind === 'car' ? S.fcCarPrice(c, id) : kind === 'life' ? S.fcLifePrice(c, id) : 0;
    const ok = buy(c, kind, id, attr);
    if (ok && (kind === 'car' || kind === 'life')) {
      const L = c.life, key = kind === 'car' ? 'car' : id;
      L.mt = L.mt || {}; L.paid = L.paid || {};
      L.paid[key] = p; L.mt[key] = k1000(p * MT[key]);
    }
    return ok;
  };

  // ---------- dívida ----------
  // Juros por semana; com a dívida acima de algumas semanas de salário, a cabeça pesa (energia da semana menor)
  const DEBT = { rate: 0.008, worry: 4, worryEn: 4 };
  S.FC_DEBT = DEBT;
  S.fcDebt = c => c.debt || 0;
  // Tira do saldo; o que faltar vira dívida. Volta quanto virou dívida
  S.fcCharge = function (c, v) {
    v = Math.max(0, Math.round(v));
    const m = c.money || 0;
    if (m >= v) { c.money = m - v; return 0; }
    c.money = 0; c.debt = (c.debt || 0) + (v - m);
    return v - m;
  };
  // Entra dinheiro: paga a dívida primeiro
  S.fcCredit = function (c, v) {
    v = Math.max(0, Math.round(v));
    const d = Math.min(c.debt || 0, v);
    if (d) c.debt -= d;
    if (!(c.debt > 0)) c.debt = 0;
    c.money = (c.money || 0) + v - d;
    return d;
  };
  const repay = c => { const d = Math.min(c.debt || 0, Math.max(0, c.money || 0)); if (d) { c.money -= d; c.debt -= d; } if (!(c.debt >= 1)) c.debt = 0; return d; };
  const say = (c, id, t, v) => (S._.phPost ? S._.phPost(c, id, t, v) : null);

  const DEBT_TXT = {
    start: 'Te avisando: a conta entrou no vermelho. Carro, casa e equipe estão custando mais do que entra. O banco cobra {j}% por semana em cima de {x}, e o salário vai pagando primeiro.',
    worry: 'Filho, fiquei sabendo das contas. Dinheiro a gente recupera, mas não deixa isso tirar o teu sono.',
    worryParca: 'mano tão falando que tu tá devendo na praça kkkk é verdade? se precisar de conversa eu tô aqui',
    clear: 'Dívida quitada. Agora segura os gastos, que a próxima não precisa existir.',
  };

  const week = S.fcWeek;
  S.fcWeek = function (c, acts) {
    const due = on(c) && c.fc.wkDue;
    if (due) S.fcMoneySync(c);
    const out = week(c, acts);
    if (!out || !due) return out;
    const fc = c.fc, wp = weekPay(c), had = c.debt || 0;
    // Manutenção do status: o que não couber vira dívida
    const up = S.fcUpkeep(c);
    out.upkeep = up;
    if (up) S.fcCharge(c, up);
    // Juros e pagamento com o que sobrou
    if (c.debt > 0) { const j = Math.round(c.debt * DEBT.rate); c.debt += j; out.interest = j; }
    out.repay = repay(c);
    out.debt = c.debt || 0;
    if (out.debt > DEBT.worry * wp) { fc.en = clamp(fc.en - DEBT.worryEn, 0, 100); out.en1 = fc.en; out.worry = true; }
    // Celular: o empresário avisa quando entra no vermelho e quando sai; a família quando pesa
    const M = (c.fin = c.fin || {});
    if (!had && out.debt > 0) { M.inN = (M.inN || 0) + 1; M.inAt = c.season; say(c, 'emp', DEBT_TXT.start, { x: R(out.debt), j: String(DEBT.rate * 100).replace('.', ',') }); }
    else if (had && !out.debt) say(c, 'emp', DEBT_TXT.clear);
    if (out.worry && M.wS !== c.season) { M.wS = c.season; say(c, (c.age || 20) < 24 || (M.wN || 0) % 2 === 0 ? 'mae' : 'parca', (c.age || 20) < 24 || (M.wN || 0) % 2 === 0 ? DEBT_TXT.worry : DEBT_TXT.worryParca); M.wN = (M.wN || 0) + 1; }
    M.maxDebt = Math.max(M.maxDebt || 0, out.debt / wp);
    return out;
  };

  // ---------- bônus do ano: meta e títulos ----------
  // Em semanas de salário, pagos no fim do calendário (o empresário avisa)
  const BONUS = [
    ['meta', 'meta do ano', 4, (c, o) => { const m = S.fcMeta(c); return !!m && m.have >= m.n; }],
    ['league', 'título da liga', 6, (c, o) => o.league],
    ['up', 'acesso', 4, (c, o) => !o.league && o.table && o.table.promo > 0 && o.pos <= o.table.promo],
    ['cup', 'copa nacional', 3, (c, o) => o.cup],
    ['cont', 'título continental', 6, (c, o) => o.cont],
    ['cont2', 'título continental', 3, (c, o) => o.cont2],
  ];
  S.FC_BONUS = BONUS;
  const fin = S.fcFinish;
  S.fcFinish = function (c) {
    const meta = on(c) ? S.fcMeta(c) : null; // a meta é lida antes do fim (depois o ano fecha)
    const ret = fin(c);
    if (!on(c) || !c.fc.out || c.fc.out.bonus) return ret;
    const o = c.fc.out, wp = weekPay(c), parts = [];
    BONUS.forEach(([k, name, wk, test]) => { if (k === 'meta' ? (meta && meta.have >= meta.n) : test(c, o)) parts.push([name, k1000(wk * wp)]); });
    const v = parts.reduce((a, p) => a + p[1], 0);
    o.bonus = { v, parts };
    if (v) {
      S.fcCredit(c, v);
      say(c, 'emp', 'Bônus do ano na conta: {x} (' + parts.map(p => p[0]).join(', ') + '). Tá no contrato e eu fiz questão de conferir.', { x: R(v) });
    }
    return ret;
  };

  // ---------- luvas ----------
  // Ao assinar: semanas do salário novo (clube novo paga mais que renovação). Base e empréstimo não têm
  const LUVAS = { move: 8, money: 12, stay: 4 };
  S.FC_LUVAS = LUVAS;
  S.fcLuvasOf = (c, offer) => {
    if (c.mode !== 'completa' || !offer || offer.kind === 'base' || offer.kind === 'loan') return 0;
    const wk = offer.club === c.club ? LUVAS.stay : offer.kind === 'money' ? LUVAS.money : LUVAS.move;
    return k1000((offer.wage || 0) * wk);
  };
  const join = S.join;
  S.join = function (c, offer) {
    const v = S.fcLuvasOf(c, offer);
    const ret = join(c, offer);
    if (v > 0) {
      S.fcCredit(c, v);
      c.luvas = { v, s: c.season, club: offer.club };
      if (c.ppl) say(c, 'emp', 'Luvas caíram: {x}. Assinado e pago. Agora é jogar o que eles pagaram.', { x: R(v) });
    }
    return ret;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
