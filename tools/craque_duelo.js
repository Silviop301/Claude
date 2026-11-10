// Duelo na simulação livre do Treinador: dois clubes quaisquer jogam N vezes com o campinho decidindo (o mesmo caminho do
// ao vivo: o motor dá a força do ataque por minuto, o campinho joga e sorteia cada chute). Serve para ver se a diferença
// de força aparece no placar (Silvio, 2026-11-10: "um Real Madrid contra Remo, pra ver se a diferença tá impactando").
// Uso: node tools/craque_duelo.js "Real Madrid" "Remo" [jogos] [semente]   (metade dos jogos na casa de cada um)
const fs = require('fs'), path = require('path');
const D = require('../craque/src/data.js'), S = require('../craque/src/sim.js');
global.window = { CRAQUE_UI: {}, addEventListener() {}, removeEventListener() {} }; global.document = { hidden: false };
eval(fs.readFileSync(path.join(__dirname, '../craque/src/ui/livesim.js'), 'utf8'));
const LP = window.CRAQUE_UI.LP;
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const A = process.argv[2] || 'Real Madrid', B = process.argv[3] || 'Remo', N = +process.argv[4] || 100, SEED = +process.argv[5] || 1;
Math.random = prng(SEED * 31 + 5);
const idOf = nm => { for (const l of D.LEAGUES) { const i = l.clubs.findIndex(c => c[0].toLowerCase() === nm.toLowerCase()); if (i >= 0) return l.id + '-' + i; } console.error('clube não encontrado: ' + nm); process.exit(2); };
const ida = idOf(A), idb = idOf(B);
function spots(f) { const sl = S.CO_FORMS[f].slots, am = sl.some(x => x.ln === 'am'), Y = { g: 90, d: 70, m: am ? 55 : 46, am: 34, a: 17 }, out = [];
  ['g', 'd', 'm', 'am', 'a'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln); ix.forEach((i, k) => { out[i] = [Math.round((k + 1) * 100 / (ix.length + 1)), Y[ln]]; }); }); return out; }
function simForm(s) { const sl = S.CO_FORMS[s.form].slots, sp = spots(s.form), am = sl.some(x => x.ln === 'am'), DP = { g: 0, d: 0.17, m: am ? 0.42 : 0.48, am: 0.66, a: 0.88 }, out = [];
  S.coNums(s.squad);
  sl.forEach((x, i) => { if (!s.xi[i] || !sp[i]) return; const lat = sp[i][0], w = Math.max(8, Math.min(92, 50 + (lat - 50) * 1.25));
    const r = x.pos === 'GOL' ? 'GK' : x.pos === 'LAT' ? (lat < 50 ? 'LB' : 'RB') : x.pos === 'ZAG' ? 'CB' : x.pos === 'ATA' ? 'ST' : x.w ? (lat < 50 ? 'LM' : 'RM') : 'CM';
    const pl = s.squad.find(q => q.id === s.xi[i]), ov = pl ? pl.ovr - (100 - (pl.en === undefined ? 100 : pl.en)) * 0.1 : undefined;
    out.push([r, DP[x.ln] + (x.pos === 'LAT' && x.ln === 'd' ? 0.05 : 0) + (x.w && x.ln === 'a' ? -0.08 : 0), w, ov, pl ? { id: pl.id, num: pl.num, at: process.env.SEM_AT ? null : S.coAtSim(pl, ov - pl.ovr), enf: () => (pl.en === undefined ? 100 : pl.en) } : null]); });
  const gk = out.filter(p => p[0] === 'GK'), rest = out.filter(p => p[0] !== 'GK').sort((a, b) => a[1] - b[1]);
  if (!gk.length && rest.length) { const g0 = rest.shift(); g0[0] = 'GK'; g0[1] = 0; g0[2] = 50; gk.push(g0); }
  return gk.concat(rest); }
