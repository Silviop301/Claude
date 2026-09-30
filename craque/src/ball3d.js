// Bola 3D da tela inicial. Só enfeite: carrega depois da tela aparecer e, se falhar, nada acontece.
// Gira sozinha e dá para girar com o dedo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const modelReady = new GLTFLoader().loadAsync('assets/bola.glb?v=1ba24026').then(g => {
  // Centraliza e normaliza o tamanho, seja qual for a escala do arquivo
  const obj = g.scene;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3()).length();
  obj.position.sub(box.getCenter(new THREE.Vector3()));
  const pivot = new THREE.Group();
  pivot.add(obj);
  pivot.scale.setScalar(3.0 / size);
  return pivot;
});

function mount(el) {
  if (!el || el.dataset.on) return;
  el.dataset.on = '1';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0, 5.2);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1c5a3c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1c9, 2.4);
  sun.position.set(-2, 3, 4);
  scene.add(sun);
  el.appendChild(renderer.domElement);

  const fit = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };
  fit();

  let ball = null, spinX = 0, spinY = 0.012, drag = null, t0 = performance.now(), raf = 0;
  modelReady.then(m => {
    if (!el.isConnected) return;
    ball = m.clone();
    ball.rotation.set(0.35, 0.6, 0);
    scene.add(ball);
    el.classList.add('ready');
    if (still) renderer.render(scene, cam);
  }).catch(() => el.remove());

  // Arrastar com o dedo gira a bola; ao soltar, ela desacelera até o giro normal
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!drag || !ball) return;
    spinY = (e.clientX - drag.x) * 0.012;
    spinX = (e.clientY - drag.y) * 0.012;
    drag = { x: e.clientX, y: e.clientY };
  });
  const up = () => { drag = null; };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  const loop = now => {
    // Saiu da tela inicial: libera a GPU
    if (!el.isConnected) { renderer.dispose(); removeEventListener('resize', fit); return; }
    raf = requestAnimationFrame(loop);
    if (!ball || document.hidden) return;
    if (!drag) {
      spinY += (0.012 - spinY) * 0.04;
      spinX += (0 - spinX) * 0.06;
    }
    ball.rotation.y += spinY;
    ball.rotation.x += spinX;
    ball.position.y = Math.sin((now - t0) / 700) * 0.08;
    renderer.render(scene, cam);
  };
  if (!still) raf = requestAnimationFrame(loop);
  addEventListener('resize', fit);
}

// Bola 3D do minigame: uma tela transparente por cima da cena em SVG (viewBox w×h),
// posicionada nas mesmas coordenadas. Só desenha quando a bola se move.
function flyer(host, w, h) {
  return modelReady.then(m => {
    if (!host.isConnected) return null;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const cv = renderer.domElement;
    cv.className = 'ball3d-fly';
    host.appendChild(cv);
    const fit = () => renderer.setSize(host.clientWidth || 1, host.clientHeight || 1, false);
    fit();
    // Câmera ortográfica com as coordenadas do SVG (y para baixo vira y negativo)
    const cam = new THREE.OrthographicCamera(0, w, 0, -h, -100, 100);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1c5a3c, 1.7));
    const sun = new THREE.DirectionalLight(0xfff1c9, 2.4);
    sun.position.set(-2, 3, 4);
    scene.add(sun);
    const ball = m.clone();
    const s0 = ball.scale.x, diam = 3.0 / Math.sqrt(3); // tamanho normalizado do modelo
    ball.rotation.set(0.4, 0.8, 0);
    scene.add(ball);
    const api = {
      // x, y no SVG; r = raio no SVG; spin = quanto girar neste quadro
      set(x, y, r, spin) {
        ball.position.set(x, -y, 0);
        ball.scale.setScalar(s0 * (2 * r) / diam);
        if (spin) { ball.rotation.x -= spin; ball.rotation.y += spin * 0.35; }
        renderer.render(scene, cam);
      },
      dispose() { renderer.dispose(); cv.remove(); removeEventListener('resize', fit); },
    };
    addEventListener('resize', fit);
    return api;
  }).catch(() => null);
}

