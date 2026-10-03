# Relatório · Balanceamento (branch `fable/balanceamento`)

Seis ajustes, um commit cada, mais um commit com a versão dos arquivos (`tools/craque_sw.py`). Nada foi publicado no site. Todos os números vêm de `node tools/craque_sim.js`, que simula carreiras completas com um robô que joga como alguém que conhece o jogo (sinergias, treino forte até os 28 anos e leve depois dos 32, investe pelo peso da posição, lances em automático). As sementes são fixas (`1000 + n`), então duas rodadas iguais dão o mesmo resultado e a diferença entre "antes" e "depois" é só o ajuste.

**Ruído.** Duas rodadas de 1000 carreiras com sementes diferentes deram S 16% / 16% e Bola de Ouro 12,5% / 12,5%; por posição a nota S variou ±1 a ±2 pontos percentuais. Regra usada no relatório: a 3000 carreiras, só diferenças acima de 1 pp em S (0,5 pp na Bola de Ouro) contam; a 2000 (posições, treino), acima de 2 pp; a 1000 (características), acima de 2 pp em S e 1,5 pp na Bola de Ouro. Tudo abaixo disso é tratado como igual.

## Metas · antes × depois (robô esperto, 3000 carreiras)

| Meta | Alvo | Antes | Depois | Situação |
|---|---|---|---|---|
| Nota S | 11–16% | 16% | 15% | ✅ |
| Bola de Ouro (carreiras com ao menos uma) | 10–12% | 12,0% | 11,6% | ✅ |
| Cartas especiais | ~0,36/carreira · ~70% sem nenhuma | 0,38 · 70% | 0,38 · 70% | ✅ (não mexido) |
| Duração estimada | não pode aumentar | 10min14s | 10min42s | ❌ +28 s (+4,6%) — ver seção *Duração* |
| Nota S por posição (ATA / MEI / ZAG / GOL) | diferença ≤ ~5 pp | 20 / 15 / 9 / 19 (11 pp) | 16 / 14 / 15 / 15 (2 pp) | ✅ |
| Foco de treino | nenhum melhor em tudo | *Normal* dominado por *Leve* | quatro focos parelhos, cada um melhor em algo | ✅ |
| Característica obrigatória | nenhuma (FORCE vs AVOID) | nenhuma (maior: *Drible* +5 pp de S, +6,5 de Bola de Ouro) | nenhuma (maior: *Drible* +5 pp de S, +6,4 de Bola de Ouro) | ✅ |

Outras linhas da mesma rodada:

| Indicador | Antes | Depois |
|---|---|---|
| Notas finais S / A / B / C / D | 16 / 35 / 27 / 21 / 2 | 15 / 43 / 25 / 16 / 1 |
| Bola de Ouro por posição (ATA / MEI / ZAG / GOL) | 27 / 5 / 4 / 12 | 25 / 7 / 5 / 9 |
| 3+ Bolas de Ouro | 0,7% | 0,4% |
| Gols (ATA, mediana) · assistências (MEI, mediana) | 490 · 337 | 490 · 352 |
| Títulos (mediana) · pico de nota geral (mediana) | 9 · 84 | 10 · 85 |
| Campeão do mundo (carreiras) | 18,7% | 27,2% |
| Mundial de Clubes campeão | 7,9% | 14,3% |
| Temporadas · decisões (mediana) | 23 · 83 | 23 · 87 |
| Robô casual (3000): S · Bola de Ouro · duração | 5% · 3,8% · 9min32s | 4% · 3,3% · 9min49s |
| Robô casual: S por posição | 8 / 7 / 2 / 4 | 4 / 6 / 3 / 3 |

## Linha de base: o que fugia das metas e por quê

Na linha de base o total estava na meta (S 16%, Bola de Ouro 12%), mas a nota S dependia da posição: atacante 20%, goleiro 19%, meia 15%, zagueiro 9%. Decompondo os pontos de `S.finish` por posição (média de 750 carreiras de cada):

