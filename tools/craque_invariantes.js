// Testes de regressão do motor: carreiras com escolhas ao acaso (as duas carreiras, com loja, apostas, mesa do Zé e convites)
// conferindo, a cada passo, regras que nunca podem quebrar. Esperado: "0 falhas".
// Uso (na raiz): node tools/craque_invariantes.js [carreiras] [semente]     (padrão 120 carreiras, metade Jogo a Jogo)
//
// O que confere:
//  1. Número quebrado: nenhum NaN/Infinity na carreira (no save vira null sem aviso e estraga contas depois).
//  2. Faixas: atributos 0–99, energia e relações 0–100, fama e dinheiro >= 0, idade sobe 1 por temporada, clube existe.
//  3. Save: a carreira passa por JSON (como no localStorage e na nuvem) no meio do caminho e, com as mesmas escolhas,
//     termina igualzinha à que não passou. Se não termina, há estado fora de `c` ou valor que o JSON não guarda.
//  4. Mesa do Zé: a aposta não some sem ser cobrada (mão de vinte e um largada no meio, dinheiro gasto antes de perder).
//  5. Liga do Jogo a Jogo fecha certa, também depois de trocar de clube na janela do meio do ano.
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');

const N = +process.argv[2] || 120, SEED = +process.argv[3] || 7;
// Sorteio próprio para as escolhas do robô e para o Math.random do motor (dá para repetir a mesma carreira)
const prng = s => { let a = s >>> 0; const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.state = () => a; f.set = v => { a = v; }; return f; };
const MR = prng(1); Math.random = MR;

const fails = [];
let steps = 0;
const fail = (car, msg) => { if (fails.filter(f => f.msg === msg).length < 3) fails.push({ car, msg }); };

// ---------- regras ----------
function walkNums(o, path, out) {
  if (typeof o === 'number') { if (!Number.isFinite(o)) out.push(path); return; }
  if (!o || typeof o !== 'object') return;
  for (const k in o) walkNums(o[k], path + '.' + k, out);
}
function check(car, c, where) {
  steps++;
  const bad = []; walkNums(c, 'c', bad);
  bad.slice(0, 2).forEach(p => fail(car, where + ': número quebrado em ' + p));
  for (const k in c.attrs) if (!(c.attrs[k] >= 0 && c.attrs[k] <= 99)) fail(car, where + ': atributo ' + k + ' fora de 0–99 (' + c.attrs[k] + ')');
  if (c.peak > 99) fail(car, where + ': pico acima de 99');
  if (!(c.fame >= 0)) fail(car, where + ': fama negativa');
  if (!((c.money || 0) >= 0)) fail(car, where + ': dinheiro negativo');
  if (c.debt !== undefined && !(c.debt >= 0 && isFinite(c.debt))) fail(car, where + ': dívida inválida ' + c.debt);
  ['coach', 'fans'].forEach(k => { if (!(c.rel[k] >= 0 && c.rel[k] <= 100)) fail(car, where + ': relação ' + k + ' fora de 0–100 (' + c.rel[k] + ')'); });
  if (c.club && !D.CLUB_BY_ID[c.club]) fail(car, where + ': clube inexistente ' + c.club);
  if (c.age !== 16 + c.season) fail(car, where + ': idade ' + c.age + ' na temporada ' + c.season);
  if (c.fc && c.fc.en !== undefined && !(c.fc.en >= 0 && c.fc.en <= 100)) fail(car, where + ': energia fora de 0–100');
}

// 5. Liga do Jogo a Jogo no fim do calendário (inclusive depois de trocar de clube no meio do ano): todo time jogou todas
//    as rodadas, gols marcados = sofridos, pontos batem com vitórias e empates, e você está na tabela
function leagueOk(car, c) {
  const fc = c.fc, lg = fc && fc.lg;
  if (!lg || !fc.done) return fail(car, 'T' + c.season + ': calendário terminou sem fechar a temporada');
  const R = lg.rounds.length, T = lg.tab, sum = k => T.reduce((a, x) => a + x[k], 0);
  if (T.some(x => x.j !== R)) fail(car, 'T' + c.season + (fc.moved ? ' (trocou no meio)' : '') + ': time com jogos diferentes de ' + R + ' rodadas (' + T.map(x => x.j).join(',') + ')');
  if (sum('gp') !== sum('gc')) fail(car, 'T' + c.season + ': gols marcados e sofridos não batem');
  if (T.some(x => x.p !== 3 * x.v + x.e || x.v + x.e + x.d !== x.j)) fail(car, 'T' + c.season + ': pontos não batem com o placar');
  if (lg.ids[0] !== c.club) fail(car, 'T' + c.season + ': você não está na tabela da liga do seu clube');
  if (fc.moved) moves++;
}
let moves = 0;

