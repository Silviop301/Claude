// Sons do CRAQUE, gerados na hora com Web Audio (nenhum arquivo para baixar).
// O iPhone só libera áudio depois de um toque: o contexto nasce no primeiro toque na tela.
(function (root) {
  let ctx = null, master = null, noiseBuf = null;
  let on = true;
  try { on = localStorage.getItem('craque-sound') !== 'off'; } catch (e) { /* sem armazenamento: fica ligado */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    // Ruído branco reaproveitado (torcida, chute, papel)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (root.addEventListener) root.addEventListener('pointerdown', init, { passive: true });

  // Envelope simples: sobe em a segundos, segura, desce até t+dur
  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(type, f0, f1, t, dur, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, 0.01, dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, peak, a, filter, f0, f1, q) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = filter; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.Q.value = q || 0.8;
    env(g, t, peak, a, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  const SOUNDS = {
    // Apito: dois toques curtos e um longo, com o "trinado" da bolinha
    whistle(t) {
      [[0, 0.11], [0.17, 0.11], [0.34, 0.42]].forEach(([dt, dur]) => {
        const o = tone('sine', 2750, 2750, t + dt, dur, 0.22);
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 32; lg.gain.value = 90;
        lfo.connect(lg); lg.connect(o.frequency);
        lfo.start(t + dt); lfo.stop(t + dt + dur + 0.05);
      });
    },
    // Chute: pancada grave + estalo
    kick(t) {
      tone('sine', 160, 45, t, 0.16, 0.9);
      noise(t, 0.05, 0.35, 0.003, 'highpass', 2500);
    },
    // Gol: rede + torcida explodindo
    goal(t) {
      noise(t, 0.25, 0.25, 0.01, 'highpass', 3000);
      noise(t + 0.05, 2.2, 0.55, 0.25, 'bandpass', 700, 1100, 0.6);
      noise(t + 0.05, 2.0, 0.3, 0.3, 'bandpass', 1800, 2400, 0.9);
    },
    // Erro: "uhhh" da torcida caindo
    miss(t) {
      noise(t, 1.1, 0.4, 0.15, 'bandpass', 900, 280, 1.2);
    },
    // Moeda: dois bipes
    coin(t) {
      tone('square', 988, 988, t, 0.07, 0.12);
      tone('square', 1319, 1319, t + 0.07, 0.28, 0.12);
    },
    // Subiu de nível / característica
    levelup(t) {
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, t + i * 0.07, 0.22, 0.2));
    },
    // Taça: fanfarra
    fanfare(t) {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]].forEach(([f, dt]) => tone('sawtooth', f, f, t + dt, 0.18, 0.09));
      [523, 659, 784, 1047].forEach(f => tone('triangle', f, f, t + 0.5, 1.1, 0.13));
      noise(t + 0.45, 1.6, 0.25, 0.2, 'bandpass', 800, 1000, 0.6);
    },
    // Contador da temporada: "tic" curto a cada gol/assistência
    tick(t) {
      tone('triangle', 1760, 1500, t, 0.035, 0.05);
    },
    // Jornal chegando
    paper(t) {
      noise(t, 0.35, 0.3, 0.05, 'bandpass', 1500, 4000, 0.7);
    },
  };

  root.CRAQUE_SFX = {
    play(name) {
      if (!on) return;
      try {
        init();
        if (!ctx || !SOUNDS[name]) return;
        SOUNDS[name](ctx.currentTime + 0.02);
      } catch (e) { /* som é enfeite: nunca quebra o jogo */ }
    },
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem('craque-sound', on ? 'on' : 'off'); } catch (e) { /* ok */ }
      if (on) this.play('coin');
      return on;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
