#!/usr/bin/env bash
# Checagem de equilíbrio do Treinador: roda depois de QUALQUER mudança de regra (motor, campinho, finanças, tática, posição).
# Junta as ferramentas que já existem, em paralelo, e fecha com um semáforo (verde/amarelo/vermelho) por item.
#
# Uso (na raiz): bash tools/craque_equilibrio.sh [pasta]     (padrão /tmp/equilibrio; ~12 min)
#   RAPIDO=1 → amostras menores (~1 min; serve para ver direção, não para decidir)
# Sai: <pasta>/resumo.txt (semáforo) e <pasta>/*.log (saída inteira de cada ferramenta)
#
# O que confere (alvos no topo de tools/craque_equilibrio_resumo.js):
#  1 gols por jogo no ao vivo (campinho decidindo, o padrão do jogo)   craque_campinho_livre.js
#  2 vitória/empate/derrota do seu time no ao vivo                      craque_campinho_livre.js
#  3 metas, demissões e finanças por tamanho de clube                   craque_treinador.js
#  4 nenhuma tática domina: tabela tática + robô de tática fixa x esperto   craque_taticas.js + craque_treinador.js
#  5 fora de posição pesa (atacante no gol perde muito mais que no meio)    craque_duelo.js IMPROVISA
#  6 temporadas inteiras sem quebrar                                   craque_temporadas.js
set -u
OUT=${1:-/tmp/equilibrio}; mkdir -p "$OUT"; rm -f "$OUT"/*.log
if [ -n "${RAPIDO:-}" ]; then J=120; C=24; CT=2; D=40; TS=10; else J=300; C=100; CT=3; D=100; TS=20; fi
T0=$(date +%s)
for SEM in 7 31 55; do node tools/craque_campinho_livre.js $J $SEM > "$OUT/aovivo-$SEM.log" 2>&1 & done
node tools/craque_treinador.js $C $CT > "$OUT/treinador.log" 2>&1 &
FORMA=4-5-1 ESTILO=lados node tools/craque_treinador.js $C $CT > "$OUT/fixa.log" 2>&1 &
ROBO=esperto node tools/craque_treinador.js $C $CT > "$OUT/esperto.log" 2>&1 &
node tools/craque_taticas.js > "$OUT/taticas.log" 2>&1 &
node tools/craque_duelo.js Flamengo Palmeiras $D > "$OUT/duelo.log" 2>&1 &
IMPROVISA=gol node tools/craque_duelo.js Flamengo Palmeiras $D > "$OUT/duelo-gol.log" 2>&1 &
IMPROVISA=mei node tools/craque_duelo.js Flamengo Palmeiras $D > "$OUT/duelo-mei.log" 2>&1 &
node tools/craque_temporadas.js $TS 3 > "$OUT/temporadas.log" 2>&1 &
wait
{ echo "== Equilíbrio $(date -u +%F) · $(git rev-parse --short HEAD) · $(( $(date +%s) - T0 ))s${RAPIDO:+ · RAPIDO}"
  node tools/craque_equilibrio_resumo.js "$OUT"; } | tee "$OUT/resumo.txt"
