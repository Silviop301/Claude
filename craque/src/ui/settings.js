// Interface — configurações: abre por cima de qualquer tela (a carreira segue de onde parou).
// Guardadas no aparelho em window.CLIMBIX_CFG (definido em ui/core.js).
(function () {
  const U = window.CRAQUE_UI;
  const { esc } = U;
  const canVibe = typeof navigator !== 'undefined' && !!navigator.vibrate;
  // Dois grupos: o que muda a partida e o que muda o visual/som
  const GROUPS = () => [
    { t: 'Partida', rows: [
      { k: 'moments', ic: 'circle-dot', t: 'Lances decisivos', d: 'Cobrar você mesmo ou deixar a sua carta decidir', opts: [['play', 'Jogar'], ['auto', 'Decidir sozinho']] },
      { k: 'cups', ic: 'globe', t: 'Copa e Mundial', d: 'Jogar jogo a jogo ou ver só o resultado', opts: [['play', 'Jogar'], ['sim', 'Simular direto']] },
      { k: 'tips', ic: 'info', t: 'Dicas', d: 'Explicação curta na primeira vez de cada tela', opts: [[true, 'Ligadas'], [false, 'Desligadas']], note: 'Ligar de novo mostra todas as dicas outra vez' },
      { k: 'fast', ic: 'fast-forward', t: 'Resumo da temporada', d: 'Números contando e telas de título', opts: [[false, 'Normal'], [true, 'Rápido']] },
    ] },
    { t: 'Visual e som', rows: [
      { k: 'papers', ic: 'newspaper', t: 'Jornais', d: 'Capa do jornal no fim da temporada', opts: [['all', 'Todos'], ['special', 'Só especiais'], ['none', 'Nenhum']],
        note: 'Especiais: transferências, finais, Copa e despedida' },
      { k: 'fx3d', ic: 'sparkles', t: 'Efeitos 3D', d: 'Cartas, bola e jornal em 3D', opts: [[true, 'Ligados'], [false, 'Desligados']], note: 'Desligue se o celular esquentar ou travar' },
      { k: 'sound', ic: 'volume-2', t: 'Som', opts: [[true, 'Ligado'], [false, 'Desligado']] },
    ].concat(canVibe ? [{ k: 'vibe', ic: 'smartphone', t: 'Vibração', opts: [[true, 'Ligada'], [false, 'Desligada']] }] : []) },
  ];
  const value = k => (k === 'tips' ? U.tipsOn() : k === 'sound' ? !!(window.CRAQUE_SFX && window.CRAQUE_SFX.on) : window.CLIMBIX_CFG[k]);

  // Versão do jogo (aparece nas Configurações e decide quando mostrar as novidades)
  const VERSION = '1.0';
  const NEWS_KEY = 'climbix-novidades';
  const NEWS = [
    ['🎲', 'Decisões que mudam a carreira', 'Todo evento mostra a chance de dar certo e o que se ganha ou perde. Atributos ganhos ou perdidos ficam para sempre.'],
    ['🧭', 'Escolhas de fim de carreira', 'Depois dos 30: liderança, herdeiro, ambição, cuidar do corpo. Valem legado na nota final.'],
    ['🏆', 'Mais taças', 'Sul-Americana, Liga Europa, Liga Conferência, Champions da Ásia, da Concacaf e da África, e Supercopas.'],
    ['🌍', '39 países', 'Todos os países com liga viraram jogáveis, mais 12 novos: Peru, Croácia, Noruega, Marrocos, Egito, Austrália...'],
    ['🏟️', 'Treino dos lances', 'Antes do primeiro lance de cada tipo, um treino que não vale nada. Repita quando quiser nas Configurações.'],
  ];
  // Novidades: uma vez por versão, só para quem já jogava (quem chega agora vê o jogo direto)
  function whatsNew(force) {
    let seen = null; try { seen = localStorage.getItem(NEWS_KEY); } catch (e) {}
    const veteran = !!(U.load('craque-v5') || U.load('craque-hall-v1'));
    if (!force && (seen === VERSION || !veteran)) { try { localStorage.setItem(NEWS_KEY, VERSION); } catch (e) {} return; }
    try { localStorage.setItem(NEWS_KEY, VERSION); } catch (e) {}
    const w = document.createElement('div');
    w.className = 'cfg-wrap';
    w.innerHTML = '<div class="cfg news-sheet" role="dialog" aria-modal="true" aria-label="Novidades"><div class="cfg-head"><b>Climbix ' + VERSION + ' · Novidades</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
      '<div class="news-list">' + NEWS.map(([ic, t, d]) => '<div class="news-it">' + U.emo(ic, 'sm') + '<div><b>' + esc(t) + '</b><small>' + esc(d) + '</small></div></div>').join('') + '</div>' +
      '<button class="btn" id="news-ok">Bora jogar</button></div>';
    const close = () => w.remove();
    w.onclick = e => { if (e.target === w) close(); };
    w.querySelector('.cfg-x').onclick = close;
    w.querySelector('#news-ok').onclick = close;
    document.body.appendChild(w);
  }

  function settings() {
    document.querySelectorAll('.cfg-wrap').forEach(x => x.remove());
    const w = document.createElement('div');
    w.className = 'cfg-wrap';
    const paint = () => {
      const row = r => '<div class="cfg-row"><div class="cfg-t"><i>' + U.ICON[r.ic] + '</i><div><b>' + esc(r.t) + '</b>' + (r.d ? '<small>' + esc(r.d) + '</small>' : '') + '</div></div>' +
        '<div class="seg cfg-seg">' + r.opts.map(([v, l]) => '<button data-k="' + r.k + '" data-v="' + v + '"' + (value(r.k) === v ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>' +
        (r.note ? '<p class="cfg-note">' + U.ICON.info + esc(r.note) + '</p>' : '') + '</div>';
      w.innerHTML = '<div class="cfg" role="dialog" aria-modal="true" aria-label="Configurações"><div class="cfg-head"><b>Configurações</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
        GROUPS().map(g => '<div class="cfg-grp"><div class="eyebrow">' + g.t + '</div><div class="cfg-box">' + g.rows.map(row).join('') + '</div></div>').join('') +
        '<button class="btn ghost" id="cfg-train">' + U.emo('🏟️', 'xs') + ' Treinar lances</button>' +
        '<button class="btn ghost" id="cfg-fb">' + U.emo('💬', 'xs') + ' Dar opinião sobre o jogo</button>' +
        '<button class="btn" id="cfg-ok">Pronto</button>' +
        // Crédito exigido pela licença dos emojis
        '<p class="cfg-credit"><button class="link-btn" id="cfg-news">Climbix ' + VERSION + ' · ver novidades</button></p>' +
        '<p class="cfg-credit">Emojis: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> (CC-BY 4.0)</p></div>';
      w.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k, raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : raw;
        if (k === 'tips') U.tipsSet(v);
        else if (k === 'sound') { if (window.CRAQUE_SFX && window.CRAQUE_SFX.on !== v) window.CRAQUE_SFX.toggle(); }
        else U.setCfg(k, v);
        if (k === 'vibe' && v) U.vibe(20);
        paint();
      });
      const close = () => { w.remove(); if (U.G.c) U.bar(); };
      w.querySelector('.cfg-x').onclick = close;
      w.querySelector('#cfg-ok').onclick = close;
      w.querySelector('#cfg-train').onclick = () => { close(); U.trainMenu(); };
      w.querySelector('#cfg-fb').onclick = () => { close(); U.feedback('config'); };
      w.querySelector('#cfg-news').onclick = () => { close(); whatsNew(true); };
    };
    w.onclick = e => { if (e.target === w) { w.remove(); if (U.G.c) U.bar(); } };
    paint();
    document.body.appendChild(w);
    setTimeout(() => w.classList.add('shown'), 300); // a animação de entrada só na abertura
  }

  Object.assign(U, { settings, whatsNew, VERSION });
})();
