# Climbix — guia do repositório

Jogo de carreira de futebol para o navegador (garoto de 16 anos → carreira de 6 a 10 min → carta final
para compartilhar). No ar em https://climbix.app. Todo texto do jogo e da documentação é em **pt-BR**.

Este arquivo é a fonte única de orientação. Leia-o antes de abrir código; ele existe para que você
**não precise explorar o repositório** para se situar.

## Economia de tokens (regras de trabalho)

1. **Nunca leia arquivo grande inteiro.** Use `grep -n` para achar a função e leia só o trecho
   (`sed -n 'A,Bp'` ou Read com offset/limit). Arquivos acima de 40 KB:
   `style.css` (~480 KB), `data.js`, `engine/events2.js`, `engine/decisions.js` (~110 KB cada),
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
MODO=completa node tools/craque_sim.js 300          # Jogo a Jogo: notas e o ritmo (jogos vividos/resumidos/banco e minutos por temporada; alvo ~15 e ~1 h)
MODO=completa JANELA=nao node tools/craque_sim.js 300   # Jogo a Jogo sem a janela do meio do ano (o robô troca de clube nela)
MODO=completa TREINO=nao node tools/craque_sim.js 300   # Jogo a Jogo sem o treino com lances (o robô padrão treina toda semana e acerta 60% dos lances: TREINO_ACERTO; FC_TRC=n põe limite por temporada)
ORIGIN=tardia CHAL=fiel DEAL=salario node tools/craque_sim.js   # origem/desafio/contrato fixos
node tools/craque_decisoes.js                       # quanto vale decidir bem (melhor vs aleatório)
node tools/craque_audit_eventos.js [ids]            # auditoria das decisões (esperado: 0 alertas)
node tools/craque_textos.js                         # repetição de textos entre carreiras
node tools/craque_itens_sim.js                      # carreiras para liberar todos os itens
node tools/craque_estilos.js                        # estilos dos lances decisivos: nenhum pode dominar (esperado: 0 alertas)
node tools/craque_livre.js [n] [cenas]               # lances livres do Jogo a Jogo: robô vs chance pela carta (esperado: 0 alertas; WHY=1 detalha)
node tools/craque_treinador.js [n] [temporadas]     # Modo Treinador: robô técnico (metas, demissões, títulos, fama) e save no meio da temporada; INICIO=baixo|livre, CO_K/CO_CK/CO_ULT mexem no motor; ROBO=esperto escolhe a melhor tática a cada jogo
node tools/craque_taticas.js [formação estilo]       # Treinador: cada formação x estilo contra todas (pontos por jogo; GAP=6 com o seu time mais fraco); esperado 0 alertas (nada vence tudo, todo estilo e formação servem para algo)
NODE_PATH=$(npm root -g) node tools/craque_telas_treinador.js /tmp/co   # (antigo) Treinador em pé; desde 2026-11-06 o Treinador é só deitado: a ferramenta para no "Gire o celular"
NODE_PATH=$(npm root -g) node tools/craque_telas_deitado.js /tmp/ld [1,2,3,4]   # Treinador deitado (844x390; `SAFE=47` simula o entalhe do iPhone, `VP=852x393` muda a tela; também `SAFE` em craque_home_deitada.js): 1 escalação, semana, treino, olheiro, funções, batedores, preleção · 2 um jogo ao vivo · 3 a temporada até as propostas · 4 a primeira carreira (tutorial, dica do auxiliar, 1ª proposta; os passeios 1 a 3 entram com `climbix-co-ja` = quem já teve carreira)
NODE_PATH=$(npm root -g) node tools/craque_home_deitada.js /tmp/hl   # home deitada (fotos: vazia, carreiras, vagas cheias, Relâmpago pedindo para girar, em pé)
node tools/craque_invariantes.js [n] [semente]       # regras do motor (sem NaN, faixas 0–100/0–99, dinheiro >= 0) e save no meio que termina igual; esperado 0 falhas
node tools/craque_campinho.js [jogos]               # campinho ao vivo (livesim.js) sem tela, partida do 1× (13000 passos): pulos da bola, bonecos encostados, passes/chutes/posse (por 2 min), passes por posse de cada estilo, linha por estilo, overall, gols do motor na rede; esperado 0 alertas
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
NODE_PATH=$(npm root -g) node tools/craque_telas_jaj.js /tmp/jaj   # fotos do Jogo a Jogo (criação, celular e apps, partida, jornal, lance, fim da temporada); DESKTOP=1 ... 1440 900
```

Não há build, lint nem testes unitários: a validação é o simulador + `craque_invariantes.js` (regressão do motor e do save) + o e2e + olhar a tela.

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
| `fullcareer.js` | Rumo ao Topo (ex-Jogo a Jogo; nome na tela desde 2026-11-06): calendário, semana, loja, apostas, partida; tipo de jogo `S.fcKind` (vivido, resumido, banco); faltas, cartões e impedimento `S.FC_CARD` (sorteados antes dos gols: o vermelho pesa no placar; 3 amarelos ou vermelho = 1 jogo fora; o Treinador usa `S.CO.foul/yel/redD/off` em `engine/coach.js`; o campinho mostra com `U.LP.sim().ref`) |
| `cassino.js` | Jogo a Jogo: mesa dos fundos do Zé e a tentação |
| `phone.js` | Jogo a Jogo: as pessoas do celular (`c.ppl`: relação só no tom, memória), mensagens depois e antes do jogo, Chat |
| `money.js` | Jogo a Jogo, dinheiro: manutenção do status, dívida com juros (`c.debt`, `S.fcCharge`/`S.fcCredit`), bônus e luvas, saídas do vermelho (`S.fcWays`), investimentos (`S.FC_INVEST`), festa e o Zé no Chat |
| `transfer.js` | Jogo a Jogo, mercado: a janela do meio do ano (`S.fcWin`, `S.FC_WIN`) e a troca de clube no meio da temporada (`S.fcMove`: liga nova na rodada em que está) |
| `legado.js` | Jogo a Jogo: metas do ano (`S.fcGoals`: clube, empresário e o sonho escolhido, `S.fcDream`), conferidas no fim da temporada (`res.metas`, `c.goalHist`), e pontos de legado (`S.legacy`, pesos em `S.LEGACY_W`; no fim da carreira o legado substitui a nota S a D, e `S.legacyTone` só dá o tom do jornal e da carta) |
| `coach.js` | Modo Treinador (`co.mode = 'treinador'`, save próprio): elencos de 25 sorteados por clube e temporada (`S.coGenSquad`), formações `S.CO_FORMS` (vaga com lado e linha) e estilos `S.CO_STY` (cada um com ponto forte e fraco), confronto por setor `S.coMatchup` (meio, lados, área, pressão, contra-ataque), escola de cada clube `S.coSchool` e prévia `S.coPreview`, escalação do auxiliar (`S.coAutoXI`), partida minuto a minuto com paradas (`S.coMatchStart/Step/End`, `until` para andar um minuto, leitura do auxiliar `S.coRead`, trocas `S.coSub`, tática `S.coMatchTactic`), acréscimos (`m.st` minuto 45+/90+, `m.a1`/`m.a2` da placa, `m.tk` minutos jogados; taxas por minuto divididas por `CO.mins`; relógio `S.coClock`/`S.coEvMin`), caderno do técnico (`co.cad`: casas estilo×estilo e formação×formação a lápis e a caneta, verdade em `S.coCadTruth`, anotadas no fim do jogo em `log.cad`; rivais; palpite do auxiliar `S.coHint`), meta da diretoria (`S.coGoalFor`), confiança escondida e ultimato, fama e experiência (`S.coSeasonEnd`, `S.coSkill`); números em `S.CO` |
| `coach.js` (2026-11-06) | Também: posição de cada vaga com lado `S.coSlotLbl`, funções `S.CO_ROLES`/`S.coRoles` (inclinação −1/0/+1 por vaga), batedores `S.CO_TAKE`/`S.coTaker` e gols de bola parada (`e.sp`), treino da semana `S.CO_TRAIN` (16), preleção `S.CO_PRE`, grito `S.CO_SHOUT`, conversa do intervalo `S.CO_TALK` e individual `S.CO_TALK1`, notas do jogo `S.coRateMatch` (`log.rt`); bola parada que não entra (pênalti, falta direta, cabeçada de escanteio: `CO.spMiss`, só rótulo da chance, o placar não muda) e escanteios contados (`m.ck`, `CO.ck`); `ui/coach.js` manda `{sp, num}` como 4º argumento de `sim.shot`; tudo neutro para o robô |
| `coachfin.js` | Treinador, finanças: `co.fin` (caixa, verba, teto da folha), receita pelo tamanho do clube e pela divisão (`S.coFinBase`), semana a semana nos ganchos de `S.coMatchEnd`/`S.coSkipRound` (folha, patrocínio, TV em 2 parcelas, bilheteria `S.coGate`), bônus e prêmios e a verba/teto do ano seguinte no `S.coSeasonEnd` (`out.fin`). Finanças 2.0: presidente com perfil (`S.coPres`, `S.CO_PRES`), acordo de verba × meta na pré-temporada (`S.coFinAcordos`/`S.coFinAcordo`), 3 propostas de patrocínio (`S.coFinPatOps`/`S.coFinPatrocinio`), o que falta decidir antes do 1º jogo (`S.coFinPend`; sem decisão o auxiliar fecha normal + fixo em `S.coFinAuto`; `FIN_AC`/`FIN_PAT` no robô), empréstimo (`S.coLoanTake`/`S.coLoanPay`, parcela a cada 4 rodadas), degrau do vermelho `S.coFinStep` (venda forçada com 6 rodadas, `S.coValue`); números em `S.CO_FIN` |
| moedas (2026-11-09) | Moedas da conta (valem em todas as carreiras): carteira `U.COINS` em `ui/items.js` (`o.coins` no inventário: saldo, log, `once`; `U.COINS.add([{n,t,once}])`, `U.COINS.pill()` pílula da home `.hl-tops` e da Semana `.coin-pill.cp-sm`). Treinador: `S.coSeasonEnd` devolve `out.coins` (título 60/35/20 pela divisão `S.coLgDepth`, acesso 15, meta 5; números em `S.CO_COINS`, `coach.js`), `payCoins` em `ui/coach.js` soma uma vez (+30 na 1ª temporada da conta); metas da semana dão 2/3/5 (`PRIZE.m`, `profile.js`). Escolher clube (fase 2): `S.coClubPrice` (contínuo: 30 até força 60, +22 por ponto acima, `S.CO_CLUB_PRICE`; times comprados ficam no perfil `U.COINS.owns/own/clubs` e saem de graça depois; comprar exige conta logada `U.cloudStatus`), `S.coBuyList`, `S.coBuyClub` (marca `co.bought`), tela `escolher` em `coachland.js` (`.ec`, botão `#ldo-mo` nas Propostas), `U.COINS.spend`. Aporte (fase 3): `S.coAporte`/`S.coAporteLeft`/`S.coAporteValue` em `coachfin.js` (`S.CO_APORTE` 20 moedas = 1 semana da folha normal, até 10 por temporada, caixa e verba, `f.ss.apo` fora do saldo, bloqueado no vermelho). Loja (fase 4): `loja(tab, back)` em `coachland.js` (`.lj`, `PACKS`; abre pela pílula `#hl-coins`/`#sm-coins`, Finanças `#fn2-apo`, "Faltam N moedas"); compra real ainda "em breve". Compra real (fase 5): `craque/api/pay.php` (Mercado Pago Checkout Pro; status/create/hook/check/claim; tabela `purchases` no rank.sqlite; preço dos pacotes vale do servidor; status sempre conferido na API do Mercado Pago), token em `climbix-data/mp-token` gravado pelo deploy a partir do segredo `CLIMBIX_MP_TOKEN` (teste: TEST- ou APP_USR- de conta de teste, conferido em `/users/me`); cliente `U.payStatus/payCreate/payCheck/payBoot` em `cloud.js` (volta `?pago=ref`, soma uma vez com `once: 'pay-<ref>'`, aviso `.pay-ty`). Plano: doc https://claude.ai/artifact/28BJkQWhWrKaeat5LGhh7L |
| `coachmkt.js` | Treinador, mercado (lote 1 desde 2026-11-09, só olhar): jogadores dos outros clubes da temporada (`S.coMktPool`, dos elencos sorteados; a API de jogadores reais vai trocar só essa fonte) e 40 sem clube; filtros `S.coMktFilters`/`S.coMktSearch` (busca só com até `S.CO_MKT.max`=40), faixa contra o seu titular `S.coMktBand` (sem número; estreita a cada relatório `S.coMktReport`, a sua liga já vem com 1), palavra `S.coMktWord`, potencial e jeito `S.coMktPot`/`S.coMktTraits`, observados; estado em `co.mkt`. Telas em `coachland.js`: `mercado` (`.mk` filtros com ◀ ▶), `mercadoRes` (`.mkr` 4 por página), `ficha` (`.mkf`). Lote 2 (09/11): janela `S.coMktWin` (10 dias antes da 1ª rodada, 6 antes da rodada do meio; proposta e contrato gastam 1; sem clube a qualquer hora; o relatório do olheiro é pago do caixa desde 09/11: `S.coMktRepCost`, 1/4 da receita semanal `S.coFinBase` (mín. R$ 5 mil) x1, x1,5, x2,25, exterior x2), proposta `S.coMktOffer` (presidente `S.coMktPres` com humor e paciência 3, o que ele quer escondido `S.coMktAsk`, contrapõe a partir de 80%, pagamento 1x/2x/3x com parcelas em `co.fin.inst` a cada 4 rodadas via `S.coMktWeek`, jogador na troca), contrato `S.coMktContract` (humor do empresário a cada toque `S.coMktMood`, só o 4 assina; papel titular/rodízio/aposta em `p.role`; folha não passa do teto), telas `proposta` (`.mkp`) e `contrato` (`.mkc`) , janelinhas `resposta` (`.mkx`: aceitou, contraproposta que fecha direto, recusou, encerrou) e `fechado` (`.mkd`, lote 3); lote 4 (09/11, vender e renovar): propostas recebidas só com a janela aberta (`S.coMktInbox`, sorteadas quando ela abre, mais para quem está à venda `co.sell`/`S.coMktList`), negociação em rodadas como no FIFA (`S.coMktSellTry`: pedido, pagamento e % de venda futura, diretor com teto escondido, humor `S.coMktSellMood` e paciência 3; `S.coMktSellAccept`/`S.coMktSellReject`, recusar quem quer ir baixa a moral), a venda entra no caixa e metade vira verba (`M.sellVerba`; parcelas a receber `co.fin.recv`, % futura `co.fin.fut` paga na 1ª rodada de uma temporada seguinte), renovação `S.coMktRenew` no último ou penúltimo ano na tela `contrato` (Renovação); telas `recebida` (`.mkr2`, também na volta para a semana) e `negociar` (`.mkn`), Elenco com Renovar e Pôr à venda (`.lde2-act`); desde 09/11 o titular NÃO renova mais sozinho: contrato acabou, sai do clube como qualquer outro (`out.left` do mais forte ao mais fraco, com `tit` e `ovr`); a renovação conta os anos depois da temporada atual (`p.ct = anos + 1`); faltando 5 rodadas a semana abre uma vez por temporada a janelinha "Contratos no fim" (`ctWarn` em `coachland.js`, marca `co.ctw`; titulares de `co.xi` no último ano com menos de 36 anos, até 3 linhas, Ver elenco `#ctw-go` / Depois `#ctw-no`); o robô das ferramentas renova os titulares com `S.coAutoRenew` (`RENOVA=0` em `craque_treinador.js` mede sem renovar: meta 46% contra 54%); empréstimo fica para a fase 5; o robô não compra nem vende |

