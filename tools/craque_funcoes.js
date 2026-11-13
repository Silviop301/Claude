// Estilos de jogo por vaga do Treinador (S.CO_PSTY, Funções): o mesmo jogo com o jogador de uma vaga em cada estilo, no
// cérebro 11x11. Mostra o que muda no lance dele (impedimentos, faltas, chutes, gols, passes para gol, onde joga, energia) e
// no placar do time. Os jogos são pareados: mesma carreira, mesmo adversário, só o estilo muda.
// Uso: node tools/craque_funcoes.js [grupo|todos] [jogos por estilo]   ex.: node tools/craque_funcoes.js ATA 60
//   Esperado: 0 alertas (cada estilo mostra o ganho e o custo que promete e nenhum estilo ganha muito mais pontos que o padrão)
const fs = require('fs'), path = require('path');
const D = require('../craque/src/data.js'), S = require('../craque/src/sim.js');
global.window = { CRAQUE_UI: {}, addEventListener() {}, removeEventListener() {} }; global.document = { hidden: false };
eval(fs.readFileSync(path.join(__dirname, '../craque/src/ui/cerebro11.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../craque/src/ui/livesim.js'), 'utf8'));
const LP = window.CRAQUE_UI.LP;
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const GRP = (process.argv[2] || 'todos').toUpperCase(), N = +process.argv[3] || 40, PER = 4; // PER jogos por carreira
function spots(f) { const sl = S.CO_FORMS[f].slots, am = sl.some(x => x.ln === 'am'), Y = { g: 90, d: 70, m: am ? 55 : 46, am: 34, a: 17 }, out = [];
  ['g', 'd', 'm', 'am', 'a'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln); ix.forEach((i, k) => { out[i] = [Math.round((k + 1) * 100 / (ix.length + 1)), Y[ln]]; }); }); return out; }
function simForm(s) { const sl = S.CO_FORMS[s.form].slots, sp = spots(s.form), am = sl.some(x => x.ln === 'am'), DP = { g: 0, d: 0.17, m: am ? 0.42 : 0.48, am: 0.66, a: 0.88 }, out = [];
  S.coNums(s.squad);
  sl.forEach((x, i) => { if (!s.xi[i] || !sp[i]) return; const lat = sp[i][0], w = Math.max(8, Math.min(92, 50 + (lat - 50) * 1.25));
    const r = x.pos === 'GOL' ? 'GK' : x.pos === 'LAT' ? (lat < 50 ? 'LB' : 'RB') : x.pos === 'ZAG' ? 'CB' : x.pos === 'ATA' ? 'ST' : x.w ? (lat < 50 ? 'LM' : 'RM') : 'CM';
    const pl = s.squad.find(q => q.id === s.xi[i]), ov = pl ? pl.ovr - (100 - (pl.en === undefined ? 100 : pl.en)) * 0.1 : undefined;
    out.push([r, DP[x.ln] + (x.pos === 'LAT' && x.ln === 'd' ? 0.05 : 0) + (x.w && x.ln === 'a' ? -0.08 : 0), w, ov, pl ? { id: pl.id, num: pl.num, at: S.coAtSim(pl, ov - pl.ovr), es: S.coRoleFx(s, i, pl).b, enf: () => (pl.en === undefined ? 100 : pl.en) } : null]); });
  const gk = out.filter(p => p[0] === 'GK'), rest = out.filter(p => p[0] !== 'GK').sort((a, b) => a[1] - b[1]);
  if (!gk.length && rest.length) { const g0 = rest.shift(); g0[0] = 'GK'; g0[1] = 0; g0[2] = 50; gk.push(g0); }
  return gk.concat(rest); }
// formação e vaga de cada grupo (a primeira formação que tem a vaga)
function slotOf(g) { for (const f of ['4-4-2', '4-3-3', '4-2-3-1', '4-5-1', '3-5-2', '5-3-2', '4-1-2-1-2']) { if (!S.CO_FORMS[f]) continue;
  for (let i = 0; i < 11; i++) if (S.coRoleKey(f, i) === g) return [f, i]; } return null; }
