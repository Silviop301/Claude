# Climbix — guia do repositório

Jogo de carreira de futebol para o navegador (garoto de 16 anos → carreira de 6 a 10 min → carta final
para compartilhar). No ar em https://climbix.app. Todo texto do jogo e da documentação é em **pt-BR**.

Este arquivo é a fonte única de orientação. Leia-o antes de abrir código; ele existe para que você
**não precise explorar o repositório** para se situar.

## Economia de tokens (regras de trabalho)

1. **Nunca leia arquivo grande inteiro.** Use `grep -n` para achar a função e leia só o trecho
   (`sed -n 'A,Bp'` ou Read com offset/limit). Arquivos acima de 40 KB:
   `style.css` (190 KB), `data.js`, `engine/events2.js`, `engine/decisions.js` (~110 KB cada),
   `engine/season.js` (78 KB), `social-data.js`, `chars.js`, `avatar.js`, `social-events.js`, `sw.js`.
2. **Não abra arquivos gerados** (uma linha gigante, sem valor para ler): `craque/sw.js`,
   `craque/src/kits.js`, `craque/src/trophy-imgs.js`. Gere de novo com a ferramenta (tabela abaixo).
3. **Ignore pastas de mídia** em buscas e listagens: `craque/badges/` (~1000 PNG, 29 MB),
   `craque/assets/`, `craque/trophies/`, `craque/fonts/`, `craque/icons/`, `divulgacao/`,
   `docs/prints/`, `docs/design-itens/`. Ex.: `grep -rn X craque/src tools` em vez de `grep -rn X .`.
4. **`docs/` é histórico** (briefings e relatórios já aplicados). Só abra se a tarefa citar o assunto.
5. Para medir equilíbrio, rode o simulador e leia o resumo; não leia o motor inteiro para "entender".
6. Saídas longas de comandos: filtre com `| tail -20`, `| head`, `grep`.

## Branches e publicação

- **`main` é só um README vazio.** O jogo está em `claude/gracious-darwin-9gdlfp` (branch de deploy).
- Trabalho novo: branch de feature + PR **rascunho** com base `claude/gracious-darwin-9gdlfp`.
- **Merge = produção.** `.github/workflows/deploy-climbix.yml` publica no Hostinger a cada push que
  mexe em `craque/**` no branch de deploy (ou `main`). Quem decide quando publicar é o Silvio.
- Antes de publicar, ou ao adicionar/remover arquivo do jogo: `python3 tools/craque_sw.py`.

## Comandos (da raiz)

```
python3 -m http.server 8765                         # jogo em http://127.0.0.1:8765/craque/
node tools/craque_sim.js 3000                       # equilíbrio: distribuição de notas, títulos, duração
ORIGIN=tardia CHAL=fiel DEAL=salario node tools/craque_sim.js   # origem/desafio/contrato fixos
node tools/craque_decisoes.js                       # quanto vale decidir bem (melhor vs aleatório)
node tools/craque_audit_eventos.js [ids]            # auditoria das decisões (esperado: 0 alertas)
node tools/craque_textos.js                         # repetição de textos entre carreiras
node tools/craque_itens_sim.js                      # carreiras para liberar todos os itens
node tools/craque_estilos.js                        # estilos dos lances decisivos: nenhum pode dominar (esperado: 0 alertas)
NODE_PATH=$(npm root -g) node tools/craque_e2e.js 2 390 4   # carreiras pela interface (Playwright)
python3 tools/craque_erros.py                       # erros reais dos jogadores (climbix.app)
```

Não há build, lint nem testes unitários: a validação é o simulador + o e2e + olhar a tela.

## Arquitetura

HTML/CSS/JS puro, **scripts clássicos sem build**, carregados por `craque/index.html` nesta ordem
(a ordem importa: cada arquivo acrescenta funções a objetos globais):

`errors → sound → data → social-data → social-events → events-text → engine/* → trophy-imgs, trophies,
card, cine, kick, defend, kits, kits-real, avatar, chars → ui/core → ui/* → main → ball3d`

