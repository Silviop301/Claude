// Interface — ficha do jogador (abre a qualquer momento tocando na nota do topo):
// aba Build (atributos e de onde vêm, espaços de característica, combinações e catálogo para planejar)
// e aba Carreira (temporada a temporada e sala de troféus).
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, esc, crest, club, trophy, YEAR0 } = U;
  const DOTS = lv => '●'.repeat(lv) + '○'.repeat(S.MAX_LV - lv);
  const attrLine = (at, pos, k = 1) => Object.keys(at).filter(x => at[x]).map(x => '+' + Math.round(at[x] * k) + ' ' + D.label(pos, x)).join(' · ');

  // Atributos: base (treino/idade) + características (e combinações) + investimentos = total
  function attrsTable(c) {
    const E = S.eff(c), B = S.bonusOf(c.traits, c.traitLv || {}, c.pos), w = D.POS[c.pos].w;
    const main = S.mainAttrs(c.pos);
    const inv = {};
    D.ATTRS.forEach(k => { inv[k] = 0; });
    D.INVEST.forEach(t => { if (t.attr && c.inv[t.id]) for (const k in t.attr) inv[k] += t.attr[k] * c.inv[t.id]; });
    const rows = D.ATTRS.slice().sort((a, b) => w[b] - w[a]).map(k => '<tr' + (main.includes(k) ? ' class="main"' : '') + '><th>' + D.label(c.pos, k) +
      (w[k] >= 0.2 ? ' <i title="peso alto na nota">★</i>' : '') + '</th><td>' + Math.round(c.attrs[k]) + '</td><td>' + (B[k] ? '+' + B[k] : '–') + '</td><td>' + (inv[k] ? '+' + inv[k] : '–') + '</td><td><b>' + E[k] + '</b></td></tr>').join('');
    return '<table class="sh-attrs"><thead><tr><th></th><th>Base</th><th>Caract.</th><th>Invest.</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sh-hint">★ = pesa mais na nota de ' + ({ ATA: 'atacante', MEI: 'meia', ZAG: 'zagueiro', GOL: 'goleiro' }[c.pos]) + '. Base sobe com minutos, desempenho e idade; características e investimentos somam por cima.</p>';
  }

  function slots(c) {
    const out = [];
    for (let i = 0; i < S.MAX_SLOTS; i++) {
      const id = c.traits[i];
      if (!id) { out.push('<div class="sh-slot empty"><b>Espaço livre</b><span>Na pré-temporada você escolhe uma característica nova ou evolui uma que já tem.</span></div>'); continue; }
      const t = D.TRAIT_BY_ID[id], lv = S.traitLevel(c, id), m = D.TRAIT_LV[lv];
      const nxt = lv < S.MAX_LV ? 'Nv ' + (lv + 1) + ': ' + (t.fx ? t.fx(D.TRAIT_LV[lv + 1]) : '') : 'Nível máximo';
      out.push('<div class="sh-slot"><b>' + t.icon + ' ' + esc(t.name) + ' <em>' + DOTS(lv) + '</em></b>' +
        '<span>' + esc(t.fx ? t.fx(m) : '') + (Object.keys(t.attr).length ? ' · ' + attrLine(t.attr, c.pos, m) : '') + '</span>' +
        '<small>' + esc(nxt) + '</small></div>');
    }
    return out.join('');
  }

  // Combinações: ativas, a um passo (você tem uma das duas) e as demais da posição
  function combos(c) {
    const fits = id => D.traitFits(D.TRAIT_BY_ID[id], c.pos);
    const has = id => c.traits.includes(id);
    const full = c.traits.length >= S.MAX_SLOTS;
    const rows = D.SYNERGIES.filter(s => fits(s.a) && fits(s.b)).map(s => {
      const A = D.TRAIT_BY_ID[s.a], Bt = D.TRAIT_BY_ID[s.b];
      const st = has(s.a) && has(s.b) ? 'on' : has(s.a) || has(s.b) ? (full ? 'off' : 'near') : full ? 'off' : 'far';
      const miss = has(s.a) ? Bt : A;
      const note = st === 'on' ? 'Ativa' : st === 'near' ? 'Falta ' + miss.icon + ' ' + miss.name : st === 'off' ? 'Sem espaço livre' : A.icon + ' ' + A.name + ' + ' + Bt.icon + ' ' + Bt.name;
      return { st, html: '<div class="sh-combo ' + st + '"><b>' + s.icon + ' ' + esc(s.name) + '</b><span>' + attrLine(s.attr, c.pos) + (s.extra ? ' · ' + esc(s.extra) : '') + '</span><small>' + esc(note) + '</small></div>' };
    });
    const order = { on: 0, near: 1, far: 2, off: 3 };
    return rows.sort((a, b) => order[a.st] - order[b.st]).map(r => r.html).join('') || '<p class="sh-hint">Nenhuma combinação para esta posição.</p>';
  }

  // Catálogo: tudo que ainda dá para pegar (nível 1 → nível máximo)
  function catalog(c) {
    if (c.traits.length >= S.MAX_SLOTS) return '<p class="sh-hint">Os 5 espaços estão ocupados: agora só dá para evoluir o que você já tem.</p>';
    return D.TRAITS.filter(t => D.traitFits(t, c.pos) && !c.traits.includes(t.id)).map(t =>
      '<div class="sh-cat"><b>' + t.icon + ' ' + esc(t.name) + '</b><span>' + esc(t.fx ? t.fx(1) : '') + (Object.keys(t.attr).length ? ' · ' + attrLine(t.attr, c.pos) : '') + '</span>' +
      (t.fx && /\d/.test(t.fx(1)) ? '<small>Nv ' + S.MAX_LV + ': ' + esc(t.fx(D.TRAIT_LV[S.MAX_LV])) + '</small>' : '') + '</div>').join('');
  }

  function buildTab(c) {
    const lv = c.traits.reduce((n, id) => n + S.traitLevel(c, id), 0), maxLv = S.MAX_SLOTS * S.MAX_LV;
    const invN = Object.values(c.inv || {}).reduce((a, b) => a + b, 0);
    return '<div class="sh-sec">Atributos</div>' + attrsTable(c) +
      '<div class="sh-sec">Características · ' + c.traits.length + '/' + S.MAX_SLOTS + ' espaços · ' + lv + '/' + maxLv + ' níveis' + (S.buildDone(c) ? ' · build completo ✅' : '') + '</div>' +
      '<p class="sh-hint">Cada nível de característica também soma +1 em ' + S.mainAttrs(c.pos).map(k => D.label(c.pos, k)).join(' (e +½ em ') + '). O que entra fica até o fim da carreira.</p>' +
      slots(c) + '<div class="sh-sec">Combinações</div>' + combos(c) +
      '<details class="sh-more"><summary>Características que você ainda pode pegar</summary>' + catalog(c) + '</details>' +
      (invN ? '<div class="sh-sec">Investimentos · ' + invN + '</div><p class="sh-hint">' + D.INVEST.filter(t => c.inv[t.id]).map(t => t.icon + ' ' + t.name + ' ×' + c.inv[t.id]).join(' · ') + '</p>' : '');
  }

  function careerTab(c) {
    const T = c.totals, def = c.pos === 'GOL' || c.pos === 'ZAG';
    const nums = [[c.seasons.length, 'Temporadas'], [T.games, 'Jogos'], c.pos === 'GOL' ? [T.cs || 0, 'Sem sofrer'] : [T.goals, 'Gols'], c.pos === 'GOL' ? [T.penSaved || 0, 'Pên. def.'] : def ? [T.cs || 0, 'Sem sofrer'] : [T.assists, 'Assist.'],
      [S.titleCount(T), 'Títulos'], [T.ballon, 'Bolas de Ouro'], [c.peak, 'Nota máx.']];
    const rows = c.seasons.map((s, i) => '<tr><td>' + String(YEAR0 + i).slice(2) + '</td><td>' + s.age + '</td><td class="cl">' + crest(s.club, 'xs') + esc(club(s.club).name) + '</td><td>' + s.games + '</td>' +
      (c.pos === 'GOL' ? '<td>' + (s.cleanSheets || 0) + '</td>' : '<td>' + s.goals + '</td><td>' + (def ? s.cleanSheets || 0 : s.assists) + '</td>') +
      '<td>' + (s.games ? s.rating.toFixed(1).replace('.', ',') : '–') + '</td><td>' + s.ovr1 + '</td><td>' + (s.titles.length ? '🏆'.repeat(Math.min(3, s.titles.length)) : '') + (s.awards.some(a => a.id === 'ballon') ? '🌟' : '') + '</td></tr>').join('');
    const room = Object.entries(c.trophies || {});
    return '<div class="sh-nums">' + nums.map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('') + '</div>' +
      (c.seasons.length ? '<div class="sh-sec">Temporada a temporada</div><div class="sh-scroll"><table class="sh-seasons"><thead><tr><th>Ano</th><th>Id.</th><th>Clube</th><th>J</th>' +
        (c.pos === 'GOL' ? '<th>SG</th>' : '<th>G</th><th>' + (def ? 'SG' : 'A') + '</th>') + '<th>Nota</th><th>Geral</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="sh-hint">A primeira temporada ainda não foi jogada.</p>') +
      (room.length ? '<div class="sh-sec">Sala de troféus</div><div class="room">' + room.map(([name, t]) => '<div>' + trophy(t.type, 44, name) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '');
  }

  function sheet(tab) {
    const c = G.c;
    if (!c || document.querySelector('.sheet-wrap')) return;
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    const draw = t => {
      w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="sh-head"><div><b>' + esc(c.name) + '</b><span>' + ({ ATA: 'Atacante', MEI: 'Meia', ZAG: 'Zagueiro', GOL: 'Goleiro' }[c.pos]) + ' · ' + c.age + ' anos · potencial ' + (c.pot >= S.ovr(c) + 6 ? 'alto' : c.pot > S.ovr(c) + 2 ? 'médio' : 'quase atingido') + '</span></div>' +
        '<span class="ovr metal ' + U.tierCls(S.ovr(c)) + '">' + S.ovr(c) + '</span><button class="sh-x" aria-label="Fechar">✕</button></div>' +
        '<div class="sh-tabs"><button data-t="build" class="' + (t === 'build' ? 'on' : '') + '">Build</button><button data-t="career" class="' + (t === 'career' ? 'on' : '') + '">Carreira</button></div>' +
        '<div class="sh-body">' + (t === 'build' ? buildTab(c) : careerTab(c)) + '</div></div>';
      w.querySelector('.sh-x').onclick = close;
      w.querySelectorAll('[data-t]').forEach(b => b.onclick = () => draw(b.dataset.t));
    };
    const close = () => { w.classList.add('out'); setTimeout(() => w.remove(), 200); };
    w.onclick = e => { if (e.target === w) close(); };
    draw(tab || 'build');
    document.body.appendChild(w);
  }

  // Qualquer botão com data-sheet abre a ficha (ex.: "Ver ficha e combinações" na pré-temporada)
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-sheet]')) { e.stopPropagation(); sheet(); } }, true);

  Object.assign(U, { sheet });
})();
