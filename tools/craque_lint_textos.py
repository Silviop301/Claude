"""Caça erros de texto nas telas que o robô viu (transcrições do craque_e2e.js com TR=pasta).

Procura: plural errado ("1 jogos", "3 gol"), contração que faltou ("de o", "em a"), placeholder que sobrou ("{n}"),
"undefined"/"NaN"/"null", palavra repetida ("o o"), espaço antes de pontuação e reticências de dois pontos.
Espaço duplo não entra: vem de ícone tirado do texto.

Uso: python3 tools/craque_lint_textos.py <pasta TR> [máximo de linhas]
"""
import collections, glob, json, os, re, sys

PAT = re.compile(
    r"\b(de o|de a|de os|de as|em o|em a|em os|em as|por o|por a)\b"
    r"|\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]|\{[a-zA-Z]+\}"
    r"|\s[,;:](?!\d)|\s\.(?![\d.])"
    r"|\b(\w{2,}) \2\b"
    r"|\b1 (gols|jogos|títulos|temporadas|assistências|pontos|anos|clubes|taças|vezes|desarmes)\b"
    r"|\b(0|[2-9]|\d\d+) (gol|jogo|título|temporada|assistência|taça|vez|desarme)\b(?! de)"
    r"|(?<!\.)\.\.(?!\.)")
# Repetições que são de propósito (nomes de clube, gritos de torcida)
OK = re.compile(r"Bulo Bulo|MONSTRO MONSTRO|vamos chegando, vamos chegando|vamos ver, vamos ver|fala muito, amigos, fala muito", re.I)

def lines(x):
    if isinstance(x, str):
        yield from x.split('\n')
    elif isinstance(x, dict):
        for v in x.values(): yield from lines(v)
    elif isinstance(x, list):
        for v in x: yield from lines(v)

def main():
    d = sys.argv[1]; top = int(sys.argv[2]) if len(sys.argv) > 2 else 40
    hits = collections.Counter()
    files = glob.glob(os.path.join(d, '*.json'))
    for f in files:
        for ln in lines(json.load(open(f))):
            m = PAT.search(ln)
            if m and not OK.search(ln):
                hits[(m.group(0), ln.strip()[:170])] += 1
    print('Textos suspeitos: %d (%d diferentes) em %d carreiras' % (sum(hits.values()), len(hits), len(files)))
    for (g, ln), n in hits.most_common(top):
        print('%4dx  %-12r %s' % (n, g, ln))

main()