Objetos globais: `CRAQUE_DATA` (`D`, dados), `CRAQUE_SIM` (`S`, motor), `CRAQUE_UI` (`U`, telas;
`U.G.c` = carreira atual, `U.G.step` = etapa). Telas chamam outras por `U.nome()`; partes do motor
dividem ajudantes por `CRAQUE_SIM._`. O motor não usa DOM: roda no navegador e no Node
(`craque/src/sim.js` carrega `engine/*` na mesma ordem para as ferramentas).

### Motor — `craque/src/engine/` (ordem de carga)

| Arquivo | O que faz |
|---|---|
| `core.js` | Sorteio com semente, jogador, características, investimentos, papel no elenco, divisões; `S.GOAL_SCALE` |
| `events.js`, `events2.js` | Eventos da temporada (`when → build → resolve`) |
| `stakes.js` | Formato das decisões: opção segura `{safe}` ou arriscada `{p, win, lose}`; `S.stakeRows`, `S.STAKE_K`, `S.fxValue` |
| `decisions.js` | Eventos frequentes no formato de stakes + eventos de dinheiro |
| `events3.js` | Ganchos (`c.hooks`): escolhas que voltam temporadas depois |
| `moments.js` | Regras do minigame (pênalti, falta, goleiro, zagueiro, meia); `S.STYLES` (dois estilos por lance, `kickSetup(c, tipo, estilo)`) |
| `worldcup.js` | Copa do Mundo e Mundial (tabela do grupo `S.wcGroupTable`) |
| `season.js` | Simulação da temporada, tabela, títulos, Bola de Ouro, manchetes |
| `market.js` | Propostas, contratos, transferências |
| `finish.js` | Pontuação e veredito; `S.GRADES`, `S.LEVEL_W` |
| `achievements.js` | Conquistas do fim da carreira |
| `rival.js` | Rival em paralelo (sorteio próprio); envolve `S.playSeason` |
| `origins.js` | Origens e desafios (liberados por conquistas) |
| `contract.js` | Termos do contrato e proposta no meio do contrato |

### Dados e textos — `craque/src/`

| Arquivo | O que tem |
|---|---|
| `data.js` | Ligas, clubes, seleções, características, podcasts (`D.MEDIA.shows`), `BR_2025`/`MOVES_2025`/`STR_2026`/`MOVES_2026` |
| `social-data.js` | Textos do X (`D.SOCIAL`: famosos, torcida, haters, `people`) |
| `social-events.js` | Post + comentário por opção de evento (`D.SOCIAL.ev[id]`) |
| `events-text.js` | Aberturas alternativas dos eventos |

### Apresentação — `craque/src/`

`kick.js` (pênalti/falta), `defend.js` (goleiro, zagueiro, meia), `cine.js` (câmera e efeitos; `?cine=0`
desliga), `chars.js` (personagens SVG dos minigames), `avatar.js` (jogador da criação, `c.look`),
`card.js` (carta em canvas), `trophies.js`, `ball3d.js` (bola 3D da tela inicial), `kits-real.js`
(uniformes reais), `sound.js` (Web Audio), `errors.js` (envia erros ao servidor).

### Telas — `craque/src/ui/` (uma tela ou grupo por arquivo)