const xiAvg = s => { const v = s.xi.map(id => s.squad.find(p => p.id === id)).filter(Boolean).map(p => p.ovr); return v.reduce((a, b) => a + b, 0) / (v.length || 1); };
const STEPS = 137, G = []; let ova = 0, ovb = 0;
for (let g = 0; g < N; g++) {
  // metade dos jogos com o robô no banco de cada clube (o seu time tem o auxiliar escalando; o outro lado é o do motor)
  const mine = g % 2 ? idb : ida, other = g % 2 ? ida : idb;
  const co = S.coNew({ name: 'Robô', country: 'Brasil', start: 'livre', seed: SEED * 1000 + g * 7919 });
  S.coOffers(co); S.coSign(co, mine); co.autoXI = true; S.coStart(co);
  let nx = S.coNext(co); while (nx && nx.bye) { S.coSkipRound(co); nx = S.coNext(co); }
  if (!nx) continue;
  // troca o adversário da rodada pelo outro clube (o elenco dele sai do mesmo sorteio de sempre, pela força do clube)
  const ss = co.ss, me = ss.ids.indexOf(co.club), fx = ss.rounds[ss.i].find(([h, a]) => h === me || a === me), oi = fx[0] === me ? fx[1] : fx[0];
  ss.ids[oi] = other; if (g % 4 >= 2) { fx.reverse(); } // e alterna quem joga em casa
  const m = S.coMatchStart(co); if (!m) continue;
  const sh = [0, 0];
  const sim = LP.sim({ me: -1, goals: [], free: true, seed: g * 13 + 7, home: m.home ? 0 : 1, forms: [simForm(m.us), simForm(m.them)], styles: [S.CO_STY[m.us.style], S.CO_STY[m.them.style]], spm: () => 2.2, speed: () => 1.25,
    onShot: s => { const e = S.coMatchShot(co, m, s.side ? 'them' : 'us', s.out, s); if (e) sh[s.side]++; } });
  sim.go(); let key = '', xu = 0, xt = 0;
  const a0 = xiAvg(m.us), b0 = xiAvg(m.them);
  while (!m.done) {
    S.coMatchStep(co, m, m.min + 1, { free: true });
    if (m.lam) { xu += m.lam.us / S.CO.mins; xt += m.lam.them / S.CO.mins; }
    const k2 = [m.us, m.them].map(s => s.form + ':' + s.xi.join(',') + ':' + s.style).join('|');
    if (key && k2 !== key) [m.us, m.them].forEach((s, k) => { sim.lineup(k, simForm(s)); sim.style(k, S.CO_STY[s.style]); }); key = k2;
    sim.minute(m.tk || m.min, m.mom[m.mom.length - 1], m.lam ? [m.lam.us, m.lam.them] : undefined);
    if (!m.done) for (let i = 0; i < STEPS; i++) sim._step(0.02);
    S.coAutoStop(co, m);
  }
  sim.stop();
  const gu = m.home ? m.gh : m.ga, gt = m.home ? m.ga : m.gh, aMine = mine === ida;
  G.push({ ga: aMine ? gu : gt, gb: aMine ? gt : gu, sa: aMine ? sh[0] : sh[1], sb: aMine ? sh[1] : sh[0], xa: aMine ? xu : xt, xb: aMine ? xt : xu, home: (m.home ? mine : other) === ida });
  ova += aMine ? a0 : b0; ovb += aMine ? b0 : a0;
}
const n = G.length, sum = f => G.reduce((a, g) => a + f(g), 0), pct = x => (100 * x / n).toFixed(0) + '%';
const sc = {}; G.forEach(g => { const k = g.ga + ' x ' + g.gb; sc[k] = (sc[k] || 0) + 1; });
const top = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' (' + v + ')').join(' · ');
const big = G.slice().sort((a, b) => (b.ga - b.gb) - (a.ga - a.gb))[0], upset = G.slice().sort((a, b) => (a.ga - a.gb) - (b.ga - b.gb))[0];
console.log(`${A} x ${B}: ${n} jogos na simulação livre (titulares: geral médio ${(ova / n).toFixed(0)} contra ${(ovb / n).toFixed(0)})`);
console.log(`  ${A} venceu ${pct(sum(g => +(g.ga > g.gb)))} · empate ${pct(sum(g => +(g.ga === g.gb)))} · ${B} venceu ${pct(sum(g => +(g.ga < g.gb)))}`);
console.log(`  gols por jogo: ${(sum(g => g.ga) / n).toFixed(2)} x ${(sum(g => g.gb) / n).toFixed(2)} (o motor espera ${(sum(g => g.xa) / n).toFixed(2)} x ${(sum(g => g.xb) / n).toFixed(2)}) · chutes ${(sum(g => g.sa) / n).toFixed(1)} x ${(sum(g => g.sb) / n).toFixed(1)}`);
console.log(`  placares mais comuns: ${top}`);
console.log(`  maior goleada: ${big.ga} x ${big.gb} · melhor dia do ${B}: ${upset.ga} x ${upset.gb} · ${B} não marcou em ${pct(sum(g => +(g.gb === 0)))} · ${A} fez 3 ou mais em ${pct(sum(g => +(g.ga >= 3)))}`);
