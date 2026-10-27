// Sons do CRAQUE, gerados na hora com Web Audio (nenhum arquivo para baixar).
// O iPhone só libera áudio depois de um toque: o contexto nasce no primeiro toque na tela.
// Para ouvir cada som fora do jogo: node tools/craque_sons.js (grava um WAV por som).
(function (root) {
  let ctx = null, master = null, room = null, noiseBuf = null, pinkBuf = null;
  let on = true;
  const last = {};
  try { on = localStorage.getItem('craque-sound') !== 'off'; } catch (e) { /* sem armazenamento: fica ligado */ }

  function init() {
    if (ctx) { if (ctx.state !== 'running' && ctx.resume) ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // Compressor no fim: sons que se somam (gol + fanfarra, pênaltis seguidos) não estouram
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp);
    const sr = ctx.sampleRate;
    // Ruído branco (estalos, papel) e rosa (torcida: o branco puro soa como chiado de TV)
    noiseBuf = ctx.createBuffer(1, sr * 2, sr);
    pinkBuf = ctx.createBuffer(1, sr * 3, sr);
    const w = noiseBuf.getChannelData(0), p = pinkBuf.getChannelData(0);
    for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
    let b0 = 0, b1 = 0, b2 = 0, mx = 0;
    for (let i = 0; i < p.length; i++) {
      const x = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + x * 0.099046; b1 = 0.963 * b1 + x * 0.2965164; b2 = 0.57 * b2 + x * 1.0526913;
      p[i] = b0 + b1 + b2 + x * 0.1848; mx = Math.max(mx, Math.abs(p[i]));
    }
    for (let i = 0; i < p.length; i++) p[i] /= mx;
    // Eco de estádio: resposta ao impulso feita de ruído que decai, um pouco abafado
    const ir = ctx.createBuffer(2, sr * 2.2, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < d.length; i++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.exp(-i / (sr * 0.45)); }
    }
    room = ctx.createConvolver();
    room.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    room.connect(wet); wet.connect(master);
  }
  if (root.addEventListener) root.addEventListener('pointerdown', init, { passive: true });

  const rnd = (a, b) => a + Math.random() * (b - a);
  // Envelope simples: sobe em a segundos, segura, desce até t+dur
  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  // Manda o som para a saída e, se pedido, uma parte para o eco
  function out(node, echo) {
    node.connect(master);
    if (echo) { const s = ctx.createGain(); s.gain.value = echo; node.connect(s); s.connect(room); }
  }
  function tone(type, f0, f1, t, dur, peak, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, o.a || 0.01, dur);
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.7;
      osc.connect(f); f.connect(g);
    } else osc.connect(g);
    out(g, o.echo);
    osc.start(t); osc.stop(t + dur + 0.05);
    return { osc, g };
  }
  function noise(t, dur, peak, a, filter, f0, f1, q, echo) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = filter; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.Q.value = q || 0.8;
    env(g, t, peak, a, dur);
    src.connect(f); f.connect(g); out(g, echo);
    src.start(t); src.stop(t + dur + 0.05);
  }

  // Formantes (F1, F2, F3 em Hz) da vogal que a torcida canta: "ô" do gol, "a" da festa, "u" do lamento
  const VOWEL = { o: [500, 880, 2450], a: [750, 1200, 2550], u: [340, 780, 2300] };

  // Torcida: um coro de vozes (cada uma com seu tom, vibrato, lado e hora de entrar) mais o "ar" de milhares
  // de pessoas longe, tudo pelas formantes de uma vogal e pelo eco do estádio. pitch = [[tempo, razão do tom]].
  function crowd(t, o) {
    const dur = o.dur, bus = ctx.createGain(), mix = ctx.createGain(), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.peak, t + o.a);
    g.gain.setValueAtTime(o.peak, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // Vozes abafadas antes das formantes: sem isso o coro soa como robô
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass'; soft.frequency.value = 2200; soft.Q.value = 0.5;
    soft.connect(bus);
    VOWEL[o.vowel].forEach((f, i) => {
      const bp = ctx.createBiquadFilter(), fg = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = [3, 4, 5][i];
      fg.gain.value = [1, 0.7, 0.3][i];
      bus.connect(bp); bp.connect(fg); fg.connect(mix);
    });
    // Um pouco do som sem vogal, para não ficar "cantado" demais
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass'; body.frequency.value = 900;
    bus.connect(body); body.connect(mix);
    mix.connect(g);
    out(g, 0.9);
    const stops = [];
    for (let i = 0; i < o.voices; i++) {
      const osc = ctx.createOscillator(), vg = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const f0 = (i % 3 ? rnd(105, 165) : rnd(190, 290));
      osc.type = 'sawtooth';
      o.pitch.forEach(([dt, r], k) => {
        const f = f0 * r * rnd(0.98, 1.02);
        if (k === 0) osc.frequency.setValueAtTime(f, t); else osc.frequency.exponentialRampToValueAtTime(f, t + dt);
      });
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = rnd(4.5, 7); lg.gain.value = f0 * rnd(0.01, 0.025);
      lfo.connect(lg); lg.connect(osc.frequency);
      const t0 = t + rnd(0, o.spread), v = rnd(0.5, 1) / Math.sqrt(o.voices);
      vg.gain.setValueAtTime(0.0001, t);
      vg.gain.setValueAtTime(0.0001, t0);
      vg.gain.exponentialRampToValueAtTime(v, t0 + o.a);
      vg.gain.setValueAtTime(v, t0 + o.hold * rnd(0.7, 1));
      vg.gain.exponentialRampToValueAtTime(0.0001, t + dur * rnd(0.8, 1));
      osc.connect(vg);
      if (pan) { pan.pan.value = rnd(-0.85, 0.85); vg.connect(pan); pan.connect(soft); } else vg.connect(soft);
      stops.push(osc, lfo);
    }
    // O "ar": ruído rosa que acompanha as vozes, com respiração lenta de multidão
    const n = ctx.createBufferSource(), ng = ctx.createGain(), wob = ctx.createOscillator(), wg = ctx.createGain();
    n.buffer = pinkBuf; n.loop = true;
    ng.gain.value = o.air;
    wob.frequency.value = rnd(2.5, 4); wg.gain.value = o.air * 0.3;
    wob.connect(wg); wg.connect(ng.gain);
    n.connect(ng); ng.connect(bus);
    stops.push(n, wob);
    stops.forEach(s => { s.start(t); s.stop(t + dur + 0.1); });
  }

  const SOUNDS = {
    // Toque em botão de escolha: clique curto e macio
    tap(t) {
      tone('sine', 1100, 700, t, 0.045, 0.1);
    },
    // Apito do juiz: dois toques curtos e um longo; a bolinha de dentro faz o tom tremer e "rolar"
    whistle(t) {
      [[0, 0.11], [0.17, 0.11], [0.34, 0.45]].forEach(([dt, dur]) => {
        const { osc, g } = tone('sine', 3000, 2900, t + dt, dur, 0.13, { a: 0.012, echo: 0.1 });
        const lfo = ctx.createOscillator(), lg = ctx.createGain(), am = ctx.createGain();
        lfo.frequency.value = 38; lg.gain.value = 140;
        lfo.connect(lg); lg.connect(osc.frequency);
        am.gain.value = 0.04; lfo.connect(am); am.connect(g.gain);
        lfo.start(t + dt); lfo.stop(t + dt + dur + 0.05);
        noise(t + dt, dur, 0.035, 0.01, 'bandpass', 3000, 0, 2);
      });
    },
    // Chute: pancada grave + o "toc" do couro
    kick(t) {
      tone('sine', 150, 50, t, 0.14, 0.85);
      noise(t, 0.04, 0.3, 0.002, 'bandpass', 1300, 700, 1.2);
      noise(t, 0.02, 0.12, 0.002, 'highpass', 3500);
    },
    // Gol: a rede balança e a torcida explode num "GOOOL" que sobe de tom
    goal(t) {
      noise(t, 0.35, 0.16, 0.01, 'bandpass', 2600, 900, 0.9);
      crowd(t + 0.04, { vowel: 'o', dur: 2.9, a: 0.22, hold: 1.7, spread: 0.25, peak: 0.35, voices: 16, air: 0.6, pitch: [[0, 1], [0.4, 1.22], [1.8, 1.25], [2.9, 1.05]] });
    },
    // Erro: o "uhhh" da torcida, que começa alto e cai de tom
    miss(t) {
      crowd(t, { vowel: 'u', dur: 1.5, a: 0.1, hold: 0.45, spread: 0.12, peak: 0.28, voices: 14, air: 0.45, pitch: [[0, 1.2], [0.35, 1.15], [1.5, 0.72]] });
    },
    // Moeda: dois bipes de sino
    coin(t) {
      tone('triangle', 988, 988, t, 0.08, 0.16);
      tone('triangle', 1319, 1319, t + 0.07, 0.32, 0.16, { echo: 0.2 });
      tone('sine', 2638, 2638, t + 0.07, 0.18, 0.04);
    },
    // Subiu de nível / característica
    levelup(t) {
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, t + i * 0.07, 0.22, 0.2, { echo: 0.2 }));
    },
    // Taça: fanfarra de metais e a torcida em festa
    fanfare(t) {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]].forEach(([f, dt]) => tone('sawtooth', f, f, t + dt, 0.2, 0.13, { a: 0.02, lp: 2400, echo: 0.3 }));
      [523, 659, 784, 1047].forEach(f => tone('sawtooth', f, f, t + 0.5, 1.2, 0.07, { a: 0.03, lp: 1800, echo: 0.4 }));
      crowd(t + 0.4, { vowel: 'a', dur: 2.2, a: 0.3, hold: 1.2, spread: 0.3, peak: 0.28, voices: 12, air: 0.6, pitch: [[0, 1.1], [0.5, 1.2], [2.2, 1.05]] });
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
  // Intervalo mínimo entre dois iguais: vários "tic" no mesmo instante viravam um estalo alto
  const GAP = { tick: 0.03, tap: 0.04 };

  root.CRAQUE_SFX = {
    play(name) {
      if (!on) return;
      try {
        init();
        if (!ctx || !SOUNDS[name]) return;
        const now = ctx.currentTime;
        if (last[name] != null && now - last[name] < (GAP[name] || 0.08)) return;
        last[name] = now;
        SOUNDS[name](now + 0.02);
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
