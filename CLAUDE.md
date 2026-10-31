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

## Evolução contínua (ciclo autônomo)

**Desde 2026-10-31 o ciclo segue o plano Jogo a Jogo + Treinador:** cada rodada pega só o próximo item da fase em
andamento (seção "Plano em andamento" do `EVOLUCAO_CONTINUA.md`); ideia nova vai para "Depois do plano".

Base: `docs/prompt-mestre-evolucao.md` (do Silvio, 2026-10-29). Claude evolui e publica o jogo sozinho; o Silvio testa e opina.
Histórico, decisões e próximos objetivos: **`EVOLUCAO_CONTINUA.md`** (raiz). Leia antes de cada rodada; não repita o
que lá está como recusado sem evidência nova.

- **Seis pilares:** 1 técnica · 2 UI/UX · 3 direção de arte · 4 gameplay e diversão · 5 inovação · 6 validação.
  Atenção ao longo das rodadas: técnica 25%, UI/UX + arte 25%, gameplay 30%, inovação + polimento 20%. Bug fácil
  não pode travar o avanço visual e criativo.
- **Rodada = etapas A–G:** diagnóstico → oportunidades (impacto, esforço, risco) → seleção (poucas, perceptíveis) →
  implementação → validação → revisão crítica (ficou melhor? senão revisa ou reverte) → registro.
- **Validação mínima:** `bash tools/craque_ciclo.sh /tmp/ciclo` (simulador, auditorias, erros reais do site, carreiras
  pela interface no celular e no computador, caça de textos, fotos de todas as telas; `RAPIDO=1` sem fotos). Foto antes
  e depois de toda mudança visual (`craque_telas.js` com `SO=`; `montage` de 5 fotos por imagem economiza tokens).
- **Entrega:** branch `claude/...` + PR por rodada (base `claude/gracious-darwin-9gdlfp`), um commit por melhoria,
  `python3 tools/craque_sw.py` antes. **Claude pode publicar sozinho** (o Silvio autorizou em 2026-10-29): merge só
  depois da validação, e avisar o que entrou no ar. Depois de mexer em CSS, refazer as fotos de **todas** as telas no
  computador (1280×720 e 1440×900) e no celular, não só a da mudança: `craque_telas_diff.py` aponta o que mudou. Relatório no formato da
  seção 9 do prompt (ciclo, diagnóstico, alterações, impacto, validação, pendências, próximo ciclo), separando o
  que foi implementado, testado e só proposto.
