// Interface — Carreira Relâmpago: 5 casas de 5 pênaltis montam Base, Auge, Último clube, G/A e Títulos (regras em engine/relampago.js).
// O link de desafio (?r=...) leva a semente e os chutes de quem desafiou: o amigo tem os mesmos sorteios e, no fim, as duas
// carreiras aparecem lado a lado. Tudo vai dentro do link (sem servidor).
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, G, esc, $, load, store, render, crest, sfx } = U;
  const KEY = 'climbix-relampago-desafio', NAME = 'climbix-relampago-nome', PLAYED = 'climbix-relampago-jogados', BEST = 'climbix-relampago-recorde';
  let run = null; // { seed, rounds, name, vs }

  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // n: nome, s: semente, v: 2, p: cobranças de cada casa na ordem em que saíram, cada uma com a bola (0 a 4) e 1 = gol / 0 = errou
  // ('3041' = bola 4 errou, bola 5 gol), casas separadas por '-'. Sem v (links antigos): bolas da esquerda para a direita, '1'/'0'
  const encode = r => b64(JSON.stringify({ n: String(r.name).slice(0, 20), s: r.seed, v: 2, p: r.rounds.map(k => k.map(x => x[0] + '' + x[1]).join('')).join('-') }));
  const legacy = p => p.map(ks => ks.map((v, j) => Array.isArray(v) ? v : [j, v === 1 || v === 2 ? 1 : 0]));
  function decode(q) {
    try {
      const d = JSON.parse(unb64(String(q).slice(0, 300)));
      if (!d || !(d.s >= 0 && d.s <= 4294967295)) return null;
      let p;
      if (d.v === 2) {
        if (!/^([0-4][01]){1,5}(-([0-4][01]){1,5}){4}$/.test(String(d.p))) return null;
        p = String(d.p).split('-').map(k => k.match(/../g).map(x => [+x[0], +x[1]]));
        if (p.some(ks => new Set(ks.map(x => x[0])).size !== ks.length)) return null; // a mesma bola duas vezes
      } else {
        if (!/^[012]{1,5}(-[012]{1,5}){4}$/.test(String(d.p))) return null;
        p = legacy(String(d.p).split('-').map(k => k.split('').map(Number)));
      }
      if (S.rlCareer(d.s >>> 0, p).length !== 5) return null;
      return { n: String(d.n || 'Alguém').slice(0, 20), s: d.s >>> 0, p };
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
    if (d) store(KEY, Object.assign(d, { at: Date.now() }, played().includes(d.s) ? { done: true, again: true } : {}));
  }

  // ---------- tela inicial ----------
  function homeHtml() {
    const d = active();
    const old = load(KEY);
    if (!d && old && (old.again || (!old.done && played().includes(old.s)))) return '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" aria-label="Fechar">' + U.ICON.x + '</button>' +
      '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>Desafio relâmpago</small><b>Você já jogou esse desafio</b><span>Cada desafio vale uma vez só. Desafie de volta com uma carreira nova</span></div></div></div>' + btn();
    const card = d ? (() => { const f = S.rlScore(d.s, d.p);
      return '<div class="card dz-home rl-dz"><button class="dz-x" id="rl-x" aria-label="Descartar desafio">' + U.ICON.x + '</button>' +
        '<div class="dz-top">' + U.emo('⚡', 'md') + '<div><small>Desafio relâmpago</small><b>' + esc(d.n) + ' fez ' + f.total + ' pontos</b>' +
        '<span>Nota ' + f.grade + ' · mesmos sorteios pra você</span></div></div>' +
        '<button class="btn rl-go" id="rl-accept">Aceitar desafio</button></div>'; })() : '';
    return card + btn();
  }
  const btn = () => '<button class="hg rl-btn" id="b-relampago"><i>' + U.emo('⚡', 'sm') + '</i><b>Carreira Relâmpago</b><small>5 casas, 5 bolas cada. Desafie um amigo</small></button>';
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
      // As 5 casas desenhadas como no quadro do jogo (clubes e prêmios) e as regras em lista, cada uma com o seu ícone
      '<div class="rl-intro"><p class="rl-i-lead"><b>5 casas montam a carreira.</b> Cada casa tem <b>5 bolas</b>.</p>' +
        '<div class="rl-i-map"><div class="rl-board">' + S.RL_SLOTS.map(sl => '<div class="rl-cell"><small>' + sl.name + '</small><span class="rl-i-balls" aria-hidden="true">' + '<i></i>'.repeat(5) + '</span></div>').join('') + '</div>' +
          '<div class="rl-i-groups"><span>' + U.emo('⚽', 'xs') + ' Clubes</span><span>' + U.emo('🏆', 'xs') + ' Prêmios</span></div></div>' +
        '<ul class="rl-i-rules">' +
          '<li>' + U.emo('👆', 'sm') + '<span><b>Você escolhe qual bola chutar</b>, uma de cada vez.</span></li>' +
          '<li>' + U.emo('⚽', 'sm') + '<span>Nos clubes, cada bola esconde um time: vale <b>a primeira que entrar</b>. Errou as 5, fica o mais fraco.</span></li>' +
          '<li>' + U.emo('🏆', 'sm') + '<span>Em G/A e Títulos cada bola esconde gols e assistências ou um título: <b>você leva o de cada bola que entrar</b>. Copa do Mundo e Bola de Ouro valem mais.</span></li>' +
          '<li>' + U.emo('😤', 'sm') + '<span>A mira <b>acelera a cada casa</b>.</span></li>' +
        '</ul></div>' +
      '<div class="field"><label for="rl-name">Seu nome no desafio</label><input id="rl-name" maxlength="20" autocomplete="nickname" placeholder="Ex.: Vitinho" value="' + esc(name) + '"></div>' +
      '<button class="btn" id="rl-start">' + (d ? 'Jogar o desafio' : 'Começar') + '</button>');
    $('rl-back').onclick = () => U.home();
    $('rl-start').onclick = () => {
      const n = ($('rl-name').value || '').trim().slice(0, 20) || 'Você';
      store(NAME, n === 'Você' ? '' : n);
      run = { seed: d ? d.s : S.rlNewSeed(), rounds: [], name: n, vs: d };
      markPlayed(run.seed);
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
    if ('ga' in c) return '<b class="rl-ga">' + c.ga + '</b>';
    return '<span class="rl-tr">' + c.items.map(([n, q]) => trophyImg(n, 18) + '<i>' + q + '</i>').join('') + '</span><em>' + esc(c.name) + '</em>';
  }
  // Prêmio por extenso (revelado depois da cobrança)
  function prize(c) {
    let inner;
    if (c.id) inner = crest(c.id, 'sm') + '<em>' + esc(c.name) + '</em>';
    else if ('ga' in c) inner = '<span class="rl-gas"><b class="rl-ga">' + c.gols + '</b><i>gols</i><b class="rl-ga">' + c.ast + '</b><i>assistências</i></span>';
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
  // Situação de cada bola, da esquerda para a direita: 1 gol, 0 errou, undefined ainda não chutada
  const stateOf = (kicks, j) => { const x = kicks.find(k => k[0] === j); return x ? x[1] : undefined; };
  const dots = kicks => '<span class="rl-dots">' + [0, 1, 2, 3, 4].map(j => { const v = stateOf(kicks, j); return '<i class="' + (v === 1 ? 'g' : v === 0 ? 'x' : '') + '"></i>'; }).join('') + '</span>';

  // Pontos das casas já fechadas (o total final ainda soma os combos)
  const ptsNow = () => Math.round(S.rlCareer(run.seed, run.rounds).reduce((a, s) => a + s.pts, 0));
  function play() {
    const i = current();
    if (i >= 5) return result();
    const sl = S.RL_SLOTS[i], kicks = run.rounds[i], k = kicks.length;
    const rule = i < 3 ? 'Vale o clube da primeira bola que entrar' : 'Você leva o prêmio de cada bola que entrar';
    render('<div class="rl-head"><div class="ob5-board rl-ob"><div class="rl-ob-c"><small>Casa</small><b>' + (i + 1) + '/5</b></div>' +
      '<div class="ob5-mid"><b class="rl-ob-nm">' + sl.name + '</b><small>Cobrança ' + (k + 1) + ' de 5</small></div>' +
      '<div class="rl-ob-c pts"><small>Pontos</small><b id="rl-pts">' + ptsNow() + '</b></div></div>' +
      '<div class="rl-rule"><span>' + rule + '</span>' + dots(kicks) + '</div></div>' + boardHtml(i) +
      '<div class="rl-pick" id="rl-pick"><small>Escolha a bola</small><div class="rl-balls">' + [0, 1, 2, 3, 4].map(j => {
        const v = stateOf(kicks, j);
        return '<button class="rl-ball' + (v === 1 ? ' g' : v === 0 ? ' x' : '') + '" data-b="' + j + '"' + (v === undefined ? '' : ' disabled') + ' aria-label="Bola ' + (j + 1) + '">' +
          U.emo('⚽', 'md') + '<i>' + (j + 1) + '</i></button>';
      }).join('') + '</div></div>' +
      '<div class="rl-stage"><div id="rl-kick"></div><div class="rl-reveal" id="rl-reveal" hidden></div></div>');
    document.querySelectorAll('.rl-ball:not([disabled])').forEach(b => { b.onclick = () => kick(i, +b.dataset.b); });
    // Bola 3D no lugar do emoji (se o 3D estiver ligado e carregar)
    const B = window.CRAQUE_BALL;
    if (B && B.snapshot && !(window.CLIMBIX_CFG && window.CLIMBIX_CFG.fx3d === false)) B.snapshot().then(url => {
      if (url) document.querySelectorAll('.rl-ball').forEach(b => { const e = b.querySelector('.tw'); if (e) e.outerHTML = '<img class="rl-b3" src="' + url + '" alt="">'; });
    });
  }

  // Cobra a bola b: ela vai para a marca e as outras que ainda não saíram ficam na fila
  function kick(i, b) {
    const kicks = run.rounds[i], pick = $('rl-pick');
    if (pick) pick.remove();
    const others = [0, 1, 2, 3, 4].filter(j => j !== b && stateOf(kicks, j) === undefined).map(j => BX[j]);
    window.CRAQUE_KICK($('rl-kick'), { c: kicker(), moment: { type: 'cup' }, setup: S.rlKickSetup(i), keeperGuess: S.RL_KEEPER,
      ballX: BX[b], extraBalls: others, onDone: ok => { kicks.push([b, ok ? 1 : 0]); reveal(i, ok); } });
  }

  // Depois de cada cobrança: o que a bola valia; quando a casa acaba, o prêmio e os pontos
  function reveal(i, ok) {
    const kicks = run.rounds[i], r = S.rlRound(run.seed, i, prevOf(i), kicks), box = $('rl-reveal');
    if (!box) return;
    const dl = document.querySelector('.rl-dots'); if (dl) dl.outerHTML = dots(kicks);
    const club = i < 3;
    let msg, shown = r.cone;
    if (club) {
      if (ok) msg = 'Esse é o seu clube';
      else if (r.done) msg = 'Nenhuma entrou. Sobrou';
      else { msg = 'Essa bola era'; shown = r.hidden(kicks[kicks.length - 1][0]); }
    } else { msg = ok ? 'Você levou' : 'Essa bola tinha'; shown = r.hidden(kicks[kicks.length - 1][0]); }
    box.hidden = false;
    box.className = 'rl-reveal ' + (ok ? 'ok' : 'ko') + (!ok && !(club && r.done) ? ' lost' : '');
    box.innerHTML = '<b class="rl-stamp">' + (ok ? 'Gol!' : 'Errou') + '</b><small>' + msg + '</small>' +
      '<div class="rl-prize">' + prize(shown) + '</div>' + (!club && r.done ? '<div class="rl-sum"><small>Total da casa</small>' + esc(r.cone.name) + '</div>' : '') + (r.done ? '<b class="rl-pts">+' + String(r.cone.pts).replace('.', ',') + ' pts</b>' : '') +
      (club && ok && kicks.length < 5 ? rest(r, kicks) : '') +
      '<button class="btn" id="rl-next">' + (!r.done ? 'Próxima bola' : i < 4 ? 'Próxima casa' : 'Ver a carreira') + '</button>';
    if (r.done) { const board = document.querySelector('.rl-board'); if (board) board.outerHTML = boardHtml(i); const p = $('rl-pts'); if (p) p.textContent = ptsNow(); }
    sfx(ok ? 'goal' : 'kick');
    $('rl-next').onclick = play;
  }

  // As bolas que ficaram sem chutar: o que cada uma escondia
  const rest = (r, kicks) => '<div class="rl-rest"><small>As outras bolas tinham</small><span>' +
    [0, 1, 2, 3, 4].filter(j => stateOf(kicks, j) === undefined).map(j => { const c = r.hidden(j); return '<i title="' + esc(c.name) + '">' + crest(c.id, 'xs') + '<em>' + esc(c.name) + '</em></i>'; }).join('') + '</span></div>';

  // ---------- resultado ----------
  function rows(f) {
    return f.slots.map(s => '<div class="rl-row' + (s.best ? ' best' : s.goal ? '' : ' out') + '"><small>' + s.name + '</small><span class="rl-val">' + coneVal(s.cone) + '</span><b><i>' + how(s) + '</i> +' + Math.round(s.pts) + '</b></div>').join('');
  }
  const how = s => s.cone.id ? (s.goal ? 'gol na ' + s.kicks + 'ª' : 'nenhuma entrou') : s.goals + ' de 5';
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
  function result() {
    const f = S.rlScore(run.seed, run.rounds), vs = run.vs;
    const g = vs ? S.rlScore(vs.s, vs.p) : null;
    const diff = g ? f.total - g.total : 0;
    // Uma chance só por desafio (os prêmios escondidos já foram vistos)
    if (g) store(KEY, Object.assign(load(KEY) || {}, { done: true }));
    // Conta como carreira terminada na sequência de dias (a primeira do dia libera o prêmio): uma vez por partida
    if (!run.sk) run.sk = { got: U.ITEMS.streakRecord() };
    // Recorde (uma vez por partida): o anterior fica guardado para mostrar "novo recorde"
    if (!run.best) { const b = +load(BEST) || 0; run.best = { old: b }; if (f.total > b) store(BEST, f.total); }
    const nx = S.rlNext(f.total), miss = S.rlMissed(run.seed, run.rounds).slice(0, 3);
    const after = '<div class="rl-after">' +
      (run.best.old && f.total > run.best.old ? '<b class="rl-rec">' + U.emo('🏅', 'xs') + ' Novo recorde! Antes: ' + run.best.old + '</b>'
        : run.best.old ? '<span>Seu recorde: <b>' + Math.max(run.best.old, f.total) + ' pontos</b></span>' : '') +
      (nx ? '<span>' + (nx.need === 1 ? 'Faltou <b>1 ponto' : 'Faltaram <b>' + nx.need + ' pontos') + '</b> para a nota ' + nx.grade + '</span>' : '') +
      (miss.length ? '<div class="rl-miss"><small>O que escapou</small>' + miss.map(m => '<span>' + (m.prize.id ? crest(m.prize.id, 'xs') : '') + '<b>' + esc(m.prize.name) + '</b> <i>' + m.slot + ', bola ' + m.ball + '</i></span>').join('') + '</div>' : '') +
      '</div>';
    const combos = f.combos.length ? '<div class="rl-combos">' + f.combos.map(c => '<span>' + U.emo('🔥', 'xs') + ' <b>' + c.name + '</b> ' + c.desc + (c.pts ? ' (+' + c.pts + ')' : '') + '</span>').join('') + '</div>' : '';
    const col = (who, sc, me) => '<div class="rl-col' + (me ? ' me' : '') + '"><div class="rl-col-h"><b>' + esc(who) + '</b></div>' +
      sc.slots.map(s => '<div class="rl-mini' + (s.goal ? '' : ' out') + '"><small>' + s.name + '</small>' + coneMini(s.cone) + '</div>').join('') + '</div>';
    const grade = sc => '<span class="rl-grade g-' + sc.grade + '">' + sc.grade + '</span>';
    const kicksTxt = f.slots.reduce((a, s) => a + s.goals, 0) + ' gols em ' + f.slots.reduce((a, s) => a + s.kicks, 0) + ' cobranças';
    // Placar escuro: no duelo, "VOCÊ 52 x 30 RAFA" com a nota de cada um; sozinho, nota, nome e pontos
    const board = g ? '<div class="ob5-board rl-sb"><div class="rl-sb-t me"><b>' + esc(run.name) + '</b>' + grade(f) + '</div>' +
        '<b class="ob5-g' + (diff >= 0 ? ' win' : '') + '">' + f.total + '</b><span class="ob5-x">x</span><b class="ob5-g' + (diff <= 0 ? ' win' : '') + '">' + g.total + '</b>' +
        '<div class="rl-sb-t"><b>' + esc(vs.n) + '</b>' + grade(g) + '</div></div>'
      : '<div class="ob5-board rl-sb solo">' + grade(f) + '<div class="ob5-mid"><b class="rl-ob-nm">' + esc(run.name) + '</b><small>' + kicksTxt + '</small></div>' +
        '<div class="rl-ob-c pts"><b>' + f.total + '</b><small>pontos</small></div></div>';
    render('<div class="rl-rh"><div class="eyebrow">Carreira Relâmpago</div>' +
      '<h2>' + (g ? (diff > 0 ? 'Você ganhou!' : diff === 0 ? 'Empate!' : esc(vs.n) + ' ganhou') : 'Sua carreira') + '</h2></div>' + board +
      (g ? '<div class="rl-duel">' + col(run.name, f, true) + col(vs.n, g) + '</div>' : boardHtml(-1)) +
      (combos || after !== '<div class="rl-after"></div>' ? '<div class="rl-res">' + combos + after + '</div>' : '') +
      '<details class="ob5-how rl-det"><summary>Casa a casa' + (g ? ' (' + kicksTxt + ')' : '') + '</summary>' + rows(f) + '</details>' +
      '<details class="ob5-how rl-det"><summary>Como a nota é feita</summary>' + gradeHow(f) + '</details>' +
      U.streakFinale(run.sk.got) +
      (window.CLIMBIX_SOLO ? '' : '<button class="btn" id="rl-share">' + U.emo('🎯', 'sm') + ' ' + (g && diff > 0 ? 'Devolver o desafio' : 'Desafiar um amigo') + '<small>Ele cobra com os mesmos times escondidos</small></button>') +
      '<button class="btn ghost" id="rl-again">Jogar de novo</button>' +
      '<button class="link-btn" id="rl-home">Voltar ao início</button>');
    $('rl-again').onclick = () => {
      run = { seed: S.rlNewSeed(), rounds: [], name: run.name, vs: null };
      markPlayed(run.seed);
      play();
    };
    $('rl-home').onclick = () => U.home();
    U.streakBind();
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
