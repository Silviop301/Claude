# Relatório · Revisão de código (branch `fable/revisao`)

Revisão de `craque/src` (motor, telas, minigames, personagens, dados) atrás de mapas incompletos, textos com `undefined`/`NaN`/`null`, campos sem padrão para saves antigos, erros de lógica em sorteios e limites, laços de animação que continuam depois de trocar de tela, layout em 320/390 px e emojis sem SVG. Mais um teste de ponta a ponta com Playwright (`tools/craque_e2e.js`) que joga carreiras inteiras pela interface.

Um commit por bug corrigido; os de causa ou solução incerta ficam só aqui. Nada foi publicado no site.

## Como o teste de ponta a ponta funciona

`tools/craque_e2e.js` abre o jogo no Chromium (tela de celular), cria o garoto (posição, país e um nome com apóstrofo ou HTML de propósito), escolhe o clube na base e joga a carreira inteira clicando nos botões como um jogador: pré-temporada (característica obrigatória, investimentos, foco do treino, ficha do jogador), eventos (inclusive propostas de clube, com dois toques), lances decisivos em `auto`, resumo da temporada, jornais desligados, Copa do Mundo e Mundial simulados, janela de transferências (com "novas propostas" e "pedir liga"), pouco espaço no elenco (empréstimo, conversa, pedir para sair), posts nas redes, anúncio de despedida ou aposentadoria, tela final (álbum, Sala de Troféus, cartas especiais) e nova carreira. Uma vez por aba passa também por Conquistas, Coleção, Ranking (sem rede), Sala de Troféus, Configurações e Conta.

A cada passo guarda os erros de página e do console, procura `undefined`, `NaN`, `null` e `[object Object]` no texto visível da tela e mede se a página rola na horizontal (layout estourando), apontando o elemento mais largo que a tela. Os temporizadores do jogo rodam 20× mais rápido; o 3D (CDN), o ranking e a nuvem ficam sem rede, como num celular offline. Uso no topo do arquivo.

### Rodada completa (antes das correções do teste)

`node tools/craque_e2e.js 30 390 4` · 120 carreiras (30 por posição) em 390 px, 4 abas, 20 min 33 s.

| | ATA | MEI | ZAG | GOL |
|---|---|---|---|---|
| Carreiras | 30 | 30 | 30 | 30 |
| Temporadas por carreira (média) | 21,6 | 19,9 | 20,7 | 20,1 |
| Passos (cliques) por carreira | 469 | 376 | 346 | 452 |

Cobertura (soma das 120 carreiras): 4 587 resumos de temporada · 2 143 eventos (14 com três opções) · 2 077 investimentos · 2 781 pré-temporadas · 376 Copas/Mundiais simulados · 1 256 propostas assinadas (212 pedidos de liga, 221 "novas propostas", 6 aposentadorias na janela) · 303 situações de pouco espaço (41 empréstimos, 88 conversas, 98 pedidos de saída) · 735 posts nas redes · 42 anúncios de despedida · 14 "parar agora" · 155 revelações de carta · 25 comemorações de título · 1 278 taças entrando na estante · 120 álbuns (1 239 telas) · 118 Salas de Troféus · 136 abas da ficha · 221 confirmações.

Resultado: **182 ocorrências, 2 problemas de verdade** (nenhum `undefined`, `NaN`, `null` ou `[object Object]` no texto da tela em nenhum passo):

| Ocorrências | O que | Diagnóstico |
|---|---|---|
| 144 erros de página + 27 no console, em 78 carreiras | `TypeError: Cannot read properties of null (reading 'age')` em `S.mustRetire` ← `afterSeason` (`ui/season.js:282`), na tela "Fim de carreira" | A taça entrando na estante (`salaPlay`) chamava `done()` duas vezes quando havia um segundo toque nos 220 ms da saída: a segunda continuação rodava `afterSeason()` já sem carreira. Com os temporizadores 20× mais rápidos o teste "toca" nessa janela quase sempre; no celular acontece com um toque duplo. **Bug 17**, corrigido |
| 11 rolagens horizontais (3 a 21 px) | `div.wc-champ` «CAMPEÃO DO MUNDO! …» e «CAMPEÃO MUNDIAL! …» | A animação de entrada cresce 12% num bloco de largura total; a página rola para o lado por meio segundo. **Bug 18**, corrigido |

Rodando com uma aba só (sem concorrência de CPU), as 120 carreiras não mostravam nenhum dos dois: o toque duplo só aparecia com o navegador lento, o que é justamente o celular fraco.

### Rodada de confirmação (depois das correções)

