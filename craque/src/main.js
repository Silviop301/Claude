// CRAQUE: ponto de partida da interface. As telas ficam em ui/*.js (carregadas antes pelo index.html).
window.CRAQUE_UI.home();

// Instalável e offline: registra o service worker (gerado por tools/craque_sw.py)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sem offline, segue normal */ }));
}
