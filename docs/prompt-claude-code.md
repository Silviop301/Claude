# Prompt para o Claude Code — Climbix, pontos 4 (ícones) e 8 (hierarquia de texto)

Repositório: Silviop301/Claude, branch `claude/gracious-darwin-9gdlfp`, pasta `craque/`.
Jogo em scripts clássicos, sem build. Não mude regras do jogo, só visual.

## Parte A — Escala de texto (fazer primeiro)

1. Em `craque/style.css`, no `:root`, crie:

```
   --t-hero: 800 clamp(64px, 20vw, 96px)/0.9 var(--display);
   --t-num:  800 44px/1 var(--display);   /\* use 28–44 conforme o lugar \*/
   --t-h1:   800 30px/1.05 var(--display);
   --t-h2:   700 22px/1.1 var(--display);
   --t-item: 700 18px/1.15 var(--display); /\* itens de lista, atalhos, linhas de configuração \*/
   --t-body: 500 16px/1.4 var(--body);
   --t-small:500 14px/1.35 var(--body);
   --t-label:600 12px var(--display);     /\* + letter-spacing .14em; uppercase \*/
   ```

2. Regra: peso 800 só em logo/momentos (hero), título de tela (h1/h2 de tela) e números em destaque. Todo o resto vai para 700 (títulos de cartão) ou 600/500.
3. Tamanhos quebrados (9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5) vão para o degrau mais próximo da escala.
4. Troque, tela por tela, nesta ordem, e confira cada uma em 320px e 390px de largura antes de seguir:
barra do topo → início → configurações → pré-temporada → propostas → evento/resultado de evento → fim de temporada.
O jornal (`.paper`, Playfair) fica fora.
5. Mudanças específicas já decididas:

   * `.eyebrow`: `font: var(--t-label); letter-spacing: .14em; color: var(--label)`.
   * `.prep-sec`: deixa de ser dourado; mesmo estilo do `.eyebrow`.
   * `.choice b`: de `800 21px` para `var(--t-h2)` (700/22).
   * `.choice .d`: `var(--t-small)`, cor `#4F5C55`.
   * `.btn small` / `.btn.opt small`: `var(--t-small)` sem `opacity` (ghost usa `#D3E4D9`).
   * `.muted.small` / `.prep-note`: 14px, cor `#D3E4D9`.
   * Controles segmentados (`.seg button`, `.cfg-seg button`): 700 16px condensada.

### Início (prancha 1e)

* `.hg b` → `var(--t-item)`; `.hg small` → 14px/500 `#D3E4D9`; `.hg i` vira círculo 36px `rgba(143,214,174,.16)` com ícone 20px `var(--label)`.
* `.cont-card .cc-info b` → `var(--t-h2)`; `small` → `--t-label` cor `#5A4200` (sem opacity); `span` → 14/500 cor `#3A3010` (sem opacity); `.cc-go` troca "›" por ícone chevron-right 28px cor `#5A4200`.
* `.scard .sc-tier` 600; `.sc-pos` 700.
* `.daily`: vira grade `auto 1fr` com selo 44px (fundo `rgba(242,194,48,.18)`, ícone calendar-days `#F2C230`) ocupando 3 linhas; `.dl-top` → `--t-label`; `b` → `var(--t-h2)`; `b span` e `.dl-sub` → 14/500.
* Link de configurações: 14/500.

### Configurações (prancha 1f, `ui/settings.js`)

* Agrupar as linhas: "Partida" (Lances decisivos, Copa e Mundial, Resumo da temporada) e "Visual e som" (Jornais, Efeitos 3D, Som, Vibração). Cada grupo: rótulo `--t-label` + um bloco `rgba(255,255,255,.05)` raio 16 com as linhas separadas por `border-top: 1px solid rgba(255,255,255,.06)`.
* `.cfg-head b` → `var(--t-h2)`, sem o ícone de engrenagem; `.cfg-x` usa ícone de traço "x" 18px no lugar de "✕".
* `.cfg-t i` vira círculo 36px como os atalhos do início; `.cfg-t b` → `var(--t-item)`; `.cfg-t small` → 14/500 `#C9DCCF`.
* `.cfg-seg`: trilho único (`padding 4px; gap 4px; radius 12px; background rgba(0,0,0,.22)`); botão inativo transparente cor `#D3E4D9`; ativo creme com `box-shadow: 0 1px 0 rgba(0,0,0,.3)`, raio 9.
* `.cfg-note` → 14/500 `#B9CDBF` com ícone "info" 15px antes do texto.
6. Não quebre encaixes apertados: barra do topo em 320px, carta metálica (`.mcard`, `.scard`), `.cont-card`.

## Parte B — Ícones em selo

1. Adote o conjunto Lucide (MIT) como fonte dos desenhos. NÃO carregue da CDN: copie só os paths dos ícones usados para dentro de `U.ICON` em `src/ui/core.js`, no mesmo formato `svgI(d)` que já existe (24×24, stroke 2, pontas arredondadas). Assim o jogo continua offline.
Settings: paper→newspaper, globe, ball→circle-dot, fast→fast-forward, spark→sparkles, sound→volume-2, vibe→smartphone, e "x", "info", "chevron-right", "calendar-days" (novos).
2. Crie em `src/ui/core.js`:

