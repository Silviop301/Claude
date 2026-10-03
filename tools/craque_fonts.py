"""Hospeda as fontes do jogo no próprio site (em vez do Google Fonts): mais rápido na primeira visita e funciona offline.

Baixa do Google Fonts só os conjuntos latino e latino-estendido (português) de Barlow, Barlow Condensed e
Playfair Display, mais as 6 fontes de assinatura da carta (Mrs Saint Delafield, Homemade Apple, Rock Salt,
Yellowtail, Zeyada, Monsieur La Doulaise, Kaushan Script, Caveat Brush, Great Vibes, Sedgwick Ave, Pinyon Script; licença OFL ou Apache), grava em craque/fonts/ e escreve as regras @font-face no começo do style.css,
entre os marcadores "fontes do jogo". Rode de novo só se mudar as fontes ou os pesos.
Uso: python3 tools/craque_fonts.py
"""
import pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent / "craque"
URL = ("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@500;600;700&family=Playfair+Display:wght@700;900"
       "&family=Mrs+Saint+Delafield&family=Homemade+Apple&family=Rock+Salt&family=Yellowtail&family=Zeyada&family=Monsieur+La+Doulaise"
       "&family=Kaushan+Script&family=Caveat+Brush&family=Great+Vibes&family=Sedgwick+Ave&family=Pinyon+Script&display=swap")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
css = subprocess.run(["curl", "-sfL", "-A", UA, URL], capture_output=True, text=True, check=True).stdout

rules, by_url = [], {}
for sub, body in re.findall(r"/\* ([a-z-]+) \*/\s*@font-face \{([^}]*)\}", css):
    if sub not in ("latin", "latin-ext"):
        continue
    fam = re.search(r"font-family: '([^']+)'", body).group(1)
    wt = re.search(r"font-weight: (\d+)", body).group(1)
    src = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
    rng = re.search(r"unicode-range: ([^;]+);", body).group(1)
    # O mesmo arquivo pode servir a vários pesos (fonte variável): baixa uma vez só
    name = by_url.setdefault(src, "%s-%s-%s.woff2" % (fam.lower().replace(" ", "-"), wt, sub))
    dest = ROOT / "fonts" / name
    if not dest.exists():
        subprocess.run(["curl", "-sfL", "-o", str(dest), src], check=True)
    rules.append("@font-face { font-family: '%s'; font-style: normal; font-weight: %s; font-display: swap; src: url('fonts/%s') format('woff2'); unicode-range: %s; }" % (fam, wt, name, rng))

block = "/* fontes do jogo (tools/craque_fonts.py) */\n" + "\n".join(rules) + "\n/* fim das fontes do jogo */\n"
style = ROOT / "style.css"
s = style.read_text()
s = re.sub(r"/\* fontes do jogo \(tools/craque_fonts\.py\) \*/\n.*?/\* fim das fontes do jogo \*/\n", "", s, flags=re.S)
# Logo depois do @font-face das bandeiras (que fica no começo do arquivo)
anchor = s.index(":root {")
s = s[:anchor] + block + s[anchor:]
style.write_text(s)
print(len(rules), "regras @font-face ·", len(list((ROOT / "fonts").glob("*.woff2"))), "arquivos em craque/fonts")
