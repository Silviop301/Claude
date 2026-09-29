"""Baixa os escudos dos clubes do CRAQUE (TheSportsDB) para craque/badges/<id>.png.

Roda uma vez; os arquivos ficam no repositório para o jogo funcionar offline e sem
depender da API. Uso: python3 tools/craque_badges.py
"""
import json
import pathlib
import re
import subprocess
import time
import unicodedata
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
# Nomes de busca dos clubes do upgrade de times (sem acento / como a API conhece)
SEARCH.update({
    "Paraná": ("Parana", "Brazil"), "América-RN": ("America RN", "Brazil"), "Sampaio Corrêa": ("Sampaio Correa", "Brazil"),
    "River-PI": ("River PI", "Brazil"), "XV de Piracicaba": ("XV de Piracicaba", "Brazil"), "Operário-MS": ("Operario MS", "Brazil"),
    "Instituto": ("Instituto", "Argentina"), "Sarmiento": ("Sarmiento", "Argentina"), "Atlanta": ("Atlanta", "Argentina"),
    "San Martín de Tucumán": ("San Martin Tucuman", "Argentina"), "Nacional da Madeira": ("Nacional", "Portugal"),
    "AVS": ("AVS", "Portugal"), "Estrela da Amadora": ("Estrela", "Portugal"), "União de Leiria": ("Uniao Leiria", "Portugal"),
    "Queens Park Rangers": ("QPR", "England"), "Preston North End": ("Preston", "England"), "Plymouth Argyle": ("Plymouth", "England"),
    "Südtirol": ("Sudtirol", "Italy"), "Greuther Fürth": ("Greuther Furth", "Germany"), "Preußen Münster": ("Preussen Munster", "Germany"),
    "Bochum": ("VfL Bochum", "Germany"), "Red Star": ("Red Star", "France"), "Heracles": ("Heracles Almelo", "The Netherlands"),
    "Rizespor": ("Rizespor", "Turkey"), "Gaziantep": ("Gaziantep", "Turkey"), "León": ("Leon", "Mexico"), "Tijuana": ("Tijuana", "Mexico"),
    "Mazatlán": ("Mazatlan", "Mexico"), "Racing (URU)": ("Racing Montevideo", "Uruguay"), "Cerro": ("Cerro", "Uruguay"),
    "Everton (CHI)": ("Everton", "Chile"), "Nacional (PAR)": ("Nacional", "Paraguay"), "Guaraní": ("Guarani", "Paraguay"),
    "Universidad Católica (EQU)": ("Universidad Catolica", "Ecuador"), "Barcelona SC": ("Barcelona SC", "Ecuador"),
    "Hearts": ("Hearts", "Scotland"), "AEK Atenas": ("AEK Athens", "Greece"), "OFI": ("OFI", "Greece"), "Lamia": ("Lamia", "Greece"),
    "Rapid Viena": ("Rapid Wien", "Austria"), "Austria Viena": ("Austria Wien", "Austria"), "Rheindorf Altach": ("Altach", "Austria"),
    "Ried": ("Ried", "Austria"), "Copenhagen": ("Copenhagen", "Denmark"), "AGF": ("Aarhus", "Denmark"), "Odense": ("Odense", "Denmark"),
    "Urawa Reds": ("Urawa", "Japan"), "Yokohama F. Marinos": ("Yokohama F Marinos", "Japan"), "Machida Zelvia": ("Machida", "Japan"),
    "Jeonbuk Hyundai": ("Jeonbuk", "South Korea"), "Daejeon Hana": ("Daejeon", "South Korea"), "Union Saint-Gilloise": ("Union Saint-Gilloise", "Belgium"),
    "OH Leuven": ("Leuven", "Belgium"), "Standard Liège": ("Standard Liege", "Belgium"), "Zürich": ("Zurich", "Switzerland"),
    "Lausanne": ("Lausanne", "Switzerland"), "Yverdon": ("Yverdon", "Switzerland"), "Wolfsberger": ("Wolfsberger", "Austria"),
})
COUNTRY = {"bra": "Brazil", "arg": "Argentina", "por": "Portugal", "esp": "Spain", "ing": "England",
           "ita": "Italy", "ale": "Germany", "fra": "France", "ara": "Saudi Arabia", "usa": "USA",
           "uru": "Uruguay", "col": "Colombia", "ned": "The Netherlands", "tur": "Turkey", "mex": "Mexico",
           "bel": "Belgium", "sco": "Scotland", "gre": "Greece", "sui": "Switzerland", "aut": "Austria", "den": "Denmark",
           "chi": "Chile", "par": "Paraguay", "ecu": "Ecuador", "jpn": "Japan", "kor": "South Korea", "qat": "Qatar"}
# Países com mais de um nome na API
ALIASES = {"South Korea": ("South Korea", "Korea Republic", "Korea"), "USA": ("USA", "United States", "Canada"),
           "The Netherlands": ("The Netherlands", "Netherlands"), "England": ("England", "Wales")}
