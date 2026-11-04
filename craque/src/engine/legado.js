// Jogo a Jogo (plano, fase 6): metas do ano e pontos de legado.
// No começo de cada temporada chegam três metas: a do clube (a meta do ano, S.fcMeta, do tamanho do seu papel), a do
// empresário (valor e vitrine) e a sua (um sonho que você escolhe entre três). O fim da temporada diz quais foram
// cumpridas (res.metas). Cumprir a do clube dá confiança ao técnico; a do empresário, relação com ele.
// Pontos de legado (S.legacy) somam desde a primeira temporada: metas, títulos, prêmios, ídolo de clube e seleção.
// Os pesos ainda estão em calibração; por enquanto o legado aparece ao lado da nota, sem trocá-la.
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  const { clamp } = S._;
  const on = c => c && c.mode === 'completa' && c.fc && c.fc.season === c.season;

  // Tamanho da meta: pontos de legado ao cumprir
  const SIZE = { p: 5, m: 10, g: 20, x: 35 };
  // Efeito da meta do clube e da do empresário na relação (cumpriu, não cumpriu)
  const FX = { club: [6, -4], emp: [6, -3] };
  S.GOAL_SIZE = SIZE; S.GOAL_FX = FX;

  // O sonho do ano: três para escolher (um título, o prêmio da posição e, para quem já é grande, a Bola de Ouro; para
  // o jovem, o prêmio de melhor jovem; para os outros, terminar entre os quatro). O tamanho segue a dificuldade no simulador
  const prize = c => ({ ATA: 'Ser o artilheiro da liga', MEI: 'Liderar as assistências da liga', ZAG: 'Ser o melhor zagueiro da liga', GOL: 'Ganhar a Luva de Ouro da liga' })[c.pos];
  const DREAMS = {
    titulo: { name: () => 'Ganhar um título', size: 'm', ok: res => res.titles.length > 0 },
    premio: { name: prize, size: c => (c.pos === 'ATA' || c.pos === 'MEI' ? 'g' : 'x'), ok: res => res.awards.some(a => a.id === 'scorer') },
    jovem: { name: () => 'Ser o melhor jovem da liga', size: 'g', ok: res => res.awards.some(a => a.id === 'young') },
    top4: { name: () => 'Terminar entre os quatro da liga', size: 'm', ok: res => !!res.table && res.table.pos <= 4 },
    bola: { name: () => 'Ganhar a Bola de Ouro', size: 'x', ok: res => res.awards.some(a => a.id === 'ballon') },
  };
  S.FC_DREAMS = DREAMS;
  const dSize = (c, id) => { const z = DREAMS[id].size; return typeof z === 'function' ? z(c) : z; };
  S.fcDreamSize = dSize;
  S.fcDreamOpts = c => ['titulo', 'premio', S.ovr(c) >= 82 ? 'bola' : c.age <= 20 ? 'jovem' : 'top4'];

  // Meta do empresário: quem pouco joga, jogar; quem está logo abaixo do corte da seleção, ser convocado; os outros, a nota
  // média da vitrine (perto da mediana da posição no simulador, um pouco mais alta para a carta forte)
  const NOTA = { ATA: 8.2, MEI: 8, ZAG: 7.6, GOL: 7.7 };
  function empGoal(c) {
    const fc = c.fc, call = S.wcCall(c), o = S.ovr(c), sh = S.role(c, D.CLUB_BY_ID[c.club]).share;
    if (sh < 0.45) return { k: 'jogos', n: Math.round((fc.lg.rounds.length + 3) * Math.min(0.5, sh + 0.1)), size: 'p' };
    if (c.age >= 18 && !call.retired && o >= call.cut - 4 && o < call.cut) return { k: 'selecao', size: 'm' };
    return { k: 'nota', n: Math.round((NOTA[c.pos] + clamp((o - 75) * 0.02, -0.3, 0.3)) * 10) / 10, min: 10, size: 'm' };
  }
  const EMP_TXT = { jogos: g => 'Jogar ' + g.n + ' jogos no ano', selecao: () => 'Ser chamado para a seleção', nota: g => 'Nota média ' + String(g.n).replace('.', ',') + ' (com ' + g.min + ' jogos ou mais)' };
  const META_TXT = { goals: 'gols', assists: 'assistências', cs: 'jogos sem sofrer gol' };

  // As metas do ano (cria na primeira vez): { club, emp, dream (id escolhido ou null) }
  S.fcGoals = function (c) {
    if (!on(c)) return null;
    const fc = c.fc;
    if (!fc.goals) fc.goals = { emp: empGoal(c), dream: null };
    const m = S.fcMeta(c), g = fc.goals, A = fc.acc;
    const rows = [];
    if (m) rows.push({ side: 'club', txt: m.n + ' ' + META_TXT[m.k], have: m.have, n: m.n, size: 'm' });
    const e = g.emp;
    rows.push({ side: 'emp', txt: EMP_TXT[e.k](e), size: e.size, have: e.k === 'jogos' ? A.games : e.k === 'nota' ? (A.games ? Math.round(A.rsum / A.games * 10) / 10 : 0) : null, n: e.n });
    rows.push({ side: 'me', txt: g.dream ? DREAMS[g.dream].name(c) : null, size: g.dream ? dSize(c, g.dream) : null, dream: g.dream });
    return rows;
  };
  S.fcDream = function (c, id) {
    const g = S.fcGoals(c) && c.fc.goals;
    if (!g || g.dream || !S.fcDreamOpts(c).includes(id)) return false;
    g.dream = id;
    return true;
  };

  // Fim da temporada: confere as metas (res.metas), mexe nas relações e guarda no histórico (c.goalHist)
  function settle(c, fc, season, res) {
    const g = fc && fc.goals;
    if (!g) return;
    const out = [];
    const mt = fc.metaEnd;
    if (mt) out.push({ side: 'club', txt: mt.n + ' ' + META_TXT[mt.k], ok: mt.have >= mt.n, size: 'm' });
    const e = g.emp, A = fc.acc;
    const eok = e.k === 'jogos' ? A.games >= e.n : e.k === 'nota' ? A.games >= e.min && A.rsum / A.games >= e.n - 0.05 : S.wcCall(c).called;
    out.push({ side: 'emp', txt: EMP_TXT[e.k](e), ok: !!eok, size: e.size });
    if (g.dream) out.push({ side: 'me', txt: DREAMS[g.dream].name(c), ok: !!DREAMS[g.dream].ok(res), size: dSize(c, g.dream) });
    out.forEach(x => {
      if (x.side === 'club') c.rel.coach = clamp(c.rel.coach + FX.club[x.ok ? 0 : 1], 0, 100);
      if (x.side === 'emp' && S.fcRel) S.fcRel(c, 'emp', FX.emp[x.ok ? 0 : 1]);
    });
    res.metas = out;
    res.coach1 = Math.round(c.rel.coach); // o resumo mostra o técnico depois da meta do clube
    (c.goalHist = c.goalHist || []).push({ s: season, g: out.map(x => ({ side: x.side, ok: x.ok, size: x.size })) });
  }
  // A meta do clube é medida no fim do calendário (antes do ano virar)
  const fin = S.fcFinish;
  S.fcFinish = function (c) { const m = S.fcMeta(c); if (m && c.fc) c.fc.metaEnd = m; return fin(c); };
  const play = S.playSeason;
  S.playSeason = function (c) {
    const fc = on(c) && c.fc.done ? c.fc : null, season = c.season;
    const res = play(c);
    if (fc && res && res.full) settle(c, fc, season, res);
    return res;
  };

  // ---------- pontos de legado ----------
  // Somam desde a primeira temporada (contas sobre a carreira, nada guardado à parte além das metas)
  const LEG = {
    title: { league: 30, cup: 15, cont: 45, cont2: 15, inter: 20, super: 6, other: 8 },
    award: { ballon: 90, scorer: { ATA: 12, MEI: 16, ZAG: 24, GOL: 40 }, team: 8, young: 8 }, // prêmio da posição: o do goleiro sai bem menos
    wc: 120, natCont: 50, natGame: 1, natGoal: 2, idolFrom: 4, idolSeason: 6, idolTitle: 4,
  };
  S.LEGACY_W = LEG;
  S.legacy = function (c) {
    const by = { metas: 0, titulos: 0, premios: 0, idolo: 0, selecao: 0 };
    (c.goalHist || []).forEach(h => h.g.forEach(x => { if (x.ok) by.metas += SIZE[x.size] || 0; }));
    (c.seasons || []).forEach(s => {
      (s.titles || []).forEach(t => { by.titulos += LEG.title[t.id] !== undefined ? LEG.title[t.id] : LEG.title.other; });
      (s.awards || []).forEach(a => { const w = LEG.award[a.id]; by.premios += (w && typeof w === 'object' ? w[s.pos || c.pos] : w) || 0; });
    });
    const T = c.totals || {};
    by.titulos += (T.cwc || 0) * 40;
    by.selecao += (T.wc || 0) * LEG.wc + (T.natCont || 0) * LEG.natCont + (T.natGames || 0) * LEG.natGame + (T.natGoals || 0) * LEG.natGoal;
    // Ídolo: temporadas no mesmo clube depois da quarta, e os títulos lá
    const per = {};
    (c.spells || []).forEach(sp => { if (sp.loan) return; const p = per[sp.club] = per[sp.club] || { s: 0, t: 0 }; p.s += sp.seasons || 0; p.t += sp.titles || 0; });
    Object.values(per).forEach(p => { if (p.s > LEG.idolFrom) by.idolo += (p.s - LEG.idolFrom) * LEG.idolSeason + p.t * LEG.idolTitle; });
    const pts = Object.values(by).reduce((a, b) => a + b, 0);
    return { pts: Math.round(pts), by };
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