// Gol 3D do minigame (traves e rede de verdade). Vira uma <image> dentro do SVG, no lugar do gol desenhado,
// para o goleiro, a barreira e a bola continuarem na frente dele. A câmera é calculada para as traves caírem
// exatamente onde a mira funciona: m = { w, h, left, right, top, ground } no SVG.
let goalModel = null;
const goalReady = () => (goalModel = goalModel || new GLTFLoader().loadAsync('assets/gol.glb?v=fff0621f').then(g => g.scene));

function goal(svg, m) {
  return goalReady().then(model => {
    if (!svg.isConnected) return null;
    const W = m.w, H = m.h, D = 18; // câmera a 18 m: o fundo da rede (2 m) fica com a perspectiva do desenho
    const f = (m.right - m.left) * D / 7.32; // distância focal em unidades do SVG
    const sY = (m.ground - m.top) / (m.right - m.left) * 7.32 / 2.44; // o gol do desenho é um pouco mais alto que o real
    const camY = 2.44 * sY, cx = (m.left + m.right) / 2, cy = m.top;
    const cam = new THREE.PerspectiveCamera(2 * Math.atan(H / 2 / f) * 180 / Math.PI, W / H, 0.1, 100);
    cam.position.set(0, camY, D);
    cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); // centro óptico no meio do travessão
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1c5a3c, 1.5));
    const sun = new THREE.DirectionalLight(0xfff6dd, 2.2);
    sun.position.set(-6, 14, 12);
    scene.add(sun);
    const g = model.clone(true);
    g.scale.set(1, sY, 1);
    let net = null;
    g.traverse(o => {
      if (!o.isMesh) return;
      if (o.material.name === 'rede') { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; o.material.depthWrite = false; }
      if (o.name === 'rede_fundo') { o.geometry = o.geometry.clone(); net = o; }
    });
    scene.add(g);
    g.updateMatrixWorld(true);
    const base = net && net.geometry.attributes.position.array.slice();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(W, H, false);
    // A imagem entra no lugar do gol desenhado (mesma camada)
    const NS = 'http://www.w3.org/2000/svg', img = document.createElementNS(NS, 'image');
    img.setAttribute('x', 0); img.setAttribute('y', 0); img.setAttribute('width', W); img.setAttribute('height', H);
    img.setAttribute('class', 'k-goal3d');
    const draw = () => { renderer.render(scene, cam); img.setAttribute('href', renderer.domElement.toDataURL('image/png')); };
    draw();
    const anchor = svg.querySelector('#k-net');
    anchor.parentNode.insertBefore(img, anchor);
    ['#k-net', '#k-posts'].forEach(s => { const e = svg.querySelector(s); if (e) e.style.display = 'none'; });

    // Ponto do SVG (no plano do gol) → metros
    const toWorld = (x, y) => ({ X: (x - cx) * D / f, Y: camY - (y - cy) * D / f });
    const v = new THREE.Vector3();
    function setBulge(X, Y, depth) {
      if (!net) return;
      const pos = net.geometry.attributes.position, mw = net.matrixWorld, inv = mw.clone().invert();
      for (let i = 0; i < pos.count; i++) {
        v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).applyMatrix4(mw);
        const d = Math.hypot(v.x - X, (v.y - Y) / sY), k = Math.max(0, 1 - d / 1.7);
        v.z -= depth * k * k;
        v.applyMatrix4(inv);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      pos.needsUpdate = true;
    }
    // Animações (várias ao mesmo tempo): um laço só, ~30 quadros/s, cada quadro vira imagem de novo
    let anim = 0, last = 0;
    const jobs = new Map();
    const loop = now => {
      anim = 0;
      if (!svg.isConnected) return;
      if (now - last >= 30) {
        last = now;
        jobs.forEach((j, k) => { const u = Math.min(1, Math.max(0, (now - j.t0) / j.ms)); j.step(u); if (u >= 1) jobs.delete(k); });
        draw();
      }
      if (jobs.size) anim = requestAnimationFrame(loop);
    };
    const play = (ms, step, key, delay) => {
      jobs.set(key || 'x', { t0: performance.now() + (delay || 0), ms, step });
      if (!anim) anim = requestAnimationFrame(loop);
    };

    return {
      // Gol: a rede estufa onde a bola entrou e volta um pouco
      bulge(x, y) {
        const p = toWorld(x, Math.max(y, m.top + 4));
        play(700, u => setBulge(p.X, Math.max(0.2, p.Y), 2.4 * (u < 0.3 ? 1 - Math.pow(1 - u / 0.3, 3) : 1 - 0.4 * (u - 0.3) / 0.7)), 'net');
      },
      // Bola na trave: o gol todo treme
      shake() { play(500, u => { g.position.x = 0.05 * Math.sin(u * 40) * (1 - u); }, 'shake'); },
      dispose() { cancelAnimationFrame(anim); renderer.dispose(); },
    };
  }).catch(() => null);
}