### Dados e textos — `craque/src/`

| Arquivo | O que tem |
|---|---|
| `data.js` | Ligas, clubes, seleções, características, podcasts (`D.MEDIA.shows`), `BR_2025`/`MOVES_2025`/`STR_2026`/`MOVES_2026` |
| `social-data.js` | Textos do X (`D.SOCIAL`: famosos, torcida, haters, `people`) |
| `social-events.js` | Post + comentário por opção de evento (`D.SOCIAL.ev[id]`) |
| `events-text.js` | Aberturas alternativas dos eventos |
| `names.js` | Nomes para sortear na criação, por país (`D.NAMES`, `D.randomName`); fora da tradução |

### Apresentação — `craque/src/`

`ui/livesim.js` (campinho ao vivo dos dois modos: cada estilo circula a bola do seu jeito por `patOf`/`dirOf` (paciência e ligação direta), jogadas com nome (tabela, terceiro homem, parede, ultrapassagem, inversão, saída de trás, ligação direta; contagem em `_state().PLAYS`), rastro dos passes e etiqueta; a chance do motor (`due`) joga pelo estilo antes do passe direto, com quem vai marcar esperando na linha (sem impedimento); ritmo: cada estilo troca `NEED`×paciência passes (`posN`) antes de forçar, lado fechado volta e troca de lado; sem a bola (fase 4): a linha sobe no passe para trás e recua com o meia deles livre (`LN`, `stepT`), pressão só no gatilho e na altura do estilo (lateral, passe para trás, de costas), contrapressão de 5 s pelo estilo e pela energia (`cpT`, `lostBall`), contra-ataque com os pontas correndo e o primeiro passe para a frente (`regClk`); nada disso aparece na tela; chute e goleiro (fase 5): `shoot` bate com o motor (`sim.shot` aceita gol/def/fora/trave/bloq; o Treinador manda a trave e o travado), o goleiro mergulha (`dive`, `dva` deitado), a defesa segura, espalma no rebote (2º chute de quem pega a sobra, `reb`) ou manda para escanteio (`sv`), o zagueiro trava na frente (`blk`), a trave treme (`post`), o goleiro sai no cara a cara e no cruzamento (`gkc` soco/segura), chute de longe só com espaço; zaga e área (2026-11-07: com a bola perto da área a linha entra nela e os volantes fecham a entrada, marcação do lado do gol a ~2,4 m e corrida acompanhada, quem está na bola fecha o chute; o ataque ocupa 1ª trave, 2ª trave e marca do pênalti e o ponta vai ao fundo; o gol do motor nasce de uma jogada `duePick` pelo estilo: corte para trás e cabeça pelo ponta em `wingPlay`, enfiada, drible, de fora; alvo: metade dos gols até 12 m), trocas pela regra (fase 6, `subQ`: `lineup` com número novo enfileira, espera bola parada, modo `troca` com a placa do quarto árbitro, quem sai corre para a linha mais perto, quem entra espera no meio e o jogo volta quando ele pisa no campo), túnel no meio da lateral de baixo (`tunnel`: intervalo e volta do 2º tempo); pênalti (bola parada fase 2, 2026-11-09: `sim.shot(side, out, cb, {sp:'pen', num})` vira `penStart` no modo `pen`: apito, vagas na entrada da área `PEN_EDGE` fora da meia-lua, goleiro na linha, o batedor pelo número, corrida e `penKick` com a saída do motor; câmera `camStep` aproxima 1,65× com o gramado listrado no canvas e volta depois do lance; `craque_campinho.js` não testa, teste em scratch); falta direta, falta cruzada e escanteio ensaiado tiveram animação (fases 3 e 4) e saíram em 09/11 (Silvio: "deixe só o pênalti"): `fkStart`/`ckStart` seguem no código sem uso; a chance com `sp` vira `e.spk` e a jogada combina com a narração (`duePick`: escanteio e falta cruzada de cabeça pelo cruzamento, também quando não entram; falta direta de longe); volta do 2º tempo correndo (`back`); o cartão vai para o `num` que o motor manda (`foulStep`, nunca em quem conduz); o goleiro sai na bola lançada que alcança primeiro (`fly`); bonecos em `DOTK` 0,65), `kick.js` (pênalti/falta), `defend.js` (goleiro, zagueiro, meia), `livre.js` (Jogo a Jogo: lances de movimento livre vistos de cima, analógico e botão fixos embaixo; `S.LIVRE`, `S.livreK`), `cine.js` (câmera e efeitos; `?cine=0`
desliga), `chars.js` (personagens SVG dos minigames), `avatar.js` (jogador da criação, `c.look`),
`card.js` (carta em canvas), `trophies.js`, `ball3d.js` (bola 3D da tela inicial), `kits-real.js`
(uniformes reais), `sound.js` (Web Audio), `errors.js` (envia erros ao servidor).

