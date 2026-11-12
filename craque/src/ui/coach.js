// Interface — Modo Treinador (plano, fase 7): criação, propostas de clube, central do clube, time (formação, estilo,
// titulares) e o jogo como resultado; fim da temporada com fama e experiência. O motor é engine/coach.js (S.co*).
// Save próprio (SAVE_CO), separado das carreiras de jogador; G.c fica vazio (a barra do jogador não aparece).
(function () {
  const U = window.CRAQUE_UI;
  // Velocidade padrão dos jogos do Treinador, escolhida nos Ajustes ('1' ou '3'; neste aparelho)
  U.coFx = v => { try { if (v !== undefined) localStorage.setItem('climbix-co-fx', v ? '1' : '0'); return localStorage.getItem('climbix-co-fx') !== '0'; } catch (e) { return true; } }; // comemoração do gol e câmera lenta do chute (lido no livesim.js)
  U.coVel = v => { try { if (v) localStorage.setItem('climbix-co-vel', v); const x = localStorage.getItem('climbix-co-vel'); return x === '3' ? '3' : '1'; } catch (e) { return v === '3' ? '3' : '1'; } };
  const { D, S, sfx, $, esc, money, club, league, crest, load, store, render, bar, G, YEAR0 } = U;
  const SAVE_CO = U.SAVE_CO = 'climbix-treinador-v1';
  let co = null;
  // Cinco vagas (U.CO_SLOTS): co.slot n grava em SAVE_CO + '-' + (n + 1); a vaga 0 é a chave pura
  // savedAt = hora do save desta carreira que este aparelho conhece; frozen = a carreira aberta ficou velha (ver U.coStale)
  let savedAt = 0, frozen = false;
  // Contagem anônima (src/stats.js): carreira começou (assinou com o 1º clube), temporada terminou e carreira encerrada.
  // co.sid só existe no aparelho, para não contar duas vezes ao recarregar; nunca é mandado
  const sid = () => Math.random().toString(36).slice(2, 10);
  const stat = (ev, n) => { if (!co || !window.CLIMBIX_STAT) return; if (!co.sid) co.sid = sid(); window.CLIMBIX_STAT(ev, 'treinador', n || 0, 'co' + co.sid + (n ? '|' + n : '')); };
  const save = step => { if (frozen) return; if (co && co.club && !co.sid) stat('start'); if (co) co.step = step || co.step; savedAt = Date.now(); store(U.slotKey(SAVE_CO, co && co.slot), co ? { co, at: savedAt } : { co: null, at: savedAt }); };
  // Mesma conta em dois aparelhos (2026-11-11): o app que ficou aberto num aparelho seguia com a carreira da memória e, ao
  // salvar, apagava o que foi jogado no outro. Depois de puxar da nuvem (cloud.js), se o save guardado desta vaga é mais
  // novo que o que este aparelho conhece, a carreira aberta não salva mais e o jogo recarrega já com a nova
  U.coStale = () => {
    if (!co || frozen) return false;
    const sv = load(U.slotKey(SAVE_CO, co.slot)); if (!sv || !(sv.at > savedAt)) return false;
    frozen = true; try { sessionStorage.setItem('climbix-outro-aparelho', '1'); } catch (e) {}
    location.reload(); return true;
  };
  const yr = () => YEAR0 + co.season;
  const last = n => String(n || '').split(' ').filter(Boolean).pop() || '';
  const posTxt = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meia', ATA: 'Atacante' };
  const ordTxt = n => n + 'º';
  const enCls = e => (e >= 75 ? 'ok' : e >= 55 ? 'mid' : 'low');

  // ---------- ingresso da tela inicial ----------
  U.coSaved = slot => { const sv = load(U.slotKey(SAVE_CO, slot)); return sv && sv.co && sv.co.mode === 'treinador' ? sv : null; };
  // Com conta, espera a busca da nuvem que estiver no ar (até 2,5 s) e abre o save mais novo da vaga, não o que a home leu
  let resuming = false;
  U.coResume = sv => { sfx('tap'); if (resuming) return; resuming = true;
    const go = () => { resuming = false; const s2 = sv && sv.co ? U.coSaved(sv.co.slot) : null; resume(s2 && s2.at > (sv.at || 0) ? s2 : sv); };
    const C = window.CLIMBIX_CLOUD; if (C && C.wait) C.wait(2500).then(go, go); else go(); };
  U.coStand = () => { if (co) resume({ co }); };
  U.coCreate = slot => create(slot);
  function resume(sv) {
    co = sv.co; if (sv.at) savedAt = sv.at;
    // Save de antes dos elencos reais de fora do Brasil: eles entram na próxima temporada (S.coRealOf)
    if (co.rf === undefined) co.rf = co.club ? co.season + 1 : co.season;
    // Save de antes do nível firme dos jogadores reais (S.coGenSquad, co.lv): vale na próxima temporada
    if (co.lv === undefined) co.lv = co.club ? co.season + 1 : co.season;
    if (!co.sid && co.club) co.sid = sid(); // carreira de antes da contagem: não conta como começo
    G.c = null; bar();
    S.applyLeagues(co);
    if (!co.club) return offers(co.offers || S.coOffers(co));
    if (co.step === 'end' && co.last) return seasonEnd(co.last);
    if (!co.ss) S.coStart(co);
    if (co.live !== undefined && co.ss && co.live === co.ss.i) {
      // O app fechou no meio do jogo (no iPhone, sair e voltar pode recarregar a página): o jogo volta do minuto em que parou
      const lm = co.liveM;
      if (lm && lm.round === (S.coNext(co) || {}).round && !lm.done && lm.us && lm.them) { lm.us.squad = co.squad; return live(lm); }
      return auxFinish();
    }
    delete co.live; delete co.liveM;
    hub();
  }

  // ---------- criação ----------
  function create(slot, pre) {
    slot = Math.max(0, Math.min(U.CO_SLOTS - 1, +slot || 0));
    const st = pre ? { name: pre.name, country: pre.country, start: pre.start, auto: false } : { name: D.randomName('Brasil'), country: 'Brasil', start: 'baixo', auto: true };
    const cty = () => D.COUNTRIES.find(k => k.id === st.country) || D.COUNTRIES[0];
    const START = [['baixo', 'Subir de baixo'], ['livre', 'Qualquer clube']];
    // Deitado e enxuto (2026-11-08, Silvio aprovou "Criar técnico" no canvas): nome grande com a bandeira (o toque abre a
    // grade dos países) e o dado, o começo num seletor e o botão dourado; sem descrições
    const startSeg = () => START.map(([k, t]) => '<button data-v="' + k + '"' + (k === st.start ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + t + '</button>').join('');
    U.LD.show('<div class="tcr"><button class="tcr-back" id="b-back-home" aria-label="Voltar ao início"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<h2 class="tcr-t">Quem é o técnico?</h2>' +
      '<div class="tcr-plate"><button class="tcr-flag" id="co-flag-b" aria-label="Trocar país"><span id="co-flag"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<input class="tcr-name" id="co-name" maxlength="22" value="' + esc(st.name) + '" aria-label="Nome do técnico" autocomplete="off">' +
        '<button type="button" class="tcr-dice" id="co-dice" aria-label="Sortear nome">' + U.emo('🎲', 'md') + '</button></div>' +
      '<div class="tcr-seg" id="co-start">' + startSeg() + '</div>' +
      '<button class="tcr-go" id="b-co-go">Ver propostas</button></div>', null, 'O Treinador é jogado com o celular deitado.');
    const paint = () => { $('co-flag').innerHTML = U.flag(cty().flag); $('co-flag-b').setAttribute('aria-label', 'País: ' + cty().id + '. Trocar'); };
    $('co-flag-b').onclick = () => {
      sfx('tap');
      U.LD.pop('<div class="tcr-pk"><div class="tcr-pkh"><b>País</b><button class="hl-x-btn" data-pop-x aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="tcr-flags">' + D.COUNTRIES.map(k => '<button data-v="' + k.id + '"' + (k.id === st.country ? ' class="on"' : '') + ' aria-label="' + k.id + '">' + U.flag(k.flag, 'sm') + '</button>').join('') + '</div></div>',
        'País', w => w.querySelectorAll('.tcr-flags button').forEach(b => b.onclick = () => {
          st.country = b.dataset.v; if (st.auto) { st.name = D.randomName(st.country, null, st.name); $('co-name').value = st.name; }
          paint(); sfx('tap'); U.LD.closePop();
        }), 'hl-pop tcr-pop');
    };
    $('co-start').querySelectorAll('button').forEach(b => b.onclick = () => { $('co-start').querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); st.start = b.dataset.v; sfx('tap'); });
    $('co-name').oninput = () => { st.name = $('co-name').value; st.auto = false; };
    $('co-dice').onclick = e => { e.preventDefault(); st.auto = true; st.name = D.randomName(st.country, null, $('co-name').value.trim()); $('co-name').value = st.name; sfx('tap'); };
    $('b-back-home').onclick = () => { sfx('tap'); U.home(); };
    $('b-co-go').onclick = () => {
      sfx('tap');
      co = S.coNew({ name: ($('co-name').value.trim() || st.name).slice(0, 22), country: st.country, start: st.start });
      co.autoXI = true;
      // Primeira carreira de técnico neste aparelho (Silvio 2026-11-09): o auxiliar fecha diretoria e patrocínio no padrão
      // (co.first) e mostra o tutorial da Semana (co.tut, ui/coachland.js), a não ser com as dicas desligadas
      if (!load('climbix-co-ja') && ![...Array(U.CO_SLOTS).keys()].some(i => U.coSaved(i))) { co.first = 1; if (!(load('climbix-dicas-v1') || {}).off) co.tut = { n: 0 }; }
      store('climbix-co-ja', 1);
      if (slot) co.slot = slot;
      offers(S.coOffers(co));
    };
    paint();
  }

  // ---------- propostas ----------
  // list: ids de clube. stay: o clube atual entra como "Ficar" (fim de temporada, sem demissão)
  // Voltar das propostas (Silvio, 11/11: "queria poder voltar dessa tela"): carreira que ainda não assinou com ninguém volta
  // para a criação com o nome de antes e a vaga fica livre de novo; no fim da temporada volta para o resumo (as propostas
  // de "Ouvir outros clubes" ficam em co.mkl para o voltar e entrar de novo não sortear outras)
  function offersBack(list, stay) {
    if (co.last && co.hist.length) { if (stay) co.mkl = { s: co.season, l: list }; save('end'); return seasonEnd(co.last); }
    const pre = { name: co.name, country: co.country, start: co.start }, slot = co.slot;
    co = null; store(U.slotKey(SAVE_CO, slot), { co: null, at: Date.now() });
    create(slot, pre);
  }
  function offers(list, stay) {
    co.offers = list; if (!stay) save('offers');
    G.c = null; bar();
    if (U.LD && U.LD.on()) return U.LD.propostas(list, stay);
    const first = !co.hist.length && !co.club;
    const card = id => {
      const cl = club(id), lg = league(id), g = S.coGoalFor(co, id), sq = S.coGenSquad(id, co.season, { rf: co.rf, lv: co.lv, season: co.season }), avg = Math.round(sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11).reduce((a, p) => a + p.ovr, 0) / 11);
      const hard = g.k === 'naocair' || g.k === 'digna', top = ['titulo', 'subir', 'g4'].includes(g.k);
      return '<div class="of-card co-of" style="--of-c:' + (U.bandColor ? U.bandColor(id) : '#1F6B3E') + '">' +
        '<div class="of-band">' + crest(id, 'of-crest') + '<div class="of-id"><b class="of-name">' + esc(cl.name) + '</b><span class="of-lg">' + U.flag(lg.flag) + ' ' + esc(lg.name) + '</span></div></div>' +
        '<div class="of-body"><div class="co-goal ' + (top ? 'top' : hard ? 'hard' : '') + '"><small>A diretoria pede</small><b>' + S.CO_GOAL_TXT[g.k] + '</b></div>' +
        '<div class="of-tiles"><div><b>' + avg + '</b><small>titulares</small></div><div><b>' + ordTxt(g.exp) + '</b><small>na aposta</small></div><div><b>' + sq.length + '</b><small>no elenco</small></div></div>' +
        '<button class="btn' + (stay ? ' ghost' : '') + '" data-sign="' + id + '">Assinar</button></div></div>';
    };
    render('<div class="eyebrow">' + (first ? 'Primeiro emprego' : 'Temporada ' + yr()) + '</div><h2>' + (co.sacked || !co.club ? 'Quem chama você' : 'Outros clubes querem você') + '</h2>' +
      '<p class="lead">' + (first ? 'Escolha onde começa. A meta da diretoria vem junto com o clube.' : !co.club ? 'Depois da saída, estes clubes ligaram.' : 'Pode trocar de clube ou ficar onde está.') + '</p>' +
      '<div class="co-ofs">' + list.map(card).join('') + '</div>' +
      (stay ? '<button class="btn" id="b-co-stay">Ficar no ' + esc(club(co.club).name) + '</button>' : ''));
    document.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
      sfx('tap'); S.coSign(co, b.dataset.sign); co.autoXI = true; co.offers = null; S.coStart(co); save('hub'); welcome();
    });
    if ($('b-co-stay')) $('b-co-stay').onclick = () => { sfx('tap'); co.offers = null; S.coStart(co); save('hub'); hub(); };
  }
  // Chegada: o presidente diz a meta
  function welcome() {
    const cl = club(co.club), g = co.board.goal;
    if (U.LD && U.LD.on()) return U.LD.welcome();
    render('<div class="co-msg"><div class="eyebrow">' + esc(cl.name) + ' · ' + yr() + '</div>' + crest(cl.id, 'co-big') +
      '<h2>Bem-vindo, professor.</h2><p class="lead">O presidente aperta sua mão: "Aqui a meta é uma só: <b>' + S.CO_GOAL_TXT[g.k].toLowerCase() + '</b>. ' +
      (g.k === 'titulo' ? 'Segundo lugar aqui é derrota."' : g.k === 'naocair' || g.k === 'digna' ? 'Ninguém espera milagre, mas vexame não."' : 'Confio no seu trabalho."') + '</p>' +
      '<button class="btn" id="b-co-in">Conhecer o elenco</button></div>', { center: true });
    $('b-co-in').onclick = () => { sfx('tap'); team(); };
  }

  // ---------- central do clube ----------
  const MOOD = {
    feliz: ['"Assim dá gosto de vir ao estádio."', '"A torcida está do seu lado. Eu também."', '"Continue assim, professor."'],
    tranquilo: ['"Estamos no caminho. Sem euforia."', '"Confio, mas quero ver mais."', '"O conselho está calmo. Por enquanto."'],
    preocupado: ['"O conselho começou a perguntar de você."', '"Precisamos de resultado, professor."', '"A paciência aqui não é infinita."'],
    'no limite': ['"Não dá mais para esperar."', '"Os conselheiros querem sua cabeça."', '"Eu seguro até onde der."'],
  };
  const moodLine = () => { const k = S.coMood(co), a = MOOD[k]; return '<div class="co-pres ' + k.replace(' ', '-') + '"><small>Presidente</small><span>' + a[(co.ss ? co.ss.i : 0) % a.length] + '</span></div>'; };
  function table(full) {
    const t = S.coTable(co), me = t.findIndex(x => x.me), n = t.length, ss = co.ss;
    let a = 0, b = n;
    if (!full) { a = Math.max(0, Math.min(me - 2, n - 5)); b = a + 5; }
    return '<div class="rc-tbl co-tbl">' + t.slice(a, b).map((x, k) => { const pos = a + k + 1;
      return '<div class="rt-r' + (x.me ? ' me' : '') + (ss.promo && pos === ss.promo ? ' cut' : '') + (ss.releg && pos === n - ss.releg ? ' cut' : '') + '"><i>' + pos + '</i>' + crest(x.id, 'xs') +
        '<span>' + esc(club(x.id).name) + '</span><em>' + x.j + 'j</em><b>' + x.p + '</b></div>'; }).join('') + '</div>';
  }
  // Tabela inteira: classificação (P J V E D SG), gols e forma (GP GC SG últimos 5), rodadas (placares e jogos que vêm)
  function tabela(tab, rd) {
    G.c = null; bar();
    const ss = co.ss, t = S.coTable(co), n = t.length, R = ss.rounds.length, cur = Math.min(ss.i, R - 1);
    rd = rd == null ? Math.max(0, ss.i - 1) : Math.max(0, Math.min(R - 1, rd));
    const nm = id => { const c = club(id); return esc(c.short || c.name); };
    const zone = pos => ss.promo && pos <= ss.promo ? ' up' : ss.releg && pos > n - ss.releg ? ' dn' : !ss.promo && pos === 1 ? ' up' : '';
    const cut = pos => (ss.promo && pos === ss.promo) || (ss.releg && pos === n - ss.releg) ? ' cut' : '';
    const sg = x => { const d = x.gp - x.gc; return '<em class="' + (d > 0 ? 'pos' : d < 0 ? 'neg' : '') + '">' + (d > 0 ? '+' : '') + d + '</em>'; };
    const dots = f => { const a = (f || '').split(''); while (a.length < 5) a.unshift('-'); return '<span class="tb-f">' + a.map(c => '<i class="' + (c === '-' ? 'n' : c) + '"></i>').join('') + '</span>'; };
    const row = (x, k, cells) => '<div class="tb-r' + zone(k + 1) + cut(k + 1) + (x.me ? ' me' : '') + '"><i>' + (k + 1) + '</i>' + crest(x.id, 'xs') + '<span>' + esc(club(x.id).name) + '</span>' + cells + '</div>';
    let body;
    if (tab === 'cls') body = '<div class="tbx tb-cls" style="--n:' + n + '"><div class="tb-h"><i>#</i><span>Clube</span><b>P</b><em>J</em><em>V</em><em>E</em><em>D</em><em>SG</em></div>' +
      t.map((x, k) => row(x, k, '<b>' + x.p + '</b><em>' + x.j + '</em><em>' + x.v + '</em><em>' + x.e + '</em><em>' + x.d + '</em>' + sg(x))).join('') + '</div>';
    else if (tab === 'gol') body = '<div class="tbx tb-gol" style="--n:' + n + '"><div class="tb-h"><i>#</i><span>Clube</span><em>GP</em><em>GC</em><em>SG</em><small>Últimos 5</small></div>' +
      t.map((x, k) => row(x, k, '<em>' + x.gp + '</em><em>' + x.gc + '</em>' + sg(x) + dots(x.f))).join('') + '</div>';
    else {
      const res = (ss.res || [])[rd], played = rd < ss.i, me = ss.ids.indexOf(co.club);
      const list = played && res ? res.slice().sort((a, b) => (b[0] === me || b[1] === me) - (a[0] === me || a[1] === me)) :
        ss.rounds[rd].map(([h, a]) => [h, a]).sort((a, b) => (b[0] === me || b[1] === me) - (a[0] === me || a[1] === me));
      const pos = i => t.findIndex(x => x.id === ss.ids[i]) + 1;
      body = '<div class="tb-nav"><button id="b-tb-prev" aria-label="Rodada anterior"' + (rd ? '' : ' disabled') + '>‹</button><b>Rodada ' + (rd + 1) + ' <small>de ' + R + (rd === cur && !ss.done ? ' · próxima' : played ? '' : ' · a jogar') + '</small></b><button id="b-tb-next" aria-label="Próxima rodada"' + (rd < R - 1 ? '' : ' disabled') + '>›</button></div>' +
        (played && !res ? '<p class="cf-empty">Placares desta rodada não foram guardados (temporada começou antes desta versão).</p>' :
        '<div class="tb-jg">' + list.map(([h, a, gh, ga]) => { const mine = h === me || a === me, sc = gh != null;
          return '<div class="tb-g' + (mine ? ' me' : '') + '"><span class="h"><small>' + pos(h) + 'º</small><u>' + nm(ss.ids[h]) + '</u>' + crest(ss.ids[h], 'xs') + '</span>' +
            '<b class="' + (sc ? '' : 'vs') + '">' + (sc ? '<em class="' + (gh > ga ? 'w' : '') + '">' + gh + '</em>×<em class="' + (ga > gh ? 'w' : '') + '">' + ga + '</em>' : '×') + '</b>' +
            '<span class="a">' + crest(ss.ids[a], 'xs') + '<u>' + nm(ss.ids[a]) + '</u><small>' + pos(a) + 'º</small></span></div>'; }).join('') + '</div>');
    }
    const leg = tab === 'rod' ? '' : '<div class="tb-leg">' + (ss.promo ? '<span class="up">Acesso</span>' : '<span class="up">Campeão</span>') + (ss.releg ? '<span class="dn">Rebaixamento</span>' : '') + (tab === 'gol' ? '<span class="f"><i class="v"></i>V <i class="e"></i>E <i class="d"></i>D</span>' : '') + '</div>';
    render(U.modeHead({ mode: 'co', nav: 'back', id: 'b-co-back', label: 'Voltar ao clube', title: 'Tabela', sub: esc(ss.name) + ' ' + yr() + ' · ' + (ss.done ? 'encerrada' : 'rodada ' + Math.min(ss.i + 1, R) + ' de ' + R) }) +
      '<div class="cad-tabs tb-tabs"><button data-tb="cls">Classificação</button><button data-tb="gol">Gols e forma</button><button data-tb="rod">Rodadas</button></div>' +
      '<div class="co-box tb-box">' + body + leg + '</div>');
    U.modeHeadBind();
    document.querySelectorAll('[data-tb]').forEach(b => { b.classList.toggle('on', b.dataset.tb === tab); b.onclick = () => { sfx('tap'); tabela(b.dataset.tb, rd); }; });
    if ($('b-tb-prev')) { $('b-tb-prev').onclick = () => { sfx('tap'); tabela('rod', rd - 1); }; $('b-tb-next').onclick = () => { sfx('tap'); tabela('rod', rd + 1); }; }
    $('b-co-back').onclick = () => { sfx('tap'); hub(); };
  }
  function form5() {
    const l = co.ss.log.slice(-5);
    return l.length ? '<div class="co-form">' + l.map(x => '<i class="' + x.res + '" title="' + x.gf + 'x' + x.ga + '">' + x.res.toUpperCase() + '</i>').join('') + '</div>' : '';
  }
  function hub() {
    G.c = null; bar();
    if (U.LD && U.LD.on()) return U.LD.semana();
    save('hub');
    const nx = S.coNext(co), cl = club(co.club), ss = co.ss, B = co.board, pos = S.coPos(co);
    if (!nx) return finishSeason();
    const vs = !nx.bye && club(nx.vs);
    const ult = B.ult ? '<div class="co-ult"><b>Ultimato</b><span>Vença ' + B.ult.need + ' dos próximos ' + B.ult.of + ': ' + B.ult.got + ' de ' + B.ult.need + ' vitórias, ' + (B.ult.of - B.ult.n) + ' jogos para isso.</span></div>' : '';
    render(U.modeHead({ mode: 'co', nav: 'home', id: 'b-co-out', label: 'Voltar ao início do jogo', title: crest(cl.id, 'xs') + esc(cl.name), sub: esc(ss.name) + ' ' + yr() + ' · ' + esc(co.name) + ' · fama ' + co.fame }) +
      ult +
      '<div class="co-next">' + (nx.bye ? '<div class="eyebrow">Rodada ' + nx.round + ' de ' + nx.of + '</div><h2>Sem jogo nesta rodada</h2><p class="lead">O time descansa. Os outros jogam.</p>' :
        '<div class="eyebrow">Rodada ' + nx.round + ' de ' + nx.of + ' · ' + (nx.home ? 'em casa' : 'fora') + '</div>' +
        // Mandante sempre à esquerda; o seu time ganha o destaque (me) e a linha do mando diz o que a casa faz no jogo
        (() => { const us = '<span class="me">' + crest(cl.id, 'co-vc') + '<b>' + esc(cl.short || cl.name) + '</b><small>' + ordTxt(pos) + '</small></span>',
          them = '<span>' + crest(vs.id, 'co-vc') + '<b>' + esc(vs.short || vs.name) + '</b><small>' + ordTxt(S.coTable(co).findIndex(x => x.id === vs.id) + 1) + '</small></span>';
          return '<div class="co-vs">' + (nx.home ? us : them) + '<em>x</em>' + (nx.home ? them : us) + '</div>' +
            '<p class="co-mando ' + (nx.home ? 'up' : 'down') + '">' + (nx.home ? '▲ Em casa · a torcida empurra no começo' : '▼ Fora · eles vão apertar no começo') + '</p>'; })()) +
        '<div class="co-meta"><small>Meta</small><b>' + S.CO_GOAL_TXT[B.goal.k] + '</b><span>' + (B.goal.k === 'titulo' ? 'você está em ' + ordTxt(pos) : 'até o ' + ordTxt(B.goal.pos) + ' · hoje ' + ordTxt(pos)) + '</span></div>' +
        (nx.bye ? '' : scout(S.coPreview(co).them)) + moodLine() +
        '<button class="btn" id="b-co-play">' + (nx.bye ? 'Ver a rodada' : 'Escalar e jogar') + '</button></div>' +
      '<div class="co-side"><div class="co-box"><div class="eyebrow">Tabela ' + form5() + '</div>' + table(false) + '<button class="btn ghost sm" id="b-co-tab">Tabela inteira</button></div>' +
      '<div class="co-acts co-acts3"><button class="btn ghost" id="b-co-team">Time e elenco</button><button class="btn ghost" id="b-co-cad">Caderno</button><button class="btn ghost" id="b-co-fin">Finanças</button></div></div>');
    U.modeHeadBind();
    $('b-co-play').onclick = () => { sfx('tap'); if (nx.bye) { S.coSkipRound(co); save(); return hub(); } team(true); };
    $('b-co-team').onclick = () => { sfx('tap'); team(false); };
    $('b-co-cad').onclick = () => { sfx('tap'); caderno(hub); };
    $('b-co-fin').onclick = () => { sfx('tap'); fin(); };
    $('b-co-tab').onclick = () => { sfx('tap'); tabela('cls'); };
    $('b-co-out').onclick = () => { sfx('tap'); save(); co = null; U.home(); };
  }

  // ---------- finanças: caixa, verba, folha; abas com a temporada, o que vem e os salários ----------
  const mi = v => { const a = Math.abs(v), t = a >= 1e6 ? (a / 1e6).toFixed(a < 1e7 ? 2 : 1).replace(/\.?0+$/, '').replace('.', ',') + ' mi' : a >= 1e3 ? (a < 1e4 ? (Math.round(a / 100) / 10).toFixed(1).replace(/\.0$/, '').replace('.', ',') : Math.round(a / 1e3)) + ' mil' : String(Math.round(a)); return t; };
  const brl = v => (v < 0 ? '− ' : '') + 'R$ ' + mi(v);
  const sgn = v => (v > 0 ? '+ ' : v < 0 ? '− ' : '') + mi(v);
  function finPres(f) {
    const wk = S.coFinSemanas(co);
    if (f.caixa < 0) return ['"Estamos no vermelho, professor. O conselho já sabe."', 'no-limite'];
    if (wk < 6) return ['"O caixa está curto. Nada de loucura."', 'preocupado'];
    if (f.verba > 0) return ['"Pode usar a verba. O resto do caixa paga os salários."', 'tranquilo'];
    return ['"Sem verba por enquanto. Primeiro a gente arruma a casa."', 'tranquilo'];
  }
  function fin(tab) {
    G.c = null; bar();
    tab = tab || 'tmp';
    const f = S.coFin(co), ss = co.ss, folha = S.coFolha(co), wk = S.coFinSemanas(co), x = f.ss;
    const teto = S.coFinTeto ? S.coFinTeto(co) : f.teto, pct = Math.min(100, Math.round(100 * folha / Math.max(1, teto)));
    const row = (t, v, max, neg) => '<div class="cf-li"><span>' + t + '</span><i class="cf-mini"><em class="' + (neg ? 'o' : '') + '" style="width:' + Math.round(100 * Math.min(1, v / Math.max(1, max))) + '%"></em></i><b class="' + (neg ? 'dn' : 'up') + '">' + (v ? (neg ? '− ' : '+ ') + mi(v) : '0') + '</b></div>';
    const homes = ss ? ss.log.filter(l => l.home).length : 0;
    const big = Math.max(x.bil, x.tv, x.pat, x.sal, x.comp, x.prem, x.vend, 1);
    const ent = x.bil + x.tv + x.pat + x.prem + x.vend, sai = x.sal + x.comp, saldo = ent - sai;
    const panes = {
      tmp: row('Bilheteria · ' + D.plural(homes, 'jogo', 'jogos') + ' em casa', x.bil, big) + row('Cota de TV', x.tv, big) + row('Patrocínio', x.pat, big) +
        (x.prem ? row('Prêmios', x.prem, big) : '') + (x.vend ? row('Vendas', x.vend, big) : '') + row('Salários', x.sal, big, true) + row('Contratações', x.comp, big, true) +
        '<i class="cf-ln"></i><div class="cf-li cf-tot"><span>Saldo até agora</span><b class="' + (saldo >= 0 ? 'up' : 'dn') + '">' + sgn(saldo) + '</b></div>',
      seg: S.coFinNext(co).map(n => '<div class="cf-li"><span>' + esc(n.txt) + '</span><b>' + (n.aprox ? '~ ' : '') + mi(n.v) + '</b></div>').join('') || '<p class="cf-empty">A temporada acabou.</p>',
      sal: co.squad.slice().sort((a, b) => b.wage - a.wage).slice(0, 5).map(p => '<div class="cf-pl"><span class="cf-pos">' + p.pos + '</span><span class="cf-pn"><b>' + esc(last(p.n) || p.n) + '</b><small>' + p.age + ' anos</small></span><b class="cf-ov">' + p.ovr + '</b><span class="cf-w">' + mi(p.wage) + '<small>até ' + (yr() + Math.max(0, p.ct - 1)) + '</small></span></div>').join(''),
    };
    const nx = S.coNext(co), vs = nx && !nx.bye && club(nx.vs), pr = finPres(f);
    render(U.modeHead({ mode: 'co', nav: 'back', id: 'b-cf-back', label: 'Voltar ao clube', title: 'Finanças', sub: esc(club(co.club).short || club(co.club).name) + ' · ' + yr() + (ss ? ' · rodada ' + Math.min(ss.i + 1, ss.rounds.length) + ' de ' + ss.rounds.length : '') }) +
      '<div class="cf">' +
      '<div class="cf-card"><div><small class="cf-k">Caixa do clube</small><div class="cf-big' + (f.caixa < 0 ? ' dn' : '') + '">' + brl(f.caixa) + '</div><p class="cf-sm">' +
        (f.caixa < 0 ? 'No vermelho: a cada rodada assim, a diretoria perde a paciência.' : 'Paga ' + D.plural(wk, 'semana', 'semanas') + ' de salário mesmo sem entrar nada.') + '</p></div>' +
        '<div class="cf-two"><div class="cf-tile"><small class="cf-k">Verba para contratar</small><b class="g">' + mi(f.verba) + '</b><small class="cf-sm">para comprar no mercado</small></div>' +
        '<div class="cf-tile"><small class="cf-k">Folha por semana</small><b>' + mi(folha) + ' <span>de ' + mi(teto) + '</span></b><i class="cf-track"><em style="width:' + pct + '%"></em></i></div></div></div>' +
      '<div class="cad-tabs cf-tabs"><button data-ft="tmp">Temporada</button><button data-ft="seg">A seguir</button><button data-ft="sal">Salários</button></div>' +
      '<div class="cf-panel">' + panes[tab] + '</div>' +
      '<p class="cf-pres"><b>Presidente</b> ' + pr[0] + '</p>' +
      (vs ? '<div class="inv-bar fade co-bar"><button class="btn" id="b-cf-play">Escalar e jogar · ' + esc(vs.short || vs.name) + '</button></div>' : '') +
      '</div>');
    U.modeHeadBind();
    document.querySelectorAll('[data-ft]').forEach(b => { b.classList.toggle('on', b.dataset.ft === tab); b.onclick = () => { sfx('tap'); fin(b.dataset.ft); }; });
    $('b-cf-back').onclick = () => { sfx('tap'); hub(); };
    if ($('b-cf-play')) $('b-cf-play').onclick = () => { sfx('tap'); team(true); };
  }
  // Balanço no fim da temporada
  function finEnd(b) {
    if (!b) return '';
    const x = b.ss, L2 = (t, v, neg) => v ? '<div class="cf-li"><span>' + t + '</span><b class="' + (neg ? 'dn' : '') + '">' + (neg ? '− ' : '') + mi(v) + '</b></div>' : '';
    return '<div class="co-box cf-bal"><div class="eyebrow">' + (b.verba === undefined ? 'Balanço até a saída ' : 'Balanço do ano ') + '<span class="cf-stamp ' + (b.saldo >= 0 ? 'up' : 'dn') + '">' + (b.saldo >= 0 ? 'no azul' : 'no vermelho') + '</span></div>' +
      '<div class="cf-big ' + (b.saldo >= 0 ? 'up' : 'dn') + '">' + sgn(b.saldo) + '</div>' +
      '<div class="cf-gr">' + L2('Bilheteria', x.bil) + L2('Salários', x.sal, true) + L2('Cota de TV', x.tv) + L2('Contratações', x.comp, true) + L2('Patrocínio', x.pat) + L2('Prêmios', x.prem) + L2('Vendas', x.vend) + '</div>' +
      (b.verba !== undefined ? '<div class="cf-two"><div class="cf-tile d"><small class="cf-k">Verba para ' + (YEAR0 + b.season + 1) + '</small><b>' + mi(b.verba) + '</b><small class="cf-sm">era ' + mi(b.verba0) + '</small></div>' +
        '<div class="cf-tile d"><small class="cf-k">Teto da folha</small><b>' + mi(b.teto) + '</b><small class="cf-sm">era ' + mi(b.teto0) + '</small></div></div>' : '') + '</div>';
  }

  // ---------- time: formação, estilo e titulares ----------
  // O campo visto de cima: goleiro embaixo; cada linha da formação numa altura (no 4-2-3-1 o meio vira 2 + 3)
  function spots(form) {
    const sl = S.CO_FORMS[form].slots, am = sl.some(x => x.ln === 'am');
    const Y = { g: 90, d: 70, m: am ? 55 : 46, am: 34, a: 17 }, out = [];
    ['g', 'd', 'm', 'am', 'a'].forEach(ln => { const ix = sl.map((x, i) => i).filter(i => sl[i].ln === ln); ix.forEach((i, k) => { out[i] = [Math.round((k + 1) * 100 / (ix.length + 1)), Y[ln]]; }); });
    return out;
  }
  const scout = them => '<p class="co-scout">' + U.emo('🔭', 'xs') + ' Olheiro: o ' + esc(club(them.club).short || club(them.club).name) + ' deve vir no <b>' + them.form + '</b>, ' + S.CO_STY[them.style].name.toLowerCase() + '.</p>';
  // ---------- caderno do técnico ----------
  // O que já se viu em campo: estilo × estilo e formação × formação, "?" no que nunca viu, lápis (pode estar errado)
  // e caneta (certo). Nada de número: seta e palavra
  const CAD_W = { up: ['↑', 'vantagem'], down: ['↓', 'sofre'], eq: ['=', 'parelho'] };
  const cadName = (k, a) => (k === 'sty' ? S.CO_STY[a].name : a);
  const cadCls = c => (!c ? '' : c.pen ? 'pen' + (c.v === 'down' ? ' bad' : c.v === 'eq' ? ' eq' : '') : 'lap');
  const CAD_Q = {
    up: { meio: 'A bola ficou com a gente no meio.', lados: 'Sobramos pelos lados.', area: 'Nossos atacantes levaram a melhor na área.', pressao: 'Roubamos a bola na saída deles.', contra: 'Eles sobem a linha toda e deixam as costas livres. É só esperar e lançar.' },
    down: { meio: 'A bola foi deles o jogo todo.', lados: 'Passaram fácil pelos nossos lados.', area: 'Os atacantes deles sobraram na nossa área.', pressao: 'A pressão deles pegou a gente na saída de bola.', contra: 'Saímos para o jogo e tomamos contra-ataque.' },
  };
  const CAD_S = {
    up: { meio: 'A bola é sua', lados: 'Sobra gente aberta', area: 'Ganha na área', pressao: 'Rouba na saída', contra: 'Espaço nas costas' },
    down: { meio: 'A bola é deles', lados: 'Sofre nos lados', area: 'Perde na área', pressao: 'Sofre na saída', contra: 'Toma contra-ataque' },
  };
  // A frase escrita à mão: o setor que mais pesou para o lado da anotação
  const cadQuote = (k, ab, v) => {
    if (v === 'eq') return 'Ninguém mandou no jogo. Um anula o outro.';
    const sec = S.coCadTruth()[k][ab].sec, ks = Object.keys(sec).sort((a, b) => (v === 'up' ? sec[b] - sec[a] : sec[a] - sec[b]));
    return CAD_Q[v][ks[0]];
  };
  // Linhas "Do seu caderno": o seu plano contra o deles e o que mais já se anotou contra aquele estilo e formação
  function cadLines(form, style, them, max) {
    const out = [], seen = new Set();
    const add = (k, a, b, force) => { const key = k + ':' + a + '|' + b; if (seen.has(key)) return; const c = S.coCadGet(co, k, a, b); if (!c && !force) return; seen.add(key); out.push({ k, a, b, c }); };
    add('sty', style, them.style, true); add('frm', form, them.form, true);
    const pen = (k, b, list) => list.map(a => ({ a, c: S.coCadGet(co, k, a, b) })).filter(x => x.c).sort((x, y) => (y.c.pen - x.c.pen) || ((y.c.v === 'up') - (x.c.v === 'up')));
    pen('sty', them.style, S.CO_STYLES).forEach(x => add('sty', x.a, them.style));
    pen('frm', them.form, Object.keys(S.CO_FORMS)).forEach(x => add('frm', x.a, them.form));
    return out.slice(0, max || 4);
  }
  function cadBlock(form, style, them, live) {
    const l = cadLines(form, style, them, live ? 4 : 4);
    const ln = x => { const w = x.c && CAD_W[x.c.v];
      return '<div class="cad-ln"><span>' + esc(cadName(x.k, x.a)) + ' × ' + esc(cadName(x.k, x.b)) + '</span><b class="' + (x.c ? (x.c.pen ? 'pen ' + x.c.v : 'lap') : 'nv') + '">' +
        (x.c ? w[0] + ' ' + w[1] + (x.c.pen ? '' : ' · lápis') : '? nunca viu') + '</b></div>'; };
    return '<div class="cad-card cad-pre"><div class="cad-hd"><span class="cad-hw">Do seu caderno</span>' + (live ? '<small>contra o plano de agora</small>' : '<button class="cad-open" id="b-cad-open">Abrir</button>') + '</div>' +
      l.map(ln).join('') + '<p class="cad-ft">Só aparece o que você já viu em campo.' + (live ? '' : ' Trocar a tática mostra outras linhas.') + '</p></div>';
  }
  function hintCard() {
    const h = S.coHint(co); if (!h) return '';
    const a = S.coCad(co).aux, n = a.reduce((x, y) => x + y, 0);
    return '<div class="cad-aux"><i aria-hidden="true">' + ICO_AUX + '</i><div><div class="cad-aux-h"><small>Palpite do auxiliar</small><em>PODE ERRAR</em></div>' +
      '<p>"' + esc(S.coHintTxt(h)) + '"</p><small>' + (a.length === 1 ? (n ? 'Ele acertou o único palpite que você testou.' : 'Ele errou o único palpite que você testou.') : a.length ? 'Ele acertou ' + n + ' dos últimos ' + a.length + ' palpites que você testou.' : 'Ainda não deu para saber se ele acerta: teste um palpite.') + '</small></div></div>';
  }
  const ICO_PEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1L19 8l-3-3L5 16z"/></svg>';
  const ICO_AUX = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 12h3l3-7 4 14 3-7h3"/></svg>';
  // Depois do jogo: o que entrou no caderno
  function cadAfter(cad) {
    if (!cad) return '';
    const nn = cad.notes.length, row = [];
    const tag = (c, pen) => '<span class="' + (pen ? 'pen ' + c : 'lap') + '">' + CAD_W[c][0] + '</span>';
    cad.notes.forEach(x => { const [a, b] = x.ab.split('|');
      row.push('<div class="cad-en"><div class="cad-et"><span>' + esc(cadName(x.k, a)) + ' × ' + esc(cadName(x.k, b)) + '</span><span class="cad-ch">' +
        (x.prev ? tag(x.prev, false) : '<span class="nv">?</span>') + '<i aria-hidden="true">→</i>' + tag(x.v, x.pen) + '</span></div>' +
        '<span class="cad-hw sm ' + (x.pen ? '' : 'lap') + '">"' + esc(cadQuote(x.k, x.ab, x.v)) + '" ' + (x.pen ? (x.prev !== x.v ? '(corrigido a caneta)' : '(virou caneta)') : '(lápis)') + '</span></div>'); });
    cad.seen.forEach(x => { const [a, b] = x.ab.split('|');
      row.push('<div class="cad-en"><div class="cad-et"><span>' + esc(cadName(x.k, a)) + ' × ' + esc(cadName(x.k, b)) + '</span><span class="cad-ch">' + tag(x.v, true) + '</span></div><small>Já estava no caderno. O jogo confirmou.</small></div>'); });
    if (cad.hint) { const h = cad.hint, st = { ok: ['ACERTOU', 'up'], bad: ['ERROU', 'down'], nt: ['NÃO TESTADO', 'nt'] }[h.st];
      row.push('<div class="cad-en"><div class="cad-et"><span>Palpite do auxiliar</span><em class="cad-tg ' + st[1] + '">' + st[0] + '</em></div><small>' +
        (h.st === 'nt' ? '"' + esc(S.CO_AUX_DO[h.txt.style].replace(/^eu /, '')) + '" ficou para outro dia: você não jogou assim.' : h.st === 'ok' ? 'Você foi de ' + esc(S.CO_STY[h.txt.style].name.toLowerCase()) + ' e encaixou.' : 'Você foi de ' + esc(S.CO_STY[h.txt.style].name.toLowerCase()) + ' e não encaixou.') + '</small></div>'); }
    if (!row.length) row.push('<div class="cad-en"><small>Nada novo hoje. Jogar de outro jeito, ou contra outro estilo, enche outras casas.</small></div>');
    const per = S.coCadPer(co);
    return '<div class="cad-card cad-post"><div class="cad-hd"><span class="cad-hw">Anotado no caderno</span>' + (nn ? '<em class="cad-new">' + nn + (nn > 1 ? ' NOVAS' : ' NOVA') + '</em>' : '') + '</div>' + row.join('') + '</div>' +
      '<div class="cad-tipl"><b aria-hidden="true">' + ICO_PEN + '</b><span>' + (per > 1 ? 'Com <b>Leitura de jogo ' + co.xp.leitura + '</b> você anota duas coisas por jogo.' : 'Você anota uma coisa por jogo; com <b>Leitura de jogo 4</b>, duas, e o lápis erra menos.') + ' Ver o mesmo confronto de novo passa o lápis para caneta.</span></div>';
  }
  // A tela do caderno: abas Estilos, Formações e Rivais (no computador, estilos e formações lado a lado)
  function caderno(back, tab) {
    G.c = null; bar();
    tab = tab || 'sty';
    const cad = S.coCad(co), cnt = S.coCadSeen(co), F = Object.keys(S.CO_FORMS);
    const SH = { equilibrado: 'Equil.', posse: 'Posse', pressao: 'Pressão', contra: 'Contra', retranca: 'Retr.', lados: 'Lados' };
    const grid = (k, list, hd, lbl) => '<div class="cad-g ' + k + '" style="grid-template-columns:var(--cad-rl) repeat(' + list.length + ',minmax(0,1fr))"><span></span>' +
      list.map(b => '<span class="cad-h">' + hd(b) + '</span>').join('') +
      list.map(a => '<span class="cad-rl">' + lbl(a) + '</span>' + list.map(b => { const c = cad[k][a + '|' + b];
        return c ? '<button class="cad-c ' + cadCls(c) + '" data-cad="' + k + ':' + a + '|' + b + '" aria-label="' + esc(cadName(k, a) + ' contra ' + cadName(k, b)) + '">' + CAD_W[c.v][0] + '</button>' : '<span class="cad-c">?</span>'; }).join('')).join('') + '</div>';
    const page = (k, ttl, n, of, g) => '<div class="cad-card cad-page' + (tab === k ? ' on' : '') + '" data-pg="' + k + '"><div class="cad-hd"><span class="cad-hw">' + ttl + '</span><small>' + n + ' de ' + of + '</small></div>' + g + '</div>';
    const riv = () => { const ids = Object.keys(cad.riv).sort((a, b) => (cad.riv[b].s - cad.riv[a].s) || (cad.riv[b].r - cad.riv[a].r));
      return '<div class="cad-card cad-page' + (tab === 'riv' ? ' on' : '') + '" data-pg="riv"><div class="cad-hd"><span class="cad-hw">Como eles jogaram</span><small>' + D.plural(ids.length, 'rival', 'rivais') + '</small></div>' +
        (ids.length ? ids.map(id => { const x = cad.riv[id], c = club(id);
          return '<div class="cad-rv">' + crest(id, 'xs') + '<span><b>' + esc(c.short || c.name) + '</b><small>' + (x.n === 1 ? 'Rodada ' + x.r + ' de ' + (YEAR0 + x.s) : x.n + ' jogos · o último na rodada ' + x.r + ' de ' + (YEAR0 + x.s)) + '</small></span><em>' + x.form + '<i>' + esc(S.CO_STY[x.style].name) + '</i></em></div>'; }).join('')
          : '<p class="cad-ft">Ainda vazio. Depois de cada jogo, o rival entra aqui com o jeito que jogou.</p>') + '</div>'; };
    render(U.modeHead({ mode: 'co', nav: 'back', id: 'b-cad-back', label: 'Voltar', title: 'O que você já sabe', sub: 'Caderno do técnico · ' + D.plural(cnt.sty + cnt.frm, 'anotação', 'anotações') }) +
      '<div class="cad">' +
      '<div class="cad-tabs"><button data-ct="sty">Estilos</button><button data-ct="frm">Formações</button><button data-ct="riv">Rivais</button></div>' +
      '<div class="cad-tabs wide"><button data-ct="sty">Estilos e formações</button><button data-ct="riv">Rivais</button></div>' +
      '<div class="cad-leg"><span><b class="pen">↑</b> caneta, certo</span><span><b class="lap">↑</b> lápis, pode errar</span><span><b class="nv">?</b> não viu</span></div>' +
      '<div class="cad-pages' + (tab === 'riv' ? ' riv' : '') + '">' +
        page('sty', 'Meu estilo × o estilo deles', cnt.sty, 36, grid('sty', S.CO_STYLES, b => SH[b], a => esc(S.CO_STY[a].name))) +
        page('frm', 'Minha formação × a deles', cnt.frm, 49, grid('frm', F, b => b, a => a)) + riv() + '</div>' +
      '<p class="cad-note">Formação e estilo são anotados separados: um mesmo jogo pode encher uma casa de cada lado. Toque numa casa anotada para ver de onde veio.</p></div>');
    U.modeHeadBind();
    document.querySelectorAll('[data-ct]').forEach(b => { b.classList.toggle('on', b.dataset.ct === tab || (b.parentNode.classList.contains('wide') && tab !== 'riv' && b.dataset.ct === 'sty'));
      b.onclick = () => { sfx('tap'); caderno(back, b.dataset.ct); }; });
    document.querySelectorAll('[data-cad]').forEach(b => b.onclick = () => { sfx('tap'); const [k, ab] = b.dataset.cad.split(':'); cadSheet(k, ab, b); });
    $('b-cad-back').onclick = () => { sfx('tap'); back(); };
  }
  // Uma anotação aberta: a seta, lápis ou caneta, o porquê por setor e de que jogos veio
  function cadSheet(k, ab, btn) {
    const c = S.coCad(co)[k][ab], [a, b] = ab.split('|'), w = CAD_W[c.v], sec = S.coCadTruth()[k][ab].sec;
    document.querySelectorAll('.cad-c.sel').forEach(x => x.classList.remove('sel')); if (btn) btn.classList.add('sel');
    const rows = c.pen ? Object.keys(sec).filter(s => Math.abs(sec[s]) > 0.03).sort((x, y) => Math.abs(sec[y]) - Math.abs(sec[x])).slice(0, 3) : [];
    const d = document.createElement('div'); d.className = 'cad-ov'; d.id = 'cad-ov';
    d.innerHTML = '<div class="cad-sh" role="dialog" aria-label="Anotação"><i class="cad-grab"></i>' +
      '<div class="cad-sh-h"><small>' + (k === 'sty' ? 'Meu estilo × o deles' : 'Minha formação × a deles') + '</small><em class="' + (c.pen ? 'pen' : 'lap') + '">' + (c.pen ? 'CANETA' : 'LÁPIS') + ' · ' + D.plural(c.from.length, 'JOGO', 'JOGOS') + '</em></div>' +
      '<div class="cad-sh-t"><b class="' + (c.pen ? 'pen ' + c.v : 'lap') + '">' + w[0] + '</b><div><h2>' + esc(cadName(k, a)) + '</h2><small>contra ' + esc(cadName(k, b).toLowerCase()) + '</small></div></div>' +
      '<p class="cad-hw' + (c.pen ? '' : ' lap') + '">"' + (c.pen ? '' : 'Acho que: ') + esc(cadQuote(k, ab, c.v)) + '"</p>' +
      (c.pen ? (rows.length ? '<div class="cad-sec"><small>Por setor</small>' + rows.map(s => { const v = sec[s] > 0 ? 'up' : 'down'; return '<div class="' + v + '"><span>' + S.CO_CAD_SEC[s] + '</span><b>' + CAD_W[v][0] + ' ' + CAD_S[v][s] + '</b></div>'; }).join('') + '</div>' : '')
        : '<p class="cad-ft">A lápis: pode estar errado. Ver esse confronto de novo passa a limpo, a caneta.</p>') +
      '<div class="cad-from"><small>De onde veio</small>' + c.from.map((f, i) => '<div><b>' + (f.s !== co.season ? (YEAR0 + f.s) + ' · ' : '') + 'R' + f.r + '</b><span>x ' + esc(nm(f.vs)) + ', ' + f.gf + ' x ' + f.ga + ' <i>' + (i === 0 ? '(lápis)' : c.fix ? '(corrigido a caneta)' : '(virou caneta)') + '</i></span></div>').join('') + '</div>' +
      '<button class="btn" id="b-cad-x">Fechar</button></div>';
    document.body.appendChild(d);
    const close = () => { d.remove(); if (btn) btn.classList.remove('sel'); };
    $('b-cad-x').onclick = () => { sfx('tap'); close(); };
    d.onclick = e => { if (e.target === d) close(); };
  }
  const avail = p => p && !p.out && !p.sus;
  // Cartões no elenco: pendurado (um amarelo da suspensão) e o motivo da suspensão
  const pend = p => (p.yc || 0) === S.CO.ycMax - 1;
  const susTxt = p => (p.ycSus ? 'suspenso, 3º amarelo' : 'suspenso, vermelho');
  // Ícones dos estilos (traço, cor do texto) e o desenho pequeno de cada formação, para os popups de tática
  const STY_IC = {
    equilibrado: '<path d="M12 4v16M5 8h14M5 8l-3 6h6zM19 8l-3 6h6z"/>',
    posse: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
    pressao: '<path d="M6 14l6-6 6 6M6 20l6-6 6 6"/>',
    contra: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    retranca: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    lados: '<path d="M9 12H3M6 9l-3 3 3 3M15 12h6M18 9l3 3-3 3M12 5v14"/>',
  };
  const styIco = k => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (STY_IC[k] || STY_IC.equilibrado) + '</svg>';
  const FORM_TIP = { '4-4-2': 'Equilibrada, dois na frente', '4-3-3': 'Ataca pelos lados', '4-2-3-1': 'Meio cheio, um centroavante', '4-5-1': 'Segura o meio', '3-5-2': 'Alas sobem, três atrás', '3-4-3': 'Muito ataque, pouca proteção', '5-3-2': 'Fecha atrás, sai no contra' };
  const formMini = f => '<svg class="co-fmini" viewBox="0 0 60 80" aria-hidden="true"><rect x="3" y="3" width="54" height="74" rx="4"/><line x1="3" y1="40" x2="57" y2="40"/>' +
    spots(f).map(([x, y]) => '<circle cx="' + (3 + x * 0.54).toFixed(1) + '" cy="' + (3 + y * 0.74).toFixed(1) + '" r="3.6"/>').join('') + '</svg>';
  const CHEV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const XICO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  // Popup no meio da tela, com o fundo escurecido: fecha no X, tocando fora ou com Esc
  function pop(html, label, onBind) {
    closePop();
    const w = document.createElement('div');
    w.className = 'co-pop'; w.id = 'co-pop';
    w.innerHTML = '<div class="co-pop-c" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    document.body.appendChild(w);
    // O toque que abriu o popup (pointerup) ainda gera um clique logo depois, e no celular ele cai no que estiver por baixo
    // do dedo dentro do popup: sem essa trava, tocar num titular já escolhia o reserva da linha ali embaixo
    const t0 = Date.now();
    w.addEventListener('click', e => { if (Date.now() - t0 < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
    w.onclick = e => { if (e.target === w) { sfx('tap'); closePop(); } };
    const x = w.querySelector('[data-pop-x]'); if (x) x.onclick = () => { sfx('tap'); closePop(); };
    pop.esc = e => { if (e.key === 'Escape') closePop(); };
    document.addEventListener('keydown', pop.esc);
    onBind && onBind(w);
    const f = w.querySelector('button:not([disabled])'); if (f) f.focus({ preventScroll: true });
  }
  function closePop() { const w = document.getElementById('co-pop'); if (w) w.remove(); if (pop.esc) document.removeEventListener('keydown', pop.esc); pop.esc = null; }
  function team(toPlay) {
    G.c = null; bar();
    if (U.LD && U.LD.on()) return U.LD.time(toPlay);
    const by = {}; co.squad.forEach(p => { by[p.id] = p; });
    // Titulares que não podem jogar (lesão, suspensão) saem antes de abrir: o auxiliar põe outro
    if (co.xi.some(id => !avail(by[id])) || co.xi.length < 11) { const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; }
    let swap = null; // índice do titular que vai trocar de lugar com outro titular
    const nx = S.coNext(co), vs = nx && !nx.bye && club(nx.vs), cl = club(co.club);
    const vsStrip = () => {
      if (!vs) return '';
      const t = S.coTable(co), pos = id => t.findIndex(x => x.id === id) + 1;
      return '<div class="co-tvs">' + crest(cl.id, 'co-tvc') + '<span><b>' + esc(cl.short || cl.name) + '</b><small>' + ordTxt(pos(cl.id)) + ' · ' + (nx.home ? 'em casa' : 'fora') + '</small></span>' +
        '<em>x</em><span class="r"><b>' + esc(vs.short || vs.name) + '</b><small>' + ordTxt(pos(vs.id)) + '</small></span>' + crest(vs.id, 'co-tvc') + '</div>';
    };
    const scoutBub = them => '<div class="co-bub"><i class="co-bub-a" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/></svg></i>' +
      '<p>O ' + esc(club(them.club).short || club(them.club).name) + ' deve vir no <b>' + them.form + '</b>, ' + S.CO_STY[them.style].name.toLowerCase() + '.<small>Olheiro</small></p></div>';
    // Quem está fora por cartão e quem está pendurado (o auxiliar avisa antes do jogo)
    const cardNote = () => {
      const out = co.squad.filter(p => p.sus), pd = co.squad.filter(p => !p.sus && pend(p) && co.xi.includes(p.id));
      if (!out.length && !pd.length) return '';
      return '<div class="co-bub co-cards"><i class="co-bub-a" aria-hidden="true"><span class="co-yc"></span></i><p>' +
        (out.length ? 'Fora por cartão: ' + out.map(p => '<b>' + esc(last(p.n)) + '</b> (' + (p.ycSus ? '3º amarelo' : 'vermelho') + ')').join(', ') + '. ' : '') +
        (pd.length ? (pd.length === 1 ? '<b>' + esc(last(pd[0].n)) + '</b> está pendurado' : 'Pendurados: ' + pd.map(p => '<b>' + esc(last(p.n)) + '</b>').join(', ')) + ': mais um amarelo e fica fora do próximo jogo.' : '') +
        '<small>Auxiliar</small></p></div>';
    };
    const draw = () => {
      const slots = S.coSlots(co.form), sp = spots(co.form);
      const pv = S.coPreview(co);
      const shirt = (id, i) => { const p = by[id]; if (!p) return '';
        const off = p.pos !== slots[i];
        return '<button class="co-sh' + (swap === i ? ' sel' : '') + (off ? ' off' : '') + '" data-xi="' + i + '" style="left:' + sp[i][0] + '%;top:' + sp[i][1] + '%" aria-label="' + esc(p.n) + ', ' + slots[i] + ', ' + p.ovr + '">' +
          '<i>' + p.ovr + '</i><b>' + esc(last(p.n)) + (pend(p) ? '<span class="co-yc" title="Pendurado"></span>' : '') + '</b><small>' + slots[i] + (off ? ' · ' + p.pos : '') + '</small><em class="' + enCls(p.en) + '" style="width:' + Math.round(p.en) + '%"></em></button>'; };
      $('co-team').innerHTML =
        vsStrip() + (pv ? scoutBub(pv.them) : '') + cardNote() +
        '<div class="co-tac-h">Sua tática</div>' +
        '<div class="co-tac"><button class="co-pick" id="b-co-form"><small>Formação</small><b>' + co.form + '</b>' + CHEV + '</button>' +
          '<button class="co-pick" id="b-co-sty"><small>Estilo</small><b>' + esc(S.CO_STY[co.style].name) + '</b>' + CHEV + '</button></div>' +
        '<p class="co-stip">' + S.CO_STY[co.style].tip + '.</p>' +
        '<div class="co-pitch" aria-label="Titulares no campo"><i class="co-pl-l"></i>' + co.xi.map(shirt).join('') + '</div>' +
        '<p class="co-tip">' + (swap !== null ? 'Toque no titular que vai trocar de lugar com ' + esc(last(by[co.xi[swap]].n)) + '.' : 'Toque num jogador para ver quem pode entrar no lugar dele.') + '</p>' +
        // Espaço do Caderno do técnico: o que você já descobriu do confronto (o resto fica como "?")
        '<div id="co-caderno">' + (U.coCaderno && pv ? U.coCaderno(co, pv) : '') + '</div>';
      bind();
    };
    // Quem pode entrar no lugar de um titular: mesma posição primeiro (a melhor opção marcada), depois fora de posição
    const subPop = i => {
      const slot = S.coSlots(co.form)[i], cur = by[co.xi[i]];
      const rest = co.squad.filter(p => !co.xi.includes(p.id));
      const score = p => p.ovr * (0.6 + 0.4 * p.en / 100);
      const same = rest.filter(p => p.pos === slot).sort((a, b) => avail(b) - avail(a) || score(b) - score(a));
      const other = rest.filter(p => p.pos !== slot && (p.pos === 'GOL') === (slot === 'GOL')).sort((a, b) => avail(b) - avail(a) || b.ovr - a.ovr);
      const best = same.find(avail);
      const note = p => p.out ? 'lesionado, ' + D.plural(p.out, 'jogo', 'jogos') : p.sus ? susTxt(p) :
        [p.age + ' anos', p === best ? 'melhor opção' : '', pend(p) ? 'pendurado' : '', p.en < 55 ? 'cansado' : '', p.mo < 45 ? 'chateado' : p.mo > 75 ? 'motivado' : ''].filter(Boolean).join(' · ');
      const row = p => '<button class="co-pl' + (p === best ? ' best' : '') + (avail(p) ? '' : ' dis') + '" data-sub="' + p.id + '"' + (avail(p) ? '' : ' disabled') + '>' +
        '<span class="co-pos">' + p.pos + '</span><span class="co-pn"><b>' + esc(p.n) + '</b><small>' + note(p) + '</small></span>' +
        '<span class="co-en ' + enCls(p.en) + '"><em style="width:' + Math.round(p.en) + '%"></em></span><b class="co-ov">' + p.ovr + '</b></button>';
      pop('<div class="co-pop-h"><b class="co-pop-ov">' + cur.ovr + '</b><span><b>' + esc(cur.n) + '</b><small>' + slot + ' · ' + cur.age + ' anos · energia ' + Math.round(cur.en) + '%</small></span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
        '<div class="co-pop-b">' + (same.length ? '<div class="co-pop-l">Quem pode entrar no lugar dele</div>' + same.map(row).join('') : '<div class="co-pop-l">Ninguém da posição no elenco</div>') +
        (other.length ? '<div class="co-pop-l">Fora de posição</div>' + other.map(row).join('') : '') + '</div>' +
        '<button class="btn ghost co-pop-sw" id="b-co-swap">Trocar de lugar com outro titular</button>', 'Trocar ' + cur.n, w => {
        w.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { sfx('tap'); co.xi[i] = b.dataset.sub; co.autoXI = false; closePop(); draw(); });
        $('b-co-swap').onclick = () => { sfx('tap'); swap = i; closePop(); draw(); };
      });
    };
    const formPop = () => pop('<div class="co-pop-h"><span><b>Formação</b>' + (nx && !nx.bye && S.coPreview(co) ? '<small>O ' + esc(vs.short || vs.name) + ' deve vir no ' + S.coPreview(co).them.form + '</small>' : '') + '</span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
      '<div class="co-pop-b co-fgrid">' + Object.keys(S.CO_FORMS).map(f => '<button class="co-fc' + (f === co.form ? ' on' : '') + '" data-f="' + f + '">' + formMini(f) + '<span><b>' + f + '</b><small>' + (FORM_TIP[f] || '') + '</small></span></button>').join('') + '</div>', 'Escolher formação', w => {
      w.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
        sfx('tap'); const f = b.dataset.f;
        if (co.autoXI) co.xi = S.coAutoXI(co.squad, f).xi;
        else { const on = co.squad.filter(p => co.xi.includes(p.id)); co.xi = S.coAutoXI(on, f).xi.filter(Boolean); if (co.xi.length < 11) co.xi = S.coAutoXI(co.squad, f).xi; }
        co.form = f; swap = null; closePop(); draw();
      });
    });
    const styPop = () => pop('<div class="co-pop-h"><span><b>Estilo de jogo</b>' + (nx && !nx.bye && S.coPreview(co) ? '<small>O ' + esc(vs.short || vs.name) + ' joga ' + S.CO_STY[S.coPreview(co).them.style].name.toLowerCase() + '</small>' : '') + '</span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
      '<div class="co-pop-b">' + S.CO_STYLES.map(k => '<button class="co-stc' + (k === co.style ? ' on' : '') + '" data-s="' + k + '"><i>' + styIco(k) + '</i><span><b>' + esc(S.CO_STY[k].name) + '</b><small>' + STY_SHORT[k] + '</small></span></button>').join('') + '</div>', 'Escolher estilo', w => {
      w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sfx('tap'); co.style = b.dataset.s; closePop(); draw(); });
    });
    const bind = () => {
      if ($('b-cad-open')) $('b-cad-open').onclick = () => { sfx('tap'); keepBench(); save(); caderno(() => team(toPlay)); };
      $('b-co-form').onclick = () => { sfx('tap'); formPop(); };
      $('b-co-sty').onclick = () => { sfx('tap'); styPop(); };
      document.querySelectorAll('[data-xi]').forEach(b => b.onclick = () => {
        const i = +b.dataset.xi; sfx('tap');
        if (swap === null) return subPop(i);
        if (swap !== i) { const t = co.xi[i]; co.xi[i] = co.xi[swap]; co.xi[swap] = t; co.autoXI = false; }
        swap = null; draw();
      });
    };
    render(U.modeHead({ mode: 'co', nav: 'back', id: 'b-co-back', label: 'Voltar ao clube', title: 'Seu time', sub: vs ? 'Próximo jogo · x ' + esc(vs.short || vs.name) : 'Time e elenco' }) +
      '<div id="co-team"></div>' +
      '<div class="inv-bar fade co-bar"><button class="btn ghost" id="b-co-aux">Sugestão do auxiliar</button>' + (toPlay && vs ? '<button class="btn" id="b-co-go">Jogar</button>' : '<button class="btn" id="b-co-ok">Pronto</button>') + '</div>');
    U.modeHeadBind();
    $('b-co-back').onclick = () => { sfx('tap'); closePop(); keepBench(); save(); hub(); };
    $('b-co-aux').onclick = () => { sfx('tap'); const a = S.coAutoXI(co.squad, co.form); co.xi = a.xi; co.autoXI = true; swap = null; draw(); };
    if ($('b-co-ok')) $('b-co-ok').onclick = () => { sfx('tap'); closePop(); keepBench(); save(); hub(); };
    if ($('b-co-go')) $('b-co-go').onclick = () => { sfx('tap'); closePop(); keepBench(); play(); };
    draw();
  }
  // Banco: os 9 melhores que podem jogar e não são titulares
  const keepBench = () => { co.bench = co.squad.filter(p => avail(p) && !co.xi.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id); };

  // ---------- jogo (nesta parte, direto o resultado) ----------
  let pre = null; // posição, confiança e caixa antes do jogo (o "O que mudou" do fim de jogo deitado)
  const markPre = () => { pre = { pos: S.coPos(co), conf: co.board.conf, caixa: co.fin ? co.fin.caixa : null }; };
  function play(preK) { tacaChance(() => play0(preK)); }
  function play0(preK) {
    markPre();
    const m = S.coMatchStart(co);
    if (!m) return hub();
    if (preK) S.coPre(co, m, preK); // preleção (Treinador deitado)
    // Perfil (metas da semana): a sua posição e a do adversário antes do jogo; vai junto no jogo salvo no meio
    m.pfp = [pre.pos, S.coTable(co).findIndex(t => t.id === m.vs) + 1, co.ss.i];
    // Marca o jogo começado: se a pessoa sai no meio, o auxiliar termina (recarregar não desfaz o resultado)
    co.live = co.ss.i; save('live');
    live(m);
  }
  // Jogo largado no meio (fechou o app): o auxiliar comanda do começo ao fim
  function auxFinish() {
    markPre();
    const m = S.coMatchStart(co);
    delete co.live; delete co.liveM;
    if (!m) { save('hub'); return hub(); }
    S.coMatchRest(co, m);
    const log = S.coMatchEnd(co, m);
    if (U.profileCoGame) U.profileCoGame(co, m, log, true); // jogo do auxiliar: conta a vitória, não anda meta
    save('hub');
    result(m, log, true);
  }

  // ---------- partida ao vivo ----------
  // O motor anda um minuto por vez (S.coMatchStep com `until`), no ritmo escolhido: 1× leva uns 2 minutos, 3× uns 40
  // segundos e ⏩ vai direto ao fim. Para sozinho no gol, vermelho, lesão e intervalo; "Parar e mexer" para quando
  // a pessoa quiser. Na parada sobe um cartão com o lance, a leitura do auxiliar, Trocar (arrastando no campinho) e Tática.
  const SPEED = { 1: ['1×', 2200], 3: ['3×', 444], fim: ['', 0] }; // o 1× anda o campinho a 1,25 (o jogo de 90 min em ~3,5 min, contínuo: dá tempo de a jogada se construir)
  const STY_SHORT = { equilibrado: 'Sem ponto fraco grande', posse: 'Toca até achar o espaço', pressao: 'Rouba lá na frente, cansa', contra: 'Espera e sai rápido', retranca: 'Fecha tudo, pouco ataque', lados: 'Cruza e abre a defesa' };
  const nm = id => { const c = club(id); return c.short || c.name; };
  const LANE = { e: 'pela esquerda', d: 'pela direita', c: 'pelo meio' };
  // Na simulação livre o lance diz como o chute saiu no campinho (e.hd de cabeça, e.far de fora da área); senão, o lado
  const HOW = e => (e.hd ? 'de cabeça' : e.far ? 'de fora da área' : e.l ? LANE[e.l] : '');
  const ICO = {
    pause: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    ff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l7 7-7 7M13 5l7 7-7 7"/></svg>',
    aux: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 12h3l3-7 4 14 3-7h3"/></svg>',
    sub: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v14M3 14l4 4 4-4M17 20V6M13 10l4-4 4 4"/></svg>',
    tac: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a4 4 0 0 1 0 8h-2a4 4 0 0 0 0 8"/></svg>',
    ball: c => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/></svg>',
  };
  const crestB = (id, cls) => crest(id, cls || 'co-vc');
  // A faixa de quem manda no jogo: acima da linha é você, abaixo é o rival (média de 5 minutos)
  // Exposta como U.lvMom(m, marca) para o Jogo a Jogo: m precisa só de { mom: [0..100 por minuto], ev: [{ m, t, s }] }
  function momSvg(m, mark) {
    // Cada minuto: o peso do confronto (quem cria mais) somado aos lances dos últimos minutos (chute, gol), suavizado
    const v = m.mom || [], kick = new Array(v.length + 1).fill(0);
    m.ev.forEach(e => { if ((e.t === 'chance' || e.t === 'gol') && e.m <= v.length) kick[e.m - 1] += (e.s === 'us' ? 1 : -1) * (e.t === 'gol' ? 14 : 8); });
    const raw = v.map((x, i) => (x - 50) * 0.8 + [0, 1, 2, 3].reduce((s, k) => s + (i - k >= 0 ? kick[i - k] * (1 - k * 0.22) : 0), 0));
    const pts = raw.map((x, i) => { const w = raw.slice(Math.max(0, i - 2), i + 3); const a = w.reduce((s, y) => s + y, 0) / w.length; return [i + 0.5, 20 - Math.max(-18, Math.min(18, a * 1.4))]; });
    const area = pts.length ? 'M0 20 ' + pts.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' 20 Z' : '';
    const id = 'mc' + (++momSvg.n);
    const VW = Math.max(90, (m.mom || []).length);
    return '<svg class="lv-mom" viewBox="0 0 ' + VW + ' 40" preserveAspectRatio="none" role="img" aria-label="Quem manda no jogo minuto a minuto">' +
      '<defs><clipPath id="' + id + 'u"><rect x="0" y="0" width="' + VW + '" height="20"/></clipPath><clipPath id="' + id + 'd"><rect x="0" y="20" width="' + VW + '" height="20"/></clipPath></defs>' +
      '<line x1="0" y1="20" x2="' + VW + '" y2="20" class="ln"/><line x1="45" y1="1" x2="45" y2="39" class="ln dash"/>' +
      (area ? '<path d="' + area + '" class="up" clip-path="url(#' + id + 'u)"/><path d="' + area + '" class="dn" clip-path="url(#' + id + 'd)"/>' : '') +
      (mark ? '<line x1="' + mark + '" y1="0" x2="' + mark + '" y2="40" class="mk"/>' : '') + '</svg>';
  }
  momSvg.n = 0;
  U.lvMom = momSvg;
  // Bola parada que não entrou (pênalti, falta direta, cabeçada de escanteio)
  function spMiss(e) {
    const p = esc(e.p);
    if (e.sp === 'pen') return e.k === 'defesa' ? '<b>Pênalti defendido!</b> ' + p + ' bate e o goleiro pega' : e.k === 'trave' ? '<b>Pênalti na trave!</b> ' + p + ' desperdiça' : '<b>Pênalti para fora!</b> ' + p + ' isola';
    if (e.sp === 'falta') return e.k === 'defesa' ? p + ' cobra a falta e o goleiro defende' : e.k === 'bloqueio' ? 'Falta do ' + p + ' na barreira' : e.k === 'trave' ? 'Falta do ' + p + ' na trave!' : 'Falta do ' + p + ' por cima';
    const by = e.sp === 'fc' ? (e.by ? ' na falta cruzada do ' + esc(last(e.by)) : ' na falta cruzada') : e.by ? ' no escanteio do ' + esc(last(e.by)) : ' no escanteio';
    return e.k === 'defesa' ? p + ' cabeceia' + by + ' e o goleiro defende' : e.k === 'bloqueio' ? 'Cabeçada do ' + p + by + ', a zaga trava' : p + ' cabeceia para fora' + by;
  }
  function feedLine(m, e) {
    const who = e.s === 'us' ? nm(co.club) : nm(m.vs);
    const t = e.t === 'gol' ? '<b>GOL do ' + esc(who) + '!</b> ' + esc(e.p || '') + (e.sp === 'pen' ? ' de pênalti' : e.sp === 'falta' ? ' de falta' : e.sp === 'esc' ? ' de cabeça' + (e.by ? ', escanteio do ' + esc(last(e.by)) : ', no escanteio') : e.sp === 'fc' ? ' de cabeça' + (e.by ? ', na falta cruzada do ' + esc(last(e.by)) : ', na falta cruzada') : HOW(e) ? ' ' + HOW(e) : '') :
      e.t === 'chance' && e.sp ? spMiss(e) :
      e.t === 'chance' ? (e.k === 'defesa' ? esc(e.p) + (e.hd ? ' cabeceia ' : ' chuta ' + (HOW(e) ? HOW(e) + ' ' : '')) + 'e o goleiro defende' : e.k === 'fora' ? esc(e.p) + ' finaliza para fora' : e.k === 'trave' ? esc(e.p) + ' acerta a trave!' : 'Chute de ' + esc(e.p) + ' travado pela zaga') :
      e.t === 'vermelho' ? (e.how === '2am' ? '<span class="co-yc"></span> ' : '') + '<span class="co-red"></span> <b>' + esc(e.p) + ' é expulso</b> (' + esc(who) + ')' + (e.how === '2am' ? ', segundo amarelo' : e.how === 'direto' ? ', vermelho direto' : '') :
      e.t === 'amarelo' ? (e.pk ? '<b>Pênalti!</b> ' : '') + '<span class="co-yc"></span> Amarelo para ' + esc(e.p) + ' (' + esc(who) + ')' :
      e.t === 'falta' ? (e.pk ? '<b>Pênalti!</b> ' : '') + 'Falta de ' + esc(e.p) + ' (' + esc(who) + ')' + (e.pk ? ' na área' : e.m % 3 ? '' : ' perto da área') :
      e.t === 'impedimento' ? 'Impedimento: ' + esc(e.p) + ' saiu antes da hora (' + esc(who) + ')' :
      e.t === 'lesao' ? esc(e.p) + ' sente e pede para sair (' + esc(who) + ')' :
      e.t === 'tatica' ? (e.s === 'us' ? 'Você muda para ' + esc(e.p) : 'O ' + esc(who) + ' muda para <b>' + esc(e.p).toLowerCase() + '</b>') :
      e.t === 'troca' ? 'Sai ' + esc(e.p) + ', entra <b>' + esc(e.q) + '</b>' :
      e.t === 'grito' ? 'Você grita da beira do campo: <b>' + esc(e.p) + '</b>' :
      e.t === 'momento' ? (e.ok ? '<b>Funcionou:</b> ' : '<b>Não deu:</b> ') + esc(e.p) :
      e.t === 'grito-fim' ? 'O time volta ao plano de jogo' :
      e.t === 'conversa' ? 'Conversa no vestiário: <b>' + esc(e.p).toLowerCase() + '</b>' :
      e.t === 'acrescimo' ? 'O quarto árbitro levanta a placa: <b>mais ' + e.p + ' ' + (e.p > 1 ? 'minutos' : 'minuto') + '</b>' :
      e.t === 'intervalo' ? 'Fim do primeiro tempo' : '';
    return '<li class="' + e.s + ' ' + e.t + '"><i>' + S.coEvMin(e) + '</i><span>' + t + '</span></li>';
  }
  // Lance da lista do ao vivo deitado (Silvio, 2026-11-10: lista rolável, o último em cima; "quero o nome do jogador que fez a
  // ação também, tá muito curto"): minuto, escudo de quem fez e a frase com o nome completo, em até duas linhas (o escudo já diz
  // o time, então a frase não repete o clube); o que foi ordem sua leva a etiqueta VOCÊ no lugar do escudo
  function feedShort(m, e) {
    const n = esc(e.p || ''), us = e.s === 'us', you = us && (e.t === 'tatica' || e.t === 'troca') || e.t === 'grito' || e.t === 'conversa' || e.t === 'momento';
    const t = e.t === 'gol' ? '<b>GOL!</b> ' + n + (e.sp === 'pen' ? ' de pênalti' : e.sp === 'falta' ? ' de falta' : e.sp ? ' de cabeça' : HOW(e) ? ' ' + HOW(e) : '') :
      e.t === 'chance' && e.sp === 'pen' ? (e.k === 'defesa' ? '<b>Pênalti defendido!</b> ' + n : e.k === 'trave' ? '<b>Pênalti na trave!</b> ' + n : '<b>Pênalti para fora!</b> ' + n) :
      e.t === 'chance' && e.sp === 'falta' ? (e.k === 'defesa' ? n + ' cobra a falta, o goleiro defende' : e.k === 'bloqueio' ? 'Falta de ' + n + ' na barreira' : e.k === 'trave' ? 'Falta de ' + n + ' na trave!' : 'Falta de ' + n + ' por cima') :
      e.t === 'chance' && e.sp ? (e.k === 'defesa' ? n + ' cabeceia, o goleiro defende' : e.k === 'bloqueio' ? 'Cabeçada de ' + n + ' travada' : n + ' cabeceia para fora') :
      e.t === 'chance' ? (e.k === 'defesa' ? n + ' chuta, o goleiro defende' : e.k === 'fora' ? n + ' chuta para fora' : e.k === 'trave' ? n + ' acerta a trave!' : 'Chute de ' + n + ' travado') :
      e.t === 'vermelho' ? (e.pk ? '<b>Pênalti!</b> ' : '') + '<span class="co-red"></span> ' + n + ' é expulso' :
      e.t === 'amarelo' ? (e.pk ? '<b>Pênalti!</b> ' : '') + '<span class="co-yc"></span> Amarelo para ' + n :
      e.t === 'falta' ? (e.pk ? '<b>Pênalti!</b> Falta de ' + n + ' na área' : 'Falta de ' + n) :
      e.t === 'impedimento' ? 'Impedimento de ' + n :
      e.t === 'lesao' ? n + ' sente e pede para sair' :
      e.t === 'tatica' ? 'Muda para ' + (us ? n : n.toLowerCase()) :
      e.t === 'troca' ? 'Sai ' + n + ', entra <b>' + esc(e.q || '') + '</b>' :
      e.t === 'grito' ? 'Grito: <b>' + n + '</b>' :
      e.t === 'momento' ? (e.ok ? '<b class="mom-ok">✓ Funcionou</b> ' : '<b class="mom-no">Não deu</b> ') + n :
      e.t === 'grito-fim' ? 'O time volta ao plano de jogo' :
      e.t === 'conversa' ? 'Vestiário: <b>' + n.toLowerCase() + '</b>' :
      e.t === 'acrescimo' ? 'Mais ' + e.p + (e.p > 1 ? ' minutos' : ' minuto') + ' de acréscimo' :
      e.t === 'intervalo' ? 'Fim do primeiro tempo' : '';
    if (!t) return feedLine(m, e);
    const who = you ? '<u>VOCÊ</u>' : e.s === 'us' || e.s === 'them' ? crestB(us ? co.club : m.vs, 'ldl-c16') : '';
    return '<li class="' + (e.s || '') + ' ' + e.t + (you ? ' vc' : '') + '"><i>' + S.coEvMin(e) + '</i>' + who + '<span>' + t + '</span></li>';
  }
  // Posição no campinho (deitado: você ataca para a direita). As linhas sobem quando o time manda no jogo
  function lvDots(s, mine, mom, min) {
    const sp = spots(s.form), shift = (mom - 50) * 0.18 * (mine ? 1 : -1);
    return s.xi.map((id, i) => { if (!id || !sp[i]) return '';
      const [x, y] = sp[i], j = Math.sin(min * 1.7 + i * 2.3) * 1.6;
      const L = mine ? 4 + (100 - y) * 0.46 + (i ? shift : 0) + j : 96 - (100 - y) * 0.46 + (i ? shift : 0) - j;
      const T = mine ? x : 100 - x;
      return '<i class="' + (mine ? 'us' : 'th') + (i ? '' : ' gk') + '" style="left:' + L.toFixed(1) + '%;top:' + (T + Math.cos(min + i) * 1.5).toFixed(1) + '%"></i>'; }).join('');
  }
  function lvBall(m, mom) {
    const e = m.ev.filter(x => (x.t === 'chance' || x.t === 'gol') && x.m >= m.min - 1).pop();
    if (e) { const us = e.s === 'us', top = e.l === 'c' ? 50 : (e.l === 'e') === us ? 22 : 78; return [us ? 88 : 12, top]; }
    return [50 + (mom - 50) * 0.7 + Math.sin(m.min * 0.9) * 12, 50 + Math.sin(m.min * 1.3) * 26];
  }
  // A formação de verdade para o campinho com jogadores que decidem (ui/livesim.js): [papel, profundidade 0-1, largura 0-100],
  // goleiro primeiro e o resto do mais recuado ao mais adiantado; expulso não entra (a lista fica menor)
  function simForm(s) {
    const sl = S.CO_FORMS[s.form].slots, sp = spots(s.form), am = sl.some(x => x.ln === 'am');
    S.coNums(s.squad);
    const DP = { g: 0, d: 0.17, m: am ? 0.42 : 0.48, am: 0.66, a: 0.88 }, out = [];
    sl.forEach((x, i) => {
      if (!s.xi[i] || !sp[i]) return;
      const lat = sp[i][0], w = Math.max(8, Math.min(92, 50 + (lat - 50) * 1.25));
      const r = x.pos === 'GOL' ? 'GK' : x.pos === 'LAT' ? (lat < 50 ? 'LB' : 'RB') : x.pos === 'ZAG' ? 'CB' : x.pos === 'ATA' ? 'ST' : x.w ? (lat < 50 ? 'LM' : 'RM') : 'CM';
      const pl = (s.squad || []).find(q => q.id === s.xi[i]), ov = pl ? pl.ovr - (100 - (pl.en === undefined ? 100 : pl.en)) * 0.1 : undefined; // cansado rende menos
      out.push([r, DP[x.ln] + (x.pos === 'LAT' && x.ln === 'd' ? 0.05 : 0) + (x.w && x.ln === 'a' ? -0.08 : 0), w, ov, pl ? { id: pl.id, num: pl.num, nm: last(pl.n) || pl.n, at: S.coAtSim(pl, ov - pl.ovr), yc: () => !!(s.bk && s.bk[pl.id]), enf: () => (pl.en === undefined ? 100 : pl.en) } : null]); // energia ao vivo (o motor gasta minuto a minuto)
    });
    const gk = out.filter(p => p[0] === 'GK'), rest = out.filter(p => p[0] !== 'GK').sort((a, b) => a[1] - b[1]);
    if (!gk.length && rest.length) { const g0 = rest.shift(); g0[0] = 'GK'; g0[1] = 0; g0[2] = 50; gk.push(g0); }
    return gk.concat(rest);
  }
  function live(m) {
    U._coLiveM = m; // para as ferramentas de foto (cartões no Mexer no time)
    G.c = null; bar();
    co.speed = U.coVel(); // todo jogo começa na velocidade dos Ajustes (Silvio, 10/11: o jogador escolhe 1× ou 3×; antes sempre 1×)
    const cl = club(co.club), vs = club(m.vs), H = m.home ? cl : vs, A = m.home ? vs : cl;
    let timer = null, seen = new Set(), read = null, open = false, firstMove = null;
    let retomado = m.ev.length > 0; // jogo retomado no meio: a primeira pintura repõe a narração do que já aconteceu, sem o som do gol antigo nem a placa de acréscimo
    // O campinho com jogadores que decidem (o mesmo do Jogo a Jogo): o motor do Treinador manda em quem está melhor e nos
    // lances (gols e chances); a bola joga cada lance e só então o placar e a narração mostram
    const LP = U.LP, useSim = !!(LP && LP.sim);
    const KT = useSim ? LP.kits(LP.kitFor(cl.name, cl.id), LP.kitFor(vs.name, vs.id), !!m.home) : null;
    const hidden = new Set(), sent = new Set(); // lances que o campinho ainda está jogando / já mandados para ele
    m.ev.forEach(e => sent.add(e)); // jogo retomado no meio: o que já aconteceu não volta a ser jogado no campinho
    let stopW = 0, sim = null, wait = null, wantStop = false, h1 = !!m.half, h2 = m.min > 45, frz = 0, lineKey = ['', ''], styKey = ['', ''];
    // Simulação livre (teste: ?livre=1 liga, ?livre=0 desliga): o gol nasce no campinho e o motor só anota (S.coMatchShot)
    const FREE = useSim && !!(U.simLivre && U.simLivre());
    // No livre o 3× dá ao campinho os mesmos segundos por minuto do 1× (o gol depende do que o campo joga): o jogo leva ~1,5 min
    const spMs = k => (FREE && k === '3' ? 917 : SPEED[k][1]);
    const pitchHtml = useSim ?
      '<div class="lp-pitch lp-cvm lv-cvp" id="lp-pitch" aria-hidden="true"><b class="lp-band" id="lp-band"></b><canvas class="lp-cv" id="lp-cv"></canvas>' +
        '<span class="lp-tag lv-read" id="lv-zone" hidden></span><span class="lp-tag lp-zone" id="lp-zone"></span>' +
        '<div class="lv-forms"><span><i style="background:' + KT.mine[0] + '"></i><b id="lv-fu"></b></span><span><i style="background:' + KT.opp[0] + '"></i><b id="lv-ft"></b></span></div></div>' :
      '<div class="lv-pitch" id="lv-pitch"><div class="lv-f"><i class="c"></i><i class="b l"></i><i class="b r"></i></div><div id="lv-zone"></div><div id="lv-dots"></div><span class="lv-ball" id="lv-ball"></span>' +
        '<div class="lv-forms"><span><i class="us"></i><b id="lv-fu"></b></span><span><i class="th"></i><b id="lv-ft"></b></span></div></div>';
    const LDon = !!(U.LD && U.LD.on()); let ctx = null; // Treinador deitado: o mesmo jogo no palco de 844×390 (ui/coachland.js)
    const feed0 = LDon ? '<li><i>0\'</i><span>Bola rolando</span></li>' : '<li><i>0\'</i><span>Bola rolando. ' + esc(nm(co.club)) + ' no ' + m.us.form + ', ' + esc(S.CO_STY[m.us.style].name.toLowerCase()) + '; ' + esc(nm(m.vs)) + ' no ' + m.them.form + '.' + '</span></li>';
    const speedHtml = '<div class="lv-speed" id="lv-speed">' + ['1', '3'].map(k => '<button data-sp="' + k + '"' + (k === co.speed ? ' class="on"' : '') + '>' + SPEED[k][0] + '</button>').join('') + '<button data-sp="fim" aria-label="Pular para o fim">' + ICO.ff + '</button></div>';
    window.CRAQUE_CROWD = { home: !!m.home }; // cantos da torcida: em casa altos, fora baixinhos (sound.js)
    if (LDon) { U.LD.show(U.LD.liveHtml({ H, A, m, pitchHtml, feed0, speedHtml, crestB, pause: ICO.pause, kits: KT })); if (U.discBind) U.discBind(document.getElementById('ld') || document); } // disco da música, se estiver no campinho
    else render('<div class="lv">' +
      '<div class="lv-board"><div class="lv-sc"><span>' + crestB(H.id) + '<b>' + esc(H.short || H.name) + '</b><i class="lv-crd" id="lv-cd-h"></i></span>' +
        '<div class="lv-mid"><em id="lv-score">0 <i>x</i> 0</em><small id="lv-clock"><i></i>0\'</small></div><span>' + crestB(A.id) + '<b>' + esc(A.short || A.name) + '</b><i class="lv-crd" id="lv-cd-a"></i></span></div>' +
        '<div class="lv-momh"><small>Quem manda no jogo</small><small id="lv-momw"></small></div><div id="lv-mom"></div></div>' +
      pitchHtml +
      '<div class="lv-stats"><div><small>Chutes</small><b id="lv-sh">0 · 0</b></div><div><small>No gol</small><b id="lv-ot">0 · 0</b></div><div><small>Posse</small><b id="lv-ps">50%</b></div></div>' +
      '<div class="lv-cst" id="lv-cst"></div>' +
      '<div class="lv-aux" id="lv-aux"></div>' +
      '<ul class="lv-feed" id="lv-feed"><li><i>0\'</i><span>Bola rolando. ' + esc(nm(co.club)) + ' no ' + m.us.form + ', ' + esc(S.CO_STY[m.us.style].name.toLowerCase()) + '; ' + esc(nm(m.vs)) + ' no ' + m.them.form + '.</span></li></ul>' +
      '<div class="lv-bar"><div class="lv-speed" id="lv-speed">' + ['1', '3'].map(k => '<button data-sp="' + k + '"' + (k === co.speed ? ' class="on"' : '') + '>' + SPEED[k][0] + '</button>').join('') +
        '<button data-sp="fim" aria-label="Pular para o fim">' + ICO.ff + '</button></div><button class="btn" id="b-lv-stop">' + ICO.pause + 'Parar e mexer</button></div>' +
      '<div class="lv-sheet" id="lv-sheet"></div></div>');
    const ourGoals = () => (m.home ? m.gh : m.ga), theirGoals = () => (m.home ? m.ga : m.gh);
    const mom = () => { const v = m.mom || []; const w = v.slice(-6); return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 50; };
    const auxBox = r => '<span class="lv-ai">' + ICO.aux + '</span><div><small>Auxiliar, no banco</small><span>"' + esc(r.txt) + '"</span>' +
      (r.tags.length ? '<p class="lv-tags">' + r.tags.map(t => '<em>' + esc(t) + '</em>').join('') + '</p>' : '') + '</div>';
    const homeGoal = e => (e.s === 'us') === !!m.home;
    const paint = () => {
      let hh = 0, ha = 0; hidden.forEach(e => { if (e.t === 'gol') { if (homeGoal(e)) hh++; else ha++; } });
      if (!$('lv-score')) return; // a tela do jogo já saiu (lance atrasado do campinho ou relógio ainda agendado)
      $('lv-score').innerHTML = (m.gh - hh) + ' <i>x</i> ' + (m.ga - ha);
      $('lv-clock').innerHTML = '<i></i>' + S.coClock(m);
      const ps = S.coPoss(m), pu = m.home ? ps : 1 - ps, sh = m.sh || { us: 0, them: 0 }, ot = m.ot || { us: 0, them: 0 };
      const hs = m.home ? [sh.us, sh.them] : [sh.them, sh.us], ho = m.home ? [ot.us, ot.them] : [ot.them, ot.us];
      $('lv-sh').textContent = hs[0] + ' · ' + hs[1]; $('lv-ot').textContent = ho[0] + ' · ' + ho[1];
      // Cartões embaixo do escudo e a linha de faltas, impedimentos e cartões (só o que o campinho já mostrou)
      const vis = t => m.ev.filter(e => e.t === t && !hidden.has(e)), cnt = (t, sd) => vis(t).filter(e => e.s === sd).length;
      const hsd = m.home ? 'us' : 'them', asd = m.home ? 'them' : 'us';
      [['h', hsd], ['a', asd]].forEach(([k, sd]) => { const el = $('lv-cd-' + k); if (el) el.innerHTML = '<span class="co-yc"></span>'.repeat(Math.max(0, cnt('amarelo', sd) - vis('vermelho').filter(e => e.s === sd && e.how === '2am').length)) + '<span class="co-red"></span>'.repeat(cnt('vermelho', sd)); });
      const fo = m.fo || { us: 0, them: 0 }, of = m.of || { us: 0, them: 0 }, hv2 = o => (m.home ? [o.us, o.them] : [o.them, o.us]);
      const yH = cnt('amarelo', hsd) + vis('vermelho').filter(e => e.s === hsd && e.how === '2am').length, yA = cnt('amarelo', asd) + vis('vermelho').filter(e => e.s === asd && e.how === '2am').length;
      if ($('lv-cst')) $('lv-cst').innerHTML = '<span>Faltas<b>' + hv2(fo).join(' · ') + '</b></span><span>Impedim.<b>' + hv2(of).join(' · ') + '</b></span><span>Cartões<b><span class="co-yc"></span> ' + yH + ' · ' + yA + (cnt('vermelho', hsd) + cnt('vermelho', asd) ? ' <span class="co-red"></span> ' + cnt('vermelho', hsd) + ' · ' + cnt('vermelho', asd) : '') + '</b></span>';
      $('lv-ps').innerHTML = Math.round((m.home ? pu : 1 - pu) * 100) + '<small>%</small>';
      $('lv-mom').innerHTML = momSvg(m);
      const mo = mom(); if ($('ldl-momb')) $('ldl-momb').style.width = Math.max(4, Math.min(96, mo)) + '%';
      $('lv-momw').textContent = m.min < 5 ? 'começo de jogo' : mo > 56 ? nm(co.club) + ' por cima' : mo < 44 ? nm(m.vs) + ' por cima' : 'jogo parelho';
      if (!useSim) {
        $('lv-dots').innerHTML = lvDots(m.us, true, mo, m.min) + lvDots(m.them, false, 100 - mo, m.min);
        const b = lvBall(m, mo); $('lv-ball').style.left = b[0] + '%'; $('lv-ball').style.top = b[1] + '%';
      } else if (sim) {
        // Mudou a formação (sua ou deles) ou alguém foi expulso: o campinho reposiciona
        [m.us, m.them].forEach((s, k) => { const key = s.form + ':' + s.xi.join(','), sk = s.style + ':' + (s.shout ? s.shout.k : ''); if (key !== lineKey[k]) { lineKey[k] = key; styKey[k] = ''; sim.lineup(k, simForm(s)); }
          if (sk !== styKey[k]) { styKey[k] = sk; sim.style(k, S.coSimSty(s)); } });
      }
      $('lv-fu').textContent = m.us.form; $('lv-ft').textContent = m.them.form;
      if (!read || m.min % 10 === 0 || m.stop) read = S.coRead(co, m);
      $('lv-aux').innerHTML = auxBox(read);
      // A faixa de onde eles chegam: a direita da tela é o seu ataque; a sua direita fica embaixo
      if (!useSim) $('lv-zone').innerHTML = read.side ? '<i class="' + (read.side === 'direita' ? 'bot' : 'top') + '"></i><b class="' + (read.side === 'direita' ? 'bot' : 'top') + '">Atacam pela sua ' + read.side + '</b>' : '';
      else { const z = $('lv-zone'); z.hidden = !read.side; if (read.side) z.textContent = 'Atacam pela sua ' + read.side; }
      const fresh = m.ev.filter(e => !seen.has(e) && !hidden.has(e));
      if (fresh.length && sim && sim.board && !retomado) fresh.filter(e => e.t === 'acrescimo').forEach(e => sim.board({ add: e.p }));
      if (fresh.length) { fresh.forEach(e => seen.add(e)); $('lv-feed').insertAdjacentHTML('afterbegin', fresh.reverse().map(e => (LDon ? feedShort(m, e) : feedLine(m, e))).join('')); if (LDon) $('lv-feed').scrollTop = 0; { const gl = fresh.filter(e => e.t === 'gol').pop(); if (gl && !retomado) sfx(U.goalSnd(gl.s === 'us', !!m.home)); } }
      retomado = false;
      if (ctx) U.LD.livePaint(ctx);
    };
    // Festa do título no campinho (Silvio 12/11): o jogo que deu o título vira festa no campo, com o cartão no painel da direita
    // (troca a tela cheia de confete, que fica só para o jogo sem campinho). Copas: a mesma festa
    const festa = (log, go) => {
      const cup = !!(log && log.cup && log.champ), name = cup ? log.name : co.ss.name;
      if (cup) log.tcOk = 1; else co.ss.tw = 1;
      save('hub'); $('lv-sheet').classList.remove('on');
      let sub = '';
      if (cup) sub = 'Copa · ' + m.gh + ' x ' + m.ga; else { const me = S.coTable(co).find(x => x.me), left = co.ss.rounds.length - co.ss.i; sub = me.p + ' pontos' + (left > 0 ? '<br>' + left + (left === 1 ? ' rodada' : ' rodadas') + ' de folga' : ''); }
      sim.festa((window.CRAQUE_TROPHY_IMGS || {})[name]); sfx('fanfare');
      const side = document.querySelector('.ldl-side'), d = document.createElement('div'); d.className = 'ldl-festa';
      d.innerHTML = '<div class="ldf-c">' + (window.CRAQUE_TROPHY ? window.CRAQUE_TROPHY(cup ? log.tr || 'cup' : 'league', 70, name) : '') + '<small>' + esc(name).toUpperCase() + ' · ' + (U.YEAR0 + co.season) + '</small><b>Campeão!</b><p>' + sub + '</p></div><button class="ld-gold ldf-go"><b>Seguir</b></button>';
      side.appendChild(d); d.querySelector('.ldf-go').onclick = () => { sfx('tap'); d.remove(); go(); };
    };
    const finish = () => { clearTimeout(timer); const log = S.coMatchEnd(co, m); delete co.live; delete co.liveM; off(); if (U.profileCoGame) U.profileCoGame(co, m, log); save('hub');
      const go = () => { if (sim) sim.stop(); result(m, log, false, firstMove); };
      const can = sim && sim.festa && LDon && document.querySelector('.ldl-side');
      if (can && ((log && log.cup && log.champ && !log.tcOk) || (!m.cup && !co.ss.tw && S.coTitleWon(co)))) return festa(log, go);
      go(); };
    const end = () => {
      const pk = m.cup && !m.cup.grp && m.gh === m.ga && LDon && U.LD.livePens; // copa empatada: disputa de pênaltis por cima do ao vivo
      clearTimeout(timer); hidden.clear(); paint(); open = true;
      if (sim && sim.fin) { sim.fin(); sfx('whistleEnd'); if (m.home && m.gh < m.ga && !retomado) setTimeout(() => sfx('vaia'), 2300); } // três apitos (curto, curto, longo): os jogadores param onde estão
      // vitória que dá o título sem depender de ninguém: a festa começa sozinha depois do apito, sem o 'Ver o resultado'
      { const ch = S.coTitleChance(co); if (!m.cup && ch && !ch.rivals.length && ourGoals() > theirGoals() && sim && sim.festa && LDon) { setTimeout(finish, 1600); return; } }
      if (sim) { clearTimeout(frz); frz = setTimeout(() => sim.freeze(true), 1500); }
      $('lv-sheet').innerHTML = '<div class="lv-sh"><i class="lv-grab"></i><div class="lv-st-h"><small>' + S.coClock(m) + ' · Fim de jogo</small><b>' + m.gh + ' x ' + m.ga + '</b></div>' +
        '<h2>' + (ourGoals() > theirGoals() ? 'Vitória' : ourGoals() < theirGoals() ? 'Derrota' : pk ? 'Empate · vai para os pênaltis' : 'Empate') + '</h2><button class="btn" id="b-lv-end">' + (pk ? 'Disputa de pênaltis' : 'Ver o resultado') + '</button></div>';
      $('lv-sheet').classList.add('on');
      $('b-lv-end').onclick = () => { sfx('tap'); if (pk) return U.LD.livePens(m, finish); finish(); };
    };
    // Os lances novos do motor vão para o campinho. Chance: a linha da narração sai quando a bola chega (ou em 9 s).
    // Gol: o relógio espera a rede balançar (o campinho força a jogada aos 9 s de bola rolando; a tela desiste só aos 30 s) e só então o placar vira. Volta a espera do gol, ou null
    // Bola parada para o campinho: o tipo e o número de quem bate (o campinho ainda joga como chance comum até a fase 2)
    const spOf = e => { if (!e.sp) return null; const T = e.s === 'us' ? m.us : m.them, cr = e.sp === 'esc' || e.sp === 'fc', q = (T.squad || []).find(x => x.n === (cr ? e.by : e.p)), h = cr && (T.squad || []).find(x => x.n === e.p); return { sp: e.sp, num: q && q.num, hnum: h && h.num, l: e.l }; };
    const toSim = () => {
      if (!sim) return null;
      const gl = []; let pkW = null; // a falta do pênalti (`pk`) não vira outra parada no campinho: a linha dela sai com a cobrança
      const pkShow = pk => { if (pk && hidden.delete(pk)) paint(); };
      m.ev.forEach(e => {
        if (sent.has(e)) return; sent.add(e);
        if (e.pk) { hidden.add(e); pkW = e; setTimeout(() => pkShow(e), 60000); return; }
        const pk = e.sp === 'pen' ? pkW : null; if (pk) pkW = null;
        // Juiz: o campinho apita e mostra o cartão; a linha sai depois (ou em 6 s, se o lance não couber)
        if (e.t === 'falta' || e.t === 'amarelo' || e.t === 'vermelho' || e.t === 'impedimento') {
          hidden.add(e);
          const done = () => { if (hidden.delete(e)) paint(); };
          const sq = (e.s === 'us' ? m.us : m.them).squad || [], who = sq.find(q => q.n === e.p && (e.s === 'us' ? m.us : m.them).xi.concat((e.s === 'us' ? m.us : m.them).gone || []).includes(q.id)) || sq.find(q => q.n === e.p);
          sim.ref({ side: e.s === 'us' ? 0 : 1, pos: e.pos, kind: e.t, how: e.how, num: who && who.num }, done);
          setTimeout(done, 6000);
          return;
        }
        if (e.t !== 'gol' && e.t !== 'chance') return;
        const side = e.s === 'us' ? 0 : 1, out = e.t === 'gol' ? 'gol' : e.k === 'defesa' ? 'def' : e.k === 'trave' ? 'trave' : e.k === 'bloqueio' || e.k === 'travado' ? 'bloq' : 'fora'; // o campinho mostra o que o narrador conta (fase 5)
        hidden.add(e);
        if (out === 'gol') return gl.push([side, e, pk]);
        const cancel = sim.shot(side, out, () => { pkShow(pk); if (hidden.delete(e)) paint(); }, spOf(e));
        setTimeout(() => { pkShow(pk); if (hidden.delete(e)) { cancel(); paint(); } }, (co.speed === '3' ? 4000 : 12000) * (e.sp === 'pen' ? 3.6 : e.sp ? 2.4 : 1)); // a bola parada espera todo mundo se arrumar
      });
      if (!gl.length) return null;
      return go => {
        let n = gl.length;
        gl.forEach(([side, e, pk]) => {
          let done = false, tm = 0, tf = 0;
          const fin = () => { if (done) return; done = true; clearTimeout(tm); clearTimeout(tf); hidden.delete(e); if (pk) hidden.delete(pk); if (--n > 0 || wait !== go) return; wait = null; paint(); sfx('tap'); go(); };
          const cancel = sim.shot(side, 'gol', fin, spOf(e));
          // em segundos do campinho (a 3× passam três vezes mais rápido)
          const f3 = co.speed === '3' ? 1 / 3 : 0.8;
          tm = setTimeout(() => { cancel(); fin(); }, 30000 * f3 * (e.sp === 'pen' ? 2.2 : 1)); // pênalti: o ataque leva a bola até a área antes do apito // último recurso: o campinho já lança direto na área aos 9 s de bola rolando
        });
      };
    };
    const tick = () => {
      if (open || wait) return;
      if (!$('lv-score')) { clearTimeout(timer); if (sim) sim.stop(); sim = null; return; } // saiu da tela com o relógio agendado: o jogo fica guardado em co.live
      if (m.done) return end();
      if (sim) sim.go(); // o apito (se a velocidade mudou antes dele, o timer do começo foi trocado)
      if (sim && h1 && !h2) { h2 = true; sim.second(); if (window.CRAQUE_CROWD) window.CRAQUE_CROWD.ht = false; } // a torcida do jogo volta
      if (sim && sim.koWait && sim.koWait()) { timer = setTimeout(tick, 150); return; } // o relógio só anda depois do apito da saída
      const st = S.coMatchStep(co, m, m.min + 1, FREE && sim ? { free: true } : undefined);
      if (sim) { const tk = m.tk || m.min, v = m.mom && m.mom[tk - 1]; sim.minute(tk, v === undefined ? 50 : v, FREE && m.lam ? [m.lam.us, m.lam.them] : undefined); } // o campinho conta os minutos jogados (com os acréscimos)
      const gw = toSim();
      paint();
      const go = () => {
        // o juiz espera a bola sair de perigo para apitar o intervalo e o fim (escanteio, chute ou cruzamento no ar), até 9 s
        const busy = () => { if (!sim || !sim.canStop || sim.canStop()) { stopW = 0; return false; } if (!stopW) stopW = Date.now(); if (Date.now() - stopW > (co.speed === '3' ? 7000 : 16000)) { stopW = 0; return false; } timer = setTimeout(go, 150); return true; };
        if (sim && m.half && !h1) { if (busy()) return; h1 = true; sim.half(); sfx('whistleHalf'); if (window.CRAQUE_CROWD) window.CRAQUE_CROWD.ht = true; if (m.home && m.gh < m.ga) setTimeout(() => sfx('vaia'), 1500); } // intervalo: dois apitos (curto e longo)
        if (wantStop) { wantStop = false; $('b-lv-stop').classList.remove('on'); if (!m.done) return sheet(st && st.t !== 'fim' && st.t !== 'gol' ? st : { t: 'pausa' }); }
        if (st && st.t !== 'fim' && st.t !== 'gol') return sheet(st); // gol não para o jogo (Silvio, 2026-11-09): o placar e o painel contam
        if (m.done) { if (busy()) return; return end(); }
        timer = setTimeout(tick, spMs(co.speed));
      };
      if (gw) { wait = go; return gw(go); }
      go();
    };
    const toEnd = () => { clearTimeout(timer); wait = null; if (sim) sim.stop(); sim = null; hidden.clear(); while (!m.done) { S.coMatchStep(co, m); S.coAutoStop(co, m); } read = null; end(); };
    // O cartão da parada
    // Parada do vermelho: o auxiliar sugere fechar o time (a formação mais segura com 10), manter, ou tirar quem tem amarelo
    const CLOSE = { '4-4-2': '4-5-1', '4-3-3': '4-5-1', '4-2-3-1': '4-5-1', '4-5-1': '5-3-2', '3-5-2': '5-3-2', '3-4-3': '3-5-2', '5-3-2': '5-3-2' };
    const bookedOut = () => { const s = m.us, by = {}; s.squad.forEach(p => { by[p.id] = p; }); return s.xi.filter(id => id && s.bk && s.bk[id]).map(id => by[id]).filter(Boolean).sort((a, b) => a.en - b.en)[0] || null; };
    function redOpts(st) {
      const s = m.us, f = CLOSE[s.form] || '4-5-1', bk = bookedOut();
      return '<div class="lv-opts"><small class="lv-bh">O auxiliar sugere</small>' +
        (f !== s.form ? '<button class="lv-opt" data-ro="close"><i>' + f + '</i><span><b>Fechar o time</b><small>Com um a menos, o ' + f + ' fecha o buraco no meio. Segura o resultado.</small></span></button>' : '') +
        '<button class="lv-opt" data-ro="keep"><i>' + s.form + '</i><span><b>Manter como está</b><small>Arrisca mais, mas o time cansa e eles chegam mais.</small></span></button>' +
        (bk && s.subs && s.bench.length ? '<button class="lv-opt" data-ro="bk"><i class="y"><span class="co-yc"></span></i><span><b>Tirar o ' + esc(last(bk.n)) + '</b><small>Tem amarelo e ' + Math.round(bk.en) + '% de energia. Mais um cartão e você fica com 9.</small></span></button>' : '') + '</div>';
    }
    function redPick(k) {
      const s = m.us;
      if (k === 'close') { const f = CLOSE[s.form] || '4-5-1'; if (f !== s.form) { S.coMatchTactic(co, m, f); m.ev.push({ m: m.min, t: 'tatica', s: 'us', p: f + ', ' + S.CO_STY[s.style].name.toLowerCase() }); if (firstMove === null) firstMove = m.min; } }
      if (k === 'bk') {
        const p = bookedOut(); if (!p || !s.subs) return;
        const by = {}; s.squad.forEach(q => { by[q.id] = q; });
        const inn = s.bench.map(id => by[id]).filter(Boolean).sort((a, b) => (b.pos === p.pos) - (a.pos === p.pos) || b.ovr - a.ovr)[0];
        if (inn && S.coSub(co, m, p.id, inn.id)) { m.ev.push({ m: m.min, t: 'troca', s: 'us', p: last(p.n), q: last(inn.n) }); if (firstMove === null) firstMove = m.min; }
      }
      paint();
    }
    const sheet = st => {
      clearTimeout(timer); open = true; read = S.coRead(co, m);
      if (ctx) { if (sim) { clearTimeout(frz); frz = setTimeout(() => { if (open && sim) sim.freeze(true); }, st.t === 'gol' || st.t === 'vermelho' ? 2600 : 700); } return U.LD.liveStop(ctx, st); }
      if (sim) { clearTimeout(frz); frz = setTimeout(() => { if (open && sim) sim.freeze(true); }, st.t === 'gol' || st.t === 'vermelho' ? 2600 : 700); }
      const s = m.us, us = st.s === 'us';
      const T = { gol: 'Gol do ' + (us ? nm(co.club) : nm(m.vs)), intervalo: 'Intervalo', vermelho: 'Expulso', lesao: 'Lesão', pausa: 'Jogo parado' }[st.t] || 'Parada';
      const tag = { gol: us ? 'Gol' : 'Gol sofrido', intervalo: 'Intervalo', vermelho: 'Cartão vermelho', lesao: 'Lesão', pausa: 'Você parou' }[st.t] || 'Parada';
      const sh = m.sh || { us: 0, them: 0 };
      const txt = st.t === 'gol' ? esc(st.p || '') + ' marca' + (HOW(st) ? ' ' + HOW(st) : '') + '.' :
        st.t === 'intervalo' ? 'Primeiro tempo: ' + D.plural(sh.us, 'chute', 'chutes') + ' seus contra ' + sh.them + ' deles.' :
        st.t === 'vermelho' ? (st.how === '2am' ? 'Segundo amarelo.' : 'Vermelho direto.') + ' O time fica com 10 até o fim e ele perde o próximo jogo.' :
        st.t === 'lesao' ? esc(st.p || '') + ' não aguenta. Troque agora ou o time joga com ele mancando.' : 'O jogo espera você.';
      $('lv-sheet').innerHTML = '<div class="lv-sh"><i class="lv-grab"></i><div class="lv-st-h"><small class="' + (st.t === 'gol' && !us || st.t === 'vermelho' || st.t === 'lesao' ? 'bad' : '') + '">' + m.min + '\' · ' + tag + '</small><b>' + m.gh + ' x ' + m.ga + '</b></div>' +
        '<h2>' + (st.t === 'vermelho' ? '<span class="co-red"></span> ' + esc(st.p || '') + ' foi expulso' : esc(T)) + '</h2><p>' + txt + '</p>' + (st.t === 'vermelho' ? redOpts(st) : '<div class="lv-aux in">' + auxBox(read).replace('Auxiliar, no banco', 'O auxiliar leu assim') + '</div>') +
        '<div class="lv-acts"><button class="lv-big" id="b-lv-sub"' + (s.subs ? '' : ' disabled') + '>' + ICO.sub + '<b>Trocar</b><small>' + (s.subs ? D.plural(s.subs, 'troca', 'trocas') : 'sem trocas') + '</small></button>' +
        '<button class="lv-big" id="b-lv-tac">' + ICO.tac + '<b>Tática</b><small>' + s.form + ' · ' + esc(S.CO_STY[s.style].name) + '</small></button></div>' +
        '<button class="btn" id="b-lv-go">Seguir o jogo</button></div>';
      $('lv-sheet').classList.add('on');
      $('lv-sheet').querySelectorAll('[data-ro]').forEach(b => b.onclick = () => { sfx('tap'); redPick(b.dataset.ro); $('lv-sheet').querySelectorAll('[data-ro]').forEach(x => x.classList.toggle('on', x === b)); });
      $('b-lv-go').onclick = () => { sfx('tap'); $('lv-sheet').classList.remove('on'); open = false; if (sim) { clearTimeout(frz); sim.freeze(false); } if (co.speed === 'fim') return toEnd(); timer = setTimeout(tick, 400); };
      $('b-lv-sub').onclick = () => { sfx('tap'); subs(st); };
      $('b-lv-tac').onclick = () => { sfx('tap'); tactic(st); };
    };
    const back = st => { $('lv-full').remove(); paint(); sheet(st); };
    const full = html => { const d = document.createElement('div'); d.className = 'lv-full'; d.id = 'lv-full'; d.innerHTML = html; document.querySelector('.lv').appendChild(d); d.scrollTop = 0; return d; };
    // Trocas no campinho: arraste o reserva até o titular (troca) ou um titular até outro (trocam de posição).
    // Tocar num e depois no outro faz o mesmo.
    const subs = st => {
      const s = m.us, by = {}; S.coNums(s.squad); s.squad.forEach(p => { by[p.id] = p; });
      // Cartões: amarelo neste jogo (mais um e o time fica com 10), pendurado (um amarelo hoje tira do próximo jogo)
      const cardOf = p => { const y = !!(s.bk && s.bk[p.id]);
        return y ? { ic: 'y' } : pend(p) ? { ic: 'p' } : {}; };
      const cardHint = p => { if (!p) return ''; const c = cardOf(p), n = esc(last(p.n));
        return c.ic === 'y' ? n + ' tem amarelo: mais um e o time fica com 10' + (pend(p) ? '. Era o terceiro: já está fora do próximo jogo' : '') + '.' : c.ic === 'p' ? n + ' está pendurado: um amarelo e fica fora do próximo jogo.' : ''; };
      let sel = null;
      // Cada troca feita nesta parada pode ser desfeita até tocar em Pronto (nada aconteceu no jogo ainda)
      const undo = [];
      const snap = () => ({ xi: s.xi.slice(), bench: s.bench.slice(), subs: s.subs, gone: (s.gone || []).slice(), ev: m.ev.length, fm: firstMove });
      const d = full('');
      const draw = () => {
        const sp = spots(s.form), slots = S.coSlots(s.form);
        const tok = (id, i) => { const sl = sp[i]; if (!sl) return '';
          if (!id) return '<span class="lv-tk gone" style="left:' + sl[0] + '%;top:' + sl[1] + '%"><i><u class="lv-cd r"></u></i><b>expulso</b></span>';
          const p = by[id], low = p.en < 55, hurt = !!p.out, cd = cardOf(p);
          // A energia de cada titular: o anel em volta do número enche e muda de cor (verde, amarelo, vermelho) e o % ao lado da posição
          const en = Math.round(p.en), ec = enCls(p.en);
          return '<button class="lv-tk' + (low || hurt ? ' low' : '') + (sel && sel.xi === i ? ' sel' : '') + '" data-dxi="' + i + '" style="left:' + sl[0] + '%;top:' + sl[1] + '%">' +
            (hurt ? '<em>machucado</em>' : low ? '<em>cansado</em>' : '') + '<i class="en-' + ec + (i ? '' : ' gk') + '" style="--en:' + en + '%">' + (p.num || '') + (cd.ic ? '<u class="lv-cd ' + cd.ic + '"></u>' : '') + '</i><b>' + esc(last(p.n)) + '</b><small>' + slots[i] + ' ' + p.ovr + ' · <span class="en-' + ec + '">' + en + '%</span></small></button>'; };
        const bench = s.bench.map(id => by[id]).filter(Boolean);
        d.innerHTML = '<div class="lv-fh"><div><small>' + S.coClock(m) + ' · ' + m.gh + ' x ' + m.ga + ' · Parada</small><h2>Mexer no time</h2></div>' +
          '<span class="lv-pips" aria-label="' + D.plural(s.subs, 'troca restante', 'trocas restantes') + '">' + [0, 1, 2, 3, 4].map(i => '<i class="' + (i < s.subs ? 'on' : '') + '"></i>').join('') + '</span></div>' +
          '<p class="lv-hint">' + (sel ? 'Agora toque no jogador que vai trocar com ' + esc(last((sel.xi !== undefined ? by[s.xi[sel.xi]] : by[sel.b] || {}).n)) + '.' : 'Toque num titular para ver quem do banco pode entrar no lugar dele. Também dá para arrastar.') + '</p>' +
          (s.squad.some(p => (s.xi.includes(p.id) || s.bench.includes(p.id)) && cardOf(p).ic) ? '<p class="lv-lg"><u class="lv-cd y"></u>amarelo neste jogo<u class="lv-cd p"></u>pendurado</p>' : '') +
          '<div class="lv-vp" id="lv-vp"><div class="lv-vf"><i class="c"></i><i class="b t"></i><i class="b u"></i></div>' + s.xi.map(tok).join('') + '</div>' +
          '<div class="lv-bh"><small>Banco</small><small>' + (s.subs ? 'arraste para o campo' : 'sem trocas') + '</small></div>' +
          '<div class="lv-bench">' + (bench.length ? bench.map(p => '<button class="lv-bc' + (sel && sel.b === p.id ? ' sel' : '') + '" data-dbn="' + p.id + '"' + (s.subs ? '' : ' disabled') + '><small>' + (p.num ? '<u>' + p.num + '</u>' : '') + p.pos + ' · ' + p.ovr + (cardOf(p).ic === 'p' ? '<span class="lv-cd p" title="pendurado"></span>' : '') + '</small><b>' + esc(p.n) + '</b><i><em class="' + enCls(p.en) + '" style="width:' + Math.round(p.en) + '%"></em></i></button>').join('') : '<p class="co-tip">Ninguém no banco.</p>') + '</div>' +
          '<div class="lv-fb">' + (undo.length ? '<div class="lv-fb2"><button class="btn ghost" id="b-lv-undo">Desfazer</button><button class="btn" id="b-lv-back">Pronto</button></div>' : '<button class="btn" id="b-lv-back">Pronto</button>') + '</div>';
        $('b-lv-back').onclick = () => { sfx('tap'); back(st); };
        if (undo.length) $('b-lv-undo').onclick = () => { sfx('tap'); const u = undo.pop(); s.xi = u.xi; s.bench = u.bench; s.subs = u.subs; s.gone = u.gone; m.ev.length = u.ev; firstMove = u.fm; sel = null; draw(); };
        bindDrag();
      };
      // Quem do banco pode entrar no lugar do titular i: mesma posição primeiro, a sugestão (o melhor disponível, contando o
      // cansaço) em destaque; depois fora de posição. Dali também dá para trocar o titular de lugar com outro titular
      const pick = i => {
        const slot = S.coSlots(s.form)[i], cur = by[s.xi[i]]; if (!cur) return;
        const bench = s.bench.map(id => by[id]).filter(Boolean), score = p => p.ovr * (0.6 + 0.4 * p.en / 100);
        const sort = l => l.sort((a, b) => avail(b) - avail(a) || score(b) - score(a));
        const same = sort(bench.filter(p => p.pos === slot)), other = sort(bench.filter(p => p.pos !== slot && (p.pos === 'GOL') === (slot === 'GOL')));
        const best = s.subs ? same.find(avail) || other.find(avail) : null;
        const note = p => p.out ? 'lesionado' : p.sus ? susTxt(p) : [p === best ? 'sugestão' : '', m.us.bk && m.us.bk[p.id] ? 'com amarelo' : pend(p) ? 'pendurado' : '', p.age ? p.age + ' anos' : '', p.en < 55 ? 'cansado' : ''].filter(Boolean).join(' · ');
        const row = p => { const ok = s.subs && avail(p); return '<button class="co-pl' + (p === best ? ' best' : '') + (ok ? '' : ' dis') + '" data-lsub="' + p.id + '"' + (ok ? '' : ' disabled') + '>' +
          '<span class="co-pos">' + p.pos + '</span><span class="co-pn"><b>' + esc(p.n) + '</b><small>' + note(p) + '</small></span>' +
          '<span class="co-en ' + enCls(p.en) + '"><em style="width:' + Math.round(p.en) + '%"></em></span><b class="co-ov">' + p.ovr + '</b></button>'; };
        const tired = cur.out ? ' · machucado' : cur.en < 55 ? ' · cansado' : '';
        pop('<div class="co-pop-h"><b class="co-pop-ov">' + cur.ovr + '</b><span><b>' + esc(cur.n) + '</b><small>' + slot + ' · energia ' + Math.round(cur.en) + '%' + tired + '</small></span><button class="co-pop-x" data-pop-x aria-label="Fechar">' + XICO + '</button></div>' +
          (cardOf(cur).ic ? '<p class="lv-cdh"><u class="lv-cd ' + cardOf(cur).ic + '"></u>' + cardHint(cur) + '</p>' : '') +
          '<div class="co-pop-b">' + (s.subs ? '' : '<div class="co-pop-l">Sem trocas: as cinco já foram usadas</div>') +
            (same.length ? '<div class="co-pop-l">Quem pode entrar no lugar dele</div>' + same.map(row).join('') : '<div class="co-pop-l">Ninguém da posição no banco</div>') +
            (other.length ? '<div class="co-pop-l">Fora de posição</div>' + other.map(row).join('') : '') + '</div>' +
          '<button class="btn ghost co-pop-sw" id="b-lv-swap">Trocar de lugar com outro titular</button>', 'Trocar ' + cur.n, w => {
          w.querySelectorAll('[data-lsub]').forEach(b => b.onclick = () => { act({ xi: i }, { b: b.dataset.lsub }); closePop(); draw(); });
          $('b-lv-swap').onclick = () => { sfx('tap'); sel = { xi: i }; closePop(); draw(); };
        });
      };
      // Faz a troca entre a origem e o destino (titular ou reserva)
      const act = (a, b) => {
        if (!a || !b) return;
        const u = snap(); doAct(a, b);
        if (s.xi.join() !== u.xi.join()) undo.push(u);
      };
      const doAct = (a, b) => {
        if (a.xi !== undefined && b.xi !== undefined) { if (a.xi === b.xi) return; const t = s.xi[a.xi]; s.xi[a.xi] = s.xi[b.xi]; s.xi[b.xi] = t; sfx('tap'); return; }
        const x = a.xi !== undefined ? a : b, n = a.b ? a : b;
        if (x.xi === undefined || !n.b) return;
        const out = s.xi[x.xi];
        if (out && S.coSub(co, m, out, n.b)) { m.ev.push({ m: m.min, t: 'troca', s: 'us', p: last(by[out].n), q: last(by[n.b].n) }); if (firstMove === null) firstMove = m.min; sfx('tap'); }
      };
      const srcOf = el => (el.dataset.dxi !== undefined ? { xi: +el.dataset.dxi } : el.dataset.dbn ? { b: el.dataset.dbn } : null);
      const bindDrag = () => {
        d.querySelectorAll('[data-dxi],[data-dbn]').forEach(el => {
          if (el.disabled) return;
          el.onpointerdown = ev => {
            if (!el.dataset.dbn) ev.preventDefault(); // no banco o navegador precisa do gesto para rolar
            const src = srcOf(el), x0 = ev.clientX, y0 = ev.clientY; let ghost = null;
            const mv = e2 => {
              if (!ghost && el.dataset.dbn && Math.abs(e2.clientX - x0) > Math.abs(e2.clientY - y0) + 2) return; // para o lado: é rolagem
              if (!ghost && Math.hypot(e2.clientX - x0, e2.clientY - y0) > 8) { ghost = el.cloneNode(true); ghost.classList.add('lv-ghost'); ghost.removeAttribute('style'); document.body.appendChild(ghost); el.classList.add('drag'); }
              if (ghost) { const z = U.zk ? U.zk() : 1; ghost.style.left = e2.clientX / z + 'px'; ghost.style.top = e2.clientY / z + 'px';
                d.querySelectorAll('.over').forEach(o => o.classList.remove('over')); ghost.style.display = 'none'; const t = document.elementFromPoint(e2.clientX, e2.clientY); ghost.style.display = '';
                const tg = t && t.closest('[data-dxi],[data-dbn]'); if (tg && tg !== el) tg.classList.add('over'); }
            };
            // No banco, arrastar para o lado rola a lista (o navegador cancela o ponteiro); só puxar para cima pega o reserva
            const cancel = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); if (ghost) { ghost.remove(); ghost = null; } el.classList.remove('drag'); };
            const up = e2 => {
              window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
              if (ghost) { ghost.remove(); const t = document.elementFromPoint(e2.clientX, e2.clientY), tg = t && t.closest('[data-dxi],[data-dbn]'); sel = null; if (tg && tg !== el) act(src, srcOf(tg)); draw(); return; }
              // Toque: com alguém escolhido, troca; num titular, abre quem pode entrar no lugar dele; no reserva, escolhe
              if (sel) { const a = sel; sel = null; if (a.xi === src.xi && a.b === src.b) return draw(); act(a, src); return draw(); }
              if (src.xi !== undefined) { sfx('tap'); return pick(src.xi); }
              sel = src; sfx('tap'); draw();
            };
            window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
          };
        });
      };
      draw();
    };
    // Tática no meio do jogo: a formação em mini campos, o estilo e o que o caderno diz contra o plano de agora deles
    const tactic = st => {
      const s = m.us, f0 = s.form, s0 = s.style;
      const d = full('');
      const mini = f => '<span class="lv-mp">' + spots(f).map(p => '<i style="left:' + p[0] + '%;top:' + p[1] + '%"></i>').join('') + '</span>';
      const draw = () => {
        const th = m.them, tc = club(th.club || m.vs);
        d.innerHTML = '<div class="lv-fh"><div><small>' + S.coClock(m) + ' · ' + m.gh + ' x ' + m.ga + ' · Parada</small><h2>Mudar a tática</h2></div></div>' +
          '<div class="lv-opp">' + crestB(tc.id, 'co-vc') + '<div><small>Eles agora</small><b>' + th.form + ' · ' + esc(S.CO_STY[th.style].name) + '</b></div></div>' +
          '<div class="lv-bh"><small>Formação</small></div><div class="lv-fms">' + Object.keys(S.CO_FORMS).map(f => '<button data-lf="' + f + '"' + (f === s.form ? ' class="on"' : '') + '>' + mini(f) + '<b>' + f + '</b></button>').join('') + '</div>' +
          '<div class="lv-bh"><small>Estilo</small></div><div class="lv-sts">' + S.CO_STYLES.map(k => '<button data-ls="' + k + '"' + (k === s.style ? ' class="on"' : '') + '><b>' + esc(S.CO_STY[k].name) + '</b><span>' + STY_SHORT[k] + '</span></button>').join('') + '</div>' +
          cadBlock(s.form, s.style, th, true) +
          '<div class="lv-fb"><button class="btn" id="b-lv-back">Pronto</button></div>';
        d.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { sfx('tap'); S.coMatchTactic(co, m, b.dataset.lf); draw(); });
        d.querySelectorAll('[data-ls]').forEach(b => b.onclick = () => { sfx('tap'); S.coMatchTactic(co, m, null, b.dataset.ls); draw(); });
        $('b-lv-back').onclick = () => {
          sfx('tap');
          if (s.form !== f0 || s.style !== s0) { m.ev.push({ m: m.min, t: 'tatica', s: 'us', p: s.form + ', ' + S.CO_STY[s.style].name.toLowerCase() }); if (firstMove === null) firstMove = m.min; }
          back(st);
        };
      };
      draw();
    };
    if (LDon) {
      const byId = () => { const o = {}; m.us.squad.forEach(p => { o[p.id] = p; }); return o; };
      const move = () => { if (firstMove === null) firstMove = m.min; };
      ctx = { m, co, nm, last, LANE, feedLine: e => feedLine(m, e), cadLines, avail, pend, susTxt, posTxt, STY_SHORT, FORM_TIP,
        get read() { return read || (read = S.coRead(co, m)); },
        get open() { return open; }, get busy() { return open || !!wait || m.done; },
        // Pausa para um popup (jogador tocado); volta false se o jogo não pode parar agora
        pause() { if (open || wait || m.done) return false; clearTimeout(timer); open = true; read = S.coRead(co, m); if (sim) { clearTimeout(frz); sim.freeze(true); } return true; },
        resume() { open = false; if (sim) { clearTimeout(frz); sim.freeze(false); } paint(); if (co.speed === 'fim') return toEnd(); timer = setTimeout(tick, 400); },
        sub(outId, inId, key) { const by = byId(); if (!S.coSub(co, m, outId, inId, key)) return false; m.ev.push({ m: m.min, t: 'troca', s: 'us', p: last(by[outId].n), q: last(by[inId].n) }); move(); paint(); return true; },
        swap(i, j) { const x = m.us.xi; const t = x[i]; x[i] = x[j]; x[j] = t; paint(); },
        // A parada mexe na formação e no estilo direto (◀ ▶) e anota no fim, uma vez só
        tacLog(f0, y0) { const s0 = m.us; if (s0.form !== f0 || s0.style !== y0) { m.ev.push({ m: m.min, t: 'tatica', s: 'us', p: s0.form + ', ' + S.CO_STY[s0.style].name.toLowerCase() }); move(); } paint(); },
        tac(f, st) { const s0 = m.us, f0 = s0.form, y0 = s0.style; S.coMatchTactic(co, m, f, st); if (s0.form !== f0 || s0.style !== y0) { m.ev.push({ m: m.min, t: 'tatica', s: 'us', p: s0.form + ', ' + S.CO_STY[s0.style].name.toLowerCase() }); move(); } paint(); },
        shout(k) { if (!S.coShout(co, m, k)) return false; if (sim && sim.cue) sim.cue(0, k); paint(); return true; },
        talk(k) { return S.coTalk(co, m, k); },
        redOpts: st => redOpts(st), redPick: k => redPick(k), paint: () => paint(),
        stats() { const o = k => m[k] || { us: 0, them: 0 }; return { sh: o('sh'), ot: o('ot'), fo: o('fo'), of: o('of'), yc: o('yc'), rc: o('rc'), poss: S.coPoss(m) }; },
      };
    }
    $('lv-speed').querySelectorAll('button').forEach(b => b.onclick = () => {
      sfx('tap'); const k = b.dataset.sp;
      if (k === 'fim') { co.speed = 'fim'; if (!open) toEnd(); return; }
      co.speed = k; $('lv-speed').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (!open && !wait) { clearTimeout(timer); timer = setTimeout(tick, spMs(k)); }
    });
    // Durante a jogada de um gol que o motor já decidiu, o pedido fica guardado e o jogo para logo depois da rede balançar
    $('b-lv-stop').onclick = () => { if (open || m.done) return; sfx('tap'); if (wait) { wantStop = true; $('b-lv-stop').classList.add('on'); return; } sheet({ t: 'pausa' }); };
    if (useSim) {
      const nmU = nm(co.club), nmT = nm(m.vs);
      const zone = i => {
        const b = $('lp-band'), z = $('lp-zone'); if (!z) return;
        const mine = i.side === 0, tm = mine ? nmU : nmT, lado = i.ay < 30 ? ' pela esquerda' : i.ay > 70 ? ' pela direita' : ' pelo meio';
        const txt = i.mode === 'goal' ? 'Gol!' : i.mode === 'ko' || i.mode === 'wait' || i.mode === 'half' ? 'Saída de bola' : i.mode === 'tiro' ? 'Tiro de meta' :
          i.ax >= 67 ? tm + ' ataca' + lado : i.ax <= 33 ? tm + ' sai jogando' : tm + ' troca passes';
        const play = i.mode === 'play', bc = 'lp-band lpz ' + (i.sx < 100 / 3 ? 'l' : i.sx > 200 / 3 ? 'r' : 'c') + (play ? (mine ? ' me' : ' op') : ''), zc = 'lp-tag lp-zone' + (play ? (mine ? ' up' : ' down') : '');
        if (b && b.className !== bc) b.className = bc;
        if (z.textContent !== txt) z.textContent = txt;
        if (z.className !== zc) z.className = zc;
      };
      sim = LP.sim({ me: -1, t0: m.tk || m.min, half2: m.min > 45, clean: LDon, flip: !m.home, home: m.home ? 0 : 1, kits: KT, speed: () => (co.speed === '3' ? 3 : 1.25), spm: () => spMs(co.speed === '3' ? '3' : '1') / 1000, onFrame: zone,
        free: FREE, onShot: sh => { if (m.done && !stopW) return; const e = S.coMatchShot(co, m, sh.side ? 'them' : 'us', sh.out, Object.assign({ late: !!stopW }, sh)); if (e) { sent.add(e); paint(); } if (!sh.side && sh.near) sfx(m.home ? 'quase' : 'quaseAway'); else if (!sh.side && sh.out !== 'gol') sfx(m.home ? 'uhh' : 'uhhAway'); /* todo chute seu que não entra: defesa, fora, travado */ },
        onPick: (side, inf) => { if (ctx && side === 0 && inf && inf.id && !open && !m.done && !wait) { sfx('tap'); sheet({ t: 'pausa', pick: inf.id }); } }, // tocou no seu jogador: para e abre a escalação com ele escolhido (quem entra ao lado dele)
        seed: (co.season || 0) * 101 + (co.ss ? co.ss.i : 0) * 13 + m.min + 7, forms: [simForm(m.us), simForm(m.them)], styles: [S.coSimSty(m.us), S.coSimSty(m.them)] });
      lineKey = [m.us, m.them].map(s => s.form + ':' + s.xi.filter(Boolean).length + ':' + s.style);
      sim.attach($('lp-cv'));
    }
    paint();
    timer = setTimeout(() => { if (sim) sim.go(); timer = setTimeout(tick, 900); }, 600);
    // Vigia: o relógio parado sem nenhum popup aberto é jogo travado (o campinho não deu a saída ou não fez o gol).
    // Destrava sozinho, avisa o servidor com o estado e o jogo segue
    // Sair do app no meio do jogo: pausa e guarda o minuto; ao voltar, segue de onde parou (o vigia não conta o tempo fora)
    let away = false, snapMin = -1;
    const snap = () => { if (m.done) return; co.liveM = m; snapMin = m.min; save('live'); };
    const onVis = () => {
      if (m.done || !document.body.contains($('lv-score') || document.body)) return off();
      if (document.hidden) {
        snap();
        if (!open && !away) { away = true; clearTimeout(timer); if (sim) { clearTimeout(frz); sim.freeze(true); } }
      } else if (away) {
        away = false; wdT = Date.now();
        if (sim) { clearTimeout(frz); sim.freeze(false); }
        if (!wait) timer = setTimeout(tick, 600);
      }
    };
    const off = () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', snap); };
    document.addEventListener('visibilitychange', onVis); window.addEventListener('pagehide', snap);
    let wdMin = -1, wdT = Date.now(), wdLast = Date.now();
    const wd = setInterval(() => {
      const sc = $('lv-score');
      if (!sc || m.done || !document.body.contains(sc)) { off(); return clearInterval(wd); }
      // o iPhone congela a página sem avisar (central de controle, tela apagando): o vigia também parou, então não é travamento
      const gap = Date.now() - wdLast; wdLast = Date.now();
      if (gap > 6000 || stopW) { wdT = Date.now(); return; }
      if (m.min - snapMin >= 5) snap(); // de 5 em 5 minutos o jogo fica guardado
      if (away) { wdT = Date.now(); return; }
      const busyUi = document.getElementById('ld-pop') || ($('lv-sheet') && $('lv-sheet').classList.contains('on')) || document.hidden;
      if (m.min !== wdMin || busyUi) { wdMin = m.min; wdT = Date.now(); return; }
      if (Date.now() - wdT < (wait ? 40000 : 15000)) return;
      if (window.CLIMBIX_REPORT) window.CLIMBIX_REPORT('treinador ao vivo travou', JSON.stringify({ min: m.min, open, wait: !!wait, speed: co.speed, ko: !!(sim && sim.koWait && sim.koWait()), ld: !!ctx }));
      clearTimeout(timer); open = false; hidden.clear();
      if (sim) { clearTimeout(frz); sim.freeze(false); if (sim.unhold) sim.unhold(); }
      if (wait) { const g = wait; wait = null; g(); } else timer = setTimeout(tick, 200);
      wdT = Date.now(); paint();
    }, 2000);
  }
  // Cartões de um lado no fim (amarelo e vermelho) e quem do seu time fica fora do próximo jogo por cartão
  const cardsTxt = (m, sd) => '<span class="co-yc"></span>' + ((m.yc || {})[sd] || 0) + ((m.rc || {})[sd] ? ' <span class="co-red"></span>' + m.rc[sd] : '');
  function susBox(m, log) {
    const red = m.ev.filter(e => e.t === 'vermelho' && e.s === 'us').map(e => e.p), yc = log.ycOut || [];
    const pd = co.squad.filter(p => !p.sus && pend(p) && (m.ycAdd || []).includes(p.id));
    if (!red.length && !yc.length && !pd.length) return '';
    return '<div class="lv-susb"><small>Cartões que pesam no próximo jogo</small>' +
      red.map(n => '<p><span class="co-red"></span><b>' + esc(last(n)) + '</b> · vermelho<em class="out">Fora 1 jogo</em></p>').join('') +
      yc.map(n => '<p><span class="co-yc"></span><b>' + esc(last(n)) + '</b> · 3º amarelo<em class="out">Fora 1 jogo</em></p>').join('') +
      pd.map(p => '<p><span class="co-yc"></span><b>' + esc(last(p.n)) + '</b> · 2º amarelo no ano<em>Pendurado</em></p>').join('') + '</div>';
  }
  // ---------- Taça (Silvio 2026-11-10): aviso "o título pode sair hoje" antes da rodada e festa quando o título é seu ----------
  const tacaImg = h => window.CRAQUE_TROPHY ? window.CRAQUE_TROPHY('league', h, co.ss.name) : '';
  function tacaPop(html, cls, go) {
    const d = document.createElement('div'); d.className = 'tc-ov ' + cls; d.innerHTML = html; document.body.appendChild(d);
    const b = d.querySelector('.tc-go'); b.onclick = () => { sfx('tap'); d.remove(); go(); };
  }
  function tacaChance(go) {
    const ch = S.coTitleChance(co); if (!ch || co.ss.tcI === co.ss.i) return go();
    co.ss.tcI = co.ss.i; save('hub');
    const rv = ch.rivals.map(nm).join(', ');
    tacaPop('<div class="tc-box">' + tacaImg(84) + '<div><b>O título pode sair hoje!</b><small>' + (ch.rivals.length ? 'Vença e torça contra ' + esc(rv) + '.' : 'Vença e a taça é sua.') + '</small></div></div><button class="btn tc-go">Seguir</button>', 'tc-av', go);
  }
  function tacaFesta(go) {
    if (co.ss.tw || !S.coTitleWon(co)) return go();
    co.ss.tw = 1; save('hub');
    const t = S.coTable(co), me = t[0], left = co.ss.rounds.length - co.ss.i;
    let cf = ''; for (let i = 0; i < 46; i++) cf += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + ['#e8b84a', '#fff', '#ffe08a', '#c9a24a'][i % 4] + ';animation-duration:' + (2.5 + Math.random() * 3).toFixed(2) + 's;animation-delay:' + (1 + Math.random() * 3).toFixed(2) + 's"></i>';
    tacaPop('<div class="tc-ray"></div><div class="tc-cf">' + cf + '</div><div class="tc-mid"><div class="tc-tag">TÍTULO · ' + esc(co.ss.name).toUpperCase() + ' · ' + (U.YEAR0 + co.season) + '</div><div class="tc-cup">' + tacaImg(140) + '</div><div class="tc-big">Campeão!</div><div class="tc-sub">' + esc(nm(co.club)) + ' · ' + me.p + ' pontos' + (left > 0 ? ' · ' + left + (left === 1 ? ' rodada' : ' rodadas') + ' de folga' : '') + '</div></div><button class="btn tc-go">Seguir</button>', 'tc-fe', go);
    sfx('fanfare');
  }
  // Festa da copa (fase 1 das copas): a mesma festa da liga, com a taça da copa e a final que deu o título
  function copaFesta(log, go) {
    if (!log || !log.cup || !log.champ || log.tcOk) return go();
    log.tcOk = 1;
    let cf = ''; for (let i = 0; i < 46; i++) cf += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + ['#e8b84a', '#fff', '#ffe08a', '#c9a24a'][i % 4] + ';animation-duration:' + (2.5 + Math.random() * 3).toFixed(2) + 's;animation-delay:' + (1 + Math.random() * 3).toFixed(2) + 's"></i>';
    const img = window.CRAQUE_TROPHY ? window.CRAQUE_TROPHY(log.tr || 'cup', 140, log.name) : '';
    tacaPop('<div class="tc-ray"></div><div class="tc-cf">' + cf + '</div><div class="tc-mid"><div class="tc-tag">TÍTULO · ' + esc(log.name).toUpperCase() + ' · ' + (U.YEAR0 + co.season) + '</div><div class="tc-cup">' + img + '</div><div class="tc-big">Campeão!</div><div class="tc-sub">' + esc(nm(co.club)) + ' · final contra ' + esc(nm(log.vs)) + ' · ' + log.gf + ' x ' + log.ga + (log.pens ? ' (' + log.pens[0] + ' x ' + log.pens[1] + ' nos pênaltis)' : '') + '</div></div><button class="btn tc-go">Seguir</button>', 'tc-fe', go);
    sfx('fanfare');
  }
  function result(m, log, aux, move) {
    if (log && log.cup && log.champ && !log.tcOk) return copaFesta(log, () => result(m, log, aux, move));
    if (!result.tc) { result.tc = 1; return tacaFesta(() => { try { result(m, log, aux, move); } finally { result.tc = 0; } }); } result.tc = 0;
    if (U.LD && U.LD.on()) return U.LD.result(m, log, aux, move);
    const cl = club(co.club), vs = club(m.vs), H = m.home ? cl : vs, A = m.home ? vs : cl;
    const tl = m.ev.filter(e => ['gol', 'vermelho', 'amarelo', 'tatica', 'troca'].includes(e.t) || (e.t === 'lesao' && e.s === 'us')).map(e => {
      const mine = e.s === 'us', ic = e.t === 'gol' ? ICO.ball(mine ? '#FBF8EF' : '#9DB5A6') : e.t === 'vermelho' ? '<span class="co-red"></span>' : e.t === 'amarelo' ? '<span class="co-yc"></span>' : e.t === 'lesao' ? U.emo('🩹', 'xs') : ICO.sub;
      const tx = e.t === 'tatica' ? (mine ? 'Você muda para ' + esc(e.p) : 'Mudaram para ' + esc(e.p)) : e.t === 'troca' ? 'Sai ' + esc(e.p) + ', entra ' + esc(e.q) : esc(e.p || '');
      return '<li class="' + e.s + ' ' + e.t + (mine && (e.t === 'troca' || e.t === 'tatica') ? ' you' : '') + '"><i>' + e.m + '\'</i>' + ic + '<span>' + tx + (e.t === 'troca' || (e.t === 'tatica' && mine) ? '' : ' · <small>' + esc(mine ? cl.short || cl.name : vs.short || vs.name) + '</small>') + '</span></li>'; }).join('');
    const word = log.res === 'v' ? 'Vitória' : log.res === 'e' ? 'Empate' : 'Derrota', B = co.board;
    const ultTxt = co.sacked ? '' : B.ult && B.ult.n === 0 ? '<div class="co-ult"><b>Ultimato</b><span>O presidente chamou você: "Vença ' + B.ult.need + ' dos próximos ' + B.ult.of + ' ou está fora."</span></div>' :
      B.ult ? '<div class="co-ult"><b>Ultimato</b><span>' + B.ult.got + ' de ' + B.ult.need + ' vitórias, ' + (B.ult.of - B.ult.n) + ' jogos para isso.</span></div>' :
      B.passed && log.res === 'v' && B.conf === 45 ? '<div class="co-ok"><b>Ultimato cumprido</b><span>"Você ganhou tempo, professor."</span></div>' : '';
    const sh = m.sh || { us: 0, them: 0 }, ot = m.ot || { us: 0, them: 0 }, pu = S.coPoss(m), ph = Math.round((m.home ? pu : 1 - pu) * 100);
    const hv = (a, b) => (m.home ? [a, b] : [b, a]);
    const cmp = (lbl, a, b, sa, sb) => '<div class="lv-cmp"><b>' + (sa || a) + '</b><div><small>' + lbl + '</small><p><i style="flex:' + (a || 0.01) + '"></i><i style="flex:' + (b || 0.01) + '"></i></p></div><b>' + (sb || b) + '</b></div>';
    const [s1, s2] = hv(sh.us, sh.them), [o1, o2] = hv(ot.us, ot.them);
    // Uma tela só, sem rolar (390x844): placar e faixa compactos; o resto em abas. Resumo abre: gols, expulsões, suas
    // mudanças, os números numa linha e os cartões que pesam; Números, Lances (tudo) e Caderno (ponto quando há anotação nova)
    const key = m.ev.filter(e => e.t === 'gol' || e.t === 'vermelho' || ((e.t === 'tatica' || e.t === 'troca') && e.s === 'us') || (e.t === 'lesao' && e.s === 'us'));
    const nTl = (tl.match(/<li/g) || []).length;
    const keyTl = key.map(e => { const mine = e.s === 'us', ic = e.t === 'gol' ? ICO.ball(mine ? '#FBF8EF' : '#9DB5A6') : e.t === 'vermelho' ? '<span class="co-red"></span>' : e.t === 'lesao' ? U.emo('🩹', 'xs') : ICO.sub;
      const tx = e.t === 'gol' ? '<b>Gol</b> · ' + esc(e.p || '') : e.t === 'vermelho' ? esc(e.p || '') + ' <small>· expulso</small>' : e.t === 'tatica' ? 'Você muda para ' + esc(e.p) : e.t === 'troca' ? 'Sai ' + esc(e.p) + ', entra ' + esc(e.q) : esc(e.p || '') + ' <small>· lesão</small>';
      return '<li class="' + e.s + ' ' + e.t + (e.t === 'tatica' || e.t === 'troca' ? ' you' : '') + '"><i>' + e.m + '\'</i>' + ic + '<span>' + tx + (e.t === 'gol' || e.t === 'vermelho' ? ' <small>· ' + esc(mine ? cl.short || cl.name : vs.short || vs.name) + '</small>' : '') + '</span></li>'; }).join('');
    const line = m.sh ? '<div class="lv-line"><span>Chutes <b>' + s1 + ' · ' + s2 + '</b></span><span>Posse <b>' + ph + '%</b></span>' + (m.fo ? '<span>Faltas <b>' + hv(m.fo.us, m.fo.them).join(' · ') + '</b></span>' : '<span>No gol <b>' + o1 + ' · ' + o2 + '</b></span>') + '</div>' : '';
    const panes = {
      res: '<small class="lv-ph">O que decidiu</small>' + (keyTl ? '<ul class="lv-tl">' + keyTl + '</ul>' : '<p class="lead co-nil">Jogo truncado, sem gols.</p>') + line + susBox(m, log),
      num: m.sh ? '<div class="lv-cmps">' + cmp('Chutes', s1, s2) + cmp('No gol', o1, o2) + cmp('Posse', ph, 100 - ph, ph + '%', (100 - ph) + '%') +
        (m.fo ? cmp('Faltas', ...hv(m.fo.us, m.fo.them)) + cmp('Impedimentos', ...hv((m.of || {}).us || 0, (m.of || {}).them || 0)) +
          cmp('Cartões', ...hv(((m.yc || {}).us || 0) + ((m.rc || {}).us || 0) * 2, ((m.yc || {}).them || 0) + ((m.rc || {}).them || 0) * 2), ...hv(cardsTxt(m, 'us'), cardsTxt(m, 'them'))) : '') + '</div>' : '<p class="lead co-nil">Sem números deste jogo.</p>',
      lan: tl ? '<small class="lv-ph">O jogo inteiro <em>em dourado: você</em></small><ul class="lv-tl all">' + tl + '</ul>' : '<p class="lead co-nil">Jogo truncado, sem gols.</p>',
      cad: cadAfter(log.cad)
    };
    const newCad = log.cad && log.cad.notes && log.cad.notes.length;
    const tabs = [['res', 'Resumo'], ['num', 'Números'], ['lan', 'Lances' + (nTl ? ' <i>' + nTl + '</i>' : '')]].concat(log.cad ? [['cad', 'Caderno' + (newCad ? ' <b class="lv-dot" aria-label="anotação nova"></b>' : '')]] : []);
    render('<div class="co-res lv-res lv-one"><div class="lv-board"><div class="lv-eb">Rodada ' + log.r + ' · ' + word + (aux ? ' · com o auxiliar' : '') + '</div>' +
      '<div class="lv-sc"><span>' + crestB(H.id) + '<b>' + esc(H.short || H.name) + '</b></span><div class="lv-mid"><em>' + m.gh + ' <i>x</i> ' + m.ga + '</em></div><span>' + crestB(A.id) + '<b>' + esc(A.short || A.name) + '</b></span></div>' +
      (m.mom && m.mom.length ? momSvg(m, move !== null && move !== undefined ? move : null) + '<div class="lv-momf"><small>Quem mandou no jogo</small>' + (move !== null && move !== undefined ? '<small class="lv-mkt">Sua mudança aos ' + move + '\'</small>' : '') + '</div>' : '') + '</div>' +
      '<div class="cad-tabs lv-tabs" role="tablist" style="grid-template-columns:repeat(' + tabs.length + ',minmax(0,1fr))">' + tabs.map(([k, t]) => '<button role="tab" data-rt="' + k + '"' + (k === 'res' ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + '>' + t + '</button>').join('') + '</div>' +
      '<div class="lv-pane">' + Object.keys(panes).map(k => '<div class="lv-pn' + (k === 'res' ? ' on' : '') + '" data-rp="' + k + '">' + panes[k] + '</div>').join('') + '</div>' +
      '<div class="lv-foot">' + ultTxt + (co.sacked ? '' : moodLine()) +
      '<button class="btn" id="b-co-next">' + (co.sacked ? 'Falar com o presidente' : 'Continuar') + '</button></div></div>');
    document.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { sfx('tap'); const k = b.dataset.rt;
      document.querySelectorAll('[data-rt]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      document.querySelectorAll('[data-rp]').forEach(x => x.classList.toggle('on', x.dataset.rp === k)); if (k === 'cad') { const d = b.querySelector('.lv-dot'); if (d) d.remove(); } });
    $('b-co-next').onclick = () => { sfx('tap'); if (co.sacked) return sacked(); if (co.ss.done) return finishSeason(); hub(); };
  }
  // Por que caiu: o ultimato ficou impossível (B.sk, desde 2026-11-11) ou save antigo sem o motivo
  U.coSackWhy = co => { const k = co.board && co.board.sk; return k ? '“Precisava vencer ' + k.need + ' dos ' + k.of + ' jogos e não dá mais. Obrigado pelo trabalho, professor.”' : '“Não deu, professor. Obrigado pelo trabalho.”'; };
  function sacked() {
    const cl = club(co.club);
    render('<div class="co-msg">' + crest(cl.id, 'co-big') + '<div class="eyebrow">' + esc(cl.name) + '</div><h2>Você foi demitido.</h2>' +
      '<p class="lead">' + U.coSackWhy(co) + ' A temporada segue sem você; no fim dela, o telefone toca de novo.</p>' +
      '<button class="btn" id="b-co-end">Ver como terminou a liga</button></div>', { center: true });
    $('b-co-end').onclick = () => { sfx('tap'); finishSeason(); };
  }

  // ---------- fim da temporada: posição, meta, fama, experiência ----------
  // Moedas da temporada (S.coSeasonEnd devolve out.coins) entram na carteira da conta aqui, uma vez por fim de temporada;
  // a primeira temporada terminada na conta ganha um bônus de boas-vindas (uma vez só, em qualquer carreira)
  const COIN_FIRST = 15; // era 30 até 2026-11-12: a conta nova já ganha 36 de boas-vindas (api/account.php)
  function payCoins(out) {
    if (!U.COINS || out.coinsPaid) return;
    const list = (out.coins || []).slice();
    if (!U.COINS.has('co-1a')) list.push({ k: 'first', t: 'Primeira temporada', n: COIN_FIRST, once: 'co-1a' });
    out.coins = list.map(x => ({ k: x.k, t: x.t, n: x.n }));
    out.coinsTot = U.COINS.add(list);
    out.coinsPaid = true;
  }
  // Festa do acesso (2026-11-11): subiu de divisão, o fim da temporada abre com o momento "Acesso!" e o que o clube ganha
  // (prêmio, moedas, fama, receita maior na liga de cima). Mesmo desenho da festa da taça; aparece uma vez, antes do Fim da temporada.
  function acessoFesta(out, go) {
    if (!out.up || out.sacked) return go();
    const cl = club(out.club), fm = out.fame ? out.fame[1] - out.fame[0] : 0, cn = (out.coins || []).find(x => x.k === 'acesso');
    const rw = [out.upPrem ? ['PRÊMIO', brl(out.upPrem)] : null, cn ? ['MOEDAS', '+' + cn.n] : null, fm > 0 ? ['FAMA', '+' + fm] : null, out.upRec >= 3 ? ['RECEITA', '+' + out.upRec + '%'] : null].filter(Boolean);
    let cf = ''; for (let i = 0; i < 46; i++) cf += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + ['#e8b84a', '#fff', '#7ED39A', '#c9a24a'][i % 4] + ';animation-duration:' + (2.5 + Math.random() * 3).toFixed(2) + 's;animation-delay:' + (1 + Math.random() * 3).toFixed(2) + 's"></i>';
    tacaPop('<div class="tc-ray"></div><div class="tc-cf">' + cf + '</div><div class="tc-mid tc-ac"><div class="tc-tag">ACESSO · ' + (U.YEAR0 + out.season) + '</div><div class="tc-cup">' + crest(cl.id, 'tc-cr') + '</div><div class="tc-big">Subiu!</div>' +
      '<div class="tc-sub">' + (out.upTo ? 'Próxima temporada: ' + esc(out.upTo) : esc(cl.short || cl.name) + ' sobe de divisão') + '</div>' +
      (rw.length ? '<div class="tc-rw">' + rw.map(x => '<span><small>' + x[0] + '</small><b>' + x[1] + '</b></span>').join('') + '</div>' : '') + '</div><button class="btn tc-go">Seguir</button>', 'tc-fe', go);
    sfx('levelup'); sfx('cheer');
  }
  function finishSeason() { const out = S.coSeasonEnd(co); payCoins(out); if (U.profileCoSeason) U.profileCoSeason(co, out); stat('season', Math.min(40, co.hist.length)); save('end'); acessoFesta(out, () => seasonEnd(out)); }
  function seasonEnd(out) {
    G.c = null; bar();
    if (U.LD && U.LD.on()) return U.LD.temporada(out);
    const cl = club(out.club), df = out.fame[1] - out.fame[0];
    const head = out.sacked ? 'Demitido no meio do caminho' : out.won ? 'Campeão!' : out.up ? 'Subiu de divisão!' : out.down ? 'Rebaixado' : out.met ? 'Meta cumprida' : 'Meta não cumprida';
    const skills = () => '<div class="co-sk">' + Object.keys(S.CO_SKILLS).map(k => '<div class="co-skr"><span><b>' + S.CO_SKILLS[k] + '</b><small>' + SK_TXT[k] + '</small></span>' +
      '<i>' + co.xp[k] + '</i><button class="btn sm" data-sk="' + k + '"' + (co.xp.pts > 0 && co.xp[k] < S.CO.skillMax ? '' : ' disabled') + ' aria-label="Mais um ponto em ' + S.CO_SKILLS[k] + '">+1</button></div>').join('') + '</div>';
    const draw = () => {
      render('<div class="eyebrow">' + esc(out.league) + ' · ' + (YEAR0 + out.season) + '</div><h2>' + head + '</h2>' +
        '<div class="co-end"><div class="co-big-n">' + crest(cl.id, 'co-vc') + '<b>' + ordTxt(out.pos) + '</b><small>de ' + out.n + '</small></div>' +
          '<div class="co-meta"><small>Meta</small><b>' + S.CO_GOAL_TXT[out.goal.k] + '</b><span class="' + (out.met ? 'up' : 'down') + '">' + (out.met ? 'cumprida' : out.sacked ? 'demitido' : 'não cumprida') + '</span></div></div>' +
        '<div class="co-box co-fame"><div class="eyebrow">Fama</div><div class="co-fbar"><em style="width:' + out.fame[1] + '%"></em></div><p><b>' + out.fame[1] + '</b> <span class="' + (df >= 0 ? 'up' : 'down') + '">' + (df >= 0 ? '+' : '') + df + '</span> · ' + FAME_TXT(out.fame[1]) + '</p></div>' +
        finEnd(out.fin) +
        '<div class="co-box"><div class="eyebrow">Experiência · ' + (out.xp ? '+' + out.xp + ' ' + (out.xp > 1 ? 'pontos' : 'ponto') : 'nenhum ponto') + (co.xp.pts ? ' · ' + co.xp.pts + ' para usar' : '') + '</div>' + skills() + '</div>' +
        (out.kids && out.kids.length ? '<p class="co-note">' + U.emo('🌱', 'xs') + ' Subiram da base: ' + out.kids.map(esc).join(', ') + '.</p>' : '') +
        (out.left && out.left.length ? '<p class="co-note">Saíram: ' + out.left.slice(0, 5).map(x => esc(x.n) + ' (' + x.why + ')').join(', ') + '.</p>' : '') +
        '<div class="inv-bar fade co-bar">' + (out.offers ? '<button class="btn" id="b-co-of">Ver propostas</button>' :
          '<button class="btn ghost" id="b-co-mk">Ouvir outros clubes</button><button class="btn" id="b-co-ns">Temporada ' + (YEAR0 + co.season) + '</button>') + '</div>');
      document.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { if (S.coSkill(co, b.dataset.sk)) { sfx('tap'); save(); draw(); } });
      if ($('b-co-of')) $('b-co-of').onclick = () => { sfx('tap'); co.step = 'offers'; offers(out.offers); };
      if ($('b-co-ns')) $('b-co-ns').onclick = () => { sfx('tap'); S.coStart(co); save('hub'); hub(); };
      if ($('b-co-mk')) $('b-co-mk').onclick = () => { sfx('tap'); const l = S.coOffers(co, 3); save(); offers(l, true); };
    };
    draw();
  }
  const SK_TXT = { leitura: 'o time rende um pouco mais em todo jogo', motiv: 'derrota e banco abalam menos o elenco', negoc: 'os clubes pedem menos pelos jogadores' };
  const FAME_TXT = f => (f >= 80 ? 'técnico de seleção' : f >= 60 ? 'disputado pelos grandes' : f >= 40 ? 'nome conhecido' : f >= 20 ? 'começando a aparecer' : 'ninguém conhece ainda');

  // Para as telas deitadas (ui/coachland.js)
  U._co = { get co() { return co; }, get pre() { return pre; }, save, sacked: () => sacked(), moodLine: () => moodLine(), susBox, exit: () => { save(); co = null; U.ldOff(); U.home(); },
    // Encerrar carreira (2026-11-11, Silvio): a vaga fica livre; os números do técnico já entraram no Perfil no fim da temporada
    retire: () => { const slot = co.slot; stat('end'); co = null; savedAt = Date.now(); store(U.slotKey(SAVE_CO, slot), { co: null, at: savedAt }); U.ldOff(); U.home(); }, hub, team, caderno, tabela, fin, finishSeason, play: k => play(k), live, result,
    LANE, avail, pend, susTxt, posTxt, FORM_TIP, STY_SHORT, cadLines, cadName, CAD_W, CAD_S, cadQuote, feedLine: (m, e) => feedLine(m, e), offers: (l, st) => offers(l, st), offersBack: (l, st) => offersBack(l, st), welcome: () => welcome(), SK_TXT, ordTxt, mi, sgn, finPres: f => finPres(f), FAME_TXT, keepBench: () => keepBench(), brl, nm, last };
  Object.assign(U, { coCreate: create, coHub: () => co && hub(), coCaderno: (c, pv) => (pv && pv.them ? cadBlock(c.form, c.style, pv.them) + hintCard() : '') });
})();
