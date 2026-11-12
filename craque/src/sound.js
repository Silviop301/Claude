// Sons do CRAQUE, gerados na hora com Web Audio; a rede e a torcida do gol são gravações (assets/sons/).
// O iPhone só libera áudio depois de um toque: o contexto nasce no primeiro toque na tela.
// Para ouvir cada som fora do jogo: node tools/craque_sons.js (grava um WAV por som).
(function (root) {
  let ctx = null, comp = null, master = null, room = null, wet = null, ir = null, noiseBuf = null, pinkBuf = null, rec = {}, cheer = null;
  let on = true, ticking = false, stuck = false;
  const last = {};
  try { on = localStorage.getItem('craque-sound') !== 'off'; } catch (e) { /* sem armazenamento: fica ligado */ }

  function init() {
    if (ctx) { wake(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // Compressor no fim: sons que se somam (gol + fanfarra, pênaltis seguidos) não estouram
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(ctx.destination);
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
    ir = ctx.createBuffer(2, sr * 2.2, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < d.length; i++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.exp(-i / (sr * 0.45)); }
    }
    bus();
    // Gravações de verdade (rede 40 KB, torcida 60 KB). Enquanto não chegam, o gol usa os sons sintetizados
    if (root.fetch) [['rede', 'assets/sons/rede.mp3?v=7805c0ba'], ['torcida', 'assets/sons/torcida.mp3?v=097494f3'], ['apito', 'assets/sons/apito.mp3?v=bd827477'], ['apitoInt', 'assets/sons/apito-int.mp3?v=16bc6ed2'], ['apitoFim', 'assets/sons/apito-fim.mp3?v=f154cab2'], ['uhh', 'assets/sons/uhh.mp3?v=72ee0907'], ['vaia', 'assets/sons/vaia.mp3?v=47da5201']].filter(([k]) => !rec[k]).forEach(([k, url]) => { // contexto refeito (revive): o que já veio fica
      fetch(url).then(r => r.arrayBuffer())
        .then(b => new Promise((ok, err) => ctx.decodeAudioData(b, ok, err))).then(b => { rec[k] = b; }).catch(() => { /* fica a sintetizada */ });
    });
    if (!ticking) { ticking = true; setInterval(() => { musicTick(); ambTick(); chantTick(); }, 600); } // música e torcida de fundo seguem a tela (jogo ao vivo ou menu)
  }
  // A saída: tudo o que toca passa pelo master (e pelo eco). É refeita quando o app sai da frente (hush)
  function bus() {
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp);
    room = ctx.createConvolver();
    room.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.5;
    room.connect(wet); wet.connect(master);
  }
  // Acorda o contexto parado (página recém-aberta, iPhone voltando do segundo plano). Só funciona de verdade dentro de um toque
  function wake() {
    if (!ctx || ctx.state === 'running' || !ctx.resume) return null;
    try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { /* fica para o próximo toque */ }); return p; } catch (e) { return null; }
  }
  // Saiu do app ou trocou de aba: o que estava tocando ou agendado fica preso na saída antiga, que é desligada.
  // Sem isso o resto da torcida (e o que ficou na fila) tocava do nada na volta para o jogo
  function hush() {
    if (!ctx || !master) return;
    try { master.disconnect(); wet.disconnect(); room.disconnect(); } catch (e) { /* já estava solto */ }
    cheer = null;
    try { bus(); } catch (e) { /* contexto fechado: o próximo toque não toca nada */ }
  }
  // Voltou para o jogo e ficou mudo (Silvio, 11/11): no iPhone o contexto volta 'suspended' ou 'interrupted' do segundo plano
  // e o resume() fora de um toque não pega. Na volta tenta acordar; no toque seguinte (touchend/click: o iPhone não conta o
  // pointerdown como gesto) acorda dentro do gesto e, se o contexto seguir preso, faz um novo (música no mesmo ponto da faixa)
  function rebuild() {
    const tr = mEl && mI >= 0 ? { i: mI, ord: mOrd, at: mEl.currentTime || 0 } : null;
    try { if (mEl) { mEl.pause(); mEl.removeAttribute('src'); mEl.load(); } } catch (e) { /* solta */ }
    try { ctx.close(); } catch (e) { /* já fechado */ }
    ctx = null; master = null; cheer = null; mEl = null; mGain = null; mWant = -1; clearTimeout(mStop);
    aSrc = null; aGain = null; aWant = -1; stuck = false;
    init();
    if (!ctx) return;
    if (tr) { mOrd = tr.ord; mI = tr.i - 1; }
    musicStart();
    if (tr && mEl) { const at = tr.at; mEl.addEventListener('loadedmetadata', () => { try { mEl.currentTime = at; } catch (e) { /* começa do zero */ } }, { once: true }); }
  }
  function revive(gesture) {
    if (!(on || mOn)) return;
    if (!ctx) { if (gesture) { init(); musicStart(); } return; }
    if (gesture && (ctx.state === 'interrupted' || (stuck && ctx.state !== 'running'))) { rebuild(); return; }
    if (ctx.state !== 'running') {
      wake();
      if (gesture) setTimeout(() => { if (ctx && ctx.state !== 'running') stuck = true; }, 400);
    }
    if (gesture) { musicStart(); if (mEl && mWant > 0 && mEl.paused) mEl.play().catch(() => { mWant = -1; }); }
    musicTick(); ambTick();
  }
  if (root.document && root.document.addEventListener) {
    root.document.addEventListener('visibilitychange', () => { if (root.document.hidden) hush(); else revive(false); musicTick(); });
    if (root.addEventListener) root.addEventListener('pagehide', hush);
    if (root.addEventListener) root.addEventListener('pageshow', () => revive(false));
  }
  // Som desligado: nada é montado nem baixado (ligar nas Configurações chama play('coin'), já dentro do toque)
  if (root.addEventListener) ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => root.addEventListener(ev, () => revive(true), { passive: true, capture: true }));

  // Música de fundo dos menus (2026-11-11, Silvio: "uma musiquinha de fundo que nem FIFA", com faixas reais que ele manda).
  // Playlist em assets/musica/ (lista M_LIST; vazia = nada toca e a chave some dos Ajustes). Cada faixa toca inteira, numa
  // ordem embaralhada, e a próxima entra quando ela acaba. <audio> em streaming (não baixa tudo antes) ligado ao Web Audio,
  // porque o iPhone ignora o volume do <audio>: o volume baixo e o fade saem do ganho. Começa no primeiro toque (regra do
  // iPhone), some no jogo ao vivo (`.lv` na tela) e com o app fora da frente, e volta de onde parou. Chave própria
  // (climbix-musica), separada do Som. Faixa nova: põe o .mp3 em assets/musica/, o nome em M_LIST e roda craque_sw.py
  const M_LIST = ['uk-garage.mp3', 'lounge.mp3', 'sports-rocker.mp3', 'shut-the-funk-up.mp3', 'cheetah-print.mp3', 'atomic-bass.mp3', 'electric-desire.mp3', 'liberty-city.mp3', 'mood-swings.mp3', 'idiot.mp3', 'unite.mp3', 'drive.mp3', 'legends.mp3', 'dobronx.mp3', 'vultures.mp3', 'space-worm.mp3', 'whiskey-gasoline.mp3', 'underwxrld.mp3', 'wabi-sabi.mp3', 'winds-of-change.mp3', 'to-that-beat.mp3', 'gold-teeth-gasoline.mp3', 'showdown.mp3', 'funky-brew.mp3']; // 2 da Pixabay (monume) + 22 da Epidemic Sound que o Silvio mandou em 11/11 (licença da conta dele)
  // Nome que o disco da home mostra (faixa · artista); faixa nova sem nome aqui mostra o nome do arquivo
  const M_NAMES = { 'uk-garage.mp3': ['UK Garage', 'monume'], 'lounge.mp3': ['Lounge', 'monume'], 'sports-rocker.mp3': ['Sports Rocker', 'Taelimb'],
    'shut-the-funk-up.mp3': ['Shut the Funk Up!', 'Daniel Fridell'], 'cheetah-print.mp3': ['Cheetah Print', 'Cushy'], 'atomic-bass.mp3': ['Atomic Bass', 'Daniel Fridell'],
    'electric-desire.mp3': ['Electric Desire', 'Daniel Fridell'], 'liberty-city.mp3': ['Liberty City', 'DonVayei'], 'mood-swings.mp3': ['Mood Swings', 'Siine'], 'idiot.mp3': ['IDIOT', "I'MIN"],
    'unite.mp3': ['Unite!', 'Donell Mase'], 'drive.mp3': ['DRIVE', 'MXRPHEUS'], 'legends.mp3': ['LEGENDS', 'MXRPHEUS'], 'dobronx.mp3': ['DOBRONX', 'MXRPHEUS'],
    'vultures.mp3': ['VULTURES', 'MXRPHEUS'], 'space-worm.mp3': ['Space Worm', 'AGST'], 'whiskey-gasoline.mp3': ['Whiskey & Gasoline', 'Def Lev'],
    'underwxrld.mp3': ['UNDERWXRLD', 'MXRPHEUS'], 'wabi-sabi.mp3': ['Wabi Sabi', 'Lukas Got Lucky'], 'winds-of-change.mp3': ['Winds of Change', 'Cezar'],
    'to-that-beat.mp3': ['To That Beat', 'AEILO'], 'gold-teeth-gasoline.mp3': ['Gold Teeth & Gasoline', 'Bankston'], 'showdown.mp3': ['SHOWDOWN', 'Cushy'], 'funky-brew.mp3': ['Funky Brew', 'Duke Herrington'] };
  // Avisa a tela (disco da home) quando a faixa troca ou a música toca/para
  const mSay = () => { try { root.dispatchEvent(new Event('climbix-musica')); } catch (e) { /* sem tela */ } };
  const M_VOL = 0.35;
  let mOn = true, mWant = -1, mGain = null, mEl = null, mOrd = [], mI = -1, mStop = null;
  try { mOn = localStorage.getItem('climbix-musica') !== 'off'; } catch (e) { /* fica ligada */ }
  // Música no jogo ao vivo (Silvio, 11/11: "a opção de rodar ou não a música durante a simulação"): desligada = só a torcida
  let mLive = false;
  try { mLive = localStorage.getItem('climbix-musica-jogo') === 'on'; } catch (e) { /* fica só a torcida */ }
  const quiet = () => !!(root.document && (root.document.hidden || (!mLive && root.document.querySelector('.lv'))));
  // últimas que tocaram, guardadas entre aberturas do jogo (no máximo 8, e sempre sobra metade da lista para sortear)
  const M_REC = Math.min(8, Math.floor(M_LIST.length / 2));
  function mRec() {
    let r = [];
    try { r = JSON.parse(localStorage.getItem('climbix-musica-rec') || '[]'); } catch (e) { /* sem armazenamento */ }
    if (!Array.isArray(r)) r = [];
    if (!r.length) try { const u = localStorage.getItem('climbix-musica-ult'); if (u) r = [u]; } catch (e) { /* ok */ } // aparelho que só tinha a última
    return r.filter((x) => M_LIST.indexOf(x) >= 0).slice(-M_REC);
  }
  function mRecAdd(f) {
    const r = mRec().filter((x) => x !== f); r.push(f);
    try { localStorage.setItem('climbix-musica-rec', JSON.stringify(r.slice(-M_REC))); localStorage.setItem('climbix-musica-ult', f); } catch (e) { /* ok */ }
  }
  function musicNext() {
    if (!mEl) return;
    if (++mI >= mOrd.length) { // nova volta embaralhada, sem repetir a última logo de cara
      const last = mOrd[mOrd.length - 1];
      mOrd = M_LIST.map((x, i) => i); for (let i = mOrd.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mOrd[i], mOrd[j]] = [mOrd[j], mOrd[i]]; } // embaralha de verdade (Fisher-Yates)
      // como o Spotify: as que tocaram por último (também em aberturas anteriores) vão para o fim da volta, da mais antiga para a mais recente
      const rec = mRec();
      if (last !== undefined && rec.indexOf(M_LIST[last]) < 0) rec.push(M_LIST[last]);
      const pos = (i) => rec.indexOf(M_LIST[i]);
      mOrd = mOrd.filter((i) => pos(i) < 0).concat(mOrd.filter((i) => pos(i) >= 0).sort((a, b) => pos(a) - pos(b)));
      mI = 0;
    }
    mEl.src = 'assets/musica/' + M_LIST[mOrd[mI]];
    mRecAdd(M_LIST[mOrd[mI]]);
    mSay();
    if (mWant > 0) mEl.play().catch(() => { /* espera o próximo toque */ });
  }
  function musicTick() {
    if (!mEl || !ctx) return;
    const want = mOn && !quiet() ? M_VOL : 0, g = mGain.gain;
    if (want === mWant) { if (want && mEl.paused && ctx.state === 'running') mEl.play().catch(() => {}); return; }
    mWant = want;
    clearTimeout(mStop);
    try { g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(want, ctx.currentTime + (want ? 1.5 : 0.6)); } catch (e) { g.value = want; }
    if (want) mEl.play().catch(() => { mWant = -1; }); // parou de tocar fora de um toque: tenta de novo no próximo
    else mStop = setTimeout(() => { if (!mWant) mEl.pause(); }, 700); // pausa de verdade (não gasta bateria nem dados)
  }
  function musicStart() {
    if (!mOn || !ctx || mEl || !M_LIST.length || typeof Audio === 'undefined') return;
    try {
      mEl = new Audio(); mEl.preload = 'auto'; mEl.crossOrigin = 'anonymous';
      mEl.setAttribute('playsinline', '');
      mGain = ctx.createGain(); mGain.gain.value = 0; mGain.connect(ctx.destination);
      ctx.createMediaElementSource(mEl).connect(mGain);
      mEl.addEventListener('ended', musicNext);
      mEl.addEventListener('playing', mSay); mEl.addEventListener('pause', mSay);
      mEl.addEventListener('error', () => setTimeout(musicNext, 1000)); // faixa que não abre: pula
      musicNext();
      musicTick();
    } catch (e) { mEl = null; }
  }
  // Torcida de fundo no jogo ao vivo (2026-11-11, gravação que o Silvio mandou, Pixabay vishiv "crowd cheering in stadium";
  // ele pediu baixa, "pra não incomodar quem joga"). Só com `.lv` na tela e o Som ligado; baixada na primeira vez que um jogo
  // ao vivo abre (assets/sons/ambiente.mp3, 260 KB). O arquivo já vem com a emenda feita (fim e começo cruzados em 2,5 s) e
  // 0,3 s de sobra de cada lado: o loop vai de A_PAD a A_PAD + A_LOOP. Gol (cheer/cheerAway) levanta a torcida por ~3 s
  const A_URL = 'assets/sons/ambiente.mp3?v=ff16016b', A_PAD = 0.3, A_LOOP = 1125609 / 44100, A_VOL = 0.14, A_UP = 2.4;
  // Intervalo (Silvio, 12/11): a tela põe CRAQUE_CROWD.ht no apito do intervalo e tira na volta do 2º tempo; os cantos saem aos
  // poucos, a torcida do jogo cala e entra o estádio de antes do jogo (estadio.mp3, Epidemic Sound, loop de 90 s com a emenda
  // cruzada e E_PAD de sobra). Sem música tocando (desligada, pausada ou fora do jogo ao vivo) o estádio todo sobe MUTE_K
  const E_URL = 'assets/sons/estadio.mp3?v=bcb30973', E_PAD = 0.3, E_LOOP = 90, E_VOL = 0.55, MUTE_K = 1.35;
  let eBuf = null, eSrc = null, eGain = null, eLoad = false, eWant = -1;
  const crowdK = () => (mEl && mWant > 0 && !mEl.paused ? 1 : MUTE_K);
  let aBuf = null, aSrc = null, aGain = null, aLoad = false, aWant = -1;
  function ambTick() {
    if (!ctx) return;
    const lv = on && !!(root.document && !root.document.hidden && root.document.querySelector('.lv')), ht = lv && !!(root.CRAQUE_CROWD || {}).ht, k = crowdK();
    const want = lv && !ht ? +(A_VOL * k).toFixed(3) : 0;
    estTick(lv, ht ? +(E_VOL * k).toFixed(3) : 0);
    if (want && !aBuf) {
      if (!aLoad && root.fetch) { aLoad = true; fetch(A_URL).then(r => r.arrayBuffer()).then(b => new Promise((ok, err) => ctx.decodeAudioData(b, ok, err))).then(b => { aBuf = b; }).catch(() => { aLoad = false; }); }
      return;
    }
    if (want && !aSrc && ctx.state === 'running') {
      aGain = ctx.createGain(); aGain.gain.value = 0; aGain.connect(ctx.destination);
      aSrc = ctx.createBufferSource(); aSrc.buffer = aBuf; aSrc.loop = true;
      aSrc.loopStart = A_PAD; aSrc.loopEnd = Math.min(aBuf.duration, A_PAD + A_LOOP);
      aSrc.connect(aGain); aSrc.start(0, A_PAD + Math.random() * A_LOOP * 0.8);
    }
    if (!aGain || want === aWant) return;
    aWant = want;
    const g = aGain.gain, t = ctx.currentTime;
    // no intervalo a torcida cala devagar; na volta sobe em 3 s
    try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(want, t + (want ? (eWant > 0 || ht ? 3 : 2) : ht ? 4 : 0.5)); } catch (e) { g.value = want; }
  }
  function estTick(lv, want) { // o estádio do intervalo: baixa junto com a torcida do jogo, toca só no intervalo
    if (lv && !eBuf && !eLoad && root.fetch) { eLoad = true; fetch(E_URL).then(r => r.arrayBuffer()).then(b => new Promise((ok, err) => ctx.decodeAudioData(b, ok, err))).then(b => { eBuf = b; }).catch(() => { eLoad = false; }); }
    if (want && eBuf && !eSrc && ctx.state === 'running') {
      eGain = ctx.createGain(); eGain.gain.value = 0; eGain.connect(ctx.destination);
      eSrc = ctx.createBufferSource(); eSrc.buffer = eBuf; eSrc.loop = true;
      eSrc.loopStart = E_PAD; eSrc.loopEnd = Math.min(eBuf.duration, E_PAD + E_LOOP);
      eSrc.connect(eGain); eSrc.start(0, E_PAD + Math.random() * E_LOOP * 0.8);
    }
    if (!eGain || want === eWant) return;
    const was = eWant; eWant = want;
    const g = eGain.gain, t = ctx.currentTime, d = want ? (was > 0 ? 1 : 5) : lv ? 3 : 0.5;
    try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(want, t + d); } catch (e) { g.value = want; }
    if (!want) { const s = eSrc, gg = eGain; eSrc = null; eGain = null; try { s.stop(t + d + 0.1); } catch (e) { /* ok */ } setTimeout(() => { try { gg.disconnect(); } catch (e) { /* ok */ } }, (d + 0.3) * 1000); }
  }
  // Cantos da torcida por cima do fundo (Epidemic Sound do Silvio, 12/11): um trecho de 16 a 20 s de vez em quando, com espaço
  // entre um e outro; em casa no volume do fundo, fora bem mais baixo (é a torcida deles). A tela diz onde é o jogo em CRAQUE_CROWD
  const CH_URL = ['canto-1', 'canto-2', 'canto-3', 'canto-4', 'canto-5'].map(n => 'assets/sons/' + n + '.mp3'), CH_HOME = 0.16, CH_AWAY = 0.05;
  let chBuf = [], chLoad = false, chSrc = null, chG = null, chNext = 0, chLast = -1;
  function chantTick() {
    if (!ctx) return;
    const live = aWant > 0 && aSrc && ctx.state === 'running';
    if (!live) { if (chSrc) { const s = chSrc, g = chG; chSrc = null; try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); const f = (root.CRAQUE_CROWD || {}).ht ? 4 : 0.5; g.gain.linearRampToValueAtTime(0, ctx.currentTime + f); s.stop(ctx.currentTime + f + 0.1); } catch (e) { /* ok */ } } chNext = 0; return; }
    if (!chLoad && root.fetch) { chLoad = true; CH_URL.forEach((u, i) => fetch(u).then(r => r.arrayBuffer()).then(b => new Promise((ok, err) => ctx.decodeAudioData(b, ok, err))).then(b => { chBuf[i] = b; }).catch(() => { /* fica sem esse canto */ })); }
    const t = ctx.currentTime;
    if (!chNext) chNext = t + 8 + Math.random() * 12; // o primeiro canto sai uns segundos depois da bola rolar
    if (chSrc || t < chNext) return;
    const ok = chBuf.map((b, i) => (b && i !== chLast ? i : -1)).filter(i => i >= 0);
    if (!ok.length) { chNext = t + 5; return; }
    const i = ok[Math.floor(Math.random() * ok.length)], b = chBuf[i], cr = root.CRAQUE_CROWD || {}, v = (cr.home === false ? CH_AWAY : CH_HOME) * crowdK();
    chLast = i; chG = ctx.createGain(); chG.gain.setValueAtTime(0, t); chG.gain.linearRampToValueAtTime(v, t + 1.5);
    chG.gain.setValueAtTime(v, t + Math.max(1.6, b.duration - 2)); chG.gain.linearRampToValueAtTime(0, t + b.duration);
    chG.connect(ctx.destination);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(chG); s.start(t); chSrc = s;
    s.onended = () => { if (chSrc === s) chSrc = null; };
    chNext = t + b.duration + 25 + Math.random() * 35;
  }
  function ambUp() { // gol: a torcida sobe e volta ao normal
    if (!aGain || aWant <= 0) return;
    const g = aGain.gain, t = ctx.currentTime, v = aWant;
    try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v * A_UP, t + 0.4); g.setValueAtTime(v * A_UP, t + 1.4); g.linearRampToValueAtTime(v, t + 4); } catch (e) { /* enfeite */ }
  }

  root.CRAQUE_MUSIC = {
    get has() { return M_LIST.length > 0; },
    get on() { return mOn; },
    get state() { return !mEl ? 'parada' : mWant > 0 && !mEl.paused ? 'tocando' : 'calada'; }, // para as ferramentas
    get amb() { return aSrc && aWant > 0 ? 'tocando' : 'calada'; },
    get est() { return eSrc && eWant > 0 ? 'tocando' : 'calada'; }, // estádio do intervalo, para as ferramentas
    get crowd() { return [aWant, eWant]; }, // torcida de fundo, para as ferramentas
    get chant() { return chSrc ? CH_URL[chLast] : ''; }, // canto da torcida tocando agora, para as ferramentas
    get track() { return mEl && mI >= 0 ? M_LIST[mOrd[mI]] : ''; },
    get title() { const f = this.track; return f ? (M_NAMES[f] || [f.replace(/\.mp3$/, '').replace(/-/g, ' '), '']) : null; },
    next() { musicNext(); },
    // anterior (disco que cresce, 11/11): com mais de 3 s de faixa volta ao começo dela, senão a que tocou antes nesta volta
    prev() {
      if (!mEl) return;
      if (mEl.currentTime > 3 || mI <= 0) { try { mEl.currentTime = 0; } catch (e) { /* ok */ } mSay(); return; }
      mI -= 2; musicNext();
    },
    get live() { return mLive; },
    liveToggle() { mLive = !mLive; try { localStorage.setItem('climbix-musica-jogo', mLive ? 'on' : 'off'); } catch (e) { /* ok */ } musicTick(); return mLive; },
    toggle() {
      mOn = !mOn;
      try { localStorage.setItem('climbix-musica', mOn ? 'on' : 'off'); } catch (e) { /* ok */ }
      if (mOn) { init(); musicStart(); }
      musicTick(); mSay();
      return mOn;
    },
  };

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
  // Toca uma gravação; a torcida é uma só: um gol novo apaga a comemoração anterior em vez de somar
  function play(k, t, gain, echo) {
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = rec[k]; g.gain.value = gain;
    src.connect(g); out(g, echo);
    src.start(t);
    if (k !== 'torcida') return;
    if (cheer) { cheer.g.gain.setTargetAtTime(0.0001, t, 0.08); cheer.src.stop(t + 0.5); }
    cheer = { src, g };
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

  // Formantes (F1, F2, F3 em Hz) que dão cor de vogal à torcida: "ô" do gol, "a" da festa, "u" do lamento
  const VOWEL = { o: [520, 900, 2400], a: [750, 1200, 2500], u: [380, 800, 2300] };

  // Torcida: milhares de vozes longe não têm tom, só "ar" com cor de vogal. Cada setor do estádio é um
  // ruído rosa com seu próprio sobe e desce (a multidão nunca grita junto), seu lado no estéreo e sua
  // hora de entrar. A emoção vem do brilho: color = [[tempo, razão das formantes]] sobe no gol e cai no "uhhh".
  // (Um coro grave e sustentado foi tentado e soou como filme de terror: as vozes com tom são só os gritos agudos e curtos.)
  function crowd(t, o) {
    const dur = o.dur, g = ctx.createGain(), stops = [];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.peak, t + o.a);
    g.gain.setValueAtTime(o.peak, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // Corta só o chiado de cima: abaixo de 5 kHz ficam os gritos agudos
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5000; lp.Q.value = 0.5;
    g.connect(lp); out(lp, o.echo || 0.3);
    const sr = ctx.sampleRate, len = pinkBuf.length / sr;
    for (let i = 0; i < o.sections; i++) {
      const n = ctx.createBufferSource(), sg = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      n.buffer = pinkBuf; n.loop = true;
      // Sobe e desce do setor: passeio aleatório suave, 25 pontos por segundo
      const t0 = rnd(0, o.spread), k = Math.max(4, Math.round((dur - t0) * 25)), curve = new Float32Array(k);
      let v = 1, dv = 0;
      for (let j = 0; j < k; j++) {
        dv = dv * 0.85 + rnd(-0.06, 0.06); v = Math.min(1.35, Math.max(0.55, v + dv));
        curve[j] = v * Math.min(1, j / 4) / Math.sqrt(o.sections);
      }
      curve[k - 1] = 0;
      sg.gain.setValueAtTime(0, t);
      sg.gain.setValueCurveAtTime(curve, t + t0, dur - t0);
      const sh = rnd(0.9, 1.12);
      VOWEL[o.vowel].forEach((f, j) => {
        const bp = ctx.createBiquadFilter(), fg = ctx.createGain();
        bp.type = 'bandpass'; bp.Q.value = [1.4, 1.8, 2.2][j];
        o.color.forEach(([dt, r], m) => {
          if (m === 0) bp.frequency.setValueAtTime(f * r * sh, t); else bp.frequency.exponentialRampToValueAtTime(f * r * sh, t + dt);
        });
        fg.gain.value = [1, 0.6, 0.18][j];
        sg.connect(bp); bp.connect(fg); fg.connect(pan || g);
      });
      if (pan) { pan.pan.value = (i / Math.max(1, o.sections - 1)) * 1.6 - 0.8; pan.connect(g); }
      n.connect(sg);
      n.start(t, rnd(0, len));
      n.stop(t + dur + 0.1);
    }
    // Gritos agudos (mulheres, crianças, quem está perto): vozes curtas, cada uma numa hora, num tom e
    // com tremido largo, para soarem como gente gritando e não como coro. bend = [razão no início, no fim].
    const shout = ctx.createBiquadFilter();
    shout.type = 'bandpass'; shout.frequency.value = 1500; shout.Q.value = 0.6;
    shout.connect(g);
    for (let i = 0; i < (o.shouts || 0); i++) {
      const osc = ctx.createOscillator(), vg = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const f0 = rnd(330, 640), t0 = t + rnd(0, o.spread + o.hold * 0.5), len = Math.min(t + dur - t0, rnd(0.35, 0.9) * dur);
      const v = rnd(0.4, 1) * (o.shoutGain || 0.3) / Math.sqrt(o.shouts);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0 * o.bend[0], t0);
      osc.frequency.exponentialRampToValueAtTime(f0 * o.bend[1] * rnd(0.95, 1.05), t0 + len);
      lfo.frequency.value = rnd(5, 8); lg.gain.value = f0 * rnd(0.03, 0.06);
      lfo.connect(lg); lg.connect(osc.frequency);
      vg.gain.setValueAtTime(0.0001, t0);
      vg.gain.exponentialRampToValueAtTime(v, t0 + rnd(0.04, 0.12));
      vg.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      osc.connect(vg);
      if (pan) { pan.pan.value = rnd(-0.9, 0.9); vg.connect(pan); pan.connect(shout); } else vg.connect(shout);
      [osc, lfo].forEach(x => { x.start(t0); x.stop(t0 + len + 0.05); });
    }
  }

  // Apito sintetizado (antes da gravação): dois toques curtos e um longo; a bolinha de dentro faz o tom tremer e "rolar"
  function synthWhistle(t) {
      [[0, 0.11], [0.17, 0.11], [0.34, 0.45]].forEach(([dt, dur]) => {
        const { osc, g } = tone('sine', 3000, 2900, t + dt, dur, 0.13, { a: 0.012, echo: 0.1 });
        const lfo = ctx.createOscillator(), lg = ctx.createGain(), am = ctx.createGain();
        lfo.frequency.value = 38; lg.gain.value = 140;
        lfo.connect(lg); lg.connect(osc.frequency);
        am.gain.value = 0.04; lfo.connect(am); am.connect(g.gain);
        lfo.start(t + dt); lfo.stop(t + dt + dur + 0.05);
        noise(t + dt, dur, 0.035, 0.01, 'bandpass', 3000, 0, 2);
      });
    }
  const SOUNDS = {
    // Toque em botão. Até 2026-11-11 era um seno de 1100 Hz a 0,1 que no alto-falante do celular quase não se ouvia; depois
    // um triângulo de 1500 Hz que o Silvio achou agudo demais ("a maioria vai ser mais grave"). Agora três sons de botão:
    // tap = toque comum, grave e macio; back = voltar, fechar e cancelar, mais grave ainda; ok = ação principal (o dourado,
    // confirmar), duas notas subindo, o único mais agudo. Tap e back mudam um pouco de tom a cada toque (uiK, ±4%) para não
    // enjoar. Quem escolhe o som de cada botão do palco é o ouvinte do #ld em coachland.js (uiSnd)
    // Mais baixos e mais graves desde a música de fundo (Silvio, 11/11 à tarde: "tá muito presente na música"): cerca de
    // metade do volume e o tom uns 30% abaixo. Uma parcial baixinha uma oitava acima segura o som no alto-falante do
    // celular, que quase não toca abaixo de 400 Hz
    tap(t) {
      const k = uiK();
      tone('triangle', 500 * k, 330 * k, t, 0.06, 0.18, { a: 0.005 });
      tone('sine', 1000 * k, 660 * k, t, 0.04, 0.03, { a: 0.005 });
      noise(t, 0.016, 0.02, 0.002, 'bandpass', 1100, 0, 1.2);
    },
    back(t) {
      const k = uiK();
      tone('triangle', 390 * k, 260 * k, t, 0.08, 0.19, { a: 0.005 });
      tone('sine', 780 * k, 520 * k, t, 0.05, 0.035, { a: 0.005 });
      noise(t, 0.018, 0.015, 0.002, 'bandpass', 800, 0, 1.2);
    },
    ok(t) {
      tone('triangle', 494, 494, t, 0.06, 0.11, { a: 0.005 });
      tone('triangle', 740, 740, t + 0.055, 0.12, 0.11, { a: 0.005, echo: 0.08 });
    },
    // Deu certo (negócio fechado, diretoria aprovou, preço novo valendo): três notas curtas subindo. As telas do Treinador
    // pediam 'win' desde o mercado, mas o som não existia e nada tocava (achado em 2026-11-11)
    win(t) {
      [523, 659, 880].forEach((f, i) => tone('triangle', f, f, t + i * 0.075, i === 2 ? 0.26 : 0.1, 0.12, { a: 0.006, echo: i === 2 ? 0.2 : 0 }));
    },
    // Apito do juiz: dois toques curtos e um longo; a bolinha de dentro faz o tom tremer e "rolar"
    // Gravações do Silvio (Epidemic Sound, 12/11): um apito curto (saída e pênalti), curto + longo no intervalo e o "fim de jogo" (três apitos);
    // originais em /mnt/project-files/climbix/sons/apitos-epidemic/. Enquanto a gravação não chega, a sintetizada
    whistle(t) {
      if (rec.apito) return play('apito', t, 0.45, 0.05);
      synthWhistle(t);
    },
    whistleHalf(t) { if (rec.apitoInt) play('apitoInt', t, 0.45, 0.05); else synthWhistle(t); },
    whistleEnd(t) { if (rec.apitoFim) play('apitoFim', t, 0.45, 0.05); else synthWhistle(t); },
    // Chute: pancada grave + o "toc" do couro
    kick(t) {
      tone('sine', 150, 50, t, 0.14, 0.85);
      noise(t, 0.04, 0.3, 0.002, 'bandpass', 1300, 700, 1.2);
      noise(t, 0.02, 0.12, 0.002, 'highpass', 3500);
    },
    // Gol: a bola estufa a rede e a torcida explode, cada vez mais aberta
    goal(t) {
      if (rec.rede) play('rede', t, 0.75, 0.15); else noise(t, 0.35, 0.16, 0.01, 'bandpass', 2600, 900, 0.9);
      if (rec.torcida) play('torcida', t + 0.05, 0.45, 0.1); else crowd(t + 0.04, { vowel: 'o', dur: 2.9, a: 0.25, hold: 1.6, spread: 0.2, peak: 1, sections: 6, color: [[0, 0.9], [0.45, 1.2], [1.8, 1.2], [2.9, 0.95]], shouts: 14, shoutGain: 1.1, bend: [1, 1.15] });
    },
    // Gol seu fora de casa: a mesma rede, a sua torcida é pouca e está longe (só gravações)
    goalAway(t) {
      if (rec.rede) play('rede', t, 0.75, 0.15);
      if (rec.torcida) play('torcida', t + 0.05, 0.18, 0.2);
    },
    // Vitória no fim de um jogo simulado: só a torcida, sem a bola na rede
    cheer(t) {
      if (rec.torcida) play('torcida', t, 0.38, 0.1); else crowd(t, { vowel: 'o', dur: 2.4, a: 0.25, hold: 1.2, spread: 0.2, peak: 0.8, sections: 6, color: [[0, 0.9], [0.45, 1.2], [1.6, 1.2], [2.4, 0.95]], shouts: 12, shoutGain: 1, bend: [1, 1.12] });
    },
    // Gol fora de casa: a sua torcida é pouca e está longe (a mesma gravação, bem mais baixa)
    // Torcida da Epidemic Sound do Silvio (12/11): "uhh" no chute seu que o goleiro pega ou bate na trave, vaia de quem perde em casa
    uhh(t) { if (rec.uhh) play('uhh', t, 0.4, 0.1); },
    uhhAway(t) { if (rec.uhh) play('uhh', t, 0.12, 0.1); },
    vaia(t) { if (rec.vaia) play('vaia', t, 0.4, 0.1); },
    cheerAway(t) {
      if (rec.torcida) play('torcida', t, 0.12, 0.25); else crowd(t, { vowel: 'o', dur: 1.8, a: 0.2, hold: 0.8, spread: 0.2, peak: 0.3, sections: 3, color: [[0, 0.9], [0.4, 1.1], [1.8, 0.95]], shouts: 5, shoutGain: 0.6, bend: [1, 1.08] });
    },
    // Erro: "uhhh" da torcida caindo (o som original, que o Silvio prefere)
    miss(t) {
      noise(t, 1.1, 0.22, 0.15, 'bandpass', 900, 280, 1.2);
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
      if (rec.torcida) play('torcida', t + 0.35, 0.21, 0.1); else crowd(t + 0.4, { vowel: 'a', dur: 2.2, a: 0.3, hold: 1.2, spread: 0.3, peak: 0.6, sections: 5, color: [[0, 0.95], [0.5, 1.1], [2.2, 0.95]], shouts: 10, shoutGain: 0.8, bend: [1, 1.1] });
    },
    // Contador da temporada: "tic" curto a cada gol/assistência
    tick(t) {
      tone('triangle', 1760, 1500, t, 0.035, 0.05);
    },
    // Viagem (avião ou ônibus passando): sopro que sobe e desce
    whoosh(t) {
      noise(t, 0.9, 0.22, 0.25, 'bandpass', 400, 1600, 1.2);
    },
    // Jornal chegando
    paper(t) {
      noise(t, 0.35, 0.3, 0.05, 'bandpass', 1500, 4000, 0.7);
    },
  };
  // Intervalo mínimo entre dois iguais: vários "tic" no mesmo instante viravam um estalo alto
  const GAP = { tick: 0.03, ui: 0.04 };
  // Os três sons de botão contam como um só: o ouvinte do palco toca primeiro (voltar, ok ou toque) e o sfx('tap') que a
  // tela ainda chama no mesmo toque é ignorado
  const UI = { tap: 1, back: 1, ok: 1 };
  let uiLast = 1;
  const uiK = () => { let k; do { k = 0.96 + Math.random() * 0.08; } while (Math.abs(k - uiLast) < 0.012); uiLast = k; return k; };

  // Som pedido com o contexto parado só vale se o contexto acordar em até 0,3 s (o primeiro toque da página)
  const LATE = 300;
  function fire(name) {
    const now = ctx.currentTime;
    const key = UI[name] ? 'ui' : name;
    if (last[key] != null && now - last[key] < (GAP[key] || 0.08)) return;
    last[key] = now;
    SOUNDS[name](now + 0.02);
  }

  root.CRAQUE_SFX = {
    play(name) {
      if (!on) return;
      try {
        if (root.document && root.document.hidden) return; // app fora da frente: nada toca nem fica guardado
        init();
        if (!ctx || !SOUNDS[name]) return;
        if (name === 'cheer' || name === 'cheerAway' || name === 'goal' || name === 'goalAway') ambUp();
        if (ctx.state === 'running') return fire(name);
        // Contexto parado: o relógio dele não anda, então o som agendado agora ficaria na fila e tocaria junto com os
        // outros no próximo toque (o "som bizarro" da volta para o jogo). Só toca se acordar na hora; senão é esquecido
        const t0 = Date.now(), p = wake();
        if (p && p.then) p.then(() => { if (ctx.state === 'running' && Date.now() - t0 < LATE) try { fire(name); } catch (e) { /* enfeite */ } }, () => { /* segue calado */ });
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
