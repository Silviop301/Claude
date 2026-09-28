// Interface — fim de carreira e carta final
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- fim ----------
  function finale() {
    const f = S.finish(G.c);
    const T = G.c.totals;
    store(SAVE, null);
    const hall = (load(HALL) || []);
    hall.push({ name: G.c.name, grade: f.grade, score: f.score, verdict: f.verdict, goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon });
    hall.sort((a, b) => b.score - a.score);
    const rank = hall.findIndex(h => h.score === f.score && h.name === G.c.name) + 1;
    store(HALL, hall.slice(0, 10));
    const cty = D.COUNTRIES.find(x => x.id === G.c.country);
    const cardData = {
      name: G.c.name, number: G.c.number, wc: G.c.totals.wc || 0, pos: G.c.pos, peak: G.c.peak, attrs: G.c.peakAttrs || G.c.attrs, flag: cty.flag,
      crest: 'badges/' + f.mainClub + '.png', grade: f.grade, verdict: f.verdict,
      goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon,
      traits: G.c.traits.map(id => ({ icon: D.TRAIT_BY_ID[id].icon, lv: S.traitLevel(G.c, id) })),
    };
    const shareName = G.c.name;
    // Escudo da carta: começa no clube principal e dá para trocar por qualquer clube da carreira
    const clubsPlayed = [...new Set(G.c.spells.filter(sp => sp.seasons).map(sp => sp.club))];
    if (!clubsPlayed.includes(f.mainClub)) clubsPlayed.unshift(f.mainClub);
    render(
      '<div class="eyebrow">Fim de carreira · ' + (YEAR0 + G.c.season) + '</div>' +
      '<div class="fut"><canvas id="fut" aria-label="Card do jogador"></canvas></div>' +
      (clubsPlayed.length > 1 ? '<div class="crest-pick-t">Escudo da carta</div><div class="crest-pick" id="crest-pick">' + clubsPlayed.map(id => '<button data-club="' + id + '"' + (id === f.mainClub ? ' class="on"' : '') + ' aria-label="' + esc(club(id).name) + '">' + crest(id) + '<span>' + esc(club(id).name) + '</span></button>').join('') + '</div>' : '') +
      '<button class="btn" id="b-share">Compartilhar card</button>' +
      '<div class="final">' +
      '<div class="headrow"><div class="grade ' + f.grade + '">' + f.grade + '</div><div class="who"><b>' + esc(G.c.name) + '</b><span>' + cty.flag + ' ' + D.POS[G.c.pos].name + ' · 16 a ' + G.c.age + ' anos · pico ' + G.c.peak + '</span></div></div>' +
      '<div class="verdict">' + esc(f.verdict) + '</div>' +
      '<div class="stats"><div><b>' + T.games + '</b><span>Jogos</span></div><div><b>' + T.goals + '</b><span>Gols</span></div><div><b>' + T.assists + '</b><span>Assistências</span></div>' +
      '<div><b>' + f.titles + '</b><span>Títulos</span></div><div><b>' + T.ballon + '</b><span>Bolas de Ouro</span></div><div><b>' + f.nClubs + '</b><span>Clubes</span></div></div>' +
      (T.wcApps ? '<p class="muted small patr">🌍 Copas do Mundo: ' + T.wcApps + (T.wcApps > 1 ? ' disputadas' : ' disputada') + ' · ' + (T.wc || 0) + (T.wc === 1 ? ' título' : ' títulos') + ' · ' + (T.wcGoals || 0) + ' gols</p>' : '') +
      '<p class="muted small patr">💰 Patrimônio R$ ' + money(G.c.money) + (G.c.buys ? ' · investiu R$ ' + money(G.c.spent) + ' em ' + G.c.buys + (G.c.buys > 1 ? ' compras' : ' compra') : '') + '</p>' +
      '<div class="timeline">' + G.c.spells.map(s => '<div><span>' + String(YEAR0 + s.from - 16).slice(2) + '–' + String(YEAR0 + s.to - 16 + 1).slice(2) + '</span><span>' + crest(s.club, 'xs') + esc(club(s.club).name) + '</span><span>' + s.goals + 'G ' + s.assists + 'A' + (s.titles ? ' · ' + s.titles + '🏆' : '') + '</span></div>').join('') + '</div>' +
      (Object.keys(G.c.trophies || {}).length ? '<div class="room-title">Sala de troféus</div><div class="room">' +
        Object.entries(G.c.trophies).sort((a, b) => ['wc', 'ballon', 'ucl', 'lib', 'league', 'cup'].indexOf(a[1].type) - ['wc', 'ballon', 'ucl', 'lib', 'league', 'cup'].indexOf(b[1].type))
          .map(([name, t]) => '<div>' + trophy(t.type, 44) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '') +
      (f.bonus.length ? '<div class="room-title">Despedida</div><ul class="why">' + f.bonus.map(b => '<li><span>' + esc(b.txt) + '</span><b class="up">+' + b.v + '</b></li>').join('') + '</ul>' : '') +
      '<div class="score">' + f.score + ' pontos' + (rank === 1 ? ' · NOVO RECORDE!' : ' · #' + rank + ' no seu Hall da Fama') + '</div>' +
      '</div>' +
      '<button class="btn" id="b-again">Nova carreira</button><button class="btn ghost" id="b-home">Hall da Fama</button>'
    );
    G.c = null;
    $('bar').hidden = true;
    const cv = $('fut');
    window.CRAQUE_CARD(cv, cardData);
    screen.querySelectorAll('[data-club]').forEach(b => b.onclick = () => {
      screen.querySelectorAll('[data-club]').forEach(x => x.classList.toggle('on', x === b));
      cardData.crest = 'badges/' + b.dataset.club + '.png';
      window.CRAQUE_CARD(cv, cardData);
      $('b-share').textContent = 'Compartilhar card';
    });
    $('b-share').onclick = async () => {
      const r = await window.CRAQUE_SHARE(cv, shareName);
      if (r === 'download') $('b-share').textContent = 'Imagem salva';
    };
    $('b-again').onclick = U.create;
    $('b-home').onclick = U.home;
  }

  Object.assign(U, { finale });
})();