function run(g, st, f, i) {
  Math.random = prng(77); const R = { n: 0, off: 0, fo: 0, yc: 0, sh: 0, gl: 0, ast: 0, x: 0, nx: 0, en: 0, gf: 0, ga: 0, pts: 0, offT: 0, foT: 0 };
  for (let c = 0; R.n < N; c++) {
    const co = S.coNew({ name: 'Robô', country: 'Brasil', start: 'livre', seed: 5000 + c * 7919 });
    const offs = S.coOffers(co); S.coSign(co, offs[c % offs.length]); co.autoXI = true; S.coStart(co);
    for (let k = 0; k < PER && R.n < N && !co.ss.done; k++) {
      const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); k--; continue; }
      co.form = f; co.style = 'equilibrado'; S.coRoles(co, f)[i] = st;
      const m = S.coMatchStart(co); if (!m) break; if (m.us.form !== f) { S.coMatchEnd(co, m); continue; }
      const id = m.us.xi[i], pl = m.us.squad.find(q => q.id === id); if (!pl) { S.coMatchEnd(co, m); continue; }
      const sim = LP.sim({ me: -1, goals: [], free: true, brain: true, seed: R.n * 13 + 7, home: m.home ? 0 : 1, forms: [simForm(m.us), simForm(m.them)], styles: [S.CO_STY[m.us.style], S.CO_STY[m.them.style]],
        spm: () => 3, speed: () => 1.25,
        onRef: r0 => { S.coMatchRef(co, m, r0.side ? 'them' : 'us', r0.kind, r0); if (r0.side === 0 && r0.num === pl.num) { if (r0.kind === 'impedimento') R.off++; if (r0.kind === 'falta') R.fo++; if (r0.kind === 'amarelo' || r0.kind === 'vermelho') R.yc++; }
          if (r0.side === 0 && r0.kind === 'impedimento') R.offT++; if (r0.side === 0 && r0.kind === 'falta') R.foT++; },
        yc: (side, num) => { const s = side ? m.them : m.us, p = s.squad.find(q => q.num === num && s.xi.includes(q.id)); return p && s.bk && s.bk[p.id] ? 1 : 0; },
        taker: side => { const t = S.coTaker(side ? m.them : m.us, 'pen'); return t ? t.num : null; },
        onShot: sh => { S.coMatchShot(co, m, sh.side ? 'them' : 'us', sh.out, sh); if (sh.side !== 0) return; if (sh.num === pl.num) { R.sh++; if (sh.out === 'gol') R.gl++; } if (sh.out === 'gol' && sh.ast === pl.num) R.ast++; } });
      sim.go(); let key = '';
      while (!m.done) {
        S.coMatchStep(co, m, m.min + 1, { free: true, brain: true });
        const k2 = [m.us, m.them].map(s => s.form + ':' + s.xi.join(',') + ':' + s.style).join('|');
        if (key && k2 !== key) [m.us, m.them].forEach((s, k) => { sim.lineup(k, simForm(s)); sim.style(k, S.coSimSty(s)); }); key = k2;
        sim.minute(m.tk || m.min, m.mom[m.mom.length - 1], m.lam ? [m.lam.us, m.lam.them] : undefined);
        if (!m.done) for (let j = 0; j < 188; j++) { sim._step(0.02); if (j % 47 === 0) { const b = sim._state().ALLX.find(q => q.side === 0 && q.inf && q.inf.id === id); if (b) { R.x += b.x; R.nx++; } } }
        S.coAutoStop(co, m);
      }
      sim.stop();
      const gf = m.home ? m.gh : m.ga, ga = m.home ? m.ga : m.gh; R.gf += gf; R.ga += ga; R.pts += gf > ga ? 3 : gf === ga ? 1 : 0; R.en += pl.en === undefined ? 100 : pl.en; R.n++;
      S.coMatchEnd(co, m);
    }
  }
  return R;
}
const groups = GRP === 'TODOS' ? Object.keys(S.CO_PSTY) : GRP.split(','), alerts = [];
groups.forEach(g => {
  const G = S.CO_PSTY[g], si = slotOf(g); if (!G || !si) { console.log(g + ': sem vaga'); return; }
  console.log(`\n${g} (${si[0]}, vaga ${si[1]}) · ${N} jogos por estilo · por jogo: impedimentos / faltas / cartões / chutes / gols / passes p/ gol · x médio (m, do próprio gol) · energia no fim · gols pró-contra · pontos`);
  const out = {};
  G.l.forEach(st => { const R = run(g, st.k, si[0], si[1]); out[st.k] = R; const q = v => (v / R.n).toFixed(2);
    console.log(`  ${(st.n + (st.k === G.def ? ' *' : '')).padEnd(18)} ${q(R.off)} / ${q(R.fo)} / ${q(R.yc)} / ${q(R.sh)} / ${q(R.gl)} / ${q(R.ast)} · x ${(R.x / Math.max(1, R.nx)).toFixed(1)} · en ${(R.en / R.n).toFixed(0)} · ${q(R.gf)}-${q(R.ga)} · ${q(R.pts)}`); });
  const d = out[G.def], pp = R => R.pts / R.n;
  G.l.forEach(st => { if (st.k !== G.def && pp(out[st.k]) > pp(d) + 0.3) alerts.push(`${g}/${st.n}: ${pp(out[st.k]).toFixed(2)} pontos por jogo contra ${pp(d).toFixed(2)} do padrão (estilo forte demais?)`); });
  if (out.costas) { const a = out.costas.off / N, b = d.off / N; if (a < b * 1.3 + 0.05) alerts.push(`ATA/Nas costas: impedimentos ${a.toFixed(2)} contra ${b.toFixed(2)} do padrão (devia subir)`); }
  if (g === 'ZAG' && out.ant) { if (out.ant.fo < d.fo * 1.2) alerts.push(`ZAG/Antecipa: faltas ${(out.ant.fo / N).toFixed(2)} contra ${(d.fo / N).toFixed(2)} (devia subir)`); }
});
console.log('\n' + (alerts.length ? alerts.map(a => '⚠ ' + a).join('\n') + '\n' : '') + `${alerts.length} alertas`);
