// Interface — fim de carreira e carta final
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- fim ----------
  // Números principais da carreira por posição
  function careerStats(c) {
    const T = c.totals;
    if (c.pos === 'GOL') return [[T.cs || 0, 'Sem sofrer gol'], [T.penSaved || 0, 'Pênaltis defendidos']];
    if (c.pos === 'ZAG') return [[T.cs || 0, 'Sem sofrer gol'], [T.goals, 'Gols']];
    return [[T.goals, 'Gols'], [T.assists, 'Assistências']];
  }

  // Ordem da sala de troféus (as maiores primeiro)
  const ROOM = ['wc', 'ballon', 'cwc', 'ucl', 'lib', 'inter', 'cont2', 'league', 'cup', 'super'];
  // De onde veio a nota: cada parcela, o total e quanto faltou para a próxima faixa
  function scoreHow(f) {
    if (!f.parts) return '';
    const GB = f.bands || S.GRADES, i = GB.findIndex(([g]) => g === f.grade), next = i > 0 ? GB[i - 1] : null;
    return '<details class="more score-how"><summary>Como chegou a esta nota</summary>' +
      '<ul class="sh-parts">' + f.parts.map(p => '<li><span>' + esc(p.txt) + '</span><b' + (p.v < 0 ? ' class="neg"' : '') + '>' + (p.v < 0 ? '−' + -p.v : '+' + p.v) + '</b></li>').join('') +
      '<li class="tot"><span>Total</span><b>' + U.pts(f.score) + '</b></li></ul>' +
      '<p class="sh-bands">' + GB.filter(([, min]) => min > 0).map(([g, min]) => g + ' a partir de ' + min).join(' · ') + '</p>' +
      (next ? '<p class="sh-next">' + (next[1] - f.score === 1 ? 'Faltou 1 ponto para a nota ' : 'Faltaram ' + U.pts(next[1] - f.score) + ' pontos para a nota ') + next[0] + '.</p>' : '') + '</details>';
  }

  // Você contra o rival de geração (engine/rival.js), número a número
  function rivalBlock(c, f) {
    const R = S.rivalSummary && S.rivalSummary(c, f.titles);
    if (!R) return '';
    const wins = R.rows.filter(([, a, b]) => a > b).length, loses = R.rows.filter(([, a, b]) => a < b).length;
    const verdict = wins > loses ? 'Você venceu a rivalidade' : wins < loses ? R.name + ' levou a melhor' : 'Rivalidade empatada';
    const h = c.rivalHist;
    return '<div class="fin-rival"><b>' + U.emo('⚔️', 'xs') + ' Você x ' + esc(R.name) + ' · ' + verdict + '</b>' +
      (R.back && h ? '<span class="fr-hist">Revanche · placar histórico entre carreiras: ' + h.me + ' x ' + h.him + '</span>' : '') + '<table><tr><td></td><td>Você</td><td>' + esc(R.name.split(' ')[0]) + '</td></tr>' +
      R.rows.map(([l, a, b]) => '<tr><td>' + l + '</td><td>' + a + '</td><td>' + b + '</td></tr>').join('') + '</table></div>';
  }
  // Para a próxima: o que faltou nesta carreira (próxima nota, recorde, rival) vira a meta da seguinte
  function nextGoal(c, f, hall, rank) {
    const out = [], G2 = f.bands || S.GRADES, i = G2.findIndex(([g]) => g === f.grade);
    // Quem é novo não sabe o que é "ponto": a linha diz de onde eles vêm (os pesos estão em S.SCORE_W)
    // (quanto faltou para a próxima nota já está na barra de pontos, logo acima)
    if (i > 0 && hall.length <= 2) out.push(['🎯', 'Pontos vêm de jogar bem, títulos (' + S.SCORE_W.title + ' cada), Bola de Ouro (' + S.SCORE_W.ballon + ') e Copa do Mundo (' + S.SCORE_W.wc + ')']);
    if (rank === 1 && hall.length > 1) out.push(['🏅', 'Novo recorde: <b>+' + U.pts(f.score - hall[1].score) + '</b> sobre o anterior']);
    else if (rank > 1) out.push(['🏅', 'Seu recorde é ' + U.pts(hall[0].score) + (hall[0].score - f.score === 1 ? ' pts: faltou <b>' : ' pts: faltaram <b>') + U.pts(hall[0].score - f.score) + '</b>']);
    const R = S.rivalSummary && S.rivalSummary(c, f.titles);
    const h = c.rivalHist;
    if (R && R.rows.filter(([, a, b]) => a < b).length > R.rows.filter(([, a, b]) => a > b).length) {
      out.push(['⚔️', !h ? esc(R.name) + ' levou a melhor.' : R.back ? esc(R.name) + ' levou a melhor de novo (placar histórico ' + h.me + ' x ' + h.him + '). Ele volta na próxima carreira.'
        : esc(R.name) + ' levou a melhor. Ele volta na próxima carreira para a revanche.']);
    } else if (R && R.back && h && h.won) out.push(['⚔️', 'Revanche feita contra ' + esc(R.name) + ': placar histórico ' + h.me + ' x ' + h.him]);
    if (!out.length) return '';
    return '<div class="o6-goal">' + out.slice(0, 3).map(([ic, t]) => '<p>' + U.emo(ic, 'xs') + ' ' + t + '</p>').join('') + '</div>';
  }
  // Origem e desafio da carreira (engine/origins.js)
  function originLine(c, f) {
    const o = S.ORIGIN_BY_ID[c.origin], ch = f.challenge && S.CHALLENGE_BY_ID[f.challenge.id];
    if ((!o || o.id === 'base') && !ch) return '';
    return '<p class="muted small patr">' + [o && o.id !== 'base' ? U.emo(o.icon, 'sm') + ' ' + esc(o.name) : '',
      ch ? U.emo(ch.icon, 'sm') + ' Desafio ' + esc(ch.name) + (f.challenge.ok ? ' cumprido: +' + ch.v + ' pts' : ' quebrado') : ''].filter(Boolean).join(' · ') + '</p>';
  }
  // Barra de pontos: onde a carreira parou dentro da faixa da nota e quanto faltou para a próxima
  function pointsBar(f, rankTxt) {
    const G2 = f.bands || S.GRADES, i = G2.findIndex(([g]) => g === f.grade), next = i > 0 ? G2[i - 1] : null, lo = G2[i] ? G2[i][1] : 0;
    const pct = next ? Math.max(4, Math.min(100, Math.round((f.score - lo) / Math.max(1, next[1] - lo) * 100))) : 100;
    const miss = next ? next[1] - f.score : 0;
    return '<div class="o6-pts"><div class="o6-pl"><b>' + U.pts(f.score) + ' pontos</b><span>' + (next ? (miss === 1 ? 'faltou 1 para ' : 'faltaram ' + U.pts(miss) + ' para ') + next[0] : 'nota máxima') + '</span></div>' +
      '<i><em style="width:' + pct + '%"></em></i>' + (rankTxt ? '<small>' + rankTxt + '</small>' : '') + '</div>';
  }
  // Revanche (engine/rival.js): só nas carreiras normais (ui/start.js marca rivalKeep). Quem levou a melhor fica guardado
  // e volta na carreira seguinte; venceu ou empatou, a próxima tem rival novo
  const RIVAL_KEY = 'climbix-rival-v1';
  function rivalCarry(c, f) {
    if (!c.rivalKeep || c.rivalHist) return;
    const R = S.rivalSummary && S.rivalSummary(c, f.titles), rv = c.rival;
    if (!R || !rv) return;
    const wins = R.rows.filter(([, a, b]) => a > b).length, loses = R.rows.filter(([, a, b]) => a < b).length;
    const b = rv.back || { me: 0, him: 0 };
    const h = c.rivalHist = { me: b.me + (wins > loses ? 1 : 0), him: b.him + (loses > wins ? 1 : 0), won: wins > loses };
    if (loses > wins) store(RIVAL_KEY, { name: rv.name, country: rv.country, me: h.me, him: h.him, at: Date.now() });
    else try { localStorage.removeItem(RIVAL_KEY); } catch (e) {}
  }

  function finale() {
    const f = S.finish(G.c);
    if (window.CLIMBIX_STAT) window.CLIMBIX_STAT('end', G.c.mode || 'rapida', 0, 'c' + G.c.tseed); // contagem anônima
    rivalCarry(G.c, f);
    const ach = U.achRecord(G.c, f);
    // Pacotinhos da carreira: fim de carreira, nota, títulos grandes, conquistas novas e carreira do dia
    const packWhy = U.ITEMS.careerWhy(G.c, f, ach);
    // Sequência de dias: a primeira carreira terminada no dia libera o prêmio do dia (pega-se tocando no calendário)
    const skGot = packWhy.length ? U.ITEMS.streakRecord() : null;
    U.ITEMS.earn(packWhy);
    U.rankSave(G.c, f); // carreira encerrada: entra no ranking com a pontuação
    const T = G.c.totals;
    store(U.saveKey(G.c), { c: null, at: Date.now() });
    const hall = (load(HALL) || []);
    hall.push({ name: G.c.name, grade: f.grade, score: f.score, verdict: f.verdict, goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon, pos: G.c.pos, cs: T.cs || 0, penSaved: T.penSaved || 0, peak: G.c.peak });
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
    const rankTxt = rank === 1 ? (hall.length > 1 ? 'Novo recorde no seu Hall da Fama!' : '') : '#' + rank + ' no seu Hall da Fama';
    const first = careerStats(G.c)[0];
    // Perfil: XP da carreira e metas da semana (os pacotinhos delas entram na fila junto)
    const prof = U.profileCareer(G.c, f);
    const prizes = U.profileFinale(prof) + U.streakFinale(skGot) + U.packFinale(packWhy);
    // Tela curta: carta com a medalha da nota, os números, a barra de pontos, Compartilhar e Desafiar, os prêmios numa faixa,
    // e links pequenos que abrem a edição da carta e o resumo (álbum, troféus, ranking, números, conquistas, de onde veio a nota)
    render(
      '<div class="eyebrow o6-eb">Fim de carreira · ' + YEAR0 + '–' + (YEAR0 + G.c.season) + '</div>' +
      '<h2 class="o6-v">' + esc(f.verdict) + '</h2>' +
      '<div class="o6-hero"><div class="fut card3d-host" id="fut-host"><canvas id="fut" aria-label="Card do jogador"></canvas></div>' +
        '<div class="o6-medal g-' + f.grade + '"><small>Nota</small><b>' + f.grade + '</b></div></div>' +
      '<div class="o6-nums"><div><b>' + first[0] + '</b><small>' + first[1].toLowerCase() + '</small></div><div><b>' + f.titles + '</b><small>' + (f.titles === 1 ? 'título' : 'títulos') + '</small></div>' +
        '<div><b>' + T.ballon + '</b><small>' + (T.ballon === 1 ? 'Bola de Ouro' : 'Bolas de Ouro') + '</small></div></div>' +
      pointsBar(f, rankTxt) +
      '<p class="mo-climb" id="mo-climb" hidden></p>' +
      nextGoal(G.c, f, hall, rank) +
      '<div class="o6-dz">' + U.challengeFinale(G.c, f) + '</div>' +
      (prizes ? '<div class="fin-prizes o6-prizes">' + prizes + '</div>' : '') +
      '<div class="o6-links"><button class="link-btn" data-o6="ed">Editar carta</button><button class="link-btn" data-o6="more">Resumo' + (fresh ? ' <em>' + fresh + '</em>' : '') + '</button>' +
        '<button class="link-btn" id="b-save">Salvar imagem</button></div>' +
      '<div class="o6-panel" id="o6-ed" hidden><div class="ed-box" id="ed-box"></div></div>' +
      '<details class="fin-more o6-panel" id="o6-more"><summary>Resumo da carreira' + (fresh ? ' <em>' + fresh + (fresh > 1 ? ' conquistas novas' : ' conquista nova') + '</em>' : '') + '</summary>' +
      '<div class="fin-links">' + (G.c.seasons.length ? '<button id="b-album">' + U.emo('📖', 'sm') + '<span>Álbum</span></button>' : '') +
        (Object.keys(G.c.trophies || {}).length ? '<button id="b-sala-car">' + U.emo('🏆', 'sm') + '<span>Troféus</span></button>' : '') +
        '<button id="b-hall">' + U.emo('🏅', 'sm') + '<span>Hall da Fama</span></button></div>' +
      U.dailyFinish(G.c, f) + U.finaleRank() +
      '<div class="final">' +
      '<div class="headrow"><div class="grade ' + f.grade + '">' + f.grade + '</div><div class="who"><b>' + esc(G.c.name) + '</b><span>' + U.flag(cty.flag) + ' ' + D.POS[G.c.pos].name + ' · ' + S.startAge(G.c) + ' a ' + G.c.age + ' anos · pico ' + G.c.peak + '</span></div></div>' +
      '<div class="stats"><div><b>' + T.games + '</b><span>Jogos</span></div>' + careerStats(G.c).map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('') +
      '<div><b>' + f.titles + '</b><span>Títulos</span></div><div><b>' + T.ballon + '</b><span>Bolas de Ouro</span></div><div><b>' + f.nClubs + '</b><span>Clubes</span></div></div>' +
      (T.wcApps ? '<p class="muted small patr">' + U.emo('🌍', 'sm') + ' Copas do Mundo: ' + T.wcApps + (T.wcApps > 1 ? ' disputadas' : ' disputada') + ' · ' + (T.wc || 0) + (T.wc === 1 ? ' título' : ' títulos') + ' · ' + (T.natGames ? D.plural(T.natGames, 'jogo', 'jogos') + ', ' : '') + D.plural(T.wcGoals || 0, 'gol', 'gols') + ' (já no total)</p>' : '') +
      (T.cwcApps ? '<p class="muted small patr">' + U.emo('🌐', 'sm') + ' Mundiais de Clubes: ' + T.cwcApps + (T.cwcApps > 1 ? ' disputados' : ' disputado') + ' · ' + (T.cwc || 0) + (T.cwc === 1 ? ' título' : ' títulos') + ' · ' + (T.cwcGoals || 0) + ' gols (já no total)</p>' : '') +
      originLine(G.c, f) + rivalBlock(G.c, f) +
      '<p class="muted small patr">' + U.emo('💰', 'sm') + ' Patrimônio R$ ' + money(G.c.money) + (G.c.buys ? ' · ' + G.c.buys + (G.c.buys > 1 ? ' melhorias' : ' melhoria') + ' com pontos de evolução' : '') + '</p>' +
      '<div class="timeline">' + G.c.spells.map(s => '<div><span>' + String(YEAR0 + s.from - S.startAge(G.c)).slice(2) + '–' + String(YEAR0 + s.to - S.startAge(G.c) + 1).slice(2) + '</span><span>' + crest(s.club, 'xs') + esc(club(s.club).name) + (s.loan ? ' <small class="tl-loan">empréstimo</small>' : '') + '</span><span>' + (G.c.pos === 'GOL' ? (s.cs || 0) + ' SG' : G.c.pos === 'ZAG' ? (s.cs || 0) + 'SG ' + s.goals + 'G' : s.goals + 'G ' + s.assists + 'A') + (s.titles ? ' · ' + s.titles + U.emo('🏆', 'xs') : '') + '</span></div>').join('') + '</div>' +
      (Object.keys(G.c.trophies || {}).length ? '<div class="room-title">Sala de troféus</div><div class="room">' +
        Object.entries(G.c.trophies).sort((a, b) => ROOM.indexOf(a[1].type) - ROOM.indexOf(b[1].type))
          .map(([name, t]) => '<div>' + trophy(t.type, 52, name) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '') +
      (f.bonus.length ? '<div class="room-title">Despedida</div><ul class="why">' + f.bonus.map(b => '<li><span>' + esc(b.txt) + '</span><b class="up">+' + b.v + '</b></li>').join('') + '</ul>' : '') +
      U.achBlock(ach) +
      scoreHow(f) +
      '</div>' + (hall.length > 1 ? U.feedbackCard() : '') + '</details>' + // 1ª carreira: a opinião fica na tela inicial
      // Compartilhar e jogar de novo numa barra presa embaixo, ao alcance do polegar. Fica por último: o degradê dela
      // passa por baixo do que vem depois, então no meio da tela cortava o Desafiar
      '<div class="fin-acts o6-acts go-bar"><button class="btn" id="b-share">Compartilhar carta</button><button class="btn o6-again" id="b-again">Nova carreira</button></div>'
    );
    if (!screen.querySelector('.o6-dz').children.length) screen.querySelector('.o6-dz').remove();
    if ($('b-packs')) $('b-packs').textContent = 'Abrir';
    // Links pequenos: abrem (e fecham) a edição da carta e o resumo
    screen.querySelectorAll('[data-o6]').forEach(b => b.onclick = () => {
      const ed = $('o6-ed'), more = $('o6-more');
      if (b.dataset.o6 === 'ed') { ed.hidden = !ed.hidden; if (!ed.hidden) { more.open = false; ed.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }
      else { more.open = !more.open; if (more.open) { ed.hidden = true; more.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
      screen.querySelectorAll('[data-o6]').forEach(x => x.classList.toggle('on', x.dataset.o6 === 'ed' ? !ed.hidden : more.open));
    });
    U.tip('fim');
    U.streakBind();
    // Edição especial do jornal com a despedida
    const retired = G.c;
    // A nota da carreira entra primeiro (motion.js); o jornal de despedida vem quando ela fecha
    setTimeout(() => U.scoreReveal(f, () => setTimeout(() => U.farewellPaper(retired, f, () => U.rankClimb($('mo-climb'), f.score)), 300)), 250);
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
    // Travado: de onde sai e a troca por fichas (ao trocar, já aplica na carta)
    function lockNote(it, onTraded) {
      msg = esc(it.name + ' · ' + I.RAR_NAME[it.rk] + ': sai nos pacotinhos.') + ' <button class="link-btn ed-trade" id="ed-trade">Trocar por ' + I.COST[it.rk] + ' fichas</button>';
      drawEd();
      const b = $('ed-trade'); if (b) b.onclick = () => U.tradeSheet(it.id, onTraded);
    }
    // No computador as fileiras quebram em linhas (style.css): não há o que arrastar
    const desk = U.tapWord && U.tapWord(true) === 'Clique';
    function drawEd() {
      const box = $('ed-box');
      if (!box) return;
      let body = '';
      // Assinaturas numa linha que rola para o lado: as liberadas primeiro, as do pacotinho depois (tocar mostra como pegar)
      const sigs = Object.entries(SG).sort((a, b) => !!signLock(a[0]) - !!signLock(b[0])), sigLocked = sigs.filter(([k]) => signLock(k)).length;
      if (tab === 'sign') body = '<div class="sig-grid">' + sigs.map(([k, F]) => {
        const it = signLock(k);
        return '<button data-sign="' + k + '" class="sig-b' + (cardData.sign === k ? ' on' : '') + (it ? ' lock ' + U.rarCls(it.rk) : '') + '">' +
          '<span style="font-family:' + esc(F.family) + ', cursive;font-size:' + sigSize + 'px">' + esc(shareName) + '</span><small>' + (it ? U.emo('🔒', 'xs') + ' ' : '') + F.label + '</small></button>';
      }).join('') + '</div>' + (sigLocked ? '<p class="ed-cnt">' + (sigs.length - sigLocked) + ' liberadas · ' + sigLocked + (desk ? ' nos pacotinhos' : ' nos pacotinhos · arraste para ver todas') + '</p>' : '') +
        (msg ? '<p class="muted small sig-msg">' + msg + '</p>' : '');
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
      // A fileira redesenhada (escolher um item) fica onde estava; aberta agora, vai até a assinatura escolhida
      const old = box.querySelector('.sig-grid, .fin-grid'), oldCls = old && old.className, oldX = old ? old.scrollLeft : 0;
      box.innerHTML = '<div class="ed-t">Edite sua carta</div>' + (TABS.length > 1 ? '<div class="ed-tabs">' + TABS.map(([k, l]) => '<button data-edtab="' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' : '') + body;
      box.querySelectorAll('[data-edtab]').forEach(b => b.onclick = () => { tab = b.dataset.edtab; msg = ''; drawEd(); });
      const row = box.querySelector('.sig-grid, .fin-grid'), onSig = box.querySelector('.sig-b.on');
      if (row && row.className === oldCls) row.scrollLeft = oldX;
      else if (onSig) onSig.parentNode.scrollLeft = Math.max(0, onSig.offsetLeft - onSig.parentNode.offsetLeft - 24);
      box.querySelectorAll('[data-sp]').forEach(sc => {
        window.CRAQUE_CARD(sc, spData(sc.dataset.sp));
        sc.onclick = () => { curSp = sc.dataset.sp; redraw(); drawEd(); };
      });
      box.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
        const k = b.dataset.sign, it = signLock(k);
        if (it) return lockNote(it, () => { msg = ''; cardData.sign = k; U.collectPatch(colAt, { sign: k }); redraw(); drawEd(); });
        msg = ''; cardData.sign = k; U.collectPatch(colAt, { sign: k }); redraw(); drawEd();
      });
      box.querySelectorAll('[data-fin]').forEach(b => b.onclick = () => {
        const k = b.dataset.fin, it = k && finLock(k);
        if (it) return lockNote(it, () => { msg = ''; cardData.finish = k; U.collectPatch(colAt, { finish: k }); if (curSp !== 'final') curSp = 'final'; redraw(); drawEd(); });
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
    // Compartilhar: a imagem da carta + o link curto que abre a carta 3D
    $('b-share').onclick = () => U.shareCard(shown, $('b-share'));
    if ($('b-packs')) $('b-packs').onclick = () => U.openPacks(() => { const b = screen.querySelector('.pk-won'); if (b && !U.ITEMS.get().packs.length) b.remove(); });
    $('b-again').onclick = U.create;
    U.challengeFinaleBind(retired, f);
    if ($('b-feedback')) $('b-feedback').onclick = () => U.feedback('fim', { pos: retired.pos, seasons: retired.seasons.length, grade: f.grade }, () => {
      const card = screen.querySelector('.fb-card'); if (card) card.outerHTML = '<div class="card fb-card done"><div>' + U.emo('💚', 'sm') + '<b>Opinião enviada</b><span>Valeu! Ela ajuda a decidir o que muda no jogo.</span></div></div>';
    });
    // Vai para o início e rola até o Hall da Fama (id próprio: "b-home" é o botão de casa da barra)
    $('b-hall').onclick = () => { U.home(); setTimeout(() => { const h = document.querySelector('.hall'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250); };
  }

  Object.assign(U, { finale, careerStatsOf: careerStats });
})();
