// Climbix: ilustração do jogador no estilo dos sprites do minigame (goleiro e barreira):
// contorno escuro grosso, proporção mais realista, sombra lateral simples. (Prancha "Criação do personagem".)
// Campos em c.look: skin, hair, hc, beard, band, bandC, tatBD/tatBE/tatPD/tatPE, boot, sole, sock, sleeve, wrist, wristC, glove.
// Poses do jornal: normal, celebra, taca (ergue a taça), triste, adeus, assina (segura a camisa nova), maca (lesão).
(function () {
  const SKIN = ['#F6D9BE', '#F1C7A0', '#E0AC80', '#C68A5E', '#A86E48', '#8D5A3B', '#6B4128', '#4A2B18'];
  // 0 preto, 1 castanho, 2 loiro, 3 ruivo, 4 grisalho · itens de pacotinho: 5 platinado, 6 azul, 7 rosa, 8 verde
  const HAIR_COLORS = ['#1E140C', '#5A3A1E', '#C9A05A', '#A8452A', '#E8E2D0', '#F4EAB8', '#2F6FD6', '#FF4FA3', '#4FC36B'];
  const HAIRS = ['curto', 'raspado', 'topete', 'black', 'trancas', 'dreads', 'moicano', 'longo', 'careca'];
  const BEARDS = ['nenhuma', 'rala', 'bigode', 'cavanhaque', 'cheia'];
  const GEAR = { preto: '#1B1A17', branco: '#F4F2EA', vermelho: '#D8404A', azul: '#2F6FD6', neon: '#7CF03C', rosa: '#FF4FA3', laranja: '#FF8A1F', amarelo: '#F2D630', ouro: 'url(#g-ouro)', holo: 'url(#g-holo)', lima: '#B8F25C',
    // Estampas (pacotinho): chuteira camuflada, de raio e em chamas; luva tigrada
    camuflada: 'url(#p-camo)', raio: 'url(#p-raio)', chamas: 'url(#p-chamas)', tigre: 'url(#p-tigre)' };
  const SWATCH = { ouro: 'linear-gradient(135deg, #FFE68A, #F2C230 50%, #B98700)', holo: 'linear-gradient(135deg, #8FE3FF, #C79BFF 35%, #FF9BD5 65%, #FFE38F)',
    camuflada: 'radial-gradient(circle at 30% 30%, #3E4628 22%, transparent 24%), radial-gradient(circle at 70% 65%, #A39A63 24%, transparent 26%), #6B7444',
    raio: 'linear-gradient(120deg, #1B1A17 40%, #F2D630 41% 55%, #1B1A17 56%)', chamas: 'linear-gradient(0deg, #FF6A1F, #FFD23F 45%, #1B1A17 46%)',
    tigre: 'repeating-linear-gradient(160deg, #FF8A1F 0 5px, #1B1A17 5px 7px)' };
  const PATTERNS = '<pattern id="p-camo" width="9" height="7" patternUnits="userSpaceOnUse"><rect width="9" height="7" fill="#6B7444"/><ellipse cx="2" cy="2" rx="2.4" ry="1.4" fill="#3E4628"/><ellipse cx="6.5" cy="5" rx="2.6" ry="1.5" fill="#A39A63"/><ellipse cx="7.4" cy="1.2" rx="1.4" ry="1" fill="#2A2D1C"/></pattern>' +
    '<pattern id="p-raio" width="7" height="9" patternUnits="userSpaceOnUse" patternTransform="translate(0 183.5)"><rect width="7" height="9" fill="#1B1A17"/><path d="M4.4 0L1.8 4.6H4.6L2.4 9" stroke="#F2D630" stroke-width="1.3" fill="none" stroke-linejoin="round"/></pattern>' +
    '<pattern id="p-chamas" width="6" height="9" patternUnits="userSpaceOnUse" patternTransform="translate(0 183.4)"><rect width="6" height="9" fill="#1B1A17"/><path d="M0 9C.4 6 2 6 1.6 2.4C3.2 4 3.6 6 3.4 6.8C4.2 5.6 5.2 5.2 4.9 3.4C6 5.2 6 7.6 5.6 9Z" fill="#FF6A1F"/><path d="M1.2 9C1.4 7.6 2.4 7.2 2.3 5.8C3.2 6.8 3.5 7.9 3.3 9Z" fill="#FFD23F"/></pattern>' +
    '<pattern id="p-tigre" width="5" height="4" patternUnits="userSpaceOnUse"><rect width="5" height="4" fill="#FF8A1F"/><path d="M0 1.2Q2.5 2.2 5 .8M0 3.2Q2.5 4.2 5 2.8" stroke="#1B1A17" stroke-width=".8" fill="none"/></pattern>';
  const DEF = { skin: 3, hair: 'curto', hc: 0, beard: 'nenhuma', band: 'nenhuma', bandC: 'branco', tattoo: 'nenhuma', tattooSide: 'direito', boot: 'preto', sole: 'branco', sock: 'alto', sleeve: 'curta', wrist: 'nenhuma', wristC: 'branco', glove: 'lima' };
  const OL = '#262321', OW = 2.2, SHADE = 'rgba(0,0,0,.14)';
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const pts = a => a.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L');
  // Membro com contorno: traço escuro mais largo por baixo, cor por cima
  const limb = (a, col, w, cap) => {
    const d = 'M' + pts(a), c = cap || 'round';
    return '<path d="' + d + '" stroke="' + OL + '" stroke-width="' + (w + OW * 2) + '" stroke-linecap="' + c + '" stroke-linejoin="round" fill="none"/>' +
      '<path d="' + d + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="' + c + '" stroke-linejoin="round" fill="none"/>';
  };
  const shape = (d, fill, extra) => '<path d="' + d + '" fill="' + fill + '" stroke="' + OL + '" stroke-width="' + OW + '" stroke-linejoin="round"' + (extra || '') + '/>';
  const along = (a, b, t0, t1) => [lerp(a, b, t0), lerp(a, b, t1)];
  // Peças da tatuagem (x ao longo do braço, y na largura: -3.6 a 3.6)
  const INK = '#22303C';
  const rng = s => () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const f2 = v => v.toFixed(2);
  const star = (cx, cy, r, rot) => {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = rot + Math.PI * i / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + f2(cx + Math.cos(a) * rr) + ' ' + f2(cy + Math.sin(a) * rr); }
    return '<path d="' + d + 'Z"/>';
  };
  // Espinhos tribais saindo das bordas, alternando lados, com tamanhos irregulares
  const thorns = (x0, x1, seed, hw) => {
    hw = hw || 3.6;
    const r = rng(seed), k = hw / 3.6; let o = '', x = x0 - 1, top = true;
    while (x < x1) {
      const w = (2.8 + r() * 2.4) * k, hh = (3.8 + r() * 2.8) * k, s = top ? -1 : 1, e = s * (hw + .3), tip = e - s * hh;
      o += '<path d="M' + f2(x) + ' ' + e + 'C' + f2(x + w * .25) + ' ' + f2(e - s * hh * .55) + ' ' + f2(x + w * .8) + ' ' + f2(tip + s * .8) + ' ' + f2(x + w * 1.3) + ' ' + f2(tip) +
        'C' + f2(x + w * .95) + ' ' + f2(e - s * hh * .4) + ' ' + f2(x + w * 1.05) + ' ' + f2(e - s * .6) + ' ' + f2(x + w) + ' ' + e + 'Z"/>';
      x += w * (.55 + r() * .25); top = !top;
    }
    return o;
  };
  const rose = (cx, cy, skin) => '<ellipse cx="' + f2(cx - 3) + '" cy="' + f2(cy + 1.6) + '" rx="1.9" ry="1" transform="rotate(-30 ' + f2(cx - 3) + ' ' + f2(cy + 1.6) + ')"/>' +
    '<ellipse cx="' + f2(cx + 3) + '" cy="' + f2(cy - 1.4) + '" rx="1.9" ry="1" transform="rotate(-30 ' + f2(cx + 3) + ' ' + f2(cy - 1.4) + ')"/>' +
    '<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="2.8"/>' +
    '<path d="M' + f2(cx - .2) + ' ' + f2(cy + .3) + 'a.9 .9 0 1 1 .9 .8a1.7 1.7 0 0 1-2.2-1.6a2.2 2.2 0 0 1 2.6-2" stroke="' + skin + '" stroke-width=".55" fill="none" stroke-linecap="round"/>';

  function hairParts(style, col) {
    const cap = 'M46.6 31C45.4 19 51.6 13.2 60 13.2S74.6 19 73.4 31C71 24.6 66 21.8 60 21.8S49 24.6 46.6 31Z';
    const tight = 'M47 29.5C46.4 19.4 52 14 60 14S73.6 19.4 73 29.5C70.4 24.4 65.6 22.6 60 22.6S49.6 24.4 47 29.5Z';
    if (style === 'careca') return ['', ''];
    if (style === 'raspado') return ['', '<path d="' + tight + '" fill="' + col + '" opacity=".5"/>'];
    if (style === 'black') return [shape('M60 7C72 7 79 15 78.6 26C78.4 32 75.6 35 73.6 35.6L46.4 35.6C44.4 35 41.6 32 41.4 26C41 15 48 7 60 7Z', col), ''];
    if (style === 'moicano') return ['', '<path d="' + tight + '" fill="' + col + '" opacity=".35"/>' + shape('M56.4 24V12.4C56.4 8.6 63.6 8.6 63.6 12.4V24Z', col)];
    if (style === 'longo') return [shape('M45.4 30C44 17 51 11.6 60 11.6S76 17 74.6 30L76 52Q60 56 44 52Z', col), shape(cap, col)];
    if (style === 'topete') return ['', shape(cap, col) + shape('M49.6 23C48.6 12.6 56 7.2 64.6 8.4C71.4 9.4 74.4 15 72.6 21.6C69 17.4 63.2 16.4 57.4 18.8C54.4 20 51.6 21.4 49.6 23Z', col)];
    if (style === 'trancas') return ['', shape(tight, col) +
      '<path d="M52.4 26.4Q51.6 19.6 54.6 15.4M56.6 24.4Q56.4 18 58.4 14.2M61.6 24.2Q62.2 18 61.8 14.2M66 25Q67.4 19.4 65.6 15.2M69.6 27Q71.4 21.4 69.4 17.4" stroke="' + OL + '" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>'];
    if (style === 'dreads') {
      const d = (x1, y1, x2, y2) => limb([[x1, y1], [x2, y2]], col, 3.4);
      return [d(47.4, 26, 44.6, 52) + d(51, 24, 49.6, 54) + d(69, 24, 70.4, 54) + d(72.6, 26, 75.4, 52),
        shape(cap, col) + d(53.6, 17.6, 52.6, 25) + d(58.6, 15.8, 58.2, 23.4) + d(63.4, 15.8, 64, 23.4) + d(67.8, 17.4, 68.6, 25)];
    }
    return ['', shape(cap, col)];
  }
  function beardOf(style, col) {
    const jaw = 'M46.8 32C47 42 52.6 46 60 46S73 42 73.2 32C70.6 37.6 66.6 38.8 60 38.8S49.4 37.6 46.8 32Z';
    const stache = '<path d="M55.4 37.6Q60 34.8 64.6 37.6Q60 37.1 55.4 37.6Z" fill="' + col + '" stroke="' + col + '" stroke-width="1.4" stroke-linejoin="round"/>';
    if (style === 'rala') return '<path d="' + jaw + '" fill="' + col + '" opacity=".32"/>';
    if (style === 'bigode') return stache;
    if (style === 'cavanhaque') return stache + '<path d="M56.8 41.6Q60 48.4 63.2 41.6Q60 43 56.8 41.6Z" fill="' + col + '"/>';
    if (style === 'cheia') return '<path d="' + jaw.replace('M46.8 32', 'M46.4 30.4').replace('73.2 32', '73.6 30.4') + '" fill="' + col + '"/>' + stache;
    return '';
  }
  const ARMS = {
    normal: [[[44, 57], [37.6, 81], [34.6, 104]], [[76, 57], [82.4, 81], [85.4, 104]]],
    celebra: [[[44, 57], [31, 38], [27, 15]], [[76, 57], [89, 38], [93, 15]]],
    taca: [[[44, 57], [37, 34], [51, 6]], [[76, 57], [83, 34], [69, 6]]],
    triste: [[[44, 57], [36, 78], [50, 37]], [[76, 57], [82.4, 81], [85.4, 104]]],
    adeus: [[[44, 57], [36, 78], [50, 37]], [[76, 57], [90, 38], [96, 16]]],
    assina: [[[44, 57], [33, 74], [33, 84]], [[76, 57], [87, 74], [87, 84]]],
  };
  // Acessórios de pacotinho (c.look.extra), desenhados por cima do boneco, no mesmo traço.
  // Fita do Bonfim e faixa de capitão acompanham o braço da pose.
  const NUM_FX = { ouro: 'url(#g-ouro)', holo: 'url(#g-holo)' };
  const band2 = (s, e, t0, t1, col, w) => limb([lerp(s, e, t0), lerp(s, e, t1)], col, w, 'butt');
  const EXTRA = {
    capitao: o => { const [s, e] = o.R, m = lerp(s, e, .37);
      return band2(s, e, .27, .47, '#F2D630', 12.4) + '<text x="' + f2(m[0]) + '" y="' + f2(m[1] + 2) + '" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="5.6" fill="' + OL + '">C</text>'; },
    bonfim: o => { const [, e, h] = o.L, m = lerp(e, h, .74), p = f2(m[0] - 3.8) + ' ' + f2(m[1]);
      return band2(e, h, .71, .77, '#2F6FD6', 8.2) + '<path d="M' + p + 'l-2.2 3.8M' + p + 'l-3.4 2" stroke="' + OL + '" stroke-width="2.6" stroke-linecap="round"/><path d="M' + p + 'l-2.2 3.8M' + p + 'l-3.4 2" stroke="#2F6FD6" stroke-width="1.1" stroke-linecap="round"/>'; },
    cordao: () => '<path d="M54.2 50.4Q60 61.4 65.8 50.4" stroke="' + OL + '" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M54.2 50.4Q60 61.4 65.8 50.4" stroke="#F2C230" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-dasharray="1.2 .5"/>' +
      '<circle cx="60" cy="58.4" r="2.3" fill="url(#g-ouro)" stroke="' + OL + '" stroke-width="1.2"/>',
    brinco: () => '<circle cx="46.4" cy="34.4" r="1.25" fill="url(#g-ouro)" stroke="' + OL + '" stroke-width=".8"/><circle cx="73.6" cy="34.4" r="1.25" fill="url(#g-ouro)" stroke="' + OL + '" stroke-width=".8"/>',
    caneleira: () => [47.5, 63].map(x => '<rect x="' + x + '" y="152.5" width="9.6" height="20" rx="3.2" fill="#F4F2EA" stroke="' + OL + '" stroke-width="1.8"/><rect x="' + (x + 2.6) + '" y="156" width="4.4" height="13" rx="1.4" fill="#22A45D"/>').join(''),
    // Listras no meião alto (no arriado não aparecem)
    listrado: o => (o.lk.sock === 'arriado' ? '' : [52, 68].map(x => [166.5, 172.5, 178.5].map(y => '<rect x="' + (x - 5.2) + '" y="' + y + '" width="10.4" height="2.6" fill="' + o.kit[1] + '"/>').join('')).join('')),
    risco: o => (o.lk.hair === 'careca' ? '' : '<path d="M48.6 25.6Q50.2 20.6 55 17.6" stroke="' + o.skin + '" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M49.8 27.4Q51.4 22.8 55.6 20.2" stroke="' + o.skin + '" stroke-width="1" fill="none" stroke-linecap="round"/>'),
    coque: o => (o.lk.hair === 'careca' ? '' : '<circle cx="60" cy="9.8" r="4.8" fill="' + o.hcol + '" stroke="' + OL + '" stroke-width="2.2"/><path d="M56.2 13.8Q60 15.4 63.8 13.8" stroke="' + OL + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  };
  // opts: { crop: true } enquadra só o jogador; { bust: true } só da cintura para cima (carta);
  // { flat: true } sem estádio; { num: '9' } número na camisa
  let uid = 0;
  // Carreiras antigas: 5 tons de pele (antes do desenho novo) viram os tons equivalentes dos 8 novos
  const OLD_SKIN = [1, 2, 3, 5, 7];
  const hash = s => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  function lookOf(c) {
    const raw = c.look;
    if (!raw) return { v: 2, skin: OLD_SKIN[hash(c.name) % 4], hair: 'curto', hc: 0 };
    if (raw.v === 2) return raw;
    return Object.assign({}, raw, { v: 2, skin: OLD_SKIN[raw.skin] !== undefined ? OLD_SKIN[raw.skin] : 3 });
  }
  function photo(pose, kit, c, opts) {
    opts = opts || {};
    const id = 'a' + (++uid);
    c = Object.assign({}, c, { look: lookOf(c) });
    if (pose === 'maca') return stretcher(kit, c, opts);
    const lk = Object.assign({}, DEF, c.look || {});
    const [k1, k2] = kit, skin = SKIN[lk.skin] ?? SKIN[3], hcol = HAIR_COLORS[lk.hc] ?? HAIR_COLORS[0], gk = c.pos === 'GOL';
    const g = k => GEAR[k] || GEAR.preto;
    const [hBack, hFront] = hairParts(lk.hair, hcol);
    const long = lk.sleeve === 'comprida';
    const defs = '<defs><linearGradient id="g-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE68A"/><stop offset=".5" stop-color="#F2C230"/><stop offset="1" stop-color="#B98700"/></linearGradient>' +
      '<linearGradient id="g-holo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8FE3FF"/><stop offset=".35" stop-color="#C79BFF"/><stop offset=".65" stop-color="#FF9BD5"/><stop offset="1" stop-color="#FFE38F"/></linearGradient>' + PATTERNS + '</defs>';
    let bg = '';
    if (!opts.flat) {
      let crowd = '';
      for (let r = 0; r < 6; r++) for (let x = -60 + (r % 2) * 6; x < 182; x += 12) crowd += '<circle cx="' + x + '" cy="' + (12 + r * 15) + '" r="5" fill="' + ((x * 7 + r * 3) % 5 < 2 ? '#6A665C' : '#7C786D') + '"/>';
      bg = '<rect x="-60" y="-30" width="240" height="230" fill="#A29E91"/>' + crowd + '<rect x="-60" y="96" width="240" height="14" fill="#5E5B52"/><rect x="-60" y="110" width="240" height="90" fill="#7F8A6C"/>';
    }
    // Braços (atrás do tronco)
    // Tatuagem: desenhada em coordenadas do próprio braço e recortada na largura da pele,
    // só no trecho entre a manga e o punho (ou a munhequeira)
    // Tatuagem por membro (BD/BE = braço direito/esquerdo, PD/PE = perna), sempre desenhada no membro inteiro:
    // manga, calção, meião, munhequeira e mão são desenhados depois e cobrem parte dela.
    const raw = c.look || {};
    const legacy = raw.tattoo && raw.tattoo !== 'nenhuma' ? (raw.tattoo === 'braco' ? 'pequena' : raw.tattoo) : 'nenhuma', ls = raw.tattooSide || 'direito';
    const tatOf = k => raw['tat' + k] || (k === 'BD' && ls !== 'esquerdo' ? legacy : k === 'BE' && ls !== 'direito' ? legacy : 'nenhuma');
    const small = (c, hw) => {
      const k = hw / 3.6;
      return star(c, -.3 * k, 2.7 * k, .25) + '<circle cx="' + f2(c + 3.7 * k) + '" cy="' + f2(1.9 * k) + '" r="' + f2(.7 * k) + '"/><circle cx="' + f2(c + 5.1 * k) + '" cy="' + f2(.5 * k) + '" r="' + f2(.45 * k) + '"/>' +
        '<path d="M' + f2(c - 3.4 * k) + ' ' + f2(2.6 * k) + 'Q' + f2(c - 5.2 * k) + ' ' + f2(.2 * k) + ' ' + f2(c - 4.4 * k) + ' ' + f2(-2.2 * k) + 'Q' + f2(c - 4.2 * k) + ' ' + f2(.4 * k) + ' ' + f2(c - 2.6 * k) + ' ' + f2(2.4 * k) + 'Z"/>';
    };
    const tattoo = ([a, b, d], kind, key, hw, smallOn) => {
      const seed = { BD: 7, BE: 19, PD: 31, PE: 43 }[key];
      const pid = id;
      const seg = (p, q, t0, t1, id, motif) => {
        const p0 = lerp(p, q, t0), p1 = lerp(p, q, t1), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI;
        return '<g transform="translate(' + f2(p0[0]) + ' ' + f2(p0[1]) + ') rotate(' + ang.toFixed(1) + ')"><clipPath id="' + id + pid + '"><rect x="0" y="' + (-hw) + '" width="' + f2(len) + '" height="' + 2 * hw + '"/></clipPath>' +
          '<g clip-path="url(#' + id + pid + ')" fill="' + INK + '" opacity=".82">' + motif(len) + '</g></g>';
      };
      if (kind === 'pequena') return smallOn === 'upper' ? seg(a, b, .3, 1, 'tp' + key, L => small(L * .6, hw)) : seg(b, d, .1, .8, 'tp' + key, L => small(L * .48, hw));
      const k = hw / 3.6;
      return seg(a, b, 0, 1.04, 'tu' + key, L => thorns(0, L, seed, hw) + (hw > 4 ? rose(L * .66, .3, skin) : '')) +
        seg(b, d, 0, 1, 'tf' + key, L => thorns(0, L * .42, seed + 3, hw) + rose(L * .62, .2, skin) +
          '<circle cx="' + f2(L * .62 + 3.6 * k) + '" cy="' + f2(-2.6 * k) + '" r=".6"/><circle cx="' + f2(L * .62 - 3.4 * k) + '" cy="' + f2(2.7 * k) + '" r=".5"/>' +
          '<path d="M' + f2(L * .8) + ' ' + (-hw - .3) + 'h1.8q.9 ' + hw * .55 + '-.3 ' + (hw + .3) + 'q-1 ' + hw * .55 + ' .3 ' + (hw + .3) + 'h-1.8q-1.1-' + hw * .5 + '-.1-' + (hw + .3) + 'q.9-' + hw * .55 + '-.1-' + (hw + .3) + 'Z"/>');
    };
    const arm = ([s, e, h], side) => {
      let o = limb([s, e, h], long ? k1 : skin, 7.4);
      const tk = side === 'direito' ? 'BD' : 'BE', tat = tatOf(tk);
      if (!long && tat !== 'nenhuma') o += tattoo([s, e, h], tat, tk, 3.6, 'lower');
      if (!long) o += limb(along(s, e, 0, .55), k1, 11.2, 'butt');
      else o += limb(along(e, h, .78, 1), k2, 7.4, 'butt');
      if (lk.wrist === 'duas' || (lk.wrist === 'uma' && side === 'esquerdo')) o += limb(along(e, h, .66, .84), g(lk.wristC), 8.2, 'butt');
      if (gk) o += shape('M' + (h[0] - 5.4) + ' ' + (h[1] - 3) + 'h10.8v7.4q0 4.6-5.4 4.6t-5.4-4.6Z', g(lk.glove)) +
        '<path d="M' + (h[0] - 2.2) + ' ' + (h[1] + 2.4) + 'v3.2M' + h[0] + ' ' + (h[1] + 2.4) + 'v3.6M' + (h[0] + 2.2) + ' ' + (h[1] + 2.4) + 'v3.2" stroke="' + OL + '" stroke-width=".9" stroke-linecap="round" opacity=".6"/>';
      else o += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="4.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/>';
      return o;
    };
    // Pernas
    const extra = Array.isArray(lk.extra) ? lk.extra : [];
    if (extra.includes('caneleira')) lk.sock = 'arriado'; // a caneleira aparece com o meião arriado
    const sockTop = lk.sock === 'arriado' ? 175 : 158;
    const leg = (hip, knee, ank, tk) => {
      let o = limb([hip, knee, ank], skin, 9.6);
      if (tatOf(tk) !== 'nenhuma') o += tattoo([hip, knee, ank], tatOf(tk), tk, 4.7, 'upper');
      o += limb([[ank[0], sockTop], ank], k1, 10.4, 'butt');
      o += lk.sock === 'arriado' ? shape('M' + (ank[0] - 6) + ' ' + (sockTop - 1.6) + 'h12q1.4 0 1.4 1.6v1.4q0 1.6-1.4 1.6h-12q-1.4 0-1.4-1.6v-1.4q0-1.6 1.4-1.6Z', k1) : '<rect x="' + (ank[0] - 5.2) + '" y="' + (sockTop + 3) + '" width="10.4" height="2.6" fill="' + k2 + '"/>';
      return o;
    };
    // Chuteira com a ponta para fora; sola em faixa separada
    const boot = (x, d) => {
      const X = v => (x + v * d).toFixed(2);
      return shape('M' + X(-5) + ' 183.6V192H' + X(10) + 'Q' + X(12) + ' 192 ' + X(12) + ' 190Q' + X(12) + ' 186.4 ' + X(6.4) + ' 185.2L' + X(5) + ' 183.6Z', g(lk.boot)) +
        '<rect x="' + Math.min(+X(-5.6), +X(12.4)) + '" y="191.4" width="18" height="3.4" rx="1.5" fill="' + g(lk.sole) + '" stroke="' + OL + '" stroke-width="1.6"/>';
    };
    const happy = pose === 'celebra' || pose === 'taca', sad = pose === 'triste' || pose === 'adeus';
    // Sobrancelha escura com careca, raspado, grisalho e as cores de pacotinho (platinado e pintado)
    const brow = lk.hair === 'careca' || lk.hair === 'raspado' || lk.hc === 4 || lk.hc >= 5 ? '#3A2A1E' : hcol;
    const face = '<path d="M52.6 27.2Q55.2 25.8 57.6 27M62.4 27Q64.8 25.8 67.4 27.2" stroke="' + brow + '" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="55.4" cy="31" rx="1.35" ry="1.75" fill="' + OL + '"/><ellipse cx="64.6" cy="31" rx="1.35" ry="1.75" fill="' + OL + '"/>' +
      '<path d="M60.4 32.4Q62 35.6 59.4 36" stroke="rgba(0,0,0,.35)" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
      (happy ? '<path d="M56.4 39.6Q60 38.6 63.6 39.6Q63.4 44 60 44Q56.6 44 56.4 39.6Z" fill="#5A1A10" stroke="' + OL + '" stroke-width="1.4" stroke-linejoin="round"/>'
        : sad ? '<path d="M56.8 41.6Q60 39.4 63.2 41.6" stroke="' + OL + '" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M66 33.6q1.6 2.8 0 4.2q-1.6-1.4 0-4.2Z" fill="#6FB7E8" stroke="' + OL + '" stroke-width=".7"/>'
        : '<path d="M56.8 40.2Q60 41.6 63.2 40.2" stroke="' + OL + '" stroke-width="1.3" stroke-linecap="round" fill="none"/>');
    // Taça erguida acima da cabeça (pose "taca") e camisa nova segurada na frente do corpo (pose "assina")
    const cup = pose !== 'taca' ? '' : shape('M47 -22H73V-12C73 -2 67 4 60 4S47 -2 47 -12Z', 'url(#g-ouro)') +
      '<path d="M47 -18H41.6C41.6 -10 45 -7 48.4 -6.4M73 -18H78.4C78.4 -10 75 -7 71.6 -6.4" stroke="' + OL + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      shape('M56.6 4H63.4V9H56.6Z', '#C99A12') + shape('M52 9H68V13H52Z', 'url(#g-ouro)') + '<path d="M52 -18Q53 -8 57 -4" stroke="#FFF6D0" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>';
    const held = pose !== 'assina' ? '' : shape('M27 72L42 68L50 73H70L78 68L93 72L95 86H84V124H36V86H25Z', k1) +
      '<path d="M50 73L60 81L70 73" stroke="' + k2 + '" stroke-width="2.6" fill="none" stroke-linejoin="round"/>' +
      '<text x="60" y="112" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="24" fill="' + k2 + '" stroke="' + OL + '" stroke-width=".6">' + (c.number || 10) + '</text>';
    const band = lk.band === 'faixa' ? limb([[47.2, 25], [53, 20.6], [60, 19.4], [67, 20.6], [72.8, 25]], g(lk.bandC), 2.8)
      : lk.band === 'tiara' ? '<path d="M48.6 21.4Q60 12.6 71.4 21.4" stroke="' + OL + '" stroke-width="3.8" fill="none" stroke-linecap="round"/><path d="M48.6 21.4Q60 12.6 71.4 21.4" stroke="' + g(lk.bandC) + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' : '';
    const [L, R] = ARMS[pose] || ARMS.normal;
    const handUp = pose === 'triste' || pose === 'adeus'; // mão no rosto: o braço vai na frente da cabeça
    const torso = 'M41 57Q41.6 52 48 51L55 49.6Q60 54 65 49.6L72 51Q78.4 52 79 57L77.4 104Q60 107 42.6 104Z';
    const top = pose === 'taca' ? 26 : 0;
    const vb = opts.bust ? '21 4 78 102' : opts.crop ? '14 ' + (4 - top) + ' 92 ' + (196 + top) : '-60 ' + (-top) + ' 240 ' + (200 + top);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '">' + defs + bg +
      '<ellipse cx="60" cy="195" rx="26" ry="4.4" fill="rgba(0,0,0,.28)"/>' +
      leg([53.4, 116], [52.4, 150], [52, 185], 'PD') + leg([66.6, 116], [67.6, 150], [68, 185], 'PE') + boot(52, -1) + boot(68, 1) +
      hBack + (handUp ? '' : arm(L, 'direito')) + arm(R, 'esquerdo') +
      shape('M55 38h10v15h-10Z', skin) + '<path d="M55.6 44h8.8v4h-8.8Z" fill="rgba(0,0,0,.16)"/>' +
      shape(torso, k1) + '<path d="M70.6 51.6Q78 52.6 78.6 57L77.2 103.6Q73.6 104.8 71 105Z" fill="' + SHADE + '"/>' +
      '<path d="M54.6 50L60 57.4L65.4 50" stroke="' + k2 + '" stroke-width="2.8" stroke-linejoin="round" fill="none"/>' +
      (opts.num ? '<text x="60" y="85" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="17" fill="' +
        (NUM_FX[lk.numFx] ? NUM_FX[lk.numFx] + '" stroke="' + OL + '" stroke-width=".8' : k2) + '">' + opts.num + '</text>' : '') +
      shape('M42.6 102.6H77.4L78.6 123.6Q71.4 126 62.6 124.2L60 115.6L57.4 124.2Q48.6 126 41.4 123.6Z', k2) +
      '<path d="M44.6 104L43.8 123.4M75.4 104L76.2 123.4" stroke="' + k1 + '" stroke-width="2"/>' +
      '<circle cx="46.8" cy="31.6" r="3.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/><circle cx="73.2" cy="31.6" r="3.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/>' +
      '<ellipse cx="60" cy="30.4" rx="13.2" ry="15.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/>' +
      '<path d="M66.4 16.6Q73.6 21 73.2 31.4Q72.8 40 66 44.6Q71.2 36 70.6 28Q70 21 66.4 16.6Z" fill="' + SHADE + '"/>' +
      beardOf(lk.beard, lk.hc >= 6 ? '#3A2A1E' : hcol) + face + hFront + band + (handUp ? arm(L, 'direito') : '') + held + cup +
      extra.map(x => (EXTRA[x] ? EXTRA[x]({ L, R, kit, skin, hcol, lk }) : '')).join('') + '</svg>';
  }
  // Lesão: deitado na maca, com o médico ao lado
  function stretcher(kit, c, opts) {
    const lk = Object.assign({}, DEF, c.look), [k1, k2] = kit, skin = SKIN[lk.skin] ?? SKIN[3], hcol = HAIR_COLORS[lk.hc] ?? HAIR_COLORS[0];
    let crowd = '';
    for (let r = 0; r < 6; r++) for (let x = -60 + (r % 2) * 6; x < 182; x += 12) crowd += '<circle cx="' + x + '" cy="' + (12 + r * 15) + '" r="5" fill="' + ((x * 7 + r * 3) % 5 < 2 ? '#6A665C' : '#7C786D') + '"/>';
    const bg = opts.flat ? '' : '<rect x="-60" width="240" height="200" fill="#A29E91"/>' + crowd + '<rect x="-60" y="96" width="240" height="14" fill="#5E5B52"/><rect x="-60" y="110" width="240" height="90" fill="#7F8A6C"/>';
    const doc = SKIN[(hash(c.name) + 2) % SKIN.length];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 0 240 200">' + bg +
      '<ellipse cx="50" cy="190" rx="70" ry="5" fill="rgba(0,0,0,.25)"/>' +
      limb([[-20, 160], [-20, 186]], '#5E5B52', 3) + limb([[110, 160], [110, 186]], '#5E5B52', 3) +
      shape('M-30 150H122Q126 150 126 154V158Q126 162 122 162H-30Q-34 162 -34 158V154Q-34 150 -30 150Z', '#F4F2EA') +
      // corpo deitado: cabeça à esquerda
      limb([[44, 146], [96, 146]], skin, 9.6) + limb([[78, 146], [96, 146]], k1, 10.4, 'butt') +
      shape('M10 136H46Q50 136 50 140V150H10Z', k1) + shape('M46 137H58V150H46Z', k2) +
      limb([[18, 140], [36, 132]], skin, 7) +
      '<circle cx="-4" cy="138" r="12" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/>' +
      (lk.hair === 'careca' ? '' : '<path d="M-16 136Q-14 124 -2 125Q8 126 7 134Q-2 129 -16 136Z" fill="' + hcol + '" stroke="' + OL + '" stroke-width="1.4"/>') +
      '<path d="M-8 138l3 1M0 138l3 1" stroke="' + OL + '" stroke-width="1.6" stroke-linecap="round"/><path d="M-6 144q3 -2 6 0" stroke="' + OL + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      // médico
      limb([[146, 150], [146, 188]], '#2B3440', 7) + limb([[154, 150], [154, 188]], '#2B3440', 7) +
      shape('M138 104Q150 98 162 104L162 152H138Z', '#F4F2EA') + '<path d="M150 116v14M143 123h14" stroke="#C8102E" stroke-width="4"/>' +
      limb([[140, 110], [126, 132], [114, 142]], '#F4F2EA', 7) +
      '<circle cx="150" cy="88" r="11" fill="' + doc + '" stroke="' + OL + '" stroke-width="' + OW + '"/></svg>';
  }
  const url = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  window.ClimbixAvatar = { SKIN, HAIR_COLORS, HAIRS, BEARDS, GEAR, SWATCH, DEF, photo, url, lookOf };
})();
