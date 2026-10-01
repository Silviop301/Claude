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
    const specials = (c.cards || []).map(k => U.specialFinal(card, c, k));
    const at = Date.now();
    list.push({ at, country: c.country, pos: c.pos, peak: c.peak, grade: f.grade, score: f.score, card, specials });
    // Cheio: sai a carta de menor pontuação
    if (list.length > MAX) list.sort((a, b) => b.score - a.score).length = MAX;
    store(KEY, list);
    return at;
  }
  // Edição da carta no fim da carreira (assinatura, escudo): vale também para as especiais guardadas
  function collectPatch(at, patch) {
    const list = all(), e = list.find(x => x.at === at);
    if (!e) return;
    Object.assign(e.card, patch);
    (e.specials || []).forEach(sp => Object.assign(sp, patch.sign !== undefined ? { sign: patch.sign } : {}));
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
      { t: 'Especiais', slots: Object.keys(U.SPECIAL_NAME).map(s => ({ label: U.SPECIAL_NAME[s], rar: U.SPECIAL_RARITY[s], hit: best(cards.filter(x => x.d.special === s)) })) },
    ];
  }

  const rarHtml = s => (s.rar ? '<i class="col-rar ' + s.rar.toLowerCase().replace('é', 'e') + '">' + s.rar + '</i>' : '');
  const slotHtml = (s, key) => s.hit
    ? '<button class="col-slot has" data-k="' + key + '" aria-label="' + esc(s.hit.d.name) + '"><img alt="">' + rarHtml(s) + '<span' + (flagLbl(s.label) ? ' class="flag"' : '') + '>' + (flagLbl(s.label) ? U.flag(s.label) : esc(s.label)) + '</span></button>'
    : '<div class="col-slot empty"><div class="col-ghost">?</div>' + rarHtml(s) + '<span' + (flagLbl(s.label) ? ' class="flag"' : '') + '>' + (s.rar ? '???' : flagLbl(s.label) ? U.flag(s.label) : esc(s.label)) + '</span></div>';
  const flagLbl = t => D.COUNTRIES.some(k => k.flag === t);

  // Álbum de folhear: capa e páginas de 6 figurinhas; passa arrastando para o lado ou nas setas
  const PER = 6;
  let at = 0; // página aberta (volta nela depois de ver uma carta)
  function book(list) {
    const pg = pages(list), out = [];
    const got = pg.reduce((a, p) => a + p.slots.filter(s => s.hit).length, 0), total = pg.reduce((a, p) => a + p.slots.length, 0);
    out.push({ cover: true, got, total, n: list.length });
    pg.forEach(p => {
      const parts = Math.ceil(p.slots.length / PER);
      for (let i = 0; i < parts; i++) out.push({ t: p.t + (parts > 1 ? ' · ' + (i + 1) + '/' + parts : ''), all: p.slots, slots: p.slots.slice(i * PER, i * PER + PER) });
    });
    const sorted = list.slice().sort((a, b) => b.score - a.score);
    for (let i = 0; i < sorted.length; i += PER)
      out.push({ t: 'Todas as carreiras', list: sorted.slice(i, i + PER) });
    return out;
  }
  function pageHtml(p, i, n, byKey) {
    if (p.cover) return '<div class="bk-cover"><div class="bk-emb">' + U.emo('⚽', 'lg') + '</div><b>ÁLBUM</b><span>CLIMBIX</span>' +
      '<div class="bk-prog"><b>' + p.got + '/' + p.total + '</b> figurinhas<div class="col-bar"><i style="width:' + Math.round(p.got / p.total * 100) + '%"></i></div></div>' +
      '<small>' + p.n + (p.n === 1 ? ' carreira' : ' carreiras') + (p.n ? ' · arraste para abrir' : ' · termine uma carreira para começar') + '</small></div>';
    let body;
    if (p.list) body = p.list.map((e, j) => { const k = 'a' + i + '-' + j; byKey[k] = e.card; return '<button class="col-slot has" data-k="' + k + '" aria-label="' + esc(e.card.name) + '"><img alt=""><span>' + e.score + ' pts</span></button>'; }).join('');
    else body = p.slots.map((sl, j) => { const k = i + '-' + j; if (sl.hit) byKey[k] = sl.hit.d; return slotHtml(sl, k); }).join('');
    const have = p.all ? p.all.filter(sl => sl.hit).length : 0;
    return '<div class="bk-head">' + esc(p.t) + (p.all ? '<span>' + have + '/' + p.all.length + (have === p.all.length ? ' ✓' : '') + '</span>' : '') + '</div>' +
      '<div class="col-grid bk-grid">' + body + '</div><div class="bk-foot">' + i + '</div>';
  }

  function collection() {
    G.c = null; G.step = null; bar();
    const list = all(), pgs = book(list);
    at = Math.min(at, pgs.length - 1);
    render('<button class="back-link" id="b-back-home">‹ Início</button>' +
      '<div class="book" id="book"><div class="bk-page" id="bk-cur"></div></div>' +
      '<div class="bk-nav"><button class="bk-arrow" id="bk-prev" aria-label="Página anterior">‹</button><span id="bk-n"></span><button class="bk-arrow" id="bk-next" aria-label="Próxima página">›</button></div>');
    $('b-back-home').onclick = () => { at = 0; U.home(); };
    const bookEl = $('book');
    const fill = (el, i) => {
      const byKey = {};
      el.innerHTML = pageHtml(pgs[i], i, pgs.length, byKey);
      el.classList.toggle('cover', !!pgs[i].cover);
      el.querySelectorAll('.col-slot.has').forEach(b => { const d = byKey[b.dataset.k]; thumb(d, b.querySelector('img')); b.onclick = () => view(d); });
    };
    const nav = () => { $('bk-n').textContent = at === 0 ? 'Capa' : 'Página ' + at + ' de ' + (pgs.length - 1); $('bk-prev').disabled = at === 0; $('bk-next').disabled = at >= pgs.length - 1; };
    fill($('bk-cur'), at); nav();
    let busy = false;
    // Virar: a folha gira pela lombada (esquerda); para trás, a folha anterior volta por cima
    function turn(dir) {
      const to = at + dir;
      if (busy || to < 0 || to >= pgs.length) return;
      busy = true;
      const cur = $('bk-cur'), leaf = document.createElement('div');
      leaf.className = 'bk-page bk-leaf';
      if (dir > 0) {
        leaf.innerHTML = cur.innerHTML; leaf.classList.toggle('cover', cur.classList.contains('cover'));
        bookEl.appendChild(leaf); at = to; fill(cur, at);
        leaf.animate([{ transform: 'rotateY(0deg)', filter: 'brightness(1)' }, { transform: 'rotateY(-100deg)', filter: 'brightness(.55)' }], { duration: 420, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' })
          .finished.then(() => { leaf.remove(); busy = false; });
      } else {
        fill(leaf, to); bookEl.appendChild(leaf);
        leaf.animate([{ transform: 'rotateY(-100deg)', filter: 'brightness(.55)' }, { transform: 'rotateY(0deg)', filter: 'brightness(1)' }], { duration: 420, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' })
          .finished.then(() => { at = to; fill(cur, at); leaf.remove(); busy = false; });
      }
      if (U.sfx) U.sfx('paper');
      nav();
    }
    $('bk-prev').onclick = () => turn(-1);
    $('bk-next').onclick = () => turn(1);
    // Arrastar para o lado vira a página
    let x0 = null, y0 = 0;
    bookEl.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; });
    bookEl.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) turn(dx < 0 ? 1 : -1);
    });
  }

  // Uma carta da coleção em 3D (arrastar gira); compartilhar manda o link dela
  function view(d) {
    render('<button class="back-link" id="b-back-col">‹ Coleção</button><div class="cv-page">' +
      '<div class="card3d-host big" id="cv-host"><canvas aria-label="Carta"></canvas></div>' +
      '<div class="cv-info"><b>' + esc(d.name) + '</b><span>' + U.flag(d.flag) + ' ' + esc(D.POS[d.pos] ? D.POS[d.pos].name : '') + (d.verdict ? ' · ' + esc(d.verdict) : '') + '</span></div>' +
      '<p class="muted small cv-hint">Arraste para girar a carta</p>' +
      '<button class="btn ghost" id="cv-share">Compartilhar esta carta</button></div>');
    let viewer = null;
    U.mount3d($('cv-host'), d).then(v => { viewer = v; });
    $('b-back-col').onclick = () => { if (viewer && viewer.dispose) viewer.dispose(); collection(); };
    $('cv-share').onclick = () => U.shareCard(d, $('cv-share'));
  }

  Object.assign(U, { collection, collect, collectPatch, collectionCount: count });
})();
