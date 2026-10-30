# Ícones desenhados do jogo: recorta as folhas (grade 6 × 6, a última 4 × 3) em craque/assets/ic/<código>.webp,
# tira o fundo creme ligado à borda de cada célula e escreve em ui/core.js a lista de emojis que têm desenho.
# O nome do arquivo é o mesmo código do Twemoji (U.twCode); emoji sem desenho continua no Twemoji (assets/tw).
# Uso: python3 tools/craque_icones.py [pasta com folha-1.png … folha-6.png]  (padrão: arte/icones)
import sys, re, pathlib, numpy as np
from PIL import Image, ImageDraw
RAIZ = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else RAIZ / 'arte' / 'icones')
OUT = RAIZ / 'craque' / 'assets' / 'ic'
# Emoji de cada célula, na ordem de leitura; None = desenho sem emoji no jogo (o apito). Vários emojis dividem um desenho.
FOLHAS = {
  1: '⚽ 🏆 ⭐ 🎯 🔒 💬 🏟️ ✅ 🥅 🎲 🎟️ 🌍,🌎 ⚡ ⚠️ ⚔️ 🏅 🔥 📱 📒 ❤️ ⬆️ 🩹 🧱 🧤 🧊 👟 🤝 📣 📰,🗞️ 🎙️ 💰 💪 📈 - ⏳ 🏁',
  2: '🛡️ 🦵 🏃 🦶 🤸 💥 🌀 💨 🎖️ 🥇 👑 🌟 💎 💯 🪜 📐 🧠 👁️ 🦊 🦁 🦒 🐔 🐶 🗿 🏋️ 🧘 🩺 🧑‍⚕️ 🩻 🤒 🤕 🧴 🥗 🍽️ 🥶 🌙',
  3: '🛏️ 🛋️ ⏱️ ⌚ 🔁 🔄 ↔️ ⬇️ ➡️ ⏩ ⏭️ 🔙 🔓 🚫 🛑 🚩 🟨 🚨 ⚖️ 🏛️ 💵 💸 🏦 💼 🕴️ 👔 🖋️ 📝 📋 📜 🃏 🎰 🏷️ 📦 🧳 ✈️',
  4: '🚌 🏎️ 🏠 🏚️ 🏢 🏨 🏰 🏗️ 🌱 🧭 🔭 🔍 📊 🎓 📚 📖 📺 🎬 🎞️ 📹 📸 📡 🗯️ 🗣️ 📢 🎮 🕹️ 💡 👋 🙈 😤 😈 💀 🛸 🌠 🪄',
  5: '🎩 👓 🩲 💇 ✂️ 🫧 🎨 🏹 🥊 🥁 🎸 🎺 🎵 🎶 🎼 🎤 🕺 👯 🎂 🎉 💍 💞 👶 🧒 🧓 👨‍👦 🧑‍🤝‍🧑 🧑‍🏫 👩 👨 🤲 🤚 👆 🕯️ 🎗️ 🛢️',
  6: '🎌 🌐 ☁️ 🪑 📞 ✍️ 🚪 🔟 🥾 🟡 ✏️ ➖',
}
GRID = {f: ((4, 3) if f == 6 else (6, 6)) for f in FOLHAS}
S = 128  # 2× o maior tamanho na tela
# Mesmo código do Twemoji (ui/core.js twCode): hexa separado por "-", sem fe0f fora das sequências com ZWJ
def tw_code(e): return '-'.join('%x' % ord(c) for c in (e if '\u200d' in e else e.replace('\ufe0f', '')))

GRID = {1: (6, 6), 2: (6, 6), 3: (6, 6), 4: (6, 6), 5: (6, 6), 6: (4, 3)}
S = 128

def runs(prof, n):
    ink = prof > 2
    # n faixas com tinta separadas pelas maiores faixas vazias
    on = ink > 0
    segs = []; i = 0; L = len(on)
    while i < L:
        if on[i]:
            j = i
            while j < L and on[j]: j += 1
            segs.append([i, j]); i = j
        else: i += 1
    segs = [x for x in segs if x[1] - x[0] > 3]
    while len(segs) < n:  # dois ícones encostados: corta a faixa mais larga no ponto de menos tinta
        k = max(range(len(segs)), key=lambda i: segs[i][1] - segs[i][0]); a, b = segs[k]
        lo, hi = a + (b - a) // 5, b - (b - a) // 5; m = lo + int(np.argmin(prof[lo:hi]))
        segs[k:k + 1] = [[a, m], [m, b]]
    while len(segs) > n:  # junta o par com a menor distância
        g = [segs[k + 1][0] - segs[k][1] for k in range(len(segs) - 1)]
        k = int(np.argmin(g)); segs[k] = [segs[k][0], segs[k + 1][1]]; del segs[k + 1]
    return segs

