// Interface — conquistas: guardadas no aparelho, tela com todas e destaque no fim da carreira
(function () {
  const U = window.CRAQUE_UI;
  const { S, esc, load, store, render, $, sfx } = U;
  const KEY = 'craque-ach-v1'; // { id: { name: jogador que conquistou, year } }

  const got = () => load(KEY) || {};

  // Registra as conquistas de uma carreira encerrada; devolve { ids, fresh }
  function achRecord(c, f) {
    const ids = S.achievementsOf(c, f), have = got(), fresh = [];
    ids.forEach(id => { if (!have[id]) { have[id] = { name: c.name, year: S.YEAR0 + c.season }; fresh.push(id); } });
    store(KEY, have);
    return { ids, fresh };
  }

  const count = () => Object.keys(got()).filter(id => S.ACHIEVEMENTS.some(a => a.id === id)).length;

  // Melhor marca entre as carreiras guardadas (HALL) para uma conquista de número: { v, of }
  function progOf(a) {
    if (!a.prog) return null;
    const v = (load(U.HALL) || []).filter(h => !a.prog.pos || a.prog.pos.includes(h.pos)).reduce((m, h) => Math.max(m, h[a.prog.k] || 0), 0);
    return v > 0 ? { v: Math.min(v, a.prog.of), of: a.prog.of } : null;
  }

  function achTile(a, have, isNew) {
    const h = have[a.id], pr = !h && progOf(a);
    return '<div class="ach' + (h ? ' on' : '') + (isNew ? ' new' : '') + '"><span class="ic">' + U.icoOf(a, 'md') + (h ? '' : U.emo('🔒', 'xs')) + '</span>' +
      '<b>' + esc(a.name) + '</b><span class="d">' + esc(a.desc) + '</span>' +
      (pr ? '<span class="ach-prog"><i style="width:' + Math.round(pr.v / pr.of * 100) + '%"></i><em>' + pr.v + '/' + pr.of + '</em></span>' : '') +
      (h ? '<span class="by">' + (isNew ? 'NOVA · ' : '') + esc(h.name) + ' · ' + h.year + '</span>' : '') + '</div>';
  }

  // Bloco do fim de carreira
  function achBlock(res) {
    if (!res.ids.length) return '';
    const have = got();
    if (res.fresh.length) setTimeout(() => sfx('levelup'), 900);
    return '<div class="room-title">Conquistas desta carreira' + (res.fresh.length ? ' · ' + res.fresh.length + (res.fresh.length > 1 ? ' novas' : ' nova') : '') + '</div>' +
      '<div class="ach-grid">' + S.ACHIEVEMENTS.filter(a => res.ids.includes(a.id)).sort((a, b) => res.fresh.includes(b.id) - res.fresh.includes(a.id))
        .map(a => achTile(a, have, res.fresh.includes(a.id))).join('') + '</div>';
  }

  // Tela com todas as conquistas
  function achievements() {
    const have = got(), n = count();
    // "Quase lá": as ainda trancadas com recorde a 60% ou mais do alvo, da mais perto para a mais longe
    const near = S.ACHIEVEMENTS.filter(a => !have[a.id]).map(a => ({ a, p: progOf(a) })).filter(x => x.p && x.p.v / x.p.of >= 0.6)
      .sort((x, y) => y.p.v / y.p.of - x.p.v / x.p.of).map(x => x.a);
    const rest = S.ACHIEVEMENTS.filter(a => !near.includes(a)).sort((a, b) => !!have[b.id] - !!have[a.id]);
    render('<button class="back-link" id="b-back">‹ Voltar</button>' +
      '<div class="eyebrow">Conquistas</div><h2>' + n + ' de ' + S.ACHIEVEMENTS.length + '</h2>' +
      '<div class="ach-bar"><i style="width:' + Math.round(n / S.ACHIEVEMENTS.length * 100) + '%"></i></div>' +
      (near.length ? '<div class="room-title ach-near-t">Quase lá</div><div class="ach-grid ach-near">' + near.map(a => achTile(a, have, false)).join('') + '</div>' +
        '<div class="room-title">Todas</div>' : '') +
      '<div class="ach-grid">' + rest.map(a => achTile(a, have, false)).join('') + '</div>');
    $('b-back').onclick = U.goBack;
  }

  Object.assign(U, { achRecord, achBlock, achievements, achCount: count, achHas: id => !id || !!got()[id] });
})();
