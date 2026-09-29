// Interface — ranking online (servidor em climbix.app/api/rank.php).
// Cada aparelho tem um id aleatório (pid) e um nome no ranking; a carreira é enviada a cada temporada
// e no fim (a pontuação só vale para carreira encerrada). Sem internet, o envio fica na fila e vai depois.
(function () {
  const U = window.CRAQUE_UI;
  const { G, D, S, esc, $, load, store, render } = U;
  const API = window.CLIMBIX_API || (/climbix\.app$/.test(location.hostname) ? '/api/rank.php' : 'https://climbix.app/api/rank.php');
  const PKEY = 'climbix-player', QKEY = 'climbix-rank-queue';
  const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');

  function player() {
    let p = load(PKEY);
    if (!p || !p.pid) { p = { pid: hex(12), nick: '' }; store(PKEY, p); }
    return p;
  }
  // text/plain: sem "preflight" de CORS (funciona também na cópia do GitHub Pages)
  const post = (a, body) => fetch(API + '?a=' + a, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(r => r.json().then(j => (r.ok ? j : Promise.reject(j))));

  function payload(c, f) {
    if (!c.uid) c.uid = hex(10);
    const T = c.totals, main = D.CLUB_BY_ID[(f && f.mainClub) || c.club];
    return {
      id: c.uid, name: c.name, pos: c.pos, country: c.country, club: main ? main.name : '', daily: c.daily || null, done: !!f,
      score: f ? f.score : 0, grade: f ? f.grade : '', peak: c.peak, goals: T.goals, assists: T.assists,
      best_goals: Math.max(0, ...c.seasons.map(s => s.goals || 0)), titles: S.titleCount(T), ballon: T.ballon, seasons: c.seasons.length,
    };
  }
  // Envia (ou guarda na fila, uma entrada por carreira) — nunca trava o jogo
  function flush() {
    const q = load(QKEY) || {}, p = player();
    Object.keys(q).forEach(id => post('save', { pid: p.pid, nick: p.nick || undefined, career: q[id] })
      .then(() => { const q2 = load(QKEY) || {}; if (JSON.stringify(q2[id]) === JSON.stringify(q[id])) { delete q2[id]; store(QKEY, q2); } })
      .catch(() => { /* sem rede: tenta depois */ }));
  }
  function rankSave(c, f) {
    try {
      const q = load(QKEY) || {}, pl = payload(c, f);
      q[pl.id] = pl;
      store(QKEY, q);
      flush();
    } catch (e) { /* ranking é extra: o jogo segue */ }
  }

  // Categorias: [id na API, rótulo, unidade]
  const METRICS = [['score', 'Pontuação', 'pts'], ['daily', 'Carreira do dia', 'pts'], ['peak', 'Nota máxima', ''], ['goals', 'Gols na carreira', 'gols'],
    ['best_goals', 'Gols numa temporada', 'gols'], ['assists', 'Assistências', 'assist.'], ['titles', 'Títulos', 'títulos'], ['ballon', 'Bolas de Ouro', '']];
  const PERIODS = [['day', 'Hoje'], ['week', 'Semana'], ['all', 'Geral']];
  const POS = { ATA: 'ATA', MEI: 'MEI', ZAG: 'ZAG', GOL: 'GOL' };
  let st = { m: 'score', p: 'week' };

  function nickForm(p, msg) {
    return '<div class="card rk-nick"><b>' + (p.nick ? 'Seu nome no ranking: ' + esc(p.nick) : 'Escolha seu nome no ranking') + '</b>' +
      '<p class="muted small">É assim que seus amigos vão te ver. 2 a 16 letras ou números.</p>' +
      '<div class="rk-row"><input id="rk-nick" maxlength="16" autocomplete="off" placeholder="Seu apelido" value="' + esc(p.nick || '') + '"><button class="btn" id="rk-save">Salvar</button></div>' +
      (msg ? '<p class="rk-msg">' + esc(msg) + '</p>' : '') + '</div>';
  }
  function bindNick(onDone) {
    const b = $('rk-save');
    if (!b) return;
    b.onclick = () => {
      const p = player(), nick = $('rk-nick').value.trim();
      b.disabled = true; b.textContent = '…';
      post('nick', { pid: p.pid, nick }).then(() => { p.nick = nick; store(PKEY, p); flush(); onDone(); })
        .catch(e => { b.disabled = false; b.textContent = 'Salvar'; const m = e && e.error === 'nick_taken' ? 'Esse nome já tem dono. Tente outro.' : e && e.error === 'nick_invalid' ? 'Use de 2 a 16 letras ou números.' : 'Sem conexão com o ranking agora.'; onDone(m); });
    };
  }

  // edit: mostra o campo do nome; msg: aviso (nome ocupado, sem conexão...)
  function ranking(edit, msg) {
    G.step = null;
    const p = player();
    edit = edit === true || !!msg;
    const daily = st.m === 'daily';
    render('<button class="back-link" id="b-back-home">‹ Início</button><h2>Ranking</h2>' +
      (!p.nick || edit ? nickForm(p, msg) : '') +
      '<div class="rk-tabs">' + PERIODS.map(([id, l]) => '<button data-p="' + id + '" class="' + (st.p === id && !daily ? 'on' : '') + '"' + (daily ? ' disabled' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<div class="rk-chips">' + METRICS.map(([id, l]) => '<button data-m="' + id + '" class="' + (st.m === id ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
      '<p class="muted small rk-sub">' + (daily ? 'Todo mundo jogando com o mesmo garoto de hoje. Só carreiras encerradas.'
        : st.m === 'score' ? 'Pontuação final das carreiras encerradas' + (st.p === 'day' ? ' hoje.' : st.p === 'week' ? ' nesta semana (desde segunda).' : '.')
        : 'Melhor carreira de cada jogador, inclusive as em andamento' + (st.p === 'day' ? ' (jogadas hoje).' : st.p === 'week' ? ' (jogadas nesta semana).' : '.')) + '</p>' +
      '<div id="rk-list" class="rk-list"><p class="muted">Carregando…</p></div>' +
      (p.nick && !edit ? '<button class="link-btn rk-edit" id="rk-edit">Mudar meu nome (' + esc(p.nick) + ')</button>' : ''));
    $('b-back-home').onclick = U.home;
    screen().querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.p = b.dataset.p; ranking(); });
    screen().querySelectorAll('[data-m]').forEach(b => b.onclick = () => { st.m = b.dataset.m; ranking(); });
    if ($('rk-edit')) $('rk-edit').onclick = () => ranking(true);
    bindNick(m => ranking(false, m));
    const unit = (METRICS.find(x => x[0] === st.m) || [])[2];
    fetch(API + '?a=top&m=' + st.m + '&p=' + st.p + '&pid=' + p.pid).then(r => r.json()).then(d => {
      const el = $('rk-list');
      if (!el) return;
      if (!d.rows || !d.rows.length) { el.innerHTML = '<p class="muted">Ninguém ainda' + (st.p === 'day' || st.m === 'daily' ? ' hoje' : st.p === 'week' ? ' nesta semana' : '') + '. Seja o primeiro!</p>'; return; }
      el.innerHTML = d.rows.map((r, i) => '<div class="rk-item' + (r.me ? ' me' : '') + '"><span class="rk-pos">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1 + 'º') + '</span>' +
        '<span class="rk-who"><b>' + esc(r.nick) + '</b><small>' + esc(r.name) + ' · ' + (POS[r.pos] || '') + (r.club ? ' · ' + esc(r.club) : '') + (r.done ? '' : ' · em andamento') + '</small></span>' +
        '<span class="rk-v">' + r.v + (unit ? '<small>' + unit + '</small>' : '') + '</span></div>').join('') +
        (d.me && d.me.rank > d.rows.length ? '<div class="rk-item me"><span class="rk-pos">' + d.me.rank + 'º</span><span class="rk-who"><b>Você</b></span><span class="rk-v">' + d.me.v + '</span></div>' : '') +
        '<p class="muted small">' + d.players + (d.players === 1 ? ' jogador' : ' jogadores') + ' nesta lista.</p>';
    }).catch(() => { const el = $('rk-list'); if (el) el.innerHTML = '<p class="muted">Sem conexão com o ranking agora. Suas carreiras ficam guardadas e são enviadas depois.</p>'; });
  }
  const screen = () => document.getElementById('screen');

  // No fim da carreira: envia e, se ainda não tem nome, convida a entrar no ranking
  function finaleRank() {
    const p = player();
    setTimeout(() => bindNick(m => { const el = document.querySelector('.rk-fin'); if (el) el.outerHTML = m ? finaleBox(m) : '<p class="rk-fin muted small">✅ Pronto! Sua carreira está no ranking.</p>'; bindNick(() => {}); }), 0);
    return finaleBox();
    function finaleBox(msg) { return p.nick && !msg ? '<p class="rk-fin muted small">🏆 Carreira enviada ao ranking como <b>' + esc(p.nick) + '</b>.</p>' : '<div class="rk-fin">' + nickForm(p, msg) + '</div>'; }
  }

  flush(); // o que ficou pendente da última vez
  Object.assign(U, { ranking, rankSave, finaleRank, rankPlayer: player });
})();
