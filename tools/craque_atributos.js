// Atributos por jogador do Treinador (engine/coach.js: S.CO_AT, S.coAttrs): confere as regras que não podem quebrar.
// Uso (na raiz): node tools/craque_atributos.js [temporadas]      (padrão 3). Esperado: "0 alertas".
//
// O que confere, em todos os clubes e nas temporadas pedidas:
//  1. Faixa e número: 6 atributos inteiros de 20 a 99, sem NaN.
//  2. O geral manda: a média com o peso da posição, arredondada, é o geral do jogador.
//  3. Repetição: o mesmo elenco gerado duas vezes tem os mesmos atributos (preso ao jogador, não ao momento).
//  4. Cara de posição: atacante finaliza mais do que defende, zagueiro o contrário, meia passa melhor que zagueiro,
//     lateral corre mais que zagueiro; e os atributos não são cópia do geral (espalham dentro da posição).
//  5. Número real: nos clubes com elenco real, o artilheiro de verdade (8+ gols) finaliza pelo menos 3 pontos acima do
//     normal de quem tem o geral e a posição dele, e o maior garçom (5+ assistências) passa 3 acima. Quantas vezes eles
//     ficam entre os 3 melhores do elenco sai só como informação: o geral do jogador real ainda vem dos jogos como
//     titular, então um artilheiro reserva tem geral baixo e não chega nos primeiros.
//  6. Geral mudou (evolução, sem clube do mercado): os atributos acompanham e o jeito do jogador continua.
//  7. Save antigo: jogador sem atributos ganha os dele, sempre os mesmos, e passa pelo JSON sem mudar.
//  8. Jeito de jogar do mercado (S.coMktTraits): os 2 pontos fortes saem dos atributos mais acima do normal da posição,
//     o ponto fraco de um atributo abaixo deles, o mesmo jogador tem sempre o mesmo jeito e nenhum texto domina a posição.
//  9. Faixa do olheiro (S.coMktAttrs): sem relatório não mostra nada; com 1 e 2 o valor de verdade está dentro da faixa,
//     a 2ª faixa cabe dentro da 1ª e é mais estreita; com 3 sai o número certo.
// 10. Atributo por setor (fase 3, a conta do jogo pulado e da tática: S.coSecDev, S.coShape, S.coMatchup):
//     - na média dos jogadores o setor não soma nem tira força (o geral manda), mas separa jogadores de mesmo geral;
//     - com os elencos de verdade, os gols esperados de cada clube contra um time normal ficam, em média, onde estavam;
//     - cada atributo puxa a parte certa: finalização faz mais gol, defesa e goleiro levam menos, passe dá mais posse,
//       velocidade rende mais no contra-ataque do que na posse, físico rende mais na pressão do que na retranca;
//     - o auxiliar escala pelo atributo da vaga sem abrir mão do geral (o time dele não cai mais de 1 ponto);
//     - sem lista, o pênalti é do melhor finalizador em campo e o escanteio do melhor passador.
// 11. Fase 4 (S.CO_GROW): o treino só mexe 1 ponto por jogador, no atributo do treino e na posição do treino; machucado,
//     veterano e quem está no potencial não crescem; o geral sobe 1 por vez, nunca passa do potencial e entra no aviso
//     (`co.train.up`); o save no meio treina igual; na virada quem cai perde velocidade e físico antes e quem cresce
//     sobe mais no atributo de mais peso; a média pelo peso segue igual ao geral.
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const R = (() => { try { return require('../craque/src/real-squads.js'); } catch (e) { return null; } })();
const SEASONS = +process.argv[2] || 3, AT = S.CO_AT;
const alerts = [];
const alert = m => { if (alerts.length < 40) alerts.push(m); else if (alerts.length === 40) alerts.push('…'); };
const wmean = (pos, v) => v.reduce((a, x, i) => a + x * AT.w[pos][i], 0) / 100;
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const sd = a => { const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) * (x - m)))); };

