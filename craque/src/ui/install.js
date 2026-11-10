// Instalar o app (tutorial): quem abre o site no celular, pelo navegador, vê uma vez uma folha ensinando a pôr o Climbix
// na Tela de Início. iPhone/iPad: passos do Compartilhar do Safari (o iOS não deixa a página instalar sozinha) e uma seta
// mostrando onde fica o botão. Android: o botão "Instalar o app" abre a janela do próprio Chrome (beforeinstallprompt).
// Quem toca em "Agora não" ganha um lembrete pequeno no fim da home em pé, que some no X (a home deitada ainda não tem
// lembrete). Na home deitada a folha abre com o celular em pé, por cima do "Gire o celular". Nunca aparece no app instalado,
// no computador, nos portais (iframe) nem dentro de outra janela aberta. Teste: ?instalar=ios | ios18 | ipad | android.
(function () {
  const U = window.CRAQUE_UI;
  const KEY = 'climbix-instalar-v1';
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const put = o => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(get(), o))); } catch (e) {} };
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { put({ done: Date.now() }); close(); const c = document.querySelector('.ins-chip'); if (c) c.remove(); });

  const force = (location.search.match(/[?&]instalar=(\w+)/) || [])[1];
  function platform() {
    if (force) return force;
    if (window.CLIMBIX_PORTAL) return null;
    try { if (window.top !== window) return null; } catch (e) { return null; }
    if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) return null;
    const ua = navigator.userAgent;
    const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ipad || /iPhone|iPod/.test(ua)) {
      if (ipad) return 'ipad';
      if (/CriOS|FxiOS|EdgiOS/.test(ua)) return 'iosapp'; // Chrome/Firefox/Edge no iPhone: Compartilhar fica na barra de endereço
      const v = +((ua.match(/Version\/(\d+)/) || [])[1] || 0);
      return v && v < 26 ? 'ios18' : 'ios';
    }
    if (/Android/.test(ua)) return 'android';
    return null;
  }

  const SHARE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1E6FD9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>';
  const MORE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const KEBAB = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';
  const INST = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 7v6M9 10l3 3 3-3M8 20h8"/></svg>';
  const ADD = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  const DOWN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><path d="M12 22l-8-9h5V2h6v11h5z" fill="#F2C230" stroke="#13201A" stroke-width="1.2"/></svg>';
  const PERKS = [
    ['<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>', 'Tela cheia'],
    ['<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><path d="M16.5 13v7M13 16.5h7"/></svg>', 'Ícone na tela'],
    ['<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>', 'Abre num toque'],
  ];

  // Passos de cada aparelho: [ícone, texto com <b>]
  function steps(p) {
    // iOS 26 (testado num iPhone real): Compartilhar fica no meio da barra de baixo; a opção mora atrás de "Ver Mais"
    if (p === 'ios') return [[SHARE, 'Toque em <b>Compartilhar</b>, no meio da barra de baixo'], [MORE, 'Na janela que abre, toque em <b>Ver Mais</b>'], [ADD, 'Escolha <b>Adicionar à Tela de Início</b> e depois <b>Adicionar</b>']];
    // Android/Chrome (testado num celular real): menu ⋮ no alto, à direita › Instalar e criar atalho › Instalar
    if (p === 'android') return [[KEBAB, 'Toque em <b>⋮</b>, no canto de cima à direita'], [INST, 'Toque em <b>Instalar e criar atalho</b>'], [DOWN, 'Escolha <b>Instalar</b>']];
    if (p === 'ios18') return [[SHARE, 'Toque em <b>Compartilhar</b> na barra do Safari, embaixo'], [ADD, 'Escolha <b>Adicionar à Tela de Início</b> e depois <b>Adicionar</b>']];
    return [[SHARE, 'Toque em <b>Compartilhar</b>, no alto da tela'], [ADD, 'Escolha <b>Adicionar à Tela de Início</b> e depois <b>Adicionar</b>']];
  }
  // Onde fica o botão do primeiro passo (a seta aponta para lá)
  const SPOT = { android: 'tr', ios: 'bc', ios18: 'bc', ipad: 'tr', iosapp: 'tr' };

  let wrap = null;
  function close() { if (wrap) { wrap.remove(); wrap = null; } }
  function later() { put({ later: Date.now() }); close(); chipIn(); }

  function sheet(p) {
    close();
    const and = p === 'android', canPrompt = and && !!deferred;
    const head = '<div class="ins-head"><img src="icons/icon-192.png?v=bc5d742f" alt="" width="60" height="60"><div><b>Leve o Climbix pro celular</b><p>' +
      (and ? 'Um toque e ele vira app: tela cheia e ícone na tela inicial.' : 'Abre em tela cheia, sem a barra do navegador, direto da Tela de Início.') + '</p></div></div>';
    const body = canPrompt
      ? '<div class="ins-perks">' + PERKS.map(([ic, t]) => '<div>' + ic + '<b>' + t + '</b></div>').join('') + '</div>' +
        '<button class="btn ins-go" data-a="go">' + DOWN + 'Instalar o app</button>' +
        '<p class="ins-note">O botão abre a janela do próprio Chrome. Se ela não aparecer: menu <b>⋮</b> no alto › <b>Instalar e criar atalho</b> › <b>Instalar</b>.</p>' +
        '<button class="ins-later" data-a="later">Agora não</button>'
      : '<ol class="ins-steps">' + steps(p).map(([ic, t], i) => '<li><em>' + (i + 1) + '</em><span>' + t + '</span><i>' + ic + '</i></li>').join('') + '</ol>' +
        (p === 'ios' ? '<p class="ins-note">Barra do Safari só com <b>•••</b>? Toque nele primeiro e depois em Compartilhar.</p>' : '') +
        '<div class="ins-row"><button class="ins-later" data-a="later">Agora não</button><button class="btn ins-go" data-a="show">Mostrar onde fica</button></div>';
    wrap = document.createElement('div');
    wrap.className = 'ins-wrap';
    wrap.innerHTML = '<div class="ins" role="dialog" aria-modal="true" aria-label="Instalar o Climbix"><span class="ins-grab" aria-hidden="true"></span>' + head + body + '</div>';
    wrap.onclick = e => { if (e.target === wrap) later(); };
    wrap.querySelector('[data-a="later"]').onclick = later;
    const go = wrap.querySelector('[data-a="go"]');
    if (go) go.onclick = () => {
      if (!deferred) return later();
      const d = deferred; deferred = null;
      d.prompt();
      (d.userChoice || Promise.resolve({})).then(r => { if (r && r.outcome === 'accepted') { put({ done: Date.now() }); close(); } else later(); }).catch(later);
    };
    const show = wrap.querySelector('[data-a="show"]');
    if (show) show.onclick = () => { put({ later: Date.now() }); close(); point(p); chipIn(); };
    document.body.appendChild(wrap);
  }

  // Depois de "Mostrar onde fica": a seta pulando no botão do navegador e, no alto, o que fazer depois dele
  function point(p) {
    close();
    const st = steps(p), rest = st.slice(1).map(s => s[1]).join(' › ');
    wrap = document.createElement('div');
    wrap.className = 'ins-point ins-' + (SPOT[p] || 'br');
    wrap.innerHTML = '<button class="ins-tip" aria-label="Fechar dica"><em>1</em><span><b>' + st[0][1].replace(/<\/?b>/g, '') + '</b><small>Depois: ' + rest + '</small></span></button>' +
      '<span class="ins-arrow">' + ARROW + '</span>';
    wrap.querySelector('.ins-tip').onclick = close;
    document.body.appendChild(wrap);
    setTimeout(() => { if (wrap && wrap.classList.contains('ins-point')) close(); }, 20000);
  }

  // Lembrete no fim da home (depois do "Agora não")
  const CHIP = () => '<div class="ins-chip"><img src="icons/icon-192.png?v=bc5d742f" alt="" width="44" height="44"><div><b>Jogue como app</b><small>Tela cheia, direto da Tela de Início</small></div>' +
    '<button class="ins-how" data-a="how">Como instalar</button><button class="ins-x" data-a="x" aria-label="Fechar lembrete">' + U.ICON.x + '</button></div>';
  function chipBind(el, p) {
    el.querySelector('[data-a="how"]').onclick = () => sheet(p);
    el.querySelector('[data-a="x"]').onclick = () => { put({ chipOff: Date.now() }); el.remove(); };
  }
  function chipIn() {
    const p = platform(), hm = document.querySelector('.hm');
    if (!p || !hm || hm.querySelector('.ins-chip') || get().chipOff || get().done) return;
    const t = document.createElement('div'); t.innerHTML = CHIP();
    const el = t.firstChild, sec = hm.querySelector('.hm-sec');
    sec ? sec.after(el) : hm.appendChild(el);
    chipBind(el, p);
  }

  U.installHome = () => {
    const p = platform(), s = get();
    return p && s.later && !s.chipOff && !s.done ? CHIP() : '';
  };
  // Home deitada (a de todo mundo desde 2026-11-06): a folha é em pé e não cabe no celular deitado. Ela abre quando o
  // celular está em pé (o "Gire o celular", que é como quase todo mundo chega pelo link) ou em tela alta (iPad). Aberta com
  // o celular deitado, espera ele ficar em pé; girou com a folha aberta, ela fecha sem contar como "Agora não"
  const landHome = () => document.body.classList.contains('ld-on') && !!document.querySelector('#ld-st .hl');
  const fits = () => window.innerHeight >= 500;
  let turned = false; // fechou porque o celular deitou: não insiste de novo nesta visita
  function auto() {
    const p = platform(), s = get();
    if (!p || s.later || s.done || wrap || turned) return;
    const land = landHome();
    if (!land && !document.querySelector('.hm')) return;
    if (land && !fits()) return;
    if (document.querySelector('.cfg-wrap, .ask-wrap, .sh-wrap, .mo-wrap, #ld-pop, .pay-ty') || /[?&]pago=/.test(location.search)) return; // não cobre outra janela (Novidades, confirmação, volta da compra...)
    sheet(p);
  }
  let rsT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      if (wrap && landHome() && !fits()) { if (wrap.classList.contains('ins-wrap')) turned = true; close(); }
      else if (!wrap) auto();
    }, 350);
  });
  U.installHomeBind = () => {
    const p = platform(); if (!p) return;
    const el = document.querySelector('.hm .ins-chip'); if (el) chipBind(el, p);
    const s = get();
    if (s.later || s.done) return;
    setTimeout(auto, 900); // primeira vez: espera a home assentar
  };
  U.installSheet = () => { const p = platform() || 'ios'; sheet(p); };
})();
