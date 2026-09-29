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
  const trophy = (type, size) => window.CRAQUE_TROPHY(type, size);
  const titleType = t => (t.id === 'cont' ? (t.name === 'Libertadores' ? 'lib' : 'ucl') : t.id);
  const meter = (label, v) => '<span class="m"><span class="ml">' + label + ' · ' + S.relLabel(v) + '</span><span class="mb"><i style="width:' + Math.round(v) + '%" class="' + (v >= 62 ? 'hi' : v < 32 ? 'lo' : '') + '"></i></span></span>';

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

  // ---------- barra do jogador ----------
  let lastOvr = 0;
  function bar() {
    const b = $('bar');
    if (!G.c || !G.c.club) { b.hidden = true; return; }
    b.hidden = false;
    requestAnimationFrame(() => document.documentElement.style.setProperty('--bar-h', b.offsetHeight + 'px'));
    const cl = club(G.c.club), lg = league(G.c.club);
    // Nome + botão pequeno de som (dá para silenciar no meio da partida)
    $('bar-name').innerHTML = esc(G.c.name) + ' <button class="snd-mini" id="b-snd" aria-label="Som">' + (window.CRAQUE_SFX && !window.CRAQUE_SFX.on ? '🔇' : '🔊') + '</button>';
    $('b-snd').onclick = e => { e.stopPropagation(); if (window.CRAQUE_SFX) window.CRAQUE_SFX.toggle(); $('b-snd').textContent = window.CRAQUE_SFX.on ? '🔊' : '🔇'; };
    $('bar-sub').innerHTML = crest(cl.id, 'xs') + esc(cl.name) + ' · ' + G.c.age + ' anos';
    $('bar-rel').innerHTML = meter('👔 Técnico', G.c.rel.coach) + meter('📣 Torcida', G.c.rel.fans);
    const T = G.c.totals;
    // Números do topo por posição: goleiro (sem sofrer gol, pênaltis defendidos), zagueiro (gols, sem sofrer gol)
    const tot = G.c.pos === 'GOL' ? [[T.cs || 0, 'S/ GOL'], [T.penSaved || 0, 'PÊN. DEF']]
      : G.c.pos === 'ZAG' ? [[T.goals, 'GOLS'], [T.cs || 0, 'S/ GOL']] : [[T.goals, 'GOLS'], [T.assists, 'ASSIST']];
    $('bar-tot').innerHTML = tot.map(([v, l]) => '<span>' + v + '<small>' + l + '</small></span>').join('') + '<span>' + (T.league + T.cup + T.cont) + '<small>TAÇAS</small></span>';
    const o = S.ovr(G.c);
    const el = $('bar-ovr');
    el.textContent = o;
    el.className = 'ovr metal ' + tierCls(o) + (el.classList.contains('up') ? ' up' : '');
    if (o > lastOvr && lastOvr) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    lastOvr = o;
  }

  // Faixa de cor da carta pela nota (bronze, prata, ouro, ícone)
  const tierCls = o => (o >= 85 ? 'icone' : o >= 75 ? 'ouro' : o >= 65 ? 'prata' : 'bronze');
  const TIER_NAME = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', icone: 'Ícone' };

  window.CRAQUE_UI = { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar };
})();