let n = 0; const by = {};
// 8. jeito de jogar: confere contra os atributos e conta os textos por posição
const trN = {}, trB = {};
function jeito(cl, p, v) {
  const t = S.coMktTraits(p), t2 = S.coMktTraits(JSON.parse(JSON.stringify(p))), dv = v.map((x, i) => x - p.ovr - AT.prof[p.pos][i]);
  if (!t || t.good.length !== 2 || t.good[0] === t.good[1] || !t.bad) return alert('jeito: ' + cl.id + ' ' + p.n + ' ' + JSON.stringify(t));
  if (t.good.join() !== t2.good.join() || t.bad !== t2.bad) alert('jeito muda: ' + cl.id + ' ' + p.n);
  if (t.gi.indexOf(t.bi) >= 0 || dv[t.bi] > Math.min(dv[t.gi[0]], dv[t.gi[1]])) alert('jeito: ponto fraco acima do forte em ' + cl.id + ' ' + p.n);
  const rk = i => dv.filter(x => x > dv[i]).length;   // 0 = o atributo mais acima do normal da posição
  if (rk(t.gi[0]) > 2 || dv.filter(x => x < dv[t.bi]).length > 2) alert('jeito: forte na metade de baixo ou fraco na de cima em ' + cl.id + ' ' + p.n + ' (' + t.good[0] + ', ' + t.bad + ')');
  const a = trN[p.pos] = trN[p.pos] || { n: 0 }, b = trB[p.pos] = trB[p.pos] || { n: 0 };
  a.n++; t.good.forEach(x => (a[x] = (a[x] || 0) + 1)); b.n++; b[t.bad] = (b[t.bad] || 0) + 1;
}
for (let s = 0; s < SEASONS; s++) {
  D.CLUBS.forEach(cl => {
    const sq = S.coGenSquad(cl.id, s), again = S.coGenSquad(cl.id, s);
    sq.forEach((p, i) => {
      n++;
      const v = S.coAttrs(p);
      if (!Array.isArray(v) || v.length !== 6 || v.some(x => !Number.isInteger(x) || x < AT.min || x > AT.max)) return alert('faixa: ' + cl.id + ' ' + p.n + ' ' + JSON.stringify(v));
      if (Math.round(wmean(p.pos, v)) !== p.ovr) alert('geral: ' + cl.id + ' ' + p.n + ' geral ' + p.ovr + ' média ' + wmean(p.pos, v).toFixed(2));
      if (again[i].at.join() !== v.join()) alert('repetição: ' + cl.id + ' ' + p.n);
      if (s === 0) (by[p.pos] = by[p.pos] || []).push({ v, ovr: p.ovr });
      if (s === 0) jeito(cl, p, v);
    });
  });
}

// 4. cara de posição (médias da temporada 0)
const m = {}; Object.keys(by).forEach(pos => { m[pos] = [0, 1, 2, 3, 4, 5].map(i => avg(by[pos].map(o => o.v[i]))); });
const need = (ok, msg) => { if (!ok) alert('posição: ' + msg); };
need(m.ATA[0] > m.ATA[3] + 20, 'atacante devia finalizar bem mais do que defende');
need(m.ZAG[3] > m.ZAG[0] + 20, 'zagueiro devia defender bem mais do que finaliza');
need(m.MEI[1] > m.ZAG[1] + 5, 'meia devia passar melhor que zagueiro');
need(m.LAT[4] > m.ZAG[4] + 4, 'lateral devia correr mais que zagueiro');
need(m.ATA[0] > m.MEI[0] + 5, 'atacante devia finalizar melhor que meia');
Object.keys(by).forEach(pos => { [0, 1, 2, 3, 4, 5].forEach(i => { const d = sd(by[pos].map(o => o.v[i] - o.ovr)); if (d < 2.5) alert('espalha pouco: ' + pos + ' ' + AT.keys[pos === 'GOL' ? 'G' : 'L'][i] + ' desvio ' + d.toFixed(1)); }); });

