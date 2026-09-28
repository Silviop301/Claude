# PULSE — Plano do jogo

**Idle/incremental de dopamina máxima** com loot boxes, roleta e minigame arcade.
Visual neon minimalista. Roda no navegador (celular e PC), HTML + JavaScript puro + Canvas, sem build.

> Regra de ouro: **tudo é comprável apenas com recursos ganhos no jogo.** Sem dinheiro real.
> Chances de drop sempre visíveis.

---

## 1. Filosofia: "algo bom a cada poucos segundos"

O jogador nunca deve ficar mais de ~10 s sem uma recompensa, ~1 min sem uma decisão e
~5 min sem uma surpresa.

| Intervalo | Recompensa |
|---|---|
| Cada toque | número voando, partícula, som com tom subindo |
| 2–10 s | poder comprar algo novo (botão acende e pulsa) |
| 30–60 s | marco de gerador (x2!), missão concluída |
| 1–3 min | evento aleatório (meteoro, tempestade, cápsula) |
| 5–10 min | loot box, conquista, nova sinergia revelada |
| 1–2 h | Colapso (prestígio) |
| Diário | roleta grátis, missões, sequência de login |

---

## 2. Tela principal: o Reator

- Núcleo pulsando no centro; cada gerador comprado vira um ponto de luz orbitando.
  100+ geradores = galáxia girando na tela.
- Energia sai do núcleo em partículas que voam até o contador.
- O reator **brilha mais** conforme fica forte (brilho, tamanho, velocidade dos anéis).
- Contador de energia **grande**, sempre subindo, com /s logo abaixo.

## 3. Moedas

| Moeda | Como ganha | Para que serve |
|---|---|---|
| ⚡ Energia | Reator, toques, minigame | Geradores, caixa básica |
| 💎 Gemas | Marcos, conquistas, missões, eventos | Caixas melhores, giros, acelerar pesquisa |
| 🔑 Chaves | Eventos raros, minigame, missões | Baús Estelares |
| ✨ Pó Estelar | Itens duplicados | Craftar itens específicos |
| 🌟 Núcleos Estelares | Colapso (prestígio) | Árvore de talentos permanente |
| 🌌 Matéria Escura | Galáxia (prestígio 2) | Mecânicas de late game |

## 4. Geradores

| # | Gerador | Custo inicial | Produz |
|---|---|---|---|
| 1 | Faísca | 10 | 0,1/s |
| 2 | Bobina | 100 | 1/s |
| 3 | Célula de Plasma | 1,1K | 8/s |
| 4 | Anel de Fusão | 12K | 47/s |
| 5 | Estrela Anã | 130K | 260/s |
| 6 | Pulsar | 1,4M | 1,4K/s |
| 7 | Buraco Branco | 20M | 7,8K/s |
| 8 | Singularidade | 330M | 44K/s |
| 9+ | ??? (silhueta até desbloquear) | | |

- Custo cresce ~15% por compra. Botões x1 / x10 / x100 / MÁX.
- Indicador "melhor compra" (menor tempo de retorno).
- **Marcos** em 10, 25, 50, 100, 150, 200, 300…: produção x2 (ou x3 nos grandes) +
  flash de tela + som + número gigante. Barra "faltam N para o marco".
- **Sinergias** reveladas aos poucos ("cada Pulsar dá +1% às Faíscas").

## 5. Máquina de dopamina (juice)

- **Números voadores** em cada toque e coleta, com tamanho proporcional ao valor.
- **Toque crítico** (5%): x10, texto dourado, mini-tremor. "Super crítico" (0,5%): x100.
- **Combo de toques:** tocar rápido sobe o multiplicador e o tom do som (dó-ré-mi…).
- **Sobrecarga:** barra enche com toques → x5 produção por 30 s, tela ganha aura.
- **Botões vivos:** quando dá para comprar, o botão pulsa e brilha; ao comprar, "pop" + partículas.
- **Contador rolando** (odômetro) em vez de trocar o número seco.
- **Sons sintetizados** em camadas: tic de toque, cha-ching de compra, fanfarra de marco,
  acorde épico de lendário. Tom sobe com sequências.
- **Confete/explosão** em marcos, conquistas e drops raros.
- **Notificações empilhadas** no canto: "Conquista!", "Marco!", "Missão concluída!".
- **Barras de progresso em todo lugar** (marco, missão, pity, colapso, coleção) — sempre algo quase cheio.
- **Unidades crescentes:** K → M → B → T → Qa → Qi… trocar de unidade tem animação própria.

## 6. Eventos aleatórios

| Evento | Frequência | Efeito |
|---|---|---|
| 🌠 Meteoro Dourado | ~2 min | Toque a tempo: 10 min de produção instantânea |
| ☀️ Tempestade Solar | ~5 min | Tudo x3 por 60 s |
| 📦 Cápsula Perdida | ~4 min | Loot box grátis flutuando por 15 s |
| 💎 Chuva de Gemas | raro | Gemas caindo, toque para pegar |
| 🌀 Anomalia | muito raro | x77 produção por 7 s + chance de item Épico+ |

Meteoro pode vir "podre" (raramente) com efeito negativo leve — torna o dourado mais emocionante.

