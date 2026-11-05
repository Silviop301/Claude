# Evolução contínua do Climbix

Acompanhamento do processo de `docs/prompt-mestre-evolucao.md` (como rodar: seção "Evolução contínua" do `CLAUDE.md`).
Cada rodada acrescenta uma entrada no Registro e atualiza o Diagnóstico e o Roteiro.

## Plano em andamento: Jogo a Jogo e Modo Treinador (2026-10-31)

**Toda rodada do ciclo agora pega só o próximo item da fase em andamento.** O plano completo, com as respostas do
Silvio, está no doc "Plano da atualização: Jogo a Jogo e Modo Treinador" (https://claude.ai/artifact/UxvwGePFjmXLfwcHYt62ta).
Ideia nova não entra no meio: vai para a lista "Depois do plano" do doc. Uma parte = um PR com base no branch de deploy,
direto no ar depois da validação. Carreira Rápida e Relâmpago estão congeladas (só correção de erro real do site).
Fim de cada fase: relatório ao Silvio e 2 ou 3 perguntas curtas para a turma (progrediu e se divertiu? o que irritou? o que faltou?).

| Fase | Pronto quando | Estado |
|---|---|---|
| 0 · Preparar | Os números chegam ao servidor (`api/stats.php`, `src/stats.js`, `tools/craque_numeros.py`) e quem joga o Jogo a Jogo vê o aviso do save novo | no ar (PR #108) |
| 1 · Ritmo e partida | Temporada em ~1 h no simulador e pela interface; um cartão principal por tela (regra "Tela limpa", fotos antes/depois); faixa de progresso em todo jogo vivido; **o save do Jogo a Jogo recomeça aqui, uma vez só**; metas da semana trocam e o XP do perfil vem por temporada | **no ar** (PRs #109 a #114): jogos vividos/resumidos/banco, lance em todo jogo, tela limpa, rodada como na TV, faixa "Seu ano", metas da semana e XP por temporada. Tempo real do ano a medir pela contagem (o Silvio pediu para não cortar pelo previsto) |
| 2 · Celular com pessoas | Nenhum convite com clique óbvio na auditoria; 20 temporadas sem convite repetido demais | **no ar** (PRs #116 a #119): pessoas do celular e Chat, um treino por semana e convites (segura, arriscada, sem resposta), histórias que voltam, repercussão no X, na TV e no jornal |
| 3 · Dinheiro com risco | No simulador, 15% a 25% das carreiras passam por aperto e menos de 5% terminam quebradas | **no ar** (PRs #130, #132, #133 e a parte 4): aperto 16–18%, devendo no fim 3% |
| 4 · Mercado em duas janelas | Trocar de clube no meio do ano não quebra calendário nem tabela | **no ar** (PRs #135, #136 e a parte 3): janela do meio do ano, troca de clube, sondagens, empresário, aumento, pedido de saída e empréstimo |
| 5 · Seleção | Copa do Mundo e torneio do continente passam inteiros, jogo a jogo, nas carreiras pela interface | **no ar** (PRs #138, #139 e a parte 3): torneio do continente, convocação pelo celular, concentração e um jogo por tela, seleção no jornal |
| 6 · Metas, legado e Hall da Fama | Toda carreira termina no Hall da Fama, com pontos de legado no lugar da nota S a D | **no ar** (PRs #141, #142 e a parte 3): metas do ano, legado no lugar da nota, Seu Hall, ranking por legado e Amigos |
| 7 · Treinador v1 | O robô técnico joga 10 temporadas no simulador, com títulos e demissões numa faixa realista | em andamento: parte 1 (motor), parte 2 (telas + tática de verdade), parte 3 (partida ao vivo), parte 4 (caderno do técnico) |
| 8 · Treinador v2 | No simulador, nenhuma tática ou instrução vence em todos os casos | |
| 9 · Do jogador ao técnico | Uma carreira passa de jogador a técnico levando a história e os títulos | |

Regras que valem em toda fase: depois da fase 1, toda parte traz migração do save (a carreira continua de onde parou);
cada jogo vivido termina com uma faixa de progresso visível; telas limpas (um cartão principal, um botão dourado).
Linha de base: `python3 tools/craque_numeros.py` (novos, D1, D7, sessões por modo e duração, carreiras por modo e até
que temporada chegam). Metas em número só depois de duas semanas de contagem.

## Diagnóstico dos seis pilares (2026-10-29, versão no ar 88a9d26 / sw craque-89e222da)

| Pilar | Estado | Maiores oportunidades |
|---|---|---|
| 1 Técnica | Sólido. 0 problemas em 32 carreiras pela interface, 0 erros de console em 150 fotos, nenhum erro real novo no site. | Recarregar no meio da temporada ao vivo pula o resumo. Desempenho em 4G lento não medido. |
| 2 UI/UX | Bom no celular (390 e 360). No computador sobra espaço vazio em várias telas (ranking, resumo da temporada, ficha). | Telas de computador com composição pensada, não só a do celular esticada; fim de carreira longo. |
| 3 Arte | Tema forte (gramado à noite, papel creme, ouro). Personagens simples; ajuste de SVG em código já foi recusado (precisa arte nova). | Arte nova de personagem em sistema modular; momentos grandes (título, Bola de Ouro) com mais celebração visual. |
| 4 Gameplay | Equilíbrio no alvo (S10/A26/B32/C19/D14, ~9,5 min). Decidir bem vale só +6 a 8% de pontos; 41% dos textos de evento se repetem em 32 carreiras; 59% das carreiras sem carta especial; vereditos "Rei do Brasileirão" e "Promessa que não vingou" quase nunca saem. | Escolhas com consequência que se sente; meio de carreira com mais variedade; mais textos de evento. |
| 5 Inovação | Já existem rival, ganchos, Relâmpago, desafio por link, coleção. | Algo que torne a carreira pessoal e memorável (ex.: objetivo pessoal escolhido no começo, momentos que voltam). |
| 6 Validação | `tools/craque_ciclo.sh` junta tudo num resumo; `craque_lint_textos.py` caça plural/contração/placeholder. | Validar com jogadores reais (opinião no jogo, ranking). |

## Direção (Silvio, 2026-10-29)

Amigos enjoaram depois de algumas carreiras. O Climbix deixa de ser só a carreira de um garoto dos 16 aos 36 e vira
um jogo de futebol com vários modos e motivo para voltar: Carreira Rápida (a de 9 min), Carreira Completa (jogo a jogo,
tabela inteira), Relâmpago e Modo Treinador (usa o motor de liga de `engine/fixtures.js`), com uma progressão que fica
entre os modos (perfil com nível, metas da semana, temporada de ranking, liga entre amigos). Ordem escolhida pelo Silvio:
Completa → perfil e metas → Treinador. O perfil traz o mapa "Domínio mundial" (ideia do World Soccer Champs): cada
continente com a % de troféus já ganhos ali, somando todos os modos, para dar a meta longa de zerar o jogo. Isso passa à frente das rodadas de polimento abaixo.

**Visual original (Silvio, 2026-10-29):** o jogo não pode ter cara de "feito por IA". Sinais a tirar: emoji como ícone em
quase toda linha, rótulo pequeno em caixa alta sobre cada título, cartões arredondados com sombra suave todos iguais.
Direção a propor: cultura impressa do futebol brasileiro (álbum de figurinha, ingresso, jornal esportivo, placar de
estádio, carimbo), ícones próprios no lugar dos emojis, formato próprio por tela. Prancha antes/depois para o Silvio
aprovar antes de mexer no jogo; entra logo depois da Carreira Completa.

**Mais perto do real e texto sem cara de IA (Silvio, 2026-10-29):** o que os amigos mais gostaram foi o X e os
podcasters, porque reconhecem. Telas em formatos conhecidos (tabela igual à da TV). Revisar todo o texto do jogo para
tirar frase certinha, "não é X, é Y", trios, bordão em toda linha; mais curto, torto, com gíria. Junto da rodada visual.
Proibido também: cartão com faixa colorida na lateral.

## Roteiro (rodadas menores e verificáveis)

1. **Técnica + validação** (feita, abaixo): ferramenta do ciclo, bugs de texto, tela de personalizar no computador.
2. ~~**Gameplay: decisões que pesam.**~~ (feita, abaixo) Medir por evento quanto cada escolha muda a carreira (`craque_decisoes.js`),
   reforçar as de efeito invisível e mostrar a consequência quando ela volta. Meta: decidir bem ≥ +12% sem mudar a
   distribuição de notas.
3. ~~**UI/UX no computador:**~~ (feita, abaixo) resumo da temporada, ranking e ficha sem buracos; fim de carreira mais curto.
4. ~~**Gameplay: escolhas que voltam.**~~ (feita, abaixo) Mais aberturas de evento e eventos que só aparecem em fases certas.
5. **Inovação:** uma ideia nova de carreira pessoal, proposta ao Silvio antes (muda a proposta do jogo).
7. **Organização do código (pedido do Silvio, 2026-10-29):** checagem de tipos do TypeScript no JS atual
   (`// @ts-check` / `tsc --checkJs`, sem trocar de linguagem), dividir os arquivos acima de 100 KB e tirar
   duplicação. Entra no pilar técnico a cada rodada, aos poucos, sem mudar o jogo.
6. **Arte:** direção nova para personagens (precisa arte nova; propor caminho e custo antes de executar).

## Registro

### Rodada 1 · 2026-10-29 · Técnica e validação (pilares 1, 2 e 6)

- **Diagnóstico:** simulador no alvo; decisões 0 alertas; estilos 0 alertas; 32 carreiras no celular e 8 no
  computador sem problemas; fotos em 390×844, 360×640 e 1440×900; erros reais do site só avisos de 3D sem WebGL no
  iPhone (a bola cai para 2D, esperado).
- **Implementado e testado:**
  - Personalizar visual no computador: a metade esquerda ficava vazia; agora o jogador grande fica à esquerda e as
    opções à direita (foto antes/depois em 1440×900 e 1024×768).
  - X: título vindo do banco (1 jogo, nota 6,2) gerava "1 jogos … Números de elite"; plural certo e sem página
    elogiando números quando a temporada teve menos de 10 jogos ou nota abaixo de 7.
  - Plurais "1 gols" no Relâmpago e nas Copas do fim de carreira; 5 textos sem tradução no inglês.
  - `tools/craque_ciclo.sh` e `tools/craque_lint_textos.py` (testados: rodada rápida 0 problemas, 0 textos suspeitos).
- **Pendências (decisão de design, de 2026-10-28):** recarregar durante a temporada ao vivo pula o resumo; Tab preso e
  Espaço/Enter na abertura do lance; nomes longos de uma palavra no placar da Copa.
- **Próxima:** rodada 2 (decisões que pesam), porque é o pilar de maior peso e o número mais fraco do diagnóstico.

### Rodada 2 · 2026-10-29 · Gameplay: decisões que pesam (pilar 4)

- **Diagnóstico:** decidir bem rendia ~6,5% a mais de pontos que decidir ao acaso (1.500 carreiras por modo), e o
  efeito de uma escolha só aparecia dentro de "Detalhes da temporada", fechado. A escolha era sentida pouco.
- **Oportunidades pesadas:** (a) apostas mais fortes (`S.STAKE_K/LOSS`) · esforço baixo, risco de inflar notas;
  (b) mostrar o que as escolhas renderam no resumo · esforço baixo, impacto direto na percepção; (c) mais ganchos que
  voltam temporadas depois · esforço alto (fica para depois). Selecionadas: a + b.
- **Implementado e testado:**
  - `S.STAKE_K` e `S.STAKE_LOSS` 2 → 3: ganhos e perdas das decisões 50% maiores (ex.: forma +10% vira +15%).
  - Recalibração: `S.GRADES` 1890/1330/905/675 e limiar da Bola de Ouro 103 → 105 (`engine/season.js`).
  - Resumo da temporada: linha "🎯 Suas escolhas no ano: +15% de minutos · +2 gols" (verde ganho, vermelho perda),
    calculada no motor (`src.choiceMin`, `src.choiceGoals`) com as mesmas contas dos detalhes. Some quando é zero.
  - `craque_sim.js` agora imprime os cortes de nota que dariam a distribuição alvo (recalibrar fica de uma rodada só).
- **Validação:** notas S11/A26/B32/C18/D13 (alvo S11/A26/B31/C19/D13), Bola de Ouro 23,5% (antes 22,4%),
  duração 9min46s (antes 9min34s); decidir bem vs ao acaso 7,9 a 9,0% em duas rodadas de 1.500 (antes 6,1 a 7,6%);
  decisões 0 alertas; estilos 0 alertas; 8 carreiras pela interface 0 problemas; a linha apareceu em 40 resumos
  (24 ganhos, 16 perdas).
- **Revisão crítica:** o ganho em número é modesto (+2 pontos percentuais); o que mais muda é ver a consequência no
  resumo. Subir mais as apostas (K=4 daria ~11%) inflaria a Bola de Ouro e deixaria perdas de −60% de minutos comuns.
- **Pendências:** meta de ≥ 12% não alcançada só com apostas; o próximo passo para isso é a (c), ganchos que voltam.
- **Próxima recomendada:** rodada 3 (UI/UX no computador), para alternar de pilar; a (c) entra na rodada 4.

### Rodada 3 · 2026-10-29 · UI/UX no computador (pilares 2 e 6)

- **Diagnóstico:** fotos de todas as telas em 1280×720 (o notebook mais comum) e 1440×900. Achado principal: a
  pré-temporada no computador tinha perdido as 2 colunas (carta por cima das escolhas, coluna esquerda vazia). Era
  regressão da rodada 1: a regra nova do "Personalizar visual" (`:not(:has(...))`) ficou mais forte que a regra que
  põe a carta na coluna 1. As fotos da rodada 1 eram só da tela mexida, por isso não pegaram.
- **Implementado, testado e publicado:** correção da pré-temporada (PR #74, no ar); `tools/craque_telas_diff.py`
  compara duas rodadas de fotos e mostra lado a lado o que mudou; regra no `CLAUDE.md`: depois de CSS, refazer as
  fotos de todas as telas.
- **Revisão crítica:** fora a regressão, as telas no computador estão em ordem (2 colunas na criação, pré-temporada,
  temporada, evento, janela; modais centrados). A ficha tem altura fixa de propósito (as abas não pulam); o ranking
  só parece vazio sem internet. Ganho adicional aqui seria pequeno, então a rodada fecha.
- **Limite conhecido:** a carreira das fotos pode se separar depois dos primeiros lances, então da Copa em diante a
  comparação mostra outra carreira, não regressão.
- **Autonomia:** desde 2026-10-29 o Silvio autorizou Claude a publicar sozinho depois de validar.
- **Próxima recomendada:** rodada 4, gameplay: escolhas que voltam temporadas depois (ganchos) e variedade no meio
  da carreira, o caminho para decidir bem valer ≥ 12%.

### Rodada 4 · 2026-10-29 · Gameplay: escolhas que voltam (pilar 4)

- **Diagnóstico:** em 600 carreiras, ~14 eventos por carreira e só ~1 escolha voltava depois como consequência
  (gancho). Os eventos mais comuns sem continuação: provocação do rival, equipe particular, fisgada, clube não vende.
- **Implementado e testado:** 4 continuações novas em `engine/events3.js` (`v_revanche`, `v_staff`, `v_recaida`,
  `v_ficou`), cada uma com uma opção arriscada e uma segura, lembrando a escolha antiga ("Há 2 temporadas, você...").
  Textos traduzidos no inglês.
- **Validação:** ganchos que voltam por carreira 0,99 → 1,37; decidir bem vs ao acaso 11,1% (antes 7,9 a 9,0%);
  notas S11/A26/B32/C18/D13 sem recalibrar; Bola de Ouro 24%; 9min46s; decisões 0 alertas; carreiras pela
  interface no celular e no computador 0 problemas; foto dos eventos novos.
- **Revisão crítica:** é a mudança que mais mexeu no "decidir bem" até aqui e conta história. A meta de 12% está
  perto (variação de ±1 entre rodadas do simulador).
- **Próxima:** Carreira Completa (modo novo, escolhido pelo Silvio em 2026-10-29): temporada de liga jogo a jogo com
  a tabela inteira, ao lado da carreira de 9 minutos.


### Rodada 5 · 2026-10-29 · Carreira Completa, primeira parte (pilares 4 e 5)

- **Pedido:** carreira mais longa e com mais detalhe, jogo a jogo e com a tabela inteira, como modo novo ao lado da
  carreira de 9 minutos (escolha do Silvio).
- **Implementado e testado:**
  - `engine/fixtures.js` (`S.fullSeason`): turno e returno, placar de todos os jogos e tabela rodada a rodada que
    termina com a mesma posição e o mesmo campeão da temporada simulada (o equilíbrio continua o do motor). O jogo do
    lance decisivo de título/acesso vai para a última rodada, com o resultado do lance. Ligas com menos de 20 times
    completam com clubes reais da divisão de baixo. Seus jogos, gols, assistências e nota repartidos rodada a rodada.
  - `ui/fullseason.js`: seu jogo da rodada (placar com escudos, sua linha), seus números na liga, outros jogos e a
    tabela inteira com zonas (quadradinho colorido na posição, como na TV). "Próxima rodada", "Avançar 5" (para no jogo
    do lance decisivo) e "Até o fim"; depois o resumo da temporada de sempre. No computador, jogo à esquerda e tabela
    à direita.
  - Escolha "Modo: Rápida · 9 min / Completa · jogo a jogo" na criação do jogador; `craque_e2e.js` com `MODO=completa`.
- **Validação:** 2.218 temporadas no Node: posição e campeão iguais aos do motor em 100%, ~50 ms por temporada;
  simulador sem mudança (S11/A26/B33/C17/D13, 9min46s); carreiras pela interface: 8 Completas no celular, 4 no
  computador e 8 normais, 0 problemas; textos 0 suspeitos; fotos de todas as telas antes/depois no celular e em
  1280×720 (só mudaram telas de animação e carreira que se separa, além da criação com o Modo); fotos da tela nova em
  390, 360, 1280×720 e 1440×900.
- **Revisão crítica:** a tabela e os placares convencem; aos 16 anos quase todas as rodadas dizem "Você não jogou"
  (é o que acontece de fato, e dá para pular). Ainda não tem copas, janela no meio do ano nem decisões espalhadas
  pela temporada; é a próxima parte do modo.
- **Próxima:** perfil com metas e mapa "Domínio mundial" (ordem do Silvio), prancha da identidade visual e revisão dos textos.

### Rodada 5b · 2026-10-29 · Rodada ao vivo (pedido do Silvio: "parecido com o Brasfoot")

- **Implementado e testado:** cada gol de cada jogo tem minuto (`ev` em `S.fullSeason`; os seus gols e assistências
  marcados; o gol do lance decisivo convertido sai no fim). "Jogar a rodada N" passa a rodada ao vivo: relógio de 0' a
  90' (+ acréscimos), intervalo, placar do seu jogo no quadro escuro com os lances ("Gol de <você>!"), os outros jogos
  mudando de placar (o jogo com gol acende) e a tabela mudando junto. "Mais rápido" (~4 s por rodada; normal ~10 s) e
  "Fim da rodada". "Avançar 5" e "Até o fim" pulam sem ao vivo e param antes do jogo decisivo para ele ser jogado ao vivo.
- **Validação:** 8 carreiras Completas no celular e 4 no computador pela interface (269 rodadas ao vivo), 0 problemas;
  textos 0 suspeitos; fotos ao vivo em 390, 360, 1280×720 e 1440×900.
- **Tempo:** jogando todas as rodadas ao vivo, uma temporada de 38 rodadas leva ~7 min (perto dos 10 min pedidos).

### Rodada 6 · 2026-10-29 · Domínio mundial + ajustes da rodada ao vivo

- **Domínio mundial (pedido do Silvio, ideia do World Soccer Champs):** tela com o mapa-múndi e a % de taças já
  ganhas em cada continente (América do Sul, América do Norte, Europa, África, Ásia e Oceania) e no "Mundo" (Copa,
  Mundial, Intercontinental, Bola de Ouro), somando todas as carreiras (coleção da Sala). Tocar num continente lista
  as taças dele por país, ganhas em cor e as que faltam apagadas. Botão na tela inicial com o mini mapa e a % total.
  Mapa gerado de Natural Earth 1:110m (`craque/src/world-map.js`, 37 KB). Só visual.
- **Rodada ao vivo (opinião do Silvio):** ~30 s por rodada (antes 10 s; "Mais rápido" ~10 s); escudos não piscam mais
  (tabela e placares atualizam no lugar, sem refazer o HTML); os gols do seu jogo em duas colunas, mandante à esquerda
  e visitante à direita, como no placar da TV.
- **Validação:** fotos do mapa no celular e em 1280×720; fotos de todas as telas antes/depois (mudanças só nas telas
  de carreira que se separa); carreiras Completas pela interface no celular e no computador 0 problemas; textos 0.
- **Próxima (pedido do Silvio):** Completa integrada de verdade: calendário único com liga, copa nacional e
  continental; cada jogo simulado com o jogador do dia; pontos de evolução jogo a jogo; decisões e janela no meio.

### Rodada 7 · 2026-10-29 · Carreira Completa integrada (pedido do Silvio: "precisa ser integrado")

- **Calendário único:** liga, copa nacional (mata-mata no tamanho do país) e continental (Libertadores/Sul-Americana,
  Champions/Liga Europa etc., com fase de grupos de 4 e mata-mata) intercalados, jogo a jogo, no motor
  `craque/src/engine/fullcareer.js` (`S.fcStart/fcNext/fcPlay/fcFinish`, semente própria em `c.fc.seed`). Cada jogo
  usa a força do jogador naquele dia (titular, banco, rodízio ou lesão); a temporada (`S.playSeason`) passa a ler os
  números jogados (`c.fc.out`) em vez de sortear. O modo rápido não mudou.
- **Evolução jogo a jogo:** nota ≥ 7,4 dá +0,2, ≥ 8,2 dá +0,4, taça dá +1 (teto `S.PE_CAP` por temporada). A fração
  fica guardada; ponto inteiro já pode ser gasto em "Evoluir agora" entre os jogos e vale no jogo seguinte.
- **Lances decisivos** nas finais de copa e continental, no clássico e na última rodada que decide título/acesso.
- **Tela (`craque/src/ui/fullcareer.js`):** próximo jogo, tabela com abas Liga/Grupo, competições, calendário,
  pontos de evolução; jogo ao vivo com os outros jogos da rodada; tela de taça.
- **Validação:** simulador 600 carreiras Completas: A19 B39 C23 D12 S8 (rápido A25 B33 C18 D13 S11), gols e taças
  perto do rápido, ~13 min; goleiro fica mais difícil (S 2%). Carreiras pela interface: celular 8 e computador 0
  problemas. Fotos de todas as telas no celular e 1280×720.
- **Pendente:** decidir com o Silvio se a nota da Completa ganha cortes próprios (mais difícil hoje); janela de
  transferências e decisões espalhadas no meio da temporada (parte 3).

### Rodada 7b · 2026-10-30 · Completa: a tela de rodadas no centro (opinião do Silvio)

- **Eventos entre os jogos:** na Completa a pré-temporada vai direto para os jogos; duas datas no ano (30% e 70% do
  calendário) podem trazer um evento ("Entre os jogos", volta com "Voltar aos jogos"). Sem troca de clube no meio do
  ano (`S.pickEvent(c, { mid: true })`) e sem repetir evento no mesmo ano; lesão de evento tira dos próximos jogos.
  "Simular" para nas datas de evento.
- **Evolução todo jogo:** em campo, nota < 6,5 dá +0,05, ≥ 6,5 +0,1, ≥ 7,4 +0,2, ≥ 8,2 +0,4 (teto do ano igual).
- **Tela mais curta:** abaixo do jogo, uma aba por vez (Tabela, Jogos, Torneios, Você; Rodada no ao vivo); no celular a
  tabela rola por dentro com a sua linha à vista; no computador a tabela segue do lado. Barra de evolução numa linha.
- **Validação:** simulador Completa 1500: S14 A27 B32 C18 D9 (antes S8 A19; rápido S11 A25 B33 C18 D13, sem mudança);
  auditoria 0 alertas; carreiras pela interface no celular e no computador; fotos do hub, abas, ao vivo e evento.

### Rodada 8 · 2026-10-30 · Perfil e metas da semana (camada de volta, pilares 4 e 5)

- **Perfil (`craque/src/ui/profile.js`):** nível de jogador com XP de toda carreira terminada (100 + nota + títulos;
  Completa +50; Relâmpago 30 + nota), faixas Peneira, Base, Profissional, Titular, Craque, Ídolo, Lenda; cada nível novo
  dá pacotinho. Guardado no inventário (`inv.prof`, vai para a nuvem; o XP fica com o maior dos aparelhos).
- **Metas da semana:** três por semana (renovam na segunda), uma fácil, uma média e uma difícil, sorteadas pela data
  (iguais para todos) e sem duas da mesma família; cada uma dá XP e pacotinho. Conferidas no fim de carreira e da
  Relâmpago; o fim mostra "+XP", nível novo e meta cumprida.
- **Tela:** nível com barra, metas, Domínio mundial (o mapa volta para o Perfil) e números de todas as carreiras.
  Botão na tela inicial logo abaixo da Relâmpago, no lugar do botão do mapa.
- Só visual e pacotinhos: não muda nota nem sorte.

### Rodada 9 · 2026-10-30 · Completa: continuidade e clareza (avaliação de uma IA jogando, filtrada)

- **Lance e jogo contam a mesma história:** jogo com lance decisivo tem o placar roteirizado (`scripted` em
  engine/fullcareer.js): chega ao placar do lance no minuto do lance e o resultado segue ele (atacante: gol seu ou
  assistência no passe; erro na final, o adversário mata no fim; defensor: segura ou cede o empate, pênaltis perdidos na
  final). Corrigido também: depois do lance o `fcNext` não devolvia mais o lance (clássico podia repetir).
- **Topo atualizado jogo a jogo:** gols, assistências (ou S/GOL) e taças do ano em andamento entram no topo (core.js `totOf`/`titlesOf`).
- **Resumo:** "X de N jogos" usa os jogos do calendário (`FO.slots`); a conta da nota não mudou.
- **Evolução:** a barra mostra para gastar, ganho no ano e o limite (2); a fração que sobra passa para o ano seguinte;
  resumo diz "+N no ano, ganhos jogo a jogo e já somados · para gastar agora".
- **Sub-20 deixou de ser armadilha:** antes "Ir" valia −43 contra 15 de "Ficar"; agora 35 contra 37 (sem perda de teto, chance 30%,
  ficar ganha forma). O rodapé "não rende nada a mais" agora considera ganho de fama.
- **Validação:** 256 lances simulados com placar igual ao do lance; simulador Completa S13 A25 B35 C18 D9, rápido sem mudança;
  carreiras Completas pela interface no celular e no computador 0 problemas.
- **Ficou para a próxima:** escolha curta antes de alguns jogos, lances variados (minuto, placar, tipo, peso), sub-20 menos
  punitivo, texto "não rende nada a mais" com ganho de fama, previsão de volta da lesão; conferir negociação e calendário.

### Rodada 10 · 2026-10-30 · Completa: lances variados e o que a avaliação apontou

- **Lances variados:** cada lance da Completa sorteia minuto (69' a 90+4 nas decisões, 64' a 90+1 nos clássicos),
  placar (empatado para quem ataca: 0×0, 1×1, 2×2; vencendo por um para quem defende) e, para o atacante, pênalti ou
  falta. Textos dizem o minuto ("aos 76 minutos" ou "nos acréscimos"). 348 lances simulados: 105 combinações.
- **Lesão:** o próximo jogo diz por quantos jogos você ainda fica fora.
- **Negociação:** o seletor de pedidos (padrão, salário, minutos, cláusula) saiu de dentro de cada cartão e virou um
  bloco só acima das propostas: vale para qualquer uma (dentro do cartão parecia valer só para aquele clube).
- **Calendário igual todo ano (erro real):** a semente do ano (`tseed * 2654435761 + ano`) passava de 2^53 e o ano
  sumia no arredondamento; agora `Math.imul`. Calendário, sorteios e jogos da Completa mudam de ano para ano.
- **Proposta "Vida entre os jogos" aprovada pelo Silvio** (doc claude.ai/artifact/7Cc2mBqQj93iJT7jshdUj2): compras com
  o dinheiro da carreira podem dar atributo; energia < 30 tira do jogo; a Completa pode ser longa (de vários dias);
  incluir relacionamentos, carros e apostas (só dinheiro do jogo).

### Rodada 11 · 2026-10-30 · Completa: vida entre os jogos, parte 1 (energia, forma e a semana)

- **Energia (0–100):** jogar gasta 20–30 (o treino físico poupa 30% nos 4 jogos seguintes); a semana recupera 5 sozinha
  (30 se você não jogou). Abaixo de 50 rende menos (nota e gols); abaixo de 30 a lesão dobra e o técnico poupa você
  metade das vezes (um terço nas decisões). Cheia a cada pré-temporada.
- **Forma (−2 a +2):** a nota de cada jogo contra a sua média do ano (sequência boa sobe, ruim desce; banco tira um
  pouco); mexe na nota (±0,24) e nos gols (±10%). Metade passa para o ano seguinte.
- **A semana:** depois de cada data do calendário, duas ações antes do próximo jogo: treino técnico (+0,05 de evolução,
  limite próprio de 0,5 por ano, fora do limite dos jogos), treino físico, descanso, fisioterapia (paga, tira um jogo de
  lesão), patrocínio (dinheiro e fama), entrevista (fama, 25% de polêmica com o técnico). A escalação sai depois da
  semana. "Semana automática" repete a última escolha da pessoa e troca o que cansa por descanso se a energia ia ficar
  abaixo de 60; "Simular 5 jogos" usa a automática.
- **Equilíbrio:** o robô usa a automática. Treino com limite de 0,8/ano subia S para 16%; com 0,5, Completa S12 A30 B33
  C16 D9 (antes S12 A27 B34 C19 D7), ~12 min. Modo rápido sem mudança. Forma medida pela nota absoluta inflava S para
  30% (média +1,35): por isso é relativa à média.

### Rodada 12 · 2026-10-30 · Completa: vida entre os jogos, parte 2 (loja)

- **Loja (aba "Loja" na tela de rodadas):** preços em semanas de salário (acompanham a liga). Chuteira (luvas no goleiro)
  de treino +1, profissional +2 (cansa 3 a menos por jogo) e de ponta +3 (2 temporadas), num dos 3 atributos que mais
  pesam na posição (`c.gear`, bônus em `c.shopB` dentro de `S.eff`). Equipe pessoal paga por semana (preparador físico
  +8 de energia, fisioterapeuta lesões 30% mais curtas, nutricionista declínio ×0,85, analista de vídeo nota +0,08,
  assessoria fama e entrevista sem polêmica); sem dinheiro o contrato cai. Carro e casa: fama e torcida, uma vez.
- **Salário semana a semana na Completa** (o resumo da temporada paga só o que faltar), para a loja já servir no 1º ano.
- **Nota da Completa com corte próprio** (`S.GRADES_FC` 2190/1610/1145/855, aprovado pelo Silvio): o robô que compra
  fica em S11 A26 B31 C19 D13; sem comprar, S6. Modo rápido sem mudança. Goleiro na Completa: S 2% (olhar depois).

### Rodada 13 · 2026-10-30 · Completa: vida entre os jogos, parte 3a (antes do jogo)

- **Orientação de um toque no cartão do próximo jogo** (fica a da última vez, `c.fc.ins`): Equilibrado; Buscar o gol
  (gols ×1,06, assistências ×0,75, nota oscila mais, cansa 10% mais); Jogar para o time (assistências ×1,1, gols ×0,88,
  técnico +0,3 por jogo); Poupar o físico (metade da energia, rende um pouco menos). Goleiro: só Equilibrado ou Poupar.
  Medido com o robô fixo em cada uma: nenhuma é sempre melhor (primeira versão, gols ×1,15, dava S 30% ao atacante que
  sempre buscava o gol; jogar para o time dava S 34% ao meia).
- **Pedido do técnico** (~15% dos jogos em que você começa): marque um gol, dê uma assistência, nota 7+, não sofra gol
  ou vença. Cumprir: técnico +5 e forma +0,3; falhar: técnico −2. O resultado aparece na tela do fim de jogo.

### Rodada 14 · 2026-10-30 · Completa: vida entre os jogos, parte 3b (vida pessoal, carros e apostas)

- **Relacionamento (`c.love`):** solteiro conhece alguém de vez em quando (mais com fama e com a ação nova da semana
  "Família e amigos", +10 de energia). Namorando, a relação cai 2 por semana (casado, 1) e cada "Família e amigos" dá
  +8; abaixo de 15 termina (forma −0,5). Relação 70+ dá +0,04 de forma por semana; abaixo de 30, −0,04. Pedido de
  casamento na loja (namorando com 70+).
- **Carros:** popular, sedã, esportivo e superesportivo (fama; o último tira torcida). Casa nova continua.
- **Apostas (só dinheiro do jogo):** um jogo da próxima rodada da liga sem o seu time, cotação pela força dos dois
  (casa fica com 10%), três valores (1, 4 ou 10 semanas de salário). Atleta apostar é proibido: 6% de chance de
  descobrirem a cada aposta (suspensão de 4 jogos, técnico −10, fama −8, torcida −6); fisioterapia não encurta suspensão.

### Rodada 15 · 2026-10-30 · Duas carreiras separadas e a prancheta (pedido do Silvio)

- O Silvio não gostou das rodadas 13 e 14 como estavam e pediu para separar a carreira de 10 minutos da carreira
  estilo Brasfoot/New Star Soccer. Depois de um canvas de design e de três direções pedidas a um chat sem contexto,
  escolheu "C + jornal e Zé da B".
- **Tela inicial com duas entradas** (Carreira Rápida e Carreira Jogo a Jogo), cada uma com o próprio save
  (`craque-v5` e `climbix-jogo-v1`; um save de Completa antigo migra sozinho). Seletor de modo da criação saiu.
- **Hub-prancheta** (`ui/fullcareer.js`): campinho com a sua posição (titular, banco, poupado, lesionado ou "escalação
  depois da semana"), chips de energia/forma/técnico/torcida, bilhete "Antes do jogo" que leva às ações, fileira de
  atalhos (Tabela, Jogos, Ficha, Loja, Palpites) e o ingresso dourado "Jogar". Cada atalho abre tela própria com
  "‹ Prancheta".
- **Depois do jogo, o "Diário da Rodada"**: manchete sobre você, placar, boletim do atleta (nota, gols/sem sofrer gol,
  assistências, energia antes → depois, forma, evolução), outros jogos, classificação e o recado do Zé sobre o palpite.
- **Saíram:** orientação antes do jogo, pedido do técnico e namoro/casamento. Ficaram loja (equipamento, equipe,
  patrimônio: casa e carros) e apostas, agora com a voz do Zé.
- **Ícones desenhados** (6 folhas aprovadas) no lugar dos emojis onde há desenho (`assets/ic/`, `tools/craque_icones.py`).
- Validação: simulador (Completa S11/A26/B32/C18/D13, rápida S11/A26/B33/C18/D13, sem recalibrar), e2e Completa no
  celular e no computador e rápida, 0 problemas; fotos de todas as telas antes/depois.

### Rodada 16 · 2026-10-30 · Jogo a Jogo: jogo ao vivo e a agenda como hub (pedidos do Silvio)

- **Jogo ao vivo** (PRs #92–#94): campo 3D no ângulo da TV com a bola indo ao ataque/defesa e a posse; a sua nota
  começa em 6,0 e muda com cada lance seu até fechar na nota do motor (só apresentação, `flowOf`).
- **Escalação com elenco e briga pela vaga** (PR #91) não agradou; fica como ideia para o Modo Treinador.
- **Agenda da semana vira o hub** (escolha do Silvio entre celular, vestiário e agenda): os dias entre um jogo e outro
  (liga no domingo, copa/continental na quarta), dois dias com as ações da semana (toque troca), o resto com a rotina
  do clube, o dia do jogo com a sua situação e a chance de começar, recados (preparador, DM, Zé) e atalhos.
  Motor igual (`S.fcWeek` com duas ações): equilíbrio não muda.
- **Celular vira o hub** (o Silvio tinha clicado na agenda por engano; o que ele queria era o celular): tela do aparelho
  com relógio e o próximo jogo, notificações (técnico com a chance de começar, agenda, preparador, Zé) que abrem as
  telas, apps (Agenda, Tabela, Jogos, Ficha, Loja, Zé) e o ingresso do jogo. A agenda virou um app com "Pronto".

### Fase 0 do plano · 2026-10-31 · Preparar (contagem anônima e aviso do save)

- **Contagem anônima** (`craque/api/stats.php` + `craque/src/stats.js`): o jogo manda só eventos sem identidade e o
  servidor soma por dia (dia + evento + modo + faixa). Eventos: primeira visita, voltou no dia seguinte (D1), voltou do
  7º ao 13º dia (D7), sessão (modo e faixa de minutos com o jogo na tela), carreira começou, temporada terminou (número),
  carreira terminou. Aparelho que já tinha jogo salvo fica fora de novos/D1/D7, para a linha de base ser só de gente nova.
  Testes em localhost não mandam (`?statlog=1` liga). Leitura: `python3 tools/craque_numeros.py [dias]`.
- **Aviso do save novo**: notificação "Climbix" no topo do celular do Jogo a Jogo até tocar em Entendi
  (`climbix-aviso-save-v1`), e uma linha na criação da carreira jogo a jogo.
- **Plano no ciclo**: seção "Plano em andamento" acima; `craque_ciclo.sh` mostra a contagem no resumo.

### Fase 1 do plano, parte 1 · 2026-10-31 · Jogos vividos, resumidos e no banco (save novo)

- **Tipo de jogo** (`S.fcBig`, `S.fcKind` em engine/fullcareer.js): vivido (decisão com lance, copa a partir da 2ª fase,
  todo jogo continental, estreia do ano, clássico, contra um dos três primeiros da 6ª rodada em diante (na parte 2: só o líder), briga direta no
  último terço perto de uma linha que vale, última rodada, ou "Viver este jogo"); resumido (jogo comum em que você
  joga: um cartão com placar, sua nota e um fato); no banco (placar e pronto). "Resumir até o próximo jogo grande"
  substitui "Simular 5 jogos" e "Simular até o fim" (o plano troca o simular pelo resumir) e mostra a lista dos jogos.
- **Ritmo medido** (`MODO=completa node tools/craque_sim.js`, linhas "Ritmo"): mediana de 15 vividos e ~66 min por
  temporada (1ª temporada ~21 min: o garoto fica muito no banco; da 11ª em diante ~74 min); carreira inteira ~22 h.
  Equilíbrio igual (o tipo de jogo só muda a apresentação).
- **Save novo, uma vez só**: carreira jogo a jogo sem `c.fcv === 2` vira carta na coleção (`U.fcLegacy`) e a tela
  inicial avisa uma vez. O aviso no celular da fase 0 saiu (cumpriu o papel). Daqui em diante toda parte traz migração.
- **Fotos do Jogo a Jogo**: `tools/craque_telas_jaj.js` (antes em /mnt/project-files/climbix/fase1/antes).
- Pendência anotada: na 1ª temporada o garoto fica no banco em ~22 de 39 jogos; vale olhar na parte de tela limpa ou
  na fase 4 (empréstimo na janela).

### Fase 1 do plano, parte 2 · 2026-10-31 · Um lance seu em todo jogo em que você entra

- **Lance comum** (`lanceFor`, `S.fcLance`, `S.fcAutoLance` em engine/fullcareer.js; `c.fc.pending.l`): todo jogo em que
  você entra sem lance decisivo tem um lance seu num minuto sorteado. Atacante: pênalti ou falta; meia: bola enfiada
  (assistência); goleiro: pênalti contra; zagueiro: contra-ataque ou bola nas costas; atacante e meia que marcam pouco
  ganham às vezes uma pressão na saída de bola (só mexe na nota). `FC_LANCE=0` desliga no simulador.
- **Sem mudar a média**: o lance troca parte do que o jogo sortearia. O ataque tira dos gols (ou das assistências do
  meia, limitadas aos gols dos companheiros: `emin`/`asRate`) a chance do lance virar gol; a defesa tira do adversário o
  que deixa a chance de não sofrer gol igual; o duelo e o lance defensivo mexem na nota centrados na chance (+0,4·(1−p)
  ou −0,4·p). Atacante tem o lance de gol em menos jogos (`LANCE_Q·0,6`): a nota dele encosta no 10 e o gol quase
  certo tirava a variação (nota subia 0,36 sem gol a mais). Medido em pares (mesmo jogo com e sem lance): notas e gols
  iguais em ±0,08. Notas finais S15/A24/B30/C18/D14 contra S14/A23/B34/C19/D11 sem o lance.
- **Tela** (ui/fullcareer.js): no ao vivo o jogo para no minuto ("Seu lance · 67'"), abre um cartão com placar, a
  situação, o que vale (`U.lanceStakes`), os dois estilos e "Deixar o jogo decidir"; depois o grito e "Voltar ao jogo".
  No jogo resumido o lance vem antes do cartão, e o cartão ganha a linha "Seu lance aos 67': pênalti convertido".
  Lances no automático (configuração) e o "Resumir" deixam a carta decidir.
- **Jogo grande "topo"** agora é só contra o líder (antes: um dos três primeiros), para o tempo do ano não passar muito
  de 1 h com o lance: ~73 min por temporada no modelo (vivido 210 s, resumido 42 s), 14 vividos.

### Fase 1 do plano, parte 3 · 2026-10-31 · Tela limpa no Jogo a Jogo

- **Celular** (style.css, bloco "Tela limpa" antes das telas dos atalhos): no celular (até 999 px) o relógio cai para
  46 px e os seis apps ficam numa fileira, como no computador. O ingresso dourado do jogo agora aparece sem rolar em
  390×844 (antes ficava pela metade ou abaixo da dobra com três notificações).
- **Ao vivo**: o título "Brasileirão · ao vivo" sai no celular (o placar escuro já diz a competição e o minuto).
- **Correção**: no intervalo, o gol do minuto 45 aparecia duas vezes na lista do placar (`frame(t)` no intervalo).
- Já cumpriam a regra (um cartão principal e um botão dourado): cartão do jogo resumido, lance, jornal, resumir.
  Fotos antes/depois em /mnt/project-files/climbix/fase1/ (antes = antes da fase 1; depois = celular).

### Fase 1 do plano, parte 4 · 2026-10-31 · Rodada ao vivo como na TV

- **Plantão** (`#fc-tv`, ui/fullcareer.js): no ao vivo da liga e do grupo continental, uma faixa acima dos outros jogos
  mostra o último gol de fora ("17' · Gol do Vasco: Fluminense 0 × 2 Vasco") e o que ele faz com você ("· você cai para 5º").
- **Rival direto** (`rivalOf`): perto de uma linha que vale (título, acesso ou G4, queda), o time do outro lado dela mais
  perto em pontos (até 6); longe das linhas, o time logo acima. Na tabela: filete vermelho e a etiqueta "rival"; o jogo
  dele vem primeiro na lista da rodada, com fundo vermelho leve; o plantão diz "seu rival".
- **Setas**: com a bola rolando, cada time mostra quantas posições subiu ou caiu desde o começo da rodada (não na 1ª).
- **Correção**: voltando do lance (do minuto dele), a tabela ficava vazia até o próximo gol; agora entra na hora.
- **Jogo grande "topo" volta a ser contra um dos três primeiros**: o Silvio pediu para não cortar nada pelo tempo
  previsto (2026-10-31): medir quanto leva de verdade e só então ajustar. ~76 min por temporada no modelo.
- `craque_telas_jaj.js` ganhou `FULL=1` (foto da página inteira).

### Fase 1 do plano, parte 5 · 2026-10-31 · Faixa "Seu ano" depois de cada jogo vivido

- Abaixo do jornal (bloco de apoio `.pg`): **Meta do ano** da posição (`S.fcMeta`: gols do atacante, assistências do
  meia, jogos sem sofrer gol da defesa; fixada uma vez por temporada um pouco acima do que a carta faria: o robô bate em
  50-65% das temporadas), **Evolução do ano** (pontos contra o limite `S.PE_CAP`) e a **linha da tabela mais perto**
  ("11º: 3 pontos para o G4", "Líder, 4 pontos à frente do 2º", "na zona: 2 pontos para sair"). As barras enchem do valor
  de antes do jogo até o de agora, com o ganho do jogo em verde. Meta calculada na hora: save antigo segue sem migrar.
- A fase 6 (metas, legado) troca a meta da posição pelas metas do ano de clube, empresário e você.

### Fase 1 do plano, parte 6 · 2026-10-31 · Metas da semana e XP do perfil no save longo

- **Metas da semana** (ui/profile.js): saem "Termine uma Carreira Completa" e "Nota A ou S numa Carreira Completa" (o save
  longo não termina numa semana). Entram, na família `jaj`: "Jogue 15 jogos no Jogo a Jogo" (fácil), "Vença um clássico
  no Jogo a Jogo" e "Acerte 5 lances seus no Jogo a Jogo" (médias), "Bata a meta do ano no Jogo a Jogo" (difícil). Andam
  a cada jogo jogado (`U.profileJajGame`, chamado no ao vivo, no resumido e no Resumir); a meta cumprida aparece no
  cartão do jogo, na faixa "Seu ano" ou na lista do Resumir. Semana em curso com meta antiga troca pela nova (migração).
- **XP por temporada** (`U.profileJajSeason`, no resumo da temporada): 50 + 15 por título (até 60) + 30 se bateu a meta
  do ano, uma vez por temporada (`c.profSeas`). O bônus de +50 XP do fim da Carreira Completa saiu (já ganha por ano).

### Fase 2 do plano, parte 1 · 2026-10-31 · As pessoas do celular

- Amostra aprovada pelo Silvio ("pode seguir"). Motor novo `engine/phone.js` (carregado depois do `cassino.js`; o
  `sim.js` passou a carregar `names.js`). Cada carreira do Jogo a Jogo sorteia as suas pessoas pelo país do jogador: mãe,
  parça (apelido), empresário, jornalista e, a cada clube, técnico ("Professor" no Brasil, "Mister" fora) e capitão; o
  rival é o de `rival.js`. Relação de 0 a 100 que aparece só no tom (bem com você ≥ 70, normal, magoada < 40; o técnico
  usa `c.rel.coach`, o rival compara as cartas) e memória de fatos (primeiro gol, primeiro título, clube onde começou,
  lesão longa) que volta numa mensagem duas temporadas depois.
- As mensagens saem depois do jogo quando ele diz algo (marca de gols da carreira, jogo grande, dois gols, nota muito alta
  ou baixa, sequência no banco), com folga entre uma e outra e a mesma reação descansando 8 jogos; antes do jogo, a mãe
  na lesão e o capitão no clássico ou na decisão (`S.fcPhonePre`, chamado pela tela). As reações de gol da mãe e do parça
  saem montadas (começo + o que viu + fecho). Medido em 60 carreiras: ~11 mensagens por temporada; o texto mais repetido
  numa carreira inteira aparece 10 vezes (mediana; 13 no p90).
- Tela: as duas mensagens novas aparecem no topo das notificações do celular; app novo **Chat** (lista de conversas e a
  conversa em balões, contador de não lidas). Sorteio próprio: nota, placar e sorte não mudam (simulador igual dentro do
  ruído). Save antigo: as pessoas nascem na primeira vez que o celular abre.
- Relação nesta parte só se mexe com título, marca de gols e mudança para fora do país; os convites (parte 2) é que vão
  mexer de verdade.

### Fase 2 do plano, parte 2 · 2026-10-31 · A semana nova: um treino e os convites

- **Um treino por semana** (técnico, físico, descanso; fisioterapia na lesão) no lugar das duas ações. A energia de cada
  treino soma o par de antes (treino + descanso = +15), então o ritmo de energia não mudou. Plano antigo de duas ações vira
  o primeiro treino dele (save sem migração). Patrocínio e entrevista saíram da semana e viraram convites.
- **Convites do celular** (`S.FC_INV` em engine/phone.js, 11 tipos de 6 pessoas): de 0 a 2 por semana, um por pessoa, no
  máximo 2 do mesmo tipo por temporada e 5 semanas entre eles, com os três textos de cada tipo em rodízio. Cada um tem
  segura (pouco e certo), arriscada (chance na tela, sorteio na hora, lado ruim de verdade) e **sem resposta**, que a
  pessoa lembra (mensagem e, em alguns, memória que volta duas temporadas depois). Na agenda, cada convite ocupa um dia;
  respondido, mostra o que saiu ("tirou 83, precisava até 70"). Semana automática ou Resumir: ficam sem resposta.
- **Auditoria** (`craque_audit_eventos.js`, seção nova): régua da semana (`S.fcInvValue`): 0 alertas (nenhuma resposta
  domina, segura sem ganho permanente, arriscada com lado ruim). Com assessoria de imprensa (paga) a entrevista e o
  podcast ficam mais seguros de propósito: aparece, não conta como alerta.
- **Repetição** em 60 carreiras: ~21 convites por temporada, no máximo 2 do mesmo tipo numa temporada, cada texto menos
  de uma vez por temporada. Equilíbrio (300 carreiras): robô que escolhe bem S13/A25/B32/C19/D11; sem responder nada
  S14/A23/B32/C20/D12; ao acaso S11/A21/B34/C18/D15. Decidir bem vale pouco, como os eventos, e a nota não se mexeu.

### Fase 2 do plano, parte 3 · 2026-10-31 · Histórias que voltam

- Três histórias de 3 a 5 passos espalhados pelas temporadas (`storyTick` em engine/phone.js, estado em `c.ppl.st`): o
  **bar do parça** (entrar de sócio; na temporada seguinte o bar lota; depois lucro ou o fiscal fecha e ele pede ajuda;
  quem ajudou recebe o "tu foi o único que nunca me largou"), a **casa da mãe** na cidade natal (reforma ou casa nova; a
  casa nova rende torcida e os meninos do campinho com a sua camisa) e o **patrocínio de três anos** do empresário
  (parcela todo ano, e a cláusula pode cobrar gravação na véspera do jogo). Uma história começa por temporada no máximo,
  a partir do 6º jogo do ano.
- O passo que decide é um convite da agenda com a arriscada "vem depois" (sem sorteio na hora: o texto diz o que pode
  acontecer); os outros passos são mensagens no Chat. Recusar ou não responder também fica guardado e volta numa mensagem.
- Medido em 60 carreiras: as três histórias aparecem e terminam em quase todas, pelos caminhos diferentes. A nota do Jogo
  a Jogo ficou igual dentro do ruído.

### Fase 2 do plano, parte 4 · 2026-10-31 · Repercussão no X, na TV e no jornal

- O que vira público num convite ou numa história (`S.FC_NEWS` em engine/phone.js: comercial, meme, entrevista boa ou
  polêmica, programa, foto de madrugada, churrasco que acabou tarde, campanha, casa dos pais, bar, patrocínio) sai como
  notificação **X · assunto do momento** no celular, às vezes com a fala de um programa de TV (`D.MEDIA.shows`), e no
  próximo jogo como **Fora de campo**, no jornal da rodada ou no cartão do jogo resumido. Cada notícia aparece uma vez em
  cada lugar e fica à vista até o jogo seguinte. Só texto: nota e sorte não mudam.
- **Fase 2 pronta**: auditoria dos convites com 0 alertas; em 60 carreiras de 20 temporadas, ~21 convites por temporada,
  no máximo 2 do mesmo tipo por temporada e cada texto menos de uma vez por temporada; ~11 mensagens por temporada, com o
  texto mais repetido de uma carreira inteira aparecendo 10 vezes (mediana).

### Fase 3 do plano, parte 1 · 2026-11-04 · Dívida, manutenção do status, bônus e luvas

- Antes, medido em 60 carreiras: o robô gastava até perto de zero, mas ninguém quebrava (o saldo parava em zero e
  nada cobrava por semana).
- engine/money.js (só no Jogo a Jogo):
  - **Manutenção**: carro e casa cobram por semana uma fração do preço pago (carro 0,7%, casa 0,45%). O valor fica fixo
    na compra, então quando o salário cai ela pesa mais.
  - **Dívida** (`c.debt`): o que a manutenção não cobre vira dívida, com juros de 0,8% por semana. O salário paga a
    dívida primeiro, e devendo a loja não vende carro nem casa. Com a dívida acima de 4 semanas de salário, a cabeça
    pesa (−4 de energia na semana). O empresário avisa quando a conta entra no vermelho e quando ela é quitada; a mãe
    ou o parça falam quando pesa.
  - **Bônus do ano**, em semanas de salário: meta 4, liga 6, acesso 4, copa 3, continental 6 (o segundo torneio 3).
  - **Luvas** ao assinar: 8 semanas do salário novo (12 em proposta de dinheiro, 4 na renovação).
- O fim da carreira mostra "Terminou devendo".
- No simulador, cada carreira do robô tem um perfil de gasto (`PERFIL`: cauteloso, normal ou gastador, sorteados
  40/35/25), e a saída mostra aperto (dívida de 1 semana ou mais) e quem terminou devendo.
- Medido em 300 carreiras: aperto 8%, terminou devendo 2% (gastador 29% e 5%; cauteloso 0%). O alvo da fase (15 a 25%) fica
  para as próximas partes, que trazem gastos e riscos novos (pedidos da família, investimentos e status).
- `craque_invariantes.js` agora compra carro e casa e confere a dívida (0 falhas).

### Fase 3 do plano, parte 2 · 2026-11-04 · Celular como iPhone, app Apostas e o Zé no Chat (pedidos do Silvio)

- Silvio: "o celular precisa ter a interface mais parecida com iphone, com os botões na parte de baixo" e "os jogos e
  apostas devem ser um app nesse celular, e o Zé um contato pra conversar e fazer os palpites".
- Celular: a grade de apps fica em cima (Tabela, Jogos, Ficha) e a barra fixa de baixo (dock) tem os quatro principais:
  Chat, Agenda, Apostas e Loja. Os apps abrem **dentro do aparelho** (`appScr` em ui/fullcareer.js): cabeçalho com
  "‹ Início", o conteúdo rola por dentro, a barra de baixo continua no pé com o app aberto marcado, e a barrinha de baixo
  volta para o início.
- App **Apostas** (era "Zé"): a rodada, a mesa dos fundos e o extrato. A proposta do amarelo saiu dali e virou conversa.
- **Zé no Chat** (engine/money.js): ele fica sempre na lista de conversas. "Manda um palpite" traz um jogo da rodada
  com o mercado e a cotação (até 2 por rodada; o palpite é a cotação normal da casa, sem vantagem), e dá para apostar ali
  mesmo (o mesmo cupom do app, com o faro da federação contando igual). Depois da rodada ele conta como foram os cupons.
  A proposta do amarelo chega como mensagem dele, com "Topar" e "Tô fora". Recusar deixa ele sem responder por uns
  jogos ("visualizado").

### Fase 3 do plano, parte 3 · 2026-11-04 · Quebrar e voltar: o app Banco

- App **Banco** (🏦, na grade do celular), com:
  - o saldo e a dívida;
  - o que entra e sai por semana: salário, equipe, carro e casa, parcela do adiantamento, juros e a sobra;
  - as saídas do vermelho;
  - o patrimônio, com "Vender".
- Com a conta no vermelho, aparece a notificação "Banco" no celular. A mensagem do empresário aponta para o app.
- Saídas (engine/money.js, `S.fcWays`), cada uma com um custo:
  - **Adiantamento do empresário**: até 10 semanas de salário na hora. Volta com 20% a mais, descontando 30% do
    salário por semana. Um por temporada.
  - **Vender o carro** (60% do preço pago) ou **a casa** (85%): a manutenção acaba e a fama cai metade do que a compra
    deu. A venda vira notícia no X e no jornal. Dá para vender mesmo sem dívida.
  - **Ajuda da mãe**: até 8 semanas de salário, só com a relação boa e uma vez a cada 3 temporadas. Ela fica
    preocupada (relação −6).
  - **Renovar ganhando menos**: com a dívida acima de 4 semanas, 12 semanas de luvas na hora, salário 20% menor e
    mais um ano de contrato.
- Correção: a casa comprada na primeira temporada (guardada como temporada 0) aparecia como não comprada
  (`S.fcOwns`).
- No simulador, o robô no vermelho procura uma saída: o cauteloso e o normal a partir de 2 semanas de dívida, o
  gastador a partir de 8.

### Fase 3 do plano, parte 4 · 2026-11-04 · Investimentos, festa e grife (fase 3 pronta)

- **Investir** (no Banco, `S.FC_INVEST`; não dá para investir devendo):
  - **Apartamento para alugar** (40 semanas de salário): rende aluguel toda semana, cerca de 6% do preço no ano. A cada
    temporada o valor de venda muda (90% a 115% do pago), e uma vez em cinco um problema custa 6% do preço. Vende quando quiser.
  - **Negócio do primo do parça** (4, 12 ou 30 semanas): o dinheiro fica preso até a temporada seguinte. 35% volta
    triplicado; 65% volta só 20%. O parça conta o resultado no Chat.
- **Status novo**:
  - **Guarda-roupa de grife** (Loja, patrimônio): +3 de fama, com coleção nova cobrada por semana (1,2% do preço).
  - **Festa** (Loja, uma por temporada): +3 de fama e +2 de torcida, e o parça gosta, mas a semana começa com −10 de energia.
- Simulador: o normal e o cauteloso compram o apartamento quando sobra dinheiro; o gastador põe no negócio do primo, compra
  grife e dá festa. Os prompts das 4 imagens novas estão em project-files/climbix/fase3/prompts-arte-dinheiro.md.
- **Fase 3 pronta**, medida em 300 carreiras duas vezes: aperto 16% e 18%, terminou devendo 3% e 3% (alvo 15 a 25% e menos
  de 5%). Por perfil: o gastador aperta em ~60% das carreiras e termina devendo em ~12%; o cauteloso nunca. Notas S17 e S20
  contra a linha de base S22 de hoje: quem gasta com status e risco compra menos equipamento e equipe (o corte de notas está
  com o pessoal do treino com lances).

### Fase 4 do plano, parte 1 · 2026-11-04 · A janela do meio do ano e a troca de clube

- **Janela do meio do ano** (`engine/transfer.js`, `S.FC_WIN`): abre na metade do calendário e fica aberta por dois jogos.
  Quem joga bem num clube abaixo do seu nível recebe proposta de um clube maior; quem está sobrando no banco, de um clube
  onde jogaria; o veterano, às vezes, da liga do dinheiro. Até duas propostas; o empresário avisa no Chat. Não abre para menor
  de 18, emprestado, na temporada de despedida nem para quem acabou de chegar ao clube.
- **App Mercado** (🤝, no celular): antes da janela, quando abre; aberta, os cartões das propostas (salário comparado ao de
  hoje e luvas) com "Assinar" (confirmação) e "Ficar"; depois, o que aconteceu; embaixo, o contrato de hoje. O "Resumir até o
  próximo jogo grande" para quando a janela abre com proposta.
- **Troca no meio do ano** (`S.fcMove`): a liga do clube novo começa na rodada em que está (as rodadas de antes são jogadas
  sem você e a tabela chega com os pontos do time), ocupando as datas de liga que restam; a copa e o continental ficam com o
  clube de antes ("Ficou com o …"); palpites abertos da liga antiga voltam; a torcida antiga lembra (−10). Os jogos e gols de
  antes da troca ficam na passagem anterior (`fc.pre`); o X e o jornal noticiam.
- **Validação**: `craque_invariantes.js` ganhou a regra 5 (a liga fecha certa no fim do calendário: todo time com todas as
  rodadas, gols e pontos batendo, você na tabela do seu clube), com o robô assinando, ficando ou forçando troca para um clube
  qualquer: 0 falhas em 120 carreiras (800+ trocas). Simulador (1000 carreiras): 0,8 troca no meio do ano por carreira,
  notas S18 contra S19 sem a janela, dinheiro e ritmo iguais. O robô troca se o clube novo é mais forte (bem mais forte quando
  ainda está vivo na copa ou no continental, porque trocar perde a taça). `JANELA=nao` desliga.

### Fase 4 do plano, parte 2 · 2026-11-04 · Sondagens, boato e o empresário

- **Sondagens** (`S.FC_SOND`): quatro jogos antes da janela o empresário conta no Chat quem perguntou por você, e o boato sai
  no X e no jornal. Na janela, cada sondagem vira proposta conforme você jogou desde então (nota média 6,8 ou mais: 85%; sem
  jogar: 65%; abaixo: 45%). O app Mercado mostra os clubes que perguntaram e essas chances; quando esfria, o empresário avisa.
- **Empresário** (`S.FC_EMP`): de bem com você (tom bom), traz mais sondagens e de clubes um pouco mais fortes. Prefere a
  proposta que paga mais (marcada no cartão; empate não tem preferência): seguir dá +3 na relação, ir contra dá −4 e uma
  mensagem. Cobra comissão em toda troca de clube do Jogo a Jogo (uma semana do salário novo, mostrada no cartão).
- Validação: invariantes 0 falhas; simulador (600): 0,8 troca no meio do ano por carreira, notas S18, dinheiro igual; e2e 0
  problemas; fotos da sondagem no celular e no app, das propostas com a preferência e da troca.

### Fase 4 do plano, parte 3 · 2026-11-04 · Pedir aumento, pedir para sair e empréstimo no meio do ano (fase 4 pronta)

- Na janela do meio do ano, o app Mercado ganhou "Com o {clube}":
  - **Pedir aumento** (`S.fcRenew`, `S.FC_RENEW`): renovação com +25% de salário e mais 2 anos, com luvas de renovação.
    A chance vem da nota do ano e da relação com o técnico (10% a 90%, mostrada antes). Um "não" custa −3 com o técnico.
  - **Pedir para sair** (`S.fcAskOut`): técnico −5 e torcida −5. O empresário arruma mais uma proposta na hora, de um clube
    do seu nível onde você jogaria; sem trocar agora, a janela do fim do ano abre.
  - **Esperar** é o "Ficar".
- **Empréstimo no meio do ano**: quem tem até 23 anos e está no banco recebe proposta de empréstimo até o fim da temporada
  (o clube dono segue pagando; sem luvas nem comissão). A liga do clube do empréstimo entra como na troca, e no fim do ano
  ele volta (`S.endLoan`).
- **Fase 4 pronta.** Critério: trocar de clube no meio do ano não quebra o calendário nem a tabela. Regra 5 do
  `craque_invariantes.js`: 0 falhas em 120 carreiras com cerca de 900 trocas, empréstimos, aumentos e pedidos de saída. Simulador
  (400): 0,8 troca no meio do ano por carreira (a maioria para clube maior, ~4% empréstimos), notas S18 contra S19 sem a
  janela, dinheiro igual; e2e 0 problemas.

### Fase 5 do plano, parte 1 · 2026-11-04 · O torneio do continente

- No Jogo a Jogo, nos anos pares sem Copa (2028, 2032...), a seleção joga o torneio do continente (`S.natTour`,
  `S.natContStart`): **Eurocopa, Copa América, Copa Ouro, Copa Africana ou Copa da Ásia**, pela confederação do país
  (`S.NAT_CONF`). É o mesmo motor da Copa (`c.wcRun`, kind `nat2`): grupo de quatro e mata-mata, 7 jogos, com lances e
  pênaltis. Continente com poucas seleções recebe convidados (México, EUA e Canadá na Copa América; Japão, Coreia, Catar... na
  Copa Ouro). Assim há um torneio grande a cada 2 anos. A convocação usa a regra de hoje (`S.wcCall`).
- O título entra na Sala de Troféus e dá fama (+30), mas ainda não soma na nota final: o peso fica para a fase 6 (legado).
- Simulador (400): mediana de 4 torneios do continente por carreira, notas iguais (S18). Invariantes 0 falhas; e2e 0 problemas.

### Fase 5 do plano, parte 2 · 2026-11-04 · Seleção no estilo do Jogo a Jogo

- No Jogo a Jogo, a tela da Copa do modo rápido (todos os jogos numa lista corrida) sai:
  - **Convocação pelo celular**: o técnico da seleção (ou do clube, no Mundial de Clubes) manda a mensagem, abre a lista de
    convocados, e "Ir para a concentração".
  - **Concentração** entre os jogos: o próximo jogo (fase e adversário; no mata-mata, "no sorteio"), a tabela do grupo e o
    caminho até aqui.
  - **Um jogo por tela**: o relógio corre (toque acelera), para no lance (minigame) e nos pênaltis, e no fim mostra o resultado,
    a tabela do grupo e "Voltar à concentração". No último jogo, a tela final de sempre.
  - "Simular até o fim" (e "Simular o torneio" na convocação) seguem na lista corrida.
- Validação: Copa América inteira pela interface no celular e no computador (sem erros); e2e no Jogo a Jogo com 8 carreiras,
  0 problemas, passando por convocação, concentração e jogos (`wc:jogo`, `wc:volta`).

### Fase 5 do plano, parte 3 · 2026-11-04 · A seleção no jornal (fase 5 pronta)

- O jornal do Jogo a Jogo, de vez em quando (a cada 8 jogos, a partir dos 17 anos), traz a seleção: a posição do país no
  ranking (`S.natRank`, pela força), o próximo torneio (`S.natNext`: Copa do Mundo ou o do continente, com o ano) e a sua
  situação na lista (nome certo, na briga ou a nota que a seleção pede). Eliminatórias e amistosos ficam fora do jogo.
- **Fase 5 pronta.** Critério: uma Copa do Mundo e um torneio do continente passam inteiros, jogo a jogo, nas carreiras pela
  interface. e2e no Jogo a Jogo: 8 + 8 + 12 carreiras passando por convocação, concentração e jogos (`wc:jogo`, `wc:volta`)
  de Copas e torneios do continente; uma rodada teve 1 problema que não se repetiu nas duas seguintes (20 carreiras, 0).

### Fase 6 do plano, parte 1 · 2026-11-04 · Metas do ano e pontos de legado (a nota fica)
- `engine/legado.js` (novo): três metas por temporada no Jogo a Jogo. A do clube é a meta da posição de antes (gols,
  assistências ou jogos sem sofrer gol); cumprir dá +6 de técnico, falhar −4. A do empresário: quem pouco joga, jogar um
  tanto de jogos; quem está logo abaixo do corte da seleção, ser chamado; os outros, a nota média da vitrine (perto da
  mediana da posição: ATA 8,2, MEI 8,0, ZAG 7,6, GOL 7,7, um pouco mais para a carta forte); mexe na relação com ele (+6/−3).
  O sonho: escolha 1 de 3 na agenda (um título; o prêmio da posição; Bola de Ouro com carta 82+, melhor jovem até 20 anos,
  senão terminar entre os quatro). O tamanho segue a dificuldade no simulador (5, 10, 20 ou 35 de legado).
- Pontos de legado (`S.legacy`): metas cumpridas, títulos (liga 30, copa 15, continental 45, Mundial 40), prêmios (Bola de
  Ouro 90, prêmio da posição 12 a 40 conforme a posição, porque o do goleiro sai bem menos), ídolo (temporadas no mesmo
  clube depois da quarta ×6 e os títulos lá ×4) e seleção (Copa 120, torneio do continente 50, jogos 1, gols 2). Aqui o
  título do continente ganha peso, como ficou combinado na fase 5.
- Na tela: bloco "Metas do ano" na agenda (barra de progresso, escolha do sonho), aviso no celular enquanto o sonho não foi
  escolhido, "Metas do ano" no resumo da temporada com o legado somado, e "Legado da carreira" na ficha.
- Simulador (300 carreiras): metas cumpridas clube 60%, empresário 38%, sonho 36%. Legado mediano ATA 1882, MEI 1440,
  ZAG 1518, GOL 1289 (antes da correção do goleiro); de onde vem: títulos 34-49%, prêmios 13-28%, metas ~22%, seleção 5-10%,
  ídolo 6-9%. Correlação com a nota 0,95. Notas iguais às de antes (a nota não muda nesta parte).
- Combinado: a nota S a D só sai do Jogo a Jogo depois da resposta do Silvio sobre os cortes (conversa do treino).
- Ferramentas: `craque_sim.js` imprime "Metas cumpridas" e o legado por posição (SONHO=id força um sonho);
  `craque_invariantes.js` confere as metas de cada temporada e o legado; e2e escolhe o sonho; fotos `agenda-metas` e
  `agenda-sonho` em `craque_telas_jaj.js`.

### Fase 6 do plano, parte 2 · 2026-11-05 · O legado no lugar da nota e o Seu Hall
- Decisão do Silvio (2026-11-05, conversa do treino): a calibragem da nota do modo padrão não serve para o Jogo a Jogo
  ("imagina a pessoa jogando 2 semanas seguidas certinho e tirando D"). O Jogo a Jogo termina com o legado; a nota S a D
  fica só na Carreira Rápida. Ele também quer um motor próprio para o Jogo a Jogo e outro para o Treinador: o do
  Treinador já está na fase 8; a simulação do Jogo a Jogo fica como está até ele pedir mais.
- Fim de carreira do Jogo a Jogo: a animação "Sua nota" virou "Seu legado" (cada fonte numa linha, o total correndo),
  a medalha da nota virou a do legado, sem barra de pontos e sem "faltaram N para a nota"; "De onde veio o legado" no
  resumo. A letra que sobra (`S.legacyTone`: S 2600+, A 1900+, B 1300+, senão C, nunca D) só dá o tom do jornal da
  despedida e a cor da carta. "Promessa que não vingou" vira "Carreira de muita luta".
- Seu Hall (Minhas carreiras): "Seu Hall · Jogo a Jogo" com as carreiras pelo legado, a carta de cada uma (toque abre
  a carta em 3D), anos, pico, títulos e de onde veio o legado. Guardado em `climbix-hall-jaj-v1` (vai para a nuvem com
  a conta). O Hall de antes vira "Carreira Rápida". "Última carreira" mostra o legado quando foi Jogo a Jogo.
- Falta na fase 6: o ranking Mundial por legado (servidor) e os Amigos.

### Fase 6 do plano, parte 3 · 2026-11-05 · Ranking por legado e Amigos (fase 6 pronta)
- `api/rank.php`: colunas `mode` e `leg` (criadas sozinhas no banco que já existe). O jogo manda o modo e o legado a
  cada temporada; Jogo a Jogo não manda nota. Nova categoria `m=legado` (só Jogo a Jogo, inclusive em andamento) e a
  Pontuação passa a ser só da Carreira Rápida. `?a=friends&n=a|b` devolve, por apelido, o maior legado, a maior
  pontuação e a carreira mais recente.
- Ranking: chip "Legado" primeiro. Embaixo, "Amigos": seguir um apelido (confere se existe), lista pelo legado com a
  carreira de agora ("jogando agora" ou "encerrada") e a melhor da Carreira Rápida; × deixa de seguir. Os apelidos
  seguidos ficam em `climbix-amigos-v1` (vão com a conta).
- Testado com o PHP local (banco no formato antigo + migração): salvar, ranking por legado, pontuação sem Jogo a Jogo,
  amigos achados e não achados; fotos `ranking-legado` e `ranking-amigos`.
- Fase 6 pronta. Próxima: fase 7, Treinador v1 (confirmar com o Silvio a proposta de fama e experiência do técnico).

### Fase 7, parte 1 · 2026-11-05 · Motor do Modo Treinador (sem tela ainda)
- `engine/coach.js`: carreira de técnico separada do jogador (`co`), começo "de baixo" ou "qualquer clube", propostas
  pela fama (uma costuma ser de quem briga lá em cima numa divisão menor), elenco de 25 sorteado por clube e temporada,
  cinco formações e três estilos, escalação do auxiliar, partida minuto a minuto que para em gol, vermelho, lesão e
  intervalo (5 trocas, muda formação e estilo), cansaço e moral, meta da diretoria pela posição esperada (com folga de 2),
  confiança escondida no tom do presidente, ultimato "vença 2 dos próximos 3", fama e experiência como o Silvio confirmou
  (leitura de jogo, motivação, negociação). Os outros jogos da rodada usam o placar simples do Jogo a Jogo.
- `tools/craque_treinador.js` (200 carreiras × 10 temporadas): 2,55 gols por jogo, mandante 46% / empate 25% / visitante
  29%; meta cumprida 55%, demitido em 17% das temporadas, ultimato em 23% (salvo 28%); títulos por carreira 1,8 em média
  (45% sem nenhum), de baixo 0,9 e qualquer clube 2,6; o save no meio da temporada termina igual; 63 ms por temporada.
- Calibragem: o robô perdia por cansaço (rival sempre descansado) e trocas que pioravam o time; agora o rival também
  cansa, a troca só entra se o reserva rende mais, a moral volta para 60 e o esperado da diretoria usa o que o robô faz
  contra um igual (`S.CO.ppg`).
- Próximo: a tela (ingresso Treinador, criação, propostas, elenco e escalação).

### Fase 7, parte 2 · 2026-11-05 · Telas do Treinador e tática de verdade
- Pedido do Silvio: "algo estratégico de verdade... uma formação melhor contra outra... afinidade com o público entusiasta
  de simuladores". O confronto tático (era da fase 8) veio para cá. Decisões nos cartões: antes do jogo só setas e
  palavras (sem números); funções por jogador ficam para a versão 2.
- Motor: 7 formações (vaga com lado e linha), 6 estilos com ponto forte e fraco (posse fura retranca e sofre com pressão;
  pressão perde para contra-ataque; contra-ataque trava na retranca; retranca sofre com posse e cruzamento; jogo pelos
  lados precisa de gente aberta), confronto por setor, escola de cada clube e o rival mudando o plano aos 65' e 78'.
  `tools/craque_taticas.js`: 0 alertas (com elencos iguais e com o seu 6 pontos mais fraco). Robô que escolhe a melhor
  tática a cada jogo: meta 75% e demissão 6% contra 60% e 14% do robô que nunca muda.
- Telas (`ui/coach.js`): ingresso Treinador, criação (nome, país, começo), propostas com a meta, chegada, central (próximo
  jogo, olheiro, presidente, tabela), time (campo com toque para trocar, formação, estilo, confronto em setas e palavras),
  resultado com o relato, demissão, fim da temporada com fama e pontos de experiência. Jogo ainda sai direto no resultado.
- Visual do técnico (aparência) fica para quando houver arte. Próximo: partida ao vivo com paradas e trocas.

### Fase 7, parte 3 · 2026-11-05 · Partida ao vivo do Treinador
- Decisões do Silvio: partida ao vivo antes do Caderno do técnico; nova regra "visual antes do código" (a primeira
  versão codada não foi publicada; proposta em https://claude.ai/artifact/VG7gdG6mxshQCbWg7yYPDW, aprovada); trocas
  arrastando no campinho; jogo mais longo (1× uns 2 min, 3× uns 40 s, ⏩ vai ao fim).
- Motor: `S.coMatchStep(co, m, until)` anda minuto a minuto (parar quando quiser), `m.mom` (quem manda, 0 a 100 por
  minuto), lance com o lado de onde veio (`e.l`: e, d, c), chutes no gol (`m.ot`), leitura do auxiliar `S.coRead`
  (setor em que mais sofre, o que dá certo, cansados; palavras e setas).
- Tela (`live` em `ui/coach.js`): placar com relógio e a faixa de quem manda (`U.lvMom`), campinho com as bolinhas dos
  dois times, bola e a faixa de onde eles atacam, chutes/no gol/posse, o auxiliar, lance a lance e a barra de baixo
  (1×, 3×, ⏩ e "Parar e mexer"). Parada: cartão que sobe com o lance, a leitura do auxiliar, Trocar e Tática. Trocas:
  campinho em pé, arrastar reserva até titular (troca) ou titular até titular (trocam de posição), tocar também
  funciona. Tática: formações em mini campos, estilos em cartões e o confronto em palavras. Resultado: placar, faixa
  dos 90' com a marca da sua mudança, chutes/no gol/posse e a linha do tempo. Computador: três colunas.
- Jogo largado no meio não volta atrás (`co.live`): o auxiliar termina o jogo.
- Classe `.lv-help` já era do livre.js: o texto de ajuda das trocas é `.lv-hint`.

### Fase 7, parte 4 · 2026-11-05 · Caderno do técnico
- Decisão do Silvio: confronto de tática se descobre jogando (como Game Dev Tycoon), nada explícito no começo da
  carreira, seta e palavra, nunca número. Proposta visual aprovada antes do código ("Gostei do caderno").
- Motor (`engine/coach.js`): a verdade de cada casa é o confronto entre dois times iguais (`S.coCadTruth`: estilos no
  4-4-2, formações no equilibrado; ↑ acima de 4% de vantagem, ↓ abaixo, = no meio; 8↑ 8↓ 20= nos estilos, 7↑ 6↓ 36=
  nas formações). A partida conta quanto tempo cada confronto ficou em campo (`m.pm`) e como o rival jogou (`m.tm`).
  Depois do jogo (`cadNote`, em `log.cad`): anota 1 casa por jogo (2 com Leitura de jogo 4), alternando estilo e
  formação; a primeira vez a lápis (certo com 60% + 5% por ponto de Leitura, até 95%), a segunda a caneta (o valor
  certo, "corrigido" se o lápis errou). Rivais guardam a formação e o estilo do último jogo. Palpite do auxiliar
  (`S.coHint`, um por rodada, acerta o melhor estilo em 60%): só conta se você jogou daquele jeito; `co.cad.aux`
  guarda os 5 últimos. Save sem migração: `co.cad` nasce quando precisa.
- Telas (`ui/coach.js`): "Do seu caderno" em Seu time (no `#co-caderno` da tela nova, via `U.coCaderno`) e na Tática
  ao vivo (no lugar do confronto em palavras, que saiu), Palpite do auxiliar com PODE ERRAR, "Anotado no caderno" no
  resultado, tela do caderno (Estilos, Formações, Rivais; no computador as duas páginas lado a lado) e a anotação
  aberta (seta, lápis ou caneta, porquê por setor, de que jogos veio). Botão Caderno na central do clube.
