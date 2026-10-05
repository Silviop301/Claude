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

  // Ligas e clubes: [nome, nível]. Dentro de cada nível da liga, a força cai do primeiro para o último
  // (força de partida; a força atual de cada clube vem de STR_2026, mais abaixo).
  // Nomes reais apenas em texto (sem escudos); para compartilhar publicamente, troque por nomes fictícios aqui.
  D.LEAGUES = [
    // Novos clubes sempre no FIM de cada lista: o id do clube (liga-índice) é o nome do arquivo do escudo.
    { id: 'bra-c', cup: 'Copa do Brasil', name: 'Série C', country: 'Brasil', flag: '🇧🇷', clubs: [['Figueirense', 1], ['Náutico', 1], ['Londrina', 1], ['Ypiranga-RS', 1], ['Confiança', 1], ['São Bernardo', 1], ['Paysandu', 1], ['Remo', 1], ['ABC', 1], ['Botafogo-SP', 1], ['Ituano', 1], ['Volta Redonda', 1], ['Brusque', 1], ['Tombense', 1], ['Caxias', 1], ['Botafogo-PB', 1], ['Ferroviária', 1], ['Amazonas', 1], ['Athletic-MG', 1]] },
    { id: 'bra-b', cup: 'Copa do Brasil', name: 'Série B', country: 'Brasil', flag: '🇧🇷', clubs: [['Coritiba', 2], ['Goiás', 2], ['Avaí', 2], ['Ponte Preta', 2], ['Guarani', 2], ['Vila Nova', 2], ['CRB', 2], ['Sport', 2], ['Ceará', 2], ['América-MG', 2], ['Chapecoense', 2], ['Novorizontino', 2], ['Operário-PR', 2], ['Criciúma', 2], ['Cuiabá', 2], ['Atlético-GO', 2], ['Santa Cruz', 2], ['Paraná', 2], ['Portuguesa', 2], ['CSA', 2]] },
    { id: 'bra-a', cup: 'Copa do Brasil', name: 'Brasileirão', country: 'Brasil', flag: '🇧🇷', clubs: [['Flamengo', 3], ['Palmeiras', 3], ['Atlético-MG', 3], ['São Paulo', 3], ['Corinthians', 3], ['Fluminense', 3], ['Botafogo', 3], ['Grêmio', 3], ['Internacional', 3], ['Cruzeiro', 3], ['Santos', 3], ['Bahia', 3], ['Fortaleza', 3], ['Vasco', 3], ['Athletico-PR', 3], ['Red Bull Bragantino', 3], ['Vitória', 3], ['Juventude', 3], ['Mirassol', 3]] },
    { id: 'arg', cup: 'Copa Argentina', name: 'Liga Argentina', country: 'Argentina', flag: '🇦🇷', clubs: [['River Plate', 3], ['Boca Juniors', 3], ['Racing', 3], ['Independiente', 3], ['San Lorenzo', 3], ['Vélez Sarsfield', 3], ['Estudiantes', 3], ['Talleres', 3], ['Rosario Central', 3], ['Lanús', 3], ['Huracán', 3], ["Newell's Old Boys", 3], ['Argentinos Juniors', 3], ['Godoy Cruz', 3], ['Belgrano', 3], ['Unión', 3], ['Barracas Central', 3], ['Defensa y Justicia', 3], ['Instituto', 3], ['Sarmiento', 3], ['Aldosivi', 3], ['Independiente Rivadavia', 3], ['Central Córdoba', 3], ['Atlético Tucumán', 3], ['Deportivo Riestra', 3], ['San Martín de San Juan', 3]] },
    { id: 'por', cup: 'Taça de Portugal', name: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹', clubs: [['Benfica', 4], ['Porto', 4], ['Sporting', 4], ['Braga', 3], ['Vitória de Guimarães', 3], ['Famalicão', 3], ['Gil Vicente', 3], ['Rio Ave', 3], ['Estoril', 3], ['Moreirense', 3], ['Casa Pia', 3], ['Arouca', 3], ['Santa Clara', 3], ['Estrela da Amadora', 3], ['Nacional da Madeira', 3], ['AVS', 3], ['Alverca', 3]] },
    { id: 'esp', cup: 'Copa do Rei', name: 'La Liga', country: 'Espanha', flag: '🇪🇸', clubs: [['Real Madrid', 5], ['Barcelona', 5], ['Atlético de Madrid', 4], ['Real Sociedad', 4], ['Sevilla', 4], ['Villarreal', 4], ['Athletic Bilbao', 4], ['Real Betis', 4], ['Valencia', 3], ['Celta de Vigo', 3], ['Osasuna', 3], ['Getafe', 3], ['Mallorca', 3], ['Rayo Vallecano', 3], ['Girona', 3], ['Alavés', 3], ['Las Palmas', 3], ['Espanyol', 3], ['Real Valladolid', 3], ['Leganés', 3]] },
    { id: 'ing', cup: 'FA Cup', name: 'Premier League', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Manchester City', 5], ['Liverpool', 5], ['Arsenal', 5], ['Chelsea', 4], ['Manchester United', 4], ['Tottenham', 4], ['Newcastle', 4], ['Aston Villa', 4], ['Brighton', 4], ['West Ham', 4], ['Everton', 3], ['Crystal Palace', 3], ['Wolverhampton', 3], ['Fulham', 3], ['Brentford', 3], ['Nottingham Forest', 3], ['Bournemouth', 3], ['Leicester City', 3], ['Ipswich Town', 3]] },
    { id: 'ita', cup: 'Coppa Italia', name: 'Serie A', country: 'Itália', flag: '🇮🇹', clubs: [['Inter de Milão', 5], ['Juventus', 4], ['Milan', 4], ['Napoli', 4], ['Roma', 4], ['Atalanta', 4], ['Lazio', 4], ['Fiorentina', 3], ['Bologna', 3], ['Torino', 3], ['Genoa', 3], ['Udinese', 3], ['Sassuolo', 3], ['Cagliari', 3], ['Verona', 3], ['Lecce', 3], ['Parma', 3], ['Como', 3], ['Empoli', 3], ['Monza', 3]] },
    { id: 'ale', cup: 'Copa da Alemanha', name: 'Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Bayern de Munique', 5], ['Bayer Leverkusen', 4], ['Borussia Dortmund', 4], ['RB Leipzig', 4], ['Eintracht Frankfurt', 4], ['Stuttgart', 4], ['Wolfsburg', 3], ['Freiburg', 3], ['Werder Bremen', 3], ["Borussia M'gladbach", 3], ['Mainz', 3], ['Augsburg', 3], ['Hoffenheim', 3], ['Union Berlin', 3], ['Köln', 3], ['Heidenheim', 3], ['St. Pauli', 3], ['Holstein Kiel', 3]] },
    { id: 'fra', cup: 'Copa da França', name: 'Ligue 1', country: 'França', flag: '🇫🇷', clubs: [['PSG', 5], ['Monaco', 4], ['Olympique de Marseille', 4], ['Lyon', 4], ['Lille', 4], ['Nice', 3], ['Lens', 3], ['Rennes', 3], ['Nantes', 3], ['Toulouse', 3], ['Strasbourg', 3], ['Montpellier', 3], ['Reims', 3], ['Brest', 3], ['Le Havre', 3], ['Angers', 3], ['Lorient', 3], ['Paris FC', 3]] },
    { id: 'ara', cup: 'Copa do Rei Saudita', name: 'Saudi Pro League', country: 'Arábia Saudita', flag: '🇸🇦', wageMult: 4, clubs: [['Al-Hilal', 3], ['Al-Nassr', 3], ['Al-Ittihad', 3], ['Al-Ahli', 3], ['Al-Shabab', 3], ['Al-Ettifaq', 3], ['Al-Taawoun', 3], ['Al-Qadsiah', 3], ['Al-Fateh', 3], ['Al-Fayha', 3], ['Al-Khaleej', 3], ['Damac', 3], ['Al-Riyadh', 3], ['Al-Okhdood', 3], ['Al-Kholood', 3], ['Al-Hazem', 3], ['Al-Najma', 3], ['NEOM', 3]] },
    { id: 'usa', cup: 'US Open Cup', name: 'MLS', country: 'EUA', flag: '🇺🇸', wageMult: 2, clubs: [['Inter Miami', 3], ['LA Galaxy', 3], ['LAFC', 3], ['Seattle Sounders', 3], ['Atlanta United', 3], ['New York City', 3], ['Columbus Crew', 3], ['Orlando City', 3], ['Toronto FC', 3], ['Philadelphia Union', 3], ['Portland Timbers', 3], ['FC Cincinnati', 3], ['Nashville SC', 3], ['New York Red Bulls', 3], ['Real Salt Lake', 3], ['Austin FC', 3], ['Charlotte FC', 3], ['Vancouver Whitecaps', 3], ['Chicago Fire', 3], ['San Diego FC', 3], ['Houston Dynamo', 3], ['FC Dallas', 3], ['Sporting Kansas City', 3], ['Minnesota United', 3], ['Colorado Rapids', 3], ['San Jose Earthquakes', 3], ['CF Montréal', 3], ['New England Revolution', 3], ['D.C. United', 3], ['St. Louis City', 3]] },
    // Ligas novas (segundas divisões e países)
    { id: 'arg-b', cup: 'Copa Argentina', name: 'Primera Nacional', country: 'Argentina', flag: '🇦🇷', clubs: [['Banfield', 2], ['Gimnasia La Plata', 2], ['Tigre', 2], ['Platense', 2], ['Colón', 2], ['Quilmes', 2], ['Chacarita Juniors', 2], ['Ferro Carril Oeste', 2], ['Arsenal de Sarandí', 2], ['Almirante Brown', 2], ['Atlanta', 2], ['Deportivo Morón', 2], ['San Martín de Tucumán', 2], ['All Boys', 2], ['Nueva Chicago', 2]] },
    { id: 'uru', cup: 'Copa AUF', name: 'Liga Uruguaia', country: 'Uruguai', flag: '🇺🇾', clubs: [['Peñarol', 3], ['Nacional', 3], ['Defensor Sporting', 2], ['Danubio', 2], ['Liverpool (URU)', 2], ['Montevideo Wanderers', 2], ['Cerro Largo', 1], ['River Plate (URU)', 1], ['Boston River', 2], ['Racing (URU)', 1], ['Plaza Colonia', 1], ['Cerro', 1], ['Progreso', 1], ['Fénix', 1]] },
    { id: 'col', cup: 'Copa Colômbia', name: 'Liga Colombiana', country: 'Colômbia', flag: '🇨🇴', clubs: [['Atlético Nacional', 3], ['Millonarios', 3], ['América de Cali', 2], ['Junior', 2], ['Deportivo Cali', 2], ['Independiente Santa Fe', 2], ['Once Caldas', 1], ['Deportes Tolima', 1], ['Independiente Medellín', 2], ['Atlético Bucaramanga', 2], ['Deportivo Pereira', 1], ['Águilas Doradas', 1], ['La Equidad', 1], ['Envigado', 1]] },
    { id: 'por-2', cup: 'Taça de Portugal', name: 'Liga Portugal 2', country: 'Portugal', flag: '🇵🇹', clubs: [['Boavista', 2], ['Marítimo', 2], ['Feirense', 2], ['Leixões', 2], ['Tondela', 2], ['Académica', 1], ['Penafiel', 1], ['Oliveirense', 1], ['Paços de Ferreira', 2], ['Chaves', 2], ['Vizela', 2], ['Portimonense', 2], ['Farense', 2], ['Torreense', 2], ['União de Leiria', 1], ['Felgueiras', 1]] },
    { id: 'esp-2', cup: 'Copa do Rei', name: 'LaLiga 2', country: 'Espanha', flag: '🇪🇸', clubs: [['Racing Santander', 2], ['Sporting Gijón', 2], ['Real Zaragoza', 2], ['Deportivo La Coruña', 2], ['Málaga', 2], ['Cádiz', 2], ['Eibar', 2], ['Elche', 2], ['Levante', 2], ['Almería', 2], ['Real Oviedo', 2], ['Granada', 2], ['Tenerife', 2], ['Huesca', 2], ['Mirandés', 2], ['Albacete', 2], ['Burgos', 2], ['Córdoba', 2], ['Castellón', 2], ['Andorra', 2]] },
    { id: 'ing-2', cup: 'FA Cup', name: 'Championship', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', clubs: [['Leeds United', 2], ['Norwich City', 2], ['Middlesbrough', 2], ['Sheffield Wednesday', 2], ['Watford', 2], ['Stoke City', 2], ['Sunderland', 2], ['Burnley', 2], ['Coventry City', 2], ['Southampton', 2], ['West Brom', 2], ['Sheffield United', 2], ['Hull City', 2], ['Blackburn Rovers', 2], ['Preston North End', 2], ['Bristol City', 2], ['Queens Park Rangers', 2], ['Millwall', 2], ['Swansea City', 2], ['Cardiff City', 2], ['Derby County', 2], ['Luton Town', 2], ['Portsmouth', 2], ['Plymouth Argyle', 1], ['Birmingham City', 2], ['Wrexham', 2]] },
    { id: 'ita-2', cup: 'Coppa Italia', name: 'Serie B italiana', country: 'Itália', flag: '🇮🇹', clubs: [['Palermo', 2], ['Sampdoria', 2], ['Bari', 2], ['Spezia', 2], ['Brescia', 2], ['Cremonese', 2], ['Salernitana', 2], ['Pisa', 2], ['Catanzaro', 2], ['Venezia', 2], ['Frosinone', 2], ['Modena', 2], ['Reggiana', 2], ['Cesena', 2], ['Südtirol', 1], ['Carrarese', 1], ['Mantova', 1], ['Juve Stabia', 1], ['Padova', 2], ['Avellino', 1]] },
    { id: 'ale-2', cup: 'Copa da Alemanha', name: '2. Bundesliga', country: 'Alemanha', flag: '🇩🇪', clubs: [['Hamburgo', 2], ['Schalke 04', 2], ['Hertha Berlin', 2], ['Kaiserslautern', 2], ['Nürnberg', 2], ['Hannover 96', 2], ['Fortuna Düsseldorf', 2], ['Karlsruher SC', 2], ['Paderborn', 2], ['Darmstadt', 2], ['Greuther Fürth', 2], ['Magdeburg', 2], ['Elversberg', 2], ['Bochum', 2], ['Arminia Bielefeld', 2], ['Preußen Münster', 1], ['Eintracht Braunschweig', 1], ['Dynamo Dresden', 2]] },
    { id: 'fra-2', cup: 'Copa da França', name: 'Ligue 2', country: 'França', flag: '🇫🇷', clubs: [['Saint-Étienne', 2], ['Caen', 2], ['Metz', 2], ['Guingamp', 2], ['Bastia', 2], ['Bordeaux', 2], ['Auxerre', 2], ['Ajaccio', 2], ['Grenoble', 2], ['Troyes', 2], ['Clermont', 2], ['Amiens', 2], ['Pau', 1], ['Rodez', 1], ['Laval', 1], ['Dunkerque', 1], ['Red Star', 1], ['Nancy', 1]] },
    { id: 'ned', cup: 'Copa da Holanda', name: 'Eredivisie', country: 'Holanda', flag: '🇳🇱', clubs: [['Ajax', 4], ['PSV', 4], ['Feyenoord', 4], ['AZ Alkmaar', 3], ['Twente', 3], ['Utrecht', 3], ['Heerenveen', 2], ['Groningen', 2], ['Sparta Rotterdam', 2], ['Vitesse', 2], ['NEC', 2], ['Go Ahead Eagles', 2], ['Fortuna Sittard', 2], ['NAC Breda', 2], ['PEC Zwolle', 2], ['Heracles', 2], ['Willem II', 2], ['Excelsior', 2], ['Telstar', 2], ['FC Volendam', 2]] },
    { id: 'tur', cup: 'Copa da Turquia', name: 'Süper Lig', country: 'Turquia', flag: '🇹🇷', clubs: [['Galatasaray', 4], ['Fenerbahçe', 4], ['Beşiktaş', 3], ['Trabzonspor', 3], ['Başakşehir', 3], ['Konyaspor', 2], ['Antalyaspor', 2], ['Kasımpaşa', 2], ['Alanyaspor', 2], ['Samsunspor', 2], ['Sivasspor', 2], ['Kayserispor', 2], ['Göztepe', 2], ['Rizespor', 2], ['Gaziantep', 2], ['Eyüpspor', 2], ['Kocaelispor', 2], ['Gençlerbirliği', 2], ['Fatih Karagümrük', 2]] },
    { id: 'mex', cup: 'Copa MX', name: 'Liga MX', country: 'México', flag: '🇲🇽', wageMult: 1.3, clubs: [['Club América', 3], ['Chivas', 3], ['Tigres', 3], ['Monterrey', 3], ['Cruz Azul', 3], ['Pumas', 3], ['Toluca', 2], ['Santos Laguna', 2], ['Pachuca', 3], ['León', 2], ['Atlas', 2], ['Necaxa', 2], ['Puebla', 2], ['Querétaro', 2], ['Tijuana', 2], ['Mazatlán', 1], ['Atlético San Luis', 2], ['FC Juárez', 2]] },
    // Upgrade de times: Série D e ligas de mais países
    { id: 'bra-d', cup: 'Copa do Brasil', name: 'Série D', country: 'Brasil', flag: '🇧🇷', clubs: [['América-RN', 1], ['Treze', 1], ['Campinense', 1], ['Juazeirense', 1], ['Joinville', 1], ['Sampaio Corrêa', 1], ['Moto Club', 1], ['River-PI', 1], ['Santo André', 1], ['XV de Piracicaba', 1], ['Inter de Limeira', 1], ['Operário-MS', 1], ['Anápolis', 1], ['Maringá', 1], ['Cascavel', 1], ['Manaus', 1]] },
    { id: 'bel', cup: 'Copa da Bélgica', name: 'Pro League', country: 'Bélgica', flag: '🇧🇪', clubs: [['Club Brugge', 4], ['Anderlecht', 3], ['Union Saint-Gilloise', 3], ['Genk', 3], ['Gent', 3], ['Antwerp', 3], ['Standard Liège', 2], ['Cercle Brugge', 2], ['Mechelen', 2], ['Charleroi', 2], ['Westerlo', 2], ['OH Leuven', 2], ['Sint-Truiden', 2], ['Dender', 1], ['Zulte Waregem', 2], ['La Louvière', 1]] },
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
    // Segundas divisões dos países que só tinham a elite (acesso e rebaixamento em D.LADDER)
    { id: 'ned-2', cup: 'Copa da Holanda', name: 'Eerste Divisie', country: 'Holanda', flag: '🇳🇱', clubs: [['ADO Den Haag', 2], ['Cambuur', 2], ['Roda JC', 2], ['De Graafschap', 2], ['Almere City', 2], ['RKC Waalwijk', 2], ['FC Den Bosch', 2], ['Dordrecht', 2], ['FC Emmen', 2], ['Helmond Sport', 2], ['MVV', 1], ['VVV-Venlo', 1], ['TOP Oss', 1], ['FC Eindhoven', 1]] },
    { id: 'tur-2', cup: 'Copa da Turquia', name: 'TFF 1. Lig', country: 'Turquia', flag: '🇹🇷', clubs: [['Bodrumspor', 2], ['Pendikspor', 2], ['Çorum FK', 2], ['Erzurumspor', 2], ['Boluspor', 2], ['Bandırmaspor', 2], ['Sakaryaspor', 2], ['Iğdır FK', 2], ['Manisa FK', 2], ['Keçiörengücü', 2], ['Ümraniyespor', 1], ['Hatayspor', 1], ['Adana Demirspor', 1], ['Amedspor', 1]] },
    { id: 'mex-2', cup: 'Copa MX', name: 'Liga de Expansión', country: 'México', flag: '🇲🇽', wageMult: 1.3, clubs: [['Atlante', 2], ['Celaya', 2], ['Leones Negros', 2], ['Tepatitlán', 2], ['Correcaminos', 2], ['Dorados', 2], ['Mineros de Zacatecas', 2], ['Venados', 2], ['Tlaxcala', 2], ['Atlético Morelia', 2], ['Cancún FC', 1], ['Tapatío', 1], ['Jaiba Brava', 1], ['Irapuato', 1]] },
    { id: 'bel-2', cup: 'Copa da Bélgica', name: 'Challenger Pro League', country: 'Bélgica', flag: '🇧🇪', clubs: [['Beerschot', 2], ['Lommel', 2], ['RWD Molenbeek', 2], ['Patro Eisden', 2], ['Lierse', 2], ['Lokeren', 2], ['Francs Borains', 2], ['Seraing', 2], ['Eupen', 1], ['Kortrijk', 1], ['Beveren', 1], ['Club NXT', 1]] },
    { id: 'sco-2', cup: 'Copa da Escócia', name: 'Scottish Championship', country: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', clubs: [['St Johnstone', 2], ['Hamilton Academical', 2], ['Partick Thistle', 2], ['Ayr United', 1], ['Raith Rovers', 1], ['Greenock Morton', 1], ['Airdrieonians', 1], ["Queen's Park", 1], ['Arbroath', 1], ['Dunfermline', 1]] },
    { id: 'gre-2', cup: 'Copa da Grécia', name: 'Super League 2', country: 'Grécia', flag: '🇬🇷', clubs: [['Iraklis', 2], ['Kalamata', 2], ['Panionios', 2], ['Niki Volos', 2], ['Ilioupoli', 2], ['Chania', 2], ['Kampaniakos', 2], ['Makedonikos', 2], ['Marko', 1], ['Panachaiki', 1], ['Athens Kallithea', 1], ['Egaleo', 1]] },
    { id: 'sui-2', cup: 'Copa da Suíça', name: 'Challenge League', country: 'Suíça', flag: '🇨🇭', clubs: [['Aarau', 2], ['Vaduz', 2], ['Neuchâtel Xamax', 2], ['Wil', 2], ['Bellinzona', 2], ['Stade Lausanne Ouchy', 2], ['Étoile Carouge', 1], ['Stade Nyonnais', 1], ['Rapperswil-Jona', 1], ['Schaffhausen', 1]] },
    { id: 'aut-2', cup: 'Copa da Áustria', name: '2. Liga Austríaca', country: 'Áustria', flag: '🇦🇹', clubs: [['Admira Wacker', 2], ['Austria Lustenau', 2], ['Kapfenberg', 2], ['Liefering', 2], ['First Vienna', 2], ['Floridsdorfer AC', 2], ['St. Pölten', 2], ['Bregenz', 2], ['Austria Klagenfurt', 1], ['Amstetten', 1], ['Leoben', 1], ['Horn', 1]] },
    { id: 'den-2', cup: 'Copa da Dinamarca', name: '1ª Divisão Dinamarquesa', country: 'Dinamarca', flag: '🇩🇰', clubs: [['Lyngby', 2], ['AaB', 2], ['Hvidovre', 2], ['HB Køge', 2], ['Hillerød', 2], ['Esbjerg', 2], ['Kolding IF', 2], ['Horsens', 2], ['B.93', 1], ['Middelfart', 1], ['Hobro', 1], ['Aarhus Fremad', 1]] },
    { id: 'chi-2', cup: 'Copa Chile', name: 'Primera B Chilena', country: 'Chile', flag: '🇨🇱', clubs: [['Deportes Antofagasta', 2], ['Santiago Wanderers', 2], ['Deportes Temuco', 2], ['Rangers de Talca', 1], ['San Marcos de Arica', 1], ['Unión San Felipe', 1], ['Deportes Copiapó', 1], ['Curicó Unido', 1], ['Magallanes', 1], ['Santiago Morning', 1], ['Recoleta', 1], ['San Luis', 1]] },
    { id: 'par-2', cup: 'Copa Paraguai', name: 'División Intermedia', country: 'Paraguai', flag: '🇵🇾', clubs: [['Rubio Ñu', 2], ['Sol de América', 2], ['Sportivo Carapeguá', 2], ['Fernando de la Mora', 1], ['Independiente CG', 1], ['Resistencia', 1], ['Tembetary', 1], ['12 de Octubre', 1], ['Deportivo Santaní', 1], ['River Plate (PAR)', 1], ['Atlético Colegiales', 1], ['Guaireña', 1]] },
    { id: 'ecu-2', cup: 'Copa Equador', name: 'Serie B Equatoriana', country: 'Equador', flag: '🇪🇨', clubs: [['Deportivo Quito', 2], ['Imbabura', 2], ['Chacaritas', 2], ['Cumbayá', 1], ['Guayaquil City', 1], ['Gualaceo', 1], ['9 de Octubre', 1], ['Independiente Juniors', 1], ['Manta', 1], ['Vargas Torres', 1]] },
    { id: 'uru-2', cup: 'Copa AUF', name: 'Segunda División Uruguaia', country: 'Uruguai', flag: '🇺🇾', clubs: [['Rampla Juniors', 2], ['Uruguay Montevideo', 2], ['Atenas', 2], ['Villa Teresa', 1], ['Central Español', 1], ['Juventud de Las Piedras', 1], ['Sud América', 1], ['Rentistas', 1], ['Oriental', 1], ['Tacuarembó', 1], ['Cerrito', 1], ['Torque', 1]] },
    { id: 'col-2', cup: 'Copa Colômbia', name: 'Primera B Colombiana', country: 'Colômbia', flag: '🇨🇴', clubs: [['Real Cartagena', 2], ['Cúcuta Deportivo', 2], ['Atlético FC', 2], ['Boca Juniors de Cali', 1], ['Barranquilla FC', 1], ['Bogotá FC', 1], ['Orsomarso', 1], ['Real Santander', 1], ['Tigres FC', 1], ['Leones FC', 1], ['Patriotas', 1], ['Deportes Quindío', 1], ['Jaguares de Córdoba', 1], ['Internacional de Palmira', 1]] },
    { id: 'jpn-2', cup: 'Copa do Imperador', name: 'J2 League', country: 'Japão', flag: '🇯🇵', wageMult: 1.3, clubs: [['Hokkaido Consadole Sapporo', 2], ['Júbilo Iwata', 2], ['Kataller Toyama', 2], ['Montedio Yamagata', 2], ['Vegalta Sendai', 2], ['Oita Trinita', 2], ['Ventforet Kofu', 2], ['Blaublitz Akita', 2], ['Iwaki FC', 2], ['Fujieda MYFC', 2], ['Tokushima Vortis', 1], ['Ehime FC', 1], ['Roasso Kumamoto', 1], ['RB Omiya Ardija', 1]] },
    { id: 'kor-2', cup: 'Copa da Coreia', name: 'K League 2', country: 'Coreia do Sul', flag: '🇰🇷', clubs: [['Suwon Samsung Bluewings', 2], ['Busan IPark', 2], ['Seongnam FC', 2], ['Jeonnam Dragons', 2], ['Bucheon FC', 2], ['Gimpo FC', 2], ['Seoul E-Land', 2], ['Chungnam Asan', 2], ['Ansan Greeners', 1], ['Cheonan City', 1], ['Chungbuk Cheongju', 1], ['Gyeongnam FC', 1]] },
    { id: 'ara-2', cup: 'Copa do Rei Saudita', name: 'First Division Saudita', country: 'Arábia Saudita', flag: '🇸🇦', wageMult: 2, clubs: [['Al-Faisaly', 2], ['Al-Jabalain', 2], ['Al-Arabi (KSA)', 2], ['Al-Adalah', 2], ['Al-Batin', 2], ['Al-Jandal', 2], ['Al-Ula', 2], ['Al-Zulfi', 2], ['Ohod', 1], ['Al-Diriyah', 1], ['Abha', 1], ['Al-Tai', 1]] },
    { id: 'usa-2', cup: 'US Open Cup', name: 'USL Championship', country: 'EUA', flag: '🇺🇸', wageMult: 1, clubs: [['Louisville City', 2], ['Sacramento Republic', 2], ['Phoenix Rising', 2], ['Tampa Bay Rowdies', 2], ['Pittsburgh Riverhounds', 2], ['San Antonio FC', 2], ['New Mexico United', 2], ['Indy Eleven', 2], ['Detroit City', 1], ['Charleston Battery', 1], ['Colorado Springs Switchbacks', 1], ['Orange County SC', 1]] },
    { id: 'qat-2', cup: 'Copa do Emir', name: 'Second Division Catari', country: 'Catar', flag: '🇶🇦', wageMult: 1.5, clubs: [['Al-Shamal', 2], ['Muaither', 2], ['Mesaimeer', 2], ['Al-Bidda', 1], ['Lusail', 1], ['Al-Waab', 1], ['Al-Kharaitiyat', 1], ['Al-Shahania', 1]] },
    // Países novos (liga única com clubes de vários níveis: a base sai do mesmo campeonato)
    { id: 'per', cup: 'Copa Bicentenário', name: 'Liga 1 Peruana', country: 'Peru', flag: '🇵🇪', clubs: [['Universitario', 3], ['Alianza Lima', 3], ['Sporting Cristal', 3], ['Melgar', 2], ['Cienciano', 2], ['Cusco FC', 2], ['Sport Huancayo', 2], ['ADT', 2], ['Atlético Grau', 2], ['Deportivo Garcilaso', 2], ['César Vallejo', 1], ['Sport Boys', 1], ['Alianza Atlético', 1], ['Los Chankas', 1]] },
    { id: 'bol', cup: 'Copa da Bolívia', name: 'División Profesional', country: 'Bolívia', flag: '🇧🇴', clubs: [['Bolívar', 2], ['The Strongest', 2], ['Always Ready', 2], ['Jorge Wilstermann', 2], ['Blooming', 2], ['Oriente Petrolero', 2], ['Nacional Potosí', 1], ['Real Tomayapo', 1], ['Aurora', 1], ['Universitario de Vinto', 1], ['Guabirá', 1], ['San Antonio Bulo Bulo', 1]] },
    { id: 'ven', cup: 'Copa Venezuela', name: 'Liga FUTVE', country: 'Venezuela', flag: '🇻🇪', clubs: [['Deportivo Táchira', 2], ['Caracas FC', 2], ['Monagas', 2], ['Carabobo', 2], ['Universidad Central', 2], ['Academia Puerto Cabello', 2], ['Deportivo La Guaira', 1], ['Metropolitanos', 1], ['Zamora', 1], ['Estudiantes de Mérida', 1], ['Portuguesa (VEN)', 1], ['Rayo Zuliano', 1]] },
    { id: 'cro', cup: 'Copa da Croácia', name: 'HNL', country: 'Croácia', flag: '🇭🇷', clubs: [['Dinamo Zagreb', 3], ['Hajduk Split', 3], ['Rijeka', 3], ['Osijek', 2], ['Varaždin', 2], ['Lokomotiva Zagreb', 2], ['Slaven Belupo', 2], ['Gorica', 2], ['Istra 1961', 1], ['Šibenik', 1], ['Rudeš', 1]] },
    { id: 'srb', cup: 'Copa da Sérvia', name: 'Superliga Sérvia', country: 'Sérvia', flag: '🇷🇸', clubs: [['Estrela Vermelha', 3], ['Partizan', 3], ['Vojvodina', 2], ['TSC Bačka Topola', 2], ['Čukarički', 2], ['Radnički Niš', 2], ['Novi Pazar', 2], ['Spartak Subotica', 1], ['Napredak', 1], ['Mladost Lučani', 1], ['Železničar Pančevo', 1], ['OFK Beograd', 1]] },
    { id: 'nor', cup: 'Copa da Noruega', name: 'Eliteserien', country: 'Noruega', flag: '🇳🇴', clubs: [['Bodø/Glimt', 3], ['Molde', 3], ['Rosenborg', 2], ['Brann', 2], ['Viking', 2], ['Vålerenga', 2], ['Lillestrøm', 2], ['Sarpsborg 08', 2], ['Tromsø', 2], ['Strømsgodset', 1], ['Haugesund', 1], ['Odd', 1], ['Kristiansund', 1]] },
    { id: 'swe', cup: 'Copa da Suécia', name: 'Allsvenskan', country: 'Suécia', flag: '🇸🇪', clubs: [['Malmö FF', 3], ['Djurgården', 2], ['AIK', 2], ['Hammarby', 2], ['IFK Göteborg', 2], ['Häcken', 2], ['Elfsborg', 2], ['Mjällby', 2], ['IFK Norrköping', 1], ['Sirius', 1], ['Halmstad', 1], ['GAIS', 1], ['Brommapojkarna', 1]] },
    { id: 'pol', cup: 'Copa da Polônia', name: 'Ekstraklasa', country: 'Polônia', flag: '🇵🇱', clubs: [['Legia Varsóvia', 3], ['Lech Poznań', 3], ['Raków Częstochowa', 3], ['Jagiellonia', 2], ['Pogoń Szczecin', 2], ['Górnik Zabrze', 2], ['Cracovia', 2], ['Wisła Cracóvia', 1], ['Lechia Gdańsk', 1], ['Śląsk Wrocław', 1], ['Widzew Łódź', 1], ['Zagłębie Lubin', 1], ['Piast Gliwice', 1]] },
    { id: 'cze', cup: 'Copa da Tchéquia', name: 'Liga Tcheca', country: 'República Tcheca', flag: '🇨🇿', clubs: [['Slavia Praga', 3], ['Sparta Praga', 3], ['Viktoria Plzeň', 3], ['Baník Ostrava', 2], ['Slovan Liberec', 2], ['Mladá Boleslav', 2], ['Sigma Olomouc', 2], ['Bohemians 1905', 1], ['Hradec Králové', 1], ['Teplice', 1], ['Jablonec', 1], ['Zlín', 1]] },
    { id: 'mar', cup: 'Copa do Trono', name: 'Botola Pro', country: 'Marrocos', flag: '🇲🇦', clubs: [['Wydad', 3], ['Raja Casablanca', 3], ['AS FAR', 3], ['RS Berkane', 2], ['FUS Rabat', 2], ['Maghreb de Fès', 2], ['Hassania Agadir', 2], ['Ittihad Tânger', 2], ['Difaâ El Jadida', 1], ['Olympique Safi', 1], ['Moghreb Tétouan', 1], ['Union Touarga', 1]] },
    { id: 'egi', cup: 'Copa do Egito', name: 'Premier League Egípcia', country: 'Egito', flag: '🇪🇬', clubs: [['Al Ahly', 3], ['Zamalek', 3], ['Pyramids', 3], ['Al Masry', 2], ['Future FC', 2], ['Ceramica Cleopatra', 2], ['ZED FC', 2], ['Ismaily', 2], ['Smouha', 1], ['Al Ittihad Alexandria', 1], ['ENPPI', 1], ['Ghazl El Mahalla', 1], ['Petrojet', 1]] },
    { id: 'aus', cup: 'Copa da Austrália', name: 'A-League', country: 'Austrália', flag: '🇦🇺', wageMult: 1.5, clubs: [['Melbourne City', 3], ['Sydney FC', 3], ['Melbourne Victory', 2], ['Central Coast Mariners', 2], ['Western Sydney Wanderers', 2], ['Adelaide United', 2], ['Wellington Phoenix', 2], ['Macarthur', 2], ['Brisbane Roar', 1], ['Perth Glory', 1], ['Newcastle Jets', 1], ['Western United', 1]] },
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
  // Temporada 2025-26 na Europa, Turquia e Argentina: quem subiu e quem caiu (mesmo esquema: o id não muda).
  // [liga de origem, liga nova, nível, força]
  const MOVES_2025 = {
    'Leeds United': ['ing-2', 'ing', 3, 67], 'Burnley': ['ing-2', 'ing', 3, 65], 'Sunderland': ['ing-2', 'ing', 3, 65],
    'Leicester City': ['ing', 'ing-2', 2, 63], 'Ipswich Town': ['ing', 'ing-2', 2, 62],
    'Levante': ['esp-2', 'esp', 3, 65], 'Elche': ['esp-2', 'esp', 3, 65], 'Real Oviedo': ['esp-2', 'esp', 3, 65],
    'Leganés': ['esp', 'esp-2', 2, 62], 'Las Palmas': ['esp', 'esp-2', 2, 63], 'Real Valladolid': ['esp', 'esp-2', 2, 62],
    'Pisa': ['ita-2', 'ita', 3, 65], 'Cremonese': ['ita-2', 'ita', 3, 65],
    'Empoli': ['ita', 'ita-2', 2, 62], 'Monza': ['ita', 'ita-2', 2, 63],
    'Hamburgo': ['ale-2', 'ale', 3, 66], 'Holstein Kiel': ['ale', 'ale-2', 2, 62],
    'Metz': ['fra-2', 'fra', 3, 65], 'Auxerre': ['fra-2', 'fra', 3, 66],
    'Montpellier': ['fra', 'fra-2', 2, 62], 'Reims': ['fra', 'fra-2', 2, 63],
    'Tondela': ['por-2', 'por', 3, 65],
    'Vitesse': ['ned', 'ned-2', 2, 58], 'Willem II': ['ned', 'ned-2', 2, 60],
    'Sivasspor': ['tur', 'tur-2', 2, 61],
    'Banfield': ['arg-b', 'arg', 3, 65], 'Gimnasia La Plata': ['arg-b', 'arg', 3, 65], 'Tigre': ['arg-b', 'arg', 3, 65], 'Platense': ['arg-b', 'arg', 3, 66],
  };
  D.CLUBS.forEach(cl => {
    const m = MOVES_2025[cl.name];
    if (m && cl.league === m[0]) { cl.league = m[1]; cl.tier = m[2]; cl.strength = m[3]; }
  });
  // Temporada 2026 (Brasil e países de ano-calendário) e 2026-27 (Europa): força pelo nível atual.
  // Fonte: Opta Power Rankings de 02/10/2026 (987 de 998 clubes). A nota Opta vira força pela mesma
  // distribuição de forças que o jogo já tinha (75% nível atual + 25% força anterior, para não oscilar
  // demais com a fase); o nível (estrelas) segue a força, sem passar do teto/piso de cada liga.
  // Clubes sem nota Opta mantêm a força anterior. Chave = id do clube (não muda), valor = [nível, força].
  const STR_2026 = {
    'bra-c-0': [1, 51], 'bra-c-1': [2, 56], 'bra-c-2': [2, 54], 'bra-c-3': [1, 51], 'bra-c-4': [1, 48], 'bra-c-5': [2, 55], 'bra-c-6': [1, 49], 'bra-c-7': [3, 61], 'bra-c-8': [1, 48], 'bra-c-9': [2, 54], 'bra-c-10': [1, 49], 'bra-c-11': [1, 48], 'bra-c-12': [1, 50], 'bra-c-13': [1, 48], 'bra-c-14': [1, 49], 'bra-c-15': [1, 49], 'bra-c-16': [1, 50], 'bra-c-17': [1, 48], 'bra-c-18': [2, 54],
    'bra-b-0': [3, 66], 'bra-b-1': [2, 58], 'bra-b-2': [2, 57], 'bra-b-3': [2, 53], 'bra-b-4': [1, 53], 'bra-b-5': [2, 58], 'bra-b-6': [2, 59], 'bra-b-7': [2, 58], 'bra-b-8': [2, 58], 'bra-b-9': [2, 55], 'bra-b-10': [3, 62], 'bra-b-11': [2, 60], 'bra-b-12': [2, 57], 'bra-b-13': [2, 58], 'bra-b-14': [2, 58], 'bra-b-15': [2, 58], 'bra-b-16': [1, 52], 'bra-b-17': [2, 57], 'bra-b-18': [1, 50], 'bra-b-19': [1, 49],
    'bra-a-0': [3, 76], 'bra-a-1': [3, 73], 'bra-a-2': [3, 71], 'bra-a-3': [3, 70], 'bra-a-4': [3, 69], 'bra-a-5': [3, 71], 'bra-a-6': [3, 70], 'bra-a-7': [3, 66], 'bra-a-8': [3, 68], 'bra-a-9': [3, 71], 'bra-a-10': [3, 70], 'bra-a-11': [3, 70], 'bra-a-12': [2, 61], 'bra-a-13': [3, 70], 'bra-a-14': [3, 69], 'bra-a-15': [3, 69], 'bra-a-16': [3, 66], 'bra-a-17': [2, 60], 'bra-a-18': [3, 68],
    'arg-0': [3, 71], 'arg-1': [3, 72], 'arg-2': [3, 68], 'arg-3': [3, 70], 'arg-4': [3, 67], 'arg-5': [3, 71], 'arg-6': [3, 70], 'arg-7': [3, 66], 'arg-8': [3, 71], 'arg-9': [3, 69], 'arg-10': [3, 69], 'arg-11': [3, 66], 'arg-12': [3, 70], 'arg-13': [2, 64], 'arg-14': [3, 69], 'arg-15': [3, 68], 'arg-16': [3, 64], 'arg-17': [3, 67], 'arg-18': [3, 69], 'arg-19': [3, 65], 'arg-20': [3, 63], 'arg-21': [3, 70], 'arg-22': [3, 63], 'arg-23': [3, 66], 'arg-24': [3, 64], 'arg-25': [2, 62],
    'por-0': [4, 78], 'por-1': [4, 76], 'por-2': [4, 76], 'por-3': [4, 72], 'por-4': [3, 66], 'por-5': [3, 69], 'por-6': [3, 66], 'por-7': [3, 64], 'por-8': [3, 63], 'por-9': [3, 64], 'por-10': [3, 63], 'por-11': [3, 66], 'por-12': [3, 67], 'por-13': [3, 63], 'por-14': [3, 62], 'por-15': [2, 59], 'por-16': [3, 63],
    'esp-0': [5, 82], 'esp-1': [5, 83], 'esp-2': [4, 77], 'esp-3': [4, 73], 'esp-4': [4, 72], 'esp-5': [4, 73], 'esp-6': [4, 72], 'esp-7': [4, 73], 'esp-8': [4, 71], 'esp-9': [4, 71], 'esp-10': [3, 70], 'esp-11': [3, 69], 'esp-12': [2, 65], 'esp-13': [4, 71], 'esp-14': [2, 65], 'esp-15': [3, 70], 'esp-16': [2, 63], 'esp-17': [3, 68], 'esp-18': [2, 61], 'esp-19': [2, 61],
    'ing-0': [5, 87], 'ing-1': [5, 83], 'ing-2': [5, 86], 'ing-3': [4, 79], 'ing-4': [4, 79], 'ing-5': [4, 77], 'ing-6': [4, 78], 'ing-7': [4, 78], 'ing-8': [4, 79], 'ing-9': [2, 71], 'ing-10': [4, 77], 'ing-11': [4, 74], 'ing-12': [2, 71], 'ing-13': [4, 73], 'ing-14': [4, 76], 'ing-15': [4, 74], 'ing-16': [4, 75], 'ing-17': [2, 61], 'ing-18': [4, 71],
    'ita-0': [5, 81], 'ita-1': [4, 76], 'ita-2': [4, 74], 'ita-3': [4, 74], 'ita-4': [4, 77], 'ita-5': [4, 72], 'ita-6': [4, 72], 'ita-7': [4, 71], 'ita-8': [4, 71], 'ita-9': [3, 69], 'ita-10': [3, 68], 'ita-11': [3, 70], 'ita-12': [3, 70], 'ita-13': [3, 69], 'ita-14': [2, 62], 'ita-15': [3, 66], 'ita-16': [3, 66], 'ita-17': [4, 73], 'ita-18': [2, 59], 'ita-19': [3, 65],
    'ale-0': [5, 87], 'ale-1': [4, 77], 'ale-2': [4, 78], 'ale-3': [4, 73], 'ale-4': [4, 72], 'ale-5': [4, 73], 'ale-6': [2, 65], 'ale-7': [4, 72], 'ale-8': [3, 70], 'ale-9': [3, 69], 'ale-10': [4, 71], 'ale-11': [4, 71], 'ale-12': [3, 70], 'ale-13': [3, 68], 'ale-14': [3, 68], 'ale-15': [2, 63], 'ale-16': [2, 62], 'ale-17': [2, 61],
    'fra-0': [5, 83], 'fra-1': [4, 75], 'fra-2': [4, 73], 'fra-3': [4, 73], 'fra-4': [4, 72], 'fra-5': [3, 68], 'fra-6': [4, 73], 'fra-7': [4, 71], 'fra-8': [2, 62], 'fra-9': [3, 70], 'fra-10': [4, 71], 'fra-11': [2, 61], 'fra-12': [2, 62], 'fra-13': [3, 69], 'fra-14': [3, 66], 'fra-15': [3, 66], 'fra-16': [3, 68], 'fra-17': [3, 70],
    'ara-0': [3, 71], 'ara-1': [3, 69], 'ara-2': [3, 64], 'ara-3': [3, 67], 'ara-4': [3, 59], 'ara-5': [3, 61], 'ara-6': [3, 60], 'ara-7': [3, 68], 'ara-8': [3, 58], 'ara-9': [3, 59], 'ara-10': [3, 58], 'ara-11': [2, 55], 'ara-12': [3, 58], 'ara-13': [1, 54], 'ara-14': [3, 59], 'ara-15': [3, 58], 'ara-16': [1, 54], 'ara-17': [3, 60],
    'usa-0': [3, 68], 'usa-1': [3, 65], 'usa-2': [3, 67], 'usa-3': [3, 65], 'usa-4': [3, 63], 'usa-5': [3, 65], 'usa-6': [3, 65], 'usa-7': [3, 64], 'usa-8': [3, 63], 'usa-9': [3, 68], 'usa-10': [3, 64], 'usa-11': [3, 64], 'usa-12': [3, 68], 'usa-13': [3, 63], 'usa-14': [3, 63], 'usa-15': [3, 63], 'usa-16': [3, 65], 'usa-17': [3, 67], 'usa-18': [3, 66], 'usa-19': [3, 64], 'usa-20': [3, 64], 'usa-21': [3, 66], 'usa-22': [3, 60], 'usa-23': [3, 63], 'usa-24': [3, 63], 'usa-25': [3, 64], 'usa-26': [3, 61], 'usa-27': [3, 63], 'usa-28': [3, 61], 'usa-29': [3, 67],
    'arg-b-0': [3, 63], 'arg-b-1': [3, 68], 'arg-b-2': [3, 67], 'arg-b-3': [3, 65], 'arg-b-4': [2, 60], 'arg-b-5': [2, 60], 'arg-b-6': [2, 58], 'arg-b-7': [2, 62], 'arg-b-8': [2, 59], 'arg-b-9': [2, 60], 'arg-b-10': [2, 60], 'arg-b-11': [2, 61], 'arg-b-12': [2, 60], 'arg-b-13': [2, 58], 'arg-b-14': [2, 58],
    'uru-0': [3, 70], 'uru-1': [3, 65], 'uru-2': [2, 60], 'uru-3': [2, 59], 'uru-4': [2, 62], 'uru-5': [2, 60], 'uru-6': [2, 59], 'uru-7': [1, 53], 'uru-8': [2, 58], 'uru-9': [2, 60], 'uru-10': [1, 54], 'uru-11': [2, 57], 'uru-12': [2, 55], 'uru-13': [1, 51],
    'col-0': [3, 71], 'col-1': [3, 68], 'col-2': [3, 67], 'col-3': [3, 64], 'col-4': [3, 64], 'col-5': [3, 66], 'col-6': [2, 62], 'col-7': [3, 63], 'col-8': [3, 65], 'col-9': [3, 63], 'col-10': [2, 57], 'col-11': [2, 59], 'col-12': [2, 58], 'col-13': [2, 55],
    'por-2-0': [1, 54], 'por-2-1': [3, 62], 'por-2-2': [2, 57], 'por-2-3': [2, 59], 'por-2-4': [2, 60], 'por-2-5': [2, 56], 'por-2-6': [2, 57], 'por-2-7': [1, 52], 'por-2-8': [1, 53], 'por-2-9': [2, 57], 'por-2-10': [2, 58], 'por-2-11': [2, 56], 'por-2-12': [2, 58], 'por-2-13': [2, 58], 'por-2-14': [2, 56], 'por-2-15': [2, 55],
    'esp-2-0': [3, 67], 'esp-2-1': [2, 62], 'esp-2-2': [2, 60], 'esp-2-3': [3, 68], 'esp-2-4': [3, 66], 'esp-2-5': [2, 59], 'esp-2-6': [2, 65], 'esp-2-7': [3, 68], 'esp-2-8': [3, 69], 'esp-2-9': [2, 64], 'esp-2-10': [2, 63], 'esp-2-11': [2, 61], 'esp-2-12': [2, 61], 'esp-2-13': [2, 58], 'esp-2-14': [2, 59], 'esp-2-15': [2, 60], 'esp-2-16': [2, 63], 'esp-2-17': [2, 60], 'esp-2-18': [2, 65], 'esp-2-19': [2, 60],
    'ing-2-0': [4, 75], 'ing-2-1': [2, 66], 'ing-2-2': [2, 69], 'ing-2-3': [2, 60], 'ing-2-4': [2, 62], 'ing-2-5': [2, 62], 'ing-2-6': [4, 73], 'ing-2-7': [2, 65], 'ing-2-8': [3, 70], 'ing-2-9': [2, 68], 'ing-2-10': [2, 64], 'ing-2-11': [2, 63], 'ing-2-12': [4, 71], 'ing-2-13': [2, 62], 'ing-2-14': [2, 61], 'ing-2-15': [2, 62], 'ing-2-16': [2, 63], 'ing-2-17': [2, 65], 'ing-2-18': [2, 65], 'ing-2-19': [2, 61], 'ing-2-20': [2, 61], 'ing-2-21': [2, 60], 'ing-2-22': [2, 61], 'ing-2-23': [2, 60], 'ing-2-24': [2, 64], 'ing-2-25': [2, 64],
    'ita-2-0': [2, 63], 'ita-2-1': [2, 59], 'ita-2-2': [1, 54], 'ita-2-3': [2, 56], 'ita-2-4': [2, 55], 'ita-2-5': [2, 61], 'ita-2-6': [1, 54], 'ita-2-7': [2, 61], 'ita-2-8': [2, 60], 'ita-2-9': [3, 62], 'ita-2-10': [3, 66], 'ita-2-11': [2, 60], 'ita-2-12': [1, 53], 'ita-2-13': [2, 58], 'ita-2-14': [2, 58], 'ita-2-15': [2, 56], 'ita-2-16': [2, 58], 'ita-2-17': [2, 57], 'ita-2-18': [2, 57], 'ita-2-19': [2, 55],
    'ale-2-0': [3, 67], 'ale-2-1': [3, 67], 'ale-2-2': [2, 64], 'ale-2-3': [2, 62], 'ale-2-4': [2, 62], 'ale-2-5': [2, 62], 'ale-2-6': [2, 58], 'ale-2-7': [2, 59], 'ale-2-8': [3, 66], 'ale-2-9': [2, 60], 'ale-2-10': [2, 59], 'ale-2-11': [2, 61], 'ale-2-12': [3, 67], 'ale-2-13': [2, 60], 'ale-2-14': [2, 59], 'ale-2-15': [2, 56], 'ale-2-16': [2, 55], 'ale-2-17': [2, 59],
    'fra-2-0': [2, 63], 'fra-2-1': [2, 57], 'fra-2-2': [2, 61], 'fra-2-3': [2, 59], 'fra-2-4': [2, 56], 'fra-2-5': [2, 55], 'fra-2-6': [3, 67], 'fra-2-7': [2, 59], 'fra-2-8': [2, 58], 'fra-2-9': [3, 63], 'fra-2-10': [2, 57], 'fra-2-11': [2, 56], 'fra-2-12': [2, 57], 'fra-2-13': [2, 58], 'fra-2-14': [2, 55], 'fra-2-15': [2, 56], 'fra-2-16': [2, 58], 'fra-2-17': [2, 55],
    'ned-0': [4, 73], 'ned-1': [4, 74], 'ned-2': [4, 71], 'ned-3': [4, 71], 'ned-4': [3, 70], 'ned-5': [3, 64], 'ned-6': [3, 63], 'ned-7': [3, 63], 'ned-8': [2, 61], 'ned-9': [1, 54], 'ned-10': [2, 62], 'ned-11': [2, 62], 'ned-12': [2, 60], 'ned-13': [2, 55], 'ned-14': [2, 59], 'ned-15': [2, 56], 'ned-16': [2, 58], 'ned-17': [2, 61], 'ned-18': [2, 59], 'ned-19': [1, 54],
    'tur-0': [4, 73], 'tur-1': [4, 72], 'tur-2': [4, 71], 'tur-3': [3, 67], 'tur-4': [3, 64], 'tur-5': [2, 62], 'tur-6': [2, 56], 'tur-7': [2, 62], 'tur-8': [2, 62], 'tur-9': [2, 62], 'tur-10': [1, 54], 'tur-11': [2, 57], 'tur-12': [2, 62], 'tur-13': [2, 62], 'tur-14': [2, 60], 'tur-15': [2, 58], 'tur-16': [2, 60], 'tur-17': [2, 60], 'tur-18': [2, 55],
    'mex-0': [3, 69], 'mex-1': [3, 69], 'mex-2': [3, 66], 'mex-3': [3, 64], 'mex-4': [3, 68], 'mex-5': [3, 63], 'mex-6': [3, 69], 'mex-7': [2, 60], 'mex-8': [3, 64], 'mex-9': [3, 63], 'mex-10': [2, 61], 'mex-11': [2, 60], 'mex-12': [2, 59], 'mex-13': [2, 62], 'mex-14': [2, 61], 'mex-15': [2, 58], 'mex-16': [2, 61], 'mex-17': [2, 59],
    'bra-d-0': [1, 49], 'bra-d-1': [1, 49], 'bra-d-2': [1, 49], 'bra-d-3': [1, 48], 'bra-d-4': [1, 48], 'bra-d-5': [1, 48], 'bra-d-6': [1, 48], 'bra-d-7': [1, 51], 'bra-d-8': [1, 51], 'bra-d-9': [1, 48], 'bra-d-10': [1, 50], 'bra-d-11': [1, 48], 'bra-d-12': [1, 48], 'bra-d-13': [1, 50], 'bra-d-14': [1, 47], 'bra-d-15': [1, 47],
    'bel-0': [4, 76], 'bel-1': [4, 71], 'bel-2': [4, 75], 'bel-3': [3, 70], 'bel-4': [3, 69], 'bel-5': [3, 64], 'bel-6': [3, 65], 'bel-7': [3, 63], 'bel-8': [2, 62], 'bel-9': [3, 68], 'bel-10': [3, 65], 'bel-11': [2, 61], 'bel-12': [3, 65], 'bel-13': [2, 58], 'bel-14': [3, 64], 'bel-15': [2, 58],
    'sco-0': [3, 68], 'sco-1': [3, 66], 'sco-2': [2, 58], 'sco-3': [2, 62], 'sco-4': [2, 60], 'sco-5': [2, 58], 'sco-6': [2, 59], 'sco-7': [2, 56], 'sco-8': [2, 56], 'sco-9': [2, 56], 'sco-10': [1, 48], 'sco-11': [1, 54],
    'gre-0': [3, 72], 'gre-1': [3, 70], 'gre-2': [3, 70], 'gre-3': [3, 70], 'gre-4': [3, 63], 'gre-5': [2, 62], 'gre-6': [2, 58], 'gre-7': [2, 59], 'gre-8': [2, 56], 'gre-9': [2, 56], 'gre-10': [1, 48], 'gre-11': [2, 57],
    'sui-0': [3, 68], 'sui-1': [3, 63], 'sui-2': [3, 63], 'sui-3': [3, 67], 'sui-4': [2, 59], 'sui-5': [3, 64], 'sui-6': [2, 62], 'sui-7': [2, 58], 'sui-8': [3, 64], 'sui-9': [2, 58], 'sui-10': [2, 56], 'sui-11': [1, 54],
    'aut-0': [3, 71], 'aut-1': [3, 67], 'aut-2': [3, 65], 'aut-3': [2, 62], 'aut-4': [3, 68], 'aut-5': [2, 59], 'aut-6': [2, 59], 'aut-7': [2, 58], 'aut-8': [2, 58], 'aut-9': [1, 54], 'aut-10': [2, 57], 'aut-11': [2, 57],
    'den-0': [3, 71], 'den-1': [3, 70], 'den-2': [3, 63], 'den-3': [3, 64], 'den-4': [3, 67], 'den-5': [2, 61], 'den-6': [2, 61], 'den-7': [3, 63], 'den-8': [1, 54], 'den-9': [2, 58], 'den-10': [2, 59], 'den-11': [1, 52],
    'chi-0': [3, 69], 'chi-1': [3, 67], 'chi-2': [3, 66], 'chi-3': [2, 62], 'chi-4': [2, 60], 'chi-5': [2, 61], 'chi-6': [2, 61], 'chi-7': [2, 62], 'chi-8': [2, 58], 'chi-9': [2, 60], 'chi-10': [2, 55], 'chi-11': [2, 55],
    'par-0': [3, 69], 'par-1': [3, 67], 'par-2': [3, 63], 'par-3': [3, 63], 'par-4': [3, 63], 'par-5': [2, 58], 'par-6': [2, 61], 'par-7': [2, 59], 'par-8': [2, 58], 'par-9': [1, 50],
    'ecu-0': [3, 70], 'ecu-1': [3, 65], 'ecu-2': [3, 70], 'ecu-3': [2, 62], 'ecu-4': [3, 64], 'ecu-5': [3, 66], 'ecu-6': [2, 59], 'ecu-7': [1, 52], 'ecu-8': [2, 58], 'ecu-9': [2, 59], 'ecu-10': [2, 62],
    'jpn-0': [3, 67], 'jpn-1': [3, 66], 'jpn-2': [3, 63], 'jpn-3': [3, 64], 'jpn-4': [3, 63], 'jpn-5': [3, 67], 'jpn-6': [2, 61], 'jpn-7': [2, 61], 'jpn-8': [2, 62], 'jpn-9': [2, 59], 'jpn-10': [2, 62], 'jpn-11': [3, 63], 'jpn-12': [1, 53], 'jpn-13': [1, 52],
    'kor-0': [2, 62], 'kor-1': [2, 62], 'kor-2': [2, 59], 'kor-3': [2, 62], 'kor-4': [2, 59], 'kor-5': [2, 58], 'kor-6': [2, 55], 'kor-7': [2, 59], 'kor-8': [2, 57], 'kor-9': [2, 57], 'kor-10': [1, 53], 'kor-11': [1, 52],
    'qat-0': [3, 63], 'qat-1': [2, 60], 'qat-2': [2, 60], 'qat-3': [2, 56], 'qat-4': [2, 56], 'qat-5': [2, 54], 'qat-6': [2, 54], 'qat-7': [1, 50],
    'ned-2-0': [2, 59], 'ned-2-1': [2, 59], 'ned-2-2': [2, 55], 'ned-2-3': [1, 54], 'ned-2-4': [2, 56], 'ned-2-5': [2, 55], 'ned-2-6': [1, 52], 'ned-2-7': [1, 52], 'ned-2-8': [1, 53], 'ned-2-9': [1, 51], 'ned-2-10': [1, 50], 'ned-2-11': [1, 52], 'ned-2-12': [1, 49], 'ned-2-13': [1, 49],
    'tur-2-0': [2, 56], 'tur-2-1': [2, 55], 'tur-2-2': [2, 61], 'tur-2-3': [2, 61], 'tur-2-4': [1, 52], 'tur-2-5': [2, 55], 'tur-2-6': [1, 52], 'tur-2-7': [1, 54], 'tur-2-8': [1, 53], 'tur-2-9': [2, 55], 'tur-2-10': [1, 52], 'tur-2-11': [1, 48], 'tur-2-12': [1, 48], 'tur-2-13': [2, 58],
    'mex-2-0': [2, 62], 'mex-2-1': [1, 51], 'mex-2-2': [2, 57], 'mex-2-3': [1, 54], 'mex-2-4': [2, 55], 'mex-2-5': [1, 54], 'mex-2-6': [2, 56], 'mex-2-7': [2, 56], 'mex-2-8': [1, 54], 'mex-2-9': [2, 56], 'mex-2-10': [2, 56], 'mex-2-11': [1, 54], 'mex-2-12': [1, 54], 'mex-2-13': [1, 47],
    'bel-2-0': [2, 60], 'bel-2-1': [3, 63], 'bel-2-2': [1, 53], 'bel-2-3': [2, 56], 'bel-2-4': [1, 54], 'bel-2-5': [2, 56], 'bel-2-6': [2, 55], 'bel-2-7': [1, 53], 'bel-2-8': [2, 55], 'bel-2-9': [2, 59], 'bel-2-10': [2, 61], 'bel-2-11': [1, 51],
    'sco-2-0': [2, 58], 'sco-2-1': [1, 50], 'sco-2-2': [1, 53], 'sco-2-3': [1, 50], 'sco-2-4': [1, 51], 'sco-2-5': [1, 48], 'sco-2-6': [1, 48], 'sco-2-7': [1, 48], 'sco-2-8': [1, 48], 'sco-2-9': [1, 49],
    'gre-2-0': [2, 59], 'gre-2-1': [2, 58], 'gre-2-2': [1, 54], 'gre-2-3': [1, 52], 'gre-2-4': [1, 50], 'gre-2-5': [1, 50], 'gre-2-6': [1, 50], 'gre-2-7': [1, 49], 'gre-2-8': [1, 51], 'gre-2-9': [1, 48], 'gre-2-10': [1, 49], 'gre-2-11': [1, 47],
    'sui-2-0': [2, 58], 'sui-2-1': [2, 60], 'sui-2-2': [1, 54], 'sui-2-3': [1, 54], 'sui-2-4': [1, 50], 'sui-2-5': [2, 56], 'sui-2-6': [1, 53], 'sui-2-7': [1, 49], 'sui-2-8': [1, 52], 'sui-2-9': [1, 47],
    'aut-2-0': [2, 56], 'aut-2-1': [2, 60], 'aut-2-2': [1, 51], 'aut-2-3': [1, 54], 'aut-2-4': [2, 55], 'aut-2-5': [2, 55], 'aut-2-6': [2, 55], 'aut-2-7': [1, 50], 'aut-2-8': [1, 49], 'aut-2-9': [1, 52], 'aut-2-10': [1, 48], 'aut-2-11': [1, 47],
    'den-2-0': [2, 61], 'den-2-1': [1, 54], 'den-2-2': [2, 56], 'den-2-3': [1, 52], 'den-2-4': [1, 53], 'den-2-5': [1, 52], 'den-2-6': [1, 52], 'den-2-7': [2, 60], 'den-2-8': [1, 49], 'den-2-9': [1, 48], 'den-2-10': [1, 49], 'den-2-11': [1, 50],
    'chi-2-0': [2, 61], 'chi-2-1': [2, 59], 'chi-2-2': [2, 56], 'chi-2-3': [2, 55], 'chi-2-4': [2, 57], 'chi-2-5': [1, 53], 'chi-2-6': [2, 56], 'chi-2-7': [1, 54], 'chi-2-8': [2, 56], 'chi-2-9': [1, 50], 'chi-2-10': [2, 55], 'chi-2-11': [2, 56],
    'par-2-0': [2, 60], 'par-2-1': [2, 57], 'par-2-2': [1, 54], 'par-2-3': [1, 53], 'par-2-4': [1, 54], 'par-2-5': [1, 53], 'par-2-6': [1, 52], 'par-2-7': [1, 51], 'par-2-8': [2, 55], 'par-2-9': [1, 51], 'par-2-10': [1, 48], 'par-2-11': [1, 50],
    'ecu-2-0': [2, 55], 'ecu-2-1': [1, 53], 'ecu-2-2': [1, 52], 'ecu-2-3': [2, 55], 'ecu-2-4': [2, 60], 'ecu-2-5': [2, 56], 'ecu-2-6': [2, 56], 'ecu-2-7': [2, 56], 'ecu-2-8': [2, 57], 'ecu-2-9': [1, 53],
    'uru-2-0': [1, 51], 'uru-2-1': [1, 51], 'uru-2-2': [1, 54], 'uru-2-3': [1, 49], 'uru-2-4': [2, 58], 'uru-2-5': [2, 59], 'uru-2-6': [1, 48], 'uru-2-7': [1, 52], 'uru-2-8': [1, 53], 'uru-2-9': [1, 50], 'uru-2-10': [1, 50], 'uru-2-11': [2, 60],
    'col-2-0': [2, 59], 'col-2-1': [2, 60], 'col-2-2': [1, 53], 'col-2-3': [1, 54], 'col-2-4': [1, 53], 'col-2-5': [1, 53], 'col-2-6': [1, 53], 'col-2-7': [1, 52], 'col-2-8': [2, 55], 'col-2-9': [1, 51], 'col-2-10': [2, 55], 'col-2-11': [2, 55], 'col-2-12': [2, 57], 'col-2-13': [1, 54],
    'jpn-2-0': [1, 53], 'jpn-2-1': [2, 55], 'jpn-2-2': [2, 55], 'jpn-2-3': [1, 54], 'jpn-2-4': [2, 56], 'jpn-2-5': [1, 52], 'jpn-2-6': [1, 52], 'jpn-2-7': [1, 53], 'jpn-2-8': [1, 53], 'jpn-2-9': [1, 52], 'jpn-2-10': [1, 53], 'jpn-2-11': [1, 51], 'jpn-2-12': [1, 50], 'jpn-2-13': [1, 52],
    'kor-2-0': [2, 57], 'kor-2-1': [1, 54], 'kor-2-2': [1, 54], 'kor-2-3': [1, 52], 'kor-2-4': [2, 56], 'kor-2-5': [1, 53], 'kor-2-6': [2, 55], 'kor-2-7': [1, 52], 'kor-2-8': [1, 49], 'kor-2-9': [1, 49], 'kor-2-10': [1, 49], 'kor-2-11': [1, 49],
    'ara-2-0': [3, 56], 'ara-2-1': [1, 53], 'ara-2-2': [1, 50], 'ara-2-3': [1, 50], 'ara-2-4': [1, 50], 'ara-2-5': [1, 50], 'ara-2-6': [1, 54], 'ara-2-7': [1, 51], 'ara-2-8': [1, 49], 'ara-2-9': [3, 55], 'ara-2-10': [3, 53], 'ara-2-11': [1, 47],
    'usa-2-0': [2, 56], 'usa-2-1': [2, 56], 'usa-2-2': [1, 53], 'usa-2-3': [2, 56], 'usa-2-4': [1, 54], 'usa-2-5': [1, 53], 'usa-2-6': [1, 53], 'usa-2-7': [1, 52], 'usa-2-8': [1, 54], 'usa-2-9': [1, 54], 'usa-2-10': [1, 52], 'usa-2-11': [1, 49],
    'qat-2-0': [2, 57], 'qat-2-1': [1, 52], 'qat-2-2': [1, 49], 'qat-2-3': [1, 49], 'qat-2-4': [2, 53], 'qat-2-5': [1, 48], 'qat-2-6': [1, 49], 'qat-2-7': [2, 50],
    'per-0': [3, 66], 'per-1': [3, 65], 'per-2': [3, 63], 'per-3': [3, 63], 'per-4': [2, 62], 'per-5': [2, 61], 'per-6': [2, 60], 'per-7': [2, 57], 'per-8': [2, 58], 'per-9': [2, 60], 'per-10': [1, 52], 'per-11': [2, 58], 'per-12': [2, 59], 'per-13': [2, 55],
    'bol-0': [2, 67], 'bol-1': [2, 63], 'bol-2': [2, 63], 'bol-3': [2, 56], 'bol-4': [2, 58], 'bol-5': [2, 58], 'bol-6': [2, 59], 'bol-7': [2, 55], 'bol-8': [2, 58], 'bol-9': [2, 55], 'bol-10': [2, 56], 'bol-11': [1, 54],
    'ven-0': [2, 63], 'ven-1': [2, 59], 'ven-2': [2, 58], 'ven-3': [2, 62], 'ven-4': [2, 59], 'ven-5': [2, 60], 'ven-6': [2, 59], 'ven-7': [2, 60], 'ven-8': [2, 55], 'ven-9': [2, 56], 'ven-10': [2, 56], 'ven-11': [1, 53],
    'cro-0': [3, 71], 'cro-1': [3, 68], 'cro-2': [3, 66], 'cro-3': [3, 63], 'cro-4': [3, 63], 'cro-5': [2, 60], 'cro-6': [2, 58], 'cro-7': [2, 58], 'cro-8': [2, 59], 'cro-9': [1, 48], 'cro-10': [2, 55],
    'srb-0': [3, 69], 'srb-1': [2, 61], 'srb-2': [2, 61], 'srb-3': [1, 54], 'srb-4': [2, 56], 'srb-5': [2, 56], 'srb-6': [2, 56], 'srb-7': [1, 50], 'srb-8': [1, 49], 'srb-9': [1, 54], 'srb-10': [2, 55], 'srb-11': [1, 53],
    'nor-0': [3, 74], 'nor-1': [3, 65], 'nor-2': [3, 65], 'nor-3': [3, 65], 'nor-4': [3, 69], 'nor-5': [2, 61], 'nor-6': [2, 61], 'nor-7': [2, 61], 'nor-8': [3, 64], 'nor-9': [2, 58], 'nor-10': [2, 57], 'nor-11': [1, 53], 'nor-12': [2, 56],
    'swe-0': [3, 64], 'swe-1': [3, 65], 'swe-2': [2, 61], 'swe-3': [3, 65], 'swe-4': [2, 61], 'swe-5': [2, 62], 'swe-6': [2, 61], 'swe-7': [2, 59], 'swe-8': [2, 57], 'swe-9': [2, 62], 'swe-10': [1, 54], 'swe-11': [2, 59], 'swe-12': [2, 56],
    'pol-0': [3, 69], 'pol-1': [3, 70], 'pol-2': [3, 63], 'pol-3': [3, 65], 'pol-4': [3, 64], 'pol-5': [3, 66], 'pol-6': [2, 61], 'pol-7': [3, 63], 'pol-8': [1, 54], 'pol-9': [2, 60], 'pol-10': [2, 59], 'pol-11': [2, 59], 'pol-12': [2, 59],
    'cze-0': [3, 72], 'cze-1': [3, 69], 'cze-2': [3, 67], 'cze-3': [2, 60], 'cze-4': [3, 64], 'cze-5': [2, 61], 'cze-6': [2, 61], 'cze-7': [2, 60], 'cze-8': [2, 61], 'cze-9': [2, 60], 'cze-10': [2, 59], 'cze-11': [1, 54],
    'mar-0': [2, 61], 'mar-1': [3, 64], 'mar-2': [3, 64], 'mar-3': [3, 64], 'mar-4': [2, 59], 'mar-5': [2, 62], 'mar-6': [2, 57], 'mar-7': [2, 58], 'mar-8': [2, 56], 'mar-9': [1, 52], 'mar-10': [2, 55], 'mar-11': [1, 54],
    'egi-0': [3, 68], 'egi-1': [3, 64], 'egi-2': [3, 67], 'egi-3': [2, 60], 'egi-4': [2, 58], 'egi-5': [2, 61], 'egi-6': [2, 58], 'egi-7': [1, 52], 'egi-8': [2, 56], 'egi-9': [2, 56], 'egi-10': [2, 56], 'egi-11': [1, 53], 'egi-12': [2, 55],
    'aus-0': [2, 61], 'aus-1': [2, 59], 'aus-2': [2, 58], 'aus-3': [2, 55], 'aus-4': [2, 55], 'aus-5': [2, 56], 'aus-6': [2, 55], 'aus-7': [1, 54], 'aus-8': [1, 53], 'aus-9': [1, 53], 'aus-10': [2, 55], 'aus-11': [1, 47],
  };
  // Quem subiu e quem caiu para 2026 / 2026-27 (liga atual de cada clube no Opta). id -> liga nova.
  const MOVES_2026 = {
    'ale-6': 'ale-2', 'ale-15': 'ale-2', 'ale-16': 'ale-2', // Wolfsburg, Heidenheim, St. Pauli
    'ale-2-1': 'ale', 'ale-2-8': 'ale', 'ale-2-12': 'ale', // Schalke 04, Paderborn, Elversberg
    'ara-11': 'ara-2', 'ara-13': 'ara-2', 'ara-16': 'ara-2', // Damac, Al-Okhdood, Al-Najma
    'ara-2-0': 'ara', 'ara-2-9': 'ara', 'ara-2-10': 'ara', // Al-Faisaly, Al-Diriyah, Abha
    'arg-13': 'arg-b', 'arg-25': 'arg-b', // Godoy Cruz, San Martín de San Juan
    'aut-9': 'aut-2', // Blau-Weiss Linz
    'aut-2-1': 'aut', // Austria Lustenau
    'bel-13': 'bel-2', // Dender
    'bel-2-1': 'bel', 'bel-2-9': 'bel', 'bel-2-10': 'bel', // Lommel, Kortrijk, Beveren
    'bra-b-7': 'bra-b', 'bra-b-8': 'bra-b', 'bra-a-12': 'bra-b', 'bra-a-17': 'bra-b', // Sport, Ceará, Fortaleza, Juventude
    'bra-b-0': 'bra-a', 'bra-b-10': 'bra-a', 'bra-a-14': 'bra-a', // Coritiba, Chapecoense, Athletico-PR
    'bra-b-4': 'bra-c', 'bra-b-16': 'bra-c', // Guarani, Santa Cruz
    'bra-b-18': 'bra-d', 'bra-b-19': 'bra-d', // Portuguesa, CSA
    'bra-c-7': 'bra-a', // Remo
    'bra-c-1': 'bra-b', 'bra-c-2': 'bra-b', 'bra-c-5': 'bra-b', 'bra-c-9': 'bra-b', 'bra-c-18': 'bra-b', // Náutico, Londrina, São Bernardo, Botafogo-SP, Athletic-MG
    'bra-c-8': 'bra-d', 'bra-c-13': 'bra-d', // ABC, Tombense
    'bra-d-10': 'bra-c', 'bra-d-12': 'bra-c', 'bra-d-13': 'bra-c', // Inter de Limeira, Anápolis, Maringá
    'chi-8': 'chi-2', 'chi-10': 'chi-2', 'chi-11': 'chi-2', // Cobreloa, Unión Española, Deportes Iquique
    'col-13': 'col-2', // Envigado
    'col-2-1': 'col', 'col-2-12': 'col', // Cúcuta Deportivo, Jaguares de Córdoba
    'den-8': 'den-2', 'den-11': 'den-2', // Vejle, Fredericia
    'den-2-0': 'den', 'den-2-7': 'den', // Lyngby, Horsens
    'ecu-7': 'ecu-2', // El Nacional
    'ecu-2-4': 'ecu', 'ecu-2-8': 'ecu', // Guayaquil City, Manta
    'esp-12': 'esp-2', 'esp-14': 'esp-2', 'esp-2-10': 'esp-2', // Mallorca, Girona, Real Oviedo
    'esp-2-0': 'esp', 'esp-2-3': 'esp', 'esp-2-4': 'esp', // Racing Santander, Deportivo La Coruña, Málaga
    'fra-8': 'fra-2', 'fra-2-2': 'fra-2', // Nantes, Metz
    'fra-2-9': 'fra', // Troyes
    'gre-2-0': 'gre', 'gre-2-1': 'gre', // Iraklis, Kalamata
    'ing-9': 'ing-2', 'ing-12': 'ing-2', 'ing-2-7': 'ing-2', // West Ham, Wolverhampton, Burnley
    'ing-18': 'ing', 'ing-2-8': 'ing', 'ing-2-12': 'ing', // Ipswich Town, Coventry City, Hull City
    'ita-14': 'ita-2', 'ita-2-5': 'ita-2', 'ita-2-7': 'ita-2', // Verona, Cremonese, Pisa
    'ita-19': 'ita', 'ita-2-9': 'ita', 'ita-2-10': 'ita', // Monza, Venezia, Frosinone
    'jpn-12': 'jpn-2', 'jpn-13': 'jpn-2', // Albirex Niigata, Shonan Bellmare
    'kor-6': 'kor-2', 'kor-11': 'kor-2', // Suwon FC, Daegu
    'kor-2-4': 'kor', // Bucheon FC
    'mex-2-0': 'mex', // Atlante
    'ned-13': 'ned-2', 'ned-15': 'ned-2', 'ned-19': 'ned-2', // NAC Breda, Heracles, FC Volendam
    'ned-16': 'ned', 'ned-2-0': 'ned', 'ned-2-1': 'ned', // Willem II, ADO Den Haag, Cambuur
    'par-9': 'par-2', // Tacuary
    'par-2-0': 'par', // Rubio Ñu
    'por-15': 'por-2', 'por-2-4': 'por-2', // AVS, Tondela
    'por-2-1': 'por', // Marítimo
    'qat-7': 'qat-2', // Umm Salal
    'qat-2-0': 'qat', 'qat-2-4': 'qat', 'qat-2-7': 'qat', // Al-Shamal, Lusail, Al-Shahania
    'sui-10': 'sui-2', 'sui-11': 'sui-2', // Winterthur, Yverdon
    'sui-2-1': 'sui', // Vaduz
    'tur-6': 'tur-2', 'tur-11': 'tur-2', 'tur-18': 'tur-2', // Antalyaspor, Kayserispor, Fatih Karagümrük
    'tur-2-2': 'tur', 'tur-2-3': 'tur', 'tur-2-13': 'tur', // Çorum FK, Erzurumspor, Amedspor
    'uru-7': 'uru-2', 'uru-10': 'uru-2', 'uru-13': 'uru-2', // River Plate (URU), Plaza Colonia, Fénix
    'uru-2-4': 'uru', 'uru-2-5': 'uru', 'uru-2-11': 'uru', // Central Español, Juventud de Las Piedras, Torque
  };
  D.CLUBS.forEach(cl => {
    const m = STR_2026[cl.id];
    if (m) { cl.tier = m[0]; cl.strength = m[1]; }
    if (MOVES_2026[cl.id]) cl.league = MOVES_2026[cl.id];
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
    // Todos os países com liga própria (e segunda divisão para a base)
    { id: 'Bélgica', flag: '🇧🇪' }, { id: 'Turquia', flag: '🇹🇷' }, { id: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { id: 'Grécia', flag: '🇬🇷' }, { id: 'Suíça', flag: '🇨🇭' }, { id: 'Áustria', flag: '🇦🇹' }, { id: 'Dinamarca', flag: '🇩🇰' },
    { id: 'Chile', flag: '🇨🇱' }, { id: 'Paraguai', flag: '🇵🇾' }, { id: 'Equador', flag: '🇪🇨' },
    { id: 'México', flag: '🇲🇽' }, { id: 'EUA', flag: '🇺🇸' },
    { id: 'Japão', flag: '🇯🇵' }, { id: 'Coreia do Sul', flag: '🇰🇷' }, { id: 'Arábia Saudita', flag: '🇸🇦' }, { id: 'Catar', flag: '🇶🇦' },
    // Países novos
    { id: 'Peru', flag: '🇵🇪' }, { id: 'Bolívia', flag: '🇧🇴' }, { id: 'Venezuela', flag: '🇻🇪' },
    { id: 'Croácia', flag: '🇭🇷' }, { id: 'Sérvia', flag: '🇷🇸' }, { id: 'Noruega', flag: '🇳🇴' }, { id: 'Suécia', flag: '🇸🇪' },
    { id: 'Polônia', flag: '🇵🇱' }, { id: 'República Tcheca', flag: '🇨🇿' }, { id: 'Marrocos', flag: '🇲🇦' }, { id: 'Egito', flag: '🇪🇬' },
    { id: 'Austrália', flag: '🇦🇺' },
  ];
  // Mídia de verdade (o jogo é entre amigos): jornais do país do clube, quem assina a opinião e a resenha
  // depois da temporada. Tudo aqui, para trocar por nomes fictícios se o jogo um dia for público.
  D.MEDIA = {
    papers: {
      'Brasil': [['Lance!', 'O diário esportivo do Brasil'], ['Placar', 'A revista do futebol brasileiro'], ['Gazeta Esportiva', 'Desde 1928 ao lado do torcedor'], ['Jornal dos Sports', 'O cor-de-rosa do Rio']],
      'Argentina': [['Olé', 'Diario deportivo'], ['El Gráfico', 'La revista del fútbol argentino']],
      'Uruguai': [['Ovación', 'Diario deportivo uruguayo']],
      'Colômbia': [['El Tiempo · Deportes', 'Fútbol colombiano']],
      'Portugal': [['A Bola', 'O jornal desportivo português'], ['Record', 'Diário desportivo'], ['O Jogo', 'Diário desportivo']],
      'Espanha': [['Marca', 'Diario deportivo'], ['AS', 'Diario deportivo'], ['Mundo Deportivo', 'Desde 1906']],
      'Inglaterra': [['The Sun · Sport', 'Back pages'], ['Daily Mirror · Sport', 'Back pages']],
      'Itália': [['La Gazzetta dello Sport', 'Il quotidiano rosa'], ['Corriere dello Sport', 'Quotidiano sportivo'], ['Tuttosport', 'Quotidiano sportivo']],
      'Alemanha': [['Kicker', 'Das Fußball-Magazin'], ['Bild · Sport', 'Fußball']],
      'França': [["L'Équipe", 'Le quotidien du sport']],
      'Holanda': [['Voetbal International', 'Het voetbalweekblad'], ['De Telegraaf · Sport', 'Voetbal']],
      'Bélgica': [['Het Nieuwsblad · Sport', 'Voetbal'], ['La Dernière Heure', 'Les Sports']],
      'Turquia': [['Fanatik', 'Spor gazetesi'], ['Fotomaç', 'Spor gazetesi']],
      'Escócia': [['Daily Record · Sport', 'Back pages']],
      'Grécia': [['Sport24', 'Αθλητικά'], ['Gazzetta.gr', 'Αθλητικά']],
      'Suíça': [['Blick · Sport', 'Fussball']],
      'Áustria': [['Kronen Zeitung · Sport', 'Fußball']],
      'Dinamarca': [['Tipsbladet', 'Fodbold']],
      'Chile': [['El Mercurio · Deportes', 'Fútbol chileno']],
      'Paraguai': [['ABC Color · Deportes', 'Fútbol paraguayo']],
      'Equador': [['El Universo · Deportes', 'Fútbol ecuatoriano']],
      'México': [['Récord', 'Diario deportivo'], ['ESTO', 'Diario deportivo']],
      'EUA': [['The Athletic', 'Soccer'], ['ESPN FC', 'Soccer']],
      'Japão': [['Nikkan Sports', 'サッカー'], ['Sports Hochi', 'サッカー']],
      'Coreia do Sul': [['Sports Chosun', '축구']],
      'Arábia Saudita': [['Arriyadiyah', 'الرياضية']],
      'Catar': [['Al-Watan · Esportes', 'كرة القدم']],
      'Peru': [['Líbero', 'Diario deportivo'], ['Depor', 'Diario deportivo']],
      'Bolívia': [['Olé Bolivia', 'Diario deportivo']],
      'Venezuela': [['Meridiano', 'Diario deportivo']],
      'Croácia': [['Sportske novosti', 'Nogomet']],
      'Sérvia': [['Sportski žurnal', 'Fudbal']],
      'Noruega': [['VG Sporten', 'Fotball']],
      'Suécia': [['Sportbladet', 'Fotboll']],
      'Polônia': [['Przegląd Sportowy', 'Piłka nożna']],
      'República Tcheca': [['Sport', 'Fotbal']],
      'Marrocos': [['Le Matin · Sport', 'Botola']],
      'Egito': [['Al-Ahram · Esportes', 'كرة القدم']],
      'Austrália': [['The Australian · Sport', 'Football']],
    },
    // Quem assina a opinião no jornal brasileiro (nos de fora fica o cronista do jogo)
    columnistBR: 'Craque Neto',
    // Resenha da temporada: quem comenta (sempre em português, para a turma)
    // Programas que comentam a temporada, cada um no seu estilo: um bordão por fala, no máximo, e uma opinião ou piada
    // de verdade. {n} nome, {time} clube, {clube} clube com artigo, {g} gols, {a} assistências, {idade} idade,
    // {nota} nota do ano, {jogos} jogos, {cs} jogos sem sofrer gol, {desarmes} desarmes.
    // Situações: resumo do ano (ballon, title, bench, injury, down, great, good, bad) e destaques (gols, assist, joia,
    // veterano, paredao do goleiro, xerife do zagueiro).
    shows: [
      { id: 'neto', who: 'Craque Neto', where: 'no Os Donos da Bola', talk: {
        ballon: ["Eu falei aqui no programa, tá gravado! Cascão, acha o vídeo! Bola de Ouro pro {n}!",
          "Melhor do mundo! E tinha gente aqui dentro dizendo que era jogador de Instagram. Tá rindo de quê agora, Cascão?",
          "Bola de Ouro! Pelo amor de Deus, eu vou chorar ao vivo de novo e minha mulher vai brigar comigo.",
          "O {n} é o melhor do mundo e eu sou o melhor comentarista do mundo, porque eu falei primeiro!",
          "Ganhou a Bola de Ouro e ganhou o Neto. O Neto é mais difícil, diga-se de passagem.",
          "Vocês tão de brincadeira comigo? Melhor do mundo! Pode desligar o teleprompter que hoje eu falo de coração!"],
        title: ["Campeão! E quem disse que o {n} não aguentava pressão? Põe a cara dele na tela, Cascão!",
          "Eu sei o que é carregar time nas costas pra ser campeão. O {n} fez igual. Igual!",
          "Título {doTime} com o {n} decidindo. Quem não gostou, desliga a televisão!",
          "Taça na mão! Agora, diretoria, renova com esse menino antes que um time árabe leve com um caminhão de dinheiro!",
          "Campeão! E eu não vou nem falar do técnico, porque hoje é dia de festa. Amanhã eu falo.",
          "Pelo amor de Deus, que título! O {n} jogou o fino da bola, e o resto do time foi junto no embalo!"],
        bench: ["{jogos} jogos no ano inteiro? Vocês tão de brincadeira comigo! Professor, me dá teu telefone que eu ligo agora!",
          "O {n} no banco e o titular passeando em campo. Isso é um desrespeito com o torcedor!",
          "Eu vou falar e vão me cancelar: esse técnico não entende de futebol. Pronto, falei!",
          "Garotinho, pede pra sair. Pede! Quem tem talento não pode ficar esquentando banco!",
          "O banco {doTime} já tem o formato do {n}, Cascão. Virou encosto oficial!",
          "Professor, eu vou aí no CT e tiro o {n} do banco pela orelha!"],
        injury: ["Departamento médico {doTime} tem que ser investigado! Esse menino passou mais tempo na maca que em campo!",
          "Lesão é a pior coisa que existe. Eu sei, eu tive. Volta logo, garotinho, mas volta sem pressa.",
          "Cascão, coloca uma vela na tela pro {n}. Uma não, coloca três!",
          "Ano perdido. Mas eu conheço esse tipo de jogador: volta melhor, diga-se de passagem."],
        down: ["Rebaixado! E a diretoria tirando foto em churrasco! O {n} não tem culpa nenhuma!",
          "{Clube} caiu e o {n} foi o único que suou a camisa. Sai daí, garotinho, sai enquanto é tempo!",
          "Que vergonha! Vergonha! Eu não queria estar na pele desse presidente hoje.",
          "Pelo amor de Deus, como é que um time cai com o {n} lá dentro? Explica, diretoria!"],
        great: ["Nota {nota}! Esse é o {n} que eu amo, que eu paro pra assistir! Convoca, pelo amor de Deus!",
          "Esse {n} joga o que eu jogava. Quase. Tá, eu jogava um pouquinho mais, mas ele chega lá.",
          "Se a Seleção não chamar o {n}, eu vou lá na CBF de bermuda e chinelo falar com o técnico!",
          "Cascão, solta os lances do {n}! Não, não corta! Deixa rodando o bloco inteiro!",
          "Joga muito! Diga-se de passagem, joga mais que muito gringo que ganha em euro aí.",
          "Se o {n} repetir esse ano, eu apresento o programa de tanguinha. Tô falando sério, Cascão, anota!",
          "Eu pago o ingresso pra ver o {n}! Pago e ainda levo a família, e a família é grande!"],
        good: ["Nota {nota}. Foi bem? Foi. Mas eu sou chato, eu quero o {n} decidindo clássico!",
          "Gostei, garotinho. Agora menos dancinha no Instagram e mais treino de falta.",
          "Temporada boa, mas pra jogar {noTime} tem que ser ótimo. Bom é pouco!",
          "Tá no caminho. Mas eu já vi muito menino bom se perder com empresário ruim, viu?",
          "Cascão, nota sete pro {n}. Sete! Pode mais e ele sabe que pode!"],
        bad: ["Cascão, tira esses lances da tela! Não quero ver! Ninguém quer ver!",
          "Família não joga, empresário não joga, quem joga é você, {n}!",
          "Nota {nota}! Pelo amor de Deus, eu com 20 quilos a mais tiro essa nota!",
          "Tá postando foto de carro novo? Joga bola primeiro, garotinho!",
          "Esse ano do {n} foi um desrespeito com quem paga ingresso. Desrespeito!",
          "Eu defendo o {n} aqui toda semana, mas esse ano não dá. Não dá, garotinho!"],
        gols: ["{g} gols! Esse sabe onde a coruja dorme, diga-se de passagem!",
          "Cascão, mostra os {g} gols! Todos! Não me interessa se o programa estoura o horário!",
          "{g} gols e tem gente que ainda discute. Discute o quê? Com quem?"],
        assist: ["{a} assistências! Camisa 10 de verdade, daqueles que não existem mais!",
          "O {n} deu {a} gols de presente pros outros. Eu dava menos. Eu chutava, né?",
          "{a} assistências! Joga de cabeça erguida, pelo amor de Deus, igual se jogava antigamente!"],
        joia: ["{idade} anos! Segura esse menino, {time}, antes que vendam pra Europa por qualquer trocado!",
          "Com {idade} anos eu já era bom também. Mas o {n} tem mais cabelo do que eu tinha.",
          "Ei, garotinho de {idade} anos! Não deixa subir à cabeça e não troca de empresário!"],
        veterano: ["{idade} anos e correndo mais que a molecada de chuteira colorida! Esse é dos meus!",
          "Tiozão de {idade} anos dando aula. Os garotinhos tinham que pagar pra treinar do lado dele!"],
        paredao: ["{cs} jogos sem tomar gol! Goleiro tem que ser assim: chato, sério e não deixa entrar nada!",
          "Cascão, conta comigo: {cs} jogos sem sofrer gol. Isso é paredão, diga-se de passagem!"],
        xerife: ["{desarmes} desarmes! Zagueiro raiz, que dá o carrinho e ainda levanta o atacante do chão!",
          "Zagueiro que eu gosto é isso aí: {desarmes} desarmes e nenhum chilique pro juiz."],
      } },
      { id: 'podpah', who: 'Igão e Mítico', where: 'no Podpah', talk: {
        ballon: ["Mano, Bola de Ouro! O Mítico tá chorando aqui, olha a cara dele kkkk",
          "Papo reto, melhor do mundo. O {n} vem aqui e a gente faz episódio de seis horas, quem quiser que vá no banheiro antes.",
          "O Mítico falou ano passado que o {n} era modinha. Edita essa parte aí, produção kkkk",
          "Bola de Ouro, mano! Cê é loko, o moleque zerou o futebol!",
          "Mano, a Bola de Ouro foi pro {n}! Já pode vir no Podpah com ela debaixo do braço, papo reto."],
        title: ["Campeão, mano! Agora o {n} tem que vir aqui pagar o churrasco do estúdio, papo reto.",
          "É campeão! O Mítico apostou contra e vai ter que raspar a sobrancelha kkkk",
          "Título no bolso, mano. O {n} foi brabo demais e o resto do time foi de figurante.",
          "Mano, que festa! Já imaginou a resenha nesse vestiário? Eu queria tá lá, mano.",
          "É campeão, mano! O {n} comemorando igual criança, que lindo, papo reto."],
        bench: ["Mano, {jogos} jogos? O {n} viu mais jogo do banco do que eu do sofá kkkk",
          "Papo reto: o {n} no banco é desperdício. Professor, solta o moleque!",
          "O {n} já tem almofada personalizada no banco, mano. Com o nome bordado kkkk",
          "Mano, por que o {n} não joga? Nem a mãe do técnico sabe kkkk",
          "Mano, o {n} tá vendo os jogos de camarote. Só que o camarote é o banco kkkk"],
        injury: ["Pô, mano, lesão é triste demais. Força, {n}, volta brabo!",
          "O {n} passou mais tempo com o fisioterapeuta do que com a família, mano. Força, irmão!",
          "Mano, quando o {n} voltar, a gente faz um episódio só de boas-vindas, papo reto."],
        down: ["Caiu, mano... pesado. Mas o {n} vai sair dali pra time grande, cê vai ver.",
          "Papo reto, o time era ruim, mano. O {n} pegava a bola e olhava pros lados tipo: cadê todo mundo?",
          "Mano, rebaixamento dói. Mas o {n} tem mercado, os empresários já tão no direct dele."],
        great: ["Mano, o {n} tá jogando no modo fácil! Alguém desliga o cheat dele kkkk",
          "Nota {nota}, mano! É o pai! É o pai!",
          "Melhor do campeonato? Do campeonato não, mano, da galáxia!",
          "Papo reto, se o {n} vier no Podpah, eu pago o rango brabo, o do restaurante caro!",
          "Mano, cada jogo do {n} vira corte no TikTok. O cara tá zerando o algoritmo!",
          "Mano, o {n} tá voando tão alto que vai precisar de passaporte kkkk"],
        good: ["Mandou bem, mano. Não foi brabo, foi firmeza. Firmeza é bom, brabo é melhor kkkk",
          "Nota {nota}, mano. Ano honesto. Ano que vem eu quero ver insano.",
          "O {n} tá subindo de nível, mano. Ainda não é o chefão final, mas tá chegando.",
          "Ano firmeza, papo reto. Nem brabo, nem fraco: firmeza."],
        bad: ["Mano, o {n} esse ano jogou de chinelo, papo reto kkkk",
          "Cadê o {n}, mano? Abriram até boletim de ocorrência de desaparecimento kkkk",
          "Nota {nota}, mano? Isso é a nota da minha prova de química kkkk",
          "Papo reto, o {n} foi um NPC esse ano, mano. Só andava em campo e dava bom dia.",
          "Mano, o {n} jogou igual eu no videogame depois da meia-noite: só passe errado kkkk",
          "Mano, o {n} tava no modo avião o ano inteiro kkkk"],
        gols: ["{g} gols, mano! O {n} faz gol até sem querer: bate na canela e entra kkkk",
          "Mano, {g} gols! Isso é número de videogame no modo amador!",
          "{g} gols, mano! Cê é loko, o {n} não perdoa nem goleiro de time pequeno!"],
        assist: ["{a} assistências, mano! O {n} é o garçom mais brabo da liga, só falta pedir os 10%!",
          "Mano, {a} passes pra gol. O {n} divide até a pizza, papo reto."],
        joia: ["{idade} anos, mano?! Com {idade} anos eu perdia pra criança no videogame kkkk",
          "Moleque de {idade} anos jogando assim? Mano, daqui a cinco anos ele tá na Lua."],
        veterano: ["O tiozão de {idade} anos dando aula de cardio, mano! Respeita!",
          "Mano, {idade} anos e o {n} correndo mais do que eu atrás do ônibus kkkk"],
        paredao: ["{cs} jogos sem tomar gol, mano! O {n} fecha o gol igual porta giratória de banco kkkk",
          "Mano, {cs} jogos zerado! Esse goleiro tem ímã na luva, papo reto."],
        xerife: ["{desarmes} desarmes, mano! Atacante que passa pelo {n} tem que pagar pedágio kkkk",
          "Papo reto, o {n} é zagueiro raiz. Toma a bola e ainda dá tapinha nas costas."],
      } },
      { id: 'flow', who: 'Resenha', where: 'do Flow Sport Club', talk: {
        ballon: ["Rapaziada, Bola de Ouro pro {n}! O chat tá pegando fogo, ninguém consegue ler nada!",
          "Fizemos enquete aqui: 92% acha justa a Bola de Ouro do {n}. Os outros 8% são torcedores do rival.",
          "Melhor do mundo, rapaziada. Aí é cinema! E é cinema com pipoca e refrigerante grande."],
        title: ["Campeão! A gente falou no começo do ano que {clube} ia brigar. Ninguém acreditou. Nem a gente, mas falamos.",
          "Rapaziada, título com o {n} decidindo. Resenha boa demais, hoje vai até de manhã!",
          "Taça na mão e o {n} no meio da foto, rapaziada. Protagonista é isso.",
          "Olha o nível, rapaziada! O {n} chamou a responsabilidade e o {time} levantou a taça!"],
        bench: ["{jogos} jogos, rapaziada. O {n} jogou menos que o reserva do reserva do meu time de society.",
          "Rapaziada, alguém liga pro técnico {doTime} e pergunta o que o {n} fez de errado. Sério.",
          "O {n} no banco o ano todo. A gente não entende, o chat não entende, a mãe dele não entende."],
        injury: ["Ano de lesão pro {n}, rapaziada. Que volte inteiro, a resenha guarda o lugar.",
          "O departamento médico {doTime} virou o segundo endereço do {n}. Força, irmão!"],
        down: ["Caiu o time, não caiu o {n}. Isso a resenha viu, rapaziada.",
          "Rebaixamento pesado. O {n} vai ter fila de proposta, pode anotar.",
          "Rapaziada, {clube} caiu. O {n} jogou bem, mas futebol é coletivo e o coletivo era um caos."],
        great: ["Nota {nota}, rapaziada. Aí é cinema! E é filme de Oscar, não é Sessão da Tarde.",
          "Rapaziada, o {n} tá num nível que dá até medo. O adversário sonha com ele à noite.",
          "Enquete do dia: o {n} é top 3 do país? O chat respondeu: top 1. A gente concorda.",
          "O {n} tá jogando com o controle na mão e o resto do campeonato com o controle sem pilha.",
          "Rapaziada, alguém segura o {n}? Não? Ninguém? Foi o que eu pensei."],
        good: ["Nota {nota}. Temporada sólida, rapaziada. Não é cinema, mas é uma boa série.",
          "O {n} fez o dele. Ano que vem pode ser o ano da explosão, rapaziada.",
          "Rapaziada, ano bom. Faltou aquele jogo grande pra virar ano histórico."],
        bad: ["Rapaziada, não foi o ano do {n}. Nota {nota} não combina com ele.",
          "A resenha cobra, rapaziada: o {n} pode muito mais. E ele sabe disso.",
          "Rapaziada, esse ano do {n} não entra nem na retrospectiva. Nem nos stories."],
        gols: ["{g} gols, rapaziada! Aí é cinema!", "{g} gols e o chat sem voz, rapaziada!",
          "Rapaziada, {g} gols do {n}. Os zagueiros do campeonato inteiro tão fazendo terapia."],
        assist: ["{a} assistências, rapaziada! O {n} joga de cabeça erguida, igual craque antigo.",
          "{a} passes pra gol. Os atacantes {doTime} tinham que dividir o bicho com ele."],
        joia: ["Rapaziada, anota esse nome: {n}, {idade} anos. Vai dar o que falar.",
          "{idade} anos? A gente com {idade} anos não sabia nem fritar ovo, rapaziada."],
        veterano: ["{idade} anos e decidindo jogo, rapaziada. Respeita o vinho!",
          "O {n} aos {idade} anos é aula. Molecada, tira o fone e presta atenção."],
        paredao: ["{cs} jogos sem sofrer gol, rapaziada. Fechou a casinha!",
          "Rapaziada, {cs} jogos sem levar gol. Atacante chega na frente do {n} e esquece o que ia fazer."],
        xerife: ["{desarmes} desarmes, rapaziada. Atacante que pega o {n} pela frente pede pra sair.",
          "Rapaziada, {desarmes} desarmes. O {n} é o tipo de zagueiro que o adversário estuda no vídeo e ainda perde."],
      } },
      { id: 'casimiro', who: 'Casimiro', where: 'na live da CazéTV', talk: {
        ballon: ["Ih, meteu essa? Bola de Ouro pro {n}! Chat, eu tô arrepiado, olha isso!",
          "Melhor do mundo. Apenas. Simplesmente. Fecha a live, não tem como superar isso, mané!",
          "Bola de Ouro pro {n}! Aceitas? Aceita! Muito forte!",
          "Chat, quem falou que ele era superestimado? Aparece aí agora, aparece! Que papinho!"],
        title: ["Ih, meteu essa? Campeão! O {n} amassou, mané!",
          "Campeão! Chat, o {n} merece um rodízio de pizza. Eu pago. Não pago não, mas merece.",
          "Que papinho é esse de que o {n} não decide? Tá aí a taça, mané!",
          "Campeão. Simplesmente. Muito forte. Não tenho mais o que falar, só comemorar."],
        bench: ["{jogos} jogos? Tu tá de sacanagem comigo? Professor, que papinho é esse?",
          "O {n} no banco o ano todo, chat. Já tá pagando aluguel lá, mané.",
          "Chat, o {n} ficou mais tempo no banco do que eu na fila do rodízio. E eu fico muito tempo, viu?"],
        injury: ["Ih, mané... machucado o ano inteiro. Volta muito forte, {n}!",
          "Lesão chata, chat. O {n} vai voltar amassando, eu tenho fé.",
          "O {n} machucado é igual açaí sem leite em pó: não tem graça nenhuma."],
        down: ["Ih, mané, rebaixado... Mas o {n} não tem culpa, não, tá?",
          "Caiu, chat. Que papinho triste. Mas o {n} amassou mesmo num time que não ajudava."],
        great: ["Nota {nota}! Tu tá de sacanagem comigo? O {n} tá muito forte, mané!",
          "Chat, o {n} jogando assim é igual pastel de feira: não tem como não gostar.",
          "Muito forte. Simplesmente amassa. Apenas o normal do {n}.",
          "Ih, meteu essa? Mais um ano absurdo! Que papinho de fase, isso aí é nível!",
          "Aceitas pix? Quero pagar pra ver o {n} jogar de novo, mané!"],
        good: ["Nota {nota}. Foi bem, tranquilão. Não amassou tudo, mas foi bem.",
          "Temporada boa do {n}, chat. Não é rodízio completo, mas é um prato feito caprichado.",
          "Foi forte. Não muito forte, mas forte, mané."],
        bad: ["Que papinho foi esse ano, {n}? Volta a amassar, mané!",
          "Nota {nota}, chat. Tu tá de sacanagem comigo? Eu, que jogo bola com os amigos no sábado, tiro isso.",
          "Ih, mané... o {n} esse ano jogou com o freio de mão puxado.",
          "O {n} esse ano foi igual pizza fria: até dá pra comer, mas não era isso que a gente queria."],
        gols: ["{g} gols. O {n} amassa. Apenas.", "{g} gols, chat! Ih, meteu essa {g} vezes!",
          "{g} gols e os goleiros da liga bloquearam o {n} no Instagram, mané."],
        assist: ["{a} assistências, mané! Que nerdola do passe!",
          "{a} gols de presente. O {n} é o mais generoso da liga, simplesmente."],
        joia: ["{idade} anos? O mané nem tem idade pra dirigir e já amassa!",
          "Com {idade} anos, chat! Eu com {idade} anos tava comendo miojo e jogando videogame."],
        veterano: ["{idade} anos e ainda amassando? Qual é, tranquilão?",
          "O {n} com {idade} anos: muito forte. É igual vinho, só que corre."],
        paredao: ["{cs} jogos sem tomar gol! Chat, o {n} fechou o gol com cadeado. Muito forte!",
          "{cs} jogos zerado. O {n} é o goleiro mais chato da liga. Elogio, tá, mané?"],
        xerife: ["{desarmes} desarmes, mané! O {n} rouba bola igual eu roubo batata frita do prato dos outros.",
          "{desarmes} desarmes. O atacante vê o {n} e já pede pra trocar de lado. Apenas."],
      } },
      { id: 'galvao', who: 'Galvão Bueno', where: 'no Bem, Amigos!', talk: {
        ballon: ["Bem, amigos... o {n} é o melhor do mundo! Haja coração!",
          "É do {n}! É do {n}! A Bola de Ouro é do {n}! Eu narrei muita Copa e me arrepiei agora.",
          "Tá na hora de o mundo inteiro conhecer o {n}! Melhor do mundo, amigos!"],
        title: ["Acabou! Acabou! É campeão! {Clube} é {campeao} com o {n}!",
          "Pode isso, Arnaldo? Pode! {Clube} é {campeao} e o {n} foi o dono da festa!",
          "Bem, amigos, que conquista! Diz aí, comentarista: dá pra não gostar desse menino?",
          "É campeão! É campeão! Haja coração, amigo!"],
        bench: ["Bem, amigos... é difícil entender o {n} fora do time. Muito difícil.",
          "Vamos ver, vamos ver... e enquanto a gente vê, o {n} continua no banco. Não dá!",
          "Calma! Calma! A chance do {n} vai chegar. Tem que chegar, amigos."],
        injury: ["Que pena, amigos. O {n} ficou de fora quase o ano todo. Volta logo, menino!",
          "Bem, amigos, lesão é a parte triste do futebol. Força, {n}!"],
        down: ["Bem, amigos... um dia triste {doTime}. Mas o {n} lutou até o fim.",
          "Que tristeza, amigos. O rebaixamento dói, mas o {n} vai se reerguer."],
        great: ["Ronaldinho! Quer dizer... {n}! Desculpa, amigos, me empolguei. Que temporada!",
          "Olha o que ele fez! Olha o que ele fez! Nota {nota}, amigos!",
          "Bem, amigos, o {n} encantou o país. Encantou até a mim, que já vi de tudo.",
          "Vai que é sua, {n}! E foi sua a temporada inteira!",
          "Pra cima deles, {n}! E ele foi pra cima o ano todo, amigos!"],
        good: ["Bem, amigos, uma temporada segura do {n}. Mas eu sei que ele pode mais.",
          "Vamos chegando, vamos chegando... o {n} está no caminho, amigos.",
          "Nota {nota}. Boa, amigos. Boa. Mas o {n} ainda não fez a gente perder o fôlego."],
        bad: ["Calma, {n}! Calma! O futebol dá voltas, amigo.",
          "Bem, amigos... nota {nota} é pouco para o talento que o {n} tem.",
          "Fala muito, amigos, fala muito... mas o {n} precisa falar dentro de campo."],
        gols: ["Gooool! E foram {g}, amigos! {g} gols do {n}!",
          "Haja coração: {g} gols do {n}! E eu gritei todos daqui de casa."],
        assist: ["Que passe, amigos! E foram {a} assistências do {n}!",
          "Bem, amigos, {a} assistências. É o maestro {doTime}!"],
        joia: ["Olha o menino! {idade} anos! Vai, garoto!",
          "Bem, amigos, guardem esse nome: {n}, {idade} anos!"],
        veterano: ["{idade} anos e ainda decidindo! Classe não tem idade, amigos.",
          "Bem, amigos, com {idade} anos o {n} dá aula. Aula!"],
        paredao: ["Sai que é sua, {n}! E foi sua em {cs} jogos sem sofrer gol, amigos!",
          "Bem, amigos, {cs} jogos sem levar gol. É um paredão!"],
        xerife: ["Bem, amigos, {desarmes} desarmes. Zagueiro com Z maiúsculo!",
          "Pode isso, Arnaldo? {desarmes} desarmes limpinhos! Pode!"],
      } },
      { id: 'denilson', who: 'Denílson', where: 'no Denílson Show', talk: {
        ballon: ["Bola de Ouro pro {n}! Eu dava pedalada e ganhava aplauso, ele ganha Bola de Ouro. Tá certo, ele merece mais.",
          "Melhor do mundo! Tô arrepiado aqui no estúdio, gente!",
          "O {n} vem aqui no Denílson Show contar como é ser o melhor do mundo. Eu conto como é perder pra ele no videogame."],
        title: ["É campeão! O {n} foi o nome do título, não tem discussão!",
          "Título merecido. E o {n} decisivo do começo ao fim, gente!",
          "Denílson Show aprova: o {n} deu show e levou a taça!"],
        bench: ["Me explica: o {n} no banco? Eu não entendo, gente!",
          "{jogos} jogos? Eu dava mais pedalada num jogo do que o {n} jogou no ano inteiro!",
          "Já liguei pro técnico pra perguntar do {n}. Ele não atende. Deve tá com vergonha."],
        injury: ["Ano complicado pro {n}, muita lesão. Força, menino!",
          "Lesão é chata. Eu sei, eu tive umas vinte. Volta com calma, {n}."],
        down: ["Rebaixamento dói. Mas o {n} não pode levar a culpa sozinho.",
          "O time caiu e o {n} foi dos poucos que se salvaram."],
        great: ["Se o {n} jogasse no meu tempo, eu ia pra reserva. Tá, talvez eu fosse pra reserva mesmo.",
          "Esse {n} dribla igual eu driblava. Só que ele faz gol depois kkkk",
          "Nota {nota}! O Denílson Show aprova e assina embaixo!",
          "O {n} jogou muita bola, muita! Pra mim, foi o melhor do ano."],
        good: ["Temporada boa do {n}, mas dá pra crescer, viu?",
          "Nota {nota}. Regular. Bom, mas não brilhante. Falta aquela pedalada a mais."],
        bad: ["O {n} esse ano jogou com o pé errado... e olha que ele tem dois!",
          "Ano pra esquecer. O {n} precisa voltar a se divertir em campo.",
          "Nota {nota}. Eu sei como é, gente. Já tive ano que nem a pedalada saía."],
        gols: ["{g} gols! O {n} não perdoa!",
          "Contei aqui: {g} gols do {n}. Eu levei uma carreira inteira pra fazer isso. Tá, quase."],
        assist: ["{a} assistências! O {n} joga pros outros, isso é craque!"],
        joia: ["{idade} anos, gente! Esse menino vai longe!",
          "Com {idade} anos eu ainda tava na base. O {n} já é titular!"],
        veterano: ["{idade} anos e jogando assim? Respeito total, o Denílson aprova!"],
        paredao: ["{cs} jogos sem tomar gol! Eu nunca ia conseguir fazer gol nesse cara. Nem pedalando."],
        xerife: ["{desarmes} desarmes! Ainda bem que eu já parei, esse {n} ia me pegar."],
      } },
    ],
  };
  // Garoto da carreira do dia: 5 nomes por nacionalidade
  D.DAILY_NAMES = {
    'Brasil': ['Pedrinho', 'Kauãzinho', 'Vini Souza', 'Biel', 'Matheuzinho'],
    'Argentina': ['Thiago Benítez', 'Valentín Ruiz', 'Nico Ferreyra', 'Facundo Sosa', 'Lautaro Paz'],
    'Uruguai': ['Agustín Pereira', 'Santiago Olivera', 'Facundo Rodríguez', 'Mateo Cabrera', 'Joaquín Suárez'],
    'Colômbia': ['Juan Camilo Ríos', 'Yerson Mina', 'Kevin Cuesta', 'Duván Arias', 'Jhon Castaño'],
    'Portugal': ['Tiago Mendes', 'Rúben Costa', 'Diogo Neves', 'Gonçalo Pires', 'Rafa Lopes'],
    'Espanha': ['Pablo Gavira', 'Álex Moreno', 'Iker Sanz', 'Hugo Navarro', 'Dani Ortega'],
    'Inglaterra': ['Jack Harrison', 'Ollie Bennett', 'Harry Walsh', 'Tom Fletcher', 'Charlie Mason'],
    'Itália': ['Lorenzo Ricci', 'Matteo Esposito', 'Federico Bianchi', 'Davide Conti', 'Andrea Gallo'],
    'Alemanha': ['Leon Krüger', 'Jonas Becker', 'Florian Wolf', 'Luca Hoffmann', 'Niklas Braun'],
    'França': ['Kylian Mendy', 'Hugo Lefèvre', 'Théo Bernard', 'Rayan Diallo', 'Lucas Moreau'],
    'Holanda': ['Daan de Vries', 'Sem Bakker', 'Milan Visser', 'Jesse Smit', 'Lars Jansen'],
  };
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
    // Segundas divisões novas (a MLS não tem acesso: a USL fica separada)
    'ned-2': { up: 'ned', promo: 2 }, ned: { down: 'ned-2', releg: 2 },
    'tur-2': { up: 'tur', promo: 2 }, tur: { down: 'tur-2', releg: 2 },
    'mex-2': { up: 'mex', promo: 2 }, mex: { down: 'mex-2', releg: 2 },
    'bel-2': { up: 'bel', promo: 2 }, bel: { down: 'bel-2', releg: 2 },
    'sco-2': { up: 'sco', promo: 1 }, sco: { down: 'sco-2', releg: 1 },
    'gre-2': { up: 'gre', promo: 2 }, gre: { down: 'gre-2', releg: 2 },
    'sui-2': { up: 'sui', promo: 2 }, sui: { down: 'sui-2', releg: 2 },
    'aut-2': { up: 'aut', promo: 2 }, aut: { down: 'aut-2', releg: 2 },
    'den-2': { up: 'den', promo: 2 }, den: { down: 'den-2', releg: 2 },
    'chi-2': { up: 'chi', promo: 2 }, chi: { down: 'chi-2', releg: 2 },
    'par-2': { up: 'par', promo: 2 }, par: { down: 'par-2', releg: 2 },
    'ecu-2': { up: 'ecu', promo: 2 }, ecu: { down: 'ecu-2', releg: 2 },
    'uru-2': { up: 'uru', promo: 2 }, uru: { down: 'uru-2', releg: 2 },
    'col-2': { up: 'col', promo: 2 }, col: { down: 'col-2', releg: 2 },
    'jpn-2': { up: 'jpn', promo: 2 }, jpn: { down: 'jpn-2', releg: 2 },
    'kor-2': { up: 'kor', promo: 2 }, kor: { down: 'kor-2', releg: 2 },
    'ara-2': { up: 'ara', promo: 2 }, ara: { down: 'ara-2', releg: 2 },
    'qat-2': { up: 'qat', promo: 1 }, qat: { down: 'qat-2', releg: 1 },
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
    // Países jogáveis que não estavam na lista
    ['Turquia', '🇹🇷', 77], ['Áustria', '🇦🇹', 77], ['Escócia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 74], ['Grécia', '🇬🇷', 73], ['Chile', '🇨🇱', 74], ['Paraguai', '🇵🇾', 74], ['Catar', '🇶🇦', 70],
    ['Peru', '🇵🇪', 73], ['Bolívia', '🇧🇴', 70], ['Venezuela', '🇻🇪', 71], ['Noruega', '🇳🇴', 76], ['Suécia', '🇸🇪', 75], ['República Tcheca', '🇨🇿', 74], ['Egito', '🇪🇬', 74],
  ].map(([name, flag, str]) => ({ name, flag, str }));
  D.NATION_BY_NAME = {};
  D.NATIONS.forEach(n => { D.NATION_BY_NAME[n.name] = n; });

  // Clubes com nome feminino: "a Juventus", "contra a Ponte Preta", "na Roma"
  const FEM = new Set(['Juventus', 'Roma', 'Lazio', 'Fiorentina', 'Atalanta', 'Sampdoria', 'Inter de Milão', 'Real Sociedad',
    'Ponte Preta', 'Chapecoense', 'Portuguesa', 'Académica', 'Udinese', 'Salernitana', 'Cremonese', 'Reggina', 'Spal',
    'Real Sociedad B', 'Ferroviária', 'Tuna Luso', 'Juventus B',
    // upgrade de times
    'Reggiana', 'Carrarese', 'Juve Stabia', 'Universidad de Chile', 'Universidad Católica', 'Universidad Católica (EQU)', 'Unión Española',
    'LDU Quito', 'La Equidad', 'Inter de Limeira', 'Estrela da Amadora', 'União de Leiria', 'Juazeirense',
    // países novos
    'Estrela Vermelha', 'Lokomotiva Zagreb', 'Universidad Central', 'Academia Puerto Cabello', 'Portuguesa (VEN)', 'Ceramica Cleopatra']);
  const g = (n, m, f) => (FEM.has(n) ? f : m) + ' ' + n;
  D.fem = n => FEM.has(n);
  D.o = n => g(n, 'o', 'a');
  D.O = n => g(n, 'O', 'A');
  D.do = n => g(n, 'do', 'da');
  D.no = n => g(n, 'no', 'na');
  D.pelo = n => g(n, 'pelo', 'pela');
  D.ao = n => g(n, 'ao', 'à');

  // Artigos: "o Brasileirão", "a Premier League"
  const MASC = ['Brasileirão', 'Championship', 'Scottish Championship', 'USL Championship'];
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

  // Sinergias: ter as duas características dá pontos extras e um efeito próprio (extra, aplicado em engine/season.js e engine/moments.js).
  D.SYNERGIES = [
    { id: 'falta',   a: 'colocado', b: 'parada',   icon: '🌟', tone: 'gold', name: 'Especialista em Falta', attr: { fin: 3, pas: 2 }, extra: '+3% gols e barreira mais baixa na falta decisiva' },
    { id: 'liso',    a: 'velocista', b: 'drible',  icon: '💨', tone: 'gold', name: 'Liso',                  attr: { rit: 3, dri: 3 }, extra: 'Sofre pênaltis: +3% gols e assistências' },
    { id: 'capitao', a: 'lider',    b: 'raca',     icon: '🎖️', tone: 'gold', name: 'Capitão',               attr: { def: 3, fis: 2, pas: 1 }, extra: 'Puxa o time: mais chance de título' },
    { id: 'maestro', a: 'visao',    b: 'garcom',   icon: '🎼', tone: 'gold', name: 'Maestro',               attr: { pas: 2, dri: 1 }, extra: 'O time fica mais forte, +5% assistências e passe decisivo mais fácil' },
    { id: 'muralha', a: 'xerife',   b: 'carrinho', icon: '🧱', tone: 'gold', name: 'Muralha',               attr: { def: 1, fis: 1 }, extra: 'Mais jogos sem sofrer gol e desarme decisivo mais fácil' },
    { id: 'paredao', a: 'reflexo',  b: 'elastico', icon: '🧤', tone: 'gold', name: 'Paredão',               attr: { fin: 3, fis: 3 }, extra: 'Defende mais pênaltis e lê o batedor mais cedo' },
    { id: 'matador', a: 'artilheiro', b: 'frieza', icon: '💀', tone: 'purple', name: 'Matador',               attr: { fin: 2, fis: 1 }, extra: '+4% gols e mira firme no lance decisivo' },
  ];
  // Melhorias pagas com pontos de evolução (ganhos pelo desempenho): cada uma soma pontos fixos na carta.
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
  // Foco nos treinos (escolhido na pré-temporada, vale até mudar): mais carga = chance de ponto extra, mas mais lesão.
  // p1/p2: chance de +1 / +2 pontos de evolução (só sem lesão séria); inj: multiplica o risco de lesão; decl: declínio pela idade
  D.TRAIN = [
    { id: 'leve',   icon: '🧘', name: 'Leve',   p1: 0,    p2: 0,    inj: 0.6, decl: 0.85 },
    { id: 'normal', icon: '⚖️', name: 'Normal', p1: 0.18, p2: 0,    inj: 1,   decl: 1 },
    { id: 'forte',  icon: '🔥', name: 'Forte',  p1: 0.3,  p2: 0.03, inj: 1.7, decl: 1 },
    { id: 'max',    icon: '🏋️', name: 'Máximo', p1: 0.4,  p2: 0.15, inj: 3,   decl: 1.1 },
  ];
  D.TRAIN_BY_ID = {}; D.TRAIN.forEach(t => { D.TRAIN_BY_ID[t.id] = t; });
  D.ATTR_LABEL = { rit: 'RIT', fin: 'FIN', pas: 'PAS', dri: 'DRI', def: 'DEF', fis: 'FÍS' };
  // Carta do goleiro (padrão FIFA): velocidade, reflexo, reposição, manejo, posicionamento, elasticidade
  D.GK_LABEL = { rit: 'VEL', fin: 'REF', pas: 'REP', dri: 'MAN', def: 'POS', fis: 'ELA' };
  // Número com a palavra certa: D.plural(1, 'gol', 'gols') → "1 gol"
  D.plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);
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