| Parcela (média de pontos) | ATA | MEI | ZAG | GOL |
|---|---|---|---|---|
| Produção | 372 | 492 | 487 | 538 |
| Títulos (×12) | 139 | 111 | 96 | 122 |
| Continentais (×35) | 72 | 60 | 55 | 67 |
| Mundial de Clubes (×60) | 13 | 7 | 1 | 1 |
| **Copa do Mundo (×150)** | **67** | **62** | **7** | **4** |
| Gols em Copas (×3) | 28 | 5 | 2 | 0 |
| Bola de Ouro (×100) | 41 | 5 | 4 | 13 |
| Prêmios da liga (×8) | 206 | 145 | 167 | 191 |
| Auge (×2) | 169 | 167 | 166 | 170 |
| Bônus de despedida | 98 | 93 | 79 | 82 |
| **Total** | **1203** | **1145** | **1063** | **1187** |
| Copas do Mundo ganhas por carreira | 0,45 | 0,41 | 0,05 | 0,02 |
| Nota média da temporada | 7,96 | 7,41 | 7,26 | 7,50 |

Duas causas:

1. **Copa do Mundo.** Zagueiro e goleiro praticamente não ganhavam Copa (0,05 e 0,02 por carreira contra 0,45 do atacante). Nos jogos com lance decisivo, o lance do atacante/meia só pode somar um gol e o do defensor só pode custar um gol, mas as taxas de gol (0,72 a favor × 1,3 contra em forças iguais) já embutiam o bônus do atacante. Resultado: o defensor jogava o mata-mata com o time dele em desvantagem estrutural.
2. **Nota da temporada com limiares absolutos.** A nota média era ATA 7,96 · GOL 7,50 · MEI 7,41 · ZAG 7,26, e tudo que usa limiar de nota — Seleção da liga (≥ 7,5), Melhor jovem (≥ 7,2), pontos de evolução (≥ 7,4 e ≥ 8,2), bônus de despedida (≥ 7,0), Bola de Ouro — favorecia o atacante e punia o zagueiro. Esses efeitos se realimentam: menos nota → menos pontos de evolução → nota geral menor → clube pior → menos títulos.

Os demais indicadores (cartas, duração, treino "normal" dominado) foram só confirmados na linha de base; o treino é tratado no ajuste F.

## Mudanças (um commit cada)

| Commit | Arquivo | Antes → depois | Por quê |
|---|---|---|---|
| A `57c83ab` Copa e Mundial | `craque/src/engine/worldcup.js` | `wcMatch(c, run, opp, r)` com taxas fixas `0.72 / 1.3` → `wcMatch(c, run, opp, r, moment)`; em jogo com lance e defensor (`S.defKick`), taxas `[1.1, 0.72]` (o time dele segura mais e o lance decide); demais jogos seguem `[0.72, 1.3]`. `moment` é calculado uma vez em `wcNext` e passado ao jogo. `tools/craque_sim.js` passa a imprimir cartas especiais por carreira. | Causa 1. Copas por carreira ZAG 0,05 → 0,27 e GOL 0,02 → 0,24; S por posição foi para 20 / 14 / 12 / 24. |
| B `e8ef91a` Nota por posição | `craque/src/engine/core.js` | novo `S.RATING_ADJ = { ATA: -0.15, MEI: 0.2, ZAG: 0.1, GOL: 0 }`; `POT_ADJ` `{ ATA: -0.45, MEI: 0, ZAG: 0.1, GOL: 0 }` → `{ ATA: -0.3, MEI: -0.2, ZAG: 0, GOL: 0 }` (recalculado para o potencial efetivo não mudar) | Causa 2. Deslocamento somado à nota da temporada. Testei três valores: (−0,25 / +0,25 / +0,4 / +0,15) levou o zagueiro a 37,5% de S pela realimentação; (−0,15 / +0,15 / +0,2 / 0) deu 20 / 17 / 26 / 24; o valor final deu 20 / 19 / 20 / 21. Notas médias passam a 7,82 / 7,63 / 7,40 / 7,50. |
| | `craque/src/engine/season.js` | nota `6.1 + ...` → `6.1 + S.RATING_ADJ[c.pos] + ...`; prêmio Melhor zagueiro `rating >= 7.1 ± 0.15` → `7.2 ± 0.15` | O prêmio compensava a nota baixa do zagueiro; com o deslocamento, a compensação sobrava. |
| C `4d9a50b` Goleiro | `craque/src/engine/finish.js` | produção do defensor: `saves * 0.2` → `0.15`, `penSaved * 3` → `2.5` | Depois de A e B o goleiro tinha a maior produção (538 pontos) e 24% de S; −45 pontos o trazem ao nível das outras posições. |
| D `8b071b2` Nota S | `craque/src/engine/finish.js` | `S.GRADES` S `1560` → `1640` | A e B subiram os pontos de meia, zagueiro e goleiro; o total foi a 20% de S. O piso novo devolve 15%. |
| E `53a1974` Bola de Ouro | `craque/src/engine/season.js` | centro da curva: `(bScore - 98 - 9 * ballon) / 7` → `(bScore - 102 - 9 * ballon) / 7` | Depois de A–D a Bola de Ouro foi a 14,2%. Testei 99,5 (13,1%), 101,5 (12,1%) e 102 (11,7%). A curva por posição não muda (ATA 25 · MEI 7 · ZAG 5 · GOL 9). |
| F `12185d9` Treino | `craque/src/data.js` | `D.TRAIN` *Normal* `p1: 0.1` → `0.18` | *Normal* era dominado por *Leve* (ver tabela do treino). O robô esperto quase não usa *Normal*, então a medição geral não muda. |
| G `e220d69` Versões | `craque/index.html` | versões dos arquivos regeneradas | `tools/craque_sw.py` depois das mudanças em `craque/`. |

