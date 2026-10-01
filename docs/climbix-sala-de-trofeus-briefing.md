# Climbix · Briefing de design: Sala de Troféus

## 1. O jogo em 30 segundos
Climbix (climbix.app) é um jogo de carreira de futebol para celular, jogado no navegador. Você cria um garoto de 16 anos e toma decisões temporada a temporada: clube, características, treinos e lances decisivos. A carreira acaba aos ~38 anos e leva de 8 a 12 minutos. Cada carreira começa do zero, sem herança da anterior.

O elemento visual mais forte do jogo é a **carta do jogador**: metálica (bronze, prata, ouro e ícone), com brilho e 3D, colecionável e compartilhável. **A Sala de Troféus precisa ter esse mesmo nível de acabamento.** Ela deve ser um objeto que dá vontade de completar e de mostrar, e não uma lista.

## 2. Objetivo
Dar ao jogador **algo para completar entre carreiras**, para que ele volte a jogar. Cada carreira rende algumas taças. A Sala mostra as que ele já tem e, principalmente, **as que faltam**.

Regra do jogo: a coleção é só visual. Não dá nenhuma vantagem dentro da carreira.

## 3. Duas visões, na mesma tela (abas ou alternância)
1. **Coleção (permanente):** todas as taças que existem no jogo, somando todas as carreiras do jogador. É a parte que traz a pessoa de volta.
2. **Esta carreira:** só as taças da carreira atual (ou da que acabou de terminar). Aparece no fim da carreira e na ficha do jogador.

## 4. O que existe para conquistar (cerca de 70 taças)
Todas já têm imagem PNG com fundo transparente (foto da taça real recortada, com cerca de 192 px de altura e proporções variadas).

| Grupo | Quantidade | Exemplos | Raridade |
|---|---|---|---|
| **Galeria de honra** | 6 | Copa do Mundo, Bola de Ouro, Mundial de Clubes, Copa Intercontinental, Liga dos Campeões, Libertadores | Raras a lendárias (Copa do Mundo em ~15% das carreiras, Bola de Ouro em ~10%) |
| **Ligas** | 37 | Brasileirão, Série B/C/D, Premier League, La Liga, Serie A, Bundesliga, MLS, J1 League… | Divisões de baixo são comuns; ligas grandes, médias |
| **Copas nacionais** | ~27 | Copa do Brasil, FA Cup, Copa do Rei, Coppa Italia, Taça de Portugal… | Médias |

As ligas e copas se organizam naturalmente **por país** (27 países). O Brasil, por exemplo, tem Série D, C, B, Brasileirão e Copa do Brasil.

Uma carreira típica rende cerca de 8 títulos (de 2 a 17), quase sempre em 2 a 4 países. Ninguém completa tudo numa carreira só; a coleção leva dezenas de carreiras.

## 5. Estados de cada taça (desenhar todos)
1. **Faltando:** silhueta ou sombra da taça com o nome da competição. Precisa despertar curiosidade, sem parecer tela vazia.
2. **Conquistada 1×:** taça "acesa", com destaque de material (luz, reflexo, pedestal ou o que fizer sentido).
3. **Conquistada várias vezes:** indicação "×4" ou equivalente. Pense se a estética muda com o número (por exemplo, um selo a partir de 5×).
4. **Nova:** acabou de entrar nesta carreira, com destaque até a pessoa ver.
5. **Lendária (Galeria de honra):** tratamento acima das outras, mais próximo da carta ícone.

## 6. Detalhe ao tocar numa taça
Uma folha ou modal com:
- a taça grande;
- o nome da competição e o país;
- quantas vezes foi conquistada;
- a lista de conquistas: ano, clube (escudo) e qual carreira (nome do jogador).

Para uma taça que falta, mostrar como conquistá-la ("Seja campeão da Série B italiana").

