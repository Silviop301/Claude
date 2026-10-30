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
    const c = G.c, nx = S.fcNext(c), fc = c.fc;
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
        '<button class="prc-tk" id="fc-play"><span class="prc-tk-m"><b>' + (nx.moment ? 'Jogar a decisão' : nx.vs ? 'Ir pro jogo' : 'Seguir') + '</b><small>' +
          (nx.vs ? esc(nameOf(nx.home ? c.club : nx.vs)) + ' × ' + esc(nameOf(nx.home ? nx.vs : c.club)) : esc(nx.compName)) + '</small></span><span class="prc-tk-s"><small>jogo</small><b>' + (fc.i + 1) + '</b></span></button>' +
        '<div class="prc-sim"><button class="link-btn" id="fc-5">Simular 5 jogos</button><button class="link-btn" id="fc-end">Simular até o fim</button></div>' +
      '</div></div></div>');
    document.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { sfx('tap'); go(b.dataset.go); }; });
    $('fc-play').onclick = () => { if (G.c.fc.wkDue) { S.fcWeek(G.c, myPick()); unpick(); } start(S.fcNext(G.c)); };
    $('fc-5').onclick = () => quick(5);
    $('fc-end').onclick = () => quick(999);
  }
  // Notificações do celular: quem fala e o que pede; cada uma abre a tela dela
  function pings(c, nx) {
    const fc = c.fc, out = [], n = (go, who, txt) => out.push({ go, who, txt });
    const p = Math.round(S.fcStartP(c) * 100);
    if (nx.injury) n(null, /suspensão/.test(nx.injury) ? 'Diretoria' : 'Departamento médico', /suspensão/.test(nx.injury) ? 'Suspenso por causa da aposta: fora por mais ' + nx.injLeft + (nx.injLeft === 1 ? ' jogo.' : ' jogos.') : nx.injury.charAt(0).toUpperCase() + nx.injury.slice(1) + ': fora por mais ' + nx.injLeft + (nx.injLeft === 1 ? ' jogo.' : ' jogos.') + (fc.wkDue ? ' Fisioterapia na semana ajuda.' : ''));
    else if (nx.vs) n(null, 'Técnico', nx.on === null ? 'Escalo o time depois do treino da semana. Hoje você tem ' + p + '% de chance de começar.' : nx.on ? 'Amanhã você começa jogando. Conto contigo.' : nx.why === 'cansaço' ? 'Vou te poupar amanhã, você tá sem perna. Descansa.' : nx.why === 'banco' ? 'Amanhã você começa no banco. Treina forte que a chance aparece.' : 'Amanhã vou rodar o elenco e você fica fora.');
    const A = id => (S.FC_WEEK.find(a => a.id === id) || S.FC_WEEK[2]).name.toLowerCase();
    if (fc.wkDue) { if (!pick) pick = S.fcWeekAuto(c); n('ag', 'Agenda', 'Semana marcada: ' + A(pick[0]) + ' e ' + A(pick[1]) + '. Toque para mudar.'); }
    else if (fc.wkSum && fc.wkSum.at === fc.i) n('ag', 'Agenda', 'Semana feita: ' + fc.wkSum.acts.map(A).join(' e ') + '. Energia ' + Math.round(fc.wkSum.en0) + ' → ' + Math.round(fc.wkSum.en1) + '.');
    if ((c.pe || 0) >= 1 && S.canInvestAny(c)) n('evo', 'Preparador', 'Você tem ' + c.pe + (c.pe === 1 ? ' ponto' : ' pontos') + ' para gastar na ficha.');
    if (fc.wkDue && (fc.en === undefined ? 100 : fc.en) < S.FC_EN_LOW) n('ag', 'Preparador físico', 'Energia ' + Math.round(fc.en) + '. Marca um descanso na agenda.');
    if (fc.bet) n('bet', 'Zé', 'Teu palpite: ' + (fc.bet.pick === 1 ? 'empate' : nameOf(fc.bet.pick === 0 ? fc.bet.h : fc.bet.a)) + '. Sai na próxima rodada.');
    else if (S.fcBetGame(c)) n('bet', 'Zé', 'Tenho um jogo bom pra rodada. Quer ver?');
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
  const TITLE = { wk: 'Treino da semana', tbl: 'Tabela', cal: 'Jogos e torneios', me: 'Ficha', shop: 'Loja', bet: 'Palpites do Zé' };
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
    rows.forEach((x, j) => {
      const d = rowEl[x.i], ch = d.children, sg = x.gp - x.gc;
      d.className = 'fs-tr' + zone(j + 1) + (x.i === 0 ? ' me' : '');
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
      const who = x.week ? 'A escalação sai depois da sua semana' : x.injury ? (/suspensão/.test(x.injury) ? 'Suspenso (aposta): ' : 'Lesionado (' + esc(x.injury) + '): ') + (x.injLeft > 1 ? 'fora por mais ' + x.injLeft + ' jogos' : 'volta no próximo jogo') : x.on ? 'Você começa jogando' : x.why === 'banco' ? 'Você fica no banco' : x.why === 'cansaço' ? 'Energia baixa: o técnico vai poupar você' : 'O técnico vai poupar você neste jogo';
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
  // Aposta: um jogo da próxima rodada (sem o seu time), com o aviso de que atleta apostar é proibido
  let betPick = null, betStake = 0;
  function betBox(c, R) {
    const fc = c.fc, b = fc.bet;
    const head = '<div class="fc-ss"><p class="fc-ze">"Palpite certo, sigilo total." Atleta apostando em futebol é proibido: a cada aposta, há risco de descobrirem. Aí são 4 jogos de suspensão, com técnico e torcida contra.</p>';
    if (b) return head + '<p class="fc-bet-on">Aposta feita: ' + R(b.stake) + ' em ' + (b.pick === 1 ? 'empate' : esc(nameOf(b.pick === 0 ? b.h : b.a))) + ' (' + esc(nameOf(b.h)) + ' × ' + esc(nameOf(b.a)) + '), paga ' + R(Math.round(b.stake * b.odd)) + '. Sai na próxima rodada da liga.</p></div>';
    const g = S.fcBetGame(c);
    if (!g) return head + '<p class="fc-own">Sem rodada da liga pela frente.</p></div>';
    const st = S.fcBetStakes(c);
    if (!st.includes(betStake)) betStake = st[0];
    const lab = ['Vitória ' + nameOf(g.h), 'Empate', 'Vitória ' + nameOf(g.a)];
    return head + '<div class="fc-bet-g">' + crest(g.h, 'xs') + '<span>' + esc(nameOf(g.h)) + ' × ' + esc(nameOf(g.a)) + '</span>' + crest(g.a, 'xs') + '</div>' +
      '<div class="fc-bet-o">' + g.odds.map((o, k) => '<button data-b="' + k + '"' + (betPick === k ? ' class="on"' : '') + '><small>' + esc(lab[k]) + '</small><b>' + o.toFixed(2).replace('.', ',') + '</b></button>').join('') + '</div>' +
      '<div class="seg fc-bet-s">' + st.map(v => '<button data-s="' + v + '"' + (v === betStake ? ' class="on"' : '') + (c.money >= v ? '' : ' disabled') + '>' + R(v) + '</button>').join('') + '</div>' +
      '<button class="btn ghost fc-bet-go" id="fc-bet-go"' + (betPick === null || (c.money || 0) < betStake ? ' disabled' : '') + '>' + (betPick === null ? 'Escolha um resultado' : 'Apostar ' + R(betStake) + ' · paga ' + R(Math.round(betStake * g.odds[betPick]))) + '</button></div>';
  }
  function bindBet() {
    document.querySelectorAll('.fc-bet-o button').forEach(b => { b.onclick = () => { sfx('tap'); betPick = +b.dataset.b; betRender(); }; });
    document.querySelectorAll('.fc-bet-s button').forEach(b => { b.onclick = () => { sfx('tap'); betStake = +b.dataset.s; betRender(); }; });
    const ok = $('fc-bet-go');
    if (ok) ok.onclick = () => { if (S.fcBet(G.c, betPick, betStake)) { sfx('coin'); betPick = null; save(); bar(); betRender(); } };
  }
  function betRender() {
    const el = $('fc-bet');
    if (!el) return;
    el.innerHTML = '<div class="fc-cash"><span>Seu dinheiro</span><b>R$ ' + U.money(G.c.money || 0) + '</b></div>' + betBox(G.c, v => 'R$ ' + U.money(v));
    bindBet();
  }
  function shopBox() {
    const c = G.c, el = $('fc-shop');
    if (!el) return;
    const R = v => 'R$ ' + U.money(v), cash = c.money || 0, attrs = S.fcGearAttrs(c);
    if (!attrs.includes(gearAttr)) gearAttr = attrs[0];
    const g = c.gear && c.gear.until >= c.season ? c.gear : null, gNow = g ? S.FC_SHOP.gear.find(x => x.id === g.id) : null;
    const left = g ? (g.until > c.season ? 'até a próxima temporada' : 'até o fim da temporada') : '';
    const btn = (kind, id, label, ok, on) => '<button class="fc-buy' + (on ? ' on' : '') + '" data-k="' + kind + '" data-id="' + id + '"' + (ok ? '' : ' disabled') + '>' + label + '</button>';
    // Imagem do item (assets/loja); os que ainda não têm arte ficam sem
    const img = f => (LOJA_IMG.includes(f) ? '<img class="fc-si-im" src="assets/loja/' + f + '.webp" alt="" draggable="false" loading="lazy">' : '');
    const row = (name, fx, right, f) => '<div class="fc-si' + (f && img(f) ? ' im' : '') + '">' + (f ? img(f) : '') + '<span><b>' + esc(name) + '</b><small>' + esc(fx) + '</small></span>' + right + '</div>';
    const week = S.fcStaffWeek(c);
    el.innerHTML =
      '<div class="fc-cash"><span>Seu dinheiro</span><b>' + R(cash) + '</b><small>Salário de ' + R(c.wage || 0) + ' por semana' + (week ? ' · equipe: −' + R(week) + ' por semana' : '') + '</small></div>' +
      '<div class="fc-ss"><h3>' + (c.pos === 'GOL' ? 'Luvas' : 'Chuteira') + '</h3>' +
        (g ? '<p class="fc-own">Você usa: ' + esc(S.fcGearName(c, gNow)) + ' · +' + g.b + ' em ' + esc(D.label(c.pos, g.attr)) + ', ' + left + '</p>' : '<p class="fc-own">Sem equipamento especial.</p>') +
        '<div class="seg fc-attr">' + attrs.map(k => '<button data-a="' + k + '"' + (k === gearAttr ? ' class="on"' : '') + '>' + esc(D.label(c.pos, k)) + '</button>').join('') + '</div>' +
        S.FC_SHOP.gear.map(x => { const p = S.fcGearPrice(c, x.id);
          return row(S.fcGearName(c, x), '+' + x.b + ' em ' + D.label(c.pos, gearAttr) + (x.en ? ', cansa ' + x.en + ' a menos por jogo' : '') + ' · ' + (x.seasons > 1 ? x.seasons + ' temporadas' : '1 temporada'), btn('gear', x.id, R(p), cash >= p), (c.pos === 'GOL' ? 'luvas-' : 'chuteira-') + x.id); }).join('') +
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
  function quick(n) {
    const c = G.c;
    let k = 0, nx;
    while (k < n) {
      if (c.fc.wkDue) { S.fcWeek(c, k === 0 ? myPick() : undefined); unpick(); } // a semana: a marcada na tela, depois a automática
      nx = S.fcNext(c);
      if (!nx || (k > 0 && (nx.moment || S.fcEventDue(c)))) break;
      if (nx.moment) { S.fcAutoMoment(c, nx.moment); }
      const out = S.fcPlay(c); k++;
      if (out && out.title) { save(); return celebrate(out, paintOrEnd); }
    }
    sfx('whistle'); save();
    paintOrEnd();
  }
  const paintOrEnd = () => (G.c.fc.done ? finishSeason() : hub());

  // Joga o próximo: com lance decisivo, o jogo ao vivo para no minuto do lance, o minigame decide e o jogo segue dali
  // Minuto do lance já jogado neste jogo (0 se não houve): o ao vivo recomeça dali
  const doneMin = () => { const P = G.c.fc.pending; return P && P.mDone && P.m ? S.fcMinOf(P.m.minute) : 0; };
  function start(nx) {
    if (doneMin()) return live({ from: doneMin() }); // lance já jogado (saiu e voltou ao jogo)
    if (nx.moment) {
      const m = nx.moment;
      if (m.started || U.cfg.moments === 'auto') { S.fcAutoMoment(G.c, m); save(); eff = null; return live(); }
      save(); eff = null;
      return live({ stop: m });
    }
    eff = null;
    live();
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
    } else { out = S.fcPlay(c); save(); }
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
      const e = enNow(), dp = S.fcDrinkPrice(c), canDrink = !eff.drink && t < 60 && (c.money || 0) >= dp;
      $('fc-wk').className = 'fc-wk fc-ef';
      $('fc-wk').innerHTML = '<div class="fc-st"><span>Energia</span><div class="fc-en ' + lvlOf(e) + '"><i style="width:' + e + '%"></i></div><b class="' + lvlOf(e) + '">' + e + '</b></div>' +
        '<div class="fc-ef-row"><span>Esforço</span><div class="seg fc-ef-seg">' + S.FC_EFF.map((f, k) => '<button data-e="' + k + '"' + (k === eff.lvl ? ' class="on"' : '') + '>' + f.name + '</button>').join('') + '</div></div>' +
        '<p class="fc-ef-hint">' + ['Poupa energia, mas a nota cai um pouco.', 'Gasto normal de energia.', 'Nota sobe, mas a energia desce bem mais rápido.'][eff.lvl] + '</p>' +
        (eff.drink ? '<p class="fc-ef-hint up">Energético tomado: +' + S.FC_DRINK_EN + ' de energia.</p>' : t < 60 ? '<button class="btn ghost fc-drink" id="fc-drink"' + (canDrink ? '' : ' disabled') + '>Energético pro 2º tempo · R$ ' + U.money(dp) + '<small>+' + S.FC_DRINK_EN + ' de energia' + ((c.money || 0) < dp ? ' · sem dinheiro' : '') + '</small></button>' : '');
      $('fc-wk').querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { sfx('tap'); eff.lvl = +b.dataset.e; effBox(); }; });
      if ($('fc-drink')) $('fc-drink').onclick = () => { if ((c.money || 0) < dp) return; sfx('coin'); eff.drink = true; effBox(); };
    }
    // Só o número e a barra (a cada minuto), sem redesenhar os botões
    function effTick() {
      const e = enNow(), b = document.querySelector('.fc-ef .fc-st b'), m = document.querySelector('.fc-ef .fc-en');
      if (!b || !m) return;
      b.textContent = e; b.className = lvlOf(e); m.className = 'fc-en ' + lvlOf(e); m.firstChild.style.width = e + '%';
      if (t === 60 && $('fc-drink')) effBox();
    }
    if (onPitch) effBox(); else weekBox(true);
    // Outros jogos da rodada (liga e grupo); na copa e no mata-mata, os outros confrontos da fase
    $('fc-round').innerHTML = out.others.length ? '<div class="fs-rlbl">' + (lg ? 'Outros jogos da rodada' : grp ? 'O outro jogo do grupo' : 'Outros confrontos da fase') + '</div>' +
      out.others.map((g, k) => '<div class="fs-rr" data-k="' + k + '"><span>' + esc(nameOf(g.h)) + '</span>' + crest(g.h, 'xs') + '<b>0 × 0</b>' + crest(g.a, 'xs') + '<span>' + esc(nameOf(g.a)) + '</span></div>').join('') : '';
    $('fc-acts').innerHTML = '<div class="fs-skip"><button class="btn ghost' + (fast ? ' on' : '') + '" id="fc-fast">' + (fast ? 'Velocidade normal' : 'Mais rápido') + '</button><button class="btn ghost" id="fc-skip">Fim do jogo</button></div>';
    $('fc-fast').onclick = () => { fast = !fast; $('fc-fast').textContent = fast ? 'Velocidade normal' : 'Mais rápido'; $('fc-fast').classList.toggle('on', fast); };
    if (o.stop) $('fc-skip').textContent = 'Ir ao lance';
    $('fc-skip').onclick = () => { clearTimeout(timer); if (o.stop) { const t1 = t; t = stopAt; frame(t1); return pause(); } t = end; frame(); done(); };
    $('fc-match').scrollIntoView({ block: 'nearest' });
    sfx('whistle');
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
      document.querySelectorAll('#fc-round .fs-rr').forEach(el => {
        const g = out.others[+el.dataset.k], [h, a] = part(g, t);
        el.querySelector('b').textContent = h + ' × ' + a;
        el.classList.toggle('hot', g.ev.some(e => e.m <= t && e.m > t - 5));
        if (g.ev.some(e => e.m === t)) goal = true;
      });
      if (undo && (goal || t <= 1 || (out.my && out.my.ev.some(e => e.m === t)))) table(liveTab());
    }
    function tick() {
      if (!$('fc-match')) return; // saiu da tela: o jogo já está salvo
      if (t === 45 && !half) { half = true; sfx('whistle'); frame(); timer = setTimeout(tick, fast ? 600 : 1800); return; }
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
      const lt = $('fc-lt'); if (lt) lt.textContent = 'Lance decisivo · ' + clock(stopAt);
      $('fc-acts').innerHTML = '';
      sfx('whistle');
      timer = setTimeout(() => { if ($('fc-match')) U.momentIntro(o.stop); }, 1400);
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
    timer = setTimeout(tick, 400);
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
    const ze = out.bet ? '<p class="jn-ze">' + esc(nameOf(out.bet.h)) + ' ' + out.bet.gh + ' × ' + out.bet.ga + ' ' + esc(nameOf(out.bet.a)) + '. ' +
      (out.bet.win ? 'Seu palpite pagou R$ ' + U.money(out.bet.pay) + '.' : 'Não foi dessa vez: R$ ' + U.money(out.bet.stake) + ' a menos.') +
      (out.bet.caught ? ' E a federação descobriu: 4 jogos de suspensão.' : '') + ' <i>— Zé</i></p>' : '';
    const done = G.c.fc.done;
    render('<div class="jn-w"><article class="jn">' +
      '<header><h1>Diário da Rodada</h1><p><span>nº ' + (fc.i) + '</span><span>' + esc(x.compName) + ' · ' + year() + '</span><span>R$ 3,00</span></p></header>' +
      '<h2>' + h1 + '</h2><p class="jn-sub">' + h2 + '</p>' +
      '<div class="jn-g">' + (x.vs ? '<div class="jn-sc"><div class="jn-bd"><span>' + esc(nameOf(x.home ? c.club : x.vs)) + '</span><b>' + gh + ' × ' + ga + '</b><span>' + esc(nameOf(x.home ? x.vs : c.club)) + '</span></div>' +
          (m.pens ? '<small>decidido nos pênaltis</small>' : '') + (ev ? '<ul>' + ev + '</ul>' : '<small>Sem gols.</small>') + '</div>' : '<div class="jn-sc"><small>Folga.</small></div>') +
        '<div class="jn-bt"><b>Boletim do atleta</b>' +
          (m.on ? row('Nota', rate(m.rating)) + (c.pos === 'GOL' || c.pos === 'ZAG' ? row('Sem sofrer gol', m.ga === 0 ? 'sim' : 'não') : row('Gols', m.goals || 0)) + row('Assistências', m.assists || 0) : row('Em campo', 'não')) +
          row('Energia', en0 + ' → ' + en1, en1 < en0 ? 'down' : 'up') + row('Forma', formTxt(fc.fo || 0).toLowerCase()) +
          (out.pe ? row('Evolução', '+' + num1(out.pe), 'up') : '') + '</div></div>' +
      (others ? '<div class="jn-o"><b>Os outros jogos</b><div>' + others + '</div></div>' : '') +
      '<div class="jn-f"><p>' + esc(nameOf(c.club)) + ' está em ' + lgPos + 'º na ' + esc(fc.lg.name) + ', com ' + fc.lg.tab[0].p + (fc.lg.tab[0].p === 1 ? ' ponto.' : ' pontos.') + '</p>' + ze + '</div>' +
      '</article><button class="btn" id="fc-next">' + (done ? 'Ver resumo da temporada' : 'Voltar ao celular') + '</button></div>');
    $('fc-next').onclick = () => (out.title ? celebrate(out, paintOrEnd) : paintOrEnd());
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
    if (!G.c.fc.done) S.fcFinish(G.c);
    save();
    U.season();
  }

  Object.assign(U, { fcHub: hub, fcAfterMoment: afterMoment });
})();
