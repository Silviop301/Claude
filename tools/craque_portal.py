#!/usr/bin/env python3
"""Versão de portal (itch.io e afins): gera dist/climbix-portal.zip a partir de craque/.

O portal mostra o jogo dentro da página dele (iframe, em outro domínio), por isso o pacote:
- deixa de fora api/ (o PHP fica em climbix.app; o jogo já chama https://climbix.app/api/ fora do site),
  sw.js e manifest (sem modo offline nem "instalar") e badges/ (~1000 escudos: o itch.io aceita
  no máximo 1000 arquivos; os escudos vêm de https://climbix.app/badges/, que libera CORS);
- marca a página com CLIMBIX_PORTAL, CLIMBIX_BADGES e CLIMBIX_HOME (links de compartilhar
  apontam para climbix.app; login só com usuário e senha);
- abre links (Privacidade, Termos) em outra aba, para não trocar a página dentro do portal;
- no CrazyGames e no Poki (SOLO), sem conta e sem links para climbix.app (regras desses portais).

Uso (da raiz): python3 tools/craque_portal.py [nome-do-portal] [en]   # padrão: itch, em português
Com "en", os textos viram a tradução de craque/i18n/en.json (tools/craque_i18n.js apply; precisa do
typescript global) e a pasta dist/<portal>/ fica para conferir antes do zip.
"""
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'craque')
OUT = os.path.join(ROOT, 'dist')
SKIP_DIRS = {'api', 'badges', 'i18n'}
SKIP_FILES = {'sw.js', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml'}
HOME = 'https://climbix.app/'
# Portais que proíbem login externo e links para a versão jogável no site: sem conta, sem desafio por link,
# carta compartilhada só como imagem
SOLO = {'crazygames', 'poki'}

FLAGS = (
    "<script>window.CLIMBIX_PORTAL = '{p}'; window.CLIMBIX_BADGES = '" + HOME + "badges/'; window.CLIMBIX_HOME = '" + HOME + "';\n"
    "document.addEventListener('click', e => {{ const a = e.target.closest && e.target.closest('a[href]'); if (a && !a.target) a.target = '_blank'; }}, true);</script>\n"
)

# Textos fixos do index.html na versão em inglês
EN_HTML = [
    ('<html lang="pt-BR">', '<html lang="en">'),
    ('Jogo de carreira de futebol grátis no navegador', 'Free football career game in your browser'),
    ('Jogo de carreira de futebol">', 'Football career game">'),
    ('Jogo grátis de carreira de futebol no navegador: crie um garoto de 16 anos, escolha clubes, jogue os lances decisivos e descubra se ele vira lenda.', 'Free football career game in your browser: create a 16-year-old, pick clubs, play the decisive moments and find out if he becomes a legend.'),
    ('Crie um garoto de 16 anos e descubra se ele vira lenda do futebol.', 'Create a 16-year-old and find out if he becomes a football legend.'),
    ('aria-label="Nota geral"', 'aria-label="Overall rating"'),
    ('<div class="eyebrow">Carreira de futebol</div>', '<div class="eyebrow">Football career</div>'),
]

# Só na versão em inglês: corrige na tela o que vem montado do código (3º → 3rd, 21th → 21st)
# e os códigos de posição (ATA, MEI, ZAG, GOL → ST, CAM, CB, GK)
EN_SCRIPT = """<script>(function () {
  const P = { ATA: 'ST', MEI: 'CAM', ZAG: 'CB', GOL: 'GK' };
  const ord = n => { const t = n % 100; return n + (t > 10 && t < 14 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')); };
  const fix = s => s.replace(/\\b(\\d+)(?:º|ª|th)(?![a-z])/g, (m, n) => ord(+n)).replace(/\\b(ATA|MEI|ZAG|GOL)\\b/g, m => P[m]);
  const walk = n => {
    if (n.nodeType === 3) { const t = n.nodeValue, f = fix(t); if (f !== t) n.nodeValue = f; return; }
    if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) n.childNodes.forEach(walk);
  };
  new MutationObserver(ms => ms.forEach(m => (m.type === 'characterData' ? walk(m.target) : m.addedNodes.forEach(walk))))
    .observe(document.body, { childList: true, subtree: true, characterData: true });
})();</script>
"""


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

    lang = sys.argv[2] if len(sys.argv) > 2 else 'pt'
    html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
    # Endereço, canônico e ficha do Google valem só para o climbix.app
    html, n = re.subn(r'<!-- SEO:.*?<!-- /SEO -->\n', '', html, flags=re.S)
    if n != 1:
        sys.exit('index.html: não achei o bloco <!-- SEO -->')
    first = html.index('<script')
    flags = FLAGS.format(p=portal)
    if portal in SOLO:
        flags = flags.replace("<script>", "<script>window.CLIMBIX_SOLO = true; ", 1)
    html = html[:first] + flags + html[first:]
    if 'CLIMBIX_PORTAL' not in html:
        sys.exit('index.html: não achei onde marcar a versão de portal')
    if lang == 'en':
        for a, b in EN_HTML:
            if a not in html:
                sys.exit('index.html: não achei ' + a)
            html = html.replace(a, b)
        html = html.replace(flags, flags + EN_SCRIPT)

    name = portal + ('-' + lang if lang != 'pt' else '')
    work = os.path.join(OUT, name)
    shutil.rmtree(work, ignore_errors=True)
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(work, f)), exist_ok=True)
        shutil.copy2(os.path.join(SRC, f), os.path.join(work, f))
    open(os.path.join(work, 'index.html'), 'w', encoding='utf-8').write(html)
    if lang == 'en':
        subprocess.run(['node', os.path.join(ROOT, 'tools', 'craque_i18n.js'), 'apply', work], check=True)
        # Privacidade e Termos traduzidos à mão (craque/i18n/*.en.html)
        for p in ('privacidade', 'termos'):
            en = os.path.join(SRC, 'i18n', p + '.en.html')
            if os.path.exists(en):
                shutil.copy2(en, os.path.join(work, p + '.html'))

    zpath = os.path.join(OUT, 'climbix-' + name + '.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(os.path.join(work, f), f.replace(os.sep, '/'))
    size = os.path.getsize(zpath) / 1e6
    print(f'{zpath}: {len(files)} arquivos, {size:.1f} MB')
    if len(files) > 1000:
        sys.exit('Passou de 1000 arquivos: o itch.io recusa o pacote')


if __name__ == '__main__':
    main()
