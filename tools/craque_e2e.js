// Teste de ponta a ponta do Climbix: joga carreiras inteiras no navegador, pela interface, como um jogador faria
// (criar o garoto, escolher clube, pré-temporada, eventos, lances decisivos em automático, temporadas, janela,
// Copa e Mundial simulados, aposentadoria e tela final). A cada passo guarda os erros do console e procura
// "undefined", "NaN", "null" e "[object Object]" no texto da tela, além de rolagem horizontal (layout estourando).
//
// Uso (na raiz do repositório, com o servidor local no ar):
//   python3 -m http.server 8765 &
//   NODE_PATH=/opt/node22/lib/node_modules node tools/craque_e2e.js [carreiras por posição] [largura] [paralelo]
//   ex.: node tools/craque_e2e.js 30 390 4   → 30 carreiras em cada posição (ATA, MEI, ZAG, GOL), tela de 390 px, 4 abas
//        node tools/craque_e2e.js 5 320 2    → teste rápido em 320 px
// Variáveis: BASE (padrão http://localhost:8765/craque/) · POS=ATA,GOL (só estas posições) · OUT=arquivo.json (relatório
// completo) · SHOTS=pasta (foto de cada problema) · SLOW=1 (sem acelerar os temporizadores)
// Playwright precisa estar instalado (o Chromium já está em /opt/pw-browsers).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const N = +process.argv[2] || 30, WIDTH = +process.argv[3] || 390, PAR = +process.argv[4] || 4;
const BASE = process.env.BASE || 'http://localhost:8765/craque/';
const POSITIONS = (process.env.POS || 'ATA,MEI,ZAG,GOL').split(',');
const SHOTS = process.env.SHOTS || '';
const COUNTRIES = ['Brasil', 'Argentina', 'Uruguai', 'Colômbia', 'Portugal', 'Espanha', 'Inglaterra', 'Itália', 'Alemanha', 'França', 'Holanda'];
const BAD = /\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]/;
const pick = a => a[Math.floor(Math.random() * a.length)];

// Configuração do jogo gravada antes de a página carregar: lances em automático, Copa simulada, resumo rápido,
// sem jornais nem 3D (o que interessa é o fluxo e o texto). Os temporizadores do jogo rodam 20× mais rápido.
function initScript(slow) {
  return `
    localStorage.setItem('climbix-config', JSON.stringify({ papers: 'none', cups: 'sim', moments: 'auto', fast: true, fx3d: false, vibe: false }));
    localStorage.setItem('craque-sound', 'off');
    if (!${slow}) {
      const st = window.setTimeout;
      window.setTimeout = (fn, ms, ...a) => st(fn, Math.min(ms || 0, 40) * 0.5, ...a);
    }
    window.__e2e = { errors: [] };
    window.addEventListener('error', e => window.__e2e.errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', e => window.__e2e.errors.push('promise: ' + String(e.reason && e.reason.stack || e.reason)));
  `;
}

