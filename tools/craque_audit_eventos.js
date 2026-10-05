// Auditoria das decisões (engine/decisions.js): para cada evento, tipos de opção (S segura / R arriscada), valor de cada
// opção (S.fxValue, em pontos de carreira) e problemas de desenho (sem risco, segura com ganho permanente, risco sem lado ruim,
// uma opção domina). Uso: node tools/craque_audit_eventos.js [id ...]
const D = require('../craque/src/data.js'); const S = require('../craque/src/sim.js');
// Carreiras de amostra em idades diferentes
const samples = [];
for (let n = 0; n < 80; n++) {
  const c = S.newCareer({ name: 'R', pos: ['ATA','MEI','ZAG','GOL'][n % 4], foot: 'D', country: D.COUNTRIES[n % D.COUNTRIES.length].id }, 777 + n);
  S.join(c, S.offers(c, true).sort((a, b) => b.share - a.share)[0]);
  while (!S.mustRetire(c) && c.age < 34) {
    if ([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(c.age)) samples.push(JSON.parse(JSON.stringify(c)));
    const ch = S.traitChoices(c); if (ch.length) { const p = ch[0]; if (p.type === 'up') S.upgradeTrait(c, p.trait.id); else S.addTrait(c, p.trait.id); }
    S.playSeason(c);
    if (S.windowOpen(c)) { const of = S.offers(c, false); S.join(c, of.sort((a, b) => b.share - a.share)[0] || S.stayOffer(c)); }
  }
}
const perm = fx => fx && ((fx.main || 0) > 0 || Object.values(fx.attr || {}).some(v => v > 0) || (fx.pot || 0) > 0);
const rows = {};
for (const def of S.EVENT_DEFS.filter(e => e.stakes)) {
  const R = rows[def.id] = { n: 0, safePerm: 0, riskNoDown: 0, gap: [], evs: [], labels: null };
  for (const s of samples) {
    const c = JSON.parse(JSON.stringify(s));
    let ev; try { if (def.when && !def.when(c)) continue; ev = def.build(c, S.rng(1)); } catch (e) { continue; }
    if (!ev || !ev.options) continue;
    R.n++; R.labels = ev.options.map(o => o.label); R.kinds = ev.options.map(o => o.st.safe ? 'S' : 'R');
    const e = ev.options.map(o => o.ev); R.evs.push(e);
    const sorted = e.slice().sort((a, b) => b - a); R.gap.push(sorted[0] - sorted[1]); R.dom = (R.dom || 0) + (sorted[0] - sorted[1] > Math.max(8 * S.STAKE_K, 0.35 * Math.abs(sorted[0])) ? 1 : 0);
    if (ev.options.some(o => o.st.safe && perm(o.st.safe.fx))) R.safePerm++;
    if (ev.options.some(o => !o.st.safe && S.fxValue(c, o.st.lose.fx || {}) >= 0)) R.riskNoDown++;
  }
}
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const out = Object.entries(rows).filter(([, r]) => r.n).map(([id, r]) => ({ id, n: r.n, safePerm: r.safePerm / r.n, riskNoDown: r.riskNoDown / r.n, gap: med(r.gap), dom: r.dom / r.n, ev: r.evs[Math.floor(r.evs.length / 2)].map(v => Math.round(v)), labels: r.labels, kinds: r.kinds }));

console.log('eventos stake avaliados', out.length, 'amostras', samples.length);
console.log('com opção segura que dá atributo/teto permanente:', out.filter(r => r.safePerm > 0.3).length);
console.log('com opção arriscada sem lado ruim:', out.filter(r => r.riskNoDown > 0.3).length);
console.log('sem nenhuma opção arriscada:', out.filter(r => r.labels && 0).length);
// Modo checagem: node audit.js id1 id2 ... → mostra, por evento, opções (S segura / R arriscada), valor mediano e problemas
const ids = process.argv.slice(2);
if (ids.length) out.filter(r => ids.includes(r.id)).forEach(r => {
  const m = Math.max(...r.ev.map(Math.abs));
  const prob = [!r.kinds.includes('R') && 'sem risco', r.safePerm > 0.3 && 'segura com ganho permanente', r.riskNoDown > 0.3 && 'risco sem lado ruim', r.dom > 0.5 && 'uma opção domina'].filter(Boolean);
  console.log(r.id.padEnd(18), r.kinds.join(''), 'valores', JSON.stringify(r.ev), r.labels.join(' | '), prob.length ? '  ⚠ ' + prob.join('; ') : '  ok');
});
