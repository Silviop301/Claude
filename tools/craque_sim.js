// Simula milhares de carreiras do CRAQUE com um "jogador robô" para checar ritmo e variedade.
// Uso: node tools/craque_sim.js [n]
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 2000;
const res = [];
// Dois perfis de robô: "casual" (escolhas aleatórias) e "esperto" (joga como um humano estratégico:
// busca sinergias, sobe para clubes maiores sem perder a titularidade, aceita as boas oportunidades).
const SMART = process.argv[3] !== 'casual';
for (let n = 0; n < N; n++) {
  const pos = n % 2 ? 'ATA' : 'MEI';
  const c = S.newCareer({ name: 'Robô', pos, foot: 'D', country: 'Brasil' }, 1000 + n);
  let decisions = 0;
  const base = S.offers(c, true);
  S.join(c, SMART ? base.slice().sort((a, b) => b.share - a.share)[0] : base[0]); decisions++;
  while (!c.retired) {
    const ch = S.traitChoices(c);
    if (ch.length) {
      const pick = SMART ? (ch.find(x => x.completes) || ch.find(x => x.type === 'up') || ch[0]) : ch[Math.floor(Math.random() * ch.length)];
      if (pick.type === 'up') S.upgradeTrait(c, pick.trait.id);
      else if (pick.type === 'swap') {
        // troca a de menor nível que não faça parte de uma sinergia ativa
        const inSyn = new Set(S.synergies(c).flatMap(x => [x.a, x.b]));
        const drop = c.traits.filter(id => !inSyn.has(id)).sort((a, b) => S.traitLevel(c, a) - S.traitLevel(c, b))[0] || c.traits[0];
        S.addTrait(c, pick.trait.id, drop);
      } else S.addTrait(c, pick.trait.id);
      decisions++;
    }
    // Investimentos: o esperto compra o que mais pesa na posição; o casual compra às vezes
    for (let k = 0; k < 20; k++) {
      const w = D.POS[c.pos].w;
      const opts = D.INVEST.filter(t => S.canInvest(c, t.id));
      if (!opts.length || (!SMART && Math.random() < 0.5)) break;
      const score = t => (t.attr ? w[Object.keys(t.attr)[0]] : 0.15) / (1 + (c.inv[t.id] || 0));
      const t = SMART ? opts.sort((a, b) => score(b) - score(a))[0] : opts[Math.floor(Math.random() * opts.length)];
      S.invest(c, t.id); decisions++;
    }
    const ev = S.pickEvent(c);
    if (ev) {
      let i = Math.random() < 0.5 ? 0 : 1;
      if (SMART) i = { banco: 0, assedio: 0, funcao: 0, arabia: 1, renovar: 1, capitao: 0, classico: 1, festa: 1, sub20: 0, protesto: 0 }[ev.id] ?? 0;
      S.resolveEvent(c, ev, i); decisions++;
      c.stats = c.stats || {}; c.stats[ev.id] = (c.stats[ev.id] || 0) + 1;
    }
    // Jogo decisivo: o robô deixa o jogo decidir (mesma chance que a tela mostra)
    if (!process.env.NOMOMENT && S.pickMoment(c)) { c.mstats = c.mstats || { n: 0, ok: 0 }; c.mstats.n++; if (S.autoMoment(c)) c.mstats.ok++; decisions++; }
    S.playSeason(c);
    if (S.mustRetire(c)) break;
    if (S.canAnnounce(c) && S.ovr(c) < (SMART ? 76 : 72) && Math.random() < 0.6) { S.announce(c); decisions++; }
    if (!S.windowOpen(c)) continue;
    const offers = S.offers(c, false);
    decisions++;
    const opts = offers.concat([S.stayOffer(c)]);
    if (!offers.length && S.ovr(c) < 50) break;
    const stay = S.stayOffer(c);
    if (!SMART && n % 4 < 2 && stay.share >= 0.78 && Math.random() < 0.8) { S.join(c, stay); continue; }
    const minShare = SMART ? 0.78 : 0.55;
    const good = opts.filter(o => o.share >= minShare).sort((a, b) => D.CLUB_BY_ID[b.club].strength - D.CLUB_BY_ID[a.club].strength);
    S.join(c, good[0] || opts.sort((a, b) => b.share - a.share)[0]);
  }
  const f = S.finish(c);
  res.push({ build: c.traits.slice().sort().join('+'), idol: f.verdict.startsWith('Ídolo'), farewell: !!c.farewell, seasons: c.season, decisions, goals: c.totals.goals, assists: c.totals.assists, titles: f.titles, ballon: c.totals.ballon, peak: c.peak, grade: f.grade, verdict: f.verdict, pos, clubs: f.nClubs, games: c.totals.games, events: Object.values(c.stats || {}).reduce((a, b) => a + b, 0), buys: c.buys, invOvr: S.ovr(c) - S.ovrOf(S.preview(c, {}).attrs, c.pos) + (() => { const inv = c.inv; c.inv = {}; const o = S.ovr(c); c.inv = inv; return S.ovr(c) - o; })(), firstBuy: c.firstBuyAge || 0, money: Math.round(c.money / 1e6), moments: (c.mstats || {}).n || 0, momentsOk: (c.mstats || {}).ok || 0 });
}
console.log('Robô:', SMART ? 'esperto' : 'casual');
console.log('Builds finais diferentes:', new Set(res.map(r => r.build)).size, 'em', N, 'carreiras · Ídolos:', (res.filter(r => r.idol).length / N * 100).toFixed(1) + '% · Com despedida:', (res.filter(r => r.farewell).length / N * 100).toFixed(0) + '%');
const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
const pr = (label, key, filter) => {
  const a = res.filter(filter || (() => true)).map(r => r[key]);
  console.log(label.padEnd(26), 'p10', String(q(a, .1)).padStart(5), ' mediana', String(q(a, .5)).padStart(5), ' p90', String(q(a, .9)).padStart(5), ' max', Math.max(...a));
};
pr('Temporadas', 'seasons'); pr('Decisões', 'decisions');
pr('Gols (ATA)', 'goals', r => r.pos === 'ATA'); pr('Assistências (MEI)', 'assists', r => r.pos === 'MEI');
pr('Jogos', 'games'); pr('Eventos por carreira', 'events'); pr('Títulos', 'titles'); pr('Pico OVR', 'peak'); pr('Clubes', 'clubs');
pr('Compras (investimentos)', 'buys'); pr('OVR vindo de compras', 'invOvr'); pr('Idade da 1ª compra', 'firstBuy'); pr('Saldo final (mi)', 'money'); pr('Jogos decisivos', 'moments');
console.log('Acerto nos jogos decisivos:', (res.reduce((a, r) => a + r.momentsOk, 0) / Math.max(1, res.reduce((a, r) => a + r.moments, 0)) * 100).toFixed(0) + '%');
const ballon = res.filter(r => r.ballon > 0).length / N;
console.log('Carreiras com Bola de Ouro:', (ballon * 100).toFixed(1) + '%', '| com 3+:', (res.filter(r => r.ballon >= 3).length / N * 100).toFixed(1) + '%');
const grades = {}; res.forEach(r => { grades[r.grade] = (grades[r.grade] || 0) + 1; });
console.log('Notas finais:', Object.entries(grades).sort().map(([g, n]) => g + ' ' + (n / N * 100).toFixed(0) + '%').join(' · '));
const ver = {}; res.forEach(r => { const v = r.verdict.startsWith('Ídolo') ? 'Ídolo eterno do X' : r.verdict; ver[v] = (ver[v] || 0) + 1; });
console.log('Vereditos:', Object.entries(ver).sort((a, b) => b[1] - a[1]).map(([v, n]) => v + ' ' + (n / N * 100).toFixed(0) + '%').join(' · '));
const secs = q(res.map(r => r.decisions * 6 + r.seasons * 5), .5);
console.log('Duração estimada (6 s por decisão + 5 s de resumo por temporada):', Math.floor(secs / 60) + 'min' + (secs % 60) + 's');
