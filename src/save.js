// Salvamento local. Tudo protegido por try/catch: o jogo funciona mesmo sem storage.
(function () {
  const KEY = 'pombo-stonks-v1';

  PS.save = function () {
    try {
      PS.S.lastTick = Date.now();
      localStorage.setItem(KEY, JSON.stringify(PS.S));
    } catch (e) { /* storage indisponível */ }
  };

  PS.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch (e) {
      return null;
    }
  };

  PS.wipe = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  };
})();
