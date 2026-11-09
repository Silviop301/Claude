// Modo Treinador, mercado. Lote 1 (2026-11-09): procurar com filtros, resultado e ficha. Lote 2 (09/11): janela com dias,
// proposta ao clube (presidente com humor e paciência, contraproposta), contrato com o empresário (humor a cada toque) e a chegada.
// Plano: doc "Treinador: plano da tela enxuta do mercado"; quadros 23, 23b e 24 do canvas das telas enxutas.
// Os jogadores dos outros vêm de S.coGenSquad: elenco real (src/real-squads.js, API-Football) quando o clube tem, senão sorteado. Força dos outros nunca em número: uma faixa contra o seu
// titular da posição, que estreita a cada relatório do olheiro (co.mkt.rep[id] = 1..3). A sua liga o olheiro já conhece.
// co.mkt = { s (temporada), rep: { id: n }, f: [6 índices dos filtros], nm (nome digitado), obs: { id: 1 }, wk/used (janela e dias gastos),
//           neg: { id: { pat, st: open|ok|no|signed, ans, cv, deal: {v, pay, tr}, apat } }, got: { id: 1 } }; parcelas em co.fin.inst
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const M = S.CO_MKT = {
    max: 40,          // a busca só libera com até 40 jogadores
    free: 40,         // jogadores sem clube por temporada
    reps: 3,          // relatórios por jogador (cada um estreita a faixa)
    rep0: 5000, repK: 0.25, repUp: [1, 1.5, 2.25],   // preço do relatório: 1/4 da receita semanal do clube (mín. R$ 5 mil), sobe a cada um; exterior x2
    half: [7, 4, 2],  // meia largura da faixa (pontos de força) com 1, 2 e 3 relatórios
    err: [3, 2, 1],   // quanto o centro da faixa pode errar
    span: 15,         // a régua vai de 15 pontos pior a 15 melhor que o titular
    eq: 2,            // até 2 pontos de diferença = igual
    preR: 3, incFrom: 2, // a janela do começo vale nas 3 primeiras rodadas; em clube novo as propostas pelos seus só chegam na 3ª semana
    days: { pre: 10, mid: 6 }, // dias da janela: pré-temporada e meio do ano (antes da rodada da metade)
    pat: 3,           // paciência do presidente e do empresário (cada recusa gasta 1)
    cut: [0.8, 1, 1.2], // atalhos da proposta: baixa, justa (o preço da ficha) e alta
    payPen: [0, 0.04, 0.08], // à vista, 2x, 3x: o presidente aceita um pouco menos parcelado
    counter: 0.8,     // a partir de 80% do que ele quer, contrapõe; abaixo, recusa
    trade: 0.8,       // jogador na troca vale 80% do valor dele
    maxSquad: 32
  };
  const POS_NM = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meia', ATA: 'Atacante' };
  S.CO_POS_NM = POS_NM;

  // ---------- a fonte: todos os jogadores dos outros clubes na temporada (e os sem clube) ----------
  let cache = null;
  S.coMktPool = function (co) {
    const key = co.season + '|' + co.club + '|' + co.squad.map(p => p.api || '').join(',');
    if (cache && cache.k === key) return cache.list;
    const list = [];
    D.CLUBS.forEach(cl => {
      if (cl.id === co.club) return;
      S.coGenSquad(cl.id, co.season, co).forEach(p => { list.push(Object.assign({}, p, { club: cl.id, lg: cl.league })); });
    });
    // Sem clube: veteranos e quem sobrou, sorteados pela temporada
    for (let i = 0; i < M.free; i++) {
      const h = hash('free|' + co.season + '|' + i), cl = D.CLUBS[h % D.CLUBS.length], sq = S.coGenSquad(cl.id, co.season - 1, co), p = sq[(h >>> 8) % sq.length];
      list.push(Object.assign({}, p, { id: 'f:' + co.season + ':' + i, club: null, lg: cl.league, ct: 0, age: p.age + 1, ovr: Math.max(30, p.ovr - 3) }));
    }
    cache = { k: key, list };
    return list;
  };

  S.coMkt = co => {
    if (!co.mkt || co.mkt.s !== co.season) co.mkt = { s: co.season, rep: {}, f: (co.mkt && co.mkt.f) || [0, 0, 0, 0, 0, 0], nm: '', obs: {}, neg: {}, got: {} };
    if (!co.mkt.neg) { co.mkt.neg = {}; co.mkt.got = {}; }
    return co.mkt;
  };
  // O titular da posição: o mais forte do seu elenco nela
  S.coMktStarter = (co, pos) => co.squad.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0] || null;
  // Relatórios que o olheiro tem: a sua liga ele já conhece (1); depois, os que você pediu
  S.coMktReps = (co, p) => { const m = S.coMkt(co), r = m.rep[p.id] || 0; return Math.max(r, p.lg === S.coLeague(co) ? 1 : 0); };
  S.coLeague = co => D.CLUB_BY_ID[co.club].league;
  S.coMktPrice = p => (p.club ? S.coValue(p) : 0);

  // A faixa contra o titular: { lo, hi } em pontos de força (negativo = pior), com o erro do olheiro sorteado por jogador
  S.coMktBand = (co, p) => {
    const n = S.coMktReps(co, p); if (!n) return null;
    const st = S.coMktStarter(co, p.pos), d = p.ovr - (st ? st.ovr : p.ovr), h = hash(p.id + '|olheiro');
    const e = M.err[n - 1], c = d + ((h % (2 * e + 1)) - e), w = M.half[n - 1];
    return { lo: c - w, hi: c + w, mid: c, n, st };
  };
  // Uma palavra pela faixa (a lista usa o meio; a ficha, a faixa inteira)
  const word1 = v => (v > M.eq ? 'melhor' : v < -M.eq ? 'pior' : 'igual');
  S.coMktWord = (b, whole) => {
    if (!b) return '';
    if (!whole) return word1(b.mid);
    if (b.lo > M.eq) return 'melhor'; if (b.hi < -M.eq) return 'pior';
    if (b.lo >= -M.eq && b.hi <= M.eq) return 'igual';
    if (b.lo >= -M.eq) return 'igual ou melhor'; if (b.hi <= M.eq) return 'igual ou pior';
    return 'incerto';
  };
  // Potencial em palavras (com relatório): o quanto ainda cresce
  S.coMktPot = p => { const g = p.pot - p.ovr; return g >= 12 ? ['Ainda cresce bastante', 4] : g >= 6 ? ['Ainda cresce', 3] : g >= 2 ? ['Cresce pouco', 2] : ['Já está no auge', 1]; };
  // Jeito de jogar: 2 características (e uma fraqueza no relatório completo). Sorteadas pelo jogador até a API trazer as reais.
  const TR = {
    GOL: [['Bom no alto', 'Reflexo rápido', 'Sai bem do gol', 'Joga com os pés'], ['Fraco no alto', 'Demora a sair', 'Erra com os pés']],
    ZAG: [['Forte no alto', 'Rápido', 'Bom no desarme', 'Sai jogando bem', 'Líder'], ['Sai jogando mal', 'Lento', 'Erra no alto']],
    LAT: [['Rápido', 'Bom cruzamento', 'Fôlego', 'Marca bem'], ['Marca mal', 'Cruza mal', 'Cansa cedo']],
    MEI: [['Bom passe', 'Chute de fora', 'Drible', 'Rouba bola', 'Visão de jogo'], ['Perde a bola', 'Lento', 'Marca mal']],
    ATA: [['Finalização', 'Rápido', 'Forte no alto', 'Drible', 'Faro de gol'], ['Desperdiça', 'Fraco no alto', 'Isolado']]
  };
  S.coMktTraits = p => {
    const L = TR[p.pos] || TR.MEI, h = hash(p.id + '|jeito'), a = h % L[0].length, b = (a + 1 + (h >>> 4) % (L[0].length - 1)) % L[0].length;
    return { good: [L[0][a], L[0][b]], bad: L[1][(h >>> 9) % L[1].length] };
  };

  // ---------- filtros ----------
  // Cada filtro: rótulo e opções { t, ok(p, ctx) }. ctx = { co, verba, lg, cty }
  S.coMktFilters = function (co) {
    const f = S.coFin ? S.coFin(co) : { verba: 0 }, verba = Math.max(0, f.verba || 0), lg = S.coLeague(co), cty = D.LEAGUE_BY_ID[lg].country;
    const brl = v => (v >= 1e6 ? 'R$ ' + (Math.round(v / 1e5) / 10).toString().replace('.', ',') + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil');
    const ligas = D.LEAGUES.filter(l => l.country === cty).sort((a, b) => (a.id === lg ? -1 : b.id === lg ? 1 : 0));
    const lvl = (p, w) => { const b = S.coMktBand(co, p); return b && word1(b.mid) === w; };
    return [
      { k: 'pos', t: 'POSIÇÃO', o: [{ t: 'Qualquer' }].concat(['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].map(x => ({ t: POS_NM[x], ok: p => p.pos === x }))) },
      { k: 'niv', t: 'NÍVEL', o: [{ t: 'Qualquer' }, { t: 'Reserva', ok: p => lvl(p, 'pior') }, { t: 'Igual ao titular', ok: p => lvl(p, 'igual') }, { t: 'Melhor que o titular', ok: p => lvl(p, 'melhor') }] },
      { k: 'ida', t: 'IDADE', o: [{ t: 'Qualquer' }, { t: 'Até 21', ok: p => p.age <= 21 }, { t: 'Até 25', ok: p => p.age <= 25 }, { t: 'Até 29', ok: p => p.age <= 29 }, { t: '30 ou mais', ok: p => p.age >= 30 }] },
      { k: 'pre', t: 'PREÇO ATÉ', o: [{ t: 'Qualquer' }, { t: brl(Math.max(100000, Math.round(verba / 2))), ok: p => S.coMktPrice(p) <= Math.max(100000, verba / 2) }, { t: brl(verba) + ' · verba', ok: p => S.coMktPrice(p) <= verba }, { t: brl(verba * 2), ok: p => S.coMktPrice(p) <= verba * 2 }] },
      { k: 'lig', t: 'LIGA', o: [{ t: 'Qualquer' }].concat(ligas.map(l => ({ t: l.name, ok: p => p.lg === l.id }))).concat([{ t: 'Exterior', ok: p => D.LEAGUE_BY_ID[p.lg].country !== cty }]) },
      { k: 'sit', t: 'SITUAÇÃO', o: [{ t: 'Qualquer' }, { t: 'Contrato acabando', ok: p => p.club && p.ct <= 1 }, { t: 'Sem contrato', ok: p => !p.club }, { t: 'Observados', ok: p => !!S.coMkt(co).obs[p.id] }] }
    ];
  };
  // Quem passa nos filtros de agora (e no nome digitado, 3 letras ou mais)
  S.coMktSearch = function (co) {
    const m = S.coMkt(co), F = S.coMktFilters(co), nm = (m.nm || '').trim().toLowerCase();
    const on = F.map((x, i) => x.o[m.f[i] || 0]).filter(o => o && o.ok);
    return S.coMktPool(co).filter(p => !m.got[p.id] && on.every(o => o.ok(p)) && (nm.length < 3 || p.n.toLowerCase().indexOf(nm) >= 0));
  };
  // Ordem do resultado: com relatório primeiro, do melhor para o pior; depois o mais barato
  S.coMktSort = (co, list) => list.map(p => ({ p, b: S.coMktBand(co, p) })).sort((x, y) => (y.b ? 1 : 0) - (x.b ? 1 : 0) || (y.b && x.b ? y.b.mid - x.b.mid : 0) || S.coMktPrice(x.p) - S.coMktPrice(y.p)).map(x => x.p);
  // Mais um relatório: gasta 1 dia com a janela aberta (fora dela o olheiro trabalha sem pressa)
  // relatório pago (24c, 09/11): sai do caixa, não gasta dia; cada um custa mais que o anterior e do exterior o dobro
  S.coMktRepCost = (co, p) => {
    const n = S.coMktReps(co, p); if (n >= M.reps) return 0;
    const base = Math.max(M.rep0, (S.coFinBase ? S.coFinBase(co) : 0) * M.repK);
    const fora = D.LEAGUE_BY_ID[p.lg].country !== D.LEAGUE_BY_ID[S.coLeague(co)].country ? 2 : 1;
    return Math.round(base * M.repUp[n] * fora / 1000) * 1000;
  };
  S.coMktReport = (co, p) => {
    const m = S.coMkt(co), n = S.coMktReps(co, p); if (n >= M.reps) return false;
    const cost = S.coMktRepCost(co, p), f = S.coFin ? S.coFin(co) : null;
    if (f && cost) { if ((f.caixa || 0) < cost) return false; f.caixa -= cost; if (f.ss) f.ss.comp = (f.ss.comp || 0) + cost; }
    m.rep[p.id] = n + 1; return true;
  };
  S.coMktObs = (co, p) => { const m = S.coMkt(co); if (m.obs[p.id]) delete m.obs[p.id]; else m.obs[p.id] = 1; return !!m.obs[p.id]; };
  S.coMktFind = (co, id) => (S.coMkt(co).got[id] ? null : S.coMktPool(co).find(p => p.id === id) || null);

  // ---------- janela: 10 dias no começo, aberta até a rodada 3 (M.preR; Silvio 2026-11-09), e 6 antes da rodada da metade;
  // proposta e contrato gastam 1 ----------
  S.coMktWin = function (co) {
    const ss = co.ss; if (!ss || ss.done) return { open: false, next: null };
    const half = Math.floor(ss.rounds.length / 2), k = ss.i < Math.min(M.preR, half) ? 'pre' : ss.i === half ? 'mid' : null, m = S.coMkt(co);
    if (!k) return { open: false, next: ss.i < half ? half + 1 : null };
    if (m.wk !== k) { m.wk = k; m.used = 0; }
    const max = M.days[k];
    return { open: m.used < max, k, day: Math.min(m.used + 1, max), max, left: max - m.used, next: k === 'pre' ? half + 1 : null };
  };
  function spend(co) { const w = S.coMktWin(co); if (w.open) S.coMkt(co).used++; }
  const r10k = v => Math.max(10000, Math.round(v / 10000) * 10000);
  const r1k = v => Math.max(1000, Math.round(v / 1000) * 1000);

  // ---------- proposta ao clube ----------
  // Presidente do outro clube: o humor dele pelo jogador (sorteado por jogador; contrato acabando deixa mais vendedor)
  const PRES = [{ t: 'Quer vender', k: 0.9, c: 'up' }, { t: 'Aceita negociar', k: 1, c: '' }, { t: 'Não quer vender', k: 1.18, c: 'dn' }];
  S.CO_MKT_PRES = PRES;
  S.coMktPres = (co, p) => { const h = hash(p.id + '|pres') % 10; let i = h < 3 ? 0 : h < 8 ? 1 : 2; if (p.ct <= 1 && i) i--; return i; };
  // O que ele quer de verdade (escondido): o preço da ficha pelo humor, menos a sua negociação
  S.coMktAsk = (co, p) => r10k(S.coMktPrice(p) * PRES[S.coMktPres(co, p)].k * (1 - 0.015 * ((co.xp && co.xp.negoc) || 0)));
  S.coMktCuts = p => M.cut.map(k => r10k(S.coMktPrice(p) * k));
  S.coMktNeg = (co, p) => { const m = S.coMkt(co); return m.neg[p.id] || (m.neg[p.id] = { pat: M.pat, apat: M.pat, st: 'open' }); };
  // Quem pode ir na troca: reservas (fora do time titular) sem deixar a posição com menos de 2
  S.coMktTradeList = co => co.squad.filter(q => !(co.xi || []).includes(q.id) && co.squad.filter(x => x.pos === q.pos).length > 2)
    .sort((a, b) => S.coValue(b) - S.coValue(a)).slice(0, 6);
  const tradeVal = (co, id) => { const q = id && co.squad.find(x => x.id === id); return q ? r10k(S.coValue(q) * M.trade) : 0; };
  S.coMktTradeVal = tradeVal;
  // Quanto sai da verba agora: o valor menos a troca, dividido nas parcelas
  S.coMktNow = (co, o) => { const cash = Math.max(0, o.v - tradeVal(co, o.tr)); return Math.ceil(cash / ((o.pay || 0) + 1) / 1000) * 1000; };
  // Envia: { k: 'ok' | 'counter' (v) | 'recusa' | 'no' (acabou a paciência) | 'fechada' | 'verba' }
  S.coMktOffer = function (co, p, o) {
    const n = S.coMktNeg(co, p), f = S.coFin(co);
    if (!p.club) return { k: 'ok' };
    if (n.st === 'no' || n.st === 'signed') return { k: n.st };
    if (n.st === 'ok') return { k: 'ok' };
    if (!S.coMktWin(co).open) return { k: 'fechada' };
    if (S.coMktNow(co, o) > Math.max(0, f.verba)) return { k: 'verba' };
    spend(co);
    const ask = S.coMktAsk(co, p), tv = tradeVal(co, o.tr), pen = M.payPen[o.pay || 0], eff = (o.v + tv) * (1 - pen);
    if (eff >= ask) { n.st = 'ok'; n.deal = { v: o.v, pay: o.pay || 0, tr: o.tr || null }; n.ans = { k: 'ok' }; return n.ans; }
    n.pat--;
    if (n.pat <= 0) { n.st = 'no'; n.ans = { k: 'no' }; return n.ans; }
    if (eff >= ask * M.counter) { n.cv = r10k(ask / (1 - pen) - tv); n.ans = { k: 'counter', v: n.cv }; return n.ans; }
    n.ans = { k: 'recusa' }; return n.ans;
  };

  // ---------- contrato com o empresário ----------
  // O que ele pede: salário de hoje (+10% para mudar de clube, +25% sem clube, que não custa transferência), pelo papel;
  // anos que ele prefere pela idade
  const ROLE = [{ k: 'tit', t: 'Titular', w: 0.9, d: 'Joga quase sempre. Se passar 3 jogos no banco, ele cobra a promessa.' },
    { k: 'rod', t: 'Rodízio', w: 1, d: 'Divide a vaga com o titular. Pede um salário normal.' },
    { k: 'apo', t: 'Aposta', w: 1.2, d: 'Começa no banco e cresce aos poucos. Pede mais para aceitar esperar.' }];
  S.CO_MKT_ROLE = ROLE;
  S.coMktTerms = (co, p) => {
    const own = co.squad.some(x => x.id === p.id), mo = p.mo === undefined ? 60 : p.mo;
    // renovação: o salário de hoje, mais quanto ele cresceu e menos quanto está feliz
    const base = own ? p.wage * (mo >= 70 ? 1.05 : mo >= 45 ? 1.15 : 1.3) * (p.age <= 27 ? 1.1 : 1) : p.wage * (p.club ? 1.1 : 1.25), want = p.age <= 23 ? 4 : p.age <= 28 ? 3 : p.age <= 31 ? 2 : 1;
    return { base, want, ask: role => r1k(base * ROLE[role].w), step: base < 10000 ? 500 : r1k(base * 0.05) };
  };
  // Humor do empresário a cada toque: 1 não vai topar, 2 longe, 3 quase lá, 4 deve aceitar (só o 4 assina)
  S.coMktMood = (co, p, t) => {
    const T = S.coMktTerms(co, p), ask = T.ask(t.role), d = (t.w / ask - 1) * 10, sc = d * 1.2 - Math.abs(t.y - T.want) * 0.8;
    const lvl = sc >= 0 ? 4 : sc >= -1.5 ? 3 : sc >= -3 ? 2 : 1;
    return { lvl, t: ['', 'Não vai topar', 'Longe', 'Quase lá', 'Deve aceitar'][lvl], ask };
  };
  // Folha depois da chegada (sai o da troca) contra o teto
  S.coMktFolha = (co, p, t) => { const n = S.coMkt(co).neg[p.id], tr = n && n.deal && n.deal.tr, q = tr && co.squad.find(x => x.id === tr);
    const own = co.squad.find(x => x.id === p.id), f = S.coFin(co), fol = S.coFolha(co) + t.w - (q ? q.wage : 0) - (own ? own.wage : 0); return { fol, pct: Math.round(100 * fol / Math.max(1, f.teto)) }; };
  // Oferece: { k: 'signed' (jogador), | 'recusa' | 'no' | 'teto' | 'cheio' | 'fechada' | 'verba' }
  S.coMktContract = function (co, p, t) {
    const n = S.coMktNeg(co, p), f = S.coFin(co), m = S.coMkt(co);
    if (n.st === 'no' || n.st === 'signed') return { k: n.st };
    if (p.club && n.st !== 'ok') return { k: 'no' };
    if (p.club && !S.coMktWin(co).open) return { k: 'fechada' };
    if (S.coMktFolha(co, p, t).pct > 100) return { k: 'teto' };
    if (co.squad.length >= M.maxSquad) return { k: 'cheio' };
    const d = n.deal || { v: 0, pay: 0, tr: null }, now = p.club ? S.coMktNow(co, d) : 0;
    if (now > Math.max(0, f.verba)) return { k: 'verba' };
    spend(co);
    if (S.coMktMood(co, p, t).lvl < 4) { n.apat--; if (n.apat <= 0) { n.st = 'no'; return { k: 'no' }; } return { k: 'recusa' }; }
    // Fechado: paga a 1ª parcela, o resto vem a cada 4 rodadas; o da troca sai; o novo chega no banco
    if (now) { f.verba -= now; f.caixa -= now; f.ss.comp += now; }
    const left = Math.max(0, d.v - tradeVal(co, d.tr)) - now;
    if (d.pay && left > 0) { f.inst = f.inst || []; f.inst.push({ n: p.n, v: Math.ceil(left / d.pay / 1000) * 1000, k: d.pay }); }
    if (d.tr) { co.squad = co.squad.filter(x => x.id !== d.tr); co.xi = (co.xi || []).filter(x => x !== d.tr); co.bench = (co.bench || []).filter(x => x !== d.tr); }
    const np = Object.assign({}, p, { id: 'p' + (co.pid++), wage: t.w, ct: t.y, role: ROLE[t.role].k, mo: 70, en: 100, out: 0, sus: 0, from: p.club || null });
    delete np.club; delete np.lg; delete np.num;
    co.squad.push(np);
    m.got[p.id] = 1; n.st = 'signed';
    return { k: 'signed', p: np };
  };
  // Parcelas das compras a cada 4 rodadas (chamado pela semana das finanças)
  S.coMktWeek = (co, ri, sub, add) => {
    const f = co.fin; if (!f) return;
    if (ri === 0 && add) futPay(co, add);
    if ((ri + 1) % 4) return;
    if (f.inst && f.inst.length) { f.inst.forEach(x => { sub('comp', x.v); f.verba = Math.max(0, f.verba - x.v); x.k--; }); f.inst = f.inst.filter(x => x.k > 0); }
    if (f.recv && f.recv.length && add) { f.recv.forEach(x => { add('vend', x.v); f.verba += Math.round(x.v * M.sellVerba); x.k--; }); f.recv = f.recv.filter(x => x.k > 0); }
  };

  // ---------- renovar (lote 4, 09/11): o seu jogador, a qualquer hora, na mesma tela do contrato ----------
  S.coMktRenNeg = (co, p) => { const m = S.coMkt(co); m.ren = m.ren || {}; return m.ren[p.id] || (m.ren[p.id] = { apat: M.pat, st: 'open' }); };
  S.coMktRenOk = (co, p) => p.ct <= M.renMax;
  // { k: 'signed' (p) | 'recusa' | 'no' | 'teto' | 'cedo' }
  S.coMktRenew = function (co, p, t) {
    const n = S.coMktRenNeg(co, p);
    if (n.st === 'no' || n.st === 'signed') return { k: n.st };
    if (!S.coMktRenOk(co, p)) return { k: 'cedo' };
    if (S.coMktFolha(co, p, t).pct > 100 && t.w > p.wage) return { k: 'teto' };
    if (S.coMktMood(co, p, t).lvl < 4) { n.apat--; if (n.apat <= 0) { n.st = 'no'; return { k: 'no' }; } return { k: 'recusa' }; }
    p.wage = t.w; p.ct = t.y; p.role = ROLE[t.role].k; p.mo = Math.min(100, (p.mo === undefined ? 60 : p.mo) + 8); n.st = 'signed';
    return { k: 'signed', p };
  };

  // ---------- vender (lote 4, 09/11): propostas só com a janela aberta, negociação em rodadas (como no FIFA), % de venda futura ----------
  // co.sell = { id: 1 } à venda (vale entre temporadas); co.mkt.inc = [{ id, club, v, max, pay, fut, pat, st, hist, wish, seen }];
  // co.fin.recv = parcelas a receber; co.fin.fut = [{ n, pct, base, s, club }] (% de uma venda futura)
  Object.assign(M, { renMax: 2, inc: 0.06, incList: 0.65, incMax: 2, sellPat: 3, sellLo: [0.78, 0.92], sellHi: [1.05, 1.3],
    sellPay: [0.05, 0, -0.04], sellFut: [0, 0.05, 0.11], futPct: [0, 10, 20], futP: 0.25, futS: 3, sellVerba: 0.5 });
  const MINP = { GOL: 2, ZAG: 3, LAT: 2, MEI: 3, ATA: 2 };
  const rngS = (co, k) => S.rng(hash((co.seed || 0) + '|' + co.season + '|' + k));
  S.coMktCanSell = (co, p) => co.squad.length > 18 && co.squad.filter(x => x.pos === p.pos).length > (MINP[p.pos] || 2);
  S.coMktListed = (co, p) => !!(co.sell && co.sell[p.id]);
  function buyerOf(co, p, r) {
    const me = D.CLUB_BY_ID[co.club], cty = D.countryOf(me), lo = Math.max(me.strength - 4, p.ovr - 6);
    const fora = r() < 0.15, all = Object.values(D.CLUB_BY_ID).filter(c => c.id !== co.club && c.strength && (D.countryOf(c) === cty) !== fora);
    const ok = all.filter(c => c.strength >= lo && c.strength <= p.ovr + 14), L = ok.length ? ok : all;
    return L.length ? L[Math.floor(r() * L.length)] : null;
  }
  function mkOffer(co, p, r) {
    const b = buyerOf(co, p, r); if (!b) return null;
    const val = S.coValue(p), me = D.CLUB_BY_ID[co.club], xi = (co.xi || []).includes(p.id), mo = p.mo === undefined ? 60 : p.mo;
    const wish = b.strength > me.strength + 4 && (mo < 60 || !xi || r() < 0.5) ? 1 : xi && mo >= 70 && b.strength <= me.strength ? 2 : 0;
    const lo = M.sellLo[0] + r() * (M.sellLo[1] - M.sellLo[0]), hi = M.sellHi[0] + r() * (M.sellHi[1] - M.sellHi[0]);
    const v = r10k(val * lo);
    return { id: p.id, club: b.id, v, v0: v, max: Math.max(v, r10k(val * hi * (S.coMktListed(co, p) ? 0.95 : 1))), pay: r() < 0.5 ? 0 : 1, fut: 0, pat: M.sellPat, st: 'open', hist: [['eles', v]], wish, seen: 0 };
  }
  // Propostas da janela aberta: sorteadas uma vez quando ela abre (mais para quem está à venda). Na 1ª temporada num
  // clube (co.since), as da janela do começo só aparecem a partir da 3ª semana (M.incFrom): primeiro a pessoa conhece o
  // elenco (Silvio 2026-11-09); quem ela mesma pôs à venda (o.ask) recebe na hora
  S.coMktInbox = function (co) {
    const w = S.coMktWin(co), m = S.coMkt(co); m.inc = m.inc || [];
    if (!w.open) return [];
    const early = w.k === 'pre' && co.since === co.season && co.ss.i < M.incFrom;
    if (m.incK !== w.k) {
      m.incK = w.k; m.inc = []; const r = rngS(co, 'inc' + w.k);
      const cand = co.squad.filter(p => S.coMktCanSell(co, p) && !p.from).map(p => ({ p, x: r() / (M.inc * (1 + Math.max(0, p.ovr - 60) / 20) + (S.coMktListed(co, p) ? M.incList : 0)) }))
        .filter(o => o.x < 1).sort((a, b) => a.x - b.x);
      const nList = cand.filter(o => S.coMktListed(co, o.p)).length;
      cand.slice(0, M.incMax + nList).forEach(o => { const of = mkOffer(co, o.p, r); if (of) { if (S.coMktListed(co, o.p)) of.ask = 1; m.inc.push(of); } });
    }
    return m.inc.filter(o => o.st === 'open' && (!early || o.ask) && co.squad.some(p => p.id === o.id));
  };
  S.coMktOfferFor = (co, p) => S.coMktInbox(co).find(o => o.id === p.id) || null;
  // Pôr à venda / tirar; com a janela aberta, quem entra à venda pode receber proposta na hora
  S.coMktList = function (co, p, on) {
    co.sell = co.sell || {}; if (on) co.sell[p.id] = 1; else delete co.sell[p.id];
    if (!on) return null;
    const box = S.coMktInbox(co), m = S.coMkt(co); if (!S.coMktWin(co).open || box.some(o => o.id === p.id) || (m.inc || []).some(o => o.id === p.id) || !S.coMktCanSell(co, p)) return null;
    const r = rngS(co, 'list' + p.id + '|' + (m.used || 0)); if (r() > M.incList) return null;
    const of = mkOffer(co, p, r); if (of) { of.ask = 1; m.inc.push(of); } return of;
  };
  // Quanto vale o pedido para eles: à vista e % alta pesam
  const sellEff = (v, pay, fut) => v * (1 + M.sellPay[pay || 0] + M.sellFut[fut || 0]);
  // Contraproposta: { k: 'ok' (vendido, sale) | 'counter' (v) | 'no' }
  S.coMktSellTry = function (co, o, ask, pay, fut) {
    if (o.st !== 'open') return { k: o.st };
    o.hist.push(['voce', ask]);
    if (sellEff(ask, pay, fut) <= o.max) return { k: 'ok', sale: sellDo(co, o, ask, pay, fut) };
    o.pat--;
    if (o.pat <= 0) { o.st = 'no'; return { k: 'no' }; }
    const cap = o.max / (1 + M.sellPay[pay || 0] + M.sellFut[fut || 0]);
    const nv = Math.max(o.v + 10000, Math.min(r10k(cap) - 10000, r10k(o.v + (Math.min(ask, cap) - o.v) * 0.6)));
    o.v = Math.min(nv, ask - 10000); o.pay = pay; o.fut = fut; o.hist.push(['eles', o.v]);
    return { k: 'counter', v: o.v };
  };
  // Humor do diretor a cada toque (4 tracinhos, como o empresário): o quanto o pedido passa do teto escondido
  S.coMktSellMood = (co, o, t) => { const g = sellEff(t.v, t.pay, t.fut) / o.max - 1, lvl = g <= -0.06 ? 4 : g <= 0.06 ? 3 : g <= 0.2 ? 2 : 1; // "Perto" esconde o teto: pode aceitar ou não
    return { lvl, t: ['', 'Vai desistir', 'Longe', 'Perto', 'Deve aceitar'][lvl] }; };
  S.coMktSellAccept = (co, o) => (o.st === 'open' ? { k: 'ok', sale: sellDo(co, o, o.v, o.pay, o.fut) } : { k: o.st });
  S.coMktSellReject = function (co, o) {
    if (o.st !== 'open') return false; o.st = 'rej';
    const p = co.squad.find(x => x.id === o.id); if (p && o.wish === 1) p.mo = Math.max(0, (p.mo === undefined ? 60 : p.mo) - 15);
    return true;
  };
  function sellDo(co, o, v, pay, fut) {
    const f = S.coFin(co), p = co.squad.find(x => x.id === o.id); if (!p) return null;
    co.squad = co.squad.filter(x => x !== p);
    if ((co.xi || []).includes(p.id) || (co.bench || []).includes(p.id)) { const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.bench = a.bench; }
    if (co.sell) delete co.sell[p.id];
    const now = Math.ceil(v / ((pay || 0) + 1) / 1000) * 1000, left = v - now;
    f.caixa += now; f.ss.vend += now; f.verba += Math.round(now * M.sellVerba);
    if (pay && left > 0) { f.recv = f.recv || []; f.recv.push({ n: p.n, v: Math.ceil(left / pay / 1000) * 1000, k: pay }); }
    if (fut) { f.fut = f.fut || []; f.fut.push({ n: p.n, pct: M.futPct[fut], base: v, s: co.season, club: o.club }); }
    o.st = 'sold'; o.v = v; o.pay = pay || 0; o.fut = fut || 0;
    return { p, v, now, pay: pay || 0, fut: fut || 0 };
  }
  // % de venda futura: a cada temporada nova, chance de o clube revender o jogador e pagar a sua parte
  function futPay(co, add) {
    const f = co.fin; if (!f.fut || !f.fut.length) return;
    const r = rngS(co, 'fut');
    f.fut = f.fut.filter(x => {
      if (x.s >= co.season) return true;
      if (r() < M.futP) { const v = r10k(x.base * (1.1 + r() * 0.6) * x.pct / 100); add('vend', v); f.verba += Math.round(v * M.sellVerba);
        if (S.coFinNews) S.coFinNews(co, x.n + ' foi vendido de novo: os ' + x.pct + '% da venda futura renderam R$ ' + (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1000) + ' mil') + ' ao caixa.');
        return false; }
      return co.season - x.s < M.futS;
    });
  }

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
