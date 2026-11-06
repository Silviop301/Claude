// Interface — Carreira Relâmpago: 5 casas de 5 pênaltis montam Base, Auge, Último clube, G/A e Títulos (regras em engine/relampago.js).
// Fez o gol, a bola abre na hora e mostra o que escondia (clube com os outros 4 em cinza; prêmio com as bolas erradas antes).
// Sozinho: vai direto para a carreira no fim. X1: o resultado de quem desafiou fica lacrado no link (?r=..., h: 1); o amigo cobra
// com a mesma semente e, quando termina, os dois aparecem lado a lado. O amigo devolve um link de duelo (m, q) para quem
// desafiou ver quem ganhou. Tudo vai dentro do link (sem servidor).
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, G, esc, $, load, store, render, crest, sfx } = U;
  const KEY = 'climbix-relampago-desafio', NAME = 'climbix-relampago-nome', PLAYED = 'climbix-relampago-jogados', BEST = 'climbix-relampago-recorde';
  const SEALED = 'climbix-relampago-lacrados', DUEL = 'climbix-relampago-duelo';
  let run = null; // { seed, rounds, name, vs, x1 }

  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // n: nome, s: semente, v: 2, p: cobranças de cada casa na ordem em que saíram, cada uma com a bola (0 a 4) e 1 = gol / 0 = errou
  // ('3041' = bola 4 errou, bola 5 gol), casas separadas por '-'. Sem v (links antigos): bolas da esquerda para a direita, '1'/'0'
  // h: 1 = X1 lacrado (o placar de quem desafiou só aparece depois que o amigo joga). m, q: nome e cobranças de quem respondeu
  // (link de duelo, volta para quem desafiou)
  const kicksStr = rounds => rounds.map(k => k.map(x => x[0] + '' + x[1]).join('')).join('-');
  const encode = (r, opp) => b64(JSON.stringify(Object.assign({ n: String(r.name).slice(0, 20), s: r.seed, v: 2, p: kicksStr(r.rounds) },
    r.x1 ? { h: 1 } : {}, opp ? { m: String(opp.name).slice(0, 20), q: kicksStr(opp.rounds) } : {})));
  const parseV2 = str => {
    if (!/^([0-4][01]){1,5}(-([0-4][01]){1,5}){4}$/.test(String(str))) return null;
    const p = String(str).split('-').map(k => k.match(/../g).map(x => [+x[0], +x[1]]));
    return p.some(ks => new Set(ks.map(x => x[0])).size !== ks.length) ? null : p; // a mesma bola duas vezes
  };
  const legacy = p => p.map(ks => ks.map((v, j) => Array.isArray(v) ? v : [j, v === 1 || v === 2 ? 1 : 0]));
  function decode(q) {
    try {
      const d = JSON.parse(unb64(String(q).slice(0, 600)));
      if (!d || !(d.s >= 0 && d.s <= 4294967295)) return null;
      let p;
      if (d.v === 2) {
        if (!(p = parseV2(d.p))) return null;
      } else {
        if (!/^[012]{1,5}(-[012]{1,5}){4}$/.test(String(d.p))) return null;
        p = legacy(String(d.p).split('-').map(k => k.split('').map(Number)));
      }
      if (S.rlCareer(d.s >>> 0, p).length !== 5) return null;
      const out = { n: String(d.n || 'Alguém').slice(0, 20), s: d.s >>> 0, p, h: d.h === 1 ? 1 : 0 };
      if (d.m != null) {
        const qk = d.v === 2 ? parseV2(d.q) : null;
        if (!qk || S.rlCareer(out.s, qk).length !== 5) return null;
        Object.assign(out, { m: String(d.m || 'Seu amigo').slice(0, 20), q: qk });
      }
      return out;
    } catch (e) { return null; }
  }
  const base = () => (window.CLIMBIX_HOME || location.origin + location.pathname.replace(/index\.html$/, ''));
  // Desafio guardado (o formato de antes da escolha da bola vira [bola, gol]; o mais antigo, sem casas, é ignorado)
  // Começou e saiu no meio (recarregou ou fechou): a semente já está em played(), o desafio não volta
  const active = () => { const d = load(KEY); return d && !d.done && !played().includes(d.s) && Array.isArray(d.p) && Array.isArray(d.p[0]) ? Object.assign(d, { p: legacy(d.p) }) : null; };
  const trophyImg = (name, s) => U.trophy(name === 'Bola de Ouro' ? 'ballon' : /Libertadores/.test(name) ? 'lib' : /Campeões/.test(name) ? 'ucl' : /Copa do Mundo/.test(name) ? 'wc' : 'league', s, name);

  // Sementes já jogadas neste aparelho (as suas e os desafios): o mesmo desafio não abre de novo, porque quem jogou
  // já viu onde estão os prêmios
  const played = () => { const a = load(PLAYED); return Array.isArray(a) ? a : []; };
  const markPlayed = seed => { const a = played().filter(x => x !== seed); a.push(seed); store(PLAYED, a.slice(-100)); };

  // Link recebido: guarda o desafio e segue para a tela inicial (já jogado: fica marcado como feito)
  function fromLink() {
    const q = new URLSearchParams(location.search).get('r');
    if (!q) return;
    const d = decode(q);
    history.replaceState(null, '', location.pathname);
    if (!d) return;
    // Link de duelo: o amigo respondeu o seu X1. Sai da lista de lacrados e vira o cartão "ver quem ganhou"
    if (d.m) { store(SEALED, sealed().filter(x => x.s !== d.s)); store(DUEL, Object.assign(d, { at: Date.now() })); return; }
    store(KEY, Object.assign(d, { at: Date.now() }, played().includes(d.s) ? { done: true, again: true } : {}));
  }
  // X1 que você mandou e o amigo ainda não respondeu (o mais novo por último)
  const sealed = () => { const a = load(SEALED); return Array.isArray(a) ? a.filter(x => x && Array.isArray(x.p)) : []; };

  // ---------- tela inicial ----------
  function homeHtml(bare) { // bare: só o cartão do desafio (o ingresso do modo fica na bilheteria)
    const du = load(DUEL), wait = sealed().slice(-1)[0];
    // O amigo respondeu: o duelo ainda não foi visto
    if (du && du.m) return '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" data-k="duel" aria-label="Descartar">' + U.ICON.x + '</button>' +
      '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>X1 relâmpago</small><b>' + esc(du.m) + ' jogou o seu X1</b><span>Os dois resultados abrem juntos agora</span></div></div>' +
      '<button class="btn rl-go" id="rl-duel">Ver quem ganhou</button></div>' + (bare ? '' : btn());
    const d = active();
    const old = load(KEY);
    if (!d && old && (old.again || (!old.done && played().includes(old.s)))) return '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" aria-label="Fechar">' + U.ICON.x + '</button>' +
      '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>Desafio relâmpago</small><b>Você já jogou esse desafio</b><span>Cada desafio vale uma vez só. Desafie de volta com uma carreira nova</span></div></div></div>' + (bare ? '' : btn());
    const card = d ? (() => { const f = S.rlScore(d.s, d.p);
      return '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" aria-label="Descartar desafio">' + U.ICON.x + '</button>' +
        '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>' + (d.h ? 'X1 relâmpago' : 'Desafio relâmpago') + '</small>' +
        (d.h ? '<b>' + esc(d.n) + ' te chamou pro X1</b><span>O resultado de ' + esc(d.n) + ' está lacrado: abre quando você terminar</span>'
          : '<b>' + esc(d.n) + ' fez ' + f.total + ' pontos</b><span>Nota ' + f.grade + ' · mesmos sorteios pra você</span>') + '</div></div>' +
        '<button class="btn rl-go" id="rl-accept">' + (d.h ? 'Aceitar o X1' : 'Aceitar desafio') + '</button></div>'; })() : '';
    const lac = !card && wait ? '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" data-k="sealed" aria-label="Descartar">' + U.ICON.x + '</button>' +
      '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>X1 relâmpago</small><b>Seu resultado está lacrado</b><span>Ele abre quando o amigo jogar e te mandar o link de volta</span></div></div>' +
      '<button class="btn ghost rl-go" id="rl-resend">Mandar o link de novo</button></div>' : '';
    return card + lac + (bare ? '' : btn());
  }
  const btn = () => '<button class="hg rl-btn" id="b-relampago"><i>' + U.emo('⚡', 'sm') + '</i><b>Carreira Relâmpago</b><small>5 casas, 5 bolas cada. Sozinho ou X1</small></button>';
  function homeBind() {
    if ($('b-relampago')) $('b-relampago').onclick = () => intro();
    if ($('rl-accept')) $('rl-accept').onclick = () => intro();
    if ($('rl-duel')) $('rl-duel').onclick = () => { const du = load(DUEL); localStorage.removeItem(DUEL); duelView(du); };
    if ($('rl-resend')) $('rl-resend').onclick = () => { const w = sealed().slice(-1)[0]; if (w) shareX1($('rl-resend'), { seed: w.s, rounds: w.p, name: w.n, x1: true }); };
    if ($('rl-x')) $('rl-x').onclick = () => {
      const k = $('rl-x').dataset.k;
      if (k === 'duel') localStorage.removeItem(DUEL);
      else if (k === 'sealed') store(SEALED, sealed().slice(0, -1));
      else localStorage.removeItem(KEY);
      const c = document.querySelector('.rl-dz'); if (c) c.remove();
    };
  }

  // ---------- topo, ingresso e faixa das casas (o mesmo caminho dos outros modos) ----------
  // Topo comum dos modos (U.modeHead, quando existir): casa na entrada, seta dentro do jogo, engrenagem à direita
  const ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function head(o) {
    if (U.modeHead) return U.modeHead(Object.assign({ mode: 'rl' }, o));
    return '<div class="rx-ah"><button class="rx-hb" id="' + o.id + '" aria-label="' + o.label + '">' + (o.nav === 'home' ? U.HOUSE : ARROW) + '</button>' +
      '<span class="rx-hi">' + U.emo('⚡', 'sm') + '</span><b class="rx-ht">' + o.title + '</b>' + (o.right || '') + '</div>';
  }
  const headBind = () => { if (U.modeHeadBind) U.modeHeadBind({}); };
  // Ingresso coral do modo (o mesmo papel do ingresso da bilheteria): ação principal, sempre embaixo
  const stubHtml = (k, v) => '<span class="tk-stub"><small>' + k + '</small><b class="rx-sv">' + v + '</b></span>';
  const ticket = (id, title, sub, k, v) => '<button class="tk tk-relampago rx-tk" id="' + id + '"><span class="tk-in"><span class="tk-paper"><span class="tk-frame">' +
    '<span class="tk-t"><b>' + title + '</b><small>' + sub + '</small></span></span></span>' + stubHtml(k, v) + '</span></button>';
  // Faixa das 5 casas: casa fechada mostra o que você levou (às cegas, no X1 de quem desafia: só um cadeado)
  function casasHtml(i, blind) {
    const slots = run ? S.rlCareer(run.seed, run.rounds) : [];
    return '<div class="rx-casas">' + S.RL_SLOTS.map((sl, k) => {
      const s = slots[k], nm = k === 2 ? 'Último' : sl.name;
      let inner = '<i class="rx-q">?</i>', cls = '';
      if (s) {
        cls = ' done' + (s.goal ? '' : ' out');
        inner = blind ? U.emo('🔒', 'xs') : s.cone.id ? crest(s.cone.id, 'xs') : '<b class="rx-cp">+' + Math.round(s.pts) + '</b>';
      } else if (k === i && run && !blind && k >= 3) {
        const pts = S.rlRound(run.seed, k, prevOf(k), run.rounds[k] || []).cone.pts;
        if (pts) inner = '<b class="rx-cp">+' + Math.round(pts) + '</b>';
      }
      return '<div class="rx-c' + (k === i ? ' now' : '') + cls + '"><small>' + nm + '</small>' + inner + '</div>';
    }).join('') + '</div>';
  }
  // O campo antes do chute é a mesma cena do minigame (kick.js), parada: gol, rede, goleiro e a bola na marca
  const KP = () => window.CRAQUE_KICK_PARTS;
  const field = () => KP() && KP().scene
    ? '<div class="rx-field rx-kf" aria-hidden="true"><div class="kick-stage">' + KP().scene({}, 1) + '</div></div>'
    : '<div class="rx-field" aria-hidden="true"><i class="rx-goal"></i><i class="rx-line"></i></div>';
  function dressField(xs) {
    const svg = document.querySelector('.rx-kf svg'); if (!svg) return;
    ['k-aim', 'k-vline', 'k-hline', 'k-dot'].forEach(id => { const e = svg.querySelector('#' + id); if (e) e.style.display = 'none'; });
    try { if (KP().keeperSprite) { const g = KP().keeperSprite(svg); g.stand(KP().GX); g.idle(); } } catch (e) { /* fica o goleiro desenhado */ }
    // Na casa: as bolas que ainda faltam na marca, como no chute
    const ball = svg.querySelector('#k-ball');
    if (xs && ball && KP().setBall) xs.forEach((x, n) => { const b = n ? ball.cloneNode(true) : ball; if (n) { b.removeAttribute('id'); b.setAttribute('class', 'rx-sb'); ball.parentNode.insertBefore(b, ball); } KP().setBall(b, x, KP().BALL.y, KP().BALL.r); });
    // A bola é a mesma foto da bola 3D do ingresso de escolha (não o desenho chapado do SVG)
    if (ball && U.emoSrc) { const src = U.emoSrc('⚽'); [ball].concat(Array.from(svg.querySelectorAll('.rx-sb'))).forEach(g => { g.innerHTML = '<image href="' + src + '" x="-12" y="-12" width="24" height="24"/>'; }); }
  }

  // ---------- entrada: já no campo, com o cartão das regras por cima ----------
  function intro() {
    G.c = null; U.bar(); U.portMode = true; // modo em pé: com a home deitada, pede para girar (ui/core.js)
    const d = active(), name = load(NAME) || '', solo = !!window.CLIMBIX_SOLO;
    const vs = d ? '<div class="rx-vs">' + U.emo('🎯', 'sm') + '<span><small>' + (d.h ? 'X1 com ' : 'Desafio de ') + esc(d.n) + '</small>' +
      (d.h ? '<b>Resultado lacrado</b><em>Mesmos prêmios escondidos. Quando você terminar, os dois abrem juntos. Uma chance só.</em>'
        : '<b>' + S.rlScore(d.s, d.p).total + ' pontos pra bater</b><em>Mesmos prêmios escondidos que ' + esc(d.n) + ' teve. Uma chance só.</em>') + '</span></div>' : '';
    const line = (e, t) => '<li>' + U.emo(e, 'sm') + '<span>' + t + '</span></li>';
    const seg = d || solo ? '' : '<div class="rx-seg" role="group" aria-label="Como jogar"><button class="on" data-x="0" aria-pressed="true">Sozinho</button><button data-x="1" id="rl-x1" aria-pressed="false">X1 com amigo</button></div>';
    const fk = x1 => x1 ? '<b>X1</b> · seu resultado só abre quando o amigo jogar' : '<b>Sozinho</b> · cada gol abre a bola na hora';
    render('<div class="rx-scr">' + head({ nav: 'home', id: 'rl-back', label: 'Voltar ao início', title: 'Relâmpago', right: '<span class="rx-chip">1 min</span>' }) +
      casasHtml(-1) +
      '<div class="rx-stage">' + field() + '<div class="rx-sheet">' + vs + '<h2>5 casas, 5 bolas em cada</h2><ul class="rx-lines">' +
        line('👆', '<b>Escolha a bola</b> e chute') + line('⚽', 'Fez o gol, <b>a bola abre</b> e mostra o que tinha') + line('🏆', 'Clubes e prêmios <b>montam a carreira</b>') + '</ul>' +
        '<label class="rx-fld"><span>Seu nome</span><input id="rl-name" maxlength="20" autocomplete="nickname" placeholder="Ex.: Vitinho" value="' + esc(name) + '"></label>' + seg + '</div></div>' +
      '<div class="rx-foot"><span class="rx-fk" id="rl-fk">' + (d ? (d.h ? '<b>X1</b> · os dois resultados abrem no fim' : '<b>Desafio</b> · bata os pontos de ' + esc(d.n)) : fk(false)) + '</span>' +
        ticket('rl-start', d ? (d.h ? 'Jogar o X1' : 'Jogar o desafio') : 'Começar', '25 bolas · a mira acelera a cada casa', 'casa', '1') + '</div></div>');
    headBind(); dressField([180]);
    $('rl-back').onclick = () => U.home();
    let x1 = false;
    document.querySelectorAll('.rx-seg button').forEach(b => b.onclick = () => {
      x1 = b.dataset.x === '1';
      document.querySelectorAll('.rx-seg button').forEach(o => { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', o === b); });
      $('rl-fk').innerHTML = fk(x1);
    });
    $('rl-start').onclick = () => {
      const n = ($('rl-name').value || '').trim().slice(0, 20) || 'Você';
      store(NAME, n === 'Você' ? '' : n);
      run = { seed: d ? d.s : S.rlNewSeed(), rounds: [], name: n, vs: d, x1: !d && x1, seen: [[], [], [], [], []] };
      markPlayed(run.seed);
      if (window.CLIMBIX_STAT) window.CLIMBIX_STAT('start', 'relampago'); // contagem anônima
      play();
    };
  }

  // ---------- chute ----------
  // Prêmio pequeno (resultado)
  function coneMini(c) {
    if (c.id) return crest(c.id, 'xs') + '<em>' + esc(c.name) + '</em>';
    if ('ga' in c) return '<span class="rl-gam"><b>' + c.gols + '</b> gols<b>' + c.ast + '</b> assist.</span>';
    return '<span class="rl-tr">' + c.items.map(([n, q]) => trophyImg(n, 18) + '<i>' + q + '</i>').join('') + '</span><em>' + esc(c.name) + '</em>';
  }
  // Jogador das cobranças (só para o desenho do batedor e do uniforme): nasce da semente
  const BX = [100, 140, 180, 220, 260]; // as 5 bolas, da esquerda para a direita
  const kicker = () => S.newCareer({ name: run.name, pos: 'ATA', foot: 'D', country: 'Brasil', number: 9 }, run.seed);

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
  // Situação de cada bola, da esquerda para a direita: 1 gol, 0 errou, undefined ainda não chutada
  const stateOf = (kicks, j) => { const x = kicks.find(k => k[0] === j); return x ? x[1] : undefined; };
  const dots = kicks => '<span class="rl-dots">' + [0, 1, 2, 3, 4].map(j => { const v = stateOf(kicks, j); return '<i class="' + (v === 1 ? 'g' : v === 0 ? 'x' : '') + '"></i>'; }).join('') + '</span>';
  // X1 de quem desafia: às cegas (só gol ou errou), para ninguém escolher a melhor partida para mandar
  const blind = () => !!(run && run.x1 && !run.vs);
  const goalsNow = () => run.rounds.reduce((a, k) => a + k.filter(x => x[1]).length, 0);
  const ptsNow = () => { let t = 0; const prev = [];
    run.rounds.forEach((ks, i) => { const r = S.rlRound(run.seed, i, prev, ks); if (r.done || i >= 3) t += r.cone.pts || 0; prev.push(r.cone); });
    return Math.round(t); };
  const scoreChip = () => blind() ? '<span class="rx-sc"><small>gols</small><b id="rl-pts">' + goalsNow() + '</b></span>'
    : '<span class="rx-sc"><small>pontos</small><b id="rl-pts">' + ptsNow() + '</b></span>';
  // Dica de cada tipo de casa, uma vez por aparelho (some com "Pular dicas" das outras telas)
  const TIPS = 'climbix-relampago-dicas';
  function tipHtml(i) {
    const k = i < 3 ? 'c' : 'p', seen = load(TIPS) || {}, all = load('climbix-dicas-v1') || {};
    if (seen[k] || all.off || (i !== 0 && i !== 3) || run.rounds[i].length) return '';
    return '<div class="rx-tip" id="rl-tip" data-k="' + k + '"><b>' + U.emo(i < 3 ? '⚽' : '🏆', 'sm') + (i < 3 ? 'Casa de clube' : 'Casa de prêmio') + '</b>' +
      '<p>' + (i < 3 ? 'Cada bola esconde um time. <b>Fez o gol, a bola abre e o clube é seu.</b> Errou as 5, vem um clube fraco de surpresa.'
        : 'Cada bola esconde gols e assistências ou um título. <b>Você leva o de toda bola que entrar.</b> Copa do Mundo e Bola de Ouro valem mais.') + '</p>' +
      '<button class="rx-ok" id="rl-tip-ok">Entendi</button></div>';
  }
  function play() {
    const i = current();
    if (i >= 5) return result();
    const sl = S.RL_SLOTS[i], kicks = run.rounds[i], k = kicks.length;
    const rule = i < 3 ? 'Casa ' + (i + 1) + ' de 5 · vale a primeira que entrar' : 'Casa ' + (i + 1) + ' de 5 · leva toda bola que entrar';
    const ball = j => { const v = stateOf(kicks, j);
      return '<button class="rx-ball' + (v === 1 ? ' g' : v === 0 ? ' x' : '') + '" data-b="' + j + '"' + (v === undefined ? '' : ' disabled') + ' aria-label="Bola ' + (j + 1) + '">' +
        U.emo('⚽', 'md') + '<i>' + (j + 1) + '</i></button>'; };
    render('<div class="rx-scr rx-play">' + head({ nav: 'back', id: 'rl-quit', label: 'Sair da Carreira Relâmpago', title: sl.name, right: scoreChip() }) +
      casasHtml(i, blind()) + '<div class="rx-sub"><span>' + rule + '</span>' + dots(kicks) + '</div>' +
      '<div class="rx-stage" id="rl-stage">' + field() + '<div id="rl-kick"></div>' + tipHtml(i) + '</div>' +
      '<div class="rx-foot" id="rl-foot"><span class="rx-fk"><b>Escolha a bola</b> · cobrança ' + (k + 1) + ' de 5</span>' +
        '<div class="tk tk-relampago rx-tk rx-dock" id="rl-pick"><span class="tk-in"><span class="tk-paper"><span class="tk-frame">' + [0, 1, 2, 3, 4].map(ball).join('') + '</span></span>' +
        stubHtml('casa', i + 1) + '</span></div></div></div>');
    headBind(); dressField([0, 1, 2, 3, 4].filter(j => stateOf(kicks, j) === undefined).map(j => BX[j]));
    document.querySelectorAll('.rx-ball:not([disabled])').forEach(b => { b.onclick = () => kick(i, +b.dataset.b); });
    if ($('rl-tip-ok')) $('rl-tip-ok').onclick = () => { const t = $('rl-tip'), s = load(TIPS) || {}; s[t.dataset.k] = 1; store(TIPS, s); t.remove(); };
    // Desafio de amigo abandonado conta como jogado (os prêmios escondidos já apareceram): não volta na tela inicial
    $('rl-quit').onclick = () => U.ask('Sair da Carreira Relâmpago?', run.vs ? 'O desafio de ' + run.vs.n + ' conta como jogado.' : 'Essa carreira não fica salva.', 'Sair', () => {
      if (run && run.vs) store(KEY, Object.assign(load(KEY) || {}, { done: true }));
      run = null;
      U.home();
    });
    // Bola 3D no lugar do emoji (se o 3D estiver ligado e carregar)
    const B = window.CRAQUE_BALL;
    if (B && B.snapshot && !(window.CLIMBIX_CFG && window.CLIMBIX_CFG.fx3d === false)) B.snapshot().then(url => {
      if (url) document.querySelectorAll('.rx-ball').forEach(b => { const e = b.querySelector('.tw'); if (e) e.outerHTML = '<img class="rl-b3" src="' + url + '" alt="">'; });
    });
  }

  // Cobra a bola b: ela vai para a marca e as outras que ainda não saíram ficam na fila
  function kick(i, b) {
    const kicks = run.rounds[i], r0 = run;
    const fd = document.querySelector('.rx-field'); if (fd) fd.remove();
    const tp = $('rl-tip'); if (tp) tp.remove();
    $('rl-foot').innerHTML = '<span class="rx-fk"><b>Bola ' + (b + 1) + '</b> · toque para chutar</span>';
    const others = [0, 1, 2, 3, 4].filter(j => j !== b && stateOf(kicks, j) === undefined).map(j => BX[j]);
    // Saiu durante o chute (o letreiro ainda termina depois): a partida acabou, não revela nada
    window.CRAQUE_KICK($('rl-kick'), { c: kicker(), moment: { type: 'cup' }, setup: S.rlKickSetup(i), keeperGuess: S.RL_KEEPER,
      ballX: BX[b], extraBalls: others, onDone: ok => { if (run !== r0) return; kicks.push([b, ok ? 1 : 0]); reveal(i, b, ok); } });
  }

  // Prêmio grande (a carta que sai da bola) e pequeno (os outros, em cinza)
  function prizeBig(p) {
    if (p.id) return crest(p.id, 'lg') + '<b class="rx-pn">' + esc(p.name) + '</b>';
    if ('ga' in p) return '<span class="rx-nums"><span><b>' + p.gols + '</b><em>gols</em></span><span><b>' + p.ast + '</b><em>assist.</em></span></span>';
    return trophyImg(p.items[0][0], 64) + '<b class="rx-pn">' + (p.items[0][1] > 1 ? p.items[0][1] + ' × ' : '') + esc(p.items[0][0]) + '</b>';
  }
  const prizeSmall = p => p.id ? crest(p.id, 'sm') + '<b>' + esc(p.name) + '</b>'
    : 'ga' in p ? '<b class="rx-ga"><span>' + p.gols + ' gols</span><span>' + p.ast + ' assist.</span></b>'
    : trophyImg(p.items[0][0], 30) + '<b>' + (p.items[0][1] > 1 ? p.items[0][1] + ' × ' : '') + esc(p.items[0][0]) + '</b>';
  const ptsTxt = v => '+' + Math.round(v) + (Math.round(v) === 1 ? ' ponto' : ' pontos');

  // Depois de cada cobrança. Gol: a bola abre e mostra o que tinha; numa casa de clube, os outros 4 clubes aparecem
  // embaixo em cinza (errou/sobrou); nos prêmios, abrem junto as bolas que você tinha errado antes. Errou: a bola fica
  // lacrada até o próximo gol. Errou as 5 de um clube: os 5 em cinza e um clube fraco de surpresa.
  // No X1 de quem desafia continua às cegas: só gol ou errou
  function reveal(i, b, ok) {
    const kicks = run.rounds[i], r = S.rlRound(run.seed, i, prevOf(i), kicks), stage = $('rl-stage');
    if (!stage) return;
    const club = i < 3, bl = blind(), seen = run.seen[i];
    const dl = document.querySelector('.rl-dots'); if (dl) dl.outerHTML = dots(kicks);
    const next = !r.done ? 'Próxima bola' : i < 4 ? 'Próxima casa' : bl ? 'Lacrar o resultado' : 'Ver a carreira';
    const left = 5 - kicks.length;
    const nsub = !r.done ? S.RL_SLOTS[i].name + ' · ' + D.plural(left, 'bola sobrando', 'bolas sobrando') : i < 4 ? S.RL_SLOTS[i + 1].name + ' · 5 bolas novas' : bl ? 'O amigo joga e os dois abrem juntos' : 'Sua carreira inteira';
    const foot = (fk, delay) => { $('rl-foot').innerHTML = '<div class="rx-fin' + (delay ? ' late' : '') + '"><span class="rx-fk">' + fk + '</span>' +
      ticket('rl-next', next, nsub, 'casa', r.done && i < 4 ? i + 2 : i + 1) + '</div>'; $('rl-next').onclick = play; };
    const refresh = () => { const cs = document.querySelector('.rx-casas'); if (cs) cs.outerHTML = casasHtml(i, bl); const p = $('rl-pts'); if (p) p.textContent = bl ? goalsNow() : ptsNow(); };
    let box;
    const stamp = (cls, txt, msg) => '<div class="rx-res ' + cls + '"><b class="rx-stamp">' + txt + '</b>' + (msg ? '<p>' + msg + '</p>' : '') + '</div>';
    const allMiss = club && r.done && !ok;
    // Casa de prêmio que fechou num erro: não há mais gol para abrir as erradas, então abrem agora
    if (!bl && !ok && !club && r.done) {
      const miss = kicks.filter(x => !x[1] && !seen.includes(x[0]));
      miss.forEach(x => seen.push(x[0]));
      const strips = miss.map(x => { const p = r.hidden(x[0]);
        return '<div class="rx-esc"><span class="rx-oi">' + prizeSmall(p) + '</span><span class="rx-et">A bola ' + (x[0] + 1) + ' que você errou tinha</span><i>+' + Math.round(p.pts) + '</i></div>'; }).join('');
      stage.insertAdjacentHTML('beforeend', '<div class="rx-res ko rx-shut"><b class="rx-stamp">Errou</b><p>Acabaram as bolas de ' + S.RL_SLOTS[i].name + '. Abriram as que você errou:</p>' +
        (strips ? '<div class="rx-oth">' + strips + '</div>' : '') + '</div>');
      refresh();
      foot('Casa fechada · <b>' + ptsTxt((S.rlCareer(run.seed, run.rounds)[i] || {}).pts || 0) + '</b>', false);
      sfx('kick');
      return;
    }
    if (bl || (!ok && !allMiss)) {
      // Às cegas, ou errou com bolas sobrando: só o carimbo
      const msg = bl ? (ok ? 'O prêmio dessa bola é seu. Só abre quando o amigo jogar' : club && r.done ? 'Nenhuma entrou. Veio um clube de surpresa' : 'Essa bola ficou pra trás')
        : 'A bola ' + (b + 1) + ' fica lacrada. <b>Quando você acertar, ela abre junto e mostra o que escapou.</b>';
      box = stamp(ok ? 'ok' : 'ko', ok ? 'Gol!' : 'Errou', msg);
      stage.insertAdjacentHTML('beforeend', box);
      if (r.done) refresh(); else { const p = $('rl-pts'); if (p && bl) p.textContent = goalsNow(); }
      foot(!r.done ? (ok ? '<b>Gol</b> · o prêmio fica lacrado' : '<b>Errou</b> · escolha outra bola') : 'Casa fechada', false);
      sfx(ok ? 'goal' : 'kick');
      return;
    }
    // A bola abre: carta do prêmio com os pontos, e embaixo o que tinha nas outras
    const prize = allMiss ? r.cone : r.hidden(b), pts = allMiss ? r.cone.pts : club ? r.cone.pts : prize.pts;
    let below = '';
    if (club) {
      const balls = S.rlBalls(run.seed, run.rounds, i);
      const oth = [0, 1, 2, 3, 4].filter(j => allMiss || j !== b).map(j => '<div class="rx-oc"><span class="rx-oi">' + prizeSmall(balls[j].prize) + '</span>' +
        '<small class="' + (balls[j].st === 'miss' ? 'x' : '') + '">bola ' + (j + 1) + (allMiss ? '' : balls[j].st === 'miss' ? ' · errou' : ' · sobrou') + '</small></div>').join('');
      below = '<div class="rx-oth"><span class="rx-oh">' + (allMiss ? 'Os 5 clubes que você deixou passar' : 'O que tinha nas outras bolas') + '</span><div class="rx-og n' + (allMiss ? 5 : 4) + '">' + oth + '</div></div>';
    } else {
      // Bolas erradas desta casa que ainda não tinham aberto
      const miss = kicks.filter(x => !x[1] && !seen.includes(x[0]));
      miss.forEach(x => seen.push(x[0]));
      if (miss.length) below = '<div class="rx-oth">' + miss.map(x => { const p = r.hidden(x[0]);
        return '<div class="rx-esc"><span class="rx-oi">' + prizeSmall(p) + '</span><span class="rx-et">A bola ' + (x[0] + 1) + ' que você errou tinha</span><i>+' + Math.round(p.pts) + '</i></div>'; }).join('') + '</div>';
    }
    seen.push(b);
    const tag = allMiss ? 'Errou as 5 · a surpresa' : S.RL_SLOTS[i].name + ' · bola ' + (b + 1);
    box = '<div class="rx-open' + (allMiss ? ' bad' : '') + (below ? ' has-oth' : '') + '" id="rl-open">' +
      (allMiss ? '' : '<b class="rx-stamp rx-st1">Gol!</b>') +
      '<div class="rx-pop"><i class="rx-rays" aria-hidden="true"></i><span class="rx-bigball" aria-hidden="true">' + U.emo('⚽', 'lg') + '</span>' +
      '<span class="rx-half t" aria-hidden="true">' + U.emo('⚽', 'lg') + '</span><span class="rx-half b" aria-hidden="true">' + U.emo('⚽', 'lg') + '</span>' +
      '<div class="rx-card"><small>' + tag + '</small>' + prizeBig(prize) + '<span class="rx-pt">' + ptsTxt(pts) + '</span></div></div>' + below + '</div>';
    stage.insertAdjacentHTML('beforeend', box);
    sfx(ok ? 'goal' : 'miss');
    setTimeout(() => { if ($('rl-open')) { sfx(allMiss ? 'miss' : 'coin'); refresh(); } }, 1000);
    foot(r.done ? (i < 4 ? S.RL_SLOTS[i].name + ' fechada · <b>agora ' + S.RL_SLOTS[i + 1].name.toLowerCase() + '</b>' : '<b>Carreira completa</b>') : S.RL_SLOTS[i].name + ' · <b>' + D.plural(left, 'bola sobrando', 'bolas sobrando') + '</b>', true);
  }

  // ---------- resultado ----------
  function rows(f) {
    return f.slots.map(s => '<div class="rl-row' + (s.best ? ' best' : s.goal ? '' : ' out') + '"><small>' + s.name + '</small><span class="rl-val">' + coneVal(s.cone) + '</span><b><i>' + how(s) + '</i> +' + Math.round(s.pts) + '</b></div>').join('');
  }
  const how = s => s.cone.id ? (s.goal ? 'bola ' + (s.ball + 1) : 'errou as 5, veio de surpresa') : s.goals + ' de 5';
  function coneVal(c) {
    if (c.id) return crest(c.id, 'xs') + esc(c.name);
    if ('ga' in c) return esc(c.name);
    return esc(c.name);
  }
  // Pesos e faixas da nota, com os números do motor (S.RL_W, S.RL_GRADES): a sua faixa fica em destaque
  const TIT_LBL = { copa: 'Copa nacional', liga: 'Liga', cont: 'Continental', wc: 'Copa do Mundo', bola: 'Bola de Ouro' };
  function gradeHow(f) {
    const w = S.RL_W, tit = w.tit.slice().sort((a, b) => b[1] - a[1]);
    const line = (lbl, txt) => '<div class="rl-row rl-how"><small>' + lbl + '</small><span>' + txt + '</span></div>';
    const bands = S.RL_GRADES.map((g, i) => '<span class="' + (g[0] === f.grade ? 'on' : '') + '"><b>' + g[0] + '</b> ' + (g[1] ? g[1] + '+' : 'abaixo de ' + S.RL_GRADES[i - 1][1]) + '</span>').join('');
    return line('Clubes', 'Pela força do time: Base até <b>' + w.base + '</b>, Auge até <b>' + w.auge + '</b>, Último clube até <b>' + w.ultimo + '</b> (voltar pro clube da base: +' + w.home + ')') +
      line('G/A', '<b>1 ponto</b> a cada ' + w.ga + ' gols + assistências') +
      line('Títulos', tit.map(t => TIT_LBL[t[0]] + ' <b>' + t[1] + '</b>').join(' · ') + ' (cada um)') +
      line('Combos', 'Lenda (Copa do Mundo + Bola de Ouro), Dinastia (continental + Bola de Ouro num gigante) e Matador (10 de 10): <b>+6</b> cada') +
      '<div class="rl-bands">' + bands + '</div>';
  }
  // Fim da partida: conta na sequência de dias (a primeira do dia libera o prêmio), no perfil e no recorde, uma vez por partida
  function credit(f) {
    if (!run.sk) run.sk = { got: U.ITEMS.streakRecord() };
    if (!run.best) { const b = +load(BEST) || 0; run.best = { old: b }; if (f.total > b) store(BEST, f.total); }
    return U.profileRel(run, f);
  }
  function result() {
    const f = S.rlScore(run.seed, run.rounds), vs = run.vs;
    // Uma chance só por desafio (os prêmios escondidos já foram vistos)
    if (vs) store(KEY, Object.assign(load(KEY) || {}, { done: true }));
    const pr = credit(f);
    if (run.x1 && !vs) return seal();
    show({ name: run.name, seed: run.seed, rounds: run.rounds }, vs ? { name: vs.n, rounds: vs.p } : null, pr);
  }

  // X1 de quem desafia: terminou e não vê nada. O resultado vai lacrado no link
  function seal() {
    const r = run;
    store(SEALED, sealed().filter(x => x.s !== r.seed).concat([{ s: r.seed, p: r.rounds, n: r.name, at: Date.now() }]).slice(-5));
    render('<div class="rx-scr rx-end">' + head({ nav: 'home', id: 'rl-home', label: 'Voltar ao início', title: 'Resultado lacrado' }) +
      '<div class="card rl-seal">' + U.emo('🔒', 'lg') + '<b>Nem você sabe quanto fez</b>' +
        '<span>Mande o link pro seu amigo. Ele cobra com os mesmos prêmios escondidos e, quando terminar, os dois resultados abrem juntos. Depois ele te manda o duelo de volta.</span></div>' +
      casasHtml(-1, true) + U.streakFinale(r.sk.got) +
      '<div class="rx-foot rx-stick">' + ticket('rl-share', 'Mandar o X1', 'Uma chance só, para vocês dois', 'X1', U.emo('🎯', 'sm')) + '</div></div>');
    headBind();
    $('rl-home').onclick = () => U.home();
    U.streakBind();
    $('rl-share').onclick = () => shareX1($('rl-share'), r);
  }

  // Resultado. Sozinho: cada bola já abriu na hora, vai direto para a carreira. Com adversário (X1 ou desafio), primeiro a
  // revelação lado a lado (unveil), depois a tela com tudo.
  // me/opp: { name, seed, rounds }. pr: XP da partida (só quando acabou de jogar; ao abrir um duelo recebido, nada conta)
  const show = (me, opp, pr) => {
    if (!opp) { if (window.CLIMBIX_STAT) window.CLIMBIX_STAT('end', 'relampago'); return page(me, opp, pr); }
    unveil(me, opp, () => page(me, opp, pr));
  };
  function page(me, opp, pr) {
    const live = !!pr, f = S.rlScore(me.seed, me.rounds), g = opp ? S.rlScore(me.seed, opp.rounds) : null;
    const diff = g ? f.total - g.total : 0;
    const nx = S.rlNext(f.total), miss = live ? S.rlMissed(me.seed, me.rounds).slice(0, 3) : [];
    const after = !live ? '' : '<div class="rl-after">' +
      (run.best.old && f.total > run.best.old ? '<b class="rl-rec">' + U.emo('🏅', 'xs') + ' Novo recorde! Antes: ' + run.best.old + '</b>'
        : run.best.old ? '<span>Seu recorde: <b>' + Math.max(run.best.old, f.total) + ' pontos</b></span>' : '') +
      (nx ? '<span>' + (nx.need === 1 ? 'Faltou <b>1 ponto' : 'Faltaram <b>' + nx.need + ' pontos') + '</b> para a nota ' + nx.grade + '</span>' : '') +
      (miss.length ? '<div class="rl-miss"><small>O que escapou</small>' + miss.map(m => '<span>' + (m.prize.id ? crest(m.prize.id, 'xs') : m.prize.items ? trophyImg(m.prize.items[0][0], 18) : '') + '<b>' + esc(m.prize.name) + '</b> <i>' + m.slot + ', bola ' + m.ball + '</i></span>').join('') + '</div>' : '') +
      '</div>';
    const combos = f.combos.length ? '<div class="rl-combos">' + f.combos.map(c => '<span>' + U.emo('🔥', 'xs') + ' <b>' + c.name + '</b> ' + c.desc + (c.pts ? ' (+' + c.pts + ')' : '') + '</span>').join('') + '</div>' : '';
    // Coluna de cada um: a casa abre ao mesmo tempo dos dois lados, e quem levou mais pontos nela fica marcado
    const col = (who, sc, other, mine) => '<div class="rl-col' + (mine ? ' me' : '') + '"><div class="rl-col-h"><b>' + esc(who) + '</b></div>' +
      sc.slots.map((s, k) => '<div class="rl-mini' + (s.goal ? '' : ' out') + (s.pts > other.slots[k].pts ? ' win' : '') + '"><small>' + s.name + '</small>' + coneMini(s.cone) + '</div>').join('') + '</div>';
    const grade = sc => '<span class="rl-grade g-' + sc.grade + '">' + sc.grade + '</span>';
    const kicksTxt = D.plural(f.slots.reduce((a, s) => a + s.goals, 0), 'gol', 'gols') + ' em ' + D.plural(f.slots.reduce((a, s) => a + s.kicks, 0), 'cobrança', 'cobranças');
    // Placar escuro: no duelo, "VOCÊ 52 x 30 RAFA" com a nota de cada um; sozinho, nota, nome e pontos
    const board = g ? '<div class="ob5-board rl-sb"><div class="rl-sb-t me"><b>' + esc(me.name) + '</b>' + grade(f) + '</div>' +
        '<b class="ob5-g' + (diff >= 0 ? ' win' : '') + '">' + f.total + '</b><span class="ob5-x">x</span><b class="ob5-g' + (diff <= 0 ? ' win' : '') + '">' + g.total + '</b>' +
        '<div class="rl-sb-t"><b>' + esc(opp.name) + '</b>' + grade(g) + '</div></div>'
      : '<div class="ob5-board rl-sb solo">' + grade(f) + '<div class="ob5-mid"><b class="rl-ob-nm">' + esc(me.name) + '</b><small>' + kicksTxt + '</small></div>' +
        '<div class="rl-ob-c pts"><b>' + f.total + '</b><small>pontos</small></div></div>';
    const title = g ? (diff > 0 ? (live ? 'Você ganhou!' : esc(me.name) + ', você ganhou!') : diff === 0 ? 'Empate!' : esc(opp.name) + ' ganhou') : 'Sua carreira';
    // Ação principal no ingresso coral embaixo; "Jogar de novo" fica como link
    const tk = !live ? ticket('rl-again', 'Novo X1', 'Desafie de volta com uma carreira nova', 'nota', f.grade)
      : window.CLIMBIX_SOLO ? ticket('rl-again', 'Jogar de novo', 'Outra carreira, 1 minuto', 'nota', f.grade)
      : g ? ticket('rl-share', 'Mandar o resultado', 'Pro ' + esc(opp.name) + ' abrir o link e ver o duelo', 'nota', f.grade)
      : ticket('rl-share', 'Compartilhar', 'Manda a carreira pros amigos', 'nota', f.grade);
    const again = live && !window.CLIMBIX_SOLO ? '<button class="link-btn rx-again" id="rl-again">Jogar de novo</button>' : '';
    // Sozinho: as 5 casas no cartão creme (clube, prêmio, a bola que entrou e os pontos)
    const solo = '<div class="card rx-list">' + rows(f) + '</div>';
    render('<div class="rx-scr rx-end rl-show" id="rl-show">' + head({ nav: 'home', id: 'rl-home', label: 'Voltar ao início', title: g ? title : 'Sua carreira' }) + board +
      (g ? '<div class="rl-unveil" id="rl-unveil"><div class="rl-duel">' + col(me.name, f, g, true) + col(opp.name, g, f) + '</div></div>' : solo) +
      (combos || after ? '<div class="rl-res">' + combos + after + '</div>' : '') +
      (g ? '<details class="ob5-how rl-det"><summary>Casa a casa (' + kicksTxt + ')</summary>' + rows(f) + '</details>' : '') +
      '<details class="ob5-how rl-det"><summary>Como a nota é feita</summary>' + gradeHow(f) + '</details>' +
      (live ? U.profileFinale(pr) + U.streakFinale(run.sk.got) : '') +
      '<div class="rx-foot rx-stick">' + tk + again + '</div></div>');
    headBind();
    $('rl-again').onclick = () => intro();
    $('rl-home').onclick = () => U.home();
    if (live) U.streakBind();
    const b = $('rl-share');
    if (b) b.onclick = () => g ? shareDuel(b) : shareSolo(b, f);
  }
  // Revelação: casa por casa aparecem as 5 bolas, o prêmio de cada uma vira, a bola que entrou sobe com o prêmio e as outras
  // ficam com o prêmio perdido riscado; o placar sobe junto. No X1 cada um tem a sua fileira (mesmos prêmios nas mesmas bolas). No fim o placar cresce, a nota cai como
  // carimbo e, no X1, aparece quem ganhou com confete. Toque na tela: pula para o fim.
  function unveil(me, opp, done) {
    const f = S.rlScore(me.seed, me.rounds), g = opp ? S.rlScore(me.seed, opp.rounds) : null;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return done();
    // Uma fileira de 5 bolas por jogador, cada uma com o prêmio que escondia embaixo (lacrado até virar)
    const row = (who, side) => '<div class="rlv-side" data-s="' + side + '">' + (g ? '<b class="rlv-who">' + esc(who) + '</b>' : '') +
      '<div class="rlv-row">' + [0, 1, 2, 3, 4].map(j => '<div class="rlv-b"><span class="rlv-ball">' + U.emo('⚽', 'sm') + '<i>' + (j + 1) + '</i></span>' +
        '<div class="rlv-pz"><div class="rlv-in"><div class="rlv-back">' + U.emo('🔒', 'xs') + '</div><div class="rlv-front"></div></div></div><em class="rlv-tag"></em></div>').join('') + '</div>' +
      '<b class="rlv-plus"></b></div>';
    const sb = g ? '<div class="ob5-board rlv-sb"><b class="rlv-n">' + esc(me.name) + '</b><b class="ob5-g" id="rlv-a">0</b><span class="ob5-x">x</span><b class="ob5-g" id="rlv-b">0</b><b class="rlv-n">' + esc(opp.name) + '</b></div>'
      : '<div class="ob5-board rlv-sb solo"><b class="rlv-n">' + esc(me.name) + '</b><span><b class="ob5-g" id="rlv-a">0</b><small>pontos</small></span></div>';
    render('<div class="rlv' + (g ? ' duel' : '') + '" id="rlv"><div class="rlv-top"><div class="eyebrow">' + (g ? 'X1 relâmpago' : 'Carreira Relâmpago') + '</div>' +
      '<h2 id="rlv-h">' + (g ? 'Abrindo o X1' : 'Abrindo a carreira') + '</h2></div>' + sb +
      '<div class="rlv-casa"><small id="rlv-k"></small><b id="rlv-nm"></b><span id="rlv-rule"></span></div>' +
      '<div class="rlv-cards">' + row(me.name, 'a') + (g ? row(opp.name, 'b') : '') + '</div>' +
      '<div class="rlv-strip">' + S.RL_SLOTS.map(sl => '<span><small>' + sl.name + '</small><i></i></span>').join('') + '</div>' +
      '<div class="rlv-end" id="rlv-end"></div><button class="link-btn rlv-skip" id="rlv-skip">Pular</button></div>');
    const root = $('rlv'), sides = [...root.querySelectorAll('.rlv-side')], strip = [...root.querySelectorAll('.rlv-strip span')];
    const runs = [me.rounds].concat(g ? [opp.rounds] : []);
    let tot = [0, 0], timers = [], over = false;
    const later = (fn, ms) => timers.push(setTimeout(() => { if ($('rlv') === root) fn(); }, ms));
    // Placar contando até o novo valor
    const count = (el, from, to) => { const t0 = performance.now(), d = 600;
      const tick = t => { if (!el.isConnected) return; const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); };
    // Prêmio pequeno de cada bola: clube (escudo e nome), gols e assistências separados, ou o título
    const pz = c => c.id ? crest(c.id, 'sm') + '<em>' + esc(c.name) + '</em>'
      : 'ga' in c ? '<span class="rlv-ga"><b>' + c.gols + '</b><i>gols</i><b>' + c.ast + '</b><i>assist.</i></span>'
      : '<span class="rlv-ti">' + trophyImg(c.items[0][0], 22) + '<b>' + c.items[0][1] + '×</b></span><em>' + esc(c.items[0][0]) + '</em>';
    const TAG = { got: 'é seu', miss: 'errou', left: 'sobrou', fall: 'ficou' };
    function casa(k) {
      const sl = S.RL_SLOTS[k], A = f.slots[k], B = g && g.slots[k];
      $('rlv-k').textContent = 'Casa ' + (k + 1) + ' de 5';
      const nm = $('rlv-nm'); nm.textContent = sl.name; nm.classList.remove('pop'); void nm.offsetWidth; nm.classList.add('pop');
      $('rlv-rule').textContent = k < 3 ? 'Vale o clube da bola que entrou' : 'Você leva o prêmio de cada bola que entrou';
      strip.forEach((el, j) => el.classList.toggle('now', j === k));
      const balls = runs.map(rd => S.rlBalls(me.seed, rd, k));
      sides.forEach((sd, p) => { sd.querySelector('.rlv-plus').className = 'rlv-plus';
        sd.querySelectorAll('.rlv-b').forEach((el, j) => { const b = balls[p][j]; el.className = 'rlv-b';
          el.querySelector('.rlv-front').innerHTML = pz(b.prize); el.querySelector('.rlv-tag').textContent = ''; }); });
      sfx('tick');
      // As cartas viram uma a uma, da bola 1 à 5
      [0, 1, 2, 3, 4].forEach(j => later(() => { sides.forEach(sd => sd.querySelectorAll('.rlv-b')[j].classList.add('open')); sfx('paper'); }, 350 + j * 110));
      // A bola que entrou sobe com o prêmio; as outras ficam com o prêmio perdido riscado
      later(() => {
        sides.forEach((sd, p) => sd.querySelectorAll('.rlv-b').forEach((el, j) => { const st = balls[p][j].st; el.classList.add(st); el.querySelector('.rlv-tag').textContent = TAG[st]; }));
        sfx(balls.some(bs => bs.some(b => b.st === 'got')) ? 'coin' : 'miss');
      }, 1150);
      later(() => {
        const pa = A.pts, pb = B ? B.pts : 0;
        sides.forEach((sd, p) => { const pl = sd.querySelector('.rlv-plus'); pl.textContent = '+' + Math.round(p ? pb : pa) + ' pts'; pl.className = 'rlv-plus on' + (g ? ((p ? pb > pa : pa > pb) ? ' win' : '') : ''); });
        const na = Math.round(tot[0] + pa), nb = Math.round(tot[1] + pb);
        count($('rlv-a'), Math.round(tot[0]), na); if (g) count($('rlv-b'), Math.round(tot[1]), nb);
        tot = [tot[0] + pa, tot[1] + pb];
        strip[k].classList.add('done'); strip[k].querySelector('i').innerHTML = g ? (pa > pb ? esc(me.name.slice(0, 1)) : pb > pa ? esc(opp.name.slice(0, 1)) : '=') : '+' + Math.round(pa);
        if (g && pa !== pb) strip[k].classList.add(pa > pb ? 'a' : 'b');
        sfx('tap');
      }, 1750);
      later(() => (k < 4 ? casa(k + 1) : finale()), 3000);
    }
    // Fim: combos somam, o placar vai para o total, a nota carimba e, no X1, o vencedor
    function finale() {
      if (over) return; over = true;
      if (window.CLIMBIX_STAT) window.CLIMBIX_STAT('end', 'relampago');
      timers.forEach(clearTimeout); timers = [];
      const diff = g ? f.total - g.total : 0;
      $('rlv-a').textContent = f.total; if (g) $('rlv-b').textContent = g.total;
      root.classList.add('fin');
      if (g) { const a = root.querySelector('#rlv-a'), b = root.querySelector('#rlv-b'); a.classList.toggle('win', diff >= 0); b.classList.toggle('win', diff <= 0); }
      const stamp = sc => '<span class="rl-grade big g-' + sc.grade + '">' + sc.grade + '</span>';
      const who = g ? (diff > 0 ? me.name : diff < 0 ? opp.name : '') : '';
      const conf = (!g || diff !== 0) ? '<div class="rlv-confetti" aria-hidden="true">' + Array.from({ length: 34 }, (_, k) => '<i style="left:' + ((k * 37) % 100) + '%;background:' + ['#F4C430', '#5FD690', '#fff', '#FF6B73', '#8FD6AE'][k % 5] + ';animation-delay:' + ((k * 0.11) % 1).toFixed(2) + 's;animation-duration:' + (1.5 + (k % 5) * 0.25).toFixed(2) + 's"></i>').join('') + '</div>' : '';
      $('rlv-h').textContent = g ? (diff === 0 ? 'Empate!' : who + ' ganhou!') : 'Sua carreira';
      $('rlv-end').innerHTML = conf + '<div class="rlv-stamps">' + (g ? '<span>' + stamp(f) + '<small>' + esc(me.name) + '</small></span><span>' + stamp(g) + '<small>' + esc(opp.name) + '</small></span>' : '<span>' + stamp(f) + '<small>nota</small></span>') + '</div>' +
        (f.combos.length ? '<div class="rlv-combos">' + f.combos.map(c => '<span>' + U.emo('🔥', 'xs') + ' ' + c.name + '</span>').join('') + '</div>' : '') +
        '<button class="btn" id="rlv-go">Ver a carreira inteira</button>';
      $('rlv-skip').remove();
      sfx(g && diff < 0 ? 'miss' : 'fanfare');
      $('rlv-go').onclick = done;
    }
    $('rlv-skip').onclick = e => { e.stopPropagation(); finale(); };
    root.addEventListener('pointerdown', e => { if (!over && !e.target.closest('button')) finale(); });
    later(() => casa(0), 500);
  }

  // Duelo recebido de volta (quem desafiou abre o link do amigo): mesmo resultado, do lado de quem desafiou
  function duelView(du) {
    G.c = null; U.bar();
    run = null;
    show({ name: du.n, seed: du.s, rounds: du.p }, { name: du.m, rounds: du.q }, null);
  }

  async function send(b, text, url) {
    const old = b.innerHTML;
    try { if (navigator.share) { await navigator.share({ title: 'Climbix', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); b.innerHTML = 'Link copiado! Cole no WhatsApp'; setTimeout(() => { b.innerHTML = old; }, 2500); }
    catch (e) { prompt('Copie o link:', text + ' ' + url); }
  }
  // Sozinho: a carreira em texto e o endereço do jogo (sem desafio: o X1 é o modo de desafiar)
  function shareSolo(b, f) {
    const get = k => f.slots.find(s => s.key === k).cone;
    send(b, 'Minha Carreira Relâmpago no Climbix, chutando às cegas: ' + get('base').name + ' → ' + get('auge').name + ' → ' + get('ultimo').name + ', ' + get('ga').gols + ' gols, ' + get('ga').ast + ' assistências e ' + get('tit').name +
      '. ' + f.total + ' pontos (nota ' + f.grade + '). Monta a sua ⚡', base());
  }
  const shareX1 = (b, r) => send(b, 'Te chamei pro X1 na Carreira Relâmpago do Climbix ⚡ Meu resultado tá lacrado: só abre quando você jogar. Mesmos prêmios escondidos, uma chance só.', base() + '?r=' + encode(r));
  const shareDuel = b => send(b, 'Joguei o seu X1 na Carreira Relâmpago. Abre pra ver quem ganhou 👀',
    base() + '?r=' + encode({ name: run.vs.n, seed: run.seed, rounds: run.vs.p }, { name: run.name, rounds: run.rounds }));

  Object.assign(U, { relampagoFromLink: fromLink, relampagoHome: homeHtml, relampagoHomeBind: homeBind, relampago: intro, relampagoEncode: encode, relampagoDecode: decode, relampagoShow: show });
})();
