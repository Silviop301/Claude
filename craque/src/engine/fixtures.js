// Carreira Completa: a temporada de liga jogo a jogo. Monta o calendário (turno e returno, todos contra todos) e os
// placares de todos os jogos de um jeito que a tabela final bate com a da temporada já simulada (res.table): o
// equilíbrio continua o do motor, aqui só se conta como a liga chegou lá. Seus números na liga (jogos, gols,
// assistências, nota) também são repartidos rodada a rodada. Sorteio próprio (não mexe no da carreira).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  // Turno pelo método do círculo; o returno repete com o mando trocado
  function schedule(n) {
    const t = [...Array(n).keys()], half = [];
    for (let r = 0; r < n - 1; r++) {
      const rd = [];
      for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; rd.push(r % 2 ? [b, a] : [a, b]); }
      half.push(rd);
      t.splice(1, 0, t.pop());
    }
    return half.concat(half.map(rd => rd.map(([a, b]) => [b, a])));
  }

  // Placar com o resultado pedido (3 vitória do mandante, 1 empate, 0 derrota), gols pela força
  function score(r, out, sh, sa) {
    const g = lam => { let k = 0, p = Math.exp(-lam), s = p, u = r(); while (u > s && k < 7) { k++; p *= lam / k; s += p; } return k; };
    const lh = 1.35 + (sh - sa) / 40, la = 1.05 + (sa - sh) / 40;
    if (out === 1) { const x = g((lh + la) / 2.4); return [x, x]; }
    const w = 1 + g(Math.max(0.4, out === 3 ? lh : la) * 0.8), l = Math.min(w - 1, g(Math.max(0.3, out === 3 ? la : lh) * 0.6));
    return out === 3 ? [w, l] : [l, w];
  }

  // res: a temporada já jogada (S.playSeason). Volta { ids, rounds: [[{h, a, gh, ga}]], table (por rodada), me }
  S.fullSeason = function (c, res) {
    const tb = res.table;
    if (!tb || !tb.ids || tb.ids.length < 4) return null;
    const r = S.rng(((Number(c.tseed) || 1) * 7919 + (res.season || 0) * 31 + 17) >>> 0);
    // Times sem nome (completam as ligas com menos de 20): clubes da divisão de baixo (ou de cima) do mesmo país que
    // não estão na tabela; se faltar, um id negativo que a tela mostra como "Time N"
    const LD = D.LADDER[(D.CLUB_BY_ID[res.club] || {}).league] || {};
    const spare = D.CLUBS.filter(x => (x.league === LD.down || x.league === LD.up) && !tb.ids.includes(x.id) && x.id !== res.club)
      .sort((x, y) => (x.league === LD.down ? 0 : 1) - (y.league === LD.down ? 0 : 1) || y.strength - x.strength);
    const ids = tb.ids.map((id, i) => id || (spare.length ? spare.shift().id : -(i + 1)));
    let n = ids.length;
    const target = tb.all.slice();
    if (n % 2) { ids.push(null); target.push(0); n++; } // número ímpar: um time folga a cada rodada
    const str = ids.map(id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].strength : 55));
    const me = ids.indexOf(res.club);
    const M = res.moment && res.moment.vs ? res.moment : null, mv = M ? ids.indexOf(M.vs) : -1;
    // Calendário com os times embaralhados; o jogo do lance decisivo de título/acesso vai para a última rodada
    const perm = ids.map((_, i) => i).sort(() => r() - 0.5);
    let rounds = schedule(n).map(rd => rd.map(([a, b]) => [perm[a], perm[b]]));
    const last = M && (M.type === 'title' || M.type === 'acesso') && mv >= 0;
    if (last) {
      const k = rounds.findIndex((rd, i) => i >= rounds.length / 2 && rd.some(([a, b]) => (a === me && b === mv) || (a === mv && b === me)));
      if (k >= 0) rounds.push(rounds.splice(k, 1)[0]);
    }
    const games = [];
    rounds.forEach((rd, ri) => rd.forEach(([a, b]) => { if (ids[a] !== null && ids[b] !== null) games.push({ ri, a, b }); }));
    // Jogo que o lance decidiu: resultado fixo (ganhou se converteu; senão empate no título, derrota no resto)
    let fixed = null;
    if (M && mv >= 0) {
      const cand = games.filter(g => (g.a === me && g.b === mv) || (g.a === mv && g.b === me));
      fixed = last ? cand[cand.length - 1] : cand[0];
      if (fixed) { const meWin = M.ok, meOut = meWin ? 3 : M.type === 'title' ? 1 : 0; fixed.out = fixed.a === me ? meOut : meOut === 3 ? 0 : meOut === 0 ? 3 : 1; }
    }
    // Primeiro pela força; depois troca resultados até cada time chegar nos pontos da tabela
    const pts = new Array(n).fill(0);
    const give = (g, s) => { const ph = g.out === 3 ? 3 : g.out === 1 ? 1 : 0, pa = g.out === 3 ? 0 : g.out === 1 ? 1 : 3; pts[g.a] += s * ph; pts[g.b] += s * pa; };
    games.forEach(g => {
      if (g.out === undefined) { const d = (str[g.a] - str[g.b] + 3) / 25, u = r(); g.out = u < 0.36 + d * 0.5 ? 3 : u < 0.62 + d * 0.3 ? 1 : 0; }
      give(g, 1);
    });
    // Peso maior para você, seus vizinhos de tabela e os dois primeiros: se sobrar diferença, ela cai nos outros
    const pos0 = tb.pos - 1, wt = ids.map((_, i) => (i === me || i <= 1 || Math.abs(i - pos0) <= 1 ? 25 : 1));
    const err = () => pts.reduce((s, p, i) => s + wt[i] * (p - target[i]) ** 2, 0);
    let e = err();
    // Recozimento: aceita piorar um pouco no começo, para sair dos becos de 1 ponto (mudar um jogo mexe em dois times)
    const IT = 40000;
    // Sua posição e o campeão precisam ser os do motor; se não forem, a busca roda mais ciclos
    const okOrder = () => { const o = pts.map((p, i) => [p, i]).filter(x => ids[x[1]] !== null).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
      return o[0][1] === 0 && o.findIndex(x => x[1] === me) === pos0; };
    for (let it = 0; it < IT * 12 && (e > 0 && (it < IT * 4 || !okOrder())); it++) {
      const g = games[Math.floor(r() * games.length)];
      if (g === fixed) continue;
      const old = g.out, nw = [3, 1, 0].filter(x => x !== old)[Math.floor(r() * 2)];
      give(g, -1); g.out = nw; give(g, 1);
      const e2 = err(), T = 4 * (1 - (it % IT) / IT) + 0.01; // quatro ciclos esquentando de novo
      if (e2 <= e || r() < Math.exp((e - e2) / T)) e = e2; else { give(g, -1); g.out = old; give(g, 1); }
    }
    games.forEach(g => { [g.gh, g.ga] = score(r, g.out, str[g.a], str[g.b]); });

    // Seus jogos na liga: quantos jogou (parte dos jogos da temporada) e em quais rodadas
    const myGames = games.filter(g => g.a === me || g.b === me);
    const share = res.src && res.src.max ? Math.min(1, res.games / res.src.max) : 1;
    const nPlayed = Math.min(myGames.length, Math.round(myGames.length * share));
    const order = myGames.map((g, i) => [i < 3 && c.age <= 17 ? r() + 1 : r(), i]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    const played = new Set(order.slice(0, nPlayed));
    if (fixed) played.add(myGames.indexOf(fixed));
    // Gols e assistências da liga: a parte da temporada que cabe nos jogos de liga
    const lgShare = res.games ? Math.min(1, played.size / Math.max(1, res.games)) : 0;
    let goals = Math.round((res.goals || 0) * lgShare), assists = Math.round((res.assists || 0) * lgShare);
    const line = myGames.map((g, i) => ({ g, on: played.has(i), goals: 0, assists: 0, rating: 0 }));
    const ons = line.filter(x => x.on);
    const myGf = x => (x.g.a === me ? x.g.gh : x.g.ga);
    const bump = x => { if (x.g.a === me) x.g.gh++; else x.g.ga++; }; // gol a mais do seu time não muda o resultado quando ele já vence
    for (let k = 0; k < goals && ons.length; k++) {
      const pool = ons.filter(x => myGf(x) > x.goals + x.assists);
      const x = pool.length ? pool[Math.floor(r() * pool.length)] : ons[Math.floor(r() * ons.length)];
      if (myGf(x) <= x.goals + x.assists) { if (x.g.out === (x.g.a === me ? 3 : 0)) bump(x); else continue; }
      x.goals++;
    }
    for (let k = 0; k < assists && ons.length; k++) {
      const pool = ons.filter(x => myGf(x) > x.goals + x.assists);
      if (!pool.length) break;
      pool[Math.floor(r() * pool.length)].assists++;
    }
    // Lance decisivo convertido: o gol do jogo é seu
    if (fixed && M.ok && (c.pos === 'ATA' || c.pos === 'MEI')) { const x = line.find(y => y.g === fixed); if (x && !x.goals && myGf(x) > x.assists) x.goals = 1; }
    // Nota por jogo em volta da média do ano (gol e vitória puxam para cima)
    if (ons.length) {
      ons.forEach(x => { const res3 = x.g.a === me ? x.g.out : x.g.out === 3 ? 0 : x.g.out === 0 ? 3 : 1; x.rating = res.rating + (r() - 0.5) * 1.2 + x.goals * 0.5 + x.assists * 0.25 + (res3 === 3 ? 0.2 : res3 === 0 ? -0.3 : 0); });
      const avg = ons.reduce((s, x) => s + x.rating, 0) / ons.length;
      ons.forEach(x => { x.rating = Math.max(4.5, Math.min(10, Math.round((x.rating - avg + res.rating) * 10) / 10)); });
    }
    // Minuto de cada gol (para a rodada ao vivo): 91+ são os acréscimos. No seu jogo, quais gols são seus e em quais
    // você deu a assistência; o lance decisivo convertido vira o gol do fim do jogo
    const minute = () => (r() < 0.07 ? 91 + Math.floor(r() * 5) : 1 + Math.floor(r() * 90));
    games.forEach(g => {
      g.ev = [];
      for (let i = 0; i < g.gh; i++) g.ev.push({ m: minute(), s: 'h' });
      for (let i = 0; i < g.ga; i++) g.ev.push({ m: minute(), s: 'a' });
      g.ev.sort((x, y) => x.m - y.m);
    });
    line.forEach(x => {
      if (!x.on) return;
      const mine = x.g.ev.filter(e => e.s === (x.g.a === me ? 'h' : 'a'));
      const pick = mine.map(e => [r(), e]).sort((a, b) => a[0] - b[0]).map(y => y[1]);
      pick.slice(0, x.goals).forEach(e => { e.me = 1; });
      pick.slice(x.goals, x.goals + x.assists).forEach(e => { e.as = 1; });
      // O gol da vitória no jogo do lance decisivo sai no fim
      if (x.g === fixed && M.ok && mine.length) { const last = mine[mine.length - 1]; if (last.m < 80) last.m = 84 + Math.floor(r() * 10); x.g.ev.sort((a, b) => a.m - b.m); }
    });

    // Tabela rodada a rodada (pontos, jogos, vitórias, saldo)
    const row = () => ids.map((id, i) => ({ i, id, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
    const cur = row(), frames = [];
    const byRound = rounds.map(() => []);
    games.forEach(g => byRound[g.ri].push(g));
    byRound.forEach(rg => {
      rg.forEach(g => {
        const A = cur[g.a], B = cur[g.b];
        A.j++; B.j++; A.gp += g.gh; A.gc += g.ga; B.gp += g.ga; B.gc += g.gh;
        if (g.gh > g.ga) { A.p += 3; A.v++; B.d++; } else if (g.gh < g.ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
      });
      frames.push(cur.filter(x => x.id !== null).map(x => Object.assign({}, x)));
    });
    // Ordem final: pontos, vitórias, saldo; empate total segue a ordem da temporada (a posição do motor vale)
    const sortRows = rows => rows.slice().sort((x, y) => y.p - x.p || x.i - y.i); // empate em pontos: vale a ordem do motor
    const ord = sortRows(frames[frames.length - 1]);
    const exact = e === 0;
    return {
      ids, me, exact, rounds: byRound.map(rg => rg.map(g => ({ h: g.a, a: g.b, gh: g.gh, ga: g.ga, ev: g.ev }))), frames, sortRows,
      final: ord,
      mine: line.map(x => ({ ri: x.g.ri, home: x.g.a === me, vs: x.g.a === me ? x.g.b : x.g.a, gf: myGf(x), ga: x.g.a === me ? x.g.ga : x.g.gh,
        on: x.on, goals: x.goals, assists: x.assists, rating: x.rating, decisive: x.g === fixed, ev: x.g.ev })),
      pos: tb.pos, promo: tb.promo, releg: tb.releg, league: tb.league,
    };
  };

  S._schedule = schedule; // também para a Carreira Completa integrada (engine/fullcareer.js)
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
