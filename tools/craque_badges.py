"""Baixa os escudos dos clubes do CRAQUE (TheSportsDB) para craque/badges/<id>.png.

Roda uma vez; os arquivos ficam no repositório para o jogo funcionar offline e sem
depender da API. Uso: python3 tools/craque_badges.py
"""
import json
import pathlib
import re
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "craque" / "badges"
OUT.mkdir(parents=True, exist_ok=True)

# Nome de busca na API (em inglês/sem acento) e país esperado, por nome do clube no jogo.
SEARCH = {
    'Brusque': ('Brusque', 'Brazil'),
    'Tombense': ('Tombense', 'Brazil'),
    'Caxias': ('Caxias', 'Brazil'),
    'Botafogo-PB': ('Botafogo Paraiba', 'Brazil'),
    'Ferroviária': ('Ferroviaria', 'Brazil'),
    'Amazonas': ('Amazonas', 'Brazil'),
    'Athletic-MG': ('Athletic Club', 'Brazil'),
    'Criciúma': ('Criciuma', 'Brazil'),
    'Cuiabá': ('Cuiaba', 'Brazil'),
    'Atlético-GO': ('Atletico Goianiense', 'Brazil'),
    'Santa Cruz': ('Santa Cruz', 'Brazil'),
    'Argentinos Juniors': ('Argentinos Juniors', 'Argentina'),
    'Godoy Cruz': ('Godoy Cruz', 'Argentina'),
    'Belgrano': ('Belgrano', 'Argentina'),
    'Unión': ('Union Santa Fe', 'Argentina'),
    'Estoril': ('Estoril', 'Portugal'),
    'Moreirense': ('Moreirense', 'Portugal'),
    'Casa Pia': ('Casa Pia', 'Portugal'),
    'Arouca': ('Arouca', 'Portugal'),
    'Mallorca': ('Mallorca', 'Spain'),
    'Rayo Vallecano': ('Rayo Vallecano', 'Spain'),
    'Girona': ('Girona', 'Spain'),
    'Alavés': ('Deportivo Alaves', 'Spain'),
    'Las Palmas': ('Las Palmas', 'Spain'),
    'Espanyol': ('Espanyol', 'Spain'),
    'Brentford': ('Brentford', 'England'),
    'Nottingham Forest': ('Nottingham Forest', 'England'),
    'Bournemouth': ('Bournemouth', 'England'),
    'Leicester City': ('Leicester City', 'England'),
    'Udinese': ('Udinese', 'Italy'),
    'Sassuolo': ('Sassuolo', 'Italy'),
    'Cagliari': ('Cagliari', 'Italy'),
    'Verona': ('Hellas Verona', 'Italy'),
    'Lecce': ('Lecce', 'Italy'),
    'Mainz': ('Mainz', 'Germany'),
    'Augsburg': ('Augsburg', 'Germany'),
    'Hoffenheim': ('Hoffenheim', 'Germany'),
    'Union Berlin': ('Union Berlin', 'Germany'),
    'Köln': ('FC Koln', 'Germany'),
    'Toulouse': ('Toulouse', 'France'),
    'Strasbourg': ('Strasbourg', 'France'),
    'Montpellier': ('Montpellier', 'France'),
    'Reims': ('Stade de Reims', 'France'),
    'Al-Shabab': ('Al Shabab', 'Saudi Arabia'),
    'Al-Ettifaq': ('Al Ettifaq', 'Saudi Arabia'),
    'Al-Taawoun': ('Al Taawoun', 'Saudi Arabia'),
    'New York City': ('New York City', 'USA'),
    'Columbus Crew': ('Columbus Crew', 'USA'),
    'Orlando City': ('Orlando City', 'USA'),
    'Toronto FC': ('Toronto FC', 'Canada'),
    'Chacarita Juniors': ('Chacarita Juniors', 'Argentina'),
    'Ferro Carril Oeste': ('Ferro Carril Oeste', 'Argentina'),
    'Arsenal de Sarandí': ('Arsenal Sarandi', 'Argentina'),
    'Penafiel': ('Penafiel', 'Portugal'),
    'Oliveirense': ('Oliveirense', 'Portugal'),
    'Paços de Ferreira': ('Pacos de Ferreira', 'Portugal'),
    'Eibar': ('Eibar', 'Spain'),
    'Elche': ('Elche', 'Spain'),
    'Levante': ('Levante', 'Spain'),
    'Almería': ('Almeria', 'Spain'),
    'Sunderland': ('Sunderland', 'England'),
    'Burnley': ('Burnley', 'England'),
    'Coventry City': ('Coventry', 'England'),
    'Southampton': ('Southampton', 'England'),
    'West Brom': ('West Bromwich Albion', 'England'),
    'Cremonese': ('Cremonese', 'Italy'),
    'Salernitana': ('Salernitana', 'Italy'),
    'Pisa': ('Pisa', 'Italy'),
    'Catanzaro': ('Catanzaro', 'Italy'),
    'Hannover 96': ('Hannover', 'Germany'),
    'Fortuna Düsseldorf': ('Fortuna Dusseldorf', 'Germany'),
    'Karlsruher SC': ('Karlsruhe', 'Germany'),
    'Paderborn': ('Paderborn', 'Germany'),
    'Bordeaux': ('Bordeaux', 'France'),
    'Auxerre': ('Auxerre', 'France'),
    'Ajaccio': ('Ajaccio', 'France'),
    'Grenoble': ('Grenoble', 'France'),
    'Sparta Rotterdam': ('Sparta Rotterdam', 'The Netherlands'),
    'Vitesse': ('Vitesse', 'The Netherlands'),
    'NEC': ('NEC Nijmegen', 'The Netherlands'),
    'Galatasaray': ('Galatasaray', 'Turkey'),
    'Fenerbahçe': ('Fenerbahce', 'Turkey'),
    'Beşiktaş': ('Besiktas', 'Turkey'),
    'Trabzonspor': ('Trabzonspor', 'Turkey'),
    'Başakşehir': ('Basaksehir', 'Turkey'),
    'Konyaspor': ('Konyaspor', 'Turkey'),
    'Antalyaspor': ('Antalyaspor', 'Turkey'),
    'Kasımpaşa': ('Kasimpasa', 'Turkey'),
    'Club América': ('Club America', 'Mexico'),
    'Chivas': ('CD Guadalajara', 'Mexico'),
    'Tigres': ('Tigres UANL', 'Mexico'),
    'Monterrey': ('Monterrey', 'Mexico'),
    'Cruz Azul': ('Cruz Azul', 'Mexico'),
    'Pumas': ('Pumas UNAM', 'Mexico'),
    'Toluca': ('Toluca', 'Mexico'),
    'Santos Laguna': ('Santos Laguna', 'Mexico'),

    "Atlético-MG": ("Atletico Mineiro", "Brazil"), "São Paulo": ("Sao Paulo", "Brazil"),
    "Grêmio": ("Gremio", "Brazil"), "Vasco": ("Vasco da Gama", "Brazil"), "Goiás": ("Goias", "Brazil"),
    "Avaí": ("Avai", "Brazil"), "Náutico": ("Nautico", "Brazil"), "Ypiranga-RS": ("Ypiranga", "Brazil"),
    "Confiança": ("Confianca", "Brazil"), "São Bernardo": ("Sao Bernardo", "Brazil"),
    "Atlético de Madrid": ("Atletico Madrid", "Spain"), "Inter de Milão": ("Inter Milan", "Italy"),
    "Bayern de Munique": ("Bayern Munich", "Germany"), "Olympique de Marseille": ("Marseille", "France"),
    "PSG": ("Paris Saint-Germain", "France"), "Al-Hilal": ("Al-Hilal", "Saudi Arabia"),
    "Tottenham": ("Tottenham Hotspur", "England"), "Newcastle": ("Newcastle United", "England"), "Al-Nassr": ("Al Nassr", "Saudi Arabia"),
    "Al-Ittihad": ("Al-Ittihad", "Saudi Arabia"), "LAFC": ("Los Angeles FC", "USA"), "Sevilla": ("Sevilla", "Spain"),
    "Bahia": ("Bahia", "Brazil"), "Santos": ("Santos", "Brazil"), "Botafogo": ("Botafogo", "Brazil"),
    "Guarani": ("Guarani", "Brazil"), "Racing": ("Racing Club", "Argentina"), "Braga": ("Braga", "Portugal"),
    "Porto": ("Porto", "Portugal"), "Sporting": ("Sporting CP", "Portugal"), "Milan": ("AC Milan", "Italy"),
    "Roma": ("AS Roma", "Italy"), "Monaco": ("Monaco", "France"), "Lyon": ("Lyon", "France"),
    "Internacional": ("Internacional", "Brazil"), "Independiente": ("Independiente", "Argentina"),
    # clubes da expansão
    "Remo": ("Clube do Remo", "Brazil"), "Botafogo-SP": ("Botafogo SP", "Brazil"), "Sport": ("Sport Recife", "Brazil"),
    "Ceará": ("Ceara", "Brazil"), "América-MG": ("America Mineiro", "Brazil"), "Novorizontino": ("Gremio Novorizontino", "Brazil"),
    "Operário-PR": ("Operario Ferroviario", "Brazil"), "Athletico-PR": ("Athletico Paranaense", "Brazil"), "Red Bull Bragantino": ("Red Bull Bragantino", "Brazil"),
    "Vitória": ("Vitoria", "Brazil"), "Volta Redonda": ("Volta Redonda", "Brazil"),
    "Vélez Sarsfield": ("Velez Sarsfield", "Argentina"), "Estudiantes": ("Estudiantes de La Plata", "Argentina"), "Talleres": ("Talleres Cordoba", "Argentina"),
    "Lanús": ("Lanus", "Argentina"), "Huracán": ("Huracan", "Argentina"), "Newell's Old Boys": ("Newells Old Boys", "Argentina"),
    "Gimnasia La Plata": ("Gimnasia La Plata", "Argentina"), "Colón": ("Colon", "Argentina"),
    "Peñarol": ("Penarol", "Uruguay"), "Nacional": ("Nacional Montevideo", "Uruguay"), "Liverpool (URU)": ("Liverpool Montevideo", "Uruguay"),
    "River Plate (URU)": ("River Plate Montevideo", "Uruguay"), "Defensor Sporting": ("Defensor Sporting", "Uruguay"),
    "Atlético Nacional": ("Atletico Nacional", "Colombia"), "América de Cali": ("America de Cali", "Colombia"), "Junior": ("Atletico Junior", "Colombia"),
    "Independiente Santa Fe": ("Independiente Santa Fe", "Colombia"), "Deportes Tolima": ("Deportes Tolima", "Colombia"),
    "Vitória de Guimarães": ("Vitoria Guimaraes", "Portugal"), "Famalicão": ("Famalicao", "Portugal"), "Marítimo": ("Maritimo", "Portugal"),
    "Leixões": ("Leixoes", "Portugal"), "Académica": ("Academica de Coimbra", "Portugal"),
    "Celta de Vigo": ("Celta Vigo", "Spain"), "Sporting Gijón": ("Sporting Gijon", "Spain"), "Deportivo La Coruña": ("Deportivo La Coruna", "Spain"),
    "Málaga": ("Malaga", "Spain"), "Cádiz": ("Cadiz", "Spain"), "Real Betis": ("Real Betis", "Spain"),
    "Brighton": ("Brighton and Hove Albion", "England"), "West Ham": ("West Ham United", "England"), "Wolverhampton": ("Wolverhampton Wanderers", "England"),
    "Norwich City": ("Norwich City", "England"),
    "Stuttgart": ("VfB Stuttgart", "Germany"), "Wolfsburg": ("VfL Wolfsburg", "Germany"), "Freiburg": ("SC Freiburg", "Germany"),
    "Borussia M'gladbach": ("Borussia Monchengladbach", "Germany"), "Hamburgo": ("Hamburg", "Germany"), "Hertha Berlin": ("Hertha", "Germany"),
    "Nürnberg": ("Nurnberg", "Germany"), "Kaiserslautern": ("Kaiserslautern", "Germany"),
    "Saint-Étienne": ("St Etienne", "France"), "Nice": ("Nice", "France"), "Lille": ("Lille OSC", "France"),
    "PSV": ("PSV Eindhoven", "The Netherlands"), "AZ Alkmaar": ("AZ Alkmaar", "The Netherlands"), "Twente": ("Twente", "The Netherlands"),
    "Utrecht": ("Utrecht", "The Netherlands"), "Heerenveen": ("Heerenveen", "The Netherlands"), "Groningen": ("Groningen", "The Netherlands"),
    "Al-Ahli": ("Al Ahli Jeddah", "Saudi Arabia"), "Seattle Sounders": ("Seattle Sounders", "USA"), "Atlanta United": ("Atlanta United", "USA"),
}
# Clubes que a busca por nome não acha direito: código do API-Football (logo em media.api-sports.io).
APIFOOTBALL = {"PSG": 85, "Al-Hilal": 2932, "Al-Ittihad": 2938, "Nottingham Forest": 65, "Al-Shabab": 2940}
COUNTRY = {"bra": "Brazil", "arg": "Argentina", "por": "Portugal", "esp": "Spain", "ing": "England",
           "ita": "Italy", "ale": "Germany", "fra": "France", "ara": "Saudi Arabia", "usa": "USA",
           "uru": "Uruguay", "col": "Colombia", "ned": "The Netherlands", "tur": "Turkey", "mex": "Mexico"}


