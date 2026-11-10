// Gera os ícones do Climbix (craque/icons): "O topo", a bola no pico da montanha em cartaz dourado.
// O desenho (arte/icone/topo.png, fundo transparente) foi gerado pelo Silvio no ChatGPT em 2026-11-10, no traço dos
// desenhos do jogo, e ampliado 2x; aqui entram o fundo de raios, o círculo verde, a sombra deslocada e o grão de papel.
// Uso: NODE_PATH=$(npm root -g) node tools/craque_icons.js [foto-1024.png]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'craque');
const ART = path.resolve(__dirname, '..', 'arte', 'icone', 'topo.png');
const art = 'data:image/png;base64,' + fs.readFileSync(ART).toString('base64');
const hdr = fs.readFileSync(ART), RATIO = hdr.readUInt32BE(20) / hdr.readUInt32BE(16); // altura / largura do PNG
const S = 1024, INK = '#15140F';
const f = n => (+n).toFixed(1);

// Desenho em 1024 px; k = escala do conteúdo (o ícone "maskable" do Android fica menor, dentro da área segura; o fundo vai até a borda)
function svg(k) {
  const c = S / 2, cy = 430; // centro dos raios e do círculo
  // raios do cartaz: 20 fatias, uma sim e uma não
  let rays = '';
  const R = 1600, st = Math.PI * 2 / 20;
  for (let i = 0; i < 20; i += 2) {
    const a1 = 0.08 + i * st, a2 = a1 + st;
    rays += `<path d="M${c} ${cy} L${f(c + Math.cos(a1) * R)} ${f(cy + Math.sin(a1) * R)} L${f(c + Math.cos(a2) * R)} ${f(cy + Math.sin(a2) * R)} Z" fill="#E2AC1C"/>`;
  }
  const w = 960, h = w * RATIO, x = 38, y = 84, sr = 372;
  const g = k === 1 ? '' : ` transform="translate(${c} ${c}) scale(${k}) translate(${-c} ${-c})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <radialGradient id="vig" cx=".5" cy=".46" r=".76"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#020A06" stop-opacity=".28"/></radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 .62"/></filter>
  </defs>
  <rect width="${S}" height="${S}" fill="#F2C230"/>${rays}
  <rect width="${S}" height="${S}" fill="url(#vig)"/>
  <g${g}>
    <circle cx="${c + 14}" cy="${cy + 18}" r="${sr}" fill="${INK}" opacity=".3"/>
    <circle cx="${c}" cy="${cy}" r="${sr}" fill="#17603E" stroke="${INK}" stroke-width="20"/>
    <circle cx="${c}" cy="${cy}" r="${sr - 44}" fill="none" stroke="#1F7A4E" stroke-width="16"/>
    <image xlink:href="${art}" x="${x + 14}" y="${y + 18}" width="${w}" height="${f(h)}" style="filter:brightness(0);opacity:.32"/>
    <image xlink:href="${art}" x="${x}" y="${y}" width="${w}" height="${f(h)}"/>
  </g>
  <rect width="${S}" height="${S}" filter="url(#grain)" opacity=".16"/>
</svg>`;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const shot = async k => { await p.setContent('<body style="margin:0">' + svg(k) + '</body>'); await p.waitForTimeout(200); return p.screenshot({ clip: { x: 0, y: 0, width: 1024, height: 1024 } }); };
  const big = await shot(1), mask = await shot(0.78);
  // Reduz com boa qualidade no próprio navegador (em passos de metade, para não serrilhar o traço)
  const resize = async (png, s) => {
    await p.setContent('<canvas id="c"></canvas>');
    return Buffer.from(await p.evaluate(async ([src, s]) => {
      const img = new Image(); img.src = src; await img.decode();
      let cur = img, w = img.width;
      while (w / 2 >= s) {
        w /= 2; const t = document.createElement('canvas'); t.width = t.height = w;
        const tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(cur, 0, 0, w, w); cur = t;
      }
      const c = document.getElementById('c'); c.width = c.height = s;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, s, s);
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
  // Os dois de 512 px passam para 256 cores (o grão de papel triplica o PNG; na tela não se nota). Os pequenos ficam inteiros.
  try {
    require('child_process').execFileSync('python3', ['-c', `
import sys
from PIL import Image
for f in sys.argv[1:]:
    Image.open(f).convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(f, optimize=True)
`, path.join(out, 'icon-512.png'), path.join(out, 'icon-maskable-512.png')]);
  } catch (e) { console.log('sem Pillow: os ícones de 512 px ficaram sem reduzir as cores'); }
  console.log('ok');
})();
