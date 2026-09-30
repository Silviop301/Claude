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
  const crest = (id, cls) => '<img class="crest' + (cls ? ' ' + cls : '') + '" src="badges/' + id + '.png" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  const trophy = (type, size, name) => window.CRAQUE_TROPHY(type, size, name);
  const titleType = t => (t.id === 'cont' ? (t.name === 'Libertadores' ? 'lib' : 'ucl') : t.id);
  const meter = (label, v) => '<span class="m"><span class="ml">' + label + ' · ' + S.relLabel(v) + '</span><span class="mb"><i style="width:' + Math.round(v) + '%" class="' + (v >= 62 ? 'hi' : v < 32 ? 'lo' : '') + '"></i></span></span>';

  // Fama (0 a ~300): nível + barra; pesa em propostas, salário, seleção e Bola de Ouro
  // Medidor compacto da barra: ícone + estado (o nome completo fica no aria-label)
  // Medidor do topo: só o ícone e a barra; tocar mostra o nome e o nível
  // Medidor do topo: ícone + nome curto e a barra; tocar mostra o nível
  const barMeter = (ico, name, txt, v, cls) => '<span class="m" role="button" data-tip="' + name + ': ' + txt + '" aria-label="' + name + ': ' + txt + '"><span class="ml">' + ico + '<small>' + name + '</small></span><span class="mb"><i class="' + (cls || (v >= 62 ? 'hi' : v < 32 ? 'lo' : '')) + '" style="width:' + Math.round(v) + '%"></i></span></span>';

  function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function store(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sem storage */ }
    if (window.CLIMBIX_CLOUD) window.CLIMBIX_CLOUD.touch(key); // com conta, vai para a nuvem
  }
  // "at": quando foi salvo (na nuvem vale a carreira mais recente; carreira encerrada fica marcada como vazia)
  // Configurações do jogador (tela em ui/settings.js)
  const CFG_KEY = 'climbix-config';
  const cfg = Object.assign({ papers: 'all', cups: 'play', moments: 'play', fast: false, fx3d: true, vibe: true }, load(CFG_KEY) || {});
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
  // O topo da tela ganha a cor da camisa do clube atual e o escudo grande e apagado ao fundo
  let bgClub = undefined;
  function clubBg(id) {
    if (id === bgClub) return;
    bgClub = id;
    let el = $('club-bg');
    if (!el) { el = document.createElement('div'); el.id = 'club-bg'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
    if (!id) { el.className = ''; return; }
    const kit = (window.CRAQUE_KITS || {})[id] || ['#1F6B3E', '#0B1F14'];
    el.style.setProperty('--kit', kit[0]);
    el.innerHTML = '<img src="badges/' + id + '.png" alt="" onerror="this.remove()">';
    el.className = 'on';
  }
  // Balão com o nome do medidor tocado
  function barTip(m) {
    document.querySelectorAll('.bar-tip').forEach(x => x.remove());
    const t = document.createElement('div');
    t.className = 'bar-tip'; t.textContent = m.dataset.tip;
    const r = m.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(window.innerWidth - 220, r.left)) + 'px';
    t.style.top = (r.bottom + 6) + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ---------- barra do jogador ----------
  let lastOvr = 0;
  function bar() {
    const b = $('bar');
    if (!G.c || !G.c.club) { b.hidden = true; clubBg(null); return; }
    b.hidden = false;
    clubBg(G.c.club);
    requestAnimationFrame(() => document.documentElement.style.setProperty('--bar-h', b.offsetHeight + 'px'));
    const cl = club(G.c.club), lg = league(G.c.club);
    // Nome e clube (a idade aparece no topo de cada tela; o som fica na linha dos medidores)
    $('bar-name').innerHTML = '<span class="bn">' + esc(G.c.name) + '</span>';
    $('bar-sub').innerHTML = crest(cl.id, 'xs') + esc(cl.name);
    // Som fica no fim da linha dos medidores (libera espaço para nome, idade e clube)
    $('bar-rel').innerHTML = barMeter(ICON.coach, 'Técnico', S.relLabel(G.c.rel.coach), G.c.rel.coach) + barMeter(ICON.fans, 'Torcida', S.relLabel(G.c.rel.fans), G.c.rel.fans) +
      barMeter(ICON.fame, 'Fama', S.fameLabel(G.c.fame), Math.min(100, Math.round(G.c.fame / 3)), 'fame') +
      '<span class="bar-btns"><button class="snd-mini" id="b-snd" aria-label="Configurações">' + ICON.gear + '</button>' +
      '<button class="snd-mini home-btn" id="b-home" aria-label="Voltar ao início">' + HOUSE + '</button></span>';
    $('bar-rel').querySelectorAll('[data-tip]').forEach(m => m.onclick = e => { e.stopPropagation(); barTip(m); });
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
    const T = G.c.totals;
    // Números do topo por posição: goleiro (sem sofrer gol, pênaltis defendidos), zagueiro (gols, sem sofrer gol)
    const tot = G.c.pos === 'GOL' ? [[T.cs || 0, 'S/ GOL'], [T.penSaved || 0, 'PÊN. DEF']]
      : G.c.pos === 'ZAG' ? [[T.goals, 'GOLS'], [T.cs || 0, 'S/ GOL']] : [[T.goals, 'GOLS'], [T.assists, 'ASSIST']];
    $('bar-tot').innerHTML = tot.map(([v, l]) => '<span>' + v + '<small>' + l + '</small></span>').join('') + '<span>' + S.titleCount(T) + '<small>TAÇAS</small></span>';
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
    calendar: svgI('M4.5 6h15v14h-15z M4.5 10h15 M8.5 3.5v4 M15.5 3.5v4'),
    refresh: svgI('M19.5 12a7.5 7.5 0 1 1-2.2-5.3 M19.5 4v4.5H15'),
    globe: svgI('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z M3.5 12h17 M12 3.5c2.4 2.4 3.4 5.3 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.3-3.4-8.5s1-6.1 3.4-8.5z'),
    paper: svgI('M4 5.5h13v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z M17 9h3v9.5a2 2 0 0 1-4 0 M7.5 9h6 M7.5 12.5h6 M7.5 16h4'),
    ball: svgI('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z M12 8.3l3.3 2.4-1.3 3.9h-4l-1.3-3.9z M12 8.3V3.6 M15.3 10.7l4.4-1.5 M14 14.6l2.7 3.8 M10 14.6l-2.7 3.8 M8.7 10.7l-4.4-1.5'),
    fast: svgI('M3.5 6.5l8 5.5-8 5.5z M12 6.5l8 5.5-8 5.5z', true),
    spark: svgI('M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'),
    sound: svgI('M4 9.5v5h3.5l5 4V5.5l-5 4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11'),
    vibe: svgI('M8 3.5h8v17H8z M4.5 8v8 M19.5 8v8 M11 17.5h2'),
    // Lucide (MIT, lucide.dev): paths copiados aqui para o jogo funcionar offline
    'newspaper': svgI('M15 18h-5 M18 14h-8 M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2 M11 6h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1z'),
    'globe': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20 M2 12h20'),
    'circle-dot': svgI('M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0'),
    'fast-forward': svgI('M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z'),
    'sparkles': svgI('M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z M20 2v4 M22 4h-4 M2 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'),
    'volume-2': svgI('M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z M16 9a5 5 0 0 1 0 6 M19.364 18.364a9 9 0 0 0 0-12.728'),
    'smartphone': svgI('M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2z M12 18h.01'),
    'brain': svgI('M12 18V5 M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4 M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5 M17.997 5.125a4 4 0 0 1 2.526 5.77 M18 18a4 4 0 0 0 2-7.464 M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517 M6 18a4 4 0 0 1-2-7.464 M6.003 5.125a4 4 0 0 0-2.526 5.77'),
    'brick-wall': svgI('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z M12 9v6 M16 15v6 M16 3v6 M3 15h18 M3 9h18 M8 15v6 M8 3v6'),
    'chart-column': svgI('M3 3v16a2 2 0 0 0 2 2h16 M18 17V9 M13 17V5 M8 17v-3'),
    'chevrons-up': svgI('M0 0m17 11-5-5-5 5 M0 0m17 18-5-5-5 5'),
    'crosshair': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M22 12L18 12 M6 12L2 12 M12 6L12 2 M12 22L12 18'),
    'crown': svgI('M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z M5 21h14'),
    'dumbbell': svgI('M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z M0 0m2.5 21.5 1.4-1.4 M0 0m20.1 3.9 1.4-1.4 M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z M0 0m9.6 14.4 4.8-4.8'),
    'eye': svgI('M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0 M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'),
    'flag': svgI('M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528'),
    'flag-triangle-right': svgI('M6 22V2.8a.8.8 0 0 1 1.17-.71l11.38 5.69a.8.8 0 0 1 0 1.44L6 15.5'),
    'flame': svgI('M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'),
    'footprints': svgI('M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z M16 17h4 M4 13h4'),
    'goal': svgI('M12 13V2l8 4-8 4 M20.561 10.222a9 9 0 1 1-12.55-5.29 M8.002 9.997a5 5 0 1 0 8.9 2.02'),
    'hand': svgI('M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2 M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2 M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8 M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'),
    'heart-pulse': svgI('M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5 M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27'),
    'luggage': svgI('M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14 M10 20h4 M14 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M6 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'),
    'move-horizontal': svgI('M0 0m18 8 4 4-4 4 M2 12h20 M0 0m6 8-4 4 4 4'),
    'move-right': svgI('M18 8L22 12L18 16 M2 12H22'),
    'move-up': svgI('M8 6L12 2L16 6 M12 2V22'),
    'music': svgI('M9 18V5l12-2v13 M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'),
    'route': svgI('M3 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15 M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'),
    'ruler': svgI('M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z M0 0m14.5 12.5 2-2 M0 0m11.5 9.5 2-2 M0 0m8.5 6.5 2-2 M0 0m17.5 15.5 2-2'),
    'shield': svgI('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'),
    'shield-check': svgI('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M0 0m9 12 2 2 4-4'),
    'shield-half': svgI('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M12 22V2'),
    'skull': svgI('M0 0m12.5 17-.5-1-.5 1h1z M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'),
    'snowflake': svgI('M0 0m10 20-1.25-2.5L6 18 M10 4 8.75 6.5 6 6 M0 0m14 20 1.25-2.5L18 18 M0 0m14 4 1.25 2.5L18 6 M0 0m17 21-3-6h-4 M0 0m17 3-3 6 1.5 3 M2 12h6.5L10 9 M0 0m20 10-1.5 2 1.5 2 M22 12h-6.5L14 15 M0 0m4 10 1.5 2L4 14 M0 0m7 21 3-6-1.5-3 M0 0m7 3 3 6h4'),
    'star': svgI('M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'),
    'stethoscope': svgI('M11 2v2 M5 2v2 M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1 M8 15a6 6 0 0 0 12 0v-3 M18 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'),
    'target': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M6 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'),
    'timer': svgI('M10 2L14 2 M12 14L15 11 M4 14a8 8 0 1 0 16 0a8 8 0 1 0 -16 0'),
    'tornado': svgI('M21 4H3 M18 8H6 M19 12H9 M16 16h-6 M11 20H9'),
    'utensils-crossed': svgI('M0 0m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8 M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7 M0 0m2.1 21.8 6.4-6.3 M0 0m19 5-7 7'),
    'wand-sparkles': svgI('M0 0m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72 M0 0m14 7 3 3 M5 6v4 M19 14v4 M10 2v2 M7 8H3 M21 16h-4 M11 3H9'),
    'wind': svgI('M12.8 19.6A2 2 0 1 0 14 16H2 M17.5 8a2.5 2.5 0 1 1 2 4H2 M9.8 4.4A2 2 0 1 1 11 8H2'),
    'zap': svgI('M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z'),
    'chevron-right': svgI('M0 0m9 18 6-6-6-6'),
    'calendar-days': svgI('M8 2v3 M16 2v3 M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z M3 9h18 M8 13h.01 M12 13h.01 M16 13h.01 M8 17h.01 M12 17h.01 M16 17h.01'),
    'x': svgI('M18 6 6 18 M0 0m6 6 12 12'),
    'info': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 16v-4 M12 8h.01'),
  };
  // Selo redondo com ícone. tom: 'green' | 'blue' | 'sand' | 'red' | 'gold' | 'purple'
  const seal = (name, tone, size) => '<span class="seal ' + tone + (size ? ' ' + size : '') + '">' + (ICON[name] || '') + '</span>';
  // Ícone de um item de dados: selo quando tem ico, senão o emoji de reserva
  const icoOf = (x, size) => (x && x.ico && ICON[x.ico] ? seal(x.ico, x.tone || 'sand', size) : (x && x.icon) || '');
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

  // Faixa de cor da carta pela nota (bronze, prata, ouro, ícone)
  const tierCls = o => (o >= 85 ? 'icone' : o >= 75 ? 'ouro' : o >= 65 ? 'prata' : 'bronze');
  const TIER_NAME = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', icone: 'Ícone' };

  window.CRAQUE_UI = { ICON, seal, icoOf, cfg, setCfg, vibe, ask, HOUSE, arm, disarm, tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar };
})();
