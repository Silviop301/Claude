// Compra de moedas de ponta a ponta SEM dinheiro de verdade: sobe o jogo e o `api/pay.php` num `php -S` local, com um
// Mercado Pago de mentira no lugar do de verdade (`CLIMBIX_MP_API`), cria duas contas e confere os caminhos tortos:
// fechar no meio, Pix gerado e não pago, pagar e o aviso se perder, pagar e não voltar, pagar duas vezes a mesma compra,
// aviso repetido, valor errado, recusado, conta alheia. Depois, pela interface (Playwright): comprar na Loja, botão que
// destrava ao voltar, volta com o pagamento esperando, moedas que entram sem recarregar, volta paga, volta sem pagar,
// volta num navegador sem a conta e o segundo pagamento da mesma compra.
// Uso: NODE_PATH=$(npm root -g) node tools/craque_compras.js [pasta das fotos]   (SO=servidor pula a interface; precisa de php com curl e pdo_sqlite)
// Esperado: Falhas: 0
const { spawn } = require('child_process'), http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const OUT = process.argv[2] || '', P1 = +process.env.PORT || 8770, P2 = P1 + 1, BASE = 'http://127.0.0.1:' + P1, MP = 'http://127.0.0.1:' + P2, A = BASE + '/api/pay.php';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
const eq = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'ok    ' : 'FALHA ') + n + (ok ? '' : ': veio ' + JSON.stringify(got) + ', esperado ' + JSON.stringify(want))); };
const wait = ms => new Promise(r => setTimeout(r, ms));
// Mercado Pago de mentira: preferência, pagamento por id e busca por referência
const pays = {};
const set = (id, ref, status, amount) => { pays[id] = { id, external_reference: ref, status, transaction_amount: amount }; };
const mock = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  const u = new URL(q.url, 'http://x'), j = o => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (u.pathname === '/checkout/preferences') return j({ init_point: MP + '/_checkout?ref=' + JSON.parse(b).external_reference });
  if (u.pathname === '/v1/payments/search') return j({ results: Object.values(pays).filter(p => p.external_reference === u.searchParams.get('external_reference')) });
  const m = /^\/v1\/payments\/(\d+)$/.exec(u.pathname); if (m && pays[m[1]]) return j(pays[m[1]]);
  r.writeHead(404); r.end('{}');
}); });
const post = (a, body, url) => fetch((url || A) + '?a=' + a, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json());
const hook = id => fetch(A + '?a=hook&type=payment&data.id=' + id).then(r => r.json());
const sum = c => [c.list.length, c.list.reduce((s, x) => s + x.coins, 0), c.wait, c.paid.length];
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'climbix-compras-'));
  fs.writeFileSync(dir + '/mp-token', 'TEST-de-mentira');
  await new Promise(r => mock.listen(P2, '127.0.0.1', r));
  const php = spawn('php', ['-S', '127.0.0.1:' + P1], { cwd: path.join(__dirname, '..', 'craque'), env: Object.assign({}, process.env, { CLIMBIX_DATA: dir, CLIMBIX_MP_API: MP, PHP_CLI_SERVER_WORKERS: '6' }), stdio: 'ignore' });
  const fim = code => { php.kill(); mock.close(); fs.rmSync(dir, { recursive: true, force: true }); process.exit(code); };
  process.on('unhandledRejection', e => { console.log('FALHA a ferramenta parou: ' + (e && e.message || e)); fim(1); });
  for (let i = 0; i < 40; i++) { try { await fetch(A + '?a=status', { method: 'POST', body: '{}' }); break; } catch (e) { await wait(150); } }
  const conta = async n => { const r = await post('register', { user: n, pass: 'segredo123', pid: require('crypto').randomBytes(8).toString('hex') }, BASE + '/api/account.php'); if (!r.token) { console.log('FALHA criando a conta ' + n + ': ' + JSON.stringify(r)); fim(1); } return r; };
  const ca = await conta('TesteA'), cb = await conta('TesteB'), TA = ca.token, TB = cb.token;
  const claim = async t => { const c = await post('check', { token: t }); await post('claim', { token: t, refs: c.list.map(x => x.ref) }); return c; };

  // ---- presente de boas-vindas (conta nova ganha 36 uma vez, pack 'welcome', fora das entregues) ----
  let w = await post('check', { token: TA });
  eq('conta nova: presente de boas-vindas de 36 esperando', [ca.welcome, w.list.length, (w.list[0] || {}).coins, (w.list[0] || {}).pack], [36, 1, 36, 'welcome']);
  await claim(TA); await claim(TB);
  w = await post('check', { token: TA });
  eq('presente entregue: some da lista e não volta como compra entregue', [w.list.length, w.paid.length], [0, 0]);

  // ---- servidor ----
  let r = await post('create', { token: TA, pack: 'p1' }); const ref1 = r.ref; eq('cria a compra', [/^[a-f0-9]{24}$/.test(ref1), /_checkout/.test(r.url)], [true, true]);
  eq('fechou no meio: nada pago, nada esperando', sum(await post('check', { token: TA })), [0, 0, 0, 0]);
  set(1001, ref1, 'pending', 4.9);
  eq('Pix gerado sem pagar: 1 esperando', sum(await post('check', { token: TA })), [0, 0, 1, 0]);
  set(1001, ref1, 'approved', 4.9); await hook(1001); await hook(1001);
  eq('pagou (aviso duas vezes): 1 compra de 120', sum(await post('check', { token: TA })), [1, 120, 0, 0]);
  eq('a conta B não vê a compra da A', sum(await post('check', { token: TB })), [0, 0, 0, 0]);
  await post('claim', { token: TB, refs: [ref1] });
  eq('a conta B não consegue marcar a compra da A', sum(await post('check', { token: TA })), [1, 120, 0, 0]);
  await claim(TA);
  eq('entregue: sai da lista e fica nas entregues', sum(await post('check', { token: TA })), [0, 0, 0, 1]);
  await hook(1001);
  eq('aviso repetido depois de entregue: nada novo', sum(await post('check', { token: TA })), [0, 0, 0, 1]);
  set(1002, ref1, 'approved', 4.9); await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(() => hook(1002)));
  eq('pagou a mesma compra de novo (8 avisos juntos): mais 1 de 120', sum(await post('check', { token: TA })), [1, 120, 0, 1]);
  await claim(TA); await hook(1002);
  eq('o 2º pagamento entrega uma vez só', sum(await post('check', { token: TA })), [0, 0, 0, 2]);
  set(1003, ref1, 'approved', 1); await hook(1003);
  eq('pagamento com valor errado: nada', sum(await post('check', { token: TA })), [0, 0, 0, 2]);
  set(1007, ref1, 'rejected', 4.9); await hook(1007);
  eq('pagamento recusado: nada', sum(await post('check', { token: TA })), [0, 0, 0, 2]);
  r = await post('create', { token: TA, pack: 'p2' }); set(1004, r.ref, 'approved', 12.9);
  eq('pagou e o aviso se perdeu: a conferência acha (350)', sum(await post('check', { token: TA })), [1, 350, 0, 2]);
  await claim(TA);
  r = await post('create', { token: TA, pack: 'p1' }); set(1005, r.ref, 'approved', 4.9); set(1006, r.ref, 'approved', 4.9);
  eq('dois pagamentos da mesma compra, sem aviso: 2 entregas de 120', sum(await post('check', { token: TA })), [2, 240, 0, 3]);
  await claim(TA);
  eq('no fim: 5 compras entregues, nada sobrando', sum(await post('check', { token: TA })), [0, 0, 0, 5]);
  eq('sem conta: recusa', (await post('check', { token: 'c'.repeat(64) })).error, 'auth');
  if (process.env.SO === 'servidor') { console.log('Compras (só o servidor); Falhas: ' + bad); fim(bad ? 1 : 0); }

  // ---- interface (conta B, que ainda não comprou nada) ----
  const { chromium } = require('playwright');
  const b = await chromium.launch(), errs = [];
  const abre = async (logado, vp) => {
    const cx = await b.newContext({ viewport: vp || { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await cx.addInitScript(([api, acc]) => { window.CLIMBIX_ACCOUNT_API = api; try { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); localStorage.setItem('climbix-deitado', '1'); if (acc) localStorage.setItem('climbix-account', acc); } } catch (e) {} }, [BASE + '/api/account.php', logado ? JSON.stringify(cb) : '']);
    const p = await cx.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const moedas = p => p.evaluate(() => window.CRAQUE_UI.COINS.get());
  const aviso = (p, txt, ms) => p.waitForFunction(t => [...document.querySelectorAll('.pay-ty')].some(e => e.innerText.includes(t)), txt, { timeout: ms || 8000 }).then(() => true, () => false);
  const foto = async (p, n) => { if (OUT) await p.screenshot({ path: OUT + '/' + n + '.png' }); };
  const p = await abre(true);
  await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const m0 = await moedas(p);
  // compra pela Loja: o pagamento "abre" (a ida ao Mercado Pago é barrada para a página ficar) e o botão destrava ao voltar
  await p.route('**/_checkout*', x => x.fulfill({ status: 204 }));
  await p.click('#hl-coins'); await p.waitForSelector('#lj-buy'); await p.waitForTimeout(800);
  let refU = '';
  await p.route('**/pay.php?a=create', async x => { const rs = await x.fetch(); refU = (await rs.json()).ref; await x.fulfill({ response: rs }); });
  await p.click('#lj-buy'); await p.waitForTimeout(900);
  eq('Loja: a compra abre e fica marcada no aparelho', [/^[a-f0-9]{24}$/.test(refU), await p.evaluate(() => !!localStorage.getItem('climbix-pay-open')), await p.innerText('#lj-buy')], [true, true, 'Abrindo…']);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(300);
  eq('voltou sem pagar: o botão destrava', /^Comprar/.test(await p.innerText('#lj-buy')), true);
  // voltou do Mercado Pago com o Pix gerado e não pago: avisa que as moedas entram sozinhas
  set(2001, refU, 'pending', 12.9);
  await p.goto(BASE + '/?pago=' + refU, { waitUntil: 'load' });
  eq('volta com o pagamento esperando: avisa', await aviso(p, 'ainda não confirmado', 30000), true); await foto(p, '1-esperando');
  eq('  o endereço fica limpo e nada entrou', [/pago=/.test(p.url()), await moedas(p)], [false, m0]);
  // o pagamento entra enquanto a pessoa está na Loja: voltou para o jogo (sem recarregar) e as moedas chegam
  await p.click('.pay-ty button').catch(() => {}); await p.click('#hl-coins'); await p.waitForSelector('.lj');
  set(2001, refU, 'approved', 12.9); await hook(2001);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  eq('pagou e voltou para o jogo sem recarregar: agradece', await aviso(p, 'Obrigado'), true); await p.waitForTimeout(400); await foto(p, '2-obrigado-na-loja');
  eq('  +350 moedas, segue na Loja e desmarca a compra aberta', [await moedas(p) - m0, !!(await p.$('.lj')), await p.evaluate(() => !!localStorage.getItem('climbix-pay-open'))], [350, true, false]);
  // volta paga pelo link do Mercado Pago
  r = await post('create', { token: TB, pack: 'p1' }); const ref2 = r.ref; set(2002, ref2, 'approved', 4.9); await hook(2002);
  await p.goto(BASE + '/?pago=' + ref2, { waitUntil: 'load' });
  eq('volta paga: agradece e soma 120', [await aviso(p, 'Obrigado'), await moedas(p) - m0], [true, 470]);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
  eq('  recarregar não soma de novo', [await moedas(p) - m0, await p.$$eval('.pay-ty', e => e.length)], [470, 0]);
  // pagou a mesma compra de novo: entra na próxima abertura do jogo
  set(2003, ref2, 'approved', 4.9); await hook(2003);
  await p.reload({ waitUntil: 'load' });
  eq('2º pagamento da mesma compra: mais 120 ao abrir o jogo', [await aviso(p, 'Obrigado'), await moedas(p) - m0], [true, 590]);
  // voltou sem pagar (o Mercado Pago manda para o endereço de falha)
  r = await post('create', { token: TB, pack: 'p1' });
  await p.goto(BASE + '/?pago=' + r.ref + '&falhou=1', { waitUntil: 'load' });
  eq('volta sem pagar: avisa e nada entra', [await aviso(p, 'não foi concluída'), await moedas(p) - m0], [true, 590]); await foto(p, '3-nao-concluida');
  // voltou num navegador sem a conta, com o celular em pé (iPhone: o app instalado e o Safari não dividem a conta)
  const q = await abre(false, { width: 390, height: 844 });
  await q.goto(BASE + '/?pago=' + ref2, { waitUntil: 'load' });
  eq('volta num navegador sem a conta: manda abrir o jogo', await aviso(q, 'Compra registrada'), true); await foto(q, '4-sem-conta-em-pe');
  eq('  o aviso cabe na tela em pé', await q.evaluate(() => { const r = document.querySelector('.pay-ty').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), true);
  if (errs.length) { bad += errs.length; console.log('FALHA erro de página: ' + errs.join(' | ')); }
  // criar conta pela interface: presente de boas-vindas com aviso; outra conta nova no mesmo aparelho não soma de novo
  const nv = await abre(false); await nv.goto(BASE + '/', { waitUntil: 'load' }); await nv.waitForTimeout(1200);
  const reg = async u => { await nv.evaluate(() => window.CRAQUE_UI.cloud('register')); await nv.waitForSelector('#acc-user');
    await nv.fill('#acc-user', u); await nv.fill('#acc-pass', 'segredo123'); await nv.waitForTimeout(600); await nv.click('#acc-go'); };
  const w0 = await moedas(nv); await reg('NovaC');
  eq('conta nova pela interface: aviso de boas-vindas', await aviso(nv, 'Bem-vindo'), true); await foto(nv, '5-boas-vindas');
  eq('  +36 moedas na carteira', (await moedas(nv)) - w0, 36);
  await nv.evaluate(() => { localStorage.removeItem('climbix-account'); document.querySelectorAll('.pay-ty').forEach(e => e.remove()); });
  await reg('NovaD'); await nv.waitForTimeout(3000);
  eq('  outra conta no mesmo aparelho: sem presente de novo', [(await moedas(nv)) - w0, await aviso(nv, 'Bem-vindo', 1500)], [36, false]);
  await b.close();
  console.log('Compras de ponta a ponta' + (OUT ? ', fotos em ' + OUT : '') + '; Falhas: ' + bad); fim(bad ? 1 : 0);
})();
