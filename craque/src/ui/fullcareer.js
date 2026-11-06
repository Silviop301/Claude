// Interface — Carreira Jogo a Jogo (c.mode 'completa'; motor em engine/fullcareer.js). O centro é o celular
// do jogador: notificações (técnico, agenda, preparador, Zé) e apps (agenda da semana, tabela, jogos, ficha, loja, Zé). Cada jogo passa ao vivo (relógio de 0' a 90', placares e tabela mudando) e termina
// na capa do jornal. Finais e o clássico abrem o lance decisivo antes do jogo. No fim do calendário, o resumo de sempre.
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, sfx, $, esc, crest, year, save, render, bar } = U;

  const nameOf = id => (D.CLUB_BY_ID[id] ? D.CLUB_BY_ID[id].name : '?');
  const rate = r => r.toFixed(1).replace('.', ',');
  const num2 = x => String(Math.round(x * 100) / 100).replace('.', ',');
  const num1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  const clock = t => (t > 90 ? '90+' + (t - 90) : t) + "'";
  const PACE = [1300, 430]; // milissegundos por minuto de jogo: 1× (~2 min, como a partida do Treinador) e 3× (~40 s)
  let fast = false;
  let eff = null; // esforço do jogo ao vivo: nível escolhido, minutos em cada nível (S.FC_EFF) e o energético
  // Em tela larga a tabela fica ao lado do jogo ao vivo
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 1000px) and (min-height: 560px)').matches;

  // ---------- agenda da semana (tela central) ----------
  // A semana entre um jogo e outro como página de agenda: os dias até o jogo, o primeiro com o treino da semana
  // (S.fcWeek), os seguintes com os convites do celular (engine/phone.js) e o resto com a rotina do clube. Liga no domingo, copa e continental na quarta.
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayOf = e => (e && e.k === 'lg' ? 6 : 2);
  function hub() {
    const c = G.c;
    if (!c.fc || c.fc.season !== c.season) S.fcStart(c);
    G.step = 'fc'; save(); bar();
    if (c.fc.done || !S.fcNext(c)) return finishSeason();
    // Data de evento: entre um jogo e outro, a vida fora de campo (ui/match.js; a escolha volta para cá)
    if (S.fcEventDue(c)) {
      const ev = S.fcPickEvent(c);
      if (ev) { c.pendEv = ev; G.step = 'event'; save(); return U.eventScreen(); }
      save();
    }
    // Semana automática: fecha sozinha e a agenda mostra o que foi feito
    if (c.fc.wkDue && c.fcAuto) { S.fcWeek(c); save(); }
    phone();
  }
  // ---------- o celular (tela central) ----------
  // Barra de status do aparelho: dia e hora da véspera do jogo, energia
  function sbar(c) {
    const fc = c.fc, nx = S.fcNext(c), gd = dayOf(nx.e), eve = DAYS[(gd + 6) % 7];
    const hh = 17 + (fc.i * 7) % 5, mm = (fc.i * 23 + 11) % 60, clk = hh + ':' + String(mm).padStart(2, '0');
    const en = Math.round(fc.en === undefined ? 100 : fc.en);
    return { clk, html: '<div class="ph-bar"><span>' + eve + ' ' + clk + '</span><span class="' + (en < S.FC_EN_OUT ? 'out' : en < S.FC_EN_LOW ? 'low' : '') + '">Energia ' + en + '%</span></div>' };
  }
  // Um app aberto: a tela inteira é o celular (sem moldura desenhada). Topo com voltar, ícone e nome do app; o conteúdo
  // rola no meio; o ingresso do jogo fica sempre no mesmo lugar e do mesmo tamanho que no início
  const APP_EMO = { msg: '💬', ag: '📒', wk: '📒', bet: '🎰', shop: '🏷️', tbl: '📊', cal: '📋', me: '📈', evo: '📈', bank: '🏦', mkt: '🤝' };
  // Os apps são paródias (canvas "Apps do celular", 2026-11-05): nome e ícone desenhado aqui (sem logo de verdade). A
  // Agenda fica com o nome de sempre (o ícone é o do mockup). APP_LBL é o nome curto embaixo do ícone, quando o nome não cabe
  const APP_NAME = { msg: 'ZapZap', ag: 'Agenda', me: 'FutBim', bank: 'NuGrana', shop: 'Amazonas', tbl: 'SofáScore', cal: 'OneBola', mkt: 'TransferMarreco', bet: 'Bet171' };
  const APP_LBL = { mkt: 'Marreco' };
  const SV = (bg, inner) => '<svg viewBox="0 0 54 54" aria-hidden="true"><rect width="54" height="54" fill="' + bg + '"/>' + inner + '</svg>';
  const APP_SVG = {
    msg: SV('#1FA855', '<circle cx="27" cy="25" r="15" fill="#fff"/><path d="M14 42l3-11 8 5z" fill="#fff"/><text x="27" y="31.5" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="19" fill="#1FA855">Z</text>'),
    ag: SV('#FBF8EF', '<rect x="10" y="12" width="34" height="32" rx="5" fill="#fff" stroke="#13201A" stroke-width="2.5"/><path d="M10 17a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v5H10z" fill="#D8404A"/><text x="27" y="39" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="16" fill="#13201A">17</text>'),
    me: SV('#13201A', '<path d="M16 10h22v26l-11 8-11-8z" fill="#F2C230"/><text x="27" y="29" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="15" fill="#13201A">99</text>'),
    bank: SV('#7A2BD6', '<text x="27" y="34" text-anchor="middle" font-family="Barlow,sans-serif" font-weight="700" font-size="22" fill="#fff">ng</text>'),
    shop: SV('#FFB23F', '<path d="M13 20h28v18a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" fill="#C98B4A" stroke="#13201A" stroke-width="2"/><path d="M13 20l4-6h20l4 6M27 14v6" fill="none" stroke="#13201A" stroke-width="2" stroke-linejoin="round"/><path d="M6 47q5-4 10 0t10 0t10 0t10 0" fill="none" stroke="#1D4C9E" stroke-width="3" stroke-linecap="round"/>'),
    tbl: SV('#2C6BEA', '<rect x="15" y="17" width="24" height="11" rx="4" fill="#fff"/><rect x="10" y="24" width="34" height="11" rx="4" fill="#fff"/><path d="M14 35v5M40 35v5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'),
    cal: SV('#111', '<text x="20" y="37" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="26" fill="#fff">1</text><circle cx="34" cy="30" r="8" fill="#fff"/><path d="M34 26l3.5 2.6-1.3 4h-4.4l-1.3-4z" fill="#111"/>'),
    mkt: SV('#1A8F8A', '<path d="M12 46q14-16 28 0z" fill="#fff"/><circle cx="25" cy="22" r="10" fill="#fff"/><path d="M33 21l10 3-10 3z" fill="#F2C230"/><circle cx="28" cy="19" r="2" fill="#13201A"/>'),
    bet: SV('#D7263D', '<text x="27" y="20" text-anchor="middle" font-family="Barlow,sans-serif" font-weight="700" font-size="10" fill="#fff">bet</text><text x="27" y="38" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="20" fill="#F2C230">171</text>'),
  };
  // O ícone do app: o desenho próprio ou, sem desenho (Agenda, treino, evoluir), o emoji de sempre
  const appIco = (k, sz) => (APP_SVG[k] ? APP_SVG[k] : U.emo(APP_EMO[k] || '📱', sz || 'md'));
  const BACK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function appScr(cur, title, body, o) {
    o = o || {};
    const c = G.c;
    render('<div class="p2 pa" id="fc">' + U.modeHead({ mode: 'jaj', nav: 'back', id: 'fc-back', cfg: 'fc-cfg', label: 'Voltar' + (o.back ? ' para ' + o.back : ' ao início do celular'),
      title: (APP_EMO[cur] ? '<i class="p2-ai' + (APP_SVG[cur] ? ' sv' : '') + '">' + appIco(cur) + '</i>' : '') + title, right: o.right }) +
      '<div class="fc-scr pa-body p2-body' + (o.cls ? ' ' + o.cls : '') + '" id="fc-scr">' + body + '</div>' + (o.foot || '') +
      side(c) + '</div>');
    p2Chrome();
    sideBind();
    U.modeHeadBind({ cfg: 'fc-cfg' });
    $('fc-back').onclick = () => { sfx('tap'); phone(); };
  }
  // Fora da carreira de sempre: a barra do jogador some no celular (o widget Jogador mostra o mesmo)
  function p2Chrome() { document.body.classList.add('ph-nobar'); }
  // Ao lado do aparelho (embaixo, no celular): o tipo do jogo, o ingresso e os atalhos de resumir
  function side(c) {
    const nx = S.fcNext(c), fc = c.fc, kind = S.fcKind(c, nx);
    return '<div class="ph-side p2-foot">' +
        '<p class="prc-kind ' + kind + '">' + kindTxt(c, nx, kind) + '</p>' +
        '<button class="prc-tk" id="fc-play"><span class="prc-tk-m"><b>' + (nx.moment ? 'Jogar a decisão' : nx.vs ? 'Ir pro jogo' : 'Seguir') + '</b><small>' +
          (nx.vs ? esc(nameOf(nx.home ? c.club : nx.vs)) + ' × ' + esc(nameOf(nx.home ? nx.vs : c.club)) : esc(nx.compName)) + '</small></span><span class="prc-tk-s"><small>jogo</small><b>' + (fc.i + 1) + '</b></span></button>' +
        // Todo jogo é vivido; resumir é escolha (o da decisão não se resume)
        '<div class="prc-sim">' + (nx.vs && !nx.moment ? '<button class="link-btn" id="fc-brief">Resumir este jogo</button>' : '') +
          (kind !== 'vivo' ? '<button class="link-btn" id="fc-skip2">Resumir até o próximo jogo grande</button>' : '') + '</div>' +
      '</div>';
  }
  function sideBind() {
    $('fc-play').onclick = () => {
      if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); }
      const n = S.fcNext(G.c);
      if (!n.vs) return brief(n);
      fly(n, false, () => start(n));
    };
    if ($('fc-brief')) $('fc-brief').onclick = () => { sfx('tap'); if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); } brief(S.fcNext(G.c)); };
    if ($('fc-skip2')) $('fc-skip2').onclick = () => skipTo();
  }
  // Início do celular (proposta B do canvas "Celular do Jogo a Jogo"): a tela inteira é o aparelho. Em cima o dia e a
  // energia, configurações e sair; a notificação mais nova em faixa (+N abre as outras); os widgets Jogador (abre a
  // Ficha) e Próximo jogo (abre a Tabela); os nove apps em grade; o ingresso embaixo, igual em todo app.
  const GRID2 = ['msg', 'ag', 'me', 'bank', 'shop', 'tbl', 'cal', 'mkt', 'bet'].map(k => [k, APP_EMO[k], APP_LBL[k] || APP_NAME[k]]);
  const GEAR = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-2 1.2l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-2-1.2l-1.9.7-1.8-3.1 1.6-1.2a7.4 7.4 0 0 1 0-2.4L3.4 9.3l1.8-3.1 1.9.7a7.6 7.6 0 0 1 2-1.2l.3-2h3.6l.3 2a7.6 7.6 0 0 1 2 1.2l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2.4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const EXIT = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5 3 12l7.5 7.5M3.8 12h17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DAYS_LONG = { Seg: 'Segunda', Ter: 'Terça', Qua: 'Quarta', Qui: 'Quinta', Sex: 'Sexta', 'Sáb': 'Sábado', Dom: 'Domingo' };
  let nAll = false; // notificações abertas (todas) ou só a mais nova
  function meter(lbl, v, cls) { return '<span>' + lbl + '</span><i class="p2-mb"><i class="' + (cls || '') + '" style="width:' + Math.max(0, Math.min(100, Math.round(v))) + '%"></i></i>'; }
  function wPlayer(c) {
    const o = S.ovr(c), tot = U.totOf(c), tt = U.titlesOf(c);
    return '<button class="p2-w p2-wme" data-go="me" aria-label="Jogador: abrir o FutBim"><span class="p2-who"><span class="ovr metal ' + U.tierCls(o) + '">' + o + '</span>' +
      '<span class="p2-nm"><b>' + esc(c.name) + '</b><small>' + crest(c.club, 'xs') + esc(nameOf(c.club)) + '</small></span></span>' +
      '<span class="p2-ms">' + meter('Técnico', c.rel.coach) + meter('Torcida', c.rel.fans) + meter('Fama', c.fame / 3, 'fame') + '</span>' +
      '<small class="p2-tot">' + tot.map(([v, l]) => v + ' ' + l.toLowerCase()).join(' · ') + ' · ' + tt + (tt === 1 ? ' taça' : ' taças') + '</small></button>';
  }
  function wNext(c, nx) {
    if (!nx.vs) return '<button class="p2-w p2-wnx" data-go="cal" aria-label="Próximo jogo: abrir Jogos"><small class="p2-ey">Amanhã</small><span class="p2-vs">' + crest(c.club, 'lg') + '</span><b>Folga do time</b><small>' + esc(nx.compName) + '</small></button>';
    const p = Math.round(S.fcStartP(c) * 100);
    const st = nx.injury ? ['fora', 'lesionado'] : nx.on === null ? ['', p + '% de começar'] : nx.on ? ['on', 'titular'] : ['', nx.why === 'cansaço' ? 'poupado' : 'banco'];
    return '<button class="p2-w p2-wnx" data-go="' + (nx.comp === 'lg' ? 'tbl' : 'cal') + '" aria-label="Próximo jogo: abrir o ' + (nx.comp === 'lg' ? 'SofáScore' : 'OneBola') + '">' +
      '<small class="p2-ey">Amanhã · ' + (nx.home ? 'em casa' : 'fora') + '</small>' +
      '<span class="p2-vs">' + crest(nx.home ? c.club : nx.vs, 'lg') + '<em>×</em>' + crest(nx.home ? nx.vs : c.club, 'lg') + '</span>' +
      '<b>x ' + esc(nameOf(nx.vs)) + '</b><small>' + esc(nx.compName) + (nx.stage ? ' · ' + esc(nx.stage.toLowerCase()) : '') + ' <em class="p2-st ' + st[0] + '">' + st[1] + '</em></small></button>';
  }
  function phone() {
    const c = G.c, nx = S.fcNext(c), fc = c.fc;
    if (S.fcPhonePre) S.fcPhonePre(c, nx); // as pessoas do celular (engine/phone.js): lesão, jogo grande
    if (S.fcZeSync) S.fcZeSync(c); // a proposta do Zé chega como mensagem (engine/money.js)
    if (S.fcWinState) S.fcWinState(c); // a janela do meio do ano abre (engine/transfer.js)
    const sb = sbar(c), gd = dayOf(nx.e), eve = DAYS[(gd + 6) % 7];
    const en = Math.round(fc.en === undefined ? 100 : fc.en);
    const when = ['agora', '8 min', '25 min', '1 h', '2 h', '3 h'];
    const ps = pings(c, nx), first = ps.slice(0, nAll ? ps.length : 1);
    const ping = (n, k) => '<button class="p2-n"' + (n.go ? ' data-go="' + n.go + '"' : ' disabled') + '><span class="p2-nt"><b>' + esc(n.who) + ' <i>· ' + when[Math.min(k, when.length - 1)] + '</i></b><span>' + esc(n.txt) + '</span></span>' +
      (k === 0 && ps.length > 1 ? '<em class="p2-more" id="p2-more" role="button" tabindex="0" aria-label="' + (nAll ? 'Mostrar só a mais nova' : 'Ver as outras ' + (ps.length - 1) + ' notificações') + '">' + (nAll ? '−' : '+' + (ps.length - 1)) + '</em>' : '') + '</button>';
    const due = pendings(c);
    const app = ([k, e, n]) => { const u = due[k] || 0, lb = k === 'ag' && due.tr ? 'Treino' : n;
      return '<button class="p2-app' + (u ? ' due' : '') + (lb !== n ? ' tr' : '') + '" data-go="' + k + '" aria-label="' + n + (u ? ': ' + u + (u === 1 ? ' pendência' : ' pendências') : '') + '"><i' + (APP_SVG[k] ? ' class="sv"' : '') + '>' + appIco(k) + (u ? '<em class="ph-badge">' + Math.min(u, 99) + '</em>' : '') + '</i><span>' + lb + '</span></button>'; };
    render('<div class="p2" id="fc">' +
      U.modeHead({ mode: 'jaj', nav: 'home', id: 'p2-exit', cfg: 'p2-cfg', title: (DAYS_LONG[eve] || eve) + ', ' + sb.clk,
        sub: 'Jogo ' + (fc.i + 1) + ' do ano · <span class="p2-en ' + (en < S.FC_EN_OUT ? 'out' : en < S.FC_EN_LOW ? 'low' : '') + '">Energia ' + en + '%</span>' }) +
      '<div class="p2-mid">' +
        (ps.length ? '<div class="p2-ns' + (nAll ? ' all' : '') + '">' + first.map(ping).join('') + '</div>' : '') +
        '<div class="p2-ws">' + wPlayer(c) + wNext(c, nx) + '</div>' +
        '<nav class="p2-apps" aria-label="Apps">' + GRID2.map(app).join('') + '</nav>' + goalStrip(c, nx) +
      '</div>' + side(c) + (wide() ? aside(c) : '') + '</div>');
    if (wide()) $('fc').classList.add('p2-2c');
    bar(); p2Chrome();
    document.querySelectorAll('#fc [data-go]').forEach(b => { b.onclick = () => { sfx('tap'); go(b.dataset.go); }; });
    // Fechada, a notificação de cima abre a pilha (e o texto inteiro) ao ser tocada, como no celular de verdade; aberta, cada uma leva ao app dela
    const top = !nAll && document.querySelector('#fc .p2-ns .p2-n'), tx = top && top.querySelector('.p2-nt > span');
    if (top && (ps.length > 1 || tx.scrollWidth > tx.clientWidth + 1)) {
      top.disabled = false; top.classList.add('fold');
      top.onclick = () => { sfx('tap'); nAll = true; phone(); };
    }
    const more = $('p2-more');
    if (more) { const t = e => { e.stopPropagation(); sfx('tap'); nAll = !nAll; phone(); }; more.onclick = t; more.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') t(e); }; }
    $('p2-cfg').onclick = () => { sfx('tap'); U.settings(); };
    $('p2-exit').onclick = () => { sfx('tap'); U.ask('Voltar ao início?', 'Sua carreira fica salva e você continua de onde parou.', 'Ir para o início', U.toHome); };
    sideBind();
  }
  // O que espera um toque do jogador em cada app (a bolinha vermelha com o número). Some quando a coisa é feita, não
  // quando o app é aberto (só o Chat zera ao abrir). tr: o treino com lances da semana ainda por jogar (a Agenda vira "Treino")
  function pendings(c) {
    const fc = c.fc, u = {}, add = (k, v) => { if (v > 0) u[k] = (u[k] || 0) + v; };
    add('msg', Math.max((c.ppl && c.ppl.unread) || 0, S.fcAsks ? S.fcAsks(c) : 0)); // o que chegou e o que pede resposta
    const fx = S.fcZeOffer && S.fcZeOffer(c);
    if (fx && fx.st === 'open' && !u.msg) add('msg', 1); // a proposta do Zé se responde no Chat
    const tr = S.fcTrOpen(c, fc.wkDue ? pick || S.fcWeekAuto(c) : null);
    if (tr) { add('ag', 1); u.tr = 1; }
    add('ag', S.fcInvites(c).filter(x => !x.ans).length);
    if (S.fcGoals && S.fcGoals(c) && !fc.goals.dream) add('ag', 1);
    add('me', (c.pe || 0) >= 1 && S.canInvestAny(c) ? Math.floor(c.pe) : 0);
    if (S.fcDebt && S.fcDebt(c) > 0) add('bank', 1);
    if ((c.gear && c.gear.left <= 5) || (!c.gear && fc.gearOut)) add('shop', 1);
    const mw = S.fcWin && S.fcWin(c);
    if (mw && mw.offers.length) add('mkt', mw.offers.length); // propostas na mesa até assinar ou ficar
    return u;
  }
  // Faixa "perto de acontecer" no espaço que sobrava entre os apps e o ingresso: o que vem amanhã (estreia) ou como foi o
  // último jogo, a meta do ano mais perto de sair e os pontos para gastar antes do jogo
  function goalStrip(c, nx) {
    const fc = c.fc, last = fc.log[fc.log.length - 1], rows = [];
    const head = fc.i === 0 && nx.vs ? 'Amanhã é sua estreia: ' + esc(nx.compName)
      : last ? 'Último jogo: ' + (last.home ? esc(nameOf(c.club)) + ' ' + last.gf + '–' + last.ga + ' ' + esc(nameOf(last.vs)) : esc(nameOf(last.vs)) + ' ' + last.ga + '–' + last.gf + ' ' + esc(nameOf(c.club))) + (last.on && last.rating ? ' · nota ' + rate(last.rating) : '') : '';
    const gs = (S.fcGoals ? S.fcGoals(c) || [] : []).filter(g => typeof g.have === 'number' && g.n && g.have < g.n);
    gs.sort((a, b) => b.have / b.n - a.have / a.n);
    const g = gs[0];
    if (g) rows.push('<div class="p2-gr">' + U.emo(g.side === 'club' ? '⚽' : '🤝', 'md') + '<span><b>' + (g.side === 'club' ? 'Meta do clube: ' : 'Empresário: ') + esc(g.txt) + '</b>' +
      '<i class="p2-gb"><i style="width:' + Math.max(2, Math.round(g.have / g.n * 100)) + '%"></i></i></span><em>' + String(g.have).replace('.', ',') + ' de ' + String(g.n).replace('.', ',') + (g.size ? ' · +' + S.GOAL_SIZE[g.size] : '') + '</em></div>');
    if ((c.pe || 0) >= 1 && S.canInvestAny(c)) rows.push('<button class="p2-gr" data-go="evo">' + U.emo('📈', 'md') + '<span><b>' + c.pe + (c.pe === 1 ? ' ponto' : ' pontos') + ' para gastar antes do jogo</b></span><em class="go">Evoluir ›</em></button>');
    if (!head && !rows.length) return '';
    return '<div class="p2-goal">' + (head ? '<h3>' + head + '</h3>' : '') + rows.join('') + '</div>';
  }
  // Tela larga: a tabela e os jogos da próxima rodada da liga ao lado do celular (no celular ficam no app Tabela)
  function aside(c) {
    const fc = c.fc, rows = standings('lg'), n = rows.length, me = Math.max(0, rows.findIndex(x => x.i === 0));
    const a = Math.max(0, Math.min(me - 3, n - 8)), view = rows.slice(a, a + 8);
    const tb = '<div class="p2-tb"><div class="p2-ah2"><h3>' + esc(fc.lg.name) + '</h3><small>' + (rows[0].j ? 'depois de ' + D.plural(rows[0].j, 'rodada', 'rodadas') : 'antes da rodada 1') + ' · J · Pts</small></div>' +
      view.map((x, k) => '<div class="p2-tr' + (x.i === 0 ? ' me' : '') + '"><i>' + (a + k + 1) + '</i>' + crest(x.id, 'xs') + '<span>' + esc(nameOf(x.id)) + '</span><em>' + x.j + '</em><b>' + x.p + '</b></div>').join('') +
      '<button class="btn ghost sm" data-go="tbl">Tabela inteira</button></div>';
    const e = fc.cal.slice(fc.i).find(x => x.k === 'lg'), R = e && fc.lg.rounds[e.ri];
    const games = R ? R.slice().sort((x, y) => (x[0] === 0 || x[1] === 0 ? -1 : 0) - (y[0] === 0 || y[1] === 0 ? -1 : 0)).slice(0, 5) : [];
    const rd = games.length ? '<div class="p2-rd"><div class="p2-ah2"><h3>Jogos da rodada ' + (e.ri + 1) + '</h3><small>ficam ao vivo durante o seu jogo</small></div>' +
      games.map(([h, w]) => '<div class="p2-gm' + (h === 0 || w === 0 ? ' me' : '') + '"><span>' + esc(nameOf(fc.lg.ids[h])) + '</span>' + crest(fc.lg.ids[h], 'xs') + '<em>×</em>' + crest(fc.lg.ids[w], 'xs') + '<span>' + esc(nameOf(fc.lg.ids[w])) + '</span></div>').join('') + '</div>' : '';
    return '<aside class="p2-aside" aria-label="Tabela e rodada">' + tb + rd + '</aside>';
  }
  // Notificações do celular: quem fala e o que pede; cada uma abre a tela dela
  function pings(c, nx) {
    const fc = c.fc, out = [], n = (go, who, txt, pr) => out.push({ go, who, txt, pr: pr || 5, k: out.length });
    const p = Math.round(S.fcStartP(c) * 100);
    // Quem escreveu desde o último jogo (as duas mais novas), antes das notificações do clube
    const who = id => { const k = S.fcContact(c, id); return id === 'mae' ? k.name : k.name + ', ' + k.role; };
    if (S.fcPhoneNew) S.fcPhoneNew(c).slice(-2).reverse().forEach((m, k) => n(m.p === 'ze' ? 'ze' : 'ch:' + m.p, m.p === 'ze' ? 'Zé' : who(m.p), m.t, 3 + k));
    const coach = c.ppl ? who('coach') : 'Técnico', n1 = (g, w, t) => n(g, w, t, 1);
    if (nx.injury) n1(null, /suspensão/.test(nx.injury) ? 'Diretoria' : 'Departamento médico', /suspensão/.test(nx.injury) ? (/manipula/.test(fc.injName) ? 'Suspenso pelo caso do cartão combinado: fora por mais ' : /vermelho/.test(fc.injName) ? 'Suspenso pelo cartão vermelho: fora por mais ' : /amarelos/.test(fc.injName) ? 'Suspenso pelo terceiro amarelo: fora por mais ' : 'Suspenso por causa da aposta: fora por mais ') + nx.injLeft + (nx.injLeft === 1 ? ' jogo.' : ' jogos.') : nx.injury.charAt(0).toUpperCase() + nx.injury.slice(1) + ': fora por mais ' + nx.injLeft + (nx.injLeft === 1 ? ' jogo.' : ' jogos.') + (fc.wkDue ? ' Fisioterapia na semana ajuda.' : ''));
    else if (nx.vs) n1(null, coach, nx.on === null ? 'Escalo o time depois do treino da semana. Hoje você tem ' + p + '% de chance de começar.' : nx.on ? 'Amanhã você começa jogando. Conto contigo.' : nx.why === 'cansaço' ? 'Vou te poupar amanhã, você tá sem perna. Descansa.' : nx.why === 'banco' ? 'Amanhã você começa no banco. Treina forte que a chance aparece.' : 'Amanhã vou rodar o elenco e você fica fora.');
    const A = id => (S.FC_WEEK.find(a => a.id === id) || S.FC_WEEK[2]).name.toLowerCase().replace(/^treino /, '');
    // Repercussão: o que virou assunto no X (e, às vezes, num programa de TV)
    const n4 = (g, w, t) => n(g, w, t, 4);
    const nw = S.fcNewsFor && S.fcNewsFor(c, 'x');
    if (nw) { n('msg', 'X · assunto do momento', nw.x, 3); if (nw.tv) n('msg', nw.tv.who + ' ' + nw.tv.where, nw.tv.t, 4); }
    // Convites da semana ainda sem resposta (cada um abre a agenda, onde se responde)
    const open = S.fcInvites(c).filter(x => !x.ans);
    if (S.fcGoals && S.fcGoals(c) && !fc.goals.dream) n('ag', 'Agenda', 'Metas do ano: o clube e o empresário já passaram as deles. Falta escolher o seu sonho da temporada.', 2);
    open.slice(0, 2).forEach((x, k) => n('ag', who(S.fcInvDef(x).p), S.fcInvText(c, x), 2 + k * 2));
    const trt = S.fcTr(c);
    if (trt && trt.ok && fc.wkDue) n4('ag', 'Agenda', 'Treino com lances feito: +1 em ' + D.label(c.pos, trt.a) + '. Confira a semana antes do jogo.');
    else if (trt && !trt.ok) n4('ag', 'Agenda', 'Treino com lances: ' + trt.n + ' de ' + S.FC_TR_SESS + '. Falta' + (S.FC_TR_SESS - trt.n > 1 ? 'm ' : ' ') + (S.FC_TR_SESS - trt.n) + ' para o +1 em ' + D.label(c.pos, trt.a) + '.');
    else if (fc.wkDue) { if (!pick) pick = S.fcWeekAuto(c); n4('ag', 'Agenda', 'Treino da semana: ' + A(pick[0]) + (pick[0] === 'tec' && S.fcTrOpen(c, pick) ? ' com lances (+1 num atributo)' : '') + (open.length ? '. ' + (open.length === 1 ? '1 convite' : open.length + ' convites') + ' esperando resposta.' : '. Toque para mudar.')); }
    else if (fc.wkSum && fc.wkSum.at === fc.i) n4('ag', 'Agenda', 'Semana feita: ' + fc.wkSum.acts.map(A).join(' e ') + '. ' + (S.fcTrOpen(c) ? 'Ainda dá para treinar com lances antes do jogo: +1 num atributo.' : 'Energia ' + Math.round(fc.wkSum.en0) + ' → ' + Math.round(fc.wkSum.en1) + '.'));
    // Mercado: a janela do meio do ano aberta com propostas
    const mw = S.fcWin && S.fcWin(c);
    const sd = S.fcSond ? S.fcSond(c) : [];
    if (sd.length) n('mkt', 'TransferMarreco', 'Sondagem: ' + D.o(nameOf(sd[0].club)) + (sd.length > 1 ? ' e mais um clube perguntaram' : ' perguntou') + ' por você. A janela abre em ' + D.plural(Math.max(1, S.fcWinState(c).at - fc.i), 'jogo', 'jogos') + '.', 2);
    if (mw && mw.offers.length) n('mkt', 'TransferMarreco', (mw.offers.length > 1 ? mw.offers.length + ' propostas' : 'Proposta ' + D.do(nameOf(mw.offers[0].club))) + ' na mesa. A janela fecha ' + (S.fcWinLeft(c) > 1 ? 'em ' + S.fcWinLeft(c) + ' jogos.' : 'depois do próximo jogo.'), 1);
    // Banco: a conta no vermelho (as saídas estão no app)
    if (S.fcDebt && S.fcDebt(c) > 0) n('bank', 'NuGrana', 'Conta no vermelho: R$ ' + U.money(S.fcDebt(c)) + ' de dívida. Toque para ver as saídas.', 2);
    // Roupeiro: a chuteira (ou luva) acabando ou já rasgada
    const gw = c.pos === 'GOL' ? 'luva' : 'chuteira';
    if (c.gear && c.gear.left <= 5) n('shop', 'Roupeiro', 'Tua ' + gw + ' tá no fim: ' + (c.gear.left === 1 ? 'aguenta só mais 1 jogo.' : 'aguenta mais ' + c.gear.left + ' jogos.'));
    else if (!c.gear && fc.gearOut) n('shop', 'Roupeiro', c.pos === 'GOL' ? 'Tuas luvas rasgaram. Pede outras no Amazonas, chega antes do apito.' : 'Tua chuteira rasgou. Pede outra no Amazonas, chega antes do apito.');
    if ((c.pe || 0) >= 1 && S.canInvestAny(c)) n('evo', 'Preparador', 'Você tem ' + c.pe + (c.pe === 1 ? ' ponto' : ' pontos') + ' para gastar na ficha.');
    if (fc.wkDue && (fc.en === undefined ? 100 : fc.en) < S.FC_EN_LOW) n('ag', 'Preparador físico', 'Energia ' + Math.round(fc.en) + '. Marca um descanso na agenda.');
    const fx = S.fcZeOffer(c), bets = S.fcBets(c);
    if (fx && fx.st === 'open') n('ze', 'Zé', 'Tenho uma proposta pro teu próximo jogo. Só entre nós.');
    else if (bets.length) n('bet', 'Zé', bets.length === 1 ? 'Teu cupom tá feito. Sai na próxima rodada.' : 'Teus ' + bets.length + ' cupons tão feitos. Saem na próxima rodada.');
    else if (S.fcBetRound(c) && !(fc.zeMad > fc.i)) n('ze', 'Zé', 'A rodada tá aberta, com jogo de fora também. Quer um palpite?');
    // Tela limpa: as quatro mais importantes (o resto está nos apps); o Chat mostra o contador do que ficou de fora
    return out.sort((a, b) => a.pr - b.pr || a.k - b.k).slice(0, 4);
  }
  // Um convite na agenda: quem chamou (balão como no Chat) e as duas respostas (a segura com o que dá, a arriscada com a
  // chance no selo e o que acontece se der certo ou não). Sem tocar em nada, a semana fecha sem resposta, e isso a pessoa
  // também lembra. Respondido: o que escolheu e, na arriscada, só "Deu certo" ou "Não deu" (sem o número do sorteio).
  function invCard(c, x, k, day) {
    const d = S.fcInvDef(x), who = S.fcContact(c, d.p), wn = d.p === 'mae' ? 'Mãe' : who.name + ', ' + who.role;
    return '<div class="ag-blk ag-iv"><p class="ag-lbl">Convite · ' + day + '</p><div class="ag-who"><i class="ag-av">' + U.emo(who.icon || '💬', 'sm') + '</i><p class="ag-bub"><small>' + esc(wn) + '</small>' + esc(S.fcInvText(c, x)) + '</p></div>' + invOpts(c, x, k) + '</div>';
  }
  // As respostas do convite (ou o que deu, depois de responder): na Agenda e no ZapZap
  function invOpts(c, x, k) {
    const d = S.fcInvDef(x);
    const parts = fx => S.fcInvParts(c, fx).map(esc).join(' · ') || 'nada muda';
    const done = fx => S.fcInvParts(c, fx).filter(x => !/ gosta$| chatead[oa]$/.test(x)).map(esc).join(' · ') || 'feito'; // depois de responder, a relação fica só no tom da conversa
    if (x.ans) {
      const roll = x.ans === 'b' && !d.b.later, o = x.ans === 'a' ? d.a : d.b.later ? d.b : x.ok ? d.b.win : d.b.lose, lab = x.ans === 'a' ? d.a.l : d.b.l;
      const k2 = roll ? (x.ok ? 'Deu certo' : 'Não deu') : 'Sua resposta';
      return '<div class="ag-res ' + (roll ? (x.ok ? 'win' : 'lose') : '') + '"><em>' + k2 + '</em><b>' + esc(lab) + (roll ? ': ' + esc(o.tag.charAt(0).toLowerCase() + o.tag.slice(1)) : '') + '</b><span>' + done(o.fx) + (x.ans === 'b' && d.b.later ? ' · ' + esc(d.b.later) : '') + '</span></div>';
    }
    const p = Math.round(((d.b.press && c.staff && c.staff.press) ? d.b.press : (d.b.p || 1)) * 100);
    const riskTxt = d.b.later ? parts(d.b.fx) + '<i>' + esc(d.b.later) + '</i>' : '<i class="up">Dá certo: ' + parts(d.b.win.fx) + '</i><i class="down">Não dá: ' + parts(d.b.lose.fx) + '</i>';
    return '<div class="iv-o">' +
      '<button class="iv-b safe" data-inv="' + k + '" data-a="a"><em>SEGURA</em><b>' + esc(d.a.l) + '</b><small>' + parts(d.a.fx) + '</small></button>' +
      '<button class="iv-b risk" data-inv="' + k + '" data-a="b"><em>ARRISCADA' + (d.b.later ? '' : ' · ' + p + '%') + '</em><b>' + esc(d.b.l) + '</b><small>' + riskTxt + '</small></button>' +
      '</div><p class="iv-n">Sem resposta até o jogo: ' + parts(d.ig.fx) + '</p>';
  }
  // A Agenda (desenho aprovado em 2026-11-05): em cima a semana numa tira de dias (rotina do clube só um ponto, o dia do
  // jogo em ouro); depois o cartão "Antes do jogo" com o que é seu (treino da semana com as quatro opções à vista, o
  // treino com lances e os convites); embaixo, em painel, o jogo com energia, forma e técnico, e as metas do ano.
  const WK_EMO = { tec: '⚽', fis: '🏋️', rest: '🛏️', physio: '🩺' };
  const WK_SHORT = { tec: 'Técnico', fis: 'Físico', rest: 'Descanso', physio: 'Fisio' };
  let agGoals = false; // metas do ano abertas
  let dreamSel = null; // sonho marcado na agenda, ainda sem confirmar
  function agenda() {
    const c = G.c, nx = S.fcNext(c), fc = c.fc;
    const keep = $('ag') && $('fc-scr') ? $('fc-scr').scrollTop : -1; // tocar numa opção redesenha sem pular para o topo
    const lg = standings('lg'), posOf = id => lg.findIndex(x => x.id === id) + 1;
    const vsPos = nx.vs && nx.e.k === 'lg' ? posOf(nx.vs) : 0;
    // Os dias: do dia seguinte ao último jogo até a véspera deste
    const gd = dayOf(nx.e), pd = fc.i > 0 ? dayOf(fc.cal[fc.i - 1]) : 6;
    const days = []; for (let d = (pd + 1) % 7; d !== gd; d = (d + 1) % 7) days.push(d);
    const open = fc.wkDue, done = !open && fc.wkSum && fc.wkSum.at === fc.i ? fc.wkSum : null;
    if (open) { if (!pick) pick = S.fcWeekAuto(c); if (!S.fcWeekOk(c, pick[0], [])) pick = ['rest']; if (S.fcTr(c)) pick = ['tec']; }
    const acts = open ? pick : done ? done.acts : null;
    const A = id => S.FC_WEEK.find(a => a.id === id) || S.FC_WEEK[2];
    const DAYL = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
    // O treino no primeiro dia; cada convite num dia seguinte (semana curta: no último antes da viagem ou concentração)
    const invs = open ? S.fcInvites(c) : [];
    const lastFree = Math.max(0, days.length - (nx.vs ? 2 : 1));
    const invDay = ii => Math.max(0, Math.min(ii + 1, lastFree));
    const tr = S.fcTr(c), trOpen = !!(open && S.fcTrOpen(c, acts) && !(tr && (tr.ok || tr.fail)));
    const dreamOpen = !!(S.fcGoals && S.fcGoals(c) && !fc.goals.dream);
    const todo = (trOpen ? 1 : 0) + invs.filter(x => !x.ans).length + (dreamOpen ? 1 : 0);

    // A tira da semana
    const chip = (d, cls, emos, txt) => '<li class="ag-wd' + (cls ? ' ' + cls : '') + '"><b>' + DAYS[d] + '</b>' + (emos.length ? '<span>' + emos.map(e => U.emo(e, 'xs')).join('') + '</span>' : '<i></i>') + '<em>' + txt + '</em></li>';
    const strip = days.map((d, k) => {
      const mine = invs.map((x, ii) => (invDay(ii) === k ? x : null)).filter(Boolean), emos = [], txt = [];
      if (k === 0 && acts) { emos.push(WK_EMO[acts[0]] || '⚽'); txt.push(WK_SHORT[acts[0]] ? WK_SHORT[acts[0]].toLowerCase() : 'treino'); }
      if (mine.length) { emos.push('💬'); txt.push(mine.length > 1 ? mine.length + ' convites' : 'convite'); }
      if (emos.length) return chip(d, !done && ((k === 0 && trOpen) || mine.some(x => !x.ans)) ? 'me' : 'ok', emos.slice(0, 2), txt.join(' · '));
      if (k === days.length - 1 && nx.vs) return nx.home ? chip(d, '', ['🏨'], 'hotel') : chip(d, '', ['🚌'], 'viagem');
      return chip(d, '', [], 'clube');
    }).join('') + chip(gd, 'game', nx.vs ? ['🏟️'] : [], nx.vs ? 'jogo' : 'folga');

    // Treino com lances (treino técnico): escolha o atributo, jogue 3 lances antes do jogo e ganhe +1 nele (S.fcTrSession)
    const trBlock = () => {
      const t = tr, cap = S.FC_TR_CAP, used = cap - S.fcTrLeft(c), L = k => D.label(c.pos, k), E = S.eff(c);
      const yr = '<small class="ag-tr-n">' + (cap >= 99 ? (fc.trGot || 0) + (fc.trGot === 1 ? ' treino completo' : ' treinos completos') + ' no ano' : used + ' de ' + cap + ' no ano') + '</small>';
      if (!t && !S.fcTrOpen(c, acts)) return acts && acts[0] === 'tec' && S.fcTrLeft(c) <= 0 && !done ? '<p class="ag-tr-off">Treino com lances: os ' + cap + ' do ano já foram. Até a próxima temporada, o treino técnico vale +' + num2(S.FC_TRAIN_STEP) + ' de evolução.</p>' : '';
      const a = t ? t.a : trA && S.fcTrAttrOk(c, trA) ? trA : S.fcTrAttr(c);
      if (!a) return '';
      const N = S.FC_TR_SESS, n = t ? t.n : 0;
      const dots = '<span class="ag-tr-dots" aria-label="' + n + ' de ' + N + '">' + Array.from({ length: N }, (_, k) => '<i class="' + (k < n ? 'on' : '') + '"></i>').join('') + '</span>';
      const head = '<div class="ag-tr"><div class="ag-tr-h"><b>Treino com lances · +1 num atributo</b>' + dots + '</div>';
      if (t && t.ok) return head + '<p class="ag-tr-ok">+1 em ' + esc(L(a)) + ' · agora ' + E[a] + '. Fica na carreira.</p>' + yr + '</div>';
      if (t && t.fail) return head + '<p class="ag-tr-p">Sem o +1 desta vez: ' + t.hits + (t.hits === 1 ? ' acerto' : ' acertos') + ', precisava de ' + t.need + '. O treino técnico vale a evolução de sempre. Semana que vem tem mais.</p>' + yr + '</div>';
      const need = t ? t.need : S.fcTrNeed(c, a);
      const needTx = need ? 'Acerte ' + (need === 3 ? 'os 3' : need + ' dos 3') + ' para ganhar <b>+1 em ' + esc(L(a)) + '</b>.' : 'Jogue os ' + N + ' para ganhar <b>+1 em ' + esc(L(a)) + '</b>. Errar também conta.';
      const chips = t ? '' : '<div class="ag-tr-at" role="radiogroup" aria-label="Atributo do treino">' + S.attrOrder(c.pos).map(k => { const ok = S.fcTrAttrOk(c, k);
        return '<button class="ag-ta' + (k === a ? ' on' : '') + '" data-ta="' + k + '" role="radio" aria-checked="' + (k === a) + '"' + (ok ? '' : ' disabled') + '><b>' + esc(L(k)) + '</b><small>' + E[k] + '</small></button>'; }).join('') + '</div>';
      return head + chips +
        '<button class="ag-tr-go" id="ag-trgo" data-a="' + a + '">' + U.emo('⚽', 'sm') + ' Jogar lance ' + (n + 1) + ' de ' + N + ' · ' + esc(U.drillName(S.fcTrDrill(c, a, n))) + '</button>' +
        '<p class="ag-tr-p">' + needTx + (t && need ? ' Acertos até agora: ' + t.hits + '.' : '') + '</p>' + yr + '</div>';
    };
    // O treino da semana: as quatro opções sempre à vista, com a energia de cada uma
    const trainBlk = () => {
      if (!acts) return '';
      const a = A(acts[0]);
      const seg = S.FC_WEEK.map(o => {
        const ok = open && (tr ? o.id === 'tec' : S.fcWeekOk(c, o.id, [])); // começou o treino com lances: a semana fica no técnico
        return '<button class="ag-o' + (o.id === a.id ? ' on' : '') + '" data-id="' + o.id + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + (o.id === a.id) + '">' + U.emo(WK_EMO[o.id] || '⚽', 'sm') + '<b>' + esc(WK_SHORT[o.id] || o.name) + '</b><em>' + sgn(o.en, String) + U.emo('⚡', 'xs') + '</em></button>';
      }).join('');
      return '<div class="ag-blk"><p class="ag-lbl">Treino da semana · ' + DAYL[days[0]] + (done ? ' · feito' : '') + '</p><div class="ag-seg" role="group" aria-label="Treino da semana">' + seg + '</div>' +
        '<p class="ag-why"><b>' + esc(a.name) + ':</b> ' + esc(wkFx(c, a)) + ' · ' + sgn(a.en, String) + ' de energia na semana.</p>' + trBlock() + '</div>';
    };
    const sorted = invs.map((x, ii) => ({ x, ii })).sort((p, q) => invDay(p.ii) - invDay(q.ii));
    const blocks = trainBlk() + sorted.map(({ x, ii }) => invCard(c, x, ii, DAYL[days[invDay(ii)]] || DAYL[days[0]])).join('');
    const pill = todo ? '<span class="ag-pill todo">' + todo + ' por fazer</span>' : done ? '<span class="ag-pill ok">Feito</span>' : '';
    const card = blocks ? '<section class="ag-card"><header><h3>Antes do jogo</h3>' + pill + '</header>' + blocks + '</section>' : '';
    // Semana pronta: nada esperando um toque seu (fechada, mostra o que a semana deu)
    const sumTx = done ? 'Energia ' + Math.round(done.en0) + ' → ' + Math.round(done.en1) + (done.pe ? ' · +' + num2(done.pe) + ' de evolução' : '') + (done.tr ? ' · +1 em ' + D.label(c.pos, done.tr) : '') + (done.money > 0 ? ' · +R$ ' + U.money(done.money) : '') : 'Agora é com você no jogo.';
    const ready = todo ? '' : '<div class="ag-ready">' + U.emo('✅', 'md') + '<p><b>' + (done ? (c.fcAuto ? 'Semana automática feita' : 'Semana feita') : 'Semana pronta') + '</b><span>' + sumTx + '</span></p></div>';
    // O dia do jogo: adversário e a sua situação (titular, banco, lesão ou a chance de começar antes da escalação)
    const st = !nx.vs ? 'Folga' : nx.injury ? (/suspensão/.test(nx.injury) ? 'Suspenso' : 'Lesionado') : nx.on === null ? Math.round(S.fcStartP(c) * 100) + '% de começar' : nx.on ? 'Titular' : nx.why === 'cansaço' ? 'Poupado: energia baixa' : nx.why === 'banco' ? 'Banco' : 'Poupado';
    const stTx = nx.injury ? (nx.injLeft > 1 ? 'Fora por ' + nx.injLeft + ' jogos. ' : 'Volta no próximo jogo. ') : '';
    const en = Math.round(open ? S.fcWeekEnergy(c, pick) : fc.en === undefined ? 100 : fc.en);
    const lvl = e => (e < S.FC_EN_OUT ? 'out' : e < S.FC_EN_LOW ? 'low' : 'ok');
    const game = '<section class="ag-pn ag-game"><header><small>' + (DAYL[gd].charAt(0).toUpperCase() + DAYL[gd].slice(1)) + ' · o jogo</small><span class="ag-pill dk' + (nx.injury ? ' bad' : '') + '">' + esc(st) + '</span></header>' +
      '<b class="ag-vs">' + (nx.vs ? 'x ' + esc(nameOf(nx.vs)) + ', ' + (nx.home ? 'em casa' : 'fora') + (vsPos ? ' · ' + vsPos + 'º' : '') : 'Seu time folga nesta rodada') + '</b>' +
      '<p class="ag-comp">' + stTx + esc(nx.compName) + ' · ' + esc(nx.stage) + '</p>' +
      '<div class="ag-box"><div><small>' + (open ? 'Energia no jogo' : 'Energia') + '</small><b class="' + lvl(en) + '">' + en + '</b></div><div><small>Forma</small><b>' + formTxt(fc.fo || 0) + '</b></div><div><small>Técnico</small><b>' + Math.round(c.rel.coach) + '</b></div></div></section>';
    // Metas do ano: uma linha; abrem num toque (abertas sozinhas enquanto falta escolher o sonho)
    const gl = S.fcGoals ? S.fcGoals(c) : null;
    const gShort = g => (g.side === 'me' && !g.dream ? 'sonho: escolher' : g.n !== undefined && g.have !== null ? (g.side === 'emp' && /Nota/.test(g.txt) ? 'nota ' + rate(g.have) : Math.min(g.have, g.n) + ' de ' + g.n) : '');
    const goals = !gl ? '' : (agGoals || dreamOpen) ? '<section class="ag-pn ag-gl">' + goalsBox(c) + (dreamOpen ? '' : '<button class="link-btn" id="ag-gl">Fechar metas</button>') + '</section>'
      : '<button class="ag-pn ag-gl-c" id="ag-gl"><b>Metas do ano</b><span>' + gl.map(gShort).filter(Boolean).join(' · ') + '</span><em>Ver ›</em></button>';
    appScr('ag', 'Agenda', '<div class="ag2" id="ag">' +
        '<ol class="ag-wk" aria-label="A semana até o jogo">' + strip + '</ol>' +
        ready + card + game + goals +
        '<label class="fc-auto ag-auto"><input type="checkbox" id="fc-auto"' + (c.fcAuto ? ' checked' : '') + '><span>Repetir esta semana sozinho</span></label>' +
      '</div>', { cls: 'ag' });
    document.querySelectorAll('.ag-o').forEach(b => { b.onclick = () => { if (b.classList.contains('on')) return; sfx('tap'); pick = [b.dataset.id]; touched = true; agenda(); }; });
    document.querySelectorAll('[data-dream]').forEach(b => { b.onclick = () => { sfx('tap'); dreamSel = b.dataset.dream; agenda(); }; });
    if ($('ag-dr-go')) $('ag-dr-go').onclick = () => { if (dreamSel && S.fcDream(c, dreamSel)) { dreamSel = null; sfx('coin'); save(); agGoals = true; agenda(); } };
    document.querySelectorAll('[data-ta]').forEach(b => { b.onclick = () => { sfx('tap'); trA = b.dataset.ta; agenda(); }; });
    if ($('ag-gl')) $('ag-gl').onclick = () => { sfx('tap'); agGoals = !agGoals; agenda(); };
    const tg = $('ag-trgo');
    if (tg) tg.onclick = () => { sfx('tap'); if (open) { pick = ['tec']; touched = true; } U.fcDrill(c, tg.dataset.a, () => { if (G.c === c && $('fc-scr')) agenda(); }); };
    // Convite: a resposta sai na hora (a arriscada sorteia agora) e não volta atrás
    document.querySelectorAll('[data-inv]').forEach(b => { b.onclick = () => { const r = S.fcInvAnswer(c, +b.dataset.inv, b.dataset.a); if (!r) return; sfx(r.ok ? 'coin' : 'tap'); save(); bar(); agenda(); }; });
    $('fc-auto').onchange = e => { c.fcAuto = e.target.checked; if (c.fcAuto && c.fc.wkDue) { S.fcWeek(c, myPick()); unpick(); bar(); } save(); agenda(); };
    if (keep >= 0) $('fc-scr').scrollTop = keep; else window.scrollTo(0, 0);
  }
  // Metas do ano (engine/legado.js, plano fase 6): a do clube, a do empresário e o seu sonho (escolhido aqui, uma vez)
  const SIDE = { club: 'Clube', emp: 'Empresário', me: 'Seu sonho' };
  const legOf = z => '+' + S.GOAL_SIZE[z] + ' de legado';
  function goalsBox(c) {
    const rows = S.fcGoals ? S.fcGoals(c) : null;
    if (!rows) return '';
    const one = g => {
      // O sonho pendente é uma escolha, não um número: bloco dourado com opções em bilhete, marca ao tocar e confirma embaixo
      if (g.side === 'me' && !g.dream) {
        const ops = S.fcDreamOpts(c);
        if (!ops.includes(dreamSel)) dreamSel = null;
        return '<div class="ag-g pick ag-dr"><header><span class="ag-dr-t">' + U.emo('⭐', 'sm') + 'Escolha seu sonho</span><i class="ag-dr-tag">Falta escolher</i></header>' +
          '<p class="ag-dr-s">Toque em um. Vale o ano todo e não muda depois.</p><div class="ag-gd" role="radiogroup" aria-label="Seu sonho do ano">' +
          ops.map(id => { const on = dreamSel === id; return '<button role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-dream="' + id + '"><i class="ag-dr-r" aria-hidden="true"></i><b>' + esc(S.FC_DREAMS[id].name(c)) + '</b><small>+' + S.GOAL_SIZE[S.fcDreamSize(c, id)] + '<span>legado</span></small></button>'; }).join('') +
          '</div><button class="ag-dr-go" id="ag-dr-go"' + (dreamSel ? '' : ' disabled') + '>' + (dreamSel ? 'Confirmar sonho' : 'Escolha um sonho acima') + '</button></div>';
      }
      const n = g.n, h = g.have, done = n !== undefined && h !== null && h >= n;
      const prog = n === undefined || h === null ? '' : '<div class="ag-gb"><u style="width:' + Math.min(100, Math.round(h / n * 100)) + '%"></u></div><em>' + (g.side === 'emp' && /Nota/.test(g.txt) ? 'agora ' + rate(h) : h + ' de ' + n) + '</em>';
      return '<div class="ag-g' + (done ? ' done' : '') + (g.side === 'me' ? ' dream' : '') + '"><small>' + (g.side === 'me' ? U.emo('⭐', 'xs') : '') + SIDE[g.side] + ' · ' + legOf(g.size) + '</small><b>' + esc(g.txt) + (done ? ' ✓' : '') + '</b>' + prog + '</div>';
    };
    return '<div class="ag-goals"><h4>Metas do ano</h4>' + rows.map(one).join('') + '</div>';
  }
  // ---------- Chat: as conversas com as pessoas do celular (engine/phone.js) ----------
  // A lista (uma conversa por pessoa, a mais recente em cima) e, tocando, a conversa inteira em balões.
  // A relação não aparece em número: só no tom do que cada um escreve.
  let chatOpen = null, trA = null; // trA: atributo do treino com lances escolhido na agenda (antes do primeiro lance)
  let chTyping = null; // a pessoa digitando a resposta (por um instante)
  // ZapZap (o antigo Chat): a lista com quem espera resposta em cima e, tocando, a conversa. Cada mensagem pede resposta
  // até o próximo jogo (três respostas embaixo, engine/phone.js S.fcReply) e o convite da semana se responde ali também
  function chat() {
    const c = G.c, fc = c.fc, th = S.fcThreads(c);
    if (c.ppl) c.ppl.unread = 0;
    if (chatOpen && S.fcChatSeen) S.fcChatSeen(c, chatOpen);
    save();
    const when = m => (m.s === c.season ? (m.at >= fc.i ? 'agora' : 'jogo ' + m.at) : String(year() - c.season + m.s));
    // O Zé fica sempre na lista (é por ele que se pede palpite), mesmo antes da primeira mensagem
    if (!th.some(x => x.id === 'ze')) th.push({ id: 'ze', c: { id: 'ze', name: 'Zé', role: 'palpites', icon: '🎰' }, msgs: [{ t: 'Manda mensagem que eu te passo um palpite da rodada.', s: c.season, at: fc.i }] });
    const invs = S.fcInvites(c).map((x, k) => ({ x, k, p: S.fcInvDef(x).p }));
    invs.forEach(o => { if (!th.some(t => t.id === o.p)) th.unshift({ id: o.p, c: S.fcContact(c, o.p), msgs: [] }); });
    const due = t => t.msgs.filter(m => S.fcReplies(c, m)).length + invs.filter(o => o.p === t.id && !o.x.ans).length;
    th.sort((x, y) => (due(y) > 0) - (due(x) > 0));
    const t = chatOpen && th.find(x => x.id === chatOpen);
    const TK = '<i class="ch-tk" aria-label="visualizado">✓✓</i>';
    let body, foot = '';
    if (t) {
      const typing = chTyping === t.id, msgs = t.msgs.slice(-30), mine = invs.filter(o => o.p === t.id);
      const shown = typing ? msgs.slice(0, -1) : msgs;
      const ivAt = o => shown.findIndex(m => m.inv === o.x.id && m.s === c.season && m.at === fc.i);
      const ivHtml = o => '<div class="ch-b ch-iv"><span>' + esc(S.fcInvText(c, o.x)) + '</span>' + invOpts(c, o.x, o.k) + '</div>';
      let log = '';
      shown.forEach((m, j) => {
        mine.forEach(o => { if (ivAt(o) === j) log += ivHtml(o); });
        log += '<p class="ch-b' + (m.me ? ' me' : '') + '"><span>' + esc(m.t) + '</span><small>' + esc(when(m)) + (m.me ? ' ' + TK : '') + '</small></p>' + (t.id === 'ze' ? zeCard(c, m) : '');
      });
      mine.forEach(o => { if (ivAt(o) < 0) log += ivHtml(o); });
      if (typing) log += '<p class="ch-dots" aria-label="' + esc(t.c.name) + ' está digitando"><i></i><i></i><i></i></p>';
      body = '<div class="ch-head"><i>' + U.emo(t.c.icon, 'sm') + '</i><div><b>' + esc(t.c.name) + '</b><small class="' + (typing ? 'on' : '') + '">' + (typing ? 'digitando…' : esc(t.c.role)) + '</small></div></div>' +
        '<div class="ch-log">' + log + '</div>';
      const ask = !typing && t.msgs.find(m => S.fcReplies(c, m));
      if (t.id === 'ze') foot = zeReply(c);
      else if (ask) foot = '<div class="ch-rp"><small>Responder</small>' + S.fcReplies(c, ask).map((r, i) => '<button class="ch-chip" data-rp="' + ask.k + '" data-i="' + i + '"><span>' + esc(r.t) + '</span><em class="t' + i + '">' + esc(r.tag) + '</em></button>').join('') +
        '<small class="ch-vac">ou deixa no vácuo: ' + (t.id === 'mae' ? 'ela vê' : 'vê') + ' o visto azul</small></div>';
    } else {
      const wait = th.filter(x => due(x) > 0).length;
      body = th.length ? '<div class="ch-list">' + th.map(x => {
        const m = x.msgs[x.msgs.length - 1], iv = invs.find(o => o.p === x.id && !o.x.ans), n = due(x);
        const pv = iv ? '<b class="ch-tag">Convite</b>' + esc(S.fcInvText(c, iv.x)) : m ? (m.me ? TK + ' Você: ' : '') + esc(m.t) : '';
        return '<button class="ch-row' + (n ? ' due' : '') + '" data-ch="' + x.id + '"><i>' + U.emo(x.c.icon, 'sm') + '</i><span><b>' + esc(x.c.name) + (x.id === 'mae' ? '' : ' <small>' + esc(x.c.role) + '</small>') + '</b><em>' + pv + '</em></span>' +
          '<span class="ch-r"><small>' + (iv || !m ? 'agora' : esc(when(m))) + '</small>' + (n ? '<em class="ch-ct">' + n + '</em>' : '') + '</span></button>';
      }).join('') + '</div>' + (wait ? '<p class="ch-wait">' + (wait === 1 ? '1 pessoa esperando' : wait + ' pessoas esperando') + ' resposta. Quem fica no vácuo até o jogo vê o <b>visualizou e não respondeu</b>.</p>' : '') :
        '<p class="ch-none">Ninguém escreveu ainda. Depois dos jogos a família, os amigos e o pessoal do clube mandam mensagem.</p>';
    }
    appScr('msg', t ? esc(t.c.name) : APP_NAME.msg, body, { cls: 'ch' + (t && t.id === 'ze' ? ' ze' : ''), back: t ? 'Conversas' : 'Início', foot });
    if (t) $('fc-back').onclick = () => { sfx('tap'); chatOpen = null; chTyping = null; chat(); };
    if (t && t.id === 'ze') zeBind(c);
    document.querySelectorAll('[data-ch]').forEach(b => { b.onclick = () => { sfx('tap'); chatOpen = b.dataset.ch; chat(); }; });
    document.querySelectorAll('[data-rp]').forEach(b => { b.onclick = () => {
      const id = t.id, r = S.fcReply(c, +b.dataset.rp, +b.dataset.i);
      if (!r) return;
      sfx('tap'); save(); bar();
      chTyping = id; chat();
      setTimeout(() => { if (chTyping !== id) return; chTyping = null; if (chatOpen === id && document.querySelector('.p2-body.ch')) { sfx('paper'); chat(); } }, 1100);
    }; });
    document.querySelectorAll('.ch [data-inv]').forEach(b => { b.onclick = () => { const r = S.fcInvAnswer(c, +b.dataset.inv, b.dataset.a); if (!r) return; sfx(r.ok ? 'coin' : 'tap'); save(); bar(); chat(); }; });
    if (t) { const lg = document.querySelector('.ch-log'); if (lg && lg.lastElementChild) lg.lastElementChild.scrollIntoView({ block: 'end' }); } else window.scrollTo(0, 0);
  }
  // ---------- o Zé no Chat (engine/money.js): palpite com a cotação, aposta ali mesmo e a proposta do amarelo ----------
  const tipName = (t) => (t.m === 'x' ? (t.pick === 1 ? 'Empate' : 'Vitória do ' + nameOf(t.pick === 0 ? t.h : t.a)) : t.m === 'o25' ? (t.pick === 0 ? 'Mais de 2,5 gols' : 'Menos de 2,5 gols') : 'Ambos marcam');
  function zeCard(c, m) {
    const R$ = v => 'R$ ' + U.money(v), fc = c.fc;
    if (m.tip) {
      const t = m.tip, R = S.fcBetRound(c), live = R && R.ri === t.ri && !t.done, k = m.k; // m é cópia (S.fcThreads): k é a posição no histórico
      const head = '<b>' + esc(nameOf(t.h)) + ' × ' + esc(nameOf(t.a)) + '</b><small>' + esc(t.lg || '') + ' · ' + esc(tipName(t)) + ' · paga ' + String(t.odd.toFixed(2)).replace('.', ',') + '</small>';
      if (t.done) return '<div class="ze-tip done">' + head + '<em>Você apostou ' + R$(t.done) + ' · paga ' + R$(Math.round(t.done * t.odd)) + '</em></div>';
      if (!live) return '<div class="ze-tip off">' + head + '<em>A rodada já passou</em></div>';
      return '<div class="ze-tip">' + head + '<div class="ze-tip-s">' + S.fcBetStakes(c).map(v => '<button data-zt="' + k + '" data-v="' + v + '"' + ((c.money || 0) >= v ? '' : ' disabled') + '>' + R$(v) + '</button>').join('') + '</div>' +
        '<small class="ze-tip-r">Apostar é proibido para atleta: a cada aposta da temporada o faro da federação sobe (agora ' + Math.round(S.fcBetRisk(c) * 100) + '%).</small></div>';
    }
    const f = fc.fix;
    if (m.fix !== undefined && f && f.i === m.fix && m.fix === fc.i && f.st === 'open')
      return '<div class="ze-tip fix"><small>Se descobrirem (' + Math.round(S.FC_FIX_SCANDAL * 100) + '%): ' + S.FC_FIX_BAN + ' jogos de suspensão, técnico −20, torcida −15, fama −10 e manchete no jornal.</small>' +
        '<div class="ze-tip-a"><button class="btn ghost" data-zf="1">Topar</button><button class="btn ghost" data-zf="0">Tô fora</button></div></div>';
    return '';
  }
  function zeReply(c) {
    const can = S.fcZeCanTip(c), R = S.fcBetRound(c), tips = S.fcZeTips(c) || [];
    return '<div class="ch-reply"><button class="ch-q" id="ze-ask"' + (R && !can ? ' disabled' : '') + '>' + (!R ? 'Manda um palpite' : !can ? (S.fcZeMad(c) ? 'O Zé não está respondendo' : 'Sem mais palpites nesta rodada') : tips.length ? 'Manda outro palpite' : 'Manda um palpite') + '</button>' +
      '<button class="ch-q ghost" data-go2="bet">Ver extrato</button></div>';
  }
  function zeBind(c) {
    const a = $('ze-ask');
    if (a) a.onclick = () => { sfx('tap'); S.fcZeAsk(c); if (c.ppl) c.ppl.unread = 0; save(); chat(); };
    document.querySelectorAll('[data-zt]').forEach(b => { b.onclick = () => { if (S.fcZeBet(c, +b.dataset.zt, +b.dataset.v)) { sfx('coin'); if (c.ppl) c.ppl.unread = 0; save(); bar(); chat(); } }; });
    document.querySelectorAll('[data-zf]').forEach(b => { b.onclick = () => { if (S.fcZeFix(c, b.dataset.zf === '1')) { sfx(b.dataset.zf === '1' ? 'coin' : 'tap'); if (c.ppl) c.ppl.unread = 0; save(); chat(); } }; });
    document.querySelectorAll('[data-go2]').forEach(b => { b.onclick = () => { sfx('tap'); if (b.dataset.go2 === 'bet') zeTab = 'ext'; go(b.dataset.go2); }; });
  }
  // Apps do celular: cada um abre dentro do aparelho, com a barra de baixo
  const TITLE = Object.assign({ wk: 'Treino da semana', evo: 'Evoluir' }, APP_NAME);
  const LOJA_IMG = ['chuteira-g1', 'chuteira-g2', 'chuteira-g3', 'luvas-g1', 'luvas-g2', 'luvas-g3', 'pt', 'physio', 'nutri', 'video', 'press', 'c1', 'c2', 'c3', 'c4', 'house'];
  function go(k) {
    if (k === 'evo') return evolve();
    if (k === 'msg') { chatOpen = null; return chat(); }
    if (k === 'ze') { chatOpen = 'ze'; return chat(); }
    if (k.slice(0, 3) === 'ch:') { chatOpen = k.slice(3); return chat(); }
    if (k === 'ag') { agGoals = false; return agenda(); }
    const c = G.c, body = {
      wk: '<div class="fc-wk" id="fc-wk"></div><div class="fs-acts" id="fc-acts"></div>',
      tbl: '<div class="fc-tabs" id="fc-tabs"></div><div class="fs-tbl" id="fc-tbl"></div>',
      cal: '<div class="fc-comps" id="fc-comps"></div><div class="fc-cal" id="fc-cal"></div>',
      me: '<div class="fi-card" id="fc-fi"></div><div class="fi-next" id="fc-conq"></div>',
      shop: '<div class="fc-shop" id="fc-shop"></div>',
      bet: '<div class="fc-shop" id="fc-bet"></div>',
      bank: '<div class="fc-shop" id="fc-bank"></div>',
      mkt: '<div class="fc-mkt" id="fc-mkt"></div>',
    }[k];
    appScr(k, TITLE[k], body);
    if (k === 'wk') { weekBox(); weekActs(); }
    else if (k === 'tbl') { tblKey = null; table(); tabs(); }
    else if (k === 'cal') { compsBox(standings('lg').findIndex(x => x.i === 0) + 1); calBox(); }
    else if (k === 'me') ficha();
    else if (k === 'shop') shopBox();
    else if (k === 'bet') betRender();
    else if (k === 'bank') bankBox();
    else if (k === 'mkt') mktBox();
    if (c && $('fc-scr')) window.scrollTo(0, 0);
  }
  // Botão da tela de treino: fecha a semana e volta (semana já fechada: só volta)
  function weekActs() {
    const el = $('fc-acts');
    if (!el) return;
    el.innerHTML = '<button class="btn" id="fc-wkgo">' + (G.c.fc.wkDue ? 'Confirmar a semana' : 'Voltar ao celular') + '</button>';
    $('fc-wkgo').onclick = () => { if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); sfx('tap'); save(); bar(); } unpick(); hub(); };
  }


  // ---------- o jogo minuto a minuto: onde está a bola e a sua nota ----------
  // Só apresentação: parte do resultado que o motor já decidiu (gols, nota final, defesas, desarmes) e conta o caminho até ele.
  // bx[t] = posição da bola de 0 (sua área) a 100 (área deles); nota[t] = sua nota até o minuto t; lances = o que você fez.
  const LANCES = {
    up: { ATA: ['Bom drible na entrada da área', 'Finalização perigosa, o goleiro espalma', 'Ganha a dividida e sai jogando', 'Puxa o contra-ataque'],
      MEI: ['Lançamento perfeito', 'Bela tabela pelo meio', 'Rouba a bola no meio-campo', 'Chute de fora que assusta'],
      ZAG: ['Corte providencial', 'Antecipação na hora certa', 'Ganha pelo alto na área', 'Sai jogando com classe'],
      GOL: ['Sai bem do gol e fica com a bola', 'Reposição rápida que vira ataque', 'Segura firme o cruzamento', 'Fecha o ângulo e o atacante erra'] },
    down: { ATA: ['Perde a bola na frente', 'Chuta torto, longe do gol', 'Fica em impedimento', 'Some do jogo por uns minutos'],
      MEI: ['Erra o passe e cede o contra-ataque', 'Perde a dividida', 'Cartão amarelo por falta boba', 'Lento na saída de bola'],
      ZAG: ['Leva drible na lateral', 'Falta perigosa na entrada da área', 'Cartão amarelo', 'Perde o atacante de vista'],
      GOL: ['Rebate a bola para o meio da área', 'Sai mal no cruzamento', 'Reposição errada', 'Hesita na saída'] } };
  // O que cada lance seu faz no campinho (ui/livesim.js): a jogada acontece e só então a linha entra na narração
  const LACT = { 'Bom drible na entrada da área': 'drible', 'Finalização perigosa, o goleiro espalma': 'chute', 'Ganha a dividida e sai jogando': 'desarme', 'Puxa o contra-ataque': 'conduz',
    'Lançamento perfeito': 'passe', 'Bela tabela pelo meio': 'passe', 'Rouba a bola no meio-campo': 'desarme', 'Chute de fora que assusta': 'fora',
    'Corte providencial': 'corte', 'Antecipação na hora certa': 'corte', 'Ganha pelo alto na área': 'corte', 'Sai jogando com classe': 'conduz',
    'Sai bem do gol e fica com a bola': 'pega', 'Reposição rápida que vira ataque': 'passe', 'Segura firme o cruzamento': 'pega', 'Fecha o ângulo e o atacante erra': 'oppfora',
    'Perde a bola na frente': 'perde', 'Chuta torto, longe do gol': 'fora', 'Fica em impedimento': 'impedido', 'Some do jogo por uns minutos': 'none',
    'Erra o passe e cede o contra-ataque': 'erra', 'Perde a dividida': 'perde', 'Cartão amarelo por falta boba': 'falta', 'Lento na saída de bola': 'perde',
    'Leva drible na lateral': 'driblado', 'Falta perigosa na entrada da área': 'falta', 'Cartão amarelo': 'falta', 'Perde o atacante de vista': 'driblado',
    'Rebate a bola para o meio da área': 'rebate', 'Sai mal no cruzamento': 'saimal', 'Reposição errada': 'erra', 'Hesita na saída': 'perde',
    'Defesa difícil': 'defesa', 'Desarme limpo': 'desarme' };
  function flowOf(c, x, out) {
    const m = out.my, me = x.home ? 'h' : 'a', fc = c.fc;
    const r = S.rng(((Number(c.tseed) || 1) * 31 + fc.season * 977 + fc.i * 7919) >>> 0);
    const N = 100, nota = new Array(N + 1).fill(6), bx = new Array(N + 1).fill(50), lances = [];
    if (!m) return { nota, bx, lances, on: false, dom: U.LP.dom(bx) };
    const pos = c.pos, def = pos === 'GOL' || pos === 'ZAG';
    const steps = [], usedTxt = new Set(); // [minuto, variação, texto, bom]
    const one = list => { const free = list.filter(t => !usedTxt.has(t)), t = r.pick(free.length ? free : list); usedTxt.add(t); return t; };
    if (m.on) {
      m.ev.forEach(e => {
        if (e.me) steps.push([e.m, 1, 'Gol!', 1]);
        else if (e.as) steps.push([e.m, 0.6, 'Assistência para o gol', 1]);
        else if (e.s === me) steps.push([e.m, 0.1, '', 1]);
        else steps.push([e.m, def ? -0.4 : -0.2, def ? 'Gol sofrido' : '', 0]);
      });
      const spot = () => 3 + Math.floor(r() * 86);
      for (let i = 0; i < (m.saves || 0); i++) steps.push([spot(), 0.2, 'Defesa difícil', 1]);
      for (let i = 0; i < Math.min(4, m.tackles || 0); i++) steps.push([spot(), 0.12, 'Desarme limpo', 1]);
      // O resto da nota vem de lances soltos, a favor ou contra, até fechar na nota final do motor
      let rest = m.rating - 6 - steps.reduce((a, s) => a + s[1], 0);
      const n = 2 + Math.floor(r() * 3), pool = LANCES[rest >= 0 ? 'up' : 'down'][pos] || LANCES.up.ATA;
      for (let i = 0; i < n; i++) steps.push([spot(), rest / n, one(pool), rest >= 0 ? 1 : 0]);
      // Um lance contra e um a favor que se anulam: a nota balança mesmo num jogo morno
      if (r() < 0.8) { const d = 0.1 + r() * 0.15; steps.push([spot(), d, one(LANCES.up[pos]), 1]); steps.push([spot(), -d, one(LANCES.down[pos]), 0]); }
      steps.sort((a, b) => a[0] - b[0]);
      let v = 6, k = 0;
      for (let t = 0; t <= N; t++) {
        while (k < steps.length && steps[k][0] === t) { v += steps[k][1]; if (steps[k][2]) lances.push({ m: t, txt: steps[k][2], up: steps[k][3], d: steps[k][1] }); k++; }
        nota[t] = Math.max(3, Math.min(10, v));
      }
      const end = Math.max(90, ...m.ev.map(e => e.m)); for (let t = end; t <= N; t++) nota[t] = m.rating;
    }
    // A bola: deriva para quem é mais forte, corre para a área antes de cada gol e volta ao meio depois
    const mine = D.CLUB_BY_ID[c.club], opp = x.vs && D.CLUB_BY_ID[x.vs];
    const bias = opp ? Math.max(-1.5, Math.min(1.5, (mine.strength - opp.strength) / 6)) : 0;
    const pull = new Array(N + 1).fill(null);
    m.ev.forEach(e => { const tgt = e.s === me ? 96 : 4; for (let t = Math.max(0, e.m - 3); t <= e.m; t++) pull[t] = tgt; });
    lances.forEach(l => { if (pull[l.m] === null) pull[l.m] = def ? (l.up ? 22 : 12) : (l.up ? 80 : 58); });
    let b = 50;
    for (let t = 0; t <= N; t++) {
      if (pull[t] !== null) b += (pull[t] - b) * 0.55;
      else b += (r() - 0.5) * 34 + bias * 3 + (50 - b) * 0.12;
      b = Math.max(3, Math.min(97, b)); bx[t] = Math.round(b);
      if (m.ev.some(e => e.m === t - 1)) b = 50; // saída de bola
    }
    return { nota, bx, lances, on: !!m.on, dom: U.LP.dom(bx) };
  }
  // ---------- a partida vista de cima (ui/livepitch.js): campinho, faixa, nota, narração ----------
  const sobre = c => c.name.trim().split(/\s+/).pop();
  const STAR = '<svg class="lp-st" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"/></svg>';
  const GOALTXT = { 'Gol!': 1, 'Assistência para o gol': 1, 'Gol sofrido': 1 }; // já entram na narração como gol
  // Placar do ao vivo: escudos, placar, minuto e a faixa "quem manda no jogo"
  function sbLive(x) {
    const my = G.c.club, h = x.home ? my : x.vs, a = x.home ? x.vs : my;
    const side = id => '<div class="lp-tm' + (id === my ? ' me' : '') + '">' + crest(id, 'md') + '<span>' + esc(nameOf(id)) + '</span><i class="lp-rcs" id="lp-rc-' + (id === h ? 'h' : 'a') + '"></i></div>';
    return '<div class="lp-sb" id="lp-sb"><div class="lp-sbr">' + side(h) +
      '<div class="lp-sc"><b><span id="fc-sh">0</span><i>x</i><span id="fc-sa">0</span></b><small class="lp-min" id="fc-lt">0\'</small></div>' + side(a) + '</div>' +
      '<div class="lp-lbl lp-whor"><span>Quem manda no jogo</span><span id="lp-who"></span></div><div id="lp-strip"></div></div>';
  }
  const numOf = c => (c.pos === 'GOL' ? 1 : c.pos === 'ZAG' ? 4 : c.pos === 'MEI' ? 10 : 9);
  function flowBox(c, x, f, meIdx) {
    return U.LP.pitch({ cv: !!U.LP.sim, me: f.on ? meIdx : -1, num: numOf(c) }) +
      (f.on ? '' : '<p class="lp-off">' + (x.injury ? 'Você está fora, lesionado. Acompanha da arquibancada.' : 'Você está no banco. Acompanha de perto.') + '</p>');
  }
  function notaBox(f) {
    return f.on ? '<div class="lp-nota"><small>Sua nota</small><div><b id="fl-n">6,0</b><em id="fl-d"></em></div><p id="fl-last"></p></div>' : '';
  }
  // Faltas, cartões e impedimento na narração (o motor diz a posição de quem fez; o texto varia pelo minuto)
  const CPOS = { GOL: 'o goleiro', ZAG: 'o zagueiro', LAT: 'o lateral', VOL: 'o volante', MEI: 'o meia', PON: 'o ponta', ATA: 'o atacante' };
  const CWHY = {
    falta: ['chega atrasado e derruba', 'para o contra-ataque na falta', 'puxa a camisa na entrada da área', 'entra forte na dividida'],
    amarelo: ['Chegou atrasado e o juiz não perdoou.', 'Parou o contra-ataque com falta.', 'Puxou a camisa e levou.', 'Reclamou demais com o juiz.', 'Entrada dura no meio-campo.'],
    direto: ['Entrada com a sola, sem chance de defesa.', 'Agressão longe da bola, o juiz viu.', 'Último homem, derrubou quem ia sair cara a cara.'],
    imp: ['saiu antes da hora', 'estava adiantado por meio corpo', 'ficou na banheira', 'não voltou a tempo'],
  };
  const cdIc = t => (t === 'amarelo' ? '<i class="cd-y"></i>' : t === 'vermelho' ? '<i class="cd-r"></i>' : '');
  function cardTxt(c, e, who) {
    const pk = a => a[e.m % a.length], p = e.me ? '<b class="lp-nm">' + esc(sobre(c)) + '</b>' : CPOS[e.pos] || 'o jogador', pw = e.me ? p : p + ' ' + esc(D.do(who));
    if (e.t === 'falta') return 'Falta: ' + pw + ' ' + pk(CWHY.falta) + '.';
    if (e.t === 'impedimento') return '<b>Impedimento.</b> ' + (e.me ? p : pw.charAt(0).toUpperCase() + pw.slice(1)) + ' ' + pk(CWHY.imp) + '.';
    if (e.t === 'amarelo') return cdIc('amarelo') + ' <b>Amarelo para ' + (e.me ? 'você' : pw) + '.</b> ' + pk(CWHY.amarelo);
    return (e.how === '2am' ? cdIc('amarelo') : '') + cdIc('vermelho') + ' <b>' + (e.how === '2am' ? 'Segundo amarelo, ' : 'Vermelho direto, ') + (e.me ? 'você está expulso' : pw + ' expulso') + '.</b> ' +
      (e.how === '2am' ? '' : pk(CWHY.direto) + ' ') + (e.me ? 'Fora do próximo jogo.' : esc(who) + ' fica com um a menos.');
  }
  // A narração: o mais novo em cima; os seus lances em dourado
  function feed(m, html, cls, star) {
    const ul = $('fc-feed'); if (!ul) return;
    ul.insertAdjacentHTML('afterbegin', '<li class="' + (cls || '') + '"><i>' + clock(m) + '</i><span>' + html + '</span>' + (star ? STAR : '') + '</li>');
    while (ul.children.length > 8) ul.lastChild.remove();
  }
  const NARR = {
    up: ['{me} chega com perigo pela {lado}', 'Cruzamento {do_me}, a zaga afasta', 'Escanteio para o {me}', '{me} troca passes na entrada da área', 'Chute de fora {do_me}, por cima'],
    down: ['{op} aperta, a zaga {do_me} afasta', 'Chute {do_op}, por cima do gol', 'Escanteio para o {op}', '{op} chega pela {lado}', 'Falta perigosa para o {op}'],
    mid: ['{me} troca passes no meio', 'Jogo truncado no meio-campo', 'Falta no meio-campo', '{op} tenta sair jogando', 'Bola longa, ninguém alcança']
  };
  function narr(r, b, y, me, op) {
    const k = b >= 70 ? 'up' : b <= 30 ? 'down' : 'mid', lado = y < 38 ? 'esquerda' : y > 62 ? 'direita' : 'meio';
    return r.pick(NARR[k]).replace('{lado}', lado === 'meio' ? 'meio' : lado).replace('pela meio', 'pelo meio')
      .replace('{do_me}', D.do(me)).replace('{do_op}', D.do(op)).replace(/\{me\}/g, me).replace(/\{op\}/g, op);
  }
  // Os números do jogador até o minuto t (só apresentação, a partir dos lances e da nota)
  function statsAt(c, f, t, ev, meSide) {
    const L = f.lances.filter(l => l.m <= t), n = Math.max(4.5, Math.min(10, f.nota[Math.min(t, 100)] + (f.off || 0)));
    const has = re => L.filter(l => re.test(l.txt)).length;
    const base = { ATA: 34, MEI: 56, ZAG: 44, GOL: 26 }[c.pos] || 40;
    const toq = Math.max(1, Math.round(base * Math.min(t, 90) / 90 * (0.85 + (n - 6) * 0.12)));
    const gk = c.pos === 'GOL';
    return { n, toq, a: gk ? has(/defesa|segura|fecha|sai bem/i) : has(/chut|finaliz|gol!|cabece/i), al: gk ? 'Defesas' : 'Chutes',
      b: gk ? ev.filter(e => e.m <= t && e.s !== meSide).length : has(/desarme|rouba|corte|antecip|ganha|dividida/i), bl: gk ? 'Sofridos' : 'Desarmes' };
  }
  // Fala do técnico no intervalo: pela sua nota e pelo placar
  function coachTalk(c, n, diff, ax) {
    const sn = sobre(c), atk = c.pos === 'ATA' || c.pos === 'MEI';
    if (n < 6) return sn + ', você sumiu no primeiro tempo. Quero você participando mais.';
    if (diff < 0) return atk ? (ax < 55 && c.pos === 'ATA' ? sn + ', você está voltando demais. Fica lá na frente que a bola vai chegar.' : 'Estamos atrás. Preciso de você mais perto da área.') : 'Segura atrás que a gente busca o empate.';
    if (n >= 7) return 'Tá jogando muito, ' + sn + '. Continua assim.';
    if (diff > 0) return 'Bom primeiro tempo. Cabeça no lugar e não deixa voltar.';
    return 'Jogo travado. Paciência, a chance vai aparecer.';
  }
  function statBoxes(items) {
    return '<div class="lp-stats">' + items.map(([k, v, hi]) => '<div' + (hi ? ' class="hi"' : '') + '><small>' + k + '</small><b>' + v + '</b></div>').join('') + '</div>';
  }

  // ---------- jogo ao vivo ----------
  // Tela própria: o placar com a faixa, o campinho, você (nota, energia, esforço), o plantão, a narração e a barra de baixo.
  // No computador: você à esquerda, o jogo no meio, a tabela e a rodada à direita
  function matchView() {
    render(
      '<div class="fs fc live lp-v" id="fc">' +
        '<div class="fs-main">' +
          '<div class="eyebrow">Temporada ' + (year()) + ' · ' + esc(nameOf(G.c.club)) + '</div><h2 id="fc-h"></h2>' +
          '<div class="lp-mecol" id="fc-mecol"><div class="lp-me-c" id="fc-mecard"><div id="fc-nota"></div><div class="fc-wk" id="fc-wk"></div></div><div class="lp-mine" id="fc-mine"></div></div>' +
          '<div class="lp-ctr">' +
            '<div class="fs-match" id="fc-match"></div>' +
            '<div class="fc-flow lp-flow" id="fc-flow"></div>' +
            '<p class="lp-tv" id="fc-tv" hidden></p>' +
            '<ul class="lp-feed" id="fc-feed"></ul>' +
            '<div class="fs-acts lp-acts" id="fc-acts"></div>' +
            '<div class="fs-round" id="fc-round"></div>' +
          '</div>' +
        '</div>' +
        '<div class="fs-side"><div class="fc-tabs" id="fc-tabs"></div><div class="fs-tbl" id="fc-tbl"></div></div>' +
      '</div>'
    );
    tblKey = null;
  }

  // Classificação: liga (com zonas) ou o grupo do continental. tab: a tabela do motor; live: placares parciais a somar
  let tblKey = null, rowEl = null, tblView = 'lg';
  function standings(view, live) {
    const fc = G.c.fc, L = view === 'lg' ? fc.lg : { ids: fc.cont.group, tab: fc.cont.gtab };
    const tab = L.tab.map(x => Object.assign({}, x));
    if (live) live.forEach(([a, b, gh, ga]) => {
      const A = tab[a], B = tab[b];
      A.j++; B.j++; A.gp += gh; A.gc += ga; B.gp += ga; B.gc += gh;
      if (gh > ga) { A.p += 3; A.v++; B.d++; } else if (gh < ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
    });
    return S.fcOrder(tab).map(i => Object.assign({ i, id: L.ids[i] }, tab[i]));
  }
  function table(live) {
    const fc = G.c.fc, view = tblView === 'cont' && !fc.moved && fc.cont && fc.cont.gtab ? 'cont' : 'lg', box = $('fc-tbl');
    if (!box) return 0;
    const rows = standings(view, live && live[view]), n = rows.length;
    const zone = view === 'cont' ? pos => (pos <= 2 ? ' z-up' : '') : pos => (fc.lg.promo && pos <= fc.lg.promo ? ' z-up' : fc.lg.releg && pos > n - fc.lg.releg ? ' z-down' : !fc.lg.promo && pos === 1 ? ' z-top' : '');
    // Montada uma vez por tabela; depois as linhas só trocam de lugar e de números (os escudos não piscam)
    const fresh = tblKey !== view;
    if (fresh) {
      tblKey = view; rowEl = {};
      box.innerHTML = '<div class="fs-th"><i>#</i><span>Time</span><b>P</b><em>J</em><em>V</em><em>SG</em></div><div class="fs-rows"></div>' +
        '<p class="fs-legend">' + (view === 'cont' ? '<span class="z-up">Mata-mata</span>' : (fc.lg.promo ? '<span class="z-up">Acesso</span>' : '<span class="z-top">Título</span>') + (fc.lg.releg ? '<span class="z-down">Rebaixamento</span>' : '')) + '</p>';
      rows.forEach(x => { const d = document.createElement('div'); d.innerHTML = '<i></i>' + crest(x.id, 'xs') + '<span>' + esc(nameOf(x.id)) + '</span><b></b><em></em><em></em><em></em>'; rowEl[x.i] = d; });
    }
    const list = box.querySelector('.fs-rows');
    // Com a bola rolando: a posição antes da rodada (setas de quem sobe e desce) e o seu rival direto destacado
    const base = standings(view), pos0 = {}; base.forEach((x, j) => { pos0[x.i] = j + 1; });
    const rv = view === 'lg' ? rivalOf(base) : -1;
    rows.forEach((x, j) => {
      const d = rowEl[x.i], ch = d.children, sg = x.gp - x.gc, mv = live && base[0].j ? pos0[x.i] - (j + 1) : 0; // na 1ª rodada a ordem de antes não diz nada
      d.className = 'fs-tr' + zone(j + 1) + (x.i === 0 ? ' me' : '') + (x.i === rv ? ' rv' : '');
      ch[2].innerHTML = esc(nameOf(x.id)) + (x.i === rv ? '<small class="fs-rv">rival</small>' : '') + (mv ? '<small class="fs-mv ' + (mv > 0 ? 'up' : 'down') + '">' + (mv > 0 ? '▲' : '▼') + Math.abs(mv) + '</small>' : '');
      ch[0].textContent = j + 1; ch[3].textContent = x.p; ch[4].textContent = x.j; ch[5].textContent = x.v; ch[6].textContent = (sg > 0 ? '+' : '') + sg;
      if (list.children[j] !== d) list.insertBefore(d, list.children[j] || null);
    });
    // Só ao montar: a sua linha no meio do quadro (depois, quem rola é você). Medida pela tela, dividida pelo zoom
    const mine = box.querySelector('.me');
    if (fresh && mine && box.scrollHeight > box.clientHeight) {
      const zk = U.zk ? U.zk() : 1, a = mine.getBoundingClientRect(), b = box.getBoundingClientRect();
      box.scrollTop += (a.top - b.top) / zk - box.clientHeight / 2 + a.height / zk / 2;
    }
    return rows.findIndex(x => x.i === 0) + 1;
  }
  // Rival direto na liga (índice na tabela, -1 sem rival): perto de uma linha que vale (título, acesso ou G4, queda), quem
  // está do outro lado dela e mais perto em pontos; longe das linhas, o time logo acima (o 2º, para quem lidera)
  function rivalOf(rows) {
    const fc = G.c.fc, n = rows.length, me = rows.findIndex(x => x.i === 0);
    if (me < 0 || n < 2 || !rows[0].j) return -1;
    const lines = [1, fc.lg.promo || 4].concat(fc.lg.releg ? [n - fc.lg.releg] : []); // linha k: entre a k-ésima e a k+1-ésima
    let best = null;
    lines.forEach(k => {
      const above = me < k;
      if (Math.abs(above ? k - me - 1 : me - k) > 2) return;
      const other = above ? k : k - 1; // o primeiro do outro lado da linha
      if (other === me || other < 0 || other >= n) return;
      const gap = Math.abs(rows[other].p - rows[me].p);
      if (gap <= 6 && (!best || gap < best.gap)) best = { i: rows[other].i, gap };
    });
    if (best) return best.i;
    return rows[me === 0 ? 1 : me - 1].i;
  }
  function tabs() {
    const fc = G.c.fc, el = $('fc-tabs');
    if (fc.moved) tblView = 'lg'; // trocou no meio do ano: o grupo continental ficou com o clube de antes
    if (fc.moved || !fc.cont || !fc.cont.gtab || fc.cont.md.length === 0) { el.innerHTML = '<div class="fc-tl">' + esc(fc.lg.name) + '</div>'; return; }
    el.innerHTML = '<div class="seg fc-seg"><button data-v="lg"' + (tblView === 'lg' ? ' class="on"' : '') + '>' + esc(fc.lg.name) + '</button><button data-v="cont"' + (tblView === 'cont' ? ' class="on"' : '') + '>Grupo · ' + esc(fc.cont.name) + '</button></div>';
    el.querySelectorAll('button').forEach(b => { b.onclick = () => { tblView = b.dataset.v; tabs(); table(); }; });
  }

  // Seleção no jornal (plano, fase 5), de vez em quando: o ranking do país, o próximo torneio e a sua situação na lista
  function natLine(c) {
    const fc = c.fc, nx = S.natNext && S.natNext(c);
    if (!nx || (fc.i % 8 !== 4 && !window.CLIMBIX_NAT) || c.age < 17) return '';
    const call = S.wcCall(c), o = S.ovr(c), rk = S.natRank(c.country);
    const me = call.retired ? 'Você já se despediu da seleção.' : o >= call.cut + 5 ? 'Você é nome certo na lista.' : o >= call.cut ? 'Você está na lista, mas a vaga não é garantida.' : 'Para ser convocado, a seleção pede nota geral ' + call.cut + ' (você tem ' + o + ').';
    return '<p class="jn-nat">' + U.flag(D.NATION_BY_NAME[c.country].flag) + ' ' + esc(c.country) + ' é ' + rk + 'º no ranking de seleções. Próximo torneio: ' + esc(nx.name) + ' ' + nx.year + '. ' + me + '</p>';
  }
  // Cartão do jogo: o próximo (antes), ao vivo ou o resultado
  function card(state, x, t) {
    const fc = G.c.fc, my = G.c.club;
    if (!x.vs) return '<div class="fs-bye">' + (state === 'live' ? 'Rodada ao vivo · <span id="fc-lt">' + clock(t) + '</span>. ' : '') + 'Seu time folga nesta rodada.</div>';
    const h = x.home ? my : x.vs, a = x.home ? x.vs : my;
    const side = id => '<div class="fs-tm' + (id === my ? ' me' : '') + '">' + crest(id, 'md') + '<span>' + esc(nameOf(id)) + '</span></div>';
    const tag = esc(x.compName) + ' · ' + esc(x.stage);
    if (state === 'next') {
      const who = x.week ? 'A escalação sai depois da sua semana' : x.injury ? (/suspensão/.test(x.injury) ? (/manipula/.test(x.injury) ? 'Suspenso (cartão combinado): ' : /vermelho/.test(x.injury) ? 'Suspenso (cartão vermelho): ' : /amarelos/.test(x.injury) ? 'Suspenso (3 amarelos): ' : 'Suspenso (aposta): ') : 'Lesionado (' + esc(x.injury) + '): ') + (x.injLeft > 1 ? 'fora por mais ' + x.injLeft + ' jogos' : 'volta no próximo jogo') : x.on ? 'Você começa jogando' : x.why === 'banco' ? 'Você fica no banco' : x.why === 'cansaço' ? 'Energia baixa: o técnico vai poupar você' : 'O técnico vai poupar você neste jogo';
      return '<div class="fs-card next' + (x.moment ? ' dec' : '') + '"><div class="fs-lbl">' + tag + '</div><div class="fs-sc">' + side(h) + '<b><i>×</i></b>' + side(a) + '</div>' +
        '<p class="fs-line">' + (x.home ? 'Em casa' : 'Fora de casa') + ' · ' + who + '</p>' + (x.moment ? '<p class="fc-dec">' + U.emo('🎯', 'xs') + ' Jogo com lance decisivo seu</p>' : '') + '</div>';
    }
    const live = state === 'live', m = x.res;
    const [gh, ga] = live ? x.score(t) : x.home ? [m.gf, m.ga] : [m.ga, m.gf];
    const mf = x.home ? gh : ga, mg = x.home ? ga : gh, out = m.won && x.knock ? 'win' : mf > mg ? 'win' : mf < mg ? 'loss' : x.knock && !live ? (m.won ? 'win' : 'loss') : 'draw';
    const lbl = live ? '<span class="fs-dot" aria-hidden="true"></span><span id="fc-lt">' + tag + ' · ' + clock(t) + '</span>'
      : tag + ' · ' + (out === 'win' ? 'Vitória' : out === 'loss' ? 'Derrota' : 'Empate') + (m.pens ? ' nos pênaltis' : '');
    const evs = side2 => m.ev.filter(e => e.s === side2 && e.m <= (live ? t : 99)).map(play1).join('');
    const line = !m.on ? (x.injury ? 'Lesionado: fora deste jogo' : 'Você não entrou em campo')
      : live ? 'Você está em campo'
      : [m.goals ? m.goals + (m.goals === 1 ? ' gol' : ' gols') : '', m.assists ? m.assists + (m.assists === 1 ? ' assistência' : ' assistências') : '', 'nota ' + rate(m.rating)].filter(Boolean).join(' · ');
    return '<div class="fs-card ' + (live ? 'live' : out) + '"><div class="fs-lbl">' + lbl + '</div>' +
      '<div class="fs-sc">' + side(h) + '<b><span id="fc-sh">' + gh + '</span><i>×</i><span id="fc-sa">' + ga + '</span></b>' + side(a) + '</div>' +
      '<div class="fs-ev2"><ul class="fs-ev" id="fc-evh">' + evs('h') + '</ul><ul class="fs-ev a" id="fc-eva">' + evs('a') + '</ul></div>' +
      '<p class="fs-line">' + line + '</p></div>';
  }
  function play1(e) {
    const who = esc(G.c.name);
    return '<li class="' + (e.me || e.as ? 'me' : '') + '"><i>' + clock(e.m) + '</i><span>' + (e.me ? 'Gol de ' + who : e.as ? 'Gol, assistência de ' + who : 'Gol') + '</span></li>';
  }

  // Ficha (canvas "Navegação, Ficha e meta"): o jogador na frente. Cartão creme com a carta, idade, posição e clube, o papel
  // no elenco e até onde pode chegar; os seis atributos (os três que mais pesam na posição em cima) e os pontos para
  // gastar. Embaixo, em vez de uma parede de zeros, as próximas conquistas (as metas do ano) e os números da carreira.
  const GK_NAMES = { rit: 'Velocidade', fin: 'Reflexo', pas: 'Reposição', dri: 'Manejo', def: 'Posição', fis: 'Elasticidade' };
  function ficha() {
    const c = G.c, fc = c.fc, E = S.eff(c), o = S.ovr(c), P = D.POS[c.pos], cl = D.CLUB_BY_ID[c.club];
    const names = c.pos === 'GOL' ? GK_NAMES : D.ATTR_NAMES;
    const keys = D.ATTRS.slice().sort((a, b) => P.w[b] - P.w[a]);
    const role = cl ? S.role(c, cl).name : '';
    const whole = c.pe || 0, can = whole >= 1 && S.canInvestAny(c), yr = S.fcPeYear(c), full = yr >= S.PE_CAP - 0.001;
    const at = (k, j) => { const v = Math.round(E[k]); return '<div class="fi-a' + (j > 2 ? ' lo' : '') + '"><span>' + names[k] + '</span><i><b style="width:' + Math.max(2, Math.min(100, v)) + '%"></b></i><em>' + v + '</em></div>'; };
    const pe = can
      ? '<div class="fi-pe"><span><b>' + whole + (whole === 1 ? ' ponto' : ' pontos') + ' para gastar</b><small>Vale já no próximo jogo</small></span><button class="fi-evo" id="fc-evo">Evoluir</button></div>'
      : '<div class="fi-pe"><span><b>Evolução</b><small>' + (full ? 'Limite do ano atingido: ' + S.PE_CAP + ' de ' + S.PE_CAP + ' pontos.' : 'No ano: ' + num1(yr) + ' de ' + S.PE_CAP + ' pontos. Todo jogo enche a barra, nota alta enche mais.') + '</small></span>' +
        '<span class="fi-pb"><i style="width:' + Math.round((fc.peFrac || 0) * 100) + '%"></i></span></div>';
    $('fc-fi').innerHTML = '<div class="fi-top"><span class="ovr metal ' + U.tierCls(o) + ' fi-ovr"><b>' + o + '</b><small>' + c.pos + '</small>' + crest(c.club, 'xs') + '</span>' +
      '<span class="fi-who"><b>' + esc(c.name) + '</b><small>' + c.age + ' anos · ' + P.name + ' · ' + esc(nameOf(c.club)) + '</small><span class="fi-chips">' +
        (role ? '<i>' + role + '</i>' : '') + (c.pot > o && c.age < 30 ? '<i>Pode chegar a ' + c.pot + '</i>' : '') + '</span></span></div>' +
      '<div class="fi-at">' + keys.map(at).join('') + '<p>As três de cima são as que mais contam para ' + P.name.toLowerCase() + '.</p></div>' + pe;
    if ($('fc-evo')) $('fc-evo').onclick = () => { sfx('tap'); evolve(); };
    // Próximas conquistas: as metas do ano que faltam (com o legado que valem) e os números da carreira em segundo plano
    const A = fc.acc, gk = D.DEF_POS.includes(c.pos), L = S.legacy ? S.legacy(c) : null;
    const rows = (S.fcGoals ? S.fcGoals(c) || [] : []).map(g => {
      const pts = g.size ? ' · +' + S.GOAL_SIZE[g.size] : '';
      if (g.side === 'me' && !g.txt) return '<button class="fi-g" data-go2="ag">' + U.emo('⭐', 'md') + '<span><b>Escolha o sonho do ano</b></span><em class="go">Agenda ›</em></button>';
      const num = typeof g.have === 'number' && g.n, done = num && g.have >= g.n;
      const lbl = (g.side === 'club' ? 'Meta do clube: ' : g.side === 'emp' ? 'Empresário: ' : 'Seu sonho: ') + esc(g.txt);
      return '<div class="fi-g' + (done ? ' ok' : '') + '">' + U.emo(g.side === 'club' ? '⚽' : g.side === 'emp' ? '🤝' : '⭐', 'md') + '<span><b>' + lbl + '</b>' +
        (num ? '<i class="fi-gb"><i style="width:' + Math.min(100, Math.round(g.have / g.n * 100)) + '%"></i></i>' : '') + '</span>' +
        '<em>' + (num ? String(g.have).replace('.', ',') + ' de ' + String(g.n).replace('.', ',') : 'no fim do ano') + pts + '</em></div>';
    });
    $('fc-conq').innerHTML = '<h3>Próximas conquistas</h3>' + rows.join('') +
      '<p class="fi-tot">Na carreira: ' + D.plural(A.games, 'jogo', 'jogos') + ' · ' + (gk ? D.plural(A.cs, 'jogo sem sofrer gol', 'jogos sem sofrer gol') : D.plural(A.goals, 'gol', 'gols')) + ' · ' +
        D.plural(A.assists, 'assistência', 'assistências') + (A.games ? ' · nota ' + rate(A.rsum / A.games) : '') + (L ? ' · ' + L.pts.toLocaleString('pt-BR') + ' de legado' : '') + '</p>';
    document.querySelectorAll('#fc-conq [data-go2]').forEach(b => { b.onclick = () => { sfx('tap'); go(b.dataset.go2); }; });
  }
  // Pontos de evolução: a fração do ano enche a barra; com 1 ponto inteiro, dá para evoluir agora
  function peBox() {
    const c = G.c, fc = c.fc, whole = c.pe || 0;
    const can = whole >= 1 && S.canInvestAny(c), yr = S.fcPeYear(c), full = yr >= S.PE_CAP - 0.001;
    // O que a pessoa precisa saber: quanto tem para gastar, quanto ganhou no ano e o limite do ano
    $('fc-pe').innerHTML = '<div class="fc-pe-row"><span>Evolução</span><div class="fc-pe-bar"><i style="width:' + Math.round(fc.peFrac * 100) + '%"></i></div><b>' + num1(whole + fc.peFrac) + '</b>' +
      (can ? '<button class="btn ghost fc-evo" id="fc-evo">Evoluir</button>' : '') + '</div>' +
      '<p>' + (full ? 'Limite do ano atingido: ' + S.PE_CAP + ' de ' + S.PE_CAP + ' pontos. A barra volta a encher na próxima temporada.'
        : 'No ano: ' + num1(yr) + ' de ' + S.PE_CAP + ' pontos (limite). Todo jogo enche a barra, e nota alta enche mais.') +
      (whole >= 1 ? ' Para gastar: ' + whole + (whole === 1 ? ' ponto.' : ' pontos.') : ' Com 1 ponto inteiro, dá para evoluir.') + '</p>';
    if ($('fc-evo')) $('fc-evo').onclick = evolve;
  }
  function meBox() {
    const A = G.c.fc.acc, gk = G.c.pos === 'GOL' || G.c.pos === 'ZAG';
    $('fc-me').innerHTML = '<div><b>' + A.games + '</b><span>Jogos</span></div>' + (gk ? '<div><b>' + A.cs + '</b><span>Sem sofrer gol</span></div>' : '<div><b>' + A.goals + '</b><span>Gols</span></div>') +
      '<div><b>' + A.assists + '</b><span>Assist.</span></div><div><b>' + (A.games ? rate(A.rsum / A.games) : '–') + '</b><span>Nota</span></div>';
  }
  // Pontos de legado da carreira (engine/legado.js): somam desde a primeira temporada
  const LEG_LBL = { metas: 'Metas', titulos: 'Títulos', premios: 'Prêmios', idolo: 'Ídolo', selecao: 'Seleção' };
  function legBox() {
    const el = $('fc-leg');
    if (!el || !S.legacy) return;
    const L = S.legacy(G.c);
    el.innerHTML = '<div class="fs-rlbl">Legado da carreira</div><div class="lg-top"><b>' + L.pts.toLocaleString('pt-BR') + '</b><span>pontos de legado</span></div>' +
      '<div class="lg-by">' + Object.keys(LEG_LBL).map(k => '<div><small>' + LEG_LBL[k] + '</small><b>' + L.by[k].toLocaleString('pt-BR') + '</b></div>').join('') + '</div>' +
      '<p class="lg-note">Metas cumpridas, títulos, prêmios, anos de ídolo num clube e a seleção somam desde a primeira temporada.</p>';
  }
  // Situação em cada competição
  function compsBox(pos) {
    const fc = G.c.fc, cup = fc.cup, ct = fc.cont;
    const st = (o, list, lostAt, cur) => (o === 'moved' ? 'Ficou com ' + D.o(nameOf(fc.moved ? fc.moved.from : '')) : o === 'won' ? 'Campeão!' : o === 'lost' ? 'Eliminado: ' + list[lostAt].toLowerCase() : o === 'group' ? 'Eliminado na fase de grupos' : cur);
    const nextSt = (k, list) => { const e = fc.cal.slice(fc.i).find(x => x.k === k); return e ? list[e.st] : '—'; };
    const items = [[fc.lg.name, pos ? pos + 'º lugar · ' + fc.lg.tab[0].p + ' pts' : 'Começa já'],
      [cup.name, st(cup.out, S.FC_CUP_ST, cup.lostAt, 'Próxima: ' + nextSt('cup', S.FC_CUP_ST).toLowerCase())]];
    if (ct) items.push([ct.name, st(ct.out, S.FC_CONT_ST, ct.lostAt, 'Próxima: ' + nextSt('cont', S.FC_CONT_ST).toLowerCase())]);
    $('fc-comps').innerHTML = items.map(([n, s]) => '<div class="fc-comp' + (/Campeão/.test(s) ? ' won' : /Eliminado/.test(s) ? ' out' : '') + '"><span>' + esc(n) + '</span><b>' + esc(s) + '</b></div>').join('');
  }
  // Calendário: os últimos resultados e os próximos jogos
  function calBox() {
    const fc = G.c.fc, past = fc.log.slice(-3), next = S.fcPreview(G.c, 5).slice(1);
    const tag = k => '<em class="fc-k ' + k + '">' + (k === 'lg' ? 'Liga' : k === 'cup' ? 'Copa' : 'Cont.') + '</em>';
    $('fc-cal').innerHTML = '<div class="fs-rlbl">Calendário</div>' +
      // Mandante sempre à esquerda: escudo dele, placar (ou ×) e escudo do visitante; o nome é o do adversário, com casa ou fora
      past.map(l => '<div class="fc-ci done">' + tag(l.comp) + '<span class="fc-hv">' + crest(l.home ? G.c.club : l.vs, 'xs') + '<b class="' + (l.won || l.gf > l.ga ? 'up' : l.gf < l.ga ? 'down' : '') + '">' + (l.home ? l.gf + '–' + l.ga : l.ga + '–' + l.gf) + '</b>' + crest(l.home ? l.vs : G.c.club, 'xs') + '</span><span>' + esc(nameOf(l.vs)) + (l.pens ? ' (pên.)' : '') + '</span><small class="fc-cf">' + (l.home ? 'casa' : 'fora') + '</small></div>').join('') +
      next.map(p => '<div class="fc-ci">' + tag(p.k) + (p.vs ? '<span class="fc-hv">' + crest(p.home ? G.c.club : p.vs, 'xs') + '<b>×</b>' + crest(p.home ? p.vs : G.c.club, 'xs') + '</span><span>' + esc(nameOf(p.vs)) + ' · ' + esc(p.stage.replace(/^Grupo · /, 'G ')) + '</span><small class="fc-cf">' + (p.home ? 'casa' : 'fora') + '</small>' : '<i></i><span>' + esc(p.bye ? 'Folga' : 'Adversário no sorteio') + '</span><b>' + esc(p.stage.replace(/^Grupo · /, 'G ')) + '</b>') + '</div>').join('');
  }

  // ---------- a semana entre os jogos ----------
  // Energia e forma sempre à vista; com a semana aberta, o treino (um por semana) e a energia que fica para o jogo
  let pick = null, touched = false; // touched: a pessoa mexeu (só aí a escolha vira o plano da semana automática)
  const myPick = () => (touched && pick ? pick.slice() : undefined);
  const unpick = () => { pick = null; touched = false; };
  const sgn = (x, f) => (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x));
  function formTxt(fo) { return fo >= 0.8 ? 'Em alta' : fo >= 0.25 ? 'Boa' : fo > -0.25 ? 'Normal' : fo > -0.8 ? 'Em baixa' : 'Má fase'; }
  function wkFx(c, a) {
    const fc = c.fc;
    if (a.id === 'tec') return S.fcTrLeft(c) > 0 ? 'Jogue ' + S.FC_TR_SESS + ' lances: +1 num atributo' : S.fcWeekOk(c, 'tec', []) ? '+' + num2(S.FC_TRAIN_STEP) + ' de evolução' : 'Limite de treino do ano';
    if (a.id === 'fis') return 'Cansa menos nos próximos 4 jogos';
    if (a.id === 'rest') return 'Recupera energia';
    if (a.id === 'physio') return 'R$ ' + U.money(S.fcPhysioCost(c)) + (fc.injOut > 0 ? ' · 1 jogo a menos de lesão' : ' · recupera energia');
    return '';
  }
  function weekBox(only) { // only: só energia e forma (tela de resultado: a semana vem depois)
    const c = G.c, fc = c.fc, el = $('fc-wk');
    if (!el) return;
    if (fc.en === undefined) { el.innerHTML = ''; return; }
    const lvl = e => (e < S.FC_EN_OUT ? 'out' : e < S.FC_EN_LOW ? 'low' : 'ok');
    const meter = e => '<div class="fc-en ' + lvl(e) + '"><i style="width:' + e + '%"></i></div>';
    const status = '<div class="fc-st"><span>Energia</span>' + meter(fc.en) + '<b class="' + lvl(fc.en) + '">' + Math.round(fc.en) + '</b><span>Forma</span><b class="fo ' + (fc.fo >= 0.25 ? 'up' : fc.fo <= -0.25 ? 'down' : '') + '">' + formTxt(fc.fo || 0) + '</b></div>';
    const auto = '<label class="fc-auto"><input type="checkbox" id="fc-auto"' + (c.fcAuto ? ' checked' : '') + '><span>Semana automática</span></label>';
    if (only) { el.className = 'fc-wk'; el.innerHTML = status; return; }
    if (!fc.wkDue) {
      // Semana fechada: o que ela fez
      const w = fc.wkSum && fc.wkSum.at === fc.i ? fc.wkSum : null, nm = id => S.FC_WEEK.find(a => a.id === id).name;
      const what = w ? '<p class="fc-wk-sum">' + (c.fcAuto ? 'Semana automática: ' : 'Semana: ') + w.acts.map(nm).join(' + ') + ' · energia ' + Math.round(w.en0) + ' → ' + Math.round(w.en1) +
        (w.pe ? ' · +' + num2(w.pe) + ' de evolução' : '') + (w.tr ? ' · +1 em ' + D.label(c.pos, w.tr) : '') + (w.money > 0 ? ' · +R$ ' + U.money(w.money) : '') + (w.inj ? ' · lesão: 1 jogo a menos' : '') +
        (w.dropped && w.dropped.length ? '. Sem dinheiro para pagar: ' + w.dropped.map(k => S.FC_SHOP.staff.find(x => x.id === k).name).join(', ') + ' saiu.' : '') + '</p>' +
        (w.upkeep || w.debt ? '<p class="fc-wk-sum' + (w.debt ? ' down' : '') + '">' + (w.upkeep ? 'Carro e casa: −R$ ' + U.money(w.upkeep) : '') + (w.repay ? (w.upkeep ? ' · ' : '') + 'pagou R$ ' + U.money(w.repay) + ' da dívida' : '') +
          (w.debt ? (w.upkeep || w.repay ? ' · ' : '') + 'dívida R$ ' + U.money(w.debt) + (w.worry ? ', a cabeça pesou: −' + S.FC_DEBT.worryEn + ' de energia' : '') : '') + '</p>' : '') : '';
      el.className = 'fc-wk';
      el.innerHTML = status + what + (w ? auto : '');
      bindAuto();
      return;
    }
    if (!pick) pick = S.fcWeekAuto(c);
    if (!S.fcWeekOk(c, pick[0], [])) pick = ['rest'];
    const n = id => (pick[0] === id ? 1 : 0);
    const tired = S.fcWeekEnergy(c, pick);
    el.className = 'fc-wk open';
    el.innerHTML = status +
      '<div class="fc-wk-h"><b>O treino até o próximo jogo</b>' + auto + '</div>' +
      '<div class="fc-wk-g">' + S.FC_WEEK.map(a => {
        const ok = n(a.id) > 0 || S.fcWeekOk(c, a.id, []);
        return '<button class="fc-wa' + (n(a.id) ? ' on' : '') + '" data-id="' + a.id + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + (n(a.id) ? 'true' : 'false') + '">' +
          '<b>' + esc(a.name) + '</b><small>' + esc(wkFx(c, a)) + '</small><i class="' + (a.en > 0 ? 'up' : 'down') + '">' + sgn(a.en, String) + ' energia</i></button>';
      }).join('') + '</div>' +
      '<p class="fc-wk-p">Energia no próximo jogo: <b class="' + lvl(tired) + '">' + Math.round(tired) + '</b>' +
        (tired < S.FC_EN_OUT ? ' · abaixo de ' + S.FC_EN_OUT + ', o técnico pode poupar você e a lesão fica mais provável' : tired < S.FC_EN_LOW ? ' · abaixo de ' + S.FC_EN_LOW + ', você rende menos' : '') + '</p>';
    el.querySelectorAll('.fc-wa').forEach(b => { b.onclick = () => { sfx('tap'); pick = [b.dataset.id]; touched = true; weekBox(); }; });
    bindAuto();
  }
  function bindAuto() {
    const a = $('fc-auto');
    if (a) a.onchange = () => { G.c.fcAuto = a.checked; if (a.checked && G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); bar(); } save(); weekBox(); weekActs(); };
  }

  // ---------- loja: o dinheiro da carreira vira vantagem nesta carreira ----------
  let gearAttr = null;
  // Zé: palpites da rodada da liga inteira (sem o seu jogo), cupom simples ou múltipla e o extrato da carreira.
  // Atleta apostar é proibido: o faro da federação (chance de ser pego) aparece sempre e sobe a cada aposta
  let zeTab = 'cas', betSel = {}, betStake = 0, csOpen = null, csG = [1, 0], betAll = false;
  const oddTxt = o => o.toFixed(2).replace('.', ',');
  const pctTxt = p => (p < 0.1 ? (Math.round(p * 1000) / 10).toFixed(1).replace('.', ',') : String(Math.round(p * 100))) + '%';
  function legTxt(l) {
    if (l.m === 'x') return l.pick === 1 ? 'Empate' : 'Vitória ' + nameOf(l.pick === 0 ? l.h : l.a);
    if (l.m === 'btts') return l.pick === 0 ? 'Ambos marcam' : 'Só um marca (ou nenhum)';
    if (l.m === 'o25') return l.pick === 0 ? 'Mais de 2,5 gols' : 'Menos de 2,5 gols';
    return 'Placar ' + l.pick.replace('-', ' × ');
  }
  // Pernas escolhidas no cupom, na ordem dos jogos
  function betLegs(R) { return R ? R.games.filter(g => betSel[g.h]).map(g => Object.assign({ h: g.h, a: g.a, ext: g.ext, lg: g.lg }, betSel[g.h], { odd: betSel[g.h].m === 'cs' ? g.odds.cs[betSel[g.h].pick] : g.odds[betSel[g.h].m][betSel[g.h].pick] })) : []; }
  function betBox(c, R$) {
    const fc = c.fc, risk = S.fcBetRisk(c), n = fc.betN || 0;
    const faro = '<div class="ze-faro"><p><span>Faro da federação</span><b>' + pctTxt(risk) + ' de ser pego</b></p><i><u style="width:' + Math.round(risk / 0.25 * 100) + '%"></u></i>' +
      '<small>' + (n ? n + (n === 1 ? ' aposta' : ' apostas') + ' nesta temporada.' : 'Nenhuma aposta nesta temporada.') + ' Pego = ' + S.FC_BET_BAN + ' jogos de suspensão, técnico e torcida contra.</small></div>';
    const placed = S.fcBets(c).map(t => '<li><span>' + t.legs.map(l => esc(nameOf(l.h)) + ' × ' + esc(nameOf(l.a)) + ': <b>' + esc(legTxt(l)) + '</b>').join('<br>') + '</span><em>' + R$(t.stake) + ' · paga ' + R$(Math.round(t.stake * t.odd)) + '</em></li>').join('');
    const head = faro + (placed ? '<div class="ze-placed"><h3>Seus cupons</h3><ul>' + placed + '</ul><small>Saem na próxima rodada da liga.</small></div>' : '');
    const R = S.fcBetRound(c);
    if (!R) return head + '<p class="fc-own">Sem rodada da liga pela frente.</p>';
    Object.keys(betSel).forEach(h => { if (!R.games.some(g => String(g.h) === h)) delete betSel[h]; });
    const B = (h, m, pick, lab, o) => { const s = betSel[h], on = s && s.m === m && s.pick === pick; return '<button class="ze-o' + (on ? ' on' : '') + '" data-h="' + h + '" data-m="' + m + '" data-p="' + pick + '"><small>' + esc(lab) + '</small><b>' + oddTxt(o) + '</b></button>'; };
    const card = g => {
      const s = betSel[g.h], cs = csOpen === g.h;
      const csBtn = '<button class="ze-o ze-cs' + (s && s.m === 'cs' ? ' on' : '') + '" data-csopen="' + g.h + '"><small>Placar exato</small><b>' + (s && s.m === 'cs' ? s.pick.replace('-', ' × ') : '…') + '</b></button>';
      const k = csG[0] + '-' + csG[1];
      const csBox = cs ? '<div class="ze-csbox"><div class="ze-st"><button data-cs="0" data-d="-1" aria-label="Menos gols do mandante">−</button><b>' + csG[0] + '</b><button data-cs="0" data-d="1" aria-label="Mais gols do mandante">+</button></div><span>×</span>' +
        '<div class="ze-st"><button data-cs="1" data-d="-1" aria-label="Menos gols do visitante">−</button><b>' + csG[1] + '</b><button data-cs="1" data-d="1" aria-label="Mais gols do visitante">+</button></div>' +
        B(g.h, 'cs', k, 'Odd', g.odds.cs[k]) + '</div>' : '';
      return '<div class="ze-g"><p>' + crest(g.h, 'xs') + '<b>' + esc(nameOf(g.h)) + ' × ' + esc(nameOf(g.a)) + '</b>' + crest(g.a, 'xs') + '</p>' +
        '<div class="ze-x">' + B(g.h, 'x', 0, nameOf(g.h), g.odds.x[0]) + B(g.h, 'x', 1, 'Empate', g.odds.x[1]) + B(g.h, 'x', 2, nameOf(g.a), g.odds.x[2]) + '</div>' +
        '<div class="ze-m">' + B(g.h, 'btts', 0, 'Ambos marcam', g.odds.btts[0]) + B(g.h, 'o25', 0, '+2,5 gols', g.odds.o25[0]) + B(g.h, 'o25', 1, '−2,5 gols', g.odds.o25[1]) + csBtn + '</div>' + csBox + '</div>';
    };
    // Um bloco por campeonato: o seu primeiro; fechado, cada um mostra dois jogos (e os que já estão no cupom)
    let hidden = 0;
    const games = R.groups.map((G, k) => {
      const show = betAll ? G.games : G.games.filter((g, j) => j < 2 || betSel[g.h] || csOpen === g.h);
      hidden += G.games.length - show.length;
      return '<h3 class="ze-rd">' + (k ? esc(G.name) : 'Rodada ' + (R.ri + 1) + ' · ' + esc(G.name)) + '</h3>' + show.map(card).join('');
    }).join('');
    const more = hidden || betAll ? '<button class="btn ghost ze-more" id="ze-more">' + (betAll ? 'Mostrar menos' : 'Mais ' + hidden + ' jogos') + '</button>' : '';
    // Cupom: odd multiplicada, chance de acertar (sem a margem da casa) e o risco desta aposta
    const legs = betLegs(R), st = S.fcBetStakes(c);
    if (!st.includes(betStake)) betStake = st[0];
    let slip = '';
    if (legs.length) {
      const o = Math.round(legs.reduce((s, l) => s * l.odd, 1) * 100) / 100, ch = legs.reduce((s, l) => s * 0.9 / l.odd, 1);
      slip = '<div class="ze-slip"><p><span>' + (legs.length === 1 ? 'Cupom simples' : 'Múltipla de ' + legs.length) + '</span><b>odd ' + oddTxt(o) + '</b></p>' +
        '<ul>' + legs.map(l => '<li>' + (l.ext ? '<small>' + esc(l.lg) + '</small> ' : '') + esc(nameOf(l.h)) + ' × ' + esc(nameOf(l.a)) + ': <b>' + esc(legTxt(l)) + '</b> <em>' + oddTxt(l.odd) + '</em></li>').join('') + '</ul>' +
        '<div class="seg ze-stk">' + st.map(v => '<button data-s="' + v + '"' + (v === betStake ? ' class="on"' : '') + ((c.money || 0) >= v ? '' : ' disabled') + '>' + R$(v) + '</button>').join('') + '</div>' +
        '<button class="btn" id="ze-go"' + ((c.money || 0) < betStake ? ' disabled' : '') + '>Apostar ' + R$(betStake) + ' · paga ' + R$(Math.round(betStake * o)) + '</button>' +
        '<small>Chance de acertar: ' + pctTxt(ch) + '. Chance de ser pego nesta aposta: ' + pctTxt(risk) + '.' + (legs.length < S.FC_BET_MAX_LEGS ? ' Junte jogos de campeonatos diferentes para fazer múltipla.' : '') + '</small></div>';
    }
    return head + games + more + slip;
  }
  function extratoBox(c, R$) {
    const L = c.betLog || { n: 0, net: 0, caught: 0, won: 0 }, K = c.casLog, F = c.fixLog;
    const cas = K && K.n ? '<h3 class="ze-rd">Cassino Bet171</h3><div class="ze-ext"><div><b>' + K.n + '</b><small>jogadas</small></div><div><b class="up">+' + R$(K.best || 0) + '</b><small>maior prêmio</small></div><div><b class="' + (K.net >= 0 ? 'up' : 'down') + '">' + (K.net >= 0 ? '+' : '−') + R$(Math.abs(K.net)) + '</b><small>saldo</small></div></div>' +
      '<ul class="ze-hist">' + [['rol', 'Roleta'], ['slot', 'Caça-níquel'], ['bj', 'Vinte e um'], ['bicho', 'Bicho']].filter(([k]) => K[k]).map(([k, t]) => '<li><span>' + t + '</span><b class="' + (K[k] >= 0 ? 'up' : 'down') + '">' + (K[k] >= 0 ? '+' : '−') + R$(Math.abs(K[k])) + '</b></li>').join('') + '</ul>' : '';
    const fix = F && F.n ? '<p class="fc-own">Combinou cartão com o Zé ' + F.n + (F.n === 1 ? ' vez' : ' vezes') + (F.caught ? ', descoberto em ' + F.caught + '.' : ', sem ninguém descobrir.') + '</p>' : '';
    if (!L.n) return '<p class="fc-own">Nenhuma aposta resolvida ainda nesta carreira.</p>' + cas + fix;
    const rows = (L.last || []).map(x => '<li><span>' + x.s + ' · rod. ' + (x.ri + 1) + ' · ' + (x.l ? esc(nameOf(x.l.h)) + ' × ' + esc(nameOf(x.l.a)) + ': ' + esc(legTxt(x.l)) : 'múltipla de ' + x.n) + '</span><b class="' + (x.net >= 0 ? 'up' : 'down') + '">' + (x.net >= 0 ? '+' : '−') + R$(Math.abs(x.net)) + '</b></li>').join('');
    return '<div class="ze-ext"><div><b>' + L.n + '</b><small>apostas</small></div><div><b>' + (L.won || 0) + '</b><small>acertos</small></div><div><b class="' + (L.net >= 0 ? 'up' : 'down') + '">' + (L.net >= 0 ? '+' : '−') + R$(Math.abs(L.net)) + '</b><small>saldo</small></div></div>' +
      (L.caught ? '<p class="fc-own">Pego pela federação ' + L.caught + (L.caught === 1 ? ' vez.' : ' vezes.') + '</p>' : '') + (rows ? '<ul class="ze-hist">' + rows + '</ul>' : '') + cas + fix;
  }
  function bindBet() {
    document.querySelectorAll('.ze-tabs button').forEach(b => { b.onclick = () => { sfx('tap'); zeTab = b.dataset.t; betRender(); }; });
    document.querySelectorAll('.ze-o[data-m]').forEach(b => {
      b.onclick = () => {
        sfx('tap');
        const h = b.dataset.h, m = b.dataset.m, p = m === 'cs' ? b.dataset.p : +b.dataset.p, s = betSel[h];
        if (s && s.m === m && s.pick === p) delete betSel[h];
        else if (s || Object.keys(betSel).length < S.FC_BET_MAX_LEGS) betSel[h] = { m, pick: p };
        if (m === 'cs') csOpen = null;
        betRender();
      };
    });
    document.querySelectorAll('[data-csopen]').forEach(b => { b.onclick = () => { sfx('tap'); const h = b.dataset.csopen; csOpen = csOpen === h ? null : h; const s = betSel[h]; csG = s && s.m === 'cs' ? s.pick.split('-').map(Number) : [1, 0]; betRender(); }; });
    document.querySelectorAll('.ze-st button').forEach(b => { b.onclick = () => { sfx('tap'); const k = +b.dataset.cs; csG[k] = Math.max(0, Math.min(5, csG[k] + +b.dataset.d)); betRender(); }; });
    document.querySelectorAll('.ze-stk button').forEach(b => { b.onclick = () => { sfx('tap'); betStake = +b.dataset.s; betRender(); }; });
    const more = $('ze-more');
    if (more) more.onclick = () => { sfx('tap'); betAll = !betAll; betRender(); };
    const ok = $('ze-go');
    if (ok) ok.onclick = () => { const legs = betLegs(S.fcBetRound(G.c)); if (S.fcBet(G.c, legs, betStake)) { sfx('coin'); betSel = {}; csOpen = null; save(); bar(); betRender(); } };
  }
  // ---------- cassino do Bet171 (engine/cassino.js; era a mesa dos fundos): a primeira jogada da noite custa energia ----------
  // O sorteio sai do motor na hora do clique; a tela só anima até mostrar o que já saiu (roda, rolos, cartas)
  let zeGame = null, rolBet = 'red', rolNum = 7, casStake = 0, casLast = null, bichoG = 15, bichoMode = 'cab', casBusy = false;
  let rolRot = 0, bjSeen = { p: 0, d: 0, open: false }, slotLast = [0, 1, 2], bichoStamp = false;
  const calm = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MESA_ICO = {
    rol: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#6B4423"/><circle cx="32" cy="32" r="25" fill="#161616"/>' +
      Array.from({ length: 12 }, (_, k) => '<path d="M32 32 L' + (32 + 25 * Math.sin(k * Math.PI / 6)).toFixed(1) + ' ' + (32 - 25 * Math.cos(k * Math.PI / 6)).toFixed(1) + ' A25 25 0 0 1 ' + (32 + 25 * Math.sin((k + 1) * Math.PI / 6)).toFixed(1) + ' ' + (32 - 25 * Math.cos((k + 1) * Math.PI / 6)).toFixed(1) + 'Z" fill="' + (k === 0 ? '#1F8A4C' : k % 2 ? '#C8323A' : '#161616') + '"/>').join('') +
      '<circle cx="32" cy="32" r="14" fill="#8A5A2B" stroke="#E2B44A" stroke-width="2"/><circle cx="32" cy="32" r="3.5" fill="#E2B44A"/><circle cx="47" cy="16" r="3.2" fill="#FBF8EF"/></svg>',
    slot: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="12" width="50" height="40" rx="8" fill="#E2B44A"/><rect x="10" y="20" width="40" height="24" rx="4" fill="#FBF8EF"/><path d="M23.3 20v24M36.6 20v24" stroke="#13201A" stroke-width="2"/><text x="16.6" y="37" font-family="Barlow Condensed,Arial" font-weight="800" font-size="14" text-anchor="middle" fill="#C8323A">7</text><text x="30" y="37" font-family="Barlow Condensed,Arial" font-weight="800" font-size="14" text-anchor="middle" fill="#C8323A">7</text><text x="43.3" y="37" font-family="Barlow Condensed,Arial" font-weight="800" font-size="14" text-anchor="middle" fill="#C8323A">7</text><path d="M55 30h4V12" stroke="#FBF8EF" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="59" cy="10" r="4" fill="#C8323A"/></svg>',
    bj: '<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(-14 24 34)"><rect x="10" y="14" width="28" height="40" rx="4" fill="#FBF8EF" stroke="#13201A" stroke-width="2"/><text x="15" y="25" font-family="Barlow Condensed,Arial" font-weight="800" font-size="10" fill="#13201A">A</text><text x="24" y="42" font-family="Arial" font-size="16" text-anchor="middle" fill="#13201A">♠</text></g><g transform="rotate(10 40 32)"><rect x="26" y="12" width="28" height="40" rx="4" fill="#FBF8EF" stroke="#13201A" stroke-width="2"/><text x="31" y="23" font-family="Barlow Condensed,Arial" font-weight="800" font-size="10" fill="#C8323A">K</text><text x="40" y="40" font-family="Arial" font-size="16" text-anchor="middle" fill="#C8323A">♥</text></g></svg>',
    crash: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="8" width="56" height="48" rx="8" fill="#1A0D0B"/><path d="M10 50 Q34 48 50 18" fill="none" stroke="#FF5A1F" stroke-width="4" stroke-linecap="round"/><path d="M47 13l9-3-3 9-4 1-3-3z" fill="#FBF8EF"/><circle cx="51.5" cy="14.5" r="1.6" fill="#2F6FD6"/><text x="22" y="30" font-family="Barlow Condensed,Arial" font-weight="800" font-size="13" text-anchor="middle" fill="#FFC23D">2,4×</text></svg>',
    bicho: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 6h40v52l-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4z" fill="#FBF8EF" stroke="#13201A" stroke-width="2"/><path d="M18 18h28M18 26h28M18 34h18" stroke="#9AA59F" stroke-width="2"/><ellipse cx="40" cy="38" rx="9" ry="6" fill="none" stroke="#C8323A" stroke-width="2.5" transform="rotate(-8 40 38)"/><text x="40" y="42" font-family="Courier New,monospace" font-weight="700" font-size="10" text-anchor="middle" fill="#13201A">16</text></svg>',
  };
  const GAMES = [['crash', 'Foguetinho', 'saca antes de explodir'], ['rol', 'Roleta', 'a casa leva 2,7%'], ['slot', 'Caça-níquel', 'devolve 92% em média'], ['bj', 'Vinte e um', 'a casa leva uns 5%'], ['bicho', 'Bicho', 'sai com o próximo jogo']];
  // Símbolo do caça-níquel: o cartão vermelho é desenhado (não há ícone dele)
  const sym = (k, sz) => (S.SLOT[k].id === 'card' ? '<b class="mz-rc ' + sz + '" aria-label="Cartão vermelho"></b>' : U.emo(S.SLOT[k].e, sz));
  const SUIT = ['♠\uFE0E', '♥\uFE0E', '♦\uFE0E', '♣\uFE0E'], FACE = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  // Carta: canto com valor e naipe, naipe grande no meio. cls: 'new' entra voando do baralho, 'flip' vira
  const cardHtml = (x, cls, delay) => '<i class="mz-card' + (x.s === 1 || x.s === 2 ? ' red' : '') + (cls ? ' ' + cls : '') + '"' + (delay ? ' style="animation-delay:' + delay + 's"' : '') + '><em>' + (FACE[x.v] || x.v) + '<small>' + SUIT[x.s] + '</small></em><b>' + SUIT[x.s] + '</b><em class="r">' + (FACE[x.v] || x.v) + '<small>' + SUIT[x.s] + '</small></em></i>';
  const backHtml = cls => '<i class="mz-card back' + (cls ? ' ' + cls : '') + '"></i>';
  const chipLab = v => (v >= 1e6 ? String(Math.round(v / 1e5) / 10).replace('.', ',') + ' mi' : Math.round(v / 1000) + ' mil');
  function stakeSeg(c) {
    const ch = S.fcChips(c), left = S.fcNightLeft(c);
    if (!ch.includes(casStake)) casStake = ch[0];
    return '<div class="mz-chips" role="group" aria-label="Valor da aposta">' + ch.map((v, k) => '<button class="mz-chip c' + k + (v === casStake ? ' on' : '') + '" data-cs="' + v + '"' + (v <= left ? '' : ' disabled') + ' aria-label="R$ ' + U.money(v) + '"><span>' + chipLab(v) + '</span></button>').join('') + '</div>';
  }
  // Roleta europeia: a ordem real das casas na roda
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const STEP = 360 / 37;
  const colOf = n => (n === 0 ? 'gr' : S.ROULETTE_RED.includes(n) ? 'rd' : 'bk');
  let wheelSvg = null;
  function wheel() {
    if (wheelSvg) return wheelSvg;
    const P = (r, a) => { const t = (a - 90) * Math.PI / 180; return (100 + r * Math.cos(t)).toFixed(2) + ' ' + (100 + r * Math.sin(t)).toFixed(2); };
    const seg = WHEEL.map((n, i) => {
      const a0 = i * STEP - STEP / 2, a1 = a0 + STEP, fill = n === 0 ? '#1F8A4C' : S.ROULETTE_RED.includes(n) ? '#B8262F' : '#151515';
      return '<path d="M' + P(90, a0) + ' A90 90 0 0 1 ' + P(90, a1) + ' L' + P(62, a1) + ' A62 62 0 0 0 ' + P(62, a0) + 'Z" fill="' + fill + '" stroke="#C9A04A" stroke-width=".6"/>' +
        '<text transform="translate(' + P(80, i * STEP) + ') rotate(' + (i * STEP).toFixed(2) + ')" text-anchor="middle" dominant-baseline="central" font-family="Barlow Condensed,Arial" font-weight="700" font-size="9.5" fill="#FBF8EF">' + n + '</text>';
    }).join('');
    const cross = [0, 90].map(a => '<rect x="97" y="72" width="6" height="56" rx="3" fill="#E2B44A" transform="rotate(' + a + ' 100 100)"/>').join('');
    wheelSvg = '<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="mzCone" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#B07A3E"/><stop offset="1" stop-color="#5A3418"/></radialGradient></defs>' +
      '<circle cx="100" cy="100" r="99" fill="#3B2412"/><circle cx="100" cy="100" r="92" fill="#C9A04A"/>' + seg +
      '<circle cx="100" cy="100" r="62" fill="url(#mzCone)" stroke="#C9A04A" stroke-width="2"/>' +
      [0, 1, 2, 3, 4, 5, 6, 7].map(k => '<path d="M100 100 L' + P(60, k * 45) + '" stroke="rgba(0,0,0,.18)" stroke-width="1"/>').join('') +
      cross + '<circle cx="100" cy="100" r="11" fill="#E2B44A"/><circle cx="100" cy="100" r="5" fill="#8A6400"/></svg>';
    return wheelSvg;
  }
  // Ângulo da roda que deixa a casa n embaixo do ponteiro (no topo), sempre girando para a frente
  function rolTarget(n) {
    const want = ((-WHEEL.indexOf(n) * STEP) % 360 + 360) % 360, cur = ((rolRot % 360) + 360) % 360;
    return rolRot + 360 * 5 + ((want - cur + 360) % 360);
  }
  function resMsg(L) {
    if (!L) return '<p class="mz-res idle" id="mz-res">' + (zeGame === 'bicho' ? 'O resultado sai com o próximo jogo.' : 'Escolha a ficha e jogue.') + '</p>';
    return '<p class="mz-res ' + (L.net > 0 ? 'up' : L.net < 0 ? 'down' : '') + ' pop" id="mz-res">' + L.txt + '</p>';
  }
  function mesaBox(c, R$) {
    const fc = c.fc;
    const grid = () => '<div class="mz-games">' + GAMES.map(([k, t, s2]) => '<button class="mz-g mz-' + k + '" data-g="' + k + '"' + (S.fcNightOpen(c) || S.fcNightCan(c) ? '' : ' disabled') + '><span class="mz-art">' + MESA_ICO[k] + '</span><b>' + t + '</b><small>' + s2 + '</small></button>').join('') + '</div>';
    const sign = '<div class="mz-sign b171"><b>Bet171</b><small>cassino online · jogue com responsabilidade (ou nem jogue, né)</small></div>';
    if (!S.fcNightOpen(c)) {
      zeGame = null;
      const can = S.fcNightCan(c);
      return '<div class="mz-in">' + sign +
        '<ul class="mz-cost"><li><span>Jogar de madrugada</span><b class="down">−' + S.FC_NIGHT_EN + ' energia na primeira jogada</b></li><li><span>Vazar print</span><b>' + Math.round(S.FC_NIGHT_PHOTO * 100) + '% (fama −4, técnico −6)</b></li><li><span>Limite de hoje</span><b>R$ ' + U.money(S.fcNightLimit(c)) + '</b></li></ul>' +
        (can ? '' : '<p class="mz-photo">' + ((c.money || 0) < 1000 ? 'Sem dinheiro na conta para jogar.' : 'Limite de hoje usado. Libera de novo depois do próximo jogo.') + '</p>') + grid() +
        '<small class="fc-own">A casa sempre leva vantagem: ninguém fica rico aqui. Palpite de futebol é só com o Zé, no ZapZap.</small></div>';
    }
    const n = fc.night, left = S.fcNightLeft(c);
    const top = '<div class="mz-top"><div><small>Limite de hoje</small><b id="mz-left">R$ ' + U.money(left) + '</b></div><div><small>Hoje</small><b class="' + (n.net >= 0 ? 'up' : 'down') + '">' + (n.net >= 0 ? '+' : '−') + R$(Math.abs(n.net)) + '</b></div></div>';
    if (fc.crash && !crRun) S.fcCrashEnd(c, 0); // saiu da tela (ou recarregou) com o foguete no ar: explodiu
    if (!zeGame) return sign + top +
      (n.photo ? '<p class="mz-photo">Vazou print seu jogando de madrugada. A imprensa comentou e o técnico não gostou.</p>' : '') + grid();
    const back = '<div class="mz-head"><button class="back-link mz-back" id="mz-back">‹ Jogos</button><b>' + GAMES.find(g => g[0] === zeGame)[1] + '</b></div>';
    const L = casLast && casLast.g === zeGame ? casLast : null;
    if (zeGame === 'crash') {
      const H = (fc.crashHist || []).slice().reverse().map(x => '<i class="' + (x >= 2 ? 'hi' : 'lo') + '">' + crX(x) + '×</i>').join('');
      return back + top + '<div class="cr-box"><div class="cr-hist" aria-label="Últimas explosões">' + (H || '<small>Ainda não voou hoje</small>') + '</div>' +
        '<div class="cr-stage"><svg viewBox="0 0 340 190" preserveAspectRatio="none" aria-hidden="true"><path id="cr-path" d="M10 180" fill="none" stroke="#FF5A1F" stroke-width="4" stroke-linecap="round"/></svg>' +
        '<div class="cr-m"><b id="cr-x">1,00×</b><small id="cr-msg">aposta e saca antes de explodir</small></div></div>' +
        stakeSeg(c) + '<button class="btn cr-go" id="mz-go">Apostar R$ ' + U.money(casStake) + '</button>' + resMsg(L) + '</div>';
    }
    if (zeGame === 'rol') {
      const last = L ? L.n : null, B = S.ROULETTE_BETS;
      const cell = (k, cls) => '<button class="mz-bet' + (cls ? ' ' + cls : '') + (rolBet === k ? ' on' : '') + '" data-rb="' + k + '"><b>' + B[k][0] + '</b><small>' + B[k][1] + '×</small>' + (rolBet === k ? '<i class="mz-mk" aria-hidden="true"></i>' : '') + '</button>';
      const ch = rolBet === 'num' ? 1 / 37 : B[rolBet][1] === 3 ? 12 / 37 : 18 / 37;
      const hist = (n.rol || []).slice(0, 8).map(x => '<i class="' + colOf(x) + '">' + x + '</i>').join('');
      return back + top +
        '<div class="mz-wheel"><div class="mz-rim"></div><div class="mz-w" id="mz-w" style="transform:rotate(' + rolRot + 'deg)">' + wheel() + '</div>' +
          '<div class="mz-orbit" id="mz-orbit"><i class="mz-ball' + (last === null ? ' off' : ' in') + '" id="mz-ball"></i></div><i class="mz-ptr" aria-hidden="true"></i></div>' +
        '<div class="mz-last"><span>Últimos</span><div id="mz-hist">' + (hist || '<em>nenhum ainda</em>') + '</div></div>' + resMsg(L) +
        '<div class="mz-felt"><div class="mz-row3">' + cell('d1') + cell('d2') + cell('d3') + '</div><div class="mz-row3">' + cell('low') + cell('even') + cell('high') + '</div><div class="mz-row3">' + cell('red', 'rd') + cell('black', 'bk') + cell('odd') + '</div>' +
          '<div class="mz-numrow"><button class="mz-st" data-rn="-1" aria-label="Número menor">−</button><button class="mz-bet num ' + colOf(rolNum) + (rolBet === 'num' ? ' on' : '') + '" data-rb="num"><b>Número ' + rolNum + '</b><small>36×</small>' + (rolBet === 'num' ? '<i class="mz-mk" aria-hidden="true"></i>' : '') + '</button><button class="mz-st" data-rn="1" aria-label="Número maior">+</button></div></div>' +
        stakeSeg(c) + '<button class="btn" id="mz-go"' + (casStake > left ? ' disabled' : '') + '>Girar · ' + R$(casStake) + '</button><small class="fc-own mz-odds">Chance de ganhar: ' + (Math.round(ch * 1000) / 10).toFixed(1).replace('.', ',') + '%.</small>';
    }
    if (zeGame === 'slot') {
      const reels = L ? L.reels : slotLast, win = L && L.net > 0;
      return back + top + '<div class="mz-slot' + (win ? ' win' : '') + (L && L.hit === 3 ? ' big' : '') + '" id="mz-slot"><div class="mz-bulbs" aria-hidden="true">' + '<i></i>'.repeat(11) + '</div><b class="mz-sname">Golaço 777</b>' +
        '<div class="mz-reels">' + reels.map((k, i) => '<div class="mz-reel" id="mz-r' + i + '"><div class="mz-strip"><i>' + sym((k + 4) % 5, 'lg') + '</i><i class="mid' + (win && L.hit && (L.hit === 3 || reels.filter(x => x === k).length >= 2) ? ' hit' : '') + '">' + sym(k, 'lg') + '</i><i>' + sym((k + 1) % 5, 'lg') + '</i></div></div>').join('') + '<i class="mz-line" aria-hidden="true"></i></div>' +
        '<div class="mz-bulbs" aria-hidden="true">' + '<i></i>'.repeat(11) + '</div><div class="mz-lever" id="mz-lever" aria-hidden="true"><i></i></div></div>' + resMsg(L) +
        '<ul class="mz-pay">' + S.SLOT.map(x => '<li><span>' + sym(S.SLOT.indexOf(x), 'sm') + ' ' + x.name + '</span><b>3: ' + (x.three < 0 ? 'perde o dobro' : x.three + '×') + ' · 2: ' + String(x.two).replace('.', ',') + '×</b></li>').join('') + '</ul>' +
        stakeSeg(c) + '<button class="btn" id="mz-go"' + (casStake > left ? ' disabled' : '') + '>Puxar a alavanca · ' + R$(casStake) + '</button>';
    }
    if (zeGame === 'bj') {
      const live = S.fcBjHand(c), h = live || (L && L.hand) || null;
      let table = '<div class="mz-bjt"><p class="mz-print">Banca para no 17<small>vinte e um de cara paga 2,5×</small></p><div class="mz-deck" aria-hidden="true"></div>';
      if (h) {
        // Cartas novas entram voando; no fim, a carta virada da banca vira e as que ela compra chegam uma a uma
        const dNew = k => k >= bjSeen.d, pNew = k => k >= bjSeen.p;
        const dealer = live ? cardHtml(h.d[0], dNew(0) ? 'new' : '', dNew(0) ? 0.1 : 0) + backHtml(dNew(1) ? 'new' : '') :
          h.d.map((x, k) => (k === 1 && !bjSeen.open ? cardHtml(x, 'flip', 0.15) : k >= 2 && dNew(k) ? cardHtml(x, 'new', 0.15 + 0.45 * (k - 1)) : cardHtml(x))).join('');
        const dTot = live ? Math.min(11, h.d[0].v === 1 ? 11 : h.d[0].v > 10 ? 10 : h.d[0].v) : S.bjTotal(h.d);
        table += '<div class="mz-hand"><span class="mz-tot' + (!live && dTot > 21 ? ' bust' : '') + '">' + dTot + '</span><div class="mz-cards">' + dealer + '</div><small>Zé, a banca</small></div>' +
          '<div class="mz-hand me"><div class="mz-cards">' + h.p.map((x, k) => cardHtml(x, pNew(k) ? 'new' : '', pNew(k) ? (bjSeen.p ? 0.05 : [0, 0.2][k] || 0) : 0)).join('') + '</div><span class="mz-tot' + (S.bjTotal(h.p) > 21 ? ' bust' : S.bjTotal(h.p) === 21 ? ' bj' : '') + '">' + S.bjTotal(h.p) + '</span><small>Você · ' + R$(h.stake) + ' na mesa</small></div>';
        const dealt = !live ? Math.max(0, h.d.length - 2) : 0;
        bjSeen = { p: h.p.length, d: h.d.length, open: !live, wait: live ? 0 : 0.5 + 0.45 * dealt };
      } else table += '<div class="mz-hand empty"><small>Ponha a ficha e o Zé dá as cartas.</small></div>';
      table += '</div>';
      const acts = live ? '<div class="mz-acts"><button class="btn" data-bj="hit">Pedir</button><button class="btn mz-stand" data-bj="stand">Parar</button><button class="btn ghost" data-bj="double"' + (h.p.length === 2 && (h.paid ? h.stake : h.stake * 2) <= left ? '' : ' disabled') + '>Dobrar</button></div>' :
        stakeSeg(c) + '<button class="btn" id="mz-go"' + (casStake > left ? ' disabled' : '') + '>' + (h ? 'Nova mão · ' : 'Dar as cartas · ') + R$(casStake) + '</button>';
      const msg = L && !live ? resMsg(L).replace('class="mz-res', 'style="animation-delay:' + (bjSeen.wait || 0) + 's" class="mz-res') : '';
      return back + top + table + msg + acts;
    }
    // bicho: talão de papel, o bicho escolhido circulado a caneta
    const pend = (fc.bicho || []).map((b, k, a) => '<li class="mz-tick' + (bichoStamp && k === a.length - 1 ? ' stamp' : '') + '"><b>' + String(b.g + 1).padStart(2, '0') + ' · ' + esc(S.BICHOS[b.g]) + '</b><span>' + S.BICHO_MODES[b.mode][0] + ' · ' + R$(b.stake) + '</span><i>anotado</i></li>').join('');
    bichoStamp = false;
    return back + top + '<div class="mz-talao"><header><b>Jogo do bicho</b><small>Banca do Zé · vale o escrito</small></header>' +
      '<div class="mz-bichos">' + S.BICHOS.map((nm, k) => '<button data-bg="' + k + '"' + (bichoG === k ? ' class="on"' : '') + '><b>' + String(k + 1).padStart(2, '0') + '</b><small>' + nm + '</small></button>').join('') + '</div></div>' +
      '<div class="seg mz-mode">' + Object.keys(S.BICHO_MODES).map(k => '<button data-bm="' + k + '"' + (bichoMode === k ? ' class="on"' : '') + '>' + S.BICHO_MODES[k][0] + ' · ' + String(S.BICHO_MODES[k][1]).replace('.', ',') + '×</button>').join('') + '</div>' +
      stakeSeg(c) + '<button class="btn" id="mz-go"' + (casStake > left ? ' disabled' : '') + '>Jogar ' + R$(casStake) + ' no ' + esc(S.BICHOS[bichoG]) + '</button>' +
      (pend ? '<ul class="mz-ticks">' + pend + '</ul><small class="fc-own">O resultado sai no jornal, junto com o próximo jogo.</small>' : '');
  }
  // Prêmio contando de 0 até o valor e moedas pulando (só quando ganha)
  function casWin(net) {
    const el = $('mz-res');
    if (!el || net <= 0 || calm()) return;
    const box = document.createElement('div'); box.className = 'mz-coins'; box.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < 14; k++) { const i = document.createElement('i'); i.style.setProperty('--x', (Math.random() * 220 - 110).toFixed(0) + 'px'); i.style.setProperty('--y', (-60 - Math.random() * 90).toFixed(0) + 'px'); i.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's'; box.appendChild(i); }
    el.appendChild(box); setTimeout(() => box.remove(), 1400);
  }
  function bindMesa() {
    const c = G.c, R$ = v => 'R$ ' + U.money(v), redo = () => { save(); bar(); betRender(); };
    const op = $('mz-open'); if (op) op.onclick = () => { if (S.fcNight(c)) { sfx('paper'); redo(); } };
    document.querySelectorAll('.mz-g').forEach(b => { b.onclick = () => { if (!S.fcNightOpen(c) && !S.fcNight(c)) return; sfx('tap'); zeGame = b.dataset.g; casLast = null; bjSeen = { p: 0, d: 0, open: false }; betRender(); window.scrollTo(0, 0); }; });
    const bk = $('mz-back'); if (bk) bk.onclick = () => { if (casBusy) return; sfx('tap'); zeGame = null; betRender(); window.scrollTo(0, 0); };
    document.querySelectorAll('.mz-chip').forEach(b => { b.onclick = () => { if (casBusy) return; sfx('coin'); casStake = +b.dataset.cs; betRender(); }; });
    document.querySelectorAll('[data-rb]').forEach(b => { b.onclick = () => { if (casBusy) return; sfx('tap'); rolBet = b.dataset.rb; betRender(); }; });
    document.querySelectorAll('[data-rn]').forEach(b => { b.onclick = () => { if (casBusy) return; sfx('tap'); rolNum = (rolNum + +b.dataset.rn + 37) % 37; rolBet = 'num'; betRender(); }; });
    document.querySelectorAll('[data-bg]').forEach(b => { b.onclick = () => { sfx('tap'); bichoG = +b.dataset.bg; betRender(); }; });
    document.querySelectorAll('[data-bm]').forEach(b => { b.onclick = () => { sfx('tap'); bichoMode = b.dataset.bm; betRender(); }; });
    document.querySelectorAll('[data-bj]').forEach(b => { b.onclick = () => { if (casBusy) return; const o = S.fcBjAct(c, b.dataset.bj); if (o && o.done) bjDone(o); else sfx('paper'); redo(); bjAfter(); }; });
    const go = $('mz-go');
    if (!go) return;
    go.onclick = () => {
      if (casBusy) return;
      if (zeGame === 'crash') crashFly(c);
      else if (zeGame === 'rol') rolSpin(c, R$);
      else if (zeGame === 'slot') slotSpin(c, R$);
      else if (zeGame === 'bj') {
        const o = S.fcBjDeal(c, casStake);
        if (!o) return;
        casLast = null; bjSeen = { p: 0, d: 0, open: false }; sfx('paper');
        if (o.done) bjDone(o);
        redo(); bjAfter();
      } else if (zeGame === 'bicho') {
        if (S.fcBicho(c, bichoG, bichoMode, casStake)) { sfx('paper'); bichoStamp = true; casLast = null; redo(); }
      }
    };
  }
  // Foguetinho: o motor já sabe onde explode (S.fcCrashGo); a tela sobe o multiplicador (dobra a cada 3,5 s) e o botão
  // vira "Sacar". Sair da tela com o foguete no ar conta como explodiu
  let crRun = null;
  const crX = x => x.toFixed(2).replace('.', ',');
  function crashFly(c) {
    const o = S.fcCrashGo(c, casStake);
    if (!o) return;
    save(); sfx('tap');
    casBusy = true; casLast = null;
    const stake = casStake, t0 = performance.now(), K = Math.LN2 / 3500, btn = $('mz-go'), path = $('cr-path'), xe = $('cr-x'), msg = $('cr-msg');
    btn.classList.add('cash'); msg.textContent = 'subindo…';
    const res = $('mz-res'); if (res) { res.className = 'mz-res idle'; res.textContent = 'Saca antes de explodir.'; }
    let m = 1;
    const end = cashed => {
      cancelAnimationFrame(crRun); crRun = null; casBusy = false;
      const r = S.fcCrashEnd(c, cashed ? m : 0);
      if (!r) return;
      save(); bar();
      casLast = { g: 'crash', net: r.net, txt: r.ok ? 'Sacou em ' + crX(m) + '×: +R$ ' + U.money(r.back - stake) : 'Explodiu em ' + crX(r.x) + '×. Foram R$ ' + U.money(stake) };
      if (r.ok) { sfx('coin'); casWin(r.net); } else sfx('miss');
      if ($('cr-x')) { xe.textContent = crX(r.ok ? m : r.x) + '×'; xe.className = r.ok ? 'up' : 'down'; msg.textContent = r.ok ? 'sacou! o foguete foi até ' + crX(r.x) + '×' : 'explodiu!'; setTimeout(() => { if (zeGame === 'crash' && $('cr-x')) betRender(); }, 1300); }
    };
    btn.textContent = 'Sacar R$ ' + U.money(stake);
    btn.onclick = () => { if (crRun) end(true); };
    const step = now => {
      if (!$('cr-x')) { crRun = null; casBusy = false; S.fcCrashEnd(c, 0); save(); return; }
      m = Math.floor(Math.exp(K * (now - t0)) * 100) / 100;
      if (m >= o.x) { m = o.x; return end(false); }
      xe.textContent = crX(m) + '×';
      btn.textContent = 'Sacar R$ ' + U.money(Math.round(stake * m));
      const n2 = Math.min(1, (m - 1) / 3), pts = [];
      for (let k = 0; k <= 24; k++) { const x = k / 24 * n2; pts.push((10 + x * 320).toFixed(1) + ' ' + (180 - Math.pow(x, 1.8) * 165).toFixed(1)); }
      path.setAttribute('d', 'M' + pts.join(' L'));
      crRun = requestAnimationFrame(step);
    };
    crRun = requestAnimationFrame(step);
  }
  // Roleta: a roda gira para a frente e para com a casa sorteada no ponteiro; a bolinha corre ao contrário,
  // perde velocidade, cai para dentro e para na mesma casa. O tique-taque desacelera junto
  function rolSpin(c, R$) {
    const stake = casStake, o = S.fcRoulette(c, rolBet === 'num' ? rolNum : rolBet, stake);
    if (!o) return;
    save(); bar(); casBusy = true;
    const n = c.fc.night; (n.rol = n.rol || []).unshift(o.n); n.rol.length = Math.min(n.rol.length, 12);
    const fin = () => {
      casBusy = false;
      casLast = { g: 'rol', n: o.n, net: o.net, txt: '<b class="mz-pill ' + colOf(o.n) + '">' + o.n + '</b> ' + (o.n === 0 ? 'Zero: da casa.' : o.red ? 'Vermelho.' : 'Preto.') + ' ' + (o.win ? 'Ganhou ' + R$(o.back) + '!' : 'Perdeu ' + R$(stake) + '.') };
      sfx(o.win ? 'coin' : 'miss'); betRender(); casWin(o.net);
    };
    const from = rolRot, target = rolTarget(o.n), w = $('mz-w'), orbit = $('mz-orbit'), ball = $('mz-ball');
    rolRot = target;
    if (calm() || !w || !w.animate) { fin(); return; }
    const T = 4200;
    w.style.transform = 'rotate(' + target + 'deg)';
    w.animate([{ transform: 'rotate(' + from + 'deg)' }, { transform: 'rotate(' + target + 'deg)' }], { duration: T, easing: 'cubic-bezier(.12,.62,.1,1)' });
    if (orbit && ball) {
      ball.classList.remove('off', 'in');
      orbit.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1800deg)' }], { duration: T, easing: 'cubic-bezier(.2,.55,.15,1)', fill: 'forwards' });
      ball.animate([{ top: '1.5%' }, { top: '1.5%', offset: 0.62 }, { top: '5%', offset: 0.72 }, { top: '3.5%', offset: 0.78 }, { top: '7.3%', offset: 0.88 }, { top: '7.3%' }], { duration: T, fill: 'forwards' });
    }
    const res = $('mz-res'); if (res) { res.className = 'mz-res idle'; res.textContent = 'Apostas encerradas. A bolinha está rodando…'; }
    let t = 0, gap = 60;
    const tick = () => { if (t > T - 250) return; sfx('tick'); t += gap; gap *= 1.09; setTimeout(tick, gap); };
    tick();
    setTimeout(fin, T + 250);
  }
  // Caça-níquel: cada rolo é uma fita de símbolos que desce rápido (borrada) e para com um tranco, um depois do outro
  function slotSpin(c, R$) {
    const stake = casStake, o = S.fcSlot(c, stake);
    if (!o) return;
    save(); bar(); casBusy = true;
    const fin = () => {
      casBusy = false; slotLast = o.reels;
      const nm = S.SLOT[o.reels[0]].name.toLowerCase();
      casLast = { g: 'slot', reels: o.reels, net: o.net, hit: o.hit, txt: o.mult < 0 ? 'Três cartões vermelhos: perdeu ' + R$(stake - o.back) + '.' : o.hit === 3 ? 'Três ' + (nm === 'rede' ? 'redes' : nm + 's') + '! Ganhou ' + R$(o.back) + '!' : o.hit === 2 ? (o.net > 0 ? 'Duas iguais: ganhou ' + R$(o.back) + '.' : o.net === 0 ? 'Duas iguais: o dinheiro volta.' : 'Duas iguais: voltaram ' + R$(o.back) + '.') : 'Nada. Perdeu ' + R$(stake) + '.' };
      sfx(o.net > 0 ? (o.hit === 3 ? 'fanfare' : 'coin') : 'miss'); betRender(); casWin(o.net);
    };
    const lever = $('mz-lever'); if (lever) { lever.classList.remove('pull'); void lever.offsetWidth; lever.classList.add('pull'); }
    const res = $('mz-res'); if (res) { res.className = 'mz-res idle'; res.textContent = 'Rodando…'; }
    if (calm()) { fin(); return; }
    sfx('whistle');
    const H = ($('mz-r0') || { offsetHeight: 100 }).offsetHeight / 3 || 34;
    o.reels.forEach((k, i) => {
      const el = $('mz-r' + i);
      if (!el) return;
      const N = 18 + i * 7, cells = [];
      for (let j = 0; j < N; j++) cells.push(sym(Math.floor(Math.random() * 5), 'lg'));
      cells.push(sym((k + 4) % 5, 'lg'), sym(k, 'lg'), sym((k + 1) % 5, 'lg'));
      const cur = slotLast[i];
      el.innerHTML = '<div class="mz-strip spin">' + [sym((cur + 4) % 5, 'lg'), sym(cur, 'lg'), sym((cur + 1) % 5, 'lg')].concat(cells).map((h, j) => '<i>' + h + '</i>').join('') + '</div>';
      const st = el.firstChild, dist = (cells.length) * H, dur = 1100 + i * 450;
      st.animate([{ transform: 'translateY(0)', filter: 'blur(0)' }, { transform: 'translateY(-' + (dist * 0.15) + 'px)', filter: 'blur(2px)', offset: 0.12 }, { transform: 'translateY(-' + (dist * 0.92) + 'px)', filter: 'blur(2px)', offset: 0.8 }, { transform: 'translateY(-' + (dist + 6) + 'px)', filter: 'blur(0)', offset: 0.93 }, { transform: 'translateY(-' + dist + 'px)', filter: 'blur(0)' }], { duration: dur, easing: 'linear', fill: 'forwards' });
      setTimeout(() => sfx('kick'), dur * 0.93);
    });
    setTimeout(fin, 1100 + 2 * 450 + 350);
  }
  // Vinte e um: segura os botões até as cartas chegarem (a banca compra uma a uma no fim)
  function bjAfter() {
    const w = bjSeen.wait || 0;
    if (!w || calm()) return;
    casBusy = true;
    for (let k = 0; k * 0.45 + 0.6 < w; k++) setTimeout(() => sfx('paper'), (0.15 + 0.45 * k) * 1000);
    setTimeout(() => { casBusy = false; if (casLast && casLast.g === 'bj') { sfx(casLast.net > 0 ? 'coin' : casLast.net < 0 ? 'miss' : 'tap'); casWin(casLast.net); } }, w * 1000);
  }
  function bjDone(o) {
    const R$ = v => 'R$ ' + U.money(v), p = S.bjTotal(o.p), d = S.bjTotal(o.d);
    const txt = o.nat ? (o.net > 0 ? 'Vinte e um de cara! Ganhou ' + R$(o.net) + '.' : 'Vinte e um dos dois: empate.') : p > 21 ? 'Estourou com ' + p + '. Perdeu ' + R$(o.stake) + '.' : o.net > 0 ? (d > 21 ? 'A banca estourou com ' + d + '.' : p + ' contra ' + d + '.') + ' Ganhou ' + R$(o.net) + '.' : o.net === 0 ? p + ' a ' + d + ': empate, o dinheiro volta.' : p + ' contra ' + d + ' da banca. Perdeu ' + R$(o.stake) + '.';
    casLast = { g: 'bj', hand: o, net: o.net, txt };
  }
  // A tentação: proposta do Zé para o seu próximo jogo
  function fixBox(c, R$) {
    const f = S.fcZeOffer(c);
    if (!f) return '';
    const nx = S.fcNext(c);
    if (f.st === 'yes') return '<div class="mz-fix on"><b>Combinado com o Zé</b><p>Amarelo até os ' + f.min + "' contra o " + esc(nameOf(nx.vs)) + '. Se você entrar em campo, recebe ' + R$(f.pay) + '. Risco de escândalo: ' + Math.round(S.FC_FIX_SCANDAL * 100) + '%.</p></div>';
    if (f.st === 'no') return '';
    return '<button class="mz-fix" data-go2="ze"><b>Mensagem do Zé</b><p>Ele tem uma proposta para o seu próximo jogo. Toque para abrir a conversa.</p></button>';
  }
  function betRender() {
    const el = $('fc-bet');
    if (!el) return;
    const c = G.c, R$ = v => 'R$ ' + U.money(v);
    if (zeTab !== 'ext') zeTab = 'cas'; // palpite de futebol agora é só com o Zé, no ZapZap
    const tabs = [['cas', 'Cassino'], ['ext', 'Extrato']];
    el.innerHTML = '<div class="fc-cash"><span>Seu dinheiro</span><b>R$ ' + U.money(c.money || 0) + '</b></div>' + (zeTab === 'cas' && zeGame ? '' : fixBox(c, R$)) +
      (zeTab === 'cas' && zeGame ? '' : '<div class="seg ze-tabs">' + tabs.map(([k, t]) => '<button data-t="' + k + '"' + (zeTab === k ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>') +
      (zeTab === 'ext' ? extratoBox(c, R$) : mesaBox(c, R$));
    el.classList.toggle('mz', zeTab === 'cas');
    bindBet(); bindMesa();
    el.querySelectorAll('[data-go2]').forEach(b => { b.onclick = () => { sfx('tap'); go(b.dataset.go2); }; });
  }
  // ---------- Banco (fase 3): o saldo, a dívida, o que entra e sai por semana e as saídas do vermelho ----------
  // Mercado: a janela do meio do ano (engine/transfer.js). Antes dela, quando abre; aberta, as propostas (assinar leva
  // para o clube novo na hora) e ficar; depois, o que aconteceu. Embaixo, o contrato de hoje
  function mktBox() {
    const c = G.c, el = $('fc-mkt'), fc = c.fc;
    if (!el) return;
    const w = S.fcWinState(c), open = S.fcWin(c), R = v => 'R$ ' + U.money(v);
    const at = fc.mwAt !== undefined ? fc.mwAt : Math.max(2, Math.round(S.FC_WIN.at * fc.cal.length));
    let head = '', body = '', more = '';
    if (open) {
      open.seen = true;
      const left = S.fcWinLeft(c);
      head = '<p class="eyebrow">Janela do meio do ano · aberta</p><h3 class="mk-h">' + (open.offers.length ? (open.offers.length > 1 ? open.offers.length + ' propostas na mesa' : 'Uma proposta na mesa') : 'Nenhuma proposta por enquanto') + '</h3>' +
        '<p class="mk-p">' + (open.offers.length ? 'Assinando, você joga pelo clube novo já no próximo jogo. A copa e o continental ficam com ' + D.o(nameOf(c.club)) + '.' : 'Ninguém ligou ainda. Jogo bom chama atenção, e quem está sobrando no banco também recebe proposta.') +
        ' Fecha ' + (left > 1 ? 'em ' + left + ' jogos.' : 'depois do próximo jogo.') + '</p>';
      const pk = S.fcEmpPick ? S.fcEmpPick(open) : -1;
      body = open.offers.map((o, i) => { const lv = S.fcLuvasOf ? S.fcLuvasOf(c, o) : 0, fee = S.fcFeeOf ? S.fcFeeOf(c, o) : 0;
        return U.offerCard(o, i, { terms: (i === pk ? '<p class="mk-pref">' + U.emo('💼', 'xs') + ' O empresário prefere esta: paga mais</p>' : '') + '<p class="mk-terms">' + (o.wage > c.wage ? 'Salário ' + Math.round((o.wage / Math.max(1, c.wage) - 1) * 100) + '% maior' : o.wage < c.wage ? 'Salário ' + Math.round((1 - o.wage / Math.max(1, c.wage)) * 100) + '% menor' : 'Mesmo salário') +
          (lv ? ' · luvas de ' + R(lv) : '') + (fee ? ' · comissão do empresário ' + R(fee) : '') + '</p>' }); }).join('') +
        (open.offers.length ? '<button class="btn ghost" id="mk-stay">Ficar ' + D.no(nameOf(c.club)) + '</button>' : '');
      // Outras saídas: pedir aumento (renovação) ou pedir para sair
      const rn = open.renew, rp = Math.round(S.fcRenewP(c) * 100), F = S.SQUAD_FX || { outCoach: -5, outFans: -5 }, nw = S.fcRenewOf(c);
      const row = (name, fx, right) => '<div class="fc-si"><span><b>' + esc(name) + '</b><small>' + fx + '</small></span>' + right + '</div>';
      more = '<div class="fc-ss"><h3>Com ' + esc(D.o(nameOf(c.club))) + '</h3>' +
        row('Pedir aumento', rn ? (rn.ok ? 'Renovado: ' + R(rn.wage) + ' por semana até daqui a ' + D.plural(rn.years, 'ano', 'anos') + ' (tirou ' + rn.roll + ', precisava de até ' + rn.p + ')' : 'A diretoria disse não (tirou ' + rn.roll + ', precisava de até ' + rn.p + '). Técnico −' + Math.abs(S.FC_RENEW.fail)) :
          rp + '% de chance · ' + R(nw.wage) + ' por semana e mais ' + S.FC_RENEW.years + ' anos de contrato. Não dá: técnico −' + Math.abs(S.FC_RENEW.fail), '<button class="fc-buy" id="mk-renew"' + (S.fcRenewOk(c) ? '' : ' disabled') + '>' + (rn ? (rn.ok ? 'Feito' : 'Recusado') : 'Pedir') + '</button>') +
        row('Pedir para sair', open.out ? 'Pedido feito: técnico −' + Math.abs(F.outCoach) + ', torcida −' + Math.abs(F.outFans) + '. Sem trocar agora, a janela do fim do ano abre' : 'O empresário arruma mais uma proposta agora. Técnico −' + Math.abs(F.outCoach) + ' e torcida −' + Math.abs(F.outFans) + '; sem trocar, a janela do fim do ano abre',
          '<button class="fc-buy" id="mk-out"' + (S.fcAskOutOk(c) ? '' : ' disabled') + '>' + (open.out ? 'Pedido' : 'Pedir') + '</button>') + '</div>';
    } else if (w && w.st === 'rumor') {
      const k = Math.max(0, w.at - fc.i);
      head = '<p class="eyebrow">Janela do meio do ano · abre em ' + D.plural(k, 'jogo', 'jogos') + '</p><h3 class="mk-h">' + (w.sond.length ? (w.sond.length > 1 ? w.sond.length + ' clubes perguntaram por você' : 'Um clube perguntou por você') : 'Nenhuma sondagem por enquanto') + '</h3>' +
        '<p class="mk-p">' + (w.sond.length ? 'Ainda não é proposta. Jogando bem até a janela (nota média 6,8 ou mais), a chance de virar proposta é de ' + Math.round(S.FC_SOND.ok * 100) + '%; jogando mal, ' + Math.round(S.FC_SOND.ko * 100) + '%.' : 'O empresário segue ligando. Jogo bom chama atenção.') + '</p>';
      body = w.sond.map(o => '<div class="fc-si mk-sd">' + crest(o.club, 'xs') + '<span><b>' + esc(nameOf(o.club)) + '</b><small>' + esc(D.LEAGUE_BY_ID[D.CLUB_BY_ID[o.club].league].name) + ' · força ' + D.CLUB_BY_ID[o.club].strength + ' · ' + esc(o.role) + '</small></span></div>').join('');
    } else if (w && w.st === 'signed' && fc.moved) {
      const L0 = fc.lg0;
      head = '<p class="eyebrow">Janela do meio do ano · fechada</p><h3 class="mk-h">Você trocou de clube</h3>' +
        '<p class="mk-p">Saiu ' + D.do(nameOf(fc.moved.from)) + (L0 ? ' (' + L0.pos + 'º ' + D.no(L0.name) + ')' : '') + ' e chegou ' + D.ao(nameOf(fc.moved.to)) + ' na rodada ' + (fc.moved.ri0 + 1) + ' ' + D.do(fc.lg.name) + '. A próxima janela é no fim da temporada.</p>';
    } else if (w) {
      head = '<p class="eyebrow">Janela do meio do ano · fechada</p><h3 class="mk-h">' + (w.stay ? 'Você ficou' : 'A janela passou') + '</h3><p class="mk-p">' + (w.offers.length ? (w.stay ? 'Recusou ' + (w.offers.length > 1 ? 'as propostas' : 'a proposta') + ' e segue ' + D.no(nameOf(c.club)) + '.' : 'Ninguém fechou a tempo.') : w.lost ? 'Quem tinha perguntado esfriou e não fez proposta.' : 'Nenhum clube fez proposta desta vez.') + ' A próxima janela é no fim da temporada.</p>';
    } else {
      const k = Math.max(0, at - fc.i);
      const no = c.loan || c.clubSince === c.age || c.age < 18;
      head = '<p class="eyebrow">Janela do meio do ano</p><h3 class="mk-h">' + (c.loan ? 'Emprestado até o fim do ano' : no ? 'Sem janela nesta temporada' : k > 0 ? 'Abre em ' + D.plural(k, 'jogo', 'jogos') : 'Fechada') + '</h3>' +
        '<p class="mk-p">' + (c.loan ? 'Quem está emprestado não troca de clube no meio do ano.' : c.age < 18 ? 'Menor de idade não troca de clube no meio da temporada. A janela abre a partir dos 18 anos.' : c.clubSince === c.age ? 'Você acabou de chegar: o clube não te vende nesta temporada.' : 'No meio da temporada os clubes podem fazer proposta. Quem joga bem chama atenção.') + '</p>';
    }
    const cur = '<div class="fc-ss"><h3>Seu contrato</h3><div class="fc-si"><span><b>' + esc(nameOf(c.club)) + '</b><small>' + R(c.wage) + ' por semana · ' + D.plural(Math.max(1, c.contract), 'ano', 'anos') + (c.contract > 1 ? ' restantes' : ' restante') + '</small></span></div></div>';
    el.innerHTML = '<div class="mk-top">' + head + '</div>' + (body ? '<div class="mk-offers">' + body + '</div>' : '') + more + cur;
    el.querySelectorAll('.of-sign').forEach(b => { b.onclick = () => {
      const o = open.offers[+b.dataset.i];
      const ln = o.kind === 'loan';
      U.ask(ln ? 'Ir emprestado para ' + D.o(nameOf(o.club)) + '?' : 'Assinar com ' + D.o(nameOf(o.club)) + '?', ln ? 'Até o fim da temporada, para jogar. ' + D.O(nameOf(c.club)) + ' segue pagando o salário e você volta no fim do ano.' : 'Você sai ' + D.do(nameOf(c.club)) + ' agora, no meio da temporada. O técnico e a torcida daqui não esquecem.', ln ? 'Ir emprestado' : 'Assinar', () => {
        if (S.fcWinSign(c, +b.dataset.i)) { sfx('coin'); save(); bar(); mktBox(); }
      });
    }; });
    if ($('mk-stay')) $('mk-stay').onclick = () => { sfx('tap'); S.fcWinStay(c); save(); mktBox(); };
    if ($('mk-renew')) $('mk-renew').onclick = () => U.ask('Pedir aumento?', 'Chance de ' + Math.round(S.fcRenewP(c) * 100) + '%. Se a diretoria disser não, o técnico não gosta (−' + Math.abs(S.FC_RENEW.fail) + ').', 'Pedir', () => { const x = S.fcRenew(c); if (x) { sfx(x.ok ? 'coin' : 'tap'); save(); bar(); mktBox(); } });
    if ($('mk-out')) $('mk-out').onclick = () => U.ask('Pedir para sair?', 'O técnico e a torcida não gostam. O empresário procura mais uma proposta agora.', 'Pedir', () => { if (S.fcAskOut(c) !== null) { sfx('tap'); save(); bar(); mktBox(); } });
  }
  function bankBox() {
    const c = G.c, el = $('fc-bank');
    if (!el) return;
    const R = v => 'R$ ' + U.money(v), cash = c.money || 0, debt = S.fcDebt(c), wp = S.fcWeekPay(c), F = c.fin || {};
    const staff = S.fcStaffWeek(c), upk = S.fcUpkeep(c), adv = F.adv && F.adv.left > 0 ? Math.min(F.adv.left, Math.round(wp * S.FC_ADV.cut)) : 0, jur = Math.round(debt * S.FC_DEBT.rate);
    const INV = S.fcInvs(c), im = INV.find(x => x.id === 'imovel'), st = INV.find(x => x.id === 'startup');
    const rent = im ? Math.round(im.paid * S.FC_INVEST.imovel.rent) : 0;
    const line = (n, v, cls) => '<p class="bk-l"><span>' + n + '</span><b class="' + (cls || '') + '">' + v + '</b></p>';
    const flow = line('Salário', '+' + R(wp), 'up') + (im ? line('Aluguel do apartamento', '+' + R(rent), 'up') : '') + (staff ? line('Equipe pessoal', '−' + R(staff), 'down') : '') + (upk ? line('Carro e casa', '−' + R(upk), 'down') : '') +
      (adv ? line('Adiantamento (faltam ' + R(F.adv.left) + ')', '−' + R(adv), 'down') : '') + (jur ? line('Juros da dívida', '−' + R(jur), 'down') : '');
    const left = wp + rent - staff - upk - adv - jur;
    const W = S.fcWays(c), by = id => W.find(w => w.id === id);
    const btn = (id, label, ok) => '<button class="fc-buy" data-way="' + id + '"' + (ok ? '' : ' disabled') + '>' + label + '</button>';
    const row = (name, fx, right) => '<div class="fc-si"><span><b>' + esc(name) + '</b><small>' + fx + '</small></span>' + right + '</div>';
    const a = by('adv'), h = by('help'), cu = by('cut');
    const help = h ? (h.ok ? '+' + R(h.v) + ' agora. Ela ajuda, mas fica preocupada' : S.fcTone(c, 'mae') !== 'bom' ? 'Só quando a relação com ela está boa' : debt ? 'Ela já ajudou há pouco tempo' : 'Só quando você estiver devendo') : '';
    const ways = debt ? '<div class="fc-ss"><h3>Sair do vermelho</h3><p class="fc-own">Cada saída custa alguma coisa. O salário também paga a dívida sozinho, mas os juros correm.</p>' +
      row('Adiantamento do empresário', a.ok ? '+' + R(a.v) + ' agora. Volta ' + R(Math.round(a.v * (1 + S.FC_ADV.fee) / 1000) * 1000) + ', ' + Math.round(S.FC_ADV.cut * 100) + '% do salário por semana' : F.adv ? 'Ainda pagando o anterior' : 'Um por temporada', btn('adv', 'Pedir', a.ok)) +
      (h ? row('Ajuda da mãe', help, btn('help', 'Pedir', h.ok)) : '') +
      row('Renovar ganhando menos', cu.ok ? R(cu.v) + ' de luvas agora. Salário cai para ' + R(cu.wage) + ' por semana e o contrato ganha mais um ano' : debt <= 4 * wp ? 'Só com a dívida acima de 4 semanas de salário' : 'Sem contrato para renovar agora', btn('cut', 'Renovar', cu.ok)) +
      '</div>' : '';
    const L = c.life || {}, car = L.car && S.FC_SHOP.cars.find(x => x.id === L.car), own = [];
    if (car) own.push(row(car.name, 'Manutenção ' + R((L.mt && L.mt.car) || 0) + ' por semana · vende por ' + R(S.fcSellValue(c, 'car')) + ' (fama −' + Math.round(car.fame / 2) + ')', btn('car', 'Vender', true)));
    if (S.fcOwns(c, 'house')) own.push(row('Casa', 'Manutenção ' + R((L.mt && L.mt.house) || 0) + ' por semana · vende por ' + R(S.fcSellValue(c, 'house')) + ' (fama −3)', btn('house', 'Vender', true)));
    if (S.fcOwns(c, 'grife')) own.push(row('Guarda-roupa de grife', 'Coleção nova: ' + R((L.mt && L.mt.grife) || 0) + ' por semana · vende por ' + R(S.fcSellValue(c, 'grife')) + ' (fama −1)', btn('grife', 'Vender', true)));
    if (im) own.push(row('Apartamento para alugar', 'Pago ' + R(im.paid) + ' · vale hoje ' + R(im.val) + ' · aluguel ' + R(rent) + ' por semana', btn('imovel', 'Vender', true)));
    // Investir: o apartamento (renda e algum susto) e o negócio do primo (triplica ou some)
    const I = S.FC_INVEST, ip = S.fcInvPrice(c), canInv = !debt;
    const inv = '<div class="fc-ss"><h3>Investir</h3>' +
      (im ? '' : row('Apartamento para alugar', 'Aluguel de ' + R(Math.round(ip * I.imovel.rent)) + ' por semana. A cada temporada o valor muda (' + Math.round(I.imovel.lo * 100) + '% a ' + Math.round(I.imovel.hi * 100) + '% do pago) e, uma vez em cinco, um problema custa ' + Math.round(I.imovel.badCost * 100) + '% do preço', btn('im-buy', R(ip), canInv && cash >= ip))) +
      (st ? row('Negócio do primo do ' + esc(c.ppl ? S.fcContact(c, 'parca').name : 'parça'), 'Você pôs ' + R(st.paid) + '. O resultado sai no começo da próxima temporada', '<em class="fc-own-tag">Esperando</em>') :
        row('Negócio do primo do ' + esc(c.ppl ? S.fcContact(c, 'parca').name : 'parça'), 'O dinheiro fica preso até a próxima temporada. ' + Math.round(I.startup.p * 100) + '%: volta ' + I.startup.win + ' vezes. ' + Math.round((1 - I.startup.p) * 100) + '%: volta só ' + Math.round(I.startup.lose * 100) + '%',
          '<span class="bk-st">' + S.fcInvStakes(c).map(v => btn('st-' + v, R(v), canInv && cash >= v)).join('') + '</span>')) +
      (debt ? '<p class="fc-own">Devendo, o banco não deixa investir.</p>' : '') + '</div>';
    const lv = c.luvas && c.luvas.s === c.season ? '<p class="fc-own">Luvas desta temporada: ' + R(c.luvas.v) + (c.luvas.cut ? ' (renovação com desconto)' : '') + '.</p>' : '';
    el.innerHTML =
      '<div class="fc-cash ng"><span>Olá, ' + esc(String(c.name || '').split(' ')[0]) + ' · saldo em conta</span><b>' + R(cash) + '</b><small>Salário de ' + R(wp) + ' cai toda semana, depois do jogo. Bônus do fim do ano: meta e títulos pagam semanas de salário extra.</small>' +
        (debt ? '<p class="fc-debt"><b>Dívida ' + R(debt) + '</b> Juros de ' + String(S.FC_DEBT.rate * 100).replace('.', ',') + '% por semana. O salário paga a dívida primeiro, e a loja não vende carro nem casa até quitar.</p>' : '') + '</div>' +
      '<div class="fc-ss"><h3>Por semana</h3><div class="bk-flow">' + flow + line('Sobra', (left >= 0 ? '+' : '−') + R(Math.abs(left)), left >= 0 ? 'up' : 'down') + '</div>' + lv + '</div>' +
      ways + inv +
      (own.length ? '<div class="fc-ss"><h3>Patrimônio</h3>' + own.join('') + '</div>' : '');
    const done = () => { save(); bar(); bankBox(); };
    el.querySelectorAll('[data-way]').forEach(b => { b.onclick = () => {
      const id = b.dataset.way;
      if (id === 'adv') { if (S.fcAdvance(c)) { sfx('coin'); done(); } return; }
      if (id === 'help') { if (S.fcHelp(c)) { sfx('coin'); done(); } return; }
      if (id === 'cut') return U.ask('Renovar ganhando menos?', 'Entram ' + R(cu.v) + ' de luvas agora, o salário cai para ' + R(cu.wage) + ' por semana e o contrato ganha mais um ano.', 'Renovar', () => { if (S.fcCut(c)) { sfx('coin'); done(); } });
      if (id === 'im-buy') return U.ask('Comprar o apartamento?', 'Saem ' + R(ip) + ' agora. Ele rende aluguel toda semana e você pode vender quando quiser pelo valor do momento.', 'Comprar', () => { if (S.fcInvBuy(c, 'imovel')) { sfx('coin'); done(); } });
      if (id.startsWith('st-')) { const v = +id.slice(3); return U.ask('Pôr ' + R(v) + ' no negócio?', 'O dinheiro fica preso até a próxima temporada. ' + Math.round(I.startup.p * 100) + '% de chance de voltar ' + R(v * I.startup.win) + '; senão volta ' + R(Math.round(v * I.startup.lose / 1000) * 1000) + '.', 'Investir', () => { if (S.fcInvBuy(c, 'startup', v)) { sfx('coin'); done(); } }); }
      if (id === 'imovel') return U.ask('Vender o apartamento?', 'Entram ' + R(im.val) + ' (o valor de hoje) e o aluguel acaba.', 'Vender', () => { if (S.fcInvSell(c, S.fcInvs(c).indexOf(im))) { sfx('coin'); done(); } });
      const nm = id === 'car' ? car.name.toLowerCase() : id === 'grife' ? 'guarda-roupa de grife' : 'casa';
      U.ask('Vender ' + (id === 'car' || id === 'grife' ? 'o ' : 'a ') + nm + '?', 'Entram ' + R(S.fcSellValue(c, id)) + ', a manutenção acaba e a fama cai um pouco. Para ter de novo, só comprando outra vez.', 'Vender', () => { if (S.fcSell(c, id)) { sfx('coin'); done(); } });
    }; });
  }
  function shopBox() {
    const c = G.c, el = $('fc-shop');
    if (!el) return;
    const R = v => 'R$ ' + U.money(v), cash = c.money || 0, attrs = S.fcGearAttrs(c);
    if (!attrs.includes(gearAttr)) gearAttr = attrs[0];
    const g = c.gear && c.gear.left > 0 ? c.gear : null, gNow = g ? S.FC_SHOP.gear.find(x => x.id === g.id) : null;
    const gw = c.pos === 'GOL' ? 'luvas' : 'chuteira';
    // O que está no pé: imagem, bônus e a vida que sobra (barra de desgaste)
    const worn = g ? '<div class="fc-eq"><img src="assets/loja/' + gw + '-' + g.id + '.webp" alt="" draggable="false"><span><small>' + (c.pos === 'GOL' ? 'Equipadas' : 'Equipada') + '</small><b>' + esc(S.fcGearName(c, gNow)) + '</b><em>+' + g.b + ' em ' + esc(D.label(c.pos, g.attr)) + (g.en ? ' · cansa ' + g.en + ' a menos' : '') + '</em>' +
      '<i class="fc-eq-bar ' + (g.left <= 5 ? 'low' : '') + '"><i style="width:' + Math.round(g.left / g.games * 100) + '%"></i></i><em>' + (g.left === 1 ? 'Último jogo' : 'Mais ' + g.left + ' de ' + g.games + ' jogos') + '</em></span></div>'
      : '<p class="fc-own">' + (c.pos === 'GOL' ? (c.fc && c.fc.gearOut ? 'Suas luvas rasgaram. ' : '') + 'Sem luvas especiais: compre um par e ele entra no próximo jogo.' : (c.fc && c.fc.gearOut ? 'Sua chuteira rasgou. ' : '') + 'Sem chuteira especial: compre uma e ela entra no próximo jogo.') + '</p>';
    const btn = (kind, id, label, ok, on) => '<button class="fc-buy' + (on ? ' on' : '') + '" data-k="' + kind + '" data-id="' + id + '"' + (ok ? '' : ' disabled') + '>' + label + '</button>';
    // Imagem do item (assets/loja); os que ainda não têm arte ficam sem
    const img = f => (LOJA_IMG.includes(f) ? '<img class="fc-si-im" src="assets/loja/' + f + '.webp" alt="" draggable="false" loading="lazy">' : '');
    const row = (name, fx, right, f) => '<div class="fc-si' + (f && img(f) ? ' im' : '') + '">' + (f ? img(f) : '') + '<span><b>' + esc(name) + '</b><small>' + esc(fx) + '</small></span>' + right + '</div>';
    const week = S.fcStaffWeek(c), upk = S.fcUpkeep ? S.fcUpkeep(c) : 0, debt = S.fcDebt ? S.fcDebt(c) : 0;
    const upTxt = (kind, id) => (S.fcUpkeepOf ? ' · manutenção ' + R(S.fcUpkeepOf(c, kind, id)) + ' por semana' : '');
    el.innerHTML = '<div class="amz-band"><span><b>Chega antes do apito</b><small>Comprou hoje, usa no jogo ' + (c.fc.i + 1) + '</small></span></div>' +
      '<div class="fc-cash"><span>Saldo no NuGrana</span><b>' + R(cash) + '</b><small>Salário de ' + R(c.wage || 0) + ' por semana' + (week ? ' · equipe: −' + R(week) + ' por semana' : '') + (upk ? ' · carro e casa: −' + R(upk) + ' por semana' : '') + '</small>' +
        (debt ? '<p class="fc-debt"><b>Dívida ' + R(debt) + '</b> Juros de ' + String(S.FC_DEBT.rate * 100).replace('.', ',') + '% por semana. O salário paga a dívida primeiro, e a loja não vende carro nem casa até quitar.</p>' : '') + '</div>' +
      '<div class="fc-ss"><h3>' + (c.pos === 'GOL' ? 'Luvas' : 'Chuteira') + '</h3>' +
        worn + (g ? '<p class="fc-own">' + (c.pos === 'GOL' ? 'Comprar outro par troca o que está nas mãos.' : 'Comprar outra troca a que está no pé.') + '</p>' : '') +
        '<div class="seg fc-attr">' + attrs.map(k => '<button data-a="' + k + '"' + (k === gearAttr ? ' class="on"' : '') + '>' + esc(D.label(c.pos, k)) + '</button>').join('') + '</div>' +
        S.FC_SHOP.gear.map(x => { const p = S.fcGearPrice(c, x.id);
          return row(S.fcGearName(c, x), '+' + x.b + ' em ' + D.label(c.pos, gearAttr) + (x.en ? ', cansa ' + x.en + ' a menos por jogo' : '') + ' · ' + 'dura ' + x.games + ' jogos', btn('gear', x.id, R(p), cash >= p), (c.pos === 'GOL' ? 'luvas-' : 'chuteira-') + x.id); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Equipe pessoal</h3><p class="fc-own">Paga por semana. Se o dinheiro acabar, o contrato cai.</p>' +
        S.FC_SHOP.staff.map(x => { const on = !!(c.staff && c.staff[x.id]), p = S.fcStaffCost(c, x.id);
          return row(x.name, x.fx + ' · ' + R(p) + ' por semana', btn('staff', x.id, on ? 'Dispensar' : 'Contratar', on || cash >= p * 4, on), x.id); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Patrimônio</h3>' +
        S.FC_SHOP.life.map(x => { const own = S.fcOwns(c, x.id), p = S.fcLifePrice(c, x.id);
          return row(x.name, x.fx + ' (+' + x.fame + ' de fama)' + (own ? ' · manutenção ' + R((c.life.mt && c.life.mt[x.id]) || 0) + ' por semana' : upTxt('life', x.id)), own ? '<em class="fc-own-tag">Comprado</em>' : btn('life', x.id, R(p), cash >= p && !debt), x.id); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Festa</h3>' + row('Dar uma festa', '+' + S.FC_PARTY.fame + ' de fama e +' + S.FC_PARTY.fans + ' de torcida, o parça adora. A semana começa sem perna (' + S.FC_PARTY.en + ' de energia). Uma por temporada',
        (c.fin || {}).partyS === c.season ? '<em class="fc-own-tag">Feita</em>' : '<button class="fc-buy" id="fc-party"' + (S.fcPartyOk(c) ? '' : ' disabled') + '>' + R(S.fcPartyPrice(c)) + '</button>') + '</div>' +
      '<div class="fc-ss"><h3>Carro</h3>' +
        S.FC_SHOP.cars.map((x, k) => { const at = S.fcCarAt(c), p = S.fcCarPrice(c, x.id);
          return row(x.name, x.fx + ' (+' + x.fame + ' de fama)' + (k === at ? ' · manutenção ' + R((c.life.mt && c.life.mt.car) || 0) + ' por semana' : k > at ? upTxt('car', x.id) : ''), k === at ? '<em class="fc-own-tag">Seu carro</em>' : k < at ? '<em class="fc-own-tag old">Abaixo do seu</em>' : btn('car', x.id, R(p), cash >= p && !debt), x.id); }).join('') +
      '</div>' +
      '<p class="fc-shop-note">Tudo daqui vale só nesta carreira. Os itens da coleção continuam só visuais.</p>';
    el.querySelectorAll('.fc-attr button').forEach(b => { b.onclick = () => { sfx('tap'); gearAttr = b.dataset.a; shopBox(); }; });
    if ($('fc-party')) $('fc-party').onclick = () => { if (S.fcParty(c)) { sfx('coin'); save(); bar(); shopBox(); } };
    el.querySelectorAll('.fc-buy[data-k]').forEach(b => { b.onclick = () => {
      if (S.fcBuy(c, b.dataset.k, b.dataset.id, gearAttr)) { sfx(b.dataset.k === 'staff' && !(c.staff && c.staff[b.dataset.id]) ? 'tap' : 'coin'); save(); bar(); shopBox(); weekBox(); }
    }; });
  }

  // Simula sem o ao vivo; para antes de jogo com lance decisivo (esse você joga) e nas datas de evento
  // Tipo do próximo jogo, numa linha acima do ingresso: vivido (e por quê), resumido ou no banco
  const WHY = { decisao: 'Decisão', mata: 'Mata-mata', continental: 'Noite continental', estreia: 'Estreia do ano', classico: 'Clássico', ultima: 'Última rodada',
    briga: 'Briga direta na tabela', topo: 'Contra um dos três primeiros', escolha: 'Você escolheu viver' };
  function kindTxt(c, nx, kind) {
    if (kind === 'vivo') return '<b>Jogo grande</b> · ' + WHY[S.fcBig(c, nx)] + ': você vive o jogo inteiro';
    if (kind === 'banco') return '<b>Você fica no banco</b> · acompanha o jogo de perto';
    if (kind === 'folga') return '<b>Folga</b> · seu time não joga nesta data';
    return '<b>Jogo da rodada</b> · você vive o jogo inteiro (ou resume, se quiser)';
  }
  // Jogo resumido, no banco ou folga: joga na hora e mostra um cartão só (placar, sua nota e um fato)
  function brief(nx) {
    const c = G.c, P = c.fc.pending, m = nx.lance;
    // O seu lance vem antes do resumo (no automático, ou se saiu no meio do minigame, a carta decide no fcPlay)
    if (m && P && !P.lDone && !m.started && U.cfg.moments !== 'auto') return lanceScreen(m, null, () => brief(nx));
    const en0 = c.fc.en, out = S.fcPlay(c);
    out.wk = weekGoals(nx, out);
    save(); bar(); sfx('whistle');
    const x = Object.assign({}, nx, { en0 });
    const go = () => (out.title ? celebrate(out, paintOrEnd) : paintOrEnd());
    render(briefCard(c, x, out, true) + '<button class="btn" id="fc-next">' + (G.c.fc.done ? 'Ver resumo da temporada' : 'Voltar ao celular') + '</button>');
    $('fc-next').onclick = go;
  }
  function briefCard(c, x, out, big) {
    const m = out.my || {}, kind = !x.vs ? 'folga' : m.on ? 'resumo' : 'banco';
    const res = !x.vs ? 'none' : x.knock ? (m.won ? 'win' : 'loss') : m.gf > m.ga ? 'win' : m.gf < m.ga ? 'loss' : 'draw';
    const [h1] = headline(c, x, m, res);
    const [gh, ga] = x.home ? [m.gf, m.ga] : [m.ga, m.gf];
    const line = kind === 'resumo' ? 'Nota <b>' + rate(m.rating) + '</b>' + (m.goals ? ' · ' + D.plural(m.goals, 'gol', 'gols') : '') + (m.assists ? ' · ' + D.plural(m.assists, 'assistência', 'assistências') : '') +
        ((c.pos === 'GOL' || c.pos === 'ZAG') && m.ga === 0 ? ' · sem sofrer gol' : '')
      : kind === 'banco' ? (x.injury ? esc(x.injury.charAt(0).toUpperCase() + x.injury.slice(1)) + ': você viu de fora.' : 'Você ficou no banco.') : 'Seu time folgou nesta data.';
    const sc = x.vs ? '<div class="fb-sc">' + crest(x.home ? c.club : x.vs, 'md') + '<b>' + gh + ' × ' + ga + '</b>' + crest(x.home ? x.vs : c.club, 'md') + '</div>' +
      '<div class="fb-tm"><span>' + esc(nameOf(x.home ? c.club : x.vs)) + '</span><span>' + esc(nameOf(x.home ? x.vs : c.club)) + '</span></div>' + (m.pens ? '<small class="fb-pen">decidido nos pênaltis</small>' : '') : '';
    return '<div class="eyebrow">' + esc(x.compName) + ' · ' + esc(x.stage) + '</div>' +
      (big ? '<h2 class="fb-h">' + (kind === 'resumo' ? 'Jogo resumido' : kind === 'banco' ? 'Do banco' : 'Folga') + '</h2>' : '') +
      '<div class="card fb ' + res + '">' + sc + '<p class="fb-me">' + line + '</p>' + (out.lance && m.on ? lanceLine(out.lance) : '') + (x.vs ? '<p class="fb-f">' + h1 + '</p>' : '') + fora(G.c) + '</div>' + wkLine(out.wk);
  }
  // O seu lance no cartão do jogo: o minuto e como terminou
  // Fora de campo: a notícia da semana (convite que virou público) no jornal ou no cartão do jogo
  function fora(c) { const n = S.fcNewsFor && S.fcNewsFor(c, 'j'); return n ? '<p class="jn-fora"><b>Fora de campo</b> ' + esc(n.j) + '</p>' : ''; }
  function lanceLine(l) {
    const st = S.kickSetupType(l), def = st === 'save' || st === 'saida' || st === 'bote' || (st === 'tackle' && !l.duel);
    const what = st === 'save' ? (l.ok ? 'pênalti defendido' : 'pênalti sofrido') : st === 'saida' ? (l.ok ? 'fechou o ângulo no mano a mano' : 'ele tirou de você e marcou') : def ? (l.ok ? 'desarme no contra-ataque' : 'o atacante passou e marcou') : l.duel ? (l.ok ? 'bola roubada na pressão' : 'perdeu a dividida') :
      st === 'pass' || st === 'passe3' ? (l.ok ? 'assistência na medida' : 'passe cortado') : st === 'mano' ? (l.ok ? 'passou pelo zagueiro e marcou' : 'perdeu o mano a mano') : st === 'cara' ? (l.ok ? 'gol no cara a cara' : 'perdeu o cara a cara') : st === 'dois' ? (l.ok ? (l.why === 'toque' ? 'tocou no 2 contra 1 e deu a assistência' : 'bateu no 2 contra 1 e marcou') : 'desperdiçou o 2 contra 1') : st === 'cabeca' ? (l.ok ? 'gol de cabeça' : 'perdeu a cabeçada') : (l.kick === 'fk' ? 'falta ' : 'pênalti ') + (l.ok ? 'convertido' : 'perdido');
    return '<p class="fb-l ' + (l.ok ? 'up' : 'down') + '">Seu lance aos ' + esc(l.minute) + "': " + what + '</p>';
  }
  // Resumir: passa os jogos comuns (semana automática, carta decidindo) até o próximo jogo grande, um evento ou o fim
  function skipTo() {
    const c = G.c, rows = [];
    let nx, title = null;
    for (let k = 0; k < 60; k++) {
      if (c.fc.wkDue) { S.fcWeek(c, k === 0 ? myPick() : undefined); unpick(); }
      nx = S.fcNext(c);
      const mw = S.fcWin && S.fcWin(c);
      if (!nx || (k > 0 && (S.fcKind(c, nx) === 'vivo' || S.fcEventDue(c) || (mw && mw.offers.length && !mw.seen)))) break;
      if (nx.moment) S.fcAutoMoment(c, nx.moment);
      const out = S.fcPlay(c);
      if (!out) break;
      out.wk = weekGoals(nx, out);
      rows.push([nx, out]);
      if (out.title) { title = out; break; }
    }
    sfx('whistle'); save(); bar();
    const me = rows.filter(([, o]) => o.my && o.my.on), rs = me.map(([, o]) => o.my.rating);
    const W = rows.filter(([n, o]) => o.my && (n.knock ? o.my.won : o.my.gf > o.my.ga)).length, E = rows.filter(([n, o]) => o.my && !n.knock && o.my.gf === o.my.ga).length;
    const li = ([n, o]) => { const m = o.my; if (!m) return '<li><span>' + esc(n.compName) + '</span><em>folga</em></li>';
      const [gh, ga] = n.home ? [m.gf, m.ga] : [m.ga, m.gf], r = n.knock ? (m.won ? 'win' : 'loss') : m.gf > m.ga ? 'win' : m.gf < m.ga ? 'loss' : 'draw';
      return '<li class="' + r + '"><span>' + esc(nameOf(n.home ? c.club : n.vs)) + ' <b>' + gh + ' × ' + ga + '</b> ' + esc(nameOf(n.home ? n.vs : c.club)) + '</span><em>' + (m.on ? rate(m.rating) : 'banco') + '</em></li>'; };
    render('<div class="eyebrow">Resumo · ' + year() + '</div><h2 class="fb-h">' + D.plural(rows.length, 'jogo resumido', 'jogos resumidos') + '</h2>' +
      '<div class="card fb-list"><p class="fb-me">' + W + 'V ' + E + 'E ' + (rows.length - W - E) + 'D' + (rs.length ? ' · sua nota média <b>' + rate(rs.reduce((a, b) => a + b, 0) / rs.length) + '</b>' : '') + '</p><ul>' + rows.map(li).join('') + '</ul></div>' + wkLine(rows.flatMap(([, o]) => o.wk || [])) +
      '<button class="btn" id="fc-next">' + (G.c.fc.done ? 'Ver resumo da temporada' : 'Voltar ao celular') + '</button>');
    $('fc-next').onclick = () => (title ? celebrate(title, paintOrEnd) : paintOrEnd());
  }
  // Metas da semana do perfil (ui/profile.js) andam a cada jogo jogado; volta as cumpridas agora (ou null)
  function weekGoals(nx, out) {
    if (!U.profileJajGame || !out || !out.my || !out.my.on) return null;
    const r = U.profileJajGame(G.c, out, (D.RIVALS[G.c.club] || []).includes(nx.vs));
    return r && r.done.length ? r.done : null;
  }
  const wkLine = done => (done || []).map(d => '<p class="pg-wk">' + U.emo('🎯', 'xs') + ' Meta da semana cumprida: ' + esc(d.t) + ' · <b>+' + d.xp + ' XP</b></p>').join('');
  const paintOrEnd = () => (G.c.fc.done ? finishSeason() : hub());

  // Joga o próximo: com lance decisivo, o jogo ao vivo para no minuto do lance, o minigame decide e o jogo segue dali
  // Minuto do lance já jogado neste jogo (0 se não houve): o ao vivo recomeça dali
  const doneMin = () => { const P = G.c.fc.pending; return P && P.mDone && P.m ? S.fcMinOf(P.m.minute) : P && P.lDone && P.l && P.lSeen ? S.fcMinOf(P.l.minute) : 0; };
  function start(nx) {
    if (doneMin()) return live({ from: doneMin() }); // lance já jogado (saiu e voltou ao jogo)
    const m = nx.moment || nx.lance;
    if (m) {
      // Lance decisivo ou o seu lance do jogo: no automático (ou saiu no meio do minigame) a carta decide
      if (m.started || U.cfg.moments === 'auto') { if (nx.moment) S.fcAutoMoment(G.c, m); else S.fcAutoLance(G.c, m); save(); eff = null; return live(); }
      save(); eff = null;
      return live({ stop: m });
    }
    eff = null;
    live();
  }

  // ---------- o seu lance do jogo (plano, fase 1) ----------
  // Todo jogo em que você entra tem um lance seu, no minuto em que acontece: um cartão com a situação, o que vale e os
  // dois estilos; o minigame decide e o jogo segue dali. sc: placar até o lance (no ao vivo); go: o que vem depois
  const LANCE_TXT = (m, c) => {
    const vs = D.do(nameOf(m.vs)), at = ' aos ' + m.minute + "'";
    if (m.kick === 'saida') return { title: 'Cara a cara com você!', text: (m.sit === 'bola' ? 'Bola nas costas da zaga' + at + ': o atacante ' + vs + ' sai sozinho.' : 'Contra-ataque ' + vs + at + ': o atacante vem livre.') + ' Saia do gol na hora certa.', stakes: 'Defendeu: nota sobe e o placar segura · Ele marcou: gol deles' };
    if (m.kick === 'save') return { title: 'Pênalti contra o seu time!', text: 'O batedor ' + vs + ' ajeita a bola' + at + '. É você contra ele.', stakes: 'Defendeu: nota sobe e o placar segura · Sofreu: gol deles' };
    if (c.pos === 'ZAG') return m.sit === 'bola' ? { title: 'Bola nas costas da zaga!', text: 'O atacante ' + vs + ' escapou' + at + ' e só você chega a tempo.', stakes: 'Desarmou: nota sobe e o perigo passa · Passou: gol deles' }
      : { title: 'Contra-ataque perigoso!', text: 'O atacante ' + vs + ' arrancou sozinho' + at + '. Você é o último homem.', stakes: 'Desarmou: nota sobe e o perigo passa · Passou: gol deles' };
    if (m.duel) return { title: 'Pressão na saída de bola!', text: 'O zagueiro ' + vs + ' sai jogando perto de você' + at + '. Roubar ali vale ouro.', stakes: 'Roubou: nota sobe · Perdeu: nota cai' };
    if (m.kick === 'pass') return { title: 'A bola é sua no meio-campo!', text: { diagonal: 'O atacante faz a diagonal nas costas da zaga' + at + '.', contra: 'Contra-ataque' + at + ': o atacante dispara pelo meio.', tabela: 'Tabela na entrada da área' + at + ': o atacante pede a bola.' }[m.sit] || 'O atacante pede a bola' + at + '.', stakes: 'Acertou: assistência sua · Errou: a zaga corta' };
    if (m.kick === 'passe3') return { title: 'Três opções na frente!', text: (m.sit === 'area' ? 'Você domina na entrada da área' + at + ' e três companheiros pedem a bola.' : 'Contra-ataque' + at + ': você conduz e três companheiros correm marcados.') + ' Um deles vai ficar livre.', stakes: 'Achou o livre: assistência sua · Errou: a zaga corta' };
    if (m.kick === 'cara') return { title: 'Cara a cara com o goleiro!', text: (m.sit === 'rebote' ? 'O rebote sobra limpo para você' + at + '.' : 'Lançamento nas costas da zaga' + at + ' e você sai sozinho.') + ' O goleiro ' + vs + ' vem fechando.', stakes: 'Fez: gol seu · Perdeu: a chance passa' };
    if (m.kick === 'dois') return { title: 'Dois contra um!', text: 'Contra-ataque' + at + ': você e um companheiro contra o último zagueiro ' + vs + '. Tocar ou bater?', stakes: 'Gol: seu, ou assistência se tocou · Errou: a chance passa' };
    if (m.kick === 'cabeca') return { title: m.sit === 'escanteio' ? 'Escanteio na área!' : 'Cruzamento na área!', text: (m.sit === 'escanteio' ? 'A bola vem do escanteio' + at + '.' : 'O lateral vai cruzar' + at + '.') + ' Seu marcador ' + vs + ' está colado.', stakes: 'Cabeceou no canto: gol seu · Perdeu: a zaga afasta' };
    if (m.kick === 'drible') return { title: 'Mano a mano com o zagueiro!', text: (m.sit === 'ponta' ? 'Você recebe aberto na ponta' + at + ' e corta para dentro.' : 'A bola sobra para você no meio' + at + ' e só o zagueiro ' + vs + ' está na frente.') + ' Passou por ele, sai na cara do gol.', stakes: 'Driblou: gol seu · Perdeu: a chance passa' };
    if (m.kick === 'fk') return { title: 'Falta na entrada da área!', text: 'A barreira ' + vs + ' se arma' + at + '. A bola é sua.', stakes: 'Converteu: gol seu · Errou: chance perdida' };
    return { title: 'Pênalti para você!', text: (m.sit === 'mao' ? 'Mão na área' + at + ' e o juiz aponta a marca.' : 'Derrubaram você na área' + at + ' e o juiz aponta a marca.'), stakes: 'Converteu: gol seu · Errou: chance perdida' };
  };
  const lanceBoard = (m, sc, mini) => '<div class="ob5-board' + (sc ? '' : ' no-score') + (mini ? ' mini' : '') + '">' + crest(m.home ? G.c.club : m.vs) + '<b class="ob5-g">' + (sc ? sc[0] : '') + '</b>' +
    '<span class="ob5-mid"><span class="ob5-min"><i aria-hidden="true"></i>' + m.minute + "'</span><small>" + esc(m.comp) + '</small></span>' +
    '<b class="ob5-g">' + (sc ? sc[1] : '') + '</b>' + crest(m.home ? m.vs : G.c.club) + '</div>';
  function lanceScreen(m, sc, go) {
    const c = G.c, st = S.kickSetupType(m), T = LANCE_TXT(m, c), k = S.kickSetup(c, st, S.autoStyle(c, st));
    render('<div class="eyebrow">Seu lance · ' + esc(m.comp) + '</div>' + lanceBoard(m, sc) +
      (sc ? U.LP.zoom(st, m.kick, 'Seu lance · ' + m.minute + "'") : '') + // no ao vivo, a câmera fecha na jogada
      '<div class="ob5-head"><h2>' + T.title + '</h2><p class="ob5-txt">' + esc(T.text) + '</p>' + U.lanceStakes(T.stakes) + '</div>' +
      '<p class="st-lead ob5-q">Como você vai ' + { cup: 'bater', classico: 'bater', save: 'defender', tackle: 'marcar', pass: 'passar', mano: 'passar por ele', pressao: 'pressionar', cara: 'encarar o goleiro', dois: 'decidir', cabeca: 'atacar a bola', passe3: 'passar', bote: 'marcar', saida: 'sair do gol' }[st] + '?</p>' + U.styleBtns(st, true) +
      '<div class="ob5-foot"><button class="btn ghost ob5-auto" id="fc-lauto">Deixar o jogo decidir<small>' + Math.round(k.chance * 100) + '% pela sua carta</small></button>' +
      '<button class="ob5-train mom-train" id="b-train">' + U.emo('🏟️', 'xs') + ' Treinar antes</button></div>');
    $('b-train').onclick = () => U.training(st);
    // No resumo (sem placar ao vivo) o cartão do jogo já conta como foi: segue direto
    const fin = (ok, why) => { c.fc.pending.lSeen = true; save(); if (sc) lanceEnd(m, ok, sc, go, why); else go(); };
    U.bindStyle(m, U.gateTrain(st, () => {
      m.started = true; save();
      render(lanceBoard(m, sc, true) + '<div id="kick"></div>');
      sfx('whistle');
      U.playMini($('kick'), st, (ok, why) => { if ($('kick')) fin(ok, why); }, null, null, m.style,
        (ok, why) => { if (!$('kick')) return; S.fcLance(c, m, ok, why); save(); }, { duel: !!m.duel });
    }));
    $('fc-lauto').onclick = () => fin(S.fcAutoLance(c, m));
  }
  // Resultado do lance: o grito, uma linha e voltar ao jogo
  function lanceEnd(m, ok, sc, go, why) {
    const c = G.c, st = S.kickSetupType(m), def = st === 'save' || st === 'saida' || st === 'bote' || (st === 'tackle' && !m.duel);
    const big = ok ? (st === 'save' || st === 'saida' ? 'DEFENDEU!' : st === 'tackle' || st === 'pressao' || (st === 'bote' && (!why || why === 'desarme')) ? 'ROUBOU!' : st === 'bote' ? (why === 'travou' ? 'TRAVOU!' : 'SALVOU!') : st === 'pass' || st === 'passe3' ? 'ASSISTÊNCIA!' : 'GOOOL!') : def ? 'Gol deles…' : st === 'tackle' || st === 'pressao' ? 'Escapou…' : st === 'pass' || st === 'passe3' ? 'Cortado…' : st === 'mano' ? 'Perdeu a bola…' : 'Não entrou…';
    const txt = ok ? (def ? 'O perigo passou e a nota sobe.' : m.duel ? 'Bola roubada no campo deles: a nota sobe.' : st === 'pass' || st === 'passe3' ? 'Bola na medida e o atacante não perdoou.' : st === 'mano' ? 'Passou pelo zagueiro e bateu no canto.' : st === 'cara' ? 'Frio na cara do goleiro.' : st === 'dois' ? (why === 'toque' ? 'Tocou na hora certa: gol do companheiro e assistência sua.' : 'Bateu na hora certa e marcou.') : st === 'cabeca' ? 'Subiu mais que o marcador e testou no canto.' : 'Gol seu' + (m.kick === 'fk' ? ' de falta.' : ' de pênalti.'))
      : def ? 'A bola entrou. Ainda dá tempo de reagir.' : m.duel ? 'Ele escapou: a nota cai um pouco.' : 'A chance passou. O jogo segue.';
    const side = ok && m.goal ? (m.home ? 0 : 1) : !ok && def ? (m.home ? 1 : 0) : -1; // gol seu (ou do atacante que você serviu) ou gol deles
    if (sc && side >= 0) { sc = sc.slice(); sc[side]++; }
    render('<div class="eyebrow">Seu lance · ' + esc(m.comp) + '</div>' + lanceBoard(m, sc) +
      '<div class="ob5-res ' + (ok ? 'ok' : 'ko') + '"><div class="mr-big">' + big + '</div><p class="mr-txt">' + txt + '</p></div>' +
      '<div class="lc-acts"><button class="btn" id="fc-lback">' + (sc ? 'Voltar ao jogo' : 'Ver o jogo') + '</button></div>');
    if (ok) U.vibe([40, 60, 40]);
    $('fc-lback').onclick = go;
  }
  // Depois do lance (ui/match.js chama): o jogo ao vivo continua do minuto do lance, com o resultado que ele decidiu
  function afterMoment() { live(doneMin() ? { from: doneMin() } : undefined); }

  // ---------- jogo ao vivo ----------
  // o.stop: lance decisivo ainda por jogar; o ao vivo roda até o minuto dele num ensaio (o jogo é desfeito em seguida;
  // os lances de antes não dependem do resultado) e abre o minigame. o.from: começa no minuto do lance, já decidido.
  function live(o) {
    o = o || {};
    const c = G.c;
    const nx = S.fcNext(c);
    if (!nx) return finishSeason();
    // Tabela antes do jogo (o ao vivo soma os placares parciais por cima dela)
    const en0 = c.fc.en;
    let out;
    if (o.stop) {
      const snap = JSON.stringify(c);
      out = S.fcPlay(c, true);
      const back = JSON.parse(snap); Object.keys(c).forEach(k => delete c[k]); Object.assign(c, back);
    } else { out = S.fcPlay(c); out.wk = weekGoals(nx, out); save(); }
    const stopAt = o.stop ? S.fcMinOf(o.stop.minute) : 0, t0 = o.from ? o.from - 1 : 0;
    matchView();
    const x = Object.assign({}, nx, { res: out.my, en0 });
    const lg = nx.e.k === 'lg', grp = nx.e.k === 'cont' && nx.e.st < 6;
    const idx = (ids, id) => ids.indexOf(id);
    // Jogos que mexem na tabela durante o ao vivo: [índice mandante, índice visitante, jogo]
    const games = [];
    if (lg) {
      if (out.mine) games.push([idx(c.fc.lg.ids, out.mine.h), idx(c.fc.lg.ids, out.mine.a), out.mine]);
      out.others.forEach(g => games.push([idx(c.fc.lg.ids, g.h), idx(c.fc.lg.ids, g.a), g]));
    } else if (grp) {
      const G4 = c.fc.cont.group, my = out.my;
      games.push([idx(G4, my.home ? c.club : my.vs), idx(G4, my.home ? my.vs : c.club), { ev: my.ev }]);
      out.others.forEach(g => games.push([idx(G4, g.h), idx(G4, g.a), g]));
    }
    const part = (g, t) => { let h = 0, a = 0; g.ev.forEach(e => { if (e.m <= t) { if (e.s === 'h') h++; else a++; } }); return [h, a]; };
    // O motor já somou o jogo na tabela: o ao vivo mostra a de antes mais os placares parciais
    const undo = lg ? 'lg' : grp ? 'cont' : null, view = undo === 'cont' ? 'cont' : 'lg';
    if (undo && !o.stop) games.forEach(([a, b, g]) => sub(undo === 'lg' ? c.fc.lg.tab : c.fc.cont.gtab, a, b, part(g, 99)));
    if (grp) tblView = 'cont'; else if (lg) tblView = 'lg';
    tblKey = null; tabs();
    const posBefore = lg ? standings('lg').findIndex(r => r.i === 0) + 1 : 0;
    x.score = t => (out.my ? part({ ev: out.my.ev }, t) : [0, 0]);
    const end = Math.max(90, ...[out.my].concat(out.others).filter(Boolean).map(g => (g.ev.length ? g.ev[g.ev.length - 1].m : 0)));
    const N = Math.max(95, end);
    let t = t0, half = false, timer = 0, nextTick = false, holdS = 0;
    $('fc-h').textContent = nx.compName + ' · ao vivo';
    const meSide = nx.home ? 'h' : 'a', meName = nameOf(c.club), opName = nameOf(x.vs);
    const fl = x.vs && out.my ? flowOf(c, x, out) : null, flSeen = new Set();
    const meIdx = fl && fl.on ? U.LP.meIndex(c.pos) : -1;
    const path = []; // onde você esteve a cada minuto (o mapa do intervalo)
    const nr = S.rng(((Number(c.tseed) || 1) * 17 + c.fc.i * 131 + 7) >>> 0); let lastNarr = t0;
    // A narração sai do que acontece no campinho (ui/livesim.js): passe que conta, drible, desarme, chute, defesa.
    // Uma linha a cada dois minutos no máximo (chute e defesa passam na frente), fora do minuto de gol e dos seus lances
    const POS = { GK: 'o goleiro', LB: 'o lateral', RB: 'o lateral', CB: 'o zagueiro', DM: 'o volante', CM: 'o meia', LM: 'o meia', RM: 'o meia', LW: 'o ponta', RW: 'o ponta', ST: 'o centroavante' };
    const nmP = k => (k === 'me' ? '<b class="lp-nm">' + esc(sobre(c)) + '</b>' : POS[k] || 'o jogador');
    const deP = k => (k === 'me' ? 'de <b class="lp-nm">' + esc(sobre(c)) + '</b>' : 'd' + (POS[k] || 'o jogador'));
    // Faixa clara, legenda e posse saem da bola do campinho (a cada quadro, só escreve o que mudou), do lado em que ela está na tela
    function zoneSim(i) {
      const b = $('lp-band'), z = $('lp-zone'), pe = $('lp-pos'); if (!z) return;
      const mine = i.side === 0, tm = mine ? meName : opName, lado = i.ay < 30 ? ' pela esquerda' : i.ay > 70 ? ' pela direita' : ' pelo meio';
      const txt = i.mode === 'goal' ? 'Gol!' : i.mode === 'falta' ? (i.why || 'Falta') : i.mode === 'ko' || i.mode === 'wait' || i.mode === 'half' ? 'Saída de bola' : i.mode === 'tiro' ? 'Tiro de meta ' + D.do(tm) :
        i.ax >= 67 ? tm + ' ataca' + lado : i.ax <= 33 ? tm + ' sai jogando' : tm + ' troca passes no meio';
      const play = i.mode === 'play';
      const bc = 'lp-band lpz ' + (i.sx < 100 / 3 ? 'l' : i.sx > 200 / 3 ? 'r' : 'c') + (play ? (mine ? ' me' : ' op') : ''), zc = 'lp-tag lp-zone' + (play ? (mine ? ' up' : ' down') : ''), pt = 'Posse ' + Math.round(i.posse * 100) + '%';
      if (b && b.className !== bc) b.className = bc;
      if (z.textContent !== txt) z.textContent = txt;
      if (z.className !== zc) z.className = zc;
      if (pe && pe.textContent !== pt) pe.textContent = pt;
    }
    function narrSim(k, d) {
      if (half || finished || (o.stop && t >= stopAt - 1) || lcPend.size) return;
      const big = k === 'defesa' || k === 'fora';
      if (t - lastNarr < (big ? 1 : 2) || (fl && fl.lances.some(l => Math.abs(l.m - t) <= 1)) || out.my.ev.some(e => Math.abs(e.m - t) <= 1)) return;
      const tm = esc(d.side ? opName : meName), how = d.how === 'cabeca' ? ' de cabeça' : d.how === 'fora' ? ' de fora da área' : '';
      const L = {
        costas: tm + ': lançamento nas costas da zaga para ' + nmP(d.b),
        inv: tm + ': ' + nmP(d.a) + ' inverte o jogo',
        longo: tm + ': bola longa ' + deP(d.a) + ' para ' + nmP(d.b),
        cruz: tm + ': ' + nmP(d.a) + ' cruza na área',
        drible: tm + ': ' + nmP(d.a) + ' passa pelo marcador',
        desarme: tm + ': ' + nmP(d.a) + ' desarma ' + (d.b === 'me' ? nmP(d.b) : nmP(d.b) + ' ' + esc(D.do(d.side ? meName : opName))),
        corte: tm + ': ' + nmP(d.a) + ' corta o passe',
        defesa: 'Defesa do goleiro ' + esc(D.do(d.side ? meName : opName)) + ' no chute ' + deP(d.a) + how,
        fora: tm + ': ' + nmP(d.a) + ' chuta' + how + ' e a bola sai'
      }[k];
      if (!L) return;
      lastNarr = t;
      const mine = d.a === 'me' || d.b === 'me';
      feed(t, L.replace(/: o /, ': O ').replace(/^o /, 'O '), mine ? 'me' + (k === 'desarme' && d.b === 'me' ? ' bad' : '') : '', mine && k !== 'fora' && !(k === 'desarme' && d.b === 'me') && d.side === 0);
    }
    // O minuto do seu lance decisivo (estrela grande na faixa)
    const bigM = o.stop ? stopAt : o.from || 0;
    const stars = () => (fl && fl.on ? fl.lances.filter(l => !(o.stop && l.m >= stopAt)).map(l => ({ m: l.m, down: !l.up })) : []).concat(bigM && (!o.stop || t >= stopAt) ? [{ m: bigM, big: true }] : []);
    if (x.vs) $('fc-match').innerHTML = sbLive(x); else $('fc-match').innerHTML = card('live', x, t);
    // Os jogadores que decidem (ui/livesim.js): o motor só diz quem está melhor e quando sai cada gol
    const lcPend = new Set(); // seus lances que o campinho ainda está jogando (a linha sai quando a jogada acontece)
    // A rede balançou no campinho: o placar vira já (não espera o fim do minuto)
    const onGoal = m => { if (nextTick && !finished && t === m - 1) { clearTimeout(timer); timer = setTimeout(tick, 120); } };
    const sim = fl && U.LP.sim ? U.LP.sim({ me: meIdx, num: numOf(c), t0, speed: () => (fast ? 3 : 1), onEv: (k, d) => narrSim(k, d), onFrame: i => zoneSim(i), onGoal, flip: !nx.home, home: nx.home ? 0 : 1, kits: U.LP.kits(U.LP.kitFor(meName, c.club), U.LP.kitFor(opName, x.vs), !!nx.home),
      seed: (Number(c.tseed) || 1) * 7 + c.fc.season * 101 + c.fc.i * 13 + t0,
      goals: out.my.ev.filter(e => (!o.stop || e.m < stopAt) && !(o.from && e.m === o.from)).map(e => ({ m: e.m, side: e.s === (nx.home ? 'h' : 'a') ? 0 : 1, me: !!e.me, as: !!e.as })) }) : null;
    const pitch = () => { if (!fl) return; $('fc-flow').innerHTML = flowBox(c, x, fl, meIdx); U.LP.resetTrail(); if (sim) sim.attach($('lp-cv')); };
    pitch();
    if (fl) fl.lances.forEach(l => { if (l.m <= t0) flSeen.add(l); });
    $('fc-nota').innerHTML = fl ? notaBox(fl) : '';
    $('fc-mecard').classList.toggle('off', !(fl && fl.on));
    // Energia descendo minuto a minuto e o esforço escolhido na hora (quem está em campo); senão, o quadro de sempre
    const onPitch = !!(out.my && out.my.on && c.fc.en !== undefined && out.en !== undefined), enBase = out.en || 0;
    if (!eff) eff = { lvl: 1, mins: [0, Math.max(0, t0), 0], drink: false };
    // Fôlego (S.fcStRate): sai da energia de antes do jogo e cai minuto a minuto; sem fôlego no 2º tempo, o técnico tira você
    const stR = S.FC_EFF.map((f, k) => S.fcStRate(c, k));
    if (eff.st === undefined) { eff.st = (x.en0 === undefined ? 100 : x.en0) - Math.max(0, t0) * stR[1]; eff.subAt = (out.my && out.my.subAt) || 0; }
    void enBase;
    const lvlOf = e => (e <= S.FC_ST.sub ? 'out' : e < S.FC_EN_LOW ? 'low' : 'ok');
    const enNow = () => Math.max(0, Math.min(100, Math.round(eff.st)));
    // Um minuto em campo: gasta o fôlego no esforço escolhido; acabou no 2º tempo (fora do lance que ainda vai vir), sai
    function drain(m) {
      if (!onPitch || eff.subAt || m > 90) return;
      eff.mins[eff.lvl]++; eff.st = Math.max(0, eff.st - stR[eff.lvl]);
      // Com amarelo, o esforço chama o segundo (o Tudo bem mais): vermelho na hora (S.fcLiveRed); a linha sai no frame
      const mc = out.my.meCard;
      if (!o.stop && mc && mc.yc && mc.yc < m && !mc.rc && Math.random() < S.FC_LIVE_2AM[eff.lvl]) {
        const n = fl && fl.on ? Math.max(4.5, Math.min(10, fl.nota[Math.min(m, 100)] + (fl.off || 0))) - (fl.off || 0) : out.my.rating;
        if (S.fcLiveRed(c, out, m, n)) { save(); return; }
      }
      if (!o.stop && m >= S.FC_ST.from && m <= 86 && eff.st <= S.FC_ST.sub) subOut(m);
    }
    function subOut(m) {
      const n = fl && fl.on ? Math.max(4.5, Math.min(10, fl.nota[Math.min(m, 100)] + (fl.off || 0))) : out.my.rating;
      S.fcSub(c, out, m, n - (fl && fl.on ? fl.off || 0 : 0)); // o esforço entra no fim (S.fcEffort) eff.subAt = m;
      if (fl) { fl.lances = fl.lances.filter(l => l.m <= m); for (let k = m + 1; k <= 100; k++) fl.nota[k] = fl.nota[m]; }
      if (sim) sim.sub();
      U.LP.banner('SUBSTITUIÇÃO', 'Você sai sem fôlego aos ' + m + "'", 'down');
      feed(m, '<b class="lp-nm">' + esc(sobre(c)) + '</b> sai sem fôlego. Nota final <b>' + rate(n) + '</b>', 'me bad');
      save(); effBox();
    }
    // Expulso no minuto m: sai do campinho (o motor já tirou os gols e a nota de depois), a energia para, o banner avisa
    function redOut(m) {
      if (!eff || eff.subAt) return;
      eff.subAt = m; eff.red = true;
      if (fl) { fl.lances = fl.lances.filter(l => l.m <= m); for (let k = m + 1; k <= 100; k++) fl.nota[k] = fl.nota[m]; }
      if (sim) sim.sub();
      U.LP.banner('EXPULSO', 'Fora do próximo jogo', 'down');
      sfx('whistle'); save(); effBox();
    }
    // Um cartão, falta ou impedimento do motor: o campinho apita e mostra; a linha sai depois (live) ou na hora (pulou)
    const cardSeen = new Set();
    function redMarks() {
      ['h', 'a'].forEach(sd => { const el = $('lp-rc-' + sd); if (el) el.innerHTML = '<i class="cd-r"></i>'.repeat([...cardSeen].filter(e => e.t === 'vermelho' && e.s === sd).length); });
    }
    function cardEv(e, live) {
      if (cardSeen.has(e)) return;
      const ours = e.s === meSide, who = ours ? meName : opName;
      if (e.me && eff && eff.subAt && !eff.red && e.m > eff.subAt) { cardSeen.add(e); return; } // já tinha saído sem fôlego
      const show = () => {
        if (cardSeen.has(e)) return; cardSeen.add(e);
        if (!$('fc-feed')) return;
        feed(e.m, cardTxt(c, e, who), 'cd ' + (ours ? 'us' : 'th') + (e.me ? ' me' : '') + (e.t === 'vermelho' && ours ? ' bad' : ''));
        redMarks();
        if (e.me && e.t === 'amarelo') { const cd = out.card || {}; U.LP.banner('CARTÃO AMARELO', cd.three ? 'Terceiro do ano: fora do próximo jogo' : cd.n === S.FC_CARD.ycMax - 1 ? 'Pendurado. E mais um hoje é expulsão' : 'Mais um hoje e é expulsão', 'down'); if (onPitch && eff) effBox(); }
        if (e.me && e.t === 'vermelho' && onPitch) redOut(e.m);
      };
      const R = { side: ours ? 0 : 1, pos: e.pos, kind: e.t, me: !!e.me, how: e.how };
      if (sim && live) sim.ref(R, show);
      else { if (sim && e.t === 'vermelho') sim.ref(Object.assign({ quiet: true }, R), null); show(); }
    }
    function effBox() {
      const e = enNow();
      if (eff.subAt && eff.red) { $('fc-wk').className = 'fc-wk fc-ef'; $('fc-wk').innerHTML = '<div class="fc-st"><span>Energia</span><div class="fc-en out"><i style="width:' + e + '%"></i></div><b class="out">' + e + '</b></div><p class="fc-ef-hint down"><i class="cd-r"></i> Expulso aos ' + eff.subAt + "'. Você está fora do próximo jogo.</p>"; return; }
      if (eff.subAt) { $('fc-wk').className = 'fc-wk fc-ef'; $('fc-wk').innerHTML = '<div class="fc-st"><span>Energia</span><div class="fc-en out"><i style="width:' + e + '%"></i></div><b class="out">' + e + '</b></div><p class="fc-ef-hint">Substituído aos ' + eff.subAt + "' · sem fôlego. Depois do jogo a energia volta a subir.</p>"; return; }
      const dp = S.fcDrinkPrice(c), canDrink = !eff.drink && half && (c.money || 0) >= dp;
      $('fc-wk').className = 'fc-wk fc-ef';
      $('fc-wk').innerHTML = '<div class="fc-st"><span>Energia</span><div class="fc-en ' + lvlOf(e) + '"><i style="width:' + e + '%"></i></div><b class="' + lvlOf(e) + '">' + e + '</b></div>' +
        '<div class="fc-ef-row"><span>Esforço</span><div class="seg fc-ef-seg">' + S.FC_EFF.map((f, k) => '<button data-e="' + k + '"' + (k === eff.lvl ? ' class="on"' : '') + '>' + f.name + '</button>').join('') + '</div></div>' +
        '<p class="fc-ef-hint">' + (booked() ? ['<i class="cd-y"></i> Com amarelo: poupar quase não arrisca o segundo.', '<i class="cd-y"></i> Com amarelo: cuidado nas divididas.', '<i class="cd-y"></i> Com amarelo, o Tudo arrisca o segundo e a expulsão.'] : ['Poupa energia, mas a nota cai um pouco.', 'Gasto normal de energia.', 'Nota sobe, mas o fôlego acaba antes: sem energia no 2º tempo, o técnico tira você.'])[eff.lvl] + '</p>' +
        (eff.drink ? '<p class="fc-ef-hint up">Energético tomado: +' + S.FC_DRINK_EN + ' de energia.</p>' : half ? '<button class="btn ghost fc-drink" id="fc-drink"' + (canDrink ? '' : ' disabled') + '>Energético pro 2º tempo · R$ ' + U.money(dp) + '<small>+' + S.FC_DRINK_EN + ' de energia' + ((c.money || 0) < dp ? ' · sem dinheiro' : '') + '</small></button>' : '');
      $('fc-wk').querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { sfx('tap'); eff.lvl = +b.dataset.e; effBox(); }; });
      if ($('fc-drink')) $('fc-drink').onclick = () => { if ((c.money || 0) < dp) return; sfx('coin'); eff.drink = true; eff.st = Math.min(100, eff.st + S.FC_DRINK_EN); effBox(); };
    }
    const booked = () => [...cardSeen].some(e => e.me && e.t === 'amarelo');
    // Só o número e a barra (a cada minuto), sem redesenhar os botões
    function effTick() {
      const e = enNow(), b = document.querySelector('.fc-ef .fc-st b'), m = document.querySelector('.fc-ef .fc-en');
      if (!b || !m) return;
      b.textContent = e; b.className = lvlOf(e); m.className = 'fc-en ' + lvlOf(e); m.firstChild.style.width = e + '%';
    }
    if (onPitch) effBox(); else weekBox(true);
    // Outros jogos da rodada (liga e grupo); na copa e no mata-mata, os outros confrontos da fase
    // Como na TV: o jogo do seu rival direto primeiro e um plantão com o último gol de fora (e o que ele faz com você)
    const rvI = lg ? rivalOf(standings('lg')) : -1, rvId = rvI >= 0 ? c.fc.lg.ids[rvI] : null;
    const ordK = out.others.map((g, k) => k).sort((a, b) => (out.others[b].h === rvId || out.others[b].a === rvId) - (out.others[a].h === rvId || out.others[a].a === rvId));
    $('fc-round').innerHTML = out.others.length ? '<div class="fs-rlbl">' + (lg ? 'Outros jogos da rodada' : grp ? 'O outro jogo do grupo' : 'Outros confrontos da fase') + '</div>' +
      ordK.map(k => { const g = out.others[k], rv = g.h === rvId || g.a === rvId;
        return '<div class="fs-rr' + ((out.bets || []).some(t => t.legs.some(l => l.h === g.h && l.a === g.a)) ? ' zb' : '') + (rv ? ' rv' : '') + '" data-k="' + k + '"><span>' + esc(nameOf(g.h)) + '</span>' + crest(g.h, 'xs') + '<b>0 × 0</b>' + crest(g.a, 'xs') + '<span>' + esc(nameOf(g.a)) + '</span></div>'; }).join('') : '';
    let myPos = 0;
    // Barra de baixo com a bola rolando: 1× ou 3× e pular (para o seu lance ou para o fim)
    function liveActs() {
      $('fc-acts').innerHTML = '<div class="lp-bar"><div class="seg lp-spd"><button id="fc-slow"' + (fast ? '' : ' class="on"') + '>1×</button><button id="fc-fast"' + (fast ? ' class="on"' : '') + '>3×</button></div>' +
        '<button class="btn lp-skip' + (o.stop ? ' gold' : '') + '" id="fc-skip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l7 7-7 7M13 5l7 7-7 7"/></svg>' + (o.stop ? 'Pular até o seu lance' : 'Pular para o fim') + '</button></div>';
      const spd = v => { fast = v; $('fc-slow').classList.toggle('on', !v); $('fc-fast').classList.toggle('on', v); };
      $('fc-slow').onclick = () => spd(false);
      $('fc-fast').onclick = () => spd(true);
      // Pulou: os minutos que passaram gastam o fôlego (e podem tirar você) antes de mostrar o que aconteceu
      const catchUp = to => { for (let m = t + 1; m <= to; m++) drain(m); };
      $('fc-skip').onclick = () => { clearTimeout(timer); nextTick = false; if (o.stop) { const t1 = t; catchUp(stopAt); t = stopAt; frame(t1); return pause(); } const t1 = t; catchUp(end); t = end; frame(t1); done(); };
    }
    // Parada (antes do jogo e no intervalo): um botão dourado segue; dá tempo de escolher o esforço e o energético
    function stopActs(id, label, sub, go) {
      $('fc-acts').innerHTML = '<button class="btn fc-kick" id="' + id + '">' + label + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
      $(id).onclick = () => { sfx('whistle'); go(); };
    }
    $('fc-match').scrollIntoView({ block: 'nearest' });
    const liveTab = () => ({ [view]: games.map(([a, b, g]) => [a, b].concat(part(g, t))) });
    // Antes do lance só entra o que veio antes do minuto dele
    const shown = e => !o.stop || e.m < stopAt;
    const tt = () => (o.stop ? Math.min(t, stopAt - 1) : t);
    function goalTxt(e) {
      const ours = e.s === meSide, who = ours ? meName : opName;
      return e.me ? 'GOL de <b>' + esc(sobre(c)) + '</b>!' : e.as ? 'Gol ' + esc(D.do(who)) + ', passe de <b>' + esc(sobre(c)) + '</b>' : 'Gol ' + esc(D.do(who));
    }
    // Um minuto na tela: placar, campinho, faixa, nota, narração, rodada e tabela. since: pulou de minuto (mostra só o que importa)
    function frame(since) {
      const lt = $('fc-lt'); if (lt) lt.textContent = (half ? 'Intervalo' : t >= end ? 'Fim' : clock(t));
      const T = tt();
      let myGoal = false;
      if (out.my && $('fc-sh')) {
        const [h, a] = x.score(T); $('fc-sh').textContent = h; $('fc-sa').textContent = a;
        out.my.ev.filter(e => (since !== undefined ? e.m > since && e.m <= t : e.m === t) && shown(e)).forEach(e => {
          const ours = e.s === meSide; myGoal = true;
          feed(e.m, goalTxt(e), 'gol ' + (ours ? 'us' : 'th') + (e.me || e.as ? ' me' : ''), e.me || e.as);
          sfx(U.goalSnd(ours, !!nx.home));
          if (since === undefined || e.m === t) {
            U.LP.banner(e.me ? 'GOL DE ' + esc(sobre(c)).toUpperCase() + '!' : 'GOL ' + esc(D.do(ours ? meName : opName)).toUpperCase() + (ours ? '!' : ''),
              e.me || e.as ? (e.m === o.from ? 'Seu lance decisivo' : e.as ? 'Assistência sua' : '') : '', ours ? (e.me || e.as ? 'gold' : 'up') : 'down');
            const sb = $('lp-sb'); if (sb) { sb.classList.remove('hot', 'cold'); void sb.offsetWidth; sb.classList.add(ours ? 'hot' : 'cold'); }
          }
        });
      }
      if (out.my && out.my.cards) out.my.cards.filter(e => (since !== undefined ? e.m > since && e.m <= t : e.m === t) && shown(e)).forEach(e => cardEv(e, since === undefined && e.m === t));
      if (fl && onPitch && eff) fl.off = eff.mins.reduce((a, m, k) => a + m * S.FC_EFF[k].r, 0) / 90;
      if (fl) lpAt(T, since);
      if ($('lp-strip') && fl) {
        $('lp-strip').innerHTML = U.LP.strip(fl.dom, T, N, stars(), 0);
        const w = U.LP.who(fl.dom, T, meName, opName), el = $('lp-who'); if (el) { el.textContent = w[0]; el.className = w[1]; }
      }
      let goal = false;
      let tv = null;
      document.querySelectorAll('#fc-round .fs-rr').forEach(el => {
        const g = out.others[+el.dataset.k], [h, a] = part(g, t);
        el.querySelector('b').textContent = h + ' × ' + a;
        el.classList.toggle('hot', g.ev.some(e => e.m <= t && e.m > t - 5));
        const e = g.ev.filter(e => (since !== undefined ? e.m > since : e.m === t) && e.m <= t).pop();
        if (e) { goal = true; if (!tv || e.m >= tv.e.m) tv = { e, g, h, a }; }
      });
      if (undo && (goal || t <= 1 || myGoal)) {
        const p = table(liveTab());
        if (tv) {
          const who = tv.e.s === 'h' ? tv.g.h : tv.g.a, mv = myPos && p !== myPos && lg ? '. Com isso, você ' + (p < myPos ? 'sobe' : 'cai') + ' para <b>' + p + 'º</b>' : '';
          plantao(clock(tv.e.m) + ' · Gol ' + esc(D.do(nameOf(who))) + (who === rvId ? ', seu rival' : '') + ': ' + esc(nameOf(tv.g.h)) + ' ' + tv.h + ' × ' + tv.a + ' ' + esc(nameOf(tv.g.a)) + mv);
        } else if (myGoal && lg && myPos && p !== myPos) plantao('Com o gol, você ' + (p < myPos ? 'sobe' : 'cai') + ' para <b>' + p + 'º</b>', 'TABELA');
        myPos = p;
      }
    }
    // O campinho e você no minuto T
    function lpAt(T, since) {
      const b = fl.bx[Math.min(T, 100)];
      let by;
      if (sim) {
        // A faixa "quem manda" e o fim de jogo usam o que o campinho mostrou no minuto que acabou (quem teve a bola e onde)
        const avg = sim.minute(T, b); sim.energy(onPitch ? enNow() : null);
        if (avg !== null && T > 0 && T <= 100) { fl.bx[T - 1] = Math.round(avg); fl.dom = U.LP.dom(fl.bx); }
        by = sim.ballAt()[1]; if (meIdx >= 0) path[T] = sim.meAt();
      } else {
        by = U.LP.ballY(T, b);
        const toMe = fl.on && (fl.lances.some(l => l.m === T) || (o.stop && T >= stopAt - 1) || (o.from && T === o.from));
        const sp = U.LP.spots(T, b, meIdx, toMe);
        U.LP.place(sp, meIdx);
        if (meIdx >= 0) path[T] = sp.us[meIdx];
      }
      const lado = by < 38 ? 'pela esquerda' : by > 62 ? 'pela direita' : 'pelo meio';
      if (!sim) U.LP.band(b, b >= 68 ? meName + ' ataca ' + lado : b <= 32 ? opName + ' ataca ' + lado : b >= 55 ? meName + ' no campo de ataque' : b <= 45 ? opName + ' no campo de ataque' : 'Disputa no meio-campo');
      let own = 0; for (let k = 0; k <= T && k <= 100; k++) if (fl.bx[k] >= 50) own++;
      const pe = $('lp-pos'); if (pe && !sim) pe.textContent = 'Posse ' + Math.round(own / (Math.min(T, 100) + 1) * 100) + '%';
      // Narração de fundo, de tempos em tempos (no minuto a minuto, não quando pulou)
      if (!sim && since === undefined && T - lastNarr >= 5 && nr() < 0.3 && !fl.lances.some(l => l.m === T) && !out.my.ev.some(e => e.m === T)) { lastNarr = T; feed(T, esc(narr(nr, b, by, meName, opName)), ''); }
      if (!fl.on) return;
      // A nota só mexe quando o lance acontece no campinho
      let pd = 0; lcPend.forEach(l => { pd += l.d; });
      const n = Math.max(4.5, Math.min(10, fl.nota[Math.min(T, 100)] - pd + (fl.off || 0)));
      $('fl-n').textContent = rate(n);
      $('fl-n').className = n >= 7 ? 'up' : n < 6 ? 'down' : '';
      fl.lances.filter(l => l.m <= T && !flSeen.has(l)).forEach(l => {
        flSeen.add(l);
        // Minuto a minuto: o campinho joga o lance (a bola chega em você e acontece o que o texto diz) e a linha sai junto
        if (sim && since === undefined && l.m === T && !GOALTXT[l.txt] && LACT[l.txt]) {
          lcPend.add(l);
          sim.lance(LACT[l.txt], () => { if (!lcPend.delete(l) || !$('fl-n')) return; showLance(l); const nn = Math.max(4.5, Math.min(10, fl.nota[Math.min(tt(), 100)] + (fl.off || 0))); $('fl-n').textContent = rate(nn); $('fl-n').className = nn >= 7 ? 'up' : nn < 6 ? 'down' : ''; });
          return;
        }
        showLance(l);
      });
      if (T > 0 && !fl.lances.some(l => l.m > T - 4 && l.m <= T)) $('fl-d').textContent = '';
    }
    function showLance(l) {
      {
        const dd = dTxt(l.d);
        $('fl-d').textContent = dd; $('fl-d').className = l.d > 0 ? 'up' : 'down';
        $('fl-last').textContent = l.txt;
        if (!GOALTXT[l.txt]) feed(l.m, '<b class="lp-nm">' + esc(sobre(c)) + '</b>: ' + esc(l.txt) + ' <em class="' + (l.up ? 'up' : 'down') + '">' + dd + '</em>', 'me' + (l.up ? '' : ' bad'), l.up);
        mine();
      }
    }
    // Seus lances (coluna da esquerda no computador; lista do fim de jogo)
    const dTxt = d => (Math.abs(d) < 0.05 ? '' : (d > 0 ? '▲ ' : '▼ ') + rate(Math.abs(d)));
    function mineList(upto) {
      const L = fl.lances.filter(l => l.m <= upto).map(l => ({ m: l.m, h: '<li><i>' + clock(l.m) + '</i><span>' + esc(l.txt) + '</span><em class="' + (l.d > 0 ? 'up' : 'down') + '">' + dTxt(l.d) + '</em></li>' }));
      // O lance decisivo (o minigame) entra na lista com o que ele deu
      if (o.from && o.from <= upto) {
        const e = out.my.ev.find(e => e.m === o.from && (e.me || e.as)), ag = out.my.ev.find(e => e.m === o.from && e.s !== meSide);
        L.push({ m: o.from, h: '<li class="big"><i>' + clock(o.from) + '</i><span>' + (e ? (e.me ? 'Gol seu' : 'Assistência sua') : ag ? 'Gol deles' : 'Não deu') + ' no seu lance decisivo</span><em></em></li>' });
      }
      return L.sort((a, b) => a.m - b.m).map(l => l.h).join('');
    }
    function mine() {
      const el = $('fc-mine'); if (!el || !fl || !fl.on) return;
      const li = mineList(tt());
      el.innerHTML = '<div class="lp-lbl">Seus lances</div>' + (li ? '<ul class="lp-ml">' + li + '</ul>' : '<p class="lp-wait">Nada ainda. A bola vai chegar.</p>') +
        (o.stop ? '<p class="lp-next">Seu lance decisivo ainda vai acontecer neste jogo.</p>' : '');
    }
    mine();
    function plantao(html, tag) {
      const el = $('fc-tv'); if (!el) return;
      el.hidden = false; el.innerHTML = '<span class="lp-tvk' + (tag ? ' tb' : '') + '">' + (tag || 'Plantão') + '</span><span>' + html + '</span>';
      el.classList.remove('new'); void el.offsetWidth; el.classList.add('new');
    }
    // Intervalo: o seu 1º tempo (números, onde você jogou) e a fala do técnico no lugar do campinho
    function halfView() {
      $('fc').classList.add('lp-hv');
      const [h, a] = x.score(45), diff = nx.home ? h - a : a - h;
      let body = '';
      if (fl && fl.on) {
        const s = statsAt(c, fl, 45, out.my.ev, meSide), pts = path.filter(Boolean);
        const ax = pts.length ? pts.reduce((q, p) => q + p[0], 0) / pts.length : 50;
        const where = c.pos === 'GOL' ? 'Firme no gol' : c.pos === 'ATA' && ax < 55 ? 'Longe da área' : ax > 62 ? 'Mais no ataque' : ax < 38 ? 'Mais na defesa' : 'Mais no meio';
        body = '<div class="lp-lbl">Seu 1º tempo</div>' + statBoxes([['Nota', rate(s.n), 1], ['Toques', s.toq], [s.al, s.a], [s.bl, s.b]]) +
          (pts.length > 5 ? '<div class="lp-lbl lp-whor"><span>Onde você jogou</span><span class="gold">' + where + '</span></div>' + U.LP.heat(pts) : '') +
          '<div class="lp-coach"><i aria-hidden="true">TC</i><div><small>O técnico, no vestiário</small><p>"' + esc(coachTalk(c, s.n, diff, ax)) + '"</p></div></div>';
      } else body = '<div class="lp-coach"><i aria-hidden="true">TC</i><div><small>O técnico, no vestiário</small><p>"' + (diff < 0 ? 'Estamos atrás. Fica pronto que eu posso precisar de você.' : diff > 0 ? 'Bom primeiro tempo. Agora é segurar.' : 'Jogo travado. Paciência.') + '"</p></div></div>';
      $('fc-flow').innerHTML = '<div class="lp-half">' + body + '</div>';
    }
    function tick() {
      if (!$('fc-match')) return; // saiu da tela: o jogo já está salvo
      if (t === 45 && !half) {
        // Intervalo: o jogo para; o energético só aparece aqui
        half = true; sfx('whistle'); frame(t); if (sim) sim.half(); // frame(t): não repete o gol do minuto 45 na lista
        if (fl) halfView();
        if (onPitch) effBox();
        return stopActs('fc-2t', 'Começar o 2º tempo', onPitch ? 'Escolha o esforço' + (eff.drink ? '' : ' e se toma o energético') : '', () => {
          $('fc').classList.remove('lp-hv'); pitch(); if (sim) sim.second(); liveActs(); timer = setTimeout(() => { if (onPitch) effBox(); tick(); }, 300); });
      }
      half = false; nextTick = false;
      // Gol no próximo minuto que o campinho ainda não fez: o relógio espera a jogada (depois de 5 s, bate de onde estiver)
      if (sim && sim.pending(t + 1) && holdS < 12) {
        holdS += 0.1 * (fast ? 3 : 1); if (holdS >= 5) sim.force(t + 1);
        nextTick = true; timer = setTimeout(tick, 100); return;
      }
      holdS = 0; t++;
      if (onPitch && t <= 90) { drain(t); effTick(); }
      frame();
      if (o.stop && t >= stopAt) return pause();
      if (t >= end) return done();
      nextTick = true; timer = setTimeout(tick, PACE[fast ? 1 : 0]);
    }
    // O jogo para no minuto do lance: o placar avisa, a bola chega em você e o minigame abre (ui/match.js)
    function pause() {
      clearTimeout(timer); nextTick = false;
      const jogo = o.stop.type === 'jogo', lt = $('fc-lt'); if (lt) lt.textContent = clock(stopAt);
      if (sim) { sim.lance(); setTimeout(() => sim.freeze(true), 1100); }
      else if (fl && fl.on) { U.LP.place(U.LP.spots(stopAt, fl.bx[Math.min(stopAt, 100)], meIdx, true), meIdx); }
      U.LP.banner(jogo ? 'SEU LANCE' : 'LANCE DECISIVO', clock(stopAt), 'gold');
      $('fc-acts').innerHTML = '';
      sfx('whistle');
      const sc = x.score(stopAt - 1), m = o.stop;
      timer = setTimeout(() => { if ($('fc-match')) (jogo ? lanceScreen(m, sc, () => live({ from: stopAt })) : U.momentIntro(o.stop)); }, 1600);
    }
    let finished = false, stEnd = null;
    function done() {
      if (finished) return; finished = true;
      clearTimeout(timer); if (sim) sim.stop();
      // Esforço: os minutos que faltaram (pulou para o fim) contam no nível escolhido; a energia e a nota fecham no motor
      if (onPitch) { stEnd = enNow(); if (!eff.subAt) eff.mins[eff.lvl] += Math.max(0, 90 - eff.mins.reduce((a, b) => a + b, 0)); S.fcEffort(c, out, eff.mins, eff.drink); eff = null; save(); }
      // A tabela volta a ter o jogo somado
      if (undo) games.forEach(([a, b, g]) => add(undo === 'lg' ? c.fc.lg.tab : c.fc.cont.gtab, a, b, part(g, 99)));
      sfx('whistle');
      if (!x.vs || !out.my) return result(x, out);
      endView();
    }
    // Fim de jogo: a faixa inteira com as suas estrelas, a sua partida, os seus lances e o que mudou na tabela; depois, o jornal
    function endView() {
      const m = out.my, root = $('fc');
      root.classList.add('lp-end');
      const mf = m.gf, mg = m.ga, res = x.knock ? (m.won ? 'win' : 'loss') : mf > mg ? 'win' : mf < mg ? 'loss' : 'draw';
      const lt = $('fc-lt'); if (lt) { lt.textContent = res === 'win' ? 'Vitória' : res === 'loss' ? 'Derrota' : 'Empate'; lt.className = 'lp-min ' + res; }
      const lbl = document.querySelector('.lp-whor span'); if (lbl) lbl.textContent = 'O jogo inteiro';
      if (fl) { const av = fl.dom.slice(0, end + 1).reduce((a, v) => a + v, 0) / (end + 1), w = $('lp-who');
        if (w) { w.textContent = av > 4 ? meName + ' mandou mais' : av < -4 ? opName + ' mandou mais' : 'Jogo equilibrado'; w.className = av > 4 ? 'up' : av < -4 ? 'down' : ''; } }
      let body = '';
      if (fl && fl.on) {
        const gk = c.pos === 'GOL' || c.pos === 'ZAG';
        body = '<div class="lp-lbl">Sua partida</div>' + statBoxes([['Nota', rate(m.rating), 1], gk ? ['Defesas', m.saves || 0] : ['Gols', m.goals || 0], gk ? ['Desarmes', m.tackles || 0] : ['Assist.', m.assists || 0], ['Energia', (stEnd !== null ? stEnd + ' → ' : '') + Math.round(c.fc.en === undefined ? 100 : c.fc.en)]]);
        const li = mineList(99);
        if (li) body += '<div class="lp-lbl">Seus lances</div><ul class="lp-ml">' + li + '</ul>';
      } else body = '<p class="lp-off">' + (x.injury ? 'Você ficou fora, lesionado.' : 'Você não entrou em campo.') + '</p>';
      // Faltas, impedimentos e cartões dos dois times (o seu primeiro) e o cartão que pesa no próximo jogo
      if (m.fo) {
        const o2 = meSide === 'h' ? 'a' : 'h', pr = k => m[k][meSide] + ' · ' + m[k][o2];
        body += '<div class="lp-cst"><span>Faltas <b>' + pr('fo') + '</b></span><span>Impedimentos <b>' + pr('of') + '</b></span><span>Cartões <b><i class="cd-y"></i>' + pr('yc') + (m.rc.h + m.rc.a ? ' <i class="cd-r"></i>' + pr('rc') : '') + '</b></span></div>';
        const cd = out.card;
        if (cd) body += '<p class="lp-sus ' + (cd.sus ? 'out' : 'pend') + '">' + (cd.sus ? '<b>Suspenso</b> ' + (cd.rc ? 'Cartão vermelho' : 'Terceiro amarelo') + ': você fica fora do próximo jogo.' : cd.n === S.FC_CARD.ycMax - 1 ? '<b>Pendurado</b> ' + cd.n + ' amarelos no ano. O próximo te tira de um jogo.' : '<b>Amarelo</b> ' + cd.n + ' no ano. No ' + S.FC_CARD.ycMax + 'º, um jogo de suspensão.') + '</p>';
      }
      $('fc-flow').innerHTML = '<div class="lp-endb">' + body + '</div>';
      if (lg) {
        const p = standings('lg').findIndex(r => r.i === 0) + 1;
        plantao(p < posBefore ? 'Você sobe para <b>' + p + 'º</b>.' : p > posBefore ? 'Você cai para <b>' + p + 'º</b>.' : 'Você segue em <b>' + p + 'º</b>.', 'TABELA');
        table();
      }
      $('fc-acts').innerHTML = '<button class="btn fc-kick" id="fc-jn">Ver o jornal</button>';
      $('fc-jn').onclick = () => { sfx('tap'); result(x, out); };
    }
    // Antes do apito: o jogo começa no botão (o esforço já pode ser escolhido); voltando ao lance, segue direto
    // Voltando do lance (do minuto dele): a tabela entra já com os placares parciais (senão ficava vazia até o próximo gol)
    if (o.from) { if (undo) { myPos = table(liveTab()); } frame(0); liveActs(); sfx('whistle'); timer = setTimeout(tick, 400); }
    else {
      const lt = $('fc-lt'); if (lt) lt.textContent = 'Antes do jogo';
      if (fl) lpAt(0);
      if ($('lp-strip') && fl) $('lp-strip').innerHTML = U.LP.strip(fl.dom, 0, N, [], 0);
      stopActs('fc-kick', 'Começar o jogo', onPitch ? 'Escolha o esforço antes do apito' : '', () => { if (sim) sim.go(); liveActs(); timer = setTimeout(tick, 300); });
    }
  }
  const sub = (tab, a, b, [gh, ga]) => {
    const A = tab[a], B = tab[b];
    A.j--; B.j--; A.gp -= gh; A.gc -= ga; B.gp -= ga; B.gc -= gh;
    if (gh > ga) { A.p -= 3; A.v--; B.d--; } else if (gh < ga) { B.p -= 3; B.v--; A.d--; } else { A.p--; B.p--; A.e--; B.e--; }
  };
  const add = (tab, a, b, [gh, ga]) => {
    const A = tab[a], B = tab[b];
    A.j++; B.j++; A.gp += gh; A.gc += ga; B.gp += ga; B.gc += gh;
    if (gh > ga) { A.p += 3; A.v++; B.d++; } else if (gh < ga) { B.p += 3; B.v++; A.d++; } else { A.p++; B.p++; A.e++; B.e++; }
  };

  // Resultado: a capa do jornal do dia seguinte, com a manchete sobre você, o boletim e os outros jogos
  const goalsOf = g => g.ev.reduce((o, e) => { o[e.s === 'h' ? 0 : 1]++; return o; }, [0, 0]);
  function headline(c, x, m, out) {
    const sn = esc(c.name.trim().split(/\s+/).pop()), me = esc(nameOf(c.club)), vs = esc(nameOf(x.vs));
    if (!x.vs) return [me + ' folga e vê os rivais', 'Sem jogo nesta rodada.'];
    const won = out === 'win', lost = out === 'loss', def = c.pos === 'GOL' || c.pos === 'ZAG';
    const nota = m.on ? ' Nota ' + rate(m.rating) + '.' : '';
    if (!m.on) return [(won ? me + ' vence ' + vs + ' sem ' + sn : lost ? 'Sem ' + sn + ', ' + me + ' perde para ' + vs : me + ' e ' + vs + ' empatam, com ' + sn + ' fora'), x.injury ? 'Lesionado, ele viu o jogo de fora.' : 'Ele não entrou em campo.'];
    if (m.goals >= 2) return [sn + ' marca ' + (m.goals === 2 ? 'dois' : m.goals) + (won ? ' e decide' : lost ? ', mas não evita a derrota' : ' e garante o empate'), 'Contra ' + vs + ', pela ' + esc(x.compName) + '.' + nota];
    if (m.goals === 1) return [(won ? 'Gol de ' + sn + ' e vitória sobre ' + vs : lost ? sn + ' marca, mas ' + me + ' perde' : 'Gol de ' + sn + ' segura o empate'), (m.assists ? 'Ainda deu uma assistência.' : 'Partida contra ' + vs + '.') + nota];
    if (m.assists) return [(won ? 'Passe de ' + sn + ' abre caminho para a vitória' : 'Passe de ' + sn + ' não basta para ' + me), 'Contra ' + vs + '.' + nota];
    if (def && won && m.ga === 0) return [sn + ' fecha a porta e ' + me + ' vence', 'Sem sofrer gol contra ' + vs + '.' + nota];
    if (m.rating >= 7.5) return [(won ? sn + ' brilha na vitória sobre ' + vs : sn + ' é o melhor em campo, mas não basta'), 'Atuação de destaque.' + nota];
    if (m.rating < 6) return [(lost ? 'Noite ruim: ' + me + ' perde e ' + sn + ' some' : sn + ' passa em branco contra ' + vs), 'Partida para esquecer.' + nota];
    return [(won ? me + ' vence ' + vs : lost ? me + ' perde para ' + vs : me + ' e ' + vs + ' empatam'), sn + ' jogou os 90 minutos.' + nota];
  }
  function result(x, out) {
    bar(); // gols, assistências e taças do topo já contam este jogo
    const c = G.c, fc = c.fc, m = out.my || {};
    const res = !x.vs ? 'none' : x.knock ? (m.won ? 'win' : 'loss') : m.gf > m.ga ? 'win' : m.gf < m.ga ? 'loss' : 'draw';
    const [h1, h2] = headline(c, x, m, res);
    const [gh, ga] = x.home ? [m.gf, m.ga] : [m.ga, m.gf];
    const lgPos = standings('lg').findIndex(r => r.i === 0) + 1;
    const ev = (m.ev || []).map(e => '<li><b>' + clock(e.m) + '</b> ' + (e.me ? esc(c.name) : e.as ? 'gol, passe de ' + esc(c.name) : esc(nameOf(e.s === 'h' ? (x.home ? c.club : x.vs) : (x.home ? x.vs : c.club)))) + '</li>').join('');
    const row = (k, v, cls) => '<div><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
    const en1 = Math.round(fc.en === undefined ? 100 : fc.en), en0 = Math.round(x.en0 === undefined ? en1 : x.en0);
    const others = out.others.slice(0, 6).map(g => { const [a, b] = goalsOf(g); return '<span>' + esc(nameOf(g.h)) + ' ' + a + ' × ' + b + ' ' + esc(nameOf(g.a)) + '</span>'; }).join('');
    const fx = out.fix && !out.fix.off ? (out.fix.caught ? '<p class="jn-fix"><b>Escândalo: ' + esc(c.name) + ' combinou cartão com apostador.</b> Mensagens vazaram, o amarelo aos ' + out.fix.min + "' estava acertado. Suspensão de " + S.FC_FIX_BAN + ' jogos, e a torcida pede explicações.</p>' :
      '<p class="jn-ze">Amarelo aos ' + out.fix.min + "', como combinado. R$ " + U.money(out.fix.pay) + ' na conta, e ninguém percebeu. <i>— Zé</i></p>') : out.fix && out.fix.off ? '<p class="jn-ze">Você não entrou em campo: o combinado caiu. <i>— Zé</i></p>' : '';
    // Apostas da rodada: bilhete do Zé fora do jornal, com carimbo e o saldo em destaque
    const tk = [];
    (out.bets || []).forEach(t => tk.push({ what: t.legs.length === 1 ? nameOf(t.legs[0].h) + ' ' + t.legs[0].gh + ' × ' + t.legs[0].ga + ' ' + nameOf(t.legs[0].a) : 'Múltipla de ' + t.legs.length,
      how: t.legs.length === 1 ? legTxt(t.legs[0]) : t.legs.filter(l => l.win).length + ' de ' + t.legs.length + ' acertos', win: t.win, net: t.win ? t.pay - t.stake : -t.stake }));
    if (out.bicho) out.bicho.bets.forEach(b => tk.push({ what: 'Bicho: ' + S.BICHOS[b.g], how: 'deu ' + S.BICHOS[out.bicho.head] + ' na cabeça', win: b.win, net: b.win ? b.back - b.stake : -b.stake }));
    const net = tk.reduce((a, t) => a + t.net, 0), sgnR = v => (v >= 0 ? '+R$ ' : '−R$ ') + U.money(Math.abs(v));
    const zeCard = tk.length ? '<section class="zb-res ' + (net > 0 ? 'win' : 'loss') + '"><header><b>Apostas da rodada</b><span>com o Zé</span></header>' +
      tk.map(t => '<div class="zb-tk ' + (t.win ? 'win' : 'loss') + '"><span><b>' + esc(t.what) + '</b><small>' + esc(t.how) + '</small></span><i>' + (t.win ? 'Pagou' : 'Perdeu') + '</i><em>' + sgnR(t.net) + '</em></div>').join('') +
      '<div class="zb-net"><span>Saldo da rodada</span><b>' + sgnR(net) + '</b></div>' +
      (out.betCaught ? '<p class="zb-caught">A federação descobriu: ' + S.FC_BET_BAN + ' jogos de suspensão.</p>' : '') + '</section>' : '';
    const done = G.c.fc.done;
    render('<div class="jn-w"><article class="jn">' +
      '<header><h1>Diário da Rodada</h1><p><span>nº ' + (fc.i) + '</span><span>' + esc(x.compName) + ' · ' + year() + '</span><span>R$ 3,00</span></p></header>' +
      '<h2>' + h1 + '</h2><p class="jn-sub">' + h2 + '</p>' +
      '<div class="jn-g">' + (x.vs ? '<div class="jn-sc"><div class="jn-bd"><span>' + esc(nameOf(x.home ? c.club : x.vs)) + '</span><b>' + gh + ' × ' + ga + '</b><span>' + esc(nameOf(x.home ? x.vs : c.club)) + '</span></div>' +
          (m.pens ? '<small>decidido nos pênaltis</small>' : '') + (ev ? '<ul>' + ev + '</ul>' : '<small>Sem gols.</small>') + '</div>' : '<div class="jn-sc"><small>Folga.</small></div>') +
        '<div class="jn-bt"><b>Boletim do atleta</b>' +
          (m.on ? row('Nota', rate(m.rating)) + (c.pos === 'GOL' || c.pos === 'ZAG' ? row('Sem sofrer gol', m.ga === 0 ? 'sim' : 'não') : row('Gols', m.goals || 0)) + row('Assistências', m.assists || 0) : row('Em campo', 'não')) +
          row('Energia', en0 + ' → ' + en1, en1 < en0 ? 'down' : 'up') + row('Forma', formTxt(fc.fo || 0).toLowerCase()) +
          (out.pe ? row('Evolução', '+' + num1(out.pe), 'up') : '') +
          (out.gear ? row(c.pos === 'GOL' ? 'Luvas' : 'Chuteira', out.gear.left > 0 ? out.gear.left + (out.gear.left === 1 ? ' jogo' : ' jogos') : 'rasgou', out.gear.left <= 5 ? 'down' : '') : '') + '</div></div>' +
      (others ? '<div class="jn-o"><b>Os outros jogos</b><div>' + others + '</div></div>' : '') +
      '<div class="jn-f">' + fora(c) + '<p>' + esc(nameOf(c.club)) + ' está em ' + lgPos + 'º na ' + esc(fc.lg.name) + ', com ' + fc.lg.tab[0].p + (fc.lg.tab[0].p === 1 ? ' ponto.' : ' pontos.') + '</p>' + natLine(c) + fx + '</div>' +
      '</article>' + (m.on ? progStrip(c, out, m) : '') + zeCard + '<button class="btn" id="fc-next">' + (done ? 'Ver resumo da temporada' : 'Voltar ao celular') + '</button></div>');
    // As barras enchem do valor de antes do jogo até o de agora
    setTimeout(() => document.querySelectorAll('.pg-b u').forEach(u => { u.style.width = u.dataset.w + '%'; }), 350);
    if (tk.length) setTimeout(() => sfx(net > 0 ? 'coin' : 'tap'), 500);
    const trip = { gf: m.gf, ga: m.ga, pens: m.pens, res };
    $('fc-next').onclick = () => (out.title ? celebrate(out, () => flyBack(x, trip)) : flyBack(x, trip));
  }
  // Faixa de progresso (plano, fase 1) depois de cada jogo vivido: o que subiu neste jogo e quanto falta para as metas do
  // ano: a meta da posição, a evolução do ano e a linha da tabela mais perto (título, acesso ou G4, sair da zona)
  function progStrip(c, out, m) {
    const fc = c.fc, mt = S.fcMeta(c), rows = [];
    const bar = (lbl, have, n, add, txt) => {
      const p0 = Math.min(100, Math.round((have - add) / n * 100)), p1 = Math.min(100, Math.round(have / n * 100));
      return '<div class="pg-r' + (have >= n ? ' done' : '') + '"><div class="pg-t"><span>' + lbl + '</span><b>' + txt + (add > 0 ? ' <i>+' + (add % 1 ? num1(add) : add) + '</i>' : '') + '</b></div>' +
        '<div class="pg-b"><u style="width:' + p0 + '%" data-w="' + p1 + '"></u></div></div>';
    };
    if (mt) {
      const add = mt.k === 'goals' ? m.goals || 0 : mt.k === 'assists' ? m.assists || 0 : m.ga === 0 ? 1 : 0;
      const nm = { goals: ['gol', 'gols'], assists: ['assistência', 'assistências'], cs: ['jogo sem sofrer gol', 'jogos sem sofrer gol'] }[mt.k];
      rows.push(bar('Meta do ano', mt.have, mt.n, add, mt.have >= mt.n ? D.plural(mt.have, nm[0], nm[1]) + ': batida!' : mt.have + ' de ' + D.plural(mt.n, nm[0], nm[1])));
    }
    const py = S.fcPeYear(c);
    rows.push(bar('Evolução do ano', py, S.PE_CAP, out.pe || 0, py >= S.PE_CAP ? 'no limite do ano' : num1(py) + ' de ' + S.PE_CAP));
    const tb = tableGap(c);
    return '<section class="pg"><div class="eyebrow">Seu ano</div>' + rows.join('') + (tb ? '<p class="pg-tb">' + tb + '</p>' : '') + wkLine(out.wk) + '</section>';
  }
  // A linha da tabela mais perto de você, em pontos
  function tableGap(c) {
    const fc = c.fc, rows = standings('lg'), n = rows.length, me = rows.findIndex(x => x.i === 0);
    if (me < 0 || !rows[me].j) return '';
    const pts = rows[me].p, pos = me + 1, top = fc.lg.promo || 4, name = fc.lg.promo ? 'o acesso' : 'o G4', zone = fc.lg.releg ? n - fc.lg.releg : n;
    const dif = k => Math.max(0, rows[k - 1].p - pts); // pontos até a posição k
    const pp = v => D.plural(v, 'ponto', 'pontos');
    if (pos === 1) { const d = pts - rows[1].p; return d > 0 ? 'Líder, ' + pp(d) + ' à frente do 2º.' : 'Líder, empatado em pontos com o 2º.'; }
    if (pos > zone) return pos + 'º, na zona: ' + pp(dif(zone) + 1) + ' para sair.';
    if (pos > top) return pos + 'º: ' + pp(dif(top)) + ' para ' + name + '.';
    return pos + 'º: ' + pp(dif(1)) + ' para a liderança.';
  }
  const flyBack = (x, r) => (G.c.fc.done || !x.vs ? paintOrEnd() : fly(x, true, paintOrEnd, r));
  // Viagem entre o celular e o jogo: avião para jogo fora, ônibus para jogo em casa. Um cartão de largura fixa com a rota
  // de onde o time sai até onde vai (escudos ou ícones), o veículo cruzando a rota e o que está em jogo; na volta, o placar.
  // A rota tem a mesma largura em qualquer tela, então a velocidade não muda do celular para o monitor. A tela troca por baixo.
  function fly(x, back, next, r) {
    if (U.cfg.fast || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return next();
    const c = G.c, away = !x.home, them = esc(nameOf(x.vs)), me = esc(nameOf(c.club));
    const end = (img, lbl) => '<span class="fl-end">' + img + '<small>' + lbl + '</small></span>';
    const mine = end(crest(c.club, 'md'), me), theirs = end(crest(x.vs, 'md'), them);
    const stad = end(U.emo('🏟️', 'md'), 'Estádio'), ct = end(U.emo('🏨', 'md'), 'Hotel');
    const [a, b] = away ? (back ? [theirs, mine] : [mine, theirs]) : back ? [stad, end(U.emo('🏠', 'md'), 'Casa')] : [ct, stad];
    let h, s;
    if (!back) {
      h = away ? 'Viagem até a casa do ' + them : 'Rumo ao estádio';
      s = away ? 'Estádio deles, torcida contra.' : 'Casa cheia contra o ' + them + '.';
    } else {
      h = away ? 'Voltando para casa' : 'Hora de ir para casa';
      s = r && r.gf != null ? (r.res === 'win' ? 'Vitória por ' : r.res === 'loss' ? 'Derrota por ' : 'Empate em ') + r.gf + ' × ' + r.ga + (r.pens ? ' e pênaltis' : '') +
        (r.res === 'win' ? ' na bagagem.' : r.res === 'loss' ? '. Cabeça no próximo.' : '.') : '';
    }
    const el = document.createElement('div');
    el.className = 'fc-fly' + (back ? ' back' : '') + (away ? ' air' : ' bus') + (r && r.res ? ' ' + r.res : '');
    el.innerHTML = '<div class="fl-card"><div class="eyebrow">' + (back ? 'Fim de jogo' : esc(x.compName) + ' · jogo ' + (c.fc.i + 1)) + '</div>' +
      '<div class="fl-route">' + a + '<div class="fl-track"><i class="fl-path"></i><i class="fl-done"></i><div class="fl-v">' + U.emo(away ? '✈️' : '🚌', 'lg') + '</div></div>' + b + '</div>' +
      '<h3>' + h + '</h3>' + (s ? '<p>' + s + '</p>' : '') + '</div>';
    document.body.appendChild(el);
    sfx('whoosh');
    setTimeout(next, 750);
    setTimeout(() => el.classList.add('out'), 1750);
    setTimeout(() => el.remove(), 2150);
  }
  // Taça ganha: tela curta de festa
  function celebrate(out, next) {
    sfx('fanfare');
    render('<div class="fc-cup"><div class="eyebrow">Campeão</div>' + U.trophy(U.titleType(out.title), 120, out.title.name) + '<h2>' + esc(out.title.name) + '</h2>' +
      '<p>' + esc(nameOf(G.c.club)) + ' levanta a taça.' + (out.my && out.my.on ? ' Você estava em campo.' : '') + '</p><button class="btn" id="fc-go">Seguir</button></div>', { center: true });
    $('fc-go').onclick = next;
  }

  // ---------- evoluir no meio da temporada ----------
  function evolve() {
    const c = G.c, E = S.eff(c);
    const rows = D.INVEST.filter(t => (c.inv[t.id] || 0) < S.investMax(t.id) && !S.investCapped(c, t.id));
    appScr('evo', 'Evoluir', '' +
      '<p class="fc-sub">Você tem <b>' + (c.pe || 0) + '</b> ' + ((c.pe || 0) === 1 ? 'ponto' : 'pontos') + '. O que você compra agora já vale no próximo jogo.</p>' +
      '<div class="fc-inv">' + rows.map(t => { const p = S.investPrice(c, t.id), ok = S.canInvest(c, t.id), at = t.attr ? Object.keys(t.attr)[0] : null;
        return '<button class="fc-iv' + (ok ? '' : ' off') + '" data-id="' + t.id + '"' + (ok ? '' : ' disabled') + '><span><b>' + esc(t.name) + '</b><small>' + (at ? esc(D.ATTR_LABEL[at]) + ' ' + Math.round(E[at]) + ' → ' + Math.round(E[at] + t.attr[at]) : 'Menos lesão') + '</small></span><em>' + p + (p === 1 ? ' ponto' : ' pontos') + '</em></button>'; }).join('') + '</div>');
    document.querySelectorAll('.fc-iv:not(.off)').forEach(b => { b.onclick = () => { if (S.invest(c, b.dataset.id)) { sfx('levelup'); save(); bar(); evolve(); } }; });
  }

  // ---------- fim do calendário ----------
  function finishSeason() {
    G.c.fcMetaEnd = S.fcMeta(G.c); // a meta do ano, para o XP da temporada (ui/profile.js)
    if (!G.c.fc.done) S.fcFinish(G.c);
    save();
    U.season();
  }

  Object.assign(U, { fcHub: hub, fcAfterMoment: afterMoment, fcFly: fly });
})();
