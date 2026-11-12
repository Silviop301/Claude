"""Escudos em alta (2026-11-12): troca craque/badges/<id>.png por versões de 256 px.

Fonte: ESPN (500 px) para os clubes que têm tools/espn/<id>.json; os outros pela
TheSportsDB no tamanho cheio (sem o "/small" de antes), com a mesma busca de
craque_badges.py. Grava primeiro numa pasta à parte e compara com o escudo atual
(parecido = mesma cor e forma em 24 px); só troca com `aplicar`.

Uso: python3 tools/craque_badges_hd.py baixar PASTA   # baixa e grava PASTA/<id>.png + PASTA/relatorio.json
     python3 tools/craque_badges_hd.py aplicar PASTA  # copia para craque/badges os aceitos
"""
import io
import json
import pathlib
import re
import shutil
import sys
import time
import unicodedata
import urllib.parse

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import craque_badges as B  # noqa: E402

SIZE = 256
ESPN = B.ROOT / "tools" / "espn"


def norm(raw):
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bb:
        im = im.crop(bb)
    w, h = im.size
    s = SIZE / max(w, h)
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
    return out


def save(im, dest):
    q = im.quantize(256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    q.save(dest, optimize=True)


def sig(im):
    im = im.convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bb:
        im = im.crop(bb)
    bg = Image.new("RGBA", im.size, (128, 128, 128, 255))
    bg.alpha_composite(im)
    return list(bg.convert("RGB").resize((24, 24), Image.BILINEAR).get_flattened_data())


def diff(a, b):
    return sum(abs(x - y) for p, q in zip(a, b) for x, y in zip(p, q)) / (24 * 24 * 3)


def sdb(cl):
    name, country = cl.get("search") or B.SEARCH.get(cl["name"], (cl["name"], B.COUNTRY[cl["league"].split("-")[0]]))
    okc = B.ALIASES.get(country, (country,)) + ("Monaco",)
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    bare = re.sub(r"\s*\(.*\)$", "", plain)
    for q in dict.fromkeys([name] + [x for x in (plain, bare, bare.replace("-", " ")) if x != name]):
        for _ in range(3):
            try:
                teams = json.loads(B.get("https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=" + urllib.parse.quote(q))).get("teams") or []
                break
            except Exception:
                time.sleep(5)
        else:
            teams = []
        time.sleep(2.2)
        pick = [t for t in teams if t.get("strSport") == "Soccer" and t.get("strBadge")
                and "women" not in (t.get("strTeam") or "").lower() and (t.get("strGender") or "Male") != "Female"
                and (t.get("strCountry") or "") in okc]
        if pick:
            return pick[0]["strBadge"], "sdb: %s" % pick[0]["strTeam"]
    return None, "não achou"


def baixar(pasta):
    pasta.mkdir(parents=True, exist_ok=True)
    rp = pasta / "relatorio.json"
    rep = json.loads(rp.read_text()) if rp.exists() else {}
    extra = [{"id": k, "name": v[0], "league": "?", "search": v} for k, v in B.EXTRA.items()]
    for cl in B.clubs() + extra:
        cid = cl["id"]
        cur = B.OUT / (cid + ".png")
        if cid in rep or not cur.exists():
            continue
        url, src = None, ""
        ej = ESPN / (cid + ".json")
        if ej.exists():
            url, src = "https://a.espncdn.com/i/teamlogos/soccer/500/%s.png" % json.loads(ej.read_text())["team"], "espn"
        try:
            raw = B.get(url) if url else None
        except Exception:
            raw = None
        if raw is None:
            url, src = sdb(cl)
            try:
                raw = B.get(url) if url else None
            except Exception:
                raw = None
        if raw is None:
            rep[cid] = {"name": cl["name"], "src": src, "ok": False}
        else:
            im = norm(raw)
            save(im, pasta / (cid + ".png"))
            old = Image.open(cur)
            rep[cid] = {"name": cl["name"], "src": src, "url": url, "old": old.size[0], "d": round(diff(sig(im), sig(old)), 1), "ok": True}
        print(cid.ljust(10), rep[cid].get("d", "-"), src, flush=True)
        rp.write_text(json.dumps(rep, ensure_ascii=False, indent=0))


def aplicar(pasta):
    rep = json.loads((pasta / "relatorio.json").read_text())
    n = 0
    for cid, r in rep.items():
        if r.get("ok") and not r.get("recusado"):
            shutil.copyfile(pasta / (cid + ".png"), B.OUT / (cid + ".png"))
            n += 1
    print("trocados:", n)


if __name__ == "__main__":
    {"baixar": baixar, "aplicar": aplicar}[sys.argv[1]](pathlib.Path(sys.argv[2]))
