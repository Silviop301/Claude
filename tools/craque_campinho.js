// Portão de qualidade do campinho ao vivo (craque/src/ui/livesim.js): joga partidas sem tela e confere o que faz
// a simulação parecer profissional. Uso: node tools/craque_campinho.js [jogos por combinação]   (esperado: 0 alertas)
//   bola nunca teletransporta · bonecos não se sobrepõem · passes, chutes e trocas de posse em faixas de jogo de verdade ·
//   retranca defende mais baixo que pressão · time mais forte manda no campo · todo gol do motor balança a rede
const fs = require('fs'), path = require('path');
global.window = { CRAQUE_UI: {}, addEventListener() {}, removeEventListener() {} }; global.document = { hidden: false };
eval(fs.readFileSync(path.join(__dirname, '../craque/src/ui/livesim.js'), 'utf8'));
const LP = window.CRAQUE_UI.LP;
const FSPEC = {
  '4-4-2': 'LAT.W ZAG ZAG LAT.W|MEI.W MEI MEI MEI.W|ATA ATA',
  '4-3-3': 'LAT.W ZAG ZAG LAT.W|MEI MEI MEI|ATA.W ATA ATA.W',
  '4-2-3-1': 'LAT.W ZAG ZAG LAT.W|MEI MEI|MEI.W MEI MEI.W|ATA',
  '4-5-1': 'LAT.W ZAG ZAG LAT.W|MEI.W MEI MEI MEI MEI.W|ATA',
  '3-5-2': 'ZAG ZAG ZAG|LAT.W MEI MEI MEI LAT.W|ATA ATA',
  '3-4-3': 'ZAG ZAG ZAG|LAT.W MEI MEI LAT.W|ATA.W ATA ATA.W',
  '5-3-2': 'LAT.W ZAG ZAG ZAG LAT.W|MEI MEI MEI|ATA ATA',
};
const STY = {
  equilibrado: { ctrl: 1, press: 0.35, line: 0.5, counter: 0.35, wide: 0.5 },
  posse: { ctrl: 1.3, press: 0.25, line: 0.65, counter: 0.1, wide: 0.45 },
  pressao: { ctrl: 1.05, press: 1.1, line: 0.95, counter: 0.2, wide: 0.5 },
  contra: { ctrl: 0.78, press: 0.1, line: 0.2, counter: 1.25, wide: 0.4 },
  retranca: { ctrl: 0.72, press: 0, line: 0, counter: 0.8, wide: 0.2 },
  lados: { ctrl: 0.95, press: 0.3, line: 0.6, counter: 0.25, wide: 0.95 },
};
function slots(f) { const g = FSPEC[f].split('|'), lines = g.map((x, i) => (i === 0 ? 'd' : i === g.length - 1 ? 'a' : i === 2 && g.length === 4 ? 'am' : 'm'));
  const s = [{ pos: 'GOL', w: false, ln: 'g' }]; g.forEach((grp, i) => grp.split(' ').forEach(t => { const [pos, w] = t.split('.'); s.push({ pos, w: w === 'W', ln: lines[i] }); })); return s; }
function spots(f) { const sl = slots(f), am = sl.some(x => x.ln === 'am'); const Y = { g: 90, d: 70, m: am ? 55 : 46, am: 34, a: 17 }, out = [];
  ['g', 'd', 'm', 'am', 'a'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln); ix.forEach((i, k) => { out[i] = [Math.round((k + 1) * 100 / (ix.length + 1)), Y[ln]]; }); }); return out; }
function simForm(f) { const sl = slots(f), sp = spots(f), am = sl.some(x => x.ln === 'am'); const DP = { g: 0, d: 0.17, m: am ? 0.42 : 0.48, am: 0.66, a: 0.88 }, out = [];
  sl.forEach((x, i) => { const lat = sp[i][0], w = Math.max(8, Math.min(92, 50 + (lat - 50) * 1.25));
    const r = x.pos === 'GOL' ? 'GK' : x.pos === 'LAT' ? (lat < 50 ? 'LB' : 'RB') : x.pos === 'ZAG' ? 'CB' : x.pos === 'ATA' ? 'ST' : x.w ? (lat < 50 ? 'LM' : 'RM') : 'CM';
    out.push([r, DP[x.ln] + (x.pos === 'LAT' && x.ln === 'd' ? 0.05 : 0) + (x.w && x.ln === 'a' ? -0.08 : 0), w]); });
  const gk = out.filter(p => p[0] === 'GK'), rest = out.filter(p => p[0] !== 'GK').sort((a, b) => a[1] - b[1]); return gk.concat(rest); }

