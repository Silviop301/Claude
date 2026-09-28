// Telas e fluxo do CRAQUE: criar → base → [característica → evento → temporada → janela] → aposentadoria.
(function () {
  const D = window.CRAQUE_DATA, S = window.CRAQUE_SIM;
  const $ = id => document.getElementById(id);
  const screen = $('screen');
  const SAVE = 'craque-v2', HALL = 'craque-hall-v1';
  const YEAR0 = 2026;
  let c = null;      // carreira atual
  let step = null;   // etapa atual (para retomar)

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : v >= 1e3 ? Math.round(v / 1e3) + ' mil' : String(v));
  const club = id => D.CLUB_BY_ID[id];
  const league = id => D.LEAGUE_BY_ID[club(id).league];
  const stars = t => '★'.repeat(t) + '☆'.repeat(5 - t);
  const year = () => YEAR0 + c.season;
  const crest = (id, cls) => '<img class="crest' + (cls ? ' ' + cls : '') + '" src="badges/' + id + '.png" alt="" loading="lazy">';
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
    const cl = club(c.club), lg = league(c.club);
    $('bar-name').textContent = c.name;
    $('bar-sub').innerHTML = crest(cl.id, 'xs') + esc(cl.name) + ' · ' + c.age + ' anos';
    $('bar-rel').innerHTML = meter('👔 Técnico', c.rel.coach) + meter('📣 Torcida', c.rel.fans);
    const T = c.totals;
    $('bar-tot').innerHTML = '<span>' + T.goals + '<small>GOLS</small></span><span>' + T.assists + '<small>ASSIST</small></span><span>' + (T.league + T.cup + T.cont) + '<small>TAÇAS</small></span>';
    const o = S.ovr(c);
    const el = $('bar-ovr');
    el.textContent = o;
    if (o > lastOvr && lastOvr) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    lastOvr = o;
  }

  // ---------- início ----------
  function home() {
    c = null; step = null; bar();
    const saved = load(SAVE);
    const hall = load(HALL) || [];
    render(
      '<div class="eyebrow">Protótipo 2</div><h1>CRAQUE</h1>' +
      '<p class="lead">Crie um garoto de 16 anos, escolha propostas, monte o estilo dele e descubra se ele vira lenda.</p>' +
      (saved && saved.c ? '<button class="btn" id="b-cont">Continuar carreira de ' + esc(saved.c.name) + '</button>' : '') +
      '<button class="btn' + (saved && saved.c ? ' ghost' : '') + '" id="b-new">Nova carreira</button>' +
      (hall.length ? '<div class="eyebrow" style="margin-top:8px">Hall da Fama</div><div class="hall">' +
        hall.map(h => '<div><b>' + h.grade + '</b><span>' + esc(h.name) + ' · ' + esc(h.verdict) + '<br><small>' + h.goals + ' gols · ' + h.assists + ' assist. · ' + h.titles + ' taças' + (h.ballon ? ' · ' + h.ballon + ' Bola' + (h.ballon > 1 ? 's' : '') + ' de Ouro' : '') + '</small></span><span class="muted">' + h.score + '</span></div>').join('') + '</div>' : '')
    );
    if ($('b-cont')) $('b-cont').onclick = () => { c = saved.c; resume(saved.step); };
    $('b-new').onclick = create;
  }

  function resume(st) {
    step = st;
    bar();
    if (!c.club) return academy();
    if (S.mustRetire(c)) return finale();
    if (st === 'offers') return windowOffers();
    if (st === 'event') return eventScreen();
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
      '<div class="field"><label>Pé bom</label><div class="seg" id="f-foot"><button data-v="D" class="on">Destro</button><button data-v="E">Canhoto</button></div></div>' +
      '<div class="field"><label>País</label><div class="seg" id="f-country">' + D.COUNTRIES.map((k, j) => '<button data-v="' + k.id + '"' + (j ? '' : ' class="on"') + ' aria-label="' + k.id + '">' + k.flag + '</button>').join('') + '</div></div>' +
      '<button class="btn" id="b-go">Começar carreira</button>'
    );
    [['f-pos', 'pos'], ['f-foot', 'foot'], ['f-country', 'country']].forEach(([id, key]) => {
      $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
        $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st[key] = b.dataset.v;
      });
    });
    $('b-go').onclick = () => {
      const name = $('f-name').value.trim() || D.NICKNAMES[i];
      c = S.newCareer({ name, pos: st.pos, foot: st.foot, country: st.country });
      academy();
    };
  }

  // ---------- propostas ----------
  function offerCard(o, idx) {
    const cl = club(o.club), lg = league(o.club);
    const kinds = { base: ['Base', ''], up: ['Clube maior', 'blue'], mid: ['Protagonista', 'green'], money: ['Proposta milionária', 'gold'], home: ['Volta pra casa', 'red'], stay: ['Ficar', ''] };
    const [kname, kcls] = kinds[o.kind] || ['', ''];
    const roleCls = o.share >= 0.78 ? 'green' : o.share >= 0.5 ? 'blue' : 'red';
    return '<button class="choice offer card" data-i="' + idx + '" style="display:flex">' +
      '<div class="top"><span class="club">' + crest(cl.id) + esc(cl.name) + '</span><span class="stars">' + stars(cl.tier) + '</span></div>' +
      '<div class="lg">' + lg.flag + ' ' + lg.name + ' · força ' + cl.strength + '</div>' +
      '<div class="facts">' + (kname ? '<span class="tag ' + kcls + '">' + kname + '</span>' : '') +
      '<span class="tag ' + roleCls + '">' + o.role + '</span><span class="tag">R$ ' + money(o.wage) + '/sem</span></div></button>';
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
    const offers = S.offers(c, false);
    const all = offers.concat([S.stayOffer(c)]);
    const canRet = S.canRetire(c);
    const noOffers = !offers.length;
    render(
      '<div class="eyebrow">Janela de transferências · ' + year() + '</div>' +
      '<h2>' + (noOffers ? 'Nenhum clube novo te procurou' : 'Chegaram propostas') + '</h2>' +
      '<p class="lead">Nota geral ' + S.ovr(c) + ' · fama ' + Math.round(c.fame) + '. A última opção é ficar onde está.</p>' +
      '<div class="choices">' + all.map(offerCard).join('') + '</div>' +
      (canRet ? '<button class="btn ghost" id="b-retire">Pendurar as chuteiras</button>' : '')
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      S.join(c, all[+b.dataset.i]);
      preseason();
    });
    if ($('b-retire')) $('b-retire').onclick = finale;
  }

  // ---------- pré-temporada: característica ----------
  function traitsHtml() {
    if (!c.traits.length) return '';
    const syn = S.synergies(c);
    return '<div class="chips">' + c.traits.map(id => '<span class="chip">' + D.TRAIT_BY_ID[id].icon + ' ' + D.TRAIT_BY_ID[id].name + '</span>').join('') +
      syn.map(s => '<span class="chip syn">' + s.icon + ' ' + s.name + '</span>').join('') + '</div>';
  }

  function preseason() {
    step = 'preseason';
    save();
    bar();
    const ch = S.traitChoices(c);
    if (!ch.length) return eventOrSeason();
    render(
      '<div class="eyebrow">Pré-temporada · ' + year() + '</div><h2>Escolha uma característica</h2>' + traitsHtml() +
      '<div class="choices">' + ch.map((x, i) =>
        '<button class="choice' + (x.completes ? ' combo' : '') + '" data-i="' + i + '"><span class="ic">' + x.trait.icon + '</span><b>' + x.trait.name + '</b>' +
        '<span class="d">' + x.trait.desc + (x.completes ? '<br><span class="tag gold">Completa: ' + x.completes.icon + ' ' + x.completes.name + '</span>' : '') + '</span></button>').join('') +
      '</div>'
    );
    screen.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const syn = S.addTrait(c, ch[+b.dataset.i].trait.id);
      bar();
      if (syn) {
        render('<div class="eyebrow">Combinação desbloqueada</div><div class="award ballon">' + syn.icon + ' ' + syn.name + '</div><p class="lead">' + syn.desc + '</p><button class="btn" id="b-next">Continuar</button>');
        $('b-next').onclick = eventOrSeason;
      } else eventOrSeason();
    });
  }

  // ---------- evento ----------
  let pendingEvent = null;
  function eventOrSeason() {
    pendingEvent = S.pickEvent(c);
    if (!pendingEvent) return season();
    step = 'event';
    save();
    eventScreen();
  }

  function eventScreen() {
    if (!pendingEvent) pendingEvent = S.pickEvent(c);
    if (!pendingEvent) return season();
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
      $('b-next').onclick = season;
    });
  }

  // ---------- temporada ----------
  function season() {
    const res = S.playSeason(c);
    step = 'offers';
    save();
    const cl = club(res.club);
    render(
      '<div class="season-head"><div><div class="eyebrow">Temporada ' + (year() - 1) + ' · ' + res.age + ' anos</div><h2 class="with-crest">' + crest(cl.id, 'lg') + esc(cl.name) + '</h2></div><span class="tag">' + res.role + '</span></div>' +
      '<div class="counters"><div class="counter"><b id="k-j">0</b><span>Jogos</span></div><div class="counter"><b id="k-g">0</b><span>Gols</span></div>' +
      '<div class="counter"><b id="k-a">0</b><span>Assist.</span></div><div class="counter rate"><b id="k-n">–</b><span>Nota</span></div></div>' +
      '<div class="feed" id="feed"></div><div id="after"></div>'
    );
    const dur = 1800, t0 = performance.now();
    let skip = false;
    screen.onclick = () => { skip = true; };
    (function tick(now) {
      const u = skip ? 1 : Math.min(1, (now - t0) / dur);
      $('k-j').textContent = Math.round(res.games * u);
      $('k-g').textContent = Math.round(res.goals * u);
      $('k-a').textContent = Math.round(res.assists * u);
      if (u < 1) return requestAnimationFrame(tick);
      $('k-n').textContent = res.games ? res.rating.toFixed(1).replace('.', ',') : '–';
      screen.onclick = null;
      summary(res);
    })(t0);
  }

  function summary(res) {
    const feed = $('feed');
    res.highlights.forEach(h => { const d = document.createElement('div'); d.textContent = h; feed.appendChild(d); });
    const dOvr = res.ovr1 - res.ovr0;
    const fin = S.mustRetire(c);
    $('after').innerHTML =
      (res.titles.length ? '<div class="titles">' + res.titles.map(t => '<div class="title-won">' + trophy(titleType(t), 54) + '<span>Campeão<br><b>' + esc(t.name) + '</b></span></div>').join('') + '</div>' : '') +
      '<div class="awards">' + res.awards.map(a => '<div class="award' + (a.id === 'ballon' ? ' ballon' : '') + '">' + (a.id === 'ballon' ? trophy('ballon', 44) + ' ' : '🥇 ') + a.name + '</div>').join('') + '</div>' +
      '<div class="news"><div class="np">O GLOBO ESPORTIVO</div>' + res.headlines.map(h => '<p>' + esc(h) + '</p>').join('') + '</div>' +
      '<p class="delta ' + (dOvr >= 0 ? 'up' : 'down') + '">Nota geral ' + res.ovr0 + ' → ' + res.ovr1 + ' (' + (dOvr >= 0 ? '+' : '') + dOvr + ')</p>' +
      '<p class="rel-delta">👔 Técnico ' + res.coach0 + ' → ' + res.coach1 + ' · 📣 Torcida ' + res.fans0 + ' → ' + res.fans1 + ' (' + S.relLabel(res.fans1) + ')</p>' +
      (fin ? '<p class="lead">Aos ' + c.age + ' anos, o corpo pediu para parar.</p><button class="btn" id="b-next">Ver sua carreira</button>'
        : '<button class="btn" id="b-next">Janela de transferências</button>');
    bar();
    $('b-next').onclick = fin ? finale : windowOffers;
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
    render(
      '<div class="eyebrow">Fim de carreira · ' + (YEAR0 + c.season) + '</div>' +
      '<div class="final">' +
      '<div class="headrow"><div class="grade ' + f.grade + '">' + f.grade + '</div><div class="who"><b>' + esc(c.name) + '</b><span>' + cty.flag + ' ' + D.POS[c.pos].name + ' · 16 a ' + c.age + ' anos · pico ' + c.peak + '</span></div></div>' +
      '<div class="verdict">' + esc(f.verdict) + '</div>' +
      '<div class="stats"><div><b>' + T.games + '</b><span>Jogos</span></div><div><b>' + T.goals + '</b><span>Gols</span></div><div><b>' + T.assists + '</b><span>Assistências</span></div>' +
      '<div><b>' + f.titles + '</b><span>Títulos</span></div><div><b>' + T.ballon + '</b><span>Bolas de Ouro</span></div><div><b>' + f.nClubs + '</b><span>Clubes</span></div></div>' +
      '<div class="timeline">' + c.spells.map(s => '<div><span>' + String(YEAR0 + s.from - 16).slice(2) + '–' + String(YEAR0 + s.to - 16 + 1).slice(2) + '</span><span>' + crest(s.club, 'xs') + esc(club(s.club).name) + '</span><span>' + s.goals + 'G ' + s.assists + 'A' + (s.titles ? ' · ' + s.titles + '🏆' : '') + '</span></div>').join('') + '</div>' +
      (Object.keys(c.trophies || {}).length ? '<div class="room-title">Sala de troféus</div><div class="room">' +
        Object.entries(c.trophies).sort((a, b) => ['ballon', 'ucl', 'lib', 'league', 'cup'].indexOf(a[1].type) - ['ballon', 'ucl', 'lib', 'league', 'cup'].indexOf(b[1].type))
          .map(([name, t]) => '<div>' + trophy(t.type, 44) + '<b>' + t.n + 'x</b><span>' + esc(name) + '</span></div>').join('') + '</div>' : '') +
      '<div class="score">' + f.score + ' pontos' + (rank === 1 ? ' · NOVO RECORDE!' : ' · #' + rank + ' no seu Hall da Fama') + '</div>' +
      '</div>' +
      '<button class="btn" id="b-again">Nova carreira</button><button class="btn ghost" id="b-home">Hall da Fama</button>'
    );
    c = null;
    $('bar').hidden = true;
    $('b-again').onclick = create;
    $('b-home').onclick = home;
  }

  home();
})();