// 5. número real
let rc = 0, topG = 0, topA = 0, nG = 0, nA = 0, upG = 0, upA = 0;
const above = (p, i) => S.coAttrs(p)[i] - (p.ovr + AT.prof[p.pos][i]);
if (R) Object.keys(R.clubs).forEach(cid => {
  const rows = R.clubs[cid]; if (!rows.some(x => x.length > 7)) return;
  rc++;
  const sq = S.coGenSquad(cid, 0).filter(p => p.pos !== 'GOL'), idx = new Map(sq.map(p => [p.id, p]));
  const inSq = rows.filter(x => idx.has('r:' + x[0]) && x.length > 7 && x[5] + 0.5 * x[6] >= AT.real.minJ);
  const rank = (p, i) => sq.filter(q => S.coAttrs(q)[i] > S.coAttrs(p)[i]).length;
  const g = inSq.slice().sort((a, b) => b[7] - a[7])[0], a = inSq.slice().sort((x, y) => y[8] - x[8])[0];
  if (g && g[7] >= 8) { nG++; if (rank(idx.get('r:' + g[0]), 0) < 3) topG++; if (above(idx.get('r:' + g[0]), 0) >= 3) upG++; }
  if (a && a[8] >= 5) { nA++; if (rank(idx.get('r:' + a[0]), 1) < 3) topA++; if (above(idx.get('r:' + a[0]), 1) >= 3) upA++; }
});
if (rc && nG && upG / nG < 0.85) alert('real: artilheiro com Finalização acima do normal da posição em só ' + Math.round(100 * upG / nG) + '% dos clubes');
if (rc && nA && upA / nA < 0.85) alert('real: garçom com Passe acima do normal da posição em só ' + Math.round(100 * upA / nA) + '% dos clubes');

// 6. geral mudou: acompanha e mantém a ordem dos atributos (quase sempre)
let keep = 0, tot = 0;
D.CLUBS.slice(0, 60).forEach(cl => S.coGenSquad(cl.id, 0).forEach(p => {
  const q = JSON.parse(JSON.stringify(p)), top0 = q.at.indexOf(Math.max(...q.at));
  [4, -7].forEach(d => {
    q.ovr = Math.max(30, Math.min(95, q.ovr + d)); const v = S.coAttrs(q);
    if (Math.round(wmean(q.pos, v)) !== q.ovr) alert('geral mudou: ' + p.n + ' geral ' + q.ovr + ' média ' + wmean(q.pos, v).toFixed(2));
    tot++; if (v[top0] >= Math.max(...v) - 1) keep++;
  });
}));
if (keep / tot < 0.97) alert('geral mudou: o ponto forte só se manteve em ' + Math.round(100 * keep / tot) + '%');

// 7. save antigo: sem atributos, ganha; igual depois do JSON e numa segunda leitura
S.coGenSquad(D.CLUBS[10].id, 1).forEach(p => {
  const old = JSON.parse(JSON.stringify(p)); delete old.at; old.id = 'p' + (n % 97);
  const a = S.coAttrs(old).join(), b = S.coAttrs(JSON.parse(JSON.stringify(old))).join(), o2 = JSON.parse(JSON.stringify(old)); delete o2.at;
  if (a !== b || a !== S.coAttrs(o2).join()) alert('save antigo: ' + p.n + ' mudou de atributos');
});

Object.keys(trN).forEach(pos => {
  Object.keys(trN[pos]).forEach(k => { if (k !== 'n' && trN[pos][k] / trN[pos].n > 0.6) alert('jeito: "' + k + '" em ' + Math.round(100 * trN[pos][k] / trN[pos].n) + '% dos ' + pos); });
  Object.keys(trB[pos]).forEach(k => { if (k !== 'n' && trB[pos][k] / trB[pos].n > 0.6) alert('ponto fraco: "' + k + '" em ' + Math.round(100 * trB[pos][k] / trB[pos].n) + '% dos ' + pos); });
});

