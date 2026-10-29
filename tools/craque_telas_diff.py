"""Compara duas rodadas do craque_telas.js (antes e depois de mexer no CSS) e aponta as telas que mudaram.

A carreira das fotos tem sorteio fixo, mas pode se separar no meio (lances jogados, posts): as telas do começo (início,
criação, base, pré-temporada, evento) saem iguais; da Copa em diante, e nas telas de fora que mostram a carreira jogada
(conquistas, Sala, coleção), a carreira pode ser outra.
Olhe a comparação lado a lado antes de concluir que foi regressão.

Uso: python3 tools/craque_telas_diff.py <pasta antes> <pasta depois> [limite %]   (padrão 0.5)
Sai: lista de telas por % de pixels diferentes e <pasta depois>/diff/<tela>.png (antes | depois | diferença em vermelho).
"""
import os, sys
from PIL import Image, ImageChops

def main():
    a, b = sys.argv[1], sys.argv[2]
    lim = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
    out = os.path.join(b, 'diff'); os.makedirs(out, exist_ok=True)
    # O nome da tela (sem o número da frente) é estável entre rodadas
    key = lambda f: f.split('-', 1)[1] if '-' in f else f
    A = {key(f): f for f in os.listdir(a) if f.endswith('.png')}
    B = {key(f): f for f in os.listdir(b) if f.endswith('.png')}
    rows = []
    for k in sorted(set(A) | set(B)):
        if k not in A or k not in B:
            rows.append((100.0, k, 'só antes' if k in A else 'só depois')); continue
        ia, ib = Image.open(os.path.join(a, A[k])).convert('RGB'), Image.open(os.path.join(b, B[k])).convert('RGB')
        if ia.size != ib.size:
            rows.append((100.0, k, 'tamanho %dx%d → %dx%d' % (ia.size + ib.size))); continue
        d = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > 24 else 0)
        pct = sum(d.histogram()[255:]) / (ia.size[0] * ia.size[1]) * 100
        rows.append((pct, k, ''))
        if pct >= lim:
            w, h = ia.size
            red = Image.new('RGB', ia.size, (230, 40, 40))
            mark = Image.composite(red, ib.point(lambda v: v // 3), d)
            sheet = Image.new('RGB', (w * 3 + 16, h), (20, 20, 20))
            for i, im in enumerate((ia, ib, mark)): sheet.paste(im, (i * (w + 8), 0))
            sheet.save(os.path.join(out, k))
    rows.sort(reverse=True)
    changed = [r for r in rows if r[0] >= lim]
    print('%d telas · %d mudaram (≥ %.1f%% dos pixels)' % (len(rows), len(changed), lim))
    for pct, k, note in changed:
        print('  %6.1f%%  %s %s' % (pct, k, note))
    if changed: print('Comparação lado a lado em ' + out)

main()
