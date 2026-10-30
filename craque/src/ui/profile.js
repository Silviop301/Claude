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

  // XP do fim de uma carreira: base, nota e títulos; a Completa (mais longa) vale um pouco mais. Relâmpago, menos.
  const GXP = { S: 150, A: 100, B: 60, C: 30, D: 10 };
  const RXP = { S: 50, A: 35, B: 20, C: 10, D: 0 };
  const careerXp = (c, f) => 100 + (GXP[f.grade] || 0) + Math.min(100, (f.titles || 0) * 4) + (c.mode === 'completa' ? 50 : 0);
  const relXp = f => 30 + (RXP[f.grade] || 0);

  // ---------- metas da semana ----------
  // x: { kind: 'car', c, f } (carreira terminada) ou { kind: 'rel', f } (Relâmpago). add: quanto a meta anda (n = alvo)
  const GR = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const car = x => x.kind === 'car';
  const tro = (x, type) => Object.values(x.c.trophies || {}).reduce((a, t) => a + (t.type === type ? t.n : 0), 0);
  const clubs = x => new Set((x.c.spells || []).filter(s => s.seasons).map(s => s.club)).size;
  const GOALS = [
    // fáceis
    { id: 'car2', tier: 1, n: 2, t: 'Termine 2 carreiras', add: x => car(x) },
    { id: 'rel2', tier: 1, fam: 'rel', n: 2, t: 'Jogue 2 Relâmpagos', add: x => x.kind === 'rel' },
    { id: 'comp', tier: 1, fam: 'comp', t: 'Termine uma Carreira Completa', add: x => car(x) && x.c.mode === 'completa' },
    { id: 'tit10', tier: 1, fam: 'tit', t: 'Ganhe 10 títulos numa carreira', add: x => car(x) && x.f.titles >= 10 },
    { id: 'clubs4', tier: 1, t: 'Jogue em 4 clubes numa carreira', add: x => car(x) && clubs(x) >= 4 },
    { id: 'ucl', tier: 1, fam: 'cont', t: 'Ganhe a Liga dos Campeões', add: x => car(x) && tro(x, 'ucl') > 0 },
    // médias
    { id: 'gradeA', tier: 2, fam: 'nota', t: 'Termine uma carreira com nota A ou S', add: x => car(x) && GR[x.f.grade] >= 4 },
    { id: 'relA', tier: 2, fam: 'rel', t: 'Tire nota A ou S na Relâmpago', add: x => x.kind === 'rel' && GR[x.f.grade] >= 4 },
    { id: 'tit20', tier: 2, fam: 'tit', t: 'Ganhe 20 títulos numa carreira', add: x => car(x) && x.f.titles >= 20 },
    { id: 'wc', tier: 2, fam: 'wc', t: 'Seja campeão da Copa do Mundo', add: x => car(x) && tro(x, 'wc') > 0 },
    { id: 'gk', tier: 2, t: 'Termine uma carreira de goleiro com nota B ou melhor', add: x => car(x) && x.c.pos === 'GOL' && GR[x.f.grade] >= 3 },
    // difíceis
    { id: 'gradeS', tier: 3, fam: 'nota', t: 'Termine uma carreira com nota S', add: x => car(x) && x.f.grade === 'S' },
    { id: 'ballon2', tier: 3, t: 'Ganhe 2 Bolas de Ouro numa carreira', add: x => car(x) && tro(x, 'ballon') >= 2 },
    { id: 'lenda', tier: 3, fam: 'wc', t: 'Ganhe a Copa do Mundo e a Bola de Ouro na mesma carreira', add: x => car(x) && tro(x, 'wc') > 0 && tro(x, 'ballon') > 0 },
    { id: 'cwc2', tier: 3, t: 'Ganhe 2 Mundiais de Clubes numa carreira', add: x => car(x) && tro(x, 'cwc') >= 2 },
    { id: 'compA', tier: 3, fam: 'comp', t: 'Nota A ou S numa Carreira Completa', add: x => car(x) && x.c.mode === 'completa' && GR[x.f.grade] >= 4 },
    { id: 'lib', tier: 3, fam: 'cont', t: 'Ganhe a Libertadores', add: x => car(x) && tro(x, 'lib') > 0 },
  ];
  const GOAL_BY = Object.fromEntries(GOALS.map(g => [g.id, g]));
  const PRIZE = { 1: { xp: 100, p: 1 }, 2: { xp: 200, p: 1 }, 3: { xp: 300, p: 2 } };

  // A semana começa na segunda (data local); as três metas saem de um sorteio pela data, iguais para todo mundo
  const pad = n => String(n).padStart(2, '0');
  function monday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  const wkKey = d => { const m = monday(d || new Date()); return m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(m.getDate()); };
  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function week() {
    const p = prof(), k = wkKey();
    if (!p.wk || p.wk.k !== k) {
      const h = hash('climbix-metas-' + k);
      // Uma de cada dificuldade, sem duas da mesma família (ex.: nota A e nota S na mesma semana)
      const fams = [];
      const pick = tier => { const l = GOALS.filter(g => g.tier === tier && !(g.fam && fams.includes(g.fam))); const g = l[(h >>> (tier * 5)) % l.length]; if (g.fam) fams.push(g.fam); return g.id; };
      p.wk = { k, goals: [1, 2, 3].map(t => ({ id: pick(t), p: 0 })) };
      U.ITEMS.put();
    }
    return p.wk;
  }
  const daysLeft = () => { const m = monday(new Date()); m.setDate(m.getDate() + 7); return Math.max(1, Math.ceil((m - new Date()) / 864e5)); };

  // Fim de carreira ou de Relâmpago: XP, metas que andaram e pacotinhos (um por meta cumprida e um por nível novo).
  // Volta o que mudou para a tela mostrar; o chamador guarda o resultado (a tela pode ser redesenhada)
  function credit(x, xp) {
    const p = prof(), wk = week(), before = level(p.xp).lv, done = [];
    wk.goals.forEach(g => {
      const def = GOAL_BY[g.id];
      if (!def || g.done || !def.add(x)) return;
      g.p = Math.min(def.n || 1, (g.p || 0) + 1);
      if (g.p >= (def.n || 1)) { g.done = true; const pr = PRIZE[def.tier]; xp += pr.xp; done.push({ t: def.t, xp: pr.xp, p: pr.p }); }
    });
    p.xp = (p.xp || 0) + xp;
    const after = level(p.xp).lv;
    const why = done.map(d => ({ t: 'Meta da semana', n: d.p })).concat(after > before ? [{ t: after - before > 1 ? 'Níveis novos' : 'Nível novo', n: after - before }] : []);
    U.ITEMS.put();
    if (why.length) U.ITEMS.earn(why);
    return { xp, before, after, done, packs: why.reduce((a, w) => a + w.n, 0) };
  }
  function career(c, f) {
    if (c.profRes) return c.profRes;
    return (c.profRes = credit({ kind: 'car', c, f }, careerXp(c, f)));
  }
  const relampago = (run, f) => run.prof || (run.prof = credit({ kind: 'rel', f }, relXp(f)));

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
  function open() {
    const p = prof(), L = level(p.xp), wk = week(), T = totals(), left = daysLeft();
    const goal = g => { const d = GOAL_BY[g.id], n = d.n || 1, pr = PRIZE[d.tier];
      return '<div class="pf-goal' + (g.done ? ' done' : '') + '"><span class="pf-ck" aria-hidden="true">' + (g.done ? U.ICON.check : '') + '</span>' +
        '<div><b>' + esc(d.t) + '</b><small>' + (g.done ? 'Cumprida' : (n > 1 ? (g.p || 0) + ' de ' + n + ' · ' : '') + 'vale') + ' +' + pr.xp + ' XP e ' + (pr.p > 1 ? pr.p + ' pacotinhos' : '1 pacotinho') + '</small></div></div>'; };
    const num = (v, l) => '<div><b>' + v + '</b><span>' + l + '</span></div>';
    render(
      '<div class="pf"><button class="back-link" id="pf-back">‹ Início</button>' +
      '<h2 class="pf-h">Perfil</h2>' +
      '<div class="pf-top"><div class="pf-badge"><small>Nível</small><b>' + L.lv + '</b></div><div class="pf-rk"><b>' + rankOf(L.lv) + '</b>' +
        '<span class="pf-bar big"><em style="width:' + Math.round(L.cur / L.next * 100) + '%"></em></span><small>' + L.cur + ' de ' + L.next + ' XP para o nível ' + (L.lv + 1) + '</small></div></div>' +
      '<div class="pf-sec"><div class="pf-sh"><h3>Metas da semana</h3><small>' + (left === 1 ? 'renovam amanhã' : 'renovam em ' + left + ' dias') + '</small></div>' + wk.goals.map(goal).join('') + '</div>' +
      (window.CRAQUE_WORLD ? '<div class="pf-sec">' + U.worldHome() + '</div>' : '') +
      '<div class="pf-sec"><div class="pf-sh"><h3>Todas as carreiras</h3></div><div class="pf-nums">' +
        num(T.n, T.n === 1 ? 'carreira' : 'carreiras') + num(T.goals, 'gols') + num(T.assists, 'assistências') + num(T.titles, 'títulos') +
        num(T.ballon, T.ballon === 1 ? 'Bola de Ouro' : 'Bolas de Ouro') + num(T.best || '–', 'melhor nota') + '</div>' +
        '<p class="pf-how">Toda carreira terminada dá XP (mais com nota alta e títulos). Cada nível novo e cada meta cumprida dão pacotinho.</p></div></div>'
    );
    $('pf-back').onclick = () => U.home();
    U.backTo = open;
    U.worldHomeBind();
  }

  Object.assign(U, { profile: open, profileHome: homeHtml, profileHomeBind: homeBind, profileCareer: career, profileRel: relampago, profileFinale: finaleHtml,
    PROFILE: { level, rankOf, week, GOALS, PRIZE, careerXp, relXp, wkKey } });
})();
