// Interface — Carreira Completa: a temporada de liga rodada a rodada (seu jogo, os outros resultados e a tabela
// inteira) antes do resumo da temporada. O calendário e os placares vêm de S.fullSeason (engine/fixtures.js).
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, sfx, $, esc, club, crest, year, save, render } = U;

  const nameOf = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].name : 'Time ' + Math.abs(id));
  const rate = r => r.toFixed(1).replace('.', ',');

  // Volta false quando a liga não tem tabela (o resumo segue sozinho)
  function fullSeason(res, done) {
    const F = S.fullSeason(G.c, res);
    if (!F) return false;
    // A tabela do resumo passa a ser a que se viu jogo a jogo (mesma posição e mesmo campeão; o resto bate com os jogos)
    const fin = F.final, tb = res.table;
    tb.ids = fin.map(x => (x.id && D.CLUB_BY_ID[x.id] ? x.id : 0)); tb.all = fin.map(x => x.p);
    tb.pts = tb.all[tb.pos - 1]; tb.lead = Math.max(1, tb.all[0] - tb.all[1]); if (tb.gap) tb.gap = Math.max(1, tb.all[0] - tb.all[tb.pos - 1]);
    save();

    const R = F.rounds.length, me = F.me, myId = F.ids[me];
    const n = F.final.length;
    let k = 0; // rodadas já jogadas
    render(
      '<div class="fs">' +
        '<div class="fs-main">' +
          '<div class="eyebrow">' + esc(F.league) + ' · ' + (year() - 1) + '</div><h2 id="fs-h"></h2>' +
          '<div class="fs-match" id="fs-match"></div>' +
          '<div class="fs-me" id="fs-me"></div>' +
          '<div class="fs-acts" id="fs-acts"></div>' +
          '<div class="fs-round" id="fs-round"></div>' +
        '</div>' +
        '<div class="fs-side"><div class="fs-tbl" id="fs-tbl"></div></div>' +
      '</div>'
    );

    // Classificação depois da rodada k (no fim, o desempate é o da temporada: a posição do motor vale)
    const standings = () => {
      if (!k) return F.frames[0].map(x => Object.assign({}, x, { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 })).sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id)));
      const fr = F.frames[k - 1];
      return k === R ? F.sortRows(fr) : fr.slice().sort((a, b) => b.p - a.p || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || a.i - b.i);
    };
    const zone = pos => (F.promo && pos <= F.promo ? ' z-up' : F.releg && pos > n - F.releg ? ' z-down' : !F.promo && pos === 1 ? ' z-top' : '');
    function table() {
      const rows = standings();
      $('fs-tbl').innerHTML = '<div class="fs-th"><i>#</i><span>Time</span><b>P</b><em>J</em><em>V</em><em>SG</em></div>' +
        rows.map((x, j) => '<div class="fs-tr' + zone(j + 1) + (x.i === me ? ' me' : '') + '"><i>' + (j + 1) + '</i>' + crest(x.id, 'xs') + '<span>' + esc(nameOf(x.id)) + '</span>' +
          '<b>' + x.p + '</b><em>' + x.j + '</em><em>' + x.v + '</em><em>' + (x.gp - x.gc > 0 ? '+' : '') + (x.gp - x.gc) + '</em></div>').join('') +
        '<p class="fs-legend">' + (F.promo ? '<span class="z-up">Acesso</span>' : '<span class="z-top">Título</span>') + (F.releg ? '<span class="z-down">Rebaixamento</span>' : '') + '</p>';
      const mine = $('fs-tbl').querySelector('.me');
      // A tabela tem altura fixa no computador: a sua linha fica à vista
      if (mine && mine.parentNode.scrollHeight > mine.parentNode.clientHeight) mine.parentNode.scrollTop = mine.offsetTop - mine.parentNode.clientHeight / 2;
      return rows.findIndex(x => x.i === me) + 1;
    }
    // Seu jogo da rodada ri (0 a R-1): placar com mandante à esquerda e a sua linha embaixo
    const gameOf = ri => F.mine.find(x => x.ri === ri);
    function matchCard(ri, played) {
      const g = gameOf(ri);
      if (!g) return '<div class="fs-bye">' + U.emo('😴', 'sm') + ' Seu time folga nesta rodada.</div>';
      const h = g.home ? myId : F.ids[g.vs], a = g.home ? F.ids[g.vs] : myId;
      const gh = g.home ? g.gf : g.ga, ga = g.home ? g.ga : g.gf;
      const out = g.gf > g.ga ? 'win' : g.gf < g.ga ? 'loss' : 'draw';
      const side = id => '<div class="fs-tm' + (id === myId ? ' me' : '') + '">' + crest(id, 'md') + '<span>' + esc(nameOf(id)) + '</span></div>';
      const line = !played ? (g.decisive ? U.emo('🎯', 'xs') + ' O jogo do seu lance decisivo' : g.home ? 'Em casa' : 'Fora de casa')
        : !g.on ? 'Você não jogou'
        : [g.goals ? g.goals + (g.goals === 1 ? ' gol' : ' gols') : '', g.assists ? g.assists + (g.assists === 1 ? ' assistência' : ' assistências') : '', 'nota ' + rate(g.rating)].filter(Boolean).join(' · ');
      return '<div class="fs-card ' + (played ? out : 'next') + (g.decisive ? ' dec' : '') + '">' +
        '<div class="fs-lbl">' + (played ? 'Rodada ' + (ri + 1) + ' · ' + (out === 'win' ? 'Vitória' : out === 'loss' ? 'Derrota' : 'Empate') : 'Próximo jogo · rodada ' + (ri + 1)) + '</div>' +
        '<div class="fs-sc">' + side(h) + '<b>' + (played ? gh + '<i>×</i>' + ga : '<i>×</i>') + '</b>' + side(a) + '</div>' +
        '<p class="fs-line">' + line + '</p></div>';
    }
    // Seus números na liga até a rodada k
    function meLine() {
      const on = F.mine.filter(x => x.ri < k && x.on);
      const g = on.reduce((s, x) => s + x.goals, 0), a = on.reduce((s, x) => s + x.assists, 0);
      const r = on.length ? on.reduce((s, x) => s + x.rating, 0) / on.length : 0;
      const gk = G.c.pos === 'GOL' || G.c.pos === 'ZAG';
      const cs = gk ? F.mine.filter(x => x.ri < k && x.on && !x.ga).length : 0;
      $('fs-me').innerHTML = '<div><b>' + on.length + '</b><span>Jogos</span></div>' +
        (gk ? '<div><b>' + cs + '</b><span>Sem sofrer gol</span></div>' : '<div><b>' + g + '</b><span>Gols</span></div>') +
        '<div><b>' + a + '</b><span>' + (gk ? 'Assist.' : 'Assist.') + '</span></div><div><b>' + (on.length ? rate(r) : '–') + '</b><span>Nota</span></div>';
    }
    // Os outros jogos da rodada
    function roundList() {
      if (!k) { $('fs-round').innerHTML = ''; return; }
      const rd = F.rounds[k - 1].filter(m => m.h !== me && m.a !== me);
      $('fs-round').innerHTML = '<div class="fs-rlbl">Outros jogos da rodada ' + k + '</div>' + rd.map(m =>
        '<div class="fs-rr"><span>' + esc(nameOf(F.ids[m.h])) + '</span>' + crest(F.ids[m.h], 'xs') + '<b>' + m.gh + ' × ' + m.ga + '</b>' + crest(F.ids[m.a], 'xs') + '<span>' + esc(nameOf(F.ids[m.a])) + '</span></div>').join('');
    }
    function paint() {
      const pos = table();
      $('fs-h').textContent = k === R ? 'Fim da liga: ' + pos + 'º lugar' : k ? pos + 'º depois de ' + k + (k === 1 ? ' rodada' : ' rodadas') : R + ' rodadas pela frente';
      // Depois de jogar: o resultado da última; antes da primeira: o primeiro jogo
      $('fs-match').innerHTML = k ? matchCard(k - 1, true) + (k < R ? '<p class="fs-nx">Próximo: ' + nextLine(k) + '</p>' : '') : matchCard(0, false);
      meLine(); roundList();
      $('fs-acts').innerHTML = k < R
        ? '<button class="btn" id="fs-next">' + (k ? 'Próxima rodada' : 'Começar a liga') + '</button><div class="fs-skip"><button class="btn ghost" id="fs-5">Avançar 5</button><button class="btn ghost" id="fs-end">Até o fim</button></div>'
        : '<button class="btn" id="fs-done">Ver resumo da temporada</button>';
      if ($('fs-next')) { $('fs-next').onclick = () => go(1); $('fs-5').onclick = () => go(5); $('fs-end').onclick = () => go(R); }
      if ($('fs-done')) $('fs-done').onclick = done;
    }
    const nextLine = ri => { const g = gameOf(ri); return g ? (g.home ? 'em casa contra ' : 'fora contra ') + esc(nameOf(F.ids[g.vs])) + (g.decisive ? ' ' + U.emo('🎯', 'xs') : '') : 'folga'; };
    function go(step) {
      const was = k;
      k = Math.min(R, k + step);
      // O jogo do lance decisivo não passa batido no "Avançar": a liga para nele
      const dec = F.mine.find(x => x.decisive);
      if (dec && was <= dec.ri && dec.ri < k - 1) k = dec.ri + 1;
      const g = gameOf(k - 1);
      sfx('whistle');
      paint();
      $('fs-match').scrollIntoView({ block: 'nearest' });
    }
    paint();
    return true;
  }

  Object.assign(U, { fullSeason });
})();
