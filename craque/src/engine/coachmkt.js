// Modo Treinador, mercado (lote 1, 2026-11-09: só olhar). Procurar com filtros, resultado e ficha do jogador.
// Plano: doc "Treinador: plano da tela enxuta do mercado"; quadros 23, 23b e 24 do canvas das telas enxutas.
// Os jogadores dos outros vêm dos elencos sorteados da temporada (S.coGenSquad); quando a API de jogadores reais chegar,
// ela troca esta fonte (S.coMktPool) e o resto continua igual. Força dos outros nunca em número: uma faixa contra o seu
// titular da posição, que estreita a cada relatório do olheiro (co.mkt.rep[id] = 1..3). A sua liga o olheiro já conhece.
// co.mkt = { s (temporada), rep: { id: n }, f: [6 índices dos filtros], nm (nome digitado), obs: { id: 1 } }
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const M = S.CO_MKT = {
    max: 40,          // a busca só libera com até 40 jogadores
    free: 40,         // jogadores sem clube por temporada
    reps: 3,          // relatórios por jogador (cada um estreita a faixa)
    half: [7, 4, 2],  // meia largura da faixa (pontos de força) com 1, 2 e 3 relatórios
    err: [3, 2, 1],   // quanto o centro da faixa pode errar
    span: 15,         // a régua vai de 15 pontos pior a 15 melhor que o titular
    eq: 2             // até 2 pontos de diferença = igual
  };
  const POS_NM = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meia', ATA: 'Atacante' };
  S.CO_POS_NM = POS_NM;

  // ---------- a fonte: todos os jogadores dos outros clubes na temporada (e os sem clube) ----------
  let cache = null;
  S.coMktPool = function (co) {
    const key = co.season + '|' + co.club;
    if (cache && cache.k === key) return cache.list;
    const list = [];
    D.CLUBS.forEach(cl => {
      if (cl.id === co.club) return;
      S.coGenSquad(cl.id, co.season).forEach(p => { list.push(Object.assign({}, p, { club: cl.id, lg: cl.league })); });
    });
    // Sem clube: veteranos e quem sobrou, sorteados pela temporada
    for (let i = 0; i < M.free; i++) {
      const h = hash('free|' + co.season + '|' + i), cl = D.CLUBS[h % D.CLUBS.length], sq = S.coGenSquad(cl.id, co.season - 1), p = sq[(h >>> 8) % sq.length];
      list.push(Object.assign({}, p, { id: 'f:' + co.season + ':' + i, club: null, lg: cl.league, ct: 0, age: p.age + 1, ovr: Math.max(30, p.ovr - 3) }));
    }
    cache = { k: key, list };
    return list;
  };

  S.coMkt = co => {
    if (!co.mkt || co.mkt.s !== co.season) co.mkt = { s: co.season, rep: {}, f: (co.mkt && co.mkt.f) || [0, 0, 0, 0, 0, 0], nm: '', obs: {} };
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
    return S.coMktPool(co).filter(p => on.every(o => o.ok(p)) && (nm.length < 3 || p.n.toLowerCase().indexOf(nm) >= 0));
  };
  // Ordem do resultado: com relatório primeiro, do melhor para o pior; depois o mais barato
  S.coMktSort = (co, list) => list.map(p => ({ p, b: S.coMktBand(co, p) })).sort((x, y) => (y.b ? 1 : 0) - (x.b ? 1 : 0) || (y.b && x.b ? y.b.mid - x.b.mid : 0) || S.coMktPrice(x.p) - S.coMktPrice(y.p)).map(x => x.p);
  // Mais um relatório (lote 1: ainda sem gastar dia; a janela com 10 dias entra com as propostas)
  S.coMktReport = (co, p) => { const m = S.coMkt(co), n = S.coMktReps(co, p); if (n >= M.reps) return false; m.rep[p.id] = n + 1; return true; };
  S.coMktObs = (co, p) => { const m = S.coMkt(co); if (m.obs[p.id]) delete m.obs[p.id]; else m.obs[p.id] = 1; return !!m.obs[p.id]; };
  S.coMktFind = (co, id) => S.coMktPool(co).find(p => p.id === id) || null;

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
