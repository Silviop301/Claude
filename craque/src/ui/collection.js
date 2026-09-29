// Interface — coleção: a carta final (e as especiais) de cada carreira encerrada vai para um fichário
// no aparelho. Páginas para completar: faixas, posições, países, notas e especiais. Sem bônus: só colecionar.
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, $, esc, load, store, render, bar, G } = U;
  const KEY = 'climbix-colecao-v1', MAX = 300;
  const TIER_OF = { bronze: 'bronze', prata: 'prata', dourada: 'ouro', icone: 'icone' };
  const TIERS = [['bronze', 'Bronze'], ['prata', 'Prata'], ['ouro', 'Ouro'], ['icone', 'Ícone']];
  const GRADES = ['S', 'A', 'B', 'C', 'D'];
  const all = () => load(KEY) || [];
  const tierOf = d => TIER_OF[(window.CRAQUE_CARD_METAL(d) || {}).metal] || 'bronze';

  // Fim de carreira: guarda a carta final e as especiais
  function collect(c, f, card) {
    if (c.collected) return;
    c.collected = true;
    const list = all();
    const specials = (c.cards || []).map(k => U.cardData(c, k));
    list.push({ at: Date.now(), country: c.country, pos: c.pos, peak: c.peak, grade: f.grade, score: f.score, card, specials });
    // Cheio: sai a carta de menor pontuação
    if (list.length > MAX) list.sort((a, b) => b.score - a.score).length = MAX;
    store(KEY, list);
  }
  const count = () => all().length;

  // Miniatura: desenha a carta num canvas só e guarda a imagem pequena (poupa memória no celular)
  const thumbs = new Map();
  let queue = Promise.resolve();
  function thumb(d, img) {
    const k = JSON.stringify(d);
    if (!thumbs.has(k)) {
      thumbs.set(k, queue = queue.then(async () => {
        const big = document.createElement('canvas');
        await window.CRAQUE_CARD(big, d);
        const t = document.createElement('canvas');
        t.width = 180; t.height = 258;
        t.getContext('2d').drawImage(big, 0, 0, t.width, t.height);
        return t.toDataURL('image/png');
      }).catch(() => null));
    }
    thumbs.get(k).then(url => { if (url && img.isConnected) img.src = url; });
  }

  // Páginas: cada vaga guarda a melhor carta que cumpre a condição
  function pages(list) {
    const cards = [];
    list.forEach((e, i) => { cards.push({ e, d: e.card, i, sp: null }); e.specials.forEach((d, j) => cards.push({ e, d, i, sp: j })); });
    const finals = cards.filter(x => x.sp === null);
    const best = arr => arr.slice().sort((a, b) => (b.e.score - a.e.score) || (b.d.peak - a.d.peak))[0] || null;
    return [
      { t: 'Faixas', slots: TIERS.map(([k, n]) => ({ label: n, hit: best(finals.filter(x => tierOf(x.d) === k)) })) },
      { t: 'Posições', slots: Object.keys(D.POS).map(p => ({ label: D.POS[p].name, hit: best(finals.filter(x => x.e.pos === p)) })) },
      { t: 'Países', slots: D.COUNTRIES.map(k => ({ label: k.flag, hit: best(finals.filter(x => x.e.country === k.id)) })) },
      { t: 'Notas', slots: GRADES.map(g => ({ label: 'Nota ' + g, hit: best(finals.filter(x => x.e.grade === g)) })) },
      { t: 'Especiais', slots: Object.keys(U.SPECIAL_NAME).map(s => ({ label: U.SPECIAL_NAME[s], hit: best(cards.filter(x => x.d.special === s)) })) },
    ];
  }

  const slotHtml = (s, key) => s.hit
    ? '<button class="col-slot has" data-k="' + key + '" aria-label="' + esc(s.hit.d.name) + '"><img alt=""><span' + (flagLbl(s.label) ? ' class="flag"' : '') + '>' + esc(s.label) + '</span></button>'
    : '<div class="col-slot empty"><div class="col-ghost">?</div><span' + (flagLbl(s.label) ? ' class="flag"' : '') + '>' + esc(s.label) + '</span></div>';
  const flagLbl = t => D.COUNTRIES.some(k => k.flag === t);

  function collection() {
    G.c = null; G.step = null; bar();
    const list = all();
    const pg = pages(list);
    const got = pg.reduce((a, p) => a + p.slots.filter(s => s.hit).length, 0), total = pg.reduce((a, p) => a + p.slots.length, 0);
    const byKey = {};
    let html = '<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="eyebrow">Coleção</div><h2>Suas cartas</h2>' +
      '<div class="col-top"><b>' + got + '/' + total + '</b><span>vagas preenchidas · ' + list.length + (list.length === 1 ? ' carreira' : ' carreiras') + '</span><div class="col-bar"><i style="width:' + Math.round(got / total * 100) + '%"></i></div></div>';
    if (!list.length) html += '<p class="muted">Termine uma carreira para a carta dela entrar aqui. Cada faixa, posição, país, nota e carta especial tem uma vaga para completar.</p>';
    pg.forEach((p, pi) => {
      const n = p.slots.filter(s => s.hit).length;
      html += '<div class="col-page"><div class="col-pt">' + p.t + '<span>' + n + '/' + p.slots.length + (n === p.slots.length ? ' ✓' : '') + '</span></div><div class="col-grid">' +
        p.slots.map((s, si) => { const k = pi + '-' + si; if (s.hit) byKey[k] = s.hit.d; return slotHtml(s, k); }).join('') + '</div></div>';
    });
    // Todas as cartas finais, da maior pontuação para a menor
    const sorted = list.map((e, i) => ({ e, i })).sort((a, b) => b.e.score - a.e.score);
    if (sorted.length) {
      html += '<div class="col-page"><div class="col-pt">Todas as carreiras<span>' + sorted.length + '</span></div><div class="col-grid all">' +
        sorted.map(({ e, i }) => { byKey['a' + i] = e.card; return '<button class="col-slot has" data-k="a' + i + '" aria-label="' + esc(e.card.name) + '"><img alt=""><span>' + e.score + ' pts</span></button>'; }).join('') + '</div></div>';
    }
    render(html);
    $('b-back-home').onclick = U.home;
    document.querySelectorAll('.col-slot.has').forEach(b => {
      const d = byKey[b.dataset.k];
      thumb(d, b.querySelector('img'));
      b.onclick = () => view(d);
    });
  }

  // Uma carta da coleção em 3D (arrastar gira); compartilhar manda o link dela
  function view(d) {
    render('<button class="back-link" id="b-back-col">‹ Coleção</button><div class="cv-page">' +
      '<div class="card3d-host big" id="cv-host"><canvas aria-label="Carta"></canvas></div>' +
      '<div class="cv-info"><b>' + esc(d.name) + '</b><span>' + (d.flag || '') + ' ' + esc(D.POS[d.pos] ? D.POS[d.pos].name : '') + (d.verdict ? ' · ' + esc(d.verdict) : '') + '</span></div>' +
      '<p class="muted small cv-hint">Arraste para girar a carta</p>' +
      '<button class="btn ghost" id="cv-share">Compartilhar esta carta</button></div>');
    let viewer = null;
    U.mount3d($('cv-host'), d).then(v => { viewer = v; });
    $('b-back-col').onclick = () => { if (viewer && viewer.dispose) viewer.dispose(); collection(); };
    $('cv-share').onclick = () => U.shareCard(d, $('cv-share'));
  }

  Object.assign(U, { collection, collect, collectionCount: count });
})();
