// CRAQUE: ponto de partida da interface. As telas ficam em ui/*.js (carregadas antes pelo index.html).
// Link de carta compartilhada (?c=...) abre direto nela; senão, a tela inicial
if (!window.CRAQUE_UI.cardFromLink()) window.CRAQUE_UI.home();
// Com conta: traz o que mudou em outro aparelho
window.CRAQUE_UI.cloudBoot();

// Instalável e offline: registra o service worker (gerado por tools/craque_sw.py)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js' + (window.CLIMBIX_VER ? '?v=' + window.CLIMBIX_VER : '')).catch(() => { /* sem offline, segue normal */ });
    // Escudos, taças, emojis e o 3D vão para o offline aos poucos, com o jogo já aberto
    setTimeout(() => navigator.serviceWorker.ready.then(reg => reg.active && reg.active.postMessage('warm')).catch(() => {}), 6000);
  });
}

// Efeitos 3D (bola, cartas, jornal): a biblioteca é grande e não é necessária para a primeira tela.
// Carrega depois da página abrir, quando o navegador estiver livre.
(function () {
  const tag = document.getElementById('ball3d-src');
  if (!tag) return;
  const go = () => { const s = document.createElement('script'); s.type = 'module'; s.src = tag.dataset.src; document.head.appendChild(s); };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 800));
  if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle);
})();