`node tools/craque_e2e.js 10 390 4` · 40 carreiras (10 por posição; 22,5 / 19,1 / 21,3 / 23,4 temporadas em média), 5 min 21 s: **0 ocorrências** — nenhum erro de página ou console, nenhum texto quebrado, nenhuma rolagem horizontal. Cobertura equivalente à rodada completa (1 540 resumos, 743 eventos, 115 Copas/Mundiais, 433 propostas, 121 situações de pouco espaço, 247 posts, 41 revelações, 547 taças na estante, 40 álbuns e Salas).

Os três arquivos JSON das rodadas (por carreira: país, passos, temporadas e cobertura por tipo de tela; por ocorrência: tipo, tela e detalhe) ficam fora do repositório; o teste os grava com `OUT=arquivo.json`.

## Bugs encontrados

Gravidade: **alta** quebra o jogo ou perde a carreira · **média** tela errada, erro no console ou efeito que a pessoa nota · **baixa** texto, detalhe visual ou caso latente.

| # | Onde | Bug | Como reproduzir | Grav. | Correção |
|---|---|---|---|---|---|
| 1 | `src/kick.js:282` | O laço de `requestAnimationFrame` da mira (direção/altura) não conferia se o SVG ainda estava na página: sair da tela no meio da cobrança deixava o laço rodando para sempre | Lance decisivo → "Bater o pênalti" → com a mira andando, tocar na seta de voltar ao início e confirmar → o laço segue a 60 fps até recarregar | média | **Corrigido** (`ef72dfb`): `if (!svg.isConnected) return;` no início do laço |
| 2 | `src/chars.js:66` e `:316` | Os dois laços globais dos personagens (`jogador-lado`, `jogador-2d`) rodavam a 60 fps desde o carregamento, em todas as telas, mesmo sem nenhum personagem (lista `live` vazia) | Abrir o jogo e ficar na tela inicial: CPU/bateria gastas num laço vazio | média | **Corrigido** (`2d743cd`): o laço para quando `live` esvazia e `wake()` o religa no `connectedCallback` |
| 3 | `src/ui/season.js:72` e `:208` | A contagem do resumo (1,5 s) e a comemoração de título seguem com temporizadores; voltar ao início nesse intervalo fazia `summary()` procurar `#feed` (já removido) → `TypeError`, e a contagem escrevia em elementos removidos | Resumo da temporada com "Resumo: Normal" → durante a contagem, voltar ao início e confirmar → erro no console | média | **Corrigido** (`36de209`): `tick` e `summary` conferem se a tela do resumo ainda existe |
| 4 | `src/ui/preseason.js:74` | Depois de escolher a característica, a carta anima 0,9 s e espera 0,65 s para redesenhar a pré-temporada; voltar ao início nesse intervalo chamava `prep(true)` sem carreira (`G.c` nulo) → `TypeError` em `S.seasonChoices` | Pré-temporada → escolher característica (dois toques) → voltar ao início em menos de 1,5 s | média | **Corrigido** (`b9aa665`): só segue se a mini carta ainda está na tela e há carreira |
| 5 | `src/ui/album.js:138` | A ordem das cartas especiais na imagem "Compartilhar a história" usava uma lista com só 4 tipos; para os outros 9 (`mundial`, `muralha`, `xerife`, `joia`, `lenda`, `chuteira`, `garcom`, `triplice`, `perfeita`) a comparação dava `NaN` e a ordem saía ao acaso | Carreira com cartas especiais fora da lista → fim de carreira → álbum → Compartilhar a história | baixa | **Corrigido** (`0290f00`): tipos fora da lista ficam por último |
| 6 | `src/ui/album.js:59` | Voltar ao início remove o álbum (`.album`), mas o temporizador seguia avançando as telas e desenhando cartas num elemento já removido até o fim da lista | Fim de carreira → álbum → voltar ao início pela barra | baixa | **Corrigido** (`157ed12`): `show()` para quando o álbum sai da página |
| 7 | `src/engine/season.js:199` | Rebaixamento com `20 - releg` fixo, mas a tabela usa o tamanho real da liga quando ela tem mais de 20 times (o Championship tem 24). Numa liga assim com descenso cairiam 7 em vez de 3. Hoje nenhuma liga com `down` passa de 20, então é latente (basta o Brasileirão ou a Serie B inglesa ganharem `down` com 21+) | Só com dados futuros: liga com `down` e mais de 20 clubes | média (latente) | **Corrigido** (`e07e779`): `nTeams - releg` |
| 8 | `src/engine/moments.js:93` | No clássico, o texto "a vitória afasta o fantasma do rebaixamento" comparava a posição com o tamanho real da liga (8 a 12 clubes no Catar, Escócia…) enquanto a tabela mostrada tem no mínimo 20 posições: aparecia em posições de meio de tabela | Clube numa liga com menos de 20 clubes, em 6º numa liga de 8 → clássico com texto de rebaixamento | baixa | **Corrigido** (`e07e779`): mesmo mínimo de 20 |
| 9 | `src/ui/match.js:27` e `:39` | Título, texto e resultado do evento iam direto no HTML sem `esc()`. Esses textos levam o nome do jogador, digitado livremente: `<b>Zé</b>` saía em negrito e `<img src=x onerror=…>` executava (só no próprio aparelho) | Criar jogador com nome `<b>Zé</b>` → primeiro evento | média | **Corrigido** (`164535b`): `esc()` nos três (nenhum evento usa HTML de propósito) |
| 10 | `src/ui/match.js:145`, `src/ui/worldcup.js:223` e `:244` | O chute, a defesa, o desarme e o passe terminam com um temporizador de 1,4–1,7 s que chama `onDone`. Voltar ao início nesse intervalo desenhava o resultado do lance (ou a lista de jogos da Copa) por cima da tela inicial, sem carreira aberta | Lance decisivo → bater → enquanto a bola voa, voltar ao início e confirmar | média | **Corrigido** (`11302e4`): com o palco fora da página o retorno é ignorado; o lance fica "começado" e ao retomar a chance da carta decide (regra que já valia para quem fecha o jogo no meio) |
| 11 | `src/ui/season.js:34` | `res.pos === 'PON'`: posição que não existe (sobra de uma versão antiga); o ramo nunca entra | — | baixa | Não corrigido: só limpeza (`atk = res.pos === 'ATA'`) |
| 12 | `src/engine/season.js:303`, `src/engine/finish.js:29`, `src/ui/finale.js:71` | Plural fixo: "1 GOLS", "1 gols e 1 assistências", "1 melhorias" | Zagueiro com 1 gol na temporada e carta especial; carreira com 1 gol | baixa | Não corrigido aqui: o branch `fable/eventos` traz `D.plural()` e aplica nesses lugares; quando ele entrar, o problema some |
| 13 | `src/engine/events.js:128` | Evento "Renovação": o texto fala em "contrato de 5 anos" e a opção dá "mais 3 anos" (`c.contract += 3`) | Evento de renovação | baixa | Não corrigido aqui: já corrigido em `fable/eventos` |
| 14 | `src/ui/daily.js:15` | A carreira do dia sorteia só atacante ou meia: zagueiro e goleiro nunca são o garoto do dia | Tela inicial, vários dias | baixa | Não corrigido: parece decisão de desenho; se não for, basta `r.pick(['ATA','MEI','ZAG','GOL'])` e os números por posição (`D.POS_NUM`) |
| 15 | `src/avatar.js:92` | Carreira antiga sem visual: `OLD_SKIN[hash % 4]` só usa 4 dos 5 tons da lista | Save sem `look` | baixa | Não corrigido: cosmético (`% OLD_SKIN.length`) |
| 16 | `craque/style.css:988` e `:1540` | `.cc-photo svg` definido duas vezes (150 px e depois 132 px); vale o segundo | — | baixa | Não corrigido: só limpeza |
| 17 | `src/ui/trophyroom.js:249`, `src/ui/season.js:108`, `src/ui/walkout.js:64`, `src/ui/paper.js:83` | As sobreposições que fecham com temporizador (taça entrando na estante, comemoração de título, revelação de carta, jornal) chamavam a continuação a cada toque dado durante a saída (220–250 ms). Na taça do fim de carreira, a segunda chamada rodava `afterSeason()` sem carreira → `TypeError` em `S.mustRetire` (achado pelo teste: 78 de 120 carreiras); nas outras, resumo montado duas vezes (destaque repetido) ou revelação seguinte duplicada | Fim da última temporada → "Ver sua carreira" → quando a taça termina de entrar, tocar duas vezes rápido | **alta** (erro no fim de carreira; o resto da tela final segue) | **Corrigido** (`37c011b`): cada sobreposição fecha uma vez só |
| 18 | `craque/style.css:568`, `:560`, `:612` | A animação `trophy-in` passa por `scale(1.12)`; em blocos de largura total (banner de campeão da Copa/Mundial, jogo da lista da Copa, conquista nova) o elemento fica mais largo que a tela por meio segundo e a página rola para o lado (medido: 3 a 21 px em 390 px) | Ser campeão da Copa ou do Mundial e olhar a página durante a entrada do banner | baixa | **Corrigido** (`11c53ae`): `overflow-x: clip` nos contêineres (`#wc-after`, `.wc-list`, `.ach-grid`), como `#after` já tinha |

