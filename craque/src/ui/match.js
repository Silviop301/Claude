// Interface — eventos e jogo decisivo (minigame)
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- evento ----------
  // O evento sorteado fica na carreira (G.c.pendEv), como o lance: recarregar a página mostra o mesmo, sem sortear de novo
  function eventOrSeason() {
    G.c.pendEv = S.pickEvent(G.c);
    if (!G.c.pendEv) { delete G.c.pendEv; return momentOrSeason(); }
    G.step = 'event';
    save();
    eventScreen();
  }

  // Selo do evento e o rótulo do tom (verde = oportunidade, vermelho = risco, azul = decisão)
  const TONE_LBL = { green: 'Oportunidade', red: 'Risco', blue: 'Decisão' };
  const evDef = ev => Object.assign({}, S.EVENT_DEFS.find(d => d.id === ev.id) || {}, ev);
  // O que está em jogo numa opção arriscada, curto: uma linha por resultado com a chance em destaque
  // (verde quando dá certo, vermelho quando dá errado) e o que vale nos dois casos numa linha à parte.
  // Opções seguras e as consequências (events3.js, texto pronto) continuam com o texto de sempre.
  // Estilo ousado: a arriscada ganha uma barra de chance (verde/vermelho) em cima das linhas; a segura, a barra cheia do ganho certo.
  function optHint(c, o) {
    const { rows, always } = o.st && !o.st.safe && !o.locked ? S.stakeRows(c, o.st) : {};
    if (!rows) {
      if (o.st && o.st.safe && !o.locked) return '<span class="ob3-bar safe" aria-hidden="true"><i style="width:100%"></i></span><span class="odds"><span class="od-row safe"><b>Certo</b><span>' + esc(o.hint) + '</span></span></span>';
      return '<small>' + (o.locked ? U.emo('🔒', 'xs') : '') + esc(o.hint) + '</small>';
    }
    const cost = always.length === 1 && /^−R\$ /.test(always[0]), pw = Math.round(rows[0].p * 100);
    return '<span class="ob3-bar" aria-hidden="true"><i class="w" style="width:' + pw + '%"></i><i class="l"></i></span>' +
      '<span class="odds">' + rows.map(r => '<span class="od-row ' + r.kind + '"><b>' + Math.round(r.p * 100) + '%</b><span>' + esc(r.parts.join(' · ')) + '</span></span>').join('') +
      (always.length ? '<span class="od-always">' + (cost ? 'Custa ' + esc(always[0].slice(1)) : 'Sempre: ' + esc(always.join(' · '))) + '</span>' : '') + '</span>';
  }
  // Etiqueta da opção: arriscada (chance) ou segura (ganho certo); evento antigo/consequência sem etiqueta
  const optKind = o => (o.st ? (o.st.safe ? 'safe' : 'risk') : 'plain');
  const OPT_TAG = { risk: 'Arriscada', safe: 'Segura' };
  function optCard(c, ev, o, i) {
    const k = optKind(o);
    return '<button class="btn opt ob3-opt k-' + k + (o.locked ? ' locked' : '') + '" data-i="' + i + '"' + (o.locked ? ' disabled' : '') + '>' +
      (OPT_TAG[k] ? '<span class="ob3-tag">' + OPT_TAG[k] + '</span>' : '') + '<b class="ob3-lbl">' + esc(o.label) + '</b>' + optHint(c, o) +
      (i === 0 && ev.dest && S.breaksChallenge(c, { club: ev.dest }) ? '<small class="ch-warn">' + U.emo('⚠️', 'xs') + ' Quebra o desafio</small>' : '') + '</button>';
  }

  // Rodapé de quem tem opção segura e arriscada. Em geral a arriscada rende mais; quando o melhor caso dela é "nada muda",
  // a vantagem é escapar do custo da segura (ex.: os R$ 30 mil das aulas de idioma), e o texto diz isso
  function riskNote(c, ev) {
    const risky = ev.options.filter(o => o.st && !o.st.safe && !o.locked), safes = ev.options.filter(o => o.st && o.st.safe && !o.locked);
    if (!risky.length || risky.some(o => S.fxValue(c, o.st.win.fx || {}) > 0)) return 'A arriscada pode render mais, mas pode dar errado de verdade.';
    const cost = safes.map(o => S.fxParts(c, o.st.safe.fx || {}).filter(x => /^−|−\d| cai|mais fraco|deixa de|não será/.test(x))).find(x => x.length) || [];
    const cash = cost.find(x => /^−R\$ /.test(x)), other = cost.filter(x => x !== cash);
    const why = cash ? 'economizar os ' + cash.slice(1) + ' da segura' + (other.length ? ' (e ' + other.join(', ') + ')' : '')
      : other.length ? 'escapar do que a segura custa (' + other.join(', ') + ')' : '';
    return why ? 'A arriscada não rende nada a mais: a vantagem dela é ' + why + '. Se der errado, a perda é de verdade.'
      : 'A arriscada não rende nada a mais: no melhor caso, nada muda. Se der errado, a perda é de verdade.';
  }

  function eventScreen() {
    // Save de antes do evento guardado na carreira: sorteia uma vez e guarda
    if (!G.c.pendEv) { G.c.pendEv = S.pickEvent(G.c); if (G.c.pendEv) save(); }
    if (!G.c.pendEv) { delete G.c.pendEv; return momentOrSeason(); }
    const ev = G.c.pendEv;
    // Proposta de transferência: compara com a situação de hoje antes de decidir
    const offer = S.eventOffer(G.c, ev);
    // Estilo ousado: cartão claro centrado (ícone grande, categoria, título, texto) e as opções com o mesmo peso visual.
    // Duas opções sem proposta de clube ficam lado a lado; 3 ou mais (ou proposta) empilham.
    const tone = ev.hookOf ? 'back' : evDef(ev).tone || '', kinds = ev.options.map(optKind);
    const two = ev.options.length === 2 && !offer;
    render(
      '<div class="eyebrow">Durante a temporada · ' + year() + '</div>' +
      '<div class="card event-card ob3' + (tone ? ' t-' + tone : '') + '"><div class="ev-top"><span class="ob3-ic">' + U.icoOf(ev, 'lg') + '</span>' +
      '<span class="ev-tag ' + (tone || 'blue') + '">' + (ev.hookOf ? 'Consequência' : TONE_LBL[tone] || 'Decisão') + '</span></div>' +
      (ev.memory ? '<p class="ev-mem">' + U.emo('🔁', 'xs') + ' ' + esc(ev.memory) + '</p>' : '') + '<h2>' + esc(ev.title) + '</h2><p class="ob3-txt">' + esc(ev.text) + '</p></div>' +
      (offer ? U.dealCompare(S.currentDeal(G.c), offer) : '') +
      '<div class="choices ob3-opts' + (two ? ' two' : '') + '">' + ev.options.map((o, i) => optCard(G.c, ev, o, i)).join('') + '</div>' +
      (kinds.includes('risk') && kinds.includes('safe') ? '<p class="ob3-note">' + esc(riskNote(G.c, ev)) + '</p>' : '')
    );
    U.tip('evento');
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      // Trocar de clube pede confirmação (dois toques)
      if (offer && b.dataset.i === '0' && !U.arm(b, '<b>Toque de novo para assinar</b>')) return;
      const prevClub = G.c.club, r = S.resolveEvent(G.c, ev, +b.dataset.i);
      delete G.c.pendEv;
      bar();
      // O que mudou de verdade: o geral (quando mexeu) e cada efeito, verde quando ajuda e vermelho quando atrapalha
      const o1 = S.ovr(G.c), dOvr = r.ovrFrom != null ? o1 - r.ovrFrom : 0;
      const kind = g => (/\+|sobe|mais forte/.test(g) ? ' up' : /−|cai|lesão|mais fraco/.test(g) ? ' down' : '');
      const fxRow = r.gain && r.gain.length ? '<div class="er-fx">' + (dOvr ? '<span class="er-ovr' + (dOvr > 0 ? ' up' : ' down') + '">Nota geral ' + r.ovrFrom + ' → ' + o1 + '</span>' : '') +
        r.gain.map(g => '<span class="' + kind(g).trim() + '">' + esc(g) + '</span>').join('') + '</div>' : '';
      const pctx = { kind: 'event', ok: r.ok, ev, opt: +b.dataset.i, toClub: offer && b.dataset.i === '0' ? G.c.club : null };
      // Opção arriscada: a roleta gira e para no número que já saiu (motion.js)
      const st = ev.options[+b.dataset.i].st;
      // Carimbo do resultado: arriscada deu certo/errado; segura é tranquila; proposta de clube não leva carimbo
      const stamp = st ? (st.safe ? (r.ok ? 'calm' : '') : r.ok ? 'ok' : 'ko') : offer ? '' : r.ok ? 'ok' : 'ko';
      const STAMP = { ok: 'Deu certo', ko: 'Deu errado', calm: 'Tranquilo' };
      // Já resolvido: salva antes da animação, para fechar e voltar não sortear de novo
      G.step = 'moment'; save();
      const pick = ev.options[+b.dataset.i].label;
      U.riskRoll(st && !st.safe ? st.p : 0, r.ok, pick, () => U.transferMove(prevClub, G.c.club, G.c.name, () => {
      // Resultado no mesmo lugar do cartão do evento (no alto, com o mesmo rótulo), lembrando o que foi escolhido
      render(
        '<div class="eyebrow">Durante a temporada · ' + year() + '</div>' +
        '<div class="card ev-res ob3-res ' + (r.ok ? 'ok' : 'ko') + (stamp === 'calm' ? ' calm' : '') + '">' + (stamp ? '<span class="ob3-stamp s-' + stamp + '">' + STAMP[stamp] + '</span>' : '') +
        '<span class="er-ic">' + U.icoOf(ev, 'lg') + '</span><div class="eyebrow">' + esc(ev.title) + '</div>' +
        '<span class="er-pick"><small>Sua escolha</small>' + esc(pick) + '</span>' +
        '<p class="er-txt">' + esc(r.text) + '</p>' + fxRow + '</div>' +
        '<button class="btn" id="b-next">Jogar a temporada</button>' + U.postBtn(pctx)
      );
      $('b-next').onclick = momentOrSeason;
      U.postBind(pctx, momentOrSeason);
      }), r.roll);
    });
  }

  // ---------- jogo decisivo (minigame) ----------
  function momentOrSeason() {
    const m = S.pickMoment(G.c);
    if (!m) return U.season();
    G.step = 'moment';
    // Fechou o jogo no meio da cobrança? A chance decide (sem repetir o chute)
    if (m.started || U.cfg.moments === 'auto') { S.autoMoment(G.c); save(); return U.season(); } // configuração: a carta decide
    // Título, acesso e finais: antes do lance, a reta final corre ao vivo e para na véspera da decisão (ui/season.js).
    // m.pre fica salvo: quem fecha o jogo e volta cai direto no lance; o fim da temporada não recomeça a corrida.
    if (m.type !== 'classico' && !m.pre && !U.cfg.fast) { m.pre = true; save(); return U.preRace(m, () => momentIntro(m)); }
    save();
    momentIntro(m);
  }

  const MOMENT_TXT = {
    cup: m => ({ tag: 'Final da ' + m.comp, title: 'Pênalti nos acréscimos!', text: 'Final contra ' + D.o(club(m.vs).name) + ', empate no placar. A bola é sua.', stakes: 'Converteu: campeão da ' + m.comp + ' · Errou: vice' }),
    title: m => ({ tag: 'Última rodada · ' + m.comp, title: 'Pênalti valendo o título!', text: 'Contra ' + D.o(club(m.vs).name) + ', quem vencer é campeão.', stakes: 'Converteu: campeão da liga · Errou: vice' }),
    cont: m => ({ tag: 'Final da ' + m.comp, title: (m.kick === 'fk' ? 'Falta na final' : 'Pênalti na final') + ' da ' + m.comp + '!',
      text: 'Decisão contra ' + D.o(club(m.vs).name) + ', ' + (m.kick === 'fk' ? 'falta na entrada da área aos 88 minutos.' : 'pênalti nos acréscimos com o placar empatado.'),
      stakes: 'Converteu: campeão da ' + m.comp + ' · Errou: vice' }),
    acesso: m => ({ tag: 'Última rodada · ' + m.comp, title: (m.kick === 'fk' ? 'Falta' : 'Pênalti') + ' valendo o acesso!',
      text: 'Contra ' + D.o(club(m.vs).name) + (m.kick === 'fk' ? ', falta na entrada da área.' : ', pênalti a seu favor.'), stakes: 'Converteu: acesso garantido · Errou: fica para o ano que vem' }),
    classico: m => m.kick === 'pen' ? { tag: 'Clássico', title: 'Pênalti no clássico!', text: 'Derrubaram você na área contra ' + D.o(club(m.vs).name) + '. O estádio inteiro de pé.', stakes: 'Converteu: gol no clássico e Torcida +8' }
      : ({ tag: 'Clássico', title: 'Falta perigosa no clássico!', text: 'Contra ' + D.o(club(m.vs).name) + ', na entrada da área. A barreira está armada.', stakes: 'Converteu: gol no clássico e Torcida +8' }),
  };

  // Lances defensivos (zagueiro/goleiro): o mesmo momento, visto do outro lado
  const DEF_TXT = (m, mode) => {
    const vs = D.o(club(m.vs).name), save = mode === 'save';
    const what = save ? 'Pênalti contra' : 'Contra-ataque';
    const goal = { cup: 'campeão da ' + m.comp, title: 'campeão da liga', acesso: 'acesso garantido', cont: 'campeão da ' + m.comp, classico: (m.score && m.score[0] === m.score[1] ? 'segura o empate' : 'o clássico é seu') + ', Torcida +8' }[m.type];
    return {
      tag: { cup: 'Final da ' + m.comp, title: 'Última rodada · ' + m.comp, acesso: 'Última rodada · ' + m.comp, cont: 'Final da ' + m.comp, classico: 'Clássico' }[m.type],
      title: save ? 'Pênalti contra nos acréscimos!' : 'Contra-ataque no último minuto!',
      text: (save ? 'O camisa 9 ' + D.do(club(m.vs).name) + ' vai bater.' : 'O atacante ' + D.do(club(m.vs).name) + ' arrancou sozinho.') + ' Tudo depende de você contra ' + vs + '.',
      stakes: (save ? 'Defendeu: ' : 'Desarmou: ') + goal + ' · ' + (m.type === 'classico' ? 'Falhou: gol deles' : m.type === 'acesso' ? 'Falhou: o acesso escapa' : 'Falhou: vice'),
      what,
    };
  };
  // Meia: o lance é a bola enfiada para o atacante
  const PASS_TXT = m => {
    const goal = { cup: 'campeão da ' + m.comp, title: 'campeão da liga', acesso: 'acesso garantido', cont: 'campeão da ' + m.comp, classico: 'gol no clássico, Torcida +8' }[m.type];
    return {
      tag: { cup: 'Final da ' + m.comp, title: 'Última rodada · ' + m.comp, acesso: 'Última rodada · ' + m.comp, cont: 'Final da ' + m.comp, classico: 'Clássico' }[m.type],
      title: 'A bola é sua no meio-campo!',
      text: 'O atacante faz a diagonal nas costas da zaga ' + D.do(club(m.vs).name) + '. Um passe na medida e ele fica cara a cara.',
      stakes: 'Acertou: ' + goal + ' (assistência sua) · Errou: a zaga corta',
    };
  };
  // Abre o minigame certo para o tipo do lance (chute, goleiro, zagueiro ou meia)
  // c: quem bate (o treino pode usar um jogador médio da posição do lance)
  // kitCtx (Copa e Mundial): { vs: nome do adversário, mine: sua seleção ou clube } para os uniformes certos
  // style: estilo escolhido na tela do lance (S.STYLES); sem ele, o lance de sempre
  // onResult(ok, why): o resultado na hora em que sai, antes do letreiro e da animação (o lance de verdade já salva ali)
  function playMini(el, setupType, onDone, c, kitCtx, style, onResult) {
    c = c || G.c;
    window.CRAQUE_KIT_CTX = kitCtx || null;
    if (setupType === 'save') return window.CRAQUE_SAVE(el, { c, onDone, onResult, style });
    if (setupType === 'tackle') return window.CRAQUE_TACKLE(el, { c, onDone, onResult, style });
    if (setupType === 'pass') return window.CRAQUE_PASS(el, { c, onDone, onResult, style });
    return window.CRAQUE_KICK(el, { c, moment: { type: setupType, style }, onDone, onResult });
  }
  // Os dois estilos do lance, lado a lado: nome, como muda o lance e a chance pela carta em cada um.
  // Nenhum é sempre o melhor: a chance pende para atributos diferentes e o jeito de jogar muda.
  // big (estilo ousado, tela do lance): cartões grandes com ícone e chance no alto, nome e como muda o lance
  function styleBtns(st, big) {
    if (big) return '<div class="choices style-grid ob5-styles">' + S.STYLES[st].map((d, i) => { const k = S.kickSetup(G.c, st, d.id);
      return '<button class="btn opt style ob5-st s' + i + '" data-style="' + d.id + '"><span class="ob5-st-top">' + U.emo(d.ico, 'md') +
        '<span class="st-pct" aria-label="Chance pela carta"><b>' + Math.round(k.chance * 100) + '%</b>pela carta</span></span>' +
        '<b class="ob5-st-nm">' + esc(d.name) + '</b><small>' + esc(d.hint) + '</small></button>'; }).join('') + '</div>';
    return '<div class="choices style-grid">' + S.STYLES[st].map(d => { const k = S.kickSetup(G.c, st, d.id);
      return '<button class="btn opt style" data-style="' + d.id + '"><span class="st-ico">' + U.emo(d.ico, 'sm') + '</span>' + esc(d.name) + '<small>' + esc(d.hint) + '</small><span class="st-pct" aria-label="Chance pela carta"><b>' + Math.round(k.chance * 100) + '%</b>pela carta</span></button>'; }).join('') + '</div>';
  }
  // Liga os botões de estilo: guarda a escolha no lance (m) e segue para o minigame
  function bindStyle(m, go) {
    screen.querySelectorAll('[data-style]').forEach(b => b.onclick = () => { m.style = b.dataset.style; save(); go(); });
  }
  // O que da carta pesa no lance, sem números escondidos
  function miniFacts(setupType) {
    const k = S.kickSetup(G.c, setupType), E = S.eff(G.c), L = kk => D.label(G.c.pos, kk);
    const lv = id => (G.c.traits.includes(id) ? S.traitLevel(G.c, id) : 0);
    if (setupType === 'save') return ['<span class="chip">' + L('fin') + ' ' + E.fin + ' · sinal do batedor ' + (k.tellMs >= 190 ? 'longo' : k.tellMs >= 130 ? 'médio' : 'curto') + '</span>',
      '<span class="chip">' + L('fis') + ' ' + E.fis + ' · alcance ' + (k.diveReach >= 0.62 ? 'grande' : k.diveReach >= 0.52 ? 'médio' : 'curto') + '</span>'].concat(lv('pegador') ? ['<span class="chip">' + U.emo('🥅', 'xs') + ' Pegador de pênalti: sinal mais longo</span>'] : []);
    if (setupType === 'pass') return ['<span class="chip">' + L('pas') + ' ' + E.pas + ' · brecha ' + (k.win >= 0.13 ? 'larga' : k.win >= 0.093 ? 'média' : 'estreita') + '</span>',
      '<span class="chip">Corrida ' + (k.period >= 1.0 ? 'lenta' : k.period >= 0.82 ? 'média' : 'rápida') + '</span>'].concat(lv('visao') ? ['<span class="chip">' + U.emo('👁️', 'xs') + ' Visão de Jogo: brecha maior</span>'] : []);
    if (setupType === 'tackle') return ['<span class="chip">DEF ' + E.def + ' · faixa ' + (k.win >= 0.15 ? 'larga' : k.win >= 0.1 ? 'média' : 'estreita') + '</span>',
      '<span class="chip">RIT ' + E.rit + ' · lance ' + (k.period >= 1.3 ? 'lento' : k.period >= 1.05 ? 'médio' : 'rápido') + '</span>'].concat(lv('carrinho') ? ['<span class="chip">' + U.emo('🦵', 'xs') + ' Carrinho: faixa maior</span>'] : []);
    const f = ['<span class="chip">FIN ' + E.fin + ' · mira ' + (k.period >= 1.7 ? 'lenta' : k.period >= 1.35 ? 'média' : 'rápida') + '</span>',
      '<span class="chip">Tremedeira ' + (k.wobble <= 0.03 ? 'nenhuma' : k.wobble <= 0.08 ? 'pouca' : 'muita') + '</span>'];
    if (lv('colocado')) f.push('<span class="chip">' + U.emo('🎯', 'xs') + ' Chute Colocado: mira mais lenta</span>');
    if (lv('frieza')) f.push('<span class="chip">' + U.emo('🧊', 'xs') + ' Frieza: menos tremedeira</span>');
    if (setupType === 'classico' && lv('parada')) f.push('<span class="chip">' + U.emo('🧱', 'xs') + ' Bola Parada: barreira mais fácil</span>');
    return f;
  }
  const MINI_HOW = {
    cup: 'Dois toques: o primeiro trava a direção, o segundo a altura. O goleiro escolhe um canto; no ângulo ele não alcança.',
    classico: 'Dois toques: o primeiro trava a direção, o segundo a altura. Passe por cima da barreira ou busque o ângulo.',
    save: 'O batedor corre; pouco antes do chute aparece uma seta mostrando o lado. Toque na esquerda, no meio ou na direita para pular.',
    tackle: 'O atacante vem conduzindo rumo ao seu gol. Toque quando ele pisar na faixa verde para dar o carrinho.',
    pass: 'O atacante corre entre a zaga e o último zagueiro. Toque quando ele passar pela faixa verde: a bola passa pela brecha e ele finaliza. Se demorar, ele fica impedido.',
  };
  const MINI_BTN = { cup: 'Bater o pênalti', classico: 'Bater a falta', save: 'Defender o pênalti', tackle: 'Dar o bote', pass: 'Enfiar a bola' };

  // O que vale o lance em duas linhas: ganho em verde, perda em vermelho ("Converteu: X · Errou: Y").
  // Sem a parte da perda (clássico do atacante), só a linha do ganho.
  function stakesHtml(s) {
    const row = (p, k) => { const i = p.indexOf(': ');
      return '<p class="lc-st ' + k + '">' + (i > 0 ? '<b>' + esc(p.slice(0, i)) + '</b><span>' + esc(p.slice(i + 2)) + '</span>' : '<span>' + esc(p) + '</span>') + '</p>'; };
    const parts = String(s).split(' · ');
    return '<div class="lc-stakes">' + row(parts[0], 'win') + (parts[1] ? row(parts.slice(1).join(' · '), 'lose') : '') + '</div>';
  }

  // Duelo direto: o clube do outro lado é o do seu rival de geração (engine/moments.js marca m.rival)
  function rivalTag(m) {
    if (!m.rival) return '';
    const rv = G.c.rival, d = rv && rv.duels;
    return '<p class="ob5-rival">' + U.emo('⚔️', 'xs') + '<span>Do outro lado: <b>' + esc(m.rival) + '</b>, seu rival de geração' + (d ? ' · duelos diretos ' + d.w + ' x ' + d.l : '') + '</span></p>';
  }

  // Placar escuro do lance (O5): escudos, gols, minuto ao vivo e a competição. mini: faixa baixa em cima da cena (minigame)
  function board(m, sc, tag, mini) {
    return '<div class="ob5-board' + (sc ? '' : ' no-score') + (mini ? ' mini' : '') + '">' + crest(G.c.club) + '<b class="ob5-g">' + (sc ? sc[0] : '') + '</b>' +
      '<span class="ob5-mid">' + (m.minute ? '<span class="ob5-min"><i aria-hidden="true"></i>' + m.minute + "'</span>" : '<span class="ob5-x">×</span>') + '<small>' + esc(tag) + '</small></span>' +
      '<b class="ob5-g">' + (sc ? sc[1] : '') + '</b>' + crest(m.vs) + '</div>';
  }

  function momentIntro(m) {
    const st = S.kickSetupType(m), def = st === 'save' || st === 'tackle';
    const T = def ? DEF_TXT(m, st) : st === 'pass' ? PASS_TXT(m) : MOMENT_TXT[m.type](m), k = S.kickSetup(G.c, st, S.autoStyle(G.c, st));
    // Estilo ousado: placar escuro (escudos, minuto ao vivo, competição), título grande, o que vale em dourado,
    // o que pesa da carta e os dois estilos como cartões grandes; decidir no automático e treinar no rodapé.
    render(
      '<div class="eyebrow">Jogo decisivo</div>' + board(m, m.score, T.tag) +
      '<div class="ob5-head"><h2>' + T.title + '</h2>' +
        '<p class="ob5-txt">' + (m.ctx ? esc(m.ctx) + ' ' : '') + esc(T.text) + '</p>' + rivalTag(m) + stakesHtml(T.stakes) + '</div>' +
      '<div class="chips ob5-facts">' + miniFacts(st).join('') + '</div>' +
      // Em tela baixa (até 700 px de altura) os chips saem do topo e ficam aqui dentro (style.css, bloco E1)
      '<details class="ob5-how"><summary>Como funciona o lance</summary><p>' + MINI_HOW[st] + '</p><div class="chips ob5-facts in">' + miniFacts(st).join('') + '</div></details>' +
      '<p class="st-lead ob5-q">Como você vai ' + { cup: 'bater', classico: 'bater', save: 'defender', tackle: 'marcar', pass: 'passar' }[st] + '?</p>' + styleBtns(st, true) +
      '<div class="ob5-foot"><button class="btn ghost ob5-auto" id="b-auto">Deixar o jogo decidir<small>' + Math.round(k.chance * 100) + '% pela sua carta</small></button>' +
      '<button class="ob5-train mom-train" id="b-train">' + U.emo('🏟️', 'xs') + ' Treinar antes</button></div>'
    );
    U.tip('lance');
    $('b-train').onclick = () => U.training(st);
    // Primeiro lance deste tipo: o treino abre antes (e dá para pular)
    bindStyle(m, U.gateTrain(st, () => {
      m.started = true; save();
      // O placar escuro continua em cima da cena, numa faixa baixa (placar, minuto e competição)
      render(board(m, m.score, T.tag, true) + '<div id="kick"></div>');
      sfx('whistle');
      // Saiu da tela no meio da cobrança (voltou ao início): o resultado não redesenha nada; ao retomar, a chance decide.
      // O resultado salva assim que sai: fechar o jogo com o letreiro na tela não troca o que se viu pela chance da carta
      playMini($('kick'), st, (ok, why) => { if (!$('kick')) return; momentEnd(m, ok, T, why); }, null, null, m.style,
        (ok, why) => { if (!$('kick')) return; S.resolveMoment(G.c, ok, why); save(); });
    }));
    $('b-auto').onclick = () => {
      const ok = S.autoMoment(G.c);
      save();
      momentResult(ok, T, m);
    };
  }

  function momentEnd(m, ok, T, why) {
    S.resolveMoment(G.c, ok, why);
    save();
    momentResult(ok, T, m, why);
  }

  function momentResult(ok, T, m, why) {
    const how = { defesa: 'O goleiro ' + D.do(club(m.vs).name) + ' defendeu.', trave: 'A bola explodiu na trave.', fora: 'A bola foi para fora.', alto: 'A bola foi por cima do gol.', barreira: 'A bola parou na barreira.' }[why] || '';
    // O estilo escolhido entra no texto (o chute forte, a saída do gol, o bote em pé, o lançamento)
    const st = S.kickSetupType(m), bold = S.styleOf(st, m) !== S.styleIds(st)[0];
    const goal = bold ? 'Bomba indefensável! ' : 'No cantinho! ';
    // Placar depois do lance: o clássico pode terminar empatado (atrás por um e marcou; empatado e segurou)
    const def = st === 'save' || st === 'tackle';
    const sc = m.score ? [m.score[0] + (!def && ok ? 1 : 0), m.score[1] + (def && !ok ? 1 : 0)] : null;
    const cEnd = !(sc && sc[0] === sc[1]) ? 'O clássico é seu.' : def ? 'Segurou o empate no clássico.' : 'Empate arrancado no fim do clássico!';
    // Sem o motivo ("Deixar o jogo decidir"), a frase não repete o "Não entrou…" do título grande
    const txt = {
      cup: ok ? goal + 'Campeão da ' + m.comp + '!' : how + ' Fica o vice da ' + m.comp + '.',
      title: ok ? goal + 'O título é seu!' : how + ' O título escapou nos detalhes.',
      classico: m.kick === 'pen' ? (ok ? goal + cEnd : how + ' A torcida lamenta.')
        : ok ? (bold ? 'Bomba de falta, golaço! ' : 'Golaço de falta colocada! ') + cEnd : (how || 'Não foi dessa vez.') + ' A torcida lamenta.',
      acesso: ok ? goal + 'O acesso é seu!' : how + ' O acesso escapou na última rodada.',
      cont: ok ? goal + 'É campeão da ' + m.comp + '! Seu nome entrou para a história do clube.' : how + ' Fica o vice da ' + m.comp + '.',
    }[m.type];
    // Lances defensivos: texto próprio
    const defTxt = st === 'save' ? (ok ? (why === 'fora' ? (bold ? 'Você cresceu no gol e o batedor mandou para fora! ' : 'O batedor mandou para fora! ') : bold ? 'Saiu da linha e cresceu: que defesa! ' : 'Que defesa! ') : 'Não deu: a bola entrou. ')
      : st === 'tackle' ? (ok ? (bold ? 'Encaixou o corpo e ficou com a bola! ' : 'Carrinho perfeito, bola roubada! ') : why === 'cedo' ? 'Você chegou cedo e ele passou. ' : why === 'drible' ? 'Você chegou junto, mas ele driblou e marcou. ' : 'Chegou tarde: ele passou e marcou. ')
      : st === 'pass' ? (ok ? (bold ? 'Lançamento por cima na medida e o atacante não perdoou: assistência sua! ' : 'Bola enfiada na medida e o atacante não perdoou: assistência sua! ') : why === 'impedido' ? 'Demorou o passe e ele ficou impedido. ' : why === 'goleiro' ? 'O lançamento foi bom, mas o goleiro saiu e ficou com a bola. ' : 'A zaga cortou o passe. ') : null;
    const defEnd = { cup: ok ? 'Campeão da ' + m.comp + '!' : 'Fica o vice da ' + m.comp + '.', title: ok ? 'O título é seu!' : 'O título escapou.',
      classico: ok ? cEnd : 'A torcida lamenta.', acesso: ok ? 'O acesso é seu!' : 'O acesso escapou.', cont: ok ? 'Campeão da ' + m.comp + '!' : 'Fica o vice da ' + m.comp + '.' }[m.type];
    const final = (defTxt !== null ? defTxt + defEnd : txt).trim() + (m.rival ? ' ' + (ok ? 'Duelo direto com ' + m.rival.split(' ')[0] + ': ponto seu.' : 'Duelo direto: ponto para ' + m.rival.split(' ')[0] + '.') : '');
    // Título grande (gol, defesa, bote ou a lamentação); o passe errado segue o motivo, como a faixa do minigame
    const big = def ? (ok ? (st === 'save' ? 'DEFENDEU!' : 'ROUBOU!') : 'Gol deles…') : ok ? 'GOOOL!'
      : st === 'pass' ? (why === 'impedido' ? 'Impedido…' : why === 'goleiro' ? 'Goleiro saiu…' : 'Cortado…') : 'Não entrou…';
    // Título grande (final continental ou liga principal) ganho no lance: faixa dourada, confete curto e "Comemorar"
    const LD = D.LADDER[club(G.c.club).league];
    const fest = ok && (m.type === 'cont' || (m.type === 'title' && !(LD && LD.up)));
    // O mesmo placar escuro da abertura: mostra o placar de antes e o gol entra contando logo depois
    const side = sc && sc[0] !== m.score[0] ? 0 : sc && sc[1] !== m.score[1] ? 1 : -1;
    render(
      '<div class="eyebrow">Jogo decisivo</div>' + // a competição já está no placar logo abaixo
      board(Object.assign({}, m, { minute: m.minute || 90 }), m.score, T.tag) +
      // O grito e o texto no meio da tela; a faixa do título ganho fica junto deles
      '<div class="ob5-res ' + (ok ? 'ok' : 'ko') + '"><div class="mr-big">' + big + '</div><p class="mr-txt">' + final + '</p>' +
      (fest ? '<div class="ob5-prize">' + trophy(titleType({ id: m.type === 'cont' ? 'cont' : 'league', name: m.comp }), 52, m.comp) +
        '<span><small>Campeão</small><b>' + esc(m.comp) + '</b></span></div>' : '') + '</div>' +
      '<div class="lc-acts"><button class="btn" id="b-next">' + (fest ? 'Comemorar' : m.pre ? 'Fechar a temporada' : 'Jogar a temporada') + '</button>' + U.postBtn({ kind: 'moment', ok, m }) + '</div>' // no alto, como o resultado do evento
    );
    if (side >= 0) {
      const g = screen.querySelectorAll('.ob5-board .ob5-g')[side];
      setTimeout(() => { if (!g.isConnected) return; g.textContent = sc[side]; g.classList.add('bump'); }, 550);
    }
    if (fest) confetti();
    if (ok) U.vibe([40, 60, 40]);
    $('b-next').onclick = U.season;
    U.postBind({ kind: 'moment', ok, m, why }, U.season);
    // Final continental: edição extra do jornal
    const btn = $('b-next');
    if (m.type === 'cont') setTimeout(() => { if (btn.isConnected) U.finalPaper(G.c, m, ok); }, 900);
  }

  // Confete curto por cima da tela (não bloqueia o toque); some sozinho
  function confetti() {
    const colors = ['#F4D675', '#FFFFFF', '#5FD690', '#FF8A93', '#7AC7FF'];
    const w = document.createElement('div');
    w.className = 'bm-confetti ob5-confetti';
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = Array.from({ length: 28 }, (_, k) => '<i style="left:' + ((k * 37) % 100) + '%;background:' + colors[k % 5] + ';animation-delay:' + ((k * 0.09) % 0.8).toFixed(2) + 's;animation-duration:' + (1.5 + (k % 5) * 0.2).toFixed(2) + 's"></i>').join('');
    document.body.appendChild(w);
    sfx('fanfare');
    setTimeout(() => w.remove(), 2800);
  }

  Object.assign(U, { eventOrSeason, eventScreen, momentOrSeason, MOMENT_TXT, momentIntro, momentEnd, momentResult, playMini, miniFacts, MINI_BTN, MINI_HOW, styleBtns, bindStyle, lanceStakes: stakesHtml });
})();
