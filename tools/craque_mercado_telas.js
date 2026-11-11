// Mercado do Treinador pela interface, do começo ao fim (polimento da 1.0, item p-mer-1): comprar de um clube, contratar
// quem está sem clube, comprar com um dos seus na troca, estourar a paciência do presidente, vender negociando, recusar
// uma proposta, renovar e bater no elenco cheio. Tudo com toque de verdade nas telas deitadas; a cada passo confere o
// estado da carreira (elenco, caixa, dias da janela), janelinha que ficou presa, erro de página e botão fora do palco.
//   NODE_PATH=$(npm root -g) node tools/craque_mercado_telas.js [pasta das fotos]     (SAFE=47 simula o entalhe)
// Precisa do jogo em http://127.0.0.1:8765/craque/. O caixa e a verba são engordados de propósito: o que se testa é o
// caminho das telas, não a economia (essa é do craque_mercado.js e do craque_temporadas.js). Esperado: Problemas: 0
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || '', SAFE = +process.env.SAFE || 0, URL = process.env.URL || 'http://127.0.0.1:8765/craque/';
(async () => {
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), errs = [], log = [];
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (SAFE) await (await p.context().newCDPSession(p)).send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: SAFE, right: SAFE, bottom: 21 } });
  let step = 'abrir';
  p.on('pageerror', e => errs.push(step + ': erro de página: ' + e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); } } catch (e) {} });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const has = s => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; }, s);
  // confere a tela onde está: botão passando do palco
  const cut = async () => { const c = await p.evaluate(() => { const st = document.querySelector('#ld .ld-st'); if (!st) return []; const R = st.getBoundingClientRect();
    const rola = e => { for (let x = e.parentElement; x && x !== st; x = x.parentElement) { const cs = getComputedStyle(x); if (/auto|scroll/.test(cs.overflowY + cs.overflowX)) return true; } return false; };
    return [...st.querySelectorAll('button')].filter(e => e.getClientRects().length && !rola(e)).map(e => { const r = e.getBoundingClientRect(); return (r.right > R.right + 2 || r.bottom > R.bottom + 2 || r.left < R.left - 2 || r.top < R.top - 2) ? (e.id || e.innerText.replace(/\s+/g, ' ').slice(0, 20)) : ''; }).filter(Boolean); });
    if (c.length) errs.push(step + ': botão fora do palco: ' + c.join(', ')); };
  let nShot = 0;
  const shot = async n => { await cut(); if (OUT) await p.screenshot({ path: OUT + '/' + String(++nShot).padStart(2, '0') + '-' + n + '.png' }); };
  const tap = async (s, opt) => { try { await p.waitForSelector(s, { timeout: 6000, state: 'visible' }); await p.click(s); await p.waitForTimeout(750); return true; }
    catch (e) { if (!opt) errs.push(step + ': não achei ' + s); return false; } };
  const st = () => p.evaluate(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, f = S.coFin(co), m = S.coMkt(co), w = S.coMktWin(co);
    const top = document.querySelector('#ld .ld-st > div'), pop = document.getElementById('ld-pop');
    return { n: co.squad.length, ids: co.squad.map(x => x.id), caixa: f.caixa, verba: f.verba, used: m.used || 0, open: w.open, tela: top ? top.className : '', pop: pop ? (pop.querySelector('.ld-pop, [class*="-pop"]') || pop).className : '', gold: (document.querySelector('#ld .tm-go') || {}).innerText || '' }; });
  const want = (ok, msg) => { if (!ok) errs.push(step + ': ' + msg); };
  const ev = (fn, arg) => p.evaluate(fn, arg);
  // proposta: manda e segue as respostas até o contrato (aceita a contraproposta; recusa sobe o valor)
  const fechaProposta = async () => { for (let i = 0; i < 7; i++) {
      if (!(await has('#mkx-1'))) { if ((await st()).tela.includes('mkc')) return true; await tap('#mkp-go:not(.off)'); continue; }
      const t = await ev(() => document.querySelector('#mkx-1').innerText);
      await shot('resposta-' + i); await tap('#mkx-1');
      if (/contrato/i.test(t)) return true;
      if (/Nova proposta/.test(t)) { for (let k = 0; k < 4; k++) await tap('[data-pv="1"]'); await tap('#mkp-go:not(.off)'); }
      if (/Voltar ao mercado|Entendi/.test(t)) return false; }
    return (await st()).tela.includes('mkc'); };
  // contrato: oferece e, se o empresário recusar, fecha pelo que ele pede; devolve a classe da janelinha final
  const fechaContrato = async sobe => { for (let k = 0; k < (sobe || 0); k++) await tap('[data-cw="1"]'); await shot('contrato'); await tap('#mkc-go:not(.off)');
    for (let i = 0; i < 4 && (await has('#rcs-1')); i++) { await shot('recusou-' + i); await tap('#rcs-1'); }
    return (await st()).pop; };

  // ---------- carreira nova, com dinheiro para o teste ----------
  await tap('#b-new-co'); await tap('#co-start button[data-v="livre"]'); await tap('#b-co-go'); await tap('#ldo-go'); await tap('#ldn-go'); await tap('#ldn-go');
  await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, f = S.coFin(co); f.caixa += 4e8; f.verba += 4e8; f.teto += 5e7; U._co.save(); U.LD.semana(); });
  await p.waitForTimeout(600);
  let s0 = await st(); want(s0.open, 'a janela devia estar aberta antes da 1ª rodada');

  // ---------- A. comprar de um clube: Semana > Mercado > Procurar > ficha > relatório > proposta > contrato ----------
  step = 'A comprar';
  await tap('[data-rail="mercado"]'); if (await has('#nw-go')) { await shot('noticias-na-chegada'); await tap('#mk-tpr'); } // com notícia nova o Mercado abre nelas
  await shot('mercado');
  for (const f of [4, 0, 2, 1, 3]) { if (await has('#mk-go:not(.off)')) break; await tap('[data-mf="' + f + '"][data-d="1"]'); } // a busca só abre com até 40 jogadores
  await shot('mercado-filtrado'); await tap('#mk-go:not(.off)'); await shot('resultado');
  await tap('[data-mr="1"]'); await tap('#mkr-go'); await shot('ficha');
  await tap('#mkf-rep:not([disabled])', true); await tap('#mkf-tg'); await shot('ficha-atributos'); await tap('#mkf-tg'); await tap('#mkf-star');
  const idA = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; return Object.keys(S.coMkt(co).obs || {}).slice(-1)[0] || null; });
  await tap('#mkf-go'); await shot('proposta'); await tap('[data-pp="1"]'); await tap('[data-pc="2"]'); await tap('#mkp-go:not(.off)');
  want(await fechaProposta(), 'a proposta alta não chegou ao contrato');
  let pc = await fechaContrato(3); want(/mkd/.test(pc), 'depois do contrato devia abrir "Contratado" (abriu: ' + pc + ')');
  await shot('contratado'); await tap('#mkd-time'); await shot('time-com-o-reforco');
  let s1 = await st(); want(s1.n === s0.n + 1, 'elenco devia ter ' + (s0.n + 1) + ', tem ' + s1.n); want(!idA || await ev(id => !!window.CRAQUE_SIM.coMkt(window.CRAQUE_UI._co.co).got[id], idA), 'o contratado não ficou marcado como seu');
  want(s1.verba < s0.verba, 'a verba não baixou com a compra'); want(s1.used > s0.used, 'a compra não gastou dia da janela'); want(!s1.pop, 'janelinha presa: ' + s1.pop);
  log.push('A comprou: elenco ' + s0.n + ' → ' + s1.n + ', dias ' + s1.used);

  // ---------- B. sem clube: ficha > contrato baixo > recusa > fechar pelo pedido ----------
  step = 'B sem clube';
  const idB = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, q = S.coMktPool(co).filter(x => !x.club).sort((a, b) => b.ovr - a.ovr)[3]; U.LD.ficha(q.id, () => U.LD.mercado()); return q.id; });
  await p.waitForTimeout(600); await shot('ficha-sem-clube'); await tap('#mkf-go');
  for (let k = 0; k < 8; k++) await tap('[data-cw="-1"]'); await tap('[data-cy="-1"]');
  pc = await fechaContrato(0); want(/mkd/.test(pc), 'sem clube: devia abrir "Contratado" (abriu: ' + pc + ')'); await shot('contratado-sem-clube'); await tap('#mkd-mk');
  let s2 = await st(); want(s2.n === s1.n + 1 && await ev(id => !!window.CRAQUE_SIM.coMkt(window.CRAQUE_UI._co.co).got[id], idB), 'o sem clube não entrou no elenco'); want(/\bmk\b/.test(s2.tela), 'devia voltar ao Mercado (tela: ' + s2.tela + ')');
  log.push('B sem clube: elenco ' + s2.n);

  // ---------- C. compra com um dos seus na troca ----------
  step = 'C troca';
  const C0 = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, m = S.coMkt(co), q = S.coMktPool(co).filter(x => x.club && x.lg === S.coLeague(co) && !(m.obs || {})[x.id])[5]; U.LD.proposta(q.id, () => U.LD.mercado()); return { id: q.id, club: q.club, tl: S.coMktTradeList(co).map(x => ({ id: x.id, n: x.n })) }; });
  await p.waitForTimeout(600); await tap('[data-pt="1"]'); await shot('proposta-com-troca'); await tap('[data-pc="2"]'); await tap('#mkp-go:not(.off)');
  want(await fechaProposta(), 'a proposta com troca não chegou ao contrato');
  pc = await fechaContrato(3); want(/mkd/.test(pc), 'troca: devia abrir "Contratado" (abriu: ' + pc + ')'); await tap('#mkd-mk');
  let s3 = await st(); want(await ev(id => !!window.CRAQUE_SIM.coMkt(window.CRAQUE_UI._co.co).got[id], C0.id), 'o comprado na troca não entrou'); want(s3.n === s2.n, 'na troca o elenco devia seguir com ' + s2.n + ', tem ' + s3.n);
  const foi = C0.tl.filter(x => !s3.ids.includes(x.id)); want(foi.length === 1, 'devia sair 1 jogador na troca, saíram ' + foi.length);
  if (foi.length === 1) want(await ev(([id, cl]) => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; return S.coMktPool(co).some(x => x.n === id && x.club === cl); }, [foi[0].n, C0.club]), 'quem saiu na troca não aparece no clube comprador');
  log.push('C troca: saiu ' + foi.map(x => x.n).join(','));

  // ---------- D. proposta baixa até o presidente encerrar ----------
  step = 'D paciência';
  await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, q = S.coMktPool(co).filter(x => x.club && x.lg === S.coLeague(co))[9]; U.LD.proposta(q.id, () => U.LD.mercado()); });
  await p.waitForTimeout(600); await tap('[data-pc="0"]'); for (let k = 0; k < 10; k++) await tap('[data-pv="-1"]');
  let fim = '';
  for (let i = 0; i < 5 && !/Encerrou|Janela|Aceitou/.test(fim); i++) { await tap('#mkp-go:not(.off)'); fim = await ev(() => (document.querySelector('.mkx-h b') || {}).innerText || ''); await shot('baixa-' + i);
    if (/Pede/.test(fim)) { await tap('#mkx-2'); await tap('[data-pc="0"]'); for (let k = 0; k < 10; k++) await tap('[data-pv="-1"]'); } else await tap(/Recusou/.test(fim) ? '#mkx-1' : '#mkx-2'); } // Recusou: "Nova proposta" fecha a janelinha; Encerrou: "Fechar"
  let s4 = await st(); want(/Encerrou/.test(fim), 'proposta baixa 5 vezes devia encerrar a conversa (última resposta: ' + fim + ')');
  want(!s4.pop, 'janelinha presa: ' + s4.pop); if (/Encerrou/.test(fim)) want(/Não negocia/.test(s4.gold), 'depois de encerrar o botão devia dizer "Não negocia mais" (diz: ' + s4.gold + ')');
  await tap('#mkp-back'); await tap('#mk-tel'); await shot('aba-elenco'); want((await st()).tela.includes('lde2'), 'a aba Elenco do Mercado não abriu o Elenco'); await tap('#lde-back'); want(/\bmk\b/.test((await st()).tela), 'o Voltar do Elenco não devolveu ao Mercado');
  await tap('#mk-tnw'); await shot('noticias'); await tap('#mk-tpr');
  log.push('D paciência: ' + fim);

  // ---------- E. vender: pôr à venda no Elenco até chegar proposta, negociar e aceitar ----------
  step = 'E vender';
  const TAB = { GOL: 0, ZAG: 1, LAT: 1, MEI: 2, ATA: 3 };
  // põe reservas à venda no Elenco, um por um, até um clube mandar proposta na hora (a janelinha "Proposta recebida")
  const poeAVenda = async fora => { const res = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; return co.squad.filter(x => !co.xi.includes(x.id) && S.coMktCanSell(co, x) && !S.coMktOfferFor(co, x) && !S.coMktListed(co, x)).map(x => ({ id: x.id, pos: x.pos })); });
    for (const q of res.filter(x => !fora.includes(x.id)).slice(0, 12)) { await ev(([t, id]) => window.CRAQUE_UI.LD.elenco(t, id, () => window.CRAQUE_UI.LD.semana()), [TAB[q.pos] || 0, q.id]); await p.waitForTimeout(450); await tap('[data-ec="1"]', true);
      if (!(await tap('#lde-sell:not([disabled])', true))) continue; if (await has('[data-rb]')) return q; }
    return null; };
  let vend = await poeAVenda([]);
  if (!vend) { // nenhuma proposta na hora: usa uma da caixa de entrada
    vend = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, o = S.coMktInbox(co)[0]; if (!o) return null; U.LD.semana(); U.LD.recebida(o, () => U.LD.semana()); return { id: o.id }; }); await p.waitForTimeout(600); }
  if (!vend) errs.push(step + ': nenhuma proposta chegou por quem foi posto à venda (12 tentativas) nem havia na caixa');
  else { await shot('recebida'); const cx = (await st()).caixa; await tap('[data-rb="1"]'); await shot('negociar'); await tap('[data-nc="1"]'); await tap('[data-nf="1"]'); await tap('#mkn-go');
    for (let i = 0; i < 6 && (await has('[data-rb]')); i++) { const L = await ev(() => [...document.querySelectorAll('[data-rb]')].map(b => b.innerText)); await shot('venda-' + i);
      const k = L.findIndex(t => /Aceitar/.test(t)); if (k >= 0) { await tap('[data-rb="' + k + '"]'); continue; }
      if (/Ver o elenco/.test(L[0])) { await tap('[data-rb="1"]'); break; } await tap('[data-rb="0"]'); break; }
    if (await has('#mkn-go')) { await tap('[data-nc="0"]'); await tap('#mkn-go'); for (let i = 0; i < 3 && (await has('[data-rb]')); i++) { const L = await ev(() => [...document.querySelectorAll('[data-rb]')].map(b => b.innerText)); await tap('[data-rb="' + Math.max(0, L.findIndex(t => /Fechar|Voltar/.test(t))) + '"]'); } }
    const s5 = await st(); want(!s5.ids.includes(vend.id), 'o vendido continua no elenco'); want(s5.caixa > cx, 'o caixa não subiu com a venda'); want(!s5.pop, 'janelinha presa: ' + s5.pop);
    log.push('E vendeu: caixa +' + Math.round((s5.caixa - cx) / 1000) + ' mil'); }

  // ---------- F. recusar uma proposta recebida ----------
  step = 'F recusar';
  const rq = await poeAVenda(vend ? [vend.id] : []), rec = rq && rq.id;
  if (rec) { await tap('#mkr2-el'); await shot('ver-elenco-da-proposta'); await tap('#lde-back'); await tap('[data-rb="2"]'); const s6 = await st(); want(s6.ids.includes(rec), 'recusou e o jogador saiu'); want(!s6.pop, 'janelinha presa: ' + s6.pop);
    want(await ev(id => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM; return !S.coMktInbox(U._co.co).some(o => o.id === id); }, rec), 'a proposta recusada continua na caixa'); log.push('F recusou'); }
  else errs.push(step + ': nenhuma proposta chegou para recusar (12 tentativas)');

  // ---------- G. renovar um titular no último ano ----------
  step = 'G renovar';
  const ren = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co; let q = co.squad.find(x => co.xi.includes(x.id) && S.coMktRenOk(co, x) && x.age < 33), forced = false;
    if (!q) { q = co.squad.find(x => co.xi.includes(x.id) && x.age < 30); q.ct = 1; forced = true; } return { id: q.id, pos: q.pos, ct: q.ct, wage: q.wage, forced }; });
  await ev(([t, id]) => window.CRAQUE_UI.LD.elenco(t, id, () => window.CRAQUE_UI.LD.semana()), [TAB[ren.pos] || 0, ren.id]); await p.waitForTimeout(500); await tap('[data-ec="1"]', true); await shot('elenco-renovar');
  await tap('#lde-ren:not([disabled])'); await tap('[data-cy="1"]'); pc = await fechaContrato(2); await shot('renovado'); want(/mkx/.test(pc), 'renovar: devia abrir "Renovado" (abriu: ' + pc + ')'); await tap('#mkx-1');
  const r2 = await ev(id => { const q = window.CRAQUE_UI._co.co.squad.find(x => x.id === id); return q ? { ct: q.ct, wage: q.wage } : null; }, ren.id);
  want(r2 && r2.ct > ren.ct, 'o contrato não aumentou na renovação (' + JSON.stringify(ren) + ' → ' + JSON.stringify(r2) + ')'); want(!(await st()).pop, 'janelinha presa depois de renovar');
  log.push('G renovou: contrato ' + ren.ct + ' → ' + (r2 && r2.ct));

  // ---------- H. elenco cheio: a ficha avisa e leva para a troca ----------
  step = 'H cheio';
  const H0 = await ev(() => { const U = window.CRAQUE_UI, S = window.CRAQUE_SIM, co = U._co.co, max = S.CO_MKT.maxSquad; let g = 0;
    const free = S.coMktPool(co).filter(x => !x.club).sort((a, b) => a.ovr - b.ovr);
    while (co.squad.length < max && g < free.length) { const q = free[g++], T = S.coMktTerms(co, q); S.coMktContract(co, q, { w: T.ask(2) * 2, y: T.want, role: 2 }); }
    const m = S.coMkt(co), t = S.coMktPool(co).filter(x => x.club && x.lg === S.coLeague(co) && !(m.obs || {})[x.id])[12]; m.used = 0; U._co.save(); U.LD.ficha(t.id, () => U.LD.mercado()); return { n: co.squad.length, max }; }); // os dias da janela voltam: o teste gastou todos
  await p.waitForTimeout(600); want(H0.n === H0.max, 'não consegui encher o elenco (' + H0.n + '/' + H0.max + ')');
  await tap('#mkf-go'); await shot('elenco-cheio'); want(await has('#ech-tr'), 'com o elenco cheio a ficha devia abrir o aviso com "Propor troca"');
  await tap('#ech-tr'); await shot('cheio-troca'); const s7 = await st(); want(s7.tela.includes('mkp'), 'o "Propor troca" devia abrir a Proposta'); want(/Enviar/.test(s7.gold), 'com um jogador na troca o Enviar devia estar aceso (diz: ' + s7.gold + ')');
  await tap('[data-pt="-1"]'); await tap('[data-pt="-1"]'); log.push('H cheio: ' + H0.n + '/' + H0.max);
  // a carreira continua jogável: volta para a Semana e ela abre
  step = 'fim'; await ev(() => window.CRAQUE_UI.LD.semana()); await p.waitForTimeout(600); await shot('semana-no-fim'); want((await st()).tela.includes('sm'), 'a Semana não abriu no fim');

  console.log(log.join('\n'));
  console.log('Mercado pela interface' + (SAFE ? ' (entalhe ' + SAFE + ')' : '') + (OUT ? ': fotos em ' + OUT : '') + '; Problemas: ' + errs.length + (errs.length ? '\n- ' + errs.join('\n- ') : ''));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
