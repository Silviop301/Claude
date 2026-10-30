// Interface — configurações: abre por cima de qualquer tela (a carreira segue de onde parou).
// Guardadas no aparelho em window.CLIMBIX_CFG (definido em ui/core.js).
(function () {
  const U = window.CRAQUE_UI;
  const { esc } = U;
  const canVibe = typeof navigator !== 'undefined' && !!navigator.vibrate;
  // Duas caixas: chaves de liga/desliga (som e tela) e escolhas curtas na linha (o que muda a partida). Salva no toque
  const GROUPS = () => [
    { t: 'Som e tela', rows: [
      { k: 'sound', t: 'Som' },
    ].concat(canVibe ? [{ k: 'vibe', t: 'Vibração' }] : []).concat([
      { k: 'fx3d', t: 'Efeitos 3D', d: 'desligue se o celular esquentar' },
    ]) },
    { t: 'Na partida', rows: [
      { k: 'moments', t: 'Lances decisivos', d: 'Cobrar ou deixar a carta decidir', opts: [['play', 'Jogar'], ['auto', 'Auto']] },
      { k: 'cups', t: 'Copa e Mundial', d: 'Jogo a jogo ou só o placar', opts: [['play', 'Jogar'], ['sim', 'Simular']] },
      { k: 'fast', t: 'Fim de temporada', d: 'Números contando', opts: [[false, 'Normal'], [true, 'Rápido']] },
      { k: 'papers', t: 'Jornais', d: 'Capa no fim do ano', opts: [['all', 'Todos'], ['special', 'Especiais'], ['none', 'Não']] },
      { k: 'tips', t: 'Dicas', d: 'Religar mostra todas outra vez' },
    ] },
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
    const solo = !!window.CLIMBIX_SOLO;
    const paint = () => {
      const y = w.querySelector('.cfg') ? w.querySelector('.cfg').scrollTop : 0;
      const sw = r => { const on = !!value(r.k);
        return '<button class="sw' + (on ? ' on' : '') + '" data-k="' + r.k + '" data-v="' + !on + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(r.t) + '"><i></i></button>'; };
      const seg = r => '<span class="cfg-seg2" role="group" aria-label="' + esc(r.t) + '">' + r.opts.map(([v, l]) =>
        '<button data-k="' + r.k + '" data-v="' + v + '" aria-pressed="' + (value(r.k) === v) + '"' + (value(r.k) === v ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</span>';
      const row = r => '<div class="cfg-r"><span class="cfg-rt"><b>' + esc(r.t) + '</b>' + (r.d ? '<small>' + esc(r.d) + '</small>' : '') + '</span>' + (r.opts ? seg(r) : sw(r)) + '</div>';
      const name = U.cloudName(), st = U.cloudStatus ? U.cloudStatus() : null;
      // Conta: carteirinha com canhoto (o mesmo ingresso da tela inicial)
      const conta = solo ? '' : '<button class="tk tk-acc" id="cfg-acc"><span class="tk-in"><span class="tk-paper"><span class="tk-frame">' +
        '<i class="tk-cloud">' + U.ICON.cloud + '</i><span class="tk-t"><small>' + (st ? 'Sua conta' : 'Salve na nuvem') + '</small><b>' + esc(st ? name : 'Criar conta') + '</b>' +
        '<small id="cloud-st">' + esc(st || 'jogue em outro aparelho') + '</small></span></span></span><span class="tk-stub"><b>' + (st ? 'Conta' : 'Entrar') + ' ›</b></span></span></button>';
      const link = (id, ic, t) => '<button class="cfg-link" id="' + id + '">' + U.emo(ic, 'sm') + '<span>' + t + '</span>' + U.ICON['chevron-right'] + '</button>';
      w.innerHTML = '<div class="cfg cfg2" role="dialog" aria-modal="true" aria-label="Configurações"><div class="cfg-head"><b>Configurações</b><button class="cfg-x" aria-label="Fechar">' + U.ICON.x + '</button></div>' +
        conta + GROUPS().map(g => '<div class="cfg-grp"><h3>' + g.t + '</h3><div class="cfg-box">' + g.rows.map(row).join('') + '</div></div>').join('') +
        '<div class="cfg-links">' + link('cfg-train', '🥅', 'Treinar lances') + link('cfg-fb', '💬', 'Dar opinião sobre o jogo') + link('cfg-news', '📣', 'Novidades da versão ' + VERSION) + '</div>' +
        // Crédito exigido pela licença dos emojis
        '<p class="cfg-credit">Emojis: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> (CC-BY 4.0)</p></div>';
      w.querySelector('.cfg').scrollTop = y;
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
      w.querySelector('#cfg-train').onclick = () => { close(); U.trainMenu(); };
      w.querySelector('#cfg-fb').onclick = () => { close(); U.feedback('config'); };
      w.querySelector('#cfg-news').onclick = () => { close(); whatsNew(true); };
      // A conta é uma tela inteira: no meio da carreira pergunta antes (a carreira fica salva)
      if (w.querySelector('#cfg-acc')) w.querySelector('#cfg-acc').onclick = () => { close(); if (U.G.c) U.ask('Abrir a conta?', 'Sua carreira fica salva e você continua de onde parou.', 'Abrir conta', () => U.cloud('login')); else U.cloud('login'); };
    };
    w.onclick = e => { if (e.target === w) { w.remove(); if (U.G.c) U.bar(); } };
    paint();
    document.body.appendChild(w);
    setTimeout(() => w.classList.add('shown'), 300); // a animação de entrada só na abertura
  }

  Object.assign(U, { settings, whatsNew, VERSION });
})();
