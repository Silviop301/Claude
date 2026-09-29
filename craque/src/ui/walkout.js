// Interface — revelação de carta: nova faixa (bronze → prata → ouro → ícone) ou carta especial
// Em sequência: bandeira, posição, escudo do clube e, por fim, a carta girando.
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, sfx, esc, tierCls, TIER_NAME } = U;
  const ORDER = ['bronze', 'prata', 'ouro', 'icone'];
  const tierUp = (o0, o1) => ORDER.indexOf(tierCls(o1)) > ORDER.indexOf(tierCls(o0));
  // Revelação só na primeira vez que chega a Ouro e a Ícone (Prata e repetições não contam)
  function tierReveal(c, o0, o1) {
    const t = ORDER.indexOf(tierCls(o1));
    if (!tierUp(o0, o1) || t < 2 || t <= (c.tierShown || 1)) return false;
    c.tierShown = t;
    return true;
  }

  // Cartas especiais (a da Copa usa as cores da seleção do jogador)
  const SPECIAL = { tots: 'Seleção da Temporada', heroi: 'Herói da Final', copa: 'Copa do Mundo', bola: 'Bola de Ouro' };

  // Dados da carta (para o canvas) a partir da carreira e, se houver, de uma "foto" guardada (carta especial ou temporada)
  function cardData(c, shot) {
    const cty = D.COUNTRIES.find(x => x.id === c.country) || { flag: '' };
    const clubId = shot ? shot.club : c.club;
    const d = {
      name: c.name, number: c.number, pos: c.pos, peak: shot ? shot.ovr : S.ovr(c), attrs: shot ? shot.attrs : S.eff(c), flag: cty.flag,
      crest: 'badges/' + clubId + '.png', verdict: '',
      traits: c.traits.map(id => ({ icon: D.TRAIT_BY_ID[id].icon, lv: S.traitLevel(c, id) })),
      footer: shot && shot.txt ? shot.txt : D.CLUB_BY_ID[clubId].name.toUpperCase() + ' · ' + (shot ? shot.age : c.age) + ' ANOS',
    };
    if (shot && shot.type) {
      d.special = shot.type;
      if (shot.type === 'copa') { d.kit = U.nationKit(c.country); d.crest = null; }
    }
    return d;
  }

  function walkout(c, onClose, card) {
    const d = cardData(c, card);
    d.fresh = !card;
    const t = card ? 'sp-' + card.type : tierCls(d.peak);
    const cty = D.COUNTRIES.find(x => x.id === c.country) || { flag: '' };
    const wrap = document.createElement('div');
    wrap.className = 'walkout wo-' + t;
    wrap.innerHTML = '<div class="wo-beams"></div>' +
      '<div class="wo-step wo-flag">' + cty.flag + '</div>' +
      '<div class="wo-step wo-pos">' + esc(card ? SPECIAL[card.type] : D.POS[c.pos].name) + '</div>' +
      '<div class="wo-step wo-crest"><img src="' + (d.crest || 'icons/icon-192.png') + '" alt=""></div>' +
      '<div class="wo-card"><canvas aria-label="Carta nova"></canvas></div>' +
      '<div class="wo-title"><span>' + (card ? 'Carta especial' : 'Nova carta') + '</span><b>' + (card ? SPECIAL[card.type] : TIER_NAME[t]) + '</b></div>' +
      '<div class="wo-tap">Toque para continuar</div>';
    if (!d.crest) wrap.querySelector('.wo-crest').innerHTML = '<span class="wo-bigflag">' + cty.flag + '</span>';
    document.body.appendChild(wrap);
    window.CRAQUE_CARD(wrap.querySelector('canvas'), d);
    sfx('levelup');
    const timers = [setTimeout(() => sfx('coin'), 900), setTimeout(() => sfx('coin'), 1700), setTimeout(() => { sfx('fanfare'); wrap.classList.add('shown'); }, 2600)];
    const close = () => {
      if (!wrap.classList.contains('shown')) { timers.forEach(clearTimeout); wrap.classList.add('skip', 'shown'); sfx('fanfare'); return; }
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); onClose && onClose(); }, 250);
    };
    setTimeout(() => { wrap.onclick = close; }, 300);
  }

  // Várias revelações em fila (subiu de faixa + cartas especiais da temporada)
  function walkouts(c, list, onClose) {
    const next = i => (i >= list.length ? onClose && onClose() : walkout(c, () => next(i + 1), list[i]));
    next(0);
  }

  // Desgaste da carta no fim da carreira: 0 (nova), 1 (marcas de uso) ou 2 (bem gasta)
  const wearOf = c => (c.age >= 35 ? 2 : c.age >= 32 ? 1 : 0);

  Object.assign(U, { tierUp, tierReveal, walkout, walkouts, cardData, wearOf, SPECIAL_NAME: SPECIAL });
})();
