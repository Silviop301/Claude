// Lances com movimento livre (Jogo a Jogo): o campo visto de cima e, fixos embaixo da tela, o analógico (move você)
// e o botão de ação (chutar, passar, carrinho, pular). A direção do analógico mira a ação.
//  CRAQUE_LIVRE(el, { c, kind, onResult(ok, why), onDone(ok, why) })
//   kind 'mano'   (atacante): passe pelo zagueiro antes de a cobertura chegar e chute no canto
//        'passe3' (meia):     conduza e passe para o companheiro livre (a linha vermelha é cortada)
//        'bote'   (zagueiro): fique entre ele e o gol e dê o carrinho de frente
//        'saida'  (goleiro):  saia do gol para fechar o ângulo; ele bate no lado mais aberto
// A carta entra pela velocidade (K, S.livreK em engine/moments.js): atributo do lance perto de 50 dá 0,85; perto de 91, 1,2.
(function (root) {
  const W = 360, H = 480, GX = 180, GY = 20, POST = 38; // gol em cima: traves em GX±POST
  const sfx = n => { if (root.CRAQUE_SFX) root.CRAQUE_SFX.play(n); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const P = (x, y, num) => ({ x, y, num, hist: [] });
  function toward(p, t, v, dt) { const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy); if (d < 0.5) return; const s = Math.min(d, v * dt); p.x += dx / d * s; p.y += dy / d * s; }
  function segD(q, a, b) { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, k = clamp(((q.x - a.x) * dx + (q.y - a.y) * dy) / l, 0, 1); return Math.hypot(a.x + dx * k - q.x, a.y + dy * k - q.y); }
  const LABEL = { mano: ['Chutar', 'no canto'], passe3: ['Passar', 'pra quem aponta'], bote: ['Carrinho', 'bote'], saida: ['Pular', 'mergulho'] };
  const HELP = {
    mano: 'Passe pelo zagueiro e <b>chute</b>: a bola vai no canto para onde o analógico aponta',
    passe3: 'Aponte o analógico para o companheiro <b>livre</b> e passe',
    bote: 'Fique entre ele e o gol; <b>carrinho</b> de frente e perto',
    saida: 'Saia do gol para <b>fechar o ângulo</b>; pular mergulha para o lado',
  };

  root.CRAQUE_LIVRE = function (el, opts) {
    const c = opts.c, kind = opts.kind, K = root.CRAQUE_SIM.livreK(c, kind), KP = root.CRAQUE_KICK_PARTS;
    const kits = root.CRAQUE_CHARS ? root.CRAQUE_CHARS.kits(c, c && c.moment && c.moment.vs) : null;
    const MINE = kits ? [kits.mine.shirt, kits.mine.shorts] : ['#12824A', '#F4F1E8'], OPP = kits ? [kits.opp.shirt, kits.opp.shorts] : ['#D9534A', '#FFFFFF'];
    el.innerHTML = '<div class="kick-stage lv-stage"><canvas width="720" height="960" class="lv-cv" aria-label="Campo visto de cima"></canvas><div class="kick-banner"></div></div>' +
      '<p class="kick-help lv-help">' + HELP[kind] + (document.documentElement.classList.contains('desk') ? ' <small>(setas e espaço)</small>' : '') + '</p>' +
      '<div class="lv-pad"><div class="lv-stick" aria-label="Analógico"><div class="lv-knob"></div></div>' +
      '<button class="lv-act" type="button">' + LABEL[kind][0] + '<small>' + LABEL[kind][1] + '</small></button></div>';
    if (el.classList) el.classList.add('lv-host');
    const stage = el.querySelector('.lv-stage'), cv = el.querySelector('canvas'), g = cv.getContext('2d');
    g.scale(2, 2);
    const S = { t: 0, over: false, stick: { x: 0, y: 0 }, stun: 0 };
    const kp = P(GX, 34, 1), myNum = (root.CRAQUE_DATA && root.CRAQUE_DATA.POS_NUM[c.pos]) || 9;
    if (kind === 'mano') { S.me = P(GX, 420, myNum); S.foes = [P(GX + 10, 250, 4), P(30, 470, 3)]; S.kp = kp; S.own = S.me; S.limit = 8; }
    else if (kind === 'passe3') {
      S.me = P(GX, 410, myNum); S.kp = kp; S.own = S.me; S.limit = 7;
      S.mates = [P(80, 260, 7), P(GX, 250, 9), P(280, 260, 11)];
      S.foes = S.mates.map((m, i) => Object.assign(P(m.x + (i === 2 ? -14 : 14), m.y - 26, [3, 4, 2][i]), { mark: i, drift: 0 }));
      S.foes.push(Object.assign(P(GX + 110, 300, 8), { press: true }));
      S.mates.forEach((m, i) => { m.lane = [{ x: m.x, y: 120 }, { x: m.x + (i - 1) * 24 + (Math.random() * 40 - 20), y: 110 }][Math.random() < 0.5 ? 0 : 1]; });
    } else if (kind === 'bote') { S.me = P(GX, 190, myNum); S.atk = P(GX + (Math.random() * 120 - 60), 400, 9); S.kp = kp; S.own = S.atk; S.atkSide = Math.random() < 0.5 ? -1 : 1; }
    else { S.me = P(GX, 34, 1); S.atk = P(Math.random() < 0.5 ? 60 : 300, 330, 9); S.own = S.atk; S.shootY = 130 + Math.random() * 90; }
    S.ball = { x: S.own.x, y: S.own.y - 14, fly: null };
    const past = (p, lag) => { const h = p.hist; for (let i = h.length - 1; i >= 0; i--) if (S.t - h[i].t >= lag) return h[i]; return h[0] || p; };

    let doneT = null;
    function finish(ok, why, big) {
      if (S.over) return; S.over = true;
      if (opts.onResult) opts.onResult(ok, why);
      sfx(ok ? 'cheer' : 'miss');
      const b = el.querySelector('.kick-banner');
      b.textContent = big || (ok ? { mano: 'GOOOL!', passe3: 'ASSISTÊNCIA!', bote: 'ROUBOU!', saida: 'DEFENDEU!' }[kind] : { mano: 'PERDEU…', passe3: 'CORTADO…', bote: 'GOL DELES…', saida: 'GOL DELES…' }[kind]);
      b.className = 'kick-banner show ' + (ok ? 'ok' : 'ko');
      doneT = setTimeout(() => opts.onDone(ok, why), 1600);
    }
    const lose = (why, big) => finish(false, why, big);
    function shoot(from, tx, spread) {
      tx = clamp(tx + (Math.random() * 2 - 1) * spread, GX - POST - 14, GX + POST + 14);
      S.ball.fly = { x0: from.x, y0: from.y - 10, x1: tx, y1: GY - 4, t0: S.t, dur: Math.max(0.28, dist(from, { x: tx, y: GY }) / 430) };
      S.own = null; sfx('kick');
    }
    function pass(to) {
      const lead = { x: to.x + (to.lane ? (to.lane.x - to.x) * 0.25 : 0), y: to.y - 18 };
      S.ball.fly = { x0: S.ball.x, y0: S.ball.y, x1: lead.x, y1: lead.y, t0: S.t, dur: Math.max(0.25, dist(S.ball, lead) / 330), to };
      S.own = null; sfx('kick');
    }
    // Goleiro acompanha o ângulo; com a bola no ar, quem manda é o pulo
    function kpAngle(p) { if (!S.kp || S.ball.fly) return; toward(S.kp, { x: clamp(GX + (p.x - GX) * 0.18, GX - 22, GX + 22), y: 34 }, 90, 1 / 60); }
    // Canto do chute: para onde o analógico aponta; solto, longe do goleiro
    const aimX = () => (Math.abs(S.stick.x) > 0.3 ? GX + Math.sign(S.stick.x) * (POST - 7) : GX + (S.kp.x < GX ? 1 : -1) * (POST - 9));
    // Companheiro do passe: o mais alinhado com o analógico (solto: o mais à frente)
    function target() {
      const st = S.stick, sm = Math.hypot(st.x, st.y), d = sm > 0.3 ? { x: st.x / sm, y: st.y / sm } : { x: 0, y: -1 };
      let best = null;
      S.mates.forEach(m => { const vx = m.x - S.ball.x, vy = m.y - S.ball.y, l = Math.hypot(vx, vy) || 1, cs = (vx * d.x + vy * d.y) / l; if (!best || cs > best.c) best = { m, c: cs }; });
      return best && best.m;
    }

    function step(dt) {
      if (S.over) { if (S.ball.fly) flyBall(); return; }
      S.t += dt;
      [S.me].concat(S.foes || [], S.mates || [], S.atk ? [S.atk] : []).forEach(p => { p.hist.push({ t: S.t, x: p.x, y: p.y }); if (p.hist.length > 90) p.hist.shift(); });
      const vMe = (kind === 'saida' ? 150 : kind === 'bote' ? 118 : 112) * K, st = S.stick, sm = Math.min(1, Math.hypot(st.x, st.y));
      if (S.dash) { // carrinho ou mergulho: um impulso rápido na direção escolhida
        S.me.x += S.dash.x * S.dash.v * dt; S.me.y += S.dash.y * S.dash.v * dt; S.dash.t -= dt;
        if (kind === 'bote' && dist(S.me, S.atk) < 17) S.dash.t = 0; // chegou nele: o bote acontece ali
        if (S.dash.t <= 0) { const d = S.dash; S.dash = null; if (d.end) d.end(); }
      } else if (sm > 0.12 && !(kind === 'bote' && S.stun > 0) && !(kind === 'saida' && S.shot)) { S.me.x += st.x / Math.max(1, sm) * vMe * dt; S.me.y += st.y / Math.max(1, sm) * vMe * dt; }
      if (kind === 'saida') { S.me.x = clamp(S.me.x, GX - POST - 20, GX + POST + 20); S.me.y = clamp(S.me.y, 30, 110); }
      S.me.x = clamp(S.me.x, 14, W - 14); S.me.y = clamp(S.me.y, 30, H - 14);
      if (S.stun > 0) S.stun -= dt;

      if (kind === 'mano') {
        const [d, cov] = S.foes, me = S.me, see = past(me, 0.28 / K);
        // Zagueiro: fica entre você e o gol, um pouco à frente (reage atrasado: dá para enganar mudando de direção)
        const gd = Math.hypot(GX - see.x, GY - see.y) || 1;
        toward(d, { x: see.x + (GX - see.x) / gd * 22, y: see.y + (GY - see.y) / gd * 22 }, 88 / Math.sqrt(K), dt);
        if (S.t > 3) toward(cov, { x: me.x, y: me.y + 6 }, 95, dt); // a cobertura vem de trás
        kpAngle(me);
        if (S.own) { const h = past(me, 0.12), mx = me.x - h.x, my = me.y - h.y, ml = Math.hypot(mx, my); S.dir = ml > 1 ? { x: mx / ml, y: my / ml } : (S.dir || { x: 0, y: -1 }); S.ball.x = me.x + S.dir.x * 13; S.ball.y = me.y + S.dir.y * 13; }
        if (S.own && (dist(d, S.ball) < 13 || dist(cov, S.ball) < 13)) return lose('desarme');
        if (S.t > S.limit && S.own) return lose('tempo');
      } else if (kind === 'passe3') {
        const me = S.me, pr = S.foes[3];
        S.mates.forEach(m => toward(m, { x: lerp(m.x, m.lane.x, 0.04), y: m.lane.y }, 34, dt));
        S.foes.forEach(f => {
          if (f.press) { if (S.t > 1.2) toward(f, { x: me.x, y: me.y - 10 }, 55 / K, dt); return; }
          // Marcador: entre a bola e o companheiro, com atraso; às vezes se distrai e solta a marcação
          f.drift = Math.max(0, f.drift - dt); if (Math.random() < dt * 0.35 && S.t > 1) f.drift = 1.1 + Math.random() * 0.6;
          const m = S.mates[f.mark], pm = past(m, f.drift > 0 ? 0.9 : 0.22), bx = S.ball.x - pm.x, by = S.ball.y - pm.y, bl = Math.hypot(bx, by) || 1;
          toward(f, f.drift > 0 ? { x: pm.x - (f.mark - 1) * 40 - 20, y: pm.y - 30 } : { x: pm.x + bx / bl * 22, y: pm.y + by / bl * 22 }, 78 / K, dt);
        });
        kpAngle(me);
        if (S.own) { S.ball.x = me.x; S.ball.y = me.y - 14; if (dist(pr, S.ball) < 14) return lose('pressao'); }
        if (S.t > S.limit && S.own) return lose('impedido', 'IMPEDIDO!');
      } else if (kind === 'bote') {
        const a = S.atk, me = S.me, dm = dist(a, me), ahead = me.y < a.y;
        // Atacante: vai ao gol; com você no caminho, desvia e às vezes finge um lado e sai pelo outro
        let tx = GX + S.atkSide * 10, ty = GY;
        if (ahead && dm < 70) { const side = me.x > a.x ? -1 : 1; tx = a.x + side * 60; ty = a.y - 40; }
        if (ahead && dm < 42 && !S.feint && Math.random() < dt * 2.5) S.feint = { t: S.t, s: me.x > a.x ? 1 : -1 };
        if (S.feint && S.t - S.feint.t < 0.45) { tx = a.x + S.feint.s * 80; ty = a.y - 10; }
        if (S.feint && S.t - S.feint.t > 1.6) S.feint = null;
        if (!S.shot) { toward(a, { x: tx, y: ty }, 94 / Math.sqrt(K), dt); a.x = clamp(a.x, 20, W - 20); S.ball.x = a.x; S.ball.y = a.y - 14; }
        kpAngle(a);
        const lane = segD(me, a, { x: GX, y: GY }) > 16;
        if (!S.shot && (a.y < 130 || (a.y < 190 && lane && dm > 26))) { S.shot = 1; shoot(a, GX + (S.kp.x < GX ? 1 : -1) * (POST - 9), 6); } // no canto longe do goleiro
        if (S.t > 9 && !S.shot) return finish(true, 'recuou', 'AFASTADO!');
      } else {
        const a = S.atk, cut = a.y < S.shootY + 50 ? (a.x < GX ? 1 : -1) * 60 : 0; // perto da hora, corta para o meio
        if (!S.shot) { toward(a, { x: GX + (a.x < GX ? -30 : 30) + cut, y: S.shootY - 10 }, 85, dt); S.ball.x = a.x; S.ball.y = a.y - 14; }
        if (a.y <= S.shootY - (S.me.y < 46 ? 6 : 0) && !S.shot) { // goleiro parado na linha: ele chega mais perto antes de bater
          S.shot = 1;
          // Bate onde a bola passa mais longe do seu alcance (o ponto em que a linha do chute cruza a sua altura)
          const me = S.me; let best = null;
          for (let x = GX - POST + 6; x <= GX + POST - 6; x += 2) {
            const k = (a.y - me.y) / Math.max(1, a.y - GY), xk = a.x + (x - a.x) * k, tf = Math.hypot(xk - a.x, me.y - a.y) / 430;
            const m = Math.abs(xk - me.x) - 12 - 56 * Math.sqrt(K) * Math.max(0, tf - 0.08) + Math.random() * 6;
            if (!best || m > best.m) best = { x, m };
          }
          shoot(a, best.x, 3);
        }
      }
      if (S.ball.fly) flyBall();
    }
    function flyBall() {
      const f = S.ball.fly, k = Math.min(1, (S.t - f.t0) / f.dur);
      if (S.over && !f.end) S.t += 1 / 60;
      S.ball.x = lerp(f.x0, f.x1, k); S.ball.y = lerp(f.y0, f.y1, k);
      if (f.end) return;
      if (f.to) { // passe
        const cut = S.foes.find(o => dist(o, S.ball) < 13);
        if (cut) { f.end = 1; return lose('cortado'); }
        if (k >= 1) { f.end = 1; return finish(true, 'passe'); }
        return;
      }
      // Chute: o goleiro pula para onde a bola cruza a altura dele; quem estiver no caminho bloqueia
      const keeper = kind === 'saida' ? S.me : S.kp;
      if (f.xk === undefined) { const kk = (f.y0 - keeper.y) / Math.max(1, f.y0 - f.y1); f.xk = f.x0 + (f.x1 - f.x0) * clamp(kk, 0, 1); }
      if (S.t - f.t0 > (kind === 'saida' ? 0.08 : 0.12)) toward(keeper, { x: f.xk, y: keeper.y }, kind === 'saida' ? 56 * Math.sqrt(K) : kind === 'mano' ? 48 / Math.sqrt(K) : 40, 1 / 60);
      const block = S.t - f.t0 < 0.06 ? null : (S.foes || []).concat(kind === 'bote' ? [S.me] : []).find(o => dist(o, S.ball) < (kind === 'bote' ? 9 : 11));
      if (block && kind === 'mano') { f.end = 1; return lose('bloqueio', 'TRAVADO…'); }
      if (block && kind === 'bote') { f.end = 1; return finish(true, 'travou', 'TRAVOU!'); }
      if (dist(keeper, S.ball) < (kind === 'saida' ? 13 : 15)) { f.end = 1; return kind === 'saida' ? finish(true, 'defesa') : kind === 'bote' ? finish(true, 'goleiro', 'SALVOU!') : lose('defesa', 'DEFENDEU…'); }
      if (k >= 1) {
        f.end = 1;
        const inGoal = Math.abs(S.ball.x - GX) < POST;
        if (inGoal) { const n = el.querySelector('.lv-stage'); if (n) { n.classList.remove('lv-net'); void n.offsetWidth; n.classList.add('lv-net'); } sfx('goal'); }
        if (kind === 'mano') return inGoal ? finish(true, 'gol') : lose('fora', 'PRA FORA…');
        return inGoal ? lose('passou') : finish(true, 'fora', 'PRA FORA!');
      }
    }
    // Ação do botão; a direção vem do analógico (solto: a escolha natural)
    function act() {
      if (S.over || !armed) return;
      const st = S.stick, sm = Math.hypot(st.x, st.y), dir = sm > 0.3 ? { x: st.x / sm, y: st.y / sm } : null;
      if (kind === 'mano' && S.own) shoot(S.me, aimX(), Math.hypot(S.me.x - GX, S.me.y - GY) / (24 * K));
      else if (kind === 'passe3' && S.own) { const m = target(); if (m) pass(m); }
      else if (kind === 'bote' && S.stun <= 0 && !S.dash && !S.ball.fly) {
        const a = S.atk, dv = dir || (() => { const dx = a.x - S.me.x, dy = a.y - S.me.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; })();
        S.dash = { x: dv.x, y: dv.y, v: 230, t: 0.18, end: () => {
          if (S.over) return;
          const d = dist(S.me, a), front = S.me.y < a.y + 10;
          // Quanto mais perto e de frente, mais certo; no meio da finta dele, quase nunca
          const pr = clamp((0.95 - (d - 10) / 22) * Math.sqrt(K), 0.1, 0.9) * (S.feint && S.t - S.feint.t < 0.45 ? 0.3 : 1);
          if (d < 26 && front && Math.random() < pr) { S.own = null; S.ball.x = S.me.x; return finish(true, 'desarme'); }
          S.stun = 0.8; // errou o bote: você vai ao chão
        } };
      } else if (kind === 'saida' && !S.dash && !S.dived) { const dv = dir || { x: 0, y: 1 }; S.dived = 1; S.dash = { x: dv.x, y: dv.y, v: 210, t: 0.22 }; }
    }

    // ---------- desenho ----------
    function dot(p, kit, txt, me) {
      if (me) { g.strokeStyle = '#F2C230'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 18, 0, 7); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(p.x, p.y + 2, 12, 0, 7); g.fill();
      g.fillStyle = kit[0]; g.strokeStyle = kit[1]; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 12, 0, 7); g.fill(); g.stroke();
      g.fillStyle = kit[1]; g.font = '800 13px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText(txt, p.x, p.y + 4.5);
    }
    function draw() {
      g.fillStyle = '#1E6B3C'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1A6236'; for (let y = 0; y < H; y += 60) g.fillRect(0, y, W, 30);
      g.strokeStyle = 'rgba(240,248,240,.7)'; g.lineWidth = 2;
      g.strokeRect(10, GY, W - 20, H - GY - 10); g.strokeRect(80, GY, 200, 100); g.strokeRect(135, GY, 90, 34);
      g.beginPath(); g.arc(GX, 120, 40, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(GX - POST, 6, POST * 2, GY - 6);
      if (kind === 'passe3' && S.own) S.mates.forEach(m => { // linhas do passe: vermelha se um zagueiro está nela
        const open = !S.foes.some(o => segD(o, S.ball, m) < 14);
        g.strokeStyle = open ? 'rgba(242,194,48,.85)' : 'rgba(255,122,110,.35)'; g.setLineDash(open ? [8, 6] : [3, 6]); g.lineWidth = open ? 3 : 2;
        g.beginPath(); g.moveTo(S.ball.x, S.ball.y); g.lineTo(m.x, m.y); g.stroke(); g.setLineDash([]);
      });
      if (!S.over && kind === 'mano' && S.own) { const ax = aimX(); g.strokeStyle = 'rgba(242,194,48,.55)'; g.setLineDash([4, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(S.ball.x, S.ball.y); g.lineTo(ax, GY); g.stroke(); g.setLineDash([]); g.fillStyle = '#F2C230'; g.beginPath(); g.arc(ax, GY - 3, 4, 0, 7); g.fill(); }
      if (!S.over && kind === 'passe3' && S.own) { const m = target(); if (m) { g.strokeStyle = '#F2C230'; g.lineWidth = 3; g.beginPath(); g.arc(m.x, m.y, 19, 0, 7); g.stroke(); } }
      if (S.kp) dot(S.kp, ['#26282B', '#F2F2EC'], 1);
      (S.mates || []).forEach(m => dot(m, MINE, m.num));
      (S.foes || []).forEach(f => dot(f, OPP, f.num));
      if (S.atk) dot(S.atk, OPP, S.atk.num);
      dot(S.me, kind === 'saida' ? ['#F2C230', '#1B1B1B'] : MINE, S.me.num, true);
      if (kind === 'bote' && S.stun > 0) { g.fillStyle = '#FF7A6E'; g.font = '700 12px Barlow, sans-serif'; g.fillText('no chão…', S.me.x, S.me.y - 24); }
      if (kind !== 'bote' && kind !== 'saida' && S.limit && !S.over) { // o tempo que sobra
        const left = Math.max(0, S.limit - S.t) / S.limit; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(20, H - 8, W - 40, 4); g.fillStyle = left < 0.3 ? '#FF7A6E' : '#F2C230'; g.fillRect(20, H - 8, (W - 40) * left, 4);
      }
      g.fillStyle = '#fff'; g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.5; g.beginPath(); g.arc(S.ball.x, S.ball.y, 5, 0, 7); g.fill(); g.stroke();
    }

    // ---------- analógico fixo e botão ----------
    const stickEl = el.querySelector('.lv-stick'), knob = el.querySelector('.lv-knob'), actEl = el.querySelector('.lv-act');
    let sp = null, armed = false;
    setTimeout(() => { armed = true; }, 300);
    function stickAt(e) {
      const r = stickEl.getBoundingClientRect(), R = r.width / 2;
      let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      S.stick = { x, y }; knob.style.transform = 'translate(' + (x * R * 0.62) + 'px,' + (y * R * 0.62) + 'px)';
    }
    const stickOff = () => { sp = null; S.stick = { x: 0, y: 0 }; knob.style.transform = ''; };
    stickEl.addEventListener('pointerdown', e => { e.preventDefault(); sp = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch (x) {} stickAt(e); });
    stickEl.addEventListener('pointermove', e => { if (e.pointerId === sp) stickAt(e); });
    stickEl.addEventListener('pointerup', e => { if (e.pointerId === sp) stickOff(); });
    stickEl.addEventListener('pointercancel', stickOff);
    actEl.addEventListener('pointerdown', e => { e.preventDefault(); actEl.classList.add('on'); act(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => actEl.addEventListener(n, () => actEl.classList.remove('on')));
    // Teclado (computador): setas ou WASD movem, espaço faz a ação
    const keys = {};
    const keyStick = () => { if (sp !== null) return; S.stick = { x: (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), y: (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0) }; };
    const kd = e => { if (!el.isConnected) return off(); if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) act(); return; } if (/^Arrow|^[wasd]$/.test(e.key)) { e.preventDefault(); keys[e.key] = 1; keyStick(); } };
    const ku = e => { if (keys[e.key]) { keys[e.key] = 0; keyStick(); } };
    const off = () => { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);

    let last = performance.now();
    (function loop(now) {
      if (!cv.isConnected) { off(); clearTimeout(doneT); return; }
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      if (!(KP && KP.covered && KP.covered(stage))) step(dt); // janela por cima (treino, menu): o lance espera
      draw();
      requestAnimationFrame(loop);
    })(performance.now());
    sfx('whistle');
    // Para testes automáticos (craque_livre tools): estado e ação
    return { S, act, step };
  };
})(typeof window !== 'undefined' ? window : globalThis);
