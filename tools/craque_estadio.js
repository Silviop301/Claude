// Estádio do Treinador (engine/coachest.js, fases 1 a 3: público, humor da torcida, ingresso e obras): confere as regras que não podem quebrar.
// Uso (na raiz): node tools/craque_estadio.js [carreiras] [temporadas]      (padrão 30 e 5). Esperado: "0 alertas".
//
// O que confere:
//  1. Estádio da chegada de todos os clubes: níveis de 1 a 5, de 6 a 70 mil lugares, sempre o mesmo para o mesmo clube,
//     e clube mais forte nunca com estádio menor que um mais fraco.
//  2. Carreiras do robô: público inteiro, de 100 em 100, maior que zero e nunca acima dos lugares; humor de 0 a 100 sem NaN;
//     "tranquila" é a palavra mais comum e nenhuma passa de 60% dos jogos; casa cheia entre 10% e 45% dos jogos em casa;
//     lotação média entre 65% e 92%.
//  3. Bilheteria: com o estádio da chegada, a torcida tranquila e o preço normal ela é igual à de sempre (a régua); a
//     bilheteria paga no jogo bate com o público que foi; o robô, sempre no preço normal, fica entre 92% e 108% da de sempre.
//  4. Ingresso: nenhum preço é o melhor sempre. O normal rende mais (ou empata) em pelo menos metade dos jogos, o caro
//     ganha quando a casa lota (pelo menos 5% dos jogos), o popular nunca rende mais e sempre leva mais gente, e o
//     salgado ganha em menos de 10%. A torcida empurra em casa no máximo `S.CO_EST.push` e zero quando tranquila.
//  4b. Save: passar pelo JSON no meio da temporada não muda o fim; save antigo (sem co.est) ganha o estádio do clube; o
//     estádio da fase 1 (sem cap0 nem preço) ganha os dois sem mudar o fim.
//  5. O estádio é do clube: trocar de time guarda o antigo e abre o do novo.
//  6. Obras (fase 3): um robô que amplia sempre que a diretoria deixa (o setor mais barato, alternando os três jeitos e
//     as parcelas). Confere: pedido recusado não mexe em nada; aprovado tira a 1ª parcela do caixa e nunca deixa menos
//     que a folga; setor em obra fica fechado e reabre maior; o que saiu do caixa bate com o preço; a econômica atrasa
//     em 15% a 55% das vezes; acelerar tira 2 rodadas no máximo 2 vezes; trocar de clube termina a obra sem cobrar mais;
//     save no meio da obra termina igual. Mede obras por temporada, lugares no fim, recusas, meta e caixa contra o robô
//     que não constrói (a obra não pode quebrar o clube: demissões e rodadas no vermelho no máximo 6 pontos acima).
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 30, SEASONS = +process.argv[3] || 5, E = S.CO_EST;
['folga', 'rest', 'novo', 'hum'].forEach(k => { const v = process.env['OB_' + k.toUpperCase()]; if (v != null) E.obra[k] = +v; });
if (process.env.OB_GAMES) E.obra.games = [0, 0].concat(process.env.OB_GAMES.split(',').map(Number));   // para medir um número das obras
const alerts = [];
const alert = m => { if (alerts.length < 30) alerts.push(m); else if (alerts.length === 30) alerts.push('…'); };
const pct = (a, b) => Math.round(100 * a / Math.max(1, b));

// 1. estádio da chegada
const caps = [];
D.CLUBS.forEach(cl => {
  const lv = S.coEstStart(cl.id), again = S.coEstStart(cl.id), cap = E.keys.reduce((a, k) => a + S.coEstSeats(k, lv[k]), 0);
  if (JSON.stringify(lv) !== JSON.stringify(again)) alert('chegada muda: ' + cl.id);
  if (E.keys.some(k => !(lv[k] >= 1 && lv[k] <= 5)) || cap < 6000 || cap > 70000) alert('chegada fora da faixa: ' + cl.id + ' ' + JSON.stringify(lv));
  caps.push({ s: cl.strength0 || cl.strength, cap, id: cl.id });
});
caps.sort((a, b) => a.s - b.s);
for (let i = 1, mx = 0; i < caps.length; i++) { if (caps[i].s > caps[i - 1].s) mx = Math.max(mx, ...caps.filter(c => c.s === caps[i - 1].s).map(c => c.cap)); if (caps[i].cap < mx) alert('clube mais forte com estádio menor: ' + caps[i].id); }