const N = +process.argv[2] || 6, alerts = [], warn = (ok, msg) => { if (!ok) alerts.push(msg); };
const ovF = (f, ov) => simForm(f).map(r => r.concat([ov]));
const COMBOS = [['4-3-3', 'pressao', '4-4-2', 'retranca'], ['4-4-2', 'equilibrado', '4-3-3', 'posse'], ['3-5-2', 'lados', '4-2-3-1', 'contra'], ['4-2-3-1', 'posse', '5-3-2', 'pressao']];
// Uma partida: 6000 passos de 0,02 s (~2 min de jogo, como o 1×); gols do motor nos minutos dados
function match(o, goals) {
  const sim = LP.sim(Object.assign({ me: -1, goals: goals || [] }, o)); sim.go();
  const m = { jump: 0, pr3: 0, n: 0, passes: 0, flips: 0, shots: [0, 0], f3: [0, 0], nets: 0, backX: [[], []], rein: { lat: 0, esc: 0, tiro: 0 }, stuck: 0, outPlay: 0, arOut: 0 };
  let lb = null, lo = null, lp = -1, goalsSeen = 0, lm = null, mt = 0;
  for (let i = 0; i < 6000; i++) {
    if (i % 65 === 0) sim.minute(Math.floor(i / 65) + 1, 50);
    sim._step(0.02); const S = sim._state(), b = S.ball;
    // reinícios (lateral, escanteio, tiro de meta): contam, não travam; bandeirinha só na sua metade
    if (S.mode !== lm) { if (S.mode === 'rein') m.rein[S.rs.k]++; else if (S.mode === 'tiro') m.rein.tiro++; lm = S.mode; mt = 0; } else mt += 0.02;
    if (mt > 9 && S.mode !== 'play' && S.mode !== 'wait') { m.stuck++; mt = -99; }
    if (S.AR && (S.AR[0].x > 52.5 + 1 || S.AR[1].x < 52.5 - 1)) m.arOut++;
    if (S.mode !== 'play') { lb = null; continue; }
    if (!b.fly && (b.x < -1 || b.x > 106 || b.y < -1 || b.y > 69)) m.outPlay++;
    if (lb && Math.hypot(b.x - lb[0], b.y - lb[1]) > 1.6) m.jump++; lb = [b.x, b.y];
    if (b.owner && b.owner !== lo) { if (lo && lo.side === b.owner.side) m.passes++; lo = b.owner; }
    if (S.poss !== lp) { if (lp >= 0) m.flips++; lp = S.poss; }
    if (b.fly && b.fly.shot && !b.fly._q) { b.fly._q = 1; m.shots[b.fly.side]++; if (b.fly.out === 'gol') goalsSeen++; }
    if (b.owner) { const s = b.owner.side, x = s ? 105 - b.x : b.x; if (x > 70) m.f3[s]++; }
    if (i % 5) continue; m.n++;
    const A = S.ALLX; for (let a = 0; a < A.length; a++) for (let c = a + 1; c < A.length; c++) if (Math.hypot(A[a].x - A[c].x, A[a].y - A[c].y) < 3) m.pr3++;
    // altura da última linha de quem defende (média dos 4 mais recuados, sem o goleiro), na sua própria frente
    if (b.owner) { const d = 1 - b.owner.side, xs = A.filter(p => p.side === d && p.r !== 'GK').map(p => (d ? 105 - p.x : p.x)).sort((u, v) => u - v).slice(0, 4); m.backX[d].push(xs.reduce((u, v) => u + v, 0) / 4); }
  }
  m.nets = goalsSeen; sim.stop(); return m;
}
const avg = a => a.reduce((u, v) => u + v, 0) / Math.max(1, a.length);
let tot = { jump: 0, pr3: 0, n: 0, passes: 0, flips: 0, shots: 0, games: 0, lat: 0, esc: 0, tiro: 0, stuck: 0, outPlay: 0, arOut: 0 }; const line = {};
COMBOS.forEach(([fa, sa, fb, sb], ci) => {
  for (let g = 0; g < N; g++) {
    const m = match({ seed: 900 + ci * 101 + g * 13, home: g % 2, forms: [simForm(fa), simForm(fb)], styles: [STY[sa], STY[sb]] });
    tot.jump += m.jump; tot.pr3 += m.pr3; tot.n += m.n; tot.passes += m.passes; tot.flips += m.flips; tot.shots += m.shots[0] + m.shots[1]; tot.games++;
    for (const k in m.rein) tot[k] += m.rein[k]; tot.stuck += m.stuck; tot.outPlay += m.outPlay; tot.arOut += m.arOut;
    (line[sa] = line[sa] || []).push(avg(m.backX[0])); (line[sb] = line[sb] || []).push(avg(m.backX[1]));
  }
});
const P = k => tot[k] / tot.games;
console.log(`por jogo: passes ${P('passes').toFixed(0)} · trocas de posse ${P('flips').toFixed(0)} · chutes ${P('shots').toFixed(1)} · pulos da bola ${tot.jump} · pares a menos de 3 m ${(tot.pr3 / tot.n).toFixed(2)} por quadro`);
console.log(`reinícios por jogo: laterais ${P('lat').toFixed(1)} · escanteios ${P('esc').toFixed(1)} · tiros de meta ${P('tiro').toFixed(1)} · travados ${tot.stuck} · bola fora com o jogo rolando ${tot.outPlay} quadros · bandeirinha fora da sua metade ${tot.arOut} quadros`);
console.log('linha de defesa por estilo (m da própria meta): ' + Object.keys(line).map(k => `${k} ${avg(line[k]).toFixed(0)}`).join(' · '));
warn(tot.jump === 0, `a bola pulou ${tot.jump} vezes (teletransporte)`);
warn(P('lat') >= 0.8 && P('esc') >= 0.6 && P('tiro') >= 1, `a bola quase não sai: laterais ${P('lat').toFixed(1)}, escanteios ${P('esc').toFixed(1)}, tiros de meta ${P('tiro').toFixed(1)} por jogo`);
warn(tot.stuck === 0, `reinício travado ${tot.stuck} vez(es) (mais de 9 s parado)`);
warn(tot.outPlay < tot.games, `bola fora do campo com o jogo rolando: ${tot.outPlay} quadros`);
warn(tot.arOut === 0, `bandeirinha saiu da sua metade: ${tot.arOut} quadros`);
warn(tot.pr3 / tot.n < 0.8, `bonecos encostados demais: ${(tot.pr3 / tot.n).toFixed(2)} pares a menos de 3 m por quadro (limite 0,8)`);
warn(P('passes') >= 18, `poucos passes por jogo (${P('passes').toFixed(0)}, mínimo 18)`);
warn(P('shots') >= 4 && P('shots') <= 14, `chutes por jogo fora da faixa 4-14 (${P('shots').toFixed(1)})`);
warn(P('flips') >= 8 && P('flips') <= 24, `trocas de posse fora da faixa 8-24 (${P('flips').toFixed(0)})`);
warn(avg(line.retranca) + 8 < avg(line.pressao), `retranca (${avg(line.retranca).toFixed(0)} m) não defende bem mais baixo que pressão (${avg(line.pressao).toFixed(0)} m)`);
// Overall: o time forte (85) contra o fraco (55) chuta mais e fica mais no último terço
let sh = [0, 0], f3 = [0, 0];
for (let g = 0; g < N * 2; g++) { const m = match({ seed: 1700 + g * 7, forms: [ovF('4-3-3', 85), ovF('4-3-3', 55)], styles: [STY.equilibrado, STY.equilibrado] }); sh[0] += m.shots[0]; sh[1] += m.shots[1]; f3[0] += m.f3[0]; f3[1] += m.f3[1]; }
console.log(`forte x fraco: chutes ${sh[0]} x ${sh[1]} · tempo no último terço ${(f3[0] * 0.02).toFixed(0)} x ${(f3[1] * 0.02).toFixed(0)} s`);
warn(sh[0] > sh[1] * 1.3 && f3[0] > f3[1], 'o overall não aparece: o time forte não chuta nem pressiona mais que o fraco');
// Gols do motor: cada um tem de virar chute que entra (a rede balança antes do placar)
let want = 0, got = 0;
for (let g = 0; g < N; g++) { const gl = [{ m: 20 + g * 3, side: 0 }, { m: 60 + g, side: 1 }]; want += gl.length; got += match({ seed: 2500 + g * 11, forms: [simForm('4-3-3'), simForm('4-4-2')], styles: [STY.equilibrado, STY.posse] }, gl).nets; }
console.log(`gols do motor: ${got} de ${want} balançaram a rede`);
warn(got === want, `gols do motor que não viraram gol no campinho: ${want - got}`);
console.log(alerts.length ? `\n${alerts.length} alerta(s):\n- ` + alerts.join('\n- ') : '\n0 alertas');
process.exitCode = alerts.length ? 1 : 0;
