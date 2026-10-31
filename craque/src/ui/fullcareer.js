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
  const PACE = [330, 110]; // milissegundos por minuto de jogo: normal (~30 s) e rápido (~10 s)
  let fast = false;
  let eff = null; // esforço do jogo ao vivo: nível escolhido, minutos em cada nível (S.FC_EFF) e o energético
  // Em tela larga a tabela fica ao lado do jogo ao vivo
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 1000px) and (min-height: 560px)').matches;

  // ---------- agenda da semana (tela central) ----------
  // A semana entre um jogo e outro como página de agenda: os dias até o jogo, dois deles com as ações da semana
  // (S.fcWeek: as mesmas duas ações de sempre), os outros com a rotina do clube. Liga no domingo, copa e continental na quarta.
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayOf = e => (e && e.k === 'lg' ? 6 : 2);
  let agOpen = -1; // dia de ação aberto para trocar
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
    agOpen = -1;
    phone();
  }
  // ---------- o celular (tela central) ----------
  // O hub é a tela do celular do jogador: relógio com o próximo jogo, notificações (técnico, agenda, preparador, Zé)
  // que levam às telas, os apps e o ingresso para o jogo.
  const APPS = [['ag', '📒', 'Agenda'], ['tbl', '📊', 'Tabela'], ['cal', '📋', 'Jogos'], ['me', '📈', 'Ficha'], ['shop', '🏷️', 'Loja'], ['bet', '🎰', 'Zé']];
  function phone() {
    const c = G.c, nx = S.fcNext(c), fc = c.fc, kind = S.fcKind(c, nx);
    const gd = dayOf(nx.e), eve = DAYS[(gd + 6) % 7];
    const hh = 17 + (fc.i * 7) % 5, mm = (fc.i * 23 + 11) % 60, clk = hh + ':' + String(mm).padStart(2, '0');
    const en = Math.round(fc.en === undefined ? 100 : fc.en);
    const when = ['agora', '8 min', '25 min', '1 h', '2 h', '3 h'];
    render('<div class="ph" id="fc"><div class="ph-cols"><div class="ph-scr">' +
      '<div class="ph-bar"><span>' + eve + ' ' + clk + '</span><span class="' + (en < S.FC_EN_OUT ? 'out' : en < S.FC_EN_LOW ? 'low' : '') + '">Energia ' + en + '%</span></div>' +
      '<div class="ph-clock">' + clk + '</div>' +
      '<p class="ph-date">' + (nx.vs ? 'Amanhã: x ' + esc(nameOf(nx.vs)) + ', ' + (nx.home ? 'em casa' : 'fora') + ' · ' + esc(nx.compName) : 'Amanhã: folga do time · ' + esc(nx.compName)) + '</p>' +
      '<div class="ph-ns">' + pings(c, nx).map((n, k) => '<button class="ph-n"' + (n.go ? ' data-go="' + n.go + '"' : ' disabled') + '><b>' + esc(n.who) + ' <i>· ' + when[Math.min(k, when.length - 1)] + '</i></b><span>' + esc(n.txt) + '</span></button>').join('') + '</div>' +
      '<div class="ph-apps">' + APPS.map(([k, e, n]) => '<button class="ph-app" data-go="' + k + '"><i>' + U.emo(e, 'md') + '</i><span>' + n + '</span></button>').join('') + '</div>' +
      '</div><div class="ph-side">' +
        '<p class="prc-kind ' + kind + '">' + kindTxt(c, nx, kind) + '</p>' +
        '<button class="prc-tk" id="fc-play"><span class="prc-tk-m"><b>' + (nx.moment ? 'Jogar a decisão' : kind === 'vivo' ? 'Ir pro jogo' : nx.vs ? 'Jogar' : 'Seguir') + '</b><small>' +
          (nx.vs ? esc(nameOf(nx.home ? c.club : nx.vs)) + ' × ' + esc(nameOf(nx.home ? nx.vs : c.club)) : esc(nx.compName)) + '</small></span><span class="prc-tk-s"><small>jogo</small><b>' + (fc.i + 1) + '</b></span></button>' +
        '<div class="prc-sim">' + (kind === 'resumo' ? '<button class="link-btn" id="fc-live">Viver este jogo</button>' : '') +
          (kind !== 'vivo' ? '<button class="link-btn" id="fc-skip2">Resumir até o próximo jogo grande</button>' : '') + '</div>' +
      '</div></div></div>');
    document.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { sfx('tap'); go(b.dataset.go); }; });
    $('fc-play').onclick = () => {
      if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); }
      const n = S.fcNext(G.c), k = S.fcKind(G.c, n);
      if (k !== 'vivo') return brief(n);
      n.vs ? fly(n, false, () => start(n)) : start(n);
    };
    if ($('fc-live')) $('fc-live').onclick = () => { sfx('tap'); S.fcLive(G.c); save(); phone(); };
    if ($('fc-skip2')) $('fc-skip2').onclick = () => skipTo();
  }
  // Notificações do celular: quem fala e o que pede; cada uma abre a tela dela
  function pings(c, nx) {
    const fc = c.fc, out = [], n = (go, who, txt) => out.push({ go, who, txt });
    const p = Math.round(S.fcStartP(c) * 100);
    if (nx.injury) n(null, /suspensão/.test(nx.injury) ? 'Diretoria' : 'Departamento médico', /suspensão/.test(nx.injury) ? (/manipula/.test(fc.injName) ? 'Suspenso pelo caso do cartão combinado: fora por mais ' : 'Suspenso por causa da aposta: fora por mais ') + nx.injLeft + (nx.injLeft === 1 ? ' jogo.' : ' jogos.') : nx.injury.charAt(0).toUpperCase() + nx.injury.slice(1) + ': fora por mais ' + nx.injLeft + (nx.injLeft === 1 ? ' jogo.' : ' jogos.') + (fc.wkDue ? ' Fisioterapia na semana ajuda.' : ''));
    else if (nx.vs) n(null, 'Técnico', nx.on === null ? 'Escalo o time depois do treino da semana. Hoje você tem ' + p + '% de chance de começar.' : nx.on ? 'Amanhã você começa jogando. Conto contigo.' : nx.why === 'cansaço' ? 'Vou te poupar amanhã, você tá sem perna. Descansa.' : nx.why === 'banco' ? 'Amanhã você começa no banco. Treina forte que a chance aparece.' : 'Amanhã vou rodar o elenco e você fica fora.');
    const A = id => (S.FC_WEEK.find(a => a.id === id) || S.FC_WEEK[2]).name.toLowerCase();
    if (fc.wkDue) { if (!pick) pick = S.fcWeekAuto(c); n('ag', 'Agenda', 'Semana marcada: ' + A(pick[0]) + ' e ' + A(pick[1]) + '. Toque para mudar.'); }
    else if (fc.wkSum && fc.wkSum.at === fc.i) n('ag', 'Agenda', 'Semana feita: ' + fc.wkSum.acts.map(A).join(' e ') + '. Energia ' + Math.round(fc.wkSum.en0) + ' → ' + Math.round(fc.wkSum.en1) + '.');
    // Roupeiro: a chuteira (ou luva) acabando ou já rasgada
    const gw = c.pos === 'GOL' ? 'luva' : 'chuteira';
    if (c.gear && c.gear.left <= 5) n('shop', 'Roupeiro', 'Tua ' + gw + ' tá no fim: ' + (c.gear.left === 1 ? 'aguenta só mais 1 jogo.' : 'aguenta mais ' + c.gear.left + ' jogos.'));
    else if (!c.gear && fc.gearOut) n('shop', 'Roupeiro', c.pos === 'GOL' ? 'Tuas luvas rasgaram. Passa na loja e compra outras.' : 'Tua chuteira rasgou. Passa na loja e compra outra.');
    if ((c.pe || 0) >= 1 && S.canInvestAny(c)) n('evo', 'Preparador', 'Você tem ' + c.pe + (c.pe === 1 ? ' ponto' : ' pontos') + ' para gastar na ficha.');
    if (fc.wkDue && (fc.en === undefined ? 100 : fc.en) < S.FC_EN_LOW) n('ag', 'Preparador físico', 'Energia ' + Math.round(fc.en) + '. Marca um descanso na agenda.');
    const fx = S.fcZeOffer(c), bets = S.fcBets(c);
    if (fx && fx.st === 'open') n('bet', 'Zé', 'Tenho uma proposta pro teu próximo jogo. Só entre nós.');
    else if (bets.length) n('bet', 'Zé', bets.length === 1 ? 'Teu cupom tá feito. Sai na próxima rodada.' : 'Teus ' + bets.length + ' cupons tão feitos. Saem na próxima rodada.');
    else if (S.fcBetRound(c) && !(fc.zeMad > fc.i)) n('bet', 'Zé', 'A rodada tá aberta, com jogo de fora também. Quer ver?');
    return out;
  }
  function agenda() {
    const c = G.c, nx = S.fcNext(c), fc = c.fc;
    const lg = standings('lg'), posOf = id => lg.findIndex(x => x.id === id) + 1, me = posOf(c.club);
    const vsPos = nx.vs && nx.e.k === 'lg' ? posOf(nx.vs) : 0;
    // Os dias: do dia seguinte ao último jogo até a véspera deste
    const gd = dayOf(nx.e), pd = fc.i > 0 ? dayOf(fc.cal[fc.i - 1]) : 6;
    const days = []; for (let d = (pd + 1) % 7; d !== gd; d = (d + 1) % 7) days.push(d);
    const slots = days.length >= 4 ? [0, 2] : [0, 1];
    const open = fc.wkDue, done = !open && fc.wkSum && fc.wkSum.at === fc.i ? fc.wkSum : null;
    if (open) { if (!pick) pick = S.fcWeekAuto(c); pick = pick.map((id, k) => (S.fcWeekOk(c, id, pick.slice(0, k)) ? id : 'rest')); }
    const acts = open ? pick : done ? done.acts : null;
    const A = id => S.FC_WEEK.find(a => a.id === id) || S.FC_WEEK[2];
    const city = nameOf(nx.vs || c.club);
    const routine = k => (k === days.length - 1 && nx.vs ? (nx.home ? 'Concentração' : 'Viagem para jogar com o ' + city) : k === 0 && fc.i > 0 ? 'Recuperação com o elenco' : ['Treino com o elenco', 'Treino tático', 'Treino com o elenco', 'Coletiva no CT'][k % 4]);
    const rows = days.map((d, k) => {
      const si = slots.indexOf(k);
      if (si < 0 || !acts) return '<div class="ag-d fix"><b>' + DAYS[d] + '</b><span>' + esc(routine(k)) + '</span></div>';
      const a = A(acts[si]);
      const row = '<button class="ag-d slot' + (agOpen === si ? ' on' : '') + (open ? '' : ' done') + '" data-slot="' + si + '"' + (open ? '' : ' disabled') + '><b>' + DAYS[d] + '</b><span>' + esc(a.name) + '</span><em class="' + (a.en > 0 ? 'up' : 'down') + '">' + sgn(a.en, String) + '</em>' + (open ? '<i aria-hidden="true">trocar</i>' : '<i class="ok" aria-hidden="true">' + U.ICON.check + '</i>') + '</button>';
      if (!open || agOpen !== si) return row;
      const other = pick[1 - si];
      return row + '<div class="ag-pick">' + S.FC_WEEK.map(o => {
        const ok = S.fcWeekOk(c, o.id, [other]);
        return '<button class="ag-o' + (o.id === a.id ? ' on' : '') + '" data-id="' + o.id + '"' + (ok ? '' : ' disabled') + '><b>' + esc(o.name) + '</b><small>' + esc(wkFx(c, o)) + '</small><em class="' + (o.en > 0 ? 'up' : 'down') + '">' + sgn(o.en, String) + '</em></button>';
      }).join('') + '</div>';
    }).join('');
    // O dia do jogo: adversário e a sua situação (titular, banco, lesão ou a chance de começar antes da escalação)
    const st = !nx.vs ? 'Seu time folga nesta rodada' : nx.injury ? (/suspensão/.test(nx.injury) ? 'Suspenso' : 'Lesionado') + (nx.injLeft > 1 ? ': fora por ' + nx.injLeft + ' jogos' : ': volta no próximo') :
      nx.on === null ? 'Escalação depois da semana · ' + Math.round(S.fcStartP(c) * 100) + '% de chance de começar' : nx.on ? 'Você começa jogando' : nx.why === 'cansaço' ? 'Poupado: energia baixa' : nx.why === 'banco' ? 'Você fica no banco' : 'Poupado neste jogo';
    const game = '<div class="ag-d game"><b>' + DAYS[gd] + '</b><span>' + (nx.vs ? 'x ' + esc(nameOf(nx.vs)) + ', ' + (nx.home ? 'em casa' : 'fora') + (vsPos ? ' · ' + vsPos + 'º' : '') : 'Folga') + '<small>' + esc(nx.compName) + ' · ' + esc(nx.stage) + '. ' + esc(st) + '</small></span></div>';
    const en = Math.round(open ? S.fcWeekEnergy(c, pick) : fc.en === undefined ? 100 : fc.en);
    const lvl = e => (e < S.FC_EN_OUT ? 'out' : e < S.FC_EN_LOW ? 'low' : 'ok');
    const sum = done ? '<p class="ag-sum">' + (c.fcAuto ? 'Semana automática' : 'Semana fechada') + ': energia ' + Math.round(done.en0) + ' → ' + Math.round(done.en1) + (done.pe ? ' · +' + num2(done.pe) + ' de evolução' : '') + (done.money > 0 ? ' · +R$ ' + U.money(done.money) : '') + (done.polem ? '. A entrevista virou polêmica e o técnico não gostou.' : '') + '</p>' : '';
    render('<div class="fc-scr ag" id="fc-scr"><button class="back-link" id="fc-back">‹ Celular</button>' +
      '<div class="ag-book"><header><b>Agenda</b><span>' + esc(fc.lg.name) + (me ? ' · ' + esc(nameOf(c.club)) + ' ' + me + 'º' : '') + '</span></header>' +
        (open ? '<p class="ag-hint">Toque num dia marcado para trocar o que você faz.</p>' : '') +
        rows + game + sum +
        '<div class="ag-box"><div><small>' + (open ? 'Energia no jogo' : 'Energia') + '</small><b class="' + lvl(en) + '">' + en + '</b></div><div><small>Forma</small><b>' + formTxt(fc.fo || 0) + '</b></div><div><small>Técnico</small><b>' + Math.round(c.rel.coach) + '</b></div></div>' +
      '</div>' +
      '<label class="fc-auto ag-auto"><input type="checkbox" id="fc-auto"' + (c.fcAuto ? ' checked' : '') + '><span>Repetir esta semana sozinho</span></label>' +
      '<button class="btn" id="fc-agok">Pronto</button></div>');
    $('fc-back').onclick = phone; $('fc-agok').onclick = () => { sfx('tap'); phone(); };
    document.querySelectorAll('.ag-d.slot').forEach(b => { b.onclick = () => { sfx('tap'); const k = +b.dataset.slot; agOpen = agOpen === k ? -1 : k; agenda(); }; });
    document.querySelectorAll('.ag-o').forEach(b => { b.onclick = () => { sfx('tap'); pick[agOpen] = b.dataset.id; touched = true; agOpen = -1; agenda(); }; });
    $('fc-auto').onchange = e => { c.fcAuto = e.target.checked; if (c.fcAuto && c.fc.wkDue) { S.fcWeek(c, myPick()); unpick(); bar(); } save(); agOpen = -1; agenda(); };
    window.scrollTo(0, 0);
  }
  // Apps do celular: cada um abre uma tela com volta para o celular
  const TITLE = { wk: 'Treino da semana', tbl: 'Tabela', cal: 'Jogos e torneios', me: 'Ficha', shop: 'Loja', bet: 'Zé' };
  const LOJA_IMG = ['chuteira-g1', 'chuteira-g2', 'chuteira-g3', 'luvas-g1', 'luvas-g2', 'luvas-g3', 'pt', 'physio', 'nutri', 'video', 'press', 'c1', 'c2', 'c3', 'c4', 'house'];
  function go(k) {
    if (k === 'evo') return evolve();
    if (k === 'ag') { agOpen = -1; return agenda(); }
    const c = G.c, body = {
      wk: '<div class="fc-wk" id="fc-wk"></div><div class="fs-acts" id="fc-acts"></div>',
      tbl: '<div class="fc-tabs" id="fc-tabs"></div><div class="fs-tbl" id="fc-tbl"></div>',
      cal: '<div class="fc-comps" id="fc-comps"></div><div class="fc-cal" id="fc-cal"></div>',
      me: '<div class="fs-me" id="fc-me"></div><div class="fc-pe" id="fc-pe"></div>',
      shop: '<div class="fc-shop" id="fc-shop"></div>',
      bet: '<div class="fc-shop" id="fc-bet"></div>',
    }[k];
    render('<div class="fc-scr" id="fc-scr"><button class="back-link" id="fc-back">‹ Celular</button><h2>' + TITLE[k] + '</h2>' + body + '</div>');
    $('fc-back').onclick = phone;
    if (k === 'wk') { weekBox(); weekActs(); }
    else if (k === 'tbl') { tblKey = null; table(); tabs(); }
    else if (k === 'cal') { compsBox(standings('lg').findIndex(x => x.i === 0) + 1); calBox(); }
    else if (k === 'me') { meBox(); peBox(); }
    else if (k === 'shop') shopBox();
    else if (k === 'bet') betRender();
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
  function flowOf(c, x, out) {
    const m = out.my, me = x.home ? 'h' : 'a', fc = c.fc;
    const r = S.rng(((Number(c.tseed) || 1) * 31 + fc.season * 977 + fc.i * 7919) >>> 0);
    const N = 100, nota = new Array(N + 1).fill(6), bx = new Array(N + 1).fill(50), lances = [];
    if (!m) return { nota, bx, lances, on: false };
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
    return { nota, bx, lances, on: !!m.on };
  }
  function flowBox(c, x, f) {
    const me = esc(nameOf(c.club)), op = esc(nameOf(x.vs));
    // Campo inclinado como na câmera de TV (perspectiva em CSS); a bola fica em pé sobre a grama, com sombra
    return '<div class="fl-cam" aria-hidden="true"><div class="fl-pitch"><s class="mid"></s><s class="ctr"></s><s class="ar l"></s><s class="ar r"></s><s class="gl l"></s><s class="gl r"></s>' +
      '<b class="fl-sh" id="fl-sh"></b><i class="fl-ball" id="fl-ball"></i></div></div>' +
      '<div class="fl-tm"><span class="fl-l">' + me + '</span><span class="fl-r">' + op + '</span></div>' +
      '<div class="fl-row"><p class="fl-zone" id="fl-zone">Bola rolando</p><p class="fl-pos">Posse <b id="fl-pos">50%</b></p></div>' +
      (f.on ? '<div class="fl-me"><div class="fl-n"><small>Sua nota</small><b id="fl-n">6,0</b><em id="fl-d"></em></div><ul class="fl-lc" id="fl-lc"></ul></div>'
        : '<p class="fl-off">' + (x.injury ? 'Você está fora, lesionado.' : 'Você está no banco.') + '</p>');
  }
  function flowAt(c, x, f, t, seen) {
    const ball = $('fl-ball'); if (!ball) return;
    const b = f.bx[Math.min(t, 100)];
    // Altura no campo: só para a bola não andar numa linha reta (sobe e desce entre as laterais)
    const y = Math.round(50 + 30 * Math.sin(t * 0.37 + b * 0.05) * Math.cos(t * 0.11)) + '%';
    ball.style.left = b + '%'; ball.style.top = y;
    const sh = $('fl-sh'); if (sh) { sh.style.left = b + '%'; sh.style.top = y; }
    const me = nameOf(c.club), op = nameOf(x.vs);
    $('fl-zone').textContent = b >= 75 ? 'Ataque do ' + me : b >= 58 ? me + ' no campo de ataque' : b <= 25 ? 'Pressão do ' + op : b <= 42 ? op + ' no ataque' : 'Disputa no meio-campo';
    $('fl-zone').className = 'fl-zone' + (b >= 75 ? ' up' : b <= 25 ? ' down' : '');
    let own = 0; for (let k = 0; k <= t && k <= 100; k++) if (f.bx[k] >= 50) own++;
    $('fl-pos').textContent = Math.round(own / (Math.min(t, 100) + 1) * 100) + '%';
    if (!f.on) return;
    const n = Math.max(4.5, Math.min(10, f.nota[Math.min(t, 100)] + (f.off || 0))), p = f.nota[Math.max(0, Math.min(t, 100) - 1)] + (f.off || 0); // off: o esforço até agora
    $('fl-n').textContent = rate(n);
    $('fl-n').className = n >= 7 ? 'up' : n < 6 ? 'down' : '';
    f.lances.filter(l => l.m <= t && !seen.has(l)).forEach(l => {
      seen.add(l);
      $('fl-d').textContent = (l.d > 0 ? '▲ ' : '▼ ') + rate(Math.abs(l.d)); $('fl-d').className = l.d > 0 ? 'up' : 'down';
      $('fl-lc').insertAdjacentHTML('afterbegin', '<li class="' + (l.up ? 'up' : 'down') + '"><i>' + clock(l.m) + '</i>' + esc(l.txt) + '</li>');
      const li = $('fl-lc').children; while (li.length > 3) li[li.length - 1].remove();
    });
    if (n === p && t > 0 && !f.lances.some(l => l.m > t - 4 && l.m <= t)) $('fl-d').textContent = '';
  }

  // ---------- jogo ao vivo ----------
  // Tela própria: o jogo, a rodada e a tabela (do lado em tela larga)
  function matchView() {
    const c = G.c;
    render(
      '<div class="fs fc live" id="fc">' +
        '<div class="fs-main">' +
          '<div class="eyebrow">Temporada ' + (year()) + ' · ' + esc(nameOf(c.club)) + '</div><h2 id="fc-h"></h2>' +
          '<div class="fs-match" id="fc-match"></div>' +
          '<div class="fc-flow" id="fc-flow"></div>' +
          '<div class="fc-wk" id="fc-wk"></div>' +
          '<div class="fs-acts" id="fc-acts"></div>' +
          '<div class="fs-round" id="fc-round"></div>' +
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
    const fc = G.c.fc, view = tblView === 'cont' && fc.cont && fc.cont.gtab ? 'cont' : 'lg', box = $('fc-tbl');
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
    if (!fc.cont || !fc.cont.gtab || fc.cont.md.length === 0) { el.innerHTML = '<div class="fc-tl">' + esc(fc.lg.name) + '</div>'; return; }
    el.innerHTML = '<div class="seg fc-seg"><button data-v="lg"' + (tblView === 'lg' ? ' class="on"' : '') + '>' + esc(fc.lg.name) + '</button><button data-v="cont"' + (tblView === 'cont' ? ' class="on"' : '') + '>Grupo · ' + esc(fc.cont.name) + '</button></div>';
    el.querySelectorAll('button').forEach(b => { b.onclick = () => { tblView = b.dataset.v; tabs(); table(); }; });
  }

  // Cartão do jogo: o próximo (antes), ao vivo ou o resultado
  function card(state, x, t) {
    const fc = G.c.fc, my = G.c.club;
    if (!x.vs) return '<div class="fs-bye">' + (state === 'live' ? 'Rodada ao vivo · <span id="fc-lt">' + clock(t) + '</span>. ' : '') + 'Seu time folga nesta rodada.</div>';
    const h = x.home ? my : x.vs, a = x.home ? x.vs : my;
    const side = id => '<div class="fs-tm' + (id === my ? ' me' : '') + '">' + crest(id, 'md') + '<span>' + esc(nameOf(id)) + '</span></div>';
    const tag = esc(x.compName) + ' · ' + esc(x.stage);
    if (state === 'next') {
      const who = x.week ? 'A escalação sai depois da sua semana' : x.injury ? (/suspensão/.test(x.injury) ? (/manipula/.test(x.injury) ? 'Suspenso (cartão combinado): ' : 'Suspenso (aposta): ') : 'Lesionado (' + esc(x.injury) + '): ') + (x.injLeft > 1 ? 'fora por mais ' + x.injLeft + ' jogos' : 'volta no próximo jogo') : x.on ? 'Você começa jogando' : x.why === 'banco' ? 'Você fica no banco' : x.why === 'cansaço' ? 'Energia baixa: o técnico vai poupar você' : 'O técnico vai poupar você neste jogo';
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
  // Situação em cada competição
  function compsBox(pos) {
    const fc = G.c.fc, cup = fc.cup, ct = fc.cont;
    const st = (o, list, lostAt, cur) => (o === 'won' ? 'Campeão!' : o === 'lost' ? 'Eliminado: ' + list[lostAt].toLowerCase() : o === 'group' ? 'Eliminado na fase de grupos' : cur);
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
      past.map(l => '<div class="fc-ci done">' + tag(l.comp) + crest(l.vs, 'xs') + '<span>' + (l.home ? '' : '@ ') + esc(nameOf(l.vs)) + '</span><b class="' + (l.won || l.gf > l.ga ? 'up' : l.gf < l.ga ? 'down' : '') + '">' + l.gf + '–' + l.ga + (l.pens ? ' (p)' : '') + '</b></div>').join('') +
      next.map(p => '<div class="fc-ci">' + tag(p.k) + (p.vs ? crest(p.vs, 'xs') + '<span>' + (p.home ? '' : '@ ') + esc(nameOf(p.vs)) + '</span>' : '<i></i><span>' + esc(p.bye ? 'Folga' : 'Adversário no sorteio') + '</span>') + '<b>' + esc(p.stage.replace(/^Grupo · /, 'G ')) + '</b></div>').join('');
  }

  // ---------- a semana entre os jogos ----------
  // Energia e forma sempre à vista; com a semana aberta, as seis ações (duas por semana) e a energia que fica para o jogo
  let pick = null, touched = false; // touched: a pessoa mexeu (só aí a escolha vira o plano da semana automática)
  const myPick = () => (touched && pick ? pick.slice() : undefined);
  const unpick = () => { pick = null; touched = false; };
  const sgn = (x, f) => (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x));
  function formTxt(fo) { return fo >= 0.8 ? 'Em alta' : fo >= 0.25 ? 'Boa' : fo > -0.25 ? 'Normal' : fo > -0.8 ? 'Em baixa' : 'Má fase'; }
  function wkFx(c, a) {
    const fc = c.fc;
    if (a.id === 'tec') return S.fcWeekOk(c, 'tec', []) ? '+' + num2(0.05) + ' de evolução' : 'Limite de treino do ano';
    if (a.id === 'fis') return 'Cansa menos nos próximos 4 jogos';
    if (a.id === 'rest') return 'Recupera energia';
    if (a.id === 'physio') return 'R$ ' + U.money(S.fcPhysioCost(c)) + (fc.injOut > 0 ? ' · 1 jogo a menos de lesão' : ' · recupera energia');
    if (a.id === 'spons') return '+R$ ' + U.money(S.fcSponsPay(c)) + ' e fama';
    return 'Fama, com risco de polêmica';
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
        (w.pe ? ' · +' + num2(w.pe) + ' de evolução' : '') + (w.money > 0 ? ' · +R$ ' + U.money(w.money) : '') + (w.inj ? ' · lesão: 1 jogo a menos' : '') +
        (w.polem ? '. A entrevista virou polêmica e o técnico não gostou.' : '') +
        (w.dropped && w.dropped.length ? '. Sem dinheiro para pagar: ' + w.dropped.map(k => S.FC_SHOP.staff.find(x => x.id === k).name).join(', ') + ' saiu.' : '') + '</p>' : '';
      el.className = 'fc-wk';
      el.innerHTML = status + what + (w ? auto : '');
      bindAuto();
      return;
    }
    if (!pick) pick = S.fcWeekAuto(c);
    pick = pick.map((id, k) => (S.fcWeekOk(c, id, pick.slice(0, k)) ? id : 'rest'));
    const n = id => pick.filter(x => x === id).length;
    const tired = S.fcWeekEnergy(c, pick);
    el.className = 'fc-wk open';
    el.innerHTML = status +
      '<div class="fc-wk-h"><b>Duas ações até o próximo jogo</b>' + auto + '</div>' +
      '<div class="fc-wk-g">' + S.FC_WEEK.map(a => {
        const ok = n(a.id) > 0 || S.fcWeekOk(c, a.id, [pick[1]]); // tocar troca a ação mais antiga
        return '<button class="fc-wa' + (n(a.id) ? ' on' : '') + '" data-id="' + a.id + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + (n(a.id) ? 'true' : 'false') + '">' +
          '<b>' + esc(a.name) + (n(a.id) === 2 ? ' <em>×2</em>' : '') + '</b><small>' + esc(wkFx(c, a)) + '</small><i class="' + (a.en > 0 ? 'up' : 'down') + '">' + sgn(a.en, String) + ' energia</i></button>';
      }).join('') + '</div>' +
      '<p class="fc-wk-p">Energia no próximo jogo: <b class="' + lvl(tired) + '">' + Math.round(tired) + '</b>' +
        (tired < S.FC_EN_OUT ? ' · abaixo de ' + S.FC_EN_OUT + ', o técnico pode poupar você e a lesão fica mais provável' : tired < S.FC_EN_LOW ? ' · abaixo de ' + S.FC_EN_LOW + ', você rende menos' : '') + '</p>';
    // Toque: a ação entra no lugar da mais antiga (tocar duas vezes na mesma vale as duas ações)
    el.querySelectorAll('.fc-wa').forEach(b => { b.onclick = () => { sfx('tap'); pick = [pick[1], b.dataset.id]; touched = true; weekBox(); }; });
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
  let zeTab = 'bet', betSel = {}, betStake = 0, csOpen = null, csG = [1, 0], betAll = false;
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
    const cas = K && K.n ? '<h3 class="ze-rd">Mesa dos fundos</h3><div class="ze-ext"><div><b>' + K.n + '</b><small>jogadas</small></div><div><b class="up">+' + R$(K.best || 0) + '</b><small>maior prêmio</small></div><div><b class="' + (K.net >= 0 ? 'up' : 'down') + '">' + (K.net >= 0 ? '+' : '−') + R$(Math.abs(K.net)) + '</b><small>saldo</small></div></div>' +
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
  // ---------- mesa dos fundos (engine/cassino.js): uma noite entre um jogo e outro, quatro jogos ----------
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
    bicho: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 6h40v52l-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4z" fill="#FBF8EF" stroke="#13201A" stroke-width="2"/><path d="M18 18h28M18 26h28M18 34h18" stroke="#9AA59F" stroke-width="2"/><ellipse cx="40" cy="38" rx="9" ry="6" fill="none" stroke="#C8323A" stroke-width="2.5" transform="rotate(-8 40 38)"/><text x="40" y="42" font-family="Courier New,monospace" font-weight="700" font-size="10" text-anchor="middle" fill="#13201A">16</text></svg>',
  };
  const GAMES = [['rol', 'Roleta', 'a casa leva 2,7%'], ['slot', 'Caça-níquel', 'devolve 92% em média'], ['bj', 'Vinte e um', 'a casa leva uns 5%'], ['bicho', 'Bicho', 'sai com o próximo jogo']];
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
    if (!S.fcNightOpen(c)) {
      zeGame = null;
      const can = S.fcNightCan(c);
      return '<div class="mz-in"><div class="mz-sign"><b>Mesa dos fundos</b><small>Bar do Zé · entra pela cozinha</small></div>' +
        '<p class="fc-ze">"Aqui ninguém viu ninguém. Mas se o técnico souber, não fui eu que te chamei."</p>' +
        '<ul class="mz-cost"><li><span>Energia</span><b class="down">−' + S.FC_NIGHT_EN + ' agora</b></li><li><span>Chance de foto</span><b>' + Math.round(S.FC_NIGHT_PHOTO * 100) + '% (fama −4, técnico −6)</b></li><li><span>Fichas da noite</span><b>até R$ ' + U.money(S.fcNightLimit(c)) + '</b></li></ul>' +
        '<button class="btn" id="mz-open"' + (can ? '' : ' disabled') + '>' + (can ? 'Entrar pela cozinha' : (c.money || 0) < 1000 ? 'Sem dinheiro para a mesa' : 'A mesa abre de novo depois do próximo jogo') + '</button>' +
        '<small class="fc-own">Uma noite entre um jogo e outro. A casa sempre leva vantagem: ninguém fica rico aqui.</small></div>';
    }
    const n = fc.night, left = S.fcNightLeft(c);
    const top = '<div class="mz-top"><div><small>Fichas da noite</small><b id="mz-left">R$ ' + U.money(left) + '</b></div><div><small>Na noite</small><b class="' + (n.net >= 0 ? 'up' : 'down') + '">' + (n.net >= 0 ? '+' : '−') + R$(Math.abs(n.net)) + '</b></div></div>';
    if (!zeGame) return '<div class="mz-sign sm"><b>Mesa dos fundos</b><small>aberta até o Zé cansar</small></div>' + top +
      (n.photo ? '<p class="mz-photo">Saiu foto sua no bar. A imprensa comentou e o técnico não gostou.</p>' : '') +
      '<div class="mz-games">' + GAMES.map(([k, t, s]) => '<button class="mz-g mz-' + k + '" data-g="' + k + '"><span class="mz-art">' + MESA_ICO[k] + '</span><b>' + t + '</b><small>' + s + '</small></button>').join('') + '</div>';
    const back = '<div class="mz-head"><button class="back-link mz-back" id="mz-back">‹ Mesa</button><b>' + GAMES.find(g => g[0] === zeGame)[1] + '</b></div>';
    const L = casLast && casLast.g === zeGame ? casLast : null;
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
      const acts = live ? '<div class="mz-acts"><button class="btn" data-bj="hit">Pedir</button><button class="btn mz-stand" data-bj="stand">Parar</button><button class="btn ghost" data-bj="double"' + (h.p.length === 2 && h.stake * 2 <= left ? '' : ' disabled') + '>Dobrar</button></div>' :
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
    document.querySelectorAll('.mz-g').forEach(b => { b.onclick = () => { sfx('tap'); zeGame = b.dataset.g; casLast = null; bjSeen = { p: 0, d: 0, open: false }; betRender(); window.scrollTo(0, 0); }; });
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
      if (zeGame === 'rol') rolSpin(c, R$);
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
    return '<div class="mz-fix"><b>Mensagem do Zé</b><p>"Leva um amarelo até os ' + f.min + "' contra o " + esc(nameOf(nx.vs)) + ' e te pago ' + R$(f.pay) + '. Ninguém vai saber."</p>' +
      '<small>Se descobrirem (' + Math.round(S.FC_FIX_SCANDAL * 100) + '%): ' + S.FC_FIX_BAN + ' jogos de suspensão, técnico −20, torcida −15, fama −10 e manchete no jornal.</small>' +
      '<div class="mz-acts"><button class="btn" id="fix-yes">Topar</button><button class="btn ghost" id="fix-no">Recusar</button></div></div>';
  }
  function betRender() {
    const el = $('fc-bet');
    if (!el) return;
    const c = G.c, R$ = v => 'R$ ' + U.money(v);
    const tabs = [['bet', 'Palpites'], ['mesa', 'Mesa dos fundos'], ['ext', 'Extrato']];
    el.innerHTML = '<div class="fc-cash"><span>Seu dinheiro</span><b>R$ ' + U.money(c.money || 0) + '</b></div>' + (zeTab === 'mesa' && zeGame ? '' : fixBox(c, R$)) +
      (zeTab === 'mesa' && zeGame ? '' : '<div class="seg ze-tabs">' + tabs.map(([k, t]) => '<button data-t="' + k + '"' + (zeTab === k ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>') +
      (zeTab === 'ext' ? extratoBox(c, R$) : zeTab === 'mesa' ? mesaBox(c, R$) : '<p class="fc-ze">"Palpite certo, sigilo total."</p>' + betBox(c, R$));
    el.classList.toggle('mz', zeTab === 'mesa');
    bindBet(); bindMesa();
    const fy = $('fix-yes'), fn = $('fix-no');
    if (fy) fy.onclick = () => { if (S.fcZeAnswer(c, true)) { sfx('coin'); save(); betRender(); } };
    if (fn) fn.onclick = () => { if (S.fcZeAnswer(c, false)) { sfx('tap'); save(); betRender(); } };
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
    const week = S.fcStaffWeek(c);
    el.innerHTML =
      '<div class="fc-cash"><span>Seu dinheiro</span><b>' + R(cash) + '</b><small>Salário de ' + R(c.wage || 0) + ' por semana' + (week ? ' · equipe: −' + R(week) + ' por semana' : '') + '</small></div>' +
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
        S.FC_SHOP.life.map(x => { const own = !!(c.life && c.life[x.id]), p = S.fcLifePrice(c, x.id);
          return row(x.name, x.fx + ' (+' + x.fame + ' de fama)', own ? '<em class="fc-own-tag">Comprado</em>' : btn('life', x.id, R(p), cash >= p), x.id); }).join('') +
      '</div>' +
      '<div class="fc-ss"><h3>Carro</h3>' +
        S.FC_SHOP.cars.map((x, k) => { const at = S.fcCarAt(c), p = S.fcCarPrice(c, x.id);
          return row(x.name, x.fx + ' (+' + x.fame + ' de fama)', k === at ? '<em class="fc-own-tag">Seu carro</em>' : k < at ? '<em class="fc-own-tag old">Abaixo do seu</em>' : btn('car', x.id, R(p), cash >= p), x.id); }).join('') +
      '</div>' +
      '<p class="fc-shop-note">Tudo daqui vale só nesta carreira. Os itens da coleção continuam só visuais.</p>';
    el.querySelectorAll('.fc-attr button').forEach(b => { b.onclick = () => { sfx('tap'); gearAttr = b.dataset.a; shopBox(); }; });
    el.querySelectorAll('.fc-buy').forEach(b => { b.onclick = () => {
      if (S.fcBuy(c, b.dataset.k, b.dataset.id, gearAttr)) { sfx(b.dataset.k === 'staff' && !(c.staff && c.staff[b.dataset.id]) ? 'tap' : 'coin'); save(); bar(); shopBox(); weekBox(); }
    }; });
  }

  // Simula sem o ao vivo; para antes de jogo com lance decisivo (esse você joga) e nas datas de evento
  // Tipo do próximo jogo, numa linha acima do ingresso: vivido (e por quê), resumido ou no banco
  const WHY = { decisao: 'Decisão', mata: 'Mata-mata', continental: 'Noite continental', estreia: 'Estreia do ano', classico: 'Clássico', ultima: 'Última rodada',
    briga: 'Briga direta na tabela', topo: 'Contra um dos três primeiros', escolha: 'Você escolheu viver' };
  function kindTxt(c, nx, kind) {
    if (kind === 'vivo') return '<b>Jogo grande</b> · ' + WHY[S.fcBig(c, nx)] + ': você vive o jogo inteiro';
    if (kind === 'banco') return '<b>Você fica no banco</b> · o jogo passa rápido';
    if (kind === 'folga') return '<b>Folga</b> · seu time não joga nesta data';
    return '<b>Jogo comum</b> · passa em resumo: placar, sua nota e o que importou';
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
      '<div class="card fb ' + res + '">' + sc + '<p class="fb-me">' + line + '</p>' + (out.lance && m.on ? lanceLine(out.lance) : '') + (x.vs ? '<p class="fb-f">' + h1 + '</p>' : '') + '</div>' + wkLine(out.wk);
  }
  // O seu lance no cartão do jogo: o minuto e como terminou
  function lanceLine(l) {
    const st = S.kickSetupType(l), def = st === 'save' || (st === 'tackle' && !l.duel);
    const what = st === 'save' ? (l.ok ? 'pênalti defendido' : 'pênalti sofrido') : def ? (l.ok ? 'desarme no contra-ataque' : 'o atacante passou e marcou') : l.duel ? (l.ok ? 'bola roubada na pressão' : 'perdeu a dividida') :
      st === 'pass' ? (l.ok ? 'assistência na medida' : 'passe cortado') : (l.kick === 'fk' ? 'falta ' : 'pênalti ') + (l.ok ? 'convertido' : 'perdido');
    return '<p class="fb-l ' + (l.ok ? 'up' : 'down') + '">Seu lance aos ' + esc(l.minute) + "': " + what + '</p>';
  }
  // Resumir: passa os jogos comuns (semana automática, carta decidindo) até o próximo jogo grande, um evento ou o fim
  function skipTo() {
    const c = G.c, rows = [];
    let nx, title = null;
    for (let k = 0; k < 60; k++) {
      if (c.fc.wkDue) { S.fcWeek(c, k === 0 ? myPick() : undefined); unpick(); }
      nx = S.fcNext(c);
      if (!nx || (k > 0 && (S.fcKind(c, nx) === 'vivo' || S.fcEventDue(c)))) break;
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
    if (m.kick === 'save') return { title: 'Pênalti contra o seu time!', text: 'O batedor ' + vs + ' ajeita a bola' + at + '. É você contra ele.', stakes: 'Defendeu: nota sobe e o placar segura · Sofreu: gol deles' };
    if (c.pos === 'ZAG') return m.sit === 'bola' ? { title: 'Bola nas costas da zaga!', text: 'O atacante ' + vs + ' escapou' + at + ' e só você chega a tempo.', stakes: 'Desarmou: nota sobe e o perigo passa · Passou: gol deles' }
      : { title: 'Contra-ataque perigoso!', text: 'O atacante ' + vs + ' arrancou sozinho' + at + '. Você é o último homem.', stakes: 'Desarmou: nota sobe e o perigo passa · Passou: gol deles' };
    if (m.duel) return { title: 'Pressão na saída de bola!', text: 'O zagueiro ' + vs + ' sai jogando perto de você' + at + '. Roubar ali vale ouro.', stakes: 'Roubou: nota sobe · Perdeu: nota cai' };
    if (m.kick === 'pass') return { title: 'A bola é sua no meio-campo!', text: { diagonal: 'O atacante faz a diagonal nas costas da zaga' + at + '.', contra: 'Contra-ataque' + at + ': o atacante dispara pelo meio.', tabela: 'Tabela na entrada da área' + at + ': o atacante pede a bola.' }[m.sit] || 'O atacante pede a bola' + at + '.', stakes: 'Acertou: assistência sua · Errou: a zaga corta' };
    if (m.kick === 'fk') return { title: 'Falta na entrada da área!', text: 'A barreira ' + vs + ' se arma' + at + '. A bola é sua.', stakes: 'Converteu: gol seu · Errou: chance perdida' };
    return { title: 'Pênalti para você!', text: (m.sit === 'mao' ? 'Mão na área' + at + ' e o juiz aponta a marca.' : 'Derrubaram você na área' + at + ' e o juiz aponta a marca.'), stakes: 'Converteu: gol seu · Errou: chance perdida' };
  };
  const lanceBoard = (m, sc, mini) => '<div class="ob5-board' + (sc ? '' : ' no-score') + (mini ? ' mini' : '') + '">' + crest(m.home ? G.c.club : m.vs) + '<b class="ob5-g">' + (sc ? sc[0] : '') + '</b>' +
    '<span class="ob5-mid"><span class="ob5-min"><i aria-hidden="true"></i>' + m.minute + "'</span><small>" + esc(m.comp) + '</small></span>' +
    '<b class="ob5-g">' + (sc ? sc[1] : '') + '</b>' + crest(m.home ? m.vs : G.c.club) + '</div>';
  function lanceScreen(m, sc, go) {
    const c = G.c, st = S.kickSetupType(m), T = LANCE_TXT(m, c), k = S.kickSetup(c, st, S.autoStyle(c, st));
    render('<div class="eyebrow">Seu lance · ' + esc(m.comp) + '</div>' + lanceBoard(m, sc) +
      '<div class="ob5-head"><h2>' + T.title + '</h2><p class="ob5-txt">' + esc(T.text) + '</p>' + U.lanceStakes(T.stakes) + '</div>' +
      '<p class="st-lead ob5-q">Como você vai ' + { cup: 'bater', classico: 'bater', save: 'defender', tackle: 'marcar', pass: 'passar' }[st] + '?</p>' + U.styleBtns(st, true) +
      '<div class="ob5-foot"><button class="btn ghost ob5-auto" id="fc-lauto">Deixar o jogo decidir<small>' + Math.round(k.chance * 100) + '% pela sua carta</small></button>' +
      '<button class="ob5-train mom-train" id="b-train">' + U.emo('🏟️', 'xs') + ' Treinar antes</button></div>');
    $('b-train').onclick = () => U.training(st);
    // No resumo (sem placar ao vivo) o cartão do jogo já conta como foi: segue direto
    const fin = ok => { c.fc.pending.lSeen = true; save(); if (sc) lanceEnd(m, ok, sc, go); else go(); };
    U.bindStyle(m, U.gateTrain(st, () => {
      m.started = true; save();
      render(lanceBoard(m, sc, true) + '<div id="kick"></div>');
      sfx('whistle');
      U.playMini($('kick'), st, ok => { if ($('kick')) fin(ok); }, null, null, m.style,
        (ok, why) => { if (!$('kick')) return; S.fcLance(c, m, ok, why); save(); });
    }));
    $('fc-lauto').onclick = () => fin(S.fcAutoLance(c, m));
  }
  // Resultado do lance: o grito, uma linha e voltar ao jogo
  function lanceEnd(m, ok, sc, go) {
    const c = G.c, st = S.kickSetupType(m), def = st === 'save' || (st === 'tackle' && !m.duel);
    const big = ok ? (st === 'save' ? 'DEFENDEU!' : st === 'tackle' ? 'ROUBOU!' : st === 'pass' ? 'ASSISTÊNCIA!' : 'GOOOL!') : def ? 'Gol deles…' : st === 'tackle' ? 'Passou…' : st === 'pass' ? 'Cortado…' : 'Não entrou…';
    const txt = ok ? (def ? 'O perigo passou e a nota sobe.' : m.duel ? 'Bola roubada no campo deles: a nota sobe.' : st === 'pass' ? 'Bola na medida e o atacante não perdoou.' : 'Gol seu' + (m.kick === 'fk' ? ' de falta.' : ' de pênalti.'))
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
    x.score = t => (out.my ? part({ ev: out.my.ev }, t) : [0, 0]);
    const end = Math.max(90, ...[out.my].concat(out.others).filter(Boolean).map(g => (g.ev.length ? g.ev[g.ev.length - 1].m : 0)));
    let t = t0, half = false, timer = 0;
    $('fc-h').textContent = nx.compName + ' · ao vivo';
    $('fc-match').innerHTML = card('live', x, t);
    const fl = x.vs && out.my ? flowOf(c, x, out) : null, flSeen = new Set();
    if (fl) { $('fc-flow').innerHTML = flowBox(c, x, fl); fl.lances.forEach(l => { if (l.m <= t0) flSeen.add(l); }); }
    // Energia descendo minuto a minuto e o esforço escolhido na hora (quem está em campo); senão, o quadro de sempre
    const onPitch = !!(out.my && out.my.on && c.fc.en !== undefined && out.en !== undefined), enBase = out.en || 0;
    if (!eff) eff = { lvl: 1, mins: [0, Math.max(0, t0), 0], drink: false };
    const spentOf = () => eff.mins.reduce((a, m, k) => a + m * S.FC_EFF[k].en, 0) * enBase / 90;
    const lvlOf = e => (e < S.FC_EN_OUT ? 'out' : e < S.FC_EN_LOW ? 'low' : 'ok');
    const enNow = () => Math.max(0, Math.min(100, Math.round((x.en0 === undefined ? 100 : x.en0) - spentOf() + (eff.drink ? S.FC_DRINK_EN : 0))));
    function effBox() {
      const e = enNow(), dp = S.fcDrinkPrice(c), canDrink = !eff.drink && half && (c.money || 0) >= dp;
      $('fc-wk').className = 'fc-wk fc-ef';
      $('fc-wk').innerHTML = '<div class="fc-st"><span>Energia</span><div class="fc-en ' + lvlOf(e) + '"><i style="width:' + e + '%"></i></div><b class="' + lvlOf(e) + '">' + e + '</b></div>' +
        '<div class="fc-ef-row"><span>Esforço</span><div class="seg fc-ef-seg">' + S.FC_EFF.map((f, k) => '<button data-e="' + k + '"' + (k === eff.lvl ? ' class="on"' : '') + '>' + f.name + '</button>').join('') + '</div></div>' +
        '<p class="fc-ef-hint">' + ['Poupa energia, mas a nota cai um pouco.', 'Gasto normal de energia.', 'Nota sobe, mas a energia desce bem mais rápido.'][eff.lvl] + '</p>' +
        (eff.drink ? '<p class="fc-ef-hint up">Energético tomado: +' + S.FC_DRINK_EN + ' de energia.</p>' : half ? '<button class="btn ghost fc-drink" id="fc-drink"' + (canDrink ? '' : ' disabled') + '>Energético pro 2º tempo · R$ ' + U.money(dp) + '<small>+' + S.FC_DRINK_EN + ' de energia' + ((c.money || 0) < dp ? ' · sem dinheiro' : '') + '</small></button>' : '');
      $('fc-wk').querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { sfx('tap'); eff.lvl = +b.dataset.e; effBox(); }; });
      if ($('fc-drink')) $('fc-drink').onclick = () => { if ((c.money || 0) < dp) return; sfx('coin'); eff.drink = true; effBox(); };
    }
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
    $('fc-round').innerHTML = out.others.length ? '<div class="fs-rlbl">' + (lg ? 'Outros jogos da rodada' : grp ? 'O outro jogo do grupo' : 'Outros confrontos da fase') + '</div><p class="fs-tv" id="fc-tv" hidden></p>' +
      ordK.map(k => { const g = out.others[k], rv = g.h === rvId || g.a === rvId;
        return '<div class="fs-rr' + ((out.bets || []).some(t => t.legs.some(l => l.h === g.h && l.a === g.a)) ? ' zb' : '') + (rv ? ' rv' : '') + '" data-k="' + k + '"><span>' + esc(nameOf(g.h)) + '</span>' + crest(g.h, 'xs') + '<b>0 × 0</b>' + crest(g.a, 'xs') + '<span>' + esc(nameOf(g.a)) + '</span></div>'; }).join('') : '';
    let myPos = 0;
    // Botões com a bola rolando: velocidade e pular (para o fim ou para o lance)
    function liveActs() {
      $('fc-acts').innerHTML = '<div class="fs-skip"><button class="btn ghost' + (fast ? ' on' : '') + '" id="fc-fast">' + (fast ? 'Velocidade normal' : 'Mais rápido') + '</button><button class="btn ghost" id="fc-skip">' + (o.stop ? 'Ir ao lance' : 'Fim do jogo') + '</button></div>';
      $('fc-fast').onclick = () => { fast = !fast; $('fc-fast').textContent = fast ? 'Velocidade normal' : 'Mais rápido'; $('fc-fast').classList.toggle('on', fast); };
      $('fc-skip').onclick = () => { clearTimeout(timer); if (o.stop) { const t1 = t; t = stopAt; frame(t1); return pause(); } t = end; frame(); done(); };
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
    function frame(since) { // since: pulou de minuto (só o lance pendente)
      const lt = $('fc-lt'); if (lt) lt.textContent = (half ? 'Intervalo' : t >= end ? 'Fim de jogo' : esc(nx.compName) + ' · ' + clock(t));
      if (out.my && $('fc-sh')) {
        const [h, a] = x.score(o.stop ? Math.min(t, stopAt - 1) : t); $('fc-sh').textContent = h; $('fc-sa').textContent = a;
        out.my.ev.filter(e => (since !== undefined ? e.m > since && e.m <= t : e.m === t) && shown(e)).forEach(e => { $(e.s === 'h' ? 'fc-evh' : 'fc-eva').insertAdjacentHTML('beforeend', play1(e)); if ((e.s === 'h') === nx.home) sfx('cheer'); });
      }
      if (fl && onPitch) fl.off = eff.mins.reduce((a, m, k) => a + m * S.FC_EFF[k].r, 0) / 90;
      if (fl) flowAt(c, x, fl, o.stop ? Math.min(t, stopAt - 1) : t, flSeen);
      let goal = false;
      let tv = null;
      document.querySelectorAll('#fc-round .fs-rr').forEach(el => {
        const g = out.others[+el.dataset.k], [h, a] = part(g, t);
        el.querySelector('b').textContent = h + ' × ' + a;
        el.classList.toggle('hot', g.ev.some(e => e.m <= t && e.m > t - 5));
        const e = g.ev.filter(e => (since !== undefined ? e.m > since : e.m === t) && e.m <= t).pop();
        if (e) { goal = true; if (!tv || e.m >= tv.e.m) tv = { e, g, h, a }; }
      });
      if (undo && (goal || t <= 1 || (out.my && out.my.ev.some(e => e.m === t)))) {
        const p = table(liveTab());
        if (tv) {
          const who = tv.e.s === 'h' ? tv.g.h : tv.g.a, mv = myPos && p !== myPos && lg ? ' · você ' + (p < myPos ? 'sobe' : 'cai') + ' para ' + p + 'º' : '';
          plantao(clock(tv.e.m) + ' · Gol ' + D.do(nameOf(who)) + (who === rvId ? ', seu rival' : '') + ': ' + nameOf(tv.g.h) + ' ' + tv.h + ' × ' + tv.a + ' ' + nameOf(tv.g.a) + mv);
        }
        myPos = p;
      }
    }
    function plantao(txt) {
      const el = $('fc-tv'); if (!el) return;
      el.hidden = false; el.textContent = txt; el.classList.remove('new'); void el.offsetWidth; el.classList.add('new');
    }
    function tick() {
      if (!$('fc-match')) return; // saiu da tela: o jogo já está salvo
      if (t === 45 && !half) {
        // Intervalo: o jogo para; o energético só aparece aqui
        half = true; sfx('whistle'); frame(t); // frame(t): não repete o gol do minuto 45 na lista
        if (onPitch) effBox();
        return stopActs('fc-2t', 'Começar o 2º tempo', onPitch ? 'Escolha o esforço' + (eff.drink ? '' : ' e se toma o energético') : '', () => { liveActs(); timer = setTimeout(() => { if (onPitch) effBox(); tick(); }, 300); });
      }
      half = false; t++;
      if (onPitch && t <= 90) { eff.mins[eff.lvl]++; effTick(); }
      frame();
      if (o.stop && t >= stopAt) return pause();
      if (t >= end) return done();
      timer = setTimeout(tick, PACE[fast ? 1 : 0]);
    }
    // O jogo para no minuto do lance: o placar escuro avisa e o minigame abre (ui/match.js)
    function pause() {
      clearTimeout(timer);
      const jogo = o.stop.type === 'jogo', lt = $('fc-lt'); if (lt) lt.textContent = (jogo ? 'Seu lance · ' : 'Lance decisivo · ') + clock(stopAt);
      $('fc-acts').innerHTML = '';
      sfx('whistle');
      const sc = x.score(stopAt - 1), m = o.stop;
      timer = setTimeout(() => { if ($('fc-match')) (jogo ? lanceScreen(m, sc, () => live({ from: stopAt })) : U.momentIntro(o.stop)); }, 1400);
    }
    let finished = false;
    function done() {
      if (finished) return; finished = true;
      clearTimeout(timer);
      // Esforço: os minutos que faltaram (pulou para o fim) contam no nível escolhido; a energia e a nota fecham no motor
      if (onPitch) { eff.mins[eff.lvl] += Math.max(0, 90 - eff.mins.reduce((a, b) => a + b, 0)); S.fcEffort(c, out, eff.mins, eff.drink); eff = null; save(); }
      // A tabela volta a ter o jogo somado
      if (undo) games.forEach(([a, b, g]) => add(undo === 'lg' ? c.fc.lg.tab : c.fc.cont.gtab, a, b, part(g, 99)));
      sfx('whistle');
      result(x, out);
    }
    // Antes do apito: o jogo começa no botão (o esforço já pode ser escolhido); voltando ao lance, segue direto
    // Voltando do lance (do minuto dele): a tabela entra já com os placares parciais (senão ficava vazia até o próximo gol)
    if (o.from) { if (undo) table(liveTab()); liveActs(); sfx('whistle'); timer = setTimeout(tick, 400); }
    else {
      const lt = $('fc-lt'); if (lt) lt.textContent = esc(nx.compName) + ' · antes do jogo';
      stopActs('fc-kick', 'Começar o jogo', onPitch ? 'Escolha o esforço antes do apito' : '', () => { liveActs(); timer = setTimeout(tick, 300); });
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
      '<div class="jn-f"><p>' + esc(nameOf(c.club)) + ' está em ' + lgPos + 'º na ' + esc(fc.lg.name) + ', com ' + fc.lg.tab[0].p + (fc.lg.tab[0].p === 1 ? ' ponto.' : ' pontos.') + '</p>' + fx + '</div>' +
      '</article>' + (m.on ? progStrip(c, out, m) : '') + zeCard + '<button class="btn" id="fc-next">' + (done ? 'Ver resumo da temporada' : 'Voltar ao celular') + '</button></div>');
    // As barras enchem do valor de antes do jogo até o de agora
    setTimeout(() => document.querySelectorAll('.pg-b u').forEach(u => { u.style.width = u.dataset.w + '%'; }), 350);
    if (tk.length) setTimeout(() => sfx(net > 0 ? 'coin' : 'tap'), 500);
    $('fc-next').onclick = () => (out.title ? celebrate(out, () => flyBack(x)) : flyBack(x));
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
  const flyBack = x => (G.c.fc.done || !x.vs ? paintOrEnd() : fly(x, true, paintOrEnd));
  // Viagem entre o celular e o jogo: avião para jogo fora, ônibus para jogo em casa; a tela troca no meio do caminho
  function fly(x, back, next) {
    if (U.cfg.fast || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return next();
    const away = !x.home, city = nameOf(x.vs);
    const el = document.createElement('div');
    el.className = 'fc-fly' + (back ? ' back' : '') + (away ? ' air' : ' bus');
    el.innerHTML = '<div class="fc-fly-v">' + U.emo(away ? '✈️' : '🚌', 'lg') + '</div><p>' + (back ? (away ? 'Voltando para casa' : 'De volta ao CT') : away ? 'Viagem para jogar com o ' + esc(city) : 'Rumo ao estádio') + '</p>';
    document.body.appendChild(el);
    sfx('whoosh');
    setTimeout(next, 750);
    setTimeout(() => el.classList.add('out'), 1300);
    setTimeout(() => el.remove(), 1700);
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
    render('<button class="back-link" id="fc-back">‹ Celular</button><div class="eyebrow">Evoluir</div><h2>Gaste seus pontos</h2>' +
      '<p class="fc-sub">Você tem <b>' + (c.pe || 0) + '</b> ' + ((c.pe || 0) === 1 ? 'ponto' : 'pontos') + '. O que você compra agora já vale no próximo jogo.</p>' +
      '<div class="fc-inv">' + rows.map(t => { const p = S.investPrice(c, t.id), ok = S.canInvest(c, t.id), at = t.attr ? Object.keys(t.attr)[0] : null;
        return '<button class="fc-iv' + (ok ? '' : ' off') + '" data-id="' + t.id + '"' + (ok ? '' : ' disabled') + '><span><b>' + esc(t.name) + '</b><small>' + (at ? esc(D.ATTR_LABEL[at]) + ' ' + Math.round(E[at]) + ' → ' + Math.round(E[at] + t.attr[at]) : 'Menos lesão') + '</small></span><em>' + p + (p === 1 ? ' ponto' : ' pontos') + '</em></button>'; }).join('') + '</div>');
    $('fc-back').onclick = hub;
    document.querySelectorAll('.fc-iv:not(.off)').forEach(b => { b.onclick = () => { if (S.invest(c, b.dataset.id)) { sfx('levelup'); save(); bar(); evolve(); } }; });
  }

  // ---------- fim do calendário ----------
  function finishSeason() {
    G.c.fcMetaEnd = S.fcMeta(G.c); // a meta do ano, para o XP da temporada (ui/profile.js)
    if (!G.c.fc.done) S.fcFinish(G.c);
    save();
    U.season();
  }

  Object.assign(U, { fcHub: hub, fcAfterMoment: afterMoment });
})();