// O robô que constrói: sem obra andando, pede o setor mais barato; alterna o jeito e as parcelas pela carreira e pela rodada
function OB() { return { n: 0, cost: 0, no: {}, ask: 0, eco: 0, late: 0, rush: 0, left: 0, done: 0, rounds: 0 }; }
const MODES = ['nor', 'rap', 'eco'];
function build(co, st, n) {
  const e = S.coEst(co), fin = co.fin, ob = st.ob; if (!e || !fin || !co.ss || co.ss.done) return;
  if (e.done) { const d = S.coEstDone(co, true); ob.done++; if (e.lv[d.k] !== d.to || e.obra) alert('obra pronta sem o nível novo (carreira ' + n + ')'); }
  if (e.obra) {
    ob.rounds++;
    if (S.coEstOpen(e) !== S.coEstCap(e) - S.coEstSeats(e.obra.k, e.lv[e.obra.k])) alert('setor em obra não está fechado (carreira ' + n + ')');
    if ((n + co.ss.i) % 23 === 0 && e.obra.left > 2) {
      const l0 = e.obra.left, a0 = e.obra.acc, ok = S.coEstRush(co);
      if (ok !== (a0 < E.obra.rushMax)) alert('acelerar fora do limite (carreira ' + n + ')');
      if (ok) { ob.rush++; if (!e.obra || e.obra.left !== l0 - E.obra.rush) alert('acelerar não tirou ' + E.obra.rush + ' rodadas (carreira ' + n + ')'); }
    }
    return;
  }
  if (process.env.OB_ATE && co.season - st.s0 >= +process.env.OB_ATE) return;   // só constrói nas primeiras temporadas (para medir em quanto tempo a obra se paga)
  if (process.env.ROBO === 'esperto') { const h = (e.h || []).slice(-3); if (h.length < 3 || h.filter(g => g.pub >= g.cap * E.full).length < 2) return; }   // só amplia com a casa lotando
  const plans = E.keys.map(k => S.coEstPlan(co, k)).filter(p => p && !p.max).sort((a, b) => a.modes[1].cost - b.modes[1].cost);
  if (!plans.length) return;
  const P = plans[0], mode = process.env.OBM || MODES[(n + co.season) % 3], x = +process.env.OBX || 1 + (n + co.ss.i) % 3, snap = JSON.stringify([fin.caixa, fin.ss.obra || 0, e.lv, e.obra || null, e.pay || null]);
  const r = S.coEstAsk(co, P.k, mode, x); ob.ask++;
  if (!r.ok) { ob.no[r.why] = (ob.no[r.why] || 0) + 1; if (JSON.stringify([fin.caixa, fin.ss.obra || 0, e.lv, e.obra || null, e.pay || null]) !== snap) alert('pedido recusado mexeu no clube (carreira ' + n + ')'); return; }
  const M = P.modes.find(o => o.id === mode), c0 = JSON.parse(snap)[0];
  ob.n++; ob.cost += r.cost; if (mode === 'eco') { ob.eco++; if (e.obra.late) ob.late++; }
  if (r.cost !== M.cost || fin.caixa !== c0 - r.first || r.first + r.part * r.parts < r.cost || r.first + r.part * r.parts > r.cost + 3000) alert('a conta da obra não fecha (carreira ' + n + '): ' + JSON.stringify(r));
  if (fin.caixa < E.obra.folga * S.coFolha(co) - 1 || c0 < 0 || (co.board && co.board.ult)) alert('diretoria aprovou sem folga, no vermelho ou no ultimato (carreira ' + n + ')');
  if (!e.obra || e.obra.k !== P.k || e.obra.left !== M.rounds) alert('obra aprovada não começou (carreira ' + n + ')');
}

