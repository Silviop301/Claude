// Recorta as bordas transparentes, reduz as taças baixadas por craque_trophies.py para 192 px de altura
// e gera craque/src/trophy-imgs.js (mapa nome da taça -> arquivo).
// Uso: node tools/craque_trophies_resize.js <pasta_temporaria>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const src = process.argv[2];
  const found = JSON.parse(fs.readFileSync(path.join(src, 'found.json'), 'utf8'));
  const outDir = path.join(__dirname, '..', 'craque', 'trophies');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  const map = {};
  for (const [name, slug] of Object.entries(found)) {
    const data = 'data:image/png;base64,' + fs.readFileSync(path.join(src, slug + '.png')).toString('base64');
    const out = await p.evaluate(async data => {
      const img = new Image(); img.src = data; await img.decode();
      const c0 = document.createElement('canvas'); c0.width = img.naturalWidth; c0.height = img.naturalHeight;
      const x0 = c0.getContext('2d'); x0.drawImage(img, 0, 0);
      const px = x0.getImageData(0, 0, c0.width, c0.height).data;
      let t = c0.height, l = c0.width, r = 0, bt = 0;
      for (let y = 0; y < c0.height; y++) for (let x = 0; x < c0.width; x++) if (px[(y * c0.width + x) * 4 + 3] > 16) { if (y < t) t = y; if (y > bt) bt = y; if (x < l) l = x; if (x > r) r = x; }
      if (r <= l || bt <= t) { t = 0; l = 0; r = c0.width - 1; bt = c0.height - 1; }
      const w = r - l + 1, h = bt - t + 1, H = 192, W = Math.round(w * H / h);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(c0, l, t, w, h, 0, 0, W, H);
      return c.toDataURL('image/png').split(',')[1];
    }, data);
    fs.writeFileSync(path.join(outDir, slug + '.png'), Buffer.from(out, 'base64'));
    map[name] = 'trophies/' + slug + '.png';
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, '..', 'craque', 'src', 'trophy-imgs.js'),
    '// Gerado por tools/craque_trophies_resize.js: imagem da taça real de cada competição (TheSportsDB).\n' +
    'window.CRAQUE_TROPHY_IMGS = ' + JSON.stringify(map, null, 0) + ';\n');
  console.log('taças:', Object.keys(map).length);
})();
