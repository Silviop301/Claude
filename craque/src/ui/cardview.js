// Interface — carta 3D compartilhada: o link leva a carta dentro dele (?c=...) e abre direto no jogo,
// girando e com reflexo. Sem 3D (aparelho sem WebGL), mostra a carta desenhada.
(function () {
  const U = window.CRAQUE_UI;
  const { D, esc, $, render } = U;

  // Dados da carta → texto curto para o link (JSON em base64 que funciona em URL)
  const KEYS = ['name', 'number', 'pos', 'peak', 'attrs', 'flag', 'crest', 'grade', 'verdict', 'goals', 'assists', 'titles', 'ballon', 'wc', 'cs', 'penSaved', 'traits', 'special', 'kit', 'footer'];
  function encode(d) {
    const o = {};
    KEYS.forEach(k => { if (d[k] !== undefined && d[k] !== null && d[k] !== '') o[k] = d[k]; });
    if (o.attrs) { const a = {}; for (const k in o.attrs) a[k] = Math.round(o.attrs[k]); o.attrs = a; }
    if (o.crest) o.crest = String(o.crest).replace(/^badges\/|\.png$/g, ''); // só o id do clube
    const bytes = new TextEncoder().encode(JSON.stringify(o));
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(s) {
    try {
      const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
      if (!d || !d.name || !d.attrs) return null;
      if (d.crest && /^[a-z0-9-]+$/.test(d.crest)) d.crest = 'badges/' + d.crest + '.png'; else delete d.crest;
      d.name = String(d.name).slice(0, 24);
      d.verdict = String(d.verdict || '').slice(0, 40);
      return d;
    } catch (e) { return null; }
  }
  const linkOf = d => location.origin + location.pathname.replace(/index\.html$/, '') + '?c=' + encode(d);

  // Compartilhar a carta: link (abre a carta 3D no jogo); sem folha de compartilhar, copia o link
  async function shareCard(d, btn) {
    const url = linkOf(d), text = 'Olha a carta de ' + d.name + ' no Climbix!';
    try {
      if (navigator.share) { await navigator.share({ title: 'Climbix', text, url }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    try { await navigator.clipboard.writeText(text + ' ' + url); if (btn) btn.textContent = 'Link copiado!'; return 'copied'; } catch (e) { prompt('Copie o link da carta:', url); return 'prompt'; }
  }

  // Carta 3D num elemento; se o 3D não vier, a carta desenhada
  function mount3d(host, d, opts) {
    const cv = host.querySelector('canvas');
    if (cv) window.CRAQUE_CARD(cv, d);
    const go = () => (window.CRAQUE_BALL && window.CRAQUE_BALL.card3d ? window.CRAQUE_BALL.card3d(host, d, opts) : Promise.resolve(null));
    // O módulo 3D pode ainda estar carregando
    const wait = n => (window.CRAQUE_BALL && window.CRAQUE_BALL.card3d) || n <= 0 ? go() : new Promise(r => setTimeout(r, 150)).then(() => wait(n - 1));
    return wait(20).then(v => { if (v) host.classList.add('has3d'); return v; });
  }

  // Tela da carta compartilhada
  function cardView(d) {
    U.G.c = null; U.G.step = null; U.bar();
    const pos = D.POS[d.pos] ? D.POS[d.pos].name : '';
    render('<div class="cv-page"><div class="eyebrow">Carta do Climbix</div>' +
      '<div class="card3d-host big" id="cv-host"><canvas aria-label="Carta"></canvas></div>' +
      '<div class="cv-info"><b>' + esc(d.name) + '</b><span>' + (d.flag || '') + ' ' + esc(pos) + (d.verdict ? ' · ' + esc(d.verdict) : '') + '</span></div>' +
      '<p class="muted small cv-hint">Arraste para girar a carta</p>' +
      '<button class="btn" id="cv-play">Criar a minha carreira</button>' +
      '<button class="btn ghost" id="cv-share">Compartilhar esta carta</button></div>');
    mount3d($('cv-host'), d);
    $('cv-play').onclick = () => { history.replaceState(null, '', location.pathname); U.home(); };
    $('cv-share').onclick = () => shareCard(d, $('cv-share'));
  }

  // Link com carta: abre direto nela
  function fromLink() {
    const c = new URLSearchParams(location.search).get('c');
    const d = c && decode(c);
    if (d) { cardView(d); return true; }
    return false;
  }

  Object.assign(U, { cardLink: linkOf, shareCard, mount3d, cardView, cardFromLink: fromLink });
})();
