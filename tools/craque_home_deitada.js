// Home deitada pela interface (ui/start.js homeLand): vazia, Treinador com 1 e 2 carreiras, vagas cheias, Relâmpago (pede para girar),
// Rumo ao Topo, Ranking e em pé (Gire o celular). Uso: NODE_PATH=$(npm root -g) node tools/craque_home_deitada.js /tmp/hl  (servidor em 8765)
// Os robôs (navigator.webdriver) ficam na home em pé; aqui o localStorage climbix-deitado = 1 liga a deitada.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-deitado', '1'); });
  await p.goto('http://127.0.0.1:8765/craque/'); await p.waitForTimeout(1200);
  const out = process.argv[2];
  await p.screenshot({ path: out + '/hl1-vazia.png' });
  // cria um técnico pela home deitada
  await p.click('#b-new-co'); await p.waitForTimeout(600);
  await p.screenshot({ path: out + '/hl2-criar-co.png' });
  await p.click('#co-start button[data-v="livre"]'); await p.waitForTimeout(300); await p.click('#b-co-go'); await p.waitForTimeout(500); await p.click('#ldo-go'); await p.waitForTimeout(400); await p.click('#ldn-go'); await p.waitForTimeout(400); await p.click('#ldn-go'); await p.waitForTimeout(400);
  await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(600);
  await p.screenshot({ path: out + '/hl3-treinador.png' });
  // segundo técnico e vagas cheias
  await p.click('#b-new-co'); await p.waitForTimeout(600); await p.click('#co-start button[data-v="livre"]'); await p.waitForTimeout(300); await p.click('#b-co-go'); await p.waitForTimeout(500); await p.click('#ldo-go'); await p.waitForTimeout(400); await p.click('#ldn-go'); await p.waitForTimeout(400); await p.click('#ldn-go'); await p.waitForTimeout(400);
  await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(600);
  await p.screenshot({ path: out + '/hl4-duas.png' });
  await p.click('#b-new-co'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/hl5-cheias.png' });
  await p.click('[data-pop-x]'); await p.waitForTimeout(500);
  await p.click('[data-open="relampago"]'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/hl6-relampago.png' });
  await p.click('#hl-rl'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/hl7-relampago-gire.png' });
  console.log('need-port', await p.evaluate(() => document.body.className));
  await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(500);
  await p.click('[data-open="completa"]'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/hl8-rumo.png' });
  await p.click('[data-hl="ranking"]'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/hl9-ranking.png' });
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(700); await p.screenshot({ path: out + '/hl10-em-pe.png' });
  console.log(errs.join('\n') || 'sem erros'); await b.close(); })();
