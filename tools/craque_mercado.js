// Modo Treinador, mercado vivo (engine/coachworld.js): o robô joga carreiras, vende e compra na janela, e a ferramenta
// confere o mundo a cada temporada. Esperado: 0 alertas.
// Uso (na raiz): node tools/craque_mercado.js [carreiras] [temporadas]     (padrão 30 carreiras de 6 temporadas)
// Confere: todo clube com 25 e o número certo por posição, ninguém em dois clubes, ninguém repetido na lista do Mercado,
// quem você vendeu aparece no comprador, quem você comprou sai do clube de origem, sem NaN, notícia com clube e nome,
// e a mesma carreira com o save gravado e lido a cada rodada termina com os mesmos negócios. Boatos: o robô observa
// jogadores, todo boato na lista tem o seu lote esperando, perto de 2 em 3 fecham e o observado só sai com boato antes.
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 30, T = +process.argv[3] || 6;
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const str = id => D.CLUB_BY_ID[id].strength;
const ELITE = D.CLUBS.filter(c => c.league === 'bra-a').map(c => c.id); // antes de qualquer carreira (acesso e queda mexem em D)
const st = { seasons: 0, mv: 0, nw: 0, up: 0, ex: 0, fa: 0, lg: 0, sold: 0, bought: 0, left: 0, bytes: [], ms: 0, pool: 0, poolN: 0, byWin: { pre: 0, mid: 0 }, val: [], rm: 0, rmOk: 0, rmObs: 0, rmMe: 0, lost: 0, obsN: 0 };
const alerts = [];
const alert = (t) => { if (alerts.length < 40) alerts.push(t); st.al = (st.al || 0) + 1; };

function checkWorld(co, tag) {
  const w = co.wm; if (!w) return;
  const ids = new Set(co.ss ? co.ss.ids : []);
  w.mv.forEach(m => { if (m.from) ids.add(m.from); if (m.to) ids.add(m.to); });
  const seen = {};
  ids.forEach(id => {
    if (id === co.club) return;
    const sq = S.coGenSquad(id, co.season, co), cnt = {};
    const held = co.mkt && sq.some(p => co.mkt.obs[p.id] || co.mkt.rep[p.id] || (co.mkt.neg && co.mkt.neg[p.id])); // quem você observa não é cortado: o clube pode passar de 25
    if (sq.length !== 25 && !(held && sq.length > 25)) alert(tag + ' ' + id + ' com ' + sq.length + ' jogadores');
    sq.forEach(p => {
      cnt[p.pos] = (cnt[p.pos] || 0) + 1;
      if (seen[p.id]) alert(tag + ' ' + p.n + ' (' + p.id + ') em ' + seen[p.id] + ' e ' + id); seen[p.id] = id;
      if (![p.ovr, p.age, p.wage, p.pot].every(Number.isFinite)) alert(tag + ' NaN em ' + p.id);
      if (p.api && co.squad.some(q => q.api === p.api)) alert(tag + ' ' + p.n + ' no seu elenco e em ' + id);
    });
    Object.keys(S.CO.squad).forEach(pos => { if (cnt[pos] !== S.CO.squad[pos] && !(held && cnt[pos] > S.CO.squad[pos])) alert(tag + ' ' + id + ' com ' + (cnt[pos] || 0) + ' ' + pos); });
  });
  // cada negócio que vale: o jogador está no clube de destino e não no de origem
  const last = {}; w.mv.forEach(m => { last[m.id] = m; });
  Object.keys(last).forEach(id => { const m = last[id]; if (!m.to || m.to === co.club) return;
    if (!S.coGenSquad(m.to, co.season, co).some(p => p.id === id)) alert(tag + ' ' + m.p.n + ' não está em ' + m.to);
    if (m.from && m.from !== co.club && S.coGenSquad(m.from, co.season, co).some(p => p.id === id)) alert(tag + ' ' + m.p.n + ' continua em ' + m.from); });
  w.nw.forEach(x => { if (x.k === 'b' && !(w.rm || []).some(y => y.ni === x.i)) alert(tag + ' boato sem lote: ' + x.n); });
  (w.rm || []).forEach(y => { if (!y.me && !S.coGenSquad(y.from, co.season, co).some(p => p.id === y.id) && !co.squad.some(p => p.id === y.id) && !(co.mkt && co.mkt.got && co.mkt.got[y.id])) alert(tag + ' boato de quem não está em ' + y.from); });
  w.nw.forEach(x => { if (!x.n || !x.pos || (x.k === 'f' && !x.to) || (x.from && !D.CLUB_BY_ID[x.from]) || (x.to && !D.CLUB_BY_ID[x.to]) || !Number.isFinite(x.v)) alert(tag + ' notícia quebrada ' + JSON.stringify(x)); });
}

