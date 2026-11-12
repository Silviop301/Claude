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
    cra: { k: 0.1 },   // time melhor traz mais receita: +10% por ponto do 11 mais forte acima do normal do clube (S.coFinStar)
    marg: 1.03,     // a folha de um elenco normal do clube pequeno é 103% da receita prevista
    // Clube grande fatura mais que a folha (Silvio 2026-11-12: "nem o Real tanka time de estrelas"): a parte da receita que vai para
    // a folha normal cai de `marg` (força até `lo`) até `big` (força `hi` ou mais). Real ~0,85, Flamengo ~0,92, Remo 1,03. CO_MG = big
    mg: { lo: 60, hi: 84, big: 0.85 },
    tv: 0.4, bil: 0.35,             // partes da receita (o patrocínio vem da proposta escolhida)
    titulo: 0.12, acesso: 0.08,     // prêmios
    lg: { k: 0.3, lo: 0.88, hi: 1.4 },   // peso da divisão na receita: fora da liga de origem, exp(k × diferença de força média / 8,5), entre lo e hi
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
  const normal = (clubId, season, co) => S.coGenSquad(clubId, season, co && { rf: co.rf, lv: co.lv, season: co.season }).reduce((a, p) => a + p.wage, 0);
  // Peso da divisão: a liga em que o clube está hoje contra a liga de origem dele (subiu: mais TV e público; caiu: menos).
  // Na liga de origem vale 1 (a régua de sempre). Até 11/11 a conta comparava a liga de hoje com ela mesma (`applyLeagues`
  // troca o `league` do clube) e dava sempre 1: subir não mexia na receita. Números em `F.lg` (peso, piso, teto).
  const lgAvg = ids => ids.reduce((a, id) => a + D.CLUB_BY_ID[id].strength, 0) / Math.max(1, ids.length);
  function lgMult(clubId) {
    const c = D.CLUB_BY_ID[clubId], l0 = c.league0 || c.league, G = F.lg;
    const k = +((typeof process !== 'undefined' && process.env && process.env.CO_LGK) || G.k);
    if (c.league === l0 || !k) return 1;
    const cur = lgAvg(S._.fcLib.leagueTeams(c)), nat = lgAvg(D.CLUBS.filter(x => (x.league0 || x.league) === l0).map(x => x.id));
    return clamp(Math.exp(k * (cur - nat) / 8.5), G.lo, G.hi);
  }
  S.coFinLg = lgMult;
  const baseOf = co => normal(co.club, co.season, co) * lgMult(co.club);
  S.coFinBase = baseOf;
  // Time melhor traz mais receita (Silvio, 2026-11-12: "quero ter mais problemas com verba pra contratar e fazer as melhorias do
  // que com salários altos"; um time 98 tem de ser possível). Cada ponto do 11 mais forte do elenco acima do 11 normal do clube
  // soma F.cra.k (10%) na receita da rodada ("Camisas e marca", dentro do patrocínio: ss.cra) e no teto da folha. Só soma:
  // time abaixo do normal não perde nada, e o robô (que não compra) fica igual. CO_CRAK=0 desliga.
  const top11 = sq => { const o = sq.map(p => p.ovr).sort((a, b) => b - a).slice(0, 11); return o.length ? o.reduce((a, b) => a + b, 0) / o.length : 0; };
  const n11 = {};
  const norm11 = co => { const k = co.club + ':' + co.season + ':' + (co.rf || 0) + ':' + (co.lv || 0); if (n11[k] === undefined) n11[k] = top11(S.coGenSquad(co.club, co.season, { rf: co.rf, lv: co.lv, season: co.season })); return n11[k]; };
  S.coFinStar = function (co, squad) {
    const k = +((typeof process !== 'undefined' && process.env && process.env.CO_CRAK !== undefined) ? process.env.CO_CRAK : F.cra.k);
    if (!k || !co || !co.club) return 0;
    const d = top11(squad || co.squad || []) - norm11(co); return d > 0.05 ? Math.pow(1 + k, d) - 1 : 0;
  };
  S.coFinStarPts = (co, squad) => Math.max(0, top11(squad || co.squad || []) - norm11(co));
  // por rodada: a receita prevista do ano dividida pelas rodadas, vezes o que o time soma
  S.coFinStarV = (co, squad) => { const f = co.fin, n = rounds(co); return f ? r10((f.rec || recOf(co, n)) / n * S.coFinStar(co, squad)) : 0; };
  // Teto da folha de hoje: o do clube (f.teto) mais o que o time titular soma. `squad` = elenco hipotético (contrato na mesa)
  S.coFinTeto = (co, squad) => { const f = S.coFin(co); return f ? f.teto + r5(baseOf(co) * F.teto * S.coFinStar(co, squad)) : 0; };
  // Salário da auxiliar e do DM: % da folha, mas no máximo da folha normal do clube (Silvio 2026-11-12: o time de estrelas pagava
  // a equipe em dobro e ia para o vermelho)
  const staffBase = co => Math.min(S.coFolha(co), baseOf(co));
  S.coFolha = co => (co.squad || []).reduce((a, p) => a + (p.wage || 0), 0);
  const rounds = co => (co.ss ? co.ss.rounds.length : 38);
  const zero = () => ({ bil: 0, tv: 0, pat: 0, prem: 0, vend: 0, sal: 0, comp: 0, jur: 0 });
  // Receita prevista da temporada pelo tamanho do clube e pelo número de rodadas
  const margOf = clubId => { const G = F.mg, b = +((typeof process !== 'undefined' && process.env && process.env.CO_MG) || G.big), c = D.CLUB_BY_ID[clubId];
    const t = clamp(((c ? c.strength : G.lo) - G.lo) / (G.hi - G.lo), 0, 1); return F.marg - (F.marg - b) * t; };
  S.coFinMarg = margOf;
  const recOf = (co, n) => baseOf(co) * n / margOf(co.club);
  function newPres(co) {
    const r = rngOf(co, 'pres'), club = D.CLUB_BY_ID[co.club];
    return { n: D.randomName(D.countryOf(club), r), k: r.pick(Object.keys(PRES)), s: co.season };
  }
  function init(co) {
    const base = baseOf(co);
    co.fin = { mg: 1, caixa: r10(base * F.caixa0), verba: r10(base * F.verba0), teto: r5(base * F.teto), rec: 0, ss: zero(), last: null, neg: 0, s: co.season,
      pres: newPres(co), ac: null, pat: null, ops: null, pend: null, loan: null, sold: false, news: [] };
    return co.fin;
  }
  // Saves de antes das finanças: cria na hora, no ponto em que a carreira está; saves da parte 1 ganham o presidente
  S.coFin = co => {
    if (!co || !co.club) return null;
    const f = co.fin || init(co);
    if (!f.pres) { f.pres = newPres(co); f.news = f.news || []; }
    // Saves de antes da receita pelo tamanho do clube (12/11): refaz a receita da temporada já em andamento (o patrocínio assinado fica)
    if (f.mg !== 1) { if (f.rec && co.ss) f.rec = recOf(co, rounds(co)); f.mg = 1; }
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
  // bonus (Silvio, 12/11: "um bônus por aporte de mais semanas de uma vez, algo baixo"): [semanas de uma vez, parte a mais no valor]
  S.CO_APORTE = { coin: 12, max: 10, piso: 500000, tk: 0.025, bonus: [[10, 0.15], [5, 0.1], [3, 0.05]] };
  S.coAporteBonus = wk => { const b = S.CO_APORTE.bonus.find(x => wk >= x[0]); return b ? b[1] : 0; };
  S.coAporteUsed = co => { const f = S.coFin(co); return f && f.ap && f.ap.s === co.season ? f.ap.wk : 0; };
  // Com o caixa no vermelho o aporte também vale (Silvio 2026-11-11: "não entendi o bloqueio de aporte"; era bloqueado e a tela
  // não dizia por quê): o dinheiro cobre o buraco primeiro e só o que sobra vira verba para contratar. S.coAportePrev = antes e depois
  S.coAporteLeft = co => { const f = S.coFin(co); return !f ? 0 : Math.max(0, S.CO_APORTE.max - S.coAporteUsed(co)); };
  S.coAportePrev = (co, wk) => { const f = S.coFin(co), v = S.coAporteValue(co, wk), vb = Math.max(0, v - Math.max(0, -f.caixa)), t = S.coAporteTeto(v);
    return { v, red: f.caixa < 0, caixa: [f.caixa, f.caixa + v], verba: [f.verba, f.verba + vb], teto: [f.teto, f.teto + t] }; };
  S.coAporteValue = (co, wk) => r10(Math.max(baseOf(co), S.CO_APORTE.piso) * wk * (1 + S.coAporteBonus(wk)));
  S.coAporteTeto = v => r5(v * S.CO_APORTE.tk);
  S.coAporte = function (co, wk) {
    wk = Math.round(wk); if (!(wk > 0) || wk > S.coAporteLeft(co)) return 0;
    const f = S.coFin(co), v = S.coAporteValue(co, wk);
    f.verba += Math.max(0, v - Math.max(0, -f.caixa)); f.caixa += v; f.ss.apo = (f.ss.apo || 0) + v;
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
    const add = (k, v) => { v = Math.round(v); fin.ss[k] = (fin.ss[k] || 0) + v; fin.caixa += v; };
    const sub = (k, v) => { v = Math.round(v); fin.ss[k] += v; fin.caixa -= v; };
    const ss0 = Object.assign({}, fin.ss), cx0 = fin.caixa;
    sub('sal', S.coFolha(co) + S.coAuxWage(co) + (S.coDmWage ? S.coDmWage(co) : 0)); // a folha e o salário da auxiliar (a Licença C não cobra)
    add('pat', patOf(co).fix / n);
    { const cr = S.coFinStarV(co); if (cr > 0) { add('pat', cr); fin.ss.cra = (fin.ss.cra || 0) + cr; } }
    if (ri === 0 || ri === Math.floor(n / 2)) add('tv', fin.rec * F.tv / 2 * (S.coEstTv ? S.coEstTv(co) : 1));
    let g = 0;
    if (home && vs) { g = gate(co, vs); add('bil', g); if (S.coEstBar) fin.ss.bar = (fin.ss.bar || 0) + S.coEstBar(co, vs, gate0(co, vs), g); }
    if (fin.loan && (ri + 1) % F.mes === 0) parcela(co);
    if (S.coMktWeek) S.coMktWeek(co, ri, sub, add);
    // No vermelho a diretoria perde a paciência aos poucos (mais com o presidente pão-duro, o dobro no ultimato);
    // com 6 rodadas seguidas o presidente vende o jogador mais caro
    if (fin.caixa < 0) {
      fin.neg++;
      if (co.board) co.board.conf = clamp(co.board.conf - F.negConf * presOf(co).red * (fin.neg >= F.ult ? 2 : 1), 0, 100);
      if (fin.neg >= F.venda && !fin.sold) forcedSale(co);
    } else { fin.neg = 0; fin.sold = false; }
    roundLog(co, ri, fin.snap && fin.snap.s === co.season ? fin.snap : { ss: ss0, cx: cx0 }, vs ? (home ? 1 : 0) : -1);
    return { gate: g };
  }
  // Quanto entrou e saiu na rodada (Silvio 2026-11-11: "a cada jogo quanto entrou e quanto saiu; não está claro se vou
  // continuar no positivo"): a diferença do saldo da temporada desde o fim da rodada anterior, então entra também o que
  // aconteceu entre os jogos (compra, venda, aporte, obra). O que mexeu no caixa sem estar no saldo (empréstimo, parte do
  // principal da parcela) vira "Banco e outros". `fin.rd` = { s, r, inn: [[k, v]], out: [[k, v]], cx, dc }
  const RD_IN = ['bil', 'tv', 'pat', 'prem', 'vend', 'apo'], RD_OUT = ['sal', 'comp', 'jur', 'obra'];
  function roundLog(co, ri, snap, h) { // h: 1 em casa, 0 fora, -1 sem jogo
    const fin = co.fin, d = k => Math.round((fin.ss[k] || 0) - ((snap.ss && snap.ss[k]) || 0));
    const bar = d('bar'), cra = d('cra'), inn = RD_IN.map(k => [k, d(k) - (k === 'bil' ? bar : k === 'pat' ? cra : 0)]).concat([['bar', bar], ['cra', cra]]).filter(x => x[1] > 0), out = RD_OUT.map(k => [k, d(k)]).filter(x => x[1] > 0);
    const dc = Math.round(fin.caixa - snap.cx), rest = dc - inn.reduce((a, x) => a + x[1], 0) + out.reduce((a, x) => a + x[1], 0);
    if (rest > 0) inn.push(['out', rest]); else if (rest < 0) out.push(['out', -rest]);
    fin.rd = { s: co.season, r: ri + 1, inn, out, cx: fin.caixa, dc, h };
    // caixa no fim de cada rodada da temporada (a trajetória da tela; save antigo começa na rodada em que está: r0)
    if (!fin.cx || fin.cx.s !== co.season) fin.cx = { s: co.season, r0: ri, v: [snap.cx] };
    fin.cx.v.push(fin.caixa);
    fin.snap = { s: co.season, ss: Object.assign({}, fin.ss), cx: fin.caixa };
  }
  // Trajetória do caixa (Silvio 2026-11-11: "ainda não acho que está clara a trajetória das finanças, se está diminuindo ou
  // crescendo"): `pts` = o caixa no começo e no fim de cada rodada jogada (o último é o de agora), `r0` = rodada em que a conta
  // começa (0 = desde o começo da temporada), `d` = quanto mudou desde lá, `end` = onde o caixa chega no fim da temporada no
  // ritmo de hoje (S.coFinRitmo: rodada comum × rodadas que faltam), `n` = rodadas da temporada
  S.coFinTrend = function (co) {
    const fin = S.coFin(co), ss = co.ss; if (!fin || !ss) return null;
    const R = S.coFinRitmo(co), h = fin.cx && fin.cx.s === co.season ? fin.cx : { r0: ss.i || 0, v: [] };
    const pts = h.v.slice(); if (!pts.length || pts[pts.length - 1] !== fin.caixa) pts.push(fin.caixa);
    return { pts, r0: h.r0, n: rounds(co), i: ss.i || 0, d: pts.length > 1 ? Math.round(fin.caixa - pts[0]) : null, end: R && !ss.done ? Math.round(fin.caixa + R.net * R.rest) : null, R };
  };
  // No ritmo atual: o que entra e sai numa rodada comum daqui até o fim da temporada (patrocínio, bilheteria média, TV que
  // falta dividida pelas rodadas que faltam, contra folha, parcelas do banco e das compras, vendas a receber). Sem compra,
  // venda nem prêmio. { net, left: rodadas que o caixa aguenta (null = não acaba), rest: rodadas que faltam, st: 'up' sobra | 'ok' chega
  // ao fim da temporada | 'warn' mais de 4 rodadas | 'red' 4 ou menos, ou já no vermelho }
  S.coFinRitmo = function (co) {
    const fin = S.coFin(co), ss = co.ss; if (!fin || !ss) return null;
    const n = rounds(co), i = ss.i || 0, half = Math.floor(n / 2), rest = Math.max(1, n - i);
    if (!fin.rec) fin.rec = recOf(co, n);
    const x = fin.s === co.season && fin.ss ? fin.ss : zero(), nx = S.coNext(co);
    const bil = i ? x.bil / i : (nx && !nx.bye && nx.home ? gate(co, nx.vs) / 2 : 0);
    const tv = (i <= half ? fin.rec * F.tv / 2 * (S.coEstTv ? S.coEstTv(co) : 1) : 0) / rest;
    const inn = patOf(co).fix / n + S.coFinStarV(co) + bil + tv + (fin.recv || []).reduce((a, y) => a + y.v, 0) / F.mes;
    const out = S.coFolha(co) + S.coAuxWage(co) + (S.coDmWage ? S.coDmWage(co) : 0) + (fin.loan ? fin.loan.parc / F.mes : 0) + (fin.inst || []).reduce((a, y) => a + y.v, 0) / F.mes;
    const net = Math.round(inn - out);
    if (fin.caixa < 0) return { net, left: 0, rest: n - i, st: 'red', inn: Math.round(inn), out: Math.round(out) };
    const left = net >= 0 ? null : Math.floor(fin.caixa / -net);
    return { net, left, rest: n - i, st: net >= 0 ? 'up' : left >= n - i ? 'ok' : left > 4 ? 'warn' : 'red', inn: Math.round(inn), out: Math.round(out) };
  };
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
      fin.s = co.season; fin.ss = zero(); fin.rec = recOf(co, rounds(co)); fin.mg = 1; fin.neg = 0; fin.sold = false; fin.snap = { s: co.season, ss: zero(), cx: fin.caixa }; fin.rd = null; fin.cx = { s: co.season, r0: 0, v: [fin.caixa] };
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
      if (out.up) { add('prem', rec * F.acesso); out.upPrem = r10(rec * F.acesso); }
    }
    const ent = ss.bil + ss.tv + ss.pat + ss.prem + ss.vend, sai = ss.sal + ss.comp + (ss.jur || 0), saldo = ent - sai;
    const bal = { season: out.season, club: clubId, ss: Object.assign({}, ss), ent, sai, saldo, caixa: fin.caixa, verba0: fin.verba, teto0: fin.teto, ac: fin.ac, pat: pt ? pt.name : null };
    if (out.sacked) { out.fin = bal; co.fin = null; return out; }
    // A diretoria do ano seguinte: teto pela folha normal (cresce com a divisão), mais 5% se cumpriu a meta no azul;
    // verba nova pelo tamanho do clube mais uma parte do lucro; no vermelho não tem verba (o acordo da pré-temporada ainda mexe nela)
    const base = baseOf(co);
    // Subiu: quanto a receita cresce só pela liga de cima (peso da liga nova contra o que valeu neste ano; sem o sobe e desce do elenco sorteado)
    if (out.up && rec) { const n0 = normal(co.club, out.season, co), lg0 = n0 ? rec * margOf(co.club) / rounds(co) / n0 : 1; out.upRec = Math.round((lgMult(co.club) / (lg0 || 1) - 1) * 100); }
    const good = out.met && saldo > 0;
    fin.teto = Math.max(r5(base * F.teto), fin.tmin || 0, good ? r5((fin.teto0 || (fin.teto - (fin.tap || 0))) * 1.05) : 0) + (fin.tap || 0);
    fin.verba = fin.caixa <= 0 ? 0 : Math.min(r10(fin.caixa * 0.6), r10(base * F.verba0 + Math.max(0, saldo) * F.lucro));
    bal.verba = fin.verba; bal.teto = fin.teto; bal.good = good;
    fin.last = bal; fin.ss = zero(); fin.rec = 0; fin.s = co.season; fin.pend = null;
    out.fin = bal;
    return out;
  };

  // ---------- Auxiliar com níveis (Silvio 2026-11-11: "seria legal upar a auxiliar") ----------
  // co.aux = { lv: 0 a 4 (Licença C, B, A, PRO, PRO Elite), n: nome, ela: 1 mulher, fc: rosto (7 ou 8), crs: { to, left } curso
  // andando, seg: [seguiu o plano e venceu?] últimos jogos }. Ela acompanha o técnico de clube em clube (o investimento é seu).
  // O curso é pago do caixa (entra em Contratações) e dura `rounds` rodadas; o salário dela entra na folha (Salários).
  // O que cada licença faz: acc = quantas vezes o plano dela é o melhor; ht = avisa no intervalo se o plano não encaixa;
  // riv = avisa quando o rival muda o plano no meio do jogo; en = diz quem vai cansar antes de cair
  const AX = S.CO_AUX = {
    lv: [{ k: 'C', n: 'Licença C', acc: 0.8, t: 'Monta o plano do jogo. Acerta 4 em 5' },
      { k: 'B', n: 'Licença B', acc: 0.9, ht: 1, t: 'Acerta 9 em 10 e avisa no intervalo' },
      { k: 'A', n: 'Licença A', acc: 0.9, ht: 1, riv: 1, t: 'Avisa quando o rival muda o plano' },
      { k: 'P', n: 'Licença PRO', acc: 0.92, ht: 1, riv: 1, en: 1, t: 'Diz quem vai cansar antes de cair' },
      { k: 'P+', n: 'PRO Elite', acc: 0.95, ht: 1, riv: 1, en: 1, t: 'Quase não erra o plano' }],
    fee: [0, 2, 4, 7, 10],          // preço do curso para chegar ao nível, em semanas da folha de hoje
    wage: [0, 0.03, 0.06, 0.09, 0.12], // salário dela por rodada, em fração da folha (a Licença C vem no pacote)
    rounds: 4, folga: 2,             // rodadas de curso; o caixa tem de seguir com 2 semanas de folha depois de pagar
    names: [['Jorge Sales', 'Paulo Moreira', 'Ricardo Nunes', 'Márcio Teles', 'André Bastos', 'Fábio Leal'], ['Ana Paula Rocha', 'Marta Ribeiro', 'Juliana Prado', 'Camila Duarte', 'Renata Lopes', 'Patrícia Alves']],
  };
  // Cria para carreira nova e save antigo: rosto e nome pelo técnico e o clube de hoje (o mesmo que a tela já mostrava)
  S.coAux = function (co) {
    if (co.aux) return co.aux;
    let h = 7; const t = (co.name || '') + '|' + co.club; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    const ela = h % 2 === 1 ? 1 : 0; // a mesma conta do auxFace de antes (rosto 07 ou 08): quem já jogava vê o mesmo rosto
    return (co.aux = { lv: 0, ela, fc: 7 + ela, n: AX.names[ela][hash(String(co.name || '') + '|aux') % 6], crs: null, seg: [] });
  };
  S.coAuxLv = co => AX.lv[S.coAux(co).lv];
  S.coAuxAcc = co => S.coAuxLv(co).acc;
  S.coAuxWage = co => (co.aux && co.aux.lv ? Math.round(staffBase(co) * AX.wage[co.aux.lv] / 100) * 100 : 0);
  // O próximo curso: { to, fee, wage (por rodada, já no nível novo), rounds, max, doing, why } (why: 'caixa' sem dinheiro)
  S.coAuxPlan = function (co) {
    const a = S.coAux(co), to = a.lv + 1, f = S.coFolha(co), fin = S.coFin(co);
    if (to >= AX.lv.length) return { max: 1 };
    const fee = Math.max(20000, Math.round(f * AX.fee[to] / 1000) * 1000), wage = Math.round(f * AX.wage[to] / 100) * 100;
    const why = a.crs ? 'curso' : !fin || fin.caixa - fee < f * AX.folga ? 'caixa' : '';
    return { to, fee, wage, dw: wage - S.coAuxWage(co), rounds: AX.rounds, doing: a.crs, why };
  };
  S.coAuxBuy = function (co) {
    const P = S.coAuxPlan(co); if (P.max || P.why) return { ok: false, why: P.why || 'max' };
    const fin = S.coFin(co); fin.caixa -= P.fee; fin.ss.comp = (fin.ss.comp || 0) + P.fee;
    co.aux.crs = { to: P.to, left: P.rounds };
    return { ok: true, P };
  };
  // A rodada anda o curso; pronto, sobe o nível e a tela avisa uma vez (S.coAuxDone)
  const auxTick = co => { const a = co.aux; if (!a || !a.crs) return; if (--a.crs.left <= 0) { a.lv = a.crs.to; a.crs = null; a.up = a.lv; } };
  S.coAuxDone = co => { const a = co.aux; if (!a || !a.up) return null; const lv = a.up; delete a.up; return AX.lv[lv]; };
  // Placar de quem seguiu o plano: "seguiu o plano dela: 3 vitórias em 4" (últimos 10 jogos em que seguiu)
  const auxSeg = (co, log) => { if (!log || !log.plan || log.plan === 'off') return; const a = S.coAux(co); a.seg.push(log.res === 'v' ? 1 : 0); if (a.seg.length > 10) a.seg.shift(); };
  const auxEnd0 = S.coMatchEnd;
  S.coMatchEnd = function (co, m) { const log = auxEnd0.apply(this, arguments); if (log) { auxSeg(co, log); auxTick(co); } return log; };
  const auxSkip0 = S.coSkipRound;
  S.coSkipRound = function (co) { auxSkip0.apply(this, arguments); auxTick(co); };

  // ---------- Departamento médico (Silvio 2026-11-11: "gostei de ter o DM"; desenho em /mnt/project-files/climbix/dep-medico/) ----------
  // co.dm = { club, lv: 0 a 4, base (o nível que o clube já tinha: não cobra salário), obra: { to, left }, tt: { k, n } tratamentos da rodada }.
  // É do clube: trocou de clube, o DM é o do clube novo (os grandes já chegam com Fisioterapia ou Recuperação).
  // Medido (wdl.js): recuperar mais entre jogos quase não muda nada (o 11 já entra com ~90%); o que pesa são as lesões.
  // inj = chance de lesão dos seus; cut = rodadas a menos fora; tr = quanto o treino cansa; treat = tratamentos por rodada
  // (você escolhe: o machucado volta 1 rodada antes ou o cansado vai a 100%).
  const DM = S.CO_DM = {
    lv: [{ n: 'Básico', t: 'Massagista e um médico' },
      { n: 'Fisioterapia', t: 'Menos lesões, treino cansa menos' },
      { n: 'Recuperação', t: 'Volta antes e 1 tratamento por rodada' },
      { n: 'Crioterapia', t: 'Ainda menos lesões e cansaço' },
      { n: 'Clínica de elite', t: 'Lesão rara e 2 tratamentos' }],
    inj: [1, 0.85, 0.7, 0.55, 0.4], tr: [1, 0.8, 0.65, 0.5, 0.4], cut: [0, 0, 1, 1, 2], treat: [0, 0, 1, 1, 2],
    fee: [0, 3, 5, 8, 12],             // preço da obra em semanas da folha de hoje
    wage: [0, 0.03, 0.06, 0.09, 0.12], // equipe por rodada, em fração da folha (só o que passa do nível que o clube já tinha)
    rounds: [0, 3, 3, 4, 4], folga: 2,
    docs: [['Dra. Luíza Campos', 11], ['Dra. Helena Viana', 11], ['Dra. Bruna Matos', 11], ['Dra. Carla Ferraz', 11], ['Dra. Renata Lobo', 11]],
  };
  const dmBase = id => { const st = (D.CLUB_BY_ID[id] || {}).strength || 0; return st >= 80 ? 2 : st >= 74 ? 1 : 0; };
  S.coDm = function (co) {
    if (co.dm && co.dm.club === co.club) return co.dm;
    const b = dmBase(co.club);
    return (co.dm = { club: co.club, lv: b, base: b, obra: null, tt: null, doc: hash(String(co.club) + '|dm') % DM.docs.length });
  };
  S.coDmK = (co, k) => (co && co.club ? DM[k][S.coDm(co).lv] : k === 'cut' || k === 'treat' ? 0 : 1);
  S.coDmDoc = co => { const d = DM.docs[S.coDm(co).doc]; return { n: d[0], fc: d[1] }; };
  S.coDmWage = co => { const d = co.dm && co.dm.club === co.club ? co.dm : null; if (!d || d.lv <= d.base) return 0; return Math.round(staffBase(co) * (DM.wage[d.lv] - DM.wage[d.base]) / 100) * 100; };
  S.coDmPlan = function (co) {
    const d = S.coDm(co), to = d.lv + 1, f = S.coFolha(co), fin = S.coFin(co);
    if (to >= DM.lv.length) return { max: 1 };
    const fee = Math.max(30000, Math.round(f * DM.fee[to] / 1000) * 1000);
    const wage = Math.round(f * Math.max(0, DM.wage[to] - DM.wage[d.base]) / 100) * 100;
    const why = d.obra ? 'obra' : !fin || fin.caixa - fee < f * DM.folga ? 'caixa' : '';
    return { to, fee, wage, dw: wage - S.coDmWage(co), rounds: DM.rounds[to], doing: d.obra, why,
      inj: Math.round((1 - DM.inj[to]) * 100), tr: Math.round((1 - DM.tr[to]) * 100), cut: DM.cut[to], treat: DM.treat[to] };
  };
  S.coDmBuy = function (co) {
    const P = S.coDmPlan(co); if (P.max || P.why) return { ok: false, why: P.why || 'max' };
    const fin = S.coFin(co); fin.caixa -= P.fee; fin.ss.comp = (fin.ss.comp || 0) + P.fee;
    co.dm.obra = { to: P.to, left: P.rounds };
    return { ok: true, P };
  };
  // Tratamentos da rodada: quantos sobram e em quem vale a pena (machucados e os mais cansados)
  const dmKey = co => co.season + '|' + (co.ss ? co.ss.i : 0);
  S.coDmLeft = co => { const d = S.coDm(co), n = DM.treat[d.lv]; return Math.max(0, n - (d.tt && d.tt.k === dmKey(co) ? d.tt.n : 0)); };
  S.coDmWho = co => co.squad.filter(p => p.out > 0 || p.en < 85).sort((a, b) => (b.out > 0) - (a.out > 0) || (a.en - b.en)).slice(0, 3);
  S.coDmTreat = function (co, id) {
    const p = co.squad.find(x => String(x.id) === String(id)); if (!p || !S.coDmLeft(co)) return null;
    let what;
    if (p.out > 0) { p.out--; what = p.out ? 'volta' : 'livre'; } else if (p.en < 100) { p.en = 100; what = 'en'; } else return null;
    const d = co.dm, k = dmKey(co); d.tt = d.tt && d.tt.k === k ? { k, n: d.tt.n + 1 } : { k, n: 1 };
    return what;
  };
  const dmTick = co => { const d = co.dm; if (!d || d.club !== co.club || !d.obra) return; if (--d.obra.left <= 0) { d.lv = d.obra.to; d.obra = null; d.up = d.lv; } };
  S.coDmDone = co => { const d = co.dm; if (!d || !d.up) return null; const lv = d.up; delete d.up; return DM.lv[lv]; };
  const dmEnd0 = S.coMatchEnd;
  S.coMatchEnd = function (co, m) { const log = dmEnd0.apply(this, arguments); if (log) dmTick(co); return log; };
  const dmSkip0 = S.coSkipRound;
  S.coSkipRound = function (co) { dmSkip0.apply(this, arguments); dmTick(co); };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