// 9. faixa do olheiro no mercado: um técnico de teste e 400 jogadores do mercado, com 0, 1, 2 e 3 relatórios
let nb = 0; const wid = [0, 0];
{
  const co = S.coNew({ name: 'Teste', country: 'Brasil', start: 'livre', seed: 4242 }); S.coSign(co, S.coOffers(co)[0]);
  const lg = S.coLeague(co), mk = S.coMkt(co);
  S.coMktPool(co).filter(p => p.lg !== lg).slice(0, 400).forEach(p => {
    const at = S.coAttrs(p), band = n => { mk.rep[p.id] = n; return S.coMktAttrs(co, p); };
    // desde 11/11 todo jogador já vem com o 1º relatório de graça (S.coMktReps): sem relatório pago a faixa é a do 1º
    const b0 = band(0), b1 = band(1), b2 = band(2), b3 = band(3); nb++;
    if (JSON.stringify(b0) !== JSON.stringify(b1)) alert('faixa: ' + p.n + ' sem relatório pago não mostra a faixa do 1º relatório');
    at.forEach((v, i) => {
      if (b1[i].v !== null || b2[i].v !== null) alert('faixa: ' + p.n + ' mostra o número antes do 3º relatório');
      if (v < b1[i].lo || v > b1[i].hi || v < b2[i].lo || v > b2[i].hi) alert('faixa: valor de verdade fora da faixa em ' + p.n + ' (' + v + ' · ' + b1[i].lo + '-' + b1[i].hi + ' · ' + b2[i].lo + '-' + b2[i].hi + ')');
      if (b2[i].lo < b1[i].lo || b2[i].hi > b1[i].hi || b2[i].hi - b2[i].lo > b1[i].hi - b1[i].lo) alert('faixa: a 2ª não cabe na 1ª em ' + p.n);
      if (b3[i].v !== v || b3[i].lo !== v || b3[i].hi !== v) alert('faixa: 3º relatório sem o número certo em ' + p.n);
      wid[0] += b1[i].hi - b1[i].lo; wid[1] += b2[i].hi - b2[i].lo;
    });
    delete mk.rep[p.id];
  });
  if (!nb) alert('faixa: nenhum jogador de fora da liga no mercado de teste');
}

