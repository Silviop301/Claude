// Fluidez em celular fraco: abre o Treinador deitado (844x390), joga até o ao vivo e mede os quadros com a CPU
// estrangulada (CDP Emulation.setCPUThrottlingRate). Mostra quadros/s, quadros > 33 ms e > 50 ms, e (PERFIL=1)
// as funções que mais gastam (Profiler do Chrome). Uso: NODE_PATH=$(npm root -g) node tools/craque_fluidez.js [cpu=6] [segundos=12]
const { chromium } = require('playwright');
const CPU = +process.argv[2] || 6, SEG = +process.argv[3] || 12, OUT = process.env.OUT || '/tmp/fluidez';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: +process.env.DSF || 3, isMobile: true, hasTouch: true });
  const cdp = await p.context().newCDPSession(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); } localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); } catch (e) {} });
  if (process.env.CSS) await p.addInitScript(c => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st); }); }, process.env.CSS);
  if (process.env.NODRAW) await p.addInitScript(() => { window.__nodraw = 1; });
  if (process.env.NOOP) await p.addInitScript(l => { const P = CanvasRenderingContext2D.prototype; l.split(',').forEach(k => { P[k] = function () {}; }); }, process.env.NOOP);
  if (process.env.CMP) await p.addInitScript(m => { window.__cmp = m; }, +process.env.CMP || 1);
  if (process.env.NOVIG) await p.addInitScript(() => { window.__novig = 1; });
  if (process.env.JSDPR) await p.addInitScript(v => { Object.defineProperty(window, 'devicePixelRatio', { get: () => v }); }, +process.env.JSDPR);
  if (process.env.SEM_SOMBRA) await p.addInitScript(() => { Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', { set() {}, get() { return 0; } }); });
  if (process.env.SEM_FILTRO) await p.addInitScript(() => { Object.defineProperty(CanvasRenderingContext2D.prototype, 'filter', { set() {}, get() { return 'none'; } }); });
  if (process.env.CONTA) await p.addInitScript(() => { window.__ops = {}; const P = CanvasRenderingContext2D.prototype; Object.getOwnPropertyNames(P).forEach(k => { const d = Object.getOwnPropertyDescriptor(P, k); if (typeof d.value === 'function') { const f = d.value; P[k] = function () { window.__ops[k] = (window.__ops[k] || 0) + 1; return f.apply(this, arguments); }; } else if (d.set) { const st = d.set; Object.defineProperty(P, k, { get: d.get, set(v) { if (v) window.__ops['=' + k] = (window.__ops['=' + k] || 0) + 1; st.call(this, v); } }); } }); });
  await p.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/craque/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const click = async sel => { for (let i = 0; i < 30 && !(await p.$(sel)); i++) { const tc = await p.$('.tc-go'); if (tc) await tc.click().catch(() => {}); await p.waitForTimeout(300); } await p.waitForFunction(() => { const L = window.CRAQUE_UI && window.CRAQUE_UI.LD; return !L || !L.busy || !L.busy(); }, null, { timeout: 4000 }).catch(() => {}); await p.click(sel, { timeout: 15000 }); await p.waitForTimeout(800); };
  // mede quadros por rAF dentro da página durante ms
  const frames = async (ms, nome) => {
    const r = await p.evaluate(ms => new Promise(res => { const t = []; let last = performance.now(); const end = last + ms; const f = now => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }), ms);
    const n = r.length, tot = r.reduce((a, x) => a + x, 0), q = [...r].sort((a, c) => a - c), p95 = q[Math.floor(n * 0.95)] || 0;
    const line = `${nome.padEnd(22)} ${(n * 1000 / tot).toFixed(1).padStart(5)} q/s  p95 ${p95.toFixed(0).padStart(3)} ms  >33ms ${r.filter(x => x > 34).length}  >50ms ${r.filter(x => x > 50).length}  pior ${Math.max(...r).toFixed(0)} ms`;
    console.log(line); return line;
  };
  await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await click('#ldn-go'); await click('#ldn-go');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await frames(3000, 'semana (parada)');
  // trocas de tela do Treinador (animação de entrada dos blocos, números, tabela): mede 1,2 s logo depois do toque
  if (process.env.TELAS) for (const r of ['time', 'clube', 'mercado', 'tabela', 'time']) { const fr = frames(1200, 'tela ' + r); await p.click(`[data-rail="${r}"]`).catch(() => {}); await fr; await p.waitForTimeout(500); }
  if (process.env.TELAS) { console.log('erros:', errs.length); return b.close(); }
  await click('#ld-play'); await click('#ld-go'); await click('[data-pk="cima"]'); await click('#ldp-go');
  await p.waitForTimeout(2500);
  if (process.env.PERFIL) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  await cdp.send('Performance.enable'); const m0 = await cdp.send('Performance.getMetrics');
  await frames(SEG * 1000, `ao vivo 1x cpu${CPU}`);
  { const m1 = await cdp.send('Performance.getMetrics'), g = (m, k) => (m.metrics.find(x => x.name === k) || {}).value || 0;
    console.log('  thread principal por segundo:', ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map(k => k.replace('Duration', '') + ' ' + ((g(m1, k) - g(m0, k)) / SEG * 1000).toFixed(0) + ' ms').join(' · '), '· layouts', ((g(m1, 'LayoutCount') - g(m0, 'LayoutCount')) / SEG).toFixed(0) + '/s', '· estilos', ((g(m1, 'RecalcStyleCount') - g(m0, 'RecalcStyleCount')) / SEG).toFixed(0) + '/s', '· nós', g(m1, 'Nodes')); }
  if (process.env.PERFIL) {
    const { profile } = await cdp.send('Profiler.stop'); require('fs').writeFileSync(OUT + '/aovivo.cpuprofile', JSON.stringify(profile));
    const self = {}, byId = {}; profile.nodes.forEach(n => byId[n.id] = n); const dt = profile.timeDeltas; let tot = 0;
    profile.samples.forEach((s, i) => { const n = byId[s], cf = n.callFrame, k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`; self[k] = (self[k] || 0) + (dt[i] || 0); tot += dt[i] || 0; });
    Object.entries(self).sort((a, c) => c[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log((v / tot * 100).toFixed(1).padStart(5) + '%  ' + k));
  }
  if (process.env.CONTA) { await p.evaluate(() => window.__ops = {}); await p.waitForTimeout(2000); console.log(JSON.stringify(Object.entries(await p.evaluate(() => window.__ops)).sort((a, c) => c[1] - a[1]).slice(0, 40))); }
  if (process.env.CMP) console.log('comparação (maior diferença, pixels > 24, média):', JSON.stringify(await p.evaluate(() => window.__cmpR)));
  if (process.env.CMP) { const im = await p.evaluate(() => window.__img); im.forEach((d, i) => require('fs').writeFileSync(OUT + '/cmp' + i + '.png', Buffer.from(d.split(',')[1], 'base64'))); }
  if (process.env.ANIMS) console.log(await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => { const e = a.effect && a.effect.target; return (a.animationName || a.transitionProperty || '?') + ' @' + (e ? (e.id || e.className || e.tagName).toString().slice(0, 40) : '') + ' ' + (a.effect.getComputedTiming().iterations); }).join('\n')));
  await p.screenshot({ path: OUT + '/aovivo.png' });
  if (await p.$('[data-sp="3"], #ldl-sp')) {}
  console.log('erros:', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();
