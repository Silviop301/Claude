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
    if (o.cam && lvl >= 4) g += '<rect x="' + f(x0 + len * 0.18) + '" y="' + f(d * walks[0] - 2.2 * k) + '" width="' + f(len * 0.64) + '" height="' + f(4.4 * k) + '" rx="1.5" fill="#E9D79B"/><rect x="' + f(x0 + len * 0.18) + '" y="' + f(d * walks[0] - 2.2 * k) + '" width="' + f(len * 0.64) + '" height="' + f(1.4 * k) + '" fill="#FFF6D2"/>';
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

  function pitch(px, py, pw, ph, gram, k) {
    let g = '<rect x="' + (px - 7 * k) + '" y="' + (py - 7 * k) + '" width="' + (pw + 14 * k) + '" height="' + (ph + 14 * k) + '" rx="5" fill="#16402B"/>';
    const n = 12, bw = pw / n, a = gram >= 2 ? '#22834A' : '#237A45', b = gram >= 2 ? '#1C733F' : '#20723F';
    for (let i = 0; i < n; i++) g += '<rect x="' + f(px + i * bw) + '" y="' + py + '" width="' + f(bw + 0.3) + '" height="' + ph + '" fill="' + (i % 2 ? a : b) + '"/>';
    if (gram === 0) { // gramado castigado
      g += '<ellipse cx="' + (px + pw / 2) + '" cy="' + (py + ph / 2) + '" rx="' + pw * 0.1 + '" ry="' + ph * 0.13 + '" fill="#6B6A3A" fill-opacity=".28"/>';
      g += '<ellipse cx="' + (px + pw * 0.06) + '" cy="' + (py + ph / 2) + '" rx="' + pw * 0.045 + '" ry="' + ph * 0.16 + '" fill="#6B6A3A" fill-opacity=".5"/><ellipse cx="' + (px + pw * 0.94) + '" cy="' + (py + ph / 2) + '" rx="' + pw * 0.045 + '" ry="' + ph * 0.16 + '" fill="#6B6A3A" fill-opacity=".5"/>';
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
      '<radialGradient id="elz' + id + '"><stop offset="0" stop-color="#FFF7DC" stop-opacity=".5"/><stop offset=".4" stop-color="#FFF7DC" stop-opacity=".14"/><stop offset="1" stop-color="#FFF7DC" stop-opacity="0"/></radialGradient></defs>';
    s += pitch(px, py, pw, ph, c.gram === undefined ? 1 : c.gram, k);
    if (c.luz) s += '<g style="mix-blend-mode:screen">' + [[0.2, 0.22], [0.8, 0.22], [0.2, 0.78], [0.8, 0.78]].map(q => '<ellipse cx="' + f(px + pw * q[0]) + '" cy="' + f(py + ph * q[1]) + '" rx="' + f(pw * 0.3) + '" ry="' + f(ph * 0.42) + '" fill="url(#elz' + id + ')" opacity=".3"/>').join('') + '</g>';
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
    // refletores nos 4 cantos
    if (c.luz) {
      const off = (Math.max(D0[Math.max(lv.a, lv.n, lv.s, lv.so, 3)] * k) + gap) * 0.86;
      [[px - off, py - off], [px + pw + off, py - off], [px - off, py + ph + off], [px + pw + off, py + ph + off]].forEach(q => {
        s += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + f(15 * k) + '" fill="url(#elz' + id + ')"/><rect x="' + f(q[0] - 4.2 * k) + '" y="' + f(q[1] - 4.2 * k) + '" width="' + f(8.4 * k) + '" height="' + f(8.4 * k) + '" rx="2" fill="#17181B" stroke="#8A929B" stroke-width=".8" transform="rotate(45 ' + f(q[0]) + ' ' + f(q[1]) + ')"/><circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + f(2.6 * k) + '" fill="#FFF7DC"/>';
      });
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
  return { svg, slice, depth: D0 };
})();