// ---------- Carta 3D metálica ----------
// Um modelo só (assets/carta.glb) e o metal da face por cor (assets/cartas/*.jpg). O conteúdo da carta
// (nota, nome, atributos...) é desenhado pelo card.js sem fundo e vai numa camada por cima, também metálica.
// Borda e friso de cada cor (dos modelos originais)
const CARD_TRIM = {
  azul: { borda: [0.584, 0.617, 0.694], filete: [0.863, 0.658, 0.262] },
  vermelha: { borda: [0.672, 0.604, 0.565], filete: [0.863, 0.658, 0.262] },
  verde: { borda: [0.839, 0.791, 0.509], filete: [0.044, 0.068, 0.014] },
  dourada: { borda: [0.791, 0.658, 0.361], filete: [0.254, 0.150, 0.031] },
  bronze: { borda: [0.720, 0.450, 0.280], filete: [0.200, 0.100, 0.040] },
  prata: { borda: [0.800, 0.830, 0.870], filete: [0.150, 0.180, 0.220] },
  icone: { borda: [0.860, 0.720, 0.350], filete: [0.950, 0.840, 0.460] },
  fogo: { borda: [0.900, 0.500, 0.200], filete: [1.000, 0.880, 0.550] },
  turquesa: { borda: [0.300, 0.750, 0.700], filete: [0.950, 0.950, 0.950] },
  marinho: { borda: [0.700, 0.760, 0.880], filete: [0.900, 0.930, 0.980] },
  aco: { borda: [0.550, 0.600, 0.660], filete: [0.900, 0.920, 0.950] },
  rosa: { borda: [0.900, 0.450, 0.650], filete: [1.000, 0.900, 0.950] },
  onix: { borda: [0.860, 0.720, 0.350], filete: [0.950, 0.840, 0.460] },
  esmeralda: { borda: [0.860, 0.720, 0.350], filete: [0.950, 0.840, 0.460] },
  celeste: { borda: [0.750, 0.850, 0.950], filete: [1.000, 1.000, 1.000] },
  arcoiris: { borda: [0.950, 0.950, 0.980], filete: [0.600, 0.450, 0.950] },
};
let cardModel = null;
const cardReady = () => (cardModel = cardModel || new GLTFLoader().loadAsync('assets/carta.glb?v=5faf94a3').then(g => g.scene));
const texCache = {};
const metalTex = k => (texCache[k] = texCache[k] || new THREE.TextureLoader().loadAsync('assets/cartas/' + k + '.jpg').then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }));