def cells(im, cols, rows):
    a = np.asarray(im).astype(int); bg = np.median(a[:8, :, :].reshape(-1, 3), axis=0)
    d = np.abs(a - bg).sum(axis=2); ink = d > 90
    cx = runs(ink.sum(axis=0), cols); cy = runs(ink.sum(axis=1), rows)
    if len(cx) != cols or len(cy) != rows: raise SystemExit('grade não achada %s %s' % (len(cx), len(cy)))
    return bg, cx, cy

def cut(im, bg, box):
    x0, y0, x1, y1 = box
    c = im.crop((x0, y0, x1, y1)).convert('RGB'); w, h = c.size
    MAG = (255, 0, 255)
    for p in [(x, 0) for x in range(0, w, 6)] + [(x, h - 1) for x in range(0, w, 6)] + [(0, y) for y in range(0, h, 6)] + [(w - 1, y) for y in range(0, h, 6)]:
        if c.getpixel(p) != MAG and sum(abs(c.getpixel(p)[i] - bg[i]) for i in range(3)) < 60:
            ImageDraw.floodfill(c, p, MAG, thresh=55)
    a = np.asarray(c).astype(int)
    out = a == np.array(MAG); out = out.all(axis=2)
    alpha = np.where(out, 0, 255).astype(float)
    # borda suave: pixel de tinta vizinho do fundo ganha alfa pela distância ao creme
    near = np.zeros_like(out)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): near |= np.roll(np.roll(out, dy, 0), dx, 1)
    edge = near & ~out
    dist = np.abs(a - bg).sum(axis=2)
    alpha[edge] = np.clip(dist[edge] / 120.0, 0, 1) * 255
    rgb = a.copy(); rgb[out] = bg
    img = Image.fromarray(np.dstack([rgb, alpha]).astype('uint8'), 'RGBA')
    # tira pontinhos soltos: só guarda a caixa da tinta com alfa alto
    m = np.asarray(img)[:, :, 3] > 128
    ys, xs = np.where(m)
    bx = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    bw, bh = bx.size; side = int(max(bw, bh) / 0.92)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(bx, ((side - bw) // 2, (side - bh) // 2))
    return sq.resize((S, S), Image.LANCZOS)

OUT.mkdir(parents=True, exist_ok=True)
codes = []
for f, (cols, rows) in GRID.items():
    im = Image.open(SRC / ('folha-%d.png' % f)).convert('RGB')
    bg, cx, cy = cells(im, cols, rows)
    nomes = FOLHAS[f].split()
    assert len(nomes) == cols * rows, 'folha %d: %d nomes para %d células' % (f, len(nomes), cols * rows)
    for r in range(rows):
        for k in range(cols):
            es = nomes[r * cols + k]
            if es == '-': continue
            pad = 6
            box = (max(0, cx[k][0] - pad), max(0, cy[r][0] - pad), min(im.width, cx[k][1] + pad), min(im.height, cy[r][1] + pad))
            ic = cut(im, bg, box)
            for e in es.split(','):
                c = tw_code(e); codes.append(c)
                ic.save(OUT / (c + '.webp'), 'WEBP', quality=88, method=6)
for p in OUT.glob('*.webp'):
    if p.stem not in codes: p.unlink()
core = RAIZ / 'craque' / 'src' / 'ui' / 'core.js'
src = core.read_text()
new = re.sub(r"(const IC = new Set\(')[^']*('\.split)", lambda m: m.group(1) + ' '.join(sorted(codes)) + m.group(2), src)
if new == src and 'const IC = new Set(' not in src: raise SystemExit('ui/core.js sem a linha const IC')
core.write_text(new)
print('ícones: %d desenhos, %d emojis' % (len(set(codes)), len(codes)))
