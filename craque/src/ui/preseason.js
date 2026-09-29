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
    return '<div class="eyebrow small">Características ' + G.c.traits.length + '/' + S.MAX_SLOTS + '</div><div class="chips">' + slots.join('') +
      syn.map(s => '<span class="chip syn">' + s.icon + ' ' + s.name + '</span>').join('') + '</div>';
  }

  // Texto de atributos: "+4 FIN · +1 DRI"
  const attrTxt = at => Object.keys(at).filter(k => at[k]).map(k => (at[k] > 0 ? '+' : '') + at[k] + ' ' + D.label(G.c.pos, k)).join(' · ');
  function traitTxt(t, lv) {
    const at = {};
    for (const k in t.attr) at[k] = Math.round(t.attr[k] * D.TRAIT_LV[lv]) - (lv > 1 ? Math.round(t.attr[k] * D.TRAIT_LV[lv - 1]) : 0);
    return attrTxt(at) + (t.perk ? ' · ' + t.perk : '');
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
    const n = D.NATION_BY_NAME[G.c.country], cut = S.wcCut(n), o = S.ovr(G.c);
    return '<p class="wc-hint">' + n.flag + ' Ano de Copa: a seleção convoca com nota <b>' + cut + '</b>' + (o >= cut ? ' · você já está dentro' : ' · faltam ' + (cut - o)) + '</p>';
  }

  // ---------- pré-temporada: característica e investimentos numa tela só ----------
  // Tocar numa opção (característica ou investimento) mostra na carta quanto muda; o botão fixo
  // embaixo aparece só depois disso e confirma. Sem nada para fazer, ele vira "Seguir".
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
    const label = { new: 'NOVA', up: 'EVOLUIR', swap: 'TROCAR' };
    const hasInv = G.c.money >= S.investPrice(G.c);
    render(
      '<div class="eyebrow">Pré-temporada · ' + year() + (G.c.farewell ? ' · temporada de despedida' : '') + '</div>' +
      '<h2>Prepare a temporada</h2>' + wcHint() + miniCard() +
      (justAdded ? '<div class="prep-done">' + justAdded + '</div>' : '') +
      (ch.length ? '<div class="prep-sec">' + (G.c.traits.length >= S.MAX_SLOTS ? 'Evolua ou troque uma característica' : 'Escolha uma característica') + '</div>' + traitsHtml() +
        '<div class="choices">' + ch.map((x, i) =>
          '<button class="choice' + (x.completes ? ' combo' : '') + '" data-i="' + i + '"><span class="ic">' + x.trait.icon + '</span>' +
          '<b>' + x.trait.name + (x.type === 'up' ? ' → Nv ' + x.lv : '') + ' <span class="tag ' + (x.type === 'up' ? 'green' : x.type === 'swap' ? 'red' : 'blue') + '">' + label[x.type] + '</span></b>' +
          '<span class="d">' + traitTxt(x.trait, x.lv) +
          (x.completes ? '<br><span class="tag gold">Completa ' + x.completes.icon + ' ' + x.completes.name + ': ' + attrTxt(x.completes.attr) + '</span>' : '') + '</span></button>').join('') + '</div>' : '') +
      (hasInv ? '<div class="prep-sec">Investimentos</div>' +
        '<div class="wallet"><span>Saldo <b id="w-money"></b></span><span>Cada compra <b id="w-price"></b></span></div>' +
        '<div class="choices inv-grid">' + D.INVEST.map(t => '<button class="choice inv" data-v="' + t.id + '"><span class="ic">' + t.icon + '</span>' +
          '<b>' + D.investName(t, G.c.pos) + '</b><span class="pips"></span><span class="d">' + (t.attr ? attrTxt(t.attr) : t.perk) + '</span><span class="price"></span></button>').join('') + '</div>' : '') +
      '<div class="inv-bar"><button class="btn" id="b-act" hidden></button></div>' +
      '<button class="btn ghost" id="b-skip">Seguir para a temporada</button>'
    );
    let sel = null; // { i } característica ou { v } investimento
    const act = $('b-act'), skip = $('b-skip');
    const go = () => { preCh = null; U.eventOrSeason(); };
    const refresh = () => {
      if (!act.isConnected) return; // já saiu da tela (ex.: tocou em seguir durante a animação)
      if (hasInv) {
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
      }
      if (sel && sel.v && !S.canInvest(G.c, sel.v)) sel = null; // comprou até não dar mais
      screen.querySelectorAll('[data-i], [data-v]').forEach(b => b.classList.toggle('sel', !!sel && (sel.v ? b.dataset.v === sel.v : b.dataset.i === String(sel.i))));
      // Nada escolhido: some o botão fixo; nada mais a fazer: ele vira "Seguir"
      const nothingLeft = !ch.length && !canBuy();
      skip.hidden = nothingLeft;
      if (!sel) {
        act.hidden = !nothingLeft;
        act.innerHTML = 'Seguir para a temporada' + (hasInv ? '<small>Saldo R$ ' + money(G.c.money) + '</small>' : '');
        showPreview(null);
        return;
      }
      act.hidden = false;
      if (sel.i !== undefined) {
        const x = ch[sel.i];
        act.innerHTML = x.type === 'swap' ? 'Escolher o que sai para ' + esc(x.trait.name) + ' entrar' : 'Confirmar ' + esc(x.trait.name) + (x.type === 'up' ? ' Nv ' + x.lv : '');
        showPreview(x.type === 'swap' ? null : S.preview(G.c, x.type === 'up' ? { up: x.trait.id } : { add: x.trait.id }));
      } else {
        act.innerHTML = 'Comprar ' + esc(D.investName(D.INVEST_BY_ID[sel.v], G.c.pos)) + '<small>R$ ' + money(S.investPrice(G.c)) + '</small>';
        showPreview(S.preview(G.c, { buy: sel.v }));
      }
    };
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { sel = { i: +b.dataset.i }; refresh(); });
    screen.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { sel = { v: b.dataset.v }; refresh(); });
    skip.onclick = go;
    act.onclick = () => {
      if (!sel) return go();
      if (sel.i !== undefined) {
        const x = ch[sel.i];
        if (x.type === 'swap') return chooseSwap(x);
        const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) };
        sfx('levelup');
        let done;
        if (x.type === 'up') { S.upgradeTrait(G.c, x.trait.id); done = '✓ ' + x.trait.icon + ' ' + x.trait.name + ' evoluiu para o Nv ' + x.lv; }
        else { const syn = S.addTrait(G.c, x.trait.id); done = '✓ ' + x.trait.icon + ' ' + x.trait.name + ' entrou' + (syn ? '<br><b>' + syn.icon + ' Combinação desbloqueada: ' + syn.name + '</b> · ' + attrTxt(syn.attr) + (syn.extra ? ' · ' + syn.extra : '') : ''); }
        preCh.done = true;
        showPreview(null);
        bar();
        applyAnim(from, () => prep(true, done));
        return;
      }
      const from = { attrs: S.eff(G.c), ovr: S.ovr(G.c) }, id = sel.v;
      S.invest(G.c, id);
      save();
      sfx('coin');
      bar();
      tweenCard(from, 450);
      const b = screen.querySelector('[data-v="' + id + '"]');
      b.classList.remove('bought'); void b.offsetWidth; b.classList.add('bought');
      setTimeout(refresh, 480); // depois da animação, mostra a prévia da próxima compra
    };
    refresh();
  }

  // Espaços cheios: escolher qual característica sai (mostra o que se perde)
  function chooseSwap(x) {
    const inSyn = new Set(S.synergies(G.c).flatMap(s => [s.a, s.b]));
    render(
      '<div class="eyebrow">Trocar característica</div><h2>O que sai para ' + x.trait.icon + ' ' + x.trait.name + ' entrar?</h2>' + miniCard() +
      '<div class="choices">' + G.c.traits.map((id, i) => {
        const t = D.TRAIT_BY_ID[id], lv = S.traitLevel(G.c, id);
        const lose = {};
        for (const k in t.attr) lose[k] = -Math.round(t.attr[k] * D.TRAIT_LV[lv]);
        return '<button class="choice" data-r="' + i + '" data-ok="Trocar ' + esc(t.name) + ' por ' + esc(x.trait.name) + '"><span class="ic">' + t.icon + '</span><b>' + t.name + ' · Nv ' + lv + '</b><span class="d">' +
          (inSyn.has(id) ? '<span class="tag red">Desfaz uma combinação</span> ' : '') + 'Na carta: ' + (attrTxt(lose).replace(/-/g, '−') || 'sem mudança') + (t.perk ? ' · perde: ' + t.perk : '') + '</span></button>';
      }).join('') + '</div><button class="btn" id="b-ok" disabled>Toque numa opção para ver na carta</button><button class="btn ghost" id="b-back">Voltar</button>'
    );
    pickable('[data-r]', b => S.preview(G.c, { add: x.trait.id, remove: G.c.traits[+b.dataset.r] }), b => {
      sfx('levelup');
      const out = D.TRAIT_BY_ID[G.c.traits[+b.dataset.r]];
      const syn = S.addTrait(G.c, x.trait.id, G.c.traits[+b.dataset.r]);
      return () => prep(true, '✓ ' + x.trait.icon + ' ' + x.trait.name + ' entrou no lugar de ' + out.icon + ' ' + out.name +
        (syn ? '<br><b>' + syn.icon + ' Combinação desbloqueada: ' + syn.name + '</b> · ' + attrTxt(syn.attr) + (syn.extra ? ' · ' + syn.extra : '') : ''));
    });
    $('b-back').onclick = () => prep(false);
  }

  Object.assign(U, { traitsHtml, attrTxt, traitTxt, setTier, miniCard, showPreview, applyAnim, tweenCard, pickable, wcHint, preseason, chooseSwap, invest });
})();