// Um passo: olha a tela e faz o que um jogador faria. Devolve { did, screen } (o que clicou e um resumo da tela).
// Roda dentro da página (sem Playwright) para ser rápido.
function stepInPage(opts) {
  const { pos, country, chance } = opts;
  const $ = id => document.getElementById(id);
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const click = el => { el.click(); return true; };
  const twice = el => { el.click(); el.click(); return true; };
  const label = (what) => ({ did: what, screen: (q('#screen .eyebrow') || q('#screen h2') || q('#screen h1') || { textContent: '?' }).textContent.trim().slice(0, 60) });
  // Sobreposições (por cima da tela): fecham primeiro
  const ask = q('.ask-wrap [data-a="ok"]'); if (ask) return label('ask:ok ' + click(ask));
  const big = q('.bigmoment'); if (big) return label('bigmoment ' + click(big));
  const wo = q('.walkout'); if (wo) { wo.click(); return label('walkout'); }
  const pw = q('.paper-wrap'); if (pw) { pw.click(); return label('paper'); }
  const sl = q('.sl-anim'); if (sl) { sl.click(); return label('sala'); }
  const alb = q('.album');
  if (alb) {
    if (q('.album #al-share')) return label('album:x ' + click(q('.album .al-x')));
    const r = alb.getBoundingClientRect();
    alb.dispatchEvent(new MouseEvent('click', { clientX: r.right - 10, clientY: r.top + 60, bubbles: true }));
    return label('album:next');
  }
  // Ficha do jogador: passa pelas abas (a ficha redesenha tudo a cada aba, então a memória fica fora dela) e fecha
  if (q('.sheet-wrap [data-t]')) {
    const seen = window.__e2e.tabs = window.__e2e.tabs || [];
    const tab = qa('.sheet-wrap [data-t]').find(b => !seen.includes(b.dataset.t));
    if (tab) { seen.push(tab.dataset.t); return label('sheet:tab ' + click(tab)); }
    window.__e2e.tabs = [];
  }
  const sh = q('.sheet-wrap .sh-x, .sl-sheet-wrap #sl-close, .cfg-wrap .cfg-x'); if (sh) return label('close-sheet ' + click(sh));
  const sala = q('.sala #sl-back'); if (sala) return label('sala:back ' + click(sala));
  // Post nas redes aberto
  if ($('b-hater') && Math.random() < 0.5) return label('post:hater ' + click($('b-hater')));
  if ($('b-post-next')) return label('post:next ' + click($('b-post-next')));
  // Fim de carreira: nova carreira (o teste conta a carreira como terminada)
  if ($('b-again')) {
    if ($('b-album') && !$('b-album').dataset.e2e) { $('b-album').dataset.e2e = '1'; return label('finale:album ' + click($('b-album'))); }
    if ($('b-sala-car') && !$('b-sala-car').dataset.e2e) { $('b-sala-car').dataset.e2e = '1'; return label('finale:sala ' + click($('b-sala-car'))); }
    // Edição da carta: troca a assinatura (uma liberada) e abre a aba de estilo
    const sg = qa('#screen [data-sign]:not(.lock):not(.on)'); if (sg.length && !$('ed-box').dataset.e2e) { $('ed-box').dataset.e2e = '1'; return label('finale:sign ' + click(rnd(sg))); }
    const et = q('#screen [data-edtab="style"]:not(.on)'); if (et && Math.random() < 0.5) return label('finale:style ' + click(et));
    const sp = qa('#screen [data-sp]:not(.on)'); if (sp.length && Math.random() < 0.5) return label('finale:card ' + click(rnd(sp)));
    click($('b-again')); return { did: 'finale', screen: 'finale', done: true };
  }
  // Tela inicial: nova carreira
  if ($('b-new') && !$('b-next1')) return label('home:new ' + click($('b-new')));
  // Criação 1 de 2: posição, país e nome
  if ($('b-next1')) {
    const pb = q('#f-pos button[data-v="' + pos + '"]'); if (pb) pb.click();
    const cb = q('#f-country button[data-v="' + country + '"]'); if (cb) cb.click();
    const nm = $('f-name'); if (nm) { nm.value = rnd(['Zé Pequeno', "D'Alessandro", 'Kauã <b>x</b>', 'Luís Ângelo', 'Rafa', 'O\'Neil']); nm.dispatchEvent(new Event('input')); }
    return label('create:next1 ' + click($('b-next1')));
  }
  // Criação 2 de 2: sortear o visual e começar
  if ($('b-go')) { if ($('b-dice') && Math.random() < 0.5) $('b-dice').click(); return label('create:go ' + click($('b-go'))); }
  // Copa / Mundial: começar (simula direto pela configuração)
  if ($('b-wc')) return label('wc:start ' + click($('b-wc')));
  // Pré-temporada: característica (obrigatória quando o botão de seguir está travado), investimentos às vezes, seguir
  if ($('b-skip')) {
    const ch = qa('#screen .choice[data-i]');
    if ($('b-skip').disabled && ch.length) return label('pre:trait ' + twice(rnd(ch)));
    const inv = qa('#screen .choice.inv[data-v]:not([disabled])');
    if (inv.length && Math.random() < chance.invest) return label('pre:invest ' + twice(rnd(inv)));
    const tr = qa('#screen .train-opt[data-t]'); if (tr.length && Math.random() < 0.3) rnd(tr).click();
    if (Math.random() < 0.05 && q('[data-sheet]')) return label('pre:sheet ' + click(q('[data-sheet]')));
    if (!$('b-skip').disabled) return label('pre:skip ' + click($('b-skip')));
    return label('pre:wait');
  }
  // Evento: uma opção (a primeira de uma proposta de clube pede dois toques)
  const evOpts = qa('#screen .btn.opt[data-i]');
  if (evOpts.length) { const o = rnd(evOpts); return label('event:' + o.dataset.i + ' ' + twice(o)); }
  // Pouco espaço no elenco
  const sq = qa('#screen [data-sq]');
  if (sq.length) { const o = rnd(sq); return label('squad:' + o.dataset.sq + ' ' + twice(o)); }
  // Resumo da temporada / resultado de evento ou lance / fim da Copa: às vezes posta nas redes, às vezes anuncia a despedida ou para
  if ($('b-next')) {
    if ($('b-post') && Math.random() < chance.post) return label('post ' + click($('b-post')));
    if ($('b-farewell') && Math.random() < chance.farewell) return label('farewell ' + click($('b-farewell')));
    if ($('b-stop') && Math.random() < chance.stop) return label('stop ' + click($('b-stop')));
    return label('next ' + click($('b-next')));
  }
  // Janela de transferências / base / empréstimo: uma proposta (dois toques); às vezes pede novas propostas ou uma liga
  const offers = qa('#screen .offer[data-i]');
  if (offers.length) {
    if ($('b-reroll') && !$('b-reroll').disabled && Math.random() < 0.15) return label('offers:reroll ' + click($('b-reroll')));
    if ($('b-askl') && !$('b-askl').disabled && Math.random() < 0.15) return label('offers:ask ' + click($('b-askl')));
    if ($('b-retire') && Math.random() < chance.stop) return label('offers:retire ' + click($('b-retire')));
    const o = rnd(offers); return label('offer:' + o.dataset.i + ' ' + twice(o));
  }
  // Pedido de liga aberto: escolhe uma (dois toques)
  const lg = qa('.sheet-wrap [data-lg]'); if (lg.length) return label('askl ' + twice(rnd(lg)));
  // Copa em andamento (simulando): só espera
  if ($('wc-list')) return label('wc:play');
  return label('nada');
}

