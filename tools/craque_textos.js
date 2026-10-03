// Repetição de textos: simula N carreiras seguidas (como um jogador faria em algumas semanas) e mede,
// por tipo de texto do motor, quantas vezes a pessoa leria uma frase que já viu antes nessas carreiras.
// Nomes de jogador, clubes, números e anos viram marcadores, para contar a frase e não o dado.
// Uso: node tools/craque_textos.js [carreiras=30] [mostrar=8]
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
global.window = { CRAQUE_DATA: D }; require('../craque/src/events-text.js'); // aberturas alternativas dos eventos (navegador)
const N = +process.argv[2] || 30, TOP = +process.argv[3] || 8;
// Mesma memória entre carreiras do navegador (ui/social.js, fresh): a frase só volta depois de 3/4 da lista
if (process.env.MEM !== '0') {
  const mem = {};
  S.TEXT_PICK = (key, n) => {
    const used = mem[key] || [], all = [...Array(n).keys()], free = all.filter(i => !used.includes(i)), pool = free.length ? free : all;
    const i = pool[Math.floor(Math.random() * pool.length)], keep = Math.floor(n * 0.75);
    mem[key] = keep ? (free.length ? used : []).concat(i).slice(-keep) : [];
    return i;
  };
}
const clubNames = D.CLUBS.map(c => c.name).sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clubRe = new RegExp('(' + clubNames.map(esc).join('|') + ')', 'g');
const NAMES = ['Caio Bala', 'Zé Roberto', 'Dudu Silva', 'Léo Matos', 'Rafa Nunes', 'Gui Torres'];
function norm(t, name) {
  return String(t).split(name).join('{n}').replace(clubRe, '{c}').replace(/\d+([.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim();
}
const cat = {}; let careerNo = 0;
const see = (k, t, name) => { if (!t) return; const s = norm(t, name); const c = cat[k] = cat[k] || { uses: 0, rep: 0, near: 0, seen: new Map(), last: new Map() }; c.uses++;
  if (c.seen.has(s)) c.rep++; if (c.last.has(s) && careerNo - c.last.get(s) <= 2) c.near++; c.seen.set(s, (c.seen.get(s) || 0) + 1); c.last.set(s, careerNo); };
for (let n = 0; n < N; n++) {
  careerNo = n;
  const pos = ['ATA', 'MEI', 'ZAG', 'GOL'][n % 4], name = NAMES[n % NAMES.length];
  const c = S.newCareer({ name, pos, foot: 'D', country: D.COUNTRIES[n % D.COUNTRIES.length].id }, 9000 + n);
  S.join(c, S.offers(c, true)[n % 3] || S.offers(c, true)[0]);
  while (!c.retired) {
    const ch = S.traitChoices(c);
    if (ch.length) { const p = ch[Math.floor(Math.random() * ch.length)]; if (p.type === 'up') S.upgradeTrait(c, p.trait.id); else S.addTrait(c, p.trait.id); }
    const ev = S.pickEvent(c);
    if (ev) {
      see('evento: título', ev.title, name); see('evento: texto', ev.text, name);
      const r = S.resolveEvent(c, ev, Math.floor(Math.random() * ev.options.length));
      see('evento: resultado', r.text, name);
    }
    const m = S.pickMoment(c); if (m) S.autoMoment(c);
    const res = S.playSeason(c);
    (res.headlines || []).forEach(h => see('manchete', h, name));
    if (res.column) { see('cronista: título', res.column.t, name); see('cronista: texto', res.column.x, name); }
    (res.highlights || []).forEach(h => see('destaque da temporada', h, name));
    if (S.mustRetire(c)) { const f = S.finish(c); see('veredito', f.verdict, name); break; }
    if (S.windowOpen(c)) { const o = S.offers(c); S.join(c, o.length && Math.random() < 0.4 ? o[0] : S.stayOffer(c)); }
  }
}
const rows = Object.entries(cat).map(([k, c]) => ({ k, uses: c.uses, distinct: c.seen.size, rep: c.rep, near: c.near, top: [...c.seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP) }));
rows.sort((a, b) => b.rep / b.uses - a.rep / a.uses);
console.log('Repetição em ' + N + ' carreiras seguidas (quanto do que se lê já tinha aparecido antes)' + (process.env.MEM === '0' ? ' · sem memória' : ' · com a memória do navegador') + '\n');
rows.forEach(r => {
  console.log(r.k.padEnd(24), String(r.uses).padStart(5), 'leituras ·', String(r.distinct).padStart(4), 'frases diferentes ·', (100 * r.rep / r.uses).toFixed(0).padStart(3) + '% repetidas ·', (100 * r.near / r.uses).toFixed(0).padStart(3) + '% já vistas nas 3 últimas carreiras');
  r.top.filter(([, n]) => n > 2).forEach(([t, n]) => console.log('      ' + String(n).padStart(4) + 'x  ' + t.slice(0, 110)));
});
