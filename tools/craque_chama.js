// Chama do técnico (ui/chama.js): regra com relógio trocado (U.chamaNow) + um jogo de verdade pela interface (Só resultado)
// e fotos do cartão da home e dos avisos. Uso: NODE_PATH=$(npm root -g) node tools/craque_chama.js /tmp/ch  (servidor em 8765)
// Esperado: Falhas: 0
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '/tmp/ch'; require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const errs = []; let fails = 0;
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); }
    localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); localStorage.setItem('climbix-deitado', '1'); localStorage.setItem('climbix-co-vel', 'fim'); } catch (e) {} });
  await p.goto('http://127.0.0.1:8765/craque/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const ok = (c, t) => { console.log((c ? 'ok    ' : 'FALHA ') + t); if (!c) fails++; };

  // ---------- regra ----------
  const R = await p.evaluate(() => {
    const U = window.CRAQUE_UI, C = U.CHAMA, r = {};
    const reset = () => { U.ITEMS.get().ch = {}; U.ITEMS.put(); };
    const at = s => { U.chamaNow = () => new Date(s + 'T15:00:00'); };
    const win = { res: 'v', gf: 2, ga: 0 }, loss = { res: 'd', gf: 0, ga: 1 };
    reset(); const c0 = U.COINS.get();
    at('2026-11-01'); r.d1 = C.game(loss).n;
    r.aux = C.game(win, true); // jogo do auxiliar: não conta
    at('2026-11-02'); r.d2 = C.game(loss).n;
    at('2026-11-03'); const g3 = C.game(loss); r.d3 = g3.n; r.m3 = g3.marco && g3.marco.c;
    at('2026-11-03'); r.d3b = C.game(loss).first;
    r.c3 = U.COINS.get() - c0;
    // desafio do dia: 1º jogo do dia com vitória 2x0 cumpre v1/sg/g2; g3 e in2 precisam de mais
    at('2026-11-05'); r.brk = C.game(win).n; // pulou o dia 4 sem protetor: volta a 1
    // protetor
    U.COINS.add({ n: 40, t: 'teste' });
    r.buy1 = C.buy(); r.buy2 = C.buy(); r.buy3 = C.buy(); r.fz = C.state().fz;
    at('2026-11-06'); C.game(loss); // 2 dias
    at('2026-11-08'); const s8 = C.state(); C.settle(); r.saved = C.state().n; r.fzAfter = C.state().fz; r.risk = s8.n;
    at('2026-11-12'); C.settle(); r.lost = C.state().n; r.fzKept = C.state().fz; // 3 dias faltando com 1 protetor: apaga e não gasta
    // desafio pago uma vez
    reset(); at('2026-11-20'); const dc = C.desafio(); const before = U.COINS.get(); let paid = 0;
    for (let i = 0; i < 4; i++) { const g = C.game({ res: 'v', gf: 3, ga: 0 }); if (g.dcDone) paid++; }
    r.dcId = dc.id; r.dcPaid = paid; r.dcCoins = U.COINS.get() - before;
    // junção de aparelhos
    const A = { d: { '2026-11-01': 1, '2026-11-02': 1 }, fb: { f1: 1 }, fu: {}, dc: { k: '2026-11-02', p: 1 } };
    const B = { d: { '2026-11-03': 2 }, fb: { f2: 1 }, fu: { '2026-11-04': 1 }, dc: { k: '2026-11-02', p: 0, done: true } };
    const M = C.merge(A, B); r.mD = Object.keys(M.d).length; r.mFb = Object.keys(M.fb).length; r.mDone = M.dc.done; r.mP = M.dc.p;
    // desafios ao longo de 60 dias
    const cnt = {}; for (let i = 0; i < 60; i++) { const id = C.desafio(new Date(2026, 10, 1 + i)).id; cnt[id] = (cnt[id] || 0) + 1; } r.mix = cnt;
    reset(); delete U.chamaNow;
    return r;
  });
  ok(R.d1 === 1 && R.d2 === 2 && R.d3 === 3, 'dias seguidos 1, 2, 3 (' + [R.d1, R.d2, R.d3] + ')');
  ok(R.aux === null, 'jogo do auxiliar não conta');
  ok(R.m3 === 5, 'marco de 3 dias paga 5');
  ok(R.d3b === false, '2º jogo do dia não acende de novo');
  ok(R.c3 === 5, 'moedas até o dia 3 = 5 (' + R.c3 + ')');
  ok(R.brk === 1, 'pulou um dia sem protetor: volta a 1');
  ok(R.buy1 && R.buy2 && !R.buy3 && R.fz === 2, 'compra no máximo 2 protetores');
  ok(R.saved === 3 && R.fzAfter === 1, 'faltou 1 dia: protetor gasto e a chama segue (' + R.saved + ', sobra ' + R.fzAfter + ')');
  ok(R.lost === 0 && R.fzKept === 1, 'faltou 3 dias com 1 protetor: apaga e guarda o protetor');
  ok(R.dcPaid === 1 && R.dcCoins === 3 + 0, 'desafio paga 3 uma vez só (' + R.dcId + ', ' + R.dcCoins + ')');
  ok(R.mD === 3 && R.mFb === 2 && R.mDone && R.mP === 1, 'junção de dois aparelhos');
  ok(Object.keys(R.mix).length === 5, 'os 5 desafios aparecem em 60 dias ' + JSON.stringify(R.mix));

  // ---------- interface: criar carreira, home com o cartão, jogo de verdade ----------
  const click = async s => { await p.waitForSelector(s, { timeout: 8000 }); await p.waitForTimeout(560); await p.click(s); await p.waitForTimeout(450); };
  await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await click('#ldn-go'); await click('#ldn-go');
  await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(800);
  ok(!!(await p.$('.ch-card')), 'cartão da chama na home com carreira');
  await p.screenshot({ path: out + '/ch1-home-0dias.png' });
  // joga uma rodada (Só resultado) pela Semana
  await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(500);
  await click('.hl-go'); await p.waitForTimeout(800);
  await click('#ld-play'); await click('#ld-go'); await p.waitForTimeout(400);
  if (await p.$('#ld-go')) await click('#ld-go');
  await click('#ldp-go');
  // Só resultado: tela de ~5 s (relógio e gols) antes do resumo; Continuar pula
  await p.waitForSelector('.sr-ov', { timeout: 8000 }); await p.waitForTimeout(2600);
  await p.screenshot({ path: out + '/ch1b-so-resultado-meio.png' });
  await p.waitForTimeout(2600); await p.screenshot({ path: out + '/ch1c-so-resultado-fim.png' });
  ok(/Fim de jogo|Pênaltis/.test(await p.textContent('#sr-ft')), 'Só resultado chega ao 90\'');
  await click('#sr-go');
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => window.CRAQUE_UI.CHAMA.state());
  ok(st.n === 1 && st.lit, 'jogo de verdade acende a chama (' + st.n + ')');
  ok(!!(await p.$('.ch-ov, .pay-ty.ch-t')), 'aviso depois do jogo');
  await p.screenshot({ path: out + '/ch2-depois-do-jogo.png' });
  // fotos: desafio cumprido, marco de 7, home acesa, em risco com protetor
  await p.evaluate(() => { document.querySelectorAll('.ch-ov,.pay-ty').forEach(e => e.remove()); const C = window.CRAQUE_UI.CHAMA, s = C.state();
    C.notify({ first: true, n: 5, dcDone: true, dc: C.desafio(), coins: 3, marco: null, s: Object.assign({}, s, { next: [7, 10] }) }); });
  await p.waitForTimeout(900); await p.screenshot({ path: out + '/ch3-desafio-cumprido.png' });
  await p.evaluate(() => { document.querySelectorAll('.ch-ov').forEach(e => e.remove()); const C = window.CRAQUE_UI.CHAMA;
    C.notify({ first: true, n: 7, dcDone: false, dc: C.desafio(), coins: 10, marco: { n: 7, c: 10 }, s: C.state() }); });
  await p.waitForTimeout(1200); await p.screenshot({ path: out + '/ch4-marco-7.png' });
  await p.evaluate(() => document.querySelectorAll('.ch-ov').forEach(e => e.remove()));
  await p.evaluate(() => window.CRAQUE_UI.home()); await p.waitForTimeout(800); await p.screenshot({ path: out + '/ch5-home-acesa.png' });
  await p.evaluate(() => { const U = window.CRAQUE_UI, c = U.ITEMS.get().ch; const d = new Date(); for (let i = 1; i <= 12; i++) { const x = new Date(d); x.setDate(d.getDate() - i); c.d[U.CHAMA.dayKey(x)] = 1; }
    delete c.d[U.CHAMA.dayKey(d)]; c.fb = { a: 1 }; U.ITEMS.put(); U.chamaNow = () => { const x = new Date(); x.setHours(20); return x; }; U.home(); });
  await p.waitForTimeout(800); await p.screenshot({ path: out + '/ch6-home-risco.png' });
  const box = await p.evaluate(() => { const c = document.querySelector('.ch-card'), r = c && c.getBoundingClientRect(); return r && [r.right, r.bottom, innerWidth, innerHeight]; });
  ok(box && box[0] <= box[2] && box[1] <= box[3], 'cartão dentro da tela ' + JSON.stringify(box));
  await click('#ch-fz'); await p.waitForTimeout(400); await p.screenshot({ path: out + '/ch7-protetor.png' });
  ok(!!(await p.$('#ca-y, .pay-ty.ch-t')), 'tocar no escudo abre a compra do protetor');
  console.log(errs.length ? 'Erros de página:\n' + errs.join('\n') : 'sem erros de página');
  console.log('Falhas: ' + (fails + errs.length)); await b.close();
})();
