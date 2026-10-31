// Fotos das telas do Jogo a Jogo (c.mode 'completa') para o antes e depois da fase 1 do plano ("Tela limpa").
// Carreira com sorteio fixo, sempre o mesmo caminho: criação, base, pré-temporada, celular e cada app, um jogo inteiro
// (antes do apito, ao vivo, intervalo, jornal), um jogo com lance (a parada e o minigame) e o fim da temporada.
//
// Uso (na raiz, com o servidor no ar: python3 -m http.server 8765 &):
//   NODE_PATH=$(npm root -g) node tools/craque_telas_jaj.js <pasta> [largura] [altura]
//   ex.: node tools/craque_telas_jaj.js /tmp/jaj-antes            → celular 390×844
//        DESKTOP=1 node tools/craque_telas_jaj.js /tmp/jaj-pc 1440 900
// Variáveis: POS=ATA (posição) · SEED=1 · BASE=http://localhost:8765/craque/ · FULL=1 (página inteira)
// Sai: <pasta>/NN-nome.png e <pasta>/telas.json (nome, arquivo, título, erros). Compare antes e depois pelo nome.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const OUT = process.argv[2];
if (!OUT) { console.error('Uso: node tools/craque_telas_jaj.js <pasta> [largura] [altura]'); process.exit(2); }
const W = +process.argv[3] || (process.env.DESKTOP ? 1440 : 390), H = +process.argv[4] || (process.env.DESKTOP ? 900 : 844);
const BASE = process.env.BASE || 'http://localhost:8765/craque/';
const POS = process.env.POS || 'ATA', SEED = +process.env.SEED || 1;
fs.mkdirSync(OUT, { recursive: true });

const INIT = `
  localStorage.setItem('climbix-config', JSON.stringify({ papers: 'special', cups: 'sim', moments: 'play', fast: false, fx3d: false, vibe: false, v: 2 }));
  localStorage.setItem('craque-sound', 'off');
  localStorage.setItem('climbix-dicas-v1', '{"off":true}');
  (function () {
    const mk = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    Math.random = mk(${SEED} * 7919 + 13);
  })();
  window.__errs = [];
  window.addEventListener('error', e => window.__errs.push(String(e.message)));
`;

