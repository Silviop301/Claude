"""Mostra a contagem anônima do jogo (climbix.app/api/stats.php): visitas novas, retornos D1/D7, sessões,
carreiras por modo e até que temporada chegam. É a linha de base do plano Jogo a Jogo + Treinador.

Uso: python3 tools/craque_numeros.py         (últimos 30 dias)
     python3 tools/craque_numeros.py 14      (últimos 14 dias)
     STATS_URL=http://127.0.0.1:8770/api/stats.php python3 tools/craque_numeros.py   (servidor de teste)
"""
import collections, datetime, json, os, ssl, sys, urllib.request

days = int(sys.argv[1]) if len(sys.argv) > 1 else 30
url = (os.environ.get("STATS_URL") or "https://climbix.app/api/stats.php") + "?a=list&days=%d" % days
ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
with urllib.request.urlopen(url, context=ctx, timeout=20) as r:
    data = json.load(r)
rows = data.get("rows", [])
if not rows:
    print("Nenhuma contagem ainda.")
    sys.exit()

by = collections.defaultdict(int)  # (dia, ev, modo, k) -> n
tot = collections.defaultdict(int)  # (ev, modo, k) -> n
for x in rows:
    by[(x["day"], x["ev"], x["mode"], x["k"])] += x["n"]
    tot[(x["ev"], x["mode"], x["k"])] += x["n"]
day_ev = collections.defaultdict(int)
for (d, ev, m, k), n in by.items():
    day_ev[(d, ev)] += n
dias = sorted({d for d, *_ in by})
pct = lambda a, b: ("%3d%%" % round(100 * a / b)) if b else "   -"
D = lambda s: datetime.date.fromisoformat(s)
shift = lambda s, n: (D(s) + datetime.timedelta(days=n)).isoformat()

print("Por dia (D1 = voltaram no dia seguinte / novos do dia; D7 = voltaram do 7º ao 13º dia / novos daquele dia)")
print("dia         novos  D1         D7         sessões")
for d in dias:
    novos = day_ev[(d, "first")]
    d1 = day_ev[(shift(d, 1), "d1")]
    d7 = sum(day_ev[(shift(d, i), "d7")] for i in range(7, 14))  # aproximado: retorno pode cair em qualquer dia da faixa
    print("%s  %5d  %4d %s  %4d %s  %6d" % (d, novos, d1, pct(d1, novos), d7, pct(d7, novos), day_ev[(d, "session")]))

MODOS = ["rapida", "jaj", "relampago", "treinador", "inicio"]
NOME = {"rapida": "Rápida", "jaj": "Jogo a Jogo", "relampago": "Relâmpago", "treinador": "Treinador", "inicio": "Só a tela inicial"}
print("\nSessões por modo e duração (minutos)")
FX = ["0-1", "1-5", "5-10", "10-20", "20-40", "40+"]
print("%-18s %s   total" % ("", " ".join("%6s" % f for f in FX)))
for m in MODOS:
    v = [tot[("session", m, f)] for f in FX]
    if sum(v):
        print("%-18s %s  %6d" % (NOME[m], " ".join("%6d" % n for n in v), sum(v)))

print("\nCarreiras por modo: começaram, chegaram à 2ª / 5ª / 10ª temporada, terminaram")
for m in MODOS[:4]:
    ini = tot[("start", m, "")]
    seas = {int(k): n for (ev, mm, k), n in tot.items() if ev == "season" and mm == m}
    chega = lambda s: seas.get(s - 1, 0)  # chegou à Nª = a (N-1)ª terminou
    fim = tot[("end", m, "")]
    if ini or fim or seas:
        if m == "relampago":
            print("%-12s %5d começaram  %5d terminaram %s" % (NOME[m], ini, fim, pct(fim, ini)))
        else:
            print("%-12s %5d começaram  2ª %4d %s  5ª %4d %s  10ª %4d %s  %5d terminaram %s" % (
                NOME[m], ini, chega(2), pct(chega(2), ini), chega(5), pct(chega(5), ini), chega(10), pct(chega(10), ini), fim, pct(fim, ini)))
print("\n(Chegar à Nª temporada = terminar a anterior. Aparelhos que já jogavam antes da contagem não entram em novos/D1/D7.)")
