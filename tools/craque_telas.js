// Fotos das telas do Climbix para revisar o visual (antes e depois de mexer no CSS).
// Joga uma carreira pela interface com sorteio fixo (o mesmo robô do craque_e2e.js; a carreira se repete igual a cada
// rodada) e tira uma foto na primeira vez que cada tela aparece. Depois passa pelas telas de fora da carreira (início,
// Minhas carreiras, conquistas, coleção, Sala de Troféus, ranking, conta, configurações, opinião, pacotinhos,
// Relâmpago) e monta o treino e os minigames direto na tela.
//
// Uso (na raiz, com o servidor no ar: python3 -m http.server 8765 &):
//   NODE_PATH=$(npm root -g) node tools/craque_telas.js <pasta> [largura] [altura]
//   ex.: node tools/craque_telas.js /tmp/antes                       → celular 390×844
//        DESKTOP=1 node tools/craque_telas.js /tmp/antes-pc 1440 900  → computador (com o zoom de monitor)
// Variáveis: SO=pre,evento,lance (só as telas cujo nome começa assim; a carreira para quando todas saíram)
//   · CARREIRAS=ATA,GOL* (posições das carreiras jogadas em sequência; * = craque, com atributos e teto altos, para
//     aparecerem títulos, Copa e carta nova; padrão ATA,GOL*) · SEED=3 (outras carreiras) · VEZES=2 (fotos de cada tela)
//   · INTEIRA=1 (também a tela inteira, rolando, quando passa da altura) · DPR=2 (foto nítida)
//   · BASE=http://localhost:8765/craque/ · DICAS=1 (com as dicas da primeira carreira)
// Sai: <pasta>/NN-nome.png (+ NN-nome.inteira.png) e <pasta>/telas.json (nome, arquivo, texto do título).
// O nome da tela é estável entre rodadas: compare "antes" e "depois" pelo nome, não pelo número.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const OUT = process.argv[2];
if (!OUT) { console.error('Uso: node tools/craque_telas.js <pasta> [largura] [altura]'); process.exit(2); }
const W = +process.argv[3] || (process.env.DESKTOP ? 1440 : 390), H = +process.argv[4] || (process.env.DESKTOP ? 900 : 844);
const BASE = process.env.BASE || 'http://localhost:8765/craque/';
const SO = (process.env.SO || '').split(',').map(s => s.trim()).filter(Boolean);
const CARS = (process.env.CARREIRAS || 'ATA,GOL*').split(',').map(x => ({ pos: x.replace('*', '').trim(), star: x.includes('*') }));
const SEED = +process.env.SEED || 1, VEZES = +process.env.VEZES || 1;
const FULL = !!process.env.INTEIRA, DPR = +process.env.DPR || 1;
fs.mkdirSync(OUT, { recursive: true });
const want = k => !SO.length || SO.some(p => k.startsWith(p));

// O robô do teste de ponta a ponta, com sorteio próprio (fixo) no lugar do Math.random
const E2E = fs.readFileSync(path.join(__dirname, 'craque_e2e.js'), 'utf8');
function fnSource(src, name) {
  const i = src.indexOf('function ' + name + '(');
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); }
  throw new Error('não achei ' + name + ' em craque_e2e.js');
}
// liga pedida ao empresário: o robô sorteia pela posição na lista; ordenar pelo id mantém a mesma escolha
// mesmo que a lista mude de ordem na tela (antes e depois de uma mudança visual batem)
const STEP = fnSource(E2E, 'stepInPage').replace(/Math\.random\(\)/g, 'window.__rnd()')
  .replace("qa('.sheet-wrap [data-lg]')", "qa('.sheet-wrap [data-lg]').sort((a, b) => a.dataset.lg < b.dataset.lg ? -1 : a.dataset.lg > b.dataset.lg ? 1 : 0)");

