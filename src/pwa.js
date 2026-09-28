// Registra o service worker quando o jogo está hospedado (http/https), para instalar como app.
(function () {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ambiente sem suporte: segue sem cache */ });
  });
})();
