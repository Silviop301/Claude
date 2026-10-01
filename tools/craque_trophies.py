"""Baixa as imagens das taças reais (TheSportsDB, campo strTrophy de cada competição).

Uso:  python3 tools/craque_trophies.py <pasta_temporaria>   (ONLY="Nome,Nome" para baixar só algumas)
Depois redimensione com:  node tools/craque_trophies_resize.js <pasta_temporaria>
O resultado vai para craque/trophies/<slug>.png e craque/src/trophy-imgs.js (mapa nome da taça -> arquivo).
Taças sem imagem (Bola de Ouro, US Open Cup, Copa MX) continuam desenhadas em SVG.
"""
import json, os, pathlib, sys, time, unicodedata, urllib.error, urllib.request

# Nome da taça no jogo -> id da competição no TheSportsDB
IDS = {
    "Brasileirão": 4351, "Série B": 4404, "Série C": 4625, "Copa do Brasil": 4725,
    "Liga Argentina": 4406, "Primera Nacional": 4616, "Copa Argentina": 4500,
    "Liga Portugal": 4344, "Liga Portugal 2": 4662, "Taça de Portugal": 4510,
    "La Liga": 4335, "LaLiga 2": 4400, "Copa do Rei": 4483,
    "Premier League": 4328, "Championship": 4329, "FA Cup": 4482,
    "Serie A": 4332, "Serie B italiana": 4394, "Coppa Italia": 4506,
    "Bundesliga": 4331, "2. Bundesliga": 4399, "Copa da Alemanha": 4485,
    "Ligue 1": 4334, "Ligue 2": 4401, "Copa da França": 4484,
    "Saudi Pro League": 4668, "Copa do Rei Saudita": 5649,
    "MLS": 4346,
    "Liga Uruguaia": 4432, "Copa AUF": 5526,
    "Liga Colombiana": 4497, "Copa Colômbia": 5183,
    "Eredivisie": 4337, "Copa da Holanda": 4902,
    "Süper Lig": 4339, "Copa da Turquia": 4960,
    "Liga MX": 4350,
    "Libertadores": 4501, "Liga dos Campeões": 4480, "Copa do Mundo": 4429,
    # ligas do upgrade de times e o Mundial de Clubes
    "Série D": 5079, "Pro League": 4338, "Copa da Bélgica": 5831, "Premiership": 4330, "Copa da Escócia": 4723,
    "Super League Grega": 4336, "Copa da Grécia": 5830, "Super League Suíça": 4675, "Copa da Suíça": 5489,
    "Bundesliga Austríaca": 4621, "Copa da Áustria": 5883, "Superliga Dinamarquesa": 4340,
    "Liga Chilena": 4627, "Copa Chile": 5378, "Liga Paraguaia": 4687, "Copa Paraguai": 5499,
    "Liga Equatoriana": 4686, "Copa Equador": 5636, "J1 League": 4633, "Copa do Imperador": 5637,
    "K League 1": 4689, "Copa da Coreia": 5635, "Qatar Stars League": 4663, "Copa do Emir": 4971,
    "Mundial de Clubes": 4503,
    # Segundas divisões novas (várias não têm foto da taça na API: ficam com a taça desenhada)
    "Eerste Divisie": 4641, "TFF 1. Lig": 4676, "Liga de Expansión": 4654, "Challenger Pro League": 4623,
    "Scottish Championship": 4395, "Challenge League": 4713, "2. Liga Austríaca": 4796, "1ª Divisão Dinamarquesa": 4683,
    "Primera B Chilena": 4899, "División Intermedia": 4900, "Serie B Equatoriana": 4957, "Segunda División Uruguaia": 5072,
    "Primera B Colombiana": 4951, "J2 League": 4824, "K League 2": 4822, "First Division Saudita": 5627, "USL Championship": 4684,
}


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return "".join(ch if ch.isalnum() else "-" for ch in s).strip("-")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for wait in (5, 15, 40, 0):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:  # 429: limite da API gratuita, espera e tenta de novo
            if e.code != 429 or not wait:
                raise
            time.sleep(wait)


def main():
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    found = {}
    # ONLY="Nome A,Nome B": baixa só essas (para não refazer as que já estão no jogo)
    only = [x for x in os.environ.get("ONLY", "").split(",") if x]
    for name, lid in IDS.items():
        if only and name not in only:
            continue
        data = json.loads(get("https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=%d" % lid))
        league = (data.get("leagues") or [{}])[0]
        url = league.get("strTrophy")
        if not url:
            print("sem imagem:", name, lid, league.get("strLeague"))
            continue
        (out / (slug(name) + ".png")).write_bytes(get(url))
        found[name] = slug(name)
        print("ok:", name, "<-", league.get("strLeague"))
        time.sleep(1.5)
    (out / "found.json").write_text(json.dumps(found, ensure_ascii=False))


if __name__ == "__main__":
    main()