(async () => {
  const browser = await chromium.launch();
  const opts = { viewport: { width: W, height: H }, serviceWorkers: 'block', locale: 'pt-BR' };
  if (!process.env.DESKTOP) Object.assign(opts, { isMobile: true, hasTouch: true });
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/cdn\.jsdelivr\.net|unpkg\.com|cdnjs|\/api\//, r => r.abort());
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CRAQUE_UI && document.getElementById('b-new-fc'));
  await page.evaluate(seed => { const S = window.CRAQUE_SIM, nc = S.newCareer; S.newCareer = (o, s) => nc(o, s || seed); }, SEED * 7919 + 1);

  const index = []; let n = 0;
  const wait = ms => page.waitForTimeout(ms);
  async function shot(key) {
    n++;
    const name = String(n).padStart(2, '0') + '-' + key;
    await wait(250);
    const title = await page.evaluate(() => { const e = document.querySelector('#screen h2, #screen h1'); return e ? e.textContent.trim().replace(/\s+/g, ' ').slice(0, 70) : ''; }).catch(() => '');
    await page.screenshot({ path: path.join(OUT, name + '.png'), animations: 'disabled', fullPage: !!process.env.FULL }).catch(e => console.log('foto falhou', key, e.message));
    index.push({ key, file: name + '.png', title });
    console.log(name, '·', title);
  }
  // Toque com folga (a proteção contra toque duplo ignora cliques logo depois de a tela abrir)
  async function tap(sel) { await wait(600); await page.click(sel, { timeout: 5000 }); await wait(350); }
  const has = sel => page.$(sel).then(Boolean);

  // Criação e começo da carreira
  await tap('#b-new-fc');
  await page.click('#f-pos [data-v="' + POS + '"]');
  await shot('criacao');
  await tap('#b-start');
  await shot('base');
  await tap('#screen .offer[data-i] .btn, #screen .offer[data-i]');
  if (!(await has('#b-skip')) && (await has('#screen .offer[data-i]'))) await tap('#screen .offer[data-i] .btn, #screen .offer[data-i]');
  for (let k = 0; k < 30 && !(await has('#b-skip')); k++) { await page.mouse.click(W / 2, H / 2); await wait(400); } // assinatura animada: toque pula
  await wait(500);
  for (let k = 0; k < 8 && (await has('#b-skip:disabled')); k++) {
    await wait(600);
    await page.evaluate(() => { const a = document.querySelector('.ask-wrap [data-a="ok"]'); if (a) return a.click(); const e = document.querySelector('#screen .choice[data-i]'); if (e) e.click(); });
  }
  await shot('pre-temporada');
  await tap('#b-skip');
  for (let k = 0; k < 10 && !(await has('#fc-play')); k++) await wait(400);

  // O celular e cada app
  await shot('celular');
  const apps = [['msg', 'chat-vazio'], ['ag', 'agenda'], ['tbl', 'tabela'], ['cal', 'jogos'], ['me', 'ficha'], ['shop', 'loja'], ['bet', 'ze']];
  for (const [k, nome] of apps) {
    await tap('.ph-app[data-go="' + k + '"]');
    await shot('app-' + nome);
    if (await has('#fc-agok')) await tap('#fc-agok'); else if (await has('#fc-back')) await tap('#fc-back');
  }

  // Jogos resumidos ou no banco (um cartão só) até o primeiro jogo vivido; depois o "Resumir" de uma vez
  // (versões antes da fase 1 do plano não têm jogo resumido: o primeiro jogo já é vivido)
  await page.evaluate(() => { window.CRAQUE_UI.G.c.fc.pending && window.CRAQUE_UI.G.c.fc.pending.m && (window.CRAQUE_UI.G.c.fc.pending.m = null); });
  const seen = new Set();
  for (let k = 0; k < 45; k++) {
    if (await has('#screen .btn.opt[data-i]')) { await tap('#screen .btn.opt[data-i]'); await page.waitForSelector('#b-next', { timeout: 8000 }); await tap('#b-next'); await page.waitForSelector('#fc-play', { timeout: 15000 }); }
    await tap('#fc-play');
    await page.waitForSelector('#fc-kick, #fc-next, #fc-lauto', { timeout: 15000 });
    if (await has('#fc-kick')) break;
    // O seu lance antes do resumo (fase 1, parte 2): a parada, a carta decide e o resultado
    if (await has('#fc-lauto')) {
      if (!seen.has('lance-comum')) { seen.add('lance-comum'); await shot('lance-comum'); }
      await tap('#fc-lauto'); // no resumo o cartão do jogo já mostra como foi o lance
      await page.waitForSelector('#fc-next', { timeout: 15000 });
      if (!seen.has('jogo-com-lance')) { seen.add('jogo-com-lance'); await shot('jogo-com-lance'); }
    }
    const kind = await page.evaluate(() => (document.querySelector('.fb-h') || {}).textContent || 'resumo');
    const key = 'jogo-' + (/banco/i.test(kind) ? 'banco' : /folga/i.test(kind) ? 'folga' : 'resumido');
    if (!seen.has(key)) { seen.add(key); await shot(key); }
    await tap('#fc-next');
    await page.waitForSelector('#fc-play, #screen .btn.opt[data-i]', { timeout: 15000 });
    if (k === 0) await shot('celular-depois-de-um-jogo');
  }
  // Um jogo inteiro: antes do apito, ao vivo, intervalo e o jornal
  await wait(1500); // viagem de avião ou ônibus
  await shot('partida-antes');
  await page.click('#fc-kick'); await wait(300);
  await shot('partida-ao-vivo');
  // O lance do jogo pode vir antes ou depois do intervalo
  const lance = async () => { if (!(await has('#fc-lauto'))) return; await shot('lance-ao-vivo'); await tap('#fc-lauto'); await shot('lance-ao-vivo-fim'); await tap('#fc-lback'); };
  await page.waitForSelector('#fc-2t, #fc-next, #fc-lauto', { timeout: 40000 });
  await lance();
  await page.waitForSelector('#fc-2t, #fc-next, #fc-lauto', { timeout: 40000 });
  if (await has('#fc-2t')) { await shot('partida-intervalo'); await page.click('#fc-2t'); }
  await page.waitForSelector('#fc-next, #fc-lauto', { timeout: 40000 });
  await lance();
  await page.waitForSelector('#fc-next', { timeout: 40000 });
  await shot('jornal');
  await tap('#fc-next');
  for (let k = 0; k < 10 && !(await has('#fc-play')) && !(await has('#screen .btn.opt[data-i]')); k++) await wait(300);
  if (await has('#fc-skip2')) { await tap('#fc-skip2'); await shot('resumir'); await tap('#fc-next'); await wait(600); }
  // As pessoas do celular (fase 2): as mensagens do caminho, a lista do Chat e uma conversa
  if (await has('.ph-app[data-go="msg"]')) {
    await shot('celular-com-mensagens');
    await tap('.ph-app[data-go="msg"]'); await shot('chat');
    if (await has('[data-ch]')) { await tap('[data-ch]'); await shot('chat-conversa'); await tap('#fc-back'); }
    await tap('#fc-back'); await wait(400);
  }
  // Convites da semana na agenda (fase 2, parte 2): garante dois para a foto, responde o arriscado
  const temConvite = await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; if (!window.CRAQUE_SIM.fcInvites) return false; c.fc.wkDue = true; // só para a foto: a semana aberta de novo
    if (!(c.fc.inv || []).length) c.fc.inv = [{ id: 'bar1', ti: 0, x: '', ans: null }, { id: 'faltas', ti: 0, x: '', ans: null }]; c.ppl.st = c.ppl.st || {}; c.ppl.st.bar = c.ppl.st.bar || { n: 1, due: 999, f: {} }; return true; });
  if (temConvite) {
    await tap('.ph-app[data-go="ag"]'); await shot('agenda-convites');
    if (await has('[data-inv][data-a="b"]')) { await tap('[data-inv][data-a="b"]'); await shot('agenda-convite-respondido'); }
    await tap('#fc-agok'); await wait(400);
  }

  // Até um jogo com lance (simula os do meio com a carta decidindo) e a parada do lance
  const got = await page.evaluate(() => {
    const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, c = U.G.c;
    for (let k = 0; k < 200; k++) {
      if (c.fc.wkDue) S.fcWeek(c);
      if (S.fcEventDue(c)) { const ev = S.fcPickEvent(c); if (ev) S.resolveEvent(c, ev, 0); continue; }
      const nx = S.fcNext(c);
      if (!nx) return false;
      if (nx.moment) { U.save(); U.fcHub(); return true; }
      S.fcPlay(c);
    }
    return false;
  });
  if (got) {
    await wait(600);
    if (await has('#fc-play')) { await shot('celular-jogo-com-lance'); await tap('#fc-play'); }
    for (let k = 0; k < 10 && !(await has('#fc-kick')); k++) await wait(300);
    if (await has('#fc-kick')) { await page.click('#fc-kick'); }
    for (let k = 0; k < 300 && !(await has('#b-auto')) && !(await has('.mo-wrap')); k++) { if (await has('#fc-2t')) await page.click('#fc-2t').catch(() => {}); await wait(150); }
    await shot('lance');
  }

  // Fim da temporada: o resto simulado, depois o resumo
  await page.evaluate(() => {
    const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, c = U.G.c;
    if (c.fc.pending && c.fc.pending.m && !c.fc.pending.mDone) S.fcAutoMoment(c, c.fc.pending.m);
    for (let k = 0; k < 400 && !c.fc.done; k++) {
      if (c.fc.wkDue) S.fcWeek(c);
      if (S.fcEventDue(c)) { const ev = S.fcPickEvent(c); if (ev) S.resolveEvent(c, ev, 0); continue; }
      const nx = S.fcNext(c); if (!nx) break;
      if (nx.moment) S.fcAutoMoment(c, nx.moment);
      S.fcPlay(c);
    }
    U.save(); U.fcHub();
  });
  await wait(1500);
  for (let k = 0; k < 20 && !(await has('#b-next')); k++) { await page.mouse.click(W / 2, H / 2); await wait(300); }
  await shot('fim-temporada');

  const errs = errors.concat(await page.evaluate(() => window.__errs).catch(() => []));
  fs.writeFileSync(path.join(OUT, 'telas.json'), JSON.stringify({ w: W, h: H, pos: POS, seed: SEED, screens: index, errors: errs }, null, 1));
  console.log(index.length + ' fotos em ' + OUT + (errs.length ? ' · erros: ' + errs.slice(0, 5).join(' | ') : ' · sem erros'));
  await browser.close();
})();
