// Gera as texturas dos acabamentos da carta (pacotinhos): craque/assets/cartas/ac-<id>.jpg, 768×1152 como as outras.
// Desenhadas por código em canvas (Chromium do Playwright), sem imagem de fora. Contraste moderado no centro,
// porque a nota, o nome, os atributos e a assinatura são escritos por cima.
// Uso: NODE_PATH=/opt/node22/lib/node_modules node tools/craque_acabamentos.js [id...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'craque', 'assets', 'cartas');
const ONLY = process.argv.slice(2);

// Código que roda no navegador: cada função desenha num canvas 768×1152
const PAGE = String.raw`
const W = 768, H = 1152;
function mk() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// Ruído de valor suave + fbm
function noise(seed) {
  const r = rnd(seed), P = new Float32Array(512 * 512); for (let i = 0; i < P.length; i++) P[i] = r();
  const at = (x, y) => P[((y & 511) << 9) | (x & 511)];
  const sm = t => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (x, y, oct = 5) => { let v = 0, amp = .5, f = 1; for (let o = 0; o < oct; o++) { v += n(x * f, y * f) * amp; amp *= .5; f *= 2; } return v; };
}
const mix = (a, b, t) => a + (b - a) * t;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function pixels(fn) {
  const c = mk(), x = c.getContext('2d'), id = x.createImageData(W, H), d = id.data;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) { const [r, g, b] = fn(i, y), k = (y * W + i) * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255; }
  x.putImageData(id, 0, 0); return c;
}
// Brilho diagonal suave por cima (como o metal das outras cartas)
function sheen(c, a) {
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(.15, 'rgba(255,255,255,0)'); g.addColorStop(.3, 'rgba(255,255,255,' + a + ')'); g.addColorStop(.42, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
}
function vignette(c, a) {
  const x = c.getContext('2d'), g = x.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + a + ')'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
}
const T = {
  carbono() {
    const n = noise(3), S = 18;
    const c = pixels((x, y) => {
      const i = Math.floor(x / S), j = Math.floor(y / S), fx = (x % S) / S, fy = (y % S) / S;
      const horiz = ((Math.floor((i + j) / 2)) % 2) === 0; // trama sarja: blocos alternando a direção da fibra
      const f = horiz ? fy : fx, along = horiz ? fx : fy;
      let v = .5 + .5 * Math.sin(f * Math.PI); v = Math.pow(v, 1.4);
      v *= .82 + .18 * Math.sin(along * Math.PI);
      v += (n(x * .02, y * .02, 2) - .5) * .12;
      const l = mix(20, 74, v); return [l, l + 2, l + 6];
    });
    return sheen(vignette(c, .35), .12);
  },
  marmore() {
    const n = noise(11), m = noise(29);
    const c = pixels((x, y) => {
      const t = n(x * .0035, y * .0035, 6), u = m(x * .006, y * .006, 5);
      const vein = Math.pow(1 - Math.abs(Math.sin((x * .0028 + y * .0042 + t * 5.5) * Math.PI)), 26);
      const grey = Math.pow(1 - Math.abs(Math.sin((x * .006 - y * .002 + u * 7) * Math.PI)), 14) * .35;
      const base = 238 - (t - .5) * 22;
      const g = hex('#C9A24A');
      return [mix(base - grey * 60, g[0], vein * .9), mix(base - 2 - grey * 60, g[1], vein * .9), mix(base - 8 - grey * 55, g[2], vein * .9)];
    });
    return sheen(vignette(c, .12), .18);
  },
  madeira() {
    const n = noise(5), m = noise(17);
    const c = pixels((x, y) => {
      const w = n(x * .003, y * .0012, 5), r = x * .018 + w * 9 + Math.sin(y * .004) * 1.2;
      let v = r - Math.floor(r); v = Math.pow(v, 2.2);
      const grain = (m(x * .4, y * .012, 2) - .5) * .25;
      const t = Math.min(1, Math.max(0, .35 + v * .5 + grain));
      const a = hex('#2A170C'), b = hex('#6E4226');
      return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
    });
    return sheen(vignette(c, .3), .22);
  },
  neon() {
    const c = mk(), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0B0D22'); g.addColorStop(1, '#170C2A'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(80,120,255,.08)'; x.lineWidth = 1;
    for (let i = 0; i < W; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    for (let j = 0; j < H; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    const r = rnd(8);
    const line = (col, y0, amp, ph, w) => {
      for (const [blur, lw, a] of [[40, w * 3, .35], [16, w * 1.6, .6], [0, w * .6, 1]]) {
        x.save(); x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = lw; x.lineCap = 'round';
        x.beginPath(); for (let i = -20; i <= W + 20; i += 8) { const yy = y0 + Math.sin(i * .008 + ph) * amp + i * .35; i < -10 ? x.moveTo(i, yy) : x.lineTo(i, yy); } x.stroke(); x.restore();
      }
    };
    line('#29E6FF', 80, 60, 0, 4); line('#FF3DA6', 300, 50, 2, 3.5); line('#29E6FF', 700, 70, 4, 3); line('#FF3DA6', 880, 40, 1, 4);
    return vignette(c, .45);
  },
  aurora() {
    const c = mk(), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#040814'); g.addColorStop(1, '#0C1A2C'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = rnd(4); x.fillStyle = '#fff';
    for (let i = 0; i < 260; i++) { x.globalAlpha = .2 + r() * .6; x.fillRect(r() * W, r() * H, r() < .9 ? 1.4 : 2.4, r() < .9 ? 1.4 : 2.4); }
    x.globalAlpha = 1;
    const n = noise(21);
    const band = (y0, amp, f, ph, col, h) => {
      const [cr, cg, cb] = hex(col);
      const id = x.getImageData(0, 0, W, H), d = id.data;
      for (let px = 0; px < W; px++) {
        const center = y0 + Math.sin(px * f + ph) * amp + (n(px * .01, y0 * .01, 3) - .5) * 80;
        const streak = .6 + .4 * n(px * .08, ph, 2);
        for (let py = Math.max(0, center - h * 2.5); py < Math.min(H, center + h); py++) {
          const dy = (py - center) / h, a = Math.exp(-dy * dy * (dy > 0 ? 3 : .6)) * .55 * streak, k = (Math.floor(py) * W + px) * 4;
          d[k] = mix(d[k], cr, a); d[k + 1] = mix(d[k + 1], cg, a); d[k + 2] = mix(d[k + 2], cb, a);
        }
      }
      x.putImageData(id, 0, 0);
    };
    band(380, 90, .006, 0, '#2DFFA0', 90); band(620, 70, .008, 2, '#9B5CFF', 80); band(860, 60, .007, 4, '#2DFFA0', 70);
    return c;
  },
  camuflado() {
    const a = noise(31), b = noise(47), cc = noise(59);
    const P = ['#2B2D30', '#45484D', '#5F6369', '#7B8086'].map(hex);
    const c = pixels((x, y) => {
      const v1 = a(x * .006, y * .006, 4), v2 = b(x * .008, y * .008, 4), v3 = cc(x * .01, y * .01, 3);
      const k = v3 > .58 ? 0 : v2 > .55 ? 1 : v1 > .5 ? 3 : 2;
      return P[k];
    });
    return sheen(vignette(c, .25), .1);
  },
  vitral() {
    const r = rnd(12), pts = [];
    for (let i = 0; i < 46; i++) pts.push([r() * W, r() * H, ['#B8263A', '#2E5FB8', '#E0A21E', '#2E9A5A', '#7A3AB0', '#D85A1E', '#1E8A9A'][Math.floor(r() * 7)]]);
    const cols = pts.map(p => hex(p[2]));
    const c = pixels((x, y) => {
      let d1 = 1e9, d2 = 1e9, k = 0;
      for (let i = 0; i < pts.length; i++) { const dx = x - pts[i][0], dy = y - pts[i][1], dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; k = i; } else if (dd < d2) d2 = dd; }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      if (edge < 5) return [26, 24, 22];
      const glow = Math.max(0, 1 - Math.sqrt(d1) / 160) * .35, col = cols[k];
      return [Math.min(255, col[0] * (.6 + glow)), Math.min(255, col[1] * (.6 + glow)), Math.min(255, col[2] * (.6 + glow))];
    });
    return sheen(vignette(c, .3), .14);
  },
  holografico() {
    const n = noise(77), r = rnd(9);
    const c = pixels((x, y) => {
      const h = ((x * .22 + y * .3 + n(x * .004, y * .004, 4) * 220) % 360 + 360) % 360;
      const s = .62, l = .7 + (n(x * .02, y * .02, 2) - .5) * .1;
      const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      const f = m => l - a * Math.max(-1, Math.min(k(m) - 3, Math.min(9 - k(m), 1)));
      return [f(0) * 255, f(8) * 255, f(4) * 255];
    });
    const x = c.getContext('2d');
    for (let i = 0; i < 380; i++) { const px = r() * W, py = r() * H, s = 1 + r() * 2.2; x.fillStyle = 'rgba(255,255,255,' + (.5 + r() * .5) + ')'; x.fillRect(px - s / 2, py - s * 2, s, s * 4); x.fillRect(px - s * 2, py - s / 2, s * 4, s); }
    return sheen(c, .3);
  },
  ourorose() {
    const n = noise(13), r = rnd(5), rows = new Float32Array(H);
    for (let y = 0; y < H; y++) rows[y] = (r() - .5) * .14;
    const a = hex('#9E5A48'), b = hex('#F4C8B6'), cc = hex('#C9846E');
    const c = pixels((x, y) => {
      const t = (x / W) * .4 + (y / H) * .6 + (n(x * .002, y * .002, 3) - .5) * .3;
      const brush = rows[y] + (n(x * .004, y * 1.5, 1) - .5) * .08;
      const v = Math.min(1, Math.max(0, .5 + Math.sin(t * Math.PI * 2.2) * .38 + brush));
      const c1 = v < .5 ? a : b, c0 = v < .5 ? cc : cc, tt = Math.abs(v - .5) * 2;
      return [mix(c0[0], c1[0], tt), mix(c0[1], c1[1], tt), mix(c0[2], c1[2], tt)];
    });
    return sheen(c, .28);
  },
  diamante() {
    const c = mk(), x = c.getContext('2d'), r = rnd(21), S = 96, pts = [];
    for (let j = -1; j <= H / S + 1; j++) for (let i = -1; i <= W / S + 1; i++) pts.push([i * S + (j % 2 ? S / 2 : 0) + (r() - .5) * 40, j * S * .86 + (r() - .5) * 40]);
    const cols = Math.ceil(W / S) + 3;
    x.fillStyle = '#CFE8F6'; x.fillRect(0, 0, W, H);
    const tri = (a, b, cpt) => {
      const l = 70 + r() * 28, g = x.createLinearGradient(a[0], a[1], cpt[0], cpt[1]);
      g.addColorStop(0, 'hsl(200,60%,' + l + '%)'); g.addColorStop(1, 'hsl(205,55%,' + Math.max(55, l - 18) + '%)');
      x.fillStyle = g; x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.lineTo(...cpt); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.4; x.stroke();
    };
    for (let k = 0; k + cols + 1 < pts.length; k++) { if ((k + 1) % cols === 0) continue; tri(pts[k], pts[k + 1], pts[k + cols]); tri(pts[k + 1], pts[k + cols + 1], pts[k + cols]); }
    for (let i = 0; i < 70; i++) { const px = r() * W, py = r() * H, s = 2 + r() * 5; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(px - s / 4, py - s * 2, s / 2, s * 4); x.fillRect(px - s * 2, py - s / 4, s * 4, s / 2); }
    return sheen(c, .3);
  },
};
window.__make = id => T[id]().toDataURL('image/jpeg', .88);
window.__ids = Object.keys(T);
`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<script>' + PAGE + '</script>');
  const ids = ONLY.length ? ONLY : await p.evaluate(() => window.__ids);
  for (const id of ids) {
    const url = await p.evaluate(id => window.__make(id), id);
    fs.writeFileSync(path.join(OUT, 'ac-' + id + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ac-' + id + '.jpg');
  }
  await b.close();
})();
