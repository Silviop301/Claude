// Interface — Carreira Completa: a temporada de liga rodada a rodada (seu jogo, os outros resultados e a tabela
// inteira) antes do resumo da temporada. O calendário e os placares vêm de S.fullSeason (engine/fixtures.js).
// A rodada passa ao vivo: o relógio corre de 0' a 90', os gols de todos os jogos entram no minuto deles e a tabela
// muda junto. "Avançar 5" e "Até o fim" pulam sem o ao vivo.
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, sfx, $, esc, crest, year, save, render } = U;

  const nameOf = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].name : 'Time ' + Math.abs(id));
  const rate = r => r.toFixed(1).replace('.', ',');
  const clock = t => (t > 90 ? '90+' + (t - 90) : t) + "'";
  // Milissegundos por minuto de jogo (normal e rápido): a rodada leva uns 10 s, ou 4 s no rápido
  const PACE = [110, 40];

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
    let live = null; // rodada k ao vivo: { t: minuto, fast, end: último minuto, timer }
    let fast = false; // o rápido vale para as próximas rodadas também
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

    // Placar de um jogo até o minuto t
    const partial = (m, t) => { let h = 0, a = 0; m.ev.forEach(e => { if (e.m <= t) { if (e.s === 'h') h++; else a++; } }); return [h, a]; };
    const zeros = () => F.frames[0].map(x => Object.assign({}, x, { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
    const order = (a, b) => b.p - a.p || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || a.i - b.i;
    // Classificação depois da rodada k, ou durante a rodada ao vivo (no fim da liga, o desempate da temporada vale)
    const standings = () => {
      if (live) {
        const cur = (k ? F.frames[k - 1] : zeros()).map(x => Object.assign({}, x)), by = {};
        cur.forEach(x => { by[x.i] = x; });
        if (live.t > 0) F.rounds[k].forEach(m => {
          const [gh, ga] = partial(m, live.t), A = by[m.h], B = by[m.a];
          A.j++; B.j++; A.gp += gh; A.gc += ga; B.gp += ga; B.gc += gh;
          if (gh > ga) { A.p += 3; A.v++; B.d++; } else if (gh < ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
        });
        return cur.sort(order);
      }
      if (!k) return zeros().sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id)));
      return k === R ? F.sortRows(F.frames[k - 1]) : F.frames[k - 1].slice().sort(order);
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
    const gameOf = ri => F.mine.find(x => x.ri === ri);
    // Lances do seu jogo até o minuto t: seus gols e assistências com o seu nome, os outros com o nome do time
    function plays(g, t) {
      const h = g.home ? myId : F.ids[g.vs], a = g.home ? F.ids[g.vs] : myId, who = G.c.name;
      return g.ev.filter(e => e.m <= t).map(e => {
        const team = e.s === 'h' ? h : a, ours = team === myId;
        const txt = e.me ? 'Gol de ' + esc(who) + '!' : e.as ? 'Gol do ' + esc(nameOf(team)) + ', assistência de ' + esc(who) : 'Gol do ' + esc(nameOf(team));
        return '<li class="' + (e.me || e.as ? 'me' : ours ? 'us' : 'them') + '"><i>' + clock(e.m) + '</i>' + txt + '</li>';
      }).join('');
    }
    // Seu jogo da rodada ri (0 a R-1): antes, ao vivo (t) ou encerrado; placar com o mandante à esquerda
    function matchCard(ri, state, t) {
      const g = gameOf(ri);
      if (!g) return '<div class="fs-bye">' + (state === 'live' ? 'Rodada ao vivo · ' + clock(t) + '. ' : '') + 'Seu time folga nesta rodada.</div>';
      const h = g.home ? myId : F.ids[g.vs], a = g.home ? F.ids[g.vs] : myId;
      const m = F.rounds[ri].find(x => x.h === me || x.a === me);
      const [gh, ga] = state === 'live' ? partial(m, t) : g.home ? [g.gf, g.ga] : [g.ga, g.gf];
      const mf = g.home ? gh : ga, mg = g.home ? ga : gh;
      const out = mf > mg ? 'win' : mf < mg ? 'loss' : 'draw';
      const side = id => '<div class="fs-tm' + (id === myId ? ' me' : '') + '">' + crest(id, 'md') + '<span>' + esc(nameOf(id)) + '</span></div>';
      const lbl = state === 'next' ? 'Próximo jogo · rodada ' + (ri + 1)
        : state === 'live' ? '<span class="fs-dot" aria-hidden="true"></span>' + (t === 45 && live && live.half ? 'Intervalo' : 'Ao vivo · ' + clock(t))
        : 'Rodada ' + (ri + 1) + ' · ' + (out === 'win' ? 'Vitória' : out === 'loss' ? 'Derrota' : 'Empate');
      const line = state === 'next' ? (g.decisive ? U.emo('🎯', 'xs') + ' O jogo do seu lance decisivo' : g.home ? 'Em casa' : 'Fora de casa')
        : !g.on ? 'Você ficou fora deste jogo'
        : state === 'live' ? 'Você está em campo'
        : [g.goals ? g.goals + (g.goals === 1 ? ' gol' : ' gols') : '', g.assists ? g.assists + (g.assists === 1 ? ' assistência' : ' assistências') : '', 'nota ' + rate(g.rating)].filter(Boolean).join(' · ');
      const ev = state === 'next' ? '' : plays(g, state === 'live' ? t : 99);
      return '<div class="fs-card ' + (state === 'done' ? out : state) + (g.decisive ? ' dec' : '') + '">' +
        '<div class="fs-lbl">' + lbl + '</div>' +
        '<div class="fs-sc">' + side(h) + '<b>' + (state === 'next' ? '<i>×</i>' : gh + '<i>×</i>' + ga) + '</b>' + side(a) + '</div>' +
        (ev ? '<ul class="fs-ev">' + ev + '</ul>' : '') +
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
        '<div><b>' + a + '</b><span>Assist.</span></div><div><b>' + (on.length ? rate(r) : '–') + '</b><span>Nota</span></div>';
    }
    // Os outros jogos da rodada ri (ao vivo: placar no minuto t; o jogo que acabou de ter gol pisca)
    function roundList(ri, t) {
      if (ri < 0) { $('fs-round').innerHTML = ''; return; }
      const rd = F.rounds[ri].filter(m => m.h !== me && m.a !== me);
      $('fs-round').innerHTML = '<div class="fs-rlbl">' + (t === undefined ? 'Outros jogos da rodada ' + (ri + 1) : 'Outros jogos · ' + clock(t)) + '</div>' + rd.map(m => {
        const [gh, ga] = t === undefined ? [m.gh, m.ga] : partial(m, t);
        const hot = t !== undefined && m.ev.some(e => e.m <= t && e.m > t - 5); // acende por 5 minutos de jogo
        return '<div class="fs-rr' + (hot ? ' hot' : '') + '"><span>' + esc(nameOf(F.ids[m.h])) + '</span>' + crest(F.ids[m.h], 'xs') + '<b>' + gh + ' × ' + ga + '</b>' + crest(F.ids[m.a], 'xs') + '<span>' + esc(nameOf(F.ids[m.a])) + '</span></div>';
      }).join('');
    }
    const nextLine = ri => { const g = gameOf(ri); return g ? (g.home ? 'em casa contra ' : 'fora contra ') + esc(nameOf(F.ids[g.vs])) + (g.decisive ? ' ' + U.emo('🎯', 'xs') : '') : 'folga'; };
    function paint() {
      const pos = table();
      $('fs-h').textContent = k === R ? 'Fim da liga: ' + pos + 'º lugar' : k ? pos + 'º depois de ' + k + (k === 1 ? ' rodada' : ' rodadas') : R + ' rodadas pela frente';
      // Depois de jogar: o resultado da última; antes da primeira: o primeiro jogo
      $('fs-match').innerHTML = k ? matchCard(k - 1, 'done') + (k < R ? '<p class="fs-nx">Próximo: ' + nextLine(k) + '</p>' : '') : matchCard(0, 'next');
      meLine(); roundList(k - 1);
      $('fs-acts').innerHTML = k < R
        ? '<button class="btn" id="fs-next">' + (k ? 'Jogar a rodada ' + (k + 1) : 'Começar a liga') + '</button><div class="fs-skip"><button class="btn ghost" id="fs-5">Avançar 5</button><button class="btn ghost" id="fs-end">Até o fim</button></div>'
        : '<button class="btn" id="fs-done">Ver resumo da temporada</button>';
      if ($('fs-next')) { $('fs-next').onclick = play; $('fs-5').onclick = () => jump(5); $('fs-end').onclick = () => jump(R); }
      if ($('fs-done')) $('fs-done').onclick = done;
    }
    // Pula rodadas sem o ao vivo; o jogo do lance decisivo não passa batido (a liga para antes dele, para jogá-lo ao vivo)
    function jump(step) {
      let to = Math.min(R, k + step);
      const dec = F.mine.find(x => x.decisive);
      if (dec && dec.ri === k) return play();
      if (dec && k < dec.ri && dec.ri < to) to = dec.ri;
      k = to;
      sfx('whistle');
      paint();
      $('fs-match').scrollIntoView({ block: 'nearest' });
    }
    // ---------- rodada ao vivo ----------
    function liveFrame() {
      const t = live.t;
      $('fs-h').textContent = 'Rodada ' + (k + 1) + ' · ' + (t === 45 && live.half ? 'intervalo' : t >= live.end ? 'fim de jogo' : 'ao vivo');
      $('fs-match').innerHTML = matchCard(k, 'live', t);
      roundList(k, t);
      table();
    }
    function liveActs() {
      $('fs-acts').innerHTML = '<div class="fs-skip"><button class="btn ghost' + (fast ? ' on' : '') + '" id="fs-fast">' + (fast ? 'Velocidade normal' : 'Mais rápido') + '</button><button class="btn ghost" id="fs-skipm">Fim da rodada</button></div>';
      $('fs-fast').onclick = () => { fast = !fast; liveActs(); };
      $('fs-skipm').onclick = () => { live.t = live.end; finish(); };
    }
    function play() {
      // Último minuto da rodada: 90 ou o acréscimo do último gol
      const end = Math.max(90, ...F.rounds[k].map(m => (m.ev.length ? m.ev[m.ev.length - 1].m : 0)));
      live = { t: 0, end, half: false };
      sfx('whistle');
      liveActs(); liveFrame();
      $('fs-match').scrollIntoView({ block: 'nearest' });
      tick();
    }
    function tick() {
      // Saiu da tela (fechou, recarregou): o relógio para
      if (!live || !$('fs-match')) return;
      if (live.t === 45 && !live.half) { live.half = true; sfx('whistle'); liveFrame(); live.timer = setTimeout(tick, fast ? 300 : 900); return; }
      live.half = false;
      live.t++;
      const mg = gameOf(k), m = mg && F.rounds[k].find(x => x.h === me || x.a === me);
      // Gol do seu time: torcida; gol contra: nada (o placar já diz)
      if (m && m.ev.some(e => e.m === live.t && (e.s === 'h') === mg.home)) sfx('cheer');
      liveFrame();
      if (live.t >= live.end) return finish();
      live.timer = setTimeout(tick, PACE[fast ? 1 : 0]);
    }
    function finish() {
      clearTimeout(live.timer);
      live = null;
      k++;
      sfx('whistle');
      paint();
    }
    paint();
    return true;
  }

  Object.assign(U, { fullSeason });
})();
