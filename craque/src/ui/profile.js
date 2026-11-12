// Interface — Perfil: nível de jogador (XP de todas as carreiras, em todos os modos), metas da semana e os números de
// todas as carreiras, com o Domínio mundial. Fica no inventário (U.ITEMS, que vai junto para a nuvem). Só visual e
// pacotinhos: nunca muda nota nem sorte de carreira nenhuma.
(function () {
  const U = window.CRAQUE_UI;
  const { D, $, esc, render, sfx, load } = U;

  const prof = () => { const o = U.ITEMS.get(); o.prof = o.prof || { xp: 0, wk: null }; return o.prof; };

  // ---------- nível ----------
  // Cada nível pede um pouco mais que o anterior (250, 300, 350...); as faixas têm nome de futebol
  const need = lv => 200 + 50 * lv;
  function level(xp) {
    let lv = 1, left = Math.max(0, xp || 0);
    while (left >= need(lv)) { left -= need(lv); lv++; }
    return { lv, cur: left, next: need(lv) };
  }
  const RANKS = [[1, 'Peneira'], [5, 'Base'], [10, 'Profissional'], [20, 'Titular'], [30, 'Craque'], [40, 'Ídolo'], [50, 'Lenda']];
  const rankOf = lv => RANKS.filter(r => lv >= r[0]).pop()[1];
  // Treinador (1.0, 2026-11-09): os mesmos degraus com nome de técnico
  const RANKS_CO = [[1, 'Estagiário'], [5, 'Auxiliar'], [10, 'Interino'], [20, 'Treinador'], [30, 'Professor'], [40, 'Comandante'], [50, 'Lenda']];
  const rankCo = lv => RANKS_CO.filter(r => lv >= r[0]).pop()[1];

  // XP do fim de uma carreira: base, nota e títulos. Relâmpago, menos; o Jogo a Jogo ganha por temporada (jajXp).
  const GXP = { S: 150, A: 100, B: 60, C: 30, D: 10 };
  const RXP = { S: 50, A: 35, B: 20, C: 10, D: 0 };
  const careerXp = (c, f) => 100 + (GXP[f.grade] || 0) + Math.min(100, (f.titles || 0) * 4); // o Jogo a Jogo já ganha XP a cada temporada
  const relXp = f => 30 + (RXP[f.grade] || 0);

  // ---------- metas da semana ----------
  // x: { kind: 'car', c, f } (carreira terminada) ou { kind: 'rel', f } (Relâmpago). add: quanto a meta anda (n = alvo)
  const GR = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const car = x => x.kind === 'car';
  const jaj = x => x.kind === 'jaj' && x.my; // um jogo jogado no Rumo ao Topo (o save é longo: as metas andam jogo a jogo)
  const tro = (x, type) => Object.values(x.c.trophies || {}).reduce((a, t) => a + (t.type === type ? t.n : 0), 0);
  const clubs = x => new Set((x.c.spells || []).filter(s => s.seasons).map(s => s.club)).size;
  const GOALS = [
    // fáceis
    { id: 'car2', tier: 1, n: 2, t: 'Termine 2 carreiras', add: x => car(x) },
    { id: 'rel2', tier: 1, fam: 'rel', n: 2, t: 'Jogue 2 Relâmpagos', add: x => x.kind === 'rel' },
    { id: 'jaj15', tier: 1, fam: 'jaj', n: 15, t: 'Jogue 15 jogos no Rumo ao Topo', add: x => jaj(x) && x.my.on },
    { id: 'tit10', tier: 1, fam: 'tit', t: 'Ganhe 10 títulos numa carreira', add: x => car(x) && x.f.titles >= 10 },
    { id: 'clubs4', tier: 1, t: 'Jogue em 4 clubes numa carreira', add: x => car(x) && clubs(x) >= 4 },
    { id: 'ucl', tier: 1, fam: 'cont', t: 'Ganhe a Liga dos Campeões', add: x => car(x) && tro(x, 'ucl') > 0 },
    // médias
    { id: 'gradeA', tier: 2, fam: 'nota', t: 'Termine uma carreira com nota A ou S', add: x => car(x) && GR[x.f.grade] >= 4 },
    { id: 'relA', tier: 2, fam: 'rel', t: 'Tire nota A ou S na Relâmpago', add: x => x.kind === 'rel' && GR[x.f.grade] >= 4 },
    { id: 'tit20', tier: 2, fam: 'tit', t: 'Ganhe 20 títulos numa carreira', add: x => car(x) && x.f.titles >= 20 },
    { id: 'wc', tier: 2, fam: 'wc', t: 'Seja campeão da Copa do Mundo', add: x => car(x) && tro(x, 'wc') > 0 },
    { id: 'jajcl', tier: 2, fam: 'jaj', t: 'Vença um clássico no Rumo ao Topo', add: x => jaj(x) && x.my.won && x.classico },
    { id: 'jajl5', tier: 2, fam: 'jaj', n: 5, t: 'Acerte 5 lances seus no Rumo ao Topo', add: x => jaj(x) && !!(x.out.lance && x.out.lance.ok) },
    { id: 'gk', tier: 2, t: 'Termine uma carreira de goleiro com nota B ou melhor', add: x => car(x) && x.c.pos === 'GOL' && GR[x.f.grade] >= 3 },
    // difíceis
    { id: 'gradeS', tier: 3, fam: 'nota', t: 'Termine uma carreira com nota S', add: x => car(x) && x.f.grade === 'S' },
    { id: 'ballon2', tier: 3, t: 'Ganhe 2 Bolas de Ouro numa carreira', add: x => car(x) && tro(x, 'ballon') >= 2 },
    { id: 'lenda', tier: 3, fam: 'wc', t: 'Ganhe a Copa do Mundo e a Bola de Ouro na mesma carreira', add: x => car(x) && tro(x, 'wc') > 0 && tro(x, 'ballon') > 0 },
    { id: 'cwc2', tier: 3, t: 'Ganhe 2 Mundiais de Clubes numa carreira', add: x => car(x) && tro(x, 'cwc') >= 2 },
    { id: 'jajmeta', tier: 3, fam: 'jaj', t: 'Bata a meta do ano no Rumo ao Topo', add: x => x.kind === 'jajs' && x.meta },
    { id: 'lib', tier: 3, fam: 'cont', t: 'Ganhe a Libertadores', add: x => car(x) && tro(x, 'lib') > 0 },
  ];
  // Metas do Treinador (2026-11-09, quadro 53). x: { kind: 'cog', co, m, log, up, aux } (um jogo do Treinador; `aux` =
  // o auxiliar terminou um jogo largado, que não anda meta nenhuma) ou { kind: 'cos', co, out } (fim da temporada).
  // add pode devolver número (gols); cut zera a contagem das metas "seguidas"
  const cog = x => x.kind === 'cog' && !x.aux, won = x => cog(x) && x.log.res === 'v';
  const cos = x => x.kind === 'cos' && !x.out.sacked;
  // Esteve atrás no placar em algum momento do jogo
  const behind = m => { let u = 0, t = 0; return (m.ev || []).some(e => { if (e.t !== 'gol') return false; if (e.s === 'us') u++; else t++; return t > u; }); };
  // Dá para subir de divisão? (na elite a meta não é sorteada)
  function canGoUp() {
    const S = U.S, cs = [...Array(U.CO_SLOTS).keys()].map(i => (U.coSaved ? U.coSaved(i) : null)).filter(Boolean).map(sv => sv.co).filter(co => co.club);
    return !cs.length || cs.some(co => S.coLgDepth((co.leagueOf || {})[co.club] || D.CLUB_BY_ID[co.club].league) > 0);
  }
  const GOALS_CO = [
    // fáceis
    { id: 'cov3', tier: 1, fam: 'vit', n: 3, t: 'Vença 3 jogos', add: won },
    { id: 'coj8', tier: 1, n: 8, t: 'Jogue 8 jogos', add: cog },
    { id: 'cofora', tier: 1, t: 'Vença um jogo fora de casa', add: x => won(x) && !x.log.home },
    { id: 'cog6', tier: 1, n: 6, t: 'Faça 6 gols', add: x => (cog(x) ? x.log.gf : 0) },
    { id: 'colota', tier: 1, fam: 'lota', t: 'Lote o estádio em um jogo', add: x => cog(x) && !!x.log.home && x.log.pub >= x.log.cap * 0.98 },
    // médias
    { id: 'cosg2', tier: 2, n: 2, t: 'Ganhe 2 jogos sem levar gol', add: x => won(x) && x.log.ga === 0 },
    { id: 'cov3s', tier: 2, fam: 'vit', n: 3, t: 'Vença 3 seguidas', add: won, cut: x => x.kind === 'cog' && x.log.res !== 'v' },
    { id: 'covira', tier: 2, t: 'Vença de virada', add: x => won(x) && behind(x.m) },
    { id: 'coacima', tier: 2, t: 'Vença um time acima de você na tabela', add: x => won(x) && !!x.up },
    { id: 'colota3', tier: 2, fam: 'lota', n: 3, t: 'Lote o estádio 3 vezes', add: x => cog(x) && !!x.log.home && x.log.pub >= x.log.cap * 0.98 },
    // difíceis
    { id: 'cometa', tier: 3, t: 'Cumpra a meta da diretoria', add: x => cos(x) && !!x.out.met },
    { id: 'cocamp', tier: 3, t: 'Seja campeão', add: x => cos(x) && !!x.out.won },
    { id: 'cosobe', tier: 3, t: 'Suba de divisão', add: x => cos(x) && !!x.out.up, ok: canGoUp },
    { id: 'coinv8', tier: 3, n: 8, t: 'Fique 8 jogos sem perder', add: x => cog(x) && x.log.res !== 'd', cut: x => x.kind === 'cog' && x.log.res === 'd' },
    { id: 'coazul', tier: 3, t: 'Termine a temporada com o caixa no azul', add: x => cos(x) && !!(x.out.fin && x.out.fin.caixa > 0) },
  ];
  // Na 1.0 só o Treinador está na home: a semana sorteia as metas dele. As do Jogador voltam com o modo (JOG_ON)
  const JOG_ON = false, POOL = JOG_ON ? GOALS : GOALS_CO;
  const GOAL_BY = Object.fromEntries(GOALS.concat(GOALS_CO).map(g => [g.id, g]));
  const PRIZE = { 1: { xp: 100, p: 1, m: 2 }, 2: { xp: 200, p: 1, m: 3 }, 3: { xp: 300, p: 2, m: 5 } }; // m: moedas (as 3 metas = 10)

  // A semana começa na segunda (data local); as três metas saem de um sorteio pela data, iguais para todo mundo
  const pad = n => String(n).padStart(2, '0');
  function monday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  const wkKey = d => { const m = monday(d || new Date()); return m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(m.getDate()); };
  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function week() {
    const p = prof(), k = wkKey(), h = hash('climbix-metas-' + k);
    // Uma de cada dificuldade, sem duas da mesma família (ex.: nota A e nota S na mesma semana)
    const pick = (tier, fams) => { const l = POOL.filter(g => g.tier === tier && !(g.fam && fams.includes(g.fam)) && (!g.ok || g.ok())); return l[(h >>> (tier * 5)) % l.length].id; };
    const famOf = id => (GOAL_BY[id] || {}).fam;
    if (!p.wk || p.wk.k !== k) {
      const fams = [];
      p.wk = { k, goals: [1, 2, 3].map(t => { const id = pick(t, fams); if (famOf(id)) fams.push(famOf(id)); return { id, p: 0 }; }) };
      U.ITEMS.put();
    }
    // Meta que não é do modo em jogo (as do Jogador, sorteadas antes da 1.0) e ainda está aberta: troca por uma do Treinador
    let ch = false;
    p.wk.goals.forEach((g, i) => { const d = GOAL_BY[g.id]; if (g.done || (d && POOL.includes(d))) return;
      const fams = p.wk.goals.filter(o => o !== g).map(o => famOf(o.id)).filter(Boolean);
      g.id = pick(d ? d.tier : i + 1, fams); g.p = 0; ch = true; });
    if (ch) U.ITEMS.put();
    return p.wk;
  }
  const daysLeft = () => { const m = monday(new Date()); m.setDate(m.getDate() + 7); return Math.max(1, Math.ceil((m - new Date()) / 864e5)); };

  // Fim de carreira ou de Relâmpago: XP, metas que andaram e pacotinhos (um por meta cumprida e um por nível novo).
  // Volta o que mudou para a tela mostrar; o chamador guarda o resultado (a tela pode ser redesenhada)
  function credit(x, xp) {
    const p = prof(), wk = week(), before = level(p.xp).lv, done = [], isCo = x.kind === 'cog' || x.kind === 'cos';
    wk.goals.forEach(g => {
      const def = GOAL_BY[g.id];
      if (!def || g.done) return;
      if (def.cut && def.cut(x)) { g.p = 0; return; }
      const a = +def.add(x) || 0;
      if (!a) return;
      g.p = Math.min(def.n || 1, (g.p || 0) + a);
      if (g.p >= (def.n || 1)) { g.done = true; const pr = PRIZE[def.tier]; xp += pr.xp; done.push({ t: def.t, xp: pr.xp, p: pr.p, m: pr.m }); if (U.COINS) U.COINS.add({ n: pr.m, t: 'Meta da semana' }); }
    });
    p.xp = (p.xp || 0) + xp;
    const after = level(p.xp).lv;
    // Pacotinho (meta e nível novo) é do Jogador: no Treinador a meta paga moedas e XP
    const why = isCo ? [] : done.map(d => ({ t: 'Meta da semana', n: d.p })).concat(after > before ? [{ t: after - before > 1 ? 'Níveis novos' : 'Nível novo', n: after - before }] : []);
    U.ITEMS.put();
    if (why.length) U.ITEMS.earn(why);
    return { xp, before, after, done, packs: why.reduce((a, w) => a + w.n, 0) };
  }
  function career(c, f) {
    if (c.profRes) return c.profRes;
    return (c.profRes = credit({ kind: 'car', c, f }, careerXp(c, f)));
  }
  const relampago = (run, f) => run.prof || (run.prof = credit({ kind: 'rel', f }, relXp(f)));
  // Jogo a Jogo: cada jogo anda as metas da semana (sem XP); cada temporada fechada dá XP, sem esperar o fim da carreira
  const jajGame = (c, out, classico) => (out && out.my ? credit({ kind: 'jaj', c, my: out.my, out, classico }, 0) : null);
  const jajXp = (titles, meta) => 50 + Math.min(60, titles * 15) + (meta ? 30 : 0);
  function jajSeason(c, res) {
    if (c.profSeas === c.season) return null; // já creditada (a tela pode ser redesenhada)
    c.profSeas = c.season;
    const mt = c.fcMetaEnd, meta = !!(mt && mt.have >= mt.n);
    return credit({ kind: 'jajs', c, meta }, jajXp(res.titles.length, meta));
  }

  // Faixa nos prêmios do fim: XP ganho, nível novo e metas cumpridas
  function finaleHtml(r) {
    if (!r) return '';
    const L = level(prof().xp);
    return '<div class="pf-fin"><b>+' + r.xp + ' XP</b><span>' + (r.after > r.before ? 'Subiu para o nível ' + r.after + ' · ' + rankOf(r.after) : 'Nível ' + L.lv + ' · faltam ' + (L.next - L.cur) + ' XP') + '</span>' +
      r.done.map(d => '<span class="pf-ok">Meta cumprida: ' + esc(d.t) + '</span>').join('') + '</div>';
  }

  // ---------- tela inicial ----------
  function homeHtml() {
    const p = prof(), L = level(p.xp), wk = week(), ok = wk.goals.filter(g => g.done).length;
    return '<button class="hg pf-home" id="b-prof"><i class="pf-lv"><b>' + L.lv + '</b></i><b>Perfil · ' + rankOf(L.lv) + '</b>' +
      '<small>Metas da semana ' + ok + '/3 · nível ' + L.lv + '</small><span class="pf-bar"><em style="width:' + Math.round(L.cur / L.next * 100) + '%"></em></span></button>';
  }
  function homeBind() { if ($('b-prof')) $('b-prof').onclick = () => { sfx('tap'); open(); }; }

  // ---------- tela do perfil ----------
  // Números de todas as carreiras: da coleção (a carta de cada carreira terminada)
  function totals() {
    const list = load('climbix-colecao-v1') || [];
    const t = { n: list.length, goals: 0, assists: 0, titles: 0, ballon: 0, best: null };
    list.forEach(e => { const k = e.card || {}; t.goals += k.goals || 0; t.assists += k.assists || 0; t.titles += k.titles || 0; t.ballon += k.ballon || 0;
      if (e.grade && (!t.best || GR[e.grade] > GR[t.best])) t.best = e.grade; });
    return t;
  }
  // Carteirinha de sócio: número tirado do id do ranking (o mesmo em todo aparelho da conta), desde a primeira carreira
  const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function member() {
    const pid = U.rankPlayer ? U.rankPlayer().pid : '', n = String(hash('socio-' + pid) % 1e6).padStart(6, '0');
    const list = load('climbix-colecao-v1') || [], at = list.reduce((m, e) => Math.min(m, e.at || m), Date.now()), d = new Date(at);
    return { no: n.slice(0, 3) + '.' + n.slice(3), since: MES[d.getMonth()] + ' de ' + d.getFullYear() };
  }
  function open() {
    U.G.c = null; U.G.step = null; U.bar();
    const p = prof(), L = level(p.xp), wk = week(), T = totals(), left = daysLeft(), M = member();
    // Igual à home: topo (sem o nível, que já está na carteirinha), rótulos discretos e ingressos com o prêmio no canhoto
    const goal = g => { const d = GOAL_BY[g.id], n = d.n || 1, pr = PRIZE[d.tier];
      return U.tk('tk-tab pf-goal ' + (g.done ? 'done' : 'tk-yel'), null, '<span class="pf-ck" aria-hidden="true">' + (g.done ? U.ICON.check : '') + '</span>' +
        '<span class="tk-t"><b>' + esc(d.t) + (n > 1 && !g.done ? ' <em>' + (g.p || 0) + '/' + n + '</em>' : '') + '</b><small>' + U.emo('📦', 'xs') + (pr.p > 1 ? pr.p + ' pacotinhos' : '1 pacotinho') + (g.done ? ', já ganhos' : '') + '</small></span>',
        '<b>+' + pr.xp + '</b><small>' + (g.done ? 'feito' : 'XP') + '</small>'); };
    const num = (v, l) => '<div><b>' + v + '</b><span>' + l + '</span></div>';
    render(U.topBar(false) +
      '<div class="pf">' +
      U.tk('tk-tab pf-card', null, '<span class="pf-who">' + U.emo('🎟️', 'lg') + '<span><small>Sócio nº ' + M.no + ' · desde ' + M.since + '</small><b>' + rankOf(L.lv) + '</b></span></span>' +
        '<span class="pf-xp"><span class="pf-bar big"><em style="width:' + Math.round(L.cur / L.next * 100) + '%"></em></span><small><b>' + L.cur + ' de ' + L.next + ' XP</b> para o nível ' + (L.lv + 1) + '</small></span>',
        '<small>nível</small><b>' + L.lv + '</b><span class="tk-bars"></span>') +
      '<section class="pf-sec tab-sec"><div class="tab-sh"><h2>Metas da semana</h2><span>' + (left === 1 ? 'renovam amanhã' : 'renovam em ' + left + ' dias') + '</span></div><div class="hm-tks">' + wk.goals.map(goal).join('') + '</div></section>' +
      '<section class="pf-sec tab-sec pf-sk">' + U.streakHome() + '</section>' +
      (U.COINS && U.COINS.clubs().length ? '<section class="pf-sec tab-sec"><div class="tab-sh"><h2>Seus times</h2><span>comprados com moedas</span></div><div class="pf-clubs">' +
        U.COINS.clubs().map(id => '<span>' + U.crest(id) + esc(U.club(id).short || U.club(id).name) + '</span>').join('') + '</div></section>' : '') +
      (window.CRAQUE_WORLD && U.worldTk ? '<section class="pf-sec tab-sec">' + U.worldTk() + '</section>' : '') +
      '<section class="pf-sec tab-sec"><div class="tab-sh"><h2>Todas as carreiras</h2></div><div class="sumula"><div class="sumula-in"><div class="pf-nums">' +
        num(T.n, T.n === 1 ? 'carreira' : 'carreiras') + num(T.goals, 'gols') + num(T.assists, 'assistências') + num(T.titles, 'títulos') +
        num(T.ballon, T.ballon === 1 ? 'Bola de Ouro' : 'Bolas de Ouro') + num(T.best || '–', 'melhor nota') + '</div></div></div>' +
        '<p class="pf-how">Toda carreira terminada dá XP (mais com nota alta e títulos); no Rumo ao Topo, cada temporada. Cada nível novo e cada meta cumprida dão pacotinho.</p></section></div>' + U.tabs('profile')
    );
    U.topBarBind();
    U.backTo = open;
    U.worldHomeBind();
    U.streakBind(open); // pegou o prêmio do dia: redesenha (o pacotinho vai para a fila da tela inicial)
  }

  // ---------- Treinador: números do técnico, ganchos e a tela deitada (quadro 53) ----------
  // { t: títulos, v: vitórias, s: temporadas, last: { name, club, s } } de todas as carreiras de técnico da conta. Fica
  // no inventário (vai para a nuvem). Na primeira vez sai das carreiras salvas neste aparelho
  function coRec() {
    const p = prof();
    if (!p.co) {
      const r = { t: 0, v: 0, s: 0, last: null };
      [...Array(U.CO_SLOTS).keys()].forEach(i => { const sv = U.coSaved ? U.coSaved(i) : null, co = sv && sv.co; if (!co) return;
        r.t += (co.titles || []).length; r.s += (co.hist || []).length; r.v += ((co.ss && co.ss.log) || []).filter(l => l.res === 'v').length;
        const lt = (co.titles || []).slice(-1)[0]; if (lt && (!r.last || lt.s >= r.last.s)) r.last = { name: lt.name, club: lt.club, s: lt.s }; });
      p.co = r; U.ITEMS.put();
    }
    return p.co;
  }
  // Aviso curto por cima da tela: meta cumprida (e nível novo)
  function coToast(r) {
    if (!r || (!r.done.length && r.after <= r.before) || typeof document === 'undefined') return;
    const m = r.done.reduce((a, d) => a + d.m, 0), box = document.createElement('div');
    box.className = 'pay-ty'; box.setAttribute('role', 'status');
    box.innerHTML = r.done.length ? '<b>Meta cumprida</b><span>' + r.done.map(d => esc(d.t)).join(' · ') + ' · +' + m + (m === 1 ? ' moeda' : ' moedas') + '</span><button aria-label="Fechar">OK</button>'
      : '<b>Nível ' + r.after + '</b><span>' + rankCo(r.after) + '</span><button aria-label="Fechar">OK</button>';
    document.body.appendChild(box); box.querySelector('button').onclick = () => box.remove();
    // Os 7 s só contam sem a festa da taça ou do acesso por cima (o CSS esconde o aviso enquanto ela está na tela)
    let left = 7000; const iv = setInterval(() => { if (!box.isConnected) return clearInterval(iv); if (!document.querySelector('.tc-ov') && (left -= 250) <= 0) { clearInterval(iv); box.remove(); } }, 250);
  }
  // Fim de um jogo do Treinador (ui/coach.js). pre = [sua posição, a deles, jogos já feitos] antes do jogo
  function coGame(co, m, log, aux) {
    const R = coRec(); if (log.res === 'v') R.v++;
    const pp = m.pfp, cb = id => D.CLUB_BY_ID[id] || {};
    const up = pp ? (pp[2] > 0 ? pp[1] < pp[0] : (cb(m.vs).strength || 0) > (cb(co.club).strength || 0)) : false;
    const r = credit({ kind: 'cog', co, m, log, up, aux: !!aux }, 0);
    coToast(r);
    return r;
  }
  // Fim da temporada: XP (mais com meta, acesso e título), metas da temporada e os números do técnico. Uma vez por temporada
  const coXp = out => (out.sacked ? 0 : 150 + (out.met ? 50 : 0) + (out.up ? 75 : 0) + (out.won ? 150 : 0));
  function coSeason(co, out) {
    if (out.profPaid) return null;
    out.profPaid = true;
    const R = coRec(); R.s++;
    if (out.won) { R.t++; R.last = { name: out.league, club: out.club, s: out.season }; }
    const r = credit({ kind: 'cos', co, out }, coXp(out));
    coToast(r);
    return r;
  }
  const BK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  function openLand(back) {
    const p = prof(), L = level(p.xp), wk = week(), R = coRec(), left = daysLeft(), nx = RANKS_CO.find(r => r[0] > L.lv);
    const nick = U.cloudStatus && U.cloudStatus() ? U.cloudName() : '', mine = U.COINS ? U.COINS.clubs() : [];
    const goal = g => { const d = GOAL_BY[g.id], n = d.n || 1;
      return '<div class="pft-g' + (g.done ? ' done' : '') + '"><span>' + (g.done ? 'OK' : (g.p || 0) + '/' + n) + '</span><b>' + esc(d.t) + '</b><em>' + (U.COINS ? U.COINS.svg : '') + '+' + PRIZE[d.tier].m + '</em></div>'; };
    const num = (v, l, gold) => '<span' + (gold ? ' class="au"' : '') + '><b>' + v + '</b><small>' + l + '</small></span>';
    const lt = R.last, cl = lt ? U.club(lt.club) || {} : null;
    const acc = !window.CLIMBIX_SOLO && !!U.cloud, st = acc && U.cloudStatus ? U.cloudStatus() : null; // conta no Perfil (2026-11-12, Silvio: "essa tela conta não deveria estar em perfil?")
    U.LD.show('<div class="pft"><div class="tm-h"><button class="tcr-back" id="pft-back" aria-label="Voltar">' + BK + '</button><b>Perfil</b>' + (nick ? '<small>' + esc(nick) + '</small>' : '') + (acc ? '<button class="pft-acc' + (st ? '' : ' in') + '" id="pft-acc">' + (st ? 'Sua conta' : 'Entrar ou criar conta') + '</button>' : '') + '</div>' +
      '<div class="pft-l"><div class="pft-card"><div><span><b>' + rankCo(L.lv) + '</b>' + (nx ? '<small>próximo: ' + nx[1] + ' no nível ' + nx[0] + '</small>' : '') + '</span>' +
        '<span><i><u style="width:' + Math.round(L.cur / L.next * 100) + '%"></u></i><b>' + L.cur + ' de ' + L.next + ' XP</b></span></div>' +
        '<div class="pft-lv"><small>NÍVEL</small><b>' + L.lv + '</b></div></div>' +
        '<div class="pft-sh"><span class="pft-lb">METAS DA SEMANA</span><span>' + (left === 1 ? 'renovam amanhã' : 'renovam em ' + left + ' dias') + '</span></div>' +
        '<div class="pft-gs">' + wk.goals.map(goal).join('') + '</div></div>' +
      '<div class="pft-r"><div class="pft-p"><span class="pft-lb">COMO TÉCNICO</span><div class="pft-n">' + num(R.t, R.t === 1 ? 'título' : 'títulos', 1) + num(R.v, R.v === 1 ? 'vitória' : 'vitórias') + num(R.s, R.s === 1 ? 'temporada' : 'temporadas') + '</div></div>' +
        '<div class="pft-p"><span class="pft-lb">ÚLTIMO TÍTULO</span>' + (lt ? '<span class="pft-t">' + U.crest(lt.club) + '<span><b>' + esc(lt.name) + ' ' + (U.YEAR0 + lt.s) + '</b><small>' + esc(cl.short || cl.name || '') + '</small></span></span>' : '<span class="pft-no">Nenhum por enquanto</span>') + '</div>' +
        (mine.length ? '<div class="pft-p grow"><span class="pft-lb">SEUS TIMES</span><span class="pft-cl">' + mine.slice(0, mine.length > 4 ? 3 : 4).map(id => U.crest(id)).join('') + (mine.length > 4 ? '<b>+' + (mine.length - 3) + '</b>' : '') + '</span></div>' : '') +
      '</div></div>',
      w => { w.querySelector('#pft-back').onclick = () => { sfx('tap'); (back || U.home)(); };
        if (w.querySelector('#pft-acc')) w.querySelector('#pft-acc').onclick = () => { sfx('tap'); U.cloud('login', null, null, () => openLand(back)); }; }, 'O Climbix é jogado com o celular deitado.');
  }

  Object.assign(U, { profileLand: openLand, profileCoGame: coGame, profileCoSeason: coSeason, profile: open, profileHome: homeHtml, profileHomeBind: homeBind, profileCareer: career, profileRel: relampago, profileFinale: finaleHtml, profileJajGame: jajGame, profileJajSeason: jajSeason,
    PROFILE: { level, rankOf, rankCo, week, GOALS, GOALS_CO, PRIZE, coXp, coRec, careerXp, relXp, jajXp, wkKey } });
})();
