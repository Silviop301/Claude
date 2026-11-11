// Modo Treinador, estádio: cada clube tem um estádio de 4 setores (Gol Norte, Gol Sul, Arquibancada e Social) com
// 5 níveis cada, o público de cada jogo em casa, o humor da torcida e o preço do ingresso (fases 1 e 2 do plano).
// Mapa e plano: https://claude.ai/artifact/SiGfxWg17aiVgzvpFjUnMz
// co.est = { [id do clube]: { lv: { n, s, a, so } (nível 1 a 5 de cada setor), base (torcida: procura de um jogo comum),
//            hum (humor 0 a 100, só aparece em 5 palavras), sn (temporada do histórico), h: [{ r, vs, pub, cap, res }]
//            (jogos em casa da temporada), occ (lotação de cada setor no último jogo), best (maior público),
//            cap0, lv0 e base0 (o estádio e a torcida da chegada: a régua da bilheteria), pr (preço do ingresso, 0 a 4;
//            2 = normal), obra { k, from, to, left, tot, mode, cost, acc, late } (uma por vez; o setor fica fechado),
//            pay { v, k, n } (parcelas da obra, a cada 4 rodadas), done { k, from, to } (obra pronta que a tela ainda
//            não mostrou) } }
// O estádio é do clube: trocar de time abre o estádio do time novo e o antigo fica guardado.
// Bilheteria (fase 2): a de sempre (`gate()` em coachfin.js) vezes o público contra o público de referência (estádio da
// chegada, torcida tranquila, preço normal) vezes o quanto cada pessoa paga pelo preço. Na referência dá o mesmo valor
// de antes. Em casa a torcida empurra: o humor soma ou tira até `E.push` pontos do seu ataque (tranquila = zero).
// Obras (fase 3): o técnico pede e a diretoria aprova (`S.coEstAsk`); o dinheiro sai do caixa e fica FORA do saldo da
// temporada (`fin.ss.obra`, como o aporte), para a diretoria não cortar verba por causa de obra.
// Nada aqui usa o sorteio da carreira (o público e o atraso da obra saem de contas presas à temporada e à rodada).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const E = S.CO_EST = {
    keys: ['n', 's', 'a', 'so'],
    names: { n: 'Gol Norte', s: 'Gol Sul', a: 'Arquibancada', so: 'Social' },
    lvl: ['', 'Alambrado', 'Arquibancada', 'Dois lances', 'Coberta', 'Arena'],
    gol: [0, 1000, 3000, 6000, 10000, 15000],   // lugares de um setor atrás do gol, por nível
    lat: [0, 2000, 5000, 9000, 14000, 20000],   // lugares de um setor lateral
    tgt: { s0: 46, k: 0.42, e: 1.35 },          // tamanho do estádio da chegada pela força do clube (mil lugares)
    bias: { a: 1.2, so: 0.5, n: 0.2, s: 0 },    // ordem em que os setores crescem (a lateral de cima primeiro)
    dem: 0.86,                                  // torcida tranquila num jogo comum: 86% do estádio da chegada
    humF: [0.7, 1.3],                           // procura com a torcida revoltada e em festa
    // Ingresso em 5 palavras: quanto cada pessoa paga, quanta gente quer ir e o que a torcida acha a cada jogo em casa
    price: { names: ['Popular', 'Barato', 'Normal', 'Caro', 'Salgado'], rev: [0.6, 0.8, 1, 1.25, 1.5], dem: [1.45, 1.2, 1, 0.76, 0.58], hum: [1.5, 0.6, 0, -0.8, -2],
      txt: ['sobe', 'sobe um pouco', 'não muda', 'cai um pouco', 'cai'] },
    occW: { n: 1.08, s: 1.08, a: 1, so: 0.9 },  // os gols enchem antes, a Social por último
    full: 0.98,                                 // a partir daqui conta como casa cheia
    sec: { n: 0.7, s: 0.7, a: 1, so: 1.5 },     // quanto vale um lugar de cada setor (gol popular, social mais cara)
    prem: [0, 1, 1, 1, 1.15, 1.3],              // lugar coberto e de arena vale mais
    // Obras: rodadas e preço (em jogos cheios do setor novo) por nível de chegada; três jeitos de fazer
    obra: { rounds: [0, 0, 4, 6, 8, 12], games: [0, 0, 36, 38, 48, 60],
      modes: { rap: { name: 'Rápida', c: 1.25, t: 0.5 }, nor: { name: 'Normal', c: 1, t: 1 }, eco: { name: 'Econômica', c: 0.8, t: 1, late: 4, p: 1 / 3 } },
      novo: 0.5,      // parte dos lugares novos que vira torcida nova (procura)
      folga: 4,       // a diretoria só aprova se sobrarem tantas semanas de folha no caixa
      rest: 0.5,      // ... e essa parte das parcelas que ainda vêm (parcelar ajuda, mas não deixa o caixa no osso)
      amb: 0.2,       // o presidente ambicioso banca essa parte
      ferias: 8,      // rodadas que a obra anda entre uma temporada e outra
      mes: 4,         // parcela a cada tantas rodadas
      rush: 2, rushMax: 2, rushCoins: 10,   // acelerar com moedas: rodadas a menos, vezes por obra, preço
      hum: 6 },       // a torcida gosta de setor novo
    // Melhorias (fase 4): 4 melhorias com 3 níveis; uma por vez, e pode andar junto com uma obra de setor
    mel: { keys: ['g', 'l', 'b', 'c'], names: { g: 'Gramado', l: 'Refletores', b: 'Bares e loja', c: 'Camarotes' },
      rounds: { g: 2, l: 4, b: 3, c: 6 },   // prazo em rodadas
      pay: 3,                               // o preço = tantas temporadas do que a melhoria rende
      tv: 0.03, bar: 0.08, cam: 0.05, bar0: 0.15,       // por nível: cota de TV, renda por torcedor, camarote (parte da bilheteria de um jogo comum, fixa: não depende do público nem do humor)
      gram: 0.05, gramCost: 0.012,          // gramado: o time cansa menos em casa por nível; não rende dinheiro, custa essa parte da receita do ano vezes o nível
      camSo: 4,                             // camarotes pedem a Social coberta
      // 5 níveis desde 2026-11-11 (Silvio: "bem pouco ter só 3 melhorias por categoria"): os níveis 4 e 5 dão o mesmo ganho
      // de um nível, custam e demoram 1,5x e 2x e pedem estádio de 25 mil e 40 mil lugares (a chegada segue indo até o 3)
      max: 5, costK: [1, 1, 1, 1.5, 2], timeK: [1, 1, 1, 1.5, 2], need: { 4: 25000, 5: 40000 },
      word: { g: ['castigado', 'bom', 'ótimo', 'tapete', 'de seleção', 'de Copa'], l: ['sem', 'simples', 'de TV', 'de arena', 'de final', 'de Copa'] } },
    // Nome do estádio: com tantos lugares e camarotes um patrocinador oferece essa parte da receita por ano, por `anos` temporadas; aceitar tira `hum` do humor
    nome: { cap: 20000, v: 0.03, anos: 3, hum: 20, wait: 2 },
    // Acontecimentos (fase 5)
    ev: { showCap: 12000, showP: 0.6, showV: 1.2, showGames: 2, showBonus: 2, showEn: 1.1,   // show: com tantos lugares, nessa parte das temporadas; paga tantos jogos comuns e o gramado sofre por `showGames` jogos em casa
      fechaHum: 20, fechaP: 0.35,   // portões fechados: derrota em casa com a torcida revoltada (clássico, goleada ou nessa chance)
      ligaR: 4, ligaK: 0.25,        // exigência da liga: subiu sem refletores, multa por jogo em casa da rodada 5 em diante (parte da bilheteria de um jogo comum)
      tit: 3, titR: 2 },            // jogo do título: líder nas 2 últimas rodadas, a procura triplica
    prize: { obra: 10, dobro: 25, arena: 40 },   // moedas do legado, uma vez por conta: 1ª obra, estádio dobrado, 1º setor no nível Arena
    push: 3,                                    // torcida em festa empurra o time em casa (pontos no ataque, como o bônus de leitura); revoltada pesa o mesmo tanto
    hum: ['revoltada', 'impaciente', 'tranquila', 'empolgada', 'em festa'],
    dh: { v: 4, e: 0.5, d: -3.2, home: 1.25, classic: 1.5, gol: 2, in: 0.6, out: -0.4, pull: 0.06 },
    end: { won: 20, up: 12, met: 6, miss: -6, down: -18, keep: 0.5 },
    // Nome de verdade do estádio (sem nome de patrocinador); os outros clubes aparecem só como "Estádio"
    real: {
      'Flamengo': 'Maracanã', 'Fluminense': 'Maracanã', 'Vasco': 'São Januário', 'Botafogo': 'Nilton Santos',
      'Palmeiras': 'Palestra Itália', 'São Paulo': 'Morumbi', 'Santos': 'Vila Belmiro', 'Corinthians': 'Itaquera',
      'Grêmio': 'Arena do Grêmio', 'Internacional': 'Beira-Rio', 'Cruzeiro': 'Mineirão', 'Atlético-MG': 'Arena MRV',
      'Bahia': 'Fonte Nova', 'Vitória': 'Barradão', 'Fortaleza': 'Castelão', 'Ceará': 'Castelão', 'Sport': 'Ilha do Retiro',
      'Náutico': 'Aflitos', 'Santa Cruz': 'Arruda', 'Athletico-PR': 'Arena da Baixada', 'Coritiba': 'Couto Pereira',
      'Paraná': 'Vila Capanema', 'Goiás': 'Serrinha', 'Vila Nova': 'OBA', 'Atlético-GO': 'Antônio Accioly',
      'Remo': 'Baenão', 'Paysandu': 'Curuzu', 'Juventude': 'Alfredo Jaconi', 'Chapecoense': 'Arena Condá',
      'Criciúma': 'Heriberto Hülse', 'Avaí': 'Ressacada', 'Figueirense': 'Orlando Scarpelli', 'Ponte Preta': 'Moisés Lucarelli',
      'Guarani': 'Brinco de Ouro', 'Portuguesa': 'Canindé', 'América-MG': 'Independência', 'CRB': 'Rei Pelé', 'CSA': 'Rei Pelé',
      'ABC': 'Frasqueirão', 'Cuiabá': 'Arena Pantanal', 'Mirassol': 'Maião', 'Red Bull Bragantino': 'Nabi Abi Chedid',
      'Real Madrid': 'Santiago Bernabéu', 'Barcelona': 'Camp Nou', 'Atlético de Madrid': 'Metropolitano', 'Sevilla': 'Sánchez-Pizjuán',
      'Valencia': 'Mestalla', 'Athletic Bilbao': 'San Mamés', 'Real Betis': 'Benito Villamarín',
      'Manchester United': 'Old Trafford', 'Liverpool': 'Anfield', 'Chelsea': 'Stamford Bridge', 'Newcastle': 'St James\' Park',
      'Everton': 'Goodison Park', 'Aston Villa': 'Villa Park', 'Leeds United': 'Elland Road', 'West Ham': 'Estádio Olímpico de Londres',
      'Milan': 'San Siro', 'Inter de Milão': 'San Siro', 'Juventus': 'Juventus Stadium', 'Roma': 'Olímpico de Roma', 'Lazio': 'Olímpico de Roma',
      'Napoli': 'Diego Armando Maradona', 'Borussia Dortmund': 'Westfalenstadion', 'Olympique de Marseille': 'Vélodrome',
      'Monaco': 'Louis II', 'Crystal Palace': 'Selhurst Park', 'Nottingham Forest': 'City Ground', 'Club Brugge': 'Jan Breydel', 'PSG': 'Parc des Princes', 'Benfica': 'Estádio da Luz', 'Porto': 'Estádio do Dragão',
      'Sporting': 'José Alvalade', 'Ajax': 'Johan Cruijff Arena', 'Celtic': 'Celtic Park', 'Rangers': 'Ibrox',
      'Boca Juniors': 'La Bombonera', 'River Plate': 'Monumental de Núñez', 'Racing': 'El Cilindro', 'Independiente': 'Libertadores de América',
      'Peñarol': 'Campeón del Siglo', 'Nacional': 'Gran Parque Central', 'Colo-Colo': 'Monumental de Santiago',
    },
  };

  // Número de 0 a 1 preso a um texto (não gasta o sorteio da carreira)
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  const seats = (k, lv) => (k === 'n' || k === 's' ? E.gol : E.lat)[clamp(lv | 0, 0, 5)];
  const capOf = lv => E.keys.reduce((a, k) => a + seats(k, lv[k]), 0);
  // Valor dos lugares: cada um pesa pelo setor e pelo nível (é o que a bilheteria e o preço da obra enxergam)
  const valOf = lv => E.keys.reduce((a, k) => a + seats(k, lv[k]) * E.sec[k] * E.prem[clamp(lv[k] | 0, 0, 5)], 0);
  // Os setores abertos: o que está em obra fica fechado até ela acabar
  const openLv = e => (e.obra ? Object.assign({}, e.lv, { [e.obra.k]: 0 }) : e.lv);
  S.coEstSeats = seats;
  S.coEstCap = e => capOf(e.lv);
  S.coEstOpen = e => capOf(openLv(e));

  // Estádio da chegada: cresce setor a setor até o tamanho que a força do clube pede
  function startLv(clubId) {
    const cl = D.CLUB_BY_ID[clubId], str = cl ? (cl.strength0 || cl.strength) : 50, T = E.tgt;
    const tgt = clamp(6 + Math.pow(Math.max(0, str - T.s0), T.e) * T.k, 6, 70) * 1000;
    const flip = hash('est-lado-' + clubId) < 0.5;   // metade dos clubes tem o gol maior do outro lado
    const bias = Object.assign({}, E.bias); if (flip) { bias.n = E.bias.s; bias.s = E.bias.n; }
    const lv = { n: 1, s: 1, a: 1, so: 1 }, ord = flip ? ['a', 'so', 's', 'n'] : ['a', 'so', 'n', 's'];
    for (let i = 0; i < 16; i++) {
      const k = ord.filter(x => lv[x] < 5).sort((x, y) => (lv[x] - bias[x]) - (lv[y] - bias[y]))[0];
      if (!k) break;
      const now = capOf(lv); lv[k]++;
      if (Math.abs(capOf(lv) - tgt) >= Math.abs(now - tgt)) { lv[k]--; break; }
    }
    return lv;
  }
  S.coEstStart = startLv;
  // Melhorias da chegada, pela força do clube (camarote só com a Social coberta)
  function startUp(clubId, lv) {
    const cl = D.CLUB_BY_ID[clubId], str = cl ? (cl.strength0 || cl.strength) : 50, st = (a, b, c) => (str < a ? 0 : str < b ? 1 : str < c ? 2 : 3);
    return { g: st(50, 68, 82), l: st(54, 70, 82), b: st(58, 73, 85), c: lv.so >= E.mel.camSo ? st(0, 78, 87) : 0 };
  }
  S.coEstStartUp = id => startUp(id, startLv(id));

  // O estádio do clube atual (cria na primeira vez; save antigo ganha o dele aqui)
  S.coEst = function (co, clubId) {
    const id = clubId || (co && co.club);
    if (!co || !id || !D.CLUB_BY_ID[id]) return null;
    co.est = co.est || {};
    let e = co.est[id];
    if (!e || !e.lv) { const lv = startLv(id); e = co.est[id] = { lv, base: Math.round(capOf(lv) * E.dem), hum: 50, sn: co.season, h: [], occ: null, best: 0, cap0: capOf(lv), pr: 2 }; }
    if (!e.cap0) e.cap0 = capOf(e.lv);   // estádio criado na fase 1 (sem obra ainda): a chegada é o que ele tem
    if (!e.lv0) { e.lv0 = Object.assign({}, e.lv); e.base0 = e.base; }   // idem para quem veio da fase 2
    if (!e.up) { e.up = startUp(id, e.lv0); e.up0 = Object.assign({}, e.up); }   // melhorias (fase 4): o que conta é o que subiu desde a chegada
    if (!(e.pr >= 0 && e.pr <= 4)) e.pr = 2;
    if (e.sn !== co.season && (!clubId || clubId === co.club)) { e.sn = co.season; e.h = []; }
    return e;
  };
  S.coEstName = id => { const cl = D.CLUB_BY_ID[id]; return (cl && E.real[cl.name]) || null; };
  S.coEstHumIdx = h => clamp(Math.floor((h == null ? 50 : h) / 20), 0, 4);
  S.coEstHum = e => E.hum[S.coEstHumIdx(e && e.hum)];
  const humF = h => (h < 50 ? E.humF[0] + (1 - E.humF[0]) * h / 50 : 1 + (E.humF[1] - 1) * (h - 50) / 50);

  // Público de um jogo em casa: a torcida (base) pelo humor, pelo momento na tabela, pelo tamanho do rival e pelo preço,
  // até caber. ref = o público de referência do mesmo jogo (estádio da chegada, torcida tranquila, preço normal).
  S.coEstCrowd = function (co, vs, round, pr, open) {
    const e = S.coEst(co); if (!e || !co.ss) return null;
    const cap = capOf(openLv(e)), n = co.ss.ids.length, pos = S.coPos(co) || 1;
    const posF = 1.15 - 0.3 * (pos - 1) / Math.max(1, n - 1);
    const me = D.CLUB_BY_ID[co.club].strength, opp = (D.CLUB_BY_ID[vs] || {}).strength || me;
    const oppF = clamp(1 + (opp - me) / 30, 0.8, 1.3), cls = (D.RIVALS[co.club] || []).includes(vs) ? 1.15 : 1;
    const r = round == null ? co.ss.i : round, nz = 0.95 + 0.1 * hash('est-pub-' + co.club + '-' + co.season + '-' + r);
    const tit = r >= co.ss.rounds.length - E.ev.titR && pos === 1;   // jogo do título em casa: todo mundo quer ir
    const p = pr == null ? e.pr : pr, f = posF * oppF * cls * nz * (tit ? E.ev.tit : 1), game = e.base0 * f, want = e.base * f * humF(e.hum) * E.price.dem[p];
    const r100 = v => Math.max(100, Math.round(v / 100) * 100);
    const closed = !!e.cl && !open;   // portões fechados: ninguém entra
    const pub = closed ? 0 : Math.min(cap, r100(want)), ref = Math.min(e.cap0, r100(game)), ratio = pub / cap, occ = {};
    E.keys.forEach(k => { occ[k] = e.obra && e.obra.k === k ? 0 : pub >= cap ? 1 : clamp(ratio * E.occW[k], 0, 1); });
    // q: quanto vale em média um lugar aberto hoje contra um lugar do estádio da chegada
    const ol = openLv(e), q = (valOf(ol) / Math.max(1, capOf(ol))) / (valOf(e.lv0) / e.cap0);
    return { pub, cap, ref, q, pr: p, vs, r, want: Math.round(want), full: pub >= cap * E.full, occ, closed, tit };
  };
  // Bilheteria com o estádio: g0 é a de sempre (coachfin.js). No fim do jogo usa o público que foi ao jogo (e.now)
  S.coEstGate = function (co, vs, g0, pr) {
    const e = S.coEst(co); if (!e || !co.ss || !vs) return g0;
    const cr = pr == null && e.now && e.now.vs === vs ? e.now : S.coEstCrowd(co, vs, null, pr);
    if (!cr || !cr.ref) return g0;
    return gateOf(co, e, cr, g0);
  };
  // Quanto da bilheteria é bares, lojas e camarotes (Silvio 11/11: "não era pra entrar dos bares e lojas por rodada?"): só a
  // divisão para a tela, o total não muda. A renda por torcedor na chegada é 1 = ingresso (1 − bar0) + bares (bar0); cada nível
  // de Bares e loja soma M.bar e os camarotes entram inteiros. Fica em fin.ss.bar (dentro de fin.ss.bil) e a aba Rodada separa
  S.coEstBar = function (co, vs, g0, tot) {
    const e = S.coEst(co); if (!e || !co.ss || !vs || !tot) return 0;
    const cr = e.now && e.now.vs === vs ? e.now : S.coEstCrowd(co, vs); if (!cr || !cr.ref || cr.closed) return 0;
    const M = E.mel, x = S.coEstExtra(co), K = g0 * (cr.pub / cr.ref) * cr.q * E.price.rev[cr.pr] / (1 + M.bar * e.up0.b);
    return Math.min(tot, Math.round((K * (M.bar0 + M.bar * e.up.b) + x.cam) / 1000) * 1000);
  };
  // A multa da liga por jogo em casa (0 sem exigência, com refletores ou antes da rodada `ligaR`)
  const ligaFine = (co, e, r) => (e.lg && e.up.l < 1 && co.ss && (r == null ? co.ss.i : r) >= E.ev.ligaR ? Math.max(1000, Math.round(gameBase(co) * E.ev.ligaK / 1000) * 1000) : 0);
  function gateOf(co, e, cr, g0) {
    if (cr.closed) return 0;
    const x = S.coEstExtra(co);
    return Math.max(1000, Math.round((g0 * (cr.pub / cr.ref) * cr.q * E.price.rev[cr.pr] * x.bar + x.cam) / 1000) * 1000 - ligaFine(co, e, cr.r));
  }
  // O que as melhorias mudam no dinheiro, sempre contra a chegada: bar multiplica a renda por torcedor, cam soma um valor
  // fixo por jogo em casa, tv multiplica a cota de TV (coachfin.js)
  const gameBase = co => { const fin = S.coFin ? S.coFin(co) : null; return fin && co.ss ? (fin.rec || 0) * S.CO_FIN.bil / Math.max(1, co.ss.rounds.length / 2) : 0; };
  S.coEstExtra = function (co) {
    const e = S.coEst(co), M = E.mel; if (!e) return { bar: 1, cam: 0, tv: 1 };
    return { bar: (1 + M.bar * e.up.b) / (1 + M.bar * e.up0.b), cam: Math.round((e.up.c - e.up0.c) * M.cam * gameBase(co)), tv: (1 + M.tv * e.up.l) / (1 + M.tv * e.up0.l) };
  };
  S.coEstTv = co => (co && co.club && co.est && co.est[co.club] && co.est[co.club].up ? S.coEstExtra(co).tv : 1);
  S.coEstPrice = function (co, i) { const e = S.coEst(co); if (!e || !(i >= 0 && i <= 4)) return false; e.pr = i | 0; return true; };
  // O próximo jogo em casa da temporada (id do rival e rodada), ou null
  S.coEstNextHome = function (co) {
    const ss = co.ss; if (!ss || ss.done) return null;
    const me = ss.ids.indexOf(co.club);
    for (let i = ss.i; i < ss.rounds.length; i++) { const g = ss.rounds[i].find(x => x[0] === me); if (g) return { vs: ss.ids[g[1]], r: i }; }
    return null;
  };
  // Os 5 preços lado a lado para o próximo jogo em casa (sem jogo marcado: um rival do tamanho do clube)
  S.coEstPrices = function (co) {
    const e = S.coEst(co); if (!e || !co.ss || !S.coGateBase) return null;
    const nx = S.coEstNextHome(co), vs = nx ? nx.vs : co.club, r = nx ? nx.r : co.ss.rounds.length, g0 = S.coGateBase(co, vs);
    return { vs: nx ? nx.vs : null, now: e.pr, closed: !!(e.cl && nx), list: E.price.names.map((name, i) => { const cr = S.coEstCrowd(co, vs, r, i, true); return { i, name, pub: cr.pub, cap: cr.cap, full: cr.full, gate: gateOf(co, e, cr, g0), hum: E.price.hum[i], txt: E.price.txt[i] }; }) };
  };

  // Por que a torcida está assim, numa frase curta
  S.coEstWhy = function (co) {
    const e = S.coEst(co); if (!e) return '';
    const h = e.h || [];
    if (e.obra) return 'ansiosa pelo ' + E.names[e.obra.k] + ' novo';
    let inv = 0, der = 0;
    for (let i = h.length - 1; i >= 0 && h[i].res !== 'd'; i--) inv++;
    for (let i = h.length - 1; i >= 0 && h[i].res === 'd'; i--) der++;
    if (inv >= 3) return 'invicto em casa há ' + inv + ' jogos';
    if (der >= 2) return der + ' derrotas seguidas em casa';
    if (!co.ss || !co.board || !co.board.goal) return '';
    if (!h.length && !co.ss.i) return 'esperando a estreia';
    const pos = S.coPos(co), g = co.board.goal;
    if (g.k === 'titulo') return pos === 1 ? 'time na ponta' : 'cobrando o título';
    return pos <= g.pos ? 'time dentro da meta' : 'time abaixo da meta';
  };

  // ---------- obras (fase 3) ----------
  const r10k = v => Math.max(10000, Math.round(v / 10000) * 10000);
  // O que um "ponto de valor" de lugar rende num jogo cheio, pela bilheteria de sempre de um jogo comum
  function unit(co, e) {
    const fin = S.coFin ? S.coFin(co) : null; if (!fin || !co.ss) return 0;
    return (fin.rec || 0) * S.CO_FIN.bil / Math.max(1, co.ss.rounds.length / 2) / valOf(e.lv0);
  }
  // O plano de ampliar um setor: lugares a mais, quanto rende por jogo cheio e os três jeitos de fazer
  S.coEstPlan = function (co, k) {
    const e = S.coEst(co); if (!e || E.keys.indexOf(k) < 0) return null;
    const from = e.lv[k], to = from + 1, O = E.obra, pres = S.coPres ? S.coPres(co) : null, fin = S.coFin ? S.coFin(co) : null;
    if (to > 5) return { k, from, max: true };
    const add = seats(k, to) - seats(k, from), dv = (seats(k, to) * E.prem[to] - seats(k, from) * E.prem[from]) * E.sec[k], u = unit(co, e);
    const part = pres && pres.k === 'amb' ? 1 - O.amb : 1;
    const modes = Object.keys(O.modes).map(id => { const M = O.modes[id]; return { id, name: M.name, cost: r10k(dv * u * O.games[to] * M.c * part), rounds: Math.max(1, Math.ceil(O.rounds[to] * M.t)), risk: !!M.late }; });
    return { k, from, to, add, perGame: Math.round(dv * u / 1000) * 1000, modes, payMax: pres && pres.k === 'pao' ? 1 : 3, amb: part < 1, caixa: fin ? fin.caixa : 0, busy: !!e.obra };
  };
  // A regra da diretoria para obra e melhoria: x = 1, 2 ou 3 parcelas (a primeira sai na hora). Aprovou: já tira a 1ª do caixa
  function boardPay(co, cost, x, payMax) {
    const fin = S.coFin(co), O = E.obra; x = clamp(x | 0, 1, 3);
    if (x > payMax) return { ok: false, why: 'pao', cost };
    const first = x > 1 ? Math.ceil(cost / x / 1000) * 1000 : cost, need = O.folga * S.coFolha(co) + (cost - first) * O.rest;
    if (fin.caixa < 0) return { ok: false, why: 'vermelho', cost, caixa: fin.caixa };
    if (co.board && co.board.ult) return { ok: false, why: 'ultimato', cost, caixa: fin.caixa };
    if (fin.caixa - first < need) return { ok: false, why: 'folga', cost, first, caixa: fin.caixa, need: first + need };
    fin.caixa -= first; fin.ss.obra = (fin.ss.obra || 0) + first;
    const pay = x > 1 ? { v: Math.ceil((cost - first) / (x - 1) / 1000) * 1000, k: x - 1, n: 0 } : null;
    return { ok: true, first, part: pay ? pay.v : 0, parts: x - 1, nextR: co.ss.i + O.mes + 1, cost, pay };
  }
  // Pedir a obra à diretoria. Devolve { ok } ou { ok: false, why }
  S.coEstAsk = function (co, k, mode, x) {
    const e = S.coEst(co), P = S.coEstPlan(co, k), fin = S.coFin ? S.coFin(co) : null, O = E.obra;
    if (!e || !P || !fin || !co.ss) return { ok: false, why: 'nada' };
    if (e.obra) return { ok: false, why: 'obra' };
    if (P.max) return { ok: false, why: 'max' };
    const M = P.modes.find(o => o.id === mode) || P.modes[1], r = boardPay(co, M.cost, x, P.payMax);
    if (!r.ok) return r;
    const late = O.modes[M.id].late && hash('est-atraso-' + co.club + '-' + co.season + '-' + co.ss.i + '-' + k) < O.modes[M.id].p ? O.modes[M.id].late : 0;
    e.obra = { k, from: P.from, to: P.to, left: M.rounds, tot: M.rounds, mode: M.id, cost: M.cost, acc: 0, late };
    e.pay = r.pay; delete r.pay; r.rounds = M.rounds;
    return r;
  };
  // ---------- melhorias (fase 4) ----------
  // O plano de uma melhoria: o que o próximo nível dá, quanto rende por temporada, prazo e preço
  S.coEstMelPlan = function (co, k) {
    const e = S.coEst(co), M = E.mel, fin = S.coFin ? S.coFin(co) : null, pres = S.coPres ? S.coPres(co) : null; if (!e || M.keys.indexOf(k) < 0) return null;
    const from = e.up[k], to = from + 1, name = M.names[k], lock = k === 'c' && e.lv.so < M.camSo;
    if (to > M.max) return { k, name, from, max: true };
    const need = M.need[to] && S.coEstCap(e) < M.need[to] ? M.need[to] : 0;   // nível 4 e 5: só com o estádio desse tamanho (setor em obra conta)
    if (fin && !fin.rec && S.coFinNext) S.coFinNext(co);
    const rec = fin ? fin.rec || 0 : 0, part = pres && pres.k === 'amb' ? 1 - E.obra.amb : 1;
    const perSeason = k === 'l' ? rec * S.CO_FIN.tv * M.tv / (1 + M.tv * e.up0.l) : k === 'b' ? rec * S.CO_FIN.bil * M.bar / (1 + M.bar * e.up0.b) : k === 'c' ? rec * S.CO_FIN.bil * M.cam : 0;
    const cost = r10k((k === 'g' ? rec * M.gramCost * to : perSeason * M.pay) * part * (M.costK[to - 1] || 1));
    return { k, name, from, to, lock, need, perSeason: Math.round(perSeason / 1000) * 1000, rounds: Math.ceil(M.rounds[k] * (M.timeK[to - 1] || 1)), cost, payMax: pres && pres.k === 'pao' ? 1 : 3, amb: part < 1, busy: !!e.mel };
  };
  S.coEstMelAsk = function (co, k, x) {
    const e = S.coEst(co), P = S.coEstMelPlan(co, k), fin = S.coFin ? S.coFin(co) : null;
    if (!e || !P || !fin || !co.ss) return { ok: false, why: 'nada' };
    if (e.mel) return { ok: false, why: 'obra' };
    if (P.max) return { ok: false, why: 'max' };
    if (P.lock) return { ok: false, why: 'social' };
    if (P.need) return { ok: false, why: 'lugares', need: P.need };
    const r = boardPay(co, P.cost, x, P.payMax);
    if (!r.ok) return r;
    e.mel = { k, to: P.to, left: P.rounds, tot: P.rounds };
    e.pay2 = r.pay; delete r.pay; r.rounds = P.rounds;
    return r;
  };
  function melDone(co, e, quiet) {
    const m = e.mel; if (!m) return;
    e.up[m.k] = m.to; e.mel = null;
    if (e.lg && e.up.l >= 1) { delete e.lg; if (!quiet && S.coFinNews && co.fin) S.coFinNews(co, 'Refletores prontos: a liga liberou o estádio e a multa acabou.'); return; }
    if (!quiet && S.coFinNews && co.fin) S.coFinNews(co, E.mel.names[m.k] + (m.k === 'g' ? ' novo no estádio.' : m.k === 'b' ? ': a reforma ficou pronta.' : ' prontos no estádio.'));
  }
  // ---------- nome do estádio (fase 4) ----------
  // A proposta que está na mesa (ou null). Aparece com `nome.cap` lugares e camarotes, sem contrato valendo
  S.coEstNome = function (co) {
    const e = S.coEst(co), N = E.nome, fin = S.coFin ? S.coFin(co) : null; if (!e || !fin || !co.ss || co.ss.done) return null;
    if (e.nm || capOf(e.lv) < N.cap || e.up.c < 1 || (e.nmS != null && co.season < e.nmS)) return null;
    if (!fin.rec && S.coFinNext) S.coFinNext(co);
    const list = (S.coFinSpons ? S.coFinSpons(co) : null) || S.CO_SPONS._, sp = list[Math.floor(hash('est-nome-' + co.club + '-' + co.season) * list.length)];
    return { sp, n: 'Arena ' + sp, v: r10k((fin.rec || 0) * N.v), anos: N.anos };
  };
  // Aceitar: o dinheiro do 1º ano entra na hora (como patrocínio) e a torcida não gosta. Recusar: só volta daqui a `wait` temporadas
  S.coEstNomeAnswer = function (co, yes) {
    const e = S.coEst(co), o = S.coEstNome(co), N = E.nome, fin = co.fin; if (!e || !o || !fin) return false;
    if (!yes) { e.nmS = co.season + N.wait; return true; }
    e.nm = { n: o.n, v: o.v, until: co.season + N.anos - 1, paid: co.season };
    fin.caixa += o.v; fin.ss.pat = (fin.ss.pat || 0) + o.v; e.hum = clamp(e.hum - N.hum, 0, 100);
    return true;
  };
  // Começo de temporada: paga o ano do nome, ou o contrato acabou e o nome de batismo volta
  function nomeYear(co) {
    const e = co.club ? S.coEst(co) : null, fin = co.fin; if (!e || !e.nm || !fin) return;
    if (co.season > e.nm.until) { e.nm = null; e.nmS = co.season + E.nome.wait; return; }
    if (e.nm.paid !== co.season) { e.nm.paid = co.season; fin.caixa += e.nm.v; fin.ss.pat = (fin.ss.pat || 0) + e.nm.v; }
  }
  // O nome que vale hoje: o do patrocinador, o de batismo (real) ou nenhum
  S.coEstNameNow = co => { const e = co && co.club && co.est ? co.est[co.club] : null; return (e && e.nm && e.nm.n) || S.coEstName(co.club); };
  // ---------- acontecimentos (fase 5) ----------
  // Show no estádio: uma vez por temporada, na semana de um jogo fora, em parte das temporadas. Devolve a proposta ou null
  S.coEstShow = function (co) {
    const e = S.coEst(co), V = E.ev, ss = co.ss; if (!e || !ss || ss.done || !co.fin || e.shS === co.season || e.cl || e.gt > 0) return null;
    const cap = capOf(openLv(e)), n = ss.rounds.length, me = ss.ids.indexOf(co.club);
    if (cap < V.showCap || hash('est-show-' + co.club + '-' + co.season) >= V.showP) return null;
    const away = i => ss.rounds[i] && ss.rounds[i].some(g => g[1] === me);
    let r = 3 + Math.floor(hash('est-show-r-' + co.club + '-' + co.season) * Math.max(1, n - 9));
    while (r < n - 3 && !away(r)) r++;
    if (ss.i !== r || !away(r)) return null;
    return { v: r10k(gameBase(co) * V.showV * cap / e.cap0), games: V.showGames };
  };
  // Aceitar: o dinheiro entra na hora (bilheteria) e o gramado sofre nos próximos jogos em casa. Recusar: só no ano que vem
  S.coEstShowAnswer = function (co, yes) {
    const e = S.coEst(co), o = S.coEstShow(co), fin = co.fin; if (!e || !o || !fin) return false;
    e.shS = co.season; if (!yes) return true;
    fin.caixa += o.v; fin.ss.bil = (fin.ss.bil || 0) + o.v; e.gt = o.games;
    return true;
  };
  // Exigência da liga: subiu de divisão sem refletores. { from (rodada em que a multa começa), fine, on (já vale), seen }
  S.coEstLiga = function (co) {
    const e = co && co.club ? S.coEst(co) : null; if (!e || !e.lg || e.up.l >= 1 || !co.ss) return null;
    if (co.fin && !co.fin.rec && S.coFinNext) S.coFinNext(co);
    return { from: E.ev.ligaR + 1, fine: ligaFine(co, e, E.ev.ligaR), on: co.ss.i >= E.ev.ligaR, seen: !!e.lg.seen, mel: !!(e.mel && e.mel.k === 'l') };
  };
  S.coEstLigaSeen = function (co) { const e = S.coEst(co); if (e && e.lg) e.lg.seen = 1; };
  // O gramado castigado pelo show: quantos jogos em casa ainda (0 = normal)
  S.coEstGramRuim = co => { const e = co && co.club && co.est ? co.est[co.club] : null; return e && e.gt > 0 ? e.gt : 0; };
  // Legado: os estádios que cresceram com este técnico (para o Hall) e os prêmios em moedas (a tela soma uma vez por conta)
  S.coEstLegado = co => Object.keys((co && co.est) || {}).map(id => { const e = co.est[id]; return e && e.lv && e.cap0 && (e.nob > 0 || capOf(e.lv) > e.cap0) ? { club: id, cap0: e.cap0, cap: capOf(e.lv), nob: e.nob || 0, best: e.best || 0 } : null; }).filter(Boolean).sort((a, b) => (b.cap - b.cap0) - (a.cap - a.cap0));
  S.coEstPrizes = function (co) {
    const e = co && co.club ? S.coEst(co) : null, P = E.prize, out = []; if (!e) return out;
    if (e.nob > 0) out.push({ n: P.obra, t: 'Primeira obra no estádio', once: 'est-obra' });
    if (capOf(e.lv) >= 2 * e.cap0) out.push({ n: P.dobro, t: 'Estádio dobrado', once: 'est-dobro' });
    if (e.nob > 0 && E.keys.some(k => e.lv[k] >= 5 && e.lv0[k] < 5)) out.push({ n: P.arena, t: 'Primeiro setor Arena', once: 'est-arena' });
    return out;
  };

  // A obra acabou: o setor reabre maior, parte dos lugares novos vira torcida e a torcida gosta
  function obraDone(co, e, quiet) {
    const o = e.obra; if (!o) return;
    const add = seats(o.k, o.to) - seats(o.k, o.from);
    e.lv[o.k] = o.to; e.obra = null;
    if (quiet) return;   // o técnico foi embora: o clube termina a obra sem ele
    e.base += Math.round(add * E.obra.novo); e.hum = clamp(e.hum + E.obra.hum, 0, 100);
    e.done = { k: o.k, from: o.from, to: o.to }; e.nob = (e.nob || 0) + 1;
  }
  // Uma rodada de obra e de parcela (n rodadas nas férias, sem parcela)
  function obraTick(co, e, n, ferias) {
    const fin = co.fin, O = E.obra;
    if (!ferias && fin) ['pay', 'pay2'].forEach(q => { const y = e[q]; if (!y) return; y.n++; if (y.n % O.mes === 0) { fin.caixa -= y.v; fin.ss.obra = (fin.ss.obra || 0) + y.v; if (--y.k <= 0) e[q] = null; } });
    if (e.mel) { e.mel.left -= n; if (e.mel.left <= 0) melDone(co, e); }
    const o = e.obra; if (!o) return;
    o.left -= n;
    if (o.left <= 0 && o.late && !o.lated) { o.lated = 1; o.left += o.late; o.tot += o.late; if (S.coFinNews && fin) S.coFinNews(co, 'A obra do ' + E.names[o.k] + ' atrasou ' + o.late + ' rodadas.'); }
    if (o.left <= 0) obraDone(co, e);
  }
  // Acelerar com moedas (quem cobra as moedas é a tela): rodadas a menos, poucas vezes por obra
  S.coEstRush = function (co) {
    const e = S.coEst(co), o = e && e.obra, O = E.obra; if (!o || o.acc >= O.rushMax) return false;
    o.acc++; o.left -= O.rush; if (o.left <= 0) obraDone(co, e);
    return true;
  };
  S.coEstRushLeft = co => { const e = S.coEst(co); return e && e.obra ? E.obra.rushMax - e.obra.acc : 0; };
  // A tela mostra "Obra pronta" uma vez
  S.coEstDone = function (co, clear) { const e = S.coEst(co), d = e && e.done; if (d && clear) delete e.done; return d || null; };

  // Depois de cada jogo o humor anda: em casa pesa mais, clássico mais ainda, goleada marca, e a meta puxa
  function humAfter(co, e, log, m) {
    const H = E.dh, gap = Math.abs(log.gf - log.ga);
    let d = H[log.res] * (log.home ? H.home : 1) * (m.classic ? H.classic : 1);
    if (gap >= 3) d += log.res === 'v' ? H.gol : -H.gol;
    if (log.home) d += E.price.hum[e.pr] || 0;   // o preço do ingresso pesa a cada jogo em casa
    if (co.ss && co.board && co.board.goal) d += S.coPos(co) <= co.board.goal.pos ? H.in : H.out;
    e.hum = clamp(e.hum + d + (50 - e.hum) * H.pull, 0, 100);
  }

  // A torcida empurra em casa: tranquila não muda nada, em festa soma `E.push` no ataque e revoltada tira
  S.coEstPush = function (co) { const e = S.coEst(co); return e ? Math.round(E.push * (e.hum - 50) / 50 * 100) / 100 : 0; };
  const start0 = S.coMatchStart;
  S.coMatchStart = function (co) {
    const m = start0.apply(this, arguments);
    if (m && m.home && m.us) {
      const e = S.coEst(co), dg = e ? e.up.g - e.up0.g : 0;
      m.push = e && e.cl ? 0 : S.coEstPush(co); m.us.bonus = (m.us.bonus || 0) + m.push;   // portões fechados: ninguém empurra nem atrapalha
      if (dg) m.us.enK = 1 - E.mel.gram * dg;   // gramado melhor que o da chegada: o seu time cansa menos em casa
      if (e && e.gt > 0) { m.gt = 1; m.us.bonus -= E.ev.showBonus; m.us.enK = (m.us.enK || 1) * E.ev.showEn; }   // gramado castigado pelo show
    }
    return m;
  };

  const begin0 = S.coStart;
  S.coStart = function (co) { const r = begin0.apply(this, arguments); nomeYear(co); return r; };

  const end0 = S.coMatchEnd;
  S.coMatchEnd = function (co, m) {
    const club = co.club, e = S.coEst(co), cr = e && m.home ? S.coEstCrowd(co, m.vs, co.ss.i) : null;
    if (cr) e.now = cr;   // a bilheteria desta rodada (coachfin.js) usa este público
    const log = end0(co, m);
    if (e) delete e.now;
    if (!e || !log || co.club !== club) return log;
    if (cr) {
      e.h.push({ r: log.r, vs: log.vs, pub: cr.pub, cap: cr.cap, res: log.res });
      e.occ = cr.occ; e.best = Math.max(e.best || 0, cr.pub);
      log.pub = cr.pub; log.cap = cr.cap;
      if (cr.closed) { delete e.cl; log.closed = 1; }
      if (cr.tit) log.tit = 1;
      if (m.gt && e.gt > 0) e.gt--;
    }
    humAfter(co, e, log, m);
    // Perdeu em casa com a torcida revoltada (clássico, goleada ou no azar): o próximo jogo em casa é de portões fechados
    if (cr && !cr.closed && log.res === 'd' && e.hum < E.ev.fechaHum && (m.classic || log.ga - log.gf >= 3 || hash('est-fecha-' + club + '-' + co.season + '-' + log.r) < E.ev.fechaP)) {
      e.cl = 1; if (S.coFinNews && co.fin) S.coFinNews(co, 'Confusão na arquibancada: o próximo jogo em casa é de portões fechados.');
    }
    obraTick(co, e, 1);
    return log;
  };
  // Rodada de folga também é rodada de obra
  const skip0 = S.coSkipRound;
  S.coSkipRound = function (co) {
    const at = !co.sacked && co.club && co.ss && co.ss.club === co.club, e = at ? S.coEst(co) : null;
    skip0(co);
    if (e) obraTick(co, e, 1);
  };
  // A parcela da obra aparece em Finanças, aba A seguir
  const next0 = S.coFinNext;
  if (next0) S.coFinNext = function (co) { const out = next0(co), e = co.club && co.est ? co.est[co.club] : null; if (e && out) [['pay', 'Parcela da obra'], ['pay2', 'Parcela da melhoria']].forEach(q => { const y = e[q[0]]; if (y) out.push({ k: 'obra', txt: q[1] + ' · ' + (y.k > 1 ? 'faltam ' + y.k : 'última'), v: -y.v }); }); return out; };
  // Trocou de clube com obra andando: o clube antigo termina a obra e fica com as parcelas
  const sign0 = S.coSign;
  S.coSign = function (co, id) {
    const before = co.club, r = sign0.apply(this, arguments);
    // (demitido chega aqui já sem clube: por isso olha todos os estádios que não são o de agora)
    if (co.club !== before && co.est) Object.keys(co.est).forEach(id => { const e = co.est[id]; if (id === co.club || !e) return; if (e.obra) obraDone(co, e, true); if (e.mel) melDone(co, e, true); e.pay = null; e.pay2 = null; delete e.done; delete e.lg; delete e.cl; e.gt = 0; });
    return r;
  };

  // Fim da temporada: título, acesso e meta mexem no humor, metade da distância até "tranquila" some nas férias e a obra anda
  const send0 = S.coSeasonEnd;
  S.coSeasonEnd = function (co) {
    const club = co.club, e = club ? S.coEst(co, club) : null;
    const out = send0(co);
    if (e && out && out.club === club) {
      const N = E.end, d = (out.won ? N.won : 0) + (out.up ? N.up : 0) + (out.down ? N.down : 0) + (out.sacked ? 0 : out.met ? N.met : N.miss);
      e.hum = clamp(50 + (clamp(e.hum + d, 0, 100) - 50) * N.keep, 0, 100);
      if ((e.obra || e.mel) && !out.sacked) obraTick(co, e, E.obra.ferias, true);   // a obra anda nas férias
      e.gt = 0;   // gramado novo nas férias
      if (out.down || out.sacked) delete e.lg;
      else if (out.up && e.up.l < 1) e.lg = { s: co.season };   // subiu sem refletores: a liga exige
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
