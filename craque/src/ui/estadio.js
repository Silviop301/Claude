// Desenho do estádio do Treinador visto de cima (engine/coachest.js guarda os níveis e o público).
// U.EST.svg(cfg) devolve { svg, px, py, pw, ph, gap, box, k }: o <svg> e onde ficou o campo e cada setor, para a tela
// pôr os rótulos em volta.
// cfg = { w, h, k (escala), lv: { n, s, a, so } níveis 0 a 5 (n = gol da esquerda, s = gol da direita, a = arquibancada
//         em cima, so = social embaixo, do lado do túnel), occ: { n, s, a, so } lotação 0 a 1, cols: 3 cores da torcida,
//         luz, telao, cam (camarotes), gram (0 a 3), obra: setor em obra, prev: setor com a prévia da ampliação, sel, seed }
// U.EST.slice(...) desenha um setor de lado (a régua dos 5 níveis da tela Ampliar).
window.CRAQUE_UI.EST = (function () {
  const D0 = [0, 9, 20, 34, 34, 46];
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f = v => Math.round(v * 100) / 100;
  let uid = 0;

  // Torcida: pontos nas fileiras; enche do meio e de baixo para fora
  function crowd(seats, occ, cols, r, rad) {
    if (!seats.length) return '';
    const sc = seats.map(s => ({ s, v: s.w + r() * 0.42 })).sort((a, b) => a.v - b.v);
    const n = Math.round(seats.length * Math.max(0, Math.min(1, occ)));
    let out = '';
    sc.forEach((o, i) => {
      const on = i < n, q = r();
      const c = on ? (q < 0.5 ? cols[0] : q < 0.76 ? cols[1] : q < 0.9 ? cols[2] : '#F3F1EA') : '#454A52';
      out += '<circle cx="' + f(o.s.x) + '" cy="' + f(o.s.y) + '" r="' + (on ? rad : rad * 0.82) + '" fill="' + c + '"' + (on ? '' : ' opacity=".8"') + '/>';
    });
    return out;
  }

  // Um setor em coordenadas locais: x ao longo do campo (0..L), y para fora (0 = beira do campo)
  function stand(o) {
    const { L, lvl, k, r, cols } = o, d = D0[lvl] * k, id = o.id;
    if (!lvl) return { g: '', d: 0 };
    let g = '';
    if (lvl === 1) {
      g += '<rect x="0" y="' + f(1.5 * k) + '" width="' + L + '" height="' + f(d - 1.5 * k) + '" rx="3" fill="#274634"/>';
      g += '<line x1="0" y1="' + f(1.2 * k) + '" x2="' + L + '" y2="' + f(1.2 * k) + '" stroke="#F3F1EA" stroke-opacity=".75" stroke-width="1.2" stroke-dasharray="3 2.4"/>';
      const seats = []; const n = Math.round(L * d / 13);
      for (let i = 0; i < n; i++) { const x = 3 + r() * (L - 6), y = 3.6 * k + r() * (d - 5.4 * k); seats.push({ x, y, w: Math.abs(x - L / 2) / (L / 2) * 0.5 + (y / d) * 0.3 }); }
      g += crowd(seats, o.occ, cols, r, 1.45 * k);
      return { g, d };
    }
    const len = lvl === 2 ? L * 0.84 : L, x0 = (L - len) / 2;
    g += '<rect x="' + f(x0) + '" y="0" width="' + f(len) + '" height="' + f(d) + '" rx="' + (o.flat ? 0 : 3.5) + '" fill="#33373D"/>';
    g += '<rect x="' + f(x0) + '" y="0" width="' + f(len) + '" height="' + f(2.2 * k) + '" fill="#4A4F57"/>';
    const walks = lvl >= 5 ? [0.36, 0.68] : lvl >= 3 ? [0.46] : [];
    const step = 3.5 * k, seats = [];
    const isWalk = y => walks.some(wk => Math.abs(y - d * wk) < 2.4 * k);
    for (let y = 4 * k; y < d - 1.2 * k; y += step) {
      if (isWalk(y)) continue;
      for (let x = x0 + 3 * k; x < x0 + len - 2 * k; x += step) {
        const ax = (x - x0) % (38 * k);
        if (ax > 35.2 * k) continue; // corredor
        seats.push({ x: x + (r() - 0.5) * 0.5, y: y + (r() - 0.5) * 0.4, w: Math.abs(x - L / 2) / (L / 2) * 0.5 + (y / d) * 0.34 });
      }
    }
    walks.forEach(wk => { g += '<rect x="' + f(x0) + '" y="' + f(d * wk - 1.5 * k) + '" width="' + f(len) + '" height="' + f(3 * k) + '" fill="#17181B"/>'; });
    if (!o.empty) g += crowd(seats, o.occ, cols, r, 1.3 * k);
    else g += crowd(seats, 0, cols, r, 1.3 * k);
    if (o.cam && lvl >= 4) {   // camarotes: faixa de vidro com luz quente no meio do setor, cresce a cada nível
      const cm = Math.min(5, +o.cam || 1), cw = len * (0.16 + 0.12 * cm), cx = x0 + (len - cw) / 2, chh = (cm >= 4 ? 5.8 : 4.4) * k, cy = d * walks[0] - chh / 2;
      g += '<rect x="' + f(cx - 2.5 * k) + '" y="' + f(cy - 2.5 * k) + '" width="' + f(cw + 5 * k) + '" height="' + f(chh + 5 * k) + '" rx="' + f(3 * k) + '" fill="#FFC44D" fill-opacity="' + f(0.1 + 0.035 * cm) + '"/>';
      g += '<rect x="' + f(cx) + '" y="' + f(cy) + '" width="' + f(cw) + '" height="' + f(chh) + '" rx="1.5" fill="#F0BE55" stroke="#1B1C1F" stroke-width="' + f(0.7 * k) + '"/><rect x="' + f(cx + 0.6 * k) + '" y="' + f(cy + 0.6 * k) + '" width="' + f(cw - 1.2 * k) + '" height="' + f(chh * 0.42) + '" fill="#FFF3C8"/>';
      for (let x = cx + 6 * k; x < cx + cw - 2 * k; x += 6 * k) g += '<line x1="' + f(x) + '" y1="' + f(cy) + '" x2="' + f(x) + '" y2="' + f(cy + chh) + '" stroke="#1B1C1F" stroke-opacity=".55" stroke-width="' + f(0.7 * k) + '"/>';
      if (cm >= 4) g += '<line x1="' + f(cx) + '" y1="' + f(cy + chh / 2) + '" x2="' + f(cx + cw) + '" y2="' + f(cy + chh / 2) + '" stroke="#1B1C1F" stroke-opacity=".55" stroke-width="' + f(0.7 * k) + '"/>';
    }
    if (lvl >= 4) {
      const y1 = lvl === 5 ? d * 0.46 : d * 0.6, y2 = d + 3.5 * k;
      g += '<rect x="' + f(x0) + '" y="' + f(y1 - 5 * k) + '" width="' + f(len) + '" height="' + f(5 * k) + '" fill="url(#esh' + id + ')"/>';
      if (lvl === 5) g += '<rect x="' + f(x0 - (o.flat ? 0 : 2)) + '" y="' + f(y1) + '" width="' + f(len + (o.flat ? 0 : 4)) + '" height="' + f(d * 0.18) + '" fill="#C9D6DE" fill-opacity=".3"/>';
      const ys = lvl === 5 ? y1 + d * 0.18 : y1;
      g += '<rect x="' + f(x0 - (o.flat ? 0 : 2)) + '" y="' + f(ys) + '" width="' + f(len + (o.flat ? 0 : 4)) + '" height="' + f(y2 - ys) + '" rx="' + (o.flat ? 0 : 2.5) + '" fill="url(#erf' + id + ')"/>';
      for (let x = x0 + 10 * k; x < x0 + len - 4; x += 15 * k) g += '<line x1="' + f(x) + '" y1="' + f(y1) + '" x2="' + f(x) + '" y2="' + f(y2) + '" stroke="#fff" stroke-opacity=".13" stroke-width=".8"/>';
      g += '<line x1="' + f(x0) + '" y1="' + f(y1) + '" x2="' + f(x0 + len) + '" y2="' + f(y1) + '" stroke="#E8EDF0" stroke-opacity=".55" stroke-width="1"/>';
      g += '<line x1="' + f(x0) + '" y1="' + f(y2 - 0.6) + '" x2="' + f(x0 + len) + '" y2="' + f(y2 - 0.6) + '" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>';
    }
    return { g, d, x0, len };
  }

  // Canto fechado (só quando os dois setores vizinhos são nível 5): quarto de anel
  function corner(cx, cy, a0, r0, d, k, r, cols, occ, id) {
    const R = r0 + d, pt = (rad, a) => f(cx + rad * Math.cos(a)) + ' ' + f(cy + rad * Math.sin(a)), a1 = a0 + Math.PI / 2;
    const ring = (ri, ro) => 'M' + pt(ri, a0) + ' L' + pt(ro, a0) + ' A' + f(ro) + ' ' + f(ro) + ' 0 0 1 ' + pt(ro, a1) + ' L' + pt(ri, a1) + ' A' + f(ri) + ' ' + f(ri) + ' 0 0 0 ' + pt(ri, a0) + 'Z';
    let g = '<path d="' + ring(r0, R) + '" fill="#33373D"/>';
    const seats = [];
    for (let y = 4 * k; y < d - 1.2 * k; y += 3.5 * k) {
      if (Math.abs(y - d * 0.36) < 2.4 * k || Math.abs(y - d * 0.68) < 2.4 * k) continue;
      const rr = r0 + y, n = Math.floor((Math.PI / 2) * rr / (3.5 * k));
      for (let i = 1; i < n; i++) { const a = a0 + (i / n) * Math.PI / 2; seats.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a), w: 0.42 + (y / d) * 0.34 }); }
    }
    [0.36, 0.68].forEach(wk => { g += '<path d="' + ring(r0 + d * wk - 1.5 * k, r0 + d * wk + 1.5 * k) + '" fill="#17181B"/>'; });
    g += crowd(seats, occ, cols, r, 1.3 * k);
    g += '<path d="' + ring(r0 + d * 0.46, r0 + d * 0.64) + '" fill="#C9D6DE" fill-opacity=".3"/>';
    g += '<path d="' + ring(r0 + d * 0.64, R + 3.5 * k) + '" fill="#4C535C"/>';
    for (let i = 1; i < 5; i++) { const a = a0 + (i / 5) * Math.PI / 2; g += '<line x1="' + pt(r0 + d * 0.46, a).replace(' ', '" y1="') + '" x2="' + pt(R + 3.5 * k, a).replace(' ', '" y2="') + '" stroke="#fff" stroke-opacity=".13" stroke-width=".8"/>'; }
    g += '<path d="M' + pt(r0 + d * 0.46, a0) + ' A' + f(r0 + d * 0.46) + ' ' + f(r0 + d * 0.46) + ' 0 0 1 ' + pt(r0 + d * 0.46, a1) + '" fill="none" stroke="#E8EDF0" stroke-opacity=".55" stroke-width="1"/>';
    return g;
  }

  // Gramado por nível: 0 terra aparecendo, 1 verde gasto, 2 faixas, 3 faixas vivas, 4 faixas finas, 5 xadrez
  const GR = [['#5F7A3D', '#5A753A'], ['#2F7A44', '#2C7440'], ['#22834A', '#1C733F'], ['#24904F', '#1B7741'], ['#26994F', '#1A7A40'], ['#28A254', '#1A7C40']];
  function pitch(px, py, pw, ph, gram, k, seed, pad) {
    let g = '<rect x="' + (px - 7 * k) + '" y="' + (py - 7 * k) + '" width="' + (pw + 14 * k) + '" height="' + (ph + 14 * k) + '" rx="5" fill="#16402B"/>';
    gram = Math.max(0, Math.min(5, Math.round(gram)));
    const n = gram >= 4 ? 16 : 12, bw = pw / n, a = GR[gram][0], b = GR[gram][1];
    if (gram >= 5 && pad && pad !== 'xadrez') {   // nível 5: o técnico escolhe o corte (U.EST.pads)
      const cid = 'egp' + (++uid), cx = px + pw / 2, cy = py + ph / 2; let o = '';
      g += '<clipPath id="' + cid + '"><rect x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '"/></clipPath><rect x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" fill="' + b + '"/><g clip-path="url(#' + cid + ')">';
      if (pad === 'faixas') for (let i = 0; i < 10; i += 2) o += '<rect x="' + f(px + i * pw / 10) + '" y="' + py + '" width="' + f(pw / 10) + '" height="' + ph + '" fill="' + a + '"/>';
      else if (pad === 'diagonal') { const w = pw / 11; for (let i = -6; i < 12; i += 2) o += '<path d="M' + f(px + i * w) + ' ' + f(py + ph) + ' L' + f(px + i * w + ph) + ' ' + py + ' L' + f(px + (i + 1) * w + ph) + ' ' + py + ' L' + f(px + (i + 1) * w) + ' ' + f(py + ph) + 'Z" fill="' + a + '"/>'; }
      else if (pad === 'circulos') { const w = pw / 18; for (let i = 9; i >= 1; i--) o += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(i * w) + '" fill="' + (i % 2 ? a : b) + '"/>'; }
      else if (pad === 'losango') { const w = pw / 8, h = ph / 4; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) { const x = px + i * w, y = py + j * h; o += '<path d="M' + f(x) + ' ' + f(y - h / 2) + ' L' + f(x + w / 2) + ' ' + f(y) + ' L' + f(x) + ' ' + f(y + h / 2) + ' L' + f(x - w / 2) + ' ' + f(y) + 'Z" fill="' + a + '"/>'; } }
      else if (pad === 'cruzado') { for (let i = 0; i < 16; i += 2) o += '<rect x="' + f(px + i * pw / 16) + '" y="' + py + '" width="' + f(pw / 16) + '" height="' + ph + '" fill="' + a + '" fill-opacity=".6"/>'; for (let j = 0; j < 8; j += 2) o += '<rect x="' + px + '" y="' + f(py + j * ph / 8) + '" width="' + pw + '" height="' + f(ph / 8) + '" fill="' + a + '" fill-opacity=".6"/>'; }
      g += o + '</g>';
    } else if (gram >= 5) { const m = 8, bh = ph / m; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) g += '<rect x="' + f(px + i * bw) + '" y="' + f(py + j * bh) + '" width="' + f(bw + 0.3) + '" height="' + f(bh + 0.3) + '" fill="' + ((i + j) % 2 ? a : b) + '"/>'; }
    else for (let i = 0; i < n; i++) g += '<rect x="' + f(px + i * bw) + '" y="' + py + '" width="' + f(bw + 0.3) + '" height="' + ph + '" fill="' + (i % 2 ? a : b) + '"/>';
    if (gram <= 1) { // terra: as duas áreas e o meio; no castigado, manchas pelo campo todo
      const T = '#8C7647', op = gram ? 0.4 : 0.7, e = (cx, cy, rx, ry, o, rot) => '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + T + '" fill-opacity="' + f(o) + '"' + (rot ? ' transform="rotate(' + f(rot) + ' ' + f(cx) + ' ' + f(cy) + ')"' : '') + '/>';
      const sz = gram ? 0.7 : 1;
      g += e(px + pw * 0.055, py + ph / 2, pw * 0.05 * sz, ph * 0.17 * sz, op) + e(px + pw * 0.945, py + ph / 2, pw * 0.05 * sz, ph * 0.17 * sz, op) + e(px + pw / 2, py + ph / 2, pw * 0.07 * sz, ph * 0.1 * sz, op * 0.7);
      if (!gram) { const r = rng((seed || 7) + 911); for (let i = 0; i < 13; i++) { const cx = px + pw * (0.08 + r() * 0.84), cy = py + ph * (0.1 + r() * 0.8), rx = (4 + r() * 9) * k; g += e(cx, cy, rx, rx * (0.4 + r() * 0.4), 0.3 + r() * 0.35, r() * 180); } }
    }
    const st = ' fill="none" stroke="#F3F1EA" stroke-opacity=".82" stroke-width="' + f(1.15 * k) + '"';
    const ax = pw * 0.157, ay = ph * 0.593, gx = pw * 0.052, gy = ph * 0.27, cr = ph * 0.134;
    g += '<rect x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '"' + st + '/>';
    g += '<line x1="' + (px + pw / 2) + '" y1="' + py + '" x2="' + (px + pw / 2) + '" y2="' + (py + ph) + '"' + st + '/>';
    g += '<circle cx="' + (px + pw / 2) + '" cy="' + (py + ph / 2) + '" r="' + f(cr) + '"' + st + '/><circle cx="' + (px + pw / 2) + '" cy="' + (py + ph / 2) + '" r="' + f(1.4 * k) + '" fill="#F3F1EA"/>';
    [0, 1].forEach(s => {
      const x = s ? px + pw - ax : px, gx0 = s ? px + pw - gx : px;
      g += '<rect x="' + f(x) + '" y="' + f(py + (ph - ay) / 2) + '" width="' + f(ax) + '" height="' + f(ay) + '"' + st + '/>';
      g += '<rect x="' + f(gx0) + '" y="' + f(py + (ph - gy) / 2) + '" width="' + f(gx) + '" height="' + f(gy) + '"' + st + '/>';
      const pxp = s ? px + pw - pw * 0.105 : px + pw * 0.105, ex = s ? px + pw - ax : px + ax, dy = Math.sqrt(Math.max(0, cr * cr - Math.pow(ex - pxp, 2)));
      g += '<path d="M' + f(ex) + ' ' + f(py + ph / 2 - dy) + ' A' + f(cr) + ' ' + f(cr) + ' 0 0 ' + (s ? 0 : 1) + ' ' + f(ex) + ' ' + f(py + ph / 2 + dy) + '"' + st + '/>';
      g += '<circle cx="' + f(pxp) + '" cy="' + (py + ph / 2) + '" r="' + f(1.2 * k) + '" fill="#F3F1EA"/>';
      const gw = 4.5 * k, gh = ph * 0.108;
      g += '<rect x="' + f(s ? px + pw : px - gw) + '" y="' + f(py + ph / 2 - gh / 2) + '" width="' + f(gw) + '" height="' + f(gh) + '" fill="#F3F1EA" fill-opacity=".16" stroke="#F3F1EA" stroke-width="' + f(1 * k) + '"/>';
    });
    return g;
  }

  function svg(c) {
    const k = c.k || 1, W = c.w, H = c.h, pw = (c.pw || 270) * k, ph = (c.ph || 140) * k, gap = 9 * k;
    const px = (W - pw) / 2 + (c.dx || 0), py = (H - ph) / 2 + (c.dy || 0), r = rng(c.seed || 7), id = ++uid;
    const cols = c.cols || ['#E0203A', '#9C1228', '#F2C230'], lv = Object.assign({}, c.lv), occ = c.occ || {};
    let s = '<svg class="est-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    s += '<defs><linearGradient id="erf' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#454C55"/><stop offset="1" stop-color="#5E6670"/></linearGradient>' +
      '<linearGradient id="esh' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>' +
      '<pattern id="eht' + id + '" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#1B1C1F"/><rect width="4.5" height="9" fill="#F2C230" fill-opacity=".85"/></pattern>' +
      '<radialGradient id="elz' + id + '"><stop offset="0" stop-color="#FFF7DC" stop-opacity=".5"/><stop offset=".4" stop-color="#FFF7DC" stop-opacity=".14"/><stop offset="1" stop-color="#FFF7DC" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="evg' + id + '" r=".75"><stop offset=".45" stop-color="#04120A" stop-opacity="0"/><stop offset="1" stop-color="#04120A" stop-opacity=".5"/></radialGradient></defs>';
    const LZ = c.luz === true ? 2 : Math.max(0, Math.min(5, +c.luz || 0)), BAR = Math.max(0, Math.min(5, +c.bar || 0));
    s += pitch(px, py, pw, ph, c.gram === undefined ? 1 : c.gram, k, c.seed, c.pad);
    if (LZ) s += '<g style="mix-blend-mode:screen">' + [[0.2, 0.22], [0.8, 0.22], [0.2, 0.78], [0.8, 0.78]].map(q => '<ellipse cx="' + f(px + pw * q[0]) + '" cy="' + f(py + ph * q[1]) + '" rx="' + f(pw * 0.3) + '" ry="' + f(ph * 0.42) + '" fill="url(#elz' + id + ')" opacity="' + [0, 0.14, 0.3, 0.42, 0.62, 0.8][LZ] + '"/>').join('') + '</g>';
    if (LZ >= 4) {   // jogo à noite: as traves fazem sombra para os dois lados e as bordas do campo escurecem
      const gh = ph * 0.108, sl = (LZ >= 5 ? 13 : 10) * k, so = LZ >= 5 ? 0.3 : 0.22;
      s += '<rect x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" fill="url(#evg' + id + ')"/>';
      [0, 1].forEach(sd => { const x = sd ? px + pw : px, dx = sd ? -sl : sl, y1 = py + ph / 2 - gh / 2, y2 = py + ph / 2 + gh / 2;
        s += '<path d="M' + f(x) + ' ' + f(y1) + ' L' + f(x + dx) + ' ' + f(y1 + sl * 0.55) + ' L' + f(x + dx) + ' ' + f(y2 + sl * 0.55) + ' L' + f(x) + ' ' + f(y2) + 'Z" fill="#06140C" fill-opacity="' + so + '"/><path d="M' + f(x) + ' ' + f(y1) + ' L' + f(x + dx) + ' ' + f(y1 - sl * 0.55) + ' L' + f(x + dx) + ' ' + f(y2 - sl * 0.55) + ' L' + f(x) + ' ' + f(y2) + 'Z" fill="#06140C" fill-opacity="' + so + '"/>'; });
    }
    // bancos e túnel (lado da Social, embaixo)
    s += '<rect x="' + f(px + pw * 0.34) + '" y="' + f(py + ph + 2.4 * k) + '" width="' + f(pw * 0.1) + '" height="' + f(3.4 * k) + '" rx="1.2" fill="#DDE3E6" fill-opacity=".8"/><rect x="' + f(px + pw * 0.56) + '" y="' + f(py + ph + 2.4 * k) + '" width="' + f(pw * 0.1) + '" height="' + f(3.4 * k) + '" rx="1.2" fill="#DDE3E6" fill-opacity=".8"/>';
    const T = {
      so: { L: pw, m: 'matrix(1,0,0,1,' + f(px) + ',' + f(py + ph + gap) + ')' },
      a: { L: pw, m: 'matrix(1,0,0,-1,' + f(px) + ',' + f(py - gap) + ')' },
      n: { L: ph, m: 'matrix(0,1,-1,0,' + f(px - gap) + ',' + f(py) + ')' },
      s: { L: ph, m: 'matrix(0,1,1,0,' + f(px + pw + gap) + ',' + f(py) + ')' },
    };
    const all5 = (a, b) => lv[a] === 5 && lv[b] === 5 && c.obra !== a && c.obra !== b;
    const box = {};
    ['a', 'so', 'n', 's'].forEach(key => {
      const t = T[key]; let lvl = lv[key] || 0; const work = c.obra === key, prev = c.prev === key;
      const flat = lvl === 5 && !work;
      let g = '';
      if (work) {
        const nx = Math.min(5, lvl + 1), d = D0[nx] * k, len = nx === 2 ? t.L * 0.84 : t.L, x0 = (t.L - len) / 2;
        g += '<rect x="' + f(x0) + '" y="0" width="' + f(len) + '" height="' + f(d) + '" rx="3.5" fill="url(#eht' + id + ')" opacity=".5"/><rect x="' + f(x0) + '" y="0" width="' + f(len) + '" height="' + f(d) + '" rx="3.5" fill="none" stroke="#F2C230" stroke-width="1.2"/>';
        g += '<rect x="' + f(x0 + len * 0.1) + '" y="' + f(d * 0.18) + '" width="' + f(len * 0.5) + '" height="' + f(d * 0.5) + '" rx="2" fill="#2A2D32"/>';
        g += '<line x1="' + f(x0 + len * 0.78) + '" y1="' + f(d * 0.5) + '" x2="' + f(x0 + len * 0.3) + '" y2="' + f(d * 0.5) + '" stroke="#F8F4EA" stroke-width="1.6"/><circle cx="' + f(x0 + len * 0.78) + '" cy="' + f(d * 0.5) + '" r="3.2" fill="#F2C230" stroke="#1B1C1F" stroke-width="1"/>';
        box[key] = { d, x0, len };
      } else {
        const o = stand({ L: t.L, lvl, k, r, cols, occ: occ[key] === undefined ? 0.8 : occ[key], id, cam: key === 'so' && c.cam, flat });
        g += o.g; box[key] = o;
        if (prev) {
          const nx = Math.min(5, lvl + 1), d = D0[nx] * k + (nx >= 4 ? 3.5 * k : 0), len = nx === 2 ? t.L * 0.84 : t.L, x0 = (t.L - len) / 2;
          g += '<rect x="' + f(x0 - 2) + '" y="-2" width="' + f(len + 4) + '" height="' + f(d + 4) + '" rx="5" fill="#F2C230" fill-opacity=".16" stroke="#F2C230" stroke-width="1.8" stroke-dasharray="6 4"/>';
          box[key] = { d, x0, len };
        }
      }
      if (c.sel === key && !prev) { const b = box[key], dd = (b.d || 9 * k) + (lvl >= 4 ? 3.5 * k : 0); g += '<rect x="' + f((b.x0 || 0) - 3) + '" y="-3" width="' + f((b.len || t.L) + 6) + '" height="' + f(dd + 6) + '" rx="6" fill="none" stroke="#F8F4EA" stroke-width="1.6"/>'; }
      s += '<g transform="' + t.m + '">' + g + '</g>';
    });
    const d5 = D0[5] * k;
    if (all5('a', 'n')) s += corner(px, py, Math.PI, gap, d5, k, r, cols, Math.min(occ.a, occ.n), id);
    if (all5('a', 's')) s += corner(px + pw, py, -Math.PI / 2, gap, d5, k, r, cols, Math.min(occ.a, occ.s), id);
    if (all5('so', 's')) s += corner(px + pw, py + ph, 0, gap, d5, k, r, cols, Math.min(occ.so, occ.s), id);
    if (all5('so', 'n')) s += corner(px, py + ph, Math.PI / 2, gap, d5, k, r, cols, Math.min(occ.so, occ.n), id);
    // túnel
    if (lv.so >= 2) s += '<rect x="' + f(px + pw / 2 - 4 * k) + '" y="' + f(py + ph + gap - 1) + '" width="' + f(8 * k) + '" height="' + f(7 * k) + '" rx="1.5" fill="#0B0C0D"/>';
    // telão atrás do gol da direita
    if (c.telao) { const d = (box.s.d || 9 * k) + (lv.s >= 4 ? 3.5 * k : 0), x = px + pw + gap + d + 3 * k; s += '<rect x="' + f(x) + '" y="' + f(py + ph / 2 - 17 * k) + '" width="' + f(5 * k) + '" height="' + f(34 * k) + '" rx="1.5" fill="#0B0C0D" stroke="#F2C230" stroke-width="1"/><rect x="' + f(x + 1.3 * k) + '" y="' + f(py + ph / 2 - 14 * k) + '" width="' + f(2.2 * k) + '" height="' + f(28 * k) + '" fill="#7FD6FF" fill-opacity=".75"/>'; }
    // refletores nos 4 cantos: poste simples, torre, torre com 4 lâmpadas, e nos níveis altos o facho até o campo
    const closed = { nw: all5('a', 'n'), ne: all5('a', 's'), se: all5('so', 's'), sw: all5('so', 'n') };
    const off = (Math.max(D0[Math.max(lv.a, lv.n, lv.s, lv.so, 3)] * k) + gap) * 0.86;
    if (LZ) {   // torre de verdade: base no canto, mastro (treliça do nível 3 em diante) e o painel de lâmpadas virado para o campo
      const hz = [0, 8, 13, 17, 23, 29][LZ] * k, Lp = [0, 6, 8, 10, 11, 12][LZ] * k, rows = [0, 1, 2, 3, 3, 4][LZ], cl = [0, 2, 3, 4, 5, 6][LZ], ce = 2.3 * k, dp = rows * ce + 1.2 * k, wd = cl * ce + 1.2 * k;
      [[px - off, py - off, 0.3, 0.3], [px + pw + off, py - off, 0.7, 0.3], [px - off, py + ph + off, 0.3, 0.7], [px + pw + off, py + ph + off, 0.7, 0.7]].forEach((q, i) => {
        const x = q[0], y = q[1], ux = (x < px ? -1 : 1) * Math.SQRT1_2, uy = (y < py ? -1 : 1) * Math.SQRT1_2, hx = x + ux * (Lp + dp / 2), hy = y + uy * (Lp + dp / 2);
        if (LZ >= 4) { const tx = px + pw * q[2], ty = py + ph * q[3], nx = -(ty - hy), ny = tx - hx, nl = Math.sqrt(nx * nx + ny * ny), w = pw * 0.14;
          s += '<linearGradient id="ebm' + id + i + '" gradientUnits="userSpaceOnUse" x1="' + f(hx) + '" y1="' + f(hy) + '" x2="' + f(tx) + '" y2="' + f(ty) + '"><stop offset="0" stop-color="#FFF7DC" stop-opacity="' + (LZ >= 5 ? 0.34 : 0.24) + '"/><stop offset="1" stop-color="#FFF7DC" stop-opacity="0"/></linearGradient>' +
            '<path d="M' + f(hx) + ' ' + f(hy) + ' L' + f(tx + nx / nl * w) + ' ' + f(ty + ny / nl * w) + ' L' + f(tx - nx / nl * w) + ' ' + f(ty - ny / nl * w) + 'Z" fill="url(#ebm' + id + i + ')" style="mix-blend-mode:screen"/>'; }
        s += '<circle cx="' + f(hx) + '" cy="' + f(hy) + '" r="' + f(hz) + '" fill="url(#elz' + id + ')"/>';
        let t = '';
        if (LZ >= 3) { const hw = 1.5 * k, n = Math.round(Lp / (2.4 * k)); let zz = 'M0 ' + f(-hw);
          for (let a = 1; a <= n; a++) zz += ' L' + f(Lp * a / n) + ' ' + f(a % 2 ? hw : -hw);
          t += '<rect x="0" y="' + f(-hw - 0.5 * k) + '" width="' + f(Lp) + '" height="' + f(2 * hw + k) + '" fill="#101113"/><path d="M0 ' + f(-hw) + ' L' + f(Lp) + ' ' + f(-hw) + ' M0 ' + f(hw) + ' L' + f(Lp) + ' ' + f(hw) + ' ' + zz + '" fill="none" stroke="#9AA2AB" stroke-width="' + f(0.7 * k) + '"/>'; }
        else t += '<line x1="0" y1="0" x2="' + f(Lp) + '" y2="0" stroke="#101113" stroke-width="' + f(2.4 * k) + '"/><line x1="0" y1="0" x2="' + f(Lp) + '" y2="0" stroke="#9AA2AB" stroke-width="' + f(1.1 * k) + '"/>';
        t += '<circle cx="0" cy="0" r="' + f((LZ >= 3 ? 2.6 : 1.9) * k) + '" fill="#2A2D32" stroke="#9AA2AB" stroke-width="' + f(0.7 * k) + '"/>';
        t += '<rect x="' + f(Lp) + '" y="' + f(-wd / 2) + '" width="' + f(dp) + '" height="' + f(wd) + '" rx="' + f(0.9 * k) + '" fill="#17181B" stroke="#9AA2AB" stroke-width="' + f(0.8 * k) + '"/>';
        for (let a = 0; a < rows; a++) for (let b = 0; b < cl; b++) t += '<circle cx="' + f(Lp + 0.6 * k + ce * (a + 0.5)) + '" cy="' + f(-wd / 2 + 0.6 * k + ce * (b + 0.5)) + '" r="' + f(0.82 * k) + '" fill="#FFF7DC"/>';
        s += '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(Math.atan2(uy, ux) * 180 / Math.PI) + ')">' + t + '</g>';
      });
    }
    // bares: uma pracinha de cada lado do rótulo da Arquibancada (c.barGap = meia largura do rótulo): barraca de toldo,
    // churrasqueira com fumaça, mesas de guarda-sol, trailer, varal de luzes; do nível 4 em diante também atrás da Social, e
    // no 5 a loja do clube. Tudo em coordenadas locais: u para fora a partir do rótulo, v para longe do setor
    if (BAR) {
      const rb = rng((c.seed || 7) + 4242), g0 = c.barGap === undefined ? 34 * k : c.barGap, INK = '#13201A', CR = '#F8F4EA', c0 = cols[0] === '#8E949C' ? '#F2C230' : cols[0], c2 = cols[2] === CR ? '#F2C230' : cols[2];
      const back = key => (box[key].d || 9 * k) + ((c.obra === key ? Math.min(5, lv[key] + 1) : lv[key]) >= 4 ? 3.5 * k : 0);
      const R = (x, y, w, h, rx, fill, ex) => '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(rx) + '" fill="' + fill + '"' + (ex || '') + '/>';
      const C = (x, y, r, fill, ex) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' + (ex || '') + '/>';
      const OUT = ' stroke="' + INK + '" stroke-width="' + f(0.9 * k) + '"', SH = ' fill-opacity=".38"';
      const BK = 1.3;
      const zone = (sx, sy, key, it, k) => {   // sx: -1 esquerda, 1 direita; sy: -1 em cima (Arquibancada), 1 embaixo (Social)
        const k0 = k / BK, ox = px + pw / 2 + sx * g0, oy = sy < 0 ? py - gap - back(key) - 2 * k0 : py + ph + gap + back(key) + 2 * k0, OUT = ' stroke="' + INK + '" stroke-width="' + f(0.8 * k) + '"';
        const X = u => ox + sx * u * k, Y = v => oy + sy * v * k, bx = (u, w) => (sx > 0 ? X(u) : X(u + w)), by = (v, h) => (sy > 0 ? Y(v) : Y(v + h));
        const ppl = (u, v, n, su, sv) => { let o = ''; for (let a = 0; a < n; a++) { const q = rb(); o += C(X(u + (rb() - 0.5) * su), Y(v + (rb() - 0.5) * sv), 1.15 * k, q < 0.45 ? c0 : q < 0.7 ? c2 : '#F3F1EA'); } return o; };
        const smoke = (u, v) => [[0, 0, 1.7, 0.5], [1.8, 3, 2.4, 0.36], [4.2, 6.2, 3.1, 0.22], [7.2, 9.4, 3.8, 0.1]].map(m => C(X(u + m[0]), Y(v) - m[1] * k, m[2] * k, '#E9ECEF', ' fill-opacity="' + m[3] + '"')).join('');
        const awn = (u, v, w, h, a, b) => { const n = Math.round(w / 2.6), sw = w * k / n, x0 = bx(u, w), y0 = by(v, h), kid = 'ebk' + id + '_' + Math.round(x0) + '_' + Math.round(y0); let o = R(x0 + k, y0 + 1.4 * k, w * k, h * k, 1.3 * k, '#000', SH) + '<clipPath id="' + kid + '">' + R(x0, y0, w * k, h * k, 1.3 * k, '#000') + '</clipPath><g clip-path="url(#' + kid + ')">';
          for (let q = 0; q < n; q++) o += R(x0 + q * sw, y0, sw + 0.2, h * k, 0, q % 2 ? b : a);
          return o + R(x0, sy < 0 ? y0 : y0 + h * k * 0.72, w * k, h * k * 0.28, 0, '#000', ' fill-opacity=".2"') + '</g>' + R(x0, y0, w * k, h * k, 1.3 * k, 'none', OUT); };
        let o = '', sm = '';
        if (it.lights) { for (let a = 0; a <= 10; a++) o += C(X(1 + a * 2.9), Y(13.6 + Math.sin(a / 10 * Math.PI * 3) * 0.9), 0.85 * k, '#F2C230'); o += '<path d="M' + f(X(1)) + ' ' + f(Y(13.6)) + ' L' + f(X(30)) + ' ' + f(Y(13.6)) + '" stroke="#F2C230" stroke-opacity=".35" stroke-width="' + f(0.4 * k) + '"/>'; }
        if (it.bar) { o += ppl(8, 11.6, 3 + BAR, 11, 2) + awn(1, 2, 14, 8, c0, CR) + R(bx(2.5, 11), sy < 0 ? Y(2) - 1.2 * k : Y(10), 11 * k, 1.2 * k, 0.5 * k, '#6B4A2B'); }
        if (it.grill) { const u = 18; o += R(bx(u, 5), by(3, 4), 5 * k, 4 * k, 0.8 * k, '#2A2D32', OUT) + C(X(u + 1.5), Y(5), 0.7 * k, '#FF8A3C') + C(X(u + 3.3), Y(4.6), 0.7 * k, '#FFC44D') + C(X(u + 2.5), Y(5.8), 0.6 * k, '#FF5B2E'); sm += smoke(u + 2.5, sy < 0 ? 7 : 3); }
        if (it.truck) { const x0 = bx(1, 15), y0 = by(2.5, 7); o += ppl(8, 11.8, 4, 12, 2) + R(x0 + k, y0 + 1.4 * k, 15 * k, 7 * k, 1.8 * k, '#000', SH) + R(x0, y0, 15 * k, 7 * k, 1.8 * k, CR, OUT) + R(x0, y0 + 2.6 * k, 15 * k, 1.8 * k, 0, c0) + R(sx > 0 ? x0 + 11.6 * k : x0 + 0.9 * k, y0 + 1 * k, 2.5 * k, 5 * k, 0.8 * k, '#7FD6FF', ' stroke="' + INK + '" stroke-width="' + f(0.6 * k) + '"') + R(x0, y0, 15 * k, 7 * k, 1.8 * k, 'none', OUT) + R(x0 + 3.5 * k, sy < 0 ? y0 - 1.6 * k : y0 + 7 * k, 8 * k, 1.6 * k, 0.5 * k, c2, OUT); }
        if (it.shop) { const x0 = bx(1, 16), y0 = by(1.5, 9), mx = x0 + 8 * k, my = y0 + 4.5 * k, st = 2.6 * k, s2 = 0.75 * k; o += ppl(9, 12.4, 5, 13, 2) + R(x0 + k, y0 + 1.4 * k, 16 * k, 9 * k, 1.5 * k, '#000', SH) + R(x0, y0, 16 * k, 9 * k, 1.5 * k, '#22252A', OUT) + R(x0 + 1.2 * k, y0 + 1.2 * k, 13.6 * k, 6.6 * k, 0.9 * k, 'none', ' stroke="#F2C230" stroke-width="' + f(0.8 * k) + '"') +
            '<path d="M' + f(mx) + ' ' + f(my - st) + ' L' + f(mx + s2) + ' ' + f(my - s2) + ' L' + f(mx + st) + ' ' + f(my) + ' L' + f(mx + s2) + ' ' + f(my + s2) + ' L' + f(mx) + ' ' + f(my + st) + ' L' + f(mx - s2) + ' ' + f(my + s2) + ' L' + f(mx - st) + ' ' + f(my) + ' L' + f(mx - s2) + ' ' + f(my - s2) + 'Z" fill="#F2C230"/>'; }
        for (let a = 0; a < (it.tables || 0); a++) { const u = 4.5 + a * 9.2, v = 19.5, r = 3.5 * k, cx = X(u), cy = Y(v); o += ppl(u, v, 3, 9.5, 9.5) + C(cx + 0.8 * k, cy + 1.2 * k, r, '#000', SH) + C(cx, cy, r, a % 2 ? c2 : c0, OUT);
          for (let w = 0; w < 4; w++) { const a0 = w * Math.PI / 2 + 0.4, a1 = a0 + Math.PI / 4; o += '<path d="M' + f(cx) + ' ' + f(cy) + ' L' + f(cx + r * Math.cos(a0)) + ' ' + f(cy + r * Math.sin(a0)) + ' A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(cx + r * Math.cos(a1)) + ' ' + f(cy + r * Math.sin(a1)) + 'Z" fill="' + CR + '"/>'; }
          o += C(cx, cy, r, 'none', OUT) + C(cx, cy, 0.6 * k, INK); }
        return o + sm;
      };
      const BARR = { bar: 1 }, TRL = { truck: 1 }, SHP = { shop: 1 }, mk = (b, t, g, l) => Object.assign({}, b, { tables: t, grill: g, lights: l });
      const Z = [0, [mk(BARR, 0, 1)], [mk(BARR, 2, 1), mk(TRL, 0, 0)], [mk(BARR, 3, 1), mk(TRL, 2, 1)], [mk(BARR, 3, 1, 1), mk(TRL, 3, 1, 1), mk(BARR, 2, 0)], [mk(BARR, 3, 1, 1), mk(TRL, 3, 1, 1), mk(BARR, 3, 1, 1), mk(SHP, 3, 0, 1)]][BAR];
      [[-1, -1, 'a'], [1, -1, 'a'], [-1, 1, 'so'], [1, 1, 'so']].forEach((q, n) => { if (Z[n]) s += zone(q[0], q[1], q[2], Z[n], k * BK); });
    }
    s += '</svg>';
    return { svg: s, px, py, pw, ph, gap, box, k };
  }

  // Fatia de um setor num nível (para a régua de evolução)
  function slice(lvl, w, h, occ, cols, seed, kk) {
    const r = rng(seed || 3), id = ++uid, k = kk || 0.5, o = stand({ L: w, lvl, k, r, cols: cols || ['#E0203A', '#9C1228', '#F2C230'], occ: occ === undefined ? 0.85 : occ, id });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"><defs><linearGradient id="erf' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#454C55"/><stop offset="1" stop-color="#5E6670"/></linearGradient><linearGradient id="esh' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient></defs>' +
      '<rect x="0" y="' + (h - 5) + '" width="' + w + '" height="5" fill="#22834A"/><line x1="0" y1="' + (h - 5) + '" x2="' + w + '" y2="' + (h - 5) + '" stroke="#F3F1EA" stroke-opacity=".8" stroke-width="1"/>' +
      '<g transform="matrix(1,0,0,-1,0,' + (h - 9) + ')">' + o.g + '</g></svg>';
  }
  return { svg, slice, depth: D0, pads: [['xadrez', 'Xadrez'], ['faixas', 'Faixas largas'], ['diagonal', 'Diagonal'], ['circulos', 'Círculos'], ['losango', 'Losangos'], ['cruzado', 'Cruzado']] };
})();
