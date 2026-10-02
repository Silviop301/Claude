// Uniformes de verdade (camisa e calção do titular, camisa e calção do reserva) dos principais clubes e seleções.
// Os outros clubes usam as cores tiradas do escudo (kits.js). Usado nos minigames (barreira, goleiro, atacantes).
(function (root) {
  const W = '#F4F2EC', K = '#141414', R = '#C8102E', B = '#1C3F94', N = '#14213D', Y = '#F7D117', G = '#0E7A3E', S = '#7FC4EE', O = '#F36C21', P = '#5B2A86', V = '#7A1F3D', GR = '#8A8F96';
  root.CRAQUE_KITS_REAL = {
    // Seleções
    'Brasil': [Y, B, B, W], 'Argentina': [S, K, N, N], 'Uruguai': [S, K, W, K], 'Colômbia': [Y, B, R, W], 'Portugal': [R, G, W, W],
    'Espanha': [R, N, W, W], 'Inglaterra': [W, N, R, R], 'Itália': [B, W, W, B], 'Alemanha': [W, K, K, K], 'França': [N, W, W, W],
    'Holanda': [O, W, N, N], 'Bélgica': [R, R, W, W], 'Croácia': [R, W, N, N], 'Marrocos': [R, G, W, W], 'Suíça': [R, W, W, W],
    'Dinamarca': [R, W, W, W], 'Japão': [N, W, W, W], 'EUA': [W, N, N, N], 'México': [G, W, K, K], 'Equador': [Y, B, B, B],
    'Senegal': [W, W, G, G], 'Sérvia': [R, B, W, W], 'Polônia': [W, R, R, R], 'Coreia do Sul': [R, K, W, W], 'Nigéria': [G, G, W, W],
    'Austrália': [Y, G, G, G], 'Canadá': [R, R, W, W], 'Camarões': [G, R, Y, Y], 'Gana': [W, W, R, R], 'Irã': [W, W, R, R],
    'Tunísia': [R, R, W, W], 'Arábia Saudita': [G, W, W, W], 'Turquia': [R, W, W, W], 'Áustria': [R, W, W, K], 'Escócia': [N, W, W, W],
    'Grécia': [B, B, W, W], 'Chile': [R, B, W, W], 'Paraguai': [R, B, W, W], 'Catar': [V, W, W, W], 'Peru': [W, W, R, R],
    'Bolívia': [G, W, W, W], 'Venezuela': [V, W, W, W], 'Noruega': [R, W, W, B], 'Suécia': [Y, B, B, B], 'República Tcheca': [R, W, W, W], 'Egito': [R, W, W, W],
    // Brasil
    'Flamengo': [R, W, W, W], 'Palmeiras': [G, W, W, G], 'Atlético-MG': [K, K, W, W], 'São Paulo': [W, W, R, K], 'Corinthians': [W, K, K, K],
    'Fluminense': [V, W, W, W], 'Botafogo': [K, K, W, W], 'Grêmio': [S, K, W, W], 'Internacional': [R, W, W, W], 'Cruzeiro': [B, W, W, W],
    'Santos': [W, W, K, K], 'Bahia': [W, B, B, B], 'Fortaleza': [B, W, R, R], 'Vasco': [K, K, W, W], 'Red Bull Bragantino': [W, W, R, R],
    'Vitória': [R, K, K, K], 'Juventude': [G, W, W, W], 'Mirassol': [Y, G, G, G], 'Sport': [R, K, W, W], 'Ceará': [K, K, W, W],
    // Argentina
    'River Plate': [W, K, R, R], 'Boca Juniors': [B, B, Y, Y], 'Racing': [S, K, N, N], 'Independiente': [R, B, W, W], 'San Lorenzo': [B, B, W, W],
    'Vélez Sarsfield': [W, B, B, B], 'Estudiantes': [R, K, W, W], 'Talleres': [N, N, W, W], 'Rosario Central': [Y, B, B, B], "Newell's Old Boys": [R, K, W, W],
    // Europa
    'Real Madrid': [W, W, N, N], 'Barcelona': [P, N, Y, Y], 'Atlético de Madrid': [R, B, N, N], 'Sevilla': [W, W, R, R], 'Villarreal': [Y, Y, N, N],
    'Athletic Bilbao': [R, K, N, N], 'Real Betis': [G, W, K, K], 'Valencia': [W, K, K, K], 'Real Sociedad': [B, W, W, W],
    'Manchester City': [S, W, N, N], 'Liverpool': [R, R, W, W], 'Arsenal': [R, W, N, N], 'Chelsea': [B, B, W, W], 'Manchester United': [R, W, W, W],
    'Tottenham': [W, N, N, N], 'Newcastle': [K, K, W, W], 'Aston Villa': [V, W, W, W], 'West Ham': [V, W, S, S], 'Everton': [B, W, W, W],
    'Inter de Milão': [K, K, W, W], 'Juventus': [W, K, Y, Y], 'Milan': [R, W, W, W], 'Napoli': [S, W, W, W], 'Roma': [V, W, W, W],
    'Lazio': [S, W, W, W], 'Atalanta': [K, K, W, W], 'Fiorentina': [P, W, W, W],
    'Bayern de Munique': [R, R, W, W], 'Bayer Leverkusen': [R, K, K, K], 'Borussia Dortmund': [Y, K, K, K], 'RB Leipzig': [W, W, N, N], 'Eintracht Frankfurt': [K, K, W, W],
    'PSG': [N, N, W, W], 'Olympique de Marseille': [W, W, S, S], 'Monaco': [R, W, W, W], 'Lyon': [W, W, N, N], 'Lille': [R, N, W, W],
    'Benfica': [R, W, K, K], 'Porto': [B, B, W, W], 'Sporting': [G, K, K, K], 'Braga': [R, W, W, W],
    'Ajax': [R, W, N, N], 'PSV': [R, W, K, K], 'Feyenoord': [R, K, K, K],
    'Galatasaray': [R, R, W, W], 'Fenerbahçe': [Y, N, W, W], 'Beşiktaş': [K, K, W, W], 'Trabzonspor': [V, B, W, W],
    'Celtic': [G, W, Y, Y], 'Rangers': [B, W, W, W], 'Club Brugge': [B, K, W, W], 'Anderlecht': [P, P, W, W],
    'Olympiacos': [R, R, W, W], 'Panathinaikos': [G, G, W, W], 'AEK Atenas': [Y, K, K, K], 'PAOK': [K, K, W, W],
    'Dinamo Zagreb': [B, B, W, W], 'Hajduk Split': [W, B, B, B], 'Estrela Vermelha': [R, W, W, W], 'Partizan': [K, K, W, W],
    'Slavia Praga': [R, W, W, W], 'Sparta Praga': [V, W, W, W], 'Young Boys': [Y, K, K, K], 'Basel': [R, B, W, W],
    'Red Bull Salzburg': [W, W, R, R], 'Copenhagen': [W, B, B, B], 'Bodø/Glimt': [Y, Y, W, W], 'Malmö FF': [S, W, W, W],
    // América, Ásia e África
    'Peñarol': [Y, K, W, W], 'Nacional': [W, B, B, B], 'Atlético Nacional': [G, W, W, W], 'Millonarios': [B, W, W, W],
    'Colo-Colo': [W, K, K, K], 'Universidad de Chile': [B, B, W, W], 'Olimpia': [W, K, K, K], 'Cerro Porteño': [R, B, W, W],
    'LDU Quito': [W, W, B, B], 'Barcelona SC': [Y, K, K, K], 'Universitario': [W, W, R, R], 'Alianza Lima': [B, B, W, W], 'Sporting Cristal': [S, W, W, W],
    'Club América': [Y, B, B, B], 'Chivas': [R, B, W, W], 'Tigres': [Y, B, B, B], 'Monterrey': [B, B, W, W], 'Cruz Azul': [B, W, W, W], 'Pumas': [W, B, B, B],
    'Inter Miami': ['#F5B6CD', K, K, K], 'LA Galaxy': [W, W, N, N], 'LAFC': [K, K, W, W],
    'Al-Hilal': [B, W, W, W], 'Al-Nassr': [Y, B, B, B], 'Al-Ittihad': [Y, K, K, K], 'Al-Ahli': [G, W, W, W],
    'Al-Sadd': [W, W, K, K], 'Al Ahly': [R, W, W, W], 'Zamalek': [W, W, R, R], 'Wydad': [R, W, W, W], 'Raja Casablanca': [G, W, W, W],
    'Ulsan HD': [B, B, W, W], 'Jeonbuk Hyundai': [G, G, W, W], 'Vissel Kobe': [V, V, W, W], 'Kashima Antlers': [V, W, W, W], 'Urawa Reds': [R, W, W, W],
  };
})(window);