| Arquivo | Tela |
|---|---|
| `core.js` | Estado `G`, ajudantes, salvar/carregar, barra do topo |
| `start.js` | Tela inicial e criação do jogador |
| `offers.js`, `preseason.js` | Base, janela/propostas; pré-temporada |
| `match.js` | Eventos e jogo decisivo (`optHint`) |
| `season.js` | Temporada: contadores, corrida/mini tabela (`raceOf`, `miniTable`), resenha, resumo |
| `worldcup.js`, `finale.js` | Copa do Mundo; fim de carreira e próxima meta |
| `paper.js`, `social.js` | Jornal; posts no X (`commentsOf`, `person`) |
| `walkout.js`, `album.js`, `cardview.js` | Revelação de carta, álbum, carta 3D compartilhada |
| `items.js`, `packs.js` | Itens/pacotinhos (inventário, sorteio), abrir pacote, sequência de dias |
| `collection.js`, `trophyroom.js`, `achievements.js` | Coleção, Sala de Troféus, conquistas |
| `cloud.js`, `ranking.js` | Conta e save na nuvem; ranking online |
| `sheet.js`, `settings.js`, `tips.js`, `training.js` | Ficha do jogador, configurações, dicas, treino |
| `daily.js`, `challenge.js`, `feedback.js`, `desktop.js` | Carreira do dia, desafio por link, opinião, mouse/teclado |

### Servidor — `craque/api/` (PHP + SQLite fora do `public_html`)

`account.php` (contas), `oauth.php` (Google/GitHub/Discord), `rank.php`, `c.php` (link curto da carta),
`feedback.php`, `errors.php`. Nada pessoal é guardado além da conta.

### Ferramentas que geram arquivos

| Gera | Ferramenta |
|---|---|
| `craque/sw.js` + versões `?v=` no `index.html` | `python3 tools/craque_sw.py` |
| `craque/src/kits.js` | `node tools/craque_kits.js` (com o `http.server` rodando) |
| `craque/badges/*.png` | `python3 tools/craque_badges.py` (só os que faltam; conferir visualmente) |
| `craque/trophies/` + `trophy-imgs.js` | `tools/craque_trophies.py` → `tools/craque_trophies_resize.js` |
| `craque/assets/tw/` (emojis) | `node tools/craque_twemoji.js` (rodar ao usar emoji novo, depois `craque_sw.py`) |
| `craque/fonts/`, `craque/icons/`, `assets/cartas/ac-*` | `craque_fonts.py`, `craque_icons.js`, `craque_acabamentos.js` |

## Regras do projeto

- **Ids de clube são posicionais** (`<liga>-<índice>`): clube novo vai **no fim** da lista da liga em
  `data.js`. Acesso/rebaixamento e força só por mapas de nome (`MOVES_*`, `BR_2025`, `STR_2026`), nunca
  reordenando.
- **Decisões sem clique óbvio:** ganho permanente só em opção arriscada; a segura dá ganho pequeno e
  certo; o risco tem lado ruim de verdade e fica visível. Conferir com `craque_audit_eventos.js`.
- **Mudou equilíbrio?** Rode `craque_sim.js` e recalibre `S.GRADES` (`engine/finish.js`) para o robô
  ficar perto de S11/A26/B31/C19/D13. A duração da carreira (~9 min, ~20 temporadas) não deve mudar.
- **Textos:** pt-BR; no máximo um bordão por linha + opinião ou piada de verdade; X em voz de X-BR
  (minúsculas, kkkk); sem ofensa pesada. Personalidades reais ficam (jogo entre amigos).
- Itens e coleções são **só visuais**: nunca mudam nota ou sorte.
- Ao criar intro de câmera em minigame, a ação cronometrada só começa depois que a câmera abre.
- **Estilos do lance decisivo:** o primeiro de `S.STYLES[tipo]` é o lance de sempre; o segundo muda a mecânica. Mudou
  um número? Rode `craque_estilos.js` (chance pela carta igual ±4 pontos e nenhum estilo melhor em todos os níveis).
- Melhoria de personagem por ajuste de SVG em código já foi recusada: precisa de arte nova.

## Conferir na tela (Playwright)

Chromium já vem instalado no ambiente na nuvem (não rode `playwright install`). Para ver um evento:
desligue dicas (`localStorage['climbix-dicas-v1']='{"off":true}'`), monte
`S.EVENT_DEFS.find(...).build(c, S.rng(n))`, sobrescreva `S.pickEvent`, defina `U.G.c` e chame
`U.eventScreen()`. O CDN do three.js falha no sandbox: a bola cai para 2D, é esperado.