// Antes de a página carregar: configuração (jornal especial, Copa simulada, lances com tela de abertura), sem som,
// sorteio fixo (Math.random e o robô) e temporizadores acelerados como no e2e
const INIT = `
  localStorage.setItem('climbix-config', JSON.stringify({ papers: 'special', cups: 'sim', moments: 'play', fast: false, fx3d: false, vibe: false, v: 2 }));
  localStorage.setItem('craque-sound', 'off');
  ${process.env.DICAS ? '' : `localStorage.setItem('climbix-dicas-v1', '{"off":true}');`}
  (function () {
    const mk = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    Math.random = mk(${SEED} * 7919 + 13);
    window.__rnd = mk(${SEED} * 104729 + 7);
    const st = window.setTimeout;
    window.setTimeout = (fn, ms, ...a) => st(fn, Math.min(ms || 0, 40) * 0.5, ...a);
  })();
  window.__e2e = { errors: [] };
  window.addEventListener('error', e => window.__e2e.errors.push(String(e.message)));
  // Tela parada: o robô só age quando nada mudou no DOM há um tempo (a mesma carreira em toda rodada)
  window.__lastMut = 0;
  new MutationObserver(() => { window.__lastMut = performance.now(); }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
`;

// Nome da tela atual (segue a ordem do robô: o que está por cima vem primeiro)
function keyInPage() {
  const $ = id => document.getElementById(id), q = s => document.querySelector(s);
  const U = window.CRAQUE_UI, c = U && U.G && U.G.c;
  if (q('.ask-wrap [data-a="ok"]')) return 'pergunta';
  if (q('.bigmoment')) return 'titulo-tela-cheia';
  const mo = q('.mo-wrap'); if (mo) return 'animacao-' + (mo.className.split(' ')[1] || 'x');
  if (q('.walkout')) return 'carta-nova';
  if (q('.paper-wrap')) return 'jornal';
  if (q('.sl-anim')) return 'sala-entrada';
  if (q('.album')) return 'album';
  if (q('.pk-wrap')) return 'pacotinho';
  if (q('.sheet-wrap [data-t]')) return 'ficha';
  if (q('.sheet-wrap [data-lg]')) return 'pedir-liga';
  if (q('.sheet-wrap, .sl-sheet-wrap, .cfg-wrap')) return 'folha';
  if (q('.sala #sl-back')) return 'sala';
  if ($('b-post-next')) return 'post-x';
  if ($('b-again')) return 'fim-carreira';
  if ($('b-new') && !$('b-start')) return 'inicio';
  if ($('b-start')) return 'criacao-1';
  if ($('b-go')) return 'criacao-2';
  if ($('b-wc')) return 'copa-convocacao';
  if ($('b-auto')) return 'lance';
  if ($('b-skip')) return $('b-skip').disabled ? 'pre-temporada' : 'pre-temporada-escolhida';
  if (q('#screen .btn.opt[data-i]')) return 'evento';
  if (q('#screen [data-sq]')) return 'pouco-espaco';
  if ($('b-next')) {
    if (q('#screen .ob5-res')) return 'lance-resultado';
    if (q('#screen .ob3-res, #screen .ev-res')) return 'evento-resultado';
    if (q('#screen .wc-end, #screen .wc-fin, #screen .wc-o7')) return 'copa-fim';
    if (q('#screen .s-hero')) return 'resumo-temporada';
    return 'continuar';
  }
  if (q('#screen .offer[data-i]')) return c && c.club ? 'janela' : 'base';
  if ($('wc-list')) return 'copa-jogos';
  if ($('sx-live') && q('#screen .s-hero')) return 'temporada-ao-vivo';
  if ($('skip-hint')) return 'reta-final';
  return 'outra';
}
// Telas que mudam sozinhas (ao vivo): foto quase na hora (espera em ms), sem esperar assentar
const LIVE = { 'temporada-ao-vivo': 0, 'reta-final': 120, 'copa-jogos': 300 };