### Telas — `craque/src/ui/` (uma tela ou grupo por arquivo)

| Arquivo | Tela |
|---|---|
| `core.js` | Estado `G`, ajudantes, salvar/carregar, barra do topo |
| `start.js` | Tela inicial e criação do jogador. **Home deitada** (`homeLand`, desde 2026-11-06 a home é sempre deitada no palco `U.LD`: trilho; desde 2026-11-08 **enxuta** (Silvio: pouco texto, sem trilho nem barra de outra cor, botões sem desenho à esquerda): logo, botão dourado `.hl-go` (continuar a última carreira, ou Jogar), os 4 modos `.hl-md` só com o nome (sem carreira começa no toque; com carreira abre a janelinha `landMode`), linha leve `.hl-mr` com Carreiras/Ranking/Perfil/Ajustes; vagas cheias em `landPick`); em pé pede para girar. Modos ainda em pé (carreira do jogador, Relâmpago) ligam `U.portMode` e, com o celular deitado, `render()` mostra "Gire o celular" (`.port-turn`, nunca no computador). Robôs de teste (`navigator.webdriver`) ficam na home em pé; `localStorage['climbix-deitado']='1'` liga a deitada (`U.landOk`). **Link só do Treinador** (2026-11-08, amigos avaliando a simulação): `?so=treinador` grava `climbix-so` e a home fica só com o dourado (Treinador), o botão das carreiras do Treinador e Ajustes (`U.soCo`, `.hl-so`); `?so=tudo` volta. **Desde 2026-11-09 a home mostra só Treinador e Jogador** (`LAND_ORDER`; Jogador desabilitado em carvão com a etiqueta vermelha torta "Em breve" no canto, `.hl-md small`; Treinador creme, botões de 84 px com relevo; Rápida, Rumo ao Topo e Relâmpago fora da home, código mantido; Continuar só olha o Treinador). **Ranking fora da 1.0** (2026-11-09): `RANK_ON = false` em `start.js` tira o Ranking da home e da barra de baixo; tela e `rank.php` continuam no código |
| `offers.js`, `preseason.js` | Base, janela/propostas; pré-temporada |
| `match.js` | Eventos e jogo decisivo (`optHint`) |
| `season.js` | Temporada: contadores, corrida/mini tabela (`raceOf`, `miniTable`), resenha, resumo |
| `fullseason.js` | Carreira Completa (`c.mode = 'completa'`): a liga rodada a rodada antes do resumo |
| `worldcup.js`, `finale.js` | Copa do Mundo; fim de carreira e próxima meta |
| `paper.js`, `social.js` | Jornal; posts no X (`commentsOf`, `person`) |
| `walkout.js`, `album.js`, `cardview.js` | Revelação de carta, álbum, carta 3D compartilhada |
| `items.js`, `packs.js` | Itens/pacotinhos (inventário, sorteio), abrir pacote, sequência de dias |
| `collection.js`, `trophyroom.js`, `achievements.js` | Coleção, Sala de Troféus, conquistas |
| `cloud.js`, `ranking.js` | Conta e save na nuvem; ranking online. **Conta deitada** (2026-11-10, quadro 54): com a home deitada (`LAND()`), entrar, criar conta, conta aberta, senha e primeiro acesso do Google saem no palco `U.LD` por `land(backId, sub, cartão, lado)` (`.cnta` com filhos `.ct-*`: cartão creme à esquerda, apoio à direita), com os mesmos ids da tela em pé; `U.cloud(modo, msg, ok, back)` leva o Voltar para `back` (os Ajustes) ou para a home. Campo de texto no palco: `U.LD.lift(raiz)` (em `coachland.js`) sobe a tela até o campo focado ficar no topo, acima do teclado do celular (só em toque) |
| `sheet.js`, `settings.js`, `tips.js`, `training.js` | Ficha do jogador, configurações, dicas, treino. **Ajustes deitados** (2026-11-09): `U.settingsLand(back)` em `settings.js`, tela `.aj` no palco `U.LD` aberta pela home deitada (Som, Sua opinião, cartão creme da conta); Vibração, Efeitos 3D, "Na partida", Treinar lances e Novidades só valem no Jogador e ficam na janelinha em pé `U.settings()`, que os modos em pé ainda abrem. Botão dentro do palco: `.ld-st button:not(.btn)` zera a fonte, então o seletor precisa ser `.ld-st button.classe` |
| `profile.js` | Perfil. **Perfil do técnico deitado** (2026-11-10, quadro 53): `U.profileLand(back)` no palco `U.LD` (`.pft`: cartão creme do nível com nomes de técnico `RANKS_CO`, 3 metas da semana com moedas, à direita Como técnico, Último título e Seus times). Metas do Treinador em `GOALS_CO` (13; uma por dificuldade, moedas 2/3/5 e XP 100/200/300 de `PRIZE`, sem pacotinho; `JOG_ON = false` sorteia só as do Treinador, as do Jogador `GOALS` voltam com o modo; `cut` zera as metas "seguidas"; `ok` tira "Suba de divisão" de quem está na elite). Ganchos em `ui/coach.js`: `U.profileCoGame(co, m, log, aux)` no fim do jogo (só jogo comandado anda meta; `m.pfp` = posições antes do jogo) e `U.profileCoSeason(co, out)` no fim da temporada (XP `coXp`, marca `out.profPaid`); aviso `.pay-ty` "Meta cumprida". Números do técnico de todas as carreiras em `prof.co` (`{t, v, s, last}`, no inventário e na nuvem; `merge` em `items.js` fica com o maior). A home deitada abre essa tela no Perfil e não tem mais Carreiras (`MINE_ON = false` em `start.js`); o Perfil em pé `U.profile()` segue no código para o Jogador |
| `daily.js`, `challenge.js`, `feedback.js`, `desktop.js` | Carreira do dia, desafio por link, opinião, mouse/teclado. **Sua opinião deitada** (2026-11-10, quadro 55): `U.feedbackLand(back)` no palco (`.op`: carinhas, 6 assuntos do Treinador `LIKES_CO`, Sim/Talvez/Não, um campo de texto que vai em `more`); assunto novo entra também em `$LIKES`/`$LIKE_TXT` do `api/feedback.php`. **Fora da 1.0:** Novidades (`whatsNew` só na home em pé) e o botão dos pacotinhos da home deitada (`PACKS_ON = false` em `start.js`) |
| `install.js` | Tutorial de instalar como app (folha `.ins`, chave `climbix-instalar-v1`, teste `?instalar=ios\|ios18\|ipad\|android`): só no navegador do celular (nunca no app instalado, no computador nem em portal). Desde 2026-11-10 `homeLand` chama `U.installHomeBind()`: na home deitada a folha abre com o celular **em pé** (por cima do "Gire o celular") ou em tela alta (iPad, `fits()` ≥ 500 px); deitado ela espera, e girar com ela aberta fecha sem contar como "Agora não". O lembrete `.ins-chip` só existe na home em pé |
| `coachland.js` | **Caderno escondido desde 2026-11-09** (`const CAD = false` no topo: some da semana, do trilho, do resultado e da tática; o motor segue anotando em `co.cad`; o Silvio quer outro formato, sem matriz, antes de voltar). Treinador **deitado** (padrão desde 2026-11-06): palco fixo `#ld` 844×390 escalado por `--ldk` (desde 2026-11-09 sem faixa de outra cor: o conteúdo é sempre 816×366 como nos desenhos, `fit()` lê a área segura do entalhe no padding do `#ld`, diminui a escala até caber entre os dois lados e aumenta o palco `.ld-st` com a sobra (`--ldw`/`--ldh`/`--ldpx`/`--ldpy`) para fundo e popup irem de ponta a ponta; nada de `env(safe-area…)` dentro do palco; no iPhone instalado deitado não há a faixa do topo; em pé só mostra "Gire o celular"; no Android trava deitado com `screen.orientation.lock`), trilho à esquerda, popups dentro do palco (`pop`). `coach.js` entrega cada tela a `U.LD` quando `U.LD.on()` e expõe ajudantes em `U._co`. Telas: semana (enxuta desde 2026-11-08: `.sm`, sem trilho; linha com posição, forma, meta e diretoria, o próximo jogo com os dois escudos, treino e olheiro embaixo, à direita Time/Tabela/Caderno/Clube com `data-rail` e o dourado Jogar), time (enxuta desde 2026-11-08: `.tm`, sem trilho, campo grande com `spotsT` e banco embaixo, banco em ordem de posição (`benchSort`), troca arrastando o reserva até o titular (`benchDrag`, também na parada ao vivo) ou tocando nos dois, sem lista; formação e estilo com ◀ ▶ `data-tmk` e os bonecos correm para as vagas novas, auxiliar num botão com aviso laranja; anel de energia `conic-gradient` com `--en` nos titulares e no banco; funções, batedores), funções e batedores (enxutos desde 2026-11-09: `.fb2` com Funções/Batedores no topo; `.fu2` campo com nome e função, verde à frente e azul atrás, cartão creme com as 3 funções, Defesa/Meio/Ataque ▼ — ▲; `.bt2` 6 quadros e o cartão com os 5 melhores e 1º/2º/3º), treino e olheiro (enxutos desde 2026-11-09: `.tr2` 4 abas e 4 treinos com nome e energia, auxiliar num botão; `.ol2` campo deles com os números, 3 descobertas que acendem o jogador, ? com o aviso), tática (abas 4/3/5 atrás e ★ favoritas), resultado (enxuto desde 2026-11-09: `.rs`, placar grande com a palavra, abas Números (6 linhas)/Quem mandou/Lances num painel escuro, à direita o melhor do time, Tabela/Diretoria/Caderno e o botão Notas do time; o caixa fica no Clube), ao vivo (`liveHtml`/`livePaint`/`liveStop`; campo limpo desde 2026-11-07: em cima do campinho só o placar, no painel o último lance, quem manda, gritos e Números, o auxiliar só no Parar e mexer, `LP.sim({clean})` sem nome da jogada nem anel do duelo; gritos, conversa do intervalo; a parada `liveStop` desde 2026-11-09 é o campo da escalação em tela cheia `.ldl-full`/`.ldl-tm`: anel de energia e amarelo, toque titular + banco troca (`x.sub`), dois titulares trocam de lugar (`x.swap`), formação/estilo ◀ ▶ direto no motor e anotados uma vez no Seguir (`x.tacLog`), auxiliar num botão com as etiquetas e a troca sugerida por cima `.ldl-ov`; o gol não para o jogo e todo jogo começa no 1×), preleção (enxuta desde 2026-11-09: `.pl2`, o tom numa régua calmo/pelo grupo/forte com ◀ ▶ e 3 pontos `data-pk`, o que ganha e perde, clima à direita), resultado com notas (o Continuar vai direto para a semana desde 2026-11-09: sem a tela da segunda-feira; `segunda(log)` só salva e abre a semana, com a conversa de quem está chateado por cima), caderno, tabela (enxuta desde 2026-11-09: `.tb2`, sem trilho, abas Classificação/Gols/Artilharia/Rodadas, J/SG/PTS/forma com letra maior, à direita a corrida com a meta e os 3 próximos), clube (enxuto desde 2026-11-09: `.kb2`, 4 blocos com um número: Finanças, Elenco, Troféus, Hall; diretoria e presidente à direita), finanças e banco (enxutos desde 2026-11-09: `.fn2` 3 números grandes, abas Temporada/A seguir/Salários, à direita situação do caixa com 4 tracinhos, acordo, patrocínio e o dourado Banco; a aba Decidir saiu; `.bk2` valor com ◀ ▶, juros/parcela/total, os degraus do vermelho no ?), elenco (enxuto desde 2026-11-09: `.lde2`, abas Goleiros/Defesa/Meio/Ataque, tabela com número, idade, geral e contrato que rola por dentro, cartão do jogador à direita com energia, potencial, moral, salário e o Renovar `#lde-ren` data-id, apagado até a renovação do mercado), temporada, propostas (enxuta desde 2026-11-08: `.pzo`, escudo, nome, liga e a meta numa etiqueta); reunião com a diretoria e patrocínio (`.acd`: frase do presidente, 3 cartões com valor e 3 linhas, regras no botão ?) |
| começo da carreira (2026-11-09) | Treinador, primeira carreira do aparelho (`climbix-co-ja` + sem save; `co.first` e `co.tut` criados em `create`, `ui/coach.js`): assinou, cai na Semana (a escalação não abre mais sozinha, em nenhuma carreira); na 1ª temporada da primeira carreira o auxiliar fecha diretoria e patrocínio (`S.coFinAuto` no `welcome`). Tutorial opção B em `coachland.js` (`TUT`, `tutStep`, `tutShow`; `.tu`, `.tu-hole`, `.tu-bub`): a Semana escurece, o auxiliar fala e só o alvo fica aceso (o furo é um botão que repassa o toque); semana 1 Time, Treino, Olheiro, Jogar; semana 2 Tabela, Clube; semana 3 Mercado; Pular ou dicas desligadas (`climbix-dicas-v1`) apagam. Propostas pelos seus: a janela do começo vale até a rodada 3 (`S.CO_MKT.preR`), em clube novo (`co.since`) só aparecem na 3ª semana (`incFrom`; quem você pôs à venda recebe na hora, `o.ask`), uma janelinha sozinha por semana (`m.popK`) e o resto no aviso do botão Mercado. Dica do auxiliar por jogo no topo do Time (`.tm-tip`, opção A; o botão Auxiliar saiu da coluna): `S.coTip` (estilo pelo `S.coHint` ou formação pelo confronto real com o seu elenco; `co.tip`), `S.coTipLbl/coTipTxt/coTipUsed`; acerta sempre nos 3 primeiros jogos da carreira e depois 4 em 5 (`S.CO_AUX_ACC`, `S.CO_AUX_SURE`). Canvas: https://claude.ai/artifact/KhbWrwi5vdJpY5aBeRH6pF |
| `coach.js` | Modo Treinador (save `climbix-treinador-v1`): criação (deitada e enxuta desde 2026-11-08: `.tcr`, nome com bandeira que abre a grade de países, seletor do começo), propostas, central do clube, time (campo, formação, estilo, confronto em setas e palavras), partida ao vivo (`live`: campinho, faixa de quem manda `U.lvMom`, 1×/3×/⏩ e "Parar e mexer", trocas arrastando no campinho, tática; `co.live` no save faz o auxiliar terminar o jogo largado), resultado (com "Anotado no caderno"), caderno do técnico (`caderno`: abas Estilos/Formações/Rivais, anotação aberta; bloco "Do seu caderno" em `U.coCaderno` e na tática ao vivo), fim da temporada |

