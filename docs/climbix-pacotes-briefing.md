# Climbix · Briefing de design: Pacotinhos, Giro do dia e itens para liberar

> Objetivo desta rodada: **só o visual**, para decidir se a ideia fica boa antes de programar.
> Entregue pranchas (telas e estados), não código.

## 1. O jogo em 30 segundos
Climbix (climbix.app) é um jogo de carreira de futebol para celular, jogado no navegador. Você cria um garoto de 16 anos
(nome, número da camisa, posição, país e o visual dele) e toma decisões temporada a temporada até se aposentar, perto dos
38 anos. Uma carreira leva de 8 a 12 minutos. No fim, o jogador ganha uma **carta metálica** (bronze, prata, ouro ou ícone)
com o próprio boneco desenhado nela. Essa carta é colecionável e compartilhável.

Hoje quase todo o visual do boneco é livre. A ideia é **travar números da camisa e peças do visual** e ir liberando aos
poucos, **na sorte**, com recompensas ganhas jogando.

## 2. Regras que não mudam
- **Nada se compra com dinheiro.** Pacote e giro só se ganham jogando. Não desenhe preço, loja, moeda comprável nem botão "comprar".
- **Chances sempre visíveis** (ex.: "Lendário 3%") no pacote e na roleta.
- **Só visual.** Nenhum item muda nota, sorte ou carreira.
- **Tom de pele e cabelos naturais nunca ficam travados:** todos os tons de pele e os cortes curto, raspado, careca,
  black, tranças, dreads e longo continuam livres. Só acessórios, cores, tatuagens e estilos chamativos ficam travados.

## 3. Como o jogador ganha
| Origem | O que ganha |
|---|---|
| Fim de cada carreira | 1 pacotinho (+1 se a nota for A, +2 se for S) |
| Título grande (Liga dos Campeões, Libertadores, Copa do Mundo, Bola de Ouro) | 1 pacotinho |
| Conquista nova | 1 pacotinho |
| Carreira do dia | 1 pacotinho |
| Giro do dia | 1 giro grátis por dia na tela inicial |

**Repetidos viram fichas** ("troca de figurinha"). Com fichas, o jogador escolhe o item que quiser.
**Garantia:** no máximo 10 pacotes até sair um lendário (mostrar esse contador de forma discreta).

## 4. O que fica travado (raridades)
| Raridade | Números da camisa | Visual do boneco |
|---|---|---|
| **Livre** | 1 a 11 | Pele, cortes naturais, barbas, cores preta, branca e vermelha |
| **Comum** | 12 a 50 | Outras cores de chuteira, sola e munhequeira; meião arriado; faixa na cabeça |
| **Raro** | 51 a 98 | Tiara, moicano, topete, tatuagem pequena, manga comprida |
| **Épico** | Números "de craque" (77, 88, 99…) | Tatuagem fechada, cores neon e rosa |
| **Lendário** | Itens novos (proponha) | Chuteira e sola de ouro e holográfica |

**Proponha também de 10 a 15 itens novos** para o pacote valer a pena. Exemplos: cabelo platinado ou pintado, chuteira
com estampa (raio, chamas, camuflada), faixa de capitão, luva de goleiro com estampa, caneleira à mostra, cordão.
O boneco é vetorial, com contorno escuro grosso e sombra lateral simples. Os itens novos precisam caber nesse traço.

As raridades **conversam com as cartas** do jogo: comum = bronze, raro = prata, épico = ouro e lendário = ícone
(roxo holográfico). Defina a cor, a moldura e o brilho de cada uma.

## 5. Telas e estados para desenhar
1. **Aviso de pacote novo**
   - No fim da carreira (abaixo da carta final): "Você ganhou 2 pacotinhos".
   - Na tela inicial: o atalho com contador (ex.: selo "3").
2. **Abrir o pacotinho** (o momento principal, com o mesmo peso da revelação de carta)
   - Pacote fechado → rasgar ou abrir → 3 itens saindo um a um → resumo.
   - A raridade mais alta precisa ser sentida antes de aparecer (cor da luz, tremida, som descrito).
   - Estados: item novo, item repetido (vira ficha, com animação de conversão) e lendário.
   - Descreva o movimento: duração, easing, luz e partículas. Precisa ter "toque para pular".
3. **Giro do dia (roleta)**
   - A roda com as fatias (item, pacote, fichas) e a chance escrita em cada uma.
   - Estados: disponível, girando, prêmio e "volte amanhã" com contagem regressiva.
4. **Meus itens (inventário)**
   - Grade por categoria (números, cabelo, equipamento, tatuagem, cores) com progresso ("23 / 80").
   - Item travado: silhueta ou cadeado, raridade e "Sai em pacotinhos". Despertar vontade, não parecer tela vazia.
   - Fichas: saldo e a troca por um item escolhido.
5. **Criação do jogador com cadeados**
   - **Número da camisa:** hoje é um campo livre de 1 a 99 em cima do avatar. Proponha como mostrar os números
     liberados e travados (teclado de números? grade? roleta de números?).
   - **Visual:** amostras de cor e opções travadas com cadeado e cor da raridade. Ao tocar numa travada, mostrar
     de onde ela sai, sem bloquear a tela.
   - O botão "Sortear" (dado) já existe e só usa peças liberadas.
6. **(Opcional) Pênalti da sorte**: um chute a gol em que cada canto esconde um prêmio. Uma prancha só de conceito,
   para avaliar se vale o trabalho.

## 6. Identidade visual atual (seguir)
- **Fundo:** verde-gramado escuro (`#0F3D2A`, `#145235`).
- **Cores:** creme/papel `#FBF8EF`, tinta `#13201A`, dourado (ação principal) `#F2C230`, rótulos verde-claro `#8FD6AE`,
  vermelho `#D8404A`, azul `#2F6FD6`.
- **Fontes:** Barlow Condensed (títulos e números, peso 700/800) e Barlow (texto, 500/600).
- **Ícones:** Twemoji (emojis coloridos).
- **Cartas metálicas** (bronze, prata, ouro, ícone holográfico) com textura escovada: é o melhor acabamento do jogo.
  O pacotinho e as raridades devem ter o mesmo nível.
- **Tom:** realista, com um toque de jogo. Nada infantil e nada de cassino (sem caça-níquel, fichas de pôquer,
  luzes de Las Vegas). Referências de sensação: pacote de figurinhas da Copa, revelação de carta do EA FC,
  vestiário de clube.

## 7. Restrições técnicas
- **Celular primeiro:** desenhar em **390 px** de largura e validar em **320 px**. No computador a tela fica centralizada, com cerca de 480 px.
- **Texto com no mínimo 14 px. Área de toque com no mínimo 44 px.**
- **Celular simples:** prefira luz, brilho e sombra em camadas simples (CSS). 3D só num elemento, se fizer muita diferença.
- Respeitar `prefers-reduced-motion`: cada animação precisa de uma versão sem movimento.

## 8. O que entregar
1. Uma prancha do sistema de raridades: cores, moldura, brilho e selo de cada uma.
2. As telas da seção 5 com todos os estados, em 390 px.
3. A sequência de abrir o pacotinho quadro a quadro, com a descrição do movimento.
4. Os itens novos desenhados no boneco (frente, no estilo atual).
5. Uma comparação **antes e depois** da criação do jogador com os cadeados.
6. Um parágrafo com a sua opinião: o que funciona, o que pode cansar e o que você cortaria.
