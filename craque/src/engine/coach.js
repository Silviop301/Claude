// Modo Treinador (plano, fase 7): o motor. Sem tela; roda no navegador e no Node, como o resto.
// Estado próprio da carreira de técnico (co), separado do jogador (c):
//   co = { mode: 'treinador', name, country, start, season, club, fame, xp: {pts, leitura, motiv, negoc}, seed,
//          squad: [jogadores do seu clube], form, style, xi: [11 ids na ordem das vagas], bench: [ids], cap, pk,
//          leagueOf, clubBoost (as divisões da carreira, como no jogador), board: {goal, conf, ult}, ss: a temporada, hist }
// Jogador: { id, n, pos (GOL/ZAG/LAT/MEI/ATA), age, ovr, pot, wage, ct (anos de contrato), mo (moral 0-100), en (energia), out (jogos fora), sus }
// Os outros clubes têm elenco sorteado pelo id do clube e pela temporada (não ocupa o save).
// Partida: força dos titulares por setor (defesa, meio, ataque), mudada por formação, estilo, cansaço e moral; o jogo anda
// minuto a minuto e para em gol, vermelho, lesão e no intervalo, onde se troca (5 trocas) e muda formação ou estilo.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;
  const L = () => S._.fcLib;
  const env = (k, d) => +((typeof process !== 'undefined' && process.env && process.env[k]) || d);

  // ---------- números do modo (calibrados com tools/craque_treinador.js) ----------
  const CO = S.CO = {
    squad: { GOL: 3, ZAG: 5, LAT: 4, MEI: 8, ATA: 5 },
    lamH: 1.32, lamA: 1.06, k: env('CO_K', 36), home: 2, mid: 0.3,
    styleFx: { atacar: { att: 2.5, def: -2.5, en: 1.15 }, equilibrar: { att: 0, def: 0, en: 1 }, segurar: { att: -3, def: 2.5, en: 0.9 } },
    enGame: 12, enRest: 8, enOff: 20, enOpp: 80, inj: 0.011, red: 0.012, subs: 5,
    conf0: 60, confK: env('CO_CK', 3), ppg: 1.34, ultAt: env('CO_ULT', 25), ultN: 3, ultNeed: 2, ultMin: 6,
    fame0: { baixo: 5, livre: 25 }, skillMax: 10,
  };
  // Formações: as vagas depois do goleiro (defesa, meio, ataque), com a posição de cada vaga
  const FORMS = S.CO_FORMS = {
    '4-4-2': { d: ['LAT', 'ZAG', 'ZAG', 'LAT'], m: ['MEI', 'MEI', 'MEI', 'MEI'], a: ['ATA', 'ATA'] },
    '4-3-3': { d: ['LAT', 'ZAG', 'ZAG', 'LAT'], m: ['MEI', 'MEI', 'MEI'], a: ['ATA', 'ATA', 'ATA'] },
    '3-5-2': { d: ['ZAG', 'ZAG', 'ZAG'], m: ['LAT', 'MEI', 'MEI', 'MEI', 'LAT'], a: ['ATA', 'ATA'] },
    '4-2-3-1': { d: ['LAT', 'ZAG', 'ZAG', 'LAT'], m: ['MEI', 'MEI', 'MEI', 'MEI', 'MEI'], a: ['ATA'] },
    '5-3-2': { d: ['LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT'], m: ['MEI', 'MEI', 'MEI'], a: ['ATA', 'ATA'] },
  };
  S.CO_STYLES = ['atacar', 'equilibrar', 'segurar'];
  const slotsOf = form => ['GOL'].concat(FORMS[form].d, FORMS[form].m, FORMS[form].a);
  const sectorOf = (form, i) => (i === 0 ? 'g' : i <= FORMS[form].d.length ? 'd' : i <= FORMS[form].d.length + FORMS[form].m.length ? 'm' : 'a');
  S.coSlots = slotsOf;
  // Jogador fora da posição rende menos
  const FIT = { ZAG: { LAT: 0.92, MEI: 0.85 }, LAT: { ZAG: 0.9, MEI: 0.9, ATA: 0.8 }, MEI: { LAT: 0.88, ZAG: 0.82, ATA: 0.9 }, ATA: { MEI: 0.88, LAT: 0.78 } };
  const fit = (pos, slot) => (pos === slot ? 1 : pos === 'GOL' || slot === 'GOL' ? 0.4 : (FIT[pos] && FIT[pos][slot]) || 0.7);
  S.coFit = fit;

  // ---------- elencos ----------
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const wageOf = ovr => Math.round(Math.exp((ovr - 50) / 8.5) * 2) * 1000; // por semana
  function mkPlayer(r, club, pos, ovr, age, id, cty) {
    const pot = Math.min(95, Math.round(ovr + Math.max(0, 25 - age) * r.range(0.6, 1.7)));
    return { id, n: D.randomName(cty, r), pos, age, ovr: clamp(Math.round(ovr), 30, 95), pot: Math.max(Math.round(ovr), pot), wage: wageOf(ovr), ct: r.int(1, 4), mo: 60, en: 100, out: 0, sus: 0 };
  }
  // Elenco de um clube na temporada: os mais fortes perto da força do clube, o banco abaixo, os garotos mais abaixo
  function genSquad(clubId, season) {
    const club = D.CLUB_BY_ID[clubId], r = S.rng(hash(clubId + '|' + season)), cty = D.countryOf(club), s = club.strength;
    const out = [];
    Object.keys(CO.squad).forEach(pos => {
      const n = CO.squad[pos];
      for (let k = 0; k < n; k++) {
        const young = k === n - 1 && r() < 0.6, age = young ? r.int(17, 20) : r.int(20, 34);
        const ovr = s + 2.5 - 8 * (k / Math.max(1, n - 1)) + r.gauss() * 2.5 - (young ? 6 : 0) - (age >= 33 ? 2 : 0);
        out.push(mkPlayer(r, club, pos, ovr, age, clubId + ':' + season + ':' + out.length, cty));
      }
    });
    return out;
  }
  S.coGenSquad = genSquad;

  // ---------- escalação ----------
  const ok = p => p && !p.out && !p.sus;
  // O auxiliar monta o time: para cada vaga, o melhor que sobra pela força na vaga (energia conta)
  function autoXI(squad, form) {
    const used = new Set(), slots = slotsOf(form), xi = [];
    const val = (p, sl) => p.ovr * fit(p.pos, sl) * (0.75 + 0.25 * (p.en === undefined ? 100 : p.en) / 100);
    // Primeiro as vagas da própria posição (mais escassas antes: goleiro, laterais, zagueiros)
    const order = slots.map((sl, i) => i).sort((a, b) => ['GOL', 'LAT', 'ZAG', 'ATA', 'MEI'].indexOf(slots[a]) - ['GOL', 'LAT', 'ZAG', 'ATA', 'MEI'].indexOf(slots[b]));
    order.forEach(i => {
      const best = squad.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => val(b, slots[i]) - val(a, slots[i]))[0];
      if (best) { used.add(best.id); xi[i] = best.id; }
    });
    const bench = squad.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id);
    return { xi, bench };
  }
  S.coAutoXI = autoXI;
  S.coBestForm = sq => bestForm(sq.filter(ok));
  // Formação do adversário: a que dá mais força para o elenco dele
  function bestForm(squad) {
    let best = '4-4-2', bv = -1e9;
    ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2'].forEach(f => { const t = power(squad, f, autoXI(squad, f).xi, 'equilibrar'); const v = t.A + t.D; if (v > bv) { bv = v; best = f; } });
    return best;
  }

  // ---------- força do time ----------
  const byId = squad => { const m = {}; squad.forEach(p => { m[p.id] = p; }); return m; };
  const eff = (p, sl) => p.ovr * fit(p.pos, sl) * (0.8 + 0.2 * (p.en === undefined ? 100 : p.en) / 100) * (p.out ? 0.5 : 1) * (1 + ((p.mo === undefined ? 60 : p.mo) - 60) / 1200);
  // A: ataque, D: defesa, M: meio. Mais gente num setor soma (e tira de outro); o estilo empurra para um lado
  function power(squad, form, xi, style, red) {
    const m = byId(squad), slots = slotsOf(form), sec = { g: [], d: [], m: [], a: [] };
    xi.forEach((id, i) => { const p = m[id]; if (p) sec[sectorOf(form, i)].push(eff(p, slots[i])); });
    const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 30);
    const F = FORMS[form], sf = CO.styleFx[style] || CO.styleFx.equilibrar;
    const lack = 11 - xi.filter(id => m[id]).length; // expulso ou sem jogador (vaga null): o time sente
    const d = avg(sec.d) + 1.4 * (F.d.length - 4) + sf.def, mi = avg(sec.m) + 1.4 * (F.m.length - 4), a = avg(sec.a) + 1.6 * (F.a.length - 2) + sf.att, g = sec.g.length ? sec.g[0] : 35;
    return { A: 0.65 * a + 0.35 * mi - 3 * lack, D: 0.55 * d + 0.25 * mi + 0.2 * g - 3 * lack, M: mi - 2.5 * lack };
  }
  S.coPower = power;
  // Gols esperados de cada lado no jogo inteiro
  function lams(ph, pa) {
    const me = (ph.M - pa.M) * CO.mid;
    return [CO.lamH * Math.exp((ph.A - pa.D + me + CO.home) / CO.k), CO.lamA * Math.exp((pa.A - ph.D - me) / CO.k)];
  }
  S.coLams = lams;

  // ---------- carreira ----------
  S.coNew = function (o) {
    const co = { mode: 'treinador', name: o.name || 'Técnico', country: o.country || 'Brasil', look: o.look || null, start: o.start === 'livre' ? 'livre' : 'baixo',
      season: 0, club: null, fame: CO.fame0[o.start === 'livre' ? 'livre' : 'baixo'], xp: { pts: 0, leitura: 0, motiv: 0, negoc: 0 },
      seed: (o.seed || (Math.random() * 4294967295)) >>> 0, leagueOf: {}, clubBoost: {}, hist: [], titles: [], pid: 0, form: '4-4-2', style: 'equilibrar' };
    return co;
  };
  const rngCo = co => { const r = S.rng(co.seed); return { r, save: () => { co.seed = r.state(); } }; };
  // Propostas de clube: no começo "de baixo", clubes pequenos das divisões de baixo; depois, pela fama (e o do coração no começo livre)
  S.coOffers = function (co, n) {
    S.applyLeagues(co);
    const { r, save } = rngCo(co);
    const cty = co.country, top = 50 + co.fame * 0.38, low = top - 10;
    let pool = D.CLUBS.filter(x => x.id !== co.club && x.strength <= top + 1 && x.strength >= low);
    if (co.start === 'baixo' && co.season === 0 && !co.club) pool = D.CLUBS.filter(x => !(D.LADDER[x.league] && D.LADDER[x.league].down) && x.strength <= 56);
    if (!pool.length) pool = D.CLUBS.slice().sort((a, b) => Math.abs(a.strength - top) - Math.abs(b.strength - top)).slice(0, 12);
    const home = pool.filter(x => D.countryOf(x) === cty), rest = pool.filter(x => D.countryOf(x) !== cty);
    const out = [];
    while (out.length < (n || 4) && (home.length || rest.length)) {
      const src = home.length && (r() < 0.7 || !rest.length) ? home : rest;
      out.push(src.splice(Math.floor(r() * src.length), 1)[0].id);
    }
    // Uma das propostas costuma ser de um clube que briga lá em cima na liga dele (de divisão menor, se preciso)
    if (out.length && !out.some(id => ['subir', 'titulo', 'g4'].includes(S.coGoalFor(co, id).k))) {
      const fav = home.concat(rest).filter(x => ['subir', 'titulo', 'g4'].includes(S.coGoalFor(co, x.id).k));
      if (fav.length && r() < 0.7) out[out.length - 1] = fav[Math.floor(r() * fav.length)].id;
    }
    save();
    return out;
  };
  // Assina com um clube: o elenco dele vira o seu (sorteado na temporada)
  S.coSign = function (co, clubId) {
    S.applyLeagues(co);
    co.club = clubId;
    co.squad = genSquad(clubId, co.season).map(p => Object.assign(p, { id: 'p' + (co.pid++) }));
    co.sacked = false;
    co.since = co.season;
    const a = autoXI(co.squad, co.form);
    co.xi = a.xi; co.bench = a.bench;
    return co;
  };

  // ---------- temporada ----------
  // Meta da diretoria pelo tamanho do clube na liga
  const GOAL_TXT = { titulo: 'Ganhar a liga', subir: 'Subir de divisão', g4: 'Ficar entre os quatro', meio: 'Terminar na metade de cima', naocair: 'Não cair', digna: 'Fugir das últimas posições' };
  S.CO_GOAL_TXT = GOAL_TXT;
  function boardGoal(club, ids, lg) {
    // Posição esperada: conta quem é mais forte (empate de força, ±1, conta meio)
    const st = club.strength, oth = ids.filter(id => id !== club.id).map(id => D.CLUB_BY_ID[id].strength), n = ids.length;
    const exp = Math.round(1 + oth.filter(x => x > st + 1).length + 0.5 * oth.filter(x => Math.abs(x - st) <= 1).length);
    // A diretoria pede um pouco menos que o esperado (folga de 2 posições), menos para o favorito ao título
    if (lg.promo && exp <= lg.promo) return { k: 'subir', pos: lg.promo, exp };
    if (exp === 1 && !lg.promo) return { k: 'titulo', pos: 1, exp };
    if (exp <= 3) return { k: 'g4', pos: 4, exp };
    if (exp + 2 <= Math.ceil(n / 2)) return { k: 'meio', pos: Math.ceil(n / 2), exp };
    if (!lg.releg) return { k: 'digna', pos: n - 3, exp };
    return { k: 'naocair', pos: n - lg.releg, exp };
  }
  // A meta que a diretoria daria a um clube (para mostrar na proposta)
  S.coGoalFor = function (co, clubId) {
    S.applyLeagues(co);
    const club = D.CLUB_BY_ID[clubId], LD = D.LADDER[club.league] || {};
    return boardGoal(club, L().leagueTeams(club), { promo: LD.up ? LD.promo : 0, releg: LD.down ? LD.releg : 0 });
  };
  S.coStart = function (co) {
    S.applyLeagues(co);
    const club = D.CLUB_BY_ID[co.club], lg = D.LEAGUE_BY_ID[club.league], LD = D.LADDER[club.league] || {};
    const { r, save } = rngCo(co);
    const ids = L().leagueTeams(club), perm = ids.map((_, i) => i).sort(() => r() - 0.5);
    const sch = S._schedule(ids.length);
    const ss = co.ss = { season: co.season, club: club.id, i: 0, name: lg.name, ids, rounds: sch.map(rd => rd.map(([a, b]) => [perm[a], perm[b]])),
      tab: ids.map(() => ({ p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 })), promo: LD.up ? LD.promo : 0, releg: LD.down ? LD.releg : 0, log: [], done: false };
    co.board = { goal: boardGoal(club, ids, ss), conf: CO.conf0, ult: null };
    co.squad.forEach(p => { p.en = 100; p.out = 0; p.sus = 0; });
    co.subsLeft = CO.subs;
    save();
    return ss;
  };
  const order = tab => tab.map((t, i) => i).sort((a, b) => tab[b].p - tab[a].p || (tab[b].gp - tab[b].gc) - (tab[a].gp - tab[a].gc) || tab[b].gp - tab[a].gp);
  S.coTable = co => order(co.ss.tab).map(i => Object.assign({ id: co.ss.ids[i], me: co.ss.ids[i] === co.club }, co.ss.tab[i]));
  S.coPos = co => order(co.ss.tab).findIndex(i => co.ss.ids[i] === co.club) + 1;
  // Próximo jogo: o adversário, o mando e a rodada
  S.coNext = function (co) {
    const ss = co.ss;
    if (!ss || ss.done || ss.i >= ss.rounds.length) return null;
    const me = ss.ids.indexOf(co.club), g = ss.rounds[ss.i].find(([h, a]) => h === me || a === me);
    if (!g) return { round: ss.i + 1, of: ss.rounds.length, bye: true };
    const home = g[0] === me, vs = ss.ids[home ? g[1] : g[0]];
    return { round: ss.i + 1, of: ss.rounds.length, vs, home, ult: co.board.ult };
  };
  // Elenco do adversário pronto para o jogo (formação e titulares do auxiliar dele)
  function oppSide(co, vs) {
    const sq = genSquad(vs, co.season); sq.forEach(p => { p.en = CO.enOpp; });
    const form = bestForm(sq), a = autoXI(sq, form);
    return { club: vs, squad: sq, form, style: 'equilibrar', xi: a.xi, bench: a.bench, subs: CO.subs, red: 0 };
  }
  S.coOpp = (co, vs) => oppSide(co, vs);

  // ---------- partida minuto a minuto ----------
  // m = { min, gh, ga, home, us: lado, them: lado, ev: [lances], stop, done, half }
  S.coMatchStart = function (co) {
    const nx = S.coNext(co);
    if (!nx || nx.bye) return null;
    co.xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))).length === 11 ? co.xi : autoXI(co.squad, co.form).xi;
    const us = { club: co.club, squad: co.squad, form: co.form, style: co.style, xi: co.xi.slice(), bench: (co.bench || []).filter(id => co.squad.some(p => p.id === id && ok(p))), subs: CO.subs, red: 0, mine: true };
    const them = oppSide(co, nx.vs);
    if (!us.bench.length) us.bench = autoXI(co.squad, co.form).bench;
    return { min: 0, gh: 0, ga: 0, home: nx.home, us, them, ev: [], stop: null, done: false, half: false, vs: nx.vs, round: nx.round, played: {} };
  };
  const sideName = (m, s) => (s === m.us ? 'us' : 'them');
  // Avança até a próxima parada (gol, vermelho, lesão, intervalo) ou o fim. Volta a parada
  S.coMatchStep = function (co, m) {
    if (m.done) return null;
    const { r, save } = rngCo(co);
    let stop = null;
    while (!stop && m.min < 90) {
      m.min++;
      const H = m.home ? m.us : m.them, A = m.home ? m.them : m.us;
      const [lh, la] = lams(power(H.squad, H.form, H.xi, H.style, H.red), power(A.squad, A.form, A.xi, A.style, A.red));
      // Cansaço: quem está em campo perde energia aos poucos (o estilo de ataque cansa mais)
      [m.us, m.them].forEach(s => s.xi.forEach(id => { const p = id && s.squad.find(x => x.id === id); if (p) { p.en = Math.max(0, p.en - CO.enGame / 90 * (CO.styleFx[s.style] || CO.styleFx.equilibrar).en); if (s.mine) m.played[id] = (m.played[id] || 0) + 1; } }));
      if (r() < lh / 90) { m.gh++; const sc = scorer(r, H); m.ev.push({ m: m.min, t: 'gol', s: sideName(m, H), p: sc }); stop = { t: 'gol', s: sideName(m, H), p: sc }; }
      else if (r() < la / 90) { m.ga++; const sc = scorer(r, A); m.ev.push({ m: m.min, t: 'gol', s: sideName(m, A), p: sc }); stop = { t: 'gol', s: sideName(m, A), p: sc }; }
      // Vermelho e lesão (só os seus param o jogo; os do rival entram no relato)
      [m.us, m.them].forEach(s => {
        if (stop && stop.t !== 'gol') return;
        if (r() < CO.red / 90) { const k = r.int(1, s.xi.length - 1), id = s.xi[k]; if (!id) return; s.xi[k] = null; s.red++; const p = s.squad.find(x => x.id === id); if (p && s.mine) p.sus = 2; m.ev.push({ m: m.min, t: 'vermelho', s: sideName(m, s), p: p ? p.n : '' }); if (s.mine) stop = { t: 'vermelho', p: p && p.n }; }
        else if (r() < CO.inj * 11 / 90) { const k = r.int(0, s.xi.length - 1), id = s.xi[k], p = s.squad.find(x => x.id === id); if (!p) return; p.out = r.int(1, 6) + 1; m.ev.push({ m: m.min, t: 'lesao', s: sideName(m, s), p: p.n }); if (s.mine) stop = { t: 'lesao', p: p.n, id, k }; else autoSub(s, k); }
      });
      if (!stop && m.min === 45 && !m.half) { m.half = true; stop = { t: 'intervalo' }; }
      // O auxiliar do rival troca os cansados no segundo tempo
      if (m.min === 60 || m.min === 70 || m.min === 80) tiredSubs(m.them);
    }
    if (m.min >= 90 && !stop) { m.done = true; stop = { t: 'fim' }; }
    m.stop = stop;
    save();
    return stop;
  };
  function scorer(r, s) {
    const m = byId(s.squad), slots = slotsOf(s.form);
    const w = s.xi.map((id, i) => { const p = m[id]; if (!p) return 0; const sl = slots[i]; return (sl === 'ATA' ? 5 : sl === 'MEI' ? 2 : sl === 'GOL' ? 0 : 0.6) * (p.ovr / 70); });
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return m[s.xi[i]] ? m[s.xi[i]].n : ''; }
    return '';
  }
  function autoSub(s, k) {
    if (s.subs <= 0 || !s.bench.length) { s.xi[k] = null; return; }
    const sl = slotsOf(s.form)[k], m = byId(s.squad);
    const inn = s.bench.slice().sort((a, b) => m[b].ovr * fit(m[b].pos, sl) - m[a].ovr * fit(m[a].pos, sl))[0];
    s.bench = s.bench.filter(x => x !== inn); s.xi[k] = inn; s.subs--;
  }
  // Troca o cansado só se quem está no banco rende mais naquela vaga agora
  function tiredSubs(s) {
    const m = byId(s.squad), slots = slotsOf(s.form);
    s.xi.forEach((id, k) => {
      const p = m[id]; if (!p || k === 0 || s.subs <= 0 || !s.bench.length) return;
      const best = Math.max.apply(null, s.bench.map(b => eff(m[b], slots[k])));
      if (best > eff(p, slots[k]) * 1.01) autoSub(s, k);
    });
  }
  // Troca (na parada): sai um titular, entra um do banco na mesma vaga
  S.coSub = function (co, m, outId, inId) {
    const s = m.us, k = s.xi.indexOf(outId);
    if (s.subs <= 0 || k < 0 || !s.bench.includes(inId)) return false;
    s.xi[k] = inId; s.bench = s.bench.filter(x => x !== inId); s.subs--;
    s.gone = (s.gone || []).concat([outId]);
    return true;
  };
  // Muda formação ou estilo no meio do jogo: os mesmos jogadores redistribuídos pelo auxiliar nas vagas novas
  S.coMatchTactic = function (co, m, form, style) {
    const s = m.us;
    if (style && CO.styleFx[style]) s.style = style;
    if (form && FORMS[form] && form !== s.form) {
      const on = s.squad.filter(p => s.xi.includes(p.id)), a = autoXI(on, form);
      s.form = form; s.xi = a.xi.filter(Boolean);
    }
    return true;
  };
  // O auxiliar troca quem caiu (lesão) e os muito cansados: o que o robô e o "resumir" usam
  S.coAutoStop = function (co, m) {
    const s = m.us, st = m.stop;
    if (st && st.t === 'lesao') { const k = s.xi.indexOf(st.id); if (k >= 0) autoSub(s, k); }
    if (m.min >= 60) tiredSubs(s);
  };
  // Joga o resto do jogo sem parar (o auxiliar decide nas paradas)
  S.coMatchRest = function (co, m) { while (!m.done) { S.coMatchStep(co, m); S.coAutoStop(co, m); } return m; };
  // Fim do jogo: tabela, os outros jogos da rodada, energia, moral, lesões e suspensões, diretoria
  S.coMatchEnd = function (co, m) {
    const ss = co.ss, me = ss.ids.indexOf(co.club), vi = ss.ids.indexOf(m.vs);
    const [hi, ai] = m.home ? [me, vi] : [vi, me];
    addTab(ss.tab, hi, ai, m.gh, m.ga);
    const gf = m.home ? m.gh : m.ga, ga = m.home ? m.ga : m.gh, res = gf > ga ? 'v' : gf < ga ? 'd' : 'e';
    roundRest(co, [me, vi]);
    // Elenco: quem jogou cansa, quem não jogou descansa; moral pelo resultado e por jogar ou não
    const motiv = co.xp.motiv * 0.06;
    co.squad.forEach(p => {
      const pl = m.played[p.id] || 0;
      p.en = Math.min(100, p.en + (pl ? CO.enRest : CO.enOff));
      // Moral volta aos poucos para 60; vitória sobe, derrota desce (a motivação do técnico segura a queda)
      p.mo += (60 - p.mo) * 0.12;
      if (pl) p.mo = clamp(p.mo + (res === 'v' ? 5 : res === 'd' ? -5 * (1 - motiv) : 0.5), 0, 100);
      else if (p.ovr >= teamAvg(co) - 2) p.mo = clamp(p.mo - 2 * (1 - motiv), 0, 100);
    });
    // Lesão e vermelho já contam o jogo de hoje (out = n + 1, sus = 2): desconta 1 de todos
    co.squad.forEach(p => { if (p.out) p.out--; if (p.sus) p.sus--; });
    const log = { r: m.round, vs: m.vs, home: m.home, gf, ga, res, ev: m.ev.filter(e => e.t === 'gol' && e.s === 'us').map(e => e.p) };
    ss.log.push(log);
    board(co, log);
    ss.i++;
    if (!co.sacked) { co.xi = co.xi.filter(id => co.squad.some(p => p.id === id && ok(p))); if (co.xi.length < 11 || co.autoXI) { const a = autoXI(co.squad, co.form); co.xi = a.xi; co.bench = a.bench; } else co.bench = co.squad.filter(p => ok(p) && !co.xi.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id); }
    if (ss.i >= ss.rounds.length) ss.done = true;
    return log;
  };
  const teamAvg = co => { const s = co.squad.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11); return s.reduce((a, p) => a + p.ovr, 0) / Math.max(1, s.length); };
  S.coTeamAvg = teamAvg;
  function addTab(tab, h, a, gh, ga) {
    const H = tab[h], A = tab[a];
    H.j++; A.j++; H.gp += gh; H.gc += ga; A.gp += ga; A.gc += gh;
    if (gh > ga) { H.v++; H.p += 3; A.d++; } else if (gh < ga) { A.v++; A.p += 3; H.d++; } else { H.e++; A.e++; H.p++; A.p++; }
  }
  // Os outros jogos da rodada pela força dos clubes
  function roundRest(co, skip) {
    const ss = co.ss, { r, save } = rngCo(co), str = id => D.CLUB_BY_ID[id].strength;
    ss.rounds[ss.i].forEach(([h, a]) => {
      if (skip.includes(h) && skip.includes(a)) return;
      if (skip.includes(h) || skip.includes(a)) return;
      const g = L().simple(r, h, a, str(ss.ids[h]), str(ss.ids[a]));
      addTab(ss.tab, h, a, g.gh, g.ga);
    });
    save();
  }
  // Rodada sem você (folga ou depois da demissão)
  S.coSkipRound = function (co) { const ss = co.ss; roundRest(co, []); ss.i++; if (ss.i >= ss.rounds.length) ss.done = true; };

  // ---------- diretoria ----------
  // Confiança escondida (aparece no tom do presidente): sobe e desce com o resultado contra o esperado e com a tabela
  function board(co, log) {
    const B = co.board, ss = co.ss, club = D.CLUB_BY_ID[co.club];
    // Pontos esperados no jogo: CO.ppg é o que o robô faz contra um igual; força do elenco contra a do rival e o mando mexem
    const opp = D.CLUB_BY_ID[log.vs].strength, d = teamAvg(co) - 1.5 - opp;
    const exp = clamp(CO.ppg + d / 14 + (log.home ? 0.25 : -0.25), 0.4, 2.5);
    const pts = log.res === 'v' ? 3 : log.res === 'e' ? 1 : 0;
    B.conf = clamp(B.conf + (pts - exp) * CO.confK, 0, 100);
    // Na metade final da liga, a posição pesa
    if (ss.i >= ss.rounds.length / 2) { const pos = S.coPos(co); B.conf = clamp(B.conf + (pos <= B.goal.pos ? 0.8 : -Math.min(2.5, (pos - B.goal.pos) * 0.4)), 0, 100); }
    void club;
    if (B.ult) {
      B.ult.n++; if (pts === 3) B.ult.got++;
      if (B.ult.got >= CO.ultNeed) { B.ult = null; B.conf = 45; B.passed = (B.passed || 0) + 1; }
      else if (B.ult.n >= CO.ultN) { co.sacked = true; B.ult = null; }
    } else if (B.conf < CO.ultAt && ss.i + 1 >= CO.ultMin && ss.rounds.length - ss.i > CO.ultN) {
      B.ult = { n: 0, got: 0, need: CO.ultNeed, of: CO.ultN };
    }
  }
  // Tom do presidente pela confiança (a confiança não aparece em número)
  S.coMood = co => { const c = co.board ? co.board.conf : 60; return c >= 70 ? 'feliz' : c >= 45 ? 'tranquilo' : c >= CO.ultAt ? 'preocupado' : 'no limite'; };

  // ---------- fim da temporada ----------
  // Divisões (sobe e cai na sua liga), fama, experiência, evolução do elenco, contratos, garotos da base
  S.coSeasonEnd = function (co) {
    const ss = co.ss;
    while (!ss.done) S.coSkipRound(co);
    const ord = order(ss.tab), pos = ord.findIndex(i => ss.ids[i] === co.club) + 1, n = ss.ids.length, B = co.board;
    const champ = ss.ids[ord[0]], won = champ === co.club && !co.sacked;
    const met = !co.sacked && pos <= B.goal.pos;
    const up = ss.promo && pos <= ss.promo, down = ss.releg && pos > n - ss.releg;
    // Fama: título, meta, campanha acima do esperado; cai com rebaixamento e demissão
    const f0 = co.fame;
    let df = (won ? 10 : 0) + (met ? 5 : -2) + clamp(B.goal.exp - pos, -4, 6) * 0.8 + (up ? 4 : 0) - (down ? 8 : 0) - (co.sacked ? 10 : 0);
    co.fame = clamp(Math.round(co.fame + df), 0, 100);
    // Experiência: um ponto por temporada, dois por título, um pela meta
    const gx = (co.sacked ? 0 : 1) + (won ? 2 : 0) + (met ? 1 : 0);
    co.xp.pts += gx;
    if (won) co.titles.push({ s: co.season, name: ss.name, club: co.club });
    const out = { season: co.season, club: co.club, league: ss.name, pos, n, goal: B.goal, met, won, up: !!up, down: !!down, sacked: !!co.sacked, fame: [f0, co.fame], xp: gx, log: ss.log.slice() };
    co.hist.push({ s: co.season, club: co.club, league: ss.name, pos, n, goal: B.goal.k, met, won, up: !!up, down: !!down, sacked: !!co.sacked });
    // Divisões da carreira: os de cima e de baixo trocam com a sua liga
    moveLeagues(co, ss, ord);
    // Elenco: idade, evolução, aposentadoria, contratos, base
    const { r, save } = rngCo(co);
    if (!co.sacked) {
      co.squad.forEach(p => {
        p.age++;
        const g = p.age <= 21 ? r.int(1, 4) : p.age <= 26 ? r.int(0, 2) : p.age <= 30 ? r.int(-1, 1) : p.age <= 33 ? r.int(-3, 0) : r.int(-5, -1);
        p.ovr = clamp(p.ovr + (g > 0 ? Math.min(g, Math.max(0, p.pot - p.ovr)) : g), 30, 95);
        p.ct--; p.mo = 60; p.en = 100;
      });
      out.left = co.squad.filter(p => p.age >= 37 || (p.age >= 34 && r() < 0.35) || p.ct <= 0).map(p => ({ n: p.n, why: p.ct <= 0 && p.age < 34 ? 'fim de contrato' : 'aposentou' }));
      // v1 (sem mercado ainda): quem é titular e acaba o contrato renova por 2 anos; os outros saem
      const core = new Set(autoXI(co.squad, co.form).xi);
      co.squad.forEach(p => { if (p.ct <= 0 && core.has(p.id) && p.age < 34) { p.ct = 2; p.wage = wageOf(p.ovr); } });
      out.left = out.left.filter(x => !co.squad.some(p => p.n === x.n && p.ct > 0 && p.age < 34));
      co.squad = co.squad.filter(p => p.ct > 0 && !(p.age >= 37) && !out.left.some(x => x.n === p.n));
      // Base: 1 ou 2 garotos; e reposição do clube para o elenco não ficar curto
      const club = D.CLUB_BY_ID[co.club], cty = D.countryOf(club);
      const kids = [];
      for (let k = 0; k < (r() < 0.5 ? 2 : 1); k++) { const pos = r.pick(['ZAG', 'LAT', 'MEI', 'MEI', 'ATA', 'ATA', 'GOL']); const p = mkPlayer(r, club, pos, club.strength - 12 + r.gauss() * 3, 17, 'p' + (co.pid++), cty); p.pot = Math.min(95, p.pot + r.int(0, 8)); co.squad.push(p); kids.push(p.n); }
      out.kids = kids;
      Object.keys(CO.squad).forEach(pos => {
        while (co.squad.filter(p => p.pos === pos).length < CO.squad[pos] - 1) co.squad.push(mkPlayer(r, club, pos, club.strength - 4 + r.gauss() * 3, r.int(21, 29), 'p' + (co.pid++), cty));
      });
    }
    save();
    co.season++;
    co.ss = null;
    S.applyLeagues(co);
    out.offers = co.sacked ? S.coOffers(co) : null;
    if (co.sacked) { co.club = null; co.squad = []; }
    co.last = out;
    return out;
  };
  // Experiência: um ponto numa habilidade (leitura de jogo, motivação, negociação), até 10 em cada
  S.CO_SKILLS = { leitura: 'Leitura de jogo', motiv: 'Motivação', negoc: 'Negociação' };
  S.coSkill = function (co, k) {
    if (!S.CO_SKILLS[k] || co.xp.pts <= 0 || co.xp[k] >= CO.skillMax) return false;
    co.xp.pts--; co.xp[k]++;
    return true;
  };
  function moveLeagues(co, ss, ord) {
    const club = D.CLUB_BY_ID[co.club], from = club.league, LD = D.LADDER[from] || {};
    co.leagueOf = co.leagueOf || {};
    const ids = ord.map(i => ss.ids[i]).filter(id => D.CLUB_BY_ID[id].league === from);
    const swap = (list, to, other) => {
      const pool = D.CLUBS.filter(x => x.league === to).sort((a, b) => (other === 'up' ? a.strength - b.strength : b.strength - a.strength));
      list.forEach((id, k) => { const p = pool[k]; if (!p) return; co.leagueOf[id] = to; co.leagueOf[p.id] = from; });
    };
    if (LD.up && ss.promo) swap(ids.slice(0, ss.promo), LD.up, 'up');
    if (LD.down && ss.releg) swap(ids.slice(-ss.releg), LD.down, 'down');
  }
  // Diz se a carreira já tem clube e temporada em andamento
  S.coState = co => (!co.club ? 'sem-clube' : !co.ss ? 'pre' : co.ss.done ? 'fim' : 'jogo');

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
