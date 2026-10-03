// Camada cinematográfica dos minigames: câmera (aproxima, segue e treme), partículas (grama, confete, faíscas),
// clarão e cor da cena. Só apresentação: nada aqui muda a regra nem o resultado do lance.
// Uso: const cam = CRAQUE_CINE(stage) → move o SVG da cena para dentro de uma camada que a câmera transforma.
// Coordenadas sempre as do SVG (360×320). Com "reduzir movimento" do aparelho, a câmera fica parada e sem tremor.
(function (root) {
  const W = 360, H = 320;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const inout = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const off = () => /[?&]cine=0/.test(location.search);

  root.CRAQUE_CINE = function (stage) {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cam = document.createElement('div');
    cam.className = 'k-cam';
    [...stage.children].filter(n => n.tagName.toLowerCase() === 'svg').forEach(n => cam.appendChild(n));
    stage.insertBefore(cam, stage.firstChild);
    const fx = document.createElement('canvas');
    fx.className = 'k-fx';
    stage.appendChild(fx);
    const flash = document.createElement('div');
    flash.className = 'k-flashwhite';
    stage.appendChild(flash);
    const ctx = fx.getContext('2d');
    const enabled = !off();
    stage.classList.toggle('cine', enabled);

    // Estado da câmera: centro (x, y) e zoom; o tremor soma por cima
    const st = { x: W / 2, y: H / 2, z: 1 }, tw = { from: null, to: null, t0: 0, ms: 0, fn: inout };
    let shakeA = 0, shakeT0 = 0, shakeMs = 1, follow = null, parts = [], raf = 0, alive = true;
    const scale = () => (stage.clientWidth || W) / W;

    function apply(now) {
      if (tw.to) {
        const u = Math.min(1, (now - tw.t0) / tw.ms), e = tw.fn(u);
        st.x = tw.from.x + (tw.to.x - tw.from.x) * e; st.y = tw.from.y + (tw.to.y - tw.from.y) * e; st.z = tw.from.z + (tw.to.z - tw.from.z) * e;
        if (u >= 1) tw.to = null;
      }
      if (follow) { const p = follow(); st.x += (p.x - st.x) * 0.18; st.y += (p.y - st.y) * 0.18; if (p.z) st.z += (p.z - st.z) * 0.12; }
      let sx = 0, sy = 0;
      if (shakeA && !calm) {
        const u = (now - shakeT0) / shakeMs;
        if (u >= 1) shakeA = 0;
        else { const a = shakeA * (1 - u) * (1 - u); sx = a * (Math.sin(now * 0.091) + Math.sin(now * 0.053)) / 2; sy = a * (Math.cos(now * 0.077) + Math.sin(now * 0.041)) / 2; }
      }
      const z = calm ? 1 : st.z;
      // Ponto (x, y) no centro do palco, sem deixar aparecer borda vazia
      let tx = W / 2 - st.x * z, ty = H / 2 - st.y * z;
      tx = Math.min(0, Math.max(W - W * z, tx)) + sx; ty = Math.min(0, Math.max(H - H * z, ty)) + sy;
      const k = scale();
      cam.style.transform = 'translate(' + (tx * k).toFixed(2) + 'px,' + (ty * k).toFixed(2) + 'px) scale(' + z.toFixed(4) + ')';
      st.tx = tx; st.ty = ty; st.zz = z;
    }
    // Do SVG para a tela (para as partículas acompanharem a câmera)
    const toScreen = (x, y) => [st.tx + x * st.zz, st.ty + y * st.zz];

    function particles(now, dt) {
      const k = scale(), dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(W * k * dpr), h = Math.round(H * k * dpr);
      if (fx.width !== w || fx.height !== h) { fx.width = w; fx.height = h; }
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) {
        p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const a = Math.min(1, p.life / p.fade);
        const [x, y] = p.world ? toScreen(p.x, p.y) : [p.x, p.y], s = p.world ? st.zz : 1;
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.kind === 'conf') { const f = Math.abs(Math.cos(p.rot * 1.7)); ctx.fillRect(-p.r * s, -p.r * 0.5 * f * s, p.r * 2 * s, p.r * f * s); }
        else if (p.kind === 'spark') { ctx.fillRect(-p.r * 2 * s, -0.6 * s, p.r * 4 * s, 1.2 * s); }
        else { ctx.beginPath(); ctx.ellipse(0, 0, p.r * s, p.r * 0.45 * s, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    let last = performance.now();
    (function loop(now) {
      if (!alive || !stage.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (enabled) { apply(now); if (parts.length || fx.dataset.dirty) { particles(now, dt); fx.dataset.dirty = parts.length ? '1' : ''; } }
      raf = requestAnimationFrame(loop);
    })(last);

    const R = (a, b) => a + Math.random() * (b - a);
    const api = {
      enabled,
      // Vai até (x, y) com zoom z em ms
      to(x, y, z, ms, fn) { if (!enabled) return; follow = null; tw.from = { x: st.x, y: st.y, z: st.z }; tw.to = { x, y, z }; tw.t0 = performance.now(); tw.ms = ms || 1; tw.fn = fn || inout; },
      // Começa já aproximado em (x, y, z) e abre até a cena inteira
      intro(x, y, z, ms) { if (!enabled) return; st.x = x; st.y = y; st.z = z; api.to(W / 2, H / 2, 1, ms, ease); },
      // A câmera persegue um ponto (f devolve {x, y, z?}) até a próxima chamada de to()
      follow(f) { if (enabled) { tw.to = null; follow = f; } },
      shake(a, ms) { if (!enabled) return; shakeA = Math.max(shakeA, a); shakeT0 = performance.now(); shakeMs = ms || 400; },
      flash(strong) { if (!enabled) return; flash.className = 'k-flashwhite'; void flash.offsetWidth; flash.className = 'k-flashwhite on' + (strong ? ' strong' : ''); },
      // Cor da cena: 'goal' (mais viva), 'miss' (apagada) ou '' (normal)
      grade(kind) { if (enabled) cam.dataset.grade = kind || ''; },
      // Torrões de grama saindo do pé (coordenadas do mundo)
      turf(x, y, n) {
        if (!enabled) return;
        for (let i = 0; i < (n || 14); i++) parts.push({ world: 1, kind: 'turf', x: x + R(-6, 6), y: y + R(-2, 2), vx: R(-60, 60), vy: R(-140, -40), g: 520, drag: 0.985, rot: R(0, 6), vr: R(-8, 8), r: R(1.2, 2.6), c: Math.random() < 0.5 ? '#2F8F4E' : '#5B4426', life: R(0.4, 0.8), fade: 0.25 });
      },
      // Faíscas brancas onde a bola bateu (trave, rede)
      sparks(x, y, n, color) {
        if (!enabled) return;
        for (let i = 0; i < (n || 16); i++) { const a = R(0, 6.28), v = R(60, 190); parts.push({ world: 1, kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 120, drag: 0.94, rot: a, vr: 0, r: R(1.5, 3), c: color || '#FFFFFF', life: R(0.25, 0.5), fade: 0.2 }); }
      },
      // Chuva de papel picado nas cores dadas (na tela, não no mundo)
      confetti(colors, n) {
        if (!enabled) return;
        const cs = colors && colors.length ? colors : ['#F2C230', '#FFFFFF', '#2B8A51'];
        for (let i = 0; i < (n || 120); i++) {
          const left = i % 2 === 0;
          parts.push({ kind: 'conf', x: left ? R(-10, 40) : R(320, 370), y: R(250, 330), vx: left ? R(40, 170) : R(-170, -40), vy: R(-430, -230), g: 300, drag: 0.975, rot: R(0, 6), vr: R(-12, 12), r: R(2.2, 4.2), c: cs[i % cs.length], life: R(1.6, 2.6), fade: 0.6 });
        }
        for (let i = 0; i < (n || 120) / 2; i++) parts.push({ kind: 'conf', x: R(0, W), y: R(-60, -5), vx: R(-20, 20), vy: R(20, 80), g: 60, drag: 0.99, rot: R(0, 6), vr: R(-10, 10), r: R(2, 3.6), c: cs[i % cs.length], life: R(2, 3), fade: 0.8 });
      },
      // Para tudo por ms (impacto); devolve uma Promise
      hitstop(ms) { return new Promise(r => setTimeout(r, enabled ? ms : 0)); },
      dispose() { alive = false; cancelAnimationFrame(raf); },
    };
    return api;
  };
})(window);
