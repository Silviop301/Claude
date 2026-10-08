// Interface — conta e save na nuvem (servidor em climbix.app/api/account.php).
// Com login, o jogo junta o que está no aparelho com o que está na nuvem e guarda de volta:
// carreira em andamento (vale a mais recente), coleção, Hall da Fama, conquistas, carreira do dia e itens.
// Entrar com Google, GitHub ou Discord (api/oauth.php): o aparelho guarda um "verifier", vai para o serviço e volta
// com #climbix-oauth=<código>. O código só vale junto com o verifier deste aparelho.
(function () {
  const U = window.CRAQUE_UI;
  const { G, esc, $, load, store, render, bar, SAVE, HALL } = U;
  const API = window.CLIMBIX_ACCOUNT_API || (/climbix\.app$/.test(location.hostname) ? '/api/account.php' : 'https://climbix.app/api/account.php');
  const OAPI = API.replace(/account\.php$/, 'oauth.php');
  const AKEY = 'climbix-account', PKEY = 'climbix-player', OKEY = 'climbix-oauth';
  const KEYS = { save: SAVE, hall: HALL, col: 'climbix-colecao-v1', ach: 'craque-ach-v1', daily: 'craque-daily-v1', sala: 'climbix-sala-v1', itens: 'climbix-itens-v1', reset: 'climbix-reset' };
  // keepalive deixa o save terminar de subir com o app fechando, mas o navegador recusa corpo acima de 64 KB:
  // save grande (coleção cheia) vai sem keepalive
  const post = (a, body, url) => { const b = JSON.stringify(body);
    return fetch((url || API) + '?a=' + a, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: b, keepalive: a === 'push' && new Blob([b]).size < 60000 })
      .then(r => r.json().then(j => {
        if (r.ok) return j;
        if (j && j.error === 'auth' && url !== OAPI) localStorage.removeItem(AKEY); // sessão encerrada (ex.: senha trocada em outro aparelho)
        return Promise.reject(j);
      })); };
  const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => x.toString(16).padStart(2, '0')).join('');
  const acc = () => load(AKEY);
  let state = 'idle'; // idle | syncing | ok | offline

  // ---------- juntar aparelho + nuvem ----------
  function local() { const o = {}; for (const k in KEYS) o[k] = load(KEYS[k]); return o; }
  function merge(a, b) {
    a = a || {}; b = b || {};
    // Progresso reiniciado (Conta): o lado que é de antes do reinício não volta
    const ra = a.reset || 0, rb = b.reset || 0;
    if (ra < rb) a = {}; else if (rb < ra) b = {};
    const o = { reset: Math.max(ra, rb) || null };
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
    // Itens (pacotinhos): todos os liberados nos dois aparelhos
    o.itens = U.ITEMS ? U.ITEMS.merge(a.itens, b.itens) : a.itens || b.itens || null;
    // Conquistas: todas as das duas
    o.ach = Object.assign({}, b.ach || {}, a.ach || {});
    // Carreira do dia: o melhor resultado de cada dia
    o.daily = Object.assign({}, b.daily || {});
    Object.entries(a.daily || {}).forEach(([d, r]) => { if (!o.daily[d] || (r && r.score > o.daily[d].score)) o.daily[d] = r; });
    return o;
  }
  function apply(m) { for (const k in KEYS) if (m[k] !== undefined && m[k] !== null) raw(KEYS[k], m[k]); if (U.ITEMS) U.ITEMS.reset(); }
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
      keep(r);
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
  // O que a tela da conta mostra: serviços ligados e senha
  function keep(r) { const a = acc(); if (a && r && r.links) raw(AKEY, Object.assign(a, { links: r.links, pass: !!r.pass, needold: !!r.needold })); }

  // Mudou algo que vai para a nuvem: sincroniza alguns segundos depois
  let timer = 0;
  function touch(key) {
    if (!acc() || !Object.values(KEYS).includes(key)) return;
    clearTimeout(timer); timer = setTimeout(sync, 4000);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearTimeout(timer); timer = 0; sync(); } });

  // ---------- Google, GitHub e Discord ----------
  const PROV = {
    google: { name: 'Google', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' },
    // Marcas do GitHub e do Discord: Simple Icons (CC0, simpleicons.org)
    github: { name: 'GitHub', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>' },
    discord: { name: 'Discord', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#5865F2" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>' },
  };
  const pname = p => (PROV[p] ? PROV[p].name : 'o serviço');
  const pico = p => '<span class="prov-ico">' + PROV[p].icon + '</span>';
  // Serviços ligados no servidor (só aparecem os que têm chave configurada).
  // Na versão de portal o jogo roda dentro de outra página, onde o Google e afins recusam abrir: só usuário e senha
  let provP = window.CLIMBIX_PORTAL ? Promise.resolve([]) : null;
  const providers = () => provP || (provP = fetch(OAPI + '?a=providers').then(r => r.json())
    .then(j => (j.providers || []).filter(p => PROV[p]), () => { provP = null; return []; }));

  // Vai para o serviço. Com conta aberta, o serviço volta ligado a ela
  function oauthGo(p, btn) {
    const v = hex(32);
    raw(OKEY, { v, p, link: !!acc(), at: Date.now() });
    if (btn) btn.disabled = true;
    post('start', { provider: p, back: location.origin + location.pathname, verifier: v }, OAPI)
      .then(r => { location.href = r.url; })
      .catch(() => { if (btn) btn.disabled = false; U.ask('Sem conexão', 'Não deu para abrir o ' + pname(p) + ' agora. Tente de novo.', 'OK', () => {}); });
  }
  const pending = () => { const o = load(OKEY); return o && o.code && Date.now() - o.at < 14 * 60e3 ? o : null; };

  const MSG = {
    wrong: 'Usuário ou senha errados.', user_taken: 'Esse usuário já existe. Escolha outro.', user_invalid: 'Use de 3 a 16 letras, números, ponto, _ ou -.',
    pass_short: 'A senha precisa ter pelo menos 6 caracteres.', limit: 'Muitas tentativas. Espere alguns minutos.',
    last_login: 'Crie uma senha antes: é a única forma de entrar que sobrou nesta conta.',
    auth: 'Sua sessão terminou. Entre de novo.',
  };
  function errMsg(e, p) {
    const k = e && e.error, n = pname(p);
    if (k === 'oauth_taken') return 'Essa conta ' + n + ' já está ligada a outra conta do Climbix.';
    if (k === 'oauth_other') return 'Esta conta já tem outra conta ' + n + ' conectada. Desconecte a antiga antes.';
    if (k === 'oauth_expired') return 'O login com ' + n + ' expirou. Tente de novo.';
    return MSG[k] || 'Sem conexão agora. Tente de novo.';
  }

  // Voltou do serviço: #climbix-oauth=<código> ou #climbix-oauth-error=<motivo>
  function oauthReturn() {
    const m = /^#climbix-oauth(-error)?=([\w-]+)$/.exec(location.hash);
    if (!m) return false;
    history.replaceState(null, '', location.pathname + location.search);
    const o = load(OKEY), p = o && o.p;
    const done = () => localStorage.removeItem(OKEY);
    if (m[1]) { done(); screen('login', m[2] === 'cancel' ? 'Login com ' + pname(p) + ' cancelado.' : 'Não deu para entrar com ' + pname(p) + ' agora. Tente de novo.'); return true; }
    if (!o || !o.v || Date.now() - o.at > 15 * 60e3) {
      done(); screen('login', 'Esse login começou em outro navegador ou expirou. Toque de novo em "Continuar com…" aqui.'); return true;
    }
    G.c = null; G.step = null; bar();
    render('<div class="eyebrow">Conta</div><h2>Entrando…</h2><p class="muted">Conferindo com o ' + esc(pname(p)) + '.</p>');
    const code = m[2], a = acc();
    if (o.link && a) {
      post('oauth', { code, verifier: o.v, token: a.token }).then(r => { done(); keep(r); screen('account', pname(p) + ' conectado. Agora dá para entrar com ele em qualquer aparelho.', true); },
        e => { done(); screen('account', errMsg(e, p)); });
      return true;
    }
    post('oauth', { code, verifier: o.v }).then(r => {
      if (!r.pending) { done(); return enter(r); }
      raw(OKEY, Object.assign(o, { code, at: Date.now(), label: r.label, suggest: r.suggest }));
      screen('new');
    }).catch(e => { done(); screen('login', errMsg(e, p)); });
    return true;
  }

  // Entrou (senha, cadastro ou serviço): junta o que já tinha neste aparelho com o que estava na conta
  function enter(r) {
    store(AKEY, { user: r.user, token: r.token, links: r.links || [], pass: !!r.pass, needold: !!r.needold });
    adopt(r);
    // O que já estava neste aparelho entra na conta mesmo que a conta tenha sido reiniciada antes
    const loc = local(), rs = (r.save && r.save.reset) || 0;
    if ((loc.reset || 0) < rs) loc.reset = rs;
    const m = merge(loc, r.save);
    apply(m);
    state = 'syncing';
    U.home();
    return post('push', { token: r.token, data: m }).then(() => { state = 'ok'; }, () => { state = 'offline'; }).finally(paint);
  }

  // ---------- telas ----------
  // Linha na tela inicial
  function homeLine() {
    const a = acc();
    return '<button class="hg" id="b-cloud"><i>' + U.ICON.cloud + '</i><b>' + (a ? esc(a.user) : 'Conta') + '</b><small' + (a ? ' id="cloud-st">' + stTxt() : '>salvar na nuvem') + '</small></button>';
  }
  const stTxt = () => ({ syncing: 'salvando…', ok: 'salvo na nuvem', offline: 'sem conexão (salva depois)', idle: 'salvo na nuvem' })[state];
  function paint() { const el = $('cloud-st'); if (el) el.textContent = stTxt(); }
  const top = (back, eyebrow, title) => '<button class="back-link" id="' + (back === 'Início' ? 'b-back-home' : 'b-back-acc') + '">‹ ' + back + '</button><div class="eyebrow">' + eyebrow + '</div><h2>' + esc(title) + '</h2>';
  const note = (msg, ok) => (msg ? '<p class="' + (ok ? 'acc-ok' : 'acc-err') + '">' + esc(msg) + '</p>' : '');
  const field = (id, label, attrs) => '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" ' + attrs + ' required></div>';
  // ---------- reiniciar progresso ----------
  // Apaga carreiras, coleção, Hall da Fama, conquistas, Sala de Troféus, carreira do dia e itens.
  // Ficam: a conta, o nome no ranking, as configurações e o som. Com conta, a nuvem também recomeça
  // (o marcador "reset" faz os outros aparelhos descartarem o progresso antigo na próxima sincronização).
  const WIPE = [SAVE, HALL, KEYS.col, KEYS.ach, KEYS.daily, KEYS.sala, KEYS.itens, 'climbix-seen-v1', 'climbix-rank-queue'];
  const RESET = '<div class="acc-reset"><b>Reiniciar progresso</b><p>Começa o jogo do zero neste aparelho' + ' e na nuvem, se você tiver conta.</p>' +
    '<button class="btn ghost acc-danger" id="b-reset">Reiniciar progresso</button></div>';
  function bindReset() {
    const b = $('b-reset');
    if (!b) return;
    b.onclick = () => U.ask('Reiniciar todo o progresso?', 'Apaga a carreira em andamento, a coleção de cartas, o Hall da Fama, as conquistas, a Sala de Troféus, os itens, as fichas e os pacotinhos. Sua conta, seu nome no ranking e as configurações continuam.',
      'Continuar', () => U.ask('Tem certeza?', 'Não dá para desfazer. O progresso some deste aparelho' + (acc() ? ', da nuvem e dos outros aparelhos da conta.' : '.'), 'Apagar tudo', resetAll));
  }
  function resetAll() {
    WIPE.forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } });
    raw(KEYS.reset, Date.now());
    if (U.ITEMS) U.ITEMS.reset(); // o inventário recomeça (10 números novos) na próxima leitura
    G.c = null; G.step = null;
    const done = () => { U.home(); U.ask('Progresso reiniciado', 'Tudo pronto para começar do zero.', 'Nova carreira', () => U.create(), 'Fechar'); };
    if (acc()) sync().then(done, done); else done();
  }
  const LEGAL = '<p class="muted small acc-legal"><a href="privacidade.html">Privacidade</a> · <a href="termos.html">Termos de uso</a></p>';
  const USER = 'name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16"';
  // Envia o formulário: trava o botão, chama o servidor e, se der erro, volta à mesma tela com a mensagem
  function submit(label, call, onOk, onErr) {
    $('acc-form').onsubmit = e => {
      e.preventDefault();
      const b = $('acc-go'); b.disabled = true; b.textContent = label;
      call().then(onOk).catch(onErr);
    };
  }

  // msg: aviso no alto do formulário (ok = deu certo; senão, erro)
  function screen(mode, msg, ok) {
    G.c = null; G.step = null; bar();
    const a = acc();
    if (a) return mode === 'pass' ? passScreen(msg) : accountScreen(msg, ok);
    if ((mode === 'new' || mode === 'join') && pending()) return pendingScreen(mode, msg);
    loginScreen(mode === 'register' ? 'register' : 'login', msg);
  }

  // Conta aberta: status da nuvem e formas de entrar
  function accountScreen(msg, ok) {
    const a = acc();
    render(top('Início', 'Conta', a.user) +
      '<p class="lead">Seu jogo fica salvo na nuvem: carreira em andamento, coleção, Hall da Fama e conquistas. Entre com a mesma conta em outro aparelho para continuar.</p>' +
      note(msg, ok) +
      '<p class="muted" id="cloud-msg">' + stTxt() + '</p>' +
      '<button class="btn" id="b-sync">Sincronizar agora</button>' +
      '<div class="eyebrow small">Formas de entrar</div><div class="acc-ways" id="acc-ways"><p class="muted small">carregando…</p></div>' +
      '<button class="btn ghost" id="b-logout">Sair desta conta</button>' + RESET + LEGAL);
    bindReset();
    $('b-back-home').onclick = U.home;
    $('b-sync').onclick = () => { $('cloud-msg').textContent = 'salvando…'; sync().then(() => { $('cloud-msg').textContent = stTxt(); showWays(); }); };
    $('b-logout').onclick = () => U.ask('Sair da conta?', 'O jogo continua neste aparelho; só para de salvar na nuvem.', 'Sair', () => {
      post('logout', { token: a.token }).catch(() => {});
      localStorage.removeItem(AKEY); state = 'idle'; U.home();
    });
    // Conta aberta antes desta versão ainda não sabe as formas de entrar: busca na nuvem
    Promise.all([providers(), a.links ? null : sync()]).then(([list]) => showWays(list));
  }
  function showWays(list) {
    if (!list) return providers().then(showWays);
    const el = $('acc-ways'), a = acc();
    if (!el || !a) return;
    if (!a.links) { el.innerHTML = '<p class="muted small">Sem conexão: as formas de entrar aparecem quando a conta sincronizar.</p>'; return; }
    const links = a.links || [], on = p => links.find(l => l.p === p);
    const ps = Object.keys(PROV).filter(p => list.includes(p) || on(p));
    const last = !a.pass && links.length <= 1; // sem senha, o único serviço não pode sair
    el.innerHTML = ps.map(p => {
      const l = on(p);
      return '<div class="acc-way">' + pico(p) + '<span><b>' + PROV[p].name + '</b><small>' + (l ? esc(l.label || 'conectado') : 'não conectado') + '</small></span>' +
        (l ? (last ? '' : '<button class="link-btn" data-un="' + p + '">desconectar</button>') : '<button class="btn small-btn" data-ln="' + p + '">Conectar</button>') + '</div>';
    }).join('') +
      '<div class="acc-way"><span class="prov-ico">' + U.ICON.lock + '</span><span><b>Senha</b><small>' + (a.pass ? 'criada' : 'sem senha') + '</small></span>' +
      '<button class="link-btn" id="b-pass">' + (a.pass ? 'trocar' : 'criar') + '</button></div>' +
      (ps.length && !links.length ? '<p class="muted small">Conecte ' + ps.map(pname).join(', ').replace(/, ([^,]*)$/, ' ou $1') + ': se esquecer a senha, é só entrar por ele.</p>' : '');
    el.querySelectorAll('[data-ln]').forEach(b => { b.onclick = () => oauthGo(b.dataset.ln, b); });
    el.querySelectorAll('[data-un]').forEach(b => {
      const p = b.dataset.un;
      b.onclick = () => U.ask('Desconectar ' + pname(p) + '?', 'Você não vai mais entrar nesta conta com o ' + pname(p) + '.', 'Desconectar', () =>
        post('unlink', { token: a.token, provider: p }).then(r => { keep(r); screen('account', pname(p) + ' desconectado.', true); }, e => screen('account', errMsg(e, p))));
    });
    $('b-pass').onclick = () => screen('pass');
  }

  // Criar ou trocar a senha. Quem entrou por um serviço ligado não precisa da atual: é a recuperação de senha
  function passScreen(msg) {
    const a = acc();
    render(top('Conta', 'Conta', a.pass ? 'Trocar senha' : 'Criar senha') +
      '<p class="lead">' + (!a.pass ? 'Com senha, dá para entrar só com usuário e senha, sem depender de outro serviço.'
        : a.needold ? 'Digite a senha atual e a nova.' : 'Você entrou por um serviço ligado à conta: pode criar uma senha nova sem a antiga.') + '</p>' +
      '<form class="acc-form" id="acc-form" autocomplete="on"><input type="text" name="username" autocomplete="username" value="' + esc(a.user) + '" hidden>' +
      (a.pass && a.needold ? field('acc-old', 'Senha atual', 'type="password" autocomplete="current-password"') : '') +
      field('acc-pass', 'Nova senha', 'type="password" autocomplete="new-password" minlength="6"') +
      note(msg) + '<button class="btn" id="acc-go" type="submit">Salvar senha</button></form>' +
      (a.pass ? '<p class="muted small">Os outros aparelhos vão precisar entrar de novo.</p>' : ''));
    $('b-back-acc').onclick = () => screen('account');
    submit('Salvando…', () => post('setpass', { token: a.token, pass: $('acc-pass').value, old: $('acc-old') ? $('acc-old').value : '' }),
      r => { keep(r); screen('account', 'Senha salva.', true); },
      e => screen('pass', e && e.error === 'wrong' ? 'Senha atual errada.' : errMsg(e)));
  }

  // Sem conta: entrar ou criar, com usuário e senha ou com um serviço
  function loginScreen(mode, msg) {
    const reg = mode === 'register';
    render(top('Início', 'Salvar na nuvem', reg ? 'Criar conta' : 'Entrar') +
      '<p class="lead">' + (reg ? 'Seu usuário também vira seu nome no ranking.' : 'Continue suas carreiras em qualquer aparelho.') + '</p>' +
      '<div class="acc-prov" id="acc-prov"></div>' +
      '<form class="acc-form" id="acc-form" autocomplete="on">' +
      field('acc-user', 'Usuário', USER) +
      field('acc-pass', 'Senha', 'name="password" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" minlength="6"') +
      note(msg) + '<button class="btn" id="acc-go" type="submit">' + (reg ? 'Criar conta' : 'Entrar') + '</button></form>' +
      '<button class="link-btn" id="acc-switch">' + (reg ? 'Já tenho conta: entrar' : 'Não tenho conta: criar agora') + '</button>' +
      (reg ? '<p class="muted small" id="acc-hint">Guarde bem a senha: não dá para recuperar por e-mail.</p>'
        : '<button class="link-btn" id="acc-forgot">Esqueci a senha</button>') + RESET + LEGAL);
    bindReset();
    $('b-back-home').onclick = U.home;
    $('acc-switch').onclick = () => screen(reg ? 'login' : 'register');
    // Recuperar a senha só existe com serviço ligado à conta: as mensagens dependem de haver serviço configurado
    let names = '';
    if ($('acc-forgot')) $('acc-forgot').onclick = () => U.ask('Esqueceu a senha?', (names ? 'Se você conectou ' + names + ' à conta, entre por ele aqui e crie uma senha nova na tela da Conta. Sem isso, não' : 'Não') +
      ' dá para recuperar: a senha não fica guardada em lugar nenhum.', 'Entendi', () => {});
    providers().then(list => {
      const el = $('acc-prov');
      if (!el || !list.length) return;
      names = list.map(pname).join(', ').replace(/, ([^,]*)$/, ' ou $1');
      if ($('acc-hint')) $('acc-hint').textContent = 'Guarde bem a senha. Para poder recuperar a conta, conecte ' + names + ' depois.';
      el.innerHTML = list.map(p => '<button class="btn ghost prov-btn" data-p="' + p + '">' + pico(p) + 'Continuar com ' + PROV[p].name + '</button>').join('') +
        '<div class="acc-or">ou com usuário e senha</div>';
      el.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => oauthGo(b.dataset.p, b); });
    });
    submit(reg ? 'Criando…' : 'Entrando…', () => {
      const user = $('acc-user').value.trim(), pass = $('acc-pass').value;
      return reg ? post('register', { user, pass, pid: myPid() }) : post('login', { user, pass });
    }, enter, e => screen(mode, errMsg(e)));
  }
  // Id do ranking deste aparelho (a conta nova fica com ele, junto com as carreiras já enviadas)
  const myPid = () => (load(PKEY) || {}).pid || hex(12);

  // Primeira vez com esse serviço: criar conta nova ou ligar o serviço a uma conta que já existe
  function pendingScreen(mode, msg) {
    const o = pending(), n = pname(o.p), join = mode === 'join';
    const who = o.label ? '<b>' + esc(o.label) + '</b>' : 'Essa conta ' + esc(n);
    render(top('Início', 'Continuar com ' + n, join ? 'Ligar à sua conta' : 'Primeiro acesso') +
      '<p class="lead">' + (join ? 'Entre com o usuário e a senha da sua conta do Climbix. Depois disso, o ' + esc(n) + ' também entra nela.'
        : who + ' ainda não está ligada a nenhuma conta do Climbix. Escolha seu usuário: ele também vira seu nome no ranking.') + '</p>' +
      '<form class="acc-form" id="acc-form" autocomplete="on">' +
      field('acc-user', 'Usuário', USER + (join ? '' : ' value="' + esc(o.suggest || '') + '"')) +
      (join ? field('acc-pass', 'Senha', 'name="password" type="password" autocomplete="current-password"') : '') +
      note(msg) + '<button class="btn" id="acc-go" type="submit">' + (join ? 'Entrar e ligar' : 'Criar conta') + '</button></form>' +
      '<button class="link-btn" id="acc-switch">' + (join ? 'Não tenho conta: criar uma nova' : 'Já tenho conta no Climbix: ligar o ' + esc(n) + ' a ela') + '</button>');
    $('b-back-home').onclick = () => { localStorage.removeItem(OKEY); U.home(); };
    $('acc-switch').onclick = () => screen(join ? 'new' : 'join');
    submit(join ? 'Entrando…' : 'Criando…', () => {
      const user = $('acc-user').value.trim(), link = { link: o.code, verifier: o.v };
      return join ? post('login', Object.assign({ user, pass: $('acc-pass').value }, link)) : post('register', Object.assign({ user, pid: myPid() }, link));
    }, r => { localStorage.removeItem(OKEY); return enter(r); }, e => {
      if (e && e.error === 'oauth_expired') { localStorage.removeItem(OKEY); return screen('login', errMsg(e, o.p)); }
      screen(mode, errMsg(e, o.p));
    });
  }

  // Abriu o jogo: volta de um login com serviço ou, com conta, busca o que mudou em outro aparelho
  function boot() {
    if (window.CLIMBIX_SOLO || oauthReturn() || !acc()) return;
    sync().then(changed => { if (changed && !G.c && document.getElementById('b-new')) U.home(); });
  }

  window.CLIMBIX_CLOUD = { touch, sync };
  Object.assign(U, { cloudName: () => { const a = acc(); return a ? a.user : 'Conta'; }, cloudLine: homeLine, cloud: screen, cloudBoot: boot, cloudMerge: merge });
})();
