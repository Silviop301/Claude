// Uso (na raiz, com o http.server): NODE_PATH=$(npm root -g) node tools/craque_toque_duplo.js   (GAP=300 muda o intervalo)   Esperado: Pulos: 0
// Toque duplo de verdade (2 toques no mesmo ponto, 140 ms): a tela só pode andar UMA vez
const { chromium } = require('playwright');
const GAP = +process.env.GAP || 140;
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  p.on('pageerror', e => { bad++; console.log('erro de página', e.message); });
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); } } catch (e) {} });
  await p.goto('http://127.0.0.1:8765/craque/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const where = () => p.evaluate(() => { const st = document.getElementById('ld-st'); const pop = document.getElementById('ld-pop'); const f = st && st.firstElementChild; return (pop ? 'POP ' + (pop.firstElementChild ? pop.firstElementChild.className : '') + ' | ' : '') + (f ? f.className : '(sem palco)') + (document.querySelector('.lv') ? ' [AO VIVO]' : ''); });
  const dtap = async (sel, nome) => {
    await p.waitForSelector(sel, { timeout: 8000 }); await p.evaluate(() => document.querySelectorAll('.up-ty').forEach(e => e.remove())); await p.waitForTimeout(900);
    const r = await p.$eval(sel, x => { const q = x.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    const a = await where();
    await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(GAP);
    const mid = await where();
    const under = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); const bt = e && e.closest('button,[role=button],a'); return bt ? (bt.id || bt.className) + ' "' + bt.textContent.trim().slice(0, 24) + '"' : (e ? e.className : '-'); }, r);
    await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(1000);
    const z = await where();
    const pulou = mid !== z; if (pulou) bad++;
    console.log((pulou ? 'PULOU ' : 'ok    ') + nome + ': ' + a + ' -> ' + mid + (pulou ? ' -> ' + z : '') + ' · embaixo do dedo na tela nova: ' + under);
    return pulou;
  };
  const tap = async s => { await p.waitForSelector(s, { timeout: 8000 }); await p.evaluate(() => document.querySelectorAll('.up-ty').forEach(e => e.remove())); await p.tap(s); await p.waitForTimeout(850); };
  await p.click('#b-new-co'); await p.waitForTimeout(750); await p.click('#co-start button[data-v="livre"]'); await p.waitForTimeout(400);
  await dtap('#b-co-go', 'Criar carreira');
  if (await p.$('#ldo-go')) await dtap('#ldo-go', 'Assinar com o clube');
  for (let i = 0; i < 3 && await p.$('#ldn-go'); i++) await dtap('#ldn-go', 'Reunião/patrocínio ' + (i + 1));
  if (!await p.$('#ld-play')) { console.log('não cheguei na Semana: ' + await where()); }
  else {
    for (const k of ['time', 'tabela', 'clube', 'mercado']) { if (await p.$('[data-rail="' + k + '"]')) { await dtap('[data-rail="' + k + '"]', 'Semana > ' + k); const back = await p.$('.tcr-back, [id$="-back"]'); if (back) { await p.waitForTimeout(900); await back.tap(); await p.waitForTimeout(900); } if (!await p.$('#ld-play')) { console.log('  (não voltei para a Semana: ' + await where() + ')'); break; } } }
    if (await p.$('#ld-play')) { await dtap('#ld-play', 'Jogar');
      // segue até o ao vivo ou resultado
      for (let i = 0; i < 4; i++) { const w = await where(); if (/AO VIVO/.test(w)) break; const g = await p.$('#ld-pop .btn.gold, #ld-pop [id$="-y"], .ld-st [id$="-go"]'); if (!g) break; const id = await g.evaluate(x => x.id || x.className); await dtap('#' + id, 'depois do Jogar (' + id + ')').catch(e => console.log('  ' + e.message.slice(0, 80))); }
    }
  }
  console.log('fim em: ' + await where()); console.log('Pulos:', bad); await b.close(); process.exit(bad ? 1 : 0);
})();
