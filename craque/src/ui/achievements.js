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

  function achTile(a, have, isNew) {
    const h = have[a.id];
    return '<div class="ach' + (h ? ' on' : '') + (isNew ? ' new' : '') + '"><span class="ic">' + U.icoOf(a, 'md') + (h ? '' : U.emo('🔒', 'xs')) + '</span>' +
      '<b>' + esc(a.name) + '</b><span class="d">' + esc(a.desc) + '</span>' +
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
    render('<div class="eyebrow">Conquistas</div><h2>' + n + ' de ' + S.ACHIEVEMENTS.length + '</h2>' +
      '<div class="ach-bar"><i style="width:' + Math.round(n / S.ACHIEVEMENTS.length * 100) + '%"></i></div>' +
      '<div class="ach-grid">' + S.ACHIEVEMENTS.slice().sort((a, b) => !!have[b.id] - !!have[a.id]).map(a => achTile(a, have, false)).join('') + '</div>' +
      '<button class="btn ghost" id="b-back">Voltar</button>');
    $('b-back').onclick = U.home;
  }

  Object.assign(U, { achRecord, achBlock, achievements, achCount: count });
})();
