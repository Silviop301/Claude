"""Gera uma versão de arquivo único do jogo (CSS e JS embutidos).

Uso:
  python3 tools/build.py                 -> dist/pombo-stonks.html (documento completo)
  python3 tools/build.py artifact SAIDA  -> só o conteúdo do <head>/<body>, para publicar como Artifact
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def main():
    html = read("index.html")
    html = re.sub(
        r'<link rel="stylesheet" href="((?!https?:)[^"]+)">',
        lambda m: "<style>\n" + read(m.group(1)) + "\n</style>",
        html,
    )
    html = re.sub(
        r'<script src="([^"]+)"></script>',
        lambda m: "<script>\n" + read(m.group(1)) + "\n</script>",
        html,
    )

    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    if mode == "artifact":
        head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
        head = re.sub(r"<meta[^>]*>\s*", "", head)
        body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
        html = head.strip() + "\n" + body.strip() + "\n"
        default_out = ROOT / "dist" / "pombo-stonks-artifact.html"
    else:
        default_out = ROOT / "dist" / "pombo-stonks.html"

    out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else default_out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