// Uma carreira do robô; cut = passa o save pelo JSON na rodada 9 de cada temporada; f1 = tira do estádio o que a fase 2 trouxe
const before0 = (co, st) => co.club;
function career(n, opt) {
  opt = opt || {};
  let co = S.coNew({ name: 'Robô', country: 'Brasil', start: n % 2 ? 'baixo' : 'livre', seed: 900 + n * 131 });
  const offs = S.coOffers(co); S.coSign(co, offs[n % offs.length]); co.autoXI = true;
  if (opt.old) delete co.est;
  const fp = [], st = { hum: [0, 0, 0, 0, 0], home: 0, full: 0, occ: 0, clubs: new Set(), g: 0, g0: 0, best: [0, 0, 0, 0, 0], tie: 0, met: 0, sack: 0, sn: 0, red: 0, rd: 0, caixa: 0, bil: 0, extra: 0, ob: OB() };
  st.s0 = co.season;
  for (let s = 0; s < SEASONS; s++) {
    S.coStart(co);
    while (!co.ss.done) {
      const nx = S.coNext(co); if (!nx) break;
      if (opt.obra) build(co, st, n);
      st.rd++; if (co.fin && co.fin.caixa < 0) st.red++;
      if (nx.bye) { S.coSkipRound(co); continue; }
      if (opt.cut && co.ss.i === 9) co = JSON.parse(JSON.stringify(co));
      if (opt.f1 && co.ss.i === 9) { const e0 = S.coEst(co); delete e0.cap0; delete e0.pr; }
      let cr = null;
      if (nx.home && !opt.cut && !opt.old && !opt.f1 && !opt.obra) {
        const e0 = S.coEst(co), P = S.coEstPrices(co), L = P.list, mx = Math.max(...L.map(x => x.gate));
        cr = S.coEstCrowd(co, nx.vs);
        if (P.vs !== nx.vs) alert('próximo jogo em casa errado (carreira ' + n + ')');
        const top = L.filter(x => x.gate === mx); if (top.length > 1) st.tie++; top.forEach(x => st.best[x.i]++);
        if (L[0].gate > L[2].gate) alert('o popular rendeu mais que o normal (carreira ' + n + ')');
        if (L[0].pub < L[2].pub || L[4].pub > L[2].pub) alert('preço e público ao contrário (carreira ' + n + ')');
        if (e0.hum === 50 && e0.pr === 2 && S.coEstCap(e0) === e0.cap0 && S.coGate(co, nx.vs) !== S.coGateBase(co, nx.vs)) alert('a régua da bilheteria não bate na chegada (carreira ' + n + '): ' + S.coGate(co, nx.vs) + ' x ' + S.coGateBase(co, nx.vs));
      }
      if (opt.obra && nx.home) {   // quanto a bilheteria deste jogo ganhou (ou perdeu) com as obras: contra o mesmo jogo no estádio da chegada
        const e0 = S.coEst(co), g0 = S.coGateBase(co, nx.vs), sv = [e0.lv, e0.base, e0.obra], act = S.coEstGate(co, nx.vs, g0);
        e0.lv = e0.lv0; e0.base = e0.base0; e0.obra = null; const cf = S.coEstGate(co, nx.vs, g0); e0.lv = sv[0]; e0.base = sv[1]; e0.obra = sv[2];
        st.extra += act - cf;
      }
      const m = S.coMatchStart(co);
      if (Math.abs(m.push || 0) > E.push + 1e-9 || (!nx.home && m.push)) alert('empurrão da torcida fora da regra: ' + m.push + ' (carreira ' + n + ')');
      S.coMatchRest(co, m);
      const log = S.coMatchEnd(co, m), e = S.coEst(co);
      st.clubs.add(co.club); if (log && log.home && log.gate) st.bil += log.gate;
      if (cr && co.club === before0(co, st)) {
        const g0 = S.coGateBase(co, nx.vs), want = Math.max(1000, Math.round(g0 * (cr.pub / cr.ref) * cr.q * E.price.rev[cr.pr] / 1000) * 1000);
        if (log.pub !== cr.pub || log.gate !== want) alert('bilheteria não bate com o público: ' + log.gate + ' x ' + want + ' (carreira ' + n + ')');
        st.g += log.gate; st.g0 += g0;
      }
      if (e) {
        if (!(e.hum >= 0 && e.hum <= 100)) alert('humor fora da faixa: ' + e.hum + ' (carreira ' + n + ')');
        st.hum[S.coEstHumIdx(e.hum)]++;
        if (nx.home) {
          if (!Number.isInteger(log.pub) || log.pub <= 0 || log.pub % 100 || log.pub > log.cap) alert('público ruim: ' + log.pub + ' de ' + log.cap + ' (carreira ' + n + ')');
          st.home++; st.occ += log.pub / log.cap; if (log.pub >= log.cap * E.full) st.full++;
          const h = e.h[e.h.length - 1]; if (!h || h.pub !== log.pub || h.r !== log.r) alert('histórico não bate com o jogo (carreira ' + n + ')');
        } else if (log.pub != null) alert('público em jogo fora de casa (carreira ' + n + ')');
      }
    }
    const before = co.club, eB = S.coEst(co), obB = eB && eB.obra ? Object.assign({}, eB.obra) : null, out = S.coSeasonEnd(co);
    st.sn++; if (out.met) st.met++; if (out.sacked) st.sack++;
    fp.push([out.pos, out.fame[1], co.fin ? co.fin.caixa : 0, co.fin ? co.fin.verba : 0, out.met ? 1 : 0].join(':'));
    if (out.offers) S.coSign(co, out.offers[0]);
    else if (s === 1 && !opt.stay) { const o = S.coOffers(co, 3); if (o[0]) S.coSign(co, o[0]); }
    if (co.club !== before) {
      if (!co.est || !co.est[before]) alert('trocou de clube e perdeu o estádio antigo (carreira ' + n + ')');
      else if (obB) { const eo = co.est[before]; st.ob.left++; if (eo.obra || eo.pay || eo.done || eo.lv[obB.k] !== obB.to) alert('saiu do clube e a obra não terminou sozinha (carreira ' + n + ')'); }
      const e2 = S.coEst(co); if (!e2 || co.est[co.club] !== e2) alert('clube novo sem estádio (carreira ' + n + ')');
    }
  }
  st.caixa = co.fin ? co.fin.caixa : 0;
  const e9 = co.club ? S.coEst(co) : null; if (e9) { st.cap = S.coEstCap(e9); st.cap0 = e9.cap0; }
  return { fp: fp.join(' | '), st, est: JSON.stringify(co.est || {}), co };
}

