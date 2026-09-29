// CRAQUE: ponto de partida da interface. As telas ficam em ui/*.js (carregadas antes pelo index.html).
window.CRAQUE_UI.home();

// Instalável e offline: registra o service worker (gerado por tools/craque_sw.py)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js' + (window.CLIMBIX_VER ? '?v=' + window.CLIMBIX_VER : '')).catch(() => { /* sem offline, segue normal */ }));
}
