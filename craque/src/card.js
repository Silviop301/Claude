// Card do jogador no estilo "FUT": desenhado em canvas para virar imagem e ser compartilhado.
// Cor pelo pico: bronze (<65), prata (65-74), ouro (75-84), ícone (85+ ou nota S).
(function (root) {
  const W = 600, H = 860;
  // A fonte de bandeiras vem primeiro: no Windows, sem ela o emoji 🇧🇷 vira "BR"
  const DISPLAY = "'Twemoji Country Flags', 'Barlow Condensed', 'Arial Narrow', sans-serif";
  const BODY = "'Twemoji Country Flags', 'Barlow', system-ui, sans-serif";

  // Metal: vários pontos de luz ao longo da diagonal (claro/escuro alternando), como metal polido
  const THEMES = {
    bronze: { metal: ['#6B3E1C', '#D9A174', '#8E5429', '#F2C9A0', '#A9693A', '#E0AC80', '#5E3517'], ink: '#2E1A0B', line: 'rgba(46,26,11,.35)', label: 'BRONZE' },
    prata:  { metal: ['#6F7A86', '#F4F7FA', '#A3AEBA', '#FFFFFF', '#8D98A5', '#E6EBF0', '#5E6873'], ink: '#18222D', line: 'rgba(24,34,45,.3)', label: 'PRATA' },
    ouro:   { metal: ['#7C5A10', '#F7E39A', '#C08E1E', '#FFF4C4', '#B8891F', '#F2D57A', '#6E4F0C'], ink: '#2E2100', line: 'rgba(46,33,0,.3)', label: 'OURO' },
    icone:  { metal: ['#120E20', '#3A3060', '#1A1530', '#4B3F7A', '#15112A', '#2E2650', '#0B0914'], ink: '#F4D675', line: 'rgba(244,214,117,.35)', label: 'ÍCONE', holo: true },
  };

  // Cartas especiais (momentos da carreira): cada uma com metal, tinta e desenho de fundo próprios
  const SPECIAL = {
    tots: { metal: ['#0B1A3C', '#2A4D9B', '#12285E', '#3E68C4', '#162F6B', '#2A4D9B', '#08132C'], ink: '#F4D675', line: 'rgba(244,214,117,.4)', label: 'SELEÇÃO DA TEMPORADA', pattern: 'stars', glow: '#6FA0FF' },
    heroi: { metal: ['#2A0508', '#8E1420', '#3E070D', '#C22533', '#4D0A12', '#8E1420', '#1C0306'], ink: '#FFE6A3', line: 'rgba(255,230,163,.4)', label: 'HERÓI DA FINAL', pattern: 'flames', glow: '#FF5A3C' },
    copa: { metal: null, ink: null, line: null, label: 'COPA DO MUNDO', pattern: null, glow: '#FFE27A' },
    bola: { metal: ['#B8913A', '#FFF8E1', '#E9CF86', '#FFFFFF', '#D8B660', '#FFF3CC', '#A67F2A'], ink: '#3A2A05', line: 'rgba(58,42,5,.35)', label: 'BOLA DE OURO', pattern: 'ball', glow: '#FFD65A' },
    chuteira: { metal: ['#3A1200', '#C2410C', '#5C1A02', '#F97316', '#6B2104', '#C2410C', '#2A0C00'], ink: '#FFF1C2', line: 'rgba(255,241,194,.4)', label: 'CHUTEIRA DE OURO', pattern: 'rays', glow: '#FF9A3C' },
    garcom: { metal: ['#042F2E', '#0F766E', '#063F3C', '#14B8A6', '#0A4D48', '#0F766E', '#021F1E'], ink: '#FFFFFF', line: 'rgba(255,255,255,.4)', label: 'REI DAS ASSISTÊNCIAS', pattern: 'waves', glow: '#5EEAD4' },
    muralha: { metal: ['#1E2530', '#4B5563', '#272F3B', '#6B7785', '#2E3642', '#4B5563', '#151A22'], ink: '#E8EEF5', line: 'rgba(232,238,245,.4)', label: 'MURALHA', pattern: 'hex', glow: '#9FB3C8' },
    xerife: { metal: ['#0A1024', '#23355E', '#0F1830', '#3A5285', '#142042', '#23355E', '#060A18'], ink: '#E6ECF7', line: 'rgba(230,236,247,.4)', label: 'XERIFE', pattern: 'rays', glow: '#9FB6E8' },
    joia: { metal: ['#3B0A2A', '#BE185D', '#4A0D34', '#EC4899', '#5B1040', '#BE185D', '#2A0620'], ink: '#FFF0F7', line: 'rgba(255,240,247,.4)', label: 'JOIA RARA', pattern: 'stars', glow: '#F9A8D4' },
    lenda: { metal: ['#050505', '#2A2A2A', '#0B0B0B', '#3A3A3A', '#111111', '#2A2A2A', '#000000'], ink: '#F4D675', line: 'rgba(244,214,117,.4)', label: 'LENDA VIVA', pattern: 'rays', glow: '#F4D675' },
    triplice: { metal: ['#022C16', '#047857', '#033D20', '#10B981', '#064E2B', '#047857', '#011C0E'], ink: '#F4D675', line: 'rgba(244,214,117,.4)', label: 'TRÍPLICE COROA', pattern: null, glow: '#6EE7B7' },
    mundial: { metal: ['#0C2A4A', '#3B82C4', '#123A63', '#7CC0F2', '#184A7A', '#3B82C4', '#08203A'], ink: '#FFFFFF', line: 'rgba(255,255,255,.45)', label: 'CAMPEÃO MUNDIAL', pattern: null, glow: '#7CC0F2' },
    perfeita: { metal: ['#FF6EC7', '#7AFCFF', '#FFF38A', '#8AFFA1', '#B28DFF', '#FF6EC7', '#7AFCFF'], ink: '#1A1030', line: 'rgba(26,16,48,.35)', label: 'TEMPORADA PERFEITA', pattern: 'rays', glow: '#FFFFFF', light: true },
  };
  function specialTheme(d) {
    const s = Object.assign({}, SPECIAL[d.special]);
    if (d.special === 'copa') {
      // Metal com as cores da seleção
      const [a, b] = d.kit || ['#F7D117', '#1B8A3A'];
      s.metal = [b, a, b, a, b, a, b];
      // Tinta escura em camisa clara (amarelo, branco); clara em camisa escura
      const lum = parseInt(a.slice(1, 3), 16) * 0.3 + parseInt(a.slice(3, 5), 16) * 0.59 + parseInt(a.slice(5, 7), 16) * 0.11;
      s.ink = lum > 150 ? '#10261A' : '#FFFFFF'; s.line = lum > 150 ? 'rgba(16,38,26,.4)' : 'rgba(255,255,255,.45)';
      s.metal = lum > 150 ? [a, '#FFFFFF', a, b, a, '#FFFFFF', a] : s.metal;
      s.light = lum > 150;
    }
    s.holo = d.special !== 'bola' && !s.light;
    if (d.special === 'perfeita') s.holo = true;
    return s;
  }
  // Desenho de fundo das cartas especiais (por baixo do texto, recortado no escudo)
  function drawPattern(ctx, s) {
    ctx.save();
    if (s.pattern === 'stars') {
      ctx.fillStyle = 'rgba(244,214,117,.22)';
      for (let i = 0; i < 38; i++) {
        const x = (i * 157) % W, y = 60 + ((i * 263) % (H - 120)), r = 4 + (i % 4) * 3;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.fill();
      }
    } else if (s.pattern === 'flames') {
      for (let i = 0; i < 9; i++) {
        const g = ctx.createLinearGradient(0, H, 0, 300);
        g.addColorStop(0, 'rgba(255,140,40,.45)'); g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g;
        const x = 30 + i * 68, h = 260 + (i * 97) % 220;
        ctx.beginPath(); ctx.moveTo(x - 40, H); ctx.quadraticCurveTo(x - 30, H - h * 0.5, x, H - h); ctx.quadraticCurveTo(x + 30, H - h * 0.5, x + 40, H); ctx.fill();
      }
    } else if (s.pattern === 'trophy') {
      ctx.globalAlpha = 0.16; ctx.fillStyle = '#FFE27A';
      ctx.translate(385, 380); ctx.scale(2.2, 2.2);
      ctx.beginPath(); ctx.moveTo(-40, -110); ctx.lineTo(40, -110); ctx.quadraticCurveTo(45, -40, 12, -10); ctx.lineTo(18, 50); ctx.lineTo(35, 60); ctx.lineTo(-35, 60); ctx.lineTo(-18, 50); ctx.lineTo(-12, -10); ctx.quadraticCurveTo(-45, -40, -40, -110); ctx.fill();
    } else if (s.pattern === 'rays') {
      // Raios saindo do alto da carta
      ctx.globalAlpha = 0.18; ctx.fillStyle = s.glow || '#FFFFFF';
      for (let i = 0; i < 18; i++) {
        const a = Math.PI * (i / 18) * 2;
        ctx.beginPath(); ctx.moveTo(W / 2, 250);
        ctx.lineTo(W / 2 + Math.cos(a) * 900, 250 + Math.sin(a) * 900);
        ctx.lineTo(W / 2 + Math.cos(a + 0.12) * 900, 250 + Math.sin(a + 0.12) * 900); ctx.fill();
      }
    } else if (s.pattern === 'waves') {
      ctx.globalAlpha = 0.2; ctx.strokeStyle = s.glow || '#FFFFFF'; ctx.lineWidth = 5;
      for (let j = 0; j < 12; j++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 80 + j * 70 + Math.sin(x / 60 + j) * 18);
        ctx.stroke();
      }
    } else if (s.pattern === 'hex') {
      ctx.globalAlpha = 0.16; ctx.strokeStyle = s.glow || '#FFFFFF'; ctx.lineWidth = 3;
      const R = 34, hx = R * Math.sqrt(3);
      for (let row = 0; row * R * 1.5 < H + R; row++) for (let col = -1; col * hx < W + hx; col++) {
        const cx = col * hx + (row % 2 ? hx / 2 : 0), cy = row * R * 1.5;
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } ctx.closePath(); ctx.stroke();
      }
    } else if (s.pattern === 'ball') {
      const rg = ctx.createRadialGradient(385, 260, 20, 385, 260, 330);
      rg.addColorStop(0, 'rgba(255,214,90,.55)'); rg.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.12; ctx.strokeStyle = '#6E4F0C'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(385, 250, 170, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; ctx.beginPath(); ctx.moveTo(385 + Math.cos(a) * 60, 250 + Math.sin(a) * 60); ctx.lineTo(385 + Math.cos(a) * 170, 250 + Math.sin(a) * 170); ctx.stroke(); }
      ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; ctx.lineTo(385 + Math.cos(a) * 60, 250 + Math.sin(a) * 60); } ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }

  function themeOf(peak, grade) {
    if (peak >= 85 || grade === 'S') return THEMES.icone;
    if (peak >= 75) return THEMES.ouro;
    if (peak >= 65) return THEMES.prata;
    return THEMES.bronze;
  }

  function shield(ctx) {
    // Silhueta com "chanfro" no topo, como os cards de futebol
    ctx.beginPath();
    ctx.moveTo(60, 40);
    ctx.lineTo(210, 40);
    ctx.quadraticCurveTo(300, 70, 390, 40);
    ctx.lineTo(540, 40);
    ctx.quadraticCurveTo(565, 40, 565, 70);
    ctx.lineTo(565, 700);
    ctx.quadraticCurveTo(565, 740, 530, 760);
    ctx.lineTo(320, 835);
    ctx.quadraticCurveTo(300, 842, 280, 835);
    ctx.lineTo(70, 760);
    ctx.quadraticCurveTo(35, 740, 35, 700);
    ctx.lineTo(35, 70);
    ctx.quadraticCurveTo(35, 40, 60, 40);
    ctx.closePath();
  }

  // ---------- Autógrafo e taça (área da foto) ----------
  // Estilos de assinatura (tools/craque_fonts.py hospeda as fontes). rot = inclinação (rad), stroke = contorno que engrossa
  // o traço das fontes finas, swoosh = espessura do sublinhado (0 = sem). O jogador assina a carta no fim da carreira (d.sign);
  // durante a carreira a carta fica só com o número.
  const SIGN = {
    delafield: { label: 'Clássica', family: "'Mrs Saint Delafield'", rot: -0.16, stroke: 2.4, swoosh: 4.5 },
    apple: { label: 'Caneta', family: "'Homemade Apple'", rot: -0.1, stroke: 0.6, swoosh: 3.5 },
    salt: { label: 'Marcador', family: "'Rock Salt'", rot: -0.08, stroke: 0, swoosh: 0 },
    yellowtail: { label: 'Esportiva', family: "'Yellowtail'", rot: -0.14, stroke: 0.8, swoosh: 6 },
    zeyada: { label: 'Rápida', family: "'Zeyada'", rot: -0.2, stroke: 1.6, swoosh: 3 },
    doulaise: { label: 'Floreada', family: "'Monsieur La Doulaise'", rot: -0.08, stroke: 1.4, swoosh: 0 },
    kaushan: { label: 'Pincel', family: "'Kaushan Script'", rot: -0.12, stroke: 0, swoosh: 4 },
    caveat: { label: 'Pincel leve', family: "'Caveat Brush'", rot: -0.1, stroke: 0.4, swoosh: 0 },
    vibes: { label: 'Caligrafia', family: "'Great Vibes'", rot: -0.12, stroke: 1, swoosh: 3 },
    grafite: { label: 'Grafite', family: "'Sedgwick Ave'", rot: -0.06, stroke: 0.8, swoosh: 0 },
    tinteiro: { label: 'Tinteiro', family: "'Pinyon Script'", rot: -0.14, stroke: 1.2, swoosh: 3.5 },
    // Tinta dourada: o traço da Clássica em ouro, com brilho (lendária)
    dourada: { label: 'Tinta dourada', family: "'Mrs Saint Delafield'", rot: -0.16, stroke: 2.4, swoosh: 4.5, gold: true },
  };
  root.CRAQUE_SIGN = SIGN;
  // Acabamentos (itens dos pacotinhos): textura no lugar do metal da faixa, só na carta final.
  // [nome, tinta, tinta clara?, sombra atrás do texto] — a textura fica em assets/cartas/ac-<id>.jpg (tools/craque_acabamentos.js)
  const FINISH = {
    carbono: ['Carbono', '#E8EEF5', true], marmore: ['Mármore', '#2A2418', false], madeira: ['Madeira', '#F3DFC0', true],
    neon: ['Neon', '#FFFFFF', true], aurora: ['Aurora', '#E6FFF4', true], camuflado: ['Camuflado', '#E8ECF0', true, 0.12], vitral: ['Vitral', '#FFF6E0', true, 0.32],
    holografico: ['Holográfico', '#1A1030', false], ourorose: ['Ouro rosé', '#3A1A12', false], diamante: ['Diamante', '#0E2236', false],
  };
  root.CRAQUE_FINISH = FINISH;
  const finishOf = d => (!d.special && d.finish && FINISH[d.finish]) || null;
  async function fontReady(family) {
    try { if (typeof document !== 'undefined' && document.fonts && document.fonts.load) await document.fonts.load('80px ' + family, 'Aa'); } catch (e) { /* segue com a reserva */ }
  }
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tint = (c, color) => { const t = mkCanvas(c.width, c.height), x = t.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return t; };
  const rgbaOf = (hex, a) => { const n = parseInt(String(hex).slice(1, 7), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const lightInk = hex => { const n = parseInt(String(hex).slice(1, 7), 16); return ((n >> 16) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11) / 255 > 0.5; };

  // Assinatura: desenhada numa camada própria em preto, depois pintada na tinta da carta com o mesmo relevo do texto.
  // Ajusta o tamanho para caber em maxW x maxH; nome comprido quebra em 2 linhas (primeiro nome em cima), escalonadas.
  function signature(ctx, ink, emboss, name, F, cx, cy, maxW, maxH) {
    const L = mkCanvas(W, H), x = L.getContext('2d');
    x.translate(cx, cy); x.rotate(F.rot); x.textAlign = 'center';
    const box = (t, fs) => { x.font = fs + 'px ' + F.family + ', cursive'; const m = x.measureText(t); return { t, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent, ox: (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2 }; };
    const fit = lines => {
      let fs = 220, bs;
      for (; fs > 20; fs -= 4) { bs = lines.map(t => box(t, fs)); const h = bs.reduce((s, b) => s + b.a + b.d, 0) + fs * 0.08 * (bs.length - 1); if (Math.max(...bs.map(b => b.w)) <= maxW && h <= maxH) break; }
      return { fs, bs };
    };
    let r = fit([name]);
    const words = name.split(/\s+/);
    if (r.fs < 96 && words.length > 1) { const r2 = fit([words[0], words.slice(1).join(' ')]); if (r2.fs > r.fs * 1.25) r = r2; }
    x.font = r.fs + 'px ' + F.family + ', cursive';
    const gap = r.fs * 0.08, total = r.bs.reduce((s, b) => s + b.a + b.d, 0) + gap * (r.bs.length - 1);
    x.fillStyle = x.strokeStyle = '#000'; x.lineJoin = x.lineCap = 'round';
    let y = -total / 2, hw = 0;
    r.bs.forEach((b, i) => {
      const dx = r.bs.length > 1 ? (i ? 1 : -1) * Math.min(40, (maxW - b.w) / 2) : 0;
      y += b.a; x.fillText(b.t, b.ox + dx, y);
      if (F.stroke) { x.lineWidth = F.stroke; x.strokeText(b.t, b.ox + dx, y); }
      y += b.d + gap; hw = Math.max(hw, b.w / 2);
    });
    if (F.swoosh) { const bt = total / 2; x.lineWidth = F.swoosh; x.beginPath(); x.moveTo(-hw * 0.82, bt + 12); x.quadraticCurveTo(0, bt + 36, hw * 0.98, bt - 8); x.stroke(); }
    ctx.drawImage(tint(L, emboss[0]), 0, 1.5);
    ctx.drawImage(tint(L, emboss[1]), 0, -1);
    if (F.gold) { // ouro com brilho por cima, no lugar da tinta da carta
      ctx.drawImage(tint(L, 'rgba(40,24,0,.85)'), 0.6, 1.6); // sombra escura: o ouro aparece até na carta de ouro
      ctx.drawImage(tint(L, '#A8740E'), 0, 0.8);
      ctx.drawImage(tint(L, '#E0AE2E'), 0, 0);
      ctx.save(); ctx.globalAlpha = 0.6; ctx.drawImage(tint(L, '#FFF0A8'), 0, -0.9); ctx.restore();
      return;
    }
    ctx.drawImage(tint(L, ink), 0, 0);
  }

  // Cartas de título: a taça da competição gravada no lugar da assinatura
  const TROPHY_IMG = n => (root.CRAQUE_TROPHY_IMGS || {})[n];
  const compIn = txt => { const k = Object.keys(root.CRAQUE_TROPHY_IMGS || {}).find(n => txt.includes(n.toUpperCase())); return k || null; };
  function trophyOf(d) {
    const f = String(d.footer || '').toUpperCase();
    if (d.special === 'copa') return { comp: 'Copa do Mundo', caption: (d.wc > 1 ? d.wc + '× ' : '') + 'CAMPEÃO DO MUNDO' };
    if (d.special === 'mundial') return { comp: 'Mundial de Clubes', caption: 'CAMPEÃO MUNDIAL' };
    // Herói da Final e Tríplice Coroa: a competição continental vem no texto da carta ("FINAL DA LIBERTADORES 2031")
    if (d.special === 'heroi') { const comp = compIn(f.replace(/^FINAL DA /, '')); return comp && { comp, caption: 'HERÓI DA FINAL' }; }
    if (d.special === 'triplice') { const comp = compIn(f.split('COPA E ')[1] || ''); return comp && { comp, caption: 'TRÍPLICE COROA' }; }
    return null;
  }
  // Gravura: a foto da taça vira linhas horizontais na tinta da carta, mais grossas onde a imagem é mais escura
  // (tinta clara: mais grossas onde é mais clara). A imagem é do próprio site (getImageData).
  function engrave(ctx, ink, light, src, x0, y0, w, h) {
    const c = mkCanvas(w, h), x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
    let id; try { id = x.getImageData(0, 0, w, h); } catch (e) { ctx.drawImage(src, x0, y0, w, h); return; }
    const dd = id.data, step = 4, lo = 0.35, hi = step * 0.96;
    ctx.save(); ctx.fillStyle = ink;
    for (let y = 0; y < h; y += step) {
      const sy = Math.min(h - 1, Math.round(y + step / 2));
      for (let px = 0; px < w; px++) {
        const i = (sy * w + px) * 4, a = dd[i + 3] / 255;
        if (a < 0.05) continue;
        const lum = (dd[i] * 0.3 + dd[i + 1] * 0.59 + dd[i + 2] * 0.11) / 255, t = lo + Math.pow(light ? lum : 1 - lum, 0.9) * (hi - lo);
        ctx.globalAlpha = a; ctx.fillRect(x0 + px, y0 + y + step / 2 - t / 2, 1.05, t);
      }
    }
    ctx.restore();
  }
  const ENGRAVED = {};
  async function trophyArt(ctx, ink, light, t) {
    const im = TROPHY_IMG(t.comp) ? await loadImg(TROPHY_IMG(t.comp)) : null;
    if (!im) return false;
    const cx = 378, cy = 220;
    ctx.save();
    const rg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 250); rg.addColorStop(0, rgbaOf(ink, 0.3)); rg.addColorStop(1, rgbaOf(ink, 0)); ctx.fillStyle = rg;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 300, cy + Math.sin(a) * 300); ctx.lineTo(cx + Math.cos(a + 0.11) * 300, cy + Math.sin(a + 0.11) * 300); ctx.fill(); }
    ctx.restore();
    let h = 290, w = Math.round(h * im.width / im.height);
    if (w > 300) { h = Math.round(h * 300 / w); w = 300; }
    // A gravura (linha a linha) é o desenho mais pesado da carta: fica guardada por taça e cor de tinta
    const key = t.comp + '|' + ink + '|' + light;
    if (!ENGRAVED[key]) { const c = mkCanvas(w, h); engrave(c.getContext('2d'), ink, light, im, 0, 0, w, h); ENGRAVED[key] = c; }
    ctx.drawImage(ENGRAVED[key], Math.round(cx - w / 2), 86 + (290 - h));
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = '800 30px ' + DISPLAY;
    ctx.fillText(t.caption, cx, 420, 360);
    return true;
  }

  function loadImg(src) {
    return new Promise(res => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  // data: { name, pos, peak, attrs, flag, crest (url), grade, verdict, goals, assists, titles, ballon, traits:[{icon,lv}], years,
  //         sign (assinatura, ver SIGN), curve/tSeasons/startAge (verso) }
  // Características no rodapé: o Twemoji de cada uma (SVG em assets/tw), com o nível (2 ou 3) ao lado.
  // As imagens são pré-carregadas antes de desenhar a carta (senão sairiam em branco no primeiro reveal e no compartilhamento).
  const twCode = e => [...(e.includes('\u200D') ? e : e.replace(/\uFE0F/g, ''))].map(ch => ch.codePointAt(0).toString(16)).join('-');
  const TW_IMG = {};
  function twLoad(e) {
    if (!e || typeof Image === 'undefined') return Promise.resolve(null);
    const code = twCode(e);
    if (!TW_IMG[code]) {
      const img = new Image();
      img.src = 'assets/tw/' + code + '.svg';
      TW_IMG[code] = (img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no; })).then(() => img, () => null);
    }
    return TW_IMG[code];
  }
  function drawTraitSeals(ctx, d, cy, ink, imgs) {
    const list = d.traits || [];
    const S = 34, GAP = 22, x0 = W / 2 - (list.length * S + (list.length - 1) * GAP) / 2;
    list.forEach((t, i) => {
      const cx = x0 + i * (S + GAP) + S / 2, img = imgs[i];
      ctx.save();
      if (img) ctx.drawImage(img, cx - S / 2, cy - S / 2, S, S);
      else { ctx.font = '30px ' + BODY; ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(t.icon || '', cx, cy + 11); }
      ctx.restore();
      if (t.lv > 1) { ctx.save(); ctx.fillStyle = ink; ctx.font = '800 18px ' + DISPLAY; ctx.textAlign = 'left'; ctx.fillText(String(t.lv), cx + S / 2 + 2, cy - 7); ctx.restore(); }
    });
  }

  root.CRAQUE_CARD = async function (canvas, d) {
    try {
      if (document.fonts && document.fonts.load) await document.fonts.load("52px 'Twemoji Country Flags'", d.flag || '🇧🇷');
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (e) { /* segue */ }
    const traitImgs = await Promise.all((d.traits || []).map(t => twLoad(t.icon)));
    let T = d.special ? specialTheme(d) : themeOf(d.peak, d.grade);
    // bare: só o conteúdo (fundo transparente), para ir por cima do metal da carta 3D
    const fin = finishOf(d);
    if (fin) T = Object.assign({}, T, { ink: fin[1], line: fin[2] ? 'rgba(255,255,255,.45)' : 'rgba(20,20,20,.35)', holo: false });
    const finImg = fin && !d.bare ? await loadImg('assets/cartas/ac-' + d.finish + '.jpg') : null;
    if (d.bare) T = Object.assign({}, T, { ink: d.ink || T.ink, line: d.line || T.line, holo: false });
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (d.bare) { if (T.pattern) { ctx.save(); shield(ctx); ctx.clip(); drawPattern(ctx, T); ctx.restore(); } } else {
    // Fundo metálico
    shield(ctx);
    const g = ctx.createLinearGradient(0, 40, W, H - 40);
    T.metal.forEach((col, i) => g.addColorStop(i / (T.metal.length - 1), col));
    ctx.fillStyle = g; ctx.fill();
    ctx.save();
    shield(ctx); ctx.clip();
    // Acabamento: a textura cobre a carta (768x1152 → 600x900, centrada)
    if (finImg) {
      ctx.drawImage(finImg, 0, -20, W, W * 1.5);
      if (fin[3]) { const sc = ctx.createRadialGradient(W / 2, H * 0.5, 40, W / 2, H * 0.5, W * 0.7); sc.addColorStop(0, 'rgba(0,0,0,' + fin[3] + ')'); sc.addColorStop(1, 'rgba(0,0,0,' + fin[3] * 0.4 + ')'); ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H); }
    }
    // Ícone: reflexo holográfico por cima do metal escuro
    if (T.holo && ctx.createConicGradient) {
      const hg = ctx.createConicGradient(0.6, W * 0.7, H * 0.3);
      ['#ff6ec7', '#7afcff', '#fff38a', '#8affa1', '#b28dff', '#ff6ec7'].forEach((col, i, a) => hg.addColorStop(i / (a.length - 1), col));
      ctx.globalAlpha = 0.16; ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    if (T.pattern) drawPattern(ctx, T);
    // Metal escovado: riscos finos quase horizontais (sempre iguais, sem sorteio)
    for (let i = 0, y = 44; !finImg && y < H; i++, y += 2.2) {
      const a = ((i * 37) % 11) / 11;
      ctx.strokeStyle = a > 0.5 ? 'rgba(255,255,255,' + (0.05 + a * 0.05) + ')' : 'rgba(0,0,0,' + (0.03 + a * 0.05) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + 6); ctx.stroke();
    }
    // Faixa de reflexo especular
    const sh = ctx.createLinearGradient(0, 0, W, H);
    sh.addColorStop(0.18, 'rgba(255,255,255,0)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.42)');
    sh.addColorStop(0.36, 'rgba(255,255,255,0.08)'); sh.addColorStop(0.44, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // Chanfro: borda clara em cima/esquerda e escura embaixo/direita, com um friso interno
    const bev = ctx.createLinearGradient(0, 40, W, H);
    bev.addColorStop(0, 'rgba(255,255,255,0.85)'); bev.addColorStop(0.5, 'rgba(255,255,255,0.15)'); bev.addColorStop(1, 'rgba(0,0,0,0.55)');
    shield(ctx); ctx.lineWidth = 8; ctx.strokeStyle = bev; ctx.stroke();
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(0.955, 0.965); ctx.translate(-W / 2, -H / 2);
    shield(ctx); ctx.lineWidth = 2.5; ctx.strokeStyle = T.line; ctx.stroke();
    ctx.restore();
    }
    // Texto em alto-relevo: sombra escura embaixo e luz em cima
    // Sutil: só 1 px de luz/sombra. Usa sempre o fillText original do canvas — redesenhar a carta
    // (ex.: trocar o escudo) não pode acumular o efeito.
    const emboss = d.bare ? (d.inkLight ? ['rgba(0,0,0,.35)', 'rgba(0,0,0,0)'] : ['rgba(255,255,255,.3)', 'rgba(0,0,0,0)'])
      : T.holo || (fin && fin[2]) ? ['rgba(0,0,0,.45)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,.4)', 'rgba(0,0,0,.12)'];
    const proto = (typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype.fillText) || ctx.fillText;
    const fillText = proto.bind(ctx);
    let embossOn = true; // desligado nos emojis (bandeira e ícones), que borrariam
    ctx.fillText = function (t, x, y, mw) {
      if (!embossOn) return mw ? fillText(t, x, y, mw) : fillText(t, x, y);
      const f = this.fillStyle;
      this.fillStyle = emboss[0]; mw ? fillText(t, x, y + 1.5, mw) : fillText(t, x, y + 1.5);
      this.fillStyle = emboss[1]; mw ? fillText(t, x, y - 1, mw) : fillText(t, x, y - 1);
      this.fillStyle = f; mw ? fillText(t, x, y, mw) : fillText(t, x, y);
    };

    // Coluna esquerda: nota, posição, bandeira, escudo
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 118px ' + DISPLAY;
    ctx.fillText(String(d.peak), 128, 185);
    ctx.font = '800 44px ' + DISPLAY;
    ctx.fillText(d.pos || 'MEI', 128, 232);
    ctx.fillRect(88, 250, 80, 3);
    ctx.font = '52px ' + BODY;
    embossOn = false; ctx.fillText(d.flag, 128, 318); embossOn = true;
    ctx.fillRect(88, 340, 80, 3);
    const crest = d.crest ? await loadImg(d.crest) : null;
    if (crest) ctx.drawImage(crest, 93, 356, 70, 70);

    // No lugar da foto: o autógrafo gravado no metal, com o número da camisa bem apagado atrás.
    // Cartas de título (Copa, Mundial, Herói da Final, Tríplice): a taça da competição gravada.
    const ink = T.ink, light = d.bare ? !!d.inkLight : lightInk(ink);
    const tr = trophyOf(d), withTrophy = !!(tr && await trophyArt(ctx, ink, light, tr));
    if (!withTrophy) {
      const F = SIGN[d.sign];
      if (F) await fontReady(F.family);
      ctx.save(); shield(ctx); ctx.clip();
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = '800 400px ' + DISPLAY; ctx.globalAlpha = F ? 0.14 : 0.24;
      ctx.fillText(String(d.number || ({ ATA: 9, MEI: 10, ZAG: 4, GOL: 1 }[d.pos] || 10)), 382, 428); ctx.globalAlpha = 1;
      ctx.restore();
      if (F) signature(ctx, ink, emboss, String(d.name || '').trim() || 'Craque', F, 372, 262, 340, 200);
    }

    // Nome
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'center';
    let fs = 70;
    ctx.font = '800 ' + fs + 'px ' + DISPLAY;
    while (ctx.measureText(d.name.toUpperCase()).width > 470 && fs > 36) { fs -= 4; ctx.font = '800 ' + fs + 'px ' + DISPLAY; }
    ctx.fillText(d.name.toUpperCase(), W / 2, 500);
    ctx.fillStyle = T.line; ctx.fillRect(90, 518, 420, 3);

    // Atributos (pico)
    ctx.fillStyle = T.ink;
    const A = d.attrs;
    // Mesmos 6 atributos da carta do FIFA/EA FC
    // Goleiro usa os rótulos de goleiro (VEL, REF, REP...)
    const DD = window.CRAQUE_DATA;
    const lab = k => (DD && DD.label ? DD.label(d.pos, k) : k.toUpperCase()).replace('FIS', 'FÍS');
    const stats = ['rit', 'fin', 'pas', 'dri', 'def', 'fis'].map(k => [lab(k), A[k]]);
    stats.forEach(([k, v], i) => {
      const col = i < 3 ? 0 : 1, row = i % 3;
      const x = col ? 345 : 115, y = 568 + row * 48;
      ctx.textAlign = 'right';
      ctx.font = '800 46px ' + DISPLAY;
      ctx.fillText(String(Math.round(v)), x + 60, y);
      ctx.textAlign = 'left';
      ctx.font = '600 38px ' + DISPLAY;
      ctx.fillText(k, x + 74, y);
    });
    ctx.fillStyle = T.line; ctx.fillRect(299, 534, 3, 136);

    // Rodapé: características e carreira
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'center';
    ctx.font = '34px ' + BODY;
    const extraN = (d.ballon ? 1 : 0) + (d.wc ? 1 : 0);
    embossOn = false; drawTraitSeals(ctx, d, extraN ? 697 : 705, T.ink, traitImgs); embossOn = true;
    // Estrelas de campeão do mundo acima do nome da camisa
    if (d.wc && !withTrophy) { ctx.font = '800 26px ' + DISPLAY; embossOn = false; ctx.fillText('★'.repeat(Math.min(d.wc, 5)), 385, 120); embossOn = true; }
    // Carta do meio da carreira (revelação ao subir de faixa): rodapé simples com clube e idade
    if (d.footer) {
      ctx.font = '700 24px ' + BODY;
      ctx.fillText(d.footer, W / 2, 756, 420);
      ctx.font = '800 20px ' + DISPLAY;
      ctx.globalAlpha = 0.8; ctx.fillText(d.special ? T.label : (d.fresh ? 'NOVA CARTA · ' : '') + T.label, W / 2, 786, 330); ctx.globalAlpha = 1;
      return canvas;
    }
    // Rodapé: números da carreira; conquistas grandes numa segunda linha (nada espremido)
    const extra = [];
    if (d.ballon) extra.push(d.ballon + ' BOLA' + (d.ballon > 1 ? 'S' : '') + ' DE OURO');
    if (d.wc) extra.push(d.wc > 1 ? d.wc + ' COPAS DO MUNDO' : 'CAMPEÃO DO MUNDO');
    ctx.font = '700 21px ' + BODY;
    const line = d.pos === 'GOL' ? (d.cs || 0) + ' SEM SOFRER GOL · ' + (d.penSaved || 0) + ' PÊN. DEF.'
      : d.pos === 'ZAG' ? d.goals + ' GOLS · ' + (d.cs || 0) + ' SEM SOFRER GOL' : d.goals + ' GOLS · ' + d.assists + ' ASSIST';
    ctx.fillText(line + ' · ' + d.titles + ' TÍTULOS', W / 2, extra.length ? 741 : 756, 420);
    if (extra.length) { ctx.font = '800 19px ' + BODY; ctx.fillText(extra.join(' · '), W / 2, 766, 380); }
    ctx.font = '800 18px ' + DISPLAY;
    ctx.globalAlpha = 0.8;
    ctx.fillText(T.label + ' · ' + d.verdict.toUpperCase(), W / 2, extra.length ? 790 : 784, extra.length ? 310 : 330);
    ctx.globalAlpha = 1;
    return canvas;
  };

  // Verso da carta (sem fundo, vai por cima do metal da carta 3D): CLIMBIX, o gráfico da trajetória e nome · número.
  // d.curve = nota geral de cada temporada, d.tSeasons = índices das temporadas com título, d.startAge = idade na 1ª.
  // look = { ink, inkLight, line } (CRAQUE_CARD_METAL). Cartas sem a trajetória guardada ficam só com o CLIMBIX e o nome.
  root.CRAQUE_CARD_BACK = async function (canvas, d, look) {
    try { if (document.fonts && document.fonts.load) await Promise.all(["800 40px 'Barlow Condensed'", "700 40px 'Barlow Condensed'"].map(f => document.fonts.load(f))); } catch (e) { /* segue */ }
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d'), ink = look.ink, e = look.inkLight ? ['rgba(0,0,0,.35)', null] : ['rgba(255,255,255,.3)', null];
    const txt = (t, x, y, mw) => { const f = ctx.fillStyle, put = dy => (mw ? ctx.fillText(t, x, y + dy, mw) : ctx.fillText(t, x, y + dy)); ctx.fillStyle = e[0]; put(1.5); ctx.fillStyle = f; put(0); };
    const FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const v = (d.curve || []).filter(n => typeof n === 'number');
    ctx.font = '800 128px ' + FONT; ctx.letterSpacing = '4px'; txt('CLIMBIX', W / 2 + 2, v.length > 1 ? 180 : 430);
    ctx.font = '700 22px ' + FONT; ctx.letterSpacing = '6px'; ctx.globalAlpha = 0.85;
    txt(v.length > 1 ? 'TRAJETÓRIA DA CARREIRA' : 'SEU NOME NA HISTÓRIA', W / 2 + 3, v.length > 1 ? 222 : 472); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
    if (v.length > 1) {
      const n = v.length, x0 = 100, x1 = 500, yb = 640, gh = 340, vmax = Math.min(95, Math.max(...v) + 9), start = d.startAge || 16;
      const X = i => x0 + i / (n - 1) * (x1 - x0), Y = q => yb - (q - 45) / (vmax - 45) * gh;
      const path = () => { ctx.beginPath(); ctx.moveTo(X(0), Y(v[0])); for (let i = 1; i < n; i++) ctx.quadraticCurveTo(X(i - 1), Y(v[i - 1]), (X(i - 1) + X(i)) / 2, (Y(v[i - 1]) + Y(v[i])) / 2); ctx.lineTo(X(n - 1), Y(v[n - 1])); };
      ctx.font = '700 19px ' + FONT; ctx.textAlign = 'left';
      [65, 75, 85].filter(q => q < vmax - 2).forEach(q => {
        ctx.globalAlpha = 0.5; ctx.setLineDash([2, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, Y(q)); ctx.lineTo(x1, Y(q)); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.8; ctx.fillText(String(q), x0, Y(q) - 7);
      });
      ctx.globalAlpha = 1;
      // Hachura diagonal embaixo da curva
      ctx.save(); path(); ctx.lineTo(X(n - 1), yb); ctx.lineTo(X(0), yb); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.3; ctx.lineWidth = 2; ctx.beginPath();
      const L = gh + 60; for (let k = -L; k < x1 - x0; k += 10) { ctx.moveTo(x0 + k, yb); ctx.lineTo(x0 + k + L, yb - L); }
      ctx.stroke(); ctx.restore();
      ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; path(); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
      // Estrelas na linha de base: temporadas com título
      (d.tSeasons || []).filter(i => i >= 0 && i < n).forEach(i => {
        ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 9 * 0.45 : 9; ctx.lineTo(X(i) + Math.cos(a) * rr, yb + 17 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      });
      const p = v.indexOf(Math.max(...v));
      ctx.beginPath(); ctx.arc(X(p), Y(v[p]), 9, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X(p), Y(v[p]), 16, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = '800 44px ' + FONT; txt(String(v[p]), Math.min(x1 - 20, Math.max(x0 + 20, X(p))), Y(v[p]) - 28);
      ctx.font = '700 22px ' + FONT; ctx.textAlign = 'left'; txt(start + ' ANOS', x0, yb + 30 + (d.tSeasons && d.tSeasons.includes(0) ? 14 : 0));
      ctx.textAlign = 'right'; txt((start + n - 1) + ' ANOS', x1, yb + 30 + (d.tSeasons && d.tSeasons.includes(n - 1) ? 14 : 0));
    }
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = '800 34px ' + FONT;
    txt(String(d.name || '').toUpperCase() + (d.number ? ' · ' + d.number : ''), W / 2, 736, 400);
    return canvas;
  };

  // Compartilhar (Safari/Android usam a folha de compartilhamento; senão, baixa a imagem)
  // Carta 3D: qual das 4 cartas metálicas usar (faixa ou carta especial) e a cor do texto por cima
  root.CRAQUE_CARD_METAL = function (d) {
    const k = d.special ? { tots: 'azul', heroi: 'vermelha', copa: 'verde', bola: 'dourada', chuteira: 'fogo', garcom: 'turquesa', muralha: 'aco', xerife: 'marinho', joia: 'rosa', lenda: 'onix', triplice: 'esmeralda', mundial: 'celeste', perfeita: 'arcoiris' }[d.special]
      : { bronze: 'bronze', prata: 'prata', ouro: 'dourada', icone: 'icone' }[Object.keys(THEMES).find(n => THEMES[n] === themeOf(d.peak, d.grade))];
    const fin = finishOf(d);
    if (fin) return { metal: 'ac-' + d.finish, ink: fin[1], inkLight: fin[2], line: fin[2] ? 'rgba(255,255,255,.45)' : 'rgba(20,30,10,.35)' };
    const ink = { azul: ['#FFFFFF', true], vermelha: ['#FFF4E6', true], verde: ['#06220F', false], dourada: ['#231800', false],
      bronze: ['#2A1505', false], prata: ['#141C26', false], icone: ['#F4D675', true],
      fogo: ['#FFF1C2', true], turquesa: ['#FFFFFF', true], aco: ['#F2F6FA', true], marinho: ['#E6ECF7', true], rosa: ['#FFF0F7', true], onix: ['#F4D675', true],
      esmeralda: ['#F4D675', true], celeste: ['#FFFFFF', true], arcoiris: ['#1A1030', false] }[k];
    return { metal: k, ink: ink[0], inkLight: ink[1], line: ink[1] ? 'rgba(255,255,255,.45)' : 'rgba(20,30,10,.35)' };
  };

  root.CRAQUE_SHARE = function (canvas, name) {
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'climbix-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', { type: 'image/png' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Minha carreira no Climbix' });
            return resolve('shared');
          }
        } catch (e) {
          if (e && e.name === 'AbortError') return resolve('cancel');
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        resolve('download');
      }, 'image/png');
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
