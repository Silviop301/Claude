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
  const MT = { car: 0.007, house: 0.0045, grife: 0.012 };
  S.FC_MT = MT;
  // Save antigo (carro ou casa sem manutenção guardada): conta pelo preço de hoje
  S.fcMoneySync = function (c) {
    const L = c.life;
    if (!L || !c.fc) return;
    L.mt = L.mt || {}; L.paid = L.paid || {};
    if (L.car && L.mt.car === undefined) { L.paid.car = S.fcCarPrice(c, L.car); L.mt.car = k1000(L.paid.car * MT.car); }
    if (S.fcOwns(c, 'house') && L.mt.house === undefined) { L.paid.house = S.fcLifePrice(c, 'house'); L.mt.house = k1000(L.paid.house * MT.house); }
  };
  S.FC_STATUS = ['car', 'house', 'grife']; // o que tem manutenção e se vende no Banco
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
    start: 'Te avisando: a conta entrou no vermelho. Carro, casa e equipe estão custando mais do que entra. O banco cobra {j}% por semana em cima de {x}, e o salário vai pagando primeiro. Abre o Banco no celular que tem saída: eu adianto, dá pra vender alguma coisa ou renovar ganhando menos.',
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
    // Parcela do adiantamento do empresário: uma fatia do salário até pagar tudo
    const A = c.fin && c.fin.adv;
    if (A && A.left > 0) { const v = Math.min(A.left, Math.round(wp * ADV.cut)); S.fcCharge(c, v); A.left -= v; out.adv = v; if (A.left <= 0) c.fin.adv = null; }
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
    invWeek(c, out);
    return out;
  };

  // ---------- investimentos (fase 3, parte 4) ----------
  // Apartamento para alugar: aluguel toda semana (cerca de 6% do preço no ano); a cada temporada o valor de venda muda
  // (90% a 115% do pago) e, uma vez em cinco, um problema (inquilino some, reforma) custa 6% do preço.
  // Negócio do primo: o dinheiro fica preso até o começo da temporada seguinte; 35% volta triplicado, 65% volta 20%.
  // Um de cada por vez. Sorteio próprio, derivado da carreira e da temporada.
  const INVEST = { imovel: { wk: 40, rent: 0.0012, bad: 0.2, badCost: 0.06, lo: 0.9, hi: 1.15 }, startup: { p: 0.35, win: 3, lose: 0.2, stakes: [4, 12, 30] } };
  S.FC_INVEST = INVEST;
  const rngS = (c, salt) => S.rng(((Math.imul(Number(c.tseed) || 1, 2246822519) ^ Math.imul((c.season || 0) * 89 + salt, 3266489917)) >>> 0) || 1);
  S.fcInvs = c => (c.fin && c.fin.inv) || [];
  S.fcInvPrice = c => k1000(INVEST.imovel.wk * weekPay(c));
  S.fcInvStakes = c => INVEST.startup.stakes.map(w => k1000(w * weekPay(c)));
  S.fcInvHas = (c, id) => S.fcInvs(c).some(x => x.id === id);
  S.fcInvBuy = function (c, id, stake) {
    if (!on(c) || (c.debt || 0) > 0 || S.fcInvHas(c, id)) return null;
    const v = id === 'imovel' ? S.fcInvPrice(c) : S.fcInvStakes(c).includes(stake) ? stake : 0;
    if (!v || (c.money || 0) < v) return null;
    c.money -= v;
    const M = (c.fin = c.fin || {}), x = { id, paid: v, val: v, s: c.season };
    (M.inv = M.inv || []).push(x); M.invN = (M.invN || 0) + 1;
    if (id === 'startup') say(c, 'parca', 'mano meu primo já tá com o teu dinheiro. disse que no começo da próxima temporada tu vê o resultado. confia no pai kkkk');
    return x;
  };
  S.fcInvSell = function (c, k) {
    const L = S.fcInvs(c), x = L[k];
    if (!x || x.id !== 'imovel') return 0;
    L.splice(k, 1);
    S.fcCredit(c, x.val);
    return x.val;
  };
  // Semana: aluguel; virada de temporada: o imóvel muda de valor (e às vezes dá problema) e o negócio do primo sai
  function invWeek(c, out) {
    const L = S.fcInvs(c), M = c.fin;
    if (!L.length) return;
    const newS = M.invS !== c.season;
    M.invS = c.season;
    for (let k = L.length - 1; k >= 0; k--) {
      const x = L[k];
      if (x.id === 'imovel') {
        const r = Math.round(x.paid * INVEST.imovel.rent); S.fcCredit(c, r); out.rent = r;
        if (newS && x.s !== c.season) {
          const g = rngS(c, 11 + k), I = INVEST.imovel;
          x.val = k1000(x.paid * (I.lo + g() * (I.hi - I.lo)));
          if (g() < I.bad) { const cost = k1000(x.paid * I.badCost); S.fcCharge(c, cost); out.imBad = cost; say(c, 'emp', 'Problema no apartamento: o inquilino sumiu e deixou o imóvel destruído. A reforma custou {x}.', { x: R(cost) }); }
        }
      } else if (x.id === 'startup' && x.s !== c.season) {
        const g = rngS(c, 23), I = INVEST.startup, win = g() < I.p, back = k1000(x.paid * (win ? I.win : I.lose));
        L.splice(k, 1); S.fcCredit(c, back); out.startup = { win, back, paid: x.paid };
        (M.stLog = M.stLog || []).push({ s: c.season, win, net: back - x.paid });
        say(c, 'parca', win ? 'MANO O NEGÓCIO DO MEU PRIMO BOMBOU!! caiu {x} na tua conta. eu falei que era coisa séria kkkk' : 'mano… o negócio do meu primo fechou. só conseguiu devolver {x}. ele tá morrendo de vergonha, eu também', { x: R(back) });
      }
    }
  }

  // ---------- festa (status de uma noite) ----------
  // Uma por temporada: fama e torcida, o parça gosta, e a semana seguinte começa sem perna
  const PARTY = { wk: 6, fame: 3, fans: 2, en: -10 };
  S.FC_PARTY = PARTY;
  S.fcPartyPrice = c => Math.max(10000, k1000(PARTY.wk * weekPay(c)));
  S.fcPartyOk = c => on(c) && !((c.debt || 0) > 0) && (c.fin || {}).partyS !== c.season && (c.money || 0) >= S.fcPartyPrice(c);
  S.fcParty = function (c) {
    if (!S.fcPartyOk(c)) return false;
    const p = S.fcPartyPrice(c), M = (c.fin = c.fin || {});
    c.money -= p; M.partyS = c.season; M.partyN = (M.partyN || 0) + 1;
    c.fame += PARTY.fame; c.rel.fans = clamp(c.rel.fans + PARTY.fans, 0, 100);
    c.fc.en = clamp(c.fc.en + PARTY.en, 0, 100);
    if (S.fcRel) S.fcRel(c, 'parca', 4);
    say(c, 'parca', 'QUE FESTA FOI ESSA MANO kkkkk até agora tô ouvindo o pagode na cabeça. tu é brabo');
    return true;
  };

  // ---------- quebrar e voltar: as saídas do vermelho ----------
  // Adiantamento do empresário (paga a dívida agora; volta com 20% a mais, descontado do salário), vender o carro ou a casa
  // (pelo valor de revenda, e a manutenção some), a ajuda da mãe (só com a relação boa, uma vez a cada 3 temporadas) e
  // renovar ganhando menos (luvas na hora, salário 20% menor e mais um ano de contrato).
  const ADV = { wk: 10, fee: 0.2, cut: 0.3 }, SELL = { car: 0.6, house: 0.85, grife: 0.2 }, HELP = { wk: 8, gap: 3 }, CUT = { wage: 0.8, luvas: 12 };
  S.FC_ADV = ADV; S.FC_SELL = SELL;
  const debtOn = c => on(c) && (c.debt || 0) > 0;
  S.fcSellValue = (c, key) => k1000(((c.life && c.life.paid && c.life.paid[key]) || 0) * SELL[key]);
  S.fcSell = function (c, key) {
    S.fcMoneySync(c);
    const L = c.life;
    if (!L || !(key === 'car' ? L.car : S.fcOwns(c, key))) return 0;
    const v = S.fcSellValue(c, key), d = key === 'car' ? S.FC_SHOP.cars.find(x => x.id === L.car) : S.FC_SHOP.life.find(x => x.id === key);
    delete L[key];
    delete L.mt[key]; delete L.paid[key];
    c.fame = Math.max(0, c.fame - Math.round(((d && d.fame) || 0) / 2));
    S.fcCredit(c, v);
    const M = (c.fin = c.fin || {}); M.sold = (M.sold || 0) + 1;
    if (c.ppl && S._.phNews && key !== 'grife') S._.phNews(c, key === 'car' ? 'venda.car' : 'venda.house');
    return v;
  };
  S.fcAdvanceOk = c => debtOn(c) && !(c.fin && c.fin.adv) && (c.fin || {}).advS !== c.season;
  S.fcAdvanceOf = c => k1000(Math.min(ADV.wk * weekPay(c), (c.debt || 0) + weekPay(c)));
  S.fcAdvance = function (c) {
    if (!S.fcAdvanceOk(c)) return 0;
    const v = S.fcAdvanceOf(c), M = (c.fin = c.fin || {});
    M.adv = { left: k1000(v * (1 + ADV.fee)), v }; M.advS = c.season; M.advN = (M.advN || 0) + 1;
    S.fcCredit(c, v);
    say(c, 'emp', 'Mandei {x}. Volta com 20% a mais, um pedaço do teu salário por semana até fechar. E segura a onda, combinado?', { x: R(v) });
    return v;
  };
  S.fcHelpOk = c => debtOn(c) && !!c.ppl && S.fcTone(c, 'mae') === 'bom' && !((c.fin || {}).helpS > c.season - HELP.gap);
  S.fcHelpOf = c => k1000(Math.min(HELP.wk * weekPay(c), c.debt || 0));
  S.fcHelp = function (c) {
    if (!S.fcHelpOk(c)) return 0;
    const v = S.fcHelpOf(c), M = (c.fin = c.fin || {});
    M.helpS = c.season; M.helpN = (M.helpN || 0) + 1;
    S.fcCredit(c, v);
    if (S.fcRel) S.fcRel(c, 'mae', -6);
    say(c, 'mae', 'Filho, mandei o que a gente tinha guardado. Não precisa devolver agora. Só me promete que vai se cuidar com dinheiro');
    return v;
  };
  S.fcCutOk = c => debtOn(c) && (c.debt || 0) > 4 * weekPay(c) && !c.loan && (c.contract || 0) >= 1 && (c.fin || {}).cutS !== c.season;
  S.fcCutOf = c => { const w = k1000((c.wage || 0) * CUT.wage); return { wage: w, luvas: k1000(w * CUT.luvas) }; };
  S.fcCut = function (c) {
    if (!S.fcCutOk(c)) return null;
    const o = S.fcCutOf(c), M = (c.fin = c.fin || {});
    M.cutS = c.season; M.cutN = (M.cutN || 0) + 1;
    c.wage = o.wage; c.contract = (c.contract || 0) + 1;
    S.fcCredit(c, o.luvas);
    c.luvas = { v: o.luvas, s: c.season, club: c.club, cut: true };
    say(c, 'emp', 'Fechei a renovação: {x} de luvas agora, salário menor e mais um ano. Não é o contrato dos sonhos, mas tira a corda do pescoço.', { x: R(o.luvas) });
    return o;
  };
  // As saídas, para a tela (ok: dá agora; v: quanto entra)
  S.fcWays = function (c) {
    S.fcMoneySync(c);
    const L = c.life || {}, out = [];
    out.push({ id: 'adv', ok: S.fcAdvanceOk(c), v: debtOn(c) ? S.fcAdvanceOf(c) : 0 });
    if (L.car) out.push({ id: 'car', ok: true, v: S.fcSellValue(c, 'car') });
    if (S.fcOwns(c, 'house')) out.push({ id: 'house', ok: true, v: S.fcSellValue(c, 'house') });
    if (S.fcOwns(c, 'grife')) out.push({ id: 'grife', ok: true, v: S.fcSellValue(c, 'grife') });
    (S.fcInvs(c) || []).forEach((x, k) => { if (x.id === 'imovel') out.push({ id: 'imovel', k, ok: true, v: x.val }); });
    if (c.ppl) out.push({ id: 'help', ok: S.fcHelpOk(c), v: debtOn(c) ? S.fcHelpOf(c) : 0 });
    out.push({ id: 'cut', ok: S.fcCutOk(c), v: S.fcCutOf(c).luvas, wage: S.fcCutOf(c).wage });
    return out;
  };
  if (S.FC_NEWS) Object.assign(S.FC_NEWS, {
    'venda.car': { j: '{me} vende o carrão e aparece de carro popular no treino', x: 'o {me} chegou no CT de carro popular kkkk ou tá humilde ou tá devendo' },
    'venda.house': { j: '{me} põe a mansão à venda', x: 'a casa do {me} tá à venda no site de imóveis. alguém sabe o que aconteceu?' },
  });

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

  // ---------- o Zé no Chat: conversa, palpites e a proposta ----------
  // O Zé é um contato do celular. Você pede um palpite (até 2 por rodada), ele manda um jogo da rodada com a cotação, e dá
  // para apostar ali mesmo (o cupom é o mesmo do app de apostas: o faro da federação conta igual). A proposta do amarelo
  // chega na conversa dele. Mensagens suas ficam no mesmo histórico (m.me), sem contar como não lida.
  const ZE_TIPS = 2;
  const zeP = c => { const P = S.fcPeople(c); if (P && !P.p.ze) P.p.ze = { n: 'Zé', rel: 60, mem: [] }; return P; };
  const me = (c, t) => { const P = zeP(c); if (!P) return null; const m = { p: 'ze', t, at: c.fc ? c.fc.i : 0, s: c.season, me: true }; P.inbox.push(m); if (P.inbox.length > 120) P.inbox.splice(0, P.inbox.length - 120); return m; };
  const ze = (c, t, v, extra) => { if (!zeP(c)) return null; const m = say(c, 'ze', t, v); if (m && extra) Object.assign(m, extra); return m; };
  const nm = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].name : id);
  const odd = o => String(o.toFixed(2)).replace('.', ',');
  const TIP_TXT = {
    'x0': ['esse aqui é barbada: {h} ganha do {a} em casa. paga {o}', '{h} em casa contra o {a}? vitória do {h}, anota. paga {o}'],
    'x2': ['o {a} vai buscar o resultado na casa do {h}, confia. paga {o}', 'pode ir no {a} fora de casa. o {h} tá em crise, me contaram. paga {o}'],
    'x1': ['{h} x {a} tem cheiro de empate. paga {o}, é pra quem tem coragem kkk', 'empate em {h} x {a}. dois times com medo de perder. paga {o}'],
    'o250': ['{h} x {a} vai ter gol pra caramba, mais de 2,5. paga {o}', 'mais de 2,5 gols em {h} x {a}. as duas defesas são uma peneira. paga {o}'],
    'o251': ['{h} x {a} vai ser truncado, menos de 2,5 gols. paga {o}', 'jogo amarrado: menos de 2,5 em {h} x {a}. paga {o}'],
    'btts0': ['os dois marcam em {h} x {a}, pode anotar. paga {o}', 'ambos marcam em {h} x {a}. nenhum dos dois sabe defender kkk paga {o}'],
  };
  S.fcZeMad = c => !!(c.fc && c.fc.zeMad > c.fc.i);
  // Palpites da rodada aberta: [{ h, a, m, pick, odd, lg }]; null sem rodada
  S.fcZeTips = function (c) {
    const fc = c.fc, R = fc && S.fcBetRound(c);
    if (!R) return null;
    if (!fc.zeT || fc.zeT.ri !== R.ri || fc.zeT.s !== c.season) fc.zeT = { ri: R.ri, s: c.season, tips: [] };
    return fc.zeT.tips;
  };
  S.fcZeCanTip = c => { const t = S.fcZeTips(c); return !!t && t.length < ZE_TIPS && !S.fcZeMad(c); };
  // Pede um palpite: a sua mensagem e a resposta do Zé (com o palpite anexado). Volta a mensagem do Zé
  S.fcZeAsk = function (c) {
    const fc = c.fc, tips = S.fcZeTips(c);
    if (!tips) { me(c, 'zé, manda um palpite aí'); return ze(c, 'rodada fechada agora, parceiro. depois do teu jogo eu abro de novo'); }
    me(c, tips.length ? 'manda outro aí' : 'zé, manda um palpite aí');
    if (S.fcZeMad(c)) { const m = c.ppl.inbox[c.ppl.inbox.length - 1]; m.seen = true; return null; } // visualizou e não respondeu
    if (tips.length >= ZE_TIPS) return ze(c, 'chega de palpite por hoje. o resto é contigo, que eu não sou vidente kkk');
    const R = S.fcBetRound(c), used = new Set(tips.map(t => t.h));
    const r = S.rng(((Math.imul(Number(c.tseed) || 1, 2654435761) ^ Math.imul(c.season * 97 + R.ri * 13 + tips.length, 2246822519)) >>> 0) || 1);
    const games = R.games.filter(g => !used.has(g.h));
    const g = games[Math.floor(r() * games.length)] || R.games[0];
    const fav = g.odds.x[0] <= g.odds.x[2] ? 0 : 2;
    const opts = [['x', fav, 4], ['x', 2 - fav, 1], ['x', 1, 1], ['o25', 0, 2], ['o25', 1, 1.5], ['btts', 0, 2]];
    let u = r() * opts.reduce((a, o) => a + o[2], 0), pk = opts[0];
    for (const o of opts) if ((u -= o[2]) <= 0) { pk = o; break; }
    const o = g.odds[pk[0]][pk[1]], tip = { h: g.h, a: g.a, m: pk[0], pick: pk[1], odd: o, lg: g.lg };
    tips.push(tip);
    const pool = TIP_TXT[pk[0] + pk[1]];
    return ze(c, pool[Math.floor(r() * pool.length)], { h: nm(g.h), a: nm(g.a), o: odd(o) }, { tip: Object.assign({ ri: R.ri }, tip) });
  };
  // Aposta no palpite de uma mensagem do Zé (índice no histórico do celular). Volta o cupom ou null
  S.fcZeBet = function (c, k, stake) {
    const P = c.ppl, m = P && P.inbox[k];
    if (!m || m.p !== 'ze' || !m.tip || m.tip.done || m.tip.ri !== (S.fcBetRound(c) || {}).ri) return null;
    const t = S.fcBet(c, [{ h: m.tip.h, a: m.tip.a, m: m.tip.m, pick: m.tip.pick }], stake);
    if (!t) return null;
    m.tip.done = stake;
    me(c, 'bota ' + R(stake) + ' nessa');
    ze(c, r1(c, ['anotado. sai na rodada 🤝', 'fechado. agora é torcer kkk', 'tá no cupom. sigilo total, como sempre']));
    return t;
  };
  const r1 = (c, list) => list[((c.fc ? c.fc.i : 0) + (c.ppl ? c.ppl.inbox.length : 0)) % list.length];
  // A proposta do amarelo chega como mensagem do Zé (uma vez); a resposta sai pela conversa
  S.fcZeSync = function (c) {
    const f = c.mode === 'completa' && c.fc ? S.fcZeOffer(c) : null;
    if (!f || f.st !== 'open' || f.posted) return null;
    f.posted = true;
    const nx = S.fcNext(c);
    return ze(c, 'papo reto: leva um amarelo até os {min}\' contra o {vs} e te pago {x}. ninguém vai saber', { min: f.min, vs: nm(nx.vs), x: R(f.pay) }, { fix: f.i });
  };
  S.fcZeFix = function (c, yes) {
    const f = c.fc && c.fc.fix;
    if (!f || !S.fcZeAnswer(c, yes)) return false;
    me(c, yes ? 'fechado. amarelo até os ' + f.min + "'" : 'tô fora, zé. não mexo com isso');
    if (yes) ze(c, 'é nóis. depois do jogo o dinheiro cai. e apaga essa conversa kkk');
    else ze(c, 'tranquilo. finge que eu nem falei nada');
    return true;
  };
  // Depois da rodada: o Zé conta como foram os cupons e paga o combinado
  const playZ = S.fcPlay;
  S.fcPlay = function (c, force) {
    const out = playZ(c, force);
    if (out && c.mode === 'completa' && c.ppl) {
      if (out.bets && out.bets.length && !out.betCaught) {
        const net = out.bets.reduce((a, b) => a + b.pay - b.stake, 0), won = out.bets.filter(b => b.win).length;
        ze(c, won ? (net > 0 ? 'BATEU! a rodada te pagou {x} de lucro. eu não falei? 😎' : 'acertou um, mas no total ficou {x} no vermelho. faz parte') : out.bets.length > 1 ? 'nenhum cupom bateu. a rodada tava maluca, a próxima é nossa' : 'não deu dessa vez. a próxima a gente acerta, confia', { x: R(Math.abs(net)) });
      }
      if (out.betCaught) ze(c, 'apaga tudo. a federação tá em cima. não me liga mais por uns tempos');
      if (out.fix && out.fix.pay && !out.fix.caught) ze(c, 'caiu na conta: {x}. foi um prazer kkk', { x: R(out.fix.pay) });
    }
    return out;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
