// Carreira Relâmpago: distribuição de pontos e notas para jogadores-robô.
// Uso: node tools/craque_relampago_sim.js [partidas] [taxa de gol]  (sem taxa: mostra 0,3 a 0,9)
// Nas casas de clube o robô decide "ficar ou chutar de novo" pelo valor esperado, sabendo a força dos clubes
// (como quem conhece futebol) e os que já apareceram. Para medir a taxa de gol da mira: node tools/craque_relampago_sim.js mira
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 20000;

function play(seed, p) {
  const rounds = [], prev = [];
  for (let i = 0; i < 5; i++) {
    const ks = [];
    if (i < 3) {
      // pts do clube de cada bola e o que sobra se errar tudo
      const r0 = S.rlRound(seed, i, prev, []), pts = [0, 1, 2, 3, 4].map(j => r0.hidden(j).pts), worst = Math.min(...pts);
      const V = (U, n) => { // valor esperado com n bolas para chutar e U = bolas ainda não vistas
        if (!n) return worst;
        let v = 0;
        U.forEach(c => { const rest = U.filter(x => x !== c); v += (p * (n === 1 ? pts[c] : Math.max(pts[c], V(rest, n - 1))) + (1 - p) * V(rest, n - 1)) / U.length; });
        return v;
      };
      for (let j = 0; j < 5; j++) {
        if (Math.random() >= p) { ks.push(0); continue; }
        const rest = [0, 1, 2, 3, 4].slice(j + 1);
        if (j === 4 || pts[j] >= V(rest, 4 - j)) { ks.push(1); break; }
        ks.push(2);
      }
    } else for (let j = 0; j < 5; j++) ks.push(Math.random() < p ? 1 : 0);
    rounds.push(ks);
    prev.push(S.rlRound(seed, i, prev, ks).cone);
  }
  return S.rlScore(seed, rounds);
}

if (process.argv[2] === 'mira') {
  // Taxa de gol mirando no melhor ponto, com erro de tempo do toque (desvio em segundos)
  const g = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
  const rate = (st, tx, ty, sd, n) => { let ok = 0; for (let k = 0; k < n; k++) {
    const x = tx + g() * sd * 5 / st.period + st.wobble * (Math.random() * 2 - 1), y = Math.max(0, ty + g() * sd * 2.6 / (0.9 * st.period) + st.wobble * (Math.random() * 2 - 1));
    if (S.kickResult(st, x, y, S.kickKeeper(st, x, S.RL_KEEPER)).ok) ok++; } return ok / n; };
  for (let i = 0; i < 5; i++) {
    const st = S.rlKickSetup(i), row = [];
    let rnd = 0; for (let k = 0; k < 20000; k++) { const x = Math.random() * 2.5 - 1.25, y = Math.random() * 1.3; if (S.kickResult(st, x, y, S.kickKeeper(st, x, S.RL_KEEPER)).ok) rnd++; }
    for (const sd of [0.03, 0.05, 0.08]) { let b = 0; for (let tx = 0; tx <= 1; tx += 0.05) for (let ty = 0.05; ty <= 1; ty += 0.05) b = Math.max(b, rate(st, tx, ty, sd, 500)); row.push(Math.round(sd * 1000) + ' ms ' + Math.round(b * 100) + '%'); }
    console.log('Casa ' + (i + 1) + ': toque aleatório ' + Math.round(rnd / 200) + '% · mirando: ' + row.join(' · '));
  }
  process.exit(0);
}

for (const p of process.argv[3] ? [+process.argv[3]] : [0.3, 0.45, 0.55, 0.7, 0.9]) {
  const tot = [], gr = {}, left = [0, 0];
  for (let n = 0; n < N; n++) {
    const f = play(S.rlNewSeed(), p);
    tot.push(f.total); gr[f.grade] = (gr[f.grade] || 0) + 1;
    f.slots.slice(0, 3).forEach(s => { left[0]++; if (s.left.length) left[1]++; });
  }
  tot.sort((a, b) => a - b);
  console.log('gol ' + Math.round(p * 100) + '% · média ' + (tot.reduce((a, b) => a + b) / N).toFixed(1) + ' · p10/50/90 ' + [0.1, 0.5, 0.9].map(q => tot[Math.floor(N * q)]).join('/') +
    ' · notas ' + S.RL_GRADES.map(g => g[0] + Math.round(100 * (gr[g[0]] || 0) / N)).join(' ') + ' · largou clube em ' + Math.round(100 * left[1] / left[0]) + '% das casas');
}