(async () => {
  const browser = await chromium.launch();
  const opts = { viewport: { width: W, height: H }, deviceScaleFactor: DPR, serviceWorkers: 'block', locale: 'pt-BR' };
  if (!process.env.DESKTOP) Object.assign(opts, { isMobile: true, hasTouch: true });
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Sem internet: 3D (CDN), ranking e nuvem não respondem; o jogo segue mesmo assim
  await page.route(/cdn\.jsdelivr\.net|unpkg\.com|cdnjs|\/api\//, r => r.abort());
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CRAQUE_UI && document.getElementById('b-new'));
  // Carreira com semente fixa; o craque (window.__star) começa com atributos e teto altos
  await page.evaluate(([src, key, seed]) => {
    window.__step = new Function('return (' + src + ')')();
    window.__key = new Function('return (' + key + ')')();
    const S = window.CRAQUE_SIM, nc = S.newCareer;
    S.newCareer = (o, s) => {
      const c = nc(o, s || seed + (window.__car || 0));
      if (window.__star && !s) { Object.keys(c.attrs).forEach(k => { c.attrs[k] = Math.min(80, c.attrs[k] + 12); }); c.pot = Math.max(c.pot, 96); }
      return c;
    };
  }, [STEP, keyInPage.toString(), SEED * 7919 + 1]);

  const index = [], counts = {};
  let n = 0;
  async function shot(key, settle) {
    if (!want(key)) return;
    n++;
    const name = String(n).padStart(2, '0') + '-' + key;
    if (settle) await page.waitForTimeout(settle);
    const title = await page.evaluate(() => { const e = document.querySelector('#screen h2, #screen h1, .pk-wrap .pk-eyebrow, .album, .walkout'); return e ? (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70) : ''; }).catch(() => '');
    await page.screenshot({ path: path.join(OUT, name + '.png'), animations: 'disabled' }).catch(e => console.log('foto falhou', key, e.message));
    const item = { key, file: name + '.png', title };
    if (FULL) {
      const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
      if (h > H + 40) { await page.screenshot({ path: path.join(OUT, name + '.inteira.png'), fullPage: true, animations: 'disabled' }).catch(() => {}); item.full = name + '.inteira.png'; }
    }
    index.push(item);
    console.log('  ' + name + (title ? '  · ' + title : ''));
  }
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => { console.log('  (falhou: ' + e.message.split('\n')[0] + ')'); return null; });
  const click = sel => ev(s => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
  const wait = ms => page.waitForTimeout(ms);

  // ---------- 1. Primeira visita ----------
  console.log('Primeira visita');
  await shot('inicio-primeira-visita', 900);

  // ---------- 2. As carreiras ----------
  const career = !SO.length || SO.some(p => !/^(inicio|minhas|conquistas|colecao|sala|ranking|conta|config|opiniao|pacotinho|relampago|treino|minigame)/.test(p));
  let steps = 0, last = '', same = 0, sheetDone = false, car = 0, busy = 0;
  const startCar = async () => { const k = CARS[car]; console.log('Carreira ' + (car + 1) + ': ' + k.pos + (k.star ? ' (craque)' : '') + ', semente ' + SEED); await page.evaluate(([i, st]) => { window.__car = i; window.__star = st; }, [car, k.star]); };
  if (career) await startCar();
  while (career && steps++ < 60000) {
    // Nome da tela e passo do robô no mesmo instante: o que aparece sozinho (jornal, animação) não escapa da foto
    const done = Object.keys(counts).filter(k => counts[k] >= VEZES);
    let t;
    try {
      t = await page.evaluate(a => {
        const k = window.__key(), quiet = performance.now() - window.__lastMut > 120 || a.tired;
        if (!a.skip.includes(k) && !a.done.includes(k) && (!a.so.length || a.so.some(p => k.startsWith(p))) && (quiet || k in a.live)) return { key: k, shoot: true };
        if (!quiet) return { key: k, wait: true };
        // Abertura do lance: decide no automático (o minigame sai na parte 4)
        if (k === 'lance') { document.getElementById('b-auto').click(); return { key: k, r: { did: 'lance:auto', screen: '' } }; }
        return { key: k, r: window.__step(a.opts) };
      }, { done, so: SO, live: LIVE, tired: busy > 100, skip: ['outra', 'continuar', 'inicio'], opts: { pos: CARS[car].pos, country: 'Brasil', chance: { invest: 0.6, post: 0.25, farewell: 0.05, stop: 0 } } });
    } catch (e) { console.log('robô falhou: ' + e.message.split('\n')[0]); break; }
    if (t.wait) { busy++; await wait(30); continue; }
    busy = 0;
    if (t.shoot) {
      const cnt = counts[t.key] || 0;
      counts[t.key] = cnt + 1;
      // Fim de carreira: o jornal da despedida abre por cima; a foto é da tela depois de fechar o jornal
      if (t.key === 'fim-carreira') { await wait(1200); if (await click('.paper-wrap')) await wait(700); }
      await shot(t.key + (cnt ? '-' + (cnt + 1) : ''), t.key in LIVE ? LIVE[t.key] : 400);
      // Ficha do jogador (aberta da pré-temporada)
      if (t.key.startsWith('pre-temporada') && !sheetDone && want('ficha')) {
        sheetDone = true; counts.ficha = VEZES;
        await ev(() => window.CRAQUE_UI.sheet()); await shot('ficha', 600);
        await click('.sheet-wrap .sh-x'); await wait(200);
      }
      if (SO.length && SO.every(p => Object.keys(counts).some(k => k.startsWith(p) && counts[k] >= VEZES))) break;
      continue;
    }
    const r = t.r;
    if (r.done) { if (++car >= CARS.length) break; await startCar(); continue; }
    if (t.key === 'lance') { await wait(60); continue; }
    const sig = r.did + '|' + r.screen;
    same = sig === last ? same + 1 : 0; last = sig;
    if (same > 80) { console.log('travou em ' + sig); break; }
    if (r.did === 'wc:play' || r.did === 'pre:wait' || r.did === 'nada' || same > 2) await wait(same > 20 ? 150 : 30);
  }
  if (career) console.log('  (' + steps + ' passos)');

  // ---------- 3. Fora da carreira ----------
  console.log('Fora da carreira');
  const home = async () => {
    await ev(() => {
      const b = document.getElementById('sl-back'); if (b) b.click();
      document.querySelectorAll('.pk-wrap, .sheet-wrap, .sl-sheet-wrap, .cfg-wrap, .album, .walkout, .mo-wrap, .sala, .trn-wrap').forEach(x => x.remove());
      document.body.classList.remove('sala-on');
      window.CRAQUE_UI.home();
    });
    await wait(300);
  };
  await page.waitForFunction(() => document.getElementById('b-new'), null, { timeout: 15000 }).catch(() => {});
  await home();
  await shot('inicio-volta', 900);
    if (await click('#b-rank')) { await shot('ranking', 700); }
  await ev(() => window.CRAQUE_UI.mine()); await shot('minhas-carreiras', 700);
  if (await click('#b-ach')) await shot('conquistas', 700);
  await ev(() => window.CRAQUE_UI.mine());
  if (await click('#b-col')) {
    await shot('colecao', 700);
    if (await click('#bk-next')) await shot('colecao-pagina', 700);
    // a página 1 pode não ter carta: avança até achar uma
    for (let i = 0; i < 14 && !(await page.$('#screen .col-slot.has')); i++) if (!(await click('#bk-next'))) break;
    if (await click('#screen .col-slot.has')) await shot('colecao-carta', 900);
  }
  await ev(() => window.CRAQUE_UI.mine());
  if (await click('#b-sala')) {
    await wait(400); await click('.sl-anim');
    await shot('sala-trofeus', 900);
    if (await click('.sala .sl-case .ni')) { await shot('sala-detalhe', 700); await click('.sl-sheet-wrap #sl-close'); }
    await click('#sl-back'); await wait(200);
  }
  await home();
  if (await click('#b-sound')) { await shot('configuracoes', 600); await click('.cfg-wrap .cfg-x'); }
  await home();
  if (await click('#b-sound') && await click('.cfg-wrap #cfg-acc')) await shot('conta', 700);
  await home();
  if (await ev(() => { if (!window.CRAQUE_UI.feedback) return false; window.CRAQUE_UI.feedback('inicio', {}, window.CRAQUE_UI.home); return true; })) await shot('opiniao', 700);
  await home();
  if (await click('#b-hb-packs')) {
    await shot('pacotinho', 900);
    await click('.pk-wrap #pk-stage, .pk-wrap .pk-env, .pk-wrap'); await wait(2500);
    await shot('pacotinho-aberto', 600);
  }
  await home();
  // Relâmpago: tela de entrada, escolha da bola e a cobrança
  if (await ev(() => { if (!window.CRAQUE_UI.relampago) return false; window.CRAQUE_UI.relampago(); return true; })) {
    await shot('relampago-inicio', 700);
    if (await click('#rl-start')) {
      await wait(500); await shot('relampago-bola', 600);
      if (await click('#rl-pick [data-b], #rl-pick button')) { await wait(1800); await shot('relampago-chute', 0); }
    }
  }

  // ---------- 4. Treino e minigames (montados direto na tela) ----------
  console.log('Treino e minigames');
  await home();
  const mount = (type, pos, style) => ev(([type, pos, style]) => {
    const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, D = window.CRAQUE_DATA;
    const c = S.newCareer({ name: 'Rafa Lima', pos, foot: 'D', country: 'Brasil', number: 10 }, 99);
    c.club = (D.CLUBS.find(x => x.league === 'bra1') || D.CLUBS[0]).id; c.age = 22;
    Object.keys(c.attrs).forEach(k => { c.attrs[k] = Math.max(c.attrs[k], 68); });
    U.G.c = c; U.G.step = 'moment'; U.bar();
    U.render('<div class="ob5-board mini">' + U.crest(c.club) + '<b class="ob5-g">1</b><span class="ob5-mid"><span class="ob5-min"><i aria-hidden="true"></i>88\'</span><small>Final</small></span><b class="ob5-g">1</b>' + U.crest(D.CLUBS[1].id) + '</div><div id="kick"></div>');
    U.playMini(document.getElementById('kick'), type, () => {}, null, null, style);
    return true;
  }, [type, pos, style]);
  for (const [type, pos] of [['cup', 'ATA'], ['classico', 'MEI'], ['save', 'GOL'], ['tackle', 'ZAG'], ['pass', 'MEI']]) {
    if (!want('minigame-' + type)) continue;
    await mount(type, pos, null); await wait(1700);
    await shot('minigame-' + type, 0);
    await home();
  }
  if (want('treino')) {
    await ev(() => { const S = window.CRAQUE_SIM, U = window.CRAQUE_UI; U.G.c = S.newCareer({ name: 'Rafa Lima', pos: 'ATA', foot: 'D', country: 'Brasil' }, 99); U.training('cup'); });
    await shot('treino', 900);
  }

  fs.writeFileSync(path.join(OUT, 'telas.json'), JSON.stringify({ width: W, height: H, desktop: !!process.env.DESKTOP, careers: CARS, seed: SEED, shots: index, errors }, null, 1));
  console.log('\n' + index.length + ' fotos em ' + OUT + (errors.length ? ' · ' + errors.length + ' erros na página: ' + [...new Set(errors)].slice(0, 5).join(' | ') : ''));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
