// Interface — computador (mouse e teclado). Só liga onde há mouse de verdade (hover + ponteiro fino):
//  - textos de "Toque…" viram "Clique…" (as telas são escritas para o celular);
//  - atalhos: Espaço/Enter continua e cobra o lance, 1–4 escolhe a opção, ←/→ no lance do goleiro e no álbum, Esc fecha;
//  - o resto (lance maior, janelas no meio da tela, efeito ao passar o mouse) fica no style.css, em .desk.
(function () {
  const U = window.CRAQUE_UI;
  const mq = matchMedia('(hover: hover) and (pointer: fine)');
  const on = () => mq.matches;
  const mark = () => document.documentElement.classList.toggle('desk', on());
  mark();
  if (mq.addEventListener) mq.addEventListener('change', mark);

  // ---------- Toque → Clique ----------
  // Só frases de instrução (não mexe em "pouco toque", "cada toque seu na bola"...)
  const SWAP = [
    [/\bToque\b/g, 'Clique'],
    [/\btoque(?= (?:para|na tela|quando|numa|à (?:direita|esquerda)|de novo))/g, 'clique'],
    [/\b(Agora|primeiro|segundo|1º|2º|o) toque\b(?! seu)/g, '$1 clique'],
    [/\b([Dd])ois toques\b/g, (m, d) => (d === 'D' ? 'Dois' : 'dois') + ' cliques'],
  ];
  const fixText = n => {
    const t = n.nodeValue;
    if (!/oque/.test(t)) return;
    let s = t;
    SWAP.forEach(([re, to]) => { s = s.replace(re, to); });
    if (s !== t) n.nodeValue = s;
  };
  const walk = root => {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(root.tagName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) fixText(n);
  };
  new MutationObserver(ms => {
    if (!on()) return;
    ms.forEach(m => m.addedNodes.forEach(walk));
  }).observe(document.body, { childList: true, subtree: true });
  if (on()) walk(document.body);
  U.tapWord = (cap) => (on() ? (cap ? 'Clique' : 'clique') : (cap ? 'Toque' : 'toque'));

  // ---------- Teclado ----------
  const visible = el => !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  // Camadas por cima da tela (a última adicionada fica na frente)
  const LAYERS = '.ask-wrap, .cfg-wrap, .sheet-wrap, .sl-sheet-wrap, .trn-wrap, .paper-wrap, .walkout, .pk-wrap, .album, .bigmoment';
  // Camadas que fecham ou avançam com um clique em qualquer lugar
  const TAP_LAYER = /\b(paper-wrap|walkout|bigmoment|album|pk-wrap)\b/;
  const top = () => { const ls = [...document.querySelectorAll(LAYERS)].filter(visible); return ls[ls.length - 1] || null; };
  // Clique de verdade num ponto (fx, fy em fração do elemento): passa pelos mesmos caminhos do mouse
  function clickAt(el, fx, fy, type) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width * (fx == null ? 0.5 : fx), y = r.top + Math.min(r.height, innerHeight - r.top) * (fy == null ? 0.5 : fy);
    const tgt = document.elementFromPoint(x, y) || el;
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse' };
    if (type === 'pointerdown') { tgt.dispatchEvent(new PointerEvent('pointerdown', o)); return; }
    tgt.dispatchEvent(new PointerEvent('pointerdown', o)); tgt.dispatchEvent(new PointerEvent('pointerup', o));
    tgt.dispatchEvent(new MouseEvent('click', o));
  }
  // Botão principal: o primeiro botão cheio visível (sem as opções de evento, que pedem 1–4)
  const primary = root => [...root.querySelectorAll('.btn:not(.ghost):not(:disabled)')]
    .find(b => visible(b) && !b.closest('.choices') && !b.classList.contains('opt'));

  addEventListener('keydown', e => {
    if (!on() || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    const k = e.key, go = k === ' ' || k === 'Enter';
    const layer = top(), scope = layer || document.getElementById('screen');
    if (!scope) return;
    const done = () => { e.preventDefault(); e.stopPropagation(); };

    // Lance (chute, defesa, carrinho, passe): Espaço/Enter = tocar no meio; ←/→ = pular para o lado (goleiro)
    const stage = [...scope.querySelectorAll('.kick-stage')].find(visible);
    if (stage && (go || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowDown')) {
      clickAt(stage, k === 'ArrowLeft' ? 0.15 : k === 'ArrowRight' ? 0.85 : 0.5, 0.5, 'pointerdown');
      return done();
    }
    // Esc: fecha a janela da frente (ou o post)
    if (k === 'Escape') {
      const x = [...scope.querySelectorAll('.cfg-x, .sp-x, .sl-sh-x, #sl-x, #trn-x, [aria-label^="Fechar"]')].find(visible);
      if (x) { x.click(); return done(); }
      if (layer && TAP_LAYER.test(layer.className)) { clickAt(layer); return done(); }
      return;
    }
    // Álbum: ← volta, →/Espaço avança
    if (layer && /\balbum\b/.test(layer.className) && (k === 'ArrowLeft' || k === 'ArrowRight' || go)) {
      clickAt(layer, k === 'ArrowLeft' ? 0.1 : 0.9); return done();
    }
    // 1–4: opções do evento
    if (/^[1-4]$/.test(k)) {
      const b = [...scope.querySelectorAll('.choices [data-i]')].filter(visible)[+k - 1];
      if (b && !b.disabled) { b.click(); return done(); }
      return;
    }
    if (!go) return;
    // Jornal, revelação de carta, comemoração, pacotinho: avança
    if (layer && TAP_LAYER.test(layer.className)) {
      const b = primary(layer);
      if (b) b.click(); else clickAt(layer);
      return done();
    }
    // Resumo da temporada mostrando os blocos: Espaço pula para o fim
    if (!layer && document.getElementById('skip-hint')) { scope.dispatchEvent(new MouseEvent('click', { bubbles: true })); return done(); }
    // Botão em foco: o Enter/Espaço do próprio navegador já clica
    if (t && t.tagName === 'BUTTON' && t !== document.body) return;
    const b = primary(scope);
    if (b) { b.click(); return done(); }
  }, true);

  // Dica no rodapé da tela inicial (só no computador)
  U.deskHint = () => (on() ? '<p class="desk-hint">' + U.emo('📱', 'xs') + ' Feito para celular, mas dá para jogar aqui: Espaço ou Enter continua e cobra os lances · 1 a 4 escolhe · Esc fecha</p>' : '');
})();
