#!/usr/bin/env python3
"""Versão de portal (itch.io e afins): gera dist/climbix-portal.zip a partir de craque/.

O portal mostra o jogo dentro da página dele (iframe, em outro domínio), por isso o pacote:
- deixa de fora api/ (o PHP fica em climbix.app; o jogo já chama https://climbix.app/api/ fora do site),
  sw.js e manifest (sem modo offline nem "instalar") e badges/ (~1000 escudos: o itch.io aceita
  no máximo 1000 arquivos; os escudos vêm de https://climbix.app/badges/, que libera CORS);
- marca a página com CLIMBIX_PORTAL, CLIMBIX_BADGES e CLIMBIX_HOME (links de compartilhar
  apontam para climbix.app; login só com usuário e senha);
- abre links (Privacidade, Termos) em outra aba, para não trocar a página dentro do portal.

Uso (da raiz): python3 tools/craque_portal.py [nome-do-portal]   # padrão: itch
"""
import os
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'craque')
OUT = os.path.join(ROOT, 'dist')
SKIP_DIRS = {'api', 'badges'}
SKIP_FILES = {'sw.js', 'manifest.webmanifest'}
HOME = 'https://climbix.app/'

FLAGS = (
    "<script>window.CLIMBIX_PORTAL = '{p}'; window.CLIMBIX_BADGES = '" + HOME + "badges/'; window.CLIMBIX_HOME = '" + HOME + "';\n"
    "document.addEventListener('click', e => {{ const a = e.target.closest && e.target.closest('a[href]'); if (a && !a.target) a.target = '_blank'; }}, true);</script>\n"
)


def main():
    portal = sys.argv[1] if len(sys.argv) > 1 else 'itch'
    files = []
    for d, dirs, names in os.walk(SRC):
        rel = os.path.relpath(d, SRC)
        if rel == '.':
            dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
        else:
            dirs.sort()
        for n in sorted(names):
            if rel == '.' and n in SKIP_FILES:
                continue
            files.append(os.path.normpath(os.path.join(rel, n)))

    html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
    first = html.index('<script')
    html = html[:first] + FLAGS.format(p=portal) + html[first:]
    if 'CLIMBIX_PORTAL' not in html:
        sys.exit('index.html: não achei onde marcar a versão de portal')

    os.makedirs(OUT, exist_ok=True)
    zpath = os.path.join(OUT, 'climbix-' + portal + '.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files:
            if f == 'index.html':
                z.writestr('index.html', html)
            else:
                z.write(os.path.join(SRC, f), f.replace(os.sep, '/'))
    size = os.path.getsize(zpath) / 1e6
    print(f'{zpath}: {len(files)} arquivos, {size:.1f} MB')
    if len(files) > 1000:
        sys.exit('Passou de 1000 arquivos: o itch.io recusa o pacote')


if __name__ == '__main__':
    main()
