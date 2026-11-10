// Simulação livre do Treinador (teste: ?livre=1): temporadas do robô técnico com o campinho decidindo cada jogo, sem tela.
// O motor só diz a força do ataque de cada lado a cada minuto (m.lam); o campinho (livesim.js, o.free) joga, sorteia cada
// chute na hora e devolve gols e chances (S.coMatchShot). Confere se o placar que nasce no campo bate com o que o motor
// espera: gols por jogo, quem está melhor faz mais gol e vence mais. Uso: node tools/craque_campinho_livre.js [jogos] [semente]
//   Esperado: 0 alertas. (No livre o 3× da tela dá ao campinho os mesmos segundos por minuto do 1×: mesma conta)
const fs = require('fs'), path = require('path');
const D = require('../craque/src/data.js'), S = require('../craque/src/sim.js');
global.window = { CRAQUE_UI: {}, addEventListener() {}, removeEventListener() {} }; global.document = { hidden: false };
eval(fs.readFileSync(path.join(__dirname, '../craque/src/ui/livesim.js'), 'utf8'));
const LP = window.CRAQUE_UI.LP;
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const N = +process.argv[2] || 300, SEED = +process.argv[3] || 1;
Math.random = prng(SEED * 31 + 5);
// As vagas da formação viram bonecos do campinho, como em ui/coach.js (simForm): papel, altura, lado, overall e quem é
function spots(f) { const sl = S.CO_FORMS[f].slots, am = sl.some(x => x.ln === 'am'), Y = { g: 90, d: 70, m: am ? 55 : 46, am: 34, a: 17 }, out = [];
  ['g', 'd', 'm', 'am', 'a'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln); ix.forEach((i, k) => { out[i] = [Math.round((k + 1) * 100 / (ix.length + 1)), Y[ln]]; }); }); return out; }
function simForm(s) { const sl = S.CO_FORMS[s.form].slots, sp = spots(s.form), am = sl.some(x => x.ln === 'am'), DP = { g: 0, d: 0.17, m: am ? 0.42 : 0.48, am: 0.66, a: 0.88 }, out = [];
  S.coNums(s.squad);
  sl.forEach((x, i) => { if (!s.xi[i] || !sp[i]) return; const lat = sp[i][0], w = Math.max(8, Math.min(92, 50 + (lat - 50) * 1.25));
    const r = x.pos === 'GOL' ? 'GK' : x.pos === 'LAT' ? (lat < 50 ? 'LB' : 'RB') : x.pos === 'ZAG' ? 'CB' : x.pos === 'ATA' ? 'ST' : x.w ? (lat < 50 ? 'LM' : 'RM') : 'CM';
    const pl = s.squad.find(q => q.id === s.xi[i]), ov = pl ? pl.ovr - (100 - (pl.en === undefined ? 100 : pl.en)) * 0.1 : undefined;
    out.push([r, DP[x.ln] + (x.pos === 'LAT' && x.ln === 'd' ? 0.05 : 0) + (x.w && x.ln === 'a' ? -0.08 : 0), w, ov, pl ? { id: pl.id, num: pl.num, enf: () => (pl.en === undefined ? 100 : pl.en) } : null]); });
  const gk = out.filter(p => p[0] === 'GK'), rest = out.filter(p => p[0] !== 'GK').sort((a, b) => a[1] - b[1]);
  if (!gk.length && rest.length) { const g0 = rest.shift(); g0[0] = 'GK'; g0[1] = 0; g0[2] = 50; gk.push(g0); }
  return gk.concat(rest); }
