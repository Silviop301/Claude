// Formatação de números grandes e tempo (padrão brasileiro: vírgula decimal).
(function () {
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
    'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

  PS.tierOf = function (n) {
    if (!(n >= 1000)) return 0;
    return Math.floor(Math.log10(n) / 3 + 1e-9);
  };

  // decimals: mostra casas decimais para valores pequenos (ex.: 0,1/s)
  PS.fmt = function (n, decimals) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + PS.fmt(-n, decimals);
    if (n < 1000) {
      if (decimals && n < 100 && n % 1 !== 0) return n.toFixed(1).replace('.', ',');
      return Math.floor(n).toString();
    }
    const i = PS.tierOf(n);
    if (i >= SUFFIX.length) return n.toExponential(2).replace('.', ',');
    const v = n / Math.pow(1000, i);
    const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString();
    return s.replace('.', ',') + SUFFIX[i];
  };

  PS.fmtTime = function (sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + 'h ' + m + 'min';
    if (m > 0) return m + 'min ' + s + 's';
    return s + 's';
  };

  PS.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  PS.rand = (a, b) => a + Math.random() * (b - a);
})();