const T = { hum: [0, 0, 0, 0, 0], home: 0, full: 0, occ: 0, g: 0, g0: 0, best: [0, 0, 0, 0, 0], tie: 0 };
let moved = 0;
for (let n = 0; n < N; n++) {
  const a = career(n);
  a.st.hum.forEach((v, i) => (T.hum[i] += v)); a.st.best.forEach((v, i) => (T.best[i] += v)); T.g += a.st.g; T.g0 += a.st.g0; T.tie += a.st.tie; T.home += a.st.home; T.full += a.st.full; T.occ += a.st.occ; if (a.st.clubs.size > 1) moved++;
  if (n < 8) {
    const b = career(n, { f1: true }); if (a.fp !== b.fp) alert('estádio da fase 1 termina diferente (carreira ' + n + ')');
    const c = career(n, { cut: true }); if (a.fp !== c.fp || a.est !== c.est) alert('save no meio muda o fim (carreira ' + n + ')');
    const d = career(n, { old: true }); if (a.fp !== d.fp || !Object.keys(d.co.est || {}).length) alert('save antigo sem estádio ou com outro fim (carreira ' + n + ')');
  }
}
// 6. obras: o robô que constrói contra o que não constrói
const A = { met: 0, sack: 0, sn: 0, red: 0, rd: 0, caixa: 0, bil: 0 }, B = { met: 0, sack: 0, sn: 0, red: 0, rd: 0, caixa: 0, bil: 0, extra: 0, cap: 0, cap0: 0, home: 0, full: 0 }, O = OB();
for (let n = 0; n < N; n++) {
  const a = career(n, { stay: true }), b = career(n, { stay: true, obra: true });
  ['met', 'sack', 'sn', 'red', 'rd', 'caixa', 'bil'].forEach(k => { A[k] += a.st[k]; B[k] += b.st[k]; });
  B.extra += b.st.extra; if (b.st.clubs.size === 1) { O.cost1 = (O.cost1 || 0) + b.st.ob.cost; O.extra1 = (O.extra1 || 0) + b.st.extra; O.n1 = (O.n1 || 0) + 1; } B.cap += b.st.cap || 0; B.cap0 += b.st.cap0 || 0; B.home += b.st.home; B.full += b.st.full;
  ['n', 'cost', 'ask', 'eco', 'late', 'rush', 'left', 'done', 'rounds'].forEach(k => (O[k] += b.st.ob[k])); Object.keys(b.st.ob.no).forEach(k => (O.no[k] = (O.no[k] || 0) + b.st.ob.no[k]));
  if (n < 6) { const c = career(n, { stay: true, obra: true, cut: true }); if (b.fp !== c.fp || b.est !== c.est) alert('save no meio da obra muda o fim (carreira ' + n + ')'); }
}
// Sair do clube com obra andando (por proposta ou demitido, que chega à assinatura já sem clube): a obra termina sem cobrar mais
[false, true].forEach(sacked => {
  const co = S.coNew({ name: 'Robô', country: 'Brasil', start: 'livre', seed: 4242 }), offs = S.coOffers(co); S.coSign(co, offs[0]); S.coStart(co);
  const old = co.club, e = S.coEst(co), k = E.keys.find(x => e.lv[x] < 5), from = e.lv[k]; co.fin.caixa += 5e8;
  const r = S.coEstAsk(co, k, 'nor', 1 + (S.coEstPlan(co, k).payMax > 1 ? 1 : 0));
  if (!r.ok) return alert('obra com o caixa cheio foi recusada: ' + r.why);
  const other = D.CLUBS.find(c => c.id !== old && c.league === D.CLUB_BY_ID[old].league).id;
  if (sacked) co.club = null;
  S.coSign(co, other);
  const eo = co.est[old];
  if (!eo || eo.obra || eo.pay || eo.done || eo.lv[k] !== from + 1) alert('saiu do clube' + (sacked ? ' demitido' : '') + ' e a obra não terminou sozinha');
});
if (!O.n) alert('o robô não conseguiu fazer nenhuma obra');
if (O.eco >= 12 && (pct(O.late, O.eco) < 15 || pct(O.late, O.eco) > 55)) alert('a econômica atrasou em ' + pct(O.late, O.eco) + '% das obras (esperado de 15 a 55)');
if (pct(B.sack, B.sn) > pct(A.sack, A.sn) + 6) alert('o robô que constrói é demitido em ' + pct(B.sack, B.sn) + '% das temporadas contra ' + pct(A.sack, A.sn) + '%');
if (pct(B.red, B.rd) > pct(A.red, A.rd) + 6) alert('o robô que constrói fica no vermelho em ' + pct(B.red, B.rd) + '% das rodadas contra ' + pct(A.red, A.rd) + '%');
if (O.n / Math.max(1, B.sn) > 3) alert('obras demais por temporada: ' + (O.n / B.sn).toFixed(1));

