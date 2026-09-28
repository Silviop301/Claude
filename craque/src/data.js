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
    // Novos clubes sempre no FIM de cada lista: o id do clube (liga-índice) é o nome do arquivo do escudo.
    { id: 'bra-c', cup: 'Copa do Brasil', name: 'Série C', country: 'Brasil', flag: '🇧🇷', clubs: [['Figueirense', 1], ['Náutico', 1], ['Londrina', 1], ['Ypiranga-RS', 1], ['Confiança', 1], ['São Bernardo', 1], ['Paysandu', 1], ['Remo', 1], ['ABC', 1], ['Botafogo-SP', 1], ['Ituano', 1], ['Volta Redonda', 1]] },
    { id: 'bra-b', cup: 'Copa do Brasil', name: 'Série B', country: 'Brasil', flag: '🇧🇷', clubs: [['Coritiba', 2], ['Goiás', 2], ['Avaí', 2], ['Ponte Preta', 2], ['Guarani', 2], ['Vila Nova', 2], ['CRB', 2], ['Sport', 2], ['Ceará', 2], ['América-MG', 2], ['Chapecoense', 2], ['Novorizontino', 2], ['Operário-PR', 2]] },
    { id: 'bra-a', cup: 'Copa do Brasil', name: 'Brasileirão', country: 'Brasil', flag: '🇧🇷', clubs: [['Flamengo', 3], ['Palmeiras', 3], ['Atlético-MG', 3], ['São Paulo', 3], ['Corinthians', 3], ['Fluminense', 3], ['Botafogo', 3], ['Grêmio', 3], ['Internacional', 3], ['Cruzeiro', 3], ['Santos', 3], ['Bahia', 3], ['Fortaleza', 3], ['Vasco', 3], ['Athletico-PR', 3], ['Red Bull Bragantino', 3], ['Vitória', 3], ['Juventude', 3], ['Mirassol', 3]] },
    { id: 'arg', cup: 'Copa Argentina', name: 'Liga Argentina', country: 'Argentina', flag: '🇦🇷', clubs: [['River Plate', 3], ['Boca Juniors', 3], ['Racing', 3], ['Independiente', 3], ['San Lorenzo', 3], ['Vélez Sarsfield', 3], ['Estudiantes', 3], ['Talleres', 3], ['Rosario Central', 3], ['Lanús', 3], ['Huracán', 3], ["Newell's Old Boys", 3]] },
    { id: 'por', cup: 'Taça de Portugal', name: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹', clubs: [['Benfica', 4], ['Porto', 4], ['Sporting', 4], ['Braga', 3], ['Vitória de Guimarães', 3], ['Famalicão', 3], ['Gil Vicente', 3], ['Rio Ave', 3]] },
    { id: 'esp', cup: 'Copa do Rei', name: 'La Liga', country: 'Espanha', flag: '🇪🇸', clubs: [['Real Madrid', 5], ['Barcelona', 5], ['Atlético de Madrid', 4], ['Real Sociedad', 4], ['Sevilla', 4], ['Villarreal', 4], ['Athletic Bilbao', 4], ['Real Betis', 4], ['Valencia', 3], ['Celta de Vigo', 3], ['Osasuna', 3], ['Getafe', 3]] },
    { id: 'ing', cup: 'FA Cup', name: 'Premier League', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Manchester City', 5], ['Liverpool', 5], ['Arsenal', 5], ['Chelsea', 4], ['Manchester United', 4], ['Tottenham', 4], ['Newcastle', 4], ['Aston Villa', 4], ['Brighton', 4], ['West Ham', 4], ['Everton', 3], ['Crystal Palace', 3], ['Wolverhampton', 3], ['Fulham', 3]] },
    { id: 'ita', cup: 'Coppa Italia', name: 'Serie A', country: 'Itália', flag: '🇮🇹', clubs: [['Inter de Milão', 5], ['Juventus', 4], ['Milan', 4], ['Napoli', 4], ['Roma', 4], ['Atalanta', 4], ['Lazio', 4], ['Fiorentina', 3], ['Bologna', 3], ['Torino', 3], ['Genoa', 3]] },
    { id: 'ale', cup: 'Copa da Alemanha', name: 'Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Bayern de Munique', 5], ['Bayer Leverkusen', 4], ['Borussia Dortmund', 4], ['RB Leipzig', 4], ['Eintracht Frankfurt', 4], ['Stuttgart', 4], ['Wolfsburg', 3], ['Freiburg', 3], ['Werder Bremen', 3], ["Borussia M'gladbach", 3]] },
    { id: 'fra', cup: 'Copa da França', name: 'Ligue 1', country: 'França', flag: '🇫🇷', clubs: [['PSG', 5], ['Monaco', 4], ['Olympique de Marseille', 4], ['Lyon', 4], ['Lille', 4], ['Nice', 3], ['Lens', 3], ['Rennes', 3], ['Nantes', 3]] },
    { id: 'ara', cup: 'Copa do Rei Saudita', name: 'Saudi Pro League', country: 'Arábia', flag: '🇸🇦', wageMult: 4, clubs: [['Al-Hilal', 3], ['Al-Nassr', 3], ['Al-Ittihad', 3], ['Al-Ahli', 3]] },
    { id: 'usa', cup: 'US Open Cup', name: 'MLS', country: 'EUA', flag: '🇺🇸', wageMult: 2, clubs: [['Inter Miami', 3], ['LA Galaxy', 3], ['LAFC', 3], ['Seattle Sounders', 3], ['Atlanta United', 3]] },
    // Ligas novas (segundas divisões e países)
    { id: 'arg-b', cup: 'Copa Argentina', name: 'Primera Nacional', country: 'Argentina', flag: '🇦🇷', clubs: [['Banfield', 2], ['Gimnasia La Plata', 2], ['Tigre', 2], ['Platense', 2], ['Colón', 2], ['Quilmes', 2]] },
    { id: 'uru', cup: 'Copa AUF', name: 'Liga Uruguaia', country: 'Uruguai', flag: '🇺🇾', clubs: [['Peñarol', 3], ['Nacional', 3], ['Defensor Sporting', 2], ['Danubio', 2], ['Liverpool (URU)', 2], ['Montevideo Wanderers', 2], ['Cerro Largo', 1], ['River Plate (URU)', 1]] },
    { id: 'col', cup: 'Copa Colômbia', name: 'Liga Colombiana', country: 'Colômbia', flag: '🇨🇴', clubs: [['Atlético Nacional', 3], ['Millonarios', 3], ['América de Cali', 2], ['Junior', 2], ['Deportivo Cali', 2], ['Independiente Santa Fe', 2], ['Once Caldas', 1], ['Deportes Tolima', 1]] },
    { id: 'por-2', cup: 'Taça de Portugal', name: 'Liga Portugal 2', country: 'Portugal', flag: '🇵🇹', clubs: [['Boavista', 2], ['Marítimo', 2], ['Feirense', 2], ['Leixões', 2], ['Tondela', 2], ['Académica', 1]] },
    { id: 'esp-2', cup: 'Copa do Rei', name: 'LaLiga 2', country: 'Espanha', flag: '🇪🇸', clubs: [['Racing Santander', 2], ['Sporting Gijón', 2], ['Real Zaragoza', 2], ['Deportivo La Coruña', 2], ['Málaga', 2], ['Cádiz', 2]] },
    { id: 'ing-2', cup: 'FA Cup', name: 'Championship', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Leeds United', 2], ['Norwich City', 2], ['Middlesbrough', 2], ['Sheffield Wednesday', 2], ['Watford', 2], ['Stoke City', 2]] },
    { id: 'ita-2', cup: 'Coppa Italia', name: 'Serie B italiana', country: 'Itália', flag: '🇮🇹', clubs: [['Palermo', 2], ['Sampdoria', 2], ['Bari', 2], ['Spezia', 2], ['Brescia', 2]] },
    { id: 'ale-2', cup: 'Copa da Alemanha', name: '2. Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Hamburgo', 2], ['Schalke 04', 2], ['Hertha Berlin', 2], ['Kaiserslautern', 2], ['Nürnberg', 2]] },
    { id: 'fra-2', cup: 'Copa da França', name: 'Ligue 2', country: 'França', flag: '🇫🇷', clubs: [['Saint-Étienne', 2], ['Caen', 2], ['Metz', 2], ['Guingamp', 2], ['Bastia', 2]] },
    { id: 'ned', cup: 'Copa da Holanda', name: 'Eredivisie', country: 'Holanda', flag: '🇳🇱', clubs: [['Ajax', 4], ['PSV', 4], ['Feyenoord', 4], ['AZ Alkmaar', 3], ['Twente', 3], ['Utrecht', 3], ['Heerenveen', 2], ['Groningen', 2]] },
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

  // Países jogáveis: a base é sempre num clube do país escolhido (nas divisões mais baixas dele).
  D.COUNTRIES = [
    { id: 'Brasil', flag: '🇧🇷' }, { id: 'Argentina', flag: '🇦🇷' }, { id: 'Uruguai', flag: '🇺🇾' },
    { id: 'Colômbia', flag: '🇨🇴' }, { id: 'Portugal', flag: '🇵🇹' }, { id: 'Espanha', flag: '🇪🇸' },
    { id: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { id: 'Itália', flag: '🇮🇹' }, { id: 'Alemanha', flag: '🇩🇪' },
    { id: 'França', flag: '🇫🇷' }, { id: 'Holanda', flag: '🇳🇱' },
  ];
  D.countryOf = club => D.LEAGUE_BY_ID[club.league].country;

  D.FIRST_NAMES = ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Pedro', 'Vinícius', 'Thiago', 'Caio', 'Diego', 'Bruno', 'Igor', 'Enzo', 'Davi', 'Kauã', 'Renan', 'Wesley'];
  D.NICKNAMES = ['Gabigol', 'Luquinha', 'Matheuzinho', 'Rafinha', 'Pedrinho', 'Vini', 'Thiaguinho', 'Caio Bala', 'Diegão', 'Bruninho', 'Igão', 'Enzinho', 'Davizinho', 'Kauãzinho', 'Renanzão', 'Wesleyzinho'];

  // Atributos no padrão do FIFA/EA FC: rit (ritmo), fin (finalização), pas (passe), dri (drible), def (defesa), fis (físico)
  // Pesos para a nota geral (OVR) por posição.
  D.POS = {
    ATA: { name: 'Atacante', w: { fin: 0.30, rit: 0.20, dri: 0.20, fis: 0.12, pas: 0.12, def: 0.06 } },
    MEI: { name: 'Meia',     w: { pas: 0.32, dri: 0.22, fin: 0.14, rit: 0.12, def: 0.10, fis: 0.10 } },
  };
  D.ATTRS = ['rit', 'fin', 'pas', 'dri', 'def', 'fis'];
  D.ATTR_NAMES = { rit: 'Ritmo', fin: 'Finalização', pas: 'Passe', dri: 'Drible', def: 'Defesa', fis: 'Físico' };

  // Características. fx: multiplicadores e bônus aplicados na simulação.
  // goal/assist: multiplicador; attr: pontos imediatos; inj: risco de lesão; decl: declínio;
  // title: chance de título; fame: multiplicador de fama; rating: bônus na nota.
  D.TRAITS = [
    { id: 'colocado',  icon: '🎯', name: 'Chute Colocado',  desc: '+10% gols e +3 Finalização.',              fx: { goal: 0.10, attr: { fin: 3 } } },
    { id: 'parada',    icon: '🧱', name: 'Bola Parada',     desc: '+6% gols e +8% assistências.',             fx: { goal: 0.06, assist: 0.08 } },
    { id: 'velocista', icon: '⚡', name: 'Velocista',       desc: '+4 Ritmo e +2 Drible.',                    fx: { attr: { rit: 4, dri: 2 } } },
    { id: 'drible',    icon: '🌀', name: 'Drible Curto',    desc: '+4 Drible e +5% assistências.',            fx: { assist: 0.05, attr: { dri: 4 } } },
    { id: 'cabeceio',  icon: '🗣️', name: 'Cabeceio',        desc: '+8% gols (atacante) e +2 Físico.',         fx: { goalATA: 0.08, attr: { fis: 2 } } },
    { id: 'visao',     icon: '👁️', name: 'Visão de Jogo',   desc: '+15% assistências e +3 Passe.',            fx: { assist: 0.15, attr: { pas: 3 } } },
    { id: 'lider',     icon: '©️', name: 'Líder',           desc: '+8% chance de título, +2 Passe e +2 Defesa.', fx: { title: 0.08, attr: { pas: 2, def: 2 } } },
    { id: 'raca',      icon: '🔥', name: 'Raça',            desc: 'Menos lesões, +5% títulos, +2 Físico e Defesa.', fx: { inj: -0.2, title: 0.05, attr: { fis: 2, def: 2 } } },
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