// Varredura da tela: textos ruins e rolagem horizontal
function scanInPage(BAD_SRC) {
  const BAD = new RegExp(BAD_SRC);
  const txt = document.body.innerText || '';
  const out = { bad: null, overflow: false, errors: (window.__e2e && window.__e2e.errors.splice(0)) || [] };
  const m = txt.match(BAD);
  if (m) { const i = txt.indexOf(m[0]); out.bad = txt.slice(Math.max(0, i - 60), i + 40).replace(/\s+/g, ' '); }
  const w = document.documentElement.scrollWidth, vw = window.innerWidth;
  if (w > vw + 1) {
    // Quem estourou: o elemento mais largo que a tela
    const wide = Array.from(document.querySelectorAll('#screen *, #bar *')).find(e => e.getBoundingClientRect().right > vw + 1 && e.getBoundingClientRect().width > 20);
    out.overflow = (w - vw) + 'px' + (wide ? ' · ' + wide.tagName.toLowerCase() + (wide.className ? '.' + String(wide.className).split(' ')[0] : '') + ' «' + (wide.textContent || '').trim().slice(0, 40) + '»' : '');
  }
  return out;
}

async function tour(page, issues) {
  const note = (kind, detail, screen) => issues.push({ kind, pos: '-', career: -1, country: '-', screen, detail: String(detail).slice(0, 300) });
  const seq = [['b-ach', 'b-back'], ['b-col', 'b-back-home'], ['b-rank', 'b-back-home'], ['b-sala', 'sl-back'], ['b-sound', null], ['b-cloud', 'b-back-home']];
  for (const [open, back] of seq) {
    const ok = await page.evaluate(id => { const b = document.getElementById(id); if (b) b.click(); return !!b; }, open);
    if (!ok) continue;
    await page.waitForTimeout(80);
    // Na Sala e na coleção: abre um detalhe / vira uma página
    await page.evaluate(() => { const x = document.querySelector('.sala .sl-case .ni, #bk-next'); if (x) x.click(); });
    await page.waitForTimeout(80);
    const scan = await page.evaluate(scanInPage, BAD.source);
    scan.errors.forEach(e => note('console', e, 'tela:' + open));
    if (scan.bad) note('texto', scan.bad, 'tela:' + open);
    if (scan.overflow) note('layout', scan.overflow, 'tela:' + open);
    await page.evaluate(id => { document.querySelectorAll('.sl-sheet-wrap #sl-close, .cfg-wrap .cfg-x').forEach(x => x.click()); const b = id && document.getElementById(id); if (b) b.click(); }, back);
    await page.waitForTimeout(60);
  }
  await page.waitForFunction(() => document.getElementById('b-new'));
}