Nada mudou nos textos, nas telas ou na forma de jogar: o jogador não vê nenhum dos números acima.

## Depois: posições

Decomposição dos pontos depois dos ajustes (mesma rodada de 3000):

| Parcela (média de pontos) | ATA | MEI | ZAG | GOL |
|---|---|---|---|---|
| Produção | 372 | 512 | 537 | 497 |
| Títulos | 136 | 127 | 126 | 125 |
| Continentais | 72 | 69 | 75 | 70 |
| Mundial de Clubes | 15 | 10 | 8 | 6 |
| Copa do Mundo | 65 | 56 | 48 | 37 |
| Gols em Copas | 28 | 5 | 3 | 0 |
| Bola de Ouro | 36 | 8 | 6 | 10 |
| Prêmios da liga | 191 | 180 | 204 | 194 |
| Auge | 169 | 168 | 169 | 170 |
| Bônus de despedida | 98 | 98 | 80 | 81 |
| **Total** | **1182** | **1233** | **1255** | **1189** |
| Nota S | 16,0% | 14,1% | 15,3% | 15,1% |
| Copas do Mundo ganhas por carreira | 0,43 | 0,37 | 0,32 | 0,25 |
| Nota média da temporada | 7,82 | 7,63 | 7,40 | 7,50 |
| Cartas especiais por carreira · sem nenhuma | 0,52 · 63% | 0,40 · 68% | 0,28 · 75% | 0,33 · 73% |

O atacante continua ganhando mais Copas e mais Bolas de Ouro (é a posição que decide jogo e vence voto); o zagueiro e o goleiro compensam na produção e nos prêmios da liga. A soma é a mesma, e é a soma que vira nota.

Rodadas com todas as carreiras numa só posição (2000 cada), antes × depois:

| Posição | S% antes → depois | Bola de Ouro antes → depois | Produção (mediana) | Títulos (mediana) | Pico (mediana) | Duração |
|---|---|---|---|---|---|---|
| ATA | 21 → 16 | 27,5 → 23,1 | 491 → 492 gols | 11 → 10 | 85 → 85 | 10min50s → 10min42s |
| MEI | 13 → 15 | 5,4 → 6,7 | 338 → 356 assistências | 8 → 10 | 84 → 85 | 10min03s → 10min39s |
| ZAG | 9 → 15 | 3,5 → 5,7 | — | 7 → 9 | 83 → 85 | 9min44s → 10min43s |
| GOL | 19 → 14 | 11,4 → 8,2 | — | 9 → 9 | 85 → 86 | 10min26s → 10min37s |

A duração por posição mostra de onde vem o aumento geral: a carreira do zagueiro ficou 1 minuto mais longa (ele passou a jogar o mata-mata da Copa e a receber mais propostas), a do atacante ficou 8 s mais curta.

