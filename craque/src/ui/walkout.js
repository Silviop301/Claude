// Interface — revelação da carta nova quando a nota muda de faixa (bronze → prata → ouro → ícone)
// Em sequência: bandeira, posição, escudo do clube e, por fim, a carta girando com a faixa nova.
(function () {
  const U = window.CRAQUE_UI;
  const { D, S, sfx, esc, tierCls, TIER_NAME } = U;
  const ORDER = ['bronze', 'prata', 'ouro', 'icone'];
  const tierUp = (o0, o1) => ORDER.indexOf(tierCls(o1)) > ORDER.indexOf(tierCls(o0));

  function walkout(c, onClose) {
    const o = S.ovr(c), t = tierCls(o), cty = D.COUNTRIES.find(x => x.id === c.country) || { flag: '' };
    const cl = D.CLUB_BY_ID[c.club];
    const wrap = document.createElement('div');
    wrap.className = 'walkout wo-' + t;
    wrap.innerHTML = '<div class="wo-beams"></div>' +
      '<div class="wo-step wo-flag">' + cty.flag + '</div>' +
      '<div class="wo-step wo-pos">' + esc(D.POS[c.pos].name) + '</div>' +
      '<div class="wo-step wo-crest"><img src="badges/' + cl.id + '.png" alt=""></div>' +
      '<div class="wo-card"><canvas aria-label="Carta nova"></canvas></div>' +
      '<div class="wo-title"><span>Nova carta</span><b>' + TIER_NAME[t] + '</b></div>' +
      '<div class="wo-tap">Toque para continuar</div>';
    document.body.appendChild(wrap);
    window.CRAQUE_CARD(wrap.querySelector('canvas'), {
      name: c.name, number: c.number, pos: c.pos, peak: o, attrs: S.eff(c), flag: cty.flag, crest: 'badges/' + cl.id + '.png',
      traits: c.traits.map(id => ({ icon: D.TRAIT_BY_ID[id].icon, lv: S.traitLevel(c, id) })), footer: cl.name.toUpperCase() + ' · ' + c.age + ' ANOS', verdict: '',
    });
    sfx('levelup');
    const timers = [setTimeout(() => sfx('coin'), 900), setTimeout(() => sfx('coin'), 1700), setTimeout(() => { sfx('fanfare'); wrap.classList.add('shown'); }, 2600)];
    const close = () => {
      if (!wrap.classList.contains('shown')) { timers.forEach(clearTimeout); wrap.classList.add('skip', 'shown'); sfx('fanfare'); return; }
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); onClose && onClose(); }, 250);
    };
    setTimeout(() => { wrap.onclick = close; }, 300);
  }

  // Desgaste da carta no fim da carreira: 0 (nova), 1 (marcas de uso) ou 2 (bem gasta)
  const wearOf = c => (c.age >= 35 ? 2 : c.age >= 32 ? 1 : 0);

  Object.assign(U, { tierUp, walkout, wearOf });
})();