const f = a => a.map(x => String(Math.round(x)).padStart(3)).join(' ');
// 10. atributo por setor (fase 3)
const f3 = {};
{
  const kS = AT.kS, SEC = ['fin', 'cri', 'ala', 'mar'], dv = { fin: [], cri: [], ala: [], mar: [], gol: [] };
  const neutral = ov => { const sq = []; Object.entries({ GOL: 3, ZAG: 5, LAT: 4, MEI: 8, ATA: 5 }).forEach(([pos, k]) => { for (let j = 0; j < k; j++) sq.push({ id: 'n' + pos + j, n: '', pos, age: 26, ovr: ov, en: 100, mo: 60, at: S.coAtNeutral(pos, ov) }); }); return sq; };
  const side = (sq, form, style) => ({ squad: sq, form, style, xi: S.coAutoXI(sq, form).xi, bonus: 0 });
  const lam = (H, A) => { const r = S.coMatchup(H, A, true); return [r.lh, r.la, r.h.poss]; };
  // a) média e espalhamento do setor, e b) clubes de verdade contra um time normal do mesmo nível
  let ratF = [], ratA = [], difXI = 0, nXI = 0, drop = [], penOk = 0, ckOk = 0, nTk = 0;
  D.CLUBS.forEach(cl => {
    const sq = S.coGenSquad(cl.id, 0);
    sq.forEach(p => { if (p.pos === 'GOL') dv.gol.push(S.coSecDev(p, 'gol')); else SEC.forEach(k => dv[k].push(S.coSecDev(p, k))); });
    AT.kS = 0; const xi0 = S.coAutoXI(sq, '4-4-2').xi, me0 = side(sq, '4-4-2', 'equilibrado'), q = S.coShape(me0).q, nt = side(neutral(Math.round(q)), '4-4-2', 'equilibrado'), l0 = lam(me0, nt);
    AT.kS = kS; const me1 = side(sq, '4-4-2', 'equilibrado'), l1 = lam(me1, nt);
    ratF.push(l1[0] / l0[0]); ratA.push(l1[1] / l0[1]);
    nXI++; if (me1.xi.join() !== xi0.join()) difXI++;
    const by = {}; sq.forEach(p => { by[p.id] = p; }); const ov = xi => avg(xi.map(id => by[id].ovr)); drop.push(ov(xi0) - ov(me1.xi));
    const on = me1.xi.map(id => by[id]).filter(p => p.pos !== 'GOL'), pen = S.coTaker(me1, 'pen'), ck = S.coTaker(me1, 'ckE');
    nTk++; if (pen && S.coAttrs(pen)[0] === Math.max.apply(null, on.map(p => S.coAttrs(p)[0]))) penOk++;
    if (ck && S.coAttrs(ck)[1] === Math.max.apply(null, on.map(p => S.coAttrs(p)[1]))) ckOk++;
  });
  f3.dv = dv; f3.ratF = ratF; f3.ratA = ratA; f3.difXI = difXI / nXI; f3.drop = avg(drop); f3.dropMax = Math.max.apply(null, drop);
  SEC.concat('gol').forEach(k => { if (Math.abs(avg(dv[k])) > 1) alert('setor: a média de "' + k + '" não é zero (' + avg(dv[k]).toFixed(2) + ')'); if (kS && sd(dv[k]) < 1.5) alert('setor: "' + k + '" não separa ninguém (desvio ' + sd(dv[k]).toFixed(2) + ')'); });
  if (Math.abs(avg(ratF) - 1) > 0.03 || Math.abs(avg(ratA) - 1) > 0.03) alert('setor: os gols esperados dos clubes mudaram na média (a favor ' + avg(ratF).toFixed(3) + ', contra ' + avg(ratA).toFixed(3) + ')');
  if (kS && sd(ratF) < 0.01) alert('setor: nenhum clube muda com os atributos');
  if (f3.drop > 1 || f3.dropMax > 3) alert('auxiliar: escala time mais fraco pelo atributo (média ' + f3.drop.toFixed(2) + ', pior ' + f3.dropMax.toFixed(1) + ')');
  if (kS && penOk / nTk < 1) alert('batedor: pênalti sem o melhor finalizador em ' + (nTk - penOk) + ' clubes');
  if (kS && ckOk / nTk < 1) alert('batedor: escanteio sem o melhor passador em ' + (nTk - ckOk) + ' clubes');
  // c) cada atributo puxa a parte certa: um time normal de 70 com +6 num atributo de um grupo de posições, com o mesmo geral
  const boost = (poss, i, d) => neutral(70).map(p => (poss.includes(p.pos) ? Object.assign({}, p, { at: p.at.map((v, j) => (j === i ? v + d : v)) }) : p));
  // O geral fica igual (os outros atributos descem o que o reforçado subiu no peso), senão S.coAttrs reacertaria tudo
  const up = (poss, i, d) => boost(poss, i, d).map(p => { if (!poss.includes(p.pos)) return p; const w = AT.w[p.pos][i] / 100; return Object.assign({}, p, { at: p.at.map((v, j) => (j === i ? v : v - d * w / (1 - w))) }); });
  const N0 = neutral(70), T = (sq, st, ost) => lam(side(sq, '4-4-2', st), side(N0, '4-4-2', ost || 'equilibrado'));
  const base = st => T(N0, st);
  const fin = T(up(['ATA'], 0, 6), 'equilibrado'), def = T(up(['ZAG', 'LAT'], 3, 6), 'equilibrado'), gol = T(up(['GOL'], 0, 6), 'equilibrado'), pas = T(up(['MEI'], 1, 6), 'posse');
  const velC = T(up(['ATA', 'MEI'], 4, 6), 'contra'), velP = T(up(['ATA', 'MEI'], 4, 6), 'posse'), fisP = T(up(['ZAG', 'LAT', 'MEI', 'ATA'], 5, 6), 'pressao'), fisR = T(up(['ZAG', 'LAT', 'MEI', 'ATA'], 5, 6), 'retranca');
  const b = { eq: base('equilibrado'), po: base('posse'), co: base('contra'), pr: base('pressao'), re: base('retranca') };
  f3.pull = { fin: fin[0] / b.eq[0], def: def[1] / b.eq[1], gol: gol[1] / b.eq[1], pas: pas[2] - b.po[2], velC: velC[0] / b.co[0], velP: velP[0] / b.po[0], fisP: fisP[0] / b.pr[0], fisR: fisR[0] / b.re[0] };
  if (kS) {
    if (!(f3.pull.fin > 1.02)) alert('setor: finalização dos atacantes não faz mais gol (' + f3.pull.fin.toFixed(3) + ')');
    if (!(f3.pull.def < 0.99)) alert('setor: defesa da zaga não leva menos gol (' + f3.pull.def.toFixed(3) + ')');
    if (!(f3.pull.gol < 0.995)) alert('setor: goleiro melhor não leva menos gol (' + f3.pull.gol.toFixed(3) + ')');
    if (!(f3.pull.pas > 0.005)) alert('setor: passe dos meias não dá mais posse (' + f3.pull.pas.toFixed(3) + ')');
    if (!(f3.pull.velC > f3.pull.velP + 0.005)) alert('estilo: velocidade não rende mais no contra-ataque que na posse (' + f3.pull.velC.toFixed(3) + ' x ' + f3.pull.velP.toFixed(3) + ')');
    if (!(f3.pull.fisP > f3.pull.fisR + 0.003)) alert('estilo: físico não rende mais na pressão que na retranca (' + f3.pull.fisP.toFixed(3) + ' x ' + f3.pull.fisR.toFixed(3) + ')');
  }
}