## Depois: foco de treino

Rodadas com todas as carreiras presas a um foco (2000 cada). Antes (motor da linha de base) × depois (motor final, que inclui o *Normal* com 18%):

| Foco | S% antes → depois | Bola de Ouro antes → depois | gols ATA | assist. MEI | pico | lesão (multiplicador) |
|---|---|---|---|---|---|---|
| Leve | 15 → 13 | 11,4 → 10,0 | 478 → 488 | 335 → 354 | 84 → 85 | 0,6 |
| Normal | 12 → 13 | 10,8 → 10,8 | 471 → 486 | 320 → 351 | 84 → 85 | 1,0 |
| Forte | 14 → 14 | 11,5 → 11,3 | 472 → 483 | 328 → 343 | 84 → 85 | 1,7 |
| Máximo | 14 → 12 | 13,1 → 12,2 | 470 → 472 | 321 → 343 | 85 → 85 | 3,0 |

Antes, *Normal* perdia para *Leve* em tudo (menos S, menos gols, menos assistências, mesma Bola de Ouro, mais lesão). Depois, *Forte* tem a maior nota S, *Máximo* a maior Bola de Ouro, *Leve* os maiores gols e assistências e *Normal* fica entre eles com a lesão normal — nenhum é melhor em tudo, e a diferença entre o melhor e o pior S (2 pp) está no ruído.

## Características: FORCE × AVOID

Cada linha são duas rodadas de 1000 carreiras: uma em que toda carreira tem a característica (FORCE) e outra em que nenhuma tem (AVOID). As colunas trazem F/A e a diferença. Só diferenças acima de 2 pp em S e 1,5 pp na Bola de Ouro são reais. A última coluna (S por posição) divide os 1000 entre as posições da característica — com 250 carreiras por posição o ruído passa de 5 pp, então ela serve só para ver a direção, não o tamanho. A tabela "antes" foi rodada numa cópia limpa da linha de base (`git worktree` em `aae0ece`), e a "depois" no motor final.

### Antes (motor da linha de base)

