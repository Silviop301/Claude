// Interface — Chama do técnico (2026-11-15, jeito Duolingo, Silvio aprovou): dias seguidos jogando o Treinador.
// - O dia conta quando você termina um jogo seu (ao vivo ou Só resultado; o do auxiliar, com o app fechado, não conta).
// - Desafio do dia: um por dia, igual para todo mundo (sorteio pela data), vale 3 moedas.
// - Protetor de chama: 10 moedas, guarda até 2; faltou um dia, ele é gasto sozinho e a chama não apaga.
// - Marcos de 3, 7, 14, 30, 50 e 100 dias pagam moedas (uma vez por chama) e abrem a festa.
// Tudo fica no inventário (U.ITEMS, `inv.ch`), que vai para a nuvem; a junção de aparelhos está em `merge` abaixo
// e é chamada por U.ITEMS.merge. As moedas usam `once` com a data, então dois aparelhos nunca pagam duas vezes.
(function () {
  const U = window.CRAQUE_UI;
  const { esc } = U;

  const FZ_COST = 10, FZ_MAX = 2, DC_COINS = 3;
  const MARCOS = [[3, 5], [7, 10], [14, 15], [30, 30], [50, 40], [100, 100]];
  const won = l => l.res === 'v';
  // Desafios que dá para cumprir em qualquer jogo do dia; o primeiro aparece mais vezes
  const DESAFIOS = [
    { id: 'v1', t: 'Vença um jogo', w: 3, add: l => (won(l) ? 1 : 0) },
    { id: 'sg', t: 'Vença sem levar gol', w: 2, add: l => (won(l) && l.ga === 0 ? 1 : 0) },
    { id: 'g3', t: 'Faça 3 gols hoje', n: 3, w: 2, add: l => l.gf || 0 },
    { id: 'g2', t: 'Faça 2 gols num jogo', w: 2, add: l => ((l.gf || 0) >= 2 ? 1 : 0) },
    { id: 'in2', t: 'Jogue 2 jogos sem perder', n: 2, w: 2, add: l => (l.res !== 'd' ? 1 : 0), cut: l => l.res === 'd' },
  ];

  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const shift = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const NOW = () => (U.chamaNow ? U.chamaNow() : new Date()); // as ferramentas de teste trocam o relógio

  // inv.ch = { d: {dia: jogos}, fb: {id: 1} protetores comprados, fu: {dia: 1} dias salvos por protetor, dc: {k, p, done} }
  const st = () => { const o = U.ITEMS.get(); o.ch = o.ch || {}; const c = o.ch; c.d = c.d || {}; c.fb = c.fb || {}; c.fu = c.fu || {}; return c; };
  const owned = c => Math.max(0, Object.keys(c.fb).length - Object.keys(c.fu).length);
  const counts = (c, k) => !!(c.d[k] || c.fu[k]);

  function desafio(now) {
    const k = dayKey(now || NOW()), tot = DESAFIOS.reduce((a, x) => a + x.w, 0);
    let r = hash('climbix-desafio-' + k) % tot;
    return DESAFIOS.find(x => (r -= x.w) < 0);
  }

  // Faltou dia(s) desde o último dia contado: gasta protetor se der para cobrir todos (a chama não apaga)
  function settle(now) {
    const c = st(), today = now || NOW();
    let d = shift(today, -1), gap = [];
    for (let i = 0; i < 400 && !counts(c, dayKey(d)); i++) { gap.push(dayKey(d)); d = shift(d, -1); }
    if (!gap.length || gap.length >= 400 || !counts(c, dayKey(d))) return 0;
    if (gap.length > owned(c)) return 0;
    gap.forEach(k => { c.fu[k] = 1; });
    U.ITEMS.put();
    return gap.length;
  }

  // Estado de hoje: n dias seguidos, se hoje já conta, começo da chama, protetores e o desafio
  function state(now) {
    const c = st(), today = now || NOW(), tk = dayKey(today), lit = !!c.d[tk];
    let d = lit ? today : shift(today, -1), n = 0, start = null;
    while (counts(c, dayKey(d))) { n++; start = dayKey(d); d = shift(d, -1); }
    const dc = desafio(today), prog = c.dc && c.dc.k === tk ? c.dc : { k: tk, p: 0 };
    const next = MARCOS.find(m => m[0] > n);
    return { n, lit, start, fz: owned(c), fzMax: FZ_MAX, dc, dp: prog.p || 0, dn: dc.n || 1, done: !!prog.done, next, late: today.getHours() >= 18 };
  }

  // Fim de um jogo do Treinador (profile.js coGame). Volta o que aconteceu para o aviso
  function game(log, aux) {
    if (aux || !log) return null;
    const now = NOW(), c = st(), tk = dayKey(now);
    settle(now);
    const first = !c.d[tk];
    c.d[tk] = (c.d[tk] || 0) + 1;
    Object.keys(c.d).sort().slice(0, -120).forEach(k => delete c.d[k]);
    Object.keys(c.fu).sort().slice(0, -120).forEach(k => delete c.fu[k]);
    // Desafio do dia
    const dc = desafio(now);
    if (!c.dc || c.dc.k !== tk) c.dc = { k: tk, p: 0 };
    let dcDone = false;
    if (!c.dc.done) {
      if (dc.cut && dc.cut(log)) c.dc.p = 0;
      else c.dc.p = Math.min(dc.n || 1, (c.dc.p || 0) + (+dc.add(log) || 0));
      if (c.dc.p >= (dc.n || 1)) { c.dc.done = true; dcDone = true; }
    }
    U.ITEMS.put();
    const s = state(now);
    let coins = 0;
    if (dcDone && U.COINS) coins += U.COINS.add({ n: DC_COINS, t: 'Desafio do dia', once: 'ch-dc-' + tk });
    const mk = first ? MARCOS.find(m => m[0] === s.n) : null;
    let marco = null;
    if (mk && U.COINS) { const got = U.COINS.add({ n: mk[1], t: 'Sequência de ' + mk[0] + ' dias', once: 'ch-m' + mk[0] + '-' + s.start }); if (got) marco = { n: mk[0], c: mk[1] }; }
    return { first, n: s.n, dcDone, dc, coins, marco, s };
  }

  function buy() {
    const c = st();
    if (owned(c) >= FZ_MAX || !U.COINS || !U.COINS.spend(FZ_COST, 'Protetor da sequência')) return false;
    c.fb['f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)] = 1;
    U.ITEMS.put();
    return true;
  }

  // Junção de dois aparelhos: união dos dias, dos protetores comprados e dos usados; o desafio do mesmo dia fica com o
  // que andou mais
  function merge(a, b) {
    if (!a || !b) return a || b || undefined;
    const u = k => Object.assign({}, a[k], b[k]);
    const d = u('d'); Object.keys(d).forEach(k => { d[k] = Math.max((a.d || {})[k] || 0, (b.d || {})[k] || 0); });
    let dc = a.dc || b.dc;
    if (a.dc && b.dc) dc = a.dc.k !== b.dc.k ? (a.dc.k > b.dc.k ? a.dc : b.dc) : { k: a.dc.k, p: Math.max(a.dc.p || 0, b.dc.p || 0), done: !!(a.dc.done || b.dc.done) };
    return { d, fb: u('fb'), fu: u('fu'), dc };
  }

  // ---------- desenho ----------
  // Bola da sequência (2026-11-19, no lugar do fogo; Silvio: "uma bola girando rápida, devagar e murcha"): desenhada num canvas
  // pequeno, em traço chapado creme e preto, girando de verdade (os 12 gomos pretos são os vértices de um icosaedro).
  // st: 'lit' gira rápido com pulinho (brilho dourado no CSS), 'risk' gira devagar, 'out' murcha (a mesma bola amolecida).
  const BALL = (st, sz, ign) => { kick(); return '<span class="ch-fl ch-bl' + (ign ? ' ign' : '') + '" data-st="' + st + '" style="--s:' + sz + 'px" aria-hidden="true"><canvas class="ch-bc" data-sz="' + sz + '"></canvas></span>'; };
  const PHI = (1 + Math.sqrt(5)) / 2, VS = [];
  [[0, 1, PHI], [1, PHI, 0], [PHI, 0, 1]].forEach(v => [1, -1].forEach(sa => [1, -1].forEach(sb => { const q = v.slice(); let n = 0; for (let i = 0; i < 3; i++) if (q[i]) q[i] *= n++ ? sb : sa; const l = Math.hypot(q[0], q[1], q[2]); VS.push(q.map(c => c / l)); })));
  const dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2], nrm = p => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; };
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const PENT = VS.map((v, i) => {
    const u = nrm(cross(v, Math.abs(v[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), w = cross(v, u);
    return VS.map((o, j) => j !== i && dot3(v, o) > .4 ? { j, a: Math.atan2(dot3(o, w), dot3(o, u)), p: nrm([v[0] * 2 + o[0], v[1] * 2 + o[1], v[2] * 2 + o[2]]) } : null).filter(Boolean).sort((p, q) => p.a - q.a);
  });
  const SEAM = []; PENT.forEach((pp, i) => pp.forEach(n => { if (n.j > i) SEAM.push([n.p, PENT[n.j].find(m => m.j === i).p]); }));
  const mixc = (p, q, u) => 'rgb(' + p.map((c, i) => Math.round(c + (q[i] - c) * u)).join(',') + ')';
  const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ballDraw(cv, t, dt) {
    const st = cv.parentNode.dataset.st, lit = st === 'lit', out = st === 'out';
    let f = cv._f;
    if (!f) {
      const sz = +cv.dataset.sz || 40, k = Math.min(3, window.devicePixelRatio || 1) * sz * 1.29 / 80;
      cv.width = cv.height = Math.round(80 * k);
      f = cv._f = { x: cv.getContext('2d'), k, ang: Math.random() * 6, om: cv.parentNode.classList.contains('ign') ? 16 : lit ? 6.2 : 1.5, ph: Math.random() * 9, d: out ? 1 : 0 };
    }
    const x = f.x; x.setTransform(f.k, 0, 0, f.k, 0, 0); x.clearRect(0, 0, 80, 80);
    const R = 29, cx = 40, G = 74;
    f.d += ((out ? 1 : 0) - f.d) * Math.min(1, dt * (out ? 2.5 : 7)); const d = f.d;
    f.om += ((lit ? 6.2 : out ? 0 : 1.5) - f.om) * Math.min(1, dt * 3); f.ang += f.om * dt * (1 - d);
    const hop = lit && dt ? Math.abs(Math.sin(t * 5.2)) * 2.6 * (1 - d) : 0, tilt = -.42 + (st === 'risk' ? .12 * Math.sin(t * .9 + f.ph) : 0);
    const br = d > .9 ? Math.max(0, Math.sin(t * 2.6)) * Math.max(0, Math.sin(t * .65)) * .03 : 0; // leve mexida da murcha
    const sx = 1 + .15 * d + br, sy = 1 - .36 * d - br, lift = hop + 4 * (1 - d), cy = G - R;
    const wx = px => cx + (px - cx) * sx, wy = py => G - lift - (G - py) * sy;
    // contorno: círculo que amolece (achata, alarga e afunda um pouco em cima)
    const shape = () => { x.beginPath(); for (let i = 0; i <= 48; i++) { const th = i / 48 * Math.PI * 2, px = cx + R * Math.cos(th), py = cy + R * Math.sin(th), X = wx(px); let Y = wy(py); if (py < cy) { const u = (px - cx - 3) / 13; Y += 8.5 * d * Math.exp(-u * u) * Math.min(1, (cy - py) / 12); } i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.closePath(); };
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang), ct = Math.cos(tilt), sn = Math.sin(tilt), INK = '#14160f';
    const rot = p => { const y = p[1] * ca - p[2] * sa, z = p[1] * sa + p[2] * ca; return [p[0] * ct - y * sn, p[0] * sn + y * ct, z]; };
    const pr = q => { let X, Y; if (q[2] >= 0) { X = cx + q[0] * R; Y = cy + q[1] * R; } else { const l = Math.hypot(q[0], q[1]) || 1; X = cx + q[0] / l * R; Y = cy + q[1] / l * R; } return [wx(X), wy(Y)]; };
    x.save(); shape(); x.clip();
    x.fillStyle = mixc([246, 222, 194], [200, 188, 172], d); x.fillRect(0, 0, 80, 80);
    x.strokeStyle = INK; x.lineWidth = 1.7; x.lineCap = x.lineJoin = 'round'; x.beginPath();
    SEAM.forEach(sg => { const a1 = rot(sg[0]), b1 = rot(sg[1]); if (a1[2] < 0 && b1[2] < 0) return; const m = pr(rot(nrm([sg[0][0] + sg[1][0], sg[0][1] + sg[1][1], sg[0][2] + sg[1][2]]))), p1 = pr(a1), p2 = pr(b1); x.moveTo(p1[0], p1[1]); x.quadraticCurveTo(m[0] * 2 - (p1[0] + p2[0]) / 2, m[1] * 2 - (p1[1] + p2[1]) / 2, p2[0], p2[1]); });
    x.stroke(); x.fillStyle = mixc([20, 22, 15], [40, 42, 38], d); x.lineWidth = .8;
    PENT.forEach((pp, i) => { if (rot(VS[i])[2] < -.25) return; x.beginPath(); pp.forEach((q, k) => { const p = pr(rot(q.p)); k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.fill(); x.stroke(); });
    x.fillStyle = 'rgba(20,22,15,.13)'; x.beginPath(); x.ellipse(wx(cx), wy(cy), R * sx, R * sy, 0, 0, 7); x.ellipse(wx(cx - 5), wy(cy - 6), (R - 1) * sx, (R - 1) * sy, 0, 0, 7); x.fill('evenodd');
    if (d > .02) { const gy = wy(cy - R) + 9 * d, g = x.createRadialGradient(cx + 3, gy, 1, cx + 3, gy, 15); g.addColorStop(0, 'rgba(20,22,15,' + (.34 * d) + ')'); g.addColorStop(1, 'rgba(20,22,15,0)'); x.fillStyle = g; x.fillRect(cx - 20, gy - 13, 46, 30); }
    x.restore();
    x.strokeStyle = INK; x.lineWidth = 1.9; shape(); x.stroke();
  }
  // um relógio só para todas as bolas na tela; para sozinho 2 s depois que a última some
  let run = 0, idle = 0, last = 0;
  function tick(ms) {
    const t = ms / 1000, dt = Math.min(.05, t - last || .016); last = t;
    const list = document.querySelectorAll('canvas.ch-bc'), st = still();
    let live = 0;
    list.forEach(cv => { if (st && cv._f) return; live++; try { ballDraw(cv, t, st ? 0 : dt); } catch (e) {} });
    if (live) idle = 0; else if (++idle > 120) { run = 0; return; }
    requestAnimationFrame(tick);
  }
  function kick() { if (run || typeof requestAnimationFrame === 'undefined' || typeof document === 'undefined') return; run = 1; idle = 0; requestAnimationFrame(tick); }
  const SHIELD = on => '<svg class="ch-sh' + (on ? ' on' : '') + '" width="24" height="28" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 2l9 3v8c0 6-4 10-9 13-5-3-9-7-9-13V5z"/></svg>';
  const dias = n => n + (n === 1 ? ' dia' : ' dias');
  const seg = n => (n === 1 ? '1º dia da sequência' : n + ' dias seguidos');
  let lastSt = null; // estado da bola na última vez que a home foi desenhada (para encher a bola quando o dia conta)

  // Cartão da home deitada (só para quem já tem carreira no Treinador)
  function homeCard() {
    settle();
    const s = state();
    const sub = s.lit ? (s.next ? 'Bola rolando · marco de ' + s.next[0] + ' dias em ' + (s.next[0] - s.n) : 'Bola rolando')
      : s.n ? (s.late ? 'Jogue uma rodada para não perder' : 'Jogue uma rodada hoje') : 'A bola murchou · jogue hoje';
    const bst = s.lit ? 'lit' : s.n ? 'risk' : 'out', ign = lastSt && lastSt !== 'lit' && bst === 'lit'; lastSt = bst;
    const sh = [0, 1].map(i => SHIELD(i < s.fz)).join('');
    const dcTxt = s.done ? '<b class="ch-dc-t">' + esc(s.dc.t) + '</b><span class="ch-ok">Feito</span>'
      : '<b class="ch-dc-t">' + esc(s.dc.t) + (s.dn > 1 ? ' <small>' + s.dp + '/' + s.dn + '</small>' : '') + '</b><span class="ch-pz">' + U.COINS.svg + DC_COINS + '</span>';
    return '<div class="ch-card' + (s.lit ? ' lit' : s.n && s.late ? ' risk' : '') + '">' +
      '<div class="ch-top">' + BALL(bst, 40, ign) + '<div class="ch-n"><b>' + dias(s.n) + '</b><span>' + sub + '</span></div>' +
      '<button class="ch-shs" id="ch-fz" aria-label="Protetores da sequência: ' + s.fz + ' de ' + FZ_MAX + '">' + sh + '</button></div>' +
      '<div class="ch-dc"><span class="ch-lb">Desafio do dia</span><div class="ch-dr">' + dcTxt + '</div></div></div>';
  }
  function homeBind(st0, back) {
    const b = st0.querySelector('#ch-fz'); if (!b) return;
    b.onclick = () => { U.sfx && U.sfx('tap'); fzInfo(back); };
  }
  function fzInfo(back) {
    const s = state(), full = s.fz >= FZ_MAX, saldo = U.COINS ? U.COINS.get() : 0;
    const msg = 'Se você faltar um dia, o protetor é gasto sozinho e a sequência não cai. Você tem ' + s.fz + ' de ' + FZ_MAX + '.';
    if (full || saldo < FZ_COST || !U.coinAsk) {
      const box = toastBox('<b>Protetor da sequência</b><span>' + msg + (full ? '' : saldo < FZ_COST ? ' Custa ' + FZ_COST + ' moedas.' : '') + '</span>');
      return box;
    }
    U.coinAsk(FZ_COST, 'Protetor da sequência', 'salva a sequência se faltar um dia (' + s.fz + ' de ' + FZ_MAX + ')', () => { if (buy() && back) back(); });
  }
  function toastBox(inner) {
    if (typeof document === 'undefined') return null;
    document.querySelectorAll('.pay-ty.ch-t').forEach(e => e.remove());
    const box = document.createElement('div'); box.className = 'pay-ty ch-t'; box.setAttribute('role', 'status');
    box.innerHTML = inner + '<button aria-label="Fechar">OK</button>';
    document.body.appendChild(box); box.querySelector('button').onclick = () => box.remove();
    let left = 6000; const iv = setInterval(() => { if (!box.isConnected) return clearInterval(iv); if (!document.querySelector('.tc-ov') && (left -= 250) <= 0) { clearInterval(iv); box.remove(); } }, 250);
    return box;
  }

  // Aviso depois do jogo: festa do marco (tela cheia), desafio cumprido (janelinha) ou só "chama acesa" (aviso pequeno).
  // Espera a festa da taça/acesso sair da tela
  function notify(r) {
    if (!r || typeof document === 'undefined' || (!r.first && !r.dcDone && !r.marco)) return;
    const go = () => {
      if (document.querySelector('.tc-ov, .sr-ov')) return setTimeout(go, 600);
      if (!r.marco && !r.dcDone) return toastBox('<b>' + BALL('lit', 18) + ' Bola rolando</b><span>' + seg(r.n) + (r.s.next ? ' · marco de ' + r.s.next[0] + ' em ' + (r.s.next[0] - r.n) : '') + '</span>');
      document.querySelectorAll('.ch-ov').forEach(e => e.remove());
      const ov = document.createElement('div');
      const ins = U.installCan && U.installCan() && r.n >= 2 ? '<p class="ch-ins">Instale o app para ter a sequência sempre à mão.</p>' : '';
      if (r.marco) {
        const nx = MARCOS.find(m => m[0] > r.marco.n);
        ov.className = 'ch-ov ch-big';
        ov.innerHTML = '<div class="ch-in">' + BALL('lit', 92) + '<b class="ch-bn">' + dias(r.marco.n) + '</b><span class="ch-bs">' + esc(marcoTxt(r.marco.n)) + '</span>' +
          '<span class="ch-amt">' + U.COINS.svg + '+' + (r.marco.c + (r.dcDone ? DC_COINS : 0)) + '</span>' + ins + '<button class="hl-btn gold ch-go">Continuar</button>' +
          (nx ? '<small class="ch-nx">Próximo marco: ' + nx[0] + ' dias</small>' : '') + '</div>';
      } else {
        ov.className = 'ch-ov';
        ov.innerHTML = '<div class="ch-pop"><span class="ch-k">Desafio cumprido</span><b class="ch-bt">' + esc(r.dc.t) + '</b><span class="ch-amt">' + U.COINS.svg + '+' + DC_COINS + '</span>' +
          '<span class="ch-fr">' + BALL('lit', 18) + seg(r.n) + '</span><p>Amanhã tem desafio novo.</p>' + ins + '<button class="hl-btn gold ch-go">Pegar</button></div>';
      }
      document.body.appendChild(ov);
      U.sfx && U.sfx('coin');
      ov.querySelector('.ch-go').onclick = () => { U.sfx && U.sfx('tap'); ov.remove(); };
    };
    setTimeout(go, 400);
  }
  const marcoTxt = n => ({ 3: 'Três dias seguidos no comando', 7: 'Uma semana sem faltar no vestiário', 14: 'Duas semanas de casa cheia', 30: 'Um mês inteiro à beira do campo', 50: 'Cinquenta dias de prancheta', 100: 'Cem dias. Isso é coisa de técnico de verdade' })[n] || dias(n) + ' seguidos';

  U.CHAMA = { state, game, settle, buy, merge, desafio, homeCard, homeBind, notify, DESAFIOS, MARCOS, FZ_COST, FZ_MAX, DC_COINS, dayKey };
})();
