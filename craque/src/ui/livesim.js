// Jogo a Jogo, partida ao vivo: o campinho com jogadores que decidem (só apresentação, nada muda o resultado).
// A cada toque, quem tem a bola pesa tocar, lançar nas costas, inverter, cruzar, driblar, conduzir ou chutar pela chance de
// dar certo vezes o perigo que cria; quem ataca sem a bola procura espaço e corre na linha do zagueiro; quem defende
// pressiona, fecha o passe e marca do lado do gol. O motor manda em duas coisas: quem está melhor (bx de flowOf) e os gols
// (out.my.ev), que só saem no minuto deles. Você ataca para a direita; o adversário é espelhado.
(function () {
  const U = window.CRAQUE_UI, LP = U.LP || (U.LP = {});
  const L = 105, WD = 68, GL = 30.34, GR = 37.66;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const sig = v => 1 / (1 + Math.exp(-v));
  const F433 = [['GK', 0, 50], ['LB', .22, 12], ['CB', .16, 37], ['CB', .16, 63], ['RB', .22, 88], ['CM', .5, 30], ['DM', .38, 50], ['CM', .5, 70], ['LW', .8, 15], ['ST', .9, 50], ['RW', .8, 85]];
  const F442 = [['GK', 0, 50], ['LB', .22, 12], ['CB', .16, 37], ['CB', .16, 63], ['RB', .22, 88], ['LM', .55, 14], ['CM', .45, 40], ['CM', .45, 60], ['RM', .55, 86], ['ST', .86, 40], ['ST', .86, 60]];
  // Quanto vale ter a bola num ponto (no referencial de quem ataca): perto do gol e pelo meio vale muito mais
  const V = (x, y) => { const u = cl(x, 0, L) / L; return 0.01 + 0.1 * Math.pow(u, 1.5) + 0.32 * Math.pow(u, 4) * Math.exp(-Math.pow((y - 34) / 20, 2)); };
  const lossAt = (x, y) => 0.01 + V(L - x, WD - y) * 0.5;
  const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, u = cl(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1); return Math.hypot(px - ax - dx * u, py - ay - dy * u); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toW = (s, x, y) => (s ? [L - x, WD - y] : [x, y]);
  // Avançar vale por si (time que só roda a bola atrás não é futebol), quem chega perto chuta, e o bote dá certo 3 vezes em 10
  const PROG = 0.05, SHOT = 3.2, TK = 0.3, DUE_AHEAD = 6; // a jogada do gol do motor começa uns 6 minutos (8 s) antes, para dar tempo de construir
  const tf = (s, o) => (s ? [L - o.x, WD - o.y] : [o.x, o.y]);

  // o: { me: índice do seu jogador (-1 fora), num, seed, goals: [{ m, side: 0 seu time | 1, me, as }], t0, speed(): 1|3 }
  // Cores dos bonecos: o uniforme do clube (kits-real.js; senão as cores do escudo, kits.js). O mandante joga com o
  // principal; o visitante troca para o reserva se a camisa parece com a do mandante (e, sem reserva bom, pega uma cor
  // da paleta bem longe das duas). Goleiros com cor própria, longe dos dois times e do gramado.
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const cdist = (a, b) => { const x = hx(a), y = hx(b), r = (x[0] + y[0]) / 2, d = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
    return Math.sqrt((2 + r / 256) * d[0] * d[0] + 4 * d[1] * d[1] + (2 + (255 - r) / 256) * d[2] * d[2]); };
  const lum = h => { const [r, g2, b] = hx(h); return (0.299 * r + 0.587 * g2 + 0.114 * b) / 255; };
  const PITCH = '#2F7A47', NEAR = 190;
  const PAL = ['#C8323A', '#1F4FA8', '#F4F1E8', '#1D1D1F', '#E8742A', '#6B2D8F', '#7FC4EE', '#F7D117'];
  const GKS = ['#FF8A1F', '#9B5DE5', '#20C5C5', '#E84A8A', '#B7E34B', '#1D1D1F', '#F4F1E8'];
  LP.kitFor = function (name, id) {
    const R = window.CRAQUE_KITS_REAL || {}, K = window.CRAQUE_KITS || {}, ok = h => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
    const k = R[name] ? R[name] : id && K[id] ? [K[id][0], K[id][1], K[id][1], K[id][0]] : null; // só o escudo: o reserva é a cor 2
    return k && k.every(ok) ? k : null;
  };
  // mine/opp: [camisa, calção, camisa 2, calção 2] ou null; home: você é o mandante
  LP.kits = function (mine, opp, home) {
    const H = (home ? mine : opp) || ['#F4F1E8', '#1D1D1F'], A = (home ? opp : mine) || ['#1F4FA8', '#FFFFFF'];
    const hk = [H[0], H[1]];
    const far = c => cdist(c, hk[0]) > NEAR;
    let ak = far(A[0]) ? [A[0], A[1]] : A[2] && far(A[2]) ? [A[2], A[3] || A[0]] : null;
    if (!ak) { const c = PAL.slice().sort((a, b) => cdist(b, hk[0]) - cdist(a, hk[0]))[0]; ak = [c, lum(c) > 0.5 ? '#1D1D1F' : '#F4F1E8']; }
    const gk = GKS.filter(c => cdist(c, hk[0]) > NEAR && cdist(c, ak[0]) > NEAR && cdist(c, PITCH) > 120);
    const out = home ? [hk, ak] : [ak, hk];
    return { mine: out[0], opp: out[1], gk: [gk[0] || '#FF8A1F', gk[1] || gk[0] || '#9B5DE5'] };
  };

  LP.sim = function (o) {
    if (LP._sim) LP._sim.stop(); // uma partida por vez
    let seed = ((o.seed >>> 0) % 2147483646) + 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    let ME = o.me;
    const KT = o.kits || LP.kits(null, null, true);
    // q: o overall do jogador (4º número da formação, 60 se não vier) em -0,3..+0,3; pesa no drible, no bote, no passe e no pique
    const qOf = v => (v === undefined || v === null ? 0 : Math.max(-0.3, Math.min(0.3, (v - 60) / 100)));
    const mk = (form, side) => form.map(([r, d, w, ov], k) => ({ r, d, w: w * 0.68, k, side, q: qOf(ov), x: 0, y: 0, tx: 0, ty: 0, gx: 0, gy: 0, vx: 0, vy: 0,
      rt: 0, th: 0, spd: 0.9 + rnd() * 0.22 + qOf(form[k][3]) * 0.5, risk: 0.7 + rnd() * 0.6, ph: k * 1.9 + side * 4.1, fx: side ? -1 : 1, fy: 0,
      run: 0, runX: 0, runY: 0, go: 0, goX: 0, goY: 0, stun: 0, cd: 0, lg: 0, sprint: 0, drib: 0, mark: null }));
    // o.forms: [seu time, adversário] como [[papel, profundidade 0-1, largura 0-100], ...] (o Treinador manda a formação de verdade)
    const T = [mk((o.forms && o.forms[0]) || F433, 0), mk((o.forms && o.forms[1]) || F442, 1)];
    let ALL = T[0].concat(T[1]);
    const at = (s, i) => T[s][Math.min(i, T[s].length - 1)]; // com expulso o time tem menos gente
    const isMe = p => ME >= 0 && p.side === 0 && p.k === ME;
    // O estilo de cada time (S.CO_STY do Treinador; no Jogo a Jogo, equilibrado): ctrl segura a bola e evita passe arriscado,
    // press sobe a marcação e dá mais bote, line é a altura da defesa, counter acelera depois de roubar, wide abre o time e cruza
    const stOf = x => ({ ctrl: x && x.ctrl !== undefined ? x.ctrl : 1, press: x && x.press !== undefined ? x.press : 0.35, line: x && x.line !== undefined ? x.line : 0.5, counter: x && x.counter !== undefined ? x.counter : 0.35, wide: x && x.wide !== undefined ? x.wide : 0.5 });
    const ST = [stOf(o.styles && o.styles[0]), stOf(o.styles && o.styles[1])];
    const lossK = s => 1.4 + 1.6 * ST[s].ctrl, progK = s => 0.6 + 1.2 * ST[s].counter;
    // O que acontece no campinho vai para a narração (o: onEv(tipo, { side, a, b }); a e b: 'me' ou a posição)
    const tag = p => (p ? (isMe(p) ? 'me' : p.r) : '');
    const emit = (k, side, a, b, how) => { if (o.onEv && mode === 'play' && !lc) o.onEv(k, { side, a: tag(a), b: tag(b), how: how || '' }); };
    const ball = { x: 52.5, y: 34, owner: null, fly: null, loose: null, carry: null, hold: 0, rcv: 0 };
    let poss = 0, mode = o.t0 > 0 ? 'ko' : 'wait', modeT = 1.2, koSide = 0, hero = null, bias = [1, 1], mom = 0, momT = 0, runT = 2, defT = 0, clk = 0;
    let curT = o.t0 || 0, mClk = 0, bxT = 50, lastPasser = null, lastPassClk = -9, frozen = false, en = null, cv = null, g = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, alive = true;
    const goals = (o.goals || []).map(e => ({ m: e.m, side: e.side, me: !!e.me, as: !!e.as, done: e.m <= (o.t0 || 0) && (o.t0 || 0) > 0 }));
    const reform = (p, [r, d, w, ov]) => { p.r = r; p.d = d; p.w = w * 0.68; if (ov !== undefined) { p.spd += (qOf(ov) - p.q) * 0.5; p.q = qOf(ov); } };
    let due = null; // o gol do motor que está para sair
    // Seu lance (o texto que a narração vai escrever): a jogada acontece no campinho e só então a linha sai (cb)
    // k: chute, fora, drible, conduz, perde, passe, erra, impedido (com a bola) · desarme, corte, driblado, falta, defesa,
    // oppfora, pega, saimal, rebate (eles atacam perto de você) · none
    let lc = null, stopWhy = '';
    const DEF = { desarme: 1, corte: 1, driblado: 1, falta: 1, defesa: 1, oppfora: 1, pega: 1, saimal: 1, rebate: 1 };
    function lcDone() { const f = lc && lc.cb; lc = null; if (f) f(); }
    const acc = { x: 0, n: 0 }, pt = [0, 0]; // quem mandou no minuto (média) e tempo de posse de cada time

    function lineOf(s) { let m = 0; T[1 - s].forEach(q => { if (q.r !== 'GK') m = Math.max(m, tf(s, q)[0]); }); return Math.max(m, L / 2); }
    function shapeOf(p, has, bx, by, line) {
      if (p.r === 'GK') return has ? [cl(4 + bx * 0.12, 5, 16), 34 + (by - 34) * 0.2] : [cl(2 + bx * 0.05, 2, 7), 34 + (by - 34) * 0.3];
      // Bloco sobe e desce junto com a bola; a altura da linha (line) vale com e sem a bola: pressão alta = linha alta e time curto
      const st = ST[p.side], ln = Math.min(1, st.line), pr = Math.min(1, st.press);
      const back = has ? cl(bx - 26 + 10 * ln, Math.min(12 + 20 * ln, bx + 12), 40 + 22 * ln) : cl(bx - 26 + 14 * ln, 6, 30 + 26 * ln), span = has ? 50 : 33 - 7 * pr, dd = (p.d - 0.16) / 0.74;
      // Com a bola, o meio sobe para jogar entre as linhas deles (mais nos estilos de linha alta; na retranca quase nada)
      let x = back + dd * span + (has ? (5 + 17 * ln) * Math.sin(Math.PI * cl(dd, 0, 1)) : 0), y = 34 + (p.w - 34) * (has ? 0.8 + 0.55 * st.wide : 0.6) + (by - 34) * (has ? 0.15 : 0.42);
      // Lateral apoia por fora quando a bola vai do lado dele (mais cedo no time que joga pelos lados)
      const ov = 22 + 12 * st.wide;
      if (has && bx > 60 - 16 * st.wide && ((p.r === 'LB' && by < ov) || (p.r === 'RB' && by > WD - ov))) { x = Math.max(x, bx + 3); y = p.r === 'LB' ? 4 : 64; }
      if (has && p.d > 0.6) x = Math.min(x, Math.max(line - 1, bx - 2));
      return [cl(x, 2, 102), cl(y, 3, 65)];
    }
    function findSpace(p, s, line) {
      if (p.run > 0) return toW(s, p.runX, p.runY);
      if (p.go > 0) return toW(s, p.goX, p.goY);
      const [bx, by] = tf(s, ball), [sx, sy] = shapeOf(p, true, bx, by, line);
      let best = toW(s, sx, sy), bs = -1e9;
      // Procura o espaço: longe de onde os adversários VÃO estar (posição + velocidade), com a linha do passe limpa,
      // nem colado na bola nem longe demais dela, sem empilhar com o companheiro e sem largar muito a sua faixa
      for (let i = 0; i < 12; i++) {
        const a = i * 0.52 + rnd() * 0.5, r = i === 0 ? 0 : 3 + rnd() * 11;
        let cx = cl(sx + Math.cos(a) * r, 2, 103), cy = cl(sy + Math.sin(a) * r, 3, 65);
        if (p.d > 0.6) cx = Math.min(cx, Math.max(line - 0.8, bx - 2));
        if (p.d < 0.3) cx = Math.max(cx, sx - 3); // zaga não recua para fugir da marcação: segura a altura do bloco
        const [wx, wy] = toW(s, cx, cy);
        let open = 16, lane = 12, crowd = 0;
        for (const q of T[1 - s]) { open = Math.min(open, Math.hypot(q.x + q.vx * 0.45 - wx, q.y + q.vy * 0.45 - wy)); lane = Math.min(lane, segD(q.x, q.y, ball.x, ball.y, wx, wy)); }
        for (const q of T[s]) if (q !== p) { const d = Math.hypot(q.x - wx, q.y - wy); if (d < 9) crowd += 9 - d; }
        const db = Math.hypot(wx - ball.x, wy - ball.y), near = db < 7 ? (7 - db) * 0.8 : db > 34 ? (db - 34) * 0.12 : 0;
        const sc = open * 0.6 + lane * 0.8 + (cx - sx) * 0.15 - Math.hypot(cx - sx, cy - sy) * 0.22 - crowd * 0.6 - near + rnd() * 0.8;
        if (sc > bs) { bs = sc; best = [wx, wy]; }
      }
      return best;
    }
    function defend(s, dt) {
      const own = T[s], att = T[1 - s], gx = s ? L : 0, gy = 34;
      const tgt = ball.fly && !ball.fly.shot ? { x: ball.fly.x1, y: ball.fly.y1 } : ball;
      const outs = own.filter(p => p.r !== 'GK').sort((a, b) => dist(a, tgt) - dist(b, tgt));
      const pr = outs[0], cv2 = outs[1], [bx, by] = tf(s, ball), owner = ball.owner;
      defT -= dt;
      if (defT <= 0) {
        defT = 0.5; own.forEach(p => { p.mark = null; });
        const pairs = [];
        outs.slice(2).forEach(d => { const [zx, zy] = shapeOf(d, false, bx, by, 0), [wx, wy] = toW(s, zx, zy);
          att.forEach(a => { if (a === owner || a.r === 'GK') return; const k = Math.hypot(a.x - wx, a.y - wy); if (k < 13) pairs.push([k, d, a]); }); });
        pairs.sort((a, b) => a[0] - b[0]); const used = new Set();
        pairs.forEach(([, d, a]) => { if (!d.mark && !used.has(a)) { d.mark = a; used.add(a); } });
      }
      own.forEach(p => {
        if (p.r === 'GK') { const d = Math.hypot(ball.x - gx, ball.y - gy) || 1, k = Math.min(6, 1.2 + d * 0.07); p.tx = gx + (ball.x - gx) / d * k; p.ty = gy + (ball.y - gy) / d * k * 0.9; return; }
        const [zx, zy] = shapeOf(p, false, bx, by, 0); let [wx, wy] = toW(s, zx, zy);
        const hunt = due && due.side === s; // o gol do motor é deles: vão buscar a bola de qualquer jeito
        if (p === pr && (hunt || dist(pr, tgt) < 12 + 26 * ST[s].press) && !(owner && owner.r === 'GK')) {
          // Quem pressiona fica a uns 2,6 m, do lado do gol (fecha o caminho sem grudar); de vez em quando dá o bote (lg)
          if (owner) {
            if (p.lg <= 0 && (p.cd <= 0 || hunt) && dist(p, owner) < 4.5 && (hunt || rnd() < dt * (0.3 + 0.9 * ST[s].press))) { p.lg = 0.7; p.cd = 0; }
            const d = Math.hypot(gx - owner.x, gy - owner.y) || 1, k = p.lg > 0 ? 0.8 : 2.2 + (1 - Math.min(1, ST[s].press)) * 1.4;
            wx = owner.x + (gx - owner.x) / d * k; wy = owner.y + (gy - owner.y) / d * k;
          } else { wx = tgt.x; wy = tgt.y; }
          p.tx = wx; p.ty = wy; p.sprint = p.lg > 0 || dist(p, tgt) > 5 ? 1 : 0; return;
        }
        if (p === cv2 && owner && owner.r !== 'GK') {
          const n = att.filter(a => a !== owner && a.r !== 'GK').sort((a, b) => dist(a, owner) - dist(b, owner))[0];
          if (n) { p.tx = owner.x + (n.x - owner.x) * 0.55; p.ty = owner.y + (n.y - owner.y) * 0.55; return; }
        }
        if (p.mark) { const a = p.mark, d = Math.hypot(gx - a.x, gy - a.y) || 1; wx = wx * 0.35 + (a.x + (gx - a.x) / d * 3.4) * 0.65; wy = wy * 0.35 + (a.y + (gy - a.y) / d * 3.4) * 0.65;
          // Zagueiro não afunda atrás do atacante além do que a linha permite: linha alta segura e deixa em impedimento
          if (p.d < 0.3) { const lo = zx - 4 - (1 - Math.min(1, ST[s].line)) * 10, fx = tf(s, { x: wx, y: wy })[0]; if (fx < lo) wx = toW(s, lo, 0)[0]; } }
        p.tx = wx; p.ty = wy;
      });
    }
    function passOdds(s, tx, ty, lofted, q, turn) {
      const [wx, wy] = toW(s, tx, ty), d = Math.hypot(wx - ball.x, wy - ball.y), spd = lofted ? 21 : 18;
      let pI = 0, cut = null;
      for (const op of T[1 - s]) {
        for (let f = lofted ? 0.8 : 0.12; f <= 1.001; f += 0.11) {
          const px = ball.x + (wx - ball.x) * f, py = ball.y + (wy - ball.y) * f;
          const tb = d * f / spd + 0.08, to = Math.max(0, Math.hypot(op.x - px, op.y - py) - 1.1) / 7.5 + (op.r === 'GK' ? 0.15 : 0.44 + (turn ? 0.45 : 0) - (op.q || 0) * 0.6) + (op.stun > 0 ? 0.6 : 0);
          const r = sig((tb - to) * 4) * (f > 0.95 ? 0.7 : 1);
          if (r > pI) { pI = r; cut = { o: op, x: px, y: py }; }
        }
      }
      const tr = Math.max(0, Math.hypot(q.x - wx, q.y - wy) - 0.8) / 7.8, late = sig((tr - d / spd) * 2.5) * 0.35;
      return { p: cl((1 - pI) * (1 - late) + (bias[s] - 1) * 0.6, 0.03, 0.97), cut, wx, wy };
    }
    function shotXg(s, bx, by, head) {
      const ang = Math.abs(Math.atan2(GR - by, L - bx) - Math.atan2(GL - by, L - bx)), [gwx, gwy] = toW(s, L, 34);
      let block = 0, press = 99;
      for (const op of T[1 - s]) { if (op.r !== 'GK' && segD(op.x, op.y, ball.x, ball.y, gwx, gwy) < 1.4) block++; press = Math.min(press, dist(op, ball)); }
      return cl(ang * 0.42 - block * 0.03 - (press < 1.8 ? 0.03 : 0), 0.01, 0.5) * (head ? 0.6 : 1);
    }
    // Quem faz o gol que o motor mandou: você, ou um atacante do time
    const scorerOf = d => (d.me && ME >= 0 && d.side === 0 ? T[0][ME] : at(d.side, d.side ? 9 + (d.m % 2) : [9, 8, 10][d.m % 3]));
    function decide(p) {
      const s = p.side, own = T[s], opp = T[1 - s], [bx, by] = tf(s, ball), line = lineOf(s);
      if (lc && lc.have && isMe(p)) return myAct(p, bx, by, line);
      // O gol do motor: a jogada procura quem vai marcar (passando antes por você, se a assistência é sua) e ele bate
      if (due && due.side === s) {
        const sc = scorerOf(due), mid = due.as && ME >= 0 && s === 0 && !due.asDone ? T[0][ME] : null;
        if (mid && p !== mid && p !== sc) return fly(p, mid.x + (mid.side ? -1 : 1), mid.y, mid, false, 'curto', false);
        if (mid && p === mid) due.asDone = true;
        // Gol só de perto da área: quem vai marcar e ainda está longe conduz para dentro antes de bater
        const near = due.out && due.out !== 'gol'; // chance que não entra (Treinador): pode bater de mais longe
        // now: a tela já esperou demais; bate de mais longe, mas nunca do meio-campo (só da entrada da área para a frente)
        const inBox = (due.now && bx > 70 && Math.abs(by - 34) < 24) || (bx > (near ? 70 : 79) && Math.abs(by - 34) < (near ? 22 : 17));
        if (p === sc && !inBox) { const [wx, wy] = toW(s, Math.min(bx + 12, 90), 34 + (by - 34) * 0.4); ball.carry = { x: wx, y: wy, t: 0.8 }; return; }
        // Demorou (now): lançamento direto na área para quem vai marcar, que já está correndo para lá
        if (due.now && p !== sc && !inBox) { const [wx, wy] = toW(s, due.rx, due.ry); sc.run = Math.max(sc.run, 1.5); sc.runX = due.rx; sc.runY = due.ry; return fly(p, wx, wy, sc, true, 'costas', false); }
        // Chegou cedo? Prepara (ajeita para o lado) até o minuto do gol, para a rede balançar junto com o placar
        if (inBox && (p === sc || (!due.me && !mid)) && curT < due.m - 1) { const [wx, wy] = toW(s, Math.min(bx + 1.5, 92), cl(by + (by < 34 ? 3 : -3), 22, 46)); ball.carry = { x: wx, y: wy, t: 0.35 }; return; }
        if (inBox && (p === sc || (!due.me && !mid))) { const kd = Math.hypot(L - bx, 34 - by) > 22 ? 'fora' : bx > 84 && Math.abs(by - 34) < 15 && rnd() < 0.3 ? 'cabeca' : 'chute';
          if (due.out && due.out !== 'gol') { shoot(p, kd, 0, due.out); ball.fly.due = due; return; } // chance do motor que não entra
          return shoot(p, kd, 1); }
        // O passe vai na frente de quem vai marcar, no caminho da área
        const [qx, qy] = tf(s, sc), tx = cl(Math.max(qx + 6, Math.min(due.rx, qx + 12)), 2, 100), ty = cl(qy + (due.ry - qy) * 0.5, 4, 64), [wx, wy] = toW(s, tx, ty);
        return fly(p, wx, wy, sc, Math.hypot(wx - p.x, wy - p.y) > 28, tx > bx + 15 ? 'costas' : 'curto', false);
      }
      let press = 99, presser = null; for (const op of opp) { const d = dist(op, p); if (d < press) { press = d; presser = op; } }
      const opts = [];
      for (const q of own) {
        if (q === p || (q.r === 'GK' && (bx > 40 || press > 6))) continue;
        const [qx, qy] = tf(s, q), qv = s ? [-q.vx, -q.vy] : [q.vx, q.vy], d0 = Math.hypot(qx - bx, qy - by);
        if (d0 < 5 || d0 > (p.r === 'GK' ? 65 : 52)) continue;
        let kind = 'curto', lofted = false, tx = qx + qv[0] * 0.45, ty = qy + qv[1] * 0.45;
        // Cruzamento: a bola no lado, perto da área, e alguém chegando na área (correndo ou já lá)
        const inB = (x, y) => x > 76 && Math.abs(y - 34) < 16, cx = q.run > 0 ? q.runX : qx, cy = q.run > 0 ? q.runY : qy;
        if (bx > 58 && Math.abs(by - 34) > 11 && q.r !== 'GK' && inB(cx, cy)) { kind = 'cruz'; lofted = true; tx = cl(cx + 3, 86, 99); ty = cl(cy + (34 - cy) * 0.3, 26, 42); }
        else if (q.run > 0.7) { kind = 'costas'; tx = q.runX; ty = q.runY; lofted = d0 > 24; }
        else if (q.d > 0.6 && qx > Math.max(line, bx) + 0.5) continue; // impedido
        else if (Math.abs(ty - by) > 26 && d0 > 28) { kind = 'inv'; lofted = true; }
        else if (d0 > 32) { kind = 'longo'; lofted = true; }
        tx = cl(tx, 2, 103); ty = cl(ty, 2, 66);
        const od = passOdds(s, tx, ty, lofted, q, kind === 'costas');
        let val = V(tx, ty) + (kind === 'costas' ? 0.06 : 0) + (kind === 'cruz' ? 0.05 + 0.3 * ST[s].wide : 0) + (q === lastPasser && q.go > 0 && clk - lastPassClk < 2.5 ? 0.02 : 0) + (isMe(q) && tx > 70 ? 0.03 : 0);
        if (tx < bx - 2) val *= 0.9;
        if (q.r === 'GK') val *= 0.6; // recuar para o goleiro é a última saída, não o caminho de sempre
        val += PROG * progK(s) * (tx - bx) / 30 * (bx < 52 ? 1.6 : 1); // no campo de defesa, subir vale mais: o time sai jogando
        opts.push({ type: 'pass', kind, q, wx: od.wx, wy: od.wy, lofted, od, p: od.p, u: od.p * val - (1 - od.p) * lossAt((bx + tx) / 2, (by + ty) / 2) * lossK(s) });
      }
      if (p.r !== 'GK') for (const a of [0, 0.6, -0.6]) {
        const tx = cl(bx + Math.cos(a) * 9, 2, 101), ty = cl(by + Math.sin(a) * 9, 3, 65), [wx, wy] = toW(s, tx, ty);
        let near = 99; for (const op of opp) near = Math.min(near, segD(op.x, op.y, p.x, p.y, wx, wy));
        const drib = press < 2.2, dq = (p.q - (presser ? presser.q : 0)) * 1.3, pk = drib ? cl(0.42 + (near - 1.5) * 0.08 + (bias[s] - 1) * 0.6 + dq, 0.1, 0.78) : cl(sig((near - 2.2) * 1.8) + (bias[s] - 1) * 0.4, 0.05, 0.97);
        opts.push({ type: 'carry', kind: drib ? 'drible' : 'conduz', wx, wy, p: pk, presser, u: pk * (V(tx, ty) + PROG * progK(s) * Math.cos(a) * 9 / 30) - (1 - pk) * lossAt(bx, by) * lossK(s) + (!drib && near > 5 ? 0.008 : 0) });
      }
      if (p.r !== 'GK' && bx > 70) { const xg = shotXg(s, bx, by, false); opts.push({ type: 'shot', kind: Math.hypot(L - bx, 34 - by) > 20 ? 'fora' : 'chute', u: xg * SHOT * (Math.abs(by - 34) > 11 ? 1 - 0.7 * ST[s].wide : 1) }); } // do lado, quem joga pelos lados prefere cruzar
      if (!opts.length) { ball.hold = 0.3; return; }
      let best = opts[0], bu = -1e9;
      for (const op of opts) { const u = op.u * (1 + 0.28 * gauss() * p.risk) + 0.004 * gauss(); if (u > bu) { bu = u; best = op; } }
      if (best.type === 'shot') return shoot(p, best.kind, 0);
      if (best.type === 'carry') {
        if (best.kind === 'drible') { if (rnd() < best.p) { best.presser.stun = 1.3; ball.carry = { x: best.wx, y: best.wy, t: 1.1 }; emit('drible', s, p); } else { why = 'drible'; setOwner(best.presser); emit('desarme', 1 - s, best.presser, p); } }
        else ball.carry = { x: best.wx, y: best.wy, t: 1 + rnd() * 0.9 };
        return;
      }
      lastPasser = p; lastPassClk = clk;
      if (rnd() < best.p + (1 - best.p) * p.q * 1.2) { // quem passa melhor erra menos (só na hora, não muda a escolha)
        fly(p, best.wx, best.wy, best.q, best.lofted, best.kind, false);
        if (best.kind !== 'curto') emit(best.kind, s, p, best.q);
        // Tocou curto e tem espaço? Corre para pedir de volta (é assim que nasce a tabela)
        if (best.kind === 'curto' && p.r !== 'GK' && bx > 30 && bx < 88 && rnd() < 0.3) { p.go = 1.4; p.goX = Math.min(bx + 12, p.d > 0.6 ? line - 0.8 : 100); p.goY = cl(by + (34 - by) * 0.2 + gauss() * 5, 4, 64); ball.fly.quick = true; }
      } else {
        const c = best.od.cut, thief = c ? c.o : opp.slice().sort((a, b) => Math.hypot(a.x - best.wx, a.y - best.wy) - Math.hypot(b.x - best.wx, b.y - best.wy))[0];
        fly(p, c ? c.x : best.wx, c ? c.y : best.wy, thief, best.lofted, best.kind, true);
      }
    }
    function fly(from, wx, wy, to, lofted, kind, cut) {
      const d = Math.hypot(wx - ball.x, wy - ball.y), spd = (lofted ? 21 : 18) * (due && from.side === due.side && !cut ? 1.35 : 1);
      ball.fly = { x0: ball.x, y0: ball.y, x1: cl(wx, 0.5, L - 0.5), y1: cl(wy, 0.5, WD - 0.5), t: 0, dur: Math.max(0.25, d / spd), to, kind, cut, from, loft: lofted ? d * 0.35 : 0, shot: false };
      ball.owner = null; ball.carry = null; ball.loose = null;
    }
    // Chute: só é gol o que o motor mandou; o resto vai no goleiro ou para fora
    function shoot(p, kind, forced, want) {
      const s = p.side, gx = s ? 0 : L, gk = T[1 - s][0];
      const out = forced ? 'gol' : want || (rnd() < 0.5 ? 'def' : 'fora');
      let ty, tx = gx + (s ? -1.5 : 1.5);
      if (out === 'gol') ty = gk.y < 34 ? 34 + 1.2 + rnd() * 2.2 : 34 - 1.2 - rnd() * 2.2;
      else if (out === 'def') { ty = cl(gk.y + gauss() * 1.6, GL + 0.4, GR - 0.4); tx = gk.x + (s ? 0.6 : -0.6); }
      else ty = rnd() < 0.5 ? GL - 1 - rnd() * 4 : GR + 1 + rnd() * 4;
      const d = Math.hypot(tx - ball.x, ty - ball.y);
      api._lastShot = { x: tf(s, ball)[0], out };
      ball.fly = { x0: ball.x, y0: ball.y, x1: tx, y1: ty, t: 0, dur: forced ? Math.max(0.3, d / 30) : Math.max(0.3, d / (kind === 'cabeca' ? 15 : 25)), shot: true, out, side: s, from: p, kind, lc: !!want, loft: kind === 'cabeca' ? 2 : kind === 'fora' ? 5 : 2.5, curve: gauss() * 2 };
      ball.owner = null; ball.carry = null; ball.loose = null;
    }
    const WHY = {}; let why = '?', lastWhy = ''; // diagnóstico (_state().WHY): por que a posse trocou de lado
    function setOwner(p, quick) {
      if (ball.owner ? ball.owner.side !== p.side : poss !== p.side) WHY[why] = (WHY[why] || 0) + 1; lastWhy = why; why = '?';
      ball.owner = p; ball.fly = null; ball.loose = null; ball.carry = null; ball.rcv = 0.3; p.run = 0; p.go = 0;
      let press = 99; for (const q of T[1 - p.side]) press = Math.min(press, dist(q, p));
      const won = p.side !== poss, fast = won && rnd() < ST[p.side].counter * 0.6; // roubou e o time é de contra-ataque: sai rápido
      ball.hold = p.r === 'GK' ? 0.8 + rnd() * 0.6 : quick || fast ? 0.25 + rnd() * 0.2 : press < 3 ? 0.35 + rnd() * 0.25 : (0.5 + rnd() * 0.9) * (0.5 + 0.5 * ST[p.side].ctrl);
      if (due && due.side === p.side) ball.hold = Math.min(ball.hold, 0.35);
      if (lc && !lc.have && !DEF[lc.k] && isMe(p)) { lc.have = true; ball.hold = 0.35; }
      if (lc && !lc.have && DEF[lc.k] && p === lc.q) { lc.have = true; ball.hold = 1; }
      if (p.side !== poss) { poss = p.side; ALL.forEach(q => { q.th = rnd() * 0.35; q.run = 0; q.go = 0; }); }
    }
    function receive(f) {
      const p = f.to; why = f.cut ? 'corte' : 'passe'; setOwner(p, f.quick);
      if (lc && DEF[lc.k] && !lc.have && isMe(p) && lc.q) lcDone(); // cortou / segurou o cruzamento
      if (f.cut && f.from && f.from.side !== p.side) emit('corte', p.side, p, f.from);
      if (!f.cut && f.kind === 'cruz') { const [bx, by] = tf(p.side, ball); if (bx > 84 && Math.abs(by - 34) < 15) shoot(p, 'cabeca', 0); }
    }
    function shotEnd(f) {
      const s = f.side, gk = T[1 - s][0];
      if (f.out !== 'gol') emit(f.out === 'def' ? 'defesa' : 'fora', s, f.from, gk, f.kind);
      if (f.due) { f.due.done = true; if (due === f.due) due = null; if (f.due.cb) f.due.cb(); }
      if (f.out === 'gol') { mode = 'goal'; modeT = 2; koSide = 1 - s; hero = f.from; back = 0; if (due) { const e = due; due.done = true; due = null; if (o.onGoal) o.onGoal(e.m); if (e.cb) e.cb(); } }
      else if (f.out === 'def' && f.lc && lc && lc.k === 'rebate') { const q = T[s].filter(x => x.r !== 'GK').sort((a, b) => dist(a, gk) - dist(b, gk))[0]; setOwner(q); }
      else if (f.out === 'def') { why = 'defesa'; setOwner(gk); }
      else { mode = 'tiro'; modeT = 1.6; poss = 1 - s; }
      if (f.lc && lc) lcDone();
    }
    // Seu lance com a bola: faz o que a narração vai contar
    function myAct(p, bx, by, line) {
      const s = p.side, k = lc.k, opp = T[1 - s];
      const near = opp.filter(q => q.r !== 'GK').sort((a, b) => dist(a, p) - dist(b, p))[0];
      lc.have = false;
      if (k === 'chute' || k === 'fora') { shoot(p, Math.hypot(L - bx, 34 - by) > 20 ? 'fora' : 'chute', 0, k === 'chute' ? 'def' : 'fora'); return; } // a linha sai quando a bola chega
      if (k === 'drible' || k === 'conduz') {
        const [wx, wy] = toW(s, Math.min(bx + (k === 'drible' ? 9 : 14), 95), by + (34 - by) * 0.15);
        if (k === 'drible' && near) { near.x = p.x + (s ? -1.2 : 1.2); near.y = p.y + 0.6; near.stun = 1.4; }
        ball.carry = { x: wx, y: wy, t: k === 'drible' ? 1.1 : 1.5 };
      } else if (k === 'perde') { if (near) setOwner(near); }
      else if (k === 'passe') {
        const q = T[s].filter(x => x !== p && x.r !== 'GK').sort((a, b) => tf(s, b)[0] - tf(s, a)[0])[0];
        if (q) { const [qx, qy] = tf(s, q), [wx, wy] = toW(s, Math.min(Math.max(qx, line) + 7, 97), qy); q.run = 1.4; q.runX = Math.min(Math.max(qx, line) + 7, 97); q.runY = qy; fly(p, wx, wy, q, Math.hypot(wx - p.x, wy - p.y) > 26, 'costas', false); }
      } else if (k === 'erra') {
        const q = T[s].filter(x => x !== p && x.r !== 'GK').sort((a, b) => dist(a, p) - dist(b, p))[1] || T[s][6], th = near || opp[6];
        fly(p, (p.x + q.x) / 2, (p.y + q.y) / 2, th, false, 'curto', true); th.tx = (p.x + q.x) / 2; th.ty = (p.y + q.y) / 2;
      } else if (k === 'impedido') whistle('Impedimento', opp.filter(q => q.r !== 'GK').sort((a, b) => tf(1 - s, a)[0] - tf(1 - s, b)[0])[0]);
      lcDone();
    }
    // Apito (falta, impedimento): todos param um instante e a bola fica com quem vai cobrar
    // A cobrança sai de onde foi a infração (spot; sem spot, onde a bola está): a bola rola até lá e o cobrador vai até ela
    function whistle(why, taker, spot) { mode = 'falta'; modeT = 1.5; stopWhy = why; foulSpot = spot ? { x: spot.x, y: spot.y } : { x: ball.x, y: ball.y }; ball.owner = ball.fly = ball.loose = ball.carry = null; foulTo = taker; }
    // O juiz (o motor já decidiu): falta, cartão ou impedimento de quem joga na posição pos do lado side. O campinho para,
    // o cartão sobe em cima de quem fez, e só então a narração escreve (cb). O expulso sai da lógica na hora (o time joga com
    // um a menos) e fica parado no lugar até o apito acabar; depois sai andando pela lateral mais perto
    let refFx = null, offLine = null;
    const leaving = [];
    const ROLE_OF = { GOL: /GK/, ZAG: /CB/, LAT: /LB|RB/, VOL: /DM|CM/, MEI: /CM|DM|LM|RM/, PON: /LW|RW|LM|RM/, ATA: /ST|LW|RW/ };
    function whoDid(side, pos, me) {
      if (me && side === 0 && ME >= 0) return T[0][ME];
      const re = ROLE_OF[pos], L0 = T[side].filter(p => !isMe(p) && (pos === 'GOL' ? p.r === 'GK' : p.r !== 'GK')), Lr = re ? L0.filter(p => re.test(p.r)) : [];
      return (Lr.length ? Lr : L0).sort((a, b) => dist(a, ball) - dist(b, ball))[0] || null;
    }
    function goOff(p, wait) {
      const s = p.side, i = T[s].indexOf(p); if (i < 0) return;
      const wasMe = isMe(p);
      T[s].splice(i, 1);
      if (s === 0 && ME >= 0) { if (i === ME) { ME = -1; en = null; if (lc) lcDone(); } else if (i < ME) ME--; }
      ALL = T[0].concat(T[1]);
      ALL.forEach(q => { if (q.mark === p) q.mark = null; });
      if (ball.owner === p) { ball.owner = null; setOwner(at(s, 6)); }
      if (ball.fly && ball.fly.to === p) ball.fly.to = at(s, 6);
      if (ball.loose && ball.loose.to === p) ball.loose.to = at(s, 6);
      if (foulTo === p) foulTo = at(s, 6);
      leaving.push({ p, wasMe, wait: wait || 0, t: 0, ty: p.y < WD / 2 ? -1 : WD + 1 });
    }
    function refDo(o) {
      const kind = o.kind, p = whoDid(o.side, o.pos, o.me);
      if (!p) return false;
      if (kind === 'impedimento') {
        // Nada de teleporte: o mais adiantado do ataque passa da linha correndo, recebe o passe lá e o apito sai onde ele
        // recebeu (offStep); a cobrança é dali. Sem a bola, o ataque espera tê-la um pouco antes do passe
        const s = o.side, own = ball.owner && ball.owner.side === s ? ball.owner : null;
        const q = T[s].filter(x => x.r !== 'GK' && !isMe(x) && x !== own).sort((a, b) => tf(s, b)[0] - tf(s, a)[0])[0];
        if (!q) return false;
        offPend = { s, q, t: 0, f: null };
        return 'pend';
      }
      // Falta e cartão só na disputa: espera o time que sofre ter a bola, quem faz vai no bote em quem está com ela e o
      // apito sai no contato (foulStep). Nada de cartão em quem está longe da bola
      foulPend = { o, t: 0, c: 0, p: null };
      return 'pend';
    }
    function foulNow(o, p, v) {
      const kind = o.kind;
      v.stun = 1.6; v.down = 1.6;
      whistle('Falta', v, v);
      const card = kind === 'amarelo' || kind === 'vermelho';
      modeT = card ? 2.3 : 1.3;
      if (card) refFx = { p, kind, how: o.how, t: 2.3 };
      if (kind === 'vermelho') goOff(p, 2.3);
    }
    // Quem faz: você (se o motor disse que foi você); senão quem joga na posição e está perto de quem tem a bola; senão o
    // mais perto dele
    function fouler(o, v) {
      if (o.me && o.side === 0 && ME >= 0) return T[0][ME];
      const re = ROLE_OF[o.pos], L0 = T[o.side].filter(p => !isMe(p) && p.r !== 'GK').sort((a, b) => dist(a, v) - dist(b, v));
      return (re && L0.find(p => re.test(p.r) && dist(p, v) < 14)) || L0[0] || null;
    }
    function foulEnd(ok) {
      const P = foulPend; foulPend = null; if (!P) return;
      if (!ok && P.o.kind === 'vermelho') { const p = whoDid(P.o.side, P.o.pos, P.o.me); if (p) goOff(p, 0); }
      if (P.cb) setTimeout(P.cb, ok ? (P.o.kind === 'falta' ? 500 : 900) / Math.max(1, o.speed ? o.speed() : 1) : 0);
    }
    function foulStep(dt) {
      const P = foulPend, so = P.o.side;
      if (mode !== 'play' || lc || due) return foulEnd(false);
      P.t += dt;
      let v = ball.owner && ball.owner.side !== so && ball.owner.r !== 'GK' ? ball.owner : null;
      // o time que sofre demora a ter a bola: a disputa é com quem dele está mais perto da bola (e perto dela de verdade)
      // com a bola no time de quem faz (passou do tempo): a falta é de quem tem a bola (ou de quem da posição está do lado
      // dele) em quem chega para tirar; os dois se encontram
      if (!v && P.t > 1.5 && ball.owner && ball.owner.side === so && ball.owner.r !== 'GK') {
        const own = ball.owner, re = ROLE_OF[P.o.pos];
        const n = T[1 - so].filter(x => x.r !== 'GK').sort((a, b) => dist(a, own) - dist(b, own))[0];
        if (n && dist(n, own) < 12) {
          const mate = re && T[so].find(x => x !== own && !isMe(x) && re.test(x.r) && dist(x, own) < 4);
          const p = P.o.me && so === 0 && ME >= 0 ? T[0][ME] : re && !re.test(own.r) && mate ? mate : own;
          if (P.p !== p) { P.p = p; P.c = 0; }
          v = n; v.tx = own.x; v.ty = own.y; v.sprint = 1;
        }
      }
      if (!v) { if (P.p) P.p.cd = 0; P.p = null; P.c = 0; if (P.t > 4.5) foulEnd(false); return; }
      if (!P.p || T[so].indexOf(P.p) < 0 || dist(P.p, v) > 16) { if (P.p) P.p.cd = 0; P.p = fouler(P.o, v); P.c = 0; if (!P.p) return foulEnd(false); }
      const p = P.p; P.c += dt;
      p.tx = v.x; p.ty = v.y; p.sprint = 1; p.cd = 1; // vai no bote (sem desarme limpo: o lance é falta)
      ball.hold = Math.max(ball.hold || 0, 0.25); // quem tem a bola segura um instante, o bote chega
      if (dist(p, v) < 1.6 || (P.c > 2.2 && dist(p, v) < 5)) { foulPend = null; p.cd = 0; foulNow(P.o, p, v); P.cb && setTimeout(P.cb, (P.o.kind === 'falta' ? 500 : 900) / Math.max(1, o.speed ? o.speed() : 1)); return; }
      if (P.t > 5.5) foulEnd(false);
    }
    let foulTo = null, foulSpot = null, offPend = null, foulPend = null;
    // Impedimento a caminho: 1) quem vai ficar impedido corre para além da linha; 2) com a bola no ataque, sai o passe para
    // ele; 3) a bola chega e o apito sai ali. Se o jogo parar antes (gol, seu lance, outra parada), fica só na narração
    function offEnd(ok) { const P = offPend; offPend = null; if (P && P.cb) setTimeout(P.cb, ok ? 500 / Math.max(1, o.speed ? o.speed() : 1) : 0); }
    function offStep(dt) {
      const P = offPend, s = P.s, q = P.q;
      if (mode !== 'play' || lc || due || T[s].indexOf(q) < 0) return offEnd(false);
      P.t += dt;
      const line = lineOf(s), [qx, qy] = tf(s, q), rx = Math.min(L - 4, Math.max(qx, line + 2));
      if (!P.f) {
        q.run = Math.max(q.run || 0, 0.5); q.runX = rx; q.runY = qy;
        const own = ball.owner && ball.owner.side === s && ball.owner !== q ? ball.owner : null;
        if (own && (qx > line + 0.4 || P.t > 1.2)) {
          const [wx, wy] = toW(s, Math.max(rx, qx + 1.5), qy);
          fly(own, wx, wy, q, Math.hypot(wx - own.x, wy - own.y) > 26, 'costas', false); ball.fly.dur = Math.min(ball.fly.dur, 1.2); P.f = ball.fly; P.line = line;
        } else if (P.t > 3.5) offEnd(false);
        return;
      }
      if (ball.fly === P.f) return;
      if (ball.owner === q || (ball.loose && ball.loose.f === P.f)) {
        const d = T[1 - s].filter(x => x.r !== 'GK').sort((a, b) => dist(a, q) - dist(b, q))[0] || at(1 - s, 0);
        whistle('Impedimento', d, ball); modeT = 1.8;
        offLine = { s, x: P.line, t: 1.8 }; refFx = { p: q, kind: 'impedimento', t: 1.8 };
        return offEnd(true);
      }
      offEnd(false); // a bola não chegou nele (cortaram no caminho)
    }
    // Seu lance sem a bola: eles atacam perto de você (ou na sua área, se você é o goleiro)
    function defAct(dt) {
      const me = T[0][ME], q = lc.q, k = lc.k; lc.t2 = (lc.t2 || 0) + dt;
      const [qx] = tf(1, q), gkAct = k === 'defesa' || k === 'oppfora' || k === 'pega' || k === 'saimal' || k === 'rebate';
      ball.hold = 1; // quem tem a bola espera a jogada
      if (gkAct) {
        if (qx < 78 && lc.t2 < 3) { if (!ball.carry) { const [wx, wy] = toW(1, Math.min(qx + 12, 86), 34 + (tf(1, q)[1] - 34) * (k === 'pega' || k === 'saimal' ? 1 : 0.4)); ball.carry = { x: wx, y: wy, t: 0.8 }; } return; }
        lc.have = false; ball.carry = null;
        if (k === 'pega') { fly(q, me.x + 1.5, me.y, me, true, 'cruz', true); return; } // a linha sai quando você segura
        if (k === 'saimal') { const st = T[1][9] === q ? T[1][10] : T[1][9]; me.tx = me.x + 5; fly(q, st.x, st.y, st, true, 'cruz', false); me.stun = 1.2; return lcDone(); }
        shoot(q, 'chute', 0, k === 'oppfora' ? 'fora' : 'def'); return;
      }
      me.tx = q.x; me.ty = q.y; me.sprint = 1;
      if (k === 'corte') { lc.have = false; const t2 = T[1].filter(x => x !== q && x.r !== 'GK').sort((a, b) => dist(a, me) - dist(b, me))[0] || q; fly(q, (me.x + t2.x) / 2, (me.y + t2.y) / 2, me, false, 'curto', true); return; }
      if (k === 'driblado') { lc.have = false; const [wx, wy] = toW(1, Math.min(qx + 12, 90), tf(1, q)[1]); me.stun = 1.4; ball.carry = { x: wx, y: wy, t: 1.2 }; return lcDone(); }
      if (dist(me, q) < 1.8 || lc.t2 > 1.6) {
        lc.have = false;
        if (k === 'falta') whistle('Falta', q); else setOwner(me);
        lcDone();
      }
    }
    // Saída de bola: cada time no seu campo
    const kicker = s => at(s, 9), kick2 = s => at(s, s ? 10 : 7);
    function koShape(p, s) {
      if (p.r === 'GK') return toW(s, 4, 34);
      let x = Math.min(5 + p.d * 44, 49), y = p.w;
      if (s === koSide && p === kicker(s)) { x = 52; y = 34; }
      else if (s === koSide && p === kick2(s)) { x = 50; y = 39; }
      else if (Math.abs(y - 34) < 12) x = Math.min(x, 42);
      return toW(s, x, y);
    }
    function play(dt) {
      if (lc) { lc.t += dt; if (lc.t > 4.5 || due) lcDone(); }
      // Quem manda no minuto: ter a bola e levar para a frente (com a bola atrás quase empata; sem ela, perde)
      const sd = ball.owner ? ball.owner.side : poss, ax = tf(sd, ball)[0] / L * 100, ctl = cl(55 + (ax - 25) * 0.6, 40, 100);
      acc.x += sd ? 100 - ctl : ctl; acc.n++; pt[sd] += dt;
      // Quem está melhor vem do motor (a bola de flowOf); o resto é o jogo
      momT -= dt; if (momT <= 0) { momT = 4 + rnd() * 5; mom = gauss() * 0.08; }
      const nxt = goals.find(e => !e.done && e.m >= curT - 1 && e.m <= curT + 3);
      let b = (bxT - 50) / 50 * 0.2 + mom;
      if (nxt) b += nxt.side ? -0.22 : 0.22;
      bias = [1 + cl(b, -0.35, 0.35), 1 - cl(b, -0.35, 0.35)];
      // O minuto do gol chegou: a jogada sai (se o time não tem a bola, rouba a próxima)
      // (começa um pouco antes do minuto dele, para a bola entrar junto com o placar)
      if (!due) {
        const e = goals.find(q => !q.done && (q.m <= curT + DUE_AHEAD));
        if (e) { due = e; due.t0 = clk; due.asDone = false; due.rx = 86 + rnd() * 5; due.ry = 34 + gauss() * 7; if (ball.owner && ball.owner.side === e.side) { ball.carry = null; ball.hold = Math.min(ball.hold, 0.1); } }
      }
      // O relógio da jogada só anda com a bola rolando (saída depois de outro gol não conta): gol do motor demorando 9 s vira lançamento
      if (due) { due.age = (due.age || 0) + dt; if (due.out === 'gol' || due.out === undefined) { if (due.age > 9 && due.cb) due.now = true; } }
      if (due && ball.owner && ball.owner.side !== due.side && ball.owner.r !== 'GK') {
        const th = T[due.side].filter(q => q.r !== 'GK').sort((a, b2) => dist(a, ball.owner) - dist(b2, ball.owner))[0]; th.lg = Math.max(th.lg, 0.8); th.cd = 0; th.tx = ball.owner.x; th.ty = ball.owner.y; th.sprint = 1; // vai dar o bote (e ganha)
      }
      // Quem vai marcar o gol do motor corre para a área enquanto a jogada sai
      if (due && poss === due.side) { const sc = scorerOf(due); if (ball.owner !== sc && !(ball.fly && ball.fly.to === sc)) { sc.run = Math.max(sc.run, 0.4); sc.runX = due.rx; sc.runY = due.ry; } }
      const s = poss, line = lineOf(s), owner = ball.owner;
      runT -= dt;
      if (runT <= 0 && owner && owner.side === s && owner.r !== 'GK') {
        runT = 0.6 + rnd() * 0.8;
        const bx = tf(s, ball)[0];
        const c = T[s].filter(q => q !== owner && q.d > 0.45 && q.run <= 0 && line - tf(s, q)[0] < 14 && bx > 28);
        if (c.length) {
          const r = s === 0 && ME >= 0 && c.includes(T[0][ME]) && rnd() < 0.5 ? T[0][ME] : c[Math.floor(rnd() * c.length)], qy = tf(s, r)[1];
          // A corrida vai no buraco da linha de defesa mais perto dele (entre dois zagueiros, ou entre o lateral e a lateral do campo)
          const ys = [2].concat(T[1 - s].filter(q => q.r !== 'GK' && line - tf(s, q)[0] < 9).map(q => tf(s, q)[1]).sort((a, b) => a - b), [66]);
          let gy = qy, gd = 1e9; for (let k = 1; k < ys.length; k++) if (ys[k] - ys[k - 1] > 7) { const m = (ys[k] + ys[k - 1]) / 2, d = Math.abs(m - qy); if (d < gd) { gd = d; gy = m; } }
          r.run = 1.5; r.runX = Math.min(95, line + 7 + rnd() * 6); r.runY = cl(gy + gauss() * 2, 6, 62);
          if (dist(r, owner) < 45 && rnd() < 0.65) ball.hold = Math.min(ball.hold, 0.3 + rnd() * 0.25);
        }
      }
      // Desmarque: marcado de perto, dá um pique curto para longe do marcador (para o lado da bola, ou nas costas se é
      // atacante e tem buraco); quem está com a bola pressionado ganha um companheiro que vem dar o apoio no ângulo livre
      if (owner && owner.side === s) {
        let opr = 99; for (const q of T[1 - s]) opr = Math.min(opr, dist(q, owner));
        let sup = null, sd = 99;
        T[s].forEach(p => {
          if (p === owner || p.r === 'GK' || p.run > 0 || p.go > 0 || p.stun > 0) return;
          const db = dist(p, ball); if (db < sd && db > 5) { sd = db; sup = p; }
          let mk = null, md = 99; for (const q of T[1 - s]) { const d = dist(q, p); if (d < md) { md = d; mk = q; } }
          if (md > 3.8 || db > 42 || rnd() > dt * 1.4) return;
          const [px, py] = tf(s, p), [mx, my] = tf(s, mk), [ox, oy] = tf(s, ball);
          if (p.d > 0.6 && px > line - 4 && rnd() < 0.5) { p.run = 1.3; p.runX = Math.min(95, line + 6 + rnd() * 5); p.runY = cl(py + (py - my) * 1.5, 6, 62); return; }
          let ux = (px - mx) + (ox - px) * 0.15, uy = (py - my) + (oy - py) * 0.15;
          // O marcador fica do lado do gol: fugir dele em linha reta é voltar. Meia e atacante saem de lado (ou na diagonal), não para trás
          if (p.d > 0.3) { if (Math.abs(uy) < 0.8) uy = (py < 34 ? 1 : -1) * 1.5; ux = Math.max(ux, -Math.abs(uy) * 0.35); }
          const ul = Math.hypot(ux, uy) || 1;
          p.go = 0.9; p.goX = cl(px + ux / ul * 7.5, 3, p.d > 0.6 ? Math.max(line - 0.8, ox - 2) : 100); p.goY = cl(py + uy / ul * 7.5, 4, 64);
        });
        if (sup && opr < 3.2 && owner.r !== 'GK' && rnd() < dt * 2.5) {
          const [ox, oy] = tf(s, owner), side = oy < 34 ? 1 : -1;
          sup.go = 1; sup.goX = cl(ox - 5, 3, 100); sup.goY = cl(oy + side * 9, 4, 64);
        }
      }
      // Bola no lado, perto da área: os atacantes entram na área (primeiro e segundo pau) esperando o cruzamento
      if (owner && owner.side === s && owner.r !== 'GK') {
        const [obx, oby] = tf(s, ball);
        if (obx > 54 && Math.abs(oby - 34) > 12) T[s].forEach(q => {
          if (q === owner || q.d < 0.6 || q.run > 0 || rnd() > dt * (0.8 + 2.2 * ST[s].wide)) return;
          const far = rnd() < 0.5; q.run = 1.6; q.runX = 88 + rnd() * 7; q.runY = cl(34 + (oby < 34 ? 1 : -1) * (far ? 7 : -4) + gauss() * 2, 22, 46);
        });
      }
      T[s].forEach(p => {
        if (p === owner) return;
        if (p.r === 'GK') { const [bx, by] = tf(s, ball), [x, y] = shapeOf(p, true, bx, by, line); [p.tx, p.ty] = toW(s, x, y); return; }
        p.th -= dt; if (p.th <= 0) { p.th = 0.35 + rnd() * 0.5; [p.tx, p.ty] = findSpace(p, s, line); }
        if (p.run > 0 || p.go > 0) { [p.tx, p.ty] = findSpace(p, s, line); p.sprint = 1; }
      });
      defend(1 - s, dt);
      if (ball.owner) {
        const p = ball.owner, dir = p.side ? -1 : 1; ball.rcv -= dt;
        if (ball.carry) { p.tx = ball.carry.x; p.ty = ball.carry.y; p.sprint = 1; p.drib = 1; ball.carry.t -= dt; if (ball.carry.t <= 0 || Math.hypot(p.x - ball.carry.x, p.y - ball.carry.y) < 1) { ball.carry = null; ball.hold = 0.2 + rnd() * 0.3; } }
        else { let pr = 99; for (const q of T[1 - p.side]) pr = Math.min(pr, dist(q, p)); const adv = p.r === 'GK' ? 0 : pr > 7 ? 3 : pr > 4 ? 1.2 : -0.6; p.tx = p.x + dir * adv; p.ty = p.y + (34 - p.y) * 0.02; ball.hold -= dt; }
        const sp = Math.hypot(p.vx, p.vy), touch = sp > 2 ? 0.7 + 1.3 * Math.abs(Math.sin(clk * 6 + p.ph)) : 0.7;
        // A bola vai até o pé do dono deslizando (nunca pula: virar o corpo, receber longe ou recomeçar não teleporta a bola)
        { const bxw = p.x + (sp > 1 ? p.vx / sp : dir) * touch, byw = p.y + (sp > 1 ? p.vy / sp : 0) * touch + 0.3, dd = Math.hypot(bxw - ball.x, byw - ball.y), mx = 20 * dt;
          if (dd <= mx) { ball.x = bxw; ball.y = byw; } else { ball.x += (bxw - ball.x) * mx / dd; ball.y += (byw - ball.y) * mx / dd; } }
        // O bote: quem chega perto tenta tirar; se erra, fica para trás um instante (no gol do motor, ninguém tira)
        if (ball.rcv <= 0 && p.r !== 'GK' && !(due && due.side === p.side) && !lc) for (const d of T[1 - p.side]) {
          if (d.cd > 0 || d.stun > 0 || d.r === 'GK' || d.lg <= 0 || dist(d, p) > 1.7) continue;
          d.cd = 1.6 + rnd() * 1.2; d.lg = 0;
          if ((due && due.side === d.side) || rnd() < cl(TK - (bias[p.side] - 1) * 0.8 + (d.q - p.q) * 1.2, 0.05, 0.6)) { why = 'bote'; setOwner(d); emit('desarme', d.side, d, p); break; }
          d.stun = 0.45;
        }
        if (lc && lc.have && DEF[lc.k] && p === lc.q) defAct(dt);
        else if (ball.owner === p && !ball.carry && ball.hold <= 0) decide(p);
      } else if (ball.fly) {
        const f = ball.fly; f.t += dt / f.dur;
        const u = Math.min(1, f.t), e = f.shot ? u : 1 - Math.pow(1 - u, 1.6);
        ball.x = f.x0 + (f.x1 - f.x0) * e; ball.y = f.y0 + (f.y1 - f.y0) * e + (f.curve || 0) * Math.sin(u * Math.PI);
        if (f.shot) { const gk = T[1 - f.side][0]; if (f.out === 'def') { gk.tx = f.x1; gk.ty = f.y1; } else gk.ty = cl(f.y1, GL - 1, GR + 1); gk.sprint = 1; }
        else if (f.to) { f.to.tx = f.x1; f.to.ty = f.y1; f.to.sprint = 1; }
        if (f.t >= 1) { if (f.shot) shotEnd(f); else { ball.fly = null; ball.loose = { to: f.to, f, t: 0 }; } }
      } else if (ball.loose) {
        const lo = ball.loose, p = lo.to, d = dist(p, ball); lo.t += dt;
        p.tx = ball.x; p.ty = ball.y; p.sprint = 1;
        if (d < 1.3 || lo.t > 2.5) receive(lo.f);
        else { const k = Math.min(1, 7 * dt / d); ball.x += (p.x - ball.x) * k; ball.y += (p.y - ball.y) * k; }
      } else { why = 'semdono'; setOwner(at(poss, 6)); }
    }
    let back = 0; // voltando para o meio depois do gol (correm de volta)
    function startPlay() { back = 0; mode = 'play'; const k = kicker(koSide); ball.x = 52.5; ball.y = 34; setOwner(k); lastPasser = k; lastPassClk = clk; fly(k, at(koSide, 6).x, at(koSide, 6).y, at(koSide, 6), false, 'curto', false); }
    // A volta para o meio depois do gol passa em velocidade 3× (é o tempo de recomeçar, não um lance)
    function step(dt) { step1(dt); if (back && mode === 'ko') { step1(dt); step1(dt); } }
    function step1(dt) {
      clk += dt;
      if (refFx && (refFx.t -= dt) <= 0) refFx = null;
      if (offLine && (offLine.t -= dt) <= 0) offLine = null;
      if (offPend) offStep(dt);
      if (foulPend) foulStep(dt);
      for (let i = leaving.length - 1; i >= 0; i--) { const q = leaving[i]; q.wait -= dt; if (q.wait > 0) continue; q.t += dt; q.p.y += cl(q.ty - q.p.y, -3.6 * dt, 3.6 * dt); if (q.t > 6 || q.p.y < -0.5 || q.p.y > WD + 0.5) leaving.splice(i, 1); }
      ALL.forEach(p => { if (p.down) p.down = Math.max(0, p.down - dt); });
      if (mode === 'wait') { ALL.forEach(p => { [p.tx, p.ty] = koShape(p, p.side); }); ball.x = 52.5; ball.y = 34; }
      else if (mode === 'play') play(dt);
      else if (mode === 'ko' || mode === 'half') {
        ALL.forEach(p => { [p.tx, p.ty] = koShape(p, p.side); });
        modeT -= dt;
        // Só sai quando todos voltaram para o seu campo e para perto do lugar (depois do gol, a volta é longa)
        const home = ALL.every(p => tf(p.side, p)[0] < 53.5 && Math.hypot(p.tx - p.x, p.ty - p.y) < 2.5);
        if (mode === 'ko' && modeT <= 0 && (home || modeT < -14)) startPlay();
      } else if (mode === 'goal') {
        modeT -= dt;
        const s = hero.side, cx = s ? 5 : 100, cy = hero.y < 34 ? 5 : 63;
        hero.tx = cx; hero.ty = cy; hero.sprint = 1;
        T[s].forEach(p => { if (p !== hero && p.r !== 'GK' && p.d > 0.3) { p.tx = cx + (s ? 3 : -3) * (1 + (p.k % 3)); p.ty = cy + (cy < 34 ? 1 : -1) * (2 + (p.k % 4) * 1.6); } });
        T[1 - s].forEach(p => { [p.tx, p.ty] = koShape(p, p.side); });
        if (modeT <= 0) { mode = 'ko'; modeT = 0.6; back = 1; }
      } else if (mode === 'falta') {
        // Todos param; a bola rola até o lugar da infração, o cobrador vai até ela (atrás da bola) e quem é do outro
        // time e está em cima recua um pouco. Só recomeça com o cobrador na bola
        modeT -= dt;
        const q = foulTo || at(poss, 6), sp = foulSpot || { x: ball.x, y: ball.y }, dir = q.side ? -1 : 1;
        ALL.forEach(p => {
          if (p === q) return;
          const d = dist(p, sp);
          if (p.side !== q.side && d < 4.5 && p.r !== 'GK') { const a = Math.atan2(p.y - sp.y, p.x - sp.x); p.tx = sp.x + Math.cos(a) * 5; p.ty = sp.y + Math.sin(a) * 5; }
          else { p.tx = p.x; p.ty = p.y; }
        });
        const bd = Math.hypot(sp.x - ball.x, sp.y - ball.y), kb = bd > 0.01 ? Math.min(bd * dt * 4, 16 * dt) / bd : 0; ball.x += (sp.x - ball.x) * kb; ball.y += (sp.y - ball.y) * kb;
        q.tx = cl(sp.x - dir * 0.9, 0.5, L - 0.5); q.ty = sp.y; q.sprint = dist(q, sp) > 3 ? 1 : 0;
        if (modeT <= 0 && (dist(q, sp) < 1.6 || modeT < -3)) { mode = 'play'; stopWhy = ''; foulTo = foulSpot = null; if (q.side !== poss) ALL.forEach(x => { x.th = 0; }); setOwner(q); }
      } else if (mode === 'tiro') {
        modeT -= dt; const s = poss, gk = T[s][0], [sx, sy] = toW(s, 5.5, 34);
        gk.tx = sx; gk.ty = sy;
        ball.x += (sx - ball.x) * Math.min(1, dt * 2.5); ball.y += (sy - ball.y) * Math.min(1, dt * 2.5);
        T[s].forEach(p => { if (p !== gk) { const [x, y] = shapeOf(p, true, 6, 34, lineOf(s)); [p.tx, p.ty] = toW(s, x, y); } });
        T[1 - s].forEach(p => { if (p.r !== 'GK') { const [x, y] = shapeOf(p, false, L - 6, 34, 0); [p.tx, p.ty] = toW(1 - s, x, y); } });
        if (modeT <= 0 || (due && due.side === s)) { mode = 'play'; setOwner(gk); } // a bola rola até o goleiro (sem pular para a marca)
      }
      if (lc && mode !== 'play') lcDone();
      if (mode === 'ko' || mode === 'half') { const dd = Math.hypot(52.5 - ball.x, 34 - ball.y), k = dd > 0.01 ? Math.min(1, 16 * dt / dd) : 1; ball.x += (52.5 - ball.x) * k; ball.y += (34 - ball.y) * k; } // volta ao meio rolando, não voando
      // Andar: cada um reage no seu tempo, acelera e freia; ninguém vira na hora nem atravessa o companheiro
      ALL.forEach(p => {
        p.lg = Math.max(0, (p.lg || 0) - dt); p.cd = Math.max(0, p.cd - dt); p.stun = Math.max(0, p.stun - dt); p.run = Math.max(0, p.run - dt); p.go = Math.max(0, p.go - dt);
        p.rt -= dt;
        if (p.sprint || p.rt <= 0 || mode !== 'play') {
          const dr = mode === 'play' && !p.sprint ? 0.5 : 0;
          p.gx = p.tx + Math.sin(clk * 0.7 + p.ph) * dr; p.gy = p.ty + Math.cos(clk * 0.55 + p.ph * 1.3) * dr;
          if (p.rt <= 0) p.rt = 0.15 + rnd() * 0.3;
        }
        let gx = p.gx, gy = p.gy;
        if (mode === 'play') for (const q of ALL) { if (q === p) continue; const d = dist(p, q), mn = q.side === p.side ? 3 : (p.lg > 0 || q.lg > 0 ? 0 : 2.4); if (d < mn && d > 0.01) { gx += (p.x - q.x) / d * (mn - d) * 1.2; gy += (p.y - q.y) / d * (mn - d) * 1.2; } }
        const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy);
        const top = (p.stun > 0 ? 2.2 : p.drib ? 6.6 : p.sprint ? 8.2 : mode === 'play' ? (d > 12 ? 7.4 : d > 6 ? 6.2 : 5) : back && d > 4 ? 8.6 : 5.6) * p.spd * (isMe(p) && en !== null && en < 30 ? 0.86 : 1);
        const want = d > 0.05 ? Math.min(top, d * 1.8) : 0, wx = d > 0.05 ? dx / d * want : 0, wy = d > 0.05 ? dy / d * want : 0, acc = (p.sprint ? 20 : 12) * dt;
        let ax = wx - p.vx, ay = wy - p.vy; const am = Math.hypot(ax, ay);
        if (am > acc) { ax *= acc / am; ay *= acc / am; }
        p.vx += ax; p.vy += ay;
        p.x = cl(p.x + p.vx * dt, 0.5, L - 0.5); p.y = cl(p.y + p.vy * dt, 0.5, WD - 0.5);
        const sp = Math.hypot(p.vx, p.vy);
        let fx = sp > 1.5 ? p.vx / sp : ball.x - p.x, fy = sp > 1.5 ? p.vy / sp : ball.y - p.y; const fm = Math.hypot(fx, fy) || 1;
        p.fx += (fx / fm - p.fx) * Math.min(1, dt * 8); p.fy += (fy / fm - p.fy) * Math.min(1, dt * 8);
        p.sprint = 0; p.drib = 0;
      });
    }

    // ---------- desenho (o gramado listrado vem do CSS) ----------
    const PAD = 10;
    // Fora de casa o seu time fica à direita (como no placar) e ataca para a esquerda: só o desenho espelha
    // No 2º tempo os times trocam de lado: o desenho espelha de novo
    let half2 = (o.t0 || 0) >= 45;
    const mir = () => !!o.flip !== half2;
    const X = x => PAD + (mir() ? L - x : x) / L * (W - 2 * PAD), Y = y => PAD + y / WD * (H - 2 * PAD);
    function size() {
      if (!cv) return;
      const r = cv.getBoundingClientRect(), z = U.zk ? U.zk() : 1;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width / z); H = Math.max(1, r.height / z);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    function lines() {
      // As linhas são simétricas: desenha sem espelhar (espelhado, as larguras sairiam negativas)
      const XL = x => PAD + x / L * (W - 2 * PAD);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
      g.strokeRect(XL(0), Y(0), XL(L) - XL(0), Y(WD) - Y(0));
      g.beginPath(); g.moveTo(XL(52.5), Y(0)); g.lineTo(XL(52.5), Y(WD)); g.stroke();
      g.beginPath(); g.ellipse(XL(52.5), Y(34), XL(9.15) - XL(0), Y(9.15) - Y(0), 0, 0, Math.PI * 2); g.stroke();
      const bw = XL(16.5) - XL(0), sw = XL(5.5) - XL(0);
      g.strokeRect(XL(0), Y(13.85), bw, Y(54.15) - Y(13.85)); g.strokeRect(XL(L) - bw, Y(13.85), bw, Y(54.15) - Y(13.85));
      g.strokeRect(XL(0), Y(24.85), sw, Y(43.15) - Y(24.85)); g.strokeRect(XL(L) - sw, Y(24.85), sw, Y(43.15) - Y(24.85));
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(XL(0) - 4, Y(GL), 4, Y(GR) - Y(GL)); g.fillRect(XL(L), Y(GL), 4, Y(GR) - Y(GL));
    }
    function dot(p, k) {
      const x = X(p.x), y = Y(p.y), me = isMe(p), r = (me ? 9.5 : 6.2) * k;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 1, y + 2.5, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
      if (me) { g.fillStyle = 'rgba(242,194,48,.35)'; g.beginPath(); g.arc(x, y, r + 4.5 * k, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = p.stun > 0 ? 0.65 : 1;
      const kt = p.r === 'GK' ? [KT.gk[p.side], '#1D1D1F'] : p.side ? KT.opp : KT.mine, shirt = me ? '#F2C230' : kt[0];
      // A borda é o calção (se some na camisa, preto ou branco)
      g.fillStyle = shirt; g.strokeStyle = me ? '#0F3D2A' : cdist(kt[1], kt[0]) > 120 ? kt[1] : lum(kt[0]) > 0.55 ? '#1D1D1F' : '#F4F1E8'; g.lineWidth = 2 * k;
      g.beginPath(); if (p.down) g.ellipse(x, y, r * 1.2, r * 0.62, 0.5, 0, Math.PI * 2); else g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      g.globalAlpha = 1;
      const a = Math.atan2(p.fy, p.fx);
      g.strokeStyle = me || lum(shirt) > 0.55 ? 'rgba(19,32,26,.75)' : 'rgba(255,255,255,.85)'; g.lineWidth = 1.6 * k;
      g.beginPath(); g.arc(x, y, r - 2 * k, a - 0.5, a + 0.5); g.stroke();
      if (!me) return;
      g.fillStyle = '#13201A'; g.font = '800 ' + Math.round(12 * k) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(o.num || 9), x, y + 0.5);
      const tw = 36 * k, ty = cl(y - r - 18 * k, 2, H - 14 * k);
      g.fillStyle = '#F2C230'; g.beginPath(); g.roundRect(x - tw / 2, ty, tw, 13 * k, 4 * k); g.fill();
      g.fillStyle = '#13201A'; g.font = '800 ' + Math.round(10.5 * k) + 'px "Barlow Condensed", sans-serif'; g.fillText('VOCÊ', x, ty + 7 * k);
      if (en !== null) energy(x, y + r + 4 * k, k);
    }
    // Marcador de energia embaixo de você: raio, barra e número; muda de cor quando cansa
    function energy(cx, top, k) {
      const w = 62 * k, h = 15 * k, x0 = cl(cx - w / 2, 2, W - w - 2), y0 = Math.min(top, H - h - 2), v = Math.round(en);
      const col = v > 55 ? '#7BE3A0' : v >= 30 ? '#F2C230' : '#FF6B6B';
      g.fillStyle = 'rgba(7,17,12,.88)'; g.beginPath(); g.roundRect(x0, y0, w, h, 5 * k); g.fill();
      const bx = x0 + 4 * k, by = y0 + 2 * k, s = k * 0.6;
      g.fillStyle = col; g.beginPath();
      g.moveTo(bx + 8 * s, by); g.lineTo(bx + 1 * s, by + 10 * s); g.lineTo(bx + 6 * s, by + 10 * s); g.lineTo(bx + 3 * s, by + 18 * s); g.lineTo(bx + 11 * s, by + 7 * s); g.lineTo(bx + 6 * s, by + 7 * s); g.closePath(); g.fill();
      const bw = 30 * k, bxx = x0 + 13 * k, byy = y0 + h / 2 - 2.5 * k;
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.roundRect(bxx, byy, bw, 5 * k, 2.5 * k); g.fill();
      g.fillStyle = col; g.beginPath(); g.roundRect(bxx, byy, Math.max(3, bw * v / 100), 5 * k, 2.5 * k); g.fill();
      g.font = '800 ' + Math.round(11 * k) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(v), x0 + w - 4 * k, y0 + h / 2 + 0.5);
      g.textAlign = 'center';
    }
    // Cartão: retângulo inclinado com sombra (w×h ~ 11×15 px)
    function card(x, y, col, k, rot) {
      g.save(); g.translate(x, y); g.rotate(rot || 0);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-5.5 * k + 1.5, -15 * k + 2.5, 11 * k, 15 * k);
      g.fillStyle = col; g.strokeStyle = '#13201A'; g.lineWidth = 1.4 * k; g.beginPath(); g.roundRect(-5.5 * k, -15 * k, 11 * k, 15 * k, 2 * k); g.fill(); g.stroke();
      g.restore();
    }
    function draw() {
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      lines();
      const k = cl(W / 380, 0.85, 1.45);
      if (ball.fly) { g.strokeStyle = ball.fly.shot ? 'rgba(242,194,48,.8)' : 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 * k; g.setLineDash([4 * k, 4 * k]); g.beginPath(); g.moveTo(X(ball.fly.x0), Y(ball.fly.y0)); g.lineTo(X(ball.x), Y(ball.y)); g.stroke(); g.setLineDash([]); }
      ALL.forEach(p => { if (!isMe(p)) dot(p, k); });
      if (ME >= 0) dot(T[0][ME], k);
      // Quem foi expulso sai andando (um pouco apagado); o cartão em cima de quem fez; a linha do impedimento
      leaving.forEach(q => { const p = q.p, x = X(p.x), y = Y(p.y), r = (q.wasMe ? 9.5 : 6.2) * k, kt = p.side ? KT.opp : KT.mine;
        g.globalAlpha = 0.7; g.fillStyle = q.wasMe ? '#F2C230' : kt[0]; g.strokeStyle = '#F4F1E8'; g.lineWidth = 2 * k; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.globalAlpha = 1;
        if (q.wasMe) { g.fillStyle = '#13201A'; g.font = '800 ' + Math.round(12 * k) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(o.num || 9), x, y + 0.5); }
        if (!refFx || refFx.p !== p) card(x + 5 * k, y - r - 2 * k, '#D8404A', k * 0.7, -0.14); });
      if (offLine) {
        const [wx] = toW(offLine.s, offLine.x, 0), lx = X(wx);
        g.fillStyle = 'rgba(242,194,48,.10)'; const x2 = X(toW(offLine.s, L, 0)[0]); g.fillRect(Math.min(lx, x2), Y(0), Math.abs(x2 - lx), Y(WD) - Y(0));
        g.strokeStyle = '#F2C230'; g.lineWidth = 2 * k; g.setLineDash([5 * k, 4 * k]); g.beginPath(); g.moveTo(lx, Y(0)); g.lineTo(lx, Y(WD)); g.stroke(); g.setLineDash([]);
        // a bandeira do bandeirinha, levantada na lateral de cima
        const fy = Y(0) - 1; g.strokeStyle = '#FBF8EF'; g.lineWidth = 1.8 * k; g.beginPath(); g.moveTo(lx, fy + 12 * k); g.lineTo(lx, fy - 8 * k); g.stroke();
        g.fillStyle = '#F2C230'; g.fillRect(lx, fy - 8 * k, 6 * k, 4 * k); g.fillStyle = '#D8404A'; g.fillRect(lx + 6 * k, fy - 8 * k, 6 * k, 4 * k); g.fillRect(lx, fy - 4 * k, 6 * k, 4 * k); g.fillStyle = '#F2C230'; g.fillRect(lx + 6 * k, fy - 4 * k, 6 * k, 4 * k);
      }
      if (refFx) {
        const p = refFx.p, x = X(p.x), y = Y(p.y), up = Math.min(1, (2.3 - refFx.t) * 4);
        if (refFx.kind === 'impedimento') { g.strokeStyle = 'rgba(216,64,74,.9)'; g.lineWidth = 3 * k; g.beginPath(); g.arc(x, y, 10 * k, 0, Math.PI * 2); g.stroke(); }
        else if (refFx.kind !== 'falta') {
          const red = refFx.kind === 'vermelho';
          g.strokeStyle = red ? 'rgba(216,64,74,.6)' : 'rgba(242,194,48,.55)'; g.lineWidth = 3.5 * k; g.beginPath(); g.arc(x, y, 10 * k, 0, Math.PI * 2); g.stroke();
          if (red && refFx.how === '2am') card(x - 3 * k, y - 15 * k - up * 6 * k, '#F2C230', k, 0.16);
          card(x + 4 * k, y - 15 * k - up * 6 * k, red ? '#D8404A' : '#F2C230', k, red ? -0.14 : 0.16);
        }
      }
      const bx = X(ball.x), by = Y(ball.y), air = ball.fly ? Math.sin(Math.min(1, ball.fly.t) * Math.PI) * (ball.fly.loft || 0) * 0.9 * k : 0;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(bx + 1, by + 3, 4 * k, 2.5 * k, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.strokeStyle = '#13201A'; g.lineWidth = 1.5 * k; g.beginPath(); g.arc(bx, by - air, (4.5 + air / 12) * k, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    function loop(ts) {
      raf = 0;
      if (!alive) return;
      if (!cv || !cv.isConnected) return; // a tela trocou (intervalo, fim): para até o próximo attach
      const dt = Math.min(0.05, (ts - (last || ts)) / 1000) * (o.speed ? o.speed() : 1); last = ts;
      if (!frozen && !document.hidden) { const n = Math.ceil(dt / 0.02); for (let i = 0; i < n; i++) step(dt / n); }
      draw();
      if (o.onFrame) o.onFrame(api.info());
      raf = requestAnimationFrame(loop);
    }
    // Começo: no apito todos no seu campo; voltando do seu lance, a bola com o seu time no meio
    ALL.forEach(p => { const [x, y] = koShape(p, p.side); p.x = p.gx = p.tx = x; p.y = p.gy = p.ty = y; });
    if (o.t0 > 0) { ALL.forEach(p => { const [x, y] = toW(p.side, ...shapeOf(p, p.side === 0, p.side === 0 ? 50 : 55, 34, 60)); p.x = p.gx = p.tx = x; p.y = p.gy = p.ty = y; }); mode = 'play'; setOwner(T[0][6]); }
    const onResize = () => size();
    window.addEventListener('resize', onResize);
    const api = {
      attach(el) {
        cv = el; g = el.getContext('2d'); size(); draw();
        if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); }
      },
      // Novo minuto: volta quem mandou no minuto que acabou (0 eles, 50 igual, 100 você: posse e campo juntos), ou null
      minute(t, bx) {
        const avg = acc.n > 0 && t === curT + 1 ? acc.x / acc.n : null; acc.x = 0; acc.n = 0;
        if (t - curT > 1) goals.forEach(e => { if (e.m < t) e.done = true; });
        curT = t; bxT = bx; mClk = clk; return avg;
      },
      // O que a tela escreve sai daqui: quem tem a bola, onde ela está (no sentido de quem ataca) e a posse até agora
      info() {
        const side = ball.owner ? ball.owner.side : poss, [ax, ay] = tf(side, ball), tot = pt[0] + pt[1];
        return { mode, why: stopWhy, side, ax: ax / L * 100, ay: ay / WD * 100, sx: (mir() ? L - ball.x : ball.x) / L * 100, posse: (pt[0] + 4) / (tot + 8) }; // a posse começa em 50% e anda com o jogo
      },
      // Seu lance: a bola chega em você (passe do companheiro, ou você corta a jogada deles)
      lance(k, cb) {
        if (lc) lcDone();
        if (k && (ME < 0 || mode !== 'play' || due || k === 'none')) { if (cb) cb(); return; }
        if (ME < 0 || mode !== 'play') return;
        const me = T[0][ME];
        if (k) lc = { k, cb, t: 0, have: false };
        if (k && DEF[k]) {
          // A bola vai para um deles perto de você (o atacante, se você é o goleiro)
          const gkA = k === 'defesa' || k === 'oppfora' || k === 'pega' || k === 'saimal' || k === 'rebate';
          const q = gkA ? T[1][k === 'pega' || k === 'saimal' ? (me.y < 34 ? 5 : 8) : 9 + (curT % 2)] : T[1].filter(x => x.r !== 'GK').sort((a, b) => dist(a, me) - dist(b, me))[0];
          lc.q = q;
          if (ball.owner === q) { lc.have = true; return; }
          const from = ball.owner || (ball.fly && ball.fly.from) || at(poss, 6);
          fly(from, q.x + (gkA ? -1 : 0), q.y, q, dist(from, q) > 28, from.side === 1 ? 'curto' : 'longo', from.side === 0);
          return;
        }
        if (ball.owner === me) { if (lc) { lc.have = true; ball.hold = Math.min(ball.hold, 0.35); ball.carry = null; } return; }
        const from = ball.owner || (ball.fly && ball.fly.from) || at(poss, 6);
        if (ball.owner || ball.loose) fly(from, me.x + 1, me.y, me, dist(from, me) > 30, 'curto', from.side !== 0);
        else if (ball.fly && !ball.fly.shot) { const f = ball.fly; f.to = me; f.x0 = ball.x; f.y0 = ball.y; f.x1 = me.x + 1; f.y1 = me.y; f.t = 0; f.dur = Math.max(0.25, Math.hypot(f.x1 - f.x0, f.y1 - f.y0) / 18); f.cut = f.from.side !== 0; } // desvia a partir de onde a bola está (sem pular)
      },
      // Antes do apito todos parados na formação de saída; go() é o apito
      // Substituído: você vira um jogador como os outros e o marcador some
      sub() { if (lc) lcDone(); ME = -1; en = null; },
      // Ainda falta sair no campinho o gol do motor do minuto m? (a tela segura o relógio até a rede balançar)
      // A tela esperou e o gol não saiu: quem vai marcar bate de onde estiver (golaço de longe, mas a rede balança antes do placar)
      force(m) { const e = goals.find(q => !q.done && q.m === m); if (!e || mode !== 'play') return; if (due !== e) { due = e; e.t0 = clk; e.asDone = false; e.rx = 88; e.ry = 34; } e.now = true; },
      // Treinador: o motor já decidiu o lance (chute do lado side que vira out: gol, def ou fora); o campinho joga e avisa em cb
      shot(side, out, cb) {
        const e = { m: curT + 1, side, me: false, as: false, out, cb, done: false };
        // Gol na fila: as chances que ainda não saíram ficam para trás (a linha delas aparece já) e o gol vem primeiro
        if (out === 'gol') goals.forEach(q => { if (!q.done && q.out && q.out !== 'gol') { q.done = true; if (due === q) due = null; if (q.cb) q.cb(); } });
        goals.push(e);
        // now: a tela esperou demais, quem vai bater bate de onde estiver; sem now: desiste do lance
        return now => { if (e.done) return; if (now) { if (due !== e && mode === 'play') { due = e; e.t0 = clk; e.asDone = false; e.rx = 88; e.ry = 34; } e.now = true; return; } e.done = true; if (due === e) due = null; };
      },
      // O juiz: { side: 0 seu time | 1, pos, kind: falta|amarelo|vermelho|impedimento, me, how }. cb quando o lance aparece
      // (com a bola parada, num gol saindo ou no seu lance, a linha sai na hora; o vermelho tira o jogador do mesmo jeito)
      ref(r0, cb) {
        const free = mode === 'play' && !lc && !due && !r0.quiet;
        const r = free && !offPend && !foulPend ? refDo(r0) : false;
        if (r === 'pend') { (offPend || foulPend).cb = cb; return; }
        if (r) { if (cb) setTimeout(cb, r0.kind === 'falta' ? 500 : 900 / Math.max(1, o.speed ? o.speed() : 1)); return; }
        if (r0.kind === 'vermelho') { const p = whoDid(r0.side, r0.pos, r0.me); if (p) goOff(p, 0); }
        if (cb) cb();
      },
      // Treinador: mudou a formação (ou alguém foi expulso: a lista vem menor); cada um corre para o lugar novo
      lineup(s, form) {
        if (!form || !form.length) return;
        while (T[s].length > form.length) { const out = T[s].pop(); if (ball.owner === out) setOwner(at(s, 6)); if (ball.fly && ball.fly.to === out) ball.fly.to = at(s, 6); if (ball.loose && ball.loose.to === out) ball.loose.to = at(s, 6); }
        T[s].forEach((p, k) => reform(p, form[k]));
        ALL = T[0].concat(T[1]); ALL.forEach(p => { p.mark = null; p.th = 0; }); defT = 0;
      },
      // Treinador: mudou o estilo no meio do jogo
      style(s, x) { ST[s] = stOf(x); },
      mirror() { return mir(); },
      pending(m) { return mode !== 'wait' && goals.some(e => !e.done && e.m === m); },
      go() { if (mode === 'wait') { mode = 'ko'; modeT = 0.3; } },
      half() { if (lc) lcDone(); mode = 'half'; koSide = 1; ball.owner = ball.fly = ball.loose = ball.carry = null; },
      second() { half2 = true; mode = 'ko'; modeT = 0.4; koSide = 1; },
      freeze(v) { frozen = !!v; },
      energy(v) { en = v === null || v === undefined ? null : cl(v, 0, 100); },
      meAt() { if (ME < 0) return null; const p = T[0][ME]; return [p.x / L * 100, p.y / WD * 100]; },
      ballAt() { return [ball.x / L * 100, ball.y / WD * 100]; },
      stop() { alive = false; if (raf) cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', onResize); },
      _step: step, _state: () => { const lw = lastWhy; lastWhy = ''; return ({ lastWhy: lw, ALLX: ALL, WHY, mode, poss, ball, due, goals, lc, offPend, foulPend, refFx, wrong: ALL.filter(p => tf(p.side, p)[0] > 53.5).length }); }
    };
    LP._sim = api;
    return api;
  };
})();