| característica | posições | S% F/A | ΔS | BdO% F/A | ΔBdO | gols ATA F/A | ass MEI F/A | títulos F/A | pico F/A | S% por posição F/A |
|---|---|---|---|---|---|---|---|---|---|---|
| artilheiro | ATA | 17/15 | 2 | 13.4/12.1 | 1.3 | 547/447 | 345/351 | 9/9 | 84/84 | ATA 22/17 |
| garcom | MEI | 15/15 | 0 | 12.1/13.1 | -1.0 | 483/479 | 396/317 | 9/8 | 84/84 | MEI 14/14 |
| colocado | ATA/MEI | 14/16 | -2 | 13/12.8 | 0.2 | 481/488 | 338/344 | 8/9 | 84/84 | ATA 18/22 MEI 12/15 |
| parada | ATA/MEI | 15/15 | 0 | 12/13.2 | -1.2 | 465/495 | 344/352 | 8/9 | 84/84 | ATA 20/19 MEI 12/15 |
| drible | ATA/MEI | 20/15 | 5 | 17.9/11.4 | 6.5 | 511/469 | 365/333 | 10/8 | 86/84 | ATA 30/19 MEI 23/12 |
| visao | ATA/MEI | 16/16 | 0 | 12.3/13.4 | -1.1 | 479/492 | 376/336 | 9/8 | 84/84 | ATA 22/22 MEI 13/13 |
| tecnica | ATA/MEI | 19/14 | 5 | 15.7/12.1 | 3.6 | 548/477 | 369/332 | 9/8 | 85/84 | ATA 29/18 MEI 19/11 |
| velocista | ATA/MEI/ZAG | 17/15 | 2 | 14.1/11.5 | 2.6 | 492/486 | 361/340 | 9/9 | 85/84 | ATA 25/18 MEI 19/12 ZAG 5/11 |
| cabeceio | ATA/MEI | 17/15 | 2 | 14.5/12.6 | 1.9 | 531/466 | 329/363 | 9/9 | 84/84 | ATA 29/16 MEI 9/17 |
| academia | ATA/MEI/ZAG/GOL | 17/15 | 2 | 12.8/12.6 | 0.2 | 460/483 | 336/347 | 9/9 | 85/84 | ATA 19/20 MEI 16/15 ZAG 10/11 GOL 23/15 |
| pro | ATA/MEI/ZAG/GOL | 13/16 | -3 | 11/13.6 | -2.6 | 515/464 | 370/342 | 8/9 | 83/85 | ATA 20/22 MEI 10/16 ZAG 8/10 GOL 16/18 |
| estrela | ATA/MEI/ZAG/GOL | 16/16 | 0 | 12.1/11.2 | 0.9 | 477/481 | 344/349 | 9/8 | 85/84 | ATA 19/20 MEI 14/14 ZAG 11/10 GOL 19/19 |
| lider | ATA/MEI/ZAG/GOL | 15/16 | -1 | 11.5/11 | 0.5 | 469/497 | 334/351 | 9/9 | 84/84 | ATA 16/20 MEI 12/16 ZAG 12/10 GOL 20/16 |
| raca | ATA/MEI/ZAG/GOL | 16/15 | 1 | 12/10.7 | 1.3 | 462/489 | 338/344 | 9/8 | 85/84 | ATA 18/18 MEI 15/14 ZAG 11/10 GOL 19/16 |
| frieza | ATA/MEI/ZAG/GOL | 11/17 | -6 | 10.3/13.4 | -3.1 | 486/475 | 320/356 | 7/9 | 83/84 | ATA 20/20 MEI 7/17 ZAG 5/10 GOL 12/20 |
| adaptavel | ATA/MEI/ZAG/GOL | 12/17 | -5 | 9.6/14.3 | -4.7 | 452/494 | 337/349 | 7/9 | 83/85 | ATA 14/20 MEI 12/16 ZAG 8/11 GOL 12/21 |
| patriota | ATA/MEI/ZAG/GOL | 11/17 | -6 | 7.4/14.1 | -6.7 | 446/495 | 320/364 | 7/9 | 83/85 | ATA 14/20 MEI 10/17 ZAG 7/10 GOL 11/22 |
| xerife | ZAG | 16/15 | 1 | 12.1/12.4 | -0.3 | 482/479 | 350/347 | 9/8 | 84/84 | ZAG 11/8 |
| carrinho | ZAG | 17/15 | 2 | 13/12.5 | 0.5 | 479/484 | 347/350 | 9/8 | 84/84 | ZAG 13/9 |
| antecipa | ZAG | 16/16 | 0 | 12/12.5 | -0.5 | 480/469 | 354/347 | 9/9 | 84/84 | ZAG 9/11 |
| saida | ZAG | 15/15 | 0 | 12.2/12.4 | -0.2 | 473/485 | 344/347 | 9/9 | 84/84 | ZAG 9/8 |
| aereo | ZAG | 16/15 | 1 | 12.3/12.2 | 0.1 | 486/478 | 347/351 | 9/9 | 85/84 | ZAG 11/8 |
| reflexo | GOL | 16/15 | 1 | 12.6/12 | 0.6 | 471/484 | 347/347 | 9/9 | 84/84 | GOL 22/16 |
| elastico | GOL | 17/15 | 2 | 12/11.2 | 0.8 | 483/479 | 347/347 | 9/8 | 84/84 | GOL 24/14 |
| maofirme | GOL | 17/15 | 2 | 12.5/12.4 | 0.1 | 470/481 | 344/347 | 9/9 | 84/84 | GOL 23/16 |
| pegador | GOL | 17/16 | 1 | 12.4/12.3 | 0.1 | 486/486 | 346/347 | 9/9 | 84/84 | GOL 24/18 |
| libero | GOL | 17/16 | 1 | 12.6/12.2 | 0.4 | 478/480 | 347/347 | 9/8 | 85/84 | GOL 25/17 |

### Depois (motor final)

