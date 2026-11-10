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

const f = a => a.map(x => String(Math.round(x)).padStart(3)).join(' ');
console.log('Atributos: ' + n + ' jogadores, ' + D.CLUBS.length + ' clubes, ' + SEASONS + ' temporadas');
console.log('Média por posição (temporada 0)      ' + AT.keys.L.map(k => AT.short[k]).join(' '));
['ZAG', 'LAT', 'MEI', 'ATA'].forEach(pos => console.log('  ' + pos + ' (geral ' + Math.round(avg(by[pos].map(o => o.ovr))) + ')                    ' + f(m[pos])));
console.log('  GOL (geral ' + Math.round(avg(by.GOL.map(o => o.ovr))) + ')                    ' + f(m.GOL) + '   (' + AT.keys.G.map(k => AT.short[k]).join(' ') + ')');
if (rc) console.log('Elencos reais: ' + rc + ' clubes · artilheiro acima do normal da posição em ' + upG + ' de ' + nG + ' (entre os 3 do elenco em ' + topG + ') · garçom em ' + upA + ' de ' + nA + ' (entre os 3 em ' + topA + ')');
console.log('Geral mudou: ponto forte mantido em ' + Math.round(100 * keep / tot) + '% (' + tot + ' casos)');
alerts.forEach(a => console.log('ALERTA ' + a));
console.log(alerts.length + ' alertas');
process.exit(alerts.length ? 1 : 0);
