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
    { id: 'bra-c', cup: 'Copa do Brasil', name: 'Série C', country: 'Brasil', flag: '🇧🇷', clubs: [['Figueirense', 1], ['Náutico', 1], ['Londrina', 1], ['Ypiranga-RS', 1], ['Confiança', 1], ['São Bernardo', 1], ['Paysandu', 1], ['Remo', 1], ['ABC', 1], ['Botafogo-SP', 1], ['Ituano', 1], ['Volta Redonda', 1], ['Brusque', 1], ['Tombense', 1], ['Caxias', 1], ['Botafogo-PB', 1], ['Ferroviária', 1], ['Amazonas', 1], ['Athletic-MG', 1]] },
    { id: 'bra-b', cup: 'Copa do Brasil', name: 'Série B', country: 'Brasil', flag: '🇧🇷', clubs: [['Coritiba', 2], ['Goiás', 2], ['Avaí', 2], ['Ponte Preta', 2], ['Guarani', 2], ['Vila Nova', 2], ['CRB', 2], ['Sport', 2], ['Ceará', 2], ['América-MG', 2], ['Chapecoense', 2], ['Novorizontino', 2], ['Operário-PR', 2], ['Criciúma', 2], ['Cuiabá', 2], ['Atlético-GO', 2], ['Santa Cruz', 2]] },
    { id: 'bra-a', cup: 'Copa do Brasil', name: 'Brasileirão', country: 'Brasil', flag: '🇧🇷', clubs: [['Flamengo', 3], ['Palmeiras', 3], ['Atlético-MG', 3], ['São Paulo', 3], ['Corinthians', 3], ['Fluminense', 3], ['Botafogo', 3], ['Grêmio', 3], ['Internacional', 3], ['Cruzeiro', 3], ['Santos', 3], ['Bahia', 3], ['Fortaleza', 3], ['Vasco', 3], ['Athletico-PR', 3], ['Red Bull Bragantino', 3], ['Vitória', 3], ['Juventude', 3], ['Mirassol', 3]] },
    { id: 'arg', cup: 'Copa Argentina', name: 'Liga Argentina', country: 'Argentina', flag: '🇦🇷', clubs: [['River Plate', 3], ['Boca Juniors', 3], ['Racing', 3], ['Independiente', 3], ['San Lorenzo', 3], ['Vélez Sarsfield', 3], ['Estudiantes', 3], ['Talleres', 3], ['Rosario Central', 3], ['Lanús', 3], ['Huracán', 3], ["Newell's Old Boys", 3], ['Argentinos Juniors', 3], ['Godoy Cruz', 3], ['Belgrano', 3], ['Unión', 3]] },
    { id: 'por', cup: 'Taça de Portugal', name: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹', clubs: [['Benfica', 4], ['Porto', 4], ['Sporting', 4], ['Braga', 3], ['Vitória de Guimarães', 3], ['Famalicão', 3], ['Gil Vicente', 3], ['Rio Ave', 3], ['Estoril', 3], ['Moreirense', 3], ['Casa Pia', 3], ['Arouca', 3]] },
    { id: 'esp', cup: 'Copa do Rei', name: 'La Liga', country: 'Espanha', flag: '🇪🇸', clubs: [['Real Madrid', 5], ['Barcelona', 5], ['Atlético de Madrid', 4], ['Real Sociedad', 4], ['Sevilla', 4], ['Villarreal', 4], ['Athletic Bilbao', 4], ['Real Betis', 4], ['Valencia', 3], ['Celta de Vigo', 3], ['Osasuna', 3], ['Getafe', 3], ['Mallorca', 3], ['Rayo Vallecano', 3], ['Girona', 3], ['Alavés', 3], ['Las Palmas', 3], ['Espanyol', 3]] },
    { id: 'ing', cup: 'FA Cup', name: 'Premier League', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Manchester City', 5], ['Liverpool', 5], ['Arsenal', 5], ['Chelsea', 4], ['Manchester United', 4], ['Tottenham', 4], ['Newcastle', 4], ['Aston Villa', 4], ['Brighton', 4], ['West Ham', 4], ['Everton', 3], ['Crystal Palace', 3], ['Wolverhampton', 3], ['Fulham', 3], ['Brentford', 3], ['Nottingham Forest', 3], ['Bournemouth', 3], ['Leicester City', 3]] },
    { id: 'ita', cup: 'Coppa Italia', name: 'Serie A', country: 'Itália', flag: '🇮🇹', clubs: [['Inter de Milão', 5], ['Juventus', 4], ['Milan', 4], ['Napoli', 4], ['Roma', 4], ['Atalanta', 4], ['Lazio', 4], ['Fiorentina', 3], ['Bologna', 3], ['Torino', 3], ['Genoa', 3], ['Udinese', 3], ['Sassuolo', 3], ['Cagliari', 3], ['Verona', 3], ['Lecce', 3]] },
    { id: 'ale', cup: 'Copa da Alemanha', name: 'Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Bayern de Munique', 5], ['Bayer Leverkusen', 4], ['Borussia Dortmund', 4], ['RB Leipzig', 4], ['Eintracht Frankfurt', 4], ['Stuttgart', 4], ['Wolfsburg', 3], ['Freiburg', 3], ['Werder Bremen', 3], ["Borussia M'gladbach", 3], ['Mainz', 3], ['Augsburg', 3], ['Hoffenheim', 3], ['Union Berlin', 3], ['Köln', 3]] },
    { id: 'fra', cup: 'Copa da França', name: 'Ligue 1', country: 'França', flag: '🇫🇷', clubs: [['PSG', 5], ['Monaco', 4], ['Olympique de Marseille', 4], ['Lyon', 4], ['Lille', 4], ['Nice', 3], ['Lens', 3], ['Rennes', 3], ['Nantes', 3], ['Toulouse', 3], ['Strasbourg', 3], ['Montpellier', 3], ['Reims', 3]] },
    { id: 'ara', cup: 'Copa do Rei Saudita', name: 'Saudi Pro League', country: 'Arábia', flag: '🇸🇦', wageMult: 4, clubs: [['Al-Hilal', 3], ['Al-Nassr', 3], ['Al-Ittihad', 3], ['Al-Ahli', 3], ['Al-Shabab', 3], ['Al-Ettifaq', 3], ['Al-Taawoun', 3]] },
    { id: 'usa', cup: 'US Open Cup', name: 'MLS', country: 'EUA', flag: '🇺🇸', wageMult: 2, clubs: [['Inter Miami', 3], ['LA Galaxy', 3], ['LAFC', 3], ['Seattle Sounders', 3], ['Atlanta United', 3], ['New York City', 3], ['Columbus Crew', 3], ['Orlando City', 3], ['Toronto FC', 3]] },
    // Ligas novas (segundas divisões e países)
    { id: 'arg-b', cup: 'Copa Argentina', name: 'Primera Nacional', country: 'Argentina', flag: '🇦🇷', clubs: [['Banfield', 2], ['Gimnasia La Plata', 2], ['Tigre', 2], ['Platense', 2], ['Colón', 2], ['Quilmes', 2], ['Chacarita Juniors', 2], ['Ferro Carril Oeste', 2], ['Arsenal de Sarandí', 2]] },
    { id: 'uru', cup: 'Copa AUF', name: 'Liga Uruguaia', country: 'Uruguai', flag: '🇺🇾', clubs: [['Peñarol', 3], ['Nacional', 3], ['Defensor Sporting', 2], ['Danubio', 2], ['Liverpool (URU)', 2], ['Montevideo Wanderers', 2], ['Cerro Largo', 1], ['River Plate (URU)', 1]] },
    { id: 'col', cup: 'Copa Colômbia', name: 'Liga Colombiana', country: 'Colômbia', flag: '🇨🇴', clubs: [['Atlético Nacional', 3], ['Millonarios', 3], ['América de Cali', 2], ['Junior', 2], ['Deportivo Cali', 2], ['Independiente Santa Fe', 2], ['Once Caldas', 1], ['Deportes Tolima', 1]] },
    { id: 'por-2', cup: 'Taça de Portugal', name: 'Liga Portugal 2', country: 'Portugal', flag: '🇵🇹', clubs: [['Boavista', 2], ['Marítimo', 2], ['Feirense', 2], ['Leixões', 2], ['Tondela', 2], ['Académica', 1], ['Penafiel', 1], ['Oliveirense', 1], ['Paços de Ferreira', 2]] },
    { id: 'esp-2', cup: 'Copa do Rei', name: 'LaLiga 2', country: 'Espanha', flag: '🇪🇸', clubs: [['Racing Santander', 2], ['Sporting Gijón', 2], ['Real Zaragoza', 2], ['Deportivo La Coruña', 2], ['Málaga', 2], ['Cádiz', 2], ['Eibar', 2], ['Elche', 2], ['Levante', 2], ['Almería', 2]] },
    { id: 'ing-2', cup: 'FA Cup', name: 'Championship', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Leeds United', 2], ['Norwich City', 2], ['Middlesbrough', 2], ['Sheffield Wednesday', 2], ['Watford', 2], ['Stoke City', 2], ['Sunderland', 2], ['Burnley', 2], ['Coventry City', 2], ['Southampton', 2], ['West Brom', 2]] },
    { id: 'ita-2', cup: 'Coppa Italia', name: 'Serie B italiana', country: 'Itália', flag: '🇮🇹', clubs: [['Palermo', 2], ['Sampdoria', 2], ['Bari', 2], ['Spezia', 2], ['Brescia', 2], ['Cremonese', 2], ['Salernitana', 2], ['Pisa', 2], ['Catanzaro', 2]] },
    { id: 'ale-2', cup: 'Copa da Alemanha', name: '2. Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Hamburgo', 2], ['Schalke 04', 2], ['Hertha Berlin', 2], ['Kaiserslautern', 2], ['Nürnberg', 2], ['Hannover 96', 2], ['Fortuna Düsseldorf', 2], ['Karlsruher SC', 2], ['Paderborn', 2]] },
    { id: 'fra-2', cup: 'Copa da França', name: 'Ligue 2', country: 'França', flag: '🇫🇷', clubs: [['Saint-Étienne', 2], ['Caen', 2], ['Metz', 2], ['Guingamp', 2], ['Bastia', 2], ['Bordeaux', 2], ['Auxerre', 2], ['Ajaccio', 2], ['Grenoble', 2]] },
    { id: 'ned', cup: 'Copa da Holanda', name: 'Eredivisie', country: 'Holanda', flag: '🇳🇱', clubs: [['Ajax', 4], ['PSV', 4], ['Feyenoord', 4], ['AZ Alkmaar', 3], ['Twente', 3], ['Utrecht', 3], ['Heerenveen', 2], ['Groningen', 2], ['Sparta Rotterdam', 2], ['Vitesse', 2], ['NEC', 2]] },
    { id: 'tur', cup: 'Copa da Turquia', name: 'Süper Lig', country: 'Turquia', flag: '🇹🇷', clubs: [['Galatasaray', 4], ['Fenerbahçe', 4], ['Beşiktaş', 3], ['Trabzonspor', 3], ['Başakşehir', 3], ['Konyaspor', 2], ['Antalyaspor', 2], ['Kasımpaşa', 2]] },
    { id: 'mex', cup: 'Copa MX', name: 'Liga MX', country: 'México', flag: '🇲🇽', wageMult: 1.3, clubs: [['Club América', 3], ['Chivas', 3], ['Tigres', 3], ['Monterrey', 3], ['Cruz Azul', 3], ['Pumas', 3], ['Toluca', 2], ['Santos Laguna', 2]] },
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
  // Acesso e rebaixamento entre divisões do mesmo país (a tabela considera 20 times).
  // promo: quantos sobem · releg: quantos caem
  D.LADDER = {
    'bra-c': { up: 'bra-b', promo: 4 },
    'bra-b': { up: 'bra-a', promo: 4, down: 'bra-c', releg: 4 },
    'bra-a': { down: 'bra-b', releg: 4 },
    'arg-b': { up: 'arg', promo: 2 }, arg: { down: 'arg-b', releg: 2 },
    'por-2': { up: 'por', promo: 2 }, por: { down: 'por-2', releg: 2 },
    'esp-2': { up: 'esp', promo: 3 }, esp: { down: 'esp-2', releg: 3 },
    'ing-2': { up: 'ing', promo: 3 }, ing: { down: 'ing-2', releg: 3 },
    'ita-2': { up: 'ita', promo: 3 }, ita: { down: 'ita-2', releg: 3 },
    'ale-2': { up: 'ale', promo: 2 }, ale: { down: 'ale-2', releg: 2 },
    'fra-2': { up: 'fra', promo: 2 }, fra: { down: 'fra-2', releg: 2 },
  };
  // Seleções da Copa do Mundo (força 70–89). As 11 primeiras são os países jogáveis.
  D.NATIONS = [
    ['Brasil', '🇧🇷', 88], ['Argentina', '🇦🇷', 88], ['Uruguai', '🇺🇾', 80], ['Colômbia', '🇨🇴', 79],
    ['Portugal', '🇵🇹', 85], ['Espanha', '🇪🇸', 87], ['Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 86], ['Itália', '🇮🇹', 83],
    ['Alemanha', '🇩🇪', 85], ['França', '🇫🇷', 89], ['Holanda', '🇳🇱', 83],
    ['Bélgica', '🇧🇪', 82], ['Croácia', '🇭🇷', 81], ['Marrocos', '🇲🇦', 79], ['Suíça', '🇨🇭', 78], ['Dinamarca', '🇩🇰', 78],
    ['Japão', '🇯🇵', 77], ['EUA', '🇺🇸', 77], ['México', '🇲🇽', 77], ['Equador', '🇪🇨', 76], ['Senegal', '🇸🇳', 76],
    ['Sérvia', '🇷🇸', 76], ['Polônia', '🇵🇱', 76], ['Coreia do Sul', '🇰🇷', 75], ['Nigéria', '🇳🇬', 74],
    ['Austrália', '🇦🇺', 72], ['Canadá', '🇨🇦', 72], ['Camarões', '🇨🇲', 72], ['Gana', '🇬🇭', 72], ['Irã', '🇮🇷', 72],
    ['Tunísia', '🇹🇳', 71], ['Arábia Saudita', '🇸🇦', 70],
  ].map(([name, flag, str]) => ({ name, flag, str }));
  D.NATION_BY_NAME = {};
  D.NATIONS.forEach(n => { D.NATION_BY_NAME[n.name] = n; });

  // Clubes com nome feminino: "a Juventus", "contra a Ponte Preta", "na Roma"
  const FEM = new Set(['Juventus', 'Roma', 'Lazio', 'Fiorentina', 'Atalanta', 'Sampdoria', 'Inter de Milão', 'Real Sociedad',
    'Ponte Preta', 'Chapecoense', 'Portuguesa', 'Académica', 'Udinese', 'Salernitana', 'Cremonese', 'Reggina', 'Spal',
    'Real Sociedad B', 'Ferroviária', 'Tuna Luso', 'Juventus B']);
  const g = (n, m, f) => (FEM.has(n) ? f : m) + ' ' + n;
  D.fem = n => FEM.has(n);
  D.o = n => g(n, 'o', 'a');
  D.O = n => g(n, 'O', 'A');
  D.do = n => g(n, 'do', 'da');
  D.no = n => g(n, 'no', 'na');
  D.pelo = n => g(n, 'pelo', 'pela');
  D.ao = n => g(n, 'ao', 'à');

  // Artigos: "o Brasileirão", "a Premier League"
  const MASC = ['Brasileirão', 'Championship'];
  D.da = n => (MASC.includes(n) ? 'do ' : 'da ') + n;
  D.na = n => (MASC.includes(n) ? 'no ' : 'na ') + n;
  D.paraA = n => (MASC.includes(n) ? 'para o ' : 'para a ') + n;

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
  // Características: cada uma soma pontos nos atributos da carta (nível 2 e 3 somam mais).
  D.TRAITS = [
    { id: 'colocado',  icon: '🎯', name: 'Chute Colocado', attr: { fin: 4, dri: 1 } },
    { id: 'parada',    icon: '🧱', name: 'Bola Parada',    attr: { fin: 2, pas: 3 } },
    { id: 'velocista', icon: '⚡', name: 'Velocista',      attr: { rit: 5 } },
    { id: 'drible',    icon: '🌀', name: 'Drible Curto',   attr: { dri: 4, rit: 1 } },
    { id: 'cabeceio',  icon: '🗣️', name: 'Cabeceio',       attr: { fin: 2, fis: 3 } },
    { id: 'visao',     icon: '👁️', name: 'Visão de Jogo',  attr: { pas: 5 } },
    { id: 'lider',     icon: '©️', name: 'Líder',          attr: { pas: 2, def: 2, fis: 1 } },
    { id: 'raca',      icon: '🔥', name: 'Raça',           attr: { def: 3, fis: 2 } },
    { id: 'pro',       icon: '🧘', name: 'Profissional',   attr: { fis: 3 }, perk: 'Perde menos atributos depois dos 30' },
    { id: 'tecnica',   icon: '🪄', name: 'Técnica',        attr: { dri: 3, pas: 2 } },
    { id: 'frieza',    icon: '🧊', name: 'Frieza',         attr: { fin: 3, dri: 2 } },
    { id: 'garcom',    icon: '🍽️', name: 'Garçom',         attr: { pas: 6, fin: -1 } },
  ];
  D.TRAIT_BY_ID = {};
  D.TRAITS.forEach(t => { D.TRAIT_BY_ID[t.id] = t; });
  // Multiplicador por nível: Nv1 = 1x, Nv2 = 1.8x, Nv3 = 2.6x
  D.TRAIT_LV = [0, 1, 1.8, 2.6];

  // Sinergias: ter as duas características dá pontos extras.
  D.SYNERGIES = [
    { id: 'falta',   a: 'colocado', b: 'parada',   icon: '🌟', name: 'Especialista em Falta', attr: { fin: 3, pas: 2 }, extra: 'Gols de falta nas manchetes' },
    { id: 'liso',    a: 'velocista', b: 'drible',  icon: '💨', name: 'Liso',                  attr: { rit: 3, dri: 3 } },
    { id: 'capitao', a: 'lider',    b: 'raca',     icon: '🎖️', name: 'Capitão',               attr: { def: 3, fis: 2, pas: 1 } },
    { id: 'maestro', a: 'visao',    b: 'garcom',   icon: '🎼', name: 'Maestro',               attr: { pas: 4, dri: 2 } },
  ];
  // Investimentos com o próprio dinheiro: cada compra soma pontos fixos na carta.
  // O preço sobe a cada compra (de qualquer item).
  D.INVEST = [
    { id: 'fis',   icon: '🏋️', name: 'Personal trainer',         attr: { fis: 2 } },
    { id: 'fin',   icon: '🥅', name: 'Treino de chute',    attr: { fin: 2 } },
    { id: 'pas',   icon: '📊', name: 'Analista de jogo',   attr: { pas: 2 } },
    { id: 'rit',   icon: '🏃', name: 'Treino de sprint', attr: { rit: 2 } },
    { id: 'dri',   icon: '🪄', name: 'Treino de técnica',     attr: { dri: 2 } },
    { id: 'def',   icon: '🛡️', name: 'Treino defensivo',         attr: { def: 2 } },
    { id: 'fisio', icon: '🩺', name: 'Fisioterapeuta', perk: '−25% lesões', max: 2 },
  ];
  D.INVEST_BY_ID = {};
  D.INVEST.forEach(t => { D.INVEST_BY_ID[t.id] = t; });
  D.INVEST_MAX = 5; // compras por item de atributo (+10 no máximo)
  D.ATTR_LABEL = { rit: 'RIT', fin: 'FIN', pas: 'PAS', dri: 'DRI', def: 'DEF', fis: 'FÍS' };

  root.CRAQUE_DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
