// Modo Treinador: confronto de formações e estilos com elencos iguais (todos 70, cada um na sua posição, campo neutro).
// Mostra a diferença de gols esperados de cada combinação contra cada outra. Esperado: 0 alertas
//  - nenhuma combinação ganha de todas (sempre existe resposta);
//  - todo estilo é a melhor resposta contra alguma combinação, e toda formação aparece em alguma melhor resposta;
//  - a média de cada combinação contra todas fica perto de zero (nada é melhor "no geral" por muito).
// Uso (na raiz): node tools/craque_taticas.js [formação estilo]   (com uma combinação, mostra as respostas a ela)
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const OV = +process.env.OVR || 70;
let id = 0;
const sq = [];
Object.entries({ GOL: 3, ZAG: 6, LAT: 5, MEI: 9, ATA: 6 }).forEach(([pos, n]) => { for (let k = 0; k < n; k++) sq.push({ id: 'x' + (id++), n: pos + k, pos, age: 26, ovr: OV, pot: OV, en: 100, mo: 60, out: 0, sus: 0 }); });
const F = Object.keys(S.CO_FORMS), ST = S.CO_STYLES, C = [];
F.forEach(f => ST.forEach(s => C.push({ f, s, k: f + ' ' + S.CO_STY[s].name })));
const side = c => ({ squad: sq, form: c.f, style: c.s, xi: S.coAutoXI(sq, c.f).xi });
// Pontos esperados por jogo (Poisson): o empate vale, então fechar a casinha tem valor de verdade para o mais fraco
const pois = (l, k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return Math.exp(-l) * Math.pow(l, k) / f; };
const pts = (lh, la) => { let w = 0, d = 0; for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) { const p = pois(lh, a) * pois(la, b); if (a > b) w += p; else if (a === b) d += p; } return 3 * w + d; };
const GAP = +process.env.GAP || 0; // GAP=6: o seu time 6 pontos mais fraco (a linha é o mais fraco)
const sqW = sq.map(p => Object.assign({}, p, { ovr: OV - GAP }));
const sideW = c => ({ squad: sqW, form: c.f, style: c.s, xi: S.coAutoXI(sqW, c.f).xi });
const M = C.map(a => C.map(b => { const r = S.coMatchup(sideW(a), side(b), true); return pts(r.lh, r.la) - (GAP ? 0 : 1.35); }));
const alerts = [];
const avg = C.map((_, i) => M[i].reduce((x, y) => x + y, 0) / C.length);
C.forEach((c, i) => { if (!GAP && C.every((_, j) => j === i || M[i][j] > 0)) alerts.push('domina tudo: ' + c.k); });
const best = C.map((_, j) => { let bi = 0; C.forEach((_, i) => { if (M[i][j] > M[bi][j]) bi = i; }); return bi; });
ST.forEach(s => { if (s !== 'equilibrado' && !best.some(i => C[i].s === s)) alerts.push('estilo nunca é a melhor resposta: ' + S.CO_STY[s].name); });
F.forEach(f => { if (!best.some(i => C[i].f === f)) alerts.push('formação nunca é a melhor resposta: ' + f); });
const mid = avg.reduce((x, y) => x + y, 0) / avg.length;
C.forEach((c, i) => { if (Math.abs(avg[i] - mid) > 0.25) alerts.push('média longe de zero: ' + c.k + ' ' + avg[i].toFixed(2)); });
const fmt = x => (x >= 0 ? '+' : '') + x.toFixed(2);
const arg = process.argv.slice(2).join(' ');
if (arg) {
  const j = C.findIndex(c => (c.f + ' ' + c.s) === arg || c.k.toLowerCase() === arg.toLowerCase());
  if (j < 0) { console.log('Combinação não encontrada. Ex.: 4-4-2 posse'); process.exit(1); }
  console.log('Respostas a ' + C[j].k + ' (pontos esperados por jogo' + (GAP ? ', ' + GAP + ' mais fraco' : ', menos 1,35') + '):');
  C.map((c, i) => [M[i][j], c.k]).sort((a, b) => b[0] - a[0]).forEach(([v, k], n) => { if (n < 6 || n >= C.length - 3) console.log('  ' + fmt(v) + '  ' + k); });
} else {
  console.log(`Confronto tático: ${C.length} combinações (${F.length} formações x ${ST.length} estilos), elencos de ${OV}` + (GAP ? `, a linha ${GAP} mais fraca (pontos por jogo)` : ' (pontos por jogo acima de 1,35)'));
  console.log('Por estilo (média contra tudo, melhor e pior): ');
  ST.forEach(s => { const ix = C.map((c, i) => i).filter(i => C[i].s === s), a = ix.reduce((x, i) => x + avg[i], 0) / ix.length;
    const all = ix.flatMap(i => M[i]); console.log('  ' + S.CO_STY[s].name.padEnd(17) + fmt(a) + '  faixa ' + fmt(Math.min(...all)) + ' a ' + fmt(Math.max(...all)) + '  melhor resposta em ' + best.filter(b => C[b].s === s).length); });
  console.log('Por formação: ' + F.map(f => { const ix = C.map((c, i) => i).filter(i => C[i].f === f); return f + ' ' + fmt(ix.reduce((x, i) => x + avg[i], 0) / ix.length) + ' (' + best.filter(b => C[b].f === f).length + ')'; }).join(' · '));
  const top = C.map((c, i) => [avg[i], c.k]).sort((a, b) => b[0] - a[0]);
  console.log('Melhores no geral: ' + top.slice(0, 4).map(([v, k]) => k + ' ' + fmt(v)).join(' · '));
  console.log('Piores no geral: ' + top.slice(-3).map(([v, k]) => k + ' ' + fmt(v)).join(' · '));
  // Estilo contra estilo, cada um na sua melhor formação contra a média
  console.log('Estilo x estilo (linha contra coluna, média das formações):');
  console.log('                   ' + ST.map(s => S.CO_STY[s].name.slice(0, 8).padStart(9)).join(''));
  ST.forEach(a => { const row = ST.map(b => { let t = 0, n = 0; C.forEach((ca, i) => C.forEach((cb, j) => { if (ca.s === a && cb.s === b) { t += M[i][j]; n++; } })); return fmt(t / n).padStart(9); }).join('');
    console.log('  ' + S.CO_STY[a].name.padEnd(17) + row); });
}
console.log(alerts.length + ' alertas' + (alerts.length ? ':\n  ' + alerts.slice(0, 12).join('\n  ') : ''));
