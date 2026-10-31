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
| 1 · Ritmo e partida | Temporada em ~1 h no simulador e pela interface; um cartão principal por tela (regra "Tela limpa", fotos antes/depois); faixa de progresso em todo jogo vivido; **o save do Jogo a Jogo recomeça aqui, uma vez só**; metas da semana trocam e o XP do perfil vem por temporada | **em andamento**: parte 1 (jogos vividos, resumidos e no banco; save novo), parte 2 (um lance seu em todo jogo), parte 3 (tela limpa no celular e no ao vivo), parte 4 (rodada como na TV), parte 5 (faixa "Seu ano") |
| 2 · Celular com pessoas | Nenhum convite com clique óbvio na auditoria; 20 temporadas sem convite repetido demais | |
| 3 · Dinheiro com risco | No simulador, 15% a 25% das carreiras passam por aperto e menos de 5% terminam quebradas | |
| 4 · Mercado em duas janelas | Trocar de clube no meio do ano não quebra calendário nem tabela | |
| 5 · Seleção | Copa do Mundo e torneio do continente passam inteiros, jogo a jogo, nas carreiras pela interface | |
| 6 · Metas, legado e Hall da Fama | Toda carreira termina no Hall da Fama, com pontos de legado no lugar da nota S a D | |
| 7 · Treinador v1 | O robô técnico joga 10 temporadas no simulador, com títulos e demissões numa faixa realista | |
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
