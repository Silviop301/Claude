# CRAQUE — mapa do código

Scripts clássicos (sem build), carregados pelo `index.html` nesta ordem.

| Arquivo | O que faz |
|---|---|
| `data.js` | Ligas, clubes, seleções, características, investimentos, artigos (o/a) |
| `sound.js` | Sons gerados com Web Audio |
| `engine/core.js` | Núcleo do motor: sorteio com semente, jogador, características, investimentos, divisões |
| `engine/events.js` | Eventos durante a temporada |
| `engine/moments.js` | Regras do minigame (pênalti e falta) |
| `engine/worldcup.js` | Copa do Mundo |
| `engine/season.js` | Simulação da temporada e manchetes |
| `engine/market.js` | Propostas, contratos e transferências |
| `engine/finish.js` | Pontuação e veredito do fim de carreira |
| `trophies.js`, `card.js`, `kick.js`, `ball3d.js` | Taças, carta final, minigame e bola 3D |
| `defend.js` | Minigames defensivos: defesa de pênalti (goleiro) e desarme (zagueiro) |
| `kits.js` | Cores de camisa de cada clube (geradas dos escudos por `tools/craque_kits.js`) |
| `ui/paper.js` | Jornal: capa, foto ilustrada, coluna do cronista e edições extras |
| `ui/walkout.js` | Revelação de carta (nova faixa ou carta especial) e desgaste da carta |
| `ui/album.js` | Álbum do fim de carreira (stories por temporada) e imagem para compartilhar |
| `ui/core.js` | Estado compartilhado (`G.c` = carreira, `G.step` = etapa), ajudantes, salvar, barra |
| `ui/start.js` … `ui/finale.js` | Uma tela (ou grupo de telas) por arquivo; registram funções em `CRAQUE_UI` |
| `main.js` | Ponto de partida |
| `sim.js` | Só para o Node: junta o motor para `tools/craque_sim.js` |

As partes do motor compartilham ajudantes por `CRAQUE_SIM._`; as telas chamam telas de outros arquivos por `U.nome()`.

## Instalável / offline

`craque/sw.js` é gerado por `python3 tools/craque_sw.py` (lista de arquivos guardados no aparelho).
Rode de novo ao adicionar ou remover arquivos do jogo. Código e página vêm da rede quando há internet.
