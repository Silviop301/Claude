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

window.CRAQUE_BALL = { mount, flyer };
// A tela inicial pode ter sido desenhada antes deste módulo carregar
mount(document.getElementById('ball3d'));
