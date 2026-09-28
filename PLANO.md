# POMBO STONKS — Plano do jogo

**Idle/incremental de dopamina máxima**, tema meme de investimento, com loot boxes, roleta e minigame.
Mascote: **Pombo Investidor**, que reage a tudo. Visual **cartoon colorido** (estilo figurinha:
cores vivas, contornos grossos). Roda no navegador (celular e PC), HTML + JavaScript puro + Canvas, sem build.

> Regras de ouro:
> - **Tudo é comprável apenas com recursos ganhos no jogo.** Sem dinheiro real.
> - Chances de drop sempre visíveis.
> - Arte e personagens **100% originais** desenhados em código (sem imagens/personagens de terceiros,
>   sem marcas ou pessoas reais).

---

## 1. Premissa

Um pombo comum da praça descobre o mercado financeiro. Começa vendendo migalha e termina dono da
Bolsa Intergaláctica. Humor de coach, cripto, "grupo de sinais do Zap" e STONKS / NOT STONKS.

## 2. Filosofia: "algo bom a cada poucos segundos"

| Intervalo | Recompensa |
|---|---|
| Cada toque | 💸 voando, som de moeda com tom subindo, pombo reage |
| 2–10 s | Nova compra disponível (botão pulsa) |
| 30–60 s | Marco de negócio (x2!), missão concluída |
| 1–3 min | Evento de mercado (Dica Quente, Bull Run…) |
| 5–10 min | Loot box, conquista, nova sinergia |
| 1–2 h | A Pirâmide Desmoronou (prestígio) |
| Diário | Roleta grátis, missões, sequência de login |

## 3. O Pombo Investidor (mascote)

Fica no centro da tela; **tocar nele gera dinheiro**.

**Evolução visual** (conforme o patrimônio): pombo da praça → gravatinha → terno →
óculos escuros e maleta → carro → iate → foguete. Skins e acessórios da loot box aparecem nele.

**Reações:**
| Situação | Reação |
|---|---|
| Toques rápidos / combo | Estufa o peito, olhos brilhando |
| Crítico | Cara de **STONKS** com seta verde subindo |
| Mercado caindo | Anda de um lado para o outro, suando |
| Evento ruim (golpe) | Cara de **NOT STONKS**, pena caindo |
| Item Lendário/STONKS | Dança da vitória, confete |
| Marco atingido | Levanta a asa, "É O MERCADO, BEBÊ" |
| Parado muito tempo | Cochila, cisca, olha o celular |
| Prestígio | Chora, some em fumaça, volta de óculos escuros |

Balões de fala com frases de coach aleatórias ("Pombo que acorda cedo pega a migalha").

## 4. Moedas

| Moeda | Como ganha | Para que serve |
|---|---|---|
| 💸 Grana | Negócios, toques, minigame | Comprar negócios, caixa básica |
| 🪙 PomboCoin | Marcos, conquistas, missões, eventos | Caixas melhores, giros, acelerar pesquisa |
| 🎫 Cupom Dourado | Eventos raros, minigame, missões | Cofre Suíço |
| 🍞 Farelo | Itens duplicados | Craftar itens específicos |
| 🎓 Lições de Vida | Prestígio | Árvore de talentos permanente |
| 🏝️ Paraíso Fiscal | Prestígio 2 | Mecânicas de late game |

## 5. Negócios (geradores)

| # | Negócio | Custo inicial | Produz |
|---|---|---|---|
| 1 | Revenda de Migalha | 10 | 0,1/s |
| 2 | Banquinha de Pipoca | 100 | 1/s |
| 3 | Brigadeiro Gourmet | 1,1K | 8/s |
| 4 | Curso de Coach Online | 12K | 47/s |
| 5 | Criptomoeda $PRU | 130K | 260/s |
| 6 | NFT de Pão Mofado | 1,4M | 1,4K/s |
| 7 | Startup "Uber de Pombo" | 20M | 7,8K/s |
| 8 | Banco Pombal S.A. | 330M | 44K/s |
| 9 | Bolsa Intergaláctica | 5,1B | 260K/s |
| 10+ | ??? (silhueta até desbloquear) | | |