## O que foi verificado e está certo

- **Mapas por tipo.** Lance decisivo: os 5 tipos (`cup`, `title`, `cont`, `acesso`, `classico`) têm texto de introdução, contexto, resultado e manchete, para atacante/meia e para os lances defensivos (`save`, `tackle`, `pass`); na Copa, o resumo do jogo cobre `pen`, `fk`, `save`, `tackle` e `pass` (o `pass` faltava e foi o bug do "undefined" corrigido antes). Cartas especiais: 13 tipos iguais em `S.CARD_DROP`, `SPECIAL_NAME`, `SPECIAL_RARITY`, `card.js` (tema e metal 3D). Taças: `ROOM`, `METAL`, `WC_NAME` e `titleType` cobrem `league`, `cup`, `ucl`, `lib`, `inter`, `cwc`, `wc`, `ballon`. Tipos de proposta (`kinds`) e de evento (`EV_KIND`) têm valor padrão. Países: os 11 jogáveis existem em `NATIONS`, `MEDIA.papers`, `DAILY_NAMES` e `NATION_KIT` (32 seleções). `D.LADDER` só aponta para ligas que existem.
- **Textos das redes** (`social-data.js`): todas as chaves que `ui/social.js` lê existem (`whole`, `parts`, `momentOk`/`momentEnd` por tipo, `fans`/`haters`/`club` por humor, `ctx`, 16 famosos com `h`, `min`, `up`, `down`, `bye`) e os 21 marcadores usados nos textos são os que `fill()` substitui.
- **Saves antigos.** Os ids de características, sinergias e investimentos não mudaram desde a chave `craque-v5` (28/09). Teste à parte: um save no formato de 28/09 (sem `pe`, `look`, `train`, `cards`, `kicks`, `evCount`, `inv`, `leagueOf`, estatísticas defensivas nos totais etc.) foi continuado pela tela inicial e jogou 6 temporadas sem erro nem texto quebrado — os `|| 0`, `|| {}` e a migração em `start.js` dão conta.
- **Emojis.** 258 emojis usados no código, 258 SVGs em `assets/tw`, nenhum faltando nem sobrando (verificado offline com a mesma regra de `tools/craque_twemoji.js`).
- **Laços de animação.** Os demais laços (`ball3d.js`: bola da tela inicial, carta 3D, jornal 3D, gol; `defend.js`: carrinho, passe, idle; `kick.js`: barreira; `preseason.js`; `worldcup.js`: relógio; `trophyroom.js`) conferem `isConnected` ou terminam sozinhos.
- **Sorteios e limites.** Idade (16 a 42; seleção 18 a 37; despedida 32+; parar 33+), fama (≥ 0), dinheiro (≥ 0 nos eventos), contadores de estatísticas (totais, passagens, Copa e Mundial) e os pesos de sorteio dos eventos conferem com as regras descritas nos comentários. O `wcMatch` com `[bu, bt]` do branch `fable/balanceamento` não está neste branch (ele parte do site publicado).

