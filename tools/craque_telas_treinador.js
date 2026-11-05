// Fotos e passeio do Modo Treinador pela interface: início, criação, propostas, chegada, central, time (com troca e
// mudança de formação e estilo), resultado, tabela e fim da temporada; joga a temporada inteira pelos botões.
// Uso (na raiz, com python3 -m http.server 8765): NODE_PATH=$(npm root -g) node tools/craque_telas_treinador.js /tmp/co [largura] [altura]
// DESKTOP=1 usa mouse (computador). Erros de página e textos com "undefined"/"NaN" contam como problema.
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/co', W = +process.argv[3] || 390, H = +process.argv[4] || 844;
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const desk = !!process.env.DESKTOP;
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: !desk, hasTouch: !desk });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/three|cdn|favicon|net::/i.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.removeItem('climbix-treinador-v1'); } catch (e) {} });
  await p.goto('http://127.0.0.1:8765/craque/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  let n = 0;
  const shot = async name => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true });
    const t = await p.evaluate(() => document.getElementById('screen').innerText); if (/undefined|NaN|\[object/.test(t)) errs.push('texto quebrado em ' + name); };
  const click = async sel => { await p.waitForSelector(sel, { timeout: 5000 }); await p.click(sel); await p.waitForTimeout(600); };
  await p.evaluate(() => window.scrollTo(0, 9999)); await shot('inicio');
  await click('#b-new-co'); await shot('criacao');
  await click('#co-start button[data-v="livre"]');
  await click('#b-co-go'); await shot('propostas');
  await click('[data-sign]'); await shot('chegada');
  await click('#b-co-in'); await shot('time');
  // troca: um titular com um reserva; muda formação e estilo
  await click('[data-xi="5"]'); await shot('time-selecionado');
  await click('.co-pl:not(.dis)');
  await click('[data-f="4-3-3"]'); await click('[data-s="pressao"]'); await shot('time-433-pressao');
  await click('#b-co-ok'); await shot('central');
  await click('#b-co-tab'); await shot('tabela'); await click('#b-co-back');
  let games = 0, guard = 0;
  while (guard++ < 80) {
    if (await p.$('#b-co-play')) { await click('#b-co-play'); if (await p.$('#b-co-go')) { await click('#b-co-go'); games++; if (games === 1) await shot('resultado'); } continue; }
    if (await p.$('#b-co-next')) { await click('#b-co-next'); continue; }
    if (await p.$('#b-co-end')) { await shot('demitido'); await click('#b-co-end'); continue; }
    break;
  }
  await shot('fim-temporada');
  if (await p.$('[data-sk]:not([disabled])')) { await click('[data-sk]:not([disabled])'); await shot('fim-ponto'); }
  // volta ao início: o ingresso de continuar
  const resumeOk = await p.evaluate(() => { const sv = JSON.parse(localStorage.getItem('climbix-treinador-v1')); return !!(sv && sv.co && sv.co.step); });
  await p.evaluate(() => CRAQUE_UI.home()); await p.waitForTimeout(400); await shot('inicio-continuar');
  await click('#b-cont-co'); await shot('continuar');
  console.log(`Treinador pela interface: ${games} jogos, ${n} fotos em ${OUT}; save ${resumeOk ? 'ok' : 'FALTANDO'}`);
  console.log(errs.length ? 'Problemas: ' + errs.length + '\n  ' + [...new Set(errs)].slice(0, 10).join('\n  ') : 'Problemas: 0');
  await b.close();
})();
