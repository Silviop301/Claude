// Jogo a Jogo: a mesa dos fundos do Zé (roleta, caça-níquel, vinte e um e bicho) e a tentação (o Zé pede um cartão
// no seu próprio jogo). Só dinheiro do jogo. Uma noite entre um jogo e outro: custa energia, pode sair foto,
// e as fichas da noite têm limite (2 salários da semana; o que você ganha aumenta o limite). A casa sempre leva vantagem.
// Os sorteios usam o fluxo da temporada (c.fc.seed): recarregar a página não refaz uma jogada.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;
  const rngOf = fc => { const r = S.rng(fc.seed); return { r, save: () => { fc.seed = r.state(); } }; };
  const weekPay = c => Math.round((c.wage || 0) * 52 / Math.max(1, c.fc.cal.length));

  // ---------- a noite ----------
  const NIGHT_EN = 12, NIGHT_PHOTO = 0.1;
  S.FC_NIGHT_EN = NIGHT_EN; S.FC_NIGHT_PHOTO = NIGHT_PHOTO;
  S.fcNightLimit = c => Math.max(5000, Math.round(weekPay(c) * 2 / 1000) * 1000);
  S.fcNightOpen = c => !!(c.fc && c.fc.night && c.fc.night.at === c.fc.i);
  S.fcNightCan = c => !!(c.fc && !c.fc.done && S.fcNext(c) && !S.fcNightOpen(c) && (c.money || 0) >= 1000);
  // Abre a noite: energia agora, chance de foto (fama e técnico), fichas com limite
  S.fcNight = function (c) {
    if (!S.fcNightCan(c)) return null;
    const fc = c.fc, { r, save } = rngOf(fc);
    fc.en = clamp((fc.en === undefined ? 100 : fc.en) - NIGHT_EN, 0, 100);
    const photo = r() < NIGHT_PHOTO;
    if (photo) { c.fame = Math.max(0, c.fame - 4); c.rel.coach = clamp(c.rel.coach - 6, 0, 100); }
    save();
    fc.night = { at: fc.i, lim: S.fcNightLimit(c), net: 0, photo };
    fc.nights = (fc.nights || 0) + 1;
    return fc.night;
  };
  // Quanto ainda dá para pôr na mesa esta noite
  S.fcNightLeft = c => (S.fcNightOpen(c) ? Math.max(0, Math.min(c.money || 0, c.fc.night.lim + c.fc.night.net)) : 0);
  S.fcChips = c => { const b = Math.max(1000, Math.round(S.fcNightLimit(c) / 12 / 1000) * 1000); return [b, b * 2, b * 5]; };
  function settle(c, stake, back, game) {
    const fc = c.fc, net = back - stake;
    c.money = Math.max(0, (c.money || 0) + net); fc.night.net += net;
    const L = c.casLog = c.casLog || { n: 0, net: 0, best: 0 };
    L.n++; L.net += net; if (net > L.best) L.best = net;
    L[game] = (L[game] || 0) + net;
    return net;
  }
  const canStake = (c, stake) => S.fcNightOpen(c) && stake > 0 && stake <= S.fcNightLeft(c);

  // ---------- roleta (37 casas, o zero é da casa) ----------
  const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  S.ROULETTE_RED = RED;
  S.ROULETTE_BETS = { red: ['Vermelho', 2], black: ['Preto', 2], even: ['Par', 2], odd: ['Ímpar', 2], low: ['1 a 18', 2], high: ['19 a 36', 2], d1: ['1ª dúzia', 3], d2: ['2ª dúzia', 3], d3: ['3ª dúzia', 3] };
  const rWins = (bet, n) => {
    if (typeof bet === 'number') return bet === n;
    if (!n) return false;
    return { red: RED.includes(n), black: !RED.includes(n), even: n % 2 === 0, odd: n % 2 === 1, low: n <= 18, high: n >= 19, d1: n <= 12, d2: n > 12 && n <= 24, d3: n > 24 }[bet];
  };
  // bet: chave de S.ROULETTE_BETS ou um número de 0 a 36 (paga 36×)
  S.fcRoulette = function (c, bet, stake) {
    const okBet = typeof bet === 'number' ? bet >= 0 && bet <= 36 && bet % 1 === 0 : !!S.ROULETTE_BETS[bet];
    if (!okBet || !canStake(c, stake)) return null;
    const { r, save } = rngOf(c.fc), n = Math.floor(r() * 37); save();
    const mult = typeof bet === 'number' ? 36 : S.ROULETTE_BETS[bet][1], win = rWins(bet, n), back = win ? stake * mult : 0;
    return { n, red: RED.includes(n), win, back, net: settle(c, stake, back, 'rol') };
  };

  // ---------- caça-níquel: taça, chuteira, bola, rede, cartão vermelho ----------
  // Devolve em média 92%: três iguais pagam alto, duas iguais pagam pouco, três cartões tiram mais uma aposta
  const SLOT = [
    { id: 'taca', name: 'Taça', e: '🏆', p: 0.07, three: 60, two: 3 },
    { id: 'chut', name: 'Chuteira', e: '👟', p: 0.11, three: 25, two: 2 },
    { id: 'bola', name: 'Bola', e: '⚽', p: 0.2, three: 10, two: 1.5 },
    { id: 'rede', name: 'Rede', e: '🥅', p: 0.3, three: 5, two: 1.2 },
    { id: 'card', name: 'Cartão vermelho', e: '🟥', p: 0.32, three: -1, two: 1 },
  ];
  S.SLOT = SLOT;
  S.fcSlot = function (c, stake) {
    if (!canStake(c, stake)) return null;
    const { r, save } = rngOf(c.fc), spin = () => { let x = r(); for (let k = 0; k < SLOT.length; k++) { x -= SLOT[k].p; if (x < 0) return k; } return SLOT.length - 1; };
    const reels = [spin(), spin(), spin()]; save();
    let mult = 0, hit = null;
    const cnt = {}; reels.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; });
    for (const k in cnt) { if (cnt[k] === 3) { mult = SLOT[k].three; hit = 3; } else if (cnt[k] === 2) { mult = SLOT[k].two; hit = 2; } }
    // Três cartões: perde a aposta e mais uma (se tiver)
    const back = mult < 0 ? -Math.min(stake, Math.max(0, (c.money || 0) - stake)) : Math.round(stake * mult);
    return { reels, hit, mult, back, net: settle(c, stake, back, 'slot') };
  };

  // ---------- vinte e um (a banca para no 17; vinte e um de cara paga 2,5×) ----------
  const draw = r => { const v = 1 + Math.floor(r() * 13); return { v, s: Math.floor(r() * 4) }; };
  const val = v => (v === 1 ? 11 : v > 10 ? 10 : v);
  S.bjTotal = h => { let t = 0, a = 0; h.forEach(x => { t += val(x.v); if (x.v === 1) a++; }); while (t > 21 && a) { t -= 10; a--; } return t; };
  S.fcBjHand = c => (c.fc && c.fc.bj) || null;
  function bjEnd(c, bj, r) {
    const fc = c.fc, p = S.bjTotal(bj.p);
    if (p <= 21 && !bj.nat) while (S.bjTotal(bj.d) < 17) bj.d.push(draw(r));
    const d = S.bjTotal(bj.d), dNat = bj.d.length === 2 && d === 21;
    let back = 0;
    if (bj.nat) back = dNat ? bj.stake : Math.round(bj.stake * 2.5);
    else if (p > 21) back = 0;
    else if (dNat || (d <= 21 && d > p)) back = 0;
    else if (d === p) back = bj.stake;
    else back = bj.stake * 2;
    bj.done = true; bj.back = back; bj.net = settle(c, bj.stake, back, 'bj');
    fc.bj = null;
    return bj;
  }
  S.fcBjDeal = function (c, stake) {
    if (S.fcBjHand(c) || !canStake(c, stake)) return null;
    const { r, save } = rngOf(c.fc);
    const bj = { stake, p: [draw(r), draw(r)], d: [draw(r), draw(r)] };
    c.fc.bj = bj;
    if (S.bjTotal(bj.p) === 21) { bj.nat = true; const o = bjEnd(c, bj, r); save(); return o; }
    save();
    return bj;
  };
  // act: 'hit' (pedir), 'stand' (parar), 'double' (dobrar: só com duas cartas, recebe uma e para)
  S.fcBjAct = function (c, act) {
    const bj = S.fcBjHand(c);
    if (!bj) return null;
    const { r, save } = rngOf(c.fc);
    let o = bj;
    if (act === 'double') {
      if (bj.p.length !== 2 || !canStake(c, bj.stake * 2)) { save(); return bj; }
      bj.stake *= 2; bj.p.push(draw(r)); o = bjEnd(c, bj, r);
    } else if (act === 'hit') { bj.p.push(draw(r)); if (S.bjTotal(bj.p) >= 21) o = bjEnd(c, bj, r); }
    else if (act === 'stand') o = bjEnd(c, bj, r);
    save();
    return o;
  };

  // ---------- jogo do bicho: o resultado sai com a próxima data do calendário ----------
  S.BICHOS = ['Avestruz', 'Águia', 'Burro', 'Borboleta', 'Cachorro', 'Cabra', 'Carneiro', 'Camelo', 'Cobra', 'Coelho', 'Cavalo', 'Elefante', 'Galo', 'Gato', 'Jacaré', 'Leão', 'Macaco', 'Porco', 'Pavão', 'Peru', 'Touro', 'Tigre', 'Urso', 'Veado', 'Vaca'];
  S.BICHO_MODES = { cab: ['Na cabeça', 18], cer: ['Do 1º ao 5º', 3.5] };
  const grupo = n => { const dz = n % 100; return dz === 0 ? 24 : Math.ceil(dz / 4) - 1; }; // 01-04 avestruz ... 97-00 vaca
  S.fcBicho = function (c, g, mode, stake) {
    if (!(g >= 0 && g < 25) || !S.BICHO_MODES[mode] || !canStake(c, stake)) return null;
    const fc = c.fc;
    c.money -= stake; fc.night.net -= stake;
    (fc.bicho = fc.bicho || []).push({ g, mode, stake });
    return fc.bicho[fc.bicho.length - 1];
  };
  // Dentro do fcPlay: sorteia os cinco prêmios e paga
  S.fcBichoResolve = function (c, fc, out, r) {
    if (!fc.bicho || !fc.bicho.length) return;
    const prem = [0, 0, 0, 0, 0].map(() => Math.floor(r() * 10000)), gs = prem.map(grupo);
    const L = c.casLog = c.casLog || { n: 0, net: 0, best: 0 };
    out.bicho = { prem, head: gs[0], bets: fc.bicho.map(b => {
      const win = b.mode === 'cab' ? gs[0] === b.g : gs.includes(b.g), back = win ? Math.round(b.stake * S.BICHO_MODES[b.mode][1]) : 0;
      c.money = (c.money || 0) + back;
      L.n++; L.net += back - b.stake; L.bicho = (L.bicho || 0) + back - b.stake; if (back - b.stake > L.best) L.best = back - b.stake;
      return Object.assign({}, b, { win, back });
    }) };
    fc.bicho = [];
  };

  // ---------- a tentação: o Zé pede um amarelo no seu jogo ----------
  const FIX_P = 0.1, FIX_MAX = 2, FIX_GAP = 6, FIX_SCANDAL = 0.3, FIX_BAN = 10;
  S.FC_FIX_SCANDAL = FIX_SCANDAL; S.FC_FIX_BAN = FIX_BAN;
  S.fcFixPay = c => Math.max(30000, Math.round(weekPay(c) * 8 / 1000) * 1000);
  // Proposta para o próximo jogo (se houver). Sorteio à parte, derivado da carreira e da data: não muda ao reabrir
  S.fcZeOffer = function (c) {
    const fc = c.fc;
    if (!fc || fc.done) return null;
    if (fc.fix && fc.fix.i === fc.i) return fc.fix;
    const nx = S.fcNext(c);
    if (!nx || !nx.vs || nx.e.k !== 'lg' || nx.injury || fc.i < 4 || (fc.fixN || 0) >= FIX_MAX || fc.i - (fc.fixLast === undefined ? -99 : fc.fixLast) < FIX_GAP || S.fcStartP(c) < 0.5) return null; // só para quem costuma jogar
    const r = S.rng(((Math.imul(Number(c.tseed) || 1, 2654435761) ^ Math.imul(c.season * 53 + fc.i, 40503)) >>> 0));
    if (r() >= FIX_P) return null;
    fc.fix = { i: fc.i, pay: S.fcFixPay(c), min: 10 + Math.floor(r() * 26), st: 'open' };
    fc.fixN = (fc.fixN || 0) + 1; fc.fixLast = fc.i;
    return fc.fix;
  };
  S.fcZeAnswer = function (c, yes) {
    const f = c.fc && c.fc.fix;
    if (!f || f.i !== c.fc.i || f.st !== 'open') return false;
    f.st = yes ? 'yes' : 'no';
    if (!yes) c.fc.zeMad = c.fc.i + 3; // o Zé fica uns jogos sem mandar mensagem
    return true;
  };
  // Dentro do fcPlay, depois do seu jogo: se você entrou em campo, levou o amarelo e recebeu; 30% vira escândalo
  S.fcFixResolve = function (c, fc, out, r) {
    const f = fc.fix;
    if (!f || f.i !== fc.i || f.st !== 'yes') return;
    fc.fix = null;
    if (!out.my || !out.my.on) { out.fix = { pay: 0, off: true }; return; }
    c.money = (c.money || 0) + f.pay;
    const caught = r() < FIX_SCANDAL;
    out.fix = { pay: f.pay, min: f.min, caught };
    c.fixLog = c.fixLog || { n: 0, caught: 0 }; c.fixLog.n++;
    if (caught) {
      c.fixLog.caught++;
      fc.injOut = Math.max(fc.injOut, FIX_BAN); fc.injName = 'suspensão por manipulação';
      c.rel.coach = clamp(c.rel.coach - 20, 0, 100); c.rel.fans = clamp(c.rel.fans - 15, 0, 100); c.fame = Math.max(0, c.fame - 10);
    }
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
