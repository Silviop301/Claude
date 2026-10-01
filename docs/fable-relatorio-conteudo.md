# Relatório · Conteúdo (branch `fable/eventos`)

Dois commits: os eventos novos e as correções de texto. Nada foi publicado no site.

## Tarefa A · 42 eventos novos

Os 94 eventos existentes foram lidos antes para não repetir ideias. Todos os novos entram em `craque/src/engine/events2.js`, no array `MORE`, com o mesmo formato (`when → build → resolve`), efeitos na escala dos eventos parecidos e cada opção com ganho e custo. Textos sem termos de uma torcida só.

Coluna **Vezes**: aparições em 2000 carreiras simuladas (`node tools/craque_sim.js 2000`, robô esperto). Nenhum ficou zerado. Os mais raros são os de fim de carreira com condições estritas (estátua, diretoria, recorde), o que é esperado.

### Base (até 19 anos)

| Evento | Quando | Opções e efeitos | Vezes |
|---|---|---|---|
| O colega de quarto 🛏️ | ≤18 anos | Quarto individual: forma +4%, Técnico −3 · Aguentar: 50% amigos (Técnico +4, forma +3%) / 50% forma −4% | 157 |
| Vlog do alojamento 📹 | ≤19, fama <40 | Gravar: Fama +8, 35% proibido (Técnico −6) · Recusar: Técnico +3 | 211 |
| Primeira entrevista ao vivo 🎤 | ≤19, fama ≤30 | Falar o que vier: Fama +6, 40% gafe vira meme (Fama +10, Torcida −3) · Frases prontas: Técnico +3 | 192 |
| Todo mundo quer ingresso 🎟️ | ≤21, com salário | Comprar para a turma: −2 semanas de salário, Torcida +5 · Só família: forma +3%, Fama −2 | 307 |

### Seleção e imprensa

| Evento | Quando | Opções e efeitos | Vezes |
|---|---|---|---|
| De boca fechada no hino 🎶 | fama ≥40, nota ≥70, 20–33 anos, não aposentado da seleção | Explicar: Técnico +2, 40% Fama −4 · Vídeo cantando: Fama +8, Torcida +4 (25% desafinado: Torcida +2) | 292 |
| Foto com o árbitro 📸 | fama ≥25 | Explicar: Torcida +3, 40% Fama −4 · Pedir troca: Técnico +4, Fama +2 | 368 |
| Drone no treino fechado 🛸 | fama ≥15 | Bolada: Fama +10, 40% multa R$ 10 mil · Segurança: Técnico +4 | 418 |
| Os cartoleiros estão bravos 🎩 | fama ≥25, não goleiro | Desculpas: Fama +8, Torcida +3 · Ignorar: Técnico +2, 30% Torcida −2 | 276 |
| Sua nota no videogame 🕹️ | fama ≥30 | Reclamar: Fama +8, 25% Torcida −3 · Provar em campo: forma +4% | 332 |

### Fama e vida fora de campo