| característica | posições | S% F/A | ΔS | BdO% F/A | ΔBdO | gols ATA F/A | ass MEI F/A | títulos F/A | pico F/A | S% por posição F/A |
|---|---|---|---|---|---|---|---|---|---|---|
| artilheiro | ATA | 16/15 | 1 | 10.9/10.2 | 0.7 | 530/463 | 366/367 | 10/9 | 85/85 | ATA 16/12 |
| garcom | MEI | 17/15 | 2 | 11.2/11.7 | -0.5 | 497/482 | 392/335 | 10/10 | 85/85 | MEI 17/12 |
| colocado | ATA/MEI | 16/17 | -1 | 10.5/12.4 | -1.9 | 485/500 | 361/363 | 10/9 | 85/85 | ATA 12/18 MEI 17/12 |
| parada | ATA/MEI | 14/17 | -3 | 10.8/11.8 | -1.0 | 456/505 | 357/360 | 9/9 | 85/85 | ATA 13/16 MEI 12/15 |
| drible | ATA/MEI | 19/14 | 5 | 15.7/9.3 | 6.4 | 522/480 | 372/348 | 11/9 | 86/84 | ATA 23/12 MEI 20/10 |
| visao | ATA/MEI | 17/18 | -1 | 10.5/12.5 | -2.0 | 475/504 | 402/363 | 10/9 | 85/85 | ATA 12/19 MEI 20/16 |
| tecnica | ATA/MEI | 19/16 | 3 | 14.3/10.6 | 3.7 | 536/483 | 401/355 | 10/9 | 86/85 | ATA 22/15 MEI 20/12 |
| velocista | ATA/MEI/ZAG | 17/16 | 1 | 13.9/10.2 | 3.7 | 495/498 | 368/361 | 10/9 | 86/84 | ATA 22/15 MEI 18/11 ZAG 13/24 |
| cabeceio | ATA/MEI | 16/15 | 1 | 12.5/10.6 | 1.9 | 533/482 | 350/367 | 9/10 | 85/85 | ATA 18/15 MEI 12/12 |
| academia | ATA/MEI/ZAG/GOL | 18/15 | 3 | 12.6/11 | 1.6 | 483/486 | 368/371 | 10/10 | 85/85 | ATA 21/14 MEI 19/15 ZAG 18/18 GOL 16/13 |
| pro | ATA/MEI/ZAG/GOL | 16/15 | 1 | 11.3/10.8 | 0.5 | 519/473 | 392/349 | 10/9 | 84/85 | ATA 14/16 MEI 14/10 ZAG 19/18 GOL 14/16 |
| estrela | ATA/MEI/ZAG/GOL | 17/16 | 1 | 13.1/10.6 | 2.5 | 483/490 | 365/364 | 10/9 | 86/85 | ATA 12/16 MEI 16/10 ZAG 22/19 GOL 16/18 |
| lider | ATA/MEI/ZAG/GOL | 13/17 | -4 | 10.7/11.8 | -1.1 | 461/512 | 340/380 | 9/10 | 85/85 | ATA 13/16 MEI 10/18 ZAG 18/19 GOL 12/17 |
| raca | ATA/MEI/ZAG/GOL | 18/15 | 3 | 12.7/10.7 | 2.0 | 477/491 | 358/370 | 10/9 | 86/84 | ATA 14/16 MEI 16/16 ZAG 26/16 GOL 16/12 |
| frieza | ATA/MEI/ZAG/GOL | 13/17 | -4 | 9.6/12 | -2.4 | 491/492 | 341/383 | 9/10 | 84/85 | ATA 15/14 MEI 10/16 ZAG 15/20 GOL 10/16 |
| adaptavel | ATA/MEI/ZAG/GOL | 13/17 | -4 | 7.7/12.1 | -4.4 | 466/493 | 355/363 | 8/10 | 84/85 | ATA 12/17 MEI 12/14 ZAG 17/19 GOL 9/17 |
| patriota | ATA/MEI/ZAG/GOL | 13/17 | -4 | 7.6/13.7 | -6.1 | 456/513 | 331/375 | 8/11 | 84/86 | ATA 12/18 MEI 12/16 ZAG 21/20 GOL 6/15 |
| xerife | ZAG | 16/15 | 1 | 11.4/11.3 | 0.1 | 498/492 | 364/367 | 9/9 | 85/85 | ZAG 18/17 |
| carrinho | ZAG | 17/15 | 2 | 11.4/12.1 | -0.7 | 493/493 | 366/364 | 10/9 | 85/85 | ZAG 22/18 |
| antecipa | ZAG | 15/16 | -1 | 10.9/11.6 | -0.7 | 498/494 | 366/361 | 10/10 | 85/85 | ZAG 16/21 |
| saida | ZAG | 16/16 | 0 | 11.9/10.9 | 1.0 | 484/487 | 366/365 | 10/10 | 85/85 | ZAG 19/18 |
| aereo | ZAG | 16/15 | 1 | 12.3/10.8 | 1.5 | 494/491 | 366/365 | 10/10 | 85/85 | ZAG 23/16 |
| reflexo | GOL | 16/15 | 1 | 11.3/10.9 | 0.4 | 486/497 | 365/365 | 10/9 | 85/85 | GOL 17/12 |
| elastico | GOL | 17/15 | 2 | 12/10.2 | 1.8 | 493/497 | 366/364 | 10/9 | 85/85 | GOL 18/10 |
| maofirme | GOL | 16/15 | 1 | 11.2/10.9 | 0.3 | 494/489 | 361/364 | 9/10 | 85/85 | GOL 17/14 |
| pegador | GOL | 17/15 | 2 | 12.6/10.5 | 2.1 | 497/486 | 365/365 | 10/10 | 85/85 | GOL 20/13 |
| libero | GOL | 17/16 | 1 | 11.5/10.9 | 0.6 | 490/497 | 361/363 | 10/9 | 85/85 | GOL 19/15 |

