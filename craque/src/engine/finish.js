// Fim de carreira: pontuação e veredito
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  // ---------- fim de carreira ----------
  // Pesos da pontuação final e faixas das notas (a tela de fim de carreira mostra a conta)
  S.SCORE_W = { title: 12, cont: 35, cwc: 60, wc: 150, wcGoal: 3, ballon: 100, award: 8, peak: 2 };
  S.GRADES = [['S', 1640], ['A', 1110], ['B', 830], ['C', 490], ['D', 0]];
  S.gradeOf = score => S.GRADES.find(([, min]) => score >= min)[0];
  S.finish = function (c) {
    c.retired = true;
    const T = c.totals;
    const titles = S.titleCount(T);
    // Despedida: parar em alta rende pontos extras
    const lastS = c.seasons[c.seasons.length - 1];
    const bonus = [];
    if (lastS && lastS.farewell) {
      if (lastS.rating >= 7) bonus.push({ txt: 'Parou no auge (nota ' + lastS.rating.toFixed(1).replace('.', ',') + ' na despedida)', v: 80 });
      if (lastS.titles.length) bonus.push({ txt: 'Título na temporada de despedida', v: 60 });
      if ((c.fansBy[lastS.club] || 0) >= 70) bonus.push({ txt: 'Estádio lotado na despedida ' + D.no(D.CLUB_BY_ID[lastS.club].name), v: 40 });
    }
    // Produção: atacantes e meias pelos gols/assistências; zagueiros e goleiros pela defesa
    const isDef = D.DEF_POS.includes(c.pos);
    // Pesos por posição para as quatro chegarem às notas altas com a mesma dificuldade
    const prod = isDef ? (T.cs || 0) * 0.9 + T.goals * 1.5 + T.assists * 0.7 + (T.saves || 0) * 0.15 + (T.penSaved || 0) * 2.5 + (T.tackles || 0) * 0.3
      : c.pos === 'MEI' ? T.goals * 1.1 + T.assists * 1.0 : T.goals * 0.62 + T.assists * 0.5;
    // Cada parcela da pontuação, para a tela explicar de onde veio a nota
    const n = (x, w) => (x || 0) * w;
    const prodTxt = isDef ? (T.cs || 0) + ' jogos sem sofrer gol' + (c.pos === 'GOL' ? ', ' + (T.penSaved || 0) + ' pênaltis defendidos' : ', ' + (T.tackles || 0) + ' desarmes') + ', ' + T.goals + ' gols'
      : T.goals + ' gols e ' + T.assists + ' assistências';
    const awards = (T.scorer || 0) + (T.young || 0) + (T.team || 0);
    const parts = [
      { k: 'prod', txt: 'Produção: ' + prodTxt, v: Math.round(prod) },
      { k: 'titles', txt: titles + (titles === 1 ? ' título' : ' títulos') + ' × ' + S.SCORE_W.title, v: n(titles, S.SCORE_W.title) },
      { k: 'cont', txt: 'Títulos continentais: ' + (T.cont || 0) + ' × ' + S.SCORE_W.cont + ' extra', v: n(T.cont, S.SCORE_W.cont) },
      { k: 'cwc', txt: 'Mundial de Clubes: ' + (T.cwc || 0) + ' × ' + S.SCORE_W.cwc + ' extra', v: n(T.cwc, S.SCORE_W.cwc) },
      { k: 'wc', txt: 'Copa do Mundo: ' + (T.wc || 0) + ' × ' + S.SCORE_W.wc, v: n(T.wc, S.SCORE_W.wc) },
      { k: 'wcg', txt: 'Gols em Copas: ' + (T.wcGoals || 0) + ' × ' + S.SCORE_W.wcGoal, v: n(T.wcGoals, S.SCORE_W.wcGoal) },
      { k: 'ballon', txt: 'Bola de Ouro: ' + (T.ballon || 0) + ' × ' + S.SCORE_W.ballon, v: n(T.ballon, S.SCORE_W.ballon) },
      { k: 'awards', txt: 'Prêmios da liga (artilharia, revelação, seleção): ' + awards + ' × ' + S.SCORE_W.award, v: n(awards, S.SCORE_W.award) },
      { k: 'peak', txt: 'Auge: nota geral ' + c.peak + ' × ' + S.SCORE_W.peak, v: n(c.peak, S.SCORE_W.peak) },
    ].concat(bonus.map(b => ({ k: 'bonus', txt: b.txt, v: b.v }))).filter(p => p.v > 0);
    const score = parts.reduce((a, p) => a + p.v, 0);
    const byClub = {};
    c.spells = c.spells.filter(s => s.seasons);
    c.spells.forEach(s => {
      byClub[s.club] = byClub[s.club] || { seasons: 0, goals: 0 };
      byClub[s.club].seasons += s.to - s.from + 1;
      byClub[s.club].goals += s.goals;
    });
    const idol = Object.entries(byClub).sort((a, b) => b[1].seasons - a[1].seasons)[0];
    const nClubs = Object.keys(byClub).length;
    let verdict;
    if (T.ballon >= 3) verdict = 'Um dos maiores da história';
    else if (T.wc >= 1) verdict = T.wc > 1 ? 'Multicampeão do mundo' : 'Campeão do mundo';
    else if (T.ballon >= 1) verdict = 'Melhor do mundo';
    else if (T.goals >= 450) verdict = 'Artilheiro histórico';
    else if (c.pos === 'GOL' && (T.cs || 0) >= 230) verdict = 'Paredão';
    else if (c.pos === 'ZAG' && (T.cs || 0) >= 210) verdict = 'Xerife da defesa';
    else if (c.pos === 'ZAG' && T.goals >= 50) verdict = 'Zagueiro artilheiro';
    else if (idol && idol[1].seasons >= 8 && (c.fansBy[idol[0]] || 0) >= 75) verdict = 'Ídolo eterno ' + D.do(D.CLUB_BY_ID[idol[0]].name);
    else if (titles >= 14) verdict = 'Colecionador de taças';
    else if (c.peak < 66) verdict = 'Promessa que não vingou';
    else if (nClubs >= 11) verdict = 'Cigano da bola';
    else if (c.spells.filter(s => D.MONEY.includes(D.CLUB_BY_ID[s.club].league)).reduce((n, s) => n + s.seasons, 0) >= 3) verdict = 'Foi atrás do dinheiro';
    else if (c.spells.filter(s => D.CLUB_BY_ID[s.club].tier >= 4).reduce((n, s) => n + s.seasons, 0) >= 6) verdict = 'Estrela na Europa';
    else if ((c.trophies['Brasileirão'] || { n: 0 }).n >= 2) verdict = 'Rei do Brasileirão';
    else verdict = 'Carreira sólida';
    const grade = S.gradeOf(score);
    const mainClub = idol ? idol[0] : c.club;
    return { score, verdict, grade, titles, nClubs, bonus, mainClub, parts };
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