| Evento | Quando | Opções e efeitos | Vezes |
|---|---|---|---|
| Convite para o palco 🎸 | fama ≥45 | Cantar: Fama +10, 50% desafina (Técnico −3) · Camarote: Fama +3, forma +2% | 339 |
| A promessa da tatuagem 🖋️ | título na temporada anterior, mesmo clube | Cumprir: Torcida +12, Fama +6 (20% escudo torto: Fama +12, Torcida +8) · Fingir que esqueceu: Torcida −6, forma +2% | 142 |
| O corte polêmico 💇 | fama ≥20, ≤30 anos | Manter: Fama +8, 30% Técnico −4 · Raspar: Técnico +3, Fama −2 | 249 |
| Um sósia na cidade 👯 | fama ≥60 | Vídeo com o sósia: Fama +10, Torcida +4 · Ignorar: 30% Fama −6 | 350 |
| A figurinha rara 🃏 | fama ≥30, ≤33 anos | Distribuir nas escolas: R$ −20 mil, Torcida +8, Fama +6 · Rir: Fama +3 | 290 |
| Namoro famoso 💞 | 20–30 anos, fama ≥40 | Assumir: Fama +14, 35% forma −5% · Discrição: forma +3% | 196 |
| A coletiva no idioma local 🗯️ | no exterior, ≥1 ano no clube | Rir e virar meme: Fama +8, Torcida +5 · Só com tradutor: Técnico +2, Fama −2 | 268 |
| Sua mãe deu entrevista 👩 | fama ≥30 | Rir e postar: Fama +8, Torcida +6 · Pedir pra parar: forma +2%, Fama −2 | 380 |
| Seu pai na arquibancada 👨 | fama ≥20 | Defender: Torcida +6, Fama +6, 30% Técnico −4 · Pedir calma: Técnico +3 | 381 |
| A cueca da sorte 🩲 | qualquer | Costurar: Fama +4, 50% forma +4%, 30% Técnico −3 · Jogar sem: 60% forma +3% / 40% forma −4% | 531 |
| A benzedeira da sua avó 🕯️ | qualquer | Benzer o elenco: forma +3%, Torcida +5, 20% Técnico −4 · Dispensar: Técnico +2, 30% forma −2% | 502 |
| A taça sumiu 🔍 | título na temporada anterior | Procurar: 50% Torcida +4 / 50% Fama +6 e Técnico −4 · Réplica: R$ −20 mil, Técnico +2 | 128 |
| O apelido pegou 🏷️ | ≥1 ano no clube, fama ≥10 | Abraçar: Fama +8, Torcida +6 · Proibir: Técnico −3, 50% Fama +4 e Torcida −3 | 384 |
| A música da torcida 🎺 | Torcida ≥55 | Mudar a letra: Fama +6, Torcida −6 · Cantar junto: Torcida +10, 30% multa R$ 20 mil e Técnico −4 | 273 |
| O relógio do sócio ⌚ | Torcida ≥50 | Aceitar e visitar: Torcida +10, Fama +6, forma −1% · Devolver: Torcida +4 | 471 |
| Cláusula baixa demais 🔓 | contrato ≥2 anos, nota ≥70, ≤30 anos, clube até tier 4 | Renovar: salário +10%, contrato +1, Técnico +4 · Deixar: Fama +6, 40% abre a janela (Torcida −6) | 68 |

### Por posição (2 por posição)

| Evento | Quando | Opções e efeitos | Vezes |
|---|---|---|---|
| Gol contra bizarro 🙈 | ZAG, fama ≥10 | Desculpas: Torcida +5, Fama +4 · Treinar e calar: +1 DEF, Técnico +4, forma −2% | 136 |
| Pendurado antes do clássico 🟨 | ZAG | Seguir no estilo: Torcida +6, 50% suspenso (−5% minutos; Frieza reduz) · Controlar: Técnico +6, forma −2% | 176 |
| Luvas novas de patrocínio 📦 | GOL, fama ≥20 | Usar: R$ (8 semanas de salário), Fama +4, 25% forma −4% · Ficar com as velhas: forma +2% | 148 |
| O goleiro vai bater? 🥾 | GOL | Bater: 40% (+15 com Frieza) Fama +15 e Torcida +8 / senão Torcida −4 · Deixar: Técnico +3 | 143 |
| Assistência roubada 📊 | MEI, fama ≥15 (2 textos) | Reclamar: Fama +6, 30% Torcida −3 · Deixar pra lá: Técnico +3, forma +2% | 138 |
| Primeiro volante? 🎼 | MEI, ≥24 anos, ≥1 ano no clube | Aceitar: +2 DEF, assistências −15%, Técnico +8 · Ficar: Técnico −4, assistências +5% | 64 |
| Gol de mão 🤚 | ATA, fama ≥10 | Avisar o árbitro: Fama +12, Torcida −6, Técnico −4 · Ficar quieto: Torcida +6, 40% Fama −8 | 168 |
| Um gol da artilharia 🏹 | ATA, ≥18 gols na temporada anterior | Pedir para jogar: 55% (+15 com Artilheiro) Fama +12 / senão forma −5% · Descansar: Técnico +8, forma +3% | 89 |

### Veterano e aposentadoria

