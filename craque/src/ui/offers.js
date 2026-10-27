// Interface — base, janela de transferências e propostas
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- propostas ----------
  // Cor da faixa do cartão: a cor mais escura da camisa (camisa branca escurece para o texto branco aparecer)
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const mix = (h, t, k) => { const a = hexRgb(h), b = hexRgb(t); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  function bandColor(id) {
    const k = ((window.CRAQUE_KITS || {})[id] || ['#1F6B3E', '#0B1F14']).filter(h => /^#[0-9a-f]{6}$/i.test(h));
    if (!k.length) return '#1F6B3E';
    let c = k.slice().sort((x, y) => lum(x) - lum(y))[0];
    if (lum(c) > 0.45) c = mix(c, '#13201A', 0.62);
    else if (lum(c) < 0.06) c = mix(c, '#2A3A32', 0.5);
    return c;
  }
  // Cartão grande da proposta: faixa com a cor e o escudo do clube, papel no elenco, força, salário, anos,
  // (na janela) os pedidos do contrato e o botão de assinar, que pede dois toques. opts.terms: html dos pedidos
  function offerCard(o, idx, opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    const cl = club(o.club), lg = league(o.club);
    const kinds = { ask: ['Pedido seu', 'blue'], base: ['Base', ''], up: ['Clube maior', 'blue'], mid: ['Protagonista', 'green'], loan: ['Empréstimo · 1 ano', 'blue'], money: ['Proposta milionária', 'gold'], home: ['Volta pra casa', 'red'], stay: ['Renovar', ''] };
    const [kname, kcls] = kinds[o.kind] || ['', ''];
    const roleCls = o.share >= 0.78 ? 'green' : o.share >= 0.5 ? 'blue' : 'red';
    // O que o papel quer dizer na prática (quem chega agora não sabe que "banco" é quase não jogar)
    const roleNote = o.share >= 0.9 ? 'joga tudo' : o.share >= 0.78 ? 'joga quase sempre' : o.share >= 0.5 ? 'metade dos jogos' : o.share >= 0.3 ? 'entra pouco' : 'quase não joga';
    const segs = Math.max(1, Math.min(5, Math.round(o.share * 5)));
    const breaks = G.c && (S.breaksChallenge(G.c, o) || (o.kind === 'loan' && G.c.challenge === 'fiel' && !G.c.chFail));
    const verb = o.kind === 'stay' ? 'Renovar com ' : o.kind === 'loan' ? 'Ir emprestado para ' : 'Assinar com ';
    const w = money(o.wage);
    return '<div class="of-card" style="--of-c:' + bandColor(cl.id) + '">' +
      '<div class="of-band">' + crest(cl.id, 'of-crest') +
        '<div class="of-id">' + (kname ? '<span class="of-kind ' + kcls + '">' + kname + '</span>' : '') +
        '<b class="of-name">' + esc(cl.name) + '</b><span class="of-lg">' + U.flag(lg.flag) + ' ' + esc(lg.name) + ' <span class="stars">' + stars(cl.tier) + '</span></span></div></div>' +
      '<div class="of-body">' +
        '<div class="of-role2 ' + roleCls + '"><div><b>' + o.role + '</b><span>' + roleNote + '</span></div><i>' + [0, 1, 2, 3, 4].map(k => '<em' + (k < segs ? ' class="on"' : '') + '></em>').join('') + '</i></div>' +
        '<div class="of-tiles"><div><b>' + cl.strength + '</b><small>força do time</small></div>' +
          '<div><b class="' + (w.length > 7 ? 'sm' : '') + '">R$ ' + w + '</b><small>por semana</small></div>' +
          '<div><b>' + o.years + '</b><small>' + (o.years > 1 ? 'anos' : 'ano') + '</small></div></div>' +
        (breaks ? '<span class="tag ch-break">' + U.emo('⚠️', 'xs') + ' Quebra o desafio</span>' : '') +
        (opts.terms || '') +
        '<button class="offer of-sign" data-i="' + idx + '"><span class="lbl">' + verb + esc(D.o(cl.name)) + '</span></button>' +
      '</div></div>';
  }
  // Carrossel dos cartões: rolagem por encaixe e pontinhos (no computador, lado a lado e sem pontinhos)
  function offerRail(list, opts) {
    const cards = list.map((o, i) => offerCard(o, i, opts)).join('');
    return '<div class="of-rail" id="of-rail">' + cards + '</div>' +
      (list.length > 1 ? '<div class="of-dots" aria-hidden="true">' + list.map((_, i) => '<i' + (i ? '' : ' class="on"') + '></i>').join('') + '</div>' +
        '<p class="of-hint">Arraste para ver ' + listNames(list.slice(1)) + '</p>' : '');
  }
  function listNames(list) {
    const n = list.map(o => o.kind === 'stay' ? 'renovar com ' + D.o(club(o.club).name) : club(o.club).name).map(esc);
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n[0] || '';
  }
  function bindRail() {
    const rail = $('of-rail'), dots = screen.querySelectorAll('.of-dots i');
    if (!rail || !dots.length) return;
    const upd = () => {
      const cards = rail.children, mid = rail.scrollLeft + rail.clientWidth / 2;
      let best = 0, bd = 1e9;
      for (let i = 0; i < cards.length; i++) { const c = cards[i], d = Math.abs(c.offsetLeft - rail.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } }
      dots.forEach((d, i) => d.classList.toggle('on', i === best));
      [...cards].forEach((c, i) => c.classList.toggle('cur', i === best));
    };
    rail.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    upd();
  }
  // Leva o cartão i para o meio do carrossel (proposta nova, voltar à mesma depois de trocar o pedido)
  function railTo(i, smooth) {
    const rail = $('of-rail'), c = rail && rail.children[i];
    if (!c) return;
    rail.scrollTo({ left: c.offsetLeft - rail.offsetLeft - (rail.clientWidth - c.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Quadro "Hoje × Proposta": clube, força, papel, salário e contrato lado a lado
  function dealCompare(cur, o) {
    const a = club(cur.club), b = club(o.club);
    const diff = (x, y) => (y > x ? ' up' : y < x ? ' down' : '');
    const row = (lbl, x, y, cls) => '<tr><th>' + lbl + '</th><td>' + x + '</td><td class="' + (cls || '') + '">' + y + '</td></tr>';
    return '<table class="deal"><thead><tr><th></th><th>Hoje</th><th>Proposta</th></tr></thead><tbody>' +
      row('Clube', crest(a.id, 'xs') + esc(a.name), crest(b.id, 'xs') + esc(b.name)) +
      row('Liga', U.flag(league(a.id).flag) + ' ' + esc(league(a.id).name), U.flag(league(b.id).flag) + ' ' + esc(league(b.id).name)) +
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

  // Base conforme a origem (engine/origins.js)
  const ACAD_TITLE = { base: 'Três clubes querem você na base', filho: 'O sobrenome chegou antes de você', tardia: 'Um olheiro te viu na várzea', exportado: 'Clubes de fora querem você na base' };
  const ACAD_LEAD = {
    filho: 'Todo mundo conhece o seu pai. As portas abrem mais fácil, mas cada temporada ruim vai ser comparada com a dele.',
    tardia: 'Aos 19, só os clubes pequenos apostam. Quem joga logo de cara aparece rápido.',
    exportado: 'Luvas no bolso e passagem só de ida. Os primeiros anos longe de casa custam a render.',
  };
  function academy() {
    G.step = 'academy';
    const win = S.windowState(G.c, true), offers = win.offers;
    bar();
    render(
      '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">' + year() + ' · ' + G.c.age + ' anos</div><h2>' + ACAD_TITLE[G.c.origin || 'base'] + '</h2>' +
      '<p class="lead">' + (ACAD_LEAD[G.c.origin] || 'No clube grande você começa no banco e quase não joga; no menor, é titular e joga toda semana. Quem joga faz gols, ganha nota e pontos de evolução. Se não jogar, dá para pedir empréstimo no fim da temporada.') + '</p>' + U.originNote(G.c) +
      offerRail(offers) + tools(win, true)
    );
    U.tip('base');
    bindRail();
    bindTools(true, academy);
    // Ainda sem clube: voltar descarta este garoto (nada foi salvo)
    $('b-back-home').onclick = () => U.ask('Voltar ao início?', 'Este jogador ainda não assinou com nenhum clube e não será salvo.', 'Voltar', U.home);
    // Dois toques: o 1º vira o card ("Assinar com..."), o 2º assina (evita escolher sem querer)
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = offers[+b.dataset.i];
      if (!U.arm(b, signTxt(o))) return;
      S.join(G.c, o);
      U.firstContract(G.c, U.preseason); // primeiro contrato: assinatura e escudo (motion.js)
    });
  }

  function windowOffers() {
    G.step = 'offers';
    save();
    bar();
    const ended = G.c.contract <= 0;
    const win = S.windowState(G.c), offers = win.offers;
    save();
    win.term = win.term || 'padrao';
    // Termos pedidos na mesa (engine/contract.js) valem para a proposta que você assinar
    const all = offers.concat([S.stayOffer(G.c)]).map(o => S.withTerm(o, win.term));
    const noOffers = !offers.length;
    const tm = S.TERM_BY_ID[win.term];
    const why = ended ? 'Seu contrato com ' + D.o(esc(club(G.c.club).name)) + ' acabou' : G.c.clauseOpen ? 'Sua cláusula de saída abriu o mercado' : 'Seu empresário abriu o mercado';
    const n = offers.length;
    // Pedidos do contrato (valem para qualquer proposta): dentro de cada cartão, o mesmo seletor
    const terms = '<div class="of-terms"><span class="of-tl">O que pedir na mesa</span><div class="of-seg terms">' +
      S.TERMS.map(t => '<button data-term="' + t.id + '"' + (t.id === win.term ? ' class="on"' : '') + ' aria-label="' + esc(t.name) + '">' + U.emo(t.icon, 'xs') + '<small>' + esc(t.name.replace(/^Mais /, '').split(' ')[0].replace(/^./, x => x.toUpperCase())) + '</small></button>').join('') +
      '</div><p class="term-desc">' + esc(tm.desc) + '</p></div>';
    render(
      '<div class="eyebrow">Janela de transferências · ' + year() + '</div>' +
      '<h2 class="of-h">' + (noOffers ? 'Nenhum clube novo apareceu' : n + (n > 1 ? ' clubes querem você' : ' clube quer você')) + '</h2>' +
      '<p class="of-sub">' + why + ' · nota ' + S.ovr(G.c) + ' · ' + U.emo('⭐', 'xs') + ' ' + S.fameLabel(G.c.fame) + '</p>' +
      U.originNote(G.c) + offerRail(all, { terms }) + tools(win, false) +
      '<p class="muted small of-fame">' + U.emo('⭐', 'xs') + ' Fama traz propostas de clubes maiores, salários mais altos' + (G.c.fame >= 150 ? ', vaga mais fácil na seleção' : '') + ' e mais votos na Bola de Ouro.</p>' +
      (S.canRetire(G.c) ? '<button class="btn ghost" id="b-retire">Pendurar as chuteiras</button>' : '')
    );
    U.tip('janela');
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = all[+b.dataset.i], moving = o.club !== G.c.club, prev = G.c.club;
      if (!U.arm(b, signTxt(o))) return;
      S.join(G.c, o);
      if (moving) { save(); bar(); return U.transferMove(prev, G.c.club, G.c.name, U.preseason); }
      U.preseason();
    });
    bindRail();
    // Trocar o pedido redesenha os cartões: volta para o mesmo cartão e a mesma altura
    screen.querySelectorAll('[data-term]').forEach(b => b.onclick = () => {
      const r = $('of-rail'), cur = r ? [...r.children].findIndex(c => c.classList.contains('cur')) : 0, y = scrollY;
      win.term = b.dataset.term; save(); sfx('tap'); windowOffers(); scrollTo(0, y); railTo(Math.max(0, cur));
    });
    if ($('b-retire')) $('b-retire').onclick = U.finale;
    bindTools(false, windowOffers);
    // Proposta nova do pedido ao empresário: destaca e mostra
    // Propostas novas do pedido ao empresário (até duas): destaca todas e rola até a primeira
    if (win.askFresh) {
      const n = win.askFresh === true ? 1 : win.askFresh;
      const k0 = offers.length - n, rail = $('of-rail');
      const fresh = [...Array(n)].map((_, k) => rail && rail.children[k0 + k]).filter(Boolean);
      fresh.forEach(el => el.classList.add('fresh'));
      if (fresh[0]) { rail.scrollIntoView({ block: 'center' }); railTo(k0); }
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
    // Em cada país, da divisão mais forte para a mais fraca; a chance vira número em destaque com uma barrinha
    const lv = {}; D.LEAGUES.forEach(l => { lv[l.id] = lvl(l); });
    const row = l => { const ch = Math.round(S.askChance(G.c, l.id) * 100); return '<button class="lg-row" data-lg="' + l.id + '" style="--ch:' + ch + '%"><b>' + esc(l.name) + '</b><span class="stars">' + stars(lv[l.id]) + '</span><em class="' + (ch >= 60 ? 'hi' : ch < 25 ? 'lo' : '') + '">' + ch + '%</em></button>'; };
    w.innerHTML = '<div class="sheet"><div class="sh-head"><div><b>Pedir ao empresário</b><span>Escolha a liga. Ele tenta um clube que te queira (uma vez por janela).</span></div><button class="sh-x" aria-label="Fechar">✕</button></div>' +
      '<div class="sh-body lg-pick"><div class="lg-legend" aria-hidden="true"><span>Liga</span><span>Nível</span><span>Chance</span></div>' + Object.keys(byCountry).map(ct => '<div class="lg-ct"><div class="sh-sec">' + U.flag(byCountry[ct][0].flag) + ' ' + esc(ct) + '</div>' +
        byCountry[ct].slice().sort((a, b) => lv[b.id] - lv[a.id]).map(row).join('') + '</div>').join('') + '</div></div>';
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
    const talk = Math.round(S.talkChance(G.c) * 100), F = S.SQUAD_FX, sg = v => (v > 0 ? '+' : '−') + Math.abs(v);
    // Estilo ousado (O3): cartão claro com a faixa do clube e as opções com etiqueta, chance e custo em números
    const kit = (window.CRAQUE_KITS || {})[cl.id] || ['#1F6B3E', '#0B1F14'];
    const row = (k, b, t) => '<span class="od-row ' + k + '"><b>' + b + '</b><span>' + esc(t) + '</span></span>';
    const opt = (id, k, tag, t, body) => '<button class="btn opt ob3-opt k-' + k + '" data-sq="' + id + '">' + (tag ? '<span class="ob3-tag">' + tag + '</span>' : '') + '<b class="ob3-lbl">' + t + '</b>' + body + '</button>';
    render(
      '<div class="eyebrow">Pouco espaço · ' + year() + '</div>' +
      '<div class="card event-card ob3 t-red sq-card" style="--k1:' + kit[0] + ';--k2:' + (kit[1] || kit[0]) + '"><div class="ev-top"><span class="ob3-ic">' + crest(cl.id) + '</span>' +
      '<span class="ev-tag red">Pouco espaço</span></div>' +
      '<h2>' + last.games + (last.games === 1 ? ' jogo' : ' jogos') + ' ' + D.no(esc(cl.name)) + ' na última temporada</h2>' +
      '<p class="ob3-txt">Hoje você é <b>' + role.name.toLowerCase() + '</b>: o técnico prefere outros. Contrato: ' + G.c.contract + (G.c.contract > 1 ? ' anos' : ' ano') + '. O que fazer?</p></div>' +
      '<div class="choices ob3-opts">' +
      (sq.loans.length ? opt('loan', 'plain', '', 'Pedir empréstimo', '<small>Uma temporada como titular num clube menor (' + sq.loans.length + (sq.loans.length === 1 ? ' interessado' : ' interessados') + '). Depois você volta, com o contrato valendo.</small>') : '') +
      opt('talk', 'risk', 'Arriscada', 'Conversar com o técnico', '<span class="ob3-bar" aria-hidden="true"><i class="w" style="width:' + talk + '%"></i><i class="l"></i></span>' +
        '<span class="odds">' + row('win', talk + '%', 'mais minutos na próxima temporada · Técnico ' + sg(F.talkOk)) + row('lose', (100 - talk) + '%', 'a relação esfria · Técnico ' + sg(F.talkKo)) + '</span>') +
      opt('out', 'plain', '', 'Pedir para sair', '<span class="odds">' + row('safe', 'Certo', 'a janela abre agora, com uma proposta a mais') + row('lose', 'Custo', 'Técnico ' + sg(F.outCoach) + ' · Torcida ' + sg(F.outFans)) + '</span>') +
      opt('stay', 'safe', 'Segura', 'Seguir brigando por espaço', '<span class="ob3-bar safe" aria-hidden="true"><i style="width:100%"></i></span><span class="odds">' + row('safe', 'Certo', 'nada muda: treinar e esperar a chance') + '</span>') +
      '</div>'
    );
    screen.querySelectorAll('[data-sq]').forEach(b => b.onclick = () => {
      const k = b.dataset.sq;
      if (k === 'loan') return loanPick();
      if (!U.arm(b, '<b>Toque de novo para confirmar</b>')) return;
      if (k === 'talk') {
        const r = S.coachTalk(G.c);
        save(); bar();
        // A roleta para no número sorteado e o cartão vira com o carimbo (como nas decisões); o som sai quando ela para
        U.riskRoll(r.p ? r.p / 100 : talk / 100, r.ok, 'Conversar com o técnico', () => {
          render('<div class="eyebrow">Pouco espaço · ' + year() + '</div>' +
            '<div class="card ev-res ob3-res ' + (r.ok ? 'ok' : 'ko') + '"><span class="ob3-stamp s-' + (r.ok ? 'ok' : 'ko') + '">' + (r.ok ? 'Deu certo' : 'Deu errado') + '</span>' +
            '<span class="er-ic">' + U.emo('🤝', 'lg') + '</span><div class="eyebrow">Conversa com o técnico</div><p class="er-txt">' + r.text + '</p>' +
            '<div class="er-fx">' + (r.ok ? '<span class="up">Técnico ' + sg(F.talkOk) + '</span><span class="up">Mais minutos</span>' : '<span class="down">Técnico ' + sg(F.talkKo) + '</span>') + '</div></div>' +
            '<button class="btn" id="b-next">Pré-temporada</button>');
          $('b-next').onclick = U.preseason;
        }, r.roll);
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
      offerRail(sq.loans)
    );
    bindRail();
    $('b-sq-back').onclick = squad;
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = sq.loans[+b.dataset.i];
      if (!U.arm(b, '<b>Toque de novo para ir emprestado</b>')) return;
      S.loanOut(G.c, o);
      save(); bar(); sfx('whistle');
      U.preseason();
    });
  }

  Object.assign(U, { offerCard, dealCompare, academy, windowOffers, squad });
})();
