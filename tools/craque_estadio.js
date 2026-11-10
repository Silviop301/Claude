// Estádio do Treinador (engine/coachest.js, fases 1 e 2: público, humor da torcida e ingresso): confere as regras que não podem quebrar.
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
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 30, SEASONS = +process.argv[3] || 5, E = S.CO_EST;
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

// Uma carreira do robô; cut = passa o save pelo JSON na rodada 9 de cada temporada; f1 = tira do estádio o que a fase 2 trouxe
const before0 = (co, st) => co.club;
function career(n, opt) {
  opt = opt || {};
  let co = S.coNew({ name: 'Robô', country: 'Brasil', start: n % 2 ? 'baixo' : 'livre', seed: 900 + n * 131 });
  const offs = S.coOffers(co); S.coSign(co, offs[n % offs.length]); co.autoXI = true;
  if (opt.old) delete co.est;
  const fp = [], st = { hum: [0, 0, 0, 0, 0], home: 0, full: 0, occ: 0, clubs: new Set(), g: 0, g0: 0, best: [0, 0, 0, 0, 0], tie: 0 };
  for (let s = 0; s < SEASONS; s++) {
    S.coStart(co);
    while (!co.ss.done) {
      const nx = S.coNext(co); if (!nx) break;
      if (nx.bye) { S.coSkipRound(co); continue; }
      if (opt.cut && co.ss.i === 9) co = JSON.parse(JSON.stringify(co));
      if (opt.f1 && co.ss.i === 9) { const e0 = S.coEst(co); delete e0.cap0; delete e0.pr; }
      let cr = null;
      if (nx.home && !opt.cut && !opt.old && !opt.f1) {
        const e0 = S.coEst(co), P = S.coEstPrices(co), L = P.list, mx = Math.max(...L.map(x => x.gate));
        cr = S.coEstCrowd(co, nx.vs);
        if (P.vs !== nx.vs) alert('próximo jogo em casa errado (carreira ' + n + ')');
        const top = L.filter(x => x.gate === mx); if (top.length > 1) st.tie++; top.forEach(x => st.best[x.i]++);
        if (L[0].gate > L[2].gate) alert('o popular rendeu mais que o normal (carreira ' + n + ')');
        if (L[0].pub < L[2].pub || L[4].pub > L[2].pub) alert('preço e público ao contrário (carreira ' + n + ')');
        if (e0.hum === 50 && e0.pr === 2 && S.coEstCap(e0) === e0.cap0 && S.coGate(co, nx.vs) !== S.coGateBase(co, nx.vs)) alert('a régua da bilheteria não bate na chegada (carreira ' + n + '): ' + S.coGate(co, nx.vs) + ' x ' + S.coGateBase(co, nx.vs));
      }
      const m = S.coMatchStart(co);
      if (Math.abs(m.push || 0) > E.push + 1e-9 || (!nx.home && m.push)) alert('empurrão da torcida fora da regra: ' + m.push + ' (carreira ' + n + ')');
      S.coMatchRest(co, m);
      const log = S.coMatchEnd(co, m), e = S.coEst(co);
      st.clubs.add(co.club);
      if (cr && co.club === before0(co, st)) {
        const g0 = S.coGateBase(co, nx.vs), want = Math.max(1000, Math.round(g0 * (cr.pub / cr.ref) * E.price.rev[cr.pr] / 1000) * 1000);
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
    const before = co.club, out = S.coSeasonEnd(co);
    fp.push([out.pos, out.fame[1], co.fin ? co.fin.caixa : 0, co.fin ? co.fin.verba : 0, out.met ? 1 : 0].join(':'));
    if (out.offers) S.coSign(co, out.offers[0]);
    else if (s === 1 && !opt.stay) { const o = S.coOffers(co, 3); if (o[0]) S.coSign(co, o[0]); }
    if (co.club !== before) {
      if (!co.est || !co.est[before]) alert('trocou de clube e perdeu o estádio antigo (carreira ' + n + ')');
      const e2 = S.coEst(co); if (!e2 || co.est[co.club] !== e2) alert('clube novo sem estádio (carreira ' + n + ')');
    }
  }
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
console.log(alerts.length ? alerts.length + ' alertas:\n  ' + alerts.join('\n  ') : '0 alertas');
process.exit(alerts.length ? 1 : 0);
