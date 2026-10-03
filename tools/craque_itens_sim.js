// Quantas carreiras para liberar tudo (pacotinhos, ui/items.js)?
// Joga carreiras de verdade com o motor (robô "esperto" do craque_sim) e usa o código real do inventário:
// pacotes ganhos no fim da carreira, sorteio, garantia de lendário, repetidos em fichas e troca de fichas.
// Uso: node tools/craque_itens_sim.js [jogadores por cenário] [carreiras no banco]
//      ECON='{"fresh":0.3,"gradeS":1}' node tools/craque_itens_sim.js   → testa outros valores da economia (ver E em ui/items.js)
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const PLAYERS = +process.argv[2] || 300, POOL = +process.argv[3] || 1200;

// ---------- carreiras (banco de resultados reais) ----------
function career(n) {
  const POSS = ['ATA', 'MEI', 'ZAG', 'GOL'], pos = POSS[n % 4];
  const c = S.newCareer({ name: 'Robô', pos, foot: 'D', country: D.COUNTRIES[Math.floor(n / 4) % D.COUNTRIES.length].id }, 5000 + n);
  const base = S.offers(c, true);
  S.join(c, base.slice().sort((a, b) => b.share - a.share)[0]);
  while (!c.retired) {
    const ch = S.traitChoices(c);
    if (ch.length) { const pick = ch.find(x => x.completes) || ch.find(x => x.type === 'up') || ch[0]; if (pick.type === 'up') S.upgradeTrait(c, pick.trait.id); else S.addTrait(c, pick.trait.id); }
    for (let k = 0; k < 20; k++) {
      const w = D.POS[c.pos].w, opts = D.INVEST.filter(t => S.canInvest(c, t.id));
      if (!opts.length) break;
      const score = t => (t.attr ? w[Object.keys(t.attr)[0]] : 0.15) / (1 + (c.inv[t.id] || 0));
      S.invest(c, opts.sort((a, b) => score(b) - score(a))[0].id);
    }
    const ev = S.pickEvent(c);
    if (ev) S.resolveEvent(c, ev, Math.random() < 0.5 ? 0 : 1);
    if (S.pickMoment(c)) S.autoMoment(c);
    c.train = c.age <= 28 ? 'forte' : c.age >= 32 ? 'leve' : 'normal';
    S.playSeason(c);
    for (const [is, call, start] of [[S.isWcYear, S.wcCall, S.wcStart], [S.isCwcYear, S.cwcCall, S.cwcStart]]) {
      if (is(c) && call(c).called) { start(c); let g; while ((g = S.wcNext(c))) { if (g.live) S.wcMomentAuto(c); if (g.pens) S.wcPensAuto(c); } }
    }
    if (S.mustRetire(c)) break;
    if (S.canAnnounce(c) && S.ovr(c) < 76 && Math.random() < 0.6) S.announce(c);
    if (!S.windowOpen(c)) continue;
    const opts = S.offers(c, false).concat([S.stayOffer(c)]);
    const good = opts.filter(o => o.share >= 0.78).sort((a, b) => D.CLUB_BY_ID[b.club].strength - D.CLUB_BY_ID[a.club].strength);
    S.join(c, good[0] || opts.sort((a, b) => b.share - a.share)[0]);
  }
  const f = S.finish(c);
  const big = Object.values(c.trophies || {}).reduce((s, t) => s + (['ucl', 'lib', 'wc', 'ballon'].includes(t.type) ? t.n : 0), 0);
  return { grade: f.grade, big, ach: S.achievementsOf(c, f) };
}
const t0 = Date.now();
const bank = Array.from({ length: POOL }, (_, i) => career(i));
console.log('Banco: ' + POOL + ' carreiras reais em ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');

// ---------- inventário (código do jogo, com o armazenamento na memória) ----------
let mem = {};
global.window = { CRAQUE_UI: { load: k => (k in mem ? JSON.parse(mem[k]) : null), store: (k, v) => { mem[k] = JSON.stringify(v); }, SAVE: 'craque-v5' },
  ClimbixAvatar: { DEF: {} }, CLIMBIX_ITEMS_ECON: process.env.ECON ? JSON.parse(process.env.ECON) : undefined };
require('../craque/src/ui/items.js');
const I = window.CRAQUE_UI.ITEMS;
const isNum = id => /^n\d+$/.test(id);
const all = Object.keys(I.BY_ID), visual = all.filter(id => !isNum(id)), nums = all.filter(isNum);
console.log('Itens nos pacotinhos: ' + all.length + ' (assinaturas, acabamentos e estilos de número; os números da camisa são livres)');

// Troca de fichas: compra o item que falta mais barato (o jogador junta fichas para o que quer)
function trade() {
  for (;;) {
    const inv = I.get(), miss = all.filter(id => !inv.own[id]).sort((a, b) => I.COST[I.BY_ID[a].rk] - I.COST[I.BY_ID[b].rk]);
    if (!miss.length || inv.fichas < I.COST[I.BY_ID[miss[0]].rk]) return;
    I.trade(miss[0]);
  }
}

// daily: fração das carreiras que são a carreira do dia
function player(sc) {
  mem = {}; I.reset();
  const ach = new Set(), out = { packs: 0 };
  const done = ids => ids.every(id => I.get().own[id]);
  for (let n = 1; n <= 3000; n++) {
    const r = bank[Math.floor(Math.random() * bank.length)];
    const fresh = r.ach.filter(id => !ach.has(id)); fresh.forEach(id => ach.add(id));
    const c = { trophies: r.big ? { x: { type: 'ucl', n: r.big } } : {}, daily: Math.random() < sc.daily ? 'd' : null };
    out.packs += I.earn(I.careerWhy(c, { grade: r.grade }, { fresh }));
    while (I.get().packs.length) I.open();
    trade();
    if (!out.half && I.counts().got >= all.length / 2) out.half = n;
    if (!out.vis && done(visual)) out.vis = n;
    if (!out.num && done(nums)) out.num = n;
    if (done(all)) { out.all = n; out.ppc = out.packs / n; return out; }
  }
  out.all = 3000; out.ppc = out.packs / 3000;
  return out;
}

const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const fmt = (a, k) => { const v = a.map(o => o[k]); return 'mediana ' + String(q(v, .5)).padStart(4) + ' · p10 ' + String(q(v, .1)).padStart(4) + ' · p90 ' + String(q(v, .9)).padStart(4); };
const SCEN = [
  { name: 'Só carreiras (sem carreira do dia)', daily: 0, perDay: 0 },
  { name: 'Todo dia: 3 carreiras (1 é a do dia)', daily: 1 / 3, perDay: 3 },
];
for (const sc of SCEN) {
  const res = Array.from({ length: PLAYERS }, () => player(sc));
  console.log('\n' + sc.name + ' · ' + PLAYERS + ' jogadores');
  console.log('  Pacotes por carreira (média): ' + (res.reduce((s, o) => s + o.ppc, 0) / res.length).toFixed(2));
  console.log('  Metade de tudo:       ' + fmt(res, 'half') + ' carreiras');
  console.log('  Todo o visual:        ' + fmt(res, 'vis') + ' carreiras');
  console.log('  Todos os números:     ' + fmt(res, 'num') + ' carreiras');
  console.log('  Tudo:                 ' + fmt(res, 'all') + ' carreiras');
  const med = q(res.map(o => o.all), .5);
  console.log('  Tempo (mediana, ~10 min por carreira): ' + Math.round(med * 10 / 60) + ' h' + (sc.perDay ? ' · ' + Math.round(med / sc.perDay) + ' dias' : ''));
}
