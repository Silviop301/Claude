// Card do jogador no estilo "FUT": desenhado em canvas para virar imagem e ser compartilhado.
// Cor pelo pico: bronze (<65), prata (65-74), ouro (75-84), ícone (85+ ou nota S).
(function (root) {
  const W = 600, H = 860;
  const DISPLAY = "'Barlow Condensed', 'Arial Narrow', sans-serif";
  const BODY = "'Barlow', system-ui, sans-serif";

  // Metal: vários pontos de luz ao longo da diagonal (claro/escuro alternando), como metal polido
  const THEMES = {
    bronze: { metal: ['#6B3E1C', '#D9A174', '#8E5429', '#F2C9A0', '#A9693A', '#E0AC80', '#5E3517'], ink: '#2E1A0B', line: 'rgba(46,26,11,.35)', label: 'BRONZE' },
    prata:  { metal: ['#6F7A86', '#F4F7FA', '#A3AEBA', '#FFFFFF', '#8D98A5', '#E6EBF0', '#5E6873'], ink: '#18222D', line: 'rgba(24,34,45,.3)', label: 'PRATA' },
    ouro:   { metal: ['#7C5A10', '#F7E39A', '#C08E1E', '#FFF4C4', '#B8891F', '#F2D57A', '#6E4F0C'], ink: '#2E2100', line: 'rgba(46,33,0,.3)', label: 'OURO' },
    icone:  { metal: ['#120E20', '#3A3060', '#1A1530', '#4B3F7A', '#15112A', '#2E2650', '#0B0914'], ink: '#F4D675', line: 'rgba(244,214,117,.35)', label: 'ÍCONE', holo: true },
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

    // Fundo metálico
    shield(ctx);
    const g = ctx.createLinearGradient(0, 40, W, H - 40);
    T.metal.forEach((col, i) => g.addColorStop(i / (T.metal.length - 1), col));
    ctx.fillStyle = g; ctx.fill();
    ctx.save();
    shield(ctx); ctx.clip();
    // Ícone: reflexo holográfico por cima do metal escuro
    if (T.holo && ctx.createConicGradient) {
      const hg = ctx.createConicGradient(0.6, W * 0.7, H * 0.3);
      ['#ff6ec7', '#7afcff', '#fff38a', '#8affa1', '#b28dff', '#ff6ec7'].forEach((col, i, a) => hg.addColorStop(i / (a.length - 1), col));
      ctx.globalAlpha = 0.16; ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    // Metal escovado: riscos finos quase horizontais (sempre iguais, sem sorteio)
    for (let i = 0, y = 44; y < H; i++, y += 2.2) {
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
    // Texto em alto-relevo: sombra escura embaixo e luz em cima
    const emboss = T.holo ? ['rgba(0,0,0,.6)', 'rgba(255,255,255,.12)'] : ['rgba(255,255,255,.55)', 'rgba(0,0,0,.28)'];
    const fillText = ctx.fillText.bind(ctx);
    let embossOn = true; // desligado nos emojis (bandeira e ícones), que borrariam
    ctx.fillText = function (t, x, y, mw) {
      if (!embossOn) return mw ? fillText(t, x, y, mw) : fillText(t, x, y);
      const f = this.fillStyle;
      this.fillStyle = emboss[0]; mw ? fillText(t, x + 1, y + 2, mw) : fillText(t, x + 1, y + 2);
      this.fillStyle = emboss[1]; mw ? fillText(t, x - 1, y - 1, mw) : fillText(t, x - 1, y - 1);
      this.fillStyle = f; mw ? fillText(t, x, y, mw) : fillText(t, x, y);
    };

    // Coluna esquerda: nota, posição, bandeira, escudo
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 118px ' + DISPLAY;
    ctx.fillText(String(d.peak), 128, 185);
    ctx.font = '800 44px ' + DISPLAY;
    ctx.fillText(d.pos === 'ATA' ? 'ATA' : 'MEI', 128, 232);
    ctx.fillRect(88, 250, 80, 3);
    ctx.font = '52px ' + BODY;
    embossOn = false; ctx.fillText(d.flag, 128, 318); embossOn = true;
    ctx.fillRect(88, 340, 80, 3);
    const crest = d.crest ? await loadImg(d.crest) : null;
    if (crest) ctx.drawImage(crest, 93, 356, 70, 70);

    // Camisa (no lugar da foto)
    jersey(ctx, 385, 250, 1.35, 'rgba(255,255,255,0.18)', T.ink, d.number || (d.pos === 'ATA' ? 9 : 10));

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
    const stats = [['RIT', A.rit], ['FIN', A.fin], ['PAS', A.pas], ['DRI', A.dri], ['DEF', A.def], ['FÍS', A.fis]];
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
    embossOn = false; ctx.fillText(icons, W / 2, 718); embossOn = true;
    // Estrelas de campeão do mundo acima do nome da camisa
    if (d.wc) { ctx.font = '800 26px ' + DISPLAY; embossOn = false; ctx.fillText('★'.repeat(Math.min(d.wc, 5)), 385, 120); embossOn = true; }
    ctx.font = '700 21px ' + BODY;
    ctx.fillText(d.goals + ' GOLS · ' + d.assists + ' ASSIST · ' + d.titles + ' TÍTULOS' + (d.ballon ? ' · ' + d.ballon + ' BOLA' + (d.ballon > 1 ? 'S' : '') + ' DE OURO' : ''), W / 2, 756, 400);
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