| Evento | Quando | Opções e efeitos | Vezes |
|---|---|---|---|
| O primeiro fio branco 🧴 | ≥32 anos, fama ≥20 | Pintar: R$ −3 mil, Fama +6, 30% Torcida −3 · Assumir: Torcida +5 | 145 |
| Comentar na TV 📡 | ≥33 anos, fama ≥30 | Aceitar: R$ 80 mil, Fama +8, 35% Técnico −8 · Recusar: Técnico +4 | 180 |
| A um jogo do recorde 📜 | ≥31 anos, ≥4 anos no clube, Torcida ≥60 | Pedir para jogar: Torcida +10, Fama +6, 25% −4% minutos · Esperar: Técnico +5 | 27 |
| Uma estátua sua 🗿 | ≥33 anos, ≥5 anos no clube, Torcida ≥75, fama ≥60 | Posar: Torcida +8, Fama +10, forma −4% · Mandar fotos: Torcida +4, 30% estátua estranha (Fama +6, Torcida −2) | 12 |
| Lentes de contato 👓 | ≥30 anos | Usar lentes: R$ −5 mil, forma +4% · Ignorar: 35% forma −5% | 183 |
| Último no teste físico ⏱️ | ≥33 anos | Personal escondido: R$ −30 mil, +1 FÍS, forma −2% · "É na cabeça": Fama +4, 30% Técnico −5 | 179 |
| Convite para a diretoria 💼 | ≥34 anos, ≥2 anos no clube, Torcida ≥55 | Aceitar e ajudar: Técnico +6, Torcida +6, forma −3% · Só jogar: forma +4% | 24 |
| Turnê de despedida 🚌 | temporada de despedida, ≥2 clubes na carreira | Todas: Fama +12, Torcida +6, forma −5% · Só o último jogo: Fama +4, forma +3% | 45 |
| Palestras motivacionais 🎓 | ≥32 anos, fama ≥50 | Dez palestras: R$ 200 mil, forma −4% · Uma de graça na escola: Torcida +6, Fama +4 | 144 |

Pelo menos 10 engraçados: colega de quarto, primeira entrevista, palco, tatuagem, sósia, figurinha, idioma, mãe na TV, cueca da sorte, benzedeira, taça sumida, apelido, cartoleiros, nota no videogame, fio branco, estátua, lentes, teste físico, drone.

**Equilíbrio:** com e sem os eventos novos, a simulação de 2000 carreiras dá nota S em 16%. A duração estimada subiu de 10min08s para 10min19s (há mais eventos para sortear, então aparecem um pouco mais decisões por carreira).

## Tarefa B · Revisão de textos

Método: todas as strings em português de `engine/*.js`, `ui/*.js`, `data.js` e `social-data.js` foram extraídas e lidas; buscas específicas para termos de torcida, plurais com número variável, crase e marcadores; teste no navegador gerando 1.200 posts (4 posições × 5 níveis de fama × 10 situações) procurando marcador sem trocar, `undefined` e `NaN`; conferência dos artigos dos 800 clubes (`D.o`).

### Corrigido

**Plural com número variável** (antes saía "1 gols", "1 títulos", "1 pontos"). Novo helper `D.plural(n, singular, plural)` em `data.js`, usado em:

| Arquivo | Antes | Depois |
|---|---|---|
| `engine/finish.js` | `T.goals + ' gols e ' + T.assists + ' assistências'`, pênaltis, desarmes, jogos sem sofrer gol | `D.plural(...)` em cada número |
| `engine/season.js` (destaque "Temporada de gala") | `s.goals + ' gols'`, `s.assists + ' assistências'`, `' jogos sem sofrer gol'` | `D.plural(...)` |
| `ui/paper.js` (jornal da despedida) | mesma concatenação | `D.plural(...)` |
| `ui/album.js` | `s.games + ' jogos'`, `s.goals + ' gols'`, `' temporadas'`, `f.titles + ' títulos'` | `D.plural(...)` |
| `ui/daily.js` | `' gols'`, `' títulos'`, `' Bola(s) de Ouro'` | `D.plural(...)`, "1 Bola de Ouro" / "2 Bolas de Ouro" |
| `ui/worldcup.js` | `'Classificado com ' + pts + ' pontos'` | `D.plural(pts, 'ponto', 'pontos')` |
| `ui/social.js` | estatística do post (`' gols'`, `' desarmes'`...) | `D.plural(...)` |

**Post de despedida do goleiro** (`social-data.js`, `ui/social.js`): "0 gols, 0 assistências" → novo marcador `{numeros}`, que mostra os números certos por posição ("412 jogos sem sofrer gol e 31 pênaltis defendidos" para goleiro; "gols e jogos sem sofrer gol" para zagueiro; "gols e assistências" para os demais). O comentário de torcedor "{gols} gols e cada um com uma memória pra mim" virou "Cada jogo seu tem uma memória minha guardada". O marcador `{temps}` passou a sair com plural certo ("1 temporada" / "12 temporadas").

**Eventos antigos com texto incoerente** (`engine/events.js`, `events2.js`):

| Evento | Antes | Depois |
|---|---|---|
| renovar | "contrato de 5 anos" (a opção dá 3) | "contrato longo" |
| cobrador | "O camisa 10 do time e você..." podia aparecer para quem veste a 10 | só aparece se o número não é 10 |
| volante | hint prometia "jogos sem sofrer gol −10%", efeito não existia no código | hint "forma −2%" (o efeito real) |
| gringo | "O novo técnico só fala inglês" (estranho na Inglaterra) · "aulas de inglês" | "é estrangeiro, ainda não fala a língua do grupo" · "aulas do idioma dele" |
| centenario | "faz 100 anos" (vários clubes do jogo são novos) | "Aniversário do clube · comemora aniversário" |
| pretemporada | "seis amistosos nos Estados Unidos" (estranho para clube dos EUA) | "no exterior" |