# Nomes que a busca só acha escritos de outro jeito
SEARCH.update({
    "Hearts": ("Heart of Midlothian", "Scotland"), "Copenhagen": ("FC Copenhagen", "Denmark"), "Midtjylland": ("FC Midtjylland", "Denmark"),
    "Nordsjælland": ("FC Nordsjaelland", "Denmark"), "Odense": ("Odense BK", "Denmark"), "Austria Viena": ("FK Austria Wien", "Austria"),
    "Blau-Weiss Linz": ("Blau Weiss Linz", "Austria"), "Union Saint-Gilloise": ("Union Saint Gilloise", "Belgium"),
    "Sint-Truiden": ("Sint Truiden", "Belgium"), "Lausanne": ("Lausanne Sport", "Switzerland"), "O'Higgins": ("O Higgins", "Chile"),
    "Everton (CHI)": ("Everton de Vina del Mar", "Chile"), "Olimpia": ("Club Olimpia", "Paraguay"), "Libertad": ("Club Libertad", "Paraguay"),
    "Guaraní": ("Club Guarani", "Paraguay"), "Nacional (PAR)": ("Club Nacional", "Paraguay"), "Daejeon Hana": ("Daejeon Hana Citizen", "South Korea"),
    "Preston North End": ("Preston North End", "England"), "América-RN": ("America de Natal", "Brazil"),
    "OH Leuven": ("Oud Heverlee Leuven", "Belgium"), "Colo-Colo": ("CSD Colo Colo", "Chile"),
    "Nacional da Madeira": ("Clube Desportivo Nacional", "Portugal"), "Operário-MS": ("Operario Campo Grande", "Brazil"),
    "Universidad Católica (EQU)": ("Universidad Catolica del Ecuador", "Ecuador"), "Al-Arabi": ("Al Arabi", "Qatar"),
})
# Convidados do Mundial de Clubes (fora das ligas do jogo): id do escudo -> (busca, país)
EXTRA = {"cwc-0": ("Al Ahly", "Egypt"), "cwc-1": ("Mamelodi Sundowns", "South Africa"), "cwc-2": ("Esperance", "Tunisia"),
         "cwc-3": ("Wydad Casablanca", "Morocco"), "cwc-4": ("Auckland City", "New Zealand")}


def clubs():
    js = "const D=require('./craque/src/data.js');console.log(JSON.stringify(D.CLUBS))"
    return json.loads(subprocess.check_output(["node", "-e", js], cwd=ROOT))


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "craque-prototype/1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    report = {}
    extra = [{"id": k, "name": v[0], "league": "?", "search": v} for k, v in EXTRA.items()]
    for cl in clubs() + extra:
        dest = OUT / (cl["id"] + ".png")
        if dest.exists():
            report[cl["id"]] = "ok (cache)"
            continue
        if cl["name"] in APIFOOTBALL:
            dest.write_bytes(get("https://media.api-sports.io/football/teams/%d.png" % APIFOOTBALL[cl["name"]]))
            report[cl["id"]] = "ok: API-Football %d" % APIFOOTBALL[cl["name"]]
            continue
        name, country = cl.get("search") or SEARCH.get(cl["name"], (cl["name"], COUNTRY[cl["league"].split("-")[0]]))
        okc = ALIASES.get(country, (country,)) + ("Monaco",)
        # Tenta o nome de busca, depois sem acento, sem o "(PAÍS)" do fim e sem hífen (a API não acha "Al-Sadd", acha "Al Sadd")
        plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
        bare = re.sub(r"\s*\(.*\)$", "", plain)
        tries = [name] + [x for x in (plain, bare, bare.replace("-", " ")) if x != name]
        pick, err = [], None
        for q in dict.fromkeys(tries):
            try:
                teams = json.loads(get("https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=" + urllib.parse.quote(q))).get("teams") or []
            except Exception as e:  # rede instável: tenta de novo depois
                err = e
                time.sleep(3)
                continue
            soccer = [t for t in teams if t.get("strSport") == "Soccer" and t.get("strBadge")
                      and "women" not in (t.get("strTeam") or "").lower() and (t.get("strGender") or "Male") != "Female"]
            # Exige o país certo: sem isso a busca pega clubes homônimos de outros países
            pick = [t for t in soccer if (t.get("strCountry") or "") in okc]
            time.sleep(2.2)
            if pick:
                break
        if err and not pick:
            report[cl["id"]] = "erro na busca: %s" % err
            continue
        if not pick:
            report[cl["id"]] = "não encontrado (%s)" % name
            continue
        t = pick[0]
        dest.write_bytes(get(t["strBadge"] + "/small"))
        report[cl["id"]] = "ok: %s (%s)" % (t["strTeam"], t.get("strCountry"))
    for k, v in report.items():
        print(k.ljust(8), v)


if __name__ == "__main__":
    main()
