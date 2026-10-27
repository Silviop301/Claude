// Grava cada som do jogo (craque/src/sound.js) em WAV, para ouvir e comparar sem abrir o jogo.
// Uso: NODE_PATH=$(npm root -g) node tools/craque_sons.js [pasta-saida] [sound.js]
// Saída padrão: /tmp/climbix-sons/<nome>.wav (um arquivo por som) e um resumo de volume por som.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/tmp/climbix-sons';
const SRC = fs.readFileSync(process.argv[3] || path.join(__dirname, '../craque/src/sound.js'), 'utf8');
const NAMES = ['tap', 'tick', 'coin', 'kick', 'whistle', 'goal', 'miss', 'levelup', 'fanfare', 'paper'];
const SR = 44100, LEN = 4.5;

function wav(chans) {
  const n = chans[0].length, nc = chans.length, b = Buffer.alloc(44 + n * nc * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * nc * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(nc, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * nc * 2, 28); b.writeUInt16LE(nc * 2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) b.writeInt16LE(Math.max(-1, Math.min(1, chans[c][i])) * 32767 | 0, 44 + (i * nc + c) * 2);
  return b;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const name of NAMES) {
    await page.setContent('<html></html>');
    const chans = await page.evaluate(async ([src, name, SR, LEN]) => {
      // O jogo cria o contexto com new AudioContext(): aqui ele vira um contexto offline
      let off = null;
      window.AudioContext = function () { off = new OfflineAudioContext(2, SR * LEN, SR); return off; };
      try { localStorage.removeItem('craque-sound'); } catch (e) { /* ok */ }
      (0, eval)(src);
      window.CRAQUE_SFX.play(name);
      if (!off) return null;
      const buf = await off.startRendering();
      return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0))];
    }, [SRC, name, SR, LEN]);
    if (!chans) { console.log(name.padEnd(8), 'sem som'); continue; }
    // Corta o silêncio do fim
    let end = chans[0].length;
    while (end > SR * 0.1 && Math.abs(chans[0][end - 1]) < 1e-4 && Math.abs(chans[1][end - 1]) < 1e-4) end--;
    const cut = chans.map(c => c.slice(0, Math.min(chans[0].length, end + SR * 0.05)));
    let peak = 0, sum = 0;
    cut[0].forEach((v, i) => { const m = (Math.abs(v) + Math.abs(cut[1][i])) / 2; peak = Math.max(peak, m); sum += v * v; });
    const rms = Math.sqrt(sum / cut[0].length);
    fs.writeFileSync(path.join(OUT, name + '.wav'), wav(cut));
    const silent = peak < 1e-4;
    console.log(name.padEnd(8), silent ? 'SILÊNCIO' : `pico ${peak.toFixed(2)}  rms ${(20 * Math.log10(rms)).toFixed(1)} dB  ${(cut[0].length / SR).toFixed(2)} s`);
  }
  await browser.close();
  console.log('WAVs em', OUT);
})();