## 7. Progresso e vontade de completar
- **Contador geral:** por exemplo "23 / 70 taças". Pode ter uma barra, mas sem cara de planilha.
- **Progresso por país:** por exemplo "Brasil 3/5". Um país completo merece um destaque próprio (selo, faixa ou moldura dourada).
- Pensar em "coleções" menores para ter metas no curto prazo: Galeria de honra, um país, "as 5 grandes ligas da Europa".

## 8. Momento de entrada: a taça indo para a estante
No fim da temporada em que o jogador ganha um título, a taça "entra" na estante. Esse é o momento de emoção, equivalente à revelação da carta. Preciso de:
- a animação (sequência de quadros ou descrição de movimento: duração, easing, luz, partículas se houver);
- uma versão especial para a **primeira** vez que aquela taça entra na Coleção (desbloqueio novo) e uma versão mais curta para a taça repetida.

O jogo já tem um botão "pular animações", então a animação precisa poder ser cortada.

## 9. Identidade visual atual (seguir)
- **Fundo:** verde-gramado escuro (`#0F3D2A`, `#145235`), com o escudo do clube atual em cinza bem apagado ao fundo.
- **Cores:** creme/papel `#FBF8EF`, tinta `#13201A`, dourado (ação principal e destaque) `#F2C230`, rótulos verde-claro `#8FD6AE`, vermelho `#D8404A`, azul `#2F6FD6`.
- **Fontes:** Barlow Condensed (títulos e números, peso 700/800) e Barlow (texto, 500/600). Playfair Display só no jornal.
- **Ícones:** Twemoji (emojis coloridos). Bandeiras dos países também em Twemoji.
- **Cartas:** metálicas, com faixas bronze, prata, ouro e ícone (roxo/holográfico). Uma moldura ou material que conversa com elas é bem-vindo.
- **Tom:** realista, mas com um toque de jogo. Nada infantil. Referências de sensação: estante de troféus de clube, vitrine de museu, álbum de figurinhas completo.

## 10. Restrições técnicas
- **Celular primeiro.** Desenhar em **390 px** de largura e validar em **320 px** (aparelho pequeno). No computador a tela fica centralizada, com cerca de 480 px.
- **Texto e números com no mínimo 14 px.** Áreas de toque com no mínimo 44 px.
- **Desempenho:** muitos jogadores usam celular simples. A estante precisa funcionar com até 70 imagens sem travar. Prefira luz, sombra e brilho feitos com camadas simples (CSS) a 3D pesado. 3D só num elemento de destaque, se fizer muita diferença.
- **Imagens das taças:** fotos reais com estilos e proporções diferentes. Proponha como deixá-las com cara de coleção (pedestal, nicho, luz e escala padronizados).
- **Funciona offline.** Nada que dependa de carregar coisas de fora.

## 11. Onde a Sala aparece
- No **início** (tela inicial): um botão ou entrada para a Coleção, com o contador ("23/70").
- Na **ficha do jogador**, durante a carreira: a aba "Esta carreira".
- No **fim da carreira**: a estante da carreira antes do álbum, com as novas taças destacadas.
- No **fim da temporada** com título: a animação da seção 8.

## 12. O que preciso receber
1. As telas da Coleção e da aba Esta carreira, em 390 px e 320 px: estado inicial (quase vazia), meio do caminho e quase completa.
2. Todos os estados da taça (seção 5), lado a lado.
3. O detalhe ao tocar: numa taça conquistada várias vezes e numa taça que falta.
4. A entrada da taça (seção 8): quadros-chave e especificação de movimento.
5. O botão ou entrada na tela inicial com o contador.
6. Os elementos exportáveis (moldura, pedestal, texturas, selos) em SVG ou PNG @2x/@3x, e as cores ou gradientes usados.

## 13. Fora do escopo (não desenhar agora)
- Rival dentro da carreira, camisa do jogador e taça girando na mão.
- Qualquer item pago ou da versão Pro.
- Ranking (já existe e tem tela própria).
