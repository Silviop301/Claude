# Pombo Stonks 🐦📈

Jogo idle/incremental de meme de investimento. Um pombo de praça descobre o mercado financeiro
e vai da revenda de migalha até a Bolsa Intergaláctica.

## Como jogar

Abra `index.html` no navegador (celular ou PC). Não precisa instalar nada.

- Toque no pombo para ganhar grana. Toques rápidos fazem combo; às vezes sai um crítico **STONKS!**
- Compre negócios para ganhar grana por segundo, inclusive com o jogo fechado (até 2h).
- A cada 10, 25, 50, 100… unidades de um negócio, a produção dele multiplica.
- Ganhe grana para ser promovido: o pombo ganha gravata, óculos, corrente, cartola…

## Instalar como app no iPhone (PWA)

O jogo é um PWA: hospedado num endereço https, dá para instalar pelo Safari e ele abre em tela cheia,
com ícone próprio e funcionando offline.

1. Hospede a pasta do projeto (sem build, é só HTML/CSS/JS) em um destes:
   - **Vercel** ou **Cloudflare Pages**: importe o repositório do GitHub (funciona com repositório privado),
     escolha o branch do jogo, sem comando de build e com a raiz do projeto como pasta de saída.
   - **GitHub Pages**: Settings → Pages → escolha o branch. No plano grátis exige repositório público.
2. No iPhone, abra o endereço no **Safari** → botão **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra pelo ícone da tela inicial.

Ao publicar uma versão nova, troque `VERSION` em `sw.js` para os aparelhos baixarem a atualização.
O progresso fica salvo no aparelho (armazenamento do navegador).

Para regerar os ícones: `NODE_PATH=$(npm root -g) node tools/make_icons.js`.

## Versão de arquivo único

```
python3 tools/build.py        # gera dist/pombo-stonks.html
```

O planejamento completo está em [PLANO.md](PLANO.md).