// Conteúdo da carta (canvas 600x860 do card.js) recortado na área interna da carta
async function contentTexture(data, look) {
  const src = document.createElement('canvas');
  await window.CRAQUE_CARD(src, Object.assign({}, data, { bare: true, ink: look.ink, inkLight: look.inkLight, line: look.line }));
  const cv = document.createElement('canvas');
  cv.width = 1060; cv.height = 1604; // 2x da área do escudo (530x802)
  cv.getContext('2d').drawImage(src, 35, 40, 530, 802, 0, 0, cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// Verso: logo do jogo gravado no metal
function backTexture(look) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 782;
  const x = cv.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = look.ink;
  x.font = "800 118px 'Barlow Condensed', 'Arial Narrow', sans-serif";
  x.fillText('CLIMBIX', 256, 360);
  x.font = "600 30px 'Barlow', sans-serif";
  x.globalAlpha = 0.8; x.fillText('SEU NOME NA HISTÓRIA', 256, 440);
  x.globalAlpha = 0.5; x.lineWidth = 6; x.strokeStyle = look.ink;
  x.beginPath(); x.arc(256, 210, 58, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// host: elemento onde a carta aparece; data: dados do card.js. Devolve { update(data), dispose() } ou null.
function card3d(host, data, opts) {
  opts = opts || {};
  return cardReady().then(async model => {
    if (!host.isConnected) return null;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const cv = renderer.domElement;
    cv.className = 'card3d-cv';
    host.appendChild(cv);
    const scene = new THREE.Scene();
    // Reflexo: ambiente de estúdio (luzes de teto e paredes claras) gerado na hora
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xfff0c8, 1.2); rim.position.set(-4, -2, 3); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    cam.position.set(0, 0, 7.6);

    const pivot = new THREE.Group(); scene.add(pivot);
    const card = model.clone(true);
    const mats = {};
    card.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone(); mats[o.material.name] = o.material;
      // O modelo não traz coordenadas de textura: projeta a frente (x, y) para o metal escovado aparecer inteiro
      const g = o.geometry;
      if (o.material.name === 'face_metal' && g && !g.attributes.uv) {
        g.computeBoundingBox();
        const bb = g.boundingBox, p = g.attributes.position, uv = new Float32Array(p.count * 2);
        const w = bb.max.x - bb.min.x || 1, h = bb.max.y - bb.min.y || 1;
        for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - bb.min.x) / w; uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / h; }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
    });
    // Normaliza: o arquivo pode vir com escala no nó raiz. A carta fica com 3,1 de altura, centrada.
    const box0 = new THREE.Box3().setFromObject(card), size0 = box0.getSize(new THREE.Vector3());
    const k = 3.1 / size0.y;
    card.scale.multiplyScalar(k);
    card.position.sub(box0.getCenter(new THREE.Vector3()).multiplyScalar(k));
    pivot.add(card);
    const box = new THREE.Box3().setFromObject(card), size = box.getSize(new THREE.Vector3());
    // Camada do conteúdo (frente) e do verso: planos colados na face, dentro do friso
    const FW = size.x * 0.86, FH = size.y * 0.93;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(FW, FW * 802 / 530), new THREE.MeshPhysicalMaterial({ transparent: true, metalness: 0.25, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false }));
    face.position.set(0, size.y * 0.025, box.max.z + 0.002); pivot.add(face);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshPhysicalMaterial({ transparent: true, metalness: 0.5, roughness: 0.35, depthWrite: false }));
    back.position.z = box.min.z - 0.002; back.rotation.y = Math.PI; pivot.add(back);

    async function apply(d) {
      const look = window.CRAQUE_CARD_METAL(d);
      const [tex, content] = await Promise.all([metalTex(look.metal), contentTexture(d, look)]);
      const f = mats.face_metal;
      if (f) {
        f.map = tex; f.map.offset.set(0, 0); f.map.repeat.set(1, 1);
        f.color.set(0xffffff); f.metalness = 0.85; f.roughness = 0.3;
        // Temporada Perfeita: reflexo arco-íris que muda com o ângulo
        if ('iridescence' in f) { const iri = d.special === 'perfeita'; f.iridescence = iri ? 1 : 0; f.iridescenceIOR = 2.2; f.iridescenceThicknessRange = [120, 900]; }
        f.needsUpdate = true;
      }
      const tr = CARD_TRIM[look.metal];
      if (mats.borda_externa) mats.borda_externa.color.setRGB(...tr.borda, THREE.SRGBColorSpace);
      if (mats.filete_interno) mats.filete_interno.color.setRGB(...tr.filete, THREE.SRGBColorSpace);
      if (face.material.map) face.material.map.dispose();
      // Texto claro (azul, vermelha): camada metálica com verniz, reflete junto com a carta.
      // Texto escuro (ouro, verde): sem luz nem verniz, para a tinta ficar escura de verdade.
      face.material.dispose();
      face.material = look.inkLight
        ? new THREE.MeshPhysicalMaterial({ map: content, transparent: true, metalness: 0.3, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false })
        : new THREE.MeshBasicMaterial({ map: content, transparent: true, toneMapped: false, depthWrite: false });
      if (back.material.map) back.material.map.dispose();
      back.material.map = backTexture(look); back.material.needsUpdate = true;
    }
    await apply(data);
    if (!host.isConnected) { renderer.dispose(); cv.remove(); return null; }

    const fit = () => {
      const w = host.clientWidth || 300, h = host.clientHeight || 420;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      // A carta (3,1 de altura) cabe inteira, com folga para girar
      const fitH = 3.1 / (2 * Math.tan(cam.fov * Math.PI / 360)) * 1.18, fitW = 2.1 / (2 * Math.tan(cam.fov * Math.PI / 360) * cam.aspect) * 1.25;
      cam.position.z = Math.max(fitH, fitW);
      cam.updateProjectionMatrix();
    };
    fit();
    addEventListener('resize', fit);

    // Movimento: balanço sozinho + arrastar com o dedo (um peteleco dá a volta) + inclinação do celular
    let yaw = -Math.PI * 1.6, pitch = 0.25, vyaw = 0, drag = null, tiltX = 0, tiltY = 0, raf = 0, t0 = performance.now() + (opts.delay || 0);
    const intro = opts.intro !== false;
    if (!intro) yaw = 0;
    host.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, t: performance.now() }; host.setPointerCapture(e.pointerId); vyaw = 0; askTilt(); });
    host.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(8, performance.now() - drag.t);
      yaw += dx * 0.012; pitch = Math.max(-0.5, Math.min(0.5, pitch + dy * 0.006));
      vyaw = dx * 0.012 / dt * 16;
      drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    const up = () => { drag = null; };
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    const onTilt = e => { if (e.gamma == null) return; tiltY = Math.max(-0.5, Math.min(0.5, e.gamma / 60)); tiltX = Math.max(-0.4, Math.min(0.4, (e.beta - 45) / 90)); };
    let tiltAsked = false;
    function askTilt() {
      if (tiltAsked) return; tiltAsked = true;
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') DOE.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onTilt); }).catch(() => {});
      else if (DOE) addEventListener('deviceorientation', onTilt);
    }
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') { tiltAsked = true; addEventListener('deviceorientation', onTilt); }

    const loop = now => {
      if (!host.isConnected) return api.dispose();
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const t = Math.max(0, (now - t0) / 1000);
      if (!drag) {
        // Solto: gira pelo impulso e volta para a frente mais próxima (frente = múltiplo de 2π)
        yaw += vyaw; vyaw *= 0.94;
        if (Math.abs(vyaw) < 0.004) {
          const target = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2;
          yaw += (target - yaw) * (intro && t < 1.6 ? 0.06 : 0.08);
        }
        pitch += (0 - pitch) * 0.05;
      }
      const sway = drag ? 0 : Math.sin(t * 0.9) * 0.22;
      pivot.rotation.y = yaw + sway + tiltY;
      pivot.rotation.x = pitch + (drag ? 0 : Math.sin(t * 0.63) * 0.07) + tiltX;
      pivot.position.y = drag ? 0 : Math.sin(t * 1.3) * 0.04;
      const sc = intro ? Math.min(1, 0.55 + t * 0.45) : 1;
      pivot.scale.setScalar(sc);
      // O brilho passa pela carta
      key.position.x = Math.sin(t * 0.7) * 4;
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);
    const api = {
      update: d => apply(d),
      dispose() { cancelAnimationFrame(raf); removeEventListener('resize', fit); removeEventListener('deviceorientation', onTilt); renderer.dispose(); pm.dispose(); cv.remove(); },
    };
    return api;
  }).catch(e => { console.warn('carta 3D', e); return null; });
}

