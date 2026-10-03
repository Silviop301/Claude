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

  // Categorias: [id na API, rótulo, unidade]. A carreira do dia saiu por enquanto (a disputa é na carreira normal)
  const METRICS = [['score', 'Pontuação', 'pts'], ['peak', 'Overall máximo', 'OVR'], ['goals', 'Gols', 'gols'], ['assists', 'Assistências', 'assist.'],
    ['titles', 'Títulos', 'títulos'], ['ballon', 'Bolas de Ouro', 'bolas']];
  const PERIODS = [['week', 'Semana'], ['all', 'Geral'], ['day', 'Hoje']];
  const POS = { ATA: 'Atacante', MEI: 'Meia', ZAG: 'Zagueiro', GOL: 'Goleiro' };
  let st = { m: 'score', p: 'week' };

  // Ícone do ranking: pódio com os três degraus (ouro no meio, prata e bronze dos lados)
  const podium = (size) => '<svg class="podium-ico" viewBox="0 0 48 48" width="' + (size || 40) + '" height="' + (size || 40) + '" aria-hidden="true">' +
    '<path d="M24 3.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7Z" fill="#F4D675" stroke="#8A6400" stroke-width="1"/>' +
    '<rect x="16.5" y="19" width="15" height="25" rx="2" fill="#F2C230" stroke="#8A6400" stroke-width="1.4"/>' +
    '<rect x="2.5" y="27" width="14" height="17" rx="2" fill="#D9DEE4" stroke="#6B7682" stroke-width="1.4"/>' +
    '<rect x="31.5" y="32" width="14" height="12" rx="2" fill="#D99A6A" stroke="#6E4021" stroke-width="1.4"/>' +
    '<text x="24" y="35" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="12" fill="#5A4100">1</text>' +
    '<text x="9.5" y="39.5" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="10" fill="#3F4852">2</text>' +
    '<text x="38.5" y="41.5" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="9" fill="#4A2A14">3</text></svg>';
  const fmt = v => Number(v).toLocaleString('pt-BR');
  const gradeTag = g => (g ? '<span class="rk-g g' + g + '">' + g + '</span>' : '');

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

  // Subtítulo conforme período e categoria
  const when = () => (st.p === 'day' ? 'hoje' : st.p === 'week' ? 'nesta semana' : 'de todos os tempos');
  const subTxt = () => (st.m === 'score' ? 'Pontuação final das carreiras encerradas ' + when() + '. Vale a melhor carreira de cada um.'
    : 'Melhor carreira de cada jogador ' + when() + ', inclusive as em andamento.');

  // Bloco da tela inicial: o pódio e a sua posição na semana (chega depois, sem travar a tela)
  function homeCard() {
    setTimeout(() => {
      const p = player();
      fetch(API + '?a=top&m=score&p=week&pid=' + p.pid).then(r => r.json()).then(d => {
        const el = document.getElementById('rk-home-sub');
        if (!el) return;
        const lead = d.rows && d.rows[0];
        el.innerHTML = d.me ? 'Você está em <b>' + d.me.rank + 'º</b> na semana · ' + fmt(d.me.v) + ' pts'
          : lead ? (lead.cpu ? 'Líder: <b>' + nickOf(lead) + '</b>' : 'Líder da semana: <b>' + esc(lead.nick) + '</b>') + ' · ' + fmt(lead.v) + ' pts' : 'Ninguém pontuou nesta semana ainda. Seja o primeiro!';
      }).catch(() => {});
    }, 0);
    return '<button class="rk-home" id="b-rank">' + podium(46) + '<span class="rk-home-t"><b>Ranking</b><small id="rk-home-sub">Quem fez a maior carreira da semana?</small></span>' +
      '<span class="rk-home-go">' + U.ICON['chevron-right'] + '</span></button>';
  }

  // edit: mostra o campo do nome; msg: aviso (nome ocupado, sem conexão...)
  function ranking(edit, msg) {
    G.step = null;
    const p = player();
    edit = edit === true || !!msg;
    render('<button class="back-link" id="b-back-home">‹ Voltar</button>' +
      '<div class="rk-head">' + podium(56) + '<div><div class="eyebrow">Ranking</div><h2>Quem fez a maior carreira?</h2></div></div>' +
      (!p.nick || edit ? nickForm(p, msg) : '') +
      '<div class="rk-tabs">' + PERIODS.map(([id, l]) => '<button data-p="' + id + '">' + l + '</button>').join('') + '</div>' +
      '<div class="rk-chips">' + METRICS.map(([id, l]) => '<button data-m="' + id + '">' + l + '</button>').join('') + '</div>' +
      '<p class="muted small rk-sub"></p>' +
      '<div id="rk-list" class="rk-list"></div>' +
      (p.nick && !edit ? '<button class="link-btn rk-edit" id="rk-edit">Mudar meu nome (' + esc(p.nick) + ')</button>' : ''));
    $('b-back-home').onclick = U.goBack;
    // Trocar aba ou categoria não redesenha a tela: só o destaque, o subtítulo e a lista (a rolagem fica onde estava)
    screen().querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.p = b.dataset.p; refresh(); });
    screen().querySelectorAll('[data-m]').forEach(b => b.onclick = () => { st.m = b.dataset.m; refresh(); });
    if ($('rk-edit')) $('rk-edit').onclick = () => ranking(true);
    bindNick(m => ranking(false, m));
    refresh(true);
  }
  let req = 0; // só a última lista pedida aparece (toques rápidos não misturam resultados)
  function refresh(first) {
    const p = player(), sc = screen();
    sc.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', st.p === b.dataset.p));
    sc.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', st.m === b.dataset.m));
    // Categoria escolhida sempre à vista na fileira que rola para o lado
    const on = sc.querySelector('.rk-chips .on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: first ? 'nearest' : 'center', behavior: first ? 'auto' : 'smooth' });
    const sub = sc.querySelector('.rk-sub'); if (sub) sub.textContent = subTxt();
    const el = $('rk-list');
    if (!el) return;
    el.innerHTML = '<p class="muted">Carregando…</p>';
    const my = ++req;
    const unit = (METRICS.find(x => x[0] === st.m) || [])[2];
    const val = r => '<span class="rk-v">' + fmt(r.v) + (unit ? '<small>' + unit + '</small>' : '') + '</span>';
    const who = r => esc(r.name) + ' · ' + (POS[r.pos] || '') + (r.club ? ' · ' + esc(r.club) : '') + (r.done ? '' : ' · em andamento');
    fetch(API + '?a=top&m=' + st.m + '&p=' + st.p + '&pid=' + p.pid).then(r => r.json()).then(d => {
      const el2 = $('rk-list');
      if (!el2 || my !== req) return;
      if (!d.rows || !d.rows.length) { el2.innerHTML = '<p class="muted rk-empty">Ninguém ainda ' + when() + '. Termine uma carreira e seja o primeiro!</p>'; return; }
      const top = d.rows.slice(0, 3), rest = d.rows.slice(3);
      // Pódio: 2º à esquerda, 1º no meio (mais alto), 3º à direita
      const step = (r, i) => !r ? '<div class="rk-step empty"></div>' : '<div class="rk-step s' + (i + 1) + (r.me ? ' me' : '') + '"><span class="rk-medal">' + (i + 1) + '</span>' +
        '<b class="rk-nk">' + nickOf(r) + '</b><small>' + esc(r.name) + '</small>' + gradeTag(st.m === 'score' ? r.grade : '') + val(r) + '<i class="rk-block"></i></div>';
      el2.innerHTML = (d.robots ? '<p class="rk-bots">' + U.emo('🤖', 'xs') + ' <b>Supere os robôs!</b> Carreiras jogadas pelo próprio jogo. Só um deles tirou nota S.</p>' : '') +
        '<div class="rk-podium">' + step(top[1], 1) + step(top[0], 0) + step(top[2], 2) + '</div>' +
        rest.map((r, i) => '<div class="rk-item' + (r.me ? ' me' : '') + '"><span class="rk-pos">' + (i + 4) + 'º</span>' +
          '<span class="rk-who"><b>' + nickOf(r) + '</b><small>' + who(r) + '</small></span>' + (st.m === 'score' ? gradeTag(r.grade) : '') + val(r) + '</div>').join('') +
        // Sua posição: sempre à vista, mesmo fora do top 30
        (d.me && d.me.rank > d.rows.length ? '<div class="rk-item me rk-mine"><span class="rk-pos">' + d.me.rank + 'º</span><span class="rk-who"><b>Você</b><small>' + esc(d.me.name || '') + '</small></span>' + (st.m === 'score' ? gradeTag(d.me.grade) : '') + val(d.me) + '</div>'
          : !d.me && p.nick ? '<p class="muted small rk-none">Você ainda não aparece aqui ' + when() + '.</p>' : '') +
        '<p class="muted small">' + d.players + (d.players === 1 ? ' jogador' : ' jogadores') + (d.robots ? ' e ' + d.robots + (d.robots === 1 ? ' robô' : ' robôs') : '') + ' nesta lista.</p>';
    }).catch(() => { const el2 = $('rk-list'); if (el2 && my === req) el2.innerHTML = '<p class="muted">Sem conexão com o ranking agora. Suas carreiras ficam guardadas e são enviadas depois.</p>'; });
  }
  const screen = () => document.getElementById('screen');
  // Robôs do ranking (carreiras do simulador): sempre com o selo, nunca passam por gente de verdade
  const nickOf = r => (r.cpu ? U.emo('🤖', 'xs') + ' ' : '') + esc(r.nick);

  // No fim da carreira: envia e, se ainda não tem nome, convida a entrar no ranking
  function finaleRank() {
    const p = player();
    setTimeout(() => bindNick(m => { const el = document.querySelector('.rk-fin'); if (el) el.outerHTML = m ? finaleBox(m) : '<p class="rk-fin muted small">' + U.emo('✅', 'xs') + ' Pronto! Sua carreira está no ranking.</p>'; bindNick(() => {}); }), 0);
    return finaleBox();
    function finaleBox(msg) { return p.nick && !msg ? '<p class="rk-fin muted small">' + U.emo('🏆', 'xs') + ' Carreira enviada ao ranking como <b>' + esc(p.nick) + '</b>.</p>' : '<div class="rk-fin">' + nickForm(p, msg) + '</div>'; }
  }

  flush(); // o que ficou pendente da última vez
  Object.assign(U, { ranking, rankSave, finaleRank, rankPlayer: player, rankHome: homeCard, podiumIcon: podium });
})();
