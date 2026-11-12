// Treinador: temporadas inteiras sem tela conferindo o estado a cada rodada (travou, placar estranho, NaN no dinheiro, verba
// negativa, salário/contrato/energia/moral fora da faixa, id repetido, elenco acima de 28 ou sem 11, menos de 2 goleiros, título
// sem taça e taça sem título, 1º colocado sem título, demitido sem proposta) e resume elenco, caixa, titulares que saem e moedas.
// Uso: node tools/craque_temporadas.js [carreiras] [temporadas]; RENOVA=0 = técnico que nunca renova; SEED=n. Esperado: 0 alertas.
const D = require('../craque/src/data.js'); const S = require('../craque/src/sim.js');
const prng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
Math.random = prng(+process.env.SEED || 5);
const N = +process.argv[2] || 40, T = +process.argv[3] || 10, REN = process.env.RENOVA !== '0';
const al = {}; const A = (k, m) => { al[k] = al[k] || { n: 0, ex: m }; al[k].n++; };
const isN = v => typeof v === 'number' && Number.isFinite(v);
const st = { sq: [], wage: [], coins: {}, gpm: [], caixaEnd: [], tetoOver: 0, seasons: 0, titles: 0, troph: 0, short: 0, left: 0, ovrXI: [] };
for (let n = 0; n < N; n++) {
  const co = S.coNew({ name: 'R', country: 'Brasil', start: n % 2 ? 'livre' : 'baixo', seed: 77 + n * 131 });
  S.coSign(co, S.coOffers(co)[0]); co.autoXI = true;
  for (let s = 0; s < T; s++) {
    S.coStart(co); let g = 0, gm = 0;
    while (!co.ss.done && !co.sacked) {
      const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; }
      const m = S.coMatchStart(co); let k = 0; while (!m.done && k++ < 5000) { S.coMatchStep(co, m); S.coAutoStop(co, m); }
      if (!m.done) A('stuck', 'jogo não termina'); S.coMatchEnd(co, m); g += m.gh + m.ga; gm++;
      if (!isN(m.gh) || !isN(m.ga) || m.gh > 12 || m.ga > 12) A('score', m.gh + 'x' + m.ga + ' ' + co.club + ' vs ' + (m.opp||m.them&&m.them.id) + ' casa ' + m.home);
      const f = co.fin; ['caixa', 'verba', 'teto'].forEach(x => { if (!isN(f[x])) A('fin-nan-' + x, f[x]); });
      if (f.verba < 0) A('verba<0', f.verba);
      const ids = co.squad.map(p => p.id); if (new Set(ids).size !== ids.length) A('dup-id', ids.length);
      co.squad.forEach(p => { if (!isN(p.ovr) || p.ovr < 20 || p.ovr > 99) A('ovr', p.ovr); if (!isN(p.wage) || p.wage < 0) A('wage', p.wage); if (!isN(p.ct) || p.ct < 0) A('ct', p.ct); if (!isN(p.en) || p.en < 0 || p.en > 100) A('en', p.en); if (!isN(p.mo) || p.mo < 0 || p.mo > 100) A('mo', p.mo); });
      if (co.squad.length > 28) A('squad>28', co.squad.length);
      const xi = S.coAutoXI(co.squad, co.form).xi; if (xi.length < 11) A('xi<11', xi.length);
    }
    if (REN && !co.sacked) S.coAutoRenew(co);
    const wsum = co.squad.reduce((a, p) => a + (p.wage || 0), 0); if (co.fin && wsum > co.fin.teto * 1.001) st.tetoOver++;
    const sq0 = co.squad.length, ttl0 = co.titles.filter(t => t.k !== 'cup').length;
    const out = S.coSeasonEnd(co); st.seasons++;
    if (gm) st.gpm.push(g / gm);
    const cv = (out.coins || []).reduce((a, x) => a + x.n, 0); if (!isN(cv) || cv < 0 || cv > 120) A('moedas', cv); st.coins[cv] = (st.coins[cv] || 0) + 1;
    if (out.won) { st.titles++; if (co.titles.filter(t => t.k !== 'cup').length !== ttl0 + 1) A('trophy', 'título sem taça'); if (out.pos !== 1) A('won-pos', out.pos); }
    if (!out.won && co.titles.filter(t => t.k !== 'cup').length !== ttl0) A('trophy2', 'taça sem título');
    if (out.pos === 1 && !out.sacked && !out.won) A('pos1-nowin', out.league);
    if (out.met && out.sacked) A('met+sacked', '');
    st.left += (out.left || []).filter(x => x.tit).length;
    if (co.sacked) { const offs = out.offers || []; if (!offs.length) A('sem-proposta', 'demitido sem oferta'); S.coSign(co, offs[0]); co.sacked = false; }
    else if (out.offers && out.offers.length) {}
    st.sq.push(co.squad.length); st.caixaEnd.push(co.fin ? co.fin.caixa : 0);
    const xi = S.coAutoXI(co.squad, co.form).xi, avg = co.squad.filter(p => xi.includes(p.id)).reduce((a, p) => a + p.ovr, 0) / 11;
    st.ovrXI.push(avg - D.CLUB_BY_ID[co.club].strength);
    const counts = {}; co.squad.forEach(p => counts[p.pos] = (counts[p.pos] || 0) + 1); if ((counts.GOL || 0) < 2) A('gol<2', counts.GOL);
    if (co.squad.length < 20) st.short++;
  }
}
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; };
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log('renova', REN, 'temporadas', st.seasons, 'gols/jogo', avg(st.gpm), 'títulos', st.titles);
console.log('elenco fim: min', Math.min(...st.sq), 'mediana', q(st.sq, .5), 'max', Math.max(...st.sq), 'abaixo de 20:', st.short);
console.log('XI - força por temporada (média):', avg(st.ovrXI), ' caixa fim p10/p50/p90', q(st.caixaEnd, .1), q(st.caixaEnd, .5), q(st.caixaEnd, .9), ' folha acima do teto depois da renovação do robô', st.tetoOver);
console.log('titulares que saíram por temporada', (st.left / st.seasons).toFixed(2), ' moedas por temporada (valor: vezes)', JSON.stringify(st.coins));
const na = Object.values(al).reduce((a, x) => a + x.n, 0);
Object.keys(al).forEach(k => console.log('  ALERTA ' + k + ' x' + al[k].n + ' (' + al[k].ex + ')'));
console.log(na + ' alertas');
