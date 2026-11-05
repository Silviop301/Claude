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
  const tf = (s, o) => (s ? [L - o.x, WD - o.y] : [o.x, o.y]);

  // o: { me: índice do seu jogador (-1 fora), num, seed, goals: [{ m, side: 0 seu time | 1, me, as }], t0, speed(): 1|3 }
  LP.sim = function (o) {
    if (LP._sim) LP._sim.stop(); // uma partida por vez
    let seed = ((o.seed >>> 0) % 2147483646) + 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    const ME = o.me;
    const mk = (form, side) => form.map(([r, d, w], k) => ({ r, d, w: w * 0.68, k, side, x: 0, y: 0, tx: 0, ty: 0, gx: 0, gy: 0, vx: 0, vy: 0,
      rt: 0, th: 0, spd: 0.9 + rnd() * 0.22, risk: 0.7 + rnd() * 0.6, ph: k * 1.9 + side * 4.1, fx: side ? -1 : 1, fy: 0,
      run: 0, runX: 0, runY: 0, go: 0, goX: 0, goY: 0, stun: 0, cd: 0, sprint: 0, drib: 0, mark: null }));
    const T = [mk(F433, 0), mk(F442, 1)], ALL = T[0].concat(T[1]);
    const isMe = p => ME >= 0 && p.side === 0 && p.k === ME;
    const ball = { x: 52.5, y: 34, owner: null, fly: null, loose: null, carry: null, hold: 0, rcv: 0 };
    let poss = 0, mode = o.t0 > 0 ? 'ko' : 'wait', modeT = 1.2, koSide = 0, hero = null, bias = [1, 1], mom = 0, momT = 0, runT = 2, defT = 0, clk = 0;
    let curT = o.t0 || 0, mClk = 0, bxT = 50, lastPasser = null, lastPassClk = -9, frozen = false, en = null, cv = null, g = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, alive = true;
    const goals = (o.goals || []).map(e => ({ m: e.m, side: e.side, me: !!e.me, as: !!e.as, done: e.m <= (o.t0 || 0) && (o.t0 || 0) > 0 }));
    let due = null; // o gol do motor que está para sair

    function lineOf(s) { let m = 0; T[1 - s].forEach(q => { if (q.r !== 'GK') m = Math.max(m, tf(s, q)[0]); }); return Math.max(m, L / 2); }
    function shapeOf(p, has, bx, by, line) {
      if (p.r === 'GK') return has ? [cl(4 + bx * 0.12, 5, 16), 34 + (by - 34) * 0.2] : [cl(2 + bx * 0.05, 2, 7), 34 + (by - 34) * 0.3];
      const back = has ? cl(bx - 28, 16, 64) : cl(bx - 24, 8, 44), span = has ? 50 : 31, dd = (p.d - 0.16) / 0.74;
      let x = back + dd * span, y = 34 + (p.w - 34) * (has ? 1.05 : 0.6) + (by - 34) * (has ? 0.15 : 0.42);
      if (has && bx > 52 && ((p.r === 'LB' && by < 26) || (p.r === 'RB' && by > 42))) { x = Math.max(x, bx + 3); y = p.r === 'LB' ? 4 : 64; }
      if (has && p.d > 0.6) x = Math.min(x, Math.max(line - 1, bx - 2));
      return [cl(x, 2, 102), cl(y, 3, 65)];
    }
    function findSpace(p, s, line) {
      if (p.run > 0) return toW(s, p.runX, p.runY);
      if (p.go > 0) return toW(s, p.goX, p.goY);
      const [bx, by] = tf(s, ball), [sx, sy] = shapeOf(p, true, bx, by, line);
      let best = toW(s, sx, sy), bs = -1e9;
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8 + rnd() * 0.7, r = i === 0 ? 0 : 3 + rnd() * 7;
        let cx = cl(sx + Math.cos(a) * r, 2, 103), cy = cl(sy + Math.sin(a) * r, 3, 65);
        if (p.d > 0.6) cx = Math.min(cx, Math.max(line - 0.8, bx - 2));
        const [wx, wy] = toW(s, cx, cy);
        let open = 12, lane = 10, crowd = 0;
        for (const q of T[1 - s]) { open = Math.min(open, Math.hypot(q.x - wx, q.y - wy)); lane = Math.min(lane, segD(q.x, q.y, ball.x, ball.y, wx, wy)); }
        for (const q of T[s]) if (q !== p) { const d = Math.hypot(q.x - wx, q.y - wy); if (d < 8) crowd += 8 - d; }
        const sc = open * 0.5 + lane * 0.7 + (cx - sx) * 0.12 - Math.hypot(cx - sx, cy - sy) * 0.3 - crowd * 0.6 + rnd() * 1.2;
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
        if (p === pr && dist(pr, tgt) < 26 && !(owner && owner.r === 'GK')) {
          if (owner) { const d = Math.hypot(gx - owner.x, gy - owner.y) || 1; wx = owner.x + (gx - owner.x) / d * 0.9; wy = owner.y + (gy - owner.y) / d * 0.9; } else { wx = tgt.x; wy = tgt.y; }
          p.tx = wx; p.ty = wy; p.sprint = 1; return;
        }
        if (p === cv2 && owner && owner.r !== 'GK') {
          const n = att.filter(a => a !== owner && a.r !== 'GK').sort((a, b) => dist(a, owner) - dist(b, owner))[0];
          if (n) { p.tx = owner.x + (n.x - owner.x) * 0.55; p.ty = owner.y + (n.y - owner.y) * 0.55; return; }
        }
        if (p.mark) { const a = p.mark, d = Math.hypot(gx - a.x, gy - a.y) || 1; wx = wx * 0.35 + (a.x + (gx - a.x) / d * 2.2) * 0.65; wy = wy * 0.35 + (a.y + (gy - a.y) / d * 2.2) * 0.65; }
        p.tx = wx; p.ty = wy;
      });
    }
    function passOdds(s, tx, ty, lofted, q, turn) {
      const [wx, wy] = toW(s, tx, ty), d = Math.hypot(wx - ball.x, wy - ball.y), spd = lofted ? 21 : 18;
      let pI = 0, cut = null;
      for (const op of T[1 - s]) {
        for (let f = lofted ? 0.8 : 0.12; f <= 1.001; f += 0.11) {
          const px = ball.x + (wx - ball.x) * f, py = ball.y + (wy - ball.y) * f;
          const tb = d * f / spd + 0.08, to = Math.max(0, Math.hypot(op.x - px, op.y - py) - 1.1) / 7.5 + (op.r === 'GK' ? 0.15 : 0.32 + (turn ? 0.45 : 0)) + (op.stun > 0 ? 0.6 : 0);
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
    const scorerOf = d => (d.me && ME >= 0 && d.side === 0 ? T[0][ME] : T[d.side][d.side ? 9 + (d.m % 2) : [9, 8, 10][d.m % 3]]);
    function decide(p) {
      const s = p.side, own = T[s], opp = T[1 - s], [bx, by] = tf(s, ball), line = lineOf(s);
      // O gol do motor: a jogada procura quem vai marcar (passando antes por você, se a assistência é sua) e ele bate
      if (due && due.side === s) {
        const sc = scorerOf(due), mid = due.as && ME >= 0 && s === 0 && !due.asDone ? T[0][ME] : null;
        if (mid && p !== mid && p !== sc) return fly(p, mid.x + (mid.side ? -1 : 1), mid.y, mid, false, 'curto', false);
        if (mid && p === mid) due.asDone = true;
        if (p === sc || (bx > 80 && !due.me && !mid)) return shoot(p, bx > 84 && Math.abs(by - 34) < 15 && rnd() < 0.3 ? 'cabeca' : 'chute', 1);
        const [qx] = tf(s, sc);
        return fly(p, cl(sc.x + (s ? -2 : 2), 1, L - 1), sc.y, sc, Math.hypot(sc.x - p.x, sc.y - p.y) > 30, qx > bx + 15 ? 'costas' : 'curto', false);
      }
      let press = 99, presser = null; for (const op of opp) { const d = dist(op, p); if (d < press) { press = d; presser = op; } }
      const opts = [];
      for (const q of own) {
        if (q === p || (q.r === 'GK' && (bx > 40 || press > 6))) continue;
        const [qx, qy] = tf(s, q), qv = s ? [-q.vx, -q.vy] : [q.vx, q.vy], d0 = Math.hypot(qx - bx, qy - by);
        if (d0 < 5 || d0 > (p.r === 'GK' ? 65 : 52)) continue;
        let kind = 'curto', lofted = false, tx = qx + qv[0] * 0.45, ty = qy + qv[1] * 0.45;
        if (q.run > 0.7) { kind = 'costas'; tx = q.runX; ty = q.runY; lofted = d0 > 24; }
        else if (q.d > 0.6 && qx > Math.max(line, bx) + 0.5) continue; // impedido
        else if (bx > 70 && Math.abs(by - 34) > 12 && qx > 78 && Math.abs(qy - 34) < 15 && q.r !== 'GK') { kind = 'cruz'; lofted = true; tx = cl(qx + 6, 88, 99); ty = cl(qy + (34 - qy) * 0.5, 27, 41); }
        else if (Math.abs(ty - by) > 26 && d0 > 28) { kind = 'inv'; lofted = true; }
        else if (d0 > 32) { kind = 'longo'; lofted = true; }
        tx = cl(tx, 2, 103); ty = cl(ty, 2, 66);
        const od = passOdds(s, tx, ty, lofted, q, kind === 'costas');
        let val = V(tx, ty) + (kind === 'costas' ? 0.06 : 0) + (kind === 'cruz' ? 0.05 : 0) + (q === lastPasser && q.go > 0 && clk - lastPassClk < 2.5 ? 0.02 : 0) + (isMe(q) && tx > 70 ? 0.03 : 0);
        if (tx < bx - 2) val *= 0.9;
        opts.push({ type: 'pass', kind, q, wx: od.wx, wy: od.wy, lofted, od, p: od.p, u: od.p * val - (1 - od.p) * lossAt((bx + tx) / 2, (by + ty) / 2) });
      }
      if (p.r !== 'GK') for (const a of [0, 0.6, -0.6]) {
        const tx = cl(bx + Math.cos(a) * 9, 2, 101), ty = cl(by + Math.sin(a) * 9, 3, 65), [wx, wy] = toW(s, tx, ty);
        let near = 99; for (const op of opp) near = Math.min(near, segD(op.x, op.y, p.x, p.y, wx, wy));
        const drib = press < 3.2, pk = drib ? cl(0.42 + (near - 1.5) * 0.08 + (bias[s] - 1) * 0.6, 0.12, 0.6) : cl(sig((near - 2.2) * 1.8) + (bias[s] - 1) * 0.4, 0.05, 0.97);
        opts.push({ type: 'carry', kind: drib ? 'drible' : 'conduz', wx, wy, p: pk, presser, u: pk * V(tx, ty) - (1 - pk) * lossAt(bx, by) + (!drib && near > 5 ? 0.008 : 0) });
      }
      if (p.r !== 'GK' && bx > 62) { const xg = shotXg(s, bx, by, false); opts.push({ type: 'shot', kind: Math.hypot(L - bx, 34 - by) > 20 ? 'fora' : 'chute', u: xg }); }
      if (!opts.length) { ball.hold = 0.3; return; }
      let best = opts[0], bu = -1e9;
      for (const op of opts) { const u = op.u * (1 + 0.28 * gauss() * p.risk) + 0.004 * gauss(); if (u > bu) { bu = u; best = op; } }
      if (best.type === 'shot') return shoot(p, best.kind, 0);
      if (best.type === 'carry') {
        if (best.kind === 'drible') { if (rnd() < best.p) { best.presser.stun = 1.3; ball.carry = { x: best.wx, y: best.wy, t: 1.1 }; } else setOwner(best.presser); }
        else ball.carry = { x: best.wx, y: best.wy, t: 1 + rnd() * 0.9 };
        return;
      }
      lastPasser = p; lastPassClk = clk;
      if (rnd() < best.p) {
        fly(p, best.wx, best.wy, best.q, best.lofted, best.kind, false);
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
    function shoot(p, kind, forced) {
      const s = p.side, gx = s ? 0 : L, gk = T[1 - s][0];
      const out = forced ? 'gol' : rnd() < 0.5 ? 'def' : 'fora';
      let ty, tx = gx + (s ? -1.5 : 1.5);
      if (out === 'gol') ty = gk.y < 34 ? 34 + 1.2 + rnd() * 2.2 : 34 - 1.2 - rnd() * 2.2;
      else if (out === 'def') { ty = cl(gk.y + gauss() * 1.6, GL + 0.4, GR - 0.4); tx = gk.x + (s ? 0.6 : -0.6); }
      else ty = rnd() < 0.5 ? GL - 1 - rnd() * 4 : GR + 1 + rnd() * 4;
      const d = Math.hypot(tx - ball.x, ty - ball.y);
      ball.fly = { x0: ball.x, y0: ball.y, x1: tx, y1: ty, t: 0, dur: forced ? cl(d / 28, 0.3, 1) : Math.max(0.3, d / (kind === 'cabeca' ? 15 : 25)), shot: true, out, side: s, from: p, kind, loft: kind === 'cabeca' ? 2 : kind === 'fora' ? 5 : 2.5, curve: gauss() * 2 };
      ball.owner = null; ball.carry = null; ball.loose = null;
    }
    function setOwner(p, quick) {
      ball.owner = p; ball.fly = null; ball.loose = null; ball.carry = null; ball.rcv = 0.3; p.run = 0; p.go = 0;
      let press = 99; for (const q of T[1 - p.side]) press = Math.min(press, dist(q, p));
      ball.hold = p.r === 'GK' ? 1.3 + rnd() * 0.8 : quick ? 0.25 + rnd() * 0.2 : press < 3 ? 0.35 + rnd() * 0.25 : 0.7 + rnd() * 0.9;
      if (due && due.side === p.side) ball.hold = Math.min(ball.hold, 0.35);
      if (p.side !== poss) { poss = p.side; ALL.forEach(q => { q.th = rnd() * 0.35; q.run = 0; q.go = 0; }); }
    }
    function receive(f) {
      const p = f.to; setOwner(p, f.quick);
      if (!f.cut && f.kind === 'cruz') { const [bx, by] = tf(p.side, ball); if (bx > 84 && Math.abs(by - 34) < 15) shoot(p, 'cabeca', 0); }
    }
    function shotEnd(f) {
      const s = f.side, gk = T[1 - s][0];
      if (f.out === 'gol') { mode = 'goal'; modeT = 2.8; koSide = 1 - s; hero = f.from; if (due) { due.done = true; due = null; } }
      else if (f.out === 'def') setOwner(gk);
      else { mode = 'tiro'; modeT = 1.6; poss = 1 - s; }
    }
    // Saída de bola: cada time no seu campo
    const kicker = s => T[s][9], kick2 = s => T[s][s ? 10 : 7];
    function koShape(p, s) {
      if (p.r === 'GK') return toW(s, 4, 34);
      let x = Math.min(5 + p.d * 44, 49), y = p.w;
      if (s === koSide && p === kicker(s)) { x = 52; y = 34; }
      else if (s === koSide && p === kick2(s)) { x = 50; y = 39; }
      else if (Math.abs(y - 34) < 12) x = Math.min(x, 42);
      return toW(s, x, y);
    }
    function play(dt) {
      // Quem está melhor vem do motor (a bola de flowOf); o resto é o jogo
      momT -= dt; if (momT <= 0) { momT = 4 + rnd() * 5; mom = gauss() * 0.08; }
      const nxt = goals.find(e => !e.done && e.m >= curT - 1 && e.m <= curT + 3);
      let b = (bxT - 50) / 50 * 0.2 + mom;
      if (nxt) b += nxt.side ? -0.22 : 0.22;
      bias = [1 + cl(b, -0.35, 0.35), 1 - cl(b, -0.35, 0.35)];
      // O minuto do gol chegou: a jogada sai (se o time não tem a bola, rouba a próxima)
      // (começa um pouco antes do minuto dele, para a bola entrar junto com o placar)
      if (!due) {
        const e = goals.find(q => !q.done && (q.m <= curT || (q.m === curT + 2 && clk - mClk > 0.7)));
        if (e) { due = e; due.t0 = clk; due.asDone = false; if (ball.owner && ball.owner.side === e.side) { ball.carry = null; ball.hold = Math.min(ball.hold, 0.1); } }
      }
      if (due && ball.owner && ball.owner.side !== due.side && ball.owner.r !== 'GK') {
        const th = T[due.side].filter(q => q.r !== 'GK').sort((a, b2) => dist(a, ball.owner) - dist(b2, ball.owner))[0]; setOwner(th);
      }
      const s = poss, line = lineOf(s), owner = ball.owner;
      runT -= dt;
      if (runT <= 0 && owner && owner.side === s && owner.r !== 'GK') {
        runT = 1 + rnd() * 1.6;
        const bx = tf(s, ball)[0];
        const c = T[s].filter(q => q !== owner && q.d > 0.45 && q.run <= 0 && line - tf(s, q)[0] < 14 && bx > 28);
        if (c.length) {
          const r = s === 0 && ME >= 0 && c.includes(T[0][ME]) && rnd() < 0.5 ? T[0][ME] : c[Math.floor(rnd() * c.length)], qy = tf(s, r)[1];
          r.run = 1.5; r.runX = Math.min(95, line + 8 + rnd() * 6); r.runY = cl(qy + (34 - qy) * 0.35 + gauss() * 4, 8, 60);
          if (dist(r, owner) < 45 && rnd() < 0.65) ball.hold = Math.min(ball.hold, 0.3 + rnd() * 0.25);
        }
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
        ball.x = p.x + (sp > 1 ? p.vx / sp : dir) * touch; ball.y = p.y + (sp > 1 ? p.vy / sp : 0) * touch + 0.3;
        // O bote: quem chega perto tenta tirar; se erra, fica para trás um instante (no gol do motor, ninguém tira)
        if (ball.rcv <= 0 && p.r !== 'GK' && !(due && due.side === p.side)) for (const d of T[1 - p.side]) {
          if (d.cd > 0 || d.stun > 0 || d.r === 'GK' || dist(d, p) > 1.7) continue;
          d.cd = 0.8;
          if (rnd() < cl(0.3 - (bias[p.side] - 1) * 0.8, 0.1, 0.55)) { setOwner(d); break; }
          d.stun = 0.45;
        }
        if (ball.owner === p && !ball.carry && ball.hold <= 0) decide(p);
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
      } else setOwner(T[poss][6]);
    }
    function startPlay() { mode = 'play'; const k = kicker(koSide); ball.x = 52.5; ball.y = 34; setOwner(k); lastPasser = k; lastPassClk = clk; fly(k, T[koSide][6].x, T[koSide][6].y, T[koSide][6], false, 'curto', false); }
    function step(dt) {
      clk += dt;
      if (mode === 'wait') { ALL.forEach(p => { [p.tx, p.ty] = koShape(p, p.side); }); ball.x = 52.5; ball.y = 34; }
      else if (mode === 'play') play(dt);
      else if (mode === 'ko' || mode === 'half') {
        ALL.forEach(p => { [p.tx, p.ty] = koShape(p, p.side); });
        modeT -= dt;
        if (mode === 'ko' && modeT <= 0 && (ALL.every(p => Math.hypot(p.tx - p.x, p.ty - p.y) < 1.5) || modeT < -4)) startPlay();
      } else if (mode === 'goal') {
        modeT -= dt;
        const s = hero.side, cx = s ? 5 : 100, cy = hero.y < 34 ? 5 : 63;
        hero.tx = cx; hero.ty = cy; hero.sprint = 1;
        T[s].forEach(p => { if (p !== hero && p.r !== 'GK' && p.d > 0.3) { p.tx = cx + (s ? 3 : -3) * (1 + (p.k % 3)); p.ty = cy + (cy < 34 ? 1 : -1) * (2 + (p.k % 4) * 1.6); } });
        T[1 - s].forEach(p => { [p.tx, p.ty] = koShape(p, p.side); });
        if (modeT <= 0) { mode = 'ko'; modeT = 0.6; }
      } else if (mode === 'tiro') {
        modeT -= dt; const s = poss, gk = T[s][0], [sx, sy] = toW(s, 5.5, 34);
        gk.tx = sx; gk.ty = sy;
        ball.x += (sx - ball.x) * Math.min(1, dt * 2.5); ball.y += (sy - ball.y) * Math.min(1, dt * 2.5);
        T[s].forEach(p => { if (p !== gk) { const [x, y] = shapeOf(p, true, 6, 34, lineOf(s)); [p.tx, p.ty] = toW(s, x, y); } });
        T[1 - s].forEach(p => { if (p.r !== 'GK') { const [x, y] = shapeOf(p, false, L - 6, 34, 0); [p.tx, p.ty] = toW(1 - s, x, y); } });
        if (modeT <= 0 || (due && due.side === s)) { mode = 'play'; ball.x = sx; ball.y = sy; setOwner(gk); }
      }
      if (mode === 'ko' || mode === 'half') { ball.x += (52.5 - ball.x) * Math.min(1, dt * 3); ball.y += (34 - ball.y) * Math.min(1, dt * 3); }
      // Andar: cada um reage no seu tempo, acelera e freia; ninguém vira na hora nem atravessa o companheiro
      ALL.forEach(p => {
        p.cd = Math.max(0, p.cd - dt); p.stun = Math.max(0, p.stun - dt); p.run = Math.max(0, p.run - dt); p.go = Math.max(0, p.go - dt);
        p.rt -= dt;
        if (p.sprint || p.rt <= 0 || mode !== 'play') {
          const dr = mode === 'play' && !p.sprint ? 0.5 : 0;
          p.gx = p.tx + Math.sin(clk * 0.7 + p.ph) * dr; p.gy = p.ty + Math.cos(clk * 0.55 + p.ph * 1.3) * dr;
          if (p.rt <= 0) p.rt = 0.15 + rnd() * 0.3;
        }
        let gx = p.gx, gy = p.gy;
        if (mode === 'play') for (const q of T[p.side]) { if (q === p) continue; const d = dist(p, q); if (d < 3 && d > 0.01) { gx += (p.x - q.x) / d * (3 - d) * 1.2; gy += (p.y - q.y) / d * (3 - d) * 1.2; } }
        const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy);
        const top = (p.stun > 0 ? 2.2 : p.drib ? 6.6 : p.sprint ? 8.2 : mode === 'play' ? (d > 12 ? 7.4 : d > 6 ? 6.2 : 5) : 5.6) * p.spd * (isMe(p) && en !== null && en < 30 ? 0.86 : 1);
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
    const X = x => PAD + x / L * (W - 2 * PAD), Y = y => PAD + y / WD * (H - 2 * PAD);
    function size() {
      if (!cv) return;
      const r = cv.getBoundingClientRect(), z = U.zk ? U.zk() : 1;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width / z); H = Math.max(1, r.height / z);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    function lines() {
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
      g.strokeRect(X(0), Y(0), X(L) - X(0), Y(WD) - Y(0));
      g.beginPath(); g.moveTo(X(52.5), Y(0)); g.lineTo(X(52.5), Y(WD)); g.stroke();
      g.beginPath(); g.ellipse(X(52.5), Y(34), X(9.15) - X(0), Y(9.15) - Y(0), 0, 0, Math.PI * 2); g.stroke();
      const bw = X(16.5) - X(0), sw = X(5.5) - X(0);
      g.strokeRect(X(0), Y(13.85), bw, Y(54.15) - Y(13.85)); g.strokeRect(X(L) - bw, Y(13.85), bw, Y(54.15) - Y(13.85));
      g.strokeRect(X(0), Y(24.85), sw, Y(43.15) - Y(24.85)); g.strokeRect(X(L) - sw, Y(24.85), sw, Y(43.15) - Y(24.85));
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(X(0) - 4, Y(GL), 4, Y(GR) - Y(GL)); g.fillRect(X(L), Y(GL), 4, Y(GR) - Y(GL));
    }
    function dot(p, k) {
      const x = X(p.x), y = Y(p.y), me = isMe(p), r = (me ? 9.5 : 6.2) * k;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 1, y + 2.5, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
      if (me) { g.fillStyle = 'rgba(242,194,48,.35)'; g.beginPath(); g.arc(x, y, r + 4.5 * k, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = p.stun > 0 ? 0.65 : 1;
      g.fillStyle = me ? '#F2C230' : p.side ? (p.r === 'GK' ? '#1D4C9E' : '#2A6FD6') : (p.r === 'GK' ? '#E8DFC4' : '#FBF8EF');
      g.strokeStyle = '#0F3D2A'; g.lineWidth = 2 * k;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      g.globalAlpha = 1;
      const a = Math.atan2(p.fy, p.fx);
      g.strokeStyle = me ? '#13201A' : p.side ? 'rgba(255,255,255,.85)' : 'rgba(19,32,26,.7)'; g.lineWidth = 1.6 * k;
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
    function draw() {
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      lines();
      const k = cl(W / 380, 0.85, 1.45);
      if (ball.fly) { g.strokeStyle = ball.fly.shot ? 'rgba(242,194,48,.8)' : 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 * k; g.setLineDash([4 * k, 4 * k]); g.beginPath(); g.moveTo(X(ball.fly.x0), Y(ball.fly.y0)); g.lineTo(X(ball.x), Y(ball.y)); g.stroke(); g.setLineDash([]); }
      ALL.forEach(p => { if (!isMe(p)) dot(p, k); });
      if (ME >= 0) dot(T[0][ME], k);
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
      minute(t, bx) { if (t - curT > 1) goals.forEach(e => { if (e.m < t) e.done = true; }); curT = t; bxT = bx; mClk = clk; },
      // Seu lance: a bola chega em você (passe do companheiro, ou você corta a jogada deles)
      lance() {
        if (ME < 0 || mode !== 'play') return;
        const me = T[0][ME];
        if (ball.owner === me) return;
        const from = ball.owner || (ball.fly && ball.fly.from) || T[poss][6];
        if (ball.owner || ball.loose) fly(from, me.x + 1, me.y, me, dist(from, me) > 30, 'curto', from.side !== 0);
        else if (ball.fly && !ball.fly.shot) { ball.fly.to = me; ball.fly.x1 = me.x + 1; ball.fly.y1 = me.y; ball.fly.cut = ball.fly.from.side !== 0; }
      },
      // Antes do apito todos parados na formação de saída; go() é o apito
      go() { if (mode === 'wait') { mode = 'ko'; modeT = 0.3; } },
      half() { mode = 'half'; koSide = 1; ball.owner = ball.fly = ball.loose = ball.carry = null; },
      second() { mode = 'ko'; modeT = 0.4; koSide = 1; },
      freeze(v) { frozen = !!v; },
      energy(v) { en = v === null || v === undefined ? null : cl(v, 0, 100); },
      meAt() { if (ME < 0) return null; const p = T[0][ME]; return [p.x / L * 100, p.y / WD * 100]; },
      ballAt() { return [ball.x / L * 100, ball.y / WD * 100]; },
      stop() { alive = false; if (raf) cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', onResize); },
      _step: step, _state: () => ({ mode, poss, ball, due, goals })
    };
    LP._sim = api;
    return api;
  };
})();
