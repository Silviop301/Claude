// Interface — temporada: contadores, revelação, jornal e resumo
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- temporada ----------
  // Os dois números da temporada que mais importam para a posição
  function seasonStats(res) {
    if (res.pos === 'GOL') return [[res.cleanSheets || 0, 'Sem sofrer'], [res.saves || 0, 'Defesas']];
    if (res.pos === 'ZAG') return [[res.goals, 'Gols'], [res.cleanSheets || 0, 'Sem sofrer']];
    return [[res.goals, 'Gols'], [res.assists, 'Assist.']];
  }

  // Pontos de evolução da temporada: desempenho (com limite) + bônus do foco nos treinos
  function peLine(pe) {
    if (!pe || (!pe.n && !(pe.train && pe.train.lost))) return '';
    const tr = pe.train, t = tr && D.TRAIN_BY_ID[tr.id];
    const base = pe.n - (tr && tr.n ? tr.n : 0), sum = pe.why.reduce((a, w) => a + w[1], 0);
    const parts = pe.why.map(w => esc(w[0]));
    if (sum > base) parts.push('máximo de ' + S.PE_CAP + ' pelo desempenho');
    if (tr && tr.lost) parts.push(t.name.toLowerCase() === 'normal' ? 'lesão: sem bônus do treino' : 'treino ' + t.name.toLowerCase() + ': a lesão tirou o bônus');
    else if (tr && tr.n) parts.push(U.emo(t.icon, 'xs') + ' treino ' + t.name.toLowerCase() + ': +' + tr.n + ' extra');
    return '<p class="pe-gain rv">' + U.emo('⭐', 'xs') + ' <b>' + (pe.n ? '+' + pe.n + (pe.n > 1 ? ' pontos' : ' ponto') + ' de evolução' : 'Nenhum ponto de evolução') + '</b> · ' + parts.join(' · ') + '</p>';
  }

  // Resenha da temporada: dois programas comentam, cada um no seu estilo (D.MEDIA.shows). Um fala do ano
  // (título, banco, lesão, nota) e o outro de um destaque (gols, assistências, idade); sem destaque, também do ano.
  function resenha(res) {
    const shows = (D.MEDIA || {}).shows || [];
    if (shows.length < 2) return '';
    const n = G.c.seasons.length, cl = club(res.club);
    const ballon = res.awards.some(a => a.id === 'ballon');
    const mood = ballon ? 'ballon' : res.titles.length ? 'title' : !res.games || res.games < 10 ? 'bench' : res.injury >= 25 ? 'injury'
      : res.move && res.move.dir === 'down' ? 'down' : res.rating >= 7.6 ? 'great' : res.rating >= 7.0 ? 'good' : 'bad';
    const atk = res.pos === 'ATA' || res.pos === 'PON';
    const topic = res.games < 10 ? null : res.goals >= (atk ? 20 : 12) ? 'gols' : res.assists >= 12 ? 'assist'
      : res.age <= 20 && res.rating >= 7.2 ? 'joia' : res.age >= 33 && res.rating >= 7.0 ? 'veterano' : null;
    const fill = t => t.replace(/\{n\}/g, G.c.name).replace(/\{time\}/g, cl.name).replace(/\{clube\}/g, D.o(cl.name))
      .replace(/\{g\}/g, res.goals).replace(/\{a\}/g, res.assists).replace(/\{idade\}/g, res.age);
    // Dois programas sorteados (diferentes) e uma fala sorteada de cada
    const first = Math.floor(Math.random() * shows.length), second = (first + 1 + Math.floor(Math.random() * (shows.length - 1))) % shows.length;
    // Fala sorteada com memória entre carreiras (U.fresh): a mesma frase só volta depois das outras
    const say = sh => key => fill(U.fresh ? U.fresh('r.' + sh.id + '.' + key, sh.talk[key]) : sh.talk[key][Math.floor(Math.random() * sh.talk[key].length)]);
    const item = (sh, q) => '<div class="rs-item"><div class="np">' + U.emo('🎙️', 'xs') + ' ' + esc(sh.who) + ' ' + esc(sh.where) + '</div><p>“' + esc(q) + '”</p></div>';
    return '<div class="news resenha rv">' + item(shows[first], say(shows[first])(mood)) +
      item(shows[second], say(shows[second])(topic || mood)) + '</div>';
  }

  function season() {
    const res = S.playSeason(G.c);
    U.rankSave(G.c); // ranking: nota máxima, gols e títulos já contam durante a carreira
    sfx('whistle');
    // Em ano de Copa com convocação, fechar o jogo no resumo não pula a Copa
    G.step = S.isWcYear(G.c) && G.c.wcYearDone !== year() && S.wcCall(G.c).called ? 'wc'
      : S.isCwcYear(G.c) && G.c.cwcYearDone !== year() && S.cwcCall(G.c).called ? 'cwc' : S.windowOpen(G.c) ? 'offers' : 'preseason';
    save();
    const cl = club(res.club);
    const [c1, c2] = seasonStats(res);
    const t0c = tierCls(res.ovr0);
    render(
      '<div class="season-head"><div><div class="eyebrow">Temporada ' + (year() - 1) + ' · ' + res.age + ' anos</div><h2 class="with-crest">' + crest(cl.id, 'lg') + esc(cl.name) + '</h2></div><span class="tag">' + (res.farewell ? 'Despedida' : res.role) + '</span></div>' +
      // A carta no centro: a nota sobe (ou cai) depois dos números da temporada
      '<div class="s-hero"><div class="scard metal ' + t0c + '" id="scard"><span class="sc-tier" id="sc-tier">' + TIER_NAME[t0c] + '</span><b id="sc-ovr">' + res.ovr0 + '</b><span class="sc-pos">' + G.c.pos + '</span></div>' +
      '<div class="s-verdict"><span class="sv-lbl" id="sv-lbl">&nbsp;</span><i class="sv-d" id="sc-d"></i></div></div>' +
      '<div class="counters"><div class="counter"><b id="k-j">0</b><span>Jogos</span></div><div class="counter"><b id="k-g">0</b><span>' + c1[1] + '</span></div>' +
      '<div class="counter"><b id="k-a">0</b><span>' + c2[1] + '</span></div><div class="counter rate"><b id="k-n">–</b><span>Nota</span></div></div>' +
      '<div class="feed" id="feed"></div><div id="after"></div><p class="skip-hint" id="skip-hint">Toque para pular</p>'
    );
    const dur = 1500, t0 = performance.now();
    let skip = !!U.cfg.fast, shown = [0, 0, 0]; // configuração: resumo rápido
    // Liga o "pular" só depois: o toque que abriu esta tela ainda está se propagando
    setTimeout(() => { screen.onclick = () => { skip = true; }; }, 50);
    (function tick(now) {
      if (!$('k-j')) return; // saiu da tela durante a contagem (voltou ao início): nada mais a desenhar
      const u = skip ? 1 : Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 2);
      const now3 = [Math.round(res.games * e), Math.round(c1[0] * e), Math.round(c2[0] * e)];
      // Cada gol/assistência que entra faz um "tic"
      if (!skip && (now3[1] > shown[1] || now3[2] > shown[2])) sfx('tick');
      shown = now3;
      $('k-j').textContent = now3[0]; $('k-g').textContent = now3[1]; $('k-a').textContent = now3[2];
      if (u < 1) return requestAnimationFrame(tick);
      $('k-n').textContent = res.games ? res.rating.toFixed(1).replace('.', ',') : '–';
      $('k-n').parentNode.classList.add('pop');
      const v = verdictOf(res);
      $('sv-lbl').textContent = v[0]; $('sv-lbl').className = 'sv-lbl ' + v[1];
      cardRise(res, skip);
      // Títulos, Bola de Ouro e acesso ganham tela cheia antes do resumo
      const big = bigMoments(res);
      if (big.length && !skip) { res.celebrated = true; screen.onclick = null; setTimeout(() => celebrate(big, () => summary(res, false)), 700); }
      else summary(res, skip);
    })(t0);
  }

  function bigMoments(res) {
    const out = res.titles.map(t => ({ art: trophy(titleType(t), 150, t.name), top: 'Campeão!', name: t.name }));
    if (res.awards.some(a => a.id === 'ballon')) out.push({ art: trophy('ballon', 150), top: 'O melhor do mundo', name: 'Bola de Ouro' });
    if (res.move && res.move.dir === 'up') out.push({ art: '<div class="bm-emoji">' + U.emo('⬆️', 'lg') + '</div>', top: 'Acesso!', name: D.O(club(res.club).name) + ' sobe ' + D.paraA(res.move.toName) });
    return out;
  }

  // Tela cheia de comemoração: taça grande, confete e fanfarra (toque passa)
  function celebrate(list, done) {
    const w = document.createElement('div');
    w.className = 'bigmoment';
    document.body.appendChild(w);
    let i = 0, tmr = 0, ending = false;
    const colors = ['#F4D675', '#FFFFFF', '#5FD690', '#FF8A93', '#7AC7FF'];
    const confetti = Array.from({ length: 36 }, (_, k) => '<i style="left:' + ((k * 37) % 100) + '%;background:' + colors[k % 5] + ';animation-delay:' + ((k * 0.13) % 1.2).toFixed(2) + 's;animation-duration:' + (1.6 + (k % 5) * 0.25).toFixed(2) + 's"></i>').join('');
    const show = () => {
      // Fim da fila só uma vez: toque duplo na saída montava o resumo duas vezes (destaque repetido)
      if (i >= list.length) { if (ending) return; ending = true; w.onclick = null; clearTimeout(tmr); w.classList.add('out'); return setTimeout(() => { w.remove(); done(); }, 250); }
      const m = list[i++];
      w.innerHTML = '<div class="bm-confetti">' + confetti + '</div><div class="bm-in"><div class="bm-art">' + m.art + '</div><span class="bm-top">' + esc(m.top) + '</span><b class="bm-name">' + esc(m.name) + '</b><small>Toque para continuar</small></div>';
      sfx('fanfare');
      U.vibe([30, 40, 30]);
      clearTimeout(tmr); tmr = setTimeout(show, 2600);
    };
    w.onclick = show;
    show();
  }

  // Selo da temporada pela nota
  function verdictOf(res) {
    if (!res.games) return ['Sem jogos', 'low'];
    const r = res.rating;
    return r >= 8 ? ['Temporada de craque', 'top'] : r >= 7.3 ? ['Grande temporada', 'good'] : r >= 6.8 ? ['Boa temporada', 'ok'] : r >= 6.3 ? ['Temporada regular', 'mid'] : ['Temporada apagada', 'low'];
  }

  // A nota da carta conta de ovr0 até ovr1; se mudar de faixa, o metal troca na hora
  function cardRise(res, skip) {
    const el = $('scard'), num = $('sc-ovr'), d = res.ovr1 - res.ovr0, t1 = tierCls(res.ovr1);
    const finish = () => {
      if (!el.isConnected) return;
      num.textContent = res.ovr1;
      $('sc-d').textContent = d > 0 ? '+' + d : d < 0 ? String(d) : '=';
      $('sc-d').className = 'sv-d ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'zero');
      if (t1 !== tierCls(res.ovr0)) { el.className = 'scard metal ' + t1 + ' tierup'; $('sc-tier').textContent = TIER_NAME[t1]; }
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      if (d > 0) { sfx('levelup'); U.vibe(25); }
    };
    if (skip || !d) return finish();
    const t0 = performance.now(), ms = Math.min(900, 180 * Math.abs(d));
    (function step(now) {
      if (!el.isConnected) return;
      const u = Math.min(1, (now - t0) / ms);
      num.textContent = Math.round(res.ovr0 + d * u);
      if (u < 1) requestAnimationFrame(step); else finish();
    })(t0);
  }

  // Jornal da temporada (a capa em si fica em ui/paper.js)
  function lede(res, cl) {
    const tb = res.table;
    const pos = tb.pos === 1 ? 'terminou campeão ' + D.da(tb.league) : 'terminou em ' + tb.pos + 'º lugar ' + D.na(tb.league);
    const perf = !res.games ? G.c.name + ' quase não entrou em campo, e ' + D.o(cl.name) + ' ' + pos + '.'
      : res.rating >= 7.5 && tb.pos >= 11 ? G.c.name + ' foi o nome ' + D.do(cl.name) + ', mas o time não acompanhou e ' + pos + '.'
      : res.rating >= 7.5 ? G.c.name + ' foi o nome ' + D.do(cl.name) + ', que ' + pos + '.'
      : res.rating >= 6.8 ? 'Com atuações seguras de ' + G.c.name + ', ' + D.o(cl.name) + ' ' + pos + '.'
      : 'Em temporada irregular de ' + G.c.name + ', ' + D.o(cl.name) + ' ' + pos + '.';
    return perf + (res.titles.length ? ' A torcida comemorou ' + res.titles.map(t => t.name).join(' e ') + '.' : '');
  }
  function showPaper(res, onClose) {
    // Temporada sem notícia: o jornal não sai (a manchete fica só no resumo); cartas reveladas seguem valendo
    if (res.quiet) {
      const up = U.tierReveal(G.c, res.ovr0, res.ovr1); if (up) save();
      const list = (up ? [null] : []).concat(res.cards || []);
      return list.length ? U.walkouts(G.c, list, onClose) : onClose && onClose();
    }
    const cl = club(res.club), [main, ...rest] = res.headlines, nick = G.c.name;
    // Foto da capa conforme a temporada: taça, maca (lesão), comemoração ou pose normal
    const won = res.titles.length || res.awards.some(a => a.id === 'ballon');
    const pose = won ? 'taca' : res.injury >= 25 ? 'maca' : res.games && res.rating >= 7.3 ? 'celebra' : res.games && res.rating < 6.3 ? 'triste' : 'normal';
    const caption = { taca: nick + ' ergue a taça', maca: nick + ' deixa o campo de maca', celebra: nick + ' comemora com a torcida', triste: nick + ' cabisbaixo após mais um tropeço' }[pose] || nick + ' com a camisa ' + D.do(cl.name);
    U.paper({ c: G.c, year: year() - 1, head: main, pose, kit: U.kitOf(cl.id), caption,
      stats: res.games + ' jogos · ' + seasonStats(res).map(([v, l]) => v + ' ' + l.toLowerCase()).join(' · ') + (res.games ? ' · nota ' + res.rating.toFixed(1).replace('.', ',') : ''),
      lede: lede(res, cl), subs: rest, column: res.column },
      // Depois do jornal: revelação da carta nova (subiu de faixa) e das cartas especiais da temporada
      () => { const up = U.tierReveal(G.c, res.ovr0, res.ovr1); if (up) save(); U.walkouts(G.c, (up ? [null] : []).concat(res.cards || []), onClose); });
  }

  // Mostra os blocos do resumo um de cada vez (troféus com mais destaque). Tocar mostra tudo.
  function reveal(skipNow, res) {
    const items = Array.from(screen.querySelectorAll('.rv'));
    let i = 0, timer = null, paper = false;
    const done = () => { screen.onclick = null; const h = $('skip-hint'); if (h) h.remove(); };
    // O jornal aparece uma vez por temporada, mesmo se a pessoa pular o resto
    const all = () => {
      clearTimeout(timer); items.forEach(el => el.classList.add('in')); done();
      if (!paper) { paper = true; showPaper(res); }
    };
    if (skipNow) return all();
    screen.onclick = all;
    (function next() {
      if (i >= items.length) return done();
      if (!items[0].isConnected) return; // já saiu desta tela
      const el = items[i++];
      el.classList.add('in');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if ((el.classList.contains('title-won') || el.classList.contains('ballon')) && !res.celebrated) sfx('fanfare');
      else if (el.classList.contains('move-line') && el.classList.contains('up')) sfx('levelup');
      else if (el.classList.contains('wc-call')) sfx('levelup');
      if (el.classList.contains('news') && !paper) {
        paper = true;
        screen.onclick = null;
        return setTimeout(() => { if (el.isConnected) showPaper(res, () => { screen.onclick = all; timer = setTimeout(next, 200); }); }, 300);
      }
      timer = setTimeout(next, el.classList.contains('title-won') ? 900 : el.classList.contains('award') ? 700 : el.classList.contains('hl') ? 450 : 220);
    })();
  }

  function summary(res, skipNow) {
    const feed = $('feed');
    if (!feed || !G.c) return; // a tela do resumo já não está aberta (ex.: voltou ao início durante a comemoração)
    // Só o lance mais marcante na tela; os outros ficam nos detalhes
    res.highlights.slice(0, 1).forEach(h => { const d = document.createElement('div'); d.className = 'rv hl'; d.textContent = h; feed.appendChild(d); });
    const dOvr = res.ovr1 - res.ovr0;
    const fin = S.mustRetire(G.c);
    const tb = res.table;
    const tableTxt = !res.games ? '' : tb.pos === 1 ? U.emo('🥇', 'sm') + ' Campeão ' + D.da(tb.league) + ' com ' + tb.pts + ' pontos'
      : tb.pos + 'º lugar ' + D.na(tb.league) + ' · ' + tb.pts + ' pts, a ' + tb.gap + ' do líder';
    const moveTxt = !res.move ? '' : res.move.dir === 'up' ? U.emo('⬆️', 'sm') + ' Acesso ' + D.paraA(res.move.toName) + '!' : U.emo('⬇️', 'sm') + ' Rebaixado ' + D.paraA(res.move.toName);
    // O que mexeu na nota: minutos, desempenho, lesão, idade e treinos (a soma bate com a variação)
    const great = res.games >= 15 && res.rating >= 7.5;
    const why = (great && dOvr <= 0 ? '<p class="why-note">Grande temporada! Seu desempenho valeu ' + ((v => (v > 0 ? '+' : '') + v)((res.why.find(w => w.k === 'perf') || { v: 0 }).v)) + ' na nota' + (res.ovr0 >= G.c.pot - 3 ? ', mas você já está perto do seu teto' : '') + '. Também rendeu fama, torcida e propostas melhores.</p>' : '') +
      (res.why.length ? '<ul class="why">' + res.why.map(w => '<li><span>' + esc(w.txt) + '</span><b class="' + (w.pot ? 'pot' : w.potDown ? 'down' : w.note ? 'note' : w.v > 0 ? 'up' : w.v < 0 ? 'down' : 'zero') + '">' + (w.pot ? 'teto ↑' : w.potDown ? 'teto ↓' : w.note ? U.emo('ℹ️', 'xs') : (w.v > 0 ? '+' : w.v < 0 ? '' : '±') + w.v) + '</b></li>').join('') + '</ul>' : '');
    const open = S.windowOpen(G.c);
    const contractTxt = G.c.contract > 0 ? 'Contrato: mais ' + G.c.contract + (G.c.contract > 1 ? ' temporadas' : ' temporada') + ' ' + D.no(esc(club(G.c.club).name)) : 'Seu contrato acabou: hora de decidir o futuro';
    // Copa do Mundo: convocação logo depois da temporada, em ano de Copa
    const wcNow = S.isWcYear(G.c) && G.c.wcYearDone !== year();
    const call = wcNow ? S.wcCall(G.c) : null;
    let wcBlock = '';
    if (call && call.called) wcBlock = '<div class="wc-call rv"><span class="wc-flag">' + U.flag(call.nation.flag) + '</span><div><b>Convocado para a Copa do Mundo ' + year() + '!</b><span>' + (call.starter ? 'Titular da seleção' : 'Vai como reserva (nota perto do corte de ' + call.cut + ')') + '</span></div></div>';
    else if (call && call.retired) { wcBlock = '<p class="wc-miss rv">' + U.emo('👋', 'sm') + ' Copa de ' + year() + ' sem você, que já se despediu da seleção.</p>'; G.c.wcYearDone = year(); save(); }
    else if (call && G.c.age >= 18) { wcBlock = '<p class="wc-miss rv">' + U.emo('🌍', 'sm') + ' Fora da Copa de ' + year() + ': a seleção pedia nota ' + call.cut + ', você tem ' + S.ovr(G.c) + '.</p>'; G.c.wcYearDone = year(); save(); }
    // Mundial de Clubes (a cada 4 anos): o clube classificado joga logo depois da temporada
    const cwcCall = S.isCwcYear(G.c) && G.c.cwcYearDone !== year() ? S.cwcCall(G.c) : null;
    if (cwcCall && cwcCall.called) wcBlock = '<div class="wc-call rv">' + crest(cwcCall.club.id, 'lg') + '<div><b>' + D.O(esc(cwcCall.club.name)) + ' está no Mundial de Clubes ' + year() + '!</b><span>' + (cwcCall.champ ? 'Vaga de campeão continental' : 'Vaga pelo ranking de clubes') + ' · 32 clubes, jogo a jogo</span></div></div>';
    else if (cwcCall) { G.c.cwcYearDone = year(); save(); }
    const goCwc = !!(cwcCall && cwcCall.called);
    const goWc = call && call.called;
    const goTour = goWc || goCwc, tourIntro = goWc ? U.wcIntro : U.cwcIntro;
    const tourLbl = goWc ? 'Copa do Mundo ' + year() + ' ' + U.emo('🌍', 'sm') : 'Mundial de Clubes ' + year() + ' ' + U.emo('🌐', 'sm');
    let actions;
    if (fin) actions = '<p class="lead">' + (res.farewell ? 'Fim da temporada de despedida. Hora de pendurar as chuteiras.' : (G.c.age >= S.RETIRE_AGE ? 'Aos ' + G.c.age + ' anos, o corpo pediu para parar.' : 'Com a carta em ' + S.ovr(G.c) + ', nenhum clube quis renovar. Hora de pendurar as chuteiras.')) + '</p><button class="btn" id="b-next">' + (goTour ? 'Última dança: ' + tourLbl : 'Ver sua carreira') + '</button>' + U.postBtn();
    else {
      actions = '<button class="btn" id="b-next">' + (goTour ? 'Jogar ' + (goWc ? 'a ' : 'o ') + tourLbl : open ? 'Janela de transferências' : 'Próxima temporada') + '</button>' + U.postBtn();
      if (S.canAnnounce(G.c)) actions += '<button class="btn ghost" id="b-farewell">Anunciar a última temporada<small>Torcida +10 e mais minutos · parar em alta rende pontos extras</small></button>';
      if (S.canRetire(G.c)) actions += '<button class="btn ghost" id="b-stop">Parar agora</button>';
    }
    $('after').innerHTML =
      (tableTxt ? '<p class="table-line rv">' + tableTxt + '</p>' : '') +
      (moveTxt ? '<div class="move-line rv ' + res.move.dir + '">' + moveTxt + '</div>' : '') +
      (res.loanBack ? '<p class="contract rv">Fim do empréstimo: você volta ' + D.ao(esc(club(res.loanBack.to).name)) + '.</p>' : '') +
      (res.titles.length ? '<div class="titles">' + res.titles.map(t => '<div class="title-won rv">' + trophy(titleType(t), 60, t.name) + '<span>Campeão<br><b>' + esc(t.name) + '</b></span></div>').join('') + '</div>' : '') +
      '<div class="awards">' + res.awards.map(a => '<div class="award rv' + (a.id === 'ballon' ? ' ballon' : '') + '">' + (a.id === 'ballon' ? trophy('ballon', 44) + ' ' : U.emo('🥇', 'sm') + ' ') + a.name + '</div>').join('') + '</div>' +
      '<div class="news rv"><div class="np">' + U.emo('📰', 'xs') + ' Nos jornais</div><p>' + esc(res.headlines[0] || '') + '</p></div>' +
      resenha(res) +
      wcBlock +
      // Detalhes (fechados): outros lances, o porquê da nota, técnico/torcida e contrato
      // Craque carregando um time fraco (a partir do 2º ano) e o clube crescendo com ele
      (res.carry >= 1 || res.grow ? '<p class="star-line rv">' + U.emo('💪', 'xs') + ' ' + (res.carry >= 1 ? 'Você carregou o time: <b>+' + res.carry + ' de força</b> nos jogos' : '') +
        (res.grow ? (res.carry >= 1 ? '. ' : '') + 'Com você, ' + D.o(esc(res.grow.name)) + ' se reforçou: força <b>' + res.grow.from + ' → ' + res.grow.to + '</b>' : '') + '</p>' : '') +
      // Pontos de evolução ganhos nesta temporada (e por quê)
      peLine(res.pe) +
      '<details class="more rv"><summary>Detalhes da temporada</summary>' +
      res.highlights.slice(1).map(h => '<div class="hl">' + esc(h) + '</div>').join('') +
      '<div class="card why-card"><p class="delta-in ' + (dOvr >= 0 ? 'up' : 'down') + '">Nota geral ' + res.ovr0 + ' → ' + res.ovr1 + ' (' + (dOvr >= 0 ? '+' : '') + dOvr + ')</p>' + why + '</div>' +
      '<p class="rel-delta">' + U.emo('👔', 'xs') + ' Técnico ' + res.coach0 + ' → ' + res.coach1 + ' · ' + U.emo('📣', 'xs') + ' Torcida ' + res.fans0 + ' → ' + res.fans1 + ' (' + S.relLabel(res.fans1) + ')</p>' +
      (fin ? '' : '<p class="contract">' + contractTxt + '</p>') + '</details>' + '<div class="rv">' + actions + '</div>';
    bar();
    reveal(skipNow, res);
    // Depois do resumo: as taças da temporada entram na estante, e aí segue
    const goOn = () => U.salaPlay(G.c, goTour ? tourIntro : afterSeason);
    $('b-next').onclick = goOn;
    // Postar nas redes: o post e as reações, e depois segue o mesmo caminho
    U.postBind({ kind: fin ? 'farewell' : 'season', res }, goOn);
    // Anunciar a última temporada já sai como post
    if ($('b-farewell')) $('b-farewell').onclick = () => { S.announce(G.c); save(); bar(); U.socialPost({ kind: 'announce' }, () => goTour ? tourIntro() : U.preseason()); };
    if ($('b-stop')) $('b-stop').onclick = U.finale;
  }

  // Para onde ir depois da temporada (e da Copa, se houver)
  function afterSeason() {
    if (S.mustRetire(G.c)) return U.finale();
    if (S.windowOpen(G.c)) return U.windowOffers();
    return S.benchCase(G.c) ? U.squad() : U.preseason();
  }

  Object.assign(U, { celebrate, season, lede, showPaper, reveal, summary, afterSeason });
})();
