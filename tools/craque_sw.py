"""Gera craque/sw.js: service worker que guarda o jogo no aparelho (instalável e offline).

Rode sempre que arquivos do jogo forem adicionados/removidos:  python3 tools/craque_sw.py
Estratégia: código e página (html/js/css) vêm da rede quando há conexão (atualizações chegam na hora)
e do cache sem internet; imagens, escudos, ícones e o modelo 3D vêm do cache primeiro.
"""
import hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent / "craque"
# Imagens e modelos citados no código levam a versão do próprio conteúdo (?v=...): quando o arquivo
# muda, o celular não reaproveita a cópia antiga do cache (o CDN guarda imagens por 7 dias).
fhash = lambda p: hashlib.sha1(p.read_bytes()).hexdigest()[:8]
asset_re = re.compile(r"(['\"])(assets/[^'\"?]+\.(?:png|jpg|glb))(?:\?v=[0-9a-f]+)?(['\"])")
versioned = {}
for p in sorted((ROOT / "src").rglob("*.js")):
    src = p.read_text()
    def stamp(m):
        f = ROOT / m.group(2)
        if not f.is_file():
            return m.group(0)
        versioned[m.group(2)] = m.group(2) + "?v=" + fhash(f)
        return m.group(1) + versioned[m.group(2)] + m.group(3)
    new = asset_re.sub(stamp, src)
    if new != src:
        p.write_text(new)
files = ["./"]
for p in sorted(ROOT.rglob("*")):
    if p.is_file() and p.name not in ("sw.js", "README.md") and p.suffix in (".html", ".css", ".js", ".png", ".jpg", ".glb", ".webmanifest", ".woff2"):
        rel = p.relative_to(ROOT).as_posix()
        files.append("./" + versioned.get(rel, rel))
digest = hashlib.sha1("".join(files).encode()).hexdigest()[:8]
assets = ",\n  ".join('"%s"' % f for f in files)
(ROOT / "sw.js").write_text("""// Gerado por tools/craque_sw.py — não editar à mão.
// Guarda o jogo no aparelho: funciona sem internet depois da primeira visita.
const CACHE = 'craque-%s';
const ASSETS = [
  %s
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('craque-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Código/página: rede primeiro (sempre a versão nova), cache se estiver sem internet.
// Imagens, 3D e bibliotecas externas: cache primeiro.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return; // ranking: sempre da rede
  const code = url.origin === location.origin && /(\\/|\\.html|\\.js|\\.css|\\.webmanifest)$/.test(url.pathname);
  if (code) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
""" % (digest, assets))
# Versão pelo conteúdo do código: vai na URL de cada script/estilo e do service worker (?v=...).
# O index.html não fica em cache no CDN; assim cada deploy força js/css novos mesmo com cache longo.
code = sorted(p for p in ROOT.rglob("*") if p.is_file() and p.suffix in (".js", ".css") and p.name != "sw.js")
ver = hashlib.sha1(b"".join(p.read_bytes() for p in code) + (ROOT / "sw.js").read_bytes()).hexdigest()[:8]
idx = ROOT / "index.html"
html = idx.read_text()
html = re.sub(r'((?:src|href)="(?:src/[^"?]+\.js|style\.css))(?:\?v=[0-9a-f]+)?"', r'\1?v=' + ver + '"', html)
html = re.sub(r"window\.CLIMBIX_VER = '[0-9a-f]*'", "window.CLIMBIX_VER = '" + ver + "'", html)
# Ícones: versão pelo conteúdo (o CDN guarda imagens por 7 dias)
html = re.sub(r'((?:href|content)="(icons/[^"?]+\.png))(?:\?v=[0-9a-f]+)?(")', lambda m: m.group(1) + "?v=" + fhash(ROOT / m.group(2)) + m.group(3), html)
man = ROOT / "manifest.webmanifest"
mtxt = re.sub(r'("src": "(icons/[^"?]+\.png))(?:\?v=[0-9a-f]+)?(")', lambda m: m.group(1) + "?v=" + fhash(ROOT / m.group(2)) + m.group(3), man.read_text())
man.write_text(mtxt)
if "window.CLIMBIX_VER" not in html:
    html = html.replace('<script src="src/sound.js', "<script>window.CLIMBIX_VER = '" + ver + "';</script>\n<script src=\"src/sound.js", 1)
idx.write_text(html)
print("sw.js com", len(files), "arquivos · cache", digest, "· versão", ver)
