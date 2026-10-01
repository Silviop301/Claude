# Climbix · Briefing de design: personagens dos minigames

## Contexto
Os minigames são o lance decisivo da temporada (cerca de 10 segundos). A cena de fundo já existe e fica como está: estádio à noite, arquibancada, placa de LED, gramado em perspectiva e gol com rede. O que falta é a arte dos **personagens** de três minigames, no mesmo traço do goleiro e da barreira atuais e da nova criação de personagem (`avatar.js`): contorno escuro grosso, proporção realista e sombra lateral simples.

Arquivos de referência (já no projeto):
- `craque/assets/sprites/goleiro.png`: quadros de 549×500, 4 colunas, um quadro por linha na leitura.
- `craque/assets/sprites/barreira.png`: 16 quadros de 124×250, em 4 colunas por 4 linhas.
- `craque/src/avatar.js`: o jogador da criação de personagem, com pele, cabelo, barba e equipamento.
- Cena: `craque/src/kick.js`. O SVG tem 360×320; o gol vai de x 40 a 320, com o travessão em y 70 e o chão em y 190.

**Formato da entrega:** folha de sprites em PNG com fundo transparente, todos os quadros do mesmo tamanho e o ponto dos pés sempre no mesmo lugar do quadro. Basta informar o tamanho do quadro e o ponto dos pés. Se preferir, a peça pode ser entregue em SVG por camadas, no mesmo esquema do `avatar.js`, o que permite trocar pele, cabelo e cor da camisa por código.

**Cores do uniforme:** cada personagem precisa trocar a cor da camisa e do calção, que vêm do clube (são 800 clubes). Para isso, desenhe a camisa e o calção em **cinza neutro em camadas separadas** (ou em SVG), para eu poder colorir. Pele, cabelo e barba também precisam ser variáveis.

---

## 1. Barreira (falta)
**Problema hoje:** todos os jogadores são iguais (mesma pele e cabelo) e a cor é sempre vermelha.

**O que preciso:**
- **Variedade:** pelo menos 6 rostos diferentes, combinando pele (clara, média, morena, negra), cabelo (curto, raspado, black, tranças, careca) e barba (sem, rala, cheia). A barreira escolhe 3 a 5 deles por cobrança.
- **Pose:** de frente para o batedor, com as mãos cruzadas na frente do corpo (protegendo), como já é hoje.
- **Quadros:**
  - parado respirando: 4 quadros (já uso 0 a 3);
  - pulo, todos juntos e só no chute: 4 subindo e 4 descendo (já uso 8 a 15). Já está programado para todos pularem no mesmo instante, só na hora do chute.
- **Tamanho:** o mesmo de hoje (quadro de 124×250, pés em y 248) ou proporcional.
- **Uniforme:** camisa e calção recoloríveis, com o número nas costas opcional.

## 2. Zagueiro: carrinho no contra-ataque
**Problema hoje:** é o mais fraco visualmente. É um campo visto de cima, com duas bolinhas numeradas.

**Proposta de cena:** a mesma do pênalti (estádio e gol em perspectiva), com o gol sendo o nosso.
- O **atacante adversário** vem conduzindo a bola em diagonal, de baixo à esquerda (perto da câmera) até a área. Ele diminui de tamanho com a perspectiva.
- O **zagueiro**, que é você, com o visual da criação de personagem, espera à direita e dá o carrinho no toque.
- Uma **faixa verde** no gramado marca o trecho certo. A faixa é desenhada por código; não precisa de arte.

**Personagens e quadros:**
- **Atacante adversário (recolorível):**
  - correndo conduzindo a bola, de três quartos de frente: 6 a 8 quadros em ciclo;
  - cortando para o lado (quando você chega cedo): 3 quadros;
  - finalizando (quando você chega tarde): 3 quadros;
  - caindo depois do desarme: 3 a 4 quadros.
- **Zagueiro (você):**
  - parado em posição de marcação: 2 a 4 quadros;
  - carrinho deslizando no gramado: 5 a 6 quadros.

  O zagueiro precisa usar o seu visual (pele, cabelo e barba da criação de personagem). Por isso, o ideal é SVG em camadas no mesmo esquema do `avatar.js`, ou partes separadas (cabeça, corpo, braços e pernas) que eu monto.
- **Bola:** é a bola 3D, que já existe. Não precisa desenhar.

## 3. Meia: bola enfiada (novo)
**Mecânica (já funcionando com desenho provisório):** você está com a bola perto da câmera. A zaga adversária forma uma linha na frente da área, e o seu atacante corre da esquerda para a direita, por trás dela. Toque quando ele passar pela brecha (faixa verde) entre dois zagueiros. A bola passa, ele bate e é gol. Cedo ou tarde, a zaga corta. Se você demorar, ele fica impedido.

**Personagens e quadros:**
- **Zagueiros da linha (recoloríveis, 3 por lance):**
  - parados em posição de marcação: 4 quadros;
  - fechando, um passo lateral: 3 quadros;
  - cortando, esticando a perna: 3 quadros.

  Podem ser a mesma folha da barreira com outra pose.
- **Atacante companheiro (recolorível, cor do seu clube):**
  - correndo de lado (da esquerda para a direita): 6 a 8 quadros em ciclo;
  - finalizando: 3 quadros;
  - comemorando (braços para cima): 2 quadros;
  - levantando a mão pedindo impedimento: 1 quadro.
- **Você (opcional):** de costas, perto da câmera, dando o passe. 3 quadros. Se for complicado, a cena funciona sem ele, só com a bola saindo de baixo.

## 4. Goleiro (pênalti contra)
Hoje o batedor que vem correndo é desenhado com formas simples.
- **Batedor adversário (recolorível):** de costas para a câmera, correndo até a bola em 6 quadros, e o chute em 3 quadros. Mantenha uma pose em que o corpo "entrega" o lado (inclinado para a esquerda ou para a direita), porque a seta de dica aparece em cima dele.

---

## O que já está pronto (não precisa desenhar)
- Bola 3D em todos os minigames (pênalti, falta, goleiro, zagueiro e meia).
- Rede, traves, estádio, faixa verde, placar, textos e animação da rede estufando.
- O goleiro adversário do pênalti e da falta (`goleiro.png`).

## Prioridade sugerida
1. Zagueiro (o pior hoje).
2. Barreira com variedade.
3. Meia (já jogável com o desenho provisório).
4. Batedor do modo goleiro.
