// Quanto vale decidir bem nos eventos (engine/stakes.js): o mesmo jogador, com a mesma gestão, escolhendo de três jeitos.
// Uso: node tools/craque_decisoes.js [carreiras] [best,random,worst]   ·   K=1.5 LK=1.5 testa ganhos/perdas mais fortes
const D = require('../craque/src/data.js'), S = require('../craque/src/sim.js');
if (process.env.K) S.STAKE_K = +process.env.K;
if (process.env.LK) S.STAKE_LOSS = +process.env.LK;
// Eventos ainda no formato antigo: o robô lê a dica como um jogador leria (valor aproximado)
const W = { attr: 15, form: 2.3, min: 1, coach: 1.2, fans: 0.6, fame: 0.06, injPct: 0.8 };
const num = s => +String(s).replace('−', '-').replace('+', '');
function effVal(t) {
  let v = 0; t = t.replace(/−/g, '-');
  t.replace(/(Técnico|Torcida|Fama)( atual| nova)? ([+-]\d+)/g, (_, k, __, n) => { v += num(n) * (k === 'Técnico' ? W.coach : k === 'Torcida' ? W.fans : W.fame); });
  t.replace(/forma ([+-]\d+)%/g, (_, n) => { v += num(n) * W.form; });
  t.replace(/([+-]\d+)% de minutos/g, (_, n) => { v += num(n) * W.min; });
  t.replace(/([+-]\d+) (RIT|FIN|PAS|DRI|DEF|FÍS|REF|ELA|MAN|POS|REP|VEL)\b/g, (_, n) => { v += num(n) * W.attr / 2; });
  t.replace(/(perde|fora) (\d+)% da temporada/g, (_, __, n) => { v -= num(n) * W.injPct; });
  return v;
}
function hintEV(h) {
  if (!h) return 0;
  let ev = 0, pSum = 0;
  for (const s of h.split(/\s·\s/)) {
    const m = s.match(/^(\d+)%:\s*(.*)$/);
    if (m) { const p = num(m[1]) / 100; pSum += p; ev += p * effVal(m[2]); continue; }
    const sen = s.match(/^sen[aã]o,?\s*(.*)$/i);
    if (sen) { ev += Math.max(0, 1 - pSum) * effVal(sen[1]); pSum = 1; continue; }
    ev += effVal(s);
  }
  return ev;
}
const N = +process.argv[2] || 1000, MODES = (process.argv[3] || 'best,random,worst').split(',');
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const out = {};
for (const mode of MODES) {
  const res = [];
  for (let n = 0; n < N; n++) {
    const c = S.newCareer({ name: 'R', pos: ['ATA', 'MEI', 'ZAG', 'GOL'][n % 4], foot: 'D', country: 'Brasil' }, 3000 + n);
    const base = S.offers(c, true); S.join(c, base.slice().sort((a, b) => b.share - a.share)[0]);
    while (!c.retired) {
      const ch = S.traitChoices(c); if (ch.length) { const p = ch.find(x => x.completes) || ch.find(x => x.type === 'up') || ch[0]; if (p.type === 'up') S.upgradeTrait(c, p.trait.id); else S.addTrait(c, p.trait.id); }
      for (let k = 0; k < 20; k++) { const w = D.POS[c.pos].w, opts = D.INVEST.filter(t => S.canInvest(c, t.id)); if (!opts.length) break; const sc = t => (t.attr ? w[Object.keys(t.attr)[0]] : 0.15) / (1 + (c.inv[t.id] || 0)); S.invest(c, opts.sort((a, b) => sc(b) - sc(a))[0].id); }
      const ev = S.pickEvent(c);
      if (ev) {
        // Proposta de clube em evento: o robô não troca de clube por evento (fica igual nos três modos)
        const opts = ev.options.map((o, i) => ({ i, v: (ev.dest && i === 0) ? -1e9 : (o.ev !== undefined ? o.ev : hintEV(o.hint)) }));
        let i;
        if (mode === 'random') i = opts.filter(o => o.v > -1e8)[Math.floor(Math.random() * opts.filter(o => o.v > -1e8).length)].i;
        else { const valid = opts.filter(o => o.v > -1e8); valid.sort((a, b) => mode === 'best' ? b.v - a.v : a.v - b.v); i = valid[0].i; }
        S.resolveEvent(c, ev, i);
      }
      if (S.pickMoment(c)) S.autoMoment(c);
      c.train = S.autoTrain(c);
      S.playSeason(c);
      if (S.isWcYear(c) && S.wcCall(c).called) { S.wcStart(c); let g; while ((g = S.wcNext(c))) { if (g.live) S.wcMomentAuto(c); if (g.pens) S.wcPensAuto(c); } }
      if (S.isCwcYear(c) && S.cwcCall(c).called) { S.cwcStart(c); let g; while ((g = S.wcNext(c))) { if (g.live) S.wcMomentAuto(c); if (g.pens) S.wcPensAuto(c); } }
      if (S.mustRetire(c)) break;
      if (!S.windowOpen(c)) continue;
      const offers = S.offers(c, false), stay = S.stayOffer(c), all = offers.concat([stay]);
      const good = all.filter(o => o.share >= 0.78).sort((a, b) => D.CLUB_BY_ID[b.club].strength - D.CLUB_BY_ID[a.club].strength);
      S.join(c, good[0] || all.sort((a, b) => b.share - a.share)[0]);
    }
    const f = S.finish(c); res.push({ score: f.score, grade: f.grade, peak: c.peak });
  }
  const g = {}; res.forEach(r => { g[r.grade] = (g[r.grade] || 0) + 1; });
  const m = res.reduce((a, r) => a + r.score, 0) / N;
  out[mode] = m;
  console.log(mode.padEnd(7), 'pontos média', m.toFixed(0), '· mediana', q(res.map(r => r.score), .5), '· pico', (res.reduce((a, r) => a + r.peak, 0) / N).toFixed(1), '·', ['S', 'A', 'B', 'C', 'D'].map(k => k + ' ' + Math.round((g[k] || 0) / N * 100) + '%').join(' '));
}
if (out.best && out.random) console.log('decidir bem vs ao acaso:', ((out.best / out.random - 1) * 100).toFixed(1) + '%');
