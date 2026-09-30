// Interface — jornal: capa da temporada e edições extras, foto ilustrada (cores do clube) e coluna do cronista
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, sfx, esc, YEAR0 } = U;

  // Jornais inventados; um sorteado a cada edição (nunca o mesmo duas vezes seguidas)
  const PAPERS = [
    { name: 'Gazeta da Bola', motto: 'O jornal de quem vive futebol' },
    { name: 'Diário do Craque', motto: 'Desde a várzea até a Europa' },
    { name: 'Tribuna Esportiva', motto: 'A voz da arquibancada' },
    { name: 'O Placar', motto: 'Resultado é o que importa' },
    { name: 'Folha do Gramado', motto: 'Notícia com cheiro de grama' },
    { name: 'Jornal da Arquibancada', motto: 'Opinião de torcedor' },
  ];
  let lastPaper = -1;

  // Camisas das seleções (para a foto da Copa)
  const NATION_KIT = {
    'Brasil': ['#F7D117', '#1B8A3A'], 'Argentina': ['#8CC8F0', '#FFFFFF'], 'Uruguai': ['#5DA9E9', '#111111'], 'Colômbia': ['#F7D117', '#1C3F94'],
    'Portugal': ['#C8102E', '#0B6B3A'], 'Espanha': ['#C8102E', '#F7D117'], 'Inglaterra': ['#FFFFFF', '#1C2E5E'], 'Itália': ['#1F5FB4', '#FFFFFF'],
    'Alemanha': ['#FFFFFF', '#111111'], 'França': ['#1C2E5E', '#FFFFFF'], 'Holanda': ['#F36C21', '#FFFFFF'], 'Bélgica': ['#C8102E', '#111111'],
    'Croácia': ['#FFFFFF', '#C8102E'], 'Marrocos': ['#C8102E', '#0B6B3A'], 'Suíça': ['#C8102E', '#FFFFFF'], 'Dinamarca': ['#C8102E', '#FFFFFF'],
    'Japão': ['#1C3F94', '#FFFFFF'], 'EUA': ['#FFFFFF', '#1C2E5E'], 'México': ['#0B6B3A', '#FFFFFF'], 'Equador': ['#F7D117', '#1C3F94'],
    'Senegal': ['#FFFFFF', '#0B6B3A'], 'Sérvia': ['#C8102E', '#1C3F94'], 'Polônia': ['#FFFFFF', '#C8102E'], 'Coreia do Sul': ['#C8102E', '#111111'],
    'Nigéria': ['#0B8A3A', '#FFFFFF'], 'Austrália': ['#F7D117', '#0B6B3A'], 'Canadá': ['#C8102E', '#FFFFFF'], 'Camarões': ['#0B8A3A', '#C8102E'],
    'Gana': ['#FFFFFF', '#111111'], 'Irã': ['#FFFFFF', '#C8102E'], 'Tunísia': ['#C8102E', '#FFFFFF'], 'Arábia Saudita': ['#0B8A3A', '#FFFFFF'],
  };
  const kitOf = clubId => (window.CRAQUE_KITS || {})[clubId] || ['#E6E6E6', '#1B1A17'];
  const nationKit = name => NATION_KIT[name] || ['#FFFFFF', '#1B1A17'];

  // Visual do jogador (escolhido na criação; carreiras antigas usam um sorteio pelo nome)
  const SKIN = ['#F1C7A0', '#E0AC80', '#C68A5E', '#8D5A3B', '#5A3620'];
  const HAIR_COLORS = ['#1E140C', '#5A3A1E', '#C9A05A', '#A8452A', '#E8E2D0'];
  const HAIRS = ['curto', 'raspado', 'black', 'moicano', 'longo', 'careca'];
  const lookOf = c => c.look || { skin: hash(c.name) % 4, hair: 'curto', hc: 0 };
  // Cabelo em duas partes: atrás da cabeça (antes do rosto) e na frente
  function hairParts(style, col) {
    const f = d => '<path d="' + d + '" fill="' + col + '"/>';
    if (style === 'careca') return ['', ''];
    if (style === 'raspado') return ['', '<path d="M51.8 27.2a8.5 8.5 0 0 1 16.4 0q-8.2-2.4-16.4 0z" fill="' + col + '" opacity=".55"/>'];
    if (style === 'black') return ['<circle cx="60" cy="25.5" r="11.5" fill="' + col + '"/>', f('M51.4 27a8.8 8.8 0 0 1 17.2 0q-8.6-3.2-17.2 0z')];
    if (style === 'moicano') return ['', f('M57.6 15.5h4.8v11h-4.8z') + '<path d="M51.8 27.2a8.5 8.5 0 0 1 16.4 0q-8.2-2.4-16.4 0z" fill="' + col + '" opacity=".35"/>'];
    // Cabelo comprido: cai atrás da cabeça até os ombros (o pescoço e a camisa ficam na frente)
    if (style === 'longo') return ['<path d="M50.3 29a9.7 9.7 0 0 1 19.4 0v11.5q0 2.5-2.5 2.5h-14.4q-2.5 0-2.5-2.5z" fill="' + col + '"/>', f('M51.6 27.5a8.5 8.5 0 0 1 16.8 0q-4-4.5-8.4-3.2q-4.4-1.3-8.4 3.2z')];
    return ['', f('M51.6 27.5a8.5 8.5 0 0 1 16.8 0q-4-4.5-8.4-3.2q-4.4-1.3-8.4 3.2z')];
  }
  // Barba: desenhada antes da boca (a boca fica por cima)
  const BEARDS = ['nenhuma', 'rala', 'bigode', 'cavanhaque', 'cheia'];
  function beardOf(style, col) {
    const jaw = 'M51.7 30.2A8.5 8.5 0 0 0 68.3 30.2Q66.4 32.6 64.2 33.1Q60 34.6 55.8 33.1Q53.6 32.6 51.7 30.2z';
    const stache = '<path d="M56.6 32.1q3.4-1.7 6.8 0q-1.2 1-3.4.5q-2.2.5-3.4-.5z" fill="' + col + '"/>';
    if (style === 'rala') return '<path d="' + jaw + '" fill="' + col + '" opacity=".38"/>';
    if (style === 'bigode') return stache;
    if (style === 'cavanhaque') return stache + '<path d="M57.8 35.2q2.2 3.6 4.4 0q-2.2.9-4.4 0z" fill="' + col + '"/><path d="M58.4 34.9h3.2v1.4h-3.2z" fill="' + col + '"/>';
    if (style === 'cheia') return '<path d="M51.2 28.8A8.9 8.9 0 0 0 68.8 28.8Q68.6 35.2 64 37.3Q60 39 56 37.3Q51.4 35.2 51.2 28.8z" fill="' + col + '"/>' + stache;
    return '';
  }
  const hash = s => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

  // ---------- foto ilustrada ----------
  // Poses: normal, celebra, taca, triste, adeus, assina (segurando a camisa nova), maca (lesão)
  const ARMS = {
    normal: [[[49, 43], [45, 55], [46, 66]], [[71, 43], [75, 55], [74, 66]]],
    celebra: [[[49, 43], [40, 32], [35, 19]], [[71, 43], [80, 32], [85, 19]]],
    taca: [[[49, 43], [45, 30], [54, 17]], [[71, 43], [75, 30], [66, 17]]],
    triste: [[[49, 43], [46, 52], [56, 32]], [[71, 43], [75, 55], [74, 66]]],
    adeus: [[[49, 43], [46, 52], [56, 32]], [[71, 43], [82, 32], [88, 20]]],
    assina: [[[49, 43], [42, 51], [42, 57]], [[71, 43], [78, 51], [78, 57]]],
  };
  function photo(pose, kit, c) {
    const [k1, k2] = kit, lk = lookOf(c), skin = SKIN[lk.skin] || SKIN[0], hcol = HAIR_COLORS[lk.hc] || HAIR_COLORS[0], gk = c.pos === 'GOL';
    const [hBack, hFront] = hairParts(lk.hair, hcol);
    const line = '#1B1A17';
    let crowd = '';
    for (let r = 0; r < 4; r++) for (let x = (r % 2) * 3.5; x < 124; x += 7) crowd += '<circle cx="' + x + '" cy="' + (8 + r * 8) + '" r="3" fill="' + ((x * 7 + r * 3) % 5 < 2 ? '#6A665C' : '#7C786D') + '"/>';
    const bg = '<rect width="120" height="100" fill="#A29E91"/>' + crowd + '<rect y="40" width="120" height="4" fill="#5E5B52"/><rect y="72" width="120" height="28" fill="#7F8A6C"/>';
    if (pose === 'maca') {
      return '<svg viewBox="0 0 120 100" aria-hidden="true">' + bg +
        '<rect x="10" y="68" width="84" height="5" rx="2" fill="#F4F4F4" stroke="' + line + '" stroke-width=".6"/><path d="M16 73v10M88 73v10" stroke="' + line + '" stroke-width="1.5"/>' +
        '<circle cx="21" cy="60" r="7.5" fill="' + skin + '"/>' + (lk.hair === 'careca' ? '' : '<path d="M14 58a7.5 7.5 0 0 1 14-3z" fill="' + hcol + '"/>') +
        '<rect x="28" y="56" width="28" height="12" rx="3" fill="' + k1 + '" stroke="' + line + '" stroke-width=".6"/>' +
        '<rect x="56" y="56" width="12" height="12" rx="2" fill="' + k2 + '" stroke="' + line + '" stroke-width=".6"/>' +
        '<rect x="68" y="59" width="18" height="7" rx="3" fill="' + skin + '"/><rect x="80" y="58.5" width="10" height="8" rx="2" fill="' + k1 + '"/>' +
        '<path d="M34 58 L26 55" stroke="' + skin + '" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="96" y="44" width="16" height="26" rx="4" fill="#F4F4F4" stroke="' + line + '" stroke-width=".6"/><path d="M104 50v9M99.5 54.5h9" stroke="#C8102E" stroke-width="3"/>' +
        '<circle cx="104" cy="36" r="7" fill="' + SKIN[(hash(c.name) + 1) % SKIN.length] + '"/><rect x="98" y="70" width="5" height="22" fill="#2B3440"/><rect x="105" y="70" width="5" height="22" fill="#2B3440"/>' +
        '<path d="M97 50 L90 64" stroke="#F4F4F4" stroke-width="5" stroke-linecap="round"/></svg>';
    }
    const [L, R] = ARMS[pose] || ARMS.normal;
    const arm = ([s, e, h]) => '<path d="M' + s + ' L' + e + '" stroke="' + k1 + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M' + e + ' L' + h + '" stroke="' + skin + '" stroke-width="5.5" stroke-linecap="round"/>' +
      (gk ? '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="4.6" fill="#B8F25C" stroke="' + line + '" stroke-width=".6"/>' : '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="3.4" fill="' + skin + '"/>');
    const happy = pose === 'celebra' || pose === 'taca';
    const sad = pose === 'triste' || pose === 'adeus';
    const face = '<circle cx="57" cy="28.5" r=".95" fill="' + line + '"/><circle cx="63" cy="28.5" r=".95" fill="' + line + '"/>' +
      (happy ? '<ellipse cx="60" cy="33.4" rx="2.2" ry="2.3" fill="#5A1A10"/>' : sad ? '<path d="M57.5 34.2 Q60 32.4 62.5 34.2" stroke="' + line + '" stroke-width=".9" fill="none"/>' : '<path d="M57.5 32.8 Q60 34.6 62.5 32.8" stroke="' + line + '" stroke-width=".9" fill="none"/>') +
      (sad ? '<path d="M64 30.5 q1 2 0 3 q-1 -1 0 -3z" fill="#6FB7E8"/>' : '');
    const cup = pose === 'taca' ? '<path d="M52 1h16v5a8 8 0 0 1-16 0z" fill="#E8B923" stroke="#7A5A00" stroke-width=".6"/><path d="M52 3h-3a3 3 0 0 0 3 5M68 3h3a3 3 0 0 1-3 5" stroke="#E8B923" stroke-width="1.4" fill="none"/>' +
      '<rect x="58.5" y="13" width="3" height="3" fill="#C99A12"/><rect x="54" y="15.5" width="12" height="3" rx="1" fill="#E8B923" stroke="#7A5A00" stroke-width=".6"/>' : '';
    const held = pose === 'assina' ? '<path d="M38 55 L49 53 L55 57 L65 57 L71 53 L82 55 L84 64 L75 64 L75 88 L45 88 L45 64 L36 64 Z" fill="' + k1 + '" stroke="' + line + '" stroke-width=".7"/>' +
      '<text x="60" y="80" text-anchor="middle" font-size="14" font-weight="900" font-family="Arial, sans-serif" fill="' + k2 + '" stroke="' + line + '" stroke-width=".3">' + (c.number || 10) + '</text>' : '';
    return '<svg viewBox="8 0 104 100" aria-hidden="true">' + bg + cup +
      '<rect x="51" y="74" width="7" height="20" fill="' + skin + '"/><rect x="62" y="74" width="7" height="20" fill="' + skin + '"/>' +
      '<rect x="50.5" y="84" width="8" height="11" fill="' + k1 + '" stroke="' + line + '" stroke-width=".5"/><rect x="61.5" y="84" width="8" height="11" fill="' + k1 + '" stroke="' + line + '" stroke-width=".5"/>' +
      '<rect x="50" y="95" width="9" height="3.5" rx="1.5" fill="' + line + '"/><rect x="61" y="95" width="9" height="3.5" rx="1.5" fill="' + line + '"/>' +
      '<rect x="49" y="64" width="22" height="12" rx="2" fill="' + k2 + '" stroke="' + line + '" stroke-width=".6"/>' +
      hBack + '<rect x="57" y="35" width="6" height="6" fill="' + skin + '"/>' +
      '<path d="M48 42 Q60 38 72 42 L71 66 L49 66 Z" fill="' + k1 + '" stroke="' + line + '" stroke-width=".6"/>' +
      '<path d="M55.5 40.5 L60 45 L64.5 40.5" stroke="' + k2 + '" stroke-width="2" fill="none"/>' +
      '<circle cx="51.6" cy="29.6" r="1.6" fill="' + skin + '"/><circle cx="68.4" cy="29.6" r="1.6" fill="' + skin + '"/>' +
      '<circle cx="60" cy="29" r="8.5" fill="' + skin + '"/>' + beardOf(lk.beard, hcol) + hFront +
      '<path d="M55.6 26.6q1.5-.8 3 0M61.4 26.6q1.5-.8 3 0" stroke="' + (lk.hair === 'careca' || lk.hair === 'raspado' ? line : hcol) + '" stroke-width=".8" fill="none" stroke-linecap="round"/>' + face +
      held + arm(L) + arm(R) + '</svg>';
  }

  // ---------- capa ----------
  // o = { c, year, extra, head, pose, kit, caption, stats, lede, subs, column }
  function paper(o, onClose) {
    let k;
    do { k = Math.floor(Math.random() * PAPERS.length); } while (k === lastPaper);
    lastPaper = k;
    const P = PAPERS[k];
    const wrap = document.createElement('div');
    wrap.className = 'paper-wrap';
    wrap.innerHTML = '<div class="paper' + (o.extra ? ' is-extra' : '') + '"><div class="pp-in"><div class="pp-top"><span>' + (o.extra ? 'Edição extra · ' : 'Edição de ') + o.year + '</span><span>R$ ' + (2 + (o.year % 5)) + ',50</span></div>' +
      '<div class="pp-name">' + P.name + '</div><div class="pp-motto">' + P.motto + '</div>' +
      (o.extra ? '<div class="pp-extra">' + esc(o.extra) + '</div>' : '') +
      '<h3 class="pp-head">' + esc(o.head) + '</h3>' +
      '<div class="pp-body"><figure class="pp-photo">' + photo(o.pose || 'normal', o.kit, o.c) + '<figcaption>' + esc(o.caption) + '</figcaption></figure>' +
      '<div class="pp-col">' + (o.stats ? '<p class="pp-stats">' + esc(o.stats) + '</p>' : '') +
      '<p class="pp-lede">' + esc(o.lede) + '</p>' +
      (o.subs || []).map(h => '<p class="pp-sub">' + esc(h) + '</p>').join('') + '</div></div>' +
      (o.column ? '<div class="pp-opinion"><span>Opinião · ' + S.COLUMNIST + '</span><b>' + esc(o.column.t) + '</b><p>' + esc(o.column.x) + '</p></div>' : '') +
      '<div class="pp-tap">Toque para fechar</div></div></div>';
    // Com 3D: a mesma página desenhada numa folha de papel que chega girando, desdobra e dá para inclinar
    if (window.CRAQUE_BALL && window.CRAQUE_BALL.newspaper && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      const box = document.createElement('div');
      box.className = 'paper-wrap paper3d';
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', P.name + ': ' + o.head);
      document.body.appendChild(box);
      sfx('paper');
      pageCanvas(o, P).then(cv => window.CRAQUE_BALL.newspaper(box, cv, () => { box.remove(); onClose && onClose(); }))
        .then(ok => { if (!ok && box.isConnected) { box.remove(); domPaper(); } })
        .catch(() => { if (box.isConnected) { box.remove(); domPaper(); } });
      return box;
    }
    return domPaper();
    function domPaper() {
    document.body.appendChild(wrap);
    sfx('paper');
    unfold(wrap.querySelector('.paper'));
    const close = e => {
      if (e) e.stopPropagation();
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); onClose && onClose(); }, 250);
    };
    setTimeout(() => { wrap.onclick = close; }, 400);
    return wrap;
    }
  }

  // Página do jornal desenhada num canvas 1100×1800 (fundo transparente: o papel 3D aparece por baixo da tinta)
  async function pageCanvas(o, P) {
    const W = 1100, H = 1800, M = 64, INK = '#1B1A17';
    try { if (document.fonts) await Promise.all([document.fonts.load("900 80px 'Playfair Display'"), document.fonts.load("700 40px 'Playfair Display'"), document.fonts.load("700 30px Barlow")]); } catch (e) { /* segue com a fonte que tiver */ }
    // Foto: a ilustração do jogo (SVG) vira imagem
    const svg = photo(o.pose || 'normal', o.kit, o.c).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="416" height="400" ');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    try { await img.decode(); } catch (e) { /* sem foto */ }
    const SERIF = "'Playfair Display', Georgia, serif", SANS = "Barlow, Arial, sans-serif";
    const draw = k => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const x = cv.getContext('2d');
      x.fillStyle = INK; x.strokeStyle = INK; x.textBaseline = 'alphabetic';
      const font = (w, s, f, it) => { x.font = (it ? 'italic ' : '') + w + ' ' + Math.round(s * k) + 'px ' + f; };
      const wrap = (txt, maxW) => {
        const out = []; let line = '';
        String(txt).split(/\s+/).forEach(wd => { const t = line ? line + ' ' + wd : wd; if (x.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t; });
        if (line) out.push(line); return out;
      };
      const rule = (y, w2) => { x.fillRect(M, y, W - 2 * M, w2); };
      let y = M + 30 * k;
      // Cabeçalho
      font(700, 30, SANS);
      x.textAlign = 'left'; x.fillText(((o.extra ? 'Edição extra · ' : 'Edição de ') + o.year).toUpperCase(), M, y);
      x.textAlign = 'right'; x.fillText('R$ ' + (2 + (o.year % 5)) + ',50', W - M, y);
      y += 16 * k; rule(y, 3); y += 20 * k;
      x.textAlign = 'center';
      let ns = 118; font(900, ns, SERIF); while (x.measureText(P.name).width > W - 2 * M && ns > 60) { ns -= 4; font(900, ns, SERIF); }
      y += ns * 0.85 * k; x.fillText(P.name, W / 2, y);
      font(700, 34, SERIF, true); y += 50 * k; x.fillText(P.motto, W / 2, y);
      y += 22 * k; rule(y, 5); rule(y + 11, 2); y += 30 * k;
      if (o.extra) { x.fillStyle = '#B3141F'; x.fillRect(M, y, W - 2 * M, 56 * k); x.fillStyle = '#FFF6E0'; font(800, 32, SANS); x.fillText(o.extra.toUpperCase(), W / 2, y + 39 * k); x.fillStyle = INK; y += 80 * k; }
      // Manchete
      x.textAlign = 'left'; font(900, 78, SERIF);
      wrap(o.head, W - 2 * M).forEach(l => { y += 84 * k; x.fillText(l, M, y); });
      y += 34 * k;
      // Foto (esquerda) e texto (direita)
      const PW = Math.round(400 * Math.min(1.3, Math.max(1, k))), top = y;
      x.fillStyle = '#DDD4BC'; x.fillRect(M, y, PW, 0); // (o fundo da legenda é desenhado depois de medir)
      const ph = PW - 24, phH = Math.round(ph * 400 / 416);
      font(700, 28, SERIF, true);
      const cap = wrap(o.caption || '', PW - 30);
      const boxH = 12 + phH + 14 + cap.length * 36 * k + 10;
      x.fillStyle = '#DDD4BC'; x.fillRect(M, y, PW, boxH); x.fillStyle = INK;
      if (img.complete && img.naturalWidth) { x.save(); x.filter = 'sepia(.3) saturate(.85) contrast(1.05)'; x.drawImage(img, M + 12, y + 12, ph, phH); x.restore(); x.lineWidth = 2; x.strokeRect(M + 12, y + 12, ph, phH); }
      x.textAlign = 'center'; let cy = y + 12 + phH + 10;
      cap.forEach(l => { cy += 34 * k; x.fillText(l, M + PW / 2, cy); });
      x.textAlign = 'left';
      const CX = M + PW + 34, CW = W - M - CX;
      let ty = top;
      if (o.stats) { font(800, 36, SANS); wrap(o.stats, CW).forEach(l => { ty += 42 * k; x.fillText(l, CX, ty); }); ty += 14 * k; }
      font(700, 36, SERIF); wrap(o.lede || '', CW).forEach(l => { ty += 48 * k; x.fillText(l, CX, ty); });
      (o.subs || []).forEach(h => { ty += 26 * k; x.fillStyle = 'rgba(27,26,23,.35)'; x.fillRect(CX, ty, CW, 2); x.fillStyle = INK; font(900, 36, SERIF); wrap(h, CW).forEach(l => { ty += 46 * k; x.fillText(l, CX, ty); }); });
      y = Math.max(top + boxH, ty) + 36 * k;
      // Opinião
      if (o.column) {
        rule(y, 5); rule(y + 11, 2); y += 52 * k;
        font(800, 26, SANS); x.fillStyle = '#6B6553'; x.fillText(('Opinião · ' + S.COLUMNIST).toUpperCase(), M, y); x.fillStyle = INK;
        font(900, 50, SERIF); y += 60 * k; x.fillText(o.column.t, M, y);
        font(700, 38, SERIF, true); wrap(o.column.x, W - 2 * M).forEach(l => { y += 50 * k; x.fillText(l, M, y); });
      }
      return { cv, y };
    };
    // Diminui tudo um pouco se não couber na folha
    // Letra grande para encher a folha; diminui até caber
    // Maior tamanho que ainda cabe (notícia curta ganha letra e foto maiores, sem sobrar papel em branco)
    let k = 2.1, r = draw(k);
    while (r.y > H - M && k > 0.6) { k -= 0.05; r = draw(k); }
    return r.cv;
  }

  // Jornal em 3D: chega girando dobrado ao meio, desdobra (a metade de cima vira pela dobra) e fica flutuando.
  // A metade de cima é uma cópia da página com a frente e o verso (papel liso), girando junto pela dobra.
  function unfold(pp) {
    if (!pp || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    pp.classList.add('folded');
    const flap = document.createElement('div');
    flap.className = 'pp-flap';
    const front = document.createElement('div');
    front.className = 'pp-flap-front';
    front.innerHTML = pp.querySelector('.pp-in').innerHTML;
    const back = document.createElement('div');
    back.className = 'pp-flap-back';
    flap.appendChild(front); flap.appendChild(back);
    pp.appendChild(flap);
    front.style.height = pp.offsetHeight + 'px';
    setTimeout(() => {
      if (!pp.isConnected) return;
      flap.classList.add('open');
      sfx('paper');
      setTimeout(() => { pp.classList.remove('folded'); flap.remove(); pp.classList.add('flat'); }, 520);
    }, 760);
  }

  // ---------- edições extras ----------
  // Transferência: a foto é com a camisa nova
  // prev = passagem pelo clube anterior (antes de assinar)
  function transferPaper(c, prev, offer, onClose) {
    const to = D.CLUB_BY_ID[offer.club], from = prev && D.CLUB_BY_ID[prev.club];
    const nick = c.name, seasonsAt = prev ? prev.seasons || 0 : 0;
    const head = offer.kind === 'home' ? 'A volta do filho pródigo: ' + nick + ' está de volta ' + D.ao(to.name)
      : offer.kind === 'money' && from ? 'Dinheiro fala alto: ' + nick + ' troca ' + D.o(from.name) + ' ' + D.pelo(to.name)
      : 'FECHADO! ' + nick + ' é ' + D.do(to.name);
    const lede = (from ? 'Depois de ' + (seasonsAt > 1 ? seasonsAt + ' temporadas' : 'uma temporada') + ' ' + D.no(from.name) + ', ' : '') +
      nick + ' assina por ' + offer.years + (offer.years > 1 ? ' anos' : ' ano') + ' com ' + D.o(to.name) + '. O salário: R$ ' + U.money(offer.wage) + ' por semana.';
    const tierTxt = from && to.tier > from.tier ? 'Um degrau acima na carreira.' : from && to.tier < from.tier ? 'Um passo atrás para jogar mais?' : '';
    return paper({ c, year: YEAR0 + c.season, extra: 'Mercado da bola', head, pose: 'assina', kit: kitOf(to.id), caption: nick + ' com a camisa ' + D.do(to.name), lede, subs: tierTxt ? [tierTxt] : [] }, onClose);
  }

  // Final continental (Libertadores/Champions)
  function finalPaper(c, m, ok, onClose) {
    const cl = D.CLUB_BY_ID[c.club], nick = c.name;
    const head = ok ? nick + ' decide e ' + D.o(cl.name) + ' conquista a ' + m.comp : 'Drama na final: ' + D.o(cl.name) + ' perde a ' + m.comp;
    const lede = ok ? 'No lance mais importante da noite, ' + nick + ' não tremeu. A ' + m.comp + ' é ' + D.do(cl.name) + ', e a festa vai longe.'
      : 'O lance decisivo passou pelos pés de ' + nick + ', e não deu. O vice dói, mas a campanha fica na memória.';
    return paper({ c, year: YEAR0 + c.season, extra: 'Final da ' + m.comp, head, pose: ok ? 'taca' : 'triste', kit: kitOf(cl.id), caption: ok ? nick + ' ergue a taça' : nick + ' lamenta no gramado', lede }, onClose);
  }

  // Título da Copa do Mundo
  function worldCupPaper(c, run, onClose) {
    const nick = c.name;
    const stats = S.defKick(c.pos) ? run.games.filter(x => x.cs).length + ' jogos sem sofrer gol na Copa' : run.g + (run.g === 1 ? ' gol' : ' gols') + ' e ' + run.a + (run.a === 1 ? ' assistência' : ' assistências') + ' na Copa';
    return paper({ c, year: run.year, extra: 'Copa do Mundo ' + run.year, head: 'CAMPEÃO DO MUNDO! ' + nick + ' leva a taça para casa',
      pose: 'taca', kit: nationKit(c.country), caption: nick + ' com a taça do mundo', stats,
      lede: 'O país para. ' + nick + ' entra para a história como campeão do mundo com ' + (D.NATION_BY_NAME[c.country] ? D.NATION_BY_NAME[c.country].flag + ' ' : '') + c.country + '.' }, onClose);
  }

  // Mundial de Clubes: edição extra do título
  function clubWorldPaper(c, run, onClose) {
    const nick = c.name, cl = D.CLUB_BY_ID[run.club];
    const stats = S.defKick(c.pos) ? run.games.filter(x => x.cs).length + ' jogos sem sofrer gol no Mundial' : run.g + (run.g === 1 ? ' gol' : ' gols') + ' e ' + run.a + (run.a === 1 ? ' assistência' : ' assistências') + ' no Mundial';
    return paper({ c, year: run.year, extra: 'Mundial de Clubes ' + run.year, head: D.O(cl.name) + ' é campeão do mundo! ' + nick + ' ergue a taça',
      pose: 'taca', kit: kitOf(cl.id), caption: nick + ' com a taça do Mundial', stats,
      lede: 'Contra os melhores clubes do planeta, ' + D.o(cl.name) + ' chegou ao topo. A festa da torcida vai varar a madrugada.' }, onClose);
  }

  // Despedida (fim de carreira)
  function farewellPaper(c, f, onClose) {
    const nick = c.name, T = c.totals, main = D.CLUB_BY_ID[f.mainClub];
    const nums = c.pos === 'GOL' ? (T.cs || 0) + ' jogos sem sofrer gol' : c.pos === 'ZAG' ? T.goals + ' gols e ' + (T.cs || 0) + ' jogos sem sofrer gol' : T.goals + ' gols e ' + T.assists + ' assistências';
    const col = f.grade === 'S' ? { t: 'Um dos maiores', x: 'Contem aos netos que viram ' + nick + ' jogar. Eu conto aos meus.' }
      : f.grade === 'A' ? { t: 'Até logo, craque', x: 'O futebol fica mais pobre hoje. ' + nick + ' fez o que poucos fazem: deixou saudade antes de sair.' }
      : f.grade === 'B' ? { t: 'Carreira de respeito', x: 'Não foi o maior de todos, mas nunca fugiu da briga. ' + nick + ' sai de cabeça erguida.' }
      : { t: 'O que poderia ter sido', x: 'Talento havia. Faltou alguma coisa que nem eu sei explicar. Boa sorte na nova vida, ' + nick + '.' };
    return paper({ c, year: YEAR0 + c.season, extra: 'Edição especial', head: 'Obrigado, ' + nick + '! O adeus aos ' + c.age + ' anos',
      pose: 'adeus', kit: kitOf(main.id), caption: nick + ' se despede da torcida', stats: T.games + ' jogos · ' + f.titles + (f.titles === 1 ? ' título' : ' títulos'),
      lede: 'Foram ' + nums + ' em ' + f.nClubs + (f.nClubs > 1 ? ' clubes' : ' clube') + '. ' + D.O(main.name) + ' foi a casa mais marcante.', column: col }, onClose);
  }

  Object.assign(U, { SKIN, HAIR_COLORS, HAIRS, BEARDS, PAPERS, kitOf, nationKit, photo, paper, transferPaper, finalPaper, worldCupPaper, clubWorldPaper, farewellPaper });
})();
