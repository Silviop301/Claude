// Cenas do Treino do Treinador (2026-11-16, Silvio: "um treino de troca de passes que abre o time jogando um bobinho no card da direita").
// Só desenho: cada um dos 16 treinos de S.CO_TRAIN tem um campinho em miniatura (SVG) com bolinhas que se mexem em laço.
// U.TRC.scene(host, chave, grande) desenha e devolve { paint(u 0..1), dur em segundos }; parado fica no quadro `at`.
// Campo 100x46, ataque para a direita. a = [tipo, quadros [t, x, y]..., fase?]: u nosso, r colete, g goleiro, c cone,
// b cama, z o "z" do sono (sobe e some). `top: 1` = visto de trás do gol (bola parada). Treino novo no motor: ponha a cena aqui com a mesma chave.
(function () {
'use strict';
const U = window.CRAQUE_UI = window.CRAQUE_UI || {};
const st = (k, x, y) => [k, [0, x, y]];
const ring = [[50, 8], [64.3, 18.4], [58.8, 35.1], [41.2, 35.1], [35.7, 18.4]];
const lap = o => ['u', [0, 22, 8], [.3, 78, 8], [.5, 78, 38], [.8, 22, 38], [1, 22, 8], o];
const SC = {
  toque: { bg: 'plain', dur: 6, at: .24, a: [...ring.map(p => st('u', p[0], p[1])),
      ['r', [0, 50, 16], [.2, 55, 28], [.4, 42, 22], [.6, 58, 21], [.8, 46, 30], [1, 50, 16]], ['r', [0, 47, 26], [.2, 52, 22], [.4, 46, 27], [.6, 53, 25], [.8, 49, 24], [1, 47, 26]]],
    b: [[[0, 50, 9.5], [.08, 50, 9.5], [.2, 58, 33.6], [.28, 58, 33.6], [.4, 37.2, 18.8], [.48, 37.2, 18.8], [.6, 62.8, 18.8], [.68, 62.8, 18.8], [.8, 42, 33.6], [.88, 42, 33.6], [1, 50, 9.5]]] },
  final: { bg: 'half', dur: 4, at: .52, a: [st('u', 52, 36), st('c', 58, 12), st('c', 60, 31), ['u', [0, 50, 16], [.25, 62, 20], [.45, 70, 22], [1, 70, 22]], ['g', [0, 96, 23], [.5, 96, 23], [.65, 96.5, 26.5], [1, 96.5, 26.5]]],
    b: [[[0, 53.5, 35.5], [.1, 53.5, 35.5], [.4, 70.5, 22.5], [.48, 71.5, 22.5], [.62, 99, 19.5], [1, 99, 19.5]]] },
  lados: { bg: 'half', dur: 4.5, at: .52, a: [['u', [0, 45, 5], [.4, 86, 5], [1, 86, 5]], ['u', [0, 60, 26], [.35, 68, 26], [.62, 88, 22], [1, 88, 22]], ['r', [0, 78, 22], [.6, 84, 19], [1, 84, 19]], ['g', [0, 96, 22], [.6, 96, 22], [.72, 96, 21], [1, 96, 21]]],
    b: [[[0, 46.5, 5.5], [.4, 87.5, 5.5], [.45, 87.5, 5.5], [.62, 89.5, 21.5], [.72, 99, 25.5], [1, 99, 25.5]]] },
  contra: { bg: 'half', dur: 4.5, at: .45, a: [['r', [0, 40, 23], [.15, 46, 23], [1, 44, 24]], ['u', [0, 54, 26], [.15, 47.6, 23.6], [.3, 50, 23], [1, 52, 23]], ['u', [0, 50, 8], [.25, 56, 9], [.6, 86, 16], [1, 86, 16]], ['r', [0, 44, 10], [.6, 72, 13], [1, 75, 14]], ['g', [0, 96, 23], [.66, 96, 22], [.78, 96, 21], [1, 96, 21]]],
    b: [[[0, 41.5, 23], [.15, 47, 23], [.28, 51.5, 23], [.6, 87.5, 16.5], [.66, 88, 17], [.78, 99, 26], [1, 99, 26]]] },
  pressao: { bg: 'half', dur: 4.5, at: .4, a: [st('r', 86, 10), st('r', 89, 23), st('r', 86, 36), ['u', [0, 54, 10], [.25, 76, 11], [.5, 84, 17], [1, 84, 17]], ['u', [0, 52, 23], [.25, 74, 23], [.5, 84.5, 28], [1, 84.5, 28]], ['u', [0, 54, 36], [.3, 70, 36], [.6, 83.5, 35.5], [.7, 82, 34], [1, 66, 27]]],
    b: [[[0, 84.5, 10], [.08, 84.5, 10], [.25, 87.5, 23], [.32, 87.5, 23], [.5, 84.5, 36], [.6, 84.5, 36], [.7, 80.5, 34], [1, 64.5, 27]]] },
  linha: { bg: 'mid', dur: 4.5, at: .62, line: 0, a: [...[6, 17, 29, 40].map(y => ['u', [0, 38, y], [.3, 38, y], [.5, 50, y], [1, 50, y]]), st('r', 70, 23), ['r', [0, 53, 20], [.3, 49, 21], [.5, 45, 22], [.8, 31, 22], [1, 31, 22]]],
    b: [[[0, 68.5, 23], [.52, 68.5, 23], [.8, 33, 22], [1, 33, 22]]] },
  bloco: { bg: 'half', top: 1, dur: 6, at: .3, a: [...[11, 19, 27, 35].map(y => ['u', [0, 91, y - 3], [.1, 91, y - 3], [.5, 91, y + 3], [.6, 91, y + 3], [1, 91, y - 3]]), ...[9, 18, 28, 37].map(y => ['u', [0, 84, y - 4], [.1, 84, y - 4], [.5, 84, y + 4], [.6, 84, y + 4], [1, 84, y - 4]]),
      st('r', 78, 6), st('r', 77, 23), st('r', 78, 40), st('g', 96.5, 23)],
    b: [[[0, 79.3, 6], [.1, 79.3, 6], [.25, 78.3, 23], [.3, 78.3, 23], [.5, 79.3, 40], [.6, 79.3, 40], [.75, 78.3, 23], [.8, 78.3, 23], [1, 79.3, 6]]] },
  duelos: { bg: 'plain', dur: 4, at: .3, a: [['u', [0, 34, 14], [.35, 49, 14], [.5, 49, 14], [.9, 62, 10], [1, 62, 10]], ['r', [0, 66, 14], [.35, 51.6, 14], [.5, 52, 15], [1, 54, 17]], ['u', [0, 34, 33], [.2, 34, 33], [.55, 49, 33], [.7, 49, 33], [1, 60, 37]], ['r', [0, 66, 33], [.2, 66, 33], [.55, 51.6, 33], [1, 53, 31]]],
    b: [[[0, 50.3, 14], [.5, 50.3, 14], [.9, 63.5, 10], [1, 63.5, 10]], [[0, 50.3, 33], [.7, 50.3, 33], [1, 61.5, 37]]] },
  esc: { bg: 'half', top: 1, dur: 4.5, at: .42, a: [st('u', 97, 3.2), ['u', [0, 76, 30], [.2, 76, 30], [.5, 88.5, 21.5], [1, 88.5, 21.5]], ['u', [0, 77, 19], [.2, 77, 19], [.5, 86, 13], [1, 86, 13]], ['u', [0, 76, 25], [.2, 76, 25], [.5, 84, 29], [1, 84, 29]], st('r', 87, 25.5), st('r', 86, 17), st('r', 90, 31), ['g', [0, 96.5, 22], [.5, 96.5, 22], [.6, 96.5, 21], [1, 96.5, 21]]],
    b: [[[0, 98.6, 1.4], [.2, 98.6, 1.4], [.5, 89.5, 20.4], [.6, 99, 25], [1, 99, 25]]] },
  falta: { bg: 'half', top: 1, dur: 4, at: .2, a: [['u', [0, 76.5, 27], [.25, 77.2, 24], [1, 77.6, 24]], st('r', 87, 20), st('r', 87, 23), st('r', 87, 26), ['g', [0, 96.5, 24.5], [.45, 96.5, 24.5], [.6, 96.8, 21.5], [1, 96.8, 21.5]]],
    b: [[[0, 78.5, 23], [.25, 78.5, 23], [.42, 87, 16.5], [.6, 99, 19.3], [1, 99, 19.3]]] },
  defesc: { bg: 'half', top: 1, dur: 4.5, at: .3, a: [st('r', 97, 3.2), ['u', [0, 87, 20], [.5, 88.3, 21.6], [1, 88.3, 21.6]], st('u', 85, 28), st('u', 91, 15.5), st('u', 91, 30), ['r', [0, 76, 28], [.5, 86.3, 24.6], [1, 86.3, 24.6]], ['r', [0, 77, 17], [.5, 86, 16], [1, 86, 16]], st('g', 96.5, 23)],
    b: [[[0, 98.6, 1.4], [.2, 98.6, 1.4], [.5, 89.4, 20.4], [.75, 79, 10], [1, 74, 6]]] },
  pen: { bg: 'half', top: 1, dur: 3.6, at: .2, a: [['u', [0, 77.5, 25.5], [.35, 84.8, 23.3], [1, 85, 23.3]], st('u', 78.5, 12), st('u', 78.5, 34), st('r', 78.5, 17), ['g', [0, 96.8, 23], [.38, 96.8, 23], [.5, 97, 26.3], [1, 97, 26.3]]],
    b: [[[0, 86, 23], [.35, 86, 23], [.5, 99, 19.6], [1, 99, 19.6]]] },
  recup: { bg: 'plain', dur: 9, at: .2, a: [0, 1, 2, 3].map(i => ['u', [0, 20 + 9 * i, i % 2 ? 26 : 20], [.5, 52 + 9 * i, i % 2 ? 26 : 20], [1, 20 + 9 * i, i % 2 ? 26 : 20]]), b: [] },
  resist: { bg: 'plain', dur: 7, at: .1, a: [st('c', 19, 5.5), st('c', 81, 5.5), st('c', 81, 40.5), st('c', 19, 40.5), lap(0), lap(.07), lap(.14), lap(.21)], b: [] },
  veloc: { bg: 'plain', dur: 4.5, at: .22, a: [...[5, 17, 29, 41].flatMap(y => [st('c', 24, y), st('c', 79, y)]), ...[11, 23, 35].map((y, i) => ['u', [0, 26, y], [.1, 26, y], [.32, 77, y], [.45, 77, y], [.9, 26, y], [1, 26, y], i * .06])], b: [] },
  folga: { bg: 'plain', dur: 5, at: .35, a: [st('b', 29, 17), st('b', 63, 17), st('b', 29, 37), st('b', 63, 37),
      ['z', [0, 25, 12], [1, 33, 5], 0.001], ['z', [0, 25, 12], [1, 33, 5], 0.5], ['z', [0, 59, 12], [1, 67, 5], 0.131], ['z', [0, 59, 12], [1, 67, 5], 0.63], ['z', [0, 25, 32], [1, 33, 25], 0.261], ['z', [0, 25, 32], [1, 33, 25], 0.76], ['z', [0, 59, 32], [1, 67, 25], 0.391], ['z', [0, 59, 32], [1, 67, 25], 0.89]], b: [[[0, 46, 27]]] },
};
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const at = (kf, u) => { if (kf.length === 1) return [kf[0][1], kf[0][2]]; let i = 0; while (i < kf.length - 2 && u > kf[i + 1][0]) i++; const a = kf[i], b = kf[i + 1]; let k = Math.max(0, Math.min(1, (u - a[0]) / ((b[0] - a[0]) || 1))); k = k * k * (3 - 2 * k); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
const bed = svg => { const g = el('g', {}, svg); el('rect', { x: -10.5, y: -5.5, width: 21, height: 11, rx: 1.6, fill: '#8A5A33', stroke: '#13201A', 'stroke-width': .6 }, g);
  el('rect', { x: -9.3, y: -4.3, width: 18.6, height: 8.6, rx: 1, fill: '#F8F4EA' }, g); el('rect', { x: -8.5, y: -3, width: 5, height: 6, rx: 1.2, fill: '#BFD0E6', stroke: '#13201A', 'stroke-width': .35 }, g);
  el('circle', { cx: -5.6, r: 2, fill: '#F8F4EA', stroke: '#13201A', 'stroke-width': .6 }, g); el('rect', { x: -3, y: -4.3, width: 12.3, height: 8.6, rx: 1, fill: '#2F6FB5' }, g); el('rect', { x: -3, y: -4.3, width: 2, height: 8.6, fill: '#7FB2E8' }, g); return g; };
const zed = svg => { const t = el('text', { 'font-size': 9, 'font-weight': 800, 'font-family': 'inherit', fill: '#F8F4EA', stroke: '#13201A', 'stroke-width': .25, 'text-anchor': 'middle' }, svg); t.textContent = 'z'; return t; };
function scene(host, key, big) {
  const s = SC[key]; if (!s || !host) return null;
  const top = s.top, sv = el('svg', { viewBox: top ? '0 0 46 24.7' : s.bg === 'half' ? '16 0 84 46' : '8 0 84 46', preserveAspectRatio: top ? 'xMidYMin meet' : s.bg === 'half' ? 'xMaxYMid meet' : 'xMidYMid meet', 'aria-hidden': 'true' }), svg = el('g', top ? { transform: 'matrix(0 -1 1 0 0 100)' } : {}, sv);
  el('rect', { x: -60, y: -20, width: 220, height: 86, fill: '#1F8A4C' }, svg);
  for (let i = -3; i < 8; i++) el('rect', { x: i * 20 + 10, y: -20, width: 10, height: 86, fill: '#1B7F45' }, svg);
  const ln = { fill: 'none', stroke: 'rgba(255,255,255,.55)', 'stroke-width': top ? .4 : .6 };
  if (s.bg === 'half') { el('rect', Object.assign({ x: 80, y: 8, width: 18, height: 30 }, ln), svg); el('rect', Object.assign({ x: 92, y: 16, width: 6, height: 14 }, ln), svg); el('path', Object.assign({ d: 'M80 17 A8 8 0 0 0 80 29' }, ln), svg); el('line', Object.assign({ x1: 98, y1: 0, x2: 98, y2: 46 }, ln), svg); el('rect', { x: 98, y: 18.5, width: 2, height: 9, fill: 'rgba(255,255,255,.85)' }, svg); el('circle', { cx: 86, cy: 23, r: .6, fill: '#fff' }, svg); }
  if (s.bg === 'mid') { el('line', Object.assign({ x1: 50, y1: 0, x2: 50, y2: 46 }, ln), svg); el('circle', Object.assign({ cx: 50, cy: 23, r: 9 }, ln), svg); }
  const dash = s.line !== undefined ? el('line', { y1: 0, y2: 46, stroke: '#F8F4EA', 'stroke-width': .7, 'stroke-dasharray': '2 2', opacity: .8 }, svg) : null;
  const R = (big ? 2.5 : 3.3) * (top ? .62 : 1), col = { u: ['#F8F4EA', '#13201A'], r: ['#F08A5D', '#5a2a12'], g: ['#F2C230', '#5a4505'] };
  const nodes = s.a.map(a => a[0] === 'c' ? el('path', { d: 'M-1.6 1.5 L0 -1.8 L1.6 1.5 Z', fill: '#F2C230', stroke: '#13201A', 'stroke-width': .4 }, svg) : a[0] === 'b' ? bed(svg) : a[0] === 'z' ? zed(svg) : el('circle', { r: R, fill: col[a[0]][0], stroke: col[a[0]][1], 'stroke-width': top ? .5 : .8 }, svg));
  const balls = s.b.map(() => el('circle', { r: (big ? 1.3 : 1.8) * (top ? .62 : 1), fill: '#fff', stroke: '#13201A', 'stroke-width': .5 }, svg));
  host.textContent = ''; host.appendChild(sv);
  const paint = u => { s.a.forEach((a, i) => { const ph = typeof a[a.length - 1] === 'number' ? a[a.length - 1] : 0, kf = a.slice(1, ph || typeof a[a.length - 1] === 'number' ? -1 : undefined), p = at(kf, ((u - ph) % 1 + 1) % 1);
      if (a[0] === 'z') { const w = ((u - ph) % 1 + 1) % 1; nodes[i].setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ') scale(' + (.5 + .6 * w) + ')'); nodes[i].setAttribute('opacity', Math.min(1, w * 5, (1 - w) * 2.5)); }
      else if (a[0] === 'c' || a[0] === 'b') nodes[i].setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')'); else { nodes[i].setAttribute('cx', p[0]); nodes[i].setAttribute('cy', p[1]); } if (dash && i === s.line) { dash.setAttribute('x1', p[0] + R + 1); dash.setAttribute('x2', p[0] + R + 1); } });
    s.b.forEach((kf, i) => { const p = at(kf, u); balls[i].setAttribute('cx', p[0]); balls[i].setAttribute('cy', p[1]); }); };
  paint(s.at); return { paint, dur: s.dur };
}
U.TRC = { scene, has: k => !!SC[k] };
})();
