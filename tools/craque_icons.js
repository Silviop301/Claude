// Gera os ícones do Climbix (craque/icons): escudo dourado com o metal escovado das cartas 3D e bola com volume.
// Uso: NODE_PATH=$(npm root -g) node tools/craque_icons.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'craque');
const metal = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'assets/cartas/dourada.jpg')).toString('base64');

// Desenho em 1024 px; k = escala do conteúdo (ícone "maskable" do Android fica menor, dentro da área segura)
function svg(k) {
  const S = 1024, c = S / 2, T = (x, y) => [c + (x - c) * k, c + (y - c) * k];
  const P = (x, y) => T(x, y).map(v => v.toFixed(1)).join(' ');
  // Escudo: topo com um leve entalhe no meio, laterais retas e ponta arredondada embaixo
  const shield = `M${P(244, 184)} Q${P(216, 184)} ${P(216, 212)} L${P(216, 640)} Q${P(216, 690)} ${P(262, 716)} L${P(482, 842)} Q${P(512, 858)} ${P(542, 842)} L${P(762, 716)} Q${P(808, 690)} ${P(808, 640)} L${P(808, 212)} Q${P(808, 184)} ${P(780, 184)} L${P(612, 184)} Q${P(582, 184)} ${P(566, 200)} Q${P(512, 222)} ${P(458, 200)} Q${P(442, 184)} ${P(412, 184)} Z`;
  const [bx, by] = T(512, 496), R = 196 * k;
  // Bola clássica: pentágono central; cinco pentágonos na borda (na direção dos vértices do central, ponta para dentro);
  // costuras ligando os vértices e separando os hexágonos brancos
  const pent = (x, y, r, rot) => Array.from({ length: 5 }, (_, i) => { const a = rot + i * Math.PI * 2 / 5; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; });
  const d = pts => 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + 'Z';
  const pc = pent(bx, by, R * 0.33, -Math.PI / 2);
  let pents = d(pc), seams = '';
  const L = (a1, a2) => { seams += 'M' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + ' L' + a2[0].toFixed(1) + ' ' + a2[1].toFixed(1) + ' '; };
  const outer = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5, ro = R * 0.27, dist = R * 0.64 + ro;
    const po = pent(bx + Math.cos(a) * dist, by + Math.sin(a) * dist, ro, a + Math.PI); // po[0] aponta para o centro
    outer.push(po); pents += d(po);
    L(pc[i], po[0]); // vértice do central até a ponta do de fora
  }
  // Entre dois pentágonos da borda: costura até a borda da bola
  for (let i = 0; i < 5; i++) {
    const p1 = outer[i][1], p2 = outer[(i + 1) % 5][4];
    const mid = -Math.PI / 2 + (i + 0.5) * Math.PI * 2 / 5;
    const rim = [bx + Math.cos(mid) * R * 1.05, by + Math.sin(mid) * R * 1.05];
    const j = [bx + Math.cos(mid) * R * 0.86, by + Math.sin(mid) * R * 0.86];
    L(p1, j); L(p2, j); L(j, rim);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#1B6A43"/><stop offset=".7" stop-color="#0F4A2F"/><stop offset="1" stop-color="#0A3322"/></radialGradient>
    <clipPath id="sh"><path d="${shield}"/></clipPath>
    <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".38" stop-color="#fff" stop-opacity=".0"/>
      <stop offset=".47" stop-color="#FFF6D0" stop-opacity=".55"/><stop offset=".56" stop-color="#fff" stop-opacity=".0"/>
      <stop offset=".8" stop-color="#5A3F06" stop-opacity=".0"/><stop offset="1" stop-color="#5A3F06" stop-opacity=".35"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">${['#7C5A10', '#EFD27A', '#B8841A', '#F8E4A0', '#A87A16', '#E6C35E', '#5E4308'].map((col, i) => `<stop offset="${(i / 6).toFixed(2)}" stop-color="${col}"/>`).join('')}</linearGradient>
    <filter id="gray"><feColorMatrix type="saturate" values="0"/></filter>
    <radialGradient id="ball" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F3F1EA"/><stop offset="1" stop-color="#B9B5A8"/></radialGradient>
    <radialGradient id="ballShade" cx=".38" cy=".32" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <clipPath id="bc"><circle cx="${bx}" cy="${by}" r="${R}"/></clipPath>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${14 * k}" stdDeviation="${16 * k}" flood-color="#000" flood-opacity=".45"/></filter>
    <filter id="bdrop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${10 * k}" stdDeviation="${10 * k}" flood-color="#3A2A04" flood-opacity=".45"/></filter>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <g filter="url(#drop)"><path d="${shield}" fill="#B8891F"/></g>
  <g clip-path="url(#sh)">
    <rect width="${S}" height="${S}" fill="url(#gold)"/>
    <image xlink:href="${metal}" x="${c - 520 * k}" y="${c - 560 * k}" width="${1040 * k}" height="${1120 * k}" preserveAspectRatio="xMidYMid slice" filter="url(#gray)" style="mix-blend-mode:overlay" opacity=".55"/>
    <rect width="${S}" height="${S}" fill="url(#gloss)"/>
  </g>
  <path d="${shield}" fill="none" stroke="#4A3508" stroke-width="${12 * k}" stroke-linejoin="round"/>
  <path d="${shield}" fill="none" stroke="#FFF1B8" stroke-opacity=".55" stroke-width="${4 * k}" stroke-linejoin="round" transform="translate(${c * (1 - 0.955)} ${c * (1 - 0.955)}) scale(.955)"/>
  <g filter="url(#bdrop)"><circle cx="${bx}" cy="${by}" r="${R}" fill="url(#ball)"/></g>
  <g clip-path="url(#bc)"><path d="${pents}" fill="#1E1A12"/><path d="${seams}" stroke="#1E1A12" stroke-width="${6 * k}" stroke-linecap="round" fill="none"/>
    <circle cx="${bx}" cy="${by}" r="${R}" fill="url(#ballShade)"/>
    <ellipse cx="${bx - R * 0.38}" cy="${by - R * 0.45}" rx="${R * 0.3}" ry="${R * 0.16}" fill="#fff" opacity=".45" transform="rotate(-30 ${bx - R * 0.38} ${by - R * 0.45})"/></g>
  <circle cx="${bx}" cy="${by}" r="${R}" fill="none" stroke="#1E1A12" stroke-width="${12 * k}"/>
</svg>`;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const shot = async k => { await p.setContent('<body style="margin:0">' + svg(k) + '</body>'); return p.screenshot({ clip: { x: 0, y: 0, width: 1024, height: 1024 } }); };
  const big = await shot(1), mask = await shot(0.78);
  // Reduz com boa qualidade no próprio navegador
  const resize = async (png, s) => {
    await p.setContent('<canvas id="c"></canvas>');
    return Buffer.from(await p.evaluate(async ([src, s]) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.getElementById('c'); c.width = c.height = s;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, s, s);
      return c.toDataURL('image/png').split(',')[1];
    }, ['data:image/png;base64,' + png.toString('base64'), s]), 'base64');
  };
  const out = path.join(ROOT, 'icons');
  fs.writeFileSync(path.join(out, 'icon-512.png'), await resize(big, 512));
  fs.writeFileSync(path.join(out, 'icon-192.png'), await resize(big, 192));
  fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), await resize(big, 180));
  fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), await resize(mask, 512));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], big);
  await b.close();
  console.log('ok');
})();