```js
   // tom: 'green' | 'blue' | 'sand' | 'red' | 'gold' | 'purple'
   const seal = (name, tone, size) => '<span class="seal ' + tone + (size ? ' ' + size : '') + '">' + (ICON\[name] || '') + '</span>';
   ```

   e exporte em `window.CRAQUE\_UI`.

3. CSS:

```
   .seal { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; flex: none; }
   .seal .ico { width: 22px; height: 22px; }
   .seal.sm { width: 32px; height: 32px; } .seal.sm .ico { width: 16px; height: 16px; }
   .seal.lg { width: 52px; height: 52px; } .seal.lg .ico { width: 26px; height: 26px; }
   .seal.green  { background: #CDEFD9; color: #0E5A30; }
   .seal.blue   { background: #D6E4FA; color: #1D4C9E; }
   .seal.sand   { background: #EFE9D8; color: #13201A; }
   .seal.red    { background: #F8D3D6; color: #8E1B24; }
   .seal.gold   { background: #FBE7A6; color: #7A5600; }
   .seal.purple { background: #EADFFF; color: #5B35B0; }
   ```

4. Dados: em cada item com `icon: '<emoji>'` adicione `ico: '<nome>'` e `tone: '<tom>'`. MANTENHA o `icon` emoji como reserva: onde `ico` existir, a tela usa `seal(ico, tone)`; senão, o emoji. Assim dá para fazer por lotes.
5. Tons:

   * Características de estilo de jogo (ataque/meio) → green
   * Características de carreira → blue
   * Defesa e goleiro → sand
   * Combinações (SYNERGIES) → gold
   * Eventos: bom → green, risco/lesão/polêmica → red, decisão neutra → blue
   * Conquistas → gold; carta Ícone / especiais → purple
6. Mapa inicial (emoji → ico):

   * Estilo: 🦊 Artilheiro→crosshair · 🍽️ Garçom→utensils-crossed · 🎯 Chute Colocado→target · 🧱 Bola Parada→flag-triangle-right · 🌀 Drible Curto→tornado · 👁️ Visão de Jogo→eye · 🪄 Técnica→wand-sparkles · ⚡ Velocista→zap · 🗣️ Cabeceio→chevrons-up
   * Carreira: 🏋️ Rato de Academia→dumbbell · 🧘 Profissional→heart-pulse · 🌟 Estrela→star · ©️ Líder→crown · 🔥 Raça→flame · 🧊 Frieza→snowflake · 🧳 Adaptável→luggage · 🎌 Patriota→flag
   * Defesa/goleiro: 🛡️ Xerife→shield · 🦵 Carrinho→move-right · 🧠 Antecipação→brain · 📐 Saída de bola→ruler · 🦒 Jogo aéreo→move-up · ⚡ Reflexo→timer · 🤸 Elástico→move-horizontal · 🧤 Mão firme→hand · 🥅 Pegador de pênalti→goal · 🦶 Goleiro-líbero→route
   * Combinações: Especialista em Falta→sparkles · Liso→wind · Capitão→shield-check · Maestro→music · Muralha→brick-wall · Paredão→shield-half · Matador→skull (purple)
   * Investimentos (sand): Personal trainer→dumbbell · Treino de chute→goal · Analista de jogo→chart-column · Treino de sprint→footprints · Treino de técnica→wand-sparkles · Treino defensivo→shield · Fisioterapeuta→stethoscope
   * Eventos/conquistas: proponha o mapa numa tabela (emoji, título, ico, tom) e ME MOSTRE antes de aplicar. Itens sem ícone adequado: marque "SVG próprio".
7. Onde trocar (lote 1 = características/combinações/investimentos):
`ui/preseason.js` (`.choice .ic`, chips, `.prep-done`), `ui/sheet.js`, `ui/walkout.js` e `ui/finale.js` (traits da carta), `card.js` se desenha os ícones no canvas (se desenhar emoji no canvas, deixe para depois e avise).
Lote 2 = eventos (`ui/match.js`: `.event-card .ic`, `.ev-res .er-ic` → `seal(..., 'lg')`).
Lote 3 = conquistas (`ui/achievements.js`).
8. Bandeiras de país continuam emoji (fonte Twemoji já cobre).
9. No cartão de evento, acima do título, mostre o selo `lg` + um rótulo `--t-label` na cor do tom (ex.: "Decisão · treino").

## Depois de cada lote

* Rode `python3 tools/craque\_sw.py` se criar/remover arquivos.
* Teste em 320px e 390px: pré-temporada, ficha (sheet), evento, resultado de evento, fim de carreira.
* Faça commit por lote com mensagem clara.

Referência visual: prancha "Climbix Prancha Icones e Texto" (seções 1a–1f).

