// Interface — Carreira Relâmpago: 5 casas de 5 pênaltis montam Base, Auge, Último clube, G/A e Títulos (regras em engine/relampago.js).
// O link de desafio (?r=...) leva a semente e os chutes de quem desafiou: o amigo tem os mesmos sorteios e, no fim, as duas
// carreiras aparecem lado a lado. Tudo vai dentro do link (sem servidor).
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, G, esc, $, load, store, render, crest, sfx } = U;
  const KEY = 'climbix-relampago-desafio', NAME = 'climbix-relampago-nome';
  let run = null; // { seed, rounds, name, vs }

  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // n: nome, s: semente, p: cobranças de cada casa (1 = gol, 0 = errou), casas separadas por '-'
  const encode = r => b64(JSON.stringify({ n: String(r.name).slice(0, 20), s: r.seed, p: r.rounds.map(k => k.join('')).join('-') }));
  function decode(q) {
    try {
      const d = JSON.parse(unb64(String(q).slice(0, 300)));
      if (!d || !/^[01]{1,5}(-[01]{1,5}){4}$/.test(String(d.p)) || !(d.s >= 0 && d.s <= 4294967295)) return null;
      const p = String(d.p).split('-').map(k => k.split('').map(Number));
      if (S.rlCareer(d.s >>> 0, p).length !== 5) return null;
      return { n: String(d.n || 'Alguém').slice(0, 20), s: d.s >>> 0, p };
    } catch (e) { return null; }
  }
  const base = () => (window.CLIMBIX_HOME || location.origin + location.pathname.replace(/index\.html$/, ''));
  const active = () => { const d = load(KEY); return d && !d.done && Array.isArray(d.p) && Array.isArray(d.p[0]) ? d : null; }; // desafio no formato antigo é ignorado
  const trophyImg = (name, s) => U.trophy(name === 'Bola de Ouro' ? 'ballon' : /Libertadores/.test(name) ? 'lib' : /Campeões/.test(name) ? 'ucl' : /Copa do Mundo/.test(name) ? 'wc' : 'league', s, name);

  // Link recebido: guarda o desafio e segue para a tela inicial
  function fromLink() {
    const q = new URLSearchParams(location.search).get('r');
    if (!q) return;
    const d = decode(q);
    history.replaceState(null, '', location.pathname);
    if (d) store(KEY, Object.assign(d, { at: Date.now() }));
  }

  // ---------- tela inicial ----------
  function homeHtml() {
    const d = active();
    const card = d ? (() => { const f = S.rlScore(d.s, d.p);
      return '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" aria-label="Descartar desafio">' + U.ICON.x + '</button>' +
        '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>Desafio relâmpago</small><b>' + esc(d.n) + ' fez ' + f.total + ' pontos</b>' +
        '<span>Nota ' + f.grade + ' · mesmos sorteios pra você</span></div></div>' +
        '<button class="btn rl-go" id="rl-accept">Aceitar desafio</button></div>'; })() : '';
    return card + '<button class="hg rl-btn" id="b-relampago"><i>' + U.emo('⚡', 'sm') + '</i><b>Carreira Relâmpago</b><small>5 casas, 5 bolas cada. Desafie um amigo</small></button>';
  }
  function homeBind() {
    if ($('b-relampago')) $('b-relampago').onclick = () => intro();
    if ($('rl-accept')) $('rl-accept').onclick = () => intro();
    if ($('rl-x')) $('rl-x').onclick = () => { localStorage.removeItem(KEY); const c = document.querySelector('.rl-dz'); if (c) c.remove(); };
  }

  // ---------- regras ----------
  function intro() {
    G.c = null; U.bar();
    const d = active(), name = load(NAME) || '';
    render('<button class="back-link" id="rl-back">‹ Voltar</button>' +
      '<div class="eyebrow">Modo rápido</div><h2>Carreira Relâmpago</h2>' +
      (d ? '<div class="card dz-res rl-vs-top">' + U.emo('🎯', 'md') + '<div><small>Desafio de ' + esc(d.n) + '</small><b>' + S.rlScore(d.s, d.p).total + ' pontos pra bater</b><span>Os prêmios escondidos são os mesmos que ' + esc(d.n) + ' teve. Uma chance só.</span></div></div>' : '') +
      '<div class="card rl-rules">' +
        '<p><b>5 casas montam a carreira:</b> Base, Auge, Último clube, G/A e Títulos. Cada casa tem <b>5 bolas</b>.</p>' +
        '<p>' + U.emo('⚽', 'sm') + ' Nos clubes, cada bola esconde um time: vale <b>a primeira que entrar</b>. Errou as 5, fica o mais fraco.</p>' +
        '<p>' + U.emo('🏆', 'sm') + ' Em G/A e Títulos, <b>cada gol soma</b>.</p>' +
        '<p>' + U.emo('😤', 'sm') + ' O goleiro é <b>mais esperto</b> que no modo carreira, e a mira acelera a cada bola.</p>' +
      '</div>' +
      '<div class="field"><label for="rl-name">Seu nome no desafio</label><input id="rl-name" maxlength="20" autocomplete="nickname" placeholder="Ex.: Vitinho" value="' + esc(name) + '"></div>' +
      '<button class="btn" id="rl-start">' + (d ? 'Jogar o desafio' : 'Começar') + '</button>');
    $('rl-back').onclick = () => U.home();
    $('rl-start').onclick = () => {
      const n = ($('rl-name').value || '').trim().slice(0, 20) || 'Você';
      store(NAME, n === 'Você' ? '' : n);
      run = { seed: d ? d.s : S.rlNewSeed(), rounds: [], name: n, vs: d };
      play();
    };
  }

  // ---------- chute ----------
  function boardHtml(i) {
    const slots = S.rlCareer(run.seed, run.rounds);
    return '<div class="rl-board">' + S.RL_SLOTS.map((sl, k) => {
      const s = slots[k];
      return '<div class="rl-cell' + (k === i ? ' now' : '') + (s ? ' done' + (s.goal ? '' : ' out') : '') + '"><small>' + sl.name + '</small>' + (s ? coneMini(s.cone) : '<span class="rl-q">?</span>') + '</div>';
    }).join('') + '</div>';
  }
  // Prêmio pequeno (quadro de cima e resultado)
  function coneMini(c) {
    if (c.id) return crest(c.id, 'xs') + '<em>' + esc(c.name) + '</em>';
    if (c.ga) return '<b class="rl-ga">' + c.ga + '</b>';
    return '<span class="rl-tr">' + c.items.map(([n, q]) => trophyImg(n, 18) + '<i>' + q + '</i>').join('') + '</span><em>' + esc(c.name) + '</em>';
  }
  // Prêmio por extenso (revelado depois da cobrança)
  function prize(c) {
    let inner;
    if (c.id) inner = crest(c.id, 'sm') + '<em>' + esc(c.name) + '</em>';
    else if (c.ga) inner = '<b class="rl-ga">' + c.ga + '</b><em>gols + assistências</em>';
    else inner = '<span class="rl-tr">' + c.items.map(([n, q]) => '<span class="rl-ti">' + trophyImg(n, 26) + '<i>' + q + '×</i></span>').join('') + '</span><em>' + esc(c.name) + '</em>';
    return inner + (c.home ? '<small>voltou pra casa</small>' : '');
  }

  // Jogador das cobranças (só para o desenho do batedor e do uniforme): nasce da semente
  const BX = [100, 140, 180, 220, 260]; // as 5 bolas, da esquerda para a direita
  function kicker() {
    const c = S.newCareer({ name: run.name, pos: 'ATA', foot: 'D', country: 'Brasil', number: 9 }, run.seed);
    const slots = S.rlCareer(run.seed, run.rounds), cl = slots.filter(s => s.cone.id).pop();
    if (cl) c.club = cl.cone.id; // veste a camisa do último clube sorteado
    return c;
  }

  // Casa atual: abre a próxima quando a anterior acabou
  const prevOf = i => S.rlCareer(run.seed, run.rounds).slice(0, i).map(s => s.cone);
  function current() {
    const n = run.rounds.length;
    if (!n || S.rlRound(run.seed, n - 1, prevOf(n - 1), run.rounds[n - 1]).done) {
      if (n >= 5) return 5;
      run.rounds.push([]);
      return n;
    }
    return n - 1;
  }
  const dots = kicks => '<span class="rl-dots">' + [0, 1, 2, 3, 4].map(j => '<i class="' + (kicks[j] === 1 ? 'g' : kicks[j] === 0 ? 'x' : '') + '"></i>').join('') + '</span>';

  function play() {
    const i = current();
    if (i >= 5) return result();
    const sl = S.RL_SLOTS[i], kicks = run.rounds[i], k = kicks.length;
    const rule = i < 3 ? 'Vale o clube da primeira bola que entrar' : 'Cada gol das 5 bolas soma';
    render('<div class="rl-head"><div class="eyebrow">Casa ' + (i + 1) + ' de 5 · bola ' + (k + 1) + ' de 5</div><h2>' + sl.name + '</h2>' +
      '<div class="rl-rule"><span>' + rule + '</span>' + dots(kicks) + '</div></div>' + boardHtml(i) +
      '<div id="rl-kick"></div><div class="card rl-reveal" id="rl-reveal" hidden></div>');
    window.CRAQUE_KICK($('rl-kick'), { c: kicker(), moment: { type: 'cup' }, setup: S.rlKickSetup(i), keeperGuess: S.RL_KEEPER,
      ballX: BX[k], extraBalls: BX.slice(k + 1), onDone: ok => { kicks.push(ok ? 1 : 0); reveal(i, ok); } });
  }

  // Depois de cada cobrança: o que a bola valia; quando a casa acaba, o prêmio e os pontos
  function reveal(i, ok) {
    const kicks = run.rounds[i], r = S.rlRound(run.seed, i, prevOf(i), kicks), box = $('rl-reveal');
    if (!box) return;
    const k = $('rl-kick'); if (k) k.hidden = true;
    const dl = document.querySelector('.rl-dots'); if (dl) dl.outerHTML = dots(kicks);
    const club = i < 3;
    let msg, shown = r.cone;
    if (club) {
      if (ok) msg = 'Gol! Esse é o seu clube';
      else if (r.done) msg = 'Nenhuma entrou. Sobrou';
      else { msg = 'Errou. Essa bola era'; shown = r.hidden(kicks.length - 1); }
    } else msg = (ok ? 'Gol! ' : 'Errou. ') + r.goals + (r.goals === 1 ? ' gol em ' : ' gols em ') + kicks.length;
    box.hidden = false;
    box.className = 'card rl-reveal ' + (ok ? 'ok' : 'ko') + (club && !ok && !r.done ? ' lost' : '');
    box.innerHTML = '<small>' + msg + '</small>' +
      '<div class="rl-prize">' + prize(shown) + '</div>' + (r.done ? '<b class="rl-pts">+' + String(r.cone.pts).replace('.', ',') + ' pts</b>' : '') +
      '<button class="btn" id="rl-next">' + (!r.done ? 'Próxima bola' : i < 4 ? 'Próxima casa' : 'Ver a carreira') + '</button>';
    if (r.done) { const board = document.querySelector('.rl-board'); if (board) board.outerHTML = boardHtml(i); }
    sfx(ok ? 'goal' : 'kick');
    $('rl-next').onclick = play;
  }

  // ---------- resultado ----------
  function rows(f) {
    return f.slots.map(s => '<div class="rl-row' + (s.best ? ' best' : s.goal ? '' : ' out') + '"><small>' + s.name + '</small><span class="rl-val">' + coneVal(s.cone) + '</span><b><i>' + how(s) + '</i> +' + Math.round(s.pts) + '</b></div>').join('');
  }
  const how = s => s.cone.id ? (s.goal ? 'gol na ' + s.kicks + 'ª' : 'nenhuma entrou') : s.goals + ' de 5';
  function coneVal(c) {
    if (c.id) return crest(c.id, 'xs') + esc(c.name);
    if (c.ga) return c.ga + ' gols + assistências';
    return esc(c.name);
  }
  function result() {
    const f = S.rlScore(run.seed, run.rounds), vs = run.vs;
    const g = vs ? S.rlScore(vs.s, vs.p) : null;
    const diff = g ? f.total - g.total : 0;
    // Uma chance só por desafio (os prêmios escondidos já foram vistos)
    if (g) store(KEY, Object.assign(load(KEY) || {}, { done: true }));
    const combos = f.combos.length ? '<div class="rl-combos">' + f.combos.map(c => '<span>' + U.emo('🔥', 'xs') + ' <b>' + c.name + '</b> ' + c.desc + (c.pts ? ' (+' + c.pts + ')' : '') + '</span>').join('') + '</div>' : '';
    const col = (who, sc, me) => '<div class="rl-col' + (me ? ' me' : '') + '"><div class="rl-col-h"><b>' + esc(who) + '</b><span class="rl-grade g-' + sc.grade + '">' + sc.grade + '</span></div>' +
      sc.slots.map(s => '<div class="rl-mini' + (s.goal ? '' : ' out') + '"><small>' + s.name + '</small>' + coneMini(s.cone) + '</div>').join('') +
      '<div class="rl-col-t">' + sc.total + ' pts</div></div>';
    render('<div class="eyebrow">Carreira Relâmpago</div>' +
      (g ? '<h2>' + (diff > 0 ? 'Você ganhou!' : diff === 0 ? 'Empate!' : esc(vs.n) + ' ganhou') + '</h2>' +
        '<div class="rl-duel">' + col(run.name, f, true) + '<div class="rl-x">x</div>' + col(vs.n, g) + '</div>' +
        '<p class="rl-ask">Quem montou a melhor carreira?</p>'
      : '<h2>' + esc(run.name) + '</h2>') +
      '<div class="card rl-res"><div class="rl-score"><span class="rl-grade big g-' + f.grade + '">' + f.grade + '</span><div><b>' + f.total + ' pontos</b><small>máximo 120 · ' + f.slots.reduce((a, s) => a + s.goals, 0) + ' gols em ' + f.slots.reduce((a, s) => a + s.kicks, 0) + ' cobranças</small></div></div>' +
        rows(f) + combos + '</div>' +
      (window.CLIMBIX_SOLO ? '' : '<button class="btn" id="rl-share">' + U.emo('🎯', 'sm') + ' ' + (g && diff > 0 ? 'Devolver o desafio' : 'Desafiar um amigo') + '<small>Ele cobra com os mesmos times escondidos</small></button>') +
      '<button class="btn ghost" id="rl-again">Jogar de novo</button>' +
      '<button class="link-btn" id="rl-home">Voltar ao início</button>');
    $('rl-again').onclick = () => {
      run = { seed: S.rlNewSeed(), rounds: [], name: run.name, vs: null };
      play();
    };
    $('rl-home').onclick = () => U.home();
    const b = $('rl-share');
    if (b) b.onclick = () => share(b, f);
  }

  async function share(b, f) {
    const url = base() + '?r=' + encode(run);
    const get = k => f.slots.find(s => s.key === k).cone;
    const text = 'Minha Carreira Relâmpago no Climbix: ' + get('base').name + ' → ' + get('auge').name + ' → ' + get('ultimo').name + ', ' + get('ga').ga + ' G/A e ' + get('tit').name +
      '. ' + f.total + ' pontos (nota ' + f.grade + '). Cobra valendo os mesmos prêmios e vê quem monta a melhor carreira 😏';
    const old = b.innerHTML;
    try { if (navigator.share) { await navigator.share({ title: 'Climbix', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); b.innerHTML = 'Link copiado! Cole no WhatsApp'; setTimeout(() => { b.innerHTML = old; }, 2500); }
    catch (e) { prompt('Copie o link do desafio:', text + ' ' + url); }
  }

  Object.assign(U, { relampagoFromLink: fromLink, relampagoHome: homeHtml, relampagoHomeBind: homeBind, relampago: intro, relampagoEncode: encode, relampagoDecode: decode });
})();
