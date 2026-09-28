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
}
# Clubes que a busca por nome não acha direito: código do API-Football (logo em media.api-sports.io).
APIFOOTBALL = {"PSG": 85, "Al-Hilal": 2932, "Al-Ittihad": 2938}
COUNTRY = {"bra": "Brazil", "arg": "Argentina", "por": "Portugal", "esp": "Spain", "ing": "England",
           "ita": "Italy", "ale": "Germany", "fra": "France", "ara": "Saudi Arabia", "usa": "USA"}


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