// ---------- Jornal 3D ----------
// Folha de papel com a página do jogo (canvas 1100×1800): chega girando dobrada, desdobra,
// fica respirando e dá para inclinar arrastando; um toque fecha (dobra e sai girando).
function paperTex() {
  const TW = 1100, TH = 1800, c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const x = c.getContext('2d');
  x.fillStyle = '#f2ead7'; x.fillRect(0, 0, TW, TH);
  const g = x.createRadialGradient(TW / 2, TH / 2, TH * 0.2, TW / 2, TH / 2, TH * 0.75);
  g.addColorStop(0, 'rgba(255,250,235,.35)'); g.addColorStop(1, 'rgba(170,140,90,.22)');
  x.fillStyle = g; x.fillRect(0, 0, TW, TH);
  for (let i = 0; i < 900; i++) {
    x.strokeStyle = 'rgba(120,100,70,' + Math.random() * 0.06 + ')'; x.lineWidth = 1;
    const px = Math.random() * TW, py = Math.random() * TH, a = Math.random() * 6.28, l = 4 + Math.random() * 14;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return c;
}
let PAPER_BASE = null;
function newspaper(host, page, onClose) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return false; }
  const TW = 1100, TH = 1800;
  PAPER_BASE = PAPER_BASE || paperTex();
  const pc = document.createElement('canvas'); pc.width = TW; pc.height = TH;
  const px = pc.getContext('2d');
  px.drawImage(PAPER_BASE, 0, 0);
  // Foto e faixas coloridas entram no papel; o texto vai numa camada à parte (sem luz), para ficar preto de verdade
  px.globalCompositeOperation = 'multiply'; px.drawImage(page, 0, 0, TW, TH); px.globalCompositeOperation = 'source-over';

  host.innerHTML = '<div class="np-dim"></div><p class="np-hint">Arraste para inclinar · toque para fechar</p>';
  const dim = host.querySelector('.np-dim'), hint = host.querySelector('.np-hint');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.domElement.className = 'np-cv';
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0x1d3a2a, 0.9));
  const key = new THREE.DirectionalLight(0xfff1d8, 1.3); key.position.set(-2, 3, 4); scene.add(key);

  const W = 1.1, H = 1.8, SX = 44, SY = 140;
  const tex = new THREE.CanvasTexture(pc);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  { const gx = gc.getContext('2d'), id = gx.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = 110 + Math.random() * 40; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gx.putImageData(id, 0, 0); }
  const grain = new THREE.CanvasTexture(gc); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 6);
  const geo = new THREE.PlaneGeometry(W, H, SX, SY);
  const base = geo.attributes.position.array.slice();
  const front = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.7, metalness: 0, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xfff6e0), bumpMap: grain, bumpScale: 0.6, envMapIntensity: 0.3, side: THREE.FrontSide });
  const back = new THREE.MeshStandardMaterial({ color: 0xe6dcc5, roughness: 0.7, bumpMap: grain, bumpScale: 0.6, envMapIntensity: 0.4, side: THREE.BackSide });
  const pivot = new THREE.Group(); scene.add(pivot);
  const sheet = new THREE.Group(); pivot.add(sheet);
  // Camada de tinta: a mesma folha, com a página por cima sem iluminação nem tone mapping
  const inkTex = new THREE.CanvasTexture(page);
  inkTex.colorSpace = THREE.SRGBColorSpace; inkTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ink = new THREE.MeshBasicMaterial({ map: inkTex, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.FrontSide });
  const inkMesh = new THREE.Mesh(geo, ink); inkMesh.renderOrder = 1;
  sheet.add(new THREE.Mesh(geo, front), new THREE.Mesh(geo, back), inkMesh);
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  { const sx = sc.getContext('2d'), g = sx.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = g; sx.fillRect(0, 0, 256, 256); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  scene.add(shadow);

  // Dobra: a metade de baixo gira pela linha do meio (raio pequeno), mais curvatura e tremulação
  function deform(fold, curve, flutter, t) {
    const p = geo.attributes.position.array, th = fold * Math.PI, r = 0.016;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y0 = base[i + 1];
      let y = y0, z = 0;
      if (y0 < 0 && th > 1e-4) {
        const s = -y0, arc = th * r;
        if (s <= arc) { const a = s / r; y = -r * Math.sin(a); z = -r * (1 - Math.cos(a)); }
        else { const ye = -r * Math.sin(th), ze = -r * (1 - Math.cos(th)), kk = s - arc; y = ye - kk * Math.cos(th); z = ze - kk * Math.sin(th); }
      }
      const nx = x / (W / 2);
      z -= curve * 0.045 * nx * nx;
      z += curve * 0.012 * Math.sin((y0 / H + 0.5) * Math.PI);
      if (flutter) z += flutter * 0.03 * Math.sin(y0 * 5 + t * 9) * nx;
      p[i + 1] = y; p[i + 2] = z;
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    sheet.position.y = -H / 4 * fold;
  }
  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max((H * 0.58) / tan, (W * 0.62) / (tan * camera.aspect)));
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const REST_Z = -0.035;
  let phase = 'enter', t0 = performance.now(), raf = 0, done = false;
  const tilt = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  const start = ph => { phase = ph; t0 = performance.now(); };
  const cv = renderer.domElement;
  let down = null;
  cv.addEventListener('pointerdown', e => { if (phase !== 'idle' && phase !== 'unfold') return; down = { x: e.clientX, y: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } });
  cv.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 6) down.moved = true;
    tilt.ty = THREE.MathUtils.clamp(dx * 0.006, -0.75, 0.75); tilt.tx = THREE.MathUtils.clamp(dy * 0.006, -0.6, 0.6);
  });
  // Toque fecha na hora (sem animação de saída)
  const up = () => { if (!down) return; const tap = !down.moved; down = null; tilt.tx = tilt.ty = 0; if (tap && !done) { done = true; dispose(); onClose && onClose(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const dispose = () => {
    cancelAnimationFrame(raf); removeEventListener('resize', resize);
    geo.dispose(); tex.dispose(); inkTex.dispose(); ink.dispose(); grain.dispose(); front.dispose(); back.dispose(); pm.dispose(); renderer.dispose();
  };

  function frame(now) {
    if (!host.isConnected) { dispose(); return; } // saiu da tela (ex.: voltou ao início)
    const t = (now - t0) / 1000, time = now / 1000;
    let fold = 0, curve = 1, flutter = 0, z = 0, rz = REST_Z, rx = 0, ry = 0, s = 1;
    if (phase === 'enter') {
      const k = Math.min(t / 1.5, 1), e = easeOut(k);
      fold = 1; z = -16 * (1 - e); rz = REST_Z - (1 - e) * Math.PI * 7; rx = (1 - e) * 0.5; flutter = (1 - e) * 0.6;
      s = 0.92 + 0.08 * e; dim.style.opacity = e;
      if (k >= 1) start('unfold');
    } else if (phase === 'unfold') {
      const k = Math.min(t / 0.9, 1);
      fold = 1 - easeInOut(Math.min(k * 1.15, 1)); curve = 1 + Math.sin(k * Math.PI) * 1.6;
      s = 1 + Math.sin(k * Math.PI) * 0.03; rx = -Math.sin(k * Math.PI) * 0.12;
      if (k >= 1) { start('idle'); hint.style.opacity = 0.75; }
    } else if (phase === 'idle') {
      rx = Math.sin(time * 0.9) * 0.025; ry = Math.sin(time * 0.7) * 0.03; z = Math.sin(time * 1.1) * 0.015;
      curve = 1 + Math.sin(time * 1.3) * 0.15;
    } else if (phase === 'exit') {
      hint.style.opacity = 0;
      const k = Math.min(t / 0.9, 1), f = easeInOut(Math.min(k / 0.4, 1)), out = Math.max(0, (k - 0.35) / 0.65), e = out * out;
      fold = f; z = -16 * e; rz = REST_Z + e * Math.PI * 5; flutter = e * 0.5;
      dim.style.opacity = 1 - e;
      if (k >= 1 && !done) { done = true; dispose(); onClose && onClose(); return; }
    }
    const kS = 90, dmp = 12, dt = 1 / 60;
    tilt.vx += ((tilt.tx - tilt.x) * kS - tilt.vx * dmp) * dt; tilt.x += tilt.vx * dt;
    tilt.vy += ((tilt.ty - tilt.y) * kS - tilt.vy * dmp) * dt; tilt.y += tilt.vy * dt;
    curve += Math.abs(tilt.y) * 0.8;
    deform(fold, curve, flutter, time);
    pivot.position.z = z; pivot.scale.setScalar(s);
    pivot.rotation.set(rx + tilt.x, ry + tilt.y, rz);
    shadow.position.set(tilt.y * 0.15 + 0.03, -tilt.x * 0.12 - 0.05, z - 0.25);
    shadow.scale.set(W * 1.5, H * (1.35 - fold * 0.6), 1);
    shadow.rotation.z = rz; shadow.material.opacity = 0.8 * (1 - fold * 0.5);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return true;
}

window.CRAQUE_BALL = { mount, flyer, goal, card3d, newspaper };
// A tela inicial pode ter sido desenhada antes deste módulo carregar
mount(document.getElementById('ball3d'));
