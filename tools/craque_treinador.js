// Modo Treinador: o robô técnico joga carreiras de 10 temporadas e mostra se títulos, metas e demissões ficam realistas.
// Uso (na raiz): node tools/craque_treinador.js [carreiras] [temporadas]     (padrão 200 carreiras de 10 temporadas)
// FORMA=4-5-1 (com ESTILO=lados) joga sempre essa formação; ROBO=auxiliar segue o plano da auxiliar (S.coTip).
// INICIO=baixo|livre fixa o começo (padrão: metade cada). ROBO=esperto: antes de cada jogo escolhe a formação e o estilo
// que dão mais pontos esperados contra o plano do rival (mede quanto vale acertar a tática; mais lento). O robô deixa o auxiliar escalar, troca os cansados e as
// lesões, gasta a experiência em rodízio e aceita proposta de clube maior no fim da temporada quando a fama deixa.
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 200, T = +process.argv[3] || 10;
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
Math.random = prng(11);
const str = id => D.CLUB_BY_ID[id].strength;
const pois = (l, k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return Math.exp(-l) * Math.pow(l, k) / f; };
const ptsOf = (a, b) => { let w = 0, d = 0; for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) { const p = pois(a, x) * pois(b, y); if (x > y) w += p; else if (x === y) d += p; } return 3 * w + d; };
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '-');
const st = { seasons: 0, sacked: 0, met: 0, won: 0, up: 0, down: 0, games: 0, goals: 0, hw: 0, dr: 0, aw: 0, ult: 0, ultOk: 0, moves: 0, ms: 0,
  fin: { n: 0, red: 0, saldoPos: 0, endRed: 0, minWk: [], saldoPct: [], caixaWk: [] }, byGoal: {}, titlesPer: [], sacksPer: [], fameEnd: [], strEnd: [], stops: 0, subs: 0, nan: 0, byStart: {} };
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
    let seasonRed = false;
    while (!co.ss.done && !co.sacked) {
      const nx = S.coNext(co);
      if (!nx) break;
      if (nx.bye) { S.coSkipRound(co); continue; }
      if (process.env.ROBO === 'esperto') {
        let best = null, bv = -1;
        Object.keys(S.CO_FORMS).forEach(f => S.CO_STYLES.forEach(st => { const pv = S.coPreview(co, f, st), v = ptsOf(pv.xg[0], pv.xg[1]); if (v > bv) { bv = v; best = [f, st]; } }));
        co.form = best[0]; co.style = best[1]; co.xi = S.coAutoXI(co.squad, co.form).xi;
      }
      if (process.env.ROBO === 'auxiliar') { const tp = S.coTip(co, true); if (tp && tp.kind === 'plan') { co.form = tp.f; co.style = tp.s; co.xi = S.coAutoXI(co.squad, co.form).xi; } } // segue o plano da auxiliar
      if (process.env.FORMA && co.form !== process.env.FORMA) { co.form = process.env.FORMA; co.xi = S.coAutoXI(co.squad, co.form).xi; }
      if (process.env.ESTILO) co.style = process.env.ESTILO; // ESTILO=pressao: joga sempre nesse estilo
      // TREINA=1: o robô treina toda semana (roda os treinos que desenvolvem; descansa com o time cansado). Sem isso ele não treina.
      if (process.env.TREINA === '1' || process.env.TREINA === '2') { // 2: nunca descansa (ignora o auxiliar)
        const xi = S.coAutoXI(co.squad, co.form).xi, en = co.squad.filter(p => xi.includes(p.id)).reduce((a, p) => a + p.en, 0) / Math.max(1, xi.length);
        const ks = Object.keys(S.CO_TRAIN).filter(k => S.CO_TRAIN[k].dv !== undefined), tr = st.tr = st.tr || { n: 0, up: 0, dv: 0, xi: [] };
        if (S.coTrain(co, process.env.TREINA !== '2' && (S.coTrainTip ? S.coTrainTip(co) : en < 70) ? 'recup' : ks[(co.ss.i + s * 5) % ks.length])) { tr.n++; tr.up += (co.train.up || []).length; tr.dv += (co.train.dv || []).length; }
      }
      const hadUlt = !!co.board.ult;
      const m = S.coMatchStart(co);
      // Energia: dos 11 que começam (antes do jogo), dos que começaram no apito final, e os mais cansados de cada lado
      const E = st.en = st.en || { pre: 0, end: 0, them: 0, low: 0, inj: 0, n: 0, h: {} }, byE = {}; co.squad.forEach(p => { byE[p.id] = p; });
      const avgE = (sq, ids) => { const v = ids.map(id => sq.find(p => p.id === id)).filter(Boolean); return v.reduce((a, p) => a + p.en, 0) / Math.max(1, v.length); };
      E.pre += avgE(co.squad, m.us.xi); E.n++;
      { const b = Math.floor(avgE(co.squad, m.us.xi) / 10) * 10; E.h[b] = (E.h[b] || 0) + 1; }
      while (!m.done) { const sp = S.coMatchStep(co, m); if (sp && sp.t !== 'fim') st.stops++; S.coAutoStop(co, m); }
      E.end += avgE(co.squad, m.startXI.filter(id => m.us.xi.includes(id))); E.them += avgE(m.them.squad, m.them.xi);
      E.low += m.startXI.filter(id => byE[id] && byE[id].en < 55).length; E.inj += m.ev.filter(e => e.t === 'lesao' && e.s === 'us').length;
      st.subs += 5 - m.us.subs;
      if (co.fin && co.fin.caixa < 0) seasonRed = true;
      S.coMatchEnd(co, m);
      st.games++; st.goals += m.gh + m.ga; st.a1 = (st.a1 || 0) + (m.a1 || 0); st.a2 = (st.a2 || 0) + (m.a2 || 0); st.gst = (st.gst || 0) + m.ev.filter(e => e.t === 'gol' && e.st).length;
      { const bp = st.bp = st.bp || { pg: 0, pm: 0, fg: 0, fm: 0, eg: 0, em: 0, ck: 0 }; m.ev.forEach(e => { if (!e.sp) return; const g = e.t === 'gol'; if (e.sp === 'pen') bp[g ? 'pg' : 'pm']++; else if (e.sp === 'falta') bp[g ? 'fg' : 'fm']++; else bp[g ? 'eg' : 'em']++; }); bp.ck += m.ck ? m.ck.us + m.ck.them : 0; }
      // Faltas, cartões e impedimentos (por time e por jogo; o seu time e o rival juntos)
      const cc = st.cards = st.cards || { fo: 0, yc: 0, rc: 0, of: 0, ycSus: 0, styRc: {} };
      ['fo', 'yc', 'rc', 'of'].forEach(k => { if (m[k]) cc[k] += m[k].us + m[k].them; });
      cc.ycSus += co.squad.filter(p => p.ycSus).length;
      const sk = cc.styRc[co.style] = cc.styRc[co.style] || [0, 0]; sk[0]++; sk[1] += m.rc ? m.rc.us : 0;
      if (m.gh > m.ga) st.hw++; else if (m.gh === m.ga) st.dr++; else st.aw++;
      if (!hadUlt && co.board.ult) st.ult++;
      if (hadUlt && !co.board.ult && !co.sacked) st.ultOk++;
    }
    // Titular no último ano: o robô renova (o jogo não renova mais sozinho); conta quantos ficaram e quantos o teto barrou
    if (!co.sacked && process.env.RENOVA !== '0') { const xi = S.coAutoXI(co.squad, co.form).xi, due = co.squad.filter(p => xi.includes(p.id) && p.ct <= 1 && p.age < 33).length, ok = S.coAutoRenew(co).length; st.ren = st.ren || [0, 0]; st.ren[0] += due; st.ren[1] += ok; }
    { const xi = S.coAutoXI(co.squad, co.form).xi, v = co.squad.filter(p => xi.includes(p.id)).reduce((a, p) => a + p.ovr, 0) / Math.max(1, xi.length), X = st.xiS = st.xiS || []; X[s] = X[s] || [0, 0]; X[s][0] += v - str(co.club); X[s][1]++; }
    const out = S.coSeasonEnd(co);
    st.left = (st.left || 0) + (out.left || []).filter(x => x.tit && x.why === 'fim de contrato').length;
    st.ms += Date.now() - t0;
    st.seasons++;
    st.coins = (st.coins || 0) + (out.coins || []).reduce((a, x) => a + x.n, 0);
    const g = out.goal.k; st.byGoal[g] = st.byGoal[g] || { n: 0, met: 0, sacked: 0, won: 0 }; st.byGoal[g].n++;
    if (out.met) { st.met++; st.byGoal[g].met++; }
    if (out.sacked) { st.sacked++; sacks++; st.byGoal[g].sacked++; }
    if (out.won) { st.won++; titles++; st.byGoal[g].won++; }
    if (out.up) st.up++; if (out.down) st.down++;
    // Finanças: saldo da temporada, caixa em semanas de folha, temporadas que passaram pelo vermelho
    if (out.fin && !out.sacked) { const f = out.fin, fol = Math.max(1, S.coFolha(co)); st.fin.n++; if (f.saldo > 0) st.fin.saldoPos++; if (f.caixa < 0) st.fin.endRed++; if (seasonRed) st.fin.red++; st.fin.saldoPct.push(f.ent ? f.saldo / f.ent : 0); st.fin.caixaWk.push(f.caixa / fol); }
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
console.log(`Jogo: ${(st.goals / st.games).toFixed(2)} gols, mandante ${pct(st.hw, st.games)} · empate ${pct(st.dr, st.games)} · visitante ${pct(st.aw, st.games)}; acréscimos ${(st.a1 / st.games).toFixed(1)} + ${(st.a2 / st.games).toFixed(1)} min, gols nos acréscimos ${(100 * st.gst / Math.max(1, st.goals)).toFixed(0)}%; paradas por jogo ${(st.stops / st.games).toFixed(1)}, trocas ${(st.subs / st.games).toFixed(1)}`);
{ const b = st.bp || {}, g = st.games, f = x => ((x || 0) / g).toFixed(2), cv = (a, b2) => (100 * (a || 0) / Math.max(1, (a || 0) + (b2 || 0))).toFixed(0) + '%'; console.log(`Bola parada por jogo: pênaltis ${f(b.pg + b.pm)} (${cv(b.pg, b.pm)} gol), faltas diretas ${f(b.fg + b.fm)} (${cv(b.fg, b.fm)}), cabeçadas de escanteio ${f(b.eg + b.em)} (${cv(b.eg, b.em)}), escanteios ${f(b.ck)}`); }
console.log(`Temporada: meta cumprida ${pct(st.met, st.seasons)}, demitido ${pct(st.sacked, st.seasons)}, campeão ${pct(st.won, st.seasons)}, subiu ${pct(st.up, st.seasons)}, caiu ${pct(st.down, st.seasons)}`);
console.log(`Ultimato: ${st.ult} (${pct(st.ult, st.seasons)} das temporadas), salvo ${pct(st.ultOk, st.ult)}; trocas de clube por proposta ${(st.moves / N).toFixed(1)} por carreira`);
console.log('Por meta: ' + Object.keys(st.byGoal).map(k => { const g = st.byGoal[k]; return `${k} ${g.n} (cumpriu ${pct(g.met, g.n)}, demitido ${pct(g.sacked, g.n)}, campeão ${pct(g.won, g.n)})`; }).join(' · '));
console.log(`Moedas ganhas no Treinador (sem bônus de 1ª temporada e metas da semana): ${(st.coins / st.seasons).toFixed(1)} por temporada`);
console.log(`Títulos por carreira: média ${avg(st.titlesPer)} [${dist(st.titlesPer)}]; demissões: média ${avg(st.sacksPer)} [${dist(st.sacksPer)}]`);
Object.keys(st.byStart).forEach(k => { const b = st.byStart[k]; console.log(`Começo ${k}: títulos ${(b.t / b.n).toFixed(1)}, demissões ${(b.s / b.n).toFixed(1)}, fama no fim ${(b.f / b.n).toFixed(0)}, força do clube no fim ${(b.str / b.n).toFixed(0)}`); });
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
console.log(`Finanças: saldo positivo ${pct(st.fin.saldoPos, st.fin.n)} das temporadas, passou pelo vermelho ${pct(st.fin.red, st.fin.n)}, fechou no vermelho ${pct(st.fin.endRed, st.fin.n)}; saldo mediano ${(100 * med(st.fin.saldoPct)).toFixed(0)}% da receita; caixa no fim ${med(st.fin.caixaWk).toFixed(0)} semanas de folha (mediana)`);
if (st.cards) { const c = st.cards, g = st.games * 2; console.log('Faltas por time e jogo: ' + (c.fo / g).toFixed(1) + ', amarelos ' + (c.yc / g).toFixed(2) + ', vermelhos ' + (c.rc / g).toFixed(3) + ' (1 a cada ' + Math.round(g / Math.max(1, c.rc)) + ' jogos), impedimentos ' + (c.of / g).toFixed(1) + '; suspensos por 3 amarelos ' + (c.ycSus / st.games).toFixed(2) + ' por jogo; seus vermelhos por estilo: ' + Object.keys(c.styRc).map(k => k + ' ' + (c.styRc[k][1] / c.styRc[k][0]).toFixed(3)).join(', ')); }
if (st.ren) console.log(`Contratos: titulares no último ano ${(st.ren[0] / st.seasons).toFixed(1)} por temporada, o robô renovou ${pct(st.ren[1], st.ren[0])}; titulares que saíram no fim do contrato ${(st.left / st.seasons).toFixed(2)} por temporada`);
else console.log(`Contratos (robô sem renovar): titulares que saíram no fim do contrato ${((st.left || 0) / st.seasons).toFixed(2)} por temporada`);
if (st.xiS) console.log('Geral médio dos 11 menos a força do clube, por temporada: ' + st.xiS.map((x, i) => (i + 1) + 'ª ' + (x[0] / x[1]).toFixed(2)).join(' · '));
if (st.en) { const E = st.en; console.log(`Energia: 11 iniciais antes do jogo ${(E.pre / E.n).toFixed(0)}% [${Object.keys(E.h).sort().map(k => k + ':' + pct(E.h[k], E.n)).join(' ')}], quem ficou os 90 no fim ${(E.end / E.n).toFixed(0)}%, rival no fim ${(E.them / E.n).toFixed(0)}%; titulares abaixo de 55% por jogo ${(E.low / E.n).toFixed(1)}; trocas por jogo ${(st.subs / E.n).toFixed(1)}; lesões suas por jogo ${(E.inj / E.n).toFixed(3)}`); }
if (st.tr) console.log(`Treino (TREINA=1): ${(st.tr.n / st.seasons).toFixed(1)} treinos por temporada, ${(st.tr.dv / st.seasons).toFixed(1)} pontos de atributo e ${(st.tr.up / st.seasons).toFixed(1)} subidas de geral (avisos) por temporada`);
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
