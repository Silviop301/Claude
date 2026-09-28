# PULSE — Plano do jogo

Arcade de um toque + idle/incremental + sistema de loot, visual neon minimalista.
Roda no navegador (celular e PC), HTML + JavaScript puro + Canvas, sem build.

> Regra de ouro: **tudo é comprável apenas com recursos ganhos no jogo.** Sem dinheiro real.

---

## 1. Loop principal

```
 Partida arcade ──► Energia + Gemas + Chaves
       ▲                     │
       │                     ▼
 Itens equipados ◄── Loot boxes / Roleta / Reator idle
```

- **Partida (30–90 s):** um núcleo de luz orbita o centro; tocar troca de órbita (interna ↔ externa)
  para desviar de obstáculos e coletar fragmentos. A velocidade cresce e o combo multiplica os ganhos.
- **Reator (idle):** gera Energia sozinho, inclusive offline. Energia compra geradores e upgrades.
- **Prestígio:** colapsar o reator → Núcleos Estelares (bônus permanentes e novas mecânicas).

## 2. Moedas

| Moeda | Como ganha | Para que serve |
|---|---|---|
| ⚡ Energia | Partidas, reator idle | Geradores, upgrades, caixa básica |
| 💎 Gemas | Recordes, conquistas, missões, combos altos | Caixas melhores, giros extras |
| 🔑 Chaves | Drop raro na partida, missões diárias | Abrir baús especiais |
| ✨ Pó Estelar | Itens duplicados | Craftar o item que você quer |
| 🌟 Núcleos Estelares | Prestígio | Árvore de bônus permanentes |

## 3. Sistema de loot

### Raridades
| Raridade | Cor | Chance base |
|---|---|---|
| Comum | cinza | 60% |
| Incomum | verde | 25% |
| Raro | azul | 10% |
| Épico | roxo | 4% |
| Lendário | dourado | 0,9% |
| Mítico | arco-íris animado | 0,1% |

As chances ficam **sempre visíveis** na tela da caixa.

### Tipos de item
- **Skins de núcleo:** visual e rastro (cometa, pixel, fantasma, galáxia…).
- **Artefatos (equipáveis, até 3 slots):** efeitos na partida — escudo extra, ímã de fragmentos,
  multiplicador de combo, câmera lenta ao quase morrer, órbita tripla, etc.
- **Relíquias do reator:** bônus passivos no idle (+% produção, produção offline mais longa).
- Cada item tem **nível** (1–10): duplicatas sobem o nível ou viram Pó Estelar.

### Caixas
| Caixa | Custo | Garantia |
|---|---|---|
| Básica | ⚡ Energia | — |
| Neon | 💎 Gemas | Incomum ou melhor |
| Estelar | 🔑 Chave | Raro ou melhor |
| Pacote x10 | 💎 Gemas (desconto) | 1 Épico ou melhor |

### Mecânicas de emoção
- **Abertura animada:** caixa tremendo, cor de brilho revelando a raridade antes do item, explosão de partículas e som crescente.
- **Pity (garantia):** barra visível “Lendário garantido em 37 aberturas” — cria meta clara.
- **Quase-lendário:** quando sai Épico, a animação “passa perto” do dourado.
- **Coleção / álbum:** grade com silhuetas dos itens que faltam e % de conclusão; completar sets dá bônus.
- **Craft com Pó Estelar:** protege contra azar e dá controle ao jogador.

### Roleta da Sorte
- **1 giro grátis por dia** + giros extras comprados com Gemas.
- Prêmios: moedas, chaves, caixas, multiplicadores temporários (x2 energia por 10 min), jackpot com item Lendário.
- Roda desacelera com “tic-tic-tic” e para às vezes ao lado do jackpot.

### Outras fontes de recompensa
- **Baú de fim de partida:** chance de drop baseada na distância/combo.
- **Missões diárias** (3 por dia) e **sequência de login** com recompensas crescentes.
- **Conquistas** com Gemas.
- **Eventos aleatórios no reator:** “Tempestade Solar — produção x3 por 60 s, toque para coletar”.

## 4. Fases de desenvolvimento

1. **Núcleo arcade:** órbitas, toque/tecla, obstáculos, fragmentos, morte e reinício instantâneo.
2. **Juice:** brilho neon, partículas, tremor de tela, sons sintetizados (Web Audio), combo visual.
3. **Economia + Reator idle:** moedas, geradores, produção offline, números grandes (1K → 1B…).
4. **Loot:** itens, raridades, caixas com animação, pity, duplicatas → Pó Estelar, inventário e equipar.
5. **Roleta + missões diárias + login streak.**
6. **Coleção/álbum, conquistas e craft.**
7. **Prestígio:** Núcleos Estelares e novas mecânicas.
8. **Polimento e balanceamento:** curvas de custo/drop, toque no celular, save robusto (com export/import).

## 5. Estrutura técnica

```
index.html
src/
  main.js        # loop, troca de telas
  game/          # partida arcade (núcleo, obstáculos, colisão)
  idle/          # reator, geradores, cálculo offline
  loot/          # tabelas de drop, caixas, roleta, pity, itens
  ui/            # telas, HUD, animações de abertura
  fx/            # partículas, tremor, brilho
  audio.js       # sons gerados por código
  save.js        # localStorage + export/import
  format.js      # números grandes
```
