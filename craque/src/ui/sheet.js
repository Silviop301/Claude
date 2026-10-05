// Interface — ficha do jogador (abre a qualquer momento tocando na nota do topo).
// Três abas curtas: Build (atributos e as 5 características), Combinações (o que falta para cada uma
// e o catálogo) e Carreira (números e temporada a temporada).
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, esc, crest, club, trophy, YEAR0 } = U;
  const DOTS = lv => '<em class="dots">' + '●'.repeat(lv) + '<s>' + '●'.repeat(S.MAX_LV - lv) + '</s></em>';
  const attrLine = (at, pos, k = 1) => Object.keys(at).filter(x => at[x]).map(x => '+' + Math.round(at[x] * k) + ' ' + D.label(pos, x)).join(' · ');
  const POS = { ATA: 'Atacante', MEI: 'Meia', ZAG: 'Zagueiro', GOL: 'Goleiro' };

  // Atributos em blocos: valor grande, bônus de características/investimentos em verde, ★ nos que mais pesam
  function attrs(c) {
    const E = S.eff(c), w = D.POS[c.pos].w;
    return '<div class="sh-at">' + D.ATTRS.slice().sort((a, b) => w[b] - w[a]).map(k => {
      const bonus = E[k] - Math.round(c.attrs[k]);
      return '<div class="' + (w[k] >= 0.2 ? 'key' : '') + '"><b>' + E[k] + '</b><span>' + D.label(c.pos, k) + (w[k] >= 0.2 ? ' ★' : '') + '</span>' +
        (bonus > 0 ? '<i>+' + bonus + '</i>' : '') + '</div>';
    }).join('') + '</div>';
  }

  // As 5 características: uma linha cada (nome, nível e o efeito de hoje)
  function slots(c) {
    let out = '';
    for (let i = 0; i < S.MAX_SLOTS; i++) {
      const id = c.traits[i];
      if (!id) { out += '<div class="sh-tr empty">Espaço livre</div>'; continue; }
      const t = D.TRAIT_BY_ID[id], lv = S.traitLevel(c, id);
      out += '<div class="sh-tr"><span class="ic">' + U.icoOf(t, 'sm') + '</span><div><b>' + esc(t.name) + DOTS(lv) + '</b><small>' + esc(t.fx ? t.fx(D.TRAIT_LV[lv]) : '') + '</small></div></div>';
    }
    return out;
  }

  function buildTab(c) {
    const lv = c.traits.reduce((n, id) => n + S.traitLevel(c, id), 0);
    return '<div class="sh-sec">Atributos <span>★ pesa mais na nota · verde = bônus</span></div>' + attrs(c) +
      '<div class="sh-sec">Características <span>' + (S.buildDone(c) ? 'build completo ' + U.emo('✅', 'xs') : c.traits.length + '/' + S.MAX_SLOTS + ' · nível ' + lv + '/' + S.MAX_SLOTS * S.MAX_LV) + '</span></div>' + slots(c);
  }

  // Combinações: ativas, a um passo e as outras; depois o que ainda dá para pegar
  function combosTab(c) {
    const fits = id => D.traitFits(D.TRAIT_BY_ID[id], c.pos), has = id => c.traits.includes(id);
    const full = c.traits.length >= S.MAX_SLOTS;
    const list = D.SYNERGIES.filter(s => fits(s.a) && fits(s.b)).map(s => {
      const st = has(s.a) && has(s.b) ? 'on' : full ? 'off' : has(s.a) || has(s.b) ? 'near' : 'far';
      const need = [s.a, s.b].filter(id => !has(id)).map(id => U.icoOf(D.TRAIT_BY_ID[id], 'xs') + ' ' + esc(D.TRAIT_BY_ID[id].name)).join(' + ');
      return { st, html: '<div class="sh-cb ' + st + '"><div><b>' + U.icoOf(s, 'xs') + ' ' + esc(s.name) + '</b><small>' + attrLine(s.attr, c.pos) + (s.extra ? ' · ' + esc(s.extra) : '') + '</small></div>' +
        '<span class="pill">' + (st === 'on' ? 'Ativa' : st === 'off' ? 'Sem espaço' : 'Falta ' + need) + '</span></div>' };
    });
    const order = { on: 0, near: 1, far: 2, off: 3 };
    const combos = list.sort((a, b) => order[a.st] - order[b.st]).map(x => x.html).join('') || '<p class="sh-hint">Nenhuma combinação para esta posição.</p>';
    const left = full ? [] : D.TRAITS.filter(t => D.traitFits(t, c.pos) && !c.traits.includes(t.id));
    return '<div class="sh-sec">Combinações <span>duas características juntas dão bônus</span></div>' + combos +
      (left.length ? '<div class="sh-sec">Ainda dá para pegar</div>' + left.map(t => '<div class="sh-tr"><span class="ic">' + U.icoOf(t, 'sm') + '</span><div><b>' + esc(t.name) + '</b><small>' + esc(t.fx ? t.fx(1) : '') + '</small></div></div>').join('') : '');
  }

  function careerTab(c) {
    const T = c.totals, gk = c.pos === 'GOL', def = gk || c.pos === 'ZAG';
    const nums = [[gk ? T.cs || 0 : T.goals, gk ? 'Sem sofrer gol' : 'Gols'], [gk ? T.penSaved || 0 : def ? T.cs || 0 : T.assists, gk ? 'Pênaltis def.' : def ? 'Sem sofrer gol' : 'Assistências'],
      [S.titleCount(T), 'Títulos'], [c.peak, 'Nota máxima']];
    const stat = s => (gk ? s.cleanSheets || 0 : s.goals + (def ? '' : '/' + s.assists));
    const rows = c.seasons.map((s, i) => '<tr><td>' + String(YEAR0 + i).slice(2) + '</td><td class="cl">' + crest(s.club, 'xs') + esc(club(s.club).name) + '</td><td>' + s.games + '</td><td>' + stat(s) + '</td>' +
      '<td>' + (s.games ? s.rating.toFixed(1).replace('.', ',') : '–') + '</td><td>' + (s.titles.length ? U.emo('🏆', 'xs') + (s.titles.length > 1 ? s.titles.length : '') : '') + (s.awards.some(a => a.id === 'ballon') ? trophy('ballon', 18) : '') + '</td></tr>').join('');
    const room = Object.entries(c.trophies || {});
    return '<div class="sh-nums">' + nums.map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('') + '</div>' +
      (c.seasons.length ? '<div class="sh-sec">Temporadas <span>' + c.seasons.length + ' · ' + T.games + ' jogos</span></div><table class="sh-seasons"><thead><tr><th>Ano</th><th>Clube</th><th>J</th><th>' + (gk ? 'SG' : def ? 'G' : 'G/A') + '</th><th>Nota</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<p class="sh-hint">A primeira temporada ainda não foi jogada.</p>') +
      (room.length ? '<div class="sh-sec">Troféus <button class="link-btn sh-sala" id="sh-sala">Ver na Sala de Troféus ›</button></div><div class="sh-room">' + room.map(([name, t]) => '<div>' + trophy(t.type, 34, name) + '<b>' + t.n + '×</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '');
  }

  const TABS = [['build', 'Build'], ['combos', 'Combinações'], ['career', 'Carreira']];
  function sheet(tab) {
    const c = G.c;
    if (!c || document.querySelector('.sheet-wrap')) return;
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    const draw = t => {
      w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="sh-head"><span class="ovr metal ' + U.tierCls(S.ovr(c)) + '">' + S.ovr(c) + '</span>' +
        '<div><b>' + esc(c.name) + '</b><span>' + POS[c.pos] + ' · ' + c.age + ' anos</span></div><button class="sh-x" aria-label="Fechar">✕</button></div>' +
        '<div class="sh-tabs">' + TABS.map(([id, l]) => '<button data-t="' + id + '" class="' + (t === id ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
        '<div class="sh-body">' + (t === 'combos' ? combosTab(c) : t === 'career' ? careerTab(c) : buildTab(c)) + '</div></div>';
      w.querySelector('.sh-x').onclick = close;
      w.querySelectorAll('[data-t]').forEach(b => b.onclick = () => draw(b.dataset.t));
      const sl = w.querySelector('#sh-sala'); if (sl) sl.onclick = () => { close(); U.trophyRoom('car'); };
    };
    const close = () => { w.classList.add('out'); setTimeout(() => w.remove(), 200); };
    w.onclick = e => { if (e.target === w) close(); };
    draw(tab || 'build');
    document.body.appendChild(w);
  }

  // Qualquer botão com data-sheet abre a ficha (ex.: "Ver ficha e combinações" na pré-temporada)
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-sheet]');
    if (b) { e.stopPropagation(); sheet(b.dataset.sheet || undefined); }
  }, true);

  Object.assign(U, { sheet });
})();
