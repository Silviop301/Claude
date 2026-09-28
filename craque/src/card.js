// Card do jogador no estilo "FUT": desenhado em canvas para virar imagem e ser compartilhado.
// Cor pelo pico: bronze (<65), prata (65-74), ouro (75-84), ícone (85+ ou nota S).
(function (root) {
  const W = 600, H = 860;
  const DISPLAY = "'Barlow Condensed', 'Arial Narrow', sans-serif";
  const BODY = "'Barlow', system-ui, sans-serif";

  const THEMES = {
    bronze: { a: '#E7B98C', b: '#A86B3C', ink: '#3B2412', line: 'rgba(59,36,18,.35)', label: 'BRONZE' },
    prata:  { a: '#F1F4F7', b: '#9AA5B1', ink: '#1E2A36', line: 'rgba(30,42,54,.3)', label: 'PRATA' },
    ouro:   { a: '#FFE9A0', b: '#D2A21B', ink: '#3A2A00', line: 'rgba(58,42,0,.3)', label: 'OURO' },
    icone:  { a: '#2A2440', b: '#0E0B18', ink: '#F4D675', line: 'rgba(244,214,117,.35)', label: 'ÍCONE' },
  };

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

  function jersey(ctx, x, y, s, fill, ink, num) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-60, -80); ctx.lineTo(-22, -95); ctx.quadraticCurveTo(0, -80, 22, -95); ctx.lineTo(60, -80);
    ctx.lineTo(95, -40); ctx.lineTo(70, -18); ctx.lineTo(55, -32); ctx.lineTo(55, 90); ctx.lineTo(-55, 90);
    ctx.lineTo(-55, -32); ctx.lineTo(-70, -18); ctx.lineTo(-95, -40); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = '800 92px ' + DISPLAY;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 18);
    ctx.restore();
  }

  function loadImg(src) {
    return new Promise(res => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  // data: { name, pos, peak, attrs, flag, crest (url), grade, verdict, goals, assists, titles, ballon, traits:[{icon,lv}], years }
  root.CRAQUE_CARD = async function (canvas, d) {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* segue */ }
    const T = themeOf(d.peak, d.grade);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Fundo do card
    shield(ctx);
    const g = ctx.createLinearGradient(0, 40, W, H);
    g.addColorStop(0, T.a); g.addColorStop(1, T.b);
    ctx.fillStyle = g; ctx.fill();
    ctx.save();
    shield(ctx); ctx.clip();
    // brilho diagonal
    const sh = ctx.createLinearGradient(0, 0, W, H * 0.6);
    sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    // listras sutis
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 18;
    for (let i = -H; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
    ctx.restore();
    shield(ctx); ctx.lineWidth = 6; ctx.strokeStyle = T.ink; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;

    // Coluna esquerda: nota, posição, bandeira, escudo
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 118px ' + DISPLAY;
    ctx.fillText(String(d.peak), 128, 185);
    ctx.font = '800 44px ' + DISPLAY;
    ctx.fillText(d.pos === 'ATA' ? 'ATA' : 'MEI', 128, 232);
    ctx.fillRect(88, 250, 80, 3);
    ctx.font = '52px ' + BODY;
    ctx.fillText(d.flag, 128, 318);
    ctx.fillRect(88, 340, 80, 3);
    const crest = d.crest ? await loadImg(d.crest) : null;
    if (crest) ctx.drawImage(crest, 93, 356, 70, 70);

    // Camisa (no lugar da foto)
    jersey(ctx, 385, 250, 1.35, 'rgba(255,255,255,0.18)', T.ink, d.pos === 'ATA' ? 9 : 10);

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
    const stats = [['FIN', A.fin], ['PAS', A.pas], ['DRI', A.dri], ['FÍS', A.fis], ['MEN', A.men], ['GOL', d.goals]];
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
    const icons = (d.traits || []).map(t => t.icon + (t.lv > 1 ? ['', '', '²', '³'][t.lv] : '')).join('  ');
    ctx.fillText(icons, W / 2, 718);
    ctx.font = '700 21px ' + BODY;
    ctx.fillText(d.assists + ' ASSIST · ' + d.titles + ' TÍTULOS' + (d.ballon ? ' · ' + d.ballon + ' BOLA' + (d.ballon > 1 ? 'S' : '') + ' DE OURO' : ''), W / 2, 756, 400);
    ctx.font = '800 18px ' + DISPLAY;
    ctx.globalAlpha = 0.8;
    ctx.fillText(T.label + ' · ' + d.verdict.toUpperCase(), W / 2, 784, 330);
    ctx.globalAlpha = 1;
    return canvas;
  };

  // Compartilhar (Safari/Android usam a folha de compartilhamento; senão, baixa a imagem)
  root.CRAQUE_SHARE = function (canvas, name) {
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'craque-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', { type: 'image/png' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Minha carreira no CRAQUE' });
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
