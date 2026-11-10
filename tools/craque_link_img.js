// Imagem do link (og:image, 1200x630) a partir da arte de lançamento do ChatGPT (arte/lancamento/arte-gpt.png).
// Uso: NODE_PATH=$(npm root -g) node tools/craque_link_img.js [saida.jpg]
// Texto ou recorte mudou: salve com outro nome (…-v2.jpg) e troque no index.html, porque WhatsApp e redes guardam a imagem por endereço.
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..');
const F = 'file://' + path.join(ROOT, 'craque', 'fonts') + '/';
const ART = 'file://' + path.join(ROOT, 'arte', 'lancamento', 'arte-gpt.png');
const out = process.argv[2] || path.join(ROOT, 'craque', 'assets', 'link-climbix-v1.jpg');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: BC; font-weight: 800; src: url('${F}barlow-condensed-800-latin.woff2'); }
@font-face { font-family: BC; font-weight: 700; src: url('${F}barlow-condensed-700-latin.woff2'); }
body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #141517; position: relative; }
img { position: absolute; left: 0; top: -70px; width: 1200px; }
.v { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20,21,23,.92) 0, rgba(20,21,23,.75) 26%, rgba(20,21,23,0) 44%); }
.t { position: absolute; left: 64px; top: 150px; font-family: BC, sans-serif; color: #FBF8EF; }
.t b { display: block; font: 800 122px/.86 BC; letter-spacing: .01em; }
.t i { display: block; width: 92px; height: 8px; background: #F2C230; margin: 22px 0 18px; }
.t span { display: block; font: 700 34px/1.05 BC; letter-spacing: .08em; text-transform: uppercase; color: #F2C230; }
.t small { display: block; font: 700 26px/1 BC; letter-spacing: .08em; color: #D3E4D9; margin-top: 150px; }
</style><img src="${ART}"><div class="v"></div>
<div class="t"><b>CLIMBIX</b><i></i><span>Assuma um clube.<br>Monte o time.<br>Chegue ao topo.</span><small>climbix.app</small></div>`;
(async () => {
  const tmp = path.join(os.tmpdir(), 'climbix-link-' + process.pid + '.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await b.close(); fs.unlinkSync(tmp);
  console.log(out, fs.statSync(out).size, 'bytes');
})();
