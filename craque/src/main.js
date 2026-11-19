// CRAQUE: ponto de partida da interface. As telas ficam em ui/*.js (carregadas antes pelo index.html).
window.CRAQUE_UI.home();
// A tela de carregar (index.html) sai quando a primeira tela abre (a home deitada fica no palco, fora do #screen)
{ const bt = document.getElementById('boot'); if (bt) bt.remove(); }
// Com conta: traz o que mudou em outro aparelho
window.CRAQUE_UI.cloudBoot();
if (window.CRAQUE_UI.payBoot) window.CRAQUE_UI.payBoot();

// Instalável e offline: registra o service worker (gerado por tools/craque_sw.py)
// (fora na versão de portal: o jogo roda dentro da página do portal)
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.CLIMBIX_PORTAL) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js' + (window.CLIMBIX_VER ? '?v=' + window.CLIMBIX_VER : '')).catch(() => { /* sem offline, segue normal */ });
    // Emojis, sons e o goleiro dos lances vão para o offline aos poucos, com o jogo já aberto (escudos, taças e o 3D, quando aparecem)
    setTimeout(() => navigator.serviceWorker.ready.then(reg => reg.active && reg.active.postMessage('warm')).catch(() => {}), 6000);
  });
}



// Versão nova no ar com a aba aberta (17/11: um jogador seguiu dois jogos na versão de antes do conserto): de 10 em 10 min e
// ao voltar para a aba, lê o index.html sem cache e compara o ?v= do start.js com U.BUILD; com versão nova, recarrega ao voltar
// para a aba, ou na home e na Semana, sem jogo ao vivo nem campo de texto aberto (o jogo ao vivo fica guardado e volta do minuto)
(function () {
  const U = window.CRAQUE_UI; if (!U || window.CLIMBIX_PORTAL || location.protocol === 'file:' || navigator.webdriver) return;
  let novo = false, t = 0;
  const livre = () => !document.getElementById('lv-score') && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName));
  const vai = volta => { if (novo && livre() && (volta || document.querySelector('.hl-e, .ld-st .sm'))) location.reload(); }; // na hora, só na home ou na Semana
  const olha = () => { if (novo || Date.now() - t < 60000) return vai(); t = Date.now();
    fetch('index.html?u=' + Date.now(), { cache: 'no-store' }).then(r => r.text()).then(h => { const m = /start\.js\?v=([a-z0-9]+)/.exec(h);
      if (m && U.BUILD && m[1] !== U.BUILD) { novo = true; vai(); } }).catch(() => {}); };
  setInterval(() => { if (!document.hidden) olha(); else if (novo) vai(); }, 600000);
  setInterval(() => { if (novo && !document.hidden) vai(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (novo) vai(true); else olha(); } });
})();
