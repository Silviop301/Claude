// Modo Treinador, finanças (parte 1 do mercado): caixa, verba para contratar e teto da folha.
// co.fin = { caixa, verba, teto, rec (receita prevista da temporada), ss: { bil, tv, pat, prem, vend, sal, comp } (a temporada até agora),
//            last (balanço da temporada passada), neg (rodadas seguidas no vermelho) }
// A receita vem do tamanho do clube (a folha que um elenco normal dele teria), não da sua folha: contratar caro aperta.
// Uma rodada = uma semana: paga a folha, entra a parte do patrocínio e, em casa, a bilheteria; a cota de TV vem em 2 parcelas.
// No fim da temporada: bônus do patrocínio pela meta, prêmio de título e acesso, e a diretoria define verba e teto do ano seguinte.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;

  // Números (calibrados com tools/craque_treinador.js)
  const F = S.CO_FIN = {
    marg: 1.03,     // a folha de um elenco normal do clube é 103% da receita prevista
    tv: 0.4, pat: 0.25, bil: 0.35,   // partes da receita
    bonus: 0.08,    // bônus do patrocínio se cumprir a meta (parte da receita)
    titulo: 0.12, acesso: 0.08,     // prêmios
    teto: 1.05,     // teto da folha = folha normal do clube x 1,05 (folha no teto fecha perto do zero a zero)
    caixa0: 6, verba0: 5,           // semanas da folha normal no caixa e na verba ao assinar
    lucro: 0.3,     // parte do lucro da temporada que vira verba extra
    negConf: 1.5,   // confiança da diretoria que cai por rodada no vermelho
  };
  const r10 = v => Math.round(v / 10000) * 10000;
  const r5 = v => Math.round(v / 5000) * 5000;
  // A folha que um elenco normal do clube teria (o elenco sorteado dele na temporada)
  // e o peso da divisão em que ele está (subir traz mais TV e público; cair, menos)
  const normal = (clubId, season) => S.coGenSquad(clubId, season).reduce((a, p) => a + p.wage, 0);
  // Peso da divisão: a liga em que o clube está hoje contra a liga de origem dele (subiu: mais TV e público)
  const lgAvg = ids => ids.reduce((a, id) => a + D.CLUB_BY_ID[id].strength, 0) / Math.max(1, ids.length);
  function lgMult(clubId) {
    const c = D.CLUB_BY_ID[clubId], cur = lgAvg(S._.fcLib.leagueTeams(c)), nat = lgAvg(D.CLUBS.filter(x => x.league === c.league).map(x => x.id));
    return clamp(Math.exp(0.5 * (cur - nat) / 8.5), 0.75, 1.5);
  }
  const baseOf = co => normal(co.club, co.season) * lgMult(co.club);
  S.coFinBase = baseOf;
  S.coFolha = co => (co.squad || []).reduce((a, p) => a + (p.wage || 0), 0);
  const rounds = co => (co.ss ? co.ss.rounds.length : 38);
  const zero = () => ({ bil: 0, tv: 0, pat: 0, prem: 0, vend: 0, sal: 0, comp: 0 });
  // Receita prevista da temporada pelo tamanho do clube e pelo número de rodadas
  const recOf = (co, n) => baseOf(co) * n / F.marg;
  function init(co) {
    const base = baseOf(co);
    co.fin = { caixa: r10(base * F.caixa0), verba: r10(base * F.verba0), teto: r5(base * F.teto), rec: 0, ss: zero(), last: null, neg: 0, s: co.season };
    return co.fin;
  }
  // Saves de antes das finanças: cria na hora, no ponto em que a carreira está
  S.coFin = co => (co && co.club ? co.fin || init(co) : null);

  // Bilheteria de um jogo em casa: parte da receita, mais cheia quando o time está bem na tabela e o rival é grande
  function gate(co, vs) {
    const fin = co.fin, ss = co.ss, n = ss.ids.length, homes = Math.max(1, ss.rounds.length / 2);
    const pos = S.coPos(co), posF = 1.15 - 0.3 * (pos - 1) / Math.max(1, n - 1);
    const me = D.CLUB_BY_ID[co.club].strength, opp = D.CLUB_BY_ID[vs].strength;
    const oppF = clamp(1 + (opp - me) / 30, 0.8, 1.3);
    return r10(fin.rec * F.bil / homes * posF * oppF) || 10000;
  }
  S.coGate = (co, vs) => (S.coFin(co) && co.ss ? gate(co, vs) : 0);
  // Uma semana: folha, patrocínio, TV na 1ª rodada e na metade, bilheteria em casa
  function week(co, ri, home, vs) {
    const fin = S.coFin(co); if (!fin || !co.ss) return null;
    if (fin.s !== co.season) { fin.s = co.season; fin.ss = zero(); }
    const n = rounds(co);
    if (!fin.rec) fin.rec = recOf(co, n);
    const add = (k, v) => { v = Math.round(v); fin.ss[k] += v; fin.caixa += v; };
    const sub = (k, v) => { v = Math.round(v); fin.ss[k] += v; fin.caixa -= v; };
    sub('sal', S.coFolha(co));
    add('pat', fin.rec * F.pat / n);
    if (ri === 0 || ri === Math.floor(n / 2)) add('tv', fin.rec * F.tv / 2);
    let g = 0;
    if (home && vs) { g = gate(co, vs); add('bil', g); }
    // No vermelho a diretoria perde a paciência aos poucos
    if (fin.caixa < 0) { fin.neg++; if (co.board) co.board.conf = clamp(co.board.conf - F.negConf, 0, 100); } else fin.neg = 0;
    return { gate: g };
  }
  // O que ainda vem na temporada (para a tela)
  S.coFinNext = function (co) {
    const fin = S.coFin(co), ss = co.ss; if (!fin || !ss || ss.done) return [];
    const n = rounds(co), out = [], half = Math.floor(n / 2);
    if (!fin.rec) fin.rec = recOf(co, n);
    const nx = S.coNext(co);
    if (nx && !nx.bye && nx.home) out.push({ k: 'bil', txt: 'Bilheteria contra o ' + (D.CLUB_BY_ID[nx.vs].short || D.CLUB_BY_ID[nx.vs].name), v: gate(co, nx.vs), aprox: true });
    if (ss.i <= half) out.push({ k: 'tv', txt: 'Cota de TV, 2ª parcela · rodada ' + (half + 1), v: r10(fin.rec * F.tv / 2) });
    out.push({ k: 'bonus', txt: 'Bônus do patrocínio se cumprir a meta', v: r10(fin.rec * F.bonus) });
    if (ss.promo) out.push({ k: 'acesso', txt: 'Prêmio se subir de divisão', v: r10(fin.rec * F.acesso) });
    else out.push({ k: 'titulo', txt: 'Prêmio se for campeão', v: r10(fin.rec * F.titulo) });
    return out;
  };
  S.coFinSemanas = co => { const fin = S.coFin(co), f = S.coFolha(co); return fin && f ? Math.max(0, Math.floor(fin.caixa / f)) : 0; };

  // ---------- ganchos no motor do treinador ----------
  const sign0 = S.coSign;
  S.coSign = function (co, clubId) { const r = sign0(co, clubId); co.fin = null; init(co); return r; };
  const start0 = S.coStart;
  S.coStart = function (co) {
    const r = start0(co);
    const fin = S.coFin(co);
    if (fin) { fin.s = co.season; fin.ss = zero(); fin.rec = recOf(co, rounds(co)); fin.neg = 0; }
    return r;
  };
  const end0 = S.coMatchEnd;
  S.coMatchEnd = function (co, m) {
    const ri = co.ss.i, log = end0(co, m);
    const w = week(co, ri, m.home, m.vs);
    if (w && w.gate) log.gate = w.gate;
    return log;
  };
  const skip0 = S.coSkipRound;
  S.coSkipRound = function (co) {
    const ri = co.ss.i, pay = !co.sacked && co.club && co.ss.club === co.club;
    skip0(co);
    if (pay) week(co, ri, false, null);
  };
  const send0 = S.coSeasonEnd;
  S.coSeasonEnd = function (co) {
    const fin = S.coFin(co), clubId = co.club;
    if (fin && fin.s !== co.season) { fin.s = co.season; fin.ss = zero(); }
    const out = send0(co);
    if (!fin) return out;
    const ss = fin.ss, rec = fin.rec || 0;
    if (!out.sacked) {
      const add = (k, v) => { v = r10(v); ss[k] += v; fin.caixa += v; };
      if (out.met) add('pat', rec * F.bonus);
      if (out.won) add('prem', rec * F.titulo);
      if (out.up) add('prem', rec * F.acesso);
    }
    const ent = ss.bil + ss.tv + ss.pat + ss.prem + ss.vend, sai = ss.sal + ss.comp, saldo = ent - sai;
    const bal = { season: out.season, club: clubId, ss: Object.assign({}, ss), ent, sai, saldo, caixa: fin.caixa, verba0: fin.verba, teto0: fin.teto };
    if (out.sacked) { out.fin = bal; co.fin = null; return out; }
    // A diretoria do ano seguinte: teto pela folha normal (cresce com a divisão), mais 5% se cumpriu a meta no azul;
    // verba nova pelo tamanho do clube mais uma parte do lucro; no vermelho não tem verba
    const base = baseOf(co);
    const good = out.met && saldo > 0;
    fin.teto = Math.max(r5(base * F.teto), good ? r5(fin.teto * 1.05) : 0);
    fin.verba = fin.caixa <= 0 ? 0 : Math.min(r10(fin.caixa * 0.6), r10(base * F.verba0 + Math.max(0, saldo) * F.lucro));
    bal.verba = fin.verba; bal.teto = fin.teto; bal.good = good;
    fin.last = bal; fin.ss = zero(); fin.rec = 0; fin.s = co.season;
    out.fin = bal;
    return out;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
