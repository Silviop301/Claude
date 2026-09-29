// Interface — pré-temporada: características, mini carta e investimentos
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- pré-temporada: característica ----------
  const SUP = ['', '', '²', '³'];
  function traitsHtml() {
    const syn = S.synergies(G.c);
    const slots = [];
    for (let i = 0; i < S.MAX_SLOTS; i++) {
      const id = G.c.traits[i];
      if (id) slots.push('<span class="chip">' + D.TRAIT_BY_ID[id].icon + ' ' + D.TRAIT_BY_ID[id].name + (S.traitLevel(G.c, id) > 1 ? ' <b>Nv ' + S.traitLevel(G.c, id) + '</b>' : '') + '</span>');
    }
    const free = S.MAX_SLOTS - G.c.traits.length;
    if (free) slots.push('<span class="chip empty">' + free + (free > 1 ? ' espaços livres' : ' espaço livre') + '</span>');
    return '<div class="eyebrow small">Características ' + G.c.traits.length + '/' + S.MAX_SLOTS + ' <button class="link-btn" data-sheet="combos">Ver combinações ›</button></div><div class="chips">' + slots.join('') +
      syn.map(s => '<span class="chip syn">' + s.icon + ' ' + s.name + '</span>').join('') + '</div>';
  }

  // Texto de atributos: "+4 FIN · +1 DRI"
  const attrTxt = at => Object.keys(at).filter(k => at[k]).map(k => (at[k] > 0 ? '+' : '') + at[k] + ' ' + D.label(G.c.pos, k)).join(' · ');
  // Texto da opção: atributos que entram agora + o efeito no nível escolhido
  function traitTxt(t, lv) {
    const at = {};
    for (const k in t.attr) at[k] = Math.round(t.attr[k] * D.TRAIT_LV[lv]) - (lv > 1 ? Math.round(t.attr[k] * D.TRAIT_LV[lv - 1]) : 0);
    const a = attrTxt(at), fx = t.fx ? t.fx(D.TRAIT_LV[lv]) : '';
    return (a ? a + '<br>' : '') + '<span class="fx">' + (lv > 1 ? 'Nv ' + lv + ': ' : '') + esc(fx).replace('⚠️', '<b class="warn">⚠️</b>') + '</span>';
  }

  // Mini carta da pré-temporada: mostra os atributos atuais e, ao escolher, quanto cada um muda
  // Mesmas faixas de cor da carta final
  function setTier(o) {
    const el = $('mcard'), t = tierCls(o);
    if (el.dataset.t === t) return;
    el.dataset.t = t;
    const wear = U.wearOf(G.c);
    el.className = 'mcard metal ' + t + (wear ? ' worn' + wear : '');
    void el.offsetWidth; // reinicia a animação: mudou de cor, pulsa de novo
    el.classList.add('pop', 'tierup');
    $('mc-tier').textContent = TIER_NAME[t];
  }
  function miniCard() {
    const E = S.eff(G.c), t = tierCls(S.ovr(G.c));
    const wear = U.wearOf(G.c);
    return '<div class="mcard metal ' + t + (wear ? ' worn' + wear : '') + '" id="mcard" data-t="' + t + '"><span class="mc-tier" id="mc-tier">' + TIER_NAME[t] + '</span><div class="mc-ovr"><b id="mc-ovr">' + S.ovr(G.c) + '</b><span>' + G.c.pos + (G.c.number ? ' ' + G.c.number : '') + '</span><i id="mc-ovr-d"></i></div><div class="mc-grid">' +
      D.ATTRS.map(k => '<div class="mc-at" data-k="' + k + '"><b>' + E[k] + '</b><span>' + D.label(G.c.pos, k) + '</span><i></i></div>').join('') + '</div></div>';
  }
  function showPreview(p) {
    const E = S.eff(G.c), o = S.ovr(G.c);
    D.ATTRS.forEach(k => {
      const el = screen.querySelector('.mc-at[data-k="' + k + '"]'), d = p ? p.attrs[k] - E[k] : 0;
      el.classList.toggle('up', d > 0); el.classList.toggle('down', d < 0);
      el.querySelector('i').textContent = d ? (d > 0 ? '+' : '') + d : '';
    });
    const d = p ? p.ovr - o : 0, od = $('mc-ovr-d');
    od.textContent = d ? (d > 0 ? '+' : '') + d : '';
    od.className = d > 0 ? 'up' : d < 0 ? 'down' : '';
  }
  // Números subindo até o valor novo; depois segue
  function applyAnim(from, then) {
    const E = S.eff(G.c), o1 = S.ovr(G.c), t0 = performance.now(), dur = 900;
    screen.querySelectorAll('.choice, .btn').forEach(b => { b.disabled = true; });
    const mc = $('mcard');
    mc.classList.add('pop');
    const tick = now => {
      if (!mc.isConnected) return; // já saiu da tela
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      D.ATTRS.forEach(a => { screen.querySelector('.mc-at[data-k="' + a + '"] b').textContent = Math.round(from.attrs[a] + (E[a] - from.attrs[a]) * e); });
      const ov = Math.round(from.ovr + (o1 - from.ovr) * e);
      $('mc-ovr').textContent = ov;
      setTier(ov);
      if (k < 1) requestAnimationFrame(tick); else setTimeout(then, 650);
    };
    requestAnimationFrame(tick);
  }
  function tweenCard(from, dur) {
    const E = S.eff(G.c), o1 = S.ovr(G.c), t0 = performance.now();
    const mc = $('mcard'); mc.classList.remove('pop'); void mc.offsetWidth; mc.classList.add('pop');
    D.ATTRS.forEach(a => {
      const el = screen.querySelector('.mc-at[data-k="' + a + '"]');
      el.classList.toggle('up', E[a] > from.attrs[a]);
      el.querySelector('i').textContent = E[a] > from.attrs[a] ? '+' + (E[a] - from.attrs[a]) : '';
    });
    const tick = now => {
      if (!mc.isConnected) return; // já saiu da tela
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      D.ATTRS.forEach(a => { screen.querySelector('.mc-at[data-k="' + a + '"] b').textContent = Math.round(from.attrs[a] + (E[a] - from.attrs[a]) * e); });
      const ov = Math.round(from.ovr + (o1 - from.ovr) * e);
      $('mc-ovr').textContent = ov;
      setTier(ov);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // Escolha em duas etapas: toca para ver na carta, confirma para aplicar
  function pickable(sel, previewOf, apply) {
    let cur = null;
    const ok = $('b-ok');
    screen.querySelectorAll(sel).forEach(b => b.onclick = () => {
      screen.querySelectorAll(sel).forEach(x => x.classList.toggle('sel', x === b));
      cur = b;
      showPreview(previewOf(b));
      ok.disabled = false;
      ok.textContent = b.dataset.ok || 'Confirmar ' + b.dataset.name;
    });
    ok.onclick = () => {
      if (!cur) return;
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
      const next = apply(cur);
      if (next.go) return next.go(); // sem mudança na carta ainda (ex.: ir escolher o que sai)
      showPreview(null);
      bar();
      applyAnim(from, next);
    };
  }

  // Esta temporada termina em ano de Copa? Mostra a nota que a seleção pede
  function wcHint() {
    if ((S.YEAR0 + G.c.season + 1) % 4 !== 2 || G.c.age + 1 < 18) return '';
    const n = D.NATION_BY_NAME[G.c.country], cut = S.wcCut(n, G.c), o = S.ovr(G.c);
    return '<p class="wc-hint">' + n.flag + ' Ano de Copa: a seleção convoca com nota <b>' + cut + '</b>' + (o >= cut ? ' · você já está dentro' : ' · faltam ' + (cut - o)) + '</p>';
  }

  // ---------- pré-temporada: característica e investimentos numa tela só ----------
  // Tocar numa opção (característica ou investimento) vira o card e mostra na carta quanto muda;
  // tocar de novo confirma. "Seguir para a temporada" fica sempre fixo embaixo.
  let preCh = null;
  function preseason() { prep(false); }
  function invest() { prep(true); } // retomar depois de já ter escolhido a característica

  function prep(traitDone, justAdded) {
    if (!preCh || preCh.age !== G.c.age) preCh = { age: G.c.age, list: S.traitChoices(G.c), done: false };
    if (traitDone) preCh.done = true;
    const ch = preCh.done ? [] : preCh.list;
    const canBuy = () => D.INVEST.some(t => S.canInvest(G.c, t.id));
    if (!ch.length && !canBuy() && !justAdded) { preCh = null; return U.eventOrSeason(); }
    G.step = preCh.done ? 'invest' : 'preseason';
    save();
    bar();
    const label = { new: 'NOVA', up: 'EVOLUIR' };
    const done = S.buildDone(G.c);
    const hasInv = G.c.money >= S.investPrice(G.c);
    render(
      '<div class="eyebrow">Pré-temporada · ' + year() + (G.c.farewell ? ' · temporada de despedida' : '') + '</div>' +
      '<h2>Prepare a temporada</h2>' + wcHint() + miniCard() +
      (justAdded ? '<div class="prep-done">' + justAdded + '</div>' : '') +
      (done && !justAdded ? '<div class="prep-sec">Características</div>' + traitsHtml() + '<p class="muted small">✅ Build completo: todas no nível máximo.</p>' : '') +
      (ch.length ? '<div class="prep-sec">' + (G.c.traits.length >= S.MAX_SLOTS ? 'Evolua uma característica' : 'Escolha uma característica') + '</div>' +
        '<p class="muted small prep-note">' + (() => { const [a, b] = S.mainAttrs(G.c.pos); return 'Cada nível de qualquer característica também soma +1 ' + D.label(G.c.pos, a) + ' (e +1 ' + D.label(G.c.pos, b) + ' a cada 2).'; })() +
          (G.c.traits.length < S.MAX_SLOTS ? ' Não dá para trocar depois: o que entra fica a carreira toda.' : '') + '</p>' + traitsHtml() +
        '<div class="choices">' + ch.map((x, i) =>
          '<button class="choice' + (x.completes ? ' combo' : '') + '" data-i="' + i + '"><span class="ic">' + x.trait.icon + '</span>' +
          '<b>' + x.trait.name + (x.type === 'up' ? ' → Nv ' + x.lv : '') + ' <span class="tag ' + (x.type === 'up' ? 'green' : 'blue') + '">' + label[x.type] + '</span></b>' +
          '<span class="d">' + traitTxt(x.trait, x.lv) +
          (x.completes ? '<br><span class="tag gold">Completa ' + x.completes.icon + ' ' + x.completes.name + ': ' + attrTxt(x.completes.attr) + '</span>' : '') + '</span></button>').join('') + '</div>' : '') +
      (hasInv ? '<div class="prep-sec">Investimentos</div>' +
        '<div class="wallet"><span>Saldo <b id="w-money"></b></span><span>Cada compra <b id="w-price"></b></span></div>' +
        '<div class="choices inv-grid">' + D.INVEST.map(t => '<button class="choice inv" data-v="' + t.id + '"><span class="ic">' + t.icon + '</span>' +
          '<b>' + D.investName(t, G.c.pos) + '</b><span class="pips"></span><span class="d">' + (t.attr ? attrTxt(t.attr) : t.perk) + '</span><span class="price"></span></button>').join('') + '</div>' : '') +
      '<div class="inv-bar"><button class="btn" id="b-skip">Seguir para a temporada</button></div>'
    );
    // Toque 1: o card vira e a mini carta mostra quanto muda. Toque 2 no mesmo card: confirma.
    const skip = $('b-skip');
    const go = () => { preCh = null; U.eventOrSeason(); };
    // "Seguir" só libera quando não há mais escolha a fazer nem compra possível
    const lockSkip = () => {
      const trait = ch.length && !preCh.done, buy = D.INVEST.some(t => S.canInvest(G.c, t.id));
      skip.disabled = !!(trait || buy);
      skip.innerHTML = trait ? 'Escolha uma característica<small>para seguir para a temporada</small>'
        : buy ? 'Ainda dá para investir<small>Saldo R$ ' + money(G.c.money) + '</small>' : 'Seguir para a temporada';
    };
    const refresh = () => {
      if (!skip.isConnected) return; // já saiu da tela
      lockSkip();
      if (!hasInv) return;
      const price = S.investPrice(G.c);
      $('w-money').textContent = 'R$ ' + money(G.c.money);
      $('w-price').textContent = 'R$ ' + money(price);
      screen.querySelectorAll('[data-v]').forEach(b => {
        const id = b.dataset.v, n = G.c.inv[id] || 0, max = S.investMax(id), full = n >= max;
        b.disabled = !S.canInvest(G.c, id);
        b.querySelector('.pips').textContent = '●'.repeat(n) + '○'.repeat(max - n);
        b.querySelector('.price').textContent = full ? 'No máximo' : G.c.money < price ? 'Falta R$ ' + money(price - G.c.money) : 'R$ ' + money(price);
        b.classList.toggle('full', full);
      });
    };
    skip.onclick = () => { if (!skip.disabled) go(); };
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const x = ch[+b.dataset.i];
      showPreview(S.preview(G.c, x.type === 'up' ? { up: x.trait.id } : { add: x.trait.id }));
      if (!U.arm(b, '<b>Toque de novo para ' + (x.type === 'up' ? 'evoluir' : 'escolher') + '</b>')) return;
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
      sfx('levelup');
      let done;
      if (x.type === 'up') { S.upgradeTrait(G.c, x.trait.id); done = '✓ ' + x.trait.icon + ' ' + x.trait.name + ' evoluiu para o Nv ' + x.lv; }
      else { const syn = S.addTrait(G.c, x.trait.id); done = '✓ ' + x.trait.icon + ' ' + x.trait.name + ' entrou' + (syn ? '<br><b>' + syn.icon + ' Combinação desbloqueada: ' + syn.name + '</b> · ' + attrTxt(syn.attr) + (syn.extra ? ' · ' + syn.extra : '') : ''); }
      if (S.buildDone(G.c)) done += '<br><b>🏁 Build completo!</b> Suas 5 características estão no nível máximo.';
      preCh.done = true;
      showPreview(null);
      bar();
      applyAnim(from, () => prep(true, done));
    });
    screen.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const id = b.dataset.v;
      if (!S.canInvest(G.c, id)) return;
      showPreview(S.preview(G.c, { buy: id }));
      if (!U.arm(b, '<b>Toque de novo para comprar</b>')) return;
      U.disarm(b);
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
      S.invest(G.c, id);
      save();
      sfx('coin');
      bar();
      showPreview(null);
      tweenCard(from, 450);
      b.classList.remove('bought'); void b.offsetWidth; b.classList.add('bought');
      setTimeout(refresh, 480);
    });
    refresh();
  }

  Object.assign(U, { traitsHtml, attrTxt, traitTxt, setTier, miniCard, showPreview, applyAnim, tweenCard, pickable, wcHint, preseason, invest });
})();
