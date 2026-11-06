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
  await p.addInitScript(() => { try { localStorage.setItem('climbix-dicas-v1', '{"off":true}'); if (!sessionStorage.getItem('co-tour')) { localStorage.removeItem('climbix-treinador-v1'); sessionStorage.setItem('co-tour', '1'); } } catch (e) {} });
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
  await click('[data-xi="5"]'); await shot('time-popup-troca');
  await click('.co-pop .co-pl:not(.dis)');
  await click('[data-xi="2"]'); await click('#b-co-swap'); await shot('time-trocar-lugar'); await click('[data-xi="3"]');
  await click('#b-co-form'); await shot('time-popup-formacao'); await click('[data-f="4-3-3"]');
  await click('#b-co-sty'); await shot('time-popup-estilo'); await click('[data-s="pressao"]');
  await p.evaluate(() => window.scrollTo(0, 0)); await shot('time-433-pressao');
  await click('#b-co-ok'); await shot('central');
  await click('#b-co-tab'); await shot('tabela'); await click('#b-co-back');
  // Fim de jogo: uma tela só (390x844, sem rolar) com abas; foto de cada aba e problema se alguma passar da altura
  const resTabs = async name => {
    for (const k of ['res', 'num', 'lan', 'cad']) {
      if (!(await p.$('[data-rt="' + k + '"]'))) continue;
      await click('[data-rt="' + k + '"]'); await shot(name + '-' + k);
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      if (!desk && H <= 900 && h > H + 1) errs.push(name + '-' + k + ' rola: ' + h + 'px de altura');
    }
  };
  let games = 0, guard = 0, finShot = false;
  while (guard++ < 80) {
    if (games >= 7 && !finShot && await p.$('#b-co-fin')) {
      finShot = true;
      await click('#b-co-fin'); await shot('financas');
      await click('[data-ft="seg"]'); await shot('financas-a-seguir');
      await click('[data-ft="sal"]'); await shot('financas-salarios');
      await click('#b-cf-back');
    }
    if (await p.$('#b-co-play')) {
      await click('#b-co-play');
      if (!(await p.$('#b-co-go'))) continue;
      if (games === 5) {
        // caderno: o bloco antes do jogo, a tela com as abas, uma anotação aberta
        await shot('time-caderno');
        await click('#b-cad-open'); await shot('caderno');
        if (await p.$('.cad-page [data-cad]')) { await p.evaluate(() => document.querySelector('.cad-page [data-cad]').click()); await p.waitForTimeout(500); await shot('caderno-anotacao'); await click('#b-cad-x'); }
        const tab = async k => { await click(desk ? '.cad-tabs.wide [data-ct="' + (k === 'riv' ? 'riv' : 'sty') + '"]' : '.cad-tabs:not(.wide) [data-ct="' + k + '"]'); };
        await tab('frm'); await shot('caderno-formacoes');
        await tab('riv'); await shot('caderno-rivais');
        await click('#b-cad-back');
      }
      await click('#b-co-go'); games++;
      if (games === 1) {
        // primeiro jogo ao vivo: um pouco no 1×, para com "Parar e mexer", troca arrastando no campinho, troca dois
        // titulares de posição tocando, muda a tática e vai ao fim
        await p.waitForTimeout(4500); await shot('ao-vivo');
        await click('[data-sp="3"]'); await p.waitForTimeout(3000);
        if (await p.$('#b-lv-stop') && !(await p.$('.lv-sheet.on'))) await click('#b-lv-stop');
        await p.waitForSelector('#b-lv-go', { timeout: 30000 }); await shot('parada');
        await click('#b-lv-sub'); await shot('trocas');
        const from = await p.$('[data-dbn]'), to = await p.$('[data-dxi="2"]');
        if (from && to) { const A = await from.boundingBox(), B = await to.boundingBox();
          await p.mouse.move(A.x + A.width / 2, A.y + A.height / 2); await p.mouse.down();
          await p.mouse.move(A.x + 40, A.y - 60, { steps: 5 }); await p.mouse.move(B.x + B.width / 2, B.y + B.height / 2, { steps: 8 });
          await shot('trocas-arrastando'); await p.mouse.up(); await p.waitForTimeout(400); }
        // tocar num titular abre a sugestão do banco para a posição; dali troca de lugar com outro titular
        await click('[data-dxi="9"]'); await shot('trocas-sugestao'); await click('#b-lv-swap'); await click('[data-dxi="10"]'); await shot('trocas-feitas');
        await click('#b-lv-back');
        await click('#b-lv-tac'); await click('[data-lf="5-3-2"]'); await click('[data-ls="contra"]'); await shot('tatica');
        await click('#b-lv-back'); await click('#b-lv-go');
        await p.waitForTimeout(2500);
        if (!(await p.$('.lv-sheet.on'))) await click('[data-sp="fim"]');
        else { await click('#b-lv-go'); await click('[data-sp="fim"]'); }
        await p.waitForSelector('#b-lv-end', { timeout: 30000 }); await shot('fim-de-jogo');
        await click('#b-lv-end'); await resTabs('resultado');
      } else if (games === 2) {
        // largou no meio: recarrega antes de ver o resultado; o auxiliar termina o jogo
        await click('[data-sp="fim"]');
        await p.waitForSelector('#b-lv-end', { timeout: 30000 });
        await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
        await click('#b-cont-co'); await shot('largou-no-meio');
      } else { if (await p.$('.lv-sheet.on #b-lv-go')) await click('#b-lv-go'); await click('[data-sp="fim"]'); await click('#b-lv-end'); if (games === 4) await resTabs('resultado-caderno'); }
      continue;
    }
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
