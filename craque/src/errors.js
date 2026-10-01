// Erros do jogo no aparelho do jogador: manda para climbix.app/api/errors.php (mensagem, arquivo, linha, versão e tela).
// Carregado antes de todos os scripts. No máximo 5 erros por sessão, sem repetir o mesmo; nada pessoal.
(function () {
  if (typeof window === 'undefined') return;
  // Testes (localhost, ?e2e=) não enviam, a não ser com ?errlog=1
  const test = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]e2e=/.test(location.search);
  if (test && !/[?&]errlog=1/.test(location.search)) return;
  const API = window.CLIMBIX_ERRORS_API || (/climbix\.app$/.test(location.hostname) ? '/api/errors.php' : 'https://climbix.app/api/errors.php');
  const sent = new Set();
  let left = 5;
  // Navegador resumido (família e sistema), sem o texto completo
  const ua = (() => {
    const u = navigator.userAgent || '';
    const os = /Android [\d.]+/.exec(u) || /iPhone OS [\d_]+|iPad; CPU OS [\d_]+/.exec(u) || /Windows NT [\d.]+|Mac OS X [\d_]+|Linux/.exec(u);
    const br = /SamsungBrowser\/\d+|Edg\/\d+|OPR\/\d+|Firefox\/\d+|CriOS\/\d+|Chrome\/\d+|Version\/[\d.]+ (?:Mobile\/\w+ )?Safari/.exec(u);
    return ((br && br[0]) || '?') + ' · ' + ((os && os[0]) || '?');
  })();
  function report(msg, src, line, col, stack) {
    msg = String(msg || '').slice(0, 300);
    if (!msg || left <= 0) return;
    // Ruído que não é do jogo: extensões, scripts de outros sites, aviso do ResizeObserver
    if (/^Script error\.?$/.test(msg) || /ResizeObserver loop/.test(msg)) return;
    if (src && !/climbix\.app|localhost|127\.0\.0\.1/.test(src) && !/^\//.test(src)) return;
    const key = msg + '|' + src + '|' + line;
    if (sent.has(key)) return;
    sent.add(key); left--;
    const U = window.CRAQUE_UI, body = JSON.stringify({ msg, src: src || '', line: line || 0, col: col || 0, stack: String(stack || '').slice(0, 1500),
      ver: window.CLIMBIX_VER || '', step: (U && U.G && U.G.step) || (U && U.G && U.G.c ? 'carreira' : 'inicio'), ua });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(API + '?a=log', new Blob([body], { type: 'text/plain' }));
      else fetch(API + '?a=log', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {});
    } catch (e) { /* sem rede: deixa para lá */ }
  }
  addEventListener('error', e => { if (e && e.message) report(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack); });
  addEventListener('unhandledrejection', e => {
    const r = e && e.reason;
    report('Promessa rejeitada: ' + ((r && r.message) || String(r)), r && r.fileName, 0, 0, r && r.stack);
  });
  window.CLIMBIX_REPORT = (msg, stack) => report(msg, '', 0, 0, stack);
})();
