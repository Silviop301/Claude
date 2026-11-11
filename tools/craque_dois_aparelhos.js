// Uso (na raiz, com o http.server): NODE_PATH=$(npm root -g) node tools/craque_dois_aparelhos.js   (~1 min)   Esperado: Problemas: 0
// Mesma conta em dois aparelhos: A cria a carreira, B continua e joga 3 rodadas, A (que ficou aberto) volta para a frente e
// tem de recarregar com a carreira de B; C tem o save velho, nuvem lenta e toca em Continuar na hora. A nuvem é de mentira (rotas), compartilhada entre os dois navegadores.
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); let bad = 0; const fail = t => { bad++; console.log('PROBLEMA', t); };
  let cloud = null, delay = 0, pushes = 0;
  const mk = async (seed) => {
    const ctx = await br.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await ctx.route('**/api/**', async r => { const u = r.request().url();
      if (/account\.php\?a=pull/.test(u)) { if (delay) await new Promise(ok => setTimeout(ok, delay)); return r.fulfill({ json: { save: cloud, user: 'teste', links: [], pass: true } }); }
      if (/account\.php\?a=push/.test(u)) { cloud = JSON.parse(r.request().postData()).data; pushes++; return r.fulfill({ json: { ok: true } }); }
      return r.fulfill({ json: {} }); });
    const p = await ctx.newPage(); p.on('pageerror', e => fail('erro de página ' + e.message));
    await p.addInitScript(sd => { try { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); localStorage.setItem('climbix-deitado', '1'); localStorage.setItem('climbix-account', JSON.stringify({ token: 'x', user: 'teste', links: [] })); if (sd) for (const k in sd) localStorage.setItem(k, sd[k]); } } catch (e) {} }, seed || null);
    await p.goto('http://127.0.0.1:8765/craque/', { waitUntil: 'load' }); return p;
  };
  const tap = async (p, s) => { await p.waitForSelector(s, { timeout: 10000 }); await p.waitForTimeout(600); await p.tap(s); await p.waitForTimeout(850); };
  const round = p => p.evaluate(() => { const c = window.CRAQUE_UI._co.co; return c && c.ss ? c.ss.i : -1; });
  const play = (p, n) => p.evaluate(n => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, c = U._co.co; for (let i = 0; i < n; i++) { const nx = S.coNext(c); if (nx.bye) { S.coSkipRound(c); continue; } const m = S.coMatchStart(c); S.coMatchRest(c, m); S.coMatchEnd(c, m); } U._co.save(); }, n);
  // A cria a carreira e chega na Semana
  const A = await mk(); await A.waitForTimeout(1500);
  await tap(A, '.hl-go, #b-new-co'); if (await A.$('#co-start')) { await A.tap('#co-start button[data-v="livre"]'); await A.waitForTimeout(500); await tap(A, '#b-co-go'); }
  await tap(A, '#ldo-go'); await tap(A, '#ldn-go'); await tap(A, '#ldn-go'); await A.waitForSelector('#ld-play');
  await play(A, 1); const rA = await round(A); const stale = await A.evaluate(() => ({ 'climbix-treinador-v1': localStorage.getItem('climbix-treinador-v1') }));
  await A.waitForTimeout(5200); console.log('A na rodada', rA, '· nuvem tem a carreira:', !!(cloud && cloud.treinador && cloud.treinador.co));
  // B abre, continua e joga 3 rodadas
  const B = await mk(); await B.waitForTimeout(2500);
  await tap(B, '.hl-go'); await B.waitForSelector('#ld-play', { timeout: 8000 }).catch(() => fail('B não abriu a carreira da nuvem'));
  const rB0 = await round(B); if (rB0 !== rA) fail('B abriu na rodada ' + rB0 + ', A estava na ' + rA);
  await play(B, 3); const rB = await round(B); await B.waitForTimeout(5200); console.log('B jogou até a rodada', rB, '· nuvem na rodada', cloud.treinador.co.ss.i);
  // A volta do segundo plano (o app ficou aberto na Semana com a carreira velha na memória)
  await A.waitForTimeout(12000);
  await A.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await A.waitForTimeout(3500);
  const toast = await A.evaluate(() => { const e = document.querySelector('.pay-ty'); return e ? e.textContent : ''; }); console.log('aviso em A:', toast || '(nenhum)');
  if (!toast) fail('A não avisou');
  if (await A.$('#ld-play')) fail('A continuou na Semana com a carreira velha');
  await tap(A, '.hl-go'); await A.waitForSelector('#ld-play', { timeout: 8000 }).catch(() => fail('A não reabriu'));
  const rA2 = await round(A); console.log('A reabriu na rodada', rA2); if (rA2 !== rB) fail('A reabriu na rodada ' + rA2 + ', B parou na ' + rB);
  await play(A, 1); await A.waitForTimeout(5200); if (cloud.treinador.co.ss.i !== rB + 1) fail('nuvem na rodada ' + cloud.treinador.co.ss.i + ' depois de A jogar mais uma');
  // C: aparelho com a carreira velha guardada, nuvem lenta (1,5 s), toca em Continuar em 400 ms
  delay = 1500; const C = await mk(stale); await C.waitForSelector('.hl-go'); await C.waitForTimeout(400); await C.tap('.hl-go'); await C.waitForSelector('#ld-play', { timeout: 8000 }).catch(() => fail('C não abriu'));
  const rC = await round(C); console.log('C (save velho, nuvem lenta, toque rápido) abriu na rodada', rC, '· nuvem', cloud.treinador.co.ss.i); if (rC !== cloud.treinador.co.ss.i) fail('C abriu a carreira velha');
  await C.waitForTimeout(5200); if (cloud.treinador.co.ss.i !== rB + 1) fail('C apagou o avanço: nuvem na rodada ' + cloud.treinador.co.ss.i);
  console.log('Problemas:', bad); await br.close(); process.exit(bad ? 1 : 0);
})();
