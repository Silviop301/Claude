// Carreira Completa integrada: a temporada jogo a jogo, num calendário só com a liga, a copa nacional e o torneio
// continental. Cada jogo é simulado com o jogador como ele está naquele dia (atributos, investimentos, técnico,
// torcida): um ponto de evolução gasto no meio do ano já muda o jogo seguinte. No fim do calendário, os números
// do ano (jogos, gols, nota, taças, tabela) entram em S.playSeason no lugar do sorteio da temporada inteira
// (c.fc.out), e o resto do motor (prêmios, fama, evolução, manchetes) segue igual.
// Sorteio próprio (c.fc.seed): não mexe na sequência da carreira.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { REL0, clamp } = S._;

  const rngOf = fc => { const r = S.rng(fc.seed); return { r, save: () => { fc.seed = r.state(); } }; };
  const str = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].strength : 55);
  // Todo jogo em campo enche um pouco a barra; nota boa enche mais
  const PE_STEP = { low: 0.05, ok: 0.1, good: 0.2, great: 0.4 }, PE_OK = 6.5;
  // Ajuste da produção jogo a jogo para os números do ano baterem com a carreira rápida (tools/craque_sim.js com MODO=completa)
  const FC_K = { g: 1.12, a: 1.7 }; // ponto de evolução por jogo bom (nota 7,4+) e ótimo (8,2+)

  // ---------- montagem da temporada ----------
  // Times da liga: os mesmos da tabela do motor (clubes da liga e, se faltar para 20, os mais fortes de baixo)
  function leagueTeams(club) {
    const lc = D.CLUBS.filter(x => x.league === club.league && x.id !== club.id).map(x => x.id);
    const LD = D.LADDER[club.league];
    const below = LD && LD.down ? D.CLUBS.filter(x => x.league === LD.down).sort((a, b) => b.strength - a.strength).map(x => x.id) : [];
    if (lc.length + 1 + below.length < 20) {
      const cty = D.countryOf(club), avg = lc.reduce((a, id) => a + str(id), 0) / Math.max(1, lc.length);
      D.CLUBS.filter(x => x.league !== club.league && (!LD || x.league !== LD.down) && D.countryOf(x) === cty)
        .sort((a, b) => Math.abs(a.strength - avg) - Math.abs(b.strength - avg)).forEach(x => below.push(x.id));
    }
    const ids = [club.id].concat(lc);
    while (ids.length < 20 && below.length) ids.push(below.shift());
    // Número ímpar de times: sai o mais fraco (o calendário é de turno e returno, todos jogam toda rodada)
    if (ids.length % 2) { const w = ids.slice(1).sort((a, b) => str(a) - str(b))[0]; ids.splice(ids.indexOf(w), 1); }
    return ids;
  }
  // Torneio continental do ano: o principal para quem ficou entre os primeiros (ou, sem ano anterior no clube, pela força);
  // senão o segundo torneio. Campo: os clubes mais fortes da mesma confederação
  function contOf(c, club, teams) {
    const prev = c.seasons[c.seasons.length - 1];
    const rank = prev && prev.club === club.id && prev.table ? prev.table.pos : 1 + teams.filter(id => str(id) > club.strength).length;
    const main = S.contName(club), second = S.cont2Name(club);
    const LD = D.LADDER[club.league];
    if (LD && LD.up) return null;
    const cf = S.confOf(club.league);
    const poolOf = name => D.CLUBS.filter(x => x.id !== club.id && S.confOf(x.league) === cf && !(D.LADDER[x.league] && D.LADDER[x.league].up) &&
      (name === 'Libertadores' ? S.LIBERTA.includes(x.league) : name === 'Liga dos Campeões' ? x.tier >= 4 : true))
      .sort((a, b) => b.strength - a.strength).map(x => x.id);
    if (main && rank <= (main === 'Libertadores' ? 8 : 6)) return { name: main, kind: 'cont', pool: poolOf(main).slice(0, 32) };
    if (second) {
      // Segundo torneio: sem os mais fortes (que estão no principal)
      const p = poolOf(second);
      return { name: second, kind: 'cont2', pool: (main ? p.slice(Math.min(10, Math.floor(p.length / 3))) : p).slice(0, 32) };
    }
    return null;
  }
  // Dia de cada jogo no ano (0 a 1): liga espalhada; copa e continental encaixados entre as rodadas
  const CUP_AT = [0.12, 0.3, 0.5, 0.68, 0.86];
  const CUP_ST = ['Primeira fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  const CONT_AT = [0.15, 0.22, 0.3, 0.38, 0.45, 0.52, 0.62, 0.72, 0.82, 0.93];
  const CONT_ST = ['Grupo · 1ª rodada', 'Grupo · 2ª rodada', 'Grupo · 3ª rodada', 'Grupo · 4ª rodada', 'Grupo · 5ª rodada', 'Grupo · 6ª rodada', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];

  const EV_AT = [0.3, 0.7];

  S.fcStart = function (c) {
    const club = D.CLUB_BY_ID[c.club], lg = D.LEAGUE_BY_ID[club.league];
    // A fração de ponto que sobrou do ano anterior continua na barra (não conta para o limite deste ano)
    const carry = c.fc && c.fc.season === c.season - 1 ? c.fc.peFrac || 0 : 0;
    const fc = { season: c.season, club: club.id, seed: (Math.imul(Number(c.tseed) || 1, 2654435761) + c.season * 97 + 13) >>> 0, /* imul: a conta comum passava de 2^53 e o ano sumia (calendário igual todo ano) */ i: 0, log: [], peFrac: carry, peCarry: carry, peGot: 0, out: null, done: false };
    // Vida entre os jogos: energia (0-100, cheia na pré-temporada), forma (-2 a +2, metade passa de um ano para o outro)
    // Equipamento gasto sai (comprado na loja, dura um número de jogos em campo)
    S.fcShopSync(c);
    fc.paid = 0;
    Object.assign(fc, { en: 100, fo: c.fc && c.fc.season === c.season - 1 ? Math.round((c.fc.fo || 0) * 50) / 100 : 0, fit: 0, peTrain: 0, wkDue: false, wkPlan: c.fc && c.fc.wkPlan ? c.fc.wkPlan : ['tec', 'rest'] });
    const { r, save } = rngOf(fc);
    // Liga: turno e returno com os times embaralhados
    const teams = leagueTeams(club);
    const perm = teams.map((_, i) => i).sort(() => r() - 0.5);
    const sch = S._schedule(teams.length);
    fc.lg = { name: lg.name, ids: teams, rounds: sch.map(rd => rd.map(([a, b]) => [perm[a], perm[b]])), tab: teams.map(() => ({ p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 })),
      promo: D.LADDER[club.league] && D.LADDER[club.league].up ? D.LADDER[club.league].promo : 0, releg: D.LADDER[club.league] && D.LADDER[club.league].down ? D.LADDER[club.league].releg : 0 };
    const R = fc.lg.rounds.length;
    // Copa nacional: os 32 mais fortes do país (todas as divisões), com você garantido
    // (país com poucos clubes: chave menor, de 16, 8 ou 4, e o calendário começa numa fase mais adiante)
    const fn = Math.min(32, 2 ** Math.floor(Math.log2(Math.max(2, S.cupField(club).length))));
    const field = S.cupField(club).slice(0, fn);
    if (!field.includes(club.id)) field[field.length - 1] = club.id;
    fc.cup = { name: lg.cup || 'Copa nacional', alive: field.sort(() => r() - 0.5), st: 0, out: null };
    // Continental: grupo de quatro (você e três do campo, um de cada pote) e mata-mata
    const ct = contOf(c, club, teams);
    if (ct) {
      // Grupo: um time mais forte que o seu e dois mais fracos, de força parecida (os potes do sorteio)
      const up = ct.pool.filter(id => str(id) > club.strength).slice(-6), dn = ct.pool.filter(id => str(id) <= club.strength).slice(0, 10).sort(() => r() - 0.5);
      ct.group = [club.id].concat(up.length ? [r.pick(up)] : [], dn.slice(0, up.length ? 2 : 3)).filter((id, i, a) => a.indexOf(id) === i);
      ct.gtab = ct.group.map(() => ({ p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
      // Seis rodadas: cada um contra cada um, ida e volta
      const n = ct.group.length, gs = n >= 4 ? S._schedule(4) : [[[0, 1]], [[1, 0]]];
      ct.md = gs.map(rd => rd.filter(([a, b]) => a < n && b < n));
      ct.st = 0; ct.out = null;
      fc.cont = ct;
    } else fc.cont = null;
    // Calendário
    const cal = [];
    for (let k = 0; k < R; k++) cal.push({ k: 'lg', ri: k, at: (k + 0.5) / R });
    CUP_AT.forEach((at, st) => { if (st >= 5 - Math.log2(fn)) cal.push({ k: 'cup', st, at }); });
    if (fc.cont) CONT_AT.slice(0, fc.cont.md.length + 4 > 10 ? 10 : fc.cont.md.length + 4).forEach((at, st) => cal.push({ k: 'cont', st: st < fc.cont.md.length ? st : 6 + st - fc.cont.md.length, at }));
    cal.sort((a, b) => a.at - b.at);
    fc.cal = cal.map(({ k, ri, st }) => (k === 'lg' ? { k, ri } : { k, st }));
    // Lesão de evento (c.mod.inj): os primeiros jogos do ano no departamento médico
    const myGames = R + 5 + (fc.cont ? 10 : 0);
    fc.injOut = Math.round((c.mod.inj || 0) * myGames);
    fc.injMiss = 0; fc.injName = fc.injOut ? 'lesão' : null;
    // Eventos entre os jogos: duas datas no ano (cada uma pode ou não trazer um evento, como na pré-temporada do modo rápido)
    fc.evAt = EV_AT.map(f => Math.max(1, Math.round(f * fc.cal.length))); fc.evNext = 0; fc.evIds = [];
    fc.acc = { games: 0, goals: 0, assists: 0, cs: 0, saves: 0, pen: 0, penFaced: 0, tackles: 0, rsum: 0, slots: 0 };
    save();
    // O sorteio do lance decisivo da temporada não vale aqui: os lances acontecem nos jogos (finais e clássicos)
    c.momentAge = c.age; c.moment = null; c.momentRace = false;
    if (S.rivalPre && S.role(c, club).share >= 0.3) S.rivalPre(c);
    c.fc = fc;
    return fc;
  };

  // ---------- o seu jogador num jogo ----------
  // As contas de S.playSeason, por jogo, com o jogador de hoje
  // ---------- vida entre os jogos: energia, forma e a semana ----------
  const EN_LOW = 50, EN_OUT = 30; // abaixo de 50 rende menos; abaixo de 30 a lesão dobra e o técnico pode poupar
  function lifeOf(c) {
    const fc = c.fc;
    if (!fc || fc.en === undefined || fc.season !== c.season) return { mul: 1, r: 0, inj: 1 };
    const tired = fc.en < EN_LOW ? (EN_LOW - fc.en) / EN_LOW : 0, fo = fc.fo || 0;
    const video = c.staff && c.staff.video ? 0.08 : 0; // analista de vídeo: você chega sabendo o que o adversário faz
    return { mul: (1 - 0.2 * tired) * (1 + 0.05 * fo), r: 0.12 * fo - 0.5 * tired + video, inj: fc.en < EN_OUT ? 2 : 1 };
  }
  S.FC_EN_LOW = EN_LOW; S.FC_EN_OUT = EN_OUT;
  // Ações da semana (duas por semana). en: energia; o resto acontece em weekDo
  const TRAIN_STEP = 0.05, TRAIN_CAP = +((typeof process !== 'undefined' && process.env && process.env.FC_TC) || 0.5); // evolução do treino técnico: por treino e no ano, fora do limite dos jogos (FC_TC no simulador)
  const WEEK = [
    { id: 'tec', name: 'Treino técnico', en: -10 },
    { id: 'fis', name: 'Treino físico', en: -10 },
    { id: 'rest', name: 'Descanso', en: 25 },
    { id: 'physio', name: 'Fisioterapia', en: 15 },
    { id: 'spons', name: 'Patrocínio', en: -15 },
    { id: 'talk', name: 'Entrevista', en: -5 },
  ];
  const WEEK_BY = Object.fromEntries(WEEK.map(a => [a.id, a]));
  S.FC_WEEK = WEEK; S.FC_TRAIN_CAP = TRAIN_CAP;
  const weekBase = (fc, c) => (fc.wkPlayed ? 5 : 30) + (c && c.staff && c.staff.pt ? 8 : 0); // preparador físico: +8 // a semana já recupera sozinha (mais se você não jogou)
  S.fcSponsPay = c => Math.max(1000, Math.round((c.wage || 0) * 0.8 / 100) * 100);
  S.fcPhysioCost = c => Math.max(2000, Math.round((c.wage || 0) / 100) * 100);
  // A ação vale agora? (fisioterapia é paga; treino técnico para no limite do ano)
  S.fcWeekOk = (c, id, picked) => {
    const fc = c.fc, n = (picked || []).filter(x => x === id).length + 1;
    if (id === 'physio') return (c.money || 0) >= S.fcPhysioCost(c) * n;
    if (id === 'tec') return (fc.peTrain || 0) + TRAIN_STEP * n <= TRAIN_CAP + 1e-9;
    return true;
  };
  // Energia depois da semana com estas ações
  S.fcWeekEnergy = (c, acts) => clamp(c.fc.en + weekBase(c.fc, c) + acts.reduce((s, id) => s + (WEEK_BY[id] || WEEK_BY.rest).en, 0), 0, 100);
  // Semana automática: repete a última escolhida por você; lesionado faz fisioterapia (ou descansa); troca o que cansa por descanso se a energia ia ficar baixa
  S.fcWeekAuto = function (c) {
    const fc = c.fc;
    let a = (fc.wkPlan || ['tec', 'rest']).slice(0, 2).map(id => (WEEK_BY[id] ? id : 'rest')); // ação que saiu do jogo vira descanso
    if (fc.injOut > 0 && !S.fcSuspended(c)) a = [S.fcWeekOk(c, 'physio', []) ? 'physio' : 'rest', 'rest'];
    a = a.map((id, k) => (S.fcWeekOk(c, id, a.slice(0, k)) ? id : 'rest'));
    for (const k of [1, 0]) if (S.fcWeekEnergy(c, a) < 60 && WEEK_BY[a[k]].en < 0) a[k] = 'rest';
    return a;
  };
  // Fecha a semana: aplica as duas ações e a recuperação. Volta o que mudou (para a tela mostrar)
  S.fcWeek = function (c, acts) {
    const fc = c.fc;
    if (!fc || !fc.wkDue) return null;
    if (acts) fc.wkPlan = acts.slice(0, 2); // a escolha da pessoa vira o plano da semana automática
    acts = (acts || S.fcWeekAuto(c)).slice(0, 2);
    const { r, save } = rngOf(fc), out = { acts: [], en0: fc.en, pe: 0, money: 0, fame: 0, coach: 0, inj: 0, polem: false };
    fc.en = clamp(fc.en + weekBase(fc, c), 0, 100);
    // Salário da semana entra; a equipe pessoal sai (sem dinheiro, o contrato cai)
    const pay = Math.round((c.wage || 0) * 52 / fc.cal.length);
    c.money = (c.money || 0) + pay; fc.paid = (fc.paid || 0) + pay; out.pay = pay; out.staff = 0; out.dropped = [];
    for (const k in (c.staff || {})) {
      const cost = S.fcStaffCost(c, k);
      if ((c.money || 0) >= cost) { c.money -= cost; out.staff += cost; if (k === 'press') c.fame += 0.5; }
      else { delete c.staff[k]; out.dropped.push(k); }
    }
    acts.forEach(id => {
      if (!WEEK_BY[id] || !S.fcWeekOk(c, id, [])) id = 'rest'; // o estado já tem as ações anteriores (dinheiro, treino)
      out.acts.push(id);
      fc.en = clamp(fc.en + WEEK_BY[id].en, 0, 100);
      if (id === 'tec') { fc.peTrain = Math.round(((fc.peTrain || 0) + TRAIN_STEP) * 100) / 100; out.pe += TRAIN_STEP; fc.peFrac = Math.round((fc.peFrac + TRAIN_STEP) * 100) / 100; while (fc.peFrac >= 1) { fc.peFrac = Math.round((fc.peFrac - 1) * 100) / 100; fc.peGot++; c.pe = (c.pe || 0) + 1; } }
      else if (id === 'fis') fc.fit = 4;
      else if (id === 'physio') { const p = S.fcPhysioCost(c); c.money = Math.max(0, (c.money || 0) - p); out.money -= p; if (fc.injOut > 0 && !S.fcSuspended(c)) { fc.injOut--; out.inj++; } }
      else if (id === 'spons') { const p = S.fcSponsPay(c); c.money = (c.money || 0) + p; out.money += p; c.fame += 1; out.fame += 1; }
      else if (id === 'talk') {
        c.fame += 2; out.fame += 2;
        // A assessoria de imprensa segura a polêmica
        if (r() < (c.staff && c.staff.press ? 0 : 0.25)) { out.polem = true; c.rel.coach = clamp(c.rel.coach - 4, 0, 100); out.coach -= 4; }
      }
    });
    out.en1 = fc.en; out.at = fc.i;
    fc.wkLast = out.acts.slice(); fc.wkDue = false; fc.wkSum = out;
    if (fc.pending && fc.pending.i === fc.i && !fc.pending.mDone) fc.pending = null; // a escalação sai depois da semana
    save();
    return out;
  };

  // ---------- loja: o dinheiro da carreira compra vantagem, só nesta carreira ----------
  // Preços em semanas de salário (acompanham a liga), com um piso para o começo da carreira
  const SHOP = {
    gear: [
      // games: jogos em campo até gastar (a de treino gasta rápido; a de ponta dura umas duas temporadas de titular)
      { id: 'g1', name: 'de treino', wk: 2, b: 1, games: 20 },
      { id: 'g2', name: 'profissional', wk: 6, b: 2, games: 35, en: 3 },
      { id: 'g3', name: 'de ponta', wk: 15, b: 3, games: 70, en: 5 },
    ],
    staff: [
      { id: 'pt', name: 'Preparador físico', w: 0.3, fx: '+8 de energia por semana' },
      { id: 'physio', name: 'Fisioterapeuta particular', w: 0.4, fx: 'Lesões 30% mais curtas' },
      { id: 'nutri', name: 'Nutricionista', w: 0.3, fx: 'A idade pesa menos no físico' },
      { id: 'video', name: 'Analista de vídeo', w: 0.5, fx: 'Nota +0,08 por jogo' },
      { id: 'press', name: 'Assessoria de imprensa', w: 0.3, fx: 'Mais fama e entrevista sem polêmica' },
    ],
    // Carros: do popular ao superesportivo (cada um troca o anterior); o último a torcida acha exagero
    cars: [
      { id: 'c1', name: 'Carro popular', wk: 6, fame: 1, fans: 1, fx: 'O primeiro carro: a torcida gosta' },
      { id: 'c2', name: 'Sedã importado', wk: 20, fame: 3, fans: 1, fx: 'Chega no treino com estilo' },
      { id: 'c3', name: 'Esportivo', wk: 50, fame: 6, fans: 0, fx: 'Vira assunto nas redes' },
      { id: 'c4', name: 'Superesportivo', wk: 120, fame: 10, fans: -3, fx: 'Fama alta; parte da torcida acha exagero' },
    ],
    life: [
      { id: 'house', name: 'Casa nova', wk: 50, fame: 6, fans: 4, fx: 'Mais fama e torcida' },
    ],
  };
  S.FC_SHOP = SHOP;
  const price = (c, wk, floor) => Math.max(floor * wk, Math.round((c.wage || 0) * wk / 1000) * 1000);
  S.fcGearName = (c, g) => (c.pos === 'GOL' ? 'Luvas ' : 'Chuteira ') + g.name;
  S.fcGearPrice = (c, id) => price(c, SHOP.gear.find(g => g.id === id).wk, 2000);
  S.fcStaffCost = (c, id) => price(c, SHOP.staff.find(g => g.id === id).w, 1500);
  S.fcLifePrice = (c, id) => price(c, SHOP.life.find(g => g.id === id).wk, 5000);
  S.fcCarPrice = (c, id) => price(c, SHOP.cars.find(g => g.id === id).wk, 5000);
  S.fcCarAt = c => (c.life && c.life.car ? SHOP.cars.findIndex(x => x.id === c.life.car) : -1);
  // Atributos que o equipamento pode subir: os três que mais pesam na posição
  S.fcGearAttrs = c => S.attrOrder(c.pos).slice(0, 3);
  // Save antigo (equipamento por temporada): vira jogos, o que sobrou da duração nova; vencido sai
  S.fcShopSync = c => {
    const g = c.gear;
    if (g && g.left === undefined) { const d = SHOP.gear.find(x => x.id === g.id); if (g.until >= c.season && d) { g.games = d.games; g.left = d.games; } else c.gear = null; delete g.until; }
    if (c.gear && !(c.gear.left > 0)) c.gear = null;
    c.shopB = c.gear ? { [c.gear.attr]: c.gear.b } : null;
  };
  // Compra: equipamento (troca o atual), equipe (liga ou desliga; paga por semana) e estilo de vida (uma vez na carreira)
  S.fcBuy = function (c, kind, id, attr) {
    if (kind === 'gear') {
      const g = SHOP.gear.find(x => x.id === id), p = S.fcGearPrice(c, id);
      if (!g || (c.money || 0) < p || !S.fcGearAttrs(c).includes(attr)) return false;
      c.money -= p; c.gear = { id, attr, b: g.b, en: g.en || 0, games: g.games, left: g.games }; if (c.fc) c.fc.gearOut = null; S.fcShopSync(c); return true;
    }
    if (kind === 'staff') {
      c.staff = c.staff || {};
      if (c.staff[id]) { delete c.staff[id]; return true; }
      if ((c.money || 0) < S.fcStaffCost(c, id) * 4) return false; // contrata quem tem para pagar um mês
      c.staff[id] = 1; return true;
    }
    if (kind === 'car') {
      const k = SHOP.cars.findIndex(x => x.id === id), l = SHOP.cars[k], p = l ? S.fcCarPrice(c, id) : 0;
      c.life = c.life || {};
      if (!l || k <= S.fcCarAt(c) || (c.money || 0) < p) return false;
      c.money -= p; c.life.car = id; c.fame += l.fame; c.rel.fans = clamp(c.rel.fans + l.fans, 0, 100); return true;
    }
    if (kind === 'life') {
      const l = SHOP.life.find(x => x.id === id), p = l ? S.fcLifePrice(c, id) : 0;
      c.life = c.life || {};
      if (!l || c.life[id] || (c.money || 0) < p) return false;
      c.money -= p; c.life[id] = c.season; c.fame += l.fame; c.rel.fans = clamp(c.rel.fans + l.fans, 0, 100); return true;
    }
    return false;
  };
  // Gasto da equipe por semana
  S.fcStaffWeek = c => Object.keys(c.staff || {}).reduce((s, k) => s + S.fcStaffCost(c, k), 0);

  // ---------- apostas (só dinheiro do jogo) ----------
  // A rodada seguinte da liga inteira (menos o seu jogo), com quatro mercados por jogo: resultado, ambos marcam,
  // mais de 2,5 gols e placar exato. Cupom de um jogo ou múltipla (até 6 jogos, de campeonatos diferentes, as odds se multiplicam).
  // Atleta apostar em futebol é proibido: o "faro da federação" começa em 3% e sobe a cada aposta da temporada (até 25%).
  const BET_RISK0 = 0.03, BET_RISK_STEP = 0.015, BET_RISK_MAX = 0.25, BET_MAX_LEGS = 6, BET_BAN = 4;
  S.fcSuspended = c => !!(c.fc && c.fc.injOut > 0 && /suspensão/.test(c.fc.injName || ''));
  S.fcBetRisk = c => Math.min(BET_RISK_MAX, BET_RISK0 + BET_RISK_STEP * ((c.fc && c.fc.betN) || 0));
  S.FC_BET_BAN = BET_BAN; S.FC_BET_MAX_LEGS = BET_MAX_LEGS;
  const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
  const odd = p => Math.max(1.05, Math.round(0.9 / Math.max(p, 0.004) * 100) / 100); // a casa fica com 10%
  // Chances de cada mercado pela força dos dois (o mesmo modelo que joga a rodada)
  function marketP(hs, as) {
    const [lh, la] = lam(hs, as); let h = 0, d = 0, a = 0, btts = 0, o25 = 0;
    const cs = [];
    for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) {
      const p = pois(lh, i) * pois(la, j);
      if (i > j) h += p; else if (i === j) d += p; else a += p;
      if (i > 0 && j > 0) btts += p;
      if (i + j > 2) o25 += p;
      if (i <= 5 && j <= 5) cs.push([i, j, p]);
    }
    return { x: [h, d, a], btts, o25, cs };
  }
  // Mercados: x (0 casa, 1 empate, 2 fora), btts (0 sim, 1 não), o25 (0 mais, 1 menos), cs ('gh-ga')
  S.fcBetOdds = function (h, a) {
    const P = marketP(str(h), str(a));
    return { x: P.x.map(odd), btts: [odd(P.btts), odd(1 - P.btts)], o25: [odd(P.o25), odd(1 - P.o25)], cs: Object.fromEntries(P.cs.map(([i, j, p]) => [i + '-' + j, odd(p)])) };
  };
  S.fcBetWins = function (m, pick, gh, ga) {
    if (m === 'x') return (gh > ga ? 0 : gh === ga ? 1 : 2) === pick;
    if (m === 'btts') return (gh > 0 && ga > 0) === (pick === 0);
    if (m === 'o25') return (gh + ga > 2) === (pick === 0);
    if (m === 'cs') return pick === gh + '-' + ga;
    return false;
  };
  // Outros campeonatos no cardápio do Zé: as grandes ligas de fora (e o Brasileirão, se você joga em outra liga).
  // Os confrontos e os placares saem de um sorteio próprio da rodada (não mexem nos jogos da sua temporada)
  const BET_LEAGUES = ['ing', 'esp', 'bra-a', 'ita', 'ale', 'arg', 'fra', 'por'];
  const betSeed = (c, ri, k) => ((Math.imul(Number(c.tseed) || 1, 2246822519) ^ Math.imul(c.season * 131 + ri * 7 + k, 3266489917)) >>> 0);
  function extraGames(c, ri) {
    const own = D.CLUB_BY_ID[c.club].league, pool = BET_LEAGUES.filter(id => id !== own && D.LEAGUE_BY_ID[id]);
    const r = S.rng(betSeed(c, ri, 1)), picks = pool.slice(0, 2).concat([pool[2 + (ri % (pool.length - 2))]]); // duas fixas e uma que muda a cada rodada
    return picks.map((lid, k) => {
      const ids = D.CLUBS.filter(x => x.league === lid).map(x => x.id).sort(() => r() - 0.5).slice(0, 8);
      const games = []; for (let j = 0; j + 1 < ids.length; j += 2) games.push({ h: ids[j], a: ids[j + 1], ext: k + 1 });
      return { name: D.LEAGUE_BY_ID[lid].name, games };
    });
  }
  // Placar de um jogo de outro campeonato (sorteio próprio, igual para o mesmo jogo)
  const extraScore = (c, ri, g) => { const r = S.rng((betSeed(c, ri, 50 + g.ext) ^ (str(g.h) * 7919 + str(g.a))) >>> 0); return simple(r, g.h, g.a, str(g.h), str(g.a)); };
  // A próxima rodada da liga ainda não jogada: os jogos sem o seu time (o mais equilibrado primeiro) e os de outros campeonatos
  S.fcBetRound = function (c) {
    const fc = c.fc;
    if (!fc || fc.done) return null;
    const e = fc.cal.slice(fc.i).find(x => x.k === 'lg');
    if (!e) return null;
    const mine = fc.lg.rounds[e.ri].filter(([a, b]) => a !== 0 && b !== 0).map(([a, b]) => ({ h: fc.lg.ids[a], a: fc.lg.ids[b], ext: 0 }));
    mine.sort((x, y) => Math.abs(str(x.h) + 2 - str(x.a)) - Math.abs(str(y.h) + 2 - str(y.a)));
    const groups = [{ name: fc.lg.name, games: mine }].concat(extraGames(c, e.ri)).filter(g => g.games.length);
    groups.forEach(G => G.games.forEach(g => { g.lg = G.name; g.odds = S.fcBetOdds(g.h, g.a); }));
    return { ri: e.ri, groups, games: [].concat(...groups.map(G => G.games)) };
  };
  S.fcBetStakes = c => [1, 4, 10].map(w => Math.max(1000, Math.round((c.wage || 0) * w / 1000) * 1000));
  S.fcBets = c => (c.fc && c.fc.bets) || [];
  // legs: [{ h, a, m, pick }] (um por jogo). Volta o cupom ou null
  S.fcBet = function (c, legs, stake) {
    const R = S.fcBetRound(c), fc = c.fc;
    if (!R || !Array.isArray(legs) || !legs.length || legs.length > BET_MAX_LEGS || !(stake > 0) || (c.money || 0) < stake) return null;
    const seen = {}, L = [];
    for (const l of legs) {
      const g = R.games.find(x => x.h === l.h && x.a === l.a);
      if (!g || seen[g.h]) return null;
      seen[g.h] = 1;
      const o = l.m === 'cs' ? g.odds.cs[l.pick] : (g.odds[l.m] || [])[l.pick];
      if (!o) return null;
      L.push({ h: g.h, a: g.a, m: l.m, pick: l.pick, odd: o, ext: g.ext, lg: g.lg });
    }
    const risk = S.fcBetRisk(c);
    c.money -= stake;
    const t = { ri: R.ri, legs: L, stake, odd: Math.round(L.reduce((s, l) => s * l.odd, 1) * 100) / 100, risk };
    const { r, save } = rngOf(fc);
    if (r() < risk) t.caught = true; // a federação descobre quando a rodada acontecer
    save();
    fc.betN = (fc.betN || 0) + 1;
    (fc.bets = fc.bets || []).push(t);
    return t;
  };
  // Resolve os cupons da rodada jogada (dentro do fcPlay). Cupom antigo (fc.bet, um jogo só) também
  function betResolve(c, fc, e, out) {
    if (fc.bet) { const b = fc.bet; (fc.bets = fc.bets || []).push({ ri: b.ri, legs: [{ h: b.h, a: b.a, m: 'x', pick: b.pick, odd: b.odd }], stake: b.stake, odd: b.odd, caught: b.caught }); fc.bet = null; }
    if (e.k !== 'lg' || !fc.bets || !fc.bets.length) return;
    const now = fc.bets.filter(t => t.ri === e.ri);
    if (!now.length) return;
    fc.bets = fc.bets.filter(t => t.ri !== e.ri);
    c.betLog = c.betLog || { n: 0, net: 0, caught: 0, won: 0 };
    let caught = false;
    out.bets = now.map(t => {
      const legs = t.legs.map(l => { const g = (l.ext ? extraScore(c, t.ri, l) : out.others.find(x => x.h === l.h && x.a === l.a)) || { gh: 0, ga: 0 }; return Object.assign({}, l, { gh: g.gh, ga: g.ga, win: S.fcBetWins(l.m, l.pick, g.gh, g.ga) }); });
      const win = legs.every(l => l.win), pay = win ? Math.round(t.stake * t.odd) : 0;
      c.money = (c.money || 0) + pay;
      c.betLog.n++; c.betLog.net += pay - t.stake; if (win) c.betLog.won = (c.betLog.won || 0) + 1;
      (c.betLog.last = c.betLog.last || []).unshift({ s: c.season, ri: t.ri, n: legs.length, net: pay - t.stake, l: legs.length === 1 ? { h: legs[0].h, a: legs[0].a, m: legs[0].m, pick: legs[0].pick, lg: legs[0].lg } : null });
      c.betLog.last.length = Math.min(c.betLog.last.length, 8);
      if (t.caught) caught = true;
      return { legs, stake: t.stake, odd: t.odd, pay, win };
    });
    if (caught) {
      out.betCaught = true; c.betLog.caught++;
      fc.injOut = Math.max(fc.injOut, BET_BAN); fc.injName = 'suspensão por aposta'; // fora dos próximos jogos
      c.rel.coach = clamp(c.rel.coach - 10, 0, 100); c.fame = Math.max(0, c.fame - 8); c.rel.fans = clamp(c.rel.fans - 6, 0, 100);
    }
  }


  // ---------- antes do jogo: orientação de um toque e, às vezes, um pedido do técnico ----------
  const INS = [
    { id: 'eq', name: 'Equilibrado', fx: 'O jogo de sempre', g: 1, a: 1, r: 0, sd: 1, en: 1 },
    { id: 'gol', name: 'Buscar o gol', fx: 'Mais gols seus, menos assistências, nota oscila mais', g: 1.06, a: 0.75, r: -0.05, sd: 1.35, en: 1.1, att: true },
    { id: 'time', name: 'Jogar para o time', fx: 'Mais assistências e o técnico gosta, menos gols seus', g: 0.88, a: 1.1, r: 0, sd: 0.9, en: 1, att: true, coach: 0.3 },
    { id: 'poupar', name: 'Poupar o físico', fx: 'Gasta metade da energia, rende um pouco menos', g: 0.95, a: 0.95, r: -0.05, sd: 1, en: 0.5 },
  ];
  const INS_BY = Object.fromEntries(INS.map(x => [x.id, x]));
  S.fcInsList = c => INS.filter(x => !x.att || c.pos !== 'GOL'); // goleiro: só equilibrado ou poupar
  S.fcIns = () => 'eq'; // orientação antes do jogo saiu da carreira jogo a jogo (2026-10-30): sempre equilibrado
  S.fcSetIns = (c, id) => { if (c.fc && INS_BY[id]) c.fc.ins = id; };
  // Pedido do técnico (um jogo em cada sete, mais ou menos): cumprir dá relação e forma; falhar tira um pouco de relação
  const REQ = {
    gol: { txt: 'Marque um gol', ok: m => m.goals >= 1, pos: ['ATA', 'MEI'] },
    ast: { txt: 'Dê uma assistência', ok: m => m.assists >= 1, pos: ['ATA', 'MEI'] },
    nota: { txt: 'Nota 7 ou mais', ok: m => m.rating >= 7, pos: ['ATA', 'MEI', 'ZAG', 'GOL'] },
    zero: { txt: 'Não sofra gol', ok: m => m.ga === 0, pos: ['ZAG', 'GOL'] },
    vence: { txt: 'Saia com a vitória', ok: m => m.won, pos: ['ATA', 'MEI', 'ZAG', 'GOL'] },
  };
  S.FC_REQ = REQ;


  // Chance de começar o próximo jogo (a mesma conta da escalação; com energia abaixo de 30 o técnico poupa metade das vezes)
  S.fcStartP = function (c) {
    const fc = c.fc, club = fc && D.CLUB_BY_ID[fc.club];
    if (!club) return 0;
    const p = myRates(c, club).share;
    return fc.en !== undefined && fc.en < EN_OUT ? p / 2 : p;
  };
  function myRates(c, club) {
    const E = S.eff(c), o = S.ovr(c), role = S.role(c, club), tm = id => S.tm(c, id), sy = id => S.syn(c, id);
    const share = clamp(role.share + c.mod.min + (c.promise || 0) + (c.rel.coach - REL0) / 90 + (c.age <= 17 ? -0.2 : 0) + (c.farewell ? 0.1 : 0), 0.05, 0.97);
    const teamBoost = 0.8 * tm('visao') + 0.6 * sy('maestro');
    const teamF = 0.85 + (club.strength + teamBoost - D.TIERS[club.tier].min) * 0.02;
    const form = 1 + c.mod.form + (c.rel.fans - REL0) / 350;
    const gA = E.fin * 0.5 + E.rit * 0.2 + E.dri * 0.15 + E.fis * 0.15, aA = E.pas * 0.55 + E.dri * 0.25 + E.rit * 0.1 + E.fin * 0.1;
    let g90, a90;
    if (c.pos === 'ATA') { g90 = 0.1 + Math.max(0, gA - 45) * 0.0113; a90 = 0.04 + Math.max(0, aA - 45) * 0.0045; }
    else if (c.pos === 'MEI') { g90 = 0.04 + Math.max(0, gA - 45) * 0.0055; a90 = 0.06 + Math.max(0, aA - 45) * 0.0075; }
    else if (c.pos === 'ZAG') { g90 = 0.025 + Math.max(0, E.fis * 0.4 + E.fin * 0.3 + E.def * 0.3 - 45) * 0.0014; a90 = 0.01 + Math.max(0, E.pas - 45) * 0.0009; }
    else { g90 = 0; a90 = 0.002; }
    const gMul = 1 + 0.06 * tm('artilheiro') - 0.08 * tm('garcom') + 0.04 * tm('tecnica') + 0.05 * tm('cabeceio') + 0.2 * tm('aereo') + 0.03 * sy('falta') + 0.03 * sy('liso') + 0.04 * sy('matador');
    const aMul = 1 - 0.08 * tm('artilheiro') + 0.08 * tm('garcom') + 0.04 * tm('tecnica') + 0.3 * tm('saida') + 0.03 * sy('liso') + 0.05 * sy('maestro');
    g90 *= 1.14 * S.GOAL_SCALE * teamF * form * (1 + c.mod.goal) * gMul * 0.9;
    a90 *= 1.22 * S.GOAL_SCALE * teamF * form * (1 + c.mod.assist) * aMul * 0.9;
    const isDef = D.DEF_POS.includes(c.pos);
    // Peso no time: defensor fecha a defesa; craque bem acima do time carrega o ataque
    const def = isDef ? (o - club.strength) * 0.35 + 0.7 * tm('xerife') + 1 * tm('maofirme') + 0.8 * sy('muralha') + 0.5 * sy('paredao') : 0;
    const spNow = c.spells[c.spells.length - 1], star = !c.loan && (spNow.seasons || 0) >= 1 && o - club.strength >= S.STAR_GAP;
    const att = clamp((o - club.strength) * 0.1, -2, 1.5) + (star ? (o - club.strength - 5) * 0.1 : 0);
    const saves = c.pos === 'GOL' ? clamp(0.3 + (E.fin + E.fis - 110) / 180, 0.15, 0.8) : 0;
    const pPen = c.pos === 'GOL' ? clamp(0.16 + (E.fin + E.def - 120) / 320 + (c.traits.includes('pegador') ? 0.05 * S.traitLevel(c, 'pegador') : 0) + 0.03 * sy('paredao'), 0.08, 0.48) : 0;
    const tackles = c.pos === 'ZAG' ? clamp(0.12 + (E.def - 60) / 150, 0.05, 0.45) : 0;
    const injRisk = clamp((0.065 + Math.max(0, c.age - 30) * 0.02) * clamp(1 - (E.fis - 60) / 90, 0.6, 1.25) * (1 - 0.25 * (c.inv.fisio || 0)) *
      (1 - 0.15 * tm('pro') + 0.05 * tm('raca')) * S.trainOf(c).inj, 0.02, 0.5);
    let trt = 0.06 * tm('drible') + 0.08 * tm('libero') + 0.07 * tm('raca') + 0.06 * tm('estrela');
    // Energia e forma (vida entre os jogos): cansado rende menos e se machuca mais; forma mexe na nota e nos gols
    const L = lifeOf(c);
    g90 *= L.mul; a90 *= L.mul; trt += L.r;
    // Orientação do jogo (escolhida antes de jogar)
    const I = INS_BY[S.fcIns(c)] || INS_BY.eq;
    g90 *= I.g; a90 *= I.a; trt += I.r;
    return { share, g90, a90, isDef, def, att, saves, pPen, tackles, injRisk: Math.min(0.6, injRisk * L.inj), o, teamBoost, trt, role, sd: I.sd };
  }

  // Gols de um jogo pela força dos dois (mando de 3 pontos); minuto de cada gol
  const LAM_D = +((typeof process !== 'undefined' && process.env && process.env.FC_LAM) || 130); // quanto a diferença de força pesa no placar (maior = mais zebra)
  // Continental: menos zebra (os classificados são os melhores, e quem é mais forte passa mais)
  const LAM_C = +((typeof process !== 'undefined' && process.env && process.env.FC_LAMC) || 35);
  // O time mais forte sofre bem menos gol (a defesa pesa mais que o ataque: mais jogos sem sofrer gol, como na temporada rápida)
  const lam = (sh, sa, k) => { const d = sh + 2 - sa, L = k || LAM_D; return [clamp(1.3 * Math.exp(d / L), 0.25, 3.6), clamp(1.05 * Math.exp(-d / (L * 0.4)), 0.15, 3.2)]; };
  const minute = r => (r() < 0.07 ? 91 + Math.floor(r() * 5) : 1 + Math.floor(r() * 90));
  function simple(r, h, a, hs, as, k) {
    const [lh, la] = lam(hs, as, k), gh = r.poisson(lh), ga = r.poisson(la);
    const ev = [];
    for (let i = 0; i < gh; i++) ev.push({ m: minute(r), s: 'h' });
    for (let i = 0; i < ga; i++) ev.push({ m: minute(r), s: 'a' });
    ev.sort((x, y) => x.m - y.m);
    return { h, a, gh, ga, ev };
  }
  // Mata-mata: empate vai para os pênaltis (um pouco a favor do mais forte)
  const pens = (r, sh, sa) => r() < clamp(0.5 + (sh - sa) / 80, 0.3, 0.7);

  // O seu jogo: produção pelo jogador do dia; o resultado pode vir decidido de um lance (force: true venceu, false perdeu)
  function myMatch(c, fc, r, vs, home, comp, knock, force, mo) {
    if (mo && force !== undefined) return scripted(c, fc, r, vs, home, knock, force, mo);
    const club = D.CLUB_BY_ID[c.club], X = myRates(c, club), on = fc.pending ? fc.pending.on : false;
    const us = club.strength + X.teamBoost + (on ? X.att : 0), them = str(vs);
    const L = comp === 'cont' ? LAM_C : LAM_D;
    let [lu, lt] = home ? lam(us, them, L) : lam(them, us, L).reverse();
    if (on && X.isDef) lt *= Math.exp(-X.def / 22);
    // Seus gols saem do total do time (o craque marca parte dos gols que o time faria)
    let mg = on ? r.poisson(X.g90 * FC_K.g) : 0;
    let ug = mg + r.poisson(Math.max(0.05, lu - (on ? X.g90 * FC_K.g : 0)));
    let tg = r.poisson(lt);
    // Resultado decidido no lance: venceu (gol seu no fim, ou o zero segurado) ou perdeu
    if (force === true && ug <= tg) { ug = tg + 1; if (on && !X.isDef) mg++; }
    if (force === false && ug >= tg) { if (knock) tg = ug + 1; else if (ug > tg) ug = tg; else tg = ug + 1; mg = Math.min(mg, ug); }
    // Assistência sua é gol do time (o placar sobe junto, se precisar)
    const ma = on ? Math.min(ug - mg, r.poisson(X.a90 * FC_K.a)) : 0;
    const cs = tg === 0;
    const saves = on && c.pos === 'GOL' ? r.poisson(X.saves) : 0;
    const penFaced = on && c.pos === 'GOL' ? (r() < 0.11 ? 1 : 0) : 0, penSaved = penFaced && r() < X.pPen ? 1 : 0;
    const tackles = on && c.pos === 'ZAG' ? r.poisson(X.tackles) : 0;
    // Minutos dos gols; os seus marcados (e as assistências nos outros gols do time)
    const ev = [];
    for (let i = 0; i < ug; i++) ev.push({ m: minute(r), s: home ? 'h' : 'a' });
    for (let i = 0; i < tg; i++) ev.push({ m: minute(r), s: home ? 'a' : 'h' });
    ev.sort((x, y) => x.m - y.m);
    const ours = ev.filter(e => e.s === (home ? 'h' : 'a'));
    const pick = ours.map(e => [r(), e]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    pick.slice(0, mg).forEach(e => { e.me = 1; });
    pick.slice(mg, mg + ma).forEach(e => { e.as = 1; });
    // Lance decisivo vencido: o gol da vitória é no fim
    if (force === true && ours.length) { const last = ours[ours.length - 1]; if (last.m < 84) last.m = 84 + Math.floor(r() * 8); ev.sort((x, y) => x.m - y.m); }
    // Nota do jogo: as mesmas partes da nota da temporada
    let rating = 0;
    if (on) {
      const res3 = ug > tg ? 3 : ug === tg ? 1 : 0;
      const perGame = X.isDef ? (cs ? 0.85 : 0) + (mg * 1.2 + ma * 0.5) / S.GOAL_SCALE + saves * 0.35 + penSaved * 0.6 + tackles * 0.2 : (mg + ma * 0.7) / S.GOAL_SCALE;
      rating = clamp(Math.round((6.1 + S.RATING_ADJ[c.pos] + perGame * 2.4 * (X.isDef ? 0.75 : 1) + Math.min(X.o - club.strength, S.RATING_GAP) * 0.03 + X.trt +
        (res3 === 3 ? 0.2 : res3 === 0 ? -0.25 : 0) + r.gauss() * 0.55 * X.sd) * 10) / 10, 4.5, 10);
    }
    let won = ug > tg;
    if (knock && ug === tg) won = force === undefined ? pens(r, us, them) : force;
    return { vs, home, gf: ug, ga: tg, on, goals: mg, assists: ma, cs: on && cs, saves, penFaced, penSaved, tackles, rating, ev, won, pens: knock && ug === tg };
  }
  // Nota do jogo (as mesmas partes da nota da temporada)
  function rateOf(c, X, club, r, ug, tg, mg, ma, cs, saves, penSaved, tackles) {
    const res3 = ug > tg ? 3 : ug === tg ? 1 : 0;
    const perGame = X.isDef ? (cs ? 0.85 : 0) + (mg * 1.2 + ma * 0.5) / S.GOAL_SCALE + saves * 0.35 + penSaved * 0.6 + tackles * 0.2 : (mg + ma * 0.7) / S.GOAL_SCALE;
    return clamp(Math.round((6.1 + S.RATING_ADJ[c.pos] + perGame * 2.4 * (X.isDef ? 0.75 : 1) + Math.min(X.o - club.strength, S.RATING_GAP) * 0.03 + X.trt +
      (res3 === 3 ? 0.2 : res3 === 0 ? -0.25 : 0) + r.gauss() * 0.55 * X.sd) * 10) / 10, 4.5, 10);
  }
  // Jogo com lance decisivo: o placar chega ao do lance (m.score no m.minute) e o resultado segue o lance, para a
  // transmissão contar a mesma história. Atacante: acertou, gol seu (ou assistência, no passe); errou, na final o
  // adversário mata no contra-ataque. Defensor: segurou, fica o placar; falhou, empate (na final, pênaltis perdidos)
  const minOf = s => { const [a, b] = String(s).split('+').map(Number); return a + (b || 0); };
  S.fcMinOf = minOf;
  function scripted(c, fc, r, vs, home, knock, ok, mo) {
    const club = D.CLUB_BY_ID[c.club], X = myRates(c, club), on = true, def = !!S.defKick(c.pos), kick = S.kickType(mo);
    const mm = minOf(mo.minute), [su, st] = mo.score, me = home ? 'h' : 'a', op = home ? 'a' : 'h';
    const before = m => 3 + Math.floor(r() * Math.max(1, m - 8));
    const ev = [];
    for (let i = 0; i < su; i++) ev.push({ m: before(mm), s: me });
    for (let i = 0; i < st; i++) ev.push({ m: before(mm), s: op });
    let ug = su, tg = st, pensLost = false;
    if (!def) {
      if (ok) { ev.push(Object.assign({ m: mm, s: me, dec: 1 }, kick === 'pass' ? { as: 1 } : { me: 1 })); ug++; }
      else if (knock) { ev.push({ m: mm + 2, s: op }); tg++; }
    } else if (!ok) { ev.push({ m: mm, s: op, dec: 1 }); tg++; if (knock && tg === ug) pensLost = true; }
    ev.sort((x, y) => x.m - y.m);
    // Os gols de antes: alguns seus, pela sua média
    const early = ev.filter(e => e.s === me && !e.dec), pick = early.map(e => [r(), e]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const mg0 = Math.min(early.length, r.poisson(X.g90 * FC_K.g)), ma0 = Math.min(early.length - mg0, r.poisson(X.a90 * FC_K.a));
    pick.slice(0, mg0).forEach(e => { e.me = 1; }); pick.slice(mg0, mg0 + ma0).forEach(e => { e.as = 1; });
    const mg = ev.filter(e => e.me).length, ma = ev.filter(e => e.as).length, cs = tg === 0;
    const saves = c.pos === 'GOL' ? r.poisson(X.saves) + (def && ok ? 1 : 0) : 0, tackles = c.pos === 'ZAG' ? r.poisson(X.tackles) + (def && ok ? 1 : 0) : 0;
    const rating = rateOf(c, X, club, r, ug, tg, mg, ma, cs, saves, 0, tackles);
    const won = ug > tg || (knock && ug === tg && !pensLost && ok);
    return { vs, home, gf: ug, ga: tg, on, goals: mg, assists: ma, cs, saves, penFaced: 0, penSaved: 0, tackles, rating, ev, won, pens: knock && ug === tg };
  }

  // ---------- próximo jogo ----------
  // O que vem (para a tela antes de jogar): competição, fase, adversário, mando, se você joga e o lance decisivo, se houver
  S.fcNext = function (c) {
    const fc = c.fc;
    // Copa ou continental já encerrados para você: as datas deles passam direto
    while (fc && fc.i < fc.cal.length && ((fc.cal[fc.i].k === 'cup' && fc.cup.out) || (fc.cal[fc.i].k === 'cont' && fc.cont.out))) fc.i++;
    if (fc && fc.i >= fc.cal.length && !fc.done) S.fcFinish(c);
    if (!fc || fc.i >= fc.cal.length) return null;
    const e = fc.cal[fc.i], club = D.CLUB_BY_ID[c.club];
    let vs = null, home = true, comp = e.k, stage = '', knock = false;
    if (e.k === 'lg') {
      const m = fc.lg.rounds[e.ri].find(([a, b]) => a === 0 || b === 0);
      if (m) { home = m[0] === 0; vs = fc.lg.ids[home ? m[1] : m[0]]; }
      stage = 'Rodada ' + (e.ri + 1);
    } else if (e.k === 'cup') {
      stage = CUP_ST[e.st]; knock = true;
      if (fc.cup.out) vs = null;
      else {
        if (!fc.cup.vs || fc.cup.vsSt !== e.st) { const { r, save } = rngOf(fc); const al = fc.cup.alive.filter(id => id !== club.id); fc.cup.vs = r.pick(al); fc.cup.vsSt = e.st; fc.cup.home = r() < 0.5; save(); }
        vs = fc.cup.vs; home = e.st === 4 ? true : fc.cup.home;
      }
    } else if (e.k === 'cont') {
      const ct = fc.cont; stage = CONT_ST[e.st]; knock = e.st >= 6;
      if (ct.out) vs = null;
      else if (e.st < 6) { const m = ct.md[e.st] && ct.md[e.st].find(([a, b]) => a === 0 || b === 0); if (m) { home = m[0] === 0; vs = ct.group[home ? m[1] : m[0]]; } }
      else {
        if (!ct.vs || ct.vsSt !== e.st) { const { r, save } = rngOf(fc); const KO = [[8, 32], [8, 32], [4, 20], [0, 12]][e.st - 6], top = ct.pool.filter(id => !ct.beat || !ct.beat.includes(id)).slice(KO[0], KO[1]); /* a elite fica para o fim */ ct.vs = r.pick(top.length ? top : ct.pool); ct.vsSt = e.st; ct.home = r() < 0.5; save(); }
        vs = ct.vs; home = e.st === 9 ? true : ct.home;
      }
    }
    // Você joga? (decide uma vez por jogo; lesão tira do time)
    // Com a semana aberta, a escalação ainda não saiu (depende da energia depois dela)
    if (!fc.wkDue && (!fc.pending || fc.pending.i !== fc.i)) {
      const { r, save } = rngOf(fc), X = myRates(c, club);
      let on = false, why = '';
      if (vs) {
        if (fc.injOut > 0) { why = 'lesão'; }
        // Fisioterapeuta particular: lesão 30% mais curta
        else if (r() < X.injRisk / 30) { fc.injOut = 1 + Math.floor(r.range(0.08, 0.32) * 40 * (c.staff && c.staff.physio ? 0.7 : 1)); fc.injName = r.pick(['lesão na coxa', 'entorse no tornozelo', 'problema muscular', 'lesão na panturrilha', 'estiramento na virilha', 'lesão no joelho']); why = 'lesão'; }
        // Jogo grande (finais, mata-mata continental): o técnico escala quem está melhor
        else on = r() < (knock && e.st >= 3 ? Math.min(0.97, X.share + 0.15) : X.share);
        // Sem energia, o técnico poupa (metade das vezes; em decisão, só um terço)
        if (on && fc.en !== undefined && fc.en < EN_OUT && r() < (knock && e.st >= 3 ? 0.33 : 0.5)) { on = false; why = 'cansaço'; }
        if (!on && !why) why = X.share < 0.35 ? 'banco' : 'rodízio';
      }
      fc.pending = { i: fc.i, on, why, req: null }; // pedidos do técnico saíram (2026-10-30)
      save();
    }
    const comps = { lg: fc.lg.name, cup: fc.cup.name, cont: fc.cont ? fc.cont.name : '' };
    const P = fc.pending || { on: null, why: '', req: null };
    const next = { e, vs, home, comp, compName: comps[comp], stage, knock, on: P.on, why: P.why, week: !!fc.wkDue, req: P.req || null, injury: fc.injOut > 0 ? fc.injName : null, injLeft: fc.injOut };
    // Lance decisivo: finais (copa e continental), o clássico da liga e a última rodada valendo título ou acesso
    if (vs && next.on && fc.pending && !fc.pending.mDone) {
      if (fc.pending.m === undefined) { fc.pending.m = momentFor(c, fc, next); }
      next.moment = fc.pending.m;
    }
    return next;
  };
  function momentFor(c, fc, nx) {
    const club = D.CLUB_BY_ID[c.club];
    let type = null;
    if (nx.comp === 'cup' && nx.e.st === 4) type = 'cup';
    else if (nx.comp === 'cont' && nx.e.st === 9 && fc.cont.kind === 'cont') type = 'cont';
    else if (nx.comp === 'lg') {
      const R = fc.lg.rounds.length, ri = nx.e.ri;
      if (ri === R - 1) {
        const ord = order(fc.lg.tab), mePos = ord.indexOf(0) + 1, t = fc.lg.tab, L = fc.lg.promo;
        const gapTop = t[ord[0]].p - t[0].p;
        if (mePos <= 2 && Math.abs(t[ord[0]].p - t[ord[1]].p) <= 3 && !L) type = 'title';
        else if (L && Math.abs(mePos - L) <= 1 && Math.abs(t[ord[L - 1]].p - t[ord[L]].p) <= 3) type = 'acesso';
        if (gapTop > 3) type = type === 'title' ? null : type;
      }
      // Clássico: o primeiro jogo contra o rival de verdade na liga (um por temporada)
      if (!type && !fc.derbyDone && (D.RIVALS[club.id] || []).includes(nx.vs)) type = 'classico';
    }
    if (!type) return null;
    const lg = D.LEAGUE_BY_ID[club.league];
    const m = { type, vs: nx.vs, comp: type === 'cup' ? fc.cup.name : type === 'cont' ? fc.cont.name : lg.name, fc: true };
    // Cada lance sorteia o minuto, o placar (empatado para quem ataca, vencendo por um para quem defende) e, para o
    // atacante, pênalti ou falta: o mesmo lance de sempre ficava previsível (falta aos 86', pênalti aos 90+2)
    const { r, save } = rngOf(fc);
    const def = !!S.defKick(c.pos), big = type !== 'classico';
    m.kick = S.posKick(c.pos) || (r() < 0.55 ? 'pen' : 'fk');
    const pickW = list => { let x = r() * list.reduce((a, w) => a + w[1], 0); for (const [v, w] of list) { x -= w; if (x < 0) return v; } return list[0][0]; };
    m.score = def ? pickW([[[1, 0], 7], [[2, 1], 3]]) : pickW([[[0, 0], 4.5], [[1, 1], 4], [[2, 2], 1.5]]);
    m.minute = pickW(big ? [['90+2', 3], ['90+4', 1], ['88', 2], ['83', 2], ['76', 1.5], ['69', 1]] : [['86', 2], ['79', 2], ['72', 1.5], ['90+1', 2], ['64', 1]]);
    save();
    const us = D.o(club.name), them = D.o(D.CLUB_BY_ID[m.vs].name);
    m.ctx = { cup: 'Final ' + D.da(m.comp) + ': quem vencer leva a taça.', cont: 'Final ' + D.da(m.comp) + ': quem vencer é campeão continental.',
      title: 'Última rodada: ' + us + ' e ' + them + ' brigam pelo título. Quem vencer leva.', acesso: 'Última rodada: a vitória garante o acesso.',
      classico: 'Clássico contra ' + them + ', vale três pontos e a gozação por um ano.' }[type];
    if (def) m.ctx = { cup: 'Final ' + D.da(m.comp) + ': segure o placar e a taça é sua.', cont: 'Final ' + D.da(m.comp) + ': segure o placar e o título é seu.',
      title: 'Última rodada: segurando a vitória, o título é seu.', acesso: 'Última rodada: segurando a vitória, o acesso é seu.', classico: 'Vencendo o clássico: segure e os três pontos são seus.' }[type];
    return m;
  }
  // Ordem da tabela (índices dos times): pontos, vitórias, saldo, gols
  const order = tab => tab.map((x, i) => i).sort((a, b) => tab[b].p - tab[a].p || tab[b].v - tab[a].v || (tab[b].gp - tab[b].gc) - (tab[a].gp - tab[a].gc) || tab[b].gp - tab[a].gp || a - b);
  S.fcOrder = order;
  const addTab = (tab, h, a, gh, ga) => {
    const A = tab[h], B = tab[a];
    A.j++; B.j++; A.gp += gh; A.gc += ga; B.gp += ga; B.gc += gh;
    if (gh > ga) { A.p += 3; A.v++; B.d++; } else if (gh < ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
  };

  // ---------- jogar ----------
  // Joga o próximo item do calendário. force: resultado do lance decisivo (true/false) quando houve.
  // Volta { e, my (seu jogo ou null), others: [{h, a, gh, ga, ev}] (ids), title (taça ganha agora), pe (pontos ganhos) }
  S.fcPlay = function (c, force) {
    const fc = c.fc;
    if (fc && fc.wkDue) S.fcWeek(c); // semana não fechada (simulador, simular N jogos): a automática
    const nx = S.fcNext(c);
    if (!nx) return null;
    if (force === undefined && fc.pending && fc.pending.mDone) force = fc.pending.mOk;
    const { r, save } = rngOf(fc), club = D.CLUB_BY_ID[c.club], e = nx.e;
    // O lance do jogo (depois de jogado, o fcNext não o devolve mais: fica em pending.m)
    const mo = nx.moment || (fc.pending && fc.pending.m) || null;
    const out = { e, nx, my: null, others: [], title: null, pe: 0 };
    if (nx.vs) {
      const my = myMatch(c, fc, r, nx.vs, nx.home, nx.comp, nx.knock, force, mo);
      out.my = my;
      const A = fc.acc;
      A.slots++;
      if (fc.injOut > 0 && !my.on) { fc.injOut--; fc.injMiss++; }
      if (my.on) {
        A.games++; A.goals += my.goals; A.assists += my.assists; A.cs += my.cs ? 1 : 0; A.saves += my.saves; A.pen += my.penSaved; A.penFaced += my.penFaced; A.tackles += my.tackles; A.rsum += my.rating;
        // Pontos de evolução jogo a jogo (até o limite do ano)
        const g = my.rating >= S.PE_R2 ? PE_STEP.great : my.rating >= S.PE_R1 ? PE_STEP.good : my.rating >= PE_OK ? PE_STEP.ok : PE_STEP.low;
        out.pe = give(c, fc, g);
        // Equipamento: cada jogo em campo gasta um; no último, rasga e sai (a loja vende outro)
        if (c.gear) { c.gear.left--; out.gear = { id: c.gear.id, left: c.gear.left, games: c.gear.games }; if (c.gear.left <= 0) { fc.gearOut = c.gear.id; c.gear = null; S.fcShopSync(c); } }
        // Energia gasta no jogo (o treino físico poupa nas próximas semanas) e forma pela nota
        if (fc.en !== undefined) {
          out.en = Math.max(0, Math.round((20 + r() * 10) * (fc.fit > 0 ? 0.7 : 1) * INS_BY[S.fcIns(c)].en) - (c.gear && c.gear.en ? c.gear.en : 0));
          if (fc.fit > 0) fc.fit--;
          fc.en = clamp(fc.en - out.en, 0, 100);
        }
      }
      if (fc.en !== undefined) {
        // Forma: a nota contra a sua média (sequência boa sobe, ruim desce); banco tira um pouco
        const A = fc.acc, avg = A.games > 1 ? (A.rsum - my.rating) / (A.games - 1) : my.rating;
        const d = !my.on ? (fc.injOut > 0 ? 0 : -0.06) : clamp((my.rating - avg) * 0.45, -0.6, 0.6);
        const f0 = fc.fo || 0; fc.fo = clamp(Math.round((f0 * 0.85 + d) * 100) / 100, -2, 2); out.fo = Math.round((fc.fo - f0) * 100) / 100;
      }
      fc.log.push({ i: fc.i, comp: nx.comp, stage: nx.stage, vs: nx.vs, home: nx.home, gf: my.gf, ga: my.ga, on: my.on, goals: my.goals, assists: my.assists, rating: my.rating, won: my.won, pens: my.pens, dec: force !== undefined });
      if (mo && mo.type === 'classico') fc.derbyDone = true;
      if (my.on && fc.en !== undefined) {
        const I = INS_BY[S.fcIns(c)];
        if (I.coach) c.rel.coach = clamp(c.rel.coach + I.coach, 0, 100);
        const rq = nx.req ? REQ[nx.req] : null;
        if (rq) {
          out.req = { id: nx.req, txt: rq.txt, ok: !!rq.ok(my) };
          c.rel.coach = clamp(c.rel.coach + (out.req.ok ? 5 : -2), 0, 100);
          if (out.req.ok) fc.fo = clamp(Math.round(((fc.fo || 0) + 0.3) * 100) / 100, -2, 2);
        }
      }
    }
    if (e.k === 'lg') {
      fc.lg.rounds[e.ri].forEach(([a, b]) => {
        if (a === 0 || b === 0) { const m = out.my; const gh = m.home ? m.gf : m.ga, ga = m.home ? m.ga : m.gf; addTab(fc.lg.tab, a, b, gh, ga); out.mine = { h: fc.lg.ids[a], a: fc.lg.ids[b], gh, ga, ev: m.ev }; return; }
        const g = simple(r, fc.lg.ids[a], fc.lg.ids[b], str(fc.lg.ids[a]), str(fc.lg.ids[b]));
        addTab(fc.lg.tab, a, b, g.gh, g.ga);
        out.others.push(g);
      });
    } else if (e.k === 'cup' && !fc.cup.out) {
      const my = out.my, cup = fc.cup;
      // Os outros confrontos da fase: metade passa (pela força)
      const rest = cup.alive.filter(id => id !== club.id && id !== nx.vs).sort(() => r() - 0.5), next = [];
      for (let k = 0; k + 1 < rest.length; k += 2) { const a = rest[k], b = rest[k + 1], g = simple(r, a, b, str(a), str(b)); const w = g.gh > g.ga || (g.gh === g.ga && pens(r, str(a), str(b))) ? a : b; next.push(w); out.others.push(g); }
      if (my.won) { next.push(club.id); if (e.st === 4) { cup.out = 'won'; out.title = { id: 'cup', name: cup.name }; } }
      else { next.push(nx.vs); cup.out = 'lost'; cup.lostAt = e.st; }
      cup.alive = next;
    } else if (e.k === 'cont' && !fc.cont.out) {
      const ct = fc.cont, my = out.my;
      if (e.st < 6) {
        const md = ct.md[e.st] || [];
        md.forEach(([a, b]) => {
          if (a === 0 || b === 0) { const gh = my.home ? my.gf : my.ga, ga = my.home ? my.ga : my.gf; addTab(ct.gtab, a, b, gh, ga); return; }
          const g = simple(r, ct.group[a], ct.group[b], str(ct.group[a]), str(ct.group[b]), LAM_C); addTab(ct.gtab, a, b, g.gh, g.ga); out.others.push(g);
        });
        if (e.st === ct.md.length - 1 || e.st === 5) { const o = order(ct.gtab); if (o.indexOf(0) > 1) { ct.out = 'group'; } }
      } else {
        if (my.won) { (ct.beat = ct.beat || []).push(nx.vs); if (e.st === 9) { ct.out = 'won'; out.title = { id: ct.kind, name: ct.name }; } }
        else { ct.out = 'lost'; ct.lostAt = e.st; }
      }
    }
    betResolve(c, fc, e, out);
    if (S.fcFixResolve) { S.fcFixResolve(c, fc, out, r); S.fcBichoResolve(c, fc, out, r); } // engine/cassino.js
    if (out.title) out.pe += give(c, fc, 1);
    fc.pending = null;
    fc.i++;
    // Depois de cada data do calendário, a semana até a próxima
    if (fc.en !== undefined) { fc.wkDue = true; fc.wkPlayed = !!(out.my && out.my.on); }
    save();
    if (fc.i >= fc.cal.length) S.fcFinish(c);
    return out;
  };
  // Esforço no jogo ao vivo (escolhido na tela, minuto a minuto): gasta mais ou menos energia e mexe na nota.
  // O placar não muda (já está decidido). Energético: uma lata por jogo, devolve energia e custa dinheiro da carreira.
  S.FC_EFF = [{ id: 'low', name: 'Poupar', en: 0.6, r: -0.3 }, { id: 'mid', name: 'Normal', en: 1, r: 0 }, { id: 'high', name: 'Tudo', en: 1.5, r: 0.3 }];
  S.FC_DRINK_EN = 12;
  S.fcDrinkPrice = c => price(c, 0.25, 1500);
  // mins: minutos jogados em cada nível (na ordem de S.FC_EFF); drink: tomou o energético. Volta { extra, d } ou null
  S.fcEffort = function (c, out, mins, drink) {
    const fc = c.fc, my = out && out.my;
    if (!fc || !my || !my.on || fc.en === undefined || out.en === undefined) return null;
    const tot = mins.reduce((a, b) => a + b, 0);
    const mult = tot ? mins.reduce((a, m, k) => a + m * S.FC_EFF[k].en, 0) / tot : 1, dr = tot ? mins.reduce((a, m, k) => a + m * S.FC_EFF[k].r, 0) / tot : 0;
    if (drink && (c.money || 0) < S.fcDrinkPrice(c)) drink = false;
    if (drink) c.money -= S.fcDrinkPrice(c);
    const extra = Math.round(out.en * (mult - 1)) - (drink ? S.FC_DRINK_EN : 0);
    const en1 = clamp(fc.en - extra, 0, 100);
    out.en += fc.en - en1; fc.en = en1;
    const r1 = clamp(Math.round((my.rating + dr) * 10) / 10, 4.5, 10), d = Math.round((r1 - my.rating) * 10) / 10;
    if (d) {
      my.rating = r1; fc.acc.rsum += d;
      const L = fc.log[fc.log.length - 1]; if (L) L.rating = r1;
      fc.fo = clamp(Math.round(((fc.fo || 0) + d * 0.4) * 100) / 100, -2, 2);
    }
    return { extra, d, drink: !!drink };
  };
  // Lance decisivo do jogo resolvido (minigame ou a chance da carta): o resultado do jogo segue ele.
  // Fica em c.mod.moment o lance mais importante do ano, para as manchetes e o resumo da temporada
  const MOM_W = { cont: 5, cup: 4, title: 4, acesso: 3, classico: 1 };
  S.fcMoment = function (c, m, ok, why) {
    const fc = c.fc;
    if (!fc.pending) S.fcNext(c);
    if (fc.pending.mDone) return; // já resolvido (o minigame salva o resultado assim que sai e de novo no fim)
    fc.pending.mDone = true; fc.pending.mOk = !!ok;
    S.countKick(c, S.kickType(m), ok);
    const M = Object.assign({}, m, { ok: !!ok }, why ? { why } : {});
    if (!c.mod.moment || (MOM_W[m.type] || 0) >= (MOM_W[c.mod.moment.type] || 0)) c.mod.moment = M;
  };
  // Sorteio à parte (derivado do estado, sem avançar o do jogo): o ao vivo já mostrou os lances de antes do minuto
  S.fcAutoMoment = function (c, m) {
    const r = S.rng(((c.fc.seed ^ 0x5bd1e995) >>> 0) + c.fc.i), st = S.kickSetupType(m);
    if (!m.style) m.style = S.autoStyle(c, st);
    const ok = r() < S.kickSetup(c, st, m.style).chance;
    S.fcMoment(c, m, ok);
    return ok;
  };

  // Soma pontos de evolução (fração guardada; cada ponto inteiro entra em c.pe na hora). Limite do ano: S.PE_CAP
  function give(c, fc, x) {
    if (!x) return 0;
    const room = S.PE_CAP - S.fcPeYear({ fc });
    x = Math.max(0, Math.min(x, room));
    fc.peFrac = Math.round((fc.peFrac + x) * 100) / 100;
    while (fc.peFrac >= 1) { fc.peFrac = Math.round((fc.peFrac - 1) * 100) / 100; fc.peGot++; c.pe = (c.pe || 0) + 1; }
    return x;
  }
  // Próximos jogos do calendário (a partir do atual): competição, fase e adversário quando já se sabe
  S.fcPreview = function (c, n) {
    const fc = c.fc, out = [];
    for (let j = fc.i; j < fc.cal.length && out.length < n; j++) {
      const e = fc.cal[j];
      if ((e.k === 'cup' && fc.cup.out) || (e.k === 'cont' && fc.cont.out)) continue;
      let vs = null, home = true;
      if (e.k === 'lg') { const m = fc.lg.rounds[e.ri].find(([a, b]) => a === 0 || b === 0); if (m) { home = m[0] === 0; vs = fc.lg.ids[home ? m[1] : m[0]]; } }
      else if (e.k === 'cont' && e.st < 6) { const m = fc.cont.md[e.st] && fc.cont.md[e.st].find(([a, b]) => a === 0 || b === 0); if (m) { home = m[0] === 0; vs = fc.cont.group[home ? m[1] : m[0]]; } }
      else if (j === fc.i && fc.pending) { const nx = S.fcNext(c); vs = nx.vs; home = nx.home; }
      out.push({ k: e.k, stage: e.k === 'lg' ? 'Rodada ' + (e.ri + 1) : e.k === 'cup' ? CUP_ST[e.st] : CONT_ST[e.st], comp: e.k === 'lg' ? fc.lg.name : e.k === 'cup' ? fc.cup.name : fc.cont.name, vs, home, bye: e.k === 'lg' && !vs });
    }
    return out;
  };
  S.FC_CUP_ST = CUP_ST; S.FC_CONT_ST = CONT_ST;

  // ---------- eventos entre os jogos ----------
  // Chegou uma data de evento? Sorteia um (ou nenhum) que não troque de clube no meio do calendário
  S.fcEventDue = c => { const fc = c.fc; return !!fc && !fc.done && !!fc.evAt && fc.evNext < fc.evAt.length && fc.i >= fc.evAt[fc.evNext]; };
  S.fcPickEvent = function (c) {
    if (!S.fcEventDue(c)) return null;
    c.fc.evNext++;
    return S.pickEvent(c, { mid: true });
  };
  // Escolha resolvida no meio do ano: guarda o evento (não repete no mesmo ano) e a lesão vale nos próximos jogos
  const resolve0 = S.resolveEvent;
  S.resolveEvent = function (c, ev, idx) {
    const fc = c.fc && !c.fc.done && c.fc.season === c.season && c.fc.i > 0 ? c.fc : null, inj0 = c.mod.inj || 0;
    const out = resolve0(c, ev, idx);
    if (fc) {
      (fc.evIds = fc.evIds || []).push(ev.id);
      const d = (c.mod.inj || 0) - inj0;
      if (d > 0) { fc.injOut = Math.max(fc.injOut, Math.max(1, Math.round(d * (fc.cal.length - fc.i) * (c.staff && c.staff.physio ? 0.7 : 1)))); fc.injName = 'lesão'; if (fc.pending) fc.pending = null; }
    }
    return out;
  };

  // Pontos de evolução mostrados (inteiros já no banco + a fração do ano)
  S.fcPe = c => (c.pe || 0) + (c.fc ? c.fc.peFrac : 0);
  // Ganho no ano (o que conta para o limite): inteiros do ano + fração, menos a fração que veio do ano anterior
  S.fcPeYear = c => (c.fc ? Math.round((c.fc.peGot + c.fc.peFrac - (c.fc.peCarry || 0) - (c.fc.peTrain || 0)) * 100) / 100 : 0); // o treino da semana tem limite próprio

  // Fim do calendário: os números do ano para S.playSeason (c.fc.out)
  S.fcFinish = function (c) {
    const fc = c.fc, A = fc.acc, lg = fc.lg, ord = order(lg.tab);
    const pos = ord.indexOf(0) + 1, n = lg.ids.length;
    const all = ord.map(i => lg.tab[i].p);
    fc.out = {
      share: A.slots ? A.games / A.slots : 0, slots: A.slots, games: A.games, goals: A.goals, assists: A.assists, cleanSheets: A.cs, saves: A.saves, penSaved: A.pen, penFaced: A.penFaced, tackles: A.tackles,
      rating: A.games ? Math.round(A.rsum / A.games * 10) / 10 : 0, injShare: A.slots ? fc.injMiss / A.slots : 0, injName: fc.injMiss ? fc.injName : null,
      league: pos === 1, cup: fc.cup.out === 'won', cont: !!fc.cont && fc.cont.kind === 'cont' && fc.cont.out === 'won', cont2: !!fc.cont && fc.cont.kind === 'cont2' && fc.cont.out === 'won',
      contIn: fc.cont ? fc.cont.name : null, pos, pe: fc.peGot, paid: fc.paid || 0,
      table: { pos, pts: all[pos - 1], gap: pos === 1 ? 0 : Math.max(1, all[0] - all[pos - 1]), lead: pos === 1 ? Math.max(1, all[0] - all[1]) : 0, n, rounds: lg.rounds.length,
        ids: ord.map(i => lg.ids[i]), all, promo: lg.promo, releg: lg.releg, m: null },
    };
    fc.done = true;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
