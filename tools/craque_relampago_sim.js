// Carreira Relâmpago: distribuição de pontos e notas para jogadores-robô.
// Uso: node tools/craque_relampago_sim.js [partidas] [taxa de gol]  (sem taxa: mostra 0,3 a 0,9)
// Para medir a taxa de gol da mira: node tools/craque_relampago_sim.js mira
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 20000;

function play(seed, p) {
  const rounds = [];
  for (let i = 0; i < 5; i++) {
    // o robô escolhe as bolas numa ordem qualquer; nas casas de clube para no primeiro gol
    const order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5), ks = [];
    for (const b of order) { const g = Math.random() < p ? 1 : 0; ks.push([b, g]); if (i < 3 && g) break; }
    rounds.push(ks);
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
  const tot = [], gr = {};
  for (let n = 0; n < N; n++) {
    const f = play(S.rlNewSeed(), p);
    tot.push(f.total); gr[f.grade] = (gr[f.grade] || 0) + 1;
  }
  tot.sort((a, b) => a - b);
  console.log('gol ' + Math.round(p * 100) + '% · média ' + (tot.reduce((a, b) => a + b) / N).toFixed(1) + ' · p10/50/90 ' + [0.1, 0.5, 0.9].map(q => tot[Math.floor(N * q)]).join('/') +
    ' · notas ' + S.RL_GRADES.map(g => g[0] + Math.round(100 * (gr[g[0]] || 0) / N)).join(' '));
}
