// CRAQUE: ponto de partida da interface. As telas ficam em ui/*.js (carregadas antes pelo index.html).
// Link de carta compartilhada (?c=...) abre direto nela; senão, a tela inicial
window.CRAQUE_UI.challengeFromLink(); // desafio (?d=...) fica guardado e aparece na tela inicial
window.CRAQUE_UI.relampagoFromLink(); // desafio da Carreira Relâmpago (?r=...), idem
if (!window.CRAQUE_UI.cardFromLink()) window.CRAQUE_UI.home();
// Com conta: traz o que mudou em outro aparelho
window.CRAQUE_UI.cloudBoot();

// Instalável e offline: registra o service worker (gerado por tools/craque_sw.py)
// (fora na versão de portal: o jogo roda dentro da página do portal)
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.CLIMBIX_PORTAL) {
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
  const go = () => {
    const s = document.createElement('script'); s.type = 'module'; s.src = tag.dataset.src;
    // A biblioteca não chegou (sem internet, rede bloqueando, navegador antigo): as telas usam o desenho 2D
    s.onerror = () => { window.CRAQUE_BALL_FAIL = true; if (window.CLIMBIX_REPORT) window.CLIMBIX_REPORT('3D: biblioteca não carregou'); window.dispatchEvent(new Event('craque-ball-fail')); };
    document.head.appendChild(s);
  };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 800));
  if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle);
})();

