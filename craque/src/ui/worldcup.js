// Interface — Copa do Mundo
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- Copa do Mundo ----------
  // "do Brasil", "da Argentina", "de Portugal"
  // "o Brasil", "a Argentina", "Portugal"
  const theCountry = n => D.artPais(n) + n;
  const ofCountry = n => ({ 'o ': 'do ', 'a ': 'da ', 'os ': 'dos ', '': 'de ' }[D.artPais(n)]) + n;
  // Copa do Mundo ou Mundial de Clubes (mesma tela, mesmo motor)
  const isCwc = run => !!run && run.kind === 'cwc';
  const tName = run => (isCwc(run) ? 'Mundial de Clubes' : 'Copa do Mundo');
  // Nosso lado no placar: bandeira da seleção ou escudo do clube
  const usMark = run => (isCwc(run) ? crest(run.club, 'xs') : U.flag(D.NATION_BY_NAME[G.c.country].flag));
  const themMark = g => (g.crest ? crest(g.crest, 'xs') : U.flag(g.flag));
  const usName = run => (isCwc(run) ? esc(club(run.club).name) : esc(G.c.country));
  // Cores da bandeira para o fundo durante a Copa (no lugar do escudo do clube)
  const NAT_COLORS = {
    Brasil: ['#009C3B', '#FFDF00', '#002776'], Argentina: ['#74ACDF', '#FFFFFF', '#74ACDF'], Uruguai: ['#0038A8', '#FFFFFF', '#FCD116'],
    'Colômbia': ['#FCD116', '#003893', '#CE1126'], Portugal: ['#006600', '#FF0000', '#FFCC00'], Espanha: ['#AA151B', '#F1BF00', '#AA151B'],
    Inglaterra: ['#FFFFFF', '#CE1124', '#FFFFFF'], 'Itália': ['#009246', '#FFFFFF', '#CE2B37'], Alemanha: ['#000000', '#DD0000', '#FFCE00'],
    'França': ['#0055A4', '#FFFFFF', '#EF4135'], Holanda: ['#AE1C28', '#FFFFFF', '#21468B'], 'Bélgica': ['#000000', '#FDDA24', '#EF3340'],
    Turquia: ['#E30A17', '#FFFFFF', '#E30A17'], 'Escócia': ['#005EB8', '#FFFFFF', '#005EB8'], 'Grécia': ['#0D5EAF', '#FFFFFF', '#0D5EAF'],
    'Suíça': ['#DA291C', '#FFFFFF', '#DA291C'], 'Áustria': ['#ED2939', '#FFFFFF', '#ED2939'], Dinamarca: ['#C8102E', '#FFFFFF', '#C8102E'],
    Chile: ['#0039A6', '#FFFFFF', '#D52B1E'], Paraguai: ['#D52B1E', '#FFFFFF', '#0038A8'], Equador: ['#FFDD00', '#034EA2', '#ED1C24'],
    'México': ['#006847', '#FFFFFF', '#CE1126'], EUA: ['#3C3B6E', '#FFFFFF', '#B22234'], 'Japão': ['#FFFFFF', '#BC002D', '#FFFFFF'],
    'Coreia do Sul': ['#FFFFFF', '#CD2E3A', '#0047A0'], 'Arábia Saudita': ['#006C35', '#FFFFFF', '#006C35'], Catar: ['#8A1538', '#FFFFFF', '#8A1538'],
    Peru: ['#D91023', '#FFFFFF', '#D91023'], 'Bolívia': ['#D52B1E', '#F9E300', '#007934'], Venezuela: ['#FFCC00', '#00247D', '#CF142B'],
    'Croácia': ['#FF0000', '#FFFFFF', '#171796'], 'Sérvia': ['#C6363C', '#0C4076', '#FFFFFF'], Noruega: ['#BA0C2F', '#FFFFFF', '#00205B'],
    'Suécia': ['#006AA7', '#FECC02', '#006AA7'], 'Polônia': ['#FFFFFF', '#DC143C', '#DC143C'], 'República Tcheca': ['#FFFFFF', '#D7141A', '#11457E'],
    Marrocos: ['#C1272D', '#006233', '#C1272D'], Egito: ['#CE1126', '#FFFFFF', '#000000'], 'Austrália': ['#00008B', '#FFFFFF', '#FF0000'],
  };
  const natBg = () => U.clubBg('nat:' + G.c.country, NAT_COLORS[G.c.country] || ['#1F6B3E', '#F2C230', '#0B1F14']);
  // Placar escuro do lance (O5) com bandeiras (ou escudos no Mundial) e o nome de cada lado. mini: faixa baixa em cima do minigame
  const wcBoard = (run, g, mid, tag, mini) => '<div class="ob5-board wc-board' + (mini ? ' mini' : '') + '">' +
    '<span class="wcb-t">' + usMark(run) + '<small>' + usName(run) + '</small></span><b class="ob5-g">' + g.gf + '</b>' +
    '<span class="ob5-mid">' + mid + '<small>' + esc(tag) + '</small></span>' +
    '<b class="ob5-g">' + g.ga + '</b><span class="wcb-t">' + themMark(g) + '<small>' + esc(g.opp) + '</small></span></div>';
  const liveMin = t => '<span class="ob5-min"><i aria-hidden="true"></i>' + t + '</span>';
  // Rodapé do lance: decidir no automático e treinar (igual ao lance da temporada)
  const o5Foot = (type, k) => '<div class="ob5-foot"><button class="btn ghost ob5-auto" id="b-auto">Deixar o jogo decidir<small>' + Math.round(k.chance * 100) + '% pela sua carta</small></button>' +
    '<button class="ob5-train mom-train" id="b-train">' + U.emo('🏟️', 'xs') + ' Treinar antes</button></div>';
  const o5Body = type => '<div class="chips ob5-facts">' + U.miniFacts(type).join('') + '</div>' +
    '<details class="ob5-how"><summary>Como funciona o lance</summary><p>' + U.MINI_HOW[type] + '</p><div class="chips ob5-facts in">' + U.miniFacts(type).join('') + '</div></details>' +
    '<p class="st-lead ob5-q">Como você vai ' + { cup: 'bater', classico: 'bater', save: 'defender', tackle: 'marcar', pass: 'passar' }[type] + '?</p>' + U.styleBtns(type, true);

  // Como funciona o torneio: duas linhas de apoio com ícone (o cartão principal da tela é a convocação)
  const wcRules = () => '<div class="wc-rules"><p>' + U.emo('⚽', 'sm') + '<span>Fase de grupos com 3 jogos, depois mata-mata até a final.</span></p>' +
    '<p>' + U.emo('🥅', 'sm') + (G.c && G.c.pos === 'GOL' ? '<span>Empate no mata-mata vai para os <b>pênaltis</b>, e você defende o último.</span></p></div>'
      : '<span>Empate no mata-mata vai para os <b>pênaltis</b>, e você bate o último.</span></p></div>');

  function cwcIntro() {
    G.step = 'cwc';
    if (isCwc(G.c.wcRun) && G.c.wcRun.year === year()) { save(); return wcPlay(); }
    const call = S.cwcCall(G.c), cl = call.club;
    save();
    render(
      '<div class="wc-hero"><div class="eyebrow">Mundial de Clubes ' + year() + '</div><span class="wc-mark">' + crest(cl.id, 'xl') + '</span><h2>' + D.O(esc(cl.name)) + ' vai ao Mundial de Clubes!</h2>' +
      '<p class="lead">' + (call.champ ? 'Vaga de campeão continental. ' : 'Vaga pelo ranking de clubes. ') + '32 clubes de todos os continentes brigam pelo título. ' +
      (call.starter ? 'Você é peça-chave do time.' : G.c.pos === 'GOL' ? 'Você é o goleiro reserva: a vaga depende do titular.' : 'Você começa no banco, mas pode decidir.') + '</p></div>' +
      wcRules() +
      '<button class="btn" id="b-wc">' + (U.cfg.cups === 'sim' ? 'Simular o Mundial' : 'Começar o Mundial') + '</button>'
    );
    $('b-wc').onclick = () => { simAll = U.cfg.cups === 'sim'; S.cwcStart(G.c); save(); wcPlay(); };
  }

  function wcIntro() {
    G.step = 'wc';
    if (G.c.wcRun && !isCwc(G.c.wcRun) && G.c.wcRun.year === year()) { save(); return wcPlay(); }
    const call = S.wcCall(G.c);
    save();
    natBg();
    render(
      '<div class="wc-hero"><div class="eyebrow">Copa do Mundo ' + year() + '</div><span class="wc-mark"><span class="wc-bigflag">' + U.flag(call.nation.flag) + '</span></span><h2>Convocado pela seleção ' + ofCountry(G.c.country) + '!</h2>' +
      '<p class="lead">' + (call.starter ? 'Você chega como titular. O país inteiro está de olho.' : (G.c.pos === 'GOL' ? 'Você vai como goleiro reserva: se o titular se machucar ou for poupado, a vaga é sua.' : 'Você vai como reserva: entra no segundo tempo e pode decidir.')) + '</p></div>' +
      wcRules() +
      '<button class="btn" id="b-wc">' + (U.cfg.cups === 'sim' ? 'Simular a Copa' : 'Começar a Copa') + '</button>'
    );
    if (G.c.wcCallShown !== year()) { G.c.wcCallShown = year(); save(); U.callUp(G.c, call); } // lista da seleção (motion.js)
    $('b-wc').onclick = () => { simAll = U.cfg.cups === 'sim'; S.wcStart(G.c); save(); wcPlay(); };
  }

  // Tabela do grupo (engine/worldcup.js, run.tbl): os dois primeiros passam
  const teamName = (run, id) => (id === 'me' ? usName(run) : esc(isCwc(run) ? S.cwcTeam(id).name : id));
  const teamMark = (run, id) => (id === 'me' ? usMark(run) : isCwc(run) ? crest(id, 'xs') : U.flag(D.NATION_BY_NAME[id].flag));
  function groupTable(run, n) {
    // Até fechar o primeiro jogo (que pode parar no lance) o motor ainda não montou a tabela: os quatro do grupo aparecem
    // zerados, para a tela não começar vazia
    const t = S.wcGroupTableAt(run, n) || (run.stage === 0 && run.group ? ['me'].concat(run.group).map(id => ({ id, pts: 0, gf: 0, ga: 0 })) : null);
    if (!t) return '';
    const played = Math.min(n, 3);
    return '<div class="wc-tbl"><div class="wt-h"><span>Grupo · ' + (played >= 3 ? 'final' : played ? 'rodada ' + played + ' de 3' : 'antes da estreia') + '</span><span>Pts</span><span>Saldo</span></div>' +
      t.map((x, i) => '<div class="wt-r' + (x.id === 'me' ? ' me' : '') + (i < 2 ? ' in' : '') + '" data-id="' + esc(x.id) + '" data-pts="' + x.pts + '"><span><i>' + (i + 1) + '</i>' + teamMark(run, x.id) + ' ' + teamName(run, x.id) + '</span><b>' + x.pts + '</b><span>' + (x.gf - x.ga > 0 ? '+' : '') + (x.gf - x.ga) + '</span></div>').join('') +
      '<p class="wt-n">Os dois primeiros vão ao mata-mata</p></div>';
  }
  // Um jogo por vez na lista (o atual); os anteriores viram fichinhas com o placar, para a tabela caber na tela
  // n: jogos já mostrados até o fim (o que está rolando ainda não entra na tabela)
  function drawGroup(run, n) {
    const el = $('wc-tbl');
    if (!el) return;
    // As linhas que trocam de posição deslizam até o lugar novo; os pontos que mudaram dão um pulinho
    const before = {};
    el.querySelectorAll('.wt-r').forEach(r => { before[r.dataset.id] = [r.getBoundingClientRect().top, r.dataset.pts]; });
    el.innerHTML = run.games.length <= 3 ? groupTable(run, n) : ''; // no mata-mata a tabela sai de cena
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.querySelectorAll('.wt-r').forEach(r => {
      const b = before[r.dataset.id];
      if (!b) return;
      const dy = (b[0] - r.getBoundingClientRect().top) / U.zk();
      if (dy) r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.3, 1.2, .5, 1)', delay: 150 });
      if (b[1] !== r.dataset.pts) r.querySelector('b').animate([{ transform: 'scale(1.6)', color: '#F2C230' }, { transform: 'none' }], { duration: 600, easing: 'ease-out', delay: 150 });
    });
    const past = run.games.slice(0, -1);
    const pathEl = $('wc-path');
    if (pathEl) pathEl.innerHTML = past.map(g => {
      const r = g.pens && g.pensWon !== undefined ? (g.pensWon ? 'w' : 'l') : g.gf > g.ga ? 'w' : g.gf < g.ga ? 'l' : 'd';
      return '<span class="wp ' + r + '"><small>' + esc(g.stage.replace(/^Grupo · (\d)º jogo$/, 'Jogo $1').replace(' de final', '')) + '</small><b>' + g.gf + '×' + g.ga + '</b>' + themMark(g) + (g.pens && g.pensWon !== undefined ? '<i>pên.</i>' : '') + '</span>';
    }).join('');
  }

  function wcRow(g) {
    const run = G.c.wcRun;
    const res = g.gf > g.ga ? 'w' : g.gf < g.ga ? 'l' : 'd';
    const pen = g.pens ? (g.pensWon === undefined ? '<span class="tag gold">Pênaltis!</span>' : g.pensWon ? '<span class="tag green">Venceu nos pênaltis</span>' : '<span class="tag red">Perdeu nos pênaltis</span>') : '';
    const me = (g.g ? U.emo('⚽', 'xs').repeat(Math.min(g.g, 4)) + (g.g > 4 ? '+' : '') + ' ' : '') + (g.a ? U.emo('👟', 'xs').repeat(Math.min(g.a, 3)) : '');
    return '<div class="wc-game ' + (g.pens && g.pensWon !== undefined ? (g.pensWon ? 'w' : 'l') : res) + '"><span class="st">' + esc(g.stage) + '</span>' +
      '<div class="line"><span class="us">' + usMark(run) + '</span><b>' + g.gf + ' × ' + g.ga + '</b><span class="them">' + themMark(g) + ' ' + esc(g.opp) + '</span></div>' +
      (me ? '<span class="me">' + me + '</span>' : '') + pen +
      (g.moment ? '<span class="mom ' + (g.momentOk ? 'ok' : 'ko') + '">' + g.moment.minute + "' " + ({
        pen: g.momentOk ? 'pênalti convertido' : 'pênalti desperdiçado', fk: g.momentOk ? 'falta convertida' : 'falta desperdiçada',
        save: g.momentOk ? (g.momentWhy === 'fora' ? 'batedor chutou para fora' : 'pênalti defendido') : 'pênalti sofrido', tackle: g.momentOk ? 'desarme salvador' : 'atacante passou',
        pass: g.momentOk ? 'passe para gol' : g.momentWhy === 'impedido' ? 'atacante impedido' : 'passe cortado',
      }[g.moment.type]) + (g.at ? ' no ' + g.at[0] + ' × ' + g.at[1] : '') + '</span>' : '') +
      (S.defKick(G.c.pos) && g.cs && !g.live ? '<span class="mom ok">' + U.emo('🧤', 'xs') + ' sem sofrer gol</span>' : '') +
      (g.rating ? '<span class="rt' + (g.motm ? ' motm' : '') + '">' + (g.motm ? U.emo('⭐', 'xs') + ' Craque do jogo · ' : 'Nota ') + g.rating.toFixed(1).replace('.', ',') + '</span>' : '') +
      (g.ev && g.ev.length && !g.live ? '<div class="gls">' + g.ev.map(e => goalLine(e, g)).join('') + '</div>' : '') +
      (g.other && !g.live ? '<span class="oth">Na rodada: ' + teamMark(run, g.other.a) + ' ' + teamName(run, g.other.a) + ' ' + g.other.ga + ' × ' + g.other.gb + ' ' + teamName(run, g.other.b) + ' ' + teamMark(run, g.other.b) + '</span>' : '') +
      (g.groupEnd ? '<div class="grp ' + (g.groupEnd.pass ? 'ok' : 'ko') + '">' + (g.groupEnd.pass ? 'Classificado ' + (g.groupEnd.pos ? 'em ' + g.groupEnd.pos + 'º ' : '') + 'com ' + D.plural(g.groupEnd.pts, 'ponto', 'pontos') : 'Eliminado na fase de grupos' + (g.groupEnd.pos ? ' em ' + g.groupEnd.pos + 'º' : '') + ' (' + g.groupEnd.pts + ' pts)') + '</div>' : '') + '</div>';
  }

  // Jogo ao vivo: relógio correndo e o placar mudando gol a gol
  function goalLine(e, g) {
    const run = G.c.wcRun;
    const txt = e.s === 't' ? esc(g.opp) + ' marca' + (e.k ? ' no lance decisivo' : '')
      : e.w === 'g' ? '<b>Gol seu!</b>' + (e.k ? ' No lance decisivo' : '') : e.w === 'a' ? usName(run) + ' marca, <b>assistência sua</b>' : usName(run) + ' marca';
    return '<div class="gl ' + e.s + '"><i>' + e.m + "'</i>" + (e.s === 'u' ? U.emo('⚽', 'xs') : U.emo('🥅', 'xs')) + ' ' + txt + '</div>';
  }
  function liveRow(g) {
    const el = document.createElement('div');
    el.className = 'wc-game playing enter';
    el.innerHTML = '<span class="st">' + esc(g.stage) + ' <i class="clk">0\'</i></span>' +
      '<div class="line"><span class="us">' + usMark(G.c.wcRun) + '</span><b class="sc">0 × 0</b><span class="them">' + themMark(g) + ' ' + esc(g.opp) + '</span></div><div class="gls"></div>';
    return el;
  }
  // Simular: "Pular jogo" termina a partida atual na hora; "Simular até o fim" joga o resto sozinho
  // (lances e pênaltis pela chance da carta)
  let simAll = false;
  // Corre o relógio de "from" até "to"; cada gol aparece no seu minuto (com uma pausa para comemorar)
  // spd(): 0 normal, 1 acelerado (toque na tela), 2 instantâneo (pular/simular)
  function runClock(el, g, from, to, spd, done) {
    const ev = g.ev || [], sc = el.querySelector('.sc'), clk = el.querySelector('.clk'), gls = el.querySelector('.gls');
    let u = 0, t = 0, m = from;
    ev.filter(e => e.m < from).forEach(e => { if (e.s === 'u') u++; else t++; gls.insertAdjacentHTML('beforeend', goalLine(e, g)); });
    sc.textContent = u + ' × ' + t;
    const tick = () => {
      if (!el.isConnected) return;
      const now = ev.filter(e => e.m === m);
      clk.textContent = m + "'";
      const sp = spd();
      let pause = sp === 2 ? 0 : sp ? 3 : 24;
      now.forEach(e => {
        if (e.s === 'u') u++; else t++;
        sc.textContent = u + ' × ' + t;
        gls.insertAdjacentHTML('beforeend', goalLine(e, g));
        el.classList.remove('goal-u', 'goal-t'); void el.offsetWidth; el.classList.add('goal-' + e.s);
        if (sp < 2) sfx('tick'); // torcida só no fim do jogo: em todo gol as comemorações se atropelavam
        pause = sp === 2 ? 0 : sp ? 80 : 750;
      });
      if (m >= to) return done();
      m++;
      if (pause === 0) return tick(); // instantâneo: termina o jogo de uma vez
      timer = setTimeout(tick, pause);
    };
    let timer = null;
    // "Pular jogo" no meio de uma pausa (comemoração de gol): segue na hora
    el._now = () => { clearTimeout(timer); tick(); };
    tick();
  }

  function wcPlay() {
    const run = G.c.wcRun;
    G.step = isCwc(run) ? 'cwc' : 'wc';
    if (!isCwc(run)) natBg();
    const last = run.games[run.games.length - 1];
    const resume = last && last.resumeAt !== undefined && !last.live ? last : null; // jogo que continua depois do lance
    render('<div class="eyebrow">' + tName(run) + ' ' + run.year + ' · ' + usMark(run) + ' ' + usName(run) + '</div>' +
      '<div id="wc-tbl"></div><div class="wc-path" id="wc-path"></div><div class="wc-list" id="wc-list">' + run.games.filter(g => !g.live && g !== resume).map(wcRow).join('') + '</div><div id="wc-after"></div>' +
      '<div class="wc-sim" id="wc-sim"><button class="tool" id="b-simg">' + U.emo('⏩', 'xs') + ' Pular jogo</button><button class="tool" id="b-sima">' + U.emo('⏭️', 'xs') + ' Simular até o fim</button></div>' +
      '<p class="skip-hint" id="wc-hint">Toque para acelerar</p>');
    let fast = false, skip = false;
    const isFast = () => fast || skip || simAll;
    const spd = () => (skip || simAll ? 2 : fast ? 1 : 0);
    setTimeout(() => { screen.onclick = () => { fast = true; }; }, 60);
    if (simAll) $('wc-sim').classList.add('on');
    $('b-simg').onclick = e => {
      e.stopPropagation(); skip = true;
      const pl = document.querySelector('.wc-game.playing:not(.paused)');
      if (pl && pl._now) pl._now();
    };
    $('b-sima').onclick = e => {
      e.stopPropagation();
      U.ask('Simular até o fim?', 'Os jogos restantes passam direto. Seus lances decisivos e pênaltis serão decididos pela chance da sua carta.', 'Simular', () => {
        if (!$('wc-sim')) return; // o torneio acabou enquanto a pergunta estava aberta: já está na tela final
        simAll = true;
        $('wc-sim').classList.add('on');
        // Parado num lance ou nos pênaltis: decide agora e segue
        if (run.live) { S.wcMomentAuto(G.c); save(); return wcPlay(); }
        if (run.pending) { S.wcPensAuto(G.c); save(); return wcPlay(); }
      });
    };
    const list = $('wc-list');
    drawGroup(run, run.games.filter(g => !g.live && g !== resume).length);
    // Troca a linha ao vivo pela linha final (nota, lance, craque do jogo)
    const finish = (el, g) => {
      const div = document.createElement('div');
      div.innerHTML = wcRow(g);
      el.replaceWith(div.firstChild);
      drawGroup(run, run.games.length);
      if (!simAll) sfx(g.gf > g.ga ? 'cheer' : g.gf < g.ga ? 'miss' : 'whistle');
    };
    const next = () => {
      if (!list.isConnected) return;
      skip = false; // "Pular jogo" vale só para a partida em andamento
      // Lance decisivo ou pênaltis pendentes (inclusive ao voltar para o jogo)
      if (run.live) return simAll || U.cfg.moments === 'auto' ? (S.wcMomentAuto(G.c), save(), wcPlay()) : wcLive();
      if (run.pending) return simAll || U.cfg.moments === 'auto' ? (S.wcPensAuto(G.c), save(), wcPlay()) : wcPens();
      const g = S.wcNext(G.c);
      save();
      if (!g) return wcFinal();
      drawGroup(run, run.games.length - 1);
      if (!g.ev) { // jogo salvo antes da minutagem
        if (g.live) return wcLive();
        const div = document.createElement('div'); div.innerHTML = wcRow(g); list.appendChild(div.firstChild);
        return setTimeout(next, simAll ? 40 : fast ? 250 : 1300);
      }
      const el = liveRow(g);
      list.appendChild(el);
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Jogo com lance: o relógio para no minuto do lance
      if (g.live) return runClock(el, g, 0, g.moment.minute, spd, () => {
        el.classList.add('paused');
        if (simAll || U.cfg.moments === 'auto') { S.wcMomentAuto(G.c); save(); return wcPlay(); }
        setTimeout(wcLive, isFast() ? 100 : 500);
      });
      runClock(el, g, 0, 90, spd, () => { finish(el, g); setTimeout(next, simAll ? 40 : isFast() ? 200 : 900); });
    };
    if (resume) {
      // Depois do lance: o relógio volta a correr do minuto do lance até o apito final
      const el = liveRow(resume);
      list.appendChild(el);
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return runClock(el, resume, resume.resumeAt, 90, spd, () => {
        delete resume.resumeAt; save();
        finish(el, resume);
        setTimeout(next, simAll ? 40 : isFast() ? 200 : 1000);
      });
    }
    setTimeout(next, simAll ? 40 : 500);
  }

  // Lance decisivo nos minutos finais: pênalti ou falta a favor, no minigame
  function wcLive() {
    screen.onclick = null;
    const run = G.c.wcRun, g = run.games[run.games.length - 1], m = g && g.moment;
    // Copa salva marcando lance ao vivo num jogo sem lance (aconteceu num iPhone): libera e segue a Copa
    if (!g || !m) { run.live = false; run.momentStarted = false; if (g) g.live = false; save(); return wcPlay(); }
    // Fechou o jogo no meio da cobrança: a chance decide
    if (run.momentStarted) { S.wcMomentAuto(G.c); save(); return wcPlay(); }
    const type = S.kickSetupType({ kick: m.type }), def = type === 'save' || type === 'tackle';
    const k = S.kickSetup(G.c, type, S.autoStyle(G.c, type)), d = g.gf - g.ga, ko = run.stage >= 3;
    // No fim do jogo o lance decide; antes disso ele muda o placar e o resto do jogo ainda acontece
    const late = m.minute >= 78 && !(g.rest && (g.rest.gf || g.rest.ga)), left = 90 - m.minute; // ainda tem gol depois: não é o fim
    const gain = d === 0 ? (late ? (ko ? 'classifica' : 'vitória') : 'sai na frente') : d === -1 ? (late ? (ko ? 'leva para os pênaltis' : 'empata') : 'empata') : d >= 1 ? 'amplia' : 'diminui';
    // Defensor: o que acontece se falhar (gol deles)
    const lose = d >= 2 ? 'diminuem' : d === 1 ? (late && ko ? 'empatam e levam para os pênaltis' : 'empatam') : d === 0 ? (late ? (ko ? 'eliminado' : 'derrota') : 'saem na frente') : 'aumentam';
    const cwc = isCwc(run), who = cwc ? D.o(esc(club(run.club).name)) : theCountry(G.c.country);
    const h = $('wc-hint'); if (h) h.remove();
    // O que está em jogo nesta fase
    const NEXT = { 3: 'vai às quartas', 4: 'vai à semifinal', 5: 'vai à final', 6: cwc ? 'é campeão mundial' : 'é campeão do mundo' };
    const ctx = (late ? 'Reta final! ' : 'Ainda faltam ' + left + ' minutos. ') + (ko ? 'Mata-mata: quem vencer ' + NEXT[run.stage] + '.' : run.stage === 2 ? 'Último jogo do grupo: ' + run.pts + (run.pts === 1 ? ' ponto' : ' pontos') + ' até aqui.' : 'Fase de grupos: ' + run.pts + (run.pts === 1 ? ' ponto' : ' pontos') + ' em ' + run.stage + (run.stage === 1 ? ' jogo.' : ' jogos.'));
    const paused = document.querySelector('.wc-game.paused'); if (paused) paused.style.display = 'none'; // o lance já mostra placar e minuto
    const tag = g.stage;
    // Estilo ousado (O5): placar escuro com bandeiras, título grande, o que vale em duas linhas (U.lanceStakes, igual ao lance da temporada) e os dois estilos como cartões grandes
    $('wc-after').innerHTML = '<div class="wc-o5">' + wcBoard(run, g, liveMin(m.minute + "'"), tag) +
      '<div class="ob5-head"><h2>' + ({ pen: 'Pênalti para ' + who + '!', fk: 'Falta perigosa na entrada da área!', save: 'Pênalti contra ' + who + '!', tackle: 'Contra-ataque perigoso!', pass: 'A bola é sua: enfie para o atacante!' }[m.type]) + '</h2>' +
      '<p class="ob5-txt">' + esc(ctx) + '</p>' +
      U.lanceStakes(def ? (type === 'save' ? 'Defendeu: segura o placar · Sofreu: ' : 'Desarmou: segura o placar · Passou: ') + lose : 'Converteu: ' + gain) + '</div>' + o5Body(type) + o5Foot(type, k) + '</div>';
    $('wc-after').scrollIntoView({ block: 'start', behavior: 'smooth' });
    sfx('whistle');
    $('b-train').onclick = () => U.training(type);
    U.bindStyle(m, U.gateTrain(type, () => {
      run.momentStarted = true; save();
      render(wcBoard(run, g, liveMin(m.minute + "'"), tag, true) + '<div id="kick"></div>');
      // Saiu da tela: ao retomar, a chance decide. O resultado salva assim que sai (a 2ª chamada de S.wcMoment não faz nada)
      U.playMini($('kick'), type, (ok, why) => { if (!$('kick')) return; S.wcMoment(G.c, ok, why); save(); wcPlay(); }, null, { vs: g.opp, mine: cwc ? club(run.club).name : G.c.country }, m.style,
        (ok, why) => { if (!$('kick')) return; S.wcMoment(G.c, ok, why); save(); });
    }));
    $('b-auto').onclick = () => { S.wcMomentAuto(G.c); save(); wcPlay(); };
  }

  function wcPens() {
    screen.onclick = null;
    const run = G.c.wcRun, g = run.games[run.games.length - 1];
    // Fechou o jogo no meio da cobrança: a chance decide
    if (run.pensStarted) { S.wcPensAuto(G.c); run.pensStarted = false; save(); return wcPlay(); }
    // Goleiro defende a última cobrança; os outros batem a última
    const gk = S.wcPensType(G.c) === 'save', type = gk ? 'save' : 'cup';
    // "Deixar decidir" usa o estilo de sempre (S.wcPensAuto); escolher o outro estilo só muda o minigame, como no lance da temporada
    const k = S.kickSetup(G.c, type), ps = {}, cwc = isCwc(run);
    const tag = g.stage;
    $('wc-after').innerHTML = '<div class="wc-o5">' + wcBoard(run, g, liveMin('Pênaltis'), tag) +
      '<div class="ob5-head"><h2>' + (gk ? 'Defenda o último!' : 'Você bate o último!') + '</h2>' +
      '<p class="ob5-txt">Terminou ' + g.gf + ' × ' + g.ga + ' e a disputa está empatada. ' + (gk ? 'O último batedor deles vem para a bola.' : 'A última cobrança é sua.') + '</p>' +
      U.lanceStakes((gk ? 'Defendeu: ' : 'Converteu: ') + (run.stage === 6 ? (cwc ? 'campeão mundial' : 'campeão do mundo') : cwc ? 'o time avança' : 'a seleção avança') + ' · ' + (gk ? 'Sofreu' : 'Errou') + ': eliminado') + '</div>' +
      o5Body(type) + o5Foot(type, k) + '</div>';
    const rows = document.querySelectorAll('#wc-list > .wc-game'); if (rows.length) rows[rows.length - 1].style.display = 'none'; // o placar já mostra o jogo
    $('wc-after').scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('b-train').onclick = () => U.training(type);
    U.bindStyle(ps, U.gateTrain(type, () => {
      run.pensStarted = true; save();
      render(wcBoard(run, g, liveMin('Pênaltis'), tag, true) + '<div id="kick"></div>');
      const pens = ok => { if (!$('kick')) return; run.pensStarted = false; S.wcPens(G.c, ok); save(); }; // vale na hora da cobrança (a 2ª chamada não faz nada)
      U.playMini($('kick'), type, ok => { if (!$('kick')) return; pens(ok); wcPlay(); }, null, { vs: g.opp, mine: cwc ? club(run.club).name : G.c.country }, ps.style, pens);
    }));
    $('b-auto').onclick = () => { S.wcPensAuto(G.c); save(); wcPlay(); };
  }

  function wcFinal() {
    screen.onclick = null;
    const run = G.c.wcRun, cwc = isCwc(run);
    if (cwc) G.c.cwcYearDone = run.year; else G.c.wcYearDone = run.year;
    save();
    bar();
    const h = $('wc-hint'); if (h) h.remove();
    const sim = $('wc-sim'); if (sim) sim.remove();
    simAll = false;
    // Fim no estilo ousado (O2): faixa dourada (campeão), prateada (vice) ou da fase em que caiu, e os números em blocos
    const last = run.games[run.games.length - 1], big = cwc ? crest(run.club, 'xl') : '<span class="wc-bigflag">' + usMark(run) + '</span>';
    const PH = { 'Oitavas de final': 'nas oitavas', 'Quartas de final': 'nas quartas', Semifinal: 'na semifinal' };
    // Artigo antes da bandeira ou do escudo: "para a 🇩🇪 Alemanha", "para os 🇺🇸 EUA", "para o [escudo] Bayern"
    const art = g => (g.crest ? D.o(g.opp).slice(0, -g.opp.length) : D.artPais(g.opp));
    const lost = g => (g ? 'para ' + art(g) + themMark(g) + ' ' + esc(g.opp) + (g.pens ? ' nos pênaltis (' + g.gf + ' × ' + g.ga + ')' : ' por ' + g.gf + ' × ' + g.ga) : '');
    const ge = last && last.groupEnd;
    const end = run.champion
      ? '<div class="wc-end champ">' + (cwc ? trophy('cwc', 96, 'Mundial de Clubes') : trophy('wc', 96)) + '<b class="wc-band gold">' + (cwc ? 'Campeão mundial!' : 'Campeão do mundo!') + '</b><span class="wc-end-who">' + usMark(run) + ' ' + usName(run) + ' · ' + run.year + '</span></div>'
      : run.reached === 'Final'
        ? '<div class="wc-end vice">' + big + '<b class="wc-band silver">' + (cwc ? 'Vice-campeão mundial' : 'Vice-campeão do mundo') + '</b><span class="wc-end-who">Perdeu a final ' + lost(last) + '</span></div>'
        : /^(Grupo|Fase de grupos)/.test(run.reached)
          ? '<div class="wc-end out">' + big + '<b class="wc-band phase">Eliminado na fase de grupos</b><span class="wc-end-who">' + (ge ? (ge.pos ? ge.pos + 'º lugar no grupo com ' : 'Terminou com ') + D.plural(ge.pts, 'ponto', 'pontos') : usName(run) + ' · ' + run.year) + '</span></div>'
          : '<div class="wc-end out">' + big + '<b class="wc-band phase">Eliminado ' + (PH[run.reached] || esc(run.reached.toLowerCase())) + '</b><span class="wc-end-who">Caiu ' + lost(last) + '</span></div>';
    const n = (v, one, many) => '<span><b>' + v + '</b>' + (v === 1 ? one : many) + '</span>';
    // O fim num cartão só: bandeira (ou escudo), a faixa do resultado e, embaixo, os seus números no torneio
    $('wc-after').innerHTML = end.replace(/<\/div>$/, '') +
      '<p class="sx-lbl">' + (cwc ? 'Seu Mundial' : 'Sua Copa') + '</p><div class="wc-end-stats">' + n(run.games.length, 'jogo', 'jogos') + (S.defKick(G.c.pos)
        ? n(run.games.filter(x => x.cs).length, 'sem sofrer gol', 'sem sofrer gol') + (run.g ? n(run.g, 'gol', 'gols') : '')
        : n(run.g, 'gol', 'gols') + n(run.a, 'assistência', 'assistências')) + '</div></div>' +
      '<button class="btn" id="b-next">' + (S.mustRetire(G.c) ? 'Ver sua carreira' : 'Seguir a carreira') + '</button>';
    if (run.champion) {
      const btn = $('b-next');
      U.celebrate([{ art: cwc ? trophy('cwc', 150, 'Mundial de Clubes') : trophy('wc', 150), top: cwc ? 'Campeão mundial!' : 'Campeão do mundo!', name: (cwc ? 'Mundial de Clubes ' : 'Copa do Mundo ') + run.year }],
        () => { if (btn.isConnected) (cwc ? U.clubWorldPaper : U.worldCupPaper)(G.c, run, () => run.card && U.walkout(G.c, null, run.card)); });
    }
    $('wc-after').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('b-next').onclick = () => { U.clubBg(G.c.club); U.salaRecord(G.c); U.afterSeason(); };
  }

  Object.assign(U, { natBg, theCountry, ofCountry, cwcIntro, wcIntro, wcRow, wcPlay, wcLive, wcPens, wcFinal });
})();