// ---------- um passo de cada vez (o robô escolhe ao acaso) ----------
const pick = (B, a) => a[Math.floor(B() * a.length)];
function preSeason(c, B) {
  const ch = S.traitChoices(c);
  if (ch.length) { const p = pick(B, ch); if (p.type === 'up') S.upgradeTrait(c, p.trait.id); else S.addTrait(c, p.trait.id); }
  for (let k = 0; k < 5 && B() < 0.7; k++) { const o = D.INVEST.filter(t => S.canInvest(c, t.id)); if (!o.length) break; S.invest(c, pick(B, o).id); }
  c.train = pick(B, D.TRAIN).id;
}
const doEvent = (c, B, ev) => { let i = Math.floor(B() * ev.options.length); if (ev.dest && i === 0 && S.breaksChallenge(c, { club: ev.dest })) i = 1; S.resolveEvent(c, ev, i); };
// Jogo a Jogo entre um jogo e outro: loja, apostas, convites, mesa do Zé
function jajExtras(car, c, B) {
  if (B() < 0.08 && !c.gear) { const g = pick(B, ['g1', 'g2', 'g3']); if ((c.money || 0) >= S.fcGearPrice(c, g)) S.fcBuy(c, 'gear', g, S.fcGearAttrs(c)[0]); }
  if (B() < 0.05) { const k = pick(B, ['video', 'pt', 'physio', 'nutri', 'press']); S.fcBuy(c, 'staff', k); }
  if (B() < 0.04) { if (B() < 0.5) S.fcBuy(c, 'life', 'house'); else S.fcBuy(c, 'car', pick(B, ['c1', 'c2', 'c3', 'c4'])); } // fase 3: patrimônio com manutenção (pode virar dívida)
  if (B() < 0.05 && c.debt > 0) { const w = pick(B, ['adv', 'help', 'car', 'house', 'cut']); if (w === 'adv') S.fcAdvance(c); else if (w === 'help') S.fcHelp(c); else if (w === 'cut') S.fcCut(c); else S.fcSell(c, w); } // as saídas do vermelho
  if (B() < 0.03) { const w = pick(B, ['im', 'st', 'party', 'grife', 'sellim']); if (w === 'im') S.fcInvBuy(c, 'imovel'); else if (w === 'st') S.fcInvBuy(c, 'startup', pick(B, S.fcInvStakes(c))); else if (w === 'party') S.fcParty(c); else if (w === 'grife') S.fcBuy(c, 'life', 'grife'); else S.fcInvSell(c, 0); } // investimentos, festa e grife
  if (B() < 0.15) { const R = S.fcBetRound(c); if (R && R.games.length) { const g = pick(B, R.games); S.fcBet(c, [{ h: g.h, a: g.a, m: 'x', pick: Math.floor(B() * 3) }], pick(B, S.fcBetStakes(c))); } }
  if (B() < 0.15 && S.fcNightCan(c)) {
    S.fcNight(c);
    for (let k = 0; k < 4; k++) {
      const stake = pick(B, S.fcChips(c)), g = pick(B, ['rol', 'slot', 'bj', 'bicho']);
      if (g === 'rol') S.fcRoulette(c, B() < 0.3 ? Math.floor(B() * 37) : pick(B, Object.keys(S.ROULETTE_BETS)), stake);
      else if (g === 'slot') S.fcSlot(c, stake);
      else if (g === 'bicho') S.fcBicho(c, Math.floor(B() * 25), pick(B, ['cab', 'cer']), stake);
      else if (!S.fcBjHand(c)) {
        const m0 = c.money || 0, bj = S.fcBjDeal(c, stake);
        // Larga a mão no meio e gasta o dinheiro (regra 4): a aposta já tem de ter saído
        if (bj && !bj.done && B() < 0.3) {
          if ((c.money || 0) > m0 - stake + 1e-6) fail(car, 'vinte e um: mão aberta sem cobrar a aposta');
          return;
        }
        let o = bj; while (o && !o.done) o = S.fcBjAct(c, pick(B, ['hit', 'stand', 'double']));
        // Mão terminada: o dinheiro mudou exatamente o que a mesa pagou menos o que foi apostado (inclusive dobrando)
        if (o && o.done && Math.abs((c.money || 0) - m0 - (o.back - o.stake)) > 1e-6) fail(car, 'vinte e um: dinheiro mudou ' + ((c.money || 0) - m0) + ', a mão diz ' + (o.back - o.stake));
      }
    }
  }
  if (B() < 0.03 && S.fcZeOffer) { const z = S.fcZeOffer(c); if (z) S.fcZeAnswer(c, B() < 0.5); }
}
// Uma temporada inteira (ou o que falta dela). Volta false quando a carreira acabou
function season(car, c, B) {
  if (c.retired) return false;
  if (c.mode === 'completa') {
    if (!c.fc || c.fc.done) { preSeason(c, B); S.fcStart(c); }
    let nx;
    while ((nx = S.fcNext(c))) {
      if (S.fcEventDue(c)) { const ev = S.fcPickEvent(c); if (ev) doEvent(c, B, ev); continue; }
      if (c.fc.wkDue) {
        S.fcInvites(c).forEach((inv, k) => { const a = pick(B, ['a', 'b', 'ig']); if (a !== 'ig') S.fcInvAnswer(c, k, a); });
        // Janela do meio do ano (fase 4): assina uma proposta, fica ou força uma troca para um clube qualquer (liga de outro tamanho)
        const w = S.fcWin(c);
        if (w && B() < 0.6) {
          if (w.offers.length && B() < 0.6) S.fcWinSign(c, Math.floor(B() * w.offers.length));
          else if (B() < 0.5) { const cl = pick(B, D.CLUBS.filter(x => x.id !== c.club)); S.fcMove(c, S.offerFor(c, cl.id, 'up')); w.st = 'signed'; }
          else S.fcWinStay(c);
        }
        S.fcWeek(c, B() < 0.5 ? null : [pick(B, S.FC_WEEK).id]);
        continue;
      }
      jajExtras(car, c, B);
      if (nx.moment) S.fcAutoMoment(c, nx.moment);
      S.fcPlay(c);
      const o = D.INVEST.filter(t => S.canInvest(c, t.id)); if (o.length && B() < 0.5) S.invest(c, pick(B, o).id);
      check(car, c, 'jogo T' + c.season);
    }
    leagueOk(car, c);
  } else {
    preSeason(c, B);
    const ev = S.pickEvent(c); if (ev) doEvent(c, B, ev);
    if (S.pickMoment(c)) S.autoMoment(c);
  }
  S.playSeason(c);
  for (const [is, call, start] of [[S.isWcYear, S.wcCall, S.wcStart], [S.isCwcYear, S.cwcCall, S.cwcStart]]) {
    if (is(c) && call(c).called) { start(c); let g; while ((g = S.wcNext(c))) { if (g.live) S.wcMomentAuto(c); if (g.pens) S.wcPensAuto(c); } }
  }
  check(car, c, 'fim da T' + c.season);
  if (S.mustRetire(c)) { c.retired = true; return false; }
  if (S.windowOpen(c)) {
    const offers = S.offers(c, false).concat([S.stayOffer(c)]).filter(o => !(c.challenge && !c.chFail && S.breaksChallenge(c, o)));
    if (offers.length) S.join(c, S.withTerm(pick(B, offers), pick(B, ['padrao', 'minutos', 'salario'])));
  }
  return true;
}
function career(car, c, B, upTo) { while (c.season < upTo && season(car, c, B)) { /* segue */ } return c; }