Leitura:

- **Nenhuma característica é obrigatória**: sem a mais forte a nota S continua na faixa. As mais fortes são *Drible* e *Técnica* (ATA/MEI), que entram direto na nota da temporada (`0,06 × nível`) e por isso puxam Seleção da liga, pontos de evolução e Bola de Ouro.
- **As características sem atributo são armadilha**: *Patriota*, *Adaptável* e *Frieza* (−5 a −6 pp de S antes, −4 depois; *Patriota* −6 a −7 pp de Bola de Ouro) custam a vaga de uma característica com atributo e não devolvem nada na pontuação. *Líder* (−1 antes, −4 depois) está no limite do ruído e *Profissional* oscila entre −3 e +1: neutras, mas pelo mesmo motivo. *Patriota* é a exceção interessante: perde em S mas entrega o que promete — no motor final, 42% das carreiras com ela são campeãs do mundo, contra 20% sem ela (antes do ajuste da Copa, 26% contra 15%). O problema é que a Copa vale 150 pontos e a vaga de atributo perdida custa mais que isso em produção e prêmios ao longo de 20 temporadas.
- As de zagueiro (*Xerife*, *Carrinho*, *Antecipação*, *Saída*, *Aéreo*) e as de goleiro (*Reflexo*, *Elástico*, *Mão firme*, *Pegador*, *Líbero*) ficam entre −1 e +2 pp nas duas rodadas: neutras. Para zagueiro e goleiro, nenhuma característica muda a carreira — a escolha é só de estilo.
- *Velocista* (+3,7 de Bola de Ouro) e *Estrela* (+2,5) ajudam na Bola de Ouro sem mexer na nota S; *Visão* e *Colocado* fazem o contrário (−2 de Bola de Ouro): são trocas, não vantagens.

Não mexi em nenhuma característica: nenhuma passa do limite, e corrigir as armadilhas com +1 de atributo não resolve (vale ~0,1 a 0,3 de nota geral; ver recomendações).

## Duração

A duração estimada subiu de 10min14s para 10min42s (+28 s, +4,6%). O simulador conta 6 s por decisão e 5 s por resumo de temporada; a mediana de decisões foi de 83 para 87. Contando as decisões por tipo (2000 carreiras, motor base × motor final):

| Decisão | Antes | Depois | Δ |
|---|---|---|---|
| Lance decisivo em Copa / Mundial de Clubes | 9,28 | 11,44 | +2,16 |
| Compra de atributo | 16,79 | 17,57 | +0,78 |
| Escolha de clube | 9,91 | 10,29 | +0,38 |
| Evento | 17,55 | 17,84 | +0,29 |
| Lance decisivo na temporada | 9,62 | 9,91 | +0,29 |
| Início de Copa / Mundial | 3,81 | 4,14 | +0,33 |
| Anúncio de despedida | 0,80 | 0,77 | −0,03 |

