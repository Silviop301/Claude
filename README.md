# Climbix

Jogo de carreira de futebol para o navegador: você cria um garoto de 16 anos, escolhe propostas,
arrisca nas decisões e vê até onde ele chega. No ar em **https://climbix.app**.

## Pastas

| Pasta | O que tem |
|---|---|
| `craque/` | O jogo (HTML, CSS e JS sem build), a API em PHP (`craque/api/`) e os arquivos do site |
| `tools/` | Scripts do jogo: simulador de equilíbrio, teste de ponta a ponta, service worker, taças, robôs do ranking |
| `docs/` | Briefings, relatórios e decisões de design |
| `divulgacao/` | Artes, vídeos e textos prontos para redes sociais |
| `.github/workflows/` | Deploy automático do `craque/` para a hospedagem |

## Rodar e testar

```
python3 -m http.server 8765                    # e abra http://127.0.0.1:8765/craque/
python3 tools/craque_sw.py                     # gera o sw.js e a versão das URLs (rodar antes de publicar)
node tools/craque_sim.js 3000                  # simula carreiras e mostra a distribuição das notas
NODE_PATH=$(npm root -g) node tools/craque_e2e.js 2 390 4   # carreiras jogadas pela interface (Playwright)
```

## Publicar

Um push que mexe em `craque/**` no branch do site dispara o deploy automático.