- Custo cresce ~15% por compra. Botões x1 / x10 / x100 / MÁX. Indicador "melhor compra".
- **Marcos** em 10, 25, 50, 100, 150, 200…: produção x2 (x3 nos grandes) + flash + fanfarra.
  Barra "faltam N para o marco".
- **Sinergias** reveladas aos poucos ("cada Curso de Coach vende +1% de Brigadeiro").

## 6. O Mercado (mecânica central do tema)

- **Gráfico ao vivo** no topo da tela, sempre oscilando (verde subindo / vermelho caindo).
- Define um **multiplicador de mercado** (x0,5 a x3) sobre a produção.
- Mercado em alta: tela com brilho verde, pombo feliz, "STONKS" pisca.
- Mercado em queda: tela avermelhada, pombo nervoso — e o botão **"Comprar na baixa"** aparece
  (investir agora rende bônus quando o mercado subir).

## 7. Máquina de dopamina (juice)

- **Notas e moedas voando** em cada toque, tamanho proporcional ao valor.
- **Crítico** (5%): x10 com "STONKS!" dourado e tremor. **Super crítico** (0,5%): x100.
- **Combo de toques:** multiplicador e tom do som sobem juntos.
- **Modo Tubarão:** barra enche com toques → x5 produção por 30 s, pombo de óculos escuros.
- **Botões vivos** que pulsam quando dá para comprar; "pop" + partículas ao comprar.
- **Contador odômetro** rolando; troca de unidade (K → M → B → T → Qa…) com animação própria.
- **Sons sintetizados:** caixa registradora, moedas, fanfarra, "arrulho" do pombo.
- **Confete** em marcos, conquistas e drops raros.
- **Notificações cômicas empilhadas:** "Sua tia investiu no seu curso", "Um coach copiou sua estratégia".
- **Barras de progresso em todo lugar** — sempre algo quase cheio.

## 8. Eventos aleatórios

| Evento | Frequência | Efeito |
|---|---|---|
| 📲 Dica Quente do Zap | ~2 min | Toque a tempo: 10 min de produção. Às vezes é **golpe** (perde um pouco) |
| 🐂 Bull Run | ~5 min | Mercado travado em x3 por 60 s |
| 📦 Encomenda Suspeita | ~4 min | Loot box grátis voando pela tela por 15 s |
| 🪙 Chuva de PomboCoin | raro | Moedas caindo, toque para pegar |
| 🚀 TO THE MOON | muito raro | x77 por 7 s + chance de item Épico+ |
| 🐻 Crash | ocasional | Mercado despenca; toques rápidos "seguram" a queda e dão bônus |

## 9. Sistema de loot

### Raridades
| Raridade | Cor | Chance base |
|---|---|---|
| Comum | cinza | 60% |
| Mid | verde | 25% |
| Raro | azul | 10% |
| Brabo | roxo | 4% |
| Lendário | dourado | 0,9% |
| **STONKS** | arco-íris animado | 0,1% |

### Itens
- **Ativos** (até 3–6 slots, bônus passivos): Gravata da Sorte, Planilha Amaldiçoada,
  Pão Dourado, Livro de Coach Autografado, Celular com 3 Grupos de Sinais, Óculos de Visão de Mercado…
  Efeitos: +% produção, marcos mais fortes, offline mais longo, mais eventos, crítico maior.
- **Visual do pombo:** chapéus, óculos, roupas, correntes, veículos.
- **Itens do minigame.**
- Nível 1–10: duplicatas sobem o nível ou viram 🍞 Farelo.

### Caixas
| Caixa | Custo | Garantia |
|---|---|---|
| Caixa do Camelô | 💸 Grana (escala com progresso) | — |
| Maleta Executiva | 🪙 PomboCoin | Mid+ |
| Cofre Suíço | 🎫 Cupom Dourado | Raro+ |
| Container do Porto (x10) | 🪙 (desconto) | 1 Brabo+ |

### Emoção na abertura
- Caixa treme cada vez mais; **a cor do brilho revela a raridade** antes do item.
- Raridade alta: tela escurece, pausa dramática, raio de luz, fanfarra, pombo dança.
- Brabo às vezes "passa perto" do dourado.
- Container x10: cartas viram em sequência, a melhor por último.
- **Pity visível:** "Lendário garantido em 37 aberturas".
- **Álbum de coleção** com silhuetas e % de conclusão; sets completos dão bônus.
- **Craft** com Farelo para mirar um item específico.

