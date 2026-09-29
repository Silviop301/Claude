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

  function academy() {
    G.step = 'academy';
    const offers = S.offers(G.c, true);
    bar();
    render(
      '<div class="eyebrow">' + year() + ' · 16 anos</div><h2>Três clubes querem você na base</h2>' +
      '<p class="lead">Clube mais forte dá mais chance de título, mas menos minutos em campo.</p>' +
      '<div class="choices">' + offers.map(offerCard).join('') + '</div>'
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      S.join(G.c, offers[+b.dataset.i]);
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
      '<p class="lead">' + (noOffers ? 'Nenhum clube novo apareceu. ' : '') + 'Nota geral ' + S.ovr(G.c) + ' · fama ' + Math.round(G.c.fame) + '. A última opção é renovar com o clube atual.</p>' +
      '<div class="choices">' + all.map(offerCard).join('') + '</div>' +
      (S.canRetire(G.c) ? '<button class="btn ghost" id="b-retire">Pendurar as chuteiras</button>' : '')
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = all[+b.dataset.i], prev = G.c.spells[G.c.spells.length - 1], moving = o.club !== G.c.club;
      S.join(G.c, o);
      // Troca de clube vira edição extra do jornal
      if (moving) { save(); bar(); U.transferPaper(G.c, prev, o, U.preseason); } else U.preseason();
    });
    if ($('b-retire')) $('b-retire').onclick = U.finale;
  }

  Object.assign(U, { buysTag, offerCard, academy, windowOffers });
})();
