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
    { id: 'bra-b', cup: 'Copa do Brasil', name: 'Série B', country: 'Brasil', flag: '🇧🇷', clubs: [['Coritiba', 2], ['Goiás', 2], ['Avaí', 2], ['Ponte Preta', 2], ['Guarani', 2], ['Vila Nova', 2], ['CRB', 2], ['Sport', 2], ['Ceará', 2], ['América-MG', 2], ['Chapecoense', 2], ['Novorizontino', 2], ['Operário-PR', 2], ['Criciúma', 2], ['Cuiabá', 2], ['Atlético-GO', 2], ['Santa Cruz', 2], ['Paraná', 2], ['Portuguesa', 2], ['CSA', 2]] },
    { id: 'bra-a', cup: 'Copa do Brasil', name: 'Brasileirão', country: 'Brasil', flag: '🇧🇷', clubs: [['Flamengo', 3], ['Palmeiras', 3], ['Atlético-MG', 3], ['São Paulo', 3], ['Corinthians', 3], ['Fluminense', 3], ['Botafogo', 3], ['Grêmio', 3], ['Internacional', 3], ['Cruzeiro', 3], ['Santos', 3], ['Bahia', 3], ['Fortaleza', 3], ['Vasco', 3], ['Athletico-PR', 3], ['Red Bull Bragantino', 3], ['Vitória', 3], ['Juventude', 3], ['Mirassol', 3]] },
    { id: 'arg', cup: 'Copa Argentina', name: 'Liga Argentina', country: 'Argentina', flag: '🇦🇷', clubs: [['River Plate', 3], ['Boca Juniors', 3], ['Racing', 3], ['Independiente', 3], ['San Lorenzo', 3], ['Vélez Sarsfield', 3], ['Estudiantes', 3], ['Talleres', 3], ['Rosario Central', 3], ['Lanús', 3], ['Huracán', 3], ["Newell's Old Boys", 3], ['Argentinos Juniors', 3], ['Godoy Cruz', 3], ['Belgrano', 3], ['Unión', 3], ['Barracas Central', 3], ['Defensa y Justicia', 3], ['Instituto', 3], ['Sarmiento', 3]] },
    { id: 'por', cup: 'Taça de Portugal', name: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹', clubs: [['Benfica', 4], ['Porto', 4], ['Sporting', 4], ['Braga', 3], ['Vitória de Guimarães', 3], ['Famalicão', 3], ['Gil Vicente', 3], ['Rio Ave', 3], ['Estoril', 3], ['Moreirense', 3], ['Casa Pia', 3], ['Arouca', 3], ['Santa Clara', 3], ['Estrela da Amadora', 3], ['Nacional da Madeira', 3], ['AVS', 3], ['Alverca', 3]] },
    { id: 'esp', cup: 'Copa do Rei', name: 'La Liga', country: 'Espanha', flag: '🇪🇸', clubs: [['Real Madrid', 5], ['Barcelona', 5], ['Atlético de Madrid', 4], ['Real Sociedad', 4], ['Sevilla', 4], ['Villarreal', 4], ['Athletic Bilbao', 4], ['Real Betis', 4], ['Valencia', 3], ['Celta de Vigo', 3], ['Osasuna', 3], ['Getafe', 3], ['Mallorca', 3], ['Rayo Vallecano', 3], ['Girona', 3], ['Alavés', 3], ['Las Palmas', 3], ['Espanyol', 3], ['Real Valladolid', 3], ['Leganés', 3]] },
    { id: 'ing', cup: 'FA Cup', name: 'Premier League', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Manchester City', 5], ['Liverpool', 5], ['Arsenal', 5], ['Chelsea', 4], ['Manchester United', 4], ['Tottenham', 4], ['Newcastle', 4], ['Aston Villa', 4], ['Brighton', 4], ['West Ham', 4], ['Everton', 3], ['Crystal Palace', 3], ['Wolverhampton', 3], ['Fulham', 3], ['Brentford', 3], ['Nottingham Forest', 3], ['Bournemouth', 3], ['Leicester City', 3], ['Ipswich Town', 3]] },
    { id: 'ita', cup: 'Coppa Italia', name: 'Serie A', country: 'Itália', flag: '🇮🇹', clubs: [['Inter de Milão', 5], ['Juventus', 4], ['Milan', 4], ['Napoli', 4], ['Roma', 4], ['Atalanta', 4], ['Lazio', 4], ['Fiorentina', 3], ['Bologna', 3], ['Torino', 3], ['Genoa', 3], ['Udinese', 3], ['Sassuolo', 3], ['Cagliari', 3], ['Verona', 3], ['Lecce', 3], ['Parma', 3], ['Como', 3], ['Empoli', 3], ['Monza', 3]] },
    { id: 'ale', cup: 'Copa da Alemanha', name: 'Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Bayern de Munique', 5], ['Bayer Leverkusen', 4], ['Borussia Dortmund', 4], ['RB Leipzig', 4], ['Eintracht Frankfurt', 4], ['Stuttgart', 4], ['Wolfsburg', 3], ['Freiburg', 3], ['Werder Bremen', 3], ["Borussia M'gladbach", 3], ['Mainz', 3], ['Augsburg', 3], ['Hoffenheim', 3], ['Union Berlin', 3], ['Köln', 3], ['Heidenheim', 3], ['St. Pauli', 3], ['Holstein Kiel', 3]] },
    { id: 'fra', cup: 'Copa da França', name: 'Ligue 1', country: 'França', flag: '🇫🇷', clubs: [['PSG', 5], ['Monaco', 4], ['Olympique de Marseille', 4], ['Lyon', 4], ['Lille', 4], ['Nice', 3], ['Lens', 3], ['Rennes', 3], ['Nantes', 3], ['Toulouse', 3], ['Strasbourg', 3], ['Montpellier', 3], ['Reims', 3], ['Brest', 3], ['Le Havre', 3], ['Angers', 3], ['Lorient', 3], ['Paris FC', 3]] },
    { id: 'ara', cup: 'Copa do Rei Saudita', name: 'Saudi Pro League', country: 'Arábia', flag: '🇸🇦', wageMult: 4, clubs: [['Al-Hilal', 3], ['Al-Nassr', 3], ['Al-Ittihad', 3], ['Al-Ahli', 3], ['Al-Shabab', 3], ['Al-Ettifaq', 3], ['Al-Taawoun', 3], ['Al-Qadsiah', 3], ['Al-Fateh', 3], ['Al-Fayha', 3], ['Al-Khaleej', 3], ['Damac', 3]] },
    { id: 'usa', cup: 'US Open Cup', name: 'MLS', country: 'EUA', flag: '🇺🇸', wageMult: 2, clubs: [['Inter Miami', 3], ['LA Galaxy', 3], ['LAFC', 3], ['Seattle Sounders', 3], ['Atlanta United', 3], ['New York City', 3], ['Columbus Crew', 3], ['Orlando City', 3], ['Toronto FC', 3], ['Philadelphia Union', 3], ['Portland Timbers', 3], ['FC Cincinnati', 3], ['Nashville SC', 3], ['New York Red Bulls', 3], ['Real Salt Lake', 3], ['Austin FC', 3], ['Charlotte FC', 3], ['Vancouver Whitecaps', 3], ['Chicago Fire', 3], ['San Diego FC', 3]] },
    // Ligas novas (segundas divisões e países)
    { id: 'arg-b', cup: 'Copa Argentina', name: 'Primera Nacional', country: 'Argentina', flag: '🇦🇷', clubs: [['Banfield', 2], ['Gimnasia La Plata', 2], ['Tigre', 2], ['Platense', 2], ['Colón', 2], ['Quilmes', 2], ['Chacarita Juniors', 2], ['Ferro Carril Oeste', 2], ['Arsenal de Sarandí', 2], ['Almirante Brown', 2], ['Atlanta', 2], ['Deportivo Morón', 2], ['San Martín de Tucumán', 2], ['All Boys', 2], ['Nueva Chicago', 2]] },
    { id: 'uru', cup: 'Copa AUF', name: 'Liga Uruguaia', country: 'Uruguai', flag: '🇺🇾', clubs: [['Peñarol', 3], ['Nacional', 3], ['Defensor Sporting', 2], ['Danubio', 2], ['Liverpool (URU)', 2], ['Montevideo Wanderers', 2], ['Cerro Largo', 1], ['River Plate (URU)', 1], ['Boston River', 2], ['Racing (URU)', 1], ['Plaza Colonia', 1], ['Cerro', 1], ['Progreso', 1], ['Fénix', 1]] },
    { id: 'col', cup: 'Copa Colômbia', name: 'Liga Colombiana', country: 'Colômbia', flag: '🇨🇴', clubs: [['Atlético Nacional', 3], ['Millonarios', 3], ['América de Cali', 2], ['Junior', 2], ['Deportivo Cali', 2], ['Independiente Santa Fe', 2], ['Once Caldas', 1], ['Deportes Tolima', 1], ['Independiente Medellín', 2], ['Atlético Bucaramanga', 2], ['Deportivo Pereira', 1], ['Águilas Doradas', 1], ['La Equidad', 1], ['Envigado', 1]] },
    { id: 'por-2', cup: 'Taça de Portugal', name: 'Liga Portugal 2', country: 'Portugal', flag: '🇵🇹', clubs: [['Boavista', 2], ['Marítimo', 2], ['Feirense', 2], ['Leixões', 2], ['Tondela', 2], ['Académica', 1], ['Penafiel', 1], ['Oliveirense', 1], ['Paços de Ferreira', 2], ['Chaves', 2], ['Vizela', 2], ['Portimonense', 2], ['Farense', 2], ['Torreense', 2], ['União de Leiria', 1], ['Felgueiras', 1]] },
    { id: 'esp-2', cup: 'Copa do Rei', name: 'LaLiga 2', country: 'Espanha', flag: '🇪🇸', clubs: [['Racing Santander', 2], ['Sporting Gijón', 2], ['Real Zaragoza', 2], ['Deportivo La Coruña', 2], ['Málaga', 2], ['Cádiz', 2], ['Eibar', 2], ['Elche', 2], ['Levante', 2], ['Almería', 2], ['Real Oviedo', 2], ['Granada', 2], ['Tenerife', 2], ['Huesca', 2], ['Mirandés', 2], ['Albacete', 2], ['Burgos', 2], ['Córdoba', 2]] },
    { id: 'ing-2', cup: 'FA Cup', name: 'Championship', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Leeds United', 2], ['Norwich City', 2], ['Middlesbrough', 2], ['Sheffield Wednesday', 2], ['Watford', 2], ['Stoke City', 2], ['Sunderland', 2], ['Burnley', 2], ['Coventry City', 2], ['Southampton', 2], ['West Brom', 2], ['Sheffield United', 2], ['Hull City', 2], ['Blackburn Rovers', 2], ['Preston North End', 2], ['Bristol City', 2], ['Queens Park Rangers', 2], ['Millwall', 2], ['Swansea City', 2], ['Cardiff City', 2], ['Derby County', 2], ['Luton Town', 2], ['Portsmouth', 2], ['Plymouth Argyle', 1]] },
    { id: 'ita-2', cup: 'Coppa Italia', name: 'Serie B italiana', country: 'Itália', flag: '🇮🇹', clubs: [['Palermo', 2], ['Sampdoria', 2], ['Bari', 2], ['Spezia', 2], ['Brescia', 2], ['Cremonese', 2], ['Salernitana', 2], ['Pisa', 2], ['Catanzaro', 2], ['Venezia', 2], ['Frosinone', 2], ['Modena', 2], ['Reggiana', 2], ['Cesena', 2], ['Südtirol', 1], ['Carrarese', 1], ['Mantova', 1], ['Juve Stabia', 1]] },
    { id: 'ale-2', cup: 'Copa da Alemanha', name: '2. Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Hamburgo', 2], ['Schalke 04', 2], ['Hertha Berlin', 2], ['Kaiserslautern', 2], ['Nürnberg', 2], ['Hannover 96', 2], ['Fortuna Düsseldorf', 2], ['Karlsruher SC', 2], ['Paderborn', 2], ['Darmstadt', 2], ['Greuther Fürth', 2], ['Magdeburg', 2], ['Elversberg', 2], ['Bochum', 2], ['Arminia Bielefeld', 2], ['Preußen Münster', 1], ['Eintracht Braunschweig', 1]] },
    { id: 'fra-2', cup: 'Copa da França', name: 'Ligue 2', country: 'França', flag: '🇫🇷', clubs: [['Saint-Étienne', 2], ['Caen', 2], ['Metz', 2], ['Guingamp', 2], ['Bastia', 2], ['Bordeaux', 2], ['Auxerre', 2], ['Ajaccio', 2], ['Grenoble', 2], ['Troyes', 2], ['Clermont', 2], ['Amiens', 2], ['Pau', 1], ['Rodez', 1], ['Laval', 1], ['Dunkerque', 1], ['Red Star', 1]] },
    { id: 'ned', cup: 'Copa da Holanda', name: 'Eredivisie', country: 'Holanda', flag: '🇳🇱', clubs: [['Ajax', 4], ['PSV', 4], ['Feyenoord', 4], ['AZ Alkmaar', 3], ['Twente', 3], ['Utrecht', 3], ['Heerenveen', 2], ['Groningen', 2], ['Sparta Rotterdam', 2], ['Vitesse', 2], ['NEC', 2], ['Go Ahead Eagles', 2], ['Fortuna Sittard', 2], ['NAC Breda', 2], ['PEC Zwolle', 2], ['Heracles', 2], ['Willem II', 2]] },
    { id: 'tur', cup: 'Copa da Turquia', name: 'Süper Lig', country: 'Turquia', flag: '🇹🇷', clubs: [['Galatasaray', 4], ['Fenerbahçe', 4], ['Beşiktaş', 3], ['Trabzonspor', 3], ['Başakşehir', 3], ['Konyaspor', 2], ['Antalyaspor', 2], ['Kasımpaşa', 2], ['Alanyaspor', 2], ['Samsunspor', 2], ['Sivasspor', 2], ['Kayserispor', 2], ['Göztepe', 2], ['Rizespor', 2], ['Gaziantep', 2], ['Eyüpspor', 2]] },
    { id: 'mex', cup: 'Copa MX', name: 'Liga MX', country: 'México', flag: '🇲🇽', wageMult: 1.3, clubs: [['Club América', 3], ['Chivas', 3], ['Tigres', 3], ['Monterrey', 3], ['Cruz Azul', 3], ['Pumas', 3], ['Toluca', 2], ['Santos Laguna', 2], ['Pachuca', 3], ['León', 2], ['Atlas', 2], ['Necaxa', 2], ['Puebla', 2], ['Querétaro', 2], ['Tijuana', 2], ['Mazatlán', 1]] },
    // Upgrade de times: Série D e ligas de mais países
    { id: 'bra-d', cup: 'Copa do Brasil', name: 'Série D', country: 'Brasil', flag: '🇧🇷', clubs: [['América-RN', 1], ['Treze', 1], ['Campinense', 1], ['Juazeirense', 1], ['Joinville', 1], ['Sampaio Corrêa', 1], ['Moto Club', 1], ['River-PI', 1], ['Santo André', 1], ['XV de Piracicaba', 1], ['Inter de Limeira', 1], ['Operário-MS', 1], ['Anápolis', 1], ['Maringá', 1], ['Cascavel', 1], ['Manaus', 1]] },
    { id: 'bel', cup: 'Copa da Bélgica', name: 'Pro League', country: 'Bélgica', flag: '🇧🇪', clubs: [['Club Brugge', 4], ['Anderlecht', 3], ['Union Saint-Gilloise', 3], ['Genk', 3], ['Gent', 3], ['Antwerp', 3], ['Standard Liège', 2], ['Cercle Brugge', 2], ['Mechelen', 2], ['Charleroi', 2], ['Westerlo', 2], ['OH Leuven', 2], ['Sint-Truiden', 2], ['Dender', 1]] },
    { id: 'sco', cup: 'Copa da Escócia', name: 'Premiership', country: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', clubs: [['Celtic', 3], ['Rangers', 3], ['Aberdeen', 2], ['Hearts', 2], ['Hibernian', 2], ['Dundee United', 2], ['Motherwell', 2], ['Kilmarnock', 2], ['St. Mirren', 2], ['Dundee', 1], ['Ross County', 1], ['St. Johnstone', 1]] },
    { id: 'gre', cup: 'Copa da Grécia', name: 'Super League Grega', country: 'Grécia', flag: '🇬🇷', clubs: [['Olympiacos', 3], ['Panathinaikos', 3], ['AEK Atenas', 3], ['PAOK', 3], ['Aris', 2], ['OFI', 2], ['Asteras Tripolis', 2], ['Atromitos', 2], ['Volos', 1], ['Panetolikos', 1], ['Lamia', 1], ['Levadiakos', 1]] },
    { id: 'sui', cup: 'Copa da Suíça', name: 'Super League Suíça', country: 'Suíça', flag: '🇨🇭', clubs: [['Young Boys', 3], ['Basel', 3], ['Servette', 2], ['Lugano', 2], ['Zürich', 2], ['St. Gallen', 2], ['Luzern', 2], ['Grasshoppers', 2], ['Sion', 2], ['Lausanne', 2], ['Winterthur', 1], ['Yverdon', 1]] },
    { id: 'aut', cup: 'Copa da Áustria', name: 'Bundesliga Austríaca', country: 'Áustria', flag: '🇦🇹', clubs: [['Red Bull Salzburg', 3], ['Sturm Graz', 3], ['Rapid Viena', 2], ['Austria Viena', 2], ['LASK', 2], ['Wolfsberger', 2], ['Hartberg', 2], ['Rheindorf Altach', 1], ['WSG Tirol', 1], ['Blau-Weiss Linz', 1], ['Grazer AK', 1], ['Ried', 1]] },
    { id: 'den', cup: 'Copa da Dinamarca', name: 'Superliga Dinamarquesa', country: 'Dinamarca', flag: '🇩🇰', clubs: [['Copenhagen', 3], ['Midtjylland', 3], ['Brøndby', 2], ['AGF', 2], ['Nordsjælland', 2], ['Randers', 2], ['Silkeborg', 2], ['Viborg', 2], ['Vejle', 1], ['Sønderjyske', 1], ['Odense', 1], ['Fredericia', 1]] },
    { id: 'chi', cup: 'Copa Chile', name: 'Liga Chilena', country: 'Chile', flag: '🇨🇱', clubs: [['Colo-Colo', 3], ['Universidad de Chile', 3], ['Universidad Católica', 2], ['Palestino', 2], ['Huachipato', 2], ['Audax Italiano', 2], ["O'Higgins", 2], ['Coquimbo Unido', 2], ['Cobreloa', 1], ['Everton (CHI)', 1], ['Unión Española', 1], ['Deportes Iquique', 1]] },
    { id: 'par', cup: 'Copa Paraguai', name: 'Liga Paraguaia', country: 'Paraguai', flag: '🇵🇾', clubs: [['Olimpia', 3], ['Cerro Porteño', 3], ['Libertad', 3], ['Guaraní', 2], ['Nacional (PAR)', 2], ['Sportivo Luqueño', 1], ['Sportivo Trinidense', 1], ['Sportivo Ameliano', 1], ['2 de Mayo', 1], ['Tacuary', 1]] },
    { id: 'ecu', cup: 'Copa Equador', name: 'Liga Equatoriana', country: 'Equador', flag: '🇪🇨', clubs: [['LDU Quito', 3], ['Barcelona SC', 3], ['Independiente del Valle', 3], ['Emelec', 2], ['Aucas', 2], ['Universidad Católica (EQU)', 2], ['Delfín', 1], ['El Nacional', 1], ['Orense', 1], ['Deportivo Cuenca', 1], ['Macará', 1]] },
    { id: 'jpn', cup: 'Copa do Imperador', name: 'J1 League', country: 'Japão', flag: '🇯🇵', wageMult: 1.3, clubs: [['Vissel Kobe', 3], ['Kashima Antlers', 3], ['Urawa Reds', 3], ['Kawasaki Frontale', 3], ['Yokohama F. Marinos', 3], ['Sanfrecce Hiroshima', 3], ['Gamba Osaka', 2], ['Cerezo Osaka', 2], ['FC Tokyo', 2], ['Nagoya Grampus', 2], ['Kashiwa Reysol', 2], ['Machida Zelvia', 2], ['Albirex Niigata', 1], ['Shonan Bellmare', 1]] },
    { id: 'kor', cup: 'Copa da Coreia', name: 'K League 1', country: 'Coreia do Sul', flag: '🇰🇷', clubs: [['Ulsan HD', 3], ['Jeonbuk Hyundai', 3], ['Pohang Steelers', 2], ['FC Seoul', 2], ['Gangwon', 2], ['Gimcheon Sangmu', 2], ['Suwon FC', 2], ['Daejeon Hana', 2], ['Incheon United', 1], ['Jeju United', 1], ['Gwangju', 1], ['Daegu', 1]] },
    { id: 'qat', cup: 'Copa do Emir', name: 'Qatar Stars League', country: 'Catar', flag: '🇶🇦', wageMult: 3, clubs: [['Al-Sadd', 3], ['Al-Duhail', 3], ['Al-Rayyan', 3], ['Al-Gharafa', 3], ['Al-Arabi', 2], ['Qatar SC', 2], ['Al-Wakrah', 2], ['Umm Salal', 2]] },
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
  // Brasileirão de 2025 (20 clubes): Ceará e Sport sobem, Athletico-PR desce.
  // O id vem da posição na lista original, então a troca é feita aqui (carreiras salvas continuam valendo).
  const BR_2025 = { 'Ceará': ['bra-a', 3, 64], 'Sport': ['bra-a', 3, 63], 'Athletico-PR': ['bra-b', 2, 63] };
  D.CLUBS.forEach(cl => {
    const m = BR_2025[cl.name];
    if (m && (cl.league === 'bra-a' || cl.league === 'bra-b')) { cl.league = m[0]; cl.tier = m[1]; cl.strength = m[2]; }
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
    'bra-d': { up: 'bra-c', promo: 4 },
    'bra-c': { up: 'bra-b', promo: 4, down: 'bra-d', releg: 4 },
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
    'Real Sociedad B', 'Ferroviária', 'Tuna Luso', 'Juventus B',
    // upgrade de times
    'Reggiana', 'Carrarese', 'Juve Stabia', 'Universidad de Chile', 'Universidad Católica', 'Universidad Católica (EQU)', 'Unión Española',
    'LDU Quito', 'La Equidad', 'Inter de Limeira', 'Estrela da Amadora', 'União de Leiria', 'Juazeirense']);
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
  // Ligas do dinheiro (salários altíssimos, pouco prestígio)
  D.MONEY = ['ara', 'usa', 'qat'];

  D.FIRST_NAMES = ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Pedro', 'Vinícius', 'Thiago', 'Caio', 'Diego', 'Bruno', 'Igor', 'Enzo', 'Davi', 'Kauã', 'Renan', 'Wesley'];
  D.NICKNAMES = ['Gabigol', 'Luquinha', 'Matheuzinho', 'Rafinha', 'Pedrinho', 'Vini', 'Thiaguinho', 'Caio Bala', 'Diegão', 'Bruninho', 'Igão', 'Enzinho', 'Davizinho', 'Kauãzinho', 'Renanzão', 'Wesleyzinho'];

  // Atributos no padrão do FIFA/EA FC: rit (ritmo), fin (finalização), pas (passe), dri (drible), def (defesa), fis (físico)
  // Pesos para a nota geral (OVR) por posição.
  D.POS = {
    ATA: { name: 'Atacante', w: { fin: 0.30, rit: 0.20, dri: 0.20, fis: 0.12, pas: 0.12, def: 0.06 } },
    MEI: { name: 'Meia',     w: { pas: 0.32, dri: 0.22, fin: 0.14, rit: 0.12, def: 0.10, fis: 0.10 } },
    ZAG: { name: 'Zagueiro', w: { def: 0.38, fis: 0.24, pas: 0.14, rit: 0.12, dri: 0.06, fin: 0.06 } },
    // Goleiro: os mesmos 6 atributos com nomes de goleiro (ver D.GK_LABEL)
    GOL: { name: 'Goleiro',  w: { fin: 0.28, def: 0.24, fis: 0.20, dri: 0.16, pas: 0.08, rit: 0.04 } },
  };
  D.POS_NUM = { ATA: 9, MEI: 10, ZAG: 4, GOL: 1 };
  D.DEF_POS = ['ZAG', 'GOL']; // posições defensivas: estatísticas próprias
  D.ATTRS = ['rit', 'fin', 'pas', 'dri', 'def', 'fis'];
  D.ATTR_NAMES = { rit: 'Ritmo', fin: 'Finalização', pas: 'Passe', dri: 'Drible', def: 'Defesa', fis: 'Físico' };

  // Características. fx: multiplicadores e bônus aplicados na simulação.
  // goal/assist: multiplicador; attr: pontos imediatos; inj: risco de lesão; decl: declínio;
  // title: chance de título; fame: multiplicador de fama; rating: bônus na nota.
  // Características: cada uma soma pontos nos atributos da carta (nível 2 e 3 somam mais).
  const OF = ['ATA', 'MEI'], ALL = ['ATA', 'MEI', 'ZAG', 'GOL'];
  // Características: pouco atributo + um efeito próprio (fx = texto do efeito; m = multiplicador do nível: 1, 1.8, 2.6).
  // Algumas têm lado ruim (⚠️). Sem troca: o que entra fica até o fim da carreira.
  const pc = v => Math.round(v) + '%';
  const d1 = v => v.toFixed(1).replace('.', ',');
  D.TRAITS = [
    // Estilo de jogo (atacante e meia)
    { id: 'artilheiro', icon: '🦊', tone: 'green', name: 'Artilheiro',     pos: ['ATA'], attr: { fin: 2 }, fx: m => '+' + pc(6 * m) + ' gols · −' + pc(8 * m) + ' assistências' },
    { id: 'garcom',    icon: '🍽️', tone: 'green', name: 'Garçom',         pos: ['MEI'], attr: { pas: 2 }, fx: m => '+' + pc(8 * m) + ' assistências · −' + pc(8 * m) + ' gols' },
    { id: 'colocado',  icon: '🎯', tone: 'green', name: 'Chute Colocado', pos: OF, attr: { fin: 2 }, fx: () => 'Mira mais precisa nos lances decisivos' },
    { id: 'parada',    icon: '🧱', tone: 'green', name: 'Bola Parada',    pos: OF, attr: { pas: 2 }, fx: () => 'Mais faltas nos lances decisivos' },
    { id: 'drible',    icon: '🌀', tone: 'green', name: 'Drible Curto',   pos: OF, attr: { dri: 2 }, fx: m => '+' + d1(0.06 * m) + ' na nota média (mais fama)' },
    { id: 'visao',     icon: '👁️', tone: 'green', name: 'Visão de Jogo',  pos: OF, attr: {}, fx: m => 'O time rende mais: +' + d1(0.8 * m) + ' de força (mais títulos)' },
    { id: 'tecnica',   icon: '🪄', tone: 'green', name: 'Técnica',        pos: OF, attr: { dri: 2 }, fx: m => '+' + pc(4 * m) + ' gols e assistências' },
    { id: 'velocista', icon: '⚡', tone: 'green', name: 'Velocista',      pos: ['ATA', 'MEI', 'ZAG'], attr: { rit: 4 }, fx: () => '⚠️ Perde velocidade mais rápido depois dos 29' },
    { id: 'cabeceio',  icon: '🗣️', tone: 'green', name: 'Cabeceio',       pos: ['ATA', 'MEI'], attr: { fis: 2 }, fx: m => '+' + pc(5 * m) + ' gols (de cabeça)' },
    // Carreira (todas as posições)
    { id: 'academia',  icon: '🏋️', tone: 'blue', name: 'Rato de Academia', pos: ALL, until: 24, attr: {}, fx: m => '+' + pc(45 * m) + ' de evolução até os 24 anos' },
    { id: 'pro',       icon: '🧘', tone: 'blue', name: 'Profissional',   pos: ALL, attr: {}, fx: m => 'Envelhece ' + pc(25 * m) + ' mais devagar · −' + pc(15 * m) + ' lesões' },
    { id: 'estrela',   icon: '🌟', tone: 'blue', name: 'Estrela',        pos: ALL, attr: {}, fx: m => '+' + pc(25 * m) + ' salário · +' + d1(0.06 * m) + ' na nota nos jogos grandes · ⚠️ Técnico −1 por temporada' },
    { id: 'lider',     icon: '👑', tone: 'blue', name: 'Líder',          pos: ALL, attr: {}, fx: m => 'Técnico +' + Math.round(4 * m) + ' por temporada (mais minutos) · capitão mais cedo' },
    { id: 'raca',      icon: '🔥', tone: 'blue', name: 'Raça',           pos: ALL, attr: {}, fx: m => '+' + d1(0.07 * m) + ' na nota · Torcida +' + Math.round(3 * m) + ' por temporada · ⚠️ +' + pc(5 * m) + ' lesões' },
    { id: 'frieza',    icon: '🧊', tone: 'blue', name: 'Frieza',         pos: ALL, attr: {}, fx: () => 'Mais margem de erro nos lances decisivos' },
    { id: 'adaptavel', icon: '🧳', tone: 'blue', name: 'Adaptável',      pos: ALL, attr: {}, fx: m => 'Chega em clube novo com Técnico e Torcida +' + Math.round(12 * m) },
    { id: 'patriota',  icon: '🎌', tone: 'blue', name: 'Patriota',       pos: ALL, attr: {}, fx: m => 'Seleção convoca com nota ' + Math.round(2.5 * m) + ' abaixo · rende mais na Copa' },
    // Zagueiro
    { id: 'xerife',    icon: '🛡️', tone: 'sand', name: 'Xerife',         pos: ['ZAG'], attr: { def: 2 }, fx: m => 'Mais jogos sem sofrer gol (+' + d1(0.7 * m) + ' de força na defesa)' },
    { id: 'carrinho',  icon: '🦵', tone: 'sand', name: 'Carrinho',       pos: ['ZAG'], attr: { def: 1, fis: 1 }, fx: () => 'Faixa do desarme maior nos lances decisivos' },
    { id: 'antecipa',  icon: '🧠', tone: 'sand', name: 'Antecipação',    pos: ['ZAG'], attr: { def: 2, rit: 1 }, fx: () => 'O atacante corre mais devagar nos lances decisivos' },
    { id: 'saida',     icon: '📐', tone: 'sand', name: 'Saída de bola',  pos: ['ZAG'], attr: { pas: 3 }, fx: m => '+' + pc(30 * m) + ' assistências' },
    { id: 'aereo',     icon: '🦒', tone: 'sand', name: 'Jogo aéreo',     pos: ['ZAG'], attr: { fis: 2, fin: 1 }, fx: m => '+' + pc(20 * m) + ' gols de cabeça' },
    // Goleiro (nomes de goleiro: fin=REF, fis=ELA, dri=MAN, def=POS, pas=REP, rit=VEL)
    { id: 'reflexo',   icon: '⚡', tone: 'sand', name: 'Reflexo',        pos: ['GOL'], attr: { fin: 3 }, fx: () => 'A seta do batedor aparece antes nos pênaltis' },
    { id: 'elastico',  icon: '🤸', tone: 'sand', name: 'Elástico',       pos: ['GOL'], attr: { fis: 3 }, fx: () => 'Alcança bolas mais perto do canto' },
    { id: 'maofirme',  icon: '🧤', tone: 'sand', name: 'Mão firme',      pos: ['GOL'], attr: { dri: 2 }, fx: m => 'Mais jogos sem sofrer gol (+' + d1(1 * m) + ' de força na defesa)' },
    { id: 'pegador',   icon: '🥅', tone: 'sand', name: 'Pegador de pênalti', pos: ['GOL'], attr: { fin: 1, def: 2 }, fx: () => 'Lê melhor o batedor e defende mais pênaltis' },
    { id: 'libero',    icon: '🦶', tone: 'sand', name: 'Goleiro-líbero', pos: ['GOL'], attr: { pas: 2, rit: 1 }, fx: m => '+' + d1(0.08 * m) + ' na nota média' },
  ];
  D.traitFits = (t, pos) => !t.pos || t.pos.includes(pos);
  D.TRAIT_BY_ID = {};
  D.TRAITS.forEach(t => { D.TRAIT_BY_ID[t.id] = t; });
  // Multiplicador por nível: Nv1 = 1x, Nv2 = 1.8x, Nv3 = 2.6x
  D.TRAIT_LV = [0, 1, 1.8, 2.6];

  // Sinergias: ter as duas características dá pontos extras.
  D.SYNERGIES = [
    { id: 'falta',   a: 'colocado', b: 'parada',   icon: '🌟', tone: 'gold', name: 'Especialista em Falta', attr: { fin: 3, pas: 2 }, extra: 'Gols de falta nas manchetes' },
    { id: 'liso',    a: 'velocista', b: 'drible',  icon: '💨', tone: 'gold', name: 'Liso',                  attr: { rit: 3, dri: 3 } },
    { id: 'capitao', a: 'lider',    b: 'raca',     icon: '🎖️', tone: 'gold', name: 'Capitão',               attr: { def: 3, fis: 2, pas: 1 } },
    { id: 'maestro', a: 'visao',    b: 'garcom',   icon: '🎼', tone: 'gold', name: 'Maestro',               attr: { pas: 2, dri: 1 } },
    { id: 'muralha', a: 'xerife',   b: 'carrinho', icon: '🧱', tone: 'gold', name: 'Muralha',               attr: { def: 1, fis: 1 } },
    { id: 'paredao', a: 'reflexo',  b: 'elastico', icon: '🧤', tone: 'gold', name: 'Paredão',               attr: { fin: 3, fis: 3 } },
    { id: 'matador', a: 'artilheiro', b: 'frieza', icon: '💀', tone: 'purple', name: 'Matador',               attr: { fin: 2, fis: 1 } },
  ];
  // Investimentos com o próprio dinheiro: cada compra soma pontos fixos na carta.
  // O preço sobe a cada compra (de qualquer item).
  D.INVEST = [
    { id: 'fis',   icon: '🏋️', tone: 'sand', name: 'Personal trainer',         attr: { fis: 2 } },
    { id: 'fin',   icon: '🥅', tone: 'sand', name: 'Treino de chute',    attr: { fin: 2 } },
    { id: 'pas',   icon: '📊', tone: 'sand', name: 'Analista de jogo',   attr: { pas: 2 } },
    { id: 'rit',   icon: '🏃', tone: 'sand', name: 'Treino de sprint', attr: { rit: 2 } },
    { id: 'dri',   icon: '🪄', tone: 'sand', name: 'Treino de técnica',     attr: { dri: 2 } },
    { id: 'def',   icon: '🛡️', tone: 'sand', name: 'Treino defensivo',         attr: { def: 2 } },
    { id: 'fisio', icon: '🩺', tone: 'sand', name: 'Fisioterapeuta', perk: '−25% lesões', max: 2 },
  ];
  D.INVEST_BY_ID = {};
  D.INVEST.forEach(t => { D.INVEST_BY_ID[t.id] = t; });
  D.INVEST_MAX = 5; // compras por item de atributo (+10 no máximo)
  D.ATTR_LABEL = { rit: 'RIT', fin: 'FIN', pas: 'PAS', dri: 'DRI', def: 'DEF', fis: 'FÍS' };
  // Carta do goleiro (padrão FIFA): velocidade, reflexo, reposição, manejo, posicionamento, elasticidade
  D.GK_LABEL = { rit: 'VEL', fin: 'REF', pas: 'REP', dri: 'MAN', def: 'POS', fis: 'ELA' };
  D.label = (pos, k) => (pos === 'GOL' ? D.GK_LABEL : D.ATTR_LABEL)[k];
  const GK_INVEST = { fis: 'Treino de elasticidade', fin: 'Treino de reflexo', pas: 'Treino de reposição', rit: 'Treino de sprint', dri: 'Treino de manejo', def: 'Treino de posicionamento' };
  D.investName = (t, pos) => (pos === 'GOL' && GK_INVEST[t.id]) || t.name;

  // Clássicos de verdade: cada grupo é de rivais entre si (cidade, estado ou rivalidade histórica).
  // Clube sem clássico na mesma divisão joga o "clássico" contra um rival fixo de força parecida.
  D.DERBIES = [
    // Brasil
    ['Flamengo', 'Fluminense', 'Vasco', 'Botafogo'], ['Palmeiras', 'Corinthians', 'São Paulo', 'Santos'], ['Grêmio', 'Internacional'],
    ['Atlético-MG', 'Cruzeiro', 'América-MG'], ['Bahia', 'Vitória'], ['Fortaleza', 'Ceará'], ['Athletico-PR', 'Coritiba', 'Paraná'],
    ['Sport', 'Santa Cruz', 'Náutico'], ['Goiás', 'Vila Nova', 'Atlético-GO'], ['Ponte Preta', 'Guarani'], ['Avaí', 'Figueirense'],
    ['Paysandu', 'Remo'], ['CRB', 'CSA'], ['ABC', 'América-RN'], ['Botafogo-PB', 'Treze', 'Campinense'], ['Juventude', 'Caxias'],
    ['Portuguesa', 'Santo André', 'São Bernardo'], ['Red Bull Bragantino', 'Ponte Preta'], ['Mirassol', 'Novorizontino'],
    ['Criciúma', 'Chapecoense', 'Brusque'], ['Sampaio Corrêa', 'Moto Club'], ['Inter de Limeira', 'XV de Piracicaba'],
    // Argentina e Uruguai
    ['Boca Juniors', 'River Plate'], ['Racing', 'Independiente'], ['San Lorenzo', 'Huracán'], ['Rosario Central', "Newell's Old Boys"],
    ['Estudiantes', 'Gimnasia La Plata'], ['Talleres', 'Belgrano', 'Instituto'], ['Unión', 'Colón'], ['Lanús', 'Banfield'],
    ['Vélez Sarsfield', 'Ferro Carril Oeste'], ['Peñarol', 'Nacional'], ['Defensor Sporting', 'Danubio'],
    // Europa
    ['Real Madrid', 'Barcelona', 'Atlético de Madrid'], ['Sevilla', 'Real Betis'], ['Athletic Bilbao', 'Real Sociedad'], ['Barcelona', 'Espanyol'],
    ['Valencia', 'Villarreal', 'Levante'], ['Celta de Vigo', 'Deportivo La Coruña'], ['Getafe', 'Rayo Vallecano', 'Leganés'],
    ['Sporting Gijón', 'Real Oviedo'], ['Málaga', 'Granada', 'Almería'], ['Las Palmas', 'Tenerife'],
    ['Manchester United', 'Manchester City', 'Liverpool'], ['Liverpool', 'Everton'], ['Arsenal', 'Tottenham', 'Chelsea'], ['Chelsea', 'Fulham', 'Brentford'],
    ['West Ham', 'Millwall'], ['Crystal Palace', 'Brighton'], ['Aston Villa', 'Wolverhampton', 'West Brom'], ['Newcastle', 'Sunderland', 'Middlesbrough'],
    ['Nottingham Forest', 'Derby County', 'Leicester City'], ['Sheffield Wednesday', 'Sheffield United'], ['Norwich City', 'Ipswich Town'],
    ['Southampton', 'Portsmouth', 'Bournemouth'], ['Leeds United', 'Burnley', 'Blackburn Rovers'], ['Swansea City', 'Cardiff City'], ['Bristol City', 'Plymouth Argyle'],
    ['Inter de Milão', 'Milan', 'Juventus'], ['Roma', 'Lazio'], ['Juventus', 'Torino'], ['Genoa', 'Sampdoria'], ['Napoli', 'Roma', 'Juventus'],
    ['Fiorentina', 'Bologna', 'Empoli'], ['Atalanta', 'Brescia'], ['Palermo', 'Catanzaro'], ['Verona', 'Venezia'], ['Parma', 'Reggiana', 'Modena'],
    ['Borussia Dortmund', 'Schalke 04', 'Bayern de Munique'], ['Köln', "Borussia M'gladbach", 'Fortuna Düsseldorf', 'Bayer Leverkusen'],
    ['Hamburgo', 'Werder Bremen', 'St. Pauli'], ['Eintracht Frankfurt', 'Mainz', 'Darmstadt'], ['Stuttgart', 'Karlsruher SC', 'Freiburg'],
    ['Nürnberg', 'Greuther Fürth'], ['Union Berlin', 'Hertha Berlin'], ['Hannover 96', 'Eintracht Braunschweig', 'Wolfsburg'], ['RB Leipzig', 'Magdeburg'],
    ['PSG', 'Olympique de Marseille', 'Paris FC'], ['Lyon', 'Saint-Étienne'], ['Nice', 'Monaco'], ['Lille', 'Lens'], ['Rennes', 'Nantes', 'Brest', 'Guingamp'],
    ['Bordeaux', 'Toulouse'], ['Bastia', 'Ajaccio'], ['Montpellier', 'Nice'], ['Strasbourg', 'Metz', 'Reims'],
    ['Benfica', 'Porto', 'Sporting'], ['Braga', 'Vitória de Guimarães'], ['Porto', 'Boavista'], ['Rio Ave', 'Famalicão', 'Gil Vicente'], ['Académica', 'União de Leiria'],
    ['Ajax', 'Feyenoord', 'PSV'], ['Twente', 'Heracles', 'Go Ahead Eagles'], ['Groningen', 'Heerenveen'], ['Vitesse', 'NEC'], ['Feyenoord', 'Sparta Rotterdam'],
    ['Galatasaray', 'Fenerbahçe', 'Beşiktaş'], ['Trabzonspor', 'Fenerbahçe'], ['Club Brugge', 'Cercle Brugge', 'Anderlecht'], ['Anderlecht', 'Standard Liège', 'Union Saint-Gilloise'],
    ['Antwerp', 'Mechelen'], ['Genk', 'Sint-Truiden'], ['Celtic', 'Rangers'], ['Hearts', 'Hibernian'], ['Dundee', 'Dundee United'], ['Aberdeen', 'Rangers'],
    ['Olympiacos', 'Panathinaikos', 'AEK Atenas'], ['PAOK', 'Aris'], ['Basel', 'Zürich', 'Grasshoppers'], ['Young Boys', 'Basel'], ['Servette', 'Lausanne', 'Sion'],
    ['Rapid Viena', 'Austria Viena'], ['Sturm Graz', 'Grazer AK'], ['Red Bull Salzburg', 'Rapid Viena'], ['LASK', 'Blau-Weiss Linz'],
    ['Copenhagen', 'Brøndby'], ['AGF', 'Randers', 'Silkeborg'], ['Midtjylland', 'Viborg'],
    // Américas e resto do mundo
    ['Club América', 'Chivas', 'Pumas', 'Cruz Azul'], ['Tigres', 'Monterrey'], ['Chivas', 'Atlas'], ['Toluca', 'Club América'], ['Pachuca', 'León'],
    ['LA Galaxy', 'LAFC', 'San Diego FC'], ['Seattle Sounders', 'Portland Timbers', 'Vancouver Whitecaps'], ['New York City', 'New York Red Bulls', 'Philadelphia Union'],
    ['Inter Miami', 'Orlando City'], ['Atlanta United', 'Charlotte FC', 'Nashville SC'], ['Columbus Crew', 'FC Cincinnati', 'Chicago Fire'], ['Toronto FC', 'Vancouver Whitecaps'], ['Real Salt Lake', 'Austin FC'],
    ['Atlético Nacional', 'Independiente Medellín'], ['Millonarios', 'Independiente Santa Fe'], ['América de Cali', 'Deportivo Cali'], ['Junior', 'Atlético Nacional'], ['Once Caldas', 'Deportivo Pereira'],
    ['Colo-Colo', 'Universidad de Chile', 'Universidad Católica'], ['Everton (CHI)', 'Unión Española', 'Audax Italiano'],
    ['Olimpia', 'Cerro Porteño'], ['Libertad', 'Guaraní', 'Nacional (PAR)'], ['Barcelona SC', 'Emelec'], ['LDU Quito', 'Independiente del Valle', 'Aucas', 'El Nacional'],
    ['Al-Hilal', 'Al-Nassr', 'Al-Shabab'], ['Al-Ittihad', 'Al-Ahli'], ['Al-Ettifaq', 'Al-Qadsiah', 'Al-Khaleej'],
    ['Al-Sadd', 'Al-Duhail', 'Al-Rayyan', 'Al-Arabi'], ['Al-Gharafa', 'Qatar SC'],
    ['Urawa Reds', 'Kashima Antlers', 'Kashiwa Reysol'], ['Gamba Osaka', 'Cerezo Osaka', 'Vissel Kobe'], ['Kawasaki Frontale', 'Yokohama F. Marinos', 'FC Tokyo', 'Machida Zelvia'],
    ['Ulsan HD', 'Pohang Steelers', 'Jeonbuk Hyundai'], ['FC Seoul', 'Suwon FC', 'Incheon United'],
  ];
  // Rivais de cada clube (por id)
  D.RIVALS = {};
  {
    const byName = {};
    D.CLUBS.forEach(c => { byName[c.name] = c.id; });
    D.DERBIES.forEach(g => {
      const ids = g.map(n => byName[n]).filter(Boolean);
      ids.forEach(a => { D.RIVALS[a] = D.RIVALS[a] || []; ids.forEach(b => { if (b !== a && !D.RIVALS[a].includes(b)) D.RIVALS[a].push(b); }); });
    });
  }

  root.CRAQUE_DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
