// Gera icons/icon-{512,192,180}.png a partir de tools/icon.html.
// Uso: NODE_PATH=$(npm root -g) node tools/make_icons.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(root, 'tools/icon.html'));
  for (const size of [512, 192, 180]) {
    const data = await p.evaluate(s => {
      const src = document.getElementById('c');
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, s, s);
      return c.toDataURL('image/png').split(',')[1];
    }, size);
    fs.writeFileSync(path.join(root, 'icons', 'icon-' + size + '.png'), Buffer.from(data, 'base64'));
  }
  await b.close();
  console.log('ok');
})();
