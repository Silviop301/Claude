#!/usr/bin/env python3
"""Recorta uma folha de logos de patrocinadores (arte do ChatGPT, fundo transparente, 2 colunas x 4 linhas)
e grava em craque/assets/co/ o logo de cada marca (pat-<nome>.webp, 450x150) e a versão para fundo escuro
(pat-<nome>-esc.webp: as cores escuras clareiam, as outras ficam).

  python3 tools/craque_patrocinadores.py arte/patrocinadores/folha-e.png "Banco Cordillera" "Seguros Ancla" ...

Os nomes vão na ordem de leitura da folha (linha por linha, da esquerda para a direita) e são os mesmos de
S.CO_SPONS (engine/coachfin.js). PREVIA=pasta grava também a conferência em creme e carvão.
Depois: python3 tools/craque_sw.py
"""
import os
import sys
import unicodedata

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, 'craque', 'assets', 'co')
CREME = np.array([243, 240, 235], float)


def slug(n):
    s = unicodedata.normalize('NFD', n)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    out = ''.join(c if c.isalnum() else '-' for c in s)
    while '--' in out:
        out = out.replace('--', '-')
    return out.strip('-')


def limpa(im):
    """Tira a névoa quase transparente que o ChatGPT deixa em volta e fecha o alfa do desenho."""
    a = np.array(im.convert('RGBA')).astype(float)
    al = a[..., 3]
    a[..., 3] = np.clip((al - 40) / (230 - 40), 0, 1) * 255
    return a


def faixas(m):
    """Trechos seguidos de True num vetor."""
    out, ini = [], None
    for i, v in enumerate(list(m) + [False]):
        if v and ini is None:
            ini = i
        elif not v and ini is not None:
            out.append((ini, i))
            ini = None
    return out


def celulas(a):
    """Caixa de cada logo: metade esquerda e direita, e as linhas de cada metade pelo vazio entre elas."""
    h, w = a.shape[:2]
    cheio = a[..., 3] > 128
    cols = []
    for x0, x1 in ((0, w // 2), (w // 2, w)):
        fx = [f for f in faixas(cheio[:, x0:x1].any(axis=1)) if f[1] - f[0] > 40]
        col = []
        for y0, y1 in fx:
            xs = np.where(cheio[y0:y1, x0:x1].any(axis=0))[0]
            col.append((x0 + xs[0], y0, x0 + xs[-1] + 1, y1))
        cols.append(col)
    if len(cols[0]) != len(cols[1]):
        sys.exit('folha fora da grade: %d logos à esquerda e %d à direita' % (len(cols[0]), len(cols[1])))
    return [c for par in zip(*cols) for c in par]


def encaixa(a, cx, lw=450, lh=150, mw=420, mh=135):
    x0, y0, x1, y1 = cx
    rec = Image.fromarray(a[y0:y1, x0:x1].round().astype('uint8'), 'RGBA')
    k = min(mw / rec.width, mh / rec.height)
    rec = rec.resize((max(1, round(rec.width * k)), max(1, round(rec.height * k))), Image.LANCZOS)
    tela = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
    tela.paste(rec, ((lw - rec.width) // 2, (lh - rec.height) // 2))
    return tela


def escuro(im):
    """Para o fundo carvão: cor escura clareia guardando o tom; preto e grafite viram creme."""
    a = np.array(im).astype(float)
    rgb = a[..., :3]
    mx = rgb.max(axis=2, keepdims=True)
    mn = rgb.min(axis=2, keepdims=True)
    w = np.clip((0.66 - mx / 255) / 0.14, 0, 1)
    # azul forte tem o canal alto e mesmo assim some no carvão: clareia um pouco pelo brilho
    lum = (rgb * [0.2126, 0.7152, 0.0722]).sum(axis=2, keepdims=True) / 255
    azul = (rgb[..., 2:3] >= mx) & (mx - mn > 60)
    w = np.maximum(w, np.where(azul, np.minimum(0.45, np.clip((0.40 - lum) / 0.12, 0, 1)), 0))
    claro = (0.44 + 0.56 * rgb / np.maximum(mx, 1)) * 255
    sat = np.clip((mx - mn) / np.maximum(mx, 1) / 0.5, 0, 1)
    alvo = CREME * (1 - sat) + claro * sat
    a[..., :3] = rgb * (1 - w) + alvo * w
    return Image.fromarray(a.round().astype('uint8'), 'RGBA')


def previa(pares, pasta, nome):
    os.makedirs(pasta, exist_ok=True)
    n = len(pares)
    lin = (n + 1) // 2
    for sufixo, cor, k in (('creme', (248, 244, 234), 0), ('carvao', (20, 21, 23), 1)):
        tela = Image.new('RGBA', (2 * 490, lin * 180), cor + (255,))
        for i, par in enumerate(pares):
            tela.alpha_composite(par[k], (20 + (i % 2) * 490, 15 + (i // 2) * 180))
        tela.convert('RGB').save(os.path.join(pasta, '%s-%s.png' % (nome, sufixo)))


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    folha, nomes = sys.argv[1], sys.argv[2:]
    a = limpa(Image.open(folha))
    cxs = celulas(a)
    if len(cxs) != len(nomes):
        sys.exit('a folha tem %d logos e vieram %d nomes' % (len(cxs), len(nomes)))
    pares = []
    for nome, cx in zip(nomes, cxs):
        logo = encaixa(a, cx)
        esc = escuro(logo)
        s = slug(nome)
        logo.save(os.path.join(SAIDA, 'pat-%s.webp' % s), quality=90, method=6)
        esc.save(os.path.join(SAIDA, 'pat-%s-esc.webp' % s), quality=90, method=6)
        pares.append((logo, esc))
        print('pat-%s.webp' % s, cx)
    if os.environ.get('PREVIA'):
        previa(pares, os.environ['PREVIA'], os.path.splitext(os.path.basename(folha))[0])


if __name__ == '__main__':
    main()
