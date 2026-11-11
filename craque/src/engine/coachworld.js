// Modo Treinador, mercado vivo (2026-11-10; mapa: https://claude.ai/artifact/MMqfMrXUoaCwBbA6GUcGJh). Os clubes da IA compram e
// vendem entre si com a janela aberta, e o que você vende, compra ou perde no fim do contrato passa a existir no mundo.
// Tudo fica no save em co.wm, por cima dos elencos sorteados (S.coGenSquad chama S.coWorldSquad):
// co.wm = { s (temporada), v (versão, sobe a cada mudança), st (último lote sorteado: temporada|janela|rodada),
//           mv: [{ id, p (retrato do jogador), from, to, s, wk, v }] negócios que valem (o último de cada id manda),
//           nw: [{ i, k: 'f' fechado | 'l' livre, id, n, pos, age, from, to, v, s, r, up, me (1 seu clube, 2 ex seu clube), tr }] notícias,
//           ni/seen (contador e até onde você leu), fa: { id: 1 } livres da temporada que já fecharam,
//           free: [{ s, lg, p }] quem saiu do seu clube no fim do contrato, gone: [ids da fonte] reais que saíram do mundo,
//           rm: [{ id, from, to, ok, ni, up, me }] boatos esperando o próximo lote (a notícia é a k: 'b' de índice ni),
//           lost: { id, n, pos, to, v } o observado que fechou com outro (a tela mostra uma vez e apaga) }
// Boatos (fase 3): cada lote solta os boatos do lote seguinte (e a véspera da janela do meio, os da janela): 2 de 3 viram
// negócio. Quem você observa só sai do clube assim, com o boato uma semana antes. A proposta que vai chegar por um dos
// seus também vira boato na semana anterior.
// Um lote por semana de janela (rodadas 1 a 3 e a da metade), sorteado uma vez pela semente da carreira: recarregar não muda nada.
// O sorteio é próprio (não mexe em co.seed). Conferência: node tools/craque_mercado.js (esperado 0 alertas).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const WM = S.CO_WORLD = {
    buy: { pre: 0.18, mid: 0.25 }, // chance de cada clube da sua liga contratar em cada lote da janela
    rum: 0.06,       // chance de cada clube da sua liga aparecer num boato para o lote seguinte
    rumObs: 0.25,    // chance de cada jogador que você observa aparecer num boato para o lote seguinte
    rumOk: 0.67,     // parte dos boatos que vira negócio
    rumTwo: 0.3,     // chance de um segundo clube entrar no boato de quem você observa
    maxIn: 2,        // contratações por clube em cada janela
    top: 2,          // negócios dos grandes do país por lote (quando a sua liga não é a deles)
    free: 1,         // sem clube que fecham por lote
    exP: 0.12,       // parte dos negócios da liga que são vendas para o exterior
    lo: 12, hi: 2,   // o vendedor tem de 12 pontos de força a menos até 2 a mais que o comprador
    keep: 3,         // temporadas que um negócio segue valendo (depois o jogador sai do mundo)
    up: +(typeof process !== 'undefined' && process.env && process.env.WM_UP || 3), // ▲ da notícia: quem chega com 3 pontos ou mais sobre o último titular da posição
    news: 40, gone: 400, left: 8
  };
  const START = { GOL: 1, ZAG: 2, LAT: 2, MEI: 3, ATA: 2 };
  const POS = ['GOL', 'ZAG', 'ZAG', 'LAT', 'LAT', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];
  const r10k = v => Math.max(10000, Math.round(v / 10000) * 10000);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isReal = id => !!(S.coRealOf && S.coRealOf(id));
  const sticky = id => /^(r|m|x):/.test(String(id));
  const snapOf = (p, id) => { const o = { n: p.n, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, wage: p.wage, ct: Math.max(1, p.ct || 0) };
    if (p.api && !/^f:/.test(String(id))) { o.api = p.api; if (p.num) o.num = p.num; }
    if (Array.isArray(p.at)) o.at = p.at.slice();
    return o; };
  const addGone = (w, api) => { if (!api) return; w.gone = w.gone || []; if (!w.gone.includes(api)) { w.gone.push(api); if (w.gone.length > WM.gone) w.gone.shift(); } };

  function W(co) {
    let w = co.wm;
    if (!w) w = co.wm = { s: co.season, v: 1, st: '', mv: [], nw: [], ni: 0, seen: 0, fa: {}, free: [], gone: [] };
    if (w.s !== co.season) roll(co, w);
    return w;
  }
  S.coWorld = W;
  // Virada de temporada: negócio velho ou de jogador sorteado em clube sorteado sai da lista (o clube sorteado refaz o
  // elenco todo ano); quem fica envelhece um ano como o seu elenco
  function roll(co, w) {
    w.mv = (w.mv || []).filter(m => {
      const keep = m.to && (sticky(m.id) || isReal(m.to)) && co.season - m.s < WM.keep;
      if (keep) { const p = m.p, r = S.rng(hash(m.id + '|idade|' + co.season)); p.age++;
        const g = p.age <= 21 ? r.int(1, 4) : p.age <= 26 ? r.int(0, 2) : p.age <= 30 ? r.int(-1, 1) : p.age <= 33 ? r.int(-3, 0) : r.int(-5, -1);
        p.ovr = clamp(p.ovr + (g > 0 ? Math.min(g, Math.max(0, p.pot - p.ovr)) : g), 30, 95); p.ct = p.ct > 1 ? p.ct - 1 : 2;
        if (p.age < 37) return true; }
      addGone(w, m.p.api);
      return false;
    });
    w.free = (w.free || []).filter(x => x.s === co.season);
    delete w.lost; // aviso "Fechou com outro" da temporada passada (ex.: ficou sem ler porque foi demitido) não vale mais
    w.fa = {}; w.s = co.season; w.st = ''; w.v = (w.v || 0) + 1;
  }

  // ---------- o elenco de um clube com os negócios por cima ----------
  let IX = null;
  function index(co, season) {
    const w = co.wm, got = co.mkt && co.mkt.s === season && co.mkt.got ? co.mkt.got : null, gk = got ? Object.keys(got) : [];
    if (!IX || IX.w !== w || IX.v !== w.v) IX = { w, v: w.v, by: {} };
    const key = season + '|' + gk.length;
    if (IX.by[key]) return IX.by[key];
    const loc = {}, out = {}, arr = {}; let n = 0;
    (w.mv || []).forEach(m => { if (m.s <= season) loc[m.id] = m; });
    Object.keys(loc).forEach(id => { out[id] = 1; n++; const m = loc[id]; if (m.to) (arr[m.to] = arr[m.to] || []).push(m); });
    (w.gone || []).forEach(a => { out['r:' + a] = 1; n++; });
    gk.forEach(id => { out[id] = 1; n++; });
    return (IX.by[key] = { out, arr, n });
  }
  S.coWorldSquad = function (co, clubId, season, sq) {
    const X = index(co, season); if (!X.n) return sq;
    const arr = X.arr[clubId];
    let out = sq.filter(p => !X.out[p.id]);
    if (out.length === sq.length && !arr) return sq;
    const keep = {}, m = co.mkt, held = id => keep[id] || (m && ((m.obs && m.obs[id]) || (m.neg && m.neg[id]) || (m.rep && m.rep[id])));
    if (arr) arr.forEach(x => { const p = Object.assign({ id: x.id, mo: 60, en: 100, out: 0, sus: 0 }, x.p); if (x.p.at) p.at = x.p.at.slice(); out.push(p); keep[p.id] = 1; });
    const club = D.CLUB_BY_ID[clubId], cty = D.countryOf(club), need = S.CO.squad;
    Object.keys(need).forEach(pos => {
      const L = out.filter(p => p.pos === pos);
      if (L.length > need[pos]) { // chegou gente: sai o mais fraco da posição (nunca quem chegou nem quem você observa, negocia ou pagou relatório)
        const drop = L.filter(p => !held(p.id)).sort((a, b) => a.ovr - b.ovr).slice(0, L.length - need[pos]);
        out = out.filter(p => !drop.includes(p));
      } else for (let k = 0, add = need[pos] - L.length; add > 0 && k < 40; k++) { // saiu gente: sobe um garoto da base
        const id = clubId + ':' + season + ':w' + pos + k; if (X.out[id]) continue;
        const r = S.rng(hash(id)); out.push(S._coMkPlayer(r, club, pos, club.strength - 7 + r.gauss() * 2.5, r.int(17, 21), id, cty)); add--;
      }
    });
    return out;
  };

  // ---------- notícias ----------
  function news(co, w, x) {
    x.i = w.ni = (w.ni || 0) + 1; x.s = co.season; x.r = co.ss ? co.ss.i : 0;
    w.nw.unshift(x); if (w.nw.length > WM.news) w.nw.length = WM.news;
  }
  const lgIds = co => (co.ss ? co.ss.ids : []);
  S.coWorldInLg = (co, x) => { const L = lgIds(co); return (!!x.from && L.includes(x.from)) || (!!x.to && L.includes(x.to)); };
  // flt: 0 tudo, 1 sua liga (e o seu clube), 2 seu clube
  // flt 3: quem você observa (a nota fica na notícia; vale também para quem está observado agora)
  const obsNow = (co, x) => !!(x.obs || (x.id && co.mkt && co.mkt.s === co.season && co.mkt.obs && co.mkt.obs[x.id]));
  S.coWorldObs = obsNow;
  S.coWorldNews = (co, flt) => { const L = (co.wm && co.wm.nw) || []; return flt === 3 ? L.filter(x => obsNow(co, x)) : flt === 2 ? L.filter(x => x.me) : flt === 1 ? L.filter(x => x.me || x.obs || S.coWorldInLg(co, x)) : L; };
  S.coWorldNew = co => { const w = co.wm; return w ? w.nw.filter(x => x.i > (w.seen || 0) && !x.q && (x.me || x.obs || S.coWorldInLg(co, x))).length : 0; };
  // Os boatos que correm agora sobre um jogador de outro clube (a ficha mostra quem também quer; podem ser dois clubes)
  S.coWorldRumors = (co, id) => (co.wm && (co.wm.rm || []).filter(x => x.id === id && !x.me)) || [];
  // O observado que fechou com outro: devolve uma vez e apaga
  S.coWorldLost = co => { const w = co.wm, x = w && w.lost; if (x) { delete w.lost; w.v++; } return x || null; };
  S.coWorldSeen = co => { if (co.wm) co.wm.seen = co.wm.ni || 0; };

  // ---------- o que você faz entra no mundo ----------
  const winK = co => S.coMktWinK(co); // a mesma conta da janela do mercado (por rodada; a do meio vale S.CO_MKT.midR rodadas)
  function put(co, w, id, p, from, to, v, extra) {
    w.mv = w.mv.filter(m => m.id !== id);
    // O destino já tem a posição inteira de gente que chegou (só acontece com quem você vende ou manda na troca: os negócios
    // do computador param antes, `fullAt`): o mais fraco deles sai do mundo, como o corte do mais fraco em S.coWorldSquad
    if (to) { const L = w.mv.filter(m => m.to === to && m.p.pos === p.pos), mk = co.mkt, held = m => !!(mk && ((mk.obs && mk.obs[m.id]) || (mk.neg && mk.neg[m.id]) || (mk.rep && mk.rep[m.id])));
      if (L.length >= S.CO.squad[p.pos]) { const x = L.slice().sort((a, b) => (held(a) - held(b)) || a.p.ovr - b.p.ovr)[0]; x.to = null; } }
    w.mv.push({ id, p: snapOf(p, id), from: from || null, to, s: co.season, wk: winK(co) || '', v: v || 0 });
    news(co, w, Object.assign({ k: 'f', id, n: p.n, pos: p.pos, age: p.age, from: from || null, to, v: v || 0 }, extra || {}));
    w.v++;
  }
  // Você vendeu (ou o presidente vendeu, ou foi na troca): o jogador passa a jogar pelo clube comprador
  S.coWorldSold = function (co, p, to, v, extra) {
    if (!p || !to || !D.CLUB_BY_ID[to]) return null;
    const w = W(co), id = p.api ? 'r:' + p.api : 'm:' + p.id;
    put(co, w, id, p, co.club, to, v, Object.assign({ me: 1 }, extra || {}));
    return id;
  };
  // Você comprou: ele deixa de valer em qualquer negócio antigo (o clube de origem já o perde por co.mkt.got)
  S.coWorldBought = function (co, p, v) {
    const w = W(co);
    w.mv = w.mv.filter(m => m.id !== p.id); w.free = (w.free || []).filter(x => x.p.id !== p.id);
    news(co, w, { k: 'f', id: null, n: p.n, pos: p.pos, age: p.age, from: p.club || null, to: co.club, v: v || 0, me: 1 });
    w.v++;
  };
  // Fim da temporada: quem saiu do seu clube. Real não volta para o clube de origem; quem saiu no fim do contrato fica
  // sem clube na temporada seguinte (a lista "Sem contrato" do Mercado)
  S.coWorldLeft = function (co, gone) {
    const w = W(co), lg = D.CLUB_BY_ID[co.club].league;
    gone.forEach(p => addGone(w, p.api));
    gone.filter(p => p.ct <= 0 && p.age < 34).sort((a, b) => b.ovr - a.ovr).slice(0, WM.left).forEach(p => {
      const id = 'x:' + (co.season + 1) + ':' + p.id, o = snapOf(p, id); o.id = id; o.ct = 0;
      w.free.push({ s: co.season + 1, lg, p: o });
    });
    w.v++;
  };
  // Você rescindiu o contrato (S.coMktResc): sai notícia na hora e ele fica sem clube na temporada seguinte, como quem sai
  // no fim do contrato; real não volta para o clube de origem
  S.coWorldResc = function (co, p) {
    const w = W(co), lg = D.CLUB_BY_ID[co.club].league;
    addGone(w, p.api);
    if (p.age < 34) { const id = 'x:' + (co.season + 1) + ':' + p.id, o = snapOf(p, id); o.id = id; o.ct = 0; w.free.push({ s: co.season + 1, lg, p: o }); }
    news(co, w, { k: 'l', id: null, n: p.n, pos: p.pos, age: p.age, from: null, to: null, v: 0, me: 2, q: 1 }); // q = foi você quem fez: não acende o aviso de notícia nova
    w.v++;
  };
  // % de venda futura: o clube que comprou revende para um maior (chamado quando a sua parte é paga)
  S.coWorldResell = function (co, wid) {
    const w = W(co), m = w.mv.filter(x => x.id === wid).pop(); if (!m || !m.to) return null;
    const cur = D.CLUB_BY_ID[m.to], r = S.rng(hash('wm|revenda|' + wid + '|' + co.season));
    const L = D.CLUBS.filter(c => c.id !== co.club && c.id !== cur.id && c.strength > cur.strength + 1 && c.strength <= cur.strength + 12);
    if (!L.length) return null;
    const to = L[Math.floor(r() * L.length)], p = Object.assign({ id: wid }, m.p);
    put(co, w, wid, p, cur.id, to.id, r10k(S.coValue(p) * (1.1 + r() * 0.4)), { me: 2 });
    return to.id;
  };

  // ---------- os negócios dos outros: um lote por semana de janela ----------
  // Semana de lote: as da janela ('pre', 'mid') e a véspera da janela do meio ('eve', só boatos)
  const tickK = co => { const k = winK(co); if (k) return k; const ss = co.ss; return ss && !ss.done && ss.i === Math.floor(ss.rounds.length / 2) - 1 ? 'eve' : null; };
  S.coWorldSync = function (co) {
    if (!co || !co.club) return;
    if (co.wm && co.wm.s !== co.season) W(co);
    const k = tickK(co); if (!k) return;
    const w = W(co), key = co.season + '|' + k + '|' + co.ss.i;
    if (w.st === key) return;
    w.st = key;
    batch(co, w, k);
    w.v++;
  };
  function batch(co, w, k) {
    const r = S.rng(hash('wm|' + (co.seed || 0) + '|' + w.st)), me = co.club, season = co.season, ids = co.ss.ids;
    const cty = D.countryOf(D.CLUB_BY_ID[me]), m = co.mkt && co.mkt.s === season ? co.mkt : null;
    const win = k !== 'eve', wk = win ? k : 'mid', half = Math.floor(co.ss.rounds.length / 2);
    const used = {}, inN = {};
    w.mv.forEach(x => { if (x.s === season) { used[x.id] = 1; if (x.wk === wk && x.to) inN[x.to] = (inN[x.to] || 0) + 1; } });
    const prot = id => used[id] || (m && ((m.obs && m.obs[id]) || (m.neg && m.neg[id]) || (m.got && m.got[id])));
    const nat = D.CLUBS.filter(c => c.id !== me && c.strength && D.countryOf(c) === cty);
    const fora = D.CLUBS.filter(c => c.strength && D.countryOf(c) !== cty);
    const sq = id => S.coGenSquad(id, season, co);
    // Clube que já tem a posição inteira de gente que chegou (os negócios valem por anos) não contrata mais ali: quem chegou
    // nunca é cortado, e o elenco passaria de 25 (apareceu com a janela do meio em 2 rodadas, 11/11: mais um lote por ano)
    const fullAt = (to, pos) => !!to && w.mv.filter(x => x.to === to && x.p.pos === pos).length >= S.CO.squad[pos];
    const deal = (p, from, to, extra) => { if (fullAt(to, p.pos)) return false; used[p.id] = 1; if (to) inN[to] = (inN[to] || 0) + 1;
      put(co, w, p.id, p, from, to, from ? r10k(S.coValue(p) * (0.9 + r() * 0.35)) : 0, extra); return true; };
    // um clube contrata: um jogador de clube do país um pouco menor, que entra pelo menos para o rodízio
    const pick = b => {
      const B = sq(b.id), pos = POS[Math.floor(r() * POS.length)], mine = B.filter(p => p.pos === pos).sort((x, y) => y.ovr - x.ovr);
      const last = mine[Math.min(mine.length, START[pos]) - 1], thr = last ? last.ovr - 1 : 0;
      const cand = nat.filter(c => c.id !== b.id && c.strength <= b.strength + WM.hi && c.strength >= b.strength - WM.lo);
      for (let t = 0; t < 5 && cand.length; t++) {
        const s = cand[Math.floor(r() * cand.length)];
        const Q = sq(s.id).filter(p => p.pos === pos && p.age <= 33 && !prot(p.id)).sort((x, y) => y.ovr - x.ovr).slice(0, 3).filter(p => p.ovr >= thr);
        if (!Q.length) continue;
        const p = Q[Math.floor(r() * Q.length)];
        return { p, from: s.id, up: last && p.ovr >= last.ovr + WM.up ? 1 : 0 };
      }
      return null;
    };
    const buy = b => { const x = pick(b); if (x) deal(x.p, x.from, b.id, x.up ? { up: 1 } : null); };
    // um clube vende para o exterior: um dos 3 melhores, para um clube de fora mais forte
    const abroad = b => {
      const F = fora.filter(c => c.strength >= b.strength + 2 && c.strength <= b.strength + 14); if (!F.length) return buy(b);
      const Q = sq(b.id).filter(p => p.age <= 30 && !prot(p.id)).sort((x, y) => y.ovr - x.ovr).slice(0, 3); if (!Q.length) return;
      deal(Q[Math.floor(r() * Q.length)], b.id, F[Math.floor(r() * F.length)].id, null);
    };
    // 0. os boatos do lote passado: a notícia do boato sai; 2 de 3 fecham (se o jogador segue lá e você não chegou antes)
    const pend = w.rm || []; w.rm = [];
    pend.forEach(x => {
      w.nw = w.nw.filter(n => !(n.k === 'b' && n.i === x.ni));
      if (!win || x.me || !x.ok || used[x.id] || (inN[x.to] || 0) >= WM.maxIn) return;
      if (m && ((m.neg && m.neg[x.id]) || (m.got && m.got[x.id]))) return;
      const p = sq(x.from).find(q => q.id === x.id); if (!p) return;
      const obs = !!(m && m.obs && m.obs[x.id]);
      if (!deal(p, x.from, x.to, Object.assign({ rm: 1 }, x.up ? { up: 1 } : null, obs ? { obs: 1 } : null))) return;
      if (obs) w.lost = { id: x.id, n: p.n, pos: p.pos, to: x.to, v: w.mv[w.mv.length - 1].v };
    });
    if (win) deals();
    if (k === 'eve' || (k === 'pre' && co.ss.i + 1 < Math.min(S.CO_MKT.preR, half)) || (k === 'mid' && co.ss.i + 1 < half + S.CO_MKT.midR)) rumors();

    function deals() {
    // 1. a sua liga
    ids.filter(id => id !== me).forEach(id => {
      if (r() >= WM.buy[k] || (inN[id] || 0) >= WM.maxIn) return;
      const b = D.CLUB_BY_ID[id];
      if (r() < WM.exP) abroad(b); else buy(b);
    });
    // 2. os grandes do país (quando não estão na sua liga)
    const big = nat.slice().sort((a, b) => b.strength - a.strength).slice(0, 8).filter(c => !ids.includes(c.id));
    for (let i = 0; i < WM.top && big.length; i++) { const b = big[Math.floor(r() * big.length)]; if ((inN[b.id] || 0) < WM.maxIn) buy(b); }
    // 3. os sem clube: no primeiro lote do ano, a notícia de quem ficou livre (os seus e os 2 melhores ao seu alcance)
    if (!S.coMktFree) return;
    const FA = S.coMktFree(co).filter(p => !prot(p.id)), mineTop = co.squad.reduce((a, p) => Math.max(a, p.ovr), 0);
    if (k === 'pre' && co.ss.i === 0) {
      const ex = FA.filter(p => /^x:/.test(p.id)), oth = FA.filter(p => !/^x:/.test(p.id) && p.ovr <= mineTop + 2 && p.age <= 33).sort((a, b) => b.ovr - a.ovr).slice(0, 2);
      oth.concat(ex).forEach(p => news(co, w, Object.assign({ k: 'l', id: p.id, n: p.n, pos: p.pos, age: p.age, from: null, to: null, v: 0 }, /^x:/.test(p.id) ? { me: 2 } : null)));
    }
    const sign = (p, extra) => {
      const C = nat.filter(c => c.strength >= p.ovr - 4 && c.strength <= p.ovr + 3 && (inN[c.id] || 0) < WM.maxIn && !fullAt(c.id, p.pos)); if (!C.length) return;
      const L = C.filter(c => ids.includes(c.id)), T = L.length && r() < 0.5 ? L : C, to = T[Math.floor(r() * T.length)];
      if (/^f:/.test(p.id)) w.fa[p.id] = 1; else w.free = w.free.filter(x => x.p.id !== p.id);
      deal(p, null, to.id, extra);
    };
    const pool = FA.filter(p => !/^x:/.test(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 15);
    for (let i = 0; i < WM.free && pool.length; i++) { const j = Math.floor(r() * pool.length), p = pool.splice(j, 1)[0]; sign(p, null); }
    FA.filter(p => /^x:/.test(p.id)).forEach(p => { if (r() < 0.4) sign(p, { me: 2 }); });
    }

    // 4. os boatos do próximo lote
    function rumors() {
      const seen = {};
      const add = (p, from, to, nw, rm, two) => { if ((seen[p.id] && !two) || used[p.id]) return; seen[p.id] = 1;
        const x = Object.assign({ k: 'b', id: p.id, n: p.n, pos: p.pos, age: p.age, from, to, v: 0 }, nw);
        news(co, w, x); w.rm.push(Object.assign({ id: p.id, from, to, ok: r() < WM.rumOk ? 1 : 0, ni: x.i }, rm)); };
      // os clubes da sua liga
      ids.filter(id => id !== me).forEach(id => { if (r() >= WM.rum) return; const x = pick(D.CLUB_BY_ID[id]); if (x) add(x.p, x.from, id, null, x.up ? { up: 1 } : null); });
      // quem você observa (na primeira temporada da primeira carreira, só a partir da 2ª semana)
      const obs = m && m.obs ? Object.keys(m.obs) : [];
      if (obs.length && S.coMktFind && !(co.first && !(co.hist && co.hist.length) && co.ss.i < 1)) obs.forEach(id => {
        if (r() >= WM.rumObs) return;
        const p = S.coMktFind(co, id); if (!p || !p.club || p.club === me || (m.neg && m.neg[id]) || (m.got && m.got[id])) return;
        const f = D.CLUB_BY_ID[p.club], fc = D.countryOf(f), old = p.age >= 32, ok = c => c.id !== me && c.id !== f.id && c.strength >= f.strength - (old ? 10 : 2) && c.strength <= f.strength + (old ? 0 : 12); // veterano não sobe de patamar
        let C = D.CLUBS.filter(c => c.strength && D.countryOf(c) === fc && ok(c)); if (!C.length) C = D.CLUBS.filter(c => c.strength && ok(c)); if (!C.length) return;
        const c1 = C[Math.floor(r() * C.length)].id; add(p, f.id, c1, { obs: 1 }, null);
        const C2 = C.filter(c => c.id !== c1); if (C2.length && r() < WM.rumTwo) add(p, f.id, C2[Math.floor(r() * C2.length)].id, { obs: 1 }, null, 1); // dois clubes atrás do mesmo jogador: fecha com o primeiro que der certo
      });
      // a proposta que vai chegar por um dos seus (a janela do meio; em clube novo, as que esperam a 3ª semana)
      if (!S.coMktIncPeek) return;
      let L = [];
      if (k === 'eve') L = S.coMktIncPeek(co, 'mid');
      else if (co.since === co.season && co.ss.i + 1 === S.CO_MKT.incFrom) L = m && m.incK === 'pre' ? (m.inc || []).filter(o => o.st === 'open') : S.coMktIncPeek(co, 'pre');
      L.filter(o => !o.ask).forEach(o => { const p = co.squad.find(q => q.id === o.id); if (p) add(p, me, o.club, { me: 1 }, { me: 1 }); });
    }
  }

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
