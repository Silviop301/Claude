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
    ].concat(window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.has ? [{ k: 'music', t: 'Música' }] : []).concat(canVibe ? [{ k: 'vibe', t: 'Vibração' }] : []).concat([
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
  const value = k => (k === 'tips' ? U.tipsOn() : k === 'sound' ? !!(window.CRAQUE_SFX && window.CRAQUE_SFX.on) : k === 'music' ? !!(window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.on) : window.CLIMBIX_CFG[k]);

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
        else if (k === 'music') { if (window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.on !== v) window.CRAQUE_MUSIC.toggle(); }
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

  // Ajustes deitados (2026-11-09, quadro 52 do canvas): tela inteira no palco U.LD no lugar da janelinha em pé, aberta pela
  // home deitada. Só o que vale no Treinador: Som, Sua opinião e a conta. Vibração, Efeitos 3D, as escolhas "Na partida",
  // Treinar lances e as Novidades (texto ainda do Jogador) ficam na janelinha em pé, que os modos em pé continuam abrindo
  function settingsLand(back) {
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const out = () => (back || U.home)();
    const draw = () => {
      const rot = !!(U.rotPref && U.rotPref()), rotSw = rot || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); // tela girada (rotação travada em pé, ui/coachland.js)
      const on = !!value('sound'), mus = !!value('music'), vel = U.coVel ? U.coVel() : '1', st = !window.CLIMBIX_SOLO && U.cloudStatus ? U.cloudStatus() : null, solo = !!window.CLIMBIX_SOLO;
      U.LD.show('<div class="aj' + (solo ? ' aj-solo' : '') + '"><div class="tm-h"><button class="tcr-back" id="aj-back" aria-label="Voltar">' + BK + '</button><b>Ajustes</b><small class="aj-v">Climbix ' + VERSION + '</small></div>' +
        '<div class="aj-l' + (mus && rotSw ? ' n6' : '') + '"><button class="aj-sw' + (on ? ' on' : '') + '" id="aj-som" role="switch" aria-checked="' + on + '"><b>Som</b><span class="aj-tg"><i></i></span></button>' +
          (window.CRAQUE_MUSIC && window.CRAQUE_MUSIC.has ? '<button class="aj-sw' + (mus ? ' on' : '') + '" id="aj-mus" role="switch" aria-checked="' + mus + '"><b>Música</b><span class="aj-tg"><i></i></span></button>' +
            (mus ? '<button class="aj-sw' + (window.CRAQUE_MUSIC.live ? ' on' : '') + '" id="aj-mlv" role="switch" aria-checked="' + window.CRAQUE_MUSIC.live + '"><b>Música no jogo ao vivo</b><span class="aj-tg"><i></i></span></button>' : '') : '') +
          '<button class="aj-sw aj-vel" id="aj-vel" aria-label="Velocidade dos jogos: ' + vel + 'x"><b>Velocidade dos jogos</b><span class="aj-seg"><i' + (vel === '1' ? ' class="on"' : '') + '>1×</i><i' + (vel === '3' ? ' class="on"' : '') + '>3×</i></span></button>' +
          (rotSw ? '<button class="aj-sw' + (rot ? ' on' : '') + '" id="aj-rot" role="switch" aria-checked="' + rot + '"><b>Tela girada</b><span class="aj-tg"><i></i></span></button>' : '') +
          '<button class="aj-lk" id="aj-fb">Sua opinião</button></div>' +
        (solo ? '' : '<div class="aj-acc"><small>' + (st ? 'SUA CONTA' : 'CONTA') + '</small><b>' + esc(st ? U.cloudName() : 'Salve na nuvem') + '</b>' +
          '<span>' + esc(st || 'Suas carreiras e moedas em qualquer aparelho.') + '</span><i></i>' +
          '<button class="aj-go' + (st ? ' dark' : '') + '" id="aj-acc">' + (st ? 'Abrir a conta' : 'Entrar ou criar conta') + '</button></div>') + '</div>',
        w => {
          w.querySelector('#aj-back').onclick = () => { U.sfx('tap'); out(); };
          w.querySelector('#aj-som').onclick = () => { if (window.CRAQUE_SFX) window.CRAQUE_SFX.toggle(); U.sfx('tap'); draw(); };
          if (w.querySelector('#aj-mus')) w.querySelector('#aj-mus').onclick = () => { if (window.CRAQUE_MUSIC) window.CRAQUE_MUSIC.toggle(); U.sfx('tap'); draw(); };
          if (w.querySelector('#aj-mlv')) w.querySelector('#aj-mlv').onclick = () => { window.CRAQUE_MUSIC.liveToggle(); U.sfx('tap'); draw(); };
          w.querySelector('#aj-vel').onclick = () => { if (U.coVel) U.coVel(vel === '3' ? '1' : '3'); U.sfx('tap'); draw(); };
          if (w.querySelector('#aj-rot')) w.querySelector('#aj-rot').onclick = () => { U.rotPref(!rot); U.sfx('tap'); draw(); U.LD.fit(); };
          w.querySelector('#aj-fb').onclick = () => { U.sfx('tap'); U.feedbackLand ? U.feedbackLand(draw) : U.feedback('config'); };
          if (w.querySelector('#aj-acc')) w.querySelector('#aj-acc').onclick = () => { U.sfx('tap'); U.cloud('login', null, null, draw); };
        }, 'O Climbix é jogado com o celular deitado.');
    };
    draw();
  }

  // Novidades deitadas (2026-11-11; Silvio escolheu a entrada A do desenho https://claude.ai/artifact/WmxuvUV4Ci5FsPrvTS2M2z):
  // na home deitada a pílula "1.0 · Novidades" no canto de cima à esquerda (ui/start.js) leva o pontinho dourado enquanto a
  // versão não foi vista (U.newsNew) e abre esta tela no palco U.LD. Cada versão = um anúncio curto e até 4 destaques, sem
  // rolar; a mais nova primeiro, e com mais de uma as setas do topo trocam. `dt` = data por extenso (vazio não mostra)
  const NEWS_LAND = [{ v: '1.0', dt: '', tag: 'LANÇAMENTO · VERSÃO 1.0', h: 'O Climbix chegou!', art: '🎉',
    p: 'Você é o técnico. Escale o time, mexa com a bola rolando e leve o seu clube da última divisão ao topo.', s: 'Bom jogo, professor!', foot: 'Modo Jogador chega em breve.',
    lt: 'O QUE TEM NA 1.0', li: [['⚽', 'Jogo ao vivo de verdade', 'Cada lance é decidido na hora.'], ['🤝', 'Mercado vivo', 'Compre, venda e renove contratos.'], ['🏟️', 'O seu estádio', 'Amplie e lote a casa.'], ['💪', 'Treino que evolui', 'Cada jogador cresce com o treino.']] }];
  const newsNew = () => { try { return localStorage.getItem(NEWS_KEY) !== VERSION; } catch (e) { return false; } };
  function novidadesLand(back, i) {
    const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', AR = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
    const out = () => (back || U.home)(), n = NEWS_LAND.length; i = Math.max(0, Math.min(n - 1, i || 0));
    const N = NEWS_LAND[i];
    try { localStorage.setItem(NEWS_KEY, VERSION); } catch (e) {}
    U.LD.show('<div class="nvd"><div class="tm-h"><button class="tcr-back" id="nvd-back" aria-label="Voltar">' + BK + '</button><span class="mk-tt"><b>Novidades</b><small>Versão ' + N.v + (N.dt ? ' · ' + N.dt : '') + '</small></span>' +
        (n > 1 ? '<span class="nvd-pg"><button id="nvd-nx" aria-label="Versão mais nova"' + (i ? '' : ' disabled') + '>' + AR(-1) + '</button><button id="nvd-pv" aria-label="Versão anterior"' + (i < n - 1 ? '' : ' disabled') + '>' + AR(1) + '</button></span>' : '') + '</div>' +
      '<div class="nvd-c">' + U.emo(N.art, 'lg') + '<small>' + N.tag + '</small><b>' + N.h + '</b><p>' + N.p + '</p>' + (N.s ? '<strong>' + N.s + '</strong>' : '') + (N.foot ? '<em>' + N.foot + '</em>' : '') + '</div>' +
      '<div class="nvd-r"><div class="nvd-l"><small>' + N.lt + '</small>' + N.li.map(([e, t, d]) => '<div>' + U.emo(e, 'md') + '<span><b>' + t + '</b><small>' + d + '</small></span></div>').join('') + '</div>' +
        '<button class="tm-go" id="nvd-go">Bora jogar</button></div></div>', st => {
      st.querySelector('#nvd-back').onclick = () => { U.sfx('tap'); out(); };
      st.querySelector('#nvd-go').onclick = () => { U.sfx('tap'); out(); };
      if (st.querySelector('#nvd-nx')) { st.querySelector('#nvd-nx').onclick = () => { U.sfx('tap'); novidadesLand(back, i - 1); }; st.querySelector('#nvd-pv').onclick = () => { U.sfx('tap'); novidadesLand(back, i + 1); }; }
    });
  }

  Object.assign(U, { settings, settingsLand, whatsNew, VERSION, novidadesLand, newsNew });
})();