const STEPS = 137; // passos de 0,02 s do campinho por minuto do jogo (2,2 s a 1,25)
const G = []; let games = 0, n = 0, bad = 0;
while (games < N) {
  const co = S.coNew({ name: 'Robô', country: 'Brasil', start: n % 2 ? 'livre' : 'baixo', seed: SEED * 1000 + n * 7919 }); n++;
  const offs = S.coOffers(co); S.coSign(co, offs[n % offs.length]); co.autoXI = true; S.coStart(co);
  while (!co.ss.done && !co.sacked && games < N) {
    const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; }
    const m = S.coMatchStart(co); if (!m) break;
    const g = { xu: 0, xt: 0, sh: [0, 0], far: 0, gn: 0, pen: 0 };
    const sim = LP.sim({ me: -1, goals: [], free: true, seed: games * 13 + 7, home: m.home ? 0 : 1, forms: [simForm(m.us), simForm(m.them)], styles: [S.CO_STY[m.us.style], S.CO_STY[m.them.style]],
      spm: () => 2.2, speed: () => 1.25,
      onShot: sh => { const e = S.coMatchShot(co, m, sh.side ? 'them' : 'us', sh.out, sh); if (!e) return; g.sh[sh.side]++; if (sh.out === 'gol') { g.gn++; if (sh.dist > 18) g.far++; } if (sh.id == null) bad++; } });
    sim.go(); let key = '';
    while (!m.done) {
      S.coMatchStep(co, m, m.min + 1, { free: true });
      if (m.lam) { g.xu += m.lam.us / S.CO.mins; g.xt += m.lam.them / S.CO.mins; }
      const k2 = [m.us, m.them].map(s => s.form + ':' + s.xi.join(',') + ':' + s.style).join('|');
      if (key && k2 !== key) [m.us, m.them].forEach((s, k) => { sim.lineup(k, simForm(s)); sim.style(k, S.CO_STY[s.style]); }); key = k2;
      sim.minute(m.tk || m.min, m.mom[m.mom.length - 1], m.lam ? [m.lam.us, m.lam.them] : undefined);
      if (!m.done) for (let i = 0; i < STEPS; i++) sim._step(0.02);
      S.coAutoStop(co, m);
    }
    sim.stop();
    g.gu = m.home ? m.gh : m.ga; g.gt = m.home ? m.ga : m.gh; g.pen = m.ev.filter(e => e.sp === 'pen').length; G.push(g); games++;
    S.coMatchEnd(co, m);
  }
}
const sum = f => G.reduce((a, g) => a + f(g), 0), pct = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '-');
const pois = (l, k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return Math.exp(-l) * Math.pow(l, k) / f; };
const wdl = (a, b) => { let w = 0, d = 0; for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) { const p = pois(a, x) * pois(b, y); if (x > y) w += p; else if (x === y) d += p; } return [w, d, 1 - w - d]; };
const gols = sum(g => g.gu + g.gt), esp = sum(g => g.xu + g.xt), ex = G.reduce((a, g) => { const p = wdl(g.xu, g.xt); return [a[0] + p[0], a[1] + p[1], a[2] + p[2]]; }, [0, 0, 0]);
const res = [sum(g => +(g.gu > g.gt)), sum(g => +(g.gu === g.gt)), sum(g => +(g.gu < g.gt))];
// Por faixa de força do ataque no jogo (cada lado de cada jogo é uma amostra): fraco, médio, forte
const sides = G.flatMap(g => [[g.xu, g.gu], [g.xt, g.gt]]).sort((a, b) => a[0] - b[0]), third = Math.floor(sides.length / 3);
const band = k => { const a = sides.slice(k * third, k === 2 ? sides.length : (k + 1) * third); return [a.reduce((u, x) => u + x[0], 0) / a.length, a.reduce((u, x) => u + x[1], 0) / a.length]; };
const B = [0, 1, 2].map(band), alerts = [], warn = (ok, msg) => { if (!ok) alerts.push(msg); };
console.log(`Simulação livre: ${games} jogos · gols por jogo ${(gols / games).toFixed(2)} (o motor espera ${(esp / games).toFixed(2)}) · chutes por jogo ${(sum(g => g.sh[0] + g.sh[1]) / games).toFixed(1)} · de fora da área ${pct(sum(g => g.far), sum(g => g.gn))} dos gols · pênaltis ${(sum(g => g.pen) / games).toFixed(2)} por jogo`);
console.log(`  resultado do seu time V/E/D: ${res.map(x => pct(x, games)).join(' / ')} (esperado pelo motor ${ex.map(x => pct(x, games)).join(' / ')}) · 0 a 0: ${pct(sum(g => +(g.gu + g.gt === 0)), games)} · 5 gols ou mais: ${pct(sum(g => +(g.gu + g.gt >= 5)), games)}`);
console.log('  por força do ataque (esperado → saiu): ' + B.map((b, i) => ['fraco', 'médio', 'forte'][i] + ' ' + b[0].toFixed(2) + ' → ' + b[1].toFixed(2)).join(' · '));
warn(Math.abs(gols / esp - 1) < 0.15, 'gols no total: ' + (gols / games).toFixed(2) + ' por jogo contra ' + (esp / games).toFixed(2) + ' esperados (tem de ficar a ±15%)');
if (games >= 300) { warn(B[2][1] > B[0][1] * 1.3, 'ataque forte não faz bem mais gol que o fraco: ' + B[2][1].toFixed(2) + ' x ' + B[0][1].toFixed(2));
  B.forEach((b, i) => warn(Math.abs(b[1] / b[0] - 1) < 0.3, 'faixa ' + ['fraca', 'média', 'forte'][i] + ': saiu ' + b[1].toFixed(2) + ' para ' + b[0].toFixed(2) + ' esperado (±30%)')); }
warn(bad === 0, bad + ' chutes sem o jogador do motor');
console.log(alerts.length ? 'ALERTAS (' + alerts.length + '):\n  ' + alerts.join('\n  ') : '0 alertas');
process.exit(alerts.length ? 1 : 0);