## 7. Sistema de loot

### Raridades
| Raridade | Cor | Chance base |
|---|---|---|
| Comum | cinza | 60% |
| Incomum | verde | 25% |
| Raro | azul | 10% |
| Épico | roxo | 4% |
| Lendário | dourado | 0,9% |
| Mítico | arco-íris animado | 0,1% |

### Itens
- **Relíquias** (foco principal, até 3–6 slots): +% produção, marcos mais fortes,
  offline mais longo, eventos mais frequentes, crítico maior, etc.
- **Skins do Reator:** visual do núcleo e dos anéis (cometa, pixel, fantasma, galáxia, buraco negro…).
- **Artefatos do minigame.**
- Nível 1–10: duplicatas sobem o nível ou viram Pó Estelar.

### Caixas
| Caixa | Custo | Garantia |
|---|---|---|
| Básica | ⚡ Energia (escala com progresso) | — |
| Neon | 💎 Gemas | Incomum+ |
| Estelar | 🔑 Chave | Raro+ |
| Pacote x10 | 💎 (desconto) | 1 Épico+ |

### Emoção na abertura
- Caixa treme cada vez mais; a **cor do brilho revela a raridade** antes do item.
- Raridades altas: tela escurece, pausa dramática, raio de luz, fanfarra.
- Épico às vezes "passa perto" do dourado.
- Pacote x10: cartas viram em sequência, a melhor por último.
- **Pity visível:** "Lendário garantido em 37 aberturas".
- **Álbum de coleção** com silhuetas e % de conclusão; sets completos dão bônus.
- **Craft** com Pó Estelar para mirar um item específico.

### Roleta da Sorte
- 1 giro grátis/dia + giros com Gemas.
- Prêmios: moedas, chaves, caixas, boosts (x2 por 10 min), jackpot Lendário.
- Desacelera com "tic-tic-tic", às vezes para ao lado do jackpot.

## 8. Offline e retorno

- Tela de boas-vindas: "Enquanto você esteve fora (7h 12min): +4,8M ⚡" com moedas caindo.
- Limite offline inicial 2 h (aumenta com pesquisa/relíquias).
- **Dobrar coleta** jogando uma partida do minigame.
- **Sequência de login** (dia 1…7, recompensa crescente, dia 7 = baú Estelar).
- **3 missões diárias** + 1 missão semanal grande.

## 9. Pesquisa (automação)

Árvore com timers curtos (5 min → horas):
auto-compra, auto-coleta de eventos, offline maior, mais slots de relíquia,
eventos mais frequentes, desbloqueio de geradores novos.

## 10. Prestígio

- **Colapso:** reinicia geradores e energia → 🌟 Núcleos Estelares (+2% em tudo cada, para sempre)
  + árvore de talentos. Contador "Colapsar agora: +14 Núcleos" subindo ao vivo.
  Animação de colapso épica (tudo é sugado para o centro e explode).
- A segunda corrida é muito mais rápida — a grande recompensa do prestígio.
- **Galáxia (prestígio 2):** vários Colapsos → 🌌 Matéria Escura, novas mecânicas
  (geradores de segunda ordem, desafios com regras especiais).

## 11. Minigame arcade: "Órbita"

Bônus opcional de 30–60 s: núcleo orbita, tocar troca de órbita para desviar e coletar.
Recompensas: Energia, Chaves, dobrar coleta offline, chance de caixa no fim.

## 12. Ritmo alvo

| Tempo | O que acontece |
|---|---|
| 0–30 s | Toca no núcleo, primeira Faísca, primeiros números voando |
| 2 min | Primeiro marco (x2!), segundo gerador, primeiro meteoro |
| 5 min | Primeira loot box, primeira conquista |
| 15 min | Roleta, missões, 4–5 geradores |
| 30 min | Pesquisa liberada, primeira Relíquia rara |
| 1–2 h | Primeiro Colapso |
| Dias | Galáxia, coleção, Míticos |

---

## 13. Fases de desenvolvimento

1. **Núcleo idle:** reator, toque, geradores, custos, marcos, números grandes, save/offline.
2. **Juice:** partículas, números voadores, críticos, combo, sons, botões vivos, odômetro.
3. **Eventos aleatórios** + sobrecarga.
4. **Loot:** relíquias, caixas com animação, pity, inventário, duplicatas.
5. **Roleta, missões diárias, login streak, conquistas.**
6. **Pesquisa/automação + álbum + craft.**
7. **Colapso (prestígio 1).**
8. **Minigame Órbita.**
9. **Galáxia (prestígio 2)** + balanceamento e polimento.

## 14. Estrutura técnica

```
index.html
src/
  main.js        # loop, troca de telas
  state.js       # estado do jogo
  idle/          # geradores, marcos, sinergias, offline, pesquisa, prestígio
  loot/          # tabelas de drop, caixas, roleta, pity, itens, craft
  events/        # eventos aleatórios
  meta/          # missões, conquistas, login streak
  arcade/        # minigame Órbita
  ui/            # telas, HUD, animações
  fx/            # partículas, números voadores, tremor, confete
  audio.js       # sons gerados por código (Web Audio)
  save.js        # localStorage + export/import
  format.js      # números grandes
```