async function career(page, pos, idx, issues, stats) {
  const country = pick(COUNTRIES);
  const chance = { invest: 0.6, post: 0.15, farewell: 0.06, stop: 0.02 };
  let last = '', same = 0, steps = 0, seasons = 0;
  const seen = new Set(), cov = {};
  const note = (kind, detail, screen) => {
    const key = kind + '|' + screen + '|' + String(detail).slice(0, 50);
    if (seen.has(key)) return; seen.add(key);
    issues.push({ kind, pos, career: idx, country, screen, detail: String(detail).slice(0, 300) });
    if (SHOTS) page.screenshot({ path: path.join(SHOTS, kind + '-' + pos + idx + '-' + issues.length + '.png') }).catch(() => {});
  };
  for (; steps < 4000; steps++) {
    let r;
    try { r = await page.evaluate(stepInPage, { pos, country, chance }); } catch (e) { note('erro-teste', e.message, '?'); break; }
    const kind = r.did.split(' ')[0]; cov[kind] = (cov[kind] || 0) + 1;
    if (r.done) break;
    if (/^next/.test(r.did) && /^Temporada /.test(r.screen)) seasons++;
    const scan = await page.evaluate(scanInPage, BAD.source);
    scan.errors.forEach(e => note('console', e, r.screen));
    if (scan.bad) note('texto', scan.bad, r.screen);
    if (scan.overflow) note('layout', scan.overflow, r.screen);
    const sig = r.did + '|' + r.screen;
    same = sig === last ? same + 1 : 0; last = sig;
    if (same > 60) { note('travou', 'tela não muda: ' + sig, r.screen); break; }
    if (r.did === 'wc:play' || r.did === 'pre:wait' || r.did === 'nada' || same > 2) await page.waitForTimeout(same > 20 ? 150 : 30);
  }
  stats.push({ pos, idx, country, steps, seasons, cov });
}

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const jobs = [];
  POSITIONS.forEach(p => { for (let i = 0; i < N; i++) jobs.push([p, i]); });
  const issues = [], stats = [], pageErrors = [];
  const t0 = Date.now();
  async function worker(k) {
    const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 780 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'pt-BR' });
    await ctx.addInitScript(initScript(!!process.env.SLOW));
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push({ worker: k, msg: e.message, stack: String(e.stack || '').split('\n').slice(0, 3).join(' | ') }));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_CERT|net::/.test(m.text())) pageErrors.push({ worker: k, msg: 'console: ' + m.text() }); });
    // Sem internet: 3D (CDN), ranking e nuvem não respondem; o jogo precisa seguir mesmo assim
    await page.route(/cdn\.jsdelivr\.net|\/api\//, r => r.abort());
    await page.goto(BASE + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.CRAQUE_UI && document.getElementById('b-new'));
    await tour(page, issues);
    while (jobs.length) {
      const [p, i] = jobs.shift();
      const before = pageErrors.length;
      await career(page, p, i, issues, stats);
      pageErrors.slice(before).forEach(e => issues.push({ kind: 'pageerror', pos: p, career: i, screen: '-', detail: e.msg + (e.stack ? ' @ ' + e.stack : '') }));
      const done = stats.length;
      if (done % 10 === 0 || done === N * POSITIONS.length) console.log('… ' + done + '/' + N * POSITIONS.length + ' carreiras · ' + issues.length + ' problemas · ' + Math.round((Date.now() - t0) / 1000) + ' s');
    }
    await ctx.close();
  }
  await Promise.all(Array.from({ length: Math.min(PAR, jobs.length) }, (_, k) => worker(k)));
  await browser.close();

  // Resumo
  const byPos = {};
  stats.forEach(s => { const b = byPos[s.pos] = byPos[s.pos] || { n: 0, seasons: 0, steps: 0 }; b.n++; b.seasons += s.seasons; b.steps += s.steps; });
  console.log('\nCarreiras: ' + stats.length + ' em ' + Math.round((Date.now() - t0) / 1000) + ' s · largura ' + WIDTH + 'px');
  Object.entries(byPos).forEach(([p, b]) => console.log('  ' + p + ': ' + b.n + ' carreiras · ' + (b.seasons / b.n).toFixed(1) + ' temporadas · ' + Math.round(b.steps / b.n) + ' passos por carreira'));
  // Cobertura: quantas vezes cada tipo de tela/ação apareceu (soma de todas as carreiras)
  const cov = {};
  stats.forEach(s => Object.entries(s.cov || {}).forEach(([k, v]) => { cov[k] = (cov[k] || 0) + v; }));
  console.log('Cobertura: ' + Object.keys(cov).sort().map(k => k + ' ' + cov[k]).join(' · '));
  const groups = {};
  issues.forEach(x => { const k = x.kind + ' · ' + x.screen + ' · ' + x.detail.slice(0, 90); groups[k] = (groups[k] || 0) + 1; });
  const keys = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
  console.log('Problemas: ' + issues.length + ' (' + keys.length + ' diferentes)');
  keys.slice(0, 60).forEach(k => console.log('  ' + groups[k] + '× ' + k));
  if (process.env.OUT) { fs.writeFileSync(process.env.OUT, JSON.stringify({ width: WIDTH, n: N, stats, issues }, null, 1)); console.log('Relatório completo em ' + process.env.OUT); }
  process.exit(issues.some(x => x.kind !== 'layout') ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
