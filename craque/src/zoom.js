/* Sem zoom de pinça (Silvio, 18/11): no iPhone a tela "Subiu!" ficou ampliada e o Seguir saiu da vista, parecia travado.
   O Safari ignora maximum-scale, então a pinça é barrada pelos eventos; se mesmo assim voltar ampliado, a escala é zerada */
(function () {
  var no = function (e) { e.preventDefault(); };
  ['gesturestart', 'gesturechange'].forEach(function (ev) { document.addEventListener(ev, no, { passive: false }); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  var vv = window.visualViewport, m = document.querySelector('meta[name=viewport]');
  function fit() {
    if (!vv || !m || vv.scale < 1.02) return;
    var c = m.getAttribute('content');
    m.setAttribute('content', c.replace('initial-scale=1', 'initial-scale=1.0001'));
    setTimeout(function () { m.setAttribute('content', c); }, 60);
  }
  if (vv) vv.addEventListener('resize', function () { clearTimeout(fit.t); fit.t = setTimeout(fit, 400); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(fit, 200); });
  window.addEventListener('pageshow', function () { setTimeout(fit, 200); });
})();
