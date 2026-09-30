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
      { k: 'fast', ic: 'fast-forward', t: 'Resumo da temporada', d: 'Números contando e telas de título', opts: [[false, 'Normal'], [true, 'Rápido']] },
    ] },
    { t: 'Visual e som', rows: [
      { k: 'papers', ic: 'newspaper', t: 'Jornais', d: 'Capa do jornal no fim de cada temporada', opts: [['all', 'Todos'], ['special', 'Só especiais'], ['none', 'Nenhum']],
        note: 'Especiais: transferências, finais, Copa e despedida' },
      { k: 'fx3d', ic: 'sparkles', t: 'Efeitos 3D', d: 'Cartas, bola e jornal em 3D', opts: [[true, 'Ligados'], [false, 'Desligados']], note: 'Desligue se o celular esquentar ou travar' },
      { k: 'sound', ic: 'volume-2', t: 'Som', opts: [[true, 'Ligado'], [false, 'Desligado']] },
    ].concat(canVibe ? [{ k: 'vibe', ic: 'smartphone', t: 'Vibração', opts: [[true, 'Ligada'], [false, 'Desligada']] }] : []) },
  ];
  const value = k => (k === 'sound' ? !!(window.CRAQUE_SFX && window.CRAQUE_SFX.on) : window.CLIMBIX_CFG[k]);

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
        '<button class="btn" id="cfg-ok">Pronto</button>' +
        // Crédito exigido pela licença dos emojis
        '<p class="cfg-credit">Emojis: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> (CC-BY 4.0)</p></div>';
      w.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k, raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : raw;
        if (k === 'sound') { if (window.CRAQUE_SFX && window.CRAQUE_SFX.on !== v) window.CRAQUE_SFX.toggle(); }
        else U.setCfg(k, v);
        if (k === 'vibe' && v) U.vibe(20);
        paint();
      });
      const close = () => { w.remove(); if (U.G.c) U.bar(); };
      w.querySelector('.cfg-x').onclick = close;
      w.querySelector('#cfg-ok').onclick = close;
    };
    w.onclick = e => { if (e.target === w) { w.remove(); if (U.G.c) U.bar(); } };
    paint();
    document.body.appendChild(w);
    setTimeout(() => w.classList.add('shown'), 300); // a animação de entrada só na abertura
  }

  Object.assign(U, { settings });
})();
