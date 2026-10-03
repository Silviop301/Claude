# CRAQUE — Pesquisa e documento de design (v0.1, para aprovação)

Nome provisório. Roguelite de carreira no futebol: cada partida é uma carreira inteira, curta,
cheia de decisões, que termina num card com seus números. Jogar de novo = outra história.

---

## 1. O que a pesquisa mostrou

| Referência | O que prende | Lição para o CRAQUE |
|---|---|---|
| **Copero / simuladores de carreira** (o "jogo de navegador" que você jogou) | Criar um jogador, escolher entre 3 propostas, temporadas rápidas enchendo um painel de gols/assistências/títulos; carreira normal leva 3–5 min; card final compartilhável com veredito da carreira | O núcleo já é comprovadamente viciante. Carreira curta + números acumulando + card final |
| **7a0** | Sortear seleção + ano da Copa, escolher 1 jogador por rodada, 3 "coringas" para pular sorteio ruim; simular a Copa; desafio diário com a mesma semente para todo mundo | Escolha sob sorteio (aleatório, mas você decide) + poucos rerolls + desafio diário comparável |
| **New Star Soccer** | Você controla só o seu jogador nos momentos decisivos; a "novela" fora do campo (dinheiro, relações, polêmicas) importa tanto quanto o jogo | Momentos-chave em vez de 90 minutos; histórias e consequências fora do campo |
| **Vampire Survivors** | Recompensa a cada ~20–30 s; subir de nível = escolher 1 entre 3 opções; combinações evoluem em algo mais forte; perder ainda rende progresso permanente | Escolha de 1 entre 3 características com sinergias; derrota nunca é tempo perdido |
| **Game Dev Tycoon** | Combinar escolhas e ver a "nota da crítica"; descobrir combinações certas; tensão de esperar o resultado | Fim de temporada com nota/manchetes que explicam o porquê; descobrir combinações de estilo |

Fontes: [7a0 (guia)](https://www.seteazero.online/en), [7a0 (TechTudo)](https://www.techtudo.com.br/noticias/2026/06/7-a-0-veja-dicas-para-dominar-jogo-da-copa-do-mundo-e-montar-sua-selecao-edjogos.ghtml),
[Copero](https://copero.org/), [New Star Soccer — entrevista com Simon Read](https://thesetpieces.com/interviews/story-new-star-soccer/),
[Vampire Survivors — Game Design Lab](https://teemo.dev/game-design/vampire-survivors/), [Game Dev Tycoon (Gamecritics)](https://gamecritics.com/tayo-stalnaker/game-dev-tycoon-review/).

## 2. O que aprendemos com o Pombo Stonks

- Camadas de recompensa (caixa, roleta, missões) **não criam** vontade de jogar; só amplificam um núcleo bom.
- Ritmo precisa ser **medido por simulação antes** de você jogar.
- Nada de progresso que "acaba" em minutos; a rejogabilidade vem de **cada partida ser diferente**, não de números maiores.

## 3. Conceito em uma frase

> Crie um garoto de 16 anos, escolha propostas, monte o estilo dele temporada a temporada e descubra
> se ele vira lenda ou some na várzea — em 6 a 10 minutos.

## 4. Pilares

1. **Toda escolha pesa.** Proposta, característica, jogar lesionado ou não: sempre com troca (ganha algo, arrisca algo).
2. **Cada carreira é uma história diferente.** Sorteio de propostas, eventos e características garante isso.
3. **Números que dão orgulho.** Gols, assistências, títulos, Bolas de Ouro, recordes — no card final.
4. **Só mais uma carreira.** Curta, sem espera, perder rende Legado.

## 5. Os loops

| Escala | Duração | O que acontece |
|---|---|---|
| **Momento** | 5–15 s | Um evento com decisão ("Clássico: jogar no sacrifício?"), ou um momento decisivo (pênalti na final) |
| **Temporada** | 30–45 s | Pré-temporada: escolher **1 de 3 características** → temporada simulada com destaques → 1–2 eventos → fechamento com **nota, manchetes e prêmios** → janela: **3 propostas** (ou ficar) |
| **Carreira** | 6–10 min | ~16 a ~36 anos (15–20 temporadas). Copas a cada 4 temporadas. Aposentadoria → **card final** com números, título de "veredito" e pontuação de Legado |
| **Meta** | dias | Legado desbloqueia novas características, países, começos ("filho de ex-jogador", "revelação da base"); Hall da Fama com suas lendas; **carreira do dia** com a mesma semente para todos |

## 6. Sistemas (primeira versão)

- **Jogador:** posição (ATA, MEI, VOL, ZAG, LAT, GOL — protótipo começa com ATA/MEI), pé, país.
  Atributos: Finalização, Passe, Drible, Físico, Mental → nota geral (OVR). Pico entre 26–30 anos, queda depois.
- **Características (build):** ~30 no jogo, 12 no protótipo, com **sinergias**. Exemplos:
  - *Chute Colocado* + *Bola Parada* → **Especialista em Falta** (gols de falta)
  - *Velocista* + *Drible Curto* → **Liso** (mais assistências e pênaltis sofridos)
  - *Líder* + *Raça* → **Capitão** (mais títulos, menos crise)
  - *Marra* aumenta fama e polêmicas; *Profissional* reduz lesões e alonga a carreira
- **Clubes fictícios** em 5 níveis (várzea → série B → série A → Europa média → gigante europeu). Nomes originais,
  sem clubes/jogadores reais.
- **Propostas:** cada uma mostra salário, **tempo de jogo esperado**, força do time e liga. Clube grande = mais títulos,
  menos minutos. Esse é o dilema central.
- **Eventos:** lesão, polêmica, convocação, clássico, briga com técnico, proposta milionária da Arábia, etc.
- **Seleção e Copa** a cada 4 temporadas (o "momento 7a0" da carreira): convocação depende de OVR e fama.
- **Prêmios:** artilheiro, melhor jovem, seleção do campeonato, **Bola de Ouro**.
- **Fim de temporada estilo Game Dev Tycoon:** nota média + 2–3 manchetes que explicam o resultado.

## 7. Metas de ritmo (medidas por simulação antes de você jogar)

- Carreira completa em **6–10 min**.
- Uma decisão significativa a cada **≤ 15 s**.
- Pelo menos **1 momento marcante por temporada** (prêmio, recorde, evento).
- Bola de Ouro em **~1 a cada 5 carreiras** bem jogadas (raro, mas possível).
- Resultados bem diferentes entre carreiras (variância medida: gols totais, títulos, clubes).

## 8. Protótipo 1 — escopo mínimo

**Tem:** criar jogador (nome, posição ATA/MEI, pé, país) → temporadas simuladas → 12 características com 4 sinergias →
3 propostas por janela → 6 eventos → nota/manchetes → aposentadoria → card final.
Visual simples (cards e texto), sem som, sem loja, sem meta-progressão.

**Não tem (de propósito):** Legado, Copa, desafio diário, arte caprichada, sons.

**Teste de sucesso:** você termina uma carreira e **quer começar outra**. Se não quiser, ajustamos o núcleo antes de crescer.

## 9. Decisões para você

1. Clubes fictícios com nomes originais (recomendado) ou nomes genéricos por cidade?
2. Protótipo só com decisões (como o Copero) ou já com um momento de habilidade (chute de pênalti num toque, estilo NSS)?
3. Começar só com atacante/meia ou já com todas as posições?
