# Climbix · Prompts de teste para o Fable

Três tarefas reais para comparar com o trabalho feito até aqui. Cada prompt é independente: cole um por sessão.
Os três trabalham num branch próprio, sem publicar no site. Depois eu reviso e comparo antes de qualquer coisa ir ao ar.

---

## Prompt 1 · Conteúdo: 20 eventos novos e revisão de textos

```
Você vai trabalhar no Climbix, um jogo de carreira de futebol para celular, feito em JavaScript puro (sem build), no repositório silviop301/claude, pasta craque/. O site está no ar em climbix.app e é publicado automaticamente a cada push no branch claude/gracious-darwin-9gdlfp.

REGRAS DE TRABALHO
- Crie o branch fable/eventos a partir de claude/gracious-darwin-9gdlfp e faça commits só nele. NÃO faça push para claude/gracious-darwin-9gdlfp (isso publicaria o site). Não abra pull request.
- Responda e escreva tudo em português do Brasil.
- Não gere chaves SSH nem credenciais. Nunca desative a verificação TLS nem remova HTTPS_PROXY.
- Ao terminar mudanças em craque/, rode: python3 tools/craque_sw.py (atualiza a versão dos arquivos) e node tools/craque_twemoji.js (baixa os emojis novos usados).

O JOGO
O jogador vive uma carreira inteira, uma temporada por vez. Entre as temporadas aparecem eventos com uma escolha (por exemplo: proposta de outro clube, briga no vestiário, convite para um comercial). A ideia é um jogo simples, aleatório e viciante, para jogar várias carreiras seguidas e sempre ver algo novo.

TAREFA A · 20 EVENTOS NOVOS
1. Leia craque/src/engine/events.js e craque/src/engine/events2.js (cerca de 94 eventos). Entenda o formato:
   - id, icon (um emoji), tone ('green' oportunidade, 'red' risco, 'blue' decisão), weight (chance relativa), max (vezes por carreira)
   - when(c): quando o evento pode aparecer (idade, posição, fama, clube, temporada, características etc.)
   - build(c): { title, text, options: [{ label, hint }] }. O hint mostra o efeito de cada opção, sem esconder nada.
   - resolve(c, ev, i): { ok, text, fx }. Os efeitos aceitos em fx: min (minutos), form, inj, goalMul, assistMul, fame, money, attr ({ chave: valor }), move. Também existem bump(c, 'fans' | 'coach', valor) e boost(c, n) (reforço do elenco).
   - Para nomes de clube use os artigos de D: D.o(nome) "o Flamengo", D.ao(nome) "ao Flamengo", D.do(nome) "do Flamengo".
2. Escreva 20 eventos novos em craque/src/engine/events2.js, no array MORE, seguindo o mesmo formato:
   - Variedade de fases: base (até 19 anos), auge, veterano (33+), aposentadoria chegando.
   - Variedade de temas: vida fora de campo, redes sociais, família, vestiário, imprensa, torcida, mercado, seleção, superstição, situações engraçadas.
   - Pelo menos 5 eventos realmente engraçados.
   - Pelo menos 4 eventos específicos de posição (goleiro, zagueiro, meia, atacante).
   - Efeitos na mesma escala dos eventos existentes (compare com eventos parecidos antes de escolher números). Nenhuma opção pode ser sempre a melhor: cada escolha tem ganho e custo.
   - Textos curtos: título com até cerca de 40 caracteres, texto com até 2 frases, label e hint com até cerca de 60 caracteres.
   - Nada de termos de uma torcida só (ex.: "fiel" é do Corinthians, "nação" do Flamengo, "tricolor" serve para vários clubes). Os textos precisam servir para qualquer um dos 800 clubes do jogo.
3. Teste: node tools/craque_sim.js 2000. Verifique que não há erro e que cada evento novo aparece em alguma carreira (se precisar, conte as ocorrências com um script temporário que não deve ser commitado).

TAREFA B · REVISÃO DE TEXTOS
Revise todos os textos mostrados ao jogador em craque/src/engine/*.js, craque/src/ui/*.js, craque/src/data.js e craque/src/social-data.js. Procure:
- erros de português (concordância, crase, acentuação, pontuação);
- termos que só servem para uma torcida ou um clube;
- frases repetidas ou quase iguais;
- textos que podem sair estranhos com algum marcador ({n}, {time}, artigos o/a, plural de 1 gol etc.).
Corrija o que tiver certeza e liste o resto num relatório.

ENTREGA
- Commits no branch fable/eventos: um commit para os eventos e outro para as correções de texto.
- Um relatório em docs/fable-relatorio-conteudo.md com:
  - a lista dos 20 eventos (título, quando aparece, opções e efeitos, em uma linha cada);
  - quantas vezes cada um apareceu nas 2000 carreiras simuladas;
  - as correções feitas (antes → depois) e os problemas que você não corrigiu, com o motivo.
```

