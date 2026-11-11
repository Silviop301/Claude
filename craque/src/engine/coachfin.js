// Modo Treinador, finanças: caixa, verba para contratar e teto da folha (parte 1) e as decisões da Finanças 2.0:
// presidente com perfil, acordo de verba × meta na pré-temporada, 3 propostas de patrocínio, empréstimo no banco
// e o vermelho em 4 degraus (aviso, sem contratar com taxa, o presidente vende o mais caro, ultimato).
// co.fin = { caixa, verba, teto, rec (receita prevista da temporada), ss: { bil, tv, pat, prem, vend, sal, comp, jur } (a temporada até agora),
//            last (balanço da temporada passada), neg (rodadas seguidas no vermelho), s,
//            pres { n, k, s } (presidente: nome, perfil, temporada em que entrou), ac (acordo da temporada), goal0 (a meta antes do acordo),
//            pat { k, name, fix, bonus, until } (patrocínio assinado), ops (as 3 propostas), pend { ac, pat } (o que falta decidir),
//            loan { rem, parc, n } (empréstimo: o que falta do principal, parcela por mês, parcelas que faltam), sold (venda forçada nesta sequência), news [] }
// A receita vem do tamanho do clube (a folha que um elenco normal dele teria), não da sua folha: contratar caro aperta.
// Uma rodada = uma semana: paga a folha, entra a parte do patrocínio e, em casa, a bilheteria; a cota de TV vem em 2 parcelas.
// A cada 4 rodadas (um mês) vence a parcela do empréstimo.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;

  // Números (calibrados com tools/craque_treinador.js)
  const F = S.CO_FIN = {
    marg: 1.03,     // a folha de um elenco normal do clube é 103% da receita prevista
    tv: 0.4, bil: 0.35,             // partes da receita (o patrocínio vem da proposta escolhida)
    titulo: 0.12, acesso: 0.08,     // prêmios
    teto: 1.05,     // teto da folha = folha normal do clube x 1,05 (folha no teto fecha perto do zero a zero)
    folga: 2, folgaN: 6,            // ao chegar no clube o teto comporta 2 reforços com o salário do 6º melhor do elenco (Silvio 2026-11-10: contratar uns 2 sem vender)
    caixa0: 6, verba0: 5,           // semanas da folha normal no caixa e na verba ao assinar
    lucro: 0.3,     // parte do lucro da temporada que vira verba extra
    negConf: 1.5,   // confiança da diretoria que cai por rodada no vermelho
    // Patrocínio: parte da receita prevista. Fixo (certo), fixo menor + bônus pela meta (arriscado), ou 3 temporadas travado
    patFix: 0.29, patMix: 0.21, patBonus: 0.15, patLong: 0.3, patYrs: 3,
    // Acordo com a diretoria: verba e teto da temporada contra a meta (posições a mais ou a menos)
    // c: confiança da diretoria no começo; fama: fama a mais (ou a menos) se cumprir a meta; erro: se não cumprir
    AC: { seguro: { v: 0.6, t: 0.96, c: -5, fama: -3, erro: 0 }, normal: { v: 1, t: 1, c: 0, fama: 0, erro: 0 }, ousado: { v: 1.6, t: 1.07, c: 4, fama: 3, erro: -3 } },
    // Empréstimo: até 12 semanas da folha normal, 2% ao mês, 12 parcelas mensais (4 rodadas)
    loanWk: 12, juro: 0.02, loanN: 12, mes: 4,
    // Vermelho: aviso abaixo de 4 semanas de folha; venda forçada com 6 rodadas no vermelho (aviso a partir de 4); ultimato com 8
    avisoWk: 4, vendaAviso: 4, venda: 6, ult: 8,
    eleicao: 3,     // a cada 3 temporadas o presidente pode mudar
  };
  // Perfis do presidente: verba (vm) e o peso do vermelho na confiança (red)
  const PRES = S.CO_PRES = {
    amb: { nome: 'ambicioso', vm: 1.25, red: 1.3, txt: 'Libera mais verba e quer ver o time brigar lá em cima.' },
    pao: { nome: 'pão-duro', vm: 0.8, red: 1.6, txt: 'Segura a verba e não tolera o caixa no vermelho.' },
    pac: { nome: 'paciente', vm: 1, red: 0.6, txt: 'Verba normal e aguenta uma fase ruim no caixa.' },
  };
  // Patrocinadores por país da liga (chave = D.countryOf do clube; '_' vale para os que não têm lista própria).
  // Cada nome tem logo em assets/co/pat-<nome sem acento>.webp (ui/coachland.js patImg). Silvio 2026-11-09: estes são
  // brasileiros; as outras ligas ganham listas próprias depois.
  const SP = S.CO_SPONS = { _: ['Banco Sertão', 'AutoPeças Rota', 'Bet Ouro', 'Supermercados Vila', 'Construtora Arco', 'Seguros Farol', 'Conecta Norte', 'Frigorífico Pampa', 'Laticínios Serra', 'Cooperativa Vale',
    'Ótica Visão', 'Rede Posto Bom', 'Moto Brava', 'Farmácia Cruz', 'Cervejaria Leão', 'Armazém Prime'] };
  // Fora do Brasil (2026-11-10, folhas E e F do ChatGPT; tools/craque_patrocinadores.py): marcas internacionais para todos,
  // mais as de língua espanhola e as de língua inglesa. Portugal segue com a lista brasileira.
  (() => {
    const INT = ['Zefira Air', 'Voltara Energy', 'Orbita Mobile', 'Hexa Cargo', 'Najma Bank', 'Sahra Energy', 'Hoshi Motors', 'Hanul Electronics'];
    const ES = ['Banco Cordillera', 'Seguros Ancla', 'Cerveza El Puerto', 'Mercados El Molino'].concat(INT.slice(0, 4));
    const EN = ['Kestrel Bank', 'Redfox Motors', 'Oakfield Insurance', 'Goldstag Bet'].concat(INT);
    const EU = INT.concat(['Redfox Motors', 'Goldstag Bet']);
    const put = (list, cs) => cs.forEach(c => { SP[c] = list; });
    put(ES, ['Argentina', 'Uruguai', 'Colômbia', 'México', 'Chile', 'Paraguai', 'Equador', 'Peru', 'Bolívia', 'Venezuela', 'Espanha']);
    put(EN, ['Inglaterra', 'Escócia', 'EUA', 'Austrália']);
    put(EU, ['Itália', 'Alemanha', 'França', 'Holanda', 'Turquia', 'Bélgica', 'Grécia', 'Suíça', 'Áustria', 'Dinamarca', 'Croácia', 'Sérvia', 'Noruega', 'Suécia', 'Polônia', 'República Tcheca']);
    put(INT, ['Arábia Saudita', 'Catar', 'Marrocos', 'Egito', 'Japão', 'Coreia do Sul']);
  })();
  S.coFinSpons = co => sponsOf(co);
  const sponsOf = co => { let k = '_'; try { k = D.countryOf(D.CLUB_BY_ID[co.club]) || '_'; } catch (e) {} return SP[k] || SP._; };
  const r10 = v => Math.round(v / 10000) * 10000;
  const r5 = v => Math.round(v / 5000) * 5000;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngOf = (co, tag) => S.rng(hash(co.club + '|' + co.season + '|' + tag + '|' + (co.seed || co.name || '')));
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
  const zero = () => ({ bil: 0, tv: 0, pat: 0, prem: 0, vend: 0, sal: 0, comp: 0, jur: 0 });
  // Receita prevista da temporada pelo tamanho do clube e pelo número de rodadas
  const recOf = (co, n) => baseOf(co) * n / F.marg;
  function newPres(co) {
    const r = rngOf(co, 'pres'), club = D.CLUB_BY_ID[co.club];
    return { n: D.randomName(D.countryOf(club), r), k: r.pick(Object.keys(PRES)), s: co.season };
  }
  function init(co) {
    const base = baseOf(co);
    co.fin = { caixa: r10(base * F.caixa0), verba: r10(base * F.verba0), teto: r5(base * F.teto), rec: 0, ss: zero(), last: null, neg: 0, s: co.season,
      pres: newPres(co), ac: null, pat: null, ops: null, pend: null, loan: null, sold: false, news: [] };
    return co.fin;
  }
  // Saves de antes das finanças: cria na hora, no ponto em que a carreira está; saves da parte 1 ganham o presidente
  S.coFin = co => {
    if (!co || !co.club) return null;
    const f = co.fin || init(co);
    if (!f.pres) { f.pres = newPres(co); f.news = f.news || []; }
    return f;
  };
  const presOf = co => PRES[(S.coFin(co).pres || {}).k] || PRES.pac;
  S.coPres = co => { const f = S.coFin(co); return f ? Object.assign({ n: f.pres.n, k: f.pres.k }, PRES[f.pres.k]) : null; };
  const news = (co, t) => { const f = co.fin; f.news = [{ s: co.season, r: co.ss ? co.ss.i + 1 : 0, t }].concat(f.news || []).slice(0, 5); };
  S.coFinNews = news;

  // ---------- acordo de verba × meta (pré-temporada) ----------
  // As opções em volta da meta da diretoria: segura (mais fácil, menos verba), normal, ousada (mais difícil, mais verba)
  S.coFinAcordos = function (co) {
    const f = S.coFin(co), ss = co.ss; if (!f || !ss || !co.board) return [];
    const g = f.goal0 || co.board.goal, n = ss.ids.length, d = Math.max(2, Math.round(n * 0.15));
    const cap = ss.releg ? n - ss.releg : n - 1, vm = presOf(co).vm;
    const opt = (k, pos, gk) => ({ k, pos, gk, verba: r10(f.verba0 * F.AC[k].v * vm), teto: r5(f.teto0 * F.AC[k].t) + (f.tap || 0) });
    const out = [];
    const sp = Math.min(cap, g.pos + d); if (sp > g.pos) out.push(opt('seguro', sp, 'seguro'));
    out.push(opt('normal', g.pos, g.k));
    const op = Math.max(1, g.pos - d); if (op < g.pos) out.push(opt('ousado', op, 'ousado'));
    return out;
  };
  S.CO_GOAL_TXT.seguro = 'Fazer uma campanha tranquila';
  S.CO_GOAL_TXT.ousado = 'Brigar acima do esperado';
  S.coFinAcordo = function (co, k) {
    const f = S.coFin(co), o = S.coFinAcordos(co).find(x => x.k === k); if (!f || !o) return false;
    co.board.goal = Object.assign({}, f.goal0, { k: o.gk, pos: o.pos });
    f.verba = o.verba;
    f.teto = o.teto; f.ac = k;
    co.board.conf = clamp(co.board.conf + F.AC[k].c, 0, 100);
    if (f.pend) f.pend.ac = 0;
    return true;
  };

  // ---------- patrocínio ----------
  function offers(co) {
    const f = co.fin, r = rngOf(co, 'pat'), fm = clamp(1 + ((co.fame || 0) - 20) / 400, 0.95, 1.15), rec = f.rec;
    const names = sponsOf(co).slice().sort(() => r() - 0.5);
    return [
      { k: 'fix', name: names[0], fix: r10(rec * F.patFix * fm), bonus: 0, yrs: 1 },
      { k: 'mix', name: names[1], fix: r10(rec * F.patMix * fm), bonus: r10(rec * F.patBonus * fm), yrs: 1 },
      { k: 'long', name: names[2], fix: r10(rec * F.patLong * fm), bonus: 0, yrs: F.patYrs },
    ];
  }
  S.coFinPatOps = co => { const f = S.coFin(co); return f && f.ops ? f.ops : []; };
  S.coFinPatrocinio = function (co, k) {
    const f = S.coFin(co), o = (f.ops || []).find(x => x.k === k); if (!o) return false;
    f.pat = { k: o.k, name: o.name, fix: o.fix, bonus: o.bonus, until: co.season + o.yrs - 1 };
    if (f.pend) f.pend.pat = 0;
    return true;
  };
  // O que falta decidir antes do primeiro jogo (acordo e patrocínio)
  S.coFinPend = co => { const f = co && co.club && co.fin; return !!(f && f.pend && (f.pend.ac || f.pend.pat) && co.ss && co.ss.i === 0 && !co.ss.done); };
  // Sem decisão (robô, jogo em pé ou save antigo): o auxiliar fecha o acordo normal e o patrocínio fixo
  S.coFinAuto = function (co) {
    const f = S.coFin(co); if (!f || !f.pend) return;
    if (f.pend.ac) S.coFinAcordo(co, (typeof process !== 'undefined' && process.env && process.env.FIN_AC) || 'normal') || S.coFinAcordo(co, 'normal');
    if (f.pend.pat) S.coFinPatrocinio(co, (typeof process !== 'undefined' && process.env && process.env.FIN_PAT) || 'fix');
    f.pend = null;
  };

  // ---------- banco ----------
  S.coLoanMax = co => { const f = S.coFin(co); return f && !f.loan ? r10(baseOf(co) * F.loanWk) : 0; };
  S.coLoanParc = v => Math.round(v * F.juro / (1 - Math.pow(1 + F.juro, -F.loanN)));
  S.coLoanTake = function (co, v) {
    const f = S.coFin(co); v = r10(v); if (!f || f.loan || v <= 0 || v > S.coLoanMax(co)) return false;
    f.loan = { rem: v, parc: S.coLoanParc(v), n: F.loanN, v };
    f.caixa += v;
    if (f.caixa >= 0) f.neg = 0;
    return true;
  };
  // Pagar antes: quita o que falta do principal, sem multa
  S.coLoanPay = function (co) {
    const f = S.coFin(co); if (!f || !f.loan || f.caixa < f.loan.rem) return false;
    f.caixa -= f.loan.rem; f.loan = null; return true;
  };
  function parcela(co) {
    const f = co.fin, L = f.loan, j = Math.round(L.rem * F.juro), p = Math.min(L.rem + j, L.parc);
    f.caixa -= p; f.ss.jur += j; L.rem = Math.max(0, L.rem - (p - j)); L.n--;
    if (L.n <= 0 || L.rem <= 0) f.loan = null;
  }

  // ---------- vermelho ----------
  // Valor de mercado de um jogador seu (para a venda forçada e, depois, o mercado)
  S.coValue = p => { const k = p.age <= 23 ? 1.6 : p.age <= 27 ? 1.3 : p.age <= 30 ? 1 : 0.6; return r10(p.wage * 52 * k * (1 + Math.max(0, p.pot - p.ovr) / 40)); };
  // Degrau do vermelho: 0 tranquilo, 1 aviso, 2 sem contratar com taxa, 3 o presidente vai vender, 4 ultimato
  S.coFinStep = function (co) {
    const f = S.coFin(co); if (!f) return 0;
    if (f.caixa < 0) return f.neg >= F.ult ? 4 : f.neg >= F.vendaAviso ? 3 : 2;
    return f.caixa < S.coFolha(co) * F.avisoWk ? 1 : 0;
  };
  S.coFinBan = co => { const f = S.coFin(co); return !!(f && f.caixa < 0); };
  // Aporte do investidor (moedas → dinheiro, fase 3 das moedas): 20 moedas = 1 semana da folha normal do clube, entra no
  // caixa e na verba (comprar tira dos dois); até 10 semanas por temporada; no vermelho não pode (não é saída da crise).
  // Fica fora do saldo da temporada (f.ss.apo), então não conta como lucro para a diretoria. Quem cobra as moedas é a tela.
  // 12 moedas = 1 semana da folha (Silvio 2026-11-10: 20 estava caro). Desde 2026-11-11 (Silvio: reconstruir o clube pequeno,
  // "120 pra 600 mil é pouco") cada aporte vale no mínimo `piso` e sobe o teto da folha em `tk` do valor por semana (R$ 25 mil
  // por milhão = o dinheiro paga esse salário por uma temporada); o teto do aporte (`f.tap`) vale enquanto ficar no clube.
  S.CO_APORTE = { coin: 12, max: 10, piso: 500000, tk: 0.025 };
  S.coAporteUsed = co => { const f = S.coFin(co); return f && f.ap && f.ap.s === co.season ? f.ap.wk : 0; };
  S.coAporteLeft = co => { const f = S.coFin(co); return !f || f.caixa < 0 ? 0 : Math.max(0, S.CO_APORTE.max - S.coAporteUsed(co)); };
  S.coAporteValue = (co, wk) => r10(Math.max(baseOf(co), S.CO_APORTE.piso) * wk);
  S.coAporteTeto = v => r5(v * S.CO_APORTE.tk);
  S.coAporte = function (co, wk) {
    wk = Math.round(wk); if (!(wk > 0) || wk > S.coAporteLeft(co)) return 0;
    const f = S.coFin(co), v = S.coAporteValue(co, wk);
    f.caixa += v; f.verba += v; f.ss.apo = (f.ss.apo || 0) + v;
    const t = S.coAporteTeto(v); f.teto += t; f.tap = (f.tap || 0) + t;
    f.ap = { s: co.season, wk: S.coAporteUsed(co) + wk };
    if (f.caixa >= 0) f.neg = 0;
    return v;
  };
  const MIN = { GOL: 2, ZAG: 3, LAT: 2, MEI: 3, ATA: 2 };
  function forcedSale(co) {
    const f = co.fin;
    if (co.squad.length <= 18) return null;
    const cnt = {}; co.squad.forEach(p => { cnt[p.pos] = (cnt[p.pos] || 0) + 1; });
    const p = co.squad.filter(x => cnt[x.pos] > (MIN[x.pos] || 2)).sort((a, b) => b.wage - a.wage || b.ovr - a.ovr)[0];
    if (!p) return null;
    const v = S.coValue(p);
    co.squad = co.squad.filter(x => x !== p);
    if ((co.xi || []).includes(p.id) || (co.bench || []).includes(p.id)) { const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.bench = a.bench; }
    f.caixa += v; f.ss.vend += v; f.sold = true;
    if (S.coWorldSold && S.coMktBuyer) { const b = S.coMktBuyer(co, p, S.rng(hash('forcada|' + p.id + '|' + co.season))); if (b) S.coWorldSold(co, p, b.id, v); }
    news(co, 'O presidente vendeu ' + p.n + ' (' + p.pos + ', ' + p.age + ' anos) por R$ ' + (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : Math.round(v / 1000) + ' mil') + ' para tapar o caixa.');
    return { p, v };
  }

  // Bilheteria de um jogo em casa: parte da receita, mais cheia quando o time está bem na tabela e o rival é grande
  function gate0(co, vs) {
    const fin = co.fin, ss = co.ss, n = ss.ids.length, homes = Math.max(1, ss.rounds.length / 2);
    const pos = S.coPos(co), posF = 1.15 - 0.3 * (pos - 1) / Math.max(1, n - 1);
    const me = D.CLUB_BY_ID[co.club].strength, opp = D.CLUB_BY_ID[vs].strength;
    const oppF = clamp(1 + (opp - me) / 30, 0.8, 1.3);
    return r10(fin.rec * F.bil / homes * posF * oppF) || 10000;
  }
  // Com o estádio (coachest.js) a bilheteria de sempre vira a régua: público e preço do ingresso mexem nela
  const gate = (co, vs) => (S.coEstGate ? S.coEstGate(co, vs, gate0(co, vs)) : gate0(co, vs));
  S.coGateBase = (co, vs) => (S.coFin(co) && co.ss ? gate0(co, vs) : 0);
  S.coGate = (co, vs) => (S.coFin(co) && co.ss ? gate(co, vs) : 0);
  // Patrocínio de saves da parte 1 (sem proposta assinada): o fixo de sempre
  const patOf = co => co.fin.pat || { k: 'fix', name: 'Patrocinador', fix: r10(co.fin.rec * F.patFix), bonus: 0, until: co.season };
  // Uma semana: folha, patrocínio, TV na 1ª rodada e na metade, bilheteria em casa, parcela do banco, vermelho
  function week(co, ri, home, vs) {
    const fin = S.coFin(co); if (!fin || !co.ss) return null;
    if (fin.s !== co.season) { fin.s = co.season; fin.ss = zero(); }
    if (fin.ss.jur === undefined) fin.ss.jur = 0;
    const n = rounds(co);
    if (!fin.rec) fin.rec = recOf(co, n);
    if (fin.pend) S.coFinAuto(co);
    const add = (k, v) => { v = Math.round(v); fin.ss[k] += v; fin.caixa += v; };
    const sub = (k, v) => { v = Math.round(v); fin.ss[k] += v; fin.caixa -= v; };
    sub('sal', S.coFolha(co));
    add('pat', patOf(co).fix / n);
    if (ri === 0 || ri === Math.floor(n / 2)) add('tv', fin.rec * F.tv / 2 * (S.coEstTv ? S.coEstTv(co) : 1));
    let g = 0;
    if (home && vs) { g = gate(co, vs); add('bil', g); }
    if (fin.loan && (ri + 1) % F.mes === 0) parcela(co);
    if (S.coMktWeek) S.coMktWeek(co, ri, sub, add);
    // No vermelho a diretoria perde a paciência aos poucos (mais com o presidente pão-duro, o dobro no ultimato);
    // com 6 rodadas seguidas o presidente vende o jogador mais caro
    if (fin.caixa < 0) {
      fin.neg++;
      if (co.board) co.board.conf = clamp(co.board.conf - F.negConf * presOf(co).red * (fin.neg >= F.ult ? 2 : 1), 0, 100);
      if (fin.neg >= F.venda && !fin.sold) forcedSale(co);
    } else { fin.neg = 0; fin.sold = false; }
    return { gate: g };
  }
  // O que ainda vem na temporada (para a tela)
  S.coFinNext = function (co) {
    const fin = S.coFin(co), ss = co.ss; if (!fin || !ss || ss.done) return [];
    const n = rounds(co), out = [], half = Math.floor(n / 2);
    if (!fin.rec) fin.rec = recOf(co, n);
    const nx = S.coNext(co);
    if (nx && !nx.bye && nx.home) out.push({ k: 'bil', txt: 'Bilheteria contra o ' + (D.CLUB_BY_ID[nx.vs].short || D.CLUB_BY_ID[nx.vs].name), v: gate(co, nx.vs), aprox: true });
    if (ss.i <= half) out.push({ k: 'tv', txt: 'Cota de TV, 2ª parcela · rodada ' + (half + 1), v: r10(fin.rec * F.tv / 2 * (S.coEstTv ? S.coEstTv(co) : 1)) });
    const pt = patOf(co);
    if (pt.bonus) out.push({ k: 'bonus', txt: 'Bônus do patrocínio se cumprir a meta', v: pt.bonus });
    if (ss.promo) out.push({ k: 'acesso', txt: 'Prêmio se subir de divisão', v: r10(fin.rec * F.acesso) });
    else out.push({ k: 'titulo', txt: 'Prêmio se for campeão', v: r10(fin.rec * F.titulo) });
    if (fin.loan) out.push({ k: 'loan', txt: 'Parcela do banco · faltam ' + fin.loan.n, v: -fin.loan.parc });
    (fin.inst || []).forEach(x => out.push({ k: 'inst', txt: 'Parcela do ' + x.n + ' · faltam ' + x.k, v: -x.v }));
    return out;
  };
  S.coFinSemanas = co => { const fin = S.coFin(co), f = S.coFolha(co); return fin && f ? Math.max(0, Math.floor(fin.caixa / f)) : 0; };

  // ---------- ganchos no motor do treinador ----------
  const sign0 = S.coSign;
  // Folga da chegada: o elenco sorteado pode vir com a folha colada no teto (ou acima); o teto sobe até caberem `F.folga` reforços
  // de nível titular. `fin.tmin` guarda esse piso enquanto o técnico fica no clube (o teto do ano seguinte não volta para baixo dele).
  const folgaOf = co => { const sq = (co.squad || []).slice().sort((a, b) => b.ovr - a.ovr), q = sq[Math.min(sq.length, F.folgaN) - 1];
    return q ? Math.ceil((S.coFolha(co) + F.folga * q.wage) / 1000) * 1000 : 0; };
  S.coFinFolga = folgaOf;
  S.coSign = function (co, clubId) { const r = sign0(co, clubId); co.fin = null; const f = init(co), m = folgaOf(co); if (m > f.teto) { f.teto = m; f.tmin = m; } return r; };
  const start0 = S.coStart;
  S.coStart = function (co) {
    const r = start0(co);
    const fin = S.coFin(co);
    if (fin) {
      fin.s = co.season; fin.ss = zero(); fin.rec = recOf(co, rounds(co)); fin.neg = 0; fin.sold = false;
      // Eleição a cada 3 temporadas: metade das vezes entra outro presidente
      if (co.season - fin.pres.s >= F.eleicao) { const p = newPres(co); if (rngOf(co, 'eleicao')() < 0.5 && p.k !== fin.pres.k) { fin.pres = p; news(co, 'Eleição no clube: ' + p.n + ' é o novo presidente (' + PRES[p.k].nome + ').'); } else fin.pres.s = co.season; }
      // A reunião de pré-temporada parte da meta da diretoria e da verba/teto que o fim do ano deixou
      fin.goal0 = Object.assign({}, co.board.goal); fin.verba0 = fin.verba; fin.teto0 = fin.teto - (fin.tap || 0); fin.ac = null;
      const keepPat = fin.pat && fin.pat.until >= co.season;
      fin.ops = keepPat ? null : offers(co);
      if (!keepPat) fin.pat = null;
      fin.pend = { ac: 1, pat: keepPat ? 0 : 1 };
    }
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
    if (fin && fin.pend) S.coFinAuto(co);
    const out = send0(co);
    if (!fin) return out;
    const ss = fin.ss, rec = fin.rec || 0, pt = fin.pat;
    // Acordo: meta segura cumprida vale menos fama; ousada cumprida, mais
    const acF = fin.ac && !out.sacked ? (out.met ? F.AC[fin.ac].fama : F.AC[fin.ac].erro) : 0;
    if (acF) { co.fame = clamp(co.fame + acF, 0, 100); out.fame = [out.fame[0], co.fame]; }
    if (!out.sacked) {
      const add = (k, v) => { v = r10(v); ss[k] += v; fin.caixa += v; };
      if (out.met && pt && pt.bonus) add('pat', pt.bonus);
      if (out.won) add('prem', rec * F.titulo);
      if (out.up) add('prem', rec * F.acesso);
    }
    const ent = ss.bil + ss.tv + ss.pat + ss.prem + ss.vend, sai = ss.sal + ss.comp + (ss.jur || 0), saldo = ent - sai;
    const bal = { season: out.season, club: clubId, ss: Object.assign({}, ss), ent, sai, saldo, caixa: fin.caixa, verba0: fin.verba, teto0: fin.teto, ac: fin.ac, pat: pt ? pt.name : null };
    if (out.sacked) { out.fin = bal; co.fin = null; return out; }
    // A diretoria do ano seguinte: teto pela folha normal (cresce com a divisão), mais 5% se cumpriu a meta no azul;
    // verba nova pelo tamanho do clube mais uma parte do lucro; no vermelho não tem verba (o acordo da pré-temporada ainda mexe nela)
    const base = baseOf(co);
    const good = out.met && saldo > 0;
    fin.teto = Math.max(r5(base * F.teto), fin.tmin || 0, good ? r5((fin.teto0 || (fin.teto - (fin.tap || 0))) * 1.05) : 0) + (fin.tap || 0);
    fin.verba = fin.caixa <= 0 ? 0 : Math.min(r10(fin.caixa * 0.6), r10(base * F.verba0 + Math.max(0, saldo) * F.lucro));
    bal.verba = fin.verba; bal.teto = fin.teto; bal.good = good;
    fin.last = bal; fin.ss = zero(); fin.rec = 0; fin.s = co.season; fin.pend = null;
    out.fin = bal;
    return out;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
