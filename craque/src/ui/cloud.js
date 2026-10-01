// Interface — conta e save na nuvem (servidor em climbix.app/api/account.php).
// Com login, o jogo junta o que está no aparelho com o que está na nuvem e guarda de volta:
// carreira em andamento (vale a mais recente), coleção, Hall da Fama, conquistas e carreira do dia.
(function () {
  const U = window.CRAQUE_UI;
  const { G, esc, $, load, store, render, bar, SAVE, HALL } = U;
  const API = window.CLIMBIX_ACCOUNT_API || (/climbix\.app$/.test(location.hostname) ? '/api/account.php' : 'https://climbix.app/api/account.php');
  const AKEY = 'climbix-account', PKEY = 'climbix-player';
  const KEYS = { save: SAVE, hall: HALL, col: 'climbix-colecao-v1', ach: 'craque-ach-v1', daily: 'craque-daily-v1', sala: 'climbix-sala-v1' };
  const post = (a, body) => fetch(API + '?a=' + a, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), keepalive: a === 'push' })
    .then(r => r.json().then(j => (r.ok ? j : Promise.reject(j))));
  const acc = () => load(AKEY);
  let state = 'idle'; // idle | syncing | ok | offline

  // ---------- juntar aparelho + nuvem ----------
  function local() { const o = {}; for (const k in KEYS) o[k] = load(KEYS[k]); return o; }
  function merge(a, b) {
    a = a || {}; b = b || {};
    const o = {};
    // Carreira: a salva mais recentemente (fim de carreira também conta, para não "ressuscitar" uma antiga)
    const at = s => (s && s.at) || 0;
    o.save = at(b.save) > at(a.save) ? b.save : a.save || b.save || null;
    // Coleção: junta as carreiras (a mesma carreira não entra duas vezes)
    const seen = new Set(), col = [];
    (a.col || []).concat(b.col || []).forEach(e => { const k = e && e.at + ':' + (e.card && e.card.name); if (e && !seen.has(k)) { seen.add(k); col.push(e); } });
    o.col = col.length ? col.sort((x, y) => x.at - y.at) : null;
    // Hall da Fama: as 10 melhores das duas listas
    const hs = new Set(), hall = [];
    (a.hall || []).concat(b.hall || []).forEach(h => { const k = h && h.name + ':' + h.score; if (h && !hs.has(k)) { hs.add(k); hall.push(h); } });
    o.hall = hall.length ? hall.sort((x, y) => y.score - x.score).slice(0, 10) : null;
    // Sala de Troféus: todas as taças das duas (a mesma conquista não entra duas vezes)
    o.sala = U.salaMerge ? U.salaMerge(a.sala, b.sala) : a.sala || b.sala || null;
    // Conquistas: todas as das duas
    o.ach = Object.assign({}, b.ach || {}, a.ach || {});
    // Carreira do dia: o melhor resultado de cada dia
    o.daily = Object.assign({}, b.daily || {});
    Object.entries(a.daily || {}).forEach(([d, r]) => { if (!o.daily[d] || (r && r.score > o.daily[d].score)) o.daily[d] = r; });
    return o;
  }
  function apply(m) { for (const k in KEYS) if (m[k] !== undefined && m[k] !== null) raw(KEYS[k], m[k]); }
  // Grava sem avisar a nuvem de novo (evita laço)
  const raw = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço */ } };

  // Sincroniza: puxa, junta, grava no aparelho e manda de volta
  let busy = null, again = false;
  function sync() {
    const a = acc();
    if (!a) return Promise.resolve(false);
    if (busy) { again = true; return busy; }
    state = 'syncing'; paint();
    busy = post('pull', { token: a.token }).then(r => {
      const before = JSON.stringify(local());
      const m = merge(local(), r.save);
      apply(m);
      adopt(r);
      return post('push', { token: a.token, data: m }).then(() => JSON.stringify(local()) !== before);
    }).then(changed => { state = 'ok'; return changed; }, e => {
      if (e && e.error === 'auth') { localStorage.removeItem(AKEY); state = 'idle'; }
      else state = 'offline';
      return false;
    }).finally(() => { busy = null; paint(); if (again) { again = false; sync(); } });
    return busy;
  }
  // O ranking passa a usar o jogador da conta (mesmo nome em todos os aparelhos)
  function adopt(r) { if (r && r.pid) raw(PKEY, { pid: r.pid, nick: r.nick || r.user || '' }); }

  // Mudou algo que vai para a nuvem: sincroniza alguns segundos depois
  let timer = 0;
  function touch(key) {
    if (!acc() || !Object.values(KEYS).includes(key)) return;
    clearTimeout(timer); timer = setTimeout(sync, 4000);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearTimeout(timer); timer = 0; sync(); } });

  // ---------- telas ----------
  // Linha na tela inicial
  function homeLine() {
    const a = acc();
    return '<button class="hg" id="b-cloud"><i>' + U.ICON.cloud + '</i><b>' + (a ? esc(a.user) : 'Conta') + '</b><small' + (a ? ' id="cloud-st">' + stTxt() : '>salvar na nuvem') + '</small></button>';
  }
  const stTxt = () => ({ syncing: 'salvando…', ok: 'salvo na nuvem', offline: 'sem conexão (salva depois)', idle: 'salvo na nuvem' })[state];
  function paint() { const el = $('cloud-st'); if (el) el.textContent = stTxt(); }

  function screen(mode, msg) {
    G.c = null; G.step = null; bar();
    const a = acc();
    if (a) {
      render('<button class="back-link" id="b-back-home">‹ Início</button><div class="eyebrow">Conta</div><h2>' + esc(a.user) + '</h2>' +
        '<p class="lead">Seu jogo fica salvo na nuvem: carreira em andamento, coleção, Hall da Fama e conquistas. Entre com o mesmo usuário em outro aparelho para continuar.</p>' +
        '<p class="muted" id="cloud-msg">' + stTxt() + '</p>' +
        '<button class="btn" id="b-sync">Sincronizar agora</button><button class="btn ghost" id="b-logout">Sair desta conta</button>');
      $('b-back-home').onclick = U.home;
      $('b-sync').onclick = () => { $('cloud-msg').textContent = 'salvando…'; sync().then(() => { $('cloud-msg').textContent = stTxt(); }); };
      $('b-logout').onclick = () => U.ask('Sair da conta?', 'O jogo continua neste aparelho; só para de salvar na nuvem.', 'Sair', () => {
        post('logout', { token: a.token }).catch(() => {});
        localStorage.removeItem(AKEY); state = 'idle'; U.home();
      });
      return;
    }
    const reg = mode === 'register';
    render('<button class="back-link" id="b-back-home">‹ Início</button><div class="eyebrow">Salvar na nuvem</div><h2>' + (reg ? 'Criar conta' : 'Entrar') + '</h2>' +
      '<p class="lead">' + (reg ? 'Seu usuário também vira seu nome no ranking.' : 'Continue suas carreiras em qualquer aparelho.') + '</p>' +
      '<form class="acc-form" id="acc-form" autocomplete="on">' +
      '<div class="field"><label for="acc-user">Usuário</label><input id="acc-user" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16" required></div>' +
      '<div class="field"><label for="acc-pass">Senha</label><input id="acc-pass" name="password" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" minlength="6" required></div>' +
      (msg ? '<p class="acc-err">' + esc(msg) + '</p>' : '') +
      '<button class="btn" id="acc-go" type="submit">' + (reg ? 'Criar conta' : 'Entrar') + '</button></form>' +
      '<button class="link-btn" id="acc-switch">' + (reg ? 'Já tenho conta: entrar' : 'Não tenho conta: criar agora') + '</button>' +
      (reg ? '<p class="muted small">Guarde bem a senha: não dá para recuperar por e-mail.</p>' : ''));
    $('b-back-home').onclick = U.home;
    $('acc-switch').onclick = () => screen(reg ? 'login' : 'register');
    $('acc-form').onsubmit = e => {
      e.preventDefault();
      const user = $('acc-user').value.trim(), pass = $('acc-pass').value, b = $('acc-go');
      b.disabled = true; b.textContent = reg ? 'Criando…' : 'Entrando…';
      const p = load(PKEY) || {};
      const pid = p.pid || Array.from(crypto.getRandomValues(new Uint8Array(12)), x => x.toString(16).padStart(2, '0')).join('');
      post(reg ? 'register' : 'login', reg ? { user, pass, pid } : { user, pass }).then(r => {
        store(AKEY, { user: r.user, token: r.token });
        adopt(r);
        // Junta o que já tinha neste aparelho com o que estava na conta
        const m = merge(local(), r.save);
        apply(m);
        return post('push', { token: r.token, data: m });
      }).then(() => { state = 'ok'; U.home(); }).catch(err => {
        const e = err && err.error;
        screen(mode, e === 'wrong' ? 'Usuário ou senha errados.' : e === 'user_taken' ? 'Esse usuário já existe. Escolha outro.' : e === 'user_invalid' ? 'Use de 3 a 16 letras, números, ponto, _ ou -.'
          : e === 'pass_short' ? 'A senha precisa ter pelo menos 6 caracteres.' : e === 'limit' ? 'Muitas tentativas. Espere alguns minutos.' : 'Sem conexão agora. Tente de novo.');
      });
    };
  }

  // Abriu o jogo com conta: busca o que mudou em outro aparelho
  function boot() {
    if (!acc()) return;
    sync().then(changed => { if (changed && !G.c && document.getElementById('b-new')) U.home(); });
  }

  window.CLIMBIX_CLOUD = { touch, sync };
  Object.assign(U, { cloudLine: homeLine, cloud: screen, cloudBoot: boot, cloudMerge: merge });
})();