---

## Prompt 2 · Balanceamento com o simulador

```
Você vai trabalhar no Climbix, um jogo de carreira de futebol para celular, feito em JavaScript puro (sem build), no repositório silviop301/claude, pasta craque/. O site está no ar em climbix.app e é publicado automaticamente a cada push no branch claude/gracious-darwin-9gdlfp.

REGRAS DE TRABALHO
- Crie o branch fable/balanceamento a partir de claude/gracious-darwin-9gdlfp e faça commits só nele. NÃO faça push para claude/gracious-darwin-9gdlfp. Não abra pull request.
- Responda e escreva tudo em português do Brasil.
- Não gere chaves SSH nem credenciais. Nunca desative a verificação TLS nem remova HTTPS_PROXY.
- Depois de mudar arquivos em craque/, rode python3 tools/craque_sw.py.

O JOGO E A FILOSOFIA
Carreira de futebol temporada a temporada: escolha de clube, características (traits), pontos de evolução, foco nos treinos, eventos, lances decisivos em minigame, títulos, prêmios, Copa do Mundo, cartas especiais e uma nota final da carreira (S, A, B, C...). Princípios do dono do jogo:
- simples, aleatório e viciante; jogar várias carreiras seguidas;
- nenhuma vantagem passa de uma carreira para a outra (só coleções cosméticas);
- todas as posições (ATA, MEI, ZAG, GOL) devem ser igualmente boas de jogar;
- o que ajuda ou atrapalha aparece na tela, nada de números escondidos.

FERRAMENTA
node tools/craque_sim.js N [casual] simula N carreiras com um robô "esperto" (ou "casual") e imprime: builds diferentes, ídolos, percentis de gols, assistências, títulos e fama, Copa e Mundial de Clubes, acerto nos lances decisivos, Bola de Ouro, notas por posição, notas finais, vereditos, duração estimada, conquistas e pontos de evolução não usados. Variáveis de ambiente: POS=ATA,MEI (posições), TRAIN=leve|normal|forte|maximo (foco nos treinos), FORCE=id / AVOID=id (forçar ou evitar uma característica).

METAS ATUAIS (medidas com o robô esperto, 2000+ carreiras)
- Nota S: entre 11% e 16% das carreiras.
- Bola de Ouro: entre 10% e 12% das carreiras.
- Cartas especiais: cerca de 0,36 por carreira, cerca de 70% das carreiras sem nenhuma.
- Duração estimada de uma carreira (linha "Duração" do simulador): não pode aumentar em relação à linha de base.
- Nenhuma posição com S muito acima ou abaixo das outras (diferença máxima de cerca de 5 pontos percentuais).
- Foco nos treinos: nenhum dos quatro (leve, normal, forte, máximo) pode ser claramente o melhor em todas as métricas.
- Nenhuma característica pode ser obrigatória: compare FORCE e AVOID de cada uma.

TAREFA
1. Rode a linha de base: node tools/craque_sim.js 3000 e node tools/craque_sim.js 3000 casual. Rode também com POS de cada posição e com TRAIN de cada foco.
2. Para cada característica em D.TRAITS (craque/src/data.js), rode FORCE=id e AVOID=id (1000 carreiras cada) e monte uma tabela com S%, Bola de Ouro% e gols/assistências medianos.
3. Identifique o que foge das metas e as causas no código (craque/src/engine/*.js).
4. Faça ajustes pequenos e pontuais nos números (evite reescrever sistemas). Depois de cada ajuste, rode de novo e confira se não quebrou outra meta.
5. O simulador usa sementes diferentes a cada carreira; antes de concluir que algo mudou, confirme que a diferença é maior que o ruído de duas rodadas iguais.

ENTREGA
- Commits no branch fable/balanceamento, um por ajuste, com a justificativa na mensagem.
- Um relatório em docs/fable-relatorio-balanceamento.md com:
  - tabela antes × depois de todas as métricas das metas;
  - tabela das características (FORCE/AVOID);
  - cada mudança feita (arquivo, valor antigo → novo, por quê);
  - o que você recomendaria mudar mas não mudou, com o motivo.
```

