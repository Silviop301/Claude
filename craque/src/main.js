// Telas e fluxo do CRAQUE: criar → base → [característica → evento → temporada → janela] → aposentadoria.
(function () {
  const D = window.CRAQUE_DATA, S = window.CRAQUE_SIM;
  const $ = id => document.getElementById(id);
  const screen = $('screen');
  const SAVE = 'craque-v5', HALL = 'craque-hall-v1';
  const YEAR0 = 2026;
  let c = null;      // carreira atual
  let step = null;   // etapa atual (para retomar)

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : v >= 1e3 ? Math.round(v / 1e3) + ' mil' : String(v));
  const club = id => D.CLUB_BY_ID[id];
  const league = id => D.LEAGUE_BY_ID[club(id).league];
  const stars = t => '★'.repeat(t) + '☆'.repeat(5 - t);
  const year = () => YEAR0 + c.season;
  const crest = (id, cls) => '<img class="crest' + (cls ? ' ' + cls : '') + '" src="badges/' + id + '.png" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  const trophy = (type, size) => window.CRAQUE_TROPHY(type, size);
  const titleType = t => (t.id === 'cont' ? (t.name === 'Libertadores' ? 'lib' : 'ucl') : t.id);
  const meter = (label, v) => '<span class="m"><span class="ml">' + label + ' · ' + S.relLabel(v) + '</span><span class="mb"><i style="width:' + Math.round(v) + '%" class="' + (v >= 62 ? 'hi' : v < 32 ? 'lo' : '') + '"></i></span></span>';

  function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sem storage */ } }
  function save() { if (c && !c.retired) store(SAVE, { c, step }); else store(SAVE, null); }

  function render(html) {
    screen.innerHTML = html;
    screen.style.animation = 'none';
    void screen.offsetWidth;
    screen.style.animation = '';
    window.scrollTo(0, 0);
  }

  // ---------- barra do jogador ----------
  let lastOvr = 0;
  function bar() {
    const b = $('bar');
    if (!c || !c.club) { b.hidden = true; return; }
    b.hidden = false;
    requestAnimationFrame(() => document.documentElement.style.setProperty('--bar-h', b.offsetHeight + 'px'));
    const cl = club(c.club), lg = league(c.club);
    $('bar-name').textContent = c.name;
    $('bar-sub').innerHTML = crest(cl.id, 'xs') + esc(cl.name) + ' · ' + c.age + ' anos';
    $('bar-rel').innerHTML = meter('👔 Técnico', c.rel.coach) + meter('📣 Torcida', c.rel.fans);
    const T = c.totals;
    $('bar-tot').innerHTML = '<span>' + T.goals + '<small>GOLS</small></span><span>' + T.assists + '<small>ASSIST</small></span><span>' + (T.league + T.cup + T.cont) + '<small>TAÇAS</small></span>';
    const o = S.ovr(c);
    const el = $('bar-ovr');
    el.textContent = o;
    el.className = 'ovr metal ' + tierCls(o) + (el.classList.contains('up') ? ' up' : '');
    if (o > lastOvr && lastOvr) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    lastOvr = o;
  }

  // ---------- início ----------
  function home() {
    c = null; step = null; bar();
    const saved = load(SAVE);
    const hall = load(HALL) || [];
    render(
      '<div class="hero"><div class="ball3d" id="ball3d" aria-hidden="true"></div><div class="eyebrow">Protótipo 3</div><h1>CRAQUE</h1></div>' +
      '<p class="lead">Crie um garoto de 16 anos, escolha propostas, monte o estilo dele e descubra se ele vira lenda.</p>' +
      (saved && saved.c ? '<button class="btn" id="b-cont">Continuar carreira de ' + esc(saved.c.name) + '</button>' : '') +
      '<button class="btn' + (saved && saved.c ? ' ghost' : '') + '" id="b-new">Nova carreira</button>' +
      (hall.length ? '<div class="eyebrow" style="margin-top:8px">Hall da Fama</div><div class="hall">' +
        hall.map(h => '<div><b>' + h.grade + '</b><span>' + esc(h.name) + ' · ' + esc(h.verdict) + '<br><small>' + h.goals + ' gols · ' + h.assists + ' assist. · ' + h.titles + ' taças' + (h.ballon ? ' · ' + h.ballon + ' Bola' + (h.ballon > 1 ? 's' : '') + ' de Ouro' : '') + '</small></span><span class="muted">' + h.score + '</span></div>').join('') + '</div>' : '')
    );
    if ($('b-cont')) $('b-cont').onclick = () => {
      c = saved.c;
      // saves de antes dos investimentos
      c.inv = c.inv || {}; c.buys = c.buys || 0; c.spent = c.spent || 0;
      c.leagueOf = c.leagueOf || {}; c.clubBoost = c.clubBoost || {};
      S.applyLeagues(c); // quem subiu e quem caiu nesta carreira
      resume(saved.step);
    };
    $('b-new').onclick = create;
    if (window.CRAQUE_BALL) window.CRAQUE_BALL.mount($('ball3d'));
  }

  function resume(st) {
    step = st;
    bar();
    if (!c.club) return academy();
    if (S.mustRetire(c)) return finale();
    if (st === 'offers') return S.windowOpen(c) ? windowOffers() : preseason();
    if (st === 'event') return eventScreen();
    if (st === 'invest') return invest();
    if (st === 'moment') return momentOrSeason();
    return preseason();
  }

  // ---------- criação ----------
  function create() {
    const i = Math.floor(Math.random() * D.NICKNAMES.length);
    const st = { pos: 'ATA', foot: 'D', country: 'Brasil' };
    render(
      '<div class="eyebrow">Nova carreira</div><h2>Quem é o garoto?</h2>' +
      '<div class="field"><label for="f-name">Nome na camisa</label><input id="f-name" maxlength="18" value="' + D.NICKNAMES[i] + '"></div>' +
      '<div class="field"><label>Posição</label><div class="seg" id="f-pos"><button data-v="ATA" class="on">Atacante</button><button data-v="MEI">Meia</button></div></div>' +
      '<div class="field"><label for="f-num">Número da camisa</label><div class="num-pick"><input id="f-num" type="number" inputmode="numeric" min="1" max="99" value="9">' +
      [7, 9, 10, 11, 99].map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>Pé bom</label><div class="seg" id="f-foot"><button data-v="D" class="on">Destro</button><button data-v="E">Canhoto</button></div></div>' +
      '<div class="field"><label>País</label><div class="seg flags" id="f-country">' + D.COUNTRIES.map((k, j) => '<button data-v="' + k.id + '"' + (j ? '' : ' class="on"') + ' aria-label="' + k.id + '">' + k.flag + '</button>').join('') + '</div></div>' +
      '<button class="btn" id="b-go">Começar carreira</button>'
    );
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) => {
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
        // Número padrão acompanha a posição até a pessoa escolher um
        if (key === 'pos' && !numTouched) $('f-num').value = b.dataset.v === 'ATA' ? 9 : 10;
      });
    });
    let numTouched = false;
    $('f-num').oninput = () => { numTouched = true; };
    screen.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { $('f-num').value = b.dataset.n; numTouched = true; });
    $('b-go').onclick = () => {
      const name = $('f-name').value.trim() || D.NICKNAMES[i];
      const number = Math.max(1, Math.min(99, parseInt($('f-num').value, 10) || (st.pos === 'ATA' ? 9 : 10)));
      c = S.newCareer({ name, pos: st.pos, foot: st.foot, country: st.country, number });
      academy();
    };
  }

  // ---------- propostas ----------
  // Salário traduzido em investimentos por temporada
  function buysTag(wage) {
    const n = S.buysWith(c, wage * 52);
    return '<span class="tag' + (n >= 2 ? ' gold' : '') + '">' + (n ? '≈ ' + n + (n > 1 ? ' compras' : ' compra') + '/ano' : 'sem sobra p/ investir') + '</span>';
  }
  function offerCard(o, idx) {
    const cl = club(o.club), lg = league(o.club);
    const kinds = { base: ['Base', ''], up: ['Clube maior', 'blue'], mid: ['Protagonista', 'green'], money: ['Proposta milionária', 'gold'], home: ['Volta pra casa', 'red'], stay: ['Renovar', ''] };
    const [kname, kcls] = kinds[o.kind] || ['', ''];
    const roleCls = o.share >= 0.78 ? 'green' : o.share >= 0.5 ? 'blue' : 'red';
    return '<button class="choice offer card" data-i="' + idx + '" style="display:flex">' +
      '<div class="top"><span class="club">' + crest(cl.id) + esc(cl.name) + '</span><span class="stars">' + stars(cl.tier) + '</span></div>' +
      '<div class="lg">' + lg.flag + ' ' + lg.name + ' · força ' + cl.strength + '</div>' +
      '<div class="facts">' + (kname ? '<span class="tag ' + kcls + '">' + kname + '</span>' : '') +
      '<span class="tag ' + roleCls + '">' + o.role + '</span><span class="tag">R$ ' + money(o.wage) + '/sem</span>' + buysTag(o.wage) + '<span class="tag">' + o.years + (o.years > 1 ? ' anos' : ' ano') + '</span></div></button>';
  }

  function academy() {
    step = 'academy';
    const offers = S.offers(c, true);
    bar();
    render(
      '<div class="eyebrow">' + year() + ' · 16 anos</div><h2>Três clubes querem você na base</h2>' +
      '<p class="lead">Clube mais forte dá mais chance de título, mas menos minutos em campo.</p>' +
      '<div class="choices">' + offers.map(offerCard).join('') + '</div>'
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      S.join(c, offers[+b.dataset.i]);
      preseason();
    });
  }

  function windowOffers() {
    step = 'offers';
    save();
    bar();
    const ended = c.contract <= 0;
    const offers = S.offers(c, false);
    const all = offers.concat([S.stayOffer(c)]);
    const noOffers = !offers.length;
    render(
      '<div class="eyebrow">Janela de transferências · ' + year() + '</div>' +
      '<h2>' + (ended ? 'Seu contrato com o ' + esc(club(c.club).name) + ' acabou' : 'Seu empresário abriu o mercado') + '</h2>' +
      '<p class="lead">' + (noOffers ? 'Nenhum clube novo apareceu. ' : '') + 'Nota geral ' + S.ovr(c) + ' · fama ' + Math.round(c.fame) + '. A última opção é renovar com o clube atual.</p>' +
      '<div class="choices">' + all.map(offerCard).join('') + '</div>' +
      (S.canRetire(c) ? '<button class="btn ghost" id="b-retire">Pendurar as chuteiras</button>' : '')
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      S.join(c, all[+b.dataset.i]);
      preseason();
    });
    if ($('b-retire')) $('b-retire').onclick = finale;
  }

  // ---------- pré-temporada: característica ----------
  const SUP = ['', '', '²', '³'];
  function traitsHtml() {
    const syn = S.synergies(c);
    const slots = [];
    for (let i = 0; i < S.MAX_SLOTS; i++) {
      const id = c.traits[i];
      if (id) slots.push('<span class="chip">' + D.TRAIT_BY_ID[id].icon + ' ' + D.TRAIT_BY_ID[id].name + (S.traitLevel(c, id) > 1 ? ' <b>Nv ' + S.traitLevel(c, id) + '</b>' : '') + '</span>');
    }
    const free = S.MAX_SLOTS - c.traits.length;
    if (free) slots.push('<span class="chip empty">' + free + (free > 1 ? ' espaços livres' : ' espaço livre') + '</span>');
    return '<div class="eyebrow small">Características ' + c.traits.length + '/' + S.MAX_SLOTS + '</div><div class="chips">' + slots.join('') +
      syn.map(s => '<span class="chip syn">' + s.icon + ' ' + s.name + '</span>').join('') + '</div>';
  }

  // Texto de atributos: "+4 FIN · +1 DRI"
  const attrTxt = at => Object.keys(at).filter(k => at[k]).map(k => (at[k] > 0 ? '+' : '') + at[k] + ' ' + D.ATTR_LABEL[k]).join(' · ');
  function traitTxt(t, lv) {
    const at = {};
    for (const k in t.attr) at[k] = Math.round(t.attr[k] * D.TRAIT_LV[lv]) - (lv > 1 ? Math.round(t.attr[k] * D.TRAIT_LV[lv - 1]) : 0);
    return attrTxt(at) + (t.perk ? ' · ' + t.perk : '');
  }

  // Mini carta da pré-temporada: mostra os atributos atuais e, ao escolher, quanto cada um muda
  // Mesmas faixas de cor da carta final
  const tierCls = o => (o >= 85 ? 'icone' : o >= 75 ? 'ouro' : o >= 65 ? 'prata' : 'bronze');
  const TIER_NAME = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', icone: 'Ícone' };
  function setTier(o) {
    const el = $('mcard'), t = tierCls(o);
    if (el.dataset.t === t) return;
    el.dataset.t = t;
    el.className = 'mcard metal ' + t;
    void el.offsetWidth; // reinicia a animação: mudou de cor, pulsa de novo
    el.classList.add('pop', 'tierup');
    $('mc-tier').textContent = TIER_NAME[t];
  }
  function miniCard() {
    const E = S.eff(c), t = tierCls(S.ovr(c));
    return '<div class="mcard metal ' + t + '" id="mcard" data-t="' + t + '"><span class="mc-tier" id="mc-tier">' + TIER_NAME[t] + '</span><div class="mc-ovr"><b id="mc-ovr">' + S.ovr(c) + '</b><span>' + c.pos + (c.number ? ' ' + c.number : '') + '</span><i id="mc-ovr-d"></i></div><div class="mc-grid">' +
      D.ATTRS.map(k => '<div class="mc-at" data-k="' + k + '"><b>' + E[k] + '</b><span>' + D.ATTR_LABEL[k] + '</span><i></i></div>').join('') + '</div></div>';
  }
  function showPreview(p) {
    const E = S.eff(c), o = S.ovr(c);
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
    const E = S.eff(c), o1 = S.ovr(c), t0 = performance.now(), dur = 900;
    screen.querySelectorAll('.choice, .btn').forEach(b => { b.disabled = true; });
    $('mcard').classList.add('pop');
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      D.ATTRS.forEach(a => { screen.querySelector('.mc-at[data-k="' + a + '"] b').textContent = Math.round(from.attrs[a] + (E[a] - from.attrs[a]) * e); });
      const ov = Math.round(from.ovr + (o1 - from.ovr) * e);
      $('mc-ovr').textContent = ov;
      setTier(ov);
      if (k < 1) requestAnimationFrame(tick); else setTimeout(then, 650);
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
      const from = { attrs: S.eff(c), ovr: S.ovr(c) };
      const next = apply(cur);
      if (next.go) return next.go(); // sem mudança na carta ainda (ex.: ir escolher o que sai)
      showPreview(null);
      bar();
      applyAnim(from, next);
    };
  }

  let preCh = null;
  function preseason() {
    step = 'preseason';
    save();
    bar();
    if (!preCh || preCh.age !== c.age) preCh = { age: c.age, list: S.traitChoices(c) };
    const ch = preCh.list;
    if (!ch.length) return invest();
    const label = { new: 'NOVA', up: 'EVOLUIR', swap: 'TROCAR' };
    render(
      '<div class="eyebrow">Pré-temporada · ' + year() + (c.farewell ? ' · temporada de despedida' : '') + '</div>' +
      '<h2>' + (c.traits.length >= S.MAX_SLOTS ? 'Evolua ou troque uma característica' : 'Escolha uma característica') + '</h2>' + miniCard() + traitsHtml() +
      '<div class="choices">' + ch.map((x, i) =>
        '<button class="choice' + (x.completes ? ' combo' : '') + '" data-i="' + i + '" data-name="' + esc(x.trait.name) + '"' + (x.type === 'swap' ? ' data-ok="Escolher o que sai"' : '') + '><span class="ic">' + x.trait.icon + '</span>' +
        '<b>' + x.trait.name + (x.type === 'up' ? ' → Nv ' + x.lv : '') + ' <span class="tag ' + (x.type === 'up' ? 'green' : x.type === 'swap' ? 'red' : 'blue') + '">' + label[x.type] + '</span></b>' +
        '<span class="d">' + traitTxt(x.trait, x.lv) +
        (x.completes ? '<br><span class="tag gold">Completa ' + x.completes.icon + ' ' + x.completes.name + ': ' + attrTxt(x.completes.attr) + '</span>' : '') + '</span></button>').join('') +
      '</div><button class="btn" id="b-ok" disabled>Toque numa opção para ver na carta</button><button class="btn ghost" id="b-skip">Seguir sem mudar</button>'
    );
    $('b-skip').onclick = () => { preCh = null; invest(); };
    pickable('[data-i]', b => {
      const x = ch[+b.dataset.i];
      return x.type === 'swap' ? null : S.preview(c, x.type === 'up' ? { up: x.trait.id } : { add: x.trait.id });
    }, b => {
      const x = ch[+b.dataset.i];
      if (x.type === 'swap') return { go: () => chooseSwap(x) };
      preCh = null;
      if (x.type === 'up') { S.upgradeTrait(c, x.trait.id); return invest; }
      const syn = S.addTrait(c, x.trait.id);
      return () => afterTrait(syn);
    });
  }

  // Espaços cheios: escolher qual característica sai
  function chooseSwap(x) {
    const inSyn = new Set(S.synergies(c).flatMap(s => [s.a, s.b]));
    render(
      '<div class="eyebrow">Trocar característica</div><h2>O que sai para ' + x.trait.icon + ' ' + x.trait.name + ' entrar?</h2>' + miniCard() +
      '<div class="choices">' + c.traits.map((id, i) => {
        const t = D.TRAIT_BY_ID[id];
        return '<button class="choice" data-r="' + i + '" data-ok="Trocar ' + esc(t.name) + ' por ' + esc(x.trait.name) + '"><span class="ic">' + t.icon + '</span><b>' + t.name + ' · Nv ' + S.traitLevel(c, id) + '</b><span class="d">' +
          (inSyn.has(id) ? '<span class="tag red">Desfaz uma combinação</span> ' : '') + 'Sai e leva os pontos que dava</span></button>';
      }).join('') + '</div><button class="btn" id="b-ok" disabled>Toque numa opção para ver na carta</button><button class="btn ghost" id="b-back">Voltar</button>'
    );
    pickable('[data-r]', b => S.preview(c, { add: x.trait.id, remove: c.traits[+b.dataset.r] }), b => {
      preCh = null;
      const syn = S.addTrait(c, x.trait.id, c.traits[+b.dataset.r]);
      return () => afterTrait(syn);
    });
    $('b-back').onclick = preseason;
  }

  function afterTrait(syn) {
    bar();
    if (syn) {
      render('<div class="eyebrow">Combinação desbloqueada</div><div class="award ballon">' + syn.icon + ' ' + syn.name + '</div><p class="lead">' + attrTxt(syn.attr) + (syn.extra ? ' · ' + syn.extra : '') + ' na sua carta</p><button class="btn" id="b-next">Continuar</button>');
      $('b-next').onclick = invest;
    } else invest();
  }

  // ---------- investimentos (dinheiro vira pontos na carta) ----------
  function invest() {
    const price = S.investPrice(c);
    if (c.money < price) return eventOrSeason();
    step = 'invest';
    save();
    render(
      '<div class="eyebrow">Pré-temporada · Investimentos</div><h2>Invista na sua carreira</h2>' +
      '<div class="wallet"><span>Saldo <b>R$ ' + money(c.money) + '</b></span><span>Próxima compra <b>R$ ' + money(price) + '</b></span></div>' +
      miniCard() +
      '<div class="choices inv-grid">' + D.INVEST.map(t => {
        const n = c.inv[t.id] || 0, max = S.investMax(t.id), ok = S.canInvest(c, t.id);
        return '<button class="choice inv" data-v="' + t.id + '" data-ok="Comprar por R$ ' + money(price) + '"' + (ok ? '' : ' disabled') + '><span class="ic">' + t.icon + '</span>' +
          '<b>' + t.name + '</b><span class="pips">' + '●'.repeat(n) + '○'.repeat(max - n) + '</span>' +
          '<span class="d">' + (n >= max ? 'No máximo' : t.attr ? attrTxt(t.attr) : t.perk) + '</span></button>';
      }).join('') +
      '</div><p class="muted small">Cada compra deixa a próxima mais cara. O que você não gastar fica como patrimônio no fim da carreira.</p>' +
      '<button class="btn" id="b-ok" disabled>Toque num investimento para ver na carta</button><button class="btn ghost" id="b-skip">Guardar o dinheiro e seguir</button>'
    );
    $('b-skip').onclick = eventOrSeason;
    pickable('[data-v]', b => S.preview(c, { buy: b.dataset.v }), b => {
      S.invest(c, b.dataset.v);
      return invest;
    });
  }

  // ---------- evento ----------
  let pendingEvent = null;
  function eventOrSeason() {
    pendingEvent = S.pickEvent(c);
    if (!pendingEvent) return momentOrSeason();
    step = 'event';
    save();
    eventScreen();
  }

  function eventScreen() {
    if (!pendingEvent) pendingEvent = S.pickEvent(c);
    if (!pendingEvent) return momentOrSeason();
    const ev = pendingEvent;
    render(
      '<div class="eyebrow">Durante a temporada</div>' +
      '<div class="card event-card"><span class="ic">' + ev.icon + '</span><h2>' + ev.title + '</h2><p style="margin:0">' + ev.text + '</p></div>' +
      '<div class="choices">' + ev.options.map((o, i) => '<button class="btn opt' + (i ? ' ghost' : '') + '" data-i="' + i + '">' + esc(o.label) + '<small>' + esc(o.hint) + '</small></button>').join('') + '</div>'
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const r = S.resolveEvent(c, ev, +b.dataset.i);
      pendingEvent = null;
      bar();
      render(
        '<div class="eyebrow">' + ev.title + '</div>' +
        '<div class="result ' + (r.ok ? 'ok' : 'ko') + '">' + r.text + '</div>' +
        '<button class="btn" id="b-next">Jogar a temporada</button>'
      );
      $('b-next').onclick = momentOrSeason;
    });
  }

  // ---------- jogo decisivo (minigame) ----------
  function momentOrSeason() {
    const m = S.pickMoment(c);
    if (!m) return season();
    step = 'moment';
    // Fechou o jogo no meio da cobrança? A chance decide (sem repetir o chute)
    if (m.started) { S.autoMoment(c); save(); return season(); }
    save();
    momentIntro(m);
  }

  const MOMENT_TXT = {
    cup: m => ({ tag: 'Final da ' + m.comp, title: 'Pênalti nos acréscimos!', text: 'Final contra o ' + club(m.vs).name + ', empate no placar. A bola é sua.', stakes: 'Converteu: campeão da ' + m.comp + ' · Errou: vice' }),
    title: m => ({ tag: 'Última rodada · ' + m.comp, title: 'Pênalti valendo o título!', text: 'Contra o ' + club(m.vs).name + ', quem vencer é campeão.', stakes: 'Converteu: campeão da liga · Errou: vice' }),
    classico: m => ({ tag: 'Clássico', title: 'Falta perigosa no clássico!', text: 'Contra o ' + club(m.vs).name + ', na entrada da área. A barreira está armada.', stakes: 'Converteu: gol no clássico e Torcida +8' }),
  };

  function momentIntro(m) {
    const T = MOMENT_TXT[m.type](m), k = S.kickSetup(c, m.type), E = S.eff(c);
    const lv = id => (c.traits.includes(id) ? S.traitLevel(c, id) : 0);
    // O que da carta pesa no chute, sem números escondidos
    const facts = ['<span class="chip">FIN ' + E.fin + ' · mira ' + (k.period >= 1.7 ? 'lenta' : k.period >= 1.35 ? 'média' : 'rápida') + '</span>',
      '<span class="chip">Tremedeira ' + (k.wobble <= 0.03 ? 'nenhuma' : k.wobble <= 0.08 ? 'pouca' : 'muita') + '</span>'];
    if (lv('colocado')) facts.push('<span class="chip">🎯 Chute Colocado: mira mais lenta</span>');
    if (lv('frieza')) facts.push('<span class="chip">🧊 Frieza: menos tremedeira</span>');
    if (m.type === 'classico' && lv('parada')) facts.push('<span class="chip">🧱 Bola Parada: barreira mais fácil</span>');
    render(
      '<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div>' +
      '<div class="card event-card moment-card"><div class="with-crest">' + crest(c.club) + '<b>×</b>' + crest(m.vs) + '</div><h2>' + T.title + '</h2><p style="margin:0">' + esc(T.text) + '</p><p class="stakes">' + esc(T.stakes) + '</p></div>' +
      '<div class="chips">' + facts.join('') + '</div>' +
      '<p class="lead small">Dois toques: o primeiro trava a direção, o segundo a altura. ' + (m.type === 'classico' ? 'Passe por cima da barreira ou busque o ângulo.' : 'O goleiro escolhe um canto; no ângulo ele não alcança.') + '</p>' +
      '<button class="btn" id="b-kick">' + (m.type === 'classico' ? 'Bater a falta' : 'Bater o pênalti') + '</button>' +
      '<button class="btn ghost" id="b-auto">Deixar o jogo decidir<small>Chance de ' + Math.round(k.chance * 100) + '% pela sua carta</small></button>'
    );
    $('b-kick').onclick = () => {
      m.started = true; save();
      render('<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div><div id="kick"></div>');
      window.CRAQUE_KICK($('kick'), { c, moment: m, onDone: (ok, why) => momentEnd(m, ok, T, why) });
    };
    $('b-auto').onclick = () => {
      const ok = S.autoMoment(c);
      save();
      momentResult(ok, T, m);
    };
  }

  function momentEnd(m, ok, T, why) {
    S.resolveMoment(c, ok);
    save();
    momentResult(ok, T, m, why);
  }

  function momentResult(ok, T, m, why) {
    const how = { defesa: 'O goleiro do ' + club(m.vs).name + ' defendeu.', trave: 'A bola explodiu na trave.', fora: 'A bola foi para fora.', alto: 'A bola foi por cima do gol.', barreira: 'A bola parou na barreira.' }[why] || '';
    const txt = {
      cup: ok ? 'Gol! Campeão da ' + m.comp + '!' : (how || 'Não entrou.') + ' Fica o vice da ' + m.comp + '.',
      title: ok ? 'Na rede! O título é seu!' : (how || 'Não entrou.') + ' O título escapou nos detalhes.',
      classico: ok ? 'Golaço de falta! O clássico é seu.' : (how || 'Não foi dessa vez.') + ' A torcida lamenta.',
    }[m.type];
    render(
      '<div class="eyebrow">Jogo decisivo · ' + esc(T.tag) + '</div>' +
      '<div class="result ' + (ok ? 'ok' : 'ko') + '">' + txt + '</div>' +
      '<button class="btn" id="b-next">Jogar a temporada</button>'
    );
    $('b-next').onclick = season;
  }

  // ---------- temporada ----------
  function season() {
    const res = S.playSeason(c);
    step = S.windowOpen(c) ? 'offers' : 'preseason';
    save();
    const cl = club(res.club);
    render(
      '<div class="season-head"><div><div class="eyebrow">Temporada ' + (year() - 1) + ' · ' + res.age + ' anos</div><h2 class="with-crest">' + crest(cl.id, 'lg') + esc(cl.name) + '</h2></div><span class="tag">' + (res.farewell ? 'Despedida' : res.role) + '</span></div>' +
      '<div class="counters"><div class="counter"><b id="k-j">0</b><span>Jogos</span></div><div class="counter"><b id="k-g">0</b><span>Gols</span></div>' +
      '<div class="counter"><b id="k-a">0</b><span>Assist.</span></div><div class="counter rate"><b id="k-n">–</b><span>Nota</span></div></div>' +
      '<div class="feed" id="feed"></div><div id="after"></div><p class="skip-hint" id="skip-hint">Toque para pular</p>'
    );
    const dur = 2200, t0 = performance.now();
    let skip = false;
    // Liga o "pular" só depois: o toque que abriu esta tela ainda está se propagando
    setTimeout(() => { screen.onclick = () => { skip = true; }; }, 50);
    (function tick(now) {
      const u = skip ? 1 : Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 2);
      $('k-j').textContent = Math.round(res.games * e);
      $('k-g').textContent = Math.round(res.goals * e);
      $('k-a').textContent = Math.round(res.assists * e);
      if (u < 1) return requestAnimationFrame(tick);
      $('k-n').textContent = res.games ? res.rating.toFixed(1).replace('.', ',') : '–';
      $('k-n').parentNode.classList.add('pop');
      summary(res, skip);
    })(t0);
  }

  // Jornal da temporada: um de 6 jornais (inventados) sorteado a cada temporada
  const PAPERS = [
    { name: 'Gazeta da Bola', motto: 'O jornal de quem vive futebol' },
    { name: 'Diário do Craque', motto: 'Desde a várzea até a Europa' },
    { name: 'Tribuna Esportiva', motto: 'A voz da arquibancada' },
    { name: 'O Placar', motto: 'Resultado é o que importa' },
    { name: 'Folha do Gramado', motto: 'Notícia com cheiro de grama' },
    { name: 'Jornal da Arquibancada', motto: 'Opinião de torcedor' },
  ];
  let lastPaper = -1;
  function lede(res, cl) {
    const tb = res.table;
    const pos = tb.pos === 1 ? 'terminou campeão da ' + tb.league : 'terminou em ' + tb.pos + 'º lugar na ' + tb.league;
    const perf = !res.games ? c.name + ' quase não entrou em campo, e o ' + cl.name + ' ' + pos + '.'
      : res.rating >= 7.5 ? c.name + ' foi o nome do ' + cl.name + ', que ' + pos + '.'
      : res.rating >= 6.8 ? 'Com atuações seguras de ' + c.name + ', o ' + cl.name + ' ' + pos + '.'
      : 'Em temporada irregular de ' + c.name + ', o ' + cl.name + ' ' + pos + '.';
    return perf + (res.titles.length ? ' A torcida comemorou ' + res.titles.map(t => t.name).join(' e ') + '.' : '');
  }
  function showPaper(res, onClose) {
    let k;
    do { k = Math.floor(Math.random() * PAPERS.length); } while (k === lastPaper);
    lastPaper = k;
    const P = PAPERS[k], cl = club(res.club), [main, ...rest] = res.headlines;
    const price = 'R$ ' + (2 + (year() % 5)) + ',50';
    const wrap = document.createElement('div');
    wrap.className = 'paper-wrap';
    wrap.innerHTML = '<div class="paper"><div class="pp-top"><span>Edição de ' + (year() - 1) + '</span><span>' + price + '</span></div>' +
      '<div class="pp-name">' + P.name + '</div><div class="pp-motto">' + P.motto + '</div>' +
      '<h3 class="pp-head">' + esc(main) + '</h3>' +
      '<div class="pp-body"><div class="pp-photo">' + crest(cl.id) + '<span>' + esc(c.name) + ' com a camisa do ' + esc(cl.name) + '</span></div>' +
      '<div class="pp-col"><p class="pp-stats">' + res.games + ' jogos · ' + res.goals + ' gols · ' + res.assists + ' assist.' + (res.games ? ' · nota ' + res.rating.toFixed(1).replace('.', ',') : '') + '</p>' +
      '<p class="pp-lede">' + esc(lede(res, cl)) + '</p>' +
      rest.map(h => '<p class="pp-sub">' + esc(h) + '</p>').join('') + '</div></div>' +
      '<div class="pp-tap">Toque para fechar</div></div>';
    document.body.appendChild(wrap);
    const close = e => {
      if (e) e.stopPropagation();
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); onClose && onClose(); }, 250);
    };
    setTimeout(() => { wrap.onclick = close; }, 400);
  }

  // Mostra os blocos do resumo um de cada vez (troféus com mais destaque). Tocar mostra tudo.
  function reveal(skipNow, res) {
    const items = Array.from(screen.querySelectorAll('.rv'));
    let i = 0, timer = null, paper = false;
    const done = () => { screen.onclick = null; const h = $('skip-hint'); if (h) h.remove(); };
    // O jornal aparece uma vez por temporada, mesmo se a pessoa pular o resto
    const all = () => {
      clearTimeout(timer); items.forEach(el => el.classList.add('in')); done();
      if (!paper) { paper = true; showPaper(res); }
    };
    if (skipNow) return all();
    screen.onclick = all;
    (function next() {
      if (i >= items.length) return done();
      if (!items[0].isConnected) return; // já saiu desta tela
      const el = items[i++];
      el.classList.add('in');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (el.classList.contains('news') && !paper) {
        paper = true;
        screen.onclick = null;
        return setTimeout(() => { if (el.isConnected) showPaper(res, () => { screen.onclick = all; timer = setTimeout(next, 200); }); }, 300);
      }
      timer = setTimeout(next, el.classList.contains('title-won') ? 900 : el.classList.contains('award') ? 700 : el.classList.contains('hl') ? 450 : 220);
    })();
  }

  function summary(res, skipNow) {
    const feed = $('feed');
    res.highlights.forEach(h => { const d = document.createElement('div'); d.className = 'rv hl'; d.textContent = h; feed.appendChild(d); });
    const dOvr = res.ovr1 - res.ovr0;
    const fin = S.mustRetire(c);
    const tb = res.table;
    const tableTxt = !res.games ? '' : tb.pos === 1 ? '🥇 Campeão da ' + tb.league + ' com ' + tb.pts + ' pontos'
      : tb.pos + 'º lugar na ' + tb.league + ' · ' + tb.pts + ' pts, a ' + tb.gap + ' do líder';
    const moveTxt = !res.move ? '' : res.move.dir === 'up' ? '⬆️ Acesso para a ' + res.move.toName + '!' : '⬇️ Rebaixado para a ' + res.move.toName;
    const why = res.why.length ? '<ul class="why">' + res.why.map(w => '<li><span>' + esc(w.txt) + '</span><b class="' + (w.pot ? 'pot' : w.v >= 0 ? 'up' : 'down') + '">' + (w.pot ? 'teto ↑' : (w.v >= 0 ? '+' : '') + w.v) + '</b></li>').join('') + '</ul>' : '';
    const open = S.windowOpen(c);
    const contractTxt = c.contract > 0 ? 'Contrato: mais ' + c.contract + (c.contract > 1 ? ' temporadas' : ' temporada') + ' no ' + esc(club(c.club).name) : 'Seu contrato acabou: hora de decidir o futuro';
    let actions;
    if (fin) actions = '<p class="lead">' + (res.farewell ? 'Fim da temporada de despedida. Hora de pendurar as chuteiras.' : 'Aos ' + c.age + ' anos, o corpo pediu para parar.') + '</p><button class="btn" id="b-next">Ver sua carreira</button>';
    else {
      actions = '<p class="contract">' + contractTxt + '</p><button class="btn" id="b-next">' + (open ? 'Janela de transferências' : 'Próxima temporada') + '</button>';
      if (S.canAnnounce(c)) actions += '<button class="btn ghost" id="b-farewell">Anunciar a última temporada<small>Torcida +10 e mais minutos · parar em alta rende pontos extras</small></button>';
      if (S.canRetire(c)) actions += '<button class="btn ghost" id="b-stop">Parar agora</button>';
    }
    $('after').innerHTML =
      (tableTxt ? '<p class="table-line rv">' + tableTxt + '</p>' : '') +
      (moveTxt ? '<div class="move-line rv ' + res.move.dir + '">' + moveTxt + '</div>' : '') +
      (res.titles.length ? '<div class="titles">' + res.titles.map(t => '<div class="title-won rv">' + trophy(titleType(t), 54) + '<span>Campeão<br><b>' + esc(t.name) + '</b></span></div>').join('') + '</div>' : '') +
      '<div class="awards">' + res.awards.map(a => '<div class="award rv' + (a.id === 'ballon' ? ' ballon' : '') + '">' + (a.id === 'ballon' ? trophy('ballon', 44) + ' ' : '🥇 ') + a.name + '</div>').join('') + '</div>' +
      '<div class="news rv"><div class="np">📰 Nos jornais</div>' + res.headlines.map(h => '<p>' + esc(h) + '</p>').join('') + '</div>' +
      '<div class="card why-card rv"><p class="delta-in ' + (dOvr >= 0 ? 'up' : 'down') + '">Nota geral ' + res.ovr0 + ' → ' + res.ovr1 + ' (' + (dOvr >= 0 ? '+' : '') + dOvr + ')</p>' + why + '</div>' +
      '<p class="rel-delta rv">👔 Técnico ' + res.coach0 + ' → ' + res.coach1 + ' · 📣 Torcida ' + res.fans0 + ' → ' + res.fans1 + ' (' + S.relLabel(res.fans1) + ')</p>' +
      '<div class="rv">' + actions + '</div>';
    bar();
    reveal(skipNow, res);
    $('b-next').onclick = fin ? finale : open ? windowOffers : preseason;
    if ($('b-farewell')) $('b-farewell').onclick = () => { S.announce(c); save(); bar(); preseason(); };
    if ($('b-stop')) $('b-stop').onclick = finale;
  }

  // ---------- fim ----------
  function finale() {
    const f = S.finish(c);
    const T = c.totals;
    store(SAVE, null);
    const hall = (load(HALL) || []);
    hall.push({ name: c.name, grade: f.grade, score: f.score, verdict: f.verdict, goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon });
    hall.sort((a, b) => b.score - a.score);
    const rank = hall.findIndex(h => h.score === f.score && h.name === c.name) + 1;
    store(HALL, hall.slice(0, 10));
    const cty = D.COUNTRIES.find(x => x.id === c.country);
    const cardData = {
      name: c.name, number: c.number, pos: c.pos, peak: c.peak, attrs: c.peakAttrs || c.attrs, flag: cty.flag,
      crest: 'badges/' + f.mainClub + '.png', grade: f.grade, verdict: f.verdict,
      goals: T.goals, assists: T.assists, titles: f.titles, ballon: T.ballon,
      traits: c.traits.map(id => ({ icon: D.TRAIT_BY_ID[id].icon, lv: S.traitLevel(c, id) })),
    };
    const shareName = c.name;
    render(
      '<div class="eyebrow">Fim de carreira · ' + (YEAR0 + c.season) + '</div>' +
      '<div class="fut"><canvas id="fut" aria-label="Card do jogador"></canvas></div>' +
      '<button class="btn" id="b-share">Compartilhar card</button>' +
      '<div class="final">' +
      '<div class="headrow"><div class="grade ' + f.grade + '">' + f.grade + '</div><div class="who"><b>' + esc(c.name) + '</b><span>' + cty.flag + ' ' + D.POS[c.pos].name + ' · 16 a ' + c.age + ' anos · pico ' + c.peak + '</span></div></div>' +
      '<div class="verdict">' + esc(f.verdict) + '</div>' +
      '<div class="stats"><div><b>' + T.games + '</b><span>Jogos</span></div><div><b>' + T.goals + '</b><span>Gols</span></div><div><b>' + T.assists + '</b><span>Assistências</span></div>' +
      '<div><b>' + f.titles + '</b><span>Títulos</span></div><div><b>' + T.ballon + '</b><span>Bolas de Ouro</span></div><div><b>' + f.nClubs + '</b><span>Clubes</span></div></div>' +
      '<p class="muted small patr">💰 Patrimônio R$ ' + money(c.money) + (c.buys ? ' · investiu R$ ' + money(c.spent) + ' em ' + c.buys + (c.buys > 1 ? ' compras' : ' compra') : '') + '</p>' +
      '<div class="timeline">' + c.spells.map(s => '<div><span>' + String(YEAR0 + s.from - 16).slice(2) + '–' + String(YEAR0 + s.to - 16 + 1).slice(2) + '</span><span>' + crest(s.club, 'xs') + esc(club(s.club).name) + '</span><span>' + s.goals + 'G ' + s.assists + 'A' + (s.titles ? ' · ' + s.titles + '🏆' : '') + '</span></div>').join('') + '</div>' +
      (Object.keys(c.trophies || {}).length ? '<div class="room-title">Sala de troféus</div><div class="room">' +
        Object.entries(c.trophies).sort((a, b) => ['ballon', 'ucl', 'lib', 'league', 'cup'].indexOf(a[1].type) - ['ballon', 'ucl', 'lib', 'league', 'cup'].indexOf(b[1].type))
          .map(([name, t]) => '<div>' + trophy(t.type, 44) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '') +
      (f.bonus.length ? '<div class="room-title">Despedida</div><ul class="why">' + f.bonus.map(b => '<li><span>' + esc(b.txt) + '</span><b class="up">+' + b.v + '</b></li>').join('') + '</ul>' : '') +
      '<div class="score">' + f.score + ' pontos' + (rank === 1 ? ' · NOVO RECORDE!' : ' · #' + rank + ' no seu Hall da Fama') + '</div>' +
      '</div>' +
      '<button class="btn" id="b-again">Nova carreira</button><button class="btn ghost" id="b-home">Hall da Fama</button>'
    );
    c = null;
    $('bar').hidden = true;
    const cv = $('fut');
    window.CRAQUE_CARD(cv, cardData);
    $('b-share').onclick = async () => {
      const r = await window.CRAQUE_SHARE(cv, shareName);
      if (r === 'download') $('b-share').textContent = 'Imagem salva';
    };
    $('b-again').onclick = create;
    $('b-home').onclick = home;
  }

  home();
})();