### Roda da Fortuna Pombal
- 1 giro grátis/dia + giros com PomboCoin.
- Prêmios: moedas, cupons, caixas, boosts (x2 por 10 min), jackpot Lendário.
- Desacelera com "tic-tic-tic", às vezes para ao lado do jackpot.

## 10. Offline e retorno

- Tela de boas-vindas: "Enquanto você dormia seus negócios renderam +4,8M 💸", com chuva de notas.
- Limite offline inicial 2 h (aumenta com pesquisa/ativos).
- **Dobrar coleta** jogando o minigame.
- **Sequência de login** (dia 1…7, dia 7 = Cofre Suíço). **3 missões diárias** + 1 semanal.

## 11. Pesquisa: "MBA do Pombo" (automação)

Árvore com timers curtos (5 min → horas): estagiário (auto-compra), assessor (auto-coleta de eventos),
offline maior, mais slots de ativos, mais eventos, desbloqueio de negócios.

## 12. Prestígio

- **A Pirâmide Desmoronou:** reinicia negócios e grana → 🎓 Lições de Vida (+2% em tudo cada,
  para sempre) + árvore de talentos. Contador "Desmoronar agora: +14 Lições" subindo ao vivo.
  Animação: tudo desaba, pombo chora, volta de óculos escuros ("dessa vez é diferente").
- A segunda corrida é muito mais rápida — a grande recompensa do prestígio.
- **Paraíso Fiscal (prestígio 2):** várias pirâmides → 🏝️, novas mecânicas
  (negócios de segunda ordem, desafios com regras especiais).

## 13. Minigame: "Day Trade Turbo"

Bônus opcional de 30 s: gráfico correndo na tela, **toque para comprar, toque de novo para vender**.
Comprar na baixa e vender na alta = lucro; combos por trades seguidos no verde.
Recompensas: Grana, Cupons, dobrar coleta offline, chance de caixa no fim.

## 14. Ritmo alvo

| Tempo | O que acontece |
|---|---|
| 0–30 s | Toca no pombo, primeira Revenda de Migalha |
| 2 min | Primeiro marco (x2!), segundo negócio, primeira Dica Quente |
| 5 min | Primeira loot box, primeira conquista, pombo ganha gravata |
| 15 min | Roda da Fortuna, missões, 4–5 negócios |
| 30 min | MBA do Pombo liberado, primeiro ativo raro |
| 1–2 h | Primeira Pirâmide |
| Dias | Paraíso Fiscal, coleção, itens STONKS |

---

## 15. Fases de desenvolvimento

1. ✅ **Núcleo idle:** pombo clicável, negócios, custos, marcos, números grandes, save/offline.
2. ✅ **Juice + pombo animado:** partículas, números voadores, críticos, combo, sons, reações.
3. ✅ **Mercado + eventos aleatórios** + Modo Tubarão.
4. ✅ **Loot:** ativos, visual do pombo, caixas com animação, pity, inventário, duplicatas.
5. **Roda da Fortuna, missões diárias, login streak, conquistas.**
6. **MBA do Pombo + álbum + craft.**
7. **A Pirâmide Desmoronou (prestígio 1).**
8. **Minigame Day Trade Turbo.**
9. **Paraíso Fiscal (prestígio 2)** + balanceamento e polimento.

## 16. Estrutura técnica

```
index.html
src/
  main.js        # loop, troca de telas
  state.js       # estado do jogo
  idle/          # negócios, marcos, sinergias, offline, pesquisa, prestígio
  market/        # gráfico e multiplicador de mercado
  loot/          # tabelas de drop, caixas, roleta, pity, itens, craft
  events/        # eventos aleatórios
  meta/          # missões, conquistas, login streak
  minigame/      # Day Trade Turbo
  pombo/         # desenho, animações e reações do mascote
  ui/            # telas, HUD, animações
  fx/            # partículas, números voadores, tremor, confete
  audio.js       # sons gerados por código (Web Audio)
  save.js        # localStorage + export/import
  format.js      # números grandes
```
