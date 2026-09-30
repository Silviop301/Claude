// Interface — configurações: abre por cima de qualquer tela (a carreira segue de onde parou).
// Guardadas no aparelho em window.CLIMBIX_CFG (definido em ui/core.js).
(function () {
  const U = window.CRAQUE_UI;
  const { esc } = U;
  const canVibe = typeof navigator !== 'undefined' && !!navigator.vibrate;
  const ROWS = () => [
    { k: 'papers', ic: '📰', t: 'Jornais', d: 'Capa do jornal no fim de cada temporada', opts: [['all', 'Todos'], ['special', 'Só especiais'], ['none', 'Nenhum']],
      note: 'Especiais: transferências, finais, Copa e despedida' },
    { k: 'cups', ic: '🌍', t: 'Copa e Mundial', d: 'Jogar jogo a jogo ou ver só o resultado', opts: [['play', 'Jogar'], ['sim', 'Simular direto']] },
    { k: 'moments', ic: '⚽', t: 'Lances decisivos', d: 'Cobrar você mesmo ou deixar a sua carta decidir', opts: [['play', 'Jogar'], ['auto', 'Decidir sozinho']] },
    { k: 'fast', ic: '⏩', t: 'Resumo da temporada', d: 'Números contando e telas de título', opts: [[false, 'Normal'], [true, 'Rápido']] },
    { k: 'fx3d', ic: '✨', t: 'Efeitos 3D', d: 'Cartas, gol e jornal em 3D', opts: [[true, 'Ligados'], [false, 'Desligados']], note: 'Desligue se o celular esquentar ou travar' },
    { k: 'sound', ic: '🔊', t: 'Som', opts: [[true, 'Ligado'], [false, 'Desligado']] },
  ].concat(canVibe ? [{ k: 'vibe', ic: '📳', t: 'Vibração', opts: [[true, 'Ligada'], [false, 'Desligada']] }] : []);
  const value = k => (k === 'sound' ? !!(window.CRAQUE_SFX && window.CRAQUE_SFX.on) : window.CLIMBIX_CFG[k]);

  function settings() {
    document.querySelectorAll('.cfg-wrap').forEach(x => x.remove());
    const w = document.createElement('div');
    w.className = 'cfg-wrap';
    const paint = () => {
      w.innerHTML = '<div class="cfg" role="dialog" aria-modal="true" aria-label="Configurações"><div class="cfg-head"><b>⚙️ Configurações</b><button class="cfg-x" aria-label="Fechar">✕</button></div>' +
        ROWS().map(r => '<div class="cfg-row"><div class="cfg-t"><i>' + r.ic + '</i><div><b>' + esc(r.t) + '</b>' + (r.d ? '<small>' + esc(r.d) + '</small>' : '') + '</div></div>' +
          '<div class="seg cfg-seg">' + r.opts.map(([v, l]) => '<button data-k="' + r.k + '" data-v="' + v + '"' + (value(r.k) === v ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>' +
          (r.note ? '<p class="cfg-note">' + esc(r.note) + '</p>' : '') + '</div>').join('') +
        '<button class="btn" id="cfg-ok">Pronto</button></div>';
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
