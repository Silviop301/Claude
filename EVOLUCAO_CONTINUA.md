# Evolução contínua do Climbix

Acompanhamento do processo de `docs/prompt-mestre-evolucao.md` (como rodar: seção "Evolução contínua" do `CLAUDE.md`).
Cada rodada acrescenta uma entrada no Registro e atualiza o Diagnóstico e o Roteiro.

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
