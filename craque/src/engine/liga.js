// Ajudantes de liga do Treinador (vieram do antigo modo Jogador, apagado em 19/11/2026):
// times da liga (S._.fcLib.leagueTeams), placar de jogo entre clubes do computador (S._.fcLib.simple),
// calendário de turno e returno (S._schedule) e continente do clube (S.confOf).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;

  const str = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].strength : 55);
  // Times da liga: os clubes da liga e, se faltar para 20, os mais fortes de baixo
  function leagueTeams(club) {
    const lc = D.CLUBS.filter(x => x.league === club.league && x.id !== club.id).map(x => x.id);
    const LD = D.LADDER[club.league];
    const below = LD && LD.down ? D.CLUBS.filter(x => x.league === LD.down).sort((a, b) => b.strength - a.strength).map(x => x.id) : [];
    if (lc.length + 1 + below.length < 20) {
      const cty = D.countryOf(club), avg = lc.reduce((a, id) => a + str(id), 0) / Math.max(1, lc.length);
      D.CLUBS.filter(x => x.league !== club.league && (!LD || x.league !== LD.down) && D.countryOf(x) === cty)
        .sort((a, b) => Math.abs(a.strength - avg) - Math.abs(b.strength - avg)).forEach(x => below.push(x.id));
    }
    const ids = [club.id].concat(lc);
    while (ids.length < 20 && below.length) ids.push(below.shift());
    // Número ímpar de times: sai o mais fraco (o calendário é de turno e returno, todos jogam toda rodada)
    if (ids.length % 2) { const w = ids.slice(1).sort((a, b) => str(a) - str(b))[0]; ids.splice(ids.indexOf(w), 1); }
    return ids;
  }

  // Gols de um jogo pela força dos dois (mando de 3 pontos); minuto de cada gol
  const LAM_D = +((typeof process !== 'undefined' && process.env && process.env.FC_LAM) || 130); // quanto a diferença de força pesa no placar (maior = mais zebra)
  const lam = (sh, sa, k) => { const d = sh + 2 - sa, L = k || LAM_D; return [clamp(1.3 * Math.exp(d / L), 0.25, 3.6), clamp(1.05 * Math.exp(-d / (L * 0.4)), 0.15, 3.2)]; };
  const minute = r => (r() < 0.07 ? 91 + Math.floor(r() * 5) : 1 + Math.floor(r() * 90));
  function simple(r, h, a, hs, as, k) {
    const [lh, la] = lam(hs, as, k), gh = r.poisson(lh), ga = r.poisson(la);
    const ev = [];
    for (let i = 0; i < gh; i++) ev.push({ m: minute(r), s: 'h' });
    for (let i = 0; i < ga; i++) ev.push({ m: minute(r), s: 'a' });
    ev.sort((x, y) => x.m - y.m);
    return { h, a, gh, ga, ev };
  }

  // Turno e returno com n times (n par): rodadas de pares [mandante, visitante] (índices)
  function schedule(n) {
    const t = [...Array(n).keys()], half = [];
    for (let r = 0; r < n - 1; r++) {
      const rd = [];
      for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; rd.push(r % 2 ? [b, a] : [a, b]); }
      half.push(rd);
      t.splice(1, 0, t.pop());
    }
    return half.concat(half.map(rd => rd.map(([a, b]) => [b, a])));
  }

  // Continente do clube: sul, conc (México/EUA), asia, caf, eur
  S.confOf = lg => { const b = lg.split('-')[0]; return ['bra', 'arg', 'uru', 'col', 'chi', 'par', 'ecu', 'per', 'bol', 'ven'].includes(b) ? 'sul' : ['mex', 'usa'].includes(b) ? 'conc' : ['ara', 'qat', 'jpn', 'kor', 'aus'].includes(b) ? 'asia' : ['mar', 'egi'].includes(b) ? 'caf' : 'eur'; };
  S._schedule = schedule;
  S._.fcLib = { leagueTeams, simple };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
