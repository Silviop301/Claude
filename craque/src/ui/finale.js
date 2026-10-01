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
  // De onde veio a nota: cada parcela, o total e quanto faltou para a próxima faixa
  function scoreHow(f) {
    if (!f.parts) return '';
    const i = S.GRADES.findIndex(([g]) => g === f.grade), next = i > 0 ? S.GRADES[i - 1] : null;
    return '<details class="more score-how"><summary>Como chegou a esta nota</summary>' +
      '<ul class="sh-parts">' + f.parts.map(p => '<li><span>' + esc(p.txt) + '</span><b>+' + p.v + '</b></li>').join('') +
      '<li class="tot"><span>Total</span><b>' + f.score + '</b></li></ul>' +
      '<p class="sh-bands">' + S.GRADES.filter(([, min]) => min > 0).map(([g, min]) => g + ' a partir de ' + min).join(' · ') + '</p>' +
      (next ? '<p class="sh-next">Faltaram ' + (next[1] - f.score) + ' pontos para a nota ' + next[0] + '.</p>' : '') + '</details>';
  }

  function finale() {
    const f = S.finish(G.c);
    const ach = U.achRecord(G.c, f);
    // Pacotinhos da carreira: fim de carreira, nota, títulos grandes, conquistas novas e carreira do dia
    const packWhy = U.ITEMS.careerWhy(G.c, f, ach);
    U.ITEMS.earn(packWhy);
    U.rankSave(G.c, f); // carreira encerrada: entra no ranking com a pontuação
    const T = G.c.totals;
    store(SAVE, { c: null, at: Date.now() });
    const hall = (load(HALL) || []);
    hall.push({ name: G.c.name, grade: f.grade, score: f.score, verdict: f.verdict, goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon, pos: G.c.pos, cs: T.cs || 0, penSaved: T.penSaved || 0 });
    hall.sort((a, b) => b.score - a.score);
    const rank = hall.findIndex(h => h.score === f.score && h.name === G.c.name) + 1;
    store(HALL, hall.slice(0, 10));
    const cty = D.COUNTRIES.find(x => x.id === G.c.country);
    const cardData = {
      name: G.c.name, number: G.c.number, wc: G.c.totals.wc || 0, pos: G.c.pos, peak: G.c.peak, attrs: G.c.peakAttrs || G.c.attrs, flag: cty.flag,
      crest: 'badges/' + f.mainClub + '.png', grade: f.grade, verdict: f.verdict, look: U.lookOf(G.c), shirt: U.kitOf(f.mainClub),
      goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon,
      cs: T.cs || 0, penSaved: T.penSaved || 0, tackles: T.tackles || 0,
      traits: G.c.traits.map(id => ({ id, icon: D.TRAIT_BY_ID[id].icon, lv: S.traitLevel(G.c, id) })),
    };
    Object.assign(cardData, U.trail(G.c));
    // O jogador assina a carta no fim da carreira: começa na Clássica e troca entre as liberadas
    cardData.sign = 'delafield';
    const colAt = U.collect(G.c, f, cardData); // a carta entra na coleção
    U.salaRecord(G.c); // e as taças, na Sala de Troféus
    const shareName = G.c.name;
    // Escudo da carta: começa no clube principal e dá para trocar por qualquer clube da carreira
    const clubsPlayed = [...new Set(G.c.spells.filter(sp => sp.seasons).map(sp => sp.club))];
    if (!clubsPlayed.includes(f.mainClub)) clubsPlayed.unshift(f.mainClub);
    const fresh = ach && ach.fresh ? ach.fresh.length : 0;
    const scoreTxt = f.score + ' pontos' + (rank === 1 ? ' · novo recorde!' : ' · #' + rank + ' no seu Hall da Fama');
    // Tela enxuta, com foco em editar a carta, compartilhar e abrir os pacotinhos.
    // O resto (álbum, troféus, ranking, números, clubes, conquistas, de onde veio a nota) fica no "Resumo da carreira", fechado.
    render(
      '<div class="eyebrow">Fim de carreira · ' + (YEAR0 + G.c.season) + '</div>' +
      '<div class="fut card3d-host" id="fut-host"><canvas id="fut" aria-label="Card do jogador"></canvas></div>' +
      '<div class="fin-sum"><div class="grade ' + f.grade + '">' + f.grade + '</div><div><b>' + esc(f.verdict) + '</b><span>' + esc(scoreTxt) + '</span></div></div>' +
      '<div class="ed-box" id="ed-box"></div>' +
      '<div class="fin-acts"><button class="btn" id="b-share">Compartilhar carta</button><button class="btn ghost" id="b-save">Salvar</button></div>' +
      U.packFinale(packWhy) +
      '<details class="fin-more"><summary>Resumo da carreira' + (fresh ? ' <em>' + fresh + (fresh > 1 ? ' conquistas novas' : ' conquista nova') + '</em>' : '') + '</summary>' +
      '<div class="fin-links">' + (G.c.seasons.length ? '<button id="b-album">' + U.emo('📖', 'sm') + '<span>Álbum</span></button>' : '') +
        (Object.keys(G.c.trophies || {}).length ? '<button id="b-sala-car">' + U.emo('🏆', 'sm') + '<span>Troféus</span></button>' : '') +
        '<button id="b-hall">' + U.emo('🏅', 'sm') + '<span>Hall da Fama</span></button></div>' +
      U.dailyFinish(G.c, f) + U.finaleRank() +
      '<div class="final">' +
      '<div class="headrow"><div class="grade ' + f.grade + '">' + f.grade + '</div><div class="who"><b>' + esc(G.c.name) + '</b><span>' + U.flag(cty.flag) + ' ' + D.POS[G.c.pos].name + ' · 16 a ' + G.c.age + ' anos · pico ' + G.c.peak + '</span></div></div>' +
      '<div class="stats"><div><b>' + T.games + '</b><span>Jogos</span></div>' + careerStats(G.c).map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('') +
      '<div><b>' + f.titles + '</b><span>Títulos</span></div><div><b>' + T.ballon + '</b><span>Bolas de Ouro</span></div><div><b>' + f.nClubs + '</b><span>Clubes</span></div></div>' +
      (T.wcApps ? '<p class="muted small patr">' + U.emo('🌍', 'sm') + ' Copas do Mundo: ' + T.wcApps + (T.wcApps > 1 ? ' disputadas' : ' disputada') + ' · ' + (T.wc || 0) + (T.wc === 1 ? ' título' : ' títulos') + ' · ' + (T.natGames ? T.natGames + ' jogos, ' : '') + (T.wcGoals || 0) + ' gols (já no total)</p>' : '') +
      (T.cwcApps ? '<p class="muted small patr">' + U.emo('🌐', 'sm') + ' Mundiais de Clubes: ' + T.cwcApps + (T.cwcApps > 1 ? ' disputados' : ' disputado') + ' · ' + (T.cwc || 0) + (T.cwc === 1 ? ' título' : ' títulos') + ' · ' + (T.cwcGoals || 0) + ' gols (já no total)</p>' : '') +
      '<p class="muted small patr">' + U.emo('💰', 'sm') + ' Patrimônio R$ ' + money(G.c.money) + (G.c.buys ? ' · ' + G.c.buys + (G.c.buys > 1 ? ' melhorias' : ' melhoria') + ' com pontos de evolução' : '') + '</p>' +
      '<div class="timeline">' + G.c.spells.map(s => '<div><span>' + String(YEAR0 + s.from - 16).slice(2) + '–' + String(YEAR0 + s.to - 16 + 1).slice(2) + '</span><span>' + crest(s.club, 'xs') + esc(club(s.club).name) + (s.loan ? ' <small class="tl-loan">empréstimo</small>' : '') + '</span><span>' + (G.c.pos === 'GOL' ? (s.cs || 0) + ' SG' : G.c.pos === 'ZAG' ? s.goals + 'G ' + (s.cs || 0) + 'SG' : s.goals + 'G ' + s.assists + 'A') + (s.titles ? ' · ' + s.titles + U.emo('🏆', 'xs') : '') + '</span></div>').join('') + '</div>' +
      (Object.keys(G.c.trophies || {}).length ? '<div class="room-title">Sala de troféus</div><div class="room">' +
        Object.entries(G.c.trophies).sort((a, b) => ROOM.indexOf(a[1].type) - ROOM.indexOf(b[1].type))
          .map(([name, t]) => '<div>' + trophy(t.type, 52, name) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '') +
      (f.bonus.length ? '<div class="room-title">Despedida</div><ul class="why">' + f.bonus.map(b => '<li><span>' + esc(b.txt) + '</span><b class="up">+' + b.v + '</b></li>').join('') + '</ul>' : '') +
      U.achBlock(ach) +
      scoreHow(f) +
      '</div></details>' +
      '<button class="btn ghost" id="b-again">Nova carreira</button>'
    );
    U.tip('fim');
    // Edição especial do jornal com a despedida
    const retired = G.c;
    setTimeout(() => U.farewellPaper(retired, f), 700);
    const spData = k => (k === 'final' ? cardData : U.specialFinal(cardData, retired, retired.cards[+k]));
    let curSp = 'final';
    if ($('b-album')) $('b-album').onclick = () => U.album(retired, f, cardData);
    if ($('b-sala-car')) $('b-sala-car').onclick = () => U.trophyRoom('car', retired);
    G.c = null;
    $('bar').hidden = true;
    const cv = $('fut');
    // Carta 3D metálica (o canvas fica como reserva e para salvar a imagem)
    let shown = cardData, viewer = null;
    U.mount3d($('fut-host'), cardData).then(v => { viewer = v; });
    const redraw = () => { shown = spData(curSp); window.CRAQUE_CARD(cv, shown); if (viewer) viewer.update(shown); };

    // Editar carta, logo abaixo dela: assinatura, acabamento (itens), estilo (as cartas especiais conquistadas) e escudo, uma aba por vez
    const I = U.ITEMS, SG = window.CRAQUE_SIGN || {};
    const signLock = k => { const it = I.itemOf('ass-' + k); return it && !I.has(it.id) ? it : null; };
    const FN = window.CRAQUE_FINISH || {};
    const finLock = k => { const it = I.itemOf('ac-' + k); return it && !I.has(it.id) ? it : null; };
    const TABS = [['sign', 'Assinatura'], ['finish', 'Acabamento']].concat((retired.cards || []).length ? [['style', 'Estilo']] : [], clubsPlayed.length > 1 ? [['crest', 'Escudo']] : []);
    let tab = 'sign', msg = '';
    // Nome comprido: letra menor para caber no botão (as fontes de marcador são largas)
    const sigSize = shareName.length > 14 ? 15 : shareName.length > 10 ? 18 : shareName.length > 7 ? 21 : 24;
    function drawEd() {
      const box = $('ed-box');
      if (!box) return;
      let body = '';
      if (tab === 'sign') body = '<div class="sig-grid">' + Object.entries(SG).map(([k, F]) => {
        const it = signLock(k);
        return '<button data-sign="' + k + '" class="sig-b' + (cardData.sign === k ? ' on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + '">' +
          '<span style="font-family:' + esc(F.family) + ', cursive;font-size:' + sigSize + 'px">' + esc(shareName) + '</span><small>' + (it ? U.emo('🔒', 'xs') + ' ' : '') + F.label + '</small></button>';
      }).join('') + '</div>' + (msg ? '<p class="muted small sig-msg">' + msg + '</p>' : '');
      if (tab === 'finish') body = (curSp === 'final' ? '' : '<p class="muted small">O acabamento vale para a carta final.</p>') +
        '<div class="fin-grid"><button data-fin="" class="fin-b' + (!cardData.finish ? ' on' : '') + '"><i class="fin-sw std"></i><small>Padrão</small></button>' +
        Object.entries(FN).map(([k, F]) => {
          const it = finLock(k);
          return '<button data-fin="' + k + '" class="fin-b' + (cardData.finish === k ? ' on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + '">' +
            '<i class="fin-sw" style="background-image:url(assets/cartas/ac-' + k + '.jpg)"></i>' + (it ? '<span class="fin-lk">' + U.emo('🔒', 'xs') + '</span>' : '') + '<small>' + esc(F[0]) + '</small></button>';
        }).join('') + '</div>' + (msg ? '<p class="muted small sig-msg">' + msg + '</p>' : '');
      if (tab === 'style') body = '<div class="sp-cards"><canvas data-sp="final" aria-label="Carta final"' + (curSp === 'final' ? ' class="on"' : '') + '></canvas>' +
        retired.cards.map((k, i) => '<canvas data-sp="' + i + '" aria-label="' + esc(U.SPECIAL_NAME[k.type]) + '"' + (curSp === String(i) ? ' class="on"' : '') + '></canvas>').join('') + '</div>';
      if (tab === 'crest') body = (curSp === 'final' ? '' : '<p class="muted small">O escudo vale para a carta final.</p>') + '<div class="crest-pick">' + clubsPlayed.map(id => '<button data-club="' + id + '"' + (cardData.crest === 'badges/' + id + '.png' ? ' class="on"' : '') + ' aria-label="' + esc(club(id).name) + '">' + crest(id) + '<span>' + esc(club(id).name) + '</span></button>').join('') + '</div>';
      box.innerHTML = '<div class="ed-t">Edite sua carta</div>' + (TABS.length > 1 ? '<div class="ed-tabs">' + TABS.map(([k, l]) => '<button data-edtab="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' : '') + body;
      box.querySelectorAll('[data-edtab]').forEach(b => b.onclick = () => { tab = b.dataset.edtab; msg = ''; drawEd(); });
      box.querySelectorAll('[data-sp]').forEach(sc => {
        window.CRAQUE_CARD(sc, spData(sc.dataset.sp));
        sc.onclick = () => { curSp = sc.dataset.sp; redraw(); drawEd(); };
      });
      box.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
        const k = b.dataset.sign, it = signLock(k);
        if (it) { msg = esc('Assinatura ' + SG[k].label + ' · ' + I.RAR_NAME[it.rk] + ': sai nos pacotinhos ou na troca de fichas.'); return drawEd(); }
        msg = ''; cardData.sign = k; U.collectPatch(colAt, { sign: k }); redraw(); drawEd();
      });
      box.querySelectorAll('[data-fin]').forEach(b => b.onclick = () => {
        const k = b.dataset.fin, it = k && finLock(k);
        if (it) { msg = esc(it.name + ' · ' + I.RAR_NAME[it.rk] + ': sai nos pacotinhos ou na troca de fichas.'); return drawEd(); }
        msg = ''; cardData.finish = k || undefined; U.collectPatch(colAt, { finish: k || undefined });
        if (curSp !== 'final') curSp = 'final';
        redraw(); drawEd();
      });
      box.querySelectorAll('[data-club]').forEach(b => b.onclick = () => {
        cardData.crest = 'badges/' + b.dataset.club + '.png';
        cardData.shirt = U.kitOf(b.dataset.club);
        U.collectPatch(colAt, { crest: cardData.crest });
        redraw(); drawEd();
      });
    }
    drawEd();
    $('b-save').onclick = async () => {
      const r = await window.CRAQUE_SHARE(cv, shareName);
      if (r === 'download') $('b-save').textContent = 'Salva';
    };
    // Compartilhar: link que abre a carta 3D no jogo; a imagem continua disponível
    $('b-share').onclick = () => U.shareCard(shown, $('b-share'));
    if ($('b-packs')) $('b-packs').onclick = () => U.openPacks(() => { const b = screen.querySelector('.pk-won'); if (b && !U.ITEMS.get().packs.length) b.remove(); });
    $('b-again').onclick = U.create;
    // Vai para o início e rola até o Hall da Fama (id próprio: "b-home" é o botão de casa da barra)
    $('b-hall').onclick = () => { U.home(); setTimeout(() => { const h = document.querySelector('.hall'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250); };
  }

  Object.assign(U, { finale, careerStatsOf: careerStats });
})();
