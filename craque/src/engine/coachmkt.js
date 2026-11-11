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
    atHalf: [8, 4, 0], atErr: 4,   // atributos na ficha: meia largura da faixa com 1, 2 e 3 relatórios (0 = o número certo) e o erro do centro no 1º (cai pela metade no 2º)
    span: 15,         // a régua vai de 15 pontos pior a 15 melhor que o titular
    eq: 2,            // até 2 pontos de diferença = igual
    preR: 3, incFrom: 2, // a janela do começo vale nas 3 primeiras rodadas; em clube novo as propostas pelos seus só chegam na 3ª semana
    midR: 2, // a janela do meio vale 2 rodadas (38 rodadas: aberta nas semanas das rodadas 20 e 21, fechada na 22). Sem dias desde 11/11
    pat: 3,           // paciência do presidente e do empresário (cada recusa gasta 1)
    quase: 1 / 3,     // "Quase lá" no contrato e na renovação: chance de ele assinar mesmo assim (Silvio 2026-11-11)
    cut: [0.8, 1, 1.2], // atalhos da proposta: baixa, justa (o preço da ficha) e alta
    payPen: [0, 0.04, 0.08], // à vista, 2x, 3x: o presidente aceita um pouco menos parcelado
    counter: 0.8,     // a partir de 80% do que ele quer, contrapõe; abaixo, recusa
    trade: 0.8,       // jogador na troca vale 80% do valor dele
    maxSquad: 28      // limite do elenco (Silvio 2026-11-10): todo clube começa com 25, cabem 2 contratações e 1 garoto da base. Só barra quem chega
  };
  const POS_NM = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meia', ATA: 'Atacante' };
  S.CO_POS_NM = POS_NM;

  // ---------- a fonte: todos os jogadores dos outros clubes na temporada (e os sem clube) ----------
  let cache = null;
  S.coMktPool = function (co) {
    // com o mercado vivo (co.wm) a lista muda a cada negócio dos outros e a cada compra sua
    const key = co.season + '|' + co.club + '|' + co.squad.map(p => p.api || '').join(',') + '|' + (co.wm ? co.wm.v : 0) + '|' + (co.mkt && co.mkt.s === co.season && co.mkt.got ? Object.keys(co.mkt.got).length : 0);
    if (cache && cache.k === key) return cache.list;
    const list = [];
    D.CLUBS.forEach(cl => {
      if (cl.id === co.club) return;
      S.coGenSquad(cl.id, co.season, co).forEach(p => { list.push(Object.assign({}, p, { club: cl.id, lg: cl.league })); });
    });
    S.coMktFree(co).forEach(p => list.push(p));
    cache = { k: key, list };
    return list;
  };

  // Sem clube: veteranos e quem sobrou, sorteados pela temporada (os 40 de sempre, menos os que já fecharam com um clube
  // no mercado vivo, co.wm.fa) e quem saiu do seu clube no fim do contrato (co.wm.free, id 'x:...')
  let fcache = null;
  S.coMktFree = function (co) {
    const w = co.wm && co.wm.s === co.season ? co.wm : null;
    const key = co.season + '|' + co.squad.map(p => p.api || '').join(',');
    if (!fcache || fcache.k !== key || fcache.w !== (co.wm || null) || fcache.v !== (co.wm ? co.wm.v : 0)) {
      const base = [];
      for (let i = 0; i < M.free; i++) {
        const h = hash('free|' + co.season + '|' + i), cl = D.CLUBS[h % D.CLUBS.length], sq = S.coGenSquad(cl.id, co.season - 1, co), p = sq[(h >>> 8) % sq.length];
        base.push(Object.assign({}, p, { id: 'f:' + co.season + ':' + i, club: null, lg: cl.league, ct: 0, age: p.age + 1, ovr: Math.max(30, p.ovr - 3) }));
      }
      fcache = { k: key, w: co.wm || null, v: co.wm ? co.wm.v : 0, base };
    }
    const out = fcache.base.filter(p => !(w && w.fa && w.fa[p.id]));
    if (w && w.free) w.free.forEach(x => { if (x.s === co.season) out.push(Object.assign({ mo: 60, en: 100, out: 0, sus: 0 }, x.p, { club: null, lg: x.lg, ct: 0 })); });
    return out;
  };

  S.coMkt = co => {
    if (!co.mkt || co.mkt.s !== co.season) co.mkt = S.coMktCarry(co, co.mkt);
    if (!co.mkt.neg) { co.mkt.neg = {}; co.mkt.got = {}; }
    return co.mkt;
  };
  // Observados de uma temporada para a outra (Silvio 11/11: "a lista vai precisar resetar no fim da temporada?"): não zera,
  // porque o relatório foi pago. Cada relatório perde um nível (3→2, 2→1; o 1 é de graça e não precisa guardar) e fica
  // "desatualizado" (m.old) até o próximo, porque o jogador muda. Sai da lista quem veio para o seu elenco e quem não existe
  // mais: só jogador real (id r:) segue de um ano para o outro; o sorteado e o sem clube nascem de novo a cada temporada
  S.coMktCarry = (co, o) => {
    const m = { s: co.season, rep: {}, f: (o && o.f) || [0, 0, 0, 0, 0, 0], ord: (o && o.ord) || 0, nm: '', obs: {}, neg: {}, got: {}, old: {} };
    if (!o) return m;
    const mine = {}; (co.squad || []).forEach(p => { mine[p.id] = 1; });
    const ok = id => id.indexOf('r:') === 0 && !mine[id] && !(o.got && o.got[id]);
    Object.keys(o.obs || {}).forEach(id => { if (ok(id)) m.obs[id] = 1; });
    Object.keys(o.rep || {}).forEach(id => { const r = o.rep[id] - 1; if (!ok(id) || r < 1) return; m.obs[id] = 1; m.old[id] = 1; if (r > 1) m.rep[id] = r; });
    return m;
  };
  S.coMktOld = (co, p) => !!(S.coMkt(co).old || {})[p.id];
  // O titular da posição: o mais forte do seu elenco nela
  S.coMktStarter = (co, pos) => co.squad.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0] || null;
  // Relatórios que o olheiro tem: todo mundo já vem com 1; depois, os que você pediu
  // Desde 11/11 o 1º relatório vale para todo mundo, de qualquer liga (Silvio: pagar a avaliação inicial de cada um de fora
  // acabava com o caixa); o 2º e o 3º seguem pagos, do exterior pelo dobro
  S.coMktReps = (co, p) => { const m = S.coMkt(co), r = m.rep[p.id] || 0; return Math.max(r, 1); };
  S.coLeague = co => D.CLUB_BY_ID[co.club].league;
  // piso de R$ 10 mil (o mesmo da pedida, r10k): garoto fraco de salário 0 saía na lista como "R$ 0" com clube
  S.coMktPrice = p => (p.club ? Math.max(10000, S.coValue(p)) : 0);

  // A faixa contra o titular: { lo, hi } em pontos de força (negativo = pior), com o erro do olheiro sorteado por jogador
  S.coMktBand = (co, p) => {
    const n = S.coMktReps(co, p); if (!n) return null;
    const st = S.coMktStarter(co, p.pos), d = p.ovr - (st ? st.ovr : p.ovr), h = hash(p.id + '|olheiro');
    const e = M.err[n - 1], c = d + ((h % (2 * e + 1)) - e), w = M.half[n - 1];
    return { lo: c - w, hi: c + w, mid: c, n, st };
  };
  // Sem relatório (outra liga), o filtro Nível vai pela fama: a diferença contra o titular com erro maior que o do 1º relatório
  // (M.err0). Só filtra: a lista e a ficha seguem sem faixa até o olheiro ver (Silvio 11/11: "a pesquisa não retornou")
  M.err0 = 5;
  S.coMktFame = (co, p) => { const st = S.coMktStarter(co, p.pos), h = hash(p.id + '|fama'); return p.ovr - (st ? st.ovr : p.ovr) + (h % (2 * M.err0 + 1)) - M.err0; };
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
  // Jeito de jogar: 2 características (e uma fraqueza no relatório completo), tiradas dos atributos do jogador (S.coAttrs):
  // vale o quanto cada atributo está acima ou abaixo do normal da posição (S.CO_AT.prof), não o número puro, senão todo
  // atacante seria "Finalização". Cada entrada: [texto, índice do atributo]; dois textos no mesmo atributo, o jogador escolhe um.
  const TR = {
    GOL: [[['Reflexo rápido', 0], ['Bem colocado', 1], ['Sai bem do gol', 2], ['Bom no alto', 3], ['Joga com os pés', 4], ['Pega pênalti', 5]], [['Reflexo lento', 0], ['Mal colocado', 1], ['Demora a sair', 2], ['Fraco no alto', 3], ['Erra com os pés', 4]]],
    ZAG: [[['Sai jogando bem', 1], ['Bom no desarme', 3], ['Líder', 3], ['Rápido', 4], ['Forte no alto', 5]], [['Sai jogando mal', 1], ['Perde a bola', 2], ['Desarma pouco', 3], ['Lento', 4], ['Erra no alto', 5]]],
    LAT: [[['Bom cruzamento', 1], ['Drible', 2], ['Marca bem', 3], ['Rápido', 4], ['Fôlego', 5]], [['Cruza mal', 1], ['Perde a bola', 2], ['Marca mal', 3], ['Lento', 4], ['Cansa cedo', 5]]],
    MEI: [[['Chute de fora', 0], ['Bom passe', 1], ['Visão de jogo', 1], ['Drible', 2], ['Rouba bola', 3], ['Rápido', 4], ['Fôlego', 5]], [['Chuta mal', 0], ['Erra passe', 1], ['Perde a bola', 2], ['Marca mal', 3], ['Lento', 4], ['Cansa cedo', 5]]],
    ATA: [[['Finalização', 0], ['Faro de gol', 0], ['Garçom', 1], ['Drible', 2], ['Rápido', 4], ['Forte no alto', 5]], [['Desperdiça', 0], ['Isolado', 1], ['Perde a bola', 2], ['Lento', 4], ['Fraco no alto', 5]]]
  };
  S.coMktTraits = p => {
    const pos = TR[p.pos] ? p.pos : 'MEI', L = TR[pos], at = S.coAttrs(p), pr = S.CO_AT.prof[pos], h = hash(p.id + '|jeito');
    const dv = at.map((v, i) => v - p.ovr - pr[i]);
    // um texto por atributo (o jogador escolhe entre os que dividem o mesmo), do mais acima do normal para o menos
    const by = {}; L[0].forEach(t => (by[t[1]] = by[t[1]] || []).push(t[0]));
    const ord = Object.keys(by).map(Number).sort((a, b) => dv[b] - dv[a] || a - b);
    const good = ord.slice(0, 2).map(i => by[i][(h >>> (i * 2)) % by[i].length]);
    // ponto fraco: o atributo mais abaixo do normal entre os que têm texto, sem repetir um ponto forte
    const bad = L[1].filter(t => ord.indexOf(t[1]) < 0 || ord.indexOf(t[1]) > 1).sort((a, b) => dv[a[1]] - dv[b[1]] || a[1] - b[1])[0];
    return { good, bad: bad[0], gi: ord.slice(0, 2), bi: bad[1] };
  };

  // Atributos na ficha do mercado (Silvio 2026-11-10: "quero que o olheiro pegue o valor por faixa também"): sem relatório nada;
  // com 1 e 2, cada atributo é uma faixa { lo, hi } com o centro um pouco fora (erro do olheiro, sorteado por jogador e atributo);
  // com 3, o número certo { lo = hi = v, v }. O valor de verdade está sempre dentro da faixa e a 2ª faixa cabe dentro da 1ª.
  S.coMktAttrs = (co, p) => {
    const n = S.coMktReps(co, p); if (!n) return null;
    const at = S.coAttrs(p), w = M.atHalf[Math.min(n, M.atHalf.length) - 1], A = S.CO_AT;
    return at.map((v, i) => {
      if (!w) return { lo: v, hi: v, v };
      const e1 = (hash(p.id + '|at' + i) % (2 * M.atErr + 1)) - M.atErr, c = v + (n === 1 ? e1 : Math.trunc(e1 / 2));
      return { lo: Math.max(A.min, c - w), hi: Math.min(A.max, c + w), v: null };
    });
  };

  // ---------- filtros ----------
  // Cada filtro: rótulo e opções { t, ok(p, ctx) }. ctx = { co, verba, lg, cty }
  S.coMktFilters = function (co) {
    const f = S.coFin ? S.coFin(co) : { verba: 0 }, verba = Math.max(0, f.verba || 0), lg = S.coLeague(co), cty = D.LEAGUE_BY_ID[lg].country;
    const brl = v => (v >= 1e6 ? 'R$ ' + (Math.round(v / 1e5) / 10).toString().replace('.', ',') + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil');
    // ligas pela força média dos clubes; as do seu país primeiro (a sua na frente), depois "Exterior" e cada liga de fora, da mais forte
    // para a mais fraca, para achar a Premier em poucos toques
    const forca = l => { const cs = D.CLUBS.filter(c => c.league === l.id); return cs.reduce((a, c) => a + (c.strength || 0), 0) / Math.max(1, cs.length); };
    const porForca = L => L.map(l => ({ l, f: forca(l) })).sort((a, b) => b.f - a.f).map(x => x.l);
    const ligas = porForca(D.LEAGUES.filter(l => l.country === cty)).sort((a, b) => (a.id === lg ? -1 : b.id === lg ? 1 : 0));
    const fora = porForca(D.LEAGUES.filter(l => l.country !== cty));
    const lvl = (p, w) => { const b = S.coMktBand(co, p); return word1(b ? b.mid : S.coMktFame(co, p)) === w; };
    return [
      { k: 'pos', t: 'POSIÇÃO', o: [{ t: 'Qualquer' }].concat(['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].map(x => ({ t: POS_NM[x], ok: p => p.pos === x }))) },
      { k: 'niv', t: 'NÍVEL', o: [{ t: 'Qualquer' }, { t: 'Reserva', ok: p => lvl(p, 'pior') }, { t: 'Igual ao titular', ok: p => lvl(p, 'igual') }, { t: 'Melhor que o titular', ok: p => lvl(p, 'melhor') }] },
      { k: 'ida', t: 'IDADE', o: [{ t: 'Qualquer' }, { t: 'Até 21', ok: p => p.age <= 21 }, { t: 'Até 25', ok: p => p.age <= 25 }, { t: 'Até 29', ok: p => p.age <= 29 }, { t: '30 ou mais', ok: p => p.age >= 30 }] },
      { k: 'pre', t: 'PREÇO ATÉ', o: [{ t: 'Qualquer' }, { t: brl(Math.max(100000, Math.round(verba / 2))), ok: p => S.coMktPrice(p) <= Math.max(100000, verba / 2) }, { t: brl(verba) + ' · verba', ok: p => S.coMktPrice(p) <= verba }, { t: brl(verba * 2), ok: p => S.coMktPrice(p) <= verba * 2 }] },
      { k: 'lig', t: 'LIGA', o: [{ t: 'Qualquer' }].concat(ligas.map(l => ({ t: l.name, ok: p => p.lg === l.id }))).concat([{ t: 'Exterior', ok: p => D.LEAGUE_BY_ID[p.lg].country !== cty }]).concat(fora.map(l => ({ t: l.name, ok: p => p.lg === l.id }))) },
      { k: 'sit', t: 'SITUAÇÃO', o: [{ t: 'Qualquer' }, { t: 'Contrato acabando', ok: p => p.club && p.ct <= 1 }, { t: 'Sem contrato', ok: p => !p.club }, { t: 'Observados', ok: p => !!S.coMkt(co).obs[p.id] }] }
    ];
  };
  // Quem passa nos filtros de agora (e no nome digitado, 3 letras ou mais)
  S.coMktSearch = function (co) {
    const m = S.coMkt(co), F = S.coMktFilters(co), nm = (m.nm || '').trim().toLowerCase();
    const on = F.map((x, i) => x.o[m.f[i] || 0]).filter(o => o && o.ok);
    return S.coMktPool(co).filter(p => !m.got[p.id] && on.every(o => o.ok(p)) && (nm.length < 3 || p.n.toLowerCase().indexOf(nm) >= 0));
  };
  // Ordem do resultado (Silvio 2026-11-10: "ordenar por over, valor, etc"): `m.ord` escolhe entre S.CO_MKT.ords. No mercado
  // o geral não aparece, então "Nível" é a ordem do olheiro (com relatório primeiro, do melhor para o pior; depois o mais
  // barato), que segue sendo o desempate das outras; quem está sem clube tem preço 0 e abre o "Menor preço"
  M.ords = ['Nível', 'Menor preço', 'Maior preço', 'Mais novo', 'Mais velho'];
  S.coMktSort = (co, list) => {
    const o = S.coMkt(co).ord || 0;
    const niv = (x, y) => (y.b ? 1 : 0) - (x.b ? 1 : 0) || (y.b && x.b ? y.b.mid - x.b.mid : 0) || x.v - y.v;
    const by = [niv, (x, y) => x.v - y.v, (x, y) => y.v - x.v, (x, y) => x.p.age - y.p.age, (x, y) => y.p.age - x.p.age][o] || niv;
    return list.map(p => ({ p, b: S.coMktBand(co, p), v: S.coMktPrice(p) })).sort((x, y) => by(x, y) || niv(x, y)).map(x => x.p);
  };
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
    m.rep[p.id] = n + 1; m.obs[p.id] = 1; if (m.old) delete m.old[p.id]; return true; // pagou, entra nos Observados
  };
  S.coMktObs = (co, p) => { const m = S.coMkt(co); if (m.obs[p.id]) delete m.obs[p.id]; else m.obs[p.id] = 1; return !!m.obs[p.id]; };
  S.coMktFind = (co, id) => (S.coMkt(co).got[id] ? null : S.coMktPool(co).find(p => p.id === id) || null);

  // ---------- janela: quem manda é a rodada (Silvio 2026-11-11: "não gostei dessa janela com 6 dias, coloquei dinheiro à toa
  // porque não consegui negociar. Quero algo mais livre, o que manda é a rodada"). Aberta nas semanas das 3 primeiras rodadas
  // (M.preR) e nas 2 do meio (M.midR); com ela aberta, propostas e contratos à vontade (o freio é a paciência do presidente e
  // do empresário, por jogador). `rd` = rodadas que ela ainda fica aberta, contando esta. `m.used` segue contando as
  // negociações da janela só para variar os sorteios; não limita mais nada ----------
  const winOf = ss => { const half = Math.floor(ss.rounds.length / 2), pe = Math.min(M.preR, half);
    return ss.i < pe ? { k: 'pre', rd: pe - ss.i, half } : ss.i >= half && ss.i < half + M.midR ? { k: 'mid', rd: half + M.midR - ss.i, half } : { k: null, rd: 0, half }; };
  S.coMktWinK = co => (co.ss && !co.ss.done && co.ss.rounds ? winOf(co.ss).k : null);
  S.coMktWin = function (co) {
    const ss = co.ss; if (!ss || ss.done) return { open: false, next: null };
    const x = winOf(ss), k = x.k, m = S.coMkt(co);
    if (!k) return { open: false, next: ss.i < x.half ? x.half + 1 : null };
    if (m.wk !== k) { m.wk = k; m.used = 0; }
    return { open: true, k, rd: x.rd, next: k === 'pre' ? x.half + 1 : null };
  };
  // Aviso da janela (Silvio 11/11: "perdi a chance de comprar porque não vi que ia acabar na próxima rodada"):
  // rodadas que sobram com ela aberta (`rd`: a do começo vale até a rodada M.preR, a do meio por M.midR rodadas)
  // e o aviso desta semana (`st`: 'open' quando abre, 'last' na última rodada dela, 'closed' na semana depois que fechou),
  // dado uma vez por temporada e janela em `co.mkt.wn`.
  S.coMktWinInfo = function (co) {
    const ss = co.ss; if (!ss || ss.done || !ss.rounds) return null;
    const half = Math.floor(ss.rounds.length / 2), pe = Math.min(M.preR, half), w = S.coMktWin(co);
    let k = w.k, rd = 0, st = null;
    if (k) { rd = w.rd; st = rd === 1 ? 'last' : (k === 'pre' ? ss.i === 0 : ss.i === half) ? 'open' : null; }
    else if (ss.i === pe && pe < half) { k = 'pre'; st = 'closed'; }
    else if (ss.i === half + M.midR) { k = 'mid'; st = 'closed'; }
    const m = S.coMkt(co), key = k && st ? k + ':' + st : null;
    return { k, rd, st, key, seen: !key || !!(m.wn && m.wn[key]) };
  };
  S.coMktWinSeen = (co, key) => { const m = S.coMkt(co); (m.wn = m.wn || {})[key] = 1; };
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
  // Troca desigual: quanto o jogador na troca vale a mais que a proposta (não tem troco)
  S.coMktTradeOver = (co, o) => Math.max(0, tradeVal(co, o.tr) - o.v);
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
    // O valor da proposta é o pacote inteiro: o jogador na troca abate (o resto é dinheiro) e só o dinheiro parcelado pesa menos.
    // Até 11/11 a troca contava duas vezes (abatia do dinheiro e ainda somava no pacote): comprar com troca saía pela metade.
    const ask = S.coMktAsk(co, p), tv = tradeVal(co, o.tr), pen = M.payPen[o.pay || 0], eff = Math.max(0, o.v - tv) * (1 - pen) + tv;
    if (eff >= ask) { n.st = 'ok'; n.deal = { v: o.v, pay: o.pay || 0, tr: o.tr || null }; n.ans = { k: 'ok' }; return n.ans; }
    n.pat--;
    if (n.pat <= 0) { n.st = 'no'; n.ans = { k: 'no' }; return n.ans; }
    if (eff >= ask * M.counter) { n.cv = Math.ceil(((ask - tv) / (1 - pen) + tv) / 10000) * 10000; n.ans = { k: 'counter', v: n.cv }; return n.ans; }
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
  // Elenco cheio para trazer este jogador? Com um dos seus na troca sai um e entra um: a troca vale mesmo com o elenco no limite.
  // O limite só barra quem chega (compra, sem clube): garoto da base sobe sempre e ninguém sai sozinho (save antigo acima do limite só não contrata).
  S.coMktFull = (co, p) => { const n = p && S.coMkt(co).neg[p.id], tr = n && n.deal && n.deal.tr; return co.squad.length - (tr && co.squad.some(x => x.id === tr) ? 1 : 0) >= M.maxSquad; };
  // Oferece: { k: 'signed' (jogador), | 'recusa' | 'no' | 'teto' | 'cheio' | 'fechada' | 'verba' }
  S.coMktContract = function (co, p, t) {
    const n = S.coMktNeg(co, p), f = S.coFin(co), m = S.coMkt(co);
    if (n.st === 'no' || n.st === 'signed') return { k: n.st };
    if (p.club && n.st !== 'ok') return { k: 'no' };
    if (p.club && !S.coMktWin(co).open) return { k: 'fechada' };
    if (S.coMktFolha(co, p, t).pct > 100) return { k: 'teto' };
    if (S.coMktFull(co, p)) return { k: 'cheio' };
    const d = n.deal || { v: 0, pay: 0, tr: null }, now = p.club ? S.coMktNow(co, d) : 0;
    if (now > Math.max(0, f.verba)) return { k: 'verba' };
    // recusa do empresário não gasta dia (Silvio 2026-11-11: "não quero perder um dia"); só a bolinha de paciência
    if (!S.coMktYes(co, p, t, n)) { n.apat--; if (n.apat <= 0) { n.st = 'no'; return { k: 'no' }; } return { k: 'recusa' }; }
    spend(co);
    // Fechado: paga a 1ª parcela, o resto vem a cada 4 rodadas; o da troca sai; o novo chega no banco
    if (now) { f.verba -= now; f.caixa -= now; f.ss.comp += now; }
    const left = Math.max(0, d.v - tradeVal(co, d.tr)) - now;
    if (d.pay && left > 0) { f.inst = f.inst || []; f.inst.push({ n: p.n, v: Math.ceil(left / d.pay / 1000) * 1000, k: d.pay }); }
    if (d.tr) { const q = co.squad.find(x => x.id === d.tr); if (q && p.club && S.coWorldSold) S.coWorldSold(co, q, p.club, 0, { tr: 1 });
      co.squad = co.squad.filter(x => x.id !== d.tr); co.xi = (co.xi || []).filter(x => x !== d.tr); co.bench = (co.bench || []).filter(x => x !== d.tr); }
    const np = Object.assign({}, p, { id: 'p' + (co.pid++), wage: t.w, ct: t.y, role: ROLE[t.role].k, mo: 70, en: 100, out: 0, sus: 0, from: p.club || null });
    delete np.club; delete np.lg; delete np.num;
    co.squad.push(np);
    m.got[p.id] = 1; n.st = 'signed';
    if (S.coWorldBought) S.coWorldBought(co, p, p.club ? d.v : 0);
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
  // O que ele responde quando recusa (Silvio 2026-11-11: resposta na hora, com o que ele aceita): salário pelo papel
  // escolhido e os anos que ele prefere; com isso o humor dá 4 (assina)
  S.coMktWants = (co, p, t) => { const T = S.coMktTerms(co, p), md = S.coMktMood(co, p, t);
    return { w: T.ask(t.role), y: T.want, role: t.role, lvl: md.lvl, wOk: t.w >= T.ask(t.role), yOk: t.y === T.want }; };
  // Assina? "Deve aceitar" sempre; "Quase lá" 1 vez em 3 (Silvio 2026-11-11, `S.CO_MKT.quase`). Sorteio preso ao jogador,
  // à tentativa e ao salário (sem gastar o sorteio da carreira; recarregar não muda a resposta)
  S.coMktYes = (co, p, t, n) => { const l = S.coMktMood(co, p, t).lvl;
    return l >= 4 || (l === 3 && hash(p.id + '|q|' + n.apat + '|' + t.w + '|' + t.y + '|' + t.role + '|' + (co.season || 0)) % 1000 < 1000 * (M.quase || 0)); };
  S.coMktRenNeg = (co, p) => { const m = S.coMkt(co); m.ren = m.ren || {}; return m.ren[p.id] || (m.ren[p.id] = { apat: M.pat, st: 'open' }); };
  S.coMktRenOk = (co, p) => p.ct <= M.renMax;
  // { k: 'signed' (p) | 'recusa' | 'no' | 'teto' | 'cedo' }
  S.coMktRenew = function (co, p, t) {
    const n = S.coMktRenNeg(co, p);
    if (n.st === 'no' || n.st === 'signed') return { k: n.st };
    if (!S.coMktRenOk(co, p)) return { k: 'cedo' };
    if (S.coMktFolha(co, p, t).pct > 100 && t.w > p.wage) return { k: 'teto' };
    if (!S.coMktYes(co, p, t, n)) { n.apat--; if (n.apat <= 0) { n.st = 'no'; return { k: 'no' }; } return { k: 'recusa' }; }
    // os anos contam depois desta temporada (antes, renovar por 1 ano quem estava no último ano não mudava nada e ele saía)
    p.wage = t.w; p.ct = t.y + 1; p.role = ROLE[t.role].k; p.mo = Math.min(100, (p.mo === undefined ? 60 : p.mo) + 8); n.st = 'signed';
    return { k: 'signed', p };
  };

  // Renovação do robô (ferramentas): o que um técnico atento faz antes do fim da temporada. Renova os titulares no
  // último ano pelo que o empresário pede (papel titular, anos que ele prefere); o teto da folha pode barrar.
  // O jogo NÃO chama isto: desde 2026-11-09 quem não é renovado sai no fim do contrato, titular ou não.
  S.coAutoRenew = function (co) {
    const xi = new Set(S.coAutoXI(co.squad, co.form).xi), done = [];
    co.squad.forEach(p => {
      if (!xi.has(p.id) || p.ct > 1 || p.age >= 33) return;
      const T = S.coMktTerms(co, p);
      if (S.coMktRenew(co, p, { w: T.ask(0), y: T.want, role: 0 }).k === 'signed') done.push(p.id);
    });
    return done;
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
  // Rescisão (Silvio 2026-11-11: "não dá pra fazer uns cortes de custo antes da janela?"): vale em qualquer rodada, sem janela.
  // Multa = M.resc.k dos salários que faltam do contrato (rodadas desta temporada + as das seguintes), entre `min` e `max`
  // semanas; sai do caixa na hora (Contratações, mesmo no vermelho), o salário sai da folha e ele fica sem clube na temporada
  // seguinte (não dá para recontratar mais barato no mesmo ano). Mesma trava de elenco curto da venda (S.coMktCanSell).
  // Plano: { ok, wk semanas de multa, fee, wage, left rodadas que faltam no ano, pays rodadas até a multa se pagar,
  // payK 'now' neste ano / 'next' só nos anos seguintes / 'never' o contrato acabaria antes, caixa depois }
  M.resc = { k: 0.25, min: 4, max: 20 };
  S.coMktRescPlan = function (co, p) {
    const ss = co.ss, n = ss && ss.rounds ? ss.rounds.length : 38, left = ss && !ss.done ? Math.max(0, n - ss.i) : 0;
    const all = left + Math.max(0, (p.ct || 1) - 1) * n, wk = Math.max(M.resc.min, Math.min(M.resc.max, Math.round(all * M.resc.k)));
    const wage = p.wage || 0, fee = Math.max(1000, Math.ceil(wage * wk / 1000) * 1000), pays = wage ? Math.ceil(fee / wage) : 0, f = co.fin;
    return { ok: S.coMktCanSell(co, p), wk, fee, wage, left, all, pays, payK: pays < left ? 'now' : pays < all ? 'next' : 'never', caixa: f ? f.caixa - fee : 0 };
  };
  S.coMktResc = function (co, p) {
    const f = S.coFin(co), P = S.coMktRescPlan(co, p); if (!f || !P.ok || !co.squad.includes(p)) return null;
    co.squad = co.squad.filter(x => x !== p);
    if ((co.xi || []).includes(p.id)) { const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.bench = a.bench; }
    else if (co.bench) co.bench = co.bench.filter(id => id !== p.id);
    if (co.sell) delete co.sell[p.id];
    f.caixa -= P.fee; f.ss.comp = (f.ss.comp || 0) + P.fee;
    if (S.coWorldResc) S.coWorldResc(co, p);
    return P;
  };
  S.coMktBuyer = (co, p, r) => buyerOf(co, p, r);
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
  function incDraw(co, k) {
    const L = [], r = rngS(co, 'inc' + k);
    const cand = co.squad.filter(p => S.coMktCanSell(co, p) && !p.from).map(p => ({ p, x: r() / (M.inc * (1 + Math.max(0, p.ovr - 60) / 20) + (S.coMktListed(co, p) ? M.incList : 0)) }))
      .filter(o => o.x < 1).sort((a, b) => a.x - b.x);
    const nList = cand.filter(o => S.coMktListed(co, o.p)).length;
    cand.slice(0, M.incMax + nList).forEach(o => { const of = mkOffer(co, o.p, r); if (of) { if (S.coMktListed(co, o.p)) of.ask = 1; L.push(of); } });
    return L;
  }
  // As propostas que a janela `k` vai trazer se o elenco não mudar até lá (o mesmo sorteio, sem guardar): o mercado vivo
  // usa para soltar o boato uma semana antes (engine/coachworld.js)
  S.coMktIncPeek = (co, k) => incDraw(co, k).map(o => ({ id: o.id, club: o.club, ask: o.ask || 0 }));
  S.coMktInbox = function (co) {
    const w = S.coMktWin(co), m = S.coMkt(co); m.inc = m.inc || [];
    if (!w.open) return [];
    const early = w.k === 'pre' && co.since === co.season && co.ss.i < M.incFrom;
    if (m.incK !== w.k) { m.incK = w.k; m.inc = incDraw(co, w.k); }
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
    const p = co.squad.find(x => x.id === o.id); if (p && o.wish === 1) { p.mo = Math.max(0, (p.mo === undefined ? 60 : p.mo) - 15); p.deny = 1; } // `deny`: o motivo na conversa da semana (S.coTalkWhy)
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
    // mercado vivo: ele passa a jogar pelo clube comprador (e a % futura sabe quem ele é: wid)
    const wid = S.coWorldSold ? S.coWorldSold(co, p, o.club, v) : null;
    if (fut) { f.fut = f.fut || []; const x = { n: p.n, pct: M.futPct[fut], base: v, s: co.season, club: o.club }; if (wid) x.wid = wid; f.fut.push(x); }
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
        // o que a cláusula pagou fica no histórico de Finanças (Silvio 2026-11-11: "há uma tela que mostre quanto recebeu?")
        f.futLog = (f.futLog || []).concat([{ n: x.n, club: x.club, pct: x.pct, v, s: co.season }]).slice(-12);
        if (x.wid && S.coWorldResell) S.coWorldResell(co, x.wid);
        if (S.coFinNews) S.coFinNews(co, x.n + ' foi vendido de novo: os ' + x.pct + '% da venda futura renderam R$ ' + (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1000) + ' mil') + ' ao caixa.');
        return false; }
      return co.season - x.s < M.futS;
    });
  }

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