const games = T.hum.reduce((a, b) => a + b, 0), hp = T.hum.map(v => pct(v, games)), full = pct(T.full, T.home), occ = pct(T.occ, T.home);
if (hp.some(v => v > 60)) alert('uma palavra do humor passa de 60% dos jogos: ' + hp.join(' / '));
if (hp[2] !== Math.max(...hp)) alert('"tranquila" não é a mais comum: ' + hp.join(' / '));
if (full < 10 || full > 45) alert('casa cheia em ' + full + '% dos jogos em casa (esperado de 10 a 45)');
if (occ < 65 || occ > 92) alert('lotação média de ' + occ + '% (esperado de 65 a 92)');
const bp = T.best.map(v => pct(v, T.home)), gp = pct(T.g, T.g0);
if (gp < 92 || gp > 108) alert('bilheteria do robô no preço normal em ' + gp + '% da de sempre (esperado de 92 a 108)');
if (bp[2] < 50) alert('o preço normal rende mais em só ' + bp[2] + '% dos jogos (esperado 50 ou mais)');
if (bp[3] < 5) alert('o caro rende mais em só ' + bp[3] + '% dos jogos (esperado 5 ou mais)');
if (bp[4] >= 10) alert('o salgado rende mais em ' + bp[4] + '% dos jogos (esperado menos de 10)');
if (bp.some(v => v >= 100)) alert('um preço rende mais em todos os jogos: ' + bp.join(' / '));
{ const co = S.coNew({ name: 'R', country: 'Brasil', start: 'livre', seed: 77 }); S.coSign(co, S.coOffers(co)[0]); S.coStart(co); const e = S.coEst(co);
  e.hum = 50; if (S.coEstPush(co) !== 0) alert('torcida tranquila empurra: ' + S.coEstPush(co));
  e.hum = 100; if (S.coEstPush(co) !== E.push) alert('torcida em festa não empurra o máximo: ' + S.coEstPush(co));
  e.hum = 0; if (S.coEstPush(co) !== -E.push) alert('torcida revoltada não pesa o máximo: ' + S.coEstPush(co)); }
