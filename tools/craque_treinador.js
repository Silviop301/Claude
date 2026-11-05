// Modo Treinador: o robô técnico joga carreiras de 10 temporadas e mostra se títulos, metas e demissões ficam realistas.
// Uso (na raiz): node tools/craque_treinador.js [carreiras] [temporadas]     (padrão 200 carreiras de 10 temporadas)
// INICIO=baixo|livre fixa o começo (padrão: metade cada). O robô deixa o auxiliar escalar, troca os cansados e as
// lesões, gasta a experiência em rodízio e aceita proposta de clube maior no fim da temporada quando a fama deixa.
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 200, T = +process.argv[3] || 10;
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
Math.random = prng(11);
const str = id => D.CLUB_BY_ID[id].strength;
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '-');
const st = { seasons: 0, sacked: 0, met: 0, won: 0, up: 0, down: 0, games: 0, goals: 0, hw: 0, dr: 0, aw: 0, ult: 0, ultOk: 0, moves: 0, ms: 0,
  byGoal: {}, titlesPer: [], sacksPer: [], fameEnd: [], strEnd: [], stops: 0, subs: 0, nan: 0, byStart: {} };
for (let n = 0; n < N; n++) {
  const start = process.env.INICIO || (n % 2 ? 'livre' : 'baixo');
  const co = S.coNew({ name: 'Robô', country: n % 3 ? 'Brasil' : (n % 3 === 1 ? 'Inglaterra' : 'Espanha'), start, seed: 1000 + n * 7919 });
  // O robô fica com o clube mais forte entre os que não começam brigando para não cair (se houver)
  const pick = offs => { const ok = offs.filter(id => S.coGoalFor(co, id).k !== 'naocair'); return (ok.length ? ok : offs).slice().sort((a, b) => str(b) - str(a))[0]; };
  S.coSign(co, pick(S.coOffers(co)));
  co.autoXI = true;
  let titles = 0, sacks = 0;
  for (let s = 0; s < T; s++) {
    const t0 = Date.now();
    S.coStart(co);
    while (!co.ss.done && !co.sacked) {
      const nx = S.coNext(co);
      if (!nx) break;
      if (nx.bye) { S.coSkipRound(co); continue; }
      const hadUlt = !!co.board.ult;
      const m = S.coMatchStart(co);
      while (!m.done) { const sp = S.coMatchStep(co, m); if (sp && sp.t !== 'fim') st.stops++; S.coAutoStop(co, m); }
      st.subs += 5 - m.us.subs;
      S.coMatchEnd(co, m);
      st.games++; st.goals += m.gh + m.ga;
      if (m.gh > m.ga) st.hw++; else if (m.gh === m.ga) st.dr++; else st.aw++;
      if (!hadUlt && co.board.ult) st.ult++;
      if (hadUlt && !co.board.ult && !co.sacked) st.ultOk++;
    }
    const out = S.coSeasonEnd(co);
    st.ms += Date.now() - t0;
    st.seasons++;
    const g = out.goal.k; st.byGoal[g] = st.byGoal[g] || { n: 0, met: 0, sacked: 0, won: 0 }; st.byGoal[g].n++;
    if (out.met) { st.met++; st.byGoal[g].met++; }
    if (out.sacked) { st.sacked++; sacks++; st.byGoal[g].sacked++; }
    if (out.won) { st.won++; titles++; st.byGoal[g].won++; }
    if (out.up) st.up++; if (out.down) st.down++;
    while (co.xp.pts > 0) { const k = ['leitura', 'motiv', 'negoc'][co.xp.pts % 3]; if (!S.coSkill(co, k)) break; }
    if (!Number.isFinite(co.fame) || co.squad.some(p => !Number.isFinite(p.ovr))) st.nan++;
    if (out.offers) S.coSign(co, pick(out.offers));
    else { const offs = S.coOffers(co, 3), best = pick(offs); if (best && str(best) >= str(co.club) + 3 && S.coGoalFor(co, best).k !== 'naocair') { S.coSign(co, best); st.moves++; } }
  }
  st.titlesPer.push(titles); st.sacksPer.push(sacks); st.fameEnd.push(co.fame); st.strEnd.push(str(co.club));
  const b = st.byStart[start] = st.byStart[start] || { n: 0, t: 0, s: 0, f: 0, str: 0 };
  b.n++; b.t += titles; b.s += sacks; b.f += co.fame; b.str += str(co.club);
}
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const dist = a => { const h = {}; a.forEach(x => { const k = x >= 4 ? '4+' : x; h[k] = (h[k] || 0) + 1; }); return Object.keys(h).sort().map(k => k + ':' + pct(h[k], a.length)).join(' '); };
console.log(`Treinador: ${N} carreiras x ${T} temporadas (${st.seasons} temporadas, ${st.games} jogos)`);
console.log(`Jogo: ${(st.goals / st.games).toFixed(2)} gols, mandante ${pct(st.hw, st.games)} · empate ${pct(st.dr, st.games)} · visitante ${pct(st.aw, st.games)}; paradas por jogo ${(st.stops / st.games).toFixed(1)}, trocas ${(st.subs / st.games).toFixed(1)}`);
console.log(`Temporada: meta cumprida ${pct(st.met, st.seasons)}, demitido ${pct(st.sacked, st.seasons)}, campeão ${pct(st.won, st.seasons)}, subiu ${pct(st.up, st.seasons)}, caiu ${pct(st.down, st.seasons)}`);
console.log(`Ultimato: ${st.ult} (${pct(st.ult, st.seasons)} das temporadas), salvo ${pct(st.ultOk, st.ult)}; trocas de clube por proposta ${(st.moves / N).toFixed(1)} por carreira`);
console.log('Por meta: ' + Object.keys(st.byGoal).map(k => { const g = st.byGoal[k]; return `${k} ${g.n} (cumpriu ${pct(g.met, g.n)}, demitido ${pct(g.sacked, g.n)}, campeão ${pct(g.won, g.n)})`; }).join(' · '));
console.log(`Títulos por carreira: média ${avg(st.titlesPer)} [${dist(st.titlesPer)}]; demissões: média ${avg(st.sacksPer)} [${dist(st.sacksPer)}]`);
Object.keys(st.byStart).forEach(k => { const b = st.byStart[k]; console.log(`Começo ${k}: títulos ${(b.t / b.n).toFixed(1)}, demissões ${(b.s / b.n).toFixed(1)}, fama no fim ${(b.f / b.n).toFixed(0)}, força do clube no fim ${(b.str / b.n).toFixed(0)}`); });
console.log(`Tempo do motor: ${(st.ms / st.seasons).toFixed(0)} ms por temporada` + (st.nan ? `; ALERTA: ${st.nan} números quebrados` : ''));
// Save: a mesma carreira, uma passando por JSON no meio de cada temporada, tem de terminar igual
{
  const play = rt => {
    let co = S.coNew({ start: 'baixo', seed: 4242 }); co.autoXI = true;
    S.coSign(co, S.coOffers(co)[0]);
    for (let s = 0; s < 4; s++) {
      S.coStart(co);
      while (!co.ss.done && !co.sacked) {
        const nx = S.coNext(co); if (nx.bye) { S.coSkipRound(co); continue; }
        if (rt && co.ss.i === 10) co = JSON.parse(JSON.stringify(co));
        const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m);
      }
      const o = S.coSeasonEnd(co); if (o.offers) S.coSign(co, o.offers[0]);
    }
    if (!rt) live = co;
    return JSON.stringify(co);
  };
  let live;
  const a = play(false), b = play(true);
  console.log(a === b ? 'Save no meio da temporada: termina igual' : 'FALHA: o save no meio muda a carreira');
  const bad = []; const walk = (o, k) => { if (typeof o === 'number' && !Number.isFinite(o)) bad.push(k); else if (o && typeof o === 'object') Object.keys(o).forEach(x => walk(o[x], k + '.' + x)); };
  walk(live, 'co'); walk(st, 'st');
  if (bad.length) console.log('ALERTA: número quebrado em ' + bad.slice(0, 5).join(', '));
}
