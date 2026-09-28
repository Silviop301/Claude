// Sons sintetizados com Web Audio. Nenhum arquivo de áudio é necessário.
(function () {
  const A = PS.audio = { ctx: null, master: null, on: true, noiseBuf: null, lastBlip: 0 };
  const PENTA = [0, 2, 4, 7, 9];

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.35;
      A.master.connect(A.ctx.destination);
      const len = A.ctx.sampleRate * 0.5;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      A.ctx = null;
    }
  };

  const ok = () => A.ctx && A.on && A.ctx.state === 'running';

  A.tone = function (f, dur, o = {}) {
    if (!ok()) return;
    const c = A.ctx, t = c.currentTime + (o.at || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f * o.slide), t + dur);
    const vol = o.vol || 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(A.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  };

  A.noise = function (dur, o = {}) {
    if (!ok()) return;
    const c = A.ctx, t = c.currentTime + (o.at || 0);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = A.noiseBuf;
    f.type = 'bandpass';
    f.frequency.value = o.freq || 5000;
    f.Q.value = 1.2;
    g.gain.setValueAtTime(o.vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(A.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  const note = semi => 392 * Math.pow(2, semi / 12); // base: sol (G4)

  // Toque: sobe pela escala pentatônica conforme o combo cresce.
  A.tap = function (combo) {
    const k = Math.min(combo - 1, 14);
    const f = note(PENTA[k % 5] + 12 * Math.floor(k / 5));
    A.tone(f, 0.09, { type: 'triangle', vol: 0.2 });
    A.tone(f * 2, 0.05, { type: 'square', vol: 0.025 });
  };

  A.crit = function () {
    [0, 4, 7, 12].forEach((s, i) => A.tone(note(s + 12), 0.12, { type: 'square', vol: 0.09, at: i * 0.05 }));
    A.noise(0.25, { freq: 8000, vol: 0.06, at: 0.1 });
  };

  A.superCrit = function () {
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => A.tone(note(s + 12), 0.16, { type: 'square', vol: 0.09, at: i * 0.055 }));
    A.tone(note(24), 0.6, { type: 'triangle', vol: 0.18, at: 0.4 });
    A.noise(0.5, { freq: 9000, vol: 0.08, at: 0.35 });
  };

  // Caixa registradora: "cha-ching"
  A.buy = function () {
    A.noise(0.05, { freq: 6000, vol: 0.12 });
    A.tone(1568, 0.07, { type: 'square', vol: 0.06, at: 0.02 });
    A.tone(2093, 0.28, { type: 'triangle', vol: 0.16, at: 0.07 });
  };

  A.error = function () {
    A.tone(200, 0.14, { type: 'square', vol: 0.08, slide: 0.7 });
  };

  A.click = function () {
    A.tone(900, 0.03, { type: 'triangle', vol: 0.08 });
  };

  A.blip = function () {
    const now = performance.now();
    if (now - A.lastBlip < 70) return;
    A.lastBlip = now;
    A.tone(PS.rand(1700, 2100), 0.03, { type: 'triangle', vol: 0.035 });
  };

  A.milestone = function () {
    [0, 4, 7].forEach((s, i) => A.tone(note(s + 12), 0.14, { type: 'square', vol: 0.1, at: i * 0.09 }));
    [0, 4, 7, 12].forEach(s => A.tone(note(s + 12), 0.55, { type: 'triangle', vol: 0.08, at: 0.3 }));
    A.noise(0.4, { freq: 9000, vol: 0.05, at: 0.3 });
  };

  A.promote = function () {
    const seq = [0, 0, 4, 7, 4, 7, 12];
    seq.forEach((s, i) => A.tone(note(s + 7), 0.13, { type: 'square', vol: 0.09, at: i * 0.1 }));
    [0, 4, 7, 12, 19].forEach(s => A.tone(note(s + 7), 0.9, { type: 'triangle', vol: 0.07, at: 0.75 }));
    A.noise(0.7, { freq: 9000, vol: 0.06, at: 0.75 });
  };

  A.unlock = function () {
    A.tone(880, 0.1, { type: 'triangle', vol: 0.14 });
    A.tone(1319, 0.2, { type: 'triangle', vol: 0.14, at: 0.08 });
  };

  // Arrulho do pombo: "pruuu"
  A.coo = function () {
    A.tone(420, 0.22, { type: 'sine', vol: 0.22, slide: 0.72, attack: 0.03 });
    A.tone(360, 0.3, { type: 'sine', vol: 0.18, slide: 0.65, attack: 0.03, at: 0.24 });
  };

  A.coins = function () {
    for (let i = 0; i < 8; i++) A.tone(PS.rand(1500, 2600), 0.05, { type: 'triangle', vol: 0.06, at: i * 0.06 });
  };
})();
