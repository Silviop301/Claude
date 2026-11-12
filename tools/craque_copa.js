// Treinador, copa nacional (engine/coachcup.js): temporadas do robô conferindo a copa. A chave fecha (cada fase com a metade
// da anterior, um campeão que estava na chave), você joga no máximo um jogo por fase e nenhum depois de cair, o jogo da copa
// não mexe na tabela da liga (todo time termina com o número certo de jogos), os jogos da copa caem no meio da semana certo,
// pênaltis só no empate e com vencedor, prêmio e bilheteria sem NaN, taça da copa no Clube, demitido não joga mais a copa, e o
// save gravado no meio da temporada termina igual. Mostra quanto cada fase rende, campeões por força e jogos por temporada.
// Uso: node tools/craque_copa.js [carreiras] [temporadas]. Esperado: 0 alertas.
const D = require('../craque/src/data.js'); const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 30, T = +process.argv[3] || 5;
const al = {}; const A = (k, m) => { al[k] = al[k] || { n: 0, ex: m }; al[k].n++; };
const isN = v => typeof v === 'number' && Number.isFinite(v);
const st = { seasons: 0, cups: 0, games: 0, pens: 0, won: 0, best: {}, prize: [], champTop8: 0, champ: 0, zebra: 0 };
function play(co, stopAt) {
  while (!co.ss.done && !co.sacked) {
    if (stopAt != null && co.ss.i >= stopAt) return 'stop';
    const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; }
    const m = S.coMatchStart(co); let k = 0; while (!m.done && k++ < 5000) { S.coMatchStep(co, m); S.coAutoStop(co, m); }
    const cup = co.ss.cup, i0 = co.ss.i, k0 = cup ? cup.k : 0;
    const log = S.coMatchEnd(co, m);
    if (m.cup) {
      st.games++;
      if (co.ss.i !== i0) A('cup-round', 'jogo da copa andou a rodada da liga');
      if (i0 < cup.at[m.cup.k]) A('cup-early', 'copa antes da hora: rodada ' + i0 + ' fase ' + m.cup.k);
      if (m.cup.k !== k0) A('cup-k', 'fase errada');
      if (log.gf === log.ga) { st.pens++; if (!log.pens || log.pens[0] === log.pens[1]) A('pens', 'empate sem vencedor nos pênaltis'); if (log.win !== log.pens[0] > log.pens[1]) A('pens-win', 'quem passou não bate com os pênaltis'); }
      else if (log.pens) A('pens2', 'pênaltis sem empate');
      if (log.prize != null && (!isN(log.prize) || log.prize <= 0)) A('prize', log.prize);
      if (log.gate != null && !isN(log.gate)) A('gate', log.gate);
      if (log.prize) (st.prize[m.cup.k] = st.prize[m.cup.k] || []).push(log.prize);
      if (log.zebra) st.zebra++;
    }
    ['caixa', 'verba'].forEach(x => { if (!isN(co.fin[x])) A('fin-nan-' + x, co.fin[x]); });
  }
  return 'done';
}
for (let n = 0; n < N; n++) {
  const co = S.coNew({ name: 'R', country: n % 3 ? 'Brasil' : 'Inglaterra', start: n % 2 ? 'livre' : 'baixo', seed: 91 + n * 173 });
  S.coSign(co, S.coOffers(co)[0]); co.autoXI = true;
  for (let s = 0; s < T; s++) {
    S.coStart(co); st.seasons++;
    const cup = co.ss.cup;
    if (cup) {
      st.cups++;
      if (!cup.ids.includes(co.club)) A('not-in', 'seu clube fora da chave');
      if (new Set(cup.ids).size !== cup.ids.length) A('dup', 'clube repetido na chave');
      if (cup.at.some((x, i) => x <= (cup.at[i - 1] || 0) || x >= co.ss.rounds.length)) A('at', JSON.stringify(cup.at) + ' de ' + co.ss.rounds.length);
    }
    // Save no meio: a metade da temporada, grava, segue nas duas cópias e compara
    const mid = Math.floor(co.ss.rounds.length / 2);
    if (play(co, mid) === 'stop') {
      const cp = JSON.parse(JSON.stringify(co)); S.applyLeagues(cp);
      play(cp); S.applyLeagues(co); play(co);
      const a = JSON.stringify([co.ss.tab, co.ss.cup, co.fin.caixa]), b = JSON.stringify([cp.ss.tab, cp.ss.cup, cp.fin.caixa]);
      if (a !== b) A('save', 'save no meio da temporada termina diferente');
    }
    const ttl0 = co.titles.length, games0 = cup ? cup.log.length : 0;
    const out = S.coSeasonEnd(co);
    if (cup) {
      for (let k = 0; k < cup.br.length; k++) { if (cup.br[k].length !== cup.n / 2 ** (k + 1)) A('br', 'fase ' + k + ' com ' + cup.br[k].length); if ((cup.res[k] || []).filter(Boolean).length !== cup.br[k].length) A('res', 'fase ' + k + ' sem todos os jogos'); }
      if (!cup.champ || !cup.ids.includes(cup.champ)) A('champ', 'sem campeão');
      const me = cup.ids.indexOf(out.club); let reached = 0; while (reached < cup.res.length && cup.res[reached].some(o => o && o.w === me)) reached++;
      if (!out.sacked && cup.log.length !== Math.min(cup.br.length, reached + 1)) A('games', 'jogou ' + cup.log.length + ' e chegou à fase ' + reached);
      if (cup.log.some((l, i) => i < cup.log.length - 1 && !l.win)) A('after-out', 'jogou depois de cair');
      if (!out.cup) A('out-cup', 'fim da temporada sem a linha da copa');
      else { st.best[out.cup.ph] = (st.best[out.cup.ph] || 0) + 1; if (out.cup.won) { st.won++; if (!co.titles.some(t => t.k === 'cup' && t.s === out.season)) A('trophy', 'campeão sem taça'); } }
      if (co.titles.filter(t => t.k === 'cup' && t.s === out.season).length > 1) A('trophy2', 'duas taças da copa');
      st.champ++; const top = S.cupField(D.CLUB_BY_ID[cup.ids[0]]).slice(0, 8); if (top.includes(cup.champ)) st.champTop8++;
      // tabela da liga intacta
      const R = (out.log || []).length; if (out.log && out.log.some(l => l.cup)) A('log', 'jogo da copa no log da liga');
    }
    if (co.sacked) { const offs = out.offers || []; if (!offs.length) break; S.coSign(co, offs[0]); co.sacked = false; }
  }
}
const avg = a => a && a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length / 1000) : 0;
console.log('Temporadas', st.seasons, '· com copa', st.cups, '· seus jogos de copa', st.games, '(' + (st.games / Math.max(1, st.cups)).toFixed(1) + ' por temporada) · pênaltis', st.pens, '· títulos', st.won, '· zebras', st.zebra);
console.log('Campanha:', Object.entries(st.best).sort((a, b) => b[1] - a[1]).map(x => x[0] + ' ' + x[1]).join(' · '));
console.log('Prêmio médio por fase passada (mil):', st.prize.map(avg).join(' / '));
console.log('Campeão entre os 8 mais fortes do país:', Math.round(100 * st.champTop8 / Math.max(1, st.champ)) + '%');
const ks = Object.keys(al); console.log(ks.length ? 'ALERTAS:\n' + ks.map(k => '  ' + k + ' x' + al[k].n + ': ' + al[k].ex).join('\n') : '0 alertas');
