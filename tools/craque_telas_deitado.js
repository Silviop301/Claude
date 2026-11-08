// Treinador deitado (ui/coachland.js) pela interface em 844x390: fotos de cada tela, em 3 passeios.
// 1 escalação, popups, semana, treino, olheiro, funções, batedores e preleção · 2 um jogo ao vivo inteiro (grito, parada,
// troca, intervalo, fim, resultado, segunda) · 3 a temporada pelo motor até a última rodada, tabela, caderno, fim e propostas.
// Uso (na raiz, com python3 -m http.server 8765): NODE_PATH=$(npm root -g) node tools/craque_telas_deitado.js /tmp/ld [1,2,3]
// Erros de página e textos com "undefined"/"NaN" contam como problema.
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/ld', PARTS = (process.argv[3] || '1,2,3').split(',');
require('fs').mkdirSync(OUT, { recursive: true });
const errs = [];
async function page(b) {
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/three|cdn|favicon|net::/i.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); } localStorage.setItem('climbix-dicas-v1', '{"off":true}'); } catch (e) {} });
  await p.goto('http://127.0.0.1:8765/craque/', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  const shot = async name => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${name}.png` }); const t = await p.evaluate(() => (document.getElementById('ld') || {}).innerText || ''); if (/undefined|NaN|\[object/.test(t)) errs.push('texto quebrado em ' + name + ': ' + (t.match(/.{0,40}(undefined|NaN|\[object).{0,20}/) || [''])[0]); };
  const click = async sel => { await p.waitForSelector(sel, { timeout: 8000 }); await p.click(sel); await p.waitForTimeout(500); };
  return { p, shot, click };
}
(async () => {
  const b = await chromium.launch();
  if (PARTS.includes('1')) {
    const { p, shot, click } = await page(b);
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await click('#ldn-go'); await click('#ldn-go');
    await shot('a01-time'); await click('[data-xi="5"]'); await shot('a02-troca'); await click('[data-pop-x]');
    await click('[data-tmk="form"][data-d="1"]'); await p.waitForTimeout(150); await shot('a03-formacao-correndo'); await p.waitForTimeout(500); await shot('a03b-formacao'); await click('[data-tmk="sty"][data-d="1"]'); await click('#tm-aux'); await shot('a04-auxiliar'); await click('[data-pop-x]');
    await click('[data-bp]'); await shot('a05-banco'); await click('[data-pop-x]');
    await click('#ld-ok'); await shot('a06-semana');
    await click('#ld-tr'); await click('[data-tk="lados"]'); await shot('a07-treino'); await click('[data-tt="Bola parada"]'); await shot('a08-treino-bola-parada'); await click('[data-tk="esc"]'); await click('#ldtr-go');
    await click('#ld-ol'); await shot('a09-olheiro'); await click('#ldo-ok'); await shot('a10-semana-pronta');
    await click('#ld-play'); await click('#ld-fun'); await click('[data-fi="2"]'); await shot('a11-funcoes'); await click('[data-r="1"]');
    await click('[data-sub="bat"]'); await click('[data-bk="fl"]'); await shot('a12-batedores'); await click('#ldm-ok');
    await click('#ld-go'); await click('[data-pk="calma"]'); await shot('a13-prelecao');
    await p.close();
  }
  if (PARTS.includes('2')) {
    const { p, shot, click } = await page(b);
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await click('#ldn-go'); await click('#ldn-go');
    await click('#ld-ok'); await click('#ld-tr'); await click('[data-tt="Bola parada"]'); await click('[data-tk="esc"]'); await click('#ldtr-go'); await click('#ld-play'); await click('#ld-go'); await shot('b00-prelecao'); await click('[data-pk="cima"]'); await click('#ldp-go');
    await p.waitForTimeout(6000); await shot('bl1-ao-vivo');
    await click('[data-gr="pressionar"]'); await p.waitForTimeout(2500); await shot('bl2-grito');
    await click('#ldl-num'); await shot('bl3-numeros'); await p.mouse.click(10, 10); await p.waitForTimeout(300);
    await click('#b-lv-stop'); await p.waitForTimeout(3500); await shot('bl4-parada');
    if (await p.$('#ldl-other')) { await click('#ldl-other'); await shot('bl5-quem-sai'); await click('[data-w]'); await shot('bl6-jogador'); await click('#ldl-keep'); }
    await click('#ldl-f'); await shot('bl7-tatica'); await click('[data-pop-back]');
    await click('#ldl-go');
    await click('[data-sp="3"]');
    // espera o intervalo
    for (let i = 0; i < 90 && !(await p.$('[data-tk]')); i++) { await p.waitForTimeout(1000); if (await p.$('#ldl-go') && !(await p.$('[data-tk]'))) await click('#ldl-go'); }
    if (await p.$('[data-tk]')) { await click('[data-tk="cobrar"]'); await shot('bl8-intervalo'); await click('#ldl-go'); }
    await click('[data-sp="fim"]'); await p.waitForTimeout(1500);
    for (let i = 0; i < 30 && !(await p.$('#b-lv-end')); i++) { await p.waitForTimeout(1000); if (await p.$('#ldl-go')) await click('#ldl-go'); }
    await shot('bl9-fim');
    if (await p.$('#b-lv-end')) { await click('#b-lv-end'); await shot('bl10-resultado'); await click('[data-rt="mom"]'); await shot('bl11-mandou'); await click('[data-rt="lan"]'); await shot('bl12-lances'); await click('#ldr-go'); await shot('bl13-segunda'); await click('#ldg-go'); await shot('bl14-semana'); }
    await p.close();
  }
  if (PARTS.includes('3')) {
    const { p, shot, click } = await page(b);
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await shot('c0-propostas'); await click('#ldo-go'); await shot('c1-reuniao'); await click('[data-ac="ousado"]'); await shot('c1b-reuniao-ousado'); await click('#ldn-go'); await shot('c1c-patrocinio'); await click('[data-pt="mix"]'); await click('#ldn-go'); await click('#ld-ok');
    // joga até faltar 1 rodada, pelo motor
    await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; let g = 0;
      while (co.ss.i < co.ss.rounds.length - 1 && g++ < 60) { const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; } const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m); }
      U._co.save('hub'); U.LD.semana(); });
    await shot('c2-semana-fim');
    await click('[data-rail="clube"]'); await shot('c2b-clube'); await click('#ldk-go'); await shot('c2c-financas-decidir'); await click('[data-fd="banco"]'); await shot('c2d-banco');
    await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; co.fin.caixa = -300000; co.fin.neg = 5; }); await click('#ldn-bk'); await click('[data-fd="banco"]'); await shot('c2e-banco-vermelho');
    await click('#ldn-take'); await shot('c2f-banco-emprestimo'); await click('#ldn-bk'); await shot('c2g-financas-com-emprestimo'); await click('[data-rail="tabela"]'); await shot('c3-tabela'); await click('[data-tb="art"]'); await shot('c3b-art'); await click('[data-rail="caderno"]'); await shot('c4-caderno');
    const cell = await p.$('.ldc-c.pen, .ldc-c.lap'); if (cell) { await cell.click(); await p.waitForTimeout(300); await shot('c4b-caderno-casa'); }
    await click('[data-rail="semana"]');
    const nx = await p.$('#ld-play'); if (nx) { await click('#ld-play'); if (await p.$('#ld-go')) { await click('#ld-go'); await click('#ldp-go'); await p.waitForTimeout(2500); await click('[data-sp="fim"]'); for (let i = 0; i < 30 && !(await p.$('#b-lv-end')); i++) { await p.waitForTimeout(800); if (await p.$('#ldl-go')) await click('#ldl-go'); } await click('#b-lv-end'); await shot('c5-res'); await click('#ldr-go'); } }
    await p.waitForTimeout(800); await shot('c6-temporada');
    if (await p.$('#ldy-mk')) { await click('#ldy-mk'); await shot('c7-propostas'); }
    else if (await p.$('#ldy-of')) { await click('#ldy-of'); await shot('c7-propostas'); }
    await p.close();
  }
  console.log(errs.length ? 'Problemas: ' + errs.length + '\n' + errs.join('\n') : 'Treinador deitado: fotos em ' + OUT + '; Problemas: 0');
  await b.close();
})();
