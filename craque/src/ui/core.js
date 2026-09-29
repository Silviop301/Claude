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
  const barMeter = (ico, name, txt, v, cls) => '<span class="m" role="button" data-tip="' + ico + ' ' + name + ': ' + txt + '" aria-label="' + name + ': ' + txt + '"><span class="ml">' + ico + '</span><span class="mb"><i class="' + (cls || (v >= 62 ? 'hi' : v < 32 ? 'lo' : '')) + '" style="width:' + Math.round(v) + '%"></i></span></span>';

  function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sem storage */ } }
  function save() { if (G.c && !G.c.retired) store(SAVE, { c: G.c, step: G.step }); else store(SAVE, null); }

  function render(html) {
    screen.innerHTML = html;
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
    $('bar-rel').innerHTML = barMeter('👔', 'Técnico', S.relLabel(G.c.rel.coach), G.c.rel.coach) + barMeter('📣', 'Torcida', S.relLabel(G.c.rel.fans), G.c.rel.fans) +
      barMeter('⭐', 'Fama', S.fameLabel(G.c.fame), Math.min(100, Math.round(G.c.fame / 3)), 'fame') +
      '<span class="bar-btns"><button class="snd-mini" id="b-snd" aria-label="Som">' + (window.CRAQUE_SFX && !window.CRAQUE_SFX.on ? '🔇' : '🔊') + '</button>' +
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
    $('b-snd').onclick = e => { e.stopPropagation(); if (window.CRAQUE_SFX) window.CRAQUE_SFX.toggle(); $('b-snd').textContent = window.CRAQUE_SFX.on ? '🔊' : '🔇'; };
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

  window.CRAQUE_UI = { ask, HOUSE, arm, disarm, tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar };
})();
