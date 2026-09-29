// Conquistas: medalhas por feitos na carreira (sem vantagem para a próxima carreira).
// Avaliadas no fim da carreira a partir do histórico (c.seasons, c.spells, c.totals, c.kicks).
(function (root) {
  const D = root.CRAQUE_DATA || require('../data.js');
  const S = root.CRAQUE_SIM || require('./core.js');

  const tierOf = id => D.CLUB_BY_ID[id].tier;
  const leagueOf = id => D.CLUB_BY_ID[id].league0 || D.CLUB_BY_ID[id].league;
  const trophyN = (c, type) => Object.values(c.trophies || {}).filter(t => t.type === type).reduce((a, t) => a + t.n, 0);

  S.ACHIEVEMENTS = [
    { id: 'estreia', icon: '👟', name: 'Primeira de muitas', desc: 'Termine uma carreira', test: () => true },
    { id: 'g300', icon: '⚽', name: 'Matador', desc: 'Marque 300 gols na carreira', test: c => c.totals.goals >= 300 },
    { id: 'g500', icon: '💥', name: 'Artilheiro histórico', desc: 'Marque 500 gols na carreira', test: c => c.totals.goals >= 500 },
    { id: 'a200', icon: '🍽️', name: 'Garçom', desc: 'Dê 200 assistências na carreira', test: c => c.totals.assists >= 200 },
    { id: 'muralha', icon: '🧱', name: 'Muralha', desc: 'Termine 330 jogos sem sofrer gol (zagueiro ou goleiro)', test: c => (c.pos === 'ZAG' || c.pos === 'GOL') && (c.totals.cs || 0) >= 330 },
    { id: 'pegador', icon: '🧤', name: 'Pegador de pênalti', desc: 'Defenda 35 pênaltis como goleiro', test: c => (c.totals.penSaved || 0) >= 35 },
    { id: 'salvador', icon: '🛡️', name: 'Salvador', desc: 'Faça 12 defesas ou desarmes em lances decisivos', test: c => ((c.kicks || {}).saveOk || 0) + ((c.kicks || {}).tackleOk || 0) >= 12 },
    { id: 'icone', icon: '💎', name: 'Carta ícone', desc: 'Chegue a nota 85', test: c => c.peak >= 85 },
    { id: 'n95', icon: '💯', name: 'Perfeição', desc: 'Chegue a nota 95', test: c => c.peak >= 95 },
    { id: 'ouro', icon: '🌟', name: 'Melhor do mundo', desc: 'Ganhe a Bola de Ouro', test: c => c.totals.ballon >= 1 },
    { id: 'ouro3', icon: '👑', name: 'Lenda', desc: 'Ganhe 3 Bolas de Ouro', test: c => c.totals.ballon >= 3 },
    { id: 'copa', icon: '🏆', name: 'Campeão do mundo', desc: 'Ganhe a Copa do Mundo', test: c => (c.totals.wc || 0) >= 1 },
    { id: 'copagols', icon: '🌍', name: 'Artilheiro de Copa', desc: 'Marque 10 gols em Copas do Mundo', test: c => (c.totals.wcGoals || 0) >= 10 },
    { id: 'ucl', icon: '🏅', name: 'Orelhuda', desc: 'Ganhe a Liga dos Campeões', test: c => trophyN(c, 'ucl') >= 1 },
    { id: 'lib', icon: '🔥', name: 'Glória eterna', desc: 'Ganhe a Libertadores', test: c => trophyN(c, 'lib') >= 1 },
    { id: 'mundial', icon: '🌐', name: 'Campeão do mundo de clubes', desc: 'Ganhe o Mundial de Clubes', test: c => (c.totals.cwc || 0) >= 1 },
    { id: 'triplice', icon: '🥇', name: 'Tríplice coroa', desc: 'Liga, copa e continental na mesma temporada', test: c => c.seasons.some(s => ['league', 'cup', 'cont'].every(id => s.titles.some(t => t.id === id))) },
    { id: 'escada', icon: '🪜', name: 'Do porão ao topo', desc: 'Jogue a Série C ou D e depois um gigante europeu', test: c => {
      const i = c.spells.findIndex(sp => sp.seasons && ['bra-c', 'bra-d'].includes(leagueOf(sp.club)));
      return i >= 0 && c.spells.slice(i + 1).some(sp => sp.seasons && tierOf(sp.club) >= 5);
    } },
    { id: 'fiel', icon: '💍', name: 'Um clube só', desc: '10 temporadas ou mais sem trocar de clube', test: c => c.spells.some(sp => (sp.seasons || 0) >= 10) },
    { id: 'cigano', icon: '🧳', name: 'Mala sem alça', desc: 'Jogue por 10 clubes', test: c => new Set(c.spells.filter(sp => sp.seasons).map(sp => sp.club)).size >= 10 },
    { id: 'mundo', icon: '✈️', name: 'Volta ao mundo', desc: 'Jogue em 5 países', test: c => new Set(c.spells.filter(sp => sp.seasons).map(sp => D.LEAGUE_BY_ID[leagueOf(sp.club)].country)).size >= 5 },
    { id: 'arabia', icon: '🛢️', name: 'Petrodólares', desc: 'Jogue na Arábia Saudita ou no Catar', test: c => c.spells.some(sp => sp.seasons && ['ara', 'qat'].includes(leagueOf(sp.club))) },
    { id: 'prodigo', icon: '🏠', name: 'Filho pródigo', desc: 'Volte ao clube que te revelou', test: c => c.spells.filter(sp => sp.seasons && sp.club === c.firstClub).length >= 2 },
    { id: 'idolo', icon: '📣', name: 'Ídolo eterno', desc: 'Vire ídolo eterno de um clube', test: (c, f) => f.verdict.startsWith('Ídolo') },
    { id: 'acesso', icon: '⬆️', name: 'Subiu!', desc: 'Conquiste um acesso', test: c => c.seasons.some(s => s.move && s.move.dir === 'up') },
    { id: 'volta', icon: '🔁', name: 'Volta por cima', desc: 'Caia e depois suba com o mesmo clube', test: c => c.seasons.some((s, i) => s.move && s.move.dir === 'down' && c.seasons.slice(i + 1).some(t => t.club === s.club && t.move && t.move.dir === 'up')) },
    { id: 'frio', icon: '🧊', name: 'Sangue frio', desc: 'Converta 12 cobranças decisivas', test: c => (c.kicks || {}).ok >= 12 },
    { id: 'falta', icon: '🎯', name: 'Especialista em falta', desc: 'Marque 6 gols de falta em lances decisivos', test: c => (c.kicks || {}).fkOk >= 6 },
    { id: 'notaS', icon: '⭐', name: 'Nota S', desc: 'Termine uma carreira com nota S', test: (c, f) => f.grade === 'S' },
    { id: 'auge', icon: '🎬', name: 'Parou no auge', desc: 'Anuncie a despedida e faça boa temporada', test: (c, f) => f.bonus.some(b => b.txt.startsWith('Parou no auge')) },
    { id: 'eterno', icon: '🧓', name: 'Eterno', desc: 'Jogue até os 38 anos', test: c => c.age >= 38 },
    { id: 'rico', icon: '💰', name: 'Magnata', desc: 'Termine com R$ 100 mi de patrimônio', test: c => c.money >= 1e8 },
  ];

  // Lista das conquistas desta carreira (ids)
  S.achievementsOf = function (c, f) {
    return S.ACHIEVEMENTS.filter(a => { try { return a.test(c, f); } catch (e) { return false; } }).map(a => a.id);
  };

  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
