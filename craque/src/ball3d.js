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
    card.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); mats[o.material.name] = o.material; } });
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
        f.map = tex; f.map.offset.set(0.5, 0.5); f.map.repeat.set(0.47619, 0.32258);
        f.color.set(0xffffff); f.metalness = 0.85; f.roughness = 0.3; f.needsUpdate = true;
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

window.CRAQUE_BALL = { mount, flyer, goal, card3d };
// A tela inicial pode ter sido desenhada antes deste módulo carregar
mount(document.getElementById('ball3d'));
