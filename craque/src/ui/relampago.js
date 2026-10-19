// Interface — Carreira Relâmpago: 5 chutes nos cones montam Base, Auge, Último clube, G/A e Títulos (regras em engine/relampago.js).
// O link de desafio (?r=...) leva a semente e os chutes de quem desafiou: o amigo joga os mesmos cones e, no fim, as duas
// carreiras aparecem lado a lado. Tudo vai dentro do link (sem servidor).
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, G, esc, $, load, store, render, crest, sfx } = U;
  const KEY = 'climbix-relampago-desafio', NAME = 'climbix-relampago-nome';
  const CX = k => 60 + k * 60, CONE_Y = 176, BALL = { x: 180, y: 276 };
  let run = null; // { seed, picks, name, vs }

  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // n: nome, s: semente, p: posições chutadas (5 = pra fora)
  const encode = r => b64(JSON.stringify({ n: String(r.name).slice(0, 20), s: r.seed, p: r.picks.join('') }));
  function decode(q) {
    try {
      const d = JSON.parse(unb64(String(q).slice(0, 300)));
      if (!d || !/^[0-5]{5}$/.test(String(d.p)) || !(d.s >= 0 && d.s <= 4294967295)) return null;
      return { n: String(d.n || 'Alguém').slice(0, 20), s: d.s >>> 0, p: String(d.p).split('').map(Number) };
    } catch (e) { return null; }
  }
  const base = () => (window.CLIMBIX_HOME || location.origin + location.pathname.replace(/index\.html$/, ''));
  const active = () => { const d = load(KEY); return d && !d.done ? d : null; };
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
  const tri = u => 1 - 4 * Math.abs(((u % 1) + 1) % 1 - 0.5);
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
        '<span>Nota ' + f.grade + ' · mesmos cones pra você</span></div></div>' +
        '<button class="btn rl-go" id="rl-accept">Aceitar desafio</button></div>'; })() : '';
    return card + '<button class="hg rl-btn" id="b-relampago"><i>' + U.emo('⚡', 'sm') + '</i><b>Carreira Relâmpago</b><small>5 chutes, 1 minuto. Desafie um amigo</small></button>';
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
      (d ? '<div class="card dz-res rl-vs-top">' + U.emo('🎯', 'md') + '<div><small>Desafio de ' + esc(d.n) + '</small><b>' + S.rlScore(d.s, d.p).total + ' pontos pra bater</b><span>Os cones são os mesmos que ' + esc(d.n) + ' teve.</span></div></div>' : '') +
      '<div class="card rl-rules">' +
        '<p><b>5 chutes montam a carreira:</b> Base, Auge, Último clube, G/A e Títulos.</p>' +
        '<p>' + U.emo('🎯', 'sm') + ' Os <b>melhores prêmios ficam nas pontas</b> e o pior fica no meio.</p>' +
        '<p>' + U.emo('😤', 'sm') + ' Chutou <b>pra fora</b>? Fica com o pior cone e a casa não pontua.</p>' +
        '<p>' + U.emo('⚡', 'sm') + ' A mira fica mais rápida a cada chute.</p>' +
      '</div>' +
      '<div class="field"><label for="rl-name">Seu nome no desafio</label><input id="rl-name" maxlength="20" autocomplete="nickname" placeholder="Ex.: Vitinho" value="' + esc(name) + '"></div>' +
      '<button class="btn" id="rl-start">' + (d ? 'Jogar o desafio' : 'Começar') + '</button>');
    $('rl-back').onclick = () => U.home();
    $('rl-start').onclick = () => {
      const n = ($('rl-name').value || '').trim().slice(0, 20) || 'Você';
      store(NAME, n === 'Você' ? '' : n);
      run = { seed: d ? d.s : S.rlNewSeed(), picks: [], name: n, vs: d };
      play();
    };
  }

  // ---------- chute ----------
  function boardHtml(i) {
    const slots = S.rlCareer(run.seed, run.picks);
    return '<div class="rl-board">' + S.RL_SLOTS.map((sl, k) => {
      const s = slots[k];
      return '<div class="rl-cell' + (k === i ? ' now' : '') + (s ? ' done' + (s.out ? ' out' : '') : '') + '"><small>' + sl.name + '</small>' + (s ? coneMini(s.cone) : '<span class="rl-q">?</span>') + '</div>';
    }).join('') + '</div>';
  }
  // Prêmio pequeno (quadro de cima e resultado)
  function coneMini(c) {
    if (c.id) return crest(c.id, 'xs') + '<em>' + esc(c.name) + '</em>';
    if (c.ga) return '<b class="rl-ga">' + c.ga + '</b>';
    return '<span class="rl-tr">' + c.items.map(([n, q]) => trophyImg(n, 18) + '<i>' + q + '</i>').join('') + '</span><em>' + esc(c.name) + '</em>';
  }
  // Prêmio em cima do cone
  function chip(c, k) {
    let inner;
    if (c.id) inner = crest(c.id, 'sm') + '<em>' + esc(c.name) + '</em>';
    else if (c.ga) inner = '<b class="rl-ga">' + c.ga + '</b><em>G/A</em>';
    else inner = c.items.map(([n, q]) => '<span class="rl-ti">' + trophyImg(n, 22) + '<i>' + q + '×</i></span>').join('');
    return '<div class="rl-chip' + (c.home ? ' home' : '') + '" id="rl-c' + k + '" style="left:' + (CX(k) / 3.6) + '%">' + inner + (c.home ? '<small>volta pra casa</small>' : '') + '</div>';
  }
  function coneSvg(k) {
    const x = CX(k), y = CONE_Y;
    return '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="2" rx="17" ry="4" fill="rgba(0,0,0,.35)"/><g class="rl-cone" id="rl-k' + k + '">' +
      '<path d="M-14 0 L-4 -30 Q0 -33 4 -30 L14 0Z" fill="#F07A1A"/><path d="M-10.5 -10 L-7.4 -19 H7.4 L10.5 -10Z" fill="#FBF8EF"/>' +
      '<rect x="-16" y="-2" width="32" height="4" rx="1.5" fill="#D8601A"/></g></g>';
  }
  function scene() {
    const stripes = [];
    for (let k = 0; k < 10; k++) { const y1 = 56 + 244 * Math.pow(k / 10, 1.4), y2 = 56 + 244 * Math.pow((k + 1) / 10, 1.4); if (k % 2) stripes.push('<rect y="' + y1 + '" width="360" height="' + (y2 - y1) + '" fill="rgba(255,255,255,.05)"/>'); }
    const crowd = [];
    for (let i = 0; i < 60; i++) crowd.push('<circle cx="' + ((i * 61) % 360) + '" cy="' + (10 + (i * 17) % 38) + '" r="' + (2 + (i % 3) * 0.6) + '" fill="hsl(' + [0, 210, 45, 130, 280][i % 5] + ',40%,' + (30 + (i % 4) * 8) + '%)"/>');
    return '<svg class="rl-svg" viewBox="0 0 360 300" aria-label="Cones">' +
      '<defs><linearGradient id="rl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#164D2C"/><stop offset="1" stop-color="#2B8A51"/></linearGradient></defs>' +
      '<rect width="360" height="56" fill="#0B1A12"/>' + crowd.join('') + '<rect y="56" width="360" height="244" fill="url(#rl-g)"/>' + stripes.join('') +
      '<line x1="0" y1="' + (CONE_Y + 8) + '" x2="360" y2="' + (CONE_Y + 8) + '" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
      '<g id="rl-cones">' + [0, 1, 2, 3, 4].map(coneSvg).join('') + '</g>' +
      '<line id="rl-aim" x1="' + BALL.x + '" y1="' + BALL.y + '" x2="180" y2="' + CONE_Y + '" stroke="#F2C230" stroke-width="2.5" stroke-dasharray="6 6" opacity=".9"/>' +
      '<ellipse id="rl-ring" cx="180" cy="' + (CONE_Y - 4) + '" rx="' + (S.RL_WOBBLE * 60 * 2) + '" ry="6" fill="rgba(242,194,48,.25)" stroke="#F2C230" stroke-width="2"/>' +
      '<ellipse id="rl-shadow" cx="' + BALL.x + '" cy="' + (BALL.y + 10) + '" rx="12" ry="3.5" fill="rgba(0,0,0,.35)"/>' +
      '<g id="rl-ball" transform="translate(' + BALL.x + ' ' + BALL.y + ')"><circle r="11" fill="#FBF8EF" stroke="#13201A" stroke-width="1.2"/><path d="M0 -4.5 L4.3 -1.4 L2.7 3.6 H-2.7 L-4.3 -1.4Z" fill="#13201A"/></g>' +
      '</svg>';
  }

  function play() {
    const i = run.picks.length;
    if (i >= 5) return result();
    const cones = S.rlCones(run.seed, run.picks), sl = S.RL_SLOTS[i];
    render('<div class="rl-head"><div class="eyebrow">Chute ' + (i + 1) + ' de 5</div><h2>' + sl.name + '</h2></div>' + boardHtml(i) +
      '<div class="kick-stage rl-stage" id="rl-stage">' + scene() + cones.map(chip).join('') + '<div class="kick-banner" id="rl-banner"></div></div>' +
      '<p class="kick-help" id="rl-help">Toque na tela para <b>chutar</b></p><p class="rl-pick" id="rl-pick">&nbsp;</p>');
    const svg = document.querySelector('.rl-svg'), aim = $('rl-aim'), ring = $('rl-ring'), stage = $('rl-stage');
    const period = S.RL_PERIOD[i] * 1000, t0 = performance.now();
    let u = 2, phase = 'aim', armed = false;
    setTimeout(() => { armed = true; }, 250); // o toque que abriu a tela não conta
    // Mira de -1,1 a 5,1 (em larguras de cone): passa um pouco das pontas, onde a bola sai
    (function loop(now) {
      if (!svg.isConnected || phase !== 'aim') return;
      u = 2 + 3.1 * tri((now - t0) / period + 0.25);
      const x = CX(u);
      aim.setAttribute('x2', x); ring.setAttribute('cx', x);
      requestAnimationFrame(loop);
    })(t0);
    const shoot = () => {
      if (!armed || phase !== 'aim') return;
      phase = 'shot';
      const land = u + S.RL_WOBBLE * gauss(), hit = S.rlHit(land);
      run.picks.push(hit === null ? 5 : hit);
      fly(land, hit, cones);
    };
    // (no computador, desktop.js transforma Espaço/Enter num toque no palco, como nos outros lances)
    stage.addEventListener('pointerdown', e => { e.preventDefault(); shoot(); });
  }

  function fly(land, hit, cones) {
    sfx('kick');
    $('rl-help').innerHTML = '&nbsp;';
    $('rl-aim').setAttribute('opacity', '0'); $('rl-ring').setAttribute('opacity', '0');
    const ball = $('rl-ball'), shadow = $('rl-shadow');
    const tx = CX(land), ty = hit === null ? CONE_Y - 40 : CONE_Y - 18, T = 520, t0 = performance.now();
    const cx = (BALL.x + tx) / 2, cy = Math.min(BALL.y, ty) - 70;
    (function step(now) {
      if (!ball.isConnected) return;
      const q = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - q, 2), m = 1 - e;
      const bx = m * m * BALL.x + 2 * m * e * cx + e * e * tx, by = m * m * BALL.y + 2 * m * e * cy + e * e * ty;
      ball.setAttribute('transform', 'translate(' + bx + ' ' + by + ') scale(' + (1 - 0.4 * e) + ') rotate(' + (q * 540) + ')');
      shadow.setAttribute('cx', bx); shadow.setAttribute('cy', BALL.y + 10 + (CONE_Y + 4 - BALL.y - 10) * e); shadow.setAttribute('rx', 12 - 5 * e);
      if (q < 1) return requestAnimationFrame(step);
      after(hit, cones);
    })(t0);
  }

  function after(hit, cones) {
    const banner = $('rl-banner'), cone = hit === null ? cones.find(c => c.rank === 4) : cones[hit];
    if (hit !== null) {
      const k = $('rl-k' + hit);
      k.classList.add('fall' + (CX(hit) < 180 ? 'l' : 'r'));
      $('rl-c' + hit).classList.add('hit');
      document.querySelectorAll('.rl-chip').forEach((c, j) => { if (j !== hit) c.classList.add('dim'); });
    } else {
      document.querySelectorAll('.rl-chip').forEach(c => c.classList.add('dim'));
      $('rl-c' + cones.indexOf(cone)).classList.add('hit', 'miss');
    }
    const best = hit !== null && cone.rank === 0;
    sfx(hit === null ? 'miss' : best ? 'goal' : 'kick');
    banner.textContent = hit === null ? 'PRA FORA!' : best ? 'NA MOSCA!' : cone.rank <= 2 ? 'BOA!' : 'IXI...';
    banner.className = 'kick-banner show ' + (hit !== null && cone.rank <= 2 ? 'ok' : 'ko');
    $('rl-pick').innerHTML = hit === null ? 'Ficou com <b>' + esc(cone.name) + '</b> e não pontua' : '<b>' + esc(cone.name) + '</b> · +' + String(cone.pts).replace('.', ',') + ' pts';
    if (navigator.vibrate && best) navigator.vibrate([40, 40, 80]);
    setTimeout(() => { if (banner.isConnected) play(); }, 1500);
  }

  // ---------- resultado ----------
  function rows(f) {
    return f.slots.map(s => '<div class="rl-row' + (s.out ? ' out' : s.best ? ' best' : '') + '"><small>' + s.name + '</small><span class="rl-val">' + coneVal(s.cone) + '</span><b>' + (s.out ? 'fora' : '+' + Math.round(s.pts)) + '</b></div>').join('');
  }
  function coneVal(c) {
    if (c.id) return crest(c.id, 'xs') + esc(c.name);
    if (c.ga) return c.ga + ' gols + assistências';
    return esc(c.name);
  }
  function result() {
    const f = S.rlScore(run.seed, run.picks), vs = run.vs;
    const g = vs ? S.rlScore(vs.s, vs.p) : null;
    const diff = g ? f.total - g.total : 0;
    if (g && diff > 0) store(KEY, Object.assign(load(KEY) || {}, { done: true }));
    const combos = f.combos.length ? '<div class="rl-combos">' + f.combos.map(c => '<span>' + U.emo('🔥', 'xs') + ' <b>' + c.name + '</b> ' + c.desc + (c.pts ? ' (+' + c.pts + ')' : '') + '</span>').join('') + '</div>' : '';
    const col = (who, sc, me) => '<div class="rl-col' + (me ? ' me' : '') + '"><div class="rl-col-h"><b>' + esc(who) + '</b><span class="rl-grade g-' + sc.grade + '">' + sc.grade + '</span></div>' +
      sc.slots.map(s => '<div class="rl-mini' + (s.out ? ' out' : '') + '"><small>' + s.name + '</small>' + coneMini(s.cone) + '</div>').join('') +
      '<div class="rl-col-t">' + sc.total + ' pts</div></div>';
    render('<div class="eyebrow">Carreira Relâmpago</div>' +
      (g ? '<h2>' + (diff > 0 ? 'Você ganhou!' : diff === 0 ? 'Empate!' : esc(vs.n) + ' ganhou') + '</h2>' +
        '<div class="rl-duel">' + col(run.name, f, true) + '<div class="rl-x">x</div>' + col(vs.n, g) + '</div>' +
        '<p class="rl-ask">Quem montou a melhor carreira?</p>'
      : '<h2>' + esc(run.name) + '</h2>') +
      '<div class="card rl-res"><div class="rl-score"><span class="rl-grade big g-' + f.grade + '">' + f.grade + '</span><div><b>' + f.total + ' pontos</b><small>máximo 124 · ' + f.slots.filter(s => s.best).length + ' de 5 na mosca</small></div></div>' +
        rows(f) + combos + '</div>' +
      (window.CLIMBIX_SOLO ? '' : '<button class="btn" id="rl-share">' + U.emo('🎯', 'sm') + ' ' + (g && diff > 0 ? 'Devolver o desafio' : 'Desafiar um amigo') + '<small>Ele chuta nos mesmos cones</small></button>') +
      '<button class="btn ghost" id="rl-again">' + (g && diff <= 0 ? 'Tentar de novo os mesmos cones' : 'Jogar de novo') + '</button>' +
      '<button class="link-btn" id="rl-home">Voltar ao início</button>');
    $('rl-again').onclick = () => {
      const same = g && diff <= 0;
      run = { seed: same ? run.seed : S.rlNewSeed(), picks: [], name: run.name, vs: same ? vs : null };
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
      '. ' + f.total + ' pontos (nota ' + f.grade + '). Chuta nos mesmos cones e vê quem monta a melhor carreira 😏';
    const old = b.innerHTML;
    try { if (navigator.share) { await navigator.share({ title: 'Climbix', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); b.innerHTML = 'Link copiado! Cole no WhatsApp'; setTimeout(() => { b.innerHTML = old; }, 2500); }
    catch (e) { prompt('Copie o link do desafio:', text + ' ' + url); }
  }

  Object.assign(U, { relampagoFromLink: fromLink, relampagoHome: homeHtml, relampagoHomeBind: homeBind, relampago: intro, relampagoEncode: encode, relampagoDecode: decode });
})();