- **Pedir aprovação antes:** mudança que altera a proposta do jogo, regra de pontuação/nota, save sem migração.

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
NODE_PATH=$(npm root -g) node tools/craque_e2e.js 2 390 4   # carreiras pela interface (Playwright); MODO=completa na Carreira Completa
NODE_PATH=$(npm root -g) node tools/craque_telas.js /tmp/antes   # foto de cada tela (carreira com sorteio fixo + telas de fora + minigames); DESKTOP=1 ... 1440 900 no computador, SO=evento,lance só algumas
DESKTOP=1 TR=/tmp/tr node tools/craque_e2e.js 3 1280 3      # idem no computador, gravando o texto de cada tela em /tmp/tr
python3 tools/craque_erros.py                       # erros reais dos jogadores (climbix.app)
python3 tools/craque_numeros.py [dias]              # contagem anônima: novos, D1/D7, sessões, carreiras por modo (linha de base do plano)
NODE_PATH=$(npm root -g) node tools/craque_sons.js [pasta]   # grava cada som do jogo (sound.js) em WAV, com volume de cada um
python3 tools/craque_portal.py [itch]               # pacote para portal (dist/climbix-itch.zip): sem api/sw/escudos, que vêm de climbix.app
bash tools/craque_ciclo.sh /tmp/ciclo                # checagens do ciclo num resumo (RAPIDO=1 mais curto)
python3 tools/craque_lint_textos.py /tmp/ciclo/tr-cel   # plural, contração e placeholder errados no texto das telas
python3 tools/craque_telas_diff.py /tmp/antes /tmp/depois   # telas que mudaram entre duas rodadas do craque_telas.js
```

Não há build, lint nem testes unitários: a validação é o simulador + o e2e + olhar a tela.

## Arquitetura

HTML/CSS/JS puro, **scripts clássicos sem build**, carregados por `craque/index.html` nesta ordem
(a ordem importa: cada arquivo acrescenta funções a objetos globais):

`errors → stats → sound → data → names → social-data → social-events → events-text → engine/* → trophy-imgs, trophies,
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
| `fixtures.js` | Carreira Completa: calendário e placares da liga que batem com a tabela da temporada (`S.fullSeason`) |

### Dados e textos — `craque/src/`

| Arquivo | O que tem |
|---|---|
| `data.js` | Ligas, clubes, seleções, características, podcasts (`D.MEDIA.shows`), `BR_2025`/`MOVES_2025`/`STR_2026`/`MOVES_2026` |
| `social-data.js` | Textos do X (`D.SOCIAL`: famosos, torcida, haters, `people`) |
| `social-events.js` | Post + comentário por opção de evento (`D.SOCIAL.ev[id]`) |
| `events-text.js` | Aberturas alternativas dos eventos |
| `names.js` | Nomes para sortear na criação, por país (`D.NAMES`, `D.randomName`); fora da tradução |

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
| `fullseason.js` | Carreira Completa (`c.mode = 'completa'`): a liga rodada a rodada antes do resumo |
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
`feedback.php`, `errors.php`, `stats.php` (contagem anônima por dia, sem id; o jogo manda por `src/stats.js`). Nada pessoal é guardado além da conta.

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
- **Monitor grande tem zoom** (`html.desk`, `--z` 1,15 ou 1,3 no fim do `style.css`): altura em `vh/svh/dvh` nova
  precisa da versão `/ var(--z)` naquele bloco, e posição tirada de `getBoundingClientRect` e aplicada como CSS
  divide por `U.zk()`. Tela larga (≥1000 px, computador ou tablet deitado) usa as telas em 2 colunas.

## Guia visual

Tema: gramado à noite (`--pitch`), cartões de papel creme, ouro para a ação. Regra nova usa as variáveis do topo do
`style.css` (cor solta só para cores de clube, raridade e arte):

- **Texto sobre o verde:** `--tx-1` principal, `--tx-2` apoio, `--tx-3` rótulo/nota, `--tx-4` desligado; rótulo
  de seção (eyebrow) em `--label`, 12 px, caixa alta espaçada. Sobre o papel: `--ink` e `--ink-2`.
- **Superfícies:** papel creme = o cartão principal da tela (decisão, proposta, informação); `--panel` (escuro
  translúcido, borda `--panel-line`) = blocos de apoio (números, tabelas, listas); `--board` = placar, ao vivo e
  X; metal só na carta do jogador. Uma tela tem um cartão principal; o resto é apoio.
- **Cores com sentido:** ouro = ação principal, escolhido e prêmio (um botão dourado por tela); verde (`--up`,
  `--up-ink`) = ganho; vermelho (`--down`, `--down-ink`) = perda/perigo; azul = certo/informação; laranja = arriscada.
- **Hierarquia:** eyebrow → título `h2` (display 800) → texto de apoio (16 px, `--tx-2`) → blocos. Número em
  destaque em display 800. Nada que informa abaixo de 12 px.
- **Medidas:** cantos `--r-sm/md/lg/xl` (10/14/18/22), sombras `--sh-press` (tocável) e `--sh-float` (flutuando),
  espaço entre blocos de 12 px, toque de 44 px no mínimo.
- **Componentes:** escolhido (abas, segmentados, chips) = trilho escuro com o escolhido em creme e texto escuro (no
  papel, verde-escuro com texto creme); etiquetas (ARRISCADA, SEGURA, NOVA…) com 12 px e a cor dando o sentido; botão
  secundário (`.btn.ghost`) de contorno fino, bem mais leve que o dourado; o que vale num lance é `U.lanceStakes(texto)`
  ("Converteu: … · Errou: …" em duas linhas), na temporada e na Copa.
- **Computador:** a carreira fica numa moldura de largura fixa (até 1120 px) com a barra do topo em uma linha; tela
  curta desce para perto do meio (`lift` em `ui/desktop.js`). Tela que cresce depois de aberta entra em `NO_LIFT`.
- **Visual novo (2026-10-27):** cada grupo de telas tem seu bloco no fim do `style.css` (V0 comuns e computador, V1 a V5 telas).
- **Bilheteria (2026-10-30):** a tela inicial é uma bilheteria: cada modo é um ingresso `.tk` (papel, moldura, picote e
  canhoto; os cortes em semicírculo são máscara em `.tk-in`, cor do papel por variável `--paper`/`--stub-bg`). Início,
  Minhas carreiras, Ranking e Perfil têm a barra de baixo `U.tabs(atual)` (ui/start.js) no lugar do "‹ Voltar". As
  configurações (ui/settings.js) são uma tela: chave `.sw` para liga/desliga, `.cfg-seg2` na linha, conta no topo.

## Conferir na tela (Playwright)

Chromium já vem instalado no ambiente na nuvem (não rode `playwright install`). Para ver um evento:
desligue dicas (`localStorage['climbix-dicas-v1']='{"off":true}'`), monte
`S.EVENT_DEFS.find(...).build(c, S.rng(n))`, sobrescreva `S.pickEvent`, defina `U.G.c` e chame
`U.eventScreen()`. O CDN do three.js falha no sandbox: a bola cai para 2D, é esperado.