// O robô na janela: aceita a primeira proposta por um jogador seu e tenta comprar um reforço que caiba na verba
function trade(co, r) {
  // o robô observa até 4 jogadores da liga (para o boato do observado) e conta os boatos novos e os que fecharam
  const w0 = co.wm;
  if (w0 && !co.sacked) {
    const m = S.coMkt(co);
    if (Object.keys(m.obs).length < 4 && r() < 0.5) { const lg = S.coLeague(co), L = S.coMktPool(co).filter(p => p.club && p.lg === lg && !m.obs[p.id]); const p = L[Math.floor(r() * L.length)]; if (p) { S.coMktObs(co, p); st.obsN++; } }
    w0.nw.forEach(x => { if (x.i <= (co._ni || 0)) return; if (x.k === 'b') { st.rm++; if (x.obs) st.rmObs++; if (x.me) st.rmMe++; } else if (x.rm) st.rmOk++; });
    co._ni = w0.ni;
    const lost = S.coWorldLost(co); if (lost) { st.lost++; if (!S.coGenSquad(lost.to, co.season, co).some(p => p.id === lost.id)) alert('observado ' + lost.n + ' não está em ' + lost.to); }
  }
  const win = S.coMktWin(co); if (!win.open || co.sacked) return;
  const box = S.coMktInbox(co);
  if (box.length && r() < 0.6) { const o = box[0], p = co.squad.find(x => x.id === o.id), res = S.coMktSellAccept(co, o);
    if (res.k === 'ok' && p) { st.sold++; const wid = p.api ? 'r:' + p.api : 'm:' + p.id;
      if (!S.coGenSquad(o.club, co.season, co).some(q => q.id === wid)) alert('vendido ' + p.n + ' não apareceu em ' + o.club); } }
  if (r() < 0.5 && !S.coMktFull(co)) {
    const f = S.coFin(co), lg = S.coLeague(co);
    const L = S.coMktPool(co).filter(p => p.club && p.lg === lg && S.coMktPrice(p) * 1.2 <= f.verba).sort((a, b) => b.ovr - a.ovr).slice(0, 12);
    const p = L[Math.floor(r() * L.length)]; if (!p) return;
    const a = S.coMktOffer(co, p, { v: S.coMktCuts(p)[2], pay: 0, tr: null }); if (a.k !== 'ok') return;
    const Tm = S.coMktTerms(co, p), res = S.coMktContract(co, p, { w: Tm.ask(1) + Tm.step * 2, y: Tm.want, role: 1 });
    if (res.k === 'signed') { st.bought++;
      if (S.coGenSquad(p.club, co.season, co).some(q => q.id === p.id)) alert('comprado ' + p.n + ' continua em ' + p.club);
      if (S.coMktSearch(co).some(q => q.id === p.id)) alert('comprado ' + p.n + ' continua na busca'); }
  }
}