def clubs():
    js = "const D=require('./craque/src/data.js');console.log(JSON.stringify(D.CLUBS))"
    return json.loads(subprocess.check_output(["node", "-e", js], cwd=ROOT))


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "craque-prototype/1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    report = {}
    for cl in clubs():
        dest = OUT / (cl["id"] + ".png")
        if dest.exists():
            report[cl["id"]] = "ok (cache)"
            continue
        if cl["name"] in APIFOOTBALL:
            dest.write_bytes(get("https://media.api-sports.io/football/teams/%d.png" % APIFOOTBALL[cl["name"]]))
            report[cl["id"]] = "ok: API-Football %d" % APIFOOTBALL[cl["name"]]
            continue
        name, country = SEARCH.get(cl["name"], (cl["name"], COUNTRY[cl["league"].split("-")[0]]))
        url = "https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=" + urllib.parse.quote(name)
        try:
            teams = json.loads(get(url)).get("teams") or []
        except Exception as e:  # rede instável: tenta de novo depois
            report[cl["id"]] = "erro na busca: %s" % e
            time.sleep(3)
            continue
        soccer = [t for t in teams if t.get("strSport") == "Soccer" and t.get("strBadge")
                  and "women" not in (t.get("strTeam") or "").lower()]
        # Exige o país certo: sem isso a busca pega clubes homônimos de outros países
        pick = [t for t in soccer if (t.get("strCountry") or "") in (country, "United States" if country == "USA" else country, "Monaco")]
        if not pick:
            report[cl["id"]] = "não encontrado (%s)" % name
            time.sleep(2.2)
            continue
        t = pick[0]
        dest.write_bytes(get(t["strBadge"] + "/small"))
        report[cl["id"]] = "ok: %s (%s)" % (t["strTeam"], t.get("strCountry"))
        time.sleep(2.2)  # a chave de teste é compartilhada: vai devagar
    for k, v in report.items():
        print(k.ljust(8), v)


if __name__ == "__main__":
    main()