## Layout em 320 e 390 px

- **390 px** (rodadas acima): a única rolagem horizontal era a do banner de campeão durante a animação (bug 18, corrigido); depois da correção, 0 em 40 carreiras.
- **320 px**: `node tools/craque_e2e.js 5 320 4` · 20 carreiras (20,6 / 25,0 / 20,4 / 22,8 temporadas), 2 min 13 s: **0 ocorrências** (nenhuma rolagem horizontal, nenhum erro, nenhum texto quebrado).
- Conferência visual em 320 px (fotos de tela inicial, criação 1 e 2, base, pré-temporada com investimentos, janela, lance decisivo, resumo da temporada, fim de carreira, conquistas e Sala de Troféus): nenhum botão cortado nem texto estourando; a grade 2×2 da tela inicial, os quatro botões de posição, a mini carta com seis atributos, as cartas de proposta e a carta final cabem inteiras. As fileiras que rolam de propósito para o lado (metas da Sala, categorias do ranking, escudos da carta) continuam rolando.

## Resumo

18 achados: **12 corrigidos** (bugs 1–10, 17 e 18, um commit cada), 6 ficaram só no relatório (limpeza, plural e textos já tratados em `fable/eventos`, decisões de desenho). O mais sério era o 17, que só aparece com toque duplo no fim da animação da taça — e por isso só o teste com o navegador sobrecarregado o pegou. O teste de ponta a ponta fica em `tools/craque_e2e.js` para rodar depois de cada mudança grande: ~5 min para 10 carreiras por posição em 4 abas.
