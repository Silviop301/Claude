// Dados do CRAQUE: ligas, clubes (fictícios), características, eventos e textos.
// Os nomes de clubes estão todos aqui para poderem ser trocados sem mexer no resto do código.
(function (root) {
  const D = {};

  // Níveis de clube: força (média do elenco) e salário semanal base.
  D.TIERS = [
    null,
    { name: 'Várzea / Série C', min: 44, max: 55, wage: 2e3 },
    { name: 'Série B',          min: 54, max: 63, wage: 8e3 },
    { name: 'Elite nacional',   min: 62, max: 72, wage: 4e4 },
    { name: 'Europa média',     min: 70, max: 79, wage: 1.5e5 },
    { name: 'Gigante europeu',  min: 79, max: 88, wage: 4e5 },
  ];

  // Ligas e clubes: [nome, nível]. Dentro de cada nível da liga, a força cai do primeiro para o último.
  // Nomes reais apenas em texto (sem escudos); para compartilhar publicamente, troque por nomes fictícios aqui.
  D.LEAGUES = [
    { id: 'bra-c', cup: 'Copa do Brasil', name: 'Série C', country: 'Brasil', flag: '🇧🇷', clubs: [['Figueirense', 1], ['Náutico', 1], ['Londrina', 1], ['Ypiranga-RS', 1], ['Confiança', 1], ['São Bernardo', 1]] },
    { id: 'bra-b', cup: 'Copa do Brasil', name: 'Série B', country: 'Brasil', flag: '🇧🇷', clubs: [['Coritiba', 2], ['Goiás', 2], ['Avaí', 2], ['Ponte Preta', 2], ['Guarani', 2], ['Vila Nova', 2], ['CRB', 2]] },
    { id: 'bra-a', cup: 'Copa do Brasil', name: 'Brasileirão', country: 'Brasil', flag: '🇧🇷', clubs: [['Flamengo', 3], ['Palmeiras', 3], ['Atlético-MG', 3], ['São Paulo', 3], ['Corinthians', 3], ['Fluminense', 3], ['Botafogo', 3], ['Grêmio', 3], ['Internacional', 3], ['Cruzeiro', 3], ['Santos', 3], ['Bahia', 3], ['Fortaleza', 3], ['Vasco', 3]] },
    { id: 'arg', cup: 'Copa Argentina', name: 'Liga Argentina', country: 'Argentina', flag: '🇦🇷', clubs: [['River Plate', 3], ['Boca Juniors', 3], ['Racing', 3], ['Independiente', 3], ['San Lorenzo', 3]] },
    { id: 'por', cup: 'Taça de Portugal', name: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹', clubs: [['Benfica', 4], ['Porto', 4], ['Sporting', 4], ['Braga', 3]] },
    { id: 'esp', cup: 'Copa do Rei', name: 'La Liga', country: 'Espanha', flag: '🇪🇸', clubs: [['Real Madrid', 5], ['Barcelona', 5], ['Atlético de Madrid', 4], ['Real Sociedad', 4], ['Sevilla', 4], ['Villarreal', 4]] },
    { id: 'ing', cup: 'FA Cup', name: 'Premier League', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Manchester City', 5], ['Liverpool', 5], ['Arsenal', 5], ['Chelsea', 4], ['Manchester United', 4], ['Tottenham', 4], ['Newcastle', 4], ['Aston Villa', 4]] },
    { id: 'ita', cup: 'Coppa Italia', name: 'Serie A', country: 'Itália', flag: '🇮🇹', clubs: [['Inter de Milão', 5], ['Juventus', 4], ['Milan', 4], ['Napoli', 4], ['Roma', 4]] },
    { id: 'ale', cup: 'Copa da Alemanha', name: 'Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Bayern de Munique', 5], ['Bayer Leverkusen', 4], ['Borussia Dortmund', 4], ['RB Leipzig', 4]] },
    { id: 'fra', cup: 'Copa da França', name: 'Ligue 1', country: 'França', flag: '🇫🇷', clubs: [['PSG', 5], ['Monaco', 4], ['Olympique de Marseille', 4], ['Lyon', 4]] },
    { id: 'ara', cup: 'Copa do Rei Saudita', name: 'Saudi Pro League', country: 'Arábia', flag: '🇸🇦', wageMult: 4, clubs: [['Al-Hilal', 3], ['Al-Nassr', 3], ['Al-Ittihad', 3]] },
    { id: 'usa', cup: 'US Open Cup', name: 'MLS', country: 'EUA', flag: '🇺🇸', wageMult: 2, clubs: [['Inter Miami', 3], ['LA Galaxy', 3], ['LAFC', 3]] },
  ];

  D.CLUBS = [];
  D.LEAGUES.forEach(lg => {
    lg.clubs.forEach(([name, tier], i) => {
      const same = lg.clubs.filter(x => x[1] === tier).length;
      const k = lg.clubs.slice(0, i).filter(x => x[1] === tier).length;
      const T = D.TIERS[tier];
      const strength = Math.round(T.max - (k / Math.max(1, same - 1)) * (T.max - T.min) * 0.75);
      D.CLUBS.push({ id: lg.id + '-' + i, name, league: lg.id, tier, strength });
    });
  });
  D.LEAGUE_BY_ID = {};
  D.LEAGUES.forEach(l => { D.LEAGUE_BY_ID[l.id] = l; });
  D.CLUB_BY_ID = {};
  D.CLUBS.forEach(c => { D.CLUB_BY_ID[c.id] = c; });

  D.COUNTRIES = [
    { id: 'Brasil', flag: '🇧🇷', home: ['bra-c', 'bra-b'] },
    { id: 'Argentina', flag: '🇦🇷', home: ['bra-c', 'arg'] },
    { id: 'Portugal', flag: '🇵🇹', home: ['bra-b', 'por'] },
    { id: 'Uruguai', flag: '🇺🇾', home: ['bra-c', 'arg'] },
    { id: 'Colômbia', flag: '🇨🇴', home: ['bra-c', 'bra-b'] },
  ];

  D.FIRST_NAMES = ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Pedro', 'Vinícius', 'Thiago', 'Caio', 'Diego', 'Bruno', 'Igor', 'Enzo', 'Davi', 'Kauã', 'Renan', 'Wesley'];
  D.NICKNAMES = ['Gabigol', 'Luquinha', 'Matheuzinho', 'Rafinha', 'Pedrinho', 'Vini', 'Thiaguinho', 'Caio Bala', 'Diegão', 'Bruninho', 'Igão', 'Enzinho', 'Davizinho', 'Kauãzinho', 'Renanzão', 'Wesleyzinho'];

  // Atributos: fin (finalização), pas (passe), dri (drible), fis (físico), men (mental)
  // Pesos para a nota geral (OVR) por posição.
  D.POS = {
    ATA: { name: 'Atacante', w: { fin: 0.35, dri: 0.25, fis: 0.15, men: 0.15, pas: 0.10 } },
    MEI: { name: 'Meia',     w: { pas: 0.35, dri: 0.25, men: 0.20, fin: 0.10, fis: 0.10 } },
  };
  D.ATTR_NAMES = { fin: 'Finalização', pas: 'Passe', dri: 'Drible', fis: 'Físico', men: 'Mental' };

  // Características. fx: multiplicadores e bônus aplicados na simulação.
  // goal/assist: multiplicador; attr: pontos imediatos; inj: risco de lesão; decl: declínio;
  // title: chance de título; fame: multiplicador de fama; rating: bônus na nota.
  D.TRAITS = [
    { id: 'colocado',  icon: '🎯', name: 'Chute Colocado',  desc: '+10% gols e +3 Finalização.',              fx: { goal: 0.10, attr: { fin: 3 } } },
    { id: 'parada',    icon: '🧱', name: 'Bola Parada',     desc: '+6% gols e +8% assistências.',             fx: { goal: 0.06, assist: 0.08 } },
    { id: 'velocista', icon: '⚡', name: 'Velocista',       desc: '+3 Drible e +3 Físico.',                   fx: { attr: { dri: 3, fis: 3 } } },
    { id: 'drible',    icon: '🌀', name: 'Drible Curto',    desc: '+4 Drible e +5% assistências.',            fx: { assist: 0.05, attr: { dri: 4 } } },
    { id: 'cabeceio',  icon: '🗣️', name: 'Cabeceio',        desc: '+8% gols (atacante) e +2 Físico.',         fx: { goalATA: 0.08, attr: { fis: 2 } } },
    { id: 'visao',     icon: '👁️', name: 'Visão de Jogo',   desc: '+15% assistências e +3 Passe.',            fx: { assist: 0.15, attr: { pas: 3 } } },
    { id: 'lider',     icon: '©️', name: 'Líder',           desc: '+8% chance de título e +3 Mental.',        fx: { title: 0.08, attr: { men: 3 } } },
    { id: 'raca',      icon: '🔥', name: 'Raça',            desc: 'Menos lesões, +5% chance de título.',      fx: { inj: -0.2, title: 0.05, attr: { fis: 2 } } },
    { id: 'pro',       icon: '🧘', name: 'Profissional',    desc: 'Lesões -35% e envelhece mais devagar.',    fx: { inj: -0.35, decl: -0.4 } },
    { id: 'marra',     icon: '😎', name: 'Marra',           desc: 'Fama +50%, mas atrai polêmicas.',          fx: { fame: 0.5, rating: 0.1 } },
    { id: 'frieza',    icon: '🧊', name: 'Frieza',          desc: 'Decide finais: +6% títulos, +5% gols.',    fx: { goal: 0.05, title: 0.06 } },
    { id: 'garcom',    icon: '🍽️', name: 'Garçom',          desc: '+25% assistências, -8% gols.',             fx: { assist: 0.25, goal: -0.08 } },
  ];
  D.TRAIT_BY_ID = {};
  D.TRAITS.forEach(t => { D.TRAIT_BY_ID[t.id] = t; });

  // Sinergias: ter as duas características ativa um bônus extra.
  D.SYNERGIES = [
    { id: 'falta',   a: 'colocado', b: 'parada',   icon: '🌟', name: 'Especialista em Falta', desc: '+15% gols e gols de falta nas manchetes.', fx: { goal: 0.15 } },
    { id: 'liso',    a: 'velocista', b: 'drible',  icon: '💨', name: 'Liso',                  desc: '+20% assistências e nota +0,2.',            fx: { assist: 0.2, rating: 0.2 } },
    { id: 'capitao', a: 'lider',    b: 'raca',     icon: '🎖️', name: 'Capitão',               desc: '+12% chance de título e mais fama.',        fx: { title: 0.12, fame: 0.25 } },
    { id: 'maestro', a: 'visao',    b: 'garcom',   icon: '🎼', name: 'Maestro',               desc: '+30% assistências.',                         fx: { assist: 0.3 } },
  ];

  root.CRAQUE_DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
