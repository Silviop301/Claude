// Interface — tela inicial (home deitada do Treinador). O modo Jogador antigo (carreira, Relâmpago, cartas) saiu em 19/11/2026.
(function () {
  const U = window.CRAQUE_UI;
  const { tierCls, TIER_NAME, G, D, S, sfx, $, screen, SAVE, HALL, YEAR0, esc, money, club, league, stars, year, crest, trophy, titleType, meter, load, store, save, render, bar } = U;
  // ---------- início ----------
  const MODES = {
    treinador: { ic: '📋', name: 'Treinador', full: 'Modo Treinador', sub: 'Escale, mude a tática, aguente a diretoria', dur: 'Save de dias', k: 'Save de', v: 'dias', sec: 'D·04', cont: 'b-cont-co', neu: 'b-new-co' },
  };
  const tk = (cls, id, body, stub, extra) => (id ? '<button class="tk ' + cls + '" id="' + id + '">' : '<div class="tk ' + cls + '" aria-disabled="true">') +
    '<span class="tk-in"><span class="tk-paper"><span class="tk-frame">' + body + '</span></span><span class="tk-stub">' + stub + '</span></span>' + (extra || '') + (id ? '</button>' : '</div>');
  const PLAY_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z" fill="currentColor"/></svg>';
  const PLUS_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const slotsOf = () => [...Array(U.CO_SLOTS).keys()].map(slot => U.coSaved(slot));
  const firstName = n => String(n || '').split(' ').filter(Boolean)[0] || '';
  // Linha de uma carreira salva: escudo, nome e onde ela está
  const NC_SEAL = '<i class="hw-nc" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l7 2.6v5.6c0 4.6-3 8-7 9.8c-4-1.8-7-5.2-7-9.8V5.6z"/></svg></i>';
  const svName = sv => (sv.co || sv.c).name;
  // O ano em que a carreira está (Silvio, 2026-11-11: "quero saber em que ano aquela carreira está"): no Continuar e em cada carreira salva
  const svYear = sv => YEAR0 + ((sv.co || sv.c).season || 0);
  // Excluir carreiras: "Editar" no ingresso troca o ▶ de cada linha por uma lixeira e o canhoto vira "Pronto"
  const TRASH_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/></svg>';
  const editing = new Set();
  // Barra de baixo das quatro telas principais (Jogar, Carreiras, Ranking, Perfil): os mesmos ícones desenhados dos
  // ingressos (bola, taça, medalha de 1º, boneco). Desligada fica apagada em cinza; ligada, colorida e com o nome em ouro
  // Ranking fora da versão 1.0 (Silvio, 2026-11-09): some da home e da barra de baixo; a tela e o servidor continuam no código
  const RANK_ON = false;
  const BETA_ATE = new Date(2026, 11, 1).getTime(); // selo BETA ao lado do logo da home até o lançamento (01/12/2026, hora do aparelho); some sozinho
  const TABS = [['home', 'Jogar', '⚽'], ['ranking', 'Ranking', '🥇'], ['profile', 'Perfil', '👨']].filter(x => RANK_ON || x[0] !== 'ranking');
  U.tabs = cur => {
    const dot = U.ITEMS && U.ITEMS.streak().cells.some(c => c.claim); // prêmio da sequência para pegar: fica no Perfil
    return '<nav class="tabs" aria-label="Seções">' + TABS.map(([k, l, ic]) => '<button data-tab="' + k + '"' + (k === cur ? ' class="on" aria-current="page"' : '') + '>' +
      '<img class="tabs-ic" src="' + U.emoSrc(ic) + '" alt="" draggable="false">' + l +
      (k === 'profile' && dot ? '<em class="tabs-dot" aria-label="prêmio para pegar"></em>' : '') + '</button>').join('') + '</nav>';
  };
  // Topo das quatro telas principais, igual ao da home: logo, sequência, nível (vai ao Perfil) e engrenagem
  U.topBar = (lv = true) => {
    const L = U.PROFILE.level((U.ITEMS.get().prof || {}).xp), st = U.ITEMS.streak();
    return '<div class="hm-top"><h1 class="hm-logo">CLIMBIX</h1>' +
      (st.n ? '<span class="hm-streak" title="Dias seguidos">' + U.emo('🔥', 'sm') + st.n + '</span>' : '') +
      (lv ? '<button class="hm-lv" id="b-prof" aria-label="Perfil, nível ' + L.lv + '"><b>' + L.lv + '</b><i><em style="width:' + Math.round(L.cur / L.next * 100) + '%"></em></i></button>' : '') +
      '<button class="hm-cfg" id="b-sound" aria-label="Configurações">' + U.GEAR_SVG + '</button></div>';
  };
  U.topBarBind = () => {
    if ($('b-prof')) $('b-prof').onclick = () => { sfx('tap'); U.profile(); };
    if ($('b-sound')) $('b-sound').onclick = U.settings;
  };
  // Ingresso das abas (.tk-tab): papel com canhoto deitado, o número no canhoto
  U.tk = tk;
  U.tabTk = (cls, id, ic, title, sub, big, small) => tk('tk-tab ' + cls, id, U.emo(ic, 'lg') + '<span class="tk-t"><b>' + title + '</b><small>' + sub + '</small></span>',
    '<b>' + big + '</b>' + (small ? '<small>' + small + '</small>' : ''));
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.tabs [data-tab]');
    if (!b || b.classList.contains('on')) return;
    sfx('tap'); U.backTo = null; U[b.dataset.tab]();
  });
  const svAt = (mode, slot) => slotsOf(mode)[slot];
  const begin = (mode, slot) => U.coCreate(slot);
  function home() {
    G.c = null; G.step = null; bar();
    // Sem carreira aberta: clubes nas divisões e forças originais
    S.applyLeagues(null);
    U.portMode = false;
    U.backTo = null;
    return homeLand();
  }

  // ---------- home deitada (2026-11-06, telas definidas HPrimeira e HCheio do canvas do modo estádio) ----------
  // Palco deitado do Treinador (U.LD): trilho à esquerda (Jogar, Carreiras, Ranking, Perfil, Ajustes), os quatro modos como
  // ingressos em pé lado a lado; o aberto cresce e mostra as carreiras (Continuar na última, ▶ nas outras, Nova carreira).
  // Vagas cheias: o popup escolhe qual carreira sai. Letra grande (régua de 2026-11-06: 15 a 28 px).
  // Robôs de teste (navigator.webdriver) ficam na home em pé, salvo localStorage climbix-deitado = 1
  U.landOk = () => { try { const v = localStorage.getItem('climbix-deitado'); if (v === '1') return true; if (v === '0') return false; } catch (e) {} return !navigator.webdriver; };
  // Link só do Treinador (Silvio 2026-11-08, para os amigos avaliarem a simulação): climbix.app/?so=treinador deixa a
  // home só com o Treinador neste aparelho (fica guardado); ?so=tudo volta ao jogo inteiro
  try { const q = new URLSearchParams(location.search).get('so'); if (q === 'treinador') localStorage.setItem('climbix-so', 'treinador'); else if (q === 'tudo') localStorage.removeItem('climbix-so'); } catch (e) {}
  // Simulação livre do Treinador (padrão desde 2026-11-10, o Silvio aprovou: o resultado não é predefinido, cada chute é
  // decidido no campinho): ?livre=0 volta ao jogo encenado pelo motor neste aparelho, ?livre=1 religa
  try { const q = new URLSearchParams(location.search).get('livre'); if (q === '0') localStorage.setItem('climbix-sim-livre', '0'); else if (q === '1') localStorage.removeItem('climbix-sim-livre'); } catch (e) { /* sem armazenamento */ }
  // Cérebro 11x11 no campinho: padrão para todos desde 13/11 (o Silvio aprovou); ?motor=0 volta ao campinho antigo neste aparelho, ?motor=11 religa
  try { const q = new URLSearchParams(location.search).get('motor'); if (q === '11') localStorage.setItem('climbix-motor', '11'); else if (q === '0') localStorage.setItem('climbix-motor', '0'); } catch (e) { /* sem armazenamento */ }
  U.motor11 = () => { try { return localStorage.getItem('climbix-motor') !== '0'; } catch (e) { return true; } };
  U.simLivre = () => { try { return localStorage.getItem('climbix-sim-livre') !== '0'; } catch (e) { return true; } };
  U.soCo = () => { try { return localStorage.getItem('climbix-so') === 'treinador'; } catch (e) { return false; } };
  // Home com dois modos (Silvio 2026-11-09): Treinador e Jogador; Jogador desabilitado com "Em breve". Carreira Rápida,
  // Rumo ao Topo e Relâmpago saem da home por enquanto (o código continua aí)
  const LAND_ORDER = ['treinador', 'jogador'];
  const agoTxt = t => { if (!t) return ''; const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.round(m / 60) + ' h' : 'há ' + Math.round(m / 1440) + (m < 2880 ? ' dia' : ' dias'); };
  // Home enxuta (2026-11-08, Silvio: "olha a simplicidade da home do WSC"; menos texto, sem trilho nem barra de outra cor,
  // botões sem desenho à esquerda): logo, um botão dourado (continuar a última carreira), os 4 modos só com o nome e uma
  // linha leve com Carreiras, Ranking, Perfil e Ajustes. Modo sem carreira começa no toque; com carreira abre a janelinha
  function lastSave() {
    let best = null;
    ['treinador'].forEach(m => slotsOf(m).forEach((sv, i) => { if (sv && (!best || (sv.at || 0) > (best.sv.at || 0))) best = { m, i, sv }; }));
    return best;
  }
  // Perfil e Ajustes: modelo chapado, desenho cheio escuro num disco creme (os do ChatGPT destoavam; Silvio, 2026-11-12)
  const fiSvg = d => '<svg class="fi" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#F3F1EA"/><path fill="#0E2E22" fill-rule="evenodd" d="' + d + '"/></svg>';
  const FI_PERFIL = fiSvg('M16 7.4a4.7 4.7 0 1 0 0 9.4a4.7 4.7 0 1 0 0-9.4zM7.4 25.5c.9-4.4 4.3-7 8.6-7s7.7 2.6 8.6 7a12.8 12.8 0 0 1-17.2 0z');
  const FI_AJUSTES = fiSvg('M14.17 8.62L14.56 5.9L17.44 5.9L17.83 8.62A7.6 7.6 0 0 1 19.92 9.49L22.12 7.84L24.16 9.88L22.51 12.08A7.6 7.6 0 0 1 23.38 14.17L26.1 14.56L26.1 17.44L23.38 17.83A7.6 7.6 0 0 1 22.51 19.92L24.16 22.12L22.12 24.16L19.92 22.51A7.6 7.6 0 0 1 17.83 23.38L17.44 26.1L14.56 26.1L14.17 23.38A7.6 7.6 0 0 1 12.08 22.51L9.88 24.16L7.84 22.12L9.49 19.92A7.6 7.6 0 0 1 8.62 17.83L5.9 17.44L5.9 14.56L8.62 14.17A7.6 7.6 0 0 1 9.49 12.08L7.84 9.88L9.88 7.84L12.08 9.49A7.6 7.6 0 0 1 14.17 8.62ZM16 12.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z');
  const LAND_MORE = [['ranking', 'Ranking', 'M12 14a5 5 0 1 0 0-10a5 5 0 1 0 0 10M9 13l-2 8 5-3 5 3-2-8'],
    ['profile', 'Perfil', FI_PERFIL], ['settings', 'Ajustes', FI_AJUSTES]].filter(x => RANK_ON || x[0] !== 'ranking');
  const lineSvg = d => d.charAt(0) === '<' ? d : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  // Computador (desenho aprovado 2026-11-12, quadro "Home no computador"): a última carreira num cartão grande (tabela, próximo
  // jogo, caixa e o Continuar), as vagas do Treinador à direita e Perfil, Ajustes e o disco embaixo. Vale quando a tela larga cabe
  // (U.LD.wroom, o fit em coachland.js decide e redesenha a home se mudar)
  function homeW(last) {
    const B = U._co || {}, brl = B.brl || (v => 'R$ ' + v), sl = slotsOf('treinador');
    // Sem clube (criou o técnico e recarregou antes de assinar, ou demitido): selo redondo neutro, nunca "?" esticado
    const cr = id => id ? crest(id) : NC_SEAL;
    let card;
    if (last) {
      const c = last.sv.co, cl = c.club && club(c.club), ss = c.ss, live = cl && ss && !ss.done && ss.tab;
      const at = svYear(last.sv) + (ss && !ss.done ? ' · Rodada ' + Math.min(ss.i + 1, ss.rounds.length) : !c.club ? ' · escolhendo clube' : ' · pré-temporada');
      let k = '';
      if (live) {
        const pos = S.coPos(c), g = c.board && c.board.goal, nx = S.coNext(c), vs = nx && !nx.bye && club(nx.vs), f = c.fin; let R = null; try { R = f && S.coFinRitmo(c); } catch (e) {}
        k = '<div class="hw-k"><div><small>TABELA</small><b>' + pos + 'º</b><span class="' + (g && pos <= g.pos ? 'up' : 'wn') + '">' + (g ? (g.k === 'titulo' ? 'meta: ser campeão' : 'meta: até o ' + g.pos + 'º') : '') + '</span></div>' +
          '<div><small>PRÓXIMO JOGO</small>' + (vs ? '<span class="hw-vs">' + crest(vs.id) + '<b>' + esc(vs.short || vs.name) + '</b></span><span>' + (nx.home ? 'em casa' : 'fora de casa') + '</span>' : '<b class="sm">' + (nx ? 'rodada sem jogo' : 'fim da temporada') + '</b><span></span>') + '</div>' +
          '<div><small>CAIXA</small><b class="' + (f && f.caixa < 0 ? 'dn' : '') + (f && brl(f.caixa).length > 7 ? ' md' : '') + '">' + (f ? brl(f.caixa) : '—') + '</b><span class="' + (R ? (R.net >= 0 ? 'up' : 'wn') : '') + '">' + (R && B.mi ? (R.net >= 0 ? '▲ + ' : '▼ − ') + B.mi(Math.abs(R.net)) + '/rodada' : '') + '</span></div></div>';
      }
      card = '<div class="hw-c"><small class="hw-l">ÚLTIMA CARREIRA</small><div class="hw-cl">' + cr(cl && cl.id) + '<span><b>' + esc(cl ? cl.short || cl.name : c.name) + '</b><small>Temporada ' + at + '</small></span></div>' + (k || '<span class="rs-gap"></span>') +
        '<button class="hl-go hw-go" id="' + (MODES[last.m].cont || 'hl-go') + '" data-vg="' + last.m + ':' + last.i + '">' + PLAY_SVG + '<b>CONTINUAR</b></button></div>';
    } else card = '<div class="hw-c hw-new"><small class="hw-l">COMECE AQUI</small><b class="hw-t">Sua carreira de técnico</b><span class="hw-s">Escolha um clube, monte o time e jogue a temporada ao vivo.</span><span class="rs-gap"></span>' +
      '<button class="hl-go hw-go solo" id="hl-go" data-mode="treinador">' + PLAY_SVG + '<b>JOGAR</b></button></div>';
    const row = (sv, i) => { if (!sv) return '<button class="hw-r free" data-mode="treinador"><i>+</i><b>Vaga livre · nova carreira</b></button>';
      const c = sv.co, cl = c.club && club(c.club), ss = c.ss, at = svYear(sv) + (ss && !ss.done ? ' · rodada ' + Math.min(ss.i + 1, ss.rounds.length) : !c.club ? ' · escolhendo clube' : ' · pré-temporada');
      return '<button class="hw-r' + (last && last.i === i ? ' on' : '') + '" data-vg="treinador:' + i + '">' + cr(cl && cl.id) + '<span><b>' + esc(cl ? cl.short || cl.name : c.name) + '</b><small>' + (cl ? esc(c.name) + ' · ' : '') + at + '</small></span>' + PLAY_SVG + '</button>'; };
    const more = LAND_MORE.map(([k, l, d]) => '<button class="hl-mr" data-hl="' + k + '">' + lineSvg(d) + '<b>' + l + '</b></button>').join('');
    return '<div class="hlw hl hl-x">' + bdTag() + '<div class="hw-top">' + (U.novidadesLand ? '<button class="hl-nv" id="hl-nv" aria-label="Novidades da versão ' + U.VERSION + '">' + U.emo('📣', 'md') + '<b>' + U.VERSION + ' · Novidades</b>' + (U.newsNew() ? '<i aria-hidden="true"></i>' : '') + '</button>' : '<span></span>') +
      '<b class="hl-logo">CLIMBIX' + (Date.now() < BETA_ATE ? '<i class="hl-beta">BETA</i>' : '') + '</b><div class="hl-tops">' + (U.COINS ? U.COINS.pill('', 'hl-coins') : '') + '</div></div>' +
      '<div class="hw-left">' + card + '<div class="hl-mds"><button class="hl-md hl-treinador" data-mode="treinador" id="b-new-co"><b>Treinador</b></button><button class="hl-md hl-jogador off" disabled aria-disabled="true"><b>Jogador</b><small>Em breve</small></button></div></div>' +
      '<div class="hw-right"><div class="hw-sv"><small class="hw-l">SUAS CARREIRAS · TREINADOR</small>' + sl.map(row).join('') + '</div><div class="hw-bt"><div class="hl-mrs">' + more + '</div>' + discHtml() + '</div></div></div>';
  }
  // Código da publicação (o ?v= que o craque_sw.py põe no index.html): muda a cada publicação, para conferir o patch no aparelho
  const BUILD = ((document.querySelector('script[src*="ui/start.js"]') || {}).src || '').split('v=')[1] || 'local';
  U.BUILD = BUILD;
  const bdTag = () => '<span class="hl-bd">versão ' + esc(BUILD.slice(0, 6)) + '</span>';
  function homeLand() {
    const so = U.soCo(), last = lastSave();
    const cont = last ? '<button class="hl-go" id="' + (MODES[last.m].cont || 'hl-go') + '" data-vg="' + last.m + ':' + last.i + '">' + PLAY_SVG + '<b>CONTINUAR</b><small><span>' + esc(svName(last.sv)) + '</span><i> · ' + svYear(last.sv) + '</i></small></button>'
      : '<button class="hl-go solo" id="hl-go" data-mode="treinador">' + PLAY_SVG + '<b>JOGAR</b></button>';
    const modes = (so ? (last ? ['treinador'] : []) : LAND_ORDER).map(m => m === 'jogador'
      ? '<button class="hl-md hl-jogador off" disabled aria-disabled="true"><b>Jogador</b><small>Em breve</small></button>'
      : '<button class="hl-md hl-' + m + '" data-md="' + m + '" id="b-new-co"><b>Treinador</b></button>').join('');
    const more = (so ? LAND_MORE.filter(x => x[0] === 'settings') : LAND_MORE).map(([k, l, d]) => '<button class="hl-mr" data-hl="' + k + '">' + lineSvg(d) + '<b>' + l + '</b></button>').join('');
    // Home com o jogo passando atrás (Silvio 14/11, desenho E): coluna à esquerda (logo, dourado, botões), o campinho de verdade
    // rodando sozinho à direita, apagado e sem som (homeBg); em cima à direita Instalar, Novidades e as moedas (ou, sem conta,
    // o convite "Ganhe 36 moedas", que abre a criação da conta)
    const bg = !so && U.LP && U.LP.sim ? '<div class="hl-bg" aria-hidden="true"><canvas id="hl-cv"></canvas></div>' : '';
    const gift = !so && !window.CLIMBIX_SOLO && U.cloud && U.cloudStatus && !U.cloudStatus() && !(U.COINS && U.COINS.has('boas-vindas'));
    const html = U.LD.wroom && U.LD.wroom() && !so ? homeW(last) : '<div class="hl hl-x' + (so ? ' hl-so' : ' hl-e') + '">' + bg + '<b class="hl-logo">CLIMBIX' + (Date.now() < BETA_ATE ? '<i class="hl-beta">BETA</i>' : '') + '</b>' +
      (so ? '' : '<p class="hl-nav"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>Joga no navegador · sem baixar nada</p>') + // quem chega pelo Instagram pergunta onde baixar (Silvio, 15/11)
      bdTag() + '<div class="hl-tops">' +
      (U.inApp && U.inApp() ? '<button class="hl-nv hl-ins hl-iab" id="hl-iab"><span class="hl-iab-ic">' + U.inAppIcon + '</span><span><b>Abrir no navegador</b><small>pra instalar e salvar</small></span></button>' : '') + // dentro do Instagram/TikTok (install.js)
      (U.installCan && U.installCan() ? '<button class="hl-nv hl-ins" id="hl-ins"><img src="' + U.installIcon + '" width="34" height="34" alt=""><b>Instalar o app</b></button>' : '') +
      (U.novidadesLand && !so ? '<button class="hl-nv" id="hl-nv" aria-label="Novidades da versão ' + U.VERSION + '">' + U.emo('📣', 'md') + '<b>' + U.VERSION + ' · Novidades</b>' + (U.newsNew() ? '<i aria-hidden="true"></i>' : '') + '</button>' : '') + // notas de versão (settings.js); o pontinho some depois de abrir
      (gift ? '<button class="hl-gift" id="hl-gift">' + U.COINS.svg + '<span><b>GANHE 36 MOEDAS</b><small>Crie sua conta grátis</small></span></button>' : U.COINS ? U.COINS.pill('', 'hl-coins') : '') + '</div>' +
      cont + '<div class="hl-mds">' + modes + '</div><div class="hl-mrs">' + more + '</div>' + discHtml() + (last && U.CHAMA && U.COINS ? U.CHAMA.homeCard() : '') + '</div>'; // chama do técnico só para quem já tem carreira (ui/chama.js)
    U.LD.show(html, st => {
      st.querySelectorAll('[data-hl]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.hl; if (k === 'settings' && U.settingsLand) return U.settingsLand(home); if (k === 'profile' && U.profileLand) return U.profileLand(home); U.ldOff(); if (k === 'settings') return U.settings ? U.settings() : null; (U[k] || home)(); });
      bindSaves(st);
      st.querySelectorAll('[data-md]').forEach(b => b.onclick = () => {
        const m = b.dataset.md; sfx('tap');
        const sl = slotsOf(m);
        if (!sl.some(Boolean)) { U.ldOff(); return begin(m, 0); }
        landMode(m);
      });
      discBind(st);
      if (U.CHAMA) U.CHAMA.homeBind(st, home);
      if (st.querySelector('#hl-ins')) st.querySelector('#hl-ins').onclick = e => { sfx('tap'); const bt = e.currentTarget, t = bt.querySelector('b'); if (!U.installAsk()) { t.textContent = 'Vire o celular em pé'; clearTimeout(bt._t); bt._t = setTimeout(() => { t.textContent = 'Instalar o app'; }, 4000); } };
      if (st.querySelector('#hl-iab')) st.querySelector('#hl-iab').onclick = () => { sfx('tap'); U.inAppGo(); };
      if (st.querySelector('#hl-nv')) st.querySelector('#hl-nv').onclick = () => { sfx('tap'); U.novidadesLand(home); };
      if (st.querySelector('#hl-coins') && U.LD.loja) st.querySelector('#hl-coins').onclick = () => { sfx('tap'); U.LD.loja(0, home); };
      if (st.querySelector('#hl-gift')) st.querySelector('#hl-gift').onclick = () => { sfx('tap'); U.cloud('register', null, null, home); };
      homeBg(st);
      if (U.newsPop && !so) setTimeout(() => { if (st.isConnected && st.querySelector('#hl-nv')) U.newsPop(home); }, 700); // aviso O que mudou, uma vez por atualização (settings.js)
    }, 'O Climbix é jogado com o celular deitado.');
    U.installHomeBind(); // tutorial de instalar: na home deitada abre com o celular em pé (install.js)
  }
  // O jogo passando atrás da home (Silvio 14/11: "o jogo passando atrás? que ideia legal"): o campinho de verdade (livesim.js)
  // joga sozinho no #hl-cv, sem som (o.mute) e sem gol (sem motor mandando chute), um minuto a cada HBG_MIN ms; no minuto 42
  // começa outro jogo. Para sozinho quando a home sai da tela ou outra partida começa (LP._sim é uma só)
  const HBG_MIN = 2800;
  let hbg = null;
  function homeBg(st) {
    const cv = st.querySelector('#hl-cv'), LP = U.LP;
    if (hbg) { clearInterval(hbg.iv); if (LP && LP._sim === hbg.sim) hbg.sim.stop(); hbg = null; }
    if (!cv || !LP || !LP.sim) return;
    const start = () => {
      let sim; try { sim = LP.sim({ me: -1, clean: true, mute: true, seed: Date.now() % 99991, t0: 1, speed: () => 1, spm: () => HBG_MIN / 1000 }); sim.attach(cv); sim.go(); } catch (e) { return; }
      const me = hbg = { sim, t: 1, iv: setInterval(() => {
        if (hbg !== me) return clearInterval(me.iv);
        if (!document.body.contains(cv) || LP._sim !== sim) { clearInterval(me.iv); if (LP._sim === sim) sim.stop(); hbg = null; return; }
        if (document.hidden) return;
        if (++me.t > 42) { clearInterval(me.iv); sim.stop(); return start(); }
        sim.minute(me.t, 50);
      }, HBG_MIN) };
    };
    start();
  }
  // Disco da música (2026-11-11, Silvio: "a música rolando desde a home, um disco girando no canto que indique a música"):
  // canto de baixo à direita, gira enquanto toca; tocar liga/desliga a música (a mesma chave dos Ajustes) e mostra o nome
  // da faixa ao lado por 4 s, que também aparece sozinho quando a faixa troca. A música já começa no primeiro toque (sound.js)
  const DISC_SVG = '<img class="dk-i" src="assets/co/disco.webp" alt="" draggable="false">'; // arte do ChatGPT (arte/disco/disco.png, 2026-11-11)
  // Também na Semana do Treinador (Silvio: "centralizado mas no topo, onde ainda há espaço"): U.discHtml('sm'); o mesmo discBind liga tudo.
  // Tocar no disco (Silvio, 11/11: "clicar no disco, ter uma animação de crescimento, mostra o nome e os controles e depois volta"):
  // o disco cresce num cartão por cima da tela (.hl-dk-p, sem mexer no resto) com o nome, anterior, pausar e próxima;
  // fecha sozinho 5 s depois do último toque, ao tocar fora ou no disco grande
  const IC = {
    pv: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5l-9 7 9 7zM5 5h3v14H5z"/></svg>',
    nx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l9 7-9 7zM16 5h3v14h-3z"/></svg>',
    pa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    pl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  };
  function discHtml(cls) {
    const M = window.CRAQUE_MUSIC;
    if (!M || !M.has) return '';
    return '<div class="hl-dk' + (cls ? ' dk-' + cls : '') + (M.on ? '' : ' off') + '" id="hl-dk"><span class="hl-dk-t" aria-live="polite"></span>' +
      '<button class="hl-dk-b" id="hl-dk-b" aria-label="Música: nome e controles">' + DISC_SVG + '<i></i></button>' +
      '<div class="hl-dk-p" id="hl-dk-p" aria-hidden="true"><button class="dk-big" id="hl-dk-x" aria-label="Fechar">' + DISC_SVG + '</button>' +
      '<div class="dk-r"><span class="dk-nm" aria-live="polite"></span><span class="dk-ct">' +
      '<button class="dk-c" id="hl-dk-pv" aria-label="Música anterior">' + IC.pv + '</button>' +
      '<button class="dk-c pp" id="hl-dk-pp" aria-label="Pausar ou tocar">' + IC.pa + '</button>' +
      '<button class="dk-c" id="hl-dk-nx" aria-label="Próxima música">' + IC.nx + '</button></span></div></div></div>';
  }
  U.discHtml = discHtml;
  U.discBind = st => discBind(st);
  let discOff = null, discT = null, discC = null, discOut = null;
  function discBind(st) {
    const box = st.querySelector('#hl-dk'), M = window.CRAQUE_MUSIC;
    if (!box || !M) return;
    const lbl = box.querySelector('.hl-dk-t'), nm = box.querySelector('.dk-nm'), pp = box.querySelector('#hl-dk-pp');
    let shown = box.classList.contains('dk-sm') ? M.track : ''; // na Semana o nome só aparece quando a faixa troca
    const name = () => { const t = M.title; return M.on ? (t ? '<b>' + esc(t[0]) + '</b>' + (t[1] ? '<small>' + esc(t[1]) + '</small>' : '') : '<b>Música</b><small>toque para começar</small>') : '<b>Música pausada</b><small>toque no play</small>'; };
    const say = () => { if (box.classList.contains('open')) return; lbl.innerHTML = name(); box.classList.add('say'); clearTimeout(discT); discT = setTimeout(() => box.classList.remove('say'), 4000); };
    const close = () => {
      clearTimeout(discC); box.classList.remove('open'); box.querySelector('#hl-dk-p').setAttribute('aria-hidden', 'true');
      if (discOut) { document.removeEventListener('pointerdown', discOut, true); discOut = null; }
    };
    const keep = () => { clearTimeout(discC); discC = setTimeout(close, 5000); };
    const open = () => {
      box.classList.remove('say'); box.classList.add('open'); box.querySelector('#hl-dk-p').setAttribute('aria-hidden', 'false'); paint(); keep();
      if (discOut) document.removeEventListener('pointerdown', discOut, true);
      discOut = e => { if (!box.querySelector('#hl-dk-p').contains(e.target)) { close(); if (box.querySelector('#hl-dk-b').contains(e.target)) e.stopPropagation(); } };
      setTimeout(() => { if (discOut) document.addEventListener('pointerdown', discOut, true); }, 0);
    };
    const paint = () => {
      if (!document.body.contains(box)) { window.removeEventListener('climbix-musica', paint); close(); return; }
      box.classList.toggle('off', !M.on);
      box.classList.toggle('spin', M.state === 'tocando');
      nm.innerHTML = name();
      pp.innerHTML = M.on ? IC.pa : IC.pl;
      const tr = M.track;
      if (tr && tr !== shown && M.on) { shown = tr; say(); }
    };
    if (discOff) window.removeEventListener('climbix-musica', discOff);
    discOff = paint;
    window.addEventListener('climbix-musica', paint);
    let skipOpen = false; // o toque que fechou o cartão não reabre
    box.querySelector('#hl-dk-b').addEventListener('pointerdown', () => { skipOpen = box.classList.contains('open'); });
    box.querySelector('#hl-dk-b').onclick = () => { if (skipOpen) { skipOpen = false; return; } open(); };
    box.querySelector('#hl-dk-x').onclick = close;
    pp.onclick = () => { M.toggle(); shown = M.track; paint(); keep(); };
    box.querySelector('#hl-dk-nx').onclick = () => { if (!M.on) M.toggle(); shown = ''; M.next(); shown = M.track; paint(); keep(); };
    box.querySelector('#hl-dk-pv').onclick = () => { if (!M.on) M.toggle(); M.prev(); shown = M.track; paint(); keep(); };
    paint();
    setTimeout(paint, 900); // a música começa no toque que abriu a home: o estado chega logo depois
  }
  function bindSaves(w) {
    w.querySelectorAll('[data-vg]').forEach(b => b.onclick = () => {
      const [mode, slot] = b.dataset.vg.split(':'), sv = svAt(mode, +slot);
      sfx('tap'); if (!sv) return home();
      U.ldOff();
      return U.coResume(sv);
    });
    w.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
      const mode = b.dataset.mode, sl = slotsOf(mode), free = sl.findIndex(x => !x);
      sfx('tap');
      if (free >= 0) { U.ldOff(); return begin(mode, free); }
      landPick(mode, sl);
    });
  }
  // Janelinha do modo com carreira: as carreiras (Continuar na última, ▶ na outra), Nova carreira e Excluir
  function landMode(m) {
    const M = MODES[m], ed = editing.has(m), sl = slotsOf(m);
    const order = sl.map((sv, i) => [sv, i]).filter(([sv]) => sv).sort((x, y) => (y[0].at || 0) - (x[0].at || 0));
    if (!order.length) { editing.delete(m); U.LD.closePop(); return homeLand(); }
    // Mesma identidade do cartão na lista, no modo excluir e na confirmação: escudo, nome, clube · ano · rodada
    const card = sv => {
      const co = m === 'treinador', c = co ? sv.co : sv.c, cl = c.club && club(c.club);
      let at;
      if (co) { const ss = c.ss; at = svYear(sv) + (ss && !ss.done ? ' · rodada ' + Math.min(ss.i + 1, ss.rounds.length) : !c.club ? ' · escolhendo clube' : ' · pré-temporada'); }
      else at = 'temporada ' + (YEAR0 + c.season);
      return (cl ? crest(cl.id) : co ? NC_SEAL : '') + '<span><b>' + esc(c.name) + '</b><small>' + (cl ? esc(cl.short || cl.name) + ' · ' : '') + at + '</small></span>';
    };
    const row = ([sv, i], first) => {
      const c = m === 'treinador' ? sv.co : sv.c;
      if (ed) return '<div class="hl-row del"><button class="hl-rb" data-del="' + m + ':' + i + '">' + card(sv) + '</button>' +
        '<button class="hl-trash" data-del="' + m + ':' + i + '" aria-label="Excluir ' + esc(c.name) + '">' + TRASH_SVG + '</button></div>';
      return '<div class="hl-row"><button class="hl-rb" data-vg="' + m + ':' + i + '">' + card(sv) + '</button>' +
        (first ? '<button class="hl-cont" data-vg="' + m + ':' + i + '">' + PLAY_SVG + 'Continuar</button>' : '<button class="hl-play" data-vg="' + m + ':' + i + '" aria-label="Continuar ' + esc(c.name) + '">' + PLAY_SVG + '</button>') + '</div>';
    };
    U.LD.pop('<div class="hl-mp' + (order.length > 2 ? ' many' : '') + '"><div class="hl-mph"><b>' + (ed ? 'Excluir qual?' : esc(M.name)) + '</b><button class="hl-ed" data-ed>' + (ed ? 'Pronto' : 'Excluir') + '</button>' +
      '<button class="hl-x-btn" data-pop-x aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="hl-mpg">' + order.map((x, k) => row(x, k === 0)).join('') +
      (ed ? '' : '<button class="hl-new" data-mode="' + m + '">' + PLUS_SVG + '<b>Nova carreira</b></button>') + '</div></div>',
      M.name, w => {
        bindSaves(w);
        w.querySelector('[data-ed]').onclick = () => { sfx('tap'); ed ? editing.delete(m) : editing.add(m); landMode(m); };
        w.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
          const [mode, slot] = b.dataset.del.split(':'), sv = svAt(mode, +slot); if (!sv) return landMode(m);
          const co = mode === 'treinador', c = sv.co || sv.c;
          landAsk('Excluir esta carreira?', '<div class="hl-askc">' + card(sv) + (sv.at ? '<em>salva ' + agoTxt(sv.at) + '</em>' : '') + '</div>' +
            '<p>Some deste aparelho e da nuvem' + (co ? ', com estádio, auxiliar e médico' : '') + '. Não dá para desfazer.</p>', 'Excluir ' + esc(firstName(c.name)), () => {
            store(U.slotKey(U.SAVE_CO, +slot), { co: null, at: Date.now() });
            homeLand(); landMode(m);
          }, true);
        });
      }, 'hl-pop');
  }
  // Pergunta no palco deitado (excluir carreira)
  function landAsk(t, s, ok, go, danger) {
    U.LD.pop('<div class="hl-ask"><b>' + t + '</b>' + (s.charAt(0) === '<' ? s : '<p>' + s + '</p>') + '<div class="hl-ab"><button class="hl-btn line" data-pop-x>Cancelar</button><button class="hl-btn ' + (danger ? 'red' : 'gold') + '" id="hl-ok">' + ok + '</button></div></div>',
      t, w => { w.querySelector('#hl-ok').onclick = () => { sfx('tap'); U.LD.closePop(); go(); }; }, 'hl-pop');
  }
  // Vagas cheias (HCheio): qual carreira sai para a nova entrar; a mais antiga vem marcada. Nada é apagado aqui
  function landPick(mode, sl) {
    const M = MODES[mode], co = mode === 'treinador';
    let pick = sl.reduce((b, sv, i) => ((sv.at || 0) < (sl[b].at || 0) ? i : b), 0);
    const draw = () => {
      const nm = esc(svName(sl[pick]));
      U.LD.pop('<div class="hl-pk"><div class="hl-pkl"><small>' + esc(M.name).toUpperCase() + ' · ' + sl.length + ' DE ' + sl.length + ' VAGAS</small><b>Qual ' + (co ? 'técnico' : 'jogador') + ' sai para o novo entrar?</b><div class="hl-pkg' + (sl.length > 2 ? ' many' : '') + '">' +
        sl.map((sv, i) => { const c = sv.co || sv.c, cl = c.club && club(c.club); return '<button class="hl-pko' + (i === pick ? ' on' : '') + '" data-s="' + i + '">' + (cl ? crest(cl.id) : U.emo(M.ic, 'md')) +
          '<span><b>' + esc(c.name) + '</b><small>' + (cl ? esc(cl.short || cl.name) + ' · ' : '') + svYear(sv) + (sv.at ? ' · ' + agoTxt(sv.at) : '') + '</small></span>' + (i === pick ? '<em>SAI</em>' : '') + '</button>'; }).join('') +
        '</div></div><div class="hl-pkr"><p>' + nm + ' só é apagado quando ' + (co ? 'o novo técnico for ver as propostas' : 'o novo jogador assinar com um clube') + '. Desistiu antes? Ele continua salvo.</p>' +
        '<span class="hl-gr"></span><button class="hl-btn gold" id="hl-pk-ok">Trocar ' + esc(firstName(svName(sl[pick]))) + ' por um novo</button><button class="hl-btn line" data-pop-x>Cancelar</button></div></div>',
        'Vagas cheias', w => {
          w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { pick = +b.dataset.s; sfx('tap'); draw(); });
          w.querySelector('#hl-pk-ok').onclick = () => { sfx('tap'); U.LD.closePop(); U.ldOff(); begin(mode, pick); };
        }, 'hl-pop wide');
    };
    draw();
  }

  // Minhas carreiras: tudo o que ficou das carreiras encerradas (as telas daqui voltam para cá)
  // Voltar de uma tela: para quem pediu (U.backTo) ou para o início
  U.goBack = () => (U.backTo || home)();

  Object.assign(U, { home });
})();
