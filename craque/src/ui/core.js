// Interface — base: estado compartilhado (G), ajudantes, salvar/carregar, render e barra do jogador
(function () {
  const G = { c: null, step: null }; // carreira atual e etapa (para retomar)
  const D = window.CRAQUE_DATA, S = window.CRAQUE_SIM;
  const sfx = n => { if (window.CRAQUE_SFX) window.CRAQUE_SFX.play(n); };
  const $ = id => document.getElementById(id);
  const screen = $('screen');
  const SAVE = 'craque-v5', HALL = 'craque-hall-v1';
  const YEAR0 = 2026;

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mi' : v >= 1e3 ? Math.round(v / 1e3) + ' mil' : String(v));
  const club = id => D.CLUB_BY_ID[id];
  const league = id => D.LEAGUE_BY_ID[club(id).league];
  const stars = t => '★'.repeat(t) + '☆'.repeat(5 - t);
  const year = () => YEAR0 + G.c.season;
  // Versão de portal (tools/craque_portal.py): os escudos vêm de climbix.app, para o pacote caber no limite de arquivos
  const BADGES = window.CLIMBIX_BADGES || 'badges/';
  const badgeSrc = s => String(s).replace(/^badges\//, BADGES);
  const crest = (id, cls) => '<img class="crest' + (cls ? ' ' + cls : '') + '" src="' + BADGES + id + '.png" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  const trophy = (type, size, name) => window.CRAQUE_TROPHY(type, size, name);
  const titleType = t => (t.id === 'cont' ? (t.name === 'Libertadores' ? 'lib' : 'ucl') : t.id);
  const meter = (label, v) => '<span class="m"><span class="ml">' + label + ' · ' + S.relLabel(v) + '</span><span class="mb"><i style="width:' + Math.round(v) + '%" class="' + (v >= 62 ? 'hi' : v < 32 ? 'lo' : '') + '"></i></span></span>';

  // Fama (0 a ~300): nível + barra; pesa em propostas, salário, seleção e Bola de Ouro
  // Medidor compacto da barra: ícone + estado (o nome completo fica no aria-label)
  // Medidor do topo: só o ícone e a barra; tocar mostra o nome e o nível
  // Medidor do topo: ícone + nome curto e a barra; tocar mostra o nível
  // Engrenagem das configurações (branca, no traço da seta de voltar); o emoji cinza parecia desabilitado
  const GEAR_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const barMeter = (ico, name, txt, v, cls) => '<span class="m" role="button" data-tip="' + name + ': ' + txt + '" aria-label="' + name + ': ' + txt + '"><span class="ml">' + ico + '<small>' + name + '</small></span><span class="mb"><i class="' + (cls || (v >= 62 ? 'hi' : v < 32 ? 'lo' : '')) + '" style="width:' + Math.round(v) + '%"></i></span></span>';

  function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function store(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sem storage */ }
    if (window.CLIMBIX_CLOUD) window.CLIMBIX_CLOUD.touch(key); // com conta, vai para a nuvem
  }
  // "at": quando foi salvo (na nuvem vale a carreira mais recente; carreira encerrada fica marcada como vazia)
  // Configurações do jogador (tela em ui/settings.js)
  const CFG_KEY = 'climbix-config';
  const cfg = Object.assign({ papers: 'special', cups: 'play', moments: 'play', fast: false, fx3d: true, vibe: true }, load(CFG_KEY) || {});
  // v2: jornal só nas temporadas especiais (título, prêmio, transferência, Copa, despedida) passou a ser o padrão
  if ((cfg.v || 1) < 2) { if (cfg.papers === 'all') cfg.papers = 'special'; cfg.v = 2; }
  window.CLIMBIX_CFG = cfg;
  const setCfg = (k, v) => { cfg[k] = v; store(CFG_KEY, cfg); };
  const vibe = p => { if (cfg.vibe && navigator.vibrate) navigator.vibrate(p); };
  function save() { store(SAVE, G.c && !G.c.retired ? { c: G.c, step: G.step, at: Date.now() } : { c: null, at: Date.now() }); }

  function render(html, opts) {
    screen.innerHTML = html;
    // Telas curtas (resultado de evento ou de lance) ficam no meio da tela, sem meia tela vazia embaixo
    screen.classList.toggle('center', !!(opts && opts.center));
    screen.style.animation = 'none';
    void screen.offsetWidth;
    screen.style.animation = '';
    window.scrollTo(0, 0);
  }

  // ---------- cor do clube ----------
  // Fundo atrás da tela: só na Copa do Mundo (cores da bandeira); no clube fica limpo, sem escudo apagado
  let bgClub = undefined;
  // cols: na Copa do Mundo o fundo usa as cores da bandeira (ui/worldcup.js, natBg) no lugar do escudo do clube
  function clubBg(id, cols) {
    if (id === bgClub) return;
    bgClub = id;
    let el = $('club-bg');
    if (!el) { el = document.createElement('div'); el.id = 'club-bg'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
    if (!id) { el.className = ''; return; }
    if (cols) { cols.forEach((x, i) => el.style.setProperty('--n' + (i + 1), x)); el.innerHTML = ''; el.className = 'on nat'; return; }
    el.innerHTML = ''; el.className = '';
  }
  // Balão com o nome do medidor tocado
  function barTip(m) {
    document.querySelectorAll('.bar-tip').forEach(x => x.remove());
    const t = document.createElement('div');
    t.className = 'bar-tip'; t.textContent = m.dataset.tip;
    const r = m.getBoundingClientRect(), k = zk();
    t.style.left = Math.max(8, Math.min(window.innerWidth / k - 220, r.left / k)) + 'px';
    t.style.top = (r.bottom / k + 6) + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ---------- barra do jogador ----------
  let lastOvr = 0;
  // Técnico, Torcida e Fama mudaram desde a última barra (mesma carreira): a barra desliza do valor antigo ao novo
  // e um "+8" / "−15" sobe ao lado. Espera camadas de animação (motion.js) fecharem para o jogador ver.
  let lastRel = null;
  function barDelta() {
    const c = G.c, now = { id: c.uid || c.name, coach: c.rel.coach, fans: c.rel.fans, fame: c.fame };
    const prev = lastRel; lastRel = now;
    if (!prev || prev.id !== now.id || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ms = [...$('bar-rel').querySelectorAll('.m')];
    const rows = [['coach', ms[0], v => v], ['fans', ms[1], v => v], ['fame', ms[2], v => Math.min(100, Math.round(v / 3))]]
      .map(([k, m, pct]) => ({ m, d: Math.round(now[k] - prev[k]), from: pct(prev[k]), to: pct(now[k]) })).filter(r => r.m && r.d);
    if (!rows.length) return;
    rows.forEach(r => { const i = r.m.querySelector('.mb i'); if (i) { i.style.transition = 'none'; i.style.width = r.from + '%'; } });
    const play = () => {
      if (!document.body.contains(ms[0])) return;
      if (document.querySelector('.mo-wrap')) return setTimeout(play, 150); // suspense ou transferência na tela
      rows.forEach(r => {
        const i = r.m.querySelector('.mb i');
        if (i) { void i.offsetWidth; i.style.transition = 'width .7s cubic-bezier(.3, 1.2, .5, 1)'; i.style.width = r.to + '%'; }
        const b = document.createElement('b');
        b.className = 'm-d ' + (r.d > 0 ? 'up' : 'down');
        b.textContent = (r.d > 0 ? '+' : '−') + Math.abs(r.d);
        r.m.appendChild(b); setTimeout(() => b.remove(), 2200);
      });
    };
    setTimeout(play, 120);
  }
  // Gols, assistências e taças: o número que mudou desde a última barra conta até o novo e brilha
  let lastTot = null;
  function totCount(v) {
    const id = G.c.uid || G.c.name, prev = lastTot;
    lastTot = { id, v };
    if (!prev || prev.id !== id || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    [...$('bar-tot').querySelectorAll('b')].forEach((b, k) => {
      const a = prev.v[k], z = v[k];
      if (a == null || a === z) return;
      const t0 = performance.now(), T = Math.min(900, 300 + 25 * Math.abs(z - a));
      b.parentNode.classList.add('tot-up');
      setTimeout(() => b.parentNode && b.parentNode.classList.remove('tot-up'), T + 700);
      if (prev.live && k < 2) return; // já contou junto com a temporada ao vivo (barLive): só o brilho
      (function step(now) {
        if (!b.isConnected) return;
        const u = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - u, 3);
        b.textContent = Math.round(a + (z - a) * e);
        if (u < 1) requestAnimationFrame(step);
      })(t0);
    });
  }
  // Números do topo por posição: goleiro (sem sofrer gol, pênaltis defendidos), zagueiro (gols, sem sofrer gol)
  function totOf(c) {
    const T = c.totals;
    return c.pos === 'GOL' ? [[T.cs || 0, 'S/ GOL'], [T.penSaved || 0, 'PÊN. DEF']]
      : c.pos === 'ZAG' ? [[T.cs || 0, 'S/ GOL'], [T.goals, 'GOLS']] : [[T.goals, 'GOLS'], [T.assists, 'ASSIST']];
  }
  // Temporada ao vivo: gols e assistências do topo sobem junto com o quadro (e = 0…1). As taças só no fim,
  // para não entregar o título antes da hora. No bar() seguinte, o totCount só faz o brilho.
  function barLive(e) {
    const id = G.c && (G.c.uid || G.c.name), el = $('bar-tot');
    if (!lastTot || lastTot.id !== id || !el) return;
    const z = totOf(G.c).map(([v]) => v);
    lastTot.live = true;
    [...el.querySelectorAll('b')].slice(0, 2).forEach((b, k) => {
      const a = lastTot.v[k];
      if (a != null && a !== z[k]) b.textContent = Math.round(a + (z[k] - a) * e);
    });
  }
  function bar() {
    const b = $('bar');
    if (!G.c || !G.c.club) { b.hidden = true; clubBg(null); return; }
    b.hidden = false;
    if (G.step === 'wc' && G.c.wcRun && window.CRAQUE_UI.natBg) window.CRAQUE_UI.natBg(); else clubBg(G.c.club);
    requestAnimationFrame(() => document.documentElement.style.setProperty('--bar-h', b.offsetHeight + 'px'));
    const cl = club(G.c.club), lg = league(G.c.club);
    // Nome e clube (a idade aparece no topo de cada tela; o som fica na linha dos medidores)
    $('bar-name').innerHTML = '<span class="bn">' + esc(G.c.name) + '</span>';
    $('bar-sub').innerHTML = crest(cl.id, 'xs') + esc(cl.name);
    // Som fica no fim da linha dos medidores (libera espaço para nome, idade e clube)
    $('bar-rel').innerHTML = barMeter(ICON.coach, 'Técnico', S.relLabel(G.c.rel.coach), G.c.rel.coach) + barMeter(ICON.fans, 'Torcida', S.relLabel(G.c.rel.fans), G.c.rel.fans) +
      barMeter(ICON.fame, 'Fama', S.fameLabel(G.c.fame), Math.min(100, Math.round(G.c.fame / 3)), 'fame') +
      '<span class="bar-btns"><button class="snd-mini cfg-btn" id="b-snd" aria-label="Configurações">' + GEAR_SVG + '</button>' +
      '<button class="snd-mini home-btn" id="b-home" aria-label="Voltar ao início">' + '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5 3 12l7.5 7.5M3.8 12h17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span>';
    $('bar-rel').querySelectorAll('[data-tip]').forEach(m => m.onclick = e => { e.stopPropagation(); barTip(m); });
    barDelta();
    // Voltar ao início: a carreira fica salva e continua de onde parou
    $('b-home').onclick = e => {
      e.stopPropagation();
      ask('Voltar ao início?', 'Sua carreira fica salva e você continua de onde parou.', 'Ir para o início', () => {
        save();
        document.querySelectorAll('.paper-wrap, .walkout, .album').forEach(x => x.remove());
        window.CRAQUE_UI.home();
      });
    };
    $('b-snd').onclick = e => { e.stopPropagation(); window.CRAQUE_UI.settings(); };
    const T = G.c.totals, tot = totOf(G.c);
    const totV = tot.map(([v]) => v).concat(S.titleCount(T));
    $('bar-tot').innerHTML = tot.map(([v, l]) => '<span><b>' + v + '</b><small>' + l + '</small></span>').join('') + '<span><b>' + totV[2] + '</b><small>TAÇAS</small></span>';
    totCount(totV);
    const o = S.ovr(G.c);
    const el = $('bar-ovr');
    el.textContent = o;
    el.className = 'ovr metal ' + tierCls(o) + (el.classList.contains('up') ? ' up' : '');
    if (o > lastOvr && lastOvr) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    lastOvr = o;
    // Tocar na nota (ou no nome) abre a ficha: build, combinações e carreira
    el.onclick = $('bar-name').onclick = e => { e.stopPropagation(); window.CRAQUE_UI.sheet(); };
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Nota geral ' + o + ': ver ficha do jogador');
  }

  // Ícone de casa (botão de voltar ao início)
  // Ícones do jogo: mesmo traço (2px, cantos arredondados), em vez de emojis que mudam de aparelho para aparelho
  const svgI = (d, fill) => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="ico">' + (fill ? '<path d="' + d + '" fill="currentColor"/>' : '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg>';
  const ICON = {
    coach: svgI('M8 4h8v3H8z M6 5.5H5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1 M8 12h8 M8 16h5'),
    fans: svgI('M3 10v4h3l8 4.5V5.5L6 10H3z M17 9a4 4 0 0 1 0 6 M19.5 6.5a7.5 7.5 0 0 1 0 11'),
    fame: svgI('M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8z', true),
    gear: svgI('M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-2 1.2l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-2-1.2l-1.9.7-1.8-3.1 1.6-1.2a7.4 7.4 0 0 1 0-2.4L3.4 9.3l1.8-3.1 1.9.7a7.6 7.6 0 0 1 2-1.2l.3-2h3.6l.3 2a7.6 7.6 0 0 1 2 1.2l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2.4z'),
    trophy: svgI('M7 4h10v5a5 5 0 0 1-10 0z M7 6H4.5a3 3 0 0 0 3 4 M17 6h2.5a3 3 0 0 1-3 4 M12 14v3.5 M8.5 20.5h7 M9.5 17.5h5'),
    cards: svgI('M8 3.5h10a1.5 1.5 0 0 1 1.5 1.5v12 M5.5 7h9A1.5 1.5 0 0 1 16 8.5v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 19.5v-11A1.5 1.5 0 0 1 5.5 7z'),
    medal: svgI('M8 3l4 7 4-7 M12 10.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 13.3l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z'),
    cloud: svgI('M7 19h10.5a4 4 0 0 0 .6-7.9A6 6 0 0 0 6.5 11.9 3.6 3.6 0 0 0 7 19z'),
    refresh: svgI('M19.5 12a7.5 7.5 0 1 1-2.2-5.3 M19.5 4v4.5H15'),
    // Lucide (MIT, lucide.dev): paths copiados aqui para o jogo funcionar offline
    'newspaper': svgI('M15 18h-5 M18 14h-8 M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2 M11 6h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1z'),
    'globe': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20 M2 12h20'),
    'circle-dot': svgI('M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0'),
    'fast-forward': svgI('M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z'),
    'sparkles': svgI('M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z M20 2v4 M22 4h-4 M2 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'),
    'volume-2': svgI('M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z M16 9a5 5 0 0 1 0 6 M19.364 18.364a9 9 0 0 0 0-12.728'),
    'smartphone': svgI('M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2z M12 18h.01'),
    'pencil': svgI('M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z M15 5l4 4'),
    'chevron-right': svgI('M0 0m9 18 6-6-6-6'),
    'calendar-days': svgI('M8 2v3 M16 2v3 M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z M3 9h18 M8 13h.01 M12 13h.01 M16 13h.01 M8 17h.01 M12 17h.01 M16 17h.01'),
    'x': svgI('M18 6 6 18 M0 0m6 6 12 12'),
    'info': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 16v-4 M12 8h.01'),
    'house': svgI('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
    'user': svgI('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0'),
    'zap': svgI('M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'),
    'plus': svgI('M5 12h14 M12 5v14'),
    'lock': svgI('M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2z M7 11V7a5 5 0 0 1 10 0v4'),
  };
  // Selo redondo com ícone. tom: 'green' | 'blue' | 'sand' | 'red' | 'gold' | 'purple'
  // Emojis do jogo como Twemoji (SVG guardado em assets/tw), iguais em todo aparelho.
  // Nome do arquivo: codepoints em hexa separados por "-", sem o fe0f (exceto em sequências com ZWJ, como no Twemoji).
  const twCode = e => [...(e.includes('\u200D') ? e : e.replace(/\uFE0F/g, ''))].map(ch => ch.codePointAt(0).toString(16)).join('-');
  // size: 'xs' 16 · 'sm' 20 · 'md' 28 · 'lg' 40
  const emo = (e, size) => (e ? '<img class="tw tw-' + (size || 'sm') + '" src="assets/tw/' + twCode(e) + '.svg" alt="" draggable="false">' : '');
  // Ícone de um item de dados (característica, investimento, evento, conquista): o emoji do campo icon
  // Bandeira de país (no Windows o emoji vira letras): Twemoji no tamanho do texto ao redor
  const flag = (f, size) => emo(f, size || 'tx');
  const icoOf = (x, size) => (x && x.icon ? emo(x.icon, size || 'md') : '');
  // Emojis que chegam dentro de textos do motor (destaques da temporada, manchetes etc.) viram Twemoji na tela.
  // Só nos nós de texto (nunca em atributos); estrelas ★☆ e símbolos de texto ficam como estão.
  const TW_RE = /(?:\u{1F3F4}[\u{E0020}-\u{E007F}]+|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)\p{Emoji_Modifier}?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F?)\p{Emoji_Modifier}?)*)/gu;
  function twText(root) {
    if (!root || !root.nodeType) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && (/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/.test(n.parentNode.nodeName) || n.parentNode.namespaceURI === 'http://www.w3.org/2000/svg') ? 2 : 1) });
    const hits = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) { TW_RE.lastIndex = 0; if (TW_RE.test(n.nodeValue)) hits.push(n); }
    hits.forEach(n => {
      const span = document.createElement('span');
      span.innerHTML = esc(n.nodeValue).replace(TW_RE, m => emo(m, 'tx'));
      n.replaceWith(...span.childNodes);
    });
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => (n.nodeType === 3 ? n.parentNode && twText(n.parentNode) : twText(n))))).observe(document.body, { childList: true, subtree: true });
  }
  const HOUSE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M3 11.2 12 4l9 7.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9.5h4.5V14h3v5.5H18V10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  // Janela de confirmação do próprio jogo (no lugar do confirm() do navegador)
  function ask(title, text, okLabel, onOk, cancelLabel) {
    const w = document.createElement('div');
    w.className = 'ask-wrap';
    w.innerHTML = '<div class="ask" role="dialog" aria-modal="true"><b>' + esc(title) + '</b><p>' + esc(text) + '</p>' +
      '<button class="btn" data-a="ok">' + esc(okLabel) + '</button><button class="btn ghost" data-a="no">' + esc(cancelLabel || 'Cancelar') + '</button></div>';
    document.body.appendChild(w);
    const close = () => w.remove();
    w.onclick = e => { if (e.target === w) close(); };
    w.querySelector('[data-a="no"]').onclick = close;
    w.querySelector('[data-a="ok"]').onclick = () => { close(); onOk(); };
  }

  // Confirmação em dois toques: o 1º "vira" o card e mostra o que vai acontecer; o 2º confirma.
  // Devolve true quando é o 2º toque (aí quem chamou executa a ação).
  function disarm(btn) { btn.classList.remove('armed'); const b = btn.querySelector('.arm-back'); if (b) b.remove(); }
  function arm(btn, back) {
    if (btn.classList.contains('armed')) return true;
    document.querySelectorAll('.armed').forEach(disarm);
    btn.classList.add('armed');
    const b = document.createElement('span');
    b.className = 'arm-back';
    b.innerHTML = back;
    btn.appendChild(b);
    return false;
  }

  // Zoom da página (monitor grande, style.css): medidas da tela ÷ zk() = pixels do CSS. Sem zoom, 1.
  const zk = () => { const b = document.body, w = b && b.offsetWidth; return w ? b.getBoundingClientRect().width / w || 1 : 1; };

  // Faixa de cor da carta pela nota (bronze, prata, ouro, ícone)
  const tierCls = o => (o >= 85 ? 'icone' : o >= 75 ? 'ouro' : o >= 65 ? 'prata' : 'bronze');
  const TIER_NAME = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', icone: 'Ícone' };

  window.CRAQUE_UI = { zk, GEAR_SVG, ICON, emo, twCode, flag, icoOf, cfg, setCfg, vibe, ask, HOUSE, arm, disarm, tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, badgeSrc, trophy, titleType, meter, load, store, save, render, bar, barLive, clubBg };
})();