console.log('Atributos: ' + n + ' jogadores, ' + D.CLUBS.length + ' clubes, ' + SEASONS + ' temporadas');
console.log('Média por posição (temporada 0)      ' + AT.keys.L.map(k => AT.short[k]).join(' '));
['ZAG', 'LAT', 'MEI', 'ATA'].forEach(pos => console.log('  ' + pos + ' (geral ' + Math.round(avg(by[pos].map(o => o.ovr))) + ')                    ' + f(m[pos])));
console.log('  GOL (geral ' + Math.round(avg(by.GOL.map(o => o.ovr))) + ')                    ' + f(m.GOL) + '   (' + AT.keys.G.map(k => AT.short[k]).join(' ') + ')');
if (rc) console.log('Elencos reais: ' + rc + ' clubes · artilheiro acima do normal da posição em ' + upG + ' de ' + nG + ' (entre os 3 do elenco em ' + topG + ') · garçom em ' + upA + ' de ' + nA + ' (entre os 3 em ' + topA + ')');
console.log('Jeito de jogar (% dos jogadores da posição com cada ponto forte | ponto fraco)');
['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].forEach(pos => { const pc = o => Object.keys(o).filter(k => k !== 'n').sort((x, y) => o[y] - o[x]).map(k => k + ' ' + Math.round(100 * o[k] / o.n)).join(' · '); console.log('  ' + pos + '  ' + pc(trN[pos]) + '  |  ' + pc(trB[pos])); });
console.log('Faixa do olheiro: ' + nb + ' jogadores · largura média ' + (wid[0] / nb / 6).toFixed(1) + ' com 1 relatório e ' + (wid[1] / nb / 6).toFixed(1) + ' com 2 · número certo com 3');
console.log('Geral mudou: ponto forte mantido em ' + Math.round(100 * keep / tot) + '% (' + tot + ' casos)');
{
  const pc = x => (x >= 1 ? '+' : '') + (100 * (x - 1)).toFixed(1) + '%', P = f3.pull;
  console.log('Setor (fase 3' + (AT.kS ? '' : ', DESLIGADA') + '): desvio por jogador em pontos de geral · finalizar ' + sd(f3.dv.fin).toFixed(1) + ' · criar ' + sd(f3.dv.cri).toFixed(1) + ' · lado ' + sd(f3.dv.ala).toFixed(1) + ' · marcar ' + sd(f3.dv.mar).toFixed(1) + ' · goleiro ' + sd(f3.dv.gol).toFixed(1));
  console.log('  Clubes contra um time normal do mesmo nível: gols a favor ' + pc(avg(f3.ratF)) + ' na média, desvio ' + (100 * sd(f3.ratF)).toFixed(1) + ' (de ' + pc(Math.min.apply(null, f3.ratF)) + ' a ' + pc(Math.max.apply(null, f3.ratF)) + '), contra ' + pc(avg(f3.ratA)) + ' (de ' + pc(Math.min.apply(null, f3.ratA)) + ' a ' + pc(Math.max.apply(null, f3.ratA)) + ')');
  console.log('  +6 no atributo: finalização dos atacantes ' + pc(P.fin) + ' gols · defesa da zaga ' + pc(P.def) + ' gols sofridos · goleiro ' + pc(P.gol) + ' · passe dos meias ' + (100 * P.pas).toFixed(1) + ' pontos de posse · velocidade ' + pc(P.velC) + ' no contra-ataque e ' + pc(P.velP) + ' na posse · físico ' + pc(P.fisP) + ' na pressão e ' + pc(P.fisR) + ' na retranca');
  console.log('  Auxiliar: escalação diferente da feita só pelo geral em ' + Math.round(100 * f3.difXI) + '% dos clubes; geral médio do time ' + f3.drop.toFixed(2) + ' ponto abaixo (pior caso ' + f3.dropMax.toFixed(1) + ')');
}
// 11. Fase 4: o treino desenvolve e a virada de temporada mexe atributo por atributo
{
  const G = S.CO_GROW, T = S.CO_TRAIN, ks = Object.keys(T), f4 = { n: 0, dv: 0, up: 0, dn: 0, vf: 0, ot: 0, g: 0, hi: 0, lo: 0 };
  const sameMean = (p, tag) => { const a = S.coAttrs(p); if (Math.round(wmean(p.pos, a)) !== p.ovr || a.some(x => !Number.isInteger(x) || x < AT.min || x > AT.max)) alert(tag + ': atributos fora do geral ou da faixa em ' + p.n + ' ' + JSON.stringify(a) + ' geral ' + p.ovr); };
  for (let n = 0; n < 10; n++) {
    const co = S.coNew({ name: 'Treino', country: 'Brasil', start: n % 2 ? 'livre' : 'baixo', seed: 9000 + n * 131 }); S.coSign(co, S.coOffers(co)[0]); co.autoXI = true;
    for (let s = 0; s < 3 && !co.sacked; s++) {
      S.coStart(co);
      while (!co.ss.done && !co.sacked) {
        const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; }
        const k = ks[(co.ss.i * 7 + n + s) % ks.length];
        const bf = co.squad.map(p => ({ at: S.coAttrs(p).slice(), ovr: p.ovr, out: p.out }));
        const cp = JSON.parse(JSON.stringify(co));
        if (n === 0 && s === 0 && co.ss.i === 2) { const r0 = G.rate; G.rate = 0; const z = JSON.parse(JSON.stringify(co)); S.coTrain(z, k); G.rate = r0; if (z.squad.some((p, i) => p.at.join() !== bf[i].at.join() || (p.tp || 0) !== (co.squad[i].tp || 0))) alert('treino: desligado (CO_TRK=0) e mesmo assim desenvolveu'); }
        S.coTrain(co, k); S.coTrain(cp, k); f4.n++;
        if (JSON.stringify(cp.squad) !== JSON.stringify(co.squad) || JSON.stringify(cp.train) !== JSON.stringify(co.train)) alert('treino: o save no meio treina diferente (' + k + ')');
        let ups = 0;
        co.squad.forEach((p, i) => {
          const b = bf[i], a = S.coAttrs(p), ch = a.map((v, j) => v - b.at[j]), sum = ch.reduce((x, y) => x + Math.abs(y), 0), exp = S.coTrainAt(k, p.pos);
          if (sum > 1 || ch.some(x => x < 0)) alert('treino: mais de 1 ponto ou atributo caiu em ' + p.n + ' (' + k + ')');
          if (sum === 1) {
            f4.dv++;
            if (exp < 0 || ch[exp] !== 1) alert('treino: ' + k + ' mexeu no atributo errado de ' + p.pos + ' ' + p.n);
            if (b.out > 0) alert('treino: machucado treinou (' + p.n + ')');
            if (p.age > 30) alert('treino: ' + p.n + ' cresceu com ' + p.age + ' anos');
            if (b.ovr >= p.pot) alert('treino: ' + p.n + ' cresceu já no potencial');
          }
          if (p.ovr !== b.ovr) { ups++; f4.up++; if (p.ovr !== b.ovr + 1 || p.ovr > p.pot) alert('treino: geral de ' + p.n + ' foi de ' + b.ovr + ' para ' + p.ovr + ' (potencial ' + p.pot + ')'); if (!(co.train.up || []).includes(p.id)) alert('treino: ' + p.n + ' subiu de geral sem entrar no aviso'); }
          sameMean(p, 'treino');
        });
        if (((co.train && co.train.up) || []).length !== ups) alert('treino: lista do aviso com ' + ((co.train.up || []).length) + ' para ' + ups + ' subidas');
        const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m);
      }
      const pre = {}; co.squad.forEach(p => { pre[p.id] = { at: S.coAttrs(p).slice(), ovr: p.ovr }; });
      const out = S.coSeasonEnd(co);
      co.squad.forEach(p => {
        const b = pre[p.id]; if (!b) return; sameMean(p, 'virada');
        const a = S.coAttrs(p), d = p.ovr - b.ovr, ch = a.map((v, j) => (v - b.at[j]) / (d || 1)); if (!d || p.pos === 'GOL') return;
        if ((p.sd || 0) !== d) alert('virada: p.sd de ' + p.n + ' é ' + p.sd + ' e o geral mudou ' + d);
        const w = AT.w[p.pos], ord = [0, 1, 2, 3, 4, 5].sort((x, y) => w[y] - w[x]);
        if (d < 0) { f4.dn++; f4.vf += (ch[4] + ch[5]) / 2; f4.ot += (ch[0] + ch[1] + ch[2] + ch[3]) / 4; } else { f4.g++; f4.hi += ch[ord[0]]; f4.lo += ch[ord[5]]; }
      });
      if (out.offers) S.coSign(co, out.offers[0]);
    }
  }
  if (!f4.dv || !f4.up) alert('treino: ninguém desenvolveu em ' + f4.n + ' treinos');
  if (f4.dn > 20 && !(f4.vf / f4.dn > f4.ot / f4.dn + 0.3)) alert('virada: quem cai não perde velocidade e físico antes (' + (f4.vf / f4.dn).toFixed(2) + ' contra ' + (f4.ot / f4.dn).toFixed(2) + ' por ponto de geral)');
  if (f4.g > 20 && !(f4.hi / f4.g > f4.lo / f4.g + 0.3)) alert('virada: quem cresce não sobe mais no atributo de mais peso (' + (f4.hi / f4.g).toFixed(2) + ' contra ' + (f4.lo / f4.g).toFixed(2) + ')');
  console.log('Treino (fase 4' + (G.rate ? '' : ', DESLIGADA') + '): ' + f4.n + ' treinos · ' + (f4.dv / f4.n).toFixed(2) + ' ponto de atributo e ' + (f4.up / f4.n).toFixed(2) + ' subida de geral por treino');
  console.log('  Virada: quem cai perde ' + (f4.vf / Math.max(1, f4.dn)).toFixed(2) + ' de velocidade e físico por ponto de geral e ' + (f4.ot / Math.max(1, f4.dn)).toFixed(2) + ' no resto · quem cresce ganha ' + (f4.hi / Math.max(1, f4.g)).toFixed(2) + ' no atributo de mais peso e ' + (f4.lo / Math.max(1, f4.g)).toFixed(2) + ' no de menos');
}
alerts.forEach(a => console.log('ALERTA ' + a));
console.log(alerts.length + ' alertas');
process.exit(alerts.length ? 1 : 0);
