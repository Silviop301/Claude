// Simula milhares de carreiras do CRAQUE com um "jogador robô" para checar ritmo e variedade.
// Uso: node tools/craque_sim.js [n]
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 2000;
const res = [];
for (let n = 0; n < N; n++) {
  const pos = n % 2 ? 'ATA' : 'MEI';
  const c = S.newCareer({ name: 'Robô', pos, foot: 'D', country: 'Brasil' }, 1000 + n);
  let decisions = 0;
  S.join(c, S.offers(c, true)[0]); decisions++;
  while (!c.retired) {
    const ch = S.traitChoices(c);
    if (ch.length) { const pick = ch.find(x => x.completes) || ch[0]; S.addTrait(c, pick.trait.id); decisions++; }
    if (Math.random() < 0.85) { const ev = S.pickEvent(c); S.resolveEvent(c, ev, Math.random() < 0.5 ? 0 : 1); decisions++; }
    S.playSeason(c);
    if (S.mustRetire(c) || (S.canRetire(c) && S.ovr(c) < 70 && Math.random() < 0.5)) break;
    const offers = S.offers(c, false);
    decisions++;
    const opts = offers.concat([S.stayOffer(c)]);
    // Metade dos robôs é fiel: fica se ainda for titular
    const stay = S.stayOffer(c);
    if (n % 4 < 2 && stay.share >= 0.78 && Math.random() < 0.8) { S.join(c, stay); continue; }
    // Robô ambicioso: prefere o maior clube onde ainda seja pelo menos rodízio
    const good = opts.filter(o => o.share >= 0.55).sort((a, b) => D.CLUB_BY_ID[b.club].strength - D.CLUB_BY_ID[a.club].strength);
    if (!offers.length && S.ovr(c) < 50) break;
    S.join(c, good[0] || opts[opts.length - 1]);
  }
  const f = S.finish(c);
  res.push({ seasons: c.season, decisions, goals: c.totals.goals, assists: c.totals.assists, titles: f.titles, ballon: c.totals.ballon, peak: c.peak, grade: f.grade, verdict: f.verdict, pos, clubs: f.nClubs, games: c.totals.games });
}
const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
const pr = (label, key, filter) => {
  const a = res.filter(filter || (() => true)).map(r => r[key]);
  console.log(label.padEnd(26), 'p10', String(q(a, .1)).padStart(5), ' mediana', String(q(a, .5)).padStart(5), ' p90', String(q(a, .9)).padStart(5), ' max', Math.max(...a));
};
pr('Temporadas', 'seasons'); pr('Decisões', 'decisions');
pr('Gols (ATA)', 'goals', r => r.pos === 'ATA'); pr('Assistências (MEI)', 'assists', r => r.pos === 'MEI');
pr('Jogos', 'games'); pr('Títulos', 'titles'); pr('Pico OVR', 'peak'); pr('Clubes', 'clubs');
const ballon = res.filter(r => r.ballon > 0).length / N;
console.log('Carreiras com Bola de Ouro:', (ballon * 100).toFixed(1) + '%', '| com 3+:', (res.filter(r => r.ballon >= 3).length / N * 100).toFixed(1) + '%');
const grades = {}; res.forEach(r => { grades[r.grade] = (grades[r.grade] || 0) + 1; });
console.log('Notas finais:', Object.entries(grades).sort().map(([g, n]) => g + ' ' + (n / N * 100).toFixed(0) + '%').join(' · '));
const ver = {}; res.forEach(r => { const v = r.verdict.startsWith('Ídolo') ? 'Ídolo eterno do X' : r.verdict; ver[v] = (ver[v] || 0) + 1; });
console.log('Vereditos:', Object.entries(ver).sort((a, b) => b[1] - a[1]).map(([v, n]) => v + ' ' + (n / N * 100).toFixed(0) + '%').join(' · '));
const secs = q(res.map(r => r.decisions * 6 + r.seasons * 5), .5);
console.log('Duração estimada (6 s por decisão + 5 s de resumo por temporada):', Math.floor(secs / 60) + 'min' + (secs % 60) + 's');