// ---------- carreiras ----------
const T0 = Date.now();
let roundTrips = 0;
for (let n = 0; n < N; n++) {
  const pos = ['ATA', 'MEI', 'ZAG', 'GOL'][n % 4], mode = n % 2 ? 'completa' : 'rapida';
  const car = '#' + n + ' ' + pos + ' ' + mode;
  const B = prng(SEED * 1000 + n);
  const c = S.newCareer({ name: 'Teste', pos, foot: 'D', country: D.COUNTRIES[n % D.COUNTRIES.length].id }, SEED * 7919 + n);
  if (mode === 'completa') c.mode = 'completa';
  const base = S.offers(c, true); S.join(c, pick(B, base));
  check(car, c, 'início');
  // Parte até uma temporada sorteada; depois segue em dois caminhos: o objeto vivo e uma cópia que passou pelo JSON
  const cut = 1 + Math.floor(B() * 10);
  career(car, c, B, cut);
  const copy = JSON.parse(JSON.stringify(c)), bState = B.state(), mState = MR.state();
  career(car, c, B, 99);
  const endA = JSON.stringify(c);
  B.set(bState); MR.set(mState);
  S.applyLeagues(copy); // como a tela inicial faz ao continuar (ui/start.js): as divisões e forças desta carreira
  career(car, copy, B, 99);
  roundTrips++;
  if (JSON.stringify(copy) !== endA) {
    const a = JSON.parse(endA), diff = Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(copy[k]));
    fail(car, 'save: carreira salva e carregada na T' + cut + ' terminou diferente (' + diff.slice(0, 5).join(', ') + ')');
  }
}
console.log(N + ' carreiras · ' + steps + ' conferências · ' + roundTrips + ' saves no meio · ' + moves + ' trocas no meio do ano · ' + ((Date.now() - T0) / 1000).toFixed(1) + ' s');
fails.forEach(f => console.log('FALHA ' + f.car + ': ' + f.msg));
console.log(fails.length ? fails.length + ' falhas' : '0 falhas');
process.exitCode = fails.length ? 1 : 0;
