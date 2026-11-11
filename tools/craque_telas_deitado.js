// Treinador deitado (ui/coachland.js) pela interface em 844x390: fotos de cada tela, em 3 passeios.
// 1 escalação, popups, semana, treino, olheiro, funções, batedores e preleção · 2 um jogo ao vivo inteiro (grito, parada,
// troca, intervalo, fim, resultado, segunda) · 3 a temporada pelo motor até a última rodada, tabela, caderno, fim e propostas
// · 4 a primeira carreira: chegada na Semana com o tutorial (os 7 passos em 3 semanas), a dica do auxiliar e a 1ª proposta.
// Os passeios 1 a 3 entram como quem já teve carreira (climbix-co-ja): reunião e patrocínio aparecem e não há tutorial.
// Uso (na raiz, com python3 -m http.server 8765): NODE_PATH=$(npm root -g) node tools/craque_telas_deitado.js /tmp/ld [1,2,3,4]
// Erros de página e textos com "undefined"/"NaN" contam como problema.
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/ld', PARTS = (process.argv[3] || '1,2,3,4').split(',');
// VP=852x393 muda o tamanho da tela; SAFE=47 simula a área segura dos lados do iPhone deitado (entalhe; 59 nos de ilha)
const VP = (process.env.VP || '844x390').split('x').map(Number), SAFE = +process.env.SAFE || 0;
require('fs').mkdirSync(OUT, { recursive: true });
const errs = [];
async function page(b, first) {
  const p = await b.newPage({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: +process.env.DSF || 1, isMobile: true, hasTouch: true });
  if (SAFE) await (await p.context().newCDPSession(p)).send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: SAFE, right: SAFE, bottom: 21 } }); // entalhe do iPhone deitado
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/three|cdn|favicon|net::/i.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('response', r => { if (r.status() === 404) console.log('404', r.url()); }); // diz qual arquivo faltou (o console só dá "404")
  await p.addInitScript(first => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); } if (!first) { localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); } } catch (e) {} }, !!first);
  await p.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/craque/', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  const shot = async (name, semFoto) => { await p.waitForTimeout(300); if (!semFoto) await p.screenshot({ path: `${OUT}/${name}.png` }); /* semFoto: só confere (botão cortado, texto fora do cartão, undefined) */ { const cut = await p.evaluate(() => { const st = document.querySelector('#ld .ld-st'); if (!st) return ''; const R = st.getBoundingClientRect(), cs = getComputedStyle(st), k = R.width / (st.offsetWidth || R.width), x0 = R.left + parseFloat(cs.paddingLeft) * k, x1 = R.right - parseFloat(cs.paddingRight) * k, y1 = R.bottom - 10 * k; // o palco é escalado (--ldk): o padding vem sem a escala. Embaixo vale a borda do palco menos 10 px: com entalhe o ao vivo usa de propósito a sobra de cima e de baixo
      const inScroll = el => { for (let e = el.parentElement; e && e !== st; e = e.parentElement) { const o = getComputedStyle(e); if (/auto|scroll|hidden/.test(o.overflowY + o.overflowX)) return true; } return false; };
      return [...st.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(b).visibility !== 'hidden' && !inScroll(b) && (r.bottom > y1 + 2 || r.right > x1 + 2 || r.left < x0 - 2 || r.top < R.top - 2); }).map(b => { const r = b.getBoundingClientRect(); return (b.id || b.className || b.innerText || '').toString().slice(0, 24) + ' (' + Math.round(Math.max(r.bottom - y1, r.right - x1, x0 - r.left)) + ' px)'; }).slice(0, 3).join(', '); }); if (cut) errs.push('botão cortado em ' + name + ': ' + cut); } // botão que passa da área útil do palco (ex.: o Continuar do resultado com 4 linhas, 2026-11-11)
    { const out = await p.evaluate(() => { const st = document.querySelector('#ld .ld-st'); if (!st) return ''; const k = st.getBoundingClientRect().width / (st.offsetWidth || 1), bad = [];
      const card = el => { for (let e = el.parentElement; e && e !== st; e = e.parentElement) { const o = getComputedStyle(e); if (/auto|scroll|hidden/.test(o.overflowY + o.overflowX) || o.position === 'absolute' || o.position === 'fixed') return null; if (parseFloat(o.borderTopLeftRadius) >= 10 && o.backgroundColor !== 'rgba(0, 0, 0, 0)' && e.tagName !== 'BUTTON') return e; } return null; };
      st.querySelectorAll('b, p, span, small, em').forEach(el => { if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; const o = getComputedStyle(el); if (o.position === 'absolute' || o.visibility === 'hidden') return; const r = el.getBoundingClientRect(); if (r.height < 8 * k) return; const c = card(el); if (!c) return; const R = c.getBoundingClientRect(); if (r.bottom > R.bottom + 3 * k || r.right > R.right + 3 * k) bad.push((el.innerText || '').slice(0, 28)); });
      return bad.slice(0, 3).join(' | '); }); if (out) errs.push('texto fora do cartão em ' + name + ': ' + out); } // texto que passa do cartão onde está (ex.: a descrição do Treino, 2026-11-11)
    const t = await p.evaluate(() => (document.getElementById('ld') || {}).innerText || ''); if (process.env.TR) { require('fs').mkdirSync(process.env.TR, { recursive: true }); require('fs').writeFileSync(process.env.TR + '/' + name + '.txt', t); } /* TR=pasta grava o texto de cada tela (varredura de texto) */ if (/undefined|NaN|\[object/.test(t)) errs.push('texto quebrado em ' + name + ': ' + (t.match(/.{0,40}(undefined|NaN|\[object).{0,20}/) || [''])[0]); };
  // A "Proposta recebida" (mercado, lote 4) abre sozinha na volta para a semana e cobre os botões: recusa (último botão) antes de seguir
  const click = async sel => { for (let i = 0; i < 28 && !(await p.$(sel)); i++) { const tc = await p.$('.tc-go'); if (tc) { await p.waitForTimeout(600); await tc.click().catch(() => {}); await p.waitForTimeout(700); } else await p.waitForTimeout(250); } /* aviso "o título pode sair hoje" e festa da taça (carreira que briga pelo título): segue */ await p.waitForSelector(sel, { timeout: 8000 }).catch(async e => { await p.screenshot({ path: `${OUT}/falha.png` }).catch(() => {}); console.log('FALHA esperando ' + sel + ' (foto em falha.png); erros da página: ' + errs.join(' | ')); throw e; }); // travou: a foto mostra onde
    for (let k = 0; k < 4 && !/data-rb|mkr2/.test(sel) && await p.$('#ld-pop .mkr2-pop [data-rb]'); k++) { await p.waitForTimeout(500); await p.click('#ld-pop .mkr2-pop [data-rb]:last-child'); await p.waitForTimeout(400); }
    if (!/ctw-/.test(sel) && await p.$('#ctw-no')) { await p.waitForTimeout(500); await p.click('#ctw-no'); await p.waitForTimeout(300); } // "Contratos no fim" (faltando 5 rodadas)
    // janelinha recém-aberta engole toque por 450 ms (`pop` em coachland.js); com a máquina ocupada ela abre atrasada e o
    // toque seguinte caía nessa trava (era o "Acelerar a obra" que falhava de vez em quando): espera a janelinha ter 550 ms
    { const age = await p.evaluate(sel => { const e = document.querySelector(sel), w = e && e.closest('#ld-pop'); if (!w) return 9999; if (!w.__t) w.__t = Date.now(); return Date.now() - w.__t; }, sel); if (age < 550) await p.waitForTimeout(550 - age); }
    await p.click(sel); await p.waitForTimeout(750); }; // 750 ms: a trava de duplo toque do jogo (~700 ms) engolia o toque seguinte de vez em quando e o passeio parava (ex.: Acelerar a obra)
  return { p, shot, click };
}
(async () => {
  const b = await chromium.launch();
  if (PARTS.includes('1')) {
    const { p, shot, click } = await page(b);
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await click('#ldn-go'); await click('#ldn-go');
    await shot('a00-chegada'); await click('[data-rail="time"]'); await shot('a01-time');
    { // três titulares cansados: o auxiliar lista as trocas, uma linha desmarcada, e um botão faz as marcadas
      const en = v => p.evaluate(v => { const co = window.CRAQUE_UI._co.co, by = {}; co.squad.forEach(q => { by[q.id] = q; q.en = 100; }); if (v) [3, 6, 9].forEach((i, k) => { by[co.xi[i]].en = v[k]; }); }, v);
      await en([48, 61, 55]); await click('#tm-back'); await click('[data-rail="time"]'); await shot('a01b-setores-cansados');
      await click('#tm-aux'); await shot('a01c-auxiliar-trocas'); await click('.ax-r:nth-child(2)'); await shot('a01d-uma-desmarcada');
      const xi0 = await p.evaluate(() => window.CRAQUE_UI._co.co.xi.join());
      await click('#ld-aux-y'); await shot('a01e-trocou');
      const dif = await p.evaluate(a => window.CRAQUE_UI._co.co.xi.filter((id, i) => id !== a.split(',')[i]).length, xi0);
      if (dif !== 2) errs.push('auxiliar: eram 2 trocas marcadas e mudaram ' + dif + ' titulares');
      await en(null); await click('#tm-back'); await click('[data-rail="time"]');
      await click('.tm-bp:not(.dis):nth-of-type(5)'); await shot('a01f-reserva-acende-vagas'); await click('.tm-bp.on');
    }
    await click('[data-xi="5"]'); await shot('a02-troca');
    { // titular escolhido: os reservas da mesma posição ao lado dele, dentro do campo, do maior geral para o menor
      const L = await p.evaluate(() => { const n = document.querySelector('.tm-near'), f = document.querySelector('.tm-pitch'), co = window.CRAQUE_UI._co.co, by = {}; co.squad.forEach(q => { by[q.id] = q; });
        const slot = window.CRAQUE_SIM.coSlots(co.form)[5], a = n && n.getBoundingClientRect(), b = f.getBoundingClientRect();
        return { on: !!n, in: !!a && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.left >= b.left - 1 && a.right <= b.right + 1,
          pos: n ? [...n.querySelectorAll('.tm-cd')].every(e => by[e.dataset.bp].pos === slot) : false, r: n ? [...n.querySelectorAll('.tm-cd')].map(e => by[e.dataset.bp].ovr) : [] }; });
      if (!L.on) errs.push('escalação: titular escolhido e a lista ao lado dele não apareceu');
      else { if (!L.in) errs.push('escalação: a lista ao lado do titular sai do campo'); if (!L.pos) errs.push('escalação: a lista ao lado do titular tem gente de outra posição');
        if (L.r.some((v, k) => k && v > L.r[k - 1])) errs.push('escalação: a lista ao lado do titular não está do maior geral para o menor'); }
    }
    await click((await p.$('.tm-cd')) ? '.tm-cd' : '.tm-bp:not(.dis)'); await shot('a02b-trocou');
    { // arrastar o 1º reserva até o titular 7: no meio do caminho e depois de soltar
      const bp = await (await p.$('.tm-bp:not(.dis)')).boundingBox(), xd = await (await p.$('[data-xi="7"]')).boundingBox();
      const sx = bp.x + bp.width / 2, sy = bp.y + bp.height / 2, tx = xd.x + xd.width / 2, ty = xd.y + xd.height / 2;
      await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx, sy - 25); for (let k = 1; k <= 12; k++) await p.mouse.move(sx + (tx - sx) * k / 12, sy + (ty - sy) * k / 12);
      await shot('a02c-arrastando'); await p.mouse.up(); await p.waitForTimeout(200); await shot('a02d-soltou');
    }
    await click('[data-tmk="form"][data-d="1"]'); await p.waitForTimeout(150); await shot('a03-formacao-correndo'); await p.waitForTimeout(500); await shot('a03b-formacao'); await click('[data-tmk="sty"][data-d="1"]'); await click('#tm-aux'); await shot('a04-auxiliar'); if (await p.$('#ld-tip-y')) { await click('#ld-tip-y'); await shot('a04b-dica-usada'); } else await click('[data-pop-x]');
    await click('.tm-bp:not(.dis)'); await shot('a05-banco'); await click('[data-xi="9"]');
    await click('#ld-ok'); await shot('a06-semana');
    await click('#ld-tr'); await click('[data-tk="lados"]'); await shot('a07-treino'); await click('[data-tt="Bola parada"]'); await shot('a08-treino-bola-parada');
    // os 16 treinos: a descrição de cada um tem de caber no cartão da direita (a do escanteio passava, 2026-11-11)
    for (let t = 0; t < 4; t++) { await (await p.$$('[data-tt]'))[t].click(); await p.waitForTimeout(300); for (let i = 0; i < 4; i++) { const cs = await p.$$('[data-tk]'); if (!cs[i]) break; await cs[i].click(); await shot('a08-treino-' + t + i, true); } }
    await (await p.$$('[data-tt]'))[2].click(); await p.waitForTimeout(300); await click('[data-tk="esc"]'); await click('#ldtr-go');
    await click('#ld-ol'); await shot('a09-olheiro'); await click('#ldo-ok'); await shot('a10-semana-pronta');
    // A conversa com quem está chateado (forçada: o melhor reserva com a moral baixa) e a resposta dele; depois volta ao que era
    await p.evaluate(() => { const U = window.CRAQUE_UI, co = U._co.co, xi = new Set(co.xi), q = co.squad.filter(x => !xi.has(x.id)).sort((a, b) => b.ovr - a.ovr)[0]; q.mo = 30; q.bn = 3; window.__q = q; U.LD.segunda({}); });
    await shot('a10b-conversa'); await p.waitForTimeout(400); await click('[data-t1="paciencia"]'); await shot('a10c-conversa-resposta'); await p.waitForTimeout(2600);
    if (await p.$('#ld-pop')) errs.push('a conversa não fechou sozinha');
    await p.evaluate(() => { const q = window.__q; q.mo = 60; q.bn = 0; delete q.talked; delete q.talkS; });
    await click('#ld-play'); await click('#ld-fun'); await click('[data-fi="2"]'); await shot('a11-funcoes'); await click('[data-r="1"]'); await click('[data-gl="d:-1"]'); await shot('a11b-funcoes-mudou');
    await click('[data-sub="bat"]'); await click('[data-bk="fl"]'); await shot('a12-batedores'); await click('[data-bk="pen"]'); await shot('a12b-batedores-penalti'); await click('[data-bk="ckE"]'); await shot('a12c-batedores-escanteio'); await click('[data-bk="cap"]'); await shot('a12d-batedores-capitao'); await click('#ldm-ok');
    await click('#ld-go'); await click('[data-pk="calma"]'); await shot('a13-prelecao');
    await p.close();
  }
  if (PARTS.includes('2')) {
    const { p, shot, click } = await page(b);
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await click('#ldn-go'); await click('#ldn-go');
    await click('#ld-tr'); await click('[data-tt="Bola parada"]'); await click('[data-tk="esc"]'); await click('#ldtr-go'); await click('#ld-play'); await click('#ld-go'); await shot('b00-prelecao'); await click('[data-pk="cima"]'); await click('#ldp-go');
    await p.waitForTimeout(6000); await shot('bl1-ao-vivo');
    await click('[data-gr="pressionar"]'); await p.waitForTimeout(2500); await shot('bl2-grito');
    await click('#ldl-num'); await shot('bl3-numeros'); await p.mouse.click(10, 10); await p.waitForTimeout(300);
    await click('#b-lv-stop'); await p.waitForTimeout(3500); await shot('bl4-parada');
    await click('[data-xi="4"]'); await shot('bl5-escolheu'); await click('.tm-bp:not(.dis)'); await shot('bl6-trocou');
    await click('#ldl-aux'); await shot('bl7-auxiliar'); await click('#ldl-aux-n');
    { // dois titulares cansados na parada: o auxiliar sugere as duas trocas e um toque faz as duas
      const left = () => p.evaluate(() => parseInt((document.querySelector('#ld-pop .tm-bench small em') || {}).textContent, 10) || 0);
      const tired = await p.evaluate(() => { const nm = [...document.querySelectorAll('#ld-pop .ldl-tm [data-xi]:not([data-in])')].slice(2, 4).map(b => b.getAttribute('aria-label').split(',')[0]);
        window.CRAQUE_UI._co.co.squad.forEach(q => { if (nm.includes(q.n)) q.en = 40; }); return nm.length; });
      await click('[data-xi="1"]'); await click('[data-xi="1"]'); // redesenha
      const n0 = await left(); await click('#ldl-aux'); await shot('bl7c-auxiliar-trocas');
      const rows = await p.$$eval('.ax-r', r => r.length);
      if (rows < Math.min(tired, n0)) errs.push('parada: ' + tired + ' cansados e o auxiliar listou ' + rows + ' trocas');
      await click('#ldl-aux-y'); await shot('bl7d-trocou'); const n1 = await left();
      if (n0 - n1 !== rows) errs.push('parada: o auxiliar listou ' + rows + ' trocas e gastou ' + (n0 - n1));
    }
    await click('[data-tmk="form"][data-d="1"]'); await shot('bl7b-formacao');
    await click('#ldl-go');
    await click('[data-sp="3"]');
    // espera o intervalo
    for (let i = 0; i < 90 && !(await p.$('[data-tk]')); i++) { await p.waitForTimeout(1000); if (await p.$('#ldl-go') && !(await p.$('[data-tk]'))) await click('#ldl-go'); }
    if (await p.$('[data-tk]')) { await click('[data-tk="cobrar"]'); await shot('bl8-intervalo'); await click('#ldl-go'); }
    await click('[data-sp="fim"]'); await p.waitForTimeout(1500);
    for (let i = 0; i < 30 && !(await p.$('#b-lv-end')); i++) { await p.waitForTimeout(1000); if (await p.$('#ldl-go')) await click('#ldl-go'); }
    await shot('bl9-fim');
    if (await p.$('#b-lv-end')) { await click('#b-lv-end'); await shot('bl10-resultado'); await click('[data-rt="mom"]'); await shot('bl11-mandou'); await click('[data-rt="lan"]'); await shot('bl12-lances'); await click('#ldr-go'); await shot('bl13-semana-depois'); if (await p.$('[data-t1]')) await click('[data-t1]'); await shot('bl14-semana'); }
    await p.close();
  }
  if (PARTS.includes('3')) {
    const { p, shot, click } = await page(b);
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await shot('c0-propostas'); await click('#ldo-mo'); await shot('c0b-escolher-sem-moedas'); await click('#ec-back'); await click('#ldo-go'); await shot('c1-reuniao'); await click('[data-ac="ousado"]'); await shot('c1b-reuniao-ousado'); await click('#ldn-go'); await shot('c1c-patrocinio'); await click('[data-pt="mix"]'); await click('#ldn-go');
    // joga até faltar 1 rodada, pelo motor
    await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; let g = 0;
      while (co.ss.i < co.ss.rounds.length - 1 && g++ < 60) { const nx = S.coNext(co); if (!nx) break; if (nx.bye) { S.coSkipRound(co); continue; } const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m); }
      U._co.save('hub'); U.LD.semana(); });
    await p.waitForTimeout(500); if (await p.$('#ctw-no')) { await shot('c2-contratos-no-fim'); await p.waitForTimeout(300); await p.click('#ctw-no'); await p.waitForTimeout(300); } await shot('c2-semana-fim');
    await click('[data-rail="clube"]'); await shot('c2b-clube');
    // Estádio (fase 1): o bloco do Clube abre a tela, com o público do último jogo em casa, e o Voltar devolve ao Clube
    await click('#kb2-est'); await shot('c2b2-estadio');
    { const r = await p.evaluate(() => { const e = window.CRAQUE_SIM.coEst(window.CRAQUE_UI._co.co), pn = document.querySelector('#es-pn'); return { h: e.h.length, svg: !!(pn && pn.querySelector('svg')), lb: pn ? pn.querySelectorAll('.es-lb').length : 0 }; }); if (!r.svg || r.lb !== 4 || !r.h) errs.push('estádio: ' + JSON.stringify(r)); }
    // Ingresso (fase 2): escolher "Caro" muda o preço do clube e o botão volta a dizer "Preço de hoje"
    await click('#es-ing'); await shot('c2b3-ingresso'); await click('[data-pr="3"]'); await shot('c2b4-ingresso-caro'); await click('#es-go');
    { const r = await p.evaluate(() => ({ pr: window.CRAQUE_SIM.coEst(window.CRAQUE_UI._co.co).pr, off: !!document.querySelector('#es-go.off') })); if (r.pr !== 3 || !r.off) errs.push('ingresso: ' + JSON.stringify(r)); }
    await click('[data-pr="2"]'); await click('#es-go'); await click('#es-back');
    // Ampliar (fase 3): com o caixa curto a diretoria recusa; com o caixa cheio aprova, o setor fecha e o dourado vira Acelerar.
    // No fim a obra é desfeita para o resto do passeio seguir igual
    await click('#es-amp'); await shot('c2b5-ampliar');
    { const r = await p.evaluate(() => { const st = document.querySelector('.es2'); return { rg: st ? st.querySelectorAll('.es-rg > div').length : 0, op: st ? st.querySelectorAll('.es-op').length : 0, svg: !!document.querySelector('#es-pn svg'), co: !!document.querySelector('.es-co') }; }); if (r.rg !== 5 || r.op !== 3 || !r.svg || !r.co) errs.push('ampliar: ' + JSON.stringify(r)); }
    const cx0 = await p.evaluate(() => { const f = window.CRAQUE_UI._co.co.fin, v = [f.caixa, f.ss.obra || 0]; f.caixa = 1000; return v; });
    await click('#es-go'); await shot('c2b6-obra-recusada');
    { const r = await p.evaluate(() => ({ no: !!document.querySelector('.mkx b.dn'), obra: !!window.CRAQUE_SIM.coEst(window.CRAQUE_UI._co.co).obra })); if (!r.no || r.obra) errs.push('obra recusada: ' + JSON.stringify(r)); }
    await click('#ob-a'); await p.evaluate(() => { window.CRAQUE_UI._co.co.fin.caixa = 9e8; }); await click('#es-go'); await shot('c2b7-obra-aprovada');
    { const r = await p.evaluate(() => ({ ok: !!document.querySelector('.mkx b.up'), obra: !!window.CRAQUE_SIM.coEst(window.CRAQUE_UI._co.co).obra })); if (!r.ok || !r.obra) errs.push('obra aprovada: ' + JSON.stringify(r)); }
    await click('#ob-a'); await shot('c2b8-estadio-em-obra');
    { const r = await p.evaluate(() => ({ lb: !!document.querySelector('.es-lb small.ob'), rush: !!document.querySelector('#es-rush'), amp: !!document.querySelector('#es-amp') })); if (!r.lb || !r.rush || r.amp) errs.push('estádio em obra: ' + JSON.stringify(r)); }
    await click('#es-rush'); await shot('c2b9-acelerar'); await click('[data-pop-x]');
    await p.evaluate(v => { const U = window.CRAQUE_UI, co = U._co.co, e = window.CRAQUE_SIM.coEst(co); e.obra = null; e.pay = null; co.fin.caixa = v[0]; co.fin.ss.obra = v[1]; U._co.save('hub'); U.LD.estadio(); }, cx0);
    await p.waitForTimeout(300);
    // Melhorias (fase 4): 4 blocos, o cartão do próximo nível, e o pedido aprovado deixa a melhoria em reforma (desfeita no fim)
    await click('#es-mel'); await shot('c2b10-melhorias');
    { const r = await p.evaluate(() => ({ m: document.querySelectorAll('.es-m').length, rows: document.querySelectorAll('.es-ml > div').length, go: !!document.querySelector('#es-go') })); if (r.m !== 4 || !r.go) errs.push('melhorias: ' + JSON.stringify(r)); }
    const mk = await p.evaluate(() => { const S = window.CRAQUE_SIM, co = window.CRAQUE_UI._co.co, k = S.CO_EST.mel.keys.find(q => { const P = S.coEstMelPlan(co, q); return !P.max && !P.lock; }), f = co.fin, v = [f.caixa, f.ss.obra || 0, k]; f.caixa = 9e8; return v; });
    if (mk[2]) {
      await click('[data-mk="' + mk[2] + '"]'); await click('#es-go'); await shot('c2b11-melhoria-aprovada');
      { const r = await p.evaluate(() => ({ ok: !!document.querySelector('.mkx b.up'), mel: !!window.CRAQUE_SIM.coEst(window.CRAQUE_UI._co.co).mel })); if (!r.ok || !r.mel) errs.push('melhoria aprovada: ' + JSON.stringify(r)); }
      await click('#ob-a'); await shot('c2b12-melhoria-em-reforma');
    }
    await p.evaluate(v => { const U = window.CRAQUE_UI, co = U._co.co, e = window.CRAQUE_SIM.coEst(co); e.mel = null; e.pay2 = null; co.fin.caixa = v[0]; co.fin.ss.obra = v[1]; U._co.save('hub'); U.LD.estadio(); }, mk);
    await p.waitForTimeout(300);
    // Acontecimentos (fase 5): a exigência da liga e a proposta do show na volta para a semana (estado forçado e desfeito)
    { const sv = await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, e = S.coEst(co), v = [e.up.l, e.up0.l]; e.up.l = 0; e.up0.l = 0; e.lg = { s: co.season }; U.LD.semana(); return v; });
      await p.waitForTimeout(500); await shot('c2b13-liga-exige');
      { const r = await p.evaluate(() => ({ pop: !!document.querySelector('#ld-pop .mkx'), dn: !!document.querySelector('#ld-pop .mkx-li b.dn'), seen: !!(window.CRAQUE_SIM.coEst(window.CRAQUE_UI._co.co).lg || {}).seen })); if (!r.pop || !r.dn || !r.seen) errs.push('exigência da liga: ' + JSON.stringify(r)); }
      await click('#ob-a'); await shot('c2b14-refletores-com-multa');
      { const r = await p.evaluate(() => ({ mel: !!document.querySelector('.es.es3'), multa: /Multa da liga/.test((document.querySelector('.es-ml') || {}).textContent || '') })); if (!r.mel || !r.multa) errs.push('refletores com a multa da liga: ' + JSON.stringify(r)); }
      await p.evaluate(v => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, e = S.coEst(co); e.up.l = v[0]; e.up0.l = v[1]; delete e.lg; S.__show = S.coEstShow; S.coEstShow = () => ({ v: 90000, games: 2 }); U.LD.semana(); }, sv);
      await p.waitForTimeout(500); await shot('c2b15-show');
      { const r = await p.evaluate(() => ({ pop: !!document.querySelector('#ld-pop .mkx'), a: !!document.querySelector('#ob-a'), b: !!document.querySelector('#ob-b') })); if (!r.pop || !r.a || !r.b) errs.push('proposta do show: ' + JSON.stringify(r)); }
      await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM; S.coEstShow = S.__show; delete S.__show; U.LD.closePop(); U._co.save('hub'); U.LD.estadio(); });
      await p.waitForTimeout(300); }
    await click('#es-back'); await click('#ldk-go'); await shot('c2c-financas-decidir');
    // Loja: aporte (fase 3) e pacotes
    await p.evaluate(() => window.CRAQUE_UI.COINS.add({ n: 100, t: 'teste' })); await click('#fn2-apo'); await shot('c2l-loja-aporte'); await click('#lj-p'); await click('#lj-p'); await shot('c2l2-aporte-3'); await click('#lj-ap'); await shot('c2l2b-aporte-confirmar'); await click('#ca-y'); await shot('c2l3-aporte-feito');
    { const r = await p.evaluate(() => ({ ap: window.CRAQUE_UI._co.co.fin.ap, n: window.CRAQUE_UI.COINS.get() })); if (!r.ap || r.ap.wk !== 3) errs.push('aporte: ' + JSON.stringify(r)); else console.log('aporte', JSON.stringify(r)); }
    await click('[data-pop-x]'); await click('[data-lj="0"]'); await shot('c2l4-loja-moedas'); await click('[data-pk="3"]'); await shot('c2l5-loja-cofre'); await click('#lj-back'); await click('[data-fd="banco"]'); await shot('c2d-banco'); await click('#bk2-q'); await shot('c2d2-banco-ajuda'); await click('[data-pop-x]');
    await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; co.fin.caixa = -300000; co.fin.neg = 5; }); await click('#ldn-bk'); await click('[data-fd="banco"]'); await shot('c2e-banco-vermelho');
    await click('#ldn-take'); await shot('c2f-banco-emprestimo'); await click('#ldn-bk'); await shot('c2g-financas-com-emprestimo'); await click('[data-ft="sal"]'); await shot('c2h-salarios'); await click('#ldf-back'); await click('[data-k="ele"]'); await shot('c2i-elenco'); await click('[data-et="1"]'); await click('.lde2-r:nth-of-type(4)'); await shot('c2j-elenco-defesa'); await click('[data-ec="1"]'); await shot('c2k-elenco-situacao'); await click('[data-et="0"]'); await shot('c2l-elenco-goleiro-situacao'); await click('[data-ec="0"]'); await shot('c2m-elenco-goleiro'); await click('#lde-back'); await click('#kb2-back'); 
    // Mercado: topo com caixa e moedas, e a ficha na visão Atributos (sem relatório, faixa do 1º, número do 3º); os relatórios são postos à mão para não gastar o caixa do passeio
    { const mid = await p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, lg = S.coLeague(co), q = S.coMktPool(co).find(x => x.club && x.lg !== lg); U.LD.mercado(); return q.id; });
      const rep = n => p.evaluate(([id, n]) => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, m = S.coMkt(U._co.co); if (n) m.rep[id] = n; else delete m.rep[id]; U.LD.ficha(id); }, [mid, n]);
      await p.waitForTimeout(400); await shot('c2n-mercado'); await rep(0); await p.waitForTimeout(400); await shot('c2o-ficha'); await click('#mkf-tg'); await shot('c2p-ficha-atributos-sem');
      await rep(1); await p.waitForTimeout(400); await shot('c2q-ficha-atributos-faixa'); await rep(3); await p.waitForTimeout(400); await shot('c2r-ficha-atributos-numero');
      await click('#mkf-tg'); await rep(0); await p.waitForTimeout(300); await click('#mkf-back');
      // Notícias do mercado vivo (engine/coachworld.js): a aba, o filtro Tudo e a volta
      await click('#mk-tnw'); await shot('c2s-noticias'); await click('[data-nf="-1"]'); await shot('c2t-noticias-tudo'); await click('#mk-tpr'); await click('#mk-back'); }
    await click('[data-rail="tabela"]'); await shot('c3-tabela'); await click('[data-tb="art"]'); await shot('c3b-art'); await click('[data-tb="rod"]'); await shot('c3c-rodadas'); await click('#tb2-back');
    await p.evaluate(() => { const L = window.CRAQUE_UI.LD, t = L.temporada; if (!L.__t) { L.__t = 1; L.temporada = o => { if (!window.__fim) window.__out = o; return t(o); }; } }); // guarda o resultado do fim da temporada
    const nx = await p.$('#ld-play'); if (nx) { await click('#ld-play'); if (await p.$('#ld-go')) { await click('#ld-go'); await click('#ldp-go'); await p.waitForTimeout(2500); await click('[data-sp="fim"]'); for (let i = 0; i < 30 && !(await p.$('#b-lv-end')); i++) { await p.waitForTimeout(800); if (await p.$('#ldl-go')) await click('#ldl-go'); } await click('#b-lv-end'); await shot('c5-res'); if (process.env.DEMITIDO) await p.evaluate(() => { window.CRAQUE_UI._co.co.sacked = 1; }); await click('#ldr-go'); if (await p.$('#ld-sack')) { await shot('c5b-demitido'); await click('#ld-sack'); } } } // DEMITIDO=1 força a janelinha da demissão
    await p.waitForTimeout(800); await shot('c6-temporada'); for (const [i, n] of [[1, 'destaques'], [2, 'elenco'], [3, 'tecnico']]) if (await p.$('[data-ft="' + i + '"]')) { await click('[data-ft="' + i + '"]'); await shot('c6-aba-' + n); } /* as 4 abas do fim da temporada novo */
    // Os outros finais (polimento da 1.0, item p-clu-1): a mesma tela como campeão, com acesso, rebaixado e demitido.
    // A foto acusa botão cortado e texto fora do cartão; no fim volta o resultado de verdade para o passeio seguir
    if (await p.evaluate(() => !!window.__out)) { for (const [n, v] of [['campeao', { won: true, met: true, up: false, down: false, sacked: false, pos: 1 }], ['acesso', { won: false, met: true, up: true, down: false, sacked: false, pos: 2 }], ['rebaixado', { won: false, met: false, up: false, down: true, sacked: false, pos: 19 }], ['demitido', { won: false, met: false, up: false, down: false, sacked: true, pos: 15 }]]) {
        await p.evaluate(v => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, o = Object.assign({}, window.__out, v); if (v.sacked && !o.offers) o.offers = [o.club]; const k = co.club; co.club = k || o.club; window.__fim = true; U.LD.temporada(o); window.__fim = false; co.club = k; }, v); // demitido de verdade não tem clube: a tela dos outros finais precisa de um
        await p.waitForTimeout(350); await shot('c6-' + n); const t = await p.evaluate(() => (document.querySelector('.fdt-h') || {}).innerText || ''); if (!t) errs.push('fim de temporada ' + n + ': a tela não abriu'); }
      await p.evaluate(() => { window.__fim = true; window.CRAQUE_UI.LD.temporada(window.__out); window.__fim = false; }); await p.waitForTimeout(350); }
    else errs.push('fim de temporada: não peguei o resultado para testar os outros finais');
    if (await p.$('#ldy-mk')) { await click('#ldy-mk'); await shot('c7-propostas'); }
    else if (await p.$('#ldy-of')) { await click('#ldy-of'); await shot('c7-propostas'); }
    // Escolher clube com moedas (fase 2): com saldo, troca de liga, assina
    if (await p.$('#ldo-mo')) { await p.evaluate(() => window.CRAQUE_UI.COINS.add({ n: 410, t: 'teste' })); await click('#ldo-mo'); await shot('c8-escolher-sem-conta'); await p.evaluate(() => localStorage.setItem('climbix-account', JSON.stringify({ user: 'teste', token: 'x' }))); await click('.ec-c:nth-of-type(2)'); await shot('c8-escolher'); await click('.ec-c:nth-of-type(3)'); await shot('c8b-escolher-outro'); await click('#ec-ln'); await shot('c8c-outra-liga'); await click('#ec-go'); await shot('c8c2-confirmar-clube'); if (await p.$('#ca-y')) await click('#ca-y'); await p.waitForTimeout(600); await shot('c8d-assinou');
      const r = await p.evaluate(() => ({ n: window.CRAQUE_UI.COINS.get(), b: window.CRAQUE_UI._co.co.bought, own: window.CRAQUE_UI.COINS.clubs() })); if (!r.b || !r.b.length) errs.push('escolher clube: não assinou ' + JSON.stringify(r)); else console.log('comprou', JSON.stringify(r)); }
    await p.close();
  }
  if (PARTS.includes('4')) {
    const { p, shot, click } = await page(b, true);
    const st = () => p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; return { i: co.ss.i, tut: co.tut && co.tut.n, pend: co.fin.pend, win: S.coMktWin(co).open, tu: !!document.getElementById('ld-tu'), pop: !!document.getElementById('ld-pop') }; });
    const want = async (name, f) => { const s = await st(); if (!f(s)) errs.push('primeira carreira, ' + name + ': ' + JSON.stringify(s)); };
    const round = () => p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, nx = S.coNext(co); if (nx.bye) S.coSkipRound(co); else { const m = S.coMatchStart(co); S.coMatchRest(co, m); S.coMatchEnd(co, m); } U._co.save('hub'); U.LD.semana(); });
    // assinou: cai na Semana, sem reunião, sem proposta, com o passo 1 (Time)
    await click('#b-new-co'); await click('#co-start button[data-v="livre"]'); await click('#b-co-go'); await click('#ldo-go'); await shot('d01-chegada');
    await want('chegada', s => s.i === 0 && s.tut === 0 && !s.pend && s.tu && !s.pop);
    await p.mouse.click(300, 250); await p.waitForTimeout(300); await want('toque fora do alvo', s => s.tu && s.tut === 0);
    await click('.tu-hole'); await shot('d02-time-dica'); await click('#tm-aux'); await shot('d03-dica'); if (await p.$('#ld-tip-y')) await click('#ld-tip-y'); else await click('[data-pop-x]'); await shot('d04-dica-usada');
    await click('#ld-ok'); await shot('d05-passo-treino'); await click('.tu-hole'); await click('[data-tt="Bola parada"]'); await click('[data-tk="esc"]'); await click('#ldtr-go');
    await shot('d06-passo-olheiro'); await click('.tu-hole'); await click('#ldo-ok'); await shot('d07-passo-jogar'); await click('.tu-hole'); await want('semana 1 feita', s => s.tut === 4);
    await round(); await shot('d08-semana2-tabela'); await want('semana 2', s => s.i === 1 && s.tu && !s.pop && s.win);
    await click('.tu-hole'); await click('#tb2-back'); await shot('d09-semana2-clube'); await click('.tu-hole'); await click('#kb2-back'); await want('semana 2 feita', s => s.tut === 6 && !s.tu && !s.pop);
    await round(); await shot('d10-semana3-mercado'); await want('semana 3', s => s.i === 2 && s.tu && !s.pop && s.win);
    await click('.tu-hole'); await click('#mk-back'); await p.waitForTimeout(400); await shot('d11-semana3-depois'); await want('tutorial acabou', s => s.tut === null && !s.tu);
    if ((await st()).pop) { const bs = await p.$$('#ld-pop [data-rb]'); await bs[bs.length - 1].click(); await p.waitForTimeout(700); const x = await p.$('[data-pop-x]'); if (x) { await x.click(); await p.waitForTimeout(700); } await want('uma proposta só', s => !s.pop); }
    await round(); await shot('d12-semana4'); await want('janela fechada na rodada 4', s => s.i === 3 && !s.win && !s.tu);
    // Pular: o tutorial some no primeiro toque
    await p.evaluate(() => { const U = window.CRAQUE_UI, co = U._co.co; co.tut = { n: 4 }; U.LD.semana(); }); await want('tutorial de volta (teste)', s => s.tu || s.tut === null);
    await p.evaluate(() => { const U = window.CRAQUE_UI, co = U._co.co; co.tut = { n: 0 }; co.ss.i = 0; U.LD.semana(); }); await click('#tu-skip'); await want('pular', s => s.tut === null && !s.tu);
    await p.close();
  }
  console.log(errs.length ? 'Problemas: ' + errs.length + '\n' + errs.join('\n') : 'Treinador deitado: fotos em ' + OUT + '; Problemas: 0');
  await b.close();
})();