**Resenha dos podcasts** (`data.js`, `D.MEDIA.shows`):

| Antes | Depois |
|---|---|
| Galvão: "É do Brasil! É do {n}!" (jogador pode ser de outro país) | "É do {n}! É do {n}!" |
| Podpah: "Ano que vem vem mais, confia." | "Ano que vem, vem mais, confia." |
| Flow: "O {n} tá no hype, e com razão. Aí é cinema!" repetida na mesma lista | 2ª vira "Rapaziada, o {n} não dá descanso pra zaga nenhuma!" |
| Flow: "{g} gols, rapaziada! O {n} tá impossível!" repetida | 2ª vira "{g} gols e a resenha sem voz, rapaziada!" |
| Flow: "Fala sério, {n}! A resenha esperava muito mais." e "...muito mais!" | 2ª vira "O {n} deve uma temporada pra resenha, rapaziada." |
| Flow: duas falas começando "Campeão, rapaziada! O {n} chamou a responsabilidade" | 2ª vira "Taça levantada e o {n} no centro da foto, rapaziada!" |
| Flow: "Ano difícil pro {n}..." e "Ano complicado pro {n}..." | 2ª vira "O departamento médico virou casa do {n} esse ano. Volta logo!" |
| Flow: duas falas começando "Rebaixamento pesado, rapaziada" | 2ª vira "Caiu o time, não caiu o {n}. Isso a resenha viu, rapaziada." |
| Podpah: duas falas "o {n} vai achar time grande" | 2ª vira "Pesadíssimo, mano. Mas o {n} jogou mais que o time inteiro." |
| Podpah: "Mano, alguém viu o {n} esse ano?" e "Cadê o {n}, mano? Alguém viu..." | 2ª vira "Mano, o {n} esqueceu a chuteira em casa o ano todo kkkk" |
| Casimiro: duas falas "o melhor do mundo. Apenas. Simplesmente." | 2ª vira "Que papinho é esse de favorito? O {n} levou. Muito forte, mané!" |
| Casimiro: duas falas "O {n} amassa. Simplesmente..." | 2ª vira "Aceitas pix? Quero pagar pra ver o {n} jogar de novo, mané!" |

**Outros:**

| Arquivo | Antes | Depois |
|---|---|---|
| `ui/season.js` | "Copa de 2034 sem você: você já se despediu da seleção." | "Copa de 2034 sem você, que já se despediu da seleção." |
| `ui/worldcup.js` | "[eles] empatam e vai para os pênaltis" | "empatam e levam para os pênaltis" |

### Conferido e sem problema

- **Termos de uma torcida só:** nenhum nos textos. O único "fiel" é o `id` interno da conquista "Um clube só", que o jogador não vê.
- **Artigos dos clubes:** a lista de nomes femininos (`FEM` em `data.js`) cobre Juventus, Inter, Lazio, Roma, Ponte Preta, Chapecoense, Portuguesa, Ferroviária, Real Sociedad, Universidad de Chile etc. "o Criciúma", "o Confiança" e "o LA Galaxy" estão certos. Não achei clube com artigo errado.
- **Crase:** "foi a casa mais marcante" (jornal da despedida) está certo: "a casa" é o sujeito-objeto, não "à casa".
- **Marcadores das redes:** 1.200 posts gerados sem marcador solto, `undefined` ou `NaN`, em todas as posições e níveis de fama.
- **Achievement "Petrodólares":** a descrição diz "Arábia Saudita ou Catar" e o teste confere exatamente essas ligas (os EUA ficam de fora dos dois).

### Não corrigido (e por quê)

- **Ícones repetidos entre eventos antigos:** 🎯 (faltas e centroavante) e 📺 (var e reality). Não é erro de texto; troquei só os que eu mesmo tinha repetido nos eventos novos.
- **"O leão bateu na porta"** (evento receita) é expressão brasileira para a Receita Federal; para jogador de outro país fica só como piada. Não mudei porque o jogo é feito para a turma brasileira.
- **"Seleção" nas falas do Neto** ("eu quero ver na Seleção"): vale para qualquer país, mantive.
- **Pré-existentes fora do escopo:** em `ui/start.js` "17 sem sofrer gol" no Hall da Fama é abreviação proposital; não mexi.
