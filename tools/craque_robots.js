// Gera os robôs do ranking (craque/api/robots.json): carreiras jogadas de verdade pelo simulador,
// com a mesma pontuação de qualquer jogador. Aparecem no ranking com o selo 🤖 (nunca como gente de verdade).
// Escolhe 1 nota S, 3 A, 4 B, 4 C e 3 D, de várias posições e países.
// Uso: node tools/craque_robots.js
const fs = require('fs'), path = require('path');
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');

const NAMES = ['Rafinha', 'Juninho', 'Kauã', 'Biel', 'Dudu', 'Matheus', 'Caio', 'Vitinho', 'Pedrão', 'Léo', 'Gabriel', 'Nando', 'Wesley', 'Davi', 'Tiago'];
const WANT = { S: 1, A: 3, B: 4, C: 4, D: 3 };
const POSS = ['ATA', 'MEI', 'ZAG', 'GOL'];
const COUNTRIES = ['Brasil', 'Brasil', 'Brasil', 'Argentina', 'Portugal', 'Uruguai', 'Colômbia'].filter(id => D.COUNTRIES.some(c => c.id === id));

// Robô: "bom" escolhe como o robô esperto do simulador; "ruim" escolhe ao acaso e às vezes o pior
function play(seed, pos, country, name, good) {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const c = S.newCareer({ name, pos, foot: rnd() < 0.8 ? 'D' : 'E', country }, seed);
  const base = S.offers(c, true);
  S.join(c, good ? base.slice().sort((a, b) => b.share - a.share)[0] : base[Math.floor(rnd() * base.length)]);
  while (!c.retired) {
    const ch = S.traitChoices(c);
    if (ch.length) { const p = good ? (ch.find(t => t.completes) || ch.find(t => t.type === 'up') || ch[0]) : ch[Math.floor(rnd() * ch.length)]; if (p.type === 'up') S.upgradeTrait(c, p.trait.id); else S.addTrait(c, p.trait.id); }
    for (let k = 0; k < 20; k++) {
      const opts = D.INVEST.filter(t => S.canInvest(c, t.id));
      if (!opts.length || (!good && rnd() < 0.5)) break;
      const w = D.POS[c.pos].w, score = t => (t.attr ? w[Object.keys(t.attr)[0]] : 0.15) / (1 + (c.inv[t.id] || 0));
      S.invest(c, good ? opts.sort((a, b) => score(b) - score(a))[0].id : opts[Math.floor(rnd() * opts.length)].id);
    }
    const ev = S.pickEvent(c);
    if (ev) {
      let i = Math.floor(rnd() * ev.options.length);
      if (good && ev.options.every(o => o.ev !== undefined) && !ev.dest) i = ev.options.map((o, k) => [o.ev, k]).sort((a, b) => b[0] - a[0])[0][1];
      if (ev.options[i] && ev.options[i].locked) i = 0;
      S.resolveEvent(c, ev, i);
    }
    if (S.pickMoment(c)) S.autoMoment(c);
    c.train = good ? (c.age <= 28 ? 'forte' : c.age >= 32 ? 'leve' : 'normal') : D.TRAIN[Math.floor(rnd() * D.TRAIN.length)].id;
    S.playSeason(c);
    for (const kind of ['wc', 'cwc']) {
      const yes = kind === 'wc' ? S.isWcYear(c) && S.wcCall(c).called : S.isCwcYear(c) && S.cwcCall(c).called;
      if (!yes) continue;
      kind === 'wc' ? S.wcStart(c) : S.cwcStart(c);
      let g; while ((g = S.wcNext(c))) { if (g.live) S.wcMomentAuto(c); if (g.pens) S.wcPensAuto(c); }
    }
    if (S.mustRetire(c)) break;
    if (S.canAnnounce(c) && S.ovr(c) < 74 && rnd() < 0.5) S.announce(c);
    if (!S.windowOpen(c)) continue;
    const offers = S.offers(c, false), stay = S.stayOffer(c), all = offers.concat([stay]);
    if (!offers.length && S.ovr(c) < 50) break;
    if (good) { const ok = all.filter(o => o.share >= 0.78).sort((a, b) => D.CLUB_BY_ID[b.club].strength - D.CLUB_BY_ID[a.club].strength); S.join(c, ok[0] || all.sort((a, b) => b.share - a.share)[0]); }
    else S.join(c, all[Math.floor(rnd() * all.length)]);
  }
  const f = S.finish(c), T = c.totals;
  return {
    name, pos, country, club: (D.CLUB_BY_ID[f.mainClub] || {}).name || '', grade: f.grade, score: f.score, peak: c.peak,
    goals: T.goals, assists: T.assists, best_goals: Math.max(0, ...c.seasons.map(s => s.goals || 0)), titles: S.titleCount(T), ballon: T.ballon, seasons: c.seasons.length,
  };
}

const got = { S: [], A: [], B: [], C: [], D: [] };
let n = 0, k = 0;
while (Object.keys(WANT).some(g => got[g].length < WANT[g]) && n < 4000) {
  const pos = POSS[k % POSS.length], name = NAMES[k % NAMES.length], country = COUNTRIES[n % COUNTRIES.length];
  const r = play(5000 + n * 31, pos, country, name, n % 3 !== 0);
  n++;
  // S só um, e não um absurdo: abaixo de 2400 pontos
  if (got[r.grade].length >= WANT[r.grade] || (r.grade === 'S' && r.score > 2400)) continue;
  // Nomes e posições variados
  if (Object.values(got).flat().some(x => x.name === r.name)) continue;
  got[r.grade].push(r); k++;
}
const list = Object.values(got).flat().sort((a, b) => b.score - a.score)
  .map((r, i) => Object.assign({ id: 'cpu' + String(i + 1).padStart(2, '0'), nick: 'Robô ' + r.name }, r));
fs.writeFileSync(path.join(__dirname, '../craque/api/robots.json'), JSON.stringify({ v: 1, robots: list }, null, 1) + '\n');
list.forEach(r => console.log(r.grade, String(r.score).padStart(5), r.nick.padEnd(14), r.pos, r.country.padEnd(10), r.club, '·', r.goals, 'gols ·', r.titles, 'títulos ·', r.ballon, 'BO'));
console.log(n, 'carreiras jogadas');
