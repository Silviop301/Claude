// Bola 3D da tela inicial. Só enfeite: carrega depois da tela aparecer e, se falhar, nada acontece.
// Gira sozinha e dá para girar com o dedo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelReady = new GLTFLoader().loadAsync('assets/bola.glb').then(g => {
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
const goalReady = () => (goalModel = goalModel || new GLTFLoader().loadAsync('assets/gol.glb').then(g => g.scene));
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
    // Anima por ~30 quadros/s (cada quadro vira imagem de novo)
    let anim = 0;
    const play = (ms, step) => {
      cancelAnimationFrame(anim);
      const t0 = performance.now();
      let last = 0;
      const tick = now => {
        const u = Math.min(1, (now - t0) / ms);
        if (now - last >= 30 || u === 1) { last = now; step(u); draw(); }
        if (u < 1) anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    };
    return {
      // Gol: a rede estufa onde a bola entrou e volta um pouco
      bulge(x, y) {
        const p = toWorld(x, Math.max(y, m.top + 4));
        play(700, u => setBulge(p.X, Math.max(0.2, p.Y), 2.4 * (u < 0.3 ? 1 - Math.pow(1 - u / 0.3, 3) : 1 - 0.4 * (u - 0.3) / 0.7)));
      },
      // Bola na trave: o gol todo treme
      shake() { play(500, u => { g.position.x = 0.05 * Math.sin(u * 40) * (1 - u); }); },
      dispose() { cancelAnimationFrame(anim); renderer.dispose(); },
    };
  }).catch(() => null);
}

window.CRAQUE_BALL = { mount, flyer, goal };
// A tela inicial pode ter sido desenhada antes deste módulo carregar
mount(document.getElementById('ball3d'));
