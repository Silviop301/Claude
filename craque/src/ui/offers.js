// Interface — base, janela de transferências e propostas
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- propostas ----------
  // Salário traduzido em investimentos por temporada
  function buysTag(wage) {
    const n = S.buysWith(G.c, wage * 52);
    return '<span class="tag">' + (n ? '≈ ' + n + (n > 1 ? ' compras' : ' compra') + '/ano' : 'sem sobra p/ investir') + '</span>';
  }
  function offerCard(o, idx) {
    const cl = club(o.club), lg = league(o.club);
    const kinds = { ask: ['Pedido seu', 'blue'], base: ['Base', ''], up: ['Clube maior', 'blue'], mid: ['Protagonista', 'green'], loan: ['Empréstimo · 1 ano', 'blue'], money: ['Proposta milionária', 'gold'], home: ['Volta pra casa', 'red'], stay: ['Renovar', ''] };
    const [kname, kcls] = kinds[o.kind] || ['', ''];
    const roleCls = o.share >= 0.78 ? 'green' : o.share >= 0.5 ? 'blue' : 'red';
    return '<button class="choice offer card" data-i="' + idx + '" style="display:flex">' +
      '<div class="top"><span class="club">' + crest(cl.id) + esc(cl.name) + '</span><span class="stars">' + stars(cl.tier) + '</span></div>' +
      '<div class="lg">' + lg.flag + ' ' + lg.name + (kname ? ' · <b class="of-kind ' + kcls + '">' + kname + '</b>' : '') + '</div>' +
      // O dilema do jogo em destaque: quanto você vai jogar × quão forte é o time
      '<div class="of-key"><span class="of-role ' + roleCls + '">' + o.role + '</span>' +
      '<span class="of-str"><small>Força do time</small><b>' + cl.strength + '</b><i><em style="width:' + Math.max(8, Math.min(100, Math.round((cl.strength - 40) / 55 * 100))) + '%"></em></i></span></div>' +
      '<div class="facts"><span class="tag">R$ ' + money(o.wage) + '/sem</span>' + buysTag(o.wage) + '<span class="tag">' + o.years + (o.years > 1 ? ' anos' : ' ano') + '</span></div></button>';
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
    const win = S.windowState(G.c, true), offers = win.offers;
    bar();
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">' + year() + ' · 16 anos</div><h2>Três clubes querem você na base</h2>' +
      '<p class="lead">Clube mais forte dá mais chance de título, mas menos minutos em campo.</p>' +
      '<div class="choices">' + offers.map(offerCard).join('') + '</div>' + tools(win, true)
    );
    bindTools(true, academy);
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
    const win = S.windowState(G.c), offers = win.offers;
    save();
    const all = offers.concat([S.stayOffer(G.c)]);
    const noOffers = !offers.length;
    render(
      '<div class="eyebrow">Janela de transferências · ' + year() + '</div>' +
      '<h2>' + (ended ? 'Seu contrato com ' + D.o(esc(club(G.c.club).name)) + ' acabou' : 'Seu empresário abriu o mercado') + '</h2>' +
      '<p class="lead">' + (noOffers ? 'Nenhum clube novo apareceu. ' : '') + 'Nota geral ' + S.ovr(G.c) + ' · ⭐ ' + S.fameLabel(G.c.fame) + '. A última opção é renovar com o clube atual.</p>' +
      '<p class="muted small">⭐ Fama traz propostas de clubes maiores, salários mais altos' + (G.c.fame >= 150 ? ', vaga mais fácil na seleção' : '') + ' e mais votos na Bola de Ouro.</p>' +
      '<div class="choices">' + all.map(offerCard).join('') + '</div>' + tools(win, false) +
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
    bindTools(false, windowOffers);
    // Proposta nova do pedido ao empresário: destaca e mostra
    // Propostas novas do pedido ao empresário (até duas): destaca todas e rola até a primeira
    if (win.askFresh) {
      const n = win.askFresh === true ? 1 : win.askFresh;
      const fresh = [...Array(n)].map((_, k) => screen.querySelector('.offer[data-i="' + (offers.length - n + k) + '"]')).filter(Boolean);
      fresh.forEach(el => el.classList.add('fresh'));
      if (fresh[0]) fresh[0].scrollIntoView({ block: 'center' });
      win.askFresh = false;
    }
  }

  // Linha discreta embaixo das propostas: novas propostas (1x) e pedir um país/liga ao empresário (1x)
  function tools(win, academy) {
    return '<div class="off-tools"><button class="tool" id="b-reroll"' + (win.reroll ? ' disabled' : '') + '>' + U.ICON.refresh + ' Novas propostas<small>' + (win.reroll ? 'já usado' : '1 vez por janela') + '</small></button>' +
      (academy ? '' : '<button class="tool" id="b-askl"' + (win.ask ? ' disabled' : '') + '>' + U.ICON.globe + ' Pedir país ou liga<small>' + (win.ask ? 'já usado' : 'o empresário tenta') + '</small></button>') + '</div>' +
      (win.askMsg && !academy ? '<p class="ask-msg">' + esc(win.askMsg) + '</p>' : '');
  }
  function bindTools(academy, redraw) {
    $('b-reroll').onclick = () => U.ask('Pedir novas propostas?', 'As propostas atuais somem e chegam outras. Só dá para fazer isso uma vez' + (academy ? '.' : ' por janela.'), 'Pedir novas', () => { S.rerollOffers(G.c, academy); save(); sfx('whistle'); redraw(); });
    if ($('b-askl')) $('b-askl').onclick = leaguePicker;
  }
  // Escolha da liga: agrupada por país, com o nível e a chance de o empresário conseguir
  function leaguePicker() {
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    const byCountry = {};
    D.LEAGUES.forEach(l => { (byCountry[l.country] = byCountry[l.country] || []).push(l); });
    const lvl = l => { const cl = D.CLUBS.filter(x => x.league === l.id); return cl.length ? Math.round(cl.reduce((a, x) => a + x.tier, 0) / cl.length) : 1; };
    w.innerHTML = '<div class="sheet"><div class="sh-head"><div><b>Pedir ao empresário</b><span>Escolha a liga. Ele tenta um clube que te queira (uma vez por janela).</span></div><button class="sh-x" aria-label="Fechar">✕</button></div>' +
      '<div class="sh-body lg-pick">' + Object.keys(byCountry).map(ct => '<div class="sh-sec">' + byCountry[ct][0].flag + ' ' + esc(ct) + '</div>' +
        byCountry[ct].map(l => { const ch = Math.round(S.askChance(G.c, l.id) * 100); return '<button class="lg-row" data-lg="' + l.id + '"><b>' + esc(l.name) + '</b><span class="stars">' + stars(lvl(l)) + '</span><em class="' + (ch >= 60 ? 'hi' : ch < 25 ? 'lo' : '') + '">' + ch + '%</em></button>'; }).join('')).join('') + '</div></div>';
    const close = () => w.remove();
    w.onclick = e => { if (e.target === w) close(); };
    w.querySelector('.sh-x').onclick = close;
    w.querySelectorAll('[data-lg]').forEach(b => b.onclick = () => {
      if (!U.arm(b, '<b>Toque de novo para pedir</b>')) return;
      const res = S.askLeague(G.c, b.dataset.lg);
      close();
      if (res && res.ok) { S.windowState(G.c).askFresh = res.offers.length; sfx('levelup'); } else sfx('miss');
      save();
      windowOffers();
    });
    document.body.appendChild(w);
  }

  // ---------- pouco espaço no elenco ----------
  // Depois de uma temporada com poucos jogos: empréstimo, conversa com o técnico, pedir para sair ou seguir brigando
  function squad() {
    const sq = S.benchCase(G.c);
    if (!sq) return U.preseason();
    G.step = 'squad';
    save();
    bar();
    const last = G.c.seasons[G.c.seasons.length - 1], cl = club(G.c.club), role = S.role(G.c, cl);
    const talk = Math.round(S.talkChance(G.c) * 100);
    const opt = (id, ico, tone, t, d) => '<button class="choice" data-sq="' + id + '"><span class="ic">' + U.seal(ico, tone) + '</span><b>' + t + '</b><span class="d">' + d + '</span></button>';
    render(
      '<div class="eyebrow">Pouco espaço · ' + year() + '</div>' +
      '<h2>' + last.games + (last.games === 1 ? ' jogo' : ' jogos') + ' ' + D.no(esc(cl.name)) + ' na última temporada</h2>' +
      '<p class="lead">Hoje você é <b>' + role.name.toLowerCase() + '</b>: o técnico prefere outros. Contrato: ' + G.c.contract + (G.c.contract > 1 ? ' anos' : ' ano') + '. O que fazer?</p>' +
      '<div class="choices">' +
      (sq.loans.length ? opt('loan', 'repeat', 'blue', 'Pedir empréstimo', 'Uma temporada como titular num clube menor. Depois você volta, com o contrato valendo.') : '') +
      opt('talk', 'handshake', 'green', 'Conversar com o técnico', 'Chance de ' + talk + '% de ganhar mais minutos na próxima temporada. Se não der, a relação esfria.') +
      opt('out', 'door-open', 'red', 'Pedir para sair', 'A janela abre agora, com uma proposta a mais. Torcida e técnico não gostam.') +
      opt('stay', 'shield', 'sand', 'Seguir brigando por espaço', 'Nada muda: treinar e esperar a chance.') + '</div>'
    );
    screen.querySelectorAll('[data-sq]').forEach(b => b.onclick = () => {
      const k = b.dataset.sq;
      if (k === 'loan') return loanPick();
      if (!U.arm(b, '<b>Toque de novo para confirmar</b>')) return;
      if (k === 'talk') {
        const r = S.coachTalk(G.c);
        save(); bar(); sfx(r.ok ? 'levelup' : 'miss');
        render('<div class="card ev-res ' + (r.ok ? 'ok' : 'ko') + '"><span class="er-ic">' + U.seal('handshake', r.ok ? 'green' : 'red', 'lg') + '</span><div class="eyebrow">Conversa com o técnico</div><p class="er-txt">' + r.text + '</p></div>' +
          '<button class="btn" id="b-next">Pré-temporada</button>', { center: true });
        $('b-next').onclick = U.preseason;
      } else if (k === 'out') { S.askOut(G.c); save(); windowOffers(); }
      else { S.stayAndFight(G.c); save(); U.preseason(); }
    });
  }
  // Destinos do empréstimo: cartas de proposta (1 ano, salário pago pelo seu clube)
  function loanPick() {
    const sq = S.benchCase(G.c);
    if (!sq) return U.preseason();
    render(
      '<button class="back-link" id="b-sq-back">‹ Voltar</button>' +
      '<div class="eyebrow">Empréstimo · ' + year() + '</div><h2>Quem quer você por uma temporada</h2>' +
      '<p class="lead">Seu clube segue pagando o salário. No fim da temporada você volta ' + D.ao(esc(club(G.c.club).name)) + '.</p>' +
      '<div class="choices">' + sq.loans.map(offerCard).join('') + '</div>'
    );
    $('b-sq-back').onclick = squad;
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = sq.loans[+b.dataset.i];
      if (!U.arm(b, '<b>Toque de novo para ir emprestado</b>')) return;
      S.loanOut(G.c, o);
      save(); bar(); sfx('whistle');
      U.preseason();
    });
  }

  Object.assign(U, { buysTag, offerCard, dealCompare, academy, windowOffers, squad });
})();
