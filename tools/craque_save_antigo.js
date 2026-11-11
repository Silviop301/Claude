// Carreira antiga do Treinador abre na versão de hoje sem perder nada (item do polimento da 1.0).
// 1) gera: numa versão ANTIGA do jogo (git worktree de um commit velho, servido em outra porta) cria uma carreira,
//    joga N rodadas pelo motor, salva e grava o localStorage inteiro num arquivo, com um resumo do que tinha.
//    PORT=8766 NODE_PATH=$(npm root -g) node tools/craque_save_antigo.js gera /tmp/save-0911.json [rodadas]
// 2) abre: na versão de HOJE (porta 8765) põe esse localStorage, toca em Continuar, confere o resumo (clube, rodada,
//    pontos, caixa, elenco, escalação), passa por todas as telas, joga o resto da temporada, fecha a temporada e assina
//    a seguinte. Erro de página, "undefined"/"NaN" na tela ou resumo diferente contam como problema.
//    NODE_PATH=$(npm root -g) node tools/craque_save_antigo.js abre /tmp/save-0911.json [pasta das fotos]
// Esperado: "Problemas: 0".
const { chromium } = require('playwright');
const fs = require('fs');
const MODE = process.argv[2], FILE = process.argv[3], ARG = process.argv[4];
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8765) + '/craque/';
const errs = [];
// O resumo da carreira: o que não pode mudar só por abrir numa versão nova
const RESUMO = () => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co && U._co.co; if (!co || !co.ss) return null;
  const row = (co.ss.table || []).find(r => r.id === co.club) || {};
  return { club: co.club, season: co.season, round: co.ss.i, pts: row.pts, form: co.form, style: co.style, xi: (co.xi || []).join(','),
    squad: (co.squad || []).length, ovr: (co.squad || []).reduce((a, p) => a + p.ovr, 0), caixa: co.fin ? Math.round(co.fin.caixa) : null,
    fame: co.fame, titles: (co.titles || []).length, hist: (co.hist || []).length, name: co.name }; };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/three|cdn|favicon|net::/i.test(m.text())) errs.push('console: ' + m.text()); });
  const tap = async (sel, t) => { await p.waitForSelector(sel, { timeout: t || 8000 }); await p.click(sel); await p.waitForTimeout(600); };
  const texto = async onde => { const t = await p.evaluate(() => (document.getElementById('ld') || document.body).innerText || ''); if (/undefined|NaN|\[object/.test(t)) errs.push('texto quebrado em ' + onde + ': ' + (t.match(/.{0,30}(undefined|NaN|\[object).{0,30}/) || [''])[0].replace(/\n/g, ' ')); };

  if (MODE === 'gera') {
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); } } catch (e) {} });
    await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    await tap('#b-new-co');
    // a criação mudou de versão para versão: toca no que existir até a carreira ter temporada e escalação
    for (let i = 0; i < 14; i++) {
      if (await p.evaluate(() => { const c = window.CRAQUE_UI._co && window.CRAQUE_UI._co.co; return !!(c && c.ss && c.xi && c.xi.length && !document.querySelector('#ldo-go, #ldn-go, #b-co-go')); })) break;
      for (const s of ['#co-start button[data-v="livre"]', '#b-co-go', '#ldo-go', '#ldn-go', '#b-co-sign', '.pzo button']) { const h = await p.$(s); if (h && await h.isVisible()) { await h.click().catch(() => {}); await p.waitForTimeout(700); if (s !== '#co-start button[data-v="livre"]') break; } }
    }
    const n = +ARG || 9;
    const r = await p.evaluate(n => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; let g = 0;
      while (co.ss.i < n && g++ < 60) { const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; } const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m); }
      U._co.save('hub'); return true; }, n);
    await p.waitForTimeout(400);
    const out = await p.evaluate(R => { const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); } return { ls, resumo: (new Function('return (' + R + ')()'))() }; }, RESUMO.toString());
    if (!r || !out.resumo) errs.push('não criou a carreira');
    fs.writeFileSync(FILE, JSON.stringify(out));
    console.log('gerado', FILE, JSON.stringify(out.resumo));
  } else {
    const dump = JSON.parse(fs.readFileSync(FILE, 'utf8')), OUT = ARG;
    if (OUT) fs.mkdirSync(OUT, { recursive: true });
    const shot = async n => { await p.waitForTimeout(300); if (OUT) await p.screenshot({ path: OUT + '/' + n + '.png' }); await texto(n); };
    await p.addInitScript(ls => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); Object.keys(ls).forEach(k => localStorage.setItem(k, ls[k])); localStorage.setItem('climbix-deitado', '1'); } } catch (e) {} }, dump.ls);
    await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1500);
    await shot('a0-home');
    await tap('.hl-go'); await p.waitForTimeout(900); await shot('a1-semana');
    const now = await p.evaluate(R => (new Function('return (' + R + ')()'))(), RESUMO.toString());
    if (!now) errs.push('a carreira não abriu');
    else Object.keys(dump.resumo).forEach(k => { if (String(dump.resumo[k]) !== String(now[k])) errs.push('mudou ao abrir: ' + k + ' era ' + dump.resumo[k] + ', ficou ' + now[k]); });
    // todas as telas que abrem sem escolher nada
    const TELAS = ['semana', 'time', 'funcoes', 'batedores', 'treino', 'olheiro', 'tabela', 'clube', 'financas', 'banco', 'elenco', 'estadio', 'ingresso', 'ampliar', 'melhorias', 'mercado', 'noticias', 'loja'];
    for (const t of TELAS) {
      const e = await p.evaluate(t => { try { const L = window.CRAQUE_UI.LD; L.closePop && L.closePop(); if (!L[t]) return 'tela não existe'; L[t](); return ''; } catch (e) { return e.message; } }, t);
      if (e) errs.push(t + ': ' + e);
      await p.waitForTimeout(350); await shot('b-' + t);
    }
    // Clube: Troféus e Hall
    for (const nome of ['Troféus', 'Hall']) {
      await p.evaluate(() => { const L = window.CRAQUE_UI.LD; L.closePop && L.closePop(); L.clube(); }); await p.waitForTimeout(400);
      const ok = await p.evaluate(nome => { const el = [...document.querySelectorAll('#ld button, #ld [role="button"]')].find(x => (x.innerText || '').indexOf(nome) >= 0); if (el) el.click(); return !!el; }, nome);
      if (!ok) errs.push('Clube sem o bloco ' + nome); await p.waitForTimeout(500); await shot('c-' + nome.toLowerCase());
    }
    // o resto da temporada pelo motor (o save antigo ganha estádio, atributos e mercado vivo no caminho) e o último jogo pela tela
    const fim = await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; let g = 0;
      try { while (co.ss.i < co.ss.rounds.length - 1 && g++ < 60) { const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; } const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m); }
        U._co.save('hub'); U.LD.closePop && U.LD.closePop(); U.LD.semana(); return ''; } catch (e) { return e.message + ' ' + (e.stack || '').split('\n')[1]; } });
    if (fim) errs.push('temporada pelo motor: ' + fim);
    await p.waitForTimeout(600);
    const fecha = async () => { for (let k = 0; k < 6; k++) { const h = await p.$('#ctw-no, #ld-pop .mkr2-pop [data-rb]:last-child, #ld-pop .cvj-x, #ld-pop [data-x]'); if (!h) break; await h.click().catch(() => {}); await p.waitForTimeout(500); } };
    await fecha(); await shot('d1-semana-fim');
    try {
      await fecha(); await tap('#ld-play');
      if (await p.$('#ld-go')) { await tap('#ld-go'); await tap('#ldp-go'); await p.waitForTimeout(2500); await tap('[data-sp="fim"]');
        for (let i = 0; i < 30 && !(await p.$('#b-lv-end')); i++) { await p.waitForTimeout(800); if (await p.$('#ldl-go')) await tap('#ldl-go'); }
        await tap('#b-lv-end'); await shot('d2-resultado'); await tap('#ldr-go'); if (await p.$('#ld-sack')) await tap('#ld-sack'); }
      await p.waitForTimeout(900); await shot('d3-temporada');
      if (await p.$('#ldy-mk')) await tap('#ldy-mk'); else if (await p.$('#ldy-of')) await tap('#ldy-of');
      await shot('d4-propostas'); await tap('#ldo-go'); await p.waitForTimeout(600);
      for (let i = 0; i < 4 && await p.$('#ldn-go'); i++) { await tap('#ldn-go'); }
      await fecha(); await shot('d5-temporada-nova');
      const s2 = await p.evaluate(R => (new Function('return (' + R + ')()'))(), RESUMO.toString());
      if (!s2 || s2.season !== dump.resumo.season + 1 || s2.hist !== dump.resumo.hist + 1) errs.push('temporada nova não começou: ' + JSON.stringify(s2));
    } catch (e) { errs.push('fim da temporada pela tela: ' + e.message.split('\n')[0]); if (OUT) await p.screenshot({ path: OUT + '/erro.png' }); }
  }
  await b.close();
  errs.forEach(e => console.log('  ' + e));
  console.log('Save antigo (' + MODE + '): Problemas: ' + errs.length);
  process.exit(errs.length ? 1 : 0);
})();
