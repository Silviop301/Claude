// Jogo a Jogo, mercado (plano, fase 4): a janela do meio da temporada e a troca de clube no meio do ano.
// No meio do calendário a janela fica aberta por duas datas. Quem está bem (ou sobrando no banco) recebe propostas;
// assinar leva você para o clube novo na hora: a liga nova começa na rodada em que está (as de antes são jogadas sem
// você), a copa e o continental ficam com o clube de antes (você não pode jogar por dois clubes no mesmo torneio)
// e o clube de antes segue sem você. Sorteio próprio (c.fc.seed), como o resto da temporada.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;
  const L = () => S._.fcLib;
  const on = c => c && c.mode === 'completa' && c.fc && !c.fc.done && c.fc.season === c.season;
  const say = (c, id, t, v) => (S._.phPost ? S._.phPost(c, id, t, v) : null);

  // at: onde abre (fração do calendário); len: quantas datas fica aberta; chances de proposta
  const WIN = { at: 0.5, len: 2, base: 0.02, perf: 0.2, gap: 120, top: 0.25, bench: 0.35, money: 0.06, max: 2 };
  S.FC_WIN = WIN;
  const winAt = fc => (fc.mwAt !== undefined ? fc.mwAt : (fc.mwAt = Math.max(2, Math.round(WIN.at * fc.cal.length))));
  // Quem pode receber proposta no meio do ano: maior de idade, sem empréstimo, sem despedida
  // e que não acabou de chegar (o clube não vende quem contratou nesta janela de fim de ano)
  const can = c => c.age >= 18 && !c.loan && !c.farewell && !!c.club && c.clubSince !== c.age;

  // As propostas da janela: clube maior para quem está jogando bem; clube onde jogaria para quem está no banco;
  // às vezes o dinheiro (liga rica) para o veterano
  function build(c, fc) {
    const { r, save } = L().rngOf(fc), A = fc.acc, cur = D.CLUB_BY_ID[c.club], o = S.ovr(c);
    const rt = A.games >= 4 ? A.rsum / A.games : 6.6, share = A.slots ? A.games / A.slots : 0.5;
    const used = new Set([c.club]), out = [];
    const pick = f => { const pool = D.CLUBS.filter(x => !used.has(x.id) && f(x)); if (!pool.length) return null; const cl = r.pick(pool); used.add(cl.id); return cl; };
    const add = (cl, kind) => { if (cl && out.length < WIN.max) out.push(Object.assign(S.offerFor(c, cl.id, kind), { mid: true })); };
    const pUp = clamp(WIN.base + (rt - 6.8) * WIN.perf + Math.max(0, o - cur.strength) / WIN.gap, 0.02, WIN.top);
    if (r() < pUp) add(pick(x => x.strength > cur.strength + 2 && x.strength <= o + 5), 'up');
    if (share < 0.4 && r() < WIN.bench) add(pick(x => x.strength < cur.strength && x.strength >= o - 10 && S.role(c, x).share >= 0.6), 'mid');
    if (c.age >= 27 && r() < WIN.money) add(pick(x => D.MONEY.includes(x.league) && x.strength >= o - 12), 'money');
    save();
    return out;
  }
  // A janela de agora (ou null): cria as propostas ao abrir e fecha sozinha quando passa
  S.fcWinState = function (c) {
    if (!on(c) || !can(c) && !(c.fc.mw)) return null;
    const fc = c.fc, at = winAt(fc);
    if (!fc.mw && fc.i >= at && fc.i < at + WIN.len && can(c)) {
      fc.mw = { at, s: c.season, offers: build(c, fc), st: 'open' };
      const of = fc.mw.offers;
      if (of.length && c.ppl) say(c, 'emp', of.length > 1 ? 'Janela aberta e o telefone tocou: {a} e {b} querem você agora. Olha no app Mercado.' : 'Janela aberta: {a} quer você agora, no meio da temporada. Olha no app Mercado.',
        { a: D.O(D.CLUB_BY_ID[of[0].club].name), b: of[1] ? D.o(D.CLUB_BY_ID[of[1].club].name) : '' });
    }
    const w = fc.mw;
    if (w && w.st === 'open' && fc.i >= w.at + WIN.len) w.st = 'closed';
    return w || null;
  };
  S.fcWin = c => { const w = S.fcWinState(c); return w && w.st === 'open' ? w : null; };
  S.fcWinLeft = c => { const w = S.fcWin(c); return w ? w.at + WIN.len - c.fc.i : 0; };
  S.fcWinStay = function (c) { const w = S.fcWin(c); if (!w) return false; w.st = 'closed'; w.stay = true; return true; };
  S.fcWinSign = function (c, k) {
    const w = S.fcWin(c), of = w && w.offers[k];
    if (!of) return null;
    const mv = S.fcMove(c, of);
    if (mv) { w.st = 'signed'; w.signed = k; }
    return mv;
  };

  // ---------- a troca de clube no meio do ano ----------
  // Monta a liga do clube novo, joga sem você as rodadas que já passaram e põe as que faltam nas datas de liga que
  // restam no calendário. Os números do ano seguem somando (a passagem de antes fica com o que foi feito lá: fc.pre).
  S.fcMove = function (c, offer) {
    if (!on(c) || !offer || offer.club === c.club || !D.CLUB_BY_ID[offer.club]) return null;
    const fc = c.fc, A = fc.acc, from = c.club, lib = L();
    fc.pre = { club: from, games: A.games, goals: A.goals, assists: A.assists, cs: A.cs };
    // Palpites ainda abertos eram da liga de antes: o dinheiro volta
    let back = (fc.bets || []).reduce((s, t) => s + (t.stake || 0), 0) + (fc.bet ? fc.bet.stake || 0 : 0);
    fc.bets = []; fc.bet = null;
    if (back > 0) { if (S.fcCredit) S.fcCredit(c, back); else c.money = (c.money || 0) + back; }
    if (fc.fix && fc.fix.i >= fc.i) fc.fix = null;
    // O clube de antes: onde estava quando você saiu
    const o0 = lib.order(fc.lg.tab);
    fc.lg0 = { club: from, name: fc.lg.name, pos: o0.indexOf(0) + 1, n: fc.lg.ids.length, pts: fc.lg.tab[0].p };
    S.join(c, offer);
    c.fansBy[from] = Math.max(0, (c.fansBy[from] || 0) - 10); // sair no meio do ano: a torcida de lá lembra
    const club = D.CLUB_BY_ID[c.club], lgD = D.LEAGUE_BY_ID[club.league], LD = D.LADDER[club.league];
    const { r, save } = lib.rngOf(fc);
    const teams = lib.leagueTeams(club), perm = teams.map((_, i) => i).sort(() => r() - 0.5), sch = S._schedule(teams.length);
    const lg = { name: lgD.name, ids: teams, rounds: sch.map(rd => rd.map(([a, b]) => [perm[a], perm[b]])), tab: teams.map(() => ({ p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 })),
      promo: LD && LD.up ? LD.promo : 0, releg: LD && LD.down ? LD.releg : 0 };
    const R = lg.rounds.length;
    // Datas de liga que restam: a liga nova ocupa as últimas (sobrando datas, as primeiras viram folga e saem)
    const fut = [];
    for (let k = fc.i; k < fc.cal.length; k++) if (fc.cal[k].k === 'lg') fut.push(k);
    const rem = Math.min(R, fut.length), ri0 = R - rem, drop = new Set(fut.slice(0, fut.length - rem));
    for (let ri = 0; ri < ri0; ri++) lg.rounds[ri].forEach(([a, b]) => { const g = lib.simple(r, teams[a], teams[b], lib.str(teams[a]), lib.str(teams[b])); lib.addTab(lg.tab, a, b, g.gh, g.ga); });
    let n = ri0;
    fc.cal = fc.cal.map((e, k) => (k < fc.i || e.k !== 'lg' ? e : drop.has(k) ? null : { k: 'lg', ri: n++ })).filter(Boolean);
    fc.lg = lg;
    // Copa e continental: ficam com o clube de antes (o calendário pula as datas)
    if (!fc.cup.out) fc.cup.out = 'moved';
    if (fc.cont && !fc.cont.out) fc.cont.out = 'moved';
    fc.evAt = (fc.evAt || []).map(x => Math.min(x, fc.cal.length - 1));
    if (fc.mwAt !== undefined) fc.mwAt = Math.min(fc.mwAt, fc.cal.length);
    fc.pending = null; fc.derbyDone = false; fc.club = c.club;
    fc.moved = { from, to: c.club, at: fc.i, ri0, kind: offer.kind, wage: offer.wage };
    save();
    if (c.ppl) {
      say(c, 'emp', 'Assinado! Bem-vindo {a}. A liga lá está na rodada {n}: você estreia já.', { a: D.ao(club.name), n: ri0 + 1 });
      if (S._.phNews && S.FC_NEWS) {
        S.FC_NEWS['janela.troca'] = { j: 'Reforço no meio da temporada: {me} assina com ' + D.o(club.name), x: 'o {me} trocou de clube no meio do campeonato?? quero ver estrear já com a camisa ' + D.do(club.name) + ' kkkk' };
        S._.phNews(c, 'janela.troca');
      }
    }
    return fc.moved;
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
