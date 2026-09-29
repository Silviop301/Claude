// Interface — base, janela de transferências e propostas
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- propostas ----------
  // Salário traduzido em investimentos por temporada
  function buysTag(wage) {
    const n = S.buysWith(G.c, wage * 52);
    return '<span class="tag' + (n >= 2 ? ' gold' : '') + '">' + (n ? '≈ ' + n + (n > 1 ? ' compras' : ' compra') + '/ano' : 'sem sobra p/ investir') + '</span>';
  }
  function offerCard(o, idx) {
    const cl = club(o.club), lg = league(o.club);
    const kinds = { base: ['Base', ''], up: ['Clube maior', 'blue'], mid: ['Protagonista', 'green'], money: ['Proposta milionária', 'gold'], home: ['Volta pra casa', 'red'], stay: ['Renovar', ''] };
    const [kname, kcls] = kinds[o.kind] || ['', ''];
    const roleCls = o.share >= 0.78 ? 'green' : o.share >= 0.5 ? 'blue' : 'red';
    return '<button class="choice offer card" data-i="' + idx + '" style="display:flex">' +
      '<div class="top"><span class="club">' + crest(cl.id) + esc(cl.name) + '</span><span class="stars">' + stars(cl.tier) + '</span></div>' +
      '<div class="lg">' + lg.flag + ' ' + lg.name + ' · força ' + cl.strength + '</div>' +
      '<div class="facts">' + (kname ? '<span class="tag ' + kcls + '">' + kname + '</span>' : '') +
      '<span class="tag ' + roleCls + '">' + o.role + '</span><span class="tag">R$ ' + money(o.wage) + '/sem</span>' + buysTag(o.wage) + '<span class="tag">' + o.years + (o.years > 1 ? ' anos' : ' ano') + '</span></div></button>';
  }

  // Quadro "Hoje × Proposta": clube, força, papel, salário e contrato lado a lado
  function dealCompare(cur, o) {
    const a = club(cur.club), b = club(o.club);
    const diff = (x, y) => (y > x ? ' up' : y < x ? ' down' : '');
    const row = (lbl, x, y, cls) => '<tr><th>' + lbl + '</th><td>' + x + '</td><td class="' + (cls || '') + '">' + y + '</td></tr>';
    return '<table class="deal"><thead><tr><th></th><th>Hoje</th><th>Proposta</th></tr></thead><tbody>' +
      row('Clube', crest(a.id, 'xs') + esc(a.name), crest(b.id, 'xs') + esc(b.name)) +
      row('Liga', league(a.id).flag + ' ' + esc(league(a.id).name), league(b.id).flag + ' ' + esc(league(b.id).name)) +
      row('Força', a.strength + ' · ' + stars(a.tier), b.strength + ' · ' + stars(b.tier), diff(a.strength, b.strength)) +
      row('Seu papel', esc(cur.role), esc(o.role), diff(cur.share, o.share)) +
      row('Salário', 'R$ ' + money(cur.wage) + '/sem', 'R$ ' + money(o.wage) + '/sem', diff(cur.wage, o.wage)) +
      row('Contrato', cur.years > 0 ? cur.years + (cur.years > 1 ? ' anos restantes' : ' ano restante') : 'acabando', o.years + (o.years > 1 ? ' anos' : ' ano')) +
      '</tbody></table>';
  }
  // Verso do card da proposta: o que muda em relação a hoje, e o 2º toque assina
  const signTxt = o => {
    if (o.kind === 'stay' || !G.c.club) return '<b>Toque de novo para ' + (o.kind === 'stay' ? 'renovar' : 'assinar') + '</b>';
    const cur = S.currentDeal(G.c), w = o.wage / Math.max(1, cur.wage);
    return '<b>Toque de novo para assinar</b><small>Salário ' + (w >= 1.05 ? '+' + Math.round((w - 1) * 100) + '%' : w <= 0.95 ? '−' + Math.round((1 - w) * 100) + '%' : 'igual') +
      ' · ' + esc(o.role) + (o.role !== cur.role ? ' (hoje ' + esc(cur.role).toLowerCase() + ')' : '') + '</small>';
  };

  function academy() {
    G.step = 'academy';
    const offers = S.offers(G.c, true);
    bar();
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">' + year() + ' · 16 anos</div><h2>Três clubes querem você na base</h2>' +
      '<p class="lead">Clube mais forte dá mais chance de título, mas menos minutos em campo.</p>' +
      '<div class="choices">' + offers.map(offerCard).join('') + '</div>'
    );
    // Ainda sem clube: voltar descarta este garoto (nada foi salvo)
    $('b-back-home').onclick = () => U.ask('Voltar ao início?', 'Este jogador ainda não assinou com nenhum clube e não será salvo.', 'Voltar', U.home);
    // Dois toques: o 1º vira o card ("Assinar com..."), o 2º assina (evita escolher sem querer)
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = offers[+b.dataset.i];
      if (!U.arm(b, signTxt(o))) return;
      S.join(G.c, o);
      U.preseason();
    });
  }

  function windowOffers() {
    G.step = 'offers';
    save();
    bar();
    const ended = G.c.contract <= 0;
    const offers = S.offers(G.c, false);
    const all = offers.concat([S.stayOffer(G.c)]);
    const noOffers = !offers.length;
    render(
      '<div class="eyebrow">Janela de transferências · ' + year() + '</div>' +
      '<h2>' + (ended ? 'Seu contrato com ' + D.o(esc(club(G.c.club).name)) + ' acabou' : 'Seu empresário abriu o mercado') + '</h2>' +
      '<p class="lead">' + (noOffers ? 'Nenhum clube novo apareceu. ' : '') + 'Nota geral ' + S.ovr(G.c) + ' · ⭐ ' + S.fameLabel(G.c.fame) + '. A última opção é renovar com o clube atual.</p>' +
      '<p class="muted small">⭐ Fama traz propostas de clubes maiores, salários mais altos' + (G.c.fame >= 150 ? ', vaga mais fácil na seleção' : '') + ' e mais votos na Bola de Ouro.</p>' +
      '<div class="choices">' + all.map(offerCard).join('') + '</div>' +
      (S.canRetire(G.c) ? '<button class="btn ghost" id="b-retire">Pendurar as chuteiras</button>' : '')
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = all[+b.dataset.i], prev = G.c.spells[G.c.spells.length - 1], moving = o.club !== G.c.club;
      if (!U.arm(b, signTxt(o))) return;
      S.join(G.c, o);
      // Troca de clube vira edição extra do jornal
      if (moving) { save(); bar(); U.transferPaper(G.c, prev, o, U.preseason); } else U.preseason();
    });
    if ($('b-retire')) $('b-retire').onclick = U.finale;
  }

  Object.assign(U, { buysTag, offerCard, dealCompare, academy, windowOffers });
})();
