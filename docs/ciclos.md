# Ciclos de desenvolvimento

Registro de cada ciclo (como rodar: seção "Ciclo de desenvolvimento" do `CLAUDE.md`). O próximo ciclo lê isto para
não repetir o que já foi decidido.

## Ciclo 1 · 2026-10-29 (base: 88a9d26, no ar como sw craque-89e222da)

**Checagens:** simulador S10/A26/B32/C19/D14, 9min34s (no alvo) · decisões 0 alertas · estilos 0 alertas · decidir bem
vale +7,6% · 32 carreiras no celular, 0 problemas · 150 fotos (390×844, 360×640, 1440×900), 0 erros de console ·
erros reais no site: nenhum novo na versão no ar (só avisos de 3D sem WebGL no iPhone, que já caem para a bola 2D).

**Corrigido:**
- Personalizar visual no computador: metade esquerda vazia; agora o jogador grande fica à esquerda e as opções à direita.
- X: título vindo do banco (1 jogo, nota 6,2) ganhava post "1 jogos … Números de elite"; plural certo e sem página
  elogiando números quando a temporada teve menos de 10 jogos ou nota abaixo de 7.
- Relâmpago: "1 gols em 5 cobranças" → plural certo. Fim de carreira: "Copas do Mundo … 1 gols" → plural certo.
- Tradução inglesa: 5 textos que estavam sem tradução.
- Ferramentas novas: `tools/craque_ciclo.sh` (todas as checagens num resumo) e `tools/craque_lint_textos.py`.

**Deixado (já conhecido do polimento de 2026-10-28, continua decisão de design):** recarregar no meio da temporada ao
vivo pula o resumo; Tab preso, Espaço/Enter na abertura do lance; nomes longos de uma palavra no placar da Copa.

**Para o próximo ciclo olhar:** desempenho em 4G lento (não medido neste), som, celular deitado.