if (!moved) alert('nenhuma carreira trocou de clube: o teste do estádio antigo não rodou');

console.log('Estádio do Treinador: ' + D.CLUBS.length + ' clubes, ' + N + ' carreiras de ' + SEASONS + ' temporadas (' + games + ' jogos, ' + T.home + ' em casa)');
console.log('  chegada: de ' + Math.min(...caps.map(c => c.cap)) / 1000 + ' a ' + Math.max(...caps.map(c => c.cap)) / 1000 + ' mil lugares; metade dos clubes até ' + caps.map(c => c.cap).sort((a, b) => a - b)[caps.length >> 1] / 1000 + ' mil');
console.log('  humor (% dos jogos): ' + E.hum.map((w, i) => w + ' ' + hp[i]).join(' · '));
console.log('  bilheteria do robô (preço normal): ' + gp + '% da de sempre · preço que mais rende (% dos jogos em casa, empate conta para os dois): ' + E.price.names.map((w, i) => w + ' ' + bp[i]).join(' · '));
console.log('  casa cheia em ' + full + '% dos jogos em casa · lotação média ' + occ + '% · ' + moved + ' carreiras trocaram de clube');
console.log('  obras (robô que amplia sempre que pode): ' + (O.n / Math.max(1, B.sn)).toFixed(2) + ' por temporada · estádio no fim com ' + pct(B.cap, B.cap0) + '% dos lugares da chegada · casa cheia ' + pct(B.full, B.home) + '% · econômica atrasou ' + pct(O.late, O.eco) + '% · ' + O.rush + ' aceleradas · ' + O.left + ' obras deixadas para trás');
console.log('    pedidos: ' + O.ask + ' · aprovados ' + pct(O.n, O.ask) + '% · recusas: ' + (Object.keys(O.no).map(k => k + ' ' + pct(O.no[k], O.ask) + '%').join(' · ') || 'nenhuma'));
console.log('    meta ' + pct(B.met, B.sn) + '% (sem obra ' + pct(A.met, A.sn) + '%) · demitido ' + pct(B.sack, B.sn) + '% (' + pct(A.sack, A.sn) + '%) · rodadas no vermelho ' + pct(B.red, B.rd) + '% (' + pct(A.red, A.rd) + '%) · caixa médio no fim ' + Math.round(B.caixa / N / 1000) + ' mil (' + Math.round(A.caixa / N / 1000) + ' mil) · bilheteria ' + pct(B.bil, A.bil) + '% da do robô sem obra · as obras custaram ' + Math.round(O.cost / N / 1000) + ' mil por carreira e voltaram ' + pct(B.extra, O.cost) + '% em ' + SEASONS + ' temporadas (' + pct(O.extra1 || 0, O.cost1 || 0) + '% nas ' + (O.n1 || 0) + ' carreiras de um clube só)');
console.log(alerts.length ? alerts.length + ' alertas:\n  ' + alerts.join('\n  ') : '0 alertas');
process.exit(alerts.length ? 1 : 0);
