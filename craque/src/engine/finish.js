// Fim de carreira: pontuação e veredito
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');
  // ---------- fim de carreira ----------
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
    const prod = isDef ? (T.cs || 0) * 0.9 + T.goals * 1.5 + T.assists * 0.7 + (T.saves || 0) * 0.2 + (T.penSaved || 0) * 3 + (T.tackles || 0) * 0.3
      : c.pos === 'MEI' ? T.goals * 1.1 + T.assists * 1.0 : T.goals * 0.62 + T.assists * 0.5;
    const score = Math.round(prod + titles * 12 + T.cont * 10 + T.ballon * 100 + (T.scorer + T.young + T.team) * 8 + c.peak * 2 + (T.wc || 0) * 150 + (T.cwc || 0) * 40 + (T.wcGoals || 0) * 3 + bonus.reduce((a, b) => a + b.v, 0));    const byClub = {};
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
    const grade = score >= 1800 ? 'S' : score >= 1150 ? 'A' : score >= 760 ? 'B' : score >= 460 ? 'C' : 'D';
    const mainClub = idol ? idol[0] : c.club;
    return { score, verdict, grade, titles, nClubs, bonus, mainClub };
  };


  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
