// Interface — fim de carreira e carta final
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- fim ----------
  // Números principais da carreira por posição
  function careerStats(c) {
    const T = c.totals;
    if (c.pos === 'GOL') return [[T.cs || 0, 'Sem sofrer gol'], [T.penSaved || 0, 'Pênaltis defendidos']];
    if (c.pos === 'ZAG') return [[T.goals, 'Gols'], [T.cs || 0, 'Sem sofrer gol']];
    return [[T.goals, 'Gols'], [T.assists, 'Assistências']];
  }

  // Ordem da sala de troféus (as maiores primeiro)
  const ROOM = ['wc', 'ballon', 'cwc', 'ucl', 'lib', 'inter', 'league', 'cup'];
  function finale() {
    const f = S.finish(G.c);
    const ach = U.achRecord(G.c, f);
    U.rankSave(G.c, f); // carreira encerrada: entra no ranking com a pontuação
    const T = G.c.totals;
    store(SAVE, null);
    const hall = (load(HALL) || []);
    hall.push({ name: G.c.name, grade: f.grade, score: f.score, verdict: f.verdict, goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon, pos: G.c.pos, cs: T.cs || 0, penSaved: T.penSaved || 0 });
    hall.sort((a, b) => b.score - a.score);
    const rank = hall.findIndex(h => h.score === f.score && h.name === G.c.name) + 1;
    store(HALL, hall.slice(0, 10));
    const cty = D.COUNTRIES.find(x => x.id === G.c.country);
    const cardData = {
      name: G.c.name, number: G.c.number, wc: G.c.totals.wc || 0, pos: G.c.pos, peak: G.c.peak, attrs: G.c.peakAttrs || G.c.attrs, flag: cty.flag,
      crest: 'badges/' + f.mainClub + '.png', grade: f.grade, verdict: f.verdict,
      goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon,
      cs: T.cs || 0, penSaved: T.penSaved || 0, tackles: T.tackles || 0,
      traits: G.c.traits.map(id => ({ icon: D.TRAIT_BY_ID[id].icon, lv: S.traitLevel(G.c, id) })),
    };
    const shareName = G.c.name;
    // Escudo da carta: começa no clube principal e dá para trocar por qualquer clube da carreira
    const clubsPlayed = [...new Set(G.c.spells.filter(sp => sp.seasons).map(sp => sp.club))];
    if (!clubsPlayed.includes(f.mainClub)) clubsPlayed.unshift(f.mainClub);
    render(
      '<div class="eyebrow">Fim de carreira · ' + (YEAR0 + G.c.season) + '</div>' +
      '<div class="fut"><canvas id="fut" aria-label="Card do jogador"></canvas></div>' +
      // Suas cartas: a final e as especiais; a escolhida aparece grande e é a que vai no compartilhar
      ((G.c.cards || []).length ? '<div class="crest-pick-t">Suas cartas · toque para ver e compartilhar</div><div class="sp-cards">' +
        '<canvas data-sp="final" class="on" aria-label="Carta final"></canvas>' + G.c.cards.map((k, i) => '<canvas data-sp="' + i + '" aria-label="' + esc(U.SPECIAL_NAME[k.type]) + '"></canvas>').join('') + '</div>' : '') +
      (clubsPlayed.length > 1 ? '<div id="crest-wrap"><div class="crest-pick-t">Escudo da carta</div><div class="crest-pick" id="crest-pick">' + clubsPlayed.map(id => '<button data-club="' + id + '"' + (id === f.mainClub ? ' class="on"' : '') + ' aria-label="' + esc(club(id).name) + '">' + crest(id) + '<span>' + esc(club(id).name) + '</span></button>').join('') + '</div></div>' : '') +
      '<button class="btn" id="b-share">Compartilhar card</button>' +
      (G.c.seasons.length ? '<button class="btn ghost" id="b-album">📖 Ver o álbum da carreira</button>' : '') +

      '<div class="final">' +
      '<div class="headrow"><div class="grade ' + f.grade + '">' + f.grade + '</div><div class="who"><b>' + esc(G.c.name) + '</b><span>' + cty.flag + ' ' + D.POS[G.c.pos].name + ' · 16 a ' + G.c.age + ' anos · pico ' + G.c.peak + '</span></div></div>' +
      '<div class="verdict">' + esc(f.verdict) + '</div>' +
      '<div class="stats"><div><b>' + T.games + '</b><span>Jogos</span></div>' + careerStats(G.c).map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('') +
      '<div><b>' + f.titles + '</b><span>Títulos</span></div><div><b>' + T.ballon + '</b><span>Bolas de Ouro</span></div><div><b>' + f.nClubs + '</b><span>Clubes</span></div></div>' +
      (T.wcApps ? '<p class="muted small patr">🌍 Copas do Mundo: ' + T.wcApps + (T.wcApps > 1 ? ' disputadas' : ' disputada') + ' · ' + (T.wc || 0) + (T.wc === 1 ? ' título' : ' títulos') + ' · ' + (T.wcGoals || 0) + ' gols</p>' : '') +
      (T.cwcApps ? '<p class="muted small patr">🌐 Mundiais de Clubes: ' + T.cwcApps + (T.cwcApps > 1 ? ' disputados' : ' disputado') + ' · ' + (T.cwc || 0) + (T.cwc === 1 ? ' título' : ' títulos') + ' · ' + (T.cwcGoals || 0) + ' gols</p>' : '') +
      '<p class="muted small patr">💰 Patrimônio R$ ' + money(G.c.money) + (G.c.buys ? ' · investiu R$ ' + money(G.c.spent) + ' em ' + G.c.buys + (G.c.buys > 1 ? ' compras' : ' compra') : '') + '</p>' +
      '<div class="timeline">' + G.c.spells.map(s => '<div><span>' + String(YEAR0 + s.from - 16).slice(2) + '–' + String(YEAR0 + s.to - 16 + 1).slice(2) + '</span><span>' + crest(s.club, 'xs') + esc(club(s.club).name) + '</span><span>' + (G.c.pos === 'GOL' ? (s.cs || 0) + ' SG' : G.c.pos === 'ZAG' ? s.goals + 'G ' + (s.cs || 0) + 'SG' : s.goals + 'G ' + s.assists + 'A') + (s.titles ? ' · ' + s.titles + '🏆' : '') + '</span></div>').join('') + '</div>' +
      (Object.keys(G.c.trophies || {}).length ? '<div class="room-title">Sala de troféus</div><div class="room">' +
        Object.entries(G.c.trophies).sort((a, b) => ROOM.indexOf(a[1].type) - ROOM.indexOf(b[1].type))
          .map(([name, t]) => '<div>' + trophy(t.type, 52, name) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '') +
      (f.bonus.length ? '<div class="room-title">Despedida</div><ul class="why">' + f.bonus.map(b => '<li><span>' + esc(b.txt) + '</span><b class="up">+' + b.v + '</b></li>').join('') + '</ul>' : '') +
      U.dailyFinish(G.c, f) + U.finaleRank() +
      U.achBlock(ach) +
      '<div class="score">' + f.score + ' pontos' + (rank === 1 ? ' · NOVO RECORDE!' : ' · #' + rank + ' no seu Hall da Fama') + '</div>' +
      '</div>' +
      '<button class="btn" id="b-again">Nova carreira</button><button class="btn ghost" id="b-hall">Hall da Fama</button>'
    );
    // Edição especial do jornal com a despedida
    const retired = G.c;
    setTimeout(() => U.farewellPaper(retired, f), 700);
    const spData = k => (k === 'final' ? cardData : U.cardData(retired, retired.cards[+k]));
    screen.querySelectorAll('[data-sp]').forEach(sc => {
      window.CRAQUE_CARD(sc, spData(sc.dataset.sp));
      sc.onclick = () => {
        screen.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === sc));
        window.CRAQUE_CARD($('fut'), spData(sc.dataset.sp));
        if ($('crest-wrap')) $('crest-wrap').hidden = sc.dataset.sp !== 'final'; // escudo só se troca na carta final
        $('b-share').textContent = 'Compartilhar card';
        $('fut').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };
    });
    if ($('b-album')) $('b-album').onclick = () => U.album(retired, f, cardData);
    G.c = null;
    $('bar').hidden = true;
    const cv = $('fut');
    window.CRAQUE_CARD(cv, cardData);
    screen.querySelectorAll('[data-club]').forEach(b => b.onclick = () => {
      screen.querySelectorAll('[data-club]').forEach(x => x.classList.toggle('on', x === b));
      cardData.crest = 'badges/' + b.dataset.club + '.png';
      window.CRAQUE_CARD(cv, cardData);
      const th = screen.querySelector('[data-sp="final"]'); if (th) window.CRAQUE_CARD(th, cardData);
      $('b-share').textContent = 'Compartilhar card';
    });
    $('b-share').onclick = async () => {
      const r = await window.CRAQUE_SHARE(cv, shareName);
      if (r === 'download') $('b-share').textContent = 'Imagem salva';
    };
    $('b-again').onclick = U.create;
    // Vai para o início e rola até o Hall da Fama (id próprio: "b-home" é o botão de casa da barra)
    $('b-hall').onclick = () => { U.home(); setTimeout(() => { const h = document.querySelector('.hall'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250); };
  }

  Object.assign(U, { finale, careerStatsOf: careerStats });
})();