function career(n, roundtrip, measure) {
  Math.random = prng(11 + n);
  const r = prng(5000 + n);
  let co = S.coNew({ name: 'Robô', country: 'Brasil', start: n % 2 ? 'livre' : 'baixo', seed: 1000 + n * 7919 });
  const pick = offs => { const ok = offs.filter(id => S.coGoalFor(co, id).k !== 'naocair'); return (ok.length ? ok : offs).slice().sort((a, b) => str(b) - str(a))[0]; };
  // carreiras pares e ímpares: metade na elite (elencos reais), metade onde o robô cair
  S.coSign(co, n % 3 === 0 ? ELITE[n % ELITE.length] : pick(S.coOffers(co)));
  co.autoXI = true;
  for (let s = 0; s < T; s++) {
    const t0 = Date.now();
    S.coStart(co);
    while (!co.ss.done && !co.sacked) {
      if (roundtrip) co = JSON.parse(JSON.stringify(co));
      const nx = S.coNext(co); if (!nx) break;
      trade(co, r);
      if (measure && co.wm && co.wm.st.endsWith('|' + co.ss.i)) checkWorld(co, 'c' + n + ' t' + s + ' r' + co.ss.i);
      if (nx.bye) { S.coSkipRound(co); continue; }
      const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m);
    }
    if (measure) {
      const w = co.wm; st.seasons++; st.ms += Date.now() - t0;
      const mine = w.mv.filter(m => m.s === co.season);
      st.mv += mine.length; mine.forEach(m => { if (st.byWin[m.wk] !== undefined) st.byWin[m.wk]++; if (m.v) st.val.push(m.v); if (!m.from) st.fa++; else if (D.countryOf(D.CLUB_BY_ID[m.to]) !== D.countryOf(D.CLUB_BY_ID[m.from])) st.ex++; });
      const nw = w.nw.filter(x => x.s === co.season); st.nw += nw.length; st.up += nw.filter(x => x.up).length; st.lg += nw.filter(x => S.coWorldInLg(co, x) || x.me).length;
      if (s === 0 && n < 3) { const t1 = Date.now(), P = S.coMktPool(co); st.pool += Date.now() - t1; st.poolN++; const d = {}; P.forEach(p => { if (d[p.id]) alert('repetido na lista do Mercado: ' + p.n + ' ' + p.id); d[p.id] = 1; }); }
      checkWorld(co, 'c' + n + ' t' + s + ' fim');
    }
    S.coAutoRenew(co);
    const out = S.coSeasonEnd(co);
    if (measure) st.left += (out.left || []).filter(x => x.why === 'fim de contrato').length;
    while (co.xp.pts > 0) { const k = ['leitura', 'motiv', 'negoc'][co.xp.pts % 3]; if (!S.coSkill(co, k)) break; }
    if (out.offers) S.coSign(co, pick(out.offers));
  }
  if (measure) st.bytes.push(JSON.stringify(co.wm).length);
  return JSON.stringify({ wm: co.wm, hist: co.hist, sq: co.squad.map(p => p.n + p.ovr) });
}

let diff = 0;
for (let n = 0; n < N; n++) {
  const a = career(n, false, true);
  if (n < 6) { const b = career(n, true, false); if (a !== b) { diff++; alert('carreira ' + n + ': com o save gravado a cada rodada o mundo termina diferente'); } }
}
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const per = v => (v / Math.max(1, st.seasons)).toFixed(1);
console.log('Mercado vivo: ' + N + ' carreiras x ' + T + ' temporadas (' + st.seasons + ' temporadas)');
console.log('Negócios por temporada: ' + per(st.mv) + ' (janela do começo ' + per(st.byWin.pre) + ', do meio ' + per(st.byWin.mid) + '); sem clube que fecharam ' + per(st.fa) + ', para o exterior ' + per(st.ex));
console.log('Notícias por temporada: ' + per(st.nw) + ' (da sua liga ou do seu clube ' + per(st.lg) + ', com reforço de titular ' + per(st.up) + '); valor mediano R$ ' + Math.round(med(st.val) / 1000) + ' mil');
console.log('Robô: vendeu ' + per(st.sold) + ' e comprou ' + per(st.bought) + ' por temporada; saíram no fim do contrato ' + per(st.left));
console.log('Boatos por temporada: ' + per(st.rm) + ' (de quem o robô observa ' + per(st.rmObs) + ', de proposta pelos seus ' + per(st.rmMe) + '); viraram negócio ' + per(st.rmOk) + ' (' + Math.round(100 * st.rmOk / Math.max(1, st.rm - st.rmMe)) + '% dos que não são propostas); observado que fechou com outro ' + per(st.lost));
console.log('Save: co.wm no fim da carreira ' + (med(st.bytes) / 1024).toFixed(1) + ' KB (mediana), maior ' + (Math.max.apply(null, st.bytes) / 1024).toFixed(1) + ' KB; lista do Mercado montada em ' + Math.round(st.pool / Math.max(1, st.poolN)) + ' ms');
console.log('Save gravado e lido a cada rodada: ' + (diff ? diff + ' carreiras terminam diferente' : 'termina igual'));
console.log((st.al || 0) + ' alertas'); alerts.forEach(a => console.log('  ALERTA ' + a));
process.exit(st.al ? 1 : 0);