Metade do aumento são jogos de mata-mata de Copa e Mundial que zagueiros e goleiros passaram a disputar (antes caíam na fase de grupos): é exatamente o conteúdo que o ajuste A devolve a essas posições. O resto é consequência de carreiras melhores em geral (mais propostas, mais pontos de evolução para gastar, menos aposentadorias cedo: p10 de temporadas 18 → 19). Não encontrei como tirar esses 28 s sem tirar conteúdo de alguém, então **deixei a meta em aberto** e listo as alavancas nas recomendações.

## Efeitos colaterais a conhecer

- **Campeão do mundo** subiu de 18,7% para 27,2% das carreiras (robô esperto) e de 15,1% para 21,1% (casual), porque zagueiros e goleiros passaram a ganhar. O veredito "Campeão do mundo" virou o mais comum (21%). É a Copa como um todo ficando mais fácil, não um desequilíbrio entre posições: se quiser a taxa antiga, a alavanca é geral (ver recomendações).
- **Notas A / B / C** mudaram de 35 / 27 / 21 para 43 / 25 / 16: os pontos de meia, zagueiro e goleiro subiram e só o piso da nota S foi recalibrado. Se a distribuição antiga era a desejada, os pisos A e B precisam subir também (recomendação abaixo).
- **Mundial de Clubes campeão** 7,9% → 14,3% e **Intercontinental** 59% → 65%: o Mundial usa o mesmo `wcMatch`, então o ajuste A vale para ele.
- Robô casual: S 5% → 4%, Bola de Ouro 3,8% → 3,3% (ambos no ruído).

## Recomendações não aplicadas

1. **Pisos das notas A e B.** `S.GRADES` A 1110 → ~1180 e B 830 → ~870 devolveriam a distribuição antiga (A ~35%, B ~27%). Não fiz porque a meta pedia só a nota S e porque a tela de fim de carreira mostra a conta: mexer nos pisos de todas as notas merece decisão do dono.
2. **Copa mais fácil para todo mundo.** Se 27% de campeões do mundo for demais, reduzir a taxa a favor de todos em jogos com lance (por exemplo `[1.1, 0.72]` → `[1.0, 0.8]` para o defensor e `[0.72, 1.3]` → `[0.66, 1.3]` para o atacante) e medir de novo. É uma escolha de dificuldade, não de equilíbrio.
3. **Características-armadilha** (*Patriota*, *Adaptável*, *Frieza*, *Profissional*). Dar +1 de atributo não resolve. O que resolveria é um efeito que aparece na pontuação: *Patriota* já ganha Copa, falta ela render pontos (por exemplo gols em Copa ×2 para quem tem); *Adaptável* poderia dar +0,1 de nota no primeiro ano em clube novo; *Frieza* poderia valer nos lances decisivos da temporada (bônus de acerto); *Profissional* poderia reduzir o declínio pela idade. Cada uma precisa de uma rodada FORCE/AVOID para calibrar.
4. **Drible e Técnica** (+5 pp de S, +6,5 pp de Bola de Ouro na linha de base). Se quiser aproximar, `0.06 * tm('drible')` → `0.05` na nota da temporada e reduzir o peso de técnica nos gols; sem isso, elas são "as boas" de atacante e meia, mas não obrigatórias.
5. **Duração.** Alavancas possíveis, todas com custo: (a) no Mundial de Clubes, lance só a partir das quartas (hoje é como a Copa: um jogo da fase de grupos e todo o mata-mata); (b) a compra de atributo é "card vira, 2º toque compra", mais rápida que uma decisão de evento; se o simulador contar 3 s por compra em vez de 6, a estimativa cai ~50 s nas duas versões (não muda o jogo, só a régua); (c) aceitar os +28 s como preço de zagueiros e goleiros jogarem o mata-mata.
6. **Simulador.** Vale registrar no `craque_sim.js` as decisões por tipo (o script que usei fica fora do repositório) e a nota média por posição, para a próxima rodada de balanceamento começar do diagnóstico pronto.
