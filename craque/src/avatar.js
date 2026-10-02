// Climbix: ilustração do jogador no estilo dos sprites do minigame (goleiro e barreira):
// contorno escuro grosso, proporção mais realista, sombra lateral simples. (Prancha "Criação do personagem".)
// Campos em c.look: skin, hair, hc, beard, band, bandC, tatBD/tatBE/tatPD/tatPE, boot, sole, sock, sleeve, wrist, wristC, glove.
// Poses do jornal: normal, celebra, taca (ergue a taça), triste, adeus, assina (segura a camisa nova), maca (lesão).
(function () {
  const SKIN = ['#F6D9BE', '#F1C7A0', '#E0AC80', '#C68A5E', '#A86E48', '#8D5A3B', '#6B4128', '#4A2B18'];
  // 0 preto, 1 castanho, 2 loiro, 3 ruivo, 4 grisalho · itens de pacotinho: 5 platinado, 6 azul, 7 rosa, 8 verde
  const HAIR_COLORS = ['#1E140C', '#5A3A1E', '#C9A05A', '#A8452A', '#E8E2D0', '#F4EAB8', '#2F6FD6', '#FF4FA3', '#4FC36B'];
  const HAIRS = ['curto', 'raspado', 'topete', 'black', 'trancas', 'dreads', 'moicano', 'longo', 'careca',
    'social', 'franja', 'militar', 'cacheado', 'undercut', 'degrade', 'samurai', 'afro', 'mullet', 'riscado', 'trancalonga', 'moicanoloiro'];
  const BEARDS = ['nenhuma', 'rala', 'bigode', 'cavanhaque', 'cheia', 'porfazer', 'costeleta', 'lenhador', 'bigodao', 'trancada'];
  const GEAR = { preto: '#1B1A17', branco: '#F4F2EA', vermelho: '#D8404A', azul: '#2F6FD6', neon: '#7CF03C', rosa: '#FF4FA3', laranja: '#FF8A1F', amarelo: '#F2D630', ouro: 'url(#g-ouro)', holo: 'url(#g-holo)', lima: '#B8F25C',
    roxo: '#7B4FD6', vinho: '#7A1E2E', cinza: '#8C8F93', musgo: '#2E5E3A', celeste: '#8FC8F2', bege: '#D9C7A3', prata: 'url(#g-prata)', cromo: 'url(#g-cromo)',
    // Estampas (pacotinho): chuteira camuflada, de raio e em chamas; luva tigrada
    camuflada: 'url(#p-camo)', raio: 'url(#p-raio)', chamas: 'url(#p-chamas)', tigre: 'url(#p-tigre)',
    // Lote 4: chuteiras (estampas) e luvas de goleiro (desenho por cima da luva, ver GLOVE_FX)
    bicolor: '#1B1A17', listrada: 'url(#p-listra)', pontilhada: 'url(#p-ponto)', galaxia: 'url(#p-galaxia)', camoneon: 'url(#p-camoneon)', onca: 'url(#p-onca)', brasil: 'url(#p-brasil)', cristal: 'url(#p-cristal)',
    velcro: '#F4F2EA', dedos: '#F4F2EA', luvafogo: 'url(#g-fogo)', luvaouro: 'url(#g-ouro)' };
  const SWATCH = { prata: 'linear-gradient(135deg, #FFFFFF, #C9CED6 50%, #7F8790)', cromo: 'linear-gradient(135deg, #5A6470, #F4F7FA 35%, #8A939E 55%, #FFFFFF 75%, #4A535E)',
    ouro: 'linear-gradient(135deg, #FFE68A, #F2C230 50%, #B98700)', holo: 'linear-gradient(135deg, #8FE3FF, #C79BFF 35%, #FF9BD5 65%, #FFE38F)',
    camuflada: 'radial-gradient(circle at 30% 30%, #3E4628 22%, transparent 24%), radial-gradient(circle at 70% 65%, #A39A63 24%, transparent 26%), #6B7444',
    raio: 'linear-gradient(120deg, #1B1A17 40%, #F2D630 41% 55%, #1B1A17 56%)', chamas: 'linear-gradient(0deg, #FF6A1F, #FFD23F 45%, #1B1A17 46%)',
    tigre: 'repeating-linear-gradient(160deg, #FF8A1F 0 5px, #1B1A17 5px 7px)',
    bicolor: 'linear-gradient(90deg, #1B1A17 60%, #F4F2EA 61%)', listrada: 'repeating-linear-gradient(0deg, #F4F2EA 0 4px, #2F6FD6 4px 7px)',
    pontilhada: 'radial-gradient(circle, #F4F2EA 1.6px, transparent 2px) 0 0 / 7px 7px, #1B1A17',
    galaxia: 'radial-gradient(circle at 30% 40%, #7B4FD6aa, transparent 45%), radial-gradient(circle at 70% 70%, #2F6FD6aa, transparent 40%), radial-gradient(circle, #fff 1px, transparent 1.4px) 0 0 / 9px 8px, #14193D',
    camoneon: 'radial-gradient(circle at 30% 30%, #7CF03C 22%, transparent 24%), radial-gradient(circle at 70% 65%, #2C5E1A 24%, transparent 26%), #1B1A17',
    onca: 'radial-gradient(circle, #B8782A 2px, #2A1A0A 2.4px 3.4px, transparent 3.6px) 0 0 / 11px 10px, #E8B04A',
    brasil: 'radial-gradient(circle, #2F5FC4 26%, transparent 28%), linear-gradient(135deg, transparent 30%, #F2D630 31% 69%, transparent 70%), #1E9A43',
    cristal: 'linear-gradient(135deg, #E9F8FF, #8CCBEA 40%, #FFFFFF 55%, #A8DBF2 75%, #E9F8FF)',
    velcro: 'linear-gradient(180deg, #1B1A17 30%, #F4F2EA 31%)', dedos: 'linear-gradient(90deg, #D8404A 25%, #F2D630 25% 50%, #2F6FD6 50% 75%, #22A45D 75%)',
    luvafogo: 'linear-gradient(0deg, #D8261E, #FF8A1F 50%, #FFE14A)', luvaouro: 'linear-gradient(135deg, #FFE68A, #F2C230 50%, #B98700)' };
  const PATTERNS = '<pattern id="p-camo" width="9" height="7" patternUnits="userSpaceOnUse"><rect width="9" height="7" fill="#6B7444"/><ellipse cx="2" cy="2" rx="2.4" ry="1.4" fill="#3E4628"/><ellipse cx="6.5" cy="5" rx="2.6" ry="1.5" fill="#A39A63"/><ellipse cx="7.4" cy="1.2" rx="1.4" ry="1" fill="#2A2D1C"/></pattern>' +
    '<pattern id="p-raio" width="7" height="9" patternUnits="userSpaceOnUse" patternTransform="translate(0 183.5)"><rect width="7" height="9" fill="#1B1A17"/><path d="M4.4 0L1.8 4.6H4.6L2.4 9" stroke="#F2D630" stroke-width="1.3" fill="none" stroke-linejoin="round"/></pattern>' +
    '<pattern id="p-chamas" width="6" height="9" patternUnits="userSpaceOnUse" patternTransform="translate(0 183.4)"><rect width="6" height="9" fill="#1B1A17"/><path d="M0 9C.4 6 2 6 1.6 2.4C3.2 4 3.6 6 3.4 6.8C4.2 5.6 5.2 5.2 4.9 3.4C6 5.2 6 7.6 5.6 9Z" fill="#FF6A1F"/><path d="M1.2 9C1.4 7.6 2.4 7.2 2.3 5.8C3.2 6.8 3.5 7.9 3.3 9Z" fill="#FFD23F"/></pattern>' +
    '<pattern id="p-tigre" width="5" height="4" patternUnits="userSpaceOnUse"><rect width="5" height="4" fill="#FF8A1F"/><path d="M0 1.2Q2.5 2.2 5 .8M0 3.2Q2.5 4.2 5 2.8" stroke="#1B1A17" stroke-width=".8" fill="none"/></pattern>';
  const BOOT_Y = 'patternTransform="translate(0 183.6)"';
  const PATTERNS2 = '<pattern id="p-listra" width="4" height="2.8" patternUnits="userSpaceOnUse" ' + BOOT_Y + '><rect width="4" height="2.8" fill="#F4F2EA"/><rect width="4" height="1.1" fill="#2F6FD6"/></pattern>' +
    '<pattern id="p-ponto" width="3.4" height="3.4" patternUnits="userSpaceOnUse" ' + BOOT_Y + '><rect width="3.4" height="3.4" fill="#1B1A17"/><circle cx=".9" cy=".9" r=".6" fill="#F4F2EA"/><circle cx="2.6" cy="2.6" r=".6" fill="#F4F2EA"/></pattern>' +
    '<pattern id="p-galaxia" width="10" height="8.4" patternUnits="userSpaceOnUse" ' + BOOT_Y + '><rect width="10" height="8.4" fill="#14193D"/><ellipse cx="3" cy="4" rx="3.4" ry="1.8" fill="#7B4FD6" opacity=".55"/><ellipse cx="8" cy="6.6" rx="2.6" ry="1.4" fill="#2F6FD6" opacity=".55"/>' +
      '<circle cx="1.2" cy="1.4" r=".35" fill="#fff"/><circle cx="6.4" cy="2.2" r=".45" fill="#fff"/><circle cx="4.6" cy="6.8" r=".3" fill="#fff"/><circle cx="8.8" cy="4" r=".3" fill="#FFE68A"/><circle cx="2.4" cy="7.6" r=".25" fill="#fff"/></pattern>' +
    '<pattern id="p-camoneon" width="9" height="7" patternUnits="userSpaceOnUse"><rect width="9" height="7" fill="#1B1A17"/><ellipse cx="2" cy="2" rx="2.4" ry="1.4" fill="#7CF03C"/><ellipse cx="6.5" cy="5" rx="2.6" ry="1.5" fill="#2C5E1A"/><ellipse cx="7.4" cy="1.2" rx="1.4" ry="1" fill="#B8F25C"/></pattern>' +
    '<pattern id="p-onca" width="6" height="5.6" patternUnits="userSpaceOnUse" ' + BOOT_Y + '><rect width="6" height="5.6" fill="#E8B04A"/><circle cx="1.6" cy="1.6" r="1.05" fill="#B8782A" stroke="#2A1A0A" stroke-width=".55" stroke-dasharray="1.4 .6"/><circle cx="4.6" cy="4.2" r=".95" fill="#B8782A" stroke="#2A1A0A" stroke-width=".55" stroke-dasharray="1.2 .6"/><circle cx="4.4" cy="1" r=".35" fill="#2A1A0A"/><circle cx="1.2" cy="4.6" r=".3" fill="#2A1A0A"/></pattern>' +
    '<pattern id="p-brasil" width="12" height="8.4" patternUnits="userSpaceOnUse" ' + BOOT_Y + '><rect width="12" height="8.4" fill="#1E9A43"/><path d="M6 .8L11.2 4.2L6 7.6L.8 4.2Z" fill="#F2D630"/><circle cx="6" cy="4.2" r="2" fill="#2F5FC4"/><path d="M4.1 3.8Q6 3.2 7.9 4.3" stroke="#F4F2EA" stroke-width=".4" fill="none"/></pattern>' +
    '<pattern id="p-cristal" width="8" height="8.4" patternUnits="userSpaceOnUse" ' + BOOT_Y + '><rect width="8" height="8.4" fill="#BFE6F7"/><path d="M0 0L4 3.2L8 0ZM0 8.4L4 3.2L8 8.4Z" fill="#E9F8FF"/><path d="M0 0L4 3.2L0 8.4ZM8 0L4 3.2L8 8.4Z" fill="#8CCBEA" opacity=".7"/>' +
      '<path d="M5.6 1.2l.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3Z" fill="#fff"/></pattern>';
  // Luvas do lote 4: o desenho vai por cima da luva (h = centro da mão)
  const GLOVE_FX = {
    velcro: h => '<rect x="' + (h[0] - 5.4) + '" y="' + (h[1] - 3) + '" width="10.8" height="3.4" fill="#1B1A17" stroke="' + OL + '" stroke-width="1.2"/><rect x="' + (h[0] - 3.6) + '" y="' + (h[1] - 2.2) + '" width="7.2" height="1.8" rx=".6" fill="#D8404A"/>',
    dedos: h => ['#D8404A', '#F2D630', '#2F6FD6', '#22A45D'].map((c, i) => '<rect x="' + (h[0] - 4.6 + i * 2.4) + '" y="' + (h[1] + 1.4) + '" width="2" height="' + (i === 0 || i === 3 ? 5 : 6.6) + '" rx="1" fill="' + c + '"/>').join(''),
    luvafogo: h => '<path d="M' + (h[0] - 4) + ' ' + (h[1] + 5.2) + 'q.8-3 1.8-1.4q.4-3.4 2.4-5q-.2 3.2 1.1 4.1q.9-1.8 2.2-2.2q-.4 2.8.5 4.5Q' + h[0] + ' ' + (h[1] + 8.6) + ' ' + (h[0] - 4) + ' ' + (h[1] + 5.2) + 'Z" fill="#FFE14A" opacity=".9"/>',
    luvaouro: h => '<path d="M' + (h[0] + 2.6) + ' ' + (h[1] - 1.2) + 'l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5Z" fill="#FFFFFF"/><rect x="' + (h[0] - 5.4) + '" y="' + (h[1] - 3) + '" width="10.8" height="2" fill="#B98700" stroke="' + OL + '" stroke-width="1"/>',
  };
  const DEF = { skin: 3, hair: 'curto', hc: 0, beard: 'nenhuma', band: 'nenhuma', bandC: 'branco', tattoo: 'nenhuma', tattooSide: 'direito', boot: 'preto', sole: 'branco', sock: 'alto', sleeve: 'curta', wrist: 'nenhuma', wristC: 'branco', glove: 'lima', cel: 'padrao' };
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
    // Black e black power: volume atrás da cabeça e a frente crespa cobrindo o alto da testa (linha do cabelo ondulada)
    const afroFront = (top, y) => {
      // Linha do cabelo ondulada, da têmpora direita à esquerda
      const wave = 'Q72.6 ' + (y + 3) + ' 70.2 ' + (y + 2.4) + 'Q68.4 ' + (y - 0.6) + ' 65.4 ' + (y + 0.4) + 'Q62.8 ' + (y - 1.6) + ' 60 ' + (y - 0.4) +
        'Q57.2 ' + (y - 1.6) + ' 54.6 ' + (y + 0.4) + 'Q51.6 ' + (y - 0.6) + ' 49.8 ' + (y + 2.4) + 'Q47.4 ' + (y + 3) + ' 46 30';
      // Preenchimento sem contorno em cima (emenda com o volume de trás); só a linha do cabelo leva traço
      return '<path d="M45 31.4C43.8 ' + (top + 5) + ' 51 ' + (top - 1) + ' 60 ' + (top - 1) + 'S76.2 ' + (top + 5) + ' 75 31.4L74 30' + wave + 'Z" fill="' + col + '"/>' +
        '<path d="M74 30' + wave + '" fill="none" stroke="' + OL + '" stroke-width="' + OW + '" stroke-linecap="round" stroke-linejoin="round"/>';
    };
    if (style === 'black') return [shape('M60 7C72 7 79 15 78.6 26C78.4 32 75.6 35 73.6 35.6L46.4 35.6C44.4 35 41.6 32 41.4 26C41 15 48 7 60 7Z', col), afroFront(11.6, 21.4)];
    if (style === 'moicano') return ['', '<path d="' + tight + '" fill="' + col + '" opacity=".35"/>' + shape('M56.4 24V12.4C56.4 8.6 63.6 8.6 63.6 12.4V24Z', col)];
    if (style === 'longo') return [shape('M45.4 30C44 17 51 11.6 60 11.6S76 17 74.6 30L76 52Q60 56 44 52Z', col), shape(cap, col)];
    if (style === 'topete') return ['', shape(cap, col) + shape('M49.6 23C48.6 12.6 56 7.2 64.6 8.4C71.4 9.4 74.4 15 72.6 21.6C69 17.4 63.2 16.4 57.4 18.8C54.4 20 51.6 21.4 49.6 23Z', col)];
    if (style === 'trancas') return ['', shape(tight, col) +
      '<path d="M52.4 23.2Q51.8 20.2 53.6 17.8M56.4 22.2Q56 18.6 57.4 15.8M60 21.8V15.4M63.6 22.2Q64 18.6 62.6 15.8M67.6 23.2Q68.2 20.2 66.4 17.8" stroke="' + OL + '" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>'];
    if (style === 'dreads') {
      const d = (x1, y1, x2, y2) => limb([[x1, y1], [x2, y2]], col, 3.4);
      return [d(47.4, 26, 44.6, 52) + d(51, 24, 49.6, 54) + d(69, 24, 70.4, 54) + d(72.6, 26, 75.4, 52),
        shape(cap, col) + d(53.6, 17.6, 52.6, 25) + d(58.6, 15.8, 58.2, 23.4) + d(63.4, 15.8, 64, 23.4) + d(67.8, 17.4, 68.6, 25)];
    }
    // ---- cortes de pacotinho (12) ----
    const SIDES = '<path d="' + tight + '" fill="' + col + '" opacity=".42"/>'; // laterais raspadas
    if (style === 'social') return ['', shape('M46.6 30C45.6 18.4 51.6 12.8 60 12.8S74.6 18.4 73.4 30C72.4 25.4 69.6 22.6 65 21.6C60.4 20.6 56.6 20.8 53.2 22.2C50.2 23.6 47.8 26.2 46.6 30Z', col) +
      '<path d="M53.4 14.4Q55 18 53.8 21.8" stroke="' + OL + '" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M57.6 14.4Q64 15.6 69.6 21.4M60.6 14.2Q67.6 16.4 72 24" stroke="' + OL + '" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".35"/>'];
    if (style === 'franja') return ['', shape('M46.4 30C45.2 18 51.6 12.6 60 12.6S74.8 18 73.6 30C73.2 27.4 72.6 25.4 71.6 23.8Q67 24.6 64.4 23.4Q62 24.6 59.6 23.4Q57.2 24.6 54.8 23.4Q52 24.6 48.4 23.8C47.4 25.4 46.8 27.4 46.4 30Z', col)];
    if (style === 'militar') return ['', shape('M47.2 28.8C46.6 23 47.2 17.2 50.8 15L69.2 15C72.8 17.2 73.4 23 72.8 28.8C70.6 25 65.8 23.2 60 23.2S49.4 25 47.2 28.8Z', col) +
      '<path d="M51 15.4V22M55 15.2V21.6M60 15V21.4M65 15.2V21.6M69 15.4V22" stroke="' + OL + '" stroke-width=".7" opacity=".3"/>'];
    if (style === 'cacheado') {
      let curls = '';
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.06 + i * 0.11), x = 60 + Math.cos(a) * 13.6, y = 26.4 + Math.sin(a) * 12.6; curls += '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="3.3" fill="' + col + '" stroke="' + OL + '" stroke-width="1.6"/>'; }
      return ['', shape(cap, col) + curls + '<path d="M52 19.6q1.4-1.6 2.8 0M58.6 17.6q1.4-1.6 2.8 0M65 19.6q1.4-1.6 2.8 0" stroke="' + OL + '" stroke-width=".9" fill="none" opacity=".45"/>'];
    }
    if (style === 'undercut') return ['', SIDES + shape('M48.8 23.2C47.6 14.6 53.8 9.2 61.6 9.4C69.6 9.6 74.4 14.6 72.6 21.8C69.4 18.4 64.8 17.6 60.2 18.6C55.8 19.6 51.8 21.2 48.8 23.2Z', col) +
      '<path d="M53 18.4Q58 12.4 67 12.6M56.6 19.4Q62 14.6 70.6 16.4" stroke="' + OL + '" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".35"/>'];
    if (style === 'degrade') return ['', SIDES + shape('M49 23.4C48.8 16.2 53.8 12.8 60 12.8S71.2 16.2 71 23.4C68 21 64.2 20.2 60 20.2S52 21 49 23.4Z', col)];
    if (style === 'samurai') return ['', SIDES + shape('M50.6 22.6C50.6 17 54.6 14 60 14S69.4 17 69.4 22.6C66.8 21 63.6 20.4 60 20.4S53.2 21 50.6 22.6Z', col) +
      shape('M60 3.6C63.4 3.6 65.4 5.8 65.4 8.6S63.4 13.6 60 13.6S54.6 11.4 54.6 8.6S56.6 3.6 60 3.6Z', col) +
      '<rect x="57" y="12" width="6" height="2.4" rx="1" fill="#D8404A" stroke="' + OL + '" stroke-width="1"/>'];
    if (style === 'afro') {
      let tex = '';
      const r = rng(7);
      for (let i = 0; i < 26; i++) { const x = 40 + r() * 40, y = 6 + r() * 26; tex += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r=".7" fill="' + OL + '" opacity=".22"/>'; }
      return [shape('M60 1.6C75.8 1.6 85 12 84.6 25C84.4 33.6 80.6 38.4 76.4 39.2L43.6 39.2C39.4 38.4 35.6 33.6 35.4 25C35 12 44.2 1.6 60 1.6Z', col) + tex, afroFront(11, 21)];
    }
    if (style === 'mullet') return [shape('M48.4 33.6C47.6 40 47.8 45.4 49.6 50Q52.6 51.6 55.2 50L55.6 44.4H64.4L64.8 50Q67.4 51.6 70.4 50C72.2 45.4 72.4 40 71.6 33.6Z', col) +
      '<path d="M50.8 43.6L51.4 49.6M69.2 43.6L68.6 49.6" stroke="' + OL + '" stroke-width=".8" opacity=".35"/>', shape(tight, col)];
    if (style === 'riscado') return ['', '<path d="' + tight + '" fill="' + col + '" opacity=".55"/>' +
      '<path d="M48.2 25.6L50.2 22.4L51.6 25L53.8 21.4L55 23.8" stroke="#F4E6D4" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>'];
    if (style === 'trancalonga') {
      const braid = (x1, y1, x2, y2) => {
        let o = limb([[x1, y1], [x2, y2]], col, 3.6);
        for (let t = 0.12; t < 1; t += 0.13) { const [x, y] = lerp([x1, y1], [x2, y2], t); o += '<path d="M' + (x - 1.6).toFixed(2) + ' ' + (y - .7).toFixed(2) + 'l3.2 1.4" stroke="' + OL + '" stroke-width=".7" opacity=".5"/>'; }
        return o;
      };
      return [braid(47.2, 27, 43.8, 58) + braid(50.6, 25, 48.8, 60) + braid(69.4, 25, 71.2, 60) + braid(72.8, 27, 76.2, 58),
        shape(tight, col) + '<path d="M52.4 26.4Q51.6 19.6 54.6 15.4M56.6 24.4Q56.4 18 58.4 14.2M61.6 24.2Q62.2 18 61.8 14.2M66 25Q67.4 19.4 65.6 15.2M69.6 27Q71.4 21.4 69.4 17.4" stroke="' + OL + '" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>'];
    }
    if (style === 'moicanoloiro') return ['', '<path d="' + tight + '" fill="' + col + '" opacity=".35"/>' +
      shape('M55.4 24.6L54.6 15.2L57.2 16.8L56.4 8.6L59.2 11.2L60.4 3.2L62.2 10.8L65 7.6L64.8 15.6L66.4 14.4L64.6 24.6Z', '#F4EAB8') +
      '<path d="M55.8 22.6L64.2 22.6" stroke="' + col + '" stroke-width="2.6" opacity=".85"/>' +
      '<path d="M58.4 12.6L58.8 20.6M61.4 9.6L61.4 20.6" stroke="' + OL + '" stroke-width=".7" opacity=".25"/>'];
    return ['', shape(cap, col)];
  }
  // Barba por fazer: pontinhos no queixo e no buço, sempre nos mesmos lugares (fora da boca)
  const STUBBLE = (() => {
    const p = [];
    for (let y = 35.2; y <= 45.4; y += 1.25) for (let x = 47.6 + ((y * 4) % 2) * .6; x <= 72.6; x += 1.5) {
      const dx = (x - 60) / 12.6, dy = (y - 30.4) / 14.8;
      if (dx * dx + dy * dy > 1 || (Math.abs(x - 60) < 4.4 && y > 38.2 && y < 43) || (y < 37 && Math.abs(x - 60) < 2.4)) continue;
      if (y < 37.4 && Math.abs(x - 60) > 9) continue;
      p.push('M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h.01');
    }
    return p.join('');
  })();
  function beardOf(style, col, skin) {
    const jaw = 'M46.8 32C47 42 52.6 46 60 46S73 42 73.2 32C70.6 37.6 66.6 38.8 60 38.8S49.4 37.6 46.8 32Z';
    const stache = '<path d="M55.4 37.6Q60 34.8 64.6 37.6Q60 37.1 55.4 37.6Z" fill="' + col + '" stroke="' + col + '" stroke-width="1.4" stroke-linejoin="round"/>';
    if (style === 'rala') return '<path d="' + jaw + '" fill="' + col + '" opacity=".32"/>';
    if (style === 'bigode') return stache;
    if (style === 'cavanhaque') return stache + '<path d="M56.8 41.6Q60 48.4 63.2 41.6Q60 43 56.8 41.6Z" fill="' + col + '"/>';
    if (style === 'porfazer') return '<path d="' + STUBBLE + '" stroke="' + col + '" stroke-width=".85" stroke-linecap="round" opacity=".7"/>';
    if (style === 'costeleta') return '<path d="M47.4 21.6H51.2L51.4 37.6Q50.6 40.2 48.9 38.8Q47.7 36 47.5 30Z" fill="' + col + '"/><path d="M72.6 21.6H68.8L68.6 37.6Q69.4 40.2 71.1 38.8Q72.3 36 72.5 30Z" fill="' + col + '"/>';
    if (style === 'bigodao') return '<path d="M53.4 39.6Q55 35.4 60 36.6Q65 35.4 66.6 39.6L67.2 43.6Q65.8 44.2 65.2 41.4Q62.6 39.6 60 39.8Q57.4 39.6 54.8 41.4Q54.2 44.2 52.8 43.6Z" fill="' + col + '" stroke="' + OL + '" stroke-width=".9" stroke-linejoin="round"/>';
    if (style === 'lenhador') return '<path d="M46.6 25.2L46.2 31C46.6 40 49.6 47.6 54.2 51.4Q55.8 53.6 57.6 52.4Q60 54.8 62.4 52.4Q64.2 53.6 65.8 51.4C70.4 47.6 73.4 40 73.8 31L73.4 25.2L70.6 25.6C70.8 30.4 69.8 34 67.2 36.6Q64 38.6 60 38.2Q56 38.6 52.8 36.6C50.2 34 49.2 30.4 49.4 25.6Z" fill="' + col + '" stroke="' + OL + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M50.6 40.6q1.2 3.4 3.4 5.4M69.4 40.6q-1.2 3.4-3.4 5.4M57.4 46.4q.6 2.4 2.6 3.6M62.6 46.4q-.6 2.4-2.6 3.6" stroke="' + OL + '" stroke-width=".7" fill="none" stroke-linecap="round" opacity=".45"/>' +
      '<path d="M54.6 39Q57 35.8 60 36.8Q63 35.8 65.4 39Q63.4 38.2 60 39Q56.6 38.2 54.6 39Z" fill="' + col + '" stroke="' + OL + '" stroke-width=".8" stroke-linejoin="round"/>';
    if (style === 'navalha') return beardOf('cheia', col); // estilo antigo ("com desenho"): vira a barba cheia
    if (style === 'trancada') return stache + '<path d="M56.6 41.4Q60 47.6 63.4 41.4Q60 43 56.6 41.4Z" fill="' + col + '"/>' +
      [46.8, 49.6, 52.4].map(y => '<ellipse cx="60" cy="' + y + '" rx="1.9" ry="1.7" fill="' + col + '" stroke="' + OL + '" stroke-width=".9"/>').join('') +
      '<rect x="58.3" y="53.4" width="3.4" height="1.4" rx=".6" fill="#D8404A" stroke="' + OL + '" stroke-width=".6"/><path d="M58.8 54.8L58.2 57.4M60 54.8V57.8M61.2 54.8L61.8 57.4" stroke="' + col + '" stroke-width="1" stroke-linecap="round"/>';
    // Cheia: desce pela lateral do rosto (costeleta), a linha da bochecha sobe em diagonal e o queixo fecha levemente em ponta
    if (style === 'cheia') return '<path d="M47.1 25.4L46.9 31C47.5 38.4 51.2 44.4 55.8 46.6Q60 48.6 64.2 46.6C68.8 44.4 72.5 38.4 73.1 31L72.9 25.4L70.5 25.8C70.7 30.4 69.8 33.8 67.2 36.4Q64 38.6 60 38.2Q56 38.6 52.8 36.4C50.2 33.8 49.3 30.4 49.5 25.8Z" fill="' + col + '"/>' +
      '<path d="M50.4 39.4q1.2 2.2 2.8 3.4M69.6 39.4q-1.2 2.2-2.8 3.4M58.4 44.6l.4 1.6M61.6 44.6l-.4 1.6" stroke="' + OL + '" stroke-width=".6" stroke-linecap="round" opacity=".3" fill="none"/>' + stache;
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
  // Comemorações de pacotinho (c.look.cel): trocam os braços da pose "celebra".
  // front: braços que passam na frente do corpo; serio: sem o sorriso aberto
  const CEL = {
    abertos: { a: [[[44, 57], [30, 51], [16, 44]], [[76, 57], [90, 51], [104, 44]]] },
    ceu: { a: [[[44, 57], [37.6, 81], [34.6, 104]], [[76, 57], [81.6, 37], [75.6, 16.4]]], finger: 1 },
    escudo: { a: [[[44, 57], [37.6, 81], [34.6, 104]], [[76, 57], [85, 75], [69, 66]]], front: 'R' },
    aviao: { a: [[[44, 57], [29, 61], [14, 66]], [[76, 57], [91, 53], [106, 49]]] },
    coracao: { a: [[[44, 57], [41, 77], [56.4, 69]], [[76, 57], [79, 77], [63.6, 69]]], front: 'LR', heart: 1 },
    bebe: { a: [[[44, 57], [40, 79], [53.6, 88]], [[76, 57], [81, 78], [66, 85]]], front: 'LR' },
    calma: { a: [[[44, 57], [35, 76], [21, 79]], [[76, 57], [85, 76], [99, 79]]], palms: 1 },
    estatua: { a: [[[44, 57], [47, 79], [72, 69]], [[76, 57], [73, 79], [48, 69]]], front: 'LR', serio: 1 },
  };
  // Acessórios de pacotinho (c.look.extra), desenhados por cima do boneco, no mesmo traço.
  // Fita do Bonfim e faixa de capitão acompanham o braço da pose.
  const NUM_FX = { ouro: 'url(#g-ouro)', holo: 'url(#g-holo)', neon: '#7CF03C', fogo: 'url(#g-fogo)', contorno: 'none' };
  const band2 = (s, e, t0, t1, col, w) => limb([lerp(s, e, t0), lerp(s, e, t1)], col, w, 'butt');
  const NOHAIR = o => o.lk.hair === 'careca' || o.lk.hair === 'raspado';
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
    // Detalhes de cabelo (lote 3): por cima de qualquer corte; sem cabelo, só os que não dependem dele
    mecha: o => (NOHAIR(o) ? '' : '<path d="M51.4 19.6Q54.4 14.6 59.6 13.4" stroke="#2F6FD6" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M52.6 18.4Q55 15.4 58.2 14.6" stroke="#8FC0FF" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".8"/>'),
    bandana: () => '<path d="M46.8 24.4Q60 17.4 73.2 24.4" stroke="' + OL + '" stroke-width="5.6" fill="none" stroke-linecap="round"/><path d="M46.8 24.4Q60 17.4 73.2 24.4" stroke="#D8404A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M53 20.6l.01 0M58 19.2l.01 0M63 19.2l.01 0M68 20.8l.01 0" stroke="#F4F2EA" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M73 23.4L79.4 27.6L77.6 29.6ZM73 24.4L77.8 32.4L75.4 33Z" fill="#D8404A" stroke="' + OL + '" stroke-width="1.2" stroke-linejoin="round"/>',
    rabo: o => (NOHAIR(o) ? '' : shape('M72.4 20.6Q80.4 23.6 79.6 33.6Q79 41.6 75.8 46.4Q75.6 38.6 73.8 33.2Q74.6 27 72.4 20.6Z', o.hcol) +
      '<rect x="72.6" y="21.6" width="3.2" height="2.6" rx="1" transform="rotate(28 74.2 22.9)" fill="#D8404A" stroke="' + OL + '" stroke-width=".8"/>'),
    sobrancelha: o => '<path d="M65.5 25.4L64.9 28.4" stroke="' + o.skin + '" stroke-width="1.3" stroke-linecap="round"/>',
    glitter: o => (NOHAIR(o) ? '' : [[51.6, 19.4, 1], [55.4, 15, 1.3], [60.6, 13.2, 1], [65.4, 14.8, 1.4], [69.2, 19, 1], [58, 17.4, .8], [63.4, 18, .9], [53.6, 21.6, .7], [67, 21.4, .8]]
      .map(([x, y, r]) => '<path d="M' + x + ' ' + (y - r * 1.6) + 'L' + (x + r * .45) + ' ' + (y - r * .45) + 'L' + (x + r * 1.6) + ' ' + y + 'L' + (x + r * .45) + ' ' + (y + r * .45) + 'L' + x + ' ' + (y + r * 1.6) + 'L' + (x - r * .45) + ' ' + (y + r * .45) + 'L' + (x - r * 1.6) + ' ' + y + 'L' + (x - r * .45) + ' ' + (y - r * .45) + 'Z" fill="#FFE68A" stroke="#B98700" stroke-width=".3"/>').join('')),
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
  // Barba cresce com a idade: até 17 anos, nenhuma; aos 18 e 19, as grandes aparecem ralas; aos 20, a escolhida.
  // Sem idade (prévia da criação do jogador), mostra a barba escolhida.
  const BIG_BEARD = { cheia: 'rala', lenhador: 'rala', trancada: 'rala', bigodao: 'bigode', navalha: 'rala' };
  function beardAtAge(b, age) {
    if (typeof age !== 'number' || !b || b === 'nenhuma') return b;
    if (age < 18) return 'nenhuma';
    if (age < 20) return BIG_BEARD[b] || b;
    return b;
  }
  function photo(pose, kit, c, opts) {
    opts = opts || {};
    const id = 'a' + (++uid);
    c = Object.assign({}, c, { look: Object.assign({}, lookOf(c), { beard: beardAtAge(lookOf(c).beard, c.age) }) });
    if (pose === 'maca') return stretcher(kit, c, opts);
    const lk = Object.assign({}, DEF, c.look || {});
    const [k1, k2] = kit, skin = SKIN[lk.skin] ?? SKIN[3], hcol = HAIR_COLORS[lk.hc] ?? HAIR_COLORS[0], gk = c.pos === 'GOL';
    const g = k => GEAR[k] || GEAR.preto;
    // Cabelo nas cores do clube (lendário): metade na 1ª cor do uniforme, metade na 2ª
    const clube = Array.isArray(lk.extra) && lk.extra.includes('clube') && lk.hair !== 'careca';
    let [hBack, hFront] = hairParts(lk.hair, clube ? k1 : hcol);
    if (clube) {
      const [b2, f2] = hairParts(lk.hair, k2), cp = id + '-hc';
      hBack = '<clipPath id="' + cp + '"><rect x="60" y="-40" width="90" height="160"/></clipPath>' + hBack + '<g clip-path="url(#' + cp + ')">' + b2 + '</g>';
      hFront += '<g clip-path="url(#' + cp + ')">' + f2 + '</g>';
    }
    const long = lk.sleeve === 'comprida';
    const defs = '<defs><linearGradient id="g-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE68A"/><stop offset=".5" stop-color="#F2C230"/><stop offset="1" stop-color="#B98700"/></linearGradient>' +
      '<linearGradient id="g-prata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C9CED6"/><stop offset="1" stop-color="#7F8790"/></linearGradient>' +
      '<linearGradient id="g-cromo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5A6470"/><stop offset=".35" stop-color="#F4F7FA"/><stop offset=".55" stop-color="#8A939E"/><stop offset=".75" stop-color="#FFFFFF"/><stop offset="1" stop-color="#4A535E"/></linearGradient>' +
      '<linearGradient id="g-fogo" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#D8261E"/><stop offset=".5" stop-color="#FF8A1F"/><stop offset="1" stop-color="#FFE14A"/></linearGradient>' +
      '<linearGradient id="g-holo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8FE3FF"/><stop offset=".35" stop-color="#C79BFF"/><stop offset=".65" stop-color="#FF9BD5"/><stop offset="1" stop-color="#FFE38F"/></linearGradient>' + PATTERNS + PATTERNS2 + '</defs>';
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
    // Braço em partes: part = undefined (inteiro), 'upper' (ombro ao cotovelo) ou 'fore' (antebraço e mão).
    // A manga (sleeve) é desenhada à parte, por cima do tronco: ombro arredondado e barra no punho, em qualquer pose.
    const sleeve = ([s0, e]) => {
      const s = lerp(s0, e, .1); // o ombro da manga começa um pouco para fora, para não ocupar o peito
      if (long) return limb([s, e], k1, 7.4); // manga comprida: o braço todo até o cotovelo na frente do tronco
      const c = lerp(s0, e, .55), dx = e[0] - s0[0], dy = e[1] - s0[1], L = Math.hypot(dx, dy) || 1, W = 10, nx = -dy / L * (W / 2 + .9), ny = dx / L * (W / 2 + .9);
      return limb([s, c], k1, W) + '<path d="M' + pts([s, c]) + '" stroke="' + k1 + '" stroke-width="' + W + '" stroke-linecap="butt"/>' +
        '<path d="M' + (c[0] + nx).toFixed(2) + ' ' + (c[1] + ny).toFixed(2) + 'L' + (c[0] - nx).toFixed(2) + ' ' + (c[1] - ny).toFixed(2) + '" stroke="' + OL + '" stroke-width="' + OW + '" stroke-linecap="butt"/>';
    };
    const arm = ([s, e, h], side, part) => {
      let o = '';
      const tk = side === 'direito' ? 'BD' : 'BE', tat = tatOf(tk);
      if (part !== 'fore') {
        o += limb(part === 'upper' ? [s, e] : [s, e, h], long ? k1 : skin, 7.4);
        if (!long && tat !== 'nenhuma' && !part) o += tattoo([s, e, h], tat, tk, 3.6, 'lower');
        if (part === 'upper') return o;
      }
      if (part === 'fore') {
        o += limb([e, h], long ? k1 : skin, 7.4);
        if (!long && tat !== 'nenhuma') o += tattoo([s, e, h], tat, tk, 3.6, 'lower');
      }
      if (long) o += limb(along(e, h, .78, 1), k2, 7.4, 'butt');
      if (lk.wrist === 'duas' || (lk.wrist === 'uma' && side === 'esquerdo')) o += limb(along(e, h, .66, .84), g(lk.wristC), 8.2, 'butt');
      // Luva: desenhada com os dedos para baixo e girada na direção do antebraço (punho virado para o cotovelo)
      if (gk) o += '<g transform="rotate(' + (Math.atan2(h[1] - e[1], h[0] - e[0]) * 180 / Math.PI - 90).toFixed(1) + ' ' + h[0] + ' ' + h[1] + ')">' +
        shape('M' + (h[0] - 5.4) + ' ' + (h[1] - 3) + 'h10.8v7.4q0 4.6-5.4 4.6t-5.4-4.6Z', g(lk.glove)) + (GLOVE_FX[lk.glove] ? GLOVE_FX[lk.glove](h) : '') +
        '<path d="M' + (h[0] - 2.2) + ' ' + (h[1] + 2.4) + 'v3.2M' + h[0] + ' ' + (h[1] + 2.4) + 'v3.6M' + (h[0] + 2.2) + ' ' + (h[1] + 2.4) + 'v3.2" stroke="' + OL + '" stroke-width=".9" stroke-linecap="round" opacity=".6"/></g>';
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
        (lk.boot === 'bicolor' ? '<path d="M' + X(4.2) + ' 185.4Q' + X(5.6) + ' 184.8 ' + X(6.4) + ' 185.2Q' + X(12) + ' 186.4 ' + X(12) + ' 190Q' + X(12) + ' 192 ' + X(10) + ' 192H' + X(4.2) + 'Z" fill="' + (lk.sole === 'preto' ? '#F4F2EA' : g(lk.sole)) + '" stroke="' + OL + '" stroke-width="1.2" stroke-linejoin="round"/>' : '') +
        '<rect x="' + Math.min(+X(-5.6), +X(12.4)) + '" y="191.4" width="18" height="3.4" rx="1.5" fill="' + g(lk.sole) + '" stroke="' + OL + '" stroke-width="1.6"/>';
    };
    const cel = pose === 'celebra' && CEL[lk.cel] || null;
    const happy = (pose === 'celebra' && !(cel && cel.serio)) || pose === 'taca', sad = pose === 'triste' || pose === 'adeus';
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
    const [L, R] = cel ? cel.a : ARMS[pose] || ARMS.normal;
    const fL = cel && /L/.test(cel.front || ''), fR = cel && /R/.test(cel.front || '');
    // Detalhes da comemoração: dedo para o céu, coração entre as mãos, palmas para baixo
    // Dedo indicador saindo do lado do punho virado para a cabeça, na direção do antebraço
    const fing = () => { const [, e, h] = R, dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      const b = [h[0] + ux * 2.6 - uy * -2.2, h[1] + uy * 2.6 + ux * -2.2], t = [b[0] + ux * 6.4, b[1] + uy * 6.4], d = 'M' + pts([b, t]);
      return '<path d="' + d + '" stroke="' + OL + '" stroke-width="4.6" stroke-linecap="round"/><path d="' + d + '" stroke="' + (gk ? g(lk.glove) : skin) + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M' + pts([[h[0] + 1.2, h[1] - .6], [h[0] + 2.8, h[1] + 1]]) + '" stroke="' + OL + '" stroke-width=".8" stroke-linecap="round" opacity=".6"/>'; };
    const celFx = !cel ? '' : (cel.finger ? fing() : '') +
      (cel.heart ? '<path d="M60 66.4C57.4 63.6 55.6 61.4 57.4 59.6C58.6 58.4 60 59.4 60 60.6C60 59.4 61.4 58.4 62.6 59.6C64.4 61.4 62.6 63.6 60 66.4Z" fill="#FF4F7A" stroke="' + OL + '" stroke-width="1"/>' : '') +
      (cel.palms ? '<path d="M17 74.6v-2.4M21 73.6v-2.6M25 74.6v-2.4M95 74.6v-2.4M99 73.6v-2.6M103 74.6v-2.4" stroke="#FFFFFF" stroke-width="1.1" stroke-linecap="round" opacity=".85"/>' : '');
    const handUp = pose === 'triste' || pose === 'adeus'; // mão no rosto: o braço vai na frente da cabeça
    const torso = 'M41 57Q41.6 52 48 51L55 49.6Q60 54 65 49.6L72 51Q78.4 52 79 57L77.4 104Q60 107 42.6 104Z';
    const top = pose === 'taca' ? 26 : 0;
    const vb = opts.bust ? '21 4 78 102' : opts.crop ? '14 ' + (4 - top) + ' 92 ' + (196 + top) : '-60 ' + (-top) + ' 240 ' + (200 + top);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '">' + defs + bg +
      '<ellipse cx="60" cy="195" rx="26" ry="4.4" fill="rgba(0,0,0,.28)"/>' +
      leg([53.4, 116], [52.4, 150], [52, 185], 'PD') + leg([66.6, 116], [67.6, 150], [68, 185], 'PE') + boot(52, -1) + boot(68, 1) +
      hBack + (handUp ? '' : arm(L, 'direito', fL ? 'upper' : undefined)) + arm(R, 'esquerdo', fR ? 'upper' : undefined) +
      shape('M55 38h10v15h-10Z', skin) + '<path d="M55.6 44h8.8v4h-8.8Z" fill="rgba(0,0,0,.16)"/>' +
      shape(torso, k1) + '<path d="M70.6 51.6Q78 52.6 78.6 57L77.2 103.6Q73.6 104.8 71 105Z" fill="' + SHADE + '"/>' +
      '<path d="M54.6 50L60 57.4L65.4 50" stroke="' + k2 + '" stroke-width="2.8" stroke-linejoin="round" fill="none"/>' +
      (handUp ? '' : sleeve(L)) + sleeve(R) +
      (opts.num ? '<text x="60" y="85" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="17" fill="' +
        (lk.numFx === 'contorno' ? 'none" stroke="' + k2 + '" stroke-width="1.6' : lk.numFx === 'neon' ? NUM_FX.neon + '" stroke="#1B5E0C" stroke-width=".8" style="filter:drop-shadow(0 0 1.6px #7CF03C)'
          : NUM_FX[lk.numFx] ? NUM_FX[lk.numFx] + '" stroke="' + OL + '" stroke-width=".8' : k2) + '">' + opts.num + '</text>' : '') +
      shape('M42.6 102.6H77.4L78.6 123.6Q71.4 126 62.6 124.2L60 115.6L57.4 124.2Q48.6 126 41.4 123.6Z', k2) +
      '<path d="M44.6 104L43.8 123.4M75.4 104L76.2 123.4" stroke="' + k1 + '" stroke-width="2"/>' +
      (fL ? arm(L, 'direito', 'fore') : '') + (fR ? arm(R, 'esquerdo', 'fore') : '') + celFx +
      '<circle cx="46.8" cy="31.6" r="3.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/><circle cx="73.2" cy="31.6" r="3.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/>' +
      '<ellipse cx="60" cy="30.4" rx="13.2" ry="15.4" fill="' + skin + '" stroke="' + OL + '" stroke-width="' + OW + '"/>' +
      '<path d="M66.4 16.6Q73.6 21 73.2 31.4Q72.8 40 66 44.6Q71.2 36 70.6 28Q70 21 66.4 16.6Z" fill="' + SHADE + '"/>' +
      beardOf(lk.beard, lk.hc >= 6 ? '#3A2A1E' : hcol, skin) + face + hFront + band + (handUp ? arm(L, 'direito') + sleeve(L) : '') + held + cup +
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
