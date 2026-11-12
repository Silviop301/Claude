// Carreira longa do Treinador PELA INTERFACE: várias temporadas seguidas com toque de verdade nas viradas de ano.
// A cada temporada o motor joga até faltar uma rodada, o último jogo é ao vivo (pulando para o fim) e o robô passa pelo
// resultado, pela festa da taça ou pela demissão, pelas 4 abas do Fim da temporada (gasta o ponto de habilidade),
// pelas propostas, pela reunião e pelo patrocínio, até cair na Semana do ano seguinte. Confere a cada passo: erro de
// página, texto quebrado (undefined, NaN), janelinha presa, elenco de 11 a 28, caixa com número de verdade e a temporada
// que anda. É o teste das viradas de temporada, que os passeios do craque_telas_deitado.js só fazem uma vez.
// Uso: NODE_PATH=$(npm root -g) node tools/craque_carreira_telas.js [temporadas=5] [pasta das fotos]   (SAFE=47 com o entalhe; SOBE=1 começa por baixo e
// põe o clube em 1º toda temporada: confere a festa do acesso a cada subida)
// Esperado: Problemas: 0
const { chromium } = require('playwright');
const fs = require('fs');
const N = +process.argv[2] || 5, OUT = process.argv[3] || '', SAFE = +process.env.SAFE || 0, URL = process.env.URL || 'http://127.0.0.1:8765/craque/';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  if (SAFE) await (await p.context().newCDPSession(p)).send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: SAFE, right: SAFE, bottom: 21 } });
  p.on('pageerror', e => errs.push('erro de página: ' + e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); } } catch (e) {} });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  let nShot = 0, festas = 0, subiu = 0;
  const SOBE = !!process.env.SOBE;
  const shot = async n => { if (OUT) await p.screenshot({ path: OUT + '/' + String(++nShot).padStart(2, '0') + '-' + n + '.png' }); };
  const has = sel => p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.getClientRects().length && !e.disabled); }, sel);
  // toque de verdade; a janelinha engole toque por 450 ms depois de abrir (pop em coachland.js)
  const tap = async sel => { await p.evaluate(() => new Promise(r => { const w = document.getElementById('ld-pop'); if (!w) return r(); if (!w.__t) w.__t = Date.now(); setTimeout(r, Math.max(0, 560 - (Date.now() - w.__t))); })); await p.click(sel, { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(650); };
  const texto = async onde => { const t = await p.evaluate(() => (document.getElementById('ld') || {}).innerText || ''); const m = t.match(/.{0,40}(undefined|NaN|\[object).{0,20}/); if (m) errs.push('texto quebrado em ' + onde + ': ' + m[0].replace(/\s+/g, ' ')); };
  const estado = () => p.evaluate(() => { const U = window.CRAQUE_UI, co = U._co.co; if (!co) return null; const f = co.fin || {}; return { s: co.season, club: co.club, n: (co.squad || []).length, caixa: f.caixa, i: co.ss ? co.ss.i : -1, R: co.ss ? co.ss.rounds.length : 0, fama: co.fame, pts: co.xp && co.xp.pts }; });
  // Anda até `quer` aparecer tocando no primeiro da lista que estiver na tela; janelinha que sobra fecha no Esc ou no último botão
  const anda = async (quer, lista, onde) => {
    let pres = 0;
    for (let k = 0; k < 90; k++) {
      if (await has(quer)) return true;
      const s = await (async () => { for (const x of lista) if (await has(x)) return x; return ''; })();
      if (s === '.tc-go' && await has('.tc-ac')) { // festa do acesso: conta, fotografa e confere que a fileira dos ganhos cabe e não encosta no botão
        festas++; await p.waitForTimeout(2400); await shot('acesso-' + festas);
        const f = await p.evaluate(() => { const r = e => e.getBoundingClientRect(), w = document.querySelector('.tc-rw'), g = r(document.querySelector('.tc-go')), m = r(document.querySelector('.tc-ac')); const wr = w ? r(w) : null;
          return { n: w ? w.children.length : 0, fora: m.top < 0 || m.bottom > innerHeight || (wr && (wr.left < 0 || wr.right > innerWidth)), bate: !!wr && wr.bottom > g.top && wr.right > g.left, txt: document.querySelector('.tc-ac').innerText.replace(/\s+/g, ' ') }; });
        if (f.fora) errs.push('festa do acesso sai da tela'); if (f.bate) errs.push('festa do acesso: os ganhos encostam no botão'); if (f.n < 2) errs.push('festa do acesso com ' + f.n + ' ganhos'); if (/undefined|NaN/.test(f.txt)) errs.push('festa do acesso com texto quebrado: ' + f.txt);
        console.log('  festa do acesso: ' + f.txt); }
      if (s) { pres = 0; await tap(s); await texto(onde + ' depois de ' + s); continue; }
      if (await has('#ld-pop')) { pres++; if (pres < 3) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); } else { const n = await p.evaluate(() => { const bs = [...document.querySelectorAll('#ld-pop button')].filter(e => e.getClientRects().length && !e.disabled); const l = bs[bs.length - 1]; if (l) { l.setAttribute('data-ult', '1'); return (l.innerText || l.id || '').slice(0, 30); } return ''; }); if (n) { await tap('#ld-pop [data-ult]'); } else pres = 0; } continue; }
      await p.waitForTimeout(700);
    }
    await shot('travou-' + onde.replace(/\W+/g, '-')); errs.push('travou em ' + onde + ' esperando ' + quer + ' (tela: ' + (await p.evaluate(() => { const st = document.querySelector('#ld .ld-st'); const top = st && st.firstElementChild; const pp = document.querySelector('#ld-pop .ld-pop-c'); return (top ? top.className : '?') + (pp ? ' + janelinha ' + pp.className : ''); })) + ')');
    return false;
  };
  // carreira nova: propostas, reunião e patrocínio
  await tap('#b-new-co'); await tap('#co-start button[data-v="' + (SOBE ? 'baixo' : 'livre') + '"]'); await tap('#b-co-go');
  if (!(await anda('.sm', ['#ldo-go', '#ldn-go'], 'começo da carreira'))) { console.log('Problemas: ' + errs.length + '\n  ' + errs.join('\n  ')); await b.close(); process.exit(1); }
  for (let t = 0; t < N; t++) {
    const a = await estado();
    // o motor joga até faltar uma rodada
    const promo = await p.evaluate(() => !!window.CRAQUE_UI._co.co.ss.promo); if (SOBE && promo) subiu++;
    await p.evaluate(sobe => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; let g = 0;
      while (co.ss.i < co.ss.rounds.length - 1 && g++ < 80) { const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; } const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m); }
      if (sobe && co.ss.promo) co.ss.tab[co.ss.ids.indexOf(co.club)].p += 200;   // SOBE=1: o clube termina em 1º e sobe
      U._co.save('hub'); U.LD.semana(); }, SOBE);
    await p.waitForTimeout(600); await texto('semana da última rodada, temporada ' + (t + 1)); await shot('t' + (t + 1) + '-semana-fim');
    // último jogo ao vivo, pulando para o fim; depois resultado, taça ou demissão, até o Fim da temporada
    const fim = await anda('.fdt', ['#ctw-no', '.tc-go', '.ldf-go', '#ld-sack', '#ldr-go', '#b-lv-end', '#ldl-go', '[data-sp="fim"]', '#ldp-go', '#ld-go', '#ld-play'], 'último jogo da temporada ' + (t + 1));
    if (!fim) break;
    await texto('fim da temporada ' + (t + 1)); await shot('t' + (t + 1) + '-fim');
    for (const i of [1, 2, 3, 0]) { await tap('[data-ft="' + i + '"]'); await texto('fim da temporada ' + (t + 1) + ', aba ' + i); if (i === 3) { if (await has('[data-sk]')) { const antes = (await estado()).pts; await tap('[data-sk]:not([disabled])'); const dep = (await estado()).pts; if (dep !== antes - 1) errs.push('temporada ' + (t + 1) + ': o ponto de habilidade não foi gasto (' + antes + ' → ' + dep + ')'); } await shot('t' + (t + 1) + '-tecnico'); } }
    // ano seguinte: fica (ou vê as propostas), reunião com a diretoria, patrocínio, até a Semana
    const ok = await anda('.sm', ['#ldy-ns', '#ldy-of', '#ldo-go', '#ldn-go', '#ctw-no', '.tc-go'], 'virada para a temporada ' + (t + 2));
    if (!ok) break;
    await p.waitForTimeout(500); await texto('semana da temporada ' + (t + 2)); await shot('t' + (t + 2) + '-semana');
    const d = await estado();
    if (!d) { errs.push('sem carreira depois da temporada ' + (t + 1)); break; }
    if (d.s !== a.s + 1) errs.push('temporada não andou: ' + a.s + ' → ' + d.s);
    if (d.n < 11 || d.n > 28) errs.push('temporada ' + (t + 2) + ': elenco com ' + d.n);
    if (!Number.isFinite(d.caixa)) errs.push('temporada ' + (t + 2) + ': caixa ' + d.caixa);
    if (d.i !== 0) errs.push('temporada ' + (t + 2) + ': começou na rodada ' + (d.i + 1));
    console.log('temporada ' + (t + 1) + ' → ' + (t + 2) + ': ' + a.club + (d.club !== a.club ? ' → ' + d.club : '') + ' · elenco ' + d.n + ' · caixa ' + Math.round(d.caixa / 1000) + ' mil · fama ' + d.fama);
  }
  if (SOBE && festas !== subiu) errs.push('subiu ' + subiu + ' vezes e a festa do acesso apareceu ' + festas);
  if (SOBE) console.log('Acessos forçados: ' + subiu + ', festas: ' + festas);
  console.log('Carreira longa pela interface' + (SAFE ? ' (entalhe ' + SAFE + ')' : '') + ': ' + N + ' temporadas' + (OUT ? ', fotos em ' + OUT : '') + '; Problemas: ' + errs.length + (errs.length ? '\n  ' + errs.join('\n  ') : ''));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
