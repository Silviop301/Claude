#!/usr/bin/env bash
# Checagens automáticas do ciclo de desenvolvimento (passo 1 do "Ciclo" no CLAUDE.md), num resumo curto.
# Simulador, auditorias de decisões e estilos, erros reais do site, carreiras pela interface (celular e computador)
# com caça de textos, e fotos de todas as telas para olhar.
#
# Uso (na raiz): bash tools/craque_ciclo.sh [pasta]        (padrão /tmp/ciclo)
#   RAPIDO=1 → menos carreiras e sem fotos (uns 5 min em vez de ~25)
# Sai: <pasta>/resumo.txt (o que importa), <pasta>/*.log (saída inteira de cada ferramenta),
#      <pasta>/tr-cel e tr-pc (texto de cada tela), <pasta>/cel e pc (fotos, NN-nome.png)
set -u
OUT=${1:-/tmp/ciclo}; mkdir -p "$OUT"; R="$OUT/resumo.txt"; : > "$R"
export NODE_PATH=${NODE_PATH:-$(npm root -g)}
N=$([ -n "${RAPIDO:-}" ] && echo 2 || echo 6)
say() { echo "$*" | tee -a "$R"; }

curl -s -o /dev/null http://localhost:8765/craque/ || { python3 -m http.server 8765 >/dev/null 2>&1 & sleep 1; }

say "== Ciclo $(date -u +%F) · $(git rev-parse --short HEAD) · sw $(grep -o 'craque-[a-f0-9]*' craque/sw.js | head -1)"
say "-- Equilíbrio (alvo S11/A26/B31/C19/D13, ~9 min)"
node tools/craque_sim.js 3000 > "$OUT/sim.log" 2>&1; grep -E "^Notas finais|^Duração|^Acerto" "$OUT/sim.log" | tee -a "$R"
say "-- Decisões (esperado 0 alertas)"
node tools/craque_audit_eventos.js > "$OUT/eventos.log" 2>&1; tail -3 "$OUT/eventos.log" | tee -a "$R"
node tools/craque_estilos.js > "$OUT/estilos.log" 2>&1; grep "^Alertas" "$OUT/estilos.log" | sed 's/^/estilos: /' | tee -a "$R"
node tools/craque_decisoes.js > "$OUT/decisoes.log" 2>&1; tail -1 "$OUT/decisoes.log" | tee -a "$R"
say "-- Erros reais no site (versão no ar primeiro)"
SSL_CERT_FILE=${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt} timeout 60 python3 tools/craque_erros.py > "$OUT/erros.log" 2>&1
grep -E "^ *[0-9]+x" "$OUT/erros.log" | head -8 | tee -a "$R"
say "-- Carreiras pela interface ($N por posição)"
TR="$OUT/tr-cel" timeout 1500 node tools/craque_e2e.js $N 390 4 > "$OUT/e2e-cel.log" 2>&1; grep -A12 "^Problemas" "$OUT/e2e-cel.log" | sed 's/^/celular: /' | tee -a "$R"
DESKTOP=1 TR="$OUT/tr-pc" timeout 1500 node tools/craque_e2e.js $((N / 2 > 0 ? N / 2 : 1)) 1280 4 > "$OUT/e2e-pc.log" 2>&1; grep -A12 "^Problemas" "$OUT/e2e-pc.log" | sed 's/^/computador: /' | tee -a "$R"
say "-- Textos nas telas"
python3 tools/craque_lint_textos.py "$OUT/tr-cel" 15 | tee -a "$R"
if [ -z "${RAPIDO:-}" ]; then
  say "-- Fotos (olhar uma a uma: $OUT/cel e $OUT/pc)"
  timeout 1500 node tools/craque_telas.js "$OUT/cel" > "$OUT/telas-cel.log" 2>&1; tail -1 "$OUT/telas-cel.log" | tee -a "$R"
  DESKTOP=1 timeout 1500 node tools/craque_telas.js "$OUT/pc" 1440 900 > "$OUT/telas-pc.log" 2>&1; tail -1 "$OUT/telas-pc.log" | tee -a "$R"
  python3 -c "import json,sys;[print(k, json.load(open(sys.argv[1]+'/'+k+'/telas.json'))['errors'][:5]) for k in ('cel','pc')]" "$OUT" | sed 's/^/erros nas fotos: /' | tee -a "$R"
fi
say "Resumo em $R"
