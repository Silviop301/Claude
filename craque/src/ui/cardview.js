// Interface — carta 3D compartilhada: o link leva a carta dentro dele (?c=...) e abre direto no jogo,
// girando e com reflexo. Sem 3D (aparelho sem WebGL), mostra a carta desenhada.
(function () {
  const U = window.CRAQUE_UI;
  const { D, esc, $, render } = U;

  // Dados da carta → texto curto para o link (JSON em base64 que funciona em URL)
  const KEYS = ['name', 'number', 'pos', 'peak', 'attrs', 'flag', 'crest', 'grade', 'verdict', 'goals', 'assists', 'titles', 'ballon', 'wc', 'cs', 'penSaved', 'traits', 'special', 'kit', 'footer', 'look', 'shirt', 'curve', 'tSeasons', 'startAge', 'sign', 'finish'];
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
  const linkOf = d => (window.CLIMBIX_HOME || location.origin + location.pathname.replace(/index\.html$/, '')) + '?c=' + encode(d);

  // Link curto (climbix.app/?c=xxxxxxx): a carta fica guardada no servidor (api/c.php); sem servidor, o link longo
  const CARDS_API = window.CLIMBIX_CARDS_API || (/climbix\.app$/.test(location.hostname) ? '/api/c.php' : 'https://climbix.app/api/c.php');
  const SHORT = /^[0-9A-Za-z]{7}$/;
  const base = () => (window.CLIMBIX_HOME || location.origin + location.pathname.replace(/index\.html$/, ''));
  async function shortLink(d) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(CARDS_API + '?a=put', { method: 'POST', body: JSON.stringify({ d: encode(d) }), signal: ctl.signal });
      clearTimeout(t);
      const j = await r.json();
      if (j && SHORT.test(j.id || '')) return base() + '?c=' + j.id;
    } catch (e) { /* sem internet ou servidor fora: link longo */ }
    return linkOf(d);
  }

  // Compartilhar a carta: a imagem da carta + o link curto que abre a carta 3D.
  // Sem folha de compartilhar com arquivo: salva a imagem e copia o texto com o link
  async function shareCard(d, btn) {
    const old = btn ? btn.innerHTML : '';
    if (btn) btn.textContent = 'Preparando…';
    const cv = document.createElement('canvas');
    const [url] = await Promise.all([shortLink(d), window.CRAQUE_CARD(cv, d)]);
    const text = 'Olha a carta de ' + d.name + ' no Climbix! Veja em 3D: ' + url;
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    const file = blob && new File([blob], 'climbix-' + String(d.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', { type: 'image/png' });
    const done = (label, r) => { if (btn) { btn.innerHTML = label || old; if (label) setTimeout(() => { btn.innerHTML = old; }, 2500); } return r; };
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return done('', 'shared'); }
      if (navigator.share) { await navigator.share({ title: 'Climbix', text, url }); return done('', 'shared'); }
    } catch (e) { if (e && e.name === 'AbortError') return done('', 'cancel'); }
    if (file) { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); }
    try { await navigator.clipboard.writeText(text); return done('Imagem salva e link copiado', 'copied'); } catch (e) { prompt('Copie o link da carta:', url); return done('', 'prompt'); }
  }

  // Carta 3D num elemento; se o 3D não vier, a carta desenhada
  function mount3d(host, d, opts) {
    const cv = host.querySelector('canvas');
    if (cv) window.CRAQUE_CARD(cv, d);
    const go = () => (window.CRAQUE_BALL && window.CRAQUE_BALL.card3d && U.cfg.fx3d ? window.CRAQUE_BALL.card3d(host, d, opts) : Promise.resolve(null));
    // O módulo 3D pode ainda estar carregando
    const wait = n => (window.CRAQUE_BALL && window.CRAQUE_BALL.card3d) || n <= 0 || !U.cfg.fx3d ? go() : new Promise(r => setTimeout(r, 150)).then(() => wait(n - 1));
    return wait(20).then(v => { if (v) host.classList.add('has3d'); return v; });
  }

  // Tela da carta compartilhada
  function cardView(d) {
    U.G.c = null; U.G.step = null; U.bar();
    const pos = D.POS[d.pos] ? D.POS[d.pos].name : '';
    render('<div class="cv-page"><div class="eyebrow">Carta do Climbix</div>' +
      '<div class="card3d-host big" id="cv-host"><canvas aria-label="Carta"></canvas></div>' +
      '<div class="cv-info"><b>' + esc(d.name) + '</b><span>' + U.flag(d.flag) + ' ' + esc(pos) + (d.verdict ? ' · ' + esc(d.verdict) : '') + '</span></div>' +
      '<p class="muted small cv-hint">Arraste para girar a carta</p>' +
      '<button class="btn" id="cv-play">Criar a minha carreira</button>' +
      '<button class="btn ghost" id="cv-share">Compartilhar esta carta</button></div>');
    mount3d($('cv-host'), d);
    $('cv-play').onclick = () => { history.replaceState(null, '', location.pathname); U.home(); };
    $('cv-share').onclick = () => shareCard(d, $('cv-share'));
  }

  // Link com carta: abre direto nela (link curto busca a carta no servidor; link longo traz a carta inteira)
  function fromLink() {
    const c = new URLSearchParams(location.search).get('c');
    if (!c) return false;
    if (SHORT.test(c)) {
      render('<div class="cv-page"><div class="eyebrow">Carta do Climbix</div><p class="muted">Carregando a carta…</p></div>');
      fetch(CARDS_API + '?a=get&id=' + c).then(r => r.json()).then(j => { const d = j && j.d && decode(j.d); if (d) cardView(d); else throw new Error('sem carta'); })
        .catch(() => { history.replaceState(null, '', location.pathname); U.home(); });
      return true;
    }
    const d = decode(c);
    if (d) { cardView(d); return true; }
    return false;
  }

  Object.assign(U, { cardLink: linkOf, shortLink, shareCard, mount3d, cardView, cardFromLink: fromLink });
})();
