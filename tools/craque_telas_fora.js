// Uso (na raiz, com o http.server): NODE_PATH=$(npm root -g) node tools/craque_telas_fora.js [pasta]   Esperado: Problemas: 0
// Telas de fora da carreira (Perfil, Ajustes, Conta, Opinião, Novidades, Termos, Privacidade, Loja) com e sem entalhe:
// nenhum botão ou texto pode passar da área útil do palco nem a tela pode rolar
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/fora'; require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  let bad = 0;
  for (const SAFE of [0, 47, 59]) {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: SAFE === 59 ? 932 : 844, height: SAFE === 59 ? 430 : 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    if (SAFE) await (await p.context().newCDPSession(p)).send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: SAFE, right: SAFE, bottom: 21 } });
    p.on('pageerror', e => { bad++; console.log('erro de página', e.message); });
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); sessionStorage.setItem('t', 1); localStorage.setItem('climbix-dicas-v1', '{"off":true}'); localStorage.setItem('climbix-co-ja', '1'); localStorage.setItem('climbix-deitado', '1'); } } catch (e) {} });
    await p.goto('http://127.0.0.1:8765/craque/', { waitUntil: 'load' }); await p.waitForTimeout(1300);
    const check = async nome => { await p.waitForTimeout(700);
      const r = await p.evaluate(() => { const st = document.getElementById('ld-st'); if (!st) return { err: 'sem palco' }; const cs = getComputedStyle(st), R = st.getBoundingClientRect(); const k = R.width / st.offsetWidth;
        const L = R.left + parseFloat(cs.paddingLeft) * k - 1, Rr = R.right - parseFloat(cs.paddingRight) * k + 1, T = R.top - 1, B = R.bottom + 1; const out = [];
        st.querySelectorAll('button, a, b, p, small, span, input, textarea, h2').forEach(e => { if (!e.offsetParent || e.closest('.hl-dk, .hl-dk-p')) return; const q = e.getBoundingClientRect(); if (!q.width || !q.height) return; let a = e.parentElement, clip = false; while (a && a !== st) { const o = getComputedStyle(a); if (/auto|scroll|hidden/.test(o.overflowY + o.overflowX)) { clip = true; break; } a = a.parentElement; } if (clip) return;
          if (q.left < L || q.right > Rr || q.top < T || q.bottom > B) out.push((e.id || e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 20) + '" ' + Math.round(q.left) + '-' + Math.round(q.right) + ' x ' + Math.round(q.top) + '-' + Math.round(q.bottom)); });
        return { out: out.slice(0, 4), scroll: st.scrollHeight > st.clientHeight + 2 || st.scrollWidth > st.clientWidth + 2, area: Math.round(L) + '-' + Math.round(Rr) }; });
      await p.screenshot({ path: OUT + '/' + nome + '-' + SAFE + '.png' });
      if (r.err || r.out.length || r.scroll) { bad++; console.log('PROBLEMA ' + nome + ' (entalhe ' + SAFE + '): ' + JSON.stringify(r)); } else console.log('ok ' + nome + ' (entalhe ' + SAFE + ')'); };
    const ev = async (nome, f) => { await p.evaluate(f); await check(nome); };
    await check('home');
    await ev('perfil', () => window.CRAQUE_UI.profileLand(() => window.CRAQUE_UI.home()));
    await ev('ajustes', () => window.CRAQUE_UI.settingsLand(() => window.CRAQUE_UI.home()));
    await ev('conta-entrar', () => window.CRAQUE_UI.cloud());
    await ev('opiniao', () => window.CRAQUE_UI.feedbackLand(() => window.CRAQUE_UI.home()));
    await ev('novidades', () => window.CRAQUE_UI.novidadesLand(() => window.CRAQUE_UI.home()));
    await ev('termos', () => { window.CRAQUE_UI.home(); window.CRAQUE_UI.termosLand(3); });
    await ev('privacidade', () => { window.CRAQUE_UI.home(); window.CRAQUE_UI.privacidadeLand(4); });
    await ev('loja', () => { window.CRAQUE_UI.home(); window.CRAQUE_UI.LD.loja(0, () => window.CRAQUE_UI.home()); });
    await b.close();
  }
  console.log('Problemas:', bad); process.exit(bad ? 1 : 0);
})();
