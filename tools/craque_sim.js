// Simula milhares de carreiras do CRAQUE com um "jogador robô" para checar ritmo e variedade.
// Uso: node tools/craque_sim.js [n] [casual]  ·  ORIGIN=tardia CHAL=fiel node tools/craque_sim.js (origem e desafio)
//      MODO=completa node tools/craque_sim.js (Carreira Completa: temporada jogo a jogo)
const D = require('../craque/src/data.js');
const S = require('../craque/src/sim.js');
const N = +process.argv[2] || 2000;
const res = [];
const RIT = { car: 0 }; // MODO=completa: tipos de jogo por temporada (ritmo da fase 1 do plano)
// Dois perfis de robô: "casual" (escolhas aleatórias) e "esperto" (joga como um humano estratégico:
// busca sinergias, sobe para clubes maiores sem perder a titularidade, aceita as boas oportunidades).
const SMART = process.argv[3] !== 'casual';
for (let n = 0; n < N; n++) {
  RIT.car = n;
  const POSS = process.env.POS ? process.env.POS.split(',') : ['ATA', 'MEI', 'ZAG', 'GOL'];
  const pos = POSS[n % POSS.length];
  const c = S.newCareer({ name: 'Robô', pos, foot: 'D', country: D.COUNTRIES[Math.floor(n / POSS.length) % D.COUNTRIES.length].id }, 1000 + n);
  // ORIGIN=id / CHAL=id: carreira com origem e desafio (engine/origins.js); o robô não quebra o desafio
  if (process.env.ORIGIN || process.env.CHAL) S.setOrigin(c, process.env.ORIGIN || 'base', process.env.CHAL);
  let decisions = 0;
  const base = S.offers(c, true);
  S.join(c, SMART ? base.slice().sort((a, b) => b.share - a.share)[0] : base[0]); decisions++;
  while (!c.retired) {
    const ch = S.traitChoices(c);
    if (ch.length) {
      // FORCE=id: sempre pega essa característica quando ela aparece (para medir o peso de cada uma)
      // AVOID=id: nunca pega (linha de base para comparar)
      const F = process.env.FORCE, A = process.env.AVOID;
      const pool = A ? ch.filter(x => x.trait.id !== A) : ch;
      const pick = (F && ch.find(x => x.trait.id === F)) || (pool.length ? (SMART ? (pool.find(x => x.completes) || pool.find(x => x.type === 'up') || pool[0]) : pool[Math.floor(Math.random() * pool.length)]) : null);
      if (pick && pick.type === 'up') S.upgradeTrait(c, pick.trait.id);
      else if (pick) S.addTrait(c, pick.trait.id);
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
    // MODO=completa: os eventos vêm entre os jogos (engine/fullcareer.js), não na pré-temporada
    const doEvent = ev => {
      let i = Math.random() < 0.5 ? 0 : 1;
      // Eventos com aposta (engine/stakes.js): o esperto lê a chance e o que está em jogo (valor escondido ev); nos outros, o mapa antigo
      if (SMART) i = ev.options.every(o => o.ev !== undefined) && !ev.dest ? ev.options.map((o, k) => [o.ev, k]).sort((a, b) => b[0] - a[0])[0][1]
        : ({ banco: 0, assedio: 0, funcao: 0, arabia: 1, renovar: 1, capitao: 0, classico: 1, festa: 1, sub20: 0, protesto: 0 }[ev.id] ?? 0);
      // Com desafio valendo, o robô recusa a proposta do evento que quebraria a regra (a tela avisa)
      if (ev.dest && i === 0 && S.breaksChallenge(c, { club: ev.dest })) i = 1;
      S.resolveEvent(c, ev, i); decisions++;
      c.stats = c.stats || {}; c.stats[ev.id] = (c.stats[ev.id] || 0) + 1;
    };
    const ev0 = process.env.MODO === 'completa' ? null : S.pickEvent(c);
    if (ev0) doEvent(ev0);
    // Jogo decisivo: o robô deixa o jogo decidir (mesma chance que a tela mostra)
    // MODO=completa: a temporada jogo a jogo (engine/fullcareer.js); os lances decisivos acontecem nas finais e no clássico,
    // e o robô investe os pontos de evolução assim que eles entram
    // Loja da Completa (NOSHOP=1 desliga): o robô compra a melhor chuteira que cabe com folga e contrata a equipe que dá para manter
    const shop = c => {
      if (process.env.SHOP !== 'staff' && !c.gear) { const g = ['g3', 'g2', 'g1'].find(id => (c.money || 0) >= S.fcGearPrice(c, id) * 2); if (g) S.fcBuy(c, 'gear', g, S.fcGearAttrs(c)[0]); }
      // Status (fase 3): perfil de gasto do robô (PERFIL=cauteloso|normal|gastador; sem PERFIL, sorteado por carreira 40/35/25)
      const pf = c.perfil, mg = pf === 'gastador' ? 1.2 : pf === 'normal' ? 4 : 0;
      if (mg && !(c.debt > 0)) {
        const cars = S.FC_SHOP.cars, at = S.fcCarAt(c);
        for (let k = cars.length - 1; k > at; k--) if ((c.money || 0) >= S.fcCarPrice(c, cars[k].id) * mg) { S.fcBuy(c, 'car', cars[k].id); break; }
        if (!S.fcOwns(c, 'house') && (c.money || 0) >= S.fcLifePrice(c, 'house') * mg) S.fcBuy(c, 'life', 'house');
        if (!S.fcOwns(c, 'grife') && (c.money || 0) >= S.fcLifePrice(c, 'grife') * mg * 1.5) S.fcBuy(c, 'life', 'grife');
        if (S.fcPartyOk(c) && (c.money || 0) >= S.fcPartyPrice(c) * mg * 2) S.fcParty(c);
      }
      // Investimentos (fase 3, parte 4): o apartamento para quem tem folga; o negócio do primo é coisa de gastador
      if (!(c.debt > 0)) {
        if (pf !== 'gastador' && !S.fcInvHas(c, 'imovel') && (c.money || 0) >= S.fcInvPrice(c) * (pf === 'cauteloso' ? 3 : 2)) S.fcInvBuy(c, 'imovel');
        if (pf === 'gastador' && !S.fcInvHas(c, 'startup')) { const st = S.fcInvStakes(c).filter(v => (c.money || 0) >= v * 1.5).pop(); if (st) S.fcInvBuy(c, 'startup', st); }
      }
      if (process.env.SHOP !== 'gear') for (const k of (process.env.STAFF ? process.env.STAFF.split(',') : ['video', 'pt', 'physio']).concat(c.age >= 29 && !process.env.STAFF ? ['nutri'] : [])) if (!(c.staff && c.staff[k]) && (c.money || 0) >= S.fcStaffCost(c, k) * 60) S.fcBuy(c, 'staff', k);
    };
    // Fase 3: no vermelho, o robô procura uma saída (o gastador só quando a dívida passa de 8 semanas): adiantamento,
    // ajuda da mãe, vender o carro, a casa e, por último, renovar ganhando menos. NOVOLTA=1 desliga
    const volta = c => {
      if (!(c.debt > 0)) return;
      const wp = S.fcWeekPay(c);
      if (c.debt < (c.perfil === 'gastador' ? 8 : 2) * wp) return;
      if (S.fcAdvanceOk(c)) return S.fcAdvance(c);
      if (S.fcHelpOk(c)) return S.fcHelp(c);
      if (S.fcOwns(c, 'grife')) return S.fcSell(c, 'grife');
      { const k = S.fcInvs(c).findIndex(x => x.id === 'imovel'); if (k >= 0) return S.fcInvSell(c, k); }
      if (c.life && c.life.car) return S.fcSell(c, 'car');
      if (S.fcOwns(c, 'house')) return S.fcSell(c, 'house');
      if (S.fcCutOk(c)) return S.fcCut(c);
    };
    if (process.env.MODO === 'completa') {
      c.mode = 'completa'; S.fcStart(c);
      if (!c.perfil) { const u = Math.random(); c.perfil = process.env.PERFIL || (u < 0.4 ? 'cauteloso' : u < 0.75 ? 'normal' : 'gastador'); }
      let nx;
      while ((nx = S.fcNext(c))) {
        // Metas do ano (fase 6): o robô escolhe o sonho ao acaso entre os três (SONHO=id força um, se estiver entre eles)
        if (S.fcGoals(c) && !c.fc.goals.dream) { const o = S.fcDreamOpts(c); S.fcDream(c, o.includes(process.env.SONHO) ? process.env.SONHO : o[Math.floor(Math.random() * o.length)]); }
        if (S.fcEventDue(c)) { const ev = S.fcPickEvent(c); if (ev) { doEvent(ev); const y = RIT[c.season]; if (y && y.length) y[y.length - 1].ev++; } continue; }
        // A semana entre os jogos: o robô usa a automática (FC_WEEK=0 desliga energia e forma, para comparar)
        // Convites do celular (fase 2): o robô responde pela melhor média (CONVITE=acaso responde ao acaso; CONVITE=nao deixa sem resposta)
        if (c.fc.wkDue) { if (process.env.CONVITE !== 'nao') S.fcInvAuto(c, process.env.CONVITE === 'acaso');
          // Treino com lances: o robô joga os 3 lances do treino técnico sempre que pode (TREINO=nao nunca; TREINO=0.3 em 30% das semanas)
          if (process.env.TREINO !== 'nao' && S.fcTrOpen(c) && Math.random() < (process.env.TREINO ? +process.env.TREINO || 1 : 1)) { const a = S.fcTrAttr(c); for (let k = 0; k < S.FC_TR_SESS && a; k++) S.fcTrSession(c, a, true); } // Janela do meio do ano (fase 4): o robô assina se for um clube mais forte onde joga, ou se está sobrando e o novo dá minutos (JANELA=nao nunca)
          { const w = process.env.JANELA !== 'nao' && S.fcWin(c);
            if (w) { const cur = D.CLUB_BY_ID[c.club], sh = c.fc.acc.slots ? c.fc.acc.games / c.fc.acc.slots : 1;
              const alive = (c.fc.cont && !c.fc.cont.out) || !c.fc.cup.out; // ainda vivo na copa ou no continental: trocar perde a taça
              const k = w.offers.findIndex(o => (D.CLUB_BY_ID[o.club].strength > cur.strength + (alive ? 6 : 3) && o.share >= 0.5) || (sh < 0.35 && o.share >= 0.6) || (o.kind === 'money' && c.age >= 29 && o.wage >= 1.8 * c.wage));
              if (k >= 0) { S.fcWinSign(c, k); c.midMoves = (c.midMoves || 0) + 1; } else S.fcWinStay(c); } }
          S.fcWeek(c); if (!process.env.NOSHOP) shop(c); if (!process.env.NOVOLTA) volta(c); continue; }
        if (process.env.FOSTAT) { global.FO = global.FO || []; FO.push([c.fc.fo, c.fc.en]); }
        if (nx.moment) { c.mstats = c.mstats || { n: 0, ok: 0 }; c.mstats.n++; if (S.fcAutoMoment(c, nx.moment)) c.mstats.ok++; decisions++; }
        // Ritmo (plano, fase 1): o tipo de cada jogo do ano, para o tempo da temporada
        { const k = S.fcKind(c, nx), y = (RIT[c.season] = RIT[c.season] || []); let row = y[y.length - 1];
          if (!row || row.car !== RIT.car) y.push(row = { car: RIT.car, vivo: 0, resumo: 0, banco: 0, folga: 0, ev: 0, why: {} });
          row[k]++; if (k === 'vivo') { const w = S.fcBig(c, nx); row.why[w] = (row.why[w] || 0) + 1; } }
        S.fcPlay(c);
        const w = D.POS[c.pos].w, opts = D.INVEST.filter(t => S.canInvest(c, t.id));
        if (opts.length && SMART) { const score = t => (t.attr ? w[Object.keys(t.attr)[0]] : 0.15) / (1 + (c.inv[t.id] || 0)); S.invest(c, opts.sort((a, b) => score(b) - score(a))[0].id); }
      }
    } else if (!process.env.NOMOMENT && S.pickMoment(c)) { c.mstats = c.mstats || { n: 0, ok: 0 }; c.mstats.n++; if (S.autoMoment(c)) c.mstats.ok++; decisions++; }
    // Foco nos treinos: TRAIN=id força um; o esperto treina forte enquanto jovem e leve quando veterano
    c.train = process.env.TRAIN || (SMART ? (c.age <= 28 ? 'forte' : c.age >= 32 ? 'leve' : 'normal') : D.TRAIN[Math.floor(Math.random() * D.TRAIN.length)].id);
    S.playSeason(c);
    // Copa do Mundo: o robô joga se for convocado (pênaltis pela chance)
    // Jogo a Jogo (fase 5): nos anos pares sem Copa, o torneio do continente
    if (S.natTour(c) && S.wcCall(c).called) {
      if (S.natTour(c) === 'nat2') S.natContStart(c); else S.wcStart(c); decisions++;
      let g; while ((g = S.wcNext(c))) {
        if (g.live) { S.wcMomentAuto(c); decisions++; }
        if (g.pens) S.wcPensAuto(c);
      }
    }
    // Mundial de Clubes (a cada 4 anos): o robô joga se o clube estiver classificado
    if (S.isCwcYear(c) && S.cwcCall(c).called) {
      S.cwcStart(c); decisions++;
      let g; while ((g = S.wcNext(c))) {
        if (g.live) { S.wcMomentAuto(c); decisions++; }
        if (g.pens) S.wcPensAuto(c);
      }
    }
    if (S.mustRetire(c)) break;
    if (S.canAnnounce(c) && S.ovr(c) < (SMART ? 76 : 72) && Math.random() < 0.6) { S.announce(c); decisions++; }
    if (!S.windowOpen(c)) continue;
    const offers = S.offers(c, false);
    decisions++;
    let opts = offers.concat([S.stayOffer(c)]);
    if (c.challenge && !c.chFail) opts = opts.filter(o => !S.breaksChallenge(c, o));
    if (!offers.length && S.ovr(c) < 50) break;
    const stay = S.stayOffer(c);
    if (!SMART && n % 4 < 2 && stay.share >= 0.78 && Math.random() < 0.8) { S.join(c, stay); continue; }
    const minShare = SMART ? 0.78 : 0.55;
    // Janela aberta pela cláusula: o esperto só sai para um clube de nível acima (senão segue o contrato)
    if (SMART && c.clauseOpen && c.contract > 0) { const up = opts.filter(o => o.share >= minShare && D.CLUB_BY_ID[o.club].tier > D.CLUB_BY_ID[c.club].tier); if (!up.length) { c.clauseOpen = false; continue; } }
    const good = opts.filter(o => o.share >= minShare).sort((a, b) => D.CLUB_BY_ID[b.club].strength - D.CLUB_BY_ID[a.club].strength);
    // Termos do contrato (engine/contract.js): DEAL=id força um; o esperto pede minutos quando chega sem vaga
    // de titular; o casual assina como veio
    const pickO = good[0] || opts.sort((a, b) => b.share - a.share)[0];
    const term = process.env.DEAL || (!SMART ? 'padrao' : pickO.share < 0.78 ? 'minutos' : 'padrao');
    S.join(c, S.withTerm(pickO, term));
  }
  const f = S.finish(c);
  (globalThis.ACH = globalThis.ACH || {}); S.achievementsOf(c, f).forEach(id => { ACH[id] = (ACH[id] || 0) + 1; });
  const LG = S.legacy(c), GH = { club: [0, 0], emp: [0, 0], me: [0, 0] }; (c.goalHist || []).forEach(h => h.g.forEach(x => { GH[x.side][0]++; if (x.ok) GH[x.side][1]++; }));
  res.push({ leg: LG.pts, legBy: LG.by, gh: GH, natCont: c.totals.natCont || 0, natApps: (c.wcHist || []).filter(h => h.kind === 'nat2').length, midMoves: c.midMoves || 0, perfil: c.perfil, aperto: ((c.fin && c.fin.maxDebt) || 0) >= 1, quebrou: (c.debt || 0) > 0, maxDebt: (c.fin && c.fin.maxDebt) || 0, score: f.score, cs: c.totals.cs || 0, penSaved: c.totals.penSaved || 0, tackles: c.totals.tackles || 0, build:c.traits.slice().sort().join('+'), idol: f.verdict.startsWith('Ídolo'), farewell: !!c.farewell, seasons: c.season, decisions, goals: c.totals.goals, assists: c.totals.assists, titles: f.titles, ballon: c.totals.ballon, peak: c.peak, grade: f.grade, verdict: f.verdict, pos, clubs: f.nClubs, games: c.totals.games, events: Object.values(c.stats || {}).reduce((a, b) => a + b, 0), buys: c.buys, invOvr: S.ovr(c) - S.ovrOf(S.preview(c, {}).attrs, c.pos) + (() => { const inv = c.inv; c.inv = {}; const o = S.ovr(c); c.inv = inv; return S.ovr(c) - o; })(), firstBuy: c.firstBuyAge || 0, peLeft: c.pe || 0, money: Math.round(c.money / 1e6), moments: (c.mstats || {}).n || 0, wcApps: c.totals.wcApps || 0, wc: c.totals.wc || 0, wcGoals: c.totals.wcGoals || 0, cwcApps: c.totals.cwcApps || 0, cwc: c.totals.cwc || 0, inter: c.totals.inter || 0, momentsOk: (c.mstats || {}).ok || 0, cards: (c.cards || []).length });
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
pr('Compras (investimentos)', 'buys'); pr('OVR vindo de compras', 'invOvr'); pr('Idade da 1ª compra', 'firstBuy'); pr('Saldo final (mi)', 'money'); pr('Pontos não usados', 'peLeft'); pr('Jogos decisivos', 'moments'); pr('Copas disputadas', 'wcApps'); pr('Gols em Copas', 'wcGoals'); if (process.env.MODO === 'completa') { pr('Torneios do continente disputados', 'natApps'); pr('Torneios do continente ganhos', 'natCont'); }
console.log('Carreiras com Copa disputada:', (res.filter(r => r.wcApps > 0).length / N * 100).toFixed(0) + '% · campeão do mundo:', (res.filter(r => r.wc > 0).length / N * 100).toFixed(1) + '% · 2+ títulos:', (res.filter(r => r.wc > 1).length / N * 100).toFixed(1) + '%');
console.log('Carreiras com Mundial de Clubes:', (res.filter(r => r.cwcApps > 0).length / N * 100).toFixed(0) + '% · campeão:', (res.filter(r => r.cwc > 0).length / N * 100).toFixed(1) + '% · Intercontinental:', (res.filter(r => r.inter > 0).length / N * 100).toFixed(1) + '%');
console.log('Acerto nos jogos decisivos:', (res.reduce((a, r) => a + r.momentsOk, 0) / Math.max(1, res.reduce((a, r) => a + r.moments, 0)) * 100).toFixed(0) + '%');
const ballon = res.filter(r => r.ballon > 0).length / N;
console.log('Cartas especiais por carreira:', (res.reduce((a, r) => a + r.cards, 0) / N).toFixed(2), '· carreiras sem nenhuma:', (res.filter(r => !r.cards).length / N * 100).toFixed(0) + '%');
console.log('Carreiras com Bola de Ouro:', (ballon * 100).toFixed(1) + '%', '| com 3+:', (res.filter(r => r.ballon >= 3).length / N * 100).toFixed(1) + '%');
// Por posição: nota final, Bola de Ouro, pontuação mediana e estatísticas próprias
['ATA', 'MEI', 'ZAG', 'GOL'].forEach(p => {
  const rs = res.filter(r => r.pos === p); if (!rs.length) return;
  const gd = {}; rs.forEach(r => { gd[r.grade] = (gd[r.grade] || 0) + 1; });
  console.log(p.padEnd(4), 'notas', Object.entries(gd).sort().map(([g, n]) => g + ' ' + Math.round(n / rs.length * 100) + '%').join(' '),
    '| Bola de Ouro', Math.round(rs.filter(r => r.ballon > 0).length / rs.length * 100) + '%', '| pontos (mediana)', q(rs.map(r => r.score), 0.5),
    '| gols', q(rs.map(r => r.goals), 0.5), '| sem sofrer gol', q(rs.map(r => r.cs), 0.5), '| pênaltis defendidos', q(rs.map(r => r.penSaved), 0.5), '| desarmes', q(rs.map(r => r.tackles), 0.5));
});
const grades = {}; res.forEach(r => { grades[r.grade] = (grades[r.grade] || 0) + 1; });
console.log('Notas finais:', Object.entries(grades).sort().map(([g, n]) => g + ' ' + (n / N * 100).toFixed(0) + '%').join(' · '));
const ver = {}; res.forEach(r => { const v = r.verdict.startsWith('Ídolo') ? 'Ídolo eterno do X' : r.verdict; ver[v] = (ver[v] || 0) + 1; });
console.log('Vereditos:', Object.entries(ver).sort((a, b) => b[1] - a[1]).map(([v, n]) => v + ' ' + (n / N * 100).toFixed(0) + '%').join(' · '));
['ATA', 'MEI', 'ZAG', 'GOL'].forEach(p => {
  const rs = res.filter(r => r.pos === p); if (!rs.length) return;
  const vp = {}; rs.forEach(r => { const v = r.verdict.startsWith('Ídolo') ? 'Ídolo eterno do X' : r.verdict; vp[v] = (vp[v] || 0) + 1; });
  console.log('  vereditos ' + p + ':', Object.entries(vp).sort((a, b) => b[1] - a[1]).map(([v, n]) => v + ' ' + Math.round(n / rs.length * 100) + '%').join(' · '));
});
const secs = q(res.map(r => r.decisions * 6 + r.seasons * 5), .5);
console.log('Duração estimada (6 s por decisão + 5 s de resumo por temporada):', Math.floor(secs / 60) + 'min' + (secs % 60) + 's');

console.log('Conquistas (% das carreiras):', S.ACHIEVEMENTS.map(a => a.id + ' ' + Math.round((ACH[a.id] || 0) / N * 100) + '%').join(' · '));
// Cortes de S.GRADES que dariam a distribuição alvo (S11/A26/B31/C19/D13) com estas carreiras: para recalibrar
{ const sc = res.map(r => r.score); console.log('Cortes para o alvo S11/A26/B31/C19/D13: S ' + q(sc, 0.89) + ' · A ' + q(sc, 0.63) + ' · B ' + q(sc, 0.32) + ' · C ' + q(sc, 0.13) + ' (atuais: ' + S.gradesOf(process.env.MODO === 'completa' ? { mode: 'completa' } : null).slice(0, 4).map(g => g.join(' ')).join(' · ') + ')'); }

// Ritmo do Jogo a Jogo (plano, fase 1): alvo ~1 h por temporada e ~15 jogos vividos. Tempo estimado por jogo:
// vivido 210 s (semana no celular, viagem, jogo ao vivo com o seu lance e jornal), resumido 42 s (com o lance), no banco 8 s, folga 4 s,
// evento 25 s, e 120 s por temporada (pré-temporada, janela e resumo).
if (process.env.MODO === 'completa') {
  // Dinheiro (fase 3): alvo 15-25% das carreiras passam por um aperto (entram no vermelho) e menos de 5% terminam devendo
  const pc = (rs, f) => (rs.length ? Math.round(100 * rs.filter(f).length / rs.length) : 0) + '%';
  console.log('Dinheiro: aperto ' + pc(res, r => r.aperto) + ' · terminou devendo ' + pc(res, r => r.quebrou) + ' · maior dívida (semanas, mediana de quem apertou) ' + q(res.filter(r => r.aperto).map(r => r.maxDebt).concat([0]), 0.5).toFixed(1) + ' (alvo 15-25% e <5%)');
  ['cauteloso', 'normal', 'gastador'].forEach(p => { const rs = res.filter(r => r.perfil === p); if (rs.length) console.log('  ' + p + ' (' + rs.length + '): aperto ' + pc(rs, r => r.aperto) + ' · devendo no fim ' + pc(rs, r => r.quebrou) + ' · saldo final mediano R$ ' + q(rs.map(r => r.money), 0.5) + ' mi · nota média ' + (rs.reduce((a, r) => a + r.score, 0) / rs.length).toFixed(0)); });
  // Mercado (fase 4): trocas de clube na janela do meio do ano
  console.log('Janela do meio do ano: ' + pc(res, r => r.midMoves > 0) + ' das carreiras trocaram ao menos uma vez · ' + (res.reduce((a, r) => a + r.midMoves, 0) / Math.max(1, res.length)).toFixed(1) + ' trocas por carreira · clubes por carreira ' + (res.reduce((a, r) => a + r.clubs, 0) / Math.max(1, res.length)).toFixed(1));
  // Metas e legado (fase 6): quanto se cumpre de cada meta e de onde vêm os pontos de legado (nenhum caminho pode dominar)
  const gs = side => { const a = res.reduce((x, r) => [x[0] + r.gh[side][0], x[1] + r.gh[side][1]], [0, 0]); return a[0] ? Math.round(100 * a[1] / a[0]) + '%' : '-'; };
  console.log('Metas cumpridas: clube ' + gs('club') + ' · empresário ' + gs('emp') + ' · sonho ' + gs('me'));
  ['ATA', 'MEI', 'ZAG', 'GOL'].forEach(p => { const rs = res.filter(r => r.pos === p); if (!rs.length) return; const by = {}; rs.forEach(r => Object.keys(r.legBy).forEach(k => { by[k] = (by[k] || 0) + r.legBy[k]; })); const tot = Object.values(by).reduce((a, b) => a + b, 0) || 1;
    console.log('  Legado ' + p + ' (' + rs.length + '): p10 ' + q(rs.map(r => r.leg), 0.1) + ' · mediana ' + q(rs.map(r => r.leg), 0.5) + ' · p90 ' + q(rs.map(r => r.leg), 0.9) + ' · de onde vem: ' + Object.keys(by).map(k => k + ' ' + Math.round(100 * by[k] / tot) + '%').join(', ')); });
  { const top = res.slice().sort((a, b) => b.leg - a.leg).slice(0, Math.max(1, Math.round(res.length / 10))); const by = {}; top.forEach(r => Object.keys(r.legBy).forEach(k => { by[k] = (by[k] || 0) + r.legBy[k]; })); const tot = Object.values(by).reduce((a, b) => a + b, 0) || 1;
    console.log('  Legado dos 10% maiores: mediana ' + q(top.map(r => r.leg), 0.5) + ' · de onde vem: ' + Object.keys(by).map(k => k + ' ' + Math.round(100 * by[k] / tot) + '%').join(', ') + ' · correlação com a nota ' + (() => { const xs = res.map(r => r.leg), ys = res.map(r => r.score), mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let a = 0, b = 0, d = 0; xs.forEach((x, i) => { a += (x - mx) * (ys[i] - my); b += (x - mx) ** 2; d += (ys[i] - my) ** 2; }); return (a / Math.sqrt(b * d || 1)).toFixed(2); })()); }
  const T = { vivo: 210, resumo: 42, banco: 8, folga: 4 };
  const rows = Object.keys(RIT).filter(k => k !== 'car').flatMap(k => RIT[k].map(r => Object.assign({ season: +k }, r)));
  const mins = r => (r.vivo * T.vivo + r.resumo * T.resumo + r.banco * T.banco + r.folga * T.folga + r.ev * 25 + 120) / 60;
  const fmt = rs => 'jogos ' + q(rs.map(r => r.vivo + r.resumo + r.banco + r.folga), 0.5) + ' · vividos ' + q(rs.map(r => r.vivo), 0.5) + ' (' + q(rs.map(r => r.vivo), 0.1) + '-' + q(rs.map(r => r.vivo), 0.9) + ')' +
    ' · resumidos ' + q(rs.map(r => r.resumo), 0.5) + ' · banco ' + q(rs.map(r => r.banco), 0.5) + ' · tempo ' + Math.round(q(rs.map(mins), 0.5)) + ' min (' + Math.round(q(rs.map(mins), 0.1)) + '-' + Math.round(q(rs.map(mins), 0.9)) + ')';
  console.log('Ritmo por temporada (mediana, faixa 10-90%): ' + fmt(rows));
  [[0, 0], [1, 3], [4, 9], [10, 30]].forEach(([a, b]) => { const rs = rows.filter(r => r.season >= a && r.season <= b); if (rs.length) console.log('  temporadas ' + (a + 1) + (b > a ? '-' + (b + 1) : '') + ': ' + fmt(rs)); });
  const why = {}; rows.forEach(r => Object.entries(r.why).forEach(([k, n]) => { why[k] = (why[k] || 0) + n; }));
  console.log('  por que vivido (média por temporada): ' + Object.entries(why).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + (n / rows.length).toFixed(1)).join(' · '));
  console.log('  carreira inteira: ' + Math.round(q(Object.values(rows.reduce((o, r) => { o[r.car] = (o[r.car] || 0) + mins(r); return o; }, {})), 0.5) / 60) + ' h (mediana)');
}
