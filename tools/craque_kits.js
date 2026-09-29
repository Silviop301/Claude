// Gera craque/src/kits.js: duas cores de camisa por clube, tiradas do escudo (para a foto do jornal).
// Rode com um servidor na raiz do repositório:  python3 -m http.server 8765  e  node tools/craque_kits.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:8765/craque/index.html');
  const kits = await p.evaluate(async () => {
    const out = {};
    const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    for (const cl of window.CRAQUE_DATA.CLUBS) {
      const img = new Image();
      img.src = 'badges/' + cl.id + '.png';
      try { await img.decode(); } catch (e) { continue; }
      const cv = document.createElement('canvas'); cv.width = cv.height = 48;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 48, 48);
      const px = ctx.getImageData(0, 0, 48, 48).data;
      const bins = {};
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        const r = px[i], g = px[i + 1], bl = px[i + 2];
        const k = (r >> 5) + ',' + (g >> 5) + ',' + (bl >> 5);
        const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), sat = mx ? (mx - mn) / mx : 0;
        const e = bins[k] || (bins[k] = { n: 0, w: 0, s: [0, 0, 0] });
        e.n++; e.w += 1 + sat; e.s[0] += r; e.s[1] += g; e.s[2] += bl;
      }
      const list = Object.values(bins).map(e => ({ w: e.w, c: e.s.map(v => v / e.n) })).sort((a, b) => b.w - a.w);
      if (!list.length) continue;
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const main = list[0].c;
      const second = (list.find(e => dist(e.c, main) > 110) || { c: main[0] + main[1] + main[2] > 380 ? [30, 30, 30] : [245, 245, 245] }).c;
      out[cl.id] = [hex(main), hex(second)];
    }
    return out;
  });
  await b.close();
  const file = path.join(__dirname, '..', 'craque', 'src', 'kits.js');
  fs.writeFileSync(file, '// Gerado por tools/craque_kits.js: cores [principal, secundária] tiradas do escudo de cada clube.\n' +
    'window.CRAQUE_KITS = ' + JSON.stringify(kits) + ';\n');
  console.log('kits.js com', Object.keys(kits).length, 'clubes');
})();
