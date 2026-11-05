// Peças da partida ao vivo vista de cima (Jogo a Jogo; o Treinador pode usar as mesmas): o campinho com os 22 jogadores
// e a bola, a faixa "quem manda no jogo" minuto a minuto, o mapa de onde você jogou e o zoom do seu lance.
// Só apresentação: as posições saem da bola (bx: 0 = sua área, 100 = a deles) e da formação; nada aqui muda o jogo.
(function () {
  const U = window.CRAQUE_UI;
  const LP = {};
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));

  // Formações em % do campo (x: sua área → área deles; y: lateral de cima → de baixo). Você ataca para a direita.
  // 0 goleiro, 1-4 defesa, 5-7 meio, 8-10 ataque (4-3-3); o adversário vem num 4-4-2 espelhado.
  const US = [[5, 50], [24, 16], [21, 39], [21, 61], [24, 84], [42, 27], [39, 50], [42, 73], [63, 17], [67, 50], [63, 83]];
  const THEM = [[95, 50], [77, 18], [79, 39], [79, 61], [77, 82], [60, 14], [62, 38], [62, 62], [60, 86], [45, 38], [45, 62]];
  const ME = { GOL: 0, ZAG: 2, MEI: 6, ATA: 9 };
  LP.meIndex = pos => (ME[pos] === undefined ? 9 : ME[pos]);

  // Altura da bola no campo (sobe e desce entre as laterais)
  LP.ballY = (t, b) => cl(50 + 34 * Math.sin(t * 0.37 + b * 0.05) * Math.cos(t * 0.11), 8, 92);

  // Onde está cada um no minuto t: o bloco anda com a bola, cada jogador balança um pouco; você vai na bola quando ela chega perto
  LP.spots = function (t, bx, meIdx, toMe) {
    const by = LP.ballY(t, bx), sh = (bx - 50) * 0.42;
    const wig = (k, s) => Math.sin(t * 0.6 + k * 1.7 + s) * 2.2;
    const us = US.map(([x, y], k) => [cl(x + (k ? sh : sh * 0.25) + wig(k, 0), 3, 97), cl(y + wig(k, 2) + (by - 50) * 0.12, 6, 94)]);
    const them = THEM.map(([x, y], k) => [cl(x + (k ? sh : sh * 0.25) + wig(k, 4), 3, 97), cl(y + wig(k, 5) + (by - 50) * 0.12, 6, 94)]);
    let ball = [bx, by];
    if (meIdx >= 0) {
      const me = us[meIdx];
      if (toMe) { ball = [cl(me[0] + 2.5, 3, 97), cl(me[1] + 3, 6, 94)]; }
      else if (Math.abs(bx - me[0]) < 22 && meIdx) { me[0] += (bx - me[0]) * 0.3; me[1] += (by - me[1]) * 0.3; }
    }
    return { us, them, ball };
  };

  // O campinho: linhas, faixa de ataque, bolinhas, você em dourado, a bola, o rastro e os avisos
  LP.pitch = function (o) {
    o = o || {};
    let dots = '';
    for (let k = 0; k < 11; k++) if (k !== o.me) dots += '<i class="lp-d us"></i>';
    for (let k = 0; k < 11; k++) dots += '<i class="lp-d th"></i>';
    return '<div class="lp-pitch" id="lp-pitch" aria-hidden="true"><s class="lp-l mid"></s><s class="lp-l ctr"></s><s class="lp-l ar l"></s><s class="lp-l ar r"></s>' +
      '<b class="lp-band" id="lp-band"></b>' +
      '<svg class="lp-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="lp-trail" points="" /></svg>' +
      '<div id="lp-dots">' + dots + '</div>' +
      (o.me >= 0 ? '<i class="lp-me" id="lp-me"><b>' + (o.num || 9) + '</b><small>Você</small></i>' : '') +
      '<i class="lp-ball" id="lp-ball"></i>' +
      '<span class="lp-tag lp-pos" id="lp-pos">Posse 50%</span><span class="lp-tag lp-zone" id="lp-zone"></span>' +
      '<div class="lp-ban" id="lp-ban" hidden></div></div>';
  };
  const trail = [];
  LP.place = function (sp, meIdx) {
    const box = document.getElementById('lp-dots'); if (!box) return;
    const ds = box.children; let j = 0;
    const put = (el, p) => { el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; };
    sp.us.forEach((p, k) => { if (k !== meIdx) put(ds[j++], p); });
    sp.them.forEach(p => put(ds[j++], p));
    const me = document.getElementById('lp-me');
    if (me && meIdx >= 0) {
      put(me, sp.us[meIdx]);
      trail.push(sp.us[meIdx].slice()); while (trail.length > 7) trail.shift();
      const tl = document.getElementById('lp-trail'); if (tl) tl.setAttribute('points', trail.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
    }
    put(document.getElementById('lp-ball'), sp.ball);
  };
  LP.resetTrail = () => { trail.length = 0; };
  // Faixa de ataque: a terça parte onde a bola está, verde (você ataca) ou vermelha (eles)
  LP.band = function (bx, txt) {
    const b = document.getElementById('lp-band'), z = document.getElementById('lp-zone');
    if (b) b.className = 'lp-band' + (bx >= 68 ? ' up' : bx <= 32 ? ' down' : '');
    if (z) { z.textContent = txt; z.className = 'lp-tag lp-zone' + (bx >= 68 ? ' up' : bx <= 32 ? ' down' : ''); }
  };
  // Aviso grande sobre o campo (gol), some sozinho
  let banT = 0;
  LP.banner = function (big, small, cls) {
    const el = document.getElementById('lp-ban'); if (!el) return;
    el.className = 'lp-ban ' + (cls || ''); el.innerHTML = '<b>' + big + '</b>' + (small ? '<small>' + small + '</small>' : ''); el.hidden = false;
    clearTimeout(banT); banT = setTimeout(() => { const e = document.getElementById('lp-ban'); if (e) e.hidden = true; }, 3200);
  };

  // Domínio minuto a minuto: a média da bola nos últimos minutos, de -50 (eles mandam) a +50 (você manda)
  LP.dom = function (bx) {
    const d = [];
    for (let t = 0; t < bx.length; t++) { let s = 0, n = 0; for (let k = Math.max(0, t - 5); k <= t; k++) { s += bx[k]; n++; } d.push(s / n - 50); }
    return d;
  };
  // A faixa até o minuto t (n: minutos da largura toda). stars: [{ m, big }] são os seus lances; mark: linha dourada
  LP.strip = function (dom, t, n, stars, mark) {
    const W = n, H = 40, mid = H / 2, k = (H / 2 - 2) / 30, upto = Math.min(t, dom.length - 1);
    let up = 'M0 ' + mid, dn = 'M0 ' + mid;
    for (let m = 0; m <= upto; m++) { const v = cl(dom[m], -30, 30) * k; up += ' L' + m + ' ' + (mid - Math.max(0, v)).toFixed(1); dn += ' L' + m + ' ' + (mid - Math.min(0, v)).toFixed(1); }
    up += ' L' + upto + ' ' + mid + ' Z'; dn += ' L' + upto + ' ' + mid + ' Z';
    const st = (stars || []).filter(s => s.m <= t).map(s => '<i class="lp-star' + (s.big ? ' big' : '') + (s.down ? ' down' : '') + '" style="left:' + (s.m / W * 100).toFixed(2) + '%"></i>').join('');
    return '<div class="lp-strip"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="0" y1="' + mid + '" x2="' + W + '" y2="' + mid + '" class="lp-ax" vector-effect="non-scaling-stroke"/>' +
      '<line x1="' + (W / 2) + '" y1="2" x2="' + (W / 2) + '" y2="' + (H - 2) + '" class="lp-ht" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + up + '" class="lp-up"/><path d="' + dn + '" class="lp-dn"/>' +
      (mark ? '<line x1="' + mark + '" y1="0" x2="' + mark + '" y2="' + H + '" class="lp-mk" vector-effect="non-scaling-stroke"/>' : '') +
      '</svg>' + (t < n ? '<i class="lp-now" style="left:' + (upto / W * 100).toFixed(2) + '%"></i>' : '') + st + '</div>';
  };
  // Quem manda agora, em palavras (os últimos 10 minutos)
  LP.who = function (dom, t, me, op) {
    let s = 0, n = 0; for (let k = Math.max(0, t - 10); k <= Math.min(t, dom.length - 1); k++) { s += dom[k]; n++; }
    const v = n ? s / n : 0;
    return v > 7 ? [me + ' pressiona', 'up'] : v < -7 ? [op + ' pressiona', 'down'] : ['Jogo equilibrado', ''];
  };

  // Mapa de onde você jogou: pontos [x, y] em %, viram manchas douradas numa grade de 8 × 5
  LP.heat = function (pts) {
    const G = {}, cw = 100 / 8, ch = 100 / 5;
    pts.forEach(([x, y]) => { const k = Math.min(7, Math.floor(x / cw)) + ',' + Math.min(4, Math.floor(y / ch)); G[k] = (G[k] || 0) + 1; });
    const top = Object.entries(G).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = top.length ? top[0][1] : 1;
    const blobs = top.map(([k, v]) => { const [i, j] = k.split(',').map(Number); const a = (0.3 + 0.6 * v / mx).toFixed(2);
      return '<i style="left:' + ((i + 0.5) * cw) + '%;top:' + ((j + 0.5) * ch) + '%;opacity:' + a + '"></i>'; }).join('');
    return '<div class="lp-heat" aria-hidden="true"><s class="lp-l mid"></s><s class="lp-l ar l"></s><s class="lp-l ar r"></s>' + blobs + '<span>Ataque →</span></div>';
  };

  // Zoom do seu lance: a jogada desenhada (o gol deles sempre à direita). st: tipo do minigame (S.kickSetupType); kick: m.kick
  // Coordenadas 0-100 × 0-60; tipos: me (você com ou sem bola), us (companheiro), th (adversário), gk (goleiro deles), ball
  const Z = {
    dois: { p: [['me', 40, 32, 1], ['us', 68, 50], ['th', 66, 22], ['gk', 93, 30]], a: [[40, 32, 66, 48, 'TOCAR', 1], [40, 32, 90, 27, 'BATER']] },
    cara: { p: [['me', 56, 30, 1], ['gk', 82, 30], ['th', 36, 40]], a: [[56, 30, 94, 24, 'BATER']] },
    pass: { p: [['me', 28, 34, 1], ['us', 70, 14], ['us', 74, 36], ['us', 66, 52], ['th', 72, 20], ['th', 64, 44], ['gk', 93, 30]], a: [[28, 34, 68, 15, 'PASSE', 1], [28, 34, 72, 36, '', 1], [28, 34, 64, 51, '', 1]] },
    cabeca: { p: [['us', 46, 6, 1], ['me', 80, 28], ['th', 83, 33], ['th', 76, 20], ['gk', 94, 30]], a: [[46, 6, 78, 26, 'CRUZAMENTO', 1], [80, 28, 95, 24, 'CABEÇA']] },
    mano: { p: [['me', 46, 38, 1], ['th', 62, 34], ['gk', 93, 30]], a: [[46, 38, 70, 44, 'DRIBLE', 1], [72, 44, 94, 30, '']] },
    fk: { p: [['me', 56, 30, 1], ['th', 72, 24], ['th', 72, 29], ['th', 72, 34], ['gk', 93, 30]], a: [[56, 30, 94, 22, 'CHUTE']] },
    pen: { p: [['me', 80, 30, 1], ['gk', 95, 30]], a: [[80, 30, 96, 24, 'CHUTE']] },
    save: { p: [['th', 80, 30, 1], ['meg', 95, 30]], a: [[80, 30, 96, 22, '?'], [80, 30, 96, 38, '?']] },
    saida: { p: [['th', 58, 26, 1], ['meg', 92, 30], ['us', 44, 40]], a: [[92, 30, 66, 27, 'SAIR', 1]] },
    tackle: { p: [['th', 52, 30, 1], ['me', 64, 40], ['us', 40, 48], ['gk', 94, 30]], a: [[52, 30, 82, 26, '', 1], [64, 40, 56, 32, 'DESARME']] }
  };
  LP.zoom = function (st, kick, label) {
    const key = st === 'dois' ? 'dois' : st === 'cara' ? 'cara' : st === 'pass' || st === 'passe3' ? 'pass' : st === 'cabeca' ? 'cabeca' : st === 'mano' ? 'mano'
      : st === 'save' ? 'save' : st === 'saida' ? 'saida' : st === 'tackle' || st === 'bote' || st === 'pressao' ? 'tackle' : kick === 'fk' ? 'fk' : 'pen';
    const z = Z[key];
    const ar = z.a.map(([x1, y1, x2, y2, txt, dash]) => '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" class="' + (dash ? 'ds' : 'sh') + '" marker-end="url(#lp-ah' + (dash ? 'w' : 'g') + ')"/>' +
      (txt ? '<text x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 2) + '" class="' + (dash ? 'ds' : 'sh') + '">' + txt + '</text>' : '')).join('');
    const ps = z.p.map(([k, x, y, ball]) => { const pos = 'left:' + x + '%;top:' + (y / 60 * 100).toFixed(1) + '%';
      return (k === 'me' || k === 'meg' ? '<i class="lp-zme" style="' + pos + '"><b>' + (k === 'meg' ? '1' : '') + '</b></i>' : '<i class="lp-zd ' + k + '" style="' + pos + '"></i>') +
        (ball ? '<i class="lp-zb" style="left:' + (x + 2.2) + '%;top:' + ((y + 3) / 60 * 100).toFixed(1) + '%"></i>' : ''); }).join('');
    return '<div class="lp-zoom" aria-hidden="true"><s class="lp-za"></s><s class="lp-zs"></s><s class="lp-zg"></s>' +
      '<svg viewBox="0 0 100 60"><defs><marker id="lp-ahw" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#FBF8EF"/></marker>' +
      '<marker id="lp-ahg" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#F2C230"/></marker></defs>' + ar + '</svg>' +
      ps + '<span class="lp-zt">' + label + '</span></div>';
  };

  U.LP = LP;
})();
