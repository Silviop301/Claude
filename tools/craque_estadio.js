// Estádio do Treinador (engine/coachest.js, fase 1: só ver): confere as regras que não podem quebrar.
// Uso (na raiz): node tools/craque_estadio.js [carreiras] [temporadas]      (padrão 30 e 5). Esperado: "0 alertas".
//
// O que confere:
//  1. Estádio da chegada de todos os clubes: níveis de 1 a 5, de 6 a 70 mil lugares, sempre o mesmo para o mesmo clube,
//     e clube mais forte nunca com estádio menor que um mais fraco.
//  2. Carreiras do robô: público inteiro, de 100 em 100, maior que zero e nunca acima dos lugares; humor de 0 a 100 sem NaN;
//     "tranquila" é a palavra mais comum e nenhuma passa de 60% dos jogos; casa cheia entre 10% e 45% dos jogos em casa;
//     lotação média entre 65% e 92%.
//  3. Só ver: a mesma carreira com o estádio virado do avesso a cada rodada (arena cheia, torcida revoltada) termina com o
//     mesmo dinheiro, a mesma fama e as mesmas posições. Nada do motor lê o estádio nesta fase.
//  4. Save: passar pelo JSON no meio da temporada não muda o fim; save antigo (sem co.est) ganha o estádio do clube.
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

// Uma carreira do robô; mess = vira o estádio do avesso a cada rodada; cut = passa o save pelo JSON na rodada 9 de cada temporada
function career(n, opt) {
  opt = opt || {};
  let co = S.coNew({ name: 'Robô', country: 'Brasil', start: n % 2 ? 'baixo' : 'livre', seed: 900 + n * 131 });
  const offs = S.coOffers(co); S.coSign(co, offs[n % offs.length]); co.autoXI = true;
  if (opt.old) delete co.est;
  const fp = [], st = { hum: [0, 0, 0, 0, 0], home: 0, full: 0, occ: 0, clubs: new Set() };
  for (let s = 0; s < SEASONS; s++) {
    S.coStart(co);
    while (!co.ss.done) {
      const nx = S.coNext(co); if (!nx) break;
      if (nx.bye) { S.coSkipRound(co); continue; }
      if (opt.cut && co.ss.i === 9) co = JSON.parse(JSON.stringify(co));
      if (opt.mess) { const e = S.coEst(co); e.lv = { n: 5, s: 5, a: 5, so: 5 }; e.hum = 0; e.base = 500; }
      const m = S.coMatchStart(co); S.coMatchRest(co, m);
      const log = S.coMatchEnd(co, m), e = S.coEst(co);
      st.clubs.add(co.club);
      if (!opt.mess && e) {
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
    if (co.club !== before && !opt.mess) {
      if (!co.est || !co.est[before]) alert('trocou de clube e perdeu o estádio antigo (carreira ' + n + ')');
      const e2 = S.coEst(co); if (!e2 || co.est[co.club] !== e2) alert('clube novo sem estádio (carreira ' + n + ')');
    }
  }
  return { fp: fp.join(' | '), st, est: JSON.stringify(co.est || {}), co };
}

const T = { hum: [0, 0, 0, 0, 0], home: 0, full: 0, occ: 0 };
let moved = 0;
for (let n = 0; n < N; n++) {
  const a = career(n);
  a.st.hum.forEach((v, i) => (T.hum[i] += v)); T.home += a.st.home; T.full += a.st.full; T.occ += a.st.occ; if (a.st.clubs.size > 1) moved++;
  if (n < 8) {
    const b = career(n, { mess: true }); if (a.fp !== b.fp) alert('o estádio mexeu na carreira ' + n + ': ' + a.fp.slice(0, 60) + ' x ' + b.fp.slice(0, 60));
    const c = career(n, { cut: true }); if (a.fp !== c.fp || a.est !== c.est) alert('save no meio muda o fim (carreira ' + n + ')');
    const d = career(n, { old: true }); if (a.fp !== d.fp || !Object.keys(d.co.est || {}).length) alert('save antigo sem estádio ou com outro fim (carreira ' + n + ')');
  }
}
const games = T.hum.reduce((a, b) => a + b, 0), hp = T.hum.map(v => pct(v, games)), full = pct(T.full, T.home), occ = pct(T.occ, T.home);
if (hp.some(v => v > 60)) alert('uma palavra do humor passa de 60% dos jogos: ' + hp.join(' / '));
if (hp[2] !== Math.max(...hp)) alert('"tranquila" não é a mais comum: ' + hp.join(' / '));
if (full < 10 || full > 45) alert('casa cheia em ' + full + '% dos jogos em casa (esperado de 10 a 45)');
if (occ < 65 || occ > 92) alert('lotação média de ' + occ + '% (esperado de 65 a 92)');
if (!moved) alert('nenhuma carreira trocou de clube: o teste do estádio antigo não rodou');

console.log('Estádio do Treinador: ' + D.CLUBS.length + ' clubes, ' + N + ' carreiras de ' + SEASONS + ' temporadas (' + games + ' jogos, ' + T.home + ' em casa)');
console.log('  chegada: de ' + Math.min(...caps.map(c => c.cap)) / 1000 + ' a ' + Math.max(...caps.map(c => c.cap)) / 1000 + ' mil lugares; metade dos clubes até ' + caps.map(c => c.cap).sort((a, b) => a - b)[caps.length >> 1] / 1000 + ' mil');
console.log('  humor (% dos jogos): ' + E.hum.map((w, i) => w + ' ' + hp[i]).join(' · '));
console.log('  casa cheia em ' + full + '% dos jogos em casa · lotação média ' + occ + '% · ' + moved + ' carreiras trocaram de clube');
console.log(alerts.length ? alerts.length + ' alertas:\n  ' + alerts.join('\n  ') : '0 alertas');
process.exit(alerts.length ? 1 : 0);
