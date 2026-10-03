"""Mostra os erros que aconteceram no jogo nos aparelhos dos jogadores (climbix.app/api/errors.php).

Uso: python3 tools/craque_erros.py            (os mais recentes)
     python3 tools/craque_erros.py ef5c6cf2   (só de uma versão do jogo)
"""
import json, os, ssl, sys, urllib.request

url = "https://climbix.app/api/errors.php?a=list" + ("&ver=" + sys.argv[1] if len(sys.argv) > 1 else "")
ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
with urllib.request.urlopen(url, context=ctx, timeout=20) as r:
    rows = json.load(r).get("errors", [])
if not rows:
    print("Nenhum erro registrado.")
for e in rows:
    print("%4dx  %s  [%s · %s]" % (e["n"], e["msg"], e["ver"] or "?", e["step"] or "?"))
    print("       %s:%s:%s · %s · de %s a %s" % (e["src"] or "?", e["line"], e["col"], e["ua"], e["first"], e["last"]))
    if e.get("stack"):
        print("       " + e["stack"].replace("\n", "\n       ")[:600])
    print()
