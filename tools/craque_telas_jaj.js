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
  if (process.env.DSF) opts.deviceScaleFactor = +process.env.DSF;
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log('ERRO NA PÁGINA', e.message, (e.stack || '').split('\n').slice(0, 3).join(' ')); });
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
    await tap('.p2-app[data-go="' + k + '"]');
    await shot('app-' + nome);
    if (await has('#fc-back')) await tap('#fc-back');
  }
  // Fase 6: as metas do ano na agenda, com o sonho escolhido, e o legado na ficha
  if (await page.evaluate(() => !!window.CRAQUE_SIM.fcGoals)) {
    await tap('.p2-app[data-go="ag"]');
    await page.evaluate(() => { const g = document.querySelector('.ag-goals'); if (g) g.scrollIntoView({ block: 'center' }); }); await shot('agenda-metas');
    if (await has('[data-dream]')) {
      const center = () => page.evaluate(() => { const g = document.querySelector('.ag-dr') || document.querySelector('.ag-goals'); if (g) g.scrollIntoView({ block: 'center' }); });
      await tap('[data-dream]'); await center(); await shot('agenda-sonho-marcado');
      await tap('#ag-dr-go'); await center(); await shot('agenda-sonho');
    }
    await tap('#fc-back');
  }
  // Fase 3, parte 2: o Zé no Chat (palpite, aposta ali mesmo e a proposta do amarelo)
  if (await page.evaluate(() => !!window.CRAQUE_SIM.fcZeAsk)) {
    await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; c.money = Math.max(c.money || 0, 400000); });
    await tap('.p2-app[data-go="msg"]'); await tap('[data-ch="ze"]');
    if (await has('#ze-ask')) { await tap('#ze-ask'); await shot('chat-ze-palpite'); }
    if (await has('[data-zt]')) { await tap('[data-zt]'); await shot('chat-ze-aposta'); }
    await page.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, c = U.G.c; c.fc.fix = { i: c.fc.i, pay: S.fcFixPay(c), min: 23, st: 'open' }; S.fcZeSync(c); });
    await tap('#fc-back'); await tap('[data-ch="ze"]'); await shot('chat-ze-proposta');
    await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; c.fc.fix = null; });
    await tap('#fc-back'); await tap('#fc-back');
  }
  // Fase 3: loja com carro e casa (manutenção por semana) e a conta no vermelho
  if (await page.evaluate(() => !!window.CRAQUE_SIM.fcUpkeep)) {
    await page.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, c = U.G.c; c.money = 0; c.life = c.life || {}; c.life.car = 'c3'; c.life.house = c.season;
      c.life.paid = { car: S.fcCarPrice(c, 'c3'), house: S.fcLifePrice(c, 'house') }; c.life.mt = { car: S.fcUpkeepOf(c, 'car', 'c3'), house: S.fcUpkeepOf(c, 'life', 'house') }; c.debt = S.fcWeekPay(c) * 6; });
    await tap('.p2-app[data-go="shop"]'); await shot('loja-divida');
    if (await has('#fc-back')) await tap('#fc-back');
    if (await has('.p2-app[data-go="bank"]')) { await shot('celular-no-vermelho'); await tap('.p2-app[data-go="bank"]'); await shot('banco-divida'); if (await has('[data-way="adv"]:not(:disabled)')) { await tap('[data-way="adv"]'); await shot('banco-adiantamento'); } await tap('#fc-back'); }
    if (await page.evaluate(() => !!window.CRAQUE_SIM.fcInvBuy)) {
      await page.evaluate(() => { const S = window.CRAQUE_SIM, c = window.CRAQUE_UI.G.c; c.debt = 0; if (c.fin) c.fin.adv = null; c.money = S.fcInvPrice(c) * 3; S.fcInvBuy(c, 'imovel'); });
      await tap('.p2-app[data-go="bank"]'); await page.evaluate(() => { const b = document.querySelector('.pa-body'); if (b) b.scrollTop = 400; }); await shot('banco-investir'); await tap('#fc-back');
      await tap('.p2-app[data-go="shop"]'); await page.evaluate(() => { const f = document.getElementById('fc-party'); if (f) f.scrollIntoView({ block: 'center' }); }); await shot('loja-festa'); await tap('#fc-back');
    }
    await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; c.debt = 0; c.life = {}; });
  }

  // Fase 4: o app Mercado antes da janela, com a janela aberta (duas propostas) e depois de assinar (a liga nova na tabela)
  if (!process.env.SEM_MERCADO && await page.evaluate(() => !!window.CRAQUE_SIM.fcMove)) {
    await tap('.p2-app[data-go="mkt"]'); await shot('mercado-antes'); await tap('#fc-back');
    // Sondagem: dois jogos antes da janela
    await page.evaluate(() => { const S = window.CRAQUE_SIM, D = window.CRAQUE_DATA, c = window.CRAQUE_UI.G.c, fc = c.fc, cur = D.CLUB_BY_ID[c.club];
      const up = D.CLUBS.filter(x => x.league !== cur.league && x.strength > cur.strength + 3).sort((a, b) => a.strength - b.strength).slice(0, 2);
      fc.mwAt = fc.i + 2; fc.mw = { at: fc.i + 2, s: c.season, sond: up.map(x => Object.assign(S.offerFor(c, x.id, 'up'), { mid: true })), offers: [], st: 'rumor', told: true, g0: fc.acc.games, r0: fc.acc.rsum }; });
    await shot('celular-sondagem'); await tap('.p2-app[data-go="mkt"]'); await shot('mercado-sondagem'); await tap('#fc-back');
    await page.evaluate(() => { const S = window.CRAQUE_SIM, D = window.CRAQUE_DATA, c = window.CRAQUE_UI.G.c, fc = c.fc, cur = D.CLUB_BY_ID[c.club];
      const up = D.CLUBS.filter(x => x.league !== cur.league && x.strength > cur.strength + 3).sort((a, b) => a.strength - b.strength)[0], mid = D.CLUBS.filter(x => x.league === cur.league && x.id !== cur.id && x.strength < cur.strength)[0];
      fc.mwAt = fc.i; fc.mw = { at: fc.i, s: c.season, offers: [up, mid].filter(Boolean).map((x, k) => Object.assign(S.offerFor(c, x.id, k ? 'mid' : 'up', k ? 0 : Math.round(c.wage * 1.5 / 1000) * 1000), { mid: true })), st: 'open' }; });
    await shot('celular-janela');
    await tap('.p2-app[data-go="mkt"]'); await shot('mercado-janela');
    await page.evaluate(() => { const b = document.querySelector('.pa-body'); if (b) b.scrollTop = 9999; }); await shot('mercado-propostas');
    if (await has('#mk-renew:not(:disabled)')) { await tap('#mk-renew'); await tap('.ask-wrap [data-a="ok"]'); await page.evaluate(() => { const b = document.querySelector('.pa-body'); if (b) b.scrollTop = 9999; }); await shot('mercado-aumento'); }
    await page.evaluate(() => { const b = document.querySelector('.pa-body'); if (b) b.scrollTop = 0; });
    await tap('.mk-offers .of-sign[data-i="0"]'); await shot('mercado-confirmar');
    await tap('.ask-wrap [data-a="ok"]'); await shot('mercado-assinou'); await tap('#fc-back');
    await tap('.p2-app[data-go="tbl"]'); await shot('tabela-clube-novo'); await tap('#fc-back');
    await tap('.p2-app[data-go="cal"]'); await shot('jogos-clube-novo'); await tap('#fc-back');
  }

  // Jogos resumidos ou no banco (um cartão só) até o primeiro jogo vivido; depois o "Resumir" de uma vez
  // (versões antes da fase 1 do plano não têm jogo resumido: o primeiro jogo já é vivido)
  await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; c.fc.derbyDone = true; if (!c.fc.wkDue) window.CRAQUE_SIM.fcNext(c); c.fc.pending && c.fc.pending.m && (c.fc.pending.m = null); }); // sem decisão (clássico, final) no caminho das fotos
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
  await page.evaluate(() => { window.CLIMBIX_NAT = 1; window.CRAQUE_UI.G.c.age = Math.max(window.CRAQUE_UI.G.c.age, 19); }); // fase 5: a linha da seleção no jornal
  await page.click('#fc-kick'); await wait(300);
  // CONF=1: confere a cada 200 ms se a legenda, a faixa clara e a posse batem com a bola do campinho (ui/livesim.js), e tira
  // fotos em sequência no 1× (partida-quadro-N) para ver o movimento
  if (process.env.CONF) {
    await page.evaluate(() => {
      const R = window.__conf = { n: 0, bad: [] };
      setInterval(() => {
        const sim = window.CRAQUE_UI.LP._sim, z = document.getElementById('lp-zone'), b = document.getElementById('lp-band'), pe = document.getElementById('lp-pos');
        if (!sim || !z || !b || !document.getElementById('lp-cv')) return;
        const i = sim.info(); if (i.mode !== 'play') return;
        R.n++;
        const third = i.sx < 100 / 3 ? 'l' : i.sx > 200 / 3 ? 'r' : 'c', mineTxt = /^[^:]*/.exec(z.textContent)[0];
        const head = document.querySelectorAll('.lp-tm'), me = document.querySelector('.lp-tm.me span').textContent, op = [...head].find(e => !e.classList.contains('me')).querySelector('span').textContent;
        const team = i.side === 0 ? me : op;
        if (!b.classList.contains(third) && Math.abs(i.sx - 100 / 3) > 4 && Math.abs(i.sx - 200 / 3) > 4) R.bad.push('faixa ' + b.className + ' bola ' + i.sx.toFixed(0));
        if (!mineTxt.startsWith(team) && !/Gol|Saída|Tiro/.test(mineTxt)) R.bad.push('legenda "' + z.textContent + '" com a bola do ' + team);
        if (pe.textContent !== 'Posse ' + Math.round(i.posse * 100) + '%' && Math.abs(parseInt(pe.textContent.slice(6)) - i.posse * 100) > 2) R.bad.push('posse ' + pe.textContent + ' x ' + Math.round(i.posse * 100));
      }, 200);
    });
    // Gol: o placar muda logo depois de a rede balançar no campinho; recomeço: ninguém no campo do outro quando a bola sai
    await page.evaluate(() => {
      const R = window.__conf; R.nets = []; R.scores = []; R.koBad = 0; R.ko = 0; let last = '';
      const loop = () => { const sim = window.CRAQUE_UI.LP._sim; if (sim) { const st = sim._state(); if (st.mode !== last) { if (st.mode === 'goal') R.nets.push(performance.now()); if (last === 'ko' && st.mode === 'play') { R.ko++; if (st.wrong) R.koBad++; } last = st.mode; } } requestAnimationFrame(loop); };
      loop();
      let sc = ''; setInterval(() => { const h = document.getElementById('fc-sh'), a = document.getElementById('fc-sa'); if (!h || !a) return; const v = h.textContent + 'x' + a.textContent; if (sc && v !== sc && v !== '0x0') R.scores.push(performance.now()); sc = v; }, 30);
    });
    for (let q = 1; q <= 6; q++) { await wait(1700); await shot('partida-quadro-' + q); }
  }
  await page.click('#fc-fast', { timeout: 5000 }).catch(() => {}); await wait(9000); // 3× (a partida em 1× dura uns 2 minutos)
  await shot('partida-ao-vivo');
  // O lance do jogo pode vir antes ou depois do intervalo
  const lance = async () => { if (!(await has('#fc-lauto'))) return; await shot('lance-ao-vivo'); await tap('#fc-lauto'); await shot('lance-ao-vivo-fim'); await tap('#fc-lback'); await wait(1200); await shot('partida-volta-do-lance'); if (await has('#fc-fast')) await page.click('#fc-fast', { timeout: 5000 }).catch(() => {}); };
  await page.waitForSelector('#fc-2t, #fc-jn, #fc-next, #fc-lauto', { timeout: 40000 });
  await lance();
  if (await has('#fc-fast')) await page.click('#fc-fast', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('#fc-2t, #fc-jn, #fc-next, #fc-lauto', { timeout: 40000 });
  if (await has('#fc-2t')) { await shot('partida-intervalo'); await page.click('#fc-2t'); await wait(500); if (await has('#fc-fast')) await page.click('#fc-fast', { timeout: 5000 }).catch(() => {}); }
  await page.waitForSelector('#fc-jn, #fc-next, #fc-lauto', { timeout: 40000 });
  await lance();
  await page.waitForSelector('#fc-jn, #fc-next', { timeout: 60000 });
  if (await has('#fc-jn')) { await shot('partida-fim');
    // Fim de jogo em abas: foto de cada uma; no celular nenhuma pode passar da altura da tela
    for (const k of ['ml', 'rd', 'tb']) { if (!(await has('[data-et="' + k + '"]'))) continue; await tap('[data-et="' + k + '"]'); await shot('partida-fim-' + k);
      const h = await page.evaluate(() => document.documentElement.scrollHeight); if (!process.env.DESKTOP && H <= 900 && h > H + 1) errors.push('partida-fim-' + k + ' rola: ' + h + 'px'); }
    await tap('#fc-jn'); await page.waitForSelector('#fc-next', { timeout: 8000 }); }
  if (process.env.CONF) { const R = await page.evaluate(() => window.__conf); console.log('CONFERÊNCIA campinho x textos:', R.n, 'checagens ·', R.bad.length, 'desencontros', JSON.stringify(R.bad.slice(0, 8)));
    console.log('GOLS: rede x placar (s, placar depois da rede):', R.scores.map(t => { const n = R.nets.filter(x => x <= t + 50).pop(); return n === undefined ? 'sem rede' : ((t - n) / 1000).toFixed(2); }).join(' '), '· recomeços', R.ko, 'com alguém no campo errado', R.koBad); }
  await shot('jornal');
  await tap('#fc-next');
  for (let k = 0; k < 10 && !(await has('#fc-play')) && !(await has('#screen .btn.opt[data-i]')); k++) await wait(300);
  if (await has('#fc-skip2')) { await tap('#fc-skip2'); await shot('resumir'); await tap('#fc-next'); for (let k = 0; k < 15 && !(await has('#fc-play')); k++) await wait(400); }
  // As pessoas do celular (fase 2): as mensagens do caminho, a lista do Chat e uma conversa
  if (await has('.p2-app[data-go="msg"]')) {
    await shot('celular-com-mensagens');
    await tap('.p2-app[data-go="msg"]'); await shot('chat');
    if (await has('[data-ch]')) { await tap('[data-ch]'); await shot('chat-conversa'); await tap('#fc-back'); }
    // ZapZap: uma mensagem da mãe pedindo resposta, a resposta escolhida, a mãe digitando e respondendo
    await page.evaluate(() => { const c = window.CRAQUE_UI.G.c, P = c.ppl; P.inbox.push({ p: 'mae', t: 'Filho vi o gol!! Seu pai chorou na sala kkk Te amo, come direito ai', at: c.fc.i, s: c.season, tone: 'bom', sit: 'gol', ask: 1 }); });
    await tap('#fc-back'); await tap('.p2-app[data-go="msg"]'); await shot('zap-lista');
    await tap('[data-ch="mae"]'); await shot('zap-responder');
    if (await has('[data-rp]')) { await tap('[data-rp]'); await shot('zap-digitando'); await wait(1500); await shot('zap-respondido'); }
    await tap('#fc-back'); await tap('#fc-back'); await wait(400);
    // Bet171: o cassino e o Foguetinho (sobe, saca)
    await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; c.money = Math.max(c.money || 0, 400000); });
    await tap('.p2-app[data-go="bet"]'); await shot('bet171');
    if (await has('.mz-g[data-g="crash"]:not(:disabled)')) {
      await tap('.mz-g[data-g="crash"]'); await shot('bet171-foguetinho');
      await tap('#mz-go'); await wait(1200); await shot('bet171-foguetinho-voando');
      if (await has('#mz-go.cash')) await page.click('#mz-go').catch(() => {});
      await wait(600); await shot('bet171-foguetinho-fim');
      await wait(1200); if (await has('#mz-back')) await tap('#mz-back');
    }
    await tap('#fc-back'); await wait(400);
  }
  // Convites da semana na agenda (fase 2, parte 2): garante dois para a foto, responde o arriscado
  const temConvite = await page.evaluate(() => { const c = window.CRAQUE_UI.G.c; if (!window.CRAQUE_SIM.fcInvites) return false; c.fc.wkDue = true; // só para a foto: a semana aberta de novo
    if (!(c.fc.inv || []).length) c.fc.inv = [{ id: 'bar1', ti: 0, x: '', ans: null }, { id: 'faltas', ti: 0, x: '', ans: null }]; c.ppl.st = c.ppl.st || {}; c.ppl.st.bar = c.ppl.st.bar || { n: 1, due: 999, f: {} }; return true; });
  if (temConvite && (await has('.p2-app[data-go="ag"]'))) {
    await tap('.p2-app[data-go="ag"]'); await shot('agenda-convites');
    if (await has('[data-inv][data-a="b"]')) { await tap('[data-inv][data-a="b"]'); await shot('agenda-convite-respondido'); }
    await tap('#fc-back'); await wait(400);
    // O mesmo convite no ZapZap (o da faltas ainda aberto: responde ali)
    const quem = await page.evaluate(() => { const S = window.CRAQUE_SIM, c = window.CRAQUE_UI.G.c, o = S.fcInvites(c).find(x => !x.ans); return o ? S.fcInvDef(o).p : null; });
    if (quem) { await tap('.p2-app[data-go="msg"]'); await tap('[data-ch="' + quem + '"]'); await shot('zap-convite'); await tap('#fc-back'); await tap('#fc-back'); await wait(400); }
    await shot('celular-repercussao'); // a resposta virou assunto no X (fase 2, parte 4)
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
    if (await has('#fc-kick')) { await page.click('#fc-kick'); await wait(300); if (await has('#fc-fast')) await page.click('#fc-fast', { timeout: 5000 }).catch(() => {}); }
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
