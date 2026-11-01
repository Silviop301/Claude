// Prancheta: o campo visto de cima, com os jogadores como bolinhas na cor do uniforme. Base dos lances novos do
// Jogo a Jogo (cada lance é uma configuração: quem corre para onde e o que o dedo faz), sem cena desenhada à mão.
//  CRAQUE_BOARD.make(el, opts): monta o campo (meia-cancha, gol em cima) e devolve ajudantes para pôr jogadores e bola
//  CRAQUE_DRIBBLE (atacante): o zagueiro vem e inclina o corpo para um lado; toque no lado livre enquanto ele está
//                 inclinado. Cedo, ele lê o drible; tarde, ele fecha; lado errado, ele fica com a bola. DRI alarga o tempo.
//  CRAQUE_PASS3 (meia): três companheiros correm marcados; toque no que ficar livre enquanto a linha do passe está aberta.
(function (root) {
  const S = () => root.CRAQUE_SIM;
  const sfx = n => { if (root.CRAQUE_SFX) root.CRAQUE_SFX.play(n); };
  const NS = 'http://www.w3.org/2000/svg';
  const W = 360, H = 320, GX = 180, GOAL_Y = 14; // mesmo tamanho da cena dos outros minigames (cabe na mesma moldura)
  const ease = t => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, k) => a + (b - a) * k;

  function pitch() {
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bd-svg" role="img" aria-label="Campo visto de cima">';
    s += '<rect width="' + W + '" height="' + H + '" class="bd-grass"/>';
    for (let x = 0; x < W; x += 60) s += '<rect x="' + x + '" y="0" width="30" height="' + H + '" class="bd-stripe"/>';
    s += '<g class="bd-line"><rect x="10" y="' + GOAL_Y + '" width="340" height="300"/><rect x="85" y="' + GOAL_Y + '" width="190" height="82"/>' +
      '<rect x="135" y="' + GOAL_Y + '" width="90" height="30"/><path d="M140 96 a40 26 0 0 0 80 0"/><circle cx="180" cy="72" r="2"/><path d="M10 314 h340"/></g>';
    s += '<rect x="150" y="2" width="60" height="' + (GOAL_Y - 2) + '" class="bd-goal" id="bd-net"/>';
    s += '<g id="bd-fx"></g><g id="bd-pl"></g><circle id="bd-ball" r="6" class="bd-ball" cx="-20" cy="-20"/></svg>';
    return s;
  }
  // Um jogador: bolinha com a camisa, a borda do calção e o número; me = você (anel dourado)
  function player(layer, kit, num, me) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bd-p' + (me ? ' me' : ''));
    g.innerHTML = (me ? '<circle r="23" class="bd-halo"/>' : '') + '<circle r="17" fill="' + kit[0] + '" stroke="' + kit[1] + '" stroke-width="3.5"/>' +
      '<text y="6" fill="' + kit[1] + '">' + num + '</text>';
    layer.appendChild(g);
    return { g, x: 0, y: 0, at(x, y) { this.x = x; this.y = y; g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); return this; } };
  }
  function make(el, opts) {
    el.innerHTML = '<div class="kick-stage bd-stage">' + pitch() + '<div class="kick-banner"></div></div><p class="kick-help" id="bd-help">' + (opts.help || '') + '</p>';
    const stage = el.querySelector('.bd-stage'), svg = stage.querySelector('svg');
    const kits = root.CRAQUE_CHARS ? root.CRAQUE_CHARS.kits(opts.c, opts.c && opts.c.moment && opts.c.moment.vs) : null;
    const col = k => (k ? [k.shirt, k.shorts] : null);
    const mine = col(kits && kits.mine) || ['#F4F1E8', '#12824A'], opp = col(kits && kits.opp) || ['#D9534A', '#FFFFFF'];
    const ball = svg.querySelector('#bd-ball'), pl = svg.querySelector('#bd-pl'), fx = svg.querySelector('#bd-fx');
    return {
      stage, svg, fx, mine, opp,
      me: (x, y) => player(pl, mine, root.CRAQUE_DATA && opts.c ? root.CRAQUE_DATA.POS_NUM[opts.c.pos] || 9 : 9, true).at(x, y),
      mate: (x, y, n) => player(pl, mine, n || '', false).at(x, y),
      foe: (x, y, n) => player(pl, opp, n || '', false).at(x, y),
      keeper: (x, y) => player(pl, ['#26282B', '#F2F2EC'], 1, false).at(x, y),
      ball: (x, y) => { ball.setAttribute('cx', x.toFixed(1)); ball.setAttribute('cy', y.toFixed(1)); },
      shape: (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); fx.appendChild(n); return n; },
      help: html => { const h = el.querySelector('#bd-help'); if (h) h.innerHTML = html; },
      banner: (txt, ok) => { const b = el.querySelector('.kick-banner'); b.textContent = txt; b.className = 'kick-banner show ' + (ok ? 'ok' : 'ko'); },
      net: () => { const n = svg.querySelector('#bd-net'); n.classList.remove('shake'); void n.getBBox(); n.classList.add('shake'); },
    };
  }
  root.CRAQUE_BOARD = { make, W, H, GX, GOAL_Y };

  // ---------- drible no mano a mano (atacante) ----------
  root.CRAQUE_DRIBBLE = function (el, opts) {
    const P = root.CRAQUE_KICK_PARTS, c = opts.c, setup = S().kickSetup(c, 'drible', opts.style);
    const B = make(el, { c, help: 'Quando o zagueiro <b>inclinar</b>, toque no <b>lado livre</b>' });
    const { stage } = B;
    // Você sai do meio-campo com a bola; o zagueiro vem ao encontro. Ele inclina (o lado é sorteado) num ponto da
    // corrida e fica assim por setup.win segundos: é a janela. O goleiro espera na pequena área
    const side = Math.random() < 0.5 ? -1 : 1;
    const DX = GX + (Math.random() * 30 - 15), me = B.me(GX, 290), df = B.foe(DX, 104, 4), gk = B.keeper(GX, 30);
    const RUN = 1.15 + Math.random() * 0.35;                   // até a inclinação
    const WIN = setup.win;                                     // tempo inclinado (a janela)
    let t = 0, last = performance.now(), phase = 'run', tap = null, result = null, armed = false, leanK = 0;
    const lean = B.shape('path', { class: 'bd-lean', d: '', opacity: 0 });
    const gap = B.shape('ellipse', { class: 'bd-gap', rx: 30, ry: 22, opacity: 0 });
    const meY = k => lerp(292, 212, ease(Math.min(1, k))), dfY = k => lerp(104, 136, ease(Math.min(1, k)));
    setTimeout(() => { armed = true; }, 250);
    function choose(s) {
      if (!armed || tap || result) return;
      tap = { s, t, ph: phase };
      if (phase === 'run') return end(false, 'cedo');            // antes de ele inclinar: ele lê o drible
      if (phase !== 'lean') return;
      if (s !== -side) return end(false, 'lado');               // foi para o lado em que ele está
      if (setup.recover && Math.random() < setup.recover) return end(false, 'recupera'); // pedalada: às vezes ele volta
      end(true, 'gol');
    }
    P.onTap(stage, e => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      choose(e.clientX - r.left < r.width / 2 ? -1 : 1);
    });
    const key = e => { if (!stage.isConnected) return document.removeEventListener('keydown', key); if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); choose(e.key === 'ArrowLeft' ? -1 : 1); } };
    document.addEventListener('keydown', key);
    // Fim do lance: passou (corta e bate no canto contrário ao do goleiro) ou perdeu (ele fica com a bola)
    let anim = null;
    function end(ok, why) {
      if (result) return;
      result = { ok, why };
      if (opts.onResult) opts.onResult(ok, why);
      const t0 = t, from = { x: me.x, y: me.y }, dfrom = { x: df.x, y: df.y };
      if (ok) {
        const s = -side, kSide = Math.random() < 0.5 ? -1 : 1;
        anim = k => {
          // corta para o lado livre, passa o zagueiro e bate cruzado; o goleiro pula para o outro lado
          const a = Math.min(1, k / 0.55), sh = Math.max(0, (k - 0.55) / 0.35);
          me.at(lerp(from.x, GX + s * 56, ease(a)), lerp(from.y, 96, ease(a)));
          df.at(dfrom.x + side * 10 * ease(a), dfrom.y + 6 * ease(a));
          if (k < 0.55) B.ball(me.x + s * 6, me.y - 12);
          else { const bx = lerp(me.x, GX - kSide * 24, ease(Math.min(1, sh))), by = lerp(me.y - 12, 8, ease(Math.min(1, sh))); B.ball(bx, by); }
          gk.at(GX + kSide * 26 * ease(Math.max(0, Math.min(1, (k - 0.6) / 0.3))), 30);
          if (sh >= 1 && !anim.done) { anim.done = true; B.net(); sfx('goal'); }
        };
        sfx('kick');
      } else {
        const toX = GX + (why === 'lado' ? -side : side) * 4;
        anim = k => {
          const a = ease(Math.min(1, k / 0.5));
          df.at(lerp(dfrom.x, toX, a), lerp(dfrom.y, from.y - 14, a));
          me.at(from.x + (tap ? tap.s : 0) * 12 * a, from.y + 6 * a);
          // a bola fica com ele e sai para o lado
          const b = Math.max(0, (k - 0.5) / 0.5);
          B.ball(lerp(df.x, df.x - side * 120, ease(b)), lerp(df.y + 10, df.y + 70, ease(b)));
        };
        sfx('miss');
      }
      anim.t0 = t0;
      B.banner(ok ? 'GOOOL!' : why === 'cedo' ? 'CEDO DEMAIS!' : why === 'lado' ? 'LADO ERRADO!' : why === 'recupera' ? 'ELE VOLTOU!' : 'TARDE DEMAIS!', ok);
      if (ok) sfx('cheer');
      setTimeout(() => opts.onDone(ok, why), 1700);
    }
    (function step(now) {
      if (!stage.isConnected) return document.removeEventListener('keydown', key);
      if (P.covered(stage)) { last = now; return requestAnimationFrame(step); } // janela por cima: o lance espera
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (!result) {
        const k = t / (RUN + WIN);
        me.at(GX, meY(k)); df.at(DX + side * 8 * leanK, dfY(k)); B.ball(GX, me.y - 21);
        if (phase === 'run' && t >= RUN) { phase = 'lean'; sfx('whistle'); }
        if (phase === 'lean') {
          leanK = Math.min(1, (t - RUN) / 0.12);
          const x = DX + side * 34 * leanK, y = df.y;
          lean.setAttribute('d', 'M' + (x - side * 8) + ' ' + (y - 11) + ' l' + side * 13 + ' 11 l' + -side * 13 + ' 11');
          lean.setAttribute('opacity', leanK);
          gap.setAttribute('cx', DX - side * 50); gap.setAttribute('cy', df.y + 10); gap.setAttribute('opacity', 0.9 * leanK);
          if (t >= RUN + WIN) { phase = 'shut'; end(false, 'tarde'); }
        }
      } else if (anim) {
        lean.setAttribute('opacity', 0); gap.setAttribute('opacity', 0);
        anim(Math.min(1, (t - anim.t0) / 1.1));
      }
      requestAnimationFrame(step);
    })(performance.now());
  };

  // ---------- passe com três opções (meia) ----------
  // Três companheiros correm para a área, cada um com um zagueiro colado. Num momento, o zagueiro de um deles se
  // distrai e abre a linha do passe (a linha dourada aparece): toque no companheiro livre enquanto ela está aberta.
  // Antes de abrir, qualquer passe é cortado; no marcado, cortado; tarde, ele passa da linha e fica impedido.
  root.CRAQUE_PASS3 = function (el, opts) {
    const P = root.CRAQUE_KICK_PARTS, c = opts.c, setup = S().kickSetup(c, 'passe3', opts.style);
    const B = make(el, { c, help: 'Toque no companheiro que ficar <b>livre</b> (a linha dourada)' });
    const { stage } = B;
    const LX = [72, 180, 288], free = Math.floor(Math.random() * 3);
    const me = B.me(GX, 292), gk = B.keeper(GX, 30);
    const run = LX.map((x, i) => B.mate(x + (Math.random() * 16 - 8), 200 + (i === 1 ? 14 : 0), [7, 9, 11][i]));
    const mk = LX.map((x, i) => B.foe(run[i].x, run[i].y - 30, [3, 4, 2][i]));
    const y0 = run.map(r => r.y), x0 = run.map(r => r.x), MOFF = [16, x0[1] > GX ? -16 : 16, -16];
    const OPEN = 1.0 + Math.random() * 0.5, WIN = setup.win, T = OPEN + WIN;
    let t = 0, last = performance.now(), phase = 'run', result = null, armed = false, openK = 0;
    const lane = B.shape('line', { class: 'bd-lane', x1: GX, y1: 280, x2: GX, y2: 280, opacity: 0 });
    const offs = B.shape('line', { class: 'bd-off', x1: 10, x2: 350, y1: 120, y2: 120, opacity: 0.5 }); // linha do impedimento
    B.ball(GX, 272);
    setTimeout(() => { armed = true; }, 250);
    function choose(i) {
      if (!armed || result) return;
      if (phase === 'run') return end(false, 'cedo', i);
      if (phase !== 'open') return;
      if (i !== free) return end(false, 'marcado', i);
      if (setup.keeperOut && Math.random() < setup.keeperOut) return end(false, 'goleiro', i);
      end(true, 'passe', i);
    }
    P.onTap(stage, e => {
      e.preventDefault();
      const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      choose(x < 126 ? 0 : x < 234 ? 1 : 2);
    });
    const key = e => { if (!stage.isConnected) return document.removeEventListener('keydown', key); const i = { ArrowLeft: 0, ArrowUp: 1, ArrowDown: 1, ArrowRight: 2 }[e.key]; if (i !== undefined) { e.preventDefault(); choose(i); } };
    document.addEventListener('keydown', key);
    let anim = null;
    function end(ok, why, i) {
      if (result) return;
      result = { ok, why };
      if (opts.onResult) opts.onResult(ok, ok ? 'passe' : why);
      const t0 = t, tgt = i === undefined ? run[free] : run[i], from = { x: tgt.x, y: tgt.y }, cut = i === undefined ? mk[free] : mk[i];
      const kSide = Math.random() < 0.5 ? -1 : 1;
      if (ok) {
        anim = k => {
          // a bola chega nele, ele domina e bate no canto; o goleiro pula para o outro lado
          const a = Math.min(1, k / 0.4), sh = Math.max(0, (k - 0.5) / 0.35);
          tgt.at(lerp(from.x, lerp(from.x, GX, 0.4), ease(Math.min(1, k / 0.5))), lerp(from.y, 92, ease(Math.min(1, k / 0.5))));
          if (k < 0.4) B.ball(lerp(GX, from.x, ease(a)), lerp(272, from.y, ease(a)));
          else if (k < 0.5) B.ball(tgt.x, tgt.y - 18);
          else B.ball(lerp(tgt.x, GX - kSide * 24, ease(Math.min(1, sh))), lerp(tgt.y - 18, 8, ease(Math.min(1, sh))));
          gk.at(GX + kSide * 26 * ease(Math.max(0, Math.min(1, (k - 0.55) / 0.3))), 30);
          if (sh >= 1 && !anim.done) { anim.done = true; B.net(); sfx('goal'); }
        };
        sfx('kick');
      } else if (why === 'goleiro') {
        anim = k => { const a = ease(Math.min(1, k / 0.45)); B.ball(lerp(GX, from.x, a), lerp(272, from.y - 30, a)); gk.at(lerp(GX, from.x, ease(Math.min(1, k / 0.4))), lerp(30, from.y - 34, ease(Math.min(1, k / 0.4)))); };
        sfx('miss');
      } else if (why === 'tarde') {
        anim = k => { const a = ease(Math.min(1, k / 0.4)); run.forEach((r, j) => r.at(x0[j], lerp(132, 104, a))); mk.forEach((m, j) => m.at(run[j].x + MOFF[j], 122)); B.ball(GX, 272 - 6 * a); };
        sfx('whistle');
      } else {
        // cortado: o zagueiro dele entra na frente e a bola fica com ele
        const mx = (GX + from.x) / 2, my = (272 + from.y) / 2;
        anim = k => { const a = ease(Math.min(1, k / 0.35)); cut.at(lerp(cut.x, mx, a), lerp(cut.y, my, a)); B.ball(lerp(GX, mx, ease(Math.min(1, k / 0.4))), lerp(272, my + 8, ease(Math.min(1, k / 0.4)))); };
        sfx('miss');
      }
      anim.t0 = t0;
      B.banner(ok ? 'ASSISTÊNCIA!' : why === 'cedo' ? 'CEDO DEMAIS!' : why === 'marcado' ? 'CORTADO!' : why === 'goleiro' ? 'O GOLEIRO SAIU!' : 'IMPEDIDO!', ok);
      if (ok) sfx('cheer');
      setTimeout(() => opts.onDone(ok, ok ? 'passe' : why), 1700);
    }
    (function step(now) {
      if (!stage.isConnected) return document.removeEventListener('keydown', key);
      if (P.covered(stage)) { last = now; return requestAnimationFrame(step); } // janela por cima: o lance espera
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (!result) {
        const k = Math.min(1, t / T);
        run.forEach((r, j) => r.at(x0[j], lerp(y0[j], 132, k)));
        // o marcador vai colado, um pouco à frente e de lado; o do livre se afasta
        mk.forEach((m, j) => {
          const o = j === free ? openK : 0, dir = j === 0 ? 1 : j === 2 ? -1 : (x0[1] > GX ? -1 : 1);
          m.at(run[j].x + MOFF[j] + dir * 30 * o, run[j].y - 30 - 8 * o);
        });
        if (phase === 'run' && t >= OPEN) phase = 'open';
        if (phase === 'open') {
          openK = Math.min(1, (t - OPEN) / 0.15);
          lane.setAttribute('x2', run[free].x); lane.setAttribute('y2', run[free].y); lane.setAttribute('opacity', openK);
          if (t >= T) { phase = 'shut'; end(false, 'tarde'); }
        }
      } else if (anim) {
        lane.setAttribute('opacity', 0); offs.setAttribute('opacity', 0);
        anim(Math.min(1, (t - anim.t0) / 1.1));
      }
      requestAnimationFrame(step);
    })(performance.now());
  };
})(typeof window !== 'undefined' ? window : globalThis);
