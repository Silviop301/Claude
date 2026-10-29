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

## Roteiro (rodadas menores e verificáveis)

1. **Técnica + validação** (feita, abaixo): ferramenta do ciclo, bugs de texto, tela de personalizar no computador.
2. ~~**Gameplay: decisões que pesam.**~~ (feita, abaixo) Medir por evento quanto cada escolha muda a carreira (`craque_decisoes.js`),
   reforçar as de efeito invisível e mostrar a consequência quando ela volta. Meta: decidir bem ≥ +12% sem mudar a
   distribuição de notas.
3. ~~**UI/UX no computador:**~~ (feita, abaixo) resumo da temporada, ranking e ficha sem buracos; fim de carreira mais curto.
4. **Gameplay: variedade no meio da carreira.** Mais aberturas de evento e eventos que só aparecem em fases certas.
5. **Inovação:** uma ideia nova de carreira pessoal, proposta ao Silvio antes (muda a proposta do jogo).
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

