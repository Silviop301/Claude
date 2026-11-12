// Treinador, copa continental (engine/coachcont.js): temporadas do robô em clubes de todas as confederações conferindo a
// Libertadores/Champions. Grupos de 4 com 6 jogos cada (todo time joga 6, 3 em casa), os 2 primeiros no mata-mata, a chave
// fecha com um campeão que estava lá, você joga no máximo um jogo por quarta e nenhum depois de cair, nunca na mesma semana
// da copa nacional, o jogo não mexe na rodada da liga, pênaltis só no empate do mata-mata, prêmio e bilheteria sem NaN, taça
// no Clube, quem entra bate com a cota (temporada passada no clube), e o save no meio termina igual.
// Uso: node tools/craque_continental.js [carreiras] [temporadas]. Esperado: 0 alertas.
const D = require('../craque/src/data.js'); const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 24, T = +process.argv[3] || 4;
const al = {}; const A = (k, m) => { al[k] = al[k] || { n: 0, ex: m }; al[k].n++; };
const isN = v => typeof v === 'number' && Number.isFinite(v);
const st = { legs: 0, t2: 0, seasons: 0, in: 0, games: 0, pens: 0, won: 0, ph: {}, prize: 0, prizeN: 0, gate: 0, n: {}, champTop: 0, champ: 0, byCf: {} };
const LGS = ['bra-a', 'arg', 'esp', 'ing', 'ita', 'mex', 'ara', 'mar', 'jpn', 'col', 'por', 'usa'];
function play(co, stopAt) {
  while (!co.ss.done && !co.sacked) {
    if (stopAt != null && co.ss.i >= stopAt) return 'stop';
    const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; }
    const m = S.coMatchStart(co); let k = 0; while (!m.done && k++ < 5000) { S.coMatchStep(co, m); S.coAutoStop(co, m); }
    const ct = co.ss.cont, cup = co.ss.cup, i0 = co.ss.i, k0 = ct ? ct.k : 0;
    const log = S.coMatchEnd(co, m);
    if (m.cup && m.cup.cont) {
      st.games++;
      if (co.ss.i !== i0) A('round', 'jogo continental andou a rodada da liga');
      if (i0 < (m.cup.leg === 1 ? ct.at1[m.cup.k] : ct.at[m.cup.k])) A('early', 'antes da hora: rodada ' + i0 + ' jogo ' + m.cup.k);
      if (m.cup.k !== k0) A('k', 'jogo errado');
      if (m.cup.leg) st.legs++;
      if (m.cup.leg === 1) { if (log.pens || log.win !== undefined) A('leg1', 'ida decidiu algo'); }
      else if (m.cup.k >= 6 && (log.agg ? log.agg[0] === log.agg[1] : log.gf === log.ga)) { st.pens++; if (!log.pens || log.pens[0] === log.pens[1]) A('pens', 'empate sem vencedor'); if (log.win !== log.pens[0] > log.pens[1]) A('pens-win', 'quem passou não bate'); }
      else if (log.pens) A('pens2', 'pênaltis fora do mata-mata ou sem empate');
      if (log.prize != null && (!isN(log.prize) || log.prize <= 0)) A('prize', log.prize);
      if (log.gate != null && !isN(log.gate)) A('gate', log.gate);
      if (log.prize) { st.prize += log.prize; st.prizeN++; }
      if (log.gate) st.gate += log.gate;
    }
    ['caixa', 'verba'].forEach(x => { if (!isN(co.fin[x])) A('fin-nan-' + x, co.fin[x]); });
  }
  return 'done';
}
const best = lg => D.CLUBS.filter(c => c.league === lg).sort((a, b) => b.strength - a.strength);
for (let n = 0; n < N; n++) {
  const lg = LGS[n % LGS.length], pick = best(lg)[[0, 1, 9, 6][n % 4]] || best(lg)[0];
  const co = S.coNew({ name: 'R', country: 'Brasil', start: 'livre', seed: 77 + n * 191 });
  S.coSign(co, pick.id); co.autoXI = true;
  for (let s = 0; s < T; s++) {
    S.coStart(co); st.seasons++;
    const ct = co.ss.cont, cup = co.ss.cup, q = S.coContQualifies(co);
    if (!!ct !== !!q && S.confOf(co.leagueOf ? (co.leagueOf[co.club] || pick.league) : pick.league)) { if (q && !ct) A('q-miss', 'classificado sem a copa: ' + co.club); if (ct && !q) A('q-extra', 'na copa sem se classificar'); }
    if (ct) {
      st.in++; if (ct.tier === 2) st.t2++; if (ct.tier !== q) A('tier', 'copa errada para a posição'); st.n[ct.n] = (st.n[ct.n] || 0) + 1; st.byCf[ct.cf] = (st.byCf[ct.cf] || 0) + 1;
      if (ct.ids[ct.me] !== co.club) A('me', 'seu clube fora');
      if (new Set(ct.ids).size !== ct.ids.length) A('dup', 'clube repetido');
      if (ct.grp.some(g => g.length !== 4) || ct.grp.length * 4 !== ct.n) A('grp', 'grupo sem 4');
      if (ct.at.some((x, i) => x <= (ct.at[i - 1] || 0) || x >= co.ss.rounds.length)) A('at', JSON.stringify(ct.at) + ' de ' + co.ss.rounds.length);
      const cb = cup ? cup.at.concat((cup.at1 || []).filter(x => x != null)) : [], mine = ct.at.concat((ct.at1 || []).filter(x => x != null));
      if (cup && mine.some(x => cb.includes(x))) st.clash = (st.clash || 0) + 1;
      if (new Set(mine).size !== mine.length) A('self-clash', 'dois jogos continentais na mesma semana');
      (ct.at1 || []).forEach((x, k) => { if (x != null && (x >= ct.at[k] || x <= ct.at[k - 1])) A('at1', 'ida fora do lugar'); });
      if (ct.ids.some(id => S.confOf(co.leagueOf[id] || D.CLUB_BY_ID[id].league) !== ct.cf)) A('cf', 'clube de outra confederação');
    }
    const mid = Math.floor(co.ss.rounds.length / 2);
    if (play(co, mid) === 'stop') {
      const cp = JSON.parse(JSON.stringify(co)); S.applyLeagues(cp);
      play(cp); S.applyLeagues(co); play(co);
      const a = JSON.stringify([co.ss.tab, co.ss.cont, co.ss.cup, co.fin.caixa]), b = JSON.stringify([cp.ss.tab, cp.ss.cont, cp.ss.cup, cp.fin.caixa]);
      if (a !== b) A('save', 'save no meio termina diferente');
    }
    const out = S.coSeasonEnd(co);
    if (ct) {
      ct.grp.forEach((g, gi) => { const t = S.coContTable(co, gi, ct); if (t.some(r => r.j !== 6)) A('g6', 'time sem 6 jogos no grupo'); const pts = t.reduce((a, r) => a + r.pts, 0); if (pts < 24 || pts > 36) A('gpts', pts); });
      for (let q2 = 0; q2 < ct.br.length; q2++) { if (ct.br[q2].length !== ct.n / 4 / 2 ** q2) A('br', 'fase ' + q2 + ' com ' + ct.br[q2].length); if ((ct.res[q2] || []).filter(Boolean).length !== ct.br[q2].length) A('res', 'fase ' + q2 + ' incompleta'); }
      if (!ct.champ || !ct.ids.includes(ct.champ)) A('champ', 'sem campeão');
      if (!out.sacked) {
        const inKo = ct.br[0].some(p => p.includes(ct.me)); let r = 0; while (inKo && r < ct.res.length && ct.res[r].some(o => o && o.w === ct.me)) r++;
        const exp = 6 + (inKo ? Math.min(ct.br.length, r + 1) : 0);
        const L2 = ct.log.filter(l => l.leg !== 1);
        if (L2.length !== exp) A('games', 'jogou ' + L2.length + ', esperado ' + exp);
        if (!out.cont) A('out', 'fim da temporada sem a linha'); else { st.ph[out.cont.ph] = (st.ph[out.cont.ph] || 0) + 1; if (out.cont.won) { st.won++; if (!co.titles.some(t => t.k === 'cont' && t.s === out.season)) A('trophy', 'campeão sem taça'); } }
      }
      if (ct.log.filter(l => l.k >= 6 && l.leg !== 1 && !l.win).length > 1) A('after-out', 'jogou depois de cair');
      st.champ++; if (ct.ids.slice(0, 8).includes(ct.champ)) st.champTop++;
    }
    if (co.sacked) { const offs = out.offers || []; if (!offs.length) break; S.coSign(co, offs[0]); co.sacked = false; }
  }
}
console.log('Temporadas', st.seasons, '· na continental', st.in, '(segunda copa ' + st.t2 + ', semanas com as duas copas ' + (st.clash || 0) + ', jogos de ida e volta ' + st.legs + ')', JSON.stringify(st.byCf), '· tamanhos', JSON.stringify(st.n), '· seus jogos', st.games, '· pênaltis', st.pens, '· títulos', st.won);
console.log('Campanha:', Object.entries(st.ph).sort((a, b) => b[1] - a[1]).map(x => x[0] + ' ' + x[1]).join(' · '));
console.log('Prêmio médio por jogo premiado (mil):', Math.round(st.prize / Math.max(1, st.prizeN) / 1000), '· por campanha (mil):', Math.round(st.prize / Math.max(1, st.in) / 1000), '· bilheteria por campanha (mil):', Math.round(st.gate / Math.max(1, st.in) / 1000));
console.log('Campeão entre os 8 do pote 1:', Math.round(100 * st.champTop / Math.max(1, st.champ)) + '%');
const ks = Object.keys(al); console.log(ks.length ? 'ALERTAS:\n' + ks.map(k => '  ' + k + ' x' + al[k].n + ': ' + al[k].ex).join('\n') : '0 alertas');
