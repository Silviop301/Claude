"""Baixa as imagens das taças reais (TheSportsDB, campo strTrophy de cada competição).

Uso:  python3 tools/craque_trophies.py <pasta_temporaria>
Depois redimensione com:  node tools/craque_trophies_resize.js <pasta_temporaria>
O resultado vai para craque/trophies/<slug>.png e craque/src/trophy-imgs.js (mapa nome da taça -> arquivo).
Taças sem imagem (Bola de Ouro, US Open Cup, Copa MX) continuam desenhadas em SVG.
"""
import json, pathlib, sys, time, unicodedata, urllib.request

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
}


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return "".join(ch if ch.isalnum() else "-" for ch in s).strip("-")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    found = {}
    for name, lid in IDS.items():
        data = json.loads(get("https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=%d" % lid))
        league = (data.get("leagues") or [{}])[0]
        url = league.get("strTrophy")
        if not url:
            print("sem imagem:", name, lid, league.get("strLeague"))
            continue
        (out / (slug(name) + ".png")).write_bytes(get(url))
        found[name] = slug(name)
        print("ok:", name, "<-", league.get("strLeague"))
        time.sleep(0.7)
    (out / "found.json").write_text(json.dumps(found, ensure_ascii=False))


if __name__ == "__main__":
    main()
