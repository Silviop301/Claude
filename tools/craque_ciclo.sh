#!/usr/bin/env bash
# Checagens automáticas do ciclo de desenvolvimento do Treinador (passo 1 do "Ciclo" no CLAUDE.md), num resumo curto.
# Equilíbrio, erros reais do site, carreira e toque duplo pela interface, telas de fora e fotos das telas deitadas.
# (O modo Jogador antigo e as ferramentas dele saíram em 19/11/2026.)
#
# Uso (na raiz): bash tools/craque_ciclo.sh [pasta]        (padrão /tmp/ciclo)
#   RAPIDO=1 → equilíbrio curto, uma temporada pela interface e sem fotos
# Sai: <pasta>/resumo.txt (o que importa), <pasta>/*.log (saída inteira de cada ferramenta), <pasta>/ld (fotos deitadas)
set -u
OUT=${1:-/tmp/ciclo}; mkdir -p "$OUT"; R="$OUT/resumo.txt"; : > "$R"
export NODE_PATH=${NODE_PATH:-$(npm root -g)}
say() { echo "$*" | tee -a "$R"; }

curl -s -o /dev/null http://localhost:8765/craque/ || { python3 -m http.server 8765 >/dev/null 2>&1 & sleep 1; }

say "== Ciclo $(date -u +%F) · $(git rev-parse --short HEAD) · sw $(grep -o 'craque-[a-f0-9]*' craque/sw.js | head -1)"
say "-- Equilíbrio do Treinador"
RAPIDO=${RAPIDO:-} bash tools/craque_equilibrio.sh "$OUT/equilibrio" > "$OUT/equilibrio.log" 2>&1; grep -E "^Resultado|vermelh" "$OUT/equilibrio/resumo.txt" | tee -a "$R"
say "-- Erros reais no site (versão no ar primeiro)"
SSL_CERT_FILE=${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt} timeout 60 python3 tools/craque_erros.py > "$OUT/erros.log" 2>&1
grep -E "^ *[0-9]+x" "$OUT/erros.log" | head -8 | tee -a "$R"
say "-- Contagem anônima"
SSL_CERT_FILE=${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt} timeout 60 python3 tools/craque_numeros.py 14 > "$OUT/numeros.log" 2>&1
grep -E "^Treinador " "$OUT/numeros.log" | tee -a "$R"
say "-- Carreira pela interface (esperado 0 problemas)"
SAFE=47 timeout 1500 node tools/craque_carreira_telas.js $([ -n "${RAPIDO:-}" ] && echo 1 || echo 3) "$OUT/carreira" > "$OUT/carreira.log" 2>&1; tail -4 "$OUT/carreira.log" | tee -a "$R"
say "-- Toque duplo (esperado Pulos: 0)"
timeout 600 node tools/craque_toque_duplo.js > "$OUT/toque.log" 2>&1; tail -2 "$OUT/toque.log" | tee -a "$R"
say "-- Telas de fora da carreira"
timeout 600 node tools/craque_telas_fora.js "$OUT/fora" > "$OUT/fora.log" 2>&1; tail -3 "$OUT/fora.log" | tee -a "$R"
if [ -z "${RAPIDO:-}" ]; then
  say "-- Fotos deitadas (olhar uma a uma: $OUT/ld)"
  timeout 1500 node tools/craque_telas_deitado.js "$OUT/ld" > "$OUT/ld.log" 2>&1; tail -2 "$OUT/ld.log" | tee -a "$R"
fi
say "Resumo em $R"
