// Personagens dos minigames (arte do designer, em SVG por camadas): <jogador-lado> e <jogador-2d>.
// No fim, CRAQUE_CHARS monta cada personagem dentro do SVG da cena, com o visual da criação e as cores dos clubes.
// <jogador-lado> — jogador 2D de perfil (virado para a direita) para os minigames.
// Atributos: anim (corrida|corte|finalizacao|queda|marcacao|carrinho), skin, hair, cabelo (curto|raspado|cacheado|black|trancas|careca),
// barba (sem|rala|cheia), shirt, shorts, socks, boots, trim, espelhar, t (quadro fixo 0..1), speed, offset, paused.
// Métodos: el.pose(t, anim); el.exportSheet(anim, {scale, cols, name}). Quadro 240×250, pés em (120, 242).
(() => {
if (customElements.get('jogador-lado')) return;
const OUT = '#2b201d';
const SKINS = { clara: '#f1c3a0', media: '#d39a6f', morena: '#a8704a', negra: '#6e4530', escura: '#6e4530' };
const HAIRS = { preto: '#1d1714', castanho: '#4a2f22', loiro: '#d9a84e', ruivo: '#a4482a' };
const mix = (hex, to, a) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const c = p(hex), d = p(to);
  return '#' + c.map((v, i) => Math.round(v + (d[i] - v) * a).toString(16).padStart(2, '0')).join('');
};
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x * x * (3 - 2 * x);
const TH = 42, SH = 38, SOLE = 8;
const DEF = { x: 0, lift: 0, rot: 0, lean: 6, h: 0, lN: 5, kN: 6, fN: 0, lF: -5, kF: 6, fF: 0, aN: -10, eN: 18, aF: 10, eF: 18 };
const seq = fr => { let prev = {}; return fr.map(f => (prev = { ...prev, ...f })); };
const runLeg = ph => [34 * Math.sin(ph), 12 + 80 * Math.pow(Math.max(0, Math.cos(ph - 5.5)), 1.4), 26 * Math.max(0, -Math.sin(ph))];
const run = (t, o) => {
  const p = 2 * Math.PI * t;
  [o.lN, o.kN, o.fN] = runLeg(p); [o.lF, o.kF, o.fF] = runLeg(p + Math.PI);
  o.aN = -36 * Math.sin(p); o.aF = 36 * Math.sin(p); o.eN = 88 + 8 * Math.sin(p); o.eF = 88 - 8 * Math.sin(p);
  o.lean = 15; o.h = -2; o.lift = 4 * Math.max(0, -Math.cos(2 * p));
};
const MARC = { lean: 26, h: -16, lN: 30, kN: 52, fN: -4, lF: -20, kF: 36, fF: 12, aN: 34, eN: 40, aF: -22, eF: 54 };

const ANIMS = {
  corrida: { dur: 620, n: 8, loop: true, frames: seq([{ at: 0 }, { at: 1 }]), extra: run },
  corte: { dur: 420, n: 3, frames: seq([
    { at: 0, lean: -4, h: -6, lN: 34, kN: 6, fN: -10, lF: -28, kF: 40, aN: 30, eN: 40, aF: -45, eF: 30 },
    { at: 0.5, lean: 20, h: -4, lN: 8, kN: 50, fN: 0, lF: -6, kF: 35, aN: -30, eN: 60, aF: 55, eF: 40 },
    { at: 1, lean: 16, h: -8, lN: -30, kN: 20, fN: 20, lF: 30, kF: 40, aN: 35, eN: 85, aF: -35, eF: 85 }
  ]) },
  finalizacao: { dur: 480, n: 3, frames: seq([
    { at: 0, lean: 4, h: 6, lF: 12, kF: 22, lN: -38, kN: 95, fN: 20, aN: -30, eN: 30, aF: 55, eF: 20 },
    { at: 0.5, lean: -6, h: 8, lN: 22, kN: 20, fN: 15, aN: -55, aF: 40 },
    { at: 1, lean: -16, h: 0, lN: 80, kN: 6, fN: 10, lF: 4, kF: 16, aN: -70, eN: 20, aF: 70, eF: 30, lift: 3 }
  ]) },
  queda: { dur: 800, n: 4, frames: seq([
    { at: 0, rot: 10, lean: 22, h: -15, lN: -35, kN: 40, lF: -55, kF: 25, aN: 110, eN: 20, aF: 80, eF: 20 },
    { at: 1 / 3, rot: 40, lean: 20, h: -25, lN: -30, kN: 30, lF: -45, kF: 20, aN: 140, aF: 120 },
    { at: 2 / 3, rot: 72, lean: 10, h: -35, lN: -10, kN: 30, lF: -15, kF: 20, aN: 160, eN: 30, aF: 150, eF: 30 },
    { at: 1, rot: 84, lean: 4, h: -40, lN: -4, kN: 45, lF: -10, kF: 15, aN: 150, eN: 60, aF: 165, eF: 40 }
  ]) },
  marcacao: { dur: 1100, n: 4, loop: true, frames: seq([{ at: 0, ...MARC }, { at: 1 }]), extra: (t, o) => {
    const s = Math.sin(2 * Math.PI * t);
    o.kN += 7 * s; o.kF += 7 * s; o.lN += 2 * s; o.lF -= 2 * s; o.lean += 2 * s; o.aN += 5 * s; o.aF -= 5 * s;
  } },
  carrinho: { dur: 760, n: 6, frames: seq([
    { at: 0, ...MARC },
    { at: 0.2, rot: 0, lean: 28, h: -12, lN: 40, kN: 60, fN: -6, lF: -34, kF: 24, fF: 20, aN: -40, eN: 40, aF: 50, eF: 60 },
    { at: 0.4, rot: -18, lean: 8, h: -6, lN: 62, kN: 18, fN: -8, lF: -5, kF: 95, fF: 0, aN: -60, eN: 20, aF: 60, eF: 30 },
    { at: 0.6, rot: -34, lean: 12, h: 4, lN: 58, kN: 2, fN: -10, lF: -12, kF: 115, aN: -95, eN: 10, aF: 70, eF: 40 },
    { at: 0.8, rot: -36, lean: 14, h: 6, lN: 60, kN: 0, lF: -12, kF: 118, aN: -98, eN: 8, aF: 76, eF: 46 },
    { at: 1, rot: -30, lean: 18, h: 2, lN: 52, kN: 6, lF: -8, kF: 112, aN: -90, eN: 12, aF: 60, eF: 50 }
  ]) }
};

const live = new Set();
let uid = 0;
// O laço só roda enquanto houver personagem na tela: sem nenhum, para (e volta quando um entra)
let running = false;
function wake() { if (!running) { running = true; requestAnimationFrame(tick); } }
function tick(now) {
  if (!live.size) { running = false; return; }
  requestAnimationFrame(tick);
  for (const el of live) if (!el._freeze && !el.hasAttribute('paused') && !el.hasAttribute('t')) el._frame(now);
}

class JogadorLado extends HTMLElement {
  static get observedAttributes() { return ['anim', 'skin', 'hair', 'cabelo', 'barba', 'shirt', 'shorts', 'socks', 'boots', 'trim', 'espelhar', 't']; }
  connectedCallback() {
    if (!this.style.display) this.style.display = 'block';
    this.style.width = '100%'; this.style.height = '100%';
    this._build(); live.add(this); wake();
  }
  disconnectedCallback() { live.delete(this); }
  attributeChangedCallback(n) {
    if (!this.isConnected) return;
    if (n === 'anim') this._t0 = performance.now();
    if (n === 't') return this.pose(parseFloat(this.getAttribute('t')) || 0);
    this._build();
  }
  get anim() { const a = this.getAttribute('anim'); return ANIMS[a] ? a : 'corrida'; }
  _frame(now) {
    if (this._t0 == null) this._t0 = now;
    const A = ANIMS[this.anim], sp = parseFloat(this.getAttribute('speed')) || 1;
    const t = ((now - this._t0) * sp) / A.dur + (parseFloat(this.getAttribute('offset')) || 0);
    this.pose(A.loop ? t % 1 : Math.min(1, t));
  }
  _build() {
    const a = n => this.getAttribute(n);
    const k = { shirt: a('shirt') || '#9a9a9a', shorts: a('shorts') || '#6f6f6f', boots: a('boots') || '#1f1f22', trim: a('trim') || '#f4f1e8' };
    k.socks = a('socks') || k.shirt;
    const col = { ...k, skin: SKINS[a('skin')] || a('skin') || SKINS.media, hair: HAIRS[a('hair')] || a('hair') || HAIRS.preto };
    const style = a('cabelo') || 'curto', barba = a('barba') || 'sem', hair = col.hair, skin = col.skin;
    const u = 'l' + (++uid);
    const G = n => `url(#${u}${n})`;
    const grad = (n, c) => `<linearGradient id="${u}${n}" x1="0" y1="0" x2="1" y2="0.25"><stop offset="0" stop-color="${mix(c, '#ffffff', 0.2)}"/><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', 0.24)}"/></linearGradient>`;
    const defs = ['skin', 'hair', 'shirt', 'shorts', 'socks', 'boots'].map(n => grad(n, col[n]) + grad(n + 'F', mix(col[n], '#000000', 0.22))).join('');
    const S = `stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"`;
    const stripe = k.shorts === k.trim ? k.shirt : k.trim;

    const leg = s => { const F = s === 'F' ? 'F' : ''; return `<g data-j="leg${s}">
      <path d="M-7.5,-2 Q-9,20 -6,${TH} A6,6 0 0 0 6,${TH} Q9,20 7.5,-2Z" fill="${G('skin' + F)}" ${S}/>
      <path d="M-9.5,3 L-10,19 Q0,23 10,19 L9.5,3Z" fill="${G('shorts' + F)}"/>
      <path d="M-9.5,3 L-10,19 Q0,23 10,19 L9.5,3" fill="none" ${S}/>
      <path d="M-9.8,17 Q0,20.6 9.8,17" stroke="${stripe}" stroke-width="2" fill="none"/>
      <g data-j="knee${s}">
        <path d="M-6,-1 Q-8.6,13 -5,${SH + 1} L4.6,${SH + 1} Q6,14 5.6,-1Z" fill="${G('skin' + F)}" ${S}/>
        <path d="M-6.6,9 Q-8.2,18 -5,${SH + 1} L4.6,${SH + 1} Q5.8,20 5.4,9Z" fill="${G('socks' + F)}" ${S}/>
        <path d="M-6.9,12.5 L5.5,12.5" stroke="${k.trim}" stroke-width="2.4"/>
        <g data-j="ankle${s}">
          <path d="M-5.6,-3 Q-7.4,4 -5.4,${SOLE} L13.5,${SOLE} Q16.5,${SOLE} 15.2,4.2 Q13,0.5 5,-0.8 L4.8,-3Z" fill="${G('boots' + F)}" ${S}/>
          <path d="M2,3 L9,3.4" stroke="${k.boots === k.trim ? k.shirt : k.trim}" stroke-width="1.6" stroke-linecap="round"/>
        </g>
      </g>
    </g>`; };
    const arm = s => { const F = s === 'F' ? 'F' : ''; return `<g data-j="arm${s}">
      <rect x="-4.6" y="-3" width="9.2" height="31" rx="4.6" fill="${G('skin' + F)}" ${S}/>
      <path d="M-7,-6 Q-7.6,8 -6.6,13 L6.6,13 Q7.6,8 7,-6 Q0,-10 -7,-6Z" fill="${G('shirt' + F)}" ${S}/>
      <path d="M-6.2,10.8 L6.2,10.8" stroke="${k.trim}" stroke-width="2"/>
      <g data-j="elbow${s}">
        <rect x="-4" y="-2" width="8" height="28" rx="4" fill="${G('skin' + F)}" ${S}/>
        <g transform="translate(0,25) scale(0.9)"><path d="M-4.2,-1 Q-5,5 -2.5,7.5 Q0,8.5 2.5,7.5 Q5,5 4.2,-1Z" fill="${G('skin' + F)}" ${S}/></g>
      </g>
    </g>`; };

    const dk = mix(hair, '#000000', 0.4);
    const rasp = `<path d="M-11.6,-9 Q-14.5,-27 1,-27.5 Q11.5,-27 12.4,-20 Q8,-23 3,-22.5 Q-1.5,-21.5 -5,-15 Q-7,-11 -11.6,-9Z" fill="${hair}" opacity="0.8"/>`;
    let hairSvg = '';
    if (style === 'careca') hairSvg = `<ellipse cx="-1" cy="-23.5" rx="5" ry="2.4" fill="#ffffff" opacity="0.28"/>`;
    else if (style === 'raspado') hairSvg = rasp;
    else if (style === 'black') hairSvg = `<path d="M-13,-6 Q-20,-14 -18,-24 Q-15,-36.5 -1,-36.5 Q13,-36.5 15,-24 Q15.5,-20 12.5,-18 Q8,-22 3,-21.5 Q-2,-20 -4,-14 Q-6,-9 -9,-6 Q-11,-4 -13,-6Z" fill="${G('hair')}" ${S}/>`;
    else if (style === 'trancas') hairSvg = rasp + [0, 1, 2].map(i => `<path d="M${10 - 3 * i},${-21.5 + 1.2 * i} Q${1 - 2 * i},${-31 + 2.6 * i} ${-11 + 1.5 * i},${-10.5 + 1.8 * i}" stroke="${dk}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`).join('')
      + `<path d="M-10,-9 L-12,-1.5 M-7.6,-8 L-9,-0.5" stroke="${G('hair')}" stroke-width="2.6" stroke-linecap="round"/>`;
    else if (style === 'cacheado') {
      const c = [];
      for (let i = 0; i < 8; i++) { const ang = Math.PI * (160 + 160 * i / 7) / 180; c.push(`<circle cx="${(-1 + 12.4 * Math.cos(ang)).toFixed(1)}" cy="${(-15 + 12.6 * Math.sin(ang)).toFixed(1)}" r="4.4" fill="${G('hair')}" ${S}/>`); }
      hairSvg = c.join('') + `<ellipse cx="-2" cy="-20" rx="10" ry="7.5" fill="${hair}"/>`;
    } else hairSvg = `<path d="M-12,-9 Q-15.5,-28 1,-28.5 Q12,-28 13,-19 Q9,-22.5 4,-22 Q-1,-21 -3,-17 Q-5.5,-15.5 -6.5,-12 L-8,-9 Q-10,-7 -12,-9Z" fill="${G('hair')}" ${S}/>`;
    const beard = barba === 'cheia'
      ? `<path d="M-4.5,-12 Q-5,-2 1,0.8 Q7,2.5 10.5,-1 Q13,-4 12.2,-10 Q10,-7.5 7.5,-8 Q4,-7 1.5,-9.5 Q-1,-12 -4.5,-12Z" fill="${G('hair')}" ${S}/>`
      : barba === 'rala' ? `<path d="M-4,-11 Q-3,-3 1,-1 Q6,0.5 9,-2 Q12,-4 12,-9 Q10,-6 7,-7.5 Q3,-6 1,-9 Q-1,-11 -4,-11Z" fill="${hair}" opacity="0.4"/>` : '';
    const head = `
      <path d="M-11,-7 Q-14,-27 0,-27 Q12,-27 12.5,-16 L14,-11.5 L12,-10 Q12.5,-4 8.5,-1.5 Q3,1 -3,-0.5 Q-8.5,-2 -11,-7Z" fill="${G('skin')}" ${S}/>
      <ellipse cx="-2.5" cy="-12" rx="2.6" ry="3.8" fill="${G('skin')}" ${S}/>
      ${beard}
      <ellipse cx="7" cy="-15" rx="1.3" ry="1.5" fill="${OUT}"/>
      <path d="M4.5,-18.6 L10,-18.2" stroke="${mix(hair, '#000000', 0.2)}" stroke-width="1.9" stroke-linecap="round"/>
      <path d="M8,-5.4 L11,-5.9" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>
      ${hairSvg}`;

    this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -242 240 250" style="width:100%;height:100%;display:block;overflow:visible" preserveAspectRatio="xMidYMax meet">
      <defs>${defs}</defs>
      <g${this.hasAttribute('espelhar') ? ' transform="scale(-1,1)"' : ''}>
      <ellipse data-j="shadow" cx="0" cy="0" rx="28" ry="5.5" fill="#000" opacity="0.22"/>
      <g data-j="root">
        ${leg('F')}
        <g data-j="tA">${arm('F')}</g>
        <path d="M-12,-6 L12,-6 L13,12 Q0,16 -12.5,12Z" fill="${G('shorts')}" ${S}/>
        <g data-j="tB">
          <path d="M-4,-63 L-3.6,-52 L6,-52 L6.5,-63Z" fill="${G('skin')}" ${S}/>
          <path d="M-10.5,4 Q-12.5,-20 -11.5,-38 Q-11.5,-52 -5,-56.5 L6,-56.5 Q12.5,-52 12.5,-40 Q13.5,-22 10.5,4 Q0,7 -10.5,4Z" fill="${G('shirt')}" ${S}/>
          <path d="M-4.6,-56 Q1,-53 6.4,-56.4" stroke="${k.trim}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <g data-j="head">${head}</g>
        </g>
        ${leg('N')}
        <g data-j="tC">${arm('N')}</g>
      </g>
      </g>
    </svg>`;
    this.svg = this.firstElementChild;
    this.J = {};
    this.querySelectorAll('[data-j]').forEach(e => this.J[e.dataset.j] = e);
    this.pose(this.hasAttribute('t') ? parseFloat(a('t')) || 0 : 0);
  }
  pose(t, an) {
    if (!this.J) return;
    const A = ANIMS[an || this.anim], fr = A.frames;
    let i = 0; while (i < fr.length - 2 && t > fr[i + 1].at) i++;
    const a = fr[i], b = fr[i + 1], u = ease(clamp((t - a.at) / ((b.at - a.at) || 1)));
    const o = {};
    for (const key in DEF) { const va = a[key] ?? DEF[key], vb = b[key] ?? DEF[key]; o[key] = va + (vb - va) * u; }
    if (A.extra) A.extra(t, o);
    const J = this.J, set = (el, v) => el.setAttribute('transform', v), pts = [];
    const R = new DOMMatrix().rotate(o.rot), T = R.rotate(o.lean);
    const pt = (m, x, y, r) => { const p = m.transformPoint(new DOMPoint(x, y)); pts.push([p.x, p.y + r]); };
    for (const s of ['N', 'F']) {
      const l = o['l' + s], k = o['k' + s], f = o['f' + s], ea = o['a' + s], ee = o['e' + s];
      set(J['leg' + s], `rotate(${-l})`);
      set(J['knee' + s], `translate(0,${TH}) rotate(${k})`);
      set(J['ankle' + s], `translate(0,${SH}) rotate(${l - k + f})`);
      const sh = R.rotate(-l).translate(0, TH).rotate(k), an2 = sh.translate(0, SH).rotate(l - k + f);
      pt(sh, 0, 0, 6); pt(an2, -5, SOLE, 0); pt(an2, 15, SOLE - 1, 0);
      set(J['arm' + s], `translate(-1,-50) rotate(${-ea})`);
      set(J['elbow' + s], `translate(0,27) rotate(${-ee})`);
      pt(T.translate(-1, -50).rotate(-ea).translate(0, 27).rotate(-ee), 0, 29, 4);
    }
    for (const g of ['tA', 'tB', 'tC']) set(J[g], `rotate(${o.lean})`);
    set(J.head, `translate(2,-62) rotate(${o.h})`);
    pt(R, -8, 6, 8); pt(T, -6, -50, 9); pt(T.translate(2, -62).rotate(o.h), -1, -14, 13);
    const low = Math.max(...pts.map(p => p[1]));
    set(J.root, `translate(${o.x},${-low - o.lift}) rotate(${o.rot})`);
    const xs = pts.filter(p => p[1] > low - 26).map(p => p[0] + o.x);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), f = 1 / (1 + o.lift / 40);
    J.shadow.setAttribute('cx', (x0 + x1) / 2);
    J.shadow.setAttribute('rx', Math.max(24, (x1 - x0) / 2 + 12) * f);
    J.shadow.setAttribute('opacity', 0.22 * f);
  }
  async exportSheet(an, opts = {}) {
    an = ANIMS[an] ? an : this.anim;
    const A = ANIMS[an], n = A.n, sc = opts.scale || 1, cw = 240 * sc, ch = 250 * sc, cols = opts.cols || n, rows = Math.ceil(n / cols);
    const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * rows;
    const ctx = cv.getContext('2d');
    this._freeze = true;
    try {
      for (let i = 0; i < n; i++) {
        this.pose(A.loop ? i / n : i / (n - 1), an);
        const clone = this.svg.cloneNode(true);
        clone.setAttribute('width', cw); clone.setAttribute('height', ch); clone.removeAttribute('style');
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)); });
        ctx.drawImage(img, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
      }
    } finally { this._freeze = false; if (this.hasAttribute('t')) this.pose(parseFloat(this.getAttribute('t')) || 0); }
    const name = `${opts.name || 'jogador'}-${an}_${n}q_${cw}x${ch}_pes-${120 * sc}x${242 * sc}_${A.dur}ms.png`;
    cv.toBlob(b => { const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = name; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 2000); });
  }
}
JogadorLado.ANIMS = ANIMS;
customElements.define('jogador-lado', JogadorLado);
})();

// <jogador-2d> — personagem 2D em SVG com animações leves (sem 3D).
// Atributos: kit (goleiro|atacante|barreira), anim, view (frente|costas), skin, hair, cabelo (curto|raspado|cacheado|black|trancas|careca), barba (sem|rala|cheia),
// num, nome, shirt, shorts, socks, boots, gloves, offset (0..1), speed, largura (meia-largura do quadro), paused.
// Métodos: el.pose(t, anim) aplica o quadro t (0..1); el.exportSheet(frames | [{anim,t}], {scale, cols, footY, name}) baixa a sprite sheet em PNG.
(() => {
if (customElements.get('jogador-2d')) return;
const OUT = '#2b201d';
const KITS = {
  goleiro:  { shirt: '#f2c230', trim: '#1f2433', shorts: '#1f2433', socks: '#f2c230', boots: '#1f1f22', gloves: '#b9e34d', long: true,  num: '1', numColor: '#1f2433' },
  atacante: { shirt: '#12824a', trim: '#f4f1e8', shorts: '#f4f1e8', socks: '#12824a', boots: '#f4f1e8', gloves: null, long: false, num: '9', numColor: '#ffffff' },
  barreira: { shirt: '#c8323a', trim: '#ffffff', shorts: '#ffffff', socks: '#c8323a', boots: '#1f1f22', gloves: null, long: false, num: '4', numColor: '#ffffff' }
};
const SKINS = { clara: '#f1c3a0', media: '#d39a6f', morena: '#a8704a', escura: '#6e4530', negra: '#6e4530' };
const HAIRS = { preto: '#1d1714', castanho: '#4a2f22', loiro: '#d9a84e', ruivo: '#a4482a' };
const mix = (hex, to, a) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const c = p(hex), d = p(to);
  return '#' + c.map((v, i) => Math.round(v + (d[i] - v) * a).toString(16).padStart(2, '0')).join('');
};
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x * x * (3 - 2 * x);
const HIP = 91;
const TH = 42, SH = 38, SOLE = 8;
const DEF = { x: 0, lift: 0, rot: 0, free: 0, t: 0, tsy: 1, h: 0, hy: 0, aL: 8, eL: 0, aR: -8, eR: 0,
  lL: 3, kL: 0, sTL: 1, sSL: 1, lR: -3, kR: 0, sTR: 1, sSR: 1 };
const seq = fr => { let prev = {}; return fr.map(f => (prev = { ...prev, ...f })); };
const breathe = (t, o) => { const s = Math.sin(2 * Math.PI * t); o.tsy += 0.014 * s; o.hy -= 0.7 * s; o.aL += 2 * s; o.aR -= 2 * s; };

const PRONTO = { lL: 16, kL: -24, sTL: 0.84, lR: -16, kR: 24, sTR: 0.84, aL: 52, eL: -42, aR: -52, eR: 42, tsy: 0.96, hy: 2 };
const BAR = { aL: -14, eL: -14, aR: 14, eR: 14, lL: 4, lR: -4 };
const defesa = d => ({ dur: 1600, view: 'frente', frames: seq([
  { at: 0, ...PRONTO },
  { at: 0.16, lL: 22, kL: -32, sTL: 0.76, lR: -22, kR: 32, sTR: 0.76, x: -8 * d, aL: 40, aR: -40, tsy: 0.93, hy: 3 },
  { at: 0.34, free: 1, x: 30 * d, lift: 38, rot: 48 * d, aL: 165, eL: -8, aR: -165, eR: 8, lL: 10, kL: -8, sTL: 1, lR: -10, kR: 8, sTR: 1, tsy: 1, hy: 0 },
  { at: 0.52, x: 62 * d, lift: 26, rot: 84 * d, aL: 174, eL: -4, aR: -176, eR: 4 },
  { at: 0.68, x: 70 * d, lift: -74, rot: 90 * d, lL: 6, kL: -14, lR: -6, kR: 14 },
  { at: 1 }
]) });

const ANIMS = {
  parado: { dur: 2400, view: 'frente', frames: seq([{ at: 0 }, { at: 1 }]), extra: breathe },
  pronto: { dur: 1300, view: 'frente', frames: seq([{ at: 0, ...PRONTO }, { at: 1 }]), extra: (t, o) => {
    const s = Math.sin(2 * Math.PI * t);
    o.x += 9 * s; o.lift += 2.5 * Math.abs(Math.cos(2 * Math.PI * t)); o.h -= 3 * s; o.t += 2 * s; o.lL += 3 * s; o.lR += 3 * s;
  } },
  'defesa-esq': defesa(-1),
  'defesa-dir': defesa(1),
  barreira: { dur: 2600, view: 'frente', frames: seq([{ at: 0, ...BAR }, { at: 1 }]), extra: (t, o) => { breathe(t, o); o.aL -= 2 * Math.sin(2 * Math.PI * t); o.aR += 2 * Math.sin(2 * Math.PI * t); } },
  pulo: { dur: 1800, view: 'frente', frames: seq([{ at: 0, ...BAR }, { at: 1 }]), extra: (t, o) => {
    let c = 0, h = 0;
    if (t < 0.4) c = ease(t / 0.4);
    else if (t < 0.52) c = 1 - ease((t - 0.4) / 0.12);
    if (t >= 0.5 && t < 0.8) { const u = (t - 0.5) / 0.3; h = 30 * 4 * u * (1 - u); }
    if (t >= 0.8) c = 0.55 * Math.sin(Math.PI * (t - 0.8) / 0.2);
    o.lL = 4 + 7 * c; o.kL = -16 * c; o.sTL = 1 - 0.2 * c;
    o.lR = -4 - 7 * c; o.kR = 16 * c; o.sTR = 1 - 0.2 * c;
    o.tsy = 1 - 0.05 * c; o.hy = 3 * c; o.lift = h;
    if (h > 0) o.sSL = o.sSR = 1 - 0.14 * Math.min(1, h / 8);
  } },
  chute: { dur: 1500, view: 'costas', frames: seq([
    { at: 0 },
    { at: 0.12, x: -18, lift: 3, sSL: 0.6 },
    { at: 0.24, x: -10, lift: 0, sSL: 1, sSR: 0.6 },
    { at: 0.36, x: -2, sSR: -0.35, sTR: 0.95, lR: -10, lL: 4, aL: 60, aR: -35, t: -5 },
    { at: 0.46, x: 0, sSR: 1, sTR: 0.5, lR: 14, aL: 85, eL: -10, aR: -50, t: 6, h: 3 },
    { at: 0.56, sTR: 0.36, lR: 20, lift: 4 },
    { at: 0.82, x: 0, lift: 0, sTR: 1, lR: -3, lL: 3, aL: 8, eL: 0, aR: -8, t: 0, h: 0 },
    { at: 1 }
  ]) },
  comemoracao: { dur: 1100, view: 'costas', frames: seq([
    { at: 0, aL: 150, eL: -20, aR: -150, eR: 20, lL: 6, kL: -10, sTL: 0.9, lR: -6, kR: 10, sTR: 0.9 },
    { at: 0.35, lift: 28, aL: 170, eL: -5, aR: -170, eR: 5, sSL: 0.5, sSR: 0.5, lL: 4, kL: 0, sTL: 1, lR: -4, kR: 0, sTR: 1 },
    { at: 0.65, lift: 0, sSL: 1, sSR: 1, aL: 150, eL: -20, aR: -150, eR: 20 },
    { at: 1, lL: 6, kL: -10, sTL: 0.9, lR: -6, kR: 10, sTR: 0.9 }
  ]) }
};

const live = new Set();
let uid = 0;
// O laço só roda enquanto houver personagem na tela: sem nenhum, para (e volta quando um entra)
let running = false;
function wake() { if (!running) { running = true; requestAnimationFrame(tick); } }
function tick(now) {
  if (!live.size) { running = false; return; }
  requestAnimationFrame(tick);
  for (const el of live) if (!el._freeze && !el.hasAttribute('paused')) el._frame(now);
}

class Jogador2D extends HTMLElement {
  static get observedAttributes() { return ['kit', 'anim', 'view', 'skin', 'hair', 'cabelo', 'barba', 'num', 'nome', 'shirt', 'shorts', 'socks', 'boots', 'gloves', 'largura']; }
  connectedCallback() {
    if (!this.style.display) this.style.display = 'block';
    this.style.width = '100%'; this.style.height = '100%';
    this._build(); live.add(this); wake();
  }
  disconnectedCallback() { live.delete(this); }
  attributeChangedCallback(n) {
    if (!this.isConnected) return;
    if (n === 'anim') this._t0 = performance.now();
    this._build();
  }
  get anim() { const a = this.getAttribute('anim'); return ANIMS[a] ? a : 'parado'; }
  _frame(now) {
    if (this._t0 == null) this._t0 = now;
    const A = ANIMS[this.anim], sp = parseFloat(this.getAttribute('speed')) || 1;
    const off = parseFloat(this.getAttribute('offset')) || 0;
    this.pose((((now - this._t0) * sp) / A.dur + off) % 1);
  }
  _build() {
    const a = n => this.getAttribute(n);
    const k = { ...(KITS[a('kit')] || KITS.atacante) };
    for (const n of ['shirt', 'shorts', 'socks', 'boots', 'gloves', 'num']) if (a(n)) k[n] = a(n);
    if (a('shirt')) { const v = [1, 3, 5].map(i => parseInt(k.shirt.slice(i, i + 2), 16)); k.numColor = v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11 > 165 ? '#1D1D1F' : '#FFFFFF'; }
    const skin = SKINS[a('skin')] || a('skin') || SKINS.media;
    const hair = HAIRS[a('hair')] || a('hair') || HAIRS.preto;
    const style = a('cabelo') || 'curto';
    const view = a('view') || ANIMS[this.anim].view;
    const W = this.W = parseFloat(a('largura')) || 110;
    const u = 'j' + (++uid);
    const G = n => `url(#${u}${n})`;
    const grad = (n, c) => `<linearGradient id="${u}${n}" x1="0" y1="0" x2="1" y2="0.25"><stop offset="0" stop-color="${mix(c, '#ffffff', 0.2)}"/><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', 0.24)}"/></linearGradient>`;
    const S = `stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"`;
    const font = `font-family="'Arial Black','Arial',sans-serif" font-weight="900" text-anchor="middle"`;

    const leg = L => `<g data-j="leg${L}">
      <path d="M-7.5,-2 Q-8,18 -6.2,${TH - 1} A6.2,6.2 0 0 0 6.2,${TH - 1} Q8,18 7.5,-2Z" fill="${G('skin')}" ${S}/>
      <g data-j="knee${L}">
        <path d="M-6.2,4 Q-7.4,14 -5,${SH + 1} L5,${SH + 1} Q7.4,14 6.2,4Z" fill="${G('socks')}" ${S}/>
        <rect x="-5.6" y="8" width="11.2" height="3" fill="${k.trim}"/>
        <g data-j="ankle${L}">
          <path d="M-5.8,-2 C-7.4,2 -8.4,7 -4.6,8 L4.6,8 C8.4,7 7.4,2 5.8,-2Z" fill="${G('boots')}" ${S}/>
          <path d="M-3.8,3.5 L3.8,3.5" stroke="${k.boots === k.trim ? k.shirt : k.trim}" stroke-width="1.8" stroke-linecap="round"/>
        </g>
      </g>
    </g>`;

    const hand = k.gloves
      ? `<rect x="-6" y="-5" width="12" height="5" rx="2" fill="${mix(k.gloves, '#000000', 0.35)}" ${S}/>
         <path d="M-8,-1 Q-9.8,8 -5,12 Q0,14 5,12 Q9.8,8 8,-1 Q0,-4 -8,-1Z" fill="${G('gloves')}" ${S}/>
         <path d="M-3,3 L-3,9 M1,3 L1,10" stroke="${mix(k.gloves, '#000000', 0.3)}" stroke-width="1.3" stroke-linecap="round"/>`
      : `<path d="M-4.2,-1 Q-5,5 -2.5,7.5 Q0,8.5 2.5,7.5 Q5,5 4.2,-1Z" fill="${G('skin')}" ${S}/>`;
    const arm = (L, s) => `<g data-j="arm${L}">
      <rect x="-4.8" y="-3" width="9.6" height="33" rx="4.8" fill="${k.long ? G('shirt') : G('skin')}" ${S}/>
      ${k.long ? '' : `<path d="M-7.2,-6 Q-8,9 -7,14 L7,14 Q8,9 7.2,-6 Q0,-10 -7.2,-6Z" fill="${G('shirt')}" ${S}/>
      <path d="M-6.2,11.8 L6.2,11.8" stroke="${k.trim}" stroke-width="2"/>`}
      <g data-j="elbow${L}">
        <rect x="-4.1" y="-2" width="8.2" height="28" rx="4.1" fill="${k.long ? G('shirt') : G('skin')}" ${S}/>
        ${k.long ? `<path d="M-3.6,22 L3.6,22" stroke="${k.trim}" stroke-width="2"/>` : ''}
        <g data-j="hand${L}">${hand}</g>
      </g>
    </g>`;

    const dk = mix(hair, '#000000', 0.4);
    const rasp = view === 'costas'
      ? `<path d="M-12.8,-14 Q-14,-37 0,-36.5 Q14,-37 12.8,-14 Q12,-6 6,-3.2 Q0,-2 -6,-3.2 Q-12,-6 -12.8,-14Z" fill="${hair}" opacity="0.8"/>`
      : `<path d="M-12.4,-19.5 Q-12.8,-35.4 0,-35.4 Q12.8,-35.4 12.4,-19.5 Q8,-28.6 0,-29 Q-8,-28.6 -12.4,-19.5Z" fill="${hair}" opacity="0.8"/>`;
    let hairSvg = '';
    if (style === 'careca') {
      hairSvg = `<ellipse cx="-4" cy="-29.5" rx="4.6" ry="2.4" fill="#ffffff" opacity="0.28"/>`;
    } else if (style === 'black') {
      hairSvg = view === 'costas'
        ? `<path d="M-14,-10 Q-20,-18 -18,-30 Q-14,-44 0,-44 Q14,-44 18,-30 Q20,-18 14,-10 Q7,-6 0,-6 Q-7,-6 -14,-10Z" fill="${G('hair')}" ${S}/>`
        : `<path d="M-13,-16 Q-19.5,-24 -17,-33 Q-12.5,-44 0,-44 Q12.5,-44 17,-33 Q19.5,-24 13,-16 Q12,-26 6,-27.5 Q0,-26 -6,-27.5 Q-12,-26 -13,-16Z" fill="${G('hair')}" ${S}/>`;
    } else if (style === 'trancas') {
      hairSvg = rasp + [-8, -4, 0, 4, 8].map(x => view === 'costas'
        ? `<path d="M${x * 0.55},-35.5 Q${x * 1.15},-20 ${x * 0.85},-4.5" stroke="${dk}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`
        : `<path d="M${x * 0.95},-28.6 Q${x * 1.05},-32.5 ${x * 0.6},-35.2" stroke="${dk}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`).join('');
    } else if (style === 'cacheado') {
      const pts = [];
      const n = view === 'costas' ? 11 : 8, a0 = view === 'costas' ? 0.92 : 1.02, a1 = view === 'costas' ? 2.08 : 1.98;
      for (let i = 0; i < n; i++) {
        const ang = Math.PI * (a0 + (a1 - a0) * i / (n - 1));
        pts.push(`<circle cx="${(11.6 * Math.cos(ang)).toFixed(1)}" cy="${(-22 + 12.6 * Math.sin(ang)).toFixed(1)}" r="4.4" fill="${G('hair')}" ${S}/>`);
      }
      hairSvg = pts.join('') + `<ellipse cx="0" cy="${view === 'costas' ? -20 : -28}" rx="10.4" ry="${view === 'costas' ? 11 : 6.5}" fill="${hair}"/>`;
    } else if (view === 'costas') {
      hairSvg = `<path d="M-12.8,-14 Q-14,-37 0,-36.5 Q14,-37 12.8,-14 Q12,-6 6,-3.2 Q0,-2 -6,-3.2 Q-12,-6 -12.8,-14Z" fill="${G('hair')}" ${style === 'raspado' ? 'opacity="0.78"' : S}/>`;
    } else if (style === 'raspado') {
      hairSvg = rasp;
    } else {
      hairSvg = `<path d="M-12.8,-18 Q-14.5,-38 0,-37.2 Q14.5,-38 12.8,-18 Q11.5,-27 7,-28.8 Q2,-27.2 -2,-29 Q-7,-27.4 -10,-28.6 Q-12,-25 -12.8,-18Z" fill="${G('hair')}" ${S}/>`;
    }
    const barba = a('barba') || 'sem';
    const beard = view === 'costas' || barba === 'sem' ? '' : barba === 'rala'
      ? `<path d="M-12,-15 Q-11.5,-5.5 -6,-2 Q0,1 6,-2 Q11.5,-5.5 12,-15 Q10,-8 5,-6 Q0,-5 -5,-6 Q-10,-8 -12,-15Z" fill="${hair}" opacity="0.38"/>`
      : `<path d="M-12.4,-17 Q-12.4,-6 -6,-1 Q0,2.5 6,-1 Q12.4,-6 12.4,-17 Q11,-10 6,-8.6 Q0,-10.5 -6,-8.6 Q-11,-10 -12.4,-17Z" fill="${G('hair')}" ${S}/>`;
    const face = view === 'costas' ? '' : `
      <path d="M-9,-22.2 L-3.2,-21 M9,-22.2 L3.2,-21" stroke="${mix(hair, '#000000', 0.2)}" stroke-width="2.1" stroke-linecap="round" fill="none"/>
      <ellipse cx="-5.6" cy="-18" rx="1.5" ry="1.3" fill="${OUT}"/>
      <ellipse cx="5.6" cy="-18" rx="1.5" ry="1.3" fill="${OUT}"/>
      <path d="M0.4,-17 Q1.8,-12.6 -0.6,-12" stroke="${mix(skin, '#000000', 0.35)}" stroke-width="1.3" stroke-linecap="round" fill="none"/>
      <path d="M-3.2,-7.6 Q0,-6.9 3.2,-7.6" stroke="${OUT}" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M-11.4,-12 Q-10,-5 -5,-2.6" stroke="${mix(skin, '#000000', 0.25)}" stroke-width="1" fill="none" opacity="0.5"/>`;
    const chest = view === 'costas'
      ? `${a('nome') ? `<text x="0" y="-42" font-size="6.4" letter-spacing="0.8" ${font} fill="${k.numColor}">${a('nome')}</text>` : ''}
         <text x="0" y="-12" font-size="26" ${font} fill="${k.numColor}" stroke="${mix(k.shirt, '#000000', 0.3)}" stroke-width="0.8">${k.num}</text>`
      : `<text x="0" y="-22" font-size="14" ${font} fill="${k.numColor}" stroke="${mix(k.shirt, '#000000', 0.3)}" stroke-width="0.6">${k.num}</text>`;

    this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-W} -240 ${2 * W} 250" style="width:100%;height:100%;display:block;overflow:visible" preserveAspectRatio="xMidYMax meet">
      <defs>${grad('skin', skin)}${grad('hair', hair)}${grad('shirt', k.shirt)}${grad('shorts', k.shorts)}${grad('socks', k.socks)}${grad('boots', k.boots)}${k.gloves ? grad('gloves', k.gloves) : ''}</defs>
      <ellipse data-j="shadow" cx="0" cy="0" rx="28" ry="5.5" fill="#000" opacity="0.22"/>
      <g data-j="root">
        ${leg('L')}${leg('R')}
        <path d="M-16.5,-5 L16.5,-5 L19,17 Q19.5,20 16.5,20 L3,20 L0,14 L-3,20 L-16.5,20 Q-19.5,20 -19,17Z" fill="${G('shorts')}" ${S}/>
        <path d="M-16.8,-2 L-18.4,18 M16.8,-2 L18.4,18" stroke="${k.shorts === k.trim ? k.shirt : k.trim}" stroke-width="2.4"/>
        <g data-j="torso">
          <path d="M-5,-66 L-5.5,-55 L5.5,-55 L5,-66Z" fill="${G('skin')}" ${S}/>
          <path d="M-15,3 L-16,-28 Q-19,-44 -22,-50 Q-21,-56.5 -12,-57.5 L-6,-58.5 Q0,-52 6,-58.5 L12,-57.5 Q21,-56.5 22,-50 Q19,-44 16,-28 L15,3 Q0,6 -15,3Z" fill="${G('shirt')}" ${S}/>
          <path d="${view === 'costas' ? 'M-6,-58.5 Q0,-55.5 6,-58.5' : 'M-6,-58.5 Q0,-51 6,-58.5'}" stroke="${k.trim}" stroke-width="3" fill="none" stroke-linecap="round"/>
          ${chest}
          <g data-j="head">
            <ellipse cx="-12.6" cy="-17" rx="2.8" ry="4.2" fill="${G('skin')}" ${S}/>
            <ellipse cx="12.6" cy="-17" rx="2.8" ry="4.2" fill="${G('skin')}" ${S}/>
            <path d="M-12.4,-17 Q-13,-35 0,-35 Q13,-35 12.4,-17 Q12,-6.5 6,-2 Q0,1 -6,-2 Q-12,-6.5 -12.4,-17Z" fill="${G('skin')}" ${S}/>
            ${beard}${face}${hairSvg}
          </g>
          ${arm('L', -1)}${arm('R', 1)}
        </g>
      </g>
    </svg>`;
    this.svg = this.firstElementChild;
    this.J = {};
    this.querySelectorAll('[data-j]').forEach(e => this.J[e.dataset.j] = e);
    this.pose(0);
  }
  pose(t, an) {
    if (!this.J) return;
    const A = ANIMS[an || this.anim], fr = A.frames;
    let i = 0; while (i < fr.length - 2 && t > fr[i + 1].at) i++;
    const a = fr[i], b = fr[i + 1], u = ease(clamp((t - a.at) / ((b.at - a.at) || 1)));
    const o = {};
    for (const key in DEF) { const va = a[key] ?? DEF[key], vb = b[key] ?? DEF[key]; o[key] = va + (vb - va) * u; }
    if (A.extra) A.extra(t, o);
    const J = this.J, set = (el, v) => el.setAttribute('transform', v);
    const fL = -(o.lL + o.kL), fR = -(o.lR + o.kR);
    set(J.legL, `translate(-8.5,3) rotate(${o.lL}) scale(1,${o.sTL})`);
    set(J.kneeL, `translate(0,${TH}) rotate(${o.kL}) scale(1,${o.sSL})`);
    set(J.ankleL, `translate(0,${SH}) rotate(${fL})`);
    set(J.legR, `translate(8.5,3) rotate(${o.lR}) scale(1,${o.sTR})`);
    set(J.kneeR, `translate(0,${TH}) rotate(${o.kR}) scale(1,${o.sSR})`);
    set(J.ankleR, `translate(0,${SH}) rotate(${fR})`);
    set(J.torso, `translate(0,-2) rotate(${o.t}) scale(1,${o.tsy})`);
    set(J.head, `translate(0,${-62 + o.hy}) rotate(${o.h}) scale(0.84)`);
    set(J.armL, `translate(-20,-51) rotate(${o.aL})`);
    set(J.elbowL, `translate(0,29) rotate(${o.eL})`);
    set(J.handL, 'translate(0,26) scale(0.86)');
    set(J.armR, `translate(20,-51) rotate(${o.aR})`);
    set(J.elbowR, `translate(0,29) rotate(${o.eR})`);
    set(J.handR, 'translate(0,26) scale(0.86)');
    const sole = (s, l, k, sT, sS, f) => new DOMMatrix().translate(s * 8.5, 3).rotate(l).scale(1, sT)
      .translate(0, TH).rotate(k).scale(1, sS).translate(0, SH).rotate(f).transformPoint(new DOMPoint(0, SOLE)).y;
    const lockY = -Math.max(sole(-1, o.lL, o.kL, o.sTL, o.sSL, fL), sole(1, o.lR, o.kR, o.sTR, o.sSR, fR));
    const y = lockY * (1 - o.free) - HIP * o.free - o.lift;
    set(J.root, `translate(${o.x},${y}) rotate(${o.rot})`);
    const r = o.rot * Math.PI / 180, air = Math.max(0, -y - HIP * Math.abs(Math.cos(r)) - 17 * Math.abs(Math.sin(r)));
    const sh = J.shadow, f = 1 / (1 + air / 45);
    sh.setAttribute('cx', o.x + Math.sin(r) * 55);
    sh.setAttribute('rx', (24 + Math.abs(Math.sin(r)) * 62) * f);
    sh.setAttribute('opacity', 0.22 * f);
  }
  async exportSheet(frames = 16, opts = {}) {
    if (typeof opts === 'number') opts = { scale: opts };
    const list = Array.isArray(frames) ? frames : Array.from({ length: frames }, (_, i) => ({ anim: this.anim, t: i / frames }));
    const sc = opts.scale || 2, footY = opts.footY ?? 240;
    const cw = this.W * 2 * sc, ch = 250 * sc, cols = opts.cols || Math.min(list.length, 8), rows = Math.ceil(list.length / cols);
    const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * rows;
    const ctx = cv.getContext('2d');
    this._freeze = true;
    try {
      for (let i = 0; i < list.length; i++) {
        this.pose(list[i].t, list[i].anim);
        const clone = this.svg.cloneNode(true);
        clone.setAttribute('width', cw); clone.setAttribute('height', ch); clone.removeAttribute('style');
        clone.setAttribute('viewBox', `${-this.W} ${-footY} ${2 * this.W} 250`);
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)); });
        ctx.drawImage(img, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
      }
    } finally { this._freeze = false; }
    const name = opts.name || `${this.getAttribute('kit') || 'jogador'}-${this.anim}_${list.length}q_${cw}x${ch}_${ANIMS[this.anim].dur}ms.png`;
    cv.toBlob(b => { const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = name; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 2000); });
  }
}
customElements.define('jogador-2d', Jogador2D);
})();

(function (root) {
  let host = null;
  const hostEl = () => {
    if (!host || !host.isConnected) { host = document.createElement('div'); host.style.display = 'none'; host.setAttribute('aria-hidden', 'true'); document.body.appendChild(host); }
    // Personagens de cenas que já saíram da tela
    for (const ch of [...host.children]) if (!ch.svg || !ch.svg.isConnected) ch.remove();
    return host;
  };
  // Quadro de cada personagem: tamanho, ponto dos pés e altura do corpo (para escalar pela perspectiva)
  const FRAME = { 'jogador-lado': { w: 240, h: 250, fx: 120, fy: 242, tall: 180 }, 'jogador-2d': { w: 220, h: 250, fx: 110, fy: 240, tall: 186 } };
  // Cria o personagem e coloca o desenho dele dentro do SVG da cena (antes de `before`, se vier)
  function put(tag, attrs, parent, before) {
    const el = document.createElement(tag);
    el.setAttribute('paused', '');
    for (const k in attrs) if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    hostEl().appendChild(el);
    const s = el.svg, F = FRAME[tag];
    s.removeAttribute('style'); s.setAttribute('overflow', 'visible');
    s.style.pointerEvents = 'none';
    parent.insertBefore(s, before || null);
    return {
      el, node: s,
      place(x, feet, h) {
        const k = h / F.tall;
        s.setAttribute('x', x - F.fx * k); s.setAttribute('y', feet - F.fy * k);
        s.setAttribute('width', F.w * k); s.setAttribute('height', F.h * k);
      },
      pose(t, anim) { el.pose(t, anim); },
    };
  }
  // Visual da criação de personagem no formato dos personagens dos minigames
  // Visual do jogador (avatar.js) → desenho de lado dos minigames: cada corte e barba vira o mais parecido que existe de lado
  const HAIR = { curto: 'curto', raspado: 'raspado', topete: 'curto', black: 'black', trancas: 'trancas', dreads: 'trancas', moicano: 'raspado', longo: 'cacheado', careca: 'careca',
    social: 'curto', franja: 'curto', militar: 'raspado', cacheado: 'cacheado', undercut: 'curto', degrade: 'raspado', samurai: 'cacheado', afro: 'black',
    mullet: 'cacheado', riscado: 'raspado', trancalonga: 'trancas', moicanoloiro: 'raspado' };
  const BEARD = { nenhuma: 'sem', rala: 'rala', bigode: 'rala', cavanhaque: 'rala', cheia: 'cheia', porfazer: 'rala', costeleta: 'rala', lenhador: 'cheia', bigodao: 'cheia', trancada: 'cheia' };
  function look(c) {
    const A = root.ClimbixAvatar;
    if (!A || !c) return { skin: 'media', cabelo: 'curto' };
    const lk = Object.assign({}, A.DEF, A.lookOf(c)), g = A.GEAR[lk.boot];
    return { skin: A.SKIN[lk.skin] || A.SKIN[3], hair: A.HAIR_COLORS[lk.hc] || A.HAIR_COLORS[0], cabelo: HAIR[lk.hair] || 'curto', barba: BEARD[A.beardAtAge ? A.beardAtAge(lk.beard, c.age) : lk.beard] || 'sem',
      boots: lk.boot === 'ouro' ? '#E0B43A' : lk.boot === 'holo' ? '#B99BFF' : g && g[0] === '#' ? g : null };
  }
  // Rostos variados (barreira e zagueiros adversários)
  const FACES = [
    { skin: 'clara', hair: 'castanho', cabelo: 'curto', barba: 'sem' },
    { skin: 'media', hair: 'preto', cabelo: 'raspado', barba: 'rala' },
    { skin: 'morena', hair: 'preto', cabelo: 'black', barba: 'sem' },
    { skin: 'negra', hair: 'preto', cabelo: 'trancas', barba: 'rala' },
    { skin: 'clara', hair: 'castanho', cabelo: 'careca', barba: 'cheia' },
    { skin: 'negra', hair: 'preto', cabelo: 'cacheado', barba: 'cheia' },
    { skin: 'clara', hair: 'loiro', cabelo: 'curto', barba: 'rala' },
    { skin: 'morena', hair: 'preto', cabelo: 'curto', barba: 'cheia' },
  ];
  const faces = n => FACES.slice().sort(() => Math.random() - 0.5).slice(0, n);
  // Cores: o seu clube e o adversário (do lance ou sorteado), sem os dois parecidos demais
  const PAL = [['#C8323A', '#FFFFFF'], ['#1F4FA8', '#FFFFFF'], ['#E8742A', '#1D1D1F'], ['#1D1D1F', '#FFFFFF'], ['#F4F1E8', '#1D1D1F'], ['#6B2D8F', '#FFFFFF'], ['#12824A', '#FFFFFF']];
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const near = (a, b) => { const x = rgb(a), y = rgb(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 150; };
  const kitOf = p => ({ shirt: p[0], shorts: p[1], socks: p[0], trim: near(p[0], p[1]) ? (near(p[0], '#ffffff') ? '#1D1D1F' : '#FFFFFF') : p[1] });
  // Uniformes do lance: o de verdade (kits-real.js) quando existe; senão, as cores do escudo (kits.js).
  // Se a camisa do adversário bate com a sua ou com o amarelo do goleiro, ele usa o uniforme reserva.
  // CRAQUE_KIT_CTX (Copa e Mundial): nomes do adversário e do seu time/seleção, no lugar dos clubes
  function kits(c, vs) {
    const ctx = root.CRAQUE_KIT_CTX || null;
    const REAL = root.CRAQUE_KITS_REAL || {}, K = root.CRAQUE_KITS || {}, DD = root.CRAQUE_DATA;
    const nameOf = id => (id && DD && DD.CLUB_BY_ID && DD.CLUB_BY_ID[id] ? DD.CLUB_BY_ID[id].name : id);
    const kitFor = (name, id) => REAL[name] || (id && K[id] ? [K[id][0], K[id][1], K[id][1], K[id][0]] : null);
    const m = kitFor(ctx && ctx.mine ? ctx.mine : nameOf(c && c.club), c && !(ctx && ctx.mine) ? c.club : null) || ['#12824A', '#F4F1E8', '#F4F1E8', '#12824A'];
    const mine = [m[0], m[1]];
    const bad = x => near(x, mine[0]) || near(x, '#F2C230');
    const o = ctx && ctx.vs ? kitFor(ctx.vs, null) : kitFor(nameOf(vs), vs);
    let opp = o && (!bad(o[0]) ? [o[0], o[1]] : !bad(o[2]) ? [o[2], o[3]] : null);
    if (!opp) { const ok = PAL.filter(p => !bad(p[0])); opp = ok[Math.floor(Math.random() * ok.length)] || PAL[0]; }
    return { mine: kitOf(mine), opp: kitOf(opp) };
  }
  root.CRAQUE_CHARS = { put, look, faces, kits };
})(window);
