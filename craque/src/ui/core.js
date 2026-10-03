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
      '<span class="bar-btns"><button class="snd-mini" id="b-snd" aria-label="Configurações">' + emo('⚙️', 'sm') + '</button>' +
      '<button class="snd-mini home-btn" id="b-home" aria-label="Voltar ao início">' + '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5 3 12l7.5 7.5M3.8 12h17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span>';
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
    refresh: svgI('M19.5 12a7.5 7.5 0 1 1-2.2-5.3 M19.5 4v4.5H15'),
    // Lucide (MIT, lucide.dev): paths copiados aqui para o jogo funcionar offline
    'newspaper': svgI('M15 18h-5 M18 14h-8 M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2 M11 6h6a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1z'),
    'globe': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20 M2 12h20'),
    'circle-dot': svgI('M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0'),
    'fast-forward': svgI('M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z'),
    'sparkles': svgI('M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z M20 2v4 M22 4h-4 M2 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'),
    'volume-2': svgI('M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z M16 9a5 5 0 0 1 0 6 M19.364 18.364a9 9 0 0 0 0-12.728'),
    'smartphone': svgI('M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2z M12 18h.01'),
    'chevron-right': svgI('M0 0m9 18 6-6-6-6'),
    'calendar-days': svgI('M8 2v3 M16 2v3 M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z M3 9h18 M8 13h.01 M12 13h.01 M16 13h.01 M8 17h.01 M12 17h.01 M16 17h.01'),
    'x': svgI('M18 6 6 18 M0 0m6 6 12 12'),
    'info': svgI('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 16v-4 M12 8h.01'),
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

  // Faixa de cor da carta pela nota (bronze, prata, ouro, ícone)
  const tierCls = o => (o >= 85 ? 'icone' : o >= 75 ? 'ouro' : o >= 65 ? 'prata' : 'bronze');
  const TIER_NAME = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', icone: 'Ícone' };

  window.CRAQUE_UI = { ICON, emo, twCode, flag, icoOf, cfg, setCfg, vibe, ask, HOUSE, arm, disarm, tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar };
})();
