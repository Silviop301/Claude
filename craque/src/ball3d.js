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
let goalModel = null, keeperModels = null;
const goalReady = () => (goalModel = goalModel || new GLTFLoader().loadAsync('assets/gol.glb').then(g => g.scene));
// Goleiro: três poses do mesmo boneco (mesmas peças). A animação interpola o giro de cada articulação.
const keeperReady = () => (keeperModels = keeperModels || Promise.all(['parado', 'pronto', 'defesa']
  .map(n => new GLTFLoader().loadAsync('assets/goleiro-' + n + '.glb').then(g => g.scene))));
const poseOf = root => { const p = {}; root.traverse(o => { if (o.name) p[o.name] = { q: o.quaternion.clone(), p: o.position.clone() }; }); return p; };

// opts.keeper: 'opp' (goleiro adversário, amarelo) ou 'mine' (você, azul); sem isso, só o gol
function goal(svg, m, opts) {
  opts = opts || {};
  return Promise.all([goalReady(), opts.keeper ? keeperReady().catch(() => null) : null]).then(([model, kps]) => {
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

    // ---------- goleiro 3D ----------
    let keeper = null;
    if (kps) {
      const [kParado, kPronto, kDefesa] = kps;
      const P = { parado: poseOf(kParado), pronto: poseOf(kPronto), defesa: poseOf(kDefesa) };
      const body = kParado.clone(true);
      // Cores: adversário mantém o amarelo do modelo; você (minigame do goleiro) de azul
      body.traverse(o => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.side = THREE.DoubleSide; // o espelhamento (mergulho para o outro lado) inverte as faces
        if (opts.keeper === 'mine' && ['camisa', 'meiao'].includes(o.material.name)) o.material.color.set(0x2F6FDB);
      });
      const nodes = {};
      body.traverse(o => { if (o.name && P.parado[o.name]) nodes[o.name] = o; });
      const KS = 1.3; // um pouco maior que o real (o gol do desenho também é mais alto)
      const rig = new THREE.Group(); // posição, inclinação e espelho do mergulho
      const inner = new THREE.Group();
      inner.scale.setScalar(KS);
      inner.add(body); rig.add(inner); scene.add(rig);
      // Sombra no gramado
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.scale.set(1.3, 0.55, 1); sh.position.y = 0.01;
      scene.add(sh);
      const setPose = (a, b, t) => {
        for (const n in nodes) {
          const A = a[n], B = b[n];
          nodes[n].quaternion.slerpQuaternions(A.q, B.q, t);
          nodes[n].position.lerpVectors(A.p, B.p, t);
        }
      };
      const hand = new THREE.Vector3();
      // Luva mais adiantada na direção do mergulho, em metros (com a pose e a inclinação atuais)
      const gloveAt = dir => {
        rig.updateMatrixWorld(true);
        let best = null;
        ['luvaD', 'luvaE', 'maoD', 'maoE'].forEach(n => {
          const o = body.getObjectByName(n); if (!o) return;
          o.getWorldPosition(hand);
          const score = hand.x * dir + hand.y * 0.35;
          if (!best || score > best.s) best = { s: score, x: hand.x, y: hand.y };
        });
        return best;
      };
      let baseX = 0;
      const place = (x, y, tilt, mirror) => {
        rig.position.set(x, y, 0.15);
        rig.rotation.z = tilt;
        rig.scale.x = mirror;
        sh.position.x = x;
        const air = Math.min(1, Math.max(0, y) / 1.2);
        sh.material.opacity = 0.28 * (1 - air * 0.6);
        sh.scale.set(1.3 + Math.abs(tilt) * 1.2, 0.55, 1);
      };
      setPose(P.parado, P.parado, 0); place(0, 0, 0, 1);
      keeper = {
        // Posição inicial no gol (x no SVG) e pose "pronto" (vem de "parado")
        at(x) { baseX = toWorld(x, cy).X; place(baseX, 0, 0, 1); draw(); },
        ready() { play(380, u => setPose(P.parado, P.pronto, u), 'kp'); },
        // Mergulho até a luva chegar em (x, y) do SVG. dir: 1 direita, -1 esquerda, 0 fica no meio (pulo curto)
        dive(x, y, dir, ms, delay) {
          const T = toWorld(x, y);
          if (!dir) {
            const hop = Math.max(0, Math.min(1.2, T.Y - 2.0));
            return play(ms, u => { setPose(P.pronto, P.parado, Math.min(1, u * 1.5)); place(baseX, hop * Math.sin(Math.min(1, u) * Math.PI / 2), 0, 1); }, 'kp', delay);
          }
          // Modelo mergulha para a direita da tela; para a esquerda, espelha
          const mirror = dir > 0 ? 1 : -1;
          // Bola baixa: o corpo deita mais (inclina na direção do pulo)
          const low = 1 - Math.min(1, Math.max(0, T.Y / 2.6));
          const tilt = -dir * (0.3 + 0.3 * low);
          // Onde a luva fica com a pose final: desloca o corpo para ela chegar no alvo
          setPose(P.defesa, P.defesa, 1); place(0, 0, tilt, mirror);
          const gl = gloveAt(dir);
          let fx = T.X - gl.x, fy = T.Y - gl.y;
          fy = Math.max(-0.35, fy); // não afunda no gramado
          setPose(P.pronto, P.pronto, 1); place(baseX, 0, 0, 1);
          play(ms, u => {
            const e = 1 - Math.pow(1 - u, 3);
            setPose(P.pronto, P.defesa, Math.min(1, e * 1.15));
            place(baseX + (fx - baseX) * e, fy * e, tilt * e, u < 0.08 ? 1 : mirror);
          }, 'kp', delay);
        },
      };
      // O goleiro desenhado sai de cena
      ['#k-keeper', '#k-kshadow'].forEach(s => { const e = svg.querySelector(s); if (e) e.style.display = 'none'; });
      draw();
    }
    return {
      keeper,
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

window.CRAQUE_BALL = { mount, flyer, goal };
// A tela inicial pode ter sido desenhada antes deste módulo carregar
mount(document.getElementById('ball3d'));