### Servidor — `craque/api/` (PHP + SQLite fora do `public_html`)

`account.php` (contas), `oauth.php` (Google/GitHub/Discord), `rank.php`, `c.php` (link curto da carta),
`feedback.php`, `errors.php`, `stats.php` (contagem anônima por dia, sem id; o jogo manda por `src/stats.js`). Nada pessoal é guardado além da conta. Cada opinião nova vai por e-mail (HTML) para o Silvio pelo `mail()` da Hostinger (`FB_EMAIL` em `feedback.php`; `climbix-data/feedback-mail-id` = último id mandado; o deploy chama `?a=mail` para mandar o que ficou para trás).

### Ferramentas que geram arquivos

| Gera | Ferramenta |
|---|---|
| `craque/sw.js` + versões `?v=` no `index.html` | `python3 tools/craque_sw.py` |
| `craque/src/kits.js` | `node tools/craque_kits.js` (com o `http.server` rodando) |
| `craque/badges/*.png` | `python3 tools/craque_badges.py` (só os que faltam; conferir visualmente) |
| `craque/trophies/` + `trophy-imgs.js` | `tools/craque_trophies.py` → `tools/craque_trophies_resize.js` |
| `craque/assets/tw/` (emojis) | `node tools/craque_twemoji.js` (rodar ao usar emoji novo, depois `craque_sw.py`) |
| `craque/assets/co/` (Treinador: logos `pat-<nome>.webp`, `rosto-NN.webp`, `banco`, `tv`) | arte do ChatGPT (doc https://claude.ai/artifact/AinuvFC9Mc3BA3jCXztPvV), recortes em `/mnt/project-files/climbix/treinador-assets/recortes/`; nomes dos patrocinadores em `S.CO_SPONS` (`coachfin.js`), por país da liga |
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
- **Palco deitado no iPhone é mais estreito:** `.ld-st` perde a área segura dos dois lados (47 px no iPhone comum, 59 no
  Pro Max), então sobram ~750 px, não 844. Nada de `position: absolute` com `left`/`width` fixos nas telas: põe no fluxo
  (flex/grid). Testar com `.ld-st{padding-left:47px!important;padding-right:47px!important}` (as ferramentas rodam sem área segura).

## Guia visual

Tema: gramado à noite (`--pitch`), cartões de papel creme, ouro para a ação. Painéis, tabelas, placar e barra do topo são
carvão opaco (`--panel` #141517, `--board`; bloco no fim do `style.css`), não verde translúcido: o verde fica no fundo e
nos campinhos (Silvio, 2026-11-06: "está muito verde"; ele recusou trocar o fundo). Regra nova usa as variáveis do topo do
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
