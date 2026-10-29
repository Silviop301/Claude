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
2. **Gameplay: decisões que pesam.** Medir por evento quanto cada escolha muda a carreira (`craque_decisoes.js`),
   reforçar as de efeito invisível e mostrar a consequência quando ela volta. Meta: decidir bem ≥ +12% sem mudar a
   distribuição de notas.
3. **UI/UX no computador:** resumo da temporada, ranking e ficha sem buracos; fim de carreira mais curto.
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