---

## Prompt 3 · Revisão de código e caça a bugs

```
Você vai trabalhar no Climbix, um jogo de carreira de futebol para celular, feito em JavaScript puro (sem build), no repositório silviop301/claude, pasta craque/. O site está no ar em climbix.app e é publicado automaticamente a cada push no branch claude/gracious-darwin-9gdlfp.

REGRAS DE TRABALHO
- Crie o branch fable/revisao a partir de claude/gracious-darwin-9gdlfp e faça commits só nele. NÃO faça push para claude/gracious-darwin-9gdlfp. Não abra pull request.
- Responda e escreva tudo em português do Brasil.
- Não gere chaves SSH nem credenciais. Nunca desative a verificação TLS nem remova HTTPS_PROXY.
- Depois de mudar arquivos em craque/, rode python3 tools/craque_sw.py e node tools/craque_twemoji.js.

ARQUITETURA
- Sem build. Globais: CRAQUE_DATA (D, craque/src/data.js e social-data.js), CRAQUE_SIM (S, craque/src/engine/*.js), CRAQUE_UI (U, craque/src/ui/*.js). G.c é a carreira atual, salva no localStorage (com sincronização na nuvem em ui/cloud.js).
- Minigames: craque/src/kick.js (pênalti e falta), craque/src/defend.js (goleiro, zagueiro e meia), personagens em craque/src/chars.js e avatar em craque/src/avatar.js.
- Emojis viram Twemoji (craque/assets/tw/<código>.svg); o service worker (craque/sw.js) é gerado por tools/craque_sw.py.
- Servidor local: python3 -m http.server 8765 na raiz do repositório e abrir http://localhost:8765/craque/. Playwright está instalado (NODE_PATH=/opt/node22/lib/node_modules; o Chromium já está em /opt/pw-browsers, não rode "playwright install").

BUGS PARECIDOS QUE JÁ APARECERAM (procure outros do mesmo tipo)
- "undefined" na tela: um mapa de textos por tipo de lance não tinha a entrada do tipo novo 'pass' (meia).
- Termo de uma torcida só ("fiel") usado para qualquer clube.
- CSS de um seletor amplo (".x svg") afetando SVGs aninhados.
- Botões aninhados (<button> dentro de <button>) esvaziando um cartão.
- Saves antigos sem um campo novo (migração faltando).

TAREFA
1. Leia o código de craque/src. Procure em especial:
   - mapas e switch por tipo (posição, tipo de lance, tipo de evento, liga, país) que não cobrem todos os valores possíveis;
   - textos que podem mostrar undefined, NaN, null ou [object Object];
   - campos novos da carreira usados sem valor padrão para saves antigos;
   - erros de lógica em sorteios, limites (idade, fama, dinheiro) e contagens de estatísticas;
   - vazamentos: requestAnimationFrame e setInterval que continuam depois que a tela muda;
   - layout em 320 px e 390 px de largura (rolagem horizontal, botão cortado, texto estourando);
   - emojis usados no código sem o SVG correspondente em craque/assets/tw/.
2. Escreva um teste com Playwright que jogue carreiras inteiras no navegador (criar personagem, escolher clube, passar por pré-temporada, eventos, lances com config moments 'auto', temporadas, janela, aposentadoria). Rode pelo menos 30 carreiras em cada posição, guarde erros do console e procure "undefined", "NaN" e "null" no texto da tela a cada passo.
3. Para cada bug, registre: arquivo e linha, como reproduzir, gravidade (alta, média, baixa) e a correção.
4. Corrija os bugs em que você tem certeza da causa e da solução, um commit por bug. Os de solução incerta ficam só no relatório.

ENTREGA
- Commits no branch fable/revisao.
- O teste de Playwright em tools/craque_e2e.js (com instruções de uso no topo do arquivo).
- Um relatório em docs/fable-relatorio-bugs.md: tabela com todos os bugs encontrados (corrigido ou não), gravidade, reprodução e solução.
```
