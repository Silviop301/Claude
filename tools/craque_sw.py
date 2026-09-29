"""Gera craque/sw.js: service worker que guarda o jogo no aparelho (instalável e offline).

Rode sempre que arquivos do jogo forem adicionados/removidos:  python3 tools/craque_sw.py
Estratégia: código e página (html/js/css) vêm da rede quando há conexão (atualizações chegam na hora)
e do cache sem internet; imagens, escudos, ícones e o modelo 3D vêm do cache primeiro.
"""
import hashlib, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "craque"
files = ["./"]
for p in sorted(ROOT.rglob("*")):
    if p.is_file() and p.name not in ("sw.js", "README.md") and p.suffix in (".html", ".css", ".js", ".png", ".glb", ".webmanifest", ".woff2"):
        files.append("./" + p.relative_to(ROOT).as_posix())
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
print("sw.js com", len(files), "arquivos · cache", digest)
